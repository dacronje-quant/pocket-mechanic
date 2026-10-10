/**
 * The Tick & Tinker shop hub, drawn in code (GDD §13.1). Each piece is drawn
 * around (0, 0) so the hub can put it in a container and make it bounce.
 */
import Phaser from 'phaser';
import { mulberry32 } from '../mechanism/rng';
import { CM, drawCopperPipe, drawLeafSprig, drawPatina, drawTimber } from './copperMoss';

type G = Phaser.GameObjects.Graphics;

export function drawShopWall(g: G, night: boolean): void {
  const rng = mulberry32(7);
  g.fillGradientStyle(CM.paperDark, CM.paper, CM.paperDark, CM.paperDark, 1);
  g.fillRect(0, 0, 1280, 720);
  // Faded botanical wallpaper, much older than the new leaves growing over it.
  for (let y = 30; y < 555; y += 54) for (let x = 27 + (y % 2) * 23; x < 1280; x += 61) {
    g.lineStyle(0.7, CM.mossDark, 0.13);
    g.lineBetween(x, y, x + 2, y + 26);
    g.strokeEllipse(x - 4, y + 7, 12, 7);
    g.strokeEllipse(x + 6, y + 17, 11, 7);
  }
  drawPatina(g, 0, 25, 1280, 535, 41, 1.4);
  // Irregular reclaimed timber supports; individual grain stays visible.
  for (const x of [0, 427, 1239]) drawTimber(g, x, 18, 37, 585, x + 17, CM.woodDark);
  drawTimber(g, 0, 14, 1280, 26, 38, CM.woodDark);
  drawCopperPipe(g, [[466, 28], [466, 208], [431, 208], [431, 410]], 8);
  for (const [x, y] of [[450, 64], [450, 324]]) {
    g.fillStyle(CM.copper, 1);
    g.fillEllipse(x, y, 18, 9);
    g.lineStyle(0.8, CM.ink, 0.8);
    g.strokeEllipse(x, y, 18, 9);
  }
  g.fillStyle(CM.woodDark, 1);
  g.fillRect(0, 560, 1280, 50);
  for (let x = 0; x < 1280; x += 64) drawTimber(g, x, 564, 64, 45, x, CM.wood);
  drawTimber(g, 0, 554, 1280, 12, 9, CM.woodDark);
  for (let y = 610; y < 720; y += 23) drawTimber(g, 0, y, 1280, 22, y, CM.wood);
  // Pencils, scribbled pinned repair notes, and leafy branches frame the room.
  for (const [x, y] of [[500, 107], [744, 152]]) {
    g.fillStyle(CM.paper, 0.85);
    g.fillPoints([new Phaser.Math.Vector2(x, y), new Phaser.Math.Vector2(x + 62, y - 3), new Phaser.Math.Vector2(x + 59, y + 73), new Phaser.Math.Vector2(x - 2, y + 70)], true);
    g.lineStyle(0.7, CM.ink, 0.2);
    for (let line = 0; line < 6; line++) g.lineBetween(x + 8, y + 17 + line * 7, x + 25 + rng() * 26, y + 16 + line * 7);
    g.fillStyle(CM.copperDark, 1);
    g.fillCircle(x + 28, y + 3, 2.5);
  }
  drawLeafSprig(g, 410, 24, 238, 7, 0.9);
  drawLeafSprig(g, 1222, 34, 266, 11, 1);
  drawLeafSprig(g, 1150, 31, 130, 13, 0.9);
  g.fillStyle(CM.glow, night ? 0.12 : 0.055);
  g.fillCircle(640, 300, 380);
  if (night) {
    g.fillStyle(CM.tealDark, 0.33);
    g.fillRect(0, 0, 1280, 720);
  }
}

