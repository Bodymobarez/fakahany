'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCredentials } from '@/store/authSlice';
import { api, clearAuth, getRefreshToken } from '@/lib/api';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, accessToken, hydrated } = useAppSelector((s) => s.auth);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !accessToken) router.replace('/login');
  }, [hydrated, user, accessToken, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user || !accessToken) return null;

  async function logout() {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken });
      }
    } catch {
      /* ignore */
    }
    clearAuth();
    dispatch(clearCredentials());
    router.replace('/login');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="text-sm text-slate-500">
          <span className="font-medium text-slate-800">{pathname}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">
            {user.firstName} {user.lastName}
            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {user.role}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
