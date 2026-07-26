'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Sub = {
  id: string;
  planCode: string;
  status: string;
  startsAt: string;
  meta?: {
    nextRunAt?: string;
    lastOrderNumber?: string;
    productIds?: string[];
    addressId?: string | null;
  } | null;
  user?: { email?: string | null; firstName?: string | null; lastName?: string | null };
};

export default function AdminSubscriptionsPage() {
  const [items, setItems] = useState<Sub[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/api/expansion/subscriptions/admin');
    setItems(data.subscriptions || []);
  }, []);

  useEffect(() => {
    void load().catch(() => setError('Failed to load subscriptions'));
  }, [load]);

  async function runCycle() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { data } = await api.post<{ created: number; orderNumbers: string[] }>(
        '/api/expansion/subscriptions/run-cycle',
      );
      setOk(`Created ${data.created} order(s)${data.orderNumbers?.length ? `: ${data.orderNumbers.join(', ')}` : ''}`);
      await load();
    } catch {
      setError('Cycle run failed');
    } finally {
      setBusy(false);
    }
  }

  async function cancelSub(id: string) {
    if (!confirm('Cancel this subscription?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/expansion/subscriptions/admin/${id}/cancel`);
      setOk('Subscription cancelled');
      await load();
    } catch {
      setError('Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  async function togglePause(s: Sub) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/expansion/subscriptions/admin/${s.id}/pause`);
      setOk(s.status === 'PAUSED' ? 'Subscription resumed' : 'Subscription paused');
      await load();
    } catch {
      setError('Status update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Recurring plans. Run a cycle to generate COD orders for due subscriptions."
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

      <button
        type="button"
        disabled={busy}
        onClick={() => void runCycle()}
        className="mb-6 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
      >
        {busy ? 'Running…' : 'Run fulfillment cycle now'}
      </button>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Box</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Next run</th>
              <th className="px-4 py-3 font-medium">Last order</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">
                    {[s.user?.firstName, s.user?.lastName].filter(Boolean).join(' ') || '—'}
                  </div>
                  <div className="text-xs text-slate-400">{s.user?.email}</div>
                </td>
                <td className="px-4 py-3">{s.planCode}</td>
                <td className="px-4 py-3 text-slate-600">
                  {s.meta?.productIds?.length ? `${s.meta.productIds.length} SKUs` : 'Featured'}
                </td>
                <td className="px-4 py-3">{s.status}</td>
                <td className="px-4 py-3 text-slate-600">
                  {s.meta?.nextRunAt ? new Date(s.meta.nextRunAt).toLocaleString() : 'Due'}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.meta?.lastOrderNumber || '—'}</td>
                <td className="px-4 py-3">
                  {s.status !== 'CANCELLED' ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs font-semibold text-slate-600 hover:underline disabled:opacity-50"
                        onClick={() => void togglePause(s)}
                      >
                        {s.status === 'PAUSED' ? 'Resume' : 'Pause'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                        onClick={() => void cancelSub(s.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No subscriptions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
