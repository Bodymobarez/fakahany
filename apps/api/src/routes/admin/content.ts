import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';

export const contentAdminRouter = Router();

const pageSchema = z.object({
  titleEn: z.string(),
  titleAr: z.string(),
  slug: z.string(),
  bodyEn: z.string().default(''),
  bodyAr: z.string().default(''),
  isActive: z.boolean().optional(),
});

const pagePatchSchema = pageSchema.partial();

contentAdminRouter.get('/pages', async (_req, res, next) => {
  try {
    const pages = await prisma.cmsPage.findMany({ orderBy: { slug: 'asc' } });
    res.json({ pages });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.post('/pages', validate(pageSchema), async (req, res, next) => {
  try {
    const page = await prisma.cmsPage.create({ data: req.body });
    res.status(201).json({ page });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.patch('/pages/:id', validate(pagePatchSchema), async (req, res, next) => {
  try {
    const existing = await prisma.cmsPage.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Page not found', 'NOT_FOUND');
    const page = await prisma.cmsPage.update({ where: { id: existing.id }, data: req.body });
    res.json({ page });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.delete('/pages/:id', async (req, res, next) => {
  try {
    const existing = await prisma.cmsPage.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Page not found', 'NOT_FOUND');
    await prisma.cmsPage.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const faqSchema = z.object({
  questionEn: z.string(),
  questionAr: z.string(),
  answerEn: z.string(),
  answerAr: z.string(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().optional(),
});

const faqPatchSchema = faqSchema.partial();

contentAdminRouter.get('/faqs', async (_req, res, next) => {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ faqs });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.post('/faqs', validate(faqSchema), async (req, res, next) => {
  try {
    const faq = await prisma.faq.create({ data: req.body });
    res.status(201).json({ faq });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.patch('/faqs/:id', validate(faqPatchSchema), async (req, res, next) => {
  try {
    const existing = await prisma.faq.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'FAQ not found', 'NOT_FOUND');
    const faq = await prisma.faq.update({ where: { id: existing.id }, data: req.body });
    res.json({ faq });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.delete('/faqs/:id', async (req, res, next) => {
  try {
    const existing = await prisma.faq.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'FAQ not found', 'NOT_FOUND');
    await prisma.faq.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const blogSchema = z.object({
  titleEn: z.string(),
  titleAr: z.string(),
  slug: z.string(),
  excerptEn: z.string().default(''),
  excerptAr: z.string().default(''),
  bodyEn: z.string().default(''),
  bodyAr: z.string().default(''),
  coverUrl: z.string().optional().nullable(),
  publishedAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional(),
});

const blogPatchSchema = blogSchema.partial();

contentAdminRouter.get('/blog', async (_req, res, next) => {
  try {
    const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.post('/blog', validate(blogSchema), async (req, res, next) => {
  try {
    const post = await prisma.blogPost.create({ data: req.body });
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.patch('/blog/:id', validate(blogPatchSchema), async (req, res, next) => {
  try {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Post not found', 'NOT_FOUND');
    const post = await prisma.blogPost.update({ where: { id: existing.id }, data: req.body });
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.delete('/blog/:id', async (req, res, next) => {
  try {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Post not found', 'NOT_FOUND');
    await prisma.blogPost.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const recipeItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.string().optional().nullable(),
});

const recipeSchema = z.object({
  titleEn: z.string().min(2),
  titleAr: z.string().min(2),
  slug: z.string().min(2),
  bodyEn: z.string().default(''),
  bodyAr: z.string().default(''),
  imageUrl: z.string().optional().nullable(),
  prepMinutes: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  items: z.array(recipeItemSchema).default([]),
});

const recipePatchSchema = z.object({
  titleEn: z.string().min(2).optional(),
  titleAr: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  bodyEn: z.string().optional(),
  bodyAr: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  prepMinutes: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  items: z.array(recipeItemSchema).optional(),
});

const recipeInclude = {
  items: {
    include: { product: { select: { id: true, nameEn: true, sku: true } } },
  },
} as const;

contentAdminRouter.get('/recipes', async (_req, res, next) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: recipeInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ recipes });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.post('/recipes', validate(recipeSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof recipeSchema>;
    const recipe = await prisma.recipe.create({
      data: {
        titleEn: body.titleEn,
        titleAr: body.titleAr,
        slug: body.slug,
        bodyEn: body.bodyEn,
        bodyAr: body.bodyAr,
        imageUrl: body.imageUrl ?? null,
        prepMinutes: body.prepMinutes ?? null,
        isActive: body.isActive ?? true,
        items: {
          create: body.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity ?? null,
          })),
        },
      },
      include: recipeInclude,
    });
    res.status(201).json({ recipe });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.patch('/recipes/:id', validate(recipePatchSchema), async (req, res, next) => {
  try {
    const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Recipe not found', 'NOT_FOUND');
    const body = req.body as z.infer<typeof recipePatchSchema>;
    const { items, ...data } = body;
    const recipe = await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.recipeItem.deleteMany({ where: { recipeId: existing.id } });
        if (items.length) {
          await tx.recipeItem.createMany({
            data: items.map((item) => ({
              recipeId: existing.id,
              productId: item.productId,
              quantity: item.quantity ?? null,
            })),
          });
        }
      }
      return tx.recipe.update({
        where: { id: existing.id },
        data,
        include: recipeInclude,
      });
    });
    res.json({ recipe });
  } catch (err) {
    next(err);
  }
});

contentAdminRouter.delete('/recipes/:id', async (req, res, next) => {
  try {
    const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Recipe not found', 'NOT_FOUND');
    await prisma.recipe.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
