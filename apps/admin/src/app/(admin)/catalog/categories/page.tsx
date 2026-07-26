'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { ImageUrlField } from '@/components/ImageUrlField';

type Category = {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  imageUrl?: string | null;
  parentId?: string | null;
  parent?: { id?: string; nameEn: string } | null;
};

type FormState = {
  nameEn: string;
  nameAr: string;
  slug: string;
  sortOrder: string;
  parentId: string;
  imageUrl: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  nameEn: '',
  nameAr: '',
  slug: '',
  sortOrder: '0',
  parentId: '',
  imageUrl: '',
  isActive: true,
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get('/api/admin/catalog/categories');
    setCategories(data.categories || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load categories'));
  }, []);

  function startEdit(c: Category) {
    setEditId(c.id);
    setForm({
      nameEn: c.nameEn,
      nameAr: c.nameAr,
      slug: c.slug,
      sortOrder: String(c.sortOrder),
      parentId: c.parentId || c.parent?.id || '',
      imageUrl: c.imageUrl || '',
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
      nameEn: form.nameEn.trim(),
      nameAr: form.nameAr.trim(),
      slug: form.slug.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      parentId: form.parentId || null,
      imageUrl: form.imageUrl.trim() || null,
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/catalog/categories/${editId}`, payload);
      } else {
        await api.post('/api/admin/catalog/categories', payload);
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Failed to update category' : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat: Category) {
    await api.patch(`/api/admin/catalog/categories/${cat.id}`, { isActive: !cat.isActive });
    await load();
  }

  const parentOptions = categories.filter((c) => c.id !== editId);

  return (
    <div>
      <PageHeader title="Categories" description="Catalog category tree." />
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
            {editId ? 'Edit category' : 'Add category'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Name EN</span>
            <input
              required
              className={fieldClass}
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Name AR</span>
            <input
              required
              className={fieldClass}
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
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
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Sort order</span>
            <input
              type="number"
              className={fieldClass}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Parent</span>
            <select
              className={fieldClass}
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">None (top level)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <ImageUrlField
              label="Category image"
              value={form.imageUrl}
              onChange={(imageUrl) => setForm({ ...form, imageUrl })}
              onError={setError}
            />
          </div>
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
          {saving ? 'Saving…' : editId ? 'Update category' : 'Create category'}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Parent</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{c.nameEn}</td>
                <td className="px-4 py-3 text-slate-600">{c.slug}</td>
                <td className="px-4 py-3">{c.parent?.nameEn || '—'}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void toggleActive(c)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {c.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-teal-700 hover:underline"
                    onClick={() => startEdit(c)}
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
