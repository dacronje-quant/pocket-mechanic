/**
 * Music that is the machine (GDD §23.2). Each object has a theme made of
 * layers: a broken machine plays a sparse version and every fixed room adds
 * an instrument, so players hear their progress. Unavailable recordings stay silent. Generated loops are crossfaded
 * so they never click, and heard through a low-pass filter that opens up as rooms are
 * fixed, so the generated music still tells the player their progress.
 */
import type { ThemeId } from '../content/types';
import { ac, audioFile, bus, isAudioReady, loadBuffer, whenAudioReady } from './engine';

type Scale = number[];
const MAJOR: Scale = [0, 2, 4, 5, 7, 9, 11];
const MINOR: Scale = [0, 2, 3, 5, 7, 8, 10];
const PENTA: Scale = [0, 2, 4, 7, 9];

export interface MusicTheme {
  bpm: number;
  root: number; // MIDI note
  scale: Scale;
  /** Chord roots as scale degrees, one per bar. */
  chords: number[];
  /** 16 steps per bar of melody (scale degrees, -1 rest), spanning the chord bars. */
  melody: number[];
  beatsPerBar: 3 | 4;
  bass: OscillatorType;
  lead: OscillatorType;
  /** Percussion flavour for the ticking layer. */
  perc: 'tick' | 'chug' | 'snap' | 'brush' | 'bell';
}

const T = (t: MusicTheme) => t;

export const THEMES: Record<ThemeId | 'festival' | 'title', MusicTheme> = {
  title: T({ bpm: 84, root: 60, scale: MAJOR, chords: [0, 5, 3, 4], melody: [4, -1, 2, -1, 4, 5, 4, -1, 2, -1, 0, 1, 2, -1, -1, -1], beatsPerBar: 4, bass: 'sine', lead: 'triangle', perc: 'tick' }),
  shop: T({ bpm: 80, root: 62, scale: MAJOR, chords: [0, 3, 4, 0], melody: [0, 2, 4, -1, 5, 4, 2, -1, 3, 2, 1, -1, 2, -1, -1, -1], beatsPerBar: 4, bass: 'sine', lead: 'triangle', perc: 'tick' }),
  clock: T({ bpm: 96, root: 60, scale: MAJOR, chords: [0, 4, 0, 4], melody: [7, 4, -1, 7, 4, -1, 5, 4, 3, 2, -1, 2, 4, 2, 0, -1], beatsPerBar: 3, bass: 'triangle', lead: 'triangle', perc: 'tick' }),
  musicbox: T({ bpm: 76, root: 72, scale: MAJOR, chords: [0, 4, 0, 4], melody: [2, 2, 4, -1, 2, 2, 4, -1, 2, 4, 7, 6, 5, 5, 4, -1], beatsPerBar: 3, bass: 'sine', lead: 'sine', perc: 'bell' }),
  train: T({ bpm: 120, root: 62, scale: MAJOR, chords: [0, 3, 4, 0], melody: [0, 2, 4, 4, 5, 4, 2, -1, 1, 3, 4, 3, 2, 1, 0, -1], beatsPerBar: 4, bass: 'square', lead: 'triangle', perc: 'chug' }),
  radio: T({ bpm: 108, root: 58, scale: MAJOR, chords: [0, 5, 1, 4], melody: [4, -1, 4, 5, 4, 2, -1, 0, 2, -1, 2, 4, 2, 0, -1, -1], beatsPerBar: 4, bass: 'triangle', lead: 'sawtooth', perc: 'brush' }),
  tea: T({ bpm: 126, root: 65, scale: MAJOR, chords: [0, 4, 0, 4], melody: [0, 2, 4, 2, 5, 4, 2, 0, 1, 3, 5, 3, 4, 2, 0, -1], beatsPerBar: 3, bass: 'sine', lead: 'triangle', perc: 'snap' }),
  bertie: T({ bpm: 116, root: 57, scale: MAJOR, chords: [0, 0, 3, 4], melody: [0, -1, 2, 4, 5, 4, 2, -1, 0, -1, 2, 4, 5, 4, 2, 0], beatsPerBar: 4, bass: 'square', lead: 'square', perc: 'snap' }),
  orrery: T({ bpm: 66, root: 64, scale: PENTA, chords: [0, 3, 1, 2], melody: [4, 7, 6, 5, 4, -1, 2, 4, 3, 2, 1, -1, 0, 2, 4, -1], beatsPerBar: 4, bass: 'sine', lead: 'sine', perc: 'bell' }),
  tower: T({ bpm: 100, root: 55, scale: MAJOR, chords: [0, 3, 4, 0], melody: [0, 0, 4, 4, 5, 5, 4, -1, 7, 7, 6, 6, 5, 5, 4, -1], beatsPerBar: 4, bass: 'triangle', lead: 'triangle', perc: 'tick' }),
  attic: T({ bpm: 72, root: 57, scale: MINOR, chords: [0, 5, 3, 4], melody: [0, -1, 2, 4, -1, 3, 2, -1, 0, -1, 4, 6, -1, 5, 4, -1], beatsPerBar: 4, bass: 'sine', lead: 'triangle', perc: 'tick' }),
  bench: T({ bpm: 104, root: 60, scale: PENTA, chords: [0, 2, 3, 1], melody: [0, 1, 2, -1, 3, 2, 1, -1, 2, 3, 4, -1, 3, -1, -1, -1], beatsPerBar: 4, bass: 'triangle', lead: 'triangle', perc: 'snap' }),
  home: T({ bpm: 92, root: 64, scale: MAJOR, chords: [0, 3, 4, 3], melody: [2, 4, 5, -1, 4, 2, 0, -1, 1, 2, 4, -1, 2, -1, -1, -1], beatsPerBar: 4, bass: 'sine', lead: 'triangle', perc: 'tick' }),
  festival: T({ bpm: 112, root: 60, scale: MAJOR, chords: [0, 3, 4, 0], melody: [0, 0, 4, 4, 5, 5, 4, -1, 3, 3, 2, 2, 1, 1, 0, -1], beatsPerBar: 4, bass: 'triangle', lead: 'triangle', perc: 'snap' }),
};

