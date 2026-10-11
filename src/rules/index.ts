import { placePiece, piecesSolved, slideMove, slideSolved, symmetrySet, symmetrySolved,
  sortingSolution, sortingSolved, sudokuSet, sudokuSolved, jugMove, jugsSolved,
  tiltMove, tiltSolved, layersSet, layersSolved, differenceFind, differenceSolved,
  type SudokuState } from '../mechanism/variety';
import type { Placement, SlideState, SortingState, JugsState, TiltState, LayerPlacement } from '../content/variety-types';
/**
 * Room rules: pure functions per room kind (no Phaser). Scenes keep a plain
 * state object in step with what's on screen and ask these whether the room
 * is fixed; content.test.ts applies every authored solution through them.
 */
import { leverSucceeds, pulleyLifts, type LeverWeight } from '../mechanism/balance';
import { camMatches } from '../mechanism/cams';
import { cardsSucceed, type Card } from '../mechanism/cards';
import { runChain, solvedPlacement } from '../mechanism/chain';
import {
  applySolution,
  parseGrid,
  simulateTrains,
  solveCircuit,
  solvePipes,
  trainsSucceed,
  type Grid,
} from '../mechanism/flow';
import { collides, solve, type GearNode, type Solution } from '../mechanism/graph';
import { applyLightSolution, parseLightGrid, traceLight, type LightGrid } from '../mechanism/light';
import { evaluate, matchesTruth, type GateType } from '../mechanism/logic';
import { tempoMatches } from '../mechanism/pendulum';
import { pinKey, pinsMatch } from '../mechanism/pins';
import { allTuned } from '../mechanism/tune';
import type {
  BalanceRoomDef,
  CamRoomDef,
  CardsRoomDef,
  ChainRoomDef,
  FlowRoomDef,
  GearPlacement,
  GearRoomDef,
  LightRoomDef,
  LogicRoomDef,
  OilRoomDef,
  PendulumRoomDef,
  PlayStyleId,
  RoomDef,
  RoomKind,
} from '../content/types';
import { gridToRows, lightToRows } from './grid';

/** A room def with its Play Style overrides applied (and no `styles` left). */
export type Effective<T> = T extends unknown ? Omit<T, 'styles'> : never;

export function effective<T extends RoomDef>(def: T, style: PlayStyleId): Effective<T> {
  const over = (def.styles?.[style] ?? {}) as Partial<T>;
  const merged = { ...def, ...over } as T;
  delete (merged as { styles?: unknown }).styles;
  if (style === 'tinker' && merged.simplify !== false) return simplify(merged) as unknown as Effective<T>;
  return merged as unknown as Effective<T>;
}

// ───────────────────────────── gears ─────────────────────────────

export const gearId = (shaft: string, layer: number): string => `${shaft}@${layer}`;

export function gearNodes(def: Effective<GearRoomDef>, placements: GearPlacement[]): GearNode[] {
  const nodes: GearNode[] = [];
  for (const s of def.shafts) {
    for (const g of s.gears ?? []) {
      const layer = g.layer ?? 0;
      nodes.push({ id: gearId(s.id, layer), teeth: g.teeth, x: s.x, y: s.y, shaft: s.id, layer });
    }
  }
  for (const p of placements) {
    const s = def.shafts.find((q) => q.id === p.shaft);
    if (!s) continue;
    nodes.push({ id: gearId(p.shaft, p.layer), teeth: p.teeth, x: s.x, y: s.y, shaft: s.id, layer: p.layer });
  }
  return nodes;
}

export function driverOmega(def: Effective<GearRoomDef>): number {
  return Math.PI * 2 * (def.driver.turnsPerSecond ?? 0.25) * (def.driver.dir ?? 1);
}

export interface GearEval {
  sol: Solution;
  nodes: GearNode[];
  omegaIn: number;
  /** Signed speed of each output shaft relative to the driver's speed magnitude (+ = clockwise). */
  outputs: Array<{ omega: number; ratio: number; ok: boolean }>;
  ok: boolean;
}

