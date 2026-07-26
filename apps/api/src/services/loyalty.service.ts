/** 100 reward points = 1 AED at checkout. */
export const LOYALTY_POINTS_PER_AED = 100;

export function loyaltyAedFromPoints(points: number): number {
  return Math.floor(Math.max(0, points) / LOYALTY_POINTS_PER_AED);
}

export function loyaltyPointsFromAed(aed: number): number {
  return Math.floor(Math.max(0, aed) * LOYALTY_POINTS_PER_AED);
}
