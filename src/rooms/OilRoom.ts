/**
 * Oiling, winding and ratchets (GDD §8.3, Appendix A Room 1.3). Drag the oil
 * can onto rusty, squeaky parts: the squeak rises, then becomes a smooth purr.
 * Wind cranks round and round (or tap-and-hold), and snap the missing pawl on
 * so the spring stops slipping.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { ensureGearTexture } from '../art/textures';
import { drawPart } from '../art/parts';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { puffAt } from './fiddles';

interface PartView {
  id: string;
  x: number;
  y: number;
  size: number;
  art: string;
  required: boolean;
  img?: Phaser.GameObjects.Image;
  g: Phaser.GameObjects.Graphics;
  spin: number;
}

export class OilRoom extends RoomBase<'oil'> {
  private parts: PartView[] = [];
  private can!: Phaser.GameObjects.Container;
  private canHome = { x: 470, y: 598 };
  private pawlObj?: Phaser.GameObjects.Container;
  private pawlHome = { x: 820, y: 598 };
  private crankG?: Phaser.GameObjects.Graphics;
  private crankAngle = 0;
  private crankAcc = 0;
  private holding = false;
  private payoffG!: Phaser.GameObjects.Graphics;
  private t = 0;
  private drops?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('room-oil');
  }

  protected build(): void {
    this.parts = [];
    this.crankAngle = 0;
    this.crankAcc = 0;
    this.holding = false;
    this.pawlObj = undefined;
    this.crankG = undefined;
    this.payoffG = this.add.graphics().setDepth(D.mech - 1);
    for (const p of this.def.parts) {
      const g = this.add.graphics().setDepth(D.mech + 1);
      const v: PartView = { id: p.id, x: p.x, y: p.y, size: p.size, art: p.art, required: p.required, g, spin: 0 };
      if (p.art === 'gear' || p.art === 'wheel') {
        v.img = this.add.image(p.x, p.y, ensureGearTexture(this, Math.round(p.size / 2.6), p.art === 'gear' ? 'brass' : 'steel')).setDepth(D.mech);
      }
      const z = this.add.zone(p.x, p.y, p.size * 2.2, p.size * 2.2).setInteractive({ useHandCursor: true }).setDepth(D.mech + 2);
      z.on('pointerup', () => {
        if (this.state.oiled.has(p.id)) {
          v.spin = 6;
          sfx.whirr();
        } else {
          sfx.squeak(0.8 + Math.random() * 0.4);
          this.tweens.add({ targets: v.img ?? v.g, angle: { from: -6, to: 6 }, duration: 80, yoyo: true, repeat: 1 });
        }
        this.fiddle(`part-${p.id}`);
      });
      this.parts.push(v);
    }
    this.drops = this.add.particles(0, 0, 'drop', { speed: { min: 40, max: 120 }, angle: { min: 60, max: 120 }, gravityY: 400, lifespan: 600, scale: { start: 0.9, end: 0.4 }, tint: 0xe8a33d, emitting: false }).setDepth(D.fx);
    // the oil can
    this.can = this.add.container(this.canHome.x, this.canHome.y).setDepth(D.trayPart).setScale(0.9);
    const cg = this.add.graphics();
    drawPart(cg, 'oilcan', 0, 0, 1);
    this.can.add(cg);
    this.can.setSize(90, 90);
    this.enableDrag({
      obj: this.can,
      restScale: 0.9,
      targets: () => this.parts.filter((p) => !this.state.oiled.has(p.id)).map((p) => ({ id: p.id, x: p.x, y: p.y })),
      drop: (t) => this.oil(t),
    });
    if (this.def.crank) this.buildCrank();
    if (this.def.pawl) {
      const c = this.add.container(this.pawlHome.x, this.pawlHome.y).setDepth(D.trayPart).setScale(0.9);
      const pg = this.add.graphics();
      pg.fillStyle(0x6c757d, 1);
      pg.fillTriangle(-30, -6, 30, -6, 20, 16);
      pg.fillStyle(0xd9a441, 1);
      pg.fillCircle(-26, -2, 8);
      c.add(pg);
      c.setSize(80, 60);
      this.pawlObj = c;
      this.enableDrag({
        obj: c,
        restScale: 0.9,
        targets: () => (this.state.pawl ? [] : [{ id: 'pawl', x: this.def.pawl!.x, y: this.def.pawl!.y }]),
        drop: (t) => this.placePawl(t),
        pick: () => {
          if (this.state.pawl) {
            this.state.pawl = false;
            this.undoStack.push(() => (this.state.pawl = true));
          }
        },
      });
    }
  }

  private oil(t: SnapTarget | null): void {
    if (!t) return this.floatHome(this.can, this.canHome, 0.9);
    const id = t.id;
    const p = this.parts.find((q) => q.id === id)!;
    this.tweens.add({ targets: this.can, x: p.x + 40, y: p.y - 50, angle: -40, duration: 140 });
    this.drops?.explode(14, p.x + 10, p.y - 20);
    sfx.oil();
    sfx.squeak(1.4);
    this.time.delayedCall(320, () => {
      sfx.purr();
      this.state.oiled.add(id);
      p.spin = 4;
      this.sparkleAt(p.x, p.y, 8);
      this.floatHome(this.can, this.canHome, 0.9);
      this.act(() => this.state.oiled.delete(id));
    });
  }

  private placePawl(t: SnapTarget | null): void {
    const c = this.pawlObj!;
    if (!t) return this.floatHome(c, this.pawlHome, 0.9);
    this.state.pawl = true;
    this.tweens.add({ targets: c, x: t.x, y: t.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    c.setDepth(D.mech + 3);
    this.clunkAt(t.x, t.y);
    this.act(() => (this.state.pawl = false));
  }

  private buildCrank(): void {
    const k = this.def.crank!;
    this.crankG = this.add.graphics().setDepth(D.mech + 2);
    const zone = this.add.zone(k.x, k.y, 260, 260).setInteractive({ useHandCursor: true }).setDepth(D.mech + 3);
    let last: number | null = null;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      last = Math.atan2(p.worldY - k.y, p.worldX - k.x);
      this.holding = true;
      this.idle = 0;
    });
    zone.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || last === null || this.fixed) return;
      const a = Math.atan2(p.worldY - k.y, p.worldX - k.x);
      let d = a - last;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      last = a;
      this.holding = false; // turning by hand
      this.turn(Math.abs(d));
    });
    const up = () => {
      last = null;
      this.holding = false;
      if (this.def.pawl && !this.state.pawl && this.state.turns > 0) {
        // no pawl: the spring slips straight back with a funny whirr
        sfx.whirr();
        this.kip.giggle();
        this.state.turns = 0;
        this.crankAcc = 0;
      }
    };
    zone.on('pointerup', up);
    zone.on('pointerout', up);
  }

  private turn(d: number): void {
    this.crankAngle += d;
    this.crankAcc += d;
    if (Math.floor((this.crankAngle - d) / 0.6) !== Math.floor(this.crankAngle / 0.6)) sfx.ratchet(1);
    if (this.crankAcc >= Math.PI * 2) {
      this.crankAcc -= Math.PI * 2;
      this.state.turns++;
      sfx.sproing();
      this.sparkleAt(this.def.crank!.x, this.def.crank!.y, 6);
      const before = this.state.turns - 1;
      this.act(() => (this.state.turns = before));
    }
  }

  protected refresh(): void {
    if (this.pawlObj) {
      if (this.state.pawl) this.pawlObj.setPosition(this.def.pawl!.x, this.def.pawl!.y).setScale(1);
      else this.pawlObj.setPosition(this.pawlHome.x, this.pawlHome.y).setScale(0.9);
    }
  }

  protected tick(dt: number): void {
    this.t += dt;
    // Little Tinkers (and anyone) can tap-and-hold the crank to auto-turn
    if (this.holding && this.def.crank && !this.fixed && this.style.id === 'tinker') this.turn(dt * 4);
    for (const p of this.parts) {
      const oiled = this.state.oiled.has(p.id);
      const g = p.g;
      g.clear();
      const spin = oiled ? (p.required || this.fixed ? 1.2 : 0.4) : 0;
      p.spin = Math.max(spin, p.spin * Math.pow(0.4, dt));
      if (p.img) {
        p.img.rotation += p.spin * dt * (p.id.charCodeAt(p.id.length - 1) % 2 ? 1 : -1);
        p.img.setTint(oiled ? 0xffffff : 0x9a5a2a);
      } else {
        g.fillStyle(0x000000, 0);
        drawPart(g, p.art, p.x, p.y, p.size / 34);
        if (!oiled) {
          g.fillStyle(0x8a4a1a, 0.55);
          g.fillCircle(p.x, p.y, p.size * 0.9);
        }
      }
      if (!oiled) {
        // rust squiggles
        g.lineStyle(3, 0x6e3418, 0.9);
        for (let k = 0; k < 3; k++) {
          const a = k * 2.1 + 0.5;
          const sx = p.x + Math.cos(a) * p.size * 0.5;
          const sy = p.y + Math.sin(a) * p.size * 0.5;
          g.beginPath();
          g.moveTo(sx - 8, sy);
          g.lineTo(sx - 3, sy - 5);
          g.lineTo(sx + 2, sy + 3);
          g.lineTo(sx + 8, sy - 3);
          g.strokePath();
        }
      }
    }
    if (this.crankG && this.def.crank) {
      const k = this.def.crank;
      const g = this.crankG;
      g.clear();
      g.fillStyle(0x5e3f10, 1);
      g.fillCircle(k.x, k.y, 70);
      // the mainspring tightens with each turn
      g.lineStyle(4, 0xc0c8d0, 1);
      g.beginPath();
      const coils = 3 + this.state.turns * 2;
      for (let i = 0; i < coils * 12; i++) {
        const a = i * 0.52;
        const r = 10 + (i / (coils * 12)) * 56;
        g.lineTo(k.x + Math.cos(a) * r, k.y + Math.sin(a) * r);
      }
      g.strokePath();
      const hx = k.x + Math.cos(this.crankAngle) * 100;
      const hy = k.y + Math.sin(this.crankAngle) * 100;
      g.lineStyle(14, 0x7a5413, 1);
      g.lineBetween(k.x, k.y, hx, hy);
      g.fillStyle(0xd64541, 1);
      g.fillCircle(hx, hy, 20);
      g.fillStyle(0xd9a441, 1);
      g.fillCircle(k.x, k.y, 14);
      // turn pips
      for (let i = 0; i < k.turns; i++) {
        g.fillStyle(i < this.state.turns ? 0x8ce99a : 0x5a4a3a, 1);
        g.fillCircle(k.x - ((k.turns - 1) * 22) / 2 + i * 22, k.y + 110, 8);
      }
      if (this.def.pawl) {
        const pw = this.def.pawl;
        g.fillStyle(0x9aa6b4, 1);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + this.crankAngle * 0.5;
          g.fillTriangle(pw.x - 70 + Math.cos(a) * 46, pw.y + 60 + Math.sin(a) * 46, pw.x - 70 + Math.cos(a + 0.25) * 34, pw.y + 60 + Math.sin(a + 0.25) * 34, pw.x - 70 + Math.cos(a - 0.1) * 34, pw.y + 60 + Math.sin(a - 0.1) * 34);
        }
        g.fillStyle(0x6c757d, 1);
        g.fillCircle(pw.x - 70, pw.y + 60, 34);
        if (!this.state.pawl) {
          g.lineStyle(3, 0xfff4c8, 0.4 + Math.sin(this.t * 4) * 0.3);
          g.strokeRoundedRect(pw.x - 40, pw.y - 24, 80, 48, 8);
        }
      }
    }
    if (this.fixed) this.drawPayoff(dt);
  }

  private drawPayoff(dt: number): void {
    const g = this.payoffG;
    g.clear();
    const t = this.t;
    switch (this.def.payoff) {
      case 'stair':
        for (const p of this.parts.filter((q) => q.required)) {
          g.fillStyle(0xffd76a, 0.15);
          g.fillCircle(p.x, p.y, p.size * 1.4);
        }
        break;
      case 'door':
        g.fillStyle(0x8a5a33, 1);
        g.fillRect(600, 160, 200 * Math.abs(Math.cos(t)), 360);
        break;
      case 'jack': {
        const pop = Math.min(1, (t % 4) * 3);
        g.fillStyle(0xe05a47, 1);
        g.fillRoundedRect(860, 380, 160, 140, 10);
        g.lineStyle(5, 0xc0c8d0, 1);
        for (let i = 0; i < 6; i++) g.strokeEllipse(940, 370 - i * 18 * pop, 40, 12);
        g.fillStyle(0xf2c9a5, 1);
        g.fillCircle(940, 360 - 110 * pop, 34);
        g.fillStyle(0xff6b6b, 1);
        g.fillCircle(940, 368 - 110 * pop, 8);
        if (Math.floor(t % 4 * 10) === 0) sfx.pop();
        break;
      }
      case 'timer':
        g.fillStyle(0xff6b6b, 1);
        g.fillCircle(960, 300, 70);
        g.fillStyle(0xfff6dc, 1);
        g.fillCircle(960, 300, 54);
        g.lineStyle(4, 0x333333, 1);
        g.lineBetween(960, 300, 960 + Math.sin(-t) * 40, 300 - Math.cos(-t) * 40);
        break;
      case 'vane':
        g.lineStyle(6, 0x333333, 1);
        g.lineBetween(900, 140, 900, 300);
        g.lineBetween(900 + Math.cos(t * 2) * 80, 160, 900 - Math.cos(t * 2) * 80, 160);
        g.fillStyle(0x333333, 1);
        g.fillTriangle(900 + Math.cos(t * 2) * 90, 160, 900 + Math.cos(t * 2) * 60, 148, 900 + Math.cos(t * 2) * 60, 172);
        break;
      case 'vault':
        g.fillStyle(0xffd76a, 0.12 + Math.sin(t * 3) * 0.06);
        g.fillCircle(this.def.crank?.x ?? 640, this.def.crank?.y ?? 360, 140);
        break;
    }
    if (Math.random() < dt * 0.5 && this.def.payoff === 'vane') puffAt(this, 1000, 160);
  }

  protected hintTarget(): HintTarget | null {
    if (this.def.pawl && !this.state.pawl && this.pawlObj) return { from: { x: this.pawlObj.x, y: this.pawlObj.y }, to: this.def.pawl };
    const next = this.parts.find((p) => p.required && !this.state.oiled.has(p.id));
    if (next) return { from: { x: this.can.x, y: this.can.y }, to: { x: next.x, y: next.y } };
    if (this.def.crank && this.state.turns < this.def.crank.turns) return { to: { x: this.def.crank.x + 100, y: this.def.crank.y } };
    return null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    for (const p of this.parts) {
      if (!p.required || this.state.oiled.has(p.id)) continue;
      g.lineStyle(4, 0xfff4c8, alpha + 0.1);
      g.strokeCircle(p.x, p.y, p.size * 1.15);
    }
  }

  protected specialDone(id: string): boolean {
    if (id === 'oilAll') return this.parts.every((p) => this.state.oiled.has(p.id));
    return false;
  }

  protected solutionSteps(): number {
    return this.def.parts.filter((p) => p.required).length + (this.def.crank?.turns ?? 0) + (this.def.pawl ? 1 : 0);
  }

  protected applySolution(): void {
    super.applySolution();
    for (const p of this.parts) if (this.state.oiled.has(p.id)) p.spin = 3;
  }
}
