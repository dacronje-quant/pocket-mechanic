/**
 * Chain reactions (GDD §17): the Big Fix set pieces. A chain is a row of
 * linked mechanisms. Each link takes one kind of signal in and passes another
 * out (a cam turns "turn" into "push", a dynamo turns "turn" into "spark"…).
 * The signal travels from the source to the goal; it stops at an empty slot or
 * at a part that can't use what arrives (which just wobbles — nothing breaks).
 */

export type Signal = 'turn' | 'push' | 'pull' | 'spark' | 'steam' | 'water' | 'light' | 'marble' | 'sound';

export type ChainFamily = 'gears' | 'levers' | 'springs' | 'pendulums' | 'music' | 'tracks' | 'circuits' | 'pipes' | 'logic' | 'light';

export interface LinkPart {
  id: string;
  in?: Signal; // undefined for sources
  out?: Signal; // undefined for goals
  family: ChainFamily;
}

/** Every link part in the game. Art and names live in the art/content layers under the same ids. */
export const LINK_PARTS: Record<string, LinkPart> = {
  // sources
  hourwheel: { id: 'hourwheel', out: 'turn', family: 'gears' },
  crank: { id: 'crank', out: 'turn', family: 'gears' },
  windkey: { id: 'windkey', out: 'turn', family: 'springs' },
  dropweight: { id: 'dropweight', out: 'pull', family: 'levers' },
  plug: { id: 'plug', out: 'spark', family: 'circuits' },
  tap: { id: 'tap', out: 'water', family: 'pipes' },
  sunlamp: { id: 'sunlamp', out: 'light', family: 'light' },
  button: { id: 'button', out: 'push', family: 'logic' },
  // mechanical
  weights: { id: 'weights', in: 'pull', out: 'turn', family: 'levers' },
  gearbox: { id: 'gearbox', in: 'turn', out: 'turn', family: 'gears' },
  escapement: { id: 'escapement', in: 'turn', out: 'turn', family: 'springs' },
  pendulum: { id: 'pendulum', in: 'turn', out: 'turn', family: 'pendulums' },
  mainspring: { id: 'mainspring', in: 'turn', out: 'turn', family: 'springs' },
  governor: { id: 'governor', in: 'turn', out: 'turn', family: 'springs' },
  hands: { id: 'hands', in: 'turn', out: 'turn', family: 'gears' },
  cam: { id: 'cam', in: 'turn', out: 'push', family: 'music' },
  crankrod: { id: 'crankrod', in: 'turn', out: 'push', family: 'gears' },
  lever: { id: 'lever', in: 'push', out: 'pull', family: 'levers' },
  winch: { id: 'winch', in: 'turn', out: 'pull', family: 'levers' },
  pulley: { id: 'pulley', in: 'pull', out: 'pull', family: 'levers' },
  ropelift: { id: 'ropelift', in: 'pull', out: 'push', family: 'levers' },
  cylinder: { id: 'cylinder', in: 'turn', out: 'sound', family: 'music' },
  bellows: { id: 'bellows', in: 'push', out: 'sound', family: 'music' },
  striker: { id: 'striker', in: 'push', out: 'sound', family: 'music' },
  cardreader: { id: 'cardreader', in: 'turn', out: 'push', family: 'logic' },
  train: { id: 'train', in: 'turn', out: 'marble', family: 'tracks' },
  // electrical
  dynamo: { id: 'dynamo', in: 'turn', out: 'spark', family: 'circuits' },
  motor: { id: 'motor', in: 'spark', out: 'turn', family: 'circuits' },
  switch: { id: 'switch', in: 'push', out: 'spark', family: 'circuits' },
  tube: { id: 'tube', in: 'spark', out: 'spark', family: 'circuits' },
  speaker: { id: 'speaker', in: 'spark', out: 'sound', family: 'circuits' },
  bulb: { id: 'bulb', in: 'spark', out: 'light', family: 'circuits' },
  microphone: { id: 'microphone', in: 'sound', out: 'spark', family: 'circuits' },
  // light
  eye: { id: 'eye', in: 'light', out: 'spark', family: 'light' },
  mirror: { id: 'mirror', in: 'light', out: 'light', family: 'light' },
  lens: { id: 'lens', in: 'light', out: 'light', family: 'light' },
  starplate: { id: 'starplate', in: 'light', out: 'light', family: 'light' },
  // fluids
  pump: { id: 'pump', in: 'turn', out: 'water', family: 'pipes' },
  valve: { id: 'valve', in: 'water', out: 'water', family: 'pipes' },
  kettle: { id: 'kettle', in: 'water', out: 'steam', family: 'pipes' },
  piston: { id: 'piston', in: 'steam', out: 'push', family: 'pipes' },
  waterwheel: { id: 'waterwheel', in: 'water', out: 'turn', family: 'pipes' },
  whistle: { id: 'whistle', in: 'steam', out: 'sound', family: 'pipes' },
  spout: { id: 'spout', in: 'push', out: 'water', family: 'pipes' },
  // logic & marbles
  trapdoor: { id: 'trapdoor', in: 'push', out: 'marble', family: 'logic' },
  chute: { id: 'chute', in: 'marble', out: 'marble', family: 'logic' },
  plate: { id: 'plate', in: 'marble', out: 'push', family: 'logic' },
  // goals
  coo: { id: 'coo', in: 'sound', family: 'music' },
  clementine: { id: 'clementine', in: 'sound', family: 'music' },
  candles: { id: 'candles', in: 'light', family: 'circuits' },
  boats: { id: 'boats', in: 'sound', family: 'circuits' },
  teacups: { id: 'teacups', in: 'water', family: 'pipes' },
  stars: { id: 'stars', in: 'light', family: 'light' },
  bell: { id: 'bell', in: 'push', family: 'music' },
  monkey: { id: 'monkey', in: 'push', family: 'levers' },
  bike: { id: 'bike', in: 'push', family: 'levers' },
};

