/**
 * Title and profiles (GDD §21.3: up to 6 local profiles). A profile is a
 * colour for Kip, optional letter-stamp initials and a Play Style — no
 * names, no free text. Grown-up settings sit behind the parental gate.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { drawRoomBackdrop, sunbeams } from '../art/backgrounds';
import { paintedBackdrop } from '../art/generated';
import { Kip } from '../art/Kip';
import { ensureGearTexture } from '../art/textures';
import { DEFAULT_LOOK, type KipLook } from '../content/cosmetics';
import { SPOKEN_PLAY_STYLE } from '../content/story';
import type { PlayStyleId } from '../content/types';
import { prologueOr } from '../core/journey';
import { addProfile, MAX_PROFILES, persist, save, switchProfile } from '../core/save';
import { PLAY_STYLES } from '../core/styles';
import { blocker, card, FONT, keypad, parentalGate, roundButton, SERIF, tile, title } from '../ui/widgets';
import { speak } from '../audio/voice';
import { HUD, MetaScene } from './MetaScene';
import { go, goScene } from './router';

/** Kip colours offered for a new profile (avatar index → finish). */
export const AVATARS = ['finish-brass', 'finish-copper', 'finish-silver', 'finish-red', 'finish-sky', 'finish-green'];

export class TitleScene extends MetaScene {
  private panel: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('title');
  }

  protected build(): void {
    this.panel = [];
    drawRoomBackdrop(this, 'shop', 700).setDepth(0);
    sunbeams(this, 0xffe2a0, 0.05).setDepth(1);
    paintedBackdrop(this, 'title', 2);
    // big slow gears behind the name
    [
      [200, 150, 40, 0.06],
      [1090, 170, 30, -0.08],
      [330, 250, 16, -0.15],
    ].forEach(([x, y, teeth, speed]) => {
      const gimg = this.add.image(x, y, ensureGearTexture(this, teeth, 'brass')).setDepth(3).setAlpha(0.75);
      this.tweens.add({ targets: gimg, angle: speed > 0 ? 360 : -360, duration: Math.abs(1 / speed) * 2400, repeat: -1 });
    });
    title(this, 640, 118, 'Pocket Mechanic', 78).setDepth(5);
    this.add
      .text(640, 186, 'The Clockwork Repair Shop', { fontFamily: SERIF, fontSize: '30px', color: '#fff3d0', fontStyle: 'italic', stroke: '#2b1d14', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(5);
    const kip = new Kip(this, 1140, 690, DEFAULT_LOOK).setDepth(6).setScale(2);
    kip.setInteractive(new Phaser.Geom.Rectangle(-5, -45, 80, 100), Phaser.Geom.Rectangle.Contains);
    kip.on('pointerup', () => {
      sfx.beeps('hello', 'voice-classic');
      kip.celebrate();
    });
    this.time.delayedCall(900, () => kip.celebrate());
    this.music('title');

    this.profiles();
    roundButton(this, 60, 660, '⚙', () => parentalGate(this, () => goScene(this, 'grownups', { back: 'title' })), { r: 30, fontSize: 26, say: 'For grown-ups' }).setDepth(HUD);
    this.hot('new', () => this.newProfile());
    this.time.delayedCall(700, () => this.line('title.who'));
    if (!save.profiles.length) this.time.delayedCall(400, () => this.newProfile());
  }

  private profiles(): void {
    const list = save.profiles;
    const n = list.length + (list.length < MAX_PROFILES ? 1 : 0);
    const w = 160;
    const x0 = 640 - ((n - 1) * (w + 20)) / 2;
    list.forEach((p, i) => {
      const x = x0 + i * (w + 20);
      const t = tile(this, x, 420, w, 190, () => this.choose(p.id), { selected: p.id === save.active }).setDepth(10);
      const mini = new Kip(this, 0, 44, p.look).setScale(1.25);
      t.add(mini);
      t.add(
        this.add
          .text(0, 66, p.initials || '·', { fontFamily: SERIF, fontSize: '30px', color: '#3b260b', fontStyle: 'bold', backgroundColor: '#fff6e2', padding: { x: 10, y: 2 } })
          .setOrigin(0.5),
      );
      t.add(this.add.text(52, -68, PLAY_STYLES[p.style].icon, { fontFamily: FONT, fontSize: '26px' }).setOrigin(0.5));
      this.hot(`profile${i}`, () => this.choose(p.id));
    });
    if (list.length < MAX_PROFILES) {
      const x = x0 + list.length * (w + 20);
      const t = tile(this, x, 420, w, 190, () => this.newProfile(), { fill: 0xe8f7d8 }).setDepth(10);
      t.add(this.add.text(0, -8, '+', { fontFamily: FONT, fontSize: '96px', color: '#3b7d3b', fontStyle: 'bold' }).setOrigin(0.5));
    }
  }

  private choose(id: string): void {
    switchProfile(id);
    const p = save.profiles.find((q) => q.id === id)!;
    sfx.dingDong();
    go(this, prologueOr(p, { scene: 'shop' }));
  }

  private closePanel(): void {
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
  }

  /** New fixer: pick a colour → stamp letters (optional) → pick a tool (Play Style). */
  private newProfile(): void {
    this.closePanel();
    const look: KipLook = { ...DEFAULT_LOOK };
    let avatar = 0;
    let initials = '';
    const depth = HUD + 30;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(depth);
      this.panel.push(o);
      return o;
    };
    add(blocker(this, depth, 0.65));
    add(card(this, 640, 380, 1060, 600));
    const preview = add(new Kip(this, 210, 560, look).setScale(2.4));
    add(roundButton(this, 1135, 112, '✕', () => this.closePanel(), { r: 26, fontSize: 22, say: 'Close' }));
    const stepObjs: Phaser.GameObjects.GameObject[] = [];
    const clearStep = () => {
      stepObjs.forEach((o) => o.destroy());
      stepObjs.length = 0;
    };
    const addStep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      add(o);
      stepObjs.push(o);
      return o;
    };

    const colours = () => {
      clearStep();
      this.line('title.new');
      AVATARS.forEach((fin, i) => {
        const x = 470 + (i % 3) * 200;
        const y = 250 + Math.floor(i / 3) * 210;
        const t = addStep(tile(this, x, y, 170, 190, () => {
          avatar = i;
          look.finish = fin;
          preview.setLook(look);
          preview.celebrate();
          this.time.delayedCall(500, letters);
        }));
        t.add(new Kip(this, 0, 56, { ...DEFAULT_LOOK, finish: fin }).setScale(1.4));
        this.hot(`colour${i}`, () => {
          avatar = i;
          look.finish = fin;
          letters();
        });
      });
    };

    const letters = () => {
      clearStep();
      this.line('title.letters');
      let moved = false;
      const next = () => {
        if (moved) return;
        moved = true;
        styles();
      };
      const pad = keypad(this, 650, 190, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 3, (v) => {
        initials = v;
        look.initials = v;
        preview.setLook(look);
      }, depth, next);
      const padObj = { destroy: () => pad.destroy() } as unknown as Phaser.GameObjects.GameObject;
      stepObjs.push(padObj);
      this.panel.push(padObj);
      // Letters are optional, so ▶ is always live; a slow pulse shows it's the way on.
      const nextBtn = addStep(roundButton(this, 1080, 560, '▶', next, { r: 44, fontSize: 40, color: 0x8ce99a, say: 'Next' }));
      nextBtn.once(Phaser.GameObjects.Events.DESTROY, () => this.tweens.killTweensOf(nextBtn));
      this.tweens.add({ targets: nextBtn, scale: 1.12, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1200 });
      this.hot('lettersNext', next);
    };

    const styles = () => {
      clearStep();
      this.line('title.style');
      (['tinker', 'fixer', 'engineer'] as PlayStyleId[]).forEach((sid, i) => {
        const st = PLAY_STYLES[sid];
        const x = 470 + i * 210;
        const t = addStep(tile(this, x, 360, 190, 260, () => create(sid), { caption: st.name, captionSize: 18 }));
        t.add(this.add.text(0, -40, st.icon, { fontFamily: FONT, fontSize: '84px' }).setOrigin(0.5));
        t.on('pointerover', () => void speak('nana', SPOKEN_PLAY_STYLE[sid], `style.${sid}`));
        this.hot(`style-${sid}`, () => create(sid));
      });
    };

    const create = (sid: PlayStyleId) => {
      const p = addProfile(initials, avatar, sid);
      if (!p) return this.closePanel();
      p.look = { ...look };
      persist();
      this.closePanel();
      sfx.fanfare();
      go(this, prologueOr(p, { scene: 'shop' }));
    };

    colours();
  }
}
