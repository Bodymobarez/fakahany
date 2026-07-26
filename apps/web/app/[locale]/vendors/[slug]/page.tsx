'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Price } from '@fv/ui';
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

type Product = {
  id: string;
  slug: string;
  nameEn: string;
  basePrice: number | string;
  images?: Array<{ url: string }>;
};

export default function VendorDetailPage() {
  const params = useParams<{ slug: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.slug) return;
    void Promise.all([
      api.get<{ vendor: Vendor }>(`/api/expansion/vendors/${params.slug}`),
      api.get<{ products: Product[] }>(`/api/catalog/products?vendor=${encodeURIComponent(params.slug)}&limit=48`),
    ])
      .then(([vRes, pRes]) => {
        setVendor(vRes.data.vendor);
        setProducts(pRes.data.products || []);
      })
      .catch(() => setError('Vendor not found'));
  }, [params.slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/vendors" className="mt-6 inline-block text-leaf-700 underline">
          All vendors
        </Link>
      </div>
    );
  }

  if (!vendor) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-sm text-ink/60">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <Link href="/vendors" className="text-sm font-medium text-leaf-700 hover:underline">
        ← Vendors
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold text-leaf-900">{vendor.name}</h1>
      <p className="mt-2 text-sm text-ink/60">
        {vendor._count?.products ?? products.length} products
        {vendor.phone ? ` · ${vendor.phone}` : ''}
        {vendor.email ? ` · ${vendor.email}` : ''}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            className="rounded-2xl border border-leaf-200 bg-white/80 p-4 transition hover:border-leaf-400"
          >
            <p className="font-semibold text-leaf-900">{p.nameEn}</p>
            <p className="mt-2 text-sm text-leaf-700">
              <Price amount={p.basePrice} className="inline-flex items-center gap-1" />
            </p>
          </Link>
        ))}
      </div>
      {products.length === 0 ? (
        <p className="mt-8 text-sm text-ink/55">No products linked to this vendor yet.</p>
      ) : null}
    </div>
  );
}
