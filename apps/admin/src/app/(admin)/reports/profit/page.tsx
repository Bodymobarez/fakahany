'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Pl = {
  income: number;
  expenses: number;
  netProfit: number;
  taxCollected: number;
  orderCount: number;
  period?: { from: string; to: string };
};

function yearStart() {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ProfitReportPage() {
  const [data, setData] = useState<Pl | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);

  async function load(fromDate = from, toDate = to) {
    setLoading(true);
    setError(null);
    try {
      const { data: d } = await api.get('/api/admin/finance/profit-loss', {
        params: { from: fromDate, to: toDate },
      });
      setData(d);
    } catch {
      setError('Failed to load P&L');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFilter(e: FormEvent) {
    e.preventDefault();
    void load(from, to);
  }

  return (
    <div>
      <PageHeader title="Profit Report" description="Income vs expenses for a chosen period." />
      <form
        onSubmit={onFilter}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">From</span>
          <input
            type="date"
            required
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">To</span>
          <input
            type="date"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </form>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Income" amount={data.income} />
          <Stat label="Expenses" amount={data.expenses} />
          <Stat label="Net profit" amount={data.netProfit} />
          <Stat label="VAT collected" amount={data.taxCollected} />
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 xl:col-span-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Orders in period</p>
            <p className="mt-1 text-2xl font-semibold">{data.orderCount}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Loading…</p>
      )}
    </div>
  );
}

function Stat({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <Price amount={amount} className="mt-1 inline-flex items-center gap-1 text-2xl font-semibold" />
    </div>
  );
}