export function drawWorkbench(g: G): void {
  g.fillStyle(CM.ink, 0.25);
  g.fillRect(-214, 10, 436, 100);
  drawTimber(g, -200, 14, 29, 96, 10, CM.woodDark);
  drawTimber(g, 171, 14, 29, 96, 11, CM.woodDark);
  drawTimber(g, -206, 60, 410, 14, 12, CM.wood);
  drawTimber(g, -220, -6, 440, 26, 13, CM.woodLight);
  g.fillStyle(CM.teal, 0.65);
  g.fillPoints([new Phaser.Math.Vector2(-143, -7), new Phaser.Math.Vector2(112, -6), new Phaser.Math.Vector2(102, 10), new Phaser.Math.Vector2(-134, 7)], true);
  drawPatina(g, -140, -5, 245, 11, 16, 2);
  for (const x of [-208, 181]) {
    g.fillStyle(CM.copperDark, 1);
    g.fillRect(x, -5, 23, 35);
    g.lineStyle(0.9, CM.ink, 0.8);
    g.strokeRect(x, -5, 23, 35);
    for (const yy of [1, 23]) {
      g.fillStyle(CM.brass, 1);
      g.fillCircle(x + 11, yy, 2.4);
    }
  }
  // vice and a few tools
  g.fillStyle(CM.slate, 1);
  g.fillRect(-206, -30, 34, 24);
  g.fillRect(-196, -40, 14, 10);
  g.fillStyle(CM.brass, 1);
  g.fillCircle(180, -12, 10);
  g.lineStyle(1, CM.ink, 0.6);
  g.strokeCircle(180, -12, 10);
  g.strokeCircle(180, -12, 3);
  // Etched pencil marks and chipped paint belong to a table used for decades.
  g.lineStyle(0.7, CM.ink, 0.25);
  for (const x of [-108, -29, 65]) g.lineBetween(x, 1, x + 24, -1);
  drawLeafSprig(g, -208, 23, 44, 3, 0.6);
}

export function drawDoor(g: G, ring: boolean): void {
  g.fillStyle(CM.ink, 1);
  g.fillRoundedRect(-82, -192, 164, 384, { tl: 70, tr: 70, bl: 0, br: 0 });
  g.fillStyle(CM.teal, 1);
  g.fillRoundedRect(-70, -180, 140, 372, { tl: 62, tr: 62, bl: 0, br: 0 });
  g.lineStyle(1.5, CM.ink, 0.85);
  g.strokeRoundedRect(-70, -180, 140, 372, { tl: 62, tr: 62, bl: 0, br: 0 });
  g.fillStyle(CM.sky, 1);
  g.fillRoundedRect(-48, -160, 96, 110, { tl: 46, tr: 46, bl: 4, br: 4 });
  g.lineStyle(4, CM.teal, 1);
  g.lineBetween(0, -160, 0, -50);
  g.lineBetween(-48, -105, 48, -105);
  g.fillStyle(CM.tealDark, 1);
  g.fillRect(-50, -20, 100, 80);
  g.fillRect(-50, 80, 100, 90);
  g.lineStyle(1, CM.copperLight, 0.32);
  g.strokeRect(-49, -19, 98, 78);
  g.strokeRect(-49, 81, 98, 87);
  drawPatina(g, -63, -35, 126, 218, 622, 2.5);
  g.lineStyle(0.8, CM.ink, 0.28);
  for (const x of [-57, -25, 26, 58]) g.lineBetween(x, -33, x + 1, 181);
  for (const yy of [-24, 79, 168]) {
    g.fillStyle(CM.copperDark, 1);
    g.fillRect(-76, yy, 15, 13);
    g.fillStyle(CM.brass, 1);
    g.fillCircle(-70, yy + 6, 1.8);
  }
  g.fillStyle(CM.brass, 1);
  g.fillCircle(50, 30, 9);
  // "open" sign
  g.fillStyle(CM.paper, 1);
  g.fillRoundedRect(-36, -40, 72, 26, 6);
  g.fillStyle(CM.moss, 1);
  g.fillCircle(-22, -27, 6);
  // doorbell
  g.fillStyle(CM.brass, 1);
  g.fillTriangle(-14, -212, 14, -212, 0, -236);
  g.fillCircle(0, -208, 14);
  g.fillStyle(CM.copperDark, 1);
  g.fillCircle(0, -196, 4);
  drawLeafSprig(g, -69, -169, 105, 49, 0.7);
  if (ring) {
    g.lineStyle(3, CM.glow, 0.9);
    g.beginPath();
    g.arc(0, -212, 26, -2.6, -0.5);
    g.strokePath();
    g.beginPath();
    g.arc(0, -212, 36, -2.6, -0.5);
    g.strokePath();
  }
}

