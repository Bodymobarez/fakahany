import { Router } from 'express';
import { z } from 'zod';
import { TicketStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error';

export const supportRouter = Router();

const ticketSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(5).max(5000),
  orderId: z.string().optional().nullable(),
});

const replySchema = z.object({
  body: z.string().min(1).max(5000),
});

supportRouter.get('/tickets', authenticate, async (req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      include: {
        replies: { orderBy: { createdAt: 'asc' }, take: 50 },
        _count: { select: { replies: true } },
      },
    });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

supportRouter.get('/tickets/:id', authenticate, async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw new AppError(404, 'Ticket not found', 'NOT_FOUND');
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/tickets', authenticate, validate(ticketSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof ticketSchema>;
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user!.sub,
        subject: body.subject,
        message: body.message,
        orderId: body.orderId ?? null,
      },
    });
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
});

supportRouter.post(
  '/tickets/:id/replies',
  authenticate,
  validate(replySchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof replySchema>;
      const ticket = await prisma.supportTicket.findFirst({
        where: { id: req.params.id, userId: req.user!.sub },
      });
      if (!ticket) throw new AppError(404, 'Ticket not found', 'NOT_FOUND');
      if (ticket.status === TicketStatus.CLOSED) {
        throw new AppError(400, 'Ticket is closed', 'TICKET_CLOSED');
      }

      const reply = await prisma.supportTicketReply.create({
        data: {
          ticketId: ticket.id,
          authorId: req.user!.sub,
          body: body.body,
          isStaff: false,
        },
      });
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.OPEN, updatedAt: new Date() },
      });
      res.status(201).json({ reply });
    } catch (err) {
      next(err);
    }
  },
);

/** Admin/staff inbox — mounted under /api/support/admin/* with role check */
supportRouter.get(
  '/admin/tickets',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (req, res, next) => {
    try {
      const status =
        typeof req.query.status === 'string' && req.query.status !== 'ALL'
          ? (req.query.status as TicketStatus)
          : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const tickets = await prisma.supportTicket.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(q
            ? {
                OR: [
                  { subject: { contains: q, mode: 'insensitive' } },
                  { message: { contains: q, mode: 'insensitive' } },
                  { user: { email: { contains: q, mode: 'insensitive' } } },
                  { user: { firstName: { contains: q, mode: 'insensitive' } } },
                  { user: { lastName: { contains: q, mode: 'insensitive' } } },
                  { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          order: { select: { id: true, orderNumber: true } },
          replies: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { replies: true } },
        },
      });
      res.json({ tickets });
    } catch (err) {
      next(err);
    }
  },
);

supportRouter.get(
  '/admin/tickets/:id',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  async (req, res, next) => {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: req.params.id },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          order: { select: { id: true, orderNumber: true } },
          replies: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!ticket) throw new AppError(404, 'Ticket not found', 'NOT_FOUND');
      res.json({ ticket });
    } catch (err) {
      next(err);
    }
  },
);

supportRouter.post(
  '/admin/tickets/:id/replies',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  validate(replySchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof replySchema>;
      const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
      if (!ticket) throw new AppError(404, 'Ticket not found', 'NOT_FOUND');

      const reply = await prisma.supportTicketReply.create({
        data: {
          ticketId: ticket.id,
          authorId: req.user!.sub,
          body: body.body,
          isStaff: true,
        },
      });
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.IN_PROGRESS },
      });
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          title: 'Support reply',
          body: `New reply on “${ticket.subject}”`,
          data: { ticketId: ticket.id },
        },
      });
      res.status(201).json({ reply });
    } catch (err) {
      next(err);
    }
  },
);

supportRouter.patch(
  '/admin/tickets/:id/status',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.STAFF),
  validate(z.object({ status: z.nativeEnum(TicketStatus) })),
  async (req, res, next) => {
    try {
      const { status } = req.body as { status: TicketStatus };
      const ticket = await prisma.supportTicket.update({
        where: { id: req.params.id },
        data: { status },
      });
      res.json({ ticket });
    } catch (err) {
      next(err);
    }
  },
);
