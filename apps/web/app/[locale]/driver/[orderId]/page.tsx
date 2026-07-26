'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Price } from '@fv/ui';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import { selectIsAuthenticated, selectUser } from '@/store/authSlice';

type OrderView = {
  id: string;
  orderNumber: string;
  status: string;
  deliveryOtp?: string | null;
  address?: {
    line1?: string;
    city?: string;
    emirate?: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
  items?: Array<{
    id: string;
    nameEn: string;
    sku: string;
    quantity: number;
    lineTotal?: number | string;
  }>;
};

export default function DriverOrderPage() {
  const params = useParams<{ orderId: string }>();
  const user = useSelector(selectUser);
  const isAuth = useSelector(selectIsAuthenticated);
  const router = useRouter();
  const isDriver = user?.role === 'DRIVER' || user?.role === 'ADMIN';

  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState('');
  const [recipient, setRecipient] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get<{
      assignments: Array<{ order: OrderView }>;
    }>('/api/driver/assignments');
    const found = (data.assignments || []).find((a) => a.order.id === params.orderId);
    if (!found) throw new Error('Assignment not found or already delivered');
    setOrder(found.order);
  }, [params.orderId]);

  useEffect(() => {
    if (!isAuth || !isDriver || !params.orderId) return;
    void load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'Could not load order'),
    );
  }, [isAuth, isDriver, params.orderId, load]);

  async function markOutForDelivery() {
    if (!order) return;
    setBusy(true);
    setError(null);
    setStatusMsg(null);
    try {
      await api.post(`/api/driver/orders/${order.id}/status`, {
        status: 'OUT_FOR_DELIVERY',
      });
      setStatusMsg('Marked out for delivery');
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not update status',
      );
    } finally {
      setBusy(false);
    }
  }

  async function markDelivered() {
    if (!order) return;
    setBusy(true);
    setError(null);
    setStatusMsg(null);
    try {
      if (!otp.trim()) throw new Error('Enter the delivery OTP');
      if (!recipient.trim()) throw new Error('Enter recipient name as proof of delivery');
      await api.post(`/api/driver/orders/${order.id}/status`, {
        status: 'DELIVERED',
        otp: otp.trim(),
        podRecipientName: recipient.trim(),
      });
      setStatusMsg('Delivered');
      setTimeout(() => router.push('/driver'), 700);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
          (err instanceof Error ? err.message : 'Could not complete delivery'),
      );
    } finally {
      setBusy(false);
    }
  }

  const addressLabel = order?.address
    ? [order.address.line1, order.address.city, order.address.emirate].filter(Boolean).join(', ')
    : '';
  const mapsUrl =
    order?.address?.lat != null && order?.address?.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${order.address.lat},${order.address.lng}`
      : addressLabel
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLabel)}`
        : null;

  if (!isAuth || !isDriver) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-ink/65">Driver sign-in required.</p>
        <Link href="/auth/login" className="mt-6 inline-block text-leaf-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/driver" className="mt-6 inline-block text-leaf-700 underline">
          Back to assignments
        </Link>
      </div>
    );
  }

  if (!order) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-sm text-ink/55">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-10 md:px-6">
      <Link href="/driver" className="text-sm font-medium text-leaf-700 hover:underline">
        ← Assignments
      </Link>

      <header className="rounded-2xl border border-leaf-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">Delivery</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-leaf-900">
          #{order.orderNumber}
        </h1>
        <p className="mt-1 text-sm font-medium text-leaf-700">
          {order.status.replaceAll('_', ' ')}
        </p>
        {addressLabel ? <p className="mt-3 text-sm text-ink/70">{addressLabel}</p> : null}
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#a67c7c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#966e6e]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M21.5 3.5 2.8 11.1c-.55.22-.53.99.03 1.18l7.5 2.55 2.55 7.5c.19.56.96.58 1.18.03L21.5 3.5z" />
            </svg>
            Navigate
          </a>
        ) : null}
      </header>

      <section className="rounded-2xl border border-leaf-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Items</h2>
        <ul className="mt-3 divide-y divide-leaf-100">
          {(order.items || []).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <p className="font-medium text-ink">{item.nameEn}</p>
                <p className="text-xs text-ink/45">
                  {item.sku} · x{item.quantity}
                </p>
              </div>
              {item.lineTotal != null ? (
                <Price amount={item.lineTotal} className="inline-flex items-center gap-1" symbolClassName="h-3.5 w-3.5" />
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-leaf-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Actions</h2>
        {statusMsg ? <p className="text-sm text-emerald-700">{statusMsg}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'DELIVERED' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void markOutForDelivery()}
            className="w-full rounded-xl bg-leaf-700 px-4 py-3 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-50"
          >
            Mark out for delivery
          </button>
        ) : null}

        {order.status !== 'DELIVERED' ? (
          <div className="space-y-3 rounded-xl bg-leaf-50/80 p-4">
            <p className="text-xs text-ink/55">
              Enter the customer delivery OTP and recipient name to complete.
            </p>
            <label className="block text-sm">
              <span className="font-medium text-ink">Delivery OTP</span>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 w-full rounded-xl border border-leaf-200 bg-white px-3 py-2.5"
                placeholder="OTP"
                inputMode="numeric"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink">Recipient name</span>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="mt-1 w-full rounded-xl border border-leaf-200 bg-white px-3 py-2.5"
                placeholder="Who received the order"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void markDelivered()}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Complete delivery
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
