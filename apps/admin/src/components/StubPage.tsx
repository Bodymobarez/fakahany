import { PageHeader } from './PageHeader';

export function StubPage({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <PageHeader title={title} description={description || 'This module is scaffolded and ready for implementation.'} />
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        Coming soon — wire this screen to the admin API when the feature is prioritized.
      </div>
    </div>
  );
}
