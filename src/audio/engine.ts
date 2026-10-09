/**
 * One shared Web Audio context with three buses (sound effects, music,
 * voices) whose volumes follow the grown-up settings. Mobile browsers only
 * start audio from a tap, so scenes call unlockAudio() on the first pointer.
 */

let ctx: AudioContext | null = null;
let unlocked = false;
const onUnlock: Array<() => void> = [];

/** Run something once sound is allowed (after the first tap). */
export function whenUnlocked(fn: () => void): void {
  if (unlocked) fn();
  else onUnlock.push(fn);
}
let master: GainNode | null = null;
const buses: Partial<Record<'sfx' | 'music' | 'voice', GainNode>> = {};
const levels = { master: 1, sfx: 0.8, music: 0.5, voice: 0.9, muted: false };

export function ac(): AudioContext | null {
  if (!unlocked) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.connect(ctx.destination);
      for (const k of ['sfx', 'music', 'voice'] as const) {
        const g = ctx.createGain();
        g.connect(master);
        buses[k] = g;
      }
      applyLevels();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function bus(name: 'sfx' | 'music' | 'voice'): GainNode | null {
  if (!ac()) return null;
  return buses[name] ?? null;
}

function applyLevels(): void {
  if (!master) return;
  master.gain.value = levels.muted ? 0 : levels.master;
  if (buses.sfx) buses.sfx.gain.value = levels.sfx;
  if (buses.music) buses.music.gain.value = levels.music;
  if (buses.voice) buses.voice.gain.value = levels.voice;
}

export function setLevels(l: Partial<typeof levels>): void {
  Object.assign(levels, l);
  applyLevels();
}

export function isMuted(): boolean {
  return levels.muted;
}

export function voiceLevel(): number {
  return levels.muted ? 0 : levels.voice;
}

/** Call from the first pointer event so mobile browsers allow sound. */
export function unlockAudio(): void {
  if (unlocked) {
    ac();
    return;
  }
  unlocked = true;
  ac();
  for (const fn of onUnlock.splice(0)) fn();
}

// ── generated audio files (Gemini voices / Lyria music), if the build has them ──

export interface AudioManifest {
  voice: Record<string, string>;
  music: Record<string, string>;
}

let manifest: AudioManifest = { voice: {}, music: {} };

export async function loadManifest(): Promise<void> {
  try {
    const res = await fetch('./audio/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const m = (await res.json()) as Partial<AudioManifest>;
    manifest = { voice: m.voice ?? {}, music: m.music ?? {} };
  } catch {
    /* no generated audio: device speech and synthesized music are used instead */
  }
}

export function audioFile(kind: 'voice' | 'music', id: string): string | undefined {
  return manifest[kind][id];
}

const buffers = new Map<string, Promise<AudioBuffer | null>>();

export function loadBuffer(url: string): Promise<AudioBuffer | null> {
  let p = buffers.get(url);
  if (!p) {
    p = (async () => {
      try {
        const c = ac();
        if (!c) return null;
        const res = await fetch(`./audio/${url}`);
        if (!res.ok) return null;
        return await c.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    buffers.set(url, p);
  }
  return p;
}
