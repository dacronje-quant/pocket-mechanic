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

/** Two pendulums swing together when their lengths match. */
export function inSync(notchA: number, notchB: number): boolean {
  return notchA === notchB;
}

/** Swing angle at time t for an amplitude (radians) — small-angle motion. */
export function swingAngle(notch: number, t: number, amplitude: number): number {
  return amplitude * Math.sin((2 * Math.PI * t) / period(notchLength(notch)));
}
