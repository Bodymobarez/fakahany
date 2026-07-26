import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { LOYALTY_POINTS_PER_AED, loyaltyAedFromPoints } from '../services/loyalty.service';

export const loyaltyRouter = Router();

loyaltyRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    let account = await prisma.loyaltyAccount.findUnique({
      where: { userId: req.user!.sub },
      include: {
        level: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!account) {
      account = await prisma.loyaltyAccount.create({
        data: { userId: req.user!.sub },
        include: {
          level: true,
          transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });
    }
    const levels = await prisma.membershipLevel.findMany({ orderBy: { minPoints: 'asc' } });
    res.json({
      account,
      levels,
      redeem: {
        pointsPerAed: LOYALTY_POINTS_PER_AED,
        redeemableAed: loyaltyAedFromPoints(account.points),
        note: `${LOYALTY_POINTS_PER_AED} points = 1 AED at checkout`,
      },
    });
  } catch (err) {
    next(err);
  }
});
