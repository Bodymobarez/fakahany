import { createHash, randomBytes } from 'crypto';
import { Router } from 'express';
import type { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { assertTotp, issueTokens, publicUser, uniqueUsername } from './helpers';
import { oauthSchema } from './schemas';

export const oauthRouter = Router();

/**
 * Social login stub — identities stay in the @oauth.freshharvest.ae namespace.
 * Client-supplied emails are never trusted (prevents account takeover).
 */
oauthRouter.post('/', validate(oauthSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof oauthSchema>;
    const allowStub = process.env.NODE_ENV !== 'production' || process.env.OAUTH_STUB === '1';
    if (!body.idToken && !allowStub) {
      throw new AppError(501, 'OAuth provider not configured', 'OAUTH_NOT_CONFIGURED');
    }
    if (!body.idToken && !body.deviceId) {
      throw new AppError(400, 'deviceId required for stub OAuth', 'DEVICE_REQUIRED');
    }

    const identitySource = body.idToken
      ? `${body.provider}:token:${body.idToken}`
      : `${body.provider}:device:${body.deviceId}`;
    const identityHash = createHash('sha256').update(identitySource).digest('hex').slice(0, 16);
    const email = `${body.provider}.${identityHash}@oauth.freshharvest.ae`;
    const firstName = body.firstName || body.provider[0]!.toUpperCase() + body.provider.slice(1);
    const lastName = body.lastName || 'User';

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: await uniqueUsername(`${body.provider}_${identityHash}`),
          email,
          emailVerified: true,
          passwordHash: await hashPassword(`${randomBytes(24).toString('hex')}A!`),
          firstName,
          lastName,
          role: UserRole.CUSTOMER,
          wallet: { create: {} },
          loyaltyAccount: { create: {} },
        },
      });
    }

    if (!user.isActive) throw new AppError(403, 'Account disabled', 'DISABLED');

    const totp = await assertTotp(user.twoFactorSecret, body.totp);
    if (totp.requires2fa) {
      res.json({ requires2fa: true, message: 'Enter authenticator code', provider: body.provider });
      return;
    }
    if ('invalid' in totp && totp.invalid) {
      throw new AppError(401, 'Invalid 2FA code', 'INVALID_2FA');
    }

    const tokens = await issueTokens(user);
    res.json({
      user: publicUser(user),
      ...tokens,
      stub: !body.idToken,
      provider: body.provider,
    });
  } catch (err) {
    next(err);
  }
});
