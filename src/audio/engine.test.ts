import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const buffer = { duration: 1 };
beforeEach(() => {
  vi.resetModules();
  class Context {
    state = 'running'; destination = {};
    createGain() { return { gain: { value: 1 }, connect: vi.fn() }; }
    decodeAudioData(_data: ArrayBuffer, done: (b: unknown) => void) { done(buffer); return Promise.resolve(buffer); }
  }
  vi.stubGlobal('window', { AudioContext: Context });
});
afterEach(() => vi.unstubAllGlobals());

describe('recording download recovery', () => {
  it.each(['404', 'offline'])('retries after a %s response instead of caching permanent silence', async failure => {
    const fetch = vi.fn();
    if (failure === '404') fetch.mockResolvedValueOnce({ ok: false });
    else fetch.mockRejectedValueOnce(new Error('offline'));
    fetch.mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    vi.stubGlobal('fetch', fetch);
    const engine = await import('./engine'); engine.unlockAudio();
    expect(await engine.loadBuffer('voice/recover.mp3')).toBeNull();
    expect(await engine.loadBuffer('voice/recover.mp3')).toBe(buffer);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(engine.readyBuffer('voice/recover.mp3')).toBe(buffer);
  });
  it('shares an in-flight download and retains a successful recording', async () => {
    let complete!: (response: unknown) => void;
    const fetch = vi.fn(() => new Promise(resolve => complete = resolve)); vi.stubGlobal('fetch', fetch);
    const engine = await import('./engine'); engine.unlockAudio();
    const first = engine.loadBuffer('sfx/robot.mp3'), second = engine.loadBuffer('sfx/robot.mp3');
    expect(second).toBe(first);
    complete({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    expect(await first).toBe(buffer);
    expect(await engine.loadBuffer('sfx/robot.mp3')).toBe(buffer);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
