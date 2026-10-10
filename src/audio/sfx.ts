/**
 * Recorded mechanical foley with immediate synthesized fallbacks. Musical
 * puzzle notes and configurable robot beeps retain their exact pitch/timing.
 * "Soft Clockwork" (GDD §23.4) takes the edge off bells, whistles and sparks.
 */
import { ac, bus, loadBuffer, readyBuffer, soundFiles } from './engine';

let soft = false;
export function setSoft(on: boolean): void {
  soft = on;
}

export { unlockAudio, isMuted } from './engine';

function out(): { c: AudioContext; dest: AudioNode } | null {
  const c = ac();
  const dest = bus('sfx');
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
const sharpAttack = (a: number) => (soft ? Math.max(a, 0.03) : a);

const variants = new Map<string, number>();
/** Never play a click late: cold/missing recordings use the synth immediately. */
function recorded(id: string, options: { pitch?: number; length?: number; repeat?: number; spacing?: number; level?: number } = {}): boolean {
  const files = soundFiles(id);
  const c = ac();
  const dest = bus('sfx');
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
    src.onended = () => { src.disconnect(); filter.disconnect(); gain.disconnect(); };
    src.start(t);
    src.stop(t + length);
  }
  return true;
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
  src.start(t, Math.random());
  src.stop(t + attack + decay + 0.05);
}

// ───────────────────────────── the core palette ─────────────────────────────

/** The signature CLUNK of a correct fit: low thump + bright metallic click. */
export function clunk(): void {
  if (recorded('clunk')) return;
  tone(140, 'sine', 0.9, 0.004, 0.18, 0, 60);
  noise(sharp(0.5), 0.06, 2600, 0, 3);
  tone(1850, 'triangle', sharp(0.15), 0.002, 0.12, 0.01);
}

export function tick(pitch = 1): void {
  if (recorded('tick', { pitch })) return;
  noise(sharp(0.25), 0.025, 3200 * pitch, 0, 6);
  tone(2400 * pitch, 'square', sharp(0.03), 0.001, 0.02);
}

export function tock(): void {
  if (recorded('tock')) return;
  tone(420, 'triangle', 0.3, 0.003, 0.09);
  noise(0.15, 0.04, 900, 0, 4);
}

/** Wrong part: a gentle "nuh-uh" boing. */
export function nuhUh(): void {
  if (recorded('nuhUh')) return;
  tone(330, 'sine', 0.35, 0.01, 0.12, 0, 260);
  tone(260, 'sine', 0.35, 0.01, 0.16, 0.14, 200);
}

export function boing(pitch = 1): void {
  if (recorded('boing', { pitch })) return;
  tone(180 * pitch, 'sine', 0.4, 0.005, 0.35, 0, 520 * pitch);
}

export function ding(freq = 1320): void {
  if (freq === 1320 && recorded('ding')) return;
  tone(freq, 'sine', sharp(0.35), sharpAttack(0.002), 1.1);
  tone(freq * 2.76, 'sine', sharp(0.08), sharpAttack(0.002), 0.6);
}

export function dingDong(): void {
  if (recorded('dingDong')) return;
  ding(880);
  setTimeout(() => ding(698), 380);
}

export function bong(): void {
  if (recorded('bong')) return;
  tone(110, 'sine', 0.7, 0.01, 3.2);
  tone(220, 'sine', sharp(0.3), 0.01, 2.6);
  tone(331, 'sine', sharp(0.12), 0.01, 2.2);
  tone(523, 'sine', sharp(0.05), 0.01, 1.4);
}

export function sparkle(): void {
  if (recorded('sparkle')) return;
  [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, 'sine', sharp(0.12), 0.004, 0.25, i * 0.06));
}

export function whirr(): void {
  if (recorded('whirr')) return;
  tone(500, 'sawtooth', 0.05, 0.02, 0.5, 0, 900);
}

export function pickUp(): void {
  if (recorded('pickUp')) return;
  tone(600, 'triangle', 0.12, 0.004, 0.08, 0, 900);
}

export function drop(): void {
  if (recorded('drop')) return;
  tone(500, 'triangle', 0.1, 0.004, 0.1, 0, 300);
}

export function chirp(): void {
  if (recorded('chirp')) return;
  tone(900, 'sine', 0.2, 0.005, 0.07, 0, 1400);
  tone(1200, 'sine', 0.2, 0.005, 0.09, 0.09, 1800);
}

