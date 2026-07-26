'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type CmsPage = {
  id: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  bodyEn: string;
  bodyAr: string;
  isActive: boolean;
};

const emptyForm = {
  titleEn: '',
  titleAr: '',
  slug: '',
  bodyEn: '',
  bodyAr: '',
  isActive: true,
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function CmsPagesAdmin() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get('/api/admin/content/pages');
    setPages(data.pages || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load pages'));
  }, []);

  function startEdit(p: CmsPage) {
    setEditId(p.id);
    setForm({
      titleEn: p.titleEn,
      titleAr: p.titleAr,
      slug: p.slug,
      bodyEn: p.bodyEn || '',
      bodyAr: p.bodyAr || '',
      isActive: p.isActive,
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
    try {
      if (editId) {
        await api.patch(`/api/admin/content/pages/${editId}`, form);
      } else {
        await api.post('/api/admin/content/pages', form);
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Failed to update page' : 'Failed to create page');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: CmsPage) {
    await api.patch(`/api/admin/content/pages/${p.id}`, { isActive: !p.isActive });
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this page?')) return;
    await api.delete(`/api/admin/content/pages/${id}`);
    if (editId === id) cancelEdit();
    await load();
  }

  return (
    <div>
      <PageHeader title="Pages" description="CMS content pages (About, shipping, etc.)." />
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
            {editId ? 'Edit page' : 'Create page'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Title EN</span>
            <input
              required
              className={fieldClass}
              value={form.titleEn}
              onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Title AR</span>
            <input
              required
              className={fieldClass}
              value={form.titleAr}
              onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Slug</span>
            <input
              required
              className={fieldClass}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Body EN</span>
            <textarea
              rows={3}
              className={fieldClass}
              value={form.bodyEn}
              onChange={(e) => setForm({ ...form, bodyEn: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Body AR</span>
            <textarea
              rows={3}
              className={fieldClass}
              value={form.bodyAr}
              onChange={(e) => setForm({ ...form, bodyAr: e.target.value })}
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
          {saving ? 'Saving…' : editId ? 'Update page' : 'Create page'}
        </button>
      </form>
      <ul className="space-y-2">
        {pages.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <div>
              <span className="font-medium">{p.titleEn}</span>
              <span className="ml-2 text-slate-400">/{p.slug}</span>
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  p.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {p.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-3">
              <button type="button" className="text-teal-700 hover:underline" onClick={() => startEdit(p)}>
                Edit
              </button>
              <button type="button" className="text-slate-600 hover:underline" onClick={() => void toggle(p)}>
                {p.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button type="button" className="text-red-600 hover:underline" onClick={() => void remove(p.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
