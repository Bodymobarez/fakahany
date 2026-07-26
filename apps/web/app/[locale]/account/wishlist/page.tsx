'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Price } from '@fv/ui';
import { useLocale } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import {
  api,
  productDisplayName,
  productImage,
  productPrice,
  type CatalogProduct,
} from '@/lib/api';
import { addToCartApi } from '@/lib/cartApi';
import { invalidateWishlistIds } from '@/lib/wishlistApi';
import { selectIsAuthenticated } from '@/store/authSlice';
import { setCartFromApi } from '@/store/cartSlice';

type WishlistItem = {
  id: string;
  productId: string;
  createdAt: string;
  product: CatalogProduct;
};

export default function WishlistPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const locale = useLocale();
  const dispatch = useDispatch();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuth) {
      setLoading(false);
      return;
    }
    void api
      .get<{ items: WishlistItem[] }>('/api/wishlist')
      .then(({ data }) => setItems(data.items || []))
      .catch(() => setError('Could not load wishlist'))
      .finally(() => setLoading(false));
  }, [isAuth]);

  async function removeItem(productId: string) {
    setRemovingId(productId);
    setError(null);
    try {
      await api.delete(`/api/wishlist/${productId}`);
      invalidateWishlistIds();
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    } catch {
      setError('Could not remove item');
    } finally {
      setRemovingId(null);
    }
  }

  async function addToCart(productId: string) {
    setAddingId(productId);
    setError(null);
    try {
      const cart = await addToCartApi(productId, 1);
      dispatch(setCartFromApi(cart));
    } catch {
      setError('Could not add to cart');
    } finally {
      setAddingId(null);
    }
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Wishlist</h1>
        <p className="mt-3 text-ink/65">Sign in to save favourites for later.</p>
        <Link
          href="/auth/login"
          className="mt-8 inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Wishlist</h1>
        <Link
          href="/account"
          className="text-sm font-medium text-leaf-700 hover:underline"
        >
          Back to account
        </Link>
      </div>

      {loading && <p className="text-sm text-ink/60">Loading…</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!loading && items.length === 0 && (
        <p className="text-ink/65">
          Your wishlist is empty.{' '}
          <Link href="/products" className="font-medium text-leaf-700 hover:underline">
            Browse products
          </Link>
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => {
          const name = productDisplayName(item.product, locale);
          const image = productImage(item.product);
          const price = productPrice(item.product);
          return (
            <li
              key={item.id}
              className="flex items-center gap-4 rounded-2xl border border-leaf-200 bg-white/80 px-4 py-3"
            >
              <Link
                href={`/products/${item.product.slug}`}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-leaf-50"
              >
                <Image src={image} alt={name} fill className="object-cover" sizes="64px" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.product.slug}`}
                  className="font-semibold text-ink hover:text-leaf-700"
                >
                  {name}
                </Link>
                <Price
                  amount={price}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-leaf-800"
                  symbolClassName="inline-block h-3.5 w-3.5"
                />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  disabled={addingId === item.productId}
                  onClick={() => void addToCart(item.productId)}
                  className="rounded-full bg-leaf-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
                >
                  {addingId === item.productId ? '…' : 'Add to cart'}
                </button>
                <button
                  type="button"
                  disabled={removingId === item.productId}
                  onClick={() => void removeItem(item.productId)}
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
