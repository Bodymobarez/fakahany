import Image from 'next/image';
import { notFound } from 'next/navigation';
import { formatProductMeasure } from '@fv/shared';
import { Price } from '@fv/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ProductGrid } from '@/components/ProductGrid';
import {
  fetchProductBySlug,
  productDisplayName,
  productImage,
  productPrice,
} from '@/lib/catalog';
import { BuyBox } from './BuyBox';
import { ProductReviews } from './ProductReviews';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('product');

  const product = await fetchProductBySlug(slug);
  if (!product) notFound();

  const name = productDisplayName(product, locale);
  const image = productImage(product);
  const price = productPrice(product);
  const compare = product.compareAtPrice
    ? Number(product.compareAtPrice)
    : null;
  const description =
    locale === 'ar'
      ? product.descriptionAr || product.descriptionEn
      : product.descriptionEn || product.descriptionAr;
  const gallery = product.images?.length
    ? product.images.map((i) => i.url)
    : [image];
  const nutrition = product.nutritionJson ?? {
    calories: '80 kcal',
    carbs: '12 g',
    fiber: '3 g',
    vitaminC: 'High',
  };
  const measure = formatProductMeasure({
    soldAs: product.soldAs,
    weight: product.weight,
    unit: product.unit,
    packageSize: product.packageSize,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-leaf-100">
            <Image
              src={gallery[0]!}
              alt={name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {gallery.slice(0, 4).map((url) => (
                <div
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-xl bg-leaf-50"
                >
                  <Image src={url} alt="" fill className="object-cover" sizes="120px" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-leaf-600">
            Fresh Harvest
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-leaf-900 md:text-4xl">
            {name}
          </h1>
          {product.vendor ? (
            <p className="mt-2 text-sm text-ink/65">
              {t('soldBy')}{' '}
              <Link
                href={`/vendors/${product.vendor.slug}`}
                className="font-medium text-leaf-700 underline-offset-2 hover:underline"
              >
                {product.vendor.name}
              </Link>
            </p>
          ) : null}
          {compare != null && compare > price ? (
            <p className="mt-2 text-sm text-ink/40 line-through">
              <Price
                amount={compare}
                className="inline-flex items-center gap-1"
                symbolClassName="inline-block h-4 w-4 opacity-50"
              />
            </p>
          ) : null}

          <p className="mt-6 text-sm leading-relaxed text-ink/75">
            {description ||
              'Hand-selected produce, delivered at peak freshness for your kitchen.'}
          </p>

          <BuyBox
            productId={product.id}
            slug={product.slug}
            name={name}
            basePrice={price}
            imageUrl={image}
            variants={product.variants || []}
            addLabel={t('addToCart')}
            measureLabel={measure}
            inStockLabel={t('inStock')}
            outOfStockLabel={t('outOfStock')}
            inStock={product.inStock !== false}
          />

          <div className="mt-10">
            <h2 className="font-display text-xl font-semibold text-leaf-900">
              {t('nutrition')}
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              {Object.entries(nutrition).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-leaf-200 bg-white/70 px-3 py-2.5"
                >
                  <dt className="text-xs uppercase tracking-wide text-ink/50">
                    {key}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />

      {(() => {
        const related =
          product.relatedProducts?.length
            ? product.relatedProducts
            : (product.relationsFrom || []).map((r) => r.related).filter(Boolean);
        if (!related.length) return null;
        return (
          <section className="mt-14">
            <h2 className="mb-4 font-display text-2xl font-semibold text-leaf-900">
              {t('related')}
            </h2>
            <ProductGrid products={related.slice(0, 8)} />
          </section>
        );
      })()}
    </div>
  );
}
