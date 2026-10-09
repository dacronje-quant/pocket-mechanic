/**
 * Logic rooms (GDD §8.9, Appendix C): gates are physical things — the "Both"
 * door with two keyholes, the "Either" Y-chute, the "Flip" seesaw and the
 * "Remember" ratchet. Marbles roll along the chutes when a signal is ON.
 * Symbols appear only as small labels in Engineer mode.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { allCases, evalExpr, evaluate, type GateType } from '../mechanism/logic';
import type { LogicRoomNode } from '../content/types';
import { logicSolved } from '../rules';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { FONT, roundButton } from '../ui/widgets';

const GATE_COLORS: Record<GateType, number> = { AND: 0xd64541, OR: 0x3b7dd8, NOT: 0x2e9b5f, LATCH: 0x8e5cc4 };
const GATE_WORDS: Record<GateType, string> = { AND: 'BOTH', OR: 'EITHER', NOT: 'FLIP', LATCH: 'REMEMBER' };

interface GatePart {
  gate: GateType;
  obj: Phaser.GameObjects.Container;
  home: { x: number; y: number };
  node: string | null;
}

export class LogicRoom extends RoomBase<'logic'> {
  private wiresG!: Phaser.GameObjects.Graphics;
  private nodesG!: Phaser.GameObjects.Graphics;
  private marblesG!: Phaser.GameObjects.Graphics;
  private parts: GatePart[] = [];
  private values: Record<string, boolean> = {};
  private latches: Record<string, boolean> = {};
  private t = 0;
  private testing = false;
  private testCase = -1;
  private testCases: Array<{ set: Record<string, boolean>; expect: boolean }> = [];
  private testT = 0;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('room-logic');
  }

  protected build(): void {
    this.parts = [];
    this.latches = {};
    this.values = {};
    this.testCases = [];
    this.testing = false;
    this.labels = [];
    this.liveCheck = this.def.goal.kind === 'reach';
    this.wiresG = this.add.graphics().setDepth(D.mech);
    this.marblesG = this.add.graphics().setDepth(D.mech + 1);
    this.nodesG = this.add.graphics().setDepth(D.mech + 2);
    for (const n of this.def.nodes) {
      if (n.kind !== 'input') continue;
      const z = this.add.zone(n.x, n.y, 110, 110).setInteractive({ useHandCursor: true }).setDepth(D.mech + 4);
      z.on('pointerdown', () => this.pressInput(n, true));
      z.on('pointerup', () => this.pressInput(n, false));
      z.on('pointerout', () => n.momentary && this.state.inputs[n.id] && this.pressInput(n, false));
    }
    const spots = this.traySpots(this.def.tray.length);
    this.def.tray.forEach((gate, i) => {
      const obj = this.add.container(spots[i].x, spots[i].y).setDepth(D.trayPart).setScale(0.75);
      const g = this.add.graphics();
      this.drawGate(g, gate, 0, 0, false, 0);
      obj.add(g);
      if (this.style.numbers) obj.add(this.add.text(0, 44, gate, { fontFamily: FONT, fontSize: '15px', color: '#fff3d0', fontStyle: 'bold', stroke: '#2b1d14', strokeThickness: 4 }).setOrigin(0.5));
      obj.setSize(110, 110);
      const part: GatePart = { gate, obj, home: spots[i], node: null };
      this.parts.push(part);
      this.enableDrag({
        obj,
        restScale: 0.75,
        targets: () => this.slotTargets(),
        accepts: (t) => this.style.id !== 'tinker' || this.def.solution.gates?.[t.id] === gate,
        pick: () => this.liftGate(part),
        drop: (t) => this.dropGate(part, t),
      });
    });
    // the rule, for readers (Fixer/Engineer)
    if (this.style.id !== 'tinker' && this.def.goal.kind === 'truth') {
      this.add
        .text(640, 520, `Rule: ${friendly(this.def.goal.expr, this.def.nodes)}`, { fontFamily: FONT, fontSize: '20px', color: '#fff3d0', backgroundColor: '#2b1d14dd', padding: { x: 14, y: 6 } })
        .setOrigin(0.5)
        .setDepth(D.hud - 2);
    }
    if (this.def.goal.kind !== 'reach') {
      roundButton(this, 1180, 600, '▶', () => this.startTest(), { r: 48, fontSize: 44, color: 0x8ce99a, say: 'Test it!' }).setDepth(D.hud);
    }
    for (const n of this.def.nodes) {
      if (n.label && this.style.id !== 'tinker') {
        this.labels.push(
          this.add
            .text(n.x, n.y + 62, n.label, { fontFamily: FONT, fontSize: '16px', color: '#fff3d0', fontStyle: 'bold', stroke: '#2b1d14', strokeThickness: 4 })
            .setOrigin(0.5)
            .setDepth(D.mech + 3),
        );
      }
    }
  }

  private node(id: string): LogicRoomNode {
    return this.def.nodes.find((n) => n.id === id)!;
  }

  private slotTargets(): SnapTarget[] {
    return this.def.nodes.filter((n) => n.slot).map((n) => ({ id: n.id, x: n.x, y: n.y }));
  }

  private pressInput(n: LogicRoomNode, down: boolean): void {
    if (this.testing) return;
    const inputs = this.state.inputs;
    if (n.momentary) {
      if (inputs[n.id] === down) return;
      inputs[n.id] = down;
      if (down) {
        if (n.art === 'bell') sfx.ding(1320);
        else sfx.click();
      }
      this.evaluateNow();
      if (down) this.act();
      return;
    }
    if (!down) return;
    inputs[n.id] = !inputs[n.id];
    if (n.art === 'lever') sfx.ratchet(2);
    else if (n.art === 'plate') sfx.clunk();
    else sfx.toggle(inputs[n.id]);
    if (inputs[n.id]) sfx.marble();
    this.evaluateNow();
    this.act(() => {
      inputs[n.id] = !inputs[n.id];
    });
  }

  private liftGate(p: GatePart): void {
    if (!p.node) return;
    const was = p.node;
    p.node = null;
    this.state.gates[was] = undefined;
    this.evaluateNow();
    this.undoStack.push(() => {
      p.node = was;
      this.state.gates[was] = p.gate;
    });
  }

  private dropGate(p: GatePart, t: SnapTarget | null): void {
    if (!t) return this.floatHome(p.obj, p.home, 0.75);
    if (this.style.id === 'tinker' && this.def.solution.gates?.[t.id] !== p.gate) return this.refuse(p.obj, t, p.home, 0.75);
    const prev = this.parts.find((q) => q !== p && q.node === t.id);
    if (prev) {
      prev.node = null;
      this.floatHome(prev.obj, prev.home, 0.75);
    }
    p.node = t.id;
    this.state.gates[t.id] = p.gate;
    this.tweens.killTweensOf(p.obj);
    this.tweens.add({ targets: p.obj, x: t.x, y: t.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    p.obj.setDepth(D.mech + 3);
    this.clunkAt(t.x, t.y);
    this.evaluateNow();
    this.act(() => {
      p.node = null;
      this.state.gates[t.id] = prev?.gate;
      if (prev) prev.node = t.id;
    });
    const allFilled = this.def.nodes.filter((n) => n.slot).every((n) => this.state.gates[n.id]);
    if (allFilled && this.def.goal.kind !== 'reach') this.time.delayedCall(500, () => this.startTest());
  }

  protected refresh(): void {
    for (const p of this.parts) p.node = null;
    for (const n of this.def.nodes) {
      const g = this.state.gates[n.id];
      if (!n.slot || !g) continue;
      const p = this.parts.find((q) => q.node === null && q.gate === g);
      if (p) p.node = n.id;
    }
    for (const p of this.parts) {
      this.tweens.killTweensOf(p.obj);
      if (p.node) {
        const n = this.node(p.node);
        p.obj.setPosition(n.x, n.y).setScale(1).setDepth(D.mech + 3);
      } else p.obj.setPosition(p.home.x, p.home.y).setScale(0.75).setDepth(D.trayPart);
    }
    this.evaluateNow();
  }

  private evaluateNow(): void {
    const before = this.values[outputId(this.def)];
    this.values = evaluate(this.def.nodes, this.testing ? this.testCases[this.testCase]?.set ?? {} : this.state.inputs, this.state.gates, this.latches);
    const now = this.values[outputId(this.def)];
    if (now && !before) {
      const art = this.node(outputId(this.def)).art;
      if (art === 'bell') sfx.ding(880);
      else if (art === 'bertie') sfx.beeps('Ber-tie!', 'voice-retro', 0.7);
      else if (art === 'door') sfx.ratchet(4);
      else sfx.sparkle();
    }
  }

  // ───────────── the test run: every case, marbles and all ─────────────

  private startTest(): void {
    if (this.testing || this.fixed) return;
    if (this.def.nodes.filter((n) => n.slot).some((n) => !this.state.gates[n.id])) {
      sfx.nuhUh();
      this.kip.shrug();
      return;
    }
    const goal = this.def.goal;
    if (goal.kind === 'truth') {
      const ins = this.def.nodes.filter((n) => n.kind === 'input').map((n) => n.id);
      this.testCases = allCases(ins).map((set) => ({ set, expect: evalExpr(goal.expr, set) }));
    } else if (goal.kind === 'sequence') {
      this.testCases = goal.steps.map((s) => ({ set: s.set, expect: s.expect }));
    } else return;
    this.latches = {};
    this.testing = true;
    this.testCase = 0;
    this.testT = 0;
    this.moves++;
    this.evaluateNow();
  }

  private stepTest(dt: number): void {
    if (!this.testing) return;
    this.testT += dt;
    if (this.testT < 0.9) return;
    const c = this.testCases[this.testCase];
    const got = this.values[outputId(this.def)];
    if (got !== c.expect) {
      // a funny-wrong moment: the output does the wrong thing, then everything resets
      this.testing = false;
      sfx.boing();
      this.kip.shrug();
      this.cameras.main.shake(120, 0.003);
      this.latches = {};
      this.evaluateNow();
      return;
    }
    sfx.tick(1.2);
    this.testCase++;
    this.testT = 0;
    if (this.testCase >= this.testCases.length) {
      this.testing = false;
      this.latches = {};
      this.evaluateNow();
      if (logicSolved(this.def, this.state)) this.onFixed();
      return;
    }
    this.evaluateNow();
  }

  protected afterSolutionApplied(): void {
    if (this.def.goal.kind === 'reach') this.checkSolved();
    else this.startTest();
  }

  // ───────────── drawing ─────────────

  private drawGate(g: Phaser.GameObjects.Graphics, gate: GateType, x: number, y: number, on: boolean, t: number): void {
    const col = GATE_COLORS[gate];
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x - 46, y - 40, 96, 90, 14);
    g.fillStyle(0x3d2b25, 1);
    g.fillRoundedRect(x - 48, y - 44, 96, 88, 14);
    switch (gate) {
      case 'AND': {
        // the "Both" door: two keyholes, opens when both get a marble
        g.fillStyle(col, 1);
        const open = on ? 30 : 0;
        g.fillRoundedRect(x - 36 - open * 0.3, y - 34, 36, 68, 6);
        g.fillRoundedRect(x + open * 0.3, y - 34, 36, 68, 6);
        g.fillStyle(0x111111, 1);
        g.fillCircle(x - 18 - open * 0.3, y - 6, 6);
        g.fillRect(x - 20 - open * 0.3, y - 6, 4, 14);
        g.fillCircle(x + 18 + open * 0.3, y - 6, 6);
        g.fillRect(x + 16 + open * 0.3, y - 6, 4, 14);
        break;
      }
      case 'OR':
        g.lineStyle(14, col, 1);
        g.lineBetween(x - 34, y - 30, x, y + 4);
        g.lineBetween(x + 34, y - 30, x, y + 4);
        g.lineBetween(x, y + 4, x, y + 38);
        if (on) {
          g.fillStyle(0xffd43b, 1);
          g.fillCircle(x, y + 10 + ((t * 60) % 26), 7);
        }
        break;
      case 'NOT': {
        const tilt = on ? -0.4 : 0.4;
        g.fillStyle(0x5e3f10, 1);
        g.fillTriangle(x - 10, y + 30, x + 10, y + 30, x, y + 10);
        g.lineStyle(10, col, 1);
        g.lineBetween(x - 38 * Math.cos(tilt), y + 10 - 38 * Math.sin(tilt), x + 38 * Math.cos(tilt), y + 10 + 38 * Math.sin(tilt));
        break;
      }
      case 'LATCH': {
        g.fillStyle(col, 1);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + (on ? 0.3 : 0);
          g.fillCircle(x + Math.cos(a) * 26, y + Math.sin(a) * 26, 7);
        }
        g.fillCircle(x, y, 24);
        g.fillStyle(0x2b1d14, 1);
        g.fillTriangle(x + 18, y - 40, x + 34, y - 40, x + 24, y - 22);
        g.fillStyle(on ? 0xffd43b : 0x5a3a6a, 1);
        g.fillCircle(x, y, 9);
        break;
      }
    }
  }

  private drawNode(g: Phaser.GameObjects.Graphics, n: LogicRoomNode): void {
    const on = !!this.values[n.id];
    const { x, y } = n;
    if (n.kind === 'input') {
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(x + 3, y + 6, 48);
      g.fillStyle(0x5a3a22, 1);
      g.fillCircle(x, y, 48);
      switch (n.art) {
        case 'lever':
          g.fillStyle(0x333333, 1);
          g.fillRoundedRect(x - 26, y + 6, 52, 18, 6);
          g.lineStyle(9, 0xc0c8d0, 1);
          g.lineBetween(x, y + 12, x + (on ? 24 : -24), y - 26);
          g.fillStyle(on ? 0x8ce99a : 0xff6b6b, 1);
          g.fillCircle(x + (on ? 24 : -24), y - 26, 11);
          break;
        case 'plate':
          g.fillStyle(on ? 0x8ce99a : 0x9aa6b4, 1);
          g.fillRoundedRect(x - 32, y + (on ? 4 : -6), 64, 18, 6);
          if (on) {
            g.fillStyle(0xffd43b, 1);
            g.fillCircle(x, y - 10, 12);
          }
          break;
        case 'button':
          g.fillStyle(0x555555, 1);
          g.fillRoundedRect(x - 30, y + 8, 60, 16, 6);
          g.fillStyle(n.label === 'red' ? 0xe74c3c : on ? 0x8ce99a : 0xf1c40f, 1);
          g.fillEllipse(x, y + (on ? 8 : 2), 44, on ? 14 : 24);
          break;
        case 'eye':
          g.fillStyle(on ? 0xfff3b0 : 0x2b4b2b, 1);
          g.fillCircle(x, y, 26);
          g.fillStyle(on ? 0x51cf66 : 0x0b2b0b, 1);
          g.fillCircle(x, y, 10);
          break;
        case 'bell':
          g.fillStyle(0xd9a441, 1);
          g.fillTriangle(x - 26, y + 18, x + 26, y + 18, x, y - 26);
          g.fillCircle(x, y - 10, 16);
          if (on) {
            g.lineStyle(3, 0xffd43b, 1);
            g.strokeCircle(x, y - 6, 34);
          }
          break;
        case 'radio':
          g.fillStyle(0x6e4527, 1);
          g.fillRoundedRect(x - 30, y - 22, 60, 44, 10);
          g.fillStyle(on ? 0xffb347 : 0xf6ead0, 1);
          g.fillCircle(x - 10, y, 10);
          break;
        default:
          g.fillStyle(on ? 0x8ce99a : 0xff6b6b, 1);
          g.fillCircle(x, y, 20);
      }
      return;
    }
    if (n.kind === 'gate') {
      if (n.slot) {
        const filled = this.state.gates[n.id];
        if (!filled) {
          g.lineStyle(4, 0xfff4c8, 0.6);
          g.strokeRoundedRect(x - 48, y - 44, 96, 88, 14);
        }
        return;
      }
      this.drawGate(g, n.gate!, x, y, on, this.t);
      return;
    }
    // outputs
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x - 54, y - 60, 112, 124, 16);
    switch (n.art) {
      case 'door': {
        g.fillStyle(0x3d2b25, 1);
        g.fillRoundedRect(x - 56, y - 64, 112, 124, 14);
        const open = on ? 44 : 0;
        g.fillStyle(0xd64541, 1);
        g.fillRect(x - 46, y - 54, 46 - open, 108);
        g.fillRect(x + open, y - 54, 46 - open, 108);
        if (on) {
          g.fillStyle(0xfff3b0, 0.5);
          g.fillRect(x - open, y - 54, open * 2, 108);
        }
        break;
      }
      case 'lamp':
        if (on) {
          g.fillStyle(0xfff3b0, 0.25);
          g.fillCircle(x, y - 10, 70);
        }
        g.fillStyle(on ? 0xfff3b0 : 0x6c757d, 1);
        g.fillCircle(x, y - 10, 32);
        g.fillStyle(0x9aa6b4, 1);
        g.fillRect(x - 14, y + 22, 28, 20);
        break;
      case 'sign':
        g.fillStyle(0x3d2b25, 1);
        g.fillRoundedRect(x - 60, y - 40, 120, 80, 12);
        for (let i = 0; i < 12; i++) {
          g.fillStyle(on ? [0xffd43b, 0xff8787, 0x74c0fc][i % 3] : 0x555555, 1);
          g.fillCircle(x - 50 + (i % 6) * 20, y - 20 + Math.floor(i / 6) * 40, 7);
        }
        break;
      case 'bertie':
        g.fillStyle(0xd64541, 1);
        g.fillRoundedRect(x - 50, y - 50, 100, 90, 18);
        g.fillStyle(0xf2e6c8, 1);
        g.fillCircle(x - 20, y - 14, 14);
        g.fillCircle(x + 20, y - 14, 14);
        g.fillStyle(on ? 0x51cf66 : 0x222222, 1);
        g.fillCircle(x - 20, y - 14, 6);
        g.fillCircle(x + 20, y - 14, 6);
        g.fillStyle(on ? 0xfff3bf : 0x3d2b25, 1);
        g.fillRect(x - 24, y + 14, 48, on ? 14 : 6);
        if (on) {
          // the flag of "someone's here": up and waving
          g.lineStyle(4, 0x333333, 1);
          g.lineBetween(x + 56, y + 40, x + 56, y - 60);
          g.fillStyle(0xffd43b, 1);
          g.fillTriangle(x + 56, y - 60, x + 56, y - 34, x + 86 + Math.sin(this.t * 6) * 4, y - 47);
        }
        break;
      case 'flag': {
        g.lineStyle(5, 0x333333, 1);
        g.lineBetween(x, y + 50, x, y - 60);
        const fy = on ? -60 : 20;
        g.fillStyle(0xe05a47, 1);
        g.fillTriangle(x, y + fy, x, y + fy + 30, x + 44 + Math.sin(this.t * 6) * 4, y + fy + 15);
        break;
      }
      case 'bell': {
        const sw = on ? Math.sin(this.t * 10) * 0.3 : 0;
        g.fillStyle(0xd9a441, 1);
        g.fillTriangle(x - 40 + sw * 30, y + 30, x + 40 + sw * 30, y + 30, x + sw * 10, y - 40);
        g.fillCircle(x + sw * 10, y - 20, 26);
        break;
      }
      default:
        g.fillStyle(on ? 0x8ce99a : 0x6c757d, 1);
        g.fillCircle(x, y, 40);
    }
  }

  private wirePath(from: LogicRoomNode, to: LogicRoomNode, k: number, of: number): Array<{ x: number; y: number }> {
    const x1 = from.x + 50;
    const y1 = from.y;
    const x2 = to.x - 50;
    const y2 = to.y + (of > 1 ? (k - (of - 1) / 2) * 30 : 0);
    const mx = (x1 + x2) / 2;
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 20; i++) {
      const f = i / 20;
      const e = f * f * (3 - 2 * f);
      pts.push({ x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * e });
    }
    void mx;
    return pts;
  }

  protected tick(dt: number): void {
    this.t += dt;
    this.stepTest(dt);
    const wg = this.wiresG;
    const mg = this.marblesG;
    const ng = this.nodesG;
    wg.clear();
    mg.clear();
    ng.clear();
    for (const n of this.def.nodes) {
      const ins = n.inputs ?? [];
      ins.forEach((src, k) => {
        const from = this.node(src);
        const pts = this.wirePath(from, n, k, ins.length);
        const on = !!this.values[src];
        wg.lineStyle(16, 0x2b1d14, 0.7);
        wg.strokePoints(pts.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
        wg.lineStyle(10, on ? 0xc8923a : 0x7a6a5a, 1);
        wg.strokePoints(pts.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
        if (on) {
          for (let m = 0; m < 3; m++) {
            const f = (this.t * 0.7 + m / 3) % 1;
            const p = pts[Math.floor(f * (pts.length - 1))];
            mg.fillStyle(0x74c0fc, 1);
            mg.fillCircle(p.x, p.y, 7);
            mg.fillStyle(0xffffff, 0.8);
            mg.fillCircle(p.x - 2, p.y - 2, 2.5);
          }
        }
      });
    }
    for (const n of this.def.nodes) this.drawNode(ng, n);
    // placed gate parts show their state too
    for (const p of this.parts) {
      const g = p.obj.list[0] as Phaser.GameObjects.Graphics;
      g.clear();
      this.drawGate(g, p.gate, 0, 0, p.node ? !!this.values[p.node] : false, this.t);
    }
    if (this.testing) {
      const c = this.testCases[this.testCase];
      if (c) {
        ng.fillStyle(0xfff3b0, 0.15);
        ng.fillRoundedRect(200, 100, 880, 450, 30);
      }
    }
  }

  // ───────────── hints, ghosts, peek ─────────────

  protected hintTarget(): HintTarget | null {
    for (const n of this.def.nodes) {
      if (!n.slot) continue;
      const want = this.def.solution.gates?.[n.id];
      if (want && this.state.gates[n.id] !== want) {
        const p = this.parts.find((q) => q.gate === want && q.node !== n.id && !(q.node && this.def.solution.gates?.[q.node] === want));
        return { from: p ? { x: p.obj.x, y: p.obj.y } : undefined, to: { x: n.x, y: n.y } };
      }
    }
    for (const [id, v] of Object.entries(this.def.solution.inputs ?? {})) {
      if (!!this.state.inputs[id] !== v) {
        const n = this.node(id);
        return { to: { x: n.x, y: n.y } };
      }
    }
    if (this.def.goal.kind !== 'reach') return { to: { x: 1180, y: 600 } };
    return null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    for (const n of this.def.nodes) {
      if (!n.slot || this.state.gates[n.id]) continue;
      const want = this.def.solution.gates?.[n.id];
      if (!want) continue;
      g.lineStyle(4, GATE_COLORS[want], alpha + 0.2);
      g.strokeRoundedRect(n.x - 44, n.y - 40, 88, 80, 12);
    }
  }

  protected drawBlueprint(g: Phaser.GameObjects.Graphics, pulse: number): void {
    for (const n of this.def.nodes) {
      const on = !!this.values[n.id];
      g.lineStyle(4, on ? 0xfff0a0 : 0x7fd3ff, 0.9);
      g.strokeCircle(n.x, n.y, 52);
      if (n.kind === 'gate' && (n.gate || this.state.gates[n.id])) {
        const gate = this.state.gates[n.id] ?? n.gate!;
        g.fillStyle(GATE_COLORS[gate], 0.9);
        g.fillCircle(n.x, n.y - 58, 8);
      }
      if (n.slot && !this.state.gates[n.id]) {
        g.lineStyle(3, 0xffffff, 0.4 + pulse * 0.5);
        g.strokeCircle(n.x, n.y, 30 + pulse * 10);
      }
    }
  }

  protected solutionSteps(): number {
    return Object.keys(this.def.solution.gates ?? {}).length + Object.keys(this.def.solution.inputs ?? {}).length + (this.def.goal.kind === 'reach' ? 0 : 1);
  }
}

function outputId(def: { goal: { output: string } }): string {
  return def.goal.output;
}

/** "(a | b) & !c" → "(A or B) and not C", using node labels when they have them. */
function friendly(expr: string, nodes: LogicRoomNode[]): string {
  return expr
    .replace(/[A-Za-z_]\w*/g, (id) => (nodes.find((n) => n.id === id)?.label ?? id).toUpperCase())
    .replace(/&/g, ' and ')
    .replace(/\|/g, ' or ')
    .replace(/!/g, 'not ')
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')');
}

export { GATE_WORDS };
