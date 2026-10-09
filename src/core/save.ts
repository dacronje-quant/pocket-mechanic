/**
 * Saves: up to 6 local profiles plus device-wide grown-up settings (GDD §21.3, §28).
 * Browser storage can be missing or throw (private mode, blocked site data),
 * so every access is guarded and the game still runs — it just forgets.
 */
import { DEFAULT_LOOK, TESS_LOOK, type KipLook } from '../content/cosmetics';
import type { Family, PlayStyleId, ToolId } from '../content/types';

export interface Settings {
  music: number;
  sfx: number;
  voice: number;
  muted: boolean;
  /** Calm Visuals: fewer particles, no camera bumps or flashes (GDD §25.5). */
  calm: boolean;
  /** Soft Clockwork: gentler bells, whistles and sparks (GDD §23.4). */
  soft: boolean;
  /** High contrast: outlines everything you can touch (GDD §25.2). */
  contrast: boolean;
  /** Snap assist multiplier, independent of Play Style (GDD §25.1). */
  snap: number;
  /** Read every menu and page aloud. */
  readAloud: boolean;
  /** Subtitles: automatic (off in Little Tinker), always or never. */
  subtitles: 'auto' | 'on' | 'off';
  /** Closing Time play timer in minutes; 0 = off (GDD §26.2). */
  closingMin: number;
  windDown: boolean;
  /** Wind-Down starts automatically from this hour (24h), or never. */
  windDownHour: number | null;
  /** Co-op: Tess on screen, or Outside Hands (GDD §21). */
  coop: 'off' | 'tess' | 'hands';
  /** Hint timing multiplier (GDD §25.4 adjustable hint timing). */
  hintPace: number;
}

export const DEFAULT_SETTINGS: Settings = {
  music: 0.5,
  sfx: 0.8,
  voice: 0.9,
  muted: false,
  calm: false,
  soft: false,
  contrast: false,
  snap: 1,
  readAloud: false,
  subtitles: 'auto',
  closingMin: 0,
  windDown: false,
  windDownHour: null,
  coop: 'off',
  hintPace: 1,
};

export interface RoomRecord {
  fixed: boolean;
  gold: number[];
  /** Best Tune-Up medal: 0 none, 1 Copper, 2 Silver, 3 Gold, 4 Brass Masterpiece. */
  medal: number;
  best?: { moves: number; secs: number };
}

export interface Stats {
  rooms: number;
  fiddles: number;
  peeks: number;
  hints: number;
  quick: number;
  cards: number;
  families: Partial<Record<Family, number>>;
  minutes: number;
}

export interface Profile {
  id: string;
  initials: string;
  avatar: number;
  style: PlayStyleId;
  created: number;
  rooms: Record<string, RoomRecord>;
  repairs: number[];
  shiny: number;
  owned: string[];
  look: KipLook;
  tessLook: KipLook;
  looks: KipLook[];
  treasures: string[];
  marks: string[];
  pedia: string[];
  blueprints: string[];
  tools: ToolId[];
  songs: string[];
  composed: Array<{ name: string; pins: string[] }>;
  stamps: string[];
  flags: string[];
  seen: string[];
  furniture: string[];
  nook: Record<number, string>;
  bench: { saved: Array<{ name: string; code: string }>; cards: Record<string, number> };
  attic: { rooms: string[]; box: boolean };
  nest: Record<number, string> | null;
  stats: Stats;
  /** Short log for the grown-ups' "What We Learned" summary. */
  log: Array<{ t: number; what: string }>;
}

export interface SaveFile {
  v: 2;
  active: string | null;
  profiles: Profile[];
  settings: Settings;
}

const KEY = 'pocket-mechanic.save.v2';
const OLD_KEY = 'pocket-mechanic.save.v1';
export const MAX_PROFILES = 6;

