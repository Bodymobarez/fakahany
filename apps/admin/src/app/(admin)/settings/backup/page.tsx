'use client';

import { PageHeader } from '@/components/PageHeader';

export default function BackupPage() {
  return (
    <div>
      <PageHeader
        title="Backup"
        description="Local Postgres data lives under .data/postgres — use your host backup tooling."
      />
      <div className="max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        <p>
          Recommended: schedule file-system snapshots of{' '}
          <code className="rounded bg-slate-100 px-1">.data/postgres</code> and{' '}
          <code className="rounded bg-slate-100 px-1">uploads/</code>.
        </p>
        <p>
          For cloud later: enable managed Postgres backups + object storage versioning for media.
        </p>
        <p className="text-xs text-slate-400">
          Automated dump/restore buttons can be added when an ops agent is configured.
        </p>
      </div>
    </div>
  );
}
