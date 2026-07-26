import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { requireRoles } from '../../middleware/auth';

export const settingsAdminRouter = Router();

settingsAdminRouter.get('/', async (_req, res, next) => {
  try {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          companyName: process.env.COMPANY_NAME || 'Fresh Harvest UAE',
          trn: process.env.COMPANY_TRN || '100000000000003',
          vatRate: Number(process.env.VAT_RATE || 5),
          currency: process.env.CURRENCY || 'AED',
          timezone: process.env.TZ || 'Asia/Dubai',
          address: 'Dubai, UAE',
        },
      });
    }
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

const settingsSchema = z.object({
  companyName: z.string().min(1),
  trn: z.string().min(1),
  vatRate: z.number().min(0).max(100),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  address: z.string().min(1),
  logoUrl: z.string().optional().nullable(),
  paymentGateways: z
    .object({
      cod: z.boolean().optional(),
      stripe: z.boolean().optional(),
      stripePublishableKey: z.string().optional().nullable(),
      tabby: z.boolean().optional(),
      tamara: z.boolean().optional(),
      applePay: z.boolean().optional(),
      googlePay: z.boolean().optional(),
    })
    .optional()
    .nullable(),
  integrations: z
    .object({
      emailProvider: z.string().optional().nullable(),
      emailFrom: z.string().optional().nullable(),
      emailWebhookUrl: z.string().url().optional().nullable().or(z.literal('')),
      smsProvider: z.string().optional().nullable(),
      smsSenderId: z.string().optional().nullable(),
      smsWebhookUrl: z.string().url().optional().nullable().or(z.literal('')),
      whatsappNumber: z.string().optional().nullable(),
      whatsappEnabled: z.boolean().optional(),
      mobileMinVersion: z.string().optional().nullable(),
      apiPublicDocs: z.boolean().optional(),
    })
    .optional()
    .nullable(),
});

settingsAdminRouter.put('/', requireRoles('ADMIN'), validate(settingsSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof settingsSchema>;
    if (body.integrations) {
      const i = body.integrations as Record<string, unknown>;
      for (const key of ['emailWebhookUrl', 'smsWebhookUrl'] as const) {
        if (i[key] === '') i[key] = null;
      }
    }
    const existing = await prisma.companySettings.findFirst();
    const settings = existing
      ? await prisma.companySettings.update({ where: { id: existing.id }, data: body })
      : await prisma.companySettings.create({ data: body });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

settingsAdminRouter.get('/audit', requireRoles('ADMIN'), async (_req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});
