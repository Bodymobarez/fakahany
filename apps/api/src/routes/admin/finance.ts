import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { buildInvoicePdf } from '../../services/invoice.pdf';

export const financeAdminRouter = Router();

financeAdminRouter.get('/summary', async (_req, res, next) => {
  try {
    const [orderAgg, payments, refunds] = await Promise.all([
      prisma.order.aggregate({
        _sum: { total: true, tax: true, discount: true, shipping: true },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: true,
      }),
      prisma.order.count({ where: { status: 'REFUNDED' } }),
    ]);

    res.json({
      orders: {
        count: orderAgg._count,
        total: Number(orderAgg._sum.total || 0),
        tax: Number(orderAgg._sum.tax || 0),
        discount: Number(orderAgg._sum.discount || 0),
        shipping: Number(orderAgg._sum.shipping || 0),
      },
      payments,
      refunds,
    });
  } catch (err) {
    next(err);
  }
});

financeAdminRouter.get('/payments', async (_req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { order: { select: { orderNumber: true, userId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ payments });
  } catch (err) {
    next(err);
  }
});

financeAdminRouter.get('/vat-report', async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const settings = await prisma.companySettings.findFirst();
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { notIn: ['CANCELLED', 'FAILED_PAYMENT'] },
      },
      select: {
        orderNumber: true,
        invoiceNumber: true,
        subtotal: true,
        tax: true,
        total: true,
        createdAt: true,
        trnSnap: true,
      },
    });
    const taxable = orders.reduce((s, o) => s + Number(o.subtotal), 0);
    const vat = orders.reduce((s, o) => s + Number(o.tax), 0);
    res.json({
      company: {
        name: settings?.companyName,
        trn: settings?.trn,
        vatRate: settings ? Number(settings.vatRate) : 5,
      },
      period: { from, to },
      summary: { orderCount: orders.length, taxableAmount: taxable, vatAmount: vat, gross: taxable + vat },
      lines: orders,
      ftaNote: 'Electronic tax invoice fields prepared for FTA alignment; certification process is operational.',
    });
  } catch (err) {
    next(err);
  }
});

financeAdminRouter.get('/profit-loss', async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const agg = await prisma.order.aggregate({
      where: {
        createdAt: { gte: from, lte: to },
        status: { in: ['DELIVERED', 'OUT_FOR_DELIVERY', 'PACKED', 'PREPARING', 'ACCEPTED', 'PENDING'] },
      },
      _sum: { total: true, tax: true, discount: true, shipping: true, subtotal: true },
      _count: true,
    });
    const income = Number(agg._sum.total || 0);
    const expenseAgg = await prisma.expense.aggregate({
      where: { incurredAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    const expenses = Number(expenseAgg._sum.amount || 0);
    res.json({
      period: { from, to },
      income,
      expenses,
      netProfit: income - expenses,
      taxCollected: Number(agg._sum.tax || 0),
      orderCount: agg._count,
      cashFlow: { inflows: income, outflows: expenses, net: income - expenses },
    });
  } catch (err) {
    next(err);
  }
});

financeAdminRouter.get('/invoices', async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { invoiceNumber: { not: null } },
      select: {
        id: true,
        orderNumber: true,
        invoiceNumber: true,
        total: true,
        tax: true,
        status: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ invoices: orders });
  } catch (err) {
    next(err);
  }
});

financeAdminRouter.get('/invoices/:orderId/pdf', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        items: true,
        address: true,
        user: true,
        payments: true,
      },
    });
    if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
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

const expenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional().nullable(),
  incurredAt: z.coerce.date().optional(),
});

financeAdminRouter.get('/expenses', async (_req, res, next) => {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { incurredAt: 'desc' }, take: 200 });
    res.json({ expenses });
  } catch (err) {
    next(err);
  }
});

financeAdminRouter.post('/expenses', validate(expenseSchema), async (req, res, next) => {
  try {
    const expense = await prisma.expense.create({ data: req.body });
    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
});

financeAdminRouter.patch(
  '/expenses/:id',
  validate(expenseSchema.partial()),
  async (req, res, next) => {
    try {
      const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Expense not found', 'NOT_FOUND');
      const expense = await prisma.expense.update({
        where: { id: existing.id },
        data: req.body,
      });
      res.json({ expense });
    } catch (err) {
      next(err);
    }
  },
);

financeAdminRouter.delete('/expenses/:id', async (req, res, next) => {
  try {
    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Expense not found', 'NOT_FOUND');
    await prisma.expense.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
