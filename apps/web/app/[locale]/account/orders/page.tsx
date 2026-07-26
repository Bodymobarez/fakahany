'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'next/navigation';
import { Price } from '@fv/ui';
import { Link, useRouter } from '@/i18n/routing';
import { CustomerOrderDetail } from '@/components/orders/CustomerOrderDetail';
import { OrderStatusTracker } from '@/components/orders/OrderStatusTracker';
import { api } from '@/lib/api';
import { addToCartApi } from '@/lib/cartApi';
import {
  formatPlacedAt,
  orderStatusLabel,
  statusBadgeClass,
} from '@/lib/orderUi';
import type { CustomerOrder } from '@/lib/orderTypes';
import { getCustomerSocket } from '@/lib/socket';
import { selectIsAuthenticated } from '@/store/authSlice';
import { setCartFromApi } from '@/store/cartSlice';

const CANCELABLE = new Set(['PENDING', 'ACCEPTED', 'PREPARING']);
const RETURNABLE = new Set(['DELIVERED', 'OUT_FOR_DELIVERY', 'PACKED']);

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5zm4.28 7.22a.75.75 0 00-1.06-1.06l-4.47 4.47-1.97-1.97a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l5-5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Chevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`${className || ''} transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function OrdersPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('order');

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get<{ orders: CustomerOrder[] }>('/api/orders');
    const list = data.orders || [];
    setOrders(list);
    setSelectedId((prev) => {
      if (prev && list.some((o) => o.id === prev)) return prev;
      if (initialId && list.some((o) => o.id === initialId)) return initialId;
      return list[0]?.id ?? null;
    });
  }, [initialId]);

  useEffect(() => {
    if (!isAuth) {
      setLoading(false);
      return;
    }
    void load()
      .catch(() => setError('Could not load orders'))
      .finally(() => setLoading(false));
  }, [isAuth, load]);

  const orderIdsKey = orders.map((o) => o.id).join(',');

  // Live status updates when admin/driver changes the order
  useEffect(() => {
    if (!isAuth) return;

    let socket: ReturnType<typeof getCustomerSocket> | null = null;
    const poll = setInterval(() => {
      void load().catch(() => undefined);
    }, 45000);

    try {
      socket = getCustomerSocket();
      setLive(socket.connected);

      const subscribeAll = () => {
        for (const id of orderIdsKey.split(',').filter(Boolean)) {
          socket?.emit('order:subscribe', id);
        }
      };

      const onOrder = (payload: { orderId?: string; status?: string }) => {
        if (!payload.orderId || !payload.status) return;
        setOrders((prev) =>
          prev.map((o) => (o.id === payload.orderId ? { ...o, status: payload.status! } : o)),
        );
        void load().catch(() => undefined);
      };

      socket.on('order:update', onOrder);
      socket.on('connect', () => {
        setLive(true);
        subscribeAll();
      });
      socket.on('disconnect', () => setLive(false));
      subscribeAll();

      return () => {
        clearInterval(poll);
        socket?.off('order:update', onOrder);
      };
    } catch {
      setLive(false);
      return () => clearInterval(poll);
    }
  }, [isAuth, load, orderIdsKey]);

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) || orders[0] || null,
    [orders, selectedId],
  );

  async function downloadInvoice(orderId: string, orderNumber?: string) {
    setDownloading(true);
    setError(null);
    try {
      const res = await api.get(`/api/orders/${orderId}/invoice`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderNumber || orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Invoice not available yet');
    } finally {
      setDownloading(false);
    }
  }

  async function reorder(order: CustomerOrder) {
    setBusyId(order.id);
    setError(null);
    try {
      let cart = null as Awaited<ReturnType<typeof addToCartApi>> | null;
      for (const item of order.items) {
        cart = await addToCartApi(item.productId, item.quantity, item.variantId);
      }
      if (cart) dispatch(setCartFromApi(cart));
      router.push('/cart');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not reorder items',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function cancelOrder(orderId: string) {
    const reason = window.prompt('Cancel reason (optional)') ?? '';
    setBusyId(orderId);
    setError(null);
    try {
      await api.post(`/api/orders/${orderId}/cancel`, { reason: reason || null });
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not cancel order',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function returnOrder(orderId: string) {
    const reason = window.prompt('Return reason');
    if (!reason || reason.trim().length < 3) return;
    setBusyId(orderId);
    setError(null);
    try {
      await api.post(`/api/orders/${orderId}/return`, { reason: reason.trim() });
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not request return',
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Orders</h1>
        <p className="mt-3 text-ink/65">Sign in to see your order history.</p>
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
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-leaf-900">Customer Orders</h1>
          <p className="mt-1 text-sm text-ink/55">
            Track status live{live ? ' · connected' : ''}
          </p>
        </div>
        <Link href="/account" className="text-sm font-medium text-leaf-700 hover:underline">
          Back to account
        </Link>
      </div>

      {loading && <p className="text-sm text-ink/60">Loading…</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!loading && orders.length === 0 && (
        <div className="rounded-2xl border border-leaf-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-ink/65">No orders yet. Start shopping fresh produce.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex rounded-xl bg-leaf-700 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Browse products
          </Link>
        </div>
      )}

      {selected ? (
        <div className="space-y-5">
          <OrderStatusTracker status={selected.status} />
          <CustomerOrderDetail
            order={selected}
            busy={busyId === selected.id}
            downloading={downloading}
            onReorder={() => void reorder(selected)}
            onDownloadInvoice={() => void downloadInvoice(selected.id, selected.orderNumber)}
            showCancel={CANCELABLE.has(selected.status)}
            showReturn={RETURNABLE.has(selected.status)}
            onCancel={() => void cancelOrder(selected.id)}
            onReturn={() => void returnOrder(selected.id)}
          />
        </div>
      ) : null}

      {orders.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">
            Order history
          </h2>
          <ul className="space-y-2.5">
            {orders.map((order) => {
              const open = order.id === selected?.id;
              const itemCount = order.items?.reduce((n, i) => n + i.quantity, 0) || 0;
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(order.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start transition ${
                      open
                        ? 'border-leaf-400 bg-white shadow-sm'
                        : 'border-leaf-200 bg-white/90 hover:border-leaf-300'
                    }`}
                  >
                    <CheckCircle
                      className={`h-7 w-7 shrink-0 ${
                        order.status === 'DELIVERED' ? 'text-emerald-500' : 'text-leaf-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">#{order.orderNumber}</p>
                      <p className="truncate text-xs text-ink/50">{formatPlacedAt(order.createdAt)}</p>
                    </div>
                    <div className="hidden shrink-0 text-end sm:block">
                      <Price
                        amount={order.total}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-ink"
                        symbolClassName="h-3.5 w-3.5"
                      />
                      <p className="mt-0.5 text-xs text-ink/50">
                        {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(
                        order.status,
                      )}`}
                    >
                      {orderStatusLabel(order.status)}
                    </span>
                    <Chevron open={open} className="h-5 w-5 shrink-0 text-ink/35" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
