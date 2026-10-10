/** Five different spatial repairs, with live pieces and generous touch controls. */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { CM, drawTimber } from '../art/copperMoss';
import { etchedPlate } from '../art/finish';
import { withArt } from '../art/generated';
import { atlasFrame } from '../art/sprites';
import { bevelCell, decoration, familyPhoto, PIECE_COLORS } from '../art/spatialPuzzleArt';
import type { BoardPiece, Cell, Direction, PieceBoardDef, Placement } from '../content/variety-types';
import { pieceCells, placePiece, rotateCells, slideHint, slideMove, slideSolved, symmetrySet, tiltHint, tiltMove } from '../mechanism/variety';
import { FONT, roundButton } from '../ui/widgets';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';

type G = Phaser.GameObjects.Graphics;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function prop(scene: Phaser.Scene, index: number, x: number, y: number, size: number): void {
  withArt(scene, 'puzzle-props', (key) => {
    const image = scene.add.image(x, y, key, atlasFrame(scene, key, index, 4, 4, true)).setDepth(D.back + 1).setName(`puzzle:prop:${index}`);
    image.setScale(size / Math.max(image.width, image.height));
  });
}

function symbol(token: string): { kind: string; color: number } {
  const basic = ['star', 'leaf', 'berry', 'cherry', 'heart', 'flower'].find((name) => token.includes(name)) ?? 'flower';
  const kind = token.includes('yellow') && basic === 'star' ? 'star-dot' : basic;
  const color = token.includes('teal') || token.includes('blue') ? CM.teal : token.includes('green') || token.includes('moss') ? CM.moss : token.includes('yellow') ? 0xe6cf79 : token.includes('gold') ? CM.brass : token.includes('purple') ? 0x87759a : token.includes('pink') ? 0xbd8291 : 0xb8635a;
  return { kind, color };
}

interface PieceView {
  piece: BoardPiece; obj: Phaser.GameObjects.Container; g: G; turn: number;
  home: { x: number; y: number }; restScale: number; before?: Placement[];
}

/** Shared placement machinery; tool-wall silhouettes and gift packing draw differently. */
abstract class PieceRoom<K extends 'shadow' | 'packing'> extends RoomBase<K> {
  private parts: PieceView[] = [];
  private boardG!: G;
  private selected: string | null = null;
  private S = 60;
  private ox = 0;
  private oy = 0;
  private turnButton?: Phaser.GameObjects.Container;

  protected build(): void {
    this.parts = []; this.selected = null; this.turnButton = undefined;
    const def = this.def as PieceBoardDef;
    this.S = Math.min(85, 730 / def.cols, 328 / def.rows);
    this.ox = 640 - def.cols * this.S / 2;
    this.oy = 340 - def.rows * this.S / 2;
    this.boardG = this.add.graphics().setDepth(D.mech);
    const backdrop = this.add.graphics().setDepth(D.back + 1);
    const bw = def.cols * this.S, bh = def.rows * this.S;
    if (def.kind === 'shadow') {
      drawTimber(backdrop, this.ox - 24, this.oy - 22, bw + 48, bh + 44, 889, CM.woodDark);
      etchedPlate(backdrop, this.ox - 8, this.oy - 8, bw + 16, bh + 16, CM.tealDark, 1, 441);
      prop(this, 4, this.ox - 100, 320, 122);
    } else {
      etchedPlate(backdrop, this.ox - 21, this.oy - 20, bw + 42, bh + 40, CM.woodDark, 1, 633);
      backdrop.lineStyle(12, CM.copperDark, 1); backdrop.lineBetween(this.ox - 30, this.oy + bh + 18, this.ox + bw + 30, this.oy + bh + 18);
      for (const x of [this.ox + bw * 0.23, this.ox + bw * 0.77]) {
        backdrop.fillStyle(CM.ink, 1); backdrop.fillCircle(x, this.oy + bh + 30, 17);
        backdrop.fillStyle(CM.brass, 1); backdrop.fillCircle(x, this.oy + bh + 30, 8);
      }
      prop(this, 7, this.ox - 105, 300, 110);
    }
    const homes = this.traySpots(def.pieces.length);
    def.pieces.forEach((piece, i) => {
      const obj = this.add.container(homes[i].x, homes[i].y).setDepth(D.trayPart).setName(`${def.kind}:piece:${piece.id}`).setData('qa', { kind: def.kind, action: 'piece', id: piece.id });
      const g = this.add.graphics(); obj.add(g);
      const p: PieceView = { piece, obj, g, turn: 0, home: homes[i], restScale: 0.72 };
      this.parts.push(p); this.paintPiece(p, i);
      this.enableDrag({ obj, restScale: p.restScale,
        targets: () => this.targets(p),
        accepts: (t) => this.canDrop(p, t),
        pick: () => { this.selected = piece.id; p.before = clone(this.state as Placement[]); this.state = (this.state as Placement[]).filter((q) => q.id !== piece.id) as typeof this.state; this.paintBoard(); },
        drop: (t) => this.dropPiece(p, t),
      });
      obj.on('pointerdown', () => {
        if (this.fixed && this.launch.mode !== 'playground') return;
        this.selected = piece.id; this.refresh(); sfx.tick();
      });
    });
    for (let at = 0; at < def.cols * def.rows; at++) {
      const x = at % def.cols, y = Math.floor(at / def.cols);
      this.add.zone(this.ox + (x + 0.5) * this.S, this.oy + (y + 0.5) * this.S, this.S, this.S)
        .setDepth(D.mech + 1).setInteractive({ useHandCursor: true }).setName(`${def.kind}:cell:${at}`).setData('qa', { action: 'cell', at })
        .on('pointerup', (pointer: Phaser.Input.Pointer) => {
          const p = this.parts.find((q) => q.piece.id === this.selected); if (!p || this.fixed && this.launch.mode !== 'playground') return;
          const clicked = { x: pointer.worldX, y: pointer.worldY };
          const target = this.targets(p).sort((a, b) => Math.hypot(a.x - clicked.x, a.y - clicked.y) - Math.hypot(b.x - clicked.x, b.y - clicked.y))[0];
          if (target && Math.hypot(target.x - clicked.x, target.y - clicked.y) <= this.snapRadius() + this.S * 0.5) { p.before = clone(this.state as Placement[]); this.dropPiece(p, target); }
        });
    }
    if (def.allowRotate) this.turnButton = roundButton(this, 1070, 596, '↻', () => this.rotateSelected(), { r: 35, fontSize: 35, say: 'Turn the selected piece' })
      .setDepth(D.widget + 30).setName(`${def.kind}:rotate`).setData('qa', { action: 'rotate' });
  }

