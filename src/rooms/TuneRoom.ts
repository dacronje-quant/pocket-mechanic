/**
 * Tuning rooms: straighten comb teeth, tune the radio, keep the boiler in the
 * green, balance the whistles into a chord. Every dial is heard *and* seen:
 * your wave is drawn over a golden ghost wave (GDD §25.3 visual sound cues).
 */
import Phaser from 'phaser';
import { LINES } from '../content/story';
import * as sfx from '../audio/sfx';
import { speak } from '../audio/voice';
import { CM, drawPatina } from '../art/copperMoss';
import { clarity, dialPitch, dialTuned, waveSample } from '../mechanism/tune';
import { D, RoomBase, type HintTarget } from './RoomBase';
import { FONT } from '../ui/widgets';

interface DialView {
  id: string;
  i: number;
  /** Track from a to b (value 0 at a, 1 at b). */
  a: { x: number; y: number };
  b: { x: number; y: number };
  knob: Phaser.GameObjects.Container;
  wave: { x: number; y: number; w: number; h: number };
}

const COMB_NOTES = [523.25, 659.25, 783.99];

export class TuneRoom extends RoomBase<'tune'> {
  private dials: DialView[] = [];
  private deco!: Phaser.GameObjects.Graphics;
  private waves!: Phaser.GameObjects.Graphics;
  private t = 0;
  private lastSound = 0;
  private dragStart = 0;
  private wasTuned = false;

  constructor() {
    super('room-tune');
  }

  protected build(): void {
    this.dials = [];
    this.wasTuned = false;
    this.deco = this.add.graphics().setDepth(D.mech);
    this.waves = this.add.graphics().setDepth(D.mech + 1);
    const n = this.def.dials.length;
    const mode = this.def.mode;
    this.def.dials.forEach((d, i) => {
      const cx = n === 1 ? 640 : 640 + (i - (n - 1) / 2) * (mode === 'boiler' ? 520 : mode === 'radio' ? 360 : 200);
      let a: { x: number; y: number };
      let b: { x: number; y: number };
      let wave: DialView['wave'];
      if (mode === 'comb') {
        a = { x: cx - 90, y: 250 };
        b = { x: cx + 90, y: 250 };
        wave = { x: cx - 90, y: 140, w: 180, h: 60 };
      } else if (mode === 'radio') {
        a = { x: cx - 140, y: 470 };
        b = { x: cx + 140, y: 470 };
        wave = { x: 340, y: 180 + i * 0, w: 600, h: 150 };
      } else if (mode === 'boiler') {
        a = { x: cx, y: 500 };
        b = { x: cx, y: 180 };
        wave = { x: cx + (i === 0 ? 50 : -230), y: 260, w: 180, h: 110 };
      } else {
        a = { x: cx, y: 510 };
        b = { x: cx, y: 300 };
        wave = { x: cx - 80, y: 140, w: 160, h: 56 };
      }
      const knob = this.add.container(0, 0).setDepth(D.parts);
      const kg = this.add.graphics();
      kg.fillStyle(0x000000, 0.3);
      kg.fillCircle(3, 5, 30);
      kg.fillStyle(0x79503d, 1);
      kg.fillCircle(0, 0, 30);
      kg.fillStyle(mode === 'boiler' && i === 0 ? 0xe05a47 : mode === 'boiler' ? 0x3b7dd8 : 0xbca16a, 1);
      kg.fillCircle(0, 0, 25);
      kg.fillStyle(0xf4ebd5, 0.4);
      kg.fillCircle(-8, -9, 11);
      kg.lineStyle(2, CM.ink, 0.8);
      kg.strokeCircle(0, 0, 30);
      kg.lineStyle(1, CM.copperLight, 0.7);
      kg.strokeCircle(0, 0, 27);
      drawPatina(kg, -16, -16, 32, 32, i + 378, 1.7);
      knob.add(kg);
      knob.setSize(80, 80);
      knob.setInteractive({ draggable: true, useHandCursor: true });
      const view: DialView = { id: d.id, i, a, b, knob, wave };
      this.dials.push(view);
      this.placeKnob(view);
      knob.on('dragstart', () => {
        this.dragStart = this.state[d.id];
        this.idle = 0;
        sfx.pickUp();
      });
      knob.on('drag', (p: Phaser.Input.Pointer) => this.dragKnob(view, p.worldX, p.worldY));
      knob.on('dragend', () => this.releaseKnob(view));
    });
    if (mode === 'radio') {
      this.add.text(640, 520, '', { fontFamily: FONT, fontSize: '1px' });
    }
  }

