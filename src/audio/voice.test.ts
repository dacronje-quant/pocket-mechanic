import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => {
  const source = { buffer: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null };
  return { source, load: vi.fn(), level: 1, context: { createBufferSource: vi.fn(() => source) } };
});
vi.mock('./engine', () => ({ ac: () => mock.context, audioFile: (_kind: string, id: string) => id, bus: () => ({}), loadBuffer: mock.load, voiceLevel: () => mock.level }));
vi.mock('./sfx', () => ({ beeps: vi.fn() }));
import { speak, stopVoice, voiceToken } from './voice';
import { beeps } from './sfx';

beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mock.level = 1; vi.stubGlobal('window', { speechSynthesis: { cancel: vi.fn() } }); stopVoice(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('recorded voice cancellation', () => {
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

describe('device speech lifecycle', () => {
  it('cancels a stalled device voice before returning control to subtitles', async () => {
    const cancel = vi.fn();
    const synth = { cancel, speak: vi.fn(), getVoices: () => [] };
    vi.stubGlobal('window', { speechSynthesis: synth });
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    const pending = speak('nana', 'A short line.');
    cancel.mockClear();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(12000);
    await pending;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('resolves cancelled device speech without waiting for browser end events', async () => {
    vi.stubGlobal('window', { speechSynthesis: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] } });
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    const pending = speak('nana', 'Please try the lever.');
    stopVoice();
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('honours the voice volume setting for robot narration too', async () => {
    mock.level = 0;
    const pending = speak('kip', 'Beep beep!');
    expect(beeps).not.toHaveBeenCalled();
    stopVoice();
    await pending;
  });
});