export function shaftOmega(sol: Solution, nodes: GearNode[], shaft: string): number {
  for (const n of nodes) if (n.shaft === shaft) {
    const w = sol.omega.get(n.id) ?? 0;
    if (w !== 0) return w;
  }
  return 0;
}

export function evalGears(def: Effective<GearRoomDef>, placements: GearPlacement[]): GearEval {
  const nodes = gearNodes(def, placements);
  const omegaIn = driverOmega(def);
  const driver = nodes.find((n) => n.shaft === def.driver.shaft);
  const sol = driver
    ? solve(nodes, { gearId: driver.id, omega: omegaIn })
    : { omega: new Map(nodes.map((n) => [n.id, 0])), order: [], powerEdges: [], jammed: false, jamGroup: new Set<string>() };
  const outputs = def.outputs.map((o) => {
    const w = shaftOmega(sol, nodes, o.shaft);
    const ratio = w / Math.abs(omegaIn);
    let ok = w !== 0 && !sol.jammed;
    const tol = o.tol ?? 0.02;
    if (o.dir && Math.sign(w) !== o.dir) ok = false;
    if (o.ratio !== undefined && Math.abs(Math.abs(ratio) - o.ratio) > tol * o.ratio) ok = false;
    if (o.maxRatio !== undefined && Math.abs(ratio) > o.maxRatio + 1e-9) ok = false;
    if (o.minRatio !== undefined && Math.abs(ratio) < o.minRatio - 1e-9) ok = false;
    return { omega: w, ratio, ok };
  });
  return { sol, nodes, omegaIn, outputs, ok: !sol.jammed && outputs.every((o) => o.ok) };
}

/** Can a gear go on this shaft layer without hitting anything? */
export function canPlaceGear(def: Effective<GearRoomDef>, placements: GearPlacement[], p: GearPlacement): boolean {
  const s = def.shafts.find((q) => q.id === p.shaft);
  if (!s || !s.peg) return false;
  if (!(s.layers ?? [0]).includes(p.layer)) return false;
  if ((s.gears ?? []).some((g) => (g.layer ?? 0) === p.layer)) return false;
  const others = gearNodes(
    def,
    placements.filter((q) => !(q.shaft === p.shaft && q.layer === p.layer)),
  );
  const probe: GearNode = { id: '_probe', teeth: p.teeth, x: s.x, y: s.y, shaft: s.id, layer: p.layer };
  return !others.some((o) => collides(probe, o));
}

export function gearPlacementsValid(def: Effective<GearRoomDef>, placements: GearPlacement[]): boolean {
  const seen = new Set<string>();
  for (const p of placements) {
    const k = gearId(p.shaft, p.layer);
    if (seen.has(k)) return false;
    seen.add(k);
  }
  return placements.every((p, i) => canPlaceGear(def, placements.filter((_, j) => j !== i), p));
}

export function gearSolved(def: Effective<GearRoomDef>, placements: GearPlacement[]): boolean {
  return gearPlacementsValid(def, placements) && evalGears(def, placements).ok;
}

function simplifyGear(def: GearRoomDef): GearRoomDef {
  const sol = def.solution;
  if (sol.length === 0) return def;
  const keep = sol[sol.length - 1];
  const pre = sol.slice(0, -1);
  const shafts = def.shafts.map((s) => {
    const add = pre.filter((p) => p.shaft === s.id).map((p) => ({ teeth: p.teeth, layer: p.layer }));
    if (!add.length) return s;
    const gears = [...(s.gears ?? []), ...add];
    const free = (s.layers ?? [0]).filter((l) => !gears.some((g) => (g.layer ?? 0) === l));
    return { ...s, gears, peg: free.length > 0 && s.peg };
  });
  return { ...def, shafts, tray: [keep.teeth], initial: [], solution: [keep] };
}

