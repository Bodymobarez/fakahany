import { Router } from 'express';
import { z } from 'zod';
import {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomInt } from 'crypto';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { calculateTax, getCompanyVatRate } from '../../services/tax';
import { deductStockFefo } from '../../services/inventory.service';

export const posAdminRouter = Router();

const posSchema = z.object({
  customerId: z.string().optional().nullable(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.COD),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  note: z.string().max(500).optional().nullable(),
});

posAdminRouter.post('/checkout', validate(posSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof posSchema>;
    const products = await prisma.product.findMany({
      where: { id: { in: body.items.map((i) => i.productId) }, isActive: true },
    });
    if (products.length !== body.items.length) {
      throw new AppError(400, 'One or more products unavailable', 'INVALID_PRODUCT');
    }

    let customerId = body.customerId || null;
    if (!customerId) {
      const walkIn = await prisma.user.upsert({
        where: { email: 'pos-walkin@freshharvest.ae' },
        update: {},
        create: {
          email: 'pos-walkin@freshharvest.ae',
          username: 'pos-walkin',
          passwordHash: '!',
          firstName: 'POS',
          lastName: 'Walk-in',
          role: 'CUSTOMER',
          emailVerified: true,
        },
      });
      customerId = walkIn.id;
    } else {
      const customer = await prisma.user.findUnique({ where: { id: customerId } });
      if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');
    }

    const lines = body.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = Number(product.basePrice);
      return {
        product,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const shipping = 0;
    const taxInfo = await calculateTax(subtotal);
    const company = await getCompanyVatRate();
    const total = Math.round((subtotal + taxInfo.taxAmount) * 100) / 100;
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `POS-${stamp}-${randomInt(100000, 999999)}`;
    const invoiceNumber = `INV-POS-${stamp}-${randomInt(10000, 99999)}`;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: customerId!,
          status: OrderStatus.DELIVERED,
          subtotal,
          discount: 0,
          shipping,
          tax: taxInfo.taxAmount,
          total,
          currency: process.env.CURRENCY || 'AED',
          paymentMethod: body.paymentMethod,
          paymentStatus: PaymentStatus.CAPTURED,
          deliveryType: DeliveryType.PICKUP,
          deliveryNotes: body.note ?? 'POS sale',
          companyNameSnap: company.companyName,
          trnSnap: company.trn,
          vatRateSnap: new Prisma.Decimal(taxInfo.vatRate),
          invoiceNumber,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              nameEn: l.product.nameEn,
              nameAr: l.product.nameAr,
              sku: l.product.sku,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
              taxAmount: 0,
            })),
          },
          statusHistory: {
            create: [
              { status: OrderStatus.PENDING, note: 'POS created', createdBy: req.user!.sub },
              { status: OrderStatus.DELIVERED, note: 'POS completed', createdBy: req.user!.sub },
            ],
          },
          payments: {
            create: {
              provider: body.paymentMethod,
              amount: total,
              status: PaymentStatus.CAPTURED,
              externalId: `pos:${orderNumber}`,
            },
          },
        },
        include: { items: true, payments: true },
      });

      await deductStockFefo(
        lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        { reference: orderNumber, tx },
      );

      return created;
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});
