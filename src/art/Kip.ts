import Phaser from 'phaser';

/**
 * Kip, the thumb-sized wind-up automaton (GDD §5), drawn from shapes so the
 * prototype needs no sprite sheet. Brass pocket-watch body, big winding key,
 * lens eyes with shutter lids, and a mood bulb on the antenna.
 */
export class Kip extends Phaser.GameObjects.Container {
  private key: Phaser.GameObjects.Graphics;
  private lids: Phaser.GameObjects.Graphics;
  private pupils: Phaser.GameObjects.Graphics;
  private bulb: Phaser.GameObjects.Arc;
  private torso: Phaser.GameObjects.Container;
  private legL: Phaser.GameObjects.Rectangle;
  private legR: Phaser.GameObjects.Rectangle;
  private walkTween?: Phaser.Tweens.Tween;
  private keySpeed = 0.6;
  private t = 0;
  private busy = false;
  readonly groundY: number;
  minX = 60;
  maxX = 1220;

  constructor(scene: Phaser.Scene, x: number, groundY: number) {
    super(scene, x, groundY);
    this.groundY = groundY;

    this.legL = scene.add.rectangle(-10, -8, 6, 18, 0x6b4a1c).setOrigin(0.5, 0);
    this.legR = scene.add.rectangle(10, -8, 6, 18, 0x6b4a1c).setOrigin(0.5, 0);
    const feet = scene.add.graphics();
    feet.fillStyle(0x3f2a10, 1);
    feet.fillEllipse(-11, 10, 14, 6);
    feet.fillEllipse(11, 10, 14, 6);

    this.torso = scene.add.container(0, -30);

    // winding key (behind body)
    this.key = scene.add.graphics();
    this.key.fillStyle(0xb88a2c, 1);
    this.key.fillRect(-3, -4, 6, 8);
    this.key.fillStyle(0xe7bb55, 1);
    this.key.fillEllipse(-11, 0, 16, 22);
    this.key.fillEllipse(11, 0, 16, 22);
    this.key.fillStyle(0x7a5413, 1);
    this.key.fillCircle(-11, 0, 4);
    this.key.fillCircle(11, 0, 4);
    this.key.setPosition(0, -30);

    const antenna = scene.add.graphics();
    antenna.lineStyle(3, 0x7a5413, 1);
    antenna.lineBetween(8, -22, 14, -40);
    this.bulb = scene.add.circle(14, -42, 6, 0xffe98a);

    const shell = scene.add.graphics();
    shell.fillStyle(0x6e4c16, 1);
    shell.fillCircle(0, 2, 27);
    shell.fillStyle(0xd9a441, 1);
    shell.fillCircle(0, 0, 25);
    shell.fillStyle(0xf6d27a, 0.55);
    shell.fillCircle(-6, -8, 15);
    shell.fillStyle(0xd9a441, 1);
    shell.fillCircle(-2, -3, 12);
    shell.lineStyle(2, 0x8a5f17, 1);
    shell.strokeCircle(0, 0, 25);
    // crown knob on top like a pocket watch
    shell.fillStyle(0xb88a2c, 1);
    shell.fillRect(-4, -31, 8, 7);
    // belly plate
    shell.fillStyle(0xb88a2c, 1);
    shell.fillRoundedRect(-9, 12, 18, 7, 3);

    const eyes = scene.add.graphics();
    eyes.fillStyle(0x3b2a12, 1);
    eyes.fillCircle(-9, -3, 9);
    eyes.fillCircle(9, -3, 9);
    eyes.fillStyle(0xeaf6ff, 1);
    eyes.fillCircle(-9, -3, 7);
    eyes.fillCircle(9, -3, 7);

    this.pupils = scene.add.graphics();
    this.drawPupils(0);

    this.lids = scene.add.graphics();

    // mitten hands
    const hands = scene.add.graphics();
    hands.fillStyle(0x8a5f17, 1);
    hands.fillCircle(-27, 8, 6);
    hands.fillCircle(27, 8, 6);

    this.torso.add([this.key, antenna, this.bulb, shell, eyes, this.pupils, this.lids, hands]);
    this.add([this.legL, this.legR, feet, this.torso]);
    this.setSize(70, 90);
    scene.add.existing(this);

    scene.time.addEvent({ delay: 3200, loop: true, callback: () => this.blink() });
  }

