/**
 * Attic room generators (GDD §16). Every room is built solved first and then
 * taken apart, so it is solvable by construction; each generator re-rolls
 * until the authored solution works through its engine and the starting
 * state does not. Same seed → same room, always.
 */
import { opp, type Dir } from '../mechanism/flow';
import { collides, meshedPosition, meshes, type GearNode } from '../mechanism/graph';
import type { GateType, LogicNode } from '../mechanism/logic';
import { int, mulberry32, pick, shuffle, type Rng } from '../mechanism/rng';
import { effective, initialState, isSolved, solutionState } from '../rules';
import type {
  FlowRoomDef,
  GearRoomDef,
  LightRoomDef,
  LogicRoomDef,
  LogicRoomNode,
  RoomDef,
  ThemeId,
} from './types';

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

interface Meta {
  id: string;
  title: string;
  theme?: ThemeId;
}

const base = (m: Meta) => ({
  id: m.id,
  title: m.title,
  theme: m.theme ?? ('attic' as ThemeId),
  pedia: [] as string[],
  clever: { kind: 'par' as const },
});

// ───────────────────────────── gears ─────────────────────────────

const TEETH = [10, 12, 14, 16, 18, 20, 24, 28, 32];

function tryGear(rng: Rng, m: Meta): GearRoomDef | null {
  const n = int(rng, 4, 6);
  const nodes: GearNode[] = [];
  const first = { id: 's0', teeth: pick(rng, [24, 28, 32]), x: 250, y: int(rng, 300, 420) };
  nodes.push(first);
  for (let i = 1; i < n; i++) {
    let placed = false;
    for (let tries = 0; tries < 40 && !placed; tries++) {
      const teeth = pick(rng, TEETH);
      const ang = int(rng, -70, 70);
      const pos = meshedPosition(nodes[i - 1], teeth, ang);
      const r = teeth * 2.5 + 6;
      if (pos.x - r < 170 || pos.x + r > 1090 || pos.y - r < 130 || pos.y + r > 540) continue;
      const cand: GearNode = { id: `s${i}`, teeth, ...pos };
      const ok = nodes.every((o, k) => (k === i - 1 ? !collides(cand, o) : !collides(cand, o) && !meshes(cand, o)));
      if (ok) {
        nodes.push(cand);
        placed = true;
      }
    }
    if (!placed) return null;
  }
  const last = nodes[nodes.length - 1];
  if (last.x < 700) return null;
  const middle = nodes.slice(1, -1).map((_, k) => k + 1);
  const holes = shuffle(rng, middle).slice(0, Math.min(middle.length, int(rng, 1, 2)));
  const solTeeth = holes.map((k) => nodes[k].teeth);
  const decoys = shuffle(
    rng,
    TEETH.filter((t) => !solTeeth.includes(t)),
  ).slice(0, 2);
  const def: GearRoomDef = {
    ...base(m),
    kind: 'gear',
    families: ['gears'],
    intro: 'Power stops before the dial. Find the gears that reach both neighbours.',
    hints: [
      'Peek! Where does the golden power stop?',
      'A gear must touch both of its neighbours to pass the turning on.',
      'Try the gear whose size fills the gap exactly.',
    ],
    shafts: nodes.map((g, k) => ({
      id: g.id,
      x: Math.round(g.x * 100) / 100,
      y: Math.round(g.y * 100) / 100,
      peg: holes.includes(k) || undefined,
      gears: holes.includes(k) ? undefined : [{ teeth: g.teeth, paint: pick(rng, ['brass', 'copper', 'steel'] as const) }],
    })),
    driver: { shaft: 's0', source: pick(rng, ['crank', 'spring', 'weights'] as const), turnsPerSecond: 0.2 },
    outputs: [{ shaft: last.id, widget: 'dial', at: { x: Math.min(1060, last.x + 40), y: Math.max(160, last.y - 120) } }],
    tray: shuffle(rng, [...solTeeth, ...decoys]),
    solution: holes.map((k) => ({ shaft: nodes[k].id, layer: 0, teeth: nodes[k].teeth })),
  };
  // Shaft positions were rounded: make sure everything still meshes.
  return def;
}

// ───────────────────────────── tile paths ─────────────────────────────

/** Tile kind + rotation that joins exactly these sides. */
function tileFor(a: Dir, b: Dir): { kind: 'I' | 'L'; rot: number } {
  if (a === opp(b)) return { kind: 'I', rot: a % 2 === 0 ? 0 : 1 };
  // L rot r joins r and r+1
  for (let r = 0; r < 4; r++) {
    const s = [r, (r + 1) % 4];
    if (s.includes(a) && s.includes(b)) return { kind: 'L', rot: r };
  }
  return { kind: 'I', rot: 0 };
}

