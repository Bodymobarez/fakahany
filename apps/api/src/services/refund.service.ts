import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { getPaymentProvider } from './payments';

export type RefundResult = {
  walletRestored: number;
  stripeRefunds: number;
  paymentsRefunded: number;
  notes: string[];
};

/**
 * Reverse captured payments for an order: wallet credit + Stripe refund (or stub).
 * Idempotent for already-REFUNDED payment rows.
 */
export async function processOrderRefund(
  orderId: string,
  opts?: { note?: string | null; createdBy?: string | null },
): Promise<RefundResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
  if (order.paymentStatus === PaymentStatus.REFUNDED && order.status === 'REFUNDED') {
    return { walletRestored: 0, stripeRefunds: 0, paymentsRefunded: 0, notes: ['Already refunded'] };
  }

  const notes: string[] = [];
  let walletRestored = 0;
  let stripeRefunds = 0;
  let paymentsRefunded = 0;

  await prisma.$transaction(async (tx) => {
    for (const pay of order.payments) {
      if (pay.status === PaymentStatus.REFUNDED) continue;
      if (pay.status !== PaymentStatus.CAPTURED && pay.status !== PaymentStatus.PENDING) {
        continue;
      }

      if (pay.provider === PaymentMethod.WALLET && pay.status === PaymentStatus.CAPTURED) {
        const wallet =
          (await tx.wallet.findUnique({ where: { userId: order.userId } })) ||
          (await tx.wallet.create({ data: { userId: order.userId } }));
        const amount = Number(pay.amount);
        const balanceAfter = Math.round((Number(wallet.balance) + amount) * 100) / 100;
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: new Prisma.Decimal(balanceAfter) },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount,
            balanceAfter,
            reference: order.orderNumber,
            note: opts?.note || 'Admin refund',
          },
        });
        walletRestored += amount;
        notes.push(`Wallet +${amount.toFixed(2)} AED`);
      }

      if (pay.provider === PaymentMethod.STRIPE && pay.externalId) {
        const provider = getPaymentProvider(PaymentMethod.STRIPE);
        if (provider.refund) {
          try {
            await provider.refund(pay.externalId, Number(pay.amount));
            stripeRefunds += 1;
            notes.push(
              pay.externalId.startsWith('stripe_stub') || pay.externalId.startsWith('stub_')
                ? 'Stripe stub refund'
                : `Stripe refund ${pay.externalId}`,
            );
          } catch (err) {
            notes.push(
              `Stripe refund failed: ${err instanceof Error ? err.message : 'unknown'}`,
            );
          }
        }
      }

      await tx.payment.update({
        where: { id: pay.id },
        data: { status: PaymentStatus.REFUNDED },
      });
      paymentsRefunded += 1;
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDED',
        paymentStatus: PaymentStatus.REFUNDED,
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'REFUNDED',
        note: opts?.note || 'Refund processed',
        createdBy: opts?.createdBy || null,
      },
    });
  });

  await prisma.notification.create({
    data: {
      userId: order.userId,
      title: 'Refund processed',
      body: `Refund for order ${order.orderNumber} has been processed.`,
      data: { orderId: order.id, walletRestored, stripeRefunds },
    },
  });

  return {
    walletRestored: Math.round(walletRestored * 100) / 100,
    stripeRefunds,
    paymentsRefunded,
    notes,
  };
}
