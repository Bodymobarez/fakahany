'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { selectIsAuthenticated } from '@/store/authSlice';

type WalletTxn = {
  id: string;
  type: string;
  amount: number | string;
  balanceAfter: number | string;
  note?: string | null;
  createdAt: string;
};

type Wallet = {
  balance: number | string;
  currency: string;
  transactions: WalletTxn[];
};

export default function WalletPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [giftCode, setGiftCode] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadWallet() {
    const { data } = await api.get<{ wallet: Wallet }>('/api/wallet/me');
    setWallet(data.wallet);
  }

  useEffect(() => {
    if (!isAuth) {
      setLoading(false);
      return;
    }
    void loadWallet()
      .catch(() => setError('Could not load wallet'))
      .finally(() => setLoading(false));
  }, [isAuth]);

  async function redeemGift(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const { data } = await api.post<{ credited: number }>('/api/gift-cards/redeem', {
        code: giftCode,
      });
      setGiftCode('');
      setMessage(`Gift card redeemed: +${Number(data.credited).toFixed(2)} AED`);
      await loadWallet();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Could not redeem gift card',
      );
    }
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Wallet</h1>
        <p className="mt-3 text-ink/65">Sign in to view your wallet.</p>
        <Link href="/auth/login" className="mt-8 inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Wallet</h1>
        <Link href="/account" className="text-sm font-medium text-leaf-700 hover:underline">
          Back
        </Link>
      </div>

      {loading && <p className="text-sm text-ink/60">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-leaf-700">{message}</p>}

      <p className="mb-3 text-sm text-ink/60">
        Need to buy a card?{' '}
        <Link href="/account/gift-cards" className="font-medium text-leaf-700 underline">
          Purchase gift cards
        </Link>
      </p>
      <form
        onSubmit={(e) => void redeemGift(e)}
        className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-leaf-200 bg-white/80 p-4"
      >
        <input
          required
          value={giftCode}
          onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
          placeholder="Gift card code"
          className="min-w-[180px] flex-1 rounded-xl border border-leaf-300 px-3.5 py-2.5 text-sm outline-none focus:border-leaf-500"
        />
        <button
          type="submit"
          className="rounded-full bg-leaf-700 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Redeem
        </button>
      </form>

      {wallet && (
        <>
          <div className="rounded-2xl border border-leaf-200 bg-gradient-to-br from-leaf-800 to-leaf-700 px-6 py-8 text-white shadow-sm">
            <p className="text-sm text-leaf-100/80">Available balance</p>
            <div className="mt-2 text-3xl font-semibold">
              <Price
                amount={Number(wallet.balance)}
                className="inline-flex items-center gap-2 text-white"
                symbolClassName="inline-block h-6 w-6 bg-white"
              />
            </div>
          </div>

          <h2 className="mt-10 font-display text-xl font-semibold text-leaf-900">Transactions</h2>
          {wallet.transactions.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">No wallet activity yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-leaf-200 rounded-2xl border border-leaf-200 bg-white/80">
              {wallet.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-ink">{t.type}</p>
                    <p className="text-xs text-ink/50">{new Date(t.createdAt).toLocaleString()}</p>
                    {t.note && <p className="text-xs text-ink/45">{t.note}</p>}
                  </div>
                  <Price
                    amount={Number(t.amount)}
                    className="inline-flex items-center gap-1 font-semibold text-leaf-800"
                    symbolClassName="inline-block h-3.5 w-3.5"
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
