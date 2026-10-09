/**
 * The Invention Bench (GDD §22): a pegboard where every gear and gadget snaps
 * onto pegs. It runs on the same Mechanism Graph as the rooms, so every
 * Contraption Card goal is checked by the engine. Contraption Codes pack a
 * creation into a short code that another device can type back in — no
 * accounts, no internet (GDD §20.3).
 */
import { solve, type GearNode } from '../mechanism/graph';

export const BENCH = { cols: 9, rows: 4, x0: 240, y0: 170, step: 100 };
export const BENCH_TEETH = [8, 10, 12, 16, 20, 24, 28, 30, 32, 40];

export type SourceKind = 'crank' | 'motor' | 'weights' | 'waterwheel';
export type OutputKind = 'bell' | 'fan' | 'flag' | 'lamp' | 'dancer' | 'drum' | 'cuckoo' | 'spinner' | 'hands' | 'fountain' | 'lift';
export type GadgetKind = SourceKind | OutputKind;

export const SOURCES: SourceKind[] = ['crank', 'motor', 'weights', 'waterwheel'];
export const OUTPUTS: OutputKind[] = ['bell', 'fan', 'flag', 'lamp', 'dancer', 'drum', 'cuckoo', 'spinner', 'hands', 'fountain', 'lift'];
export const GADGETS: GadgetKind[] = [...SOURCES, ...OUTPUTS];
export const isSource = (k: GadgetKind): k is SourceKind => (SOURCES as string[]).includes(k);

/** Gadgets you can use in Free Build from the start; blueprints and repairs unlock the rest. */
export const STARTER_GADGETS: GadgetKind[] = ['crank', 'bell', 'fan', 'flag'];
export const GADGET_UNLOCKS: Record<string, GadgetKind> = {
  'bp-cuckoo': 'cuckoo',
  'bp-musicdrum': 'drum',
  'bp-loco': 'lift',
  'bp-lamp': 'lamp',
  'bp-fountain': 'fountain',
  'bp-dancer': 'dancer',
  'bp-planets': 'spinner',
  'bp-bell': 'hands',
  'repair-1': 'weights',
  'repair-4': 'motor',
  'repair-5': 'waterwheel',
};

export interface BenchGear {
  peg: number;
  layer: 0 | 1;
  teeth: number;
}

export interface BenchGadget {
  id: string;
  kind: GadgetKind;
  peg: number;
}

export interface BenchState {
  gears: BenchGear[];
  gadgets: BenchGadget[];
}

export const pegPos = (peg: number): { x: number; y: number } => ({
  x: BENCH.x0 + (peg % BENCH.cols) * BENCH.step,
  y: BENCH.y0 + Math.floor(peg / BENCH.cols) * BENCH.step,
});

export const PEG_COUNT = BENCH.cols * BENCH.rows;

const gid = (g: BenchGear) => `p${g.peg}@${g.layer}`;

export function benchNodes(s: BenchState): GearNode[] {
  return s.gears.map((g) => ({ id: gid(g), teeth: g.teeth, ...pegPos(g.peg), shaft: `peg${g.peg}`, layer: g.layer }));
}

export interface BenchRun {
  jammed: boolean;
  /** Speed of each gadget's peg relative to the source (+ = same way round). */
  ratio: Record<string, number>;
  omega: Map<string, number>;
  powerEdges: Array<[string, string]>;
  gearCount: number;
}

export function runBench(s: BenchState): BenchRun {
  const nodes = benchNodes(s);
  const omega = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const ratio: Record<string, number> = {};
  const powerEdges: Array<[string, string]> = [];
  let jammed = false;
  const base = Math.PI * 0.5;
  for (const src of s.gadgets.filter((g) => isSource(g.kind))) {
    const driver = nodes.find((n) => n.shaft === `peg${src.peg}`);
    if (!driver) continue;
    const sol = solve(nodes, { gearId: driver.id, omega: base });
    if (sol.jammed) {
      jammed = true;
      continue;
    }
    for (const [id, w] of sol.omega) {
      if (w === 0) continue;
      const had = omega.get(id) ?? 0;
      if (had !== 0 && Math.abs(had - w) > 1e-9) jammed = true;
      omega.set(id, w);
    }
    powerEdges.push(...sol.powerEdges);
  }
  if (jammed) for (const k of omega.keys()) omega.set(k, 0);
  for (const g of s.gadgets) {
    const n = nodes.find((q) => q.shaft === `peg${g.peg}` && (omega.get(q.id) ?? 0) !== 0);
    ratio[g.id] = n ? omega.get(n.id)! / base : 0;
  }
  return { jammed, ratio, omega, powerEdges: jammed ? [] : powerEdges, gearCount: s.gears.length };
}

