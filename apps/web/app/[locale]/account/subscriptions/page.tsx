'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { selectIsAuthenticated } from '@/store/authSlice';

type Sub = {
  id: string;
  planCode: string;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  createdAt: string;
  meta?: {
    nextRunAt?: string;
    productIds?: string[];
    addressId?: string | null;
    lastOrderNumber?: string;
  } | null;
};

type Product = { id: string; nameEn: string; sku: string; isFeatured?: boolean };
type Address = {
  id: string;
  label?: string | null;
  area: string;
  street: string;
  emirate: string;
  isDefault?: boolean;
};

const PLANS = [
  { code: 'DAILY', label: 'Daily fresh box', blurb: 'Produce staples delivered every day.' },
  { code: 'WEEKLY', label: 'Weekly harvest', blurb: 'A curated box once a week.' },
  { code: 'MONTHLY', label: 'Monthly pantry', blurb: 'Bulk essentials once a month.' },
] as const;

export default function SubscriptionsPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const [items, setItems] = useState<Sub[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [planCode, setPlanCode] = useState<(typeof PLANS)[number]['code']>('WEEKLY');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [addressId, setAddressId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [subsRes, productsRes, addressesRes] = await Promise.allSettled([
      api.get<{ subscriptions: Sub[] }>('/api/expansion/subscriptions'),
      api.get<{ products: Product[] }>('/api/catalog/products', { params: { limit: 40 } }),
      api.get<{ addresses: Address[] }>('/api/addresses'),
    ]);

    const failures: string[] = [];

    if (subsRes.status === 'fulfilled') {
      setItems(subsRes.value.data.subscriptions || []);
    } else {
      failures.push('subscriptions');
    }

    if (productsRes.status === 'fulfilled') {
      const list = productsRes.value.data.products || [];
      setProducts(list);
      if (!editingId && !selectedProducts.length && list.length) {
        const featured = list.filter((p) => p.isFeatured).slice(0, 3);
        setSelectedProducts((featured.length ? featured : list.slice(0, 3)).map((p) => p.id));
      }
    } else {
      failures.push('products');
    }

    if (addressesRes.status === 'fulfilled') {
      const addrs = addressesRes.value.data.addresses || [];
      setAddresses(addrs);
      if (!editingId && !addressId && addrs.length) {
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        if (def) setAddressId(def.id);
      }
    } else {
      failures.push('addresses');
    }

    setLoaded(true);
    setError(
      failures.length === 3
        ? 'Could not load subscriptions'
        : failures.length
          ? `Some data failed to load (${failures.join(', ')})`
          : null,
    );
  }

  useEffect(() => {
    if (!isAuth) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  function toggleProduct(id: string) {
    setSelectedProducts((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 8) return prev;
      return [...prev, id];
    });
  }

  function startEdit(s: Sub) {
    setEditingId(s.id);
    setPlanCode((s.planCode as (typeof PLANS)[number]['code']) || 'WEEKLY');
    setSelectedProducts(s.meta?.productIds || []);
    setAddressId(s.meta?.addressId || addressId);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedProducts.length) {
      setError('Pick at least one product for your box');
      return;
    }
    if (!addressId) {
      setError('Select a delivery address');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await api.patch(`/api/expansion/subscriptions/${editingId}`, {
          productIds: selectedProducts,
          addressId,
        });
        setEditingId(null);
      } else {
        await api.post('/api/expansion/subscriptions', {
          planCode,
          productIds: selectedProducts,
          addressId,
        });
      }
      await load();
    } catch {
      setError(editingId ? 'Could not update subscription' : 'Could not start subscription');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      await api.post(`/api/expansion/subscriptions/${id}/cancel`);
      if (editingId === id) cancelEdit();
      await load();
    } catch {
      setError('Could not cancel');
    } finally {
      setBusy(false);
    }
  }

  async function togglePause(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/expansion/subscriptions/${id}/pause`);
      await load();
    } catch {
      setError('Could not update subscription status');
    } finally {
      setBusy(false);
    }
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-ink/65">Sign in to manage recurring deliveries.</p>
        <Link href="/auth/login" className="mt-6 inline-block text-leaf-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Subscriptions</h1>
        <Link href="/account" className="text-sm font-medium text-leaf-800 hover:underline">
          Back
        </Link>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="rounded-2xl border border-leaf-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-ink/70">
            {editingId
              ? 'Update box contents and delivery address for this subscription.'
              : 'Choose a plan, build your produce box, and pick the delivery address. Cycles run automatically.'}
          </p>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="shrink-0 text-sm text-ink/55 underline"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        {!editingId ? (
          <div className="mt-4 grid gap-2">
            {PLANS.map((p) => (
              <label
                key={p.code}
                className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 text-sm ${
                  planCode === p.code
                    ? 'border-leaf-700 bg-leaf-50 text-ink'
                    : 'border-leaf-200 bg-white text-ink'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  checked={planCode === p.code}
                  onChange={() => setPlanCode(p.code)}
                />
                <span>
                  <strong className="text-ink">{p.label}</strong>
                  <br />
                  <span className="text-ink/60">{p.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        ) : null}

        <label className="mt-5 block text-sm">
          <span className="mb-1 block font-medium text-ink">Delivery address</span>
          {addresses.length ? (
            <select
              required
              className="w-full rounded-xl border border-leaf-200 bg-white px-3 py-2 text-ink"
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
            >
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.label || 'Home') + ` — ${a.area}, ${a.emirate}`}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-ink/60">
              No addresses yet.{' '}
              <Link href="/account/addresses" className="text-leaf-700 underline">
                Add one
              </Link>
            </p>
          )}
        </label>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-ink">
            Box contents ({selectedProducts.length}/8)
          </p>
          <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
            {products.map((p) => {
              const on = selectedProducts.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(p.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${
                    on
                      ? 'border-leaf-700 bg-leaf-50 text-ink'
                      : 'border-leaf-200 bg-white text-ink'
                  }`}
                >
                  <span className="font-medium">{p.nameEn}</span>
                  <span className="mt-0.5 block text-xs text-ink/50">{p.sku}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || !addresses.length || !selectedProducts.length}
          className="mt-4 rounded-full bg-leaf-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Saving…' : editingId ? 'Save changes' : 'Subscribe'}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <ul className="mt-8 space-y-3">
        {items.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-leaf-200 bg-white px-4 py-3 text-sm"
          >
            <div>
              <p className="font-semibold text-ink">
                {s.planCode} · {s.status}
              </p>
              <p className="text-xs text-ink/50">
                Started {new Date(s.startsAt).toLocaleDateString()}
                {s.meta?.nextRunAt
                  ? ` · Next ${new Date(s.meta.nextRunAt).toLocaleDateString()}`
                  : ''}
                {s.meta?.productIds?.length ? ` · ${s.meta.productIds.length} items` : ''}
                {s.meta?.lastOrderNumber ? ` · Last ${s.meta.lastOrderNumber}` : ''}
                {s.endsAt ? ` · Ended ${new Date(s.endsAt).toLocaleDateString()}` : ''}
              </p>
            </div>
            {s.status === 'ACTIVE' || s.status === 'PAUSED' ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEdit(s)}
                  className="rounded-full border border-leaf-300 px-3 py-1.5 text-xs font-semibold text-leaf-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void togglePause(s.id)}
                  className="rounded-full border border-leaf-300 px-3 py-1.5 text-xs font-semibold text-leaf-800"
                >
                  {s.status === 'PAUSED' ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void cancel(s.id)}
                  className="rounded-full border border-leaf-300 px-3 py-1.5 text-xs font-semibold text-leaf-800"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </li>
        ))}
        {loaded && items.length === 0 && !error?.includes('subscriptions') ? (
          <li className="text-sm text-ink/60">No subscriptions yet — pick a plan above to start.</li>
        ) : null}
      </ul>
    </div>
  );
}
