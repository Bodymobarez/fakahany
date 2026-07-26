'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Integrations = {
  emailProvider?: string | null;
  emailFrom?: string | null;
  emailWebhookUrl?: string | null;
  smsProvider?: string | null;
  smsSenderId?: string | null;
  smsWebhookUrl?: string | null;
  whatsappNumber?: string | null;
  whatsappEnabled?: boolean;
  mobileMinVersion?: string | null;
  apiPublicDocs?: boolean;
};

type Settings = {
  companyName: string;
  trn: string;
  vatRate: number | string;
  currency: string;
  timezone: string;
  address: string;
  paymentGateways?: unknown;
  integrations?: Integrations | null;
};

export function IntegrationsSettings({
  title,
  description,
  fields,
}: {
  title: string;
  description: string;
  fields: Array<keyof Integrations>;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [integrations, setIntegrations] = useState<Integrations>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api
      .get('/api/admin/settings')
      .then(({ data }) => {
        const s = data.settings as Settings;
        setSettings(s);
        setIntegrations(s.integrations || {});
      })
      .catch(() => setError('Failed to load settings'));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api.put('/api/admin/settings', {
        companyName: settings.companyName,
        trn: settings.trn,
        vatRate: Number(settings.vatRate),
        currency: settings.currency,
        timezone: settings.timezone,
        address: settings.address,
        paymentGateways: settings.paymentGateways ?? null,
        integrations: { ...(settings.integrations || {}), ...integrations },
      });
      setOk('Saved');
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  }

  const labels: Record<keyof Integrations, string> = {
    emailProvider: 'Email provider',
    emailFrom: 'From address',
    emailWebhookUrl: 'Email webhook URL',
    smsProvider: 'SMS provider',
    smsSenderId: 'SMS sender ID',
    smsWebhookUrl: 'SMS webhook URL',
    whatsappNumber: 'WhatsApp number',
    whatsappEnabled: 'WhatsApp enabled',
    mobileMinVersion: 'Mobile min version',
    apiPublicDocs: 'Public API docs',
  };

  return (
    <div>
      <PageHeader title={title} description={description} />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {ok}
        </div>
      ) : null}
      <form
        onSubmit={onSubmit}
        className="max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {fields.map((key) =>
          typeof integrations[key] === 'boolean' ||
          key === 'whatsappEnabled' ||
          key === 'apiPublicDocs' ? (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(integrations[key])}
                onChange={(e) => setIntegrations({ ...integrations, [key]: e.target.checked })}
              />
              {labels[key]}
            </label>
          ) : (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-medium">{labels[key]}</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={(integrations[key] as string) || ''}
                onChange={(e) => setIntegrations({ ...integrations, [key]: e.target.value })}
              />
            </label>
          ),
        )}
        <button
          type="submit"
          disabled={saving || !settings}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