/** Can this gear go here? (layer free, no overlap with gears on the same layer) */
export function canPlaceBenchGear(s: BenchState, g: BenchGear): boolean {
  if (s.gears.some((q) => q.peg === g.peg && q.layer === g.layer)) return false;
  const p = pegPos(g.peg);
  const r = g.teeth * 2.5;
  return s.gears.every((q) => {
    if (q.layer !== g.layer || q.peg === g.peg) return true;
    const o = pegPos(q.peg);
    return Math.hypot(o.x - p.x, o.y - p.y) - (r + q.teeth * 2.5) >= -6;
  });
}

// ───────────────────────────── Contraption Cards ─────────────────────────────

export type BenchGoal =
  | { kind: 'powered'; gadgets: string[] }
  | { kind: 'ratio'; gadget: string; ratio: number; tol?: number }
  | { kind: 'atLeast'; gadget: string; ratio: number }
  | { kind: 'atMost'; gadget: string; ratio: number }
  | { kind: 'sameWay'; gadget: string }
  | { kind: 'oppositeWay'; gadget: string }
  | { kind: 'opposite'; a: string; b: string }
  | { kind: 'gears'; exactly?: number; atMost?: number }
  | { kind: 'jam' };

export interface ContraptionCard {
  id: string;
  title: string;
  say: string;
  gadgets: BenchGadget[];
  goals: BenchGoal[];
  /** Fewest-gears medal target. */
  par: number;
  solution: BenchGear[];
}

export function goalMet(s: BenchState, run: BenchRun, g: BenchGoal): boolean {
  const r = (id: string) => run.ratio[id] ?? 0;
  switch (g.kind) {
    case 'powered':
      return !run.jammed && g.gadgets.every((id) => r(id) !== 0);
    case 'ratio':
      return !run.jammed && Math.abs(Math.abs(r(g.gadget)) - g.ratio) <= (g.tol ?? 0.01) * g.ratio;
    case 'atLeast':
      return !run.jammed && Math.abs(r(g.gadget)) >= g.ratio - 1e-9;
    case 'atMost':
      return !run.jammed && r(g.gadget) !== 0 && Math.abs(r(g.gadget)) <= g.ratio + 1e-9;
    case 'sameWay':
      return !run.jammed && r(g.gadget) > 0;
    case 'oppositeWay':
      return !run.jammed && r(g.gadget) < 0;
    case 'opposite':
      return !run.jammed && r(g.a) * r(g.b) < 0;
    case 'gears':
      return (g.exactly === undefined || s.gears.length === g.exactly) && (g.atMost === undefined || s.gears.length <= g.atMost);
    case 'jam':
      return run.jammed;
  }
}

export function cardSolved(card: ContraptionCard, s: BenchState): boolean {
  const run = runBench(s);
  return card.goals.every((g) => goalMet(s, run, g));
}

const G = (peg: number, teeth: number, layer: 0 | 1 = 0): BenchGear => ({ peg, layer, teeth });
const crank = (peg: number): BenchGadget => ({ id: 'src', kind: 'crank', peg });
const out = (id: string, kind: OutputKind, peg: number): BenchGadget => ({ id, kind, peg });

