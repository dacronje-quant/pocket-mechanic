/**
 * Backdrops drawn in code: room interiors (one colour story per object,
 * GDD §24.2) and the story stages around Brasswick.
 */
import Phaser from 'phaser';
import { mulberry32 } from '../mechanism/rng';
import type { Backdrop, ThemeId } from '../content/types';
import { PALETTES } from './palette';

const W = 1280;
const H = 720;

function vignette(g: Phaser.GameObjects.Graphics, a = 0.22): void {
  for (let i = 0; i < 6; i++) {
    g.fillStyle(0x000000, a / 6);
    g.fillRect(0, 0, W, 40 + i * 12);
    g.fillRect(0, 0, 24 + i * 10, H);
    g.fillRect(W - 24 - i * 10, 0, 24 + i * 10, H);
  }
}

/** Draw a room's wall + floor. `floorY` is where Kip walks. */
export function drawRoomBackdrop(scene: Phaser.Scene, theme: ThemeId, floorY = 668): Phaser.GameObjects.Graphics {
  const p = PALETTES[theme];
  const g = scene.add.graphics();
  const rng = mulberry32(theme.length * 977 + floorY);
  g.fillStyle(p.wall[0], 1);
  g.fillRect(0, 0, W, H);
  switch (p.pattern) {
    case 'planks':
      for (let i = 0; i < 14; i++) {
        g.fillStyle(i % 2 ? p.wall[0] : p.wall[1], 1);
        g.fillRect(i * 96, 0, 96, H);
        g.fillStyle(0x000000, 0.25);
        g.fillRect(i * 96, 0, 3, H);
      }
      g.lineStyle(1, 0x000000, 0.18);
      for (let i = 0; i < 60; i++) {
        const x = rng() * W;
        const y = rng() * H;
        g.lineBetween(x, y, x + (rng() - 0.5) * 12, y + 40 + rng() * 80);
      }
      break;
    case 'quilt':
      for (let y = 0; y < H; y += 80) {
        for (let x = (y / 80) % 2 ? -40 : 0; x < W; x += 80) {
          g.fillStyle(((x + y) / 40) % 2 ? p.wall[0] : p.wall[1], 1);
          g.fillTriangle(x + 40, y, x + 80, y + 40, x + 40, y + 80);
          g.fillTriangle(x + 40, y, x, y + 40, x + 40, y + 80);
          g.fillStyle(0xffffff, 0.35);
          g.fillCircle(x + 40, y, 3);
        }
      }
      break;
    case 'sky': {
      g.fillGradientStyle(0x6ec1f0, 0x6ec1f0, 0xd6f0ff, 0xd6f0ff, 1);
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) {
        const cx = rng() * W;
        const cy = 80 + rng() * 200;
        g.fillStyle(0xffffff, 0.85);
        g.fillEllipse(cx, cy, 120, 40);
        g.fillEllipse(cx + 40, cy - 12, 80, 40);
        g.fillEllipse(cx - 40, cy - 6, 70, 30);
      }
      // papier-mâché hills
      g.fillStyle(0x7cb342, 1);
      for (let i = 0; i < 5; i++) g.fillEllipse(i * 320 - 40 + rng() * 60, floorY - 40, 420, 240);
      g.fillStyle(0x689f38, 1);
      for (let i = 0; i < 4; i++) g.fillEllipse(i * 360 + 120, floorY - 10, 380, 160);
      break;
    }
    case 'deco':
      g.fillGradientStyle(0x1a0f08, 0x1a0f08, p.wall[1], p.wall[1], 1);
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) {
        const x = 60 + i * 140 + rng() * 20;
        const h = 200 + rng() * 260;
        g.fillStyle(0x2a1a0e, 1);
        g.fillRect(x, floorY - h, 70, h);
        g.fillStyle(0xffb347, 0.08);
        g.fillEllipse(x + 35, floorY - h, 90, 50);
        for (let k = 0; k < h / 30; k++) {
          g.fillStyle(0xffb347, rng() < 0.5 ? 0.35 : 0.1);
          g.fillRect(x + 12, floorY - h + 14 + k * 30, 12, 14);
          g.fillRect(x + 46, floorY - h + 14 + k * 30, 12, 14);
        }
      }
      g.lineStyle(3, 0xc8703f, 0.5);
      for (let i = 0; i < 5; i++) g.lineBetween(0, 120 + i * 18, W, 160 + i * 18);
      break;
    case 'tiles':
      for (let y = 0; y < H; y += 60) {
        for (let x = 0; x < W; x += 60) {
          g.fillStyle(((x + y) / 60) % 2 ? p.wall[0] : p.wall[1], 1);
          g.fillRect(x, y, 60, 60);
        }
      }
      g.lineStyle(10, 0xb5652e, 1);
      g.lineBetween(0, 110, W, 110);
      g.lineBetween(120, 0, 120, floorY);
      g.lineBetween(W - 120, 0, W - 120, floorY);
      g.lineStyle(4, 0xf0a77a, 0.6);
      g.lineBetween(0, 107, W, 107);
      break;
    case 'stripes':
      for (let i = 0; i < 20; i++) {
        g.fillStyle(i % 2 ? p.wall[0] : p.wall[1], 1);
        g.fillRect(i * 64, 0, 64, H);
      }
      for (let i = 0; i < 26; i++) {
        g.fillStyle(0xfff3bf, 1);
        g.fillCircle(25 + i * 50, 24, 8);
        g.fillStyle(0xffd43b, 0.25);
        g.fillCircle(25 + i * 50, 24, 16);
      }
      break;
    case 'stars':
      g.fillGradientStyle(0x050a20, 0x050a20, p.wall[1], p.wall[1], 1);
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 140; i++) {
        g.fillStyle(0xffffff, 0.3 + rng() * 0.7);
        g.fillCircle(rng() * W, rng() * floorY, rng() * 1.8 + 0.4);
      }
      g.lineStyle(2, 0xb88a2c, 0.35);
      g.strokeEllipse(W / 2, 330, 1100, 300);
      g.strokeEllipse(W / 2, 330, 800, 200);
      break;
    case 'stone':
      for (let y = 0; y < H; y += 48) {
        const off = (y / 48) % 2 ? 0 : 60;
        for (let x = -off; x < W; x += 120) {
          g.fillStyle(rng() < 0.5 ? p.wall[0] : p.wall[1], 1);
          g.fillRect(x + 2, y + 2, 116, 44);
        }
      }
      // stained-glass window
      g.fillStyle(0x2b1d14, 1);
      g.fillCircle(W / 2, 180, 110);
      const cols = [0xff9e57, 0x5fa8d3, 0xe05a47, 0xffd43b, 0x7cb342, 0xb197fc];
      for (let i = 0; i < 12; i++) {
        g.fillStyle(cols[i % cols.length], 0.85);
        g.slice(W / 2, 180, 100, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2, false);
        g.fillPath();
      }
      g.fillStyle(0xfff3bf, 1);
      g.fillCircle(W / 2, 180, 26);
      break;
    case 'wallpaper':
      for (let i = 0; i < 20; i++) {
        g.fillStyle(i % 2 ? p.wall[0] : p.wall[1], 1);
        g.fillRect(i * 64, 0, 64, H);
      }
      for (let y = 30; y < floorY; y += 70) {
        for (let x = (y / 70) % 2 ? 32 : 0; x < W; x += 64) {
          g.fillStyle(p.accent, 0.15);
          g.fillCircle(x, y, 6);
          g.fillCircle(x - 7, y + 6, 4);
          g.fillCircle(x + 7, y + 6, 4);
        }
      }
      break;
    case 'pegboard':
      for (let y = 20; y < floorY; y += 50) for (let x = 20; x < W; x += 50) {
        g.fillStyle(0x7a5a32, 1);
        g.fillCircle(x, y, 4);
      }
      break;
    case 'beams':
      g.fillGradientStyle(0x0d0d18, 0x0d0d18, p.wall[1], p.wall[1], 1);
      g.fillRect(0, 0, W, H);
      g.fillStyle(0x3a2a1e, 1);
      g.fillTriangle(0, 0, W / 2, -200, W, 0);
      for (let i = 0; i < 6; i++) {
        g.fillStyle(0x3d2b1e, 1);
        g.fillRect(80 + i * 220, 0, 30, floorY);
      }
      g.fillStyle(0xdfe6ff, 0.06);
      g.fillTriangle(900, 0, 1100, 0, 700, floorY);
      g.fillStyle(0xdfe6ff, 0.9);
      g.fillCircle(1000, 90, 34);
      g.fillStyle(0x0d0d18, 1);
      g.fillCircle(1014, 82, 30);
      break;
  }
  // floor
  g.fillStyle(p.floor, 1);
  g.fillRect(0, floorY, W, H - floorY);
  g.fillStyle(p.floorEdge, 1);
  g.fillRect(0, floorY - 6, W, 8);
  vignette(g);
  return g;
}

