'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Customer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

type Detail = {
  loyaltyAccount?: {
    points: number;
    level?: { name: string } | null;
  } | null;
};

type Level = {
  id: string;
  name: string;
  slug: string;
  minPoints: number;
  earnRate: number | string;
  _count?: { accounts: number };
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

const emptyLevel = { name: '', slug: '', minPoints: '0', earnRate: '1' };

export default function LoyaltyAdminPage() {
  const [rows, setRows] = useState<
    Array<{ id: string; name: string; email: string | null; points: number; level: string }>
  >([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [userId, setUserId] = useState('');
  const [points, setPoints] = useState('50');
  const [note, setNote] = useState('Admin adjustment');
  const [levelForm, setLevelForm] = useState(emptyLevel);
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadLevels = useCallback(async () => {
    const { data } = await api.get('/api/admin/customers/loyalty/levels');
    setLevels(data.levels || []);
  }, []);

  const load = useCallback(async () => {
    const { data } = await api.get('/api/admin/customers');
    const customers = (data.customers || []) as Customer[];
    const details = await Promise.all(
      customers.slice(0, 50).map(async (c) => {
        const res = await api.get(`/api/admin/customers/${c.id}`);
        const d = res.data.customer as Detail;
        return {
          id: c.id,
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Customer',
          email: c.email,
          points: d.loyaltyAccount?.points ?? 0,
          level: d.loyaltyAccount?.level?.name || 'Green',
        };
      }),
    );
    const sorted = details.sort((a, b) => b.points - a.points);
    setRows(sorted);
    setUserId((prev) => prev || sorted[0]?.id || '');
  }, []);

  useEffect(() => {
    void Promise.all([load(), loadLevels()]).catch(() => setError('Failed to load loyalty data'));
  }, [load, loadLevels]);

  async function onAdjust(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const { data } = await api.post(`/api/admin/customers/${userId}/loyalty/adjust`, {
        points: Number(points),
        note,
      });
      const lvl = data.loyaltyAccount?.level?.name;
      setOk(
        `Points updated to ${data.loyaltyAccount?.points ?? '—'}${lvl ? ` (${lvl})` : ''}`,
      );
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Adjustment failed',
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditLevel(l: Level) {
    setEditingLevelId(l.id);
    setLevelForm({
      name: l.name,
      slug: l.slug,
      minPoints: String(l.minPoints),
      earnRate: String(l.earnRate),
    });
  }

  function cancelLevelEdit() {
    setEditingLevelId(null);
    setLevelForm(emptyLevel);
  }

  async function onLevelSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    const payload = {
      name: levelForm.name.trim(),
      slug: levelForm.slug.trim().toLowerCase(),
      minPoints: Number(levelForm.minPoints) || 0,
      earnRate: Number(levelForm.earnRate) || 1,
    };
    try {
      if (editingLevelId) {
        await api.patch(`/api/admin/customers/loyalty/levels/${editingLevelId}`, payload);
        cancelLevelEdit();
        setOk('Level updated');
      } else {
        await api.post('/api/admin/customers/loyalty/levels', payload);
        setLevelForm(emptyLevel);
        setOk('Level created');
      }
      await loadLevels();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not save level',
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeLevel(id: string) {
    setError(null);
    setOk(null);
    try {
      await api.delete(`/api/admin/customers/loyalty/levels/${id}`);
      if (editingLevelId === id) cancelLevelEdit();
      setOk('Level deleted');
      await loadLevels();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not delete level',
      );
    }
  }

  return (
    <div>
      <PageHeader title="Loyalty" description="Customer points and membership levels." />
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

      <section className="mb-8 max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Membership levels</h2>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {levels.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {l.name}{' '}
                  <span className="text-xs font-normal text-slate-400">({l.slug})</span>
                </p>
                <p className="text-xs text-slate-500">
                  ≥ {l.minPoints} pts · earn ×{Number(l.earnRate)} · {l._count?.accounts ?? 0}{' '}
                  accounts
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => startEditLevel(l)}
                  className="text-xs text-teal-700 underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void removeLevel(l.id)}
                  className="text-xs text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {levels.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-500">No levels yet.</li>
          ) : null}
        </ul>
        <form onSubmit={(e) => void onLevelSubmit(e)} className="grid gap-3 sm:grid-cols-2">
          <p className="text-xs font-medium text-slate-600 sm:col-span-2">
            {editingLevelId ? 'Edit level' : 'Add level'}
          </p>
          <input
            required
            className={fieldClass}
            placeholder="Name"
            value={levelForm.name}
            onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
          />
          <input
            required
            className={fieldClass}
            placeholder="Slug"
            value={levelForm.slug}
            onChange={(e) => setLevelForm({ ...levelForm, slug: e.target.value })}
          />
          <input
            required
            type="number"
            min={0}
            className={fieldClass}
            placeholder="Min points"
            value={levelForm.minPoints}
            onChange={(e) => setLevelForm({ ...levelForm, minPoints: e.target.value })}
          />
          <input
            type="number"
            min={0.1}
            step="0.1"
            className={fieldClass}
            placeholder="Earn rate"
            value={levelForm.earnRate}
            onChange={(e) => setLevelForm({ ...levelForm, earnRate: e.target.value })}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : editingLevelId ? 'Save level' : 'Add level'}
            </button>
            {editingLevelId ? (
              <button
                type="button"
                onClick={cancelLevelEdit}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <form
        onSubmit={(e) => void onAdjust(e)}
        className="mb-6 grid max-w-xl gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"
      >
        <h2 className="sm:col-span-2 text-sm font-semibold text-slate-800">Adjust points</h2>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-600">Customer</span>
          <select
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Select…</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.points} pts
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Points (+/-)</span>
          <input
            required
            type="number"
            step={1}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Note</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Apply adjustment'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.email}</p>
                </td>
                <td className="px-4 py-3">{r.level}</td>
                <td className="px-4 py-3 font-semibold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
