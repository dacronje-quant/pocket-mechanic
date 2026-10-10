/**
 * Story scenes (GDD §4 "Story delivery rules"): short, warm, visual first.
 * Characters stand on a stage, the speaker talks and changes mood, sounds and
 * little effects play with each line. Words appear only when subtitles are
 * shown (never in Little Tinker unless a grown-up turns them on). Tap to move
 * on; scenes you've seen before can be skipped.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { playMelody } from '../audio/music';
import { speak, stopVoice } from '../audio/voice';
import { drawStage } from '../art/backgrounds';
import { CM, CM_CSS, drawPatina } from '../art/copperMoss';
import { MachineArt } from '../art/objects';
import { badge, Portrait } from '../art/portraits';
import { REPAIRS } from '../content/repairs';
import { SONGS } from '../content/songs';
import { storyById } from '../content/story';
import type { CharId, NestDeco, StoryDef, StoryLine } from '../content/types';
import { VOICES } from '../content/voices';
import type { Step } from '../core/journey';
import { checkStamps, setFlag } from '../core/progress';
import { persist, profile, settings } from '../core/save';
import { pm } from '../debug';
import { drawDeco } from '../rooms/SimpleRooms';
import { FONT, roundButton, SERIF, showWords } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';
import { go } from './router';

export class StoryScene extends MetaScene {
  private story!: StoryDef;
  private next!: Step;
  private cur = -1;
  private shownAt = 0;
  private finished = false;
  private cast = new Map<CharId, Portrait>();
  private machine?: MachineArt;
  private subBg!: Phaser.GameObjects.Graphics;
  private subName!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private subFace?: Phaser.GameObjects.Container;
  private wave!: Phaser.GameObjects.Graphics;
  private waveT = 0;
  private talking = false;
  private stars!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffs!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('story');
  }

  protected build(data: Record<string, unknown>): void {
    this.next = (data.next as Step) ?? { scene: 'shop' };
    const story = storyById(String(data.id));
    this.cur = -1;
    this.finished = false;
    this.cast = new Map();
    this.machine = undefined;
    this.subFace = undefined;
    if (!story) {
      this.time.delayedCall(10, () => go(this, this.next, true));
      return;
    }
    this.story = story;
    drawStage(this, story.bg).setDepth(0);
    this.musicFor(story);

    if ((story.id === 'epilogue' || story.id === 'magnus-nest') && profile().nest) this.drawNest(1040, 150);

    // the object on the bench
    if (story.object) {
      this.machine = new MachineArt(this, 640, 470, story.object.id, 0.62).setDepth(6);
      this.machine.setWorking(!!story.object.working);
    }

    // the cast, spread across the stage; Kip and Tess stand on the bench
    const people = story.cast.filter((c) => c !== 'kip' && c !== 'tess');
    const small = story.cast.filter((c) => c === 'kip' || c === 'tess');
    const xs = spread(people.length, story.object ? [180, 420, 860, 1100] : [240, 520, 800, 1060]);
    people.forEach((who, i) => {
      const p = new Portrait(this, xs[i], 330, who, 0.95).setDepth(5).setAlpha(0);
      this.tweens.add({ targets: p, alpha: 1, y: 320, duration: 400, delay: i * 120, ease: 'Quad.easeOut' });
      this.cast.set(who, p);
    });
    small.forEach((who, i) => {
      const x = story.object ? 800 + i * 110 : 640 + i * 120;
      const p = new Portrait(this, x, 420, who, 0.5).setDepth(7);
      if (who === 'kip') p.setKipLook(profile().look);
      if (who === 'tess') p.setKipLook(profile().tessLook);
      this.cast.set(who, p);
    });

    // subtitles (or a sound wave for reading-free play)
    this.subBg = this.add.graphics().setDepth(HUD - 5);
    this.wave = this.add.graphics().setDepth(HUD - 4);
    this.subName = this.add.text(250, 600, '', { fontFamily: SERIF, fontSize: '22px', color: CM_CSS.copperDark, fontStyle: 'bold' }).setDepth(HUD - 4);
    this.subText = this.add
      .text(250, 630, '', { fontFamily: FONT, fontSize: '26px', color: CM_CSS.ink, wordWrap: { width: 860 }, lineSpacing: 4 })
      .setDepth(HUD - 4);

    const calm = settings().calm;
    this.stars = this.add.particles(0, 0, 'star', { lifespan: 1400, speed: { min: 80, max: 260 }, scale: { start: 0.9, end: 0 }, gravityY: 120, emitting: false }).setDepth(HUD - 10);
    this.confetti = this.add
      .particles(0, 0, 'confetti', { x: { min: 0, max: 1280 }, y: -10, lifespan: 4000, speedY: { min: 80, max: 200 }, speedX: { min: -40, max: 40 }, rotate: { min: 0, max: 360 }, tint: [0xff6b6b, 0xffd43b, 0x74c0fc, 0x8ce99a, 0xb197fc], emitting: false })
      .setDepth(HUD - 10);
    this.puffs = this.add.particles(0, 0, 'puff', { lifespan: 1800, speedY: { min: -80, max: -40 }, speedX: { min: -20, max: 20 }, scale: { start: 0.6, end: 2 }, alpha: { start: 0.6, end: 0 }, emitting: false }).setDepth(HUD - 10);
    if (calm) this.confetti.setFrequency(-1);

    const seen = profile().seen.includes(story.id);
    if (seen) roundButton(this, 1224, 52, '⏭', () => this.finish(), { say: 'Skip' }).setDepth(HUD);
    roundButton(this, 1180, 640, '▶', () => this.advance(), { r: 34, fontSize: 30, color: 0x8ce99a, say: 'Next' }).setDepth(HUD);
    this.input.on('pointerup', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length) this.advance();
    });
    pm.next = () => this.finish();
    this.time.delayedCall(500, () => this.show(0));
  }

  private musicFor(story: StoryDef): void {
    if (story.id === 'epilogue') return this.music('festival');
    if (story.bg === 'attic') return this.music('attic');
    const rep = story.object ? REPAIRS.find((r) => r.object === story.object!.id) : undefined;
    if (rep) return this.music(rep.theme, story.object?.working ? 1 : 0.2);
    this.music('shop', story.bg === 'storm' ? 0 : 0.5);
  }

  private show(i: number): void {
    if (this.finished) return;
    const lines = this.story.lines;
    if (i >= lines.length) return this.finish();
    this.cur = i;
    this.shownAt = this.time.now;
    const line = lines[i];
    for (const [who, p] of this.cast) {
      const speaking = who === line.who;
      p.talk(false);
      this.tweens.add({ targets: p, alpha: speaking || !this.cast.has(line.who) ? 1 : 0.85, duration: 200 });
      if (speaking) {
        p.setMood(line.mood ?? 'happy');
        if (!VOICES[who]?.beeps) p.talk(true);
      }
    }
    this.subtitle(line);
    this.effect(line);
    this.talking = true;
    void speak(line.who, line.text, line.id).then(() => {
      if (this.cur !== i || this.finished) return;
      this.talking = false;
      this.cast.get(line.who)?.talk(false);
      this.time.delayedCall(600, () => {
        if (this.cur === i) this.show(i + 1);
      });
    });
  }

  private advance(): void {
    if (this.finished || this.cur < 0) return;
    if (this.time.now - this.shownAt < 350) return;
    stopVoice();
    this.show(this.cur + 1);
  }

  private subtitle(line: StoryLine): void {
    const words = showWords();
    const g = this.subBg;
    g.clear();
    g.fillStyle(0x000000, 0.28);
    g.fillRoundedRect(144, 586, 1000, 116, 24);
    g.fillStyle(CM.copperDark, 1);
    g.fillRoundedRect(140, 580, 1000, 116, 24);
    g.fillStyle(CM.paper, 0.98);
    g.fillRoundedRect(146, 586, 988, 104, 19);
    g.lineStyle(1, CM.brass, 0.9);
    g.strokeRoundedRect(143, 583, 994, 110, 21);
    drawPatina(g, 150, 587, 980, 7, 508, 0.3);
    for (const x of [154, 1126]) for (const y of [593, 682]) {
      g.fillStyle(CM.brass, 1);
      g.fillCircle(x, y, 3);
      g.lineStyle(1, CM.copperDark, 1);
      g.lineBetween(x - 1.5, y + 1, x + 1.5, y - 1);
    }
    this.subFace?.destroy();
    this.subFace = badge(this, 196, 638, line.who, 40).setDepth(HUD - 4);
    this.subName.setText(words ? VOICES[line.who]?.name ?? '' : '');
    this.subText.setFontSize(26).setText(words ? line.text : '');
    // Long lines stay inside the parchment strip on every play style.
    for (let size = 25; this.subText.height > 58 && size >= 18; size--) this.subText.setFontSize(size);
    this.wave.setVisible(!words);
  }

  private effect(line: StoryLine): void {
    const calm = settings().calm;
    switch (line.sfx) {
      case 'thunder':
        sfx.thunder();
        if (!calm) this.cameras.main.flash(160, 190, 205, 255);
        break;
      case 'bell':
      case 'bong':
        sfx.bong();
        if (!calm) this.cameras.main.shake(300, 0.004);
        break;
      case 'doorbell':
        sfx.dingDong();
        break;
      case 'cuckoo':
        sfx.cuckoo(2);
        this.machine?.perform();
        break;
      case 'lullaby':
        playMelody(SONGS.find((s) => s.id === 'song-lullaby')!.notes, 3, 'sine');
        this.machine?.setWorking(true);
        break;
      case 'whistle':
        sfx.whistle();
        this.puffs.explode(8, 640, 400);
        break;
      case 'static':
        sfx.staticBurst();
        break;
      case 'steam':
        sfx.hiss();
        this.puffs.explode(12, 640, 420);
        break;
      case 'dance':
        playMelody(SONGS.find((s) => s.id === 'song-boogie')!.notes, 4, 'square');
        for (const p of this.cast.values()) this.tweens.add({ targets: p, y: p.y - 18, angle: { from: -4, to: 4 }, duration: 240, yoyo: true, repeat: 5 });
        break;
      case 'stars':
        sfx.sparkle();
        for (let k = 0; k < 4; k++) this.time.delayedCall(k * 250, () => this.stars.explode(calm ? 6 : 16, 200 + Math.random() * 880, 120 + Math.random() * 120));
        break;
      case 'flap':
        sfx.flap();
        break;
      case 'cheer':
        sfx.cheer();
        if (!calm) this.confetti.explode(60);
        break;
      case 'sparkle':
        sfx.sparkle();
        this.stars.explode(calm ? 8 : 24, 640, 360);
        break;
      case 'purr':
        sfx.purr();
        break;
    }
  }

  private drawNest(x: number, y: number): void {
    const nest = profile().nest ?? {};
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x5a3a22, 1);
    g.fillEllipse(x, y + 40, 280, 90);
    g.lineStyle(3, 0x8a5a33, 1);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      g.lineBetween(x + Math.cos(a) * 90, y + 40 + Math.sin(a) * 26, x + Math.cos(a + 0.6) * 135, y + 40 + Math.sin(a + 0.6) * 40);
    }
    Object.values(nest).forEach((deco, i, all) => {
      const a = Math.PI + (i / Math.max(1, all.length - 1)) * Math.PI;
      drawDeco(g, deco as NestDeco, x + Math.cos(a) * 110, y + 30 + Math.sin(a) * 40);
    });
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    stopVoice();
    const p = profile();
    if (!p.seen.includes(this.story.id)) p.seen.push(this.story.id);
    if (this.story.id === 'box-open') {
      p.attic.box = true;
      setFlag(p, 'box');
    }
    checkStamps(p);
    persist();
    go(this, this.next);
  }

  update(_t: number, dt: number): void {
    if (!this.wave?.visible) return;
    this.waveT += dt / 1000;
    const g = this.wave;
    g.clear();
    g.lineStyle(6, 0xb88a2c, 1);
    for (let i = 0; i < 12; i++) {
      const h = this.talking ? 10 + Math.abs(Math.sin(this.waveT * 8 + i * 0.9)) * 44 : 8;
      g.lineBetween(290 + i * 26, 638 - h / 2, 290 + i * 26, 638 + h / 2);
    }
  }
}

function spread(n: number, slots: number[]): number[] {
  if (n <= 0) return [];
  if (n === 1) return [slots[0]];
  if (n === 2) return [slots[0], slots[slots.length - 1]];
  if (n === 3) return [slots[0], slots[1], slots[slots.length - 1]];
  return slots.slice(0, n);
}