export function newProfile(initials: string, avatar: number, style: PlayStyleId): Profile {
  return {
    id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    initials: initials.slice(0, 3).toUpperCase(),
    avatar,
    style,
    created: Date.now(),
    rooms: {},
    repairs: [],
    shiny: 0,
    owned: [],
    look: { ...DEFAULT_LOOK, initials: initials.slice(0, 3).toUpperCase() },
    tessLook: { ...TESS_LOOK },
    looks: [],
    treasures: [],
    marks: [],
    pedia: [],
    blueprints: [],
    tools: ['beam'],
    songs: [],
    composed: [],
    stamps: [],
    flags: [],
    seen: [],
    furniture: ['matchbox-bed'],
    nook: { 0: 'matchbox-bed' },
    bench: { saved: [], cards: {} },
    attic: { rooms: [], box: false },
    nest: null,
    stats: { rooms: 0, fiddles: 0, peeks: 0, hints: 0, quick: 0, cards: 0, families: {}, minutes: 0 },
    log: [],
  };
}

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — progress just isn't kept */
  }
}

/** Fill in any fields a profile from an older version is missing. */
function repairProfile(p: Partial<Profile>): Profile {
  const base = newProfile(p.initials ?? '', p.avatar ?? 0, p.style ?? 'fixer');
  const out = { ...base, ...p } as Profile;
  out.stats = { ...base.stats, ...(p.stats ?? {}) };
  out.look = { ...DEFAULT_LOOK, ...(p.look ?? {}) };
  out.tessLook = { ...TESS_LOOK, ...(p.tessLook ?? {}) };
  out.bench = { ...base.bench, ...(p.bench ?? {}) };
  out.attic = { ...base.attic, ...(p.attic ?? {}) };
  return out;
}

export function loadSave(): SaveFile {
  const empty: SaveFile = { v: 2, active: null, profiles: [], settings: { ...DEFAULT_SETTINGS } };
  try {
    const raw = storageGet(KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<SaveFile>;
      return {
        v: 2,
        active: data.active ?? null,
        profiles: (data.profiles ?? []).slice(0, MAX_PROFILES).map(repairProfile),
        settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
      };
    }
    // the first prototype saved Golden Gears for the Gear Gallery: bring them along
    const old = storageGet(OLD_KEY);
    if (old) {
      const o = JSON.parse(old) as { style?: PlayStyleId; goldenGears?: string[]; muted?: boolean };
      const p = newProfile('KIP', 0, o.style ?? 'fixer');
      const gold = (o.goldenGears ?? []).filter((g) => g.startsWith('gear-gallery:')).map((g) => Number(g.split(':')[1]));
      if (gold.length) p.rooms['1-2'] = { fixed: gold.includes(1), gold, medal: 0 };
      return { ...empty, profiles: [p], active: p.id, settings: { ...DEFAULT_SETTINGS, muted: !!o.muted } };
    }
  } catch {
    /* corrupt or blocked: start fresh */
  }
  return empty;
}

export const save: SaveFile = loadSave();

let pending: ReturnType<typeof setTimeout> | null = null;

/** Write the save now (called at every room and repair — GDD §30.4). */
export function persist(): void {
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  storageSet(KEY, JSON.stringify(save));
}

/** Write soon (batches many small changes, e.g. fiddle toys). */
export function persistSoon(): void {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    persist();
  }, 800);
}

export function activeProfile(): Profile | null {
  return save.profiles.find((p) => p.id === save.active) ?? null;
}

/** The active profile, or a throwaway guest so scenes never crash. */
let guest: Profile | null = null;
export function profile(): Profile {
  const p = activeProfile();
  if (p) return p;
  guest ??= newProfile('', 0, 'fixer');
  return guest;
}

export function addProfile(initials: string, avatar: number, style: PlayStyleId): Profile | null {
  if (save.profiles.length >= MAX_PROFILES) return null;
  const p = newProfile(initials, avatar, style);
  save.profiles.push(p);
  save.active = p.id;
  persist();
  return p;
}

export function switchProfile(id: string): void {
  if (save.profiles.some((p) => p.id === id)) {
    save.active = id;
    persist();
  }
}

export function removeProfile(id: string): void {
  save.profiles = save.profiles.filter((p) => p.id !== id);
  if (save.active === id) save.active = save.profiles[0]?.id ?? null;
  persist();
}

export function settings(): Settings {
  return save.settings;
}