export const CARDS: ContraptionCard[] = [
  { id: 'c01', title: 'Ring the bell', say: 'Turn the crank, ring the bell!', gadgets: [crank(9), out('bell', 'bell', 11)], goals: [{ kind: 'powered', gadgets: ['bell'] }], par: 3, solution: [G(9, 20), G(10, 20), G(11, 20)] },
  { id: 'c02', title: 'Wave hello', say: 'Make a machine that waves hello.', gadgets: [crank(9), out('flag', 'flag', 13)], goals: [{ kind: 'powered', gadgets: ['flag'] }], par: 5, solution: [G(9, 20), G(10, 20), G(11, 20), G(12, 20), G(13, 20)] },
  { id: 'c03', title: 'Same way round', say: 'Make the fan spin the same way as the crank.', gadgets: [crank(9), out('fan', 'fan', 11)], goals: [{ kind: 'sameWay', gadget: 'fan' }], par: 3, solution: [G(9, 20), G(10, 20), G(11, 20)] },
  { id: 'c04', title: 'Backwards clock', say: 'A funny-wrong clock: make the hands go the other way!', gadgets: [crank(9), out('hands', 'hands', 10)], goals: [{ kind: 'oppositeWay', gadget: 'hands' }], par: 2, solution: [G(9, 20), G(10, 20)] },
  { id: 'c05', title: 'Three rings a turn', say: 'Ring the bell three times for every turn of the crank.', gadgets: [crank(9), out('bell', 'bell', 10)], goals: [{ kind: 'ratio', gadget: 'bell', ratio: 3 }], par: 2, solution: [G(9, 30), G(10, 10)] },
  { id: 'c06', title: 'Slow flag', say: 'Make the flag wave slowly — slower than half the crank.', gadgets: [crank(9), out('flag', 'flag', 10)], goals: [{ kind: 'atMost', gadget: 'flag', ratio: 0.5 }], par: 2, solution: [G(9, 10), G(10, 30)] },
  { id: 'c07', title: 'Lamp and bell', say: 'Light the lamp and ring the bell, both from one crank.', gadgets: [crank(10), out('lamp', 'lamp', 9), out('bell', 'bell', 11)], goals: [{ kind: 'powered', gadgets: ['lamp', 'bell'] }], par: 3, solution: [G(10, 20), G(9, 20), G(11, 20)] },
  { id: 'c08', title: 'Fox in the spotlight', say: 'Make the fox dance when the light turns on.', gadgets: [crank(10), out('lamp', 'lamp', 1), out('fox', 'dancer', 19)], goals: [{ kind: 'powered', gadgets: ['lamp', 'fox'] }], par: 3, solution: [G(10, 20), G(1, 20), G(19, 20)] },
  { id: 'c09', title: 'Exactly five', say: 'Ring the far bell using exactly five gears.', gadgets: [crank(9), out('bell', 'bell', 13)], goals: [{ kind: 'powered', gadgets: ['bell'] }, { kind: 'gears', exactly: 5 }], par: 5, solution: [G(9, 20), G(10, 20), G(11, 20), G(12, 20), G(13, 20)] },
  { id: 'c10', title: 'Opposites', say: 'Make the two fans spin opposite ways.', gadgets: [crank(10), out('a', 'fan', 9), out('b', 'fan', 12)], goals: [{ kind: 'opposite', a: 'a', b: 'b' }], par: 4, solution: [G(10, 20), G(9, 20), G(11, 20), G(12, 20)] },
  { id: 'c11', title: 'Speedy top', say: 'Spin the top six times faster than the crank.', gadgets: [crank(9), out('top', 'spinner', 11)], goals: [{ kind: 'ratio', gadget: 'top', ratio: 6 }], par: 4, solution: [G(9, 32), G(10, 8), G(10, 24, 1), G(11, 16, 1)] },
  { id: 'c12', title: 'Twelve to one', say: 'Build clock hands: one turn of the hands for twelve of the crank.', gadgets: [crank(9), out('hands', 'hands', 11)], goals: [{ kind: 'ratio', gadget: 'hands', ratio: 1 / 12 }], par: 4, solution: [G(9, 10), G(10, 30), G(10, 8, 1), G(11, 32, 1)] },
  { id: 'c13', title: 'Make a jam!', say: 'Oops on purpose: make three gears push each other into a jam.', gadgets: [crank(9)], goals: [{ kind: 'jam' }], par: 3, solution: [G(9, 28), G(1, 28), G(10, 12)] },
  { id: 'c14', title: 'Cuckoo call', say: 'Make the cuckoo pop out.', gadgets: [crank(9), out('coo', 'cuckoo', 12)], goals: [{ kind: 'powered', gadgets: ['coo'] }], par: 4, solution: [G(9, 20), G(10, 20), G(11, 20), G(12, 20)] },
  { id: 'c15', title: 'Lazy drum', say: 'Play the music drum slowly, the same way round as the crank.', gadgets: [crank(9), out('drum', 'drum', 11)], goals: [{ kind: 'atMost', gadget: 'drum', ratio: 1 }, { kind: 'sameWay', gadget: 'drum' }], par: 3, solution: [G(9, 12), G(10, 28), G(11, 12)] },
  { id: 'c16', title: 'Fountain', say: 'Pump water up to the fountain at the bottom.', gadgets: [crank(0), out('fountain', 'fountain', 27)], goals: [{ kind: 'powered', gadgets: ['fountain'] }], par: 4, solution: [G(0, 20), G(9, 20), G(18, 20), G(27, 20)] },
  { id: 'c17', title: 'Fewest parts', say: 'Ring the bell two pegs away with only two gears.', gadgets: [crank(9), out('bell', 'bell', 11)], goals: [{ kind: 'powered', gadgets: ['bell'] }, { kind: 'gears', atMost: 2 }], par: 2, solution: [G(9, 40), G(11, 40)] },
  { id: 'c18', title: 'Corner to corner', say: 'Reach the diagonal peg with just two gears.', gadgets: [crank(9), out('bell', 'bell', 1)], goals: [{ kind: 'powered', gadgets: ['bell'] }, { kind: 'gears', atMost: 2 }], par: 2, solution: [G(9, 24), G(1, 32)] },
  { id: 'c19', title: 'Four times faster', say: 'Make the flag flap four times faster than the crank.', gadgets: [crank(9), out('flag', 'flag', 10)], goals: [{ kind: 'ratio', gadget: 'flag', ratio: 4 }], par: 2, solution: [G(9, 32), G(10, 8)] },
  { id: 'c20', title: 'Slowest fan', say: 'Make the fan turn at a quarter of the crank speed or slower.', gadgets: [crank(9), out('fan', 'fan', 10)], goals: [{ kind: 'atMost', gadget: 'fan', ratio: 0.25 }], par: 2, solution: [G(9, 8), G(10, 32)] },
  { id: 'c21', title: 'Bright lamp', say: 'Spin the lamp at least three times faster, so it glows bright.', gadgets: [crank(9), out('lamp', 'lamp', 10)], goals: [{ kind: 'atLeast', gadget: 'lamp', ratio: 3 }], par: 2, solution: [G(9, 30), G(10, 10)] },
  { id: 'c22', title: 'Dance in step', say: 'Make the dancer turn exactly as fast as the crank, the same way.', gadgets: [crank(9), out('fox', 'dancer', 11)], goals: [{ kind: 'ratio', gadget: 'fox', ratio: 1 }, { kind: 'sameWay', gadget: 'fox' }], par: 3, solution: [G(9, 20), G(10, 20), G(11, 20)] },
  { id: 'c23', title: 'The long way round', say: 'Send the turning all the way to the far corner.', gadgets: [crank(0), out('bell', 'bell', 35)], goals: [{ kind: 'powered', gadgets: ['bell'] }], par: 9, solution: [0, 1, 2, 3, 4, 5, 6, 7, 8, 17, 26, 35].map((p) => G(p, 20)) },
  { id: 'c24', title: 'Three at once', say: 'Light the lamp, ring the bell and spin the fan, all together.', gadgets: [crank(10), out('lamp', 'lamp', 9), out('bell', 'bell', 11), out('fan', 'fan', 19)], goals: [{ kind: 'powered', gadgets: ['lamp', 'bell', 'fan'] }], par: 4, solution: [G(10, 20), G(9, 20), G(11, 20), G(19, 20)] },
  { id: 'c25', title: 'Up the lift', say: 'Lift the weight slowly and strongly — a third of the crank speed or slower.', gadgets: [crank(9), out('lift', 'lift', 10)], goals: [{ kind: 'atMost', gadget: 'lift', ratio: 0.34 }], par: 2, solution: [G(9, 10), G(10, 30)] },
  { id: 'c26', title: 'Twice as fast', say: 'Make the top spin exactly twice as fast as the crank.', gadgets: [crank(9), out('top', 'spinner', 11)], goals: [{ kind: 'ratio', gadget: 'top', ratio: 2 }], par: 4, solution: [G(9, 30), G(10, 10), G(10, 16, 1), G(11, 24, 1)] },
  { id: 'c27', title: 'Cuckoo clock', say: 'Make the hands and the cuckoo both go.', gadgets: [crank(10), out('hands', 'hands', 12), out('coo', 'cuckoo', 28)], goals: [{ kind: 'powered', gadgets: ['hands', 'coo'] }], par: 5, solution: [G(10, 20), G(11, 20), G(12, 20), G(19, 20), G(28, 20)] },
  { id: 'c28', title: 'Big wheel', say: 'Use the biggest gear to ring a bell.', gadgets: [crank(9), out('bell', 'bell', 11)], goals: [{ kind: 'powered', gadgets: ['bell'] }, { kind: 'gears', atMost: 2 }], par: 2, solution: [G(9, 40), G(11, 40)] },
  { id: 'c29', title: 'Music box', say: 'Spin the drum and make the fox dance from one crank.', gadgets: [crank(11), out('drum', 'drum', 9), out('fox', 'dancer', 13)], goals: [{ kind: 'powered', gadgets: ['drum', 'fox'] }], par: 5, solution: [G(11, 20), G(10, 20), G(9, 20), G(12, 20), G(13, 20)] },
  { id: 'c30', title: 'Clockwork orchestra', say: 'Bell, drum, fan and flag — all playing at once!', gadgets: [crank(13), out('bell', 'bell', 11), out('drum', 'drum', 15), out('fan', 'fan', 4), out('flag', 'flag', 22)], goals: [{ kind: 'powered', gadgets: ['bell', 'drum', 'fan', 'flag'] }], par: 7, solution: [G(13, 20), G(12, 20), G(11, 20), G(14, 20), G(15, 20), G(4, 20), G(22, 20)] },
];

