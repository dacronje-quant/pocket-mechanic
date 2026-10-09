import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { Kip } from '../art/Kip';
import { ensureBasics, ensureGearTexture, GearVariant } from '../art/textures';
import { GearNode, MODULE, Solution, collides, meshPhase, meshes, pitchRadius, solve, speedRatio } from '../mechanism/graph';
import { GEAR_GALLERY, RoomDef } from '../rooms/gearGallery';
import { PLAY_STYLES, PlayStyle, awardGoldenGear, game, save } from '../state';
import { FONT, SERIF, SpeechBubble, roundButton, setButtonIcon } from '../ui/widgets';
import { toggleFullscreen } from '../platform';

interface GearView {
  node: GearNode;
  img: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  fixed: boolean;
  pegId?: string;
  traySlot?: { x: number; y: number };
  omega: number;
  freeSpin: number;
}

interface PegView {
  id: string;
  x: number;
  y: number;
  occupant?: string;
}

const D = {
  bg: 0,
  shaft: 5,
  peg: 8,
  gear: 10,
  clock: 20,
  fx: 25,
  tray: 30,
  trayGear: 35,
  kip: 40,
  peek: 50,
  blueprint: 55,
  drag: 60,
  hud: 70,
  bubble: 80,
};

const TRAY_SCALE = 0.72;
const GOLD = 0xffc928;

/**
 * Room 1.2 of Mr. Finch's Cuckoo Clock (GDD Appendix A): one empty peg, a
 * stalled gear wall, and the first CLUNK.
 */
export class GearGalleryScene extends Phaser.Scene {
  private room: RoomDef = GEAR_GALLERY;
  private style!: PlayStyle;
  private gears = new Map<string, GearView>();
  private pegs = new Map<string, PegView>();
  private sol!: Solution;
  private driverOmega = 0;
  private kip!: Kip;
  private beam!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private peekOverlay!: Phaser.GameObjects.Rectangle;
  private blueprint!: Phaser.GameObjects.Graphics;
  private dragGhost!: Phaser.GameObjects.Image;
  private hintGhost!: Phaser.GameObjects.Image;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars!: Phaser.GameObjects.Particles.ParticleEmitter;
  private minuteHand!: Phaser.GameObjects.Graphics;
  private hourHand!: Phaser.GameObjects.Graphics;
  private gauge?: Phaser.GameObjects.Text;
  private bubble!: SpeechBubble;
  private goldText!: Phaser.GameObjects.Text;
  private goldIcon!: Phaser.GameObjects.Image;
  private soundBtn!: Phaser.GameObjects.Container;
  private peekBtn!: Phaser.GameObjects.Container;
  private chainOffset = 0;
  private weightX = 0;
  private peeking = false;
  private fixedOnce = false;
  private running = false;
  private elapsed = 0;
  private idle = 0;
  private hintTier = 0;
  private nextHintAt = 0;
  private sparkTimer = 0;
  private tickTimer = 0;
  private undo: Array<{ gearId: string; pegId: string }> = [];
  private fiddled = new Set<string>();
  private dragging?: GearView;

  constructor() {
    super('gear-gallery');
  }

  create(): void {
    this.style = PLAY_STYLES[game.data.style];
    this.gears.clear();
    this.pegs.clear();
    this.undo = [];
    this.fiddled.clear();
    this.fixedOnce = false;
    this.running = false;
    this.peeking = false;
    this.elapsed = 0;
    this.idle = 0;
    this.hintTier = 0;
    this.nextHintAt = this.style.id === 'tinker' ? 20 : 45;
    ensureBasics(this);
    sfx.setMuted(game.data.muted);

    this.drawRoom();
    this.buildClock();
    this.buildGears();
    this.buildFiddleToys();
    this.buildFx();
    this.buildHud();
    this.computeDriverSpeed();
    this.resolve(false);

    this.kip = new Kip(this, 980, this.room.floorY).setDepth(D.kip);
    // Kip's body sits above the ground point, so the tap area is shifted up.
    this.kip.setInteractive(new Phaser.Geom.Rectangle(-5, -45, 80, 100), Phaser.Geom.Rectangle.Contains);
    this.kip.on('pointerup', () => {
      sfx.chirp();
      this.kip.celebrate();
      if (this.style.id !== 'tinker') this.togglePeek();
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      sfx.unlockAudio();
      if (over.length === 0 && p.worldY > 520) this.kip.walkTo(p.worldX);
    });
    this.setupDrag();

    this.titleCard();
    this.cameras.main.fadeIn(300, 26, 18, 12);
    if (this.style.id !== 'tinker') {
      this.time.delayedCall(1400, () => this.bubble.say(this.style.id === 'engineer' ? this.room.intro.engineer : this.room.intro.fixer, 7000));
    }
  }

  // ───────────────────────────── building the room ─────────────────────────────

  private drawRoom(): void {
    const { width: W, height: H } = this.scale;
    const g = this.add.graphics().setDepth(D.bg);
    // carved walnut planks
    for (let i = 0; i < 14; i++) {
      g.fillStyle(i % 2 ? 0x4a2f1e : 0x52341f, 1);
      g.fillRect(i * 96, 0, 96, H);
      g.fillStyle(0x2e1c10, 0.5);
      g.fillRect(i * 96, 0, 3, H);
    }
    // wood grain
    g.lineStyle(1, 0x3a2416, 0.35);
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      g.lineBetween(x, y, x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(40, 120));
    }
    // floor shelf
    g.fillStyle(0x2a190e, 1);
    g.fillRect(0, this.room.floorY, W, H - this.room.floorY);
    g.fillStyle(0x6e4527, 1);
    g.fillRect(0, this.room.floorY - 6, W, 8);
    // vignette
    g.fillStyle(0x000000, 0.18);
    g.fillRect(0, 0, W, 70);
    g.fillRect(0, 0, 40, H);
    g.fillRect(W - 40, 0, 40, H);

