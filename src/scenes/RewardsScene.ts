/**
 * After the Return (GDD §6.7, §19): the Thank-You Token (tried on Kip right
 * away), Lost Treasures given back with their owners' words, new tools, the
 * object's song, Shiny Bits, stamps — and a postcard from Brasswick.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { playMelody } from '../audio/music';
import { speak } from '../audio/voice';
import { drawStage } from '../art/backgrounds';
import { coverImage, withArt } from '../art/generated';
import { Kip } from '../art/Kip';
import { MachineArt } from '../art/objects';
import { drawPart } from '../art/parts';
import { badge } from '../art/portraits';
import { cosmeticById, type KipLook } from '../content/cosmetics';
import { repairById, TREASURES } from '../content/repairs';
import { SONGS } from '../content/songs';
import type { CharId } from '../content/types';
import type { Step } from '../core/journey';
import { checkStamps } from '../core/progress';
import { persist, profile } from '../core/save';
import { pm } from '../debug';
import { card, FONT, roundButton, SERIF, showWords, toast } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';
import { lastRepairReport } from './RevealScene';
import { go } from './router';

export class RewardsScene extends MetaScene {
  private next!: Step;
  private done = false;

  constructor() {
    super('rewards');
  }

  protected build(data: Record<string, unknown>): void {
    this.done = false;
    this.next = (data.next as Step) ?? { scene: 'shop' };
    const r = repairById(Number(data.repair));
    const p = profile();
    drawStage(this, 'shop').setDepth(0);
    this.add.rectangle(0, 0, 1280, 720, 0x1a120c, 0.45).setOrigin(0).setDepth(1);
    this.music(r.theme, 1);
    if (showWords()) this.heading('Thank you!', 60);
    this.counters(1180);

    // the postcard: a generated picture of the fixed object back home, or a drawn one
    const pc = this.add.container(250, 250).setDepth(5).setAngle(-4);
    pc.add(card(this, 0, 0, 380, 250, 0xfff6e2));
    const drawn = new MachineArt(this, 0, 10, r.object, 0.42).setWorking(true);
    pc.add(drawn);
    withArt(this, `postcard-${r.key}`, (key) => {
      const img = coverImage(this, key, -175, -110, 350, 220);
      pc.add(img);
      drawn.setVisible(false);
    });

    // the Thank-You Token, on Kip
    const token = cosmeticById(r.reward);
    const center = this.add.container(640, 330).setDepth(5);
    center.add(card(this, 0, 0, 330, 330));
    const look: KipLook = { ...p.look };
    if (token) (look as unknown as Record<string, string>)[token.slot] = token.id;
    const kip = new Kip(this, -40, 120, look).setScale(2.4);
    center.add(kip);
    center.add(badge(this, -120, -120, r.owner, 34));
    if (token && showWords()) center.add(this.add.text(0, -150, token.name, { fontFamily: FONT, fontSize: '18px', color: '#3b260b', fontStyle: 'bold', wordWrap: { width: 300 }, align: 'center' }).setOrigin(0.5));
    if (token) {
      const wear = roundButton(this, 640, 530, '✓', () => {
        p.look = look;
        persist();
        sfx.sparkle();
        kip.celebrate();
        wear.destroy();
      }, { r: 34, fontSize: 30, color: 0x8ce99a, say: 'Wear it!' }).setDepth(HUD);
      this.hot('wear', () => wear.emit('pointerup'));
    }
    this.time.delayedCall(400, () => {
      this.line('rewards.thanks');
      kip.celebrate();
      sfx.fanfare();
    });

    // right column: treasures, tools, song, shiny bits
    const items: Array<{ draw: (g: Phaser.GameObjects.Graphics) => void; label: string; act?: () => void }> = [];
    for (const t of r.treasures) {
      if (!p.treasures.includes(t)) continue;
      const tr = TREASURES[t];
      items.push({ draw: (g) => drawPart(g, 'heart', 0, 0, 0.5), label: tr.name, act: () => void speak(tr.owner as CharId, tr.line, `treasure.${t}`) });
    }
    for (const tool of r.tools) items.push({ draw: (g) => drawPart(g, tool, 0, 0, 0.5), label: 'New tool!' });
    const song = SONGS.find((s) => s.id === r.song);
    if (song) items.push({ draw: (g) => drawPart(g, 'notes', 0, 0, 0.5), label: song.name, act: () => playMelody(song.notes, song.tempo, 'triangle') });
    const shiny = lastRepairReport?.shiny ?? 0;
    if (shiny) items.push({ draw: (g) => drawPart(g, 'screw', 0, 0, 0.6), label: `+${shiny} shiny bits` });
    items.slice(0, 5).forEach((it, i) => {
      const y = 150 + i * 92;
      const row = this.add.container(1010, y).setDepth(5).setAlpha(0);
      const g = this.add.graphics();
      g.fillStyle(0xfff6e2, 0.95);
      g.fillRoundedRect(-170, -38, 340, 76, 16);
      const icon = this.add.graphics().setPosition(-126, 0);
      it.draw(icon);
      row.add([g, icon]);
      if (showWords()) row.add(this.add.text(-84, 0, it.label, { fontFamily: FONT, fontSize: '18px', color: '#3b260b', fontStyle: 'bold', wordWrap: { width: 240 } }).setOrigin(0, 0.5));
      if (it.act) {
        row.setSize(340, 76).setInteractive({ useHandCursor: true });
        row.on('pointerup', it.act);
      }
      this.tweens.add({ targets: row, alpha: 1, x: 1000, duration: 300, delay: 1000 + i * 500 });
      if (it.act && i < 2) this.time.delayedCall(3200 + i * 3600, it.act);
    });

    // stamps from the repair
    const stamps = [...(lastRepairReport?.newStamps ?? []), ...checkStamps(p)];
    persist();
    stamps.forEach((st, i) => this.time.delayedCall(2200 + i * 2600, () => toast(this, `Stamp: ${st.name}`, undefined, st.glyph)));

    roundButton(this, 1180, 640, '▶', () => this.finish(), { r: 40, fontSize: 36, color: 0x8ce99a, say: 'Next' }).setDepth(HUD);
    if (showWords()) this.add.text(250, 400, r.title, { fontFamily: SERIF, fontSize: '22px', color: '#fff3d0', fontStyle: 'bold', stroke: '#2b1d14', strokeThickness: 5 }).setOrigin(0.5).setDepth(6);
    pm.next = () => this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    go(this, this.next);
  }
}
