/**
 * Voices (GDD §23.3). A line plays its generated voice file when the build has
 * one (public/audio/voice, made by scripts/generate-elevenlabs.mjs); otherwise narration
 * stays silent while the caption advances. Kip and
 * Tess only ever beep. Every call resolves when the line has finished, so the
 * story can wait for it.
 */
import { VOICES } from '../content/voices';
import { voiceRecordingIds } from '../content/voicelines';
import type { CharId } from '../content/types';
import { ac, audioFile, bus, isAudioReady, loadBuffer, soundFiles, voiceLevel, whenAudioReady } from './engine';
import { robotCue } from '../content/soundCues';

let playing: AudioBufferSourceNode | null = null;
let generation = 0;
let cancelPending: (() => void) | null = null;
let chip = 'voice-classic';
let tessChip = 'voice-classic';

export function setVoiceChip(id: string, tessId = id): void {
  chip = id;
  tessChip = tessId;
}

/** A bubble can cancel its own narration without silencing a newer speaker. */
export function voiceToken(): number {
  return generation;
}

export function stopVoice(token?: number): void {
  if (token !== undefined && token !== generation) return;
  generation++;
  cancelPending?.();
  cancelPending = null;
  try {
    playing?.stop();
  } catch {
    /* already stopped */
  }
  playing = null;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* no speech */
  }
}

/** Rough reading time, used when there is no audio to wait for. */
export function lineDuration(text: string): number {
  return Math.min(16, 0.9 + text.trim().split(/\s+/).length * 0.4);
}

export async function speak(who: CharId, text: string, id?: string): Promise<void> {
  stopVoice();
  const token = generation;
  const v = VOICES[who];
  if (voiceLevel() <= 0) {
    await wait(lineDuration(text), token);
    return;
  }
  if (!isAudioReady()) {
    const ready = await new Promise<boolean>(resolve => {
      let unlisten = () => {};
      const finish = (allowed = false) => {
        clearTimeout(cap);
        unlisten();
        if (cancelPending === cancel) cancelPending = null;
        resolve(allowed);
      };
      const cancel = () => finish();
      const cap = setTimeout(cancel, 4000);
      cancelPending = cancel;
      unlisten = whenAudioReady(() => finish(true));
    });
    if (token !== generation) return;
    if (!ready) { await wait(lineDuration(text), token); return; }
  }
  const file = v?.beeps ? soundFiles(robotCue(who === 'tess' ? tessChip : chip))[0] : id ? voiceRecordingIds(who, text, id).map(candidate => audioFile('voice', candidate)).find(Boolean) : undefined;
  if (file) {
    // A missing or slow recording must never hold up the story; continue silently.
    const buf = await new Promise<AudioBuffer | null>((res) => {
      const finish = (buffer: AudioBuffer | null = null) => {
        clearTimeout(cap);
        if (cancelPending === cancel) cancelPending = null;
        res(buffer);
      };
      const cancel = () => finish();
      const cap = setTimeout(cancel, 4000);
      cancelPending = cancel;
      void loadBuffer(file).then(finish, cancel);
    });
    if (token !== generation) return;
    const c = ac();
    const dest = bus('voice');
    if (buf && c && dest) {
      const src = c.createBufferSource();
      src.buffer = buf;
      if (v?.beeps) src.playbackRate.value = who === 'tess' ? 1.25 : 1;
      playing = src;
      // onended never fires while the AudioContext is suspended (autoplay denied,
      // iOS after a call, a backgrounded tab), so never wait longer than the line.
      await new Promise<void>((res) => {
        const finish = () => {
          clearTimeout(cap);
          src.onended = null;
          if (cancelPending === finish) cancelPending = null;
          if (playing === src) {
            playing = null;
            try { src.stop(); } catch { /* already ended */ }
            try { src.disconnect(); } catch { /* unavailable audio */ }
          }
          res();
        };
        const cap = setTimeout(finish, (buf.duration + 1.5) * 1000);
        cancelPending = finish;
        src.onended = finish;
        try {
          src.connect(dest);
          src.start();
        } catch { finish(); }
      });
      if (playing === src) playing = null;
      return;
    }
  }
  if (token === generation) await wait(lineDuration(text), token);
}

function wait(s: number, token: number): Promise<void> {
  if (token !== generation) return Promise.resolve();
  return new Promise((res) => {
    const finish = () => {
      clearTimeout(timer);
      if (cancelPending === finish) cancelPending = null;
      res();
    };
    const timer = setTimeout(finish, s * 1000);
    cancelPending = finish;
  });
}
