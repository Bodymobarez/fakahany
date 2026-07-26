'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Campaign = {
  id: string;
  channel: string;
  title: string;
  body: string;
  audience: string;
  status: string;
  sentCount: number;
  sentAt: string | null;
  createdAt: string;
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export function CampaignAdmin({
  channel,
  title,
  description,
}: {
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  title: string;
  description: string;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({
    title: '',
    body: '',
    audience: 'ALL_CUSTOMERS',
    sendNow: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get(`/api/admin/marketing/campaigns?channel=${channel}`);
    setCampaigns(data.campaigns || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load campaigns'));
  }, [channel]);

  function startEdit(c: Campaign) {
    setEditingId(c.id);
    setForm({
      title: c.title,
      body: c.body,
      audience: c.audience,
      sendNow: false,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ title: '', body: '', audience: 'ALL_CUSTOMERS', sendNow: true });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.patch(`/api/admin/marketing/campaigns/${editingId}`, {
          title: form.title.trim(),
          body: form.body.trim(),
          audience: form.audience,
        });
        cancelEdit();
      } else {
        await api.post('/api/admin/marketing/campaigns', {
          channel,
          title: form.title.trim(),
          body: form.body.trim(),
          audience: form.audience,
          sendNow: form.sendNow,
        });
        setForm({ title: '', body: '', audience: 'ALL_CUSTOMERS', sendNow: true });
      }
      await load();
    } catch {
      setError(editingId ? 'Failed to update campaign' : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  }

  async function sendDraft(id: string) {
    setError(null);
    try {
      await api.post(`/api/admin/marketing/campaigns/${id}/send`);
      await load();
    } catch {
      setError('Failed to send campaign');
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.delete(`/api/admin/marketing/campaigns/${id}`);
      if (editingId === id) cancelEdit();
      await load();
    } catch {
      setError('Failed to delete campaign');
    }
  }

  return (
    <div>
      <PageHeader title={title} description={description} />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mb-6 max-w-2xl space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-800">
          {editingId ? 'Edit draft' : 'New campaign'}
        </h2>
        <input
          required
          placeholder="Title"
          className={fieldClass}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          required
          rows={4}
          placeholder="Message body"
          className={fieldClass}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        <select
          className={fieldClass}
          value={form.audience}
          onChange={(e) => setForm({ ...form, audience: e.target.value })}
        >
          <option value="ALL_CUSTOMERS">All customers</option>
          <option value="MARKETING_OPT_IN">Marketing opt-in only</option>
        </select>
        {!editingId ? (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.sendNow}
              onChange={(e) => setForm({ ...form, sendNow: e.target.checked })}
            />
            Send immediately
          </label>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving
              ? 'Saving…'
              : editingId
                ? 'Save changes'
                : form.sendNow
                  ? 'Create & send'
                  : 'Save draft'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <ul className="space-y-3">
        {campaigns.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{c.title}</p>
                <p className="mt-1 text-sm text-slate-600">{c.body}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {c.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {c.audience} · sent {c.sentCount}
              {c.sentAt ? ` · ${new Date(c.sentAt).toLocaleString()}` : ''}
            </p>
            {c.status !== 'SENT' ? (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="text-teal-700 underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void sendDraft(c.id)}
                  className="text-teal-700 underline"
                >
                  Send now
                </button>
                <button
                  type="button"
                  onClick={() => void remove(c.id)}
                  className="text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </li>
        ))}
        {campaigns.length === 0 ? (
          <li className="text-sm text-slate-500">No campaigns yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
