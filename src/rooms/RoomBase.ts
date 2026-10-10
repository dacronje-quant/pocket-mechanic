import { roomVoiceId } from '../content/roomVoice';
/**
 * Everything every room shares: the backdrop, Kip (and Tess), the HUD, the
 * parts drawer and drag-and-snap, hints, the Peek Lens, Golden Gears, Lost
 * Treasures and Magnus Marks, fiddle toys, dark rooms with the Outside Hands
 * flashlight, Tune-Up medals, saving, and the "Fixed!" moment.
 * Each room kind subclasses this and draws its own mechanism.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { playMusic, setMusicProgress } from '../audio/music';
import { setLevels } from '../audio/engine';
import { setVoiceChip, speak } from '../audio/voice';
import { drawRoomBackdrop, sunbeams } from '../art/backgrounds';
import { Kip } from '../art/Kip';
import { PALETTES } from '../art/palette';
import { CM } from '../art/copperMoss';
import { drawerFinish, etchedPlate, repairMounts } from '../art/finish';
import { beginArtScene } from '../art/generated';
import { drawPart } from '../art/parts';
import { ensureBasics, ensureGearTexture } from '../art/textures';
import { getRoom, isBigFix, quickFixOf } from '../content/index';
import { MARKS, repairOfRoom, TREASURES } from '../content/repairs';
import { LINES } from '../content/story';
import type { PlayStyleId, RoomDef, RoomKind } from '../content/types';
import { afterRoom, type RoomLaunch } from '../core/journey';
import {
  awardGold,
  checkStamps,
  findBlueprint,
  findMark,
  findTreasure,
  markFixed,
  medalFor,
  record,
  setFlag,
  tessUnlocked,
} from '../core/progress';
import { persist, persistSoon, profile, settings } from '../core/save';
import { closingDue, markClosed, tickPlayTime, windDownActive } from '../core/session';
import { PLAY_STYLES, type PlayStyle } from '../core/styles';
import { pm } from '../debug';
import { effective, initialState, isSolved, solutionState, type Effective, type StateOf } from '../rules';
import { FIDDLE_SPOTS, makeFiddle, THEME_FIDDLES } from './fiddles';
import { blocker, card, FONT, roundButton, SERIF, setButtonIcon, showWords, SpeechBubble, toast } from '../ui/widgets';
import { go, resetLeaving } from '../scenes/router';
import { toggleFullscreen } from '../platform';

export const D = {
  bg: 0,
  back: 4,
  mech: 10,
  parts: 20,
  widget: 24,
  fx: 30,
  kip: 36,
  tray: 40,
  trayPart: 46,
  spots: 50,
  dark: 54,
  peek: 60,
  blueprint: 64,
  drag: 70,
  hud: 80,
  bubble: 90,
  banner: 100,
};

export const FLOOR_Y = 700;
export const TRAY = { x: 640, y: 598, h: 92 };

export interface HintTarget {
  from?: { x: number; y: number };
  to?: { x: number; y: number };
}

export interface SnapTarget {
  id: string;
  x: number;
  y: number;
}

export interface DragSpec {
  obj: Phaser.GameObjects.Container | Phaser.GameObjects.Image;
  targets: () => SnapTarget[];
  /** Would this target take the part? (ghost preview + Little Tinker snap-on-hover) */
  accepts?: (t: SnapTarget) => boolean;
  /** Called on release with the nearest target in snap range (or null). */
  drop: (t: SnapTarget | null) => void;
  pick?: () => void;
  /** Scale while lying in the drawer. */
  restScale?: number;
}

type AnyDef = Effective<RoomDef>;

export abstract class RoomBase<K extends RoomKind = RoomKind> extends Phaser.Scene {
  protected launch!: RoomLaunch;
  protected def!: Effective<Extract<RoomDef, { kind: K }>>;
  protected style!: PlayStyle;
  protected state!: StateOf[K];
  protected kip!: Kip;
  protected tess?: Kip;
  protected bubble!: SpeechBubble;
  protected fixed = false;
  protected moves = 0;
  protected hintsUsed = 0;
  protected peeksUsed = 0;
  protected elapsed = 0;
  protected idle = 0;
  protected peeking = false;
  protected undoStack: Array<() => void> = [];
  protected sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  protected stars!: Phaser.GameObjects.Particles.ParticleEmitter;
  protected blueprint!: Phaser.GameObjects.Graphics;
  protected ghostG!: Phaser.GameObjects.Graphics;
  protected trayW = 760;
  /** Kinds with a "Go"/"Run" button check after the run instead of after every action. */
  protected liveCheck = true;
  private peekOverlay!: Phaser.GameObjects.Rectangle;
  private peekBtn?: Phaser.GameObjects.Container;
  private goldText!: Phaser.GameObjects.Text;
  private goldIcon!: Phaser.GameObjects.Image;
  private soundBtn!: Phaser.GameObjects.Container;
  private beamG!: Phaser.GameObjects.Graphics;
  private hintG!: Phaser.GameObjects.Graphics;
  private dropG!: Phaser.GameObjects.Graphics;
  private dark?: Phaser.GameObjects.RenderTexture;
  private hands?: Phaser.GameObjects.Graphics;
  private torch = { x: 640, y: 360 };
  private usedHands = false;
  private usedTess = false;
  private hintStage = 0;
  private hintTier = 0;
  private fiddled = new Set<string>();
  private spots: Array<{ obj: Phaser.GameObjects.Container; kind: 'gold' | 'treasure' | 'blueprint' | 'mark' }> = [];
  private dragging = new Map<number, { spec: DragSpec; who: 'kip' | 'tess' }>();
  private primaryPointer = -1;
  private bannerShown = false;
  private timerText?: Phaser.GameObjects.Text;
  private playTimer = 0;
  private ghostVisible = false;
  private pathPulse = 0;

  // ───────────────────────────── for the room kinds ─────────────────────────────

  /** Draw the mechanism and the drawer parts. */
  protected abstract build(): void;
  /** Re-render everything from `this.state`. */
  protected abstract refresh(): void;
  /** Where the next part is, and where it goes (hints point and draw a path). */
  protected abstract hintTarget(): HintTarget | null;
  /** Peek Lens: draw power flow and breaks. */
  protected drawBlueprint(_g: Phaser.GameObjects.Graphics, _pulse: number): void {}
  /** Ghost outlines of missing parts. */
  protected drawGhosts(_g: Phaser.GameObjects.Graphics, _alpha: number): void {}
  protected tick(_dt: number): void {}
  /** How many player actions the authored solution takes (Tune-Up par). */
  protected solutionSteps(): number {
    return 3;
  }
  /** Room-specific clever objectives (Golden Gear ③). */
  protected specialDone(_id: string): boolean {
    return false;
  }
  /** Debug/Playground: jump to the authored solution. */
  protected applySolution(): void {
    this.state = solutionState(this.def as never, this.style.id) as StateOf[K];
    this.refresh();
  }

