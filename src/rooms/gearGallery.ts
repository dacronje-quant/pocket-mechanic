import { GearNode, meshedPosition } from '../mechanism/graph';
import type { GearVariant } from '../art/textures';

/**
 * Room data is plain data so new rooms are mostly new files like this one.
 * Later this is what the level editor (shared with the Invention Bench) writes.
 */
export interface RoomDef {
  id: string;
  title: string;
  fixed: Array<GearNode & { variant: GearVariant }>;
  driverId: string;
  outputId: string;
  pegs: Array<{ id: string; x: number; y: number }>;
  solution: { pegId: string; teeth: number };
  /** Clock hand speed once fixed (turns per second). */
  outputTurnsPerSecond: number;
  clock: { x: number; y: number; r: number };
  tray: { x: number; y: number; w: number; h: number };
  floorY: number;
  intro: { fixer: string; engineer: string };
  hints: string[];
}

// Layout: power comes up the weight chain into gear A, should pass through the
// empty peg P, then B → C → D → E, and E's arbor drives the clock hands.
const A = { id: 'A', teeth: 24, x: 245, y: 425 };
const P = { teeth: 20, ...meshedPosition(A, 20, -25) };
const B = { id: 'B', teeth: 16, ...meshedPosition(P, 16, -10) };
const C = { id: 'C', teeth: 36, ...meshedPosition(B, 36, 15) };
const D = { id: 'D', teeth: 14, ...meshedPosition(C, 14, -40) };
const E = { id: 'E', teeth: 28, ...meshedPosition(D, 28, 10) };

export const GEAR_GALLERY: RoomDef = {
  id: 'gear-gallery',
  title: 'Room 1.2 · The Gear Gallery',
  fixed: [
    { ...A, variant: 'brass' },
    { ...B, variant: 'copper' },
    { ...C, variant: 'brass' },
    { ...D, variant: 'steel' },
    { ...E, variant: 'copper' },
  ],
  driverId: 'A',
  outputId: 'E',
  pegs: [{ id: 'P', x: P.x, y: P.y }],
  solution: { pegId: 'P', teeth: 20 },
  outputTurnsPerSecond: 1 / 8,
  clock: { x: 1035, y: 300, r: 165 },
  tray: { x: 640, y: 612, w: 520, h: 100 },
  floorY: 668,
  intro: {
    fixer: "Mr. Finch's clock won't tick! The power stops somewhere. Can you find what's missing?",
    engineer: 'Power climbs the weight chain and stops. Peek with the lens, then pick the gear that meshes with BOTH neighbours.',
  },
  hints: [
    'Tap the lens to Peek. See where the golden power stops?',
    'Gears only turn each other when their teeth just touch. Which size reaches both gears?',
    'This one! Drag the middle-sized gear onto the glowing peg.',
  ],
};
