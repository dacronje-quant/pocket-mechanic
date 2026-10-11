/**
 * Recorded mechanical foley; unavailable recordings stay silent. Musical
 * puzzle notes retain their exact pitch/timing; robot chips are recorded.
 * "Soft Clockwork" (GDD §23.4) takes the edge off bells, whistles and sparks.
 */
import { ac, bus, loadBuffer, readyBuffer, soundFiles } from './engine';
import { robotCue } from '../content/soundCues';

let soft = false;
export function setSoft(on: boolean): void {
  soft = on;
}

export { unlockAudio, isMuted } from './engine';

let effectScope: { dest: AudioNode; sources: Set<AudioScheduledSourceNode> } | null = null;

/** Own one object's sounds so replay and leaving its scene stop the old performance. */
export function effectPlayback(): { play: (cue: () => void) => void; stop: () => void } {
  const c = ac(), dest = bus('sfx');
  const gain = c?.createGain();
  if (gain && dest) gain.connect(dest);
  const sources = new Set<AudioScheduledSourceNode>();
  let stopped = false;
  return {
    play(cue) {
      if (stopped || !gain || !dest) return;
      const previous = effectScope;
      effectScope = { dest: gain, sources };
      try { cue(); } finally { effectScope = previous; }
    },
    stop() {
      if (stopped) return;
      stopped = true;
      sources.forEach(source => { try { source.stop(); } catch { /* already ended */ } source.disconnect(); });
      sources.clear();
      gain?.disconnect();
    },
  };
}

function track(source: AudioScheduledSourceNode): void {
  if (!effectScope) return;
  const sources = effectScope.sources;
  sources.add(source);
  source.addEventListener('ended', () => sources.delete(source), { once: true });
}

