/**
 * The Tick-Tock Festival (GDD §4, Act III): every fixed machine working in
 * the town square, everyone Kip helped dancing, Magnus's new nest on show,
 * gentle fireworks, then the credits as a parade of portraits.
 */
import * as sfx from '../audio/sfx';
import { drawStage } from '../art/backgrounds';
import { paintedBackdrop } from '../art/generated';
import { Kip } from '../art/Kip';
import { MachineArt } from '../art/objects';
import { badge } from '../art/portraits';
import { REPAIRS } from '../content/repairs';
import type { CharId, NestDeco } from '../content/types';
import type { Step } from '../core/journey';
import { checkStamps, setFlag } from '../core/progress';
import { persist, profile, settings } from '../core/save';
import { pm } from '../debug';
import { drawDeco } from '../rooms/SimpleRooms';
import { FONT, roundButton, SERIF, showWords } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';
import { go } from './router';

const PARADE: CharId[] = ['albert', 'rosa', 'theo', 'ada', 'marigold', 'pepperwhistle', 'pockets', 'juniper', 'magnus', 'nana', 'coo', 'clementine', 'bertie', 'steamington', 'whisker', 'pudding'];

const CREDITS = [
  'Pocket Mechanic',
  'The Clockwork Repair Shop',
  '',
  'Thank you for fixing Brasswick!',
  '',
  'Every machine in this game works like a real one.',
  'Look around your home: gears, levers, springs and pendulums are everywhere.',
  '(Ask a grown-up before opening anything!)',
  '',
  'Made with care for curious fixers aged 4 to 10.',
  'No ads. No purchases. No internet needed.',
  '',
  'The Attic is open now…',
];

export class FestivalScene extends MetaScene {
  private next!: Step;
  private done = false;

  constructor() {
    super('festival');
  }

  protected build(data: Record<string, unknown>): void {
    this.done = false;
    this.next = (data.next as Step) ?? { scene: 'shop' };
    const p = profile();
    setFlag(p, 'festival');
    checkStamps(p);
    persist();
    const calm = settings().calm;

    drawStage(this, 'festival').setDepth(0);
    this.bubble.setY(120);
    paintedBackdrop(this, 'stage-festival', 1);
    this.music('festival');
    this.bunting();

    // every repaired machine, working, in an arc
    REPAIRS.forEach((r, i) => {
      const a = Math.PI * (0.12 + (i / 7) * 0.76);
      const x = 640 - Math.cos(a) * 520;
      const y = 380 - Math.sin(a) * 150;
      const m = new MachineArt(this, x, y, r.object, 0.3).setDepth(5).setWorking(true);
      this.time.delayedCall(800 + i * 700, () => m.perform());
    });
    if (p.nest) this.nest(640, 400);

    // everyone dances along the bottom
    PARADE.forEach((who, i) => {
      const b = badge(this, 80 + i * 75, 600, who, 30).setDepth(10);
      this.tweens.add({ targets: b, y: 584, duration: 300 + (i % 3) * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 50 });
    });
    const kip = new Kip(this, 860, 556, p.look).setDepth(12).setScale(1.3);
    this.time.addEvent({ delay: 1800, loop: true, callback: () => kip.active && kip.celebrate() });

    // fireworks: soft, slow bursts (fewer in Calm Visuals, never flashing)
    const fw = this.add.particles(0, 0, 'star', { lifespan: 1500, speed: { min: 60, max: 220 }, scale: { start: 0.8, end: 0 }, gravityY: 90, tint: [0xff6b6b, 0xffd43b, 0x74c0fc, 0x8ce99a, 0xb197fc], emitting: false }).setDepth(3);
    this.time.addEvent({
      delay: calm ? 2400 : 900,
      loop: true,
      callback: () => {
        fw.explode(calm ? 10 : 26, 200 + Math.random() * 880, 80 + Math.random() * 140);
        sfx.pop();
      },
    });
    this.time.delayedCall(600, () => this.line('festival.hello'));
    this.time.delayedCall(9000, () => this.credits());
    roundButton(this, 1180, 640, '▶', () => this.finish(), { r: 40, fontSize: 36, color: 0x8ce99a, say: 'Next' }).setDepth(HUD);
    pm.next = () => this.finish();
  }

  private bunting(): void {
    const g = this.add.graphics().setDepth(2);
    const cols = [0xff6b6b, 0xffd43b, 0x74c0fc, 0x8ce99a, 0xb197fc];
    g.lineStyle(2, 0x5a3a22, 1);
    g.lineBetween(0, 40, 1280, 40);
    for (let i = 0; i < 32; i++) {
      g.fillStyle(cols[i % cols.length], 1);
      g.fillTriangle(i * 40, 40, i * 40 + 34, 40, i * 40 + 17, 74);
    }
  }

  private nest(x: number, y: number): void {
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x5a3a22, 1);
    g.fillEllipse(x, y + 30, 240, 70);
    Object.values(profile().nest ?? {}).forEach((deco, i, all) => {
      const a = Math.PI + (i / Math.max(1, all.length - 1)) * Math.PI;
      drawDeco(g, deco as NestDeco, x + Math.cos(a) * 95, y + 22 + Math.sin(a) * 34);
    });
  }

  private credits(): void {
    if (this.done) return;
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x1a120c, 0).setOrigin(0).setDepth(HUD - 10);
    this.tweens.add({ targets: shade, fillAlpha: 0.55, duration: 800 });
    if (showWords()) {
      const text = this.add
        .text(640, 760, CREDITS.join('\n'), { fontFamily: SERIF, fontSize: '30px', color: '#fff3d0', align: 'center', lineSpacing: 10, stroke: '#2b1d14', strokeThickness: 5 })
        .setOrigin(0.5, 0)
        .setDepth(HUD - 9);
      this.tweens.add({ targets: text, y: -text.height - 40, duration: 26000, ease: 'Linear', onComplete: () => this.finish() });
    } else {
      // reading-free credits: everyone waves goodbye, one by one
      PARADE.forEach((who, i) => {
        const b = badge(this, 1360, 330, who, 70).setDepth(HUD - 9);
        this.tweens.add({ targets: b, x: -120, duration: 5200, delay: i * 1300, ease: 'Linear', onComplete: () => b.destroy() });
      });
      this.time.delayedCall(PARADE.length * 1300 + 5500, () => this.finish());
    }
    if (showWords()) this.add.text(640, 690, 'tap ▶ to go home', { fontFamily: FONT, fontSize: '18px', color: '#fff3d0' }).setOrigin(0.5).setDepth(HUD);
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    go(this, this.next);
  }
}

