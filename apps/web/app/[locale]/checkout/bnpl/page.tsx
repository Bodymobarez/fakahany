'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';

function BnplDemoInner() {
  const params = useSearchParams();
  const router = useRouter();
  const paymentId = params.get('paymentId') || '';
  const orderId = params.get('orderId') || '';
  const orderNumber = params.get('orderNumber') || '';
  const method = (params.get('method') || 'TABBY').toUpperCase();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (!paymentId) {
      setError('Missing payment reference');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/payments/confirm', {
        paymentId,
        externalId: `${method.toLowerCase()}_confirmed_${orderId || paymentId}`,
      });
      if (orderId) router.replace(`/account/orders/${orderId}`);
      else router.replace('/account/orders');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not confirm payment',
      );
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    if (!paymentId) {
      router.replace('/cart');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/payments/cancel', { paymentId });
      router.replace('/cart');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not cancel payment',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16">
      <div className="rounded-3xl border border-leaf-200 bg-white/90 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-leaf-600">
          Demo {method.replaceAll('_', ' ')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-leaf-900">
          Complete your purchase
        </h1>
        <p className="mt-3 text-sm text-ink/65">
          This is a local BNPL sandbox. Approve to capture the payment, or cancel to abandon the
          order.
        </p>
        {orderNumber ? (
          <p className="mt-4 rounded-xl bg-leaf-50 px-3 py-2 text-sm text-leaf-900">
            Order <strong>{orderNumber}</strong>
          </p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || !paymentId}
            onClick={() => void approve()}
            className="rounded-full bg-leaf-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Working…' : 'Approve payment'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void decline()}
            className="rounded-full border border-leaf-300 px-5 py-2.5 text-sm font-semibold text-leaf-800 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
        <p className="mt-6 text-xs text-ink/45">
          Wire real Tabby/Tamara credentials later — this page keeps the redirect/return contract.
        </p>
        <Link href="/cart" className="mt-4 inline-block text-sm text-leaf-700 underline">
          Back to cart
        </Link>
      </div>
    </div>
  );
}

export default function BnplDemoPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-ink/60">Loading…</div>
      }
    >
      <BnplDemoInner />
    </Suspense>
  );
}
