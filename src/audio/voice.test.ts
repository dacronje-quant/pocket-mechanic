import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => {
  const source = { buffer: null, playbackRate: { value: 1 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null };
  return { source, load: vi.fn(), level: 1, context: { createBufferSource: vi.fn(() => source) } };
});
vi.mock('./engine', () => ({ ac: () => mock.context, audioFile: (_kind: string, id: string) => id, soundFiles: (id: string) => [id], bus: () => ({}), loadBuffer: mock.load, voiceLevel: () => mock.level }));
vi.mock('./sfx', () => ({ beeps: vi.fn() }));
import { setVoiceChip, speak, stopVoice, voiceToken } from './voice';
import { beeps } from './sfx';

beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mock.level = 1; setVoiceChip('voice-classic'); vi.stubGlobal('window', { speechSynthesis: { cancel: vi.fn() } }); stopVoice(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('recorded voice cancellation', () => {
  it('loads Tess recorded robot voice and cancels it with the dialogue', async () => {
    mock.load.mockResolvedValue({ duration: 1.2 });
    setVoiceChip('voice-retro', 'voice-chirpy');
    const pending = speak('tess', 'Bing!');
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(mock.load).toHaveBeenCalledWith('robot-chirpy');
    expect(mock.source.playbackRate.value).toBe(1.25);
    expect(mock.source.start).toHaveBeenCalledOnce();
    stopVoice(); await pending;
    expect(mock.source.stop).toHaveBeenCalled();
    expect(beeps).not.toHaveBeenCalled();
  });
  it('does not start a delayed line after the scene cancels it', async () => {
    let resolve!: (value: { duration: number }) => void;
    mock.load.mockReturnValue(new Promise(done => resolve = done));
    const pending = speak('nana', 'Hello, little one.', 'old');
    stopVoice(); resolve({ duration: 1 }); await pending;
    expect(mock.source.start).not.toHaveBeenCalled();
  });
  it('does not let an old download overlap the newest voice line', async () => {
    let resolveOld!: (value: { duration: number }) => void;
    mock.load.mockImplementation((id: string) => id === 'old' ? new Promise(done => resolveOld = done) : Promise.resolve({ duration: 1 }));
    const old = speak('nana', 'First line.', 'old');
    const current = speak('nana', 'Second line.', 'new');
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    resolveOld({ duration: 1 }); await old;
    expect(mock.source.start).toHaveBeenCalledTimes(1);
    mock.source.onended?.(); await current;
  });
  it('resolves a cancelled download immediately even if the network never returns', async () => {
    mock.load.mockReturnValue(new Promise(() => undefined));
    const pending = speak('nana', 'Waiting line.', 'network');
    stopVoice();
    await pending;
    expect(mock.source.start).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps a newer voice playing when an old bubble hides', async () => {
    mock.load.mockResolvedValue({ duration: 10 });
    const old = speak('nana', 'Old bubble.', 'old');
    const owned = voiceToken();
    const current = speak('nana', 'New speaker.', 'new');
    await old;
    await Promise.resolve(); await Promise.resolve();
    mock.source.stop.mockClear();
    stopVoice(owned);
    expect(mock.source.stop).not.toHaveBeenCalled();
    expect(voiceToken()).not.toBe(owned);
    stopVoice();
    await current;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('stops suspended recorded playback when its bounded wait ends', async () => {
    mock.load.mockResolvedValue({ duration: 1 });
    const pending = speak('nana', 'A line.', 'clip');
    await Promise.resolve(); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2500);
    await pending;
    expect(mock.source.stop).toHaveBeenCalled();
    expect(mock.source.disconnect).toHaveBeenCalled();
  });
});

describe('silent voice recovery', () => {
  it('does not use device speech when a line has no recording', async () => {
    const synth = { cancel: vi.fn(), speak: vi.fn() };
    vi.stubGlobal('window', { speechSynthesis: synth });
    const pending = speak('nana', 'A short line.');
    await vi.runAllTimersAsync(); await pending;
    expect(synth.speak).not.toHaveBeenCalled();
    expect(mock.source.start).not.toHaveBeenCalled();
  });
  it('times out a stalled recording silently and never starts it late', async () => {
    let resolve!: (value: { duration: number }) => void;
    mock.load.mockReturnValue(new Promise(done => resolve = done));
    const synth = { cancel: vi.fn(), speak: vi.fn() };
    vi.stubGlobal('window', { speechSynthesis: synth });
    const pending = speak('nana', 'A short line.', 'slow');
    await vi.advanceTimersByTimeAsync(10000); await pending;
    resolve({ duration: 1 }); await Promise.resolve();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(mock.source.start).not.toHaveBeenCalled();
  });
  it('honours the voice volume setting for robot narration too', async () => {
    mock.level = 0;
    const pending = speak('kip', 'Beep beep!');
    expect(beeps).not.toHaveBeenCalled();
    stopVoice(); await pending;
  });
});
