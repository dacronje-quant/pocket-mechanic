/**
 * The Invention Bench (GDD §22): a pegboard where gears and gadgets snap onto
 * pegs and run on the same Mechanism Graph as the rooms. Free Build, 30
 * Contraption Cards checked by the engine, Contraption Codes to share a
 * machine by typing a short code on another device (no internet), saved
 * creations, the Peek Lens power view, and Magnus's Nest Studio. Little
 * Tinkers get the Toy Box: one chunky gear size that always meshes and a
 * machine that is always running.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { speak } from '../audio/voice';
import { drawRoomBackdrop } from '../art/backgrounds';
import { CM, drawPatina } from '../art/copperMoss';
import { drawerFinish, etchedPlate } from '../art/finish';
import { drawPart } from '../art/parts';
import { ensureGearTexture } from '../art/textures';
import {
  BENCH,
  BENCH_TEETH,
  canPlaceBenchGear,
  CARDS,
  cardSolved,
  CODE_ALPHABET,
  decodeBench,
  encodeBench,
  isSource,
  PEG_COUNT,
  pegPos,
  runBench,
  type BenchGear,
  type BenchRun,
  type BenchState,
  type ContraptionCard,
  type GadgetKind,
} from '../content/bench';
import { hashString } from '../mechanism/rng';
import { benchGadgets, checkStamps, repairDone, setFlag } from '../core/progress';
import { persist, profile } from '../core/save';
import { blocker, card, FONT, keypad, roundButton, SERIF, scrollGrid, setButtonIcon, showWords, tile, toast } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';
import { go } from './router';

const GADGET_ART: Record<GadgetKind, string> = {
  crank: 'crank',
  motor: 'motor',
  weights: 'weights',
  waterwheel: 'waterwheel',
  bell: 'bell',
  fan: 'fan',
  flag: 'flag',
  lamp: 'bulb',
  dancer: 'fox',
  drum: 'cylinder',
  cuckoo: 'bird',
  spinner: 'gear',
  hands: 'hands',
  fountain: 'pump',
  lift: 'pulley',
};

const NAME_A = ['Whirly', 'Jolly', 'Clanky', 'Speedy', 'Sleepy', 'Shiny', 'Bouncy', 'Tiny', 'Mighty', 'Giggly'];
const NAME_B = ['Bell-o-matic', 'Fan Machine', 'Gizmo', 'Contraption', 'Whirligig', 'Doodad', 'Tick-Tocker', 'Spinner', 'Wonder-Box', 'Thingamajig'];

interface Carry {
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  gear?: { teeth: number };
  gadget?: { kind: GadgetKind; id?: string };
}

export class BenchScene extends MetaScene {
  private state: BenchState = { gears: [], gadgets: [] };
  private cardDef: ContraptionCard | null = null;
  private undo: string[] = [];
  private running = false;
  private peeking = false;
  private run!: BenchRun;
  private gearImgs = new Map<string, Phaser.GameObjects.Image>();
  private gadgetObjs = new Map<string, Phaser.GameObjects.Container>();
  private layer!: Phaser.GameObjects.Container;
  private peekG!: Phaser.GameObjects.Graphics;
  private carry: Carry | null = null;
  private panel: Phaser.GameObjects.GameObject[] = [];
  private goalText?: Phaser.GameObjects.Text;
  private runBtn!: Phaser.GameObjects.Container;
  private t = 0;
  private toy = false;
  private solvedShown = false;

  constructor() {
    super('bench');
  }

  protected build(): void {
    const p = profile();
    this.toy = p.style === 'tinker';
    this.state = { gears: [], gadgets: [] };
    this.cardDef = null;
    this.undo = [];
    this.running = this.toy;
    this.peeking = false;
    this.carry = null;
    this.panel = [];
    this.gearImgs = new Map();
    this.gadgetObjs = new Map();
    this.solvedShown = false;
    drawRoomBackdrop(this, 'bench', 700).setDepth(0);
    this.bubble.setY(110);
    this.board();
    this.layer = this.add.container(0, 0).setDepth(10);
    this.peekG = this.add.graphics().setDepth(30);
    this.tray();
    this.hud();
    this.music('bench', 0.7);
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => this.carry?.obj.setPosition(ptr.x, ptr.y));
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => this.drop(ptr));
    this.refresh();
    this.time.delayedCall(400, () => this.line('shop.bench'));
    this.hot('card', () => this.cardsPanel());
    this.hot('solveCard', () => {
      if (!this.cardDef) return;
      this.pushUndo();
      this.state.gears = this.cardDef.solution.map((g) => ({ ...g }));
      this.refresh();
    });
  }

  // ───────────────────────────── layout ─────────────────────────────

  private board(): void {
    const g = this.add.graphics().setDepth(2);
    etchedPlate(g, BENCH.x0 - 90, BENCH.y0 - 80, BENCH.step * (BENCH.cols - 1) + 180, BENCH.step * (BENCH.rows - 1) + 160, CM.woodLight, 1, 745);
    g.lineStyle(0.6, CM.ink, 0.11);
    for (let yy = BENCH.y0 - 60; yy < BENCH.y0 + BENCH.step * (BENCH.rows - 1) + 65; yy += 18) {
      g.lineBetween(BENCH.x0 - 75, yy, BENCH.x0 + BENCH.step * (BENCH.cols - 1) + 75, yy + 2);
    }
    for (let i = 0; i < PEG_COUNT; i++) {
      const { x, y } = pegPos(i);
      g.fillStyle(0x554638, 1);
      g.fillCircle(x, y, 9);
      g.fillStyle(0xbca16a, 1);
      g.fillCircle(x, y, 5);
    }
  }

  private trayGearSizes(): number[] {
    if (this.toy) return [20];
    return BENCH_TEETH;
  }

  private tray(): void {
    const p = profile();
    const g = this.add.graphics().setDepth(40);
    g.fillStyle(0x342f29, 0.95);
    g.fillRoundedRect(20, 588, 1240, 124, 20);
    drawerFinish(g, 20, 588, 1240, 124);
    this.trayGears = this.add.container(0, 0).setDepth(41);
    this.trayGadgets = this.add.container(0, 0).setDepth(41);
    const sizes = this.trayGearSizes();
    sizes.forEach((teeth, i) => {
      const x = 70 + i * 62;
      const y = 650;
      const img = this.add.image(x, y, ensureGearTexture(this, teeth, 'brass'));
      img.setScale(Math.min(1, 27 / (teeth * 2.5 + 5)));
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.pickNewGear(teeth, ptr));
      this.trayGears.add(img);
      if (p.style === 'engineer') this.trayGears.add(this.add.text(x, y + 34, String(teeth), { fontFamily: FONT, fontSize: '14px', color: '#f4ebd5' }).setOrigin(0.5));
    });
    this.refreshGadgetTray();
  }

  private trayGears!: Phaser.GameObjects.Container;
  private trayGadgets!: Phaser.GameObjects.Container;

  private refreshGadgetTray(): void {
    this.trayGadgets.removeAll(true);
    if (this.cardDef) return;
    const kinds = benchGadgets(profile());
    kinds.forEach((kind, i) => {
      const x = 720 + (i % 10) * 52;
      const y = 622 + Math.floor(i / 10) * 56;
      const c = this.gadgetIcon(kind, 0.42);
      c.setPosition(x, y).setSize(48, 48).setInteractive({ useHandCursor: true });
      c.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.pickNewGadget(kind, ptr));
      this.trayGadgets.add(c);
    });
  }

  private gadgetIcon(kind: GadgetKind, s: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(isSource(kind) ? CM.mossDark : CM.tealDark, 1);
    g.fillCircle(0, 0, 70 * s);
    g.fillStyle(0xf4ebd5, 1);
    g.fillCircle(0, 0, 60 * s);
    g.lineStyle(1.3, CM.copperDark, 0.9);
    g.strokeCircle(0, 0, 70 * s);
    drawPatina(g, -38 * s, -38 * s, 76 * s, 76 * s, 982, 1.2);
    if (kind === 'flag') {
      g.fillStyle(0x856c50, 1);
      g.fillRect(-16 * s, -40 * s, 6 * s, 80 * s);
      g.fillStyle(0xad6b51, 1);
      g.fillTriangle(-10 * s, -40 * s, 40 * s, -24 * s, -10 * s, -8 * s);
    } else drawPart(g, GADGET_ART[kind], 0, 0, s * 0.9);
    c.add(g);
    c.setData('g', g);
    return c;
  }

  private hud(): void {
    this.backButton();
    let x = 150;
    const btn = (icon: string, fn: () => void, say: string, name: string) => {
      const b = roundButton(this, x, 52, icon, fn, { r: 32, fontSize: 26, say }).setDepth(HUD);
      this.hot(name, fn);
      x += 78;
      return b;
    };
    this.runBtn = btn(this.running ? '⏸' : '▶', () => this.toggleRun(), 'Run', 'run');
    btn('↺', () => this.rewind(), 'Undo', 'undo');
    btn('🗑', () => this.clear(), 'Clear', 'clear');
    if (!this.toy) btn('🔍', () => this.togglePeek(), 'Peek', 'peek');
    btn('🃏', () => this.cardsPanel(), 'Contraption Cards', 'cards');
    if (!this.toy) btn('🔢', () => this.codePanel(), 'Contraption Code', 'code');
    btn('💾', () => this.saveBuild(), 'Save', 'save');
    btn('🖼', () => this.gallery(), 'My machines', 'gallery');
    if (repairDone(profile(), 8)) {
      btn('🪺', () => {
        this.sayQuiet('bench.nest');
        this.time.delayedCall(300, () => go(this, { scene: 'room', launch: { roomId: '8-7', mode: 'free' } }));
      }, 'Nest Studio', 'nest');
    }
  }

  // ───────────────────────────── building ─────────────────────────────

  private pushUndo(): void {
    this.undo.push(JSON.stringify(this.state));
    if (this.undo.length > 60) this.undo.shift();
  }

  private rewind(): void {
    const s = this.undo.pop();
    if (!s) return sfx.nuhUh();
    this.state = JSON.parse(s) as BenchState;
    sfx.whirr();
    this.refresh();
  }

  private clear(): void {
    if (!this.state.gears.length && !this.state.gadgets.length) return;
    this.pushUndo();
    this.state.gears = [];
    if (!this.cardDef) this.state.gadgets = [];
    sfx.whoosh();
    this.refresh();
  }

  private pickNewGear(teeth: number, ptr: Phaser.Input.Pointer): void {
    if (this.carry || this.panel.length) return;
    sfx.pickUp();
    const img = this.add.image(ptr.x, ptr.y, ensureGearTexture(this, teeth, 'brass')).setDepth(60).setAlpha(0.9);
    this.carry = { obj: img, gear: { teeth } };
  }

  private pickNewGadget(kind: GadgetKind, ptr: Phaser.Input.Pointer): void {
    if (this.carry || this.panel.length) return;
    sfx.pickUp();
    const c = this.gadgetIcon(kind, 0.5).setPosition(ptr.x, ptr.y).setDepth(60);
    this.carry = { obj: c, gadget: { kind } };
  }

  private nearestPeg(x: number, y: number): number | null {
    let best: number | null = null;
    let bd = this.toy ? 80 : 55;
    for (let i = 0; i < PEG_COUNT; i++) {
      const p = pegPos(i);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  private drop(ptr: Phaser.Input.Pointer): void {
    const c = this.carry;
    if (!c) return;
    this.carry = null;
    c.obj.destroy();
    const peg = this.nearestPeg(ptr.x, ptr.y);
    if (peg === null) {
      sfx.drop();
      this.refresh(); // dropped off the board: the part goes back in the tray
      return;
    }
    if (c.gear) {
      const layers: Array<0 | 1> = [0, 1];
      const ok = layers.map((layer) => ({ peg, layer, teeth: c.gear!.teeth }) as BenchGear).find((g) => canPlaceBenchGear(this.state, g));
      if (!ok) {
        sfx.nuhUh();
        this.cameras.main.shake(120, 0.002);
        this.refresh();
        return;
      }
      this.pushUndo();
      this.state.gears.push(ok);
      sfx.clunk();
    } else if (c.gadget) {
      if (this.state.gadgets.some((g) => g.peg === peg)) {
        sfx.nuhUh();
        this.refresh();
        return;
      }
      this.pushUndo();
      const id = c.gadget.id ?? `g${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`;
      this.state.gadgets.push({ id, kind: c.gadget.kind, peg });
      sfx.clunk();
    }
    this.refresh();
  }

  /** Pick a placed part back up (to move it, or drop it off the board to remove it). */
  private lift(kind: 'gear' | 'gadget', key: string, ptr: Phaser.Input.Pointer): void {
    if (this.carry || this.panel.length) return;
    this.pushUndo();
    if (kind === 'gear') {
      const i = this.state.gears.findIndex((g) => `p${g.peg}@${g.layer}` === key);
      if (i < 0) return;
      const [g] = this.state.gears.splice(i, 1);
      this.carry = { obj: this.add.image(ptr.x, ptr.y, ensureGearTexture(this, g.teeth, g.layer ? 'copper' : 'brass')).setDepth(60).setAlpha(0.9), gear: { teeth: g.teeth } };
    } else {
      const i = this.state.gadgets.findIndex((g) => g.id === key);
      if (i < 0) return;
      const [g] = this.state.gadgets.splice(i, 1);
      this.carry = { obj: this.gadgetIcon(g.kind, 0.5).setPosition(ptr.x, ptr.y).setDepth(60), gadget: { kind: g.kind, id: g.id } };
    }
    sfx.pickUp();
    this.refresh();
  }

  // ───────────────────────────── running ─────────────────────────────

  private refresh(): void {
    this.layer.removeAll(true);
    this.gearImgs = new Map();
    this.gadgetObjs = new Map();
    this.run = runBench(this.state);
    const sorted = [...this.state.gears].sort((a, b) => a.layer - b.layer);
    for (const g of sorted) {
      const { x, y } = pegPos(g.peg);
      const key = `p${g.peg}@${g.layer}`;
      const img = this.add.image(x, y, ensureGearTexture(this, g.teeth, g.layer ? 'copper' : 'brass'));
      if (g.layer) img.setScale(0.98);
      img.setInteractive({ useHandCursor: true, pixelPerfect: false });
      img.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.lift('gear', key, ptr));
      this.layer.add(img);
      this.gearImgs.set(key, img);
    }
    const fixed = new Set(this.cardDef?.gadgets.map((g) => g.id) ?? []);
    for (const gd of this.state.gadgets) {
      const { x, y } = pegPos(gd.peg);
      const c = this.gadgetIcon(gd.kind, 0.38).setPosition(x, y);
      if (!fixed.has(gd.id)) {
        c.setSize(46, 46).setInteractive({ useHandCursor: true });
        c.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.lift('gadget', gd.id, ptr));
      }
      this.layer.add(c);
      this.gadgetObjs.set(gd.id, c);
    }
    this.drawPeek();
    const p = profile();
    if (this.run.jammed) {
      this.line('room.jam');
      if (setFlag(p, 'jam')) persist();
    }
    const powered = this.state.gadgets.some((g) => !isSource(g.kind) && (this.run.ratio[g.id] ?? 0) !== 0);
    if (powered && !this.cardDef && setFlag(p, 'bench')) {
      persist();
      for (const st of checkStamps(p)) toast(this, `Stamp: ${st.name}`, undefined, st.glyph);
    }
    if (this.cardDef) this.checkCard();
  }

  private toggleRun(): void {
    this.running = !this.running;
    setButtonIcon(this.runBtn, this.running ? '⏸' : '▶');
    if (this.running) {
      sfx.whirr();
      this.line('bench.run');
    }
  }

  private togglePeek(): void {
    this.peeking = !this.peeking;
    profile().stats.peeks++;
    this.drawPeek();
  }

  private drawPeek(): void {
    const g = this.peekG;
    g.clear();
    this.peekLabels?.forEach((t) => t.destroy());
    this.peekLabels = [];
    if (!this.peeking) return;
    g.fillStyle(0x0b1530, 0.25);
    g.fillRect(0, 0, 1280, 580);
    const pos = (id: string) => pegPos(Number(id.slice(1).split('@')[0]));
    g.lineStyle(6, 0xfff07a, 0.85);
    for (const [a, b] of this.run.powerEdges) {
      const pa = pos(a);
      const pb = pos(b);
      g.lineBetween(pa.x, pa.y, pb.x, pb.y);
    }
    for (const gd of this.state.gadgets) {
      if (isSource(gd.kind)) continue;
      const r = this.run.ratio[gd.id] ?? 0;
      const { x, y } = pegPos(gd.peg);
      const txt = r === 0 ? '·' : `${r > 0 ? '↻' : '↺'} ×${Math.abs(r) >= 1 ? +Math.abs(r).toFixed(2) : `1/${+(1 / Math.abs(r)).toFixed(1)}`}`;
      this.peekLabels.push(
        this.add.text(x, y - 46, txt, { fontFamily: FONT, fontSize: '18px', color: '#f4ebd5', backgroundColor: '#342f29cc', padding: { x: 6, y: 2 } }).setOrigin(0.5).setDepth(31),
      );
    }
  }

  private peekLabels: Phaser.GameObjects.Text[] = [];

  update(_time: number, dtMs: number): void {
    const dt = dtMs / 1000;
    this.t += dt;
    if (!this.run) return;
    const on = this.running && !this.run.jammed;
    for (const [key, img] of this.gearImgs) {
      const w = on ? this.run.omega.get(key) ?? 0 : 0;
      img.rotation += w * dt;
      if (this.run.jammed && (this.run.omega.size ?? 0) > 0) img.x += Math.sin(this.t * 60) * 0.3;
    }
    for (const gd of this.state.gadgets) {
      const c = this.gadgetObjs.get(gd.id);
      if (!c) continue;
      const r = on ? this.run.ratio[gd.id] ?? 0 : 0;
      const g = c.getData('g') as Phaser.GameObjects.Graphics;
      const phase = this.t * Math.PI * 0.5 * r;
      switch (gd.kind) {
        case 'crank':
        case 'motor':
        case 'waterwheel':
        case 'weights':
          if (on) g.rotation += Math.PI * 0.5 * dt;
          break;
        case 'fan':
        case 'spinner':
        case 'hands':
          g.rotation = phase;
          break;
        case 'bell':
          g.rotation = r ? Math.sin(this.t * 14) * 0.3 : 0;
          if (r && Math.floor(phase / Math.PI) !== Math.floor((phase - Math.PI * 0.5 * r * dt) / Math.PI)) sfx.ding(1320 + (gd.peg % 5) * 110);
          break;
        case 'flag':
          g.scaleX = r ? 0.8 + Math.sin(phase * 2) * 0.2 : 1;
          break;
        case 'lamp':
          c.setAlpha(r ? 0.75 + Math.min(0.25, Math.abs(r) * 0.08) + Math.sin(this.t * 6) * 0.05 : 0.7);
          break;
        case 'dancer':
          g.y = r ? -Math.abs(Math.sin(phase)) * 10 : 0;
          g.rotation = r ? Math.sin(phase) * 0.2 : 0;
          break;
        case 'drum':
          g.setScale(r ? 1 + Math.max(0, Math.sin(phase * 2)) * 0.12 : 1);
          if (r && Math.floor(phase * 2 / Math.PI) !== Math.floor((phase - Math.PI * 0.5 * r * dt) * 2 / Math.PI)) sfx.tock();
          break;
        case 'cuckoo':
          g.y = r ? -Math.max(0, Math.sin(phase)) * 16 : 0;
          if (r && Math.floor(phase / (Math.PI * 2)) !== Math.floor((phase - Math.PI * 0.5 * r * dt) / (Math.PI * 2))) sfx.cuckoo(1);
          break;
        case 'fountain':
          g.scaleY = r ? 1 + Math.abs(Math.sin(phase * 3)) * 0.15 : 1;
          break;
        case 'lift':
          g.y = r ? Math.sin(phase * 0.5) * 14 : 0;
          break;
      }
    }
  }

  // ───────────────────────────── Contraption Cards ─────────────────────────────

  private close(): void {
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
  }

  private overlay(w: number, h: number): <T extends Phaser.GameObjects.GameObject>(o: T) => T {
    this.close();
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(HUD + 10);
      this.panel.push(o);
      return o;
    };
    add(blocker(this, HUD + 10, 0.65, () => this.close()));
    add(card(this, 640, 370, w, h));
    add(roundButton(this, 640 + w / 2 - 40, 370 - h / 2 + 40, '✕', () => this.close(), { r: 24, fontSize: 20 }));
    return add;
  }

  private cardsPanel(): void {
    const p = profile();
    const add = this.overlay(1160, 620);
    add(roundButton(this, 120, 110, '🛠', () => this.freeBuild(), { r: 30, fontSize: 24, say: 'Free build' }));
    add(
      scrollGrid(this, 90, 150, 1100, 500, CARDS.length, { w: 183, h: 120, cols: 6 }, (i, x, y) => {
        const c = CARDS[i];
        const best = p.bench.cards[c.id];
        const t = tile(this, x, y, 170, 108, () => this.loadCard(c), { caption: showWords() ? c.title : undefined, captionSize: 13, fill: best !== undefined ? 0xd8dfc5 : undefined });
        t.add(this.add.text(-60, -30, String(i + 1), { fontFamily: SERIF, fontSize: '22px', color: '#79503d', fontStyle: 'bold' }).setOrigin(0.5));
        c.gadgets.slice(0, 3).forEach((gd, k) => t.add(this.gadgetIcon(gd.kind, 0.2).setPosition(-10 + k * 30, -22)));
        if (best !== undefined) t.add(this.add.text(64, -32, best <= c.par ? '★' : '✓', { fontFamily: FONT, fontSize: '22px', color: best <= c.par ? '#e0a800' : '#485541' }).setOrigin(0.5));
        this.hot(`card-${c.id}`, () => this.loadCard(c));
        return t;
      }).setDepth(HUD + 11),
    );
    this.line('bench.card');
  }

  private freeBuild(): void {
    this.close();
    this.cardDef = null;
    this.goalText?.destroy();
    this.state = { gears: [], gadgets: [] };
    this.undo = [];
    this.refreshGadgetTray();
    this.refresh();
  }

  private loadCard(c: ContraptionCard): void {
    this.close();
    this.cardDef = c;
    this.solvedShown = false;
    this.state = { gears: [], gadgets: c.gadgets.map((g) => ({ ...g })) };
    this.undo = [];
    this.running = true;
    setButtonIcon(this.runBtn, '⏸');
    this.refreshGadgetTray();
    this.goalText?.destroy();
    this.goalText = this.add
      .text(640, 569, showWords() ? c.say : '', { fontFamily: FONT, fontSize: '19px', color: '#f4ebd5', backgroundColor: '#342f29cc', padding: { x: 14, y: 3 } })
      .setOrigin(0.5)
      .setDepth(HUD);
    this.goalText.setInteractive().on('pointerup', () => void speak('nana', c.say, `card.${c.id}`));
    void speak('nana', c.say, `card.${c.id}`);
    this.refresh();
  }

  private checkCard(): void {
    const c = this.cardDef;
    if (!c || this.solvedShown || !cardSolved(c, this.state)) return;
    this.solvedShown = true;
    const p = profile();
    const n = this.state.gears.length;
    const first = p.bench.cards[c.id] === undefined;
    p.bench.cards[c.id] = Math.min(p.bench.cards[c.id] ?? Infinity, n);
    if (first) p.stats.cards++;
    const stamps = checkStamps(p);
    persist();
    sfx.fanfare();
    this.add.particles(640, 300, 'star', { lifespan: 1200, speed: { min: 100, max: 280 }, scale: { start: 0.9, end: 0 }, emitting: false }).setDepth(HUD - 1).explode(30);
    this.line('bench.cardDone');
    if (n <= c.par) this.time.delayedCall(1200, () => toast(this, 'Fewest parts! ★', undefined, '★'));
    stamps.forEach((st, i) => this.time.delayedCall(2400 + i * 2600, () => toast(this, `Stamp: ${st.name}`, undefined, st.glyph)));
  }

  // ───────────────────────────── codes & saves ─────────────────────────────

  private codePanel(): void {
    const add = this.overlay(980, 600);
    const code = this.state.gears.length || this.state.gadgets.length ? encodeBench(this.state) : '';
    if (code) {
      const p = profile();
      if (setFlag(p, 'code')) {
        checkStamps(p);
        persist();
      }
      add(this.add.text(640, 130, code.match(/.{1,4}/g)!.join(' '), { fontFamily: 'monospace', fontSize: '38px', color: '#342f29', fontStyle: 'bold', backgroundColor: '#f4ebd5', padding: { x: 18, y: 8 } }).setOrigin(0.5));
      this.line('bench.code');
    }
    const pad = keypad(this, 600, 290, CODE_ALPHABET, 40, () => undefined, HUD + 11);
    const padObj = { destroy: () => pad.destroy() } as unknown as Phaser.GameObjects.GameObject;
    this.panel.push(padObj);
    add(
      roundButton(this, 1040, 580, '✓', () => {
        const s = decodeBench(pad.value());
        if (!s) {
          sfx.nuhUh();
          this.line('bench.badcode');
          return;
        }
        this.close();
        this.cardDef = null;
        this.goalText?.destroy();
        this.pushUndo();
        this.state = s;
        this.refreshGadgetTray();
        sfx.sparkle();
        this.refresh();
      }, { r: 36, fontSize: 30, color: 0xa0a477, say: 'Build it' }),
    );
  }

  private saveBuild(): void {
    if (!this.state.gears.length && !this.state.gadgets.length) return sfx.nuhUh();
    const p = profile();
    const code = encodeBench(this.state);
    const h = hashString(code);
    const name = `${NAME_A[h % NAME_A.length]} ${NAME_B[(h >> 4) % NAME_B.length]}`;
    if (p.bench.saved.some((s) => s.code === code)) return sfx.ding();
    if (p.bench.saved.length >= 12) p.bench.saved.shift();
    p.bench.saved.push({ name, code });
    persist();
    sfx.ding();
    toast(this, `Saved: ${name}`, undefined, '💾');
  }

  private gallery(): void {
    const p = profile();
    const add = this.overlay(900, 520);
    const list = p.bench.saved;
    if (!list.length) add(this.add.text(640, 370, '🖼 ?', { fontFamily: SERIF, fontSize: '64px', color: '#9a8a72' }).setOrigin(0.5));
    add(
      scrollGrid(this, 220, 160, 840, 420, list.length, { w: 210, h: 130, cols: 4 }, (i, x, y) => {
        const s = list[i];
        const st = decodeBench(s.code);
        const t = tile(this, x, y, 196, 118, () => {
          if (!st) return;
          this.close();
          this.cardDef = null;
          this.goalText?.destroy();
          this.pushUndo();
          this.state = st;
          this.refreshGadgetTray();
          this.refresh();
        }, { caption: showWords() ? s.name : undefined, captionSize: 13 });
        st?.gadgets.slice(0, 4).forEach((gd, k) => t.add(this.gadgetIcon(gd.kind, 0.2).setPosition(-45 + k * 30, -16)));
        return t;
      }).setDepth(HUD + 11),
    );
  }
}

