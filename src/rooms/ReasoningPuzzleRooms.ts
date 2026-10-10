/** Five tactile reasoning puzzles. Every action goes through the same pure engine as validation. */
import Phaser from 'phaser';
import { CM } from '../art/copperMoss';
import { rivet } from '../art/finish';
import { drawingGear, fuse, jug, puzzlePanel, reasoningProp, star, valve } from '../art/reasoningPuzzleArt';
import * as sfx from '../audio/sfx';
import type { JugAction, LayerPlacement } from '../content/variety-types';
import { differenceFind, jugHint, jugMove, layersRemove, layersSet, projectLayers, sortingSwap, sortingWeigh, sudokuCandidates, sudokuSet } from '../mechanism/variety';
import { FONT, roundButton } from '../ui/widgets';
import { D, RoomBase, type HintTarget } from './RoomBase';

type NewKind = 'sorting' | 'sudoku' | 'jugs' | 'layers' | 'difference';
type Point = { x: number; y: number };

abstract class ReasoningRoom<K extends NewKind> extends RoomBase<K> {
  protected commit(next: typeof this.state, sound: 'click' | 'clunk' = 'click'): boolean {
    if (this.fixed && this.launch.mode !== 'playground' || next === this.state) return false;
    const before = this.state;
    this.state = next;
    this.refresh();
    if (sound === 'clunk') sfx.clunk(); else sfx.click();
    this.act(() => { this.state = before; });
    return true;
  }

  protected tap(at: Point, w: number, h: number, qa: string, fn: () => void, depth = D.widget): Phaser.GameObjects.Zone {
    const zone = this.add.zone(at.x, at.y, w, h).setDepth(depth).setInteractive({ useHandCursor: true }).setName(qa).setData('qa', qa);
    zone.on('pointerup', () => { if (!this.fixed || this.launch.mode === 'playground') fn(); });
    return zone;
  }

  protected control(x: number, y: number, icon: string, qa: string, fn: () => void, r = 34): Phaser.GameObjects.Container {
    return roundButton(this, x, y, icon, () => { if (!this.fixed || this.launch.mode === 'playground') fn(); }, { r, fontSize: 30, color: CM.paper }).setDepth(y >= 550 ? D.trayPart + 3 : D.widget + 1).setName(qa).setData('qa', qa);
  }

  protected word(x: number, y: number, text = '', size = 20): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color: y >= 550 ? '#f4ebd5' : '#342f29', fontStyle: 'bold' }).setOrigin(.5).setDepth(D.trayPart + 4);
  }
}

/** Valves remain identifiable by small case dots; Engineer hides size and weighs real mass. */
export class SortingRoom extends ReasoningRoom<'sorting'> {
  private drawing!: Phaser.GameObjects.Graphics;
  private chosen: number[] = [];
  private slots: Point[] = [];
  private status!: Phaser.GameObjects.Text;
  private swapButton!: Phaser.GameObjects.Container;
  private weighButton?: Phaser.GameObjects.Container;

  constructor() { super('room-sorting'); }

  protected build(): void {
    this.chosen = [];
    this.weighButton = undefined;
    const back = this.add.graphics().setDepth(D.mech - 1);
    puzzlePanel(back, 216, 182, 848, 350);
    this.drawing = this.add.graphics().setDepth(D.mech);
    const n = this.def.items.length;
    this.slots = Array.from({ length: n }, (_, i) => ({ x: 285 + i * 710 / Math.max(1, n - 1), y: 436 }));
    this.slots.forEach((p, i) => this.tap({ x: p.x, y: p.y - 55 }, 110, 172, `sorting-valve:${i}`, () => this.choose(i)));
    this.status = this.word(640, 503, '', 18);
    this.swapButton = this.control(this.def.mode === 'weight' ? 735 : 640, 592, '↔', 'sorting-swap', () => this.swap(), 40);
    if (this.def.mode === 'weight') this.weighButton = this.control(545, 592, '⚖', 'sorting-weigh', () => this.weigh(), 40);
    reasoningProp(this, this.def.mode === 'weight' ? 10 : 8, 234, 199, 75, D.mech - 2);
    // Visual direction: ascending sockets, with no reading needed.
    back.lineStyle(3, CM.inkSoft, .8); back.lineBetween(296, 470, 978, 470);
    back.fillStyle(CM.inkSoft, .8); back.fillTriangle(982, 470, 967, 462, 967, 478);
    [0, 1, 2].forEach((i) => { back.fillStyle(CM.copper, 1); back.fillRect(300 + i * 25, 492 - i * 5, 13, 10 + i * 5); });
  }

  private choose(index: number): void {
    if (this.chosen.includes(index)) this.chosen = this.chosen.filter((i) => i !== index);
    else this.chosen = this.chosen.length < 2 ? [...this.chosen, index] : [index];
    sfx.pickUp(); this.refresh();
  }

  private swap(): void {
    if (this.chosen.length !== 2) { sfx.nuhUh(); return; }
    const [a, b] = this.chosen;
    const next = sortingSwap(this.def, this.state, a, b);
    this.chosen = [];
    this.commit(next, 'clunk');
  }

  private weigh(): void {
    if (this.chosen.length !== 2) { sfx.nuhUh(); return; }
    const [a, b] = this.chosen.map((i) => this.state.order[i]);
    const next = sortingWeigh(this.def, this.state, a, b);
    if (!this.commit(next)) { sfx.nuhUh(); this.status.setText('↶'); }
  }

