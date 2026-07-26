'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { selectIsAuthenticated } from '@/store/authSlice';

type GiftCard = {
  id: string;
  code: string;
  fullCode?: string | null;
  initialAmount: number | string;
  balance: number | string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string | null;
};

const AMOUNTS = [50, 100, 200, 500] as const;

export default function GiftCardsPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [amount, setAmount] = useState<(typeof AMOUNTS)[number]>(100);
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'STRIPE'>('WALLET');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [note, setNote] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [mine, wallet] = await Promise.all([
      api.get<{ cards: GiftCard[] }>('/api/gift-cards/mine'),
      api.get<{ wallet: { balance: number | string } }>('/api/wallet/me'),
    ]);
    setCards(mine.data.cards || []);
    setWalletBalance(Number(wallet.data.wallet?.balance || 0));
  }

  useEffect(() => {
    if (!isAuth) return;
    void load().catch(() => setError('Could not load gift cards'));
  }, [isAuth]);

  async function purchase(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setIssuedCode(null);
    try {
      const { data } = await api.post<{ card: { code: string } }>('/api/gift-cards/purchase', {
        amount,
        paymentMethod,
        recipientEmail: recipientEmail.trim() || null,
        note: note.trim() || null,
      });
      setIssuedCode(data.card.code);
      setNote('');
      setRecipientEmail('');
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Purchase failed',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Gift cards</h1>
        <p className="mt-3 text-ink/65">Sign in to buy or view gift cards.</p>
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
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Gift cards</h1>
        <Link href="/account/wallet" className="text-sm font-medium text-leaf-700 hover:underline">
          Wallet
        </Link>
      </div>

      <p className="mb-4 text-sm text-ink/60">
        Wallet balance:{' '}
        <Price amount={walletBalance} className="inline-flex items-center gap-1 font-semibold" />
      </p>

      <form
        onSubmit={(e) => void purchase(e)}
        className="rounded-2xl border border-leaf-200 bg-white/80 p-5"
      >
        <p className="text-sm font-semibold text-ink">Buy a gift card</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(a)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                amount === a
                  ? 'bg-leaf-700 text-white'
                  : 'border border-leaf-200 text-leaf-800'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Pay with</span>
            <select
              className="w-full rounded-xl border border-leaf-200 px-3 py-2"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'WALLET' | 'STRIPE')}
            >
              <option value="WALLET">Wallet</option>
              <option value="STRIPE">Card (demo)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Recipient email (optional)</span>
            <input
              type="email"
              className="w-full rounded-xl border border-leaf-200 px-3 py-2"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="friend@email.com"
            />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Note</span>
          <input
            className="w-full rounded-xl border border-leaf-200 px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Happy birthday!"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-full bg-leaf-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Purchasing…' : `Buy ${amount} AED card`}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {issuedCode ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Gift card issued. Code:{' '}
          <strong className="font-mono tracking-wide">{issuedCode}</strong>
          <p className="mt-1 text-xs">Copy it now — share or redeem from Wallet.</p>
        </div>
      ) : null}

      <h2 className="mt-10 font-display text-xl font-semibold text-leaf-900">Your purchases</h2>
      <ul className="mt-4 space-y-3">
        {cards.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-leaf-200 bg-white/70 px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono font-semibold text-ink">
                {c.fullCode || c.code}
              </span>
              <Price amount={c.initialAmount} />
            </div>
            <p className="mt-1 text-xs text-ink/45">
              {c.isActive ? 'Active' : 'Redeemed'} ·{' '}
              {new Date(c.createdAt).toLocaleDateString()}
              {c.expiresAt ? ` · Exp ${new Date(c.expiresAt).toLocaleDateString()}` : ''}
            </p>
          </li>
        ))}
        {cards.length === 0 ? (
          <li className="text-sm text-ink/55">No gift cards purchased yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
