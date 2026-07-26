'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

export default function TaxesSettingsPage() {
  const [vatRate, setVatRate] = useState('5');
  const [trn, setTrn] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [timezone, setTimezone] = useState('Asia/Dubai');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api
      .get('/api/admin/settings')
      .then(({ data }) => {
        const s = data.settings;
        setVatRate(String(s.vatRate ?? 5));
        setTrn(s.trn || '');
        setCompanyName(s.companyName || '');
        setCurrency(s.currency || 'AED');
        setTimezone(s.timezone || 'Asia/Dubai');
        setAddress(s.address || '');
      })
      .catch(() => setError('Failed to load settings'));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api.put('/api/admin/settings', {
        companyName,
        trn,
        vatRate: Number(vatRate),
        currency,
        timezone,
        address,
      });
      setOk('Tax settings saved');
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Taxes" description="UAE VAT rate and TRN used on invoices." />
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
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Company name</span>
          <input
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">TRN</span>
          <input
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={trn}
            onChange={(e) => setTrn(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">VAT rate (%)</span>
          <input
            required
            type="number"
            min={0}
            max={100}
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Address</span>
          <textarea
            required
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
