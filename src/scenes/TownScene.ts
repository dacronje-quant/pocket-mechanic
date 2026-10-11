/**
 * The Window Seat (GDD §13.2): Brasswick on the map. The town's restoration is
 * the progress bar — each destination displays the actual repaired object,
 * with its own live animation and repeatable performance when pressed.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { withArt, coverImage } from '../art/generated';
import { CM, drawPatina } from '../art/copperMoss';
import { badge } from '../art/portraits';
import { MachineArt } from '../art/objects';
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

const POSTCARD_HOME = ['stage-bakery', 'room-home', 'stage-party', 'stage-harbor', 'stage-cafe', 'stage-fair', 'stage-classroom', 'stage-tower'];

export class TownScene extends MetaScene {
  private night = false;
  private machines = new Map<number, MachineArt>();
  private postcard?: Phaser.GameObjects.Container;
  private visitSequence = 0;

  constructor() {
    super('town');
  }

  protected build(): void {
    const p = profile();
    this.night = windDownActive();
    this.machines.clear();
    this.postcard = undefined;
    this.drawMap();
    LANDMARKS.forEach((l) => this.landmark(l, REPAIRS[l.repair - 1]));
    this.music('shop', Math.min(1, p.repairs.length / 8 + 0.2));
    this.backButton();
    this.heading('Brasswick');
    if (setFlag(p, 'town')) persist();
    this.time.delayedCall(400, () => this.line('shop.window'));
  }

  private drawMap(): void {
    const g = this.add.graphics().setDepth(0);
    const n = this.night;
    g.fillGradientStyle(n ? 0x273e3c : 0xbbc9c2, n ? 0x273e3c : 0xbbc9c2, n ? 0x415c59 : 0xe9dcc0, n ? 0x415c59 : 0xe9dcc0, 1);
    g.fillRect(0, 0, 1280, 720);
    // hills and fields
    g.fillStyle(n ? 0x485541 : 0x969e76, 1);
    g.fillEllipse(300, 720, 1100, 700);
    g.fillEllipse(1050, 740, 1000, 640);
    g.fillStyle(n ? 0x3e4d3a : 0x798867, 1);
    g.fillEllipse(640, 760, 1500, 560);
    // the sea and harbour
    g.fillStyle(n ? 0x344f4b : 0x668c88, 1);
    g.fillRect(980, 340, 300, 380);
    g.fillStyle(n ? 0x537a72 : 0x83a49a, 1);
    for (let i = 0; i < 8; i++) g.fillEllipse(1040 + (i % 4) * 60, 400 + Math.floor(i / 4) * 140 + (i % 2) * 40, 40, 6);
    // river with a bridge
    g.lineStyle(34, n ? 0x344f4b : 0x779991, 1);
    g.beginPath();
    g.moveTo(0, 470);
    g.lineTo(300, 440);
    g.lineTo(560, 470);
    g.lineTo(760, 430);
    g.lineTo(990, 450);
    g.strokePath();
    g.fillStyle(0x856c50, 1);
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
      g.fillStyle(n ? 0x3f5541 : 0x5d7359, 1);
      g.fillCircle(x, y - 6, 16);
    }
    if (n) {
      g.fillStyle(0xf4ebd5, 0.8);
      for (let i = 0; i < 50; i++) g.fillCircle((i * 233) % 1280, (i * 71) % 220, 1.4);
    }
    // the Tick & Tinker itself, with Kip waving from the window
    this.house(g, 520, 640, 90, 80, 0xd2ba95, 0x946b53, true);
    drawPatina(g, 0, 0, 1280, 720, 2439, 1.8);
    withArt(this, 'town-map', (key) => {
      coverImage(this, key, 0, 0, 1280, 720).setDepth(0.01).setName('painted:town-map');
      g.setVisible(false);
    });
    badge(this, 565, 590, 'kip', 16).setDepth(3);
  }

  private house(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, col: number, roof: number, lit: boolean): void {
    g.fillStyle(this.night ? Phaser.Display.Color.ValueToColor(col).darken(45).color : col, 1);
    g.fillRect(x, y - h, w, h);
    g.lineStyle(1.5, CM.ink, 0.85);
    g.strokeRect(x, y - h, w, h);
    g.lineStyle(0.7, CM.ink, 0.2);
    for (let row = 0; row < 6; row++) {
      const yy = y - h + 6 + row * h / 7;
      g.lineBetween(x + 4, yy, x + w - 4, yy + 1);
    }
    g.fillStyle(roof, 1);
    g.fillTriangle(x - 10, y - h, x + w / 2, y - h - w * 0.45, x + w + 10, y - h);
    g.lineStyle(1.7, CM.ink, 0.85);
    g.strokeTriangle(x - 10, y - h, x + w / 2, y - h - w * 0.45, x + w + 10, y - h);
    g.lineStyle(0.8, CM.cream, 0.3);
    for (let k = 1; k < 7; k++) g.lineBetween(x + w / 2, y - h - w * 0.45 + 3, x - 8 + (w + 16) * k / 7, y - h - 2);
    g.fillStyle(lit ? 0xf1d391 : 0x3a4a6a, 1);
    g.fillRect(x + w * 0.18, y - h * 0.72, w * 0.24, h * 0.26);
    g.fillRect(x + w * 0.58, y - h * 0.72, w * 0.24, h * 0.26);
    g.lineStyle(1.3, CM.woodDark, 0.9);
    for (const wx of [x + w * 0.18, x + w * 0.58]) {
      g.strokeRect(wx, y - h * 0.72, w * 0.24, h * 0.26);
      g.lineBetween(wx + w * 0.12, y - h * 0.72, wx + w * 0.12, y - h * 0.46);
      g.lineBetween(wx, y - h * 0.59, wx + w * 0.24, y - h * 0.59);
    }
    g.fillStyle(0x5a3a22, 1);
    g.fillRect(x + w * 0.4, y - h * 0.38, w * 0.2, h * 0.38);
    drawPatina(g, x + 2, y - h + 2, w - 4, h - 4, Math.round(x), 1.7);
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
        this.house(g, l.x - 45, l.y + 40, 90, 100, 0xccb39d, 0x946b53, lit);
        break;
      case 3:
        this.house(g, l.x - 60, l.y + 40, 120, 80, 0xbdc7b7, 0x607a72, lit);
        g.lineStyle(3, 0x856c50, 1);
        g.strokeEllipse(l.x, l.y + 60, 160, 36);
        break;
      case 4:
        g.fillStyle(0xf4ebd5, 1);
        g.fillRect(l.x - 18, l.y - 80, 36, 140);
        g.fillStyle(0xad6b51, 1);
        for (let k = 0; k < 3; k++) g.fillRect(l.x - 18, l.y - 60 + k * 44, 36, 16);
        g.fillStyle(lit ? 0xf1d391 : 0x60736d, 1);
        g.fillRect(l.x - 14, l.y - 104, 28, 24);
        g.fillStyle(0x2b2b33, 1);
        g.fillTriangle(l.x - 22, l.y - 104, l.x, l.y - 126, l.x + 22, l.y - 104);
        break;
      case 5:
        this.house(g, l.x - 60, l.y + 40, 120, 80, 0xc6cfb0, 0x78815a, lit);
        g.fillStyle(0xf4ebd5, 1);
        g.fillRect(l.x - 64, l.y - 10, 128, 10);
        break;
      case 6:
        g.fillStyle(0xba8668, 1);
        g.fillTriangle(l.x - 80, l.y + 30, l.x, l.y - 50, l.x + 80, l.y + 30);
        g.fillStyle(0xf1d391, 1);
        g.fillTriangle(l.x - 40, l.y + 30, l.x, l.y - 50, l.x + 40, l.y + 30);
        g.lineStyle(4, 0x856c50, 1);
        g.strokeCircle(l.x + 120, l.y - 10, 50);
        break;
      case 7:
        this.house(g, l.x - 70, l.y + 40, 140, 90, 0xe8c39e, 0x537a72, lit);
        g.fillStyle(0x60736d, 1);
        g.fillCircle(l.x, l.y - 52, 18);
        break;
      case 8:
        g.fillStyle(this.night ? 0x5a5550 : 0x9a8f86, 1);
        g.fillRect(l.x - 34, l.y - 110, 68, 190);
        g.fillStyle(0x6b6560, 1);
        g.fillTriangle(l.x - 44, l.y - 110, l.x, l.y - 160, l.x + 44, l.y - 110);
        g.fillStyle(0xe9dcc0, 1);
        g.fillCircle(l.x, l.y - 70, 24);
        break;
    }
    if (!fixed) {
      g.setAlpha(0.75);
      const q = this.add.text(l.x, l.y - 30, '?', { fontFamily: 'Georgia, serif', fontSize: '40px', color: '#ffffff', stroke: '#342f29', strokeThickness: 6 }).setOrigin(0.5).setDepth(12);
      this.tweens.add({ targets: q, y: l.y - 40, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      withArt(this, 'town-map', () => q.active && q.setVisible(false));
    }
    withArt(this, 'town-map', () => {
      if (!g.active) return;
      // Illustrated pins keep destinations clear without covering the town.
      g.clear().setAlpha(1);
      g.fillStyle(CM.ink, 0.22).fillCircle(l.x + 2, l.y - 18, 44);
      g.fillStyle(CM.copperDark, 1).fillCircle(l.x, l.y - 22, 43);
      g.fillStyle(fixed ? CM.cream : CM.paperDark, 1).fillCircle(l.x, l.y - 22, 38);
      g.lineStyle(1.5, CM.brass, 1).strokeCircle(l.x, l.y - 22, 41);
      if (fixed) {
        g.fillStyle(CM.mossDark, 1).fillCircle(l.x + 29, l.y + 6, 10);
        g.lineStyle(2, CM.cream, 1);
        g.lineBetween(l.x + 24, l.y + 6, l.x + 28, l.y + 10);
        g.lineBetween(l.x + 28, l.y + 10, l.x + 35, l.y + 2);
      }
    });
    const machine = new MachineArt(this, l.x, l.y + 25, r.object, 0.27)
      .setDepth(12).setWorking(fixed).setAlpha(fixed ? 1 : 0.58)
      .setName(`town:machine:${r.object}`);
    machine.setData('repair', r.id);
    this.machines.set(r.id, machine);
    const z = this.add.zone(l.x, l.y, 170, 170).setInteractive({ useHandCursor: true }).setDepth(15)
      .setName(`town:visit:${r.id}`).setData('repair', r.id);
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
    this.machines.get(r.id)?.perform();
    this.bubble.say(r.tagline, { who: r.owner, id: `town.${r.key}` });
    const visit = ++this.visitSequence;
    this.postcard?.destroy();
    // The postcard stays beside the town, leaving every landmark centre
    // exposed so another press can replay the object immediately.
    const c = this.add.container(210, 158).setDepth(HUD - 2).setAngle(-3).setScale(0.6).setAlpha(0)
      .setName(`town:postcard:${r.key}`);
    this.postcard = c;
    c.add(card(this, 0, 0, 340, 216, 0xf4ebd5));
    const object = new MachineArt(this, 0, 86, r.object, 0.38).setWorking(true);
    c.add(object);
    let home: Phaser.GameObjects.Image | undefined;
    let authored = false;
    // Existing location art keeps visits illustrated even when the optional
    // dedicated postcard is absent from the installed art catalogue.
    withArt(this, POSTCARD_HOME[r.id - 1], (key) => {
      if (!c.active || authored || visit !== this.visitSequence) return;
      home = coverImage(this, key, -158, -96, 316, 192);
      c.addAt(home, 1);
    });
    withArt(this, `postcard-${r.key}`, (key) => {
      if (!c.active || visit !== this.visitSequence) return;
      authored = true;
      home?.destroy();
      object.setVisible(false);
      c.addAt(coverImage(this, key, -158, -96, 316, 192), 1);
    });
    c.setSize(340, 216).setInteractive();
    c.on('pointerup', () => c.destroy());
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    this.time.delayedCall(5000, () => c.active && this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() }));
  }

}