    // sunbeams through the clock face (additive, very soft)
    const beams = this.add.graphics().setDepth(D.fx - 1).setBlendMode(Phaser.BlendModes.ADD);
    const beam = (x1: number, x2: number, x3: number, x4: number, a: number) => {
      beams.fillStyle(0xffe2a0, a);
      beams.fillPoints(
        [new Phaser.Math.Vector2(x1, 0), new Phaser.Math.Vector2(x2, 0), new Phaser.Math.Vector2(x3, H), new Phaser.Math.Vector2(x4, H)],
        true,
      );
    };
    beam(980, 1060, 640, 480, 0.05);
    beam(1100, 1150, 820, 720, 0.04);
    beam(880, 920, 380, 300, 0.035);
    this.tweens.add({ targets: beams, alpha: 0.65, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // dust motes drifting in the light
    this.add
      .particles(0, 0, 'mote', {
        x: { min: 300, max: 1150 },
        y: { min: 80, max: 640 },
        lifespan: 6000,
        speedX: { min: -8, max: 8 },
        speedY: { min: -6, max: 6 },
        alpha: { start: 0, end: 0.5, ease: 'Sine.easeInOut' },
        scale: { min: 0.5, max: 1.2 },
        frequency: 220,
        blendMode: 'ADD',
      })
      .setDepth(D.fx);

    // parts tray (a drawer that slid out)
    const t = this.room.tray;
    const tg = this.add.graphics().setDepth(D.tray);
    tg.fillStyle(0x000000, 0.35);
    tg.fillRoundedRect(t.x - t.w / 2 + 6, t.y - t.h / 2 + 10, t.w, t.h, 14);
    tg.fillStyle(0x7a4b26, 1);
    tg.fillRoundedRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h, 14);
    tg.fillStyle(0x3d2412, 1);
    tg.fillRoundedRect(t.x - t.w / 2 + 12, t.y - t.h / 2 + 10, t.w - 24, t.h - 30, 10);
    tg.fillStyle(0x9a6a3a, 1);
    tg.fillRoundedRect(t.x - t.w / 2, t.y + t.h / 2 - 22, t.w, 22, 8);
    tg.fillStyle(0xd9a441, 1);
    tg.fillRoundedRect(t.x - 30, t.y + t.h / 2 - 16, 60, 10, 5);
  }

