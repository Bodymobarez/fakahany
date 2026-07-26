import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';

export const deliveryAdminRouter = Router();

deliveryAdminRouter.get('/zones', async (_req, res, next) => {
  try {
    const zones = await prisma.deliveryZone.findMany({ orderBy: { name: 'asc' } });
    res.json({ zones });
  } catch (err) {
    next(err);
  }
});

const zoneSchema = z.object({
  name: z.string().min(1),
  emirate: z.string().min(1),
  polygon: z.unknown().optional(),
  baseFee: z.number().nonnegative().default(0),
  freeAbove: z.number().nonnegative().optional().nullable(),
  etaMinutes: z.number().int().positive().default(60),
  isActive: z.boolean().optional(),
});

deliveryAdminRouter.post('/zones', validate(zoneSchema), async (req, res, next) => {
  try {
    const zone = await prisma.deliveryZone.create({ data: req.body });
    res.status(201).json({ zone });
  } catch (err) {
    next(err);
  }
});

deliveryAdminRouter.patch('/zones/:id', validate(zoneSchema.partial()), async (req, res, next) => {
  try {
    const existing = await prisma.deliveryZone.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Zone not found', 'NOT_FOUND');
    const zone = await prisma.deliveryZone.update({
      where: { id: existing.id },
      data: req.body,
    });
    res.json({ zone });
  } catch (err) {
    next(err);
  }
});

deliveryAdminRouter.delete('/zones/:id', async (req, res, next) => {
  try {
    const existing = await prisma.deliveryZone.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Zone not found', 'NOT_FOUND');
    await prisma.deliveryZone.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

deliveryAdminRouter.get('/drivers', async (_req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: { user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } }, vehicles: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ drivers });
  } catch (err) {
    next(err);
  }
});

const driverCreateSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional().nullable(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  password: z.string().min(8).max(128).default('Driver123!'),
  licenseNo: z.string().max(40).optional().nullable(),
  plateNo: z.string().max(20).optional().nullable(),
  make: z.string().max(40).optional().nullable(),
  model: z.string().max(40).optional().nullable(),
});

deliveryAdminRouter.post('/drivers', validate(driverCreateSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof driverCreateSchema>;
    const email = body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new AppError(409, 'Email already registered', 'EMAIL_TAKEN');
    if (body.phone) {
      const phoneTaken = await prisma.user.findUnique({ where: { phone: body.phone } });
      if (phoneTaken) throw new AppError(409, 'Phone already registered', 'PHONE_TAKEN');
    }

    const user = await prisma.user.create({
      data: {
        email,
        phone: body.phone || null,
        firstName: body.firstName,
        lastName: body.lastName,
        passwordHash: await hashPassword(body.password),
        role: UserRole.DRIVER,
        isActive: true,
      },
    });

    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        licenseNo: body.licenseNo || null,
        isActive: true,
      },
    });

    if (body.plateNo?.trim()) {
      await prisma.vehicle.create({
        data: {
          driverId: driver.id,
          plateNo: body.plateNo.trim().toUpperCase(),
          make: body.make || null,
          model: body.model || null,
        },
      });
    }

    const full = await prisma.driver.findUnique({
      where: { id: driver.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        vehicles: true,
      },
    });
    res.status(201).json({ driver: full });
  } catch (err) {
    next(err);
  }
});

const driverPatchSchema = z.object({
  licenseNo: z.string().max(40).optional().nullable(),
  isActive: z.boolean().optional(),
  isOnline: z.boolean().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  plateNo: z.string().max(20).optional().nullable(),
  make: z.string().max(40).optional().nullable(),
  model: z.string().max(40).optional().nullable(),
});

