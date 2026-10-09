/** Play Styles (GDD §12.1) and the small amount of saved progress. */

export type PlayStyleId = 'tinker' | 'fixer' | 'engineer';

export interface PlayStyle {
  id: PlayStyleId;
  name: string;
  icon: string;
  tagline: string;
  /** Snap radius in game pixels (GDD §9.1). */
  snapRadius: number;
  /** Snap as soon as the part is in range, without waiting for release. */
  snapOnHover: boolean;
  /** Ghost outline of the missing part: always, after N seconds, or only in Peek Lens. */
  ghost: 'always' | 'delayed' | 'peekOnly';
  ghostDelayMs: number;
  /** Show tooth counts and the ratio gauge. */
  showNumbers: boolean;
  /** Which tray gears appear (tooth counts). */
  tray: number[];
}

export const PLAY_STYLES: Record<PlayStyleId, PlayStyle> = {
  tinker: {
    id: 'tinker',
    name: 'Little Tinker',
    icon: '🪛',
    tagline: 'Click, clunk, and make it go!',
    snapRadius: 150,
    snapOnHover: true,
    ghost: 'always',
    ghostDelayMs: 0,
    showNumbers: false,
    tray: [20],
  },
  fixer: {
    id: 'fixer',
    name: 'Fixer',
    icon: '🔧',
    tagline: 'Find the problem and fix it!',
    snapRadius: 90,
    snapOnHover: false,
    ghost: 'delayed',
    ghostDelayMs: 30_000,
    showNumbers: false,
    tray: [12, 20, 32],
  },
  engineer: {
    id: 'engineer',
    name: 'Engineer',
    icon: '📐',
    tagline: 'Gears, gates and genius!',
    snapRadius: 55,
    snapOnHover: false,
    ghost: 'peekOnly',
    ghostDelayMs: 0,
    showNumbers: true,
    tray: [12, 20, 32],
  },
};

const KEY = 'pocket-mechanic.save.v1';

export interface SaveData {
  style: PlayStyleId;
  goldenGears: string[]; // ids like "gear-gallery:1"
  muted: boolean;
}

const DEFAULT_SAVE: SaveData = { style: 'fixer', goldenGears: [], muted: false };

// Browser storage can be missing or throw (private mode, blocked site data),
// so every access is guarded and the game still runs without it.
export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    return { ...DEFAULT_SAVE, ...(JSON.parse(raw) as Partial<SaveData>) };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function save(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — progress just isn't kept */
  }
}

export const game = { data: load() };

export function awardGoldenGear(id: string): boolean {
  if (game.data.goldenGears.includes(id)) return false;
  game.data.goldenGears.push(id);
  save(game.data);
  return true;
}
