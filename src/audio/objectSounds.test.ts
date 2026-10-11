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
import { NOTE_FREQS } from '../mechanism/pins';
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
  it('cancels queued foley when the player leaves or restarts an object', () => {
    const tea = playObjectSound('tea', clock);
    expect(mock.cues).toEqual(['ratchet']);
    tea.stop(); tea.stop();
    vi.runAllTimers();
    expect(mock.cues).toEqual(['ratchet']);
    expect(mock.stops).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('replays a fresh performance without resurrecting the previous delayed sounds', () => {
    const old = playObjectSound('clock', clock);
    vi.advanceTimersByTime(100); old.stop();
    const replay = playObjectSound('train', clock);
    vi.advanceTimersByTime(600);
    expect(mock.cues).toContain('whistle');
    expect(mock.cues).toContain('chug');
    expect(mock.cues).not.toContain('cuckoo');
    replay.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('plays authored scale notes and preserves the music-box rests', () => {
    const sound = playObjectSound('musicbox', clock);
    vi.advanceTimersByTime(200);
    expect(mock.note).toHaveBeenLastCalledWith(NOTE_FREQS[2], 'chime', 0.4);
    vi.advanceTimersByTime(1000);
    expect(mock.note).toHaveBeenCalledTimes(3);
    expect(mock.note).toHaveBeenLastCalledWith(NOTE_FREQS[4], 'chime', 0.4);
    sound.stop();
  });
  it('releases its audio path after the final note and tail', () => {
    const sound = playObjectSound('orrery', clock);
    vi.advanceTimersByTime(sound.duration * 1000 + 500);
    expect(mock.stops).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    sound.stop();
    expect(mock.stops).toHaveBeenCalledTimes(1);
  });
});
