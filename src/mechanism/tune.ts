/**
 * Tuning (comb teeth, radio dials, boiler heat, steam whistles): every dial
 * has a target and a tolerance. The waveform helpers draw what the player
 * hears so tuning can be seen as well as heard (GDD §25.3 visual sound cues).
 */

export interface Dial {
  id: string;
  /** 0..1 */
  value: number;
  target: number;
  tol: number;
}

export function dialTuned(value: number, target: number, tol: number): boolean {
  return Math.abs(value - target) <= tol + 1e-9;
}

export function allTuned(dials: Dial[]): boolean {
  return dials.every((d) => dialTuned(d.value, d.target, d.tol));
}

/** 0 (way off) .. 1 (spot on), used for static/clarity. */
export function clarity(value: number, target: number, tol: number): number {
  const off = Math.abs(value - target);
  if (off <= tol) return 1;
  return Math.max(0, 1 - (off - tol) / 0.35);
}

/** Map a dial position to a pitch (Hz) across about two octaves. */
export function dialPitch(value: number, low = 262, octaves = 2): number {
  return low * Math.pow(2, value * octaves);
}

/** Sample a wave for drawing: frequency rises with the dial; noise falls with clarity. */
export function waveSample(value: number, x: number, t: number, noise: number): number {
  const f = 2 + value * 8;
  const clean = Math.sin(x * f * Math.PI * 2 + t * 4);
  const jitter = Math.sin(x * 97.3 + t * 31.7) * Math.sin(x * 41.9 - t * 13.1);
  return clean * (1 - noise * 0.6) + jitter * noise;
}