// ───────────────────────────── Contraption Codes ─────────────────────────────

/** Crockford-style alphabet: no I, L, O or U, so codes are easy to read aloud. */
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function toBits(n: number, width: number): string {
  return n.toString(2).padStart(width, '0');
}

export function encodeBench(s: BenchState): string {
  let bits = toBits(s.gadgets.length, 4) + toBits(s.gears.length, 6);
  for (const g of s.gadgets) bits += toBits(g.peg, 6) + toBits(GADGETS.indexOf(g.kind), 4);
  for (const g of s.gears) bits += toBits(g.peg, 6) + toBits(g.layer, 1) + toBits(BENCH_TEETH.indexOf(g.teeth), 4);
  while (bits.length % 5) bits += '0';
  let out = '';
  let sum = 0;
  for (let i = 0; i < bits.length; i += 5) {
    const v = parseInt(bits.slice(i, i + 5), 2);
    sum += v;
    out += CODE_ALPHABET[v];
  }
  return out + CODE_ALPHABET[sum % 32];
}

export function decodeBench(code: string): BenchState | null {
  const clean = code.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (clean.length < 3) return null;
  const vals = [...clean].map((ch) => CODE_ALPHABET.indexOf(ch));
  if (vals.some((v) => v < 0)) return null;
  const check = vals.pop()!;
  if (vals.reduce((a, b) => a + b, 0) % 32 !== check) return null;
  const bits = vals.map((v) => toBits(v, 5)).join('');
  let i = 0;
  const read = (w: number) => {
    const v = parseInt(bits.slice(i, i + w) || '0', 2);
    i += w;
    return v;
  };
  const nGad = read(4);
  const nGear = read(6);
  if (i + nGad * 10 + nGear * 11 > bits.length) return null;
  const gadgets: BenchGadget[] = [];
  for (let k = 0; k < nGad; k++) {
    const peg = read(6);
    const kind = GADGETS[read(4)];
    if (!kind || peg >= PEG_COUNT) return null;
    gadgets.push({ id: `g${k}`, kind, peg });
  }
  const gears: BenchGear[] = [];
  for (let k = 0; k < nGear; k++) {
    const peg = read(6);
    const layer = read(1) as 0 | 1;
    const teeth = BENCH_TEETH[read(4)];
    if (!teeth || peg >= PEG_COUNT) return null;
    gears.push({ peg, layer, teeth });
  }
  return { gadgets, gears };
}
