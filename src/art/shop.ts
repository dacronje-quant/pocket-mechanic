/**
 * The Tick & Tinker shop hub, drawn in code (GDD §13.1). Each piece is drawn
 * around (0, 0) so the hub can put it in a container and make it bounce.
 */
import Phaser from 'phaser';
import { mulberry32 } from '../mechanism/rng';

type G = Phaser.GameObjects.Graphics;

export function drawShopWall(g: G, night: boolean): void {
  const rng = mulberry32(7);
  for (let i = 0; i < 20; i++) {
    g.fillStyle(i % 2 ? 0x7a4b2a : 0x83532f, 1);
    g.fillRect(i * 64, 0, 64, 610);
    g.fillStyle(0x000000, 0.18);
    g.fillRect(i * 64, 0, 3, 610);
  }
  g.lineStyle(1, 0x000000, 0.15);
  for (let i = 0; i < 50; i++) {
    const x = rng() * 1280;
    const y = rng() * 600;
    g.lineBetween(x, y, x + (rng() - 0.5) * 10, y + 30 + rng() * 60);
  }
  // wainscot
  g.fillStyle(0x5e3a20, 1);
  g.fillRect(0, 560, 1280, 50);
  g.fillStyle(0x4a2d18, 1);
  g.fillRect(0, 556, 1280, 6);
  // floorboards
  g.fillStyle(0x6e4527, 1);
  g.fillRect(0, 610, 1280, 110);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(0x000000, 0.12);
    g.fillRect(0, 610 + i * 20, 1280, 2);
  }
  // ceiling beam
  g.fillStyle(0x4a2d18, 1);
  g.fillRect(0, 0, 1280, 22);
  // warm lamp glow
  g.fillStyle(0xffd76a, night ? 0.14 : 0.08);
  g.fillCircle(640, 300, 380);
  if (night) {
    g.fillStyle(0x000020, 0.35);
    g.fillRect(0, 0, 1280, 720);
  }
}

export function drawWorkbench(g: G): void {
  g.fillStyle(0x000000, 0.25);
  g.fillRect(-214, 10, 436, 100);
  g.fillStyle(0x5a3a22, 1);
  g.fillRect(-200, 14, 26, 96);
  g.fillRect(174, 14, 26, 96);
  g.fillStyle(0x8a5a33, 1);
  g.fillRoundedRect(-220, -6, 440, 26, 6);
  g.fillStyle(0xa36d40, 1);
  g.fillRect(-216, -6, 432, 6);
  // vice and a few tools
  g.fillStyle(0x6c7a89, 1);
  g.fillRect(-206, -30, 34, 24);
  g.fillRect(-196, -40, 14, 10);
  g.fillStyle(0xd9a441, 1);
  g.fillCircle(180, -12, 10);
}

export function drawDoor(g: G, ring: boolean): void {
  g.fillStyle(0x3d2412, 1);
  g.fillRoundedRect(-82, -192, 164, 384, { tl: 70, tr: 70, bl: 0, br: 0 });
  g.fillStyle(0x2e6b5a, 1);
  g.fillRoundedRect(-70, -180, 140, 372, { tl: 62, tr: 62, bl: 0, br: 0 });
  g.fillStyle(0xbfe3f5, 1);
  g.fillRoundedRect(-48, -160, 96, 110, { tl: 46, tr: 46, bl: 4, br: 4 });
  g.lineStyle(4, 0x2e6b5a, 1);
  g.lineBetween(0, -160, 0, -50);
  g.lineBetween(-48, -105, 48, -105);
  g.fillStyle(0x27594b, 1);
  g.fillRect(-50, -20, 100, 80);
  g.fillRect(-50, 80, 100, 90);
  g.fillStyle(0xd9a441, 1);
  g.fillCircle(50, 30, 9);
  // "open" sign
  g.fillStyle(0xf3e2bd, 1);
  g.fillRoundedRect(-36, -40, 72, 26, 6);
  g.fillStyle(0x2e9b5f, 1);
  g.fillCircle(-22, -27, 6);
  // doorbell
  g.fillStyle(0xd9a441, 1);
  g.fillTriangle(-14, -212, 14, -212, 0, -236);
  g.fillCircle(0, -208, 14);
  g.fillStyle(0x8a5f17, 1);
  g.fillCircle(0, -196, 4);
  if (ring) {
    g.lineStyle(3, 0xffe48a, 0.9);
    g.beginPath();
    g.arc(0, -212, 26, -2.6, -0.5);
    g.strokePath();
    g.beginPath();
    g.arc(0, -212, 36, -2.6, -0.5);
    g.strokePath();
  }
}

