/** Clock regulators: gravity drives the bob; an escapement supplies small
 * impulses at centre crossings. Matching lengths matches periods, not phase. */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { CM, drawPatina } from '../art/copperMoss';
import { G, PENDULUM_PIXELS_PER_METRE, notchLength, notchPixels, notchTempo, releasePendulum, pushPendulum, stepPendulum, tempoMatches, type PendulumMotion } from '../mechanism/pendulum';
import { pendulumSolved } from '../rules';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { FONT, roundButton } from '../ui/widgets';

interface PView {
  id: string; px: number; py: number; fixed: boolean;
  bob: Phaser.GameObjects.Container;
  motion: PendulumMotion; dragging: boolean;
}

export class PendulumRoom extends RoomBase<'pendulum'> {
  private views: PView[] = [];
  private g!: Phaser.GameObjects.Graphics;
  private pallet?: Phaser.GameObjects.Container;
  private palletHome = { x: 640, y: 598 };
  private escape = { x: 650, y: 195 };
  private releaseButton?: Phaser.GameObjects.Container;
  private meter?: Phaser.GameObjects.Text;
  private lengthLabels: Phaser.GameObjects.Text[] = [];
  private t = 0;
  private beat = 0;
  private observed = 0;
  private clockSeconds = 0;
  private releasePrep?: { elapsed: number; angles: number[] };

  constructor() { super('room-pendulum'); }

