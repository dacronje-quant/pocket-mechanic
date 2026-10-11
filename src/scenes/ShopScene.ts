/**
 * Odette's Tick & Tinker — the hub (GDD §13.1). Everything is a thing in the
 * shop you can touch: the door and Job Board start repairs, the shelf,
 * drawers, nook, paint station, window, bench and attic open as the story
 * unlocks them. Locked things show a padlock and the repair that opens them.
 * Closing Time and Wind-Down Mode live here too (GDD §26.2).
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { Kip } from '../art/Kip';
import { coverImage, withArt } from '../art/generated';
import { CM, drawPatina } from '../art/copperMoss';
import { mulberry32 } from '../mechanism/rng';
import { drawSmallObject, MachineArt } from '../art/objects';
import { etchedPlate } from '../art/finish';
import { badge, Portrait } from '../art/portraits';
import {
  drawBasket,
  drawClosedSign,
  drawCorkBoard,
  drawDoor,
  drawDrawers,
  drawHatch,
  drawNookHome,
  drawPadlock,
  drawPaintStation,
  drawShelfBoards,
  drawShopWall,
  drawWindow,
  drawWorkbench,
} from '../art/shop';
import { REPAIRS } from '../content/repairs';
import type { RepairDef } from '../content/types';
import { atticStep, resumeStory, startRepair, type Step } from '../core/journey';
import { areaOpen, nextRepairs, nookLevel, repairDone, repairStarted, roomFixed, setFlag, tessUnlocked, visited, type Area } from '../core/progress';
import { persist, profile } from '../core/save';
import { closingDue, markClosed, reopen, shopClosed, windDownActive } from '../core/session';
import { FONT, parentalGate, roundButton, showWords } from '../ui/widgets';
import { HUD, MetaScene } from './MetaScene';
import { go, goScene } from './router';

/** Which repair opens each area (for the padlock picture). */
const UNLOCKED_BY: Partial<Record<Area, number>> = { shelf: 1, pedia: 1, nook: 1, paint: 2, window: 3, bench: 4, tess: 5, attic: 8 };

let greeted = false;

