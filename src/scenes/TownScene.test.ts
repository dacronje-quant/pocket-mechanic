import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REPAIRS } from '../content/repairs';

const mock = vi.hoisted(() => ({
  repairs: [1] as number[], machines: [] as any[], zones: [] as any[], cards: [] as any[],
  art: [] as Array<{ id: string; ready: (key: string) => void }>,
  say: vi.fn(), closed: vi.fn(), nuhUh: vi.fn(),
}));

function object(x = 0, y = 0): any {
  const events: Record<string, () => void> = {};
  let proxy: any;
  const o: any = { x, y, active: true, events, destroy: vi.fn(() => { o.active = false; }),
    on: vi.fn((event, fn) => { events[event] = fn; return proxy; }),
    setName: vi.fn((name) => { o.name = name; return proxy; }),
    setSize: vi.fn((width, height) => { o.width = width; o.height = height; return proxy; }),
  };
  proxy = new Proxy(o, { get(target, key) { return key in target ? target[key] : vi.fn(() => proxy); } });
  return proxy;
}

vi.mock('phaser', () => ({ default: {} }));
vi.mock('../audio/sfx', () => ({ nuhUh: mock.nuhUh }));
vi.mock('../art/generated', () => ({
  withArt: vi.fn((_scene, id, ready) => { if (id.startsWith('postcard-')) mock.art.push({ id, ready }); }),
  coverImage: vi.fn(() => object()),
}));
vi.mock('../art/portraits', () => ({ badge: vi.fn(() => object()) }));
vi.mock('../art/copperMoss', () => ({ CM: {}, drawPatina: vi.fn() }));
vi.mock('../art/objects', () => ({ MachineArt: class {
  id: string; working = false; perform = vi.fn(); name = '';
  constructor(_scene: unknown, public x: number, public y: number, id: string) { this.id = id; mock.machines.push(this); }
  setDepth() { return this; } setAlpha() { return this; } setData() { return this; }
  setVisible() { return this; }
  setName(name: string) { this.name = name; return this; }
  setWorking(on: boolean) { this.working = on; return this; }
} }));
vi.mock('../ui/widgets', () => ({ card: vi.fn(() => object()) }));
vi.mock('../core/progress', () => ({ repairDone: (_profile: unknown, id: number) => mock.repairs.includes(id), setFlag: () => false }));
vi.mock('../core/save', () => ({ profile: () => ({ repairs: mock.repairs }), persist: vi.fn() }));
vi.mock('../core/session', () => ({ windDownActive: () => false }));
vi.mock('./MetaScene', () => ({ HUD: 900, MetaScene: class {
  add = {
    graphics: () => object(), text: () => object(),
    zone: (x: number, y: number) => { const z = object(x, y); mock.zones.push(z); return z; },
    container: (x: number, y: number) => { const c = object(x, y); mock.cards.push(c); return c; },
  };
  bubble = { say: mock.say }; tweens = { add: vi.fn() }; time = { delayedCall: vi.fn() };
  music() {} backButton() {} heading() {} hot() {} line(id: string) { mock.closed(id); }
} }));

import { TownScene } from './TownScene';

beforeEach(() => {
  mock.repairs = [1]; mock.machines = []; mock.zones = []; mock.cards = []; mock.art = [];
  vi.clearAllMocks();
});

describe('Town repaired objects', () => {
  it('shows the actual eight objects and animates only completed repairs', () => {
    const scene = new TownScene() as any; scene.build();
    expect(mock.machines.map(machine => machine.id)).toEqual(REPAIRS.map(repair => repair.object));
    expect(mock.machines.filter(machine => machine.working).map(machine => machine.id)).toEqual(['clock']);
    expect(scene.machines.size).toBe(8);
    mock.zones[1].events.pointerup();
    expect(mock.machines[1].perform).not.toHaveBeenCalled();
    expect(mock.closed).toHaveBeenCalledWith('town.closed');
    expect(mock.repairs).toEqual([1]);
  });

  it('replays the repaired machine on every press and retains its owner greeting', () => {
    mock.repairs = REPAIRS.map(repair => repair.id);
    const scene = new TownScene() as any; scene.build();
    for (let i = 0; i < REPAIRS.length; i++) {
      mock.zones[i].events.pointerup(); mock.zones[i].events.pointerup();
      expect(mock.machines[i].perform).toHaveBeenCalledTimes(2);
      expect(mock.say).toHaveBeenCalledWith(REPAIRS[i].tagline, { who: REPAIRS[i].owner, id: `town.${REPAIRS[i].key}` });
    }
    expect(mock.repairs).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('keeps one postcard and rejects art that arrives for an older visit', () => {
    mock.repairs = [1, 2];
    const scene = new TownScene() as any; scene.build();
    mock.zones[0].events.pointerup(); mock.zones[1].events.pointerup();
    mock.art[1].ready('rosa'); mock.art[0].ready('finch');
    expect(mock.cards.filter(card => card.active)).toHaveLength(1);
    expect(mock.cards[1].name).toBe('town:postcard:musicbox');
    mock.zones[1].events.pointerup(); mock.art[2].ready('rosa');
    expect(mock.cards[1].destroy).toHaveBeenCalledTimes(1);
    expect(mock.cards.filter(card => card.active)).toHaveLength(1);
  });
});
