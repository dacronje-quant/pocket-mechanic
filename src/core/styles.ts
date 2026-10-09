/** Play Styles (GDD §12.1): tools, not ages. They change the rules, not just numbers. */
import type { PlayStyleId } from '../content/types';

export interface PlayStyle {
  id: PlayStyleId;
  name: string;
  icon: string;
  tagline: string;
  /** Snap radius in game pixels (GDD §9.1). */
  snapRadius: number;
  /** Snap as soon as the part is in range, without waiting for release. */
  snapOnHover: boolean;
  /** Turn parts to fit automatically. */
  autoRotate: boolean;
  /** Ghost outlines of missing parts: always, after a delay, or only in the Peek Lens. */
  ghost: 'always' | 'delayed' | 'peekOnly';
  ghostDelay: number;
  /** Tooth counts, ratio gauges, gate labels. */
  numbers: boolean;
  /** Hint ladder in seconds of being stuck (GDD §10.2): point, pulse, spoken nudge, ghost path. */
  hintAt: { point: number; pulse: number; nudge: number; path: number } | null;
}

export const PLAY_STYLES: Record<PlayStyleId, PlayStyle> = {
  tinker: {
    id: 'tinker',
    name: 'Little Tinker',
    icon: '🪛',
    tagline: 'Click, clunk, and make it go!',
    snapRadius: 150,
    snapOnHover: true,
    autoRotate: true,
    ghost: 'always',
    ghostDelay: 0,
    numbers: false,
    hintAt: { point: 20, pulse: 45, nudge: 90, path: 120 },
  },
  fixer: {
    id: 'fixer',
    name: 'Fixer',
    icon: '🔧',
    tagline: 'Find the problem and fix it!',
    snapRadius: 90,
    snapOnHover: false,
    autoRotate: true,
    ghost: 'delayed',
    ghostDelay: 30,
    numbers: false,
    hintAt: { point: 45, pulse: 90, nudge: 120, path: 200 },
  },
  engineer: {
    id: 'engineer',
    name: 'Engineer',
    icon: '📐',
    tagline: 'Gears, gates and genius!',
    snapRadius: 55,
    snapOnHover: false,
    autoRotate: false,
    ghost: 'peekOnly',
    ghostDelay: 0,
    numbers: true,
    hintAt: null,
  },
};