  // ───────────────────────────── lifecycle ─────────────────────────────

  init(data: { launch: RoomLaunch }): void {
    this.launch = data.launch;
    const raw = getRoom(this.launch.roomId) as RoomDef;
    const p = profile();
    const sid: PlayStyleId = this.launch.mode === 'tuneup' ? 'engineer' : p.style;
    this.style = PLAY_STYLES[sid];
    this.def = effective(raw, sid) as unknown as Effective<Extract<RoomDef, { kind: K }>>;
    this.state = initialState(this.def as never) as StateOf[K];
    this.fixed = false;
    this.moves = 0;
    this.hintsUsed = 0;
    this.peeksUsed = 0;
    this.elapsed = 0;
    this.idle = 0;
    this.peeking = false;
    this.undoStack = [];
    this.fiddled = new Set();
    this.spots = [];
    this.dragging = new Map();
    this.bannerShown = false;
    this.hintStage = 0;
    this.hintTier = 0;
    this.usedHands = false;
    this.usedTess = false;
    this.ghostVisible = false;
    this.playTimer = 0;
    this.dark = undefined;
    this.tess = undefined;
  }

  create(): void {
    beginArtScene(this);
    resetLeaving();
    const s = settings();
    ensureBasics(this);
    setLevels({ muted: s.muted, music: s.music, sfx: s.sfx, voice: s.voice });
    sfx.setSoft(s.soft);
    setVoiceChip(profile().look.voice);
    const pal = PALETTES[this.def.theme];

    drawRoomBackdrop(this, this.def.theme, FLOOR_Y).setDepth(D.bg);
    repairMounts(this);
    // Quiet only the working area; the painted scenery remains visible around it.
    this.add.graphics().setDepth(D.back).fillStyle(CM.paper, .22).fillRoundedRect(192, 192, 896, 348, 18).setName('mechanism:quiet-backing');
    if (this.def.theme === 'clock' || this.def.theme === 'shop' || this.def.theme === 'tower') sunbeams(this, pal.light, 0.045).setDepth(D.back);
    if (!s.calm) {
      this.add
        .particles(0, 0, 'mote', {
          x: { min: 200, max: 1150 },
          y: { min: 80, max: 600 },
          lifespan: 6000,
          speedX: { min: -8, max: 8 },
          speedY: { min: -6, max: 6 },
          alpha: { start: 0, end: 0.45, ease: 'Sine.easeInOut' },
          scale: { min: 0.5, max: 1.2 },
          frequency: 260,
          blendMode: 'ADD',
        })
        .setDepth(D.fx);
    }
    this.drawTray();
    this.buildFx();

    this.kip = new Kip(this, 1150, FLOOR_Y, profile().look).setDepth(D.kip);
    this.kip.setInteractive(new Phaser.Geom.Rectangle(-5, -45, 80, 100), Phaser.Geom.Rectangle.Contains);
    this.kip.on('pointerup', () => {
      sfx.beeps('boop', profile().look.voice);
      if (this.style.id === 'tinker' || !this.canPeek()) this.kip.celebrate();
      else this.togglePeek();
    });
    if (s.coop === 'tess' && tessUnlocked(profile())) {
      this.tess = new Kip(this, 140, FLOOR_Y, profile().tessLook, 'tess').setDepth(D.kip);
      this.tess.minX = 60;
      this.tess.maxX = 1220;
    }

    this.build();
    this.buildFiddles();
    this.buildSpots();
    this.buildHud();
    this.setupInput();
    if (this.def.dark) this.buildDarkness();
    if (windDownActive()) this.add.rectangle(0, 0, 1280, 720, 0xff9e57, 0.08).setOrigin(0).setDepth(D.dark - 1);

    this.refresh();
    if (this.launch.mode === 'playground') {
      this.applySolution();
      this.fixed = true;
    }

    const rep = repairOfRoom(this.def.id);
    const progress = rep ? rep.rooms.filter((id) => profile().rooms[id]?.fixed).length / rep.rooms.length : 0.5;
    playMusic(this.def.theme, this.launch.mode === 'playground' ? 1 : progress, windDownActive());

    this.titleCard();
    this.cameras.main.fadeIn(300, 26, 18, 12);
    if (this.launch.mode !== 'playground') {
      this.time.delayedCall(1300, () => this.bubble.say(this.def.intro, { id: roomVoiceId(this.def, this.style.id, 'intro') }));
    }
    pm.scene = this.scene.key;
    pm.next = null;
    pm.hot = {};
    pm.room = {
      roomId: this.def.id,
      kind: this.def.kind,
      isFixed: () => this.fixed,
      solve: () => this.debugSolve(),
      bannerShown: () => this.bannerShown,
    };
    this.events.once('shutdown', () => {
      if (pm.room?.roomId === this.def.id) pm.room = null;
    });
    this.time.addEvent({ delay: 5000, loop: true, callback: tickPlayTime });
  }

  /** Apply the authored solution through the room's own pipeline (used by the automated playthrough). */
  protected debugSolve(): void {
    this.applySolution();
    this.afterSolutionApplied();
  }

  /** Kinds that need a run (trains, chains, cards) override this to run it. */
  protected afterSolutionApplied(): void {
    this.checkSolved();
  }

  // ───────────────────────────── shared drawing ─────────────────────────────

  private drawTray(): void {
    const pal = PALETTES[this.def.theme];
    const g = this.add.graphics().setDepth(D.tray);
    const w = this.trayW;
    const { x, y, h } = TRAY;
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x - w / 2 + 6, y - h / 2 + 10, w, h, 14);
    g.fillStyle(pal.tray[0], 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    g.fillStyle(pal.tray[1], 1);
    g.fillRoundedRect(x - w / 2 + 12, y - h / 2 + 10, w - 24, h - 28, 10);
    g.fillStyle(Phaser.Display.Color.ValueToColor(pal.tray[0]).lighten(15).color, 1);
    g.fillRoundedRect(x - w / 2, y + h / 2 - 20, w, 20, 8);
    g.fillStyle(0xbca16a, 1);
    g.fillRoundedRect(x - 30, y + h / 2 - 15, 60, 10, 5);
    drawerFinish(g, x - w / 2, y - h / 2, w, h);
    g.lineStyle(1, CM.ink, 0.55);
    g.strokeRoundedRect(x - 30, y + h / 2 - 15, 60, 10, 5);
    g.setData('tray', true);
  }

