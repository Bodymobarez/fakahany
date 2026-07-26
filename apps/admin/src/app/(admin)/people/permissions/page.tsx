'use client';

import { PageHeader } from '@/components/PageHeader';

const matrix = [
  { area: 'Catalog', admin: true, staff: true, driver: false },
  { area: 'Orders', admin: true, staff: true, driver: false },
  { area: 'Finance', admin: true, staff: true, driver: false },
  { area: 'Delivery assign', admin: true, staff: true, driver: false },
  { area: 'Driver app', admin: false, staff: false, driver: true },
  { area: 'People / settings', admin: true, staff: false, driver: false },
];

export default function PermissionsPage() {
  return (
    <div>
      <PageHeader
        title="Permissions"
        description="Role capability overview. Fine-grained ACL can be added later."
      />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Area</th>
              <th className="px-4 py-3 font-medium">ADMIN</th>
              <th className="px-4 py-3 font-medium">STAFF</th>
              <th className="px-4 py-3 font-medium">DRIVER</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.area} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{row.area}</td>
                <td className="px-4 py-3">{row.admin ? '✓' : '—'}</td>
                <td className="px-4 py-3">{row.staff ? '✓' : '—'}</td>
                <td className="px-4 py-3">{row.driver ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