  protected refresh(): void {
    const g = this.drawing.clear();
    const maxSize = Math.max(...this.def.items.map((item) => item.size));
    this.state.order.forEach((id, i) => {
      const item = this.def.items.find((p) => p.id === id)!;
      const p = this.slots[i];
      g.fillStyle(CM.ink, 1); g.fillEllipse(p.x, p.y + 1, 66, 18);
      g.lineStyle(3, CM.brass, 1); g.strokeEllipse(p.x, p.y + 1, 66, 18);
      const height = this.def.mode === 'weight' ? 103 : 48 + item.size / maxSize * 97;
      valve(g, p.x, p.y, height, this.chosen.includes(i), this.def.items.findIndex((q) => q.id === id));
    });
    if (this.def.mode === 'weight') this.drawScale(g);
    else { g.fillStyle(CM.tealDark, 1); g.fillRoundedRect(588, 218, 105, 13, 6); g.fillStyle(CM.cream, .65); g.fillRect(599, 218, 78, 3); }
    this.swapButton.setAlpha(this.chosen.length === 2 ? 1 : .6);
    this.weighButton?.setAlpha(this.chosen.length === 2 && (this.def.maxWeighings === undefined || this.state.weighings < this.def.maxWeighings) ? 1 : .6);
    this.status.setText(this.style.numbers && this.def.mode === 'weight' && this.def.maxWeighings !== undefined ? `${this.state.weighings} / ${this.def.maxWeighings}  ⚖` : '');
  }

  private drawScale(g: Phaser.GameObjects.Graphics): void {
    const pair = this.state.comparison;
    const a = pair ? this.def.items.find((p) => p.id === pair[0])! : null;
    const b = pair ? this.def.items.find((p) => p.id === pair[1])! : null;
    const tilt = a && b ? Math.sign(a.weight - b.weight) * 20 : 0;
    g.fillStyle(CM.copperDark, 1); g.fillTriangle(640, 215, 612, 285, 668, 285);
    g.fillStyle(CM.copperLight, 1); g.fillTriangle(640, 215, 620, 276, 640, 276);
    g.lineStyle(10, CM.ink, 1); g.lineBetween(540, 224 + tilt, 740, 224 - tilt);
    g.lineStyle(6, CM.brass, 1); g.lineBetween(540, 221 + tilt, 740, 221 - tilt);
    for (const [x, drop, item] of [[540, tilt, a], [740, -tilt, b]] as const) {
      g.lineStyle(2, CM.copperDark, 1); g.lineBetween(x - 22, 224 + drop, x - 35, 273 + drop); g.lineBetween(x + 22, 224 + drop, x + 35, 273 + drop);
      g.fillStyle(CM.copperDark, 1); g.fillEllipse(x, 278 + drop, 85, 16);
      g.lineStyle(2, CM.copperLight, 1); g.strokeEllipse(x, 274 + drop, 85, 12);
      if (item) valve(g, x, 272 + drop, 35, false, this.def.items.findIndex((p) => p.id === item.id));
    }
    rivet(g, 640, 222, 6);
    for (let i = 0; i < (this.def.maxWeighings ?? 0); i++) { g.fillStyle(i < this.state.weighings ? CM.inkSoft : CM.copperLight, 1); g.fillCircle(1014, 223 + i * 14, 4); }
  }

  protected hintTarget(): HintTarget | null {
    const target = [...this.def.items].sort((a, b) => a[this.def.mode] - b[this.def.mode]).map((p) => p.id);
    const at = this.state.order.findIndex((id, i) => id !== target[i]);
    if (at < 0) return null;
    const other = this.state.order.indexOf(target[at]);
    if (!this.chosen.includes(at)) return { to: { x: this.slots[at].x, y: this.slots[at].y - 50 } };
    if (!this.chosen.includes(other)) return { to: { x: this.slots[other].x, y: this.slots[other].y - 50 } };
    return { to: { x: this.swapButton.x, y: this.swapButton.y } };
  }

  protected solutionSteps(): number { return this.def.items.length; }
}

/** A fuse box is a Latin square; older boxes also enforce 2x2 regions. */
export class SudokuRoom extends ReasoningRoom<'sudoku'> {
  private drawing!: Phaser.GameObjects.Graphics;
  private trayDrawing!: Phaser.GameObjects.Graphics;
  private selected = 0;
  private size = 74;
  private origin!: Point;
  private palette: Point[] = [];
  private conflictAt = -1;

  constructor() { super('room-sudoku'); }

