'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';

type Vendor = {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  _count?: { products: number };
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ vendors: Vendor[] }>('/api/expansion/vendors')
      .then(({ data }) => setVendors(data.vendors || []))
      .catch(() => setError('Could not load vendors'));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-leaf-900">Marketplace vendors</h1>
      <p className="mt-2 text-sm text-ink/65">
        Partner farms and suppliers on Fresh Harvest.
      </p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {vendors.map((v) => (
          <li key={v.id} className="rounded-2xl border border-leaf-200 bg-white/80 p-5">
            <p className="font-display text-xl font-semibold text-leaf-900">{v.name}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-leaf-600">{v.slug}</p>
            <p className="mt-3 text-sm text-ink/60">
              {v._count?.products ?? 0} products
              {v.phone ? ` · ${v.phone}` : ''}
            </p>
            <Link
              href={`/vendors/${v.slug}`}
              className="mt-4 inline-block text-sm font-medium text-leaf-700 underline"
            >
              View vendor
            </Link>
          </li>
        ))}
      </ul>
      {!error && vendors.length === 0 ? (
        <p className="mt-8 text-sm text-ink/55">No vendors listed yet.</p>
      ) : null}
    </div>
  );
}
