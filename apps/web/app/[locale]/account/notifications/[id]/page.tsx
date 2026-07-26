'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import {
  formatRelativeTime,
  notificationRelatedHref,
  type AppNotification,
} from '@/lib/notifications';
import { selectIsAuthenticated } from '@/store/authSlice';

export default function NotificationDetailPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<AppNotification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuth || !params.id) return;
    void api
      .get<{ notification: AppNotification }>(`/api/notifications/${params.id}`)
      .then(({ data }) => setItem(data.notification))
      .catch(() => setError('Notification not found'));
  }, [isAuth, params.id]);

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-ink/65">Sign in to view this notification.</p>
        <Link href="/auth/login" className="mt-6 inline-block text-leaf-700 underline">
          Login
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/account" className="mt-6 inline-block text-leaf-700 underline">
          Back to account
        </Link>
      </div>
    );
  }

  if (!item) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-sm text-ink/55">Loading…</p>;
  }

  const related = notificationRelatedHref(item);

  return (
    <div className="mx-auto max-w-xl px-4 py-10 md:px-6">
      <Link href="/account" className="text-sm font-medium text-leaf-700 hover:underline">
        ← Account
      </Link>
      <article className="mt-4 rounded-2xl border border-leaf-200 bg-white p-6 shadow-sm">
        <p className="text-xs text-ink/45">{formatRelativeTime(item.createdAt)}</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-leaf-900">{item.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/75">{item.body}</p>
        {related ? (
          <Link
            href={related}
            className="mt-6 inline-flex rounded-xl bg-leaf-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-leaf-600"
          >
            Open related
          </Link>
        ) : null}
      </article>
    </div>
  );
}