export function click(): void {
  if (recorded('click')) return;
  noise(sharp(0.3), 0.02, 4000, 0, 4);
}

export function toggle(on: boolean): void {
  if (recorded(on ? 'toggleOn' : 'toggleOff')) return;
  noise(sharp(0.25), 0.02, on ? 4500 : 3000, 0, 5);
  tone(on ? 1600 : 1100, 'square', sharp(0.03), 0.001, 0.03);
}

/** Room-fixed fanfare in C major. */
export function fanfare(): void {
  if (recorded('fanfare')) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 'triangle', 0.22, 0.01, 0.4, i * 0.12));
  tone(1047, 'sine', 0.18, 0.01, 1.2, 0.5);
}

export function bigFanfare(): void {
  if (recorded('bigFanfare')) return;
  [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 'triangle', 0.2, 0.01, 0.5, i * 0.11));
  [523, 659, 784].forEach((f) => tone(f, 'sine', 0.12, 0.02, 2, 0.8));
}

/** A little musical sting in a room's key. */
export function sting(root = 523): void {
  tone(root, 'triangle', 0.15, 0.01, 0.25);
  tone(root * 1.5, 'triangle', 0.12, 0.01, 0.35, 0.09);
}

// ───────────────────────────── materials & machines ─────────────────────────────

export function squeak(pitch = 1): void {
  if (recorded('squeak', { pitch })) return;
  tone(1300 * pitch, 'sawtooth', 0.06, 0.02, 0.18, 0, 1900 * pitch);
  tone(1700 * pitch, 'sawtooth', 0.04, 0.02, 0.14, 0.12, 1200 * pitch);
}

export function purr(): void {
  if (recorded('purr')) return;
  for (let i = 0; i < 6; i++) tone(55 + (i % 2) * 6, 'sawtooth', 0.06, 0.04, 0.16, i * 0.16);
}

export function oil(): void {
  if (recorded('oil')) return;
  noise(0.2, 0.12, 1800, 0, 2, 'bandpass', 0.01, 600);
  tone(700, 'sine', 0.08, 0.01, 0.15, 0.05, 350);
}

export function ratchet(n = 1): void {
  if (recorded('ratchet', { repeat: n, spacing: 0.06, length: 0.055 })) return;
  for (let i = 0; i < n; i++) {
    noise(sharp(0.3), 0.018, 3500, i * 0.06, 8);
    tone(1900, 'square', sharp(0.03), 0.001, 0.015, i * 0.06);
  }
}

export function sproing(): void {
  if (recorded('sproing')) return;
  tone(220, 'sine', 0.35, 0.005, 0.5, 0, 880);
  tone(330, 'triangle', 0.1, 0.005, 0.4, 0.02, 990);
}

export function whoosh(): void {
  if (recorded('whoosh')) return;
  noise(0.35, 0.45, 600, 0, 1.2, 'bandpass', 0.08, 2400);
}

export function hiss(len = 0.6): void {
  if (recorded('hiss', { length: len })) return;
  noise(sharp(0.22), len, 5000, 0, 0.7, 'highpass', 0.05);
}

export function pfft(): void {
  if (recorded('pfft')) return;
  noise(0.3, 0.35, 2500, 0, 1, 'bandpass', 0.01, 800);
}

export function drip(): void {
  if (recorded('drip')) return;
  tone(1200, 'sine', 0.15, 0.002, 0.08, 0, 2400);
}

export function splash(): void {
  if (recorded('splash')) return;
  noise(0.35, 0.3, 1500, 0, 0.8, 'lowpass', 0.005, 400);
}

export function zap(): void {
  if (recorded('zap')) return;
  noise(sharp(0.3), 0.08, 6000, 0, 2, 'highpass');
  tone(90, 'sawtooth', sharp(0.12), 0.002, 0.12);
}

export function crackle(): void {
  if (recorded('crackle')) return;
  for (let i = 0; i < 5; i++) noise(sharp(0.12), 0.015, 4000 + Math.random() * 3000, i * (0.03 + Math.random() * 0.05), 6);
}

export function hum(freq = 110, len = 0.8): void {
  tone(freq, 'sine', 0.12, 0.08, len);
  tone(freq * 2, 'sine', 0.05, 0.08, len);
}

