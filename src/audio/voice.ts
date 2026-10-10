/**
 * Voices (GDD §23.3). A line plays its generated voice file when the build has
 * one (public/audio/voice, made by scripts/generate-assets.mjs); otherwise the
 * device's own speech reads it in the character's pitch and pace. Kip and
 * Tess only ever beep. Every call resolves when the line has finished, so the
 * story can wait for it.
 */
import { VOICES } from '../content/voices';
import type { CharId } from '../content/types';
import { ac, audioFile, bus, loadBuffer, voiceLevel } from './engine';
import { beeps } from './sfx';

let playing: AudioBufferSourceNode | null = null;
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

export function stopVoice(): void {
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
  return Math.min(7, 0.9 + text.split(/\s+/).length * 0.33);
}

export async function speak(who: CharId, text: string, id?: string): Promise<void> {
  stopVoice();
  const v = VOICES[who];
  if (v?.beeps) {
    beeps(text, chip, who === 'tess' ? 1.25 : 1);
    await wait(Math.min(1.4, 0.3 + text.length * 0.04));
    return;
  }
  if (voiceLevel() <= 0) {
    await wait(lineDuration(text));
    return;
  }
  const file = id ? audioFile('voice', id) : undefined;
  if (file) {
    const buf = await loadBuffer(file);
    const c = ac();
    const dest = bus('voice');
    if (buf && c && dest) {
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(dest);
      src.start();
      playing = src;
      await new Promise<void>((res) => {
        src.onended = () => res();
      });
      if (playing === src) playing = null;
      return;
    }
  }
  await speakDevice(text, v?.pitch ?? 1, v?.rate ?? 0.95);
}

function speakDevice(text: string, pitch: number, rate: number): Promise<void> {
  return new Promise((res) => {
    const fallback = setTimeout(res, lineDuration(text) * 1000 + 1500);
    try {
      const synth = window.speechSynthesis;
      if (!synth) {
        clearTimeout(fallback);
        setTimeout(res, lineDuration(text) * 1000);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = Math.max(0, Math.min(2, pitch));
      u.rate = rate;
      u.volume = voiceLevel();
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? 'en-GB';
      u.onend = () => {
        clearTimeout(fallback);
        res();
      };
      u.onerror = () => {
        clearTimeout(fallback);
        res();
      };
      synth.speak(u);
    } catch {
      clearTimeout(fallback);
      setTimeout(res, lineDuration(text) * 1000);
    }
  });
}

function wait(s: number): Promise<void> {
  return new Promise((res) => setTimeout(res, s * 1000));
}
