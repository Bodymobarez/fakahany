'use client';

import { Suspense, type FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { selectIsAuthenticated } from '@/store/authSlice';

type Reply = {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
};

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  orderId?: string | null;
  createdAt: string;
  replies?: Reply[];
  _count?: { replies: number };
};

type OrderOpt = { id: string; orderNumber: string };

function SupportPageInner() {
  const isAuth = useSelector(selectIsAuthenticated);
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<OrderOpt[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Ticket | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get<{ tickets: Ticket[] }>('/api/support/tickets');
    setTickets(data.tickets || []);
  }

  async function loadOrders() {
    const { data } = await api.get<{ orders: OrderOpt[] }>('/api/orders');
    setOrders((data.orders || []).map((o) => ({ id: o.id, orderNumber: o.orderNumber })));
  }

  async function loadDetail(id: string) {
    const { data } = await api.get<{ ticket: Ticket }>(`/api/support/tickets/${id}`);
    setDetail(data.ticket);
    setOpenId(id);
  }

  useEffect(() => {
    if (!isAuth) return;
    void Promise.all([load(), loadOrders()]).catch(() => setError('Could not load tickets'));
  }, [isAuth]);

  useEffect(() => {
    const fromQuery = searchParams.get('orderId');
    const ticketId = searchParams.get('ticketId');
    if (fromQuery) {
      setOrderId(fromQuery);
      setSubject((s) => s || 'Help with my order');
    }
    if (ticketId) {
      void loadDetail(ticketId).catch(() => undefined);
    }
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/api/support/tickets', {
        subject,
        message,
        orderId: orderId || null,
      });
      setSubject('');
      setMessage('');
      setOrderId('');
      await load();
    } catch {
      setError('Could not create ticket');
    } finally {
      setSaving(false);
    }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!openId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/support/tickets/${openId}/replies`, { body: reply });
      setReply('');
      await loadDetail(openId);
      await load();
    } catch {
      setError('Could not send reply');
    } finally {
      setSaving(false);
    }
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Support</h1>
        <p className="mt-3 text-ink/65">Sign in to contact support.</p>
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
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Support</h1>
        <Link href="/account" className="text-sm font-medium text-leaf-700 hover:underline">
          Back to account
        </Link>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-3 rounded-2xl border border-leaf-200 bg-white/80 p-5"
      >
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Related order (optional)</span>
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full rounded-xl border border-leaf-300 px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
          >
            <option value="">No order</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Subject</span>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-leaf-300 px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Message</span>
          <textarea
            required
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl border border-leaf-300 px-3.5 py-2.5 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-leaf-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
        >
          {saving ? 'Sending…' : 'Open ticket'}
        </button>
      </form>

      <ul className="mt-8 space-y-3">
        {tickets.map((t) => (
          <li key={t.id} className="rounded-2xl border border-leaf-200 bg-white/80 px-4 py-3">
            <button
              type="button"
              className="w-full text-start"
              onClick={() => void loadDetail(t.id)}
            >
              <p className="font-semibold text-ink">{t.subject}</p>
              <p className="mt-1 text-xs text-ink/50">
                {t.status} · {t._count?.replies ?? 0} replies ·{' '}
                {new Date(t.createdAt).toLocaleString()}
              </p>
            </button>
            {openId === t.id && detail ? (
              <div className="mt-4 space-y-3 border-t border-leaf-100 pt-4">
                <p className="whitespace-pre-wrap text-sm text-ink/80">{detail.message}</p>
                {(detail.replies || []).map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      r.isStaff ? 'bg-leaf-50 text-leaf-900' : 'bg-leaf-100/40 text-ink'
                    }`}
                  >
                    <p className="text-xs text-ink/45">
                      {r.isStaff ? 'Fresh Harvest' : 'You'} ·{' '}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{r.body}</p>
                  </div>
                ))}
                {detail.status !== 'CLOSED' ? (
                  <form onSubmit={(e) => void sendReply(e)} className="space-y-2">
                    <textarea
                      required
                      rows={2}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Add a reply…"
                      className="w-full rounded-xl border border-leaf-300 px-3 py-2 text-sm outline-none focus:border-leaf-500"
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-full bg-leaf-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Reply
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink/60">Loading…</div>
      }
    >
      <SupportPageInner />
    </Suspense>
  );
}