  /** Evenly spaced resting spots in the drawer. */
  protected traySpots(n: number): Array<{ x: number; y: number }> {
    const w = this.trayW - 120;
    if (n <= 0) return [];
    if (n === 1) return [{ x: TRAY.x, y: TRAY.y - 6 }];
    return Array.from({ length: n }, (_, i) => ({ x: TRAY.x - w / 2 + (i * w) / (n - 1), y: TRAY.y - 6 }));
  }

  private buildFx(): void {
    this.sparks = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 40, max: 180 },
        lifespan: { min: 300, max: 650 },
        scale: { start: 1.1, end: 0 },
        tint: [0xf1d391, 0xfff3b0, 0xffb347],
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
      .setDepth(D.banner + 2);
    this.beamG = this.add.graphics().setDepth(D.drag - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.hintG = this.add.graphics().setDepth(D.drag - 2);
    this.dropG = this.add.graphics().setDepth(D.drag - 3);
    this.ghostG = this.add.graphics().setDepth(D.parts - 1);
    this.peekOverlay = this.add.rectangle(0, 0, 1280, 720, PALETTES[this.def.theme].peek, 0.66).setOrigin(0).setDepth(D.peek).setVisible(false);
    this.blueprint = this.add.graphics().setDepth(D.blueprint).setVisible(false);
  }

  /** The signature CLUNK (GDD §9.3): sound, sparks, camera bump, haptic, Kip. */
  protected clunkAt(x: number, y: number): void {
    sfx.clunk();
    sfx.buzz(30);
    if (!settings().calm) {
      this.cameras.main.shake(90, 0.004);
      this.sparks.explode(22, x, y);
    } else this.sparks.explode(6, x, y);
    this.kip.lookToward(x);
  }

  protected sparkleAt(x: number, y: number, n = 10): void {
    this.sparks.explode(settings().calm ? Math.ceil(n / 3) : n, x, y);
  }

  /** A part that won't go: a gentle "nuh-uh" wiggle, then back to the drawer. */
  protected refuse(obj: Phaser.GameObjects.Container | Phaser.GameObjects.Image, at: { x: number; y: number }, home: { x: number; y: number }, restScale = 0.75): void {
    sfx.nuhUh();
    sfx.buzz(12);
    this.kip.shrug();
    this.tweens.killTweensOf(obj);
    this.tweens.chain({
      targets: obj,
      tweens: [
        { x: at.x, y: at.y, duration: 120, ease: 'Quad.easeOut' },
        { x: at.x + 10, duration: 60, yoyo: true, repeat: 2 },
      ],
      onComplete: () => this.floatHome(obj, home, restScale),
    });
  }

  protected floatHome(obj: Phaser.GameObjects.Container | Phaser.GameObjects.Image, home: { x: number; y: number }, restScale = 0.75): void {
    this.tweens.killTweensOf(obj);
    obj.setDepth(D.trayPart);
    this.tweens.add({ targets: obj, x: home.x, y: home.y, scale: restScale, angle: 0, duration: 420, ease: 'Back.easeOut' });
  }

  // ───────────────────────────── drag & snap ─────────────────────────────

  protected snapRadius(): number {
    return this.style.snapRadius * settings().snap;
  }

  /** Make an object draggable with snap-to-target behaviour. */
  protected enableDrag(spec: DragSpec): void {
    const o = spec.obj;
    if (!o.input) {
      if (o instanceof Phaser.GameObjects.Container) o.setInteractive({ draggable: true, useHandCursor: true });
      else o.setInteractive({ draggable: true, useHandCursor: true, pixelPerfect: false });
    } else this.input.setDraggable(o, true);
    o.setData('drag', spec);
    // High contrast (GDD §25.2): a bright outline on everything you can pick up
    if (settings().contrast && this.renderer.type === Phaser.WEBGL) o.postFX?.addGlow(0xfff36b, 3, 0, false, 0.1, 10);
  }

