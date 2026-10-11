import Phaser from 'phaser';
import { cosmeticById, DEFAULT_LOOK, TESS_LOOK, type KipLook } from '../content/cosmetics';
import { CM } from './copperMoss';
import { withArt } from './generated';
import { atlasFrame, kipFinishTexture } from './sprites';
import { AccessoryRig } from './Accessories';
import { trailTexture } from './accessoryMaterials';

/**
 * Kip, the thumb-sized wind-up automaton (GDD §5), etched in copper and moss and
 * rebuilt from a KipLook (key, plate, finish, eyes, bulb, hat, feet, trail —
 * GDD §18). `variant: 'tess'` draws Kip's copper sister with her periscope
 * antenna and skirt-like gear rim.
 */
export class Kip extends Phaser.GameObjects.Container {
  private keyG: Phaser.GameObjects.Graphics;
  private lids: Phaser.GameObjects.Graphics;
  private pupils: Phaser.GameObjects.Graphics;
  private eyesG: Phaser.GameObjects.Graphics;
  private bulb: Phaser.GameObjects.Graphics;
  private shell: Phaser.GameObjects.Graphics;
  private plateG: Phaser.GameObjects.Graphics;
  private shellArt?: Phaser.GameObjects.Image;
  private dimensional?: Phaser.GameObjects.Image;
  private dimensionalKey?: string;
  private accessories: AccessoryRig;
  private hands!: Phaser.GameObjects.Graphics;
  private shadow!: Phaser.GameObjects.Graphics;
  private poseUntil = 0;
  private pose = 0;
  private hatG: Phaser.GameObjects.Graphics;
  private plateText: Phaser.GameObjects.Text;
  private torso: Phaser.GameObjects.Container;
  private legL: Phaser.GameObjects.Graphics;
  private legR: Phaser.GameObjects.Graphics;
  private walkTween?: Phaser.Tweens.Tween;
  private trail?: Phaser.GameObjects.Particles.ParticleEmitter;
  private keySpeed = 0.6;
  private t = 0;
  private busy = false;
  private sleeping = false;
  private pupilDx = 0;
  private look: KipLook;
  private trailTimer = 0;
  private blinkTimer?: Phaser.Time.TimerEvent;
  readonly groundY: number;
  readonly variant: 'kip' | 'tess';
  minX = 60;
  maxX = 1220;

