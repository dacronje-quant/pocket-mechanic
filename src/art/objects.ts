/**
 * The treasures people bring to the shop, drawn in code. The eight Great
 * Repair objects can be broken (still, a little sad) or working (animated),
 * and can "perform" their big moment for the Test Run and the Return.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { playMelody } from '../audio/music';
import { SONGS } from '../content/songs';
import { star } from './Kip';

const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export class MachineArt extends Phaser.GameObjects.Container {
  readonly id: string;
  private g: Phaser.GameObjects.Graphics;
  private live: Phaser.GameObjects.Graphics;
  private working = false;
  private t = 0;
  private performing = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, scale = 1) {
    super(scene, x, y);
    this.id = id;
    this.g = scene.add.graphics();
    this.live = scene.add.graphics();
    this.add([this.g, this.live]);
    this.setScale(scale);
    this.drawStatic();
    scene.add.existing(this);
  }

  setWorking(on: boolean): this {
    this.working = on;
    return this;
  }

  /** Play the object's big moment; returns its length in seconds. */
  perform(): number {
    this.working = true;
    this.performing = 4;
    switch (this.id) {
      case 'clock':
        sfx.cuckoo(4);
        return 3;
      case 'musicbox':
        return playMelody(SONGS.find((s) => s.id === 'song-lullaby')!.notes, 3, 'sine') || 4;
      case 'train':
        sfx.whistle(740, 1.2);
        setTimeout(() => sfx.chug(), 300);
        setTimeout(() => sfx.chug(), 700);
        return 3;
      case 'radio':
        sfx.staticBurst(1, 0.8);
        setTimeout(() => sfx.hum(196, 1.5), 800);
        return 3;
      case 'tea':
        sfx.hiss(1.2);
        setTimeout(() => sfx.whistle(1046, 1), 900);
        return 3;
      case 'bertie':
        playMelody(SONGS.find((s) => s.id === 'song-boogie')!.notes, 4, 'square');
        return 4;
      case 'orrery':
        sfx.sparkle();
        playMelody(SONGS.find((s) => s.id === 'song-stars')!.notes, 3, 'sine');
        return 4;
      case 'tower':
        sfx.bong();
        setTimeout(() => sfx.bong(), 1600);
        return 4;
      default:
        sfx.sparkle();
        return 2;
    }
  }

  preUpdate(_time: number, dt: number): void {
    const d = dt / 1000;
    if (this.working) this.t += d;
    if (this.performing > 0) this.performing -= d;
    this.drawLive();
  }

  private drawStatic(): void {
    const g = this.g;
    g.clear();
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 6, 260, 30);
    switch (this.id) {
      case 'clock': {
        g.fillStyle(0x6e4527, 1);
        g.fillRoundedRect(-90, -230, 180, 220, 10);
        g.fillStyle(0x4a2f1e, 1);
        g.fillTriangle(-120, -220, 0, -320, 120, -220);
        g.fillStyle(0x7a4b26, 1);
        for (let i = 0; i < 5; i++) g.fillTriangle(-110 + i * 50, -224, -85 + i * 50, -250, -60 + i * 50, -224);
        g.fillStyle(0x3d2412, 1);
        g.fillRoundedRect(-24, -300, 48, 46, 6);
        g.fillStyle(0xf6ead0, 1);
        g.fillCircle(0, -140, 62);
        g.lineStyle(3, 0xb88a2c, 1);
        g.strokeCircle(0, -140, 62);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.fillStyle(0x3b260b, 1);
          g.fillCircle(Math.cos(a) * 50, -140 + Math.sin(a) * 50, 3);
        }
        g.fillStyle(0x2e7d32, 1);
        for (let i = 0; i < 3; i++) g.fillEllipse(-60 + i * 60, -40, 40, 18);
        break;
      }
      case 'musicbox': {
        g.fillStyle(0x7a2f45, 1);
        g.fillRoundedRect(-130, -120, 260, 120, 10);
        g.fillStyle(0xc0c8d0, 1);
        g.fillRect(-130, -70, 260, 8);
        g.fillStyle(0xe8e8f0, 1);
        for (let i = 0; i < 8; i++) g.fillCircle(-100 + i * 28, -30, 4);
        g.fillStyle(0x5a1f30, 1);
        g.fillRoundedRect(-136, -136, 272, 20, 6);
        g.fillStyle(0xd9a441, 1);
        g.fillRect(126, -70, 30, 8);
        g.fillCircle(160, -66, 10);
        break;
      }
      case 'train': {
        g.fillStyle(0x8a5a33, 1);
        g.fillRoundedRect(-150, -24, 300, 24, 8);
        g.lineStyle(4, 0x555555, 1);
        g.strokeEllipse(0, -40, 300, 90);
        break;
      }
      case 'radio': {
        g.fillStyle(0x6e4527, 1);
        g.fillRoundedRect(-120, -240, 240, 240, 60);
        g.fillStyle(0x3d2412, 1);
        g.fillRoundedRect(-96, -210, 192, 110, 50);
        g.lineStyle(3, 0xc8703f, 1);
        for (let i = 0; i < 6; i++) g.lineBetween(-80, -190 + i * 15, 80, -190 + i * 15);
        g.fillStyle(0xf6ead0, 1);
        g.fillCircle(-50, -50, 30);
        g.fillStyle(0xd9a441, 1);
        g.fillCircle(40, -50, 16);
        g.fillCircle(80, -50, 16);
        break;
      }
      case 'tea': {
        g.fillStyle(0xc8703f, 1);
        g.fillRoundedRect(-80, -230, 160, 230, 40);
        g.fillStyle(0xf0a77a, 0.6);
        g.fillEllipse(-30, -170, 40, 120);
        g.lineStyle(10, 0xb5652e, 1);
        g.lineBetween(80, -180, 140, -180);
        g.lineBetween(140, -180, 140, -60);
        g.fillStyle(0xd5f5e3, 1);
        g.fillCircle(0, -120, 26);
        g.lineStyle(3, 0x3b260b, 1);
        g.strokeCircle(0, -120, 26);
        g.fillStyle(0xffffff, 1);
        for (let i = 0; i < 3; i++) g.fillRoundedRect(-120 + i * 70, -26, 44, 26, 8);
        break;
      }
      case 'bertie': {
        g.fillStyle(0x3d2b25, 1);
        g.fillRect(-36, -90, 20, 90);
        g.fillRect(16, -90, 20, 90);
        g.fillStyle(0xd64541, 1);
        g.fillRoundedRect(-80, -230, 160, 150, 20);
        g.fillStyle(0xf2e6c8, 1);
        g.fillRoundedRect(-50, -200, 100, 70, 10);
        g.fillStyle(0xd64541, 1);
        g.fillRoundedRect(-56, -320, 112, 90, 18);
        g.fillStyle(0xf2e6c8, 1);
        g.fillCircle(-24, -280, 16);
        g.fillCircle(24, -280, 16);
        g.fillStyle(0x222222, 1);
        g.fillCircle(-24, -280, 7);
        g.fillCircle(24, -280, 7);
        break;
      }
      case 'orrery': {
        g.fillStyle(0x6e4527, 1);
        g.fillRoundedRect(-120, -50, 240, 50, 10);
        g.fillStyle(0xb88a2c, 1);
        g.fillRect(-6, -200, 12, 150);
        break;
      }
      case 'tower': {
        g.fillStyle(0x7a736d, 1);
        g.fillRect(-90, -420, 180, 420);
        g.fillStyle(0x6b6560, 1);
        g.fillTriangle(-110, -420, 0, -540, 110, -420);
        g.fillStyle(0x2b1d14, 1);
        g.fillRect(-40, -380, 80, 70);
        g.fillStyle(0xf6ead0, 1);
        g.fillCircle(0, -250, 60);
        g.lineStyle(4, 0xb88a2c, 1);
        g.strokeCircle(0, -250, 60);
        g.fillStyle(0x5a3a22, 1);
        g.fillRoundedRect(-30, -70, 60, 70, { tl: 30, tr: 30, bl: 0, br: 0 });
        break;
      }
      default:
        drawSmallObject(g, this.id, 0, -60, 1.6);
    }
  }

  private drawLive(): void {
    const L = this.live;
    L.clear();
    const t = this.t;
    const perf = this.performing > 0;
    switch (this.id) {
      case 'clock': {
        const m = this.working ? t * 1.2 : 0.6;
        L.lineStyle(5, 0x2b1d14, 1);
        L.lineBetween(0, -140, Math.sin(m) * 46, -140 - Math.cos(m) * 46);
        L.lineStyle(7, 0x2b1d14, 1);
        L.lineBetween(0, -140, Math.sin(m / 12 + 2) * 30, -140 - Math.cos(m / 12 + 2) * 30);
        // pendulum
        const sw = this.working ? Math.sin(t * 3) * 0.35 : 0;
        L.lineStyle(4, 0xb88a2c, 1);
        L.lineBetween(0, -10, Math.sin(sw) * 80, -10 + Math.cos(sw) * 80);
        L.fillStyle(0xd9a441, 1);
        L.fillCircle(Math.sin(sw) * 80, -10 + Math.cos(sw) * 80, 14);
        // weights
        L.fillStyle(0x9a6b1f, 1);
        L.fillEllipse(-50, 30 + (this.working ? Math.sin(t * 0.3) * 6 : 20), 18, 44);
        L.fillEllipse(50, 30 - (this.working ? Math.sin(t * 0.3) * 6 : -20), 18, 44);
        if (perf) {
          const pop = Math.min(1, (4 - this.performing) * 3) * Math.abs(Math.sin(t * 4));
          L.fillStyle(0x8a5a33, 1);
          L.fillCircle(0, -277 - pop * 26, 18);
          L.fillStyle(0xe8a33d, 1);
          L.fillTriangle(16, -280 - pop * 26, 16, -270 - pop * 26, 34, -276 - pop * 26);
          L.fillStyle(0x111111, 1);
          L.fillCircle(6, -282 - pop * 26, 3);
        }
        break;
      }
      case 'musicbox': {
        const open = this.working ? Math.min(1, t) : 0;
        L.fillStyle(0x873650, 1);
        L.fillPoints([v(-136, -136), v(136, -136), v(136, -136 - 120 * open), v(-136, -136 - 120 * open)], true);
        if (open > 0.5) {
          L.fillStyle(0xe67e22, 1);
          const spin = Math.cos(t * 3);
          L.fillEllipse(0, -170, 30 * Math.abs(spin) + 6, 50);
          L.fillCircle(0, -205, 14);
          L.fillStyle(0xe8e8f0, 1);
          L.fillEllipse(0, -144, 60, 10);
        }
        if (this.working) {
          L.fillStyle(0xffffff, 0.8);
          for (let i = 0; i < 4; i++) {
            const y = -150 - ((t * 40 + i * 30) % 120);
            L.fillCircle(60 + Math.sin(t + i) * 20, y, 4);
            L.fillRect(63 + Math.sin(t + i) * 20, y - 14, 2, 14);
          }
        }
        break;
      }
      case 'train': {
        const a = this.working ? t * 0.8 : 0.4;
        for (let i = 0; i < 4; i++) {
          const ang = a - i * 0.32;
          const x = Math.cos(ang) * 150;
          const y = -40 + Math.sin(ang) * 45;
          L.fillStyle(i === 0 ? 0x2b7a78 : [0xe05a47, 0xffd43b, 0x3b7dd8][i - 1], 1);
          L.fillRoundedRect(x - 26, y - 34, 52, 30, 6);
          L.fillStyle(0x222222, 1);
          L.fillCircle(x - 14, y - 2, 7);
          L.fillCircle(x + 14, y - 2, 7);
          if (i === 0) {
            L.fillStyle(0x222222, 1);
            L.fillRect(x + 8, y - 50, 10, 18);
            if (this.working) {
              L.fillStyle(0xffffff, 0.8);
              L.fillCircle(x + 13, y - 60 - ((t * 30) % 30), 8 + ((t * 10) % 6));
            }
          }
        }
        break;
      }
      case 'radio': {
        const glow = this.working ? 0.6 + Math.sin(t * 5) * 0.2 : 0.1;
        L.fillStyle(0xffb347, glow);
        L.fillCircle(-50, -50, 26);
        L.lineStyle(3, 0x3b260b, 1);
        const n = this.working ? Math.sin(t * 0.7) * 1.2 : -1;
        L.lineBetween(-50, -50, -50 + Math.cos(n) * 22, -50 + Math.sin(n) * 22);
        if (this.working) {
          L.lineStyle(3, 0xffcf80, 0.8);
          for (let k = 1; k <= 3; k++) {
            const r = ((t * 60 + k * 30) % 90) + 20;
            L.beginPath();
            L.arc(0, -155, r, -0.6, 0.6);
            L.strokePath();
            L.beginPath();
            L.arc(0, -155, r, Math.PI - 0.6, Math.PI + 0.6);
            L.strokePath();
          }
        }
        break;
      }
      case 'tea': {
        if (this.working) {
          for (let i = 0; i < 4; i++) {
            const y = -240 - ((t * 50 + i * 25) % 100);
            L.fillStyle(0xffffff, 0.6 - ((t * 50 + i * 25) % 100) / 200);
            L.fillCircle(Math.sin(t * 2 + i) * 14, y, 14 + i * 2);
          }
          const fill = Math.min(1, (t % 3) / 2);
          L.fillStyle(0x8a4a20, 1);
          L.fillRect(-116 + Math.floor(t / 3 % 3) * 70, -6 - fill * 16, 36, fill * 16);
          L.lineStyle(4, 0x8a4a20, 0.8);
          L.lineBetween(140, -60, 140, -40);
        }
        L.lineStyle(3, 0xd64541, 1);
        const a = this.working ? -0.8 + Math.sin(t * 2) * 0.2 : 0.9;
        L.lineBetween(0, -120, Math.cos(a) * 20, -120 + Math.sin(a) * 20);
        break;
      }
      case 'bertie': {
        const sway = this.working ? Math.sin(t * 4) * 0.5 : 0.2;
        L.lineStyle(14, 0xd64541, 1);
        L.lineBetween(-80, -210, -80 - Math.cos(sway) * 60, -210 + Math.sin(sway) * 70 - 30);
        L.lineBetween(80, -210, 80 + Math.cos(-sway) * 60, -210 - Math.sin(sway) * 70 - 30);
        for (let i = 0; i < 4; i++) {
          L.fillStyle([0xffd43b, 0x74c0fc, 0x8ce99a, 0xff8787][i], this.working && Math.floor(t * 4 + i) % 2 ? 1 : 0.3);
          L.fillCircle(-36 + i * 24, -165, 8);
        }
        break;
      }
      case 'orrery': {
        const sunGlow = this.working ? 0.9 : 0.35;
        L.fillStyle(0xfff3b0, sunGlow * 0.3);
        L.fillCircle(0, -210, 50);
        L.fillStyle(0xffd76a, sunGlow);
        L.fillCircle(0, -210, 22);
        const planets: Array<[number, number, number, number]> = [
          [50, 2.2, 6, 0xb0a8a0],
          [80, 1.4, 9, 0xe8c39e],
          [115, 1, 10, 0x5fa8d3],
          [150, 0.6, 8, 0xe05a47],
        ];
        for (const [r, sp, s, c] of planets) {
          const a = this.working ? t * sp : r;
          const px = Math.cos(a) * r;
          const py = -210 + Math.sin(a) * r * 0.35;
          L.lineStyle(2, 0xb88a2c, 0.7);
          L.lineBetween(0, -210, px, py);
          L.fillStyle(c, 1);
          L.fillCircle(px, py, s);
        }
        if (perf || (this.working && this.performing > -1)) {
          for (let i = 0; i < 18; i++) {
            L.fillStyle(0xffffff, 0.5 + Math.sin(t * 3 + i) * 0.4);
            star(L, Math.cos(i * 2.1) * 200, -330 + Math.sin(i * 1.7) * 60, 4);
          }
        }
        break;
      }
      case 'tower': {
        const m = this.working ? t * 0.6 : 0.2;
        L.lineStyle(5, 0x2b1d14, 1);
        L.lineBetween(0, -250, Math.sin(m) * 46, -250 - Math.cos(m) * 46);
        L.lineStyle(7, 0x2b1d14, 1);
        L.lineBetween(0, -250, Math.sin(m / 12) * 30, -250 - Math.cos(m / 12) * 30);
        const swing = perf ? Math.sin(t * 5) * 0.5 : 0;
        L.fillStyle(0xd9a441, 1);
        L.fillTriangle(-26 + swing * 20, -320, 26 + swing * 20, -320, swing * 10, -372);
        L.fillCircle(swing * 10, -360, 16);
        break;
      }
      default:
        if (this.working) {
          L.fillStyle(0xfff3b0, 0.3 + Math.sin(t * 4) * 0.2);
          L.fillCircle(0, -60, 70);
        }
    }
  }
}

