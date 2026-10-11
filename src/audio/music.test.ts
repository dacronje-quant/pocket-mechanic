import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ file: undefined as string | undefined, load: vi.fn(), context: { createOscillator: vi.fn(), createBufferSource: vi.fn() } }));
vi.mock('./engine', () => ({ ac: () => mock.context, bus: () => ({}), audioFile: () => mock.file, loadBuffer: mock.load, whenUnlocked: vi.fn() }));
import { playMusic, stopMusic } from './music';
beforeEach(() => { stopMusic(); vi.clearAllMocks(); mock.file = undefined; });
describe('recorded background music', () => {
  it('stays silent when the theme has no recording', () => {
    playMusic('shop');
    expect(mock.context.createOscillator).not.toHaveBeenCalled();
    expect(mock.context.createBufferSource).not.toHaveBeenCalled();
    expect(mock.load).not.toHaveBeenCalled();
  });
  it.each(['missing', 'failed'])('stays silent after a %s download', async failure => {
    mock.file = 'music/shop.mp3';
    if (failure === 'failed') mock.load.mockRejectedValue(new Error('offline'));
    else mock.load.mockResolvedValue(null);
    playMusic('shop');
    await Promise.resolve(); await Promise.resolve();
    expect(mock.context.createOscillator).not.toHaveBeenCalled();
    expect(mock.context.createBufferSource).not.toHaveBeenCalled();
  });
});
