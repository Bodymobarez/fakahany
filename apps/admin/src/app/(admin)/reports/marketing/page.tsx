'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

export default function MarketingReportPage() {
  const [campaigns, setCampaigns] = useState<
    Array<{ channel: string; status: string; _count: number; _sum: { sentCount: number | null } }>
  >([]);
  const [coupons, setCoupons] = useState<
    Array<{ code: string; usedCount: number; isActive: boolean }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get('/api/admin/reports/marketing')
      .then(({ data }) => {
        setCampaigns(data.campaigns || []);
        setCoupons(data.coupons || []);
      })
      .catch(() => setError('Failed to load marketing report'));
  }, []);

  return (
    <div>
      <PageHeader title="Marketing Report" description="Campaign sends and coupon usage." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <h2 className="mb-2 text-sm font-semibold">Campaigns</h2>
      <ul className="mb-8 space-y-2">
        {campaigns.map((c) => (
          <li
            key={`${c.channel}-${c.status}`}
            className="flex justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <span>
              {c.channel} · {c.status}
            </span>
            <span>
              {c._count} · sent {c._sum.sentCount ?? 0}
            </span>
          </li>
        ))}
        {campaigns.length === 0 ? <li className="text-sm text-slate-500">No campaigns.</li> : null}
      </ul>
      <h2 className="mb-2 text-sm font-semibold">Top coupons</h2>
      <ul className="space-y-2">
        {coupons.map((c) => (
          <li
            key={c.code}
            className="flex justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <span className="font-medium">{c.code}</span>
            <span>
              {c.usedCount} uses · {c.isActive ? 'active' : 'off'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
