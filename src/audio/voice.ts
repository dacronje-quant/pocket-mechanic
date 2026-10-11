/**
 * Voices (GDD §23.3). A line plays its generated voice file when the build has
 * one (public/audio/voice, made by scripts/generate-elevenlabs.mjs); otherwise the
 * device's own speech reads it in the character's pitch and pace. Kip and
 * Tess only ever beep. Every call resolves when the line has finished, so the
 * story can wait for it.
 */
import { VOICES } from '../content/voices';
import { voiceRecordingIds } from '../content/voicelines';
import type { CharId } from '../content/types';
import { ac, audioFile, bus, loadBuffer, voiceLevel } from './engine';
import { beeps } from './sfx';

let playing: AudioBufferSourceNode | null = null;
let generation = 0;
let cancelPending: (() => void) | null = null;
let chip = 'voice-classic';

export function setVoiceChip(id: string): void {
  chip = id;
}

let englishVoice: SpeechSynthesisVoice | null | undefined;
function pickVoice(): SpeechSynthesisVoice | null {
  if (englishVoice !== undefined) return englishVoice;
  try {
    const all = window.speechSynthesis?.getVoices() ?? [];
    englishVoice = all.find((v) => /en-GB/i.test(v.lang)) ?? all.find((v) => /^en/i.test(v.lang)) ?? null;
    if (!all.length) englishVoice = undefined; // voices load late on some devices: try again next time
  } catch {
    englishVoice = null;
  }
  return englishVoice ?? null;
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
  if (v?.beeps) {
    beeps(text, chip, who === 'tess' ? 1.25 : 1);
    await wait(Math.min(1.4, 0.3 + text.length * 0.04), token);
    return;
  }
  const file = id ? voiceRecordingIds(who, text, id).map(candidate => audioFile('voice', candidate)).find(Boolean) : undefined;
  if (file) {
    // a missing or slow voice file must never hold up the story: give it a moment, then use device speech
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
  if (token === generation) await speakDevice(text, v?.pitch ?? 1, v?.rate ?? 0.95, token);
}

function speakDevice(text: string, pitch: number, rate: number, token: number): Promise<void> {
  return new Promise((res) => {
    let fallback: ReturnType<typeof setTimeout>;
    const finish = () => {
      clearTimeout(fallback);
      if (cancelPending === finish) cancelPending = null;
      res();
    };
    cancelPending = finish;
    fallback = setTimeout(() => {
      // A stalled device voice must stop when its subtitles advance.
      if (token === generation) {
        try { window.speechSynthesis?.cancel(); } catch { /* no speech */ }
      }
      finish();
    }, Math.max(12, lineDuration(text) * 2 + 3) * 1000);
    try {
      const synth = window.speechSynthesis;
      if (!synth) {
        clearTimeout(fallback);
        fallback = setTimeout(finish, lineDuration(text) * 1000);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = Math.max(0, Math.min(2, pitch));
      u.rate = rate;
      u.volume = voiceLevel();
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? 'en-GB';
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
    } catch {
      clearTimeout(fallback);
      fallback = setTimeout(finish, lineDuration(text) * 1000);
    }
  });
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
