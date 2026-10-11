/**
 * Levers & pulleys (GDD §8.2). Slide the fulcrum, hang weights, then pull:
 * the side that turns harder goes down. Pulley wheels share the load, so
 * Kip's tiny pull can lift a bridge. Wrong tries wobble and drop back.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { CM, drawPatina } from '../art/copperMoss';
import { MachineArt } from '../art/objects';
import { stepLeverMotion, pulleyEffort, type LeverMotion } from '../mechanism/balance';
import { balanceSolved, leverWeights } from '../rules';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { FONT, roundButton } from '../ui/widgets';

const STEP = 64;
const BX = 640;
const BY = 360;
// The beam hangs just below its bearing, giving an exactly balanced beam a
// stable, level resting position rather than inventing a levelling force.
const BEAM_DROP = STEP * 0.3;
const PULLEY_TOP = 170;
const PULLEY_RADIUS = 30;
const PULLEY_GUIDE_X = 1080;
const LIFT_DISTANCE = 70;

interface WeightView {
  mass: number;
  obj: Phaser.GameObjects.Container;
  home: { x: number; y: number };
  slot: number | null;
  pickedFrom: number | null;
}

export class BalanceRoom extends RoomBase<'balance'> {
  private g!: Phaser.GameObjects.Graphics;
  private fulcrumKnob?: Phaser.GameObjects.Container;
  private weights: WeightView[] = [];
  private wheels: Phaser.GameObjects.Container[] = [];
  private tilt = 0;
  private motion: LeverMotion = { angle: 0, velocity: 0 };
  private lift = 0;
  private liftTarget = 0;
  private trying = 0;
  private t = 0;
  private readout?: Phaser.GameObjects.Text;
  private fixedLabels: Phaser.GameObjects.Text[] = [];
  private distanceLabels: Phaser.GameObjects.Text[] = [];
  private runVersion = 0;
  private pullTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('room-balance');
  }

  protected build(): void {
    this.weights = [];
    this.wheels = [];
    this.fulcrumKnob = undefined;
    this.readout = undefined;
    this.tilt = 0;
    this.motion = { angle: 0, velocity: 0 };
    this.lift = 0;
    this.liftTarget = 0;
    this.trying = 0;
    this.t = 0;
    this.fixedLabels = [];
    this.distanceLabels = [];
    this.runVersion = 0;
    this.pullTimer = undefined;
    this.events.once('shutdown', () => this.cancelPull());
    this.liveCheck = false;
    this.g = this.add.graphics().setDepth(D.mech);
    if (this.def.mode === 'lever') this.buildLever();
    else this.buildPulley();
    if (this.style.numbers) this.readout = this.add.text(640, 526, '', { fontFamily: FONT, fontSize: '19px', color: '#f4ebd5', backgroundColor: '#342f29e8', padding: { x: 12, y: 5 }, align: 'center' }).setOrigin(.5).setDepth(D.parts + 2);
    const icon = this.def.mode === 'lever' && !this.def.lever?.kip ? '✋' : '💪';
    roundButton(this, 1180, 600, icon, () => this.pull(), { r: 48, fontSize: 40, color: 0xa0a477, say: 'Pull!' }).setDepth(D.hud);
  }

  // ───────────── lever ─────────────

  private buildLever(): void {
    const L = this.def.lever!;
    L.fixed.forEach((weight) => {
      this.fixedLabels.push(this.add.text(0, 0, this.style.numbers ? String(weight.mass) : '', {
        fontFamily: FONT, fontSize: '21px', color: '#342f29', fontStyle: 'bold',
      }).setOrigin(.5).setDepth(D.parts + 1).setName(`balance-fixed-mass:${weight.id}`));
    });
    if (this.style.numbers) for (let p = -L.half; p <= L.half; p++) {
      this.distanceLabels.push(this.add.text(0, 0, '', {
        fontFamily: FONT, fontSize: '17px', color: '#342f29',
        backgroundColor: '#f4ebd5e8', padding: { x: 4, y: 1 },
      }).setOrigin(.5).setDepth(D.parts).setName(`balance-distance:${p}`));
    }
    if ((L.fulcrumMin ?? L.fulcrum) !== (L.fulcrumMax ?? L.fulcrum)) {
      const k = this.add.container(BX + this.state.fulcrum * STEP, BY + 60).setDepth(D.parts + 1).setName('balance-fulcrum');
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
        this.cancelPull();
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
          this.act(() => { this.cancelPull(); this.state.fulcrum = was; });
        }
      });
      this.fulcrumKnob = k;
    }
    const spots = this.traySpots(L.tray.length);
    L.tray.forEach((mass, i) => {
      const c = this.add.container(spots[i].x, spots[i].y).setDepth(D.trayPart).setScale(0.8).setName(`balance-weight:${i}:${mass}`);
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
      const v: WeightView = { mass, obj: c, home: spots[i], slot: null, pickedFrom: null };
      this.weights.push(v);
      this.enableDrag({
        obj: c,
        restScale: 0.8,
        targets: () => L.slots.filter((sl) => !this.weights.some((w) => w !== v && w.slot === sl)).map((sl) => ({ id: String(sl), ...this.weightPoint(sl, mass) })),
        pick: () => {
          this.cancelPull();
          v.pickedFrom = v.slot;
          v.slot = null;
          this.syncWeights();
        },
        drop: (t) => this.dropWeight(v, t),
      });
    });
  }

  private beamPoint(pos: number, down = BEAM_DROP): { x: number; y: number } {
    const f = this.state.fulcrum;
    const a = this.tilt;
    const dx = (pos - f) * STEP;
    return { x: BX + f * STEP + Math.cos(a) * dx - Math.sin(a) * down, y: BY + Math.sin(a) * dx + Math.cos(a) * down };
  }

  private weightPoint(pos: number, mass: number): { x: number; y: number } {
    const point = this.beamPoint(pos);
    return { x: point.x, y: point.y + 28 + (20 + mass * 6) / 2 };
  }

  private syncWeights(): void {
    this.state.weights = this.weights.filter((w) => w.slot !== null).map((w) => ({ slot: w.slot!, mass: w.mass }));
  }

  private dropWeight(v: WeightView, t: SnapTarget | null): void {
    const was = v.pickedFrom;
    v.slot = t ? Number(t.id) : null;
    if (t) v.obj.setScale(1).setDepth(D.parts);
    else this.floatHome(v.obj, v.home, 0.8);
    this.syncWeights();
    if (t) this.clunkAt(t.x, t.y);
    if (v.slot === was) return;
    this.act(() => {
      this.cancelPull();
      v.slot = was;
      this.syncWeights();
    });
  }

  // ───────────── pulley ─────────────

  private buildPulley(): void {
    const P = this.def.pulley!;
    if (P.helper) new MachineArt(this, 1010, 490, 'bertie', .42)
      .setWorking(true).setDepth(D.parts).setName('balance-helper:bertie');
    const spots = this.traySpots(P.wheels);
    for (let i = 0; i < P.wheels; i++) {
      const c = this.add.container(spots[i].x, spots[i].y).setDepth(D.trayPart).setScale(0.8).setName(`balance-wheel:${i}`);
      const wg = this.add.graphics();
      // The visible rim stays inside the radius-30 rope groove.
      wg.fillStyle(CM.brass, 1);
      wg.fillCircle(0, 0, 27);
      wg.lineStyle(2, CM.ink, .9);
      wg.strokeCircle(0, 0, 27);
      wg.fillStyle(CM.tealDark, 1);
      wg.fillCircle(0, 0, 22);
      wg.lineStyle(3, CM.copperLight, 1);
      for (let spoke = 0; spoke < 6; spoke++) {
        const angle = spoke * Math.PI / 3;
        wg.lineBetween(Math.cos(angle) * 8, Math.sin(angle) * 8, Math.cos(angle) * 21, Math.sin(angle) * 21);
      }
      wg.lineStyle(1, CM.cream, .75);
      wg.beginPath(); wg.arc(-.5, -.5, 24.5, Math.PI * 1.1, Math.PI * 1.8); wg.strokePath();
      wg.fillStyle(CM.brass, 1);
      wg.fillCircle(0, 0, 8);
      wg.lineStyle(1.5, CM.ink, .8);
      wg.strokeCircle(0, 0, 8);
      wg.fillStyle(CM.cream, .8);
      wg.fillCircle(-2, -2, 2);
      c.add(wg);
      c.setSize(70, 70);
      c.setData('slot', -1);
      c.setData('home', spots[i]);
      this.wheels.push(c);
      let pickedFrom = -1;
      this.enableDrag({
        obj: c,
        restScale: 0.8,
        targets: () => this.pulleySlots().filter((s) => !this.wheels.some((w) => w !== c && w.getData('slot') === Number(s.id))),
        pick: () => {
          this.cancelPull();
          pickedFrom = c.getData('slot') as number;
          c.setData('slot', -1);
          this.syncWheels();
        },
        drop: (t) => {
          c.setData('slot', t ? Number(t.id) : -1);
          if (t) c.setScale(1).setDepth(D.parts);
          else this.floatHome(c, spots[i], 0.8);
          this.syncWheels();
          if (t) this.clunkAt(t.x, t.y);
          if (c.getData('slot') === pickedFrom) return;
          const was = pickedFrom;
          this.act(() => {
            this.cancelPull();
            c.setData('slot', was);
            this.syncWheels();
          });
        },
      });
    }
  }

  private pulleySlots(): SnapTarget[] {
    const used = this.installedWheels();
    const next = this.wheels.find((wheel) => !used.some(on => on.getData('slot') === this.wheels.indexOf(wheel)));
    if (used.length >= this.def.pulley!.slots || !next) return [];
    return [{ id: String(this.wheels.indexOf(next)), x: 500 + used.length * 60, y: PULLEY_TOP }];
  }

  private installedWheels(): Phaser.GameObjects.Container[] {
    return this.wheels.filter(w => w.getData('slot') >= 0).sort((a, b) => a.getData('slot') - b.getData('slot'));
  }

  private syncWheels(): void {
    this.state.wheels = this.installedWheels().length;
  }

  private cancelPull(): void {
    this.runVersion++;
    this.pullTimer?.remove(false);
    this.pullTimer = undefined;
    this.state.pulled = false;
    this.trying = 0;
    this.liftTarget = 0;
  }

  // ───────────── pulling ─────────────

  private pull(): void {
    if (this.fixed || this.trying > 0) return;
    this.state.pulled = true;
    this.moves++;
    this.idle = 0;
    this.kip.walkTo(this.def.mode === 'lever' && this.def.lever?.kip ? BX + this.def.lever.kip.pos * STEP : 930);
    const ok = balanceSolved(this.def, this.state);
    if (this.def.mode === 'lever') {
      if (this.def.lever!.kip) this.tweens.killTweensOf(this.kip);
      sfx.ratchet(4);
    } else {
      // An insufficient pull cannot lift a load against gravity.
      this.liftTarget = ok ? 1 : 0;
      sfx.whoosh();
    }
    this.trying = 1.6;
    const version = ++this.runVersion;
    this.pullTimer = this.time.delayedCall(1300, () => this.finishPull(version));
  }

  private finishPull(version: number): void {
    if (version !== this.runVersion || !this.state.pulled) return;
    // Edits and Undo invalidate a trial. A success must describe the current
    // board and a balanced beam must actually settle level before celebrating.
    if (balanceSolved(this.def, this.state)) {
      if (this.def.mode === 'lever' && this.def.lever!.goal.kind === 'balance' &&
          (Math.abs(this.tilt) > .012 || Math.abs(this.motion.velocity) > .04)) {
        this.pullTimer = this.time.delayedCall(120, () => this.finishPull(version));
      } else this.onFixed();
    } else {
      sfx.boing();
      this.kip.giggle();
      this.cancelPull();
    }
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
      for (const w of this.weights) {
        if (w.slot === null) w.obj.setPosition(w.home.x, w.home.y).setScale(0.8).setDepth(D.trayPart);
        else { const point = this.weightPoint(w.slot, w.mass); w.obj.setPosition(point.x, point.y).setScale(1).setDepth(D.parts); }
      }
    } else {
      this.wheels.forEach((c, i) => {
        const on = i < this.state.wheels;
        c.setData('slot', on ? i : -1);
        if (on) c.setScale(1).setDepth(D.parts);
        else c.setPosition((c.getData('home') as { x: number; y: number }).x, (c.getData('home') as { x: number; y: number }).y).setScale(0.8);
      });
    }
  }

  protected tick(dt: number): void {
    this.t += dt;
    this.trying = Math.max(0, this.trying - dt);
    if (this.def.mode === 'lever') {
      const lever = this.def.lever!;
      // The workbench limits travel before a far-away hanging load can pass
      // through it. The same stop constrains both the drawing and dynamics.
      const maxArm = (lever.half + Math.abs(this.state.fulcrum)) * STEP;
      const longestLoad = Math.max(60,
        ...lever.fixed.map(w => 28 + (22 + w.mass * 4) * 1.2),
        ...this.state.weights.map(w => 28 + 20 + w.mass * 6),
        ...(this.state.pulled && lever.kip ? [95] : []));
      const maxAngle = Math.min(.22, Math.asin(Math.min(1, (536 - BY - BEAM_DROP - longestLoad) / Math.max(1, maxArm))));
      this.motion = stepLeverMotion(leverWeights(this.def, this.state), this.state.fulcrum, this.motion, dt, { maxAngle });
      this.tilt = this.motion.angle;
    }
    this.lift += (this.liftTarget - this.lift) * Math.min(1, dt * 3);
    const g = this.g;
    g.clear();
    if (this.def.mode === 'lever') this.drawLever(g);
    else this.drawPulley(g);
    if (this.readout) {
      if (this.def.mode === 'lever') {
        const values = leverWeights(this.def, this.state);
        const torque = (side: -1 | 1) => values.filter(weight => Math.sign(weight.pos - this.state.fulcrum) === side).map(weight => `${weight.mass} × ${Math.abs(weight.pos - this.state.fulcrum)}`);
        const sum = (side: -1 | 1) => values.filter(weight => Math.sign(weight.pos - this.state.fulcrum) === side).reduce((total, weight) => total + weight.mass * Math.abs(weight.pos - this.state.fulcrum), 0);
        this.readout.setText(`${torque(-1).join(' + ') || '0'} = ${sum(-1)}    ⚖    ${torque(1).join(' + ') || '0'} = ${sum(1)}`);
      } else {
        const pulley = this.def.pulley!;
        this.readout.setText(this.state.wheels ? `load ${pulley.load} ÷ ${this.state.wheels} supporting strands = effort ${Number(pulleyEffort(pulley.load, this.state.wheels).toFixed(2))}    pull ${pulley.strength + (pulley.helper ?? 0)}` : 'Fit a pulley wheel to connect the lifting rope');
      }
    }
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
    g.fillRect(BX - (L.half + 1) * STEP, 536, (L.half + 1) * 2 * STEP, 12);
    g.fillRect(pivot.x - 42, BY + 110, 12, 536 - BY - 110);
    g.fillRect(pivot.x + 30, BY + 110, 12, 536 - BY - 110);
    // the beam
    const end = (pos: number) => this.beamPoint(pos);
    const a = end(-L.half - 0.5);
    const b = end(L.half + 0.5);
    g.lineStyle(26, 0x5a3a22, 1);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(18, 0x856c50, 1);
    g.lineBetween(a.x, a.y, b.x, b.y);
    const neck = end(f);
    g.lineStyle(8, 0xbca16a, 1);
    g.lineBetween(pivot.x, pivot.y, neck.x, neck.y);
    for (let p = -L.half; p <= L.half; p++) {
      const q = end(p);
      g.fillStyle(L.slots.includes(p) ? 0xf4ebd5 : 0x342f29, L.slots.includes(p) ? 0.8 : 1);
      g.fillCircle(q.x, q.y, L.slots.includes(p) ? 6 : 3);
      const label = this.distanceLabels[p + L.half];
      if (label) label.setText(p === f ? '' : String(Math.abs(p - f))).setPosition(q.x, q.y - 28);
    }
    g.fillStyle(0xbca16a, 1);
    g.fillCircle(pivot.x, pivot.y, 9);
    // fixed loads: the clock weights (or bridge planks)
    for (const [i, w] of L.fixed.entries()) {
      const q = this.beamPoint(w.pos);
      const s = 22 + w.mass * 4;
      const y = q.y + 28 + s * .6;
      g.lineStyle(3, 0x8f8a7a, 1);
      g.lineBetween(q.x, q.y, q.x, q.y + 28);
      g.fillStyle(0x9a6b1f, 1);
      g.fillEllipse(q.x, y, s, s * 1.2);
      g.fillStyle(0xf6d27a, 0.6);
      g.fillEllipse(q.x - s * .22, y - s * .14, s * .18, s * .65);
      this.fixedLabels[i]?.setPosition(q.x, y);
      if (!this.style.numbers) for (let dot = 0; dot < w.mass; dot++) {
        g.fillStyle(0x342f29, 1);
        g.fillCircle(q.x + (dot % 3 - 1) * 8, y + (Math.floor(dot / 3) - (Math.ceil(w.mass / 3) - 1) / 2) * 8, 2.5);
      }
    }
    for (const w of this.weights) {
      if (w.slot === null) continue;
      const hook = this.beamPoint(w.slot);
      const q = this.weightPoint(w.slot, w.mass);
      g.lineStyle(3, 0x8f8a7a, 1);
      g.lineBetween(hook.x, hook.y, q.x, q.y - (20 + w.mass * 6) / 2);
      if (w.obj.input?.dragState !== 2 || w.obj.getData('snapped')) w.obj.setPosition(q.x, q.y);
    }
    // Kip hangs on the end when pulling
    if (L.kip && this.state.pulled) {
      const q = this.beamPoint(L.kip.pos);
      this.kip.setPosition(q.x, q.y + 95).setScale(1);
      g.lineStyle(3, 0xc8b28a, 1);
      g.lineBetween(q.x, q.y, q.x, q.y + 14);
    } else if (L.kip && this.kip.y !== this.kip.groundY) {
      this.kip.setY(this.kip.groundY).setScale(1.25);
    }
    g.setData('balance-geometry', {
      kind: 'lever', pivot, beamLeft: a, beamRight: b,
      slotPoints: L.slots.map(slot => ({ slot, ...this.beamPoint(slot) })),
      attachments: [
        ...L.fixed.map(weight => { const beam = this.beamPoint(weight.pos); return { slot: weight.pos, mass: weight.mass, beam, weightTop: { x: beam.x, y: beam.y + 28 } }; }),
        ...this.weights.filter(weight => weight.slot !== null).map(weight => { const beam = this.beamPoint(weight.slot!); return { slot: weight.slot, mass: weight.mass, beam, weightTop: { x: weight.obj.x, y: weight.obj.y - (20 + weight.mass * 6) / 2 } }; }),
      ],
    });
  }

  private drawPulley(g: Phaser.GameObjects.Graphics): void {
    const P = this.def.pulley!;
    const used = this.installedWheels();
    const loadY = 430 - this.lift * LIFT_DISTANCE;
    const lowerY = loadY - 55;
    g.fillStyle(0x554638, 1);
    g.fillRect(410, 120, PULLEY_GUIDE_X + 20 - 410, 18);
    // One empty mount guides insertion; fitted wheels assemble into the two
    // blocks. Ceiling wheels redirect, load-mounted wheels supply two strands.
    for (const s of this.pulleySlots()) {
      g.lineStyle(3, 0xf4ebd5, .6 + Math.sin(this.t * 3) * .15);
      g.strokeCircle(s.x, s.y, 32);
    }
    const points = used.map((wheel, i) => {
      const upper = (i + used.length) % 2 === 1;
      const point = { x: 500 + i * 60, y: upper ? PULLEY_TOP : lowerY, upper };
      wheel.setPosition(point.x, point.y);
      g.lineStyle(5, 0x60736d, 1);
      g.lineBetween(point.x, upper ? 138 : point.y, point.x, upper ? point.y : loadY - 12);
      return point;
    });
    // A single continuous rope, anchored on the moving block for odd strand
    // counts and on the ceiling for even counts, wraps every fitted wheel.
    g.lineStyle(4, 0xc8b28a, 1);
    if (points.length) {
      const first = points[0];
      const anchorY = points.length % 2 ? loadY - 12 : 138;
      g.lineBetween(first.x - PULLEY_RADIUS, anchorY, first.x - PULLEY_RADIUS, first.y);
      g.fillStyle(0xbca16a, 1);
      g.fillCircle(first.x - PULLEY_RADIUS, anchorY, 6);
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        g.beginPath();
        g.arc(p.x, p.y, PULLEY_RADIUS, Math.PI, p.upper ? Math.PI * 2 : 0, !p.upper);
        g.strokePath();
        if (i + 1 < points.length) g.lineBetween(p.x + PULLEY_RADIUS, p.y, points[i + 1].x - PULLEY_RADIUS, points[i + 1].y);
      }
      const last = points[points.length - 1];
      g.lineBetween(last.x + PULLEY_RADIUS, last.y, PULLEY_GUIDE_X - 16, PULLEY_TOP);
    } else {
      // The rig has no load connection until its first wheel is fitted.
      g.lineBetween(780, PULLEY_TOP, PULLEY_GUIDE_X - 16, PULLEY_TOP);
    }
    // Built-in fixed guide changes only pull direction, not the advantage.
    // Keep the free grip beside the drawer throughout its full travel.
    g.lineStyle(5, 0x60736d, 1);
    g.lineBetween(PULLEY_GUIDE_X, 138, PULLEY_GUIDE_X, PULLEY_TOP);
    g.fillStyle(CM.brass, 1);
    g.fillCircle(PULLEY_GUIDE_X, PULLEY_TOP, 13.5);
    g.lineStyle(1.5, CM.ink, 1);
    g.strokeCircle(PULLEY_GUIDE_X, PULLEY_TOP, 13.5);
    g.fillStyle(CM.tealDark, 1);
    g.fillCircle(PULLEY_GUIDE_X, PULLEY_TOP, 7);
    g.fillStyle(CM.cream, 1);
    g.fillCircle(PULLEY_GUIDE_X - 2, PULLEY_TOP - 2, 2);
    g.lineStyle(3, 0xc8b28a, 1);
    g.beginPath(); g.arc(PULLEY_GUIDE_X, PULLEY_TOP, 16, Math.PI, Math.PI * 2); g.strokePath();
    const freeY = 560 - Math.max(1, used.length) * LIFT_DISTANCE * (1 - this.lift);
    g.lineBetween(PULLEY_GUIDE_X + 16, PULLEY_TOP, PULLEY_GUIDE_X + 16, freeY);
    g.fillStyle(0xbca16a, 1);
    g.fillRoundedRect(PULLEY_GUIDE_X, freeY - 7, 32, 14, 5);
    g.lineStyle(3, 0x60736d, 1);
    g.lineBetween(470, loadY - 12, 800, loadY - 12);
    // the load
    const art = P.art ?? 'weights';
    if (art === 'bridge') {
      g.lineStyle(5, 0x60736d, 1);
      g.lineBetween(480, loadY - 12, 480, loadY);
      g.lineBetween(800, loadY - 12, 800, loadY);
      g.fillStyle(0x856c50, 1);
      g.fillRect(420, loadY, 440, 26);
      for (let k = 0; k < 11; k++) {
        g.fillStyle(0x554638, 1);
        g.fillRect(424 + k * 40, loadY + 4, 32, 18);
      }
    } else {
      for (let k = 0; k < Math.min(6, Math.ceil(P.load / 2)); k++) {
        g.lineStyle(3, 0x8f8a7a, 1);
        g.lineBetween(520 + k * 48, loadY - 12, 520 + k * 48, loadY + 3);
        g.fillStyle(0x9a6b1f, 1);
        g.fillEllipse(520 + k * 48, loadY + 40, 40, 74);
      }
    }
    g.setData('balance-geometry', {
      kind: 'pulley', supportingStrands: used.length, loadY, restLoadY: 430,
      freeEndX: PULLEY_GUIDE_X + 16,
      freeEndY: freeY, restFreeEndY: 560 - Math.max(1, used.length) * LIFT_DISTANCE,
      wheels: points.map((point, i) => ({ id: used[i].getData('slot'), moving: !point.upper, x: point.x, y: point.y })),
      loadTravel: this.lift * LIFT_DISTANCE,
      freeRopeTravel: this.lift * LIFT_DISTANCE * used.length,
    });
  }

  protected hintTarget(): HintTarget | null {
    if (this.def.mode === 'lever') {
      const L = this.def.lever!;
      const want = this.def.solution.fulcrum;
      if (want !== undefined && want !== this.state.fulcrum && this.fulcrumKnob) return { from: { x: this.fulcrumKnob.x, y: this.fulcrumKnob.y }, to: { x: BX + want * STEP, y: BY + 60 } };
      for (const sw of this.def.solution.weights ?? []) {
        if (this.state.weights.some((w) => w.slot === sw.slot && w.mass === sw.mass)) continue;
        const wrong = this.weights.find(q => q.slot === sw.slot && q.mass !== sw.mass);
        if (wrong) return { from: { x: wrong.obj.x, y: wrong.obj.y }, to: wrong.home };
        const v = this.weights.find((q) => q.mass === sw.mass);
        return { from: v ? { x: v.obj.x, y: v.obj.y } : undefined, to: this.weightPoint(sw.slot, sw.mass) };
      }
      void L;
    } else {
      const want = this.def.solution.wheels ?? 1;
      if (this.state.wheels < want) {
        const c = this.wheels.find((w) => w.getData('slot') < 0);
        const s = this.pulleySlots().find((slot) => !this.wheels.some((wheel) => wheel.getData('slot') === Number(slot.id)));
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
        g.strokeTriangle(BX + want * STEP - 42, BY + 110, BX + want * STEP + 42, BY + 110, BX + want * STEP, BY + 2);
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
