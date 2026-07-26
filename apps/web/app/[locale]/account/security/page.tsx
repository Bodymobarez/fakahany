'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { selectIsAuthenticated } from '@/store/authSlice';

export default function SecurityPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuth) return;
    void api
      .get<{ user: { twoFactorEnabled?: boolean } }>('/api/auth/me')
      .then(({ data }) => setEnabled(Boolean(data.user?.twoFactorEnabled)))
      .catch(() => undefined);
  }, [isAuth]);

  async function setup() {
    setError(null);
    setMessage(null);
    try {
      const { data } = await api.post<{ secret: string; otpauthUrl: string }>('/api/auth/2fa/setup');
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setMessage('Scan the secret in Google Authenticator, then verify a code below.');
    } catch {
      setError('Could not start 2FA setup');
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/api/auth/2fa/verify', { token });
      setEnabled(true);
      setSecret(null);
      setOtpauthUrl(null);
      setToken('');
      setMessage('Two-factor authentication is enabled.');
    } catch {
      setError('Invalid authenticator code');
    }
  }

  async function disable() {
    setError(null);
    try {
      await api.post('/api/auth/2fa/disable');
      setEnabled(false);
      setMessage('Two-factor authentication disabled.');
    } catch {
      setError('Could not disable 2FA');
    }
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-ink/65">Sign in to manage security.</p>
        <Link href="/auth/login" className="mt-6 inline-block text-leaf-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Security</h1>
        <Link href="/account" className="text-sm font-medium text-leaf-700 hover:underline">
          Back
        </Link>
      </div>

      <div className="rounded-2xl border border-leaf-200 bg-white/80 p-5">
        <p className="text-sm text-ink/70">
          Status:{' '}
          <span className="font-semibold text-leaf-800">
            {enabled ? '2FA enabled' : '2FA off'}
          </span>
        </p>
        {!enabled ? (
          <button
            type="button"
            onClick={() => void setup()}
            className="mt-4 rounded-full bg-leaf-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-leaf-600"
          >
            Set up authenticator
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void disable()}
            className="mt-4 rounded-full border border-leaf-300 px-5 py-2.5 text-sm font-semibold text-leaf-800"
          >
            Disable 2FA
          </button>
        )}

        {secret ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium text-ink">Secret</p>
            <code className="block break-all rounded-xl bg-leaf-50 px-3 py-2 text-xs">{secret}</code>
            {otpauthUrl ? (
              <a
                href={otpauthUrl}
                className="inline-block text-leaf-700 underline"
                target="_blank"
                rel="noreferrer"
              >
                Open in authenticator app
              </a>
            ) : null}
            <form onSubmit={(e) => void verify(e)} className="space-y-2 pt-2">
              <input
                required
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Verify 6-digit code"
                className="w-full rounded-xl border border-leaf-300 px-3.5 py-2.5 outline-none focus:border-leaf-500"
              />
              <button
                type="submit"
                className="rounded-full bg-leaf-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Confirm enable
              </button>
            </form>
          </div>
        ) : null}

        {message ? <p className="mt-4 text-sm text-leaf-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
