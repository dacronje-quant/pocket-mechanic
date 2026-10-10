/**
 * Levers & pulleys (GDD §8.2). Slide the fulcrum, hang weights, then pull:
 * the side that turns harder goes down. Pulley wheels share the load, so
 * Kip's tiny pull can lift a bridge. Wrong tries wobble and drop back.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { CM, drawPatina } from '../art/copperMoss';
import { leverTilt, pulleyEffort } from '../mechanism/balance';
import { balanceSolved, leverWeights } from '../rules';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { FONT, roundButton } from '../ui/widgets';

const STEP = 64;
const BX = 640;
const BY = 360;

interface WeightView {
  mass: number;
  obj: Phaser.GameObjects.Container;
  home: { x: number; y: number };
  slot: number | null;
}

export class BalanceRoom extends RoomBase<'balance'> {
  private g!: Phaser.GameObjects.Graphics;
  private fulcrumKnob?: Phaser.GameObjects.Container;
  private weights: WeightView[] = [];
  private wheels: Phaser.GameObjects.Container[] = [];
  private tilt = 0;
  private tiltTarget = 0;
  private lift = 0;
  private liftTarget = 0;
  private trying = 0;
  private t = 0;

  constructor() {
    super('room-balance');
  }

  protected build(): void {
    this.weights = [];
    this.wheels = [];
    this.tilt = 0;
    this.tiltTarget = 0;
    this.lift = 0;
    this.liftTarget = 0;
    this.trying = 0;
    this.liveCheck = false;
    this.g = this.add.graphics().setDepth(D.mech);
    if (this.def.mode === 'lever') this.buildLever();
    else this.buildPulley();
    const icon = this.def.mode === 'lever' && !this.def.lever?.kip ? '✋' : '💪';
    roundButton(this, 1180, 600, icon, () => this.pull(), { r: 48, fontSize: 40, color: 0xa0a477, say: 'Pull!' }).setDepth(D.hud);
  }

  // ───────────── lever ─────────────

  private buildLever(): void {
    const L = this.def.lever!;
    if ((L.fulcrumMin ?? L.fulcrum) !== (L.fulcrumMax ?? L.fulcrum)) {
      const k = this.add.container(BX + this.state.fulcrum * STEP, BY + 60).setDepth(D.parts + 1);
      const kg = this.add.graphics();
      // the fulcrum reaches right up to the beam's pivot pin (the beam rests on it)
      kg.fillStyle(0x000000, 0.3);
      kg.fillTriangle(-40, 54, 44, 54, 2, -54);
      kg.fillStyle(0x7a4b26, 1);
      kg.fillTriangle(-42, 50, 42, 50, 0, -58);
      kg.lineStyle(2, 0x3d2b1e, 0.8);
      kg.strokeTriangle(-42, 50, 42, 50, 0, -58);
      kg.fillStyle(0xbca16a, 1);
      kg.fillCircle(0, 18, 10);
      k.add(kg);
      k.setSize(100, 80);
      k.setInteractive({ draggable: true, useHandCursor: true });
      let start = this.state.fulcrum;
      k.on('dragstart', () => {
        start = this.state.fulcrum;
        this.idle = 0;
      });
      k.on('drag', (p: Phaser.Input.Pointer) => {
        const f = Phaser.Math.Clamp(Math.round((p.worldX - BX) / STEP), L.fulcrumMin ?? L.fulcrum, L.fulcrumMax ?? L.fulcrum);
        if (f !== this.state.fulcrum) {
          this.state.fulcrum = f;
          sfx.ratchet(1);
        }
      });
      k.on('dragend', () => {
        if (start !== this.state.fulcrum) {
          const was = start;
          this.act(() => (this.state.fulcrum = was));
        }
      });
      this.fulcrumKnob = k;
    }
    const spots = this.traySpots(L.tray.length);
    L.tray.forEach((mass, i) => {
      const c = this.add.container(spots[i].x, spots[i].y).setDepth(D.trayPart).setScale(0.8);
      const wg = this.add.graphics();
      const s = 20 + mass * 6;
      wg.fillStyle(0x000000, 0.3);
      wg.fillRoundedRect(-s / 2 + 3, -s / 2 + 5, s, s, 8);
      wg.fillStyle(0x60736d, 1);
      wg.fillRoundedRect(-s / 2, -s / 2, s, s, 8);
      wg.fillStyle(0x82938c, 1);
      wg.fillRoundedRect(-s / 2 + 4, -s / 2 + 4, s - 8, s * 0.35, 5);
      wg.lineStyle(1.5, CM.ink, 0.8);
      wg.strokeRoundedRect(-s / 2, -s / 2, s, s, 8);
      drawPatina(wg, -s / 2 + 3, -s / 2 + 3, s - 6, s - 6, mass * 83, 1.5);
      c.add(wg);
      // dots show the weight without numbers
      for (let k = 0; k < mass; k++) c.add(this.add.circle(-((mass - 1) * 6) / 2 + k * 6, s * 0.18, 2.5, 0xf4ebd5));
      if (this.style.numbers) c.add(this.add.text(0, -s / 2 - 12, String(mass), { fontFamily: FONT, fontSize: '16px', color: '#f4ebd5', fontStyle: 'bold', stroke: '#342f29', strokeThickness: 4 }).setOrigin(0.5));
      c.setSize(s + 20, s + 20);
      const v: WeightView = { mass, obj: c, home: spots[i], slot: null };
      this.weights.push(v);
      this.enableDrag({
        obj: c,
        restScale: 0.8,
        targets: () => L.slots.filter((sl) => !this.weights.some((w) => w !== v && w.slot === sl)).map((sl) => ({ id: String(sl), ...this.beamPoint(sl, -40) })),
        pick: () => {
          if (v.slot !== null) {
            const was = v.slot;
            v.slot = null;
            this.syncWeights();
            this.undoStack.push(() => {
              v.slot = was;
              this.syncWeights();
            });
          }
        },
        drop: (t) => this.dropWeight(v, t),
      });
    });
  }

  private beamPoint(pos: number, up = 0): { x: number; y: number } {
    const f = this.state.fulcrum;
    const a = this.tilt;
    const dx = (pos - f) * STEP;
    return { x: BX + f * STEP + Math.cos(a) * dx - Math.sin(a) * up, y: BY + Math.sin(a) * dx + Math.cos(a) * up };
  }

  private syncWeights(): void {
    this.state.weights = this.weights.filter((w) => w.slot !== null).map((w) => ({ slot: w.slot!, mass: w.mass }));
  }

  private dropWeight(v: WeightView, t: SnapTarget | null): void {
    if (!t) return this.floatHome(v.obj, v.home, 0.8);
    v.slot = Number(t.id);
    v.obj.setScale(1).setDepth(D.parts);
    this.syncWeights();
    this.clunkAt(t.x, t.y);
    this.act(() => {
      v.slot = null;
      this.syncWeights();
    });
  }

  // ───────────── pulley ─────────────

  private buildPulley(): void {
    const P = this.def.pulley!;
    const spots = this.traySpots(P.wheels);
    for (let i = 0; i < P.wheels; i++) {
      const c = this.add.container(spots[i].x, spots[i].y).setDepth(D.trayPart).setScale(0.8);
      const wg = this.add.graphics();
      wg.fillStyle(0x82938c, 1);
      wg.fillCircle(0, 0, 30);
      wg.fillStyle(0x5a6470, 1);
      wg.fillCircle(0, 0, 22);
      wg.fillStyle(0xbca16a, 1);
      wg.fillCircle(0, 0, 8);
      c.add(wg);
      c.setSize(70, 70);
      c.setData('slot', -1);
      c.setData('home', spots[i]);
      this.wheels.push(c);
      this.enableDrag({
        obj: c,
        restScale: 0.8,
        targets: () => this.pulleySlots().filter((s) => !this.wheels.some((w) => w !== c && w.getData('slot') === Number(s.id))),
        pick: () => {
          if (c.getData('slot') >= 0) {
            const was = c.getData('slot') as number;
            c.setData('slot', -1);
            this.state.wheels = this.wheels.filter((w) => w.getData('slot') >= 0).length;
            this.undoStack.push(() => {
              c.setData('slot', was);
              this.state.wheels = this.wheels.filter((w) => w.getData('slot') >= 0).length;
            });
          }
        },
        drop: (t) => {
          if (!t) return this.floatHome(c, spots[i], 0.8);
          c.setData('slot', Number(t.id));
          c.setScale(1).setDepth(D.parts);
          this.tweens.add({ targets: c, x: t.x, y: t.y, duration: 100 });
          this.state.wheels = this.wheels.filter((w) => w.getData('slot') >= 0).length;
          this.clunkAt(t.x, t.y);
          this.act(() => {
            c.setData('slot', -1);
            this.state.wheels = this.wheels.filter((w) => w.getData('slot') >= 0).length;
          });
        },
      });
    }
  }

  private pulleySlots(): SnapTarget[] {
    const n = this.def.pulley!.slots;
    return Array.from({ length: n }, (_, i) => ({ id: String(i), x: 640 + (i - (n - 1) / 2) * 110, y: 170 }));
  }

  // ───────────── pulling ─────────────

  private pull(): void {
    if (this.fixed || this.trying > 0) return;
    this.state.pulled = true;
    this.moves++;
    this.idle = 0;
    this.kip.walkTo(this.def.mode === 'lever' && this.def.lever?.kip ? BX + this.def.lever.kip.pos * STEP : 900);
    const ok = balanceSolved(this.def, this.state);
    if (this.def.mode === 'lever') {
      const tilt = leverTilt(leverWeights(this.def, this.state), this.state.fulcrum);
      this.tiltTarget = tilt * 0.22;
      sfx.ratchet(4);
      if (this.def.lever!.goal.kind === 'balance' && tilt === 0) this.tiltTarget = 0;
    } else {
      const P = this.def.pulley!;
      const effort = pulleyEffort(P.load, this.state.wheels);
      this.liftTarget = ok ? 1 : Math.max(0.05, Math.min(0.3, (P.strength + (P.helper ?? 0)) / effort) * 0.3);
      sfx.whoosh();
    }
    this.trying = 1.6;
    this.time.delayedCall(1300, () => {
      if (ok) this.onFixed();
      else {
        sfx.boing();
        this.kip.giggle();
        this.state.pulled = false;
        this.tiltTarget = 0;
        this.liftTarget = 0;
      }
    });
  }

  protected afterSolutionApplied(): void {
    this.state.pulled = false;
    this.pull();
  }

  protected refresh(): void {
    if (this.def.mode === 'lever') {
      for (const w of this.weights) w.slot = null;
      for (const sw of this.state.weights) {
        const w = this.weights.find((q) => q.slot === null && q.mass === sw.mass);
        if (w) w.slot = sw.slot;
      }
      for (const w of this.weights) if (w.slot === null) w.obj.setPosition(w.home.x, w.home.y).setScale(0.8).setDepth(D.trayPart);
    } else {
      this.wheels.forEach((c, i) => {
        const on = i < this.state.wheels;
        c.setData('slot', on ? i : -1);
        const s = this.pulleySlots()[i];
        if (on && s) c.setPosition(s.x, s.y).setScale(1).setDepth(D.parts);
        else c.setPosition((c.getData('home') as { x: number; y: number }).x, (c.getData('home') as { x: number; y: number }).y).setScale(0.8);
      });
    }
  }

  protected tick(dt: number): void {
    this.t += dt;
    this.trying = Math.max(0, this.trying - dt);
    this.tilt += (this.tiltTarget - this.tilt) * Math.min(1, dt * 4);
    this.lift += (this.liftTarget - this.lift) * Math.min(1, dt * 3);
    const g = this.g;
    g.clear();
    if (this.def.mode === 'lever') this.drawLever(g);
    else this.drawPulley(g);
  }

  private drawLever(g: Phaser.GameObjects.Graphics): void {
    const L = this.def.lever!;
    const f = this.state.fulcrum;
    const pivot = { x: BX + f * STEP, y: BY };
    // fulcrum
    if (!this.fulcrumKnob) {
      // the fulcrum reaches right up to the beam's pivot pin (the beam rests on it)
      g.fillStyle(0x7a4b26, 1);
      g.fillTriangle(pivot.x - 42, BY + 110, pivot.x + 42, BY + 110, pivot.x, BY + 2);
      g.lineStyle(2, 0x3d2b1e, 0.8);
      g.strokeTriangle(pivot.x - 42, BY + 110, pivot.x + 42, BY + 110, pivot.x, BY + 2);
    } else this.fulcrumKnob.setPosition(pivot.x, BY + 60);
    g.fillStyle(0x554638, 1);
    g.fillRect(BX - (L.half + 1) * STEP, BY + 110, (L.half + 1) * 2 * STEP, 12);
    // the beam
    const end = (pos: number) => this.beamPoint(pos, 0);
    const a = end(-L.half - 0.5);
    const b = end(L.half + 0.5);
    g.lineStyle(26, 0x5a3a22, 1);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(18, 0x856c50, 1);
    g.lineBetween(a.x, a.y, b.x, b.y);
    for (let p = -L.half; p <= L.half; p++) {
      const q = end(p);
      g.fillStyle(L.slots.includes(p) ? 0xf4ebd5 : 0x342f29, L.slots.includes(p) ? 0.8 : 1);
      g.fillCircle(q.x, q.y, L.slots.includes(p) ? 6 : 3);
    }
    g.fillStyle(0xbca16a, 1);
    g.fillCircle(pivot.x, pivot.y, 9);
    // fixed loads: the clock weights (or bridge planks)
    for (const w of L.fixed) {
      const q = this.beamPoint(w.pos, 0);
      const s = 30 + w.mass * 6;
      g.lineStyle(3, 0x8f8a7a, 1);
      g.lineBetween(q.x, q.y, q.x, q.y + 40);
      g.fillStyle(0x9a6b1f, 1);
      g.fillEllipse(q.x, q.y + 40 + s / 2, s * 0.8, s * 1.4);
      g.fillStyle(0xf6d27a, 0.6);
      g.fillEllipse(q.x - s * 0.15, q.y + 40 + s * 0.4, s * 0.2, s * 0.6);
    }
    for (const w of this.weights) {
      if (w.slot === null) continue;
      const q = this.beamPoint(w.slot, -26 - w.mass * 3);
      if (w.obj.input?.dragState !== 2) w.obj.setPosition(q.x, q.y);
    }
    // Kip hangs on the end when pulling
    if (L.kip && this.state.pulled) {
      const q = this.beamPoint(L.kip.pos, 0);
      g.fillStyle(0xbca16a, 1);
      g.fillCircle(q.x, q.y + 30, 18);
    }
  }

  private drawPulley(g: Phaser.GameObjects.Graphics): void {
    const P = this.def.pulley!;
    const slots = this.pulleySlots();
    g.fillStyle(0x554638, 1);
    g.fillRect(slots[0].x - 80, 120, slots[slots.length - 1].x - slots[0].x + 160, 18);
    for (const s of slots) {
      g.lineStyle(3, 0xf4ebd5, 0.4);
      g.strokeCircle(s.x, s.y, 32);
    }
    const used = this.wheels.filter((w) => w.getData('slot') >= 0).map((w) => slots[w.getData('slot') as number]);
    const loadY = 470 - this.lift * 180;
    // rope: up and down through every wheel, then to Kip
    g.lineStyle(4, 0xc8b28a, 1);
    if (used.length) {
      used.sort((a, b) => a.x - b.x);
      g.lineBetween(used[0].x - 30, used[0].y, used[0].x - 30, loadY);
      for (let i = 0; i < used.length; i++) {
        g.lineBetween(used[i].x + 30, used[i].y, used[i].x + 30, loadY);
        if (i + 1 < used.length) g.lineBetween(used[i].x + 30, loadY, used[i + 1].x - 30, loadY);
      }
      const last = used[used.length - 1];
      g.lineBetween(last.x + 30, last.y, 960, 520);
    } else {
      g.lineBetween(640, 140, 640, loadY);
      g.lineBetween(640, 140, 960, 520);
    }
    // the load
    const art = P.art ?? 'weights';
    if (art === 'bridge') {
      g.fillStyle(0x856c50, 1);
      g.fillRect(420, loadY, 440, 26);
      for (let k = 0; k < 11; k++) {
        g.fillStyle(0x554638, 1);
        g.fillRect(424 + k * 40, loadY + 4, 32, 18);
      }
    } else {
      for (let k = 0; k < Math.min(6, Math.ceil(P.load / 2)); k++) {
        g.fillStyle(0x9a6b1f, 1);
        g.fillEllipse(520 + k * 48, loadY + 40, 40, 74);
      }
    }
    if (P.helper) {
      // Big Bertie helps pull
      g.fillStyle(0xad6b51, 1);
      g.fillRoundedRect(990, 380, 90, 110, 16);
      g.fillRoundedRect(1000, 320, 70, 60, 14);
      g.fillStyle(0xf2e6c8, 1);
      g.fillCircle(1020, 345, 9);
      g.fillCircle(1050, 345, 9);
    }
    if (this.style.numbers) {
      const eff = pulleyEffort(P.load, this.state.wheels);
      g.fillStyle(0, 0);
      void eff;
    }
  }

  protected hintTarget(): HintTarget | null {
    if (this.def.mode === 'lever') {
      const L = this.def.lever!;
      const want = this.def.solution.fulcrum;
      if (want !== undefined && want !== this.state.fulcrum && this.fulcrumKnob) return { from: { x: this.fulcrumKnob.x, y: this.fulcrumKnob.y }, to: { x: BX + want * STEP, y: BY + 60 } };
      for (const sw of this.def.solution.weights ?? []) {
        if (this.state.weights.some((w) => w.slot === sw.slot && w.mass === sw.mass)) continue;
        const v = this.weights.find((q) => q.mass === sw.mass && q.slot === null);
        return { from: v ? { x: v.obj.x, y: v.obj.y } : undefined, to: this.beamPoint(sw.slot, -40) };
      }
      void L;
    } else {
      const want = this.def.solution.wheels ?? 1;
      if (this.state.wheels < want) {
        const c = this.wheels.find((w) => w.getData('slot') < 0);
        const s = this.pulleySlots()[this.state.wheels];
        return { from: c ? { x: c.x, y: c.y } : undefined, to: s };
      }
    }
    return { to: { x: 1180, y: 600 } };
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    if (this.def.mode === 'lever') {
      const want = this.def.solution.fulcrum;
      if (want !== undefined && want !== this.state.fulcrum) {
        g.lineStyle(4, 0xf4ebd5, alpha + 0.2);
        g.strokeTriangle(BX + want * STEP - 42, BY + 110, BX + want * STEP + 42, BY + 110, BX + want * STEP, BY + 50);
      }
    } else {
      const want = this.def.solution.wheels ?? 1;
      this.pulleySlots()
        .slice(0, want)
        .forEach((s) => {
          if (this.wheels.some((w) => w.getData('slot') === Number(s.id))) return;
          g.lineStyle(4, 0xf4ebd5, alpha + 0.2);
          g.strokeCircle(s.x, s.y, 30);
        });
    }
  }

  protected specialDone(id: string): boolean {
    if (id === 'fewest') return this.state.wheels === (this.def.solution.wheels ?? 0);
    return false;
  }

  protected solutionSteps(): number {
    return 1 + (this.def.solution.fulcrum !== undefined ? 1 : 0) + (this.def.solution.weights?.length ?? 0) + (this.def.solution.wheels ?? 0);
  }
}
