/**
 * Tile-grid rooms (GDD §8.6–8.8): pipes & steam, wires & circuits, and toy
 * train tracks share one grid. Drop drawer pieces into gaps, tap pieces to
 * turn them, tap valves, switches and points. Water and sparks flow live;
 * trains run when you press Go.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { CM } from '../art/copperMoss';
import { etchedPlate } from '../art/finish';
import {
  channels,
  cloneGrid,
  ports,
  simulateTrains,
  solveCircuit,
  solvePipes,
  trainsSucceed,
  type CircuitResult,
  type Dir,
  type PipeResult,
  type Tile,
  type TileKind,
  type TrainRun,
} from '../mechanism/flow';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';
import { roundButton, FONT } from '../ui/widgets';

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const STATION_COLORS = [0xe05a47, 0x3b7dd8, 0x2e9b5f, 0xf2a33a, 0x8e5cc4];

interface Part {
  kind: TileKind;
  rot: number;
  obj: Phaser.GameObjects.Container;
  g: Phaser.GameObjects.Graphics;
  home: { x: number; y: number };
  cell: number | null;
}

export class FlowRoom extends RoomBase<'flow'> {
  private S = 100;
  private ox = 0;
  private oy = 0;
  private tilesG!: Phaser.GameObjects.Graphics;
  private liveG!: Phaser.GameObjects.Graphics;
  private trainG!: Phaser.GameObjects.Graphics;
  private parts: Part[] = [];
  private pipe?: PipeResult;
  private circ?: CircuitResult;
  private runs: TrainRun[] | null = null;
  private runT = 0;
  private running = false;
  private flowT = 0;
  private stations = new Map<string, number>();
  private ringing = 0;

  constructor() {
    super('room-flow');
  }

  protected build(): void {
    this.parts = [];
    this.runs = null;
    this.running = false;
    this.stations = new Map();
    this.pipe = undefined;
    this.circ = undefined;
    this.ringing = 0;
    this.liveCheck = this.def.family !== 'tracks';
    const g0 = this.state;
    this.S = Math.min(118, Math.floor(920 / g0.cols), Math.floor(420 / g0.rows));
    this.ox = 640 - (g0.cols * this.S) / 2;
    this.oy = 112 + (430 - g0.rows * this.S) / 2;
    // board
    const board = this.add.graphics().setDepth(D.back + 1);
    etchedPlate(board, this.ox - 14, this.oy - 14, g0.cols * this.S + 28, g0.rows * this.S + 28,
      this.def.family === 'tracks' ? CM.mossDark : this.def.family === 'circuit' ? CM.woodDark : CM.tealDark, 0.93, 345);
    this.tilesG = this.add.graphics().setDepth(D.mech);
    this.liveG = this.add.graphics().setDepth(D.mech + 2);
    this.trainG = this.add.graphics().setDepth(D.parts + 2);
    let si = 0;
    g0.cells.forEach((t) => {
      if (t?.id && (t.kind === 'P' || t.kind === 'S') && !this.stations.has(t.id)) this.stations.set(t.id, STATION_COLORS[si++ % STATION_COLORS.length]);
    });
    // tap zones for rotatable pieces, valves, switches and points
    g0.cells.forEach((t, i) => {
      if (!t || (!t.rotatable && !t.toggle)) return;
      const c = this.cellCenter(i);
      const z = this.add.zone(c.x, c.y, this.S, this.S).setInteractive({ useHandCursor: true }).setDepth(D.mech + 3);
      z.on('pointerup', () => this.tapCell(i));
    });
    // drawer pieces
    const spots = this.traySpots(this.def.tray.length);
    this.def.tray.forEach((tok, i) => {
      const kind = tok[0] as TileKind;
      const obj = this.add.container(spots[i].x, spots[i].y).setDepth(D.trayPart).setScale(0.72);
      const g = this.add.graphics();
      obj.add(g);
      obj.setSize(this.S, this.S);
      const part: Part = { kind, rot: Number(tok[1] ?? 0), obj, g, home: spots[i], cell: null };
      this.drawPart(part);
      this.parts.push(part);
      this.enableDrag({
        obj,
        restScale: 0.72,
        targets: () => this.slotTargets(),
        accepts: (t) => this.style.id !== 'tinker' || this.state.cells[Number(t.id)]?.sol?.kind === part.kind,
        pick: () => this.liftPart(part),
        drop: (t) => this.dropPart(part, t),
      });
      obj.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.getDistance() < 8 && part.cell !== null) this.rotatePart(part);
      });
    });
    if (this.def.family === 'tracks') {
      roundButton(this, 1180, 600, '▶', () => this.runTrains(), { r: 48, fontSize: 44, color: 0xa0a477, say: 'Go!' }).setDepth(D.hud);
    }
  }

  private cellCenter(i: number): { x: number; y: number } {
    const cols = this.state.cols;
    return { x: this.ox + (i % cols) * this.S + this.S / 2, y: this.oy + Math.floor(i / cols) * this.S + this.S / 2 };
  }

  private slotTargets(): SnapTarget[] {
    const out: SnapTarget[] = [];
    this.state.cells.forEach((t, i) => {
      if (t?.slot) out.push({ id: String(i), ...this.cellCenter(i) });
    });
    return out;
  }

  // ───────────── state changes ─────────────

  private syncSlots(): void {
    this.state.cells.forEach((t, i) => {
      if (!t?.slot) return;
      const p = this.parts.find((q) => q.cell === i);
      t.kind = p ? p.kind : '_';
      t.rot = p ? p.rot : 0;
    });
  }

  private liftPart(p: Part): void {
    if (p.cell === null) return;
    const was = p.cell;
    p.cell = null;
    this.syncSlots();
    this.evaluate();
    this.undoStack.push(() => {
      p.cell = was;
      this.syncSlots();
    });
  }

  private bestRot(kind: TileKind, cell: number): number {
    const t = this.state.cells[cell]!;
    if (t.sol?.kind === kind && t.sol.rot !== undefined) return t.sol.rot;
    let best = 0;
    let score = -1;
    for (let r = 0; r < 4; r++) {
      const probe: Tile = { ...t, kind, rot: r };
      const x = cell % this.state.cols;
      const y = Math.floor(cell / this.state.cols);
      let s = 0;
      for (const d of ports(probe)) {
        const nx = x + DX[d];
        const ny = y + DY[d];
        const n = nx >= 0 && ny >= 0 && nx < this.state.cols && ny < this.state.rows ? this.state.cells[ny * this.state.cols + nx] : null;
        if (n && ports(n).includes(((d + 2) % 4) as Dir)) s++;
      }
      if (s > score) {
        score = s;
        best = r;
      }
    }
    return best;
  }

  private dropPart(p: Part, t: SnapTarget | null): void {
    if (!t) return this.floatHome(p.obj, p.home, 0.72);
    const cell = Number(t.id);
    const slot = this.state.cells[cell]!;
    if (this.style.id === 'tinker' && slot.sol?.kind !== p.kind) return this.refuse(p.obj, t, p.home, 0.72);
    const prevOcc = this.parts.find((q) => q !== p && q.cell === cell);
    const prevRot = p.rot;
    if (prevOcc) {
      prevOcc.cell = null;
      this.floatHome(prevOcc.obj, prevOcc.home, 0.72);
    }
    p.cell = cell;
    if (this.style.autoRotate) p.rot = this.bestRot(p.kind, cell);
    this.drawPart(p);
    this.tweens.killTweensOf(p.obj);
    // If the helper turned the piece, show it turning from the way it looked in the hand
    // (each quarter turn is +90°), instead of jumping.
    const turned = (p.rot - prevRot + 4) % 4;
    p.obj.setAngle(-turned * 90);
    this.tweens.add({ targets: p.obj, x: t.x, y: t.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    if (turned) {
      sfx.ratchet(1);
      this.tweens.add({ targets: p.obj, angle: 0, delay: 120, duration: 220 * turned, ease: 'Sine.easeInOut' });
    } else p.obj.setAngle(0);
    p.obj.setDepth(D.mech + 1);
    this.syncSlots();
    this.clunkAt(t.x, t.y);
    this.evaluate(true);
    this.act(() => {
      p.cell = null;
      p.rot = prevRot;
      if (prevOcc) prevOcc.cell = cell;
      this.syncSlots();
    });
  }

  private rotatePart(p: Part): void {
    if (this.fixed || this.running) return;
    const old = p.rot;
    p.rot = (p.rot + 1) % 4;
    this.tweens.add({ targets: p.obj, angle: { from: -90, to: 0 }, duration: 160, ease: 'Back.easeOut' });
    this.drawPart(p);
    sfx.ratchet(1);
    this.syncSlots();
    this.evaluate(true);
    this.act(() => {
      p.rot = old;
      this.syncSlots();
    });
  }

  private tapCell(i: number): void {
    if (this.fixed || this.running) return;
    const t = this.state.cells[i]!;
    if (t.toggle) {
      t.state = !t.state;
      if (this.def.family === 'pipes') {
        sfx.ratchet(3);
        if (t.state) sfx.whoosh();
      } else if (this.def.family === 'circuit') sfx.toggle(t.state);
      else sfx.ratchet(2);
      this.act(() => (t.state = !t.state));
    } else if (t.rotatable) {
      t.rot = (t.rot + 1) % 4;
      sfx.ratchet(1);
      this.act(() => (t.rot = (t.rot + 3) % 4));
    }
    this.evaluate(true);
    this.drawTiles();
  }

  protected refresh(): void {
    // place parts to match slot contents in state (after undo / the debug solver)
    const want = new Map<number, { kind: TileKind; rot: number }>();
    this.state.cells.forEach((t, i) => {
      if (t?.slot && t.kind !== '_') want.set(i, { kind: t.kind, rot: t.rot });
    });
    for (const p of this.parts) p.cell = null;
    for (const [cell, w] of want) {
      const p = this.parts.find((q) => q.cell === null && q.kind === w.kind) ?? this.parts.find((q) => q.cell === null);
      if (!p) continue;
      p.cell = cell;
      p.kind = w.kind;
      p.rot = w.rot;
    }
    for (const p of this.parts) {
      this.tweens.killTweensOf(p.obj);
      this.drawPart(p);
      if (p.cell !== null) p.obj.setPosition(this.cellCenter(p.cell).x, this.cellCenter(p.cell).y).setScale(1).setAngle(0).setDepth(D.mech + 1);
      else p.obj.setPosition(p.home.x, p.home.y).setScale(0.72).setAngle(0).setDepth(D.trayPart);
    }
    this.syncSlots();
    this.evaluate();
  }

  private evaluate(sound = false): void {
    const fam = this.def.family;
    if (fam === 'pipes') {
      const before = this.pipe?.reached.size ?? 0;
      this.pipe = solvePipes(this.state);
      if (sound && this.pipe.reached.size > before) sfx.splash();
      if (sound && this.pipe.leaks.length) sfx.drip();
    } else if (fam === 'circuit') {
      const was = this.circ?.liveCells.size ?? 0;
      this.circ = solveCircuit(this.state);
      if (sound && this.circ.blown.length) {
        sfx.pop();
        this.kip.giggle();
      } else if (sound && this.circ.liveCells.size > was) sfx.zap();
      if (this.circ.components.some((c) => c.kind === 'Q' && c.level > 0.3)) this.ringing = 1.5;
    } else {
      this.runs = null;
    }
    this.drawTiles();
  }

  // ───────────── trains ─────────────

  private runTrains(): void {
    if (this.running || this.fixed) return;
    this.runs = simulateTrains(cloneGrid(this.state));
    this.running = true;
    this.runT = 0;
    this.moves++;
    sfx.whistle(740, 0.6);
  }

  protected afterSolutionApplied(): void {
    if (this.def.family === 'tracks') this.runTrains();
    else this.checkSolved();
  }

  private finishRun(): void {
    this.running = false;
    const runs = this.runs!;
    if (trainsSucceed(runs, this.def.trains ?? [])) {
      this.onFixed();
      return;
    }
    if (runs.some((r) => r.end === 'crash')) {
      sfx.tone(880, 'square', 0.08, 0.01, 0.1);
      sfx.tone(880, 'square', 0.08, 0.01, 0.1, 0.18);
    } else sfx.boing();
    this.kip.shrug();
  }

  /** Position of a train `f` (0..1) of the way through step k. */
  private trainPos(run: TrainRun, k: number, f: number): { x: number; y: number; a: number } {
    const st = run.steps[k];
    const c = this.cellCenter(st.cell);
    const h = this.S / 2;
    const ein = st.enter;
    const exit = st.exit;
    const from = ein === undefined ? { x: c.x, y: c.y } : { x: c.x + DX[ein] * h, y: c.y + DY[ein] * h };
    const to = { x: c.x + DX[exit] * h, y: c.y + DY[exit] * h };
    if (ein !== undefined && ein !== exit && (ein + 2) % 4 !== exit) {
      // curve: arc around the shared corner
      const cx = c.x + (DX[ein] + DX[exit]) * h;
      const cy = c.y + (DY[ein] + DY[exit]) * h;
      const a0 = Math.atan2(from.y - cy, from.x - cx);
      let a1 = Math.atan2(to.y - cy, to.x - cx);
      while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
      while (a0 - a1 > Math.PI) a1 += Math.PI * 2;
      const a = a0 + (a1 - a0) * f;
      return { x: cx + Math.cos(a) * h, y: cy + Math.sin(a) * h, a: a + (a1 > a0 ? Math.PI / 2 : -Math.PI / 2) };
    }
    const x = from.x + (to.x - from.x) * f;
    const y = from.y + (to.y - from.y) * f;
    return { x, y, a: Math.atan2(to.y - from.y, to.x - from.x) };
  }

  private drawTrains(dt: number): void {
    const g = this.trainG;
    g.clear();
    const runs = this.runs;
    if (this.running && runs) {
      this.runT += dt * 2.6;
      const longest = Math.max(...runs.map((r) => r.steps.length));
      const lapCap = Math.min(longest, 60);
      if (this.runT >= lapCap) {
        this.finishRun();
      }
    }
    // idle trains sit in their stations
    const list = runs ?? [];
    this.state.cells.forEach((t, i) => {
      if (t?.kind !== 'S') return;
      const run = list.find((r) => r.steps[0].cell === i);
      let pos: { x: number; y: number; a: number };
      if (run && (this.running || this.runs)) {
        const total = run.steps.length;
        const k = Math.min(Math.floor(this.runT), total - 1);
        const f = Math.min(1, this.runT - k);
        pos = this.trainPos(run, k, k === total - 1 ? Math.min(f, 0.5) : f);
        if (Math.floor(this.runT * 2) % 2 === 0 && this.running && Math.random() < 0.1) sfx.chug();
      } else {
        const c = this.cellCenter(i);
        pos = { x: c.x, y: c.y, a: (DX[t.rot] === 0 ? Math.PI / 2 : 0) * (t.rot === 0 ? -1 : 1) };
        pos.a = Math.atan2(DY[t.rot], DX[t.rot]);
      }
      const col = this.stations.get(t.id ?? '') ?? 0x2b7a78;
      this.drawEngine(g, pos.x, pos.y, pos.a, col);
    });
  }

  private drawEngine(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, col: number): void {
    const s = this.S / 100;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const P = (lx: number, ly: number) => new Phaser.Math.Vector2(x + (lx * ca - ly * sa) * s, y + (lx * sa + ly * ca) * s);
    g.fillStyle(0x000000, 0.3);
    g.fillPoints([P(-30, -16), P(30, -16), P(30, 20), P(-30, 20)], true);
    g.fillStyle(col, 1);
    g.fillPoints([P(-30, -18), P(26, -18), P(26, 18), P(-30, 18)], true);
    g.fillStyle(0x222222, 1);
    g.fillPoints([P(10, -8), P(30, -8), P(30, 8), P(10, 8)], true);
    const chimney = P(18, 0);
    g.fillCircle(chimney.x, chimney.y, 7 * s);
    g.fillStyle(0xffd43b, 1);
    const lamp = P(30, 0);
    g.fillCircle(lamp.x, lamp.y, 4 * s);
  }

  // ───────────── drawing ─────────────

  private drawPart(p: Part): void {
    p.g.clear();
    const t: Tile = { kind: p.kind, rot: p.rot, rotatable: false, toggle: false, state: true, required: false, forbidden: false, bright: false, slot: false };
    this.drawTile(p.g, t, 0, 0, -1);
    // a bright stud on every end that connects, so the piece's direction reads at a glance (also in the tray)
    const h = this.S / 2;
    for (const d of ports(t)) {
      const sx = DX[d] * h * 0.8;
      const sy = DY[d] * h * 0.8;
      p.g.fillStyle(0x342f29, 0.9);
      p.g.fillCircle(sx, sy, this.S * 0.09);
      p.g.fillStyle(0xf1d391, 1);
      p.g.fillCircle(sx, sy, this.S * 0.06);
    }
    if (p.cell !== null && !this.fixed) this.drawTurnBadge(p.g, h * 0.62, -h * 0.62);
  }

  /** A "tap to turn" badge: a cream disc with a curved arrow. */
  private drawTurnBadge(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    const r = Math.max(11, this.S * 0.13);
    g.fillStyle(0x342f29, 0.35);
    g.fillCircle(x + 2, y + 2, r);
    g.fillStyle(0xf4ebd5, 1);
    g.fillCircle(x, y, r);
    g.lineStyle(2, 0x8a5f17, 1);
    g.strokeCircle(x, y, r);
    g.lineStyle(3, 0x79503d, 1);
    g.beginPath();
    g.arc(x, y, r * 0.55, -Math.PI * 0.85, Math.PI * 0.35);
    g.strokePath();
    const ex = x + Math.cos(Math.PI * 0.35) * r * 0.55;
    const ey = y + Math.sin(Math.PI * 0.35) * r * 0.55;
    g.fillStyle(0x79503d, 1);
    g.fillTriangle(ex - r * 0.4, ey - r * 0.05, ex + r * 0.25, ey - r * 0.3, ex + r * 0.05, ey + r * 0.4);
  }

  private drawTiles(): void {
    const g = this.tilesG;
    g.clear();
    this.state.cells.forEach((t, i) => {
      if (!t) return;
      const c = this.cellCenter(i);
      if (t.slot) {
        // an empty socket: a lit, dashed-looking frame with a soft fill so it reads as "a part goes here"
        g.fillStyle(0xf4ebd5, 0.12);
        g.fillRoundedRect(c.x - this.S / 2 + 6, c.y - this.S / 2 + 6, this.S - 12, this.S - 12, 10);
        g.lineStyle(4, 0xf1d391, 0.85);
        g.strokeRoundedRect(c.x - this.S / 2 + 6, c.y - this.S / 2 + 6, this.S - 12, this.S - 12, 10);
        return; // the placed part draws itself
      }
      this.drawTile(g, t, c.x, c.y, i);
      if (t.rotatable && !this.fixed) this.drawTurnBadge(g, c.x + this.S * 0.31, c.y - this.S * 0.31);
    });
    for (const p of this.parts) this.drawPart(p);
  }

  /** Draw one tile centred at (x, y). `cell` is -1 for drawer pieces. */
  private drawTile(g: Phaser.GameObjects.Graphics, t: Tile, x: number, y: number, cell: number): void {
    const S = this.S;
    const h = S / 2;
    const fam = this.def.family;
    const chans = channels(t);
    const comp = cell >= 0 ? this.circ?.components.find((c) => c.cell === cell) : undefined;
    const level = comp?.level ?? 0;
    if (cell < 0) {
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(-h + 4, -h + 4, S - 8, S - 8, 12);
    }
    const line = (d: number, width: number, color: number, alpha = 1, to = 0) => {
      g.lineStyle(width, color, alpha);
      g.lineBetween(x + DX[d] * to, y + DY[d] * to, x + DX[d] * h, y + DY[d] * h);
    };
    if (fam === 'tracks') {
      for (const ch of chans) {
        if (ch.length < 2) {
          for (const d of ch) this.drawRail(g, x, y, d, d, t.kind === 'E');
          continue;
        }
        if (ch.length > 2) {
          // a junction: straight rails between opposite ends, and a curve from each side branch to
          // the ends it joins, so a junction never looks like a plain curve
          const set = new Set<number>(ch);
          for (const d of ch) if (d < 2 && set.has((d + 2) % 4)) this.drawRail(g, x, y, d, (d + 2) % 4, false);
          for (const d of ch) {
            if (set.has((d + 2) % 4)) continue;
            for (const e of ch) if (e !== d && (e + 2) % 4 !== d) this.drawRail(g, x, y, d, e, false);
          }
          continue;
        }
        const [a, b] = ch;
        this.drawRail(g, x, y, a, b, false);
      }
    } else {
      const pipeCol = fam === 'pipes' ? 0xc8703f : 0xb5652e;
      const width = fam === 'pipes' ? S * 0.3 : S * 0.12;
      for (const ch of chans) for (const d of ch) line(d, width + 6, 0x342f29, 0.6);
      for (const ch of chans) for (const d of ch) line(d, width, pipeCol);
      if (fam === 'pipes') for (const ch of chans) for (const d of ch) line(d, width * 0.5, 0xd5f5e3, 0.35);
      if (fam === 'circuit') {
        // double-coded: copper wire with little stripes
        for (const ch of chans) for (const d of ch) {
          for (let k = 0.2; k < 1; k += 0.25) {
            g.fillStyle(0xf0a77a, 1);
            g.fillCircle(x + DX[d] * h * k, y + DY[d] * h * k, width * 0.22);
          }
        }
      }
      if (chans.length && ['I', 'L', 'T', '+', 'X'].includes(t.kind)) {
        g.fillStyle(pipeCol, 1);
        g.fillCircle(x, y, width * 0.62);
      }
    }
    switch (t.kind) {
      case '#':
        g.fillStyle(0x5a4a3a, 1);
        g.fillRoundedRect(x - h + 6, y - h + 6, S - 12, S - 12, 10);
        g.lineStyle(2, 0x3a2a1a, 1);
        g.lineBetween(x - h + 10, y, x + h - 10, y);
        break;
      case 'W':
        g.fillStyle(0x342f29, 1);
        g.fillRoundedRect(x - h * 0.7, y - h * 0.7, S * 0.7, S * 0.7, 10);
        g.fillStyle(0x5fa8d3, 1);
        g.fillRoundedRect(x - h * 0.6, y - h * 0.4, S * 0.6, S * 0.45, 8);
        g.fillStyle(0xd5f5e3, 0.6);
        g.fillRect(x - h * 0.6, y - h * 0.4, S * 0.6, 4);
        break;
      case 'K': {
        const wet = cell >= 0 && this.pipe?.reached.has(cell);
        if (t.forbidden) {
          // the sugar bowl: keep it dry (stripes so it reads without colour)
          g.fillStyle(0xffffff, 1);
          g.fillEllipse(x, y + 4, S * 0.62, S * 0.5);
          g.lineStyle(3, 0xd64541, 1);
          for (let k = -2; k <= 2; k++) g.lineBetween(x + k * 9 - 6, y - 8, x + k * 9 + 6, y + 18);
          if (wet) {
            g.fillStyle(0x5fa8d3, 0.8);
            g.fillEllipse(x, y + 4, S * 0.5, S * 0.3);
          }
        } else {
          g.fillStyle(0xe9dcc0, 1);
          g.fillRoundedRect(x - h * 0.55, y - h * 0.5, S * 0.55, S * 0.6, 10);
          g.fillStyle(wet ? 0x5fa8d3 : 0x8f8a7a, wet ? 1 : 0.4);
          g.fillRoundedRect(x - h * 0.45, y - h * 0.2 + (wet ? 0 : h * 0.3), S * 0.45, wet ? S * 0.38 : S * 0.08, 6);
        }
        break;
      }
      case 'V': {
        const open = t.state;
        if (fam === 'circuit') {
          g.fillStyle(0x333333, 1);
          g.fillRoundedRect(x - h * 0.5, y - 8, S * 0.5, 16, 6);
          g.lineStyle(6, 0xb5652e, 1);
          const ang = open ? 0 : -0.6;
          const dir = channels(t)[0][0];
          const bx = x + DX[dir] * h * 0.4;
          const by = y + DY[dir] * h * 0.4;
          const ex = x - DX[dir] * h * 0.4;
          const ey = y - DY[dir] * h * 0.4;
          g.lineBetween(bx, by, bx + (ex - bx) * Math.cos(ang) - (ey - by) * Math.sin(ang), by + (ex - bx) * Math.sin(ang) + (ey - by) * Math.cos(ang));
          g.fillStyle(0xbca16a, 1);
          g.fillCircle(bx, by, 6);
        } else {
          g.fillStyle(0xd64541, 1);
          g.fillCircle(x, y, S * 0.24);
          g.fillStyle(0x7a2a22, 1);
          g.fillCircle(x, y, S * 0.08);
          g.lineStyle(4, 0x7a2a22, 1);
          const a = open ? Math.PI / 4 : 0;
          g.lineBetween(x - Math.cos(a) * S * 0.22, y - Math.sin(a) * S * 0.22, x + Math.cos(a) * S * 0.22, y + Math.sin(a) * S * 0.22);
          g.lineBetween(x - Math.sin(a) * S * 0.22, y + Math.cos(a) * S * 0.22, x + Math.sin(a) * S * 0.22, y - Math.cos(a) * S * 0.22);
        }
        break;
      }
      case 'E':
        if (fam === 'tracks') {
          g.fillStyle(0xd64541, 1);
          g.fillRoundedRect(x - S * 0.22, y - S * 0.22, S * 0.44, S * 0.44, 6);
          g.fillStyle(0xffd43b, 1);
          g.fillCircle(x, y, S * 0.08);
        } else {
          g.fillStyle(0x60736d, 1);
          g.fillCircle(x, y, S * 0.16);
        }
        break;
      case 'B':
        g.fillStyle(0x3b7dd8, 1);
        g.fillRoundedRect(x - S * 0.2, y - S * 0.32, S * 0.4, S * 0.64, 8);
        g.fillStyle(0xffffff, 1);
        g.fillRect(x - 3, y - S * 0.22, 6, S * 0.16);
        g.fillRect(x - S * 0.08, y - S * 0.17, S * 0.16, 6);
        g.fillRect(x - S * 0.08, y + S * 0.12, S * 0.16, 6);
        break;
      case 'O': {
        const lit = cell >= 0 ? level : 0;
        if (lit > 0.02) {
          g.fillStyle(0xfff3b0, 0.18 + lit * 0.25);
          g.fillCircle(x, y, S * (0.35 + lit * 0.25));
        }
        g.fillStyle(lit > 0.02 ? 0xfff3b0 : 0x8f8a7a, 0.5 + lit * 0.5);
        g.fillCircle(x, y - 4, S * 0.2);
        g.fillStyle(0x82938c, 1);
        g.fillRect(x - S * 0.09, y + S * 0.12, S * 0.18, S * 0.1);
        if (t.bright && this.style.numbers && cell >= 0) {
          g.lineStyle(2, 0xffd43b, 1);
          g.strokeCircle(x, y - 4, S * 0.26);
        }
        break;
      }
      case 'Q': {
        const ring = cell >= 0 && level > 0.3;
        const wob = ring ? Math.sin(this.time.now / 30) * 4 : 0;
        g.fillStyle(0xbca16a, 1);
        g.fillTriangle(x - S * 0.22 + wob, y + S * 0.18, x + S * 0.22 + wob, y + S * 0.18, x + wob, y - S * 0.24);
        g.fillCircle(x + wob, y - S * 0.06, S * 0.16);
        break;
      }
      case 'M':
        g.fillStyle(0x2e9b5f, 1);
        g.fillCircle(x, y, S * 0.24);
        break;
      case 'F': {
        const blown = cell >= 0 && (this.circ?.blown.includes(cell) || t.state);
        g.fillStyle(0xe9dcc0, 1);
        g.fillRoundedRect(x - S * 0.12, y - S * 0.3, S * 0.24, S * 0.6, 8);
        g.lineStyle(3, blown ? 0x555555 : 0xffb347, 1);
        if (blown) {
          g.lineBetween(x, y - S * 0.25, x + 4, y - 4);
          g.lineBetween(x, y + S * 0.25, x - 4, y + 6);
        } else g.lineBetween(x, y - S * 0.25, x, y + S * 0.25);
        break;
      }
      case 'S':
      case 'P': {
        const col = this.stations.get(t.id ?? '') ?? 0xd64541;
        const side = channels(t)[0][0] % 2 === 0 ? 1 : 0;
        g.fillStyle(0xb59e7e, 1);
        if (side) g.fillRect(x + S * 0.24, y - h + 6, S * 0.2, S - 12);
        else g.fillRect(x - h + 6, y + S * 0.24, S - 12, S * 0.2);
        g.fillStyle(col, 1);
        const fx = side ? x + S * 0.38 : x + S * 0.3;
        const fy = side ? y - S * 0.3 : y + S * 0.38;
        g.fillRect(fx - 2, fy - 22, 4, 24);
        g.fillTriangle(fx + 2, fy - 22, fx + 2, fy - 10, fx + 18, fy - 16);
        // shape code so stations read without colour
        const shapeIdx = [...this.stations.keys()].indexOf(t.id ?? '');
        g.fillStyle(0xffffff, 1);
        if (shapeIdx % 3 === 0) g.fillCircle(fx + 8, fy - 16, 2.5);
        else if (shapeIdx % 3 === 1) g.fillRect(fx + 6, fy - 18, 4, 4);
        break;
      }
      case 'Z':
      case 'Y': {
        g.fillStyle(t.state ? 0x8ce99a : 0xd64541, 1);
        g.fillCircle(x + S * 0.3, y + S * 0.3, S * 0.09);
        g.lineStyle(3, 0x342f29, 1);
        g.lineBetween(x + S * 0.3, y + S * 0.3, x + S * 0.3 + (t.state ? 8 : -8), y + S * 0.18);
        break;
      }
    }
  }

  private drawRail(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, b: number, cap: boolean): void {
    const h = this.S / 2;
    const gauge = this.S * 0.14;
    const sleepers = (pts: Array<{ x: number; y: number; nx: number; ny: number }>) => {
      for (const p of pts) {
        g.lineStyle(this.S * 0.07, 0x856c50, 1);
        g.lineBetween(p.x - p.nx * gauge * 1.6, p.y - p.ny * gauge * 1.6, p.x + p.nx * gauge * 1.6, p.y + p.ny * gauge * 1.6);
      }
    };
    if (a === b || (a + 2) % 4 === b) {
      // straight (or a stub to a buffer)
      const x1 = x + DX[a] * h;
      const y1 = y + DY[a] * h;
      const x2 = a === b ? x : x + DX[b] * h;
      const y2 = a === b ? y : y + DY[b] * h;
      const nx = -(y2 - y1) / Math.hypot(x2 - x1, y2 - y1);
      const ny = (x2 - x1) / Math.hypot(x2 - x1, y2 - y1);
      const pts = [0.15, 0.5, 0.85].map((f) => ({ x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f, nx, ny }));
      sleepers(pts);
      g.lineStyle(this.S * 0.04, 0x777777, 1);
      g.lineBetween(x1 + nx * gauge, y1 + ny * gauge, x2 + nx * gauge, y2 + ny * gauge);
      g.lineBetween(x1 - nx * gauge, y1 - ny * gauge, x2 - nx * gauge, y2 - ny * gauge);
      void cap;
      return;
    }
    const cx = x + (DX[a] + DX[b]) * h;
    const cy = y + (DY[a] + DY[b]) * h;
    const a0 = Math.atan2(y + DY[a] * h - cy, x + DX[a] * h - cx);
    let a1 = Math.atan2(y + DY[b] * h - cy, x + DX[b] * h - cx);
    while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
    while (a0 - a1 > Math.PI) a1 += Math.PI * 2;
    const pts = [0.15, 0.5, 0.85].map((f) => {
      const ang = a0 + (a1 - a0) * f;
      return { x: cx + Math.cos(ang) * h, y: cy + Math.sin(ang) * h, nx: Math.cos(ang), ny: Math.sin(ang) };
    });
    sleepers(pts);
    g.lineStyle(this.S * 0.04, 0x777777, 1);
    for (const r of [h - gauge, h + gauge]) {
      g.beginPath();
      g.arc(cx, cy, r, Math.min(a0, a1), Math.max(a0, a1), false);
      g.strokePath();
    }
  }

  // ───────────── hints, ghosts, peek ─────────────

  private connSame(a: Tile, b: { kind?: TileKind; rot?: number }): boolean {
    const probe: Tile = { ...a, kind: b.kind ?? a.kind, rot: b.rot ?? a.rot };
    const key = (t: Tile) => channels(t).map((c) => [...c].sort().join('')).sort().join('|');
    return key(a) === key(probe);
  }

  protected hintTarget(): HintTarget | null {
    const cells = this.state.cells;
    for (let i = 0; i < cells.length; i++) {
      const t = cells[i];
      if (!t?.slot || !t.sol?.kind) continue;
      if (t.kind === t.sol.kind && this.connSame(t, t.sol)) continue;
      const part = this.parts.find((p) => p.kind === t.sol!.kind && (p.cell === null || p.cell === i));
      return { from: part ? { x: part.obj.x, y: part.obj.y } : undefined, to: this.cellCenter(i) };
    }
    for (let i = 0; i < cells.length; i++) {
      const t = cells[i];
      if (!t?.sol) continue;
      if (t.rotatable && t.sol.rot !== undefined && !this.connSame(t, { rot: t.sol.rot })) return { to: this.cellCenter(i) };
      if (t.toggle && t.sol.state !== undefined && t.state !== t.sol.state) return { to: this.cellCenter(i) };
    }
    if (this.def.family === 'tracks') return { to: { x: 1180, y: 600 } };
    return null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    this.state.cells.forEach((t, i) => {
      if (!t?.slot || t.kind !== '_' || !t.sol?.kind) return;
      const c = this.cellCenter(i);
      const probe: Tile = { ...t, kind: t.sol.kind, rot: t.sol.rot ?? 0 };
      for (const ch of channels(probe)) for (const d of ch) {
        g.lineStyle(this.S * 0.16, 0xf4ebd5, alpha);
        g.lineBetween(c.x, c.y, c.x + DX[d] * this.S * 0.45, c.y + DY[d] * this.S * 0.45);
      }
    });
  }

  protected drawBlueprint(g: Phaser.GameObjects.Graphics, pulse: number): void {
    const cells = this.state.cells;
    const h = this.S / 2;
    cells.forEach((t, i) => {
      if (!t) return;
      const c = this.cellCenter(i);
      const live = this.def.family === 'pipes' ? this.pipe?.wetCells.has(i) : this.def.family === 'circuit' ? this.circ?.liveCells.has(i) : false;
      for (const ch of channels(t)) for (const d of ch) {
        g.lineStyle(5, live ? 0xfff0a0 : 0x7fd3ff, live ? 0.95 : 0.5);
        g.lineBetween(c.x, c.y, c.x + DX[d] * h, c.y + DY[d] * h);
      }
    });
    // where it stops: open ends next to flowing pieces
    const leaks = this.def.family === 'pipes' ? this.pipe?.leaks ?? [] : [];
    for (const port of leaks) {
      const c = this.cellCenter(port >> 2);
      const d = port & 3;
      g.fillStyle(0xd3a278, 0.3 + pulse * 0.4);
      g.fillCircle(c.x + DX[d] * h, c.y + DY[d] * h, 12 + pulse * 10);
    }
    cells.forEach((t, i) => {
      if (t?.slot && t.kind === '_') {
        const c = this.cellCenter(i);
        g.lineStyle(3, 0xffffff, 0.4 + pulse * 0.5);
        g.strokeCircle(c.x, c.y, 18 + pulse * 10);
      }
    });
  }

  protected solutionSteps(): number {
    return this.state.cells.filter((t) => t?.sol).length + (this.def.family === 'tracks' ? 1 : 0);
  }

  // ───────────── per frame ─────────────

  protected tick(dt: number): void {
    this.flowT += dt;
    const g = this.liveG;
    g.clear();
    const h = this.S / 2;
    if (this.def.family === 'pipes' && this.pipe) {
      // water flowing: moving dashes in every wet pipe
      for (const port of this.pipe.wetPorts) {
        const i = port >> 2;
        const d = port & 3;
        const c = this.cellCenter(i);
        for (let k = 0; k < 2; k++) {
          const f = ((this.flowT * 1.4 + k * 0.5) % 1) * 0.9;
          g.fillStyle(0x9ad8ff, 0.9);
          g.fillCircle(c.x + DX[d] * h * f, c.y + DY[d] * h * f, this.S * 0.06);
        }
      }
      for (const port of this.pipe.leaks) {
        const c = this.cellCenter(port >> 2);
        const d = port & 3;
        const f = (this.flowT * 2) % 1;
        g.fillStyle(0x5fa8d3, 1 - f);
        g.fillCircle(c.x + DX[d] * h, c.y + DY[d] * h + f * 30, 4);
      }
    }
    if (this.def.family === 'circuit' && this.circ) {
      for (const i of this.circ.liveCells) {
        const t = this.state.cells[i]!;
        const c = this.cellCenter(i);
        for (const d of ports(t)) {
          const f = (this.flowT * 2.2 + i * 0.37) % 1;
          g.fillStyle(0xe6f6ff, 1);
          g.fillCircle(c.x + DX[d] * h * f, c.y + DY[d] * h * f, this.S * 0.045);
        }
      }
      if (this.ringing > 0) {
        this.ringing -= dt;
        if (Math.floor(this.flowT * 8) % 4 === 0 && Math.random() < 0.3) sfx.ding(1568);
        this.drawTiles();
      }
    }
    if (this.def.family === 'tracks') this.drawTrains(dt);
    void FONT;
  }
}