export function staticBurst(level = 1, len = 0.25): void {
  if (recorded('staticBurst', { level, length: len })) return;
  noise(0.18 * level, len, 3000, 0, 0.5, 'bandpass', 0.01);
}

export function chug(): void {
  if (recorded('chug')) return;
  noise(0.3, 0.09, 700, 0, 2);
  noise(0.22, 0.09, 700, 0.18, 2);
}

export function whistle(freq = 880, len = 0.8): void {
  tone(freq, 'sine', sharp(0.22), sharpAttack(0.04), len);
  tone(freq * 1.01, 'sine', sharp(0.08), sharpAttack(0.04), len);
  noise(sharp(0.06), len, freq * 2, 0, 8);
}

export function pop(): void {
  if (recorded('pop')) return;
  tone(soft ? 300 : 600, 'sine', soft ? 0.2 : 0.4, 0.002, 0.12, 0, 120);
  noise(sharp(0.25), 0.05, 2000, 0, 2);
}

export function marble(): void {
  if (recorded('marble')) return;
  for (let i = 0; i < 6; i++) tone(2000 + i * 120, 'sine', 0.03, 0.002, 0.03, i * 0.05);
}

export function punch(): void {
  if (recorded('punch')) return;
  noise(0.35, 0.035, 2200, 0, 3);
  tone(300, 'square', 0.06, 0.001, 0.04);
}

export function cuckoo(n = 2): void {
  if (recorded('cuckoo', { repeat: n, spacing: 0.55, length: 0.52 })) return;
  for (let i = 0; i < n; i++) {
    tone(784, 'sine', 0.3, 0.02, 0.18, i * 0.55);
    tone(622, 'sine', 0.3, 0.02, 0.28, i * 0.55 + 0.22);
  }
}

export function flap(): void {
  if (recorded('flap')) return;
  for (let i = 0; i < 4; i++) noise(0.18, 0.06, 900, i * 0.09, 1.5, 'lowpass');
}

export function cheer(): void {
  if (recorded('cheer')) return;
  noise(0.2, 1.2, 1200, 0, 0.6, 'bandpass', 0.15);
  [523, 659, 784].forEach((f, i) => tone(f, 'triangle', 0.05, 0.05, 0.6, 0.1 + i * 0.1));
}

export function thunder(): void {
  if (recorded('thunder')) return;
  noise(soft ? 0.2 : 0.5, 2.2, 160, 0, 0.6, 'lowpass', 0.05, 60);
  noise(soft ? 0.1 : 0.25, 0.3, 900, 0.05, 1, 'lowpass');
}

export function giggle(): void {
  if (recorded('giggle')) return;
  for (let i = 0; i < 7; i++) tick(1.4 + (i % 2) * 0.2);
}

export function yawn(): void {
  if (recorded('yawn')) return;
  tone(500, 'sine', 0.15, 0.2, 0.7, 0, 260);
}

export function swish(): void {
  if (recorded('swish')) return;
  noise(0.15, 0.18, 1800, 0, 1, 'bandpass', 0.03, 3600);
}

export function coin(): void {
  if (recorded('coin')) return;
  tone(1568, 'square', sharp(0.08), 0.002, 0.08);
  tone(2093, 'square', sharp(0.08), 0.002, 0.25, 0.07);
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
  const kinds: Record<string, OscillatorType> = {
    'voice-classic': 'sine',
    'voice-chirpy': 'triangle',
    'voice-musical': 'sine',
    'voice-bubbly': 'sine',
    'voice-retro': 'square',
    'voice-musicbox': 'triangle',
  };
  const scale = [1, 1.125, 1.25, 1.5, 1.68, 2];
  for (let i = 0; i < syll; i++) {
    const f = 700 * base * scale[(i * 7 + text.length) % scale.length];
    const t = i * 0.11;
    if (chip === 'voice-bubbly') tone(f, 'sine', 0.13, 0.005, 0.09, t, f * 1.6);
    else if (chip === 'voice-musicbox') note(f, 'chime', 0.25);
    else tone(f, kinds[chip] ?? 'sine', chip === 'voice-retro' ? 0.05 : 0.14, 0.005, 0.08, t, chip === 'voice-chirpy' ? f * 1.4 : undefined);
  }
}

/** Short haptic thud on Android (ignored where unsupported). */
export function buzz(ms = 25): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}
