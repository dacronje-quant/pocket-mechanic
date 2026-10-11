/** Live, dimensional puzzle marks. The illustrations never bake in an answer. */
import type Phaser from 'phaser';
import { CM } from './copperMoss';
import { atlasFrame } from './sprites';

type G = Phaser.GameObjects.Graphics;
export const PIECE_COLORS = [CM.teal, CM.copper, CM.moss, CM.slate, 0xa27376, CM.brass, 0x87759a];

export function bevelCell(g: G, x: number, y: number, s: number, color: number, alpha = 1): void {
  g.fillStyle(CM.ink, 0.3 * alpha); g.fillRoundedRect(x + 3, y + 5, s - 3, s - 3, 8);
  g.fillStyle(color, alpha); g.fillRoundedRect(x, y, s - 4, s - 4, 8);
  g.lineStyle(2.4, CM.ink, alpha); g.strokeRoundedRect(x, y, s - 4, s - 4, 8);
  g.lineStyle(2, CM.cream, 0.7 * alpha); g.lineBetween(x + 7, y + 4, x + s - 12, y + 4);
  g.lineBetween(x + 4, y + 7, x + 4, y + s - 12);
  g.lineStyle(2, CM.ink, 0.28 * alpha); g.lineBetween(x + 8, y + s - 8, x + s - 10, y + s - 8);
}

export function decoration(g: G, x: number, y: number, type: string, color: number, r = 20, alpha = 1): void {
  g.fillStyle(CM.ink, 0.23 * alpha); g.fillEllipse(x + 3, y + 5, r * 1.85, r * 1.4);
  g.fillStyle(color, alpha); g.lineStyle(2, CM.ink, alpha);
  if (type.includes('star')) {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * 0.48 : r;
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
    });
    g.fillPoints(pts, true); g.strokePoints(pts, true);
  } else if (type.includes('leaf')) {
    g.fillEllipse(x, y, r * 1.3, r * 2); g.strokeEllipse(x, y, r * 1.3, r * 2);
    g.lineStyle(2, CM.cream, 0.8 * alpha); g.lineBetween(x, y - r * 0.65, x, y + r * 0.65);
  } else if (type.includes('berry') || type.includes('cherry')) {
    g.fillCircle(x, y + r * 0.17, r * 0.75); g.strokeCircle(x, y + r * 0.17, r * 0.75);
    g.lineStyle(3, CM.mossDark, alpha); g.lineBetween(x, y - r * 0.3, x + r * 0.3, y - r);
  } else if (type.includes('heart')) {
    g.fillCircle(x - r * 0.38, y - r * 0.2, r * 0.54); g.fillCircle(x + r * 0.38, y - r * 0.2, r * 0.54);
    g.fillTriangle(x - r * 0.84, y, x + r * 0.84, y, x, y + r);
    g.strokeTriangle(x - r * 0.84, y, x + r * 0.84, y, x, y + r);
  } else {
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      g.fillCircle(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.46);
    }
    g.fillStyle(CM.cream, alpha); g.fillCircle(x, y, r * 0.3);
  }
  g.fillStyle(CM.cream, 0.5 * alpha); g.fillCircle(x - r * 0.28, y - r * 0.27, r * 0.16);
  if (type.includes('dot')) { g.fillStyle(CM.ink, 0.9 * alpha); g.fillCircle(x, y, r * 0.13); }
  if (type.includes('ring')) { g.lineStyle(2, CM.ink, 0.9 * alpha); g.strokeCircle(x, y, r * 0.21); }
}

