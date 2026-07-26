import { Router } from 'express';
import { z } from 'zod';
import { PurchaseOrderStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { receiveStock } from '../../services/inventory.service';

export const suppliersAdminRouter = Router();

suppliersAdminRouter.get('/', async (_req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json({ suppliers });
  } catch (err) {
    next(err);
  }
});

const supplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  trn: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

suppliersAdminRouter.post('/', validate(supplierSchema), async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json({ supplier });
  } catch (err) {
    next(err);
  }
});

suppliersAdminRouter.patch('/:id', validate(supplierSchema.partial()), async (req, res, next) => {
  try {
    const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Supplier not found', 'NOT_FOUND');
    const supplier = await prisma.supplier.update({
      where: { id: existing.id },
      data: req.body,
    });
    res.json({ supplier });
  } catch (err) {
    next(err);
  }
});

suppliersAdminRouter.get('/purchase-orders', async (_req, res, next) => {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: { supplier: true, warehouse: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ purchaseOrders });
  } catch (err) {
    next(err);
  }
});

const poSchema = z.object({
  supplierId: z.string(),
  warehouseId: z.string(),
  expectedAt: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().optional().nullable(),
      sku: z.string(),
      name: z.string(),
      qtyOrdered: z.number().int().positive(),
      unitCost: z.number().nonnegative(),
    }),
  ),
});

suppliersAdminRouter.post('/purchase-orders', validate(poSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof poSchema>;
    const total = body.items.reduce((s, i) => s + i.qtyOrdered * i.unitCost, 0);
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${Date.now()}`,
        supplierId: body.supplierId,
        warehouseId: body.warehouseId,
        expectedAt: body.expectedAt ?? null,
        notes: body.notes ?? null,
        status: PurchaseOrderStatus.DRAFT,
        total,
        items: { create: body.items },
      },
      include: { items: true },
    });
    res.status(201).json({ purchaseOrder: po });
  } catch (err) {
    next(err);
  }
});

suppliersAdminRouter.patch('/purchase-orders/:id/status', async (req, res, next) => {
  try {
    const status = req.body?.status as PurchaseOrderStatus;
    if (!status) throw new AppError(400, 'status required', 'VALIDATION_ERROR');
    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ purchaseOrder });
  } catch (err) {
    next(err);
  }
});

const receiveSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        qty: z.number().int().positive(),
      }),
    )
    .optional(),
});

/** Receive remaining (or specified) PO lines into warehouse stock (FEFO batches). */
suppliersAdminRouter.post(
  '/purchase-orders/:id/receive',
  validate(receiveSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof receiveSchema>;
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!po) throw new AppError(404, 'Purchase order not found', 'NOT_FOUND');
      if (po.status === PurchaseOrderStatus.CANCELLED) {
        throw new AppError(400, 'Cannot receive a cancelled PO', 'PO_CANCELLED');
      }

      const received: Array<{ itemId: string; qty: number }> = [];

      // When items[] is provided, only those lines receive; otherwise receive all remaining.
      const selective = Boolean(body.items?.length);

      for (const line of po.items) {
        if (!line.productId) continue;
        const remaining = line.qtyOrdered - line.qtyReceived;
        if (remaining <= 0) continue;

        const override = body.items?.find((i) => i.itemId === line.id);
        if (selective && !override) continue;
        const qty = override ? Math.min(override.qty, remaining) : remaining;
        if (qty <= 0) continue;

        await receiveStock({
          warehouseId: po.warehouseId,
          productId: line.productId,
          qty,
          batchNumber: `${po.poNumber}-${line.sku}-${Date.now()}`,
          lotNumber: po.poNumber,
        });
        await prisma.purchaseOrderItem.update({
          where: { id: line.id },
          data: { qtyReceived: line.qtyReceived + qty },
        });
        received.push({ itemId: line.id, qty });
      }

      const refreshed = await prisma.purchaseOrder.findUnique({
        where: { id: po.id },
        include: { items: true, supplier: true, warehouse: true },
      });
      const allReceived = (refreshed?.items || []).every(
        (i) => i.qtyReceived >= i.qtyOrdered || !i.productId,
      );
      const anyReceived = (refreshed?.items || []).some((i) => i.qtyReceived > 0);
      const nextStatus = allReceived
        ? PurchaseOrderStatus.RECEIVED
        : anyReceived
          ? PurchaseOrderStatus.PARTIAL
          : po.status;

      const purchaseOrder = await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: nextStatus },
        include: { items: true, supplier: true, warehouse: true },
      });

      res.json({ purchaseOrder, received });
    } catch (err) {
      next(err);
    }
  },
);
