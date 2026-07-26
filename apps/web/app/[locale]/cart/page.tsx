'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Price } from '@fv/ui';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import {
  clearCartApi,
  removeCartItemApi,
  updateCartItemApi,
} from '@/lib/cartApi';
import { addToWishlist } from '@/lib/wishlistApi';
import { selectIsAuthenticated } from '@/store/authSlice';
import {
  clearCart,
  selectCartItems,
  selectCartSubtotal,
  selectCartTotals,
  setCartFromApi,
} from '@/store/cartSlice';

export default function CartPage() {
  const t = useTranslations('cart');
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const totals = useSelector(selectCartTotals);
  const isAuth = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeQty(itemId: string | undefined, quantity: number) {
    if (!itemId || quantity < 1) return;
    setBusyId(itemId);
    try {
      const cart = await updateCartItemApi(itemId, quantity);
      dispatch(setCartFromApi(cart));
    } catch {
      setError('Could not update quantity');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(itemId: string | undefined) {
    if (!itemId) return;
    setBusyId(itemId);
    try {
      const cart = await removeCartItemApi(itemId);
      dispatch(setCartFromApi(cart));
    } catch {
      setError('Could not remove item');
    } finally {
      setBusyId(null);
    }
  }

  async function saveItem(itemId: string | undefined, productId: string) {
    if (!itemId) return;
    if (!isAuth) {
      setError('Sign in to save items for later');
      return;
    }
    setBusyId(itemId);
    setError(null);
    try {
      await addToWishlist(productId);
      const cart = await removeCartItemApi(itemId);
      dispatch(setCartFromApi(cart));
    } catch {
      setError('Could not save item for later');
    } finally {
      setBusyId(null);
    }
  }

  async function saveBasketForLater() {
    if (!isAuth) {
      setError('Sign in to save your basket for later');
      return;
    }
    setError(null);
    try {
      for (const item of items) {
        await addToWishlist(item.productId);
      }
      const cart = await clearCartApi();
      dispatch(setCartFromApi(cart));
    } catch {
      setError('Could not save basket for later');
    }
  }

  async function onClearBasket() {
    setError(null);
    try {
      const cart = await clearCartApi();
      dispatch(setCartFromApi(cart));
      dispatch(clearCart());
    } catch {
      setError('Could not clear basket');
    }
  }

  // Basket summary excludes delivery (quoted at checkout by zone).
  const goodsNet = Math.max(0, subtotal - totals.discountAmount);
  const basketVat = Math.round(goodsNet * 0.05 * 100) / 100;
  const basketTotal = Math.round((goodsNet + basketVat) * 100) / 100;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-heading md:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-3 text-muted">{t('empty')}</p>
        <Link
          href="/products"
          className="mt-8 inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-600"
        >
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-heading md:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-muted md:text-base">{t('subtitle')}</p>
      </header>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.9fr)]">
        <div className="space-y-4">
          {items.map((item) => {
            const lineTotal = item.unitPrice * item.quantity;
            const disabled = busyId === item.id;
            return (
              <article
                key={item.id || item.productId}
                className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:h-28 sm:w-28">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold text-heading">
                    {item.name}
                  </h2>
                  <div className="mt-1">
                    <Price
                      amount={item.unitPrice}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700"
                      symbolClassName="inline-block h-3.5 w-3.5"
                    />
                    <span className="text-sm text-muted"> / unit</span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="inline-flex items-center rounded-full border border-line bg-surface-2">
                      <button
                        type="button"
                        disabled={disabled || item.quantity <= 1}
                        onClick={() => void changeQty(item.id, item.quantity - 1)}
                        className="px-3 py-1.5 text-lg leading-none text-heading disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="min-w-[2.5rem] text-center text-sm font-semibold text-ink">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void changeQty(item.id, item.quantity + 1)}
                        className="px-3 py-1.5 text-lg leading-none text-heading disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <Price
                      amount={lineTotal}
                      className="inline-flex items-center gap-1 text-lg font-semibold text-heading"
                      symbolClassName="inline-block h-4 w-4"
                    />
                  </div>

                  <div className="mt-3 flex gap-4 text-sm">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void saveItem(item.id, item.productId)}
                      className="inline-flex items-center gap-1.5 font-medium text-leaf-700 hover:underline disabled:opacity-50"
                    >
                      <HeartIcon />
                      {t('save')}
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void remove(item.id)}
                      className="font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      {t('remove')}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          <Link
            href="/products"
            className="flex w-full items-center justify-center rounded-full border-2 border-leaf-700 px-6 py-3 text-sm font-semibold text-leaf-800 transition hover:bg-leaf-50"
          >
            {t('continueShopping')}
          </Link>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-surface p-5 md:sticky md:top-24">
          <h2 className="font-display text-xl font-semibold text-heading">
            {t('orderSummary')}
          </h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t('subtotal')}</span>
              <Price
                amount={subtotal}
                className="inline-flex items-center gap-1 font-medium"
                symbolClassName="inline-block h-3.5 w-3.5"
              />
            </div>
            {totals.discountAmount > 0 ? (
              <div className="flex justify-between text-leaf-700">
                <span>Discount</span>
                <Price
                  amount={totals.discountAmount}
                  className="inline-flex items-center gap-1 font-medium"
                  symbolClassName="inline-block h-3.5 w-3.5"
                />
              </div>
            ) : null}
            <div className="flex justify-between rounded-lg bg-citrus-50 px-3 py-2">
              <span className="text-muted">{t('vat')}</span>
              <Price
                amount={basketVat}
                className="inline-flex items-center gap-1 font-medium"
                symbolClassName="inline-block h-3.5 w-3.5"
              />
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base">
              <span className="font-semibold text-heading">Total</span>
              <Price
                amount={basketTotal}
                className="inline-flex items-center gap-1.5 text-lg font-semibold text-leaf-800"
                symbolClassName="inline-block h-4 w-4"
              />
            </div>
          </div>

          <Link
            href="/checkout"
            className="mt-6 flex w-full items-center justify-center rounded-full bg-leaf-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-leaf-600"
          >
            {t('checkout')}
          </Link>
          <button
            type="button"
            onClick={() => void saveBasketForLater()}
            className="mt-3 flex w-full items-center justify-center rounded-full border-2 border-leaf-700 px-6 py-3 text-sm font-semibold text-leaf-800 transition hover:bg-leaf-50"
          >
            {t('saveForLater')}
          </button>
          <button
            type="button"
            onClick={() => void onClearBasket()}
            className="mt-3 w-full py-2 text-sm font-medium text-red-600 hover:underline"
          >
            {t('clearBasket')}
          </button>
        </aside>
      </div>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C4.1 3.75 2 5.765 2 8.25c0 7.22 10 12 10 12s10-4.78 10-12z"
      />
    </svg>
  );
}
