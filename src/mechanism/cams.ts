/**
 * Cams (GDD §8.5): shaped wheels that turn rotation into up-and-down motion.
 * A cam profile is sampled at CAM_STEPS points per turn; 1 = the follower is
 * pushed up, 0 = it rests. A follower's dance is the profile read from its
 * phase (how far the cam is turned on its shaft).
 */

export const CAM_STEPS = 12;

export type CamShape = 'round' | 'egg' | 'pear' | 'heart' | 'clover' | 'star' | 'snail';

export const CAM_PROFILES: Record<CamShape, number[]> = {
  round: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  egg: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  pear: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  snail: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  heart: [1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  clover: [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
  star: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
};


/** The follower's motion over one turn, starting `phase` steps into the profile. */
export function followerPattern(shape: CamShape, phase = 0): number[] {
  const p = CAM_PROFILES[shape];
  const n = p.length;
  const k = ((phase % n) + n) % n;
  return p.map((_, i) => p[(i + k) % n]);
}

export function samePattern(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Does this cam make the follower dance the target? When `phaseMatters` is
 * false (Little Tinker / Fixer auto-rotate), any turn of the cam counts.
 */
export function camMatches(shape: CamShape, phase: number, target: number[], phaseMatters: boolean): boolean {
  if (phaseMatters) return samePattern(followerPattern(shape, phase), target);
  for (let k = 0; k < CAM_STEPS; k++) if (samePattern(followerPattern(shape, k), target)) return true;
  return false;
}

/** The phase that lines a shape up with a target, or -1. */
export function bestPhase(shape: CamShape, target: number[]): number {
  for (let k = 0; k < CAM_STEPS; k++) if (samePattern(followerPattern(shape, k), target)) return k;
  return -1;
}

/** Number of separate lifts in a pattern (how many times the follower pops up per turn). */
export function bumps(pattern: number[]): number {
  let n = 0;
  for (let i = 0; i < pattern.length; i++) {
    const prev = pattern[(i + pattern.length - 1) % pattern.length];
    if (pattern[i] && !prev) n++;
  }
  if (n === 0 && pattern.every(Boolean)) return 0;
  return n;
}
