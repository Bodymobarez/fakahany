'use client';

import { useDispatch, useSelector } from 'react-redux';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import { clearTokens, getAccessToken, getRefreshToken } from '@/lib/session';
import { logout, selectIsAuthenticated, selectUser } from '@/store/authSlice';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';

function openAdminPanel() {
  const token = getAccessToken();
  const refresh = getRefreshToken();
  if (!token) {
    window.open(`${ADMIN_URL}/login`, '_blank', 'noopener,noreferrer');
    return;
  }
  const hash = new URLSearchParams({ token });
  if (refresh) hash.set('refresh', refresh);
  window.open(`${ADMIN_URL}/handoff#${hash.toString()}`, '_blank', 'noopener,noreferrer');
}

const modules = [
  {
    href: '/account/orders',
    label: 'Orders',
    desc: 'Track deliveries & invoices',
    dot: 'bg-emerald-500',
  },
  {
    href: '/account/addresses',
    label: 'Addresses',
    desc: 'Homes & delivery pins',
    dot: 'bg-sky-500',
  },
  {
    href: '/account/wishlist',
    label: 'Wishlist',
    desc: 'Saved produce',
    dot: 'bg-rose-500',
  },
  {
    href: '/account/wallet',
    label: 'Wallet',
    desc: 'Balance & top-ups',
    dot: 'bg-amber-500',
  },
  {
    href: '/account/gift-cards',
    label: 'Gift cards',
    desc: 'Redeem & share',
    dot: 'bg-violet-500',
  },
  {
    href: '/account/subscriptions',
    label: 'Subscriptions',
    desc: 'Recurring boxes',
    dot: 'bg-lime-600',
  },
  {
    href: '/account/loyalty',
    label: 'Loyalty',
    desc: 'Points & levels',
    dot: 'bg-orange-500',
  },
  {
    href: '/account/notifications',
    label: 'Notifications',
    desc: 'Alerts & updates',
    dot: 'bg-blue-500',
  },
  {
    href: '/account/support',
    label: 'Support chat',
    desc: 'Tickets & help',
    dot: 'bg-cyan-500',
  },
  {
    href: '/account/security',
    label: 'Security',
    desc: 'Password & 2FA',
    dot: 'bg-slate-500',
  },
  {
    href: '/account/privacy',
    label: 'Privacy',
    desc: 'PDPL & consents',
    dot: 'bg-teal-600',
  },
];

export default function AccountPage() {
  const user = useSelector(selectUser);
  const isAuth = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const router = useRouter();

  async function onLogout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    clearTokens();
    dispatch(logout());
    router.push('/');
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-3xl border border-line bg-surface p-10 shadow-sm">
          <h1 className="font-display text-3xl font-semibold text-heading">Your account</h1>
          <p className="mt-3 text-muted">
            Sign in to manage orders, wallet, and delivery preferences.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-full bg-leaf-700 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-600"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-heading hover:bg-surface-2"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initials =
    (user?.firstName?.[0] || user?.name?.[0] || 'F').toUpperCase() +
    (user?.lastName?.[0] || '').toUpperCase();
  const canAccessAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const canAccessDriver = user?.role === 'DRIVER' || user?.role === 'ADMIN';

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-leaf-900 via-leaf-700 to-leaf-600 p-6 text-white shadow-lg md:p-8">
        <div className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold backdrop-blur">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/70">Welcome back</p>
            <h1 className="truncate font-display text-3xl font-semibold tracking-tight text-white">
              {user?.name || 'Customer'}
            </h1>
            <p className="mt-1 truncate text-sm text-white/70">{user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canAccessDriver ? (
              <Link
                href="/driver"
                className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-leaf-900 hover:bg-white"
              >
                Driver Panel
              </Link>
            ) : null}
            {canAccessAdmin ? (
              <button
                type="button"
                onClick={openAdminPanel}
                className="rounded-full bg-citrus-500 px-4 py-2 text-sm font-semibold text-leaf-900 hover:bg-citrus-400"
              >
                Admin Panel
              </button>
            ) : null}
            <Link
              href="/products"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-leaf-900"
            >
              Continue shopping
            </Link>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canAccessDriver ? (
          <Link
            href="/driver"
            className="group rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-leaf-400 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                  <h2 className="text-base font-semibold text-ink">Driver Panel</h2>
                </div>
                <p className="text-sm text-muted">Assigned orders, route drops & delivery proof</p>
              </div>
              <span className="mt-1 text-leaf-700 transition group-hover:translate-x-0.5">→</span>
            </div>
          </Link>
        ) : null}
        {canAccessAdmin ? (
          <button
            type="button"
            onClick={openAdminPanel}
            className="group rounded-2xl border border-line bg-surface p-5 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-leaf-400 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-citrus-500" />
                  <h2 className="text-base font-semibold text-ink">Admin Panel</h2>
                </div>
                <p className="text-sm text-muted">Catalog, orders, delivery & finance</p>
              </div>
              <span className="mt-1 text-leaf-700 transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>
        ) : null}
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-leaf-400 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${m.dot}`} />
                  <h2 className="text-base font-semibold text-ink">{m.label}</h2>
                </div>
                <p className="text-sm text-muted">{m.desc}</p>
              </div>
              <span className="mt-1 text-leaf-700 transition group-hover:translate-x-0.5">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
