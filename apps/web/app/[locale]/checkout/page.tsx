'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Price } from '@fv/ui';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import { fetchCart } from '@/lib/cartApi';
import { selectIsAuthenticated } from '@/store/authSlice';
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
import { StripeCardForm } from '@/components/checkout/StripeCardForm';
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
  zone?: { name: string; freeAbove: number | null } | null;
};

type PayMethod = {
  id: string;
  label: string;
  stub?: boolean;
};

export default function CheckoutPage() {
  const tCart = useTranslations('cart');
  const tCommon = useTranslations('common');
  const items = useSelector(selectCartItems);
  const totals = useSelector(selectCartTotals);
  const cartId = useSelector(selectCartId);
  const coupon = useSelector(selectCartCoupon);
  const isAuth = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletInput, setWalletInput] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsPerAed, setPointsPerAed] = useState(100);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [loyaltyInput, setLoyaltyInput] = useState('');
  const [methods, setMethods] = useState<PayMethod[]>([
    { id: 'COD', label: 'Cash on Delivery' },
  ]);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
  const [pendingStripe, setPendingStripe] = useState<{
    paymentId: string;
    clientSecret: string;
    orderId: string;
    orderNumber: string;
  } | null>(null);
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

  useEffect(() => {
    void fetchCart()
      .then((cart) => dispatch(setCartFromApi(cart)))
      .catch(() => undefined);
  }, [dispatch]);

  useEffect(() => {
    void api
      .get<{ methods: PayMethod[]; publishableKey?: string | null }>('/api/payments/methods')
      .then(({ data }) => {
        // Partial wallet apply is the checkbox below; primary methods exclude WALLET.
        const fromApi = (data.methods || []).filter((m) => m.id !== 'WALLET');
        const byId = new Map(fromApi.map((m) => [m.id, m]));
        // Always surface Apple / Google Pay on checkout (demo stubs).
        if (!byId.has('APPLE_PAY')) {
          byId.set('APPLE_PAY', { id: 'APPLE_PAY', label: 'Apple Pay', stub: true });
        }
        if (!byId.has('GOOGLE_PAY')) {
          byId.set('GOOGLE_PAY', { id: 'GOOGLE_PAY', label: 'Google Pay', stub: true });
        }
        const order = ['COD', 'STRIPE', 'APPLE_PAY', 'GOOGLE_PAY', 'TABBY', 'TAMARA'];
        const ordered = [
          ...order.filter((id) => byId.has(id)).map((id) => byId.get(id)!),
          ...[...byId.values()].filter((m) => !order.includes(m.id)),
        ];
        setMethods(ordered.length ? ordered : [{ id: 'COD', label: 'Cash on Delivery' }]);
        if (ordered[0]) setPaymentMethod(ordered[0].id);
        const pk =
          data.publishableKey ||
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
          null;
        setStripePublishableKey(pk);
      })
      .catch(() => {
        setMethods([
          { id: 'COD', label: 'Cash on Delivery' },
          { id: 'STRIPE', label: 'Card (Stripe)' },
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

    void api
      .get<{ wallet: { balance: number | string } }>('/api/wallet/me')
      .then(({ data }) => {
        const bal = Number(data.wallet?.balance || 0);
        setWalletBalance(bal);
        setWalletInput((prev) => (prev ? prev : bal > 0 ? String(bal) : ''));
      })
      .catch(() => undefined);

    void api
      .get<{
        account: { points: number };
        redeem: { pointsPerAed: number; redeemableAed: number };
      }>('/api/loyalty/me')
      .then(({ data }) => {
        setLoyaltyPoints(data.account?.points || 0);
        setPointsPerAed(data.redeem?.pointsPerAed || 100);
        setLoyaltyInput((prev) =>
          prev ? prev : data.redeem?.redeemableAed ? String(data.account.points) : '',
        );
      })
      .catch(() => undefined);
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

  if (pendingStripe) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Pay by card</h1>
        <p className="mt-2 text-sm text-ink/65">
          Order <strong>{pendingStripe.orderNumber}</strong> is reserved. Complete card payment
          below.
        </p>
        <div className="mt-8 rounded-2xl border border-leaf-200 bg-white/90 p-5">
          <StripeCardForm
            clientSecret={pendingStripe.clientSecret}
            paymentId={pendingStripe.paymentId}
            publishableKey={stripePublishableKey || ''}
            onPaid={() => {
              setPaymentNote('Card payment confirmed.');
              setPlacedOrderId(pendingStripe.orderId);
              setOrderNumber(pendingStripe.orderNumber);
              setPendingStripe(null);
            }}
            onError={(msg) => setError(msg)}
          />
        </div>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (!isAuth && !orderNumber) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Checkout</h1>
        <p className="mt-3 text-ink/65">Please sign in to complete your order.</p>
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
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Checkout</h1>
        <p className="mt-3 text-ink/65">{tCart('empty')}</p>
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
    async function downloadPlacedInvoice() {
      if (!placedOrderId) return;
      try {
        const res = await api.get(`/api/orders/${placedOrderId}/invoice`, {
          responseType: 'blob',
        });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${orderNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setError('Invoice is not ready yet — open the order page to try again.');
      }
    }

    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">
          Order placed
        </h1>
        <p className="mt-3 text-ink/65">
          Order <strong>{orderNumber}</strong> received. Your invoice notification has been sent.
          {paymentNote ? ` ${paymentNote}` : ''}
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {placedOrderId ? (
            <button
              type="button"
              onClick={() => void downloadPlacedInvoice()}
              className="inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-600"
            >
              Download invoice
            </button>
          ) : null}
          <Link
            href={placedOrderId ? `/account/orders/${placedOrderId}` : '/account/orders'}
            className="inline-flex rounded-full border border-leaf-300 px-6 py-3 text-sm font-semibold text-leaf-800"
          >
            View order
          </Link>
          {placedOrderId ? (
            <Link
              href={`/account/orders/${placedOrderId}/track`}
              className="inline-flex rounded-full border border-leaf-300 px-6 py-3 text-sm font-semibold text-leaf-800"
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    try {
      let selectedAddress = addressId;
      if (showNewAddress || !selectedAddress) {
        selectedAddress = await createAddressAndCheckout(fd);
      }
      if (!cartId) throw new Error('Cart missing');
      if (quote && !quote.covered) {
        throw new Error(quote.reason || 'Outside delivery zone');
      }

      const requestedWallet = useWallet
        ? Math.min(walletBalance, Number(walletInput || 0), totals.total)
        : 0;
      const requestedPoints = useLoyalty
        ? Math.min(loyaltyPoints, Math.floor(Number(loyaltyInput || 0)))
        : 0;

      const method =
        paymentMethod === 'WALLET' ? 'WALLET' : paymentMethod || 'COD';

      const { data } = await api.post<{
        order: { orderNumber: string; id: string };
        payment?: { id: string; status: string };
        intent?: { clientSecret?: string; meta?: { stub?: boolean } };
      }>('/api/checkout', {
        cartId,
        addressId: selectedAddress,
        paymentMethod: method,
        deliveryType: 'SAME_DAY',
        deliveryNotes: String(fd.get('notes') || '') || null,
        walletAmount: requestedWallet > 0 ? requestedWallet : null,
        pointsToRedeem: requestedPoints > 0 ? requestedPoints : null,
        couponCode: coupon?.code || null,
      });

      let note =
        method === 'COD'
          ? 'Pay cash on delivery.'
          : method === 'WALLET'
            ? 'Paid from wallet.'
            : 'Payment processing…';

      if (method === 'STRIPE' && data.payment?.id) {
        const secret = data.intent?.clientSecret || '';
        const isStub = secret.startsWith('stub_') || Boolean(data.intent?.meta?.stub);
        if (isStub) {
          await api.post('/api/payments/confirm', {
            paymentId: data.payment.id,
            externalId: `stub_confirmed_${data.order.id}`,
          });
          note = 'Card payment confirmed (demo Stripe stub).';
        } else if (secret) {
          setPendingStripe({
            paymentId: data.payment.id,
            clientSecret: secret,
            orderId: data.order.id,
            orderNumber: data.order.orderNumber,
          });
          dispatch(clearCart());
          try {
            const cart = await fetchCart();
            dispatch(setCartFromApi(cart));
          } catch {
            /* ok */
          }
          return;
        } else {
          note = 'Card payment intent missing client secret.';
        }
      } else if (data.payment?.id && (method === 'TABBY' || method === 'TAMARA')) {
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
      } else if (
        data.payment?.id &&
        (method === 'APPLE_PAY' ||
          method === 'GOOGLE_PAY' ||
          Boolean(data.intent?.meta?.stub))
      ) {
        await api.post('/api/payments/confirm', {
          paymentId: data.payment.id,
          externalId: `${method.toLowerCase()}_confirmed_${data.order.id}`,
        });
        note = `${method.replaceAll('_', ' ')} payment confirmed (demo stub).`;
      }

      setPaymentNote(note);
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
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Checkout failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl items-start gap-8 px-4 py-10 md:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] md:gap-10 md:px-6">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">
          Checkout
        </h1>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
          {addresses.length > 0 && !showNewAddress && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Delivery address</legend>
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer gap-3 rounded-xl border border-leaf-200 bg-white/80 p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="addressId"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                  />
                  <span>
                    <strong>{a.label}</strong>
                    <br />
                    {a.line1}, {a.city}, {a.emirate}
                  </span>
                </label>
              ))}
              <button
                type="button"
                className="text-sm text-leaf-700 underline"
                onClick={() => setShowNewAddress(true)}
              >
                Add new address
              </button>
            </fieldset>
          )}

          {(showNewAddress || addresses.length === 0) && (
            <>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Label</span>
                <input
                  name="label"
                  defaultValue="Home"
                  className="w-full rounded-xl border border-leaf-300 bg-white px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Street address</span>
                <input
                  name="line1"
                  required
                  placeholder="Building, street, area"
                  className="w-full rounded-xl border border-leaf-300 bg-white px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">City</span>
                  <input
                    name="city"
                    required
                    defaultValue="Dubai"
                    className="w-full rounded-xl border border-leaf-300 bg-white px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
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
                    className="w-full rounded-xl border border-leaf-300 bg-white px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
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
            </>
          )}

          {quote ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                quote.covered
                  ? 'border-leaf-200 bg-leaf-50/80 text-leaf-900'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {quote.covered ? (
                <>
                  Delivery to {quote.zone?.name || 'your area'}:{' '}
                  <Price
                    amount={quote.fee}
                    className="inline-flex items-center gap-0.5 font-semibold"
                    symbolClassName="inline-block h-3 w-3"
                  />
                  {quote.fee === 0 ? ' (free)' : null}
                  {quote.etaMinutes ? ` · ~${quote.etaMinutes} min` : null}
                  {quote.zone?.freeAbove ? (
                    <span className="mt-1 block text-xs text-leaf-700/80">
                      Free above{' '}
                      <Price
                        amount={quote.zone.freeAbove}
                        className="inline-flex items-center gap-0.5"
                        symbolClassName="inline-block h-3 w-3"
                      />
                    </span>
                  ) : null}
                </>
              ) : (
                quote.reason || 'We do not deliver to this location yet.'
              )}
            </div>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Delivery notes</span>
            <textarea
              name="notes"
              rows={2}
              placeholder="Gate code, leave with security…"
              className="w-full rounded-xl border border-leaf-300 bg-white px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
            />
          </label>

          {walletBalance > 0 && (
            <fieldset className="rounded-xl border border-leaf-200 bg-white/70 p-4">
              <legend className="px-1 text-sm font-medium">Wallet</legend>
              <label className="mt-2 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Apply wallet balance (
                  <Price
                    amount={walletBalance}
                    className="inline-flex items-center gap-0.5 font-medium"
                    symbolClassName="inline-block h-3 w-3"
                  />
                  )
                </span>
              </label>
              {useWallet && (
                <label className="mt-3 block text-sm">
                  <span className="mb-1.5 block font-medium">Amount to apply</span>
                  <input
                    type="number"
                    min={0}
                    max={Math.min(walletBalance, totals.total)}
                    step="0.01"
                    value={walletInput}
                    onChange={(e) => setWalletInput(e.target.value)}
                    className="w-full rounded-xl border border-leaf-300 bg-white px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                  />
                </label>
              )}
            </fieldset>
          )}

          {loyaltyPoints >= pointsPerAed && (
            <fieldset className="rounded-xl border border-leaf-200 bg-white/70 p-4">
              <legend className="px-1 text-sm font-medium">Loyalty points</legend>
              <label className="mt-2 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useLoyalty}
                  onChange={(e) => setUseLoyalty(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Redeem points ({loyaltyPoints} available · {pointsPerAed} pts = 1 AED)
                </span>
              </label>
              {useLoyalty && (
                <label className="mt-3 block text-sm">
                  <span className="mb-1.5 block font-medium">Points to redeem</span>
                  <input
                    type="number"
                    min={0}
                    max={loyaltyPoints}
                    step={pointsPerAed}
                    value={loyaltyInput}
                    onChange={(e) => setLoyaltyInput(e.target.value)}
                    className="w-full rounded-xl border border-leaf-300 bg-white px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
                  />
                  <span className="mt-1 block text-xs text-ink/50">
                    ≈{' '}
                    <Price
                      amount={Math.floor(Number(loyaltyInput || 0) / pointsPerAed)}
                      className="inline-flex items-center gap-0.5"
                      symbolClassName="inline-block h-3 w-3"
                    />{' '}
                    off
                  </span>
                </label>
              )}
            </fieldset>
          )}

          <fieldset className="rounded-xl border border-leaf-200 bg-white/70 p-4">
            <legend className="px-1 text-sm font-medium">Payment</legend>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {methods.map((m) => {
                const selected = paymentMethod === m.id;
                const label = paymentMethodShortLabel(m.id, m.label);
                return (
                  <label
                    key={m.id}
                    className={`relative flex min-h-[6.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center transition ${
                      selected
                        ? 'border-leaf-600 bg-leaf-50 ring-2 ring-leaf-600/30'
                        : 'border-leaf-200 bg-white hover:border-leaf-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pay"
                      className="sr-only"
                      checked={selected}
                      onChange={() => setPaymentMethod(m.id)}
                    />
                    <PaymentMethodIcon id={m.id} className="h-9 w-14 shrink-0" />
                    <span className="text-xs font-semibold leading-tight text-ink">
                      {label}
                      {m.stub ? (
                        <span className="mt-0.5 block text-[10px] font-normal text-ink/45">
                          Demo
                        </span>
                      ) : (
                        <span className="mt-0.5 block h-[14px]" aria-hidden />
                      )}
                    </span>
                    {m.id === 'COD' && useWallet && Number(walletInput) > 0 ? (
                      <span className="text-[10px] text-ink/50">After wallet</span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || Boolean(quote && !quote.covered)}
            className="w-full rounded-full bg-leaf-700 py-3 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
          >
            {loading ? 'Placing…' : 'Place order'}
          </button>
        </form>
      </div>

      <aside className="h-fit rounded-2xl border border-leaf-200 bg-white/80 p-5 md:sticky md:top-24">
        <h2 className="font-display text-xl font-semibold text-leaf-900">
          Order summary
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          {items.map((item) => (
            <li key={item.id || item.productId} className="flex justify-between gap-3">
              <span className="text-ink/75">
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
        <div className="mt-5 space-y-2 border-t border-leaf-200 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink/70">{tCart('subtotal')}</span>
            <Price amount={totals.subtotal} className="inline-flex items-center gap-1" symbolClassName="inline-block h-3.5 w-3.5" />
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-leaf-700">
              <span>Discount{coupon ? ` (${coupon.code})` : ''}</span>
              <Price amount={totals.discountAmount} className="inline-flex items-center gap-1" symbolClassName="inline-block h-3.5 w-3.5" />
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-ink/70">Delivery</span>
            <Price amount={totals.deliveryFee} className="inline-flex items-center gap-1" symbolClassName="inline-block h-3.5 w-3.5" />
          </div>
          <div className="flex justify-between">
            <span className="text-ink/70">VAT (5%)</span>
            <Price amount={totals.vatAmount} className="inline-flex items-center gap-1" symbolClassName="inline-block h-3.5 w-3.5" />
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <Price
              amount={totals.total}
              className="inline-flex items-center gap-1.5 text-leaf-800"
              symbolClassName="inline-block h-4 w-4"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-ink/50">{tCommon('currencyHint')}</p>
      </aside>
    </div>
  );
}
