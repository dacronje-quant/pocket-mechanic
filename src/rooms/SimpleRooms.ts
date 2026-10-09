/**
 * Three gentle rooms: the Velvet Drawer hunt (lift cushions to find things),
 * Big Bertie's Button Board (a giant busy board), and Magnus's Nest (decorate
 * a new nest; the design is kept for the epilogue).
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { speak } from '../audio/voice';
import { drawPart } from '../art/parts';
import { Portrait } from '../art/portraits';
import type { HuntItem, NestDeco } from '../content/types';
import { LINES } from '../content/story';
import { checkStamps, setFlag } from '../core/progress';
import { persist, profile } from '../core/save';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { puffAt } from './fiddles';

// ───────────────────────────── hunt ─────────────────────────────

export class HuntRoom extends RoomBase<'hunt'> {
  private covers: Phaser.GameObjects.Container[] = [];
  private items: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super('room-hunt');
  }

  protected build(): void {
    this.covers = [];
    this.items = [];
    this.def.covers.forEach((c, i) => {
      const ig = this.add.graphics().setDepth(D.mech);
      if (c.item) this.drawItem(ig, c.item, c.x, c.y + 10);
      this.items.push(ig);
      const cov = this.add.container(c.x, c.y).setDepth(D.mech + 2);
      const g = this.add.graphics();
      const col = c.art === 'cushion' ? [0xc2255c, 0xe64980, 0xf783ac][i % 3] : c.art === 'box' ? 0x8a5a33 : c.art === 'spool' ? 0xc0c8d0 : 0x6e4527;
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(4, 10, 150, 90);
      g.fillStyle(col, 1);
      if (c.art === 'cushion') {
        g.fillRoundedRect(-75, -40, 150, 80, 34);
        g.fillStyle(0xffffff, 0.25);
        g.fillCircle(0, 0, 6);
        g.lineStyle(3, 0x000000, 0.15);
        g.lineBetween(-60, 0, -10, 0);
        g.lineBetween(10, 0, 60, 0);
      } else if (c.art === 'spool') {
        g.fillRect(-40, -46, 80, 92);
        g.fillStyle(0x8a5a33, 1);
        g.fillRect(-55, -52, 110, 14);
        g.fillRect(-55, 38, 110, 14);
      } else {
        g.fillRoundedRect(-70, -45, 140, 90, 10);
        g.lineStyle(3, 0x3d2412, 1);
        g.strokeRoundedRect(-70, -45, 140, 90, 10);
      }
      cov.add(g);
      cov.setSize(160, 100);
      cov.setInteractive({ useHandCursor: true });
      cov.on('pointerup', () => this.lift(i));
      this.covers.push(cov);
    });
  }

  private drawItem(g: Phaser.GameObjects.Graphics, item: HuntItem, x: number, y: number): void {
    const map: Partial<Record<HuntItem, string>> = { crank: 'crank', gear: 'gear', spring: 'spring', boots: 'boots', key: 'key', button: 'button', photo: 'heart', feather: 'bird' };
    if (item === 'bits') {
      for (let k = 0; k < 5; k++) {
        g.fillStyle(0xc9d1d9, 1);
        g.fillCircle(x - 30 + k * 15, y + (k % 2) * 8, 7);
        g.fillStyle(0x6c757d, 1);
        g.fillCircle(x - 30 + k * 15, y + (k % 2) * 8, 3);
      }
      return;
    }
    drawPart(g, map[item] ?? 'gear', x, y, 0.7);
  }

  private lift(i: number): void {
    if (this.state.has(i)) {
      // put it back down for fun (Spring Boots bounce)
      sfx.boing();
      this.tweens.add({ targets: this.covers[i], y: this.def.covers[i].y - 20, duration: 120, yoyo: true });
      this.kip.walkTo(this.def.covers[i].x);
      return;
    }
    const c = this.def.covers[i];
    this.state.add(i);
    sfx.whoosh();
    this.tweens.add({ targets: this.covers[i], y: c.y - 120, alpha: 0.35, angle: (i % 2 ? 1 : -1) * 14, duration: 380, ease: 'Back.easeOut' });
    this.kip.walkTo(c.x);
    if (c.item) {
      this.time.delayedCall(260, () => {
        if (c.item === 'bits') {
          profile().shiny += 3;
          sfx.coin();
        } else if (c.target) {
          sfx.sparkle();
          this.sparkleAt(c.x, c.y, 18);
          this.tweens.add({ targets: this.items[i], y: -40, alpha: 0, duration: 700, delay: 300 });
        } else sfx.chirp();
      });
    } else sfx.boing();
    this.act();
  }

  protected refresh(): void {
    this.def.covers.forEach((c, i) => {
      const up = this.state.has(i);
      this.covers[i].setPosition(c.x, up ? c.y - 120 : c.y).setAlpha(up ? 0.35 : 1);
    });
  }

  protected hintTarget(): HintTarget | null {
    const i = this.def.covers.findIndex((c, k) => c.target && !this.state.has(k));
    return i >= 0 ? { to: this.def.covers[i] } : null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    if (this.style.id !== 'tinker') return;
    this.def.covers.forEach((c, i) => {
      if (!c.target || this.state.has(i)) return;
      g.fillStyle(0xfff4c8, alpha * 0.4);
      g.fillEllipse(c.x, c.y, 180, 110);
    });
  }

  protected specialDone(id: string): boolean {
    return id === 'liftAll' && this.state.size === this.def.covers.length;
  }

  protected solutionSteps(): number {
    return this.def.covers.filter((c) => c.target).length;
  }
}

// ───────────────────────────── busy board ─────────────────────────────

export class BusyRoom extends RoomBase<'busy'> {
  private gadgets: Array<{ g: Phaser.GameObjects.Graphics; on: number; a: number }> = [];

  constructor() {
    super('room-busy');
  }

  protected build(): void {
    this.gadgets = [];
    const board = this.add.graphics().setDepth(D.back + 1);
    board.fillStyle(0x000000, 0.3);
    board.fillRoundedRect(196, 130, 900, 400, 30);
    board.fillStyle(0xf2e6c8, 1);
    board.fillRoundedRect(190, 124, 900, 400, 30);
    board.lineStyle(10, 0xd64541, 1);
    board.strokeRoundedRect(190, 124, 900, 400, 30);
    this.def.gadgets.forEach((gd, i) => {
      const g = this.add.graphics().setDepth(D.mech);
      const v = { g, on: 0, a: 0 };
      this.gadgets.push(v);
      const z = this.add.zone(gd.x, gd.y, 140, 140).setInteractive({ useHandCursor: true }).setDepth(D.mech + 1);
      z.on('pointerup', () => this.press(i));
    });
  }

  private press(i: number): void {
    const gd = this.def.gadgets[i];
    const v = this.gadgets[i];
    v.on = 1.2;
    v.a += Math.PI / 2;
    switch (gd.art) {
      case 'button':
        sfx.pop();
        break;
      case 'switch':
        sfx.toggle(true);
        break;
      case 'dial':
        sfx.ratchet(3);
        break;
      case 'horn':
        sfx.tone(330, 'square', 0.1, 0.01, 0.25);
        break;
      case 'crank':
        sfx.whirr();
        break;
      case 'lights':
        sfx.sparkle();
        break;
      case 'bell':
        sfx.ding(1047);
        break;
      case 'lever':
        sfx.clunk();
        break;
      case 'spinner':
        sfx.whirr();
        break;
    }
    this.sparkleAt(gd.x, gd.y, 8);
    const isNew = !this.state.has(i);
    this.state.add(i);
    if (isNew) this.act();
    else this.fiddle(`busy${i}`);
  }

  protected refresh(): void {}

  protected tick(dt: number): void {
    this.def.gadgets.forEach((gd, i) => {
      const v = this.gadgets[i];
      v.on = Math.max(0, v.on - dt);
      const g = v.g;
      g.clear();
      const { x, y } = gd;
      const lit = v.on > 0;
      const done = this.state.has(i);
      g.fillStyle(0x000000, 0.2);
      g.fillCircle(x + 3, y + 6, 58);
      g.fillStyle(0x3d2b25, 1);
      g.fillCircle(x, y, 58);
      if (done) {
        g.lineStyle(4, 0xffd43b, 0.9);
        g.strokeCircle(x, y, 62);
      }
      switch (gd.art) {
        case 'button':
          g.fillStyle(gd.color, 1);
          g.fillCircle(x, y + (lit ? 4 : 0), 38);
          g.fillStyle(0xffffff, 0.35);
          g.fillCircle(x - 10, y - 12 + (lit ? 4 : 0), 12);
          break;
        case 'switch':
          g.fillStyle(0x9aa6b4, 1);
          g.fillRoundedRect(x - 20, y - 36, 40, 72, 10);
          g.fillStyle(gd.color, 1);
          g.fillRoundedRect(x - 12, lit ? y - 30 : y, 24, 30, 6);
          break;
        case 'dial':
          g.fillStyle(gd.color, 1);
          g.fillCircle(x, y, 40);
          g.lineStyle(6, 0x3d2b25, 1);
          g.lineBetween(x, y, x + Math.cos(v.a) * 32, y + Math.sin(v.a) * 32);
          break;
        case 'horn':
          g.fillStyle(gd.color, 1);
          g.fillTriangle(x - 40, y, x + 30, y - 34 - (lit ? 6 : 0), x + 30, y + 34 + (lit ? 6 : 0));
          break;
        case 'crank':
          g.fillStyle(gd.color, 1);
          g.fillCircle(x, y, 20);
          g.lineStyle(10, gd.color, 1);
          g.lineBetween(x, y, x + Math.cos(v.a + v.on * 6) * 40, y + Math.sin(v.a + v.on * 6) * 40);
          break;
        case 'lights':
          for (let k = 0; k < 4; k++) {
            g.fillStyle([0xffd43b, 0x74c0fc, 0x8ce99a, 0xff8787][k], lit && Math.floor(v.on * 10 + k) % 2 ? 1 : 0.3);
            g.fillCircle(x - 30 + (k % 2) * 60, y - 22 + Math.floor(k / 2) * 44, 16);
          }
          break;
        case 'bell':
          g.fillStyle(gd.color, 1);
          g.fillTriangle(x - 34 + (lit ? Math.sin(v.on * 30) * 6 : 0), y + 26, x + 34 + (lit ? Math.sin(v.on * 30) * 6 : 0), y + 26, x, y - 34);
          g.fillCircle(x, y - 16, 22);
          break;
        case 'lever':
          g.lineStyle(12, 0x9aa6b4, 1);
          g.lineBetween(x, y + 20, x + (lit ? 30 : -30), y - 30);
          g.fillStyle(gd.color, 1);
          g.fillCircle(x + (lit ? 30 : -30), y - 30, 16);
          break;
        case 'spinner':
          for (let k = 0; k < 4; k++) {
            const a = v.a + k * (Math.PI / 2) + this.time.now / (lit ? 60 : 900);
            g.fillStyle([gd.color, 0xffd43b, 0xff8787, 0x8ce99a][k], 1);
            g.fillTriangle(x, y, x + Math.cos(a) * 44, y + Math.sin(a) * 44, x + Math.cos(a + 0.6) * 30, y + Math.sin(a + 0.6) * 30);
          }
          break;
      }
    });
  }

  protected hintTarget(): HintTarget | null {
    const i = this.def.gadgets.findIndex((_, k) => !this.state.has(k));
    return i >= 0 ? { to: this.def.gadgets[i] } : null;
  }

  protected specialDone(id: string): boolean {
    return id === 'allGadgets' && this.state.size === this.def.gadgets.length;
  }

  protected solutionSteps(): number {
    return this.def.need;
  }
}

// ───────────────────────────── Magnus's nest ─────────────────────────────

export class NestRoom extends RoomBase<'nest'> {
  private decos: Array<{ deco: NestDeco; obj: Phaser.GameObjects.Container; home: { x: number; y: number }; at: number | null }> = [];
  private magnus!: Portrait;
  private nestG!: Phaser.GameObjects.Graphics;
  private t = 0;
  private lines = 0;

  constructor() {
    super('room-nest');
  }

  protected build(): void {
    this.decos = [];
    this.lines = 0;
    this.trayW = 900;
    this.nestG = this.add.graphics().setDepth(D.mech);
    this.magnus = new Portrait(this, 640, 300, 'magnus', 0.75).setDepth(D.mech + 1);
    const spots = this.traySpotsTwoRows(this.def.tray.length);
    this.def.tray.forEach((deco, i) => {
      const obj = this.add.container(spots[i].x, spots[i].y).setDepth(D.trayPart).setScale(0.6);
      const g = this.add.graphics();
      drawDeco(g, deco, 0, 0);
      obj.add(g);
      obj.setSize(80, 80);
      const v = { deco, obj, home: spots[i], at: null as number | null };
      this.decos.push(v);
      this.enableDrag({
        obj,
        restScale: 0.6,
        targets: () => this.def.slots.map((s, k) => (this.decos.some((d) => d !== v && d.at === k) ? null : { id: String(k), ...s })).filter((t): t is SnapTarget => !!t),
        pick: () => {
          if (v.at !== null) {
            const was = v.at;
            delete this.state[was];
            v.at = null;
            this.undoStack.push(() => {
              v.at = was;
              this.state[was] = deco;
            });
          }
        },
        drop: (t) => {
          if (!t) return this.floatHome(obj, v.home, 0.6);
          const k = Number(t.id);
          v.at = k;
          this.state[k] = deco;
          this.tweens.add({ targets: obj, x: t.x, y: t.y, scale: 1, duration: 120, ease: 'Back.easeOut' });
          obj.setDepth(D.mech + 2);
          this.clunkAt(t.x, t.y);
          sfx.sparkle();
          this.magnusSays();
          this.act(() => {
            v.at = null;
            delete this.state[k];
          });
        },
      });
    });
  }

  private traySpotsTwoRows(n: number): Array<{ x: number; y: number }> {
    const per = Math.ceil(n / 2);
    return Array.from({ length: n }, (_, i) => {
      const r = Math.floor(i / per);
      const k = i % per;
      return { x: 640 + (k - (per - 1) / 2) * 120, y: 578 + r * 40 };
    });
  }

  private magnusSays(): void {
    const n = Object.keys(this.state).length;
    const key = n < 2 ? 'bench.magnus.1' : n < 4 ? 'bench.magnus.2' : 'bench.magnus.3';
    this.magnus.setMood(n < 2 ? 'grand' : 'laugh');
    if (this.lines++ % 2 === 0) void speak('magnus', LINES[key].text, key);
  }

  protected onFixed(): void {
    const p = profile();
    p.nest = { ...this.state };
    setFlag(p, 'nest');
    checkStamps(p);
    persist();
    puffAt(this, 640, 300);
    super.onFixed();
  }

  protected refresh(): void {
    for (const d of this.decos) d.at = null;
    for (const [k, deco] of Object.entries(this.state)) {
      const d = this.decos.find((q) => q.at === null && q.deco === deco);
      if (d) d.at = Number(k);
    }
    for (const d of this.decos) {
      if (d.at !== null) d.obj.setPosition(this.def.slots[d.at].x, this.def.slots[d.at].y).setScale(1).setDepth(D.mech + 2);
      else d.obj.setPosition(d.home.x, d.home.y).setScale(0.6).setDepth(D.trayPart);
    }
  }

  protected tick(dt: number): void {
    this.t += dt;
    const g = this.nestG;
    g.clear();
    // the new nest slowly spins when decorated
    g.fillStyle(0x5a3a22, 1);
    g.fillEllipse(640, 400, 620, 180);
    g.lineStyle(4, 0x8a5a33, 1);
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2 + this.t * 0.05 * Object.keys(this.state).length;
      g.lineBetween(640 + Math.cos(a) * 200, 400 + Math.sin(a) * 60, 640 + Math.cos(a + 0.5) * 300, 400 + Math.sin(a + 0.5) * 85);
    }
    for (const [k] of Object.entries(this.state)) {
      const s = this.def.slots[Number(k)];
      g.fillStyle(0xfff3b0, 0.15 + Math.sin(this.t * 3 + Number(k)) * 0.08);
      g.fillCircle(s.x, s.y, 40);
    }
    for (const [k, s] of this.def.slots.entries()) {
      if (this.state[k]) continue;
      g.lineStyle(3, 0xfff4c8, 0.35);
      g.strokeCircle(s.x, s.y, 30);
    }
    void dt;
  }

  protected hintTarget(): HintTarget | null {
    const k = this.def.slots.findIndex((_, i) => !this.state[i]);
    const d = this.decos.find((q) => q.at === null);
    return k >= 0 ? { from: d ? { x: d.obj.x, y: d.obj.y } : undefined, to: this.def.slots[k] } : null;
  }

  protected specialDone(id: string): boolean {
    return id === 'fullNest' && Object.keys(this.state).length === this.def.slots.length;
  }

  protected solutionSteps(): number {
    return this.def.need;
  }
}

/** Nest decorations (also used by the epilogue and the Nest Studio). */
export function drawDeco(g: Phaser.GameObjects.Graphics, deco: NestDeco, x: number, y: number): void {
  const map: Partial<Record<NestDeco, string>> = { gear: 'gear', spring: 'spring', bulb: 'bulb', bell: 'bell', mirror: 'mirror', button: 'button', musicbox: 'cylinder', key: 'key', star: 'stars' };
  if (deco === 'ribbon') {
    g.fillStyle(0xe64980, 1);
    g.fillTriangle(x, y, x - 26, y - 16, x - 26, y + 16);
    g.fillTriangle(x, y, x + 26, y - 16, x + 26, y + 16);
    g.fillCircle(x, y, 6);
  } else if (deco === 'pinwheel') {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      g.fillStyle([0xff6b6b, 0xffd43b, 0x74c0fc, 0x8ce99a][k], 1);
      g.fillTriangle(x, y, x + Math.cos(a) * 30, y + Math.sin(a) * 30, x + Math.cos(a + 0.8) * 22, y + Math.sin(a + 0.8) * 22);
    }
  } else if (deco === 'spoon') {
    g.fillStyle(0xc9d1d9, 1);
    g.fillEllipse(x, y - 14, 18, 26);
    g.fillRect(x - 3, y - 4, 6, 30);
  } else drawPart(g, map[deco] ?? 'gear', x, y, 0.55);
}
