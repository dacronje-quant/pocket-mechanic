/**
 * Gear rooms (GDD §8.1): drag gears onto pegs; meshed gears turn opposite ways,
 * tooth counts set speed, loops jam. Compound shafts take two gears (back and
 * front layer). Outputs drive clock hands, fans, wheels, planet arms and more.
 */
import Phaser from 'phaser';
import { LINES } from '../content/story';
import * as sfx from '../audio/sfx';
import { ensureGearTexture, type GearVariant } from '../art/textures';
import { CM } from '../art/copperMoss';
import { rivet } from '../art/finish';
import { TONE, LINE, landSquash, toyDialFace, toyDisc, toyRod } from '../art/style';
import { meshPhase, pitchRadius, MODULE } from '../mechanism/graph';
import type { GearOutput, GearPlacement } from '../content/types';
import { canPlaceGear, evalGears, gearId, type GearEval } from '../rules';
import { setFlag } from '../core/progress';
import { profile, persistSoon, settings } from '../core/save';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { FONT } from '../ui/widgets';
import { withArt } from '../art/generated';
import { atlasFrame, objectArt } from '../art/sprites';
import { Portrait } from '../art/portraits';
import { quickFixOf } from '../content/index';
import type { CharId } from '../content/types';

/** Output widgets that are a Quick Fix toy (drawn with the toy's painting). */
const TOY_WIDGETS = ['wheels', 'paddle', 'grinder', 'spinner'];

interface GearView {
  id: string;
  teeth: number;
  img: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  fixed: boolean;
  shaft?: string;
  layer?: number;
  home?: { x: number; y: number };
  omega: number;
  freeSpin: number;
}

const TRAY_SCALE = 0.62;

export class GearRoom extends RoomBase<'gear'> {
  private views: GearView[] = [];
  private evalR!: GearEval;
  private widgets: Array<{ out: GearOutput; g: Phaser.GameObjects.Graphics; a: number; b: number; beat: number; label?: Phaser.GameObjects.Text; toy?: Phaser.GameObjects.Image }> = [];
  /** In a Quick Fix, the customer stands by and watches their toy being mended. */
  private owner?: Portrait;
  private driverG!: Phaser.GameObjects.Graphics;
  private chainOffset = 0;
  private lastPlaced: GearView | null = null;
  private driverAngle = 0;

  constructor() {
    super('room-gear');
  }

  protected build(): void {
    this.views = [];
    this.widgets = [];
    this.lastPlaced = null;
    this.owner = undefined;
    const def = this.def;
    const qf = quickFixOf(def.id);
    if (qf) this.owner = new Portrait(this, 1160, 300, qf.owner as CharId, 0.55).setDepth(D.widget);
    const arbors = this.add.graphics().setDepth(D.back + 1);
    // output arbors and widgets
    for (const out of def.outputs) {
      const s = def.shafts.find((q) => q.id === out.shaft)!;
      toyRod(arbors, s.x, s.y, out.at.x, out.at.y);
      const g = this.add.graphics().setDepth(D.widget);
      const w = { out, g, a: Math.random() * Math.PI * 2, b: 0.3, beat: 0, label: undefined as Phaser.GameObjects.Text | undefined, toy: undefined as Phaser.GameObjects.Image | undefined };
      // a Quick Fix toy: the gears drive the real toy (Pip's mouse, the bath boat, the top…)
      const art = qf && TOY_WIDGETS.includes(out.widget) ? objectArt(qf.object) : null;
      if (art) {
        withArt(this, art.atlas, (key) => {
          if (!g.active) return;
          const img = this.add.image(out.at.x, out.at.y, key, atlasFrame(this, key, art.index, 4, 4, true)).setDepth(D.widget + 1);
          const size = (out.size ?? 70) * (out.widget === 'wheels' || out.widget === 'paddle' ? 1.9 : 1.7);
          const scale = size / Math.max(img.width, img.height);
          img.setScale(scale).setData('base', scale);
          w.toy = img;
        });
      }
      if (this.style.numbers) {
        w.label = this.add
          .text(out.at.x, out.at.y + (out.size ?? 70) + 28, '', { fontFamily: FONT, fontSize: '17px', color: '#f4ebd5', backgroundColor: '#342f29cc', padding: { x: 8, y: 4 }, align: 'center' })
          .setOrigin(0.5)
          .setDepth(D.hud - 1);
      }
      this.widgets.push(w);
    }
    // driver source art (behind the driver shaft)
    this.driverG = this.add.graphics().setDepth(D.mech - 1);
    // pegs and fixed gears
    const pegG = this.add.graphics().setDepth(D.mech - 2);
    for (const s of def.shafts) {
      toyDisc(pegG, s.x, s.y, 13, s.peg ? TONE.pegFace : TONE.pegFaceDim);
      rivet(pegG, s.x, s.y, 3);
      if ((s.layers ?? [0]).length > 1) {
        pegG.lineStyle(LINE.bold, TONE.highlight, 0.8);
        pegG.strokeCircle(s.x, s.y, 17);
      }
      for (const gdef of s.gears ?? []) {
        const layer = gdef.layer ?? 0;
        const img = this.add.image(s.x, s.y, ensureGearTexture(this, gdef.teeth, (gdef.paint ?? 'brass') as GearVariant)).setDepth(D.mech + layer * 2);
        img.rotation = Math.random() * Math.PI * 2;
        this.views.push({ id: gearId(s.id, layer), teeth: gdef.teeth, img, fixed: true, shaft: s.id, layer, omega: 0, freeSpin: 0 });
      }
    }
    // drawer parts
    const spots = this.traySpots(def.tray.length);
    def.tray.forEach((teeth, i) => {
      const home = spots[i];
      const img = this.add.image(home.x, home.y, ensureGearTexture(this, teeth, 'brass')).setDepth(D.trayPart).setScale(TRAY_SCALE);
      const r = Math.max(pitchRadius(teeth) + MODULE, 60);
      img.setInteractive({ hitArea: new Phaser.Geom.Circle(img.width / 2, img.height / 2, r), hitAreaCallback: Phaser.Geom.Circle.Contains, draggable: true, useHandCursor: true });
      const v: GearView = { id: `t${i}`, teeth, img, fixed: false, home, omega: 0, freeSpin: 0 };
      img.setName(`gear:part:${i}`).setData('qa', { action: 'gear', teeth });
      this.views.push(v);
      this.enableDrag({
        obj: img,
        restScale: TRAY_SCALE,
        targets: () => this.targetsFor(v),
        accepts: (t) => this.layerFor(v, t.id) !== null && canPlaceGear(this.def, this.othersOf(v), { shaft: t.id, layer: this.layerFor(v, t.id)!, teeth }),
        pick: () => this.lift(v),
        drop: (t) => this.dropOn(v, t),
      });
    });
    if (this.style.numbers) {
      for (const v of this.views) {
        v.label = this.add
          .text(v.img.x, v.img.y, `${v.teeth}`, { fontFamily: FONT, fontSize: '19px', color: '#fff8e0', fontStyle: 'bold', stroke: '#342f29', strokeThickness: 5 })
          .setOrigin(0.5)
          .setDepth(D.drag + 1);
      }
    }
  }

