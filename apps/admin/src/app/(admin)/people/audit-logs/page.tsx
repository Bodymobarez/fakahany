'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Log = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
  user?: { email: string | null; firstName: string; lastName: string } | null;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get('/api/admin/settings/audit')
      .then(({ data }) => setLogs(data.logs || []))
      .catch(() => setError('Failed to load audit logs'));
  }, []);

  return (
    <div>
      <PageHeader title="Audit Logs" description="Security and admin activity trail." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-500">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {l.user
                    ? `${l.user.firstName} ${l.user.lastName}`.trim() || l.user.email
                    : '—'}
                </td>
                <td className="px-4 py-3 font-medium">{l.action}</td>
                <td className="px-4 py-3 text-slate-600">
                  {[l.entity, l.entityId].filter(Boolean).join(' · ') || '—'}
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No audit events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
