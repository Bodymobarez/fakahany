import { DeliveryType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export type LatLng = { lat: number; lng: number };

export type DeliveryQuote = {
  covered: boolean;
  zone: {
    id: string;
    name: string;
    emirate: string;
    baseFee: number;
    freeAbove: number | null;
    etaMinutes: number;
  } | null;
  fee: number;
  etaMinutes: number;
  reason?: string;
};

type PolygonRing = Array<{ lat: number; lng: number } | [number, number]>;

function normalizeRing(raw: unknown): Array<{ lat: number; lng: number }> | null {
  if (!raw) return null;
  let ring: unknown = raw;
  if (typeof raw === 'object' && raw !== null && 'coordinates' in raw) {
    const coords = (raw as { coordinates?: unknown }).coordinates;
    // GeoJSON Polygon: coordinates[0] is outer ring as [lng, lat][]
    if (Array.isArray(coords) && Array.isArray(coords[0])) {
      ring = coords[0];
    }
  }
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const points: Array<{ lat: number; lng: number }> = [];
  for (const p of ring as PolygonRing) {
    if (Array.isArray(p) && p.length >= 2) {
      // Prefer [lng, lat] GeoJSON; if first value looks like lat (>40 unlikely for UAE lng), still treat as lng,lat
      points.push({ lng: Number(p[0]), lat: Number(p[1]) });
    } else if (p && typeof p === 'object' && 'lat' in p && 'lng' in p) {
      points.push({ lat: Number((p as LatLng).lat), lng: Number((p as LatLng).lng) });
    }
  }
  return points.length >= 3 ? points : null;
}

/** Ray-casting point-in-polygon (lat/lng treated as planar for small UAE zones). */
export function pointInPolygon(point: LatLng, ring: Array<{ lat: number; lng: number }>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function normalizeEmirate(value: string): string {
  const v = value.trim().toLowerCase();
  if (v.includes('abu') || v === 'ad') return 'abu dhabi';
  if (v.includes('sharjah') || v === 'shj') return 'sharjah';
  if (v.includes('ajman')) return 'ajman';
  if (v.includes('khaimah') || v === 'rak') return 'ras al khaimah';
  if (v.includes('fujairah')) return 'fujairah';
  if (v.includes('quwain') || v === 'uaq') return 'umm al quwain';
  if (v.includes('dubai') || v === 'dxb') return 'dubai';
  return v;
}

export async function resolveDeliveryZone(input: {
  emirate?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  const zones = await prisma.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const lat = input.lat != null ? Number(input.lat) : null;
  const lng = input.lng != null ? Number(input.lng) : null;
  const hasPoint = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

  if (hasPoint) {
    for (const zone of zones) {
      const ring = normalizeRing(zone.polygon);
      if (ring && pointInPolygon({ lat: lat!, lng: lng! }, ring)) {
        return zone;
      }
    }
  }

  if (input.emirate) {
    const target = normalizeEmirate(input.emirate);
    const byEmirate = zones.find((z) => normalizeEmirate(z.emirate) === target);
    if (byEmirate) return byEmirate;
  }

  return null;
}

export async function quoteDelivery(input: {
  emirate?: string | null;
  lat?: number | null;
  lng?: number | null;
  subtotal?: number;
  deliveryType?: DeliveryType;
}): Promise<DeliveryQuote> {
  if (input.deliveryType === DeliveryType.PICKUP) {
    return {
      covered: true,
      zone: null,
      fee: 0,
      etaMinutes: 0,
      reason: 'Pickup — no delivery fee',
    };
  }

  const zone = await resolveDeliveryZone(input);
  if (!zone) {
    return {
      covered: false,
      zone: null,
      fee: 0,
      etaMinutes: 0,
      reason: 'Address is outside delivery coverage',
    };
  }

  const subtotal = Math.max(0, Number(input.subtotal || 0));
  let fee = Number(zone.baseFee);
  if (zone.freeAbove != null && subtotal >= Number(zone.freeAbove)) {
    fee = 0;
  }
  if (input.deliveryType === DeliveryType.EXPRESS) {
    fee = Math.round((fee + 10) * 100) / 100;
  }

  return {
    covered: true,
    zone: {
      id: zone.id,
      name: zone.name,
      emirate: zone.emirate,
      baseFee: Number(zone.baseFee),
      freeAbove: zone.freeAbove == null ? null : Number(zone.freeAbove),
      etaMinutes: zone.etaMinutes,
    },
    fee,
    etaMinutes: input.deliveryType === DeliveryType.EXPRESS ? Math.max(30, Math.floor(zone.etaMinutes / 2)) : zone.etaMinutes,
  };
}

export async function requireDeliveryQuote(input: {
  emirate?: string | null;
  lat?: number | null;
  lng?: number | null;
  subtotal?: number;
  deliveryType?: DeliveryType;
}): Promise<DeliveryQuote & { zoneId: string | null }> {
  const quote = await quoteDelivery(input);
  if (!quote.covered) {
    throw new AppError(400, quote.reason || 'Outside delivery zone', 'OUT_OF_ZONE');
  }
  return { ...quote, zoneId: quote.zone?.id ?? null };
}

export function zoneToJson(zone: { id: string; name: string; emirate: string; baseFee: Prisma.Decimal; freeAbove: Prisma.Decimal | null; etaMinutes: number }) {
  return {
    id: zone.id,
    name: zone.name,
    emirate: zone.emirate,
    baseFee: Number(zone.baseFee),
    freeAbove: zone.freeAbove == null ? null : Number(zone.freeAbove),
    etaMinutes: zone.etaMinutes,
  };
}