export function drawCorkBoard(g: G, w: number, h: number): void {
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 8);
  g.fillStyle(0x6e4527, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
  g.fillStyle(0xc89a62, 1);
  g.fillRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 4);
  const rng = mulberry32(3);
  g.fillStyle(0x9c7444, 0.6);
  for (let i = 0; i < 60; i++) g.fillCircle(-w / 2 + 14 + rng() * (w - 28), -h / 2 + 14 + rng() * (h - 28), 1.5);
}

export function drawShelfBoards(g: G, w: number): void {
  for (const y of [-50, 50]) {
    g.fillStyle(0x000000, 0.25);
    g.fillRect(-w / 2 + 4, y + 4, w, 14);
    g.fillStyle(0x4a2d18, 1);
    g.fillRect(-w / 2, y, w, 14);
    g.fillStyle(0x6e4527, 1);
    g.fillRect(-w / 2, y, w, 4);
    g.fillStyle(0x3d2412, 1);
    g.fillTriangle(-w / 2 + 20, y + 14, -w / 2 + 20, y + 40, -w / 2 + 46, y + 14);
    g.fillTriangle(w / 2 - 20, y + 14, w / 2 - 20, y + 40, w / 2 - 46, y + 14);
  }
}

export function drawPegboard(g: G, w: number, h: number): void {
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 8);
  g.fillStyle(0xb98b55, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
  g.fillStyle(0x6e4527, 1);
  for (let x = -w / 2 + 20; x < w / 2; x += 26) for (let y = -h / 2 + 20; y < h / 2; y += 26) g.fillCircle(x, y, 3);
  // a hammer and a spanner hanging up
  g.fillStyle(0x6c7a89, 1);
  g.fillRect(-w / 2 + 30, -h / 2 + 26, 50, 16);
  g.fillStyle(0x8a5a33, 1);
  g.fillRect(-w / 2 + 50, -h / 2 + 40, 10, 70);
  g.fillStyle(0x9aa6b4, 1);
  g.fillRect(w / 2 - 60, -h / 2 + 30, 12, 80);
  g.fillCircle(w / 2 - 54, -h / 2 + 30, 14);
  g.fillStyle(0xb98b55, 1);
  g.fillCircle(w / 2 - 54, -h / 2 + 24, 7);
}

export function drawWindow(g: G, night: boolean, town: number): void {
  g.fillStyle(0x3d2412, 1);
  g.fillRect(-170, -130, 340, 260);
  g.fillStyle(night ? 0x16224a : 0xbfe3f5, 1);
  g.fillRect(-156, -116, 312, 232);
  // little rooftops of Brasswick, more lit the more is fixed
  const rng = mulberry32(11);
  for (let i = 0; i < 7; i++) {
    const x = -150 + i * 44;
    const h = 40 + rng() * 60;
    g.fillStyle(night ? 0x2b2b48 : [0xe8c39e, 0xd6e4f0, 0xf2d0a9, 0xcfe3c4][i % 4], 1);
    g.fillRect(x, 116 - h, 38, h);
    g.fillStyle(night ? 0x1d1d33 : [0xa0522d, 0x5a7d9a, 0x8e3b46, 0x5a8f3c][i % 4], 1);
    g.fillTriangle(x - 4, 116 - h, x + 19, 116 - h - 22, x + 42, 116 - h);
    if (i < town) {
      g.fillStyle(0xffd76a, 1);
      g.fillRect(x + 12, 116 - h + 14, 12, 12);
    }
  }
  // clock tower
  g.fillStyle(night ? 0x34344f : 0x9a8f86, 1);
  g.fillRect(90, -100, 40, 216);
  g.fillStyle(0xf6ead0, 1);
  g.fillCircle(110, -70, 14);
  g.fillStyle(0x6e4527, 1);
  g.fillRect(-170, -6, 340, 10);
  g.fillRect(-5, -130, 10, 260);
  // seat and cushion
  g.fillStyle(0x5e3a20, 1);
  g.fillRect(-180, 130, 360, 26);
  g.fillStyle(0xc0504d, 1);
  g.fillRoundedRect(-160, 110, 320, 28, 12);
}

