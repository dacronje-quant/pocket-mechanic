import { NOTE_FREQS } from './pins';

export const MUSIC_STEPS = 16;
export const MUSIC_NOTES = NOTE_FREQS.length;
export const NOTE_NAMES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
export interface Composition { pins: string[]; bpm: number; steps: number }
export interface MusicDraft extends Composition { cursor: number }

export function musicTempo(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(40, Math.min(180, Math.round(value))) : 100;
}

/** Keep old Pin Garden songs, reject malformed pins, and preserve every chord. */
export function composition(value?: Partial<Composition>): Composition {
  const steps = typeof value?.steps === 'number' && Number.isFinite(value.steps) ? Math.max(1, Math.min(32, Math.round(value.steps))) : MUSIC_STEPS;
  const pins = new Set<string>();
  if (Array.isArray(value?.pins)) for (const pin of value.pins) {
    if (typeof pin !== 'string' || !/^\d+:\d+$/.test(pin)) continue;
    const [step, note] = pin.split(':').map(Number);
    if (step < steps && note < MUSIC_NOTES) pins.add(`${step}:${note}`);
  }
  return { pins: [...pins].sort((a, b) => {
    const [as, an] = a.split(':').map(Number), [bs, bn] = b.split(':').map(Number);
    return as - bs || an - bn;
  }), bpm: musicTempo(value?.bpm), steps };
}

export function musicDraft(value?: Partial<MusicDraft>): MusicDraft {
  const song = composition(value);
  const cursor = typeof value?.cursor === 'number' && Number.isFinite(value.cursor) ? Math.max(0, Math.min(song.steps - 1, Math.floor(value.cursor))) : 0;
  return { ...song, cursor };
}

export function musicBeats(value: Partial<Composition>): number[][] {
  const song = composition(value), beats: number[][] = Array.from({ length: song.steps }, () => []);
  for (const pin of song.pins) {
    const [step, note] = pin.split(':').map(Number);
    beats[step].push(note);
  }
  return beats;
}

/** A keyboard press writes one note then moves on; grid editing can add chords. */
export function writeMusicNote(value: MusicDraft, note: number | null): MusicDraft {
  const draft = musicDraft(value), pins = draft.pins.filter(pin => Number(pin.split(':')[0]) !== draft.cursor);
  if (note !== null && Number.isInteger(note) && note >= 0 && note < MUSIC_NOTES) pins.push(`${draft.cursor}:${note}`);
  return { ...composition({ ...draft, pins }), cursor: (draft.cursor + 1) % draft.steps };
}

export function toggleMusicPin(value: MusicDraft, step: number, note: number): MusicDraft {
  const draft = musicDraft(value);
  if (!Number.isInteger(step) || step < 0 || step >= draft.steps || !Number.isInteger(note) || note < 0 || note >= MUSIC_NOTES) return draft;
  const pins = new Set(draft.pins), key = `${step}:${note}`;
  if (pins.has(key)) pins.delete(key); else pins.add(key);
  return { ...composition({ ...draft, pins: [...pins] }), cursor: step };
}
