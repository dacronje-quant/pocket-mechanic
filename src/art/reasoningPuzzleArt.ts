/** Live, readable mechanism drawings. Painted props decorate the frame, never hide puzzle state. */
import Phaser from 'phaser';
import { CM, drawTimber } from './copperMoss';
import { etchedPlate, rivet } from './finish';
import { withArt } from './generated';
import { atlasFrame } from './sprites';

type G = Phaser.GameObjects.Graphics;
export const FUSE_COLORS = [0xbc6954, 0x638e8c, 0xbda45b, 0x81769a];

export function puzzlePanel(g: G, x: number, y: number, w: number, h: number, seed = 710): void {
  g.fillStyle(CM.ink, .36); g.fillRoundedRect(x + 5, y + 8, w, h, 18);
  drawTimber(g, x, y, w, h, seed, CM.woodDark);
  etchedPlate(g, x + 10, y + 10, w - 20, h - 20, CM.paper, 1, seed + 1);
}

/** Separate 4x4 prop atlas imagery from live mechanics so water and fuses stay exact. */
export function reasoningProp(scene: Phaser.Scene, index: number, x: number, y: number, size = 110, depth = 9): void {
  withArt(scene, 'puzzle-props', (key) => {
    const image = scene.add.image(x, y, key, atlasFrame(scene, key, index, 4, 4, true)).setDepth(depth).setName(`reasoning-prop:${index}`);
    image.setScale(size / Math.max(image.width, image.height));
  });
}

export function valve(g: G, x: number, y: number, height: number, chosen = false, code = 0): void {
  const w = 40;
  g.fillStyle(CM.ink, .25); g.fillEllipse(x + 3, y + 9, 64, 18);
  g.fillStyle(CM.copperDark, 1); g.fillRoundedRect(x - 28, y - 12, 56, 23, 6);
  g.fillStyle(CM.copper, 1); g.fillRoundedRect(x - 25, y - 11, 46, 15, 5);
  g.fillStyle(CM.copperLight, .8); g.fillRect(x - 20, y - 11, 32, 3);
  g.fillStyle(CM.ink, .23); g.fillRect(x + 18, y - 8, 7, 13);
  g.lineStyle(2, CM.ink, 1); g.strokeRoundedRect(x - 28, y - 12, 56, 23, 6);
  g.fillStyle(CM.brass, 1); g.fillRect(x - 23, y - 18, 46, 9);
  g.fillStyle(CM.copperDark, 1); g.fillRect(x - 23, y - 11, 46, 4);
  g.fillStyle(CM.cream, .5); g.fillRect(x - 18, y - 18, 30, 2);
  g.fillStyle(0x90aba7, .5); g.fillRoundedRect(x - w / 2, y - height - 12, w, height, 16);
  g.fillStyle(CM.tealDark, .22); g.fillRoundedRect(x + 8, y - height - 6, 10, height - 12, 5);
  g.fillStyle(CM.cream, .28); g.fillRoundedRect(x - 15, y - height - 6, 13, height - 14, 6);
  g.fillStyle(CM.cream, .55); g.fillRoundedRect(x - 14, y - height + 1, 4, height - 27, 2);
  g.fillStyle(CM.cream, .25); g.fillEllipse(x - 2, y - height - 2, 23, 7);
  g.lineStyle(2.8, CM.ink, 1); g.strokeRoundedRect(x - w / 2, y - height - 12, w, height, 16);
  g.lineStyle(2, CM.copper, 1); g.lineBetween(x - 7, y - 17, x - 7, y - height + 12); g.lineBetween(x + 7, y - 17, x + 7, y - height + 12);
  g.fillStyle(CM.copperLight, 1); g.fillRoundedRect(x - 12, y - height * .45 - 12, 24, 24, 4);
  g.fillStyle(CM.copperDark, .5); g.fillRoundedRect(x + 4, y - height * .45 - 10, 6, 20, 2);
  g.fillStyle(CM.cream, .4); g.fillRect(x - 9, y - height * .45 - 11, 18, 3);
  g.lineStyle(1.5, CM.ink, .8); g.strokeRoundedRect(x - 12, y - height * .45 - 12, 24, 24, 4);
  for (let i = 0; i <= code; i++) { g.fillStyle(CM.ink, 1); g.fillCircle(x - code * 3 + i * 6, y + 1, 1.5); }
  if (chosen) { g.lineStyle(4, CM.glow, 1); g.strokeRoundedRect(x - 33, y - height - 18, 66, height + 37, 12); }
}