deliveryAdminRouter.patch('/drivers/:id', validate(driverPatchSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof driverPatchSchema>;
    const existing = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: { vehicles: true },
    });
    if (!existing) throw new AppError(404, 'Driver not found', 'NOT_FOUND');

    const {
      firstName,
      lastName,
      phone,
      plateNo,
      make,
      model,
      licenseNo,
      isActive,
      isOnline,
    } = body;

    if (firstName || lastName || phone !== undefined) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: {
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      });
    }

    if (plateNo !== undefined) {
      const plate = plateNo?.trim() ? plateNo.trim().toUpperCase() : null;
      const current = existing.vehicles[0];
      if (plate) {
        if (current) {
          await prisma.vehicle.update({
            where: { id: current.id },
            data: {
              plateNo: plate,
              ...(make !== undefined ? { make } : {}),
              ...(model !== undefined ? { model } : {}),
            },
          });
        } else {
          await prisma.vehicle.create({
            data: {
              driverId: existing.id,
              plateNo: plate,
              make: make || null,
              model: model || null,
            },
          });
        }
      }
    } else if (make !== undefined || model !== undefined) {
      const current = existing.vehicles[0];
      if (current) {
        await prisma.vehicle.update({
          where: { id: current.id },
          data: {
            ...(make !== undefined ? { make } : {}),
            ...(model !== undefined ? { model } : {}),
          },
        });
      }
    }

    const driver = await prisma.driver.update({
      where: { id: existing.id },
      data: {
        ...(licenseNo !== undefined ? { licenseNo } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(isOnline !== undefined ? { isOnline } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        vehicles: true,
      },
    });
    res.json({ driver });
  } catch (err) {
    next(err);
  }
});
const vehicleSchema = z.object({
  driverId: z.string().min(1),
  plateNo: z.string().min(2).max(20),
  make: z.string().max(40).optional().nullable(),
  model: z.string().max(40).optional().nullable(),
  capacityKg: z.number().nonnegative().optional().nullable(),
});

deliveryAdminRouter.post('/vehicles', validate(vehicleSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof vehicleSchema>;
    const driver = await prisma.driver.findUnique({ where: { id: body.driverId } });
    if (!driver) throw new AppError(404, 'Driver not found', 'NOT_FOUND');
    const vehicle = await prisma.vehicle.create({
      data: {
        driverId: body.driverId,
        plateNo: body.plateNo.trim().toUpperCase(),
        make: body.make || null,
        model: body.model || null,
        capacityKg: body.capacityKg ?? null,
      },
    });
    res.status(201).json({ vehicle });
  } catch (err) {
    next(err);
  }
});

deliveryAdminRouter.get('/live', async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        assignments: {
          where: { deliveredAt: null },
          include: {
            order: { select: { id: true, orderNumber: true, status: true } },
          },
          take: 5,
        },
      },
    });

    const fleet = await Promise.all(
      drivers.map(async (d) => {
        const lastPoint = await prisma.trackingPoint.findFirst({
          where: { driverId: d.id },
          orderBy: { createdAt: 'desc' },
        });
        const online = Boolean(lastPoint && lastPoint.createdAt >= since);
        return {
          id: d.id,
          name: `${d.user.firstName} ${d.user.lastName}`.trim(),
          phone: d.user.phone,
          online,
          lastPoint: lastPoint
            ? {
                lat: lastPoint.lat,
                lng: lastPoint.lng,
                heading: lastPoint.heading,
                speed: lastPoint.speed,
                at: lastPoint.createdAt,
              }
            : null,
          activeOrders: d.assignments.map((a) => a.order),
        };
      }),
    );

    res.json({
      drivers: fleet,
      onlineCount: fleet.filter((d) => d.online).length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

const assignSchema = z.object({
  orderId: z.string(),
  driverId: z.string(),
  zoneId: z.string().optional().nullable(),
});

deliveryAdminRouter.post('/assign', validate(assignSchema), async (req, res, next) => {
  try {
    const { nextStopOrderForDriver } = await import('../../services/route.service');
    const { deliverPushToUsers } = await import('../../services/push.service');
    const { emitOrderUpdate } = await import('../../sockets');
    const body = req.body as z.infer<typeof assignSchema>;
    const order = await prisma.order.findUnique({ where: { id: body.orderId } });
    if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');

    const driver = await prisma.driver.findUnique({
      where: { id: body.driverId },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
      },
    });
    if (!driver || !driver.isActive) {
      throw new AppError(404, 'Driver not found', 'NOT_FOUND');
    }

    const previousDriverId = order.driverId;
    const driverChanged = previousDriverId !== body.driverId;

    await prisma.order.update({
      where: { id: order.id },
      data: { driverId: body.driverId },
    });

    const existing = await prisma.deliveryAssignment.findUnique({ where: { orderId: order.id } });
    const stopOrder =
      existing?.driverId === body.driverId && existing.stopOrder > 0
        ? existing.stopOrder
        : await nextStopOrderForDriver(body.driverId);

    const assignment = await prisma.deliveryAssignment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        driverId: body.driverId,
        zoneId: body.zoneId ?? null,
        stopOrder,
      },
      update: {
        driverId: body.driverId,
        zoneId: body.zoneId ?? null,
        stopOrder,
        assignedAt: new Date(),
      },
    });

    if (driverChanged) {
      const driverName =
        `${driver.user.firstName || ''} ${driver.user.lastName || ''}`.trim() || 'your driver';
      const driverPhone = driver.user.phone?.trim() || null;
      const title = 'Driver assigned';
      const notifBody = driverPhone
        ? `${driverName} will deliver order ${order.orderNumber}. Mobile: ${driverPhone}`
        : `${driverName} will deliver order ${order.orderNumber}.`;

      await prisma.notification.create({
        data: {
          userId: order.userId,
          title,
          body: notifBody,
          data: {
            type: 'DRIVER_ASSIGNED',
            orderId: order.id,
            orderNumber: order.orderNumber,
            driverId: driver.id,
            driverName,
            driverPhone,
            href: `/account/orders/${order.id}`,
          },
        },
      });

      try {
        await deliverPushToUsers({
          userIds: [order.userId],
          title,
          body: notifBody,
          data: {
            type: 'DRIVER_ASSIGNED',
            orderId: order.id,
            orderNumber: order.orderNumber,
            driverName,
            driverPhone,
          },
          app: 'customer',
        });
      } catch {
        /* push optional */
      }

      emitOrderUpdate(order.id, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        userId: order.userId,
        driverId: driver.id,
        driverName,
        driverPhone,
      });
    }

    res.json({
      assignment,
      driver: {
        id: driver.id,
        name: `${driver.user.firstName || ''} ${driver.user.lastName || ''}`.trim(),
        phone: driver.user.phone,
      },
    });
  } catch (err) {
    next(err);
  }
});

