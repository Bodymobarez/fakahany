import {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomInt } from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { applyDiscount, calculateTax, getCompanyVatRate } from './tax';
import { deductStockFefo } from './inventory.service';
import { getPaymentProvider } from './payments';
import { requireDeliveryQuote } from './delivery-zone.service';
import {
  LOYALTY_POINTS_PER_AED,
  loyaltyAedFromPoints,
  loyaltyPointsFromAed,
} from './loyalty.service';
import { refreshCartItemPrices } from './pricing.service';
import { buildInvoicePdf } from './invoice.pdf';
import { sendTransactionalMessage } from './messaging.service';
import { deliverPushToUsers } from './push.service';

function generateOrderNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomInt(100000, 999999);
  return `FH-${stamp}-${suffix}`;
}

function generateInvoiceNumber(): string {
  const stamp = new Date().toISOString().slice(0, 7).replace(/-/g, '');
  const suffix = randomInt(10000, 99999);
  return `INV-${stamp}-${suffix}`;
}

export interface CheckoutInput {
  userId: string;
  cartId: string;
  addressId: string;
  paymentMethod: PaymentMethod;
  deliveryType: DeliveryType;
  deliverySlotStart?: Date | null;
  deliverySlotEnd?: Date | null;
  deliveryNotes?: string | null;
  couponCode?: string | null;
  /** Amount of wallet balance to apply toward the order total (AED). */
  walletAmount?: number | null;
  /** Whole loyalty points to redeem (100 pts = 1 AED). */
  pointsToRedeem?: number | null;
}

