import { Router } from 'express';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';

export const driverRouter = Router();

driverRouter.use(authenticate, requireRoles('DRIVER', 'ADMIN'));

async function getDriverForUser(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new AppError(404, 'Driver profile not found', 'DRIVER_NOT_FOUND');
  return driver;
}

driverRouter.get('/me', async (req, res, next) => {
  try {
    const driver = await getDriverForUser(req.user!.sub);
    res.json({ driver });
  } catch (err) {
    next(err);
  }
});

driverRouter.patch(
  '/me/online',
  validate(z.object({ isOnline: z.boolean() })),
  async (req, res, next) => {
    try {
      const driver = await getDriverForUser(req.user!.sub);
      const { isOnline } = req.body as { isOnline: boolean };
      const updated = await prisma.driver.update({
        where: { id: driver.id },
        data: { isOnline },
      });
      const { getIO } = await import('../sockets');
      getIO()?.to('admin').emit('driver:status', {
        driverId: updated.id,
        isOnline: updated.isOnline,
        at: new Date().toISOString(),
      });
      res.json({ driver: updated });
    } catch (err) {
      next(err);
    }
  },
);

driverRouter.get('/assignments', async (req, res, next) => {
  try {
    const driver = await getDriverForUser(req.user!.sub);
    const assignments = await prisma.deliveryAssignment.findMany({
      where: { driverId: driver.id, deliveredAt: null },
      include: {
        order: { include: { address: true, items: true } },
        zone: true,
      },
      orderBy: [{ stopOrder: 'asc' }, { assignedAt: 'asc' }],
    });
    res.json({ assignments });
  } catch (err) {
    next(err);
  }
});

driverRouter.get('/history', async (req, res, next) => {
  try {
    const driver = await getDriverForUser(req.user!.sub);
    const assignments = await prisma.deliveryAssignment.findMany({
      where: { driverId: driver.id, deliveredAt: { not: null } },
      include: {
        order: { select: { id: true, orderNumber: true, total: true, status: true } },
        zone: true,
      },
      orderBy: { deliveredAt: 'desc' },
      take: 50,
    });
    res.json({ assignments });
  } catch (err) {
    next(err);
  }
});

driverRouter.get('/earnings', async (req, res, next) => {
  try {
    const driver = await getDriverForUser(req.user!.sub);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // Monday
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

    const delivered = await prisma.deliveryAssignment.findMany({
      where: { driverId: driver.id, deliveredAt: { not: null } },
      include: {
        order: { select: { id: true, orderNumber: true, total: true, shipping: true } },
      },
      orderBy: { deliveredAt: 'desc' },
      take: 300,
    });

    // Payout rule: 60% of shipping fee (min 5 AED) per completed drop
    const payoutFor = (shipping: number | string | null | undefined) => {
      const fee = Number(shipping || 15);
      return Math.max(5, Math.round(fee * 0.6 * 100) / 100);
    };
    const sum = (rows: typeof delivered) =>
      Math.round(rows.reduce((s, a) => s + payoutFor(a.order.shipping), 0) * 100) / 100;

    const todayRows = delivered.filter((a) => a.deliveredAt && a.deliveredAt >= startOfDay);
    const weekRows = delivered.filter((a) => a.deliveredAt && a.deliveredAt >= startOfWeek);
    const monthRows = delivered.filter((a) => a.deliveredAt && a.deliveredAt >= startOfMonth);

    const ledger = delivered.slice(0, 20).map((a) => ({
      assignmentId: a.id,
      orderId: a.order.id,
      orderNumber: a.order.orderNumber,
      deliveredAt: a.deliveredAt,
      shipping: Number(a.order.shipping || 15),
      payout: payoutFor(a.order.shipping),
    }));

    res.json({
      rule: '60% of delivery fee per drop (minimum 5 AED)',
      today: sum(todayRows),
      week: sum(weekRows),
      month: sum(monthRows),
      allTime: sum(delivered),
      deliveriesToday: todayRows.length,
      deliveriesWeek: weekRows.length,
      deliveriesMonth: monthRows.length,
      deliveriesTotal: delivered.length,
      ledger,
    });
  } catch (err) {
    next(err);
  }
});

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  speed: z.number().optional(),
});

driverRouter.post('/location', validate(locationSchema), async (req, res, next) => {
  try {
    const driver = await getDriverForUser(req.user!.sub);
    const body = req.body as z.infer<typeof locationSchema>;
    const point = await prisma.trackingPoint.create({
      data: { driverId: driver.id, ...body },
    });
    // Only force online when driver already opted in for duty
    if (driver.isOnline) {
      await prisma.driver.update({ where: { id: driver.id }, data: { isOnline: true } });
    }
    const { getIO } = await import('../sockets');
    const io = getIO();
    const at = new Date().toISOString();
    io?.to('admin').emit('driver:location', {
      driverId: driver.id,
      lat: body.lat,
      lng: body.lng,
      speed: body.speed,
      at,
    });
    const active = await prisma.deliveryAssignment.findMany({
      where: { driverId: driver.id, deliveredAt: null },
      select: { orderId: true },
    });
    for (const a of active) {
      io?.to(`order:${a.orderId}`).emit('tracking:update', {
        orderId: a.orderId,
        driverId: driver.id,
        lat: body.lat,
        lng: body.lng,
        speed: body.speed,
        at,
      });
    }
    res.status(201).json({ point });
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({
  status: z.enum(['OUT_FOR_DELIVERY', 'DELIVERED']),
  otp: z.string().optional(),
  podPhotoUrl: z.string().max(500).optional().nullable(),
  podSignatureUrl: z.string().max(500).optional().nullable(),
  podRecipientName: z.string().max(120).optional().nullable(),
});

driverRouter.post('/orders/:orderId/status', validate(statusSchema), async (req, res, next) => {
  try {
    const driver = await getDriverForUser(req.user!.sub);
    const body = req.body as z.infer<typeof statusSchema>;
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, driverId: driver.id },
    });
    if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');

    if (body.status === 'DELIVERED') {
      if (order.deliveryOtp && body.otp !== order.deliveryOtp) {
        throw new AppError(400, 'Invalid delivery OTP', 'INVALID_OTP');
      }
      if (!body.podPhotoUrl && !body.podSignatureUrl && !body.podRecipientName) {
        throw new AppError(
          400,
          'Proof of delivery required (photo, signature, or recipient name)',
          'POD_REQUIRED',
        );
      }
    }

    const status = body.status as OrderStatus;
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status,
        ...(body.status === 'DELIVERED'
          ? {
              podPhotoUrl: body.podPhotoUrl || undefined,
              podSignatureUrl: body.podSignatureUrl || undefined,
              podRecipientName: body.podRecipientName || undefined,
            }
          : {}),
      },
    });
    await prisma.orderStatusHistory.create({
      data: { orderId: order.id, status, createdBy: req.user!.sub },
    });

    if (status === OrderStatus.DELIVERED) {
      await prisma.deliveryAssignment.updateMany({
        where: { orderId: order.id },
        data: { deliveredAt: new Date() },
      });
    }

    const { emitOrderUpdate } = await import('../sockets');
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
