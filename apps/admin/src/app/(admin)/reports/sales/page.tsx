'use client';

import { useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type SeriesRow = { date: string; orders: number; revenue: number; tax: number };
type Totals = { orders: number; revenue: number; tax: number };

export default function SalesReportPage() {
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void api
      .get(`/api/admin/reports/sales?days=${days}`)
      .then(({ data }) => {
        setSeries(data.series || []);
        setTotals(data.totals || null);
      })
      .catch(() => setError('Failed to load sales report'))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <PageHeader
        title="Sales Report"
        description="Revenue and order volume by day."
        actions={
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {totals ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Orders</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totals.orders}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Revenue</p>
            <Price
              amount={totals.revenue}
              className="mt-1 inline-flex items-center gap-1 text-2xl font-semibold text-slate-900"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">VAT</p>
            <Price
              amount={totals.tax}
              className="mt-1 inline-flex items-center gap-1 text-2xl font-semibold text-slate-900"
            />
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
              <th className="px-4 py-3 font-medium">VAT</th>
            </tr>
          </thead>
          <tbody>
            {series.map((row) => (
              <tr key={row.date} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-800">{row.date}</td>
                <td className="px-4 py-3">{row.orders}</td>
                <td className="px-4 py-3">
                  <Price amount={row.revenue} />
                </td>
                <td className="px-4 py-3">
                  <Price amount={row.tax} />
                </td>
              </tr>
            ))}
            {!loading && series.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No sales in this period.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
