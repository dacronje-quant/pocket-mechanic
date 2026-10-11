import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ cues: [] as string[], stops: vi.fn(), note: vi.fn(), recording: vi.fn((): number | null => null) }));
vi.mock('./sfx', () => Object.fromEntries([
  ...['tick', 'tock', 'cuckoo', 'ratchet', 'whistle', 'chug', 'click', 'staticBurst', 'hum', 'hiss', 'drip', 'splash', 'ding', 'beeps', 'sparkle', 'swish', 'bong'].map(id => [id, () => mock.cues.push(id)]),
  ['note', mock.note],
  ['recordedEffect', mock.recording],
  ['effectPlayback', () => {
    let stopped = false;
    return { play: (cue: () => void) => { if (!stopped) cue(); }, stop: () => { stopped = true; mock.stops(); } };
  }],
]));
import { playObjectSound } from './objectSounds';
const clock = { delayedCall: (ms: number, cue: () => void) => {
  const timer = setTimeout(cue, ms);
  return { remove: () => clearTimeout(timer) };
} };
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mock.recording.mockReturnValue(null); mock.cues.length = 0; });
afterEach(() => vi.useRealTimers());
describe('repaired object performances', () => {
  it('plays the full dedicated recording without overlapping procedural foley', () => {
    mock.recording.mockReturnValue(5.4);
    const sound = playObjectSound('train', clock);
    expect(mock.recording).toHaveBeenCalledWith('object-train');
    expect(sound.duration).toBe(5.4);
    expect(mock.cues).toEqual([]);
    vi.advanceTimersByTime(5000);
    expect(mock.stops).not.toHaveBeenCalled();
    vi.advanceTimersByTime(501);
    expect(mock.stops).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('stays silent without a dedicated recording and releases its audio path', () => {
    const sound = playObjectSound('tea', clock);
    vi.runAllTimers(); sound.stop();
    expect(sound.duration).toBe(0);
    expect(mock.cues).toEqual([]);
    expect(mock.note).not.toHaveBeenCalled();
    expect(mock.stops).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels a recorded performance when leaving or replaying', () => {
    mock.recording.mockReturnValue(5);
    const sound = playObjectSound('train', clock);
    sound.stop(); sound.stop(); vi.runAllTimers();
    expect(mock.stops).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
