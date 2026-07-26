'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type VatLine = {
  orderNumber: string;
  invoiceNumber?: string | null;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  createdAt: string;
  trnSnap?: string | null;
};

type VatReport = {
  company?: { name?: string | null; trn?: string | null; vatRate?: number };
  period?: { from: string; to: string };
  summary?: {
    orderCount: number;
    taxableAmount: number;
    vatAmount: number;
    gross: number;
  };
  lines?: VatLine[];
  ftaNote?: string;
};

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function VatReportsPage() {
  const [report, setReport] = useState<VatReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  async function load(fromDate = from, toDate = to) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/finance/vat-report', {
        params: { from: fromDate, to: toDate },
      });
      setReport(data);
    } catch {
      setError('Failed to load VAT report');
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

  const summary = report?.summary;

  return (
    <div>
      <PageHeader
        title="VAT Reports"
        description="FTA-oriented output tax from orders (company TRN + invoice lines)."
      />
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
      {report?.company ? (
        <p className="mb-4 text-sm text-slate-600">
          {report.company.name || 'Company'} · TRN {report.company.trn || '—'} · Rate{' '}
          {report.company.vatRate ?? 5}%
          {report.period
            ? ` · ${new Date(report.period.from).toLocaleDateString()} – ${new Date(report.period.to).toLocaleDateString()}`
            : null}
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Taxable sales</div>
          <div className="mt-1">
            <Price amount={summary?.taxableAmount || 0} className="text-xl font-semibold" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">VAT collected</div>
          <div className="mt-1">
            <Price amount={summary?.vatAmount || 0} className="text-xl font-semibold" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Orders</div>
          <div className="mt-1 text-xl font-semibold">{summary?.orderCount ?? 0}</div>
        </div>
      </div>

      {report?.ftaNote ? (
        <p className="mb-4 text-xs text-slate-500">{report.ftaNote}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Taxable</th>
              <th className="px-4 py-3 font-medium">VAT</th>
              <th className="px-4 py-3 font-medium">Gross</th>
            </tr>
          </thead>
          <tbody>
            {(report?.lines || []).map((l) => (
              <tr key={`${l.orderNumber}-${l.createdAt}`} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-500">
                  {new Date(l.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-medium">{l.orderNumber}</td>
                <td className="px-4 py-3 text-slate-500">{l.invoiceNumber || '—'}</td>
                <td className="px-4 py-3">
                  <Price amount={l.subtotal} />
                </td>
                <td className="px-4 py-3">
                  <Price amount={l.tax} />
                </td>
                <td className="px-4 py-3">
                  <Price amount={l.total} />
                </td>
              </tr>
            ))}
            {!loading && !(report?.lines || []).length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No VAT lines in this period.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
