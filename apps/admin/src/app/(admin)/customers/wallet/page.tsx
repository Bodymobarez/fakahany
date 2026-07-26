'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Customer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export default function AdminWalletPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('25');
  const [note, setNote] = useState('Promo credit');
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api
      .get('/api/admin/customers')
      .then(({ data }) => setCustomers(data.customers || []))
      .catch(() => setError('Failed to load customers'));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const { data } = await api.post(`/api/admin/customers/${userId}/wallet/credit`, {
        amount: Number(amount),
        note,
      });
      setBalance(Number(data.wallet.balance));
      setOk('Wallet credited successfully');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Credit failed',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Customer Wallet" description="Credit wallet balance for customers." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {ok}
          {balance != null ? (
            <>
              {' '}
              New balance: <Price amount={balance} className="inline-flex items-center gap-1" />
            </>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Customer</span>
          <select
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Customer'} — {c.email}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Amount</span>
          <input
            required
            type="number"
            min={0.01}
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Note</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? 'Crediting…' : 'Credit wallet'}
        </button>
      </form>
    </div>
  );
}