  private cells(p: PieceView): Cell[] { return rotateCells(p.piece.cells, p.turn); }
  private dimensions(p: PieceView): { w: number; h: number } {
    const cells = this.cells(p); return { w: 1 + Math.max(...cells.map((c) => c.x)), h: 1 + Math.max(...cells.map((c) => c.y)) };
  }
  private pieceCenter(p: PieceView, x: number, y: number): { x: number; y: number } {
    const { w, h } = this.dimensions(p); return { x: this.ox + (x + w / 2) * this.S, y: this.oy + (y + h / 2) * this.S };
  }
  private targets(p: PieceView): SnapTarget[] {
    const def = this.def as PieceBoardDef;
    const targets: SnapTarget[] = [];
    for (let at = 0; at < def.cols * def.rows; at++) {
      const x = at % def.cols, y = Math.floor(at / def.cols);
      const t = { id: `${x},${y}`, ...this.pieceCenter(p, x, y) };
      if (this.canDrop(p, t)) targets.push(t);
    }
    return targets;
  }
  private canDrop(p: PieceView, t: SnapTarget): boolean {
    const def = this.def as PieceBoardDef, [x, y] = t.id.split(',').map(Number);
    const placement = { id: p.piece.id, x, y, turn: p.turn };
    const old = this.state as Placement[], next = placePiece(def, old, placement);
    if (next === old) return false;
    if (this.style.id !== 'tinker') return true;
    const solution = def.solution.find((q) => q.id === p.piece.id);
    const outline = def.outlines?.find((q) => q.id === p.piece.id)?.cells ?? (solution ? pieceCells(def, solution) : null);
    const covered = pieceCells(def, placement);
    return !outline || !!covered && covered.length === outline.length && covered.every((at) => outline.includes(at));
  }
  private dropPiece(p: PieceView, t: SnapTarget | null): void {
    const before = p.before ?? clone(this.state as Placement[]); p.before = undefined;
    if (!t && p.obj.y > 548 && before.some((q) => q.id === p.piece.id)) {
      this.state = before.filter((q) => q.id !== p.piece.id) as typeof this.state;
      this.refresh(); sfx.clunk(); this.act(() => { this.state = clone(before) as typeof this.state; }); return;
    }
    if (!t || !this.canDrop(p, t)) {
      this.state = before as typeof this.state; this.refresh(); sfx.nuhUh(); return;
    }
    const [x, y] = t.id.split(',').map(Number);
    this.state = placePiece(this.def as PieceBoardDef, this.state as Placement[], { id: p.piece.id, x, y, turn: p.turn }) as typeof this.state;
    this.selected = null; this.refresh(); this.clunkAt(t.x, t.y);
    this.act(() => { this.state = clone(before) as typeof this.state; });
  }
  private rotateSelected(): void {
    const p = this.parts.find((q) => q.piece.id === this.selected);
    if (!p || this.fixed && this.launch.mode !== 'playground') { sfx.nuhUh(); return; }
    const before = clone(this.state as Placement[]), oldTurn = p.turn;
    p.turn = (p.turn + 1) % 4;
    const placed = before.find((q) => q.id === p.piece.id);
    if (placed) {
      const reduced = before.filter((q) => q.id !== p.piece.id);
      const next = placePiece(this.def as PieceBoardDef, reduced, { ...placed, turn: p.turn });
      this.state = (next === reduced ? reduced : next) as typeof this.state;
    }
    this.refresh(); sfx.ratchet(1);
    this.act(() => { p.turn = oldTurn; this.state = clone(before) as typeof this.state; });
  }
  private paintPiece(p: PieceView, i: number): void {
    const cells = this.cells(p), { w, h } = this.dimensions(p), s = this.S;
    const color = PIECE_COLORS[i % PIECE_COLORS.length]; p.g.clear();
    const g = p.g;
    const has = new Set(cells.map((c) => `${c.x},${c.y}`));
    const shadow = this.def.kind === 'shadow';
    // one solid shape (squares joined edge to edge), so a piece reads as one tool or one present
    const body = shadow ? 0xaab4ae : color;
    g.fillStyle(0x000000, 0.25);
    for (const c of cells) g.fillRect((c.x - w / 2) * s + 4, (c.y - h / 2) * s + 6, s, s);
    g.fillStyle(body, 1);
    for (const c of cells) g.fillRect((c.x - w / 2) * s, (c.y - h / 2) * s, s, s);
    g.fillStyle(0xffffff, 0.18);
    for (const c of cells) if (!has.has(`${c.x},${c.y - 1}`)) g.fillRect((c.x - w / 2) * s + 3, (c.y - h / 2) * s + 3, s - 6, s * 0.22);
    if (!shadow) {
      // wrapping paper: a ribbon through the middle row and column, and a bow
      const midX = Math.floor((w - 1) / 2), midY = Math.floor((h - 1) / 2);
      g.fillStyle(CM.cream, 0.95);
      for (const c of cells) {
        const x = (c.x - w / 2) * s, y = (c.y - h / 2) * s;
        if (c.x === midX) g.fillRect(x + s * 0.4, y, s * 0.2, s);
        if (c.y === midY) g.fillRect(x, y + s * 0.4, s, s * 0.2);
      }
      const bow = has.has(`${midX},${midY}`) ? { x: midX, y: midY } : cells[0];
      const bx = (bow.x - w / 2 + 0.5) * s, by = (bow.y - h / 2 + 0.5) * s;
      g.fillStyle(CM.cream, 1);
      g.fillEllipse(bx - s * 0.18, by - s * 0.08, s * 0.34, s * 0.22);
      g.fillEllipse(bx + s * 0.18, by - s * 0.08, s * 0.34, s * 0.22);
      g.fillStyle(0xb5442c, 1);
      g.fillCircle(bx, by - s * 0.06, s * 0.08);
    }
    // the outline round the outside edge only
    const sel = this.selected === p.piece.id;
    g.lineStyle(sel ? 5 : 3, sel ? CM.glow : CM.ink, sel ? 1 : 0.85);
    for (const c of cells) {
      const x = (c.x - w / 2) * s, y = (c.y - h / 2) * s;
      if (!has.has(`${c.x},${c.y - 1}`)) g.lineBetween(x, y, x + s, y);
      if (!has.has(`${c.x},${c.y + 1}`)) g.lineBetween(x, y + s, x + s, y + s);
      if (!has.has(`${c.x - 1},${c.y}`)) g.lineBetween(x, y, x, y + s);
      if (!has.has(`${c.x + 1},${c.y}`)) g.lineBetween(x + s, y, x + s, y + s);
    }
    if (shadow) this.drawTool(g, p.piece.art, Math.min(w, h) * s * 0.42 + Math.max(w, h) * s * 0.08);
    p.restScale = Math.min(0.78, 86 / (Math.max(w, h) * s));
    const placed = (this.state as Placement[]).some((q) => q.id === p.piece.id);
    const hitW = placed ? w * s + 14 : Math.max(w * s + 14, 88 / p.restScale);
    const hitH = placed ? h * s + 14 : Math.max(h * s + 14, 88 / p.restScale);
    p.obj.setSize(hitW, hitH);
    if (p.obj.input) {
      p.obj.input.hitArea = new Phaser.Geom.Rectangle(0, 0, hitW, hitH);
      p.obj.input.hitAreaCallback = (_area, x, y) => !placed ? x >= 0 && x <= hitW && y >= 0 && y <= hitH : cells.some((c) => x >= c.x * s + 5 && x <= (c.x + 1) * s + 9 && y >= c.y * s + 5 && y <= (c.y + 1) * s + 9);
    }
    p.obj.setData('turn', p.turn);
  }
  /** A big tool drawing across a tool piece, centred: wrench, hammer, screwdriver-screw or saw. */
  private drawTool(g: G, art: string, r: number): void {
    const ink = CM.ink;
    if (art.includes('hammer')) {
      g.fillStyle(0x8a5a34, 1); g.fillRoundedRect(-r * 0.12, -r * 0.5, r * 0.24, r * 1.4, 4);
      g.fillStyle(0x5d6a66, 1); g.fillRoundedRect(-r * 0.62, -r * 0.82, r * 1.24, r * 0.42, 5);
      g.lineStyle(2, ink, 0.9); g.strokeRoundedRect(-r * 0.62, -r * 0.82, r * 1.24, r * 0.42, 5);
    } else if (art.includes('screw')) {
      g.fillStyle(0x5d6a66, 1); g.fillRoundedRect(-r * 0.16, -r * 0.6, r * 0.32, r * 1.5, 4);
      g.lineStyle(2, ink, 0.8);
      for (let k = 0; k < 5; k++) g.lineBetween(-r * 0.2, -r * 0.4 + k * r * 0.26, r * 0.2, -r * 0.3 + k * r * 0.26);
      g.fillStyle(0xbca16a, 1); g.fillEllipse(0, -r * 0.7, r * 0.7, r * 0.3);
      g.lineStyle(3, ink, 0.9); g.lineBetween(-r * 0.2, -r * 0.7, r * 0.2, -r * 0.7);
    } else if (art.includes('saw')) {
      g.fillStyle(0xd9dfdc, 1); g.fillTriangle(-r * 0.8, -r * 0.5, r * 0.6, -r * 0.5, -r * 0.8, r * 0.7);
      g.lineStyle(2, ink, 0.9); g.strokeTriangle(-r * 0.8, -r * 0.5, r * 0.6, -r * 0.5, -r * 0.8, r * 0.7);
      for (let k = 0; k < 6; k++) { const t = k / 6; g.lineBetween(-r * 0.8 + t * r * 1.4, -r * 0.5 + t * r * 1.2, -r * 0.7 + t * r * 1.4, -r * 0.5 + t * r * 1.2 + 6); }
      g.fillStyle(0x8a5a34, 1); g.fillRoundedRect(r * 0.4, -r * 0.75, r * 0.45, r * 0.5, 5);
    } else {
      // wrench: a handle with an open jaw at the top
      g.fillStyle(0x5d6a66, 1); g.fillRoundedRect(-r * 0.14, -r * 0.3, r * 0.28, r * 1.2, 5);
      g.lineStyle(r * 0.24, 0x5d6a66, 1); g.beginPath(); g.arc(0, -r * 0.5, r * 0.32, Math.PI * 0.15, Math.PI * 0.85, true); g.strokePath();
      g.lineStyle(2, ink, 0.8); g.beginPath(); g.arc(0, -r * 0.5, r * 0.46, Math.PI * 0.15, Math.PI * 0.85, true); g.strokePath();
    }
  }

