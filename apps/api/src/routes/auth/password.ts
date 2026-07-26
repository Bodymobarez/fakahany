import { randomBytes } from 'crypto';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { sendTransactionalMessage } from '../../services/messaging.service';
import { resetStore } from './helpers';
import { passwordForgotSchema, passwordResetSchema } from './schemas';

export const passwordRouter = Router();

passwordRouter.post('/forgot', validate(passwordForgotSchema), async (req, res, next) => {
  try {
    const email = (req.body as { email: string }).email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.json({ ok: true, message: 'If the account exists, a reset link was issued.' });
      return;
    }
    const token = randomBytes(24).toString('hex');
    resetStore.set(email, { token, expires: Date.now() + 30 * 60 * 1000 });
    const webBase = process.env.WEB_URL || 'http://localhost:3000';
    const resetUrl = `${webBase}/en/auth/forgot?email=${encodeURIComponent(email)}&token=${token}`;
    await sendTransactionalMessage({
      channel: 'EMAIL',
      to: email,
      title: 'Reset your Fresh Harvest password',
      body: `Use this link to reset your password (valid 30 minutes):\n${resetUrl}\n\nOr enter token: ${token}`,
      userId: user.id,
      kind: 'password_reset',
    });
    res.json({
      ok: true,
      message: 'If the account exists, a reset link was issued.',
      devToken: process.env.NODE_ENV === 'production' ? undefined : token,
    });
  } catch (err) {
    next(err);
  }
});

passwordRouter.post('/reset', validate(passwordResetSchema), async (req, res, next) => {
  try {
    const body = req.body as { email: string; token: string; password: string };
    const email = body.email.toLowerCase();
    const entry = resetStore.get(email);
    if (!entry || entry.expires < Date.now() || entry.token !== body.token) {
      throw new AppError(400, 'Invalid or expired reset token', 'INVALID_RESET');
    }
    resetStore.delete(email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.password) },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
