/** Short, repeatable performances for the eight repaired workshop treasures. */
import * as sfx from './sfx';
import { SONGS } from '../content/songs';
import { NOTE_FREQS } from '../mechanism/pins';

interface SoundClock {
  delayedCall(delay: number, cue: () => void): { remove(dispatchCallback?: boolean): unknown };
}
export interface ObjectSound { duration: number; stop: () => void }

export function playObjectSound(id: string, clock: SoundClock): ObjectSound {
  const playback = sfx.effectPlayback();
  const timers: ReturnType<SoundClock['delayedCall']>[] = [];
  let stopped = false;
  const at = (seconds: number, cue: () => void) => {
    if (!seconds) playback.play(cue);
    else timers.push(clock.delayedCall(seconds * 1000, () => { if (!stopped) playback.play(cue); }));
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    timers.forEach(timer => timer.remove(false));
    playback.stop();
  };
  let recording: number | null = null;
  playback.play(() => { recording = sfx.recordedEffect(`object-${id}`); });
  if (recording !== null) {
    const duration = Number(recording);
    timers.push(clock.delayedCall(duration * 1000 + 100, stop));
    return { duration, stop };
  }
  const melody = (song: string, tempo: number, kind: 'pluck' | 'chime' | 'pipe' | 'piano') => {
    const notes = SONGS.find(item => item.id === song)?.notes ?? [];
    notes.forEach((note, index) => {
      if (note >= 0) at(0.2 + index / tempo, () => sfx.note(NOTE_FREQS[note] ?? 440, kind, 0.4));
    });
    return 0.2 + notes.length / tempo + 0.7;
  };
  let duration = 3;
  switch (id) {
    case 'clock':
      at(0, () => sfx.tick()); at(0.25, sfx.tock);
      at(0.5, () => sfx.cuckoo(3)); at(2.25, () => sfx.tick());
      break;
    case 'musicbox':
      at(0, () => sfx.ratchet());
      duration = melody('song-lullaby', 3, 'chime');
      break;
    case 'train':
      at(0, () => sfx.whistle(740, 0.8));
      [0.3, 0.8, 1.3, 1.8, 2.3].forEach(time => at(time, sfx.chug));
      break;
    case 'radio':
      at(0, () => sfx.click()); at(0.08, () => sfx.staticBurst(0.5, 0.3));
      [392, 493.88, 587.33, 493.88, 392].forEach((pitch, index) => at(0.5 + index * 0.3, () => sfx.note(pitch, 'pipe', 0.3)));
      at(2.1, () => sfx.hum(196, 0.5));
      break;
    case 'tea':
      at(0, () => sfx.ratchet()); at(0.18, () => sfx.hiss(1));
      at(1, () => sfx.drip()); at(1.3, () => sfx.splash()); at(1.7, () => sfx.whistle(1046, 0.65));
      at(2.5, () => sfx.ding(784));
      break;
    case 'bertie':
      at(0, () => sfx.ratchet());
      duration = melody('song-boogie', 4, 'pluck');
      [0.3, 0.9, 1.5, 2.1].forEach((time, index) => at(time, () => sfx.beeps(index % 2 ? 'boop' : 'beep', 'voice-retro', 0.8)));
      break;
    case 'orrery':
      at(0, () => sfx.sparkle());
      duration = melody('song-stars', 3, 'chime');
      at(0.8, () => sfx.swish());
      break;
    case 'tower':
      at(0, () => sfx.tock()); at(0.2, () => sfx.bong());
      at(1.6, () => sfx.bong()); at(3, () => sfx.tick());
      duration = 4;
      break;
    default:
      at(0, () => sfx.sparkle());
      duration = 2;
  }
  // Release the performance's private audio path after its final tail.
  timers.push(clock.delayedCall(duration * 1000 + 500, stop));
  return { duration, stop };
}