// ───────────────────────────── grids ─────────────────────────────

export function flowSolved(def: Effective<FlowRoomDef>, g: Grid): boolean {
  if (def.family === 'pipes') return solvePipes(g).success;
  if (def.family === 'circuit') return solveCircuit(g).success;
  return trainsSucceed(simulateTrains(g), def.trains ?? []);
}

/** Apply every authored step except one (prefer leaving a drawer part to place). */
function simplifyFlow(def: FlowRoomDef): FlowRoomDef {
  const g = parseGrid(def.grid);
  const steps = g.cells.map((t, i) => (t?.sol ? i : -1)).filter((i) => i >= 0);
  if (steps.length <= 1) return { ...def, tray: slotKinds(g) };
  const slots = steps.filter((i) => g.cells[i]!.slot);
  const leave = slots.length ? slots[slots.length - 1] : steps[steps.length - 1];
  for (const i of steps) {
    if (i === leave) continue;
    const t = g.cells[i]!;
    if (t.sol!.kind) t.kind = t.sol!.kind;
    if (t.sol!.rot !== undefined) t.rot = t.sol!.rot;
    if (t.sol!.state !== undefined) t.state = t.sol!.state;
    t.slot = false;
    t.rotatable = false;
    t.sol = undefined;
  }
  return { ...def, grid: gridToRows(g), tray: slotKinds(g) };
}

function slotKinds(g: Grid): string[] {
  return g.cells.filter((t) => t?.slot && t.sol?.kind).map((t) => t!.sol!.kind!);
}

export function lightSolved(_def: Effective<LightRoomDef>, g: LightGrid): boolean {
  return traceLight(g).success;
}

function simplifyLight(def: LightRoomDef): LightRoomDef {
  const g = parseLightGrid(def.grid);
  const steps = g.cells.map((t, i) => (t?.sol ? i : -1)).filter((i) => i >= 0);
  if (steps.length <= 1) return def;
  const slots = steps.filter((i) => g.cells[i]!.kind === '_');
  const leave = slots.length ? slots[slots.length - 1] : steps[steps.length - 1];
  for (const i of steps) {
    if (i === leave) continue;
    const t = g.cells[i]!;
    if (t.sol!.kind) t.kind = t.sol!.kind;
    if (t.sol!.rot !== undefined) t.rot = t.sol!.rot;
    if (t.sol!.color) t.color = t.sol!.color;
    t.rotatable = false;
    t.slot = false;
    t.sol = undefined;
  }
  const left = g.cells[leave]!;
  const tray = left.kind === '_' && left.sol?.kind ? [left.sol.kind + (left.sol.kind === 'F' ? (left.sol.color ?? 'r') : '')] : [];
  return { ...def, grid: lightToRows(g), tray };
}

// ───────────────────────────── logic ─────────────────────────────

export interface LogicState {
  gates: Record<string, GateType | undefined>;
  inputs: Record<string, boolean>;
}

export function logicSolved(def: Effective<LogicRoomDef>, s: LogicState): boolean {
  const slots = def.nodes.filter((n) => n.slot);
  if (slots.some((n) => !s.gates[n.id])) return false;
  const goal = def.goal;
  if (goal.kind === 'reach') return !!evaluate(def.nodes, s.inputs, s.gates)[goal.output];
  if (goal.kind === 'truth') return matchesTruth(def.nodes, s.gates, goal.output, goal.expr);
  const mem: Record<string, boolean> = {};
  return goal.steps.every((st) => evaluate(def.nodes, st.set, s.gates, mem)[goal.output] === st.expect);
}

