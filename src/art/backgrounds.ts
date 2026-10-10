/** Illustrated cutaway worlds: weathered copper, pencilled timber and living ivy. */
import Phaser from 'phaser';
import { mulberry32 } from '../mechanism/rng';
import type { Backdrop, ThemeId } from '../content/types';
import { PALETTES } from './palette';
import { CM, drawCopperPipe, drawLeafSprig, drawPatina, drawTimber } from './copperMoss';
import { coverImage, withArt } from './generated';

type G = Phaser.GameObjects.Graphics;
const W = 1280;
const H = 720;

function vignette(g: G, a = 0.12): void {
  for (let i = 0; i < 7; i++) {
    g.fillStyle(CM.ink, a / 7);
    g.fillRect(0, 0, W, 14 + i * 8);
    g.fillRect(0, 0, 12 + i * 8, H);
    g.fillRect(W - 12 - i * 8, 0, 12 + i * 8, H);
  }
}

function dial(g: G, x: number, y: number, r: number, color: number = CM.paper, hands = true): void {
  g.fillStyle(CM.ink, 0.25);
  g.fillCircle(x + 2, y + 3, r + 5);
  g.fillStyle(CM.copperDark, 1);
  g.fillCircle(x, y, r + 3);
  g.lineStyle(1.2, CM.ink, 0.8);
  g.strokeCircle(x, y, r + 3);
  g.fillStyle(color, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(0.8, CM.inkSoft, 0.8);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    g.lineBetween(x + Math.cos(a) * r * 0.79, y + Math.sin(a) * r * 0.79, x + Math.cos(a) * r * 0.94, y + Math.sin(a) * r * 0.94);
  }
  if (hands) {
    g.lineStyle(1.4, CM.ink, 0.9);
    g.lineBetween(x, y, x + r * 0.25, y - r * 0.4);
    g.lineBetween(x, y, x - r * 0.52, y - r * 0.14);
    g.fillStyle(CM.copperDark, 1);
    g.fillCircle(x, y, 2);
  }
}

