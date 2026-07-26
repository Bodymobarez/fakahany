'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

export type MapLocation = {
  lat: number;
  lng: number;
  emirate: string;
  area: string;
  street: string;
  detected: boolean;
  status: 'idle' | 'detecting' | 'detected' | 'selected' | 'manual' | 'error';
  message?: string;
};

export const UAE_CENTER = { lat: 25.2048, lng: 55.2708 };

export const EMIRATES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Ras Al Khaimah',
  'Fujairah',
  'Umm Al Quwain',
];

type Props = {
  value: MapLocation;
  onChange: (next: MapLocation) => void;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    pedestrian?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    county?: string;
  };
};

function matchEmirate(state?: string): string {
  if (!state) return 'Dubai';
  const hit = EMIRATES.find(
    (e) =>
      state.toLowerCase().includes(e.toLowerCase()) ||
      e.toLowerCase().includes(state.toLowerCase()),
  );
  return hit || 'Dubai';
}

function fromNominatim(
  result: NominatimResult,
  mode: 'selected' | 'manual' | 'detected',
): MapLocation {
  const a = result.address || {};
  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    emirate: matchEmirate(a.state || a.county),
    area: a.suburb || a.neighbourhood || a.city || a.town || a.village || '',
    street: a.road || a.pedestrian || '',
    detected: mode === 'selected' || mode === 'detected',
    status: mode,
    message: undefined,
  };
}

async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('addressdetails', '1');
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return (await res.json()) as NominatimResult;
}

async function searchPlaces(query: string): Promise<NominatimResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  url.searchParams.set('countrycodes', 'ae');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  return (await res.json()) as NominatimResult[];
}

const LeafletMap = dynamic(() => import('./LeafletMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-leaf-200 bg-leaf-50 text-sm text-ink/60">
      Loading map…
    </div>
  ),
});

export function LocationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyLatLng = useCallback(
    async (lat: number, lng: number, mode: 'selected' | 'manual' | 'detected') => {
      try {
        const result = await reverseGeocode(lat, lng);
        if (result) {
          onChange(fromNominatim(result, mode));
          return;
        }
      } catch {
        /* fall through */
      }
      onChange({
        lat,
        lng,
        emirate: 'Dubai',
        area: '',
        street: '',
        status: mode,
        detected: mode === 'selected' || mode === 'detected',
        message: 'Pin placed — fill address details below if needed.',
      });
    },
    [onChange],
  );

  const autoDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      onChange({
        ...value,
        status: 'error',
        detected: false,
        message: 'Location is not supported in this browser.',
      });
      return;
    }

    setDetecting(true);
    onChange({
      ...value,
      status: 'detecting',
      message: undefined,
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void applyLatLng(pos.coords.latitude, pos.coords.longitude, 'detected').finally(() => {
          setDetecting(false);
        });
      },
      (err) => {
        setDetecting(false);
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Allow location access, then try again.'
            : err.code === err.TIMEOUT
              ? 'Location request timed out. Try again.'
              : 'Could not detect your location. Search or pin on the map instead.';
        onChange({
          ...value,
          status: 'error',
          detected: false,
          message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }, [applyLatLng, onChange, value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      void searchPlaces(query.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const statusLabel =
    value.status === 'detecting' || detecting
      ? 'Detecting…'
      : value.status === 'detected'
        ? 'Detected'
        : value.status === 'selected'
          ? 'Selected'
          : value.status === 'manual'
            ? 'Adjusted'
            : value.status === 'error'
              ? 'Failed'
              : 'Search or pin on map';

  const statusClass =
    value.status === 'detecting' || detecting
      ? 'font-semibold text-amber-600'
      : value.status === 'detected' ||
          value.status === 'selected' ||
          value.status === 'manual'
        ? 'font-semibold text-leaf-700'
        : value.status === 'error'
          ? 'font-semibold text-red-600'
          : 'font-semibold text-ink/45';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink/70">
          Your Location / <span className={statusClass}>{statusLabel}</span>
        </p>
        <button
          type="button"
          onClick={autoDetectLocation}
          disabled={detecting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-leaf-300 bg-white px-3 py-1.5 text-xs font-semibold text-leaf-800 transition hover:bg-leaf-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="8" />
          </svg>
          {detecting ? 'Detecting…' : 'Auto Detect Location'}
        </button>
      </div>

      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search address or area in UAE"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20"
          autoComplete="off"
        />
        {searching && (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-ink/45">
            …
          </span>
        )}
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {results.map((r) => (
              <li key={`${r.lat}-${r.lon}-${r.display_name}`}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-start text-sm text-ink hover:bg-leaf-50"
                  onClick={() => {
                    onChange(fromNominatim(r, 'selected'));
                    setQuery(r.display_name);
                    setResults([]);
                  }}
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LeafletMap
        lat={value.lat || UAE_CENTER.lat}
        lng={value.lng || UAE_CENTER.lng}
        onPick={(lat, lng) => void applyLatLng(lat, lng, 'manual')}
      />

      <p className="text-xs text-ink/50">
        Use Auto Detect Location, search an area, or click / drag the marker. Address fields
        update automatically.
      </p>
      {value.message && (
        <p
          className={`text-xs ${
            value.status === 'error' ? 'text-red-600' : 'text-amber-700'
          }`}
        >
          {value.message}
        </p>
      )}
    </div>
  );
}
