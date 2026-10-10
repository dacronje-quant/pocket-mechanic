/**
 * The Paint & Polish Station (GDD §18): Kip (or Tess) is rebuilt here, slot by
 * slot. Everything is earned in play: thank-you gifts, lost treasures, Quick
 * Fixes, medals, Golden Gears, the Attic — or Shiny Bits found while fixing.
 * After a new finish or plate, rub Kip with the cloth until every bit shines.
 * Up to six Saved Looks.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { drawRoomBackdrop } from '../art/backgrounds';
import { Kip } from '../art/Kip';
import { drawSmallObject } from '../art/objects';
import { drawPart } from '../art/parts';
import { drawPadlock } from '../art/shop';
import { COSMETICS, type Cosmetic, type CosmeticSlot, type KipLook } from '../content/cosmetics';
import { REPAIRS } from '../content/repairs';
import { QUICK_FIXES } from '../content/quickfixes';
import { buyCosmetic, checkStamps, cosmeticOwned, setFlag, tessUnlocked } from '../core/progress';
import { persist, profile } from '../core/save';
import { FONT, roundButton, scrollGrid, showWords, tile, toast } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';

const SLOTS: Array<[CosmeticSlot, string]> = [
  ['finish', '🎨'],
  ['key', '🔑'],
  ['plate', '🛡'],
  ['eyes', '👀'],
  ['bulb', '💡'],
  ['hat', '🎩'],
  ['feet', '👟'],
  ['trail', '✨'],
  ['voice', '🔊'],
  ['tool', '🔧'],
];

export class PaintScene extends MetaScene {
  private who: 'kip' | 'tess' = 'kip';
  private slot: CosmeticSlot = 'finish';
  private big!: Kip;
  private grid?: Phaser.GameObjects.Container;
  private pending: string | null = null;
  private smudges: Phaser.GameObjects.Arc[] = [];
  private looksRow?: Phaser.GameObjects.Container;
  private slotBtns: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('paint');
  }

  private look(): KipLook {
    const p = profile();
    return this.who === 'tess' ? p.tessLook : p.look;
  }

  private setLook(l: KipLook): void {
    const p = profile();
    if (this.who === 'tess') p.tessLook = l;
    else p.look = l;
  }

  protected build(data: Record<string, unknown>): void {
    const p = profile();
    this.who = data.who === 'tess' && tessUnlocked(p) ? 'tess' : 'kip';
    this.pending = null;
    this.smudges = [];
    this.slotBtns = [];
    this.grid = undefined;
    drawRoomBackdrop(this, 'shop', 700).setDepth(0);
    this.add.rectangle(0, 0, 1280, 720, 0x1a120c, 0.3).setOrigin(0).setDepth(1);
    this.music('shop', 0.7);
    this.backButton();
    this.heading(this.who === 'tess' ? "Tess's Corner" : 'Paint & Polish');
    this.counters();

    // the turntable stand
    const stand = this.add.graphics().setDepth(2);
    stand.fillStyle(0x000000, 0.3);
    stand.fillEllipse(300, 600, 340, 60);
    stand.fillStyle(0x8a5a33, 1);
    stand.fillEllipse(300, 590, 320, 56);
    stand.fillStyle(0xa36d40, 1);
    stand.fillEllipse(300, 584, 300, 46);
    if (this.look().initials !== p.initials && this.who === 'kip') this.setLook({ ...this.look(), initials: p.initials });
    this.big = new Kip(this, 300, 590, this.look(), this.who).setScale(3.6).setDepth(5);
    this.big.setInteractive(new Phaser.Geom.Rectangle(-35, -90, 70, 90), Phaser.Geom.Rectangle.Contains);
    this.big.on('pointerup', () => {
      sfx.beeps('hello', this.look().voice);
      this.big.celebrate();
    });

    SLOTS.forEach(([slot, icon], i) => {
      const b = roundButton(this, 600 + i * 64, 130, icon, () => this.showSlot(slot), { r: 28, fontSize: 24, color: slot === this.slot ? 0xffc928 : 0xe0ab48 }).setDepth(HUD);
      this.slotBtns.push(b);
      this.hot(`slot-${slot}`, () => this.showSlot(slot));
    });
    if (tessUnlocked(p)) {
      roundButton(this, 120, 160, this.who === 'tess' ? '🤖' : '👧', () => this.scene.restart({ who: this.who === 'tess' ? 'kip' : 'tess' }), { r: 30, fontSize: 26, say: this.who === 'tess' ? 'Kip' : 'Tess' }).setDepth(HUD);
    }
    this.showSlot('finish');
    this.savedLooks();
    this.time.delayedCall(400, () => this.line(this.who === 'tess' ? 'shop.tess' : 'shop.paint'));
  }

  private showSlot(slot: CosmeticSlot): void {
    this.slot = slot;
    this.pending = null;
    this.grid?.destroy();
    SLOTS.forEach(([s], i) => this.slotBtns[i]?.setScale(s === slot ? 1.15 : 1));
    const p = profile();
    const items = COSMETICS.filter((c) => c.slot === slot && !(this.who === 'tess' && c.id === 'plate-monogram'));
    this.grid = scrollGrid(this, 560, 175, 680, 400, items.length, { w: 136, h: 150, cols: 5 }, (i, x, y) => {
      const c = items[i];
      const owned = cosmeticOwned(p, c);
      const wearing = (this.look() as unknown as Record<string, string>)[slot] === c.id;
      const t = tile(this, x, y, 126, 140, () => this.pick(c), { selected: wearing, locked: !owned && c.source.kind !== 'shiny', captionSize: 11, caption: showWords() ? c.name : undefined });
      if (slot === 'voice') t.add(this.add.text(0, -20, '🔊', { fontFamily: FONT, fontSize: '40px' }).setOrigin(0.5));
      else {
        const preview: KipLook = { ...this.look(), [slot]: c.id } as KipLook;
        t.add(new Kip(this, 0, showWords() ? 26 : 40, preview, this.who).setScale(slot === 'feet' ? 1 : 0.95));
      }
      if (!owned) this.addSourceBadge(t, c);
      this.hot(`item-${c.id}`, () => this.pick(c));
      return t;
    }).setDepth(10);
  }

  /** What earns a locked item, as a picture: a repair's object, a Quick Fix, medals, gears… */
  private addSourceBadge(t: Phaser.GameObjects.Container, c: Cosmetic): void {
    const g = this.add.graphics();
    const s = c.source;
    if (s.kind === 'shiny') {
      g.fillStyle(0xfff6e2, 1);
      g.fillRoundedRect(14, -66, 50, 26, 10);
      t.add(g);
      t.add(this.add.image(26, -53, 'bit').setScale(1));
      t.add(this.add.text(54, -53, String(s.cost), { fontFamily: FONT, fontSize: '15px', color: '#3b260b', fontStyle: 'bold' }).setOrigin(0.5));
      return;
    }
    drawPadlock(g, 46, -50, 0.7);
    g.fillStyle(0xfff6e2, 1);
    g.fillCircle(-44, -48, 18);
    if (s.kind === 'repair') drawSmallObject(g, REPAIRS[s.repair - 1].object, -44, -48, 0.2);
    else if (s.kind === 'quick') drawSmallObject(g, QUICK_FIXES.find((q) => q.room.id === s.quick)?.object ?? 'door', -44, -48, 0.2);
    else if (s.kind === 'treasure') drawPart(g, 'heart', -44, -48, 0.25);
    else if (s.kind === 'gold') drawPart(g, 'gear', -44, -48, 0.25);
    else if (s.kind === 'medals') {
      g.fillStyle(0xffd700, 1);
      g.fillCircle(-44, -48, 11);
    } else drawPart(g, 'key', -44, -48, 0.25);
    t.add(g);
  }

  private pick(c: Cosmetic): void {
    const p = profile();
    if (!cosmeticOwned(p, c)) {
      if (c.source.kind !== 'shiny') {
        sfx.nuhUh();
        this.line('paint.locked');
        return;
      }
      if (this.pending !== c.id) {
        this.pending = c.id;
        this.tryOn(c);
        this.line('paint.buy');
        return;
      }
      if (!buyCosmetic(p, c)) {
        sfx.nuhUh();
        this.line('paint.poor');
        this.big.setLook(this.look());
        return;
      }
      sfx.coin();
      this.refreshShiny();
    }
    this.wear(c);
  }

  private tryOn(c: Cosmetic): void {
    this.big.setLook({ ...this.look(), [c.slot]: c.id } as KipLook);
    if (c.slot === 'voice') sfx.beeps('hello there', c.id);
  }

  private wear(c: Cosmetic): void {
    const p = profile();
    this.setLook({ ...this.look(), [c.slot]: c.id } as KipLook);
    // unscrew, snap on: a little pop
    this.tweens.add({ targets: this.big, scaleY: 3.3, duration: 90, yoyo: true });
    this.big.setLook(this.look());
    sfx.clunk();
    if (c.slot === 'voice') sfx.beeps('hello there', c.id);
    setFlag(p, 'paint');
    const stamps = checkStamps(p);
    persist();
    stamps.forEach((st, i) => this.time.delayedCall(600 + i * 2600, () => toast(this, `Stamp: ${st.name}`, undefined, st.glyph)));
    this.showSlot(this.slot);
    if (c.slot === 'finish' || c.slot === 'plate') this.startPolish();
  }

  /** Polish mini-game: rub the smudges off with the cloth (drag over Kip). */
  private startPolish(): void {
    this.smudges.forEach((s) => s.destroy());
    this.smudges = [];
    for (let i = 0; i < 7; i++) {
      const s = this.add.circle(300 + (Math.random() - 0.5) * 140, 380 + Math.random() * 180, 14 + Math.random() * 10, 0x6b4a2a, 0.55).setDepth(6);
      this.smudges.push(s);
    }
    this.line('paint.polish');
    const rub = (ptr: Phaser.Input.Pointer) => {
      if (!ptr.isDown) return;
      for (const s of this.smudges) {
        if (!s.active || Phaser.Math.Distance.Between(ptr.x, ptr.y, s.x, s.y) > s.radius + 26) continue;
        s.setAlpha(s.alpha - 0.18);
        if (s.alpha <= 0.08) {
          s.destroy();
          sfx.sparkle();
        }
      }
      if (this.smudges.every((s) => !s.active)) {
        this.input.off('pointermove', rub);
        this.shine();
      }
    };
    this.input.on('pointermove', rub);
    this.hot('polish', () => {
      this.input.off('pointermove', rub);
      this.shine();
    });
  }

  private shine(): void {
    this.smudges.forEach((s) => s.destroy());
    this.smudges = [];
    this.big.celebrate();
    this.add.particles(300, 450, 'star', { lifespan: 900, speed: { min: 60, max: 180 }, scale: { start: 0.7, end: 0 }, emitting: false }).setDepth(7).explode(20);
    const p = profile();
    if (setFlag(p, 'polish')) {
      checkStamps(p);
      persist();
      toast(this, 'Stamp: Polished until it shone', undefined, '✨');
    }
  }

  private savedLooks(): void {
    this.looksRow?.destroy();
    const p = profile();
    const row = this.add.container(0, 0).setDepth(HUD - 2);
    this.looksRow = row;
    for (let i = 0; i < 6; i++) {
      const x = 600 + i * 96;
      const saved = p.looks[i];
      const t = tile(this, x, 650, 86, 100, () => {
        if (!saved) return;
        this.setLook({ ...saved, initials: this.look().initials });
        this.big.setLook(this.look());
        this.big.celebrate();
        persist();
        this.showSlot(this.slot);
      }, { fill: saved ? 0xf3e2bd : 0xd8cbb0 });
      if (saved) t.add(new Kip(this, 0, 36, saved, this.who).setScale(0.75));
      row.add(t);
    }
    row.add(
      roundButton(this, 600 + 6 * 96 + 10, 650, '💾', () => {
        const looks = p.looks;
        if (looks.length >= 6) looks.shift();
        looks.push({ ...this.look() });
        persist();
        sfx.ding();
        this.line('paint.saved');
        this.savedLooks();
      }, { r: 34, fontSize: 28, say: 'Save this look' }),
    );
  }
}
