import { Router } from 'express';
import { z } from 'zod';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { emitOrderUpdate } from '../../sockets';
import { processOrderRefund } from '../../services/refund.service';
import { restockOrderItems } from '../../services/inventory.service';

export const ordersAdminRouter = Router();

ordersAdminRouter.get('/', async (req, res, next) => {
  try {
    const status =
      typeof req.query.status === 'string' && req.query.status !== 'ALL'
        ? (req.query.status as OrderStatus)
        : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const orders = await prisma.order.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { orderNumber: { contains: q, mode: 'insensitive' } },
                { invoiceNumber: { contains: q, mode: 'insensitive' } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { user: { phone: { contains: q } } },
                { user: { firstName: { contains: q, mode: 'insensitive' } } },
                { user: { lastName: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        items: true,
        address: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

ordersAdminRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
        address: true,
        user: true,
        assignment: {
          include: {
            driver: { include: { user: true } },
            zone: true,
          },
        },
      },
    });
    if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
});

ordersAdminRouter.post(
  '/:id/refund',
  validate(z.object({ note: z.string().max(300).optional().nullable() })),
  async (req, res, next) => {
    try {
      const body = req.body as { note?: string | null };
      const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Order not found', 'NOT_FOUND');
      if (existing.status === OrderStatus.REFUNDED) {
        throw new AppError(400, 'Order already refunded', 'ALREADY_REFUNDED');
      }

      const result = await processOrderRefund(existing.id, {
        note: body.note || 'Refund processed in admin',
        createdBy: req.user!.sub,
      });
      const order = await prisma.order.findUnique({ where: { id: existing.id } });
      emitOrderUpdate(existing.id, {
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        status: OrderStatus.REFUNDED,
        userId: existing.userId,
      });
      res.json({ order, refund: result });
    } catch (err) {
      next(err);
    }
  },
);

ordersAdminRouter.patch('/:id/status', validate(statusSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof statusSchema>;

    if (body.status === OrderStatus.REFUNDED) {
      const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Order not found', 'NOT_FOUND');
      const result = await processOrderRefund(existing.id, {
        note: body.note || 'Refund processed in admin',
        createdBy: req.user!.sub,
      });
      const order = await prisma.order.findUnique({ where: { id: existing.id } });
      emitOrderUpdate(existing.id, {
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        status: OrderStatus.REFUNDED,
        userId: existing.userId,
      });
      res.json({ order, refund: result });
      return;
    }

    const previous = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!previous) throw new AppError(404, 'Order not found', 'NOT_FOUND');

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: body.status },
    });
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: body.status,
        note: body.note,
        createdBy: req.user!.sub,
      },
    });
    let restock: { restocked: number } | null = null;
    if (body.status === OrderStatus.RETURNED && previous.status !== OrderStatus.RETURNED) {
      restock = await restockOrderItems(order.id, {
        note: body.note || 'Return restock',
        createdBy: req.user!.sub,
      });
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: 'Return received',
          body: `Your return for order ${order.orderNumber} was marked received.`,
          data: { orderId: order.id },
        },
      });
    } else if (previous.status !== body.status) {
      const label = body.status.replaceAll('_', ' ').toLowerCase();
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: 'Order status updated',
          body: `Order ${order.orderNumber} is now ${label}.`,
          data: { orderId: order.id, status: order.status },
        },
      });
    }
    emitOrderUpdate(order.id, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      userId: order.userId,
    });
    res.json({ order, restock });
  } catch (err) {
    next(err);
  }
});