/** A continuous garden border gives even the paper-only photo tiles a visual home. */
function photoMat(c: CanvasRenderingContext2D): void {
  c.save(); c.strokeStyle = '#83a49a'; c.lineWidth = 2; c.globalAlpha = 0.8;
  c.beginPath(); c.moveTo(27, 43); c.bezierCurveTo(13, 155, 40, 322, 25, 437);
  c.moveTo(43, 25); c.bezierCurveTo(156, 39, 324, 13, 437, 27);
  c.moveTo(453, 43); c.bezierCurveTo(466, 154, 440, 322, 455, 437);
  c.moveTo(43, 455); c.bezierCurveTo(156, 441, 324, 467, 437, 453); c.stroke();
  // Each side has a different leaf rhythm and direction; matching fragments
  // stays possible in Little Tinker mode without reading any tile numbers.
  for (let i = 0; i < 7; i++) {
    const p = 71 + i * 55;
    for (const [x, y, a] of [[25, p, -0.5], [p, 26, 0.5], [455, p, 0.8], [p, 455, -0.8]]) {
      c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = i % 2 ? '#a0a477' : '#83a49a';
      c.beginPath(); c.ellipse(0, 0, 4, 10 + i % 3 * 2, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#537a72'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -8); c.lineTo(0, 8); c.stroke(); c.restore();
    }
  }
  for (const [x, y, count, r] of [[34, 34, 4, 11], [240, 28, 6, 9], [446, 34, 5, 12], [28, 240, 3, 9], [452, 240, 7, 8], [34, 446, 8, 10], [240, 452, 4, 8], [446, 446, 6, 12]]) {
    c.strokeStyle = '#b77b56'; c.fillStyle = '#d3a278'; c.lineWidth = 1.5;
    for (let i = 0; i < count; i++) { const a = i * Math.PI * 2 / count; c.beginPath(); c.ellipse(x + Math.cos(a) * r * 0.65, y + Math.sin(a) * r * 0.65, 3, 5, a, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/** Render the authored Abuela/Rosa locket onto a photo mat, without changing its pixels. */
export function familyPhoto(scene: Phaser.Scene, key: string, propsKey?: string): string {
  if (scene.textures.exists(key) && !propsKey) return key;
  const tex = scene.textures.exists(key) ? scene.textures.get(key) as Phaser.Textures.CanvasTexture : scene.textures.createCanvas(key, 480, 480)!;
  const c = tex.context;
  if (propsKey) {
    c.clearRect(0, 0, 480, 480); c.fillStyle = '#e9dcc0'; c.fillRect(0, 0, 480, 480);
    const name = atlasFrame(scene, propsKey, 5, 4, 4, true), frame = scene.textures.get(propsKey).get(name);
    const source = scene.textures.get(propsKey).getSourceImage() as CanvasImageSource;
    const scale = 422 / Math.max(frame.cutWidth, frame.cutHeight), w = frame.cutWidth * scale, h = frame.cutHeight * scale;
    c.drawImage(source, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, (480 - w) / 2, (480 - h) / 2, w, h);
    photoMat(c);
    c.strokeStyle = '#b77b56'; c.lineWidth = 5; c.strokeRect(12, 12, 456, 456);
    tex.refresh(); return key;
  }
  // A recognizable, offline-only picture if the atlas cannot be loaded.
  c.fillStyle = '#b9cbc0'; c.fillRect(0, 0, 480, 480);
  c.fillStyle = '#edf0dd'; c.beginPath(); c.arc(370, 82, 50, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#7a8760'; c.beginPath(); c.ellipse(240, 455, 380, 145, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ac8d68'; c.fillRect(18, 161, 118, 147);
  c.fillStyle = '#705747'; c.beginPath(); c.moveTo(5, 167); c.lineTo(77, 104); c.lineTo(151, 167); c.fill();
  c.fillStyle = '#f5e7c4'; c.fillRect(53, 201, 46, 53);
  // The fallback picture still depicts Rosa with her grandmother.
  {
    c.fillStyle = '#c3bdae'; c.beginPath(); c.arc(234, 125, 68, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#567b71'; c.beginPath(); c.ellipse(234, 299, 73, 114, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d8b18c'; c.beginPath(); c.arc(234, 143, 60, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#453a31'; c.lineWidth = 5;
    for (const x of [213, 257]) { c.beginPath(); c.arc(x, 141, 15, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.arc(234, 165, 20, 0.15, Math.PI - 0.15); c.stroke();
  }
  c.fillStyle = '#a27376'; c.beginPath(); c.ellipse(344, 323, 51, 78, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#705747'; c.beginPath(); c.arc(344, 227, 49, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d8b18c'; c.beginPath(); c.arc(344, 243, 40, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#705747'; c.beginPath(); c.ellipse(326, 212, 27, 16, -0.3, 0, Math.PI * 2); c.fill();
  for (const x of [330, 357]) { c.fillStyle = '#453a31'; c.beginPath(); c.arc(x, 240, 3.5, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = '#453a31'; c.lineWidth = 3; c.beginPath(); c.arc(344, 253, 14, 0.15, Math.PI - 0.15); c.stroke();
  c.fillStyle = '#f4ebd5';
  for (const [x, y] of [[49, 375], [100, 420], [399, 432], [330, 69]]) {
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.beginPath(); c.arc(x + Math.cos(a) * 11, y + Math.sin(a) * 11, 7, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#d3a278'; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f4ebd5';
  }
  photoMat(c); tex.refresh(); return key;
}
