'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Member = {
  userId: string;
  user?: { id: string; email: string | null; firstName: string | null; lastName: string | null };
};

type Group = {
  id: string;
  name: string;
  slug: string;
  discount: number | string | null;
  _count?: { members: number };
  members?: Member[];
};

type Customer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function CustomerGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [discount, setDiscount] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    const [g, c] = await Promise.all([
      api.get('/api/expansion/b2b/groups'),
      api.get('/api/admin/customers'),
    ]);
    setGroups(g.data.groups || []);
    setCustomers(c.data.customers || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load groups'));
  }, []);

  function startEdit(g: Group) {
    setEditId(g.id);
    setName(g.name);
    setSlug(g.slug);
    setDiscount(g.discount != null ? String(g.discount) : '');
  }

  function cancelEdit() {
    setEditId(null);
    setName('');
    setSlug('');
    setDiscount('');
  }

  async function onSaveGroup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      discount: discount === '' ? null : Number(discount),
    };
    try {
      if (editId) {
        await api.patch(`/api/expansion/b2b/groups/${editId}`, payload);
        setOk('Group updated');
      } else {
        await api.post('/api/expansion/b2b/groups', payload);
        setOk('Group created');
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Could not update group' : 'Could not create group');
    }
  }

  async function onAddMember(e: FormEvent) {
    e.preventDefault();
    if (!groupId || !userId) return;
    setError(null);
    setOk(null);
    try {
      await api.post(`/api/expansion/b2b/groups/${groupId}/members`, { userId });
      setOk('Member added');
      await load();
    } catch {
      setError('Could not add member');
    }
  }

  async function removeMember(gid: string, uid: string) {
    setError(null);
    setOk(null);
    try {
      await api.delete(`/api/expansion/b2b/groups/${gid}/members/${uid}`);
      setOk('Member removed');
      await load();
    } catch {
      setError('Could not remove member');
    }
  }

  return (
    <div>
      <PageHeader title="Customer Groups" description="B2B / wholesale segments and discounts." />
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

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={onSaveGroup}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{editId ? 'Edit group' : 'Create group'}</h2>
            {editId ? (
              <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
                Cancel
              </button>
            ) : null}
          </div>
          <input
            required
            placeholder="Name"
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            required
            placeholder="Slug"
            className={fieldClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <input
            type="number"
            min={0}
            max={100}
            placeholder="Discount %"
            className={fieldClass}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white">
            {editId ? 'Update' : 'Create'}
          </button>
        </form>

        <form
          onSubmit={onAddMember}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold">Add member</h2>
          <select
            required
            className={fieldClass}
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">Select group…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            required
            className={fieldClass}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Customer'} — {c.email}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white">
            Add member
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{g.name}</p>
                <p className="text-sm text-slate-500">
                  /{g.slug} · {g.discount != null ? `${g.discount}%` : 'No discount'} ·{' '}
                  {g._count?.members ?? g.members?.length ?? 0} members
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-teal-700 hover:underline"
                onClick={() => startEdit(g)}
              >
                Edit
              </button>
            </div>
            <ul className="mt-3 space-y-1">
              {(g.members || []).map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>
                    {[m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ') || 'Customer'}
                    <span className="ml-2 text-slate-400">{m.user?.email}</span>
                  </span>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => void removeMember(g.id, m.userId)}
                  >
                    Remove
                  </button>
                </li>
              ))}
              {!g.members?.length ? (
                <li className="text-xs text-slate-400">No members yet.</li>
              ) : null}
            </ul>
          </div>
        ))}
        {groups.length === 0 ? (
          <p className="text-sm text-slate-500">No groups yet.</p>
        ) : null}
      </div>
    </div>
  );
}
