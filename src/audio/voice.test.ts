import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => {
  const source = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null };
  return { source, load: vi.fn(), context: { createBufferSource: vi.fn(() => source) } };
});
vi.mock('./engine', () => ({ ac: () => mock.context, audioFile: (_kind: string, id: string) => id, bus: () => ({}), loadBuffer: mock.load, voiceLevel: () => 1 }));
vi.mock('./sfx', () => ({ beeps: vi.fn() }));
import { speak, stopVoice } from './voice';

beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); vi.stubGlobal('window', { speechSynthesis: { cancel: vi.fn() } }); stopVoice(); });
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
});
