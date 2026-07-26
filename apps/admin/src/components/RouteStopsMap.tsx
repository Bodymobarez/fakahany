'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type RouteMapStop = {
  id: string;
  stopOrder: number;
  orderNumber: string;
  lat: number;
  lng: number;
  address?: string;
};

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const first = points[0];
    if (points.length === 1 && first) {
      map.setView(first, 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
  }, [map, points]);
  return null;
}

function numberedIcon(n: number) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#0f766e;color:#fff;font:700 12px/1 system-ui,sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.35)">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export function RouteStopsMap({ stops }: { stops: RouteMapStop[] }) {
  const points = useMemo(
    () =>
      stops
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .sort((a, b) => a.stopOrder - b.stopOrder)
        .map((s) => [s.lat, s.lng] as [number, number]),
    [stops],
  );
  const center: [number, number] = points[0] || [25.2048, 55.2708];

  if (!points.length) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        No geocoded stops to show on the map.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: 320, width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.length > 1 ? (
          <Polyline positions={points} pathOptions={{ color: '#0f766e', weight: 4, opacity: 0.75 }} />
        ) : null}
        {stops
          .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
          .map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={numberedIcon(s.stopOrder)}
            >
              <Popup>
                <strong>
                  #{s.stopOrder} · {s.orderNumber}
                </strong>
                {s.address ? (
                  <>
                    <br />
                    {s.address}
                  </>
                ) : null}
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
