/**
 * Character portraits for story scenes and speech bubbles, drawn in code.
 * People share one parameterised builder (skin, hair, specs, hats, clothes);
 * the residents, Magnus and Big Bertie get their own drawings. Each portrait
 * can change mood, blink and "talk" (mouth flap) while its line plays.
 */
import Phaser from 'phaser';
import type { CharId, Mood } from '../content/types';
import { heart, Kip, star } from './Kip';
import { DEFAULT_LOOK, TESS_LOOK } from '../content/cosmetics';
import { CM, drawPatina } from './copperMoss';
import { withArt } from './generated';
import { atlasFrame } from './sprites';

type HairStyle = 'bun' | 'short' | 'curly' | 'pigtails' | 'puffs' | 'long' | 'wild' | 'bald' | 'braid' | 'updo' | 'neat' | 'tuft';
type Hat = 'none' | 'captain' | 'feathered' | 'tophat' | 'postman' | 'straw' | 'beanie' | 'toque' | 'goggles';

interface Person {
  skin: number;
  hair: HairStyle;
  hairColor: number;
  specs?: 'big' | 'round';
  hat?: Hat;
  hatColor?: number;
  clothes: number;
  collar?: number;
  beard?: number;
  mustache?: number;
  child?: boolean;
  extra?: 'flour' | 'pencils' | 'gap' | 'freckles' | 'bowtie' | 'apron' | 'starclip' | 'oilskin' | 'pockets' | 'cardigan';
  wide?: boolean;
}


const PEOPLE: Partial<Record<CharId, Person>> = {
  nana: { skin: 0xe7bc96, hair: 'bun', hairColor: 0xd8d2bf, specs: 'big', clothes: CM.moss, collar: CM.cream, extra: 'pencils' },
  albert: { skin: 0xf0c09a, hair: 'short', hairColor: 0x8a6a4a, clothes: 0xd9c7a0, mustache: 0x8a6a4a, extra: 'flour', wide: true, hat: 'toque' },
  rosa: { skin: 0xc68a5c, hair: 'pigtails', hairColor: 0x2b1d14, clothes: 0xaf7985, child: true, extra: 'gap' },
  theo: { skin: 0x6b4226, hair: 'curly', hairColor: 0x1b120c, clothes: 0x657c80, child: true },
  ada: { skin: 0x6b4226, hair: 'puffs', hairColor: 0x1b120c, clothes: 0xc38b57, child: true },
  marigold: { skin: 0xe8b48a, hair: 'short', hairColor: 0xb0b0b0, hat: 'captain', hatColor: 0x526975, clothes: 0x526975, collar: 0xf4ebd5 },
  pepperwhistle: { skin: 0xf1d1b5, hair: 'updo', hairColor: 0xb5442c, hat: 'feathered', hatColor: 0x82718c, clothes: 0x78815a },
  pockets: { skin: 0xd9a07a, hair: 'wild', hairColor: 0xf5f5f5, hat: 'tophat', hatColor: 0x403d38, clothes: 0x946568, extra: 'pockets' },
  juniper: { skin: 0x8d5a3b, hair: 'long', hairColor: 0x1b120c, specs: 'round', clothes: 0x829ba0, extra: 'starclip' },
  ade: { skin: 0x5a3a24, hair: 'short', hairColor: 0x1b120c, hat: 'postman', hatColor: 0x526975, clothes: 0x526975, mustache: 0x1b120c },
  odum: { skin: 0xe0a985, hair: 'braid', hairColor: 0xa0a0a0, hat: 'straw', hatColor: 0xcbb56f, clothes: 0x78815a },
  lindqvist: { skin: 0xf3d6c0, hair: 'neat', hairColor: 0xd8c08a, specs: 'round', clothes: 0x403d38, extra: 'bowtie', mustache: 0xd8c08a },
  busker: { skin: 0xc9945f, hair: 'short', hairColor: 0x3d2b1e, hat: 'beanie', hatColor: 0xc38b57, clothes: 0x537a72, beard: 0x3d2b1e },
  mateo: { skin: 0xc68a5c, hair: 'curly', hairColor: 0x2b1d14, clothes: 0x78815a, child: true, extra: 'freckles' },
  pip: { skin: 0xf3d2b8, hair: 'tuft', hairColor: 0xd8a650, clothes: 0xd1b972, child: true },
  odette: { skin: 0xf2c9a5, hair: 'braid', hairColor: 0x7a4b26, hat: 'goggles', clothes: 0x78815a, child: true, extra: 'apron' },
  fisher: { skin: 0xe0a985, hair: 'short', hairColor: 0x3d2b1e, hat: 'beanie', hatColor: 0x526975, clothes: 0xd1b972, beard: 0x7a5a3a, extra: 'oilskin' },
};

const PAINTED_PEOPLE: CharId[] = ['albert', 'rosa', 'theo', 'ada', 'marigold', 'pepperwhistle', 'pockets', 'juniper', 'ade', 'odum', 'lindqvist', 'busker', 'mateo', 'pip', 'odette', 'fisher'];
const PAINTED_CREATURES: CharId[] = ['magnus', 'coo', 'clementine', 'mice', 'humbug', 'steamington', 'bertie', 'lumen', 'pigeon', 'whisker', 'pudding'];

/** Head centres in the trimmed full-body artwork, for readable circular badges. */
const FACE_ANCHORS: Partial<Record<CharId, [number, number]>> = {
  nana: [.59, .215], albert: [.53, .32], rosa: [.5, .27], theo: [.56, .23], ada: [.5, .28],
  marigold: [.52, .25], pepperwhistle: [.51, .29], pockets: [.52, .34], juniper: [.48, .24],
  ade: [.57, .26], odum: [.5, .3], lindqvist: [.5, .24], busker: [.5, .25],
  mateo: [.5, .27], pip: [.55, .28], odette: [.5, .27], fisher: [.48, .15],
  magnus: [.73, .19], coo: [.64, .27], clementine: [.64, .25], mice: [.6, .24],
  humbug: [.63, .51], steamington: [.6, .35], bertie: [.58, .22], lumen: [.69, .43],
  pigeon: [.75, .25], whisker: [.66, .34], pudding: [.55, .45],
};

