import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export const contentRouter = Router();

contentRouter.get('/banners', async (_req, res, next) => {
  try {
    const now = new Date();
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ banners });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/pages/:slug', async (req, res, next) => {
  try {
    const page = await prisma.cmsPage.findUnique({ where: { slug: req.params.slug } });
    if (!page || !page.isActive) throw new AppError(404, 'Page not found', 'NOT_FOUND');
    res.json({ page });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/faqs', async (_req, res, next) => {
  try {
    const faqs = await prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ faqs });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/blog', async (_req, res, next) => {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isActive: true, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/blog/:slug', async (req, res, next) => {
  try {
    const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } });
    if (!post || !post.isActive) throw new AppError(404, 'Post not found', 'NOT_FOUND');
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/recipes', async (_req, res, next) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ recipes });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/recipes/:slug', async (req, res, next) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { slug: req.params.slug },
      include: { items: { include: { product: { include: { images: { take: 1 } } } } } },
    });
    if (!recipe || !recipe.isActive) throw new AppError(404, 'Recipe not found', 'NOT_FOUND');
    res.json({ recipe });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/flash-sales', async (_req, res, next) => {
  try {
    const now = new Date();
    const sales = await prisma.flashSale.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: {
        items: {
          include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
        },
      },
    });
    res.json({ sales });
  } catch (err) {
    next(err);
  }
});
