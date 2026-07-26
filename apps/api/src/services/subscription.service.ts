import { randomInt } from 'crypto';
import { DeliveryType, OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateTax } from './tax';
import { resolveUnitPrice } from './pricing.service';

export type SubscriptionMeta = {
  nextRunAt?: string;
  productIds?: string[];
  addressId?: string;
  lastOrderId?: string;
  lastOrderNumber?: string;
};

export function nextRunFromPlan(planCode: string, from = new Date()): string {
  const d = new Date(from);
  if (planCode === 'DAILY') d.setDate(d.getDate() + 1);
  else if (planCode === 'MONTHLY') d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + 7);
  return d.toISOString();
}

export async function runSubscriptionCycle(opts?: {
  forceAll?: boolean;
}): Promise<{ processed: number; created: number; orderNumbers: string[] }> {
  const active = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: {
      user: { include: { addresses: { where: { isDefault: true }, take: 1 } } },
    },
  });

  const now = new Date();
  const createdOrders: string[] = [];

  for (const sub of active) {
    const meta = ((sub.meta || {}) as SubscriptionMeta) || {};
    const due = opts?.forceAll || !meta.nextRunAt || new Date(meta.nextRunAt) <= now;
    if (!due) continue;

    const address =
      (meta.addressId
        ? await prisma.address.findFirst({
            where: { id: meta.addressId, userId: sub.userId },
          })
        : null) ||
      sub.user.addresses[0] ||
      (await prisma.address.findFirst({ where: { userId: sub.userId } }));
    if (!address) continue;

    let productIds = Array.isArray(meta.productIds) ? meta.productIds.filter(Boolean) : [];
    if (!productIds.length) {
      const featured = await prisma.product.findMany({
        where: { isActive: true, OR: [{ isFeatured: true }, { isBestSeller: true }] },
        take: 3,
        orderBy: { updatedAt: 'desc' },
      });
      productIds = featured.map((p) => p.id);
    }
    if (!productIds.length) continue;

    const lines: Array<{
      productId: string;
      nameEn: string;
      nameAr: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }> = [];
    for (const productId of productIds) {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) continue;
      const { unitPrice } = await resolveUnitPrice({
        productId,
        userId: sub.userId,
        basePrice: Number(product.basePrice),
      });
      lines.push({
        productId,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        sku: product.sku,
        quantity: 1,
        unitPrice,
        lineTotal: unitPrice,
      });
    }
    if (!lines.length) continue;

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const shipping = 15;
    const taxInfo = await calculateTax(subtotal + shipping);
    const total = Math.round((subtotal + shipping + taxInfo.taxAmount) * 100) / 100;
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `SUB-${stamp}-${randomInt(100000, 999999)}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: sub.userId,
        status: OrderStatus.PENDING,
        subtotal,
        discount: 0,
        shipping,
        tax: taxInfo.taxAmount,
        total,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PENDING,
        deliveryType: DeliveryType.SAME_DAY,
        addressId: address.id,
        deliveryNotes: `Subscription ${sub.planCode} cycle`,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            nameEn: l.nameEn,
            nameAr: l.nameAr,
            sku: l.sku,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
        statusHistory: {
          create: { status: OrderStatus.PENDING, note: 'Subscription cycle order' },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: sub.userId,
        title: 'Subscription order created',
        body: `Order ${order.orderNumber} was generated from your ${sub.planCode} plan.`,
        data: { orderId: order.id, subscriptionId: sub.id },
      },
    });

    const nextMeta: SubscriptionMeta = {
      ...meta,
      productIds,
      addressId: address.id,
      nextRunAt: nextRunFromPlan(sub.planCode, now),
      lastOrderId: order.id,
      lastOrderNumber: order.orderNumber,
    };

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { meta: nextMeta as Prisma.InputJsonValue },
    });
    createdOrders.push(order.orderNumber);
  }

  return {
    processed: active.length,
    created: createdOrders.length,
    orderNumbers: createdOrders,
  };
}
