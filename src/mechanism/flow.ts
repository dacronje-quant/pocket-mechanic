/**
 * Tile-grid mechanisms: pipes (water/steam), circuits (wires, bulbs, switches,
 * Snap Links) and toy-train tracks share one grid model.
 *
 * A tile has "ports" on its four sides (N E S W). Ports inside one channel are
 * joined; touching ports of neighbouring tiles are joined. Joined ports form a
 * "net" (a pipe network, or one piece of wire). Each family then reads the nets
 * in its own way:
 *   - pipes:    any net touching a source is wet
 *   - circuits: nodal analysis with the battery as a 1-volt source
 *   - tracks:   a train follows channels tile by tile
 *
 * Rooms are authored as text, one token per cell:
 *   <letter><rot 0-3><flags>[=<solution>][@id]
 * Letters: . nothing  # block  _ empty slot
 *   I straight  L corner  T tee  + junction  X crossing  E end cap
 *   W source (tank/boiler)   K sink (cup/tank/piston)   V valve or switch
 *   Z track points (curve to the right)  Y points (curve to the left)  B battery  O bulb  Q bell  M motor  F Snap Link
 *   S train start station    P station
 * Flags: r rotatable, t tap-to-toggle, s state on, ! required, x must stay off,
 *        b must be bright (circuits)
 * Solution after '=': [letter][rot][s|u], e.g. `L2r=1`, `_=I1`, `V0t=s`.
 */

export type Dir = 0 | 1 | 2 | 3;
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const opp = (d: number): Dir => ((d + 2) % 4) as Dir;
const rotDir = (d: number, r: number): Dir => ((((d + r) % 4) + 4) % 4) as Dir;

export const TILE_LETTERS = '#_ILT+XEWKVZYBOQMFSP';
export type TileKind =
  | '#' | '_' | 'I' | 'L' | 'T' | '+' | 'X' | 'E' | 'W' | 'K' | 'V' | 'Z' | 'Y' | 'B' | 'O' | 'Q' | 'M' | 'F' | 'S' | 'P';

export interface Tile {
  kind: TileKind;
  rot: number;
  rotatable: boolean;
  toggle: boolean;
  state: boolean;
  required: boolean;
  forbidden: boolean;
  bright: boolean;
  /** This cell accepts a part from the tray. */
  slot: boolean;
  id?: string;
  sol?: { kind?: TileKind; rot?: number; state?: boolean };
}

export interface Grid {
  cols: number;
  rows: number;
  cells: Array<Tile | null>;
}

