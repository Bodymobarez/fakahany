import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

type StopPoint = {
  assignmentId: string;
  orderId: string;
  lat: number;
  lng: number;
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nearest-neighbor TSP from depot (or first stop). */
export function optimizeStopOrder(
  stops: StopPoint[],
  depot?: { lat: number; lng: number } | null,
): string[] {
  if (!stops.length) return [];
  const remaining = [...stops];
  const ordered: string[] = [];
  let cursor = depot || { lat: remaining[0].lat, lng: remaining[0].lng };

  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const d = haversineKm(cursor, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next.assignmentId);
    cursor = { lat: next.lat, lng: next.lng };
  }
  return ordered;
}

export async function nextStopOrderForDriver(driverId: string): Promise<number> {
  const max = await prisma.deliveryAssignment.aggregate({
    where: { driverId, deliveredAt: null },
    _max: { stopOrder: true },
  });
  return (max._max.stopOrder || 0) + 1;
}

export async function optimizeDriverRoute(driverId: string): Promise<{ stops: number }> {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new AppError(404, 'Driver not found', 'NOT_FOUND');

  const assignments = await prisma.deliveryAssignment.findMany({
    where: { driverId, deliveredAt: null },
    include: { order: { include: { address: true } } },
  });

  const stops: StopPoint[] = assignments
    .map((a) => {
      const lat = a.order.address?.lat;
      const lng = a.order.address?.lng;
      if (lat == null || lng == null) return null;
      return {
        assignmentId: a.id,
        orderId: a.orderId,
        lat: Number(lat),
        lng: Number(lng),
      };
    })
    .filter((s): s is StopPoint => Boolean(s));

  // Append stops without coords at the end in current order
  const noCoords = assignments.filter(
    (a) => a.order.address?.lat == null || a.order.address?.lng == null,
  );

  const lastTrack = await prisma.trackingPoint.findFirst({
    where: { driverId },
    orderBy: { createdAt: 'desc' },
  });
  const depot =
    lastTrack != null ? { lat: lastTrack.lat, lng: lastTrack.lng } : null;

  const orderedIds = optimizeStopOrder(stops, depot);
  let n = 1;
  for (const id of orderedIds) {
    await prisma.deliveryAssignment.update({
      where: { id },
      data: { stopOrder: n },
    });
    n += 1;
  }
  for (const a of noCoords) {
    await prisma.deliveryAssignment.update({
      where: { id: a.id },
      data: { stopOrder: n },
    });
    n += 1;
  }

  return { stops: n - 1 };
}

export async function reorderDriverStops(
  driverId: string,
  assignmentIds: string[],
): Promise<void> {
  const existing = await prisma.deliveryAssignment.findMany({
    where: { driverId, deliveredAt: null, id: { in: assignmentIds } },
    select: { id: true },
  });
  if (existing.length !== assignmentIds.length) {
    throw new AppError(400, 'Invalid assignment list for driver', 'VALIDATION_ERROR');
  }
  let n = 1;
  for (const id of assignmentIds) {
    await prisma.deliveryAssignment.update({
      where: { id },
      data: { stopOrder: n },
    });
    n += 1;
  }
}
