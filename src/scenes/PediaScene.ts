/**
 * The Part-o-pedia in the Parts Drawers (GDD §19.1): every part Kip touches
 * gets a page with a spoken description, "How It Really Works" and "Spot It at
 * Home!" (always with a grown-up safety note). Parts can be spun with a
 * finger. Attic machines add "Real History" pages.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { speak } from '../audio/voice';
import { drawRoomBackdrop } from '../art/backgrounds';
import { CM } from '../art/copperMoss';
import { collectionFrame } from '../art/finish';
import { coverImage, withArt } from '../art/generated';
import { drawSmallObject } from '../art/objects';
import { drawPart } from '../art/parts';
import { ATTIC_OBJECTS, atticRoomId } from '../content/attic';
import { PEDIA, pediaLines, type PediaEntry } from '../content/pedia';
import type { Family } from '../content/types';
import { roomFixed } from '../core/progress';
import { profile } from '../core/save';
import { blocker, card, FONT, roundButton, SERIF, scrollGrid, showWords, tile } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';

const FAMILIES: Array<[Family, string]> = [
  ['gears', 'gear'],
  ['levers', 'lever'],
  ['springs', 'spring'],
  ['pendulums', 'pendulum'],
  ['music', 'notes'],
  ['tracks', 'track'],
  ['circuits', 'bulb'],
  ['pipes', 'valve'],
  ['logic', 'gate-and'],
  ['light', 'prism'],
];

export class PediaScene extends MetaScene {
  private family: Family | 'attic' = 'gears';
  private grid?: Phaser.GameObjects.Container;
  private page: Phaser.GameObjects.GameObject[] = [];
  private tabs: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('pedia');
  }

  protected build(): void {
    this.page = [];
    this.tabs = [];
    this.grid = undefined;
    const p = profile();
    drawRoomBackdrop(this, 'shop', 700).setDepth(0);
    this.add.rectangle(0, 0, 1280, 720, 0x1a120c, 0.4).setOrigin(0).setDepth(1);
    collectionFrame(this, 155, 100, 1090, 597, CM.woodDark, 0.66);
    this.music('shop', 0.5);
    this.backButton();
    this.heading('Part-o-pedia');
    const have = PEDIA.filter((e) => p.pedia.includes(e.id)).length;
    this.add
      .text(1220, 52, `${have} / ${PEDIA.length}`, { fontFamily: FONT, fontSize: '26px', color: '#f1d391', fontStyle: 'bold', stroke: '#342f29', strokeThickness: 6 })
      .setOrigin(1, 0.5)
      .setDepth(HUD);
    const fams: Array<[Family | 'attic', string]> = [...FAMILIES];
    if (p.attic.rooms.length) fams.push(['attic', 'key']);
    fams.forEach(([f, icon], i) => {
      const y = 130 + i * 54;
      const t = tile(this, 80, y, 110, 50, () => this.show(f), { selected: f === this.family });
      const g = this.add.graphics();
      drawPart(g, icon, -6, 0, 0.42);
      t.add(g);
      const n = f === 'attic' ? 0 : PEDIA.filter((e) => e.family === f && p.pedia.includes(e.id)).length;
      if (n) t.add(this.add.text(42, 0, String(n), { fontFamily: FONT, fontSize: '16px', color: '#485541', fontStyle: 'bold' }).setOrigin(0.5));
      t.setDepth(10);
      this.tabs.push(t);
      this.hot(`tab-${f}`, () => this.show(f));
    });
    this.show(this.family);
    this.time.delayedCall(400, () => this.line('shop.pedia'));
  }

  private show(f: Family | 'attic'): void {
    this.family = f;
    this.grid?.destroy();
    const p = profile();
    this.tabs.forEach((t, i) => t.setScale(i === [...FAMILIES.map((x) => x[0]), 'attic'].indexOf(f) ? 1.08 : 1));
    if (f === 'attic') {
      const done = ATTIC_OBJECTS.filter((o) => [1, 2, 3].every((n) => roomFixed(p, atticRoomId(o.id, n))));
      this.grid = scrollGrid(this, 170, 100, 1080, 600, done.length, { w: 180, h: 180, cols: 6 }, (i, x, y) => {
        const o = done[i];
        const t = tile(this, x, y, 166, 166, () => this.historyPage(o.id, o.title, o.history), { caption: showWords() ? o.title : undefined, captionSize: 13 });
        const g = this.add.graphics();
        drawSmallObject(g, o.id, 0, -18, 0.55);
        t.add(g);
        return t;
      }).setDepth(10);
      if (!done.length) this.line('pedia.attic');
      return;
    }
    const entries = PEDIA.filter((e) => e.family === f);
    this.grid = scrollGrid(this, 170, 100, 1080, 600, entries.length, { w: 180, h: 180, cols: 6 }, (i, x, y) => {
      const e = entries[i];
      const got = p.pedia.includes(e.id);
      const t = tile(this, x, y, 166, 166, () => (got ? this.entryPage(e) : (sfx.nuhUh(), this.line('pedia.locked'))), {
        caption: got && showWords() ? e.name : undefined,
        captionSize: 14,
        locked: !got,
      });
      if (got) {
        const g = this.add.graphics();
        drawPart(g, e.id, 0, -16, 1.05);
        t.add(g);
      } else t.add(this.add.text(0, -6, '?', { fontFamily: SERIF, fontSize: '64px', color: '#6b5d48', fontStyle: 'bold' }).setOrigin(0.5));
      if (got) this.hot(`entry-${e.id}`, () => this.entryPage(e));
      return t;
    }).setDepth(10);
  }

  private closePage(): void {
    this.page.forEach((o) => o.destroy());
    this.page = [];
  }

  private add2<T extends Phaser.GameObjects.GameObject>(o: T): T {
    (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(HUD + 10);
    this.page.push(o);
    return o;
  }

  private entryPage(e: PediaEntry): void {
    this.closePage();
    this.add2(blocker(this, HUD + 10, 0.65, () => this.closePage()));
    this.add2(card(this, 640, 370, 1120, 580));
    // a part you can spin with a finger
    const spin = this.add2(this.add.container(330, 360));
    const g = this.add.graphics();
    drawPart(g, e.id, 0, 0, 2.2);
    spin.add(g);
    spin.setSize(360, 360).setInteractive({ draggable: true, useHandCursor: true });
    let last = 0;
    spin.on('dragstart', (ptr: Phaser.Input.Pointer) => (last = Math.atan2(ptr.y - 360, ptr.x - 330)));
    spin.on('drag', (ptr: Phaser.Input.Pointer) => {
      const a = Math.atan2(ptr.y - 360, ptr.x - 330);
      spin.rotation += a - last;
      last = a;
    });
    spin.on('dragend', () => sfx.whirr());
    const icons = ['🔊', '⚙', '🏠'];
    const lines = pediaLines(e).map((l, i) => [icons[i], l.text, l.id] as const);
    if (showWords()) this.add2(this.add.text(620, 120, e.name, { fontFamily: SERIF, fontSize: '40px', color: '#342f29', fontStyle: 'bold' }));
    lines.forEach(([icon, text, id], i) => {
      const y = 220 + i * 140;
      this.add2(roundButton(this, 650, y + 20, icon, () => void speak('nana', text, id), { r: 32, fontSize: 28 }));
      if (showWords()) this.add2(this.add.text(700, y - 10, text, { fontFamily: FONT, fontSize: '20px', color: '#342f29', wordWrap: { width: 480 }, lineSpacing: 4 }));
    });
    this.add2(roundButton(this, 1170, 120, '✕', () => this.closePage(), { r: 26, fontSize: 22 }));
    void speak('nana', e.say, `pedia.${e.id}.say`);
  }

  private historyPage(id: string, name: string, history: string): void {
    this.closePage();
    this.add2(blocker(this, HUD + 10, 0.65, () => this.closePage()));
    this.add2(card(this, 640, 370, 1000, 520));
    const g = this.add2(this.add.graphics());
    drawSmallObject(g, id, 380, 360, 1.6);
    withArt(this, `attic-${id}`, (key) => {
      if (!g.active) return;
      g.setVisible(false);
      this.add2(coverImage(this, key, 200, 210, 360, 300));
    });
    if (showWords()) {
      this.add2(this.add.text(640, 150, name, { fontFamily: SERIF, fontSize: '36px', color: '#342f29', fontStyle: 'bold' }));
      this.add2(this.add.text(640, 220, history, { fontFamily: FONT, fontSize: '21px', color: '#342f29', wordWrap: { width: 460 }, lineSpacing: 5 }));
    }
    this.add2(roundButton(this, 660, 560, '🔊', () => void speak('nana', history, `attic.${id}.history`), { r: 32, fontSize: 28 }));
    this.add2(roundButton(this, 1110, 140, '✕', () => this.closePage(), { r: 26, fontSize: 22 }));
    void speak('nana', history, `attic.${id}.history`);
  }
}
