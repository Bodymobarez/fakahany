'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { ImageUrlField } from '@/components/ImageUrlField';

type Banner = {
  id: string;
  titleEn: string;
  titleAr: string;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

type BannerForm = {
  titleEn: string;
  titleAr: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: BannerForm = {
  titleEn: '',
  titleAr: '',
  imageUrl: '',
  linkUrl: '',
  sortOrder: '0',
  isActive: true,
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/marketing/banners');
      setBanners(data.banners || []);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load banners',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(b: Banner) {
    setEditId(b.id);
    setForm({
      titleEn: b.titleEn,
      titleAr: b.titleAr,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl || '',
      sortOrder: String(b.sortOrder),
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
      titleEn: form.titleEn.trim(),
      titleAr: form.titleAr.trim(),
      imageUrl: form.imageUrl.trim(),
      linkUrl: form.linkUrl.trim() === '' ? null : form.linkUrl.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/marketing/banners/${editId}`, payload);
      } else {
        await api.post('/api/admin/marketing/banners', payload);
      }
      cancelEdit();
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save banner',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggle(b: Banner) {
    await api.patch(`/api/admin/marketing/banners/${b.id}`, { isActive: !b.isActive });
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this banner?')) return;
    await api.delete(`/api/admin/marketing/banners/${id}`);
    if (editId === id) cancelEdit();
    await load();
  }

  return (
    <div>
      <PageHeader title="Banners" description="Homepage and campaign banners." />
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
            {editId ? 'Edit banner' : 'Create banner'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Title (EN)</span>
            <input
              required
              className={fieldClass}
              value={form.titleEn}
              onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Title (AR)</span>
            <input
              required
              dir="rtl"
              className={fieldClass}
              value={form.titleAr}
              onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
            />
          </label>
          <div className="sm:col-span-2">
            <ImageUrlField
              label="Image"
              required
              value={form.imageUrl}
              onChange={(imageUrl) => setForm({ ...form, imageUrl })}
              onError={setError}
            />
          </div>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Link URL</span>
            <input
              className={fieldClass}
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              placeholder="https://… (optional)"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Sort order</span>
            <input
              type="number"
              step={1}
              className={fieldClass}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
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
          {saving ? 'Saving…' : editId ? 'Update banner' : 'Create banner'}
        </button>
      </form>

      {loading ? <p className="mb-4 text-sm text-slate-500">Loading banners…</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Image</th>
              <th className="px-4 py-3 font-medium">Link</th>
              <th className="px-4 py-3 font-medium">Sort</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {banners.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{b.titleEn}</div>
                  <div className="text-xs text-slate-500" dir="rtl">
                    {b.titleAr}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={b.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 hover:underline"
                  >
                    View
                  </a>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {b.linkUrl ? (
                    <a
                      href={b.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-700 hover:underline"
                    >
                      Link
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">{b.sortOrder}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      b.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="text-teal-700 hover:underline" onClick={() => startEdit(b)}>
                      Edit
                    </button>
                    <button type="button" className="text-slate-600 hover:underline" onClick={() => void toggle(b)}>
                      {b.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => void remove(b.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && banners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No banners found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