/** Small icons for Quick Fix and Attic objects (and anything without a big drawing). */
export function drawSmallObject(g: Phaser.GameObjects.Graphics, id: string, x: number, y: number, s = 1): void {
  const R = (dx: number, dy: number, w: number, h: number, c: number, r = 6) => {
    g.fillStyle(c, 1);
    g.fillRoundedRect(x + dx * s, y + dy * s, w * s, h * s, r * s);
  };
  const C = (dx: number, dy: number, r: number, c: number) => {
    g.fillStyle(c, 1);
    g.fillCircle(x + dx * s, y + dy * s, r * s);
  };
  const T = (pts: number[], c: number) => {
    g.fillStyle(c, 1);
    const vs: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < pts.length; i += 2) vs.push(v(x + pts[i] * s, y + pts[i + 1] * s));
    g.fillPoints(vs, true);
  };
  switch (id) {
    // the eight Great Repair objects, as small icons (job board, shelf, padlocks)
    case 'clock':
      T([-44, -20, 0, -56, 44, -20], 0x7a4b26);
      R(-36, -22, 72, 70, 0x8a5a33);
      C(0, 6, 22, 0xf6ead0);
      g.lineStyle(3 * s, 0x2b1d14, 1);
      g.lineBetween(x, y + 6 * s, x, y - 10 * s);
      g.lineBetween(x, y + 6 * s, x + 10 * s, y + 6 * s);
      R(-8, -40, 16, 12, 0x2b1d14, 3);
      C(0, -34, 5, 0xffd43b);
      R(-14, 48, 4, 14, 0xd9a441, 1);
      R(10, 48, 4, 18, 0xd9a441, 1);
      break;
    case 'musicbox':
      R(-44, -6, 88, 46, 0xd98aa8, 6);
      R(-48, -20, 96, 16, 0xb5607e, 6);
      C(0, 16, 9, 0xffd43b);
      g.fillStyle(0xfce4ec, 1);
      g.fillEllipse(x, y - 34 * s, 16 * s, 26 * s);
      C(0, -48, 7, 0xe8913a);
      break;
    case 'train':
      R(-46, -10, 70, 36, 0xd64541, 6);
      R(-10, -36, 30, 30, 0xd64541, 4);
      R(-40, -24, 16, 16, 0x2b2b33, 3);
      R(24, 0, 24, 26, 0x3463b5, 4);
      C(-30, 30, 10, 0x2b2b33);
      C(0, 30, 10, 0x2b2b33);
      C(36, 30, 8, 0x2b2b33);
      break;
    case 'radio':
      R(-46, -36, 92, 72, 0x8a5a33, 14);
      R(-36, -26, 44, 50, 0xc89a62, 8);
      for (let i = 0; i < 4; i++) R(-32, -20 + i * 11, 36, 3, 0x6e4527, 1);
      C(26, -10, 9, 0xd9a441);
      C(26, 16, 7, 0xd9a441);
      break;
    case 'tea':
      R(-30, -20, 60, 60, 0xc9d1d9, 10);
      g.fillStyle(0xadb5bd, 1);
      g.fillEllipse(x, y - 22 * s, 64 * s, 18 * s);
      R(-6, -46, 12, 22, 0xd9a441, 3);
      T([30, -6, 54, -24, 56, -16, 34, 6], 0xadb5bd);
      C(0, 10, 10, 0x3fa37a);
      break;
    case 'bertie':
      R(-26, -10, 52, 50, 0x6c7a89, 8);
      R(-20, -48, 40, 36, 0x9aa6b4, 8);
      C(-9, -32, 6, 0xffd43b);
      C(9, -32, 6, 0xffd43b);
      R(-40, -6, 14, 34, 0x6c7a89, 6);
      R(26, -6, 14, 34, 0x6c7a89, 6);
      C(0, 12, 8, 0xd64541);
      break;
    case 'orrery':
      C(0, 0, 16, 0xffd43b);
      g.lineStyle(2 * s, 0xd9a441, 1);
      g.strokeEllipse(x, y, 90 * s, 34 * s);
      g.strokeEllipse(x, y, 60 * s, 22 * s);
      C(44, 0, 6, 0x74c0fc);
      C(-28, 8, 5, 0xe8913a);
      R(-4, 16, 8, 26, 0x8a5a33, 2);
      R(-22, 40, 44, 8, 0x8a5a33, 3);
      break;
    case 'tower':
      R(-20, -40, 40, 92, 0x9a8f86, 2);
      T([-28, -40, 0, -66, 28, -40], 0x6b6560);
      C(0, -18, 13, 0xf6ead0);
      g.lineStyle(2 * s, 0x2b1d14, 1);
      g.lineBetween(x, y - 18 * s, x, y - 27 * s);
      g.lineBetween(x, y - 18 * s, x + 6 * s, y - 18 * s);
      R(-8, 30, 16, 22, 0x5a3a22, 6);
      break;
    case 'door':
      R(-30, -50, 60, 100, 0x8a5a33);
      C(18, 0, 5, 0xd9a441);
      R(-36, -40, 8, 14, 0x9aa6b4, 2);
      R(-36, 20, 8, 14, 0x9aa6b4, 2);
      break;
    case 'mouse':
      g.fillStyle(0xb0a8a0, 1);
      g.fillEllipse(x, y + 10 * s, 70 * s, 40 * s);
      C(26, -2, 12, 0xb0a8a0);
      C(30, -12, 8, 0xf0b8c0);
      C(34, 0, 3, 0x111111);
      R(-46, 14, 30, 3, 0xd9a441, 1);
      C(-48, 0, 8, 0xd9a441);
      break;
    case 'doorbell':
      C(0, 0, 30, 0xd9a441);
      C(0, 0, 14, 0xf6d27a);
      R(-6, -46, 12, 18, 0x7a5413, 2);
      break;
    case 'bikebell':
      C(0, 0, 30, 0xc0c8d0);
      C(-6, -6, 12, 0xf1f3f5);
      R(-40, 24, 80, 8, 0x555555, 3);
      break;
    case 'timer':
      C(0, 0, 32, 0xff6b6b);
      C(0, 0, 22, 0xfff6dc);
      R(-2, -18, 4, 18, 0x333333, 1);
      break;
    case 'pepper':
      R(-18, -40, 36, 80, 0x6e4527, 10);
      C(0, -48, 14, 0x3d2412);
      break;
    case 'jack':
      R(-36, -20, 72, 60, 0xe05a47, 4);
      R(-36, -20, 72, 10, 0xffd43b, 2);
      C(0, -44, 16, 0xf2c9a5);
      R(30, 0, 18, 6, 0xd9a441, 2);
      break;
    case 'piano':
      R(-50, -30, 100, 50, 0xe05a47, 6);
      for (let i = 0; i < 7; i++) R(-44 + i * 13, -2, 11, 20, 0xffffff, 1);
      break;
    case 'cat':
      C(0, 10, 32, 0xffffff);
      C(0, -26, 22, 0xffffff);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(x - 20 * s, y - 36 * s, x - 10 * s, y - 56 * s, x - 2 * s, y - 40 * s);
      g.fillTriangle(x + 20 * s, y - 36 * s, x + 10 * s, y - 56 * s, x + 2 * s, y - 40 * s);
      R(20, -40, 12, 30, 0xffffff, 6);
      C(-8, -28, 3, 0x111111);
      C(8, -28, 3, 0x111111);
      C(0, 12, 8, 0xffd43b);
      break;
    case 'car':
      R(-46, -20, 92, 30, 0x3b7dd8, 10);
      R(-24, -36, 46, 20, 0x74c0fc, 8);
      C(-26, 14, 11, 0x222222);
      C(26, 14, 11, 0x222222);
      break;
    case 'boat':
      g.fillStyle(0xffd43b, 1);
      g.fillPoints([v(x - 50 * s, y), v(x + 50 * s, y), v(x + 36 * s, y + 26 * s), v(x - 36 * s, y + 26 * s)], true);
      R(-10, -36, 8, 36, 0x8a5a33, 2);
      C(40, 6, 16, 0xe05a47);
      break;
    case 'whistle':
      R(-40, -12, 70, 24, 0xc0c8d0, 12);
      C(30, 0, 16, 0xc0c8d0);
      break;
    case 'flashlight':
      R(-44, -14, 70, 28, 0x333333, 6);
      R(22, -20, 22, 40, 0xc0c8d0, 6);
      break;
    case 'desklamp':
      R(-30, 30, 60, 10, 0x2b7a78, 4);
      R(-4, -20, 8, 50, 0x2b7a78, 2);
      g.fillStyle(0x2b7a78, 1);
      g.fillTriangle(x - 30 * s, y - 20 * s, x + 30 * s, y - 20 * s, x, y - 50 * s);
      break;
    case 'vane':
      R(-3, -40, 6, 80, 0x333333, 2);
      g.fillStyle(0x333333, 1);
      g.fillTriangle(x + 40 * s, y - 34 * s, x + 20 * s, y - 44 * s, x + 20 * s, y - 24 * s);
      R(-40, -38, 60, 8, 0x333333, 2);
      break;
    case 'sprinkler':
      C(0, 10, 26, 0x2e9b5f);
      R(-4, -30, 8, 40, 0x9aa6b4, 2);
      g.fillStyle(0x74c0fc, 1);
      for (let i = 0; i < 5; i++) g.fillCircle(x + (i - 2) * 16 * s, y - 40 * s - Math.abs(i - 2) * -6 * s, 4 * s);
      break;
    case 'metronome':
      g.fillStyle(0x8a5a33, 1);
      g.fillTriangle(x - 30 * s, y + 40 * s, x + 30 * s, y + 40 * s, x, y - 50 * s);
      R(-2, -40, 4, 60, 0xd9a441, 1);
      C(0, -20, 6, 0xd9a441);
      break;
    case 'coinbank':
      C(0, 0, 36, 0xffa94d);
      C(-12, -10, 6, 0x111111);
      C(12, -10, 6, 0x111111);
      R(-12, -40, 24, 6, 0x5a3a22, 2);
      break;
    case 'gumball':
      C(0, -14, 34, 0xd0ebff);
      for (let i = 0; i < 6; i++) C(-16 + (i % 3) * 16, -20 + Math.floor(i / 3) * 14, 6, [0xff6b6b, 0xffd43b, 0x8ce99a][i % 3]);
      R(-24, 18, 48, 30, 0xd64541, 4);
      break;
    case 'robot':
      R(-26, -10, 52, 50, 0x9aa6b4, 8);
      R(-20, -44, 40, 32, 0xc0c8d0, 8);
      C(-8, -28, 5, 0x74c0fc);
      C(8, -28, 5, 0x74c0fc);
      break;
    case 'top':
      g.fillStyle(0xe05a47, 1);
      g.fillTriangle(x - 34 * s, y - 10 * s, x + 34 * s, y - 10 * s, x, y + 36 * s);
      R(-4, -36, 8, 26, 0x8a5a33, 2);
      R(-34, -16, 68, 10, 0xffd43b, 4);
      break;
    case 'nightlight':
      R(-14, -40, 28, 70, 0xffffff, 4);
      R(-14, -20, 28, 10, 0xe05a47, 1);
      R(-14, 4, 28, 10, 0xe05a47, 1);
      C(0, -48, 12, 0xffd43b);
      break;
    case 'kaleidoscope':
      R(-46, -14, 92, 28, 0x8e5cc4, 12);
      C(46, 0, 14, 0x74c0fc);
      break;
    case 'bird':
      g.fillStyle(0x2e9b5f, 1);
      g.fillEllipse(x, y, 60 * s, 40 * s);
      C(24, -18, 14, 0x2e9b5f);
      g.fillStyle(0xffa94d, 1);
      g.fillTriangle(x + 36 * s, y - 20 * s, x + 36 * s, y - 14 * s, x + 50 * s, y - 17 * s);
      R(-10, 18, 20, 16, 0xd9a441, 2);
      break;
    case 'coinbank-monkey':
      C(0, 0, 30, 0x8a5a33);
      break;
    default:
      drawAtticIcon(g, id, x, y, s);
  }
}

