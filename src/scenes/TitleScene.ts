/**
 * Title and profiles (GDD §21.3: up to 6 local profiles). A profile is a
 * colour for Kip, optional letter-stamp initials and a Play Style — no
 * names, no free text. Grown-up settings sit behind the parental gate.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { drawRoomBackdrop, sunbeams } from '../art/backgrounds';
import { paintedBackdrop, withArt } from '../art/generated';
import { CM, CM_CSS } from '../art/copperMoss';
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
  /** Bumped whenever the new-fixer panel opens or closes, so late timers from an old panel do nothing. */
  private panelGen = 0;

  constructor() {
    super('title');
  }

  protected build(): void {
    this.panel = [];
    drawRoomBackdrop(this, 'shop', 700).setDepth(0);
    sunbeams(this, 0xffe2a0, 0.05).setDepth(1);
    paintedBackdrop(this, 'title', 2);
    // Quiet, slow clockwork along the edge of the hand-lettered title.
    [
      [246, 142, 12, 0.04],
      [775, 295, 10, -0.05],
    ].forEach(([x, y, teeth, speed]) => {
      const gimg = this.add.image(x, y, ensureGearTexture(this, teeth, 'brass')).setDepth(3).setAlpha(0.3).setScale(0.6);
      this.tweens.add({ targets: gimg, angle: speed > 0 ? 360 : -360, duration: Math.abs(1 / speed) * 2400, repeat: -1 });
    });
    const name = title(this, 500, 192, 'Pocket\nMechanic', 88).setDepth(5).setColor(CM_CSS.ink).setStroke(CM_CSS.paper, 2);
    const subtitle = this.add
      .text(500, 318, 'The Clockwork Repair Shop', { fontFamily: SERIF, fontSize: '26px', color: CM_CSS.ink, fontStyle: 'bold', stroke: CM_CSS.paper, strokeThickness: 2 })
      .setOrigin(0.5)
      .setDepth(5);
    withArt(this, 'title-logo', (key) => {
      const logo = this.add.image(500, 214, key).setDepth(5);
      const scale = Math.min(600 / logo.width, 290 / logo.height);
      logo.setScale(scale);
      name.setVisible(false);
      subtitle.setVisible(false);
    });
    this.add.text(500, 367, "Who's fixing today?", { fontFamily: SERIF, fontSize: '26px', color: CM_CSS.ink, fontStyle: 'bold', stroke: CM_CSS.paper, strokeThickness: 2 }).setOrigin(0.5).setDepth(5);
    const kip = new Kip(this, 930, 598, DEFAULT_LOOK).setDepth(6).setScale(3);
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
    // First launch begins on the illustrated title page. The large + opens colour selection.
  }

  private profiles(): void {
    const list = save.profiles;
    const n = list.length + (list.length < MAX_PROFILES ? 1 : 0);
    const compact = n > 3;
    if (compact) this.bubble.setPosition(640, 50);
    const w = compact ? 150 : 200;
    const h = compact ? 154 : 190;
    const position = (i: number) => {
      if (!compact) return { x: 500 - ((n - 1) * (w + 18)) / 2 + i * (w + 18), y: 515 };
      const row = Math.floor(i / 4);
      const count = Math.min(4, n - row * 4);
      return { x: 500 - ((count - 1) * (w + 16)) / 2 + (i % 4) * (w + 16), y: 459 + row * 171 };
    };
    list.forEach((p, i) => {
      const { x, y } = position(i);
      const t = tile(this, x, y, w, h, () => this.choose(p.id), { selected: p.id === save.active }).setDepth(10);
      const mini = new Kip(this, 0, compact ? 24 : 30, p.look).setScale(compact ? 0.9 : 1.35);
      t.add(mini);
      t.add(
        this.add
          .text(0, compact ? 43 : 53, p.initials || '·', { fontFamily: SERIF, fontSize: compact ? '24px' : '30px', color: CM_CSS.ink, fontStyle: 'bold', backgroundColor: CM_CSS.paper, padding: { x: 10, y: 2 } })
          .setOrigin(0.5),
      );
      t.add(this.add.text(w / 2 - 28, -h / 2 + 30, PLAY_STYLES[p.style].icon, { fontFamily: FONT, fontSize: '22px' }).setOrigin(0.5));
      this.hot(`profile${i}`, () => this.choose(p.id));
    });
    if (list.length < MAX_PROFILES) {
      const { x, y } = position(list.length);
      const t = tile(this, x, y, w, h, () => this.newProfile(), { fill: CM.paper }).setDepth(10);
      t.add(this.add.text(0, -14, '+', { fontFamily: SERIF, fontSize: compact ? '70px' : '96px', color: CM_CSS.mossDark, fontStyle: 'bold' }).setOrigin(0.5));
      t.add(this.add.text(0, compact ? 42 : 48, 'New fixer', { fontFamily: SERIF, fontSize: compact ? '21px' : '25px', color: CM_CSS.ink, fontStyle: 'bold' }).setOrigin(0.5));
    }
  }

  private choose(id: string): void {
    switchProfile(id);
    const p = save.profiles.find((q) => q.id === id)!;
    sfx.dingDong();
    go(this, prologueOr(p, { scene: 'shop' }));
  }

  private closePanel(): void {
    this.panelGen++;
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
  }

  /** New fixer: pick a colour → stamp letters (optional) → pick a tool (Play Style). */
  private newProfile(): void {
    this.closePanel();
    const gen = this.panelGen;
    const live = () => gen === this.panelGen && this.scene.isActive();
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
          // Only if this panel is still the open one: this timer used to fire after ✕ or after
          // the panel was reopened, dropping a second keypad on top of the first. Taps then
          // went to one keypad while the other one's letters were shown.
          this.time.delayedCall(500, () => live() && letters());
        }));
        t.add(new Kip(this, 0, 56, { ...DEFAULT_LOOK, finish: fin }).setScale(1.4));
        this.hot(`colour${i}`, () => {
          avatar = i;
          look.finish = fin;
          letters();
        });
      });
    };

    let onLetters = false;
    const letters = () => {
      if (onLetters || !live()) return; // two quick colour taps used to build the keypad twice
      onLetters = true;
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
      if (!live()) return;
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

    let created = false;
    const create = (sid: PlayStyleId) => {
      if (created || !live()) return; // one profile per panel, however many taps
      created = true;
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
