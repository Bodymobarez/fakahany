'use client';

import { useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

export default function CustomersReportPage() {
  const [total, setTotal] = useState(0);
  const [new30, setNew30] = useState(0);
  const [top, setTop] = useState<
    Array<{ userId: string; name: string; email?: string | null; orders: number; spend: number }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get('/api/admin/reports/customers')
      .then(({ data }) => {
        setTotal(data.total || 0);
        setNew30(data.new30 || 0);
        setTop(data.topCustomers || []);
      })
      .catch(() => setError('Failed to load report'));
  }, []);

  return (
    <div>
      <PageHeader title="Customers Report" description="Acquisition and top spenders." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Total customers</p>
          <p className="mt-1 text-2xl font-semibold">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">New (30 days)</p>
          <p className="mt-1 text-2xl font-semibold">{new30}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 font-medium">Spend</th>
            </tr>
          </thead>
          <tbody>
            {top.map((c) => (
              <tr key={c.userId} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.email}</p>
                </td>
                <td className="px-4 py-3">{c.orders}</td>
                <td className="px-4 py-3">
                  <Price amount={c.spend} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
