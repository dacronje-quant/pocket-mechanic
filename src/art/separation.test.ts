import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {
  Scenes: { Events: { POST_UPDATE: 'update', SHUTDOWN: 'shutdown' } },
  GameObjects: { Events: { DESTROY: 'destroy' } },
} }));
import { separateSprite } from './separation';

describe('cut figure outlines', () => {
  it('reads the actual cut figure instead of the first atlas source and releases shutdown hooks', () => {
    const drawImage = vi.fn(), source = {}, atlas = {};
    const ctx = { drawImage, fillRect: vi.fn(), clearRect: vi.fn() };
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
    const off = vi.fn();
    const edge: any = { scene: {}, parentContainer: null, destroy: vi.fn() };
    for (const method of ['setName','setTexture','setPosition','setScale','setOrigin','setRotation','setFlip','setAlpha','setVisible','setDepth','clearMask']) edge[method] = () => edge;
    const scene: any = { add: { image: () => edge }, textures: { exists: () => false, addCanvas: vi.fn() }, events: { on: vi.fn(), once: vi.fn(), off } };
    const once = vi.fn();
    const image: any = { scene, visible: true, parentContainer: null, frame: { source: { image: source }, name: 'cut', cutX: 0, cutY: 0, cutWidth: 100, cutHeight: 100 }, texture: { key: 'portrait', getSourceImage: () => atlas }, width: 100, height: 100, scaleX: 1, scaleY: 1, originX: .5, originY: .5, alpha: 1, depth: 5, getData: () => false, setData: () => {}, once };
    try {
      separateSprite(image);
      expect(drawImage.mock.calls.every(call => call[0] !== atlas)).toBe(true);
      expect(drawImage.mock.calls.filter(call => call[0] === source)).toHaveLength(3);
      once.mock.calls[0][1]();
      expect(off.mock.calls.map(call => call[0])).toEqual(['update', 'shutdown']);
      expect(edge.destroy).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); }
  });
});
