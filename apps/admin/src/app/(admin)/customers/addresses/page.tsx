'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Customer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

type Address = {
  id: string;
  label: string;
  line1: string;
  city: string;
  emirate: string;
  isDefault: boolean;
};

export default function AddressesAdminPage() {
  const [rows, setRows] = useState<
    Array<{ customer: string; email: string | null; address: Address }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await api.get('/api/admin/customers');
        const customers = (data.customers || []) as Customer[];
        const bundled: Array<{ customer: string; email: string | null; address: Address }> = [];
        for (const c of customers.slice(0, 40)) {
          const res = await api.get(`/api/admin/customers/${c.id}`);
          const addresses = (res.data.customer?.addresses || []) as Address[];
          for (const a of addresses) {
            bundled.push({
              customer: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Customer',
              email: c.email,
              address: a,
            });
          }
        }
        setRows(bundled);
      } catch {
        setError('Failed to load addresses');
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Addresses" description="Saved customer delivery addresses." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.address.id}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
          >
            <p className="font-medium">
              {r.customer}{' '}
              <span className="text-slate-400">· {r.address.label}</span>
              {r.address.isDefault ? (
                <span className="ml-2 rounded bg-teal-50 px-1.5 py-0.5 text-xs text-teal-800">
                  default
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-slate-600">
              {r.address.line1}, {r.address.city}, {r.address.emirate}
            </p>
          </li>
        ))}
        {rows.length === 0 && !error ? (
          <li className="text-sm text-slate-500">No addresses found.</li>
        ) : null}
      </ul>
    </div>
  );
}
