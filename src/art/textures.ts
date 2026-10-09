import Phaser from 'phaser';
import { MODULE, pitchRadius } from '../mechanism/graph';

/**
 * All art in the prototype is generated at runtime from code, so the repo has
 * no image assets to manage yet. Replace with real sprites later by loading
 * textures with the same keys.
 */

export type GearVariant = 'brass' | 'copper' | 'gold' | 'ghost' | 'steel';

const PALETTES: Record<Exclude<GearVariant, 'ghost'>, { rim: number; face: number; light: number; dark: number }> = {
  brass: { rim: 0x9a6b1f, face: 0xd9a441, light: 0xf6d27a, dark: 0x5e3f10 },
  copper: { rim: 0x8a4320, face: 0xc8703f, light: 0xf0a77a, dark: 0x4f2410 },
  gold: { rim: 0xb07d0c, face: 0xffc928, light: 0xfff0a0, dark: 0x6b4800 },
  steel: { rim: 0x5b6470, face: 0x9aa6b4, light: 0xdbe3ec, dark: 0x2f353d },
};

export function gearKey(teeth: number, variant: GearVariant): string {
  return `gear-${teeth}-${variant}`;
}

function gearOutline(cx: number, cy: number, teeth: number, rPitch: number, module: number): Phaser.Math.Vector2[] {
  const ro = rPitch + module * 0.95;
  const rr = rPitch - module * 1.05;
  const p = (Math.PI * 2) / teeth;
  const pts: Phaser.Math.Vector2[] = [];
  const add = (r: number, a: number) => pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  for (let i = 0; i < teeth; i++) {
    const a = i * p; // tooth centred at local angle 0
    add(rr, a - 0.5 * p);
    add(rr, a - 0.27 * p);
    add(ro, a - 0.14 * p);
    add(ro, a + 0.14 * p);
    add(rr, a + 0.27 * p);
  }
  return pts;
}

/** Make (once) and return the texture key for a gear. */
export function ensureGearTexture(scene: Phaser.Scene, teeth: number, variant: GearVariant, module = MODULE): string {
  const key = gearKey(teeth, variant);
  if (scene.textures.exists(key)) return key;

  const r = pitchRadius(teeth, module);
  const ro = r + module * 0.95;
  const size = Math.ceil((ro + 6) * 2);
  const c = size / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const outline = gearOutline(c, c, teeth, r, module);
  const inner = r - module * 2.2;

  if (variant === 'ghost') {
    g.fillStyle(0xfff4c8, 0.22);
    g.fillPoints(outline, true);
    g.lineStyle(3, 0xfff4c8, 0.9);
    g.strokePoints(outline, true, true);
    g.lineStyle(2, 0xfff4c8, 0.6);
    g.strokeCircle(c, c, Math.max(8, r * 0.22));
  } else {
    const pal = PALETTES[variant];
    // drop shadow
    g.fillStyle(0x000000, 0.25);
    g.fillPoints(outlineShift(outline, 3, 4), true);
    // teeth + rim
    g.fillStyle(pal.rim, 1);
    g.fillPoints(outline, true);
    g.fillStyle(pal.face, 1);
    g.fillCircle(c, c, inner);
    // soft highlight
    g.fillStyle(pal.light, 0.35);
    g.fillCircle(c - inner * 0.18, c - inner * 0.22, inner * 0.72);
    g.fillStyle(pal.face, 1);
    g.fillCircle(c + inner * 0.05, c + inner * 0.06, inner * 0.62);
    // spoke windows on bigger gears
    if (teeth >= 16) {
      const holes = teeth >= 30 ? 6 : teeth >= 22 ? 5 : 4;
      const hr = inner * 0.24;
      for (let i = 0; i < holes; i++) {
        const a = (i / holes) * Math.PI * 2 + Math.PI / holes;
        g.fillStyle(pal.dark, 0.85);
        g.fillCircle(c + Math.cos(a) * inner * 0.58, c + Math.sin(a) * inner * 0.58, hr);
      }
    }
    // rim line
    g.lineStyle(2, pal.dark, 0.6);
    g.strokeCircle(c, c, inner);
    // hub
    const hub = Math.max(8, r * 0.24);
    g.fillStyle(pal.rim, 1);
    g.fillCircle(c, c, hub);
    g.fillStyle(pal.light, 0.8);
    g.fillCircle(c - hub * 0.2, c - hub * 0.25, hub * 0.55);
    g.fillStyle(pal.dark, 1);
    g.fillCircle(c, c, Math.max(3, hub * 0.38));
    // a marker notch so rotation is easy to see
    g.fillStyle(pal.light, 0.9);
    g.fillCircle(c + inner * 0.82, c, Math.max(2.5, module * 0.55));
  }

  g.generateTexture(key, size, size);
  g.destroy();
  return key;
}

function outlineShift(pts: Phaser.Math.Vector2[], dx: number, dy: number): Phaser.Math.Vector2[] {
  return pts.map((p) => new Phaser.Math.Vector2(p.x + dx, p.y + dy));
}

/** Small shared textures: sparks, glow, peg. */
export function ensureBasics(scene: Phaser.Scene): void {
  if (!scene.textures.exists('spark')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 3);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(8, 8, 6);
    g.generateTexture('spark', 16, 16);
    g.destroy();
  }
  if (!scene.textures.exists('star')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xfff3b0, 1);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 11 : 3.5;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      pts.push(new Phaser.Math.Vector2(12 + Math.cos(a) * r, 12 + Math.sin(a) * r));
    }
    g.fillPoints(pts, true);
    g.generateTexture('star', 24, 24);
    g.destroy();
  }
  if (!scene.textures.exists('mote')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xfff1c9, 1);
    g.fillCircle(3, 3, 2);
    g.generateTexture('mote', 6, 6);
    g.destroy();
  }
  if (!scene.textures.exists('glow')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    for (let i = 20; i > 0; i--) {
      g.fillStyle(0xffd76a, 0.05);
      g.fillCircle(32, 32, i * 1.6);
    }
    g.generateTexture('glow', 64, 64);
    g.destroy();
  }
}