export async function checkoutCart(input: CheckoutInput) {
  const cart = await prisma.cart.findUnique({
    where: { id: input.cartId },
    include: {
      items: { include: { product: true, variant: true } },
      coupon: true,
    },
  });

  if (!cart) {
    throw new AppError(404, 'Cart not found', 'CART_NOT_FOUND');
  }
  // Claim guest cart on checkout if it isn't linked yet
  if (!cart.userId && cart.sessionId) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { userId: input.userId, sessionId: null },
    });
    cart.userId = input.userId;
  } else if (cart.userId !== input.userId) {
    throw new AppError(404, 'Cart not found', 'CART_NOT_FOUND');
  }
  if (!cart.items.length) {
    throw new AppError(400, 'Cart is empty', 'EMPTY_CART');
  }

  await refreshCartItemPrices(cart.id, input.userId);
  const pricedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: { include: { product: true, variant: true } },
      coupon: true,
    },
  });
  if (!pricedCart?.items.length) {
    throw new AppError(400, 'Cart is empty', 'EMPTY_CART');
  }
  Object.assign(cart, pricedCart);

  const address = await prisma.address.findFirst({
    where: { id: input.addressId, userId: input.userId },
  });
  if (!address) {
    throw new AppError(404, 'Address not found', 'ADDRESS_NOT_FOUND');
  }

  let coupon = cart.coupon;
  if (input.couponCode) {
    coupon = await prisma.coupon.findFirst({
      where: { code: input.couponCode.toUpperCase(), isActive: true },
    });
    if (!coupon) throw new AppError(400, 'Invalid coupon', 'INVALID_COUPON');
  }

  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
  let discount = 0;
  if (coupon) {
    if (coupon.minOrder && subtotal < Number(coupon.minOrder)) {
      throw new AppError(400, 'Order below coupon minimum', 'COUPON_MIN_ORDER');
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new AppError(400, 'Coupon usage limit reached', 'COUPON_EXHAUSTED');
    }
    discount = applyDiscount(subtotal, coupon.type, Number(coupon.value));
  }

  const deliveryQuote = await requireDeliveryQuote({
    emirate: address.emirate,
    lat: address.lat,
    lng: address.lng,
    subtotal: Math.max(0, subtotal - discount),
    deliveryType: input.deliveryType,
  });
  const shipping = deliveryQuote.fee;
  const taxable = Math.max(0, subtotal - discount + shipping);
  const taxInfo = await calculateTax(taxable);
  const company = await getCompanyVatRate();
  const grossTotal = Math.round((taxable + taxInfo.taxAmount) * 100) / 100;

  let walletApplied = Math.min(Math.max(0, Number(input.walletAmount || 0)), grossTotal);
  walletApplied = Math.round(walletApplied * 100) / 100;

  const loyaltyAccount =
    (await prisma.loyaltyAccount.findUnique({ where: { userId: input.userId } })) ||
    (await prisma.loyaltyAccount.create({ data: { userId: input.userId } }));
  const remainingAfterWallet = Math.max(0, grossTotal - walletApplied);
  const requestedPoints = Math.max(0, Math.floor(Number(input.pointsToRedeem || 0)));
  const maxRedeemablePoints = Math.min(
    loyaltyAccount.points,
    loyaltyPointsFromAed(remainingAfterWallet),
  );
  const pointsBurned = Math.min(requestedPoints, maxRedeemablePoints);
  // Only whole AED credits (drop leftover points under 100)
  const loyaltyApplied = loyaltyAedFromPoints(pointsBurned);
  const pointsUsed = loyaltyApplied * LOYALTY_POINTS_PER_AED;
  const total = Math.round((grossTotal - walletApplied - loyaltyApplied) * 100) / 100;

  const orderNumber = generateOrderNumber();
  const invoiceNumber = generateInvoiceNumber();

  const order = await prisma.$transaction(async (tx) => {
    if (walletApplied > 0) {
      const wallet =
        (await tx.wallet.findUnique({ where: { userId: input.userId } })) ||
        (await tx.wallet.create({ data: { userId: input.userId } }));
      if (Number(wallet.balance) < walletApplied) {
        throw new AppError(400, 'Insufficient wallet balance', 'WALLET_INSUFFICIENT');
      }
      const balanceAfter = Math.round((Number(wallet.balance) - walletApplied) * 100) / 100;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: new Prisma.Decimal(balanceAfter) },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: walletApplied,
          balanceAfter,
          reference: orderNumber,
          note: 'Applied at checkout',
        },
      });
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: input.userId,
        status: OrderStatus.PENDING,
        subtotal,
        discount: discount + walletApplied + loyaltyApplied,
        shipping,
        tax: taxInfo.taxAmount,
        total,
        currency: process.env.CURRENCY || 'AED',
        paymentMethod: input.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        deliveryType: input.deliveryType,
        deliverySlotStart: input.deliverySlotStart ?? null,
        deliverySlotEnd: input.deliverySlotEnd ?? null,
        deliveryNotes: input.deliveryNotes ?? null,
        addressId: address.id,
        couponId: coupon?.id ?? null,
        companyNameSnap: company.companyName,
        trnSnap: company.trn,
        vatRateSnap: new Prisma.Decimal(taxInfo.vatRate),
        invoiceNumber,
        deliveryOtp: String(randomInt(1000, 9999)),
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            nameEn: item.product.nameEn,
            nameAr: item.product.nameAr,
            sku: item.variant?.sku || item.product.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: Number(item.unitPrice) * item.quantity,
            taxAmount: 0,
          })),
        },
        statusHistory: {
          create: { status: OrderStatus.PENDING, note: 'Order placed' },
        },
        assignment: deliveryQuote.zoneId
          ? {
              create: {
                zoneId: deliveryQuote.zoneId,
                notes: deliveryQuote.zone
                  ? `Zone ${deliveryQuote.zone.name} · ETA ~${deliveryQuote.etaMinutes}m`
                  : null,
              },
            }
          : undefined,
      },
      include: { items: true },
    });

    if (walletApplied > 0) {
      await tx.payment.create({
        data: {
          orderId: created.id,
          provider: PaymentMethod.WALLET,
          amount: walletApplied,
          status: PaymentStatus.CAPTURED,
          externalId: `wallet:${orderNumber}`,
          meta: { source: 'checkout' },
        },
      });
    }

    if (loyaltyApplied > 0 && pointsUsed > 0) {
      const account = await tx.loyaltyAccount.findUnique({ where: { userId: input.userId } });
      if (!account || account.points < pointsUsed) {
        throw new AppError(400, 'Insufficient loyalty points', 'LOYALTY_INSUFFICIENT');
      }
      const newPoints = account.points - pointsUsed;
      const level = await tx.membershipLevel.findFirst({
        where: { minPoints: { lte: newPoints } },
        orderBy: { minPoints: 'desc' },
      });
      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: newPoints, levelId: level?.id ?? account.levelId },
      });
      await tx.rewardTransaction.create({
        data: {
          accountId: account.id,
          type: 'REDEEM',
          points: pointsUsed,
          reference: orderNumber,
          note: `Redeemed ${pointsUsed} pts for ${loyaltyApplied} AED`,
        },
      });
      await tx.payment.create({
        data: {
          orderId: created.id,
          provider: PaymentMethod.REWARD_POINTS,
          amount: loyaltyApplied,
          status: PaymentStatus.CAPTURED,
          externalId: `loyalty:${orderNumber}`,
          meta: { points: pointsUsed, rate: LOYALTY_POINTS_PER_AED },
        },
      });
    }

    await deductStockFefo(
      cart.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      { reference: orderNumber, tx },
    );

    if (coupon) {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Earn 1 loyalty point per AED spent (after discounts / wallet)
    const earnPoints = Math.floor(total);
    if (earnPoints > 0) {
      const account =
        (await tx.loyaltyAccount.findUnique({ where: { userId: input.userId } })) ||
        (await tx.loyaltyAccount.create({ data: { userId: input.userId } }));
      const newPoints = account.points + earnPoints;
      const level = await tx.membershipLevel.findFirst({
        where: { minPoints: { lte: newPoints } },
        orderBy: { minPoints: 'desc' },
      });
      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: newPoints, levelId: level?.id ?? account.levelId },
      });
      await tx.rewardTransaction.create({
        data: {
          accountId: account.id,
          type: 'EARN',
          points: earnPoints,
          reference: orderNumber,
          note: 'Order earn',
        },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });

    return created;
  });

  const provider = getPaymentProvider(input.paymentMethod);
  const intent = await provider.createIntent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: Number(order.total),
    currency: order.currency,
  });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: input.paymentMethod,
      amount: order.total,
      status: intent.status,
      externalId: intent.externalId,
      meta: intent.meta ?? { clientSecret: intent.clientSecret, redirectUrl: intent.redirectUrl },
    },
  });

  if (input.paymentMethod === PaymentMethod.COD) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.ACCEPTED },
    });
    await prisma.orderStatusHistory.create({
      data: { orderId: order.id, status: OrderStatus.ACCEPTED, note: 'COD accepted' },
    });
  }

  await notifyOrderWithInvoice(order.id, input.userId);

  return { order, payment, intent, walletApplied, loyaltyApplied, pointsUsed };
}

