'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import type { RouteMapStop } from '@/components/RouteStopsMap';

const RouteStopsMap = dynamic(
  () => import('@/components/RouteStopsMap').then((m) => m.RouteStopsMap),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-xl bg-slate-100" /> },
);

type PlanOrder = {
  id: string;
  orderNumber: string;
  status: string;
  address?: {
    line1?: string;
    city?: string;
    emirate?: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
  assignment?: {
    id?: string;
    stopOrder?: number;
    driverId?: string | null;
    driver?: { id?: string; user?: { firstName?: string; lastName?: string } } | null;
    zone?: { name?: string } | null;
  } | null;
};

type Driver = { id: string; user: { firstName: string; lastName: string } };
type Zone = { id: string; name: string };
type RouteStop = {
  id: string;
  stopOrder: number;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    address?: { line1?: string; city?: string; lat?: number | null; lng?: number | null } | null;
  };
};

export default function RoutePlannerPage() {
  const [orders, setOrders] = useState<PlanOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [driverId, setDriverId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await api.get('/api/admin/delivery/route-plan');
    setOrders(data.orders || []);
    setDrivers(data.drivers || []);
    setZones(data.zones || []);
    if (!driverId && data.drivers?.[0]) setDriverId(data.drivers[0].id);
  }

  async function loadRoute(id: string) {
    if (!id) {
      setRouteStops([]);
      return;
    }
    const { data } = await api.get(`/api/admin/delivery/routes/${id}`);
    setRouteStops(data.assignments || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load route plan'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadRoute(driverId).catch(() => undefined);
  }, [driverId]);

  const unassigned = useMemo(
    () => orders.filter((o) => !o.assignment?.driverId),
    [orders],
  );

  const mapStops: RouteMapStop[] = useMemo(
    () =>
      routeStops
        .filter((s) => s.order.address?.lat != null && s.order.address?.lng != null)
        .map((s) => ({
          id: s.id,
          stopOrder: s.stopOrder,
          orderNumber: s.order.orderNumber,
          lat: Number(s.order.address!.lat),
          lng: Number(s.order.address!.lng),
          address: [s.order.address?.line1, s.order.address?.city].filter(Boolean).join(', '),
        })),
    [routeStops],
  );

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function assignSelected() {
    if (!driverId || !selected.length) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      for (const orderId of selected) {
        await api.post('/api/admin/delivery/assign', {
          orderId,
          driverId,
          zoneId: zoneId || null,
        });
      }
      setOk(`Assigned ${selected.length} order(s) with stop numbers`);
      setSelected([]);
      await load();
      await loadRoute(driverId);
    } catch {
      setError('Assignment failed');
    } finally {
      setBusy(false);
    }
  }

  async function optimize() {
    if (!driverId) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { data } = await api.post(`/api/admin/delivery/routes/${driverId}/optimize`);
      setRouteStops(data.assignments || []);
      setOk(`Optimized ${data.stops} stop(s) (nearest-neighbor)`);
      await load();
    } catch {
      setError('Optimize failed');
    } finally {
      setBusy(false);
    }
  }

  async function moveStop(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= routeStops.length) return;
    const copy = [...routeStops];
    const [item] = copy.splice(index, 1);
    if (!item) return;
    copy.splice(next, 0, item);
    setRouteStops(copy);
    setBusy(true);
    try {
      await api.patch(`/api/admin/delivery/routes/${driverId}/reorder`, {
        assignmentIds: copy.map((s) => s.id),
      });
      setOk('Stop order saved');
      await load();
    } catch {
      setError('Reorder failed');
      await loadRoute(driverId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Route Planner"
        description="Assign orders, set stop sequence, and optimize by nearest neighbor."
      />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {ok}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Driver</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
          >
            <option value="">Select…</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user.firstName} {d.user.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Zone</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
          >
            <option value="">Optional…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || !driverId || !selected.length}
          onClick={() => void assignSelected()}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Assign selected ({selected.length})
        </button>
        <button
          type="button"
          disabled={busy || !driverId || routeStops.length < 2}
          onClick={() => void optimize()}
          className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-800 disabled:opacity-60"
        >
          Optimize route
        </button>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
            Unassigned / open orders
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3" />
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Stop</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(o.id)}
                      onChange={() => toggle(o.id)}
                      disabled={Boolean(o.assignment?.driverId && o.assignment.driverId !== driverId)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[o.address?.line1, o.address?.city, o.address?.emirate]
                      .filter(Boolean)
                      .join(', ') || '—'}
                    {o.address?.lat != null ? (
                      <span className="ml-1 text-xs text-emerald-600">geo</span>
                    ) : (
                      <span className="ml-1 text-xs text-amber-600">no geo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {o.assignment?.stopOrder
                      ? `#${o.assignment.stopOrder}`
                      : o.assignment?.driver
                        ? 'Assigned'
                        : '—'}
                    {o.assignment?.driver?.user
                      ? ` · ${o.assignment.driver.user.firstName}`
                      : ''}
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No open delivery orders.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {unassigned.length ? (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              {unassigned.length} unassigned
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
              Driver stop sequence
            </div>
            <ol className="divide-y divide-slate-100">
              {routeStops.map((s, idx) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
                    {s.stopOrder || idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{s.order.orderNumber}</p>
                    <p className="truncate text-xs text-slate-500">
                      {[s.order.address?.line1, s.order.address?.city].filter(Boolean).join(', ') ||
                        '—'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={busy || idx === 0}
                      onClick={() => void moveStop(idx, -1)}
                      className="rounded border border-slate-200 px-2 text-xs disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={busy || idx === routeStops.length - 1}
                      onClick={() => void moveStop(idx, 1)}
                      className="rounded border border-slate-200 px-2 text-xs disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                </li>
              ))}
              {!routeStops.length ? (
                <li className="px-4 py-8 text-center text-sm text-slate-500">
                  Select a driver to see their stops.
                </li>
              ) : null}
            </ol>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Route map</p>
            <RouteStopsMap stops={mapStops} />
          </div>
        </div>
      </div>
    </div>
  );
}
