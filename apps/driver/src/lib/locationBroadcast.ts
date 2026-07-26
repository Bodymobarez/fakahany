import { useEffect, useRef, useState } from 'react';
import { apiFetch } from './auth';

async function readDeviceLocation(): Promise<{ lat: number; lng: number; speed?: number } | null> {
  try {
    const Location = await import('expo-location');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      speed: pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed * 3.6 : undefined,
    };
  } catch {
    return null;
  }
}

/** Broadcasts driver GPS to the API every 20s while mounted. */
export function useDriverLocationBroadcast(enabled = true) {
  const tick = useRef(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState('GPS idle');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function pushLocation() {
      tick.current += 1;
      const real = await readDeviceLocation();
      let lat: number;
      let lng: number;
      let speed = 28;
      let source = 'demo';

      if (real) {
        lat = real.lat;
        lng = real.lng;
        if (real.speed != null) speed = real.speed;
        source = 'device';
      } else {
        const baseLat = 25.2048;
        const baseLng = 55.2708;
        lat = baseLat + Math.sin(tick.current / 8) * 0.012;
        lng = baseLng + Math.cos(tick.current / 8) * 0.012;
      }

      try {
        await apiFetch('/api/driver/location', {
          method: 'POST',
          body: JSON.stringify({ lat, lng, speed }),
        });
        if (!cancelled) {
          setCoords({ lat, lng });
          setLabel(`GPS (${source}) ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      } catch {
        if (!cancelled) setLabel('GPS send failed');
      }
    }

    void pushLocation();
    const timer = setInterval(() => void pushLocation(), 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);

  return { coords, label };
}
