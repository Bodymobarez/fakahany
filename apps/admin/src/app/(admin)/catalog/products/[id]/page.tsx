'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cleanProductDescription } from '@/lib/cleanDescription';
import { PageHeader } from '@/components/PageHeader';
import { ProductForm, type ProductFormValues } from '@/components/ProductForm';
import { ProductVariantsEditor } from '@/components/ProductVariantsEditor';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [initial, setInitial] = useState<Partial<ProductFormValues> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm('Delete this product permanently?')) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/admin/products/${params.id}`);
      router.push('/catalog/products');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to delete product',
      );
      setDeleting(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/api/admin/products/${params.id}`);
        const p = data.product;
        setInitial({
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          slug: p.slug,
          sku: p.sku,
          basePrice: Number(p.basePrice),
          compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : '',
          stockQty: p.stockQty,
          soldAs: p.soldAs === 'BOX' ? 'BOX' : 'PIECE',
          weight: p.weight != null ? Number(p.weight) : '',
          unit: ['g', 'kg', 'bunch', 'pack'].includes(p.unit) ? p.unit : 'kg',
          brandId: p.brandId || '',
          vendorId: p.vendorId || '',
          categoryIds: (p.categories || []).map(
            (c: { categoryId?: string; category?: { id: string } }) =>
              c.categoryId || c.category?.id,
          ).filter(Boolean),
          descriptionEn: cleanProductDescription(p.descriptionEn),
          descriptionAr: cleanProductDescription(p.descriptionAr),
          isActive: p.isActive,
          isFeatured: Boolean(p.isFeatured),
          isBestSeller: Boolean(p.isBestSeller),
          isNew: Boolean(p.isNew),
          isOrganic: Boolean(p.isOrganic),
          isImported: Boolean(p.isImported),
          isSeasonal: Boolean(p.isSeasonal),
          images: (p.images || [])
            .slice()
            .sort(
              (a: { sortOrder?: number }, b: { sortOrder?: number }) =>
                (a.sortOrder || 0) - (b.sortOrder || 0),
            )
            .map((img: { url: string; sortOrder?: number; isPrimary?: boolean }) => ({
              url: img.url,
              sortOrder: img.sortOrder || 0,
              isPrimary: Boolean(img.isPrimary),
            })),
        });
      } catch (err: unknown) {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to load product',
        );
      }
    })();
  }, [params.id]);

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }

  if (!initial) {
    return <p className="text-sm text-slate-500">Loading product…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Edit product" description="Update catalog basics and pack variants." />
        <button
          type="button"
          disabled={deleting}
          onClick={() => void onDelete()}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Delete product'}
        </button>
      </div>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <ProductForm productId={params.id} initial={initial} />
      <ProductVariantsEditor productId={params.id} />
    </div>
  );
}
