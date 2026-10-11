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
    if (ctx.state === 'suspended') Promise.resolve(ctx.resume()).catch(() => undefined); // autoplay denied: carry on silently
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

// ── generated audio files, if the build has them ──

export interface AudioManifest {
  voice: Record<string, string>;
  music: Record<string, string>;
  sfx: Record<string, string[]>;
}

let manifest: AudioManifest = { voice: {}, music: {}, sfx: {} };

export async function loadManifest(): Promise<void> {
  try {
    const res = await fetch('./audio/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const m = (await res.json()) as Partial<AudioManifest>;
    manifest = { voice: m.voice ?? {}, music: m.music ?? {}, sfx: m.sfx ?? {} };
    whenUnlocked(() => void preloadEffects());
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const files = [...new Set([...Object.values(manifest.voice), ...Object.values(manifest.music), ...Object.values(manifest.sfx).flat()])];
      void navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage({ type: 'CACHE_AUDIO', files });
      }).catch(() => undefined);
    }
  } catch {
    /* no generated audio: recorded audio stays silent */
  }
}

export function audioFile(kind: 'voice' | 'music', id: string): string | undefined {
  return manifest[kind][id];
}

export function soundFiles(id: string): string[] {
  return manifest.sfx[id] ?? [];
}

async function preloadEffects(): Promise<void> {
  // Characters can reply on the very first screen; warm their small voice
  // chips before the longer object performances.
  const files = [...new Set(Object.values(manifest.sfx).flat())].sort((a, b) => Number(b.startsWith('sfx/robot-')) - Number(a.startsWith('sfx/robot-')));
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < files.length) await loadBuffer(files[next++]);
  }));
}

const buffers = new Map<string, Promise<AudioBuffer | null>>();
const decoded = new Map<string, AudioBuffer>();

/** Ready effects play synchronously; a late download must not make a stale click. */
export function readyBuffer(url: string): AudioBuffer | null {
  return decoded.get(url) ?? null;
}

function retainBuffer(url: string, buffer: AudioBuffer): void {
  decoded.delete(url);
  decoded.set(url, buffer);
  const family = url.split('/')[0];
  const max = family === 'voice' ? 24 : family === 'music' ? 2 : Infinity;
  const sameFamily = [...decoded.keys()].filter(key => key.startsWith(`${family}/`));
  for (const old of sameFamily.slice(0, Math.max(0, sameFamily.length - max))) {
    decoded.delete(old);
    buffers.delete(old);
  }
}

export function loadBuffer(url: string): Promise<AudioBuffer | null> {
  const hit = decoded.get(url);
  if (hit) {
    retainBuffer(url, hit);
    return Promise.resolve(hit);
  }
  let p = buffers.get(url);
  if (!p) {
    // Before the first tap there is no AudioContext yet: don't cache that "no".
    const c = ac();
    if (!c) return Promise.resolve(null);
    p = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(`./audio/${url}`, { signal: controller.signal });
        if (!res.ok) return null;
        const data = await res.arrayBuffer();
        // Older Safari only has the callback form of decodeAudioData.
        const buffer = await new Promise<AudioBuffer | null>((ok) => {
          try {
            const r = c.decodeAudioData(data, (b) => ok(b), () => ok(null));
            if (r && typeof r.catch === 'function') r.catch(() => ok(null));
          } catch {
            ok(null);
          }
        });
        if (buffer) retainBuffer(url, buffer);
        else buffers.delete(url);
        return buffer;
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    })();
    buffers.set(url, p);
    // A failed fetch is recoverable. Keeping its resolved null promise here
    // made one interrupted download silence that recording until a reload.
    void p.then(buffer => { if (!buffer && buffers.get(url) === p) buffers.delete(url); });
  }
  return p;
}
