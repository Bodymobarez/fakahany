'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type ProductOption = { id: string; nameEn: string; sku: string; basePrice: number | string };

type FlashSale = {
  id: string;
  nameEn: string;
  nameAr: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  items: {
    id: string;
    salePrice: number | string;
    stockLimit?: number | null;
    product: { id: string; nameEn: string; sku: string };
  }[];
};

type FormState = {
  nameEn: string;
  nameAr: string;
  startsAt: string;
  endsAt: string;
  productId: string;
  salePrice: string;
  stockLimit: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  nameEn: '',
  nameAr: '',
  startsAt: '',
  endsAt: '',
  productId: '',
  salePrice: '',
  stockLimit: '',
  isActive: true,
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FlashSalesPage() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, productsRes] = await Promise.all([
        api.get('/api/admin/marketing/flash-sales'),
        api.get('/api/admin/products'),
      ]);
      setSales(salesRes.data.sales || []);
      setProducts(productsRes.data.products || []);
    } catch {
      setError('Failed to load flash sales');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(sale: FlashSale) {
    const first = sale.items[0];
    setEditId(sale.id);
    setForm({
      nameEn: sale.nameEn,
      nameAr: sale.nameAr,
      startsAt: toLocalInput(sale.startsAt),
      endsAt: toLocalInput(sale.endsAt),
      productId: first?.product.id || '',
      salePrice: first ? String(first.salePrice) : '',
      stockLimit: first?.stockLimit != null ? String(first.stockLimit) : '',
      isActive: sale.isActive,
    });
    setOk(null);
    setError(null);
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const items =
        form.productId && form.salePrice
          ? [
              {
                productId: form.productId,
                salePrice: Number(form.salePrice),
                stockLimit: form.stockLimit ? Number(form.stockLimit) : null,
              },
            ]
          : [];
      const payload = {
        nameEn: form.nameEn.trim(),
        nameAr: form.nameAr.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        isActive: form.isActive,
        items,
      };
      if (editId) {
        await api.patch(`/api/admin/marketing/flash-sales/${editId}`, payload);
        setOk('Flash sale updated');
      } else {
        await api.post('/api/admin/marketing/flash-sales', payload);
        setOk('Flash sale created');
      }
      setEditId(null);
      setForm(emptyForm);
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(sale: FlashSale) {
    setBusyId(sale.id);
    setError(null);
    try {
      await api.patch(`/api/admin/marketing/flash-sales/${sale.id}`, {
        isActive: !sale.isActive,
      });
      await load();
    } catch {
      setError('Could not toggle status');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this flash sale?')) return;
    setBusyId(id);
    try {
      await api.delete(`/api/admin/marketing/flash-sales/${id}`);
      if (editId === id) cancelEdit();
      setOk('Flash sale deleted');
      await load();
    } catch {
      setError('Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Flash Sales"
        description="Timed discounted offers — create, edit, activate, or delete."
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

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mb-6 max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit flash sale' : 'Create flash sale'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-xs text-slate-500 underline">
              Cancel edit
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Name (EN)</span>
            <input
              required
              className={fieldClass}
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Name (AR)</span>
            <input
              required
              className={fieldClass}
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Starts</span>
            <input
              required
              type="datetime-local"
              className={fieldClass}
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Ends</span>
            <input
              required
              type="datetime-local"
              className={fieldClass}
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Product</span>
            <select
              className={fieldClass}
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameEn} ({p.sku})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Sale price</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldClass}
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              disabled={!form.productId}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Stock limit</span>
            <input
              type="number"
              min={1}
              step={1}
              className={fieldClass}
              value={form.stockLimit}
              onChange={(e) => setForm({ ...form, stockLimit: e.target.value })}
              disabled={!form.productId}
              placeholder="Optional"
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : editId ? 'Update flash sale' : 'Create flash sale'}
        </button>
      </form>

      {loading ? <p className="mb-4 text-sm text-slate-500">Loading…</p> : null}

      <div className="space-y-3">
        {sales.map((sale) => (
          <div
            key={sale.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{sale.nameEn}</h3>
                <p className="text-xs text-slate-500">{sale.nameAr}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  sale.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {sale.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {new Date(sale.startsAt).toLocaleString()} →{' '}
              {new Date(sale.endsAt).toLocaleString()}
            </p>
            {sale.items.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {sale.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.product.nameEn}{' '}
                      <span className="text-slate-400">({item.product.sku})</span>
                      {item.stockLimit != null ? (
                        <span className="ml-2 text-xs text-amber-700">
                          limit {item.stockLimit}
                        </span>
                      ) : null}
                    </span>
                    <Price amount={item.salePrice} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No products attached.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                onClick={() => startEdit(sale)}
                className="font-medium text-teal-700 hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busyId === sale.id}
                onClick={() => void toggleActive(sale)}
                className="font-medium text-slate-700 hover:underline disabled:opacity-60"
              >
                {sale.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                type="button"
                disabled={busyId === sale.id}
                onClick={() => void remove(sale.id)}
                className="font-medium text-red-600 hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!loading && sales.length === 0 ? (
          <p className="text-sm text-slate-500">No flash sales yet.</p>
        ) : null}
      </div>
    </div>
  );
}