  private placeKnob(v: DialView): void {
    const val = this.state[v.id];
    v.knob.setPosition(v.a.x + (v.b.x - v.a.x) * val, v.a.y + (v.b.y - v.a.y) * val);
  }

  private dragKnob(v: DialView, x: number, y: number): void {
    if (this.fixed) return;
    const dx = v.b.x - v.a.x;
    const dy = v.b.y - v.a.y;
    const len2 = dx * dx + dy * dy;
    const val = Phaser.Math.Clamp(((x - v.a.x) * dx + (y - v.a.y) * dy) / len2, 0, 1);
    // snap gently for Little Tinkers once close
    const d = this.def.dials[v.i];
    const snapped = this.style.snapOnHover && Math.abs(val - d.target) < d.tol * 1.6 ? d.target : val;
    this.state[v.id] = snapped;
    this.placeKnob(v);
    this.soundFor(v, snapped);
  }

  private soundFor(v: DialView, val: number): void {
    const now = this.time.now;
    if (now - this.lastSound < 110) return;
    this.lastSound = now;
    const d = this.def.dials[v.i];
    const cl = clarity(val, d.target, d.tol);
    switch (this.def.mode) {
      case 'comb':
        sfx.note(COMB_NOTES[v.i % 3] * Math.pow(2, (val - 0.5) * 0.7), 'pluck', 0.25);
        break;
      case 'radio':
        if (cl < 1) sfx.staticBurst(1 - cl * 0.8, 0.1);
        else sfx.hum(196, 0.2);
        break;
      case 'boiler':
        if (v.id === 'heat') sfx.hiss(0.1 + val * 0.2);
        else sfx.drip();
        break;
      case 'whistle':
        sfx.whistle(196 * Math.pow(2, val * 2), 0.18);
        break;
    }
  }

  private releaseKnob(v: DialView): void {
    const before = this.dragStart;
    const id = v.id;
    if (before === this.state[id]) return;
    const d = this.def.dials[v.i];
    if (dialTuned(this.state[id], d.target, d.tol)) {
      sfx.ding(1568);
      this.sparkleAt(v.knob.x, v.knob.y, 10);
    }
    this.act(() => {
      this.state[id] = before;
    });
    if (this.def.mode === 'radio' && this.def.dials.every((q) => dialTuned(this.state[q.id], q.target, q.tol)) && !this.wasTuned) {
      this.wasTuned = true;
      void speak('marigold', LINES['radio.harbour'].text, 'radio.harbour');
    }
  }

  protected refresh(): void {
    for (const v of this.dials) this.placeKnob(v);
  }