  private buildClock(): void {
    const { x, y, r } = this.room.clock;
    const E = this.room.fixed.find((f) => f.id === this.room.outputId)!;
    // arbor shaft from the output gear to the hands
    const shaft = this.add.graphics().setDepth(D.shaft);
    shaft.lineStyle(14, 0x5e3f10, 1);
    shaft.lineBetween(E.x, E.y, x, y);
    shaft.lineStyle(8, 0xd9a441, 1);
    shaft.lineBetween(E.x, E.y, x, y);
    shaft.lineStyle(2, 0xfff0b8, 0.6);
    shaft.lineBetween(E.x, E.y - 2, x, y - 2);

    const g = this.add.graphics().setDepth(D.clock);
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(x + 6, y + 10, r + 18);
    g.fillStyle(0x3a2212, 1);
    g.fillCircle(x, y, r + 18);
    g.fillStyle(0xb88a2c, 1);
    g.fillCircle(x, y, r + 6);
    g.fillStyle(0xf6ead0, 1);
    g.fillCircle(x, y, r);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(x - r * 0.25, y - r * 0.3, r * 0.55);
    g.fillStyle(0xf6ead0, 1);
    g.fillCircle(x + r * 0.05, y + r * 0.05, r * 0.62);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const big = i % 5 === 0;
      g.lineStyle(big ? 4 : 2, 0x3b260b, big ? 1 : 0.6);
      const r1 = r - (big ? 18 : 10);
      g.lineBetween(x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4));
    }
    for (let n = 1; n <= 12; n++) {
      const a = (n / 12) * Math.PI * 2 - Math.PI / 2;
      this.add
        .text(x + Math.cos(a) * (r - 42), y + Math.sin(a) * (r - 42), String(n), {
          fontFamily: SERIF,
          fontSize: '28px',
          color: '#3b260b',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(D.clock);
    }
    this.hourHand = this.add.graphics({ x, y }).setDepth(D.clock + 1);
    this.hourHand.fillStyle(0x2b1d14, 1);
    this.hourHand.fillRoundedRect(-6, -r * 0.5, 12, r * 0.58, 6);
    this.minuteHand = this.add.graphics({ x, y }).setDepth(D.clock + 2);
    this.minuteHand.fillStyle(0x2b1d14, 1);
    this.minuteHand.fillRoundedRect(-4, -r * 0.82, 8, r * 0.92, 4);
    this.minuteHand.fillTriangle(-9, -r * 0.74, 9, -r * 0.74, 0, -r * 0.88);
    const cap = this.add.graphics().setDepth(D.clock + 3);
    cap.fillStyle(0xb88a2c, 1);
    cap.fillCircle(x, y, 12);
    cap.fillStyle(0xfff0b8, 0.7);
    cap.fillCircle(x - 3, y - 3, 5);
    // stalled at ten to two
    this.minuteHand.rotation = (50 / 60) * Math.PI * 2;
    this.hourHand.rotation = (1.83 / 12) * Math.PI * 2;
  }

  private buildGears(): void {
    for (const f of this.room.fixed) {
      const img = this.add.image(f.x, f.y, ensureGearTexture(this, f.teeth, f.variant)).setDepth(D.gear);
      img.rotation = Math.random() * Math.PI * 2;
      this.gears.set(f.id, { node: { id: f.id, teeth: f.teeth, x: f.x, y: f.y }, img, fixed: true, omega: 0, freeSpin: 0 });
    }
    for (const p of this.room.pegs) {
      this.pegs.set(p.id, { ...p });
      const pg = this.add.graphics().setDepth(D.peg);
      pg.fillStyle(0x000000, 0.35);
      pg.fillCircle(p.x + 2, p.y + 4, 13);
      pg.fillStyle(0x7a5413, 1);
      pg.fillCircle(p.x, p.y, 13);
      pg.fillStyle(0xe7bb55, 1);
      pg.fillCircle(p.x, p.y, 9);
      pg.fillStyle(0xfff0b8, 0.8);
      pg.fillCircle(p.x - 3, p.y - 3, 3);
    }

    // hint ghost of the missing gear
    const sol = this.room.solution;
    const peg = this.pegs.get(sol.pegId)!;
    this.hintGhost = this.add.image(peg.x, peg.y, ensureGearTexture(this, sol.teeth, 'ghost')).setDepth(D.gear - 1).setAlpha(0);
    this.dragGhost = this.add.image(0, 0, ensureGearTexture(this, sol.teeth, 'ghost')).setDepth(D.gear + 1).setVisible(false);

    // tray parts
    const t = this.room.tray;
    const n = this.style.tray.length;
    this.style.tray.forEach((teeth, i) => {
      const x = n === 1 ? t.x : t.x - t.w / 2 + 95 + (i * (t.w - 190)) / (n - 1);
      const y = t.y - 6;
      const variant: GearVariant = 'brass';
      const img = this.add.image(x, y, ensureGearTexture(this, teeth, variant)).setDepth(D.trayGear).setScale(TRAY_SCALE);
      const r = pitchRadius(teeth) + MODULE;
      const hit = Math.max(r, 62);
      img.setInteractive({
        hitArea: new Phaser.Geom.Circle(img.width / 2, img.height / 2, hit),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
        draggable: true,
        useHandCursor: true,
      });
      const id = `tray-${teeth}-${i}`;
      const view: GearView = { node: { id, teeth, x, y }, img, fixed: false, traySlot: { x, y }, omega: 0, freeSpin: 0 };
      img.setData('gearId', id);
      this.gears.set(id, view);
    });

    if (this.style.showNumbers) {
      for (const v of this.gears.values()) {
        v.label = this.add
          .text(v.img.x, v.img.y, `${v.node.teeth}`, {
            fontFamily: FONT,
            fontSize: '20px',
            color: '#fff8e0',
            fontStyle: 'bold',
            stroke: '#2b1d14',
            strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setDepth(D.drag + 1);
      }
      const { x, y, r } = this.room.clock;
      this.gauge = this.add
        .text(x, y + r + 48, '', {
          fontFamily: FONT,
          fontSize: '20px',
          color: '#fff3d0',
          backgroundColor: '#2b1d14cc',
          padding: { x: 12, y: 6 },
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(D.hud);
    }

    // weight chain hanging off the driver gear
    const A = this.gears.get(this.room.driverId)!.node;
    const wx = A.x - pitchRadius(A.teeth) - 2;
    const weight = this.add.graphics().setDepth(D.gear + 1);
    weight.fillStyle(0x000000, 0.3);
    weight.fillEllipse(wx + 4, 586, 50, 92);
    weight.fillStyle(0x9a6b1f, 1);
    weight.fillEllipse(wx, 580, 46, 88);
    for (let i = 0; i < 5; i++) {
      weight.fillStyle(i % 2 ? 0xb88a2c : 0x7a5413, 1);
      weight.fillEllipse(wx, 548 + i * 15, 44 - Math.abs(i - 2) * 6, 12);
    }
    weight.fillStyle(0xf6d27a, 0.6);
    weight.fillEllipse(wx - 10, 560, 10, 40);
    this.weightX = wx;
  }

  private computeDriverSpeed(): void {
    // Solve once with the right gear in place, then pick the driver speed and
    // direction that make the clock hand turn clockwise at the target speed.
    const sol = this.room.solution;
    const peg = this.pegs.get(sol.pegId)!;
    const nodes = [...this.room.fixed.map((f) => ({ id: f.id, teeth: f.teeth, x: f.x, y: f.y })), { id: '_sol', teeth: sol.teeth, x: peg.x, y: peg.y }];
    const s = solve(nodes, { gearId: this.room.driverId, omega: 1 });
    const ratio = speedRatio(s, this.room.driverId, this.room.outputId);
    const target = this.room.outputTurnsPerSecond * Math.PI * 2;
    this.driverOmega = ratio === 0 ? target : target / ratio;
  }

  private buildFx(): void {
    this.fx = this.add.graphics().setDepth(D.fx);
    this.beam = this.add.graphics().setDepth(D.drag - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.peekOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1a2e, 0.66).setOrigin(0).setDepth(D.peek).setVisible(false);
    this.blueprint = this.add.graphics().setDepth(D.blueprint).setVisible(false);
    this.sparks = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 40, max: 180 },
        lifespan: { min: 300, max: 650 },
        scale: { start: 1.1, end: 0 },
        tint: [0xffd76a, 0xfff3b0, 0xffb347],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(D.drag + 2);
    this.stars = this.add
      .particles(0, 0, 'star', {
        speed: { min: 120, max: 320 },
        lifespan: 900,
        scale: { start: 1.2, end: 0 },
        rotate: { min: 0, max: 360 },
        gravityY: 260,
        emitting: false,
      })
      .setDepth(D.drag + 2);
  }

  private buildHud(): void {
    const W = this.scale.width;
    roundButton(this, 56, 52, '⌂', () => this.toMenu()).setDepth(D.hud);

    this.goldIcon = this.add.image(140, 52, ensureGearTexture(this, 12, 'gold')).setDepth(D.hud).setScale(0.9);
    this.goldText = this.add
      .text(178, 52, '', { fontFamily: FONT, fontSize: '30px', color: '#ffe48a', fontStyle: 'bold', stroke: '#2b1d14', strokeThickness: 6 })
      .setOrigin(0, 0.5)
      .setDepth(D.hud);
    this.refreshGold();
    this.events.on('update', (_: number, dt: number) => (this.goldIcon.rotation += dt / 1500));

    let x = W - 56;
    roundButton(this, x, 52, '⛶', () => toggleFullscreen(this), { fontSize: 30 }).setDepth(D.hud);
    x -= 92;
    this.soundBtn = roundButton(this, x, 52, game.data.muted ? '🔇' : '🔊', () => this.toggleSound(), { fontSize: 28 }).setDepth(D.hud);
    x -= 92;
    roundButton(this, x, 52, '↺', () => this.rewind(), { fontSize: 38 }).setDepth(D.hud);
    if (this.style.id !== 'tinker') {
      x -= 92;
      this.peekBtn = roundButton(this, x, 52, '🔍', () => this.togglePeek(), { fontSize: 30 }).setDepth(D.hud);
    }
    if (this.style.id === 'engineer') {
      x -= 92;
      roundButton(this, x, 52, '?', () => this.nextHint(), { fontSize: 38 }).setDepth(D.hud);
    }

    this.bubble = new SpeechBubble(this, 600, 140, 640).setDepth(D.bubble);
  }

  private titleCard(): void {
    const { width: W } = this.scale;
    const t = this.add
      .text(W / 2, 300, this.room.title, {
        fontFamily: SERIF,
        fontSize: '54px',
        color: '#ffd76a',
        fontStyle: 'bold',
        stroke: '#2b1d14',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(D.bubble + 1)
      .setAlpha(0);
    this.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, y: 280, duration: 400, ease: 'Quad.easeOut' },
        { alpha: 0, y: 260, duration: 500, delay: 900 },
      ],
      onComplete: () => t.destroy(),
    });
  }

  // ─────────────────────────────── fiddle toys ───────────────────────────────
  // GDD §9.2: things that are fun to touch even though the puzzle doesn't need them.

  private fiddle(id: string): void {
    if (this.fiddled.has(id)) return;
    this.fiddled.add(id);
    if (this.fiddled.size === 5) {
      this.time.delayedCall(400, () => this.giveGolden(3, this.kip.x, this.kip.y - 80));
    }
  }

  private buildFiddleToys(): void {
    // 1. Bell on a string
    const bell = this.add.container(78, 150).setDepth(D.gear);
    const bg = this.add.graphics();
    bg.lineStyle(3, 0xd9c7a0, 1);
    bg.lineBetween(0, 0, 0, 60);
    bg.fillStyle(0xb88a2c, 1);
    bg.fillTriangle(-24, 100, 24, 100, 0, 56);
    bg.fillCircle(0, 74, 18);
    bg.fillRect(-26, 94, 52, 8);
    bg.fillStyle(0xf6d27a, 0.6);
    bg.fillCircle(-6, 70, 6);
    bg.fillStyle(0x5e3f10, 1);
    bg.fillCircle(0, 106, 6);
    bell.add(bg);
    bell.setSize(70, 120);
    bell.setInteractive(new Phaser.Geom.Rectangle(0, 50, 70, 70), Phaser.Geom.Rectangle.Contains);
    bell.on('pointerup', () => {
      sfx.ding(1320);
      this.tweens.add({ targets: bell, angle: { from: -22, to: 22 }, duration: 160, yoyo: true, repeat: 2, onComplete: () => bell.setAngle(0) });
      this.fiddle('bell');
    });

    // 2. Carved owl on a ledge (Golden Gear ②: tap its eyes three times)
    const ox = 88;
    const oy = 352;
    const ledge = this.add.graphics().setDepth(D.gear);
    ledge.fillStyle(0x6e4527, 1);
    ledge.fillRect(ox - 54, oy + 46, 108, 12);
    const owl = this.add.container(ox, oy).setDepth(D.gear);
    const og = this.add.graphics();
    og.fillStyle(0x7a4b26, 1);
    og.fillEllipse(0, 10, 72, 76);
    og.fillTriangle(-30, -20, -20, -40, -12, -22);
    og.fillTriangle(30, -20, 20, -40, 12, -22);
    og.fillStyle(0x9a6a3a, 1);
    og.fillEllipse(0, 22, 44, 46);
    og.fillStyle(0xe7bb55, 1);
    og.fillTriangle(-5, 4, 5, 4, 0, 14);
    og.fillStyle(0xf3e2bd, 1);
    og.fillCircle(-14, -6, 12);
    og.fillCircle(14, -6, 12);
    const pupils = this.add.graphics();
    const drawPupils = (a: number) => {
      pupils.clear();
      pupils.fillStyle(0x2b1d14, 1);
      pupils.fillCircle(-14 + Math.cos(a) * 5, -6 + Math.sin(a) * 5, 5);
      pupils.fillCircle(14 + Math.cos(a) * 5, -6 + Math.sin(a) * 5, 5);
    };
    drawPupils(0);
    owl.add([og, pupils]);
    owl.setSize(80, 90);
    owl.setInteractive();
    let taps = 0;
    const spin = { a: 0 };
    owl.on('pointerup', () => {
      sfx.click();
      this.fiddle('owl');
      this.tweens.add({ targets: spin, a: spin.a + Math.PI * 2, duration: 450, ease: 'Sine.easeInOut', onUpdate: () => drawPupils(spin.a) });
      taps++;
      if (taps === 3) {
        sfx.boing();
        this.tweens.add({ targets: owl, y: oy - 26, duration: 200, yoyo: true, ease: 'Quad.easeOut' });
        this.giveGolden(2, ox, oy - 40);
      }
    });

    // 3. Spring on the floor
    const spring = this.add.graphics({ x: 1215, y: this.room.floorY }).setDepth(D.gear);
    const drawSpring = () => {
      spring.clear();
      spring.lineStyle(5, 0xc0c8d0, 1);
      for (let i = 0; i < 6; i++) spring.strokeEllipse(0, -10 - i * 11, 34, 10);
      spring.fillStyle(0xd9a441, 1);
      spring.fillCircle(0, -80, 12);
    };
    drawSpring();
    spring.setInteractive(new Phaser.Geom.Rectangle(-30, -100, 60, 100), Phaser.Geom.Rectangle.Contains);
    spring.on('pointerup', () => {
      sfx.boing();
      this.fiddle('spring');
      this.tweens.add({ targets: spring, scaleY: { from: 0.45, to: 1 }, duration: 600, ease: 'Elastic.easeOut' });
    });

    // 4. Light switch + bulb
    const bulb = this.add.graphics({ x: 1215, y: 430 }).setDepth(D.gear);
    let on = false;
    const drawBulb = () => {
      bulb.clear();
      bulb.lineStyle(2, 0x2b1d14, 1);
      bulb.lineBetween(0, -60, 0, -26);
      if (on) {
        bulb.fillStyle(0xffe98a, 0.25);
        bulb.fillCircle(0, -8, 40);
      }
      bulb.fillStyle(on ? 0xfff3b0 : 0x8f8a7a, 1);
      bulb.fillCircle(0, -8, 16);
      bulb.fillStyle(0x7a5413, 1);
      bulb.fillRect(-8, -30, 16, 10);
    };
    drawBulb();
    const sw = this.add.container(1215, 520).setDepth(D.gear);
    const sg = this.add.graphics();
    const lever = this.add.graphics();
    sg.fillStyle(0xb88a2c, 1);
    sg.fillRoundedRect(-22, -32, 44, 64, 8);
    sg.fillStyle(0x3d2412, 1);
    sg.fillRoundedRect(-8, -18, 16, 36, 6);
    const drawLever = () => {
      lever.clear();
      lever.fillStyle(0xf3e2bd, 1);
      lever.fillRoundedRect(-6, on ? -22 : 0, 12, 22, 5);
    };
    drawLever();
    sw.add([sg, lever]);
    sw.setSize(60, 80);
    sw.setInteractive();
    sw.on('pointerup', () => {
      on = !on;
      sfx.click();
      if (on) sfx.tick(1.5);
      drawBulb();
      drawLever();
      this.fiddle('switch');
    });

    // 5. A loose cog that spins when flicked
    const cog = this.add.image(1110, this.room.floorY - 26, ensureGearTexture(this, 10, 'steel')).setDepth(D.gear);
    cog.setInteractive(new Phaser.Geom.Circle(cog.width / 2, cog.height / 2, 40), Phaser.Geom.Circle.Contains);
    cog.on('pointerup', () => {
      sfx.whirr();
      this.fiddle('cog');
      this.tweens.add({ targets: cog, angle: cog.angle + 720, duration: 1400, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: cog, y: cog.y - 30, duration: 180, yoyo: true, ease: 'Quad.easeOut' });
    });
  }

  // ─────────────────────────────── dragging parts ───────────────────────────────

  private setupDrag(): void {
    this.input.dragDistanceThreshold = 4;

    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      const v = this.gears.get(obj.getData('gearId') as string);
      if (!v) return;
      this.idle = 0;
      this.dragging = v;
      obj.setData('snapped', false);
      sfx.pickUp();
      this.tweens.killTweensOf(obj);
      obj.setDepth(D.drag);
      this.tweens.add({ targets: obj, scale: 1, duration: 120, ease: 'Back.easeOut' });
      v.freeSpin = 0;
      if (v.pegId) {
        // lift it off its peg
        const peg = this.pegs.get(v.pegId)!;
        peg.occupant = undefined;
        v.pegId = undefined;
        this.resolve(false);
      }
      this.dragGhost.setTexture(ensureGearTexture(this, v.node.teeth, 'ghost'));
    });

    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, x: number, y: number) => {
      const v = this.dragging;
      if (!v || obj.getData('snapped')) return;
      obj.setPosition(x, y);
      obj.rotation += 0.02;
      this.kip.walkTo(x - 90);
      this.kip.lookToward(x);
      const peg = this.nearestPeg(x, y);
      if (peg) {
        this.dragGhost.setPosition(peg.x, peg.y).setVisible(true);
        if (this.style.snapOnHover && this.canPlace(v, peg)) {
          obj.setData('snapped', true);
          this.place(v, peg);
        }
      } else {
        this.dragGhost.setVisible(false);
      }
    });

    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      const v = this.dragging;
      this.dragging = undefined;
      this.dragGhost.setVisible(false);
      this.beam.clear();
      if (!v) return;
      if (obj.getData('snapped')) {
        obj.setData('snapped', false);
        return;
      }
      const peg = this.nearestPeg(obj.x, obj.y);
      if (!peg) return this.floatBack(v);
      if (this.canPlace(v, peg)) this.place(v, peg);
      else this.refuse(v, peg);
    });
  }

  private nearestPeg(x: number, y: number): PegView | undefined {
    let best: PegView | undefined;
    let bestD = this.style.snapRadius;
    for (const p of this.pegs.values()) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private placedNodes(except?: string): GearNode[] {
    const out: GearNode[] = [];
    for (const v of this.gears.values()) {
      if (v.node.id === except) continue;
      if (v.fixed || v.pegId) out.push(v.node);
    }
    return out;
  }

  private canPlace(v: GearView, peg: PegView): boolean {
    const probe: GearNode = { ...v.node, x: peg.x, y: peg.y };
    return !this.placedNodes(v.node.id).some((o) => o.id !== peg.occupant && collides(probe, o));
  }

  private place(v: GearView, peg: PegView): void {
    // swap out whatever was on the peg
    if (peg.occupant && peg.occupant !== v.node.id) {
      const old = this.gears.get(peg.occupant)!;
      old.pegId = undefined;
      this.floatBack(old);
    }
    peg.occupant = v.node.id;
    v.pegId = peg.id;
    v.node.x = peg.x;
    v.node.y = peg.y;
    this.undo.push({ gearId: v.node.id, pegId: peg.id });
    this.idle = 0;

    const img = v.img;
    this.tweens.killTweensOf(img);
    this.tweens.add({ targets: img, x: peg.x, y: peg.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    img.setDepth(D.gear + 1);

    // the CLUNK: sound + sparks + camera bump + haptic + Kip (GDD §9.3)
    sfx.clunk();
    sfx.buzz(30);
    this.cameras.main.shake(90, 0.004);
    this.sparks.explode(22, peg.x, peg.y);
    this.kip.lookToward(peg.x);

    this.resolve(true);

    if (!this.isPowered(v.node.id)) {
      // fits, but touches nothing: a funny whirr in the air
      this.time.delayedCall(180, () => {
        sfx.whirr();
        v.freeSpin = 7;
        this.kip.shrug();
      });
    }
  }

  private refuse(v: GearView, peg: PegView): void {
    const img = v.img;
    sfx.nuhUh();
    sfx.buzz(12);
    this.kip.shrug();
    this.tweens.killTweensOf(img);
    this.tweens.chain({
      targets: img,
      tweens: [
        { x: peg.x, y: peg.y, duration: 120, ease: 'Quad.easeOut' },
        { x: peg.x + 10, duration: 60, yoyo: true, repeat: 2 },
      ],
      onComplete: () => this.floatBack(v),
    });
  }

  private floatBack(v: GearView): void {
    if (!v.traySlot) return;
    const img = v.img;
    v.node.x = v.traySlot.x;
    v.node.y = v.traySlot.y;
    v.freeSpin = 0;
    this.tweens.killTweensOf(img);
    img.setDepth(D.trayGear);
    this.tweens.add({ targets: img, x: v.traySlot.x, y: v.traySlot.y, scale: TRAY_SCALE, duration: 450, ease: 'Back.easeOut' });
  }

  private rewind(): void {
    const last = this.undo.pop();
    if (!last) {
      sfx.nuhUh();
      return;
    }
    const v = this.gears.get(last.gearId)!;
    if (v.pegId === last.pegId) {
      this.pegs.get(last.pegId)!.occupant = undefined;
      v.pegId = undefined;
      sfx.whirr();
      this.floatBack(v);
      this.resolve(false);
    } else {
      this.rewind();
    }
  }

  // ─────────────────────────────── the mechanism ───────────────────────────────

  private isPowered(id: string): boolean {
    return (this.sol?.omega.get(id) ?? 0) !== 0;
  }

  private resolve(cascade: boolean): void {
    const nodes = this.placedNodes();
    const before = new Set<string>();
    for (const v of this.gears.values()) if (v.omega !== 0) before.add(v.node.id);

    const sol = solve(nodes, { gearId: this.room.driverId, omega: this.driverOmega });
    this.sol = sol;

    if (sol.jammed) {
      // grumble, shake, then pop the last placed part back out (GDD §11.1)
      sfx.nuhUh();
      for (const id of sol.jamGroup) {
        const v = this.gears.get(id)!;
        v.omega = 0;
        this.tweens.add({ targets: v.img, x: v.img.x + 3, duration: 50, yoyo: true, repeat: 4 });
      }
      this.time.delayedCall(500, () => this.rewind());
      return;
    }

    // parents for phase alignment
    const parent = new Map<string, string>();
    for (const [a, b] of sol.powerEdges) parent.set(b, a);

    let step = 0;
    for (const id of sol.order) {
      const v = this.gears.get(id)!;
      const target = sol.omega.get(id)!;
      if (before.has(id)) {
        v.omega = target;
        continue;
      }
      const delay = cascade ? step * 140 : 0;
      const n = step;
      step++;
      this.time.delayedCall(delay, () => {
        if ((this.sol.omega.get(id) ?? 0) === 0) return; // removed meanwhile
        const p = parent.get(id);
        if (p) v.img.rotation = meshPhase(this.gears.get(p)!.node, this.gears.get(p)!.img.rotation, v.node);
        v.omega = this.sol.omega.get(id)!;
        v.freeSpin = 0;
        if (cascade) {
          sfx.tick(1 + n * 0.09);
          this.tweens.add({ targets: v.img, scale: v.img.scale * 1.06, duration: 70, yoyo: true });
          this.sparks.explode(6, v.img.x, v.img.y);
        }
      });
    }
    for (const v of this.gears.values()) {
      if ((sol.omega.get(v.node.id) ?? 0) === 0) v.omega = 0;
    }

    const wasRunning = this.running;
    this.running = this.isPowered(this.room.outputId);
    if (this.running && !wasRunning && cascade) {
      this.time.delayedCall(step * 140 + 250, () => this.onFixed());
    }
    this.updateGauge();
  }

  private updateGauge(): void {
    if (!this.gauge) return;
    const r = speedRatio(this.sol, this.room.driverId, this.room.outputId);
    const A = this.gears.get(this.room.driverId)!.node;
    if (r === 0) this.gauge.setText(`Input: ${A.teeth}-tooth gear\nHands: no power`);
    else {
      const dir = r > 0 ? 'same way ↻' : 'opposite way ↺';
      this.gauge.setText(`Input: ${A.teeth}-tooth gear\nHands turn ×${Math.abs(r).toFixed(2)}, ${dir}`);
    }
  }

  private onFixed(): void {
    if (!this.running) return;
    const { x, y } = this.room.clock;
    sfx.fanfare();
    sfx.buzz(60);
    this.cameras.main.flash(250, 255, 236, 180);
    this.cameras.main.zoomTo(1.06, 500, 'Sine.easeInOut', true);
    this.time.delayedCall(1700, () => this.cameras.main.zoomTo(1, 600, 'Sine.easeInOut', true));
    this.stars.explode(40, x, y);
    this.sparks.explode(40, x, y);
    this.kip.celebrate();
    this.bubble.hide();

    if (!this.fixedOnce) {
      this.fixedOnce = true;
      this.time.delayedCall(700, () => this.giveGolden(1, x, y));
      this.time.delayedCall(1400, () => this.showFixedBanner());
    }
  }

  private showFixedBanner(): void {
    const { width: W } = this.scale;
    // Sits over the parts tray so the newly running gear wall stays in view.
    const c = this.add.container(W / 2, 590).setDepth(D.bubble).setScale(0.6).setAlpha(0);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-230, -86, 460, 190, 26);
    g.fillStyle(0x7a5413, 1);
    g.fillRoundedRect(-236, -96, 472, 190, 26);
    g.fillStyle(0xf3e2bd, 1);
    g.fillRoundedRect(-226, -86, 452, 170, 20);
    c.add(g);
    c.add(this.add.image(-160, -20, ensureGearTexture(this, 16, 'gold')).setScale(1.1));
    c.add(
      this.add
        .text(30, -26, 'Fixed!', { fontFamily: SERIF, fontSize: '64px', color: '#3b260b', fontStyle: 'bold' })
        .setOrigin(0.5),
    );
    const again = roundButton(this, -60, 52, '↻', () => this.scene.restart(), { r: 34, fontSize: 34 });
    const menu = roundButton(this, 60, 52, '⌂', () => this.toMenu(), { r: 34, fontSize: 34 });
    const close = roundButton(this, 180, 52, '✓', () => this.tweens.add({ targets: c, alpha: 0, scale: 0.8, duration: 200, onComplete: () => c.destroy() }), {
      r: 34,
      fontSize: 34,
    });
    c.add([again, menu, close]);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 350, ease: 'Back.easeOut' });
  }

  private giveGolden(n: 1 | 2 | 3, x: number, y: number): void {
    const id = `${this.room.id}:${n}`;
    const isNew = awardGoldenGear(id);
    const gg = this.add.image(x, y, ensureGearTexture(this, 12, 'gold')).setDepth(D.bubble).setScale(0.2);
    const glow = this.add.image(x, y, 'glow').setDepth(D.bubble - 1).setScale(2).setBlendMode(Phaser.BlendModes.ADD);
    sfx.sparkle();
    this.stars.explode(14, x, y);
    this.tweens.chain({
      targets: gg,
      tweens: [
        { scale: 2, y: y - 50, angle: 180, duration: 450, ease: 'Back.easeOut' },
        { scale: 2.1, duration: 350 },
        { x: this.goldIcon.x, y: this.goldIcon.y, scale: 0.9, angle: 720, duration: 650, ease: 'Cubic.easeIn' },
      ],
      onComplete: () => {
        gg.destroy();
        if (isNew) sfx.ding(1760);
        this.refreshGold();
        this.tweens.add({ targets: [this.goldIcon, this.goldText], scale: 1.35, duration: 120, yoyo: true });
      },
    });
    this.tweens.add({ targets: glow, alpha: 0, scale: 4, duration: 900, onComplete: () => glow.destroy() });
  }

  private refreshGold(): void {
    const n = game.data.goldenGears.filter((g) => g.startsWith(`${this.room.id}:`)).length;
    this.goldText.setText(`${n}/3`);
  }

  // ─────────────────────────────── helpers & HUD ───────────────────────────────

  private togglePeek(): void {
    this.peeking = !this.peeking;
    this.peekOverlay.setVisible(this.peeking);
    this.blueprint.setVisible(this.peeking);
    if (this.peekBtn) setButtonIcon(this.peekBtn, this.peeking ? '👁' : '🔍');
    sfx.whirr();
  }

  private toggleSound(): void {
    game.data.muted = !game.data.muted;
    sfx.setMuted(game.data.muted);
    save(game.data);
    setButtonIcon(this.soundBtn, game.data.muted ? '🔇' : '🔊');
  }

  private nextHint(): void {
    const h = this.room.hints;
    this.bubble.say(h[Math.min(this.hintTier, h.length - 1)], 7000);
    if (this.hintTier >= h.length - 1) this.pulseCorrectPart();
    this.hintTier++;
  }

  private correctTrayGear(): GearView | undefined {
    for (const v of this.gears.values()) if (!v.fixed && v.node.teeth === this.room.solution.teeth) return v;
    return undefined;
  }

  private pulseCorrectPart(): void {
    const v = this.correctTrayGear();
    if (!v || v.pegId) return;
    this.tweens.add({ targets: v.img, scale: TRAY_SCALE * 1.25, duration: 260, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
    this.kip.point(v.img.x);
    sfx.chirp();
  }

  private toMenu(): void {
    this.cameras.main.fadeOut(250, 26, 18, 12);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('menu'));
  }

  // ─────────────────────────────── per-frame ───────────────────────────────

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    this.elapsed += dt;
    this.idle += dt;

    for (const v of this.gears.values()) {
      if (v.omega !== 0) v.img.rotation += v.omega * dt;
      else if (v.freeSpin > 0.05) {
        v.img.rotation += v.freeSpin * dt;
        v.freeSpin *= Math.pow(0.35, dt);
      }
      if (v.label) v.label.setPosition(v.img.x, v.img.y);
    }

    // hands follow the output arbor (hour hand at 1/12 — the clock's 12:1)
    const out = this.gears.get(this.room.outputId)!;
    if (out.omega !== 0) {
      this.minuteHand.rotation += out.omega * dt;
      this.hourHand.rotation += (out.omega / 12) * dt;
      this.tickTimer += dt;
      if (this.tickTimer > 0.6) {
        this.tickTimer = 0;
        sfx.tick(0.8);
      }
    }

    const driver = this.gears.get(this.room.driverId)!;
    this.chainOffset += Math.abs(driver.omega) * pitchRadius(driver.node.teeth) * dt;
    this.drawFx(dt);
    this.drawBeam();
    this.updateHints();
    if (this.peeking) this.drawBlueprint();
  }

  private drawFx(dt: number): void {
    const g = this.fx;
    g.clear();
    // weight chain
    const A = this.gears.get(this.room.driverId)!.node;
    const wx = this.weightX;
    const top = A.y;
    const bottom = 540;
    const link = 14;
    const off = this.chainOffset % link;
    for (let y = top + off - link; y < bottom; y += link) {
      if (y < top) continue;
      const vert = Math.round((y - off) / link) % 2 === 0;
      g.lineStyle(3, 0x8f8a7a, 1);
      if (vert) g.strokeEllipse(wx, y, 7, 13);
      else g.strokeEllipse(wx, y, 3, 13);
    }

    // power you can see (GDD §9.4): sparks at every powered mesh…
    this.sparkTimer += dt;
    if (this.sparkTimer > 0.12) {
      this.sparkTimer = 0;
      for (const [a, b] of this.sol.powerEdges) {
        const na = this.gears.get(a)!.node;
        const nb = this.gears.get(b)!.node;
        const ra = pitchRadius(na.teeth);
        const rb = pitchRadius(nb.teeth);
        const t = ra / (ra + rb);
        if (Math.random() < 0.5) this.sparks.emitParticleAt(na.x + (nb.x - na.x) * t, na.y + (nb.y - na.y) * t, 1);
      }
    }
    // …and light rings travelling along the arbor to the hands
    const E = this.gears.get(this.room.outputId)!;
    if (E.omega !== 0) {
      const { x, y } = this.room.clock;
      const ex = E.node.x;
      const ey = E.node.y;
      const len = Math.hypot(x - ex, y - ey);
      const r = pitchRadius(E.node.teeth);
      for (let i = 0; i < 3; i++) {
        const t = (this.elapsed * 0.6 + i / 3) % 1;
        const d = r + t * (len - r - this.room.clock.r);
        if (d < r) continue;
        const px = ex + ((x - ex) * d) / len;
        const py = ey + ((y - ey) * d) / len;
        g.fillStyle(0xfff0a0, 0.8 * Math.sin(t * Math.PI));
        g.fillEllipse(px, py, 8, 22);
      }
    }

    // ghost outline of the missing part (per Play Style)
    const peg = this.pegs.get(this.room.solution.pegId)!;
    const s = this.style;
    const show =
      !peg.occupant &&
      (s.ghost === 'always' || (s.ghost === 'delayed' && this.elapsed > s.ghostDelayMs / 1000) || this.peeking);
    const target = show ? 0.45 + Math.sin(this.elapsed * 4) * 0.3 : 0;
    this.hintGhost.setAlpha(Phaser.Math.Linear(this.hintGhost.alpha, target, 0.2));
    this.hintGhost.setDepth(this.peeking ? D.blueprint + 1 : D.gear - 1);
    this.hintGhost.rotation += dt * 0.2;
  }

  private drawBeam(): void {
    this.beam.clear();
    const v = this.dragging;
    if (!v) return;
    const h = this.kip.handPoint();
    const x = v.img.x;
    const y = v.img.y;
    const wob = Math.sin(this.elapsed * 30) * 3;
    this.beam.lineStyle(14, 0x7fd3ff, 0.12);
    this.beam.lineBetween(h.x, h.y, x, y);
    this.beam.lineStyle(5, 0xb9ecff, 0.45);
    this.beam.lineBetween(h.x, h.y, x + wob, y);
    this.beam.lineStyle(2, 0xffffff, 0.8);
    this.beam.lineBetween(h.x, h.y, x, y + wob);
  }

  private drawBlueprint(): void {
    const g = this.blueprint;
    g.clear();
    const pulse = 0.5 + Math.sin(this.elapsed * 5) * 0.5;
    // every gear as a blueprint circle
    for (const n of this.placedNodes()) {
      const powered = this.isPowered(n.id);
      g.lineStyle(3, powered ? 0xffd76a : 0x7fd3ff, powered ? 0.95 : 0.6);
      g.strokeCircle(n.x, n.y, pitchRadius(n.teeth));
      g.fillStyle(powered ? 0xffd76a : 0x7fd3ff, 0.9);
      g.fillCircle(n.x, n.y, 5);
    }
    // power path from the weight chain through each powered mesh
    const A = this.gears.get(this.room.driverId)!.node;
    const wx = this.weightX;
    g.lineStyle(10, 0xffc928, 0.25);
    g.lineBetween(wx, 560, wx, A.y);
    g.lineStyle(4, 0xfff0a0, 0.9);
    g.lineBetween(wx, 560, wx, A.y);
    for (const [a, b] of this.sol.powerEdges) {
      const na = this.gears.get(a)!.node;
      const nb = this.gears.get(b)!.node;
      g.lineStyle(12, GOLD, 0.25);
      g.lineBetween(na.x, na.y, nb.x, nb.y);
      g.lineStyle(4, 0xfff0a0, 0.95);
      g.lineBetween(na.x, na.y, nb.x, nb.y);
    }
    if (this.running) {
      const { x, y } = this.room.clock;
      const E = this.gears.get(this.room.outputId)!.node;
      g.lineStyle(4, 0xfff0a0, 0.95);
      g.lineBetween(E.x, E.y, x, y);
    }
    // where the power pools: a pulsing sparkle at each break (never a red error)
    const peg = this.pegs.get(this.room.solution.pegId)!;
    if (!this.running) {
      const probe: GearNode = { id: '_probe', teeth: this.room.solution.teeth, x: peg.x, y: peg.y };
      for (const n of this.placedNodes()) {
        if (!this.isPowered(n.id) || !meshes(probe, n)) continue;
        const r = pitchRadius(n.teeth);
        const d = Math.hypot(peg.x - n.x, peg.y - n.y);
        const px = n.x + ((peg.x - n.x) * r) / d;
        const py = n.y + ((peg.y - n.y) * r) / d;
        g.fillStyle(GOLD, 0.25 + pulse * 0.35);
        g.fillCircle(px, py, 14 + pulse * 12);
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(px, py, 5);
      }
      g.lineStyle(3, 0xffffff, 0.4 + pulse * 0.5);
      g.strokeCircle(peg.x, peg.y, 18 + pulse * 10);
    }
  }

  private updateHints(): void {
    if (this.running || this.dragging) return;
    if (this.idle < this.nextHintAt) return;
    this.idle = 0;
    if (this.style.id === 'tinker') {
      this.pulseCorrectPart();
      this.nextHintAt = 20;
    } else if (this.style.id === 'fixer') {
      if (this.hintTier < 2) this.nextHint();
      else this.pulseCorrectPart();
      this.nextHintAt = 45;
    } else {
      this.nextHintAt = 1e9; // Engineer: hints only on request
    }
  }
}
