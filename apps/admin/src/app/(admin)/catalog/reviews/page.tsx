'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  isApproved: boolean;
  createdAt: string;
  product: { nameEn: string; sku: string };
  user: { firstName: string; lastName: string; email: string | null };
};

type Filter = 'ALL' | 'APPROVED' | 'HIDDEN';

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get('/api/admin/products/reviews/all');
    setReviews(data.reviews || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load reviews'));
  }, []);

  async function setApproved(id: string, isApproved: boolean) {
    await api.patch(`/api/admin/products/reviews/${id}`, { isApproved });
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, isApproved } : r)));
  }

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filter === 'APPROVED' && !r.isApproved) return false;
      if (filter === 'HIDDEN' && r.isApproved) return false;
      if (!needle) return true;
      const hay = [
        r.product.nameEn,
        r.product.sku,
        r.title || '',
        r.body || '',
        r.user.firstName,
        r.user.lastName,
        r.user.email || '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [reviews, filter, q]);

  return (
    <div>
      <PageHeader title="Product Reviews" description="Moderate customer reviews." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {(['ALL', 'APPROVED', 'HIDDEN'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              filter === f ? 'bg-teal-700 text-white' : 'border border-slate-300 text-slate-700'
            }`}
          >
            {f === 'ALL' ? 'All' : f === 'APPROVED' ? 'Approved' : 'Hidden'}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search product, customer, title…"
          className="min-w-[16rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-3">
        {visible.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">
                  {r.product.nameEn}{' '}
                  <span className="text-slate-400">({r.product.sku})</span>
                </p>
                <p className="text-xs text-amber-600">{'★'.repeat(r.rating)}</p>
                {r.title ? <p className="mt-1 text-sm font-semibold text-slate-800">{r.title}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => void setApproved(r.id, !r.isApproved)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  r.isApproved ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {r.isApproved ? 'Approved' : 'Hidden'} — toggle
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-700">{r.body || '—'}</p>
            <p className="mt-2 text-xs text-slate-400">
              {r.user.firstName} {r.user.lastName} · {new Date(r.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
        {visible.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews match this filter.</p>
        ) : null}
      </div>
    </div>
  );
}