export function drawPaintStation(g: G): void {
  g.fillStyle(0x5a3a22, 1);
  g.fillRect(-46, -10, 92, 100);
  g.fillStyle(0x8a5a33, 1);
  g.fillRect(-54, -18, 108, 12);
  const cols = [0xd64541, 0x3463b5, 0xf1c40f, 0x2e9b5f];
  cols.forEach((c, i) => {
    const x = -36 + i * 24;
    g.fillStyle(0xc9d1d9, 1);
    g.fillRect(x - 9, -44, 18, 26);
    g.fillStyle(c, 1);
    g.fillRect(x - 9, -48, 18, 8);
  });
  // brush and polishing cloth
  g.fillStyle(0x8a5a33, 1);
  g.fillRect(30, -86, 6, 44);
  g.fillStyle(0xe8913a, 1);
  g.fillRoundedRect(26, -98, 14, 16, 4);
  g.fillStyle(0xfff3bf, 1);
  g.fillRoundedRect(-44, 20, 40, 26, 8);
}

export function drawDrawers(g: G): void {
  g.fillStyle(0x000000, 0.25);
  g.fillRect(-100, -94, 208, 196);
  g.fillStyle(0x5a3a22, 1);
  g.fillRect(-104, -100, 208, 196);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const x = -94 + c * 64;
      const y = -90 + r * 46;
      g.fillStyle(0x8a5a33, 1);
      g.fillRect(x, y, 60, 40);
      g.fillStyle(0xf3e2bd, 1);
      g.fillRect(x + 18, y + 8, 24, 10);
      g.fillStyle(0xd9a441, 1);
      g.fillCircle(x + 30, y + 28, 4);
    }
  }
}

