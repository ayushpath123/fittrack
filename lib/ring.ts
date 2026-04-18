export const RING_RADIUS = 46;
export const RING_CIRC = 2 * Math.PI * RING_RADIUS;

export function ringOffset(value: number, target: number): number {
  if (target <= 0) return RING_CIRC;
  const pct = Math.min(value / target, 1);
  return RING_CIRC * (1 - pct);
}
