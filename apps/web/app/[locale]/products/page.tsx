import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProductGrid } from '@/components/ProductGrid';
import { fetchProducts } from '@/lib/catalog';
import { api } from '@/lib/api';
import { ProductSearch } from './ProductSearch';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; brand?: string }>;
};

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q, category, brand } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('product');
  const tNav = await getTranslations('nav');

  const products = await fetchProducts({ q, category, brand });

  let categories: Array<{ slug: string; nameEn: string; nameAr: string }> = [];
  let brands: Array<{ slug: string; name: string }> = [];
  try {
    const [catRes, brandRes] = await Promise.all([
      api.get<{ categories: Array<{ slug: string; nameEn: string; nameAr: string }> }>(
        '/api/catalog/categories',
      ),
      api.get<{ brands: Array<{ slug: string; name: string }> }>('/api/catalog/brands').catch(() => ({
        data: { brands: [] as Array<{ slug: string; name: string }> },
      })),
    ]);
    categories = catRes.data.categories || [];
    brands = brandRes.data.brands || [];
  } catch {
    /* optional filters */
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-leaf-900 md:text-4xl">
            {tNav('products')}
          </h1>
          <p className="mt-1 text-sm text-ink/60">{t('search')}</p>
        </div>
        <ProductSearch
          initialQuery={q ?? ''}
          initialCategory={category ?? ''}
          initialBrand={brand ?? ''}
          placeholder={tNav('searchPlaceholder')}
          categories={categories}
          brands={brands}
          locale={locale}
        />
      </div>
      <ProductGrid products={products} emptyLabel={t('noResults')} />
    </div>
  );
}