function dirTo(ax: number, ay: number, bx: number, by: number): Dir {
  if (bx > ax) return 1;
  if (bx < ax) return 3;
  if (by > ay) return 2;
  return 0;
}

/** Random self-avoiding walk from (sx,sy) to any cell in the target column. */
function walk(rng: Rng, cols: number, rows: number, sx: number, sy: number, tx: number, minLen: number): Array<[number, number]> | null {
  const path: Array<[number, number]> = [[sx, sy]];
  const seen = new Set([`${sx},${sy}`]);
  let budget = 3000;
  const step = (): boolean => {
    if (--budget < 0) return false;
    const [x, y] = path[path.length - 1];
    if (x === tx && path.length >= minLen) return true;
    if (path.length > cols * rows) return false;
    const dirs = shuffle(rng, [0, 1, 2, 3]).sort((a, b) => (b === 1 ? 1 : 0) - (a === 1 ? 1 : 0));
    for (const d of dirs) {
      if (rng() < 0.25 && d === 1) continue;
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen.has(`${nx},${ny}`)) continue;
      if (nx > tx) continue;
      path.push([nx, ny]);
      seen.add(`${nx},${ny}`);
      if (step()) return true;
      path.pop();
      seen.delete(`${nx},${ny}`);
    }
    return false;
  };
  return step() ? path : null;
}

type Cell = string;

function emptyGrid(cols: number, rows: number): Cell[][] {
  return Array.from({ length: rows }, () => new Array<Cell>(cols).fill('.'));
}

/** Turn some path tiles into drawer slots and scramble others. */
function scramble(rng: Rng, grid: Cell[][], cells: Array<{ x: number; y: number; kind: string; rot: number }>, holes: number, twists: number): string[] {
  const order = shuffle(rng, cells);
  const tray: string[] = [];
  order.slice(0, holes).forEach((c) => {
    grid[c.y][c.x] = `_=${c.kind}${c.rot}`;
    tray.push(c.kind);
  });
  order.slice(holes, holes + twists).forEach((c) => {
    const wrong = (c.rot + 1 + int(rng, 0, 1) * 2) % 4;
    grid[c.y][c.x] = `${c.kind}${wrong}r=${c.rot}`;
  });
  return tray;
}

function tryPipes(rng: Rng, m: Meta): FlowRoomDef | null {
  const cols = 8;
  const rows = 5;
  const sy = int(rng, 0, rows - 1);
  const path = walk(rng, cols, rows, 0, sy, cols - 1, 9);
  if (!path) return null;
  const grid = emptyGrid(cols, rows);
  const cells: Array<{ x: number; y: number; kind: string; rot: number }> = [];
  path.forEach(([x, y], i) => {
    if (i === 0) {
      const d = dirTo(x, y, path[1][0], path[1][1]);
      grid[y][x] = `W${d}`;
      return;
    }
    const din = dirTo(x, y, path[i - 1][0], path[i - 1][1]);
    if (i === path.length - 1) {
      grid[y][x] = `K${din}!`;
      return;
    }
    const dout = dirTo(x, y, path[i + 1][0], path[i + 1][1]);
    const t = tileFor(din, dout);
    grid[y][x] = `${t.kind}${t.rot}`;
    cells.push({ x, y, ...t });
  });
  const tray = scramble(rng, grid, cells, int(rng, 2, 3), int(rng, 2, 4));
  // a little junk around the pipes (blocks)
  for (let k = 0; k < 4; k++) {
    const x = int(rng, 0, cols - 1);
    const y = int(rng, 0, rows - 1);
    if (grid[y][x] === '.') grid[y][x] = '#';
  }
  tray.push(pick(rng, ['T', 'I', 'L']));
  return {
    ...base(m),
    kind: 'flow',
    family: 'pipes',
    families: ['pipes'],
    intro: 'Send the water from the tank all the way to the cup.',
    hints: ['Follow the water. Where does it stop?', 'Turn the pipes so their ends line up.', 'Fill the empty spots with the matching pipe shapes.'],
    grid: grid.map((r) => r.join(' ')),
    tray: shuffle(rng, tray),
  };
}

