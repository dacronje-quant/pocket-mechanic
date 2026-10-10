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
import { CM, drawLeafSprig, drawPatina, drawTimber } from '../art/copperMoss';
import { rivet } from '../art/finish';
import { FURNITURE, type Furniture } from '../content/cosmetics';
import { MARKS } from '../content/repairs';
import { SONGS } from '../content/songs';
import { STAMPS } from '../content/stamps';
import { checkStamps, nookLevel, setFlag } from '../core/progress';
import { persist, profile } from '../core/save';
import { blocker, card, FONT, roundButton, SERIF, scrollGrid, showWords, tile, toast } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';

const SPOTS = [
  { x: 230, y: 646 },
  { x: 470, y: 652 },
  { x: 1050, y: 646 },
  { x: 820, y: 652 },
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
    this.kip = new Kip(this, 640, 640, p.look).setDepth(30).setScale(1.6);
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
    drawRoomBackdrop(this, 'home', 640).setDepth(0);
    const g = this.add.graphics().setDepth(2);
    if (level === 0) {
      g.fillStyle(CM.copperDark, 0.35);
      g.fillRect(0, 0, 1280, 720);
      g.fillStyle(CM.paper, 0.55);
      g.fillRect(60, 80, 1160, 600);
      g.fillStyle(CM.woodDark, 0.12);
      for (let x = 60; x < 1220; x += 40) g.fillRect(x, 80, 2, 600);
      g.lineStyle(2, CM.ink, 0.5);
      g.strokeRect(60, 80, 1160, 600);
    } else if (level === 1) {
      g.fillStyle(CM.tealLight, 0.5);
      g.fillRect(0, 0, 1280, 720);
      g.lineStyle(2, CM.tealDark, 0.3);
      for (let y = 0; y < 720; y += 24) g.lineBetween(0, y, 1280, y);
    } else {
      g.fillStyle(CM.wood, 0.38);
      g.fillRect(0, 0, 1280, 720);
      for (let i = 0; i < 20; i++) {
        g.fillStyle(i % 2 ? CM.wood : CM.woodLight, 0.22);
        g.fillRect(i * 64, 0, 64, 720);
      }
      g.fillStyle(CM.glow, 0.18);
      g.fillCircle(1100, 140, 90);
      g.fillCircle(160, 160, 60);
    }
    // floor and a round window
    drawPatina(g, 65, 85, 1150, 550, 778 + level, 1.2);
    drawTimber(g, 0, 640, 1280, 80, 104, CM.woodDark);
    g.fillStyle(CM.copperDark, 1);
    g.fillCircle(640, 220, 90);
    g.lineStyle(2.5, CM.ink, 0.8);
    g.strokeCircle(640, 220, 90);
    g.lineStyle(2, CM.copperLight, 0.8);
    g.strokeCircle(640, 220, 84);
    g.fillStyle(CM.tealDark, 1);
    g.fillCircle(640, 220, 76);
    g.fillStyle(0xfff3bf, 1);
    g.fillCircle(670, 200, 18);
    g.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 9; i++) g.fillCircle(590 + ((i * 37) % 100), 180 + ((i * 53) % 90), 1.6);
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) rivet(g, 640 + Math.cos(a) * 85, 220 + Math.sin(a) * 85);
    drawLeafSprig(g, 65, 112, 390, 513, 1);
    drawLeafSprig(g, 1207, 118, 380, 204, 1);
    drawLeafSprig(g, 723, 138, 130, 444, 0.8);
  }

  private spot(i: number): void {
    const p = profile();
    const s = SPOTS[i];
    const id = p.nook[i];
    const c = this.add.container(s.x, s.y).setDepth(20);
    const g = this.add.graphics();
    if (id) drawFurniture(g, id);
    else {
      g.lineStyle(3, 0xf4ebd5, 0.5);
      g.strokeCircle(0, -30, 34);
      g.fillStyle(0xf4ebd5, 0.5);
      g.fillRect(-3, -46, 6, 32);
      g.fillRect(-16, -33, 32, 6);
    }
    c.add(g);
    c.setSize(150, 130).setInteractive({ useHandCursor: true });
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

/** Furniture made from spare parts. */
export function drawFurniture(g: Phaser.GameObjects.Graphics, id: string, x = 0, y = 0, s = 1): void {
  const R = (dx: number, dy: number, w: number, h: number, c: number, r = 6) => {
    g.fillStyle(c, 1);
    g.fillRoundedRect(x + dx * s, y + dy * s, w * s, h * s, Math.min(r, w / 2, h / 2) * s);
  };
  const C = (dx: number, dy: number, r: number, c: number) => {
    g.fillStyle(c, 1);
    g.fillCircle(x + dx * s, y + dy * s, r * s);
  };
  switch (id) {
    case 'matchbox-bed':
      R(-70, -30, 140, 40, 0xad6b51);
      R(-64, -40, 128, 22, 0xe9dcc0);
      R(-60, -46, 40, 16, 0xffffff);
      R(-20, -42, 76, 18, 0x6c4a8f);
      break;
    case 'thimble-chair':
      R(-24, -60, 48, 56, 0xa9b7ad, 10);
      for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) C(-14 + k * 9, -50 + j * 14, 2, 0x82938c);
      break;
    case 'spool-table':
      R(-40, -70, 80, 14, 0xa36d40);
      R(-22, -56, 44, 44, 0xa57168, 4);
      R(-40, -14, 80, 14, 0xa36d40);
      break;
    case 'cap-rug':
      g.fillStyle(0xf1c40f, 1);
      g.fillEllipse(x, y - 6 * s, 150 * s, 36 * s);
      for (let k = 0; k < 7; k++) C(-54 + k * 18, -6, 6, [0xad6b51, 0x537a72, 0x78815a][k % 3]);
      break;
    case 'mini-musicbox':
      R(-36, -50, 72, 46, 0x856c50);
      R(-40, -60, 80, 14, 0xa36d40);
      C(0, -26, 10, 0xbca16a);
      g.fillStyle(0x667a6a, 1);
      g.fillCircle(x + 30 * s, y - 80 * s, 5 * s);
      g.fillRect(x + 33 * s, y - 100 * s, 3 * s, 20 * s);
      break;
    case 'button-lamp':
      R(-4, -90, 8, 86, 0x6c7a89, 2);
      g.fillStyle(0xf1d391, 1);
      g.fillTriangle(x - 30 * s, y - 80 * s, x + 30 * s, y - 80 * s, x, y - 112 * s);
      C(0, -6, 18, 0xa57168);
      C(-6, -8, 3, 0x9c2c5c);
      C(6, -8, 3, 0x9c2c5c);
      break;
    case 'gear-clock':
      C(0, -50, 40, 0xbca16a);
      C(0, -50, 30, 0xe9dcc0);
      g.lineStyle(4 * s, 0x342f29, 1);
      g.lineBetween(x, y - 50 * s, x, y - 72 * s);
      g.lineBetween(x, y - 50 * s, x + 14 * s, y - 50 * s);
      break;
    case 'sock-blanket':
      R(-60, -24, 120, 24, 0x83a49a, 10);
      for (let k = 0; k < 5; k++) R(-56 + k * 24, -24, 10, 24, 0xffffff, 2);
      break;
    case 'cork-stool':
      R(-20, -44, 40, 44, 0xc89a62, 8);
      for (let k = 0; k < 6; k++) C(-12 + (k % 3) * 12, -34 + Math.floor(k / 3) * 16, 2, 0x9c7444);
      break;
    case 'teaspoon-shelf':
      R(-60, -60, 120, 8, 0x856c50);
      for (let k = 0; k < 4; k++) {
        g.fillStyle(0xa9b7ad, 1);
        g.fillEllipse(x + (-42 + k * 28) * s, y - 76 * s, 12 * s, 18 * s);
      }
      break;
    case 'stamp-frame':
      R(-40, -90, 80, 70, 0x856c50);
      R(-32, -82, 64, 54, 0xf4ebd5);
      C(0, -55, 16, 0xb5442c);
      break;
    case 'plant-pot':
      R(-22, -36, 44, 36, 0xa9b7ad, 6);
      g.fillStyle(0x78815a, 1);
      g.fillEllipse(x - 14 * s, y - 52 * s, 20 * s, 34 * s);
      g.fillEllipse(x + 12 * s, y - 56 * s, 20 * s, 40 * s);
      break;
    default:
      C(0, -30, 20, 0xbca16a);
  }
}