function etchedGear(g: G, x: number, y: number, r: number, seed: number): void {
  g.lineStyle(1, CM.inkSoft, 0.32);
  g.strokeCircle(x, y, r * 0.83);
  g.strokeCircle(x, y, r * 0.72);
  g.strokeCircle(x, y, r * 0.19);
  for (let i = 0; i < 22; i++) {
    const a = i * Math.PI / 11 + seed * 0.02;
    g.lineBetween(x + Math.cos(a) * r * 0.83, y + Math.sin(a) * r * 0.83, x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 0.4;
    g.lineBetween(x + Math.cos(a) * r * 0.24, y + Math.sin(a) * r * 0.24, x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66);
  }
}

function jar(g: G, x: number, y: number, w: number, h: number, color: number, seed: number): void {
  g.fillStyle(color, 1);
  g.fillRoundedRect(x, y - h, w, h, 3);
  g.lineStyle(1, CM.ink, 0.8);
  g.strokeRoundedRect(x, y - h, w, h, 3);
  g.fillStyle(CM.copperDark, 1);
  g.fillRect(x - 1, y - h, w + 2, 4);
  g.fillStyle(CM.paper, 0.85);
  g.fillRect(x + w * 0.15, y - h * 0.6, w * 0.7, h * 0.24);
  g.lineStyle(0.7, CM.inkSoft, 0.65);
  g.lineBetween(x + w * 0.24, y - h * 0.49, x + w * 0.72, y - h * 0.49);
  drawPatina(g, x + 1, y - h + 4, w - 2, h - 5, seed, 1.5);
}

/** Painted scenery always lives below the caller's backdrop depth and all puzzle objects. */
function roomPainting(scene: Phaser.Scene, g: G, id: string): void {
  let alive = true;
  let picture: Phaser.GameObjects.Image | undefined;
  const setDepth = g.setDepth.bind(g);
  g.setDepth = (depth: number) => {
    setDepth(depth);
    picture?.setDepth(depth - 0.01);
    return g;
  };
  const stop = () => { alive = false; };
  scene.sys.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
  g.once(Phaser.GameObjects.Events.DESTROY, () => {
    alive = false;
    scene.sys.events.off(Phaser.Scenes.Events.SHUTDOWN, stop);
    if (picture?.scene) picture.destroy();
  });
  withArt(scene, id, (key) => {
    if (!alive || !g.scene || !g.active) return;
    picture = coverImage(scene, key, 0, 0, W, H).setDepth(g.depth - 0.01).setName(`painted:${id}`);
    g.setAlpha(0);
  });
}

/** Draw a room's wall + floor. Its broad centre remains quiet for touch puzzles. */
export function drawRoomBackdrop(scene: Phaser.Scene, theme: ThemeId, floorY = 668): G {
  const p = PALETTES[theme];
  const g = scene.add.graphics();
  const seed = [...theme].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7) >>> 0;
  const rng = mulberry32(seed);
  g.fillGradientStyle(p.wall[0], p.wall[1], p.wall[1], p.wall[0], 1);
  g.fillRect(0, 0, W, H);
  switch (p.pattern) {
    case 'planks':
      for (let i = 0; i < 15; i++) drawTimber(g, i * 90 - 4, 0, 94, floorY, seed + i, i % 2 ? p.wall[0] : p.wall[1]);
      for (const x of [65, 1210]) {
        dial(g, x, 152, 32, CM.paper);
        drawCopperPipe(g, [[x, 205], [x, floorY - 30]], 7);
        etchedGear(g, x, 455, 57, 4);
      }
      break;
    case 'quilt':
      for (let y = 0; y < floorY; y += 76) for (let x = -38; x < W; x += 76) {
        g.lineStyle(0.9, CM.paper, 0.16);
        g.strokePoints([new Phaser.Math.Vector2(x + 38, y), new Phaser.Math.Vector2(x + 76, y + 38), new Phaser.Math.Vector2(x + 38, y + 76), new Phaser.Math.Vector2(x, y + 38)], true);
        g.fillStyle(CM.paperDark, 0.35);
        g.fillCircle(x + 38, y, 1.8);
      }
      for (const x of [42, W - 64]) {
        g.fillStyle(CM.copperDark, 0.7);
        g.fillRect(x, 78, 23, floorY - 115);
        for (let y = 91; y < floorY - 34; y += 23) {
          g.fillStyle(CM.brass, 0.85);
          g.fillEllipse(x + 11, y, 14, 5);
          g.lineStyle(0.7, CM.ink, 0.5);
          g.lineBetween(x + 4, y + 3, x + 18, y + 3);
        }
      }
      break;
    case 'sky': {
      g.fillGradientStyle(CM.sky, CM.sky, CM.paper, CM.paper, 1);
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) {
        const cx = rng() * W;
        const cy = 80 + rng() * 200;
        g.fillStyle(CM.cream, 0.32);
        g.fillEllipse(cx, cy, 160, 32);
        g.fillEllipse(cx + 34, cy - 12, 94, 38);
      }
      g.fillStyle(0x9b9f80, 1);
      for (let i = 0; i < 6; i++) g.fillEllipse(i * 260, floorY - 90, 510, 270);
      g.fillStyle(CM.moss, 1);
      for (let i = 0; i < 5; i++) g.fillEllipse(i * 350 + 80, floorY - 40, 460, 180);
      for (let i = 0; i < 5; i++) house(g, 20 + i * 250, floorY - 90, 58, 54 + rng() * 25, CM.paperDark, CM.teal, false);
      drawTimber(g, 0, floorY - 24, W, 24, seed, CM.wood);
      break;
    }
    case 'deco':
      for (let i = 0; i < 9; i++) {
        const x = 28 + i * 150;
        const h = 180 + rng() * 200;
        g.fillStyle(CM.woodDark, 0.32);
        g.fillRoundedRect(x, floorY - h, 43, h, { tl: 22, tr: 22, bl: 0, br: 0 });
        g.lineStyle(1, CM.copperLight, 0.23);
        g.strokeRoundedRect(x, floorY - h, 43, h, { tl: 22, tr: 22, bl: 0, br: 0 });
        for (let y = floorY - h + 27; y < floorY - 24; y += 18) g.lineBetween(x + 9, y, x + 34, y);
      }
      for (const x of [50, W - 70]) {
        jar(g, x, 335, 40, 116, CM.tealDark, seed + x);
        g.fillStyle(CM.glow, 0.13);
        g.fillEllipse(x + 20, 241, 70, 94);
        drawCopperPipe(g, [[x + 20, 352], [x + 20, 523], [x + 75, 523]], 7);
      }
      break;
    case 'tiles':
      for (let y = 0; y < floorY; y += 62) for (let x = 0; x < W; x += 64) {
        g.fillStyle((x / 64 + y / 62) % 2 ? p.wall[0] : p.wall[1], 1);
        g.fillRoundedRect(x + 2, y + 2, 59, 57, 2);
        g.lineStyle(0.7, CM.paper, 0.17);
        g.lineBetween(x + 4, y + 4, x + 59, y + 4);
        g.lineStyle(1, CM.ink, 0.13);
        g.lineBetween(x + 6, y + 57, x + 59, y + 57);
      }
      drawCopperPipe(g, [[0, 85], [87, 85], [87, 385], [33, 385], [33, floorY]], 13);
      drawCopperPipe(g, [[W, 140], [W - 89, 140], [W - 89, 480], [W, 480]], 12);
      dial(g, 89, 260, 28, CM.paper, false);
      drawLeafSprig(g, W - 44, 43, 154, seed, 0.9);
      break;
    case 'stripes':
      for (let i = 0; i < 25; i++) {
        g.fillStyle(i % 2 ? p.wall[0] : p.wall[1], 0.7);
        g.fillRect(i * 52, 0, 52, floorY);
        g.lineStyle(0.8, CM.ink, 0.1);
        g.lineBetween(i * 52, 0, i * 52 + 2, floorY);
      }
      drawTimber(g, 0, 27, W, 22, seed, CM.tealDark);
      for (let i = 0; i < 25; i++) {
        g.fillStyle(CM.glow, 0.11);
        g.fillCircle(22 + i * 52, 38, 12);
        g.fillStyle(CM.paper, 0.9);
        g.fillCircle(22 + i * 52, 38, 4.2);
        g.lineStyle(1, CM.copperDark, 0.9);
        g.strokeCircle(22 + i * 52, 38, 4.2);
      }
      for (const x of [16, W - 73]) {
        g.fillStyle(CM.paper, 0.3);
        g.fillRect(x, 270, 57, 164);
        for (let y = 282; y < 426; y += 15) for (let xx = x + 8; xx < x + 52; xx += 11) {
          g.fillStyle(CM.ink, 0.23);
          g.fillCircle(xx, y, 2.1);
        }
      }
      break;
    case 'stars':
      for (let i = 0; i < 120; i++) {
        const x = rng() * W;
        const y = rng() * floorY;
        g.fillStyle(CM.paper, 0.2 + rng() * 0.45);
        g.fillCircle(x, y, 0.5 + rng());
        if (i % 13 === 0) {
          g.lineStyle(0.7, CM.paper, 0.25);
          g.lineBetween(x - 4, y, x + 4, y);
          g.lineBetween(x, y - 4, x, y + 4);
        }
      }
      g.lineStyle(1, CM.brass, 0.3);
      g.strokeEllipse(640, 340, 1130, 470);
      g.strokeEllipse(640, 340, 990, 430);
      g.strokeEllipse(640, 340, 1160, 270);
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12;
        g.lineBetween(640 + Math.cos(a) * 547, 340 + Math.sin(a) * 226, 640 + Math.cos(a) * 568, 340 + Math.sin(a) * 238);
      }
      dial(g, 55, 465, 31, CM.paperDark, false);
      etchedGear(g, W - 52, 135, 56, 13);
      break;
    case 'stone':
      for (let y = 0; y < floorY; y += 58) {
        const off = (y / 58) % 2 ? 0 : 61;
        for (let x = -off; x < W; x += 122) {
          g.fillStyle(rng() < 0.5 ? p.wall[0] : p.wall[1], 1);
          g.fillRoundedRect(x + 2, y + 2, 116, 53, 2);
          g.lineStyle(1, CM.ink, 0.15);
          g.lineBetween(x + 8, y + 53, x + 109, y + 52);
        }
      }
      g.fillStyle(CM.woodDark, 1);
      g.fillCircle(640, 132, 90);
      for (let i = 0; i < 12; i++) {
        g.fillStyle([CM.copper, CM.teal, CM.mossLight, CM.paperDark][i % 4], 0.8);
        g.slice(640, 132, 81, i * Math.PI / 6, (i + 1) * Math.PI / 6, false);
        g.fillPath();
      }
      g.lineStyle(2, CM.ink, 0.7);
      g.strokeCircle(640, 132, 81);
      dial(g, 640, 132, 23, CM.paper);
      drawLeafSprig(g, 28, 42, 187, seed);
      drawLeafSprig(g, W - 28, 340, 191, seed + 2);
      break;
    case 'wallpaper':
      for (let y = 10; y < floorY; y += 73) for (let x = 20 + (y % 2) * 30; x < W; x += 84) {
        g.lineStyle(0.8, CM.mossDark, 0.12);
        g.lineBetween(x, y, x + 2, y + 32);
        g.strokeEllipse(x - 4, y + 9, 11, 7);
        g.strokeEllipse(x + 6, y + 22, 11, 7);
      }
      for (const x of [24, W - 112]) {
        drawTimber(g, x, 166, 91, 11, seed + x, CM.wood);
        for (let i = 0; i < 3; i++) jar(g, x + 6 + i * 27, 165, 21, 38 + rng() * 25, [CM.teal, CM.copper, CM.paperDark][i], seed + i);
        drawLeafSprig(g, x + 78, 158, 153, seed + x, 0.8);
      }
      break;
    case 'pegboard':
      for (let y = 25; y < floorY; y += 40) for (let x = 22; x < W; x += 40) {
        g.fillStyle(CM.woodDark, 0.34);
        g.fillCircle(x, y, 2.5);
        g.lineStyle(0.7, CM.paper, 0.5);
        g.beginPath(); g.arc(x, y, 3.5, 0.2, 2.5); g.strokePath();
      }
      etchedGear(g, 65, 140, 45, 2);
      etchedGear(g, W - 70, 380, 46, 5);
      drawCopperPipe(g, [[35, 272], [35, 440], [84, 440]], 8);
      drawLeafSprig(g, W - 37, 36, 136, seed);
      break;
    case 'beams':
      for (let i = 0; i < 6; i++) drawTimber(g, 50 + i * 230, 0, 31, floorY, seed + i, CM.woodDark);
      drawTimber(g, 0, 40, W, 27, seed, CM.woodDark);
      g.fillStyle(CM.paper, 0.06);
      g.fillTriangle(985, 56, 1100, 56, 865, floorY);
      g.fillStyle(CM.woodDark, 1);
      g.fillCircle(1040, 146, 67);
      g.fillStyle(CM.sky, 0.75);
      g.fillCircle(1040, 146, 58);
      g.fillStyle(CM.paper, 0.8);
      g.fillCircle(1048, 134, 21);
      g.fillStyle(CM.sky, 1);
      g.fillCircle(1059, 127, 20);
      g.lineStyle(5, CM.woodDark, 1);
      g.lineBetween(983, 146, 1097, 146);
      g.lineBetween(1040, 89, 1040, 203);
      drawLeafSprig(g, 76, 54, 124, seed);
      break;
  }
  drawPatina(g, 0, 0, W, floorY, seed + 1, 0.8);
  if (theme !== 'train') {
    etchedGear(g, 42, floorY - 65, 33, seed);
    etchedGear(g, W - 39, floorY - 54, 27, seed + 1);
  }
  drawTimber(g, 0, floorY - 7, W, 12, seed + 33, p.floorEdge);
  g.fillStyle(p.floor, 1);
  g.fillRect(0, floorY + 4, W, H - floorY);
  for (let y = floorY + 5; y < H; y += 24) drawTimber(g, 0, y, W, 23, seed + y, p.floor);
  vignette(g);
  roomPainting(scene, g, `room-${theme}`);
  return g;
}