  protected build(): void {
    this.views = []; this.lengthLabels = [];
    this.pallet = undefined; this.meter = undefined; this.releaseButton = undefined;
    this.beat = 0; this.observed = 0; this.clockSeconds = 0; this.t = 0; this.releasePrep = undefined;
    this.g = this.add.graphics().setDepth(D.mech);
    const n = this.def.pendulums.length;
    this.def.pendulums.forEach((p, i) => {
      const px = n === 1 ? 540 : 450 + i * 380, py = 165;
      const bob = this.add.container(px, py + notchPixels(this.state.notches[p.id])).setDepth(D.parts).setName('pendulum-bob:' + p.id);
      const bg = this.add.graphics();
      bg.fillStyle(CM.ink, .25); bg.fillCircle(3, 5, 34);
      bg.fillStyle(p.fixed ? CM.teal : CM.brass, 1); bg.fillCircle(0, 0, 34);
      bg.lineStyle(2, CM.ink, .9); bg.strokeCircle(0, 0, 34);
      bg.lineStyle(2, CM.copperLight, .9); bg.strokeCircle(0, 0, 29);
      bg.lineStyle(1, CM.cream, .6); bg.beginPath(); bg.arc(-1, -1, 26, Math.PI, Math.PI * 1.8); bg.strokePath();
      bg.fillStyle(CM.ink, .35); bg.fillCircle(0, 0, 7);
      bg.fillStyle(CM.brass, 1); bg.fillCircle(-1, -1, 5);
      drawPatina(bg, -21, -21, 42, 42, i + 31, 1.8);
      bob.add(bg); bob.setSize(90, 90);
      const view: PView = { id: p.id, px, py, fixed: !!p.fixed, bob, dragging: false,
        motion: this.def.goal === 'push' ? { angle: 0, velocity: 0 } : releasePendulum() };
      this.views.push(view);
      const adjustable = !p.fixed && this.def.goal !== 'push';
      bob.setInteractive({ draggable: adjustable, useHandCursor: !p.fixed || this.def.goal === 'push' });
      if (adjustable) {
        let start = p.notch, moved = false, heldAngle = 0;
        bob.on('dragstart', () => {
          start = this.state.notches[p.id]; moved = false;
          heldAngle = view.motion.angle; view.dragging = true; this.idle = 0;
          this.observed = 0;
          if (this.def.goal === 'sync') this.state.pushed = false;
          this.releasePrep = undefined;
        });
        bob.on('drag', (ptr: Phaser.Input.Pointer) => {
          // Hold the swing while adjusting; only movement along the rod changes L.
          const length = (ptr.worldX - px) * Math.sin(heldAngle) + (ptr.worldY - py) * Math.cos(heldAngle);
          const notch = Phaser.Math.Clamp(Math.round((length / PENDULUM_PIXELS_PER_METRE - .15) / .1), this.def.minNotch, this.def.maxNotch);
          if (notch !== this.state.notches[p.id]) { this.state.notches[p.id] = notch; sfx.ratchet(1); moved = true; }
        });
        bob.on('dragend', () => {
          view.dragging = false; this.observed = 0;
          if (moved && start !== this.state.notches[p.id]) {
            const old = start;
            this.act(() => { this.state.notches[p.id] = old; this.invalidateTrial(); });
            if (this.def.goal === 'tempo' && tempoMatches(this.state.notches[p.id], this.def.bpm ?? 60)) sfx.ding(1568);
          }
        });
      }
      bob.on('pointerup', (ptr: Phaser.Input.Pointer) => { if (ptr.getDistance() < 10 && (!p.fixed || this.def.goal === 'push')) this.push(view); });
      if (this.style.numbers) this.lengthLabels.push(this.add.text(px - (n === 1 ? 70 : 0), py - 35, '', { fontFamily: FONT, fontSize: '20px', color: '#f4ebd5', backgroundColor: '#342f29cc', padding: { x: 8, y: 4 } }).setOrigin(.5).setDepth(D.parts));
    });
    this.escape = { x: this.views[0].px + 110, y: this.views[0].py + 30 };
    if (this.def.pallet) {
      const c = this.add.container(this.palletHome.x, this.palletHome.y).setDepth(D.trayPart).setScale(.8).setName('pendulum-pallet');
      const pg = this.add.graphics();
      this.drawPallet(pg, 0, 0, 1); c.add(pg); c.setSize(100, 70); this.pallet = c;
      let wasFitted = false;
      this.enableDrag({
        obj: c, restScale: .8,
        targets: () => this.state.pallet ? [] : [{ id: 'esc', x: this.escape.x, y: this.escape.y + 30 }],
        pick: () => { wasFitted = this.state.pallet; this.state.pallet = false; this.observed = 0; },
        drop: target => {
          if (target) this.dropPallet(target); else { c.setRotation(0); this.floatHome(c, this.palletHome, .8); }
          if (this.state.pallet !== wasFitted) this.act(() => { this.state.pallet = wasFitted; this.invalidateTrial(); });
        },
      });
    }
    if (this.def.goal === 'sync') this.releaseButton = roundButton(this, 1180, 600, '▶', () => this.releaseTogether(), { r: 48, fontSize: 40, color: CM.mossLight, say: 'Release together!' }).setDepth(D.hud);
    if (this.def.goal === 'tempo') this.meter = this.add.text(960, 480, '', { fontFamily: FONT, fontSize: '20px', color: '#f4ebd5', backgroundColor: '#342f29cc', padding: { x: 12, y: 8 }, align: 'center' }).setOrigin(.5).setDepth(D.parts);
  }

  private invalidateTrial(): void {
    this.observed = 0;
    this.releasePrep = undefined;
    if (this.def.goal === 'sync') this.state.pushed = false;
  }

  private push(view: PView): void {
    if (this.fixed) return;
    const before = this.views.map(v => ({ ...v.motion })), was = this.state.pushed;
    if (this.def.goal === 'push' && this.views.length > 1) {
      for (const v of this.views) v.motion = pushPendulum(notchLength(this.state.notches[v.id]), v.motion);
    } else view.motion = pushPendulum(notchLength(this.state.notches[view.id]), view.motion);
    this.observed = 0; this.state.pushed = this.def.goal !== 'sync';
    if (!was && this.state.pushed) this.act(() => { this.state.pushed = was; this.views.forEach((v, i) => v.motion = before[i]); this.observed = 0; });
    sfx.swish();
    if (this.def.pallet && !this.state.pallet) { sfx.nuhUh(); this.kip.shrug(); }
  }

