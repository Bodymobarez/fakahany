'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Attribute = {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  isActive?: boolean;
  values: Array<{ id: string; valueEn: string; valueAr: string }>;
};

type FormState = {
  nameEn: string;
  nameAr: string;
  slug: string;
  values: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  nameEn: '',
  nameAr: '',
  slug: '',
  values: '',
  isActive: true,
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get('/api/admin/catalog/attributes');
    setAttributes(data.attributes || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load attributes'));
  }, []);

  function startEdit(a: Attribute) {
    setEditId(a.id);
    setForm({
      nameEn: a.nameEn,
      nameAr: a.nameAr,
      slug: a.slug,
      values: a.values.map((v) => v.valueEn).join(', '),
      isActive: a.isActive !== false,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  function parseValues(raw: string) {
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v, i) => ({ valueEn: v, valueAr: v, sortOrder: i }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const values = parseValues(form.values);
    const payload = {
      nameEn: form.nameEn,
      nameAr: form.nameAr || form.nameEn,
      slug: form.slug,
      isActive: form.isActive,
      values,
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/catalog/attributes/${editId}`, payload);
      } else {
        await api.post('/api/admin/catalog/attributes', payload);
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Failed to update attribute' : 'Failed to create attribute');
    }
  }

  async function toggle(a: Attribute) {
    await api.patch(`/api/admin/catalog/attributes/${a.id}`, { isActive: !(a.isActive !== false) });
    await load();
  }

  return (
    <div>
      <PageHeader title="Attributes" description="Variant/filter attributes (e.g. Origin, Size)." />
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
            {editId ? 'Edit attribute' : 'Create attribute'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <input
          required
          placeholder="Name EN"
          className={fieldClass}
          value={form.nameEn}
          onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
        />
        <input
          placeholder="Name AR"
          className={fieldClass}
          value={form.nameAr}
          onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
        />
        <input
          required
          placeholder="Slug"
          className={fieldClass}
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
        <input
          placeholder="Values (comma-separated)"
          className={fieldClass}
          value={form.values}
          onChange={(e) => setForm({ ...form, values: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Active
        </label>
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white">
          {editId ? 'Update attribute' : 'Create attribute'}
        </button>
      </form>
      <ul className="space-y-3">
        {attributes.map((a) => (
          <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{a.nameEn}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {a.values.map((v) => v.valueEn).join(', ') || 'No values'}
                </p>
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                    a.isActive !== false
                      ? 'bg-teal-50 text-teal-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {a.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-3 text-sm">
                <button type="button" className="text-teal-700 hover:underline" onClick={() => startEdit(a)}>
                  Edit
                </button>
                <button type="button" className="text-slate-600 hover:underline" onClick={() => void toggle(a)}>
                  {a.isActive !== false ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
