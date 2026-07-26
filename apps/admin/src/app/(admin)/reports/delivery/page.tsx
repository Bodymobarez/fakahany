'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

export default function DeliveryReportPage() {
  const [data, setData] = useState<{
    open: number;
    delivered: number;
    drivers: number;
    byStatus: Array<{ status: string; _count: number }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get('/api/admin/reports/delivery')
      .then(({ data: d }) => setData(d))
      .catch(() => setError('Failed to load delivery report'));
  }, []);

  return (
    <div>
      <PageHeader title="Delivery Report" description="Assignment throughput and status mix." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {data ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Open assignments" value={data.open} />
            <Stat label="Delivered" value={data.delivered} />
            <Stat label="Active drivers" value={data.drivers} />
          </div>
          <ul className="space-y-2">
            {data.byStatus.map((s) => (
              <li
                key={s.status}
                className="flex justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <span>{s.status}</span>
                <span className="font-semibold">{s._count}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-slate-500">Loading…</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
