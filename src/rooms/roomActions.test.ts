/** Regressions for player-input recovery and the motion/audio shown by rooms. */
import { describe, expect, it, vi } from 'vitest';
import { followerPattern } from '../mechanism/cams';
import { NOTE_FREQS } from '../mechanism/pins';

const fake = vi.hoisted(() => {
  const object = (x = 0, y = 0) => {
    const value: Record<string, any> = { x, y, input: { enabled: true }, callbacks: new Map(), active: true, data: new Map(), scaleX: 1 };
    let proxy: any;
    proxy = new Proxy(value, { get(target, key: string) {
      if (key in target) return target[key];
      return (...args: any[]) => {
        if (key === 'on') target.callbacks.set(args[0], args[1]);
        if (key === 'setPosition') { target.x = args[0]; target.y = args[1]; }
        if (key === 'setScale') target.scaleX = args[0];
        if (key === 'disableInteractive') target.input.enabled = false;
        if (key === 'setData') target.data.set(args[0], args[1]);
        if (key === 'getData') return target.data.get(args[0]);
        return proxy;
      };
    } });
    return proxy;
  };
  class Base {
    def: any; state: any; style: any = { id: 'engineer', autoRotate: false };
    fixed = false; moves = 0; idle = 0; undoStack: Array<() => void> = [];
    launch = { mode: 'story' };
    dragSpecs: any[] = []; delayed: Array<() => void> = []; zones: any[] = [];
    add = { graphics: () => object(), container: (x: number, y: number) => object(x, y), text: () => object(), zone: (x: number, y: number) => { const o = object(x, y); this.zones.push(o); return o; } };
    tweens = { add: () => {}, killTweensOf: () => {} };
    time = { now: 1000, delayedCall: (_ms: number, fn: () => void) => { this.delayed.push(fn); } };
    kip = { shrug: () => {}, walkTo: () => {}, giggle: () => {} };
    cameras = { main: { shake: () => {} } };
    traySpots(n: number) { return Array.from({ length: n }, (_, i) => ({ x: 500 + i * 100, y: 598 })); }
    enableDrag(spec: any) { this.dragSpecs.push(spec); }
    act(undo?: () => void) { this.moves++; if (undo) this.undoStack.push(undo); }
    clunkAt() {} sparkleAt() {} checkSolved() {} onFixed() { this.fixed = true; }
    floatHome() {} refuse() {}
  }
  return { object, Base };
});

vi.mock('phaser', () => ({ default: { BlendModes: { ADD: 1 }, Math: { Clamp: (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v)), Vector2: class { constructor(public x: number, public y: number) {} } } } }));
vi.mock('./RoomBase', () => ({ RoomBase: fake.Base, D: { back: 0, mech: 10, parts: 20, hud: 50, trayPart: 30 } }));
vi.mock('../audio/sfx', () => ({ clunk: vi.fn(), click: vi.fn(), ratchet: vi.fn(), note: vi.fn(), tick: vi.fn(), tock: vi.fn(), boing: vi.fn(), sparkle: vi.fn(), punch: vi.fn(), swish: vi.fn(), whirr: vi.fn(), pickUp: vi.fn(), nuhUh: vi.fn() }));
vi.mock('../art/parts', () => ({ drawPart: () => {} }));
vi.mock('../art/copperMoss', () => ({ CM: {}, drawPatina: () => {} }));
vi.mock('../art/finish', () => ({ rivet: () => {}, etchedPlate: () => {} }));
vi.mock('../art/generated', () => ({ withArt: () => {} }));
vi.mock('../art/sprites', () => ({ atlasFrame: () => '' }));
vi.mock('../ui/widgets', () => ({ FONT: 'test', roundButton: () => fake.object(), toast: () => {} }));

import { ChainRoom } from './ChainRoom';
import { CamRoom } from './CamRoom';
import { CardsRoom } from './CardsRoom';
import { MusicRoom } from './MusicRoom';
import { PendulumRoom } from './PendulumRoom';
import * as sfx from '../audio/sfx';

const scene = <T>(room: T): any => room;

