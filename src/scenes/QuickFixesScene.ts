/**
 * The Quick Fixes basket (GDD §15): 24 short, one-mechanism repairs that
 * unlock in threes alongside the Great Repairs. Perfect first games and
 * "one more" moments; replayable forever.
 */
import * as sfx from '../audio/sfx';
import { drawRoomBackdrop } from '../art/backgrounds';
import { drawSmallObject } from '../art/objects';
import { badge } from '../art/portraits';
import { drawPadlock } from '../art/shop';
import { REPAIRS } from '../content/repairs';
import { QUICK_FIXES } from '../content/quickfixes';
import { quickOpen, roomFixed } from '../core/progress';
import { profile } from '../core/save';
import { FONT, scrollGrid, showWords, tile } from '../ui/widgets';
import { MetaScene } from './MetaScene';
import { go } from './router';

export class QuickFixesScene extends MetaScene {
  constructor() {
    super('quickfixes');
  }

  protected build(): void {
    const p = profile();
    drawRoomBackdrop(this, 'shop', 700).setDepth(0);
    this.add.rectangle(0, 0, 1280, 720, 0x1a120c, 0.35).setOrigin(0).setDepth(1);
    this.music('shop', 0.6);
    this.backButton();
    this.heading('Quick Fixes');
    this.counters();
    const cols = 6;
    const cell = { w: 196, h: 200, cols };
    const grid = scrollGrid(this, 52, 100, cols * cell.w, 600, QUICK_FIXES.length, cell, (i, x, y) => {
      const q = QUICK_FIXES[i];
      const open = quickOpen(p, q);
      const fixed = roomFixed(p, q.room.id);
      const t = tile(this, x, y, 180, 184, () => {
        if (!open) {
          sfx.nuhUh();
          this.line('quick.locked');
          return;
        }
        go(this, { scene: 'room', launch: { roomId: q.room.id, mode: 'quick' } });
      }, { caption: showWords() ? q.title : undefined, captionSize: 14, locked: !open, fill: fixed ? 0xe8f7d8 : undefined });
      const g = this.add.graphics();
      drawSmallObject(g, q.object, 0, -26, 0.62);
      t.add(g);
      t.add(badge(this, -62, -62, q.owner, 20));
      if (!open) {
        const lock = this.add.graphics();
        drawPadlock(lock, 54, -58, 0.9);
        if (q.after) {
          lock.fillStyle(0xfff6e2, 1);
          lock.fillCircle(54, -12, 20);
          drawSmallObject(lock, REPAIRS[q.after - 1].object, 54, -12, 0.24);
        }
        t.add(lock);
        g.setAlpha(0.5);
      } else if (fixed) {
        t.add(this.add.text(60, -62, '✓', { fontFamily: FONT, fontSize: '30px', color: '#2e9b5f', fontStyle: 'bold' }).setOrigin(0.5));
      }
      this.hot(q.id, () => open && go(this, { scene: 'room', launch: { roomId: q.room.id, mode: 'quick' } }));
      return t;
    });
    grid.setDepth(10);
    this.time.delayedCall(400, () => this.line('shop.quick'));
  }
}
