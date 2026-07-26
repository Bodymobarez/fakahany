'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  driver?: { licenseNo?: string | null } | null;
};

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'STAFF' as 'ADMIN' | 'STAFF' | 'DRIVER',
  password: 'Staff123!',
  licenseNo: '',
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function UsersPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/people');
      setPeople(data.people || []);
      setError(null);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load users',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(p: Person) {
    setEditId(p.id);
    setForm({
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      email: p.email || '',
      phone: p.phone || '',
      role: (p.role as 'ADMIN' | 'STAFF' | 'DRIVER') || 'STAFF',
      password: '',
      licenseNo: p.driver?.licenseNo || '',
    });
    setOk(null);
    setError(null);
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      if (editId) {
        await api.patch(`/api/admin/people/${editId}`, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          ...(form.password.trim() ? { password: form.password } : {}),
          licenseNo: form.role === 'DRIVER' ? form.licenseNo.trim() || null : null,
        });
        setOk('User updated');
        cancelEdit();
      } else {
        await api.post('/api/admin/people', {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          password: form.password,
          licenseNo: form.role === 'DRIVER' ? form.licenseNo.trim() || null : null,
        });
        setForm(emptyForm);
        setOk('User created');
      }
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || (editId ? 'Could not update user' : 'Could not create user'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Person) {
    try {
      await api.patch(`/api/admin/people/${p.id}/active`, { isActive: !p.isActive });
      setPeople((prev) =>
        prev.map((row) => (row.id === p.id ? { ...row, isActive: !p.isActive } : row)),
      );
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not update user',
      );
    }
  }

  return (
    <div>
      <PageHeader title="Users" description="Admin, staff, and driver accounts." />
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

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mb-6 grid max-w-3xl gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"
      >
        <div className="sm:col-span-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit user' : 'Create user'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 underline">
              Cancel
            </button>
          ) : null}
        </div>
        <input
          required
          placeholder="First name"
          className={fieldClass}
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />
        <input
          required
          placeholder="Last name"
          className={fieldClass}
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />
        <input
          required
          type="email"
          placeholder="Email"
          className={fieldClass}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder="Phone"
          className={fieldClass}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <select
          className={fieldClass}
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value as 'ADMIN' | 'STAFF' | 'DRIVER' })
          }
        >
          <option value="STAFF">STAFF</option>
          <option value="ADMIN">ADMIN</option>
          <option value="DRIVER">DRIVER</option>
        </select>
        <input
          required={!editId}
          placeholder={editId ? 'New password (optional)' : 'Temp password'}
          className={fieldClass}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {form.role === 'DRIVER' ? (
          <input
            placeholder="License no"
            className={`${fieldClass} sm:col-span-2`}
            value={form.licenseNo}
            onChange={(e) => setForm({ ...form, licenseNo: e.target.value })}
          />
        ) : null}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : editId ? 'Save changes' : 'Create user'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {p.firstName} {p.lastName}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.email}</td>
                <td className="px-4 py-3">{p.role}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void toggleActive(p)}
                    className={`rounded-full px-2 py-0.5 text-xs hover:opacity-80 ${
                      p.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="text-xs text-teal-700 underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!loading && people.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No users yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
