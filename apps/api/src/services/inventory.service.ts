import { Prisma, StockMovementType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export interface DeductLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

/** FEFO: consume batches with earliest expiry first, then non-dated stock. */
export async function deductStockFefo(
  lines: DeductLine[],
  opts?: { warehouseId?: string; reference?: string; tx?: Prisma.TransactionClient },
): Promise<void> {
  const db = opts?.tx ?? prisma;

  let warehouseId = opts?.warehouseId;
  if (!warehouseId) {
    const wh = await db.warehouse.findFirst({ where: { isDefault: true } });
    if (!wh) throw new AppError(500, 'No default warehouse configured', 'NO_WAREHOUSE');
    warehouseId = wh.id;
  }

  for (const line of lines) {
    const batches = await db.stockBatch.findMany({
      where: {
        warehouseId,
        productId: line.productId,
        productVariantId: line.variantId ?? null,
        qty: { gt: 0 },
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    });

    let remaining = line.quantity;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.qty, remaining);
      await db.stockBatch.update({
        where: { id: batch.id },
        data: { qty: batch.qty - take },
      });
      remaining -= take;
    }

    const level = await db.stockLevel.findFirst({
      where: {
        warehouseId,
        productId: line.productId,
        productVariantId: line.variantId ?? null,
      },
    });

    if (level) {
      if (level.qty < line.quantity && remaining > 0) {
        throw new AppError(400, `Insufficient stock for product ${line.productId}`, 'INSUFFICIENT_STOCK');
      }
      await db.stockLevel.update({
        where: { id: level.id },
        data: { qty: Math.max(0, level.qty - line.quantity) },
      });
    } else if (remaining > 0) {
      // Fall back to product/variant counters when no warehouse level row exists
      if (line.variantId) {
        const variant = await db.productVariant.findUnique({ where: { id: line.variantId } });
        if (!variant || variant.stockQty < line.quantity) {
          throw new AppError(400, `Insufficient stock for variant ${line.variantId}`, 'INSUFFICIENT_STOCK');
        }
      } else {
        const product = await db.product.findUnique({ where: { id: line.productId } });
        if (!product || product.stockQty < line.quantity) {
          throw new AppError(400, `Insufficient stock for product ${line.productId}`, 'INSUFFICIENT_STOCK');
        }
      }
    }

    if (line.variantId) {
      await db.productVariant.update({
        where: { id: line.variantId },
        data: { stockQty: { decrement: line.quantity } },
      });
    }
    await db.product.update({
      where: { id: line.productId },
      data: { stockQty: { decrement: line.quantity } },
    });

    await db.stockMovement.create({
      data: {
        warehouseId,
        productId: line.productId,
        productVariantId: line.variantId ?? null,
        type: StockMovementType.OUT,
        qty: line.quantity,
        reference: opts?.reference,
        note: 'Order deduction (FEFO)',
      },
    });
  }
}

export async function receiveStock(input: {
  warehouseId: string;
  productId: string;
  variantId?: string | null;
  qty: number;
  batchNumber: string;
  lotNumber?: string;
  expiryDate?: Date | null;
  movementType?: StockMovementType;
  reference?: string | null;
  note?: string | null;
  createdBy?: string | null;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.stockBatch.create({
      data: {
        warehouseId: input.warehouseId,
        productId: input.productId,
        productVariantId: input.variantId ?? null,
        batchNumber: input.batchNumber,
        lotNumber: input.lotNumber,
        expiryDate: input.expiryDate ?? null,
        qty: input.qty,
      },
    });

    const existing = await tx.stockLevel.findFirst({
      where: {
        warehouseId: input.warehouseId,
        productId: input.productId,
        productVariantId: input.variantId ?? null,
      },
    });

    if (existing) {
      await tx.stockLevel.update({
        where: { id: existing.id },
        data: { qty: existing.qty + input.qty },
      });
    } else {
      await tx.stockLevel.create({
        data: {
          warehouseId: input.warehouseId,
          productId: input.productId,
          productVariantId: input.variantId ?? null,
          qty: input.qty,
        },
      });
    }

    if (input.variantId) {
      await tx.productVariant.update({
        where: { id: input.variantId },
        data: { stockQty: { increment: input.qty } },
      });
    }
    await tx.product.update({
      where: { id: input.productId },
      data: { stockQty: { increment: input.qty } },
    });

    await tx.stockMovement.create({
      data: {
        warehouseId: input.warehouseId,
        productId: input.productId,
        productVariantId: input.variantId ?? null,
        type: input.movementType || StockMovementType.RECEIVING,
        qty: input.qty,
        reference: input.reference ?? null,
        note: input.note || `Batch ${input.batchNumber}`,
        createdBy: input.createdBy ?? null,
      },
    });
  });
}

