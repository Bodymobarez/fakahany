import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';
import { UserRole } from '@prisma/client';

/**
 * Phase 8 — Expansion readiness stubs:
 * subscriptions, marketplace vendors, B2B price lists,
 * AI recommendation/forecast hooks, integration webhooks, GraphQL placeholder.
 */
export const expansionRouter = Router();

// ── GraphQL readiness (REST companion; full GraphQL server can mount later) ──
expansionRouter.get('/graphql', (_req, res) => {
  res.json({
    ok: true,
    mode: 'stub',
    message: 'GraphQL gateway planned alongside REST. Use REST /api/* for now.',
    schemaUrl: null,
  });
});

expansionRouter.post('/graphql', (_req, res) => {
  res.status(501).json({
    errors: [{ message: 'GraphQL execution not enabled yet; REST API is primary.' }],
  });
});

// ── Subscriptions (recurring delivery) ───────────────────────────────────────
expansionRouter.get('/subscriptions', authenticate, async (req, res, next) => {
  try {
    const items = await prisma.subscription.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ subscriptions: items });
  } catch (err) {
    next(err);
  }
});

const subSchema = z.object({
  planCode: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  productIds: z.array(z.string().min(1)).min(1).max(12).optional(),
  addressId: z.string().min(1).optional(),
  meta: z.record(z.unknown()).optional(),
});

expansionRouter.post('/subscriptions', authenticate, validate(subSchema), async (req, res, next) => {
  try {
    const { nextRunFromPlan } = await import('../services/subscription.service');
    const body = req.body as z.infer<typeof subSchema>;
    const productIds =
      body.productIds ||
      (Array.isArray((body.meta as { productIds?: string[] } | undefined)?.productIds)
        ? (body.meta as { productIds: string[] }).productIds
        : undefined);
    const addressId =
      body.addressId ||
      ((body.meta as { addressId?: string } | undefined)?.addressId as string | undefined);

    if (addressId) {
      const address = await prisma.address.findFirst({
        where: { id: addressId, userId: req.user!.sub },
      });
      if (!address) throw new AppError(400, 'Address not found', 'INVALID_ADDRESS');
    }
    if (productIds?.length) {
      const count = await prisma.product.count({
        where: { id: { in: productIds }, isActive: true },
      });
      if (count !== productIds.length) {
        throw new AppError(400, 'One or more products are invalid', 'INVALID_PRODUCTS');
      }
    }

    const meta = {
      ...(body.meta ?? {}),
      productIds: productIds || [],
      addressId: addressId || null,
      nextRunAt:
        (body.meta as { nextRunAt?: string } | undefined)?.nextRunAt || nextRunFromPlan(body.planCode),
    };
    const sub = await prisma.subscription.create({
      data: {
        userId: req.user!.sub,
        planCode: body.planCode,
        status: 'ACTIVE',
        meta,
      },
    });
    res.status(201).json({ subscription: sub });
  } catch (err) {
    next(err);
  }
});

expansionRouter.patch(
  '/subscriptions/:id',
  authenticate,
  validate(
    z.object({
      productIds: z.array(z.string().min(1)).min(1).max(12).optional(),
      addressId: z.string().min(1).optional().nullable(),
    }),
  ),
  async (req, res, next) => {
    try {
      const existing = await prisma.subscription.findFirst({
        where: { id: req.params.id, userId: req.user!.sub },
      });
      if (!existing) throw new AppError(404, 'Subscription not found', 'NOT_FOUND');
      const body = req.body as { productIds?: string[]; addressId?: string | null };
      if (body.addressId) {
        const address = await prisma.address.findFirst({
          where: { id: body.addressId, userId: req.user!.sub },
        });
        if (!address) throw new AppError(400, 'Address not found', 'INVALID_ADDRESS');
      }
      if (body.productIds?.length) {
        const count = await prisma.product.count({
          where: { id: { in: body.productIds }, isActive: true },
        });
        if (count !== body.productIds.length) {
          throw new AppError(400, 'One or more products are invalid', 'INVALID_PRODUCTS');
        }
      }
      const prev = (existing.meta || {}) as Record<string, unknown>;
      const sub = await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          meta: {
            ...prev,
            ...(body.productIds ? { productIds: body.productIds } : {}),
            ...(body.addressId !== undefined ? { addressId: body.addressId } : {}),
          },
        },
      });
      res.json({ subscription: sub });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.post('/subscriptions/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!existing) throw new AppError(404, 'Subscription not found', 'NOT_FOUND');
    const sub = await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED', endsAt: new Date() },
    });
    res.json({ subscription: sub });
  } catch (err) {
    next(err);
  }
});