export class ShopScene extends MetaScene {
  private kip!: Kip;
  private busy = false;
  private doorC?: Phaser.GameObjects.Container;
  private paintedShop = false;
  private scenery: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super('shop');
  }

  protected build(): void {
    this.busy = false;
    this.doorC = undefined;
    this.paintedShop = false;
    this.scenery = [];
    const p = profile();
    const night = windDownActive() || shopClosed();

    // Closing Time: a gentle, story-driven stop at a natural point
    if (closingDue(false)) {
      markClosed();
      this.time.delayedCall(10, () => go(this, { scene: 'story', id: 'closing-time', next: { scene: 'shop' } }, true));
      return;
    }

    const wall = this.add.graphics().setDepth(0);
    drawShopWall(wall, night);
    withArt(this, 'shop-hub', (key) => {
      this.paintedShop = true;
      const picture = coverImage(this, key, 0, 0, 1280, 720).setDepth(0.01).setName('painted:shop-hub');
      if (night) picture.setTint(0x88928c);
      wall.setVisible(false);
      this.scenery.forEach((g) => g.active && g.setVisible(false));
    });
    this.music('shop', Math.min(1, p.repairs.length / 8 + 0.25));
    if (shopClosed()) return this.closed();
    const resume = resumeStory(p);
    if (resume && !windDownActive()) {
      this.time.delayedCall(10, () => go(this, resume, true));
      return;
    }

    this.door();
    this.jobBoard();
    this.shelf();
    this.musicBox();
    this.window();
    this.spot('paint', 950, 520, 120, 190, (g) => drawPaintStation(g), () => goScene(this, 'paint', { who: 'kip' }), 'paint');
    this.spot('pedia', 1130, 500, 220, 210, (g) => drawDrawers(g), () => goScene(this, 'pedia'), 'pedia');
    this.spot('nook', 330, 650, 150, 120, (g) => drawNookHome(g, nookLevel(p)), () => goScene(this, 'nook'), 'nook');
    this.spot('quick', 540, 655, 160, 110, (g) => drawBasket(g), () => go(this, { scene: 'quick' }), 'quick');
    if (tessUnlocked(p)) this.tessCorner();
    else this.spot('tess', 760, 660, 120, 100, (g) => this.drawCushion(g), () => undefined, 'tess');
    this.spot('attic', 640, 30, 170, 70, (g) => drawHatch(g, areaOpen(p, 'attic')), () => go(this, atticStep(p)), 'attic');

    // the workbench with the next job on it
    const bench = this.add.container(640, 540).setDepth(20);
    bench.add(this.add.graphics().setPosition(0, 0));
    drawWorkbench(bench.list[0] as Phaser.GameObjects.Graphics);
    this.scenery.push(bench.list[0] as Phaser.GameObjects.Graphics);
    const job = this.nextJob();
    if (job && !windDownActive()) {
      const obj = this.add.container(560, 427).setDepth(21);
      const g = this.add.graphics();
      drawSmallObject(g, job.object, 0, -20, 0.7);
      obj.add(g);
      obj.setSize(110, 110).setInteractive({ useHandCursor: true });
      obj.on('pointerup', () => this.startJob(job));
      this.tweens.add({ targets: obj, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.kip = new Kip(this, 758, 426, p.look).setDepth(30).setScale(1.4);
    this.kip.minX = 450;
    this.kip.maxX = 830;
    this.kip.setInteractive(new Phaser.Geom.Rectangle(-5, -45, 80, 100), Phaser.Geom.Rectangle.Contains);
    this.kip.on('pointerup', () => {
      sfx.beeps('hi', p.look.voice);
      this.kip.celebrate();
    });
    this.pets();

    // top bar: profile (Quick Swap), counters, grown-ups
    const me = this.add.container(60, 52).setDepth(HUD);
    me.add(badge(this, 0, 0, 'kip', 34));
    if (p.initials) me.add(this.add.text(0, 38, p.initials, { fontFamily: FONT, fontSize: '16px', color: '#fff3d0', fontStyle: 'bold', stroke: '#2b1d14', strokeThickness: 4 }).setOrigin(0.5));
    me.setSize(80, 80).setInteractive({ useHandCursor: true });
    me.on('pointerup', () => goScene(this, 'title'));
    this.counters(1140);
    roundButton(this, 1226, 52, '⚙', () => parentalGate(this, () => goScene(this, 'grownups', { back: 'shop' })), { r: 26, fontSize: 24, say: 'For grown-ups' }).setDepth(HUD);

    if (job && !windDownActive()) this.hot('job', () => this.startJob(job));
    this.hot('title', () => goScene(this, 'title'));
    this.welcome(job);
  }

  // ───────────────────────────── areas ─────────────────────────────

  private spot(name: string, x: number, y: number, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void, open: () => void, area: Area): Phaser.GameObjects.Container {
    const p = profile();
    const c = this.add.container(x, y).setDepth(10);
    const g = this.add.graphics();
    draw(g);
    c.add(g);
    // The painted shop supplies these static props. Homes and display objects still evolve live.
    if (area !== 'nook' && area !== 'bench') this.scenery.push(g);
    const unlocked = areaOpen(p, area);
    // Wind-Down (GDD §26.2): quiet things only — no new repairs, Tune-Ups, bench or attic
    const winddownLocked = windDownActive() && (area === 'shelf' || area === 'bench' || area === 'attic');
    if (!unlocked) {
      g.setAlpha(0.55);
      const lock = this.add.graphics();
      drawPadlock(lock, 0, 0, 1.2);
      const rep = UNLOCKED_BY[area];
      if (rep) {
        lock.fillStyle(0xfff6e2, 0.95);
        lock.fillCircle(30, -18, 22);
        drawSmallObject(lock, REPAIRS[rep - 1].object, 30, -18, 0.28);
      }
      c.add(lock);
    } else if (!visited(p, name) && area !== 'quick' && area !== 'door') {
      // newly opened: a soft glow until it's been visited
      const glow = this.add.image(0, 0, 'glow').setScale(Math.max(w, h) / 40).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
      c.addAt(glow, 0);
      this.tweens.add({ targets: glow, alpha: 0.1, duration: 900, yoyo: true, repeat: -1 });
    }
    if (winddownLocked && unlocked) g.setAlpha(0.7);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    const touchGlow = this.add.graphics();
    touchGlow.lineStyle(2, CM.brass, 0.75);
    touchGlow.strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 14);
    touchGlow.setAlpha(0);
    c.add(touchGlow);
    c.on('pointerover', () => touchGlow.setAlpha(0.6));
    c.on('pointerout', () => touchGlow.setAlpha(0));
    const tap = () => {
      if (this.busy) return;
      this.tweens.add({ targets: c, scale: 1.08, duration: 90, yoyo: true });
      if (!unlocked) {
        sfx.nuhUh();
        this.tweens.add({ targets: c, angle: { from: -3, to: 3 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => c.setAngle(0) });
        this.line('shop.locked');
        return;
      }
      if (winddownLocked) {
        this.line('shop.winddown');
        return;
      }
      sfx.click();
      if (!visited(p, name)) {
        p.flags.push(`visit:${name}`);
        persist();
      }
      this.busy = true;
      this.kip?.point(x);
      this.time.delayedCall(220, () => {
        this.busy = false;
        open();
      });
    };
    c.on('pointerup', tap);
    this.hot(name, tap);
    if (unlocked && !winddownLocked) this.hot(`${name}:open`, tap); // lets the touch playthrough tell locked from broken
    return c;
  }

  private door(): void {
    const c = this.add.container(118, 400).setDepth(10);
    const g = this.add.graphics();
    drawDoor(g, false);
    this.scenery.push(g);
    c.add(g);
    c.setSize(170, 400).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      const job = this.nextJob();
      if (job && !windDownActive()) this.startJob(job);
      else this.line(windDownActive() ? 'shop.winddown' : 'shop.done');
    });
    c.setData('g', g);
    this.doorC = c;
  }

  private ringDoor(): void {
    const c = this.doorC;
    if (!c?.active) return;
    const g = c.getData('g') as Phaser.GameObjects.Graphics;
    sfx.dingDong();
    g.clear();
    if (this.paintedShop) {
      g.setVisible(true).lineStyle(2.5, CM.brass, 0.85);
      for (const r of [21, 31]) {
        g.beginPath();
        g.arc(0, -212, r, -2.6, -0.5);
        g.strokePath();
      }
    } else drawDoor(g, true);
    this.tweens.add({ targets: c, angle: { from: -1.2, to: 1.2 }, duration: 80, yoyo: true, repeat: 5, onComplete: () => c.setAngle(0) });
    this.time.delayedCall(1400, () => {
      if (!g.active) return;
      g.clear();
      if (this.paintedShop) g.setVisible(false);
      else drawDoor(g, false);
    });
  }

  /** Up to three open repairs, each a card with the customer and their object. */
  private jobBoard(): void {
    const p = profile();
    const c = this.add.container(305, 230).setDepth(10);
    const g = this.add.graphics();
    drawCorkBoard(g, 200, 230);
    this.scenery.push(g);
    c.add(g);
    const jobs = nextRepairs(p).slice(0, 3);
    if (!jobs.length) {
      const st = this.add.graphics();
      for (let i = 0; i < 5; i++) {
        st.fillStyle(0xffd43b, 1);
        st.fillCircle(-60 + i * 30, -10 + (i % 2) * 20, 8);
      }
      c.add(st);
    }
    jobs.forEach((r, i) => {
      const cy = -72 + i * 72;
      const cardC = this.add.container(0, cy);
      const cg = this.add.graphics();
      cg.fillStyle(0x000000, 0.2);
      cg.fillRoundedRect(-82, -28, 168, 62, 8);
      cg.fillStyle(CM.paper, 1);
      cg.fillRoundedRect(-84, -31, 168, 62, 8);
      cg.fillStyle(CM.copper, 1);
      cg.fillCircle(0, -28, 5);
      drawSmallObject(cg, r.object, 46, 0, 0.42);
      cardC.add(cg);
      cardC.add(badge(this, -50, 0, r.owner, 24));
      // progress dots
      const done = r.rooms.filter((id) => roomFixed(p, id)).length;
      if (repairStarted(p, r)) {
        const dots = this.add.graphics();
        for (let k = 0; k < r.rooms.length; k++) {
          dots.fillStyle(k < done ? 0x2e9b5f : 0xcfc2a5, 1);
          dots.fillCircle(-14 + k * 9, 22, 3.2);
        }
        cardC.add(dots);
      }
      if (windDownActive()) cardC.setAlpha(0.45);
      cardC.setSize(168, 62).setInteractive({ useHandCursor: true });
      cardC.on('pointerup', () => (windDownActive() ? this.line('shop.winddown') : this.startJob(r)));
      c.add(cardC);
      this.hot(`job${r.id}`, () => this.startJob(r));
    });
  }

  private shelf(): void {
    const p = profile();
    let boards!: Phaser.GameObjects.Graphics;
    const c = this.spot('shelf', 650, 160, 420, 160, (g) => {
      boards = g;
      drawShelfBoards(g, 420);
    }, () => go(this, { scene: 'shelf' }), 'shelf');
    // Repairs change the display. Keep them above either kind of static shelf,
    // and below the spot's lock and touch outline.
    const objects = this.add.graphics().setName('live:repaired-objects').setAlpha(boards.alpha);
    REPAIRS.forEach((r, i) => {
      const x = -150 + (i % 4) * 100;
      const y = i < 4 ? -50 : 50;
      if (repairDone(p, r.id)) drawSmallObject(objects, r.object, x, y - 26, 0.42);
      else {
        objects.lineStyle(1.5, CM.cream, 0.25);
        objects.strokeRoundedRect(x - 26, y - 50, 52, 46, 8);
      }
    });
    c.addAt(objects, c.list.indexOf(boards) + 1);
  }

  private musicBox(): void {
    const c = this.spot('bench', 650, 365, 300, 150, (g) => {
      etchedPlate(g, -150, -75, 300, 150, CM.tealDark, 1, 551);
      g.lineStyle(1, CM.brass, .7);
      for (let row = 0; row < 5; row++) g.lineBetween(23, -30 + row * 11, 127, -30 + row * 11);
      for (const [x, y] of [[39, 4], [67, -7], [99, -19]]) {
        g.fillStyle(CM.cream).fillEllipse(x, y, 11, 8);
        g.lineStyle(2, CM.cream).lineBetween(x + 5, y, x + 5, y - 25);
      }
    }, () => goScene(this, 'bench'), 'bench').setName('shop:musicbox');
    c.addAt(new MachineArt(this, -71, 49, 'musicbox', .4).setAlpha(areaOpen(profile(), 'bench') ? 1 : .55), 1);
    if (showWords()) c.add(this.add.text(75, 51, 'Music Box', { fontFamily: FONT, fontSize: '18px', color: '#f4ebd5' }).setOrigin(.5));
  }

  private window(): void {
    const p = profile();
    const night = windDownActive();
    let frame!: Phaser.GameObjects.Graphics;
    const c = this.spot('window', 1060, 220, 360, 300, (g) => {
      frame = g;
      drawWindow(g, night, 0);
    }, () => goScene(this, 'town'), 'window');
    // The painted window frame remains static; Brasswick lights up as repairs
    // are returned, just as it does in the procedural shop.
    const town = this.add.graphics().setName('live:window-town').setAlpha(frame.alpha);
    this.drawWindowTown(town, night, p.repairs.length);
    c.addAt(town, c.list.indexOf(frame) + 1);
    withArt(this, 'shop-hub', () => {
      if (!town.active) return;
      // Preserve the painted seaside view. Returned repairs light its windows.
      town.clear().setAlpha(1);
      for (let i = 0; i < Math.min(8, p.repairs.length); i++) {
        const x = -127 + i * 32;
        const y = 38 + (i % 3) * 17;
        town.fillStyle(CM.glow, 0.18).fillCircle(x, y, 11);
        town.fillStyle(CM.glow, 0.75).fillRect(x - 2, y - 3, 4, 6);
      }
    });
  }

  private drawWindowTown(g: Phaser.GameObjects.Graphics, night: boolean, repaired: number): void {
    g.fillGradientStyle(night ? CM.tealDark : CM.sky, night ? CM.tealDark : CM.sky, night ? CM.slate : CM.paper, night ? CM.slate : CM.paper, 1);
    g.fillRect(-156, -116, 312, 232);
    g.fillStyle(CM.paper, night ? 0.05 : 0.32);
    g.fillEllipse(-50, -54, 180, 27);
    g.fillEllipse(65, -78, 110, 25);
    const rng = mulberry32(11);
    for (let i = 0; i < 7; i++) {
      const x = -150 + i * 44;
      const h = 40 + rng() * 60;
      g.fillStyle(night ? CM.slate : [CM.paperDark, CM.sky, CM.copperLight, CM.mossLight][i % 4], 1);
      g.fillRect(x, 116 - h, 38, h);
      g.fillStyle(night ? CM.tealDark : [CM.copperDark, CM.teal, CM.woodDark, CM.mossDark][i % 4], 1);
      g.fillTriangle(x - 4, 116 - h, x + 19, 116 - h - 22, x + 42, 116 - h);
      g.lineStyle(0.7, CM.ink, 0.55);
      g.lineBetween(x - 4, 116 - h, x + 19, 116 - h - 22);
      g.lineBetween(x + 19, 116 - h - 22, x + 42, 116 - h);
      drawPatina(g, x + 1, 117 - h, 36, h - 2, i + 210, 0.7);
      g.fillStyle(i < repaired ? CM.glow : CM.tealDark, 0.85);
      g.fillRect(x + 12, 116 - h + 14, 12, 12);
      g.lineStyle(0.6, CM.woodDark, 0.9);
      g.lineBetween(x + 18, 116 - h + 14, x + 18, 116 - h + 26);
      g.lineBetween(x + 12, 116 - h + 20, x + 24, 116 - h + 20);
    }
    g.fillStyle(CM.slate, 1);
    g.fillRect(90, -100, 40, 216);
    g.fillStyle(CM.tealDark, 1);
    g.fillTriangle(85, -100, 110, -115, 135, -100);
    g.fillStyle(CM.paper, 1);
    g.fillCircle(110, -70, 14);
    g.lineStyle(1, CM.inkSoft, 0.8);
    g.lineBetween(110, -70, 110, -78);
    g.lineBetween(110, -70, 116, -67);
    drawPatina(g, 91, -99, 38, 213, 313, 0.7);
    // These narrow mullions belong to the live viewport. The painted frame,
    // sill, cushion and ivy outside its glass stay visible around it.
    g.fillStyle(CM.wood, 1);
    g.fillRect(-156, -6, 312, 10);
    g.fillRect(-5, -116, 10, 232);
  }

  private drawCushion(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(CM.mossDark, 1);
    g.fillRoundedRect(-56, 6, 112, 34, 14);
    g.fillStyle(CM.mossLight, 1);
    g.fillRoundedRect(-50, 0, 100, 24, 12);
  }

  private tessCorner(): void {
    const p = profile();
    const c = this.spot('tess', 780, 660, 130, 110, (g) => this.drawCushion(g), () => goScene(this, 'paint', { who: 'tess' }), 'tess');
    const tess = new Kip(this, -10, 10, p.tessLook, 'tess').setScale(0.9);
    c.add(tess);
    this.time.addEvent({ delay: 5200, loop: true, callback: () => tess.active && tess.blink() });
  }

  /** Pudding naps on the window seat; Whisker scurries along the skirting board. */
  private pets(): void {
    const p = profile();
    const pud = new Portrait(this, 1150, 318, 'pudding', 0.32).setDepth(15);
    pud.setMood('sleepy');
    pud.setSize(110, 90).setInteractive({ useHandCursor: true });
    pud.on('pointerup', () => {
      sfx.purr();
      pud.setMood('happy');
      this.tweens.add({ targets: pud, scaleY: 0.35, duration: 200, yoyo: true });
      this.line('shop.pudding');
      if (setFlag(p, 'pudding')) persist();
    });
    this.hot('pudding', () => pud.emit('pointerup'));
    const whisker = this.add.container(-60, 700).setDepth(40);
    const wg = this.add.graphics();
    wg.fillStyle(0x9a8f86, 1);
    wg.fillEllipse(0, 0, 40, 22);
    wg.fillCircle(18, -6, 10);
    wg.fillStyle(0xf08080, 1);
    wg.fillCircle(14, -16, 6);
    wg.fillStyle(0x2b1d14, 1);
    wg.fillCircle(22, -8, 2);
    wg.lineStyle(2, 0x9a8f86, 1);
    wg.lineBetween(-20, 0, -40, -8);
    whisker.add(wg);
    whisker.setSize(60, 40).setInteractive({ useHandCursor: true });
    whisker.on('pointerup', () => {
      sfx.squeak(1.3);
      this.line('shop.whisker');
      if (setFlag(p, 'whisker')) persist();
    });
    const run = () => {
      if (!whisker.active) return;
      whisker.x = -60;
      this.tweens.add({ targets: whisker, x: 1340, duration: 9000, ease: 'Linear', delay: 6000 + Math.random() * 8000, onComplete: run });
    };
    run();
  }

  // ───────────────────────────── jobs ─────────────────────────────

  private nextJob(): RepairDef | undefined {
    const p = profile();
    const open = nextRepairs(p);
    return open.find((r) => repairStarted(p, r)) ?? open[0];
  }

  private startJob(r: RepairDef): void {
    if (this.busy) return;
    this.busy = true;
    sfx.click();
    const step: Step = startRepair(profile(), r.id);
    this.kip?.celebrate();
    this.time.delayedCall(250, () => go(this, step));
  }

  private welcome(job: RepairDef | undefined): void {
    const p = profile();
    if (windDownActive()) {
      this.time.delayedCall(600, () => this.line('shop.winddown'));
      return;
    }
    if (job && !repairStarted(p, job)) {
      this.time.delayedCall(700, () => {
        this.ringDoor();
        this.line('shop.job');
      });
    } else if (!greeted) {
      this.time.delayedCall(600, () => this.line(nextRepairs(p).length ? 'shop.hello' : 'shop.done'));
    }
    greeted = true;
  }

  /** Closing Time: the sign is flipped, Kip is asleep; only a grown-up can reopen today. */
  private closed(): void {
    const p = profile();
    const home = this.add.graphics().setDepth(10).setPosition(640, 600);
    drawNookHome(home, nookLevel(p));
    const sleepy = new Kip(this, 600, 640, p.look).setDepth(12);
    sleepy.nap(true);
    const sign = this.add.graphics().setDepth(12).setPosition(640, 260);
    drawClosedSign(sign);
    this.tweens.add({ targets: sign, angle: { from: -2, to: 2 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const z = this.add.text(660, 560, 'z z z', { fontFamily: FONT, fontSize: '28px', color: '#fff3d0' }).setDepth(13);
    this.tweens.add({ targets: z, y: 520, alpha: 0.3, duration: 1800, yoyo: true, repeat: -1 });
    this.time.delayedCall(500, () => this.line('shop.closed'));
    roundButton(this, 1226, 52, '⚙', () =>
      parentalGate(this, () => {
        reopen();
        this.scene.restart();
      }), { r: 26, fontSize: 24, say: 'For grown-ups' }).setDepth(HUD);
    if (showWords()) this.add.text(640, 690, 'Closed — see you tomorrow!', { fontFamily: FONT, fontSize: '22px', color: '#fff3d0' }).setOrigin(0.5).setDepth(HUD);
  }
}
