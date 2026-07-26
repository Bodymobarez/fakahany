'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { ImageUrlField } from '@/components/ImageUrlField';

type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  _count?: { products: number };
};

const emptyForm = { name: '', slug: '', logoUrl: '' };

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get('/api/admin/catalog/brands');
    setBrands(data.brands || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load brands'));
  }, []);

  function startEdit(b: Brand) {
    setEditId(b.id);
    setForm({ name: b.name, slug: b.slug, logoUrl: b.logoUrl || '' });
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
      slug: form.slug.trim(),
      logoUrl: form.logoUrl || null,
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/catalog/brands/${editId}`, payload);
      } else {
        await api.post('/api/admin/catalog/brands', payload);
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Failed to update brand' : 'Failed to create brand');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Brands" description="Product brands used on the catalog." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mb-6 max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit brand' : 'Create brand'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input
            required
            className={fieldClass}
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm({
                ...form,
                name,
                slug: !editId && (!form.slug || form.slug === slugify(form.name))
                  ? slugify(name)
                  : form.slug,
              });
            }}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Slug</span>
          <input
            required
            className={fieldClass}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </label>
        <div className="sm:col-span-2">
          <ImageUrlField
            label="Logo"
            value={form.logoUrl}
            onChange={(logoUrl) => setForm({ ...form, logoUrl })}
            onError={setError}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : editId ? 'Update brand' : 'Create brand'}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 text-slate-600">{b.slug}</td>
                <td className="px-4 py-3">{b._count?.products ?? 0}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-teal-700 hover:underline"
                    onClick={() => startEdit(b)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
