'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Branch = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
  warehouses?: Array<{ id: string; name: string; code: string }>;
};

type FormState = {
  name: string;
  code: string;
  address: string;
  isActive: boolean;
};

const emptyForm: FormState = { name: '', code: '', address: '', isActive: true };

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get('/api/expansion/branches');
    setBranches(data.branches || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load branches'));
  }, []);

  function startEdit(b: Branch) {
    setEditId(b.id);
    setForm({
      name: b.name,
      code: b.code,
      address: b.address || '',
      isActive: b.isActive,
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
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      address: form.address || null,
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await api.patch(`/api/expansion/branches/${editId}`, payload);
      } else {
        await api.post('/api/expansion/branches', payload);
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Failed to update branch' : 'Failed to create branch');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(b: Branch) {
    await api.patch(`/api/expansion/branches/${b.id}`, { isActive: !b.isActive });
    await load();
  }

  return (
    <div>
      <PageHeader title="Branches" description="Multi-branch readiness for inventory." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mb-6 max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit branch' : 'Create branch'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <input
          required
          placeholder="Name"
          className={fieldClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          placeholder="Code (e.g. DXB-02)"
          className={fieldClass}
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <input
          placeholder="Address"
          className={fieldClass}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Active
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : editId ? 'Update branch' : 'Create branch'}
        </button>
      </form>

      <ul className="space-y-3">
        {branches.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-semibold text-slate-900">
                {b.name}{' '}
                <span className="text-sm font-normal text-slate-400">({b.code})</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">{b.address || 'No address'}</p>
              <p className="mt-2 text-xs text-slate-400">
                Warehouses: {b.warehouses?.map((w) => w.code).join(', ') || 'none'}
              </p>
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                  b.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {b.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-3 text-sm">
              <button type="button" className="text-teal-700 hover:underline" onClick={() => startEdit(b)}>
                Edit
              </button>
              <button type="button" className="text-slate-600 hover:underline" onClick={() => void toggle(b)}>
                {b.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
