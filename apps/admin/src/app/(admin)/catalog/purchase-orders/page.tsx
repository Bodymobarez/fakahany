'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Supplier = { id: string; name: string };
type Warehouse = { id: string; code: string; name?: string };
type Product = { id: string; sku: string; nameEn: string; basePrice: number | string };
type PoLine = {
  id?: string;
  name: string;
  sku: string;
  qtyOrdered: number;
  qtyReceived?: number;
  unitCost: number | string;
};
type PO = {
  id: string;
  poNumber: string;
  status: string;
  total: number | string;
  notes?: string | null;
  expectedAt?: string | null;
  createdAt: string;
  supplier?: { name: string };
  warehouse?: { code: string };
  items: PoLine[];
};

type DraftLine = {
  key: string;
  productId: string;
  qty: string;
  unitCost: string;
};

const STATUSES = ['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'] as const;

function newDraftLine(products: Product[]): DraftLine {
  const p = products[0];
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: p?.id || '',
    qty: '10',
    unitCost: p ? String(p.basePrice) : '',
  };
}

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [expectedAt, setExpectedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [poRes, supRes, whRes, prodRes] = await Promise.all([
      api.get('/api/admin/suppliers/purchase-orders'),
      api.get('/api/admin/suppliers'),
      api.get('/api/admin/inventory/warehouses'),
      api.get('/api/admin/products').catch(() => ({ data: { products: [] } })),
    ]);
    setPos(poRes.data.purchaseOrders || []);
    setSuppliers(supRes.data.suppliers || []);
    setWarehouses(whRes.data.warehouses || []);
    const prods = (prodRes.data.products || []) as Product[];
    setProducts(prods);
    if (!supplierId && supRes.data.suppliers?.[0]) setSupplierId(supRes.data.suppliers[0].id);
    if (!warehouseId && whRes.data.warehouses?.[0]) setWarehouseId(whRes.data.warehouses[0].id);
    setLines((prev) => (prev.length ? prev : [newDraftLine(prods)]));

    const drafts: Record<string, string> = {};
    for (const po of poRes.data.purchaseOrders || []) {
      for (const item of po.items || []) {
        if (!item.id) continue;
        const remaining = item.qtyOrdered - (item.qtyReceived || 0);
        if (remaining > 0) drafts[item.id] = String(remaining);
      }
    }
    setReceiveQty((prev) => ({ ...drafts, ...prev }));
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load purchase orders'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!supplierId || !warehouseId || !lines.length) return;
    const items = lines
      .map((l) => {
        const product = products.find((p) => p.id === l.productId);
        if (!product) return null;
        return {
          productId: product.id,
          sku: product.sku,
          name: product.nameEn,
          qtyOrdered: Math.max(1, Math.floor(Number(l.qty) || 1)),
          unitCost: Number(l.unitCost || product.basePrice),
        };
      })
      .filter(Boolean);
    if (!items.length) {
      setError('Add at least one product line');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/admin/suppliers/purchase-orders', {
        supplierId,
        warehouseId,
        expectedAt: expectedAt ? new Date(expectedAt).toISOString() : null,
        notes: notes.trim() || null,
        items,
      });
      setNotes('');
      setExpectedAt('');
      setLines([newDraftLine(products)]);
      await load();
    } catch {
      setError('Could not create purchase order');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    setBusy(true);
    try {
      await api.patch(`/api/admin/suppliers/purchase-orders/${id}/status`, { status });
      await load();
    } catch {
      setError('Status update failed');
    } finally {
      setBusy(false);
    }
  }

  async function receivePo(po: PO, mode: 'all' | 'partial') {
    setBusy(true);
    setError(null);
    try {
      let body: { items?: Array<{ itemId: string; qty: number }> } = {};
      if (mode === 'partial') {
        const items = po.items
          .filter((i) => i.id)
          .map((i) => {
            const remaining = i.qtyOrdered - (i.qtyReceived || 0);
            const qty = Math.min(
              remaining,
              Math.max(0, Math.floor(Number(receiveQty[i.id!]) || 0)),
            );
            return { itemId: i.id!, qty };
          })
          .filter((i) => i.qty > 0);
        if (!items.length) {
          setError('Enter receive qty for at least one line');
          setBusy(false);
          return;
        }
        body = { items };
      }
      await api.post(`/api/admin/suppliers/purchase-orders/${po.id}/receive`, body);
      await load();
    } catch {
      setError('Receive into stock failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Purchase Orders" description="Create and track supplier POs." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void onCreate(e)}
        className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={expectedAt}
            onChange={(e) => setExpectedAt(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Expected"
          />
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Notes (optional)"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Lines</p>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, newDraftLine(products)])}
              className="text-xs text-teal-700 underline"
            >
              Add line
            </button>
          </div>
          {lines.map((l) => (
            <div key={l.key} className="grid gap-2 md:grid-cols-4">
              <select
                value={l.productId}
                onChange={(e) => {
                  const p = products.find((x) => x.id === e.target.value);
                  updateLine(l.key, {
                    productId: e.target.value,
                    unitCost: p ? String(p.basePrice) : l.unitCost,
                  });
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameEn} ({p.sku})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={l.qty}
                onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Qty"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.unitCost}
                  onChange={(e) => updateLine(l.key, { unitCost: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Unit cost"
                />
                {lines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                    className="text-xs text-red-600 underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={busy || !products.length}
          className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Create draft PO
        </button>
      </form>

      <div className="space-y-3">
        {pos.map((po) => (
          <div key={po.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{po.poNumber}</p>
                <p className="text-xs text-slate-500">
                  {po.supplier?.name} · {po.warehouse?.code} ·{' '}
                  {new Date(po.createdAt).toLocaleString()}
                  {po.expectedAt
                    ? ` · expected ${new Date(po.expectedAt).toLocaleDateString()}`
                    : ''}
                </p>
                {po.notes ? <p className="mt-1 text-xs text-slate-500">{po.notes}</p> : null}
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {po.items.map((i, idx) => {
                    const remaining = i.qtyOrdered - (i.qtyReceived || 0);
                    return (
                      <li
                        key={i.id || `${i.sku}-${idx}`}
                        className="flex flex-wrap items-center gap-3 border-t border-slate-50 pt-2 first:border-0 first:pt-0"
                      >
                        <span className="min-w-[12rem] flex-1">
                          {i.name} · ordered {i.qtyOrdered}
                          {typeof i.qtyReceived === 'number' ? ` · recv ${i.qtyReceived}` : ''} ×{' '}
                          <Price amount={i.unitCost} />
                        </span>
                        {po.status !== 'RECEIVED' &&
                        po.status !== 'CANCELLED' &&
                        i.id &&
                        remaining > 0 ? (
                          <label className="flex items-center gap-1 text-xs text-slate-500">
                            Recv
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              className="w-16 rounded border border-slate-300 px-1.5 py-1 text-sm"
                              value={receiveQty[i.id] ?? String(remaining)}
                              onChange={(e) =>
                                setReceiveQty((prev) => ({ ...prev, [i.id!]: e.target.value }))
                              }
                            />
                            <span>/ {remaining}</span>
                          </label>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  <Price amount={po.total} />
                </p>
                <select
                  disabled={busy}
                  value={po.status}
                  onChange={(e) => void setStatus(po.id, e.target.value)}
                  className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' ? (
                  <div className="mt-2 space-y-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void receivePo(po, 'partial')}
                      className="block w-full rounded-md bg-teal-700 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Receive entered qty
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void receivePo(po, 'all')}
                      className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Receive all remaining
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {pos.length === 0 ? <p className="text-sm text-slate-500">No purchase orders yet.</p> : null}
      </div>
    </div>
  );
}
