import { Sidebar } from '@/components/Sidebar';
import { AuthGate } from '@/components/AuthGate';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AuthGate>{children}</AuthGate>
      </div>
    </div>
  );
}
