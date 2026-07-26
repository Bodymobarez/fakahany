'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Expense = {
  id: string;
  category: string;
  amount: number | string;
  note: string | null;
  incurredAt: string;
};

type FormState = {
  category: string;
  amount: string;
  note: string;
};

const emptyForm: FormState = { category: 'Operations', amount: '', note: '' };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get('/api/admin/finance/expenses');
    setExpenses(data.expenses || []);
  }

  useEffect(() => {
    void load().catch(() => setError('Failed to load expenses'));
  }, []);

  function startEdit(ex: Expense) {
    setEditId(ex.id);
    setForm({
      category: ex.category,
      amount: String(ex.amount),
      note: ex.note || '',
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      category: form.category.trim(),
      amount: Number(form.amount),
      note: form.note || null,
    };
    try {
      if (editId) {
        await api.patch(`/api/admin/finance/expenses/${editId}`, payload);
      } else {
        await api.post('/api/admin/finance/expenses', payload);
      }
      cancelEdit();
      await load();
    } catch {
      setError(editId ? 'Failed to update expense' : 'Failed to create expense');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/api/admin/finance/expenses/${id}`);
      if (editId === id) cancelEdit();
      await load();
    } catch {
      setError('Failed to delete expense');
    }
  }

  return (
    <div>
      <PageHeader title="Expenses" description="Operating costs for P&L." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <form
        onSubmit={onSubmit}
        className="mb-6 flex max-w-2xl flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="w-full text-sm font-semibold text-slate-800">
          {editId ? 'Edit expense' : 'Add expense'}
          {editId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="ml-3 text-xs font-normal text-slate-500 hover:underline"
            >
              Cancel
            </button>
          ) : null}
        </div>
        <input
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="Category"
        />
        <input
          required
          type="number"
          min={0.01}
          step="0.01"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          placeholder="Amount"
        />
        <input
          className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="Note"
        />
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white">
          {editId ? 'Update' : 'Add'}
        </button>
      </form>
      <ul className="space-y-2">
        {expenses.map((ex) => (
          <li
            key={ex.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{ex.category}</p>
              <p className="text-xs text-slate-400">
                {new Date(ex.incurredAt).toLocaleDateString()} {ex.note ? `· ${ex.note}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Price amount={ex.amount} />
              <button
                type="button"
                className="text-teal-700 hover:underline"
                onClick={() => startEdit(ex)}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-red-600 hover:underline"
                onClick={() => void remove(ex.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
