/**
 * The Window Seat (GDD §13.2): Brasswick on the map. The town's restoration is
 * the progress bar — each fixed object visibly works around town: smoke from
 * the bakery, music from Rosa's window, the toy train circling, the lighthouse
 * beam turning, steam from the café, Bertie dancing, stars over the school,
 * and the clock tower's hands moving again.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { withArt, coverImage } from '../art/generated';
import { badge } from '../art/portraits';
import { card } from '../ui/widgets';
import { REPAIRS } from '../content/repairs';
import type { RepairDef } from '../content/types';
import { repairDone, setFlag } from '../core/progress';
import { persist, profile } from '../core/save';
import { windDownActive } from '../core/session';
import { HUD, MetaScene } from './MetaScene';

interface Landmark {
  repair: number;
  x: number;
  y: number;
}

const LANDMARKS: Landmark[] = [
  { repair: 1, x: 250, y: 330 }, // bakery
  { repair: 2, x: 430, y: 250 }, // Rosa's house
  { repair: 3, x: 620, y: 360 }, // toy shop with the train
  { repair: 4, x: 1120, y: 300 }, // lighthouse on the harbour
  { repair: 5, x: 820, y: 250 }, // café
  { repair: 6, x: 360, y: 540 }, // fairground
  { repair: 7, x: 860, y: 520 }, // school
  { repair: 8, x: 640, y: 170 }, // clock tower
];

export class TownScene extends MetaScene {
  private live!: Phaser.GameObjects.Graphics;
  private t = 0;
  private night = false;

  constructor() {
    super('town');
  }

  protected build(): void {
    const p = profile();
    this.night = windDownActive();
    this.t = 0;
    this.drawMap();
    this.live = this.add.graphics().setDepth(20);
    LANDMARKS.forEach((l) => this.landmark(l, REPAIRS[l.repair - 1]));
    this.music('shop', Math.min(1, p.repairs.length / 8 + 0.2));
    this.backButton();
    if (setFlag(p, 'town')) persist();
    this.time.delayedCall(400, () => this.line('shop.window'));
  }

  private drawMap(): void {
    const g = this.add.graphics().setDepth(0);
    const n = this.night;
    g.fillGradientStyle(n ? 0x14204a : 0x8fd0f2, n ? 0x14204a : 0x8fd0f2, n ? 0x2c3e70 : 0xe6f6ff, n ? 0x2c3e70 : 0xe6f6ff, 1);
    g.fillRect(0, 0, 1280, 720);
    // hills and fields
    g.fillStyle(n ? 0x2d4a33 : 0x7cc36a, 1);
    g.fillEllipse(300, 720, 1100, 700);
    g.fillEllipse(1050, 740, 1000, 640);
    g.fillStyle(n ? 0x24402b : 0x6ab35a, 1);
    g.fillEllipse(640, 760, 1500, 560);
    // the sea and harbour
    g.fillStyle(n ? 0x1d3557 : 0x3a86c8, 1);
    g.fillRect(980, 340, 300, 380);
    g.fillStyle(n ? 0x264a73 : 0x5aa6e0, 1);
    for (let i = 0; i < 8; i++) g.fillEllipse(1040 + (i % 4) * 60, 400 + Math.floor(i / 4) * 140 + (i % 2) * 40, 40, 6);
    // river with a bridge
    g.lineStyle(34, n ? 0x1d3557 : 0x4a9ad8, 1);
    g.beginPath();
    g.moveTo(0, 470);
    g.lineTo(300, 440);
    g.lineTo(560, 470);
    g.lineTo(760, 430);
    g.lineTo(990, 450);
    g.strokePath();
    g.fillStyle(0x8a5a33, 1);
    g.fillRect(540, 440, 60, 50);
    // cobbled roads
    g.lineStyle(14, n ? 0x6b6157 : 0xd8c4a0, 1);
    g.lineBetween(250, 360, 640, 380);
    g.lineBetween(640, 380, 1100, 330);
    g.lineBetween(640, 380, 640, 200);
    g.lineBetween(640, 380, 360, 560);
    g.lineBetween(640, 380, 860, 550);
    g.lineBetween(430, 280, 640, 380);
    g.lineBetween(820, 280, 640, 380);
    // trees
    for (let i = 0; i < 26; i++) {
      const x = (i * 197) % 1240 + 20;
      const y = 600 + ((i * 53) % 110);
      g.fillStyle(0x5a3a22, 1);
      g.fillRect(x - 3, y, 6, 16);
      g.fillStyle(n ? 0x23502d : 0x3f9b4b, 1);
      g.fillCircle(x, y - 6, 16);
    }
    if (n) {
      g.fillStyle(0xffffff, 0.8);
      for (let i = 0; i < 50; i++) g.fillCircle((i * 233) % 1280, (i * 71) % 220, 1.4);
    }
    // the Tick & Tinker itself, with Kip waving from the window
    this.house(g, 520, 640, 90, 80, 0xf2d0a9, 0x8e3b46, true);
    badge(this, 565, 590, 'kip', 16).setDepth(3);
  }

  private house(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, col: number, roof: number, lit: boolean): void {
    g.fillStyle(this.night ? Phaser.Display.Color.ValueToColor(col).darken(45).color : col, 1);
    g.fillRect(x, y - h, w, h);
    g.fillStyle(roof, 1);
    g.fillTriangle(x - 10, y - h, x + w / 2, y - h - w * 0.45, x + w + 10, y - h);
    g.fillStyle(lit ? 0xffd76a : 0x3a4a6a, 1);
    g.fillRect(x + w * 0.18, y - h * 0.72, w * 0.24, h * 0.26);
    g.fillRect(x + w * 0.58, y - h * 0.72, w * 0.24, h * 0.26);
    g.fillStyle(0x5a3a22, 1);
    g.fillRect(x + w * 0.4, y - h * 0.38, w * 0.2, h * 0.38);
  }

  private landmark(l: Landmark, r: RepairDef): void {
    const fixed = repairDone(profile(), r.id);
    const g = this.add.graphics().setDepth(10);
    const lit = fixed;
    switch (r.id) {
      case 1:
        this.house(g, l.x - 60, l.y + 40, 120, 90, 0xf6d7a7, 0xa0522d, lit);
        g.fillStyle(0x6b4a2a, 1);
        g.fillRect(l.x + 20, l.y - 80, 18, 40);
        break;
      case 2:
        this.house(g, l.x - 45, l.y + 40, 90, 100, 0xf9c5d1, 0x8e3b46, lit);
        break;
      case 3:
        this.house(g, l.x - 60, l.y + 40, 120, 80, 0xd6e4f0, 0x5a7d9a, lit);
        g.lineStyle(3, 0x8a5a33, 1);
        g.strokeEllipse(l.x, l.y + 60, 160, 36);
        break;
      case 4:
        g.fillStyle(0xffffff, 1);
        g.fillRect(l.x - 18, l.y - 80, 36, 140);
        g.fillStyle(0xd64541, 1);
        for (let k = 0; k < 3; k++) g.fillRect(l.x - 18, l.y - 60 + k * 44, 36, 16);
        g.fillStyle(lit ? 0xffd76a : 0x6c757d, 1);
        g.fillRect(l.x - 14, l.y - 104, 28, 24);
        g.fillStyle(0x2b2b33, 1);
        g.fillTriangle(l.x - 22, l.y - 104, l.x, l.y - 126, l.x + 22, l.y - 104);
        break;
      case 5:
        this.house(g, l.x - 60, l.y + 40, 120, 80, 0xd5f5e3, 0x2e9b5f, lit);
        g.fillStyle(0xfff6e2, 1);
        g.fillRect(l.x - 64, l.y - 10, 128, 10);
        break;
      case 6:
        g.fillStyle(0xff6b6b, 1);
        g.fillTriangle(l.x - 80, l.y + 30, l.x, l.y - 50, l.x + 80, l.y + 30);
        g.fillStyle(0xffd43b, 1);
        g.fillTriangle(l.x - 40, l.y + 30, l.x, l.y - 50, l.x + 40, l.y + 30);
        g.lineStyle(4, 0x8a5a33, 1);
        g.strokeCircle(l.x + 120, l.y - 10, 50);
        break;
      case 7:
        this.house(g, l.x - 70, l.y + 40, 140, 90, 0xe8c39e, 0x3463b5, lit);
        g.fillStyle(0x6c757d, 1);
        g.fillCircle(l.x, l.y - 52, 18);
        break;
      case 8:
        g.fillStyle(this.night ? 0x5a5550 : 0x9a8f86, 1);
        g.fillRect(l.x - 34, l.y - 110, 68, 190);
        g.fillStyle(0x6b6560, 1);
        g.fillTriangle(l.x - 44, l.y - 110, l.x, l.y - 160, l.x + 44, l.y - 110);
        g.fillStyle(0xf6ead0, 1);
        g.fillCircle(l.x, l.y - 70, 24);
        break;
    }
    if (!fixed) {
      g.setAlpha(0.75);
      const q = this.add.text(l.x, l.y - 30, '?', { fontFamily: 'Georgia, serif', fontSize: '40px', color: '#ffffff', stroke: '#2b1d14', strokeThickness: 6 }).setOrigin(0.5).setDepth(12);
      this.tweens.add({ targets: q, y: l.y - 40, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const z = this.add.zone(l.x, l.y, 170, 170).setInteractive({ useHandCursor: true }).setDepth(15);
    z.on('pointerup', () => this.visit(r, fixed));
    this.hot(`town${r.id}`, () => this.visit(r, fixed));
  }

  /** Tap a landmark: its owner says hello, and a postcard shows the object at home. */
  private visit(r: RepairDef, fixed: boolean): void {
    if (!fixed) {
      sfx.nuhUh();
      this.line('town.closed');
      return;
    }
    sfx.ding();
    this.bubble.say(r.tagline, { who: r.owner, id: `town.${r.key}` });
    withArt(this, `postcard-${r.key}`, (key) => {
      const c = this.add.container(640, 340).setDepth(HUD + 5).setAngle(-3).setScale(0.6).setAlpha(0);
      c.add(card(this, 0, 0, 520, 330, 0xfff6e2));
      c.add(coverImage(this, key, -245, -150, 490, 290));
      c.setSize(520, 330).setInteractive();
      c.on('pointerup', () => c.destroy());
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
      this.time.delayedCall(5000, () => c.active && this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() }));
    });
  }

  update(_t: number, dt: number): void {
    if (!this.live) return;
    this.t += dt / 1000;
    const t = this.t;
    const g = this.live;
    g.clear();
    const p = profile();
    for (const l of LANDMARKS) {
      if (!repairDone(p, l.repair)) continue;
      switch (l.repair) {
        case 1: // smoke from the bakery chimney
          for (let k = 0; k < 4; k++) {
            const s = (t * 0.5 + k / 4) % 1;
            g.fillStyle(0xffffff, 0.5 * (1 - s));
            g.fillCircle(l.x + 29 + Math.sin(t + k) * 8, l.y - 90 - s * 80, 8 + s * 14);
          }
          break;
        case 2: // music drifting from Rosa's window
          for (let k = 0; k < 3; k++) {
            const s = (t * 0.35 + k / 3) % 1;
            g.fillStyle(0x5f3dc4, 1 - s);
            const x = l.x + 30 + s * 70;
            const y = l.y - 20 - s * 70 + Math.sin(t * 3 + k) * 6;
            g.fillCircle(x, y, 6);
            g.fillRect(x + 4, y - 22, 3, 22);
          }
          break;
        case 3: {
          // the toy train circling the shop
          const a = t * 1.2;
          const x = l.x + Math.cos(a) * 80;
          const y = l.y + 60 + Math.sin(a) * 18;
          g.fillStyle(0xd64541, 1);
          g.fillRoundedRect(x - 14, y - 12, 28, 16, 4);
          g.fillStyle(0x2b2b33, 1);
          g.fillCircle(x - 8, y + 5, 4);
          g.fillCircle(x + 8, y + 5, 4);
          break;
        }
        case 4: {
          // the lighthouse beam turning
          const a = t * 0.9;
          g.fillStyle(0xfff3bf, 0.35);
          const bx = l.x;
          const by = l.y - 92;
          g.fillTriangle(bx, by, bx + Math.cos(a) * 260, by + Math.sin(a) * 40 - 30, bx + Math.cos(a) * 260, by + Math.sin(a) * 40 + 30);
          break;
        }
        case 5: // steam curling from the café
          for (let k = 0; k < 3; k++) {
            const s = (t * 0.6 + k / 3) % 1;
            g.fillStyle(0xffffff, 0.6 * (1 - s));
            g.fillCircle(l.x - 30 + k * 30 + Math.sin(t * 2 + k) * 6, l.y - 70 - s * 60, 6 + s * 10);
          }
          break;
        case 6: {
          // Bertie dancing by the big wheel
          const bob = Math.abs(Math.sin(t * 4)) * 10;
          g.fillStyle(0x6c7a89, 1);
          g.fillRoundedRect(l.x - 120 - 14, l.y + 10 - 40 - bob, 28, 34, 6);
          g.fillStyle(0xffd43b, 1);
          g.fillCircle(l.x - 120, l.y + 10 - 52 - bob, 10);
          g.lineStyle(4, 0x6c7a89, 1);
          g.lineBetween(l.x - 134, l.y - 16 - bob, l.x - 150, l.y - 30 - bob + Math.sin(t * 8) * 10);
          g.lineBetween(l.x - 106, l.y - 16 - bob, l.x - 90, l.y - 30 - bob - Math.sin(t * 8) * 10);
          // the big wheel turns
          g.lineStyle(3, 0xd64541, 1);
          for (let k = 0; k < 6; k++) {
            const a = t * 0.6 + (k / 6) * Math.PI * 2;
            g.lineBetween(l.x + 120, l.y - 10, l.x + 120 + Math.cos(a) * 50, l.y - 10 + Math.sin(a) * 50);
          }
          break;
        }
        case 7: // stars over the school
          for (let k = 0; k < 6; k++) {
            g.fillStyle(0xfff3bf, 0.5 + Math.sin(t * 3 + k) * 0.5);
            g.fillCircle(l.x - 60 + k * 24, l.y - 100 - (k % 2) * 16, 3);
          }
          break;
        case 8: {
          // the tower clock is going again
          const cx = l.x;
          const cy = l.y - 70;
          g.lineStyle(4, 0x2b1d14, 1);
          g.lineBetween(cx, cy, cx + Math.cos(t * 0.8 - Math.PI / 2) * 18, cy + Math.sin(t * 0.8 - Math.PI / 2) * 18);
          g.lineBetween(cx, cy, cx + Math.cos(t * 0.07 - Math.PI / 2) * 11, cy + Math.sin(t * 0.07 - Math.PI / 2) * 11);
          break;
        }
      }
    }
  }
}
