'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthTokens, clearAuth } from '@/lib/api';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials, type AuthUser } from '@/store/authSlice';

export default function AdminHandoffPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
      const params = new URLSearchParams(hash);
      const token = params.get('token');
      const refresh = params.get('refresh');
      if (!token) {
        setError('Missing session token. Sign in from the admin login page.');
        return;
      }

      try {
        setAuthTokens(token, refresh);
        const { data } = await api.get<{ user: AuthUser }>('/api/auth/me');
        if (cancelled) return;
        const role = data.user?.role;
        if (role !== 'ADMIN' && role !== 'STAFF') {
          clearAuth();
          setError('This account does not have admin access.');
          return;
        }
        localStorage.setItem('fv_admin_user', JSON.stringify(data.user));
        dispatch(setCredentials({ user: data.user, accessToken: token }));
        window.history.replaceState(null, '', '/handoff');
        router.replace('/dashboard');
      } catch {
        if (!cancelled) {
          clearAuth();
          setError('Session expired. Please sign in again.');
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [dispatch, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <p className="text-sm text-red-700">{error}</p>
            <a
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-teal-700 hover:underline"
            >
              Go to admin login
            </a>
          </>
        ) : (
          <p className="text-sm text-slate-500">Opening admin panel…</p>
        )}
      </div>
    </div>
  );
}