/** Soft, cream sunlight. */
export function sunbeams(scene: Phaser.Scene, color: number, alpha = 0.05): G {
  const g = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const beam = (x1: number, x2: number, x3: number, x4: number, a: number) => {
    g.fillStyle(color, a);
    g.fillPoints([new Phaser.Math.Vector2(x1, 0), new Phaser.Math.Vector2(x2, 0), new Phaser.Math.Vector2(x3, H), new Phaser.Math.Vector2(x4, H)], true);
  };
  beam(980, 1060, 640, 480, alpha);
  beam(1100, 1150, 820, 720, alpha * 0.7);
  scene.tweens.add({ targets: g, alpha: 0.65, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return g;
}

function house(g: G, x: number, y: number, w: number, h: number, color: number, roof: number, lit: boolean): void {
  const seed = Math.round(x + w + h);
  g.fillStyle(color, 1);
  g.fillPoints([new Phaser.Math.Vector2(x, y), new Phaser.Math.Vector2(x + 2, y - h), new Phaser.Math.Vector2(x + w - 4, y - h - 3), new Phaser.Math.Vector2(x + w, y)], true);
  g.lineStyle(1.2, CM.ink, 0.65);
  g.strokeRect(x + 1, y - h, w - 2, h);
  g.fillStyle(roof, 1);
  g.fillTriangle(x - 8, y - h, x + w * 0.45, y - h - w * 0.39, x + w + 7, y - h - 3);
  g.lineStyle(1.4, CM.ink, 0.8);
  g.lineBetween(x - 8, y - h, x + w * 0.45, y - h - w * 0.39);
  g.lineBetween(x + w * 0.45, y - h - w * 0.39, x + w + 7, y - h - 3);
  g.fillStyle(CM.copperDark, 1);
  g.fillRect(x + w * 0.75, y - h - w * 0.3, w * 0.09, w * 0.25);
  for (const wx of [x + w * 0.2, x + w * 0.58]) {
    g.fillStyle(lit ? CM.glow : CM.tealDark, 1);
    g.fillRect(wx, y - h * 0.74, w * 0.21, h * 0.23);
    g.lineStyle(0.8, CM.woodDark, 1);
    g.strokeRect(wx, y - h * 0.74, w * 0.21, h * 0.23);
    g.lineBetween(wx + w * 0.105, y - h * 0.74, wx + w * 0.105, y - h * 0.51);
    g.lineBetween(wx, y - h * 0.62, wx + w * 0.21, y - h * 0.62);
  }
  g.fillStyle(CM.woodDark, 1);
  g.fillRoundedRect(x + w * 0.42, y - h * 0.3, w * 0.19, h * 0.3, { tl: w * 0.1, tr: w * 0.1, bl: 0, br: 0 });
  drawPatina(g, x + 2, y - h + 2, w - 4, h - 4, seed, 0.8);
}


export function drawStage(scene: Phaser.Scene, bg: Backdrop): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  roomPainting(scene, g, `stage-${bg}`);
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
    g.fillStyle(CM.ink, 1);
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
    g.fillStyle(CM.woodDark, 1);
    g.fillRect(780, 215, 360, 10);
    g.fillRect(955, 90, 10, 260);
    // shelves of clocks
    g.fillStyle(CM.woodDark, 1);
    g.fillRect(60, 160, 380, 14);
    g.fillRect(60, 300, 380, 14);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(CM.brass, 1);
      g.fillCircle(100 + i * 75, 135, 22);
      g.fillStyle(CM.paper, 1);
      g.fillCircle(100 + i * 75, 135, 16);
      g.fillStyle(CM.copperDark, 1);
      g.fillRoundedRect(80 + i * 75, 240, 44, 60, 6);
    }
    // workbench
    g.fillStyle(CM.woodDark, 1);
    g.fillRect(0, ground, W, H - ground);
    g.fillStyle(CM.wood, 1);
    g.fillRect(0, ground - 14, W, 18);
    if (night) {
      g.fillStyle(0x000020, 0.45);
      g.fillRect(0, 0, W, H);
      g.fillStyle(CM.glow, 0.12);
      g.fillCircle(640, 300, 260);
    }
    return g;
  }
  if (bg === 'attic') {
    drawRoomBackdrop(scene, 'attic', ground).setDepth(-1);
    return g;
  }
  if (bg === 'tower' || bg === 'nest') {
    g.fillGradientStyle(CM.copperLight, CM.copperLight, CM.paper, CM.paper, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x7a736d, 1);
    g.fillRect(500, 60, 280, ground);
    g.fillStyle(0x6b6560, 1);
    g.fillTriangle(480, 60, 640, -80, 800, 60);
    g.fillStyle(CM.paper, 1);
    g.fillCircle(640, 180, 80);
    g.lineStyle(6, CM.ink, 1);
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
    g.fillStyle(CM.moss, 1);
    g.fillRect(0, ground, W, H - ground);
    return g;
  }
  // outdoor / town stages
  const sky: Record<string, [number, number]> = {
    street: [CM.sky, CM.paper],
    party: [0xffe3a3, 0xfff6dc],
    harbor: [0x5b7da8, 0xc8d9ec],
    cafe: [0xd5f5e3, 0xf3fff8],
    fair: [CM.sky, 0xfff3bf],
    classroom: [0x1a2550, 0x2c3e70],
    festival: [CM.sky, 0xfff3bf],
    bakery: [0xffcf9e, 0xfff3dc],
  };
  const [a, b] = sky[bg] ?? [CM.sky, CM.paper];
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
    g.fillStyle(CM.glow, 1);
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
    g.lineStyle(3, CM.copper, 1);
    g.strokeCircle(1000, 260, 170);
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      g.lineBetween(1000, 260, 1000 + Math.cos(an) * 170, 260 + Math.sin(an) * 170);
      g.fillStyle([CM.brass, CM.teal, 0xff8787, CM.mossLight][i % 4], 1);
      g.fillRoundedRect(1000 + Math.cos(an) * 170 - 16, 260 + Math.sin(an) * 170 - 10, 32, 26, 6);
    }
    for (let i = 0; i < 14; i++) {
      g.fillStyle([0xaf7985, CM.brass, CM.teal, CM.mossLight][i % 4], 1);
      g.fillTriangle(i * 95, 40, i * 95 + 60, 40, i * 95 + 30, 80);
    }
    g.lineStyle(2, 0x5a3a22, 1);
    g.lineBetween(0, 40, W, 40);
    if (bg === 'festival') {
      g.fillStyle(0x7a736d, 1);
      g.fillRect(140, 60, 160, 500);
      g.fillStyle(CM.paper, 1);
      g.fillCircle(220, 150, 50);
    }
  } else {
    for (let i = 0; i < 7; i++) house(g, 20 + i * 185, 470, 150, 160 + rng() * 90, [0xe8c39e, 0xd6e4f0, 0xf2d0a9, 0xcfe8c9][i % 4], [0xa0522d, 0x5a7d9a, 0x8e3b46][i % 3], bg === 'party');
    if (bg === 'party') {
      for (let i = 0; i < 20; i++) {
        g.fillStyle([0xaf7985, CM.brass, CM.teal, CM.mossLight][i % 4], 1);
        g.fillCircle(rng() * W, 60 + rng() * 120, 14);
      }
    }
    if (bg === 'cafe') {
      g.fillStyle(0xffffff, 1);
      for (let i = 0; i < 5; i++) g.fillRoundedRect(120 + i * 230, 470, 120, 20, 6);
    }
  }
  g.fillStyle(bg === 'classroom' ? CM.woodDark : 0xb59e7e, 1);
  g.fillRect(0, ground, W, H - ground);
  g.fillStyle(0x000000, 0.12);
  g.fillRect(0, ground, W, 8);
  return g;
}