const TOKEN = /^([.#_ILT+XEWKVZYBOQMFSP])([0-3])?([rtsxb!]*)(?:=([_ILT+XEWKVZYBOQMFSP])?([0-3])?([su])?)?(?:@(\w+))?$/;

export function parseTile(tok: string): Tile | null {
  const m = TOKEN.exec(tok);
  if (!m) throw new Error(`Bad tile token "${tok}"`);
  const [, letter, rot, flags = '', sk, sr, ss, id] = m;
  if (letter === '.') return null;
  const t: Tile = {
    kind: letter as TileKind,
    rot: rot ? Number(rot) : 0,
    rotatable: flags.includes('r'),
    toggle: flags.includes('t'),
    state: flags.includes('s'),
    required: flags.includes('!'),
    forbidden: flags.includes('x'),
    bright: flags.includes('b'),
    slot: letter === '_',
    id,
  };
  if (sk || sr || ss) {
    t.sol = {};
    if (sk) t.sol.kind = sk as TileKind;
    if (sr) t.sol.rot = Number(sr);
    if (ss) t.sol.state = ss === 's';
  }
  return t;
}

export function parseGrid(rows: string[]): Grid {
  const tokens = rows.map((r) => r.trim().split(/\s+/));
  const cols = Math.max(...tokens.map((r) => r.length));
  const cells: Array<Tile | null> = [];
  for (const row of tokens) {
    for (let x = 0; x < cols; x++) cells.push(row[x] ? parseTile(row[x]) : null);
  }
  return { cols, rows: tokens.length, cells };
}

export function cloneGrid(g: Grid): Grid {
  return { cols: g.cols, rows: g.rows, cells: g.cells.map((c) => (c ? { ...c, sol: c.sol ? { ...c.sol } : undefined } : null)) };
}

/** Put every tile into its authored solution state (used by tests and the debug auto-solver). */
export function applySolution(g: Grid): Grid {
  const out = cloneGrid(g);
  for (const t of out.cells) {
    if (!t || !t.sol) continue;
    if (t.sol.kind) t.kind = t.sol.kind;
    if (t.sol.rot !== undefined) t.rot = t.sol.rot;
    if (t.sol.state !== undefined) t.state = t.sol.state;
  }
  return out;
}

export const cellIndex = (g: Grid, x: number, y: number): number => y * g.cols + x;
export const inGrid = (g: Grid, x: number, y: number): boolean => x >= 0 && y >= 0 && x < g.cols && y < g.rows;

/** Channels (groups of joined sides) for a tile, already rotated. */
export function channels(t: Tile): Dir[][] {
  const r = t.rot;
  const ch = (...groups: number[][]) => groups.map((g) => g.map((d) => rotDir(d, r)));
  switch (t.kind) {
    case 'I':
    case 'S':
    case 'P':
      return ch([0, 2]);
    case 'L':
      return ch([0, 1]);
    case 'T':
      return ch([0, 1, 2]);
    case '+':
      return ch([0, 1, 2, 3]);
    case 'X':
      return ch([0, 2], [1, 3]);
    case 'E':
    case 'W':
    case 'K':
      return ch([0]);
    case 'V':
      return t.state ? ch([0, 2]) : ch([0], [2]);
    case 'Z':
      // points: stem S, straight branch N, curved branch E (trains use their own rule)
      return t.state ? ch([2, 1], [0]) : ch([2, 0], [1]);
    case 'Y':
      // mirrored points: stem S, straight branch N, curved branch W
      return t.state ? ch([2, 3], [0]) : ch([2, 0], [3]);
    case 'B':
    case 'O':
    case 'Q':
    case 'M':
    case 'F':
      return ch([0], [2]);
    default:
      return [];
  }
}

export function ports(t: Tile): Dir[] {
  return channels(t).flat();
}

export function hasPort(t: Tile | null, d: number): boolean {
  return !!t && ports(t).includes(d as Dir);
}

// ───────────────────────────── nets (union-find) ─────────────────────────────

export interface Nets {
  /** port id = cell*4 + dir */
  find: (port: number) => number;
  /** ports that face a neighbour with no matching port */
  openEnds: number[];
}

export function buildNets(g: Grid): Nets {
  const parent = new Int32Array(g.cells.length * 4).map((_, i) => i);
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  const openEnds: number[] = [];
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      const i = cellIndex(g, x, y);
      const t = g.cells[i];
      if (!t) continue;
      for (const group of channels(t)) {
        for (let k = 1; k < group.length; k++) union(i * 4 + group[0], i * 4 + group[k]);
      }
      for (const d of ports(t)) {
        const nx = x + DX[d];
        const ny = y + DY[d];
        const n = inGrid(g, nx, ny) ? g.cells[cellIndex(g, nx, ny)] : null;
        if (n && hasPort(n, opp(d))) union(i * 4 + d, cellIndex(g, nx, ny) * 4 + opp(d));
        else openEnds.push(i * 4 + d);
      }
    }
  }
  return { find, openEnds };
}

// ───────────────────────────────── pipes ─────────────────────────────────

export interface PipeResult {
  wetPorts: Set<number>;
  wetCells: Set<number>;
  reached: Set<number>; // sink cell indexes with water
  leaks: number[]; // open-ended wet ports (water drips there)
  success: boolean;
}

export function solvePipes(g: Grid): PipeResult {
  const nets = buildNets(g);
  const wetNets = new Set<number>();
  g.cells.forEach((t, i) => {
    if (t?.kind === 'W') for (const d of ports(t)) wetNets.add(nets.find(i * 4 + d));
  });
  const wetPorts = new Set<number>();
  const wetCells = new Set<number>();
  const reached = new Set<number>();
  g.cells.forEach((t, i) => {
    if (!t) return;
    for (const d of ports(t)) {
      if (wetNets.has(nets.find(i * 4 + d))) {
        wetPorts.add(i * 4 + d);
        wetCells.add(i);
        if (t.kind === 'K') reached.add(i);
      }
    }
  });
  const leaks = nets.openEnds.filter((p) => {
    const t = g.cells[p >> 2];
    if (!t || t.kind === 'E' || t.kind === 'V' || t.kind === 'K') return false;
    return wetPorts.has(p);
  });
  let success = true;
  g.cells.forEach((t, i) => {
    if (!t || t.kind !== 'K') return;
    if (t.required && !reached.has(i)) success = false;
    if (t.forbidden && reached.has(i)) success = false;
  });
  return { wetPorts, wetCells, reached, leaks, success };
}

// ─────────────────────────────── circuits ───────────────────────────────

export const RESISTANCE: Partial<Record<TileKind, number>> = { O: 1, Q: 1, M: 1, F: 0.001 };

export interface ComponentState {
  cell: number;
  kind: TileKind;
  current: number;
  /** 0..1, how brightly a bulb glows / how hard a bell rings */
  level: number;
}

export interface CircuitResult {
  short: boolean;
  blown: number[]; // Snap Links that popped
  components: ComponentState[];
  liveCells: Set<number>;
  success: boolean;
}