  constructor(scene: Phaser.Scene, x: number, groundY: number, look: KipLook = DEFAULT_LOOK, variant: 'kip' | 'tess' = 'kip') {
    super(scene, x, groundY);
    this.groundY = groundY;
    this.variant = variant;
    this.look = { ...look };

    this.legL = scene.add.graphics();
    this.legR = scene.add.graphics();
    this.legL.setPosition(-10, -8);
    this.legR.setPosition(10, -8);
    this.torso = scene.add.container(0, -30);
    this.keyG = scene.add.graphics().setPosition(-27, -10);
    this.bulb = scene.add.graphics();
    this.shell = scene.add.graphics();
    this.plateG = scene.add.graphics();
    this.eyesG = scene.add.graphics();
    this.pupils = scene.add.graphics();
    this.lids = scene.add.graphics();
    this.hatG = scene.add.graphics();
    this.plateText = scene.add.text(0, 16, '', { fontFamily: 'Georgia, serif', fontSize: '9px', color: '#40352a', fontStyle: 'bold' }).setOrigin(0.5);
    const hands = scene.add.graphics();
    this.hands = hands;
    for (const side of [-1, 1]) {
      hands.lineStyle(3, CM.inkSoft, 1);
      hands.lineBetween(side * 21, 3, side * 29, 9);
      hands.lineStyle(1.2, CM.brass, 1);
      for (let i = 0; i < 3; i++) hands.strokeEllipse(side * (22 + i * 2), 4 + i * 1.5, 3, 7);
      hands.fillStyle(CM.ink, 1);
      hands.fillEllipse(side * 29, 10, 12, 14);
      hands.fillStyle(CM.brass, 1);
      hands.fillEllipse(side * 29 - 1, 9, 10, 12);
      hands.fillStyle(CM.copperDark, 1);
      hands.fillTriangle(side * 29, 9, side * 31, 17, side * 28, 17);
      hands.fillStyle(CM.cream, 0.65);
      hands.fillEllipse(side * 29 - 2, 6, 3, 5);
    }
    this.torso.add([this.keyG, this.bulb, this.shell, this.plateG, this.plateText, this.eyesG, this.pupils, this.lids, this.hatG, hands]);
    this.accessories = new AccessoryRig(scene, this.torso, this.variant);
    this.add([this.legL, this.legR, this.torso]);
    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x171a17, 0.16).fillEllipse(0, 3, 60, 13);
    this.shadow.fillStyle(0x171a17, 0.22).fillEllipse(0, 2, 43, 7);
    this.addAt(this.shadow, 0);
    this.setSize(70, 90);
    scene.add.existing(this);
    this.redraw();
    withArt(scene, 'copper-kip-shell', (key) => {
      if (!this.active || !this.scene) return;
      this.shellArt = scene.add.image(0, 0, key).setDisplaySize(58, 58);
      this.torso.addAt(this.shellArt, 3);
      this.updateShellArt();
    });
    withArt(scene, this.variant === 'tess' ? 'tess-modular' : 'kip-modular', (key) => {
      if (!this.active || !this.scene) return;
      this.dimensionalKey = key;
      this.dimensional = scene.add.image(0, 32, key, atlasFrame(scene, key, 0, 4, 2)).setOrigin(0.5, 1).setDisplaySize(94, 94).setName(`${this.variant}:modular`);
      this.torso.addAt(this.dimensional, 1);
      this.updateShellArt();
    });
    // Keep the handle: a looping timer that outlives a destroyed Kip used to throw on
    // `this.scene` (undefined after destroy), which killed Phaser's game loop.
    this.blinkTimer = scene.time.addEvent({ delay: 3200 + Math.random() * 800, loop: true, callback: () => this.blink() });
  }

  setLook(look: KipLook): void {
    this.look = { ...look };
    this.redraw();
  }

  getLook(): KipLook {
    return { ...this.look };
  }

  private col(id: string, fallback: number): number {
    return cosmeticById(id)?.color ?? fallback;
  }

  private redraw(): void {
    const L = this.look;
    const fin = cosmeticById(L.finish);
    const face = fin?.color ?? CM.copper;
    const dark = fin?.color2 ?? CM.copperDark;
    const light = Phaser.Display.Color.ValueToColor(face).lighten(25).color;

    // legs & feet
    for (const [index, leg] of [this.legL, this.legR].entries()) {
      leg.clear();
      leg.fillStyle(CM.ink, 1);
      leg.fillRect(-2, -2, 4, 18);
      leg.fillStyle(CM.brass, 1);
      leg.fillEllipse(0, 0, 10, 5);
      leg.lineStyle(2.5, CM.inkSoft, 1);
      for (let i = 0; i < 4; i++) leg.strokeEllipse(0, 3 + i * 3, 9, 3.5);
      leg.lineStyle(1.1, CM.cream, 0.9);
      for (let i = 0; i < 4; i++) leg.lineBetween(-4, 2 + i * 3, 3.5, 4 + i * 3);
      const f = L.feet;
      if (f === 'feet-wheels') {
        leg.fillStyle(CM.ink, 1);
        leg.fillCircle(0, 19, 6);
        leg.lineStyle(1.5, CM.brass, 1);
        leg.strokeCircle(0, 19, 4);
        leg.fillStyle(CM.cream, 1);
        leg.fillCircle(0, 19, 2.5);
      } else if (f === 'feet-clogs') {
        leg.fillStyle(CM.woodLight, 1);
        leg.fillRoundedRect(-8, 14, 16, 8, 4);
        leg.lineStyle(0.8, CM.woodDark, 1);
        leg.lineBetween(-6, 18, 6, 17);
        leg.lineBetween(-4, 20, 7, 19);
      } else if (f === 'feet-rocket') {
        leg.fillStyle(CM.copperDark, 1);
        leg.fillRoundedRect(-7, 12, 14, 10, 3);
        leg.fillStyle(CM.copperLight, 1);
        leg.fillRect(-5, 13, 10, 4);
        leg.fillStyle(CM.glow, 1);
        leg.fillTriangle(-4, 22, 4, 22, 0, 28);
      } else {
        // A repaired teal shoe and an old copper shoe make Kip recognisable at a glance.
        leg.fillStyle(CM.ink, 1);
        leg.fillEllipse(-1, 19, 17, 10);
        leg.fillStyle(index === 0 ? face : CM.teal, 1);
        leg.fillEllipse(-1, 17, 15, 9);
        leg.fillStyle(CM.brass, 1);
        leg.fillEllipse(-1, 21, 16, 3);
        leg.fillStyle(CM.cream, 0.6);
        leg.fillEllipse(-3, 15, 4, 2);
        leg.fillStyle(CM.ink, 0.8);
        leg.fillCircle(3, 19, 0.8);
        leg.fillCircle(-6, 19, 0.8);
      }
    }

    // winding key
    const k = this.keyG;
    k.clear();
    const kc = this.col(L.key, CM.brass);
    k.fillStyle(CM.ink, 1);
    k.fillRoundedRect(-4, -7, 15, 13, 4);
    k.fillStyle(CM.copperDark, 1);
    k.fillRoundedRect(-3, -5, 12, 10, 3);
    k.lineStyle(1, CM.brass, 1);
    k.lineBetween(3, -4, 3, 4);
    k.fillStyle(kc, 1);
    switch (L.key) {
      case 'key-heart':
        heart(k, -11, 0, 12);
        heart(k, 11, 0, 12);
        break;
      case 'key-star':
        star(k, -12, 0, 11, 5);
        star(k, 12, 0, 11, 5);
        break;
      case 'key-bolt':
        k.fillTriangle(-20, -8, -6, -2, -12, 4);
        k.fillTriangle(-12, -2, -4, 8, -14, 2);
        k.fillTriangle(20, -8, 6, -2, 12, 4);
        k.fillTriangle(12, -2, 4, 8, 14, 2);
        break;
      case 'key-whisk':
        k.lineStyle(3, kc, 1);
        for (const s of [-1, 1]) {
          k.strokeEllipse(s * 12, 0, 18, 12);
          k.strokeEllipse(s * 12, 0, 12, 20);
        }
        break;
      case 'key-clef':
        k.lineStyle(3, kc, 1);
        k.strokeCircle(-11, 2, 6);
        k.strokeCircle(11, 2, 6);
        k.lineBetween(-11, -10, -11, 8);
        k.lineBetween(11, -10, 11, 8);
        break;
      case 'key-wheel':
      case 'key-bell':
        k.fillCircle(-12, 0, 10);
        k.fillCircle(12, 0, 10);
        k.lineStyle(2, 0x5e3f10, 1);
        for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI;
          k.lineBetween(s * 12 - Math.cos(a) * 9, -Math.sin(a) * 9, s * 12 + Math.cos(a) * 9, Math.sin(a) * 9);
        }
        break;
      case 'key-anchor':
        k.lineStyle(3, kc, 1);
        for (const s of [-1, 1]) {
          k.lineBetween(s * 12, -9, s * 12, 9);
          k.beginPath();
          k.arc(s * 12, 2, 7, 0.2, Math.PI - 0.2);
          k.strokePath();
        }
        break;
      case 'key-master':
        k.fillStyle(0xffd700, 1);
        k.fillEllipse(-12, 0, 18, 24);
        k.fillEllipse(12, 0, 18, 24);
        k.fillStyle(0xfff3b0, 1);
        star(k, -12, 0, 6, 5);
        star(k, 12, 0, 6, 5);
        break;
      default:
        if (this.variant === 'tess' && L.key === 'key-classic') {
          heart(k, -11, 0, 12);
          heart(k, 11, 0, 12);
        } else {
          // Open double-loop brass handle; no painted-in holes, so the scene shows through.
          k.lineStyle(6, CM.ink, 1);
          k.strokeEllipse(-7, -10, 15, 21);
          k.strokeEllipse(-7, 10, 15, 21);
          k.lineStyle(4.5, kc, 1);
          k.strokeEllipse(-7, -10, 15, 21);
          k.strokeEllipse(-7, 10, 15, 21);
          k.lineStyle(0.7, CM.cream, 0.8);
          k.strokeEllipse(-7.6, -10.6, 15, 21);
          k.strokeEllipse(-7.6, 9.4, 15, 21);
          k.fillStyle(CM.copperDark, 0.65);
          for (let i = 0; i < 7; i++) k.fillCircle(-14 + (i % 2) * 14, -17 + i * 5.5, 0.75);
        }
    }

    // antenna + bulb / topper
    const b = this.bulb;
    b.clear();
    b.lineStyle(3, CM.ink, 1);
    if (this.variant === 'tess') {
      b.lineBetween(-8, -22, -8, -44);
      b.lineBetween(-8, -44, 2, -44);
      b.fillStyle(CM.brass, 1);
      b.fillRect(0, -49, 8, 10);
      b.fillStyle(CM.sky, 1);
      b.fillRect(6, -47, 3, 6);
    } else {
      b.beginPath();
      b.moveTo(8, -22);
      b.lineTo(9, -29);
      b.lineTo(6, -33);
      b.lineTo(13, -37);
      b.lineTo(14, -42);
      b.strokePath();
      b.lineStyle(1, CM.brass, 1);
      b.lineBetween(8.5, -25, 9.5, -29);
      b.lineBetween(7.5, -33, 14, -38);
    }
    const bx = this.variant === 'tess' ? -8 : 14;
    const by = this.variant === 'tess' ? -52 : -42;
    const bc = this.col(L.bulb, CM.glow);
    drawTopper(b, L.bulb, bx, by, bc);

    // Pocket-watch case: a copper rim, an old enamel repair, a softly lit faceplate.
    const s = this.shell;
    s.clear();
    s.fillStyle(CM.ink, 1);
    s.fillCircle(0, 2, 27);
    s.fillStyle(face, 1);
    s.fillCircle(0, 0, 25.5);
    s.fillStyle(CM.copperLight, 0.24);
    s.fillEllipse(-6, -8, 33, 29);
    s.fillStyle(CM.teal, 1);
    s.fillPoints([
      new Phaser.Math.Vector2(-24, -9), new Phaser.Math.Vector2(-18, -19),
      new Phaser.Math.Vector2(-8, -23), new Phaser.Math.Vector2(-5, -16),
      new Phaser.Math.Vector2(-12, -5), new Phaser.Math.Vector2(-15, 13),
      new Phaser.Math.Vector2(-24, 8),
    ], true);
    s.lineStyle(0.8, CM.tealDark, 1);
    s.lineBetween(-8, -22, -5, -16);
    s.lineBetween(-5, -16, -12, -5);
    s.lineBetween(-12, -5, -15, 13);
    const front = L.finish === 'finish-brass' ? CM.brass : light;
    s.fillStyle(dark, 1);
    s.fillCircle(3, -1, 21.2);
    s.fillStyle(front, 1);
    s.fillCircle(3, -1, 20);
    if (L.finish === 'finish-candy') {
      s.fillStyle(0xffffff, 0.8);
      for (let i = -3; i <= 3; i++) s.fillRect(i * 8 - 2, -24, 4, 48);
      s.fillStyle(face, 0);
    }
    etchedEllipse(s, 0, 0, 25, 25, 19, 70);
    s.lineStyle(0.85, CM.inkSoft, 0.9);
    s.strokeCircle(0, 0, 25.5);
    s.lineStyle(0.8, CM.cream, 0.6);
    s.beginPath();
    s.arc(-0.5, -0.5, 24, Math.PI * 1.15, Math.PI * 1.7);
    s.strokePath();
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9 + 0.15;
      const rx = Math.cos(a) * 22;
      const ry = Math.sin(a) * 22;
      s.fillStyle(CM.ink, 1);
      s.fillCircle(rx, ry, 1.5);
      s.fillStyle(CM.brass, 1);
      s.fillCircle(rx - 0.3, ry - 0.35, 1);
      s.lineStyle(0.6, CM.inkSoft, 1);
      s.lineBetween(rx - 0.6, ry - 0.3, rx + 0.5, ry + 0.3);
    }
    s.fillStyle(CM.inkSoft, 1);
    s.fillRoundedRect(4, -28, 10, 5, 2);
    s.fillStyle(CM.brass, 1);
    s.fillEllipse(9, -28, 9, 3);
    if (this.variant === 'tess') {
      // skirt-like gear rim
      s.fillStyle(dark, 1);
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7;
        s.fillCircle(Math.cos(a) * 26, Math.sin(a) * 26, 3.5);
      }
    }
    this.plateG.clear();
    this.drawPlate(this.plateG, L, dark);
    this.updateShellArt();

    // eyes
    const e = this.eyesG;
    e.clear();
    const glass = this.col(L.eyes, CM.cream);
    e.fillStyle(CM.ink, 1);
    if (L.eyes === 'eyes-heart') {
      heart(e, -9, -3, 19);
      heart(e, 9, -3, 19);
      e.fillStyle(glass, 1);
      heart(e, -9, -3, 15);
      heart(e, 9, -3, 15);
    } else if (L.eyes === 'eyes-star') {
      star(e, -9, -3, 11, 5);
      star(e, 9, -3, 11, 5);
      e.fillStyle(glass, 1);
      star(e, -9, -3, 8, 5);
      star(e, 9, -3, 8, 5);
    } else if (L.eyes === 'eyes-telescope') {
      e.fillRect(-17, -11, 16, 16);
      e.fillRect(1, -11, 16, 16);
      e.fillStyle(glass, 1);
      e.fillCircle(-9, -3, 7);
      e.fillCircle(9, -3, 7);
    } else {
      const r2 = L.eyes === 'eyes-monocle' ? 11 : 10;
      e.fillCircle(-9, -3, 10);
      e.fillCircle(9, -3, r2);
      e.fillStyle(CM.brass, 1);
      e.fillCircle(-9.25, -3.25, 9.1);
      e.fillCircle(8.75, -3.25, r2 - 0.9);
      e.fillStyle(CM.inkSoft, 1);
      e.fillCircle(-9, -3, 8.1);
      e.fillCircle(9, -3, r2 - 1.9);
      e.fillStyle(glass, 1);
      e.fillCircle(-9, -3, 7.4);
      e.fillCircle(9, -3, r2 - 2.6);
      e.fillStyle(CM.sky, 0.26);
      e.fillEllipse(-9, 0, 12, 7);
      e.fillEllipse(9, 0, 12, 7);
      if (L.eyes === 'eyes-monocle') {
        e.lineStyle(1.5, 0xffd700, 1);
        e.strokeCircle(9, -3, r2);
        e.lineBetween(18, 0, 22, 18);
      }
    }
    // Kip communicates with eyes and a tiny engraved smile, even without speech.
    e.lineStyle(1, CM.inkSoft, 1);
    e.beginPath();
    e.arc(0, 8, 4.5, Math.PI * 0.17, Math.PI * 0.83);
    e.strokePath();
    this.drawPupils();

    // hat
    const h = this.hatG;
    h.clear();
    const hc = cosmeticById(L.hat);
    const c1 = hc?.color ?? 0xffffff;
    const c2 = hc?.color2 ?? 0xffd43b;
    switch (L.hat) {
      case 'hat-party':
        h.fillStyle(c1, 1);
        h.fillTriangle(-12, -26, 12, -26, 2, -58);
        h.fillStyle(c2, 1);
        h.fillCircle(2, -58, 5);
        h.fillCircle(-4, -36, 3);
        h.fillCircle(6, -44, 3);
        break;
      case 'hat-feather':
        h.fillStyle(c1, 1);
        h.fillEllipse(0, -27, 46, 10);
        h.fillRoundedRect(-13, -42, 26, 16, 6);
        h.fillStyle(c2, 1);
        h.fillEllipse(16, -50, 10, 30);
        h.fillStyle(0xffd43b, 1);
        h.fillEllipse(-14, -46, 8, 22);
        break;
      case 'hat-tophat':
        h.fillStyle(c1, 1);
        h.fillEllipse(0, -27, 44, 9);
        h.fillRect(-12, -56, 24, 30);
        h.fillStyle(c2, 1);
        h.fillRect(-12, -32, 24, 5);
        break;
      case 'hat-toque':
        h.fillStyle(c1, 1);
        h.fillRect(-12, -36, 24, 10);
        h.fillCircle(-8, -42, 9);
        h.fillCircle(6, -44, 10);
        h.fillCircle(0, -50, 9);
        h.fillStyle(0xe9ecef, 1);
        h.fillCircle(-3, -33, 2);
        break;
      case 'hat-bow':
        h.fillStyle(c1, 1);
        h.fillTriangle(0, -30, -16, -40, -16, -22);
        h.fillTriangle(0, -30, 16, -40, 16, -22);
        h.fillCircle(0, -30, 4);
        break;
      case 'hat-conductor':
      case 'hat-captain':
        h.fillStyle(c1, 1);
        h.fillRoundedRect(-15, -42, 30, 15, 5);
        h.fillStyle(0x222222, 1);
        h.fillEllipse(4, -27, 34, 7);
        h.fillStyle(c2, 1);
        h.fillCircle(0, -36, 3.5);
        break;
      case 'hat-flowers':
        for (let i = 0; i < 5; i++) {
          h.fillStyle([c1, 0xffd43b, 0xff8787][i % 3], 1);
          h.fillCircle(-16 + i * 8, -29 - Math.sin((i / 4) * Math.PI) * 4, 4.5);
        }
        break;
      case 'hat-grad':
        h.fillStyle(c1, 1);
        h.fillRect(-10, -36, 20, 10);
        h.fillPoints([new Phaser.Math.Vector2(-22, -38), new Phaser.Math.Vector2(0, -46), new Phaser.Math.Vector2(22, -38), new Phaser.Math.Vector2(0, -30)], true);
        h.lineStyle(2, c2, 1);
        h.lineBetween(0, -38, 16, -30);
        break;
    }

    // trail
    this.setupTrail(L.trail);
    this.accessories.setLook(L);
  }

  private updateShellArt(): void {
    if (this.dimensional && this.dimensionalKey) {
      const L = this.look;
      const baseLook = this.variant === 'tess' ? TESS_LOOK : DEFAULT_LOOK;
      const key = kipFinishTexture(this.scene, this.dimensionalKey, L.finish, cosmeticById(L.finish)?.color ?? CM.copper, baseLook.finish);
      this.dimensional.setTexture(key, atlasFrame(this.scene, key, this.pose, 4, 2)).setDisplaySize(94, 94);
      this.shell.setVisible(false); this.shellArt?.setVisible(false); this.hands.setVisible(false);
      for (const part of [this.legL,this.legR,this.keyG,this.bulb,this.eyesG,this.pupils,this.lids,this.plateG,this.plateText,this.hatG]) part.setVisible(false);
      this.accessories.setVisible(true);
      return;
    }
    // The painted case shares the live rig: lenses, lids, key, hands and feet still animate.
    // Other finishes remain physically redrawn so earned customisation keeps its colours.
    const useArt = !!this.shellArt && this.variant === 'kip' && this.look.finish === 'finish-brass';
    this.shell.setVisible(!useArt);
    this.shellArt?.setVisible(useArt);
  }

  private drawPlate(s: Phaser.GameObjects.Graphics, L: KipLook, dark: number): void {
    const plate = L.plate;
    this.plateText.setText('');
    if (plate === 'plate-plain' || !plate) {
      s.fillStyle(dark, 1);
      s.fillRoundedRect(-9, 12, 18, 7, 3);
      return;
    }
    s.fillStyle(0xe7bb55, 1);
    s.fillRoundedRect(-11, 10, 22, 11, 3);
    s.lineStyle(1, 0x7a5413, 1);
    s.strokeRoundedRect(-11, 10, 22, 11, 3);
    s.fillStyle(0x7a5413, 1);
    switch (plate) {
      case 'plate-monogram':
        this.plateText.setText(L.initials || '★');
        break;
      case 'plate-firstmate':
        this.plateText.setText('1st');
        break;
      case 'plate-gear':
        s.fillCircle(0, 15.5, 3.5);
        for (let i = 0; i < 6; i++) s.fillCircle(Math.cos(i) * 4.5, 15.5 + Math.sin(i) * 4.5, 1.2);
        break;
      case 'plate-heart':
        heart(s, 0, 15, 8);
        break;
      case 'plate-wave':
        s.lineStyle(1.5, 0x1c7ed6, 1);
        s.beginPath();
        for (let x = -8; x <= 8; x += 2) s.lineTo(x, 15.5 + Math.sin(x) * 2);
        s.strokePath();
        break;
      case 'plate-teacup':
        s.fillRect(-4, 13, 7, 5);
        s.strokeCircle(4, 15, 2);
        break;
      case 'plate-bertie':
        s.fillStyle(0xd64541, 1);
        s.fillRect(-4, 12, 8, 7);
        s.fillStyle(0xffffff, 1);
        s.fillRect(-3, 13, 2, 2);
        s.fillRect(1, 13, 2, 2);
        break;
      case 'plate-rocket':
        s.fillTriangle(-6, 18, -6, 13, 6, 15.5);
        break;
      case 'plate-stars':
        star(s, -5, 15.5, 3, 5);
        star(s, 4, 15.5, 3, 5);
        break;
      case 'plate-clockface':
        s.fillStyle(0xf6ead0, 1);
        s.fillCircle(0, 15.5, 4.5);
        s.lineStyle(1, 0x3b260b, 1);
        s.lineBetween(0, 15.5, 0, 12.5);
        s.lineBetween(0, 15.5, 2.5, 15.5);
        break;
    }
  }

  private setupTrail(trail: string): void {
    this.trail?.destroy();
    this.trail = undefined;
    if (!trail || trail === 'trail-none' || !this.scene) return;
    const key = trailTexture(this.scene, trail);
    this.trail = this.scene.add.particles(0, 0, key, {
      lifespan: 900,
      speedY: { min: -40, max: -10 },
      speedX: { min: -20, max: 20 },
      scale: { start: trail === 'trail-steam' ? 0.18 : 0.10, end: 0 },
      alpha: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    this.trail.setDepth((this.depth || 0) - 1);
  }

  private drawPupils(): void {
    const dx = this.pupilDx;
    this.pupils.clear();
    this.pupils.fillStyle(CM.tealDark, 1);
    this.pupils.fillCircle(-9 + dx, -2.6, 4.7);
    this.pupils.fillCircle(9 + dx, -2.6, 4.7);
    this.pupils.fillStyle(CM.ink, 1);
    this.pupils.fillCircle(-9 + dx, -3, 3.5);
    this.pupils.fillCircle(9 + dx, -3, 3.5);
    this.pupils.fillStyle(CM.cream, 1);
    this.pupils.fillCircle(-10.8 + dx, -5.3, 1.8);
    this.pupils.fillCircle(7.2 + dx, -5.3, 1.8);
    this.pupils.fillStyle(CM.cream, 0.45);
    this.pupils.fillCircle(-7 + dx, -0.5, 0.7);
    this.pupils.fillCircle(11 + dx, -0.5, 0.7);
  }

  lookToward(x: number): void {
    this.pupilDx = Phaser.Math.Clamp((x - this.x) / 200, -1, 1) * 2.5 * (this.scaleX < 0 ? -1 : 1);
    this.drawPupils();
  }

  blink(): void {
    if (!this.scene) return; // destroyed (e.g. a late timer or tween callback)
    if (this.sleeping) return;
    if (this.dimensional) { this.pose = 1; this.poseUntil = this.t + 0.18; return; }
    const lids = this.lids;
    let step = 0;
    const L = this.look;
    const fin = cosmeticById(L.finish);
    const lidCol = fin?.color2 ?? 0xb88a2c;
    this.scene.time.addEvent({
      delay: 40,
      repeat: 5,
      callback: () => {
        step++;
        const h = [5, 12, 16, 12, 5, 0][step - 1] ?? 0;
        lids.clear();
        if (h === 0) return;
        lids.fillStyle(lidCol, 1);
        lids.fillRect(-17, -11, 16, h);
        lids.fillRect(1, -11, 16, h);
      },
    });
  }

  /** Point of the magnet hand, in world coordinates. */
  handPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x + 27 * this.scaleX * Math.abs(this.scaleY), this.y + (this.torso.y + 8) * Math.abs(this.scaleY));
  }

  walkTo(x: number, onArrive?: () => void): void {
    if (!this.scene) return; // destroyed (e.g. a late timer or tween callback)
    if (this.busy) return;
    const tx = Phaser.Math.Clamp(x, this.minX, this.maxX);
    if (Math.abs(tx - this.x) < 8) {
      onArrive?.();
      return;
    }
    this.walkTween?.stop();
    const sy = Math.abs(this.scaleY);
    this.setScale(tx < this.x ? -sy : sy, sy);
    this.keySpeed = 3;
    this.walkTween = this.scene.tweens.add({
      targets: this,
      x: tx,
      duration: Math.min(1400, Math.abs(tx - this.x) * 2.6),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.keySpeed = 0.6;
        onArrive?.();
      },
    });
  }

  /** Happy hop + spin (the "Wind-Up Wiggle"). */
  celebrate(): void {
    if (!this.scene) return; // destroyed (e.g. a late timer or tween callback)
    this.pose = 4; this.poseUntil = this.t + 1.6;
    this.busy = true;
    this.walkTween?.stop();
    this.keySpeed = 8;
    this.scene.tweens.add({ targets: this.bulb, scale: 1.25, yoyo: true, duration: 180, repeat: 3 });
    this.scene.tweens.chain({
      targets: this.torso,
      tweens: [
        { y: -80, duration: 260, ease: 'Quad.easeOut' },
        { y: -30, duration: 260, ease: 'Bounce.easeOut' },
        { y: -70, duration: 220, ease: 'Quad.easeOut' },
        { y: -30, duration: 240, ease: 'Bounce.easeOut' },
      ],
      onComplete: () => {
        this.busy = false;
        this.keySpeed = 0.6;
      },
    });
    this.scene.tweens.add({ targets: this.torso, angle: 360, duration: 500, delay: 520, onComplete: () => this.torso.setAngle(0) });
  }

  /** Proud Polish: buff the chest after a fix. */
  polish(): void {
    if (!this.scene) return; // destroyed (e.g. a late timer or tween callback)
    this.scene.tweens.add({ targets: this.torso, angle: { from: -6, to: 6 }, duration: 120, yoyo: true, repeat: 3, onComplete: () => this.torso.setAngle(0) });
  }

  /** A little shrug when a part refuses to fit. */
  shrug(): void {
    if (!this.scene) return; // destroyed (e.g. a late timer or tween callback)
    this.scene.tweens.add({ targets: this.torso, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => this.torso.setAngle(0) });
  }

  /** Giggles: rapid little shakes. */
  giggle(): void {
    if (!this.scene) return; // destroyed (e.g. a late timer or tween callback)
    this.scene.tweens.add({ targets: this.torso, y: -34, duration: 50, yoyo: true, repeat: 6 });
  }

  /** Peek: the lens-eyes push forward like binoculars. */
  peek(): void {
    if (!this.scene) return; // destroyed (e.g. a late timer or tween callback)
    if (this.dimensional) { this.pose = 7; this.poseUntil = this.t + .65; return; }
    this.scene.tweens.add({ targets: [this.eyesG, this.pupils], scale: 1.3, duration: 160, yoyo: true, hold: 300 });
  }

  /** Point the whole body at something (hint). */
  point(x: number): void {
    if (!this.scene) return; // destroyed (e.g. a late timer or tween callback)
    this.walkTo(x - 120 * Math.sign(x - this.x || 1));
    this.scene.tweens.add({ targets: this.torso, angle: x > this.x ? 18 : -18, duration: 200, yoyo: true, hold: 600 });
  }

  /** Tick-Tock Nap: sit and snooze. */
  nap(on: boolean): void {
    if (!this.scene) return; // destroyed (e.g. a late timer or tween callback)
    this.sleeping = on;
    this.busy = on;
    this.pose = on ? 6 : 0; this.poseUntil = on ? Number.POSITIVE_INFINITY : 0;
    this.scene.tweens.add({ targets: this.torso, y: on ? -20 : -30, angle: on ? -8 : 0, duration: 400 });
    this.keySpeed = on ? 0.2 : 0.6;
  }

  preUpdate(_time: number, delta: number): void {
    this.t += delta / 1000;
    this.keyG.rotation += this.keySpeed * (delta / 1000) * 2;
    this.keyG.scaleX = Math.cos(this.t * this.keySpeed * 2);
    const walking = this.walkTween?.isPlaying() ?? false;
    if (this.dimensional) {
      if (this.t > this.poseUntil) this.pose = walking ? 2 + Math.floor(this.t * 8) % 2 : Math.abs(this.pupilDx) > 1 ? 7 : 0;
      this.dimensional.setFrame(atlasFrame(this.scene, this.dimensional.texture.key, this.pose, 4, 2));
      this.accessories.update(this.pose,this.t,walking,this.keySpeed,this.pupilDx);
      this.shadow.setScale(walking ? 0.9 : 1).setAlpha(this.busy ? 0.6 : 1);
    }
    const swing = walking ? Math.sin(this.t * 18) * 0.5 : 0;
    this.legL.rotation = swing;
    this.legR.rotation = -swing;
    if (!this.busy) this.torso.y = -30 + (walking ? Math.abs(Math.sin(this.t * 18)) * -4 : Math.sin(this.t * 2.2) * 1.5);
    this.bulb.setAlpha(0.8 + Math.sin(this.t * 3) * 0.2);
    if (this.trail && walking) {
      this.trailTimer += delta;
      if (this.trailTimer > 90) {
        this.trailTimer = 0;
        this.trail.emitParticleAt(this.x - 10 * Math.sign(this.scaleX), this.y - 8, 1);
      }
    }
  }

  preDestroy(): void {
    this.blinkTimer?.remove();
    this.blinkTimer = undefined;
    this.walkTween?.stop();
    this.trail?.destroy();
  }
}

