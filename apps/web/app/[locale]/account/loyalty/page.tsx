'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { selectIsAuthenticated } from '@/store/authSlice';

type Level = { id: string; name: string; slug: string; minPoints: number; earnRate: number | string };
type Txn = { id: string; type: string; points: number; note?: string | null; createdAt: string };
type Account = {
  points: number;
  level?: Level | null;
  transactions: Txn[];
};

export default function LoyaltyPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const [account, setAccount] = useState<Account | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuth) {
      setLoading(false);
      return;
    }
    void api
      .get<{ account: Account; levels: Level[] }>('/api/loyalty/me')
      .then(({ data }) => {
        setAccount(data.account);
        setLevels(data.levels || []);
      })
      .catch(() => setError('Could not load loyalty account'))
      .finally(() => setLoading(false));
  }, [isAuth]);

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Loyalty</h1>
        <p className="mt-3 text-ink/65">Sign in to view reward points.</p>
        <Link href="/auth/login" className="mt-8 inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Loyalty</h1>
        <Link href="/account" className="text-sm font-medium text-leaf-700 hover:underline">
          Back
        </Link>
      </div>

      {loading && <p className="text-sm text-ink/60">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {account && (
        <>
          <div className="rounded-2xl border border-leaf-200 bg-white/90 px-6 py-6 shadow-sm">
            <p className="text-sm text-ink/60">Reward points</p>
            <p className="mt-1 font-display text-4xl font-semibold text-leaf-800">{account.points}</p>
            <p className="mt-2 text-sm text-ink/70">
              Level:{' '}
              <span className="font-semibold text-leaf-700">
                {account.level?.name || 'Green'}
              </span>
            </p>
            <p className="mt-3 text-xs text-ink/55">
              Redeem at checkout: 100 points = 1 AED. Earn 1 point per AED spent.
            </p>
            <Link
              href="/checkout"
              className="mt-4 inline-flex text-sm font-medium text-leaf-700 underline"
            >
              Use points at checkout
            </Link>
          </div>

          {levels.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-leaf-900">Membership levels</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {levels.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-xl border border-leaf-200 bg-white/80 px-4 py-3 text-sm"
                  >
                    <p className="font-semibold text-ink">{l.name}</p>
                    <p className="text-ink/55">From {l.minPoints} pts · {Number(l.earnRate)}x earn</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="mt-10 font-display text-xl font-semibold text-leaf-900">Recent activity</h2>
          {account.transactions.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Earn points when you place orders.</p>
          ) : (
            <ul className="mt-4 divide-y divide-leaf-200 rounded-2xl border border-leaf-200 bg-white/80">
              {account.transactions.map((t) => (
                <li key={t.id} className="flex justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{t.type}</p>
                    <p className="text-xs text-ink/50">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="font-semibold text-leaf-700">
                    {t.points > 0 ? '+' : ''}
                    {t.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
