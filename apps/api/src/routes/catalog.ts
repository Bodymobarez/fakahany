import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { validate } from '../middleware/validate';

export const catalogRouter = Router();

catalogRouter.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
        },
      },
    });
    res.json({ categories: categories.filter((c) => !c.parentId) });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/categories/:slug', async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        products: {
          include: {
            product: {
              include: { images: { orderBy: { sortOrder: 'asc' } }, brand: true },
            },
          },
        },
      },
    });
    if (!category || !category.isActive) throw new AppError(404, 'Category not found', 'NOT_FOUND');
    res.json({
      category,
      products: category.products.map((p) => p.product),
    });
  } catch (err) {
    next(err);
  }
});

const productQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  featured: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

catalogRouter.get('/products', validate(productQuerySchema, 'query'), async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const query = req.query as unknown as z.infer<typeof productQuerySchema>;
    const where: Prisma.ProductWhereInput = { isActive: true };
    if (query.featured === 'true') where.isFeatured = true;
    if (query.q) {
      where.OR = [
        { nameEn: { contains: query.q, mode: 'insensitive' } },
        { nameAr: { contains: query.q, mode: 'insensitive' } },
        { tags: { has: query.q } },
      ];
    }
    if (query.category) {
      where.categories = { some: { category: { slug: query.category } } };
    }
    if (query.brand) {
      where.brand = { slug: query.brand };
    }
    if (query.vendor) {
      where.vendor = { slug: query.vendor };
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          brand: true,
          variants: { where: { isActive: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products: items,
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/featured', async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 20,
      orderBy: { updatedAt: 'desc' },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        brand: true,
      },
    });
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/:slug', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const key = req.params.slug;
    const include = {
      images: { orderBy: { sortOrder: 'asc' as const } },
      brand: true,
      vendor: true,
      variants: { where: { isActive: true } },
      categories: { include: { category: true } },
      relationsFrom: {
        include: {
          related: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
              brand: true,
            },
          },
        },
      },
    };
    let product = await prisma.product.findUnique({ where: { slug: key }, include });
    if (!product) {
      product = await prisma.product.findUnique({ where: { id: key }, include });
    }
    if (!product || !product.isActive) throw new AppError(404, 'Product not found', 'NOT_FOUND');

    let relatedProducts: Array<{
      id: string;
      slug: string;
      nameEn: string;
      nameAr: string;
      basePrice: unknown;
      images: Array<{ url: string }>;
      brand: { id: string; name: string; slug: string } | null;
    }> = product.relationsFrom
      .map((r) => r.related)
      .filter((p) => p && p.isActive !== false);

    if (relatedProducts.length === 0) {
      const categoryIds = product.categories.map((c) => c.categoryId);
      relatedProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          id: { not: product.id },
          ...(categoryIds.length
            ? { categories: { some: { categoryId: { in: categoryIds } } } }
            : {}),
        },
        take: 4,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          brand: true,
        },
      });
    }

    res.json({ product: { ...product, relatedProducts } });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/brands', async (_req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
    res.json({ brands });
  } catch (err) {
    next(err);
  }
});
