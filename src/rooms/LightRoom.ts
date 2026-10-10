/**
 * Light rooms (GDD §8.10): lamps, mirrors, prisms, colour filters and lenses
 * on a grid. Light travels in straight lines; sensors bloom when the right
 * beam (colour, focus) reaches them. Colours are double-coded with shapes.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { CM, drawPatina } from '../art/copperMoss';
import { etchedPlate } from '../art/finish';
import { star } from '../art/Kip';
import { traceLight, type Color, type LightKind, type LightResult, type LightTile } from '../mechanism/light';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';

const BEAM: Record<Color, number> = { w: 0xfff8d0, r: 0xff6b6b, g: 0x69db7c, b: 0x74c0fc };

interface Optic {
  kind: LightKind;
  color?: Color;
  rot: number;
  obj: Phaser.GameObjects.Container;
  g: Phaser.GameObjects.Graphics;
  home: { x: number; y: number };
  cell: number | null;
}

export class LightRoom extends RoomBase<'light'> {
  private S = 100;
  private ox = 0;
  private oy = 0;
  private tilesG!: Phaser.GameObjects.Graphics;
  private raysG!: Phaser.GameObjects.Graphics;
  private optics: Optic[] = [];
  private res?: LightResult;
  private lastSat = 0;
  private t = 0;

  constructor() {
    super('room-light');
  }

  protected build(): void {
    this.optics = [];
    this.lastSat = 0;
    this.res = undefined;
    const g0 = this.state;
    this.S = Math.min(112, Math.floor(920 / g0.cols), Math.floor(420 / g0.rows));
    this.ox = 640 - (g0.cols * this.S) / 2;
    this.oy = 112 + (430 - g0.rows * this.S) / 2;
    const board = this.add.graphics().setDepth(D.back + 1);
    etchedPlate(board, this.ox - 14, this.oy - 14, g0.cols * this.S + 28, g0.rows * this.S + 28, CM.tealDark, 1, 878);
    for (let y = 0; y < g0.rows; y++) for (let x = 0; x < g0.cols; x++) {
      board.fillStyle((x + y) % 2 ? 0x344f4b : 0x3e5c56, 0.9);
      board.fillRect(this.ox + x * this.S, this.oy + y * this.S, this.S, this.S);
      board.lineStyle(0.8, CM.cream, 0.08);
      board.strokeRect(this.ox + x * this.S + 2, this.oy + y * this.S + 2, this.S - 4, this.S - 4);
    }
    drawPatina(board, this.ox, this.oy, g0.cols * this.S, g0.rows * this.S, 166, 0.75);
    this.raysG = this.add.graphics().setDepth(D.mech).setBlendMode(Phaser.BlendModes.ADD);
    this.tilesG = this.add.graphics().setDepth(D.mech + 1);
    g0.cells.forEach((t, i) => {
      if (!t || !t.rotatable) return;
      const c = this.center(i);
      const z = this.add.zone(c.x, c.y, this.S, this.S).setInteractive({ useHandCursor: true }).setDepth(D.mech + 3);
      z.on('pointerup', () => this.flip(i));
    });
    const spots = this.traySpots(this.def.tray.length);
    this.def.tray.forEach((tok, i) => {
      const kind = tok[0] as LightKind;
      const color = (tok[1] as Color | undefined) ?? undefined;
      const obj = this.add.container(spots[i].x, spots[i].y).setDepth(D.trayPart).setScale(0.72);
      const g = this.add.graphics();
      obj.add(g);
      obj.setSize(this.S, this.S);
      const o: Optic = { kind, color, rot: 0, obj, g, home: spots[i], cell: null };
      this.optics.push(o);
      this.drawOptic(g, { kind, rot: 0, rotatable: false, slot: false, color }, 0, 0, -1);
      this.enableDrag({
        obj,
        restScale: 0.72,
        targets: () => this.slots(),
        accepts: (t) => this.style.id !== 'tinker' || this.state.cells[Number(t.id)]?.sol?.kind === kind,
        pick: () => this.lift(o),
        drop: (t) => this.drop(o, t),
      });
      obj.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.getDistance() < 8 && o.cell !== null && o.kind === 'R') this.turnOptic(o);
      });
    });
  }

  private center(i: number): { x: number; y: number } {
    const cols = this.state.cols;
    return { x: this.ox + (i % cols) * this.S + this.S / 2, y: this.oy + Math.floor(i / cols) * this.S + this.S / 2 };
  }

  private slots(): SnapTarget[] {
    const out: SnapTarget[] = [];
    this.state.cells.forEach((t, i) => {
      if (t && (t.kind === '_' || this.optics.some((o) => o.cell === i))) out.push({ id: String(i), ...this.center(i) });
    });
    return out;
  }

  private sync(): void {
    this.state.cells.forEach((t, i) => {
      if (!t) return;
      const slot = t.kind === '_' || t.slot;
      if (!slot) return;
      const o = this.optics.find((q) => q.cell === i);
      if (o) {
        t.kind = o.kind;
        t.rot = o.rot;
        if (o.color) t.color = o.color;
        t.slot = true;
      } else if (t.slot || t.kind === '_') {
        t.kind = '_';
        t.rot = 0;
        t.slot = true;
      }
    });
  }

  private lift(o: Optic): void {
    if (o.cell === null) return;
    const was = o.cell;
    o.cell = null;
    this.sync();
    this.evaluate();
    this.undoStack.push(() => {
      o.cell = was;
      this.sync();
    });
  }

  private drop(o: Optic, t: SnapTarget | null): void {
    if (!t) return this.floatHome(o.obj, o.home, 0.72);
    const cell = Number(t.id);
    const slot = this.state.cells[cell]!;
    if (this.style.id === 'tinker' && slot.sol?.kind !== o.kind) return this.refuse(o.obj, t, o.home, 0.72);
    const prev = this.optics.find((q) => q !== o && q.cell === cell);
    if (prev) {
      prev.cell = null;
      this.floatHome(prev.obj, prev.home, 0.72);
    }
    o.cell = cell;
    const oldRot = o.rot;
    if (this.style.autoRotate && slot.sol?.kind === o.kind && slot.sol.rot !== undefined) o.rot = slot.sol.rot;
    this.redrawOptic(o);
    this.tweens.killTweensOf(o.obj);
    this.tweens.add({ targets: o.obj, x: t.x, y: t.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    o.obj.setDepth(D.mech + 2);
    this.sync();
    this.clunkAt(t.x, t.y);
    this.evaluate();
    this.act(() => {
      o.cell = null;
      o.rot = oldRot;
      if (prev) prev.cell = cell;
      this.sync();
    });
  }

  private turnOptic(o: Optic): void {
    if (this.fixed) return;
    o.rot = 1 - o.rot;
    this.redrawOptic(o);
    sfx.ratchet(1);
    this.sync();
    this.evaluate();
    this.act(() => {
      o.rot = 1 - o.rot;
      this.sync();
    });
  }

  private flip(i: number): void {
    if (this.fixed) return;
    const t = this.state.cells[i]!;
    t.rot = 1 - (t.rot % 2);
    sfx.ratchet(1);
    this.evaluate();
    this.act(() => (t.rot = 1 - (t.rot % 2)));
  }

  private redrawOptic(o: Optic): void {
    o.g.clear();
    this.drawOptic(o.g, { kind: o.kind, rot: o.rot, rotatable: false, slot: true, color: o.color }, 0, 0, -1);
  }

  protected refresh(): void {
    for (const o of this.optics) o.cell = null;
    this.state.cells.forEach((t, i) => {
      if (!t?.slot || t.kind === '_') return;
      const o = this.optics.find((q) => q.cell === null && q.kind === t.kind && (q.kind !== 'F' || q.color === t.color));
      if (o) {
        o.cell = i;
        o.rot = t.rot;
      }
    });
    for (const o of this.optics) {
      this.redrawOptic(o);
      this.tweens.killTweensOf(o.obj);
      if (o.cell !== null) o.obj.setPosition(this.center(o.cell).x, this.center(o.cell).y).setScale(1).setDepth(D.mech + 2);
      else o.obj.setPosition(o.home.x, o.home.y).setScale(0.72).setDepth(D.trayPart);
    }
    this.sync();
    this.evaluate();
  }

  private evaluate(): void {
    this.res = traceLight(this.state);
    const sat = this.res.satisfied.size;
    if (sat > this.lastSat) {
      sfx.note(1046 + sat * 130, 'chime');
      sfx.sparkle();
    }
    this.lastSat = sat;
    this.drawTiles();
  }

  private drawTiles(): void {
    const g = this.tilesG;
    g.clear();
    this.state.cells.forEach((t, i) => {
      if (!t) return;
      const c = this.center(i);
      if (t.kind === '_' || (t.slot && this.optics.some((o) => o.cell === i))) {
        if (t.kind === '_') {
          g.lineStyle(3, 0xf4ebd5, 0.45);
          g.strokeRoundedRect(c.x - this.S / 2 + 8, c.y - this.S / 2 + 8, this.S - 16, this.S - 16, 10);
        }
        return;
      }
      this.drawOptic(g, t, c.x, c.y, i);
    });
  }

  private drawOptic(g: Phaser.GameObjects.Graphics, t: LightTile, x: number, y: number, cell: number): void {
    const S = this.S;
    const h = S / 2;
    switch (t.kind) {
      case '#':
        g.fillStyle(0x3d4a6b, 1);
        g.fillRoundedRect(x - h + 6, y - h + 6, S - 12, S - 12, 10);
        g.fillStyle(0x2c3550, 1);
        g.fillRect(x - h + 10, y - 3, S - 20, 6);
        break;
      case 'A': {
        g.fillStyle(0xb88a2c, 1);
        g.fillCircle(x, y, S * 0.3);
        g.fillStyle(0xfff3b0, 1);
        g.fillCircle(x, y, S * 0.2);
        const dx = [0, 1, 0, -1][t.rot];
        const dy = [-1, 0, 1, 0][t.rot];
        g.fillStyle(0xfff3b0, 1);
        g.fillTriangle(x + dx * S * 0.42, y + dy * S * 0.42, x + dx * S * 0.25 - dy * 12, y + dy * S * 0.25 + dx * 12, x + dx * S * 0.25 + dy * 12, y + dy * S * 0.25 - dx * 12);
        break;
      }
      case 'R': {
        const s = t.rot % 2 === 0 ? 1 : -1; // "/" or "\"
        g.lineStyle(S * 0.12, 0x6c7a89, 1);
        g.lineBetween(x - h * 0.7, y + h * 0.7 * s, x + h * 0.7, y - h * 0.7 * s);
        g.lineStyle(S * 0.05, 0xe6f0f8, 1);
        g.lineBetween(x - h * 0.66, y + h * 0.62 * s, x + h * 0.66, y - h * 0.74 * s);
        g.fillStyle(0xb88a2c, 1);
        g.fillCircle(x, y, 6);
        if (t.rotatable && cell >= 0 && !this.fixed) {
          g.lineStyle(2, 0xffffff, 0.35);
          g.strokeCircle(x, y, h * 0.85);
        }
        break;
      }
      case 'P':
        g.fillStyle(0xd0ebff, 0.85);
        g.fillTriangle(x, y - h * 0.65, x + h * 0.65, y + h * 0.5, x - h * 0.65, y + h * 0.5);
        g.lineStyle(3, 0xffffff, 0.8);
        g.strokeTriangle(x, y - h * 0.65, x + h * 0.65, y + h * 0.5, x - h * 0.65, y + h * 0.5);
        break;
      case 'N':
        g.fillStyle(0xb2f2ff, 0.65);
        g.fillEllipse(x, y, S * 0.24, S * 0.78);
        g.lineStyle(3, 0xbca16a, 1);
        g.strokeEllipse(x, y, S * 0.24, S * 0.78);
        break;
      case 'F': {
        const col = BEAM[t.color ?? 'r'];
        g.fillStyle(col, 0.6);
        g.fillRoundedRect(x - S * 0.12, y - h * 0.75, S * 0.24, S * 0.75, 6);
        g.lineStyle(3, 0x554638, 1);
        g.strokeRoundedRect(x - S * 0.12, y - h * 0.75, S * 0.24, S * 0.75, 6);
        this.colorMark(g, t.color ?? 'r', x, y, 7);
        break;
      }
      case 'D': {
        const ok = cell >= 0 && this.res?.satisfied.has(cell);
        const bloom = ok ? 1 : 0;
        const col = t.color ? BEAM[t.color] : 0xf1d391;
        g.fillStyle(0x2e5e3a, 1);
        g.fillRect(x - 3, y, 6, h * 0.8);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + this.t * (ok ? 0.8 : 0);
          g.fillStyle(col, ok ? 1 : 0.35);
          g.fillEllipse(x + Math.cos(a) * S * (0.12 + bloom * 0.1), y + Math.sin(a) * S * (0.12 + bloom * 0.1), S * (0.14 + bloom * 0.08), S * (0.14 + bloom * 0.08));
        }
        g.fillStyle(ok ? 0xfff3b0 : 0x60736d, 1);
        g.fillCircle(x, y, S * 0.11);
        if (t.color) this.colorMark(g, t.color, x, y, 6, 0x342f29);
        if (t.focused) {
          g.lineStyle(2, 0xffffff, 0.8);
          g.strokeCircle(x, y, S * 0.38);
          g.strokeCircle(x, y, S * 0.3);
        }
        break;
      }
    }
  }

  /** Colour + shape, so colours read for colour-blind players (GDD §25.2). */
  private colorMark(g: Phaser.GameObjects.Graphics, c: Color, x: number, y: number, r: number, ink = 0xffffff): void {
    g.fillStyle(ink, 0.9);
    if (c === 'r') g.fillCircle(x, y, r * 0.7);
    else if (c === 'g') g.fillTriangle(x, y - r, x + r, y + r * 0.7, x - r, y + r * 0.7);
    else if (c === 'b') g.fillRect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4);
  }

  protected hintTarget(): HintTarget | null {
    const cells = this.state.cells;
    for (let i = 0; i < cells.length; i++) {
      const t = cells[i];
      if (!t?.sol?.kind) continue;
      const here = this.optics.find((o) => o.cell === i);
      if (here && here.kind === t.sol.kind && (t.sol.rot === undefined || here.rot % 2 === t.sol.rot % 2)) continue;
      const o = this.optics.find((q) => q.kind === t.sol!.kind && (q.cell === null || q.cell === i) && (!t.sol!.color || q.color === t.sol!.color));
      return { from: o ? { x: o.obj.x, y: o.obj.y } : undefined, to: this.center(i) };
    }
    for (let i = 0; i < cells.length; i++) {
      const t = cells[i];
      if (t?.rotatable && t.sol?.rot !== undefined && t.rot % 2 !== t.sol.rot % 2) return { to: this.center(i) };
    }
    return null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    this.state.cells.forEach((t, i) => {
      if (!t || t.kind !== '_' || !t.sol?.kind) return;
      const c = this.center(i);
      g.lineStyle(4, 0xf4ebd5, alpha);
      if (t.sol.kind === 'R') {
        const s = (t.sol.rot ?? 0) % 2 === 0 ? 1 : -1;
        g.lineBetween(c.x - this.S * 0.35, c.y + this.S * 0.35 * s, c.x + this.S * 0.35, c.y - this.S * 0.35 * s);
      } else g.strokeCircle(c.x, c.y, this.S * 0.3);
    });
  }

  protected drawBlueprint(g: Phaser.GameObjects.Graphics, pulse: number): void {
    if (!this.res) return;
    for (const s of this.res.segments) {
      const a = this.px(s.x1, s.y1);
      const b = this.px(s.x2, s.y2);
      g.lineStyle(6, 0xfff0a0, 0.9);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    this.state.cells.forEach((t, i) => {
      if (t?.kind === 'D' && !this.res!.satisfied.has(i)) {
        const c = this.center(i);
        g.lineStyle(3, 0xffffff, 0.4 + pulse * 0.5);
        g.strokeCircle(c.x, c.y, this.S * 0.35 + pulse * 8);
      }
    });
  }

  private px(cx: number, cy: number): { x: number; y: number } {
    return { x: this.ox + cx * this.S + this.S / 2, y: this.oy + cy * this.S + this.S / 2 };
  }

  protected solutionSteps(): number {
    return this.state.cells.filter((t) => t?.sol).length;
  }

  protected tick(dt: number): void {
    this.t += dt;
    const g = this.raysG;
    g.clear();
    if (!this.res) return;
    for (const s of this.res.segments) {
      const a = this.px(s.x1, s.y1);
      const b = this.px(s.x2, s.y2);
      const col = BEAM[s.color];
      const w = s.focused ? 5 : 10;
      g.lineStyle(w * 2.4, col, 0.12);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(w, col, s.focused ? 0.95 : 0.6);
      g.lineBetween(a.x, a.y, b.x, b.y);
      // light motes travelling along the beam
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let k = 0; k < len / 60; k++) {
        const f = ((this.t * 120 + k * 60) % len) / len;
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 2.5);
      }
    }
    if (this.res.satisfied.size) {
      for (const i of this.res.satisfied) {
        const c = this.center(i);
        g.fillStyle(0xfff3b0, 0.08 + Math.sin(this.t * 4) * 0.04);
        g.fillCircle(c.x, c.y, this.S * 0.6);
      }
      if (Math.random() < 0.02) this.drawTiles();
    }
    void star;
  }
}
