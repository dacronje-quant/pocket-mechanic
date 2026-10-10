/**
 * Kip's Nook (GDD §13.1, §18.2): a matchbox bed that grows into a tin-can
 * cottage and then a tiny clockwork house as Golden Gears are found. Furnish
 * it with things made from spare parts; the mini music box plays the songs
 * Kip found and the ones the player composed; the Job Book holds the stamps.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { playMelody } from '../audio/music';
import { Kip } from '../art/Kip';
import { drawRoomBackdrop } from '../art/backgrounds';
import { CM } from '../art/copperMoss';
import { paintedObject } from '../art/sprites';
import { FURNITURE, type Furniture } from '../content/cosmetics';
import { MARKS } from '../content/repairs';
import { SONGS } from '../content/songs';
import { STAMPS } from '../content/stamps';
import { checkStamps, nookLevel, setFlag } from '../core/progress';
import { persist, profile } from '../core/save';
import { blocker, card, FONT, roundButton, SERIF, scrollGrid, showWords, tile, toast } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';

// floor spots stand on the painted floorboards; the last two hang on the wall
const SPOTS = [
  { x: 230, y: 606 },
  { x: 470, y: 614 },
  { x: 1050, y: 606 },
  { x: 820, y: 614 },
  { x: 380, y: 300 },
  { x: 900, y: 300 },
];
const SPOTS_AT_LEVEL = [3, 5, 6];

export class NookScene extends MetaScene {
  private kip!: Kip;
  private items: Phaser.GameObjects.Container[] = [];
  private panel: Phaser.GameObjects.GameObject[] = [];
  private lampOn = true;
  private shade!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('nook');
  }

  protected build(): void {
    const p = profile();
    this.items = [];
    this.panel = [];
    this.lampOn = true;
    const level = nookLevel(p);
    this.room(level);
    this.bubble.setY(150);
    this.music('home', 0.5);
    this.backButton();
    this.heading(["Kip's Matchbox", "Kip's Tin-Can Cottage", "Kip's Clockwork House"][level]);
    this.counters();
    this.kip = new Kip(this, 640, 616, p.look).setDepth(30).setScale(1.6);
    this.kip.minX = 160;
    this.kip.maxX = 1120;
    this.shade = this.add.rectangle(0, 0, 1280, 720, 0x0b0805, 0).setOrigin(0).setDepth(HUD - 3);
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length && ptr.y > 480 && !this.panel.length) this.kip.walkTo(ptr.x);
    });
    for (let i = 0; i < SPOTS_AT_LEVEL[level]; i++) this.spot(i);
    roundButton(this, 1180, 640, '📖', () => this.jobBook(), { r: 36, fontSize: 30, say: 'Job Book' }).setDepth(HUD);
    this.hot('book', () => this.jobBook());
    const grown = `nook${level}`;
    if (level > 0 && !p.flags.includes(grown)) {
      p.flags.push(grown);
      persist();
      this.time.delayedCall(500, () => this.line('nook.grown'));
    } else this.time.delayedCall(400, () => this.line('shop.nook'));
  }

  private room(level: number): void {
    // the painted home shows through; each size of house only shifts the light a little
    drawRoomBackdrop(this, 'home', 640).setDepth(0);
    const g = this.add.graphics().setDepth(2);
    const tint = [
      { c: CM.copperDark, a: 0.14 }, // the matchbox: snug and dim
      { c: CM.tealLight, a: 0.12 }, // the tin-can cottage: cool and bright
      { c: CM.glow, a: 0.1 }, // the clockwork house: warm
    ][level];
    g.fillStyle(tint.c, tint.a);
    g.fillRect(0, 0, 1280, 720);
    // a soft dark edge draws the eye to the room
    for (let k = 0; k < 6; k++) {
      g.lineStyle(40, 0x1a120c, 0.05);
      g.strokeRect(-20 + k * 14, -20 + k * 14, 1320 - k * 28, 760 - k * 28);
    }
  }

  private spot(i: number): void {
    const p = profile();
    const s = SPOTS[i];
    const id = p.nook[i];
    const c = this.add.container(s.x, s.y).setDepth(20);
    const g = this.add.graphics();
    if (id) drawFurniture(g, id, 0, 0, 1.45);
    else {
      // an empty spot: a dashed circle with a plus, inviting a tap
      g.fillStyle(0x342f29, 0.35);
      g.fillCircle(0, -40, 38);
      g.lineStyle(4, 0xf4ebd5, 0.85);
      g.strokeCircle(0, -40, 38);
      g.fillStyle(0xf4ebd5, 0.9);
      g.fillRect(-4, -60, 8, 40);
      g.fillRect(-20, -44, 40, 8);
    }
    c.add(g);
    c.setSize(200, 170).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => (id ? this.use(id, c) : this.picker(i)));
    let held: Phaser.Time.TimerEvent | undefined;
    c.on('pointerdown', () => (held = this.time.delayedCall(700, () => this.picker(i))));
    c.on('pointerout', () => held?.remove());
    c.on('pointerup', () => held?.remove());
    this.items.push(c);
    this.hot(`spot${i}`, () => this.picker(i));
  }

  /** Using furniture: nap in bed, play the music box, read the Job Book, switch the lamp. */
  private use(id: string, c: Phaser.GameObjects.Container): void {
    if (this.panel.length) return;
    this.tweens.add({ targets: c, scaleY: 0.92, duration: 90, yoyo: true });
    switch (id) {
      case 'matchbox-bed':
      case 'sock-blanket':
        this.kip.walkTo(c.x, () => {
          this.kip.nap(true);
          sfx.yawn();
          this.line('nook.bed');
          this.time.delayedCall(4000, () => this.kip.active && this.kip.nap(false));
        });
        break;
      case 'mini-musicbox':
        this.songs();
        break;
      case 'stamp-frame':
        this.jobBook();
        break;
      case 'button-lamp':
        this.lampOn = !this.lampOn;
        sfx.toggle(this.lampOn);
        this.shade.setFillStyle(0x0b0805, this.lampOn ? 0 : 0.45);
        break;
      case 'gear-clock':
        sfx.tick();
        this.time.delayedCall(300, () => sfx.tock());
        break;
      default:
        sfx.boing();
        this.kip.walkTo(c.x);
    }
  }

  private close(): void {
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
  }

  private overlay(w = 1000, h = 560): <T extends Phaser.GameObjects.GameObject>(o: T) => T {
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

  private picker(slot: number): void {
    const p = profile();
    const add = this.overlay();
    const list: Array<Furniture | null> = [null, ...FURNITURE];
    add(
      scrollGrid(this, 180, 140, 920, 480, list.length, { w: 184, h: 160, cols: 5 }, (i, x, y) => {
        const f = list[i];
        const owned = !f || f.cost === 0 || p.furniture.includes(f.id);
        const t = tile(this, x, y, 170, 150, () => this.place(slot, f), { caption: f && showWords() ? f.name : undefined, captionSize: 13, selected: (p.nook[slot] ?? null) === (f?.id ?? null) });
        const g = this.add.graphics();
        if (f) drawFurniture(g, f.id, 0, 20, 0.7);
        else {
          g.lineStyle(6, 0xb5442c, 1);
          g.lineBetween(-20, -30, 20, 10);
          g.lineBetween(20, -30, -20, 10);
        }
        t.add(g);
        if (!owned && f) {
          t.add(this.add.image(38, -54, 'bit').setScale(1));
          t.add(this.add.text(62, -54, String(f.cost), { fontFamily: FONT, fontSize: '16px', color: '#342f29', fontStyle: 'bold' }).setOrigin(0.5));
        }
        if (f) this.hot(`furn-${f.id}`, () => this.place(slot, f));
        return t;
      }).setDepth(HUD + 11),
    );
  }

  private place(slot: number, f: Furniture | null): void {
    const p = profile();
    if (f && f.cost > 0 && !p.furniture.includes(f.id)) {
      if (p.shiny < f.cost) {
        sfx.nuhUh();
        this.line('paint.poor');
        return;
      }
      p.shiny -= f.cost;
      p.furniture.push(f.id);
      sfx.coin();
    }
    if (f) p.nook[slot] = f.id;
    else delete p.nook[slot];
    if (Object.keys(p.nook).length >= 3 && setFlag(p, 'nook')) {
      for (const st of checkStamps(p)) this.time.delayedCall(800, () => toast(this, `Stamp: ${st.name}`, undefined, st.glyph));
    }
    persist();
    this.close();
    this.scene.restart();
  }

  private songs(): void {
    const p = profile();
    const add = this.overlay(900, 520);
    this.sayQuiet('nook.music');
    const found = SONGS.filter((s) => p.songs.includes(s.id)).map((s) => ({ name: s.name, notes: s.notes, tempo: s.tempo }));
    const mine = p.composed.map((c) => ({ name: c.name, notes: pinsToNotes(c.pins), tempo: 3 }));
    const all = [...found, ...mine];
    if (!all.length) add(this.add.text(640, 370, '♪ ?', { fontFamily: SERIF, fontSize: '64px', color: '#9a8a72' }).setOrigin(0.5));
    add(
      scrollGrid(this, 230, 150, 820, 440, all.length, { w: 205, h: 110, cols: 4 }, (i, x, y) => {
        const s = all[i];
        const t = tile(this, x, y, 190, 96, () => {
          playMelody(s.notes, s.tempo, 'sine');
          this.kip.celebrate();
        }, { caption: showWords() ? s.name : undefined, captionSize: 13, fill: i >= found.length ? 0xd4ded2 : undefined });
        t.add(this.add.text(0, showWords() ? -14 : 0, i >= found.length ? '🎼' : '♪', { fontFamily: FONT, fontSize: '32px', color: '#537a72' }).setOrigin(0.5));
        return t;
      }).setDepth(HUD + 11),
    );
  }

  /** Kip's Job Book: every stamp (earned ones inked in), and the Magnus Marks clue board. */
  private jobBook(): void {
    const p = profile();
    const add = this.overlay(1160, 620);
    this.sayQuiet('nook.book');
    if (showWords()) add(this.add.text(640, 90, `${p.stamps.length} / ${STAMPS.length}`, { fontFamily: SERIF, fontSize: '28px', color: '#342f29', fontStyle: 'bold' }).setOrigin(0.5));
    add(
      scrollGrid(this, 80, 120, 1120, 460, STAMPS.length, { w: 140, h: 120, cols: 8 }, (i, x, y) => {
        const st = STAMPS[i];
        const got = p.stamps.includes(st.id);
        const c = this.add.container(x, y);
        const g = this.add.graphics();
        g.lineStyle(4, got ? 0xb5442c : 0xcfc2a5, 1);
        g.strokeRoundedRect(-56, -48, 112, 96, 14);
        c.add(g);
        c.add(this.add.text(0, showWords() ? -12 : 0, st.glyph, { fontFamily: FONT, fontSize: '38px' }).setOrigin(0.5).setAlpha(got ? 1 : 0.18));
        if (showWords() && got) c.add(this.add.text(0, 30, st.name, { fontFamily: FONT, fontSize: '11px', color: '#665d50', align: 'center', wordWrap: { width: 104 } }).setOrigin(0.5));
        return c;
      }).setDepth(HUD + 11),
    );
    // Magnus Marks: the clue trail (GDD §13.4)
    Object.keys(MARKS).forEach((id, i) => {
      const got = p.marks.includes(id);
      add(this.add.text(380 + i * 80, 620, got ? '🪶' : '·', { fontFamily: FONT, fontSize: '34px' }).setOrigin(0.5).setAlpha(got ? 1 : 0.4));
    });
  }
}