export function fuse(g: G, x: number, y: number, value: number, size = 46, locked = false, conflict = false, colorOverride?: number, shape?: string): void {
  const color = colorOverride ?? FUSE_COLORS[value % FUSE_COLORS.length];
  g.fillStyle(CM.ink, .3); g.fillRoundedRect(x - size / 2 + 3, y - size / 2 + 5, size, size, 9);
  g.fillStyle(color, 1); g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 9);
  g.lineStyle(2, conflict ? 0xae3d31 : CM.ink, 1); g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 9);
  g.lineStyle(2, CM.cream, .5); g.lineBetween(x - size / 2 + 8, y - size / 2 + 4, x + size / 2 - 8, y - size / 2 + 4);
  g.fillStyle(CM.copperLight, 1); g.fillRect(x - size / 2 - 2, y - 9, 6, 18); g.fillRect(x + size / 2 - 4, y - 9, 6, 18);
  g.fillStyle(CM.cream, 1); g.lineStyle(2.5, CM.cream, 1);
  const r = size * .17;
  const token = shape ?? ['circle', 'square', 'triangle', 'diamond'][value % 4];
  if (token === 'circle') g.fillCircle(x, y, r);
  else if (token === 'square') g.fillRect(x - r, y - r, r * 2, r * 2);
  else if (token === 'triangle') g.fillTriangle(x, y - r - 2, x + r + 2, y + r, x - r - 2, y + r);
  else if (token === 'star') star(g, x, y, r * 1.35, CM.cream);
  else g.fillPoints([{ x, y: y - r - 3 }, { x: x + r + 3, y }, { x, y: y + r + 3 }, { x: x - r - 3, y }], true);
  if (locked) { rivet(g, x - size / 2 + 6, y + size / 2 - 6, 2.2); rivet(g, x + size / 2 - 6, y + size / 2 - 6, 2.2); }
}