/** Solve A·x = b in place (small dense systems). */
function gaussSolve(A: number[][], b: number[]): number[] {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    const piv = A[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / piv;
      if (!f) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = s / (A[r][r] || 1e-12);
  }
  return x;
}

export function solveCircuit(g: Grid): CircuitResult {
  const nets = buildNets(g);
  const empty: CircuitResult = { short: false, blown: [], components: [], liveCells: new Set(), success: false };
  const bi = g.cells.findIndex((t) => t?.kind === 'B');
  const comps: Array<{ cell: number; kind: TileKind; a: number; b: number; r: number }> = [];
  g.cells.forEach((t, i) => {
    if (!t) return;
    const r = RESISTANCE[t.kind];
    if (r === undefined) return;
    if (t.kind === 'F' && t.state) return; // a popped Snap Link is open (state = blown)
    const [pa, pb] = channels(t).map((ch) => ch[0]);
    comps.push({ cell: i, kind: t.kind, a: nets.find(i * 4 + pa), b: nets.find(i * 4 + pb), r });
  });
  if (bi < 0) return { ...empty, components: comps.map((c) => ({ cell: c.cell, kind: c.kind, current: 0, level: 0 })), success: checkCircuit(g, []) };
  const bt = g.cells[bi]!;
  const [pp, pm] = channels(bt).map((ch) => ch[0]);
  const plus = nets.find(bi * 4 + pp);
  const minus = nets.find(bi * 4 + pm);
  if (plus === minus) {
    const res = comps.map((c) => ({ cell: c.cell, kind: c.kind, current: 0, level: 0 }));
    return { short: true, blown: [], components: res, liveCells: new Set([bi]), success: false };
  }

  const unknown = new Map<number, number>();
  for (const c of comps) for (const n of [c.a, c.b]) if (n !== plus && n !== minus && !unknown.has(n)) unknown.set(n, unknown.size);
  const N = unknown.size;
  const A = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  const b = new Array<number>(N).fill(0);
  const fixedV = (n: number) => (n === plus ? 1 : n === minus ? 0 : undefined);
  for (let k = 0; k < N; k++) A[k][k] += 1e-9;
  for (const c of comps) {
    const gc = 1 / c.r;
    const ia = unknown.get(c.a);
    const ib = unknown.get(c.b);
    if (ia !== undefined) {
      A[ia][ia] += gc;
      if (ib !== undefined) A[ia][ib] -= gc;
      else b[ia] += gc * (fixedV(c.b) ?? 0);
    }
    if (ib !== undefined) {
      A[ib][ib] += gc;
      if (ia !== undefined) A[ib][ia] -= gc;
      else b[ib] += gc * (fixedV(c.a) ?? 0);
    }
  }
  const x = N ? gaussSolve(A, b) : [];
  const V = (n: number) => fixedV(n) ?? x[unknown.get(n)!] ?? 0;

  const blown: number[] = [];
  const results: ComponentState[] = comps.map((c) => {
    const I = (V(c.a) - V(c.b)) / c.r;
    if (c.kind === 'F' && Math.abs(I) > 3) blown.push(c.cell);
    return { cell: c.cell, kind: c.kind, current: I, level: Math.min(1, Math.abs(I)) };
  });
  if (blown.length) {
    // too much current: the Snap Link pops (safely) and everything goes dark
    return { short: true, blown, components: results.map((r) => ({ ...r, current: 0, level: 0 })), liveCells: new Set([bi]), success: false };
  }

  // nets carrying current, for drawing sparks along the wires
  const liveNets = new Set<number>();
  for (const c of comps) {
    const I = Math.abs((V(c.a) - V(c.b)) / c.r);
    if (I > 0.05) {
      liveNets.add(c.a);
      liveNets.add(c.b);
    }
  }
  const liveCells = new Set<number>();
  g.cells.forEach((t, i) => {
    if (!t) return;
    for (const d of ports(t)) if (liveNets.has(nets.find(i * 4 + d))) liveCells.add(i);
  });
  return { short: false, blown: [], components: results, liveCells, success: checkCircuit(g, results) };
}

function checkCircuit(g: Grid, comps: ComponentState[]): boolean {
  let ok = true;
  let any = false;
  g.cells.forEach((t, i) => {
    if (!t || RESISTANCE[t.kind] === undefined || t.kind === 'F') return;
    const lvl = comps.find((c) => c.cell === i)?.level ?? 0;
    if (t.required) {
      any = true;
      if (lvl < (t.bright ? 0.95 : 0.3)) ok = false;
    }
    if (t.forbidden && lvl > 0.05) ok = false;
  });
  return ok && any;
}

