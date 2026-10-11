/** Regression tests exercise scene state and drawing commands, beyond authored-engine solutions. */
import { describe, expect, it, vi } from 'vitest';
import { parseGrid, solveCircuit } from '../mechanism/flow';
import { parseLightGrid } from '../mechanism/light';
import { CM } from '../art/copperMoss';

vi.mock('phaser', () => ({ default: { Math: { Vector2: class { constructor(public x: number, public y: number) {} } }, Geom: { Rectangle: class {} }, BlendModes: { ADD: 1 } } }));
vi.mock('./RoomBase', () => ({ D: {}, RoomBase: class {
  fixed = false; style = { id: 'engineer', numbers: false }; undoStack: Array<() => void> = [];
  launch = { mode: 'room' }; act(undo?: () => void) { if (undo) this.undoStack.push(undo); }
  sparkleAt() {} constructor(_key: string) {}
} }));
vi.mock('../audio/sfx', () => ({ ratchet: vi.fn(), sproing: vi.fn(), sparkle: vi.fn(), note: vi.fn(), tick: vi.fn() }));
vi.mock('../ui/widgets', () => ({ FONT: 'Arial', roundButton: vi.fn() }));
vi.mock('../art/Kip', () => ({ star: vi.fn() }));
vi.mock('../art/textures', () => ({ ensureGearTexture: vi.fn() }));
vi.mock('../art/parts', () => ({ drawPart: vi.fn() }));
vi.mock('../art/generated', () => ({ withArt: vi.fn() }));
vi.mock('../art/sprites', () => ({ atlasFrame: vi.fn(), objectArt: vi.fn() }));
vi.mock('../art/portraits', () => ({ Portrait: class {} }));
vi.mock('../core/save', () => ({ profile: vi.fn(), persistSoon: vi.fn() }));
vi.mock('../core/progress', () => ({ setFlag: vi.fn() }));
vi.mock('../content/index', () => ({ quickFixOf: vi.fn() }));
vi.mock('./fiddles', () => ({ puffAt: vi.fn() }));
import { LightRoom } from './LightRoom';
import { FlowRoom } from './FlowRoom';
import { GearRoom } from './GearRoom';
import { OilRoom } from './OilRoom';
import { PackingRoom, SymmetryRoom } from './SpatialPuzzleRooms';

function graphics(): any {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const g: any = new Proxy({ calls }, { get(target, key) {
    if (key === 'calls') return target.calls;
    return (...args: unknown[]) => { calls.push({ method: String(key), args }); return g; };
  } });
  return g;
}

describe('instructions agree with live puzzle visuals and recovery', () => {
  it('a wrong-colour filter still gets a corrective hint', () => {
    const room = new LightRoom() as any;
    room.state = parseLightGrid(['A1 _=Fg D0g']); room.S = 100; room.ox = 0; room.oy = 0;
    room.optics = [{ kind: 'F', color: 'r', rot: 0, cell: 1, obj: { x: 150, y: 50 } }, { kind: 'F', color: 'g', rot: 0, cell: null, obj: { x: 400, y: 600 } }];
    room.state.cells[1].kind = 'F'; room.state.cells[1].color = 'r';
    expect(room.hintTarget()).toEqual({ from: { x: 400, y: 600 }, to: { x: 150, y: 50 } });
    expect(room.matchesSlot(room.optics[0], 1)).toBe(false);
    expect(room.matchesSlot(room.optics[1], 1)).toBe(true);
  });

  it('a rotatable lamp can reach south and west and undo restores its exact direction', () => {
    const room = new LightRoom() as any; room.state = parseLightGrid(['A0r .']); room.evaluate = vi.fn();
    room.flip(0); room.flip(0); expect(room.state.cells[0].rot).toBe(2);
    room.flip(0); expect(room.state.cells[0].rot).toBe(3);
    room.undoStack.pop()(); expect(room.state.cells[0].rot).toBe(2);
  });

  it('a replacement tube visibly lights from its actual circuit voltage', () => {
    const room = new FlowRoom() as any;
    room.def = { id: 'qf-archive-4-3', family: 'circuit' }; room.S = 100;
    room.state = parseGrid(['L1 O1! L2', 'B0 . I0', 'L0 I1 L3']);
    room.state.cells[1].slot = true; room.circ = solveCircuit(room.state);
    expect(room.circ.success).toBe(true);
    const g = graphics(); room.drawPart({ kind: 'O', rot: 1, cell: 1, g });
    expect(g.calls.some((c: any) => c.method === 'fillStyle' && c.args[0] === CM.glow && c.args[1] === 0.85)).toBe(true);
  });

  it('a turned fuse draws its working filament between its horizontal wire ends', () => {
    const room = new FlowRoom() as any; room.def = { id: 'fuse', family: 'circuit' }; room.S = 100; room.circ = { components: [], blown: [] };
    const g = graphics(); room.drawTile(g, parseGrid(['F1']).cells[0], 0, 0, 0);
    expect(g.calls.some((c: any) => c.method === 'lineBetween' && c.args.join(',') === '25,0,-25,0')).toBe(true);
  });

  it('clock hands stop together while their output shaft is disconnected', () => {
    const room = new GearRoom() as any; room.views = []; room.drawDriver = vi.fn(); room.drawWidget = vi.fn();
    room.evalR = { omegaIn: 1, outputs: [{ omega: 0 }] }; room.widgets = [{ out: { widget: 'hands', ratio: 1 / 12 }, a: 0.5, b: 0.7 }];
    room.tick(1); expect(room.widgets[0].a).toBe(0.5); expect(room.widgets[0].b).toBe(0.7);
    room.evalR.outputs[0].omega = 1 / 12; room.tick(1); expect(room.widgets[0].a).toBeCloseTo(0.5 + 1 / 12); expect(room.widgets[0].b).toBeCloseTo(1.7);
  });

  it.each(['tinker', 'fixer', 'engineer'])('holding the crank is usable in %s mode', (style) => {
    const room = new OilRoom() as any; room.style.id = style; room.def = { crank: { x: 640, y: 300, turns: 2 } }; room.state = { turns: 0, oiled: new Set() }; room.holding = true;
    for (let frame = 0; frame < 120; frame++) room.tick(1 / 60);
    expect(room.state.turns).toBe(1);
  });

  it('a piece hint asks for selection and turning before requesting an impossible drop', () => {
    const room = new PackingRoom() as any; room.def = { solution: [{ id: 'parcel', x: 0, y: 0, turn: 1 }] }; room.state = [];
    room.parts = [{ piece: { id: 'parcel' }, turn: 0, obj: { x: 450, y: 598 } }]; room.turnButton = { x: 1070, y: 596 };
    expect(room.hintTarget()).toEqual({ to: { x: 450, y: 598 } });
    room.selected = 'parcel'; expect(room.hintTarget().to).toEqual({ x: 1070, y: 596 });
  });

  it('a complete symmetry pattern with an extra decoration still has a removal hint', () => {
    const room = new SymmetryRoom() as any; room.def = { size: 2, solution: [{ at: 0, token: 'gold-star' }, { at: 1, token: 'gold-star' }] };
    room.state = { 0: 'gold-star', 1: 'gold-star', 3: 'purple-flower' }; room.S = 100; room.ox = 0; room.oy = 0;
    room.tokens = [{ token: 'purple-flower', home: { x: 800, y: 600 } }];
    expect(room.hintTarget()).toEqual({ to: { x: 800, y: 600 } });
    room.selected = 'purple-flower'; expect(room.hintTarget()).toEqual({ to: { x: 150, y: 150 } });
  });
});
