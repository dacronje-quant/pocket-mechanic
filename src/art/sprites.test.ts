import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {
  GameObjects: { Components: { TransformMatrix: class {} }, Events: { DESTROY: 'destroy' } },
  Scenes: { Events: { POST_UPDATE: 'update', SHUTDOWN: 'shutdown' } },
} }));
vi.mock('./generated', () => ({ artTextureKey: (id: string) => id }));
import { followGraphic } from './sprites';

function fixture(parented = false) {
  const listeners = new Map<string, () => void>();
  const scene: any = { events: { on: (event: string, fn: () => void) => listeners.set(event, fn), once: vi.fn(), off: vi.fn() } };
  const owner: any = { scene, depth: 5, parentContainer: null, scaleX: 1, scaleY: 1, rotation: 0, alpha: 1, visible: true, getLocalTransformMatrix: () => ({ transformPoint: (x: number, y: number) => ({ x, y }) }), once: vi.fn() };
  const image: any = { scene, depth: 5, width: 100, height: 100, parentContainer: null };
  ['setPosition', 'setScale', 'setRotation', 'setAlpha', 'setVisible', 'setDepth'].forEach(method => image[method] = (...args: any[]) => { if (method === 'setDepth') image.depth = args[0]; return image; });
  const label = {}, button = {};
  const list: any = { list: [owner, label, button, image], getIndex: (o: unknown) => list.list.indexOf(o), moveTo: (o: unknown, index: number) => { list.list.splice(list.getIndex(o), 1); list.list.splice(index, 0, o); } };
  scene.children = list;
  if (parented) { owner.parentContainer = list; image.parentContainer = list; }
  return { owner, image, label, button, list, listeners };
}
describe('painted graphic draw order', () => {
  for (const parented of [false, true]) it(`keeps late art below captions and buttons in a ${parented ? 'container' : 'scene'}`, () => {
    const f = fixture(parented);
    followGraphic(f.owner, f.image, 0, 0, 100, 100);
    expect(f.list.list).toEqual([f.owner, f.image, f.label, f.button]);
    f.listeners.get('update')!();
    expect(f.list.list).toEqual([f.owner, f.image, f.label, f.button]);
  });
  it('accounts for an image moving from below its graphic', () => {
    const f = fixture(); f.list.list = [f.image, f.owner, f.label, f.button];
    followGraphic(f.owner, f.image, 0, 0, 100, 100);
    expect(f.list.list).toEqual([f.owner, f.image, f.label, f.button]);
  });
});
