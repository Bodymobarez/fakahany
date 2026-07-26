'use client';

import { PageHeader } from '@/components/PageHeader';

const roles = [
  {
    role: 'ADMIN',
    description: 'Full access to catalog, orders, finance, people, and settings.',
  },
  {
    role: 'STAFF',
    description: 'Operate catalog, orders, inventory, delivery, and reports.',
  },
  {
    role: 'DRIVER',
    description: 'Driver app assignments, OTP delivery, location updates.',
  },
  {
    role: 'CUSTOMER',
    description: 'Storefront shopping, wallet, loyalty, support tickets.',
  },
];

export default function RolesPage() {
  return (
    <div>
      <PageHeader
        title="Roles"
        description="Built-in role matrix (assign roles under People → Users)."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {roles.map((r) => (
          <div
            key={r.role}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              {r.role}
            </p>
            <p className="mt-2 text-sm text-slate-600">{r.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
