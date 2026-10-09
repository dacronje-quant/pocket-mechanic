/**
 * Synthesised placeholder sound effects (Web Audio, no files to download).
 * The GDD calls for recorded antique-mechanism foley; these stand in until the
 * real recordings exist, and keep the same function names so swapping is easy.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from the first pointer event so mobile browsers allow sound. */
export function unlockAudio(): void {
  ac();
}

export function setMuted(m: boolean): void {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.7;
}
export function isMuted(): boolean {
  return muted;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(freq: number, type: OscillatorType, peak: number, attack: number, decay: number, delay = 0, slideTo?: number): void {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + attack + decay);
  env(g, t, peak, attack, decay);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

function noise(peak: number, decay: number, filterFreq: number, delay = 0, q = 1): void {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const len = Math.ceil(c.sampleRate * (decay + 0.02));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  f.Q.value = q;
  const g = c.createGain();
  env(g, t, peak, 0.002, decay);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

/** The signature CLUNK of a correct fit: low thump + bright metallic click. */
export function clunk(): void {
  tone(140, 'sine', 0.9, 0.004, 0.18, 0, 60);
  noise(0.5, 0.06, 2600, 0, 3);
  tone(1850, 'triangle', 0.15, 0.002, 0.12, 0.01);
}

export function tick(pitch = 1): void {
  noise(0.25, 0.025, 3200 * pitch, 0, 6);
  tone(2400 * pitch, 'square', 0.03, 0.001, 0.02);
}

/** Wrong part: a gentle "nuh-uh" boing. */
export function nuhUh(): void {
  tone(330, 'sine', 0.35, 0.01, 0.12, 0, 260);
  tone(260, 'sine', 0.35, 0.01, 0.16, 0.14, 200);
}

export function boing(): void {
  tone(180, 'sine', 0.4, 0.005, 0.35, 0, 520);
}

export function ding(freq = 1320): void {
  tone(freq, 'sine', 0.35, 0.002, 1.1);
  tone(freq * 2.76, 'sine', 0.08, 0.002, 0.6);
}

export function sparkle(): void {
  [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, 'sine', 0.12, 0.004, 0.25, i * 0.06));
}

export function whirr(): void {
  tone(500, 'sawtooth', 0.05, 0.02, 0.5, 0, 900);
}

export function pickUp(): void {
  tone(600, 'triangle', 0.12, 0.004, 0.08, 0, 900);
}

export function chirp(): void {
  tone(900, 'sine', 0.2, 0.005, 0.07, 0, 1400);
  tone(1200, 'sine', 0.2, 0.005, 0.09, 0.09, 1800);
}

export function click(): void {
  noise(0.3, 0.02, 4000, 0, 4);
}

/** Room-fixed fanfare in C major. */
export function fanfare(): void {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 'triangle', 0.22, 0.01, 0.4, i * 0.12));
  tone(1047, 'sine', 0.18, 0.01, 1.2, 0.5);
}

/** Short haptic thud on Android (ignored where unsupported). */
export function buzz(ms = 25): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}
