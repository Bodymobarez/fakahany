'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Price } from '@fv/ui';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import {
  applyCouponApi,
  fetchCart,
  removeCouponApi,
} from '@/lib/cartApi';
import { savePendingCardPayment } from '@/lib/checkoutSession';
import {
  availableSlotsForDay,
  buildDayOptions,
  formatScheduledLabel,
  slotRange,
} from '@/lib/deliverySlots';
import { selectIsAuthenticated, selectUser } from '@/store/authSlice';
import {
  clearCart,
  selectCartCoupon,
  selectCartId,
  selectCartItems,
  selectCartTotals,
  setCartFromApi,
} from '@/store/cartSlice';
import {
  EMIRATES,
  LocationPicker,
  UAE_CENTER,
  type MapLocation,
} from '@/components/maps/LocationPicker';
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper';
import {
  PaymentMethodIcon,
  paymentMethodShortLabel,
} from '@/components/checkout/PaymentMethodIcons';

type Address = {
  id: string;
  label: string;
  line1: string;
  city: string;
  emirate: string;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
};

type DeliveryQuote = {
  covered: boolean;
  fee: number;
  etaMinutes: number;
  reason?: string;
  zone?: { name: string; freeAbove: number | null; baseFee?: number } | null;
};

type PayMethod = {
  id: string;
  label: string;
  stub?: boolean;
};

const TIP_PRESETS = [0, 5, 10, 15, 20] as const;