describe('classic room input regressions', () => {
  it('editing or undoing a running chain permits another Run', () => {
    const room = scene(new ChainRoom());
    room.def = { links: [{ part: 'crank' }, { slot: true, sol: 'cylinder' }, { part: 'clementine' }] };
    const part = { id: 'cylinder', at: 1, obj: fake.object(), drawing: fake.object(), home: { x: 500, y: 598 } };
    room.parts = [part]; room.pos = [{ x: 300, y: 320 }, { x: 500, y: 320 }, { x: 700, y: 320 }];
    room.state = { 1: 'cylinder' }; room.run = {}; room.runT = .5;
    room.lift(part);
    expect(room.runT).toBe(-1);
    expect(room.run).toBeNull();
    room.undoStack.pop()(); room.refresh(); room.start();
    expect(room.runT).toBe(0);
    expect(room.run.ok).toBe(true);
  });

  it('placed cams share tap and drag input without an overlaid blocking zone', () => {
    const room = scene(new CamRoom());
    room.def = { followers: [{ id: 'paw', art: 'cat', target: followerPattern('egg') }], tray: ['egg'], solution: { paw: { shape: 'egg', phase: 0 } } };
    room.state = {}; room.build();
    expect(room.zones).toHaveLength(0);
    const part = room.parts[0]; part.at = 'paw'; room.state.paw = { shape: 'egg', phase: 0 };
    part.obj.callbacks.get('pointerup')({ getDistance: () => 0 });
    expect(room.state.paw.phase).toBe(1);
    room.dragSpecs[0].pick();
    expect(part.at).toBeNull();
    expect(room.state.paw).toBeUndefined();
  });

  it('Watch demonstrates both fast and slow dance scenarios', () => {
    const room = scene(new CardsRoom());
    room.def = { scenarios: [{ sensors: { fast: true }, moves: ['clap', 'spin'] }, { sensors: { fast: false }, moves: ['clap', 'wave'] }] };
    room.showDemo();
    expect(room.queue).toEqual(['clap', 'spin']);
    room.onQueueDone(); room.delayed.pop()();
    expect(room.row).toBe(1);
    expect(room.fast).toBe(false);
    expect(room.queue).toEqual(['clap', 'wave']);
  });

  it('repeat cards with equal counts show distinct colours and their one-card or two-card span', () => {
    const room = scene(new CardsRoom());
    room.def = { tray: [{ type: 'repeat', times: 2, span: 1 }, { type: 'repeat', times: 2, span: 2 }] };
    const pictures: Array<Array<{ width: number; height: number; colour: number }>> = [];
    room.add.graphics = () => {
      const picture: Array<{ width: number; height: number; colour: number }> = [];
      pictures.push(picture);
      const g = fake.object();
      let colour = 0;
      g.fillStyle = (next: number) => { colour = next; return g; };
      g.fillRoundedRect = (_x: number, _y: number, width: number, height: number) => {
        picture.push({ width, height, colour });
        return g;
      };
      return g;
    };
    room.def.tray.forEach((card: any) => room.makeCard(card, 0, 0));
    const spanCount = (picture: typeof pictures[number]) => picture.filter(p => Math.abs(p.width - 13 * 1.15) < .001 && Math.abs(p.height - 20 * 1.15) < .001).length;
    expect(pictures.map(spanCount)).toEqual([1, 2]);
    const faceColours = pictures.map(picture => picture.filter(p => p.width === 176 && p.height === 50).pop()!.colour);
    expect(faceColours[0]).not.toBe(faceColours[1]);
  });

  it('card edits invalidate a delayed playback continuation', () => {
    const room = scene(new CardsRoom());
    room.def = { scenarios: [{ moves: ['clap'] }, { moves: ['wave'] }] };
    room.showDemo();
    const oldDone = room.onQueueDone;
    room.stopPlayback(); oldDone();
    expect(room.queue).toEqual([]);
    expect(room.delayed).toHaveLength(0);
  });

  it('reference listening sounds the target pitch rather than the wrong placed pin', () => {
    const room = scene(new MusicRoom());
    room.def = { steps: 2, notes: 2, tempo: 1, melody: [[0, 1]] };
    room.state = new Set(['0:0']); room.melody = new Set(['0:1']);
    room.gridG = room.headG = room.comb = fake.object(); room.ring = [0, 0];
    vi.mocked(sfx.note).mockClear(); room.listen(); room.tick(.01);
    expect(sfx.note).toHaveBeenCalledWith(NOTE_FREQS[1], 'chime', .45);
    expect(sfx.note).not.toHaveBeenCalledWith(NOTE_FREQS[0], 'chime', .45);
    expect(room.state).toEqual(new Set(['0:0']));
  });

  it('matching pendulum lengths removes old phase drift from the completed bridge', () => {
    const room = scene(new PendulumRoom());
    room.def = { goal: 'sync', maxNotch: 9, minNotch: 1, pendulums: [{ id: 'a', notch: 5, fixed: true }, { id: 'b', notch: 2 }] };
    room.state = { pushed: false, pallet: false, notches: { a: 5, b: 5 } }; room.g = fake.object();
    room.views = [{ id: 'a', px: 450, py: 130, phase: 1.2, amp: .3, bob: fake.object() }, { id: 'b', px: 830, py: 130, phase: 3.8, amp: .38, bob: fake.object() }];
    room.tick(.016);
    expect(room.views[0].phase).toBeCloseTo(room.views[1].phase);
    expect(room.views[0].bob.y).toBeCloseTo(room.views[1].bob.y);
  });

  it('pushing the second Tinker bob also starts the reference bob that drives the clock', () => {
    const room = scene(new PendulumRoom());
    room.def = { goal: 'push', pallet: false };
    room.state = { pushed: false, pallet: false, notches: { a: 5, b: 2 } };
    room.views = [{ id: 'a', phase: 1.2, amp: 0, fixed: true }, { id: 'b', phase: 3.8, amp: 0, fixed: false }];
    room.push(room.views[1]);
    expect(room.views.every((view: any) => view.amp === .38)).toBe(true);
    expect(room.state.pushed).toBe(true);
  });
});