let current: { id: string; theme: MusicTheme } | null = null;
let cancelStart: (() => void) | null = null;
/** A generated loop playing: crossfaded repeats through a low-pass filter that opens with progress. */
let file: { buf: AudioBuffer; filter: BiquadFilterNode; out: GainNode; voices: Array<{ src: AudioBufferSourceNode; gain: GainNode }>; timer: ReturnType<typeof setTimeout> | null } | null = null;
let fileProgress = 1;
let fileWindDown = false;
const XFADE = 1.6;

function note(c: AudioContext, dest: AudioNode, freq: number, t: number, len: number, type: OscillatorType, peak: number): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + len + 0.05);
}

function stopFile(): void {
  if (!file) return;
  const f = file;
  file = null;
  if (f.timer) clearTimeout(f.timer);
  const c = ac();
  const t = c?.currentTime ?? 0;
  try {
    f.out.gain.setTargetAtTime(0, t, 0.15);
  } catch {
    /* context gone */
  }
  setTimeout(() => {
    for (const v of f.voices) {
      try {
        v.src.stop();
      } catch {
        /* already stopped */
      }
    }
    f.out.disconnect();
  }, 700);
}

/** A broken machine sounds muffled and far away; every fixed room opens the sound up (GDD §23.2). */
function applyFileProgress(): void {
  const c = ac();
  if (!file || !c) return;
  const p = Math.max(0, Math.min(1, fileProgress));
  const top = fileWindDown ? 2600 : 18000;
  file.filter.frequency.setTargetAtTime(Math.min(top, 450 * Math.pow(40, p)), c.currentTime, 0.4);
  file.out.gain.setTargetAtTime((fileWindDown ? 0.55 : 0.75) + p * 0.25, c.currentTime, 0.4);
}

/** Start one repeat of the loop at `when`, fading in, and schedule the next one to overlap it. */
function loopFrom(when: number): void {
  const c = ac();
  if (!file || !c) return;
  const f = file;
  const src = c.createBufferSource();
  src.buffer = f.buf;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(1, when + XFADE);
  const end = when + f.buf.duration;
  gain.gain.setValueAtTime(1, end - XFADE);
  gain.gain.linearRampToValueAtTime(0, end);
  src.connect(gain).connect(f.filter);
  src.start(when);
  src.stop(end + 0.05);
  f.voices.push({ src, gain });
  src.onended = () => {
    f.voices = f.voices.filter((v) => v.src !== src);
    gain.disconnect();
  };
  const next = end - XFADE;
  f.timer = setTimeout(() => {
    if (file === f) loopFrom(next);
  }, Math.max(0, (next - c.currentTime - 0.5) * 1000));
}

function startFile(buf: AudioBuffer, dest: AudioNode): void {
  const c = ac();
  if (!c) return;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.5;
  const out = c.createGain();
  out.gain.value = 0;
  filter.connect(out).connect(dest);
  file = { buf, filter, out, voices: [], timer: null };
  applyFileProgress();
  // a loop shorter than two crossfades just plays straight through on repeat
  if (buf.duration < XFADE * 3) {
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(filter);
    src.start();
    file.voices.push({ src, gain: out });
    return;
  }
  loopFrom(c.currentTime + 0.05);
}

/** Play a theme. `progress` (0..1) decides how many layers are back. */
export function playMusic(id: keyof typeof THEMES, progress = 1, windDown = false): void {
  if (current?.id === id) {
    fileProgress = progress;
    fileWindDown = windDown;
    applyFileProgress();
    return;
  }
  stopMusic();
  current = { id, theme: THEMES[id] };
  if (!isAudioReady()) {
    cancelStart = whenAudioReady(() => {
      cancelStart = null;
      if (current?.id !== id) return;
      current = null;
      playMusic(id, progress, windDown);
    });
    return;
  }
  fileProgress = progress;
  fileWindDown = windDown;
  const url = audioFile('music', id);
  const c = ac();
  if (url && c) {
    const dest = bus('music');
    void loadBuffer(url).then((buf) => {
      if (current?.id !== id) return;
      if (!buf || !dest) return;
      try {
        startFile(buf, dest);
      } catch {
        /* unavailable recording: stay silent */
      }
    }).catch(() => undefined);
    return;
  }
}

export function setMusicProgress(progress: number): void {
  fileProgress = progress;
  applyFileProgress();
}

export function stopMusic(): void {
  cancelStart?.();
  cancelStart = null;
  stopFile();
  current = null;
}

/** Play a short melody once (music boxes, the Nook's mini music box, the Big Fix). */
export function playMelody(notes: number[], tempo = 3, kind: OscillatorType = 'triangle'): number {
  const c = ac();
  const dest = bus('sfx');
  if (!c || !dest) return 0;
  const freqs = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25];
  const t0 = c.currentTime + 0.05;
  notes.forEach((n, i) => {
    if (n < 0) return;
    const t = t0 + i / tempo;
    note(c, dest, freqs[n] ?? 440, t, 0.6, kind, 0.12);
    note(c, dest, (freqs[n] ?? 440) * 2, t, 0.3, 'sine', 0.03);
  });
  return notes.length / tempo;
}
