/**
 * Chain reactions and Big Fixes (GDD §17). A row of linked mechanisms passes
 * a signal along: turning, pushing, pulling, sparks, steam, water, light,
 * marbles, sound. Fill the missing links, press Run, and watch the glow
 * travel — it pools and sparkles where the chain breaks.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { drawPart } from '../art/parts';
import { CM } from '../art/copperMoss';
import { rivet } from '../art/finish';
import { LINK_PARTS, runChain, type ChainRun, type Signal } from '../mechanism/chain';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { FONT, roundButton } from '../ui/widgets';

export const SIGNAL_COLOR: Record<Signal, number> = {
  turn: 0xffd43b,
  push: 0xff8787,
  pull: 0xc8b28a,
  spark: 0x74c0fc,
  steam: 0xe9ecef,
  water: 0x4dabf7,
  light: 0xfff3b0,
  marble: 0xb197fc,
  sound: 0x8ce99a,
};
const SIGNAL_GLYPH: Record<Signal, string> = { turn: '⟳', push: '➜', pull: '⇠', spark: 'ϟ', steam: '☁', water: '💧', light: '☀', marble: '●', sound: '♪' };

interface LinkPartView {
  id: string;
  obj: Phaser.GameObjects.Container;
  home: { x: number; y: number };
  at: number | null;
}

export class ChainRoom extends RoomBase<'chain'> {
  private pos: Array<{ x: number; y: number }> = [];
  private parts: LinkPartView[] = [];
  private stationsG!: Phaser.GameObjects.Graphics;
  private orbG!: Phaser.GameObjects.Graphics;
  private iconsG!: Phaser.GameObjects.Graphics;
  private run: ChainRun | null = null;
  private runT = -1;
  private wobble = new Map<number, number>();
  private t = 0;
  private card = 104;

  constructor() {
    super('room-chain');
  }

  protected build(): void {
    this.parts = [];
    this.pos = [];
    this.run = null;
    this.runT = -1;
    this.wobble = new Map();
    this.liveCheck = false;
    const n = this.def.links.length;
    const rows = n > 8 ? 2 : 1;
    const perRow = Math.ceil(n / rows);
    this.card = Math.min(112, Math.floor(900 / perRow) - 10);
    const gap = this.card + 12;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / perRow);
      let k = i % perRow;
      if (r === 1) k = perRow - 1 - k; // snake back on the second row
      this.pos.push({ x: 640 + (k - (perRow - 1) / 2) * gap, y: rows === 1 ? 320 : 220 + r * 190 });
    }
    this.stationsG = this.add.graphics().setDepth(D.mech);
    this.iconsG = this.add.graphics().setDepth(D.mech + 1);
    this.orbG = this.add.graphics().setDepth(D.mech + 2).setBlendMode(Phaser.BlendModes.ADD);
    const spots = this.traySpots(this.def.tray.length);
    this.def.tray.forEach((id, i) => {
      const obj = this.add.container(spots[i].x, spots[i].y).setDepth(D.trayPart).setScale(0.68);
      const g = this.add.graphics();
      this.drawCard(g, id, 0, 0, true);
      obj.add(g);
      obj.setSize(this.card, this.card);
      const v: LinkPartView = { id, obj, home: spots[i], at: null };
      this.parts.push(v);
      this.enableDrag({
        obj,
        restScale: 0.68,
        targets: () => this.def.links.map((l, k) => (l.slot ? { id: String(k), ...this.pos[k] } : null)).filter((t): t is SnapTarget => !!t),
        accepts: (t) => this.style.id !== 'tinker' || this.def.links[Number(t.id)].sol === id,
        pick: () => this.lift(v),
        drop: (t) => this.drop(v, t),
      });
    });
    roundButton(this, 1180, 600, '▶', () => this.start(), { r: 48, fontSize: 44, color: 0xa0a477, say: 'Run!' }).setDepth(D.hud);
    if (this.style.numbers) {
      // a little legend of signal kinds
      const sigs = [...new Set(this.def.links.map((l) => (l.part ? LINK_PARTS[l.part] : undefined)).flatMap((p) => [p?.in, p?.out]).filter(Boolean))] as Signal[];
      sigs.forEach((s, i) => {
        this.add
          .text(240 + i * 110, 120, `${SIGNAL_GLYPH[s]} ${s}`, { fontFamily: FONT, fontSize: '16px', color: '#f4ebd5', backgroundColor: '#342f29cc', padding: { x: 6, y: 3 } })
          .setOrigin(0.5)
          .setDepth(D.hud - 1);
      });
    }
  }

  /** A link card: the part, with its in and out ports coloured (and shaped) by signal. */
  private drawCard(g: Phaser.GameObjects.Graphics, id: string, x: number, y: number, drawer = false): void {
    const s = this.card;
    const p = LINK_PARTS[id];
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(x - s / 2 + 3, y - s / 2 + 5, s, s, 14);
    g.fillStyle(drawer ? 0xe9dcc0 : 0xf4ebd5, 1);
    g.fillRoundedRect(x - s / 2, y - s / 2, s, s, 14);
    g.lineStyle(1.8, CM.copperDark, 0.95);
    g.strokeRoundedRect(x - s / 2, y - s / 2, s, s, 14);
    g.lineStyle(0.7, CM.ink, 0.18);
    for (let k = 0; k < 5; k++) g.lineBetween(x - s / 2 + 9 + k * 8, y + s / 2 - 7, x - s / 2 + 14 + k * 8, y + s / 2 - 15);
    rivet(g, x - s / 2 + 9, y - s / 2 + 9, 2);
    rivet(g, x + s / 2 - 9, y + s / 2 - 9, 2);
    drawPart(g, id, x, y - 4, s / 120);
    if (p?.in) this.port(g, x - s / 2, y, p.in);
    if (p?.out) this.port(g, x + s / 2, y, p.out);
  }

  private port(g: Phaser.GameObjects.Graphics, x: number, y: number, sig: Signal): void {
    g.fillStyle(0x342f29, 1);
    g.fillCircle(x, y, 13);
    g.fillStyle(SIGNAL_COLOR[sig], 1);
    g.fillCircle(x, y, 10);
    // shape code (reads without colour)
    g.fillStyle(0x342f29, 0.8);
    const i = (['turn', 'push', 'pull', 'spark', 'steam', 'water', 'light', 'marble', 'sound'] as Signal[]).indexOf(sig);
    if (i % 3 === 0) g.fillCircle(x, y, 3.5);
    else if (i % 3 === 1) g.fillRect(x - 3.5, y - 3.5, 7, 7);
    else g.fillTriangle(x, y - 5, x + 5, y + 4, x - 5, y + 4);
  }

  private placedAt(i: number): string | undefined {
    return this.def.links[i].part ?? this.parts.find((p) => p.at === i)?.id;
  }

  private sync(): void {
    const placed: Record<number, string | undefined> = {};
    this.def.links.forEach((l, i) => {
      if (l.slot) placed[i] = this.parts.find((p) => p.at === i)?.id;
    });
    this.state = placed;
  }

  private lift(v: LinkPartView): void {
    if (v.at === null) return;
    const was = v.at;
    v.at = null;
    this.sync();
    this.run = null;
    this.undoStack.push(() => {
      v.at = was;
      this.sync();
    });
  }

  private drop(v: LinkPartView, t: SnapTarget | null): void {
    if (!t) return this.floatHome(v.obj, v.home, 0.68);
    const i = Number(t.id);
    if (this.style.id === 'tinker' && this.def.links[i].sol !== v.id) return this.refuse(v.obj, t, v.home, 0.68);
    const prev = this.parts.find((q) => q !== v && q.at === i);
    if (prev) {
      prev.at = null;
      this.floatHome(prev.obj, prev.home, 0.68);
    }
    v.at = i;
    this.tweens.add({ targets: v.obj, x: t.x, y: t.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    v.obj.setDepth(D.mech + 3);
    this.sync();
    this.run = null;
    this.clunkAt(t.x, t.y);
    this.act(() => {
      v.at = null;
      if (prev) prev.at = i;
      this.sync();
    });
  }

  protected refresh(): void {
    for (const p of this.parts) p.at = null;
    for (const [k, id] of Object.entries(this.state)) {
      if (!id) continue;
      const p = this.parts.find((q) => q.at === null && q.id === id);
      if (p) p.at = Number(k);
    }
    for (const p of this.parts) {
      if (p.at !== null) p.obj.setPosition(this.pos[p.at].x, this.pos[p.at].y).setScale(1).setDepth(D.mech + 3);
      else p.obj.setPosition(p.home.x, p.home.y).setScale(0.68).setDepth(D.trayPart);
    }
    this.sync();
  }

  private start(): void {
    if (this.runT >= 0 || this.fixed) return;
    this.run = runChain(this.def.links, this.state);
    this.runT = 0;
    this.moves++;
    this.idle = 0;
  }

  protected afterSolutionApplied(): void {
    this.start();
  }

  private soundFor(i: number): void {
    const id = this.placedAt(i);
    const fam = id ? LINK_PARTS[id]?.family : undefined;
    switch (fam) {
      case 'gears':
        sfx.tick(1.1);
        break;
      case 'levers':
        sfx.ratchet(2);
        break;
      case 'springs':
        sfx.sproing();
        break;
      case 'pendulums':
        sfx.tock();
        break;
      case 'music':
        sfx.note(784, 'chime', 0.4);
        break;
      case 'tracks':
        sfx.chug();
        break;
      case 'circuits':
        sfx.zap();
        break;
      case 'pipes':
        sfx.hiss(0.3);
        break;
      case 'logic':
        sfx.marble();
        break;
      case 'light':
        sfx.sparkle();
        break;
    }
  }

  protected tick(dt: number): void {
    this.t += dt;
    const sg = this.stationsG;
    const ig = this.iconsG;
    const og = this.orbG;
    sg.clear();
    ig.clear();
    og.clear();
    // connectors between stations
    for (let i = 0; i + 1 < this.pos.length; i++) {
      const a = this.pos[i];
      const b = this.pos[i + 1];
      sg.lineStyle(10, 0x342f29, 0.6);
      sg.lineBetween(a.x, a.y, b.x, b.y);
      sg.lineStyle(5, 0xb88a2c, 1);
      sg.lineBetween(a.x, a.y, b.x, b.y);
    }
    this.def.links.forEach((l, i) => {
      const p = this.pos[i];
      const w = this.wobble.get(i) ?? 0;
      if (w > 0) this.wobble.set(i, w - dt);
      const ox = w > 0 ? Math.sin(this.t * 40) * 4 : 0;
      if (l.part) this.drawCard(ig, l.part, p.x + ox, p.y);
      else if (!this.parts.some((q) => q.at === i)) {
        ig.lineStyle(4, 0xf4ebd5, 0.6);
        ig.strokeRoundedRect(p.x - this.card / 2, p.y - this.card / 2, this.card, this.card, 14);
      }
      if (i === this.def.links.length - 1) {
        // the goal glows when the chain completes
        ig.lineStyle(4, 0xf1d391, 0.5 + Math.sin(this.t * 3) * 0.3);
        ig.strokeRoundedRect(p.x - this.card / 2 - 6, p.y - this.card / 2 - 6, this.card + 12, this.card + 12, 18);
      }
    });
    if (this.runT >= 0 && this.run) {
      const before = Math.floor(this.runT);
      this.runT += dt * 1.6;
      const k = Math.floor(this.runT);
      const run = this.run;
      if (k !== before && k <= run.reached) {
        this.wobble.set(k, 0.5);
        this.soundFor(k);
      }
      const seg = Math.min(k, run.reached);
      const f = k >= run.reached ? 1 : this.runT - k;
      const a = this.pos[Math.max(0, seg)];
      const b = this.pos[Math.min(this.pos.length - 1, seg + 1)];
      const sig = run.signals[Math.min(seg, run.signals.length - 1)] ?? 'turn';
      const ox = k >= run.reached ? this.pos[run.reached].x : a.x + (b.x - a.x) * f;
      const oy = k >= run.reached ? this.pos[run.reached].y : a.y + (b.y - a.y) * f;
      og.fillStyle(SIGNAL_COLOR[sig], 0.35);
      og.fillCircle(ox, oy, 26);
      og.fillStyle(0xffffff, 0.9);
      og.fillCircle(ox, oy, 10);
      if (k >= run.reached + 1.2) {
        this.runT = -1;
        if (run.ok) this.onFixed();
        else {
          this.wobble.set(run.reached, 1.2);
          sfx.nuhUh();
          this.kip.shrug();
          this.sparkleAt(this.pos[run.reached].x, this.pos[run.reached].y, 14);
        }
      }
    }
    if (this.fixed) {
      for (const p of this.pos) {
        og.fillStyle(0xf1d391, 0.12 + Math.sin(this.t * 4 + p.x) * 0.06);
        og.fillCircle(p.x, p.y, this.card * 0.7);
      }
    }
  }

  protected hintTarget(): HintTarget | null {
    for (let i = 0; i < this.def.links.length; i++) {
      const l = this.def.links[i];
      if (!l.slot) continue;
      if (this.state[i] === l.sol) continue;
      const p = this.parts.find((q) => q.id === l.sol && q.at !== i);
      return { from: p ? { x: p.obj.x, y: p.obj.y } : undefined, to: this.pos[i] };
    }
    return { to: { x: 1180, y: 600 } };
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    this.def.links.forEach((l, i) => {
      if (!l.slot || this.state[i]) return;
      g.fillStyle(0xf4ebd5, alpha * 0.4);
      g.fillRoundedRect(this.pos[i].x - this.card / 2, this.pos[i].y - this.card / 2, this.card, this.card, 14);
    });
  }

  protected drawBlueprint(g: Phaser.GameObjects.Graphics, pulse: number): void {
    const r = runChain(this.def.links, this.state);
    for (let i = 0; i < r.reached; i++) {
      g.lineStyle(6, 0xfff0a0, 0.9);
      g.lineBetween(this.pos[i].x, this.pos[i].y, this.pos[i + 1].x, this.pos[i + 1].y);
    }
    if (!r.ok) {
      const p = this.pos[r.reached];
      g.fillStyle(0xd3a278, 0.3 + pulse * 0.4);
      g.fillCircle(p.x, p.y, 30 + pulse * 14);
    }
  }

  protected solutionSteps(): number {
    return this.def.links.filter((l) => l.slot).length + 1;
  }
}
