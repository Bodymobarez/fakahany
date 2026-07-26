'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { formatProductMeasure } from '@fv/shared';
import { Price } from '@fv/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import {
  productDisplayName,
  productImage,
  productPrice,
  type CatalogProduct,
} from '@/lib/api';
import { addToCartApi } from '@/lib/cartApi';
import {
  addToWishlist,
  getWishlistIdSet,
  removeFromWishlist,
} from '@/lib/wishlistApi';
import { selectIsAuthenticated } from '@/store/authSlice';
import { addItemLocal, setCartFromApi } from '@/store/cartSlice';

type ProductCardProps = {
  product: CatalogProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations('product');
  const locale = useLocale();
  const dispatch = useDispatch();
  const isAuth = useSelector(selectIsAuthenticated);
  const [busy, setBusy] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [wished, setWished] = useState(false);
  const name = productDisplayName(product, locale);
  const image = productImage(product);
  const price = productPrice(product);
  const compare = product.compareAtPrice
    ? Number(product.compareAtPrice)
    : null;
  const measure = formatProductMeasure({
    soldAs: product.soldAs,
    weight: product.weight,
    unit: product.unit,
    packageSize: product.packageSize,
  });
  const discountPct =
    compare != null && compare > price
      ? Math.round(((compare - price) / compare) * 10000) / 100
      : null;

  useEffect(() => {
    if (!isAuth) {
      setWished(false);
      return;
    }
    let cancelled = false;
    void getWishlistIdSet().then((ids) => {
      if (!cancelled) setWished(ids.has(product.id));
    });
    return () => {
      cancelled = true;
    };
  }, [isAuth, product.id]);

  async function handleAdd() {
    setBusy(true);
    try {
      const cart = await addToCartApi(product.id, 1);
      dispatch(setCartFromApi(cart));
    } catch {
      dispatch(
        addItemLocal({
          productId: product.id,
          slug: product.slug,
          name,
          unitPrice: price,
          imageUrl: image,
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleWishlist() {
    if (!isAuth || wishBusy) return;
    setWishBusy(true);
    const next = !wished;
    setWished(next);
    try {
      if (next) {
        await addToWishlist(product.id);
      } else {
        await removeFromWishlist(product.id);
      }
    } catch {
      setWished(!next);
    } finally {
      setWishBusy(false);
    }
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-leaf-400 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <Link href={`/products/${product.slug}`} className="absolute inset-0 block">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </Link>
        {discountPct != null && discountPct > 0 ? (
          <span className="absolute start-2 top-2 z-10 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
            -{discountPct} %
          </span>
        ) : null}
        <div className="absolute end-2 top-2 z-10 flex flex-col gap-2">
          {isAuth && (
            <button
              type="button"
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={wished}
              disabled={wishBusy}
              onClick={() => void toggleWishlist()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/95 text-heading shadow-sm transition hover:bg-surface disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill={wished ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </button>
          )}
          <button
            type="button"
            aria-label={t('addToCart')}
            disabled={busy}
            onClick={() => void handleAdd()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/95 text-heading shadow-sm transition hover:bg-surface disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 min-h-[2.75rem] text-sm font-medium leading-snug text-ink transition hover:text-leaf-700"
        >
          {name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-2.5">
          <span className="truncate text-xs text-muted">{measure || '—'}</span>
          <div className="flex shrink-0 flex-wrap items-baseline justify-end gap-1.5">
            {compare != null && compare > price ? (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted line-through">
                <Price
                  amount={compare}
                  className="inline-flex items-center gap-0.5"
                  symbolClassName="inline-block h-3 w-3 opacity-60"
                />
              </span>
            ) : null}
            <Price
              amount={price}
              className="inline-flex items-center gap-1 text-base font-semibold text-heading"
              symbolClassName="inline-block h-3.5 w-3.5"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
