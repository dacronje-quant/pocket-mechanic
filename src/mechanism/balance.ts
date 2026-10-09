/**
 * Levers, seesaws and pulleys (GDD §8.2). Torque is mass × distance from the
 * fulcrum; the heavier-turning side goes down. A block-and-tackle with N
 * supporting rope strands needs only 1/N of the force.
 */

export interface LeverWeight {
  id: string;
  pos: number;
  mass: number;
}

/** Sum of torques; positive = right side goes down. */
export function leverTorque(weights: LeverWeight[], fulcrum: number): number {
  return weights.reduce((s, w) => s + w.mass * (w.pos - fulcrum), 0);
}

/** -1 = left side down, 1 = right side down, 0 = balanced. */
export function leverTilt(weights: LeverWeight[], fulcrum: number): -1 | 0 | 1 {
  const t = leverTorque(weights, fulcrum);
  if (Math.abs(t) < 1e-9) return 0;
  return t > 0 ? 1 : -1;
}

export type LeverGoal = { kind: 'lift'; side: 'left' | 'right' } | { kind: 'balance' };

/** 'lift left' means the left end rises (so the right side must go down). */
export function leverSucceeds(weights: LeverWeight[], fulcrum: number, goal: LeverGoal): boolean {
  const tilt = leverTilt(weights, fulcrum);
  if (goal.kind === 'balance') return tilt === 0;
  return goal.side === 'left' ? tilt === 1 : tilt === -1;
}

/** Mechanical advantage of a block-and-tackle with this many pulley wheels. */
export function pulleyAdvantage(wheels: number): number {
  return Math.max(1, wheels);
}

/** Force needed on the rope. */
export function pulleyEffort(load: number, wheels: number): number {
  return load / pulleyAdvantage(wheels);
}

export function pulleyLifts(load: number, wheels: number, strength: number): boolean {
  return pulleyEffort(load, wheels) <= strength + 1e-9;
}

/** Fewest wheels that still lift the load (the "least force with fewest parts" medal). */
export function fewestWheels(load: number, strength: number): number {
  return Math.max(1, Math.ceil(load / strength - 1e-9));
}
