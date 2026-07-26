'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { OrderStatus } from '@fv/shared';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  total: number | string;
  subtotal: number | string;
  shipping: number | string;
  tax: number | string;
  deliveryOtp?: string | null;
  deliveryNotes?: string | null;
  podPhotoUrl?: string | null;
  podSignatureUrl?: string | null;
  podRecipientName?: string | null;
  driverId?: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string | null; phone: string | null };
  address?: {
    label: string;
    line1: string;
    city: string;
    emirate: string;
    lat?: number | null;
    lng?: number | null;
  };
  items: Array<{
    id: string;
    nameEn: string;
    sku: string;
    quantity: number;
    unitPrice: number | string;
    lineTotal: number | string;
  }>;
  statusHistory: Array<{ status: string; note?: string | null; createdAt: string }>;
  assignment?: {
    driver?: { user?: { firstName?: string; lastName?: string; phone?: string | null } } | null;
    zone?: { name?: string } | null;
  } | null;
};

type DriverRow = { id: string; user?: { firstName?: string; lastName?: string } };

function mediaUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API}${path}`;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [orderRes, driversRes] = await Promise.all([
        api.get(`/api/admin/orders/${params.id}`),
        api.get('/api/admin/delivery/drivers').catch(() => ({ data: { drivers: [] } })),
      ]);
      setOrder(orderRes.data.order);
      setDrivers(driversRes.data.drivers || []);
      setError(null);
    } catch {
      setError('Failed to load order');
    }
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function updateStatus(status: string) {
    if (!order) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/orders/${order.id}/status`, { status });
      await load();
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Status update failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function assignDriver(driverId: string) {
    if (!order || !driverId) return;
    setBusy(true);
    try {
      await api.post('/api/admin/delivery/assign', { orderId: order.id, driverId });
      await load();
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Assign failed',
      );
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!order) return <p className="text-sm text-slate-500">Loading order…</p>;

  const photo = mediaUrl(order.podPhotoUrl);
  const signature = mediaUrl(order.podSignatureUrl);

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        description={`${order.status} · ${new Date(order.createdAt).toLocaleString()}`}
        actions={
          <Link href="/orders" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            All orders
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-500">Status</span>
          <select
            disabled={busy}
            value={order.status}
            onChange={(e) => void updateStatus(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {Object.values(OrderStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-500">Assign driver</span>
          <select
            disabled={busy || drivers.length === 0}
            value={order.driverId || ''}
            onChange={(e) => void assignDriver(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Select…</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {[d.user?.firstName, d.user?.lastName].filter(Boolean).join(' ') || d.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Customer</h2>
          <p className="mt-2 text-sm text-slate-700">
            {[order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || '—'}
          </p>
          <p className="text-xs text-slate-500">{order.user?.email}</p>
          <p className="text-xs text-slate-500">{order.user?.phone}</p>
          {order.address ? (
            <p className="mt-3 text-sm text-slate-700">
              {order.address.label}: {order.address.line1}, {order.address.city},{' '}
              {order.address.emirate}
            </p>
          ) : null}
          {order.deliveryNotes ? (
            <p className="mt-2 text-xs text-slate-500">Notes: {order.deliveryNotes}</p>
          ) : null}
          <p className="mt-3 font-mono text-sm text-teal-800">
            Delivery OTP: {order.deliveryOtp || '—'}
          </p>
          {order.assignment?.driver?.user ? (
            <p className="mt-2 text-sm text-slate-600">
              Driver: {order.assignment.driver.user.firstName}{' '}
              {order.assignment.driver.user.lastName}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No driver assigned</p>
          )}
          {order.assignment?.zone?.name ? (
            <p className="text-xs text-slate-500">Zone: {order.assignment.zone.name}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Totals</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>
                <Price amount={order.subtotal} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>
                <Price amount={order.shipping} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>VAT</dt>
              <dd>
                <Price amount={order.tax} />
              </dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>
                <Price amount={order.total} />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {(photo || signature || order.podRecipientName) && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Proof of delivery</h2>
          {order.podRecipientName ? (
            <p className="mt-2 text-sm text-slate-700">Received by: {order.podRecipientName}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-4">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Delivery photo" className="h-40 rounded-lg border object-cover" />
            ) : null}
            {signature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signature}
                alt="Signature"
                className="h-40 rounded-lg border bg-white object-contain"
              />
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Line</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{item.nameEn}</td>
                <td className="px-4 py-3 text-slate-500">{item.sku}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">
                  <Price amount={item.lineTotal} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className="mt-4 space-y-2">
        {order.statusHistory.map((h, idx) => (
          <li
            key={`${h.status}-${idx}`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <p className="font-medium">{h.status}</p>
            {h.note ? <p className="text-slate-500">{h.note}</p> : null}
            <p className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString()}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
