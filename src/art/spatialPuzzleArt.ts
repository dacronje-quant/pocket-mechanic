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
  const nana = scene.textures.exists('art:portrait-nana') ? scene.textures.get('art:portrait-nana').getSourceImage() : null;
  if (nana) c.drawImage(nana as CanvasImageSource, 85, 48, 230, 360);
  else {
    c.fillStyle = '#567b71'; c.beginPath(); c.ellipse(234, 299, 73, 114, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d8b18c'; c.beginPath(); c.arc(234, 143, 60, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#453a31'; c.lineWidth = 5;
    for (const x of [213, 257]) { c.beginPath(); c.arc(x, 141, 15, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.arc(234, 165, 20, 0.15, Math.PI - 0.15); c.stroke();
  }
  const kip = scene.textures.exists('art:kip-dimensional') ? scene.textures.get('art:kip-dimensional').getSourceImage() : null;
  if (kip) {
    const source = kip as HTMLImageElement;
    c.drawImage(source, 0, 0, source.width / 4, source.height / 2, 292, 111, 176, 176);
  } else {
    c.fillStyle = '#b77b56'; c.fillRect(337, 263, 95, 78);
    for (const x of [361, 410]) { c.fillStyle = '#f4ebd5'; c.beginPath(); c.arc(x, 282, 16, 0, Math.PI * 2); c.fill(); }
  }
  c.fillStyle = '#f4ebd5';
  for (const [x, y] of [[49, 375], [100, 420], [399, 432], [330, 69]]) {
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.beginPath(); c.arc(x + Math.cos(a) * 11, y + Math.sin(a) * 11, 7, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#d3a278'; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f4ebd5';
  }
  tex.refresh(); return key;
}
