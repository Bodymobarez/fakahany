'use client';

import { useCallback, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Pending = {
  driverId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  deliveries: number;
  earned: number;
  alreadyPaid: number;
  due: number;
};

type Payout = {
  id: string;
  amount: number | string;
  periodFrom: string;
  periodTo: string;
  note?: string | null;
  status: string;
  createdAt: string;
  driver?: { user?: { firstName?: string; lastName?: string; email?: string | null } };
};

export default function DriverPayoutsPage() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, h] = await Promise.all([
      api.get('/api/admin/delivery/payouts/pending'),
      api.get('/api/admin/delivery/payouts'),
    ]);
    setPending(p.data.pending || []);
    setPayouts(h.data.payouts || []);
  }, []);

  useEffect(() => {
    void load().catch(() => setError('Failed to load payouts'));
  }, [load]);

  async function settle(row: Pending) {
    if (row.due <= 0) return;
    setBusyId(row.driverId);
    setError(null);
    setOk(null);
    try {
      await api.post('/api/admin/delivery/payouts/settle', {
        driverId: row.driverId,
        amount: row.due,
        note: 'Weekly settlement from admin',
      });
      setOk(`Settled ${row.name}: ${row.due.toFixed(2)} AED`);
      await load();
    } catch {
      setError('Settlement failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Driver payouts"
        description="Settle this week’s earnings (60% of delivery fee, min 5 AED per drop)."
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

      <h2 className="mb-2 text-sm font-semibold text-slate-800">Pending this week</h2>
      <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Drops</th>
              <th className="px-4 py-3 font-medium">Earned</th>
              <th className="px-4 py-3 font-medium">Paid</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {pending.map((row) => (
              <tr key={row.driverId} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{row.name}</div>
                  <div className="text-xs text-slate-400">{row.email || row.phone}</div>
                </td>
                <td className="px-4 py-3">{row.deliveries}</td>
                <td className="px-4 py-3">
                  <Price amount={row.earned} />
                </td>
                <td className="px-4 py-3">
                  <Price amount={row.alreadyPaid} />
                </td>
                <td className="px-4 py-3 font-semibold text-teal-800">
                  <Price amount={row.due} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={row.due <= 0 || busyId === row.driverId}
                    onClick={() => void settle(row)}
                    className="text-xs font-semibold text-teal-700 hover:underline disabled:opacity-40"
                  >
                    Settle
                  </button>
                </td>
              </tr>
            ))}
            {pending.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No driver activity this week.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-slate-800">Settlement history</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-600">
                  {new Date(p.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {[p.driver?.user?.firstName, p.driver?.user?.lastName].filter(Boolean).join(' ') ||
                    '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(p.periodFrom).toLocaleDateString()} –{' '}
                  {new Date(p.periodTo).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-medium">
                  <Price amount={p.amount} />
                </td>
                <td className="px-4 py-3 text-slate-500">{p.note || '—'}</td>
              </tr>
            ))}
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No settlements yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
