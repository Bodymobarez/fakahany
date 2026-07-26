'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import {
  formatRelativeTime,
  notificationHref,
  type AppNotification,
} from '@/lib/notifications';
import { openAdminPanel } from '@/lib/adminUrl';
import { clearTokens } from '@/lib/session';
import { useTheme } from '@/providers/ThemeProvider';
import { logout, selectIsAuthenticated, selectUser } from '@/store/authSlice';
import { selectCartCount } from '@/store/cartSlice';
import {
  IconBell,
  IconCart,
  IconChat,
  IconChevronDown,
  IconHeart,
  IconMoon,
  IconProfile,
  IconSun,
} from '@/components/icons/HeaderIcons';

function IconButton({
  label,
  children,
  onClick,
  badge,
  active,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  badge?: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--header-ink)] transition hover:bg-black/5 dark:hover:bg-white/10 ${
        active ? 'bg-black/5 dark:bg-white/10' : ''
      }`}
    >
      {children}
      {badge && badge > 0 ? (
        <span className="absolute -end-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-citrus-500 px-1 text-[10px] font-bold text-ink">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );
}

function MenuIcon({ d }: { d: string }) {
  return (
    <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MENU_ICONS = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z',
  account:
    'M12 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5.5 19.5c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5',
  orders: 'M7 7h10v12H7zM9 7V5.5A3 3 0 0112 2.5a3 3 0 013 3V7',
  wallet: 'M4 8h16v10H4zM4 11h16M16 13.5h2',
  deals: 'M12 4v16M7 8l10 8M17 8L7 16',
  wishlist:
    'M12 20s-6.5-4.1-8.5-8A4.8 4.8 0 0112 6.2 4.8 4.8 0 0120.5 12c-2 3.9-8.5 8-8.5 8z',
  admin: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM4.5 12h2M17.5 12h2M12 4.5v2M12 17.5v2',
  driver: 'M4 16h16l-1.5-5H5.5L4 16zM7 16v2.5M17 16v2.5M9 8h6l1 3H8l1-3z',
  logout: 'M10 12h9M15 8l4 4-4 4M5 5v14a1 1 0 001 1h5',
  package: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  trash: 'M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12',
};

type OpenPanel = 'profile' | 'notifications' | null;

export function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);
  const isAuth = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const { theme, toggle } = useTheme();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.isRead).length;
  const canAccessAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const canAccessDriver = user?.role === 'DRIVER' || user?.role === 'ADMIN';

  const loadNotifications = useCallback(async () => {
    const { data } = await api.get<{ notifications: AppNotification[] }>('/api/notifications');
    setNotifications(data.notifications || []);
  }, []);

  useEffect(() => {
    if (!isAuth) {
      setNotifications([]);
      return;
    }
    void loadNotifications().catch(() => setNotifications([]));
  }, [isAuth, pathname, loadNotifications]);

  useEffect(() => {
    setOpenPanel(null);
  }, [pathname]);

  useEffect(() => {
    if (!openPanel) return;
    function onDoc(e: globalThis.MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpenPanel(null);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openPanel]);

  async function onLogout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    clearTokens();
    dispatch(logout());
    setOpenPanel(null);
    router.push('/');
  }

  async function dismissNotification(id: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      /* ignore */
    }
  }

  async function clearAllNotifications() {
    try {
      await api.delete('/api/notifications');
      setNotifications([]);
    } catch {
      /* ignore */
    }
  }

  function openNotification(n: AppNotification) {
    setOpenPanel(null);
    if (!n.isRead) {
      void api.post(`/api/notifications/${n.id}/read`).catch(() => undefined);
      setNotifications((prev) =>
        prev.map((row) => (row.id === n.id ? { ...row, isRead: true } : row)),
      );
    }
    router.push(notificationHref(n));
  }

  const fullName = user?.name || displayFallback(user?.firstName, user?.lastName) || 'Account';
  const shortName = user?.firstName || fullName.split(' ')[0] || 'Account';
  const email = user?.email || '';

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line">
      <div className="relative mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 md:gap-3 md:px-6">
        <div className="flex items-center gap-2 justify-self-start">
          <div
            className="inline-flex overflow-hidden rounded-md border border-line text-xs font-bold"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              onClick={() => router.replace(pathname, { locale: 'en' })}
              className={`px-2.5 py-1.5 transition ${
                locale === 'en'
                  ? 'bg-leaf-700 text-white'
                  : 'bg-transparent text-[var(--header-ink)]/70 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => router.replace(pathname, { locale: 'ar' })}
              className={`px-2.5 py-1.5 transition ${
                locale === 'ar'
                  ? 'bg-leaf-700 text-white'
                  : 'bg-transparent text-[var(--header-ink)]/70 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              AR
            </button>
          </div>
          <IconButton
            label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggle}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </IconButton>
        </div>

        <Link href="/" className="group justify-self-center text-center">
          <span className="block font-display text-xl font-semibold tracking-tight text-heading transition group-hover:text-leaf-700 md:text-2xl">
            Fresh Harvest
          </span>
          <span className="mt-0.5 hidden text-[11px] font-medium tracking-wide text-muted sm:block">
            Farm fresh · UAE
          </span>
        </Link>

        <div className="relative flex items-center gap-1 justify-self-end sm:gap-1.5" ref={panelRef}>
          {isAuth ? (
            <>
              <Link
                href="/account/support"
                aria-label="Chat / Support"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--header-ink)] transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                <IconChat />
              </Link>

              <IconButton
                label="Notifications"
                badge={unread}
                active={openPanel === 'notifications'}
                onClick={() => {
                  setOpenPanel((p) => (p === 'notifications' ? null : 'notifications'));
                  void loadNotifications().catch(() => undefined);
                }}
              >
                <IconBell />
              </IconButton>

              <Link
                href="/cart"
                aria-label={t('cart')}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--header-ink)] transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                <IconCart />
                {cartCount > 0 ? (
                  <span className="absolute -end-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-citrus-500 px-1 text-[10px] font-bold text-ink">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                ) : null}
              </Link>

              <Link
                href="/account/wishlist"
                aria-label="Wishlist"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--header-ink)] transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                <IconHeart />
              </Link>

              <button
                type="button"
                onClick={() => setOpenPanel((p) => (p === 'profile' ? null : 'profile'))}
                className="ms-0.5 inline-flex max-w-[9.5rem] items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-heading transition hover:bg-black/5 dark:hover:bg-white/10"
                aria-expanded={openPanel === 'profile'}
                aria-haspopup="menu"
              >
                <IconProfile className="h-5 w-5 shrink-0" />
                <span className="hidden truncate sm:inline">{shortName}</span>
                <IconChevronDown
                  className={`h-4 w-4 shrink-0 transition ${openPanel === 'profile' ? 'rotate-180' : ''}`}
                />
              </button>

              {openPanel === 'profile' ? (
                <div
                  role="menu"
                  className="absolute end-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
                >
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-sm font-semibold text-ink">{fullName}</p>
                    {email ? <p className="mt-0.5 truncate text-xs text-muted">{email}</p> : null}
                  </div>
                  <div className="py-1.5">
                    <ProfileLink href="/" icon={MENU_ICONS.home} label="Home" />
                    <ProfileLink href="/account" icon={MENU_ICONS.account} label="My Account" />
                    <ProfileLink href="/account/orders" icon={MENU_ICONS.orders} label="My Orders" />
                    <ProfileLink href="/account/wallet" icon={MENU_ICONS.wallet} label="Wallet" />
                    <ProfileLink
                      href="/products"
                      icon={MENU_ICONS.deals}
                      label="Deals & Offers"
                    />
                    <ProfileLink
                      href="/account/wishlist"
                      icon={MENU_ICONS.wishlist}
                      label="Wishlist"
                    />
                    {canAccessDriver ? (
                      <ProfileLink href="/driver" icon={MENU_ICONS.driver} label="Driver Panel" />
                    ) : null}
                    {canAccessAdmin ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenPanel(null);
                          openAdminPanel();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm text-ink hover:bg-surface-2"
                      >
                        <MenuIcon d={MENU_ICONS.admin} />
                        Admin Panel
                      </button>
                    ) : null}
                  </div>
                  <div className="border-t border-line py-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void onLogout()}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <svg
                        className="h-4 w-4 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d={MENU_ICONS.logout}
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}

              {openPanel === 'notifications' ? (
                <div className="absolute end-0 top-full z-50 mt-2 flex w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xl sm:end-10">
                  <div className="border-b border-line px-4 py-3">
                    <h2 className="font-display text-lg font-semibold text-heading">Notifications</h2>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex gap-3 border-b border-line px-4 py-3 last:border-b-0 ${
                            n.isRead ? '' : 'bg-surface-2'
                          }`}
                        >
                          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-leaf-100 text-leaf-700">
                            <MenuIcon d={MENU_ICONS.package} />
                          </span>
                          <button
                            type="button"
                            onClick={() => openNotification(n)}
                            className="min-w-0 flex-1 text-start"
                          >
                            <p className="text-sm font-semibold text-ink">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
                            <p className="mt-1 text-[11px] text-muted/80">
                              {formatRelativeTime(n.createdAt)}
                            </p>
                          </button>
                          <button
                            type="button"
                            aria-label="Dismiss"
                            onClick={(e) => void dismissNotification(n.id, e)}
                            className="shrink-0 self-start rounded p-1 text-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => void clearAllNotifications()}
                      className="flex items-center justify-center gap-2 border-t border-line px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d={MENU_ICONS.trash}
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Clear all notifications
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Link
                href="/cart"
                aria-label={t('cart')}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--header-ink)] transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                <IconCart />
                {cartCount > 0 ? (
                  <span className="absolute -end-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-citrus-500 px-1 text-[10px] font-bold text-ink">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/auth/login"
                className="ms-1 px-2 py-2 text-sm font-semibold text-heading hover:text-leaf-700"
              >
                {t('login')}
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-leaf-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-leaf-600"
              >
                {t('register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function ProfileLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-2"
    >
      <MenuIcon d={icon} />
      {label}
    </Link>
  );
}

function displayFallback(first?: string, last?: string) {
  return [first, last].filter(Boolean).join(' ').trim();
}
