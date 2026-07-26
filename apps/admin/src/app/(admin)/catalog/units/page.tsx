'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Unit = { id: string; name: string; slug: string; symbol: string; isActive: boolean };

type FormState = { name: string; slug: string; symbol: string; isActive: boolean };

const emptyForm: FormState = { name: '', slug: '', symbol: '', isActive: true };

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get('/api/admin/catalog/units');
    setUnits(data.units || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load units'));
  }, []);

  function startEdit(u: Unit) {
    setEditId(u.id);
    setForm({ name: u.name, slug: u.slug, symbol: u.symbol, isActive: u.isActive });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editId) {
        await api.patch(`/api/admin/catalog/units/${editId}`, form);
      } else {
        await api.post('/api/admin/catalog/units', form);
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Failed to update unit' : 'Failed to create unit');
    }
  }

  async function toggle(u: Unit) {
    await api.patch(`/api/admin/catalog/units/${u.id}`, { isActive: !u.isActive });
    await load();
  }

  return (
    <div>
      <PageHeader title="Units" description="Sell-by units (kg, pack, bunch…)." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <form
        onSubmit={onSubmit}
        className="mb-6 max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit unit' : 'Add unit'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            required
            placeholder="Name"
            className={fieldClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            placeholder="Slug"
            className={fieldClass}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            required
            placeholder="Symbol"
            className={fieldClass}
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Active
        </label>
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white">
          {editId ? 'Update unit' : 'Add unit'}
        </button>
      </form>
      <ul className="space-y-2">
        {units.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <div>
              <span className="font-medium">{u.name}</span>
              <span className="ml-2 text-slate-400">
                {u.symbol} · {u.slug}
              </span>
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  u.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {u.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-3">
              <button type="button" className="text-teal-700 hover:underline" onClick={() => startEdit(u)}>
                Edit
              </button>
              <button type="button" className="text-slate-600 hover:underline" onClick={() => void toggle(u)}>
                {u.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
