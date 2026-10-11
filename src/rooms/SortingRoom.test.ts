/** The comparison result must agree with the drawn mechanics and actual selection controls. */
import { describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => {
  const object = (x = 0, y = 0, width = 0, height = 0) => {
    const target: any = { x, y, width, height, text: '', active: true, callbacks: new Map(), data: new Map(), calls: [] };
    let proxy: any;
    proxy = new Proxy(target, { get(o, key: string) {
      if (key in o) return o[key];
      return (...args: any[]) => {
        if (key === 'on') o.callbacks.set(args[0], args[1]);
        if (key === 'setText') o.text = args[0];
        if (key === 'setData') o.data.set(args[0], args[1]);
        if (key === 'getData') return o.data.get(args[0]);
        if (key === 'clear') o.calls.length = 0;
        else o.calls.push({ method: key, args });
        return proxy;
      };
    } });
    return proxy;
  };
  class Base {
    def: any; state: any; style = { id: 'engineer', numbers: true };
    fixed = false; launch = { mode: 'story' }; undoStack: Array<() => void> = []; zones: any[] = [];
    add = { graphics: () => object(), text: () => object(), zone: (x: number,y: number,w: number,h: number) => { const zone=object(x,y,w,h);this.zones.push(zone);return zone; } };
    act(undo?: () => void) { if (undo) this.undoStack.push(undo); }
  }
  return { object, Base };
});
vi.mock('phaser', () => ({ default: { Math: { Vector2: class { constructor(public x: number, public y: number) {} } } } }));
vi.mock('./RoomBase', () => ({ RoomBase: fake.Base, D: { mech:10,widget:30,trayPart:40 } }));
vi.mock('../audio/sfx', () => ({ click:vi.fn(),clunk:vi.fn(),pickUp:vi.fn(),nuhUh:vi.fn() }));
vi.mock('../art/finish', () => ({ rivet:vi.fn(),etchedPlate:vi.fn() }));
vi.mock('../art/generated', () => ({ withArt:vi.fn() }));
vi.mock('../art/sprites', () => ({ atlasFrame:vi.fn() }));
vi.mock('../ui/widgets', () => ({ FONT:'test',roundButton:()=>fake.object() }));
import { SortingRoom } from './ReasoningPuzzleRooms';
import { valve, valveMark } from '../art/reasoningPuzzleArt';

const create = (mode = 'weight') => {
  const room = new SortingRoom() as any;
  room.def = { mode,maxWeighings:2,items:[{id:'a',size:1,weight:4},{id:'b',size:.5,weight:1},{id:'c',size:.7,weight:6}] };
  room.state = { order:['a','b','c'],weighings:0 };
  room.build();room.refresh();return room;
};
const beam = (g: any) => {
  const index = g.calls.findIndex((c: any) => c.method === 'lineStyle' && c.args[0] === 6);
  return g.calls[index+1].args as number[];
};

describe('comparison scale and valve controls', () => {
  it.each([[4,1,1],[1,4,-1],[4,4,0]])('masses %s and %s lower the heavy pan with fixed-length arms', (left,right,direction) => {
    const room=create();room.def.items[0].weight=left;room.def.items[1].weight=right;
    room.state.comparison=['a','b'];const g=fake.object();room.drawScale(g);
    const [lx,ly,rx,ry]=beam(g);
    expect(Math.sign(ly-ry)).toBe(direction);
    expect(Math.hypot(lx-640,ly-222)).toBeCloseTo(100);
    expect(Math.hypot(rx-640,ry-222)).toBeCloseTo(100);
    const pans=g.calls.filter((c: any)=>c.method==='fillEllipse'&&c.args[2]===85);
    expect(pans.map((p: any)=>p.args[3])).toEqual([16,16]);
    expect(Math.sign(pans[0].args[1]-pans[1].args[1])).toBe(direction);
    expect(g.calls.filter((c: any)=>c.method==='fillCircle'&&c.args[2]===4).every((c: any)=>c.args[1]>447)).toBe(true);
    for(const [x,y] of [[lx,ly],[rx,ry]]) {
      const chains=g.calls.filter((c: any)=>c.method==='lineBetween'&&c.args[0]===x&&c.args[1]===y&&Math.abs(c.args[2]-x)===35&&c.args[3]>y);
      expect(chains).toHaveLength(2);
      expect(chains.map((c: any)=>c.args[2])).toEqual([x-35,x+35]);
    }
  });

  it('only Weigh charges the counter; changing selection hides an old result and swaps preserve valve identity', () => {
    const room=create();room.choose(0);room.choose(1);
    expect(room.state.weighings).toBe(0);room.weigh();expect(room.state.weighings).toBe(1);
    room.swap();expect(room.state.order).toEqual(['b','a','c']);expect(room.state.weighings).toBe(1);
    expect(room.state.comparison).toEqual(['a','b']);
    room.choose(0);const g=fake.object();room.drawScale(g);expect(beam(g)[1]).toBe(beam(g)[3]);
    expect(room.drawing.getData('sortingScale').left.id).toBeUndefined();
    room.choose(1);room.weigh();expect(room.state.comparison).toEqual(['b','a']);
    const counter=room.status.text;expect(counter).toContain('2 / 2');room.weigh();
    expect(room.state.weighings).toBe(2);expect(room.status.text).toBe(counter);
  });

  it('valve taps cover tall glass, stay below the scale and reject a dragging gesture', () => {
    const weights=create(),zone=weights.zones[0];
    expect(zone.y-zone.height/2).toBeGreaterThan(306);
    zone.callbacks.get('pointerup')({getDistance:()=>100});expect(weights.chosen).toEqual([]);
    zone.callbacks.get('pointerup')({getDistance:()=>0});expect(weights.chosen).toEqual([0]);
    const sizes=create('size'),tall=sizes.zones[0];
    expect(tall.y-tall.height/2).toBeLessThanOrEqual(436-145-12);
    expect(tall.y+tall.height/2).toBeGreaterThanOrEqual(447);
  });

  it('six valves use distinct nonnumeric identity symbols instead of counted mass dots', () => {
    const signatures=Array.from({length:6},(_,code)=>{
      const g=fake.object();valveMark(g,0,0,code);
      return JSON.stringify(g.calls.filter((c: any)=>!['fillStyle','fillRoundedRect'].includes(c.method)));
    });
    expect(new Set(signatures).size).toBe(6);
    for(let code=0;code<6;code++) {
      const row=fake.object(),pan=fake.object();valve(row,0,0,103,false,code);valve(pan,0,0,35,false,code);
      expect([row,pan].every(g=>!g.calls.some((c: any)=>c.method==='fillCircle'&&c.args[2]===1.5))).toBe(true);
    }
  });
});
