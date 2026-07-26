'use client';

import { useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Payment = {
  id: string;
  provider: string;
  amount: number | string;
  status: string;
  createdAt: string;
  order: { orderNumber: string };
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<{
    orders: { count: number; total: number; tax: number };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      api.get('/api/admin/finance/payments'),
      api.get('/api/admin/finance/summary'),
    ])
      .then(([payRes, sumRes]) => {
        setPayments(payRes.data.payments || []);
        setSummary(sumRes.data);
      })
      .catch(() => setError('Failed to load payments'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Payments" description="Gateway and COD payment records." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {summary ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Orders</p>
            <p className="mt-1 text-2xl font-semibold">{summary.orders.count}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Gross</p>
            <Price
              amount={summary.orders.total}
              className="mt-1 inline-flex items-center gap-1 text-2xl font-semibold"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">VAT collected</p>
            <Price
              amount={summary.orders.tax}
              className="mt-1 inline-flex items-center gap-1 text-2xl font-semibold"
            />
          </div>
        </div>
      ) : null}

      {loading ? <p className="mb-4 text-sm text-slate-500">Loading…</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{p.order.orderNumber}</td>
                <td className="px-4 py-3">{p.provider}</td>
                <td className="px-4 py-3">
                  <Price amount={p.amount} />
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(p.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {!loading && payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No payments yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
