'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import {
  clearPendingCardPayment,
  loadPendingCardPayment,
  type PendingCardPayment,
} from '@/lib/checkoutSession';
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper';
import { StripeCardForm } from '@/components/checkout/StripeCardForm';

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingCardPayment | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [stripeKey, setStripeKey] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [billing, setBilling] = useState('');
  const [vatRef, setVatRef] = useState('');

  useEffect(() => {
    const data = loadPendingCardPayment();
    setPending(data);
    setReady(true);
    void api
      .get<{ publishableKey?: string | null }>('/api/payments/methods')
      .then(({ data: methods }) => {
        setStripeKey(
          methods.publishableKey ||
            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
            '',
        );
      })
      .catch(() => undefined);
  }, []);

  const isStub = Boolean(pending?.clientSecret?.startsWith('stub_'));

  async function confirmStubPayment() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      if (!cardName.trim() || cardNumber.replace(/\s/g, '').length < 12 || !expiry || !cvv) {
        throw new Error('Please complete card details');
      }
      await api.post('/api/payments/confirm', {
        paymentId: pending.paymentId,
        externalId: `card_demo_${pending.orderId}`,
      });
      clearPendingCardPayment();
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted">Loading payment…</div>
    );
  }

  if (!pending) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CheckoutStepper current="payment" />
        <h1 className="font-display text-3xl font-semibold text-heading">No pending payment</h1>
        <p className="mt-3 text-muted">Return to checkout to place your order.</p>
        <Link
          href="/checkout"
          className="mt-8 inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white"
        >
          Back to Checkout
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CheckoutStepper current="payment" />
        <h1 className="font-display text-3xl font-semibold text-heading">Payment complete</h1>
        <p className="mt-3 text-muted">
          Order <strong>{pending.orderNumber}</strong> is confirmed. Thank you!
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/account/orders/${pending.orderId}`}
            className="inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white"
          >
            View order
          </Link>
          <Link
            href={`/account/orders/${pending.orderId}/track`}
            className="inline-flex rounded-full border border-line px-6 py-3 text-sm font-semibold text-heading"
          >
            Track delivery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <CheckoutStepper current="payment" />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]">
        <section className="rounded-2xl border border-line bg-surface p-5 md:p-6">
          <h1 className="font-display text-2xl font-semibold text-heading md:text-3xl">
            Complete Payment
          </h1>
          <p className="mt-1 text-sm text-muted">All transactions are secure and encrypted.</p>

          {isStub || !stripeKey || stripeKey.includes('placeholder') ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void confirmStubPayment();
              }}
            >
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Cardholder Name</span>
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Card Number</span>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  inputMode="numeric"
                  placeholder="ACCT-000015"
                  required
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Expiry Date</span>
                  <input
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    required
                    className="w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">CVV</span>
                  <div className="relative">
                    <input
                      type={showCvv ? 'text' : 'password'}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      required
                      maxLength={4}
                      className="w-full rounded-xl border border-line px-3.5 py-2.5 pr-16 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-leaf-700"
                    >
                      {showCvv ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Delivery Address</span>
                <textarea
                  value={billing}
                  onChange={(e) => setBilling(e.target.value)}
                  rows={3}
                  placeholder="Enter your billing address."
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">VAT Invoice Reference (optional)</span>
                <input
                  value={vatRef}
                  onChange={(e) => setVatRef(e.target.value)}
                  placeholder="Company VAT number"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                />
              </label>

              <div className="rounded-xl border border-citrus-200 bg-citrus-50 px-4 py-3 text-sm text-ink">
                Secure Payment. Your card details are encrypted and never stored on our servers.
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-leaf-700 py-3.5 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
              >
                {busy ? (
                  'Processing…'
                ) : (
                  <>
                    Complete Payment{' '}
                    <Price
                      amount={pending.amount}
                      className="inline-flex items-center gap-1"
                      symbolClassName="inline-block h-3.5 w-3.5"
                    />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push('/checkout')}
                className="w-full rounded-full border-2 border-leaf-700 py-3 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
              >
                Back to Checkout
              </button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              <StripeCardForm
                clientSecret={pending.clientSecret}
                paymentId={pending.paymentId}
                publishableKey={stripeKey}
                onPaid={() => {
                  clearPendingCardPayment();
                  setDone(true);
                }}
                onError={(msg) => setError(msg)}
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="button"
                onClick={() => router.push('/checkout')}
                className="w-full rounded-full border-2 border-leaf-700 py-3 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
              >
                Back to Checkout
              </button>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-line bg-surface p-5 md:sticky md:top-24">
          <h2 className="font-display text-xl font-semibold text-heading">Order Summary</h2>
          <ul className="mt-4 space-y-3 border-b border-line pb-4 text-sm">
            {pending.items.map((item, idx) => (
              <li key={`${item.name}-${idx}`} className="flex justify-between gap-3">
                <span className="text-muted">
                  {item.name} × {item.quantity}
                </span>
                <Price
                  amount={item.lineTotal}
                  className="inline-flex items-center gap-1 font-medium"
                  symbolClassName="inline-block h-3.5 w-3.5"
                />
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <Price
                amount={pending.subtotal}
                className="inline-flex items-center gap-1"
                symbolClassName="inline-block h-3.5 w-3.5"
              />
            </div>
            <div className="flex justify-between rounded-lg bg-citrus-50 px-3 py-2">
              <span className="text-muted">VAT (5%)</span>
              <Price
                amount={pending.vatAmount}
                className="inline-flex items-center gap-1"
                symbolClassName="inline-block h-3.5 w-3.5"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Delivery Fee</span>
              <Price
                amount={pending.deliveryFee}
                className="inline-flex items-center gap-1"
                symbolClassName="inline-block h-3.5 w-3.5"
              />
            </div>
            {pending.tipAmount > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted">Driver Tip</span>
                <Price
                  amount={pending.tipAmount}
                  className="inline-flex items-center gap-1"
                  symbolClassName="inline-block h-3.5 w-3.5"
                />
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-3 text-base">
              <span className="font-semibold text-heading">Total</span>
              <Price
                amount={pending.amount}
                className="inline-flex items-center gap-1.5 text-lg font-semibold text-leaf-800"
                symbolClassName="inline-block h-4 w-4"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
