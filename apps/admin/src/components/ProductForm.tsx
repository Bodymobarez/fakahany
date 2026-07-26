'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getAuthToken } from '@/lib/api';

export type ProductImageInput = {
  url: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProductFormValues = {
  nameEn: string;
  nameAr: string;
  slug: string;
  sku: string;
  basePrice: number;
  compareAtPrice: number | '';
  stockQty: number;
  soldAs: 'BOX' | 'PIECE';
  weight: number | '';
  unit: 'g' | 'kg' | 'bunch' | 'pack';
  brandId: string;
  vendorId: string;
  categoryIds: string[];
  descriptionEn: string;
  descriptionAr: string;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  isOrganic: boolean;
  isImported: boolean;
  isSeasonal: boolean;
  images?: ProductImageInput[];
};

const empty: ProductFormValues = {
  nameEn: '',
  nameAr: '',
  slug: '',
  sku: '',
  basePrice: 0,
  compareAtPrice: '',
  stockQty: 0,
  soldAs: 'PIECE',
  weight: '',
  unit: 'kg',
  brandId: '',
  vendorId: '',
  categoryIds: [],
  descriptionEn: '',
  descriptionAr: '',
  isActive: true,
  isFeatured: false,
  isBestSeller: false,
  isNew: false,
  isOrganic: false,
  isImported: false,
  isSeasonal: false,
  images: [],
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function mediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function ProductForm({
  initial,
  productId,
}: {
  initial?: Partial<ProductFormValues>;
  productId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>({ ...empty, ...initial, images: initial?.images || [] });
  const [images, setImages] = useState<ProductImageInput[]>(initial?.images || []);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; nameEn: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initial?.images) setImages(initial.images);
  }, [initial?.images]);

  useEffect(() => {
    void Promise.all([
      api.get('/api/admin/catalog/brands'),
      api.get('/api/admin/catalog/categories'),
      api.get('/api/expansion/vendors').catch(() => ({ data: { vendors: [] } })),
    ])
      .then(([b, c, v]) => {
        setBrands(b.data.brands || []);
        setCategories(c.data.categories || []);
        setVendors(v.data.vendors || []);
      })
      .catch(() => undefined);
  }, []);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCategory(id: string) {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((x) => x !== id)
        : [...f.categoryIds, id],
    }));
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const uploaded: ProductImageInput[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append('file', file);
        const res = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body,
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = (await res.json()) as { file: { url: string } };
        uploaded.push({
          url: data.file.url,
          sortOrder: images.length + uploaded.length,
          isPrimary: false,
        });
      }
      setImages((prev) => {
        const next = [...prev, ...uploaded].map((img, idx) => ({ ...img, sortOrder: idx }));
        if (!next.some((i) => i.isPrimary) && next[0]) {
          next[0] = { ...next[0], isPrimary: true };
        }
        return next;
      });
    } catch {
      setError('Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  function setPrimary(idx: number) {
    setImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === idx })));
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx).map((img, i) => ({ ...img, sortOrder: i }));
      if (next.length && !next.some((i) => i.isPrimary)) next[0].isPrimary = true;
      return next;
    });
  }

  function moveImage(idx: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[idx]!;
      next[idx] = next[j]!;
      next[j] = tmp;
      return next.map((img, i) => ({ ...img, sortOrder: i }));
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      basePrice: Number(form.basePrice),
      compareAtPrice:
        form.compareAtPrice === '' || form.compareAtPrice == null
          ? null
          : Number(form.compareAtPrice),
      stockQty: Number(form.stockQty),
      soldAs: form.soldAs,
      weight:
        form.weight === '' || form.weight == null ? null : Number(form.weight),
      unit: form.unit || null,
      packageSize: null,
      brandId: form.brandId || null,
      vendorId: form.vendorId || null,
      categoryIds: form.categoryIds,
      type: 'SIMPLE',
      images: images.map((img, idx) => ({
        url: img.url,
        sortOrder: idx,
        isPrimary: img.isPrimary,
      })),
    };
    try {
      if (productId) {
        await api.patch(`/api/admin/products/${productId}`, payload);
      } else {
        await api.post('/api/admin/products', payload);
      }
      router.push('/catalog/products');
      router.refresh();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ||
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  const flags: Array<{ key: keyof ProductFormValues; label: string }> = [
    { key: 'isFeatured', label: 'Featured' },
    { key: 'isBestSeller', label: 'Best seller' },
    { key: 'isNew', label: 'New' },
    { key: 'isOrganic', label: 'Organic' },
    { key: 'isImported', label: 'Imported' },
    { key: 'isSeasonal', label: 'Seasonal' },
    { key: 'isActive', label: 'Active' },
  ];

  const salePrice = Number(form.basePrice) || 0;
  const originalPrice =
    form.compareAtPrice === '' || form.compareAtPrice == null
      ? null
      : Number(form.compareAtPrice);
  const discountPct =
    originalPrice != null && originalPrice > salePrice && originalPrice > 0
      ? Math.round(((originalPrice - salePrice) / originalPrice) * 10000) / 100
      : 0;

  function applyDiscountPercent(pctRaw: string) {
    if (pctRaw === '') {
      set('compareAtPrice', '');
      return;
    }
    const pct = Number(pctRaw);
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100 || salePrice <= 0) return;
    const original = Math.round((salePrice / (1 - pct / 100)) * 100) / 100;
    set('compareAtPrice', original);
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name (EN)">
          <input
            required
            className={fieldClass}
            value={form.nameEn}
            onChange={(e) => set('nameEn', e.target.value)}
          />
        </Field>
        <Field label="Name (AR)">
          <input
            required
            className={fieldClass}
            value={form.nameAr}
            onChange={(e) => set('nameAr', e.target.value)}
            dir="rtl"
          />
        </Field>
        <Field label="Slug">
          <input
            required
            className={fieldClass}
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
          />
        </Field>
        <Field label="SKU">
          <input
            required
            className={fieldClass}
            value={form.sku}
            onChange={(e) => set('sku', e.target.value)}
          />
        </Field>
        <Field label="Sold as">
          <select
            className={fieldClass}
            value={form.soldAs}
            onChange={(e) => set('soldAs', e.target.value as 'BOX' | 'PIECE')}
          >
            <option value="PIECE">Piece</option>
            <option value="BOX">Box</option>
          </select>
        </Field>
        <Field label="Weight amount">
          <input
            type="number"
            min={0}
            step="0.01"
            className={fieldClass}
            value={form.weight}
            placeholder="e.g. 2 or 500"
            onChange={(e) =>
              set('weight', e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        </Field>
        <Field label="Weight unit">
          <select
            className={fieldClass}
            value={form.unit}
            onChange={(e) =>
              set('unit', e.target.value as 'g' | 'kg' | 'bunch' | 'pack')
            }
          >
            <option value="g">Gram (g)</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="bunch">Bunch</option>
            <option value="pack">Pack</option>
          </select>
        </Field>
        <Field label="Stock qty">
          <input
            type="number"
            min={0}
            className={fieldClass}
            value={form.stockQty}
            onChange={(e) => set('stockQty', Number(e.target.value))}
          />
        </Field>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Pricing & discount</h3>
        <p className="mt-1 text-xs text-slate-500">
          Set the sale price, then either enter an original (before-discount) price or a discount %.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Sale price (AED)">
            <input
              required
              type="number"
              min={0}
              step="0.01"
              className={fieldClass}
              value={form.basePrice}
              onChange={(e) => set('basePrice', Number(e.target.value))}
            />
          </Field>
          <Field label="Original price (AED)">
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldClass}
              value={form.compareAtPrice}
              placeholder="Before discount"
              onChange={(e) =>
                set('compareAtPrice', e.target.value === '' ? '' : Number(e.target.value))
              }
            />
            <p className="mt-1 text-xs text-slate-500">Must be higher than sale price to show a discount.</p>
          </Field>
          <Field label="Discount %">
            <input
              type="number"
              min={0}
              max={99.99}
              step="0.01"
              className={fieldClass}
              value={discountPct || ''}
              placeholder="e.g. 25"
              onChange={(e) => applyDiscountPercent(e.target.value)}
            />
            {discountPct > 0 ? (
              <p className="mt-1 text-xs font-medium text-rose-600">
                Storefront badge: -{discountPct}%
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Leave empty for no discount.</p>
            )}
          </Field>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand">
          <select
            className={fieldClass}
            value={form.brandId}
            onChange={(e) => set('brandId', e.target.value)}
          >
            <option value="">None</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Marketplace vendor">
          <select
            className={fieldClass}
            value={form.vendorId}
            onChange={(e) => set('vendorId', e.target.value)}
          >
            <option value="">None</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Images</p>
          <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
            {uploading ? 'Uploading…' : 'Upload images'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => void onUpload(e.target.files)}
            />
          </label>
        </div>
        {images.length ? (
          <ul className="grid gap-3 sm:grid-cols-3">
            {images.map((img, idx) => (
              <li
                key={`${img.url}-${idx}`}
                className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(img.url)}
                  alt=""
                  className="h-28 w-full object-cover"
                />
                <div className="flex flex-wrap items-center gap-1 p-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPrimary(idx)}
                    className={
                      img.isPrimary
                        ? 'font-semibold text-teal-700'
                        : 'text-slate-500 hover:underline'
                    }
                  >
                    {img.isPrimary ? 'Primary' : 'Make primary'}
                  </button>
                  <button type="button" onClick={() => moveImage(idx, -1)} className="text-slate-500">
                    ↑
                  </button>
                  <button type="button" onClick={() => moveImage(idx, 1)} className="text-slate-500">
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="ml-auto text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">No images yet — upload product photos.</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Merchandising</p>
        <div className="flex flex-wrap gap-3">
          {flags.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form[f.key])}
                onChange={(e) => set(f.key, e.target.checked as ProductFormValues[typeof f.key])}
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Categories</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label
              key={c.id}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                form.categoryIds.includes(c.id)
                  ? 'border-teal-600 bg-teal-50 text-teal-800'
                  : 'border-slate-300 text-slate-600'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={form.categoryIds.includes(c.id)}
                onChange={() => toggleCategory(c.id)}
              />
              {c.nameEn}
            </label>
          ))}
          {categories.length === 0 ? (
            <span className="text-xs text-slate-400">No categories yet</span>
          ) : null}
        </div>
      </div>

      <Field label="Description (EN)">
        <textarea
          className={`${fieldClass} min-h-24`}
          value={form.descriptionEn}
          onChange={(e) => set('descriptionEn', e.target.value)}
        />
      </Field>
      <Field label="Description (AR)">
        <textarea
          className={`${fieldClass} min-h-24`}
          dir="rtl"
          value={form.descriptionAr}
          onChange={(e) => set('descriptionAr', e.target.value)}
        />
      </Field>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : productId ? 'Update product' : 'Create product'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/catalog/products')}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
