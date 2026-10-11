/** Short, repeatable performances for the eight repaired workshop treasures. */
import * as sfx from './sfx';

interface SoundClock {
  delayedCall(delay: number, cue: () => void): { remove(dispatchCallback?: boolean): unknown };
}
export interface ObjectSound { duration: number; stop: () => void }

export function playObjectSound(id: string, clock: SoundClock): ObjectSound {
  const playback = sfx.effectPlayback();
  const timers: ReturnType<SoundClock['delayedCall']>[] = [];
  let stopped = false;
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
  // No procedural substitute when the dedicated recording is unavailable.
  stop();
  return { duration: 0, stop };
}