  private releaseTogether(): void {
    if (this.fixed || this.views.some(v => v.dragging)) return;
    const before = this.views.map(v => ({ ...v.motion })), was = this.state.pushed;
    // A visible common release supplies identical initial conditions. Independent
    // pendulums then evolve under gravity; their phases are never copied.
    this.releasePrep = { elapsed: 0, angles: before.map(m => m.angle) };
    this.state.pushed = false; this.observed = 0; sfx.swish();
    this.act(() => { this.releasePrep = undefined; this.state.pushed = was; this.views.forEach((v, i) => v.motion = before[i]); this.observed = 0; });
  }

  private dropPallet(target: SnapTarget): void {
    this.state.pallet = true; this.pallet!.setRotation(0).setPosition(target.x, target.y).setScale(1).setDepth(D.parts);
    this.clunkAt(target.x, target.y);
  }

  protected refresh(): void {
    if (this.pallet) {
      this.pallet.setRotation(0);
      if (this.state.pallet) this.pallet.setPosition(this.escape.x, this.escape.y + 30).setScale(1).setDepth(D.parts);
      else this.pallet.setPosition(this.palletHome.x, this.palletHome.y).setScale(.8).setDepth(D.trayPart);
    }
    this.invalidateTrial();
  }

  protected afterSolutionApplied(): void {
    this.state.pushed = true; this.views.forEach(v => v.motion = releasePendulum());
    this.observed = 3; this.checkSolved();
  }

  protected checkSolved(): void {
    if (this.fixed || this.views.some(v => v.dragging) || this.observed < 3 || !pendulumSolved(this.def, this.state)) return;
    if (this.def.goal === 'sync') {
      const a = this.views[0].motion;
      if (this.views.some(v => Math.abs(v.motion.angle - a.angle) > .005 || Math.abs(v.motion.velocity - a.velocity) > .015)) return;
    }
    this.onFixed();
  }

