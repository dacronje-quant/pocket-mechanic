/**
 * Pinned music cylinders (GDD §8.5): a grid of steps (time) × notes (pitch).
 * Each pin plucks one comb tooth as the cylinder turns. A melody is a set of
 * pins; the room is fixed when the pins match the song.
 */

/** C major, C4..C5, plus D5 and E5 for a little extra range. */
export const NOTE_FREQS = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25];

export type Pin = [step: number, note: number];

export const pinKey = (step: number, note: number): string => `${step}:${note}`;

export function pinSet(pins: Pin[]): Set<string> {
  return new Set(pins.map(([s, n]) => pinKey(s, n)));
}

export function pinsMatch(placed: Set<string>, melody: Pin[]): boolean {
  const want = pinSet(melody);
  if (placed.size !== want.size) return false;
  for (const k of want) if (!placed.has(k)) return false;
  return true;
}

/** Notes that sound on each step, for playback. */
export function stepsToNotes(placed: Set<string>, steps: number): number[][] {
  const out: number[][] = Array.from({ length: steps }, () => []);
  for (const k of placed) {
    const [s, n] = k.split(':').map(Number);
    if (s >= 0 && s < steps) out[s].push(n);
  }
  for (const col of out) col.sort((a, b) => a - b);
  return out;
}

/** How many melody pins are in place, and how many extra pins there are. */
export function pinProgress(placed: Set<string>, melody: Pin[]): { right: number; extra: number; total: number } {
  const want = pinSet(melody);
  let right = 0;
  let extra = 0;
  for (const k of placed) {
    if (want.has(k)) right++;
    else extra++;
  }
  return { right, extra, total: want.size };
}

/** Write a simple melody as "step:note" pairs from a list of notes, one per step (-1 = rest). */
export function melodyFromNotes(notes: number[]): Pin[] {
  const out: Pin[] = [];
  notes.forEach((n, s) => {
    if (n >= 0) out.push([s, n]);
  });
  return out;
}