/** A loop of cells around a rectangle (clockwise), starting top-left. */
function rectLoop(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let x = x0; x <= x1; x++) out.push([x, y0]);
  for (let y = y0 + 1; y <= y1; y++) out.push([x1, y]);
  for (let x = x1 - 1; x >= x0; x--) out.push([x, y1]);
  for (let y = y1 - 1; y > y0; y--) out.push([x0, y]);
  return out;
}

function loopSides(loop: Array<[number, number]>, i: number): [Dir, Dir] {
  const n = loop.length;
  const [x, y] = loop[i];
  const p = loop[(i - 1 + n) % n];
  const q = loop[(i + 1) % n];
  return [dirTo(x, y, p[0], p[1]), dirTo(x, y, q[0], q[1])];
}

function tryCircuit(rng: Rng, m: Meta): FlowRoomDef | null {
  const cols = 7;
  const rows = 5;
  const x0 = int(rng, 0, 1);
  const y0 = int(rng, 0, 1);
  const x1 = int(rng, x0 + 3, cols - 1);
  const y1 = int(rng, y0 + 2, rows - 1);
  const loop = rectLoop(x0, y0, x1, y1);
  const grid = emptyGrid(cols, rows);
  const cells: Array<{ x: number; y: number; kind: string; rot: number }> = [];
  // battery on the left side, bulb(s) on the right / top
  const leftIdx = loop.findIndex(([x, y]) => x === x0 && y > y0 && y < y1);
  const rightIdx = loop.findIndex(([x, y]) => x === x1 && y > y0 && y < y1);
  const topIdx = loop.findIndex(([x, y]) => y === y0 && x > x0 && x < x1);
  const twoBulbs = rng() < 0.5;
  const withSwitch = rng() < 0.5;
  const botIdx = loop.findIndex(([x, y]) => y === y1 && x > x0 && x < x1);
  loop.forEach(([x, y], i) => {
    const [a, b] = loopSides(loop, i);
    if (i === leftIdx) grid[y][x] = 'B0';
    else if (i === rightIdx) grid[y][x] = 'O0!';
    else if (twoBulbs && i === topIdx) grid[y][x] = 'O1!';
    else if (withSwitch && i === botIdx) grid[y][x] = 'V1t=s';
    else {
      const t = tileFor(a, b);
      grid[y][x] = `${t.kind}${t.rot}`;
      cells.push({ x, y, ...t });
    }
  });
  const tray = scramble(rng, grid, cells, int(rng, 1, 3), int(rng, 1, 3));
  tray.push(pick(rng, ['T', 'I', 'L']));
  return {
    ...base(m),
    kind: 'flow',
    family: 'circuit',
    families: ['circuits'],
    intro: 'Electricity needs a whole loop. Close the circle so the bulbs glow.',
    hints: ['Peek: the sparks race round until the loop breaks.', 'Wires must join end to end, all the way back to the Spark Cell.', 'Fill the gaps, turn the twisted wires, and flick the switch on.'],
    grid: grid.map((r) => r.join(' ')),
    tray: shuffle(rng, tray),
  };
}

function tryTracks(rng: Rng, m: Meta): FlowRoomDef | null {
  const cols = 7;
  const rows = 5;
  const x0 = int(rng, 0, 1);
  const y0 = int(rng, 1, 1);
  const x1 = int(rng, x0 + 3, cols - 2);
  const y1 = int(rng, y0 + 2, rows - 2);
  const loop = rectLoop(x0, y0, x1, y1);
  const grid = emptyGrid(cols, rows);
  const cells: Array<{ x: number; y: number; kind: string; rot: number }> = [];
  const startIdx = loop.findIndex(([x, y]) => y === y0 && x > x0 && x < x1);
  // rotate the loop so the start station is first
  const ordered = [...loop.slice(startIdx), ...loop.slice(0, startIdx)];
  const stationIdx = ordered.findIndex(([x, y]) => y === y1 && x > x0 && x < x1);
  const corners = ordered.map((_, i) => i).filter((i) => {
    const [a, b] = loopSides(ordered, i);
    return a !== opp(b);
  });
  const pointsAt = pick(rng, corners);
  ordered.forEach(([x, y], i) => {
    const [a, b] = loopSides(ordered, i);
    if (i === 0) grid[y][x] = `S${b}@t`;
    else if (i === stationIdx) grid[y][x] = `P${a % 2 === 0 ? 0 : 1}@hill`;
    else if (i === pointsAt) {
      // points: stem faces where the train comes from, curve continues the loop, straight runs into a buffer
      const s = a;
      const straight = opp(s);
      const kind = b === (s + 3) % 4 ? 'Z' : 'Y';
      const rot = (s + 2) % 4;
      grid[y][x] = `${kind}${rot}t=s`;
      const sx = x + DX[straight];
      const sy = y + DY[straight];
      if (sx >= 0 && sy >= 0 && sx < cols && sy < rows && grid[sy][sx] === '.') grid[sy][sx] = `E${opp(straight)}`;
    } else {
      const t = tileFor(a, b);
      grid[y][x] = `${t.kind}${t.rot}`;
      cells.push({ x, y, ...t });
    }
  });
  const tray = scramble(rng, grid, cells, int(rng, 1, 2), int(rng, 1, 2));
  tray.push(pick(rng, ['I', 'L']));
  return {
    ...base(m),
    kind: 'flow',
    family: 'tracks',
    families: ['tracks'],
    intro: 'Mend the track and set the points so the train goes all the way round.',
    hints: ['Watch where the train bumps to a stop.', 'Tracks must join up. Tap the points to change the way.', 'Fill the gaps and send the train round the curve.'],
    grid: grid.map((r) => r.join(' ')),
    tray: shuffle(rng, tray),
    trains: [{ train: 't', visit: ['hill'], end: 'loop' }],
  };
}

