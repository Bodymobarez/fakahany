'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { selectIsAuthenticated } from '@/store/authSlice';
import {
  EMIRATES,
  LocationPicker,
  UAE_CENTER,
  type MapLocation,
} from '@/components/maps/LocationPicker';

type Address = {
  id: string;
  label: string;
  line1: string;
  city: string;
  emirate: string;
  area?: string | null;
  street?: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
};

const fieldClass =
  'w-full rounded-xl border border-leaf-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/25';

const defaultLocation = (): MapLocation => ({
  lat: UAE_CENTER.lat,
  lng: UAE_CENTER.lng,
  emirate: 'Dubai',
  area: '',
  street: '',
  detected: false,
  status: 'idle',
});

export default function AddressesPage() {
  const isAuth = useSelector(selectIsAuthenticated);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('Dubai');
  const [location, setLocation] = useState<MapLocation>(defaultLocation);

  async function load() {
    const { data } = await api.get<{ addresses: Address[] }>('/api/addresses');
    setAddresses(data.addresses || []);
  }

  useEffect(() => {
    if (!isAuth) return;
    void load().catch(() => setError('Could not load addresses'));
  }, [isAuth]);

  function resetForm() {
    setEditingId(null);
    setLabel('Home');
    setLine1('');
    setCity('Dubai');
    setLocation(defaultLocation());
  }

  function startEdit(a: Address) {
    setEditingId(a.id);
    setLabel(a.label || 'Home');
    setLine1(a.line1);
    setCity(a.city);
    setLocation({
      lat: a.lat ?? UAE_CENTER.lat,
      lng: a.lng ?? UAE_CENTER.lng,
      emirate: a.emirate || 'Dubai',
      area: a.area || '',
      street: a.street || '',
      detected: Boolean(a.lat && a.lng),
      status: a.lat && a.lng ? 'selected' : 'idle',
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      label,
      line1: line1 || location.street || location.area || 'Pinned location',
      city,
      emirate: location.emirate,
      lat: location.lat,
      lng: location.lng,
      area: location.area || null,
      street: location.street || null,
    };
    try {
      if (editingId) {
        await api.patch(`/api/addresses/${editingId}`, payload);
      } else {
        await api.post('/api/addresses', {
          ...payload,
          isDefault: addresses.length === 0,
        });
      }
      resetForm();
      await load();
    } catch {
      setError(editingId ? 'Could not update address' : 'Could not save address');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/api/addresses/${id}`);
      if (editingId === id) resetForm();
      await load();
    } catch {
      setError('Could not delete address');
    }
  }

  async function setDefault(id: string) {
    try {
      await api.patch(`/api/addresses/${id}`, { isDefault: true });
      await load();
    } catch {
      setError('Could not set default address');
    }
  }

  if (!isAuth) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-ink/65">Sign in to manage addresses.</p>
        <Link href="/auth/login" className="mt-6 inline-block text-leaf-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-leaf-900">Addresses</h1>
        <Link href="/account" className="text-sm font-medium text-leaf-700 hover:underline">
          Back to account
        </Link>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <ul className="mb-8 space-y-3">
        {addresses.map((a) => (
          <li
            key={a.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-leaf-200 bg-white/80 px-5 py-4"
          >
            <div>
              <p className="font-semibold text-ink">
                {a.label}
                {a.isDefault ? (
                  <span className="ml-2 text-xs font-medium text-leaf-600">Default</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-ink/65">
                {a.line1}, {a.city}, {a.emirate}
              </p>
              {a.lat != null && a.lng != null ? (
                <p className="mt-1 text-xs text-ink/45">
                  {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-amber-700">No map pin — add coords for zone check</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => startEdit(a)}
                className="text-xs text-leaf-700 underline"
              >
                Edit
              </button>
              {!a.isDefault ? (
                <button
                  type="button"
                  onClick={() => void setDefault(a.id)}
                  className="text-xs text-leaf-700 underline"
                >
                  Set default
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void remove(a.id)}
                className="text-xs text-red-600 underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {addresses.length === 0 ? (
          <li className="text-sm text-ink/60">No saved addresses yet.</li>
        ) : null}
      </ul>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 rounded-2xl border border-leaf-200 bg-white/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-leaf-900">
            {editingId ? 'Edit address' : 'Add address'}
          </h2>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-ink/55 underline"
            >
              Cancel
            </button>
          ) : null}
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Label</span>
          <input className={fieldClass} value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Street / building</span>
          <input
            className={fieldClass}
            required
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            placeholder="Building, street, area"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">City</span>
            <input className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Emirate</span>
            <select
              className={fieldClass}
              value={location.emirate}
              onChange={(e) => setLocation((l) => ({ ...l, emirate: e.target.value }))}
            >
              {EMIRATES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
        </div>
        <LocationPicker value={location} onChange={setLocation} />
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-leaf-700 py-3 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-60"
        >
          {saving ? 'Saving…' : editingId ? 'Update address' : 'Save address'}
        </button>
      </form>
    </div>
  );
}
