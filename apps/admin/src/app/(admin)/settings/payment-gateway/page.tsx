'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Gateways = {
  cod?: boolean;
  stripe?: boolean;
  stripePublishableKey?: string | null;
  tabby?: boolean;
  tamara?: boolean;
  applePay?: boolean;
  googlePay?: boolean;
};

type Settings = {
  companyName: string;
  trn: string;
  vatRate: number | string;
  currency: string;
  timezone: string;
  address: string;
  paymentGateways?: Gateways | null;
};

export default function PaymentGatewayPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [gw, setGw] = useState<Gateways>({
    cod: true,
    stripe: true,
    stripePublishableKey: '',
    tabby: false,
    tamara: false,
    applePay: true,
    googlePay: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api
      .get('/api/admin/settings')
      .then(({ data }) => {
        const s = data.settings as Settings;
        setSettings(s);
        setGw({
          cod: s.paymentGateways?.cod ?? true,
          stripe: s.paymentGateways?.stripe ?? true,
          stripePublishableKey: s.paymentGateways?.stripePublishableKey ?? '',
          tabby: s.paymentGateways?.tabby ?? false,
          tamara: s.paymentGateways?.tamara ?? false,
          applePay: s.paymentGateways?.applePay ?? true,
          googlePay: s.paymentGateways?.googlePay ?? true,
        });
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
        paymentGateways: gw,
      });
      setOk('Payment gateway settings saved');
    } catch {
      setError('Save failed — ensure DB schema is up to date');
    } finally {
      setSaving(false);
    }
  }

  const toggles: Array<{ key: keyof Gateways; label: string }> = [
    { key: 'cod', label: 'Cash on delivery' },
    { key: 'stripe', label: 'Stripe' },
    { key: 'tabby', label: 'Tabby' },
    { key: 'tamara', label: 'Tamara' },
    { key: 'applePay', label: 'Apple Pay' },
    { key: 'googlePay', label: 'Google Pay' },
  ];

  return (
    <div>
      <PageHeader
        title="Payment Gateway"
        description="Enable checkout methods (keys stay out of the storefront)."
      />
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
        className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {toggles.map((t) => (
          <label key={t.key} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(gw[t.key])}
              onChange={(e) => setGw({ ...gw, [t.key]: e.target.checked })}
            />
            {t.label}
          </label>
        ))}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Stripe publishable key</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={gw.stripePublishableKey || ''}
            onChange={(e) => setGw({ ...gw, stripePublishableKey: e.target.value })}
            placeholder="pk_test_…"
            disabled={!gw.stripe}
          />
        </label>
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
