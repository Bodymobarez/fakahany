'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import { clearTokens } from '@/lib/session';
import { logout, selectIsAuthenticated } from '@/store/authSlice';

type ConsentType = 'MARKETING' | 'ANALYTICS' | 'ESSENTIAL' | 'PERSONALIZATION';

type ConsentRecord = {
  id: string;
  type: ConsentType;
  granted: boolean;
  createdAt: string;
};

const TOGGLEABLE: Array<{ type: ConsentType; label: string; blurb: string }> = [
  {
    type: 'MARKETING',
    label: 'Marketing messages',
    blurb: 'Offers, campaigns, and product updates by email/SMS/push.',
  },
  {
    type: 'ANALYTICS',
    label: 'Analytics',
    blurb: 'Help us improve the store with anonymized usage metrics.',
  },
  {
    type: 'PERSONALIZATION',
    label: 'Personalization',
    blurb: 'Product recommendations tailored to your browsing.',
  },
];

function latestGranted(consents: ConsentRecord[], type: ConsentType) {
  const row = consents.find((c) => c.type === type);
  return row?.granted ?? false;
}

export default function AccountPrivacyPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);

  async function loadConsents() {
    const { data } = await api.get<{ consents: ConsentRecord[] }>('/api/compliance/consents');
    setConsents(data.consents || []);
  }

  useEffect(() => {
    if (!isAuth) return;
    void loadConsents().catch(() => setError('Could not load consents'));
  }, [isAuth]);

  async function setConsent(type: ConsentType, granted: boolean) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/api/compliance/consents', { type, granted, version: '1.0' });
      await loadConsents();
      setMessage(`${type.toLowerCase()} consent ${granted ? 'granted' : 'revoked'}.`);
    } catch {
      setError('Could not update consent');
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await api.get('/api/compliance/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fresh-harvest-pdpl-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Your data export downloaded.');
    } catch {
      setError('Could not export data');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        'Permanently anonymize your account under UAE PDPL? You will be signed out and cannot undo this.',
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/compliance/delete');
      clearTokens();
      dispatch(logout());
      router.push('/');
    } catch {
      setError('Could not delete account');
      setBusy(false);
    }
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-ink/65">Sign in to manage privacy requests.</p>
        <Link href="/auth/login" className="mt-6 inline-block text-leaf-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Privacy (PDPL)</h1>
        <Link href="/account" className="text-sm font-medium text-leaf-700 hover:underline">
          Back
        </Link>
      </div>

      <p className="text-sm leading-relaxed text-ink/70">
        Under the UAE Personal Data Protection Law you can manage consents, download a copy of your
        personal data, or request erasure (account anonymization).
      </p>

      <section className="mt-6 space-y-3 rounded-2xl border border-leaf-200 bg-white/80 p-5">
        <h2 className="font-display text-lg font-semibold text-leaf-900">Consents</h2>
        {TOGGLEABLE.map((item) => {
          const on = latestGranted(consents, item.type);
          return (
            <label
              key={item.type}
              className="flex cursor-pointer items-start justify-between gap-4 border-t border-leaf-100 pt-3 first:border-0 first:pt-0"
            >
              <span>
                <span className="block text-sm font-medium text-ink">{item.label}</span>
                <span className="mt-0.5 block text-xs text-ink/55">{item.blurb}</span>
              </span>
              <input
                type="checkbox"
                disabled={busy}
                checked={on}
                onChange={(e) => void setConsent(item.type, e.target.checked)}
                className="mt-1 h-4 w-4"
              />
            </label>
          );
        })}
        <p className="text-xs text-ink/45">
          Essential processing for orders and delivery stays enabled and is not optional.
        </p>
      </section>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void exportData()}
          className="w-full rounded-full bg-leaf-700 px-5 py-3 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
        >
          Download my data
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void deleteAccount()}
          className="w-full rounded-full border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Delete / anonymize account
        </button>
      </div>

      {message ? <p className="mt-4 text-sm text-leaf-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <Link href="/privacy" className="mt-8 inline-block text-sm text-leaf-700 underline">
        Read full privacy policy
      </Link>
    </div>
  );
}