function drawAtticIcon(g: Phaser.GameObjects.Graphics, id: string, x: number, y: number, s: number): void {
  const R = (dx: number, dy: number, w: number, h: number, c: number, r = 6) => {
    g.fillStyle(c, 1);
    g.fillRoundedRect(x + dx * s, y + dy * s, w * s, h * s, r * s);
  };
  const C = (dx: number, dy: number, r: number, c: number) => {
    g.fillStyle(c, 1);
    g.fillCircle(x + dx * s, y + dy * s, r * s);
  };
  const wood = 0x7a4b26;
  const brass = 0xd9a441;
  switch (id) {
    case 'typewriter':
      R(-46, -10, 92, 40, 0x333333, 8);
      R(-30, -34, 60, 26, 0xf6ead0, 2);
      for (let i = 0; i < 8; i++) C(-36 + i * 10, 16, 3.5, 0xffffff);
      break;
    case 'gramophone':
      R(-30, 10, 60, 30, wood, 4);
      g.fillStyle(brass, 1);
      g.fillTriangle(x, y + 6 * s, x - 40 * s, y - 50 * s, x + 30 * s, y - 50 * s);
      C(-5, -50, 36, brass);
      C(-5, -50, 26, 0x8a5f17);
      break;
    case 'pianola':
    case 'orchestrion':
    case 'calliope':
      R(-44, -40, 88, 80, id === 'calliope' ? 0xd64541 : wood, 6);
      for (let i = 0; i < 6; i++) R(-38 + i * 13, -60 - (i % 3) * 8, 9, 30 + (i % 3) * 8, brass, 3);
      break;
    case 'calculator':
    case 'register':
      R(-40, -30, 80, 66, id === 'register' ? brass : 0x555555, 6);
      for (let i = 0; i < 9; i++) C(-22 + (i % 3) * 22, -10 + Math.floor(i / 3) * 16, 5, 0xffffff);
      break;
    case 'pinball':
      R(-30, -50, 60, 100, 0x3b7dd8, 6);
      C(0, -20, 10, 0xffd43b);
      C(-12, 10, 6, 0xff6b6b);
      C(12, 10, 6, 0x8ce99a);
      break;
    case 'sewing':
      R(-46, 10, 92, 14, wood, 4);
      R(-30, -40, 60, 16, 0x333333, 6);
      R(16, -40, 14, 50, 0x333333, 4);
      C(-30, -18, 14, brass);
      break;
    case 'camera':
    case 'projector':
      R(-40, -26, 80, 52, 0x333333, 6);
      C(20, 0, 18, 0x9aa6b4);
      C(20, 0, 10, 0x74c0fc);
      break;
    case 'birdcage':
      g.lineStyle(3 * s, brass, 1);
      for (let i = -3; i <= 3; i++) g.lineBetween(x + i * 10 * s, y - 40 * s, x + i * 10 * s, y + 30 * s);
      g.strokeEllipse(x, y - 40 * s, 70 * s, 20 * s);
      C(0, 0, 12, 0xffd43b);
      break;
    case 'telegraph':
      R(-40, 10, 80, 20, wood, 4);
      R(-30, -6, 50, 10, brass, 3);
      C(26, -8, 8, 0x333333);
      break;
    case 'zoetrope':
      R(-40, -30, 80, 50, 0xd64541, 4);
      for (let i = 0; i < 6; i++) R(-34 + i * 12, -24, 4, 16, 0x111111, 1);
      R(-4, 20, 8, 20, 0x333333, 2);
      break;
    case 'marbleclock':
      R(-40, -50, 80, 100, wood, 6);
      g.lineStyle(3 * s, brass, 1);
      for (let i = 0; i < 4; i++) g.lineBetween(x - 34 * s, y + (-36 + i * 24) * s, x + 34 * s, y + (-30 + i * 24) * s);
      C(-20, -40, 5, 0x74c0fc);
      break;
    case 'waterclock':
      C(0, -26, 26, 0x74c0fc);
      R(-6, -2, 12, 30, 0x9aa6b4, 3);
      C(0, 40, 22, 0x74c0fc);
      break;
    case 'writer':
      C(0, -30, 18, 0xf2c9a5);
      R(-20, -12, 40, 50, 0x3b7dd8, 8);
      R(18, 10, 4, 30, 0x111111, 1);
      break;
    case 'barometer':
      C(0, 0, 36, wood);
      C(0, 0, 28, 0xf6ead0);
      g.lineStyle(3 * s, 0x111111, 1);
      g.lineBetween(x, y, x + 18 * s, y - 14 * s);
      break;
    case 'carousel':
      g.fillStyle(0xff6b6b, 1);
      g.fillTriangle(x - 50 * s, y - 20 * s, x + 50 * s, y - 20 * s, x, y - 56 * s);
      R(-46, 20, 92, 10, brass, 3);
      for (let i = 0; i < 3; i++) R(-34 + i * 28, -20, 4, 40, brass, 1);
      break;
    case 'divingpump':
      C(0, -10, 30, brass);
      C(0, -10, 16, 0x74c0fc);
      R(-30, 20, 60, 20, 0x555555, 4);
      break;
    case 'telescope':
      g.fillStyle(brass, 1);
      g.fillPoints([v(x - 46 * s, y + 10 * s), v(x + 40 * s, y - 30 * s), v(x + 46 * s, y - 18 * s), v(x - 40 * s, y + 22 * s)], true);
      R(-4, 10, 8, 34, wood, 2);
      break;
    case 'theatre':
      R(-46, -40, 92, 80, 0xd64541, 6);
      R(-34, -28, 68, 50, 0x2b1d14, 2);
      C(0, 0, 10, 0xffd43b);
      break;
    case 'lighthouselens':
      for (let i = 0; i < 4; i++) {
        g.lineStyle(4 * s, 0xb2f2ff, 0.8);
        g.strokeCircle(x, y, (36 - i * 8) * s);
      }
      C(0, 0, 6, 0xffd43b);
      break;
    case 'mysterybox':
      R(-40, -40, 80, 80, wood, 6);
      g.lineStyle(3 * s, brass, 1);
      g.strokeRect(x - 30 * s, y - 30 * s, 60 * s, 60 * s);
      C(0, 0, 10, brass);
      break;
    default:
      C(0, 0, 30, brass);
  }
}
