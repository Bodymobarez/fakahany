'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getAdminSocket } from '@/lib/socket';
import { PageHeader } from '@/components/PageHeader';
import type { FleetMapDriver } from '@/components/FleetMap';

const FleetMap = dynamic(
  () => import('@/components/FleetMap').then((m) => m.FleetMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Loading map…
      </div>
    ),
  },
);

type FleetDriver = FleetMapDriver & {
  phone: string | null;
};

type LocPayload = {
  driverId?: string;
  lat: number;
  lng: number;
  at?: string;
};

export default function LiveTrackingPage() {
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const { data } = await api.get('/api/admin/delivery/live');
      setDrivers(data.drivers || []);
      setOnlineCount(data.onlineCount || 0);
      setUpdatedAt(data.updatedAt || null);
      setError(null);
    } catch {
      setError('Failed to load live fleet');
    }
  }

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 60000);

    let socket: ReturnType<typeof getAdminSocket> | null = null;
    try {
      socket = getAdminSocket();
      setLive(true);
      const onLoc = (payload: LocPayload) => {
        if (!payload.driverId || payload.lat == null || payload.lng == null) return;
        const at = payload.at || new Date().toISOString();
        setUpdatedAt(at);
        setDrivers((prev) => {
          const idx = prev.findIndex((d) => d.id === payload.driverId);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx]!,
            online: true,
            lastPoint: { lat: payload.lat, lng: payload.lng, at },
          };
          setOnlineCount(next.filter((d) => d.online).length);
          return next;
        });
      };
      socket.on('driver:location', onLoc);
      socket.on('connect', () => setLive(true));
      socket.on('disconnect', () => setLive(false));
      return () => {
        clearInterval(poll);
        socket?.off('driver:location', onLoc);
      };
    } catch {
      setLive(false);
      return () => clearInterval(poll);
    }
  }, []);

  return (
    <div>
      <PageHeader
        title="Live Tracking"
        description="Driver GPS on the map — Socket.IO live updates with slow fallback refresh."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            Refresh
          </button>
        }
      />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span
          className={`rounded-full px-3 py-1 ${
            live ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {live ? 'Live socket' : 'Polling fallback'}
        </span>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-800">
          Online: {onlineCount}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
          Drivers: {drivers.length}
        </span>
        {updatedAt ? (
          <span className="text-slate-400">
            Updated {new Date(updatedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      <div className="mb-6">
        <FleetMap drivers={drivers} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {drivers.map((d) => (
          <div
            key={d.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{d.name || 'Driver'}</p>
                <p className="text-xs text-slate-500">{d.phone || 'No phone'}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  d.online ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {d.online ? 'Online' : 'Offline'}
              </span>
            </div>
            {d.lastPoint ? (
              <p className="mt-3 text-sm text-slate-700">
                {d.lastPoint.lat.toFixed(5)}, {d.lastPoint.lng.toFixed(5)}
                <span className="ml-2 text-xs text-slate-400">
                  {new Date(d.lastPoint.at).toLocaleTimeString()}
                </span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No GPS points yet</p>
            )}
            {d.activeOrders.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                {d.activeOrders.map((o) => (
                  <li key={o.orderNumber}>
                    {o.orderNumber} · {o.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-400">No active assignments</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
