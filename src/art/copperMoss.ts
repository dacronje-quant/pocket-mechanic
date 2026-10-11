/** Shared materials for the Copper & Moss illustrated world. */
import type Phaser from 'phaser';
import { mulberry32 } from '../mechanism/rng';

export const CM = {
  ink: 0x342f29, inkSoft: 0x665d50,
  paper: 0xe9dcc0, paperDark: 0xc5b38e, cream: 0xf4ebd5,
  copper: 0xb77b56, copperLight: 0xd3a278, copperDark: 0x79503d,
  brass: 0xbca16a,
  moss: 0x78815a, mossLight: 0xa0a477, mossDark: 0x485541,
  teal: 0x537a72, tealLight: 0x83a49a, tealDark: 0x344f4b,
  wood: 0x856c50, woodLight: 0xab8d66, woodDark: 0x554638,
  sky: 0xbbc9c2, slate: 0x657c80, glow: 0xf1d391,
} as const;

export const CM_CSS = Object.fromEntries(Object.entries(CM).map(([key, value]) => [key, `#${value.toString(16).padStart(6, '0')}`])) as Record<keyof typeof CM, string>;
type G = Phaser.GameObjects.Graphics;

/** Bounded, seeded age marks: worn ink, patina flecks and pencil hatch. */
export function drawPatina(g: G, x: number, y: number, w: number, h: number, seed: number, density = 1): void {
  if (w <= 0 || h <= 0) return;
  const rng = mulberry32(seed);
  const n = Math.min(1300, Math.max(8, Math.round(w * h / 1450 * density)));
  for (let i = 0; i < n; i++) {
    const px = x + rng() * w;
    const py = y + rng() * h;
    const r = 0.35 + rng() * Math.min(3.2, w / 25, h / 25);
    g.fillStyle(i % 5 === 0 ? CM.tealDark : i % 3 === 0 ? CM.cream : CM.ink, 0.035 + rng() * 0.075);
    g.fillEllipse(px, py, Math.min(r * 3, x + w - px), Math.min(r * 1.3, y + h - py));
    if (i % 3 === 0) {
      const len = 4 + rng() * 14;
      g.lineStyle(0.65, CM.ink, 0.09);
      g.lineBetween(px, py, Math.min(x + w, px + len), Math.max(y, py - len * 0.3));
    }
  }
  g.lineStyle(0.7, CM.ink, 0.11);
  const edgeHatch = Math.min(18, h * 0.12);
  for (let px = x + 3; px < x + w - 2; px += 7 + rng() * 7) {
    const len = 3 + rng() * edgeHatch;
    g.lineBetween(px, y + h - 2, Math.min(x + w - 1, px + len * 0.45), y + h - len);
  }
}

/** A trailing ivy stem. Coordinates and scale also work inside local furniture Graphics. */
export function drawLeafSprig(g: G, x: number, y: number, length = 80, seed = 1, scale = 1): void {
  const rng = mulberry32(seed);
  const segments = Math.max(3, Math.round(length / 15));
  let px = x;
  let py = y;
  for (let i = 0; i < segments; i++) {
    const nx = x + Math.sin(i * 0.55) * 10 * scale + (rng() - 0.5) * 6 * scale;
    const ny = y + (i + 1) * length / segments * scale;
    g.lineStyle(1.7 * scale, CM.mossDark, 0.9);
    g.lineBetween(px, py, nx, ny);
    const side = i % 2 ? 1 : -1;
    const lx = nx + side * (8 + rng() * 8) * scale;
    const ly = ny - (4 + rng() * 4) * scale;
    g.lineStyle(0.8 * scale, CM.ink, 0.6);
    g.fillStyle(i % 3 === 0 ? CM.mossLight : CM.moss, 0.95);
    const pts = [
      { x: nx, y: ny },
      { x: lx - side * 4 * scale, y: ly - 5 * scale },
      { x: lx + side * 6 * scale, y: ly - 7 * scale },
      { x: lx + side * 3 * scale, y: ly + 3 * scale },
    ];
    g.fillPoints(pts, true);
    g.strokePoints(pts, true);
    g.lineStyle(0.6 * scale, CM.paper, 0.35);
    g.lineBetween(nx, ny, lx + side * 3 * scale, ly - 4 * scale);
    px = nx;
    py = ny;
  }
}

/** Irregular timber with grain, end wear and hand-inked seams. */
export function drawTimber(g: G, x: number, y: number, w: number, h: number, seed: number, color: number = CM.wood): void {
  const rng = mulberry32(seed);
  const pts = [{ x, y: y + 1 }, { x: x + w * 0.5, y: y - 1 }, { x: x + w, y: y + 2 }, { x: x + w - 1, y: y + h - 1 }, { x: x + w * 0.42, y: y + h + 1 }, { x: x + 1, y: y + h }];
  g.fillStyle(color, 1);
  g.fillPoints(pts, true);
  g.lineStyle(1.2, CM.ink, 0.8);
  g.strokePoints(pts, true);
  const horizontal = w > h;
  g.lineStyle(0.7, CM.ink, 0.2);
  for (let i = 0; i < Math.min(50, Math.max(5, (horizontal ? h : w) / 4)); i++) {
    if (horizontal) {
      const yy = y + 3 + rng() * Math.max(1, h - 6);
      const xx = x + rng() * w;
      g.lineBetween(xx, yy, Math.min(x + w - 2, xx + 25 + rng() * 110), yy + (rng() - 0.5) * 3);
    } else {
      const xx = x + 3 + rng() * Math.max(1, w - 6);
      const yy = y + rng() * h;
      g.lineBetween(xx, yy, xx + (rng() - 0.5) * 3, Math.min(y + h - 2, yy + 25 + rng() * 100));
    }
  }
  drawPatina(g, x + 2, y + 2, w - 4, h - 4, seed + 91, 0.45);
  g.lineStyle(0.8, CM.cream, 0.2);
  g.lineBetween(x + 2, y + 3, x + w - 3, y + 3);
}

/** A tarnished copper line with collar joints; background ornament only. */
export function drawCopperPipe(g: G, points: [number, number][], width = 10): void {
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i - 1];
    const [nx, ny] = points[i];
    g.lineStyle(width + 3, CM.ink, 0.7);
    g.lineBetween(x, y, nx, ny);
    g.lineStyle(width, CM.copperDark, 1);
    g.lineBetween(x, y, nx, ny);
    g.lineStyle(width * 0.48, CM.copper, 1);
    g.lineBetween(x - 1, y - 1, nx - 1, ny - 1);
    g.lineStyle(1, CM.copperLight, 0.8);
    g.lineBetween(x - 2, y - 2, nx - 2, ny - 2);
    g.fillStyle(CM.copperDark, 1);
    g.fillCircle(nx, ny, width * 0.7);
    g.lineStyle(1, CM.ink, 0.7);
    g.strokeCircle(nx, ny, width * 0.7);
    g.lineStyle(1, CM.copperLight, 0.8);
    g.strokeCircle(nx - 1, ny - 1, width * 0.48);
  }
}
