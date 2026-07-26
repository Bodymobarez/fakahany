'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useRouter } from '@/i18n/routing';
import { CustomerOrderDetail } from '@/components/orders/CustomerOrderDetail';
import { OrderStatusTracker } from '@/components/orders/OrderStatusTracker';
import { api } from '@/lib/api';
import { addToCartApi } from '@/lib/cartApi';
import type { CustomerOrder } from '@/lib/orderTypes';
import { getCustomerSocket } from '@/lib/socket';
import { selectIsAuthenticated } from '@/store/authSlice';
import { setCartFromApi } from '@/store/cartSlice';

const CANCELABLE = new Set(['PENDING', 'ACCEPTED', 'PREPARING']);
const RETURNABLE = new Set(['DELIVERED', 'OUT_FOR_DELIVERY', 'PACKED']);

export default function OrderDetailPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    const { data } = await api.get<{ order: CustomerOrder }>(`/api/orders/${params.id}`);
    setOrder(data.order);
  }, [params.id]);

  useEffect(() => {
    if (!isAuth || !params.id) return;
    void load().catch(() => setError('Could not load order'));
  }, [isAuth, params.id, load]);

  useEffect(() => {
    if (!isAuth || !params.id) return;

    let socket: ReturnType<typeof getCustomerSocket> | null = null;
    const poll = setInterval(() => {
      void load().catch(() => undefined);
    }, 45000);

    try {
      socket = getCustomerSocket();
      socket.emit('order:subscribe', params.id);
      setLive(socket.connected);

      const onOrder = (payload: { orderId?: string; status?: string }) => {
        if (payload.orderId !== params.id || !payload.status) return;
        setOrder((prev) => (prev ? { ...prev, status: payload.status! } : prev));
        void load().catch(() => undefined);
      };

      socket.on('order:update', onOrder);
      socket.on('connect', () => {
        setLive(true);
        socket?.emit('order:subscribe', params.id);
      });
      socket.on('disconnect', () => setLive(false));

      return () => {
        clearInterval(poll);
        socket?.off('order:update', onOrder);
      };
    } catch {
      setLive(false);
      return () => clearInterval(poll);
    }
  }, [isAuth, params.id, load]);

  async function downloadInvoice() {
    if (!order) return;
    setDownloading(true);
    setError(null);
    try {
      const res = await api.get(`/api/orders/${order.id}/invoice`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${order.orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Invoice not available yet');
    } finally {
      setDownloading(false);
    }
  }

  async function reorder() {
    if (!order) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  async function cancelOrder() {
    if (!order) return;
    const reason = window.prompt('Cancel reason (optional)') ?? '';
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/orders/${order.id}/cancel`, { reason: reason || null });
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not cancel order',
      );
    } finally {
      setBusy(false);
    }
  }

  async function returnOrder() {
    if (!order) return;
    const reason = window.prompt('Return reason');
    if (!reason || reason.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/orders/${order.id}/return`, { reason: reason.trim() });
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not request return',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-ink/65">Sign in to view this order.</p>
        <Link href="/auth/login" className="mt-6 inline-block text-leaf-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/account/orders" className="mt-6 inline-block text-leaf-700 underline">
          Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-sm text-ink/60">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-sm font-medium text-leaf-700 hover:underline">
            ← Orders
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-leaf-900">
            #{order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-ink/55">
            Live updates{live ? ' · connected' : ''}
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <OrderStatusTracker status={order.status} />
      <CustomerOrderDetail
        order={order}
        busy={busy}
        downloading={downloading}
        onReorder={() => void reorder()}
        onDownloadInvoice={() => void downloadInvoice()}
        showCancel={CANCELABLE.has(order.status)}
        showReturn={RETURNABLE.has(order.status)}
        onCancel={() => void cancelOrder()}
        onReturn={() => void returnOrder()}
      />
    </div>
  );
}