  // ───────────── placement bookkeeping (state is the truth) ─────────────

  private placementOf(v: GearView): GearPlacement | undefined {
    if (v.fixed || !v.shaft) return undefined;
    return { shaft: v.shaft, layer: v.layer!, teeth: v.teeth };
  }

  private othersOf(v: GearView): GearPlacement[] {
    return this.views.filter((o) => o !== v && !o.fixed && o.shaft).map((o) => this.placementOf(o)!);
  }

  private layerFor(v: GearView, shaftId: string): number | null {
    const s = this.def.shafts.find((q) => q.id === shaftId);
    if (!s?.peg) return null;
    const taken = new Set<number>([...(s.gears ?? []).map((g) => g.layer ?? 0), ...this.views.filter((o) => o !== v && o.shaft === shaftId).map((o) => o.layer!)]);
    if (v.shaft === shaftId && v.layer !== undefined) return v.layer;
    const free = (s.layers ?? [0]).filter((l) => !taken.has(l));
    return free.length ? free[0] : null;
  }

  private targetsFor(v: GearView): SnapTarget[] {
    return this.def.shafts.filter((s) => s.peg && this.layerFor(v, s.id) !== null).map((s) => ({ id: s.id, x: s.x, y: s.y }));
  }

  private syncState(): void {
    this.state = this.views.filter((v) => !v.fixed && v.shaft).map((v) => this.placementOf(v)!);
  }

  private lift(v: GearView): void {
    v.freeSpin = 0;
    if (v.shaft) {
      const prev = { shaft: v.shaft, layer: v.layer };
      v.shaft = undefined;
      v.layer = undefined;
      this.syncState();
      this.resolve(false);
      this.undoStack.push(() => {
        v.shaft = prev.shaft;
        v.layer = prev.layer;
        this.syncState();
      });
    }
  }

