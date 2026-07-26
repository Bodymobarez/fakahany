import { Router } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { requireRoles } from '../../middleware/auth';
import { hashPassword } from '../../lib/password';
import { AppError } from '../../middleware/error';

export const peopleAdminRouter = Router();

peopleAdminRouter.use(requireRoles('ADMIN'));

peopleAdminRouter.get('/', async (_req, res, next) => {
  try {
    const people = await prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.STAFF, UserRole.DRIVER] } },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        driver: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ people });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum([UserRole.ADMIN, UserRole.STAFF, UserRole.DRIVER]),
  phone: z.string().optional().nullable(),
  licenseNo: z.string().optional().nullable(),
});

peopleAdminRouter.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSchema>;
    const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (exists) throw new AppError(409, 'Email already exists', 'EMAIL_TAKEN');

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        phone: body.phone ?? null,
        passwordHash: await hashPassword(body.password),
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role,
        driver:
          body.role === UserRole.DRIVER
            ? { create: { licenseNo: body.licenseNo ?? null } }
            : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        driver: true,
      },
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

peopleAdminRouter.patch('/:id/active', async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'User not found', 'NOT_FOUND');
    if (![UserRole.ADMIN, UserRole.STAFF, UserRole.DRIVER].includes(existing.role)) {
      throw new AppError(400, 'Not a staff account', 'INVALID_ROLE');
    }
    if (existing.id === req.user!.sub && req.body?.isActive === false) {
      throw new AppError(400, 'Cannot deactivate your own account', 'SELF_DEACTIVATE');
    }
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { isActive: Boolean(req.body?.isActive) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum([UserRole.ADMIN, UserRole.STAFF, UserRole.DRIVER]).optional(),
  password: z.string().min(8).optional(),
  licenseNo: z.string().optional().nullable(),
});

peopleAdminRouter.patch('/:id', validate(updateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { driver: true },
    });
    if (!existing) throw new AppError(404, 'User not found', 'NOT_FOUND');
    if (![UserRole.ADMIN, UserRole.STAFF, UserRole.DRIVER].includes(existing.role)) {
      throw new AppError(400, 'Not a staff account', 'INVALID_ROLE');
    }

    const body = req.body as z.infer<typeof updateSchema>;
    if (body.email && body.email.toLowerCase() !== existing.email) {
      const taken = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
      if (taken) throw new AppError(409, 'Email already exists', 'EMAIL_TAKEN');
    }
    if (body.role && existing.id === req.user!.sub && body.role !== existing.role) {
      throw new AppError(400, 'Cannot change your own role', 'SELF_ROLE_CHANGE');
    }

    const nextRole = body.role ?? existing.role;
    const user = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          ...(body.email !== undefined ? { email: body.email.toLowerCase() } : {}),
          ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
          ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.password ? { passwordHash: await hashPassword(body.password) } : {}),
        },
      });

      if (nextRole === UserRole.DRIVER) {
        if (existing.driver) {
          await tx.driver.update({
            where: { id: existing.driver.id },
            data: {
              ...(body.licenseNo !== undefined ? { licenseNo: body.licenseNo } : {}),
            },
          });
        } else {
          await tx.driver.create({
            data: {
              userId: existing.id,
              licenseNo: body.licenseNo ?? null,
            },
          });
        }
      } else if (existing.driver && body.role && body.role !== UserRole.DRIVER) {
        await tx.driver.delete({ where: { id: existing.driver.id } });
      }

      return tx.user.findUnique({
        where: { id: existing.id },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          driver: true,
        },
      });
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});
