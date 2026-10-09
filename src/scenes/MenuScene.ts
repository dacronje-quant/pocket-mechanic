import Phaser from 'phaser';
import { unlockAudio, chirp } from '../audio/sfx';
import { ensureBasics, ensureGearTexture } from '../art/textures';
import { Kip } from '../art/Kip';
import { PLAY_STYLES, PlayStyleId, game, save } from '../state';
import { FONT, SERIF } from '../ui/widgets';
import { goFullscreen } from '../platform';

/** Title screen + Play Style picker (tools, not ages — GDD §12.1). */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    const { width: W, height: H } = this.scale;
    ensureBasics(this);
    this.cameras.main.setBackgroundColor('#2b1d14');

    // warm workshop wall
    const bg = this.add.graphics();
    for (let i = 0; i < 16; i++) {
      bg.fillStyle(i % 2 ? 0x3d2819 : 0x412b1b, 1);
      bg.fillRect(i * 80, 0, 80, H);
    }
    bg.fillStyle(0x1a110a, 0.5);
    bg.fillRect(0, H - 90, W, 90);

    // slowly turning background gears
    const deco: Array<[number, number, number, number]> = [
      [120, 140, 32, 0.15],
      [215, 245, 18, -0.27],
      [1160, 600, 36, 0.12],
      [1050, 690, 20, -0.22],
    ];
    for (const [x, y, teeth, w] of deco) {
      const img = this.add.image(x, y, ensureGearTexture(this, teeth, 'brass')).setAlpha(0.35);
      this.events.on('update', (_: number, dt: number) => (img.rotation += (w * dt) / 1000));
    }

    this.add
      .text(W / 2, 120, 'Pocket Mechanic', {
        fontFamily: SERIF,
        fontSize: '84px',
        color: '#ffd76a',
        fontStyle: 'bold',
        stroke: '#2b1d14',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setShadow(0, 6, '#000000', 8, true, true);
    this.add
      .text(W / 2, 192, 'The Clockwork Repair Shop  ·  prototype: Room 1.2, The Gear Gallery', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#f3dcb0',
      })
      .setOrigin(0.5);

    const ids: PlayStyleId[] = ['tinker', 'fixer', 'engineer'];
    ids.forEach((id, i) => this.card(W / 2 + (i - 1) * 340, 420, id));

    const kip = new Kip(this, 160, H - 40);
    kip.minX = 80;
    kip.maxX = W - 80;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      unlockAudio();
      kip.lookToward(p.worldX);
    });
    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => kip.walkTo(Phaser.Math.Between(120, W - 120)),
    });
    this.add
      .text(W - 16, H - 14, 'v0.1', { fontFamily: FONT, fontSize: '16px', color: '#8a6a4a' })
      .setOrigin(1, 1);
  }

  private card(x: number, y: number, id: PlayStyleId): void {
    const s = PLAY_STYLES[id];
    const selected = game.data.style === id;
    const w = 300;
    const h = 250;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 8, w, h, 24);
    g.fillStyle(0x7a5413, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
    g.fillStyle(0xf3e2bd, 1);
    g.fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 18);
    if (selected) {
      g.lineStyle(6, 0xffc928, 1);
      g.strokeRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 28);
    }
    c.add(g);
    c.add(this.add.text(0, -58, s.icon, { fontFamily: FONT, fontSize: '86px' }).setOrigin(0.5));
    c.add(
      this.add
        .text(0, 30, s.name, { fontFamily: SERIF, fontSize: '36px', color: '#3b260b', fontStyle: 'bold' })
        .setOrigin(0.5),
    );
    c.add(
      this.add
        .text(0, 78, s.tagline, { fontFamily: FONT, fontSize: '20px', color: '#5e3f10', align: 'center', wordWrap: { width: w - 40 } })
        .setOrigin(0.5),
    );
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => this.tweens.add({ targets: c, scale: 0.95, duration: 80 }));
    c.on('pointerout', () => c.setScale(1));
    c.on('pointerup', () => {
      unlockAudio();
      chirp();
      goFullscreen(this);
      game.data.style = id;
      save(game.data);
      this.cameras.main.fadeOut(250, 26, 18, 12);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('gear-gallery'));
    });
    // idle bob
    this.tweens.add({ targets: c, y: y - 6, duration: 1400 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