function simplifyLogic(def: LogicRoomDef): LogicRoomDef {
  const slotIds = def.nodes.filter((n) => n.slot).map((n) => n.id);
  if (slotIds.length <= 1) return { ...def, tray: slotIds.map((id) => def.solution.gates![id]) };
  const leave = slotIds[slotIds.length - 1];
  const nodes = def.nodes.map((n) => (n.slot && n.id !== leave ? { ...n, slot: false, gate: def.solution.gates![n.id] } : n));
  const gate = def.solution.gates![leave];
  return { ...def, nodes, tray: [gate], solution: { ...def.solution, gates: { [leave]: gate } } };
}

// ───────────────────────────── cards ─────────────────────────────

export interface CardsState {
  rack: Array<Card | null>;
  /** Little Tinker "Dance Party": how many glowing moves have been copied. */
  copied: number;
}

export function cardsSolved(def: Effective<CardsRoomDef>, s: CardsState, style: PlayStyleId): boolean {
  if (style === 'tinker') return s.copied >= def.scenarios[0].moves.length;
  return cardsSucceed(s.rack, def.scenarios, def.slots);
}

// ───────────────────────────── the rest ─────────────────────────────

export interface PendulumState {
  pushed: boolean;
  pallet: boolean;
  notches: Record<string, number>;
}

export function pendulumSolved(def: Effective<PendulumRoomDef>, s: PendulumState): boolean {
  if (def.pallet && !s.pallet) return false;
  if (def.goal === 'push') return s.pushed;
  if (def.goal === 'tempo') {
    const p = def.pendulums.find((q) => !q.fixed) ?? def.pendulums[0];
    return tempoMatches(s.notches[p.id], def.bpm ?? 60);
  }
  const vals = def.pendulums.map((p) => s.notches[p.id]);
  return vals.every((v) => v === vals[0]);
}

export interface BalanceState {
  fulcrum: number;
  weights: Array<{ slot: number; mass: number }>;
  wheels: number;
  pulled: boolean;
}

export function leverWeights(def: Effective<BalanceRoomDef>, s: BalanceState): LeverWeight[] {
  const L = def.lever!;
  const ws: LeverWeight[] = [...L.fixed, ...s.weights.map((w, i) => ({ id: `w${i}`, pos: w.slot, mass: w.mass }))];
  if (L.kip && s.pulled) ws.push({ id: 'kip', pos: L.kip.pos, mass: L.kip.mass });
  return ws;
}

export function balanceSolved(def: Effective<BalanceRoomDef>, s: BalanceState): boolean {
  if (!s.pulled) return false;
  if (def.mode === 'lever') return leverSucceeds(leverWeights(def, s), s.fulcrum, def.lever!.goal);
  const P = def.pulley!;
  return pulleyLifts(P.load, s.wheels, P.strength + (P.helper ?? 0));
}

export interface OilState {
  oiled: Set<string>;
  turns: number;
  pawl: boolean;
}

export function oilSolved(def: Effective<OilRoomDef>, s: OilState): boolean {
  if (def.parts.some((p) => p.required && !s.oiled.has(p.id))) return false;
  if (def.crank && s.turns < def.crank.turns) return false;
  if (def.pawl && !s.pawl) return false;
  return true;
}

export type CamState = Record<string, { shape: CamRoomDef['tray'][number]; phase: number } | undefined>;

export function camSolved(def: Effective<CamRoomDef>, s: CamState, style: PlayStyleId): boolean {
  return def.followers.every((f) => {
    const c = s[f.id];
    return !!c && camMatches(c.shape, c.phase, f.target, style === 'engineer');
  });
}

export function chainSolved(def: Effective<ChainRoomDef>, placed: Record<number, string | undefined>): boolean {
  return runChain(def.links, placed).ok;
}

// ───────────────────────────── per-kind table ─────────────────────────────