export function drawCorkBoard(g: G, w: number, h: number): void {
  g.fillStyle(CM.ink, 0.25);
  g.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 8);
  g.fillStyle(CM.wood, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
  g.fillStyle(CM.paperDark, 1);
  g.fillRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 4);
  const rng = mulberry32(3);
  g.fillStyle(CM.woodLight, 0.6);
  for (let i = 0; i < 60; i++) g.fillCircle(-w / 2 + 14 + rng() * (w - 28), -h / 2 + 14 + rng() * (h - 28), 1.5);
  drawPatina(g, -w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 24, 1.5);
  for (const x of [-w / 2 + 5, w / 2 - 5]) for (const y of [-h / 2 + 5, h / 2 - 5]) {
    g.fillStyle(CM.copperLight, 1);
    g.fillCircle(x, y, 2.3);
    g.lineStyle(0.7, CM.ink, 0.8);
    g.lineBetween(x - 1, y - 1, x + 1, y + 1);
  }
}

export function drawShelfBoards(g: G, w: number): void {
  for (const y of [-50, 50]) {
    g.fillStyle(CM.ink, 0.25);
    g.fillRect(-w / 2 + 4, y + 4, w, 14);
    drawTimber(g, -w / 2, y, w, 14, y + w, CM.wood);
    g.fillStyle(CM.ink, 1);
    g.fillTriangle(-w / 2 + 20, y + 14, -w / 2 + 20, y + 40, -w / 2 + 46, y + 14);
    g.fillTriangle(w / 2 - 20, y + 14, w / 2 - 20, y + 40, w / 2 - 46, y + 14);
  }
  drawLeafSprig(g, w / 2 - 8, -51, 102, 20, 0.65);
}

export function drawPegboard(g: G, w: number, h: number): void {
  g.fillStyle(CM.ink, 0.25);
  g.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 8);
  g.fillStyle(CM.paperDark, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
  g.lineStyle(1.3, CM.ink, 0.8);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  drawPatina(g, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 601, 1);
  g.fillStyle(CM.wood, 1);
  for (let x = -w / 2 + 20; x < w / 2; x += 26) for (let y = -h / 2 + 20; y < h / 2; y += 26) g.fillCircle(x, y, 3);
  // a hammer and a spanner hanging up
  g.fillStyle(CM.slate, 1);
  g.fillRect(-w / 2 + 30, -h / 2 + 26, 50, 16);
  g.fillStyle(CM.wood, 1);
  g.fillRect(-w / 2 + 50, -h / 2 + 40, 10, 70);
  g.fillStyle(CM.tealLight, 1);
  g.fillRect(w / 2 - 60, -h / 2 + 30, 12, 80);
  g.fillCircle(w / 2 - 54, -h / 2 + 30, 14);
  g.fillStyle(CM.paperDark, 1);
  g.fillCircle(w / 2 - 54, -h / 2 + 24, 7);
  g.lineStyle(0.8, CM.ink, 0.7);
  g.strokeRect(-w / 2 + 30, -h / 2 + 26, 50, 16);
  g.lineBetween(w / 2 - 60, -h / 2 + 40, w / 2 - 60, -h / 2 + 109);
  drawLeafSprig(g, w / 2 - 5, -h / 2 + 12, 58, 81, 0.7);
}