  private paintBoard(): void {
    const g = this.boardG, def = this.def as PieceBoardDef; g.clear();
    for (const at of def.board) {
      const x = this.ox + at % def.cols * this.S, y = this.oy + Math.floor(at / def.cols) * this.S;
      g.fillStyle(def.kind === 'shadow' ? CM.tealDark : CM.woodLight, 1); g.fillRoundedRect(x + 1, y + 1, this.S - 2, this.S - 2, 5);
      g.lineStyle(1, CM.cream, 0.2); g.strokeRoundedRect(x + 3, y + 3, this.S - 6, this.S - 6, 5);
    }
    // each tool's shadow on the wall: one solid silhouette hanging from a hook
    for (const outline of def.outlines ?? []) {
      if ((this.state as Placement[]).some((p) => p.id === outline.id)) continue;
      const has = new Set(outline.cells);
      g.fillStyle(CM.ink, this.style.id === 'tinker' ? 0.62 : 0.48);
      for (const at of outline.cells) g.fillRect(this.ox + at % def.cols * this.S + 2, this.oy + Math.floor(at / def.cols) * this.S + 2, this.S - 4 + (has.has(at + 1) && (at + 1) % def.cols ? 4 : 0), this.S - 4 + (has.has(at + def.cols) ? 4 : 0));
      const top = Math.min(...outline.cells);
      const hx = this.ox + (top % def.cols + 0.5) * this.S, hy = this.oy + Math.floor(top / def.cols) * this.S;
      g.fillStyle(CM.brass, 1); g.fillCircle(hx, hy - 4, 7);
      g.lineStyle(3, CM.ink, 0.8); g.strokeCircle(hx, hy - 4, 7);
    }
  }
  protected refresh(): void {
    this.paintBoard();
    this.parts.forEach((p, i) => {
      const at = (this.state as Placement[]).find((q) => q.id === p.piece.id);
      if (at) p.turn = at.turn;
      this.paintPiece(p, i);
      const center = at ? this.pieceCenter(p, at.x, at.y) : p.home;
      p.obj.setPosition(center.x, center.y).setScale(at ? 1 : p.restScale).setDepth(at ? D.parts : D.trayPart);
      p.obj.setData('placement', at ?? null);
    });
    this.turnButton?.setAlpha(this.selected ? 1 : 0.65);
  }
  protected hintTarget(): HintTarget | null {
    const def = this.def as PieceBoardDef;
    const needed = def.solution.find((q) => !(this.state as Placement[]).some((p) => p.id === q.id && p.x === q.x && p.y === q.y && p.turn === q.turn));
    if (!needed) return null;
    const p = this.parts.find((q) => q.piece.id === needed.id)!;
    if (p.turn !== needed.turn && this.selected === p.piece.id && this.turnButton) return { from: { x: p.obj.x, y: p.obj.y }, to: { x: this.turnButton.x, y: this.turnButton.y } };
    const targetCells = pieceCells(def, needed) ?? [];
    const obstruction = (this.state as Placement[]).find((q) => q.id !== needed.id && (pieceCells(def, q) ?? []).some((at) => targetCells.includes(at)));
    if (obstruction) { const blocker = this.parts.find((q) => q.piece.id === obstruction.id)!; return { from: { x: blocker.obj.x, y: blocker.obj.y }, to: blocker.home }; }
    const cells = rotateCells(p.piece.cells, needed.turn), w = 1 + Math.max(...cells.map((c) => c.x)), h = 1 + Math.max(...cells.map((c) => c.y));
    return { from: { x: p.obj.x, y: p.obj.y }, to: { x: this.ox + (needed.x + w / 2) * this.S, y: this.oy + (needed.y + h / 2) * this.S } };
  }
  protected drawGhosts(g: G, alpha: number): void {
    const def = this.def as PieceBoardDef;
    for (const placement of def.solution) {
      if ((this.state as Placement[]).some((p) => p.id === placement.id)) continue;
      for (const at of pieceCells(def, placement) ?? []) {
        g.lineStyle(3, CM.glow, alpha); g.strokeRoundedRect(this.ox + at % def.cols * this.S + 4, this.oy + Math.floor(at / def.cols) * this.S + 4, this.S - 8, this.S - 8, 6);
      }
    }
  }
  protected solutionSteps(): number { return (this.def as PieceBoardDef).pieces.length; }
  protected rewind(): void { if (!this.parts.some((p) => p.before)) super.rewind(); }
}