  private drawPupils(dx: number): void {
    this.pupils.clear();
    this.pupils.fillStyle(0x1b2a3a, 1);
    this.pupils.fillCircle(-9 + dx, -3, 3.4);
    this.pupils.fillCircle(9 + dx, -3, 3.4);
    this.pupils.fillStyle(0xffffff, 1);
    this.pupils.fillCircle(-10 + dx, -5, 1.2);
    this.pupils.fillCircle(8 + dx, -5, 1.2);
  }

  lookToward(x: number): void {
    const dx = Phaser.Math.Clamp((x - this.x) / 200, -1, 1) * 2.5;
    this.drawPupils(dx);
  }

  blink(): void {
    const lids = this.lids;
    let step = 0;
    const draw = (h: number) => {
      lids.clear();
      lids.fillStyle(0xb88a2c, 1);
      lids.fillRect(-17, -11, 16, h);
      lids.fillRect(1, -11, 16, h);
    };
    this.scene.time.addEvent({
      delay: 40,
      repeat: 5,
      callback: () => {
        step++;
        const h = [5, 12, 16, 12, 5, 0][step - 1] ?? 0;
        if (h === 0) lids.clear();
        else draw(h);
      },
    });
  }

  /** Point of the magnet hand, in world coordinates. */
  handPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x + 27 * this.scaleX, this.y - 22);
  }

  walkTo(x: number): void {
    if (this.busy) return;
    const tx = Phaser.Math.Clamp(x, this.minX, this.maxX);
    if (Math.abs(tx - this.x) < 8) return;
    this.walkTween?.stop();
    this.setScale(tx < this.x ? -1 : 1, 1);
    this.keySpeed = 3;
    this.walkTween = this.scene.tweens.add({
      targets: this,
      x: tx,
      duration: Math.min(1400, Math.abs(tx - this.x) * 2.6),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.keySpeed = 0.6;
      },
    });
  }

  /** Happy hop + spin (the "Wind-Up Wiggle"). */
  celebrate(): void {
    this.busy = true;
    this.walkTween?.stop();
    this.keySpeed = 8;
    this.bulb.setFillStyle(0xfff6c2);
    this.scene.tweens.add({ targets: this.bulb, scale: 1.8, yoyo: true, duration: 180, repeat: 3 });
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

  /** A little shrug when a part refuses to fit. */
  shrug(): void {
    this.scene.tweens.add({ targets: this.torso, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => this.torso.setAngle(0) });
  }

  /** Point the whole body at something (hint). */
  point(x: number): void {
    this.walkTo(x - 120);
    this.scene.tweens.add({ targets: this.torso, angle: x > this.x ? 18 : -18, duration: 200, yoyo: true, hold: 600 });
  }

  preUpdate(_time: number, delta: number): void {
    this.t += delta / 1000;
    this.key.rotation += this.keySpeed * (delta / 1000) * 2;
    this.key.scaleX = Math.cos(this.t * this.keySpeed * 2);
    const walking = this.walkTween?.isPlaying() ?? false;
    const swing = walking ? Math.sin(this.t * 18) * 0.5 : 0;
    this.legL.rotation = swing;
    this.legR.rotation = -swing;
    if (!this.busy) this.torso.y = -30 + (walking ? Math.abs(Math.sin(this.t * 18)) * -4 : Math.sin(this.t * 2.2) * 1.5);
    this.bulb.setAlpha(0.75 + Math.sin(this.t * 3) * 0.25);
  }
}
