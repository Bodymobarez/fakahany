'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

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
  updatedAt: string;
  user?: { firstName: string; lastName: string; email: string | null; phone: string | null };
  order?: { id: string; orderNumber: string } | null;
  replies?: Reply[];
  _count?: { replies: number };
};

const STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>('ALL');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadList(status = statusFilter, search = q) {
    const { data } = await api.get('/api/support/admin/tickets', {
      params: {
        ...(status !== 'ALL' ? { status } : {}),
        ...(search.trim() ? { q: search.trim() } : {}),
      },
    });
    setTickets(data.tickets || []);
  }

  async function openTicket(id: string) {
    const { data } = await api.get(`/api/support/admin/tickets/${id}`);
    setSelected(data.ticket);
  }

  useEffect(() => {
    void loadList().catch(() => setError('Failed to load tickets'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/support/admin/tickets/${selected.id}/replies`, { body: reply });
      setReply('');
      await openTicket(selected.id);
      await loadList();
    } catch {
      setError('Reply failed');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: string) {
    if (!selected) return;
    setBusy(true);
    try {
      await api.patch(`/api/support/admin/tickets/${selected.id}/status`, { status });
      await openTicket(selected.id);
      await loadList();
    } catch {
      setError('Status update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Support" description="Customer tickets and staff replies." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void loadList().catch(() => setError('Failed to load tickets'));
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUSES)[number])}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search subject, customer, order…"
          className="min-w-[16rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          Filter
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => void openTicket(t.id)}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                    selected?.id === t.id ? 'bg-teal-50' : ''
                  }`}
                >
                  <p className="font-semibold text-slate-900">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t.user
                      ? `${t.user.firstName} ${t.user.lastName}`.trim() || t.user.email
                      : 'Customer'}{' '}
                    · {t.status} · {t._count?.replies ?? 0} replies
                    {t.order?.orderNumber ? ` · ${t.order.orderNumber}` : ''}
                  </p>
                </button>
              </li>
            ))}
            {tickets.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">No tickets yet.</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a ticket to reply.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{selected.subject}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {selected.status} · {new Date(selected.createdAt).toLocaleString()}
                  </p>
                  {selected.order ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Order{' '}
                      <Link
                        href={`/orders?q=${encodeURIComponent(selected.order.orderNumber)}`}
                        className="text-teal-700 underline"
                      >
                        {selected.order.orderNumber}
                      </Link>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy || selected.status === s}
                      onClick={() => void setStatus(s)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      {s === 'OPEN' ? 'Reopen' : s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <p className="text-xs font-medium text-slate-500">Customer</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-800">{selected.message}</p>
                </div>
                {(selected.replies || []).map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      r.isStaff ? 'bg-teal-50 text-teal-900' : 'bg-slate-50 text-slate-800'
                    }`}
                  >
                    <p className="text-xs font-medium opacity-70">
                      {r.isStaff ? 'Staff' : 'Customer'} ·{' '}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{r.body}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => void sendReply(e)} className="mt-4 space-y-2">
                <textarea
                  required
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a staff reply…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {busy ? 'Sending…' : 'Send reply'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
