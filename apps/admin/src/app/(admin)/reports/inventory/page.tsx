'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Level = {
  id: string;
  qty: number;
  reorderLevel: number;
  product: { nameEn: string; sku: string };
  warehouse: { name: string; code: string };
};

type Product = { id: string; nameEn: string; sku: string; stockQty: number };

export default function InventoryReportPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api
      .get('/api/admin/reports/low-stock')
      .then(({ data }) => {
        setLevels(data.levels || []);
        setProducts(data.products || []);
      })
      .catch(() => setError('Failed to load inventory report'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Inventory Report" description="Low stock and reorder alerts." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {loading ? <p className="mb-4 text-sm text-slate-500">Loading…</p> : null}

      <h2 className="mb-2 text-sm font-semibold text-slate-800">Warehouse levels at/below reorder</h2>
      <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Warehouse</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Reorder at</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  {l.product.nameEn}{' '}
                  <span className="text-slate-400">({l.product.sku})</span>
                </td>
                <td className="px-4 py-3">{l.warehouse.name}</td>
                <td className="px-4 py-3 font-medium text-amber-700">{l.qty}</td>
                <td className="px-4 py-3">{l.reorderLevel}</td>
              </tr>
            ))}
            {!loading && levels.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No low warehouse levels.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-slate-800">Products with stock ≤ 10</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{p.nameEn}</td>
                <td className="px-4 py-3">{p.sku}</td>
                <td className="px-4 py-3 text-amber-700">{p.stockQty}</td>
              </tr>
            ))}
            {!loading && products.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  No low-stock products.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
