/**
 * The Mystery Attic (GDD §16): 23 antique machines Nana never managed to
 * fix, three generated rooms each. Fixing all three reveals the machine's
 * secret symbol; the Mystery Box's lid shows four of the machines, and its
 * dials open when they are set to those machines' symbols, in order.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { drawRoomBackdrop } from '../art/backgrounds';
import { coverImage, withArt } from '../art/generated';
import { drawSmallObject } from '../art/objects';
import { ATTIC_OBJECTS, atticRoomId, BOX_COMBINATION } from '../content/attic';
import type { AtticObjectDef } from '../content/types';
import { roomFixed } from '../core/progress';
import { profile, type Profile } from '../core/save';
import { blocker, card, FONT, roundButton, SERIF, scrollGrid, showWords, tile } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';
import { go } from './router';

const objectDone = (p: Profile, o: AtticObjectDef) => [1, 2, 3].every((n) => roomFixed(p, atticRoomId(o.id, n)));
/** The four machines pictured on the Mystery Box lid, in dial order. */
export const BOX_LID = BOX_COMBINATION.map((glyph) => ATTIC_OBJECTS.find((o) => o.clue === glyph)!.id);

export class AtticScene extends MetaScene {
  private panel: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('attic');
  }

  protected build(): void {
    this.panel = [];
    const p = profile();
    drawRoomBackdrop(this, 'attic', 700).setDepth(0);
    this.add.rectangle(0, 0, 1280, 720, 0x0b1020, 0.35).setOrigin(0).setDepth(1);
    // moonlight through the round window
    const moon = this.add.image(1150, 110, 'glow').setScale(4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4).setDepth(2);
    this.tweens.add({ targets: moon, alpha: 0.25, duration: 3000, yoyo: true, repeat: -1 });
    this.music('attic');
    this.backButton();
    this.heading('The Attic');

    const cols = 5;
    const cell = { w: 186, h: 190, cols };
    scrollGrid(this, 40, 100, cols * cell.w, 610, ATTIC_OBJECTS.length, cell, (i, x, y) => {
      const o = ATTIC_OBJECTS[i];
      const done = objectDone(p, o);
      const t = tile(this, x, y, 172, 176, () => this.open(o), { caption: showWords() ? o.title : undefined, captionSize: 14, fill: done ? 0xe6e0ff : 0xd8cbb0 });
      const g = this.add.graphics();
      drawSmallObject(g, o.id, 0, -28, 0.6);
      t.add(g);
      for (let n = 1; n <= 3; n++) {
        const fixed = roomFixed(p, atticRoomId(o.id, n));
        t.add(this.add.circle(-60 + (n - 1) * 16, -66, 6, fixed ? 0x2e9b5f : 0x9a8a72).setStrokeStyle(2, 0x3b260b));
      }
      if (done) t.add(this.add.text(58, -62, o.clue, { fontFamily: SERIF, fontSize: '30px', color: '#5f3dc4', fontStyle: 'bold' }).setOrigin(0.5));
      this.hot(`attic-${o.id}`, () => this.open(o));
      return t;
    }).setDepth(10);

    // the Mystery Box, on its own
    const box = this.add.container(1110, 470).setDepth(10);
    const bg = this.add.graphics();
    drawSmallObject(bg, 'mysterybox', 0, 0, 1.3);
    box.add(bg);
    if (p.attic.box) box.add(this.add.text(0, -90, '✦', { fontFamily: FONT, fontSize: '40px', color: '#ffd43b' }).setOrigin(0.5));
    box.setSize(200, 200).setInteractive({ useHandCursor: true });
    box.on('pointerup', () => this.boxPanel());
    this.tweens.add({ targets: box, angle: { from: -1.5, to: 1.5 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.hot('box', () => this.boxPanel());
  }

  private open(o: AtticObjectDef): void {
    const p = profile();
    const next = [1, 2, 3].find((n) => !roomFixed(p, atticRoomId(o.id, n)));
    if (next) {
      go(this, { scene: 'room', launch: { roomId: atticRoomId(o.id, next), mode: 'attic' } });
      return;
    }
    // all fixed: replay any room, hear its real history, see its symbol
    this.close();
    const depth = HUD + 10;
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      (obj as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(depth);
      this.panel.push(obj);
      return obj;
    };
    add(blocker(this, depth, 0.65, () => this.close()));
    add(card(this, 640, 360, 760, 460));
    const g = add(this.add.graphics());
    drawSmallObject(g, o.id, 460, 300, 1.1);
    withArt(this, `attic-${o.id}`, (key) => {
      if (!g.active) return;
      g.setVisible(false);
      add(coverImage(this, key, 330, 190, 260, 200));
    });
    add(this.add.text(460, 440, o.clue, { fontFamily: SERIF, fontSize: '64px', color: '#5f3dc4', fontStyle: 'bold' }).setOrigin(0.5));
    if (showWords()) {
      add(this.add.text(820, 170, o.title, { fontFamily: SERIF, fontSize: '30px', color: '#3b260b', fontStyle: 'bold' }).setOrigin(0.5, 0));
      add(this.add.text(620, 220, o.history, { fontFamily: FONT, fontSize: '19px', color: '#3b260b', wordWrap: { width: 380 }, lineSpacing: 4 }));
    }
    add(roundButton(this, 820, 470, '🔊', () => this.bubble.say(o.history, { id: `attic.${o.id}.history` }), { r: 30, fontSize: 24 }));
    [1, 2, 3].forEach((n) =>
      add(roundButton(this, 560 + n * 90, 540, String(n), () => go(this, { scene: 'room', launch: { roomId: atticRoomId(o.id, n), mode: 'attic' } }), { r: 30, fontSize: 26 })),
    );
    add(roundButton(this, 990, 160, '✕', () => this.close(), { r: 24, fontSize: 20 }));
    this.line('attic.done');
  }

  private close(): void {
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
  }

  private boxPanel(): void {
    this.close();
    const p = profile();
    if (p.attic.box) {
      go(this, { scene: 'story', id: 'box-open', next: { scene: 'attic' } });
      return;
    }
    const depth = HUD + 10;
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      (obj as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(depth);
      this.panel.push(obj);
      return obj;
    };
    add(blocker(this, depth, 0.7, () => this.close()));
    add(card(this, 640, 360, 900, 520, 0x8a5a33, 0x3d2412));
    // the lid: four carved machines
    BOX_LID.forEach((id, i) => {
      const x = 640 + (i - 1.5) * 190;
      const lid = add(this.add.graphics());
      lid.fillStyle(0xf3e2bd, 1);
      lid.fillRoundedRect(x - 70, 160, 140, 130, 16);
      drawSmallObject(lid, id, x, 225, 0.6);
    });
    // dials cycle through the symbols found so far
    const found = ATTIC_OBJECTS.filter((o) => objectDone(p, o)).map((o) => o.clue);
    const options = found.length ? found : ['?'];
    const set = [0, 0, 0, 0];
    const dials = [0, 1, 2, 3].map((i) => {
      const x = 640 + (i - 1.5) * 190;
      const t = add(this.add.text(x, 400, options[0], { fontFamily: SERIF, fontSize: '64px', color: '#3b260b', fontStyle: 'bold', backgroundColor: '#fff6e2', padding: { x: 22, y: 6 } }).setOrigin(0.5));
      t.setInteractive({ useHandCursor: true });
      t.on('pointerup', () => {
        set[i] = (set[i] + 1) % options.length;
        t.setText(options[set[i]]);
        sfx.ratchet(1);
        check();
      });
      return t;
    });
    const check = () => {
      const now = set.map((k) => options[k]);
      if (now.every((g, i) => g === BOX_COMBINATION[i])) {
        sfx.bigFanfare();
        dials.forEach((d) => this.tweens.add({ targets: d, y: d.y - 20, duration: 200, yoyo: true }));
        this.time.delayedCall(1200, () => go(this, { scene: 'story', id: 'box-open', next: { scene: 'attic' } }));
      }
    };
    this.hot('boxSolve', () => {
      // the playthrough sets the dials directly
      BOX_COMBINATION.forEach((g, i) => {
        const k = options.indexOf(g);
        if (k >= 0) set[i] = k;
        dials[i].setText(options[set[i]]);
      });
      check();
    });
    add(roundButton(this, 1060, 130, '✕', () => this.close(), { r: 24, fontSize: 20 }));
    this.line(found.length >= 4 ? 'attic.box' : 'attic.boxShut');
  }
}
