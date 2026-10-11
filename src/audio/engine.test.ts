import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const buffer = { duration: 1 };
beforeEach(() => {
  vi.resetModules();
  class Context {
    state = 'running'; destination = {};
    addEventListener() {}
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

describe('phone audio startup', () => {
  function phone() {
    const instances: Context[] = [];
    class Context extends EventTarget {
      state = 'suspended'; destination = {}; sampleRate = 44100;
      source = { buffer: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), onended: null };
      resume = vi.fn(async () => { this.state = 'running'; this.dispatchEvent(new Event('statechange')); });
      constructor() { super(); instances.push(this); }
      createGain() { return { gain: { value: 1 }, connect: vi.fn() }; }
      createBuffer() { return {}; }
      createBufferSource() { return this.source; }
    }
    vi.stubGlobal('window', { AudioContext: Context });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ voice: {}, music: {}, sfx: {} }) })));
    return instances;
  }

  it('waits for a slow catalogue after a successful native tap', async () => {
    const contexts = phone();
    const engine = await import('./engine'), ready = vi.fn();
    engine.whenAudioReady(ready); engine.unlockAudio();
    expect(contexts[0].state).toBe('running');
    expect(ready).not.toHaveBeenCalled();
    await engine.loadManifest();
    expect(ready).toHaveBeenCalledOnce();
    expect(engine.isAudioReady()).toBe(true);
  });

  it('keeps a denied tap pending and recovers when a later tap is allowed', async () => {
    const contexts = phone(), engine = await import('./engine'), ready = vi.fn();
    await engine.loadManifest();
    engine.whenAudioReady(ready); engine.unlockAudio();
    contexts[0].state = 'suspended';
    contexts[0].resume.mockImplementationOnce(async () => { throw Error('NotAllowedError'); });
    const retry = vi.fn(); engine.whenAudioReady(retry); engine.unlockAudio();
    await Promise.resolve();
    expect(retry).not.toHaveBeenCalled();
    engine.unlockAudio(); await Promise.resolve();
    expect(retry).toHaveBeenCalledOnce();
    expect(contexts).toHaveLength(1);
  });

  it('resumes Safari interrupted audio and primes its output again', async () => {
    const contexts = phone(), engine = await import('./engine');
    engine.unlockAudio(); await Promise.resolve();
    const c = contexts[0]; c.resume.mockClear(); c.source.start.mockClear();
    c.state = 'interrupted'; engine.unlockAudio();
    expect(c.resume).toHaveBeenCalledOnce();
    expect(c.source.start).toHaveBeenCalledOnce();
    expect(c.state).toBe('running');
  });

  it('handles native taps on overlays and releases cancelled readiness listeners', async () => {
    const contexts = phone(), engine = await import('./engine');
    const target = new EventTarget() as Document;
    const remove = engine.installAudioUnlock(target), stale = vi.fn();
    engine.whenAudioReady(stale)();
    target.dispatchEvent(new Event('touchend'));
    await engine.loadManifest();
    expect(contexts).toHaveLength(1);
    expect(contexts[0].source.start).toHaveBeenCalledOnce();
    expect(stale).not.toHaveBeenCalled();
    remove(); contexts[0].resume.mockClear(); contexts[0].state = 'interrupted';
    target.dispatchEvent(new Event('touchend'));
    expect(contexts[0].resume).not.toHaveBeenCalled();
  });
});
