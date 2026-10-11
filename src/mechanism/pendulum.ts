/**
 * Pendulums & timing (GDD §8.4). True to real physics: the period depends on
 * the length, not the weight — T = 2π·√(L/g). A clock ticks once per swing
 * (half a period). Bob positions are "notches" along the rod.
 */

export const G = 9.81;

/** Length (metres) for a bob notch. Notch 1 is the shortest. */
export function notchLength(notch: number): number {
  return 0.15 + notch * 0.1;
}

export function period(lengthM: number): number {
  return 2 * Math.PI * Math.sqrt(lengthM / G);
}

/** Ticks per minute: one tick per swing. */
export function ticksPerMinute(lengthM: number): number {
  return 60 / (period(lengthM) / 2);
}

export function notchTempo(notch: number): number {
  return ticksPerMinute(notchLength(notch));
}

/** Close enough to the metronome (relative tolerance). */
export function tempoMatches(notch: number, bpm: number, tol = 0.025): boolean {
  return Math.abs(notchTempo(notch) - bpm) / bpm <= tol;
}

/** Equal lengths have equal natural periods; matching phase needs a shared release. */
export function inSync(notchA: number, notchB: number): boolean {
  return notchA === notchB;
}

export interface PendulumMotion { angle: number; velocity: number }
export const CLOCK_AMPLITUDE = 0.22;
export const PENDULUM_PIXELS_PER_METRE = 300;

/** The picture uses the same pivot-to-bob length as the force model. */
export function notchPixels(notch: number): number {
  return notchLength(notch) * PENDULUM_PIXELS_PER_METRE;
}

export function releasePendulum(): PendulumMotion {
  return { angle: -CLOCK_AMPLITUDE, velocity: 0 };
}

/** A tap supplies an impulse, without teleporting the pendulum's angle. */
export function pushPendulum(lengthM: number, motion: PendulumMotion): PendulumMotion {
  const direction = Math.sign(motion.velocity) || -Math.sign(motion.angle) || 1;
  const velocity = motion.velocity + direction * Math.sqrt(G / lengthM) * CLOCK_AMPLITUDE;
  const limit = Math.sqrt(Math.max(0, 2 * G / lengthM * (Math.cos(motion.angle) - Math.cos(0.26))));
  return { angle: motion.angle, velocity: direction * Math.min(Math.abs(velocity), limit) };
}

/** Gravity: theta'' = -(g/L) sin(theta). A working escapement replaces lost
 * energy only as the bob crosses the centre. It never changes the angle/phase.
 * Velocity Verlet with small substeps keeps motion stable across frame rates. */
export function stepPendulum(
  lengthM: number,
  motion: PendulumMotion,
  dt: number,
  options: { damping?: number; escapement?: boolean } = {},
): PendulumMotion & { crossings: number } {
  if (!(lengthM > 0) || !Number.isFinite(lengthM) || !(dt > 0) || !Number.isFinite(dt)) return { ...motion, crossings: 0 };
  const steps = Math.ceil(dt * 240), h = dt / steps;
  const loss = Math.exp(-(options.damping ?? 0.025) * h / 2);
  let angle = motion.angle, velocity = motion.velocity, crossings = 0;
  for (let i = 0; i < steps; i++) {
    const before = angle;
    velocity *= loss;
    velocity -= (G / lengthM) * Math.sin(angle) * h / 2;
    angle += velocity * h;
    velocity -= (G / lengthM) * Math.sin(angle) * h / 2;
    velocity *= loss;
    if ((before < 0 && angle >= 0) || (before > 0 && angle <= 0)) {
      crossings++;
      if (options.escapement) velocity = Math.sign(velocity) * Math.sqrt(2 * G / lengthM * (1 - Math.cos(CLOCK_AMPLITUDE)));
    }
  }
  return { angle, velocity, crossings };
}
