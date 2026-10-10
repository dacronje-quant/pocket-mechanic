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
import { CM, drawPatina, drawTimber, drawLeafSprig, drawCopperPipe } from './copperMoss';
import { atlasFrame, paintedObject } from './sprites';
import { withArt } from './generated';

const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export class MachineArt extends Phaser.GameObjects.Container {
  readonly id: string;
  private g: Phaser.GameObjects.Graphics;
  private live: Phaser.GameObjects.Graphics;
  private working = false;
  private t = 0;
  private performing = 0;
  private painted?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, scale = 1) {
    super(scene, x, y);
    this.id = id;
    this.g = scene.make.graphics({ x: 0, y: 0 }, false);
    const staticKey = `copper-moss:machine:${id}`;
    if (!scene.textures.exists(staticKey)) {
      this.drawStatic();
      this.g.generateTexture(staticKey, 420, 650);
    }
    this.g.destroy();
    this.live = scene.add.graphics();
    const fallback = scene.add.image(-210, -560, staticKey).setOrigin(0);
    this.add([fallback, this.live]);
    this.setScale(scale);
    scene.add.existing(this);
    const index = ['clock', 'musicbox', 'train', 'radio', 'tea', 'bertie', 'orrery', 'tower'].indexOf(id);
    if (index >= 0) withArt(scene, id === 'musicbox' ? 'item-musicbox' : 'item-atlas', (key) => {
      if (!this.active || !this.scene) return;
      const image = scene.add.image(0, 0, key, atlasFrame(scene, key, index, 4, 4, true)).setOrigin(.5, 1).setName(`machine:${id}`);
      const span = [360, 300, 340, 270, 300, 350, 340, 400][index];
      image.setScale(span / Math.max(image.width, image.height));
      this.painted = image; this.addAt(image, 0); fallback.setVisible(false);
    });
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
    // Translate only while baking, so every instance shares the same texture.
    g.translateCanvas(210, 560);
    g.fillStyle(CM.ink, 0.18);
    g.fillEllipse(0, 6, 260, 24);
    const plate = (x: number, y: number, w: number, h: number, c: number, r = 6, seed = 1) => {
      g.fillStyle(c, 1); g.fillRoundedRect(x, y, w, h, r);
      g.lineStyle(1.7, CM.ink, 0.95); g.strokeRoundedRect(x, y, w, h, r);
      g.lineStyle(0.9, CM.cream, 0.35); g.lineBetween(x + r, y + 2, x + w - r, y + 2);
      const ix = Math.max(4, r * 0.35), iy = Math.max(4, r * 0.5);
      drawPatina(g, x + ix, y + iy, w - ix * 2, h - iy * 2, seed, 2);
    };
    const circle = (x: number, y: number, r: number, color: number) => {
      g.fillStyle(color, 1); g.fillCircle(x, y, r);
      g.lineStyle(1.6, CM.ink, 0.95); g.strokeCircle(x, y, r);
      g.lineStyle(0.9, CM.cream, 0.5);
      g.beginPath(); g.arc(x - 0.6, y - 0.6, r - 2, Math.PI, Math.PI * 1.8); g.strokePath();
    };
    const rivet = (x: number, y: number, r = 2.6) => {
      circle(x, y, r, CM.brass);
      g.lineStyle(0.7, CM.ink, 0.8); g.lineBetween(x - r * 0.4, y + r * 0.35, x + r * 0.4, y - r * 0.35);
    };
    const dial = (x: number, y: number, r: number) => {
      circle(x, y, r + 5, CM.copperDark); circle(x, y, r + 2, CM.brass); circle(x, y, r, CM.paper);
      for (let i = 0; i < 60; i++) {
        const a = i * Math.PI / 30 - Math.PI / 2;
        const ri = r - (i % 5 === 0 ? 9 : 4);
        g.lineStyle(i % 5 === 0 ? 1.6 : 0.65, CM.ink, 0.85);
        g.lineBetween(x + Math.cos(a) * ri, y + Math.sin(a) * ri, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2));
      }
      for (let i = 0; i < 16; i++) {
        const a = i * 2.13;
        const rr = Math.sqrt((i + 1) / 17) * r * 0.74;
        g.lineStyle(0.6, CM.woodDark, 0.15);
        g.lineBetween(x + Math.cos(a) * rr, y + Math.sin(a) * rr, x + Math.cos(a) * rr + 4, y + Math.sin(a) * rr - 1);
      }
    };
    switch (this.id) {
      case 'clock': {
        plate(-90, -230, 180, 220, CM.woodDark, 6, 31);
        for (let i = 0; i < 6; i++) drawTimber(g, -84 + i * 28, -227, 27, 206, 330 + i, i % 2 ? CM.wood : CM.woodDark);
        g.fillStyle(CM.ink, 1); g.fillTriangle(-120, -220, 0, -320, 120, -220);
        g.fillStyle(CM.wood, 1); g.fillTriangle(-109, -222, 0, -310, 109, -222);
        g.lineStyle(1.2, CM.ink, 0.85); g.strokeTriangle(-109, -222, 0, -310, 109, -222);
        for (let row = 0; row < 5; row++) {
          const yy = -297 + row * 16;
          const half = 15 + row * 20;
          g.lineStyle(0.9, CM.ink, 0.6); g.lineBetween(-half, yy, half, yy);
          for (let xx = -half + 8; xx < half; xx += 22) g.lineBetween(xx, yy, xx - 8, yy + 12);
        }
        g.lineStyle(8, CM.woodDark, 1); g.lineBetween(-117, -217, 0, -321); g.lineBetween(0, -321, 117, -217);
        g.lineStyle(1.1, CM.copperLight, 0.6); g.lineBetween(-117, -221, 0, -325); g.lineBetween(0, -325, 117, -221);
        plate(-24, -294, 48, 38, CM.ink, 16, 42);
        g.lineStyle(2, CM.brass, 0.8); g.strokeRoundedRect(-27, -297, 54, 44, 17);
        dial(0, -140, 58);
        plate(-79, -48, 158, 28, CM.tealDark, 3, 811);
        for (let i = 0; i < 3; i++) {
          const xx = -55 + i * 55;
          g.lineStyle(1.2, CM.brass, 0.8); g.strokeEllipse(xx, -34, 28, 13);
          g.lineBetween(xx - 12, -34, xx + 12, -34);
        }
        for (const xx of [-80, 80]) {
          plate(xx - 5, -218, 10, 190, CM.copperDark, 2, xx + 903);
          for (const yy of [-210, -100, -34]) rivet(xx, yy);
        }
        break;
      }
      case 'musicbox': {
        plate(-130, -120, 260, 120, CM.tealDark, 8, 33);
        plate(-120, -106, 240, 93, CM.teal, 4, 319);
        drawTimber(g, -132, -15, 264, 16, 84, CM.woodDark);
        plate(-136, -136, 272, 20, CM.wood, 4, 68);
        plate(-126, -72, 252, 7, CM.brass, 1, 77);
        for (const xx of [-113, 113]) {
          for (const yy of [-94, -28]) rivet(xx, yy, 3);
          g.lineStyle(1, CM.brass, 0.8); g.lineBetween(xx, -91, xx, -31);
        }
        plate(-14, -58, 28, 20, CM.copperDark, 3, 812);
        circle(0, -48, 4, CM.ink);
        for (let i = 0; i < 7; i++) {
          const xx = -78 + i * 26;
          g.lineStyle(0.7, CM.paper, 0.65);
          g.strokeEllipse(xx, -29, 13, 6); g.lineBetween(xx - 6, -29, xx + 6, -29);
        }
        plate(126, -70, 30, 8, CM.brass, 2, 45); circle(160, -66, 9, CM.woodDark);
        for (const xx of [-111, 111]) plate(xx - 8, 0, 16, 10, CM.copperDark, 3, 52);
        break;
      }
      case 'train': {
        plate(-166, -26, 332, 28, CM.woodDark, 8, 63);
        drawTimber(g, -158, -22, 316, 19, 722, CM.wood);
        for (let i = 0; i < 24; i++) {
          const a = i * Math.PI / 12;
          const x = Math.cos(a) * 147;
          const y = -40 + Math.sin(a) * 45;
          g.lineStyle(5, CM.woodDark, 1); g.lineBetween(x - Math.cos(a) * 8, y - Math.sin(a) * 8, x + Math.cos(a) * 8, y + Math.sin(a) * 8);
        }
        g.lineStyle(2.5, CM.ink, 1); g.strokeEllipse(0, -40, 310, 98); g.strokeEllipse(0, -40, 286, 78);
        g.lineStyle(0.8, CM.paper, 0.6); g.strokeEllipse(-0.7, -40.7, 310, 98); g.strokeEllipse(-0.7, -40.7, 286, 78);
        for (const xx of [-139, 139]) rivet(xx, -12);
        break;
      }
      case 'radio': {
        plate(-120, -240, 240, 240, CM.woodDark, 58, 71);
        plate(-112, -232, 224, 224, CM.wood, 54, 72);
        plate(-99, -214, 198, 114, CM.copperDark, 45, 79);
        plate(-90, -207, 180, 99, CM.ink, 40, 82);
        g.lineStyle(0.8, CM.woodLight, 0.48);
        for (let yy = -188; yy <= -118; yy += 6) g.lineBetween(-74, yy, 74, yy);
        for (let xx = -66; xx <= 66; xx += 7) g.lineBetween(xx, -196, xx, -117);
        for (let i = 0; i < 5; i++) plate(-82, -192 + i * 17, 164, 5, CM.brass, 2, 930 + i);
        dial(-50, -50, 26);
        for (const xx of [40, 80]) {
          circle(xx, -50, 17, CM.copperDark); circle(xx, -50, 13, CM.brass);
          g.lineStyle(1, CM.ink, 0.75);
          for (let i = 0; i < 10; i++) {
            const a = i * Math.PI / 5;
            g.lineBetween(xx + Math.cos(a) * 10, -50 + Math.sin(a) * 10, xx + Math.cos(a) * 12, -50 + Math.sin(a) * 12);
          }
          g.lineBetween(xx, -50, xx + 5, -58);
        }
        plate(14, -84, 72, 16, CM.tealDark, 3, 19);
        for (let i = 0; i < 9; i++) { g.lineStyle(0.7, CM.paper, 0.75); g.lineBetween(22 + i * 7, -80, 22 + i * 7, -74); }
        for (const xx of [-89, 89]) { rivet(xx, -88); plate(xx - 7, 0, 14, 9, CM.ink, 3, 83); }
        break;
      }
      case 'tea': {
        plate(-80, -230, 160, 230, CM.copperDark, 37, 111);
        plate(-74, -222, 148, 210, CM.copper, 32, 112);
        g.fillStyle(CM.copperLight, 0.35); g.fillEllipse(-32, -155, 23, 114);
        plate(-81, -211, 162, 12, CM.brass, 4, 37);
        plate(-82, -54, 164, 13, CM.brass, 4, 40);
        plate(-81, -12, 162, 12, CM.tealDark, 4, 601);
        for (const yy of [-205, -48]) for (let xx = -66; xx <= 66; xx += 22) rivet(xx, yy, 2.1);
        drawCopperPipe(g, [[79, -180], [122, -180], [138, -166], [138, -60]], 9);
        dial(0, -120, 23);
        circle(56, -166, 11, CM.tealDark);
        g.lineStyle(2, CM.brass, 0.85); g.lineBetween(47, -166, 65, -166); g.lineBetween(56, -175, 56, -157);
        plate(-43, -241, 86, 12, CM.copperDark, 4, 29); circle(0, -247, 8, CM.woodDark);
        for (let i = 0; i < 3; i++) {
          const xx = -120 + i * 70;
          plate(xx, -26, 44, 26, CM.cream, 7, 170 + i);
          g.lineStyle(2.1, CM.inkSoft, 0.8); g.strokeCircle(xx + 45, -15, 7);
          g.lineStyle(1, CM.teal, 0.8); g.lineBetween(xx + 6, -8, xx + 38, -8);
        }
        break;
      }
      case 'bertie': {
        for (const xx of [-26, 26]) {
          plate(xx - 9, -94, 18, 82, CM.copperDark, 5, 64 + xx);
          for (let yy = -78; yy < -18; yy += 10) { g.lineStyle(2, CM.brass, 0.7); g.lineBetween(xx - 8, yy, xx + 8, yy + 3); }
          plate(xx - 22, -17, 45, 18, CM.tealDark, 6, 65 + xx);
        }
        plate(-80, -230, 160, 150, CM.copper, 18, 135);
        plate(-67, -219, 134, 125, CM.teal, 11, 136);
        plate(-51, -201, 102, 73, CM.copperDark, 8, 137);
        plate(-46, -195, 92, 60, CM.paper, 6, 138);
        for (const xx of [-64, 64]) for (const yy of [-210, -103]) rivet(xx, yy, 3.5);
        plate(-56, -320, 112, 90, CM.copper, 17, 133);
        plate(-46, -311, 92, 70, CM.teal, 11, 134);
        for (const xx of [-24, 24]) {
          circle(xx, -280, 19, CM.brass); circle(xx, -280, 15, CM.cream); circle(xx, -279, 7, CM.ink);
          g.fillStyle(CM.cream, 0.85); g.fillCircle(xx - 2, -282, 2.4);
        }
        g.lineStyle(2, CM.ink, 1); g.lineBetween(-16, -252, 16, -252);
        for (let xx = -9; xx <= 9; xx += 6) g.lineBetween(xx, -256, xx, -248);
        for (const xx of [-42, 42]) rivet(xx, -303, 2.5);
        plate(-16, -332, 32, 13, CM.brass, 4, 191);
        circle(0, -343, 9, CM.glow);
        break;
      }
      case 'orrery': {
        drawTimber(g, -120, -50, 240, 50, 201, CM.woodDark);
        plate(-114, -44, 228, 26, CM.wood, 5, 202);
        plate(-122, -14, 244, 14, CM.tealDark, 4, 203);
        for (const xx of [-108, 108]) rivet(xx, -30, 3);
        plate(-9, -201, 18, 151, CM.brass, 2, 204);
        for (let yy = -180; yy < -64; yy += 17) { g.lineStyle(0.8, CM.ink, 0.4); g.lineBetween(-8, yy, 8, yy + 2); }
        for (const yy of [-60, -76, -93]) circle(0, yy, 12, CM.copperDark);
        g.lineStyle(1.2, CM.brass, 0.7);
        for (const r of [50, 80, 115, 150]) g.strokeEllipse(0, -210, r * 2, r * 0.7);
        for (let i = 0; i < 24; i++) {
          const a = i * Math.PI / 12;
          g.lineStyle(1, CM.ink, 0.6); g.lineBetween(Math.cos(a) * 146, -210 + Math.sin(a) * 51, Math.cos(a) * 152, -210 + Math.sin(a) * 53);
        }
        break;
      }
      case 'tower': {
        plate(-90, -420, 180, 420, CM.paperDark, 2, 303);
        g.lineStyle(0.8, CM.inkSoft, 0.65);
        for (let row = 0; row < 21; row++) {
          const yy = -415 + row * 20;
          g.lineBetween(-89, yy, 89, yy + 1);
          for (let xx = -88 + (row % 2) * 25; xx < 89; xx += 50) g.lineBetween(xx, yy, xx + 1, yy + 19);
        }
        for (const xx of [-83, 83]) {
          drawTimber(g, xx - 5, -419, 10, 413, 309 + xx, CM.woodDark);
          for (let yy = -398; yy < -5; yy += 40) rivet(xx, yy, 2);
        }
        g.fillStyle(CM.tealDark, 1); g.fillTriangle(-110, -420, 0, -540, 110, -420);
        g.lineStyle(1.8, CM.ink, 0.95); g.strokeTriangle(-110, -420, 0, -540, 110, -420);
        for (let row = 0; row < 6; row++) {
          const yy = -523 + row * 18;
          const half = 13 + row * 16;
          g.lineStyle(0.85, CM.paperDark, 0.45); g.lineBetween(-half, yy, half, yy);
          for (let xx = -half + 5; xx < half; xx += 18) g.lineBetween(xx, yy, xx - 5, yy + 14);
        }
        plate(-41, -384, 82, 74, CM.woodDark, 30, 301);
        plate(-34, -378, 68, 67, CM.ink, 25, 302);
        g.lineStyle(2, CM.brass, 0.7); g.lineBetween(-35, -321, 35, -321);
        dial(0, -250, 55);
        plate(-30, -70, 60, 70, CM.woodDark, 25, 319);
        for (let xx = -20; xx <= 20; xx += 10) { g.lineStyle(0.8, CM.paperDark, 0.3); g.lineBetween(xx, -47, xx, -2); }
        plate(-35, -15, 70, 7, CM.brass, 1, 311);
        rivet(20, -30, 3);
        drawLeafSprig(g, -86, -185, 135, 317, 0.8);
        drawLeafSprig(g, 85, -109, 76, 318, 0.8);
        break;
      }
      default:
        drawSmallObject(g, this.id, 0, -60, 1.6);
    }
  }

  private drawLive(): void {
    const L = this.live;
    L.clear();
    if (this.painted) { this.drawPaintedLive(); return; }
    const t = this.t;
    const perf = this.performing > 0;
    switch (this.id) {
      case 'clock': {
        const m = this.working ? t * 1.2 : 0.6;
        L.lineStyle(5, CM.ink, 1);
        L.lineBetween(0, -140, Math.sin(m) * 46, -140 - Math.cos(m) * 46);
        L.lineStyle(7, CM.ink, 1);
        L.lineBetween(0, -140, Math.sin(m / 12 + 2) * 30, -140 - Math.cos(m / 12 + 2) * 30);
        // pendulum
        const sw = this.working ? Math.sin(t * 3) * 0.35 : 0;
        L.lineStyle(4, CM.brass, 1);
        L.lineBetween(0, -10, Math.sin(sw) * 80, -10 + Math.cos(sw) * 80);
        L.fillStyle(CM.brass, 1);
        const bx = Math.sin(sw) * 80, by = -10 + Math.cos(sw) * 80;
        L.fillCircle(bx, by, 14);
        L.lineStyle(1.3, CM.ink, 0.95); L.strokeCircle(bx, by, 14);
        L.lineStyle(0.9, CM.paper, 0.6); L.strokeCircle(bx - 1, by - 1, 10);
        // weights
        for (const xx of [-50, 50]) {
          const yy = 30 + (this.working ? Math.sin(t * 0.3) * 6 * -Math.sign(xx) : 20);
          L.lineStyle(1.2, CM.ink, 0.85); L.lineBetween(xx, -18, xx, yy - 20);
          L.fillStyle(CM.copperDark, 1); L.fillEllipse(xx, yy, 18, 44);
          L.lineStyle(1.2, CM.ink, 0.95); L.strokeEllipse(xx, yy, 18, 44);
          for (let k = 0; k < 6; k++) {
            L.lineStyle(0.8, CM.brass, 0.55); L.lineBetween(xx - 6, yy - 14 + k * 5, xx + 6, yy - 11 + k * 5);
          }
        }
        if (perf) {
          const pop = Math.min(1, (4 - this.performing) * 3) * Math.abs(Math.sin(t * 4));
          L.fillStyle(CM.wood, 1);
          L.fillCircle(0, -277 - pop * 26, 18);
          L.fillStyle(CM.brass, 1);
          L.fillTriangle(16, -280 - pop * 26, 16, -270 - pop * 26, 34, -276 - pop * 26);
          L.fillStyle(CM.ink, 1);
          L.fillCircle(6, -282 - pop * 26, 3);
        }
        break;
      }
      case 'musicbox': {
        const open = this.working ? Math.min(1, t) : 0;
        const lid = [v(-136, -136), v(136, -136), v(136, -136 - 120 * open), v(-136, -136 - 120 * open)];
        L.fillStyle(CM.tealDark, 1); L.fillPoints(lid, true);
        L.lineStyle(1.5, CM.ink, 0.95); L.strokePoints(lid, true, true);
        if (open > 0.1) {
          L.lineStyle(1, CM.brass, 0.8); L.strokeRect(-126, -136 - 111 * open, 252, 104 * open);
          L.strokeEllipse(0, -136 - 63 * open, 130, 40 * open);
          for (let i = 0; i < 7; i++) {
            L.lineStyle(0.6, CM.paperDark, 0.4); L.lineBetween(-100 + i * 29, -136 - 91 * open, -87 + i * 29, -136 - 75 * open);
          }
        }
        if (open > 0.5) {
          L.fillStyle(CM.copper, 1);
          const spin = Math.cos(t * 3);
          L.fillEllipse(0, -170, 30 * Math.abs(spin) + 6, 50);
          L.fillCircle(0, -205, 14);
          L.lineStyle(1.2, CM.ink, 0.9); L.strokeEllipse(0, -170, 30 * Math.abs(spin) + 6, 50); L.strokeCircle(0, -205, 14);
          L.fillStyle(CM.paper, 1);
          L.fillEllipse(0, -144, 60, 10);
          L.lineStyle(0.9, CM.ink, 0.85); L.strokeEllipse(0, -144, 60, 10);
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
          L.fillStyle(i === 0 ? CM.teal : [CM.copper, CM.brass, CM.teal][i - 1], 1);
          L.fillRoundedRect(x - 26, y - 34, 52, 30, 6);
          L.lineStyle(1.3, CM.ink, 0.95); L.strokeRoundedRect(x - 26, y - 34, 52, 30, 6);
          L.lineStyle(1, CM.paper, 0.6); L.lineBetween(x - 21, y - 31, x + 21, y - 31);
          L.lineStyle(0.8, CM.ink, 0.35); L.lineBetween(x - 18, y - 23, x - 4, y - 27);
          L.fillStyle(CM.brass, 1); L.fillCircle(x - 21, y - 11, 1.6); L.fillCircle(x + 21, y - 11, 1.6);
          L.fillStyle(CM.ink, 1);
          L.fillCircle(x - 14, y - 2, 7);
          L.fillCircle(x + 14, y - 2, 7);
          L.lineStyle(1.1, CM.brass, 0.85); L.strokeCircle(x - 14, y - 2, 5); L.strokeCircle(x + 14, y - 2, 5);
          L.lineStyle(2, CM.copperDark, 0.9); L.lineBetween(x - 14, y - 2, x + 14, y - 2);
          if (i === 0) {
            L.fillStyle(CM.ink, 1);
            L.fillRect(x + 8, y - 50, 10, 18);
            L.fillStyle(CM.brass, 1); L.fillRect(x + 6, y - 50, 14, 4);
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
        L.lineStyle(3, CM.copperDark, 1);
        const a = this.working ? -0.8 + Math.sin(t * 2) * 0.2 : 0.9;
        L.lineBetween(0, -120, Math.cos(a) * 20, -120 + Math.sin(a) * 20);
        break;
      }
      case 'bertie': {
        const sway = this.working ? Math.sin(t * 4) * 0.5 : 0.2;
        for (const side of [-1, 1]) {
          const hx = side * (80 + Math.cos(sway) * 60);
          const hy = -210 + Math.sin(sway) * 70 - 30;
          L.lineStyle(16, CM.ink, 1); L.lineBetween(side * 80, -210, hx, hy);
          L.lineStyle(12, CM.copperDark, 1); L.lineBetween(side * 80, -210, hx, hy);
          L.lineStyle(2, CM.copperLight, 0.6); L.lineBetween(side * 80 - 2, -213, hx - 2, hy - 3);
          L.fillStyle(CM.brass, 1); L.fillCircle(side * 80, -210, 9);
          L.fillStyle(CM.tealDark, 1); L.fillCircle(hx, hy, 12);
          L.lineStyle(1.4, CM.ink, 1); L.strokeCircle(hx, hy, 12);
          L.lineStyle(1, CM.paper, 0.45); L.strokeCircle(hx - 0.7, hy - 0.7, 9);
        }
        for (let i = 0; i < 4; i++) {
          L.fillStyle(CM.ink, 1); L.fillCircle(-36 + i * 24, -165, 9.5);
          L.fillStyle([CM.brass, CM.sky, CM.mossLight, CM.copperLight][i], this.working && Math.floor(t * 4 + i) % 2 ? 1 : 0.3);
          L.fillCircle(-36 + i * 24, -165, 8);
          L.fillStyle(CM.cream, 0.55); L.fillCircle(-38 + i * 24, -167, 2);
        }
        break;
      }
      case 'orrery': {
        const sunGlow = this.working ? 0.9 : 0.35;
        L.fillStyle(0xfff3b0, sunGlow * 0.3);
        L.fillCircle(0, -210, 50);
        L.fillStyle(CM.glow, sunGlow);
        L.fillCircle(0, -210, 22);
        L.lineStyle(1.1, CM.copperDark, 0.8); L.strokeCircle(0, -210, 22);
        const planets: Array<[number, number, number, number]> = [
          [50, 2.2, 6, CM.slate],
          [80, 1.4, 9, CM.paperDark],
          [115, 1, 10, CM.teal],
          [150, 0.6, 8, CM.copper],
        ];
        for (const [r, sp, s, c] of planets) {
          const a = this.working ? t * sp : r;
          const px = Math.cos(a) * r;
          const py = -210 + Math.sin(a) * r * 0.35;
          L.lineStyle(2, CM.brass, 0.7);
          L.lineBetween(0, -210, px, py);
          L.fillStyle(c, 1);
          L.fillCircle(px, py, s);
          L.lineStyle(1, CM.ink, 0.95); L.strokeCircle(px, py, s);
          L.fillStyle(CM.cream, 0.6); L.fillEllipse(px - s * 0.3, py - s * 0.4, s * 0.75, s * 0.3);
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
        L.lineStyle(5, CM.ink, 1);
        L.lineBetween(0, -250, Math.sin(m) * 46, -250 - Math.cos(m) * 46);
        L.lineStyle(7, CM.ink, 1);
        L.lineBetween(0, -250, Math.sin(m / 12) * 30, -250 - Math.cos(m / 12) * 30);
        const swing = perf ? Math.sin(t * 5) * 0.5 : 0;
        L.fillStyle(CM.brass, 1);
        L.fillTriangle(-26 + swing * 20, -320, 26 + swing * 20, -320, swing * 10, -372);
        L.fillCircle(swing * 10, -360, 16);
        L.lineStyle(1.3, CM.ink, 0.9); L.strokeTriangle(-26 + swing * 20, -320, 26 + swing * 20, -320, swing * 10, -372);
        L.lineStyle(1.3, CM.paper, 0.65); L.lineBetween(-21 + swing * 20, -325, 21 + swing * 20, -325);
        break;
      }
      default:
        if (this.working) {
          L.fillStyle(0xfff3b0, 0.3 + Math.sin(t * 4) * 0.2);
          L.fillCircle(0, -60, 70);
        }
    }
  }

  /** Repaired illustrations retain live hands, steam, notes, motion and light. */
  private drawPaintedLive(): void {
    const image = this.painted!, g = this.live, t = this.t;
    const w = image.displayWidth, h = image.displayHeight;
    image.x = this.working && this.id === 'train' ? Math.sin(t * .8) * 28 : 0;
    image.y = this.working && ['train', 'bertie'].includes(this.id) ? -Math.abs(Math.sin(t * 4)) * 4 : 0;
    image.rotation = this.working && this.id === 'bertie' ? Math.sin(t * 4) * .045 : 0;
    if (this.id === 'clock' || this.id === 'tower') {
      const tower = this.id === 'tower', x = tower ? w * .045 : w * .025;
      const y = -h * (tower ? .575 : .52), r = h * (tower ? .064 : .125);
      // The dial is a live layer, so baked illustration hands never double up.
      g.fillStyle(CM.paper, 1).fillCircle(x, y, r * .87);
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        g.lineStyle(1, CM.ink, .85).lineBetween(x + Math.cos(a) * r * .74, y + Math.sin(a) * r * .74, x + Math.cos(a) * r * .85, y + Math.sin(a) * r * .85);
      }
      const m = this.working ? t * .9 : .6;
      g.lineStyle(2.6, CM.ink, 1).lineBetween(x, y, x + Math.sin(m) * r * .7, y - Math.cos(m) * r * .7);
      g.lineStyle(3.6, CM.ink, 1).lineBetween(x, y, x + Math.sin(m / 12 + 2) * r * .47, y - Math.cos(m / 12 + 2) * r * .47);
      g.fillStyle(CM.brass, 1).fillCircle(x, y, 3);
    }
    if (!this.working) return;
    if (this.id === 'tea' || this.id === 'train') {
      for (let i = 0; i < 4; i++) {
        const rise = (t * 36 + i * 21) % 85;
        g.fillStyle(CM.cream, .45 * (1 - rise / 85));
        g.fillEllipse(w * (this.id === 'train' ? .19 : .04) + Math.sin(t * 2 + i) * 8, -h * .9 - rise, 10 + rise * .18, 13 + rise * .21);
      }
    }
    if (this.id === 'musicbox' || this.id === 'radio') {
      for (let i = 0; i < 4; i++) {
        const rise = (t * 30 + i * 30) % 125, x = w * .3 + Math.sin(t + i) * 12, y = -h * .5 - rise;
        g.fillStyle(CM.paper, .85 * (1 - rise / 125)).fillEllipse(x, y, 7, 5).fillRect(x + 2, y - 13, 2, 13);
      }
    }
    if (this.id === 'orrery') {
      g.fillStyle(CM.glow, .13 + Math.sin(t * 2) * .04).fillCircle(0, -h * .62, h * .12);
      for (let i = 0; i < 7; i++) {
        const a = t * .5 + i * 2.1;
        g.fillStyle(CM.paper, .55 + Math.sin(t * 3 + i) * .35);
        star(g, Math.cos(a) * w * .46, -h * .68 + Math.sin(a) * h * .2, 3);
      }
    }
    if (this.performing > 0) {
      for (let i = 0; i < 6; i++) {
        g.fillStyle(CM.glow, .6 + Math.sin(t * 5 + i) * .35);
        star(g, Math.cos(i * 2.1 + t * .3) * w * .56, -h * .5 + Math.sin(i * 1.7 + t) * h * .38, 4);
      }
    }
  }
}

/** Small etched object shapes, shared by the job board, shelf and attic. */
function objectPrimitives(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, id: string) {
  const seed = [...id].reduce((n, c) => n * 31 + c.charCodeAt(0), 71) >>> 0;
  const R = (dx: number, dy: number, w: number, h: number, c: number, r = 6) => {
    const xx = x + dx * s, yy = y + dy * s;
    const rr = Math.min(r, w / 2, h / 2) * s;
    g.fillStyle(c, 1); g.fillRoundedRect(xx, yy, w * s, h * s, rr);
    g.lineStyle(1.1 * s, CM.ink, 0.95); g.strokeRoundedRect(xx, yy, w * s, h * s, rr);
    if (w > 14 && h > 12) {
      const ix = Math.max(3, r * 0.35), iy = Math.max(3, r * 0.5);
      drawPatina(g, xx + ix * s, yy + iy * s, (w - ix * 2) * s, (h - iy * 2) * s, seed + dx + dy, 1.5);
      g.lineStyle(0.7 * s, CM.cream, 0.4); g.lineBetween(xx + rr, yy + 2 * s, xx + (w - r) * s, yy + 2 * s);
    }
    if (w >= 50 && h >= 36) for (const px of [xx + 5 * s, xx + (w - 5) * s]) {
      g.fillStyle(CM.ink, 0.85); g.fillCircle(px, yy + 5 * s, 1.7 * s);
      g.fillStyle(CM.brass, 1); g.fillCircle(px - 0.3 * s, yy + 4.7 * s, 1.1 * s);
    }
  };
  const C = (dx: number, dy: number, r: number, c: number) => {
    const cx = x + dx * s, cy = y + dy * s;
    g.fillStyle(c, 1); g.fillCircle(cx, cy, r * s);
    g.lineStyle(1.05 * s, CM.ink, 0.9); g.strokeCircle(cx, cy, r * s);
    if (r > 8) {
      g.lineStyle(0.8 * s, CM.cream, 0.55);
      g.beginPath(); g.arc(cx - s * 0.5, cy - s * 0.5, (r - 2) * s, Math.PI, Math.PI * 1.8); g.strokePath();
      for (let i = 0; i < 5; i++) {
        const a = i * 2.1, rr = (0.28 + i * 0.1) * r;
        const xx = cx + Math.cos(a) * rr * s, yy = cy + Math.sin(a) * rr * s;
        g.lineStyle(0.6 * s, CM.ink, 0.18); g.lineBetween(xx, yy, xx + 3 * s, yy - s);
      }
    }
  };
  const T = (pts: number[], c: number) => {
    const vs: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < pts.length; i += 2) vs.push(v(x + pts[i] * s, y + pts[i + 1] * s));
    g.fillStyle(c, 1); g.fillPoints(vs, true);
    g.lineStyle(1.1 * s, CM.ink, 0.95); g.strokePoints(vs, true, true);
  };
  return { R, C, T };
}