  protected build(): void {
    this.selected = 0; this.conflictAt = -1;
    this.size = this.def.size === 3 ? 88 : 73;
    this.origin = { x: 640 - this.def.size * this.size / 2, y: 183 };
    const back = this.add.graphics().setDepth(D.mech - 1);
    puzzlePanel(back, this.origin.x - 32, this.origin.y - 25, this.def.size * this.size + 64, this.def.size * this.size + 65, 716);
    this.drawing = this.add.graphics().setDepth(D.mech);
    this.trayDrawing = this.add.graphics().setDepth(D.trayPart);
    for (let at = 0; at < this.def.size ** 2; at++) this.tap(this.cellAt(at), this.size - 4, this.size - 4, `sudoku-cell:${at}`, () => {
      if (this.def.givens[at] >= 0) { sfx.click(); return; }
      const next = sudokuSet(this.def, this.state, at, this.selected);
      if (next === this.state && this.state.cells[at] !== this.selected) {
        this.conflictAt = at; sfx.nuhUh(); this.refresh();
        this.time.delayedCall(700, () => { this.conflictAt = -1; this.refresh(); });
      } else this.commit(next, 'clunk');
    });
    this.palette = this.traySpots(this.def.size + 1);
    this.palette.forEach((p, i) => this.tap(p, 100, 84, `sudoku-symbol:${i < this.def.size ? i : 'erase'}`, () => { this.selected = i < this.def.size ? i : -1; sfx.pickUp(); this.refresh(); }, D.trayPart + 2));
    reasoningProp(this, 9, 1010, 311, 154, D.mech - 2);
  }

  private cellAt(at: number): Point { return { x: this.origin.x + (at % this.def.size + .5) * this.size, y: this.origin.y + (Math.floor(at / this.def.size) + .5) * this.size }; }

  private conflicts(at: number): boolean {
    const value = this.state.cells[at], n = this.def.size;
    if (value < 0) return false;
    return this.state.cells.some((other, i) => i !== at && other === value && (Math.floor(i / n) === Math.floor(at / n) || i % n === at % n || this.def.regions && Math.floor(i % n / 2) === Math.floor(at % n / 2) && Math.floor(Math.floor(i / n) / 2) === Math.floor(Math.floor(at / n) / 2)));
  }

  protected refresh(): void {
    const g = this.drawing.clear(), n = this.def.size;
    for (let at = 0; at < n * n; at++) {
      const p = this.cellAt(at), value = this.state.cells[at];
      g.fillStyle(CM.tealDark, .95); g.fillRoundedRect(p.x - this.size / 2 + 3, p.y - this.size / 2 + 3, this.size - 6, this.size - 6, 8);
      const conflict = this.conflicts(at) || this.conflictAt === at;
      g.lineStyle(conflict ? 4 : 1, conflict ? 0xae3d31 : CM.copperLight, .9); g.strokeRoundedRect(p.x - this.size / 2 + 3, p.y - this.size / 2 + 3, this.size - 6, this.size - 6, 8);
      if (value >= 0) fuse(g, p.x, p.y, value, this.size * .62, this.def.givens[at] >= 0, conflict, this.def.symbols[value].color, this.def.symbols[value].shape);
      else if (this.style.id === 'engineer') {
        const candidates = sudokuCandidates(this.def, this.state, at);
        candidates.forEach((symbol, i) => fuse(g, p.x + (i % 2 ? 12 : -12), p.y + (i >= 2 ? 12 : -12), symbol, 16, false, false, this.def.symbols[symbol].color, this.def.symbols[symbol].shape));
      } else { g.lineStyle(2, CM.cream, .35); g.strokeCircle(p.x, p.y, 10); }
    }
    if (this.def.regions) {
      g.lineStyle(6, CM.brass, 1);
      g.lineBetween(this.origin.x + this.size * 2, this.origin.y, this.origin.x + this.size * 2, this.origin.y + this.size * 4);
      g.lineBetween(this.origin.x, this.origin.y + this.size * 2, this.origin.x + this.size * 4, this.origin.y + this.size * 2);
    }
    const t = this.trayDrawing.clear();
    this.palette.forEach((p, i) => {
      const active = this.selected === (i < n ? i : -1);
      if (active) { t.lineStyle(4, CM.glow, 1); t.strokeRoundedRect(p.x - 40, p.y - 36, 80, 72, 12); }
      if (i < n) fuse(t, p.x, p.y, i, 48, false, false, this.def.symbols[i].color, this.def.symbols[i].shape);
      else { t.fillStyle(CM.paperDark, 1); t.fillRoundedRect(p.x - 25, p.y - 14, 50, 28, 5); t.lineStyle(2, CM.ink, 1); t.strokeRoundedRect(p.x - 25, p.y - 14, 50, 28, 5); t.lineBetween(p.x - 13, p.y - 14, p.x - 13, p.y + 14); }
    });
  }

  protected hintTarget(): HintTarget | null {
    const wrong = this.state.cells.findIndex((value, at) => this.def.givens[at] < 0 && value >= 0 && value !== this.def.solution[at]);
    if (wrong >= 0) return this.selected !== -1 ? { to: this.palette[this.def.size] } : { to: this.cellAt(wrong) };
    const logical = this.state.cells.findIndex((value, at) => value < 0 && sudokuCandidates(this.def, this.state, at).length === 1);
    const at = logical >= 0 ? logical : this.state.cells.findIndex((value) => value < 0);
    if (at < 0) return null;
    const symbol = this.def.solution[at];
    return this.selected === symbol ? { to: this.cellAt(at) } : { to: this.palette[symbol] };
  }

  protected solutionSteps(): number { return this.def.givens.filter((v) => v < 0).length; }
}

/** Select a jug, then tap the receiving jug's arrow. Every pour preserves actual water. */
export class JugsRoom extends ReasoningRoom<'jugs'> {
  private drawing!: Phaser.GameObjects.Graphics;
  private selected = 0;
  private places: Point[] = [];
  private numbers: Phaser.GameObjects.Text[] = [];
  private status!: Phaser.GameObjects.Text;
  private fillButton?: Phaser.GameObjects.Container;
  private emptyButton?: Phaser.GameObjects.Container;