export class ShadowRoom extends PieceRoom<'shadow'> { constructor() { super('room-shadow'); } }
export class PackingRoom extends PieceRoom<'packing'> { constructor() { super('room-packing'); } }

/** Legal sliding-photo moves: a tile can enter only the adjacent empty square. */
export class SlideRoom extends RoomBase<'slide'> {
  private views = new Map<number, Phaser.GameObjects.Container>();
  private S = 110; private ox = 0; private oy = 0; private preview!: Phaser.GameObjects.Image;
  private numberLabels: Phaser.GameObjects.Text[] = [];
  private moving = false;
  private blankG!: G;
  private completedPhoto!: Phaser.GameObjects.Image;
  private hintKey = ''; private hintAt: number | null = null;
  constructor() { super('room-slide'); }

  protected build(): void {
    this.views = new Map(); this.numberLabels = []; this.moving = false; this.hintKey = ''; this.hintAt = null;
    const n = this.def.size; this.S = Math.min(165, 330 / n);
    this.ox = 640 - n * this.S / 2; this.oy = 334 - n * this.S / 2;
    const g = this.add.graphics().setDepth(D.mech);
    etchedPlate(g, this.ox - 18, this.oy - 18, n * this.S + 36, n * this.S + 36, CM.woodDark, 1, 126);
    this.blankG = this.add.graphics().setDepth(D.mech + 1);
    const key = familyPhoto(this, 'puzzle:locket-family-photo');
    withArt(this, 'puzzle-props', (propsKey) => { familyPhoto(this, key, propsKey); });
    this.preview = this.add.image(949, 295, key).setDisplaySize(144, 144).setDepth(D.parts).setName('slide:solved-preview');
    const finalFrame = `slide:${n}:complete-square`, cut = 480 / n;
    if (!this.textures.get(key).has(finalFrame)) this.textures.get(key).add(finalFrame, 0, 480 - cut, 480 - cut, cut, cut);
    const end = this.cell(n * n - 1);
    this.completedPhoto = this.add.image(end.x - 1, end.y - 1, key, finalFrame).setDisplaySize(this.S - 9, this.S - 9).setDepth(D.parts).setVisible(false).setName('slide:completion-square');
    etchedPlate(g, 865, 211, 168, 168, CM.copper, 1, 771);
    prop(this, 5, 310, 330, 170);
    for (let value = 1; value < n * n; value++) {
      const c = this.add.container(0, 0).setDepth(D.parts).setSize(this.S, this.S).setInteractive({ useHandCursor: true })
        .setName(`slide:tile:${value}`).setData('qa', { action: 'slide', value });
      const backing = this.add.graphics(); bevelCell(backing, -this.S / 2, -this.S / 2, this.S + 2, CM.paper);
      const sourceAt = value - 1, frame = `slide:${n}:${value}`;
      if (!this.textures.get(key).has(frame)) this.textures.get(key).add(frame, 0, sourceAt % n * 480 / n, Math.floor(sourceAt / n) * 480 / n, 480 / n, 480 / n);
      const image = this.add.image(-1, -1, key, frame).setDisplaySize(this.S - 9, this.S - 9);
      c.add([backing, image]);
      if (this.style.id === 'engineer') {
        const label = this.add.text(-this.S / 2 + 9, -this.S / 2 + 8, String(value), { fontFamily: FONT, fontSize: '16px', color: '#342f29', backgroundColor: '#f4ebd5', padding: { x: 4, y: 1 } });
        c.add(label); this.numberLabels.push(label);
      }
      c.on('pointerup', () => this.move(value)); this.views.set(value, c);
    }
    const eye = roundButton(this, 949, 422, '👁', () => this.preview.setVisible(!this.preview.visible), { r: 32, fontSize: 30, say: 'Look at the complete photograph' });
    eye.setDepth(D.widget).setName('slide:preview-button').setData('qa', { action: 'preview' });
  }
  private cell(at: number): { x: number; y: number } { return { x: this.ox + (at % this.def.size + 0.5) * this.S, y: this.oy + (Math.floor(at / this.def.size) + 0.5) * this.S }; }
  private move(value: number): void {
    if (this.fixed && this.launch.mode !== 'playground' || this.moving) return;
    const at = this.state.tiles.indexOf(value), next = slideMove(this.def, this.state, at);
    if (next === this.state) { sfx.nuhUh(); const obj = this.views.get(value)!; this.tweens.add({ targets: obj, angle: 3, duration: 65, yoyo: true, repeat: 1 }); return; }
    const before = clone(this.state); this.state = next; this.moving = true;
    const center = this.cell(this.state.tiles.indexOf(value));
    this.tweens.add({ targets: this.views.get(value), x: center.x, y: center.y, duration: 170, ease: 'Sine.easeInOut', onComplete: () => { this.moving = false; this.refresh(); this.act(() => { this.state = clone(before); }); } });
    sfx.clunk();
  }
  protected refresh(): void {
    this.views.forEach((obj, value) => { const c = this.cell(this.state.tiles.indexOf(value)); obj.setPosition(c.x, c.y).setData('cell', this.state.tiles.indexOf(value)); });
    const empty = this.cell(this.state.tiles.indexOf(0)); this.blankG.clear();
    this.blankG.fillStyle(CM.ink, 0.72); this.blankG.fillRoundedRect(empty.x - this.S / 2 + 3, empty.y - this.S / 2 + 3, this.S - 6, this.S - 6, 7);
    this.blankG.lineStyle(2, CM.copperLight, 0.9); this.blankG.strokeRoundedRect(empty.x - this.S / 2 + 6, empty.y - this.S / 2 + 6, this.S - 12, this.S - 12, 5);
    const complete = slideSolved(this.def, this.state); this.completedPhoto.setVisible(complete); this.blankG.setVisible(!complete);
  }
  protected hintTarget(): HintTarget | null {
    const at = this.nextSlide(); return at === null ? null : { from: this.cell(at), to: this.cell(this.state.tiles.indexOf(0)) };
  }
  private nextSlide(): number | null {
    const key = this.state.tiles.join(',');
    if (key !== this.hintKey) { this.hintKey = key; this.hintAt = slideHint(this.def, this.state); }
    return this.hintAt;
  }
  protected drawGhosts(g: G, alpha: number): void {
    const next = this.nextSlide(); if (next === null) return;
    const c = this.cell(next); g.lineStyle(4, CM.glow, alpha); g.strokeRoundedRect(c.x - this.S / 2 + 3, c.y - this.S / 2 + 3, this.S - 6, this.S - 6, 7);
  }
  protected solutionSteps(): number { return this.def.solutionMoves.length; }
  protected rewind(): void { if (!this.moving) super.rewind(); }
}

