'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatProductMeasure } from '@fv/shared';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Product = {
  id: string;
  nameEn: string;
  sku: string;
  basePrice: number | string;
  soldAs?: string | null;
  weight?: number | string | null;
  unit?: string | null;
  packageSize?: string | null;
  stockQty: number;
  isActive: boolean;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(search?: string) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/products', {
        params: search ? { q: search } : undefined,
      });
      setProducts(data.products || []);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load products',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Products"
        description="Catalog list with create and edit."
        actions={
          <Link
            href="/catalog/products/new"
            className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Add product
          </Link>
        }
      />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or SKU"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          Search
        </button>
      </form>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Sold as / weight</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const measure = formatProductMeasure({
                soldAs: p.soldAs,
                weight: p.weight,
                unit: p.unit,
                packageSize: p.packageSize,
              });
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nameEn}</td>
                  <td className="px-4 py-3 text-slate-500">{p.sku}</td>
                  <td className="px-4 py-3 text-slate-600">{measure || '—'}</td>
                  <td className="px-4 py-3">
                    <Price amount={p.basePrice} />
                  </td>
                  <td className="px-4 py-3">{p.stockQty}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/catalog/products/${p.id}`} className="text-teal-700 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!loading && products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No products found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