  constructor() { super('room-jugs'); }

  protected build(): void {
    this.selected = 0; this.numbers = []; this.fillButton = undefined; this.emptyButton = undefined;
    const back = this.add.graphics().setDepth(D.mech - 1); puzzlePanel(back, 260, 183, 760, 351, 723);
    this.drawing = this.add.graphics().setDepth(D.mech);
    const n = this.def.capacities.length;
    this.places = Array.from({ length: n }, (_, i) => ({ x: n === 2 ? 455 + i * 338 : 380 + i * 250, y: 454 }));
    this.places.forEach((p, i) => {
      this.tap({ x: p.x + 9, y: p.y - 88 }, 175, 213, `jugs-jug:${i}`, () => this.choose(i));
      this.numbers.push(this.word(p.x, 490, '', 22));
      this.control(p.x + 78, 490, '→', `jugs-pour:${i}`, () => this.move({ kind: 'pour', from: this.selected, to: i }), 24);
    });
    this.status = this.word(640, 600, '', 22);
    if (!this.def.sealed) {
      this.fillButton = this.control(470, 592, '↓', 'jugs-fill', () => this.move({ kind: 'fill', jug: this.selected }), 39);
      this.emptyButton = this.control(810, 592, '↑', 'jugs-empty', () => this.move({ kind: 'empty', jug: this.selected }), 39);
    } else this.control(640, 592, '↶', 'jugs-undo', () => this.rewind(), 38);
    reasoningProp(this, 11, 1010, 202, 83, D.mech - 2);
  }

  private choose(index: number): void {
    this.selected = index; sfx.pickUp(); this.refresh();
  }

  private move(action: JugAction): void {
    const next = jugMove(this.def, this.state, action);
    if (!this.commit(next, 'clunk')) sfx.nuhUh();
  }

  protected refresh(): void {
    const g = this.drawing.clear();
    this.places.forEach((p, i) => {
      const height = 144 + this.def.capacities[i] / Math.max(...this.def.capacities) * 72;
      jug(g, p.x, p.y, this.def.capacities[i], this.state.volumes[i], this.def.target[i] >= 0 ? this.def.target[i] : undefined, i === this.selected, 106, height);
      this.numbers[i].setText(this.style.numbers ? `${this.state.volumes[i]} / ${this.def.capacities[i]}` : '');
      if (!this.style.numbers) {
        for (let cup = 0; cup < this.def.capacities[i]; cup++) { g.fillStyle(cup < this.state.volumes[i] ? CM.teal : CM.paperDark, 1); g.fillCircle(p.x - (this.def.capacities[i] - 1) * 8 + cup * 16, 492, 5); }
      }
    });
    // Clear pictorial tap destination; no written instructions are required.
    g.lineStyle(3, CM.tealDark, .6);
    if (this.places.length > 1) { const p = this.places[this.selected], q = this.places[(this.selected + 1) % this.places.length]; g.lineBetween(p.x, 210, q.x, 210); g.fillStyle(CM.tealDark, .6); const direction = Math.sign(q.x - p.x); g.fillTriangle(q.x, 210, q.x - direction * 13, 202, q.x - direction * 13, 218); }
    if (this.def.maxPours !== undefined) {
      for (let i = 0; i < this.def.maxPours; i++) { g.fillStyle(i < this.state.pours ? CM.inkSoft : CM.copperLight, 1); g.fillCircle(976, 250 + i * 18, 5); }
      this.status.setText(this.style.numbers ? `${this.state.pours} / ${this.def.maxPours}` : '');
      if (this.def.sealed) this.status.setPosition(782, 595);
    } else this.status.setText('');
    this.fillButton?.setAlpha(this.state.volumes[this.selected] < this.def.capacities[this.selected] ? 1 : .6);
    this.emptyButton?.setAlpha(this.state.volumes[this.selected] > 0 ? 1 : .6);
  }

  protected hintTarget(): HintTarget | null {
    const action = jugHint(this.def, this.state);
    if (!action) return this.undoStack.length ? { to: { x: this.def.sealed ? 640 : 1044, y: this.def.sealed ? 592 : 52 } } : null;
    if (action.kind !== 'pour') {
      if (this.selected !== action.jug) return { to: { x: this.places[action.jug].x, y: this.places[action.jug].y - 80 } };
      return { to: { x: action.kind === 'fill' ? 470 : 810, y: 592 } };
    }
    return this.selected === action.from ? { from: { x: this.places[action.from].x, y: 352 }, to: { x: this.places[action.to].x + 78, y: 490 } } : { to: { x: this.places[action.from].x, y: 352 } };
  }

  protected solutionSteps(): number { return this.def.solution.length; }
}

const SLIDE_COLORS: Record<string, number> = { amber: CM.glow, teal: CM.tealLight, rose: 0xc98682, ivory: CM.cream };

/** Glass stars are composed live: top-slide colors, rotations, flips and stray stars all matter. */
export class LayersRoom extends ReasoningRoom<'layers'> {
  private drawing!: Phaser.GameObjects.Graphics;
  private trayDrawing!: Phaser.GameObjects.Graphics;
  private selected = -1;
  private tray: Point[] = [];
  private turnButton?: Phaser.GameObjects.Container;
  private flipButton?: Phaser.GameObjects.Container;
  private upButton?: Phaser.GameObjects.Container;
  private removeButton!: Phaser.GameObjects.Container;

