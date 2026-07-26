import { Router } from 'express';
import { z } from 'zod';
import { DeliveryType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';
import { quoteDelivery } from '../services/delivery-zone.service';

export const deliveryRouter = Router();

deliveryRouter.get('/zones', async (_req, res, next) => {
  try {
    const zones = await prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        emirate: true,
        baseFee: true,
        freeAbove: true,
        etaMinutes: true,
        polygon: true,
      },
    });
    res.json({ zones });
  } catch (err) {
    next(err);
  }
});

const quoteSchema = z.object({
  emirate: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  addressId: z.string().optional().nullable(),
  subtotal: z.number().nonnegative().optional().default(0),
  deliveryType: z.nativeEnum(DeliveryType).optional().default(DeliveryType.SAME_DAY),
});

deliveryRouter.post('/quote', optionalAuth, validate(quoteSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof quoteSchema>;
    let emirate = body.emirate ?? null;
    let lat = body.lat ?? null;
    let lng = body.lng ?? null;

    if (body.addressId) {
      if (!req.user?.sub) throw new AppError(401, 'Sign in to quote a saved address', 'UNAUTHORIZED');
      const address = await prisma.address.findFirst({
        where: { id: body.addressId, userId: req.user.sub },
      });
      if (!address) throw new AppError(404, 'Address not found', 'NOT_FOUND');
      emirate = address.emirate;
      lat = address.lat;
      lng = address.lng;
    }

    const quote = await quoteDelivery({
      emirate,
      lat,
      lng,
      subtotal: body.subtotal,
      deliveryType: body.deliveryType,
    });
    res.json({ quote });
  } catch (err) {
    next(err);
  }
});

deliveryRouter.get('/track/:orderId', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, userId: req.user!.sub },
      include: {
        assignment: { include: { driver: { include: { user: true } }, zone: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');

    let lastPoint = null;
    if (order.driverId) {
      lastPoint = await prisma.trackingPoint.findFirst({
        where: { driverId: order.driverId },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({
      orderId: order.id,
      status: order.status,
      assignment: order.assignment,
      statusHistory: order.statusHistory,
      lastPoint,
    });
  } catch (err) {
    next(err);
  }
});