/** Figures whose face is a big part of the picture (a curled-up cat, a huddle of mice) zoom in less in badges. */
const HEAD_HEIGHT: Partial<Record<CharId, number>> = { pudding: 250, mice: 430 };

export class Portrait extends Phaser.GameObjects.Container {
  readonly who: CharId;
  private bodyG!: Phaser.GameObjects.Graphics;
  private face!: Phaser.GameObjects.Graphics;
  private mouth!: Phaser.GameObjects.Graphics;
  private lids!: Phaser.GameObjects.Graphics;
  private kip?: Kip;
  private mood: Mood = 'happy';
  private talking = false;
  private talkT = 0;
  private open = false;
  private blinkTimer?: Phaser.Time.TimerEvent;
  private portraitArt?: Phaser.GameObjects.Image;
  private artT = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, who: CharId, scale = 1, private readonly headOnly = false) {
    super(scene, x, y);
    this.who = who;
    this.setScale(scale);
    if (who === 'kip' || who === 'tess') {
      this.kip = new Kip(scene, 0, 120, who === 'tess' ? TESS_LOOK : DEFAULT_LOOK, who === 'tess' ? 'tess' : 'kip');
      this.kip.setScale(2.6);
      this.add(this.kip);
    } else {
      this.bodyG = scene.add.graphics();
      this.face = scene.add.graphics();
      this.mouth = scene.add.graphics();
      this.lids = scene.add.graphics();
      this.add([this.bodyG, this.face, this.mouth, this.lids]);
      this.draw();
      this.blinkTimer = scene.time.addEvent({ delay: 2600 + Math.random() * 1500, loop: true, callback: () => this.blink() });
      // Story subtitles rebuild their portrait badge every line; without this the
      // orphaned timer called blink() on a destroyed portrait and froze the game.
      this.once(Phaser.GameObjects.Events.DESTROY, () => this.blinkTimer?.remove());
      this.loadPaintedPortrait();
    }
    scene.add.existing(this);
  }

  private loadPaintedPortrait(): void {
    const humanIndex = PAINTED_PEOPLE.indexOf(this.who);
    const creatureIndex = PAINTED_CREATURES.indexOf(this.who);
    const id = this.who === 'nana' ? 'portrait-nana' : this.who === 'clementine' ? 'portrait-clementine' : humanIndex >= 0 ? 'portrait-cast' : creatureIndex >= 0 ? 'portrait-creatures' : undefined;
    if (!id) return;
    withArt(this.scene, id, (key) => {
      if (!this.active || !this.scene) return;
      const index = humanIndex >= 0 ? humanIndex : creatureIndex;
      // whole figures, cut cleanly out of the sheet (nothing from neighbours, nothing cut off)
      const frame = atlasFrame(this.scene, key, this.who === 'nana' ? 0 : index, this.who === 'nana' ? 1 : 4, this.who === 'nana' ? 1 : humanIndex >= 0 ? 4 : 3, true);
      const image = this.scene.add.image(0, 0, key, frame).setName(`portrait:painted:${this.who}`);
      const height = this.headOnly ? HEAD_HEIGHT[this.who] ?? 660 : 350;
      const anchor = this.headOnly ? FACE_ANCHORS[this.who] ?? [.5, .24] : [.5, .2];
      // full figures are kept no wider than they are tall (the cat lies down)
      const scale = this.headOnly ? height / image.height : Math.min(height / image.height, height / image.width);
      image.setScale(scale).setOrigin(anchor[0], anchor[1]);
      this.portraitArt = image;
      if (this.headOnly) this.y = 0;
      this.add(image);
      for (const layer of [this.bodyG, this.face, this.mouth, this.lids]) layer.setVisible(false);
      this.blinkTimer?.remove();
      this.blinkTimer = undefined;
    });
  }

  setKipLook(look: typeof DEFAULT_LOOK): void {
    this.kip?.setLook(look);
  }

  setSleeping(on: boolean): void {
    this.kip?.nap(on);
  }

  setMood(m: Mood): void {
    if (m === this.mood) return;
    this.mood = m;
    if (!this.kip) this.drawMouth();
    if (!this.scene) return;
    if (m === 'laugh' || m === 'surprised') this.scene.tweens.add({ targets: this, y: this.y - 14, duration: 120, yoyo: true, repeat: m === 'laugh' ? 2 : 0 });
    if (this.kip && (m === 'laugh' || m === 'happy' || m === 'proud')) this.kip.celebrate();
  }

  talk(on: boolean): void {
    this.talking = on;
    if (!on) {
      this.open = false;
      if (!this.kip) this.drawMouth();
    }
  }

  blink(): void {
    if (!this.scene) return;
    if (this.kip) return this.kip.blink();
    if (this.portraitArt) return;
    const p = this.person();
    if (!p && !this.lids) return;
    const g = this.lids;
    const col = p ? p.skin : 0x000000;
    g.clear();
    if (this.who === 'magnus' || this.who === 'bertie' || this.who === 'steamington') return;
    g.fillStyle(col, 1);
    const ey = p?.child ? -2 : -6;
    g.fillEllipse(-22, ey, 22, 16);
    g.fillEllipse(22, ey, 22, 16);
    this.scene.time.delayedCall(120, () => g.clear());
  }

  private person(): Person | undefined {
    return PEOPLE[this.who];
  }

  preUpdate(_t: number, dt: number): void {
    if (this.portraitArt) {
      this.artT += dt / 1000;
      const tilt = this.mood === 'sad' || this.mood === 'worried' ? -3 : this.mood === 'proud' || this.mood === 'grand' ? 2 : this.mood === 'sleepy' ? -5 : 0;
      this.portraitArt.setAngle(tilt + (this.talking ? Math.sin(this.artT * 13) * 1.1 : Math.sin(this.artT * 1.5) * 0.25));
      this.portraitArt.setY(Math.sin(this.artT * 2) * (this.talking ? 1.7 : 0.7));
      return;
    }
    if (!this.talking || this.kip) return;
    this.talkT += dt;
    if (this.talkT > 110) {
      this.talkT = 0;
      this.open = !this.open && Math.random() < 0.85;
      this.drawMouth();
    }
  }

  private drawMouth(): void {
    const m = this.mouth;
    m.clear();
    const p = this.person();
    const my = p?.child ? 28 : 24;
    if (!p) {
      this.drawCreatureMouth(m);
      return;
    }
    const open = this.open || this.mood === 'surprised';
    m.fillStyle(0x6b2a2a, 1);
    m.lineStyle(4, 0x6b2a2a, 1);
    if (open) {
      m.fillEllipse(0, my + 2, this.mood === 'surprised' ? 16 : 22, this.mood === 'surprised' ? 18 : 12);
      if (p.extra === 'gap') {
        m.fillStyle(0xf4ebd5, 1);
        m.fillRect(-9, my - 3, 6, 4);
        m.fillRect(3, my - 3, 6, 4);
      }
    } else if (this.mood === 'sad' || this.mood === 'worried') {
      m.beginPath();
      m.arc(0, my + 12, 12, Math.PI * 1.15, Math.PI * 1.85);
      m.strokePath();
    } else if (this.mood === 'sleepy') {
      m.lineBetween(-8, my, 8, my);
    } else {
      m.beginPath();
      m.arc(0, my - 6, this.mood === 'laugh' || this.mood === 'grand' ? 16 : 12, Math.PI * 0.15, Math.PI * 0.85);
      m.strokePath();
    }
    // eyebrows show mood
    m.lineStyle(3, this.who === 'nana' ? CM.inkSoft : p.hairColor, 1);
    const by = p.child ? -20 : -24;
    const tilt = this.mood === 'worried' || this.mood === 'sad' ? 5 : this.mood === 'surprised' ? -4 : this.mood === 'grand' ? -2 : 0;
    m.lineBetween(-32, by + tilt, -14, by - tilt);
    m.lineBetween(14, by - tilt, 32, by + tilt);
  }

  private drawCreatureMouth(m: Phaser.GameObjects.Graphics): void {
    const open = this.open || this.mood === 'surprised';
    if (this.who === 'magnus' || this.who === 'coo' || this.who === 'pigeon') {
      m.fillStyle(this.who === 'coo' ? 0xcbb56f : 0x403d38, 1);
      m.fillTriangle(30, -8, 30, 6, 66, open ? -8 : -1);
      if (open) m.fillTriangle(30, 0, 30, 10, 60, 10);
    } else if (this.who === 'bertie') {
      m.fillStyle(open ? 0xf4ebd5 : 0x3d2b25, 1);
      m.fillRect(-26, 28, 52, open ? 16 : 8);
    } else {
      m.fillStyle(0x3d2b25, 1);
      m.fillEllipse(0, 22, open ? 12 : 10, open ? 10 : 3);
    }
  }

  private draw(): void {
    const p = this.person();
    if (p) return this.drawPerson(p);
    this.drawCreature();
    this.textureCreature();
    this.drawMouth();
  }

  private drawPerson(p: Person): void {
    const b = this.bodyG;
    const f = this.face;
    b.clear();
    f.clear();
    const hr = p.child ? 52 : 58;
    const hy = p.child ? 10 : 0;
    const seed = this.who.split('').reduce((n, c) => n * 17 + c.charCodeAt(0), 7) >>> 0;
    // shoulders & clothes
    b.fillStyle(CM.ink, 0.2);
    b.fillEllipse(6, 150, p.wide ? 250 : 210, 140);
    b.fillStyle(p.clothes, 1);
    const shoulderWidth = p.wide ? 240 : p.child ? 170 : 200;
    const shoulderHeight = p.child ? 120 : 140;
    b.fillEllipse(0, 140, shoulderWidth, shoulderHeight);
    b.lineStyle(1.8, CM.inkSoft, 0.85);
    b.strokeEllipse(0, 140, shoulderWidth, shoulderHeight);
    portraitEtching(b, 0, 140, shoulderWidth / 2 - 3, shoulderHeight / 2 - 3, seed, 180, p.clothes);
    b.lineStyle(1, CM.ink, 0.4);
    b.lineBetween(-shoulderWidth * 0.31, 118, -shoulderWidth * 0.36, 181);
    b.lineBetween(shoulderWidth * 0.31, 118, shoulderWidth * 0.36, 181);
    b.lineBetween(-46, 190, -38, 194);
    b.lineBetween(32, 194, 50, 189);
    if (p.collar) {
      b.fillStyle(p.collar, 1);
      b.fillTriangle(-30, 72, 0, 100, -4, 72);
      b.fillTriangle(30, 72, 0, 100, 4, 72);
    }
    if (p.extra === 'apron' || p.wide) {
      b.fillStyle(CM.paper, 0.96);
      b.fillRoundedRect(-50, 92, 100, 90, 16);
      b.lineStyle(1, CM.inkSoft, 0.75);
      b.strokeRoundedRect(-50, 92, 100, 90, 16);
      drawPatina(b, -46, 98, 92, 78, seed, 2);
    }
    if (p.extra === 'pockets') {
      b.fillStyle(0x5e2430, 1);
      for (let i = 0; i < 6; i++) b.fillRoundedRect(-80 + (i % 3) * 60, 100 + Math.floor(i / 3) * 34, 36, 24, 5);
    }
    if (p.extra === 'bowtie') {
      b.fillStyle(0xa96859, 1);
      b.fillTriangle(0, 80, -20, 70, -20, 90);
      b.fillTriangle(0, 80, 20, 70, 20, 90);
    }
    if (p.extra === 'oilskin') {
      b.lineStyle(3, 0xcbb56f, 1);
      b.lineBetween(0, 80, 0, 200);
    }
    if (p.extra === 'pencils') {
      // Nana's knitted cardigan and stained apron carry the same repairs as the shop.
      b.fillStyle(CM.paper, 1);
      b.fillPoints([
        new Phaser.Math.Vector2(-37, 83), new Phaser.Math.Vector2(36, 83),
        new Phaser.Math.Vector2(54, 191), new Phaser.Math.Vector2(-55, 191),
      ], true);
      drawPatina(b, -32, 103, 64, 76, seed, 5);
      b.lineStyle(1, CM.inkSoft, 0.75);
      b.lineBetween(-37, 83, -55, 191);
      b.lineBetween(36, 83, 54, 191);
      b.fillStyle(CM.mossDark, 1);
      b.fillRoundedRect(38, 120, 30, 30, 3);
      b.lineStyle(1.2, CM.paperDark, 1);
      b.lineBetween(40, 123, 66, 123);
      for (let i = 0; i < 3; i++) {
        b.fillStyle([CM.brass, CM.teal, CM.woodDark][i], 1);
        b.fillRect(42 + i * 7, 96 - i * 3, 4, 27 + i * 3);
      }
      b.fillStyle(CM.copperDark, 0.6);
      b.fillEllipse(-5, 159, 15, 8);
      b.fillEllipse(21, 177, 10, 5);
      b.lineStyle(0.8, CM.mossDark, 0.8);
      for (const side of [-1, 1]) for (let row = 0; row < 7; row++) {
        const px = side * (63 + row % 2 * 4);
        const py = 110 + row * 9;
        b.lineBetween(px - 3, py - 3, px, py);
        b.lineBetween(px, py, px + 3, py - 3);
      }
      for (const py of [96, 122, 151]) {
        b.fillStyle(CM.ink, 1);
        b.fillCircle(-44, py, 4);
        b.fillStyle(CM.brass, 1);
        b.fillCircle(-44.5, py - 0.5, 3);
        b.fillStyle(CM.inkSoft, 1);
        b.fillCircle(-45.5, py, 0.7);
        b.fillCircle(-42.8, py, 0.7);
      }
    }
    // neck
    b.fillStyle(p.skin, 1);
    b.fillRect(-16, 50 + hy, 32, 30);
    b.fillStyle(CM.copperDark, 0.15);
    b.fillEllipse(0, 55 + hy, 32, 20);
    // hair behind head
    const hc = p.hairColor;
    f.fillStyle(hc, 1);
    if (p.hair === 'long') {
      f.fillRoundedRect(-hr - 8, hy - 30, hr * 2 + 16, hr + 70, 30);
    } else if (p.hair === 'braid') {
      f.fillEllipse(hr * 0.75, hy + 50, 22, 60);
    } else if (p.hair === 'pigtails') {
      f.fillCircle(-hr - 6, hy + 10, 18);
      f.fillCircle(hr + 6, hy + 10, 18);
    } else if (p.hair === 'puffs') {
      f.fillCircle(-hr + 4, hy - hr + 6, 22);
      f.fillCircle(hr - 4, hy - hr + 6, 22);
    }
    // head
    f.fillStyle(p.skin, 1);
    const headWidth = p.child ? hr * 1.95 : hr * 1.83;
    f.fillEllipse(0, hy, headWidth, hr * 2.02);
    f.lineStyle(1.3, CM.inkSoft, 0.7);
    f.strokeEllipse(0, hy, headWidth, hr * 2.02);
    f.fillStyle(CM.cream, 0.12);
    f.fillEllipse(-14, hy - 8, hr * 1.04, hr * 1.45);
    portraitEtching(f, 0, hy, headWidth / 2 - 4, hr - 4, seed + 81, 95, p.skin);
    // ears
    f.fillStyle(p.skin, 1);
    f.fillCircle(-hr + 2, hy + 4, 11);
    f.fillCircle(hr - 2, hy + 4, 11);
    // cheeks
    f.fillStyle(CM.copper, 0.18);
    f.fillEllipse(-30, hy + 18, 18, 13);
    f.fillEllipse(30, hy + 18, 18, 13);
    if (p.extra === 'freckles') {
      f.fillStyle(0x8a5a3a, 0.6);
      for (let i = 0; i < 6; i++) f.fillCircle(-36 + (i % 3) * 7 + (i > 2 ? 52 : 0), hy + 10 + (i % 2) * 5, 1.6);
    }
    // hair on top
    f.fillStyle(hc, 1);
    switch (p.hair) {
      case 'bun':
        f.fillEllipse(-1, hy - hr + 8, hr * 1.94, 46);
        f.fillEllipse(-7, hy - hr - 20, 61, 51);
        f.fillCircle(-24, hy - hr - 14, 16);
        f.fillCircle(14, hy - hr - 24, 18);
        f.lineStyle(0.9, CM.inkSoft, 0.72);
        for (let i = 0; i < 12; i++) {
          f.beginPath();
          f.arc(-8 + Math.sin(i) * 5, hy - hr - 19 + Math.cos(i) * 3, 10 + i * 1.2, 0.3 + i * 0.17, Math.PI * 1.53 + i * 0.1);
          f.strokePath();
        }
        f.lineStyle(0.8, CM.cream, 0.8);
        for (let i = 0; i < 10; i++) f.lineBetween(-47 + i * 9, hy - hr + 3, -31 + i * 6, hy - hr + 23);
        break;
      case 'short':
      case 'neat':
        f.fillEllipse(0, hy - hr + 16, hr * 1.95, 40);
        if (p.hair === 'neat') f.fillEllipse(-14, hy - hr + 10, 50, 26);
        break;
      case 'curly':
        for (let i = 0; i < 9; i++) f.fillCircle(-hr + 10 + i * ((hr * 2 - 20) / 8), hy - hr + 14 + Math.sin(i) * 4, 16);
        break;
      case 'pigtails':
      case 'puffs':
      case 'long':
      case 'braid':
        f.fillEllipse(0, hy - hr + 16, hr * 2, 44);
        break;
      case 'updo':
        f.fillEllipse(0, hy - hr + 12, hr * 2, 44);
        f.fillEllipse(0, hy - hr - 20, 60, 50);
        break;
      case 'wild':
        for (let i = 0; i < 10; i++) {
          const a = Math.PI + (i / 9) * Math.PI;
          f.fillCircle(Math.cos(a) * hr * 0.95, hy + Math.sin(a) * hr * 0.95, 18);
        }
        break;
      case 'tuft':
        f.fillEllipse(0, hy - hr + 4, 40, 20);
        f.fillCircle(6, hy - hr - 8, 8);
        break;
      case 'bald':
        break;
    }
    // Fine stray strands soften the silhouettes without changing each person's hairstyle.
    f.lineStyle(0.85, CM.inkSoft, 0.58);
    if (p.hair !== 'bald') {
      for (let i = 0; i < 11; i++) {
        const px = -hr * 0.78 + i * hr * 0.15;
        f.lineBetween(px, hy - hr + 3 + Math.sin(i) * 5, px + 5, hy - hr + 16 + Math.cos(i) * 6);
      }
    }
    if (p.extra === 'starclip') {
      f.fillStyle(0xd1b972, 1);
      star(f, 30, hy - hr + 18, 10);
    }
    if (p.extra === 'pencils') {
      f.lineStyle(5, CM.inkSoft, 1);
      f.lineBetween(-43, hy - hr - 32, 25, hy - hr - 15);
      f.lineBetween(-17, hy - hr - 37, 36, hy - hr - 32);
      f.lineStyle(3, CM.brass, 1);
      f.lineBetween(-43, hy - hr - 32, 25, hy - hr - 15);
      f.lineStyle(3, CM.copper, 1);
      f.lineBetween(-17, hy - hr - 37, 36, hy - hr - 32);
      f.lineStyle(0.8, CM.cream, 1);
      f.lineBetween(-42, hy - hr - 33, 21, hy - hr - 17);
      // Smile creases and little wrinkles: Nana is the shop's kind old clockmaker.
      f.lineStyle(0.9, CM.copperDark, 0.5);
      f.lineBetween(-37, 17, -30, 24);
      f.lineBetween(37, 17, 30, 24);
      f.lineBetween(-36, -15, -44, -18);
      f.lineBetween(36, -15, 44, -18);
      f.lineBetween(-13, -36, 13, -37);
      f.lineBetween(-16, -31, 13, -32);
      f.lineBetween(-10, 36, 10, 37);
    }
    // eyes
    const ey = hy - 6;
    f.fillStyle(CM.cream, 1);
    f.fillEllipse(-22, ey, 20, 16);
    f.fillEllipse(22, ey, 20, 16);
    f.fillStyle(0x2b1d14, 1);
    f.fillCircle(-22, ey + 1, p.specs === 'big' ? 7 : 5);
    f.fillCircle(22, ey + 1, p.specs === 'big' ? 7 : 5);
    f.fillStyle(0xf4ebd5, 1);
    f.fillCircle(-24, ey - 2, 2);
    f.fillCircle(20, ey - 2, 2);
    if (p.specs) {
      const r = p.specs === 'big' ? 20 : 15;
      f.lineStyle(4, CM.inkSoft, 1);
      f.strokeCircle(-22, ey, r);
      f.strokeCircle(22, ey, r);
      f.lineStyle(1.4, CM.brass, 1);
      f.strokeCircle(-22.4, ey - 0.4, r);
      f.strokeCircle(21.6, ey - 0.4, r);
      f.lineBetween(-22 + r, ey, 22 - r, ey);
      f.lineBetween(-22 - r, ey - 1, -hr + 2, ey - 8);
      f.lineBetween(22 + r, ey - 1, hr - 2, ey - 8);
      f.fillStyle(CM.cream, 0.13);
      f.fillCircle(-22, ey, r - 2);
      f.fillCircle(22, ey, r - 2);
      f.lineStyle(1.3, CM.cream, 0.6);
      f.lineBetween(-29, ey - 10, -34, ey + 2);
      f.lineBetween(15, ey - 10, 10, ey + 2);
    }
    // nose
    f.fillStyle(Phaser.Display.Color.ValueToColor(p.skin).darken(12).color, 1);
    f.fillEllipse(0, hy + 10, 14, 12);
    if (p.extra === 'flour') {
      f.fillStyle(0xf4ebd5, 0.85);
      f.fillCircle(4, hy + 8, 5);
      f.fillCircle(-36, hy + 22, 4);
      b.fillStyle(0xf4ebd5, 0.6);
      b.fillCircle(-60, 120, 8);
    }
    if (p.mustache) {
      f.fillStyle(p.mustache, 1);
      f.fillEllipse(-11, hy + 17, 22, 9);
      f.fillEllipse(11, hy + 17, 22, 9);
    }
    if (p.beard) {
      f.fillStyle(p.beard, 1);
      f.slice(0, hy + 10, hr - 4, 0.15, Math.PI - 0.15, false);
      f.fillPath();
    }
    // hats
    const hcol = p.hatColor ?? 0xf4ebd5;
    switch (p.hat) {
      case 'captain':
        f.fillStyle(hcol, 1);
        f.fillRoundedRect(-hr, hy - hr - 18, hr * 2, 40, 10);
        f.fillStyle(0x342f29, 1);
        f.fillEllipse(8, hy - hr + 22, hr * 2.1, 14);
        f.fillStyle(0xd1b972, 1);
        f.fillCircle(0, hy - hr + 2, 7);
        break;
      case 'feathered':
        f.fillStyle(hcol, 1);
        f.fillEllipse(0, hy - hr + 10, hr * 3.2, 30);
        f.fillRoundedRect(-hr * 0.9, hy - hr - 50, hr * 1.8, 60, 20);
        f.fillStyle(0x78815a, 1);
        f.fillEllipse(hr * 0.9, hy - hr - 70, 22, 80);
        f.fillStyle(0xd1b972, 1);
        f.fillEllipse(hr * 0.5, hy - hr - 80, 16, 60);
        f.fillStyle(0xc09891, 1);
        f.fillCircle(-hr * 0.5, hy - hr - 10, 12);
        break;
      case 'tophat':
        f.fillStyle(hcol, 1);
        f.fillEllipse(0, hy - hr + 6, hr * 2.4, 22);
        f.fillRect(-hr * 0.7, hy - hr - 70, hr * 1.4, 76);
        f.fillStyle(0xa96859, 1);
        f.fillRect(-hr * 0.7, hy - hr - 10, hr * 1.4, 12);
        break;
      case 'postman':
        f.fillStyle(hcol, 1);
        f.fillRoundedRect(-hr * 0.9, hy - hr - 10, hr * 1.8, 32, 8);
        f.fillStyle(0x342f29, 1);
        f.fillEllipse(10, hy - hr + 22, hr * 1.7, 12);
        f.fillStyle(0xa96859, 1);
        f.fillRect(-hr * 0.9, hy - hr + 6, hr * 1.8, 6);
        break;
      case 'straw':
        f.fillStyle(hcol, 1);
        f.fillEllipse(0, hy - hr + 14, hr * 3, 30);
        f.fillEllipse(0, hy - hr - 8, hr * 1.5, 46);
        f.fillStyle(0xa96859, 1);
        f.fillRect(-hr * 0.72, hy - hr + 2, hr * 1.44, 7);
        break;
      case 'beanie':
        f.fillStyle(hcol, 1);
        f.slice(0, hy - hr + 24, hr + 2, Math.PI, 0, false);
        f.fillPath();
        f.fillCircle(0, hy - hr * 2 + 26, 10);
        break;
      case 'toque':
        f.fillStyle(0xf4ebd5, 1);
        f.fillRect(-hr * 0.7, hy - hr - 10, hr * 1.4, 26);
        f.fillCircle(-hr * 0.45, hy - hr - 24, 26);
        f.fillCircle(hr * 0.35, hy - hr - 28, 28);
        f.fillCircle(0, hy - hr - 44, 24);
        break;
      case 'goggles':
        f.fillStyle(0x6b4a1c, 1);
        f.fillRect(-hr, hy - hr + 16, hr * 2, 9);
        f.fillStyle(0xb8d8e8, 1);
        f.fillCircle(-18, hy - hr + 20, 13);
        f.fillCircle(18, hy - hr + 20, 13);
        break;
    }
    this.drawMouth();
  }

  private textureCreature(): void {
    const b = this.bodyG;
    const f = this.face;
    const seed = this.who.split('').reduce((n, c) => n * 17 + c.charCodeAt(0), 11) >>> 0;
    if (['magnus', 'coo', 'pigeon'].includes(this.who)) {
      portraitEtching(b, 0, 110, 80, 72, seed, 125, CM.slate);
      b.lineStyle(0.9, this.who === 'coo' ? CM.woodDark : CM.ink, 0.65);
      for (let i = 0; i < 12; i++) {
        const px = 42 + (i % 3) * 8;
        const py = 58 + Math.floor(i / 3) * 25;
        b.lineBetween(px - 8, py, px + 7, py + 21);
      }
      f.lineStyle(0.7, CM.inkSoft, 0.5);
      for (let i = 0; i < 8; i++) f.lineBetween(-38 + i * 6, -34 - Math.sin(i) * 5, -34 + i * 6, -28);
      if (this.who === 'magnus') {
        f.lineStyle(1, CM.cream, 0.4);
        f.lineBetween(-30, -32, -13, -42);
        f.lineStyle(1.5, CM.brass, 1);
        f.strokeCircle(16, -8, 18);
        f.lineBetween(32, 3, 36, 18);
        f.lineBetween(36, 18, 33, 33);
        f.lineBetween(33, 33, 39, 47);
      }
    } else if (this.who === 'mice' || this.who === 'whisker') {
      const count = this.who === 'mice' ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const px = count === 1 ? 0 : (i - 1) * 90;
        const scale = count === 1 ? 1.2 : 0.75;
        portraitEtching(b, px, 120, 55 * scale, 55 * scale, seed + i, 60, CM.woodLight);
        b.lineStyle(3, CM.paperDark, 1);
        b.beginPath();
        b.arc(px + 50 * scale, 141, 31 * scale, -0.3, Math.PI * 0.8);
        b.strokePath();
        f.lineStyle(0.9, CM.inkSoft, 0.8);
        for (const side of [-1, 1]) for (let j = 0; j < 3; j++) f.lineBetween(px + side * 10, 48 + j * 2, px + side * 36 * scale, 38 + j * 11);
        f.lineStyle(0.8, CM.cream, 0.7);
        f.lineBetween(px - 19, 17, px - 10, 11);
      }
    } else if (this.who === 'pudding' || this.who === 'clementine') {
      const cat = this.who === 'pudding';
      portraitEtching(b, 0, cat ? 110 : 120, cat ? 126 : 57, cat ? 85 : 66, seed, 200, CM.copper);
      f.lineStyle(1, CM.woodDark, 0.6);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) f.lineBetween(side * 19, 17 + i * 4, side * 45, 10 + i * 10);
      f.lineStyle(1, CM.cream, 0.7);
      f.lineBetween(-31, -33, -35, -43);
      f.lineBetween(30, -33, 35, -43);
    } else if (this.who === 'steamington' || this.who === 'bertie') {
      const bertie = this.who === 'bertie';
      drawPatina(b, bertie ? -92 : -65, 66, bertie ? 184 : 130, bertie ? 145 : 125, seed, 2);
      drawPatina(f, bertie ? -63 : -40, bertie ? -51 : -34, bertie ? 126 : 80, bertie ? 90 : 76, seed + 5, 2);
      f.lineStyle(1.5, CM.inkSoft, 1);
      f.strokeRoundedRect(bertie ? -70 : -46, bertie ? -60 : -40, bertie ? 140 : 92, bertie ? 110 : 90, bertie ? 22 : 20);
      for (const side of [-1, 1]) {
        b.fillStyle(CM.inkSoft, 1);
        b.fillCircle(side * (bertie ? 81 : 54), 80, 4);
        b.fillStyle(CM.brass, 1);
        b.fillCircle(side * (bertie ? 81 : 54) - 1, 79, 2.7);
      }
    } else if (this.who === 'lumen') {
      for (const side of [-1, 1]) {
        portraitEtching(b, side * 70, 60, 57, 42, seed + side, 80, CM.paper);
        b.lineStyle(0.7, CM.woodDark, 0.5);
        for (let i = 0; i < 6; i++) b.lineBetween(side * 16, 66, side * (65 + i * 8), 28 + i * 11);
      }
    }
  }

  private drawCreature(): void {
    const b = this.bodyG;
    const f = this.face;
    b.clear();
    f.clear();
    switch (this.who) {
      case 'magnus': {
        b.fillStyle(0x343b3a, 1);
        b.fillEllipse(0, 110, 170, 150);
        b.fillStyle(0xf4ebd5, 1);
        b.fillEllipse(-10, 120, 90, 100);
        b.fillStyle(0x537a72, 0.8);
        b.fillEllipse(60, 100, 60, 120);
        b.fillEllipse(-70, 100, 50, 110);
        b.fillStyle(0x343b3a, 1);
        b.fillTriangle(-40, 170, -120, 220, -20, 190);
        f.fillStyle(0x343b3a, 1);
        f.fillCircle(0, 0, 56);
        f.fillStyle(0x657c80, 0.35);
        f.fillCircle(-14, -20, 30);
        f.fillStyle(0xf4ebd5, 1);
        f.fillCircle(16, -8, 13);
        f.fillStyle(0x342f29, 1);
        f.fillCircle(19, -8, 6);
        f.lineStyle(3, 0xbca16a, 1);
        f.strokeCircle(16, -8, 18);
        f.lineBetween(30, 2, 34, 50);
        break;
      }
      case 'coo': {
        b.fillStyle(0x8a5a33, 1);
        b.fillEllipse(0, 110, 160, 150);
        b.fillStyle(0xc49a6c, 1);
        b.fillEllipse(0, 125, 90, 100);
        f.fillStyle(0x8a5a33, 1);
        f.fillCircle(0, 0, 50);
        f.fillStyle(0xa96859, 1);
        f.fillTriangle(-10, -48, 10, -48, 0, -78);
        f.fillStyle(0xf4ebd5, 1);
        f.fillCircle(14, -8, 11);
        f.fillStyle(0x342f29, 1);
        f.fillCircle(17, -8, 5);
        break;
      }
      case 'pigeon': {
        b.fillStyle(0x91a09b, 1);
        b.fillEllipse(0, 110, 170, 150);
        b.fillStyle(0x8a7b96, 0.7);
        b.fillEllipse(0, 70, 120, 50);
        f.fillStyle(0x91a09b, 1);
        f.fillCircle(0, 0, 48);
        f.fillStyle(0xd3a278, 1);
        f.fillCircle(14, -8, 9);
        f.fillStyle(0x342f29, 1);
        f.fillCircle(16, -8, 4);
        break;
      }
      case 'clementine': {
        b.fillStyle(0xc38b57, 1);
        b.fillEllipse(0, 120, 120, 140);
        b.fillStyle(0xf4ebd5, 1);
        b.fillEllipse(0, 130, 60, 80);
        b.fillStyle(0xe9dcc0, 1);
        b.fillEllipse(0, 200, 160, 30);
        f.fillStyle(0xc38b57, 1);
        f.fillTriangle(-46, -10, -30, -70, -10, -30);
        f.fillTriangle(46, -10, 30, -70, 10, -30);
        f.fillCircle(0, 0, 46);
        f.fillStyle(0xf4ebd5, 1);
        f.fillTriangle(-40, 10, 40, 10, 0, 46);
        f.fillStyle(0x2b1d14, 1);
        f.fillCircle(-16, -6, 5);
        f.fillCircle(16, -6, 5);
        f.fillCircle(0, 34, 6);
        break;
      }
      case 'mice':
      case 'whisker': {
        const n = this.who === 'mice' ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const x = n === 1 ? 0 : (i - 1) * 90;
          const s = n === 1 ? 1.2 : 0.75;
          b.fillStyle(0xb0a8a0, 1);
          b.fillEllipse(x, 120, 120 * s, 120 * s);
          f.fillStyle(0xb0a8a0, 1);
          f.fillCircle(x - 34 * s, -30 * s + 40, 24 * s);
          f.fillCircle(x + 34 * s, -30 * s + 40, 24 * s);
          f.fillStyle(0xc09891, 1);
          f.fillCircle(x - 34 * s, -30 * s + 40, 14 * s);
          f.fillCircle(x + 34 * s, -30 * s + 40, 14 * s);
          f.fillStyle(0xc8c0b8, 1);
          f.fillCircle(x, 40, 38 * s);
          f.fillStyle(0x342f29, 1);
          f.fillCircle(x - 12 * s, 34, 4);
          f.fillCircle(x + 12 * s, 34, 4);
          f.fillStyle(0xaf7985, 1);
          f.fillCircle(x, 48, 5);
          if (this.who === 'mice') {
            f.fillStyle(0x526975, 1);
            f.fillRoundedRect(x - 24, -8, 48, 18, 5);
            f.fillStyle(0x342f29, 1);
            f.fillRect(x - 28, 8, 56, 5);
          }
        }
        break;
      }
      case 'humbug': {
        for (let i = 0; i < 4; i++) {
          const x = (i - 1.5) * 70;
          const y = 60 + (i % 2) * 40;
          b.fillStyle(0xe4cc88, 0.25);
          b.fillCircle(x, y, 40);
          b.fillStyle(0x78815a, 1);
          b.fillEllipse(x, y, 46, 56);
          b.fillStyle(0xe4cc88, 1);
          b.fillCircle(x, y + 14, 12);
          b.fillStyle(0x342f29, 1);
          b.fillCircle(x - 8, y - 14, 4);
          b.fillCircle(x + 8, y - 14, 4);
        }
        break;
      }
      case 'steamington': {
        b.fillStyle(0xb77b56, 1);
        b.fillRoundedRect(-70, 60, 140, 140, 20);
        b.fillStyle(0x342f29, 1);
        b.fillTriangle(-20, 60, 20, 60, 0, 90);
        b.fillStyle(0xf4ebd5, 1);
        b.fillTriangle(-10, 60, 10, 60, 0, 80);
        f.fillStyle(0xc38b57, 1);
        f.fillRoundedRect(-46, -40, 92, 90, 20);
        f.fillStyle(0x342f29, 1);
        f.fillRect(-36, -80, 72, 44);
        f.fillEllipse(0, -38, 100, 12);
        f.fillStyle(0xf4ebd5, 1);
        f.fillCircle(-16, 0, 8);
        f.fillCircle(16, 0, 8);
        f.fillStyle(0x79503d, 1);
        f.fillEllipse(-12, 24, 26, 8);
        f.fillEllipse(12, 24, 26, 8);
        break;
      }
      case 'bertie': {
        b.fillStyle(0xa96859, 1);
        b.fillRoundedRect(-100, 60, 200, 160, 24);
        b.fillStyle(0xe9dcc0, 1);
        b.fillRoundedRect(-60, 90, 120, 80, 12);
        for (let i = 0; i < 5; i++) {
          b.fillStyle([0xd1b972, 0x9aafb2, 0xa0b895, 0xc09891, 0xa99cb5][i], 1);
          b.fillCircle(-44 + i * 22, 110, 7);
        }
        f.fillStyle(0xa96859, 1);
        f.fillRoundedRect(-70, -60, 140, 110, 22);
        f.fillStyle(0xe9dcc0, 1);
        f.fillCircle(-30, -14, 20);
        f.fillCircle(30, -14, 20);
        f.fillStyle(0x342f29, 1);
        f.fillCircle(-30, -14, 9);
        f.fillCircle(30, -14, 9);
        f.lineStyle(4, 0x7a2a22, 1);
        f.lineBetween(0, -60, 0, -86);
        f.fillStyle(0xd1b972, 1);
        f.fillCircle(0, -90, 9);
        break;
      }
      case 'lumen': {
        b.fillStyle(0xf4ebd5, 0.25);
        b.fillCircle(0, 60, 120);
        b.fillStyle(0xd9c7a0, 1);
        b.fillEllipse(-70, 60, 120, 90);
        b.fillEllipse(70, 60, 120, 90);
        b.fillStyle(0xb8a07a, 1);
        b.fillEllipse(0, 80, 40, 110);
        f.fillStyle(0xb8a07a, 1);
        f.fillCircle(0, 0, 30);
        f.fillStyle(0x342f29, 1);
        f.fillCircle(-10, -2, 6);
        f.fillCircle(10, -2, 6);
        f.lineStyle(3, 0x8a6a4a, 1);
        f.lineBetween(-8, -26, -26, -60);
        f.lineBetween(8, -26, 26, -60);
        break;
      }
      case 'pudding': {
        b.fillStyle(0xc38b57, 1);
        b.fillEllipse(0, 110, 260, 180);
        b.fillStyle(0xd3a278, 1);
        for (let i = 0; i < 4; i++) b.fillRect(-90 + i * 50, 50, 16, 110);
        f.fillStyle(0xc38b57, 1);
        f.fillTriangle(-50, -10, -36, -64, -10, -30);
        f.fillTriangle(50, -10, 36, -64, 10, -30);
        f.fillCircle(0, 0, 56);
        f.lineStyle(4, 0x79503d, 1);
        f.beginPath();
        f.arc(-20, -4, 10, 0.2, Math.PI - 0.2);
        f.strokePath();
        f.beginPath();
        f.arc(20, -4, 10, 0.2, Math.PI - 0.2);
        f.strokePath();
        f.fillStyle(0xaf7985, 1);
        f.fillTriangle(-6, 12, 6, 12, 0, 20);
        break;
      }
      default: {
        f.fillStyle(0xbca16a, 1);
        f.fillCircle(0, 0, 50);
        heart(f, 0, 0, 30);
      }
    }
  }
}

