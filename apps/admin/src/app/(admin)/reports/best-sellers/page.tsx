'use client';

import { useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Row = {
  productId: string;
  nameEn: string;
  sku: string;
  _sum: { quantity: number | null; lineTotal: number | string | null };
};

export default function BestSellersPage() {
  const [products, setProducts] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api
      .get('/api/admin/reports/top-products')
      .then(({ data }) => setProducts(data.products || []))
      .catch(() => setError('Failed to load best sellers'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Best Sellers" description="Top products by units sold." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {loading ? <p className="mb-4 text-sm text-slate-500">Loading…</p> : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Qty sold</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={`${p.productId}-${p.sku}`} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{p.nameEn}</td>
                <td className="px-4 py-3 text-slate-600">{p.sku}</td>
                <td className="px-4 py-3">{p._sum.quantity ?? 0}</td>
                <td className="px-4 py-3">
                  <Price amount={p._sum.lineTotal ?? 0} />
                </td>
              </tr>
            ))}
            {!loading && products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No sales data yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