function out(): { c: AudioContext; dest: AudioNode } | null {
  const c = ac();
  const dest = effectScope?.dest ?? bus('sfx');
  if (!c || !dest) return null;
  return { c, dest };
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

/** A sharp sound: quieter and slower to start under Soft Clockwork. */
const sharp = (peak: number) => (soft ? peak * 0.35 : peak);

const variants = new Map<string, number>();
/** Never play a click late: cold/missing recordings stay silent. */
function recorded(id: string, options: { pitch?: number; length?: number; repeat?: number; spacing?: number; level?: number } = {}): boolean {
  const files = soundFiles(id);
  const c = ac();
  const dest = effectScope?.dest ?? bus('sfx');
  if (!files.length || !c || !dest) return false;
  const index = variants.get(id) ?? 0;
  const file = files[index % files.length];
  const buffer = readyBuffer(file);
  if (!buffer) {
    void loadBuffer(file);
    return false;
  }
  variants.set(id, index + 1);
  const pitch = Math.max(0.25, Math.min(4, options.pitch ?? 1));
  const length = Math.max(0, options.length ?? buffer.duration / pitch);
  const repeat = Math.max(0, Math.min(32, Math.floor(options.repeat ?? 1)));
  if (!length || !repeat) return true;
  for (let i = 0; i < repeat; i++) {
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = pitch;
    src.loop = length > buffer.duration / pitch;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = soft ? 2600 : 18000;
    filter.Q.value = 0.5;
    const gain = c.createGain();
    const t = c.currentTime + i * (options.spacing ?? length);
    const attack = Math.min(soft ? 0.03 : 0.003, length / 3);
    const release = Math.min(0.035, length / 3);
    const peak = (soft ? 0.35 : 0.8) * Math.max(0, options.level ?? 1);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.setValueAtTime(peak, t + length - release);
    gain.gain.linearRampToValueAtTime(0, t + length);
    src.connect(filter).connect(gain).connect(dest);
    track(src);
    src.onended = () => { src.disconnect(); filter.disconnect(); gain.disconnect(); };
    src.start(t);
    src.stop(t + length);
  }
  return true;
}

/** Play a ready bespoke recording in full; null means the recording is unavailable. */
export function recordedEffect(id: string): number | null {
  const file = soundFiles(id)[0];
  if (!file) return null;
  const buffer = readyBuffer(file);
  if (!buffer) { void loadBuffer(file); return null; }
  return recorded(id) ? buffer.duration : null;
}

export function tone(freq: number, type: OscillatorType, peak: number, attack: number, decay: number, delay = 0, slideTo?: number): void {
  const o0 = out();
  if (!o0) return;
  const { c, dest } = o0;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + attack + decay);
  env(g, t, peak, attack, decay);
  o.connect(g).connect(dest);
  track(o);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
    const len = c.sampleRate * 2;
    noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

export function noise(peak: number, decay: number, filterFreq: number, delay = 0, q = 1, type: BiquadFilterType = 'bandpass', attack = 0.002, sweepTo?: number): void {
  const o0 = out();
  if (!o0) return;
  const { c, dest } = o0;
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(filterFreq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay);
  f.Q.value = q;
  const g = c.createGain();
  env(g, t, peak, attack, decay);
  src.connect(f).connect(g).connect(dest);
  track(src);
  src.start(t, Math.random());
  src.stop(t + attack + decay + 0.05);
}

// ───────────────────────────── the core palette ─────────────────────────────

/** The signature CLUNK of a correct fit: low thump + bright metallic click. */
export function clunk(): void {
  recorded('clunk');
}

export function tick(pitch = 1): void {
  recorded('tick', { pitch });
}

export function tock(): void {
  recorded('tock');
}

/** Wrong part: a gentle "nuh-uh" boing. */
export function nuhUh(): void {
  recorded('nuhUh');
}

export function boing(pitch = 1): void {
  recorded('boing', { pitch });
}

export function ding(freq = 1320): void {
  recorded('ding', { pitch: freq / 1320 });
}

export function dingDong(): void {
  recorded('dingDong');
}

export function bong(): void {
  recorded('bong');
}

export function sparkle(): void {
  recorded('sparkle');
}

export function whirr(): void {
  recorded('whirr');
}

export function pickUp(): void {
  recorded('pickUp');
}

export function drop(): void {
  recorded('drop');
}

export function chirp(): void {
  recorded('chirp');
}

export function click(): void {
  recorded('click');
}

export function toggle(on: boolean): void {
  recorded(on ? 'toggleOn' : 'toggleOff');
}

/** Room-fixed fanfare in C major. */
export function fanfare(): void {
  recorded('fanfare');
}

export function bigFanfare(): void {
  recorded('bigFanfare');
}

/** A little musical sting in a room's key. */
export function sting(root = 523): void {
  recorded('fanfare', { pitch: root / 523, length: 0.6 });
}

// ───────────────────────────── materials & machines ─────────────────────────────

export function squeak(pitch = 1): void {
  recorded('squeak', { pitch });
}

export function purr(): void {
  recorded('purr');
}

export function oil(): void {
  recorded('oil');
}

export function ratchet(n = 1): void {
  recorded('ratchet', { repeat: n, spacing: 0.06, length: 0.055 });
}

export function sproing(): void {
  recorded('sproing');
}

export function whoosh(): void {
  recorded('whoosh');
}

export function hiss(len = 0.6): void {
  recorded('hiss', { length: len });
}

export function pfft(): void {
  recorded('pfft');
}

export function drip(): void {
  recorded('drip');
}

export function splash(): void {
  recorded('splash');
}

export function zap(): void {
  recorded('zap');
}

export function crackle(): void {
  recorded('crackle');
}

export function hum(freq = 110, len = 0.8): void {
  recorded('instrument-hum', { pitch: freq / 220, length: len });
}

export function staticBurst(level = 1, len = 0.25): void {
  recorded('staticBurst', { level, length: len });
}

export function chug(): void {
  recorded('chug');
}

export function whistle(freq = 880, len = 0.8): void {
  recorded('instrument-whistle', { pitch: freq / 880, length: len });
}

export function horn(): void { recorded('instrument-horn'); }

export function pop(): void {
  recorded('pop');
}

export function marble(): void {
  recorded('marble');
}

export function punch(): void {
  recorded('punch');
}

export function cuckoo(n = 2): void {
  recorded('cuckoo', { repeat: n, spacing: 0.55, length: 0.52 });
}

export function flap(): void {
  recorded('flap');
}

export function cheer(): void {
  recorded('cheer');
}

export function thunder(): void {
  recorded('thunder');
}

export function giggle(): void {
  recorded('giggle');
}

export function yawn(): void {
  recorded('yawn');
}

export function swish(): void {
  recorded('swish');
}

export function coin(): void {
  recorded('coin');
}

export function note(freq: number, kind: 'pluck' | 'chime' | 'pipe' | 'piano' = 'pluck', len = 0.6): void {
  if (kind === 'pluck') {
    tone(freq, 'triangle', 0.22, 0.002, len);
    tone(freq * 2, 'sine', 0.06, 0.002, len * 0.5);
  } else if (kind === 'chime') {
    tone(freq, 'sine', sharp(0.22), 0.002, len * 1.6);
    tone(freq * 3.01, 'sine', sharp(0.05), 0.002, len);
  } else if (kind === 'pipe') {
    tone(freq, 'sine', 0.18, 0.05, len);
    noise(0.03, len, freq * 2, 0, 10);
  } else {
    tone(freq, 'triangle', 0.25, 0.003, len);
    tone(freq * 2, 'triangle', 0.05, 0.003, len * 0.6);
  }
}

/** Kip's voice: beeps, whirs and chimes; the voice chip changes the flavour. */
export function beeps(text: string, chip = 'voice-classic', base = 1): void {
  const syll = Math.max(2, Math.min(7, text.replace(/[^aeiouy]/gi, '').length));
  recorded(robotCue(chip), { pitch: base, length: .4 + syll * .11 });
}

/** Short haptic thud on Android (ignored where unsupported). */
export function buzz(ms = 25): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}