function pinsToNotes(pins: string[]): number[] {
  const steps = new Map<number, number>();
  for (const k of pins) {
    const [s, n] = k.split(':').map(Number);
    if (!steps.has(s)) steps.set(s, n);
  }
  const len = Math.max(0, ...steps.keys()) + 1;
  return Array.from({ length: len }, (_, i) => steps.get(i) ?? -1);
}

/**
 * Furniture made from spare parts, standing on (x, y). Drawn with an ink outline and simple
 * light and shade so each piece reads as the household thing it was made from (a thimble, a
 * cotton reel, bottle caps…). The music box and the lamp use their paintings when loaded.
 */
export function drawFurniture(g: Phaser.GameObjects.Graphics, id: string, x = 0, y = 0, s = 1): void {
  const P = (dx: number, dy: number) => new Phaser.Math.Vector2(x + dx * s, y + dy * s);
  const ink = (w = 2.2) => g.lineStyle(Math.max(1, w * s), CM.ink, 0.75);
  const R = (dx: number, dy: number, w: number, h: number, c: number, r = 6, line = true) => {
    g.fillStyle(c, 1);
    g.fillRoundedRect(x + dx * s, y + dy * s, w * s, h * s, Math.min(r, w / 2, h / 2) * s);
    if (line) {
      ink();
      g.strokeRoundedRect(x + dx * s, y + dy * s, w * s, h * s, Math.min(r, w / 2, h / 2) * s);
    }
  };
  const C = (dx: number, dy: number, r: number, c: number, line = false) => {
    g.fillStyle(c, 1);
    g.fillCircle(x + dx * s, y + dy * s, r * s);
    if (line) {
      ink();
      g.strokeCircle(x + dx * s, y + dy * s, r * s);
    }
  };
  const E = (dx: number, dy: number, w: number, h: number, c: number, line = true) => {
    g.fillStyle(c, 1);
    g.fillEllipse(x + dx * s, y + dy * s, w * s, h * s);
    if (line) {
      ink();
      g.strokeEllipse(x + dx * s, y + dy * s, w * s, h * s);
    }
  };
  const poly = (pts: Array<[number, number]>, c: number, line = true) => {
    const v = pts.map(([px, py]) => P(px, py));
    g.fillStyle(c, 1);
    g.fillPoints(v, true);
    if (line) {
      ink();
      g.strokePoints(v, true, true);
    }
  };
  const shadow = (w: number) => {
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(x, y, w * s, 12 * s);
  };
  const gearPts = (cx: number, cy: number, teeth: number, r0: number, r1: number): Array<[number, number]> => {
    const pts: Array<[number, number]> = [];
    for (let k = 0; k < teeth * 2; k++) {
      const a = (k / (teeth * 2)) * Math.PI * 2;
      const r = k % 2 ? r0 : r1;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  };
  switch (id) {
    case 'matchbox-bed': {
      // a matchbox drawer for a bed: striker strip on the side, a pillow and a striped sock blanket
      shadow(160);
      R(-74, -40, 148, 40, 0xb5442c, 4);
      R(-74, -40, 148, 9, 0x5e3a2a, 2);
      for (let k = 0; k < 10; k++) C(-66 + k * 14, -35.5, 1.6, 0x8a6a52);
      R(-68, -58, 136, 22, 0xe8d3b0, 4);
      R(-64, -70, 44, 20, 0xffffff, 9);
      poly([[-22, -66], [64, -66], [68, -42], [-22, -42]], 0x6c4a8f);
      for (let k = 0; k < 4; k++) poly([[-14 + k * 20, -66], [-4 + k * 20, -66], [-4 + k * 20, -42], [-14 + k * 20, -42]], 0xd9a0a0, false);
      break;
    }
    case 'thimble-chair': {
      // an upside-down thimble with a button cushion on top
      shadow(90);
      poly([[-34, 0], [34, 0], [26, -62], [-26, -62]], 0xb9c4bd);
      g.fillStyle(0xffffff, 0.25);
      g.fillPoints([P(-28, -4), P(-16, -4), P(-12, -58), P(-22, -58)], true);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) C(-20 + k * 8 + r * 0.8, -52 + r * 13, 1.8, 0x7d8c84);
      E(0, -64, 60, 14, 0xa0aca5);
      E(0, -70, 64, 18, 0xb5442c);
      for (const dx of [-8, 8]) for (const dy of [-73, -67]) C(dx * 0.6, dy, 1.6, 0x5e1e14);
      break;
    }
    case 'spool-table': {
      // a cotton reel: wooden flanges, wound thread, a lace doily on top
      shadow(110);
      E(0, -6, 96, 18, 0x8a5a34);
      R(-34, -76, 68, 70, 0xc0605a, 4);
      g.lineStyle(1.2 * s, 0x8e3f3a, 0.8);
      for (let k = 0; k < 9; k++) g.lineBetween(x - 34 * s, y + (-72 + k * 8) * s, x + 34 * s, y + (-70 + k * 8) * s);
      E(0, -80, 104, 20, 0xb07a48);
      E(0, -84, 104, 20, 0xc89a62);
      E(0, -86, 70, 12, 0xf4ebd5, false);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        C(Math.cos(a) * 34, -86 + Math.sin(a) * 6, 3, 0xf4ebd5);
      }
      break;
    }
    case 'cap-rug': {
      // a round rug of bottle caps
      E(0, -8, 170, 40, 0xd9c7a0);
      const caps: Array<[number, number, number]> = [[-60, -8, 0xb5442c], [-36, -14, 0x537a72], [-36, -2, 0xc2a168], [-12, -18, 0x78815a], [-12, -6, 0xb5442c], [12, -18, 0xc2a168], [12, -6, 0x537a72], [36, -14, 0xb5442c], [36, -2, 0x78815a], [60, -8, 0x537a72], [-12, 6, 0x78815a], [12, 6, 0xb5442c]];
      for (const [cx, cy, col] of caps) {
        E(cx, cy, 22, 11, col);
        g.fillStyle(0xffffff, 0.35);
        g.fillEllipse(x + (cx - 3) * s, y + (cy - 2) * s, 8 * s, 3 * s);
      }
      break;
    }
    case 'mini-musicbox': {
      shadow(110);
      if (paintedObject(g, 'musicbox', x, y - 52 * s, 1.15 * s)) break;
      R(-44, -54, 88, 50, 0x856c50);
      poly([[-48, -54], [48, -54], [40, -84], [-40, -84]], 0xa36d40);
      C(0, -30, 10, 0xbca16a, true);
      break;
    }
    case 'button-lamp': {
      shadow(80);
      if (paintedObject(g, 'nightlight', x, y - 58 * s, 1.15 * s)) break;
      E(0, -8, 54, 16, 0xa57168);
      C(-8, -9, 3, 0x6e2c3c);
      C(8, -9, 3, 0x6e2c3c);
      R(-3, -92, 6, 84, 0x6c7a89, 2);
      poly([[-34, -82], [34, -82], [16, -116], [-16, -116]], 0xf1d391);
      break;
    }
    case 'gear-clock': {
      // a big brass gear with a clock face
      poly(gearPts(0, -56, 12, 40, 48), 0xbca16a);
      C(0, -56, 32, 0xf4ebd5, true);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        C(Math.cos(a) * 26, -56 + Math.sin(a) * 26, k % 3 ? 1.5 : 3, CM.ink);
      }
      g.lineStyle(4 * s, CM.ink, 1);
      g.lineBetween(x, y - 56 * s, x, y - 78 * s);
      g.lineBetween(x, y - 56 * s, x + 15 * s, y - 50 * s);
      C(0, -56, 4, 0xb5442c);
      break;
    }
    case 'sock-blanket': {
      // a striped wool sock folded into a blanket, heel and toe showing
      shadow(140);
      poly([[-66, -4], [50, -4], [66, -14], [62, -30], [44, -34], [-66, -34]], 0x83a49a);
      for (let k = 0; k < 6; k++) poly([[-60 + k * 20, -34], [-50 + k * 20, -34], [-50 + k * 20, -4], [-60 + k * 20, -4]], 0xf4ebd5, false);
      E(52, -18, 30, 26, 0xd9a0a0);
      R(-70, -38, 12, 38, 0x6c8a80, 4);
      break;
    }
    case 'cork-stool': {
      // a bottle cork: oval top, speckled sides
      shadow(70);
      R(-24, -50, 48, 50, 0xc89a62, 6);
      E(0, -50, 48, 14, 0xdcb27c);
      for (let k = 0; k < 14; k++) C(-18 + ((k * 13) % 36), -42 + ((k * 7) % 38), 1.8, 0x9c7444);
      for (let k = 0; k < 5; k++) C(-14 + ((k * 11) % 28), -51 + (k % 2) * 2, 1.6, 0xa9835a);
      break;
    }
    case 'teaspoon-shelf': {
      // a wooden shelf on brackets, with teaspoons hanging below and jars on top
      R(-70, -66, 140, 10, 0x856c50, 3);
      for (const bx of [-50, 50]) poly([[bx - 4, -56], [bx + 4, -56], [bx + 4, -40], [bx - 4, -48]], 0x6e5236);
      R(-56, -92, 22, 26, 0xc1d3c6, 4);
      R(-58, -96, 26, 6, 0xad6b51, 2);
      R(30, -86, 30, 20, 0xc89a62, 3);
      for (let k = 0; k < 4; k++) {
        const sx = -30 + k * 20;
        R(sx - 1.5, -56, 3, 26, 0xb9c4bd, 1, false);
        E(sx, -26, 12, 18, 0xb9c4bd);
        g.fillStyle(0xffffff, 0.4);
        g.fillEllipse(x + (sx - 2) * s, y - 29 * s, 4 * s, 8 * s);
      }
      break;
    }
    case 'stamp-frame': {
      // a framed postage stamp with a perforated edge and a gear picture
      R(-46, -104, 92, 84, 0x856c50, 4);
      R(-38, -96, 76, 68, 0xe9dcc0, 2, false);
      for (let k = 0; k <= 8; k++) {
        C(-34 + k * 8.5, -96, 2.4, 0x856c50);
        C(-34 + k * 8.5, -28, 2.4, 0x856c50);
      }
      for (let k = 0; k <= 7; k++) {
        C(-38, -92 + k * 9, 2.4, 0x856c50);
        C(38, -92 + k * 9, 2.4, 0x856c50);
      }
      R(-28, -88, 56, 52, 0xb5442c, 3, false);
      poly(gearPts(0, -62, 8, 13, 17), 0xf1d391, false);
      C(0, -62, 6, 0xb5442c);
      break;
    }
    case 'plant-pot': {
      // a thimble pot with a leafy sprout
      shadow(70);
      poly([[-24, 0], [24, 0], [28, -40], [-28, -40]], 0xb9c4bd);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) C(-16 + k * 8, -32 + r * 11, 1.6, 0x7d8c84);
      R(-2, -78, 4, 40, 0x5b6b42, 2, false);
      for (const [lx, ly, a] of [[-18, -62, -0.6], [18, -70, 0.6], [-14, -86, -0.4], [12, -92, 0.4]] as Array<[number, number, number]>) {
        const c = P(lx, ly);
        const pts = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
          const t = (k / 8) * Math.PI * 2;
          const px = Math.cos(t) * 16;
          const py = Math.sin(t) * 7;
          return new Phaser.Math.Vector2(c.x + (px * Math.cos(a) - py * Math.sin(a)) * s, c.y + (px * Math.sin(a) + py * Math.cos(a)) * s);
        });
        g.fillStyle(0x78815a, 1);
        g.fillPoints(pts, true);
        ink(1.6);
        g.strokePoints(pts, true, true);
      }
      break;
    }
    default:
      C(0, -30, 20, 0xbca16a, true);
  }
}
