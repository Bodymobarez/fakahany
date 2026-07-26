'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Integration = {
  id: string;
  name: string;
  status: string;
  category: string;
};

export default function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get('/api/expansion/integrations');
    setItems(data.integrations || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load integrations'));
  }, []);

  async function testWebhook(id: string) {
    setBusyId(id);
    setError(null);
    setOk(null);
    try {
      await api.post(`/api/expansion/integrations/${id}/webhook`, {
        event: 'ping',
        at: new Date().toISOString(),
      });
      setOk(`Webhook accepted for ${id}`);
    } catch {
      setError(`Webhook failed for ${id}`);
    } finally {
      setBusyId(null);
    }
  }

  const byCategory = items.reduce<Record<string, Integration[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Accounting, ERP, messaging, and BI connectors (stub endpoints ready for wiring)."
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

      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, list]) => (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {category}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((i) => (
                <li
                  key={i.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{i.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{i.id}</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                      {i.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === i.id}
                    onClick={() => void testWebhook(i.id)}
                    className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {busyId === i.id ? 'Sending…' : 'Test webhook'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!items.length ? <p className="text-sm text-slate-500">No integrations configured.</p> : null}
      </div>
    </div>
  );
}
