import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import {
  adjustStock,
  receiveStock,
  transferStock,
} from '../../services/inventory.service';

export const inventoryAdminRouter = Router();

const warehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  branchId: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

inventoryAdminRouter.get('/warehouses', async (_req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { branch: true },
      orderBy: { name: 'asc' },
    });
    res.json({ warehouses });
  } catch (err) {
    next(err);
  }
});

inventoryAdminRouter.post('/warehouses', validate(warehouseSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof warehouseSchema>;
    const code = body.code.trim().toUpperCase();
    const taken = await prisma.warehouse.findUnique({ where: { code } });
    if (taken) throw new AppError(409, 'Warehouse code exists', 'CONFLICT');
    if (body.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: body.branchId } });
      if (!branch) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
    }
    const warehouse = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.warehouse.updateMany({ data: { isDefault: false } });
      }
      return tx.warehouse.create({
        data: {
          name: body.name.trim(),
          code,
          branchId: body.branchId ?? null,
          isDefault: body.isDefault ?? false,
        },
        include: { branch: true },
      });
    });
    res.status(201).json({ warehouse });
  } catch (err) {
    next(err);
  }
});

inventoryAdminRouter.patch(
  '/warehouses/:id',
  validate(warehouseSchema.partial()),
  async (req, res, next) => {
    try {
      const existing = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Warehouse not found', 'NOT_FOUND');
      const body = req.body as z.infer<typeof warehouseSchema>;
      if (body.code && body.code.trim().toUpperCase() !== existing.code) {
        const taken = await prisma.warehouse.findUnique({
          where: { code: body.code.trim().toUpperCase() },
        });
        if (taken) throw new AppError(409, 'Warehouse code exists', 'CONFLICT');
      }
      if (body.branchId) {
        const branch = await prisma.branch.findUnique({ where: { id: body.branchId } });
        if (!branch) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
      }
      const warehouse = await prisma.$transaction(async (tx) => {
        if (body.isDefault === true) {
          await tx.warehouse.updateMany({
            where: { id: { not: existing.id } },
            data: { isDefault: false },
          });
        }
        return tx.warehouse.update({
          where: { id: existing.id },
          data: {
            ...(body.name !== undefined ? { name: body.name.trim() } : {}),
            ...(body.code !== undefined ? { code: body.code.trim().toUpperCase() } : {}),
            ...(body.branchId !== undefined ? { branchId: body.branchId } : {}),
            ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
          },
          include: { branch: true },
        });
      });
      res.json({ warehouse });
    } catch (err) {
      next(err);
    }
  },
);

inventoryAdminRouter.get('/levels', async (req, res, next) => {
  try {
    const warehouseId = typeof req.query.warehouseId === 'string' ? req.query.warehouseId : undefined;
    const levels = await prisma.stockLevel.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: { product: true, productVariant: true, warehouse: true },
      take: 500,
    });
    res.json({ levels });
  } catch (err) {
    next(err);
  }
});

const reorderSchema = z.object({
  reorderLevel: z.number().int().nonnegative(),
});

inventoryAdminRouter.patch(
  '/levels/:id',
  validate(reorderSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.stockLevel.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Stock level not found', 'NOT_FOUND');
      const level = await prisma.stockLevel.update({
        where: { id: existing.id },
        data: { reorderLevel: Number(req.body.reorderLevel) },
        include: { product: true, productVariant: true, warehouse: true },
      });
      res.json({ level });
    } catch (err) {
      next(err);
    }
  },
);
inventoryAdminRouter.get('/batches', async (req, res, next) => {
  try {
    const expiringSoon = req.query.expiringSoon === 'true';
    const inDays = Number(req.query.days || 14);
    const where = expiringSoon
      ? {
          expiryDate: {
            lte: new Date(Date.now() + inDays * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
          qty: { gt: 0 },
        }
      : undefined;
    const batches = await prisma.stockBatch.findMany({
      where,
      include: { product: true, warehouse: true },
      orderBy: { expiryDate: 'asc' },
      take: 200,
    });
    res.json({ batches });
  } catch (err) {
    next(err);
  }
});

const receiveSchema = z.object({
  warehouseId: z.string(),
  productId: z.string(),
  variantId: z.string().optional().nullable(),
  qty: z.number().int().positive(),
  batchNumber: z.string().min(1),
  lotNumber: z.string().optional(),
  expiryDate: z.coerce.date().optional().nullable(),
});

inventoryAdminRouter.post('/receive', validate(receiveSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof receiveSchema>;
    await receiveStock(body);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

inventoryAdminRouter.get('/movements', async (_req, res, next) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { product: true, warehouse: true },
    });
    res.json({ movements });
  } catch (err) {
    next(err);
  }
});

const adjustSchema = z.object({
  warehouseId: z.string(),
  productId: z.string(),
  variantId: z.string().optional().nullable(),
  qtyDelta: z.number().int().refine((n) => n !== 0, 'qtyDelta cannot be zero'),
  type: z.enum(['ADJUSTMENT', 'DAMAGED', 'EXPIRED', 'CYCLE_COUNT']).default('ADJUSTMENT'),
  note: z.string().optional().nullable(),
});

inventoryAdminRouter.post('/adjust', validate(adjustSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof adjustSchema>;
    await adjustStock({
      ...body,
      createdBy: req.user?.sub,
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const transferSchema = z.object({
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  productId: z.string(),
  variantId: z.string().optional().nullable(),
  qty: z.number().int().positive(),
  note: z.string().optional().nullable(),
});

inventoryAdminRouter.post('/transfer', validate(transferSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof transferSchema>;
    await transferStock({
      ...body,
      createdBy: req.user?.sub,
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
