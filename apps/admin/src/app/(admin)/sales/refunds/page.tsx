'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number | string;
  paymentStatus: string;
  user?: { firstName: string; lastName: string; email: string | null };
};

export default function RefundsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');

  async function load(search = q) {
    const { data } = await api.get('/api/admin/orders', {
      params: search.trim() ? { q: search.trim() } : undefined,
    });
    const all = (data.orders || []) as Order[];
    setOrders(
      all.filter((o) =>
        ['RETURNED', 'CANCELLED', 'REFUNDED', 'DELIVERED'].includes(o.status),
      ),
    );
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load orders'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markRefunded(id: string, total: number | string) {
    if (
      !confirm(
        `Process refund of ${Number(total).toFixed(2)} AED? Wallet credits and Stripe captures will be reversed where possible.`,
      )
    ) {
      return;
    }
    setBusyId(id);
    setError(null);
    setOk(null);
    try {
      const { data } = await api.post(`/api/admin/orders/${id}/refund`, {
        note: notes[id]?.trim() || 'Refund processed in admin',
      });
      const r = data.refund as
        | { walletRestored?: number; stripeRefunds?: number; notes?: string[] }
        | undefined;
      setOk(
        `Refunded · wallet ${Number(r?.walletRestored || 0).toFixed(2)} AED · stripe ops ${r?.stripeRefunds || 0}`,
      );
      await load();
    } catch {
      setError('Could not refund order');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Refunds"
        description="Process refunds: restore wallet credits and reverse Stripe (or stub) captures."
      />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok}
        </div>
      ) : null}
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load().catch(() => setError('Failed to load orders'));
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order # / customer…"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          Search
        </button>
      </form>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Order status</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/orders/${o.id}`} className="text-teal-700 hover:underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {o.user
                    ? `${o.user.firstName} ${o.user.lastName}`.trim() || o.user.email
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <Price amount={o.total} />
                </td>
                <td className="px-4 py-3 text-xs">{o.status}</td>
                <td className="px-4 py-3 text-xs">{o.paymentStatus}</td>
                <td className="px-4 py-3">
                  {o.status !== 'REFUNDED' ? (
                    <input
                      value={notes[o.id] || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [o.id]: e.target.value }))}
                      placeholder="Refund note"
                      className="w-40 rounded border border-slate-300 px-2 py-1 text-xs"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {o.status !== 'REFUNDED' ? (
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => void markRefunded(o.id, o.total)}
                      className="text-sm font-medium text-teal-700 hover:underline disabled:opacity-60"
                    >
                      Process refund
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Refunded</span>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No refund candidates.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