export function drawWindow(g: G, night: boolean, town: number): void {
  g.fillStyle(CM.ink, 1);
  g.fillRect(-170, -130, 340, 260);
  g.fillStyle(night ? CM.tealDark : CM.sky, 1);
  g.fillRect(-156, -116, 312, 232);
  g.fillStyle(CM.paper, night ? 0.05 : 0.32);
  g.fillEllipse(-50, -54, 180, 27);
  g.fillEllipse(65, -78, 110, 25);
  // little rooftops of Brasswick, more lit the more is fixed
  const rng = mulberry32(11);
  for (let i = 0; i < 7; i++) {
    const x = -150 + i * 44;
    const h = 40 + rng() * 60;
    g.fillStyle(night ? CM.slate : [CM.paperDark, CM.sky, CM.copperLight, CM.mossLight][i % 4], 1);
    g.fillRect(x, 116 - h, 38, h);
    g.fillStyle(night ? CM.tealDark : [CM.copperDark, CM.teal, CM.woodDark, CM.mossDark][i % 4], 1);
    g.fillTriangle(x - 4, 116 - h, x + 19, 116 - h - 22, x + 42, 116 - h);
    g.lineStyle(0.7, CM.ink, 0.5);
    g.lineBetween(x - 4, 116 - h, x + 19, 116 - h - 22);
    g.lineBetween(x + 19, 116 - h - 22, x + 42, 116 - h);
    drawPatina(g, x + 1, 117 - h, 36, h - 2, i + 210, 0.7);
    if (i < town) {
      g.fillStyle(CM.glow, 1);
      g.fillRect(x + 12, 116 - h + 14, 12, 12);
    }
  }
  // clock tower
  g.fillStyle(night ? CM.slate : CM.slate, 1);
  g.fillRect(90, -100, 40, 216);
  g.fillStyle(CM.paper, 1);
  g.fillCircle(110, -70, 14);
  g.fillStyle(CM.wood, 1);
  g.fillRect(-170, -6, 340, 10);
  g.fillRect(-5, -130, 10, 260);
  drawTimber(g, -170, -133, 340, 13, 305, CM.woodDark);
  drawTimber(g, -170, -133, 13, 270, 306, CM.woodDark);
  drawTimber(g, 157, -133, 13, 270, 307, CM.woodDark);
  // seat and cushion
  g.fillStyle(CM.woodDark, 1);
  g.fillRect(-180, 130, 360, 26);
  g.fillStyle(CM.moss, 1);
  g.fillRoundedRect(-160, 110, 320, 28, 12);
  g.lineStyle(1, CM.ink, 0.6);
  g.strokeRoundedRect(-160, 110, 320, 28, 12);
  g.lineStyle(0.7, CM.paper, 0.2);
  for (let x = -143; x < 149; x += 9) g.lineBetween(x, 117, x + 3, 132);
  drawLeafSprig(g, -161, -124, 93, 42, 0.8);
  drawLeafSprig(g, 152, -125, 172, 49, 0.75);
  drawLeafSprig(g, 86, -128, 52, 44, 0.8);
}

export function drawPaintStation(g: G): void {
  drawTimber(g, -46, -10, 92, 100, 16, CM.woodDark);
  drawTimber(g, -54, -18, 108, 12, 17, CM.wood);
  const cols = [CM.copperDark, CM.teal, CM.brass, CM.moss];
  cols.forEach((c, i) => {
    const x = -36 + i * 24;
    g.fillStyle(CM.paperDark, 1);
    g.fillRect(x - 9, -44, 18, 26);
    g.fillStyle(c, 1);
    g.fillRect(x - 9, -48, 18, 8);
    g.lineStyle(0.8, CM.ink, 0.8);
    g.strokeRect(x - 9, -44, 18, 26);
    g.fillStyle(CM.paper, 0.8);
    g.fillRect(x - 6, -34, 12, 10);
    g.fillStyle(c, 0.8);
    g.fillCircle(x, -29, 2.5);
  });
  // brush and polishing cloth
  g.fillStyle(CM.wood, 1);
  g.fillRect(30, -86, 6, 44);
  g.fillStyle(CM.copper, 1);
  g.fillRoundedRect(26, -98, 14, 16, 4);
  g.fillStyle(CM.cream, 1);
  g.fillRoundedRect(-44, 20, 40, 26, 8);
  drawPatina(g, -40, 24, 32, 18, 523, 2);
  drawLeafSprig(g, 40, 30, 54, 35, 0.6);
}

