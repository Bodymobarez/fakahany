'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Settings = {
  companyName: string;
  trn: string;
  vatRate: number;
  currency: string;
  timezone: string;
  address: string;
  logoUrl?: string | null;
};

export default function CompanySettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/admin/settings');
        setForm({
          companyName: data.settings.companyName,
          trn: data.settings.trn,
          vatRate: Number(data.settings.vatRate),
          currency: data.settings.currency,
          timezone: data.settings.timezone,
          address: data.settings.address,
          logoUrl: data.settings.logoUrl,
        });
      } catch (err: unknown) {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to load settings',
        );
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const { data } = await api.put('/api/admin/settings', {
        ...form,
        vatRate: Number(form.vatRate),
      });
      setForm({
        companyName: data.settings.companyName,
        trn: data.settings.trn,
        vatRate: Number(data.settings.vatRate),
        currency: data.settings.currency,
        timezone: data.settings.timezone,
        address: data.settings.address,
        logoUrl: data.settings.logoUrl,
      });
      setSaved(true);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!form && !error) {
    return <p className="text-sm text-slate-500">Loading company settings…</p>;
  }

  return (
    <div>
      <PageHeader title="Company" description="Legal entity and tax defaults." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {form ? (
        <form
          onSubmit={onSubmit}
          className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {(
            [
              ['companyName', 'Company name'],
              ['trn', 'TRN'],
              ['vatRate', 'VAT rate (%)'],
              ['currency', 'Currency'],
              ['timezone', 'Timezone'],
              ['address', 'Address'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">{label}</span>
              <input
                required
                type={key === 'vatRate' ? 'number' : 'text'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={String(form[key] ?? '')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [key]: key === 'vatRate' ? Number(e.target.value) : e.target.value,
                  })
                }
              />
            </label>
          ))}
          {saved ? <p className="text-sm text-teal-700">Settings saved.</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save company settings'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
