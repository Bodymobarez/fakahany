import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { validate } from '../middleware/validate';
import { registerDevicePushToken } from '../services/push.service';

export const notificationsRouter = Router();

notificationsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post(
  '/push-token',
  authenticate,
  validate(
    z.object({
      token: z.string().min(10).max(512),
      platform: z.string().min(2).max(40).optional(),
      app: z.enum(['mobile', 'driver']).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as { token: string; platform?: string; app?: string };
      await registerDevicePushToken({
        userId: req.user!.sub,
        token: body.token,
        platform: body.platform,
        app: body.app || 'mobile',
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

notificationsRouter.delete(
  '/push-token',
  authenticate,
  validate(z.object({ token: z.string().min(10).max(512) })),
  async (req, res, next) => {
    try {
      const { token } = req.body as { token: string };
      await prisma.devicePushToken.deleteMany({
        where: { userId: req.user!.sub, token },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

notificationsRouter.post('/:id/read', authenticate, async (req, res, next) => {
  try {
    const n = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!n) throw new AppError(404, 'Notification not found', 'NOT_FOUND');
    const updated = await prisma.notification.update({
      where: { id: n.id },
      data: { isRead: true },
    });
    res.json({ notification: updated });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, isRead: false },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const n = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!n) throw new AppError(404, 'Notification not found', 'NOT_FOUND');
    await prisma.notification.delete({ where: { id: n.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.delete('/', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.user!.sub } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!notification) throw new AppError(404, 'Notification not found', 'NOT_FOUND');
    if (!notification.isRead) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { isRead: true },
      });
      notification.isRead = true;
    }
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});
