'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Polygon, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type LatLng = [number, number];

function ClickCapture({
  onAdd,
  enabled,
}: {
  onAdd: (lat: number, lng: number) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitPolygon({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 13 });
  }, [map, points]);
  return null;
}

/** Convert GeoJSON Polygon / ring → leaflet [lat,lng][] (GeoJSON is [lng,lat]). */
export function geoJsonToLatLngs(polygon: unknown): LatLng[] {
  try {
    const p = polygon as { type?: string; coordinates?: number[][][] };
    const ring = p?.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 3) return [];
    return ring
      .slice(0, -1)
      .map((c) => [Number(c[1]), Number(c[0])] as LatLng)
      .filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
  } catch {
    return [];
  }
}

export function latLngsToGeoJson(points: LatLng[]) {
  if (points.length < 3) return null;
  const ring = points.map(([lat, lng]) => [lng, lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
  return { type: 'Polygon', coordinates: [ring] };
}

const DUBAI_PRESET: LatLng[] = [
  [24.85, 54.89],
  [24.85, 55.65],
  [25.45, 55.65],
  [25.45, 54.89],
];

export function ZonePolygonEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (geo: { type: string; coordinates: number[][][] } | null) => void;
}) {
  const initial = useMemo(() => geoJsonToLatLngs(value), [value]);
  const [points, setPoints] = useState<LatLng[]>(initial);
  const [drawing, setDrawing] = useState(true);

  useEffect(() => {
    setPoints(geoJsonToLatLngs(value));
  }, [value]);

  function commit(next: LatLng[]) {
    setPoints(next);
    onChange(latLngsToGeoJson(next));
  }

  const closed = points.length >= 3 ? ([...points, points[0]] as LatLng[]) : points;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => setDrawing((d) => !d)}
          className={`rounded-lg px-3 py-1.5 font-medium ${
            drawing ? 'bg-teal-700 text-white' : 'border border-slate-300 text-slate-700'
          }`}
        >
          {drawing ? 'Drawing on' : 'Drawing off'}
        </button>
        <button
          type="button"
          onClick={() => commit(points.slice(0, -1))}
          disabled={!points.length}
          className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
        >
          Undo point
        </button>
        <button
          type="button"
          onClick={() => commit([])}
          className="rounded-lg border border-slate-300 px-3 py-1.5"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => commit(DUBAI_PRESET)}
          className="rounded-lg border border-teal-600 px-3 py-1.5 text-teal-800"
        >
          Dubai preset
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Click the map to add polygon vertices (need 3+). GeoJSON updates automatically.
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          center={[25.2048, 55.2708]}
          zoom={10}
          style={{ height: 320, width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCapture
            enabled={drawing}
            onAdd={(lat, lng) => commit([...points, [lat, lng]])}
          />
          <FitPolygon points={points} />
          {points.length >= 3 ? (
            <Polygon positions={closed} pathOptions={{ color: '#0f766e', fillOpacity: 0.2 }} />
          ) : points.length >= 2 ? (
            <Polyline positions={points} pathOptions={{ color: '#0f766e' }} />
          ) : null}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-400">{points.length} point(s)</p>
    </div>
  );
}
