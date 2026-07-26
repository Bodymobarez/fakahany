'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { orders: number };
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(search?: string) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/customers', {
        params: search ? { q: search } : undefined,
      });
      setCustomers(data.customers || []);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load customers',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleActive(c: Customer) {
    try {
      await api.patch(`/api/admin/customers/${c.id}/active`, { isActive: !c.isActive });
      setCustomers((prev) =>
        prev.map((row) => (row.id === c.id ? { ...row, isActive: !c.isActive } : row)),
      );
    } catch {
      setError('Could not update customer status');
    }
  }

  return (
    <div>
      <PageHeader title="Customers" description="Registered shoppers." />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          Search
        </button>
      </form>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <Link href={`/customers/${c.id}`} className="text-teal-700 hover:underline">
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{c.email || '—'}</div>
                  <div className="text-xs text-slate-400">{c.phone}</div>
                </td>
                <td className="px-4 py-3">{c._count?.orders ?? 0}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void toggleActive(c)}
                    className={`rounded-full px-2 py-0.5 text-xs hover:opacity-80 ${
                      c.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {c.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No customers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
