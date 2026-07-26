import { randomBytes } from 'crypto';
import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { sendTransactionalMessage } from '../../services/messaging.service';
import { issueTokens, otpStore, publicUser, uniqueUsername } from './helpers';
import { otpRequestSchema, otpVerifySchema } from './schemas';

export const otpRouter = Router();

otpRouter.post('/request', validate(otpRequestSchema), async (req, res, next) => {
  try {
    const phone = (req.body as { phone: string }).phone;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(phone, { code, expires: Date.now() + 10 * 60 * 1000 });
    const delivery = await sendTransactionalMessage({
      channel: 'SMS',
      to: phone,
      title: 'Login OTP',
      body: `Your Fresh Harvest verification code is ${code}. Valid for 10 minutes.`,
      kind: 'otp',
    });
    res.json({
      ok: true,
      message:
        delivery.mode === 'webhook'
          ? 'OTP sent'
          : 'OTP sent (dev: see API console / configure SMS webhook)',
      deliveryMode: delivery.mode,
      devCode: process.env.NODE_ENV === 'production' ? undefined : code,
    });
  } catch (err) {
    next(err);
  }
});

otpRouter.post('/verify', validate(otpVerifySchema), async (req, res, next) => {
  try {
    const { phone, code } = req.body as { phone: string; code: string };
    const entry = otpStore.get(phone);
    if (!entry || entry.expires < Date.now() || entry.code !== code) {
      throw new AppError(400, 'Invalid or expired OTP', 'INVALID_OTP');
    }
    otpStore.delete(phone);

    let user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: await uniqueUsername(phone.replace(/\D/g, '').slice(-10)),
          phone,
          phoneVerified: true,
          firstName: 'Guest',
          lastName: 'Customer',
          role: UserRole.CUSTOMER,
          passwordHash: await hashPassword(`${randomBytes(24).toString('hex')}A!`),
          wallet: { create: {} },
          loyaltyAccount: { create: {} },
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      });
    }

    const tokens = await issueTokens(user);
    res.json({ verified: true, user: publicUser(user), ...tokens });
  } catch (err) {
    next(err);
  }
});
