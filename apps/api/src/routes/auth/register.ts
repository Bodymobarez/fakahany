import { Router } from 'express';
import type { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { issueTokens, publicUser, uniqueUsername } from './helpers';
import { registerSchema } from './schemas';

export const registerRouter = Router();

registerRouter.post('/', validate(registerSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof registerSchema>;
    const requestedUsername = body.username?.trim().toLowerCase() || null;
    if (requestedUsername) {
      const usernameTaken = await prisma.user.findUnique({ where: { username: requestedUsername } });
      if (usernameTaken) throw new AppError(409, 'Username already taken', 'USERNAME_TAKEN');
    }
    const username =
      requestedUsername ||
      (await uniqueUsername(
        body.email?.split('@')[0] || body.phone?.replace(/\D/g, '').slice(-10) || body.firstName,
      ));

    if (body.email) {
      const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
      if (exists) throw new AppError(409, 'Email already registered', 'EMAIL_TAKEN');
    }
    if (body.phone) {
      const exists = await prisma.user.findUnique({ where: { phone: body.phone } });
      if (exists) throw new AppError(409, 'Phone already registered', 'PHONE_TAKEN');
    }

    const user = await prisma.user.create({
      data: {
        username,
        email: body.email?.toLowerCase(),
        phone: body.phone,
        passwordHash: await hashPassword(body.password),
        firstName: body.firstName,
        lastName: body.lastName,
        role: UserRole.CUSTOMER,
        wallet: { create: {} },
        loyaltyAccount: { create: {} },
      },
    });

    if (body.address) {
      const a = body.address;
      const line1 = [a.street, a.building].filter(Boolean).join(', ');
      const line2 = [a.floor && `Floor ${a.floor}`, a.apartment && `Apt ${a.apartment}`]
        .filter(Boolean)
        .join(', ');
      await prisma.address.create({
        data: {
          userId: user.id,
          label: a.label || 'Home',
          line1: line1 || a.area,
          line2: line2 || null,
          area: a.area,
          street: a.street,
          building: a.building,
          floor: a.floor ?? null,
          apartment: a.apartment ?? null,
          city: a.area,
          emirate: a.emirate,
          country: 'UAE',
          lat: a.lat ?? null,
          lng: a.lng ?? null,
          isDefault: true,
        },
      });
    }

    const tokens = await issueTokens(user);
    res.status(201).json({ user: publicUser(user), ...tokens });
  } catch (err) {
    next(err);
  }
});
