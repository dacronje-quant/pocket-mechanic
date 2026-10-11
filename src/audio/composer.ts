/** Tuned steel comb teeth, scheduled on the audio clock rather than animation frames. */
import { ac, bus } from './engine';
import { composition, musicBeats, type Composition } from '../mechanism/composer';
import { NOTE_FREQS } from '../mechanism/pins';

export interface MusicPlayback { stop(): void; readonly beat: number; readonly ended: boolean }
export interface MusicTone { stop(): void }

export function musicBoxTone(note: number, at?: number, volume = 1): MusicTone {
  const ctx = ac(), dest = bus('music'), freq = NOTE_FREQS[note];
  if (!ctx || !dest || !freq) return { stop() {} };
  const start = Math.max(ctx.currentTime, at ?? ctx.currentTime), out = ctx.createGain();
  out.connect(dest);
  const oscillators = [1, 2, 4.02].map((ratio, i) => {
    const oscillator = ctx.createOscillator(), envelope = ctx.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = freq * ratio;
    const peak = [0.19, 0.045, 0.014][i] * volume;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + [0.85, 0.4, 0.18][i]);
    oscillator.connect(envelope).connect(out);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(start); oscillator.stop(start + 0.9);
    return oscillator;
  });
  let stopped = false;
  const cleanup = setTimeout(() => out.disconnect(), Math.max(0, (start - ctx.currentTime + 1) * 1000));
  return { stop() {
    if (stopped) return; stopped = true; clearTimeout(cleanup);
    // Disconnect scheduled notes as well as sounding ones, so Stop is immediate.
    out.disconnect(); for (const oscillator of oscillators) try { oscillator.stop(); } catch { /* already ended */ }
  } };
}

export function playComposition(value: Partial<Composition>, loop = false, beatSeconds?: number): MusicPlayback {
  const song = composition(value), beats = musicBeats(song), ctx = ac();
  const now = () => ctx?.currentTime ?? performance.now() / 1000;
  const start = now() + 0.025, seconds = typeof beatSeconds === 'number' && Number.isFinite(beatSeconds) && beatSeconds > 0 ? beatSeconds : 60 / song.bpm;
  let next = 0, stopped = false, timer: ReturnType<typeof setInterval> | undefined;
  const tones: Array<{ tone: MusicTone; until: number }> = [];
  const schedule = () => {
    if (stopped) return;
    const time = now();
    while (tones.length && tones[0].until < time) tones.shift();
    // A background tab may miss the scheduling window: skip old beats, never burst them.
    next = Math.max(next, Math.ceil((time - start - 0.05) / seconds));
    while ((loop || next < song.steps) && start + next * seconds < time + 0.12) {
      const at = start + next * seconds, notes = beats[next % song.steps];
      for (const note of notes) tones.push({ tone: musicBoxTone(note, at, 1 / Math.sqrt(Math.max(1, notes.length))), until: at + 1 });
      next++;
    }
    if (!loop && time > start + song.steps * seconds + 0.9) { stopped = true; clearInterval(timer); }
  };
  schedule(); timer = setInterval(schedule, 25);
  return {
    get beat() { return Math.max(0, Math.min(loop ? Infinity : song.steps - 1, Math.floor((now() - start) / seconds))) % song.steps; },
    get ended() { return stopped; },
    stop() { stopped = true; clearInterval(timer); tones.splice(0).forEach(({ tone }) => tone.stop()); },
  };
}

/** Collected songs keep their authored speed and can be stopped like a player's tune. */
export function playFoundTune(notes: number[], notesPerSecond: number): MusicPlayback {
  return playComposition({ steps: notes.length, pins: notes.flatMap((note, step) => note >= 0 ? [`${step}:${note}`] : []) }, false, 1 / Math.max(1, notesPerSecond));
}
