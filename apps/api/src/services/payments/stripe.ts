import Stripe from 'stripe';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import type { PaymentIntentInput, PaymentIntentResult, PaymentProvider } from './types';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('placeholder')) return null;
  return new Stripe(key);
}

export const stripeProvider: PaymentProvider = {
  method: PaymentMethod.STRIPE,
  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const stripe = getStripe();
    if (!stripe) {
      return {
        provider: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        externalId: `stripe_stub_${input.orderId}`,
        clientSecret: `stub_secret_${input.orderId}`,
        meta: { stub: true },
      };
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(input.amount * 100),
      currency: input.currency.toLowerCase(),
      metadata: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        ...input.metadata,
      },
      receipt_email: input.customerEmail || undefined,
      automatic_payment_methods: { enabled: true },
    });

    return {
      provider: PaymentMethod.STRIPE,
      status: PaymentStatus.PENDING,
      externalId: intent.id,
      clientSecret: intent.client_secret || undefined,
    };
  },

  async refund(externalId: string, amount?: number): Promise<PaymentIntentResult> {
    const stripe = getStripe();
    if (!stripe || externalId.startsWith('stripe_stub') || externalId.startsWith('stub_')) {
      return {
        provider: PaymentMethod.STRIPE,
        status: PaymentStatus.REFUNDED,
        externalId: `refund_stub_${externalId}`,
        meta: { stub: true, amount },
      };
    }

    const refund = await stripe.refunds.create({
      payment_intent: externalId,
      ...(amount != null ? { amount: Math.round(amount * 100) } : {}),
    });

    return {
      provider: PaymentMethod.STRIPE,
      status: PaymentStatus.REFUNDED,
      externalId: refund.id,
      meta: { paymentIntent: externalId, refundStatus: refund.status },
    };
  },
};
