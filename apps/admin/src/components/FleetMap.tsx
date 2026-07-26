'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type FleetMapDriver = {
  id: string;
  name: string;
  online: boolean;
  lastPoint: { lat: number; lng: number; at: string } | null;
  activeOrders: Array<{ orderNumber: string; status: string }>;
};

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

export function FleetMap({ drivers }: { drivers: FleetMapDriver[] }) {
  const points = drivers
    .filter((d) => d.lastPoint)
    .map((d) => [d.lastPoint!.lat, d.lastPoint!.lng] as [number, number]);
  const center: [number, number] = points[0] || [25.2048, 55.2708];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: 420, width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {drivers.map((d) =>
          d.lastPoint ? (
            <Marker
              key={d.id}
              position={[d.lastPoint.lat, d.lastPoint.lng]}
              icon={markerIcon}
              opacity={d.online ? 1 : 0.55}
            >
              <Popup>
                <strong>{d.name || 'Driver'}</strong>
                <br />
                {d.online ? 'Online' : 'Offline'}
                <br />
                {d.activeOrders.length
                  ? d.activeOrders.map((o) => `${o.orderNumber} (${o.status})`).join(', ')
                  : 'No active orders'}
              </Popup>
            </Marker>
          ) : null,
        )}
      </MapContainer>
    </div>
  );
}