  private dropOn(v: GearView, t: SnapTarget | null): void {
    if (!t) {
      this.floatHome(v.img, v.home!, TRAY_SCALE);
      return;
    }
    const layer = this.layerFor(v, t.id);
    const s = this.def.shafts.find((q) => q.id === t.id)!;
    if (layer === null || !canPlaceGear(this.def, this.othersOf(v), { shaft: t.id, layer, teeth: v.teeth })) {
      this.refuse(v.img, s, v.home!, TRAY_SCALE);
      return;
    }
    v.shaft = t.id;
    v.layer = layer;
    this.lastPlaced = v;
    this.syncState();
    this.tweens.killTweensOf(v.img);
    this.tweens.add({ targets: v.img, x: s.x, y: s.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    v.img.setDepth(D.mech + 1 + layer * 2);
    if (!settings().calm) landSquash(this, v.img);
    this.clunkAt(s.x, s.y);
    this.act(() => {
      v.shaft = undefined;
      v.layer = undefined;
      this.syncState();
    });
    this.resolve(true);
    if (!this.isPowered(v)) {
      this.time.delayedCall(180, () => {
        sfx.whirr();
        v.freeSpin = 7;
        this.kip.shrug();
      });
    } else this.checkFunnyWrong();
  }

  /** A gear that fits but makes the machine misbehave (backwards hands, too fast) — a funny-wrong fix. */
  private checkFunnyWrong(): void {
    const bad = this.evalR.outputs.some((o, i) => o.omega !== 0 && !o.ok && !this.evalR.sol.jammed && this.def.outputs[i]);
    if (bad && setFlag(profile(), 'funnyWrong')) persistSoon();
  }

  private isPowered(v: GearView): boolean {
    return v.omega !== 0 || (this.evalR?.sol.omega.get(this.nodeId(v)) ?? 0) !== 0;
  }

  private nodeId(v: GearView): string {
    return v.fixed ? v.id : v.shaft ? gearId(v.shaft, v.layer!) : v.id;
  }

  /** Match drawer gears to the placements in `state` (used after undo and the debug solver). */
  protected refresh(): void {
    const want = [...this.state];
    const free = this.views.filter((v) => !v.fixed);
    for (const v of free) {
      v.shaft = undefined;
      v.layer = undefined;
    }
    for (const p of want) {
      const v = free.find((q) => q.teeth === p.teeth && !q.shaft);
      if (!v) continue;
      v.shaft = p.shaft;
      v.layer = p.layer;
    }
    for (const v of free) {
      this.tweens.killTweensOf(v.img);
      if (v.shaft) {
        const s = this.def.shafts.find((q) => q.id === v.shaft)!;
        v.img.setPosition(s.x, s.y).setScale(1).setDepth(D.mech + 1 + (v.layer ?? 0) * 2);
      } else {
        v.img.setPosition(v.home!.x, v.home!.y).setScale(TRAY_SCALE).setDepth(D.trayPart);
      }
    }
    this.syncState();
    this.resolve(false);
  }

  private resolve(cascade: boolean): void {
    const before = new Set(this.views.filter((v) => v.omega !== 0).map((v) => v));
    this.evalR = evalGears(this.def, this.state);
    const sol = this.evalR.sol;
    if (sol.jammed) {
      sfx.nuhUh();
      if (setFlag(profile(), 'jam')) persistSoon();
      this.bubble?.say(LINES['room.jam'].text, { id: 'room.jam', ms: 3000 });
      for (const v of this.views) {
        v.omega = 0;
        this.tweens.add({ targets: v.img, x: v.img.x + 3, duration: 50, yoyo: true, repeat: 4 });
      }
      // pop the last part back out (GDD §11.1)
      const last = this.lastPlaced;
      if (last) {
        this.time.delayedCall(600, () => {
          last.shaft = undefined;
          last.layer = undefined;
          this.syncState();
          this.floatHome(last.img, last.home!, TRAY_SCALE);
          this.resolve(false);
        });
      }
      return;
    }
    const parent = new Map<string, string>();
    for (const [a, b] of sol.powerEdges) parent.set(b, a);
    let step = 0;
    for (const id of sol.order) {
      const v = this.views.find((q) => this.nodeId(q) === id);
      if (!v) continue;
      if (before.has(v) || !cascade) {
        v.omega = sol.omega.get(id) ?? 0;
        continue;
      }
      const n = step++;
      this.time.delayedCall(n * 130, () => {
        const w = this.evalR.sol.omega.get(id) ?? 0;
        if (w === 0) return;
        const p = parent.get(id);
        const pv = p ? this.views.find((q) => this.nodeId(q) === p) : undefined;
        const pn = p ? this.evalR.nodes.find((q) => q.id === p) : undefined;
        const me = this.evalR.nodes.find((q) => q.id === id);
        if (pv && pn && me) v.img.rotation = meshPhase(pn, pv.img.rotation, me);
        v.omega = w;
        v.freeSpin = 0;
        sfx.tick(1 + n * 0.08);
        this.tweens.add({ targets: v.img, scale: v.img.scale * 1.05, duration: 70, yoyo: true });
        this.sparkleAt(v.img.x, v.img.y, 5);
      });
    }
    for (const v of this.views) if ((sol.omega.get(this.nodeId(v)) ?? 0) === 0) v.omega = 0;
    if (this.liveCheck) this.time.delayedCall(cascade ? step * 130 + 200 : 0, () => this.checkSolved());
  }

  protected checkSolved(): void {
    if (!this.evalR) return;
    super.checkSolved();
  }

  // ───────────── hints, ghosts, peek ─────────────

  protected hintTarget(): HintTarget | null {
    for (const p of this.def.solution) {
      const here = this.state.find((q) => q.shaft === p.shaft && q.layer === p.layer);
      if (here?.teeth === p.teeth) continue;
      const s = this.def.shafts.find((q) => q.id === p.shaft)!;
      const v = this.views.find((q) => !q.fixed && q.teeth === p.teeth && !(q.shaft && this.def.solution.some((r) => r.shaft === q.shaft && r.layer === q.layer && r.teeth === q.teeth)));
      return { from: v ? { x: v.img.x, y: v.img.y } : undefined, to: { x: s.x, y: s.y } };
    }
    return null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    for (const p of this.def.solution) {
      const here = this.state.find((q) => q.shaft === p.shaft && q.layer === p.layer);
      if (here) continue;
      const s = this.def.shafts.find((q) => q.id === p.shaft)!;
      const r = pitchRadius(p.teeth);
      g.fillStyle(TONE.highlight, alpha * 0.4);
      g.fillCircle(s.x, s.y, r);
      g.lineStyle(LINE.bold, TONE.highlight, alpha + 0.2);
      g.strokeCircle(s.x, s.y, r + MODULE * 0.8);
      for (let i = 0; i < p.teeth; i++) {
        const a = (i / p.teeth) * Math.PI * 2 + this.time.now / 3000;
        g.fillStyle(TONE.highlight, alpha + 0.2);
        g.fillCircle(s.x + Math.cos(a) * (r + MODULE * 0.8), s.y + Math.sin(a) * (r + MODULE * 0.8), 2.5);
      }
    }
  }

  protected drawBlueprint(g: Phaser.GameObjects.Graphics, pulse: number): void {
    const sol = this.evalR.sol;
    for (const n of this.evalR.nodes) {
      const powered = (sol.omega.get(n.id) ?? 0) !== 0;
      g.lineStyle(3, powered ? TONE.power : TONE.idle, powered ? 0.95 : 0.6);
      g.strokeCircle(n.x, n.y, pitchRadius(n.teeth));
      g.fillStyle(powered ? TONE.power : TONE.idle, 0.9);
      g.fillCircle(n.x, n.y, 5);
    }
    for (const [a, b] of sol.powerEdges) {
      const na = this.evalR.nodes.find((q) => q.id === a)!;
      const nb = this.evalR.nodes.find((q) => q.id === b)!;
      g.lineStyle(12, CM.copperLight, 0.25);
      g.lineBetween(na.x, na.y, nb.x, nb.y);
      g.lineStyle(4, TONE.powerHot, 0.95);
      g.lineBetween(na.x, na.y, nb.x, nb.y);
    }
    this.evalR.outputs.forEach((o, i) => {
      const out = this.def.outputs[i];
      const s = this.def.shafts.find((q) => q.id === out.shaft)!;
      if (o.omega !== 0) {
        g.lineStyle(4, TONE.powerHot, 0.95);
        g.lineBetween(s.x, s.y, out.at.x, out.at.y);
      }
    });
    // power pools where it stops: sparkle at empty pegs next to powered gears
    for (const s of this.def.shafts) {
      if (!s.peg) continue;
      const empty = !this.state.some((p) => p.shaft === s.id);
      if (!empty) continue;
      const near = this.evalR.nodes.some((n) => (sol.omega.get(n.id) ?? 0) !== 0 && Math.hypot(n.x - s.x, n.y - s.y) < 260);
      if (!near && s.id !== this.def.driver.shaft) continue;
      g.fillStyle(CM.copperLight, 0.25 + pulse * 0.35);
      g.fillCircle(s.x, s.y, 16 + pulse * 12);
      g.lineStyle(LINE.bold, TONE.highlight, 0.4 + pulse * 0.5);
      g.strokeCircle(s.x, s.y, 22 + pulse * 10);
    }
  }

  protected solutionSteps(): number {
    return this.def.solution.length + (this.def.initial?.length ?? 0);
  }

  // ───────────── per frame ─────────────

  protected tick(dt: number): void {
    for (const v of this.views) {
      if (v.omega !== 0) v.img.rotation += v.omega * dt;
      else if (v.freeSpin > 0.05) {
        v.img.rotation += v.freeSpin * dt;
        v.freeSpin *= Math.pow(0.35, dt);
      }
      v.label?.setPosition(v.img.x, v.img.y);
    }
    const omegaIn = this.evalR ? Math.abs(this.evalR.omegaIn) : 1;
    this.driverAngle += (this.evalR?.omegaIn ?? 0) * dt;
    this.drawDriver(dt);
    this.widgets.forEach((w, i) => {
      const o = this.evalR?.outputs[i];
      const omega = o?.omega ?? 0;
      w.a += omega * dt;
      w.b += (w.out.ratio !== undefined && w.out.widget === 'hands' ? (omega !== 0 ? this.evalR.omegaIn : 0) : omega / 12) * dt;
      this.drawWidget(w, omega, dt);
      if (w.label) {
        const r = o ? Math.abs(o.ratio) : 0;
        const goal =
          w.out.ratio !== undefined ? ` (goal ×${fmt(w.out.ratio)})` : w.out.maxRatio !== undefined ? ` (goal ≤ ×${fmt(w.out.maxRatio)})` : w.out.minRatio !== undefined ? ` (goal ≥ ×${fmt(w.out.minRatio)})` : '';
        w.label.setText(omega === 0 ? `${w.out.label ?? ''} no power`.trim() : `${w.out.label ? w.out.label + ': ' : ''}×${fmt(r)} ${omega > 0 ? '↻' : '↺'}${goal}`);
      }
    });
    void omegaIn;
  }

  private drawDriver(dt: number): void {
    const g = this.driverG;
    g.clear();
    const s = this.def.shafts.find((q) => q.id === this.def.driver.shaft)!;
    const src = this.def.driver.source;
    const w = this.evalR?.omegaIn ?? 0;
    const at = this.def.driver.at ?? { x: s.x, y: s.y };
    const teeth = this.views.find((v) => v.shaft === s.id)?.teeth ?? 20;
    const r = pitchRadius(teeth);
    if (src === 'weights') {
      this.chainOffset += Math.abs(w) * r * dt;
      const wx = s.x - r - 2;
      const link = 14;
      const off = this.chainOffset % link;
      g.lineStyle(3, 0x8f8a7a, 1);
      for (let y = s.y + off - link; y < s.y + 150; y += link) {
        if (y < s.y) continue;
        const vert = Math.round((y - off) / link) % 2 === 0;
        g.strokeEllipse(wx, y, vert ? 7 : 3, 13);
      }
      g.fillStyle(0x9a6b1f, 1);
      g.fillEllipse(wx, s.y + 175, 44, 80);
      g.fillStyle(0xf6d27a, 0.6);
      g.fillEllipse(wx - 10, s.y + 160, 10, 36);
    } else if (src === 'crank') {
      const a = this.driverAngle;
      const hx = s.x + Math.cos(a) * (r + 18);
      const hy = s.y + Math.sin(a) * (r + 18);
      g.lineStyle(8, 0x554638, 1);
      g.lineBetween(s.x, s.y, hx, hy);
      g.fillStyle(0xad6b51, 1);
      g.fillCircle(hx, hy, 11);
    } else if (src === 'spring') {
      g.lineStyle(4, 0x9aaba4, 0.9);
      g.beginPath();
      for (let i = 0; i < 80; i++) {
        const a = i * 0.3 - this.driverAngle * 0.2;
        const rr = 8 + i * ((r + 22) / 80);
        g.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr);
      }
      g.strokePath();
    } else if (src === 'motor') {
      g.fillStyle(0x3b7dd8, 1);
      g.fillRoundedRect(s.x - r - 70, s.y - 30, 60, 60, 10);
      if (Math.random() < 0.2) {
        g.fillStyle(0xfff3b0, 1);
        g.fillCircle(s.x - r - 40 + (Math.random() - 0.5) * 40, s.y - 34, 3);
      }
    } else if (src === 'steam' || src === 'water') {
      const p = Math.sin(this.driverAngle) * 20;
      g.fillStyle(src === 'steam' ? 0x82938c : 0x5fa8d3, 1);
      g.fillRect(s.x - r - 90, s.y - 16 + p * 0.2, 70, 32);
    }
    void at;
  }

  /**
   * A speed gauge for an output with a speed goal: a half dial with the goal zone in green and a
   * needle for how fast the output turns compared with the driver.
   */
  private drawSpeedGauge(g: Phaser.GameObjects.Graphics, w: (typeof this.widgets)[number], omega: number, x: number, y: number): void {
    const out = w.out;
    const goal = out.ratio ?? out.maxRatio ?? out.minRatio;
    if (goal === undefined) return;
    const omegaIn = this.evalR ? Math.abs(this.evalR.omegaIn) : 0;
    const ratio = omegaIn ? Math.abs(omega) / omegaIn : 0;
    const top = Math.max(goal * 3, 2);
    const ang = (v: number) => Math.PI + Math.min(1, v / top) * Math.PI;
    const R = 46;
    toyDialFace(g, x, y, R);
    // the goal zone
    const tol = out.tol ?? 0.06;
    const z0 = out.ratio !== undefined ? goal * (1 - tol) : out.maxRatio !== undefined ? 0 : goal;
    const z1 = out.ratio !== undefined ? goal * (1 + tol) : out.maxRatio !== undefined ? goal : top;
    g.fillStyle(TONE.ok, 0.9);
    g.slice(x, y, R - 4, ang(z0), ang(Math.max(z1, z0 + top * 0.03)), false);
    g.fillPath();
    g.fillStyle(TONE.face, 1);
    g.fillCircle(x, y, R - 22);
    // the needle
    const a = ang(ratio);
    g.lineStyle(5, TONE.warn, 1);
    g.lineBetween(x, y, x + Math.cos(a) * (R - 6), y + Math.sin(a) * (R - 6));
    toyDisc(g, x, y, 7, CM.copperLight, TONE.outline);
  }

  /**
   * A Quick Fix toy driven by the gears: the mouse or car scoots and bobs, the bath boat rocks on
   * the water with its paddle wheel churning, the pepper mill turns and sprinkles, the top spins.
   * Standing still until the gears reach it.
   */
  private drawToy(w: (typeof this.widgets)[number], omega: number): void {
    const g = w.g;
    const img = w.toy!;
    const base = img.getData('base') as number;
    const { x, y } = w.out.at;
    const size = w.out.size ?? 70;
    const t = this.time.now / 1000;
    const on = omega !== 0;
    const fast = Math.min(1, Math.abs(omega) / 6);
    img.setScale(base).setRotation(0).setPosition(x, y);
    switch (w.out.widget) {
      case 'wheels': {
        // ground, the toy scooting back and forth, speed lines behind it
        const scoot = on ? Math.sin(w.a * 0.35) * 26 : 0;
        const bob = on ? -Math.abs(Math.sin(w.a * 2)) * 5 : 0;
        g.fillStyle(0x000000, 0.22);
        g.fillEllipse(x + scoot, y + size * 0.62, size * 1.6, 16);
        img.setPosition(x + scoot, y + bob).setRotation(on ? Math.sin(w.a * 2) * 0.03 : 0);
        if (on) {
          const dir = Math.cos(w.a * 0.35) >= 0 ? -1 : 1;
          g.lineStyle(4, 0xf4ebd5, 0.4 + fast * 0.4);
          for (let k = 0; k < 3; k++) {
            const ly = y - 20 + k * 22;
            const lx = x + scoot + dir * (size * 0.95 + k * 8);
            g.lineBetween(lx, ly, lx + dir * (24 + fast * 20), ly);
          }
        }
        break;
      }
      case 'paddle': {
        // water, the boat rocking on it, the paddle wheel at the stern
        const rock = Math.sin(t * 1.6) * 0.05;
        const bob = Math.sin(t * 2) * 4;
        const wx = x - size * 0.95;
        const wy = y + size * 0.35;
        // the paddle wheel turns with the gears
        g.lineStyle(5, 0x6e5236, 1);
        g.strokeCircle(wx, wy + bob, size * 0.36);
        for (let k = 0; k < 6; k++) {
          const a = w.a + (k / 6) * Math.PI * 2;
          g.lineStyle(6, 0x856c50, 1);
          g.lineBetween(wx, wy + bob, wx + Math.cos(a) * size * 0.42, wy + bob + Math.sin(a) * size * 0.42);
        }
        g.fillStyle(0xbca16a, 1);
        g.fillCircle(wx, wy + bob, 7);
        img.setPosition(x, y + bob).setRotation(rock);
        // the water, in front so the boat sits in it
        g.fillStyle(0x4f8fb0, 0.85);
        g.fillRoundedRect(x - size * 1.6, y + size * 0.55, size * 3.2, size * 0.5, 14);
        g.lineStyle(3, 0xbfe3f2, 0.9);
        for (let k = 0; k < 6; k++) {
          const wx2 = x - size * 1.4 + k * size * 0.55 + Math.sin(t * 2 + k) * 6;
          g.beginPath();
          g.arc(wx2, y + size * 0.62, 10, Math.PI * 1.1, Math.PI * 1.9, false);
          g.strokePath();
        }
        if (on) {
          g.fillStyle(0xd5f5e3, 0.8);
          for (let k = 0; k < 4; k++) g.fillCircle(wx + Math.sin(t * 9 + k) * 18, wy + size * 0.3 - Math.abs(Math.sin(t * 7 + k * 2)) * 22, 4 + (k % 2) * 2);
        }
        break;
      }
      case 'grinder': {
        // the mill twists and pepper falls
        img.setRotation(on ? Math.sin(w.a * 2) * 0.08 : 0);
        if (on) {
          g.fillStyle(0x342f29, 0.8);
          for (let k = 0; k < 8; k++) {
            const fall = (t * 1.6 + k / 8) % 1;
            g.fillCircle(x - 10 + ((k * 7) % 20), y + size * 0.8 + fall * 60, 2.5);
          }
        }
        break;
      }
      case 'spinner': {
        // the top spins upright when driven, and leans over when it isn't
        g.fillStyle(0x000000, 0.2);
        g.fillEllipse(x, y + size * 0.78, size * 1.1, 14);
        if (on) {
          const sx = Math.cos(w.a * 3);
          img.setScale(base * (Math.abs(sx) < 0.2 ? 0.2 * Math.sign(sx || 1) : sx), base).setRotation(Math.sin(t * 5) * 0.04 * (1 - fast));
          g.lineStyle(3, 0xf4ebd5, 0.5);
          g.beginPath();
          g.arc(x, y + size * 0.2, size * 0.9, Math.PI * 1.15, Math.PI * 1.45, false);
          g.strokePath();
          g.beginPath();
          g.arc(x, y + size * 0.2, size * 0.9, Math.PI * 1.55, Math.PI * 1.85, false);
          g.strokePath();
        } else img.setRotation(0.5).setPosition(x + 10, y + 10);
        break;
      }
    }
    this.drawSpeedGauge(g, w, omega, x, y + size + 60);
  }

  protected onFixed(): void {
    super.onFixed();
    // the customer is delighted
    if (this.owner?.active) {
      this.owner.setMood('laugh');
      this.tweens.add({ targets: this.owner, y: this.owner.y - 26, duration: 220, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
    }
  }

  private drawWidget(w: (typeof this.widgets)[number], omega: number, dt: number): void {
    const g = w.g;
    const { x, y } = w.out.at;
    const size = w.out.size ?? 70;
    g.clear();
    if (w.toy) return this.drawToy(w, omega);
    const t = this.time.now / 1000;
    switch (w.out.widget) {
      case 'hands': {
        g.fillStyle(0x000000, 0.35);
        g.fillCircle(x + 6, y + 10, size + 18);
        g.fillStyle(0x3a2212, 1);
        g.fillCircle(x, y, size + 18);
        g.fillStyle(0xb88a2c, 1);
        g.fillCircle(x, y, size + 6);
        g.fillStyle(0xe9dcc0, 1);
        g.fillCircle(x, y, size);
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2;
          const big = i % 5 === 0;
          g.lineStyle(big ? 4 : 2, 0x3b260b, big ? 1 : 0.5);
          const r1 = size - (big ? 16 : 9);
          g.lineBetween(x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * (size - 4), y + Math.sin(a) * (size - 4));
        }
        const m = w.out.ratio !== undefined ? w.b : w.a;
        const h = w.out.ratio !== undefined ? w.a : w.b;
        g.lineStyle(10, 0x342f29, 1);
        g.lineBetween(x, y, x + Math.sin(h) * size * 0.5, y - Math.cos(h) * size * 0.5);
        g.lineStyle(6, 0x342f29, 1);
        g.lineBetween(x, y, x + Math.sin(m) * size * 0.82, y - Math.cos(m) * size * 0.82);
        g.fillStyle(0xb88a2c, 1);
        g.fillCircle(x, y, 11);
        if (omega !== 0) {
          w.beat += dt;
          if (w.beat > 0.6) {
            w.beat = 0;
            sfx.tock();
          }
        }
        break;
      }
      case 'fan': {
        // a brass fan in a guard ring; spinning fast it blurs into a disc
        const fast = Math.min(1, Math.abs(omega) / 8);
        g.fillStyle(0x000000, 0.25);
        g.fillCircle(x + 5, y + 8, size + 10);
        g.fillStyle(0x3d2b25, 1);
        g.fillCircle(x, y, size + 10);
        g.fillStyle(0xe9dcc0, 1);
        g.fillCircle(x, y, size + 2);
        if (fast > 0.3) {
          g.fillStyle(0xc8a24e, 0.25 + fast * 0.35);
          g.fillCircle(x, y, size * 0.95);
        }
        for (let i = 0; i < 4; i++) {
          const a = w.a + (i / 4) * Math.PI * 2;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const P = (r: number, side: number) => new Phaser.Math.Vector2(x + ca * r - sa * side, y + sa * r + ca * side);
          const blade = [P(14, -8), P(size * 0.92, -size * 0.26), P(size * 0.95, size * 0.1), P(14, 8)];
          g.fillStyle(0x7a5a24, 1 - fast * 0.5);
          g.fillPoints(blade.map((p) => new Phaser.Math.Vector2(p.x + 3, p.y + 3)), true);
          g.fillStyle(0xd9b45f, 1 - fast * 0.5);
          g.fillPoints(blade, true);
          g.lineStyle(2, 0x6e4a14, 1 - fast * 0.5);
          g.strokePoints(blade, true, true);
        }
        g.lineStyle(3, 0x6e4a14, 0.6);
        for (let k = 1; k <= 3; k++) g.strokeCircle(x, y, (size * k) / 3.2);
        g.lineStyle(6, 0xb88a2c, 1);
        g.strokeCircle(x, y, size + 4);
        g.fillStyle(0x554638, 1);
        g.fillCircle(x, y, 16);
        g.fillStyle(0xbca16a, 1);
        g.fillCircle(x, y, 8);
        this.drawSpeedGauge(g, w, omega, x, y + size + 44);
        break;
      }
      case 'wheels':
      case 'paddle': {
        for (const dx of [-size * 0.6, size * 0.6]) {
          g.lineStyle(6, w.out.widget === 'paddle' ? 0x856c50 : 0x2b2b33, 1);
          g.strokeCircle(x + dx, y, size * 0.45);
          for (let i = 0; i < 6; i++) {
            const a = w.a + (i / 6) * Math.PI * 2;
            g.lineStyle(4, 0x555555, 1);
            g.lineBetween(x + dx, y, x + dx + Math.cos(a) * size * 0.45, y + Math.sin(a) * size * 0.45);
          }
        }
        g.lineStyle(6, 0xbca16a, 1);
        const px = Math.cos(w.a) * size * 0.25;
        const py = Math.sin(w.a) * size * 0.25;
        g.lineBetween(x - size * 0.6 + px, y + py, x + size * 0.6 + px, y + py);
        if (w.out.widget === 'paddle' && omega !== 0) {
          g.fillStyle(0x74c0fc, 0.6);
          for (let i = 0; i < 3; i++) g.fillCircle(x + (i - 1) * 30, y + size * 0.5 + Math.sin(t * 8 + i) * 6, 6);
        }
        break;
      }
      case 'arm': {
        const a = w.a;
        g.lineStyle(4, 0xb88a2c, 0.9);
        g.strokeCircle(x, y, size);
        g.lineStyle(5, 0xbca16a, 1);
        g.lineBetween(x, y, x + Math.cos(a) * size, y + Math.sin(a) * size);
        // a planet you can tell apart: grey cratered Mercury, creamy Venus, blue-and-green Earth
        const colors: Record<string, number> = { Mercury: 0xa8a29a, Venus: 0xe8c39e, Earth: 0x4f8fd0 };
        const sizes: Record<string, number> = { Mercury: 14, Venus: 19, Earth: 22 };
        const px = x + Math.cos(a) * size, py = y + Math.sin(a) * size;
        const pr = sizes[w.out.label ?? ''] ?? 16;
        g.fillStyle(0x000000, 0.3);
        g.fillCircle(px + 3, py + 4, pr);
        g.fillStyle(colors[w.out.label ?? ''] ?? 0xe05a47, 1);
        g.fillCircle(px, py, pr);
        if (w.out.label === 'Earth') {
          g.fillStyle(0x5f9a4a, 1);
          g.fillEllipse(px - pr * 0.3, py - pr * 0.2, pr * 0.8, pr * 0.6);
          g.fillEllipse(px + pr * 0.35, py + pr * 0.35, pr * 0.6, pr * 0.4);
        } else if (w.out.label === 'Mercury') {
          g.fillStyle(0x7d776f, 1);
          g.fillCircle(px - pr * 0.3, py - pr * 0.2, pr * 0.25);
          g.fillCircle(px + pr * 0.35, py + pr * 0.25, pr * 0.18);
        } else {
          g.fillStyle(0xd4a874, 0.8);
          g.fillEllipse(px, py - pr * 0.25, pr * 1.6, pr * 0.3);
          g.fillEllipse(px, py + pr * 0.3, pr * 1.6, pr * 0.3);
        }
        g.fillStyle(0xffffff, 0.35);
        g.fillCircle(px - pr * 0.35, py - pr * 0.4, pr * 0.3);
        g.lineStyle(2, 0x342f29, 0.8);
        g.strokeCircle(px, py, pr);
        g.fillStyle(0xf1d391, 1);
        g.fillCircle(x, y, 18);
        break;
      }
      case 'lift': {
        const h = ((w.a / (Math.PI * 2)) * 30) % 160;
        g.lineStyle(3, 0xc8b28a, 1);
        g.lineBetween(x, y - size, x, y + 80 - h);
        g.fillStyle(0x856c50, 1);
        g.fillRect(x - 40, y + 80 - h, 80, 12);
        break;
      }
      case 'drum':
      case 'grinder':
      case 'spinner':
      case 'bell':
      case 'dial': {
        if (w.out.widget === 'spinner') {
          const sx = Math.abs(Math.cos(w.a * 3));
          g.fillStyle(0xe05a47, 1);
          g.fillTriangle(x - size * 0.6, y - 10, x + size * 0.6, y - 10, x, y + size * 0.7);
          g.fillStyle(0xffd43b, 1);
          g.fillEllipse(x, y - 10, size * 1.2 * Math.max(0.2, sx), 16);
        } else if (w.out.widget === 'grinder') {
          g.fillStyle(0x554638, 1);
          g.fillRoundedRect(x - 30, y - size * 0.6, 60, size * 1.2, 14);
          g.fillStyle(0x342f29, 1);
          g.fillCircle(x + Math.cos(w.a) * 14, y - size * 0.6 + Math.sin(w.a) * 5, 9);
          if (omega !== 0 && Math.random() < 0.15) {
            g.fillStyle(0x333333, 0.6);
            g.fillCircle(x + (Math.random() - 0.5) * 30, y + size * 0.7 + Math.random() * 20, 3);
          }
        } else if (w.out.widget === 'bell') {
          g.fillStyle(0xbca16a, 1);
          g.fillTriangle(x - 30, y + 20, x + 30, y + 20, x, y - 30);
          g.fillCircle(x, y - 14, 18);
          const hit = Math.sin(w.a) > 0.95;
          g.lineStyle(5, 0x554638, 1);
          g.lineBetween(x + 50, y + 30, x + (hit ? 28 : 40), y - 6);
          if (omega !== 0) {
            w.beat += Math.abs(omega) * dt;
            if (w.beat > Math.PI * 2) {
              w.beat = 0;
              sfx.ding(1320);
            }
          }
        } else {
          g.fillStyle(0x3a2212, 1);
          g.fillCircle(x, y, (w.out.size ?? 50) + 8);
          g.fillStyle(0xe9dcc0, 1);
          g.fillCircle(x, y, w.out.size ?? 50);
          g.lineStyle(5, 0x342f29, 1);
          const s = (w.out.size ?? 50) * 0.8;
          g.lineBetween(x, y, x + Math.sin(w.a) * s, y - Math.cos(w.a) * s);
          if (w.out.widget === 'drum' && omega !== 0) {
            w.beat += Math.abs(omega) * dt;
            if (w.beat > Math.PI / 2) {
              w.beat = 0;
              sfx.note([523, 659, 784, 1046][Math.floor(Math.random() * 4)], 'pluck', 0.4);
            }
          }
        }
        break;
      }
    }
  }
}

function fmt(n: number): string {
  if (n === 0) return '0';
  if (n < 1) {
    const inv = 1 / n;
    if (Math.abs(inv - Math.round(inv)) < 0.02) return `1/${Math.round(inv)}`;
    return n.toFixed(2);
  }
  return Number.isInteger(Math.round(n * 100) / 100) ? String(Math.round(n)) : n.toFixed(2);
}
