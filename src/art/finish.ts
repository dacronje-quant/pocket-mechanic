/** Small hand-finished surfaces shared by the repair rooms and the shop's ledgers. */
import Phaser from 'phaser';
import { CM, drawLeafSprig, drawPatina } from './copperMoss';

type G = Phaser.GameObjects.Graphics;

export function rivet(g: G, x: number, y: number, r = 3.5): void {
  g.fillStyle(CM.ink, 0.35);
  g.fillCircle(x + 1, y + 1.5, r + 0.5);
  g.fillStyle(CM.copperLight, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(0.8, CM.copperDark, 1);
  g.strokeCircle(x, y, r);
  g.lineBetween(x - r * 0.45, y + r * 0.3, x + r * 0.45, y - r * 0.3);
}

/** A worn enamel / paper inset with copper edge and four slotted screw heads. */
export function etchedPlate(g: G, x: number, y: number, w: number, h: number, fill: number = CM.tealDark, alpha = 1, seed = 21): void {
  g.fillStyle(CM.ink, 0.24 * alpha);
  g.fillRoundedRect(x + 3, y + 5, w, h, 10);
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(2.5, CM.copperDark, Math.min(1, alpha + 0.2));
  g.strokeRoundedRect(x, y, w, h, 10);
  g.lineStyle(0.8, CM.copperLight, 0.7);
  g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 8);
  drawPatina(g, x + 6, y + 6, w - 12, h - 12, seed, 0.8);
  for (const px of [x + 9, x + w - 9]) for (const py of [y + 9, y + h - 9]) rivet(g, px, py, 2.7);
}

/** An aged paper or painted-enamel backing for a drawer's collection of objects. */
export function collectionFrame(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill: number = CM.tealDark, alpha = 0.65): G {
  const g = scene.add.graphics().setDepth(3);
  etchedPlate(g, x, y, w, h, fill, alpha, Math.round(x + y + w));
  // Growth stays on the frame edge, leaving the touch targets clear.
  drawLeafSprig(g, x + w - 10, y + 8, Math.min(96, h * 0.22), 53, 0.7);
  return g;
}

/** Copper lip, scratched inset and screws around a parts drawer. */
export function drawerFinish(g: G, x: number, y: number, w: number, h: number): void {
  g.lineStyle(2, CM.ink, 0.75);
  g.strokeRoundedRect(x, y, w, h, 12);
  g.lineStyle(1, CM.copperLight, 0.75);
  g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 10);
  drawPatina(g, x + 8, y + 8, w - 16, h - 16, 972, 0.9);
  for (const px of [x + 10, x + w - 10]) for (const py of [y + 10, y + h - 10]) rivet(g, px, py, 3);
}

/** A few mounting brackets ground large mechanisms without hiding their illustrated world. */
export function repairMounts(scene: Phaser.Scene): G {
  const g = scene.add.graphics().setDepth(5);
  for (const [x, y, sx, sy] of [[186, 112, 1, 1], [1094, 112, -1, 1], [186, 526, 1, -1], [1094, 526, -1, -1]]) {
    g.lineStyle(10, CM.ink, 0.5);
    g.lineBetween(x, y + sy * 26, x, y);
    g.lineBetween(x, y, x + sx * 26, y);
    g.lineStyle(6, CM.copperDark, 0.9);
    g.lineBetween(x, y + sy * 26, x, y);
    g.lineBetween(x, y, x + sx * 26, y);
    g.lineStyle(1, CM.copperLight, 0.65);
    g.lineBetween(x - 1, y + sy * 24, x - 1, y + sy * 2);
    rivet(g, x, y, 3.5);
  }
  return g;
}
