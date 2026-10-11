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

export interface LeverMotion {
  /** Radians; positive lowers the right end. */
  angle: number;
  /** Radians per second. */
  velocity: number;
}

export interface LeverMotionOptions {
  maxAngle?: number;
  /** The beam sits below its axle, making exact balance stably return level. */
  centreBelowPivot?: number;
  /** Board-step units, speed-scaled for a short clockwork animation. */
  gravity?: number;
  damping?: number;
}

/** Damped, suspended-beam motion with inertia and physical end stops. */
export function stepLeverMotion(weights: LeverWeight[], fulcrum: number, motion: LeverMotion, dt: number, options: LeverMotionOptions = {}): LeverMotion {
  const limit = options.maxAngle ?? 0.22;
  const below = options.centreBelowPivot ?? 0.3;
  const gravity = options.gravity ?? 320;
  const damping = options.damping ?? 8;
  const clamp = (angle: number) => Math.max(-limit, Math.min(limit, angle));
  let angle = clamp(motion.angle), velocity = motion.velocity;
  if (!(dt > 0) || !Number.isFinite(dt)) return { angle, velocity };
  const mass = weights.reduce((sum, weight) => sum + weight.mass, 0);
  const moment = leverTorque(weights, fulcrum);
  const inertia = Math.max(1, weights.reduce((sum, weight) => sum + weight.mass * ((weight.pos - fulcrum) ** 2 + below ** 2), 0));
  // Small substeps keep frame stalls from launching the beam through a stop.
  const steps = Math.ceil(dt / (1 / 120));
  const step = dt / steps;
  for (let i = 0; i < steps; i++) {
    const torque = moment * Math.cos(angle) - mass * below * Math.sin(angle);
    velocity += (gravity * torque / inertia - damping * velocity) * step;
    angle += velocity * step;
    if (angle >= limit) { angle = limit; if (velocity > 0) velocity = 0; }
    if (angle <= -limit) { angle = -limit; if (velocity < 0) velocity = 0; }
  }
  return { angle, velocity };
}

/**
 * The game's alternating tackle has N supporting strands for N fitted wheels
 * (odd N anchors the rope to the load; even N anchors it overhead). A fixed
 * redirecting wheel alone gives 1:1. Zero wheels means an unassembled rope.
 */
export function pulleyAdvantage(wheels: number): number {
  return Number.isInteger(wheels) && wheels > 0 ? wheels : 0;
}

/** Force needed on the rope. */
export function pulleyEffort(load: number, wheels: number): number {
  const advantage = pulleyAdvantage(wheels);
  return advantage && Number.isFinite(load) && load >= 0 ? load / advantage : Infinity;
}

export function pulleyLifts(load: number, wheels: number, strength: number): boolean {
  return Number.isFinite(load) && load > 0 && Number.isFinite(strength) && strength > 0 && pulleyEffort(load, wheels) <= strength + 1e-9;
}

/** Fewest wheels that still lift the load (the "least force with fewest parts" medal). */
export function fewestWheels(load: number, strength: number): number {
  if (!Number.isFinite(load) || !(load > 0) || !Number.isFinite(strength) || !(strength > 0)) return Infinity;
  return Math.max(1, Math.ceil(load / strength - 1e-9));
}
