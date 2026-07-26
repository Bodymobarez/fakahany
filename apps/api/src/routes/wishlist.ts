import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';

export const wishlistRouter = Router();

wishlistRouter.use(authenticate);

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
};

wishlistRouter.get('/', async (req, res, next) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      include: { product: { include: productInclude } },
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

wishlistRouter.get('/ids', async (req, res, next) => {
  try {
    const rows = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.sub },
      select: { productId: true },
    });
    res.json({ productIds: rows.map((r) => r.productId) });
  } catch (err) {
    next(err);
  }
});

const addSchema = z.object({
  productId: z.string().min(1),
});

wishlistRouter.post('/', validate(addSchema), async (req, res, next) => {
  try {
    const { productId } = req.body as z.infer<typeof addSchema>;
    const userId = req.user!.sub;

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');

    const item = await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
      include: { product: { include: productInclude } },
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

wishlistRouter.delete('/:productId', async (req, res, next) => {
  try {
    const result = await prisma.wishlistItem.deleteMany({
      where: { userId: req.user!.sub, productId: req.params.productId },
    });
    if (!result.count) throw new AppError(404, 'Wishlist item not found', 'NOT_FOUND');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
