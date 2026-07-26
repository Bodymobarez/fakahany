import { Router } from 'express';
import { z } from 'zod';
import { CouponType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { deliverCampaignMessages } from '../../services/messaging.service';
import { deliverPushToUsers } from '../../services/push.service';

export const marketingAdminRouter = Router();

async function sendCampaignNow(campaignId: string) {
  const existing = await prisma.marketingCampaign.findUnique({ where: { id: campaignId } });
  if (!existing) throw new AppError(404, 'Campaign not found', 'NOT_FOUND');
  if (existing.status === 'SENT') throw new AppError(400, 'Already sent', 'ALREADY_SENT');

  const users = await prisma.user.findMany({
    where: {
      role: 'CUSTOMER',
      isActive: true,
      ...(existing.audience === 'MARKETING_OPT_IN' ? { marketingOptIn: true } : {}),
    },
    select: { id: true, email: true, phone: true },
  });

  let sentCount = users.length;
  let deliveryMeta: Record<string, unknown> | undefined;

  if (existing.channel === 'IN_APP') {
    if (users.length) {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          title: existing.title,
          body: existing.body,
          data: { channel: existing.channel, campaignId: existing.id },
        })),
      });
    }
  } else if (existing.channel === 'PUSH') {
    if (users.length) {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          title: existing.title,
          body: existing.body,
          data: { channel: 'PUSH', campaignId: existing.id },
        })),
      });
    }
    const push = await deliverPushToUsers({
      userIds: users.map((u) => u.id),
      title: existing.title,
      body: existing.body,
      data: { channel: 'PUSH', campaignId: existing.id },
      app: 'mobile',
    });
    sentCount = push.sent || users.length;
    deliveryMeta = { pushTokens: push.tokens, pushSent: push.sent, pushFailed: push.failed };
  } else if (existing.channel === 'EMAIL' || existing.channel === 'SMS') {
    const delivery = await deliverCampaignMessages({
      campaignId: existing.id,
      channel: existing.channel,
      title: existing.title,
      body: existing.body,
      users,
    });
    sentCount = delivery.sent;
    deliveryMeta = { skipped: delivery.skipped, modeSample: delivery.results.slice(0, 5) };

    // Mirror to in-app inbox so customers see the campaign in the app
    if (delivery.sent) {
      const deliveredIds = delivery.results.filter((r) => r.ok).map((r) => r.userId);
      if (deliveredIds.length) {
        await prisma.notification.createMany({
          data: deliveredIds.map((userId) => ({
            userId,
            title: existing.title,
            body: existing.body,
            data: { channel: existing.channel, campaignId: existing.id },
          })),
        });
      }
    }
  }

  const campaign = await prisma.marketingCampaign.update({
    where: { id: existing.id },
    data: { status: 'SENT', sentCount, sentAt: new Date() },
  });
  return { campaign, delivery: deliveryMeta };
}

marketingAdminRouter.get('/coupons', async (_req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ coupons });
  } catch (err) {
    next(err);
  }
});

const couponSchema = z.object({
  code: z.string().min(2).transform((c) => c.toUpperCase()),
  type: z.nativeEnum(CouponType),
  value: z.number().positive(),
  minOrder: z.number().nonnegative().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional(),
});

marketingAdminRouter.post('/coupons', validate(couponSchema), async (req, res, next) => {
  try {
    const coupon = await prisma.coupon.create({ data: req.body });
    res.status(201).json({ coupon });
  } catch (err) {
    next(err);
  }
});

const couponPatchSchema = couponSchema.partial();

marketingAdminRouter.patch('/coupons/:id', validate(couponPatchSchema), async (req, res, next) => {
  try {
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Coupon not found', 'NOT_FOUND');
    const coupon = await prisma.coupon.update({ where: { id: existing.id }, data: req.body });
    res.json({ coupon });
  } catch (err) {
    next(err);
  }
});

marketingAdminRouter.delete('/coupons/:id', async (req, res, next) => {
  try {
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Coupon not found', 'NOT_FOUND');
    await prisma.coupon.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

marketingAdminRouter.get('/banners', async (_req, res, next) => {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ banners });
  } catch (err) {
    next(err);
  }
});

const bannerSchema = z.object({
  titleEn: z.string(),
  titleAr: z.string(),
  imageUrl: z.string(),
  linkUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional(),
});

marketingAdminRouter.post('/banners', validate(bannerSchema), async (req, res, next) => {
  try {
    const banner = await prisma.banner.create({ data: req.body });
    res.status(201).json({ banner });
  } catch (err) {
    next(err);
  }
});

const bannerPatchSchema = bannerSchema.partial();

marketingAdminRouter.patch('/banners/:id', validate(bannerPatchSchema), async (req, res, next) => {
  try {
    const existing = await prisma.banner.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Banner not found', 'NOT_FOUND');
    const banner = await prisma.banner.update({ where: { id: existing.id }, data: req.body });
    res.json({ banner });
  } catch (err) {
    next(err);
  }
});