// ───────────────────────────────── trains ─────────────────────────────────

export interface TrainStep {
  cell: number;
  x: number;
  y: number;
  /** side the train entered from (undefined at the start) */
  enter?: Dir;
  exit: Dir;
}

export interface TrainRun {
  id: string;
  steps: TrainStep[];
  visits: string[];
  end: 'loop' | 'buffer' | 'bump' | 'crash' | 'limit';
}

export interface TrainGoal {
  train: string;
  /** stations to visit, in this order (others may be visited in between) */
  visit: string[];
  /** how the run must end; 'loop' = comes back round to the start */
  end?: 'loop' | 'buffer';
}

function trainExit(t: Tile, enter: Dir): Dir | undefined {
  if (t.kind === 'Z' || t.kind === 'Y') {
    const stem = rotDir(2, t.rot);
    const a = rotDir(0, t.rot);
    const b = rotDir(t.kind === 'Z' ? 1 : 3, t.rot);
    if (enter === stem) return t.state ? b : a;
    if (enter === a || enter === b) return stem; // trailing points spring over
    return undefined;
  }
  for (const ch of channels(t)) {
    if (ch.includes(enter) && ch.length === 2) return ch[0] === enter ? ch[1] : ch[0];
  }
  return undefined;
}

export function simulateTrains(g: Grid, maxSteps = 160): TrainRun[] {
  const runs: Array<TrainRun & { done: boolean; seen: Set<string> }> = [];
  g.cells.forEach((t, i) => {
    if (t?.kind !== 'S') return;
    const x = i % g.cols;
    const y = Math.floor(i / g.cols);
    const exit = rotDir(0, t.rot);
    runs.push({
      id: t.id ?? `train${runs.length}`,
      steps: [{ cell: i, x, y, exit }],
      visits: t.id ? [] : [],
      end: 'limit',
      done: false,
      seen: new Set([`${i}:${exit}`]),
    });
  });

  for (let step = 0; step < maxSteps && runs.some((r) => !r.done); step++) {
    // propose moves
    const next: Array<TrainStep | null> = runs.map((r) => {
      if (r.done) return null;
      const cur = r.steps[r.steps.length - 1];
      const nx = cur.x + DX[cur.exit];
      const ny = cur.y + DY[cur.exit];
      if (!inGrid(g, nx, ny)) {
        r.done = true;
        r.end = 'bump';
        return null;
      }
      const ni = cellIndex(g, nx, ny);
      const nt = g.cells[ni];
      const enter = opp(cur.exit);
      if (!nt || !hasPort(nt, enter)) {
        r.done = true;
        r.end = 'bump';
        return null;
      }
      if (nt.kind === 'E') return { cell: ni, x: nx, y: ny, enter, exit: enter };
      const exit = trainExit(nt, enter);
      if (exit === undefined) {
        r.done = true;
        r.end = 'bump';
        return null;
      }
      return { cell: ni, x: nx, y: ny, enter, exit };
    });

    // collisions: same cell, or two trains swapping cells
    for (let a = 0; a < runs.length; a++) {
      for (let b = a + 1; b < runs.length; b++) {
        const na = next[a];
        const nb = next[b];
        const ca = runs[a].steps[runs[a].steps.length - 1].cell;
        const cb = runs[b].steps[runs[b].steps.length - 1].cell;
        const posA = na ? na.cell : ca;
        const posB = nb ? nb.cell : cb;
        const swap = na && nb && na.cell === cb && nb.cell === ca;
        if (posA === posB || swap) {
          for (const k of [a, b]) {
            if (next[k]) runs[k].steps.push(next[k]!);
            runs[k].done = true;
            runs[k].end = 'crash';
            next[k] = null;
          }
        }
      }
    }

    runs.forEach((r, k) => {
      const n = next[k];
      if (!n) return;
      r.steps.push(n);
      const t = g.cells[n.cell]!;
      if (t.kind === 'P' && t.id) r.visits.push(t.id);
      if (t.kind === 'E') {
        r.done = true;
        r.end = 'buffer';
        return;
      }
      const key = `${n.cell}:${n.exit}`;
      if (r.seen.has(key)) {
        r.done = true;
        r.end = 'loop';
      }
      r.seen.add(key);
    });
  }
  return runs.map(({ id, steps, visits, end }) => ({ id, steps, visits, end }));
}

export function trainsSucceed(runs: TrainRun[], goals: TrainGoal[]): boolean {
  return goals.every((goal) => {
    const r = runs.find((x) => x.id === goal.train);
    if (!r || r.end === 'crash' || r.end === 'bump') return false;
    if (goal.end && r.end !== goal.end) return false;
    let k = 0;
    for (const v of r.visits) if (v === goal.visit[k]) k++;
    return k === goal.visit.length;
  });
}