  protected tick(dt: number): void {
    this.t += dt; const g = this.g; g.clear();
    const preparing = !!this.releasePrep;
    if (this.releasePrep) {
      this.releasePrep.elapsed += dt;
      const p = Math.min(1, this.releasePrep.elapsed / .45), ease = p * p * (3 - 2 * p);
      this.views.forEach((v, i) => { v.motion = { angle: this.releasePrep!.angles[i] * (1 - ease) + releasePendulum().angle * ease, velocity: 0 }; });
      if (p === 1) { this.releasePrep = undefined; this.state.pushed = true; }
    }
    let primaryCrossings = 0;
    const working = !this.def.pallet || this.state.pallet;
    for (const [i, view] of this.views.entries()) {
      const notch = this.state.notches[view.id];
      if (!view.dragging && !preparing) {
        const result = stepPendulum(notchLength(notch), view.motion, dt, { damping: working ? .025 : .25, escapement: working });
        view.motion = result;
        if (i === 0) primaryCrossings = result.crossings;
      }
      const a = view.motion.angle, length = notchPixels(notch);
      view.bob.setPosition(view.px + Math.sin(a) * length, view.py + Math.cos(a) * length);
      // Faint adjustment marks are a guide, not a heavy rod below the bob.
      if (!view.fixed && this.def.goal !== 'push') {
        g.lineStyle(2, CM.paper, .22); g.lineBetween(view.px, view.py, view.px + Math.sin(a) * notchPixels(this.def.maxNotch), view.py + Math.cos(a) * notchPixels(this.def.maxNotch));
        for (let k = this.def.minNotch; k <= this.def.maxNotch; k++) {
          const r = notchPixels(k); g.fillStyle(CM.cream, k === notch ? 1 : .6);
          g.fillCircle(view.px + Math.sin(a) * r, view.py + Math.cos(a) * r, k === notch ? 5 : 3);
        }
      }
      g.lineStyle(8, CM.ink, 1); g.lineBetween(view.px, view.py, view.bob.x, view.bob.y);
      g.lineStyle(4, CM.brass, 1); g.lineBetween(view.px, view.py, view.bob.x, view.bob.y);
      g.fillStyle(CM.woodDark, 1); g.fillRoundedRect(view.px - 32, view.py - 25, 64, 22, 4);
      g.fillStyle(CM.brass, 1); g.fillCircle(view.px, view.py, 12);
      g.lineStyle(2, CM.ink, 1); g.strokeCircle(view.px, view.py, 12);
      g.fillStyle(CM.ink, 1); g.fillCircle(view.px, view.py, 4);
      this.lengthLabels[i]?.setText('notch ' + notch + ' · ' + notchLength(notch).toFixed(2) + ' m');
    }
    const moving = this.views.some(v => Math.abs(v.motion.angle) + Math.abs(v.motion.velocity) > .02);
    if (primaryCrossings && working) {
      for (let i = 0; i < primaryCrossings; i++) { this.beat++; this.clockSeconds++; if (this.beat % 2) sfx.tick(.9); else sfx.tock(); }
      if (pendulumSolved(this.def, this.state) && !this.views.some(v => v.dragging)) this.observed += primaryCrossings;
      else this.observed = 0;
    }
    if (this.views.length === 1) this.drawEscapement(g, moving && working);
    else {
      this.drawBridge(g);
      if (preparing) {
        g.lineStyle(5, CM.glow, .85);
        g.lineBetween(this.views[0].px, this.views[0].py - 24, this.views[1].px, this.views[1].py - 24);
      }
    }
    if (this.meter) {
      const notch = this.state.notches[this.views.find(v => !v.fixed)!.id], now = notchTempo(notch), target = this.def.bpm ?? 60;
      this.meter.setText('target: ' + Math.round(target) + ' ticks/min\npendulum: ' + Math.round(now) + ' ticks/min\n' + (tempoMatches(notch, target) ? 'same beat — watch it swing' : now > target ? 'too fast — make it longer' : 'too slow — make it shorter'));
      // The reference also uses the correct physical length, in the same scale.
      const reference = -.22 * Math.sin(this.t * target / 60 * Math.PI);
      const referenceLength = G * (60 / (Math.PI * target)) ** 2 * PENDULUM_PIXELS_PER_METRE;
      g.lineStyle(4, CM.brass, 1); g.lineBetween(960, 165, 960 + Math.sin(reference) * referenceLength, 165 + Math.cos(reference) * referenceLength);
      g.fillStyle(CM.mossLight, 1); g.fillCircle(960 + Math.sin(reference) * referenceLength, 165 + Math.cos(reference) * referenceLength, 24);
      const pulse = (this.t * target / 60) % 1;
      g.fillStyle(CM.glow, pulse < .12 ? 1 : .2); g.fillCircle(960, 130, 12);
      g.fillStyle(CM.ink, 1); g.fillCircle(960, 165, 6);
    }
    if (!moving && !this.fixed && this.def.goal === 'push' && working) {
      const bob = this.views.find(v => !v.fixed)?.bob ?? this.views[0].bob;
      g.lineStyle(4, CM.glow, .75 + Math.sin(this.t * 4) * .2);
      g.beginPath(); g.arc(bob.x, bob.y, 51, -.7, .7); g.strokePath();
      g.fillStyle(CM.glow, 1); g.fillTriangle(bob.x + 32, bob.y + 35, bob.x + 46, bob.y + 41, bob.x + 46, bob.y + 21);
    }
    this.g.setData('pendulum-geometry', {
      beat: this.beat, observed: this.observed, clockSeconds: this.clockSeconds, working,
      releaseButton: this.releaseButton ? { x: this.releaseButton.x, y: this.releaseButton.y } : null,
      preparingRelease: preparing,
      palletTarget: { x: this.escape.x, y: this.escape.y + 30 },
      wheel: { x: this.escape.x, y: this.views[0].py, radius: 48 },
      views: this.views.map(v => ({ id: v.id, pivot: { x: v.px, y: v.py }, bob: { x: v.bob.x, y: v.bob.y }, angle: v.motion.angle, velocity: v.motion.velocity, lengthM: notchLength(this.state.notches[v.id]), lengthPixels: notchPixels(this.state.notches[v.id]), dragging: v.dragging })),
    });
    this.checkSolved();
  }

