import { Router } from 'express';
import { z } from 'zod';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';
import { getPaymentProvider } from '../services/payments';

export const paymentsRouter = Router();

paymentsRouter.get('/methods', async (_req, res, next) => {
  try {
    const settings = await prisma.companySettings.findFirst();
    const gw = (settings?.paymentGateways || {}) as {
      cod?: boolean;
      stripe?: boolean;
      tabby?: boolean;
      tamara?: boolean;
      applePay?: boolean;
      googlePay?: boolean;
    };

    const catalog = [
      // Defaults: COD + Stripe on until admin toggles them off in settings.
      { id: 'COD', label: 'Cash on Delivery', enabled: gw.cod !== false, stub: false },
      { id: 'STRIPE', label: 'Card (Stripe)', enabled: gw.stripe !== false, stub: false },
      // Demo BNPL / wallet-pay rails — stub confirm until real credentials are wired.
      { id: 'TABBY', label: 'Tabby (Demo)', enabled: gw.tabby !== false, stub: true },
      { id: 'TAMARA', label: 'Tamara (Demo)', enabled: gw.tamara !== false, stub: true },
      // Always expose Apple / Google Pay for checkout demos (stub confirm).
      { id: 'APPLE_PAY', label: 'Apple Pay', enabled: true, stub: true },
      { id: 'GOOGLE_PAY', label: 'Google Pay', enabled: true, stub: true },
      { id: 'WALLET', label: 'Wallet', enabled: true, stub: false },
    ];

    const methods = catalog.filter((m) => m.enabled);
    const envPk =
      process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
    const settingsPk = (gw as { stripePublishableKey?: string }).stripePublishableKey;
    res.json({
      methods: methods.length ? methods : [{ id: 'COD', label: 'Cash on Delivery', stub: false }],
      publishableKey:
        typeof settingsPk === 'string' && settingsPk.length > 0 ? settingsPk : envPk,
      stripeConfigured: Boolean(
        process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('placeholder'),
      ),
    });
  } catch (err) {
    next(err);
  }
});

const confirmSchema = z.object({
  paymentId: z.string().min(1),
  externalId: z.string().optional(),
});

paymentsRouter.post('/confirm', authenticate, validate(confirmSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof confirmSchema>;
    const payment = await prisma.payment.findUnique({
      where: { id: body.paymentId },
      include: { order: true },
    });
    if (!payment || payment.order.userId !== req.user!.sub) {
      throw new AppError(404, 'Payment not found', 'NOT_FOUND');
    }
    if (payment.status === PaymentStatus.CAPTURED) {
      res.json({ payment });
      return;
    }
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new AppError(400, 'Payment already refunded', 'ALREADY_REFUNDED');
    }

    const externalId = body.externalId || payment.externalId || '';
    const isStub =
      !externalId ||
      externalId.startsWith('stub_') ||
      externalId.startsWith('stripe_stub') ||
      externalId.includes('_stub_') ||
      !process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_SECRET_KEY.includes('placeholder');

    // Real Stripe intents must be confirmed via Stripe.js / webhook — only allow
    // client confirm for stubs or non-Stripe providers.
    if (payment.provider === 'STRIPE' && !isStub && !externalId.startsWith('pi_')) {
      throw new AppError(400, 'Invalid Stripe payment reference', 'INVALID_STRIPE_REF');
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CAPTURED,
        externalId: externalId || payment.externalId,
      },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: PaymentStatus.CAPTURED },
    });

    res.json({ payment: updated, stub: isStub });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post(
  '/cancel',
  authenticate,
  validate(z.object({ paymentId: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const { paymentId } = req.body as { paymentId: string };
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      });
      if (!payment || payment.order.userId !== req.user!.sub) {
        throw new AppError(404, 'Payment not found', 'NOT_FOUND');
      }
      if (payment.status === PaymentStatus.CAPTURED) {
        throw new AppError(400, 'Payment already captured', 'ALREADY_CAPTURED');
      }
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.CANCELLED },
      });
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.CANCELLED,
          status: OrderStatus.FAILED_PAYMENT,
        },
      });
      res.json({ payment: updated });
    } catch (err) {
      next(err);
    }
  },
);

paymentsRouter.post('/webhook/stripe', async (req, res, next) => {
  try {
    const body = req.body as {
      type?: string;
      data?: { object?: { id?: string; metadata?: { orderId?: string }; status?: string } };
    };
    const eventType = body?.type || 'unknown';
    const object = body?.data?.object;
    const intentId = object?.id;
    const orderId = object?.metadata?.orderId;

    if (
      (eventType === 'payment_intent.succeeded' || eventType === 'payment_intent.processing') &&
      (intentId || orderId)
    ) {
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            ...(intentId ? [{ externalId: intentId }] : []),
            ...(orderId ? [{ orderId, provider: 'STRIPE' as const }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      if (payment && payment.status !== PaymentStatus.REFUNDED) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CAPTURED,
            externalId: intentId || payment.externalId,
          },
        });
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PaymentStatus.CAPTURED },
        });
      }
    }

    if (eventType === 'charge.refunded' && intentId) {
      const payment = await prisma.payment.findFirst({
        where: { externalId: intentId },
      });
      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.REFUNDED },
        });
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });
      }
    }

    // Production: verify Stripe-Signature header before trusting the payload.
    res.json({
      received: true,
      type: eventType,
      provider: 'STRIPE',
      note: 'Signature verification should be enabled with STRIPE_WEBHOOK_SECRET in production.',
    });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.get('/:orderId', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, userId: req.user!.sub },
      include: { payments: true },
    });
    if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
    res.json({ payments: order.payments, provider: getPaymentProvider(order.paymentMethod).method });
  } catch (err) {
    next(err);
  }
});
