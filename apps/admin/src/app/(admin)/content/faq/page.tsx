'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Faq = {
  id: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  sortOrder: number;
  isActive: boolean;
};

type FormState = {
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  questionEn: '',
  questionAr: '',
  answerEn: '',
  answerAr: '',
  sortOrder: '0',
  isActive: true,
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function FaqAdminPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/content/faqs');
      setFaqs(data.faqs || []);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load FAQs',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(faq: Faq) {
    setEditId(faq.id);
    setForm({
      questionEn: faq.questionEn,
      questionAr: faq.questionAr,
      answerEn: faq.answerEn,
      answerAr: faq.answerAr,
      sortOrder: String(faq.sortOrder),
      isActive: faq.isActive,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      questionEn: form.questionEn.trim(),
      questionAr: form.questionAr.trim(),
      answerEn: form.answerEn.trim(),
      answerAr: form.answerAr.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/content/faqs/${editId}`, payload);
      } else {
        await api.post('/api/admin/content/faqs', payload);
      }
      cancelEdit();
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save FAQ',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggle(faq: Faq) {
    await api.patch(`/api/admin/content/faqs/${faq.id}`, { isActive: !faq.isActive });
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this FAQ?')) return;
    await api.delete(`/api/admin/content/faqs/${id}`);
    if (editId === id) cancelEdit();
    await load();
  }

  return (
    <div>
      <PageHeader title="FAQ" description="Storefront help questions." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mb-6 max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">{editId ? 'Edit FAQ' : 'Add FAQ'}</h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Question (EN)</span>
            <input
              required
              className={fieldClass}
              value={form.questionEn}
              onChange={(e) => setForm({ ...form, questionEn: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Question (AR)</span>
            <input
              required
              className={fieldClass}
              value={form.questionAr}
              onChange={(e) => setForm({ ...form, questionAr: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Answer (EN)</span>
            <textarea
              required
              rows={3}
              className={fieldClass}
              value={form.answerEn}
              onChange={(e) => setForm({ ...form, answerEn: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Answer (AR)</span>
            <textarea
              required
              rows={3}
              className={fieldClass}
              value={form.answerAr}
              onChange={(e) => setForm({ ...form, answerAr: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Sort order</span>
            <input
              type="number"
              className={fieldClass}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : editId ? 'Update FAQ' : 'Add FAQ'}
        </button>
      </form>

      {loading ? <p className="mb-4 text-sm text-slate-500">Loading…</p> : null}

      <ul className="space-y-3">
        {faqs.map((faq) => (
          <li key={faq.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{faq.questionEn}</p>
                <p className="mt-1 text-sm text-slate-600">{faq.answerEn}</p>
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                    faq.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {faq.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1 text-sm">
                <span className="text-xs text-slate-400">#{faq.sortOrder}</span>
                <button type="button" className="text-teal-700 hover:underline" onClick={() => startEdit(faq)}>
                  Edit
                </button>
                <button type="button" className="text-slate-600 hover:underline" onClick={() => void toggle(faq)}>
                  {faq.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button type="button" className="text-red-600 hover:underline" onClick={() => void remove(faq.id)}>
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
        {!loading && faqs.length === 0 ? (
          <li className="text-sm text-slate-500">No FAQs yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