marketingAdminRouter.delete('/banners/:id', async (req, res, next) => {
  try {
    const existing = await prisma.banner.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Banner not found', 'NOT_FOUND');
    await prisma.banner.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
marketingAdminRouter.get('/flash-sales', async (_req, res, next) => {
  try {
    const sales = await prisma.flashSale.findMany({
      include: {
        items: { include: { product: { select: { id: true, nameEn: true, sku: true } } } },
      },
      orderBy: { startsAt: 'desc' },
    });
    res.json({ sales });
  } catch (err) {
    next(err);
  }
});

const flashSaleItemSchema = z.object({
  productId: z.string().min(1),
  salePrice: z.number().positive(),
  stockLimit: z.number().int().positive().optional().nullable(),
});

const flashSaleSchema = z.object({
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean().optional(),
  items: z.array(flashSaleItemSchema).optional().default([]),
});

const flashSalePatchSchema = z.object({
  nameEn: z.string().min(2).optional(),
  nameAr: z.string().min(2).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
  items: z.array(flashSaleItemSchema).optional(),
});

marketingAdminRouter.post('/flash-sales', validate(flashSaleSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof flashSaleSchema>;
    if (body.endsAt <= body.startsAt) {
      throw new AppError(400, 'endsAt must be after startsAt', 'VALIDATION_ERROR');
    }
    const sale = await prisma.flashSale.create({
      data: {
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        isActive: body.isActive ?? true,
        items: {
          create: (body.items || []).map((item) => ({
            productId: item.productId,
            salePrice: item.salePrice,
            stockLimit: item.stockLimit ?? null,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, nameEn: true, sku: true } } } },
      },
    });
    res.status(201).json({ sale });
  } catch (err) {
    next(err);
  }
});

marketingAdminRouter.patch(
  '/flash-sales/:id',
  validate(flashSalePatchSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.flashSale.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Flash sale not found', 'NOT_FOUND');
      const body = req.body as z.infer<typeof flashSalePatchSchema>;
      const startsAt = body.startsAt ?? existing.startsAt;
      const endsAt = body.endsAt ?? existing.endsAt;
      if (endsAt <= startsAt) {
        throw new AppError(400, 'endsAt must be after startsAt', 'VALIDATION_ERROR');
      }

      const sale = await prisma.$transaction(async (tx) => {
        if (body.items !== undefined) {
          await tx.flashSaleItem.deleteMany({ where: { flashSaleId: existing.id } });
        }
        return tx.flashSale.update({
          where: { id: existing.id },
          data: {
            nameEn: body.nameEn ?? undefined,
            nameAr: body.nameAr ?? undefined,
            startsAt: body.startsAt ?? undefined,
            endsAt: body.endsAt ?? undefined,
            isActive: body.isActive ?? undefined,
            ...(body.items !== undefined
              ? {
                  items: {
                    create: body.items.map((item) => ({
                      productId: item.productId,
                      salePrice: item.salePrice,
                      stockLimit: item.stockLimit ?? null,
                    })),
                  },
                }
              : {}),
          },
          include: {
            items: { include: { product: { select: { id: true, nameEn: true, sku: true } } } },
          },
        });
      });
      res.json({ sale });
    } catch (err) {
      next(err);
    }
  },
);

marketingAdminRouter.delete('/flash-sales/:id', async (req, res, next) => {
  try {
    const existing = await prisma.flashSale.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Flash sale not found', 'NOT_FOUND');
    await prisma.flashSale.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const campaignSchema = z.object({
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
  title: z.string().min(2),
  body: z.string().min(2),
  audience: z.enum(['ALL_CUSTOMERS', 'MARKETING_OPT_IN']).default('ALL_CUSTOMERS'),
  sendNow: z.boolean().optional(),
});

marketingAdminRouter.get('/campaigns', async (req, res, next) => {
  try {
    const channel = typeof req.query.channel === 'string' ? req.query.channel : undefined;
    const campaigns = await prisma.marketingCampaign.findMany({
      where: channel ? { channel } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
});

marketingAdminRouter.post('/campaigns', validate(campaignSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof campaignSchema>;
    let sentCount = 0;
    let status = 'DRAFT';
    let sentAt: Date | null = null;

    const campaign = await prisma.marketingCampaign.create({
      data: {
        channel: body.channel,
        title: body.title,
        body: body.body,
        audience: body.audience,
        status: 'DRAFT',
        sentCount: 0,
        sentAt: null,
      },
    });

    if (body.sendNow) {
      const delivered = await sendCampaignNow(campaign.id);
      res.status(201).json(delivered);
      return;
    }

    res.status(201).json({ campaign });
  } catch (err) {
    next(err);
  }
});

marketingAdminRouter.post('/campaigns/:id/send', async (req, res, next) => {
  try {
    const result = await sendCampaignNow(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const campaignUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  body: z.string().min(2).optional(),
  audience: z.enum(['ALL_CUSTOMERS', 'MARKETING_OPT_IN']).optional(),
});

marketingAdminRouter.patch(
  '/campaigns/:id',
  validate(campaignUpdateSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.marketingCampaign.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Campaign not found', 'NOT_FOUND');
      if (existing.status === 'SENT') {
        throw new AppError(400, 'Cannot edit a sent campaign', 'ALREADY_SENT');
      }
      const body = req.body as z.infer<typeof campaignUpdateSchema>;
      const campaign = await prisma.marketingCampaign.update({
        where: { id: existing.id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.body !== undefined ? { body: body.body } : {}),
          ...(body.audience !== undefined ? { audience: body.audience } : {}),
        },
      });
      res.json({ campaign });
    } catch (err) {
      next(err);
    }
  },
);

marketingAdminRouter.delete('/campaigns/:id', async (req, res, next) => {
  try {
    const existing = await prisma.marketingCampaign.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Campaign not found', 'NOT_FOUND');
    if (existing.status === 'SENT') {
      throw new AppError(400, 'Cannot delete a sent campaign', 'ALREADY_SENT');
    }
    await prisma.marketingCampaign.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
