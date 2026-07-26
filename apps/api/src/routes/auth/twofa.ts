import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { totpTokenSchema } from './schemas';

export const twoFaRouter = Router();

twoFaRouter.post('/setup', authenticate, async (req, res, next) => {
  try {
    const { generateTotpSecret, totpUri } = await import('../../lib/totp');
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    });
    const account = user.email || user.phone || user.id;
    res.json({ secret, otpauthUrl: totpUri(secret, account) });
  } catch (err) {
    next(err);
  }
});

twoFaRouter.post('/verify', authenticate, validate(totpTokenSchema), async (req, res, next) => {
  try {
    const { verifyTotp } = await import('../../lib/totp');
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user?.twoFactorSecret) throw new AppError(400, '2FA not set up', '2FA_NOT_SETUP');
    const ok = verifyTotp(user.twoFactorSecret, (req.body as { token: string }).token);
    if (!ok) throw new AppError(400, 'Invalid 2FA token', 'INVALID_2FA');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

twoFaRouter.post('/disable', authenticate, async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { twoFactorSecret: null },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
