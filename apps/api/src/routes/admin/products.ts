import { Router } from 'express';
import { z } from 'zod';
import { ProductType, SoldAs } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';

export const productsAdminRouter = Router();

productsAdminRouter.get('/', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const products = await prisma.product.findMany({
      where: q
        ? {
            OR: [
              { nameEn: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: { images: true, brand: true, variants: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

productsAdminRouter.get('/reviews/all', async (_req, res, next) => {
  try {
    const reviews = await prisma.productReview.findMany({
      include: {
        product: { select: { id: true, nameEn: true, sku: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

productsAdminRouter.patch('/reviews/:id', async (req, res, next) => {
  try {
    const isApproved = Boolean(req.body?.isApproved);
    const review = await prisma.productReview.update({
      where: { id: req.params.id },
      data: { isApproved },
    });
    res.json({ review });
  } catch (err) {
    next(err);
  }
});

const productSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  slug: z.string().min(1),
  descriptionEn: z.string().default(''),
  descriptionAr: z.string().default(''),
  type: z.nativeEnum(ProductType).default(ProductType.SIMPLE),
  brandId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  basePrice: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional().nullable(),
  stockQty: z.number().int().default(0),
  soldAs: z.nativeEnum(SoldAs).default(SoldAs.PIECE),
  weight: z.number().nonnegative().optional().nullable(),
  unit: z.enum(['g', 'kg', 'bunch', 'pack']).optional().nullable(),
  packageSize: z.string().optional().nullable(),
  isOrganic: z.boolean().optional(),
  isHalal: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isImported: z.boolean().optional(),
  isSeasonal: z.boolean().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  images: z
    .array(z.object({ url: z.string(), sortOrder: z.number().int().default(0), isPrimary: z.boolean().default(false) }))
    .optional(),
});

productsAdminRouter.get('/categories/all', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

productsAdminRouter.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { images: true, brand: true, variants: true, categories: true },
    });
    if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

productsAdminRouter.post('/', validate(productSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof productSchema>;
    const { categoryIds, images, ...data } = body;
    const product = await prisma.product.create({
      data: {
        ...data,
        categories: categoryIds?.length
          ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        images: images?.length ? { create: images } : undefined,
      },
      include: { images: true, categories: true },
    });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

productsAdminRouter.patch('/:id', validate(productSchema.partial()), async (req, res, next) => {
  try {
    const body = req.body as Partial<z.infer<typeof productSchema>>;
    const { categoryIds, images, ...data } = body;
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Product not found', 'NOT_FOUND');

    if (categoryIds) {
      await prisma.productCategory.deleteMany({ where: { productId: existing.id } });
      await prisma.productCategory.createMany({
        data: categoryIds.map((categoryId) => ({ productId: existing.id, categoryId })),
      });
    }
    if (images) {
      await prisma.productImage.deleteMany({ where: { productId: existing.id } });
      await prisma.productImage.createMany({
        data: images.map((img) => ({ ...img, productId: existing.id })),
      });
    }

    const product = await prisma.product.update({
      where: { id: existing.id },
      data,
      include: { images: true, categories: true, variants: true },
    });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

productsAdminRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const variantSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  price: z.number().nonnegative(),
  stockQty: z.number().int().default(0),
  barcode: z.string().optional().nullable(),
  weight: z.number().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
  attributes: z.unknown().optional().nullable(),
});

productsAdminRouter.post('/:id/variants', validate(variantSchema), async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
    const body = req.body as z.infer<typeof variantSchema>;
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: body.name,
        sku: body.sku,
        price: body.price,
        stockQty: body.stockQty,
        barcode: body.barcode ?? null,
        weight: body.weight ?? null,
        isActive: body.isActive ?? true,
        attributes: body.attributes ?? undefined,
      },
    });
    if (product.type === ProductType.SIMPLE) {
      await prisma.product.update({
        where: { id: product.id },
        data: { type: ProductType.VARIABLE },
      });
    }
    res.status(201).json({ variant });
  } catch (err) {
    next(err);
  }
});

productsAdminRouter.patch(
  '/:id/variants/:variantId',
  validate(variantSchema.partial()),
  async (req, res, next) => {
    try {
      const existing = await prisma.productVariant.findFirst({
        where: { id: req.params.variantId, productId: req.params.id },
      });
      if (!existing) throw new AppError(404, 'Variant not found', 'NOT_FOUND');
      const body = req.body as Partial<z.infer<typeof variantSchema>>;
      const variant = await prisma.productVariant.update({
        where: { id: existing.id },
        data: {
          ...(body.name != null ? { name: body.name } : {}),
          ...(body.sku != null ? { sku: body.sku } : {}),
          ...(body.price != null ? { price: body.price } : {}),
          ...(body.stockQty != null ? { stockQty: body.stockQty } : {}),
          ...(body.barcode !== undefined ? { barcode: body.barcode } : {}),
          ...(body.weight !== undefined ? { weight: body.weight } : {}),
          ...(body.isActive != null ? { isActive: body.isActive } : {}),
          ...(body.attributes !== undefined
            ? { attributes: body.attributes as object | undefined }
            : {}),
        },
      });
      res.json({ variant });
    } catch (err) {
      next(err);
    }
  },
);

productsAdminRouter.delete('/:id/variants/:variantId', async (req, res, next) => {
  try {
    const existing = await prisma.productVariant.findFirst({
      where: { id: req.params.variantId, productId: req.params.id },
    });
    if (!existing) throw new AppError(404, 'Variant not found', 'NOT_FOUND');
    await prisma.productVariant.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
