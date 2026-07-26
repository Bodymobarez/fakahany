import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Section } from '@/components/Section';
import { ProductGrid } from '@/components/ProductGrid';
import {
  fetchFeaturedProducts,
  fetchProducts,
  productDisplayName,
  productsForSection,
} from '@/lib/catalog';
import { SAMPLE_CATEGORIES, SAMPLE_PRODUCTS } from '@/lib/sample-products';
import type { CatalogProduct } from '@/lib/api';
import { api, resolveMediaUrl } from '@/lib/api';
import { PromoBanners, type PromoBanner } from '@/components/PromoBanners';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1600&q=80';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const [featured, listed] = await Promise.all([
    fetchFeaturedProducts(),
    fetchProducts({ page: 1 }),
  ]);
  const all: CatalogProduct[] =
    listed.length > 0 ? listed : featured.length > 0 ? featured : SAMPLE_PRODUCTS;

  type HomeCat = { slug: string; nameEn: string; nameAr: string; image: string };
  let categories: HomeCat[] = SAMPLE_CATEGORIES;
  try {
    const { data } = await api.get<{
      categories: Array<{ nameEn: string; nameAr: string; slug: string; imageUrl?: string | null }>;
    }>('/api/catalog/categories');
    if (data.categories?.length) {
      categories = data.categories.map((c) => ({
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        slug: c.slug,
        image: resolveMediaUrl(c.imageUrl || HERO_IMAGE),
      }));
    }
  } catch {
    /* keep samples */
  }

  const bestSellers = productsForSection(all, 'best-seller');
  const offers = productsForSection(all, 'offer');
  const organic = productsForSection(all, 'organic');
  const seasonalFruits = productsForSection(all, 'seasonal');
  const seasonalVeg = productsForSection(all, 'veg');

  type HomeRecipe = {
    slug: string;
    titleEn: string;
    titleAr: string;
    imageUrl?: string | null;
    prepMinutes?: number | null;
  };
  let recipes: HomeRecipe[] = [];
  try {
    const { data: recipeData } = await api.get<{ recipes: HomeRecipe[] }>(
      '/api/content/recipes',
    );
    recipes = recipeData.recipes || [];
  } catch {
    /* optional */
  }

  let recommended: CatalogProduct[] = featured.length ? featured : all;
  try {
    const { data: recData } = await api.get<{ products: CatalogProduct[] }>(
      '/api/expansion/ai/recommendations',
    );
    if (recData.products?.length) recommended = recData.products;
  } catch {
    /* keep featured fallback */
  }

  const promoBanners: PromoBanner[] = [
    {
      id: 'flash-sale',
      titleEn: t('flashSale'),
      titleAr: t('flashSale'),
      imageUrl:
        'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=1400&q=80',
      linkUrl: '/products?tag=flash',
    },
    {
      id: 'new-arrivals',
      titleEn: t('newArrivals'),
      titleAr: t('newArrivals'),
      imageUrl:
        'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1400&q=80',
      linkUrl: '/products?tag=new',
    },
  ];

  let homeReviews: Array<{
    rating: number;
    body: string;
    productName: string;
    userName: string;
  }> = [];
  try {
    const featuredIds = featured.slice(0, 3).map((p) => p.id);
    const reviewBundles = await Promise.all(
      featuredIds.map((id) =>
        api
          .get<{
            reviews: Array<{
              rating: number;
              body: string;
              user: { firstName: string; lastName: string };
            }>;
          }>(`/api/reviews/product/${id}`)
          .then((r) => ({ id, reviews: r.data.reviews || [] }))
          .catch(() => ({ id, reviews: [] as Array<{ rating: number; body: string; user: { firstName: string; lastName: string } }> })),
      ),
    );
    homeReviews = reviewBundles.flatMap((bundle) => {
      const product = featured.find((p) => p.id === bundle.id);
      return bundle.reviews.slice(0, 2).map((r) => ({
        rating: r.rating,
        body: r.body,
        productName: product ? productDisplayName(product, locale) : 'Product',
        userName: `${r.user.firstName} ${r.user.lastName}`.trim(),
      }));
    });
  } catch {
    /* optional */
  }

  return (
    <>
      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            className="hero-media object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-leaf-900/85 via-leaf-800/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-leaf-900/50 via-transparent to-leaf-900/20" />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-4 pb-24 pt-16 md:px-6">
          <p className="animate-rise font-display text-4xl font-semibold tracking-tight text-white drop-shadow md:text-6xl lg:text-7xl">
            {t('brand')}
          </p>
          <h1 className="animate-rise-delay mt-4 max-w-xl font-display text-2xl font-medium leading-snug text-leaf-50 md:text-3xl">
            {t('heroHeadline')}
          </h1>
          <p className="animate-rise-delay-2 mt-3 max-w-md text-base text-leaf-100/90 md:text-lg">
            {t('heroSub')}
          </p>
          <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex items-center rounded-full bg-citrus-500 px-6 py-3 text-sm font-semibold text-ink shadow-lg transition hover:bg-citrus-400"
            >
              {t('shopNow')}
            </Link>
            <a
              href="#categories"
              className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              {t('browseCategories')}
            </a>
          </div>
        </div>
      </section>

      <PromoBanners banners={promoBanners} locale={locale} />

      <Section
        title={t('bestSellers')}
        viewAllHref="/products"
        viewAllLabel={t('viewAll')}
      >
        <ProductGrid
          products={bestSellers.slice(0, 4)}
          emptyLabel={t('emptySection')}
        />
      </Section>

      <Section
        title={t('todaysOffers')}
        viewAllHref="/products"
        viewAllLabel={t('viewAll')}
      >
        <ProductGrid
          products={offers.slice(0, 4)}
          emptyLabel={t('emptySection')}
        />
      </Section>

      <Section
        title={t('featured')}
        viewAllHref="/products"
        viewAllLabel={t('viewAll')}
      >
        <ProductGrid
          products={featured.slice(0, 8)}
          emptyLabel={t('emptySection')}
        />
      </Section>

      <section
        id="categories"
        className="mx-auto max-w-6xl px-4 py-12 md:px-6"
      >
        <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-heading md:text-3xl">
          {t('categories')}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {categories.map((cat) => {
            const label = locale === 'ar' ? cat.nameAr : cat.nameEn;
            return (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group relative aspect-[5/4] overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-line"
              >
                <Image
                  src={cat.image}
                  alt={label}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                <span className="absolute inset-x-2 bottom-2 rounded-lg bg-black/70 px-2.5 py-1.5 font-display text-sm font-semibold leading-tight text-white shadow-sm backdrop-blur-sm md:text-base">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <Section
        title={t('organic')}
        viewAllHref="/products?category=organic"
        viewAllLabel={t('viewAll')}
      >
        <ProductGrid
          products={organic.slice(0, 4)}
          emptyLabel={t('emptySection')}
        />
      </Section>

      <Section
        title={t('seasonalFruits')}
        viewAllHref="/products"
        viewAllLabel={t('viewAll')}
      >
        <ProductGrid
          products={seasonalFruits.slice(0, 4)}
          emptyLabel={t('emptySection')}
        />
      </Section>

      <Section
        title={t('seasonalVeg')}
        viewAllHref="/products"
        viewAllLabel={t('viewAll')}
      >
        <ProductGrid
          products={seasonalVeg.slice(0, 4)}
          emptyLabel={t('emptySection')}
        />
      </Section>

      <Section title={t('recommended')} viewAllHref="/products" viewAllLabel={t('viewAll')}>
        <ProductGrid
          products={recommended.slice(0, 4)}
          emptyLabel={t('emptySection')}
        />
      </Section>

      <Section title={t('reviews')}>
        {homeReviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface-2 px-4 py-10 text-center text-sm text-muted">
            {t('emptySection')}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {homeReviews.slice(0, 3).map((r, idx) => (
              <blockquote
                key={`${r.productName}-${idx}`}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <p className="text-sm font-semibold text-citrus-600">
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink">
                  {r.body || 'Great fresh produce.'}
                </p>
                <footer className="mt-4 text-xs text-muted">
                  {r.userName} · {r.productName}
                </footer>
              </blockquote>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('recipes')} viewAllHref="/recipes" viewAllLabel={t('viewAll')}>
        {recipes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface-2 px-4 py-10 text-center text-sm text-muted">
            {t('emptySection')}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.slice(0, 3).map((r) => (
              <Link
                key={r.slug}
                href={`/recipes/${r.slug}`}
                className="group overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <div className="relative aspect-[16/10] bg-surface-2">
                  {r.imageUrl ? (
                    <Image
                      src={resolveMediaUrl(r.imageUrl)}
                      alt={locale === 'ar' ? r.titleAr : r.titleEn}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg font-semibold text-heading">
                    {locale === 'ar' ? r.titleAr : r.titleEn}
                  </h3>
                  {r.prepMinutes != null ? (
                    <p className="mt-1 text-xs text-muted">{r.prepMinutes} min</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