  private drawPallet(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, angle = 0): void {
    const point = (px: number, py: number) => ({ x: x + px * Math.cos(angle) - py * Math.sin(angle), y: y + px * Math.sin(angle) + py * Math.cos(angle) });
    const a = point(-35, -25), b = point(35, -25);
    g.lineStyle(9, CM.ink, alpha); g.lineBetween(a.x, a.y, x, y); g.lineBetween(x, y, b.x, b.y);
    g.lineStyle(6, CM.copper, alpha); g.lineBetween(a.x, a.y, x, y); g.lineBetween(x, y, b.x, b.y);
    g.fillStyle(CM.tealDark, alpha);
    for (const px of [-43, 28]) g.fillPoints([point(px, -31), point(px + 15, -31), point(px + 15, -21), point(px, -21)], true);
    g.fillStyle(CM.brass, alpha); g.fillCircle(x, y, 6);
  }

  private drawEscapement(g: Phaser.GameObjects.Graphics, running: boolean): void {
    const view = this.views[0], e = { x: this.escape.x, y: view.py }, mount = { x: e.x, y: this.escape.y + 30 };
    // The pallet physically touches the lower wheel teeth; its crutch connects
    // to the swinging rod. One centre crossing advances one tooth.
    g.fillStyle(CM.woodDark, .8); g.fillRoundedRect(e.x - 59, e.y - 55, 203, 136, 9);
    g.fillStyle(CM.ink, 1); g.fillCircle(e.x, e.y, 45);
    for (let i = 0; i < 30; i++) {
      const a = i * Math.PI * 2 / 30 + this.beat * Math.PI * 2 / 30;
      g.fillStyle(CM.brass, 1); g.fillTriangle(e.x + Math.cos(a) * 48, e.y + Math.sin(a) * 48, e.x + Math.cos(a - .065) * 40, e.y + Math.sin(a - .065) * 40, e.x + Math.cos(a + .065) * 40, e.y + Math.sin(a + .065) * 40);
    }
    g.lineStyle(5, CM.brass, 1); g.strokeCircle(e.x, e.y, 35);
    g.lineStyle(4, CM.copperLight, 1);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 + this.beat * Math.PI * 2 / 30; g.lineBetween(e.x, e.y, e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34); }
    g.fillStyle(CM.brass, 1); g.fillCircle(e.x, e.y, 9);
    // A wound spring drum supplies the clock's energy through two small gears.
    for (const [offset, direction] of [[71, -1], [116, 1]]) {
      const cx = e.x + offset, rotation = direction * this.beat * Math.PI * 2 / 14;
      g.fillStyle(CM.tealDark, 1); g.fillCircle(cx, e.y, 18);
      for (let i = 0; i < 14; i++) {
        const a = i * Math.PI * 2 / 14 + rotation;
        g.fillStyle(CM.brass, 1); g.fillTriangle(cx + Math.cos(a) * 23, e.y + Math.sin(a) * 23, cx + Math.cos(a - .16) * 18, e.y + Math.sin(a - .16) * 18, cx + Math.cos(a + .16) * 18, e.y + Math.sin(a + .16) * 18);
      }
      g.lineStyle(2, CM.copperLight, 1); g.beginPath();
      for (let k = 0; k <= 70; k++) {
        const a = k / 70 * Math.PI * 5 + rotation, r = 2 + k / 70 * 13;
        const px = cx + Math.cos(a) * r, py = e.y + Math.sin(a) * r;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
    if (this.def.pallet && !this.state.pallet) this.drawPallet(g, mount.x, mount.y, .45 + Math.sin(this.t * 4) * .15);
    else {
      const rod = { x: view.px + Math.sin(view.motion.angle) * 40, y: view.py + Math.cos(view.motion.angle) * 40 };
      g.lineStyle(4, CM.copper, 1); g.lineBetween(mount.x, mount.y, rod.x, rod.y);
      if (this.pallet) this.pallet.setRotation(-view.motion.angle * .45);
      else this.drawPallet(g, mount.x, mount.y, 1, -view.motion.angle * .45);
    }
    if (this.def.goal !== 'tempo') this.drawClock(g, running);
  }

  private drawClock(g: Phaser.GameObjects.Graphics, running: boolean): void {
    const cx = 940, cy = 275;
    g.lineStyle(5, CM.woodDark, 1); g.lineBetween(this.escape.x + 48, this.views[0].py, cx - 72, cy);
    g.fillStyle(CM.ink, .3); g.fillCircle(cx + 4, cy + 6, 82);
    g.fillStyle(CM.copperDark, 1); g.fillCircle(cx, cy, 82);
    g.fillStyle(CM.brass, 1); g.fillCircle(cx, cy, 74);
    g.fillStyle(CM.cream, 1); g.fillCircle(cx, cy, 66);
    for (let k = 0; k < 60; k++) {
      const a = k * Math.PI / 30; g.lineStyle(k % 5 ? 1 : 3, CM.ink, 1);
      g.lineBetween(cx + Math.sin(a) * 57, cy - Math.cos(a) * 57, cx + Math.sin(a) * (k % 5 ? 60 : 63), cy - Math.cos(a) * (k % 5 ? 60 : 63));
    }
    const hour = this.clockSeconds / 43200 * Math.PI * 2 + Math.PI / 3, minute = this.clockSeconds / 3600 * Math.PI * 2, second = this.clockSeconds / 60 * Math.PI * 2;
    for (const [a, length, width, color] of [[hour, 33, 7, CM.ink], [minute, 48, 4, CM.ink], [second, 54, 2, CM.copperDark]]) {
      g.lineStyle(width, color, 1); g.lineBetween(cx, cy, cx + Math.sin(a) * length, cy - Math.cos(a) * length);
    }
    g.fillStyle(CM.copper, 1); g.fillCircle(cx, cy, 6);
    // Hands retain their last position when stopped.
    g.fillStyle(running ? CM.mossLight : CM.inkSoft, 1); g.fillCircle(cx, cy + 101, 8);
  }

  private drawBridge(g: Phaser.GameObjects.Graphics): void {
    const [a, b] = this.views, together = pendulumSolved(this.def, this.state) && (this.def.goal === 'push' || this.state.pushed);
    g.lineStyle(10, CM.ink, together ? .8 : .12); g.lineBetween(a.bob.x + 30, a.bob.y, b.bob.x - 30, b.bob.y);
    g.lineStyle(7, CM.wood, together ? 1 : .2); g.lineBetween(a.bob.x + 30, a.bob.y, b.bob.x - 30, b.bob.y);
    if (together) for (let k = 0; k < 9; k++) { const x = a.bob.x + 32 + (b.bob.x - a.bob.x - 64) * k / 8; g.fillStyle(CM.brass, 1); g.fillCircle(x, a.bob.y, 2); }
  }

  protected hintTarget(): HintTarget | null {
    if (this.def.pallet && !this.state.pallet && this.pallet) return { from: { x: this.pallet.x, y: this.pallet.y }, to: { x: this.escape.x, y: this.escape.y + 30 } };
    const v = this.views.find(q => !q.fixed) ?? this.views[0], want = this.def.solution.notches?.[v.id];
    if (this.def.goal === 'push') return { to: { x: v.bob.x, y: v.bob.y } };
    if (want !== undefined && want !== this.state.notches[v.id]) return { from: { x: v.bob.x, y: v.bob.y }, to: this.notchPoint(v, want) };
    if (this.def.goal === 'sync') return { to: { x: 1180, y: 600 } };
    return { to: { x: v.bob.x, y: v.bob.y } };
  }

  private notchPoint(v: PView, notch: number): { x: number; y: number } {
    return { x: v.px + Math.sin(v.motion.angle) * notchPixels(notch), y: v.py + Math.cos(v.motion.angle) * notchPixels(notch) };
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    for (const v of this.views) {
      const want = this.def.solution.notches?.[v.id];
      if (want === undefined || want === this.state.notches[v.id]) continue;
      const p = this.notchPoint(v, want); g.lineStyle(4, CM.cream, alpha + .2); g.strokeCircle(p.x, p.y, 34);
    }
  }

  protected solutionSteps(): number { return (this.def.pallet ? 1 : 0) + (this.def.goal === 'sync' ? 2 : 1); }
}