/** The plain state each kind keeps, keyed by kind. */
export interface StateOf {
  gear: GearPlacement[];
  flow: Grid;
  light: LightGrid;
  logic: LogicState;
  cards: CardsState;
  music: Set<string>;
  tune: Record<string, number>;
  pendulum: PendulumState;
  balance: BalanceState;
  oil: OilState;
  cam: CamState;
  chain: Record<number, string | undefined>;
  hunt: Set<number>;
  busy: Set<number>;
  nest: Record<number, string>;
  shadow: Placement[]; packing: Placement[]; slide: SlideState; symmetry: Record<number, string>;
  sorting: SortingState; sudoku: SudokuState; jugs: JugsState; tilt: TiltState;
  layers: LayerPlacement[]; difference: Set<number>;
}

type DefOf<K extends RoomKind> = Effective<Extract<RoomDef, { kind: K }>>;

interface KindRules<K extends RoomKind> {
  initial(def: DefOf<K>): StateOf[K];
  solution(def: DefOf<K>, style: PlayStyleId): StateOf[K];
  solved(def: DefOf<K>, s: StateOf[K], style: PlayStyleId): boolean;
  simplify?(def: Extract<RoomDef, { kind: K }>): Extract<RoomDef, { kind: K }>;
}

export const RULES: { [K in RoomKind]: KindRules<K> } = {
  shadow: {
    initial: () => [],
    solution: (d) => d.solution.reduce((state, p) => placePiece(d, state, p), [] as Placement[]),
    solved: (d, s) => piecesSolved(d, s),
  },
  packing: {
    initial: () => [],
    solution: (d) => d.solution.reduce((state, p) => placePiece(d, state, p), [] as Placement[]),
    solved: (d, s) => piecesSolved(d, s),
  },
  slide: {
    initial: (d) => ({ tiles: [...d.initial], moves: 0 }),
    solution: (d) => d.solutionMoves.reduce((state, at) => slideMove(d, state, at), { tiles: [...d.initial], moves: 0 }),
    solved: (d, s) => slideSolved(d, s),
  },
  symmetry: {
    initial: (d) => Object.fromEntries(d.seeds.map(p => [p.at, p.token])),
    solution: (d) => d.solution.reduce((state, p) => symmetrySet(d, state, p.at, p.token), Object.fromEntries(d.seeds.map(p => [p.at, p.token]))),
    solved: (d, s) => symmetrySolved(d, s),
  },
  sorting: { initial: (d) => ({ order: d.items.map(i => i.id), weighings: 0 }), solution: (d) => sortingSolution(d), solved: (d, s) => sortingSolved(d, s) },
  sudoku: {
    initial: (d) => ({ cells: [...d.givens] }),
    solution: (d) => d.solution.reduce((state, value, at) => sudokuSet(d, state, at, value), { cells: [...d.givens] }),
    solved: (d, s) => sudokuSolved(d, s),
  },
  jugs: {
    initial: (d) => ({ volumes: [...d.initial], pours: 0 }),
    solution: (d) => d.solution.reduce((state, action) => jugMove(d, state, action), { volumes: [...d.initial], pours: 0 }),
    solved: (d, s) => jugsSolved(d, s),
  },
  tilt: {
    initial: (d) => ({ marbles: [...d.initial], moves: 0 }),
    solution: (d) => d.solution.reduce((state, direction) => tiltMove(d, state, direction), { marbles: [...d.initial], moves: 0 }),
    solved: (d, s) => tiltSolved(d, s),
  },
  layers: {
    initial: () => [],
    solution: (d) => d.solution.reduce((state, p) => layersSet(d, state, p), [] as LayerPlacement[]),
    solved: (d, s) => layersSolved(d, s),
  },
  difference: {
    initial: () => new Set(),
    solution: (d) => d.differences.reduce((state, _, index) => differenceFind(d, state, index), new Set<number>()),
    solved: (d, s) => differenceSolved(d, s),
  },
  gear: {
    initial: (d) => (d.initial ?? []).map((p) => ({ ...p })),
    solution: (d) => d.solution.map((p) => ({ ...p })),
    solved: (d, s) => gearSolved(d, s),
    simplify: (d) => simplifyGear(d),
  },
  flow: {
    initial: (d) => parseGrid(d.grid),
    solution: (d) => applySolution(parseGrid(d.grid)),
    solved: (d, s) => flowSolved(d, s),
    simplify: (d) => simplifyFlow(d),
  },
  light: {
    initial: (d) => parseLightGrid(d.grid),
    solution: (d) => applyLightSolution(parseLightGrid(d.grid)),
    solved: (d, s) => lightSolved(d, s),
    simplify: (d) => simplifyLight(d),
  },
  logic: {
    initial: () => ({ gates: {}, inputs: {} }),
    solution: (d) => ({ gates: { ...(d.solution.gates ?? {}) }, inputs: { ...(d.solution.inputs ?? {}) } }),
    solved: (d, s) => logicSolved(d, s),
    simplify: (d) => simplifyLogic(d),
  },
  cards: {
    initial: (d) => ({ rack: new Array<Card | null>(d.slots).fill(null), copied: 0 }),
    solution: (d, style) => ({
      rack: Array.from({ length: d.slots }, (_, i) => d.solution[i] ?? null),
      copied: style === 'tinker' ? d.scenarios[0].moves.length : 0,
    }),
    solved: (d, s, style) => cardsSolved(d, s, style),
  },
  music: {
    initial: (d) => {
      const set = new Set<string>();
      d.melody.forEach(([st, n], i) => {
        if (!d.missing.includes(i)) set.add(pinKey(st, n));
      });
      for (const [st, n] of d.extra ?? []) set.add(pinKey(st, n));
      return set;
    },
    solution: (d) => new Set(d.melody.map(([st, n]) => pinKey(st, n))),
    solved: (d, s) => pinsMatch(s, d.melody),
    simplify: (d) => ({ ...d, missing: d.missing.slice(-1), extra: [] }),
  },
  tune: {
    initial: (d) => Object.fromEntries(d.dials.map((x) => [x.id, x.start])),
    solution: (d) => Object.fromEntries(d.dials.map((x) => [x.id, x.target])),
    solved: (d, s) => allTuned(d.dials.map((x) => ({ ...x, value: s[x.id] }))),
    simplify: (d) => ({
      ...d,
      dials: d.dials.map((x, i) => (i === 0 ? { ...x, tol: Math.max(x.tol, 0.08) } : { ...x, start: x.target })),
    }),
  },
  pendulum: {
    initial: (d) => ({ pushed: false, pallet: false, notches: Object.fromEntries(d.pendulums.map((p) => [p.id, p.notch])) }),
    solution: (d) => ({
      pushed: true,
      pallet: true,
      notches: { ...Object.fromEntries(d.pendulums.map((p) => [p.id, p.notch])), ...(d.solution.notches ?? {}) },
    }),
    solved: (d, s) => pendulumSolved(d, s),
    simplify: (d) => ({ ...d, goal: 'push', pallet: false }),
  },
  balance: {
    initial: (d) => ({ fulcrum: d.lever?.fulcrum ?? 0, weights: [], wheels: 0, pulled: false }),
    solution: (d) => ({
      fulcrum: d.solution.fulcrum ?? d.lever?.fulcrum ?? 0,
      weights: (d.solution.weights ?? []).map((w) => ({ ...w })),
      wheels: d.solution.wheels ?? 0,
      pulled: true,
    }),
    solved: (d, s) => balanceSolved(d, s),
    simplify: (d) => {
      if (d.mode === 'lever' && d.lever) {
        const f = d.solution.fulcrum ?? d.lever.fulcrum;
        const fixed = [...d.lever.fixed, ...(d.solution.weights ?? []).map((w, i) => ({ id: `pre${i}`, pos: w.slot, mass: w.mass }))];
        return { ...d, lever: { ...d.lever, fulcrum: f, fulcrumMin: f, fulcrumMax: f, fixed, slots: [], tray: [] }, solution: { fulcrum: f } };
      }
      if (d.pulley) {
        const P = d.pulley;
        return { ...d, pulley: { ...P, load: P.strength + (P.helper ?? 0), slots: 1, wheels: 1 }, solution: { wheels: 1 } };
      }
      return d;
    },
  },
  oil: {
    initial: () => ({ oiled: new Set(), turns: 0, pawl: false }),
    solution: (d) => ({ oiled: new Set(d.parts.filter((p) => p.required).map((p) => p.id)), turns: d.crank?.turns ?? 0, pawl: !!d.pawl }),
    solved: (d, s) => oilSolved(d, s),
    // Little Tinkers oil every squeaky part too (one drop each, nothing can go wrong); only the
    // crank winding is shortened and the pawl is done for them.
    simplify: (d) => {
      return {
        ...d,
        parts: d.parts.map((p) => ({ ...p, required: p.required && !d.crank })),
        crank: d.crank ? { ...d.crank, turns: Math.min(d.crank.turns, 2) } : undefined,
        pawl: undefined,
      };
    },
  },
  cam: {
    initial: (d) => Object.fromEntries(d.followers.map((f) => [f.id, f.start ? { ...f.start } : undefined])),
    solution: (d) => Object.fromEntries(d.followers.map((f) => [f.id, { ...d.solution[f.id] }])),
    solved: (d, s, style) => camSolved(d, s, style),
    simplify: (d) => {
      const last = d.followers[d.followers.length - 1];
      return {
        ...d,
        followers: d.followers.map((f) => (f === last ? { ...f, start: undefined } : { ...f, start: { ...d.solution[f.id] } })),
        tray: [d.solution[last.id].shape],
      };
    },
  },
  chain: {
    initial: () => ({}),
    solution: (d) => solvedPlacement(d.links),
    solved: (d, s) => chainSolved(d, s),
    simplify: (d) => {
      const slots = d.links.map((l, i) => (l.slot ? i : -1)).filter((i) => i >= 0);
      const leave = slots[slots.length - 1];
      return {
        ...d,
        links: d.links.map((l, i) => (l.slot && i !== leave ? { part: l.sol } : l)),
        tray: leave === undefined ? [] : [d.links[leave].sol!],
      };
    },
  },
  hunt: {
    initial: () => new Set(),
    solution: (d) => new Set(d.covers.map((c, i) => (c.target ? i : -1)).filter((i) => i >= 0)),
    solved: (d, s) => d.covers.every((c, i) => !c.target || s.has(i)),
  },
  busy: {
    initial: () => new Set(),
    solution: (d) => new Set(d.gadgets.slice(0, d.need).map((_, i) => i)),
    solved: (d, s) => s.size >= d.need,
  },
  nest: {
    initial: () => ({}),
    solution: (d) => Object.fromEntries(d.slots.slice(0, d.need).map((_, i) => [i, d.tray[i % d.tray.length]])),
    solved: (d, s) => Object.keys(s).length >= d.need,
    simplify: (d) => ({ ...d, need: Math.min(d.need, 3) }),
  },
};

function simplify<T extends RoomDef>(def: T): T {
  const r = RULES[def.kind] as unknown as KindRules<RoomKind>;
  return (r.simplify ? r.simplify(def as never) : def) as T;
}

/** Convenience for tests and the debug auto-solver. */
export function initialState<K extends RoomKind>(def: DefOf<K>): StateOf[K] {
  return (RULES[def.kind as K] as KindRules<K>).initial(def);
}
export function solutionState<K extends RoomKind>(def: DefOf<K>, style: PlayStyleId): StateOf[K] {
  return (RULES[def.kind as K] as KindRules<K>).solution(def, style);
}
export function isSolved<K extends RoomKind>(def: DefOf<K>, s: StateOf[K], style: PlayStyleId): boolean {
  return (RULES[def.kind as K] as KindRules<K>).solved(def, s, style);
}

// silence "declared but unused" for kinds whose defs are only used through RULES