export function jug(g: G, x: number, y: number, capacity: number, amount: number, target: number | undefined, selected: boolean, width = 118, height = 174): void {
  const top = y - height;
  g.fillStyle(CM.ink, .24); g.fillEllipse(x + 4, y + 8, width + 22, 20);
  g.lineStyle(15, CM.copperDark, 1); g.strokeRoundedRect(x + width / 2 - 5, top + 36, 37, height * .47, 15);
  g.lineStyle(8, CM.copperLight, 1); g.strokeRoundedRect(x + width / 2 - 5, top + 36, 37, height * .47, 15);
  g.lineStyle(2.5, CM.cream, .47); g.lineBetween(x + width / 2 + 9, top + 38, x + width / 2 + 24, top + 38); g.lineBetween(x + width / 2 + 33, top + 48, x + width / 2 + 33, top + height * .4);
  g.fillStyle(CM.sky, .42); g.fillRoundedRect(x - width / 2, top + 12, width, height - 12, 10);
  const liquidHeight = (height - 28) * amount / capacity;
  if (amount > 0) {
    g.fillStyle(CM.teal, .95); g.fillRect(x - width / 2 + 5, y - 8 - liquidHeight, width - 10, liquidHeight);
    for (let band = 0; band < 4; band++) { g.fillStyle(CM.tealDark, .05 + band * .045); g.fillRect(x - width / 2 + 5, y - 8 - liquidHeight + liquidHeight * band / 4, width - 10, liquidHeight / 4); }
    g.fillStyle(CM.tealLight, 1); g.fillEllipse(x, y - 8 - liquidHeight, width - 10, 9);
    g.lineStyle(1.5, CM.cream, .65); g.lineBetween(x - width / 2 + 17, y - 10 - liquidHeight, x + width / 2 - 17, y - 10 - liquidHeight);
    g.fillStyle(CM.sky, .19); g.fillRect(x - 12, y - 8 - liquidHeight, 18, liquidHeight);
  }
  g.fillStyle(CM.tealDark, .15); g.fillRoundedRect(x + width / 2 - 16, top + 25, 12, height - 35, 5);
  g.fillStyle(CM.cream, .14); g.fillRoundedRect(x - width / 2 + 8, top + 20, 20, height - 32, 5);
  g.fillStyle(CM.cream, .45); g.fillRoundedRect(x - width / 2 + 11, top + 28, 5, height - 43, 2);
  g.fillStyle(CM.cream, .2); g.fillRoundedRect(x + 12, top + 33, 4, height - 47, 2);
  g.lineStyle(3, CM.ink, 1); g.strokeRoundedRect(x - width / 2, top + 12, width, height - 12, 10);
  g.lineStyle(7, CM.copperDark, 1); g.lineBetween(x - width / 2 - 3, top + 10, x + width / 2 + 8, top + 10);
  g.lineStyle(3, CM.copperLight, 1); g.lineBetween(x - width / 2 - 3, top + 8, x + width / 2 + 8, top + 8);
  g.lineStyle(1.5, CM.cream, .75); g.lineBetween(x - width / 2 + 3, top + 7, x + width / 2 - 3, top + 7);
  g.lineStyle(4, CM.copperDark, 1); g.lineBetween(x - width / 2 + 5, y + 1, x + width / 2 - 5, y + 1);
  g.lineStyle(1.5, CM.copperLight, .8); g.lineBetween(x - width / 2 + 6, y - 1, x + width / 2 - 6, y - 1);
  for (let cup = 1; cup <= capacity; cup++) { const yy = y - 8 - (height - 28) * cup / capacity; g.lineStyle(2, CM.ink, .65); g.lineBetween(x + width / 2 - 19, yy, x + width / 2 - 6, yy); }
  if (target !== undefined) { const yy = y - 8 - (height - 28) * target / capacity; g.lineStyle(4, CM.glow, 1); g.lineBetween(x - width / 2 - 9, yy, x + width / 2 + 9, yy); g.fillStyle(CM.glow, 1); g.fillTriangle(x - width / 2 - 13, yy, x - width / 2 - 26, yy - 8, x - width / 2 - 26, yy + 8); }
  if (selected) { g.lineStyle(4, CM.glow, 1); g.strokeRoundedRect(x - width / 2 - 9, top - 2, width + 43, height + 17, 13); }
}

export function star(g: G, x: number, y: number, radius: number, color: number, alpha = 1): void {
  const points = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * .45 : radius; return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }; });
  g.fillStyle(color, alpha); g.fillPoints(points, true); g.lineStyle(1, CM.ink, alpha * .75); g.strokePoints(points, true);
}

/** Exact tooth count is visible in the blueprint puzzle. */
export function drawingGear(g: G, x: number, y: number, teeth: number, r: number, color: number, line = false): void {
  const points = Array.from({ length: teeth * 4 }, (_, i) => { const a = i * Math.PI * 2 / (teeth * 4), radius = i % 4 < 2 ? r : r * .78; return { x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius }; });
  if (!line) { g.fillStyle(CM.ink, .3); g.fillCircle(x + 3, y + 5, r); g.fillStyle(color, 1); g.fillPoints(points, true); }
  g.lineStyle(2.3, line ? color : CM.ink, 1); g.strokePoints(points, true); g.strokeCircle(x, y, r * .42);
  if (!line) { g.lineStyle(2, CM.copperLight, .75); g.strokeCircle(x - 1, y - 1, r * .57); }
  g.fillStyle(line ? color : CM.ink, 1); g.fillCircle(x, y, 4);
}
