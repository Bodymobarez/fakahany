'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Price } from '@fv/ui';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import { clearTokens } from '@/lib/session';
import { logout, selectIsAuthenticated, selectUser } from '@/store/authSlice';

type Assignment = {
  id: string;
  stopOrder?: number;
  assignedAt?: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total?: number | string;
    address?: {
      line1?: string;
      city?: string;
      emirate?: string;
    } | null;
    items?: Array<{ id: string; quantity: number }>;
  };
};

type Earnings = {
  today: number;
  week: number;
  month: number;
  deliveriesToday: number;
  rule?: string;
};

type Tab = 'assignments' | 'history' | 'earnings';

export default function DriverPanelPage() {
  const user = useSelector(selectUser);
  const isAuth = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('assignments');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [history, setHistory] = useState<Assignment[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isDriver = user?.role === 'DRIVER' || user?.role === 'ADMIN';

  const load = useCallback(async () => {
    setError(null);
    const [me, assignRes] = await Promise.all([
      api.get<{ driver: { isOnline: boolean } }>('/api/driver/me'),
      api.get<{ assignments: Assignment[] }>('/api/driver/assignments'),
    ]);
    setIsOnline(Boolean(me.data.driver?.isOnline));
    setAssignments(assignRes.data.assignments || []);
  }, []);

  useEffect(() => {
    if (!isAuth) {
      setLoading(false);
      return;
    }
    if (!isDriver) {
      setLoading(false);
      return;
    }
    void load()
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
            ?.error?.message || 'Could not load driver panel',
        );
      })
      .finally(() => setLoading(false));
  }, [isAuth, isDriver, load]);

  useEffect(() => {
    if (!isAuth || !isDriver) return;
    if (tab === 'history') {
      void api
        .get<{ assignments: Assignment[] }>('/api/driver/history')
        .then(({ data }) => setHistory(data.assignments || []))
        .catch(() => setError('Could not load history'));
    }
    if (tab === 'earnings') {
      void api
        .get<Earnings>('/api/driver/earnings')
        .then(({ data }) => setEarnings(data))
        .catch(() => setError('Could not load earnings'));
    }
  }, [tab, isAuth, isDriver]);

  async function toggleDuty() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.patch<{ driver: { isOnline: boolean } }>('/api/driver/me/online', {
        isOnline: !isOnline,
      });
      setIsOnline(Boolean(data.driver?.isOnline));
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not update duty status',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    clearTokens();
    dispatch(logout());
    router.push('/auth/login');
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Driver Panel</h1>
        <p className="mt-3 text-ink/65">Sign in with your driver account to see assignments.</p>
        <Link
          href="/auth/login"
          className="mt-8 inline-flex rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!isDriver) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Driver Panel</h1>
        <p className="mt-3 text-ink/65">This account is not registered as a driver.</p>
        <Link href="/account" className="mt-8 inline-flex text-sm font-medium text-leaf-700 underline">
          Back to account
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <header className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-leaf-800 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/65">Driver Panel</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {user?.name || 'Driver'}
            </h1>
            <p className="mt-1 text-sm text-white/60">{user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleDuty()}
              className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                isOnline
                  ? 'bg-emerald-400 text-slate-900 hover:bg-emerald-300'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {isOnline ? 'Online · Go offline' : 'Offline · Go online'}
            </button>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/70">
          Receive assigned orders, mark out for delivery, and complete drops with OTP / proof.
        </p>
      </header>

      <div className="mt-6 flex gap-2 rounded-2xl border border-leaf-200 bg-white p-1 shadow-sm">
        {(
          [
            ['assignments', 'Assigned'],
            ['history', 'History'],
            ['earnings', 'Earnings'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === id ? 'bg-leaf-700 text-white' : 'text-ink/60 hover:bg-leaf-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-ink/55">Loading…</p> : null}

      {!loading && tab === 'assignments' ? (
        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/45">
              Open assignments
            </h2>
            <button
              type="button"
              onClick={() => void load()}
              className="text-sm font-medium text-leaf-700 hover:underline"
            >
              Refresh
            </button>
          </div>
          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-leaf-200 bg-white px-5 py-10 text-center text-sm text-ink/55">
              No open assignments yet. Ask admin to assign an order, then refresh.
            </div>
          ) : (
            assignments.map((a, idx) => {
              const itemCount =
                a.order.items?.reduce((n, i) => n + (i.quantity || 0), 0) || 0;
              return (
                <Link
                  key={a.id}
                  href={`/driver/${a.order.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-leaf-200 bg-white px-4 py-4 shadow-sm transition hover:border-leaf-400"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf-700 text-sm font-bold text-white">
                    {a.stopOrder || idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">#{a.order.orderNumber}</p>
                    <p className="truncate text-xs text-ink/50">
                      {[a.order.address?.line1, a.order.address?.city, a.order.address?.emirate]
                        .filter(Boolean)
                        .join(', ') || 'No address'}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-xs font-semibold uppercase text-leaf-700">
                      {a.order.status.replaceAll('_', ' ')}
                    </p>
                    {itemCount ? (
                      <p className="text-xs text-ink/45">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })
          )}
        </section>
      ) : null}

      {!loading && tab === 'history' ? (
        <section className="mt-6 space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-ink/55">No completed deliveries yet.</p>
          ) : (
            history.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-leaf-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-ink">#{a.order.orderNumber}</p>
                  <p className="text-xs text-ink/45">{a.order.status.replaceAll('_', ' ')}</p>
                </div>
                {a.order.total != null ? (
                  <Price
                    amount={a.order.total}
                    className="inline-flex items-center gap-1 text-sm font-semibold"
                    symbolClassName="h-3.5 w-3.5"
                  />
                ) : null}
              </div>
            ))
          )}
        </section>
      ) : null}

      {!loading && tab === 'earnings' && earnings ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {(
            [
              ['Today', earnings.today, `${earnings.deliveriesToday} drops`],
              ['This week', earnings.week, null],
              ['This month', earnings.month, null],
            ] as const
          ).map(([label, amount, sub]) => (
            <div
              key={label}
              className="rounded-2xl border border-leaf-200 bg-white px-4 py-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-leaf-800">
                <Price
                  amount={amount}
                  className="inline-flex items-center gap-1"
                  symbolClassName="h-5 w-5"
                />
              </p>
              {sub ? <p className="mt-1 text-xs text-ink/50">{sub}</p> : null}
            </div>
          ))}
          {earnings.rule ? (
            <p className="sm:col-span-3 text-xs text-ink/50">{earnings.rule}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
