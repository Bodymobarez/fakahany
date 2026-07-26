'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Branch = { id: string; name: string; code: string };
type Warehouse = {
  id: string;
  name: string;
  code: string;
  branchId?: string | null;
  isDefault: boolean;
  branch?: Branch | null;
};

type FormState = {
  name: string;
  code: string;
  branchId: string;
  isDefault: boolean;
};

const emptyForm: FormState = { name: '', code: '', branchId: '', isDefault: false };

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [w, b] = await Promise.all([
      api.get('/api/admin/inventory/warehouses'),
      api.get('/api/expansion/branches'),
    ]);
    setWarehouses(w.data.warehouses || []);
    setBranches(b.data.branches || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load warehouses'));
  }, []);

  function startEdit(w: Warehouse) {
    setEditId(w.id);
    setForm({
      name: w.name,
      code: w.code,
      branchId: w.branchId || w.branch?.id || '',
      isDefault: w.isDefault,
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
      branchId: form.branchId || null,
      isDefault: form.isDefault,
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/inventory/warehouses/${editId}`, payload);
      } else {
        await api.post('/api/admin/inventory/warehouses', payload);
      }
      cancelEdit();
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || (editId ? 'Failed to update warehouse' : 'Failed to create warehouse'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Warehouses" description="Stock locations linked to branches." />
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
            {editId ? 'Edit warehouse' : 'Create warehouse'}
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
          placeholder="Code (e.g. WH-DXB-02)"
          className={fieldClass}
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <select
          className={fieldClass}
          value={form.branchId}
          onChange={(e) => setForm({ ...form, branchId: e.target.value })}
        >
          <option value="">No branch</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          />
          Default warehouse
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : editId ? 'Update warehouse' : 'Create warehouse'}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Default</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((w) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-slate-600">{w.code}</td>
                <td className="px-4 py-3 text-slate-600">{w.branch?.name || '—'}</td>
                <td className="px-4 py-3">{w.isDefault ? 'Yes' : '—'}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-teal-700 hover:underline"
                    onClick={() => startEdit(w)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {warehouses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No warehouses yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