/** Mirror a real cake decoration rather than matching written labels. */
export class SymmetryRoom extends RoomBase<'symmetry'> {
  private g!: G; private selected = ''; private S = 60; private ox = 0; private oy = 0;
  private tokens: Array<{ token: string; obj: Phaser.GameObjects.Container; g: G; home: { x: number; y: number } }> = [];
  constructor() { super('room-symmetry'); }
  protected build(): void {
    this.tokens = []; this.selected = this.def.palette[0]; this.S = Math.min(79, 330 / this.def.size);
    this.ox = 640 - this.def.size * this.S / 2; this.oy = 332 - this.def.size * this.S / 2;
    this.g = this.add.graphics().setDepth(D.mech); prop(this, 6, 310, 330, 158);
    const homes = this.traySpots(this.def.palette.length);
    this.def.palette.forEach((token, i) => {
      const obj = this.add.container(homes[i].x, homes[i].y).setDepth(D.trayPart).setSize(70, 70).setName(`symmetry:decoration:${token}`).setData('qa', { action: 'decoration', token });
      const g = this.add.graphics(); obj.add(g);
      const part = { token, obj, g, home: homes[i] }; this.tokens.push(part);
      this.enableDrag({ obj, restScale: 1, targets: () => this.openCells().map((at) => ({ id: String(at), ...this.cell(at) })),
        accepts: () => true, drop: (t) => { if (t) this.put(Number(t.id), token); obj.setPosition(part.home.x, part.home.y).setScale(1).setDepth(D.trayPart); },
      });
      obj.on('pointerup', (p: Phaser.Input.Pointer) => { if (p.getDistance() < 8) { this.selected = token; this.refresh(); sfx.tick(); } });
    });
    for (let at = 0; at < this.def.size ** 2; at++) {
      if (this.def.seeds.some((seed) => seed.at === at)) continue;
      const c = this.cell(at);
      this.add.zone(c.x, c.y, this.S, this.S).setDepth(D.mech + 1).setInteractive({ useHandCursor: true }).setName(`symmetry:cell:${at}`).setData('qa', { action: 'mirror', at })
        .on('pointerup', () => this.put(at, this.state[at] === this.selected ? '' : this.selected));
    }
  }
  private cell(at: number): { x: number; y: number } { return { x: this.ox + (at % this.def.size + 0.5) * this.S, y: this.oy + (Math.floor(at / this.def.size) + 0.5) * this.S }; }
  private openCells(): number[] { return Array.from({ length: this.def.size ** 2 }, (_, i) => i).filter((at) => !this.def.seeds.some((seed) => seed.at === at)); }
  private put(at: number, token: string): void {
    if (this.fixed && this.launch.mode !== 'playground') return; const next = symmetrySet(this.def, this.state, at, token); if (next === this.state) return;
    const before = clone(this.state); this.state = next; this.refresh(); sfx.pop(); const c = this.cell(at); this.sparkleAt(c.x, c.y, 4);
    this.act(() => { this.state = clone(before); });
  }
  protected refresh(): void {
    const g = this.g; g.clear(); const w = this.def.size * this.S;
    g.fillStyle(CM.ink, 0.3); g.fillEllipse(643, 341, w + 82, w + 68);
    g.fillStyle(CM.copperDark, 1); g.fillEllipse(640, 335, w + 74, w + 64);
    g.fillStyle(0xbb916d, 1); g.fillRoundedRect(this.ox - 18, this.oy - 2, w + 36, w + 40, 48);
    g.lineStyle(7, CM.cream, 0.8); g.lineBetween(this.ox + 20, this.oy + w + 19, this.ox + w - 20, this.oy + w + 19);
    g.fillStyle(CM.cream, 1); g.fillRoundedRect(this.ox - 18, this.oy - 23, w + 36, w + 29, 48);
    g.lineStyle(3, CM.copperLight, 1); g.strokeRoundedRect(this.ox - 18, this.oy - 23, w + 36, w + 29, 48);
    for (let x = this.ox + 24; x <= this.ox + w - 24; x += 18) {
      for (const y of [this.oy - 14, this.oy + w - 4]) {
        g.fillStyle(CM.paperDark, 0.5); g.fillCircle(x + 1, y + 2, 6);
        g.fillStyle(0xfff5df, 1); g.fillCircle(x, y, 5.5);
      }
    }
    for (let i = 0; i < this.def.size ** 2; i++) {
      const c = this.cell(i), token = this.state[i];
      if (token) { const d = symbol(token); decoration(g, c.x, c.y, d.kind, d.color, Math.min(23, this.S * 0.29)); }
      else { g.fillStyle(CM.paperDark, 0.55); g.fillCircle(c.x, c.y, 3.5); }
      if (this.def.seeds.some((seed) => seed.at === i)) { g.lineStyle(1.3, CM.inkSoft, 0.45); g.strokeCircle(c.x, c.y, this.S * 0.4); }
    }
    g.lineStyle(2, CM.teal, 0.7);
    for (let y = this.oy - 12; y < this.oy + w + 10; y += 15) g.lineBetween(640, y, 640, y + 7);
    if (this.def.mirrors === 'both') for (let x = this.ox - 12; x < this.ox + w + 10; x += 15) g.lineBetween(x, this.oy + w / 2, x + 7, this.oy + w / 2);
    this.tokens.forEach((part) => {
      part.g.clear(); const d = symbol(part.token); decoration(part.g, 0, 0, d.kind, d.color, 23);
      if (part.token === this.selected) { part.g.lineStyle(3, CM.glow, 1); part.g.strokeCircle(0, 0, 31); }
    });
  }
  protected hintTarget(): HintTarget | null {
    const need = this.def.solution.find((q) => this.state[q.at] !== q.token); if (!need) return null;
    const token = this.tokens.find((q) => q.token === need.token); return { from: token?.home, to: this.cell(need.at) };
  }
  protected drawGhosts(g: G, alpha: number): void {
    for (const q of this.def.solution) if (this.state[q.at] !== q.token) { const c = this.cell(q.at), d = symbol(q.token); decoration(g, c.x, c.y, d.kind, d.color, Math.min(23, this.S * 0.29), alpha * 0.5); }
  }
  protected solutionSteps(): number { return this.def.solution.length - this.def.seeds.length; }
}