/** Kip's Nook grows: matchbox → tin-can cottage → clockwork house (GDD §13.1). */
export function drawNookHome(g: G, level: number): void {
  if (level === 0) {
    g.fillStyle(0xd64541, 1);
    g.fillRect(-60, -20, 120, 44);
    g.fillStyle(0xf3e2bd, 1);
    g.fillRect(-52, -14, 104, 32);
    g.fillStyle(0x6c4a8f, 1);
    g.fillRoundedRect(-44, -10, 70, 20, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(30, -2, 10);
  } else if (level === 1) {
    g.fillStyle(0xadb5bd, 1);
    g.fillRoundedRect(-56, -60, 112, 88, 10);
    g.lineStyle(2, 0x868e96, 1);
    for (let y = -50; y < 26; y += 10) g.lineBetween(-56, y, 56, y);
    g.fillStyle(0xd64541, 1);
    g.fillTriangle(-66, -56, 0, -96, 66, -56);
    g.fillStyle(0x5a3a22, 1);
    g.fillRoundedRect(-14, -14, 28, 42, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(0xffd76a, 1);
    g.fillCircle(32, -30, 10);
  } else {
    g.fillStyle(0xd9a441, 1);
    g.fillRect(-64, -70, 128, 98);
    g.fillStyle(0x8a5f17, 1);
    g.fillTriangle(-74, -66, 0, -116, 74, -66);
    g.fillStyle(0xf6ead0, 1);
    g.fillCircle(0, -78, 14);
    g.lineStyle(3, 0x2b1d14, 1);
    g.lineBetween(0, -78, 0, -88);
    g.lineBetween(0, -78, 8, -78);
    g.fillStyle(0x5a3a22, 1);
    g.fillRoundedRect(-16, -18, 32, 46, { tl: 16, tr: 16, bl: 0, br: 0 });
    g.fillStyle(0xffd76a, 1);
    g.fillRect(-52, -50, 24, 22);
    g.fillRect(28, -50, 24, 22);
  }
}

export function drawBasket(g: G): void {
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(0, 38, 150, 24);
  // things poking out
  g.fillStyle(0xd9a441, 1);
  g.fillCircle(-30, -30, 18);
  g.fillStyle(0xe64980, 1);
  g.fillRoundedRect(4, -46, 30, 30, 6);
  g.fillStyle(0x74c0fc, 1);
  g.fillCircle(36, -24, 14);
  g.fillStyle(0xb5803f, 1);
  g.fillRoundedRect(-66, -20, 132, 56, 14);
  g.lineStyle(3, 0x8a5a33, 1);
  for (let x = -56; x < 66; x += 14) g.lineBetween(x, -18, x + 6, 34);
  g.lineBetween(-64, 0, 64, 0);
  g.lineBetween(-62, 18, 62, 18);
  g.lineStyle(6, 0x8a5a33, 1);
  g.beginPath();
  g.arc(0, -20, 54, Math.PI, 0);
  g.strokePath();
}

export function drawHatch(g: G, open: boolean): void {
  g.fillStyle(0x2b1d14, 1);
  g.fillRect(-80, -10, 160, 30);
  if (open) {
    g.fillStyle(0x0f1a33, 1);
    g.fillRect(-72, -4, 144, 22);
    g.fillStyle(0xfff3bf, 0.8);
    g.fillCircle(30, 6, 6);
    // ladder
    g.lineStyle(5, 0x8a5a33, 1);
    g.lineBetween(-40, 18, -50, 110);
    g.lineBetween(40, 18, 50, 110);
    for (let y = 34; y < 110; y += 20) g.lineBetween(-42 - (y - 18) * 0.1, y, 42 + (y - 18) * 0.1, y);
  } else {
    g.fillStyle(0x6e4527, 1);
    g.fillRect(-72, -4, 144, 22);
    g.lineStyle(2, 0x3d2412, 1);
    g.lineBetween(-24, -4, -24, 18);
    g.lineBetween(24, -4, 24, 18);
    // pull cord
    g.lineStyle(2, 0xf3e2bd, 1);
    g.lineBetween(50, 18, 50, 70);
    g.fillStyle(0xd9a441, 1);
    g.fillCircle(50, 74, 6);
  }
}

export function drawPadlock(g: G, x: number, y: number, s = 1): void {
  g.lineStyle(5 * s, 0x6c757d, 1);
  g.beginPath();
  g.arc(x, y - 8 * s, 11 * s, Math.PI, 0);
  g.strokePath();
  g.fillStyle(0xadb5bd, 1);
  g.fillRoundedRect(x - 16 * s, y - 8 * s, 32 * s, 26 * s, 5 * s);
  g.fillStyle(0x495057, 1);
  g.fillCircle(x, y + 3 * s, 4 * s);
}

export function drawClosedSign(g: G): void {
  g.lineStyle(3, 0x8a5a33, 1);
  g.lineBetween(-60, -90, 0, -130);
  g.lineBetween(60, -90, 0, -130);
  g.fillStyle(0x2b1d14, 1);
  g.fillRoundedRect(-150, -90, 300, 150, 18);
  g.fillStyle(0xf3e2bd, 1);
  g.fillRoundedRect(-140, -80, 280, 130, 14);
  // a sleepy moon and stars: "closed" without words
  g.fillStyle(0xffd43b, 1);
  g.fillCircle(-40, -16, 40);
  g.fillStyle(0xf3e2bd, 1);
  g.fillCircle(-22, -30, 36);
  g.fillStyle(0xffd43b, 1);
  for (const [sx, sy] of [
    [40, -40],
    [80, 0],
    [50, 30],
  ])
    g.fillCircle(sx, sy, 6);
}
