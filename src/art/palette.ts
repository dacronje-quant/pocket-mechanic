/** Colour stories per object (GDD §24.2), plus the shop, attic and bench. */
import type { ThemeId } from '../content/types';

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
  clock: { wall: [0x4a2f1e, 0x52341f], pattern: 'planks', floor: 0x2a190e, floorEdge: 0x6e4527, accent: 0xd9a441, light: 0xffe2a0, tray: [0x7a4b26, 0x3d2412], peek: 0x0b1a2e, ink: '#ffd76a' },
  musicbox: { wall: [0x7a2f45, 0x873650], pattern: 'quilt', floor: 0x3d1724, floorEdge: 0xc0c8d0, accent: 0xe8e8f0, light: 0xffd6e0, tray: [0x8c4a5c, 0x4a1f2c], peek: 0x1a0b22, ink: '#ffe0ea' },
  train: { wall: [0x8fd0f2, 0xa6dcf5], pattern: 'sky', floor: 0x5a8f3c, floorEdge: 0x7cb342, accent: 0xe05a47, light: 0xfff6c8, tray: [0xc0392b, 0x7b241c], peek: 0x0b2236, ink: '#1c3d6e' },
  radio: { wall: [0x3b2414, 0x452a17], pattern: 'deco', floor: 0x1e120a, floorEdge: 0xc8703f, accent: 0xe8a33d, light: 0xffb347, tray: [0x6e4527, 0x2e1c10], peek: 0x0b1a2e, ink: '#ffcf80' },
  tea: { wall: [0x1f4d3d, 0x245a47], pattern: 'tiles', floor: 0x12302a, floorEdge: 0xc8703f, accent: 0xd88a4a, light: 0xd5f5e3, tray: [0x8a4320, 0x4f2410], peek: 0x07231c, ink: '#d5f5e3' },
  bertie: { wall: [0xc0392b, 0xf2e6c8], pattern: 'stripes', floor: 0x3d2b25, floorEdge: 0xf2e6c8, accent: 0xffd43b, light: 0xfff3bf, tray: [0xa93226, 0x641e16], peek: 0x1a0b0b, ink: '#fff3bf' },
  orrery: { wall: [0x101a3a, 0x15214a], pattern: 'stars', floor: 0x0a1028, floorEdge: 0xb88a2c, accent: 0xffd76a, light: 0xfff3b0, tray: [0x2c3e70, 0x141d3a], peek: 0x02040f, ink: '#fff3b0' },
  tower: { wall: [0x6b6560, 0x7a736d], pattern: 'stone', floor: 0x3a3532, floorEdge: 0x9a8f86, accent: 0xff9e57, light: 0xffd3a1, tray: [0x5e4b3c, 0x2f251d], peek: 0x101820, ink: '#ffe3c2' },
  shop: { wall: [0x5a3a22, 0x63412a], pattern: 'wallpaper', floor: 0x3a2414, floorEdge: 0x8a5a33, accent: 0xd9a441, light: 0xffe2a0, tray: [0x7a4b26, 0x3d2412], peek: 0x0b1a2e, ink: '#ffd76a' },
  attic: { wall: [0x2a2a3a, 0x30303f], pattern: 'beams', floor: 0x1e1a1a, floorEdge: 0x5a4a3a, accent: 0xb8c4ff, light: 0xdfe6ff, tray: [0x4a3a2c, 0x241c15], peek: 0x05070f, ink: '#dfe6ff' },
  bench: { wall: [0xb88a52, 0xc29560], pattern: 'pegboard', floor: 0x5a3a22, floorEdge: 0x8a5a33, accent: 0x2b7a78, light: 0xfff1d0, tray: [0x7a4b26, 0x3d2412], peek: 0x0b1a2e, ink: '#3b260b' },
  home: { wall: [0xe8d5b0, 0xefdfbd], pattern: 'wallpaper', floor: 0x8a5a33, floorEdge: 0xb07d4f, accent: 0xe05a47, light: 0xfff6dc, tray: [0x8a5a33, 0x4f2f18], peek: 0x0b1a2e, ink: '#5a3a22' },
};
