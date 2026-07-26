import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { verifyPassword } from '../../lib/password';
import { verifyRefreshToken } from '../../lib/jwt';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { assertTotp, issueTokens, publicUser } from './helpers';
import { loginSchema } from './schemas';

export const sessionRouter = Router();

sessionRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findFirst({
      where: body.email ? { email: body.email.toLowerCase() } : { phone: body.phone },
    });
    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');

    const totp = await assertTotp(user.twoFactorSecret, body.totp);
    if (totp.requires2fa) {
      res.json({ requires2fa: true, message: 'Enter authenticator code' });
      return;
    }
    if ('invalid' in totp && totp.invalid) {
      throw new AppError(401, 'Invalid 2FA code', 'INVALID_2FA');
    }

    const tokens = await issueTokens(user);
    res.json({ user: publicUser(user), ...tokens });
  } catch (err) {
    next(err);
  }
});

sessionRouter.post('/refresh', async (req, res, next) => {
  try {
    const token =
      (req.body?.refreshToken as string | undefined) ||
      (req as typeof req & { cookies?: Record<string, string> }).cookies?.refreshToken;
    if (!token) throw new AppError(400, 'Refresh token required', 'REFRESH_REQUIRED');

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError(401, 'Invalid refresh token', 'INVALID_REFRESH');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date() || stored.userId !== payload.sub) {
      throw new AppError(401, 'Invalid refresh token', 'INVALID_REFRESH');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new AppError(401, 'User inactive', 'UNAUTHORIZED');

    await prisma.refreshToken.delete({ where: { token } });
    const tokens = await issueTokens(user);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

sessionRouter.post('/logout', async (req, res, next) => {
  try {
    const token =
      (req.body?.refreshToken as string | undefined) ||
      (req as typeof req & { cookies?: Record<string, string> }).cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

sessionRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    res.json({
      user: {
        ...publicUser(user),
        twoFactorEnabled: Boolean(user.twoFactorSecret),
      },
    });
  } catch (err) {
    next(err);
  }
});

const profilePatchSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().min(7).max(20).optional(),
});

sessionRouter.patch('/me', authenticate, validate(profilePatchSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof profilePatchSchema>;
    if (body.phone) {
      const taken = await prisma.user.findFirst({
        where: { phone: body.phone, NOT: { id: req.user!.sub } },
      });
      if (taken) throw new AppError(409, 'Phone already registered', 'PHONE_TAKEN');
    }
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: {
        ...(body.firstName ? { firstName: body.firstName } : {}),
        ...(body.lastName ? { lastName: body.lastName } : {}),
        ...(body.phone
          ? { phone: body.phone, phoneVerified: false }
          : {}),
      },
    });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