/** Soft additive light shafts. */
export function sunbeams(scene: Phaser.Scene, color: number, alpha = 0.05): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const beam = (x1: number, x2: number, x3: number, x4: number, a: number) => {
    g.fillStyle(color, a);
    g.fillPoints([new Phaser.Math.Vector2(x1, 0), new Phaser.Math.Vector2(x2, 0), new Phaser.Math.Vector2(x3, H), new Phaser.Math.Vector2(x4, H)], true);
  };
  beam(980, 1060, 640, 480, alpha);
  beam(1100, 1150, 820, 720, alpha * 0.8);
  beam(880, 920, 380, 300, alpha * 0.7);
  scene.tweens.add({ targets: g, alpha: 0.6, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return g;
}

// ───────────────────────────── story stages ─────────────────────────────

function house(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, col: number, roof: number, lit: boolean): void {
  g.fillStyle(col, 1);
  g.fillRect(x, y - h, w, h);
  g.fillStyle(roof, 1);
  g.fillTriangle(x - 10, y - h, x + w / 2, y - h - w * 0.45, x + w + 10, y - h);
  g.fillStyle(lit ? 0xffd76a : 0x3a4a6a, 1);
  g.fillRect(x + w * 0.2, y - h * 0.7, w * 0.22, h * 0.25);
  g.fillRect(x + w * 0.58, y - h * 0.7, w * 0.22, h * 0.25);
  g.fillStyle(0x5a3a22, 1);
  g.fillRect(x + w * 0.4, y - h * 0.35, w * 0.2, h * 0.35);
}

export function drawStage(scene: Phaser.Scene, bg: Backdrop): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const rng = mulberry32(bg.length * 131);
  const ground = 560;
  const night = bg === 'storm' || bg === 'shopNight' || bg === 'attic';
  if (bg === 'shop' || bg === 'shopNight' || bg === 'storm') {
    const pal = PALETTES.shop;
    g.fillStyle(pal.wall[0], 1);
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 20; i++) {
      g.fillStyle(i % 2 ? pal.wall[0] : pal.wall[1], 1);
      g.fillRect(i * 64, 0, 64, H);
    }
    // window
    g.fillStyle(0x2b1d14, 1);
    g.fillRect(780, 90, 360, 260);
    g.fillStyle(night ? 0x0f1a33 : 0xbfe3f5, 1);
    g.fillRect(795, 105, 330, 230);
    if (bg === 'storm') {
      g.lineStyle(2, 0x9ab8d8, 0.6);
      for (let i = 0; i < 40; i++) {
        const x = 800 + rng() * 320;
        const y = 110 + rng() * 220;
        g.lineBetween(x, y, x - 6, y + 18);
      }
    } else if (!night) {
      house(g, 820, 330, 80, 90, 0xe8c39e, 0xa0522d, false);
      house(g, 930, 330, 90, 120, 0xd6e4f0, 0x5a7d9a, false);
      house(g, 1040, 330, 70, 80, 0xf2d0a9, 0x8e3b46, false);
    } else {
      for (let i = 0; i < 20; i++) {
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(800 + rng() * 320, 110 + rng() * 120, 1.2);
      }
    }
    g.fillStyle(0x6e4527, 1);
    g.fillRect(780, 215, 360, 10);
    g.fillRect(955, 90, 10, 260);
    // shelves of clocks
    g.fillStyle(0x3d2412, 1);
    g.fillRect(60, 160, 380, 14);
    g.fillRect(60, 300, 380, 14);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0xd9a441, 1);
      g.fillCircle(100 + i * 75, 135, 22);
      g.fillStyle(0xf6ead0, 1);
      g.fillCircle(100 + i * 75, 135, 16);
      g.fillStyle(0x7a4b26, 1);
      g.fillRoundedRect(80 + i * 75, 240, 44, 60, 6);
    }
    // workbench
    g.fillStyle(0x6e4527, 1);
    g.fillRect(0, ground, W, H - ground);
    g.fillStyle(0x8a5a33, 1);
    g.fillRect(0, ground - 14, W, 18);
    if (night) {
      g.fillStyle(0x000020, 0.45);
      g.fillRect(0, 0, W, H);
      g.fillStyle(0xffd76a, 0.12);
      g.fillCircle(640, 300, 260);
    }
    return g;
  }
  if (bg === 'attic') {
    drawRoomBackdrop(scene, 'attic', ground).setDepth(-1);
    return g;
  }
  if (bg === 'tower' || bg === 'nest') {
    g.fillGradientStyle(0xff9e57, 0xff9e57, 0xffd3a1, 0xffd3a1, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x7a736d, 1);
    g.fillRect(500, 60, 280, ground);
    g.fillStyle(0x6b6560, 1);
    g.fillTriangle(480, 60, 640, -80, 800, 60);
    g.fillStyle(0xf6ead0, 1);
    g.fillCircle(640, 180, 80);
    g.lineStyle(6, 0x2b1d14, 1);
    g.lineBetween(640, 180, 640, 125);
    g.lineBetween(640, 180, 680, 180);
    if (bg === 'nest') {
      g.fillStyle(0x5a3a22, 1);
      g.fillEllipse(640, 420, 520, 160);
      for (let i = 0; i < 40; i++) {
        g.fillStyle([0xffd700, 0xc0c8d0, 0xe8a33d, 0xffffff][i % 4], 1);
        g.fillCircle(420 + rng() * 440, 360 + rng() * 80, 4 + rng() * 6);
      }
    }
    g.fillStyle(0x5a8f3c, 1);
    g.fillRect(0, ground, W, H - ground);
    return g;
  }
  // outdoor / town stages
  const sky: Record<string, [number, number]> = {
    street: [0x8fd0f2, 0xe6f6ff],
    party: [0xffe3a3, 0xfff6dc],
    harbor: [0x5b7da8, 0xc8d9ec],
    cafe: [0xd5f5e3, 0xf3fff8],
    fair: [0x8fd0f2, 0xfff3bf],
    classroom: [0x1a2550, 0x2c3e70],
    festival: [0x8fd0f2, 0xfff3bf],
    bakery: [0xffcf9e, 0xfff3dc],
  };
  const [a, b] = sky[bg] ?? [0x8fd0f2, 0xe6f6ff];
  g.fillGradientStyle(a, a, b, b, 1);
  g.fillRect(0, 0, W, H);
  if (bg === 'harbor') {
    g.fillStyle(0x2e5e8a, 1);
    g.fillRect(0, 380, W, 200);
    for (let i = 0; i < 4; i++) {
      const x = 200 + i * 260;
      g.fillStyle(0xe05a47, 1);
      g.fillTriangle(x - 50, 420, x + 50, 420, x + 36, 450);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(x, 340, x, 415, x + 40, 415);
    }
    g.fillStyle(0xffffff, 1);
    g.fillRect(1100, 160, 50, 230);
    g.fillStyle(0xe05a47, 1);
    g.fillRect(1100, 220, 50, 30);
    g.fillRect(1100, 300, 50, 30);
    g.fillStyle(0xffd76a, 1);
    g.fillCircle(1125, 150, 24);
  } else if (bg === 'classroom') {
    for (let i = 0; i < 120; i++) {
      g.fillStyle(0xffffff, 0.4 + rng() * 0.6);
      g.fillCircle(rng() * W, rng() * 420, rng() * 2 + 0.5);
    }
    g.fillStyle(0x2a3a2a, 1);
    g.fillRect(60, 120, 300, 180);
    g.fillStyle(0xe8d5b0, 1);
    for (let i = 0; i < 6; i++) g.fillRoundedRect(140 + i * 170, 470, 120, 50, 8);
  } else if (bg === 'fair' || bg === 'festival') {
    g.lineStyle(3, 0xd64541, 1);
    g.strokeCircle(1000, 260, 170);
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      g.lineBetween(1000, 260, 1000 + Math.cos(an) * 170, 260 + Math.sin(an) * 170);
      g.fillStyle([0xffd43b, 0x74c0fc, 0xff8787, 0x8ce99a][i % 4], 1);
      g.fillRoundedRect(1000 + Math.cos(an) * 170 - 16, 260 + Math.sin(an) * 170 - 10, 32, 26, 6);
    }
    for (let i = 0; i < 14; i++) {
      g.fillStyle([0xff6b6b, 0xffd43b, 0x74c0fc, 0x8ce99a][i % 4], 1);
      g.fillTriangle(i * 95, 40, i * 95 + 60, 40, i * 95 + 30, 80);
    }
    g.lineStyle(2, 0x5a3a22, 1);
    g.lineBetween(0, 40, W, 40);
    if (bg === 'festival') {
      g.fillStyle(0x7a736d, 1);
      g.fillRect(140, 60, 160, 500);
      g.fillStyle(0xf6ead0, 1);
      g.fillCircle(220, 150, 50);
    }
  } else {
    for (let i = 0; i < 7; i++) house(g, 20 + i * 185, 470, 150, 160 + rng() * 90, [0xe8c39e, 0xd6e4f0, 0xf2d0a9, 0xcfe8c9][i % 4], [0xa0522d, 0x5a7d9a, 0x8e3b46][i % 3], bg === 'party');
    if (bg === 'party') {
      for (let i = 0; i < 20; i++) {
        g.fillStyle([0xff6b6b, 0xffd43b, 0x74c0fc, 0x8ce99a][i % 4], 1);
        g.fillCircle(rng() * W, 60 + rng() * 120, 14);
      }
    }
    if (bg === 'cafe') {
      g.fillStyle(0xffffff, 1);
      for (let i = 0; i < 5; i++) g.fillRoundedRect(120 + i * 230, 470, 120, 20, 6);
    }
  }
  g.fillStyle(bg === 'classroom' ? 0x6e4527 : 0xb59e7e, 1);
  g.fillRect(0, ground, W, H - ground);
  g.fillStyle(0x000000, 0.12);
  g.fillRect(0, ground, W, 8);
  return g;
}
