/**
 * Visual-overhaul style tokens and the "toy" drawing kit (docs/VISUAL_OVERHAUL.md).
 *
 * Rooms draw with roles (`TONE.ok`, `LINE.outline`), not raw hex, so the whole game can be
 * restyled here. Colours come from the Copper & Moss materials in `copperMoss.ts`.
 */
import type Phaser from 'phaser';
import { CM } from './copperMoss';

type G = Phaser.GameObjects.Graphics;

/** Semantic colours. Off-palette brights (UI greens, reds, sky blues) map to warm equivalents. */
export const TONE = {
  outline: CM.ink,
  shadow: 0x000000,
  highlight: CM.cream,
  face: CM.paper,
  /** Something powered, lit or correct. */
  power: CM.glow,
  powerHot: 0xfff0a0,
  /** Unpowered blueprint lines. */
  idle: 0x8fc6cf,
  ok: 0x7fa65a,
  warn: 0xc4553f,
  water: 0x5f97ae,
  waterLight: 0xbfdce6,
  metal: CM.brass,
  metalDark: CM.woodDark,
  pegFace: 0xe0b55a,
  pegFaceDim: 0xb08a3c,
} as const;

/** Stroke weights and the one light direction (top-left) every shape shares. */
export const LINE = { outline: 1.5, bold: 3, rim: 2 } as const;
export const SHADOW = { dx: 2, dy: 4, alpha: 0.3 } as const;

/** A soft, offset drop shadow. */
export function dropShadowCircle(g: G, x: number, y: number, r: number, alpha: number = SHADOW.alpha): void {
  g.fillStyle(TONE.shadow, alpha);
  g.fillCircle(x + SHADOW.dx, y + SHADOW.dy, r);
}

/**
 * A sticker-like disc: shadow, outlined face, a top-left highlight arc and a darker lower rim.
 * The same recipe on every round part gives the game one consistent "toy" look.
 */
export function toyDisc(g: G, x: number, y: number, r: number, face: number, rim: number = CM.copperDark): void {
  dropShadowCircle(g, x, y, r);
  g.fillStyle(rim, 1);
  g.fillCircle(x, y, r);
  g.fillStyle(face, 1);
  g.fillCircle(x - r * 0.06, y - r * 0.1, r * 0.78);
  g.lineStyle(LINE.outline, TONE.outline, 0.85);
  g.strokeCircle(x, y, r);
  g.lineStyle(LINE.rim, TONE.highlight, 0.55);
  g.beginPath();
  g.arc(x, y, r * 0.62, Math.PI * 1.05, Math.PI * 1.55);
  g.strokePath();
}

/** A three-layer rod (dark edge, metal body, highlight) for arbors, axles and links. */
export function toyRod(g: G, x0: number, y0: number, x1: number, y1: number, width = 8): void {
  g.lineStyle(width + 6, TONE.metalDark, 1);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(width, TONE.metal, 1);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(2, TONE.highlight, 0.5);
  g.lineBetween(x0, y0 - width * 0.25, x1, y1 - width * 0.25);
}

/** A raised dial face on a semicircle (gauges). */
export function toyDialFace(g: G, x: number, y: number, r: number): void {
  g.fillStyle(TONE.shadow, SHADOW.alpha);
  g.slice(x + SHADOW.dx, y + SHADOW.dy, r + 8, Math.PI, 0, false);
  g.fillPath();
  g.fillStyle(TONE.outline, 1);
  g.slice(x, y, r + 8, Math.PI, 0, false);
  g.fillPath();
  g.fillStyle(TONE.face, 1);
  g.slice(x, y, r, Math.PI, 0, false);
  g.fillPath();
  g.lineStyle(LINE.rim, TONE.highlight, 0.6);
  g.beginPath();
  g.arc(x, y, r - 3, Math.PI * 1.1, Math.PI * 1.45);
  g.strokePath();
}

/**
 * A short squash-and-stretch "landing" after a part snaps into place. It is purely visual
 * and leaves position and timing alone, so dragging and snapping feel the same as before.
 */
export function landSquash(scene: Phaser.Scene, obj: Phaser.GameObjects.Image | Phaser.GameObjects.Container, base = 1, delay = 110): void {
  scene.tweens.add({
    targets: obj,
    delay,
    scaleX: { from: base * 1.08, to: base },
    scaleY: { from: base * 0.92, to: base },
    duration: 220,
    ease: 'Back.easeOut',
  });
}