deliveryAdminRouter.get('/route-plan', async (_req, res, next) => {
  try {
    const openOrders = await prisma.order.findMany({
      where: {
        status: { in: ['ACCEPTED', 'PREPARING', 'PACKED', 'OUT_FOR_DELIVERY'] },
      },
      include: {
        address: true,
        assignment: { include: { driver: { include: { user: true } }, zone: true } },
        user: { select: { firstName: true, lastName: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const zones = await prisma.deliveryZone.findMany({ where: { isActive: true } });
    res.json({ orders: openOrders, drivers, zones });
  } catch (err) {
    next(err);
  }
});

deliveryAdminRouter.get('/routes/:driverId', async (req, res, next) => {
  try {
    const assignments = await prisma.deliveryAssignment.findMany({
      where: { driverId: req.params.driverId, deliveredAt: null },
      include: {
        order: {
          include: {
            address: true,
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
        zone: true,
      },
      orderBy: [{ stopOrder: 'asc' }, { assignedAt: 'asc' }],
    });
    res.json({ assignments });
  } catch (err) {
    next(err);
  }
});

deliveryAdminRouter.post(
  '/routes/:driverId/optimize',
  async (req, res, next) => {
    try {
      const { optimizeDriverRoute } = await import('../../services/route.service');
      const result = await optimizeDriverRoute(req.params.driverId);
      const assignments = await prisma.deliveryAssignment.findMany({
        where: { driverId: req.params.driverId, deliveredAt: null },
        include: { order: { include: { address: true } } },
        orderBy: { stopOrder: 'asc' },
      });
      res.json({ ok: true, ...result, assignments });
    } catch (err) {
      next(err);
    }
  },
);

deliveryAdminRouter.patch(
  '/routes/:driverId/reorder',
  validate(z.object({ assignmentIds: z.array(z.string()).min(1) })),
  async (req, res, next) => {
    try {
      const { reorderDriverStops } = await import('../../services/route.service');
      const { assignmentIds } = req.body as { assignmentIds: string[] };
      await reorderDriverStops(req.params.driverId, assignmentIds);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

const companySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  contact: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  isActive: z.boolean().optional(),
});

deliveryAdminRouter.get('/companies', async (_req, res, next) => {
  try {
    const companies = await prisma.deliveryCompany.findMany({ orderBy: { name: 'asc' } });
    res.json({ companies });
  } catch (err) {
    next(err);
  }
});

deliveryAdminRouter.post('/companies', validate(companySchema), async (req, res, next) => {
  try {
    const company = await prisma.deliveryCompany.create({ data: req.body });
    res.status(201).json({ company });
  } catch (err) {
    next(err);
  }
});

deliveryAdminRouter.patch(
  '/companies/:id',
  validate(companySchema.partial()),
  async (req, res, next) => {
    try {
      const existing = await prisma.deliveryCompany.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Company not found', 'NOT_FOUND');
      const company = await prisma.deliveryCompany.update({
        where: { id: existing.id },
        data: req.body,
      });
      res.json({ company });
    } catch (err) {
      next(err);
    }
  },
);
function payoutForShipping(shipping: number | string | null | undefined) {
  const fee = Number(shipping || 15);
  return Math.max(5, Math.round(fee * 0.6 * 100) / 100);
}

deliveryAdminRouter.get('/payouts', async (_req, res, next) => {
  try {
    const payouts = await prisma.driverPayout.findMany({
      include: {
        driver: {
          include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ payouts });
  } catch (err) {
    next(err);
  }
});

deliveryAdminRouter.get('/payouts/pending', async (_req, res, next) => {
  try {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        assignments: {
          where: { deliveredAt: { gte: startOfWeek } },
          include: { order: { select: { shipping: true } } },
        },
        payouts: {
          where: { periodFrom: { gte: startOfWeek } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const pending = drivers
      .map((d) => {
        const earned = d.assignments.reduce(
          (s, a) => s + payoutForShipping(a.order.shipping),
          0,
        );
        const alreadyPaid = d.payouts.reduce((s, p) => s + Number(p.amount), 0);
        const due = Math.round(Math.max(0, earned - alreadyPaid) * 100) / 100;
        return {
          driverId: d.id,
          name: `${d.user.firstName} ${d.user.lastName}`.trim(),
          email: d.user.email,
          phone: d.user.phone,
          deliveries: d.assignments.length,
          earned: Math.round(earned * 100) / 100,
          alreadyPaid: Math.round(alreadyPaid * 100) / 100,
          due,
          periodFrom: startOfWeek,
          periodTo: new Date(),
        };
      })
      .filter((row) => row.due > 0 || row.deliveries > 0);

    res.json({ pending, periodFrom: startOfWeek, periodTo: new Date() });
  } catch (err) {
    next(err);
  }
});

const settleSchema = z.object({
  driverId: z.string().min(1),
  amount: z.number().positive().optional(),
  note: z.string().max(300).optional().nullable(),
  periodFrom: z.coerce.date().optional(),
  periodTo: z.coerce.date().optional(),
});

deliveryAdminRouter.post('/payouts/settle', validate(settleSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof settleSchema>;
    const driver = await prisma.driver.findUnique({ where: { id: body.driverId } });
    if (!driver) throw new AppError(404, 'Driver not found', 'NOT_FOUND');

    const periodTo = body.periodTo || new Date();
    const periodFrom =
      body.periodFrom ||
      (() => {
        const d = new Date(periodTo);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return d;
      })();

    let amount = body.amount;
    if (amount == null) {
      const assignments = await prisma.deliveryAssignment.findMany({
        where: {
          driverId: driver.id,
          deliveredAt: { gte: periodFrom, lte: periodTo },
        },
        include: { order: { select: { shipping: true } } },
      });
      const earned = assignments.reduce((s, a) => s + payoutForShipping(a.order.shipping), 0);
      const paid = await prisma.driverPayout.aggregate({
        where: { driverId: driver.id, periodFrom: { gte: periodFrom }, periodTo: { lte: periodTo } },
        _sum: { amount: true },
      });
      amount = Math.max(0, earned - Number(paid._sum.amount || 0));
    }
    if (!amount || amount <= 0) {
      throw new AppError(400, 'Nothing to settle for this period', 'NOTHING_DUE');
    }

    const payout = await prisma.driverPayout.create({
      data: {
        driverId: driver.id,
        amount,
        periodFrom,
        periodTo,
        note: body.note || 'Weekly settlement',
        status: 'PAID',
      },
      include: {
        driver: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    });
    res.status(201).json({ payout });
  } catch (err) {
    next(err);
  }
});
