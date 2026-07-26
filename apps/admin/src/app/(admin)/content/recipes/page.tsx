'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { ImageUrlField } from '@/components/ImageUrlField';

type ProductOpt = { id: string; nameEn: string; sku: string };

type RecipeItem = {
  productId: string;
  quantity: string | null;
  product?: ProductOpt;
};

type Recipe = {
  id: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  bodyEn: string;
  bodyAr: string;
  imageUrl: string | null;
  prepMinutes: number | null;
  isActive: boolean;
  items: RecipeItem[];
};

type FormState = {
  titleEn: string;
  titleAr: string;
  slug: string;
  bodyEn: string;
  bodyAr: string;
  imageUrl: string;
  prepMinutes: string;
  isActive: boolean;
  items: { productId: string; quantity: string }[];
};

const emptyForm: FormState = {
  titleEn: '',
  titleAr: '',
  slug: '',
  bodyEn: '',
  bodyAr: '',
  imageUrl: '',
  prepMinutes: '15',
  isActive: true,
  items: [],
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function errMsg(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response
      ?.data?.error?.message ||
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    fallback
  );
}

export default function RecipesAdminPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [pickProductId, setPickProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [recipesRes, productsRes] = await Promise.all([
        api.get('/api/admin/content/recipes'),
        api.get('/api/admin/products'),
      ]);
      setRecipes(recipesRes.data.recipes || []);
      setProducts(productsRes.data.products || []);
    } catch (err: unknown) {
      setError(errMsg(err, 'Failed to load recipes'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(r: Recipe) {
    setEditId(r.id);
    setForm({
      titleEn: r.titleEn,
      titleAr: r.titleAr,
      slug: r.slug,
      bodyEn: r.bodyEn || '',
      bodyAr: r.bodyAr || '',
      imageUrl: r.imageUrl || '',
      prepMinutes: r.prepMinutes != null ? String(r.prepMinutes) : '',
      isActive: r.isActive,
      items: (r.items || []).map((i) => ({
        productId: i.productId,
        quantity: i.quantity || '',
      })),
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  function addItem() {
    if (!pickProductId) return;
    if (form.items.some((i) => i.productId === pickProductId)) return;
    setForm({ ...form, items: [...form.items, { productId: pickProductId, quantity: '1' }] });
    setPickProductId('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      titleEn: form.titleEn.trim(),
      titleAr: form.titleAr.trim(),
      slug: form.slug.trim() || slugify(form.titleEn),
      bodyEn: form.bodyEn,
      bodyAr: form.bodyAr,
      imageUrl: form.imageUrl || null,
      prepMinutes: form.prepMinutes === '' ? null : Number(form.prepMinutes),
      isActive: form.isActive,
      items: form.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity.trim() || null,
      })),
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/content/recipes/${editId}`, payload);
      } else {
        await api.post('/api/admin/content/recipes', payload);
      }
      cancelEdit();
      await load();
    } catch (err: unknown) {
      setError(errMsg(err, editId ? 'Failed to update recipe' : 'Failed to create recipe'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: Recipe) {
    try {
      await api.patch(`/api/admin/content/recipes/${r.id}`, { isActive: !r.isActive });
      await load();
    } catch (err: unknown) {
      setError(errMsg(err, 'Failed to update status'));
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this recipe?')) return;
    try {
      await api.delete(`/api/admin/content/recipes/${id}`);
      if (editId === id) cancelEdit();
      await load();
    } catch (err: unknown) {
      setError(errMsg(err, 'Failed to delete recipe'));
    }
  }

  const productLabel = (id: string) => {
    const p = products.find((x) => x.id === id);
    return p ? `${p.nameEn} (${p.sku})` : id;
  };

  return (
    <div>
      <PageHeader title="Recipes" description="CMS recipes with shoppable ingredients." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mb-6 max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit recipe' : 'Create recipe'}
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
              onChange={(e) =>
                setForm({
                  ...form,
                  titleEn: e.target.value,
                  slug: form.slug || slugify(e.target.value),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Title (AR)</span>
            <input
              required
              className={fieldClass}
              value={form.titleAr}
              onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Slug</span>
            <input
              required
              className={fieldClass}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Prep minutes</span>
            <input
              type="number"
              min={1}
              className={fieldClass}
              value={form.prepMinutes}
              onChange={(e) => setForm({ ...form, prepMinutes: e.target.value })}
            />
          </label>
          <div className="sm:col-span-2">
            <ImageUrlField
              label="Image"
              value={form.imageUrl}
              onChange={(imageUrl) => setForm({ ...form, imageUrl })}
              onError={setError}
            />
          </div>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Body (EN)</span>
            <textarea
              rows={3}
              className={fieldClass}
              value={form.bodyEn}
              onChange={(e) => setForm({ ...form, bodyEn: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Body (AR)</span>
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

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">Ingredients (products)</p>
          <div className="mb-3 flex flex-wrap gap-2">
            <select
              className={`${fieldClass} max-w-md`}
              value={pickProductId}
              onChange={(e) => setPickProductId(e.target.value)}
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameEn} ({p.sku})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Add
            </button>
          </div>
          <ul className="space-y-2">
            {form.items.map((item, idx) => (
              <li key={item.productId} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-[12rem] font-medium text-slate-800">
                  {productLabel(item.productId)}
                </span>
                <input
                  className="w-24 rounded border border-slate-300 px-2 py-1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => {
                    const next = [...form.items];
                    next[idx] = { ...item, quantity: e.target.value };
                    setForm({ ...form, items: next });
                  }}
                />
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() =>
                    setForm({ ...form, items: form.items.filter((i) => i.productId !== item.productId) })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
            {!form.items.length ? (
              <li className="text-xs text-slate-500">No ingredients linked yet.</li>
            ) : null}
          </ul>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : editId ? 'Update recipe' : 'Create recipe'}
        </button>
      </form>

      {loading ? <p className="mb-4 text-sm text-slate-500">Loading…</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{r.titleEn}</td>
                <td className="px-4 py-3 text-slate-600">{r.slug}</td>
                <td className="px-4 py-3 text-slate-600">{r.items?.length || 0}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      r.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-teal-700 hover:underline"
                      onClick={() => startEdit(r)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-slate-600 hover:underline"
                      onClick={() => void toggleActive(r)}
                    >
                      {r.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => void remove(r.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && recipes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No recipes found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
