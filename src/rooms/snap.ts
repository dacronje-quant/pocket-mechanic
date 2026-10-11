/** Prefer a compatible socket when forgiving touch radii overlap. Keep a
 * nearby wrong socket available for the room's gentle refusal feedback. */
export function nearestSocket<T extends { x: number; y: number }>(targets: T[], x: number, y: number, radius: number, accepts?: (target: T) => boolean): T | null {
  let nearest: T | null = null, compatible: T | null = null;
  let distance = radius, compatibleDistance = radius;
  for (const target of targets) {
    const d = Math.hypot(target.x - x, target.y - y);
    if (d <= distance) { nearest = target; distance = d; }
    if (d <= compatibleDistance && (!accepts || accepts(target))) { compatible = target; compatibleDistance = d; }
  }
  return compatible ?? nearest;
}
