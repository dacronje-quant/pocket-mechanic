/**
 * Content types. Every room is plain data plus a room kind (BUILD_PLAN §2);
 * the rules for each kind live in src/rules (pure) and the scenes in src/rooms.
 */
import type { VarietyKind, VarietyRoomDef } from './variety-types';
import type { LeverGoal, LeverWeight } from '../mechanism/balance';
import type { CamShape } from '../mechanism/cams';
import type { Card, Scenario } from '../mechanism/cards';
import type { ChainLink } from '../mechanism/chain';
import type { TrainGoal } from '../mechanism/flow';
import type { GateType, LogicNode } from '../mechanism/logic';
import type { Pin } from '../mechanism/pins';

export type PlayStyleId = 'tinker' | 'fixer' | 'engineer';

export type RoomKind =
  | 'gear'
  | 'flow'
  | 'light'
  | 'logic'
  | 'cards'
  | 'music'
  | 'tune'
  | 'pendulum'
  | 'balance'
  | 'oil'
  | 'cam'
  | 'chain'
  | 'hunt'
  | 'busy'
  | 'nest'
  | VarietyKind;

export type ThemeId = 'clock' | 'musicbox' | 'train' | 'radio' | 'tea' | 'bertie' | 'orrery' | 'tower' | 'shop' | 'attic' | 'bench' | 'home';

export type Family = 'gears' | 'levers' | 'springs' | 'pendulums' | 'music' | 'tracks' | 'circuits' | 'pipes' | 'logic' | 'light';

export type ToolId = 'beam' | 'oilcan' | 'peek' | 'boots' | 'grapple' | 'spool' | 'wrench' | 'pencil' | 'prism' | 'fork';

export type ResidentId = 'coo' | 'clementine' | 'mice' | 'humbugs' | 'steamington' | 'sprites' | 'lumen' | 'pigeons' | 'magnus' | 'whisker';

export interface Spot {
  x: number;
  y: number;
}

/** Golden Gear ③: the clever optional objective (GDD §13.4). */
export type Clever =
  | { kind: 'fiddle' } // touch every fiddle toy
  | { kind: 'par' } // fix it within the par moves
  | { kind: 'noHints' }
  | { kind: 'noPeek' }
  | { kind: 'special'; id: string; label: string };

export interface RoomBase {
  id: string;
  kind: RoomKind;
  title: string;
  theme: ThemeId;
  families: Family[];
  /** Part-o-pedia entries this room introduces. */
  pedia: string[];
  /** Nana's spoken goal ("What was I doing?"). */
  intro: string;
  /** Three-tier hints: nudge → strong clue → show me. */
  hints: [string, string, string];
  /** Golden Gear ②: a hidden spot that shimmers in the Peek Lens. */
  hidden?: Spot;
  clever?: Clever;
  /** Tune-Up par (Engineer rules). */
  par?: { moves: number; seconds: number };
  treasure?: { id: string } & Spot;
  mark?: Spot;
  blueprint?: { id: string } & Spot;
  /** Dark room: Kip's antenna glows and the Outside Hands carry a flashlight. */
  dark?: boolean;
  /** Tool Kip receives when this room is fixed. */
  gives?: ToolId;
  resident?: ResidentId;
  /** Act III helper from an earlier repair (shown in the room). */
  helper?: 'bertie' | 'tea' | 'train' | 'coo' | 'orrery' | 'radio' | 'musicbox';
  /** Little Tinker gets the automatic one-step version unless this is false. */
  simplify?: boolean;
}

/** Per-Play-Style overrides (GDD §12.1: Play Styles change rules, not just numbers). */
export type Styled<T> = T & { styles?: Partial<Record<PlayStyleId, Partial<T>>> };

// ─────────────────────────────── gears ───────────────────────────────

export type GearPaint = 'brass' | 'copper' | 'steel' | 'gold';
export type GearWidget = 'hands' | 'fan' | 'wheels' | 'arm' | 'lift' | 'drum' | 'bell' | 'spinner' | 'grinder' | 'paddle' | 'dial';
export type DriverArt = 'weights' | 'crank' | 'spring' | 'motor' | 'steam' | 'water';

export interface GearShaft extends Spot {
  id: string;
  /** Empty peg the player can fill. */
  peg?: boolean;
  /** Layers this shaft can hold (two layers = a compound shaft). Default [0]. */
  layers?: number[];
  /** Gears fixed to this shaft. */
  gears?: Array<{ teeth: number; layer?: number; paint?: GearPaint }>;
}

export interface GearOutput {
  shaft: string;
  widget: GearWidget;
  at: Spot;
  size?: number;
  /** Required direction on screen: 1 = clockwise. */
  dir?: 1 | -1;
  /** Required speed relative to the driver (|ω_out / ω_in|). */
  ratio?: number;
  maxRatio?: number;
  minRatio?: number;
  tol?: number;
  label?: string;
}

export interface GearPlacement {
  shaft: string;
  layer: number;
  teeth: number;
}

