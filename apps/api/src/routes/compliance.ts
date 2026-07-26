import { Router } from 'express';
import { z } from 'zod';
import { ConsentType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';

export const complianceRouter = Router();

const consentSchema = z.object({
  type: z.nativeEnum(ConsentType),
  granted: z.boolean(),
  version: z.string().default('1.0'),
});

complianceRouter.get('/consents', authenticate, async (req, res, next) => {
  try {
    const consents = await prisma.consentRecord.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ consents });
  } catch (err) {
    next(err);
  }
});

complianceRouter.post('/consents', authenticate, validate(consentSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof consentSchema>;
    const record = await prisma.consentRecord.create({
      data: {
        userId: req.user!.sub,
        type: body.type,
        granted: body.granted,
        version: body.version,
        ip: req.ip,
      },
    });
    if (body.type === ConsentType.MARKETING) {
      await prisma.user.update({
        where: { id: req.user!.sub },
        data: { marketingOptIn: body.granted },
      });
    }
    res.status(201).json({ consent: record });
  } catch (err) {
    next(err);
  }
});

complianceRouter.get('/export', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const [user, addresses, orders, consents, wallet, loyalty] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          locale: true,
          marketingOptIn: true,
          createdAt: true,
        },
      }),
      prisma.address.findMany({ where: { userId } }),
      prisma.order.findMany({ where: { userId }, include: { items: true } }),
      prisma.consentRecord.findMany({ where: { userId } }),
      prisma.wallet.findUnique({ where: { userId }, include: { transactions: true } }),
      prisma.loyaltyAccount.findUnique({ where: { userId }, include: { transactions: true } }),
    ]);

    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

    res.json({
      exportedAt: new Date().toISOString(),
      regulation: 'UAE PDPL',
      data: { user, addresses, orders, consents, wallet, loyalty },
    });
  } catch (err) {
    next(err);
  }
});

complianceRouter.post('/delete', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    // Soft-delete / anonymize for PDPL right to erasure
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.address.deleteMany({ where: { userId } });
      await tx.consentRecord.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.cart.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          email: null,
          phone: null,
          firstName: 'Deleted',
          lastName: 'User',
          isActive: false,
          passwordHash: 'deleted',
          marketingOptIn: false,
          twoFactorSecret: null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'PDPL_DELETE',
          entity: 'User',
          entityId: userId,
          ip: req.ip,
        },
      });
    });
    res.json({ ok: true, message: 'Account anonymized per PDPL erasure request' });
  } catch (err) {
    next(err);
  }
});
