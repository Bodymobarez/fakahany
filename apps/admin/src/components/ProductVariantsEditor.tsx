'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Variant = {
  id: string;
  name: string;
  sku: string;
  price: number | string;
  stockQty: number;
  isActive: boolean;
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

const emptyForm = { name: '', sku: '', price: '', stockQty: '0' };

export function ProductVariantsEditor({ productId }: { productId: string }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const { data } = await api.get(`/api/admin/products/${productId}`);
    setVariants((data.product?.variants || []).filter((v: Variant) => v.isActive !== false));
  }

  useEffect(() => {
    void load().catch(() => setError('Could not load variants'));
  }, [productId]);

  function startEdit(v: Variant) {
    setEditingId(v.id);
    setForm({
      name: v.name,
      sku: v.sku,
      price: String(v.price),
      stockQty: String(v.stockQty),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      stockQty: Number(form.stockQty) || 0,
    };
    try {
      if (editingId) {
        await api.patch(`/api/admin/products/${productId}/variants/${editingId}`, payload);
        cancelEdit();
      } else {
        await api.post(`/api/admin/products/${productId}/variants`, payload);
        setForm(emptyForm);
      }
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || (editingId ? 'Could not update variant' : 'Could not create variant'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(variantId: string) {
    try {
      await api.delete(`/api/admin/products/${productId}/variants/${variantId}`);
      if (editingId === variantId) cancelEdit();
      await load();
    } catch {
      setError('Could not deactivate variant');
    }
  }

  return (
    <div className="mt-6 max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Variants (pack sizes / grades)</h2>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
        {variants.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-slate-900">{v.name}</p>
              <p className="text-xs text-slate-500">
                {v.sku} · {Number(v.price).toFixed(2)} AED · stock {v.stockQty}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => startEdit(v)}
                className="text-xs text-teal-700 underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void deactivate(v.id)}
                className="text-xs text-red-600 underline"
              >
                Deactivate
              </button>
            </div>
          </li>
        ))}
        {variants.length === 0 ? (
          <li className="px-3 py-4 text-sm text-slate-500">No variants yet — sells as base product.</li>
        ) : null}
      </ul>
      <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 sm:grid-cols-2">
        <p className="text-sm font-medium text-slate-700 sm:col-span-2">
          {editingId ? 'Edit variant' : 'Add variant'}
        </p>
        <input
          required
          className={fieldClass}
          placeholder="Name (e.g. 500g pack)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          className={fieldClass}
          placeholder="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
        />
        <input
          required
          type="number"
          min={0}
          step="0.01"
          className={fieldClass}
          placeholder="Price AED"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <input
          type="number"
          min={0}
          className={fieldClass}
          placeholder="Stock"
          value={form.stockQty}
          onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
        />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add variant'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
