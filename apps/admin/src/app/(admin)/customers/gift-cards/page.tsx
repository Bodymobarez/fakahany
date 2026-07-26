'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type GiftCard = {
  id: string;
  code: string;
  initialAmount: number | string;
  balance: number | string;
  isActive: boolean;
  redeemedAt?: string | null;
  expiresAt?: string | null;
  note?: string | null;
  createdAt: string;
};

export default function GiftCardsAdminPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('50');
  const [note, setNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get<{ cards: GiftCard[] }>('/api/gift-cards');
    setCards(data.cards || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load gift cards'));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/api/gift-cards', {
        code: code.trim().toUpperCase(),
        amount: Number(amount),
        note: note || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setCode('');
      setAmount('50');
      setNote('');
      setExpiresAt('');
      await load();
    } catch {
      setError('Could not create gift card (code may already exist)');
    }
  }

  async function voidCard(c: GiftCard) {
    if (!confirm(`Void gift card ${c.code}? It can no longer be redeemed.`)) return;
    try {
      await api.post(`/api/gift-cards/${c.id}/void`);
      await load();
    } catch {
      setError('Could not void gift card');
    }
  }

  return (
    <div>
      <PageHeader title="Gift Cards" description="Issue codes customers redeem into wallet balance." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void onCreate(e)}
        className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5"
      >
        <input
          required
          placeholder="CODE"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
        />
        <input
          required
          type="number"
          min={1}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          title="Expires (optional)"
        />
        <input
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white">
          Issue card
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                <td className="px-4 py-3">
                  <Price amount={c.balance} /> / <Price amount={c.initialAmount} />
                </td>
                <td className="px-4 py-3">
                  {c.isActive ? (
                    <span className="text-emerald-700">Active</span>
                  ) : (
                    <span className="text-slate-400">
                      {c.redeemedAt
                        ? `Redeemed ${new Date(c.redeemedAt).toLocaleDateString()}`
                        : 'Voided / inactive'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(c.createdAt).toLocaleString()}
                  {c.note ? <div className="text-xs">{c.note}</div> : null}
                </td>
                <td className="px-4 py-3">
                  {c.isActive ? (
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => void voidCard(c)}
                    >
                      Void
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {cards.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No gift cards yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
