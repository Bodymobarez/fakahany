'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Coupon = {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number | string;
  minOrder: number | string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
};

type CouponForm = {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  minOrder: string;
  maxUses: string;
  isActive: boolean;
};

const emptyForm: CouponForm = {
  code: '',
  type: 'PERCENT',
  value: '',
  minOrder: '',
  maxUses: '',
  isActive: true,
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/marketing/coupons');
      setCoupons(data.coupons || []);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load coupons',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(c: Coupon) {
    setEditId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minOrder: c.minOrder != null ? String(c.minOrder) : '',
      maxUses: c.maxUses != null ? String(c.maxUses) : '',
      isActive: c.isActive,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      code: form.code.trim(),
      type: form.type,
      value: Number(form.value),
      minOrder: form.minOrder === '' ? null : Number(form.minOrder),
      maxUses: form.maxUses === '' ? null : Number(form.maxUses),
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/marketing/coupons/${editId}`, payload);
      } else {
        await api.post('/api/admin/marketing/coupons', payload);
      }
      cancelEdit();
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save coupon',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Coupon) {
    await api.patch(`/api/admin/marketing/coupons/${c.id}`, { isActive: !c.isActive });
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this coupon?')) return;
    await api.delete(`/api/admin/marketing/coupons/${id}`);
    if (editId === id) cancelEdit();
    await load();
  }

  return (
    <div>
      <PageHeader title="Coupons" description="Discount codes for checkout." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mb-6 max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit coupon' : 'Create coupon'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Code</span>
            <input
              required
              className={fieldClass}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="SUMMER10"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Type</span>
            <select
              className={fieldClass}
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as CouponForm['type'] })
              }
            >
              <option value="PERCENT">PERCENT</option>
              <option value="FIXED">FIXED</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Value {form.type === 'PERCENT' ? '(%)' : '(AED)'}
            </span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              className={fieldClass}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Min order (AED)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldClass}
              value={form.minOrder}
              onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Max uses</span>
            <input
              type="number"
              min={1}
              step={1}
              className={fieldClass}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
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
          {saving ? 'Saving…' : editId ? 'Update coupon' : 'Create coupon'}
        </button>
      </form>

      {loading ? <p className="mb-4 text-sm text-slate-500">Loading coupons…</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium">Min order</th>
              <th className="px-4 py-3 font-medium">Uses</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{c.code}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {c.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.type === 'PERCENT' ? `${c.value}%` : <Price amount={c.value} />}
                </td>
                <td className="px-4 py-3">
                  {c.minOrder != null ? <Price amount={c.minOrder} /> : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.usedCount}
                  {c.maxUses != null ? ` / ${c.maxUses}` : ''}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="text-teal-700 hover:underline" onClick={() => startEdit(c)}>
                      Edit
                    </button>
                    <button type="button" className="text-slate-600 hover:underline" onClick={() => void toggle(c)}>
                      {c.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => void remove(c.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No coupons found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
