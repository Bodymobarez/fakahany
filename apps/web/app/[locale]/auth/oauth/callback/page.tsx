'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { useRouter } from '@/i18n/routing';
import { AuthShell } from '@/components/auth/AuthShell';
import { exchangeOAuthTicket, finishAuthSession, parseApiError } from '@/lib/authApi';

function OAuthCallbackInner() {
  const search = useSearchParams();
  const dispatch = useDispatch();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ticket = search.get('ticket');
    const returnTo = search.get('returnTo');
    if (!ticket) {
      setError('Missing sign-in ticket. Please try again.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await exchangeOAuthTicket(ticket);
        if (cancelled) return;
        if (!data.user || !data.accessToken || !data.refreshToken) {
          throw new Error('Sign-in incomplete');
        }
        await finishAuthSession(dispatch, {
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        if (data.needsAddress) {
          router.replace(
            `/auth/complete-profile${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`,
          );
          return;
        }
        router.replace(returnTo && returnTo.startsWith('/') ? returnTo : '/');
      } catch (err) {
        if (!cancelled) setError(parseApiError(err, 'Social sign-in failed'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, router, search]);

  return (
    <AuthShell title="Signing you in" subtitle="Finishing your social login…">
      {error ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/auth/login')}
            className="w-full rounded-full bg-leaf-800 py-2.5 text-sm font-semibold text-white"
          >
            Back to login
          </button>
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-ink/60">Please wait…</p>
      )}
    </AuthShell>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Signing you in" subtitle="Finishing your social login…">
          <p className="mt-6 text-center text-sm text-ink/60">Please wait…</p>
        </AuthShell>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