/** Small icons for Quick Fix and Attic objects (and anything without a big drawing). */
export function drawSmallObject(g: Phaser.GameObjects.Graphics, id: string, x: number, y: number, s = 1): void {
  if (paintedObject(g, id, x, y, s)) return;
  const { R, C, T } = objectPrimitives(g, x, y, s, id);
  switch (id) {
    // the eight Great Repair objects, as small icons (job board, shelf, padlocks)
    case 'clock':
      T([-44, -20, 0, -56, 44, -20], CM.woodDark);
      R(-36, -22, 72, 70, CM.wood);
      C(0, 6, 22, CM.paper);
      g.lineStyle(3 * s, CM.ink, 1);
      g.lineBetween(x, y + 6 * s, x, y - 10 * s);
      g.lineBetween(x, y + 6 * s, x + 10 * s, y + 6 * s);
      R(-8, -40, 16, 12, CM.ink, 3);
      C(0, -34, 5, CM.brass);
      R(-14, 48, 4, 14, CM.brass, 1);
      R(10, 48, 4, 18, CM.brass, 1);
      break;
    case 'musicbox':
      R(-44, -6, 88, 46, CM.teal, 6);
      R(-48, -20, 96, 16, CM.tealDark, 6);
      C(0, 16, 9, CM.brass);
      g.fillStyle(CM.paper, 1);
      g.fillEllipse(x, y - 34 * s, 16 * s, 26 * s);
      C(0, -48, 7, CM.copper);
      break;
    case 'train':
      R(-46, -10, 70, 36, CM.copperDark, 6);
      R(-10, -36, 30, 30, CM.copperDark, 4);
      R(-40, -24, 16, 16, 0x2b2b33, 3);
      R(24, 0, 24, 26, CM.teal, 4);
      C(-30, 30, 10, 0x2b2b33);
      C(0, 30, 10, 0x2b2b33);
      C(36, 30, 8, 0x2b2b33);
      break;
    case 'radio':
      R(-46, -36, 92, 72, CM.wood, 14);
      R(-36, -26, 44, 50, 0xc89a62, 8);
      for (let i = 0; i < 4; i++) R(-32, -20 + i * 11, 36, 3, CM.wood, 1);
      C(26, -10, 9, CM.brass);
      C(26, 16, 7, CM.brass);
      break;
    case 'tea':
      R(-30, -20, 60, 60, CM.copper, 10);
      g.fillStyle(CM.copperDark, 1);
      g.fillEllipse(x, y - 22 * s, 64 * s, 18 * s);
      R(-6, -46, 12, 22, CM.brass, 3);
      T([30, -6, 54, -24, 56, -16, 34, 6], CM.copperDark);
      C(0, 10, 10, CM.teal);
      break;
    case 'bertie':
      R(-26, -10, 52, 50, CM.tealDark, 8);
      R(-20, -48, 40, 36, CM.tealLight, 8);
      C(-9, -32, 6, CM.brass);
      C(9, -32, 6, CM.brass);
      R(-40, -6, 14, 34, CM.tealDark, 6);
      R(26, -6, 14, 34, CM.tealDark, 6);
      C(0, 12, 8, CM.copperDark);
      break;
    case 'orrery':
      C(0, 0, 16, CM.brass);
      g.lineStyle(2 * s, CM.brass, 1);
      g.strokeEllipse(x, y, 90 * s, 34 * s);
      g.strokeEllipse(x, y, 60 * s, 22 * s);
      C(44, 0, 6, CM.sky);
      C(-28, 8, 5, CM.copper);
      R(-4, 16, 8, 26, CM.wood, 2);
      R(-22, 40, 44, 8, CM.wood, 3);
      break;
    case 'tower':
      R(-20, -40, 40, 92, CM.paperDark, 2);
      T([-28, -40, 0, -66, 28, -40], CM.tealDark);
      C(0, -18, 13, CM.paper);
      g.lineStyle(2 * s, CM.ink, 1);
      g.lineBetween(x, y - 18 * s, x, y - 27 * s);
      g.lineBetween(x, y - 18 * s, x + 6 * s, y - 18 * s);
      R(-8, 30, 16, 22, 0x5a3a22, 6);
      break;
    case 'door':
      R(-30, -50, 60, 100, CM.wood);
      C(18, 0, 5, CM.brass);
      R(-36, -40, 8, 14, CM.tealLight, 2);
      R(-36, 20, 8, 14, CM.tealLight, 2);
      break;
    case 'mouse':
      g.fillStyle(CM.slate, 1);
      g.fillEllipse(x, y + 10 * s, 70 * s, 40 * s);
      C(26, -2, 12, CM.slate);
      C(30, -12, 8, 0xf0b8c0);
      C(34, 0, 3, CM.ink);
      R(-46, 14, 30, 3, CM.brass, 1);
      C(-48, 0, 8, CM.brass);
      break;
    case 'doorbell':
      C(0, 0, 30, CM.brass);
      C(0, 0, 14, 0xf6d27a);
      R(-6, -46, 12, 18, 0x7a5413, 2);
      break;
    case 'bikebell':
      C(0, 0, 30, CM.sky);
      C(-6, -6, 12, 0xf1f3f5);
      R(-40, 24, 80, 8, CM.inkSoft, 3);
      break;
    case 'timer':
      C(0, 0, 32, CM.copper);
      C(0, 0, 22, 0xfff6dc);
      R(-2, -18, 4, 18, CM.ink, 1);
      break;
    case 'pepper':
      R(-18, -40, 36, 80, CM.wood, 10);
      C(0, -48, 14, CM.woodDark);
      break;
    case 'jack':
      R(-36, -20, 72, 60, CM.copper, 4);
      R(-36, -20, 72, 10, CM.brass, 2);
      C(0, -44, 16, 0xf2c9a5);
      R(30, 0, 18, 6, CM.brass, 2);
      break;
    case 'piano':
      R(-50, -30, 100, 50, CM.copper, 6);
      for (let i = 0; i < 7; i++) R(-44 + i * 13, -2, 11, 20, 0xffffff, 1);
      break;
    case 'cat':
      C(0, 10, 32, 0xffffff);
      C(0, -26, 22, 0xffffff);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(x - 20 * s, y - 36 * s, x - 10 * s, y - 56 * s, x - 2 * s, y - 40 * s);
      g.fillTriangle(x + 20 * s, y - 36 * s, x + 10 * s, y - 56 * s, x + 2 * s, y - 40 * s);
      R(20, -40, 12, 30, 0xffffff, 6);
      C(-8, -28, 3, CM.ink);
      C(8, -28, 3, CM.ink);
      C(0, 12, 8, CM.brass);
      break;
    case 'car':
      R(-46, -20, 92, 30, CM.teal, 10);
      R(-24, -36, 46, 20, CM.sky, 8);
      C(-26, 14, 11, CM.ink);
      C(26, 14, 11, CM.ink);
      break;
    case 'boat':
      g.fillStyle(CM.brass, 1);
      g.fillPoints([v(x - 50 * s, y), v(x + 50 * s, y), v(x + 36 * s, y + 26 * s), v(x - 36 * s, y + 26 * s)], true);
      R(-10, -36, 8, 36, CM.wood, 2);
      C(40, 6, 16, CM.copper);
      break;
    case 'whistle':
      R(-40, -12, 70, 24, CM.sky, 12);
      C(30, 0, 16, CM.sky);
      break;
    case 'flashlight':
      R(-44, -14, 70, 28, CM.ink, 6);
      R(22, -20, 22, 40, CM.sky, 6);
      break;
    case 'desklamp':
      R(-30, 30, 60, 10, CM.teal, 4);
      R(-4, -20, 8, 50, CM.teal, 2);
      g.fillStyle(CM.teal, 1);
      g.fillTriangle(x - 30 * s, y - 20 * s, x + 30 * s, y - 20 * s, x, y - 50 * s);
      break;
    case 'vane':
      R(-3, -40, 6, 80, CM.ink, 2);
      g.fillStyle(CM.ink, 1);
      g.fillTriangle(x + 40 * s, y - 34 * s, x + 20 * s, y - 44 * s, x + 20 * s, y - 24 * s);
      R(-40, -38, 60, 8, CM.ink, 2);
      break;
    case 'sprinkler':
      C(0, 10, 26, CM.moss);
      R(-4, -30, 8, 40, CM.tealLight, 2);
      g.fillStyle(CM.sky, 1);
      for (let i = 0; i < 5; i++) g.fillCircle(x + (i - 2) * 16 * s, y - 40 * s - Math.abs(i - 2) * -6 * s, 4 * s);
      break;
    case 'metronome':
      g.fillStyle(CM.wood, 1);
      g.fillTriangle(x - 30 * s, y + 40 * s, x + 30 * s, y + 40 * s, x, y - 50 * s);
      R(-2, -40, 4, 60, CM.brass, 1);
      C(0, -20, 6, CM.brass);
      break;
    case 'coinbank':
      C(0, 0, 36, CM.copperLight);
      C(-12, -10, 6, CM.ink);
      C(12, -10, 6, CM.ink);
      R(-12, -40, 24, 6, 0x5a3a22, 2);
      break;
    case 'gumball':
      C(0, -14, 34, CM.sky);
      for (let i = 0; i < 6; i++) C(-16 + (i % 3) * 16, -20 + Math.floor(i / 3) * 14, 6, [CM.copper, CM.brass, CM.mossLight][i % 3]);
      R(-24, 18, 48, 30, CM.copperDark, 4);
      break;
    case 'robot':
      R(-26, -10, 52, 50, CM.tealLight, 8);
      R(-20, -44, 40, 32, CM.sky, 8);
      C(-8, -28, 5, CM.sky);
      C(8, -28, 5, CM.sky);
      break;
    case 'top':
      g.fillStyle(CM.copper, 1);
      g.fillTriangle(x - 34 * s, y - 10 * s, x + 34 * s, y - 10 * s, x, y + 36 * s);
      R(-4, -36, 8, 26, CM.wood, 2);
      R(-34, -16, 68, 10, CM.brass, 4);
      break;
    case 'nightlight':
      R(-14, -40, 28, 70, 0xffffff, 4);
      R(-14, -20, 28, 10, CM.copper, 1);
      R(-14, 4, 28, 10, CM.copper, 1);
      C(0, -48, 12, CM.brass);
      break;
    case 'kaleidoscope':
      R(-46, -14, 92, 28, CM.slate, 12);
      C(46, 0, 14, CM.sky);
      break;
    case 'bird':
      g.fillStyle(CM.moss, 1);
      g.fillEllipse(x, y, 60 * s, 40 * s);
      C(24, -18, 14, CM.moss);
      g.fillStyle(CM.copperLight, 1);
      g.fillTriangle(x + 36 * s, y - 20 * s, x + 36 * s, y - 14 * s, x + 50 * s, y - 17 * s);
      R(-10, 18, 20, 16, CM.brass, 2);
      break;
    case 'coinbank-monkey':
      C(0, 0, 30, CM.wood);
      break;
    default:
      drawAtticIcon(g, id, x, y, s);
  }
}