/** One tilt rolls every marble; walls stop them and holes send them back. */
export class TiltRoom extends RoomBase<'tilt'> {
  private g!: G; private balls: Phaser.GameObjects.Container[] = []; private arrows: Partial<Record<Direction, Phaser.GameObjects.Container>> = {};
  private S = 55; private ox = 0; private oy = 0; private rolling = false;
  private hintKey = ''; private hintDirection: Direction | null = null;
  constructor() { super('room-tilt'); }
  protected build(): void {
    this.balls = []; this.arrows = {}; this.rolling = false; this.hintKey = ''; this.hintDirection = null;
    this.S = Math.min(76, 620 / this.def.cols, 315 / this.def.rows); this.ox = 615 - this.def.cols * this.S / 2; this.oy = 330 - this.def.rows * this.S / 2;
    this.g = this.add.graphics().setDepth(D.mech); prop(this, 12, 300, 334, 132);
    this.def.initial.forEach((_, i) => {
      const c = this.add.container(0, 0).setDepth(D.parts + 2).setName(`tilt:marble:${i}`).setData('qa', { action: 'marble', index: i });
      const g = this.add.graphics(), r = this.S * 0.28;
      g.fillStyle(CM.ink, 0.4); g.fillEllipse(3, r * 0.65, r * 2.2, r * 1.1);
      g.fillStyle(i ? 0xba786d : CM.teal, 1); g.fillCircle(0, 0, r); g.lineStyle(2, CM.ink, 1); g.strokeCircle(0, 0, r);
      g.lineStyle(3, CM.cream, 0.8); g.beginPath(); g.arc(-1, -1, r * 0.68, Math.PI, Math.PI * 1.7); g.strokePath();
      g.fillStyle(CM.cream, 0.8); g.fillCircle(-r * 0.34, -r * 0.35, r * 0.19); c.add(g); this.balls.push(c);
    });
    const positions: Record<Direction, { x: number; y: number; icon: string }> = {
      up: { x: 1035, y: 272, icon: '↑' }, right: { x: 1100, y: 338, icon: '→' }, down: { x: 1035, y: 404, icon: '↓' }, left: { x: 970, y: 338, icon: '←' },
    };
    (Object.keys(positions) as Direction[]).forEach((dir) => {
      const p = positions[dir]; this.arrows[dir] = roundButton(this, p.x, p.y, p.icon, () => this.roll(dir), { r: 31, fontSize: 34, say: `Tilt ${dir}` })
        .setDepth(D.widget).setName(`tilt:${dir}`).setData('qa', { action: 'tilt', direction: dir });
    });
    roundButton(this, 1035, 487, '↻', () => this.resetMarbles(), { r: 30, fontSize: 30, say: 'Put the marbles back' }).setDepth(D.widget).setName('tilt:reset').setData('qa', { action: 'reset' });
    this.input.keyboard?.on('keydown', this.arrowKey, this);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.arrowKey, this));
  }
  private arrowKey(event: KeyboardEvent): void {
    const direction = ({ ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' } as Record<string, Direction>)[event.key];
    if (direction) { event.preventDefault(); this.roll(direction); }
  }
  private cell(at: number): { x: number; y: number } { return { x: this.ox + (at % this.def.cols + 0.5) * this.S, y: this.oy + (Math.floor(at / this.def.cols) + 0.5) * this.S }; }
  private roll(direction: Direction): void {
    if (this.fixed && this.launch.mode !== 'playground' || this.rolling) return;
    const next = tiltMove(this.def, this.state, direction); if (next === this.state) { sfx.tick(); return; }
    const before = clone(this.state); this.state = next; this.rolling = true;
    this.arrows[direction]?.setScale(0.91); this.time.delayedCall(180, () => this.arrows[direction]?.setScale(1));
    this.balls.forEach((ball, i) => {
      const c = this.cell(this.state.marbles[i]);
      this.tweens.add({ targets: ball, x: c.x, y: c.y, rotation: ball.rotation + 2.4, duration: 330, ease: 'Quad.easeInOut' });
    });
    sfx.whirr(); this.time.delayedCall(350, () => { this.rolling = false; this.refresh(); this.act(() => { this.state = clone(before); }); });
  }
  private resetMarbles(): void {
    if (this.fixed && this.launch.mode !== 'playground' || this.rolling) return;
    const before = clone(this.state); this.state = { marbles: [...this.def.initial], moves: this.state.moves + 1 };
    this.refresh(); sfx.whirr(); this.act(() => { this.state = clone(before); });
  }
  protected refresh(): void {
    const g = this.g; g.clear(); const w = this.def.cols * this.S, h = this.def.rows * this.S;
    etchedPlate(g, this.ox - 18, this.oy - 18, w + 36, h + 36, CM.woodDark, 1, 981);
    for (let at = 0; at < this.def.cols * this.def.rows; at++) {
      const c = this.cell(at), x = c.x - this.S / 2, y = c.y - this.S / 2;
      if (this.def.walls.includes(at)) bevelCell(g, x + 1, y + 1, this.S + 2, CM.tealDark);
      else { g.fillStyle(CM.paper, 1); g.fillRoundedRect(x + 1, y + 1, this.S - 2, this.S - 2, 4); g.lineStyle(1, CM.woodLight, 0.5); g.strokeRoundedRect(x + 3, y + 3, this.S - 6, this.S - 6, 4); }
      if (this.def.holes.includes(at)) {
        // a hole: dark and deep, with a curved arrow — it sends the marble back to the start
        const r = this.S * 0.3;
        g.fillStyle(0x0d0907, 1); g.fillCircle(c.x, c.y, r);
        g.lineStyle(3, CM.copper, 1); g.strokeCircle(c.x, c.y, r + 2);
        g.lineStyle(3, CM.cream, 0.85); g.beginPath(); g.arc(c.x, c.y, r * 0.55, Math.PI * 0.2, Math.PI * 1.6, false); g.strokePath();
        const ax = c.x + Math.cos(Math.PI * 1.6) * r * 0.55, ay = c.y + Math.sin(Math.PI * 1.6) * r * 0.55;
        g.fillStyle(CM.cream, 0.9); g.fillTriangle(ax + 6, ay + 2, ax - 3, ay - 6, ax - 2, ay + 7);
      }
      const goal = this.def.goals.indexOf(at);
      if (goal >= 0) {
        // a cup in its marble's colour, seen from above: rim, inside and a highlight
        const col = goal ? 0xba786d : CM.teal;
        const r = this.S * 0.36;
        g.fillStyle(0x000000, 0.25); g.fillCircle(c.x + 2, c.y + 3, r);
        g.fillStyle(col, 1); g.fillCircle(c.x, c.y, r);
        g.fillStyle(Phaser.Display.Color.IntegerToColor(col).darken(35).color, 1); g.fillCircle(c.x, c.y + 2, r * 0.68);
        g.lineStyle(2, CM.ink, 0.9); g.strokeCircle(c.x, c.y, r);
        g.lineStyle(3, 0xffffff, 0.55); g.beginPath(); g.arc(c.x, c.y, r * 0.84, Math.PI * 1.1, Math.PI * 1.5, false); g.strokePath();
      }
    }
    this.balls.forEach((ball, i) => { const c = this.cell(this.state.marbles[i]); ball.setPosition(c.x, c.y).setData('cell', this.state.marbles[i]); });
  }
  private nextDirection(): Direction | null {
    const key = this.state.marbles.join(',');
    if (key !== this.hintKey) { this.hintKey = key; this.hintDirection = tiltHint(this.def, this.state); }
    return this.hintDirection;
  }
  protected hintTarget(): HintTarget | null { const direction = this.nextDirection(), button = direction ? this.arrows[direction] : null; return button ? { to: { x: button.x, y: button.y } } : null; }
  protected drawGhosts(g: G, alpha: number): void {
    const direction = this.nextDirection(), button = direction ? this.arrows[direction] : null;
    if (button) { g.lineStyle(4, CM.glow, alpha); g.strokeCircle(button.x, button.y, 37); }
  }
  protected solutionSteps(): number { return this.def.solution.length; }
  protected rewind(): void { if (!this.rolling) super.rewind(); }
}