// ───────────────────────────── light ─────────────────────────────

function reflectRot(din: number, dout: number): number | null {
  if ([1, 0, 3, 2][din] === dout) return 0;
  if ([3, 2, 1, 0][din] === dout) return 1;
  return null;
}

function tryLight(rng: Rng, m: Meta): LightRoomDef | null {
  const cols = 8;
  const rows = 5;
  const grid = emptyGrid(cols, rows);
  let x = 0;
  let y = int(rng, 0, rows - 1);
  let dir = 1;
  grid[y][x] = `A${dir}`;
  const used = new Set([`${x},${y}`]);
  const mirrors: Array<{ x: number; y: number; rot: number }> = [];
  const turns = int(rng, 2, 4);
  let end: [number, number] | null = null;
  for (let t = 0; t <= turns; t++) {
    const len = int(rng, 1, 3);
    for (let k = 0; k < len; k++) {
      const nx = x + DX[dir];
      const ny = y + DY[dir];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || used.has(`${nx},${ny}`)) return null;
      x = nx;
      y = ny;
      used.add(`${x},${y}`);
    }
    if (t === turns) {
      end = [x, y];
      break;
    }
    const nd = pick(rng, [(dir + 1) % 4, (dir + 3) % 4]);
    const rot = reflectRot(dir, nd);
    if (rot === null) return null;
    mirrors.push({ x, y, rot });
    dir = nd;
  }
  if (!end) return null;
  const variant = pick(rng, ['plain', 'colour', 'focus'] as const);
  grid[end[1]][end[0]] = variant === 'colour' ? 'D0g' : variant === 'focus' ? 'D0f' : 'D0';
  const tray: string[] = [];
  shuffle(rng, mirrors).forEach((mm, k) => {
    if (k < 2) {
      grid[mm.y][mm.x] = `_0=R${mm.rot}`;
      tray.push('R');
    } else grid[mm.y][mm.x] = `R${1 - mm.rot}r=${mm.rot}`;
  });
  // the colour / focus part sits on a straight stretch of the beam
  if (variant !== 'plain') {
    const straight = [...used].map((s) => s.split(',').map(Number)).filter(([cx, cy]) => grid[cy][cx] === '.');
    if (!straight.length) return null;
    const [fx, fy] = pick(rng, straight);
    grid[fy][fx] = variant === 'colour' ? '_0=Fg' : '_0=N';
    tray.push(variant === 'colour' ? 'Fg' : 'N');
    tray.push(variant === 'colour' ? 'Fr' : 'R');
  }
  for (let k = 0; k < 5; k++) {
    const wx = int(rng, 0, cols - 1);
    const wy = int(rng, 0, rows - 1);
    if (grid[wy][wx] === '.' && !used.has(`${wx},${wy}`)) grid[wy][wx] = '#';
  }
  return {
    ...base(m),
    kind: 'light',
    families: ['light'],
    intro: 'Bounce the lamp light onto the sleepy sensor.',
    hints: ['Light goes in straight lines. Where does it hit the wall?', 'Mirrors turn light round corners. Tap a mirror to flip it.', 'Put mirrors where the beam needs to turn.'],
    grid: grid.map((r) => r.join(' ')),
    tray: shuffle(rng, tray),
  };
}

// ───────────────────────────── logic ─────────────────────────────

