import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';

export const reviewsRouter = Router();

reviewsRouter.get('/product/:productId', optionalAuth, async (req, res, next) => {
  try {
    const reviews = await prisma.productReview.findMany({
      where: { productId: req.params.productId, isApproved: true },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const avg =
      reviews.length === 0
        ? 0
        : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
    res.json({ reviews, average: avg, count: reviews.length });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional().nullable(),
  body: z.string().max(2000).default(''),
});

reviewsRouter.post('/', authenticate, validate(createSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSchema>;
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product || !product.isActive) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }

    const review = await prisma.productReview.upsert({
      where: {
        productId_userId: { productId: body.productId, userId: req.user!.sub },
      },
      update: {
        rating: body.rating,
        title: body.title ?? null,
        body: body.body,
        isApproved: true,
      },
      create: {
        productId: body.productId,
        userId: req.user!.sub,
        rating: body.rating,
        title: body.title ?? null,
        body: body.body,
        isApproved: true,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
});
