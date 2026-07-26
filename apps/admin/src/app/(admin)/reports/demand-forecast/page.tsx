'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Forecast = {
  productId: string;
  sku: string;
  name: string;
  currentStock: number;
  suggestedReorderQty: number;
  unitCost?: number;
  confidence: number;
};

type Supplier = { id: string; name: string };
type Warehouse = { id: string; name: string };

export default function DemandForecastPage() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [engine, setEngine] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      api.get<{ engine: string; generatedAt: string; forecasts: Forecast[] }>(
        '/api/expansion/ai/demand-forecast',
      ),
      api.get('/api/admin/suppliers'),
      api.get('/api/admin/inventory/warehouses'),
    ])
      .then(([f, s, w]) => {
        setForecasts(f.data.forecasts || []);
        setEngine(f.data.engine || '');
        setGeneratedAt(f.data.generatedAt || '');
        setSuppliers(s.data.suppliers || []);
        setWarehouses(w.data.warehouses || []);
        if (s.data.suppliers?.[0]) setSupplierId(s.data.suppliers[0].id);
        if (w.data.warehouses?.[0]) setWarehouseId(w.data.warehouses[0].id);
      })
      .catch(() => setError('Failed to load demand forecast'))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function createPo(rows: Forecast[]) {
    if (!supplierId || !warehouseId || !rows.length) {
      setError('Pick supplier, warehouse, and at least one SKU');
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { data } = await api.post('/api/admin/suppliers/purchase-orders', {
        supplierId,
        warehouseId,
        notes: 'Created from demand forecast',
        items: rows.map((r) => ({
          productId: r.productId,
          sku: r.sku,
          name: r.name,
          qtyOrdered: r.suggestedReorderQty,
          unitCost: Math.round((r.unitCost || 1) * 100) / 100,
        })),
      });
      setOk(`PO ${data.purchaseOrder.poNumber} created (${rows.length} line(s))`);
      setSelected([]);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not create PO',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Demand forecast"
        description="Stub reorder suggestions — create draft purchase orders in one click."
      />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok}
        </div>
      ) : null}
      {loading ? <p className="mb-4 text-sm text-slate-500">Loading…</p> : null}
      {!loading && !error ? (
        <p className="mb-4 text-xs text-slate-500">
          Engine: {engine || '—'}
          {generatedAt ? ` · Generated ${new Date(generatedAt).toLocaleString()}` : null}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Supplier</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Warehouse</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || !selected.length}
          onClick={() =>
            void createPo(forecasts.filter((f) => selected.includes(f.productId)))
          }
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Create PO for selected ({selected.length})
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3" />
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Suggested reorder</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {forecasts.map((f) => (
              <tr key={f.productId} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(f.productId)}
                    onChange={() => toggle(f.productId)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{f.name}</td>
                <td className="px-4 py-3 text-slate-500">{f.sku}</td>
                <td className="px-4 py-3 text-amber-700">{f.currentStock}</td>
                <td className="px-4 py-3 font-semibold text-emerald-700">
                  {f.suggestedReorderQty}
                </td>
                <td className="px-4 py-3">{Math.round(f.confidence * 100)}%</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void createPo([f])}
                    className="text-sm font-medium text-teal-700 hover:underline disabled:opacity-60"
                  >
                    Create PO
                  </button>
                </td>
              </tr>
            ))}
            {!loading && forecasts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No reorder suggestions right now.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
