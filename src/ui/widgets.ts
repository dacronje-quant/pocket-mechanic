import Phaser from 'phaser';
import { click } from '../audio/sfx';

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const SERIF = 'Georgia, "Times New Roman", serif';

/** Round brass button with a big touch area (GDD §12.2: generous targets). */
export function roundButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  icon: string,
  onTap: () => void,
  opts: { r?: number; fontSize?: number; label?: string } = {},
): Phaser.GameObjects.Container {
  const r = opts.r ?? 38;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (pressed: boolean) => {
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(2, pressed ? 2 : 5, r);
    g.fillStyle(0x7a5413, 1);
    g.fillCircle(0, pressed ? 2 : 0, r);
    g.fillStyle(pressed ? 0xc8923a : 0xe0ab48, 1);
    g.fillCircle(0, pressed ? 2 : 0, r - 4);
    g.fillStyle(0xfff0b8, 0.35);
    g.fillCircle(-r * 0.25, -r * 0.3 + (pressed ? 2 : 0), r * 0.5);
  };
  draw(false);
  const t = scene.add
    .text(0, opts.label ? -6 : 0, icon, { fontFamily: FONT, fontSize: `${opts.fontSize ?? 34}px`, color: '#3b260b' })
    .setOrigin(0.5);
  c.add([g, t]);
  if (opts.label) {
    c.add(scene.add.text(0, r * 0.45, opts.label, { fontFamily: FONT, fontSize: '13px', color: '#3b260b', fontStyle: 'bold' }).setOrigin(0.5));
  }
  c.setSize(r * 2 + 16, r * 2 + 16);
  c.setInteractive(new Phaser.Geom.Circle(r + 8, r + 8, r + 8), Phaser.Geom.Circle.Contains);
  c.on('pointerdown', () => {
    draw(true);
    t.y += 2;
  });
  const release = () => {
    draw(false);
    t.y = opts.label ? -6 : 0;
  };
  c.on('pointerout', release);
  c.on('pointerup', () => {
    release();
    click();
    onTap();
  });
  c.setData('icon', t);
  return c;
}

export function setButtonIcon(btn: Phaser.GameObjects.Container, icon: string): void {
  (btn.getData('icon') as Phaser.GameObjects.Text).setText(icon);
}

/** Nana's speech bubble (only used in Fixer/Engineer — Little Tinker stays reading-free). */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private text: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Graphics;
  private hideTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number) {
    super(scene, x, y);
    this.bg = scene.add.graphics();
    const face = scene.add.graphics();
    // tiny Nana portrait: silver bun, big spectacles
    face.fillStyle(0xe9e4dc, 1);
    face.fillCircle(0, -14, 12);
    face.fillStyle(0xf2c9a5, 1);
    face.fillCircle(0, 0, 18);
    face.lineStyle(3, 0x6b4a1c, 1);
    face.strokeCircle(-7, -1, 7);
    face.strokeCircle(7, -1, 7);
    face.fillStyle(0xffffff, 0.6);
    face.fillCircle(-7, -1, 6);
    face.fillCircle(7, -1, 6);
    face.fillStyle(0x2b1d14, 1);
    face.fillCircle(-7, -1, 2.5);
    face.fillCircle(7, -1, 2.5);
    face.setPosition(-width / 2 + 34, 0);
    this.text = scene.add
      .text(-width / 2 + 66, 0, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#2b1d14',
        wordWrap: { width: width - 90 },
      })
      .setOrigin(0, 0.5);
    this.add([this.bg, face, this.text]);
    this.setData('w', width);
    this.setAlpha(0);
    scene.add.existing(this);
  }

  say(msg: string, ms = 6000): void {
    const w = this.getData('w') as number;
    this.text.setText(msg);
    const h = Math.max(64, this.text.height + 28);
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.25);
    this.bg.fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 18);
    this.bg.fillStyle(0xfff6e2, 1);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    this.bg.lineStyle(3, 0xb88a2c, 1);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(0).setScale(0.9);
    this.scene.tweens.add({ targets: this, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.hideTimer?.remove();
    this.hideTimer = this.scene.time.delayedCall(ms, () => this.hide());
  }

  hide(): void {
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 250 });
  }
}