  constructor() { super('room-layers'); }

  protected build(): void {
    this.selected = -1; this.turnButton = undefined; this.flipButton = undefined; this.upButton = undefined;
    const back = this.add.graphics().setDepth(D.mech - 1);
    puzzlePanel(back, 242, 182, 342, 309, 733); puzzlePanel(back, 696, 182, 342, 309, 734);
    this.drawing = this.add.graphics().setDepth(D.mech);
    this.trayDrawing = this.add.graphics().setDepth(D.trayPart);
    this.tray = this.traySpots(this.def.slides.length);
    this.tray.forEach((p, i) => this.tap(p, 100, 86, `layers-slide:${this.def.slides[i].id}`, () => this.pickSlide(this.def.slides[i].id), D.trayPart + 2));
    // Tap the stack to choose the slide whose orientation/order is being changed.
    for (let i = 0; i < this.def.slides.length; i++) this.tap({ x: 460 + i * 68, y: 515 }, 62, 45, `layers-stack:${i}`, () => { if (i < this.state.length) { this.selected = i; this.refresh(); } });
    if (this.def.allowRotate) this.turnButton = this.control(285, 513, '↻', 'layers-rotate', () => this.turn(), 28);
    if (this.def.allowFlip) this.flipButton = this.control(355, 513, '↔', 'layers-flip', () => this.flip(), 28);
    if (this.def.orderMatters) this.upButton = this.control(1003, 513, '↑', 'layers-earlier', () => this.earlier(), 28);
    this.removeButton = this.control(1081, 513, '×', 'layers-remove', () => this.remove(), 28);
    reasoningProp(this, 13, 640, 302, 95, D.mech - 2);
    this.word(412, 464, '☆', 24); this.word(868, 464, '✦', 24);
  }

  private pickSlide(id: string): void {
    const at = this.state.findIndex((p) => p.id === id);
    if (at >= 0) { this.selected = at; sfx.pickUp(); this.refresh(); return; }
    this.selected = this.state.length;
    this.commit(layersSet(this.def, this.state, { id, turn: 0, flipped: false }), 'clunk');
  }

  private current(): LayerPlacement | undefined { return this.state[this.selected]; }
  private turn(): void { const p = this.current(); if (p) this.commit(layersSet(this.def, this.state, { ...p, turn: (p.turn + 1) % 4 }, this.selected)); }
  private flip(): void { const p = this.current(); if (p) this.commit(layersSet(this.def, this.state, { ...p, flipped: !p.flipped }, this.selected)); }
  private remove(): void { const p = this.current(); if (p) { const next = layersRemove(this.state, p.id); this.selected = Math.min(this.selected, next.length - 1); this.commit(next); } }
  private earlier(): void {
    const p = this.current();
    if (!p || this.selected <= 0) return;
    const next = layersSet(this.def, this.state, p, this.selected - 1);
    if (this.commit(next)) this.selected--;
    this.refresh();
  }

  private constellation(g: Phaser.GameObjects.Graphics, cells: Array<{ at: number; color: string }>, x: number, y: number, width: number, ghost = false): void {
    const n = this.def.size, cell = width / n;
    g.fillStyle(CM.tealDark, 1); g.fillRoundedRect(x - 8, y - 8, width + 16, width + 16, 9);
    g.lineStyle(1, CM.sky, .16);
    for (let i = 0; i <= n; i++) { g.lineBetween(x + i * cell, y, x + i * cell, y + width); g.lineBetween(x, y + i * cell, x + width, y + i * cell); }
    cells.forEach((c) => star(g, x + (c.at % n + .5) * cell, y + (Math.floor(c.at / n) + .5) * cell, cell * .22, SLIDE_COLORS[c.color] ?? CM.cream, ghost ? .8 : 1));
    if (cells.length > 1) { g.lineStyle(1.5, CM.cream, .22); for (let i = 1; i < cells.length; i++) { const a = cells[i - 1].at, b = cells[i].at; g.lineBetween(x + (a % n + .5) * cell, y + (Math.floor(a / n) + .5) * cell, x + (b % n + .5) * cell, y + (Math.floor(b / n) + .5) * cell); } }
  }