expansionRouter.post('/subscriptions/:id/pause', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!existing) throw new AppError(404, 'Subscription not found', 'NOT_FOUND');
    if (existing.status === 'CANCELLED') {
      throw new AppError(400, 'Cancelled subscription cannot be paused', 'CANCELLED');
    }
    const nextStatus = existing.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    const subscription = await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: nextStatus },
    });
    res.json({ subscription });
  } catch (err) {
    next(err);
  }
});

// ── Marketplace vendors ──────────────────────────────────────────────────────
expansionRouter.get('/vendors', async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === '1';
    const vendors = await prisma.vendor.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ vendors });
  } catch (err) {
    next(err);
  }
});

expansionRouter.get('/vendors/:slug', async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: { _count: { select: { products: true } } },
    });
    if (!vendor) throw new AppError(404, 'Vendor not found', 'NOT_FOUND');
    res.json({ vendor });
  } catch (err) {
    next(err);
  }
});

const vendorSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

expansionRouter.post(
  '/vendors',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validate(vendorSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof vendorSchema>;
      const vendor = await prisma.vendor.create({ data: body });
      res.status(201).json({ vendor });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.patch(
  '/vendors/:id',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validate(vendorSchema.partial()),
  async (req, res, next) => {
    try {
      const existing = await prisma.vendor.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Vendor not found', 'NOT_FOUND');
      const vendor = await prisma.vendor.update({
        where: { id: existing.id },
        data: req.body,
      });
      res.json({ vendor });
    } catch (err) {
      next(err);
    }
  },
);
// ── B2B customer groups & price lists ────────────────────────────────────────
expansionRouter.get(
  '/b2b/groups',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (_req, res, next) => {
    try {
      const groups = await prisma.customerGroup.findMany({
        include: {
          _count: { select: { members: true } },
          priceLists: true,
          members: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
      res.json({ groups });
    } catch (err) {
      next(err);
    }
  },
);

const groupSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  discount: z.number().min(0).max(100).optional().nullable(),
});

expansionRouter.post(
  '/b2b/groups',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validate(groupSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof groupSchema>;
      const group = await prisma.customerGroup.create({ data: body });
      res.status(201).json({ group });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.patch(
  '/b2b/groups/:id',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validate(groupSchema.partial()),
  async (req, res, next) => {
    try {
      const existing = await prisma.customerGroup.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Group not found', 'NOT_FOUND');
      const group = await prisma.customerGroup.update({
        where: { id: existing.id },
        data: req.body,
      });
      res.json({ group });
    } catch (err) {
      next(err);
    }
  },
);
const memberSchema = z.object({
  userId: z.string().min(1),
});

expansionRouter.post(
  '/b2b/groups/:id/members',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  validate(memberSchema),
  async (req, res, next) => {
    try {
      const groupId = req.params.id;
      const { userId } = req.body as z.infer<typeof memberSchema>;
      const group = await prisma.customerGroup.findUnique({ where: { id: groupId } });
      if (!group) throw new AppError(404, 'Group not found', 'NOT_FOUND');
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError(404, 'Customer not found', 'NOT_FOUND');
      const member = await prisma.customerGroupMember.upsert({
        where: { groupId_userId: { groupId, userId } },
        create: { groupId, userId },
        update: {},
      });
      res.status(201).json({ member });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.delete(
  '/b2b/groups/:id/members/:userId',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (req, res, next) => {
    try {
      await prisma.customerGroupMember.deleteMany({
        where: { groupId: req.params.id, userId: req.params.userId },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.get(
  '/b2b/price-lists',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (_req, res, next) => {
    try {
      const priceLists = await prisma.priceList.findMany({
        include: {
          items: { include: { product: { select: { id: true, nameEn: true, sku: true } } } },
          group: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ priceLists });
    } catch (err) {
      next(err);
    }
  },
);

const priceListSchema = z.object({
  name: z.string().min(1).max(120),
  groupId: z.string().optional().nullable(),
  currency: z.string().length(3).default('AED'),
  isActive: z.boolean().optional(),
});

expansionRouter.post(
  '/b2b/price-lists',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  validate(priceListSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof priceListSchema>;
      if (body.groupId) {
        const group = await prisma.customerGroup.findUnique({ where: { id: body.groupId } });
        if (!group) throw new AppError(404, 'Group not found', 'NOT_FOUND');
      }
      const priceList = await prisma.priceList.create({
        data: {
          name: body.name,
          groupId: body.groupId ?? null,
          currency: body.currency || 'AED',
          isActive: body.isActive ?? true,
        },
        include: { items: true, group: true },
      });
      res.status(201).json({ priceList });
    } catch (err) {
      next(err);
    }
  },
);

const priceListItemSchema = z.object({
  productId: z.string().min(1),
  productVariantId: z.string().optional().nullable(),
  price: z.number().positive(),
});

expansionRouter.post(
  '/b2b/price-lists/:id/items',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  validate(priceListItemSchema),
  async (req, res, next) => {
    try {
      const list = await prisma.priceList.findUnique({ where: { id: req.params.id } });
      if (!list) throw new AppError(404, 'Price list not found', 'NOT_FOUND');
      const body = req.body as z.infer<typeof priceListItemSchema>;
      const product = await prisma.product.findUnique({ where: { id: body.productId } });
      if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
      const item = await prisma.priceListItem.create({
        data: {
          priceListId: list.id,
          productId: body.productId,
          productVariantId: body.productVariantId ?? null,
          price: body.price,
        },
      });
      res.status(201).json({ item });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.delete(
  '/b2b/price-lists/:id/items/:itemId',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (req, res, next) => {
    try {
      await prisma.priceListItem.deleteMany({
        where: { id: req.params.itemId, priceListId: req.params.id },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.patch(
  '/b2b/price-lists/:id',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  validate(
    z.object({
      name: z.string().min(1).optional(),
      groupId: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const priceList = await prisma.priceList.update({
        where: { id: req.params.id },
        data: req.body,
        include: { items: true, group: true },
      });
      res.json({ priceList });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.get(
  '/subscriptions/admin',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (_req, res, next) => {
    try {
      const subscriptions = await prisma.subscription.findMany({
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      res.json({ subscriptions });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.post(
  '/subscriptions/run-cycle',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (req, res, next) => {
    try {
      const { runSubscriptionCycle } = await import('../services/subscription.service');
      const forceAll = req.query.force === 'true' || (req.body as { force?: boolean })?.force === true;
      const result = await runSubscriptionCycle({ forceAll });
      res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.post(
  '/subscriptions/admin/:id/cancel',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (req, res, next) => {
    try {
      const existing = await prisma.subscription.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Subscription not found', 'NOT_FOUND');
      if (existing.status === 'CANCELLED') {
        throw new AppError(400, 'Already cancelled', 'ALREADY_CANCELLED');
      }
      const subscription = await prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED', endsAt: new Date() },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
      res.json({ subscription });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.post(
  '/subscriptions/admin/:id/pause',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (req, res, next) => {
    try {
      const existing = await prisma.subscription.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Subscription not found', 'NOT_FOUND');
      if (existing.status === 'CANCELLED') {
        throw new AppError(400, 'Cancelled subscription cannot be paused', 'CANCELLED');
      }
      const nextStatus = existing.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
      const subscription = await prisma.subscription.update({
        where: { id: existing.id },
        data: { status: nextStatus },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
      res.json({ subscription });
    } catch (err) {
      next(err);
    }
  },
);
// ── AI hooks (pluggable) ─────────────────────────────────────────────────────
expansionRouter.get('/ai/recommendations', async (req, res, next) => {
  try {
    const userId =
      typeof req.query.userId === 'string' ? req.query.userId : req.user?.sub || 'anon';
    const products = await prisma.product.findMany({
      where: { isActive: true, OR: [{ isBestSeller: true }, { isFeatured: true }, { isNew: true }] },
      take: 12,
      include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
    });
    res.json({
      engine: 'stub-popularity',
      userId,
      products,
      note: 'Replace with ML recommender service without changing this contract.',
    });
  } catch (err) {
    next(err);
  }
});

expansionRouter.get('/ai/recommendations/:userId', authenticate, async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user!.sub;
    const products = await prisma.product.findMany({
      where: { isActive: true, OR: [{ isBestSeller: true }, { isFeatured: true }] },
      take: 12,
      include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
    });
    res.json({
      engine: 'stub-popularity',
      userId,
      products,
      note: 'Replace with ML recommender service without changing this contract.',
    });
  } catch (err) {
    next(err);
  }
});

expansionRouter.get(
  '/ai/demand-forecast',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (_req, res, next) => {
    try {
      const lowStock = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, nameEn: true, sku: true, stockQty: true, basePrice: true },
        orderBy: { stockQty: 'asc' },
        take: 30,
      });
      res.json({
        engine: 'stub-reorder',
        generatedAt: new Date().toISOString(),
        forecasts: lowStock
          .filter((p) => p.stockQty < 80)
          .map((p) => ({
            productId: p.id,
            sku: p.sku,
            name: p.nameEn,
            currentStock: p.stockQty,
            suggestedReorderQty: Math.max(80 - p.stockQty, 10),
            unitCost: Math.round(Number(p.basePrice) * 0.65 * 100) / 100,
            confidence: p.stockQty <= 20 ? 0.75 : 0.55,
          })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── Third-party integration stubs ────────────────────────────────────────────
expansionRouter.get('/integrations', authenticate, requireRoles(UserRole.ADMIN), (_req, res) => {
  res.json({
    integrations: [
      { id: 'zoho-books', name: 'Zoho Books', status: 'stub', category: 'accounting' },
      { id: 'xero', name: 'Xero', status: 'stub', category: 'accounting' },
      { id: 'quickbooks', name: 'QuickBooks', status: 'stub', category: 'accounting' },
      { id: 'sap', name: 'SAP', status: 'stub', category: 'erp' },
      { id: 'oracle', name: 'Oracle', status: 'stub', category: 'erp' },
      { id: 'dynamics', name: 'Microsoft Dynamics', status: 'stub', category: 'erp' },
      { id: 'whatsapp-bot', name: 'WhatsApp Ordering Bot', status: 'stub', category: 'messaging' },
      { id: 'powerbi', name: 'Power BI export views', status: 'stub', category: 'bi' },
      { id: 'tableau', name: 'Tableau', status: 'stub', category: 'bi' },
    ],
  });
});

expansionRouter.post(
  '/integrations/:id/webhook',
  authenticate,
  requireRoles(UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      await prisma.auditLog.create({
        data: {
          userId: req.user!.sub,
          action: 'INTEGRATION_WEBHOOK_STUB',
          entity: 'Integration',
          entityId: id,
          meta: { body: req.body ?? {} },
          ip: req.ip,
        },
      });
      res.json({ ok: true, integrationId: id, accepted: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Multi-branch / warehouse activation helpers ──────────────────────────────
expansionRouter.get('/branches', async (_req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({
      include: { warehouses: true },
    });
    res.json({ branches });
  } catch (err) {
    next(err);
  }
});

expansionRouter.get('/warehouses', async (_req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({ include: { branch: true } });
    res.json({ warehouses });
  } catch (err) {
    next(err);
  }
});

const branchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

expansionRouter.post(
  '/branches',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validate(branchSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof branchSchema>;
      const existing = await prisma.branch.findUnique({ where: { code: body.code } });
      if (existing) throw new AppError(409, 'Branch code exists', 'CONFLICT');
      const branch = await prisma.branch.create({ data: body });
      res.status(201).json({ branch });
    } catch (err) {
      next(err);
    }
  },
);

expansionRouter.patch(
  '/branches/:id',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validate(branchSchema.partial()),
  async (req, res, next) => {
    try {
      const existing = await prisma.branch.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
      if (req.body.code && req.body.code !== existing.code) {
        const taken = await prisma.branch.findUnique({ where: { code: req.body.code } });
        if (taken) throw new AppError(409, 'Branch code exists', 'CONFLICT');
      }
      const branch = await prisma.branch.update({
        where: { id: existing.id },
        data: req.body,
        include: { warehouses: true },
      });
      res.json({ branch });
    } catch (err) {
      next(err);
    }
  },
);