export default function CheckoutPage() {
  const tCart = useTranslations('cart');
  const items = useSelector(selectCartItems);
  const totals = useSelector(selectCartTotals);
  const cartId = useSelector(selectCartId);
  const coupon = useSelector(selectCartCoupon);
  const isAuth = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const router = useRouter();

  const dayOptions = useMemo(() => buildDayOptions(7), []);
  const [dayKey, setDayKey] = useState(() => {
    const today = dayOptions[0];
    if (today && availableSlotsForDay(today.date).length > 0) return today.key;
    return dayOptions[1]?.key || dayOptions[0]?.key || '';
  });
  const [slotId, setSlotId] = useState('');
  const [tipPreset, setTipPreset] = useState<number | 'other'>(10);
  const [customTip, setCustomTip] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [methods, setMethods] = useState<PayMethod[]>([
    { id: 'COD', label: 'Cash on Delivery' },
  ]);
  const [paymentMethod, setPaymentMethod] = useState('STRIPE');
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [location, setLocation] = useState<MapLocation>({
    lat: UAE_CENTER.lat,
    lng: UAE_CENTER.lng,
    emirate: 'Dubai',
    area: '',
    street: '',
    detected: false,
    status: 'idle',
  });

  const tipAmount =
    tipPreset === 'other'
      ? Math.max(0, Number(customTip) || 0)
      : tipPreset;

  const deliveryFee = quote?.covered ? quote.fee : totals.deliveryFee;
  const goodsNet = Math.max(0, totals.subtotal - totals.discountAmount);
  const taxable = goodsNet + deliveryFee;
  const displayVat = Math.round(taxable * 0.05 * 100) / 100;
  const payableTotal = Math.round((taxable + displayVat + tipAmount) * 100) / 100;
  const selectedDay = dayOptions.find((d) => d.key === dayKey) || dayOptions[0];
  const availableSlots = useMemo(() => {
    const day = dayOptions.find((d) => d.key === dayKey);
    return day ? availableSlotsForDay(day.date) : [];
  }, [dayKey, dayOptions]);
  const selectedSlot = availableSlots.find((s) => s.id === slotId) || availableSlots[0] || null;
  const selectedAddress = addresses.find((a) => a.id === addressId);

  useEffect(() => {
    if (!availableSlots.length) {
      if (slotId) setSlotId('');
      return;
    }
    const first = availableSlots[0];
    if (first && !availableSlots.some((s) => s.id === slotId)) {
      setSlotId(first.id);
    }
  }, [availableSlots, slotId]);

  useEffect(() => {
    void fetchCart()
      .then((cart) => dispatch(setCartFromApi(cart)))
      .catch(() => undefined);
  }, [dispatch]);

  useEffect(() => {
    void api
      .get<{ methods: PayMethod[] }>('/api/payments/methods')
      .then(({ data }) => {
        const fromApi = (data.methods || []).filter((m) => m.id !== 'WALLET');
        const byId = new Map(fromApi.map((m) => [m.id, m]));
        if (!byId.has('APPLE_PAY')) {
          byId.set('APPLE_PAY', { id: 'APPLE_PAY', label: 'Apple Pay', stub: true });
        }
        if (!byId.has('GOOGLE_PAY')) {
          byId.set('GOOGLE_PAY', { id: 'GOOGLE_PAY', label: 'Google Pay', stub: true });
        }
        const order = ['STRIPE', 'COD', 'APPLE_PAY', 'GOOGLE_PAY', 'TABBY', 'TAMARA'];
        const ordered = [
          ...order.filter((id) => byId.has(id)).map((id) => byId.get(id)!),
          ...[...byId.values()].filter((m) => !order.includes(m.id)),
        ];
        setMethods(ordered.length ? ordered : [{ id: 'COD', label: 'Cash on Delivery' }]);
        if (byId.has('STRIPE')) setPaymentMethod('STRIPE');
        else if (ordered[0]) setPaymentMethod(ordered[0].id);
      })
      .catch(() => {
        setMethods([
          { id: 'STRIPE', label: 'Credit/Debit Card' },
          { id: 'COD', label: 'Cash on Delivery' },
          { id: 'APPLE_PAY', label: 'Apple Pay', stub: true },
          { id: 'GOOGLE_PAY', label: 'Google Pay', stub: true },
        ]);
      });
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    void api
      .get<{ addresses: Address[] }>('/api/addresses')
      .then(({ data }) => {
        setAddresses(data.addresses);
        const def = data.addresses.find((a) => a.isDefault) || data.addresses[0];
        if (def) setAddressId(def.id);
        if (data.addresses.length === 0) setShowNewAddress(true);
      })
      .catch(() => setShowNewAddress(true));
  }, [isAuth]);

  useEffect(() => {
    if (!isAuth) return;
    const selected = addresses.find((a) => a.id === addressId);
    const payload =
      showNewAddress || !selected
        ? {
            emirate: location.emirate,
            lat: location.lat,
            lng: location.lng,
            subtotal: totals.subtotal - totals.discountAmount,
          }
        : {
            addressId: selected.id,
            subtotal: totals.subtotal - totals.discountAmount,
          };
    void api
      .post<{ quote: DeliveryQuote }>('/api/delivery/quote', payload)
      .then(({ data }) => setQuote(data.quote))
      .catch(() => setQuote(null));
  }, [
    isAuth,
    addressId,
    addresses,
    showNewAddress,
    location.emirate,
    location.lat,
    location.lng,
    totals.subtotal,
    totals.discountAmount,
  ]);

  useEffect(() => {
    if (!isAuth || !addressId || showNewAddress) return;
    void fetchCart({ addressId })
      .then((cart) => dispatch(setCartFromApi(cart)))
      .catch(() => undefined);
  }, [isAuth, addressId, showNewAddress, dispatch]);

  async function onApplyPromo() {
    if (!isAuth) {
      setPromoError('Sign in to apply a promo code');
      return;
    }
    setPromoBusy(true);
    setPromoError(null);
    try {
      const cart = await applyCouponApi(promoCode.trim());
      dispatch(setCartFromApi(cart));
      setPromoCode('');
    } catch (err: unknown) {
      setPromoError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Invalid promo code',
      );
    } finally {
      setPromoBusy(false);
    }
  }

  async function onRemovePromo() {
    setPromoBusy(true);
    try {
      const cart = await removeCouponApi();
      dispatch(setCartFromApi(cart));
    } catch {
      setPromoError('Could not remove promo');
    } finally {
      setPromoBusy(false);
    }
  }

  if (!isAuth && !orderNumber) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-heading">Checkout</h1>
        <p className="mt-3 text-muted">Please sign in to complete your order.</p>
        <Link
          href="/auth/login"
          className="mt-8 inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-600"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !orderNumber) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CheckoutStepper current="checkout" />
        <h1 className="font-display text-3xl font-semibold text-heading">Checkout</h1>
        <p className="mt-3 text-muted">{tCart('empty')}</p>
        <Link
          href="/products"
          className="mt-8 inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-600"
        >
          {tCart('continueShopping')}
        </Link>
      </div>
    );
  }

  if (orderNumber) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CheckoutStepper current="payment" />
        <h1 className="font-display text-3xl font-semibold text-heading">Order placed</h1>
        <p className="mt-3 text-muted">
          Order <strong>{orderNumber}</strong> received.
          {paymentNote ? ` ${paymentNote}` : ''}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={placedOrderId ? `/account/orders/${placedOrderId}` : '/account/orders'}
            className="inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white"
          >
            View order
          </Link>
          {placedOrderId ? (
            <Link
              href={`/account/orders/${placedOrderId}/track`}
              className="inline-flex rounded-full border border-line px-6 py-3 text-sm font-semibold text-heading"
            >
              Track delivery
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  async function createAddressAndCheckout(fd: FormData) {
    const { data } = await api.post<{ address: Address }>('/api/addresses', {
      label: String(fd.get('label') || 'Home'),
      line1: String(fd.get('line1') || location.street || location.area || 'Pinned location'),
      city: String(fd.get('city') || 'Dubai'),
      emirate: location.emirate || String(fd.get('emirate') || 'Dubai'),
      lat: location.lat,
      lng: location.lng,
      area: location.area || null,
      street: location.street || null,
      isDefault: true,
    });
    return data.address.id;
  }

  async function onContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    try {
      if (!selectedDay || !selectedSlot) {
        throw new Error('Select an available delivery date and time slot');
      }
      let selectedAddressId = addressId;
      if (showNewAddress || !selectedAddressId) {
        selectedAddressId = await createAddressAndCheckout(fd);
      }
      if (!cartId) throw new Error('Cart missing');
      if (quote && !quote.covered) {
        throw new Error(quote.reason || 'Outside delivery zone');
      }

      const { start, end } = slotRange(selectedDay.date, selectedSlot);
      const method = paymentMethod || 'COD';

      const { data } = await api.post<{
        order: {
          id: string;
          orderNumber: string;
          total: number | string;
          subtotal: number | string;
          tax: number | string;
          shipping: number | string;
          tipAmount?: number | string;
          discount: number | string;
        };
        payment?: { id: string; status: string };
        intent?: { clientSecret?: string; meta?: { stub?: boolean } };
      }>('/api/checkout', {
        cartId,
        addressId: selectedAddressId,
        paymentMethod: method,
        deliveryType: 'SCHEDULED',
        deliverySlotStart: start.toISOString(),
        deliverySlotEnd: end.toISOString(),
        deliveryNotes: String(fd.get('notes') || '') || null,
        tipAmount: tipAmount > 0 ? tipAmount : 0,
        couponCode: coupon?.code || null,
      });

      const orderTotal = Number(data.order.total);

      if (method === 'STRIPE' && data.payment?.id) {
        const secret = data.intent?.clientSecret || '';
        const isStub = secret.startsWith('stub_') || Boolean(data.intent?.meta?.stub);
        savePendingCardPayment({
          paymentId: data.payment.id,
          clientSecret: isStub ? `stub_${data.payment.id}` : secret,
          orderId: data.order.id,
          orderNumber: data.order.orderNumber,
          amount: orderTotal,
          items: items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            lineTotal: i.unitPrice * i.quantity,
          })),
          subtotal: Number(data.order.subtotal),
          vatAmount: Number(data.order.tax),
          deliveryFee: Number(data.order.shipping),
          tipAmount: Number(data.order.tipAmount || tipAmount),
          discountAmount: Number(data.order.discount || 0),
        });
        dispatch(clearCart());
        try {
          const cart = await fetchCart();
          dispatch(setCartFromApi(cart));
        } catch {
          /* ok */
        }
        router.push('/checkout/payment');
        return;
      }

      if (data.payment?.id && (method === 'TABBY' || method === 'TAMARA')) {
        dispatch(clearCart());
        try {
          const cart = await fetchCart();
          dispatch(setCartFromApi(cart));
        } catch {
          /* ok */
        }
        const q = new URLSearchParams({
          paymentId: data.payment.id,
          orderId: data.order.id,
          orderNumber: data.order.orderNumber,
          method,
        });
        router.push(`/checkout/bnpl?${q.toString()}`);
        return;
      }

      if (
        data.payment?.id &&
        (method === 'APPLE_PAY' ||
          method === 'GOOGLE_PAY' ||
          Boolean(data.intent?.meta?.stub))
      ) {
        await api.post('/api/payments/confirm', {
          paymentId: data.payment.id,
          externalId: `${method.toLowerCase()}_confirmed_${data.order.id}`,
        });
        setPaymentNote(`${method.replaceAll('_', ' ')} payment confirmed.`);
      } else if (method === 'COD') {
        setPaymentNote('Pay cash on delivery.');
      }

      setPlacedOrderId(data.order.id);
      setOrderNumber(data.order.orderNumber);
      dispatch(clearCart());
      try {
        const cart = await fetchCart();
        dispatch(setCartFromApi(cart));
      } catch {
        /* ok */
      }
      router.refresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ||
        (err instanceof Error ? err.message : 'Checkout failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const deliverToLabel = selectedAddress
    ? `${user?.firstName || 'Customer'} ${user?.lastName || ''}, ${selectedAddress.line1}, ${selectedAddress.city}`.trim()
    : 'Select an address';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <CheckoutStepper current="checkout" />

      <form
        onSubmit={(e) => void onContinue(e)}
        className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]"
      >
        <div className="space-y-5">
          {/* Delivery address */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-heading">
                Delivery Address
              </h2>
              <button
                type="button"
                onClick={() => setShowNewAddress(true)}
                className="text-sm font-semibold text-leaf-700 hover:underline"
              >
                + Add New Address
              </button>
            </div>

            {addresses.length > 0 && !showNewAddress ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => {
                  const selected = addressId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAddressId(a.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? 'border-leaf-700 bg-leaf-50 ring-2 ring-leaf-700/20'
                          : 'border-line bg-surface hover:border-leaf-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-heading">{a.label}</span>
                        {a.isDefault ? (
                          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        {a.line1}
                        <br />
                        {a.city}, {a.emirate}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Label</span>
                  <input
                    name="label"
                    defaultValue="Home"
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Street address</span>
                  <input
                    name="line1"
                    required
                    placeholder="Building, street, area"
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">City</span>
                    <input
                      name="city"
                      required
                      defaultValue="Dubai"
                      className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium">Emirate</span>
                    <select
                      name="emirate"
                      value={location.emirate}
                      onChange={(e) =>
                        setLocation((l) => ({ ...l, emirate: e.target.value }))
                      }
                      className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                    >
                      {EMIRATES.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <LocationPicker value={location} onChange={setLocation} />
                {addresses.length > 0 ? (
                  <button
                    type="button"
                    className="text-sm text-leaf-700 underline"
                    onClick={() => setShowNewAddress(false)}
                  >
                    Use saved address
                  </button>
                ) : null}
              </div>
            )}
          </section>

          {/* Delivery time */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-xl font-semibold text-heading">
              Preferred Delivery Time
            </h2>
            <p className="mt-1 text-sm text-muted">Select Date</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {dayOptions.map((d) => {
                const selected = d.key === dayKey;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDayKey(d.key)}
                    className={`shrink-0 rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selected
                        ? 'border-leaf-700 bg-leaf-50 font-semibold text-leaf-900 ring-2 ring-leaf-700/20'
                        : 'border-line text-ink hover:border-leaf-400'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-5 text-sm text-muted">Select Time Slot</p>
            {availableSlots.length === 0 ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No delivery slots left for today. Please choose another date.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {availableSlots.map((slot) => {
                  const selected = slot.id === slotId;
                  return (
                    <label
                      key={slot.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                        selected
                          ? 'border-leaf-700 bg-leaf-50 ring-2 ring-leaf-700/20'
                          : 'border-line hover:border-leaf-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="slot"
                        className="accent-leaf-700"
                        checked={selected}
                        onChange={() => setSlotId(slot.id)}
                      />
                      <span className="font-medium text-ink">{slot.label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {selectedDay && selectedSlot ? (
              <p className="mt-4 rounded-xl bg-leaf-50 px-4 py-3 text-sm text-leaf-900">
                {formatScheduledLabel(selectedDay.date, selectedSlot)}
              </p>
            ) : null}

            <label className="mt-4 block text-sm">
              <span className="mb-1.5 block font-medium text-muted">Delivery notes</span>
              <textarea
                name="notes"
                rows={2}
                placeholder="Gate code, leave with security…"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
              />
            </label>
          </section>

          {/* Tip */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-xl font-semibold text-heading">Tip Your Driver</h2>
            <p className="mt-1 text-sm text-muted">100% of your tip goes to the driver.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {TIP_PRESETS.map((amount) => {
                const selected = tipPreset === amount;
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTipPreset(amount)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? 'border-leaf-700 bg-leaf-700 text-white'
                        : 'border-line text-ink hover:border-leaf-400'
                    }`}
                  >
                    {amount === 0 ? 'No tip' : `AED ${amount}`}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setTipPreset('other')}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  tipPreset === 'other'
                    ? 'border-leaf-700 bg-leaf-700 text-white'
                    : 'border-line text-ink hover:border-leaf-400'
                }`}
              >
                Other
              </button>
            </div>
            {tipPreset === 'other' ? (
              <input
                type="number"
                min={0}
                step="1"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                placeholder="Enter tip amount"
                className="mt-3 w-full max-w-xs rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
              />
            ) : null}
            {tipAmount > 0 ? (
              <p className="mt-3 rounded-xl bg-leaf-50 px-4 py-3 text-sm text-leaf-900">
                Thank you! Your driver will receive{' '}
                <Price
                  amount={tipAmount}
                  className="inline-flex items-center gap-0.5 font-semibold"
                  symbolClassName="inline-block h-3 w-3"
                />{' '}
                tip
              </p>
            ) : null}
          </section>

          {/* Payment method */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-xl font-semibold text-heading">Payment Method</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {methods.map((m) => {
                const selected = paymentMethod === m.id;
                const label = paymentMethodShortLabel(m.id, m.label);
                return (
                  <button
                    key={m.id}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-pressed={selected}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex aspect-[3/2] items-center justify-center rounded-xl border px-2 py-2 transition ${
                      selected
                        ? 'border-leaf-700 bg-leaf-50 ring-2 ring-leaf-700/25'
                        : 'border-line bg-surface hover:border-leaf-400'
                    }`}
                  >
                    <PaymentMethodIcon id={m.id} className="h-10 w-14 object-contain sm:h-11 sm:w-16" />
                  </button>
                );
              })}
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            {quote && !quote.covered ? (
              <p className="mt-4 text-sm text-red-600">
                {quote.reason || 'We do not deliver to this location yet.'}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                loading ||
                Boolean(quote && !quote.covered) ||
                !selectedSlot ||
                availableSlots.length === 0
              }
              className="mt-5 w-full rounded-full bg-leaf-700 py-3.5 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
            >
              {loading
                ? 'Processing…'
                : paymentMethod === 'STRIPE'
                  ? 'Continue to Payment'
                  : 'Place order'}
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              Your order will be processed securely. No card details are stored on our servers.
            </p>
          </section>
        </div>

        {/* Order summary */}
        <aside className="h-fit rounded-2xl border border-line bg-surface p-5 md:sticky md:top-24">
          <h2 className="font-display text-xl font-semibold text-heading">Order Summary</h2>
          <p className="mt-2 text-sm text-muted">
            <span className="font-medium text-ink">Delivering to:</span> {deliverToLabel}
          </p>

          <ul className="mt-4 space-y-3 border-b border-line pb-4 text-sm">
            {items.map((item) => (
              <li key={item.id || item.productId} className="flex justify-between gap-3">
                <span className="text-muted">
                  {item.name} × {item.quantity}
                </span>
                <Price
                  amount={item.unitPrice * item.quantity}
                  className="inline-flex items-center gap-1 font-medium"
                  symbolClassName="inline-block h-3.5 w-3.5"
                />
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <p className="text-sm font-medium text-ink">Promo Code</p>
            {coupon ? (
              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-leaf-800">{coupon.code} applied</span>
                <button
                  type="button"
                  disabled={promoBusy}
                  onClick={() => void onRemovePromo()}
                  className="text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                  className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                />
                <button
                  type="button"
                  disabled={promoBusy || !promoCode.trim()}
                  onClick={() => void onApplyPromo()}
                  className="rounded-full bg-leaf-700 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
                >
                  Apply
                </button>
              </div>
            )}
            {promoError ? <p className="mt-1 text-xs text-red-600">{promoError}</p> : null}
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <Price
                amount={totals.subtotal}
                className="inline-flex items-center gap-1"
                symbolClassName="inline-block h-3.5 w-3.5"
              />
            </div>
            {totals.discountAmount > 0 ? (
              <div className="flex justify-between text-leaf-700">
                <span>Discount</span>
                <Price
                  amount={totals.discountAmount}
                  className="inline-flex items-center gap-1"
                  symbolClassName="inline-block h-3.5 w-3.5"
                />
              </div>
            ) : null}
            <div className="flex justify-between rounded-lg bg-citrus-50 px-3 py-2">
              <span className="text-muted">VAT (5%)</span>
              <Price
                amount={displayVat}
                className="inline-flex items-center gap-1"
                symbolClassName="inline-block h-3.5 w-3.5"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Delivery Fee{quote?.zone ? ` (${quote.zone.name})` : ''}</span>
              <Price
                amount={deliveryFee}
                className="inline-flex items-center gap-1 font-medium"
                symbolClassName="inline-block h-3.5 w-3.5"
              />
            </div>
            {tipAmount > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted">Driver Tip</span>
                <Price
                  amount={tipAmount}
                  className="inline-flex items-center gap-1 font-medium"
                  symbolClassName="inline-block h-3.5 w-3.5"
                />
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-3 text-base">
              <span className="font-semibold text-heading">Total</span>
              <Price
                amount={payableTotal}
                className="inline-flex items-center gap-1.5 text-lg font-semibold text-leaf-800"
                symbolClassName="inline-block h-4 w-4"
              />
            </div>
          </div>

          <Link
            href="/cart"
            className="mt-5 flex w-full items-center justify-center rounded-full border-2 border-leaf-700 px-6 py-3 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
          >
            Back to Basket
          </Link>
        </aside>
      </form>
    </div>
  );
}
