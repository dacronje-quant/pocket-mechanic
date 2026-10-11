import type Phaser from 'phaser';
import { CM, drawPatina } from './copperMoss';

/** One quiet, tactile work surface across every puzzle kind. It stays below
 * the live geometry, with no baked-in parts or misleading answer marks. */
export function workSurface(g: Phaser.GameObjects.Graphics, contrast: boolean): void {
  const x = 192, y = 192, w = 896, h = 348;
  g.fillStyle(CM.ink, .08).fillRoundedRect(x + 4, y + 6, w, h, 18);
  g.fillStyle(CM.paper, contrast ? .82 : .42).fillRoundedRect(x, y, w, h, 18);
  g.lineStyle(1.2, CM.cream, .46).strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 16);
  g.lineStyle(1, CM.copperDark, .26).strokeRoundedRect(x + 7, y + 7, w - 14, h - 14, 12);
  drawPatina(g, x + 12, y + 12, w - 24, h - 24, 119, .2);
  // Fine corner fittings define the working area without competing with it.
  for (const [cx, cy] of [[x + 12, y + 12], [x + w - 12, y + 12], [x + 12, y + h - 12], [x + w - 12, y + h - 12]]) {
    g.fillStyle(CM.copperDark, .42).fillCircle(cx, cy, 3);
    g.fillStyle(CM.cream, .65).fillCircle(cx - .6, cy - .7, 1.1);
  }
}
