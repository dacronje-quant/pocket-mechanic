/**
 * Cams (GDD §8.5): bumpy wheels turn rotation into up-and-down dances. Give
 * each rod the cam whose bumps match the ghost dance. Engineers also turn the
 * cam on its shaft so the timing lines up (orientation matters).
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { bestPhase, CAM_PROFILES, CAM_STEPS, camMatches, type CamShape } from '../mechanism/cams';
import type { FollowerArt } from '../content/types';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';

interface CamPart {
  shape: CamShape;
  obj: Phaser.GameObjects.Container;
  g: Phaser.GameObjects.Graphics;
  home: { x: number; y: number };
  at: string | null;
}

const SHAFT_Y = 450;

export class CamRoom extends RoomBase<'cam'> {
  private parts: CamPart[] = [];
  private xs: Record<string, number> = {};
  private g!: Phaser.GameObjects.Graphics;
  private turn = 0;
  private lastStep = -1;

  constructor() {
    super('room-cam');
  }

  protected build(): void {
    this.parts = [];
    this.xs = {};
    this.turn = 0;
    this.g = this.add.graphics().setDepth(D.mech);
    const n = this.def.followers.length;
    this.def.followers.forEach((f, i) => (this.xs[f.id] = 640 + (i - (n - 1) / 2) * Math.min(280, 760 / Math.max(1, n - 0.5))));
    // cams already fixed on their shafts (Little Tinker pre-fills all but one)
    const spots = this.traySpots(this.def.tray.length);
    this.def.tray.forEach((shape, i) => this.addPart(shape, spots[i]));
    this.def.followers.forEach((f) => {
      if (f.start) {
        const p = this.addPart(f.start.shape, { x: this.xs[f.id], y: SHAFT_Y });
        p.at = f.id;
        p.obj.setScale(1).setDepth(D.mech + 1);
        p.obj.disableInteractive();
      }
    });
    for (const f of this.def.followers) {
      const z = this.add.zone(this.xs[f.id], SHAFT_Y, 120, 120).setInteractive({ useHandCursor: true }).setDepth(D.mech + 2);
      z.on('pointerup', () => this.tapCam(f.id));
    }
  }

  private addPart(shape: CamShape, home: { x: number; y: number }): CamPart {
    const obj = this.add.container(home.x, home.y).setDepth(D.trayPart).setScale(0.7);
    const g = this.add.graphics();
    obj.add(g);
    obj.setSize(110, 110);
    const p: CamPart = { shape, obj, g, home, at: null };
    this.drawCam(g, shape);
    this.parts.push(p);
    this.enableDrag({
      obj,
      restScale: 0.7,
      targets: () => this.def.followers.filter((f) => !this.parts.some((q) => q !== p && q.at === f.id)).map((f) => ({ id: f.id, x: this.xs[f.id], y: SHAFT_Y })),
      accepts: (t) => this.style.id !== 'tinker' || this.def.solution[t.id]?.shape === shape,
      pick: () => this.lift(p),
      drop: (t) => this.drop(p, t),
    });
    return p;
  }

  private drawCam(g: Phaser.GameObjects.Graphics, shape: CamShape): void {
    g.clear();
    const prof = CAM_PROFILES[shape];
    const pts: Phaser.Math.Vector2[] = [];
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      const step = Math.floor((k / 48) * CAM_STEPS);
      const r = 30 + prof[step] * 20;
      pts.push(new Phaser.Math.Vector2(Math.cos(a - Math.PI / 2) * r, Math.sin(a - Math.PI / 2) * r));
    }
    g.fillStyle(0x000000, 0.25);
    g.fillPoints(pts.map((p) => new Phaser.Math.Vector2(p.x + 3, p.y + 5)), true);
    g.fillStyle(0xd9a441, 1);
    g.fillPoints(pts, true);
    g.lineStyle(3, 0x8a5f17, 1);
    g.strokePoints(pts, true, true);
    g.fillStyle(0x5e3f10, 1);
    g.fillCircle(0, 0, 9);
    // a marker so the cam's turn is visible
    g.fillStyle(0xfff0b8, 1);
    g.fillCircle(0, -22, 4);
  }

  private sync(): void {
    for (const f of this.def.followers) {
      const p = this.parts.find((q) => q.at === f.id);
      if (!p) {
        this.state[f.id] = undefined;
        continue;
      }
      const prev = this.state[f.id];
      let phase = prev && prev.shape === p.shape ? prev.phase : 0;
      if (this.style.autoRotate) {
        const bp = bestPhase(p.shape, f.target);
        if (bp >= 0) phase = bp;
      }
      this.state[f.id] = { shape: p.shape, phase };
    }
  }

  private lift(p: CamPart): void {
    if (!p.at) return;
    const was = p.at;
    const st = this.state[was];
    p.at = null;
    this.sync();
    this.undoStack.push(() => {
      p.at = was;
      this.state[was] = st;
    });
  }

  private drop(p: CamPart, t: SnapTarget | null): void {
    if (!t) return this.floatHome(p.obj, p.home, 0.7);
    if (this.style.id === 'tinker' && this.def.solution[t.id]?.shape !== p.shape) return this.refuse(p.obj, t, p.home, 0.7);
    p.at = t.id;
    this.tweens.add({ targets: p.obj, x: t.x, y: t.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    p.obj.setDepth(D.mech + 1);
    this.sync();
    this.clunkAt(t.x, t.y);
    const id = t.id;
    this.act(() => {
      p.at = null;
      this.state[id] = undefined;
    });
  }

  /** Engineers turn the cam one notch on its shaft. */
  private tapCam(id: string): void {
    if (this.fixed || this.style.autoRotate) return;
    const st = this.state[id];
    if (!st) return;
    const old = st.phase;
    st.phase = (st.phase + 1) % CAM_STEPS;
    sfx.ratchet(1);
    this.act(() => (st.phase = old));
  }

  protected refresh(): void {
    for (const p of this.parts) if (p.obj.input?.enabled) p.at = null;
    for (const f of this.def.followers) {
      const st = this.state[f.id];
      if (!st || this.parts.some((q) => q.at === f.id)) continue;
      const p = this.parts.find((q) => q.at === null && q.shape === st.shape);
      if (p) p.at = f.id;
    }
    for (const p of this.parts) {
      if (p.at) p.obj.setPosition(this.xs[p.at], SHAFT_Y).setScale(1).setDepth(D.mech + 1);
      else p.obj.setPosition(p.home.x, p.home.y).setScale(0.7).setDepth(D.trayPart);
    }
  }

  protected tick(dt: number): void {
    this.turn += dt * 0.35; // turns per second
    const g = this.g;
    g.clear();
    const stepNow = Math.floor((this.turn % 1) * CAM_STEPS);
    // the drive shaft and its crank
    g.lineStyle(14, 0x5e3f10, 1);
    g.lineBetween(220, SHAFT_Y, 1060, SHAFT_Y);
    g.lineStyle(6, 0xb88a2c, 1);
    g.lineBetween(220, SHAFT_Y, 1060, SHAFT_Y);
    g.fillStyle(0xd64541, 1);
    g.fillCircle(220 + Math.cos(this.turn * Math.PI * 2) * 30, SHAFT_Y + Math.sin(this.turn * Math.PI * 2) * 30, 12);
    for (const f of this.def.followers) {
      const x = this.xs[f.id];
      const st = this.state[f.id];
      const p = this.parts.find((q) => q.at === f.id);
      let h = 0;
      if (st && p) {
        p.obj.rotation = (this.turn % 1) * Math.PI * 2 + (st.phase / CAM_STEPS) * Math.PI * 2;
        const prof = CAM_PROFILES[st.shape];
        h = prof[(stepNow + st.phase) % CAM_STEPS];
      }
      const ghostH = f.target[stepNow];
      const match = st ? camMatches(st.shape, st.phase, f.target, !this.style.autoRotate) : false;
      // the ghost dance (where the rod should be)
      this.drawFollower(g, f.art, x, ghostH, 0.25, false);
      // the real rod and figure
      this.drawFollower(g, f.art, x, h, 1, match);
      // target pattern strip
      for (let k = 0; k < CAM_STEPS; k++) {
        g.fillStyle(f.target[k] ? 0xffd76a : 0x3d2b25, k === stepNow ? 1 : 0.7);
        g.fillRect(x - 60 + k * 10, 516, 8, 10);
      }
    }
    if (stepNow !== this.lastStep) {
      this.lastStep = stepNow;
      if (this.def.followers.some((f) => this.state[f.id] && CAM_PROFILES[this.state[f.id]!.shape][(stepNow + this.state[f.id]!.phase) % CAM_STEPS])) sfx.tick(1.3);
    }
  }

  private drawFollower(g: Phaser.GameObjects.Graphics, art: FollowerArt, x: number, h: number, alpha: number, happy: boolean): void {
    const top = SHAFT_Y - 60 - h * 50;
    g.lineStyle(10, 0x6c757d, alpha);
    g.lineBetween(x, SHAFT_Y - 50, x, top);
    const y = top - 20;
    g.fillStyle(0xffffff, alpha === 1 ? 0 : 0);
    switch (art) {
      case 'fox':
      case 'dancer':
        g.fillStyle(0xe67e22, alpha);
        g.fillEllipse(x, y - 30, art === 'fox' ? 46 + h * 20 : 40, 70);
        g.fillCircle(x, y - 78, 22);
        g.fillTriangle(x - 18, y - 88, x - 8, y - 116, x - 2, y - 92);
        g.fillTriangle(x + 18, y - 88, x + 8, y - 116, x + 2, y - 92);
        g.fillStyle(0xffffff, alpha);
        g.fillEllipse(x, y - 24, 22, 40);
        break;
      case 'butler':
        g.fillStyle(0xc8703f, alpha);
        g.fillRoundedRect(x - 30, y - 70, 60, 70, 10);
        g.fillCircle(x, y - 70 - 26 + h * 14, 22);
        g.fillStyle(0x222222, alpha);
        g.fillRect(x - 16, y - 70 - 62 + h * 14, 32, 18);
        break;
      case 'teapot':
        g.fillStyle(0xffffff, alpha);
        g.fillEllipse(x, y - 30, 70, 50);
        g.fillTriangle(x + 30, y - 34, x + 30 + 30 * (0.5 + h), y - 52 + h * 30, x + 30, y - 20);
        if (h > 0.5 && alpha === 1) {
          g.fillStyle(0x8a4a20, 1);
          g.fillRect(x + 54, y - 20, 4, 30);
        }
        break;
      case 'hammer':
        g.fillStyle(0x6c757d, alpha);
        g.fillRect(x - 30, y - 40, 60, 26);
        break;
      case 'bird':
        g.fillStyle(0x2e9b5f, alpha);
        g.fillEllipse(x, y - 30, 56, 40);
        g.fillCircle(x + 22, y - 52, 14);
        g.fillStyle(0xffa94d, alpha);
        g.fillTriangle(x + 34, y - 56, x + 34, y - 48, x + 46 + h * 6, y - 52 - h * 6);
        break;
      case 'cat':
        g.fillStyle(0xffffff, alpha);
        g.fillCircle(x, y - 30, 30);
        g.fillCircle(x, y - 74, 24);
        g.fillTriangle(x - 20, y - 86, x - 10, y - 110, x - 2, y - 92);
        g.fillTriangle(x + 20, y - 86, x + 10, y - 110, x + 2, y - 92);
        g.fillRoundedRect(x + 22, y - 60 - h * 30, 14, 34, 7);
        g.fillStyle(0xffd43b, alpha);
        g.fillCircle(x, y - 24, 8);
        break;
    }
    if (happy && alpha === 1) {
      g.fillStyle(0xfff3b0, 0.25);
      g.fillCircle(x, y - 50, 70);
    }
  }

  protected hintTarget(): HintTarget | null {
    for (const f of this.def.followers) {
      const want = this.def.solution[f.id];
      const st = this.state[f.id];
      if (st && camMatches(st.shape, st.phase, f.target, !this.style.autoRotate)) continue;
      if (st && st.shape === want.shape) return { to: { x: this.xs[f.id], y: SHAFT_Y } };
      const p = this.parts.find((q) => q.shape === want.shape && q.at === null);
      return { from: p ? { x: p.obj.x, y: p.obj.y } : undefined, to: { x: this.xs[f.id], y: SHAFT_Y } };
    }
    return null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    for (const f of this.def.followers) {
      if (this.state[f.id]) continue;
      g.lineStyle(4, 0xfff4c8, alpha + 0.2);
      g.strokeCircle(this.xs[f.id], SHAFT_Y, 42);
    }
  }

  protected solutionSteps(): number {
    return this.def.followers.filter((f) => !f.start).length * (this.style.autoRotate ? 1 : 2);
  }
}