  protected refresh(): void {
    const g = this.drawing.clear();
    this.selected = Math.min(this.selected, this.state.length - 1);
    this.constellation(g, this.def.target, 287, 211, 250, true);
    const projection = projectLayers(this.def, this.state);
    this.constellation(g, projection, 741, 211, 250);
    const target = new Map(this.def.target.map((c) => [c.at, c.color]));
    projection.forEach((c) => { if (target.get(c.at) !== c.color) { const cell = 250 / this.def.size; g.lineStyle(2, 0xd09477, .8); g.strokeCircle(741 + (c.at % this.def.size + .5) * cell, 211 + (Math.floor(c.at / this.def.size) + .5) * cell, cell * .35); } });
    const t = this.trayDrawing.clear();
    this.def.slides.forEach((slide, i) => {
      const p = this.tray[i], at = this.state.findIndex((s) => s.id === slide.id), selected = at >= 0 && this.selected === at;
      t.fillStyle(CM.sky, at >= 0 ? .65 : .3); t.fillRoundedRect(p.x - 37, p.y - 35, 74, 70, 6);
      t.lineStyle(selected ? 4 : 2, selected ? CM.glow : CM.copperLight, 1); t.strokeRoundedRect(p.x - 37, p.y - 35, 74, 70, 6);
      const cell = 58 / this.def.size;
      slide.cells.forEach((c) => star(t, p.x - 29 + (c.at % this.def.size + .5) * cell, p.y - 29 + (Math.floor(c.at / this.def.size) + .5) * cell, 5, SLIDE_COLORS[c.color] ?? CM.cream));
      for (let dot = 0; dot <= i; dot++) { t.fillStyle(CM.ink, 1); t.fillCircle(p.x - i * 3 + dot * 6, p.y + 29, 1.8); }
    });
    this.state.forEach((p, i) => {
      const x = 460 + i * 68, source = this.def.slides.findIndex((slide) => slide.id === p.id);
      g.fillStyle(this.selected === i ? CM.teal : CM.paperDark, 1); g.fillRoundedRect(x - 27, 496, 54, 38, 5);
      g.lineStyle(this.selected === i ? 3 : 1.5, this.selected === i ? CM.glow : CM.ink, 1); g.strokeRoundedRect(x - 27, 496, 54, 38, 5);
      for (let dot = 0; dot <= source; dot++) { g.fillStyle(this.selected === i ? CM.cream : CM.ink, 1); g.fillCircle(x - source * 3 + dot * 6, 515, 2.4); }
      g.lineStyle(1.5, CM.copperLight, .8); g.lineBetween(x - 18, 499, x - 12 + p.turn * 9, 499);
      if (p.flipped) { g.fillStyle(CM.glow, 1); g.fillTriangle(x + 19, 523, x + 12, 517, x + 12, 529); }
    });
    const on = this.selected >= 0;
    this.turnButton?.setAlpha(on ? 1 : .5); this.flipButton?.setAlpha(on ? 1 : .5); this.removeButton.setAlpha(on ? 1 : .5); this.upButton?.setAlpha(this.selected > 0 ? 1 : .5);
  }

  protected hintTarget(): HintTarget | null {
    const extra = this.state.findIndex((p) => !this.def.solution.some((s) => s.id === p.id));
    if (extra >= 0) return this.selected !== extra ? { to: { x: 460 + extra * 68, y: 515 } } : { to: { x: 1081, y: 513 } };
    for (let i = 0; i < this.def.solution.length; i++) {
      const desired = this.def.solution[i], at = this.state.findIndex((p) => p.id === desired.id);
      if (at < 0) return { from: this.tray[this.def.slides.findIndex((s) => s.id === desired.id)], to: { x: 868, y: 328 } };
      const current = this.state[at];
      if (current.turn !== desired.turn || !!current.flipped !== !!desired.flipped || this.def.orderMatters && at !== i) {
        if (this.selected !== at) return { to: { x: 460 + at * 68, y: 515 } };
        if (current.turn !== desired.turn) return { to: { x: 285, y: 513 } };
        if (!!current.flipped !== !!desired.flipped) return { to: { x: 355, y: 513 } };
        return { to: { x: 1003, y: 513 } };
      }
    }
    return null;
  }

  protected solutionSteps(): number { return this.def.solution.reduce((n, p) => n + 1 + p.turn + Number(p.flipped ?? false), 0); }
}

/** Both drawings show the same features; only authored discrepancies can be marked. */
export class DifferenceRoom extends ReasoningRoom<'difference'> {
  private drawing!: Phaser.GameObjects.Graphics;
  private trayDrawing!: Phaser.GameObjects.Graphics;
  private features: Point[] = [];
  private count!: Phaser.GameObjects.Text;

  constructor() { super('room-difference'); }

  protected build(): void {
    const back = this.add.graphics().setDepth(D.mech - 1);
    puzzlePanel(back, 234, 179, 368, 347, 746); puzzlePanel(back, 678, 179, 368, 347, 747);
    back.fillStyle(0x476e73, 1); back.fillRoundedRect(251, 196, 334, 309, 7);
    this.drawing = this.add.graphics().setDepth(D.mech);
    this.trayDrawing = this.add.graphics().setDepth(D.trayPart);
    this.features = this.def.differences.map((difference, i) => this.featureAt(difference.x, difference.y, i));
    this.features.forEach((p, i) => this.tap({ x: p.x + 444, y: p.y }, 96, 90, `difference-feature:${i}`, () => {
      // Generous finger targets overlap between close diagram details. Resolve by the
      // nearest visible feature, so a gear's rim cannot accidentally mark its clock.
      const pointer = this.input.activePointer;
      let nearest = i, distance = Infinity;
      this.features.forEach((at, index) => { const d = Math.hypot(pointer.worldX - at.x - 444, pointer.worldY - at.y); if (d < distance) { nearest = index; distance = d; } });
      if (distance > 54) { sfx.nuhUh(); return; }
      const at = this.features[nearest];
      const next = this.launch.mode === 'playground' && this.state.has(nearest) ? new Set([...this.state].filter((index) => index !== nearest)) : differenceFind(this.def, this.state, nearest);
      if (this.commit(next, 'clunk')) this.sparkleAt(at.x + 444, at.y, 8);
    }));
    // Neutral correct features make careful comparison meaningful, rather than every visible target being wrong.
    [{ x: 303, y: 483 }, { x: 523, y: 483 }, { x: 792, y: 483 }].forEach((p, i) => this.tap(p, 50, 42, `difference-decoy:${i}`, () => { sfx.nuhUh(); }));
    this.count = this.word(640, 592, '', 24);
    reasoningProp(this, 14, 640, 222, 72, D.mech - 2);
  }

