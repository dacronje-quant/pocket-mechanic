/**
 * Pendulums & timing (GDD §8.4): push the pendulum to start the clock, snap
 * the missing pallet piece onto the escapement, slide the bob to match the
 * metronome, or make two pendulums swing together so the bridge forms.
 * Real physics: the period depends on the length, not the weight.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { CM, drawPatina } from '../art/copperMoss';
import { notchLength, notchTempo, period, tempoMatches } from '../mechanism/pendulum';
import { pendulumSolved } from '../rules';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { FONT } from '../ui/widgets';

interface PView {
  id: string;
  px: number;
  py: number;
  fixed: boolean;
  bob: Phaser.GameObjects.Container;
  amp: number;
  phase: number;
  side: number;
}

const ROD = (notch: number) => 80 + notch * 34;

export class PendulumRoom extends RoomBase<'pendulum'> {
  private views: PView[] = [];
  private g!: Phaser.GameObjects.Graphics;
  private pallet?: Phaser.GameObjects.Container;
  private palletHome = { x: 640, y: 598 };
  private escape = { x: 640, y: 140 };
  private t = 0;
  private meter?: Phaser.GameObjects.Text;
  private beat = 0;

  constructor() {
    super('room-pendulum');
  }

  protected build(): void {
    this.views = [];
    this.pallet = undefined;
    this.g = this.add.graphics().setDepth(D.mech);
    const n = this.def.pendulums.length;
    const swinging = this.def.goal !== 'push';
    this.def.pendulums.forEach((p, i) => {
      const px = n === 1 ? 640 : 640 + (i - (n - 1) / 2) * 380;
      const bob = this.add.container(px, 130 + ROD(this.state.notches[p.id])).setDepth(D.parts);
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.3);
      bg.fillCircle(3, 5, 34);
      bg.fillStyle(p.fixed ? 0x82938c : 0xbca16a, 1);
      bg.fillCircle(0, 0, 34);
      bg.fillStyle(0xf4ebd5, 0.4);
      bg.fillCircle(-10, -10, 13);
      bg.lineStyle(2, CM.ink, 0.8);
      bg.strokeCircle(0, 0, 34);
      bg.lineStyle(1, CM.copperLight, 0.7);
      bg.strokeCircle(0, 0, 29);
      drawPatina(bg, -21, -21, 42, 42, i + 31, 1.8);
      bob.add(bg);
      bob.setSize(90, 90);
      const v: PView = { id: p.id, px, py: 130, fixed: !!p.fixed, bob, amp: swinging ? 0.3 : 0, phase: 0, side: i };
      this.views.push(v);
      if (!p.fixed) {
        bob.setInteractive({ draggable: true, useHandCursor: true });
        let start = 0;
        let moved = false;
        bob.on('dragstart', () => {
          start = this.state.notches[p.id];
          moved = false;
          this.idle = 0;
        });
        bob.on('drag', (ptr: Phaser.Input.Pointer) => {
          // slide the bob along the rod: notches snap with a click
          const len = Math.hypot(ptr.worldX - v.px, ptr.worldY - v.py);
          const notch = Phaser.Math.Clamp(Math.round((len - 80) / 34), this.def.minNotch, this.def.maxNotch);
          if (notch !== this.state.notches[p.id]) {
            this.state.notches[p.id] = notch;
            sfx.ratchet(1);
            moved = true;
          }
        });
        bob.on('dragend', () => {
          if (moved && start !== this.state.notches[p.id]) {
            const id = p.id;
            this.act(() => (this.state.notches[id] = start));
            if (this.def.goal === 'tempo' && tempoMatches(this.state.notches[id], this.def.bpm ?? 60)) sfx.ding(1568);
          }
        });
      }
      bob.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (ptr.getDistance() < 10) this.push(v);
      });
    });
    if (this.def.pallet) {
      this.escape = { x: this.views[0].px + 90, y: 110 };
      const c = this.add.container(this.palletHome.x, this.palletHome.y).setDepth(D.trayPart).setScale(0.8);
      const pg = this.add.graphics();
      pg.fillStyle(0xc8703f, 1);
      pg.fillTriangle(-40, -10, 40, -10, 0, 22);
      pg.fillRect(-46, -16, 18, 12);
      pg.fillRect(28, -16, 18, 12);
      c.add(pg);
      c.setSize(100, 60);
      this.pallet = c;
      this.enableDrag({
        obj: c,
        restScale: 0.8,
        targets: () => (this.state.pallet ? [] : [{ id: 'esc', x: this.escape.x, y: this.escape.y + 30 }]),
        drop: (t) => this.dropPallet(t),
        pick: () => {
          if (this.state.pallet) {
            this.state.pallet = false;
            this.undoStack.push(() => (this.state.pallet = true));
          }
        },
      });
    }
    if (this.def.goal === 'tempo' && this.style.id !== 'tinker') {
      this.meter = this.add
        .text(1000, 200, '', { fontFamily: FONT, fontSize: '22px', color: '#f4ebd5', backgroundColor: '#342f29cc', padding: { x: 12, y: 8 }, align: 'center' })
        .setOrigin(0.5)
        .setDepth(D.hud - 1);
    }
  }

  private push(v: PView): void {
    if (this.fixed) return;
    v.amp = 0.38;
    sfx.swish();
    if (!this.state.pushed) {
      this.state.pushed = true;
      this.act(() => (this.state.pushed = false));
    }
    if (this.def.pallet && !this.state.pallet) {
      // without the pallet, the escapement just freewheels — a funny whirr, no tick
      sfx.whirr();
      this.kip.shrug();
    }
  }

  private dropPallet(t: SnapTarget | null): void {
    const c = this.pallet!;
    if (!t) return this.floatHome(c, this.palletHome, 0.8);
    this.state.pallet = true;
    this.tweens.add({ targets: c, x: t.x, y: t.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    c.setDepth(D.mech + 2);
    this.clunkAt(t.x, t.y);
    this.act(() => (this.state.pallet = false));
  }

  protected refresh(): void {
    if (this.pallet) {
      if (this.state.pallet) this.pallet.setPosition(this.escape.x, this.escape.y + 30).setScale(1);
      else this.pallet.setPosition(this.palletHome.x, this.palletHome.y).setScale(0.8);
    }
    if (this.state.pushed) for (const v of this.views) v.amp = Math.max(v.amp, 0.3);
  }

  protected afterSolutionApplied(): void {
    for (const v of this.views) v.amp = 0.35;
    this.checkSolved();
  }

  protected tick(dt: number): void {
    this.t += dt;
    const g = this.g;
    g.clear();
    let ticked = false;
    for (const v of this.views) {
      const notch = this.state.notches[v.id];
      const T = period(notchLength(notch));
      // in the sync room both start together, so a mismatch shows as drifting apart
      v.phase += (dt / T) * Math.PI * 2;
      const before = Math.sin(v.phase - (dt / T) * Math.PI * 2);
      const ang = v.amp * Math.sin(v.phase);
      if (v.amp > 0.01 && Math.sign(before) !== Math.sign(Math.sin(v.phase))) ticked = true;
      const len = ROD(notch);
      const bx = v.px + Math.sin(ang) * len;
      const by = v.py + Math.cos(ang) * len;
      v.bob.setPosition(bx, by);
      // rod with notches
      g.lineStyle(10, 0x554638, 1);
      g.lineBetween(v.px, v.py, v.px + Math.sin(ang) * ROD(this.def.maxNotch), v.py + Math.cos(ang) * ROD(this.def.maxNotch));
      g.lineStyle(5, 0xb88a2c, 1);
      g.lineBetween(v.px, v.py, v.px + Math.sin(ang) * ROD(this.def.maxNotch), v.py + Math.cos(ang) * ROD(this.def.maxNotch));
      for (let k = this.def.minNotch; k <= this.def.maxNotch; k++) {
        const r = ROD(k);
        g.fillStyle(0xf4ebd5, 0.8);
        g.fillCircle(v.px + Math.sin(ang) * r, v.py + Math.cos(ang) * r, 3);
      }
      g.fillStyle(0x342f29, 1);
      g.fillCircle(v.px, v.py, 14);
      if (this.style.numbers) {
        g.fillStyle(0, 0);
      }
    }
    // escapement wheel at the top: ticks each swing when the pallet is there
    const e = this.escape;
    const running = this.views[0].amp > 0.01 && (!this.def.pallet || this.state.pallet);
    if (this.def.pallet || this.def.goal === 'push') {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + (running ? Math.floor(this.t * 2) * 0.26 : 0);
        g.fillStyle(0xbca16a, 1);
        g.fillTriangle(e.x + 110 + Math.cos(a) * 40, 150 + Math.sin(a) * 40, e.x + 110 + Math.cos(a + 0.2) * 28, 150 + Math.sin(a + 0.2) * 28, e.x + 110 + Math.cos(a - 0.2) * 28, 150 + Math.sin(a - 0.2) * 28);
      }
      g.fillStyle(0xbca16a, 1);
      g.fillCircle(e.x + 110, 150, 28);
      if (this.def.pallet && !this.state.pallet) {
        g.lineStyle(3, 0xf4ebd5, 0.5 + Math.sin(this.t * 4) * 0.3);
        g.strokeRoundedRect(e.x - 50, e.y + 8, 100, 44, 8);
      }
    }
    if (ticked && running) {
      this.beat++;
      if (this.beat % 2) sfx.tick(0.9);
      else sfx.tock();
    }
    if (this.def.goal === 'sync' && this.views.length > 1) {
      // the bridge forms when both bobs swing together
      const [a, b] = this.views;
      const together = this.state.notches[a.id] === this.state.notches[b.id];
      g.lineStyle(14, together ? 0x856c50 : 0x856c50, together ? 1 : 0.25);
      g.lineBetween(a.bob.x + 30, a.bob.y, b.bob.x - 30, b.bob.y);
      if (together) {
        g.fillStyle(0x856c50, 1);
        for (let k = 0; k < 8; k++) g.fillRect(a.bob.x + 30 + ((b.bob.x - a.bob.x - 60) * k) / 8, a.bob.y - 12, 18, 6);
      }
    }
    if (this.meter) {
      const notch = this.state.notches[this.views.find((v) => !v.fixed)!.id];
      const now = notchTempo(notch);
      const ok = tempoMatches(notch, this.def.bpm ?? 60);
      this.meter.setText(`metronome: ${Math.round(this.def.bpm ?? 60)} ticks/min\npendulum: ${Math.round(now)} ticks/min ${ok ? '✓' : now > (this.def.bpm ?? 60) ? '(too fast)' : '(too slow)'}`);
      // the metronome's flashing beat
      const ph = (this.t * (this.def.bpm ?? 60)) / 60;
      g.fillStyle(0xffd43b, ph % 1 < 0.15 ? 1 : 0.2);
      g.fillCircle(1000, 140, 14);
    }
    void pendulumSolved;
  }

  protected hintTarget(): HintTarget | null {
    if (this.def.pallet && !this.state.pallet && this.pallet) return { from: { x: this.pallet.x, y: this.pallet.y }, to: { x: this.escape.x, y: this.escape.y + 30 } };
    const v = this.views.find((q) => !q.fixed) ?? this.views[0];
    if (this.def.goal === 'push') return { to: { x: v.bob.x, y: v.bob.y } };
    const want = this.def.solution.notches?.[v.id];
    if (want !== undefined) {
      const ang = v.amp * Math.sin(v.phase);
      return { from: { x: v.bob.x, y: v.bob.y }, to: { x: v.px + Math.sin(ang) * ROD(want), y: v.py + Math.cos(ang) * ROD(want) } };
    }
    return null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    for (const v of this.views) {
      const want = this.def.solution.notches?.[v.id];
      if (want === undefined || want === this.state.notches[v.id]) continue;
      g.lineStyle(4, 0xf4ebd5, alpha + 0.2);
      g.strokeCircle(v.px, v.py + ROD(want), 34);
    }
  }

  protected solutionSteps(): number {
    return (this.def.pallet ? 1 : 0) + (this.def.goal === 'push' ? 1 : 1);
  }
}