export interface GearRoomDef extends RoomBase {
  kind: 'gear';
  shafts: GearShaft[];
  driver: { shaft: string; source: DriverArt; at?: Spot; dir?: 1 | -1; turnsPerSecond?: number };
  outputs: GearOutput[];
  tray: number[];
  initial?: GearPlacement[];
  solution: GearPlacement[];
}

// ─────────────────────────────── grids ───────────────────────────────

export interface FlowRoomDef extends RoomBase {
  kind: 'flow';
  family: 'pipes' | 'circuit' | 'tracks';
  grid: string[];
  /** Tile parts in the drawer, e.g. "L", "I", "T", "O". */
  tray: string[];
  trains?: TrainGoal[];
}

export interface LightRoomDef extends RoomBase {
  kind: 'light';
  grid: string[];
  /** Optics in the drawer: R mirror, P prism, N lens, Fr/Fg/Fb filters. */
  tray: string[];
}

// ─────────────────────────────── logic & cards ───────────────────────────────

export type LogicArt = 'lever' | 'plate' | 'button' | 'eye' | 'clap' | 'door' | 'lamp' | 'sign' | 'bertie' | 'flag' | 'radio' | 'bell';

export interface LogicRoomNode extends LogicNode, Spot {
  art?: LogicArt;
  /** Gate slot the player fills from the drawer. */
  slot?: boolean;
  /** Button that springs back (a pulse), for latches. */
  momentary?: boolean;
  label?: string;
}

export type LogicGoal =
  | { kind: 'reach'; output: string }
  | { kind: 'truth'; output: string; expr: string }
  | { kind: 'sequence'; output: string; steps: Array<{ set: Record<string, boolean>; expect: boolean }> };

export interface LogicRoomDef extends RoomBase {
  kind: 'logic';
  nodes: LogicRoomNode[];
  tray: GateType[];
  goal: LogicGoal;
  solution: { gates?: Record<string, GateType>; inputs?: Record<string, boolean> };
}

export interface CardsRoomDef extends RoomBase {
  kind: 'cards';
  slots: number;
  tray: Card[];
  scenarios: Scenario[];
  solution: Card[];
  /** The Big Show: a stage, a crowd and a longer routine. */
  show?: boolean;
}

// ─────────────────────────────── music, tuning, timing ───────────────────────────────

export interface MusicRoomDef extends RoomBase {
  kind: 'music';
  steps: number;
  notes: number;
  melody: Pin[];
  /** Melody pins that start missing (indexes into melody). */
  missing: number[];
  /** Wrong pins that start in place (Engineer: find and pull them). */
  extra?: Pin[];
  /** Steps per second. */
  tempo: number;
}

export type TuneMode = 'comb' | 'radio' | 'boiler' | 'whistle';

export interface TuneRoomDef extends RoomBase {
  kind: 'tune';
  mode: TuneMode;
  dials: Array<{ id: string; start: number; target: number; tol: number }>;
}

export interface PendulumRoomDef extends RoomBase {
  kind: 'pendulum';
  goal: 'push' | 'tempo' | 'sync';
  pendulums: Array<{ id: string; notch: number; fixed?: boolean }>;
  minNotch: number;
  maxNotch: number;
  /** The escapement is missing its pallet piece (Fixer). */
  pallet?: boolean;
  bpm?: number;
  solution: { notches?: Record<string, number> };
}

export interface BalanceRoomDef extends RoomBase {
  kind: 'balance';
  mode: 'lever' | 'pulley';
  lever?: {
    half: number;
    fulcrum: number;
    fulcrumMin?: number;
    fulcrumMax?: number;
    fixed: LeverWeight[];
    /** Beam positions where drawer weights can hang. */
    slots: number[];
    /** Masses in the drawer. */
    tray: number[];
    goal: LeverGoal;
    /** Kip hangs on the lever here when it's pulled. */
    kip?: { pos: number; mass: number };
    art?: 'weights' | 'bridge' | 'tower';
  };
  pulley?: {
    load: number;
    strength: number;
    slots: number;
    wheels: number;
    /** An Act III helper adds strength (Big Bertie). */
    helper?: number;
    art?: 'bridge' | 'weights' | 'well';
  };
  solution: { fulcrum?: number; weights?: Array<{ slot: number; mass: number }>; wheels?: number };
}

export type OilArt = 'gear' | 'hinge' | 'spring' | 'wheel' | 'bearing';

export interface OilRoomDef extends RoomBase {
  kind: 'oil';
  parts: Array<{ id: string; x: number; y: number; art: OilArt; size: number; required: boolean }>;
  crank?: Spot & { turns: number };
  pawl?: Spot;
  payoff: 'stair' | 'door' | 'jack' | 'timer' | 'vane' | 'spring' | 'vault';
}

export type FollowerArt = 'fox' | 'butler' | 'bird' | 'hammer' | 'dancer' | 'cat' | 'teapot';

export interface CamRoomDef extends RoomBase {
  kind: 'cam';
  followers: Array<{ id: string; art: FollowerArt; target: number[]; start?: { shape: CamShape; phase: number } }>;
  tray: CamShape[];
  solution: Record<string, { shape: CamShape; phase: number }>;
}

