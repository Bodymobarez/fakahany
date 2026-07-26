'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Company = {
  id: string;
  name: string;
  code: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
};

type FormState = {
  name: string;
  code: string;
  contact: string;
  phone: string;
  email: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  code: '',
  contact: '',
  phone: '',
  email: '',
  isActive: true,
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function DeliveryCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get('/api/admin/delivery/companies');
    setCompanies(data.companies || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load companies'));
  }, []);

  function startEdit(c: Company) {
    setEditId(c.id);
    setForm({
      name: c.name,
      code: c.code,
      contact: c.contact || '',
      phone: c.phone || '',
      email: c.email || '',
      isActive: c.isActive,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      contact: form.contact || null,
      phone: form.phone || null,
      email: form.email || null,
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/delivery/companies/${editId}`, payload);
      } else {
        await api.post('/api/admin/delivery/companies', payload);
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Failed to update company' : 'Failed to create company');
    }
  }

  async function toggle(c: Company) {
    await api.patch(`/api/admin/delivery/companies/${c.id}`, { isActive: !c.isActive });
    await load();
  }

  return (
    <div>
      <PageHeader title="Delivery Companies" description="3PL / courier partners." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <form
        onSubmit={onSubmit}
        className="mb-6 max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit company' : 'Add company'}
          </h2>
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
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          placeholder="Code"
          className={fieldClass}
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <input
          placeholder="Contact"
          className={fieldClass}
          value={form.contact}
          onChange={(e) => setForm({ ...form, contact: e.target.value })}
        />
        <input
          placeholder="Phone"
          className={fieldClass}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          placeholder="Email"
          className={fieldClass}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Active
        </label>
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white">
          {editId ? 'Update company' : 'Add company'}
        </button>
      </form>
      <ul className="space-y-2">
        {companies.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <div>
              <span className="font-medium">{c.name}</span>
              <span className="ml-2 text-slate-400">({c.code})</span>
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  c.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {c.isActive ? 'Active' : 'Inactive'}
              </span>
              <p className="mt-1 text-xs text-slate-500">
                {[c.contact, c.phone, c.email].filter(Boolean).join(' · ') || 'No contact'}
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" className="text-teal-700 hover:underline" onClick={() => startEdit(c)}>
                Edit
              </button>
              <button type="button" className="text-slate-600 hover:underline" onClick={() => void toggle(c)}>
                {c.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