export function heart(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  g.fillCircle(x - s * 0.22, y - s * 0.12, s * 0.28);
  g.fillCircle(x + s * 0.22, y - s * 0.12, s * 0.28);
  g.fillTriangle(x - s * 0.48, y - s * 0.02, x + s * 0.48, y - s * 0.02, x, y + s * 0.45);
}

export function star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, n = 5): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillPoints(pts, true);
}

/** Antenna bulbs and toppers (shared with the Paint & Polish swatches). */
export function drawTopper(b: Phaser.GameObjects.Graphics, id: string, x: number, y: number, color: number): void {
  b.fillStyle(color, 0.25);
  b.fillCircle(x, y, 10);
  b.fillStyle(color, 1);
  switch (id) {
    case 'topper-star':
      star(b, x, y, 9);
      break;
    case 'topper-propeller':
      b.fillEllipse(x - 8, y, 14, 5);
      b.fillEllipse(x + 8, y, 14, 5);
      b.fillStyle(0x333333, 1);
      b.fillCircle(x, y, 3);
      break;
    case 'topper-flag':
      b.fillTriangle(x, y - 9, x, y + 3, x + 13, y - 3);
      b.lineStyle(2, 0x5e3f10, 1);
      b.lineBetween(x, y - 10, x, y + 6);
      break;
    case 'topper-lighthouse':
      b.fillRect(x - 4, y - 6, 8, 14);
      b.fillStyle(0xffffff, 1);
      b.fillRect(x - 4, y - 1, 8, 3);
      b.fillStyle(0xffd43b, 1);
      b.fillCircle(x, y - 8, 4);
      break;
    case 'bulb-heart':
      heart(b, x, y, 16);
      break;
    case 'bulb-moon':
      b.fillCircle(x, y, 7);
      b.fillStyle(0x2b1d14, 0.6);
      b.fillCircle(x + 4, y - 2, 6);
      break;
    case 'bulb-flower':
      for (let i = 0; i < 5; i++) b.fillCircle(x + Math.cos((i / 5) * 6.28) * 5, y + Math.sin((i / 5) * 6.28) * 5, 4);
      b.fillStyle(0xffd43b, 1);
      b.fillCircle(x, y, 3);
      break;
    case 'topper-gear':
      b.fillCircle(x, y, 6);
      for (let i = 0; i < 8; i++) b.fillCircle(x + Math.cos((i / 8) * 6.28) * 7, y + Math.sin((i / 8) * 6.28) * 7, 2.2);
      b.fillStyle(0x5e3f10, 1);
      b.fillCircle(x, y, 2);
      break;
    case 'topper-note':
      b.fillEllipse(x - 3, y + 4, 9, 7);
      b.fillRect(x + 1, y - 9, 2.5, 13);
      b.fillTriangle(x + 3, y - 9, x + 3, y - 4, x + 9, y - 5);
      break;
    case 'topper-bell':
      b.fillTriangle(x - 8, y + 5, x + 8, y + 5, x, y - 8);
      b.fillCircle(x, y - 3, 5);
      break;
    case 'topper-cloud':
      b.fillCircle(x - 5, y, 5);
      b.fillCircle(x + 5, y, 5);
      b.fillCircle(x, y - 4, 6);
      break;
    case 'topper-rainbow':
      [0xff6b6b, 0xffd43b, 0x8ce99a, 0x74c0fc].forEach((c, i) => {
        b.lineStyle(2, c, 1);
        b.beginPath();
        b.arc(x, y + 4, 10 - i * 2.5, Math.PI, 0);
        b.strokePath();
      });
      break;
    case 'topper-lightning':
      b.fillTriangle(x - 2, y - 10, x + 6, y - 10, x - 1, y + 1);
      b.fillTriangle(x - 4, y - 1, x + 5, y - 2, x - 2, y + 10);
      break;
    case 'topper-sun':
      b.fillCircle(x, y, 6);
      for (let i = 0; i < 8; i++) b.fillCircle(x + Math.cos((i / 8) * 6.28) * 9, y + Math.sin((i / 8) * 6.28) * 9, 1.8);
      break;
    case 'topper-snowflake':
      b.lineStyle(2, color, 1);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        b.lineBetween(x - Math.cos(a) * 9, y - Math.sin(a) * 9, x + Math.cos(a) * 9, y + Math.sin(a) * 9);
      }
      break;
    case 'topper-rocket':
      b.fillEllipse(x, y - 2, 8, 18);
      b.fillStyle(0xe03131, 1);
      b.fillTriangle(x - 6, y + 7, x - 2, y + 2, x - 2, y + 8);
      b.fillTriangle(x + 6, y + 7, x + 2, y + 2, x + 2, y + 8);
      b.fillStyle(0xffa94d, 1);
      b.fillTriangle(x - 3, y + 8, x + 3, y + 8, x, y + 14);
      break;
    default:
      b.fillStyle(CM.inkSoft, 1);
      b.fillRoundedRect(x - 3.2, y + 3, 6.4, 6, 1);
      b.lineStyle(0.7, CM.brass, 1);
      b.lineBetween(x - 3, y + 5, x + 3, y + 5);
      b.lineBetween(x - 3, y + 7, x + 3, y + 7);
      b.fillStyle(color, 0.85);
      b.fillCircle(x, y, 6);
      b.lineStyle(0.6, CM.brass, 0.8);
      b.strokeCircle(x, y, 6);
      b.lineStyle(0.7, CM.cream, 1);
      b.lineBetween(x - 2, y + 2, x - 1, y - 1);
      b.lineBetween(x - 1, y - 1, x + 1, y + 1);
      b.lineBetween(x + 1, y + 1, x + 2, y - 2);
      b.fillStyle(CM.cream, 0.8);
      b.fillEllipse(x - 2, y - 2, 2, 4);
  }
}

/** Deterministic pencil flecks restricted to a curved surface. */
function etchedEllipse(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, seed: number, count: number): void {
  let n = seed >>> 0;
  const random = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 0.94;
    const px = x + Math.cos(a) * rx * r;
    const py = y + Math.sin(a) * ry * r;
    g.fillStyle(i % 3 === 0 ? CM.cream : CM.copperDark, i % 3 === 0 ? 0.3 : 0.24);
    g.fillCircle(px, py, 0.35 + random() * 0.45);
    if (i % 4 === 0) {
      g.lineStyle(0.45, CM.inkSoft, 0.22);
      g.lineBetween(px, py, px + 1.2, py - 1.2);
    }
  }
}
