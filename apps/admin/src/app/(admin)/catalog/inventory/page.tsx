'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Level = {
  id: string;
  qty: number;
  reorderLevel: number;
  product?: { id?: string; nameEn?: string; sku?: string };
  warehouse?: { id?: string; name?: string };
};

type Warehouse = { id: string; name: string };
type Product = { id: string; nameEn: string; sku: string };
type Variant = { id: string; name: string; sku: string; isActive?: boolean };
type Batch = {
  id: string;
  batchNumber: string;
  qty: number;
  expiryDate: string | null;
  product?: { nameEn?: string; sku?: string };
  warehouse?: { name?: string };
};
type Movement = {
  id: string;
  type: string;
  qty: number;
  createdAt: string;
  reference?: string | null;
  product?: { nameEn?: string };
  warehouse?: { name?: string };
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function InventoryPage() {
  const [tab, setTab] = useState<'levels' | 'receive' | 'adjust' | 'transfer' | 'batches' | 'movements'>(
    'levels',
  );
  const [levels, setLevels] = useState<Level[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expiringOnly, setExpiringOnly] = useState(true);
  const [form, setForm] = useState({
    warehouseId: '',
    productId: '',
    variantId: '',
    qty: '10',
    batchNumber: '',
    lotNumber: '',
    expiryDate: '',
  });
  const [adjustForm, setAdjustForm] = useState({
    warehouseId: '',
    productId: '',
    variantId: '',
    qtyDelta: '1',
    type: 'ADJUSTMENT',
    note: '',
  });
  const [transferForm, setTransferForm] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    productId: '',
    variantId: '',
    qty: '1',
    note: '',
  });
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, Variant[]>>({});
  const [reorderDrafts, setReorderDrafts] = useState<Record<string, string>>({});

  async function ensureVariants(productId: string) {
    if (!productId || variantsByProduct[productId]) return;
    try {
      const { data } = await api.get(`/api/admin/products/${productId}`);
      const list = ((data.product?.variants || []) as Variant[]).filter((v) => v.isActive !== false);
      setVariantsByProduct((prev) => ({ ...prev, [productId]: list }));
    } catch {
      setVariantsByProduct((prev) => ({ ...prev, [productId]: [] }));
    }
  }

  async function saveReorder(levelId: string) {
    const raw = reorderDrafts[levelId];
    if (raw === undefined) return;
    const reorderLevel = Math.max(0, Math.floor(Number(raw) || 0));
    setError(null);
    setOk(null);
    try {
      const { data } = await api.patch(`/api/admin/inventory/levels/${levelId}`, { reorderLevel });
      setLevels((prev) => prev.map((l) => (l.id === levelId ? { ...l, ...data.level } : l)));
      setReorderDrafts((prev) => {
        const next = { ...prev };
        delete next[levelId];
        return next;
      });
      setOk('Reorder level updated');
    } catch {
      setError('Could not update reorder level');
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [levelsRes, whRes, productsRes, batchesRes, movRes] = await Promise.all([
        api.get('/api/admin/inventory/levels'),
        api.get('/api/admin/inventory/warehouses'),
        api.get('/api/admin/products'),
        api.get('/api/admin/inventory/batches', {
          params: expiringOnly ? { expiringSoon: 'true', days: 21 } : {},
        }),
        api.get('/api/admin/inventory/movements'),
      ]);
      setLevels(levelsRes.data.levels || []);
      setWarehouses(whRes.data.warehouses || []);
      setProducts(
        (productsRes.data.products || []).map((p: Product) => ({
          id: p.id,
          nameEn: p.nameEn,
          sku: p.sku,
        })),
      );
      setBatches(batchesRes.data.batches || []);
      setMovements(movRes.data.movements || []);
      const firstWh = whRes.data.warehouses?.[0]?.id || '';
      const secondWh = whRes.data.warehouses?.[1]?.id || firstWh;
      const firstProduct = productsRes.data.products?.[0]?.id || '';
      if (!form.warehouseId && firstWh) {
        setForm((f) => ({ ...f, warehouseId: firstWh }));
      }
      if (!form.productId && firstProduct) {
        setForm((f) => ({ ...f, productId: firstProduct }));
      }
      setAdjustForm((f) => ({
        ...f,
        warehouseId: f.warehouseId || firstWh,
        productId: f.productId || firstProduct,
      }));
      setTransferForm((f) => ({
        ...f,
        fromWarehouseId: f.fromWarehouseId || firstWh,
        toWarehouseId: f.toWarehouseId || secondWh,
        productId: f.productId || firstProduct,
      }));
    } catch {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiringOnly]);

  async function onReceive(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api.post('/api/admin/inventory/receive', {
        warehouseId: form.warehouseId,
        productId: form.productId,
        variantId: form.variantId || null,
        qty: Number(form.qty),
        batchNumber: form.batchNumber || `RCV-${Date.now()}`,
        lotNumber: form.lotNumber || undefined,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      });
      setOk('Stock received (FEFO batch created)');
      setForm((f) => ({ ...f, qty: '10', batchNumber: '', lotNumber: '' }));
      await load();
      setTab('batches');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Receive failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function onAdjust(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api.post('/api/admin/inventory/adjust', {
        warehouseId: adjustForm.warehouseId,
        productId: adjustForm.productId,
        variantId: adjustForm.variantId || null,
        qtyDelta: Number(adjustForm.qtyDelta),
        type: adjustForm.type,
        note: adjustForm.note || null,
      });
      setOk('Stock adjusted');
      await load();
      setTab('movements');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Adjust failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function onTransfer(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api.post('/api/admin/inventory/transfer', {
        fromWarehouseId: transferForm.fromWarehouseId,
        toWarehouseId: transferForm.toWarehouseId,
        productId: transferForm.productId,
        variantId: transferForm.variantId || null,
        qty: Number(transferForm.qty),
        note: transferForm.note || null,
      });
      setOk('Stock transferred');
      await load();
      setTab('movements');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Transfer failed',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels, FEFO batches, receive / adjust / transfer, and movements."
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

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['levels', 'Levels'],
            ['receive', 'Receive'],
            ['adjust', 'Adjust'],
            ['transfer', 'Transfer'],
            ['batches', 'Batches'],
            ['movements', 'Movements'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              tab === id ? 'bg-teal-700 text-white' : 'border border-slate-300 text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'receive' ? (
        <form
          onSubmit={(e) => void onReceive(e)}
          className="mb-6 max-w-2xl space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-800">Receive stock (creates FEFO batch)</h2>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Warehouse</span>
            <select
              required
              className={fieldClass}
              value={form.warehouseId}
              onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Product</span>
            <select
              required
              className={fieldClass}
              value={form.productId}
              onChange={(e) => {
                const productId = e.target.value;
                setForm({ ...form, productId, variantId: '' });
                void ensureVariants(productId);
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameEn} ({p.sku})
                </option>
              ))}
            </select>
          </label>
          {(variantsByProduct[form.productId] || []).length ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Variant (optional)</span>
              <select
                className={fieldClass}
                value={form.variantId}
                onChange={(e) => setForm({ ...form, variantId: e.target.value })}
              >
                <option value="">Base product</option>
                {(variantsByProduct[form.productId] || []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.sku})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Qty</span>
              <input
                type="number"
                min={1}
                required
                className={fieldClass}
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Expiry date</span>
              <input
                type="date"
                className={fieldClass}
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Batch number</span>
              <input
                className={fieldClass}
                placeholder="Auto if empty"
                value={form.batchNumber}
                onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Lot number</span>
              <input
                className={fieldClass}
                value={form.lotNumber}
                onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? 'Receiving…' : 'Receive stock'}
          </button>
        </form>
      ) : null}

      {tab === 'adjust' ? (
        <form
          onSubmit={(e) => void onAdjust(e)}
          className="mb-6 max-w-2xl space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-800">
            Adjust stock (positive = in, negative = write-off)
          </h2>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Warehouse</span>
            <select
              required
              className={fieldClass}
              value={adjustForm.warehouseId}
              onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Product</span>
            <select
              required
              className={fieldClass}
              value={adjustForm.productId}
              onChange={(e) => {
                const productId = e.target.value;
                setAdjustForm({ ...adjustForm, productId, variantId: '' });
                void ensureVariants(productId);
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameEn} ({p.sku})
                </option>
              ))}
            </select>
          </label>
          {(variantsByProduct[adjustForm.productId] || []).length ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Variant (optional)</span>
              <select
                className={fieldClass}
                value={adjustForm.variantId}
                onChange={(e) => setAdjustForm({ ...adjustForm, variantId: e.target.value })}
              >
                <option value="">Base product</option>
                {(variantsByProduct[adjustForm.productId] || []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.sku})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Qty delta</span>
              <input
                type="number"
                required
                className={fieldClass}
                value={adjustForm.qtyDelta}
                onChange={(e) => setAdjustForm({ ...adjustForm, qtyDelta: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Type</span>
              <select
                className={fieldClass}
                value={adjustForm.type}
                onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
              >
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="DAMAGED">Damaged</option>
                <option value="EXPIRED">Expired</option>
                <option value="CYCLE_COUNT">Cycle count</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Note</span>
            <input
              className={fieldClass}
              value={adjustForm.note}
              onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Apply adjustment'}
          </button>
        </form>
      ) : null}

      {tab === 'transfer' ? (
        <form
          onSubmit={(e) => void onTransfer(e)}
          className="mb-6 max-w-2xl space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-800">Transfer between warehouses</h2>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">From warehouse</span>
            <select
              required
              className={fieldClass}
              value={transferForm.fromWarehouseId}
              onChange={(e) =>
                setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })
              }
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">To warehouse</span>
            <select
              required
              className={fieldClass}
              value={transferForm.toWarehouseId}
              onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Product</span>
            <select
              required
              className={fieldClass}
              value={transferForm.productId}
              onChange={(e) => {
                const productId = e.target.value;
                setTransferForm({ ...transferForm, productId, variantId: '' });
                void ensureVariants(productId);
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameEn} ({p.sku})
                </option>
              ))}
            </select>
          </label>
          {(variantsByProduct[transferForm.productId] || []).length ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Variant (optional)</span>
              <select
                className={fieldClass}
                value={transferForm.variantId}
                onChange={(e) => setTransferForm({ ...transferForm, variantId: e.target.value })}
              >
                <option value="">Base product</option>
                {(variantsByProduct[transferForm.productId] || []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.sku})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Qty</span>
            <input
              type="number"
              min={1}
              required
              className={fieldClass}
              value={transferForm.qty}
              onChange={(e) => setTransferForm({ ...transferForm, qty: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Note</span>
            <input
              className={fieldClass}
              value={transferForm.note}
              onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? 'Transferring…' : 'Transfer stock'}
          </button>
        </form>
      ) : null}

      {tab === 'levels' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Reorder</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((l) => {
                const draft = reorderDrafts[l.id];
                const dirty = draft !== undefined && Number(draft) !== l.reorderLevel;
                return (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{l.product?.nameEn || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{l.product?.sku || '—'}</td>
                    <td className="px-4 py-3">{l.warehouse?.name || '—'}</td>
                    <td className="px-4 py-3">{l.qty}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                          value={draft ?? String(l.reorderLevel)}
                          onChange={(e) =>
                            setReorderDrafts((prev) => ({ ...prev, [l.id]: e.target.value }))
                          }
                        />
                        {dirty ? (
                          <button
                            type="button"
                            onClick={() => void saveReorder(l.id)}
                            className="text-xs text-teal-700 underline"
                          >
                            Save
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && levels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No stock levels recorded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'batches' ? (
        <div>
          <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={expiringOnly}
              onChange={(e) => setExpiringOnly(e.target.checked)}
            />
            Show expiring within 21 days only
          </label>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Warehouse</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{b.batchNumber}</td>
                    <td className="px-4 py-3">{b.product?.nameEn || '—'}</td>
                    <td className="px-4 py-3">{b.warehouse?.name || '—'}</td>
                    <td className="px-4 py-3">{b.qty}</td>
                    <td className="px-4 py-3">
                      {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {!loading && batches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No batches found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'movements' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Ref</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{m.type}</td>
                  <td className="px-4 py-3">{m.product?.nameEn || '—'}</td>
                  <td className="px-4 py-3">{m.qty}</td>
                  <td className="px-4 py-3 text-slate-500">{m.reference || '—'}</td>
                </tr>
              ))}
              {!loading && movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No movements yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
