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
  nana: { skin: 0xf2c9a5, hair: 'bun', hairColor: 0xe9e4dc, specs: 'big', clothes: 0x9b5c4a, collar: 0xf3e2bd, extra: 'pencils' },
  albert: { skin: 0xf0c09a, hair: 'short', hairColor: 0x8a6a4a, clothes: 0xd9c7a0, mustache: 0x8a6a4a, extra: 'flour', wide: true, hat: 'toque' },
  rosa: { skin: 0xc68a5c, hair: 'pigtails', hairColor: 0x2b1d14, clothes: 0xe75480, child: true, extra: 'gap' },
  theo: { skin: 0x6b4226, hair: 'curly', hairColor: 0x1b120c, clothes: 0x3b7dd8, child: true },
  ada: { skin: 0x6b4226, hair: 'puffs', hairColor: 0x1b120c, clothes: 0xf2a33a, child: true },
  marigold: { skin: 0xe8b48a, hair: 'short', hairColor: 0xb0b0b0, hat: 'captain', hatColor: 0x23395d, clothes: 0x23395d, collar: 0xffffff },
  pepperwhistle: { skin: 0xf1d1b5, hair: 'updo', hairColor: 0xb5442c, hat: 'feathered', hatColor: 0x6a3d9a, clothes: 0x2e9b5f },
  pockets: { skin: 0xd9a07a, hair: 'wild', hairColor: 0xf5f5f5, hat: 'tophat', hatColor: 0x2b2b33, clothes: 0x8e3b46, extra: 'pockets' },
  juniper: { skin: 0x8d5a3b, hair: 'long', hairColor: 0x1b120c, specs: 'round', clothes: 0x6f8fd8, extra: 'starclip' },
  ade: { skin: 0x5a3a24, hair: 'short', hairColor: 0x1b120c, hat: 'postman', hatColor: 0x1c3d6e, clothes: 0x1c3d6e, mustache: 0x1b120c },
  odum: { skin: 0xe0a985, hair: 'braid', hairColor: 0xa0a0a0, hat: 'straw', hatColor: 0xe0c070, clothes: 0x5a8f3c },
  lindqvist: { skin: 0xf3d6c0, hair: 'neat', hairColor: 0xd8c08a, specs: 'round', clothes: 0x2b2b33, extra: 'bowtie', mustache: 0xd8c08a },
  busker: { skin: 0xc9945f, hair: 'short', hairColor: 0x3d2b1e, hat: 'beanie', hatColor: 0xe67e22, clothes: 0x2e7d6b, beard: 0x3d2b1e },
  mateo: { skin: 0xc68a5c, hair: 'curly', hairColor: 0x2b1d14, clothes: 0x2ecc71, child: true, extra: 'freckles' },
  pip: { skin: 0xf3d2b8, hair: 'tuft', hairColor: 0xd8a650, clothes: 0xffd43b, child: true },
  odette: { skin: 0xf2c9a5, hair: 'braid', hairColor: 0x7a4b26, hat: 'goggles', clothes: 0x6e8b3d, child: true, extra: 'apron' },
  fisher: { skin: 0xe0a985, hair: 'short', hairColor: 0x3d2b1e, hat: 'beanie', hatColor: 0x1c3d6e, clothes: 0xffd43b, beard: 0x7a5a3a, extra: 'oilskin' },
};

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

  constructor(scene: Phaser.Scene, x: number, y: number, who: CharId, scale = 1) {
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
    }
    scene.add.existing(this);
  }

  setKipLook(look: typeof DEFAULT_LOOK): void {
    this.kip?.setLook(look);
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
        m.fillStyle(0xffffff, 1);
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
    m.lineStyle(4, p.hairColor === 0xe9e4dc ? 0xb0a89a : p.hairColor, 1);
    const by = p.child ? -20 : -24;
    const tilt = this.mood === 'worried' || this.mood === 'sad' ? 5 : this.mood === 'surprised' ? -4 : this.mood === 'grand' ? -2 : 0;
    m.lineBetween(-32, by + tilt, -14, by - tilt);
    m.lineBetween(14, by - tilt, 32, by + tilt);
  }

  private drawCreatureMouth(m: Phaser.GameObjects.Graphics): void {
    const open = this.open || this.mood === 'surprised';
    if (this.who === 'magnus' || this.who === 'coo' || this.who === 'pigeon') {
      m.fillStyle(this.who === 'coo' ? 0xe8a33d : 0x2b2b33, 1);
      m.fillTriangle(30, -8, 30, 6, 66, open ? -8 : -1);
      if (open) m.fillTriangle(30, 0, 30, 10, 60, 10);
    } else if (this.who === 'bertie') {
      m.fillStyle(open ? 0xfff3bf : 0x3d2b25, 1);
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
    this.drawMouth();
  }

  private drawPerson(p: Person): void {
    const b = this.bodyG;
    const f = this.face;
    const hr = p.child ? 52 : 58;
    const hy = p.child ? 10 : 0;
    // shoulders & clothes
    b.fillStyle(0x000000, 0.2);
    b.fillEllipse(6, 150, p.wide ? 250 : 210, 140);
    b.fillStyle(p.clothes, 1);
    b.fillEllipse(0, 140, p.wide ? 240 : p.child ? 170 : 200, p.child ? 120 : 140);
    if (p.collar) {
      b.fillStyle(p.collar, 1);
      b.fillTriangle(-30, 72, 0, 100, -4, 72);
      b.fillTriangle(30, 72, 0, 100, 4, 72);
    }
    if (p.extra === 'apron' || p.wide) {
      b.fillStyle(0xffffff, 0.92);
      b.fillRoundedRect(-50, 92, 100, 90, 16);
    }
    if (p.extra === 'pockets') {
      b.fillStyle(0x5e2430, 1);
      for (let i = 0; i < 6; i++) b.fillRoundedRect(-80 + (i % 3) * 60, 100 + Math.floor(i / 3) * 34, 36, 24, 5);
    }
    if (p.extra === 'bowtie') {
      b.fillStyle(0xd64541, 1);
      b.fillTriangle(0, 80, -20, 70, -20, 90);
      b.fillTriangle(0, 80, 20, 70, 20, 90);
    }
    if (p.extra === 'oilskin') {
      b.lineStyle(3, 0xe0b000, 1);
      b.lineBetween(0, 80, 0, 200);
    }
    if (p.extra === 'pencils') {
      b.fillStyle(0xd9a441, 1);
      b.fillRect(42, 96, 6, 34);
      b.fillStyle(0x7fd3ff, 1);
      b.fillRect(52, 100, 6, 30);
    }
    // neck
    b.fillStyle(p.skin, 1);
    b.fillRect(-16, 50 + hy, 32, 30);
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
    f.fillCircle(0, hy, hr);
    f.fillStyle(0xffffff, 0.08);
    f.fillCircle(-16, hy - 18, hr * 0.6);
    // ears
    f.fillStyle(p.skin, 1);
    f.fillCircle(-hr + 2, hy + 4, 11);
    f.fillCircle(hr - 2, hy + 4, 11);
    // cheeks
    f.fillStyle(0xff8a8a, 0.25);
    f.fillCircle(-30, hy + 18, 11);
    f.fillCircle(30, hy + 18, 11);
    if (p.extra === 'freckles') {
      f.fillStyle(0x8a5a3a, 0.6);
      for (let i = 0; i < 6; i++) f.fillCircle(-36 + (i % 3) * 7 + (i > 2 ? 52 : 0), hy + 10 + (i % 2) * 5, 1.6);
    }
    // hair on top
    f.fillStyle(hc, 1);
    switch (p.hair) {
      case 'bun':
        f.fillEllipse(0, hy - hr + 8, hr * 1.9, 46);
        f.fillCircle(0, hy - hr - 18, 26);
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
    if (p.extra === 'starclip') {
      f.fillStyle(0xffd43b, 1);
      star(f, 30, hy - hr + 18, 10);
    }
    if (p.extra === 'pencils') {
      f.fillStyle(0xd9a441, 1);
      f.fillRect(-30, hy - hr - 40, 6, 40);
      f.fillStyle(0xe05a47, 1);
      f.fillRect(18, hy - hr - 44, 6, 40);
    }
    // eyes
    const ey = hy - 6;
    f.fillStyle(0xffffff, 1);
    f.fillEllipse(-22, ey, 20, 16);
    f.fillEllipse(22, ey, 20, 16);
    f.fillStyle(0x2b1d14, 1);
    f.fillCircle(-22, ey + 1, p.specs === 'big' ? 7 : 5);
    f.fillCircle(22, ey + 1, p.specs === 'big' ? 7 : 5);
    f.fillStyle(0xffffff, 1);
    f.fillCircle(-24, ey - 2, 2);
    f.fillCircle(20, ey - 2, 2);
    if (p.specs) {
      const r = p.specs === 'big' ? 20 : 15;
      f.lineStyle(4, 0x6b4a1c, 1);
      f.strokeCircle(-22, ey, r);
      f.strokeCircle(22, ey, r);
      f.lineBetween(-22 + r, ey, 22 - r, ey);
      f.fillStyle(0xffffff, 0.15);
      f.fillCircle(-22, ey, r - 2);
      f.fillCircle(22, ey, r - 2);
    }
    // nose
    f.fillStyle(Phaser.Display.Color.ValueToColor(p.skin).darken(12).color, 1);
    f.fillEllipse(0, hy + 10, 14, 12);
    if (p.extra === 'flour') {
      f.fillStyle(0xffffff, 0.85);
      f.fillCircle(4, hy + 8, 5);
      f.fillCircle(-36, hy + 22, 4);
      b.fillStyle(0xffffff, 0.6);
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
    const hcol = p.hatColor ?? 0xffffff;
    switch (p.hat) {
      case 'captain':
        f.fillStyle(hcol, 1);
        f.fillRoundedRect(-hr, hy - hr - 18, hr * 2, 40, 10);
        f.fillStyle(0x111111, 1);
        f.fillEllipse(8, hy - hr + 22, hr * 2.1, 14);
        f.fillStyle(0xffd43b, 1);
        f.fillCircle(0, hy - hr + 2, 7);
        break;
      case 'feathered':
        f.fillStyle(hcol, 1);
        f.fillEllipse(0, hy - hr + 10, hr * 3.2, 30);
        f.fillRoundedRect(-hr * 0.9, hy - hr - 50, hr * 1.8, 60, 20);
        f.fillStyle(0x2ecc71, 1);
        f.fillEllipse(hr * 0.9, hy - hr - 70, 22, 80);
        f.fillStyle(0xffd43b, 1);
        f.fillEllipse(hr * 0.5, hy - hr - 80, 16, 60);
        f.fillStyle(0xff8fab, 1);
        f.fillCircle(-hr * 0.5, hy - hr - 10, 12);
        break;
      case 'tophat':
        f.fillStyle(hcol, 1);
        f.fillEllipse(0, hy - hr + 6, hr * 2.4, 22);
        f.fillRect(-hr * 0.7, hy - hr - 70, hr * 1.4, 76);
        f.fillStyle(0xd64541, 1);
        f.fillRect(-hr * 0.7, hy - hr - 10, hr * 1.4, 12);
        break;
      case 'postman':
        f.fillStyle(hcol, 1);
        f.fillRoundedRect(-hr * 0.9, hy - hr - 10, hr * 1.8, 32, 8);
        f.fillStyle(0x111111, 1);
        f.fillEllipse(10, hy - hr + 22, hr * 1.7, 12);
        f.fillStyle(0xd64541, 1);
        f.fillRect(-hr * 0.9, hy - hr + 6, hr * 1.8, 6);
        break;
      case 'straw':
        f.fillStyle(hcol, 1);
        f.fillEllipse(0, hy - hr + 14, hr * 3, 30);
        f.fillEllipse(0, hy - hr - 8, hr * 1.5, 46);
        f.fillStyle(0xd64541, 1);
        f.fillRect(-hr * 0.72, hy - hr + 2, hr * 1.44, 7);
        break;
      case 'beanie':
        f.fillStyle(hcol, 1);
        f.slice(0, hy - hr + 24, hr + 2, Math.PI, 0, false);
        f.fillPath();
        f.fillCircle(0, hy - hr * 2 + 26, 10);
        break;
      case 'toque':
        f.fillStyle(0xffffff, 1);
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

  private drawCreature(): void {
    const b = this.bodyG;
    const f = this.face;
    switch (this.who) {
      case 'magnus': {
        b.fillStyle(0x111118, 1);
        b.fillEllipse(0, 110, 170, 150);
        b.fillStyle(0xffffff, 1);
        b.fillEllipse(-10, 120, 90, 100);
        b.fillStyle(0x1e3a8a, 0.8);
        b.fillEllipse(60, 100, 60, 120);
        b.fillEllipse(-70, 100, 50, 110);
        b.fillStyle(0x111118, 1);
        b.fillTriangle(-40, 170, -120, 220, -20, 190);
        f.fillStyle(0x111118, 1);
        f.fillCircle(0, 0, 56);
        f.fillStyle(0x2a4bd8, 0.35);
        f.fillCircle(-14, -20, 30);
        f.fillStyle(0xffffff, 1);
        f.fillCircle(16, -8, 13);
        f.fillStyle(0x111111, 1);
        f.fillCircle(19, -8, 6);
        f.lineStyle(3, 0xffd700, 1);
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
        f.fillStyle(0xe05a47, 1);
        f.fillTriangle(-10, -48, 10, -48, 0, -78);
        f.fillStyle(0xffffff, 1);
        f.fillCircle(14, -8, 11);
        f.fillStyle(0x111111, 1);
        f.fillCircle(17, -8, 5);
        break;
      }
      case 'pigeon': {
        b.fillStyle(0x8e9aaf, 1);
        b.fillEllipse(0, 110, 170, 150);
        b.fillStyle(0x7c5ca8, 0.7);
        b.fillEllipse(0, 70, 120, 50);
        f.fillStyle(0x9aa6b4, 1);
        f.fillCircle(0, 0, 48);
        f.fillStyle(0xff9e57, 1);
        f.fillCircle(14, -8, 9);
        f.fillStyle(0x111111, 1);
        f.fillCircle(16, -8, 4);
        break;
      }
      case 'clementine': {
        b.fillStyle(0xe67e22, 1);
        b.fillEllipse(0, 120, 120, 140);
        b.fillStyle(0xffffff, 1);
        b.fillEllipse(0, 130, 60, 80);
        b.fillStyle(0xe8e8f0, 1);
        b.fillEllipse(0, 200, 160, 30);
        f.fillStyle(0xe67e22, 1);
        f.fillTriangle(-46, -10, -30, -70, -10, -30);
        f.fillTriangle(46, -10, 30, -70, 10, -30);
        f.fillCircle(0, 0, 46);
        f.fillStyle(0xffffff, 1);
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
          f.fillStyle(0xf0b8c0, 1);
          f.fillCircle(x - 34 * s, -30 * s + 40, 14 * s);
          f.fillCircle(x + 34 * s, -30 * s + 40, 14 * s);
          f.fillStyle(0xc8c0b8, 1);
          f.fillCircle(x, 40, 38 * s);
          f.fillStyle(0x111111, 1);
          f.fillCircle(x - 12 * s, 34, 4);
          f.fillCircle(x + 12 * s, 34, 4);
          f.fillStyle(0xf08080, 1);
          f.fillCircle(x, 48, 5);
          if (this.who === 'mice') {
            f.fillStyle(0x1c3d6e, 1);
            f.fillRoundedRect(x - 24, -8, 48, 18, 5);
            f.fillStyle(0x111111, 1);
            f.fillRect(x - 28, 8, 56, 5);
          }
        }
        break;
      }
      case 'humbug': {
        for (let i = 0; i < 4; i++) {
          const x = (i - 1.5) * 70;
          const y = 60 + (i % 2) * 40;
          b.fillStyle(0xffe066, 0.25);
          b.fillCircle(x, y, 40);
          b.fillStyle(0x2e9b5f, 1);
          b.fillEllipse(x, y, 46, 56);
          b.fillStyle(0xffe066, 1);
          b.fillCircle(x, y + 14, 12);
          b.fillStyle(0x111111, 1);
          b.fillCircle(x - 8, y - 14, 4);
          b.fillCircle(x + 8, y - 14, 4);
        }
        break;
      }
      case 'steamington': {
        b.fillStyle(0xc8703f, 1);
        b.fillRoundedRect(-70, 60, 140, 140, 20);
        b.fillStyle(0x222222, 1);
        b.fillTriangle(-20, 60, 20, 60, 0, 90);
        b.fillStyle(0xffffff, 1);
        b.fillTriangle(-10, 60, 10, 60, 0, 80);
        f.fillStyle(0xd88a4a, 1);
        f.fillRoundedRect(-46, -40, 92, 90, 20);
        f.fillStyle(0x222222, 1);
        f.fillRect(-36, -80, 72, 44);
        f.fillEllipse(0, -38, 100, 12);
        f.fillStyle(0xfff3bf, 1);
        f.fillCircle(-16, 0, 8);
        f.fillCircle(16, 0, 8);
        f.fillStyle(0x6e3418, 1);
        f.fillEllipse(-12, 24, 26, 8);
        f.fillEllipse(12, 24, 26, 8);
        break;
      }
      case 'bertie': {
        b.fillStyle(0xd64541, 1);
        b.fillRoundedRect(-100, 60, 200, 160, 24);
        b.fillStyle(0xf2e6c8, 1);
        b.fillRoundedRect(-60, 90, 120, 80, 12);
        for (let i = 0; i < 5; i++) {
          b.fillStyle([0xffd43b, 0x74c0fc, 0x8ce99a, 0xff8787, 0xb197fc][i], 1);
          b.fillCircle(-44 + i * 22, 110, 7);
        }
        f.fillStyle(0xd64541, 1);
        f.fillRoundedRect(-70, -60, 140, 110, 22);
        f.fillStyle(0xf2e6c8, 1);
        f.fillCircle(-30, -14, 20);
        f.fillCircle(30, -14, 20);
        f.fillStyle(0x222222, 1);
        f.fillCircle(-30, -14, 9);
        f.fillCircle(30, -14, 9);
        f.lineStyle(4, 0x7a2a22, 1);
        f.lineBetween(0, -60, 0, -86);
        f.fillStyle(0xffd43b, 1);
        f.fillCircle(0, -90, 9);
        break;
      }
      case 'lumen': {
        b.fillStyle(0xfff3bf, 0.25);
        b.fillCircle(0, 60, 120);
        b.fillStyle(0xd9c7a0, 1);
        b.fillEllipse(-70, 60, 120, 90);
        b.fillEllipse(70, 60, 120, 90);
        b.fillStyle(0xb8a07a, 1);
        b.fillEllipse(0, 80, 40, 110);
        f.fillStyle(0xb8a07a, 1);
        f.fillCircle(0, 0, 30);
        f.fillStyle(0x111111, 1);
        f.fillCircle(-10, -2, 6);
        f.fillCircle(10, -2, 6);
        f.lineStyle(3, 0x8a6a4a, 1);
        f.lineBetween(-8, -26, -26, -60);
        f.lineBetween(8, -26, 26, -60);
        break;
      }
      case 'pudding': {
        b.fillStyle(0xe8913a, 1);
        b.fillEllipse(0, 110, 260, 180);
        b.fillStyle(0xf6b26b, 1);
        for (let i = 0; i < 4; i++) b.fillRect(-90 + i * 50, 50, 16, 110);
        f.fillStyle(0xe8913a, 1);
        f.fillTriangle(-50, -10, -36, -64, -10, -30);
        f.fillTriangle(50, -10, 36, -64, 10, -30);
        f.fillCircle(0, 0, 56);
        f.lineStyle(4, 0x6b3a12, 1);
        f.beginPath();
        f.arc(-20, -4, 10, 0.2, Math.PI - 0.2);
        f.strokePath();
        f.beginPath();
        f.arc(20, -4, 10, 0.2, Math.PI - 0.2);
        f.strokePath();
        f.fillStyle(0xf08080, 1);
        f.fillTriangle(-6, 12, 6, 12, 0, 20);
        break;
      }
      default: {
        f.fillStyle(0xd9a441, 1);
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
  ring.fillStyle(0x7a5413, 1);
  ring.fillCircle(0, 0, r + 4);
  ring.fillStyle(0xfff6e2, 1);
  ring.fillCircle(0, 0, r);
  c.add(ring);
  const p = new Portrait(scene, 0, r * 0.35, who, r / 95);
  const mask = scene.make.graphics({}, false);
  mask.fillStyle(0xffffff);
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
