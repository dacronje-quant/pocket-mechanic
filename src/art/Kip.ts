import Phaser from 'phaser';
import { cosmeticById, DEFAULT_LOOK, type KipLook } from '../content/cosmetics';

/**
 * Kip, the thumb-sized wind-up automaton (GDD §5), drawn from shapes and
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
  private pupilDx = 0;
  private look: KipLook;
  private trailTimer = 0;
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
    this.keyG = scene.add.graphics().setPosition(0, -30);
    this.bulb = scene.add.graphics();
    this.shell = scene.add.graphics();
    this.eyesG = scene.add.graphics();
    this.pupils = scene.add.graphics();
    this.lids = scene.add.graphics();
    this.hatG = scene.add.graphics();
    this.plateText = scene.add.text(0, 16, '', { fontFamily: 'Georgia, serif', fontSize: '9px', color: '#3b260b', fontStyle: 'bold' }).setOrigin(0.5);
    const hands = scene.add.graphics();
    hands.fillStyle(0x8a5f17, 1);
    hands.fillCircle(-27, 8, 6);
    hands.fillCircle(27, 8, 6);
    this.torso.add([this.keyG, this.bulb, this.shell, this.plateText, this.eyesG, this.pupils, this.lids, this.hatG, hands]);
    this.add([this.legL, this.legR, this.torso]);
    this.setSize(70, 90);
    scene.add.existing(this);
    this.redraw();
    scene.time.addEvent({ delay: 3200 + Math.random() * 800, loop: true, callback: () => this.blink() });
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
    const face = fin?.color ?? (this.variant === 'tess' ? 0xc8703f : 0xd9a441);
    const dark = fin?.color2 ?? 0x8a5f17;
    const light = Phaser.Display.Color.ValueToColor(face).lighten(25).color;

    // legs & feet
    for (const leg of [this.legL, this.legR]) {
      leg.clear();
      leg.fillStyle(0x6b4a1c, 1);
      leg.fillRect(-3, 0, 6, 18);
      const f = L.feet;
      if (f === 'feet-wheels') {
        leg.fillStyle(0x2b2b33, 1);
        leg.fillCircle(0, 19, 6);
        leg.fillStyle(0xc9d1d9, 1);
        leg.fillCircle(0, 19, 2.5);
      } else if (f === 'feet-clogs') {
        leg.fillStyle(0xc49a6c, 1);
        leg.fillRoundedRect(-8, 14, 16, 8, 4);
      } else if (f === 'feet-rocket') {
        leg.fillStyle(0xe03131, 1);
        leg.fillRoundedRect(-7, 12, 14, 10, 3);
        leg.fillStyle(0xffd43b, 1);
        leg.fillTriangle(-4, 22, 4, 22, 0, 28);
      } else {
        leg.lineStyle(2, 0xc0c8d0, 1);
        for (let i = 0; i < 3; i++) leg.strokeEllipse(0, 8 + i * 4, 9, 3);
        leg.fillStyle(0x3f2a10, 1);
        leg.fillEllipse(-1, 19, 14, 6);
      }
    }

    // winding key
    const k = this.keyG;
    k.clear();
    const kc = this.col(L.key, 0xe7bb55);
    k.fillStyle(0xb88a2c, 1);
    k.fillRect(-3, -4, 6, 10);
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
          k.fillEllipse(-11, 0, 16, 22);
          k.fillEllipse(11, 0, 16, 22);
          k.fillStyle(0x7a5413, 1);
          k.fillCircle(-11, 0, 4);
          k.fillCircle(11, 0, 4);
        }
    }

    // antenna + bulb / topper
    const b = this.bulb;
    b.clear();
    b.lineStyle(3, 0x7a5413, 1);
    if (this.variant === 'tess') {
      b.lineBetween(-8, -22, -8, -44);
      b.lineBetween(-8, -44, 2, -44);
      b.fillStyle(0x7a5413, 1);
      b.fillRect(0, -49, 8, 10);
      b.fillStyle(0xbfe3f5, 1);
      b.fillRect(6, -47, 3, 6);
    } else {
      b.lineBetween(8, -22, 14, -40);
    }
    const bx = this.variant === 'tess' ? -8 : 14;
    const by = this.variant === 'tess' ? -52 : -42;
    const bc = this.col(L.bulb, 0xffe98a);
    drawTopper(b, L.bulb, bx, by, bc);

    // shell
    const s = this.shell;
    s.clear();
    s.fillStyle(dark, 1);
    s.fillCircle(0, 2, 27);
    s.fillStyle(face, 1);
    s.fillCircle(0, 0, 25);
    if (L.finish === 'finish-candy') {
      s.fillStyle(0xffffff, 0.8);
      for (let i = -3; i <= 3; i++) s.fillRect(i * 8 - 2, -24, 4, 48);
      s.fillStyle(face, 0);
    }
    s.fillStyle(light, 0.55);
    s.fillCircle(-6, -8, 15);
    s.fillStyle(face, 1);
    s.fillCircle(-2, -3, 12);
    s.lineStyle(2, dark, 1);
    s.strokeCircle(0, 0, 25);
    s.fillStyle(dark, 1);
    s.fillRect(-4, -31, 8, 7);
    if (this.variant === 'tess') {
      // skirt-like gear rim
      s.fillStyle(dark, 1);
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7;
        s.fillCircle(Math.cos(a) * 26, Math.sin(a) * 26, 3.5);
      }
    }
    this.drawPlate(s, L, dark);

    // eyes
    const e = this.eyesG;
    e.clear();
    const glass = this.col(L.eyes, 0xeaf6ff);
    e.fillStyle(0x3b2a12, 1);
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
      const r2 = L.eyes === 'eyes-monocle' ? 11 : 9;
      e.fillCircle(-9, -3, 9);
      e.fillCircle(9, -3, r2);
      e.fillStyle(glass, 1);
      e.fillCircle(-9, -3, 7);
      e.fillCircle(9, -3, r2 - 2);
      if (L.eyes === 'eyes-monocle') {
        e.lineStyle(1.5, 0xffd700, 1);
        e.strokeCircle(9, -3, r2);
        e.lineBetween(18, 0, 22, 18);
      }
    }
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
    if (!trail || trail === 'trail-none') return;
    const key = trail === 'trail-notes' ? 'note' : trail === 'trail-gears' ? 'minigear' : trail === 'trail-steam' ? 'puff' : trail === 'trail-stars' ? 'star' : 'spark';
    if (!this.scene.textures.exists(key)) return;
    this.trail = this.scene.add.particles(0, 0, key, {
      lifespan: 900,
      speedY: { min: -40, max: -10 },
      speedX: { min: -20, max: 20 },
      scale: { start: key === 'puff' ? 0.8 : 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    this.trail.setDepth((this.depth || 0) - 1);
  }

  private drawPupils(): void {
    const dx = this.pupilDx;
    this.pupils.clear();
    this.pupils.fillStyle(0x1b2a3a, 1);
    this.pupils.fillCircle(-9 + dx, -3, 3.4);
    this.pupils.fillCircle(9 + dx, -3, 3.4);
    this.pupils.fillStyle(0xffffff, 1);
    this.pupils.fillCircle(-10 + dx, -5, 1.2);
    this.pupils.fillCircle(8 + dx, -5, 1.2);
  }

  lookToward(x: number): void {
    this.pupilDx = Phaser.Math.Clamp((x - this.x) / 200, -1, 1) * 2.5 * (this.scaleX < 0 ? -1 : 1);
    this.drawPupils();
  }

  blink(): void {
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
    this.scene.tweens.add({ targets: this.torso, angle: { from: -6, to: 6 }, duration: 120, yoyo: true, repeat: 3, onComplete: () => this.torso.setAngle(0) });
  }

  /** A little shrug when a part refuses to fit. */
  shrug(): void {
    this.scene.tweens.add({ targets: this.torso, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => this.torso.setAngle(0) });
  }

  /** Giggles: rapid little shakes. */
  giggle(): void {
    this.scene.tweens.add({ targets: this.torso, y: -34, duration: 50, yoyo: true, repeat: 6 });
  }

  /** Peek: the lens-eyes push forward like binoculars. */
  peek(): void {
    this.scene.tweens.add({ targets: [this.eyesG, this.pupils], scale: 1.3, duration: 160, yoyo: true, hold: 300 });
  }

  /** Point the whole body at something (hint). */
  point(x: number): void {
    this.walkTo(x - 120 * Math.sign(x - this.x || 1));
    this.scene.tweens.add({ targets: this.torso, angle: x > this.x ? 18 : -18, duration: 200, yoyo: true, hold: 600 });
  }

  /** Tick-Tock Nap: sit and snooze. */
  nap(on: boolean): void {
    this.busy = on;
    this.scene.tweens.add({ targets: this.torso, y: on ? -20 : -30, angle: on ? -8 : 0, duration: 400 });
    this.keySpeed = on ? 0.2 : 0.6;
  }

  preUpdate(_time: number, delta: number): void {
    this.t += delta / 1000;
    this.keyG.rotation += this.keySpeed * (delta / 1000) * 2;
    this.keyG.scaleX = Math.cos(this.t * this.keySpeed * 2);
    const walking = this.walkTween?.isPlaying() ?? false;
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
      b.fillCircle(x, y, 6);
      b.fillStyle(0xffffff, 0.7);
      b.fillCircle(x - 2, y - 2, 2);
  }
}