export function drawDrawers(g: G): void {
  g.fillStyle(CM.ink, 0.25);
  g.fillRect(-100, -94, 208, 196);
  drawTimber(g, -104, -100, 208, 196, 28, CM.woodDark);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const x = -94 + c * 64;
      const y = -90 + r * 46;
      g.fillStyle(CM.wood, 1);
      g.fillRect(x, y, 60, 40);
      g.lineStyle(0.8, CM.ink, 0.75);
      g.strokeRect(x, y, 60, 40);
      drawPatina(g, x + 2, y + 2, 56, 36, r * 31 + c, 1.6);
      g.fillStyle(CM.paper, 1);
      g.fillRect(x + 18, y + 8, 24, 10);
      g.lineStyle(0.7, CM.inkSoft, 0.65);
      g.lineBetween(x + 22, y + 12, x + 34 + ((r + c) % 3) * 2, y + 12);
      g.fillStyle(CM.brass, 1);
      g.fillCircle(x + 30, y + 28, 4);
      g.lineStyle(0.7, CM.ink, 0.6);
      g.strokeCircle(x + 30, y + 28, 4);
    }
  }
  drawLeafSprig(g, -96, -104, 85, 625, 0.65);
}

/** Kip's Nook grows: matchbox → tin-can cottage → clockwork house (GDD §13.1). */
export function drawNookHome(g: G, level: number): void {
  if (level === 0) {
    g.fillStyle(CM.copperDark, 1);
    g.fillRect(-60, -20, 120, 44);
    g.fillStyle(CM.paper, 1);
    g.fillRect(-52, -14, 104, 32);
    g.fillStyle(CM.moss, 1);
    g.fillRoundedRect(-44, -10, 70, 20, 8);
    g.fillStyle(CM.cream, 1);
    g.fillCircle(30, -2, 10);
    drawPatina(g, -51, -14, 101, 30, 720, 2);
    g.lineStyle(0.8, CM.ink, 0.75);
    g.strokeRect(-60, -20, 120, 44);
  } else if (level === 1) {
    g.fillStyle(CM.tealLight, 1);
    g.fillRoundedRect(-56, -60, 112, 88, 10);
    g.lineStyle(2, CM.slate, 1);
    for (let y = -50; y < 26; y += 10) g.lineBetween(-56, y, 56, y);
    g.fillStyle(CM.copperDark, 1);
    g.fillTriangle(-66, -56, 0, -96, 66, -56);
    g.fillStyle(CM.woodDark, 1);
    g.fillRoundedRect(-14, -14, 28, 42, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(CM.glow, 1);
    g.fillCircle(32, -30, 10);
    drawPatina(g, -54, -54, 106, 79, 721, 2);
    g.lineStyle(1, CM.ink, 0.65);
    g.strokeRoundedRect(-56, -60, 112, 88, 10);
  } else {
    g.fillStyle(CM.brass, 1);
    g.fillRect(-64, -70, 128, 98);
    g.fillStyle(CM.copperDark, 1);
    g.fillTriangle(-74, -66, 0, -116, 74, -66);
    g.fillStyle(CM.paper, 1);
    g.fillCircle(0, -78, 14);
    g.lineStyle(3, CM.ink, 1);
    g.lineBetween(0, -78, 0, -88);
    g.lineBetween(0, -78, 8, -78);
    g.fillStyle(CM.woodDark, 1);
    g.fillRoundedRect(-16, -18, 32, 46, { tl: 16, tr: 16, bl: 0, br: 0 });
    g.fillStyle(CM.glow, 1);
    g.fillRect(-52, -50, 24, 22);
    g.fillRect(28, -50, 24, 22);
    drawPatina(g, -61, -67, 122, 92, 722, 1.4);
    g.lineStyle(1, CM.ink, 0.7);
    g.strokeRect(-64, -70, 128, 98);
    g.lineBetween(-74, -66, 0, -116);
    g.lineBetween(0, -116, 74, -66);
  }
  drawLeafSprig(g, -51, level === 0 ? -17 : -57, level === 0 ? 26 : 61, 729, 0.55);
}

export function drawBasket(g: G): void {
  g.fillStyle(CM.ink, 0.2);
  g.fillEllipse(0, 38, 150, 24);
  // things poking out
  g.fillStyle(CM.brass, 1);
  g.fillCircle(-30, -30, 18);
  g.fillStyle(CM.copper, 1);
  g.fillRoundedRect(4, -46, 30, 30, 6);
  g.fillStyle(CM.tealLight, 1);
  g.fillCircle(36, -24, 14);
  g.fillStyle(CM.woodLight, 1);
  g.fillRoundedRect(-66, -20, 132, 56, 14);
  g.lineStyle(1, CM.ink, 0.75);
  g.strokeRoundedRect(-66, -20, 132, 56, 14);
  g.lineStyle(3, CM.wood, 1);
  for (let x = -56; x < 66; x += 14) g.lineBetween(x, -18, x + 6, 34);
  g.lineBetween(-64, 0, 64, 0);
  g.lineBetween(-62, 18, 62, 18);
  drawPatina(g, -58, -14, 116, 45, 414, 1.3);
  g.lineStyle(6, CM.wood, 1);
  g.beginPath();
  g.arc(0, -20, 54, Math.PI, 0);
  g.strokePath();
  drawLeafSprig(g, 43, -12, 37, 115, 0.6);
}

export function drawHatch(g: G, open: boolean): void {
  g.fillStyle(CM.ink, 1);
  g.fillRect(-80, -10, 160, 30);
  if (open) {
    g.fillStyle(CM.tealDark, 1);
    g.fillRect(-72, -4, 144, 22);
    g.fillStyle(CM.cream, 0.8);
    g.fillCircle(30, 6, 6);
    // ladder
    g.lineStyle(5, CM.wood, 1);
    g.lineBetween(-40, 18, -50, 110);
    g.lineBetween(40, 18, 50, 110);
    for (let y = 34; y < 110; y += 20) g.lineBetween(-42 - (y - 18) * 0.1, y, 42 + (y - 18) * 0.1, y);
  } else {
    drawTimber(g, -72, -4, 144, 22, 631, CM.wood);
    g.lineStyle(2, CM.ink, 1);
    g.lineBetween(-24, -4, -24, 18);
    g.lineBetween(24, -4, 24, 18);
    // pull cord
    g.lineStyle(2, CM.paper, 1);
    g.lineBetween(50, 18, 50, 70);
    g.fillStyle(CM.brass, 1);
    g.fillCircle(50, 74, 6);
  }
}

export function drawPadlock(g: G, x: number, y: number, s = 1): void {
  g.lineStyle(5 * s, CM.slate, 1);
  g.beginPath();
  g.arc(x, y - 8 * s, 11 * s, Math.PI, 0);
  g.strokePath();
  g.fillStyle(CM.tealLight, 1);
  g.fillRoundedRect(x - 16 * s, y - 8 * s, 32 * s, 26 * s, 5 * s);
  g.lineStyle(s, CM.ink, 0.75);
  g.strokeRoundedRect(x - 16 * s, y - 8 * s, 32 * s, 26 * s, 5 * s);
  drawPatina(g, x - 13 * s, y - 5 * s, 26 * s, 20 * s, 829, 3);
  g.fillStyle(CM.inkSoft, 1);
  g.fillCircle(x, y + 3 * s, 4 * s);
}

export function drawClosedSign(g: G): void {
  g.lineStyle(3, CM.wood, 1);
  g.lineBetween(-60, -90, 0, -130);
  g.lineBetween(60, -90, 0, -130);
  g.fillStyle(CM.ink, 1);
  g.fillRoundedRect(-150, -90, 300, 150, 18);
  g.fillStyle(CM.paper, 1);
  g.fillRoundedRect(-140, -80, 280, 130, 14);
  // a sleepy moon and stars: "closed" without words
  g.fillStyle(CM.brass, 1);
  g.fillCircle(-40, -16, 40);
  g.fillStyle(CM.paper, 1);
  g.fillCircle(-22, -30, 36);
  g.fillStyle(CM.brass, 1);
  for (const [sx, sy] of [
    [40, -40],
    [80, 0],
    [50, 30],
  ])
    g.fillCircle(sx, sy, 6);
  drawPatina(g, -134, -74, 268, 116, 945, 1.4);
  drawLeafSprig(g, -133, -75, 81, 84, 0.7);
}
