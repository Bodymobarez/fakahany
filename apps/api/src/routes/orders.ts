import { Router } from 'express';
import { z } from 'zod';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';
import { getOrderForUser, listOrdersForUser } from '../services/order.service';
import { buildInvoicePdf } from '../services/invoice.pdf';
import { emitOrderUpdate } from '../sockets';

export const ordersRouter = Router();

const CANCELABLE: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING];
const RETURNABLE: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.PACKED];

ordersRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const orders = await listOrdersForUser(req.user!.sub);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await getOrderForUser(req.params.id, req.user!.sub);
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/:id/invoice', authenticate, async (req, res, next) => {
  try {
    const order = await getOrderForUser(req.params.id, req.user!.sub);
    const company = await prisma.companySettings.findFirst();
    const pdf = await buildInvoicePdf(order, company);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${order.invoiceNumber || order.orderNumber}.pdf"`,
    );
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

const cancelSchema = z.object({
  reason: z.string().max(300).optional().nullable(),
});

ordersRouter.post('/:id/cancel', authenticate, validate(cancelSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof cancelSchema>;
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
      include: { payments: true },
    });
    if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
    if (!CANCELABLE.includes(order.status)) {
      throw new AppError(400, 'Order can no longer be cancelled', 'NOT_CANCELABLE');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus:
            order.paymentStatus === PaymentStatus.CAPTURED
              ? PaymentStatus.REFUNDED
              : order.paymentStatus,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CANCELLED,
          note: body.reason || 'Cancelled by customer',
          createdBy: req.user!.sub,
        },
      });

      // Reverse captured wallet + Stripe payments (keep order CANCELLED)
      for (const pay of order.payments) {
        if (pay.status !== PaymentStatus.CAPTURED) continue;

        if (pay.provider === PaymentMethod.WALLET) {
          const wallet =
            (await tx.wallet.findUnique({ where: { userId: order.userId } })) ||
            (await tx.wallet.create({ data: { userId: order.userId } }));
          const balanceAfter =
            Math.round((Number(wallet.balance) + Number(pay.amount)) * 100) / 100;
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: new Prisma.Decimal(balanceAfter) },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'CREDIT',
              amount: Number(pay.amount),
              balanceAfter,
              reference: order.orderNumber,
              note: 'Refund on cancel',
            },
          });
        }

        if (pay.provider === PaymentMethod.STRIPE && pay.externalId) {
          try {
            const { getPaymentProvider } = await import('../services/payments');
            const provider = getPaymentProvider(PaymentMethod.STRIPE);
            if (provider.refund) {
              await provider.refund(pay.externalId, Number(pay.amount));
            }
          } catch {
            // Keep cancel flow; admin can retry via refunds screen
          }
        }

        await tx.payment.update({
          where: { id: pay.id },
          data: { status: PaymentStatus.REFUNDED },
        });
      }

      await tx.notification.create({
        data: {
          userId: order.userId,
          title: 'Order cancelled',
          body: `Order ${order.orderNumber} was cancelled.`,
          data: { orderId: order.id, orderNumber: order.orderNumber },
        },
      });

      return next;
    });

    emitOrderUpdate(updated.id, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      userId: updated.userId,
    });
    res.json({ order: updated });
  } catch (err) {
    next(err);
  }
});

const returnSchema = z.object({
  reason: z.string().min(3).max(500),
});

ordersRouter.post('/:id/return', authenticate, validate(returnSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof returnSchema>;
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
    if (!RETURNABLE.includes(order.status)) {
      throw new AppError(400, 'Order is not eligible for return', 'NOT_RETURNABLE');
    }
    if (order.status === OrderStatus.RETURNED) {
      throw new AppError(400, 'Return already recorded', 'ALREADY_RETURNED');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.RETURNED },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.RETURNED,
          note: `Return requested: ${body.reason}`,
          createdBy: req.user!.sub,
        },
      });
      await tx.notification.create({
        data: {
          userId: order.userId,
          title: 'Return requested',
          body: `Return request for ${order.orderNumber} is with our team.`,
          data: { orderId: order.id, orderNumber: order.orderNumber },
        },
      });
      return next;
    });

    emitOrderUpdate(updated.id, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      userId: updated.userId,
    });
    res.json({ order: updated });
  } catch (err) {
    next(err);
  }
});
