'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type CustomerDetail = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  addresses?: Array<{
    id: string;
    label: string;
    line1: string;
    city: string;
    emirate: string;
    isDefault: boolean;
  }>;
  orders?: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number | string;
    createdAt: string;
  }>;
  wallet?: { balance: number | string } | null;
  loyaltyAccount?: {
    points: number;
    level?: { name: string } | null;
  } | null;
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [walletAmount, setWalletAmount] = useState('25');
  const [loyaltyPoints, setLoyaltyPoints] = useState('50');
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get(`/api/admin/customers/${params.id}`);
    setCustomer(data.customer);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load customer'));
  }, [params.id]);

  async function toggleActive() {
    if (!customer) return;
    setError(null);
    try {
      await api.patch(`/api/admin/customers/${customer.id}/active`, {
        isActive: !customer.isActive,
      });
      await load();
    } catch {
      setError('Could not update status');
    }
  }

  async function creditWallet(e: FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api.post(`/api/admin/customers/${customer.id}/wallet/credit`, {
        amount: Number(walletAmount),
        note: 'Admin credit from detail page',
      });
      setOk('Wallet credited');
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Wallet credit failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function adjustLoyalty(e: FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const { data } = await api.post(`/api/admin/customers/${customer.id}/loyalty/adjust`, {
        points: Number(loyaltyPoints),
        note: 'Admin adjust from detail page',
      });
      setOk(
        `Loyalty → ${data.loyaltyAccount?.points} pts (${data.loyaltyAccount?.level?.name || '—'})`,
      );
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Loyalty adjust failed',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!customer && !error) {
    return <p className="text-sm text-slate-500">Loading customer…</p>;
  }

  if (!customer) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error || 'Customer not found'}
      </div>
    );
  }

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Customer';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={name} description={customer.email || customer.phone || customer.id} />
        <Link href="/customers" className="text-sm text-teal-700 hover:underline">
          ← Customers
        </Link>
      </div>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {ok}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-400">Status</p>
          <button
            type="button"
            onClick={() => void toggleActive()}
            className={`mt-2 rounded-full px-2 py-0.5 text-xs ${
              customer.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {customer.isActive ? 'Active' : 'Inactive'}
          </button>
          <p className="mt-3 text-xs text-slate-400">
            Joined {new Date(customer.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-400">Wallet</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {Number(customer.wallet?.balance ?? 0).toFixed(2)}{' '}
            <span className="text-sm font-normal text-slate-500">AED</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-400">Loyalty</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {customer.loyaltyAccount?.points ?? 0}
          </p>
          <p className="text-sm text-slate-500">
            {customer.loyaltyAccount?.level?.name || 'No level'}
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={(e) => void creditWallet(e)}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-800">Credit wallet</h2>
          <input
            type="number"
            min={0.01}
            step="0.01"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Credit
          </button>
        </form>
        <form
          onSubmit={(e) => void adjustLoyalty(e)}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-800">Adjust loyalty (+/-)</h2>
          <input
            type="number"
            step={1}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={loyaltyPoints}
            onChange={(e) => setLoyaltyPoints(e.target.value)}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Apply
          </button>
        </form>
      </div>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Addresses</h2>
        <ul className="space-y-2 text-sm">
          {(customer.addresses || []).map((a) => (
            <li key={a.id} className="border-t border-slate-100 pt-2 first:border-0 first:pt-0">
              <span className="font-medium">{a.label}</span>
              {a.isDefault ? (
                <span className="ml-2 text-xs text-teal-700">Default</span>
              ) : null}
              <p className="text-slate-500">
                {a.line1}, {a.city}, {a.emirate}
              </p>
            </li>
          ))}
          {!customer.addresses?.length ? (
            <li className="text-slate-500">No addresses.</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Recent orders</h2>
        <ul className="space-y-2 text-sm">
          {(customer.orders || []).map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
            >
              <div>
                <p className="font-medium text-slate-800">{o.orderNumber}</p>
                <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{Number(o.total).toFixed(2)} AED</p>
                <p className="text-xs text-slate-500">{o.status}</p>
              </div>
            </li>
          ))}
          {!customer.orders?.length ? <li className="text-slate-500">No orders yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