async function notifyOrderWithInvoice(orderId: string, userId: string) {
  const [fullOrder, company, user] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, address: true },
    }),
    prisma.companySettings.findFirst(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true },
    }),
  ]);
  if (!fullOrder || !user) return;

  const title = 'Your Fresh Harvest invoice';
  const body = `Order ${fullOrder.orderNumber} is confirmed. Your tax invoice is ready to download.`;

  await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      data: {
        type: 'ORDER_INVOICE',
        orderId: fullOrder.id,
        orderNumber: fullOrder.orderNumber,
        invoiceNumber: fullOrder.invoiceNumber,
        href: `/account/orders/${fullOrder.id}`,
      },
    },
  });

  try {
    await deliverPushToUsers({
      userIds: [userId],
      title,
      body,
      data: {
        type: 'ORDER_INVOICE',
        orderId: fullOrder.id,
        orderNumber: fullOrder.orderNumber,
      },
      app: 'customer',
    });
  } catch {
    /* push optional */
  }

  if (!user.email) return;

  try {
    const pdf = await buildInvoicePdf(fullOrder, company);
    const filename = `${fullOrder.invoiceNumber || fullOrder.orderNumber}.pdf`;
    await sendTransactionalMessage({
      channel: 'EMAIL',
      to: user.email,
      userId: user.id,
      kind: 'order_invoice',
      title: `Invoice ${fullOrder.invoiceNumber || fullOrder.orderNumber}`,
      body: [
        `Hi ${user.firstName || 'there'},`,
        '',
        `Thanks for your order ${fullOrder.orderNumber}.`,
        `Total: ${fullOrder.currency} ${Number(fullOrder.total).toFixed(2)}`,
        '',
        'Your tax invoice is attached as a PDF.',
        'You can also download it anytime from Account → Orders.',
        '',
        '— Fresh Harvest UAE',
      ].join('\n'),
      attachments: [
        {
          filename,
          contentType: 'application/pdf',
          contentBase64: pdf.toString('base64'),
        },
      ],
    });
  } catch (err) {
    console.warn('[order_invoice] email failed', err);
  }
}

const orderItemProductInclude = {
  product: {
    select: {
      id: true,
      slug: true,
      soldAs: true,
      weight: true,
      unit: true,
      packageSize: true,
      images: {
        orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
        take: 1,
        select: { url: true },
      },
    },
  },
  variant: { select: { id: true, name: true, weight: true } },
} as const;

export async function getOrderForUser(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: { include: orderItemProductInclude },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      payments: true,
      address: true,
      user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
    },
  });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  return order;
}

/** Rich list payload for the customer Orders page (detail + history). */
export async function listOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: orderItemProductInclude },
      address: true,
      user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });
}
