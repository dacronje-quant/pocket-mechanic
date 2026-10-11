import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({ now: 0, oscillators: [] as Array<{ frequency: { value: number }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> }));
vi.mock('./engine', () => ({
  ac: () => ({ get currentTime() { return fake.now; },
    createGain: () => { const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(() => gain), disconnect: vi.fn() }; return gain; },
    createOscillator: () => { const oscillator = { frequency: { value: 0 }, type: '', onended: null, connect: vi.fn((node: unknown) => node), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; fake.oscillators.push(oscillator); return oscillator; },
  }), bus: () => ({}),
}));
import { musicBoxTone, playComposition, playFoundTune } from './composer';
import { NOTE_FREQS } from '../mechanism/pins';

beforeEach(() => { fake.now = 0; fake.oscillators = []; vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('music box audio clock', () => {
  it('auditions the exact selected pitch with a quiet steel-comb overtone', () => {
    const tone = musicBoxTone(9);
    expect(fake.oscillators[0].frequency.value).toBe(NOTE_FREQS[9]);
    expect(fake.oscillators[1].frequency.value).toBe(NOTE_FREQS[9] * 2);
    tone.stop(); expect(fake.oscillators.every(o => o.stop.mock.calls.length === 2)).toBe(true);
  });
  it('plays all chord notes together and uses BPM for the next beat', () => {
    const player = playComposition({ steps: 2, bpm: 180, pins: ['0:0', '0:4', '1:9'] });
    expect(fake.oscillators).toHaveLength(6);
    expect(fake.oscillators[0].start.mock.calls[0][0]).toBe(.025);
    expect(fake.oscillators[3].start.mock.calls[0][0]).toBe(.025);
    fake.now = .25; vi.advanceTimersByTime(25);
    expect(fake.oscillators).toHaveLength(9);
    expect(fake.oscillators[6].start.mock.calls[0][0]).toBeCloseTo(.025 + 1 / 3);
    fake.now = .37; expect(player.beat).toBe(1); player.stop();
  });
  it('Stop cancels sounding and queued notes and prevents another loop', () => {
    const player = playComposition({ steps: 1, pins: ['0:0'] }, true);
    player.stop(); fake.now = 10; vi.advanceTimersByTime(1000);
    expect(fake.oscillators).toHaveLength(3);
    expect(fake.oscillators.every(o => o.stop.mock.calls.length === 2)).toBe(true); expect(player.ended).toBe(true);
  });
  it('a suspended or background frame skips stale beats instead of bursting old notes', () => {
    const player = playComposition({ pins: Array.from({ length: 16 }, (_, i) => `${i}:0`) });
    fake.now = 5; vi.advanceTimersByTime(25); expect(fake.oscillators).toHaveLength(3);
    fake.now = 5.35; vi.advanceTimersByTime(25); expect(fake.oscillators).toHaveLength(6);
    expect(fake.oscillators[3].start.mock.calls[0][0]).toBeCloseTo(5.425); player.stop();
  });
  it('finishes naturally after the roll and its final note tail', () => {
    const player = playComposition({ steps: 2, bpm: 180, pins: ['0:0'] });
    fake.now = 1.7; vi.advanceTimersByTime(25); expect(player.ended).toBe(true);
  });
  it('retains the faster authored tempo of collected songs and cancels them', () => {
    const player = playFoundTune([0, 4, -1, 7], 4);
    fake.now = .2; vi.advanceTimersByTime(25);
    expect(fake.oscillators[3].start.mock.calls[0][0]).toBeCloseTo(.275);
    player.stop(); fake.now = 1; vi.advanceTimersByTime(25); expect(fake.oscillators).toHaveLength(6);
  });
});
