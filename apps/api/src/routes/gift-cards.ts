import { randomBytes } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';
import { sendTransactionalMessage } from '../services/messaging.service';

export const giftCardsRouter = Router();

const PRESET_AMOUNTS = [50, 100, 200, 500] as const;

function generateGiftCode() {
  return `GC-${randomBytes(4).toString('hex').toUpperCase()}`;
}

giftCardsRouter.get('/presets', (_req, res) => {
  res.json({ amounts: PRESET_AMOUNTS, currency: 'AED' });
});

giftCardsRouter.get('/mine', authenticate, async (req, res, next) => {
  try {
    const cards = await prisma.giftCard.findMany({
      where: { purchasedById: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({
      cards: cards.map((c) => ({
        id: c.id,
        code: c.isActive && Number(c.balance) > 0 ? c.code : `${c.code.slice(0, 4)}••••`,
        fullCode: c.isActive && Number(c.balance) > 0 ? c.code : null,
        initialAmount: c.initialAmount,
        balance: c.balance,
        isActive: c.isActive,
        redeemedAt: c.redeemedAt,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
        note: c.note,
      })),
    });
  } catch (err) {
    next(err);
  }
});

giftCardsRouter.post(
  '/purchase',
  authenticate,
  validate(
    z.object({
      amount: z.number().positive().refine((n) => PRESET_AMOUNTS.includes(n as (typeof PRESET_AMOUNTS)[number]), {
        message: 'Amount must be 50, 100, 200, or 500',
      }),
      paymentMethod: z.enum(['WALLET', 'STRIPE']).default('WALLET'),
      recipientEmail: z.string().email().optional().nullable(),
      note: z.string().max(200).optional().nullable(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        amount: number;
        paymentMethod: 'WALLET' | 'STRIPE';
        recipientEmail?: string | null;
        note?: string | null;
      };
      const userId = req.user!.sub;
      const amount = body.amount;

      const result = await prisma.$transaction(async (tx) => {
        if (body.paymentMethod === 'WALLET') {
          const wallet =
            (await tx.wallet.findUnique({ where: { userId } })) ||
            (await tx.wallet.create({ data: { userId } }));
          const bal = Number(wallet.balance);
          if (bal < amount) {
            throw new AppError(400, 'Insufficient wallet balance', 'INSUFFICIENT_WALLET');
          }
          const newBal = Math.round((bal - amount) * 100) / 100;
          await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBal } });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'DEBIT',
              amount,
              balanceAfter: newBal,
              note: `Gift card purchase ${amount} AED`,
            },
          });
        }
        // STRIPE: demo issue without gateway charge (sandbox)

        let code = generateGiftCode();
        for (let i = 0; i < 5; i += 1) {
          const taken = await tx.giftCard.findUnique({ where: { code } });
          if (!taken) break;
          code = generateGiftCode();
        }

        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const card = await tx.giftCard.create({
          data: {
            code,
            initialAmount: amount,
            balance: amount,
            purchasedById: userId,
            note: body.note || `Purchased via ${body.paymentMethod}`,
            expiresAt,
          },
        });
        return card;
      });

      if (body.recipientEmail) {
        await sendTransactionalMessage({
          channel: 'EMAIL',
          to: body.recipientEmail,
          title: 'Your Fresh Harvest gift card',
          body: `You've received a ${amount} AED gift card.\n\nCode: ${result.code}\n\nRedeem it in the Fresh Harvest app or website wallet.`,
          userId,
          kind: 'gift_card',
        }).catch(() => undefined);
      }

      res.status(201).json({
        card: {
          id: result.id,
          code: result.code,
          initialAmount: result.initialAmount,
          balance: result.balance,
          expiresAt: result.expiresAt,
          currency: result.currency,
        },
        paymentMethod: body.paymentMethod,
      });
    } catch (err) {
      next(err);
    }
  },
);

giftCardsRouter.post(
  '/redeem',
  authenticate,
  validate(z.object({ code: z.string().min(4).max(40) })),
  async (req, res, next) => {
    try {
      const code = String((req.body as { code: string }).code).trim().toUpperCase();
      const userId = req.user!.sub;

      const result = await prisma.$transaction(async (tx) => {
        const card = await tx.giftCard.findUnique({ where: { code } });
        if (!card || !card.isActive) {
          throw new AppError(404, 'Gift card not found', 'GIFT_NOT_FOUND');
        }
        if (card.expiresAt && card.expiresAt < new Date()) {
          throw new AppError(400, 'Gift card expired', 'GIFT_EXPIRED');
        }
        const amount = Number(card.balance);
        if (amount <= 0) {
          throw new AppError(400, 'Gift card already used', 'GIFT_EMPTY');
        }

        const wallet =
          (await tx.wallet.findUnique({ where: { userId } })) ||
          (await tx.wallet.create({ data: { userId } }));
        const newBal = Math.round((Number(wallet.balance) + amount) * 100) / 100;
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBal } });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount,
            balanceAfter: newBal,
            note: `Gift card ${code}`,
          },
        });
        const updated = await tx.giftCard.update({
          where: { id: card.id },
          data: {
            balance: 0,
            isActive: false,
            redeemedById: userId,
            redeemedAt: new Date(),
          },
        });
        return { card: updated, credited: amount, walletBalance: newBal };
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

giftCardsRouter.get('/', authenticate, requireRoles(UserRole.ADMIN, UserRole.STAFF), async (_req, res, next) => {
  try {
    const cards = await prisma.giftCard.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    res.json({ cards });
  } catch (err) {
    next(err);
  }
});

giftCardsRouter.post(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validate(
    z.object({
      code: z.string().min(4).max(40),
      amount: z.number().positive(),
      note: z.string().max(200).optional(),
      expiresAt: z.coerce.date().optional().nullable(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        code: string;
        amount: number;
        note?: string;
        expiresAt?: Date | null;
      };
      const card = await prisma.giftCard.create({
        data: {
          code: body.code.trim().toUpperCase(),
          initialAmount: body.amount,
          balance: body.amount,
          note: body.note,
          expiresAt: body.expiresAt ?? null,
        },
      });
      res.status(201).json({ card });
    } catch (err) {
      next(err);
    }
  },
);

/** Void an unused/active gift card so it can no longer be redeemed. */
giftCardsRouter.post(
  '/:id/void',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (req, res, next) => {
    try {
      const existing = await prisma.giftCard.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Gift card not found', 'NOT_FOUND');
      if (!existing.isActive) throw new AppError(400, 'Card already inactive', 'ALREADY_INACTIVE');
      const card = await prisma.giftCard.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          balance: 0,
          note: existing.note
            ? `${existing.note} · Voided by admin`
            : 'Voided by admin',
        },
      });
      res.json({ card });
    } catch (err) {
      next(err);
    }
  },
);
