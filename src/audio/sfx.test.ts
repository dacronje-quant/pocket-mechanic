import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => {
  const parameter = () => ({ value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const node = () => ({ connect: vi.fn().mockReturnThis(), disconnect: vi.fn() });
  const context = {
    currentTime: 10, sampleRate: 1000,
    createBufferSource: vi.fn(() => ({ ...node(), playbackRate: parameter(), start: vi.fn(), stop: vi.fn(), buffer: null, loop: false, onended: null })),
    createGain: vi.fn(() => ({ ...node(), gain: parameter() })),
    createBiquadFilter: vi.fn(() => ({ ...node(), type: '', frequency: parameter(), Q: parameter() })),
    createOscillator: vi.fn(() => ({ ...node(), frequency: parameter(), start: vi.fn(), stop: vi.fn() })),
    createBuffer: vi.fn(() => ({ sampleRate: 1000, getChannelData: () => new Float32Array(2000) })),
  };
  return { context, buffers: new Map<string, { duration: number }>(), files: new Map<string, string[]>(), load: vi.fn(async () => null) };
});
vi.mock('./engine', () => ({ ac: () => mock.context, bus: () => ({}), soundFiles: (id: string) => mock.files.get(id) ?? [], readyBuffer: (file: string) => mock.buffers.get(file) ?? null, loadBuffer: mock.load, unlockAudio: vi.fn(), isMuted: () => false }));
import { beeps, clunk, hiss, horn, hum, ratchet, setSoft, whistle } from './sfx';

beforeEach(() => {
  vi.clearAllMocks(); mock.files.clear(); mock.buffers.clear(); setSoft(false);
});
describe('recorded mechanical effects', () => {
  it.each(['classic', 'chirpy', 'musical', 'bubbly', 'retro', 'musicbox'])('uses the recorded %s voice chip without an oscillator', flavour => {
    const id = `robot-${flavour}`; mock.files.set(id, [id]); mock.buffers.set(id, { duration: 1.2 });
    beeps('hello', `voice-${flavour}`);
    expect(mock.context.createBufferSource.mock.results[0].value.buffer).toBe(mock.buffers.get(id));
    expect(mock.context.createOscillator).not.toHaveBeenCalled();
  });
  it('uses recordings for horns, valve hum and mechanical whistles', () => {
    for (const id of ['instrument-horn', 'instrument-hum', 'instrument-whistle']) { mock.files.set(id, [id]); mock.buffers.set(id, { duration: 1.2 }); }
    horn(); hum(); whistle();
    expect(mock.context.createBufferSource).toHaveBeenCalledTimes(3);
    expect(mock.context.createOscillator).not.toHaveBeenCalled();
  });
  it('stays silent when the recording is missing', () => {
    clunk();
    expect(mock.context.createOscillator).not.toHaveBeenCalled();
    expect(mock.context.createBufferSource).not.toHaveBeenCalled();
  });
  it('cycles through the gear clicks instead of repeating one identical recording', () => {
    const files = ['gear-a', 'gear-b', 'gear-c'];
    mock.files.set('clunk', files);
    files.forEach(file => mock.buffers.set(file, { duration: 0.5 }));
    for (let i = 0; i < 4; i++) clunk();
    const sources = mock.context.createBufferSource.mock.results.map(result => result.value.buffer);
    expect(new Set(sources.slice(0, 3)).size).toBe(3);
    expect(sources[3]).toBe(sources[0]);
    expect(mock.context.createOscillator).not.toHaveBeenCalled();
  });
  it('keeps repeated ratchets on their original 60 ms spacing', () => {
    mock.files.set('ratchet', ['ratchet']); mock.buffers.set('ratchet', { duration: 0.1 });
    ratchet(3);
    const sources = mock.context.createBufferSource.mock.results.map(result => result.value);
    expect(sources.map(source => source.start.mock.calls[0][0])).toEqual([10, 10.06, 10.12]);
    sources.forEach((source, i) => expect(source.stop.mock.calls[0][0]).toBeCloseTo(10.055 + i * 0.06, 6));
  });
  it('softens recorded transients and obeys a requested steam duration', () => {
    mock.files.set('hiss', ['steam']); mock.buffers.set('steam', { duration: 1.8 });
    setSoft(true); hiss(0.2);
    const source = mock.context.createBufferSource.mock.results[0].value;
    expect(source.stop).toHaveBeenCalledWith(10.2);
    expect(mock.context.createBiquadFilter.mock.results[0].value.frequency.value).toBe(2600);
    expect(mock.context.createGain.mock.results[0].value.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.35, 10.03);
  });
  it('stays silent for a cold recording without adding a late click', async () => {
    mock.files.set('clunk', ['cold-gear']);
    clunk();
    expect(mock.load).toHaveBeenCalledWith('cold-gear');
    expect(mock.context.createOscillator).not.toHaveBeenCalled();
    const sources = mock.context.createBufferSource.mock.calls.length;
    await Promise.resolve();
    expect(mock.context.createBufferSource.mock.calls.length).toBe(sources);
  });
});