  private nearestTarget(spec: DragSpec, x: number, y: number): SnapTarget | null {
    let best: SnapTarget | null = null;
    let bd = this.snapRadius();
    for (const t of spec.targets()) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (d <= bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  }

  private setupInput(): void {
    this.input.dragDistanceThreshold = 6;
    this.input.addPointer(2);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      sfx.unlockAudio();
      const anyDown = this.input.manager.pointers.some((q) => q.isDown && q.id !== p.id);
      if (!anyDown) this.primaryPointer = p.id;
      this.torch = { x: p.worldX, y: p.worldY };
      if (p.id !== this.primaryPointer && this.dark && settings().coop === 'hands') this.usedHands = true;
      if (over.length === 0 && p.worldY > 560) {
        const who = p.id !== this.primaryPointer && this.tess ? this.tess : this.kip;
        who.walkTo(p.worldX);
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging.has(p.id) && p.isDown) this.torch = { x: p.worldX, y: p.worldY };
    });
    this.input.on('dragstart', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const spec = obj.getData('drag') as DragSpec | undefined;
      if (!spec || this.fixed && this.launch.mode !== 'playground' && this.bannerShown) return;
      const who: 'kip' | 'tess' = this.tess && p.id !== this.primaryPointer ? 'tess' : 'kip';
      if (who === 'tess') this.usedTess = true;
      this.dragging.set(p.id, { spec, who });
      this.idle = 0;
      obj.setData('snapped', false);
      sfx.pickUp();
      this.tweens.killTweensOf(spec.obj);
      spec.obj.setDepth(D.drag);
      this.tweens.add({ targets: spec.obj, scale: 1, duration: 120, ease: 'Back.easeOut' });
      spec.pick?.();
    });
    this.input.on('drag', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, x: number, y: number) => {
      const d = this.dragging.get(p.id);
      if (!d || obj.getData('snapped')) return;
      d.spec.obj.setPosition(x, y);
      const ch = d.who === 'tess' && this.tess ? this.tess : this.kip;
      ch.walkTo(x + (x > ch.x ? -90 : 90));
      ch.lookToward(x);
      const t = this.nearestTarget(d.spec, x, y);
      if (t && this.style.snapOnHover && (!d.spec.accepts || d.spec.accepts(t))) {
        obj.setData('snapped', true);
        this.dragging.delete(p.id);
        this.registerTouch();
        d.spec.drop(t);
      }
    });
    this.input.on('dragend', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const d = this.dragging.get(p.id);
      this.dragging.delete(p.id);
      if (!d) return;
      if (obj.getData('snapped')) {
        obj.setData('snapped', false);
        return;
      }
      const t = this.nearestTarget(d.spec, d.spec.obj.x, d.spec.obj.y);
      this.registerTouch();
      d.spec.drop(t);
    });
  }

  private registerTouch(): void {
    this.idle = 0;
  }

  /** Every player action: count it, remember how to undo it, and check the machine. */
  protected act(undo?: () => void): void {
    this.moves++;
    this.idle = 0;
    this.hintStage = 0;
    if (undo) this.undoStack.push(undo);
    this.hintG.clear();
    if (this.fixed && this.launch.mode !== 'playground') this.recheckClever();
    else if (this.liveCheck) this.checkSolved();
  }

  /** Golden Gear ③ can still be earned after the fix (keep playing). */
  protected recheckClever(): void {
    const p = profile();
    if (this.cleverMet() && awardGold(p, this.def.id, 3)) {
      persist();
      this.refreshGold();
      this.flyGold(this.kip.x, this.kip.y - 80);
    }
  }

  protected rewind(): void {
    const u = this.undoStack.pop();
    if (!u || (this.fixed && this.launch.mode !== 'playground')) {
      sfx.nuhUh();
      return;
    }
    sfx.whirr();
    u();
    this.refresh();
  }

  protected checkSolved(): void {
    if (this.fixed) return;
    if (isSolved(this.def as never, this.state as never, this.style.id)) this.onFixed();
  }

  // ───────────────────────────── fixed! ─────────────────────────────

  protected onFixed(): void {
    if (this.fixed) return;
    this.fixed = true;
    const p = profile();
    const calm = settings().calm;
    sfx.fanfare();
    sfx.buzz(60);
    if (!calm) {
      this.cameras.main.flash(250, 255, 236, 180);
      this.cameras.main.zoomTo(1.05, 500, 'Sine.easeInOut', true);
      this.time.delayedCall(1600, () => this.cameras.main.zoomTo(1, 600, 'Sine.easeInOut', true));
    }
    this.stars.explode(calm ? 10 : 40, 640, 330);
    this.kip.celebrate();
    this.tess?.celebrate();
    this.bubble.hide();
    this.hintG.clear();
    if (this.launch.mode === 'playground') return;
    if (this.launch.mode === 'free') {
      // Nest Studio and other free builds: just celebrate, nothing to record
      this.time.delayedCall(1500, () => this.showBanner([], 0));
      return;
    }

    const mode = this.launch.mode;
    const report = markFixed(p, this.def.id, { quick: mode === 'quick', attic: mode === 'attic' });
    const goldNew: number[] = [];
    if (awardGold(p, this.def.id, 1)) goldNew.push(1);
    if (this.cleverMet()) {
      if (awardGold(p, this.def.id, 3)) goldNew.push(3);
    }
    if (this.hintsUsed === 0) setFlag(p, 'noHints');
    if (this.dark) setFlag(p, 'dark');
    if (this.usedHands) setFlag(p, 'hands');
    if (this.usedTess || this.tess) setFlag(p, 'coop');
    let medal = 0;
    if (mode === 'tuneup') {
      const par = this.def.par ?? { moves: this.solutionSteps(), seconds: 30 + this.solutionSteps() * 20 };
      medal = medalFor(par, this.moves, this.elapsed, this.hintsUsed, this.peeksUsed);
      const r = record(p, this.def.id);
      r.medal = Math.max(r.medal, medal);
      if (!r.best || this.moves < r.best.moves) r.best = { moves: this.moves, secs: Math.round(this.elapsed) };
    }
    const stamps = [...report.newStamps, ...checkStamps(p)];
    persist();
    this.refreshGold();
    if (report.tool) this.time.delayedCall(900, () => toast(this, `New tool: ${toolName(report.tool!)}!`, (g) => drawPart(g, report.tool!, 0, 0, 0.6)));
    stamps.forEach((st, i) => this.time.delayedCall(1800 + i * 2600, () => toast(this, `Stamp: ${st.name}`, undefined, st.glyph)));
    goldNew.filter((n) => n === 1).forEach(() => this.time.delayedCall(700, () => this.flyGold(640, 330)));
    goldNew.filter((n) => n === 3).forEach(() => this.time.delayedCall(1300, () => this.flyGold(this.kip.x, this.kip.y - 80)));
    const rep = repairOfRoom(this.def.id);
    if (rep) setMusicProgress(rep.rooms.filter((id) => p.rooms[id]?.fixed).length / rep.rooms.length);

    if (mode === 'story' && isBigFix(this.def.id)) {
      // the Test Run follows straight on
      this.time.delayedCall(2600, () => go(this, afterRoom(p, this.launch)));
      return;
    }
    this.time.delayedCall(1500, () => this.showBanner(goldNew, medal));
  }

  private cleverMet(): boolean {
    const c = this.def.clever ?? { kind: 'fiddle' as const };
    switch (c.kind) {
      case 'fiddle':
        return this.fiddled.size >= 5;
      case 'par':
        return this.moves <= (this.def.par?.moves ?? this.solutionSteps());
      case 'noHints':
        return this.hintsUsed === 0;
      case 'noPeek':
        return this.peeksUsed === 0;
      case 'special':
        return this.specialDone(c.id);
    }
  }

  private flyGold(x: number, y: number): void {
    const gg = this.add.image(x, y, ensureGearTexture(this, 12, 'gold')).setDepth(D.banner + 3).setScale(0.2);
    const glow = this.add.image(x, y, 'glow').setDepth(D.banner + 2).setScale(2).setBlendMode(Phaser.BlendModes.ADD);
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
        sfx.ding(1760);
        this.refreshGold();
        this.tweens.add({ targets: [this.goldIcon, this.goldText], scale: 1.35, duration: 120, yoyo: true });
      },
    });
    this.tweens.add({ targets: glow, alpha: 0, scale: 4, duration: 900, onComplete: () => glow.destroy() });
  }

  private showBanner(goldNew: number[], medal: number): void {
    this.bannerShown = true;
    const p = profile();
    const W = 1280;
    const c = this.add.container(W / 2, 330).setDepth(D.banner).setScale(0.6).setAlpha(0);
    c.add(card(this, 0, 0, 520, 300));
    c.add(this.add.image(-170, -70, ensureGearTexture(this, 16, 'gold')).setScale(1.1));
    c.add(this.add.text(30, -78, showWords() ? 'Fixed!' : '✓', { fontFamily: SERIF, fontSize: '64px', color: '#342f29', fontStyle: 'bold' }).setOrigin(0.5));
    const rec = p.rooms[this.def.id];
    for (let i = 1; i <= 3; i++) {
      const got = rec?.gold.includes(i);
      const img = this.add.image(-90 + (i - 1) * 90, 10, ensureGearTexture(this, 12, got ? 'gold' : 'ghost')).setScale(got ? 1 : 0.9);
      c.add(img);
      if (goldNew.includes(i)) this.tweens.add({ targets: img, scale: 1.3, duration: 200, yoyo: true, repeat: 2 });
    }
    if (medal) {
      const names = ['', 'Copper', 'Silver', 'Gold', 'Brass Masterpiece'];
      const cols = ['', '#b87333', '#c0c0c0', '#ffd700', '#e0ab48'];
      c.add(this.add.text(0, 62, `${'●'.repeat(medal)} ${names[medal]}`, { fontFamily: FONT, fontSize: '26px', color: cols[medal], fontStyle: 'bold', stroke: '#342f29', strokeThickness: 5 }).setOrigin(0.5));
    }
    const next = afterRoom(p, this.launch);
    pm.next = () => this.leave(next);
    const btnY = 112;
    c.add(roundButton(this, -120, btnY, '↻', () => this.scene.restart(), { r: 36, fontSize: 34, say: 'Again!' }));
    c.add(roundButton(this, 0, btnY, '⌂', () => this.leave({ scene: 'shop' }), { r: 36, fontSize: 34, say: 'Back to the shop' }));
    c.add(roundButton(this, 120, btnY, '▶', () => this.leave(next), { r: 42, fontSize: 38, color: 0xa0a477, say: 'Next!' }));
    c.add(
      roundButton(this, 236, -128, '✕', () => {
        this.bannerShown = false;
        this.tweens.add({ targets: c, alpha: 0, scale: 0.8, duration: 200, onComplete: () => c.destroy() });
        this.time.delayedCall(250, () => {
          if (!this.bannerShown) this.keepPlayingButton(next);
        });
      }, { r: 24, fontSize: 20, say: 'Keep playing' }),
    );
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 350, ease: 'Back.easeOut' });
    if (this.launch.mode === 'quick') {
      const qf = quickFixOf(this.def.id);
      if (qf) this.time.delayedCall(500, () => void speak(qf.owner, qf.payoff, `${qf.id}.payoff`));
    } else {
      void speak('nana', LINES['room.fixed'].text, 'room.fixed');
    }
  }

  /** After closing the banner: a small "next" button stays in the corner. */
  private keepPlayingButton(next: Parameters<typeof go>[1]): void {
    roundButton(this, 1180, 470, '▶', () => this.leave(next), { r: 36, fontSize: 32, color: 0xa0a477, say: 'Next!' }).setDepth(D.hud);
  }

  protected leave(step: Parameters<typeof go>[1]): void {
    if (closingDue(true)) {
      markClosed();
      go(this, { scene: 'story', id: 'closing-time', next: { scene: 'shop' } });
      return;
    }
    go(this, step);
  }

  // ───────────────────────────── fiddle toys & secrets ─────────────────────────────

  private buildFiddles(): void {
    const kinds = THEME_FIDDLES[this.def.theme];
    kinds.forEach((k, i) => {
      const s = FIDDLE_SPOTS[i];
      makeFiddle(this, k, s.x, s.y, () => this.fiddle(`${k}${i}`)).setDepth(D.parts);
    });
  }

  protected fiddle(id: string): void {
    const p = profile();
    this.idle = 0;
    if (!this.fiddled.has(id)) {
      this.fiddled.add(id);
      p.stats.fiddles++;
      p.shiny += 1;
      persistSoon();
      for (const st of checkStamps(p)) toast(this, `Stamp: ${st.name}`, undefined, st.glyph);
    }
    if (this.fiddled.size === 5 && this.def.clever?.kind === 'fiddle' && this.fixed && this.launch.mode !== 'playground') {
      if (awardGold(p, this.def.id, 3)) {
        persist();
        this.flyGold(this.kip.x, this.kip.y - 80);
      }
    }
  }

  private buildSpots(): void {
    const p = profile();
    const d = this.def as AnyDef;
    const hidden = d.hidden ?? { x: 210, y: 150 };
    if (this.launch.mode !== 'playground' && !p.rooms[d.id]?.gold.includes(2)) {
      this.spot(hidden.x, hidden.y, 'gold', () => {
        if (awardGold(p, d.id, 2)) {
          persist();
          this.flyGold(hidden.x, hidden.y);
          void speak('nana', LINES['room.gold'].text, 'room.gold');
        }
      });
    }
    if (d.treasure && !p.treasures.includes(d.treasure.id)) {
      const t = d.treasure;
      this.spot(t.x, t.y, 'treasure', () => {
        if (findTreasure(p, t.id)) {
          persist();
          sfx.sparkle();
          toast(this, `Lost Treasure: ${TREASURES[t.id].name}`, (g) => drawPart(g, 'heart', 0, 0, 0.6));
          void speak('nana', LINES['room.treasure'].text, 'room.treasure');
          for (const st of checkStamps(p)) toast(this, `Stamp: ${st.name}`, undefined, st.glyph);
        }
      });
    }
    if (d.mark) {
      const markId = Object.entries(MARKS).find(([, m]) => repairOfRoom(d.id)?.id === m.repair)?.[0];
      if (markId && !p.marks.includes(markId)) {
        const m = d.mark;
        this.spot(m.x, m.y, 'mark', () => {
          if (findMark(p, d.id)) {
            persist();
            sfx.flap();
            toast(this, `Magnus Mark: ${MARKS[markId].name}`, undefined, '🪶');
            void speak('nana', LINES['room.mark'].text, 'room.mark');
          }
        });
      }
    }
    if (d.blueprint && !p.blueprints.includes(d.blueprint.id)) {
      const b = d.blueprint;
      this.spot(b.x, b.y, 'blueprint', () => {
        if (findBlueprint(p, b.id)) {
          persist();
          sfx.sparkle();
          toast(this, 'A blueprint for the Invention Bench!', undefined, '📜');
        }
      });
    }
  }

  private spot(x: number, y: number, kind: 'gold' | 'treasure' | 'blueprint' | 'mark', onFind: () => void): void {
    const c = this.add.container(x, y).setDepth(D.spots);
    const g = this.add.graphics();
    if (kind === 'mark') {
      g.fillStyle(0x111118, 1);
      g.fillEllipse(0, 0, 10, 36);
      g.fillStyle(0x2a4bd8, 0.6);
      g.fillEllipse(-2, -4, 5, 24);
      g.lineStyle(2, 0x111118, 1);
      g.lineBetween(0, 16, 2, 26);
      c.setAngle(25);
    } else {
      // a soft halo behind the glint, so it reads on light and dark scenery
      g.fillStyle(0xfff3b0, 0.35);
      g.fillCircle(0, 0, 22);
      g.fillStyle(0x342f29, 0.35);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        g.fillTriangle(Math.cos(a) * 29, Math.sin(a) * 29, Math.cos(a + 1.3) * 8, Math.sin(a + 1.3) * 8, Math.cos(a - 1.3) * 8, Math.sin(a - 1.3) * 8);
      }
      g.fillStyle(kind === 'treasure' ? 0xff8fab : kind === 'blueprint' ? 0x7fd3ff : 0xf1d391, 1);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        g.fillTriangle(Math.cos(a) * 26, Math.sin(a) * 26, Math.cos(a + 1.3) * 6, Math.sin(a + 1.3) * 6, Math.cos(a - 1.3) * 6, Math.sin(a - 1.3) * 6);
      }
      g.fillCircle(0, 0, 6);
    }
    c.add(g);
    c.setSize(70, 70);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      if (!c.active || c.getData('found')) return;
      c.setData('found', true);
      this.tweens.add({ targets: c, scale: 2, alpha: 0, duration: 400, onComplete: () => c.destroy() });
      onFind();
    });
    this.spots.push({ obj: c, kind });
  }

  /**
   * Hidden finds rest as a faint glint and every few seconds twinkle brightly (a flash, a swell and
   * a few sparks), each on its own beat, so a child playing the board notices them.
   */
  private updateSpots(): void {
    const style = this.style.id;
    const calm = settings().calm;
    const period = 2.2;
    for (const s of this.spots) {
      if (!s.obj.active || s.obj.getData('found')) continue;
      const rest =s.kind === 'mark' ? 0.75 : this.peeking ? 0.95 : style === 'tinker' ? 0.6 : style === 'engineer' ? 0.28 : 0.42;
      const t = (this.elapsed + (s.obj.x * 0.0037 + s.obj.y * 0.0021) * period) % period;
      const flash = t < 0.7 ? Math.sin((t / 0.7) * Math.PI) : 0;
      const shimmer = 0.85 + Math.sin(this.elapsed * 5 + s.obj.x) * 0.15;
      s.obj.setAlpha(Math.min(1, rest * shimmer + flash * (1 - rest)));
      s.obj.setScale(1 + flash * 0.8);
      const was = s.obj.getData('flashing') as boolean | undefined;
      if (flash > 0 && !was && !calm && !this.peeking) this.sparks.explode(4, s.obj.x, s.obj.y);
      s.obj.setData('flashing', flash > 0);
      s.obj.setDepth(this.peeking ? D.blueprint + 2 : D.spots);
      if (s.kind !== 'mark') s.obj.rotation += 0.01 + flash * 0.06;
    }
  }

  // ───────────────────────────── HUD ─────────────────────────────

  protected canPeek(): boolean {
    return this.style.id !== 'tinker' && (profile().tools.includes('peek') || this.launch.mode === 'tuneup' || this.launch.mode === 'attic');
  }

  private buildHud(): void {
    const ledger = this.add.graphics().setDepth(D.hud - 1);
    etchedPlate(ledger, 104, 24, 138, 56, CM.paper, 0.95, 46);
    roundButton(this, 56, 52, '⌂', () => this.pauseMenu(), { say: 'Menu' }).setDepth(D.hud);
    this.goldIcon = this.add.image(138, 52, ensureGearTexture(this, 12, 'gold')).setDepth(D.hud).setScale(0.9);
    this.goldText = this.add
      .text(174, 52, '', { fontFamily: FONT, fontSize: '30px', color: '#342f29', fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(D.hud);
    this.refreshGold();
    let x = 1224;
    roundButton(this, x, 52, '⛶', () => toggleFullscreen(this), { fontSize: 30 }).setDepth(D.hud);
    x -= 90;
    this.soundBtn = roundButton(this, x, 52, settings().muted ? '🔇' : '🔊', () => this.toggleSound(), { fontSize: 28 }).setDepth(D.hud);
    x -= 90;
    roundButton(this, x, 52, '↺', () => this.rewind(), { fontSize: 38, say: 'Undo' }).setDepth(D.hud);
    if (this.canPeek()) {
      x -= 90;
      this.peekBtn = roundButton(this, x, 52, '🔍', () => this.togglePeek(), { fontSize: 30, say: 'Peek' }).setDepth(D.hud);
    }
    if (this.style.id === 'engineer') {
      x -= 90;
      roundButton(this, x, 52, '?', () => this.requestHint(), { fontSize: 38 }).setDepth(D.hud);
    }
    x -= 90;
    // Hear it again: replays whatever was said last (a hint you missed); pressed while a line is
    // showing, or before anything was said, it gives the room's main instruction.
    roundButton(this, x, 52, '💬', () => {
      if (this.bubble.showing || !this.bubble.replay()) this.bubble.say(this.def.intro, { id: roomVoiceId(this.def, this.style.id, 'intro') });
    }, { fontSize: 28, say: '' }).setDepth(D.hud);
    if (tessUnlocked(profile()) && settings().coop !== 'hands') {
      x -= 90;
      roundButton(this, x, 52, '👥', () => this.toggleTess(), { fontSize: 28 }).setDepth(D.hud);
    }
    if (this.launch.mode === 'tuneup') {
      this.timerText = this.add
        .text(640, 52, '', { fontFamily: FONT, fontSize: '24px', color: '#f4ebd5', backgroundColor: '#342f29cc', padding: { x: 14, y: 6 } })
        .setOrigin(0.5)
        .setDepth(D.hud);
    }
    // Dock the bubble in the top bar, between the gear counter and the leftmost button on the
    // right, so it never covers the top of the puzzle while the goal is being explained.
    const left = 262;
    const right = x - 44;
    const width = Math.max(400, Math.min(700, right - left));
    this.bubble = new SpeechBubble(this, left + width / 2, 58, width).setDepth(D.bubble);
  }

  private refreshGold(): void {
    const n = profile().rooms[this.def.id]?.gold.length ?? 0;
    this.goldText.setText(`${n}/3`);
  }

  private toggleSound(): void {
    const s = settings();
    s.muted = !s.muted;
    setLevels({ muted: s.muted });
    persist();
    setButtonIcon(this.soundBtn, s.muted ? '🔇' : '🔊');
  }

  private toggleTess(): void {
    const s = settings();
    if (this.tess) {
      this.tess.destroy();
      this.tess = undefined;
      s.coop = 'off';
    } else {
      this.tess = new Kip(this, 140, FLOOR_Y, profile().tessLook, 'tess').setDepth(D.kip);
      this.tess.celebrate();
      s.coop = 'tess';
    }
    persist();
  }

  protected togglePeek(): void {
    if (!this.canPeek()) return;
    this.peeking = !this.peeking;
    if (this.peeking) {
      this.peeksUsed++;
      profile().stats.peeks++;
      persistSoon();
      this.kip.peek();
    }
    this.peekOverlay.setVisible(this.peeking);
    this.blueprint.setVisible(this.peeking);
    if (this.peekBtn) setButtonIcon(this.peekBtn, this.peeking ? '👁' : '🔍');
    sfx.whirr();
  }

  private pauseMenu(): void {
    const items: Phaser.GameObjects.GameObject[] = [];
    const close = () => items.forEach((o) => o.destroy());
    items.push(blocker(this, D.banner + 10, 0.6, close));
    items.push(card(this, 640, 360, 640, 420).setDepth(D.banner + 10));
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(D.banner + 11);
      items.push(o);
      return o;
    };
    if (showWords()) add(this.add.text(640, 190, this.def.title, { fontFamily: SERIF, fontSize: '30px', color: '#342f29', fontStyle: 'bold' }).setOrigin(0.5));
    add(roundButton(this, 460, 290, '⌂', () => this.leave({ scene: 'shop' }), { r: 46, fontSize: 40, say: 'Back to the shop' }));
    add(roundButton(this, 640, 290, '↻', () => this.scene.restart(), { r: 46, fontSize: 40, say: 'Start again' }));
    add(roundButton(this, 820, 290, '▶', close, { r: 46, fontSize: 40, color: 0xa0a477, say: 'Keep playing' }));
    // switch Play Style any time (GDD §12.1)
    (['tinker', 'fixer', 'engineer'] as PlayStyleId[]).forEach((sid, i) => {
      const st = PLAY_STYLES[sid];
      add(
        roundButton(this, 520 + i * 120, 430, st.icon, () => {
          profile().style = sid;
          persist();
          this.scene.restart();
        }, { r: 40, fontSize: 34, color: profile().style === sid ? 0xd3a278 : 0xbca16a, say: st.tagline }),
      );
    });
  }

  private titleCard(): void {
    if (!showWords()) return;
    const t = this.add.container(640, 330).setDepth(D.banner + 1).setAlpha(0).setAngle(-1);
    const title = this.add.text(0, 0, this.def.title, { fontFamily: SERIF, fontSize: '44px', color: '#342f29', fontStyle: 'bold', align: 'center', wordWrap: { width: 900 } }).setOrigin(0.5);
    const plate = this.add.graphics();
    const w = Math.min(1000, title.width + 90);
    const h = Math.max(94, title.height + 42);
    etchedPlate(plate, -w / 2, -h / 2, w, h, CM.paper, 1, 418);
    t.add([plate, title]);
    this.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, y: 310, duration: 400, ease: 'Quad.easeOut' },
        { alpha: 0, y: 290, duration: 500, delay: 900 },
      ],
      onComplete: () => t.destroy(),
    });
  }

  // ───────────────────────────── hints ─────────────────────────────

  private requestHint(): void {
    const h = this.def.hints;
    const tier = Math.min(this.hintTier, h.length - 1);
    this.hintsUsed++;
    profile().stats.hints++;
    this.bubble.say(h[tier], { id: roomVoiceId(this.def, this.style.id, `hint.${tier}`) });
    if (tier >= 2) this.showPath(true);
    this.hintTier++;
  }

  private updateHints(dt: number): void {
    if (this.fixed || this.dragging.size) return;
    this.idle += dt;
    const at = this.style.hintAt;
    if (!at) return;
    const pace = settings().hintPace;
    const t = this.idle / pace;
    if (this.hintStage === 0 && t > at.point) {
      this.hintStage = 1;
      const h = this.hintTarget();
      if (h?.from) this.kip.point(h.from.x);
      else if (h?.to) this.kip.point(h.to.x);
      sfx.chirp();
    } else if (this.hintStage === 1 && t > at.pulse) {
      this.hintStage = 2;
      this.pulseTarget();
    } else if (this.hintStage === 2 && t > at.nudge) {
      this.hintStage = 3;
      const tier = this.style.id === 'tinker' ? 2 : Math.min(this.hintTier, 2);
      this.hintsUsed++;
      this.bubble.say(this.def.hints[tier], { id: roomVoiceId(this.def, this.style.id, `hint.${tier}`) });
      this.hintTier++;
    } else if (this.hintStage === 3 && t > at.path) {
      this.hintStage = 4;
      this.showPath(true);
    } else if (this.hintStage === 4 && t > at.path + 30) {
      this.idle = at.pulse;
      this.hintStage = 1;
    }
  }

  private pulseTarget(): void {
    const h = this.hintTarget();
    const p = h?.from ?? h?.to;
    if (!p) return;
    const ring = this.add.image(p.x, p.y, 'ring').setDepth(D.drag - 1).setTint(0xf1d391).setScale(0.6);
    this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 700, repeat: 3, onComplete: () => ring.destroy() });
    sfx.chirp();
  }

  private showPath(on: boolean): void {
    this.pathPulse = on ? 6 : 0;
  }

  private drawPath(dt: number): void {
    const g = this.hintG;
    if (this.pathPulse <= 0) return;
    this.pathPulse -= dt;
    g.clear();
    if (this.pathPulse <= 0) return;
    const h = this.hintTarget();
    if (!h?.from || !h.to) return;
    const dx = h.to.x - h.from.x;
    const dy = h.to.y - h.from.y;
    const len = Math.hypot(dx, dy);
    const n = Math.floor(len / 26);
    for (let i = 0; i <= n; i++) {
      const f = i / Math.max(1, n);
      const lift = Math.sin(f * Math.PI) * -60;
      const a = 0.4 + 0.6 * Math.abs(Math.sin(this.elapsed * 4 - i * 0.5));
      g.fillStyle(0xf1d391, a);
      g.fillCircle(h.from.x + dx * f, h.from.y + dy * f + lift, 6);
    }
    g.lineStyle(4, 0xf1d391, 0.8);
    g.strokeCircle(h.to.x, h.to.y, 30 + Math.sin(this.elapsed * 5) * 6);
  }

  // ───────────────────────────── dark rooms ─────────────────────────────

  private buildDarkness(): void {
    if (!this.textures.exists('lightmask')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      for (let i = 40; i > 0; i--) {
        g.fillStyle(0xffffff, 0.06);
        g.fillCircle(100, 100, i * 2.5);
      }
      g.generateTexture('lightmask', 200, 200);
      g.destroy();
    }
    this.dark = this.add.renderTexture(0, 0, 1280, 720).setOrigin(0).setDepth(D.dark);
    this.hands = this.add.graphics().setDepth(D.dark + 1);
  }

  private drawDarkness(): void {
    if (!this.dark) return;
    const rt = this.dark;
    rt.clear();
    rt.fill(0x05030a, this.fixed ? 0.25 : 0.88);
    const kb = this.kip.handPoint();
    rt.erase('lightmask', this.kip.x - 100 * 1.2, kb.y - 60 - 100 * 1.2);
    for (let i = 0; i < 2; i++) rt.erase('lightmask', this.torch.x - 100, this.torch.y - 100);
    if (this.tess) rt.erase('lightmask', this.tess.x - 100, this.tess.y - 160);
    // Outside Hands: Nana's big gentle hand holding the torch
    const h = this.hands!;
    h.clear();
    if (settings().coop === 'hands') {
      const { x, y } = this.torch;
      h.fillStyle(0xf2c9a5, 0.95);
      h.fillEllipse(x + 60, y + 70, 90, 70);
      for (let i = 0; i < 4; i++) h.fillEllipse(x + 30 + i * 18, y + 40, 16, 44);
      h.fillStyle(0x444444, 1);
      h.fillRoundedRect(x + 10, y + 30, 26, 60, 6);
      h.fillStyle(0xfff3b0, 0.9);
      h.fillCircle(x + 23, y + 30, 10);
    }
  }

  // ───────────────────────────── per frame ─────────────────────────────

  /** While something is carried, every place it can go pulses, and the one it would snap to glows. */
  private drawDropTargets(): void {
    const g = this.dropG;
    g.clear();
    if (!this.dragging.size) return;
    const pulse = 0.55 + Math.sin(this.elapsed * 6) * 0.25;
    for (const d of this.dragging.values()) {
      const o = d.spec.obj;
      const near = this.nearestTarget(d.spec, o.x, o.y);
      for (const t of d.spec.targets()) {
        if (d.spec.accepts && !d.spec.accepts(t)) continue;
        const hot = near?.id === t.id;
        if (hot) {
          g.fillStyle(0xfff3b0, 0.35);
          g.fillCircle(t.x, t.y, 58);
        }
        // a dark edge under a bright ring, so it reads on light wood and dark boards alike
        const r = hot ? 58 : 50 + pulse * 6;
        g.lineStyle(hot ? 10 : 8, 0x342f29, hot ? 0.6 : 0.45);
        g.strokeCircle(t.x, t.y, r);
        g.lineStyle(hot ? 6 : 4, hot ? 0xfff3b0 : 0xf1d391, hot ? 1 : 0.6 + pulse * 0.4);
        g.strokeCircle(t.x, t.y, r);
      }
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    this.elapsed += this.fixed ? 0 : dt;
    this.updateHints(dt);
    this.tick(dt);
    this.drawDropTargets();
    this.drawBeams();
    this.drawPath(dt);
    this.updateSpots();
    // ghost outlines per Play Style
    const s = this.style;
    const want = !this.fixed && (s.ghost === 'always' || (s.ghost === 'delayed' && this.elapsed > s.ghostDelay) || this.peeking);
    if (want !== this.ghostVisible || want) {
      this.ghostVisible = want;
      this.ghostG.clear();
      if (want) this.drawGhosts(this.ghostG, 0.35 + Math.sin(this.elapsed * 4) * 0.2);
      this.ghostG.setDepth(this.peeking ? D.blueprint + 1 : D.parts - 1);
    }
    if (this.peeking) {
      this.blueprint.clear();
      this.drawBlueprint(this.blueprint, 0.5 + Math.sin(this.elapsed * 5) * 0.5);
    }
    if (this.dark) this.drawDarkness();
    if (this.timerText) {
      this.playTimer += this.fixed ? 0 : dt;
      const par = this.def.par ?? { moves: this.solutionSteps(), seconds: 30 + this.solutionSteps() * 20 };
      this.timerText.setText(`⏱ ${Math.floor(this.playTimer)}s / ${par.seconds}s   ✋ ${this.moves} / ${par.moves}`);
    }
  }

  private drawBeams(): void {
    const g = this.beamG;
    g.clear();
    for (const { spec, who } of this.dragging.values()) {
      const ch = who === 'tess' && this.tess ? this.tess : this.kip;
      const h = ch.handPoint();
      const x = spec.obj.x;
      const y = spec.obj.y;
      const wob = Math.sin(this.elapsed * 30) * 3;
      const col = who === 'tess' ? 0xffb38a : 0x7fd3ff;
      g.lineStyle(14, col, 0.12);
      g.lineBetween(h.x, h.y, x, y);
      g.lineStyle(5, who === 'tess' ? 0xffd0b8 : 0xb9ecff, 0.45);
      g.lineBetween(h.x, h.y, x + wob, y);
      g.lineStyle(2, 0xffffff, 0.8);
      g.lineBetween(h.x, h.y, x, y + wob);
    }
  }
}

function toolName(t: string): string {
  const n: Record<string, string> = {
    oilcan: 'the Oil Can',
    peek: 'the Peek Lens',
    boots: 'Spring Boots',
    grapple: 'the Grapple Spring',
    spool: 'the Wire Spool',
    wrench: 'the Valve Wrench',
    pencil: 'the Punch Pencil',
    prism: 'the Prism Lamp',
    fork: 'the Tuning Fork',
  };
  return n[t] ?? t;
}