export interface ChainRoomDef extends RoomBase {
  kind: 'chain';
  links: ChainLink[];
  tray: string[];
  /** The object that springs to life in the Test Run. */
  reveal: string;
}

// ─────────────────────────────── exploring & making ───────────────────────────────

export type CoverArt = 'cushion' | 'crate' | 'box' | 'leaf' | 'hat' | 'spool';
export type HuntItem = 'crank' | 'gear' | 'spring' | 'bits' | 'humbug' | 'button' | 'boots' | 'key' | 'feather' | 'photo';

export interface HuntRoomDef extends RoomBase {
  kind: 'hunt';
  covers: Array<Spot & { art: CoverArt; item?: HuntItem; target?: boolean }>;
}

export type BusyArt = 'button' | 'switch' | 'dial' | 'crank' | 'bell' | 'lever' | 'spinner' | 'horn' | 'lights';

export interface BusyRoomDef extends RoomBase {
  kind: 'busy';
  gadgets: Array<Spot & { art: BusyArt; color: number }>;
  need: number;
}

export type NestDeco = 'gear' | 'spring' | 'bulb' | 'bell' | 'mirror' | 'ribbon' | 'button' | 'musicbox' | 'pinwheel' | 'key' | 'spoon' | 'star';

export interface NestRoomDef extends RoomBase {
  kind: 'nest';
  slots: Spot[];
  tray: NestDeco[];
  need: number;
}

export type RoomDef =
  | Styled<GearRoomDef>
  | Styled<FlowRoomDef>
  | Styled<LightRoomDef>
  | Styled<LogicRoomDef>
  | Styled<CardsRoomDef>
  | Styled<MusicRoomDef>
  | Styled<TuneRoomDef>
  | Styled<PendulumRoomDef>
  | Styled<BalanceRoomDef>
  | Styled<OilRoomDef>
  | Styled<CamRoomDef>
  | Styled<ChainRoomDef>
  | Styled<HuntRoomDef>
  | Styled<BusyRoomDef>
  | Styled<NestRoomDef>
  | { [K in VarietyKind]: Styled<Extract<VarietyRoomDef, { kind: K }>> }[VarietyKind];


// ─────────────────────────────── people & story ───────────────────────────────

export type CharId =
  | 'nana'
  | 'kip'
  | 'tess'
  | 'albert'
  | 'rosa'
  | 'theo'
  | 'ada'
  | 'marigold'
  | 'pepperwhistle'
  | 'pockets'
  | 'juniper'
  | 'magnus'
  | 'coo'
  | 'clementine'
  | 'mice'
  | 'humbug'
  | 'steamington'
  | 'bertie'
  | 'lumen'
  | 'pigeon'
  | 'whisker'
  | 'pudding'
  | 'pip'
  | 'ade'
  | 'odum'
  | 'lindqvist'
  | 'busker'
  | 'mateo'
  | 'odette'
  | 'fisher';

export type Mood = 'happy' | 'sad' | 'surprised' | 'proud' | 'worried' | 'laugh' | 'sleepy' | 'grand';

export type Backdrop = 'storm' | 'shop' | 'shopNight' | 'bakery' | 'street' | 'party' | 'harbor' | 'cafe' | 'fair' | 'classroom' | 'tower' | 'nest' | 'festival' | 'attic';

export interface StoryLine {
  id: string;
  who: CharId;
  text: string;
  mood?: Mood;
  /** A sound or visual beat played with the line. */
  sfx?: 'thunder' | 'bell' | 'doorbell' | 'cuckoo' | 'lullaby' | 'whistle' | 'static' | 'steam' | 'dance' | 'stars' | 'bong' | 'flap' | 'cheer' | 'sparkle' | 'purr';
}

export interface StoryDef {
  id: string;
  bg: Backdrop;
  cast: CharId[];
  /** Object shown on the bench/stage. */
  object?: { id: string; working?: boolean };
  lines: StoryLine[];
}

// ─────────────────────────────── structure ───────────────────────────────

export interface RepairDef {
  id: number;
  key: string;
  title: string;
  tagline: string;
  owner: CharId;
  ownerName: string;
  theme: ThemeId;
  object: string;
  resident: ResidentId | null;
  rooms: string[];
  tools: ToolId[];
  /** Thank-You Token (a cosmetic id). */
  reward: string;
  treasures: string[];
  mark?: string;
  doorbell: string;
  ret: string;
  /** Story beats after the Return. */
  after?: string[];
  song?: string;
  /** Repairs that must be done first (GDD §13.3). */
  requires: number[];
  color: number;
}

export interface QuickFixDef {
  id: string;
  title: string;
  owner: CharId;
  ownerName: string;
  object: string;
  payoff: string;
  /** Unlocks after this Great Repair (0 = from the start). */
  after: number;
  reward: string;
  room: RoomDef;
}

export interface AtticObjectDef {
  id: string;
  title: string;
  /** Room kinds for its three generated rooms. */
  kinds: Array<'gear' | 'pipes' | 'circuit' | 'tracks' | 'light' | 'logic'>;
  clue: string;
  history: string;
}
