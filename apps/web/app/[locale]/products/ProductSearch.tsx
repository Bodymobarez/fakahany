'use client';

import { useRouter } from '@/i18n/routing';
import { useTransition } from 'react';

type Cat = { slug: string; nameEn: string; nameAr?: string };
type Brand = { slug: string; name: string };

type Props = {
  initialQuery: string;
  initialCategory?: string;
  initialBrand?: string;
  placeholder: string;
  categories: Cat[];
  brands: Brand[];
  locale: string;
};

export function ProductSearch({
  initialQuery,
  initialCategory = '',
  initialBrand = '',
  placeholder,
  categories,
  brands,
  locale,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function push(next: { q?: string; category?: string; brand?: string }) {
    const params = new URLSearchParams();
    const q = (next.q ?? initialQuery).trim();
    const category = next.category ?? initialCategory;
    const brand = next.brand ?? initialBrand;
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (brand) params.set('brand', brand);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/products?${qs}` : '/products');
    });
  }

  return (
    <div className="w-full max-w-xl space-y-3">
      <form
        className="flex w-full gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          push({ q: String(fd.get('q') ?? '') });
        }}
      >
        <input
          name="q"
          defaultValue={initialQuery}
          placeholder={placeholder}
          className="w-full rounded-xl border border-leaf-300 bg-white/90 px-3.5 py-2.5 text-sm outline-none ring-leaf-500/30 transition focus:border-leaf-500 focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-xl bg-leaf-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-leaf-600 disabled:opacity-60"
        >
          Search
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-xl border border-leaf-300 bg-white px-3 py-2 text-sm"
          value={initialCategory}
          onChange={(e) => push({ category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {locale === 'ar' && c.nameAr ? c.nameAr : c.nameEn}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-leaf-300 bg-white px-3 py-2 text-sm"
          value={initialBrand}
          onChange={(e) => push({ brand: e.target.value })}
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
        {(initialCategory || initialBrand || initialQuery) && (
          <button
            type="button"
            onClick={() =>
              startTransition(() => {
                router.push('/products');
              })
            }
            className="rounded-xl border border-leaf-300 px-3 py-2 text-sm text-leaf-800"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
