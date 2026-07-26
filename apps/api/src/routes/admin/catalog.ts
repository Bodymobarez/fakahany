import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';

export const catalogAdminRouter = Router();

const categorySchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  slug: z.string().min(1),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().optional(),
});

catalogAdminRouter.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
      include: { parent: { select: { id: true, nameEn: true, slug: true } } },
    });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

catalogAdminRouter.post('/categories', validate(categorySchema), async (req, res, next) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

catalogAdminRouter.patch('/categories/:id', validate(categorySchema.partial()), async (req, res, next) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Category not found', 'NOT_FOUND');
    const category = await prisma.category.update({
      where: { id: existing.id },
      data: req.body,
    });
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  logoUrl: z.string().optional().nullable(),
});

catalogAdminRouter.get('/brands', async (_req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json({ brands });
  } catch (err) {
    next(err);
  }
});

catalogAdminRouter.post('/brands', validate(brandSchema), async (req, res, next) => {
  try {
    const brand = await prisma.brand.create({ data: req.body });
    res.status(201).json({ brand });
  } catch (err) {
    next(err);
  }
});

catalogAdminRouter.patch('/brands/:id', validate(brandSchema.partial()), async (req, res, next) => {
  try {
    const existing = await prisma.brand.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Brand not found', 'NOT_FOUND');
    const brand = await prisma.brand.update({
      where: { id: existing.id },
      data: req.body,
    });
    res.json({ brand });
  } catch (err) {
    next(err);
  }
});

const unitSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  symbol: z.string().min(1),
  isActive: z.boolean().optional(),
});

catalogAdminRouter.get('/units', async (_req, res, next) => {
  try {
    const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
    res.json({ units });
  } catch (err) {
    next(err);
  }
});

catalogAdminRouter.post('/units', validate(unitSchema), async (req, res, next) => {
  try {
    const unit = await prisma.unit.create({ data: req.body });
    res.status(201).json({ unit });
  } catch (err) {
    next(err);
  }
});

catalogAdminRouter.patch('/units/:id', validate(unitSchema.partial()), async (req, res, next) => {
  try {
    const existing = await prisma.unit.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Unit not found', 'NOT_FOUND');
    const unit = await prisma.unit.update({ where: { id: existing.id }, data: req.body });
    res.json({ unit });
  } catch (err) {
    next(err);
  }
});

const attributeValueSchema = z.object({
  valueEn: z.string().min(1),
  valueAr: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

const attributeSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  slug: z.string().min(1),
  isActive: z.boolean().optional(),
  values: z.array(attributeValueSchema).default([]),
});

const attributePatchSchema = z.object({
  nameEn: z.string().min(1).optional(),
  nameAr: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  values: z.array(attributeValueSchema).optional(),
});

catalogAdminRouter.get('/attributes', async (_req, res, next) => {
  try {
    const attributes = await prisma.attribute.findMany({
      include: { values: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { nameEn: 'asc' },
    });
    res.json({ attributes });
  } catch (err) {
    next(err);
  }
});

catalogAdminRouter.post('/attributes', validate(attributeSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof attributeSchema>;
    const attribute = await prisma.attribute.create({
      data: {
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        slug: body.slug,
        isActive: body.isActive ?? true,
        values: {
          create: body.values.map((v) => ({
            valueEn: v.valueEn,
            valueAr: v.valueAr,
            sortOrder: v.sortOrder ?? 0,
          })),
        },
      },
      include: { values: true },
    });
    res.status(201).json({ attribute });
  } catch (err) {
    next(err);
  }
});

catalogAdminRouter.patch(
  '/attributes/:id',
  validate(attributePatchSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.attribute.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Attribute not found', 'NOT_FOUND');
      const body = req.body as z.infer<typeof attributePatchSchema>;
      const { values, ...data } = body;
      const attribute = await prisma.$transaction(async (tx) => {
        if (values) {
          await tx.attributeValue.deleteMany({ where: { attributeId: existing.id } });
          if (values.length) {
            await tx.attributeValue.createMany({
              data: values.map((v) => ({
                attributeId: existing.id,
                valueEn: v.valueEn,
                valueAr: v.valueAr,
                sortOrder: v.sortOrder ?? 0,
              })),
            });
          }
        }
        return tx.attribute.update({
          where: { id: existing.id },
          data,
          include: { values: { orderBy: { sortOrder: 'asc' } } },
        });
      });
      res.json({ attribute });
    } catch (err) {
      next(err);
    }
  },
);