  protected tick(dt: number): void {
    this.t += dt;
    const g = this.deco;
    const w = this.waves;
    g.clear();
    w.clear();
    const mode = this.def.mode;
    for (const v of this.dials) {
      const d = this.def.dials[v.i];
      const val = this.state[v.id];
      const tuned = dialTuned(val, d.target, d.tol);
      // the track
      g.lineStyle(12, 0x342f29, 0.8);
      g.lineBetween(v.a.x, v.a.y, v.b.x, v.b.y);
      g.lineStyle(6, 0xb88a2c, 1);
      g.lineBetween(v.a.x, v.a.y, v.b.x, v.b.y);
      if (mode === 'boiler' || this.style.id === 'tinker') {
        // the green zone (shown on gauges; in Little Tinker on every dial)
        const z0 = d.target - d.tol;
        const z1 = d.target + d.tol;
        g.lineStyle(10, 0x51cf66, 0.85);
        g.lineBetween(v.a.x + (v.b.x - v.a.x) * z0, v.a.y + (v.b.y - v.a.y) * z0, v.a.x + (v.b.x - v.a.x) * z1, v.a.y + (v.b.y - v.a.y) * z1);
      }
      // the mode's machine
      if (mode === 'comb') {
        // one steel comb: a heavy back with a tapered tooth per note; a dashed outline shows the
        // straight tooth to aim for
        if (v.i === 0) {
          const xs = this.dials.map((q) => q.a.x + (q.b.x - q.a.x) * 0.5);
          const left = Math.min(...xs) - 70;
          const right = Math.max(...xs) + 70;
          g.fillStyle(0x000000, 0.3);
          g.fillRoundedRect(left + 4, 474, right - left, 44, 10);
          g.fillStyle(0x6c7a76, 1);
          g.fillRoundedRect(left, 468, right - left, 44, 10);
          g.fillStyle(0xc9d1cf, 1);
          g.fillRoundedRect(left + 6, 472, right - left - 12, 10, 5);
          for (const sx of [left + 18, right - 18]) {
            g.fillStyle(0x342f29, 1);
            g.fillCircle(sx, 494, 6);
          }
        }
        const tip = { x: v.knob.x, y: v.knob.y + 20 };
        const base = { x: v.a.x + (v.b.x - v.a.x) * 0.5, y: 470 };
        const ring = tuned ? Math.sin(this.t * 40) * 2 : 0;
        const straight = { x: v.a.x + (v.b.x - v.a.x) * d.target, y: tip.y };
        if (!tuned) {
          g.lineStyle(4, 0x342f29, 0.55);
          for (let k = 0; k < 10; k += 2) {
            const f0 = k / 10;
            const f1 = (k + 1) / 10;
            g.lineBetween(base.x + (straight.x - base.x) * f0, base.y + (straight.y - base.y) * f0, base.x + (straight.x - base.x) * f1, base.y + (straight.y - base.y) * f1);
          }
        }
        const tx = tip.x + ring;
        const len = Math.hypot(tx - base.x, tip.y - base.y) || 1;
        const nx = -(tip.y - base.y) / len;
        const ny = (tx - base.x) / len;
        const tooth = [
          new Phaser.Math.Vector2(base.x + nx * 16, base.y + ny * 16),
          new Phaser.Math.Vector2(tx + nx * 7, tip.y + ny * 7),
          new Phaser.Math.Vector2(tx - nx * 7, tip.y - ny * 7),
          new Phaser.Math.Vector2(base.x - nx * 16, base.y - ny * 16),
        ];
        g.fillStyle(0x4f5b58, 1);
        g.fillPoints(tooth.map((p) => new Phaser.Math.Vector2(p.x + 3, p.y + 3)), true);
        g.fillStyle(tuned ? 0xe9f3ee : 0xc9d1cf, 1);
        g.fillPoints(tooth, true);
        g.lineStyle(2, 0x4f5b58, 1);
        g.strokePoints(tooth, true, true);
      } else if (mode === 'whistle') {
        const h = 90 + v.i * 26;
        g.fillStyle(0xbca16a, 1);
        g.fillRoundedRect(v.a.x - 22, 270 - h, 44, h, 10);
        g.fillStyle(0x342f29, 1);
        g.fillRect(v.a.x - 14, 250, 28, 8);
        if (tuned) {
          g.fillStyle(0xffffff, 0.5);
          g.fillCircle(v.a.x + Math.sin(this.t * 3) * 6, 260 - h - ((this.t * 40) % 40), 12);
        }
      } else if (mode === 'boiler' && v.i === 0) {
        // the boiler: fire grows with heat, steam when both are in the green
        g.fillStyle(0xc8703f, 1);
        g.fillRoundedRect(520, 170, 240, 300, 60);
        g.fillStyle(0xf0a77a, 0.5);
        g.fillEllipse(580, 260, 50, 160);
        const fire = val;
        for (let k = 0; k < 6; k++) {
          g.fillStyle([0xff6b6b, 0xffa94d, 0xffd43b][k % 3], 0.8);
          g.fillEllipse(560 + k * 32, 470 - fire * 30 - Math.sin(this.t * 8 + k) * 6, 26, 30 + fire * 50);
        }
        const water = this.state[this.def.dials[1]?.id ?? 'water'] ?? 0.5;
        g.fillStyle(0x5fa8d3, 0.85);
        g.fillRoundedRect(560, 430 - water * 220, 160, water * 220, 20);
        if (this.def.dials.every((q) => dialTuned(this.state[q.id], q.target, q.tol))) {
          for (let k = 0; k < 4; k++) {
            g.fillStyle(0xffffff, 0.5);
            g.fillCircle(640 + Math.sin(this.t * 2 + k) * 30, 150 - ((this.t * 60 + k * 30) % 120), 20 + k * 4);
          }
        }
      }
      // the waves: yours over the golden ghost
      const W = v.wave;
      if (mode !== 'radio' || v.i === 0) {
        w.fillStyle(0x10151f, 0.85);
        w.fillRoundedRect(W.x, W.y, W.w, W.h, 10);
      }
      const drawWave = (value: number, col: number, alpha: number, noise: number, width: number) => {
        w.lineStyle(width, col, alpha);
        w.beginPath();
        for (let k = 0; k <= 60; k++) {
          const f = k / 60;
          const yy = W.y + W.h / 2 + waveSample(value, f, this.t, noise) * (W.h * 0.38);
          if (k === 0) w.moveTo(W.x + f * W.w, yy);
          else w.lineTo(W.x + f * W.w, yy);
        }
        w.strokePath();
      };
      if (mode === 'radio') {
        if (v.i === 0) {
          const avg = this.def.dials.reduce((s, q) => s + clarity(this.state[q.id], q.target, q.tol), 0) / this.def.dials.length;
          const mix = this.def.dials.reduce((s, q) => s + this.state[q.id], 0) / this.def.dials.length;
          const tgt = this.def.dials.reduce((s, q) => s + q.target, 0) / this.def.dials.length;
          drawWave(tgt, 0xf1d391, 0.5, 0, 6);
          drawWave(mix, avg >= 1 ? 0x8ce99a : 0x74c0fc, 1, 1 - avg, 3);
          // the tuning scale with a needle
          g.fillStyle(0xe9dcc0, 1);
          g.fillRoundedRect(340, 360, 600, 50, 10);
          for (let k = 0; k <= 20; k++) {
            g.lineStyle(2, 0x3b260b, 0.7);
            g.lineBetween(350 + k * 29, 370, 350 + k * 29, k % 5 ? 382 : 392);
          }
          const nx = 350 + this.state[this.def.dials[0].id] * 580;
          g.lineStyle(4, 0xd64541, 1);
          g.lineBetween(nx, 362, nx, 406);
        }
      } else {
        drawWave(d.target, 0xf1d391, 0.5, 0, 6);
        drawWave(val, tuned ? 0x8ce99a : 0x74c0fc, 1, 1 - clarity(val, d.target, d.tol), 3);
      }
      if (this.style.numbers) {
        const pitch = mode === 'whistle' ? 196 * Math.pow(2, val * 2) : mode === 'comb' ? COMB_NOTES[v.i % 3] * Math.pow(2, (val - 0.5) * 0.7) : dialPitch(val);
        w.fillStyle(0x000000, 0);
        void pitch;
      }
    }
  }

  protected hintTarget(): HintTarget | null {
    for (const v of this.dials) {
      const d = this.def.dials[v.i];
      if (!dialTuned(this.state[v.id], d.target, d.tol)) {
        return { from: { x: v.knob.x, y: v.knob.y }, to: { x: v.a.x + (v.b.x - v.a.x) * d.target, y: v.a.y + (v.b.y - v.a.y) * d.target } };
      }
    }
    return null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    for (const v of this.dials) {
      const d = this.def.dials[v.i];
      if (dialTuned(this.state[v.id], d.target, d.tol)) continue;
      g.lineStyle(4, 0xf4ebd5, alpha + 0.2);
      g.strokeCircle(v.a.x + (v.b.x - v.a.x) * d.target, v.a.y + (v.b.y - v.a.y) * d.target, 30);
    }
  }

  protected solutionSteps(): number {
    return this.def.dials.filter((d) => !dialTuned(d.start, d.target, d.tol)).length;
  }
}