export interface ChainLink {
  /** A fixed part already in place. */
  part?: string;
  /** An empty slot the player fills; `sol` is the authored answer. */
  slot?: boolean;
  sol?: string;
}

export interface ChainRun {
  ok: boolean;
  /** Index of the link where the signal stopped (or the goal index when ok). */
  reached: number;
  stop?: 'gap' | 'mismatch';
  /** Signal arriving at each link, for the travelling-glow animation. */
  signals: Signal[];
}

export function partAt(links: ChainLink[], placed: Record<number, string | undefined>, i: number): LinkPart | undefined {
  const id = links[i].part ?? placed[i];
  return id ? LINK_PARTS[id] : undefined;
}

export function runChain(links: ChainLink[], placed: Record<number, string | undefined> = {}): ChainRun {
  const signals: Signal[] = [];
  const src = partAt(links, placed, 0);
  if (!src?.out) return { ok: false, reached: 0, stop: 'gap', signals };
  let sig: Signal = src.out;
  for (let i = 1; i < links.length; i++) {
    signals.push(sig);
    const p = partAt(links, placed, i);
    if (!p) return { ok: false, reached: i, stop: 'gap', signals };
    if (p.in !== sig) return { ok: false, reached: i, stop: 'mismatch', signals };
    if (!p.out) return { ok: i === links.length - 1, reached: i, signals };
    sig = p.out;
  }
  return { ok: false, reached: links.length - 1, stop: 'gap', signals };
}

export function solvedPlacement(links: ChainLink[]): Record<number, string> {
  const out: Record<number, string> = {};
  links.forEach((l, i) => {
    if (l.slot && l.sol) out[i] = l.sol;
  });
  return out;
}

/** Contraption score (GDD §17.4): distinct links and distinct mechanical families. */
export function chainScore(links: ChainLink[], placed: Record<number, string | undefined>): { steps: number; systems: number } {
  const fams = new Set<string>();
  let steps = 0;
  links.forEach((_, i) => {
    const p = partAt(links, placed, i);
    if (!p) return;
    steps++;
    fams.add(p.family);
  });
  return { steps, systems: fams.size };
}