/** A small round portrait badge (speech bubbles, the job board, the town map). */
export function badge(scene: Phaser.Scene, x: number, y: number, who: CharId, r = 34): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const ring = scene.add.graphics();
  ring.fillStyle(CM.ink, 1);
  ring.fillCircle(0, 0, r + 5);
  ring.fillStyle(CM.brass, 1);
  ring.fillCircle(-0.4, -0.4, r + 3.7);
  ring.fillStyle(CM.paper, 1);
  ring.fillCircle(0, 0, r);
  ring.lineStyle(1, CM.copperDark, 1);
  ring.strokeCircle(0, 0, r + 1);
  ring.lineStyle(0.7, CM.cream, 0.65);
  ring.strokeCircle(-0.5, -0.5, r + 3.2);
  for (const a of [0.75, 2.32, 3.89, 5.46]) {
    ring.fillStyle(CM.inkSoft, 1);
    ring.fillCircle(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2), 0.9);
  }
  c.add(ring);
  const p = new Portrait(scene, 0, r * 0.35, who, r / 95, true);
  const mask = scene.make.graphics({}, false);
  mask.fillStyle(0xf4ebd5);
  mask.fillCircle(0, 0, r);
  c.add(p);
  // keep the bust inside the circle by masking with a geometry mask that follows the badge
  const gm = mask.createGeometryMask();
  p.setMask(gm);
  const follow = () => {
    if (!c.active) return;
    const m = c.getWorldTransformMatrix();
    mask.setPosition(m.tx, m.ty);
    mask.setScale(m.scaleX, m.scaleY);
  };
  follow();
  scene.events.on('postupdate', follow);
  c.once('destroy', () => {
    scene.events.off('postupdate', follow);
    mask.destroy();
  });
  return c;
}

/** Tiny bounded marks give faces, wool, fur and feathers a shared pencil surface. */
function portraitEtching(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, seed: number, count: number, tone: number): void {
  let n = seed >>> 0;
  const random = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
  const dark = Phaser.Display.Color.ValueToColor(tone).darken(20).color;
  const light = Phaser.Display.Color.ValueToColor(tone).lighten(22).color;
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 0.92;
    const px = x + Math.cos(angle) * rx * radius;
    const py = y + Math.sin(angle) * ry * radius;
    g.fillStyle(i % 3 === 0 ? light : dark, 0.16 + random() * 0.1);
    g.fillEllipse(px, py, 0.7 + random() * 1.5, 0.6 + random());
    if (i % 4 === 0) {
      g.lineStyle(0.6, dark, 0.2);
      g.lineBetween(px, py, px + 1.5 + random() * 3, py - 1.5);
    }
  }
}
