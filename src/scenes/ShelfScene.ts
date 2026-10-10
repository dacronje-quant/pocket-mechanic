/**
 * The Display Shelf (GDD §13.1, §20): every repaired object, still working.
 * Hop back into any room as a Playground (everything fixed, just play) or a
 * Tune-Up (Engineer rules, Copper → Silver → Gold → Brass medals). The shelf
 * is shared: little letter stamps show who in the family fixed each one.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { drawRoomBackdrop } from '../art/backgrounds';
import { MachineArt } from '../art/objects';
import { drawPart } from '../art/parts';
import { ensureGearTexture } from '../art/textures';
import { getRoom } from '../content/index';
import { REPAIRS } from '../content/repairs';
import type { RepairDef } from '../content/types';
import type { RoomMode } from '../core/journey';
import { repairDone } from '../core/progress';
import { profile, save } from '../core/save';
import { blocker, card, FONT, roundButton, SERIF, showWords, tile } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';
import { go } from './router';

const MEDAL_COL = [0x9a8a72, 0xb87333, 0xc0c0c0, 0xffd700, 0xe0ab48];

export class ShelfScene extends MetaScene {
  private panel: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('shelf');
  }

  protected build(): void {
    this.panel = [];
    const p = profile();
    drawRoomBackdrop(this, 'shop', 700).setDepth(0);
    this.add.rectangle(0, 0, 1280, 720, 0x1a120c, 0.3).setOrigin(0).setDepth(1);
    this.music('shop', 0.8);
    this.backButton();
    this.heading('Display Shelf');
    this.counters();

    const g = this.add.graphics().setDepth(2);
    for (const y of [360, 640]) {
      g.fillStyle(0x000000, 0.3);
      g.fillRect(64, y + 6, 1160, 22);
      g.fillStyle(0x4a2d18, 1);
      g.fillRect(60, y, 1160, 22);
      g.fillStyle(0x6e4527, 1);
      g.fillRect(60, y, 1160, 6);
    }
    REPAIRS.forEach((r, i) => {
      const x = 205 + (i % 4) * 290;
      const y = i < 4 ? 360 : 640;
      if (repairDone(p, r.id)) this.object(r, x, y);
      else this.emptySlot(x, y);
    });
  }

  private object(r: RepairDef, x: number, y: number): void {
    const p = profile();
    const m = new MachineArt(this, x, y - 10, r.object, 0.36).setDepth(5).setWorking(true);
    m.setSize(240, 300).setInteractive({ useHandCursor: true });
    m.on('pointerup', () => {
      sfx.click();
      m.perform();
      this.roomsPanel(r);
    });
    this.hot(`shelf${r.id}`, () => this.roomsPanel(r));
    // medals won in this repair's Tune-Ups
    const medals = r.rooms.map((id) => p.rooms[id]?.medal ?? 0);
    const best = Math.max(...medals);
    if (best > 0) this.add.circle(x + 100, y - 210, 16, MEDAL_COL[best]).setStrokeStyle(3, 0x2b1d14).setDepth(6);
    // who in the family fixed it (shared shelf, GDD §21.3)
    const fixers = save.profiles.filter((q) => q.repairs.includes(r.id));
    fixers.slice(0, 6).forEach((q, k) => {
      this.add
        .text(x - 90 + k * 36, y + 11, q.initials || '•', { fontFamily: SERIF, fontSize: '15px', color: '#3b260b', fontStyle: 'bold', backgroundColor: '#fff6e2', padding: { x: 4, y: 1 } })
        .setOrigin(0.5)
        .setDepth(6);
    });
  }

  private emptySlot(x: number, y: number): void {
    const g = this.add.graphics().setDepth(4);
    g.lineStyle(3, 0xfff6e2, 0.25);
    g.strokeRoundedRect(x - 90, y - 190, 180, 180, 18);
    const z = this.add.zone(x, y - 100, 180, 180).setInteractive().setDepth(4);
    z.on('pointerup', () => this.line('shelf.empty'));
  }

  private close(): void {
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
  }

  private roomsPanel(r: RepairDef): void {
    this.close();
    const p = profile();
    const depth = HUD + 10;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(depth);
      this.panel.push(o);
      return o;
    };
    add(blocker(this, depth, 0.65, () => this.close()));
    add(card(this, 640, 380, 1180, 520));
    if (showWords()) add(this.add.text(640, 160, r.title, { fontFamily: SERIF, fontSize: '30px', color: '#3b260b', fontStyle: 'bold' }).setOrigin(0.5));
    // medal criteria up front (GDD §20.2): moves, time, no hints or peeking
    const crit = add(this.add.container(640, 205));
    [
      ['🎯', 'few moves'],
      ['⏱', 'quick'],
      ['🙈', 'no hints, no peeking'],
    ].forEach(([icon, label], i) => {
      crit.add(this.add.text((i - 1) * 230 - 30, 0, icon, { fontFamily: FONT, fontSize: '28px' }).setOrigin(0.5));
      if (showWords()) crit.add(this.add.text((i - 1) * 230 - 8, 0, label, { fontFamily: FONT, fontSize: '18px', color: '#5e3f10' }).setOrigin(0, 0.5));
    });
    add(roundButton(this, 1200, 140, '✕', () => this.close(), { r: 26, fontSize: 22, say: 'Close' }));
    r.rooms.forEach((id, i) => {
      const def = getRoom(id);
      if (!def) return;
      const x = 640 + (i - (r.rooms.length - 1) / 2) * 162;
      const rec = p.rooms[id];
      const t = add(tile(this, x, 380, 150, 200, () => undefined, { caption: showWords() ? def.title : undefined, captionSize: 13 }));
      t.disableInteractive();
      const ic = this.add.graphics();
      drawPart(ic, def.pedia[0] ?? 'gear', 0, -48, 0.55);
      t.add(ic);
      for (let k = 1; k <= 3; k++) {
        t.add(this.add.image(-36 + (k - 1) * 36, 10, ensureGearTexture(this, 12, rec?.gold.includes(k) ? 'gold' : 'ghost')).setScale(0.45));
      }
      const medal = rec?.medal ?? 0;
      if (medal) t.add(this.add.circle(52, -76, 13, MEDAL_COL[medal]).setStrokeStyle(3, 0x2b1d14));
      const launch = (mode: RoomMode) => go(this, { scene: 'room', launch: { roomId: id, mode } });
      add(roundButton(this, x - 36, 530, '▶', () => launch('playground'), { r: 28, fontSize: 24, color: 0x8ce99a, say: 'Play' }));
      add(roundButton(this, x + 36, 530, '⏱', () => launch('tuneup'), { r: 28, fontSize: 24, say: 'Tune-Up' }));
      this.hot(`play-${id}`, () => launch('playground'));
      this.hot(`tune-${id}`, () => launch('tuneup'));
    });
    this.line('shelf.pick');
  }
}