/** Put order lines back into default warehouse (return / restock). */
export async function restockOrderItems(
  orderId: string,
  opts?: { note?: string | null; createdBy?: string | null },
): Promise<{ restocked: number }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');

  const warehouse = await prisma.warehouse.findFirst({ where: { isDefault: true } });
  if (!warehouse) throw new AppError(500, 'No default warehouse configured', 'NO_WAREHOUSE');

  let restocked = 0;
  for (const item of order.items) {
    if (!item.productId || item.quantity <= 0) continue;
    await receiveStock({
      warehouseId: warehouse.id,
      productId: item.productId,
      variantId: item.variantId,
      qty: item.quantity,
      batchNumber: `RET-${order.orderNumber}-${item.sku}`.slice(0, 60),
      lotNumber: order.orderNumber,
      movementType: StockMovementType.IN,
      reference: order.orderNumber,
      note: opts?.note || 'Return restock',
      createdBy: opts?.createdBy,
    });
    restocked += item.quantity;
  }
  return { restocked };
}

export async function adjustStock(input: {
  warehouseId: string;
  productId: string;
  variantId?: string | null;
  qtyDelta: number;
  type: 'ADJUSTMENT' | 'DAMAGED' | 'EXPIRED' | 'CYCLE_COUNT';
  note?: string | null;
  createdBy?: string | null;
}): Promise<void> {
  if (input.qtyDelta === 0) throw new AppError(400, 'qtyDelta cannot be zero', 'VALIDATION_ERROR');

  if (input.qtyDelta > 0) {
    await receiveStock({
      warehouseId: input.warehouseId,
      productId: input.productId,
      variantId: input.variantId,
      qty: input.qtyDelta,
      batchNumber: `ADJ-${Date.now()}`,
      movementType: StockMovementType[input.type],
      reference: input.type,
      note: input.note || input.type,
      createdBy: input.createdBy,
    });
    return;
  }

  await deductStockFefo(
    [{ productId: input.productId, variantId: input.variantId, quantity: Math.abs(input.qtyDelta) }],
    { warehouseId: input.warehouseId, reference: input.type },
  );
  const last = await prisma.stockMovement.findFirst({
    where: { warehouseId: input.warehouseId, productId: input.productId },
    orderBy: { createdAt: 'desc' },
  });
  if (last) {
    await prisma.stockMovement.update({
      where: { id: last.id },
      data: {
        type: StockMovementType[input.type],
        note: input.note || input.type,
        createdBy: input.createdBy || null,
      },
    });
  }
}

export async function transferStock(input: {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  variantId?: string | null;
  qty: number;
  note?: string | null;
  createdBy?: string | null;
}): Promise<void> {
  if (input.fromWarehouseId === input.toWarehouseId) {
    throw new AppError(400, 'Warehouses must differ', 'VALIDATION_ERROR');
  }
  if (input.qty <= 0) throw new AppError(400, 'qty must be positive', 'VALIDATION_ERROR');

  await deductStockFefo(
    [{ productId: input.productId, variantId: input.variantId, quantity: input.qty }],
    { warehouseId: input.fromWarehouseId, reference: 'TRANSFER' },
  );
  const outMove = await prisma.stockMovement.findFirst({
    where: { warehouseId: input.fromWarehouseId, productId: input.productId },
    orderBy: { createdAt: 'desc' },
  });
  if (outMove) {
    await prisma.stockMovement.update({
      where: { id: outMove.id },
      data: {
        type: StockMovementType.TRANSFER,
        note: input.note || `Transfer out → ${input.toWarehouseId}`,
        createdBy: input.createdBy || null,
      },
    });
  }

  await receiveStock({
    warehouseId: input.toWarehouseId,
    productId: input.productId,
    variantId: input.variantId,
    qty: input.qty,
    batchNumber: `TRF-${Date.now()}`,
    movementType: StockMovementType.TRANSFER,
    reference: 'TRANSFER',
    note: input.note || `Transfer in ← ${input.fromWarehouseId}`,
    createdBy: input.createdBy,
  });
}
