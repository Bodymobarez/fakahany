'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

const ZonePolygonEditor = dynamic(
  () => import('@/components/ZonePolygonEditor').then((m) => m.ZonePolygonEditor),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading map…</p> },
);

type Zone = {
  id: string;
  name: string;
  emirate: string;
  baseFee: number | string;
  freeAbove: number | string | null;
  etaMinutes: number;
  isActive: boolean;
  polygon?: unknown;
};

type ZoneForm = {
  name: string;
  emirate: string;
  baseFee: string;
  freeAbove: string;
  etaMinutes: string;
  isActive: boolean;
  polygonJson: string;
};

const emptyForm: ZoneForm = {
  name: '',
  emirate: '',
  baseFee: '15',
  freeAbove: '150',
  etaMinutes: '60',
  isActive: true,
  polygonJson: '',
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

function formFromZone(z: Zone): ZoneForm {
  return {
    name: z.name,
    emirate: z.emirate,
    baseFee: String(z.baseFee ?? 0),
    freeAbove: z.freeAbove == null ? '' : String(z.freeAbove),
    etaMinutes: String(z.etaMinutes ?? 60),
    isActive: z.isActive,
    polygonJson: z.polygon ? JSON.stringify(z.polygon, null, 2) : '',
  };
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [form, setForm] = useState<ZoneForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [polygonObj, setPolygonObj] = useState<unknown>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/delivery/zones');
      setZones(data.zones || []);
    } catch {
      setError('Failed to load zones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(z: Zone) {
    setEditId(z.id);
    setForm(formFromZone(z));
    setPolygonObj(z.polygon || null);
    setOk(null);
    setError(null);
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
    setPolygonObj(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      let polygon: unknown = polygonObj;
      if (showJson && form.polygonJson.trim()) {
        try {
          polygon = JSON.parse(form.polygonJson);
        } catch {
          throw new Error('Polygon JSON is invalid');
        }
      } else if (!showJson && form.polygonJson.trim() && !polygonObj) {
        try {
          polygon = JSON.parse(form.polygonJson);
        } catch {
          polygon = null;
        }
      }
      const payload = {
        name: form.name.trim(),
        emirate: form.emirate.trim(),
        baseFee: Number(form.baseFee) || 0,
        freeAbove: form.freeAbove === '' ? null : Number(form.freeAbove),
        etaMinutes: Number(form.etaMinutes) || 60,
        isActive: form.isActive,
        polygon: polygon ?? null,
      };
      if (editId) {
        await api.patch(`/api/admin/delivery/zones/${editId}`, payload);
        setOk('Zone updated');
      } else {
        await api.post('/api/admin/delivery/zones', payload);
        setOk('Zone created');
      }
      setEditId(null);
      setForm(emptyForm);
      setPolygonObj(null);
      await load();
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ||
          (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
            ?.message ||
          'Save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this zone?')) return;
    setError(null);
    try {
      await api.delete(`/api/admin/delivery/zones/${id}`);
      if (editId === id) cancelEdit();
      setOk('Zone deleted');
      await load();
    } catch {
      setError('Delete failed — zone may be in use');
    }
  }

  return (
    <div>
      <PageHeader
        title="Zones"
        description="Delivery coverage, fees, and GeoJSON polygons (edit or delete any zone)."
      />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mb-6 max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit zone' : 'Create zone'}
          </h2>
          {editId ? (
            <button type="button" onClick={cancelEdit} className="text-xs text-slate-500 underline">
              Cancel edit
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Name</span>
            <input
              required
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Emirate</span>
            <input
              required
              className={fieldClass}
              value={form.emirate}
              onChange={(e) => setForm({ ...form, emirate: e.target.value })}
              placeholder="Dubai"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Base fee</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldClass}
              value={form.baseFee}
              onChange={(e) => setForm({ ...form, baseFee: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Free above</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldClass}
              value={form.freeAbove}
              onChange={(e) => setForm({ ...form, freeAbove: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">ETA (minutes)</span>
            <input
              type="number"
              min={1}
              step={1}
              className={fieldClass}
              value={form.etaMinutes}
              onChange={(e) => setForm({ ...form, etaMinutes: e.target.value })}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
        </div>
        <div className="space-y-2">
          <span className="block text-sm font-medium text-slate-700">Coverage polygon</span>
          <ZonePolygonEditor
            value={polygonObj}
            onChange={(geo) => {
              setPolygonObj(geo);
              setForm((f) => ({
                ...f,
                polygonJson: geo ? JSON.stringify(geo, null, 2) : '',
              }));
            }}
          />
          <button
            type="button"
            onClick={() => setShowJson((v) => !v)}
            className="text-xs text-slate-500 underline"
          >
            {showJson ? 'Hide advanced JSON' : 'Advanced JSON'}
          </button>
          {showJson ? (
            <textarea
              className={`${fieldClass} min-h-24 font-mono text-xs`}
              value={form.polygonJson}
              onChange={(e) => {
                setForm({ ...form, polygonJson: e.target.value });
                try {
                  setPolygonObj(e.target.value.trim() ? JSON.parse(e.target.value) : null);
                } catch {
                  /* keep typing */
                }
              }}
            />
          ) : null}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : editId ? 'Update zone' : 'Create zone'}
        </button>
      </form>

      {loading ? <p className="mb-4 text-sm text-slate-500">Loading zones…</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Emirate</th>
              <th className="px-4 py-3 font-medium">Base fee</th>
              <th className="px-4 py-3 font-medium">Map</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{z.name}</td>
                <td className="px-4 py-3 text-slate-600">{z.emirate}</td>
                <td className="px-4 py-3">
                  <Price amount={z.baseFee} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {z.polygon ? 'Polygon' : 'Emirate only'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      z.isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {z.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 space-x-3">
                  <button
                    type="button"
                    onClick={() => startEdit(z)}
                    className="text-sm font-medium text-teal-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(z.id)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && zones.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No zones found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
