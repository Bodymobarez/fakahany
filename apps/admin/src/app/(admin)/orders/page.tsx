'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { OrderStatus } from '@fv/shared';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  total: number | string;
  createdAt: string;
  deliveryOtp?: string | null;
  driverId?: string | null;
  user?: { firstName?: string; lastName?: string; email?: string | null };
};

type DriverRow = {
  id: string;
  user?: { firstName?: string; lastName?: string };
};

const statuses = ['ALL', ...Object.values(OrderStatus)] as const;

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'ALL');

  async function load(search = q, statusFilter = status) {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, driversRes] = await Promise.all([
        api.get('/api/admin/orders', {
          params: {
            ...(statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {}),
            ...(search.trim() ? { q: search.trim() } : {}),
          },
        }),
        api.get('/api/admin/delivery/drivers').catch(() => ({ data: { drivers: [] } })),
      ]);
      setOrders(ordersRes.data.orders || []);
      setDrivers(driversRes.data.drivers || []);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to load orders',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id: string, next: string) {
    setUpdating(id);
    try {
      await api.patch(`/api/admin/orders/${id}/status`, { status: next });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: next } : o)));
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Status update failed',
      );
    } finally {
      setUpdating(null);
    }
  }

  async function assignDriver(orderId: string, driverId: string) {
    if (!driverId) return;
    setUpdating(orderId);
    try {
      await api.post('/api/admin/delivery/assign', { orderId, driverId });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, driverId } : o)));
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Assign failed',
      );
    } finally {
      setUpdating(null);
    }
  }

  function onFilter(e: FormEvent) {
    e.preventDefault();
    void load(q, status);
  }

  return (
    <div>
      <PageHeader title="Orders" description="Review, assign drivers, and update fulfillment." />
      <form onSubmit={onFilter} className="mb-4 flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order #, email, phone, name…"
          className="min-w-[16rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          Search
        </button>
      </form>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">OTP</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Driver</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <Link href={`/orders/${o.id}`} className="text-teal-700 hover:underline">
                    {o.orderNumber}
                  </Link>
                  <div className="text-xs text-slate-400">
                    {new Date(o.createdAt).toLocaleString()}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {[o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ') || '—'}
                  <div className="text-xs text-slate-400">{o.user?.email}</div>
                </td>
                <td className="px-4 py-3">
                  <Price amount={o.total} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {o.deliveryOtp || '—'}
                </td>
                <td className="px-4 py-3">
                  <select
                    disabled={updating === o.id}
                    value={o.status}
                    onChange={(e) => void updateStatus(o.id, e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                  >
                    {Object.values(OrderStatus).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    disabled={updating === o.id || drivers.length === 0}
                    defaultValue={o.driverId || ''}
                    onChange={(e) => void assignDriver(o.id, e.target.value)}
                    className="max-w-[140px] rounded-md border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="">Assign…</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {[d.user?.firstName, d.user?.lastName].filter(Boolean).join(' ') ||
                          d.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No orders match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
