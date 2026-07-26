'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Supplier = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  trn: string | null;
  isActive: boolean;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  trn: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  trn: '',
  isActive: true,
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get('/api/admin/suppliers');
    setSuppliers(data.suppliers || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load suppliers'));
  }, []);

  function startEdit(s: Supplier) {
    setEditId(s.id);
    setForm({
      name: s.name,
      email: s.email || '',
      phone: s.phone || '',
      trn: s.trn || '',
      isActive: s.isActive,
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
      email: form.email || null,
      phone: form.phone || null,
      trn: form.trn || null,
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/suppliers/${editId}`, payload);
      } else {
        await api.post('/api/admin/suppliers', payload);
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Failed to update supplier' : 'Failed to create supplier');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(s: Supplier) {
    await api.patch(`/api/admin/suppliers/${s.id}`, { isActive: !s.isActive });
    await load();
  }

  return (
    <div>
      <PageHeader title="Suppliers" description="Vendor directory for purchase orders." />
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
            {editId ? 'Edit supplier' : 'Add supplier'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Name</span>
            <input
              required
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Email</span>
            <input
              className={fieldClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Phone</span>
            <input
              className={fieldClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">TRN</span>
            <input
              className={fieldClass}
              value={form.trn}
              onChange={(e) => setForm({ ...form, trn: e.target.value })}
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
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : editId ? 'Update supplier' : 'Add supplier'}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">TRN</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.email || '—'}</td>
                <td className="px-4 py-3">{s.phone || '—'}</td>
                <td className="px-4 py-3">{s.trn || '—'}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void toggle(s)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      s.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {s.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-teal-700 hover:underline"
                    onClick={() => startEdit(s)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No suppliers yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