  private featureAt(x: number, y: number, index: number): Point {
    // Authored local board coordinates are 0..320 by 0..250. Normalized records also work.
    if (x <= 1 && y <= 1) return { x: 270 + x * 290, y: 232 + y * 228 };
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 280 + (index % 3) * 109, y: 250 + Math.floor(index / 3) * 89 };
    return { x: 271 + x * .87, y: 230 + y * .94 };
  }

  private drawFeature(g: Phaser.GameObjects.Graphics, art: string, value: string, at: Point, blueprint: boolean): void {
    const color = blueprint ? CM.cream : CM.copper, x = at.x, y = at.y;
    const digits = Number(value.match(/\d+/)?.[0] ?? 12);
    if (art.includes('gear') || art.includes('tooth')) { drawingGear(g, x, y, Math.max(6, Math.min(24, digits)), 28, color, blueprint); return; }
    if (art.includes('arrow')) {
      const left = /left|reverse|back|west/i.test(value), vertical = /up|down/i.test(value);
      g.lineStyle(6, color, 1);
      if (vertical) { const sign = /up/i.test(value) ? -1 : 1; g.lineBetween(x, y - sign * 24, x, y + sign * 24); g.fillStyle(color, 1); g.fillTriangle(x, y + sign * 30, x - 12, y + sign * 12, x + 12, y + sign * 12); }
      else { const sign = left ? -1 : 1; g.lineBetween(x - sign * 25, y, x + sign * 24, y); g.fillStyle(color, 1); g.fillTriangle(x + sign * 31, y, x + sign * 13, y - 12, x + sign * 13, y + 12); }
      return;
    }
    if (art.includes('lamp') || art.includes('bulb')) {
      const on = !/off|dark|missing|broken/i.test(value);
      g.lineStyle(2.5, color, 1); g.strokeCircle(x, y - 5, 19);
      if (!blueprint) { g.fillStyle(on ? CM.glow : CM.slate, 1); g.fillCircle(x, y - 5, 17); }
      g.fillStyle(color, 1); g.fillRoundedRect(x - 10, y + 13, 20, 15, 3);
      if (on) { g.lineStyle(2, blueprint ? color : CM.copperDark, 1); g.lineBetween(x - 7, y - 7, x, y + 6); g.lineBetween(x, y + 6, x + 7, y - 7); }
      return;
    }
    if (art.includes('pipe') || art.includes('wire')) {
      const broken = /gap|broken|missing|open/i.test(value);
      g.lineStyle(12, blueprint ? color : CM.copperDark, 1); g.lineBetween(x - 28, y, x - (broken ? 8 : -28), y);
      if (broken) g.lineBetween(x + 8, y, x + 28, y);
      if (!blueprint) { g.lineStyle(5, CM.copperLight, 1); g.lineBetween(x - 28, y - 2, x - (broken ? 8 : -28), y - 2); if (broken) g.lineBetween(x + 8, y - 2, x + 28, y - 2); }
      g.lineStyle(2, color, 1); g.strokeRect(x - 30, y - 11, 8, 22); g.strokeRect(x + 22, y - 11, 8, 22); return;
    }
    if (art.includes('switch') || art.includes('lever')) {
      const sign = /off|left|down|reverse/i.test(value) ? -1 : 1;
      g.lineStyle(2, color, 1); g.strokeRoundedRect(x - 27, y - 22, 54, 44, 6);
      g.lineStyle(8, color, 1); g.lineBetween(x, y + 13, x + sign * 17, y - 14); g.fillStyle(color, 1); g.fillCircle(x + sign * 17, y - 14, 9); return;
    }
    if (art.includes('bell')) {
      const clapper = !/missing|no|broken/i.test(value);
      g.lineStyle(3, color, 1); g.strokePoints([{ x: x - 26, y: y + 17 }, { x: x - 16, y: y - 10 }, { x: x - 8, y: y - 22 }, { x: x + 8, y: y - 22 }, { x: x + 16, y: y - 10 }, { x: x + 26, y: y + 17 }], true);
      if (clapper) { g.fillStyle(color, 1); g.fillCircle(x, y + 20, 7); }
      if (/crack|broken/i.test(value)) { g.lineStyle(3, blueprint ? color : CM.ink, 1); g.lineBetween(x + 5, y - 17, x - 4, y - 5); g.lineBetween(x - 4, y - 5, x + 5, y + 1); g.lineBetween(x + 5, y + 1, x - 2, y + 17); }
      return;
    }
    if (art.includes('clock')) {
      g.fillStyle(blueprint ? 0x476e73 : CM.cream, 1); g.fillCircle(x, y, 29);
      g.lineStyle(3, color, 1); g.strokeCircle(x, y, 29);
      for (let tick = 0; tick < 12; tick++) { const angle = tick * Math.PI / 6; g.lineStyle(1.5, blueprint ? color : CM.ink, 1); g.lineBetween(x + Math.sin(angle) * 22, y - Math.cos(angle) * 22, x + Math.sin(angle) * 26, y - Math.cos(angle) * 26); }
      const [hours, minutes] = value.split(':').map(Number);
      const hour = (Number.isFinite(hours) ? hours : 12) * Math.PI / 6, minute = (Number.isFinite(minutes) ? minutes : 0) * Math.PI / 30;
      g.lineStyle(4, blueprint ? color : CM.ink, 1); g.lineBetween(x, y, x + Math.sin(hour) * 16, y - Math.cos(hour) * 16);
      g.lineStyle(2, blueprint ? color : CM.ink, 1); g.lineBetween(x, y, x + Math.sin(minute) * 23, y - Math.cos(minute) * 23);
      return;
    }
    if (art.includes('window')) {
      g.lineStyle(3, color, 1); g.strokeRoundedRect(x - 29, y - 28, 58, 56, 7);
      if (!blueprint) { g.fillStyle(CM.tealDark, 1); g.fillRoundedRect(x - 25, y - 24, 50, 48, 5); }
      if (/moon/i.test(value)) { g.fillStyle(blueprint ? color : CM.glow, 1); g.fillCircle(x - 1, y, 15); g.fillStyle(blueprint ? 0x476e73 : CM.tealDark, 1); g.fillCircle(x + 8, y - 7, 13); }
      else star(g, x, y, 19, blueprint ? color : CM.glow);
      return;
    }
    if (art.includes('bird')) {
      const upside = /upside|inverted/i.test(value), sign = upside ? -1 : 1;
      const atY = (local: number) => y + local * sign;
      if (!blueprint) { g.fillStyle(CM.teal, 1); g.fillEllipse(x - 4, atY(5), 44, 31); g.fillStyle(CM.cream, 1); g.fillCircle(x + 15, atY(-10), 13); }
      g.lineStyle(2.5, color, 1); g.strokeEllipse(x - 4, atY(5), 44, 31); g.strokeCircle(x + 15, atY(-10), 13);
      g.fillStyle(color, 1); g.fillTriangle(x + 26, atY(-12), x + 36, atY(-7), x + 26, atY(-4));
      g.fillStyle(blueprint ? color : CM.ink, 1); g.fillCircle(x + 19, atY(-13), 2.5);
      g.lineStyle(2, color, 1); g.lineBetween(x - 10, atY(18), x - 10, atY(28)); g.lineBetween(x + 4, atY(18), x + 4, atY(28));
      g.lineStyle(5, color, 1); g.lineBetween(x - 19, atY(7), x - 35, atY(-2));
      return;
    }
    // Windows, gauges, springs and bolts all have explicit count/position differences.
    const missing = /missing|absent|empty/i.test(value), count = Math.min(5, Math.max(1, Number(value.match(/\d+/)?.[0] ?? (/double|two/i.test(value) ? 2 : 3))));
    g.lineStyle(2.5, color, 1); g.strokeRoundedRect(x - 28, y - 27, 56, 54, 5);
    if (!missing) for (let i = 0; i < count; i++) { g.fillStyle(color, 1); g.fillCircle(x - (count - 1) * 7 + i * 14, y, 5); }
  }

  protected refresh(): void {
    const g = this.drawing.clear();
    // A recognizable clock tower structure and shared details anchor both plans.
    for (const offset of [0, 444]) {
      const blue = offset === 0, c = blue ? CM.cream : CM.woodDark;
      g.lineStyle(2, c, blue ? .45 : .75);
      g.strokeRect(267 + offset, 224, 300, 264);
      g.lineBetween(277 + offset, 229, 557 + offset, 229);
      for (let i = 0; i < 4; i++) { g.fillStyle(blue ? CM.cream : CM.copperDark, 1); g.fillCircle(295 + i * 79 + offset, 483, 5); }
      g.lineStyle(3, c, 1); g.lineBetween(276 + offset, 493, 557 + offset, 493);
    }
    this.def.differences.forEach((d, i) => {
      const p = this.features[i];
      this.drawFeature(g, d.art, d.correct, p, true);
      this.drawFeature(g, d.art, d.wrong, { x: p.x + 444, y: p.y }, false);
      if (this.state.has(i)) { g.lineStyle(4, CM.tealDark, 1); g.strokeCircle(p.x + 444, p.y, 40); g.lineStyle(3, CM.tealDark, 1); g.lineBetween(p.x + 463, p.y + 29, p.x + 472, p.y + 39); g.lineBetween(p.x + 472, p.y + 39, p.x + 489, p.y + 19); }
    });
    const t = this.trayDrawing.clear();
    for (let i = 0; i < this.def.differences.length; i++) { t.fillStyle(this.state.size > i ? CM.teal : CM.paperDark, 1); t.fillCircle(640 - (this.def.differences.length - 1) * 19 + i * 38, 598, 10); }
    this.count.setText(this.style.numbers ? `${this.state.size} / ${this.def.differences.length}` : '').setY(559);
  }

  protected hintTarget(): HintTarget | null { const i = this.def.differences.findIndex((_d, at) => !this.state.has(at)); return i < 0 ? null : { from: this.features[i], to: { x: this.features[i].x + 444, y: this.features[i].y } }; }
  protected solutionSteps(): number { return this.def.differences.length; }
}
