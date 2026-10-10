/** Colour stories per object (GDD §24.2), plus the shop, attic and bench. */
import type { ThemeId } from '../content/types';
import { CM, CM_CSS } from './copperMoss';

export interface Palette {
  /** Two wall tones, alternated in planks/stripes/tiles. */
  wall: [number, number];
  /** Pattern drawn over the wall. */
  pattern: 'planks' | 'quilt' | 'sky' | 'deco' | 'tiles' | 'stripes' | 'stars' | 'stone' | 'wallpaper' | 'pegboard' | 'beams';
  floor: number;
  floorEdge: number;
  accent: number;
  light: number;
  /** The parts drawer. */
  tray: [number, number];
  /** Blueprint (Peek Lens) tint. */
  peek: number;
  /** Text on the background. */
  ink: string;
}

export const PALETTES: Record<ThemeId, Palette> = {
  clock: { wall: [0x74614c, 0x806d53], pattern: 'planks', floor: CM.woodDark, floorEdge: CM.copper, accent: CM.brass, light: CM.glow, tray: [CM.wood, CM.woodDark], peek: 0x172d31, ink: CM_CSS.cream },
  musicbox: { wall: [0x917b78, 0xa38b82], pattern: 'quilt', floor: 0x63534d, floorEdge: CM.copperLight, accent: 0xc8afa0, light: 0xf1dfc4, tray: [0x907260, CM.woodDark], peek: 0x293538, ink: CM_CSS.cream },
  train: { wall: [CM.sky, 0xcbd0bc], pattern: 'sky', floor: CM.mossDark, floorEdge: CM.moss, accent: CM.copper, light: CM.cream, tray: [CM.teal, CM.tealDark], peek: 0x203737, ink: CM_CSS.ink },
  radio: { wall: [0x65574a, 0x74644e], pattern: 'deco', floor: 0x423c34, floorEdge: CM.copper, accent: CM.copperLight, light: CM.glow, tray: [CM.wood, CM.woodDark], peek: 0x192e30, ink: CM_CSS.cream },
  tea: { wall: [0x61786b, 0x6b8272], pattern: 'tiles', floor: CM.tealDark, floorEdge: CM.copper, accent: CM.copperLight, light: CM.paper, tray: [CM.copperDark, CM.woodDark], peek: 0x1b3430, ink: CM_CSS.cream },
  bertie: { wall: [0x956a58, 0xbba78a], pattern: 'stripes', floor: CM.woodDark, floorEdge: CM.paperDark, accent: CM.brass, light: CM.glow, tray: [CM.copperDark, CM.woodDark], peek: 0x302c27, ink: CM_CSS.cream },
  orrery: { wall: [0x354a50, 0x405759], pattern: 'stars', floor: 0x293c40, floorEdge: CM.brass, accent: CM.brass, light: CM.cream, tray: [CM.teal, CM.tealDark], peek: 0x142527, ink: CM_CSS.cream },
  tower: { wall: [0x929381, 0xa3a18e], pattern: 'stone', floor: 0x5c6253, floorEdge: CM.copperDark, accent: CM.copper, light: CM.glow, tray: [CM.wood, CM.woodDark], peek: 0x283532, ink: CM_CSS.cream },
  shop: { wall: [0xc5b797, 0xcebea0], pattern: 'wallpaper', floor: CM.wood, floorEdge: CM.woodDark, accent: CM.teal, light: CM.glow, tray: [CM.wood, CM.woodDark], peek: 0x1b3432, ink: CM_CSS.ink },
  attic: { wall: [0x656b5c, 0x737766], pattern: 'beams', floor: CM.woodDark, floorEdge: CM.wood, accent: CM.tealLight, light: CM.paper, tray: [CM.wood, CM.woodDark], peek: 0x1c2b29, ink: CM_CSS.cream },
  bench: { wall: [CM.paperDark, 0xd2bea0], pattern: 'pegboard', floor: CM.wood, floorEdge: CM.woodDark, accent: CM.teal, light: CM.cream, tray: [CM.wood, CM.woodDark], peek: 0x1b3432, ink: CM_CSS.ink },
  home: { wall: [CM.paper, 0xddcfaf], pattern: 'wallpaper', floor: CM.woodLight, floorEdge: CM.wood, accent: CM.moss, light: CM.cream, tray: [CM.wood, CM.woodDark], peek: 0x1b3432, ink: CM_CSS.ink },
};
