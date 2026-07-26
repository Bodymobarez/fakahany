import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const walletRouter = Router();

walletRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.sub },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: req.user!.sub },
        include: {
          transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });
    }
    res.json({ wallet });
  } catch (err) {
    next(err);
  }
});
