'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { selectIsAuthenticated } from '@/store/authSlice';

type Notification = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    ticketId?: string;
    orderId?: string;
    [key: string]: unknown;
  } | null;
};

function hrefFor(n: Notification): string | null {
  const data = n.data || {};
  if (typeof data.href === 'string' && data.href.startsWith('/')) {
    return data.href;
  }
  if (typeof data.ticketId === 'string' && data.ticketId) {
    return `/account/support?ticketId=${encodeURIComponent(data.ticketId)}`;
  }
  if (typeof data.orderId === 'string' && data.orderId) {
    return `/account/orders/${data.orderId}`;
  }
  return null;
}

export default function NotificationsPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get<{ notifications: Notification[] }>('/api/notifications');
    setItems(data.notifications || []);
  }

  useEffect(() => {
    if (!isAuth) return;
    void load().catch(() => setError('Could not load notifications'));
  }, [isAuth]);

  async function markRead(id: string) {
    await api.post(`/api/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function markAll() {
    await api.post('/api/notifications/read-all');
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Notifications</h1>
        <p className="mt-3 text-ink/65">Sign in to view alerts.</p>
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Notifications</h1>
        <div className="flex gap-3 text-sm">
          <button
            type="button"
            onClick={() => void markAll()}
            className="font-medium text-leaf-700 hover:underline"
          >
            Mark all read
          </button>
          <Link href="/account" className="font-medium text-leaf-700 hover:underline">
            Account
          </Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <ul className="space-y-3">
        {items.map((n) => {
          const href = hrefFor(n);
          return (
            <li
              key={n.id}
              className={`rounded-2xl border px-4 py-3 ${
                n.isRead ? 'border-leaf-200 bg-white/60' : 'border-leaf-300 bg-leaf-50/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{n.title}</p>
                  <p className="mt-1 text-sm text-ink/70">{n.body}</p>
                  <p className="mt-2 text-xs text-ink/40">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                  {href ? (
                    <Link
                      href={href}
                      onClick={() => {
                        if (!n.isRead) void markRead(n.id);
                      }}
                      className="mt-2 inline-block text-xs font-medium text-leaf-700 underline"
                    >
                      Open
                    </Link>
                  ) : null}
                </div>
                {!n.isRead ? (
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className="shrink-0 text-xs font-medium text-leaf-700 hover:underline"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
        {items.length === 0 ? (
          <li className="text-sm text-ink/55">No notifications yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
