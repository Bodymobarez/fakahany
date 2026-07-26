'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Driver = {
  id: string;
  licenseNo?: string | null;
  isOnline?: boolean;
  isActive?: boolean;
  user?: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    email?: string | null;
  };
  vehicles?: { plateNo?: string; make?: string | null; model?: string | null }[];
};

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '+971',
  licenseNo: '',
  plateNo: '',
  make: '',
  model: '',
  password: 'Driver123!',
};

type EditForm = {
  firstName: string;
  lastName: string;
  phone: string;
  licenseNo: string;
  plateNo: string;
  make: string;
  model: string;
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    firstName: '',
    lastName: '',
    phone: '',
    licenseNo: '',
    plateNo: '',
    make: '',
    model: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/delivery/drivers');
      setDrivers(data.drivers || []);
      setError(null);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to load drivers',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.post('/api/admin/delivery/drivers', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        licenseNo: form.licenseNo.trim() || null,
        plateNo: form.plateNo.trim() || null,
        make: form.make.trim() || null,
        model: form.model.trim() || null,
        password: form.password,
      });
      setForm(emptyForm);
      setMessage('Driver created.');
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not create driver',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(d: Driver) {
    try {
      await api.patch(`/api/admin/delivery/drivers/${d.id}`, { isActive: !d.isActive });
      await load();
    } catch {
      setError('Could not update driver');
    }
  }

  function startEdit(d: Driver) {
    setEditId(d.id);
    setEditForm({
      firstName: d.user?.firstName || '',
      lastName: d.user?.lastName || '',
      phone: d.user?.phone || '',
      licenseNo: d.licenseNo || '',
      plateNo: d.vehicles?.[0]?.plateNo || '',
      make: d.vehicles?.[0]?.make || '',
      model: d.vehicles?.[0]?.model || '',
    });
    setMessage(null);
    setError(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/admin/delivery/drivers/${editId}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim() || null,
        licenseNo: editForm.licenseNo.trim() || null,
        plateNo: editForm.plateNo.trim() || null,
        make: editForm.make.trim() || null,
        model: editForm.model.trim() || null,
      });
      setEditId(null);
      setMessage('Driver updated.');
      await load();
    } catch {
      setError('Could not update driver');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Create fleet operators, assign plates, and toggle availability."
      />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void onCreate(e)}
        className="mb-8 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        <h2 className="sm:col-span-2 lg:col-span-3 text-sm font-semibold text-slate-800">
          Add driver
        </h2>
        {(
          [
            ['firstName', 'First name'],
            ['lastName', 'Last name'],
            ['email', 'Email'],
            ['phone', 'Phone'],
            ['licenseNo', 'License'],
            ['plateNo', 'Plate'],
            ['make', 'Vehicle make'],
            ['model', 'Vehicle model'],
            ['password', 'Temp password'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="mb-1 block text-slate-600">{label}</span>
            <input
              required={key === 'firstName' || key === 'lastName' || key === 'email'}
              type={key === 'password' ? 'text' : key === 'email' ? 'email' : 'text'}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
            />
          </label>
        ))}
        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Create driver'}
          </button>
        </div>
      </form>

      {editId ? (
        <form
          onSubmit={(e) => void saveEdit(e)}
          className="mb-8 grid gap-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Edit driver</h2>
            <button
              type="button"
              onClick={() => setEditId(null)}
              className="text-sm text-slate-500 hover:underline"
            >
              Cancel
            </button>
          </div>
          {(
            [
              ['firstName', 'First name'],
              ['lastName', 'Last name'],
              ['phone', 'Phone'],
              ['licenseNo', 'License'],
              ['plateNo', 'Plate'],
              ['make', 'Vehicle make'],
              ['model', 'Vehicle model'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block text-slate-600">{label}</span>
              <input
                required={key === 'firstName' || key === 'lastName'}
                value={editForm[key]}
                onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
              />
            </label>
          ))}
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">License</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {[d.user?.firstName, d.user?.lastName].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{d.user?.phone || '—'}</div>
                  <div className="text-xs text-slate-400">{d.user?.email}</div>
                </td>
                <td className="px-4 py-3">{d.licenseNo || '—'}</td>
                <td className="px-4 py-3">
                  {d.vehicles?.[0]
                    ? `${d.vehicles[0].plateNo || ''} ${[d.vehicles[0].make, d.vehicles[0].model].filter(Boolean).join(' ')}`.trim()
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      d.isActive === false
                        ? 'bg-slate-100 text-slate-500'
                        : d.isOnline
                          ? 'bg-teal-50 text-teal-800'
                          : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {d.isActive === false ? 'Inactive' : d.isOnline ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(d)}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(d)}
                      className="text-xs font-semibold text-slate-600 hover:underline"
                    >
                      {d.isActive === false ? 'Activate' : 'Deactivate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && drivers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No drivers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
