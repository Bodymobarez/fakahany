'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { getCustomerSocket } from '@/lib/socket';
import { selectIsAuthenticated } from '@/store/authSlice';

type TrackData = {
  orderId: string;
  status: string;
  statusHistory: Array<{ status: string; note?: string | null; createdAt: string }>;
  lastPoint?: { lat: number; lng: number; createdAt: string } | null;
  assignment?: {
    driver?: { user?: { firstName?: string; lastName?: string; phone?: string | null } } | null;
    zone?: { name?: string } | null;
  } | null;
};

export default function TrackOrderPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!isAuth || !params.id) return;

    const load = () => {
      void api
        .get<TrackData>(`/api/delivery/track/${params.id}`)
        .then(({ data: d }) => setData(d))
        .catch(() => setError('Could not load tracking'));
    };
    load();
    const poll = setInterval(load, 60000);

    let socket: ReturnType<typeof getCustomerSocket> | null = null;
    try {
      socket = getCustomerSocket();
      socket.emit('order:subscribe', params.id);
      setLive(true);

      const onTrack = (payload: {
        lat?: number;
        lng?: number;
        at?: string;
        orderId?: string;
      }) => {
        if (payload.lat == null || payload.lng == null) return;
        setData((prev) =>
          prev
            ? {
                ...prev,
                lastPoint: {
                  lat: payload.lat!,
                  lng: payload.lng!,
                  createdAt: payload.at || new Date().toISOString(),
                },
              }
            : prev,
        );
      };
      const onOrder = (payload: { status?: string }) => {
        if (!payload.status) return;
        setData((prev) =>
          prev
            ? {
                ...prev,
                status: payload.status!,
                statusHistory: [
                  ...prev.statusHistory,
                  {
                    status: payload.status!,
                    createdAt: new Date().toISOString(),
                    note: 'Live update',
                  },
                ],
              }
            : prev,
        );
      };

      socket.on('tracking:update', onTrack);
      socket.on('order:update', onOrder);
      socket.on('connect', () => {
        setLive(true);
        socket?.emit('order:subscribe', params.id);
      });
      socket.on('disconnect', () => setLive(false));

      return () => {
        clearInterval(poll);
        socket?.off('tracking:update', onTrack);
        socket?.off('order:update', onOrder);
      };
    } catch {
      setLive(false);
      return () => clearInterval(poll);
    }
  }, [isAuth, params.id]);

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-ink/65">Sign in to track orders.</p>
        <Link href="/auth/login" className="mt-6 inline-block text-leaf-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <Link href="/account/orders" className="text-sm font-medium text-leaf-700 hover:underline">
        ← Orders
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Track order</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            live ? 'bg-leaf-100 text-leaf-800' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {live ? 'Live' : 'Refreshing…'}
        </span>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {data ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-leaf-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-wide text-leaf-600">Status</p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {data.status.replaceAll('_', ' ')}
            </p>
            {data.assignment?.driver?.user ? (
              <p className="mt-3 text-sm text-ink/65">
                Driver: {data.assignment.driver.user.firstName}{' '}
                {data.assignment.driver.user.lastName}
                {data.assignment.driver.user.phone
                  ? ` · ${data.assignment.driver.user.phone}`
                  : ''}
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink/55">Driver not assigned yet</p>
            )}
            {data.assignment?.zone?.name ? (
              <p className="text-sm text-ink/55">Zone: {data.assignment.zone.name}</p>
            ) : null}
            {data.lastPoint ? (
              <>
                <p className="mt-3 text-sm text-leaf-800">
                  Last GPS: {data.lastPoint.lat.toFixed(5)}, {data.lastPoint.lng.toFixed(5)}{' '}
                  <span className="text-ink/45">
                    ({new Date(data.lastPoint.createdAt).toLocaleTimeString()})
                  </span>
                </p>
                <div className="mt-4 overflow-hidden rounded-xl border border-leaf-200">
                  <iframe
                    title="Driver location"
                    className="h-56 w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                      data.lastPoint.lng - 0.02
                    }%2C${data.lastPoint.lat - 0.015}%2C${data.lastPoint.lng + 0.02}%2C${
                      data.lastPoint.lat + 0.015
                    }&layer=mapnik&marker=${data.lastPoint.lat}%2C${data.lastPoint.lng}`}
                  />
                </div>
              </>
            ) : null}
          </div>
          <ol className="space-y-3">
            {data.statusHistory.map((h, idx) => (
              <li
                key={`${h.status}-${idx}`}
                className="rounded-xl border border-leaf-200 bg-white/70 px-4 py-3 text-sm"
              >
                <p className="font-medium text-ink">{h.status.replaceAll('_', ' ')}</p>
                {h.note ? <p className="text-ink/60">{h.note}</p> : null}
                <p className="mt-1 text-xs text-ink/40">
                  {new Date(h.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        !error && <p className="mt-8 text-sm text-ink/60">Loading…</p>
      )}
    </div>
  );
}
