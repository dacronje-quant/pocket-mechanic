/**
 * The Test Run (GDD §6.5): the whole machine back on the workbench, a
 * countdown, and its big moment — the payoff of a Great Repair. The repair is
 * recorded here, so the Return story that follows already counts it.
 */
import * as sfx from '../audio/sfx';
import { setMusicProgress } from '../audio/music';
import { drawStage } from '../art/backgrounds';
import { Kip } from '../art/Kip';
import { MachineArt } from '../art/objects';
import { Portrait } from '../art/portraits';
import { repairById } from '../content/repairs';
import type { Step } from '../core/journey';
import { finishRepair, type FixReport } from '../core/progress';
import { persist, profile, settings } from '../core/save';
import { pm } from '../debug';
import { roundButton } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';
import { go } from './router';

/** The last repair's rewards, for the rewards scene that follows the Return. */
export let lastRepairReport: FixReport | null = null;

export class RevealScene extends MetaScene {
  private next!: Step;
  private done = false;

  constructor() {
    super('reveal');
  }

  protected build(data: Record<string, unknown>): void {
    this.done = false;
    this.next = (data.next as Step) ?? { scene: 'shop' };
    const r = repairById(Number(data.repair));
    const p = profile();
    lastRepairReport = finishRepair(p, r.id);
    persist();

    drawStage(this, 'shop').setDepth(0);
    this.bubble.setY(110);
    const calm = settings().calm;
    const machine = new MachineArt(this, 640, 460, r.object, 1.05).setDepth(10);
    const owner = new Portrait(this, 170, 340, r.owner, 0.8).setDepth(8);
    owner.setMood('worried');
    const nana = r.owner === 'nana' ? null : new Portrait(this, 1110, 340, 'nana', 0.8).setDepth(8);
    const kip = new Kip(this, 860, 560, p.look).setDepth(12).setScale(1.4);
    this.music(r.theme, 0.6);

    const stars = this.add.particles(0, 0, 'star', { lifespan: 1600, speed: { min: 100, max: 320 }, scale: { start: 1, end: 0 }, gravityY: 160, emitting: false }).setDepth(HUD - 5);
    const confetti = this.add
      .particles(0, 0, 'confetti', { x: { min: 0, max: 1280 }, y: -10, lifespan: 4200, speedY: { min: 90, max: 220 }, speedX: { min: -50, max: 50 }, rotate: { min: 0, max: 360 }, tint: [0xba8668, 0xf1d391, 0x83a49a, 0xa0a477, 0x92a393], emitting: false })
      .setDepth(HUD - 5);

    // countdown as three lamps (reading-free)
    const lamps = [0, 1, 2].map((i) => this.add.circle(580 + i * 60, 620, 18, 0x5a3a22).setStrokeStyle(4, 0xbca16a).setDepth(HUD - 2));
    this.time.delayedCall(500, () => this.line('reveal.go'));
    lamps.forEach((l, i) =>
      this.time.delayedCall(1500 + i * 700, () => {
        l.setFillStyle(0xf1d391);
        sfx.tick(1 + i * 0.2);
        kip.polish();
      }),
    );
    if (!calm) this.cameras.main.zoomTo(1.12, 2000, 'Sine.easeInOut');
    this.time.delayedCall(3700, () => {
      lamps.forEach((l) => l.destroy());
      machine.setWorking(true);
      const len = machine.perform();
      setMusicProgress(1);
      sfx.bigFanfare();
      owner.setMood('laugh');
      nana?.setMood('proud');
      kip.celebrate();
      stars.explode(calm ? 12 : 40, 640, 300);
      if (!calm) {
        confetti.explode(80);
        this.cameras.main.zoomTo(1, 900, 'Back.easeOut');
      }
      this.time.delayedCall((len + 2.5) * 1000, () => this.finish());
    });
    roundButton(this, 1180, 640, '▶', () => this.finish(), { r: 34, fontSize: 30, color: 0xa0a477, say: 'Next' }).setDepth(HUD);
    pm.next = () => this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    go(this, this.next);
  }
}
