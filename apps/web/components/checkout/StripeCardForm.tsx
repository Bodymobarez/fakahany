'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { api } from '@/lib/api';

function PayForm({
  paymentId,
  onPaid,
  onError,
}: {
  paymentId: string;
  onPaid: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (result.error) {
        onError(result.error.message || 'Card payment failed');
        return;
      }
      const intent = result.paymentIntent;
      if (intent && (intent.status === 'succeeded' || intent.status === 'processing')) {
        await api.post('/api/payments/confirm', {
          paymentId,
          externalId: intent.id,
        });
        onPaid();
        return;
      }
      onError(`Payment status: ${intent?.status || 'unknown'}`);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={!stripe || busy}
        className="w-full rounded-full bg-leaf-700 py-3 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
      >
        {busy ? 'Processing…' : 'Pay with card'}
      </button>
    </form>
  );
}

type Props = {
  clientSecret: string;
  paymentId: string;
  publishableKey: string;
  onPaid: () => void;
  onError: (msg: string) => void;
};

export function StripeCardForm({
  clientSecret,
  paymentId,
  publishableKey,
  onPaid,
  onError,
}: Props) {
  const stripePromise = useMemo(() => {
    if (!publishableKey || publishableKey.includes('placeholder')) return null;
    return loadStripe(publishableKey) as Promise<Stripe | null>;
  }, [publishableKey]);

  if (!stripePromise) {
    return (
      <p className="text-sm text-amber-800">
        Stripe publishable key is not configured. Set{' '}
        <code className="text-xs">STRIPE_PUBLISHABLE_KEY</code> or use the demo stub key path.
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <PayForm paymentId={paymentId} onPaid={onPaid} onError={onError} />
    </Elements>
  );
}