function drawAtticIcon(g: Phaser.GameObjects.Graphics, id: string, x: number, y: number, s: number): void {
  const { R, C } = objectPrimitives(g, x, y, s, id);
  const wood = CM.woodDark;
  const brass = CM.brass;
  switch (id) {
    case 'typewriter':
      R(-46, -10, 92, 40, CM.ink, 8);
      R(-30, -34, 60, 26, CM.paper, 2);
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
      R(-44, -40, 88, 80, id === 'calliope' ? CM.copperDark : wood, 6);
      for (let i = 0; i < 6; i++) R(-38 + i * 13, -60 - (i % 3) * 8, 9, 30 + (i % 3) * 8, brass, 3);
      break;
    case 'calculator':
    case 'register':
      R(-40, -30, 80, 66, id === 'register' ? brass : CM.inkSoft, 6);
      for (let i = 0; i < 9; i++) C(-22 + (i % 3) * 22, -10 + Math.floor(i / 3) * 16, 5, 0xffffff);
      break;
    case 'pinball':
      R(-30, -50, 60, 100, CM.teal, 6);
      C(0, -20, 10, CM.brass);
      C(-12, 10, 6, CM.copper);
      C(12, 10, 6, CM.mossLight);
      break;
    case 'sewing':
      R(-46, 10, 92, 14, wood, 4);
      R(-30, -40, 60, 16, CM.ink, 6);
      R(16, -40, 14, 50, CM.ink, 4);
      C(-30, -18, 14, brass);
      break;
    case 'camera':
    case 'projector':
      R(-40, -26, 80, 52, CM.ink, 6);
      C(20, 0, 18, CM.tealLight);
      C(20, 0, 10, CM.sky);
      break;
    case 'birdcage':
      g.lineStyle(3 * s, brass, 1);
      for (let i = -3; i <= 3; i++) g.lineBetween(x + i * 10 * s, y - 40 * s, x + i * 10 * s, y + 30 * s);
      g.strokeEllipse(x, y - 40 * s, 70 * s, 20 * s);
      C(0, 0, 12, CM.brass);
      break;
    case 'telegraph':
      R(-40, 10, 80, 20, wood, 4);
      R(-30, -6, 50, 10, brass, 3);
      C(26, -8, 8, CM.ink);
      break;
    case 'zoetrope':
      R(-40, -30, 80, 50, CM.copperDark, 4);
      for (let i = 0; i < 6; i++) R(-34 + i * 12, -24, 4, 16, CM.ink, 1);
      R(-4, 20, 8, 20, CM.ink, 2);
      break;
    case 'marbleclock':
      R(-40, -50, 80, 100, wood, 6);
      g.lineStyle(3 * s, brass, 1);
      for (let i = 0; i < 4; i++) g.lineBetween(x - 34 * s, y + (-36 + i * 24) * s, x + 34 * s, y + (-30 + i * 24) * s);
      C(-20, -40, 5, CM.sky);
      break;
    case 'waterclock':
      C(0, -26, 26, CM.sky);
      R(-6, -2, 12, 30, CM.tealLight, 3);
      C(0, 40, 22, CM.sky);
      break;
    case 'writer':
      C(0, -30, 18, 0xf2c9a5);
      R(-20, -12, 40, 50, CM.teal, 8);
      R(18, 10, 4, 30, CM.ink, 1);
      break;
    case 'barometer':
      C(0, 0, 36, wood);
      C(0, 0, 28, CM.paper);
      g.lineStyle(3 * s, CM.ink, 1);
      g.lineBetween(x, y, x + 18 * s, y - 14 * s);
      break;
    case 'carousel':
      g.fillStyle(CM.copper, 1);
      g.fillTriangle(x - 50 * s, y - 20 * s, x + 50 * s, y - 20 * s, x, y - 56 * s);
      R(-46, 20, 92, 10, brass, 3);
      for (let i = 0; i < 3; i++) R(-34 + i * 28, -20, 4, 40, brass, 1);
      break;
    case 'divingpump':
      C(0, -10, 30, brass);
      C(0, -10, 16, CM.sky);
      R(-30, 20, 60, 20, CM.inkSoft, 4);
      break;
    case 'telescope':
      g.fillStyle(brass, 1);
      g.fillPoints([v(x - 46 * s, y + 10 * s), v(x + 40 * s, y - 30 * s), v(x + 46 * s, y - 18 * s), v(x - 40 * s, y + 22 * s)], true);
      R(-4, 10, 8, 34, wood, 2);
      break;
    case 'theatre':
      R(-46, -40, 92, 80, CM.copperDark, 6);
      R(-34, -28, 68, 50, CM.ink, 2);
      C(0, 0, 10, CM.brass);
      break;
    case 'lighthouselens':
      for (let i = 0; i < 4; i++) {
        g.lineStyle(4 * s, 0xb2f2ff, 0.8);
        g.strokeCircle(x, y, (36 - i * 8) * s);
      }
      C(0, 0, 6, CM.brass);
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
