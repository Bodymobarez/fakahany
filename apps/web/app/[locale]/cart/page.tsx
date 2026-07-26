'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { Price } from '@fv/ui';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import {
  applyCouponApi,
  removeCartItemApi,
  removeCouponApi,
  updateCartItemApi,
} from '@/lib/cartApi';
import { selectIsAuthenticated } from '@/store/authSlice';
import {
  selectCartCoupon,
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
  const coupon = useSelector(selectCartCoupon);
  const isAuth = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const [code, setCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  async function changeQty(itemId: string | undefined, quantity: number) {
    if (!itemId) return;
    try {
      const cart = await updateCartItemApi(itemId, quantity);
      dispatch(setCartFromApi(cart));
    } catch {
      /* ignore */
    }
  }

  async function remove(itemId: string | undefined) {
    if (!itemId) return;
    try {
      const cart = await removeCartItemApi(itemId);
      dispatch(setCartFromApi(cart));
    } catch {
      /* ignore */
    }
  }

  async function onApplyCoupon(e: FormEvent) {
    e.preventDefault();
    if (!isAuth) {
      setCouponError('Sign in to apply a coupon');
      return;
    }
    setCouponBusy(true);
    setCouponError(null);
    try {
      const cart = await applyCouponApi(code.trim());
      dispatch(setCartFromApi(cart));
      setCode('');
    } catch (err: unknown) {
      setCouponError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Invalid coupon',
      );
    } finally {
      setCouponBusy(false);
    }
  }

  async function onRemoveCoupon() {
    setCouponBusy(true);
    setCouponError(null);
    try {
      const cart = await removeCouponApi();
      dispatch(setCartFromApi(cart));
    } catch {
      setCouponError('Could not remove coupon');
    } finally {
      setCouponBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">
          {t('title')}
        </h1>
        <p className="mt-3 text-ink/65">{t('empty')}</p>
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
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-leaf-900">
        {t('title')}
      </h1>

      <ul className="mt-8 divide-y divide-leaf-200 border-y border-leaf-200">
        {items.map((item) => (
          <li key={item.id || item.productId} className="flex gap-4 py-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-leaf-100">
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-ink">{item.name}</p>
                <div className="mt-1">
                  <Price
                    amount={item.unitPrice}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-800"
                    symbolClassName="inline-block h-3.5 w-3.5"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-ink/70">
                  {t('quantity')}
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      void changeQty(item.id, Number(e.target.value))
                    }
                    className="w-16 rounded-lg border border-leaf-300 px-2 py-1 text-center"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  className="text-sm text-ink/50 hover:text-red-600"
                >
                  {t('remove')}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-2xl border border-leaf-200 bg-white/70 p-4">
        <p className="text-sm font-medium text-ink">Promo code</p>
        {coupon ? (
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-leaf-800">
              {coupon.code} applied
              {coupon.type === 'PERCENT' ? ` (−${coupon.value}%)` : ''}
            </span>
            <button
              type="button"
              disabled={couponBusy}
              onClick={() => void onRemoveCoupon()}
              className="text-red-600 hover:underline disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void onApplyCoupon(e)} className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="FRESH10"
              className="min-w-0 flex-1 rounded-xl border border-leaf-300 px-3 py-2 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
            />
            <button
              type="submit"
              disabled={couponBusy || !code.trim()}
              className="rounded-full bg-leaf-700 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
            >
              Apply
            </button>
          </form>
        )}
        {couponError && <p className="mt-2 text-sm text-red-600">{couponError}</p>}
        {!isAuth && (
          <p className="mt-2 text-xs text-ink/50">
            <Link href="/auth/login" className="text-leaf-700 underline">
              Sign in
            </Link>{' '}
            to apply coupons.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col items-end gap-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-ink/70">{t('subtotal')}</span>
          <Price
            amount={subtotal}
            className="inline-flex items-center gap-1.5 font-semibold text-leaf-800"
            symbolClassName="inline-block h-4 w-4"
          />
        </div>
        {totals.discountAmount > 0 && (
          <div className="flex items-center gap-3 text-leaf-700">
            <span>Discount</span>
            <Price
              amount={totals.discountAmount}
              className="inline-flex items-center gap-1"
              symbolClassName="inline-block h-3.5 w-3.5"
            />
          </div>
        )}
        {totals.vatAmount > 0 && (
          <div className="flex items-center gap-3 text-ink/60">
            <span>VAT</span>
            <Price
              amount={totals.vatAmount}
              className="inline-flex items-center gap-1"
              symbolClassName="inline-block h-3.5 w-3.5"
            />
          </div>
        )}
        <div className="flex items-center gap-3 text-lg">
          <span className="text-ink/70">Total</span>
          <Price
            amount={totals.total || subtotal}
            className="inline-flex items-center gap-1.5 font-semibold text-leaf-800"
            symbolClassName="inline-block h-4 w-4"
          />
        </div>
        <Link
          href="/checkout"
          className="mt-4 inline-flex rounded-full bg-leaf-700 px-8 py-3 text-sm font-semibold text-white hover:bg-leaf-600"
        >
          {t('checkout')}
        </Link>
      </div>
    </div>
  );
}
