import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';
import { validate } from '../../middleware/validate';

export const customersAdminRouter = Router();

customersAdminRouter.get('/', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' as const } },
                { phone: { contains: q } },
                { firstName: { contains: q, mode: 'insensitive' as const } },
                { lastName: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ customers });
  } catch (err) {
    next(err);
  }
});

const levelSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  minPoints: z.number().int().nonnegative(),
  earnRate: z.number().positive().optional(),
  perks: z.unknown().optional().nullable(),
});

customersAdminRouter.get('/loyalty/levels', async (_req, res, next) => {
  try {
    const levels = await prisma.membershipLevel.findMany({
      orderBy: { minPoints: 'asc' },
      include: { _count: { select: { accounts: true } } },
    });
    res.json({ levels });
  } catch (err) {
    next(err);
  }
});

customersAdminRouter.post('/loyalty/levels', validate(levelSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof levelSchema>;
    const level = await prisma.membershipLevel.create({
      data: {
        name: body.name.trim(),
        slug: body.slug.trim().toLowerCase(),
        minPoints: body.minPoints,
        earnRate: body.earnRate ?? 1,
        perks: body.perks === undefined ? undefined : (body.perks as object | null),
      },
    });
    res.status(201).json({ level });
  } catch (err) {
    next(err);
  }
});

customersAdminRouter.patch(
  '/loyalty/levels/:id',
  validate(levelSchema.partial()),
  async (req, res, next) => {
    try {
      const existing = await prisma.membershipLevel.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Level not found', 'NOT_FOUND');
      const body = req.body as Partial<z.infer<typeof levelSchema>>;
      const level = await prisma.membershipLevel.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.slug !== undefined ? { slug: body.slug.trim().toLowerCase() } : {}),
          ...(body.minPoints !== undefined ? { minPoints: body.minPoints } : {}),
          ...(body.earnRate !== undefined ? { earnRate: body.earnRate } : {}),
          ...(body.perks !== undefined ? { perks: body.perks as object | null } : {}),
        },
      });
      res.json({ level });
    } catch (err) {
      next(err);
    }
  },
);

customersAdminRouter.delete('/loyalty/levels/:id', async (req, res, next) => {
  try {
    const existing = await prisma.membershipLevel.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { accounts: true } } },
    });
    if (!existing) throw new AppError(404, 'Level not found', 'NOT_FOUND');
    if (existing._count.accounts > 0) {
      throw new AppError(400, 'Level still assigned to accounts', 'LEVEL_IN_USE');
    }
    await prisma.membershipLevel.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

customersAdminRouter.get('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 20 },
        wallet: true,
        loyaltyAccount: { include: { level: true } },
      },
    });
    if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');
    const { passwordHash: _, ...safe } = customer;
    res.json({ customer: safe });
  } catch (err) {
    next(err);
  }
});

customersAdminRouter.patch('/:id/active', async (req, res, next) => {
  try {
    const isActive = Boolean(req.body?.isActive);
    const customer = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: { id: true, isActive: true },
    });
    res.json({ customer });
  } catch (err) {
    next(err);
  }
});

const walletCreditSchema = z.object({
  amount: z.number().positive(),
  note: z.string().max(200).optional(),
});

customersAdminRouter.post(
  '/:id/wallet/credit',
  validate(walletCreditSchema),
  async (req, res, next) => {
    try {
      const userId = req.params.id;
      const amount = Number(req.body.amount);
      const note = (req.body.note as string | undefined) || 'Admin credit';

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError(404, 'Customer not found', 'NOT_FOUND');

      const wallet = await prisma.$transaction(async (tx) => {
        const existing =
          (await tx.wallet.findUnique({ where: { userId } })) ||
          (await tx.wallet.create({ data: { userId } }));
        const balanceAfter = Number(existing.balance) + amount;
        const updated = await tx.wallet.update({
          where: { id: existing.id },
          data: { balance: new Prisma.Decimal(balanceAfter) },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: existing.id,
            type: 'CREDIT',
            amount,
            balanceAfter,
            note,
            reference: 'ADMIN_CREDIT',
          },
        });
        return updated;
      });

      res.json({ wallet });
    } catch (err) {
      next(err);
    }
  },
);

const loyaltyAdjustSchema = z.object({
  points: z.number().int(),
  note: z.string().max(200).optional(),
});

customersAdminRouter.post(
  '/:id/loyalty/adjust',
  validate(loyaltyAdjustSchema),
  async (req, res, next) => {
    try {
      const userId = req.params.id;
      const delta = Number(req.body.points);
      if (delta === 0) throw new AppError(400, 'Points delta required', 'VALIDATION_ERROR');
      const note = (req.body.note as string | undefined) || 'Admin adjustment';

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError(404, 'Customer not found', 'NOT_FOUND');

      const account = await prisma.$transaction(async (tx) => {
        const existing =
          (await tx.loyaltyAccount.findUnique({ where: { userId } })) ||
          (await tx.loyaltyAccount.create({ data: { userId } }));
        const nextPoints = Math.max(0, existing.points + delta);
        const level = await tx.membershipLevel.findFirst({
          where: { minPoints: { lte: nextPoints } },
          orderBy: { minPoints: 'desc' },
        });
        const updated = await tx.loyaltyAccount.update({
          where: { id: existing.id },
          data: { points: nextPoints, levelId: level?.id ?? existing.levelId },
          include: { level: true },
        });
        await tx.rewardTransaction.create({
          data: {
            accountId: existing.id,
            type: 'ADJUST',
            points: delta,
            reference: 'ADMIN_ADJUST',
            note,
          },
        });
        return updated;
      });

      res.json({ loyaltyAccount: account });
    } catch (err) {
      next(err);
    }
  },
);
