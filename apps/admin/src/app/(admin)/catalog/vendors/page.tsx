'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Vendor = {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
  _count?: { products: number };
};

type FormState = {
  name: string;
  slug: string;
  email: string;
  phone: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  email: '',
  phone: '',
  isActive: true,
};

export default function VendorsAdminPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get('/api/expansion/vendors?includeInactive=1');
    setVendors(data.vendors || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load vendors'));
  }, []);

  function startEdit(v: Vendor) {
    setEditId(v.id);
    setForm({
      name: v.name,
      slug: v.slug,
      email: v.email || '',
      phone: v.phone || '',
      isActive: v.isActive !== false,
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
      slug: form.slug.trim() || form.name.toLowerCase().replace(/\s+/g, '-'),
      email: form.email || null,
      phone: form.phone || null,
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await api.patch(`/api/expansion/vendors/${editId}`, payload);
      } else {
        await api.post('/api/expansion/vendors', payload);
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Could not update vendor' : 'Could not create vendor');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(v: Vendor) {
    await api.patch(`/api/expansion/vendors/${v.id}`, { isActive: !v.isActive });
    await load();
  }

  return (
    <div>
      <PageHeader title="Vendors" description="Marketplace supplier partners." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit vendor' : 'Add vendor'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : editId ? 'Update vendor' : 'Add vendor'}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{v.name}</td>
                <td className="px-4 py-3 text-slate-500">{v.slug}</td>
                <td className="px-4 py-3">{v._count?.products ?? 0}</td>
                <td className="px-4 py-3 text-slate-500">{v.email || v.phone || '—'}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void toggle(v)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      v.isActive !== false
                        ? 'bg-teal-50 text-teal-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {v.isActive !== false ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-teal-700 hover:underline"
                    onClick={() => startEdit(v)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No vendors yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