function tryLogic(rng: Rng, m: Meta): LogicRoomDef | null {
  const three = rng() < 0.6;
  const ins = three ? ['a', 'b', 'c'] : ['a', 'b'];
  const g1: GateType = pick(rng, ['AND', 'OR']);
  const g2: GateType = pick(rng, ['AND', 'OR']);
  const flip = rng() < 0.5;
  const nodes: LogicRoomNode[] = ins.map((id, i) => ({ id, kind: 'input', x: 260, y: 200 + i * (three ? 130 : 180), art: pick(rng, ['lever', 'plate', 'button'] as const) }));
  const op = (g: GateType) => (g === 'AND' ? '&' : '|');
  let expr: string;
  const gates: Record<string, GateType> = {};
  if (three) {
    nodes.push({ id: 'g1', kind: 'gate', gate: g1, inputs: ['a', 'b'], x: 520, y: 265 });
    gates.g1 = g1;
    let cSrc = 'c';
    if (flip) {
      nodes.push({ id: 'n1', kind: 'gate', gate: 'NOT', inputs: ['c'], x: 520, y: 460 });
      gates.n1 = 'NOT';
      cSrc = 'n1';
    }
    nodes.push({ id: 'g2', kind: 'gate', gate: g2, inputs: ['g1', cSrc], x: 760, y: 360 });
    gates.g2 = g2;
    expr = `(a ${op(g1)} b) ${op(g2)} ${flip ? '!c' : 'c'}`;
    nodes.push({ id: 'out', kind: 'output', inputs: ['g2'], x: 980, y: 360, art: pick(rng, ['lamp', 'door', 'flag'] as const) });
  } else {
    let aSrc = 'a';
    if (flip) {
      nodes.push({ id: 'n1', kind: 'gate', gate: 'NOT', inputs: ['a'], x: 500, y: 200 });
      gates.n1 = 'NOT';
      aSrc = 'n1';
    }
    nodes.push({ id: 'g1', kind: 'gate', gate: g1, inputs: [aSrc, 'b'], x: 720, y: 290 });
    gates.g1 = g1;
    expr = `${flip ? '!a' : 'a'} ${op(g1)} b`;
    nodes.push({ id: 'out', kind: 'output', inputs: ['g1'], x: 960, y: 290, art: pick(rng, ['lamp', 'door', 'flag'] as const) });
  }
  const gateIds = Object.keys(gates);
  const slotIds = shuffle(rng, gateIds).slice(0, Math.min(gateIds.length, three ? 2 : gateIds.length));
  for (const n of nodes) {
    if (slotIds.includes(n.id)) {
      n.slot = true;
      delete (n as LogicNode).gate;
    }
  }
  const tray = shuffle(rng, [...slotIds.map((id) => gates[id]), pick(rng, ['AND', 'OR', 'NOT'] as GateType[])]);
  return {
    ...base(m),
    kind: 'logic',
    families: ['logic'],
    intro: 'Build the gates so the marble reaches the end exactly when it should.',
    hints: ['Try the levers and watch the marbles roll.', '"Both" needs two marbles. "Either" needs one. "Flip" does the opposite.', 'Read the rule on the plaque and match each gate to it.'],
    nodes,
    tray,
    goal: { kind: 'truth', output: 'out', expr },
    solution: { gates: Object.fromEntries(slotIds.map((id) => [id, gates[id]])) },
  };
}

// ───────────────────────────── entry ─────────────────────────────

export type GenKind = 'gear' | 'pipes' | 'circuit' | 'tracks' | 'light' | 'logic';

const GENS: Record<GenKind, (rng: Rng, m: Meta) => RoomDef | null> = {
  gear: tryGear,
  pipes: tryPipes,
  circuit: tryCircuit,
  tracks: tryTracks,
  light: tryLight,
  logic: tryLogic,
};

function valid(def: RoomDef): boolean {
  for (const style of ['fixer', 'engineer'] as const) {
    const eff = effective(def, style);
    if (!isSolved(eff as never, solutionState(eff as never, style), style)) return false;
    if (isSolved(eff as never, initialState(eff as never), style)) return false;
  }
  return true;
}

/** Generate a room; deterministic for a given seed. */
export function generateRoom(kind: GenKind, seed: number, meta: Meta): RoomDef {
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < 400; attempt++) {
    const def = GENS[kind](rng, meta);
    if (def && valid(def)) return def;
  }
  throw new Error(`Could not generate a ${kind} room for seed ${seed}`);
}
