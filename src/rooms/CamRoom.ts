/**
 * Cams (GDD §8.5): bumpy wheels turn rotation into up-and-down dances. Give
 * each rod the cam whose bumps match the ghost dance. Engineers also turn the
 * cam on its shaft so the timing lines up (orientation matters).
 *
 * Readability rules: the rod's roller rests on the cam rim, so a bump visibly
 * pushes it up; the figure does its action (spin, bow, pour…) while it is up;
 * the goal is a large ghost of the same figure doing the right dance beside it.
 */
import Phaser from 'phaser';
import * as sfx from '../audio/sfx';
import { CM, drawPatina } from '../art/copperMoss';
import { withArt } from '../art/generated';
import { atlasFrame } from '../art/sprites';
import { bestPhase, CAM_PROFILES, CAM_STEPS, camMatches, type CamShape } from '../mechanism/cams';
import type { FollowerArt } from '../content/types';
import { D, RoomBase, type HintTarget, type SnapTarget } from './RoomBase';

interface CamPart {
  shape: CamShape;
  obj: Phaser.GameObjects.Container;
  g: Phaser.GameObjects.Graphics;
  home: { x: number; y: number };
  at: string | null;
}

/** What the figure does while its rod is up. */
type Action = 'spin' | 'bow' | 'pour' | 'drop' | 'chirp' | 'paw';

interface Figure {
  art: FollowerArt;
  action: Action;
  body: Phaser.GameObjects.Container;
  ghost: Phaser.GameObjects.Container;
  /** smoothed rod height (0 down … 1 up) of the real figure and of the ghost */
  h: number;
  gh: number;
  spin: number;
  gspin: number;
  painted: boolean;
}

const SHAFT_Y = 450;
/** cam radius: flat part and bump */
const R_FLAT = 26;
const R_BUMP = 32;
const ROD = 64;
const GHOST_DX = 96;

const ACTIONS: Record<FollowerArt, Action> = { fox: 'spin', dancer: 'bow', butler: 'bow', teapot: 'pour', hammer: 'drop', bird: 'chirp', cat: 'paw' };

/** Painted figures from the creature sheet and the object atlas. */
const POSES: Partial<Record<FollowerArt, { sheet: string; index: number; cols: number; rows: number; height: number }>> = {
  fox: { sheet: 'portrait-clementine', index: 2, cols: 4, rows: 3, height: 150 },
  dancer: { sheet: 'portrait-clementine', index: 2, cols: 4, rows: 3, height: 150 },
  butler: { sheet: 'portrait-clementine', index: 5, cols: 4, rows: 3, height: 140 },
  teapot: { sheet: 'item-atlas', index: 4, cols: 4, rows: 4, height: 120 },
  bird: { sheet: 'portrait-clementine', index: 1, cols: 4, rows: 3, height: 120 },
  cat: { sheet: 'portrait-clementine', index: 10, cols: 4, rows: 3, height: 96 },
};

/** Each cam shape has its own colour, so the five cams in the drawer are easy to tell apart. */
const CAM_COLORS: Record<CamShape, number> = {
  round: 0xb9b2a2,
  egg: 0xe9dcc0,
  pear: 0xa7b77f,
  snail: 0x86aebb,
  heart: 0xd9a0a0,
  clover: 0x77a99f,
  star: 0xe2bc55,
};

const camRadius = (shape: CamShape, step: number) => R_FLAT + CAM_PROFILES[shape][((step % CAM_STEPS) + CAM_STEPS) % CAM_STEPS] * R_BUMP;

/** The cam outline, drawn so the step under the rod (the top) at turn 0 is step 0. */
function camPoints(shape: CamShape, cx = 0, cy = 0): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const r = camRadius(shape, Math.floor((k / 48) * CAM_STEPS));
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a - Math.PI / 2) * r, cy + Math.sin(a - Math.PI / 2) * r));
  }
  return pts;
}

export class CamRoom extends RoomBase<'cam'> {
  private parts: CamPart[] = [];
  private xs: Record<string, number> = {};
  private g!: Phaser.GameObjects.Graphics;
  private fg!: Phaser.GameObjects.Graphics;
  private figs: Record<string, Figure> = {};
  private turn = 0;
  private lastStep = -1;

  constructor() {
    super('room-cam');
  }

  protected build(): void {
    this.parts = [];
    this.xs = {};
    this.figs = {};
    this.turn = 0;
    this.lastStep = -1;
    this.g = this.add.graphics().setDepth(D.mech);
    this.fg = this.add.graphics().setDepth(D.mech + 2);
    const n = this.def.followers.length;
    this.def.followers.forEach((f, i) => (this.xs[f.id] = 640 - GHOST_DX / 2 + (i - (n - 1) / 2) * Math.min(300, 840 / Math.max(1, n - 0.3))));
    for (const f of this.def.followers) this.figs[f.id] = this.makeFigure(f.art);
    // cams already fixed on their shafts (Little Tinker pre-fills all but one)
    const spots = this.traySpots(this.def.tray.length);
    this.def.tray.forEach((shape, i) => this.addPart(shape, spots[i]));
    this.def.followers.forEach((f) => {
      if (f.start) {
        const p = this.addPart(f.start.shape, { x: this.xs[f.id], y: SHAFT_Y });
        p.at = f.id;
        p.obj.setScale(1).setDepth(D.mech + 1);
        p.obj.disableInteractive();
      }
    });
  }

  private makeFigure(art: FollowerArt): Figure {
    const body = this.add.container(0, 0).setDepth(D.mech + 3);
    const ghost = this.add.container(0, 0).setDepth(D.mech + 2).setAlpha(0.42).setScale(0.8);
    const fig: Figure = { art, action: ACTIONS[art], body, ghost, h: 0, gh: 0, spin: 0, gspin: 0, painted: false };
    // drawn stand-ins until the painting loads (and for the sugar spoon, which has no painting)
    body.add(this.drawnFigure(art, false));
    ghost.add(this.drawnFigure(art, true));
    const pose = POSES[art];
    if (pose) {
      withArt(this, pose.sheet, (key) => {
        if (!body.active || !body.scene) return;
        const frame = atlasFrame(this, key, pose.index, pose.cols, pose.rows, true);
        for (const [c, isGhost] of [[body, false], [ghost, true]] as const) {
          c.removeAll(true);
          const img = this.add.image(0, 0, key, frame).setOrigin(0.5, 1);
          img.setScale(pose.height / img.height);
          if (isGhost) img.setTintFill(0xf4ebd5);
          c.add(img);
        }
        fig.painted = true;
      });
    }
    return fig;
  }

  /** Simple drawn figures, standing on (0, 0). */
  private drawnFigure(art: FollowerArt, ghost: boolean): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    const col = (c: number) => (ghost ? 0xf4ebd5 : c);
    switch (art) {
      case 'fox':
      case 'dancer':
        g.fillStyle(col(0xd9773a), 1);
        g.fillEllipse(0, -40, 46, 70);
        g.fillCircle(0, -88, 22);
        g.fillTriangle(-18, -98, -8, -126, -2, -102);
        g.fillTriangle(18, -98, 8, -126, 2, -102);
        g.fillStyle(col(0xffffff), 1);
        g.fillEllipse(0, -34, 22, 40);
        g.fillTriangle(-6, -84, 6, -84, 0, -74);
        if (!ghost) {
          g.fillStyle(0x342f29, 1);
          g.fillCircle(-8, -92, 3);
          g.fillCircle(8, -92, 3);
        }
        break;
      case 'butler':
        g.fillStyle(col(0xc8703f), 1);
        g.fillRoundedRect(-30, -70, 60, 70, 10);
        g.fillCircle(0, -96, 22);
        g.fillStyle(col(0x222222), 1);
        g.fillRect(-16, -132, 32, 18);
        break;
      case 'teapot':
        g.fillStyle(col(0xc8703f), 1);
        g.fillEllipse(0, -30, 70, 50);
        g.fillTriangle(30, -34, 58, -52, 30, -20);
        break;
      case 'hammer':
        // the sugar bowl, heaped with cubes, and its silver spoon
        g.fillStyle(col(0xbca16a), 1);
        g.fillRoundedRect(-6, -128, 10, 80, 5);
        g.fillEllipse(0, -130, 34, 18);
        g.fillStyle(col(0xf4f1ea), 1);
        g.fillEllipse(0, -30, 92, 60);
        g.fillRect(-46, -40, 92, 12);
        g.fillStyle(col(0x5b7fa3), 1);
        g.fillRect(-44, -34, 88, 8);
        g.fillStyle(col(0xffffff), 1);
        for (const [cx, cy] of [[-24, -58], [-4, -62], [16, -58], [-14, -72], [6, -74]]) g.fillRect(cx, cy, 16, 14);
        if (!ghost) {
          g.lineStyle(1, 0xbca16a, 1);
          for (const [cx, cy] of [[-24, -58], [-4, -62], [16, -58], [-14, -72], [6, -74]]) g.strokeRect(cx, cy, 16, 14);
        }
        break;
      case 'bird':
        g.fillStyle(col(0x2e9b5f), 1);
        g.fillEllipse(0, -30, 56, 40);
        g.fillCircle(22, -52, 14);
        g.fillStyle(col(0xffa94d), 1);
        g.fillTriangle(34, -56, 34, -48, 46, -52);
        break;
      case 'cat':
        g.fillStyle(col(0xe9a45a), 1);
        g.fillCircle(0, -30, 30);
        g.fillCircle(0, -74, 24);
        g.fillTriangle(-20, -86, -10, -110, -2, -92);
        g.fillTriangle(20, -86, 10, -110, 2, -92);
        break;
    }
    return g;
  }

  private addPart(shape: CamShape, home: { x: number; y: number }): CamPart {
    const obj = this.add.container(home.x, home.y).setDepth(D.trayPart).setScale(0.7).setName(`cam-part:${this.parts.length}:${shape}`);
    const g = this.add.graphics();
    obj.add(g);
    obj.setSize(130, 130);
    const p: CamPart = { shape, obj, g, home, at: null };
    this.drawCam(g, shape);
    this.parts.push(p);
    this.enableDrag({
      obj,
      restScale: 0.7,
      targets: () => this.def.followers.filter((f) => !this.parts.some((q) => q !== p && q.at === f.id)).map((f) => ({ id: f.id, x: this.xs[f.id], y: SHAFT_Y })),
      accepts: (t) => this.style.id !== 'tinker' || this.def.solution[t.id]?.shape === shape,
      pick: () => this.lift(p),
      drop: (t) => this.drop(p, t),
    });
    // The cam receives both taps and drags, so a wrong choice can be removed.
    // A separate higher tap zone used to swallow its drag input.
    obj.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (p.at && pointer.getDistance() < 10) this.tapCam(p.at);
    });
    return p;
  }

  private drawCam(g: Phaser.GameObjects.Graphics, shape: CamShape): void {
    g.clear();
    const pts = camPoints(shape);
    g.fillStyle(0x000000, 0.25);
    g.fillPoints(pts.map((p) => new Phaser.Math.Vector2(p.x + 3, p.y + 5)), true);
    g.fillStyle(CAM_COLORS[shape], 1);
    g.fillPoints(pts, true);
    g.lineStyle(3, 0x6e4a14, 1);
    g.strokePoints(pts, true, true);
    drawPatina(g, -21, -21, 42, 42, 773, 1.2);
    g.fillStyle(0x554638, 1);
    g.fillCircle(0, 0, 9);
    g.lineStyle(1, CM.copperLight, 0.7);
    g.strokeCircle(0, 0, 13);
    // a marker so the cam's turn is visible
    g.fillStyle(0xf4ebd5, 1);
    g.fillCircle(0, -16, 4);
  }

  private sync(): void {
    for (const f of this.def.followers) {
      const p = this.parts.find((q) => q.at === f.id);
      if (!p) {
        this.state[f.id] = undefined;
        continue;
      }
      const prev = this.state[f.id];
      let phase = prev && prev.shape === p.shape ? prev.phase : 0;
      if (this.style.autoRotate) {
        const bp = bestPhase(p.shape, f.target);
        if (bp >= 0) phase = bp;
      }
      this.state[f.id] = { shape: p.shape, phase };
    }
  }

  private lift(p: CamPart): void {
    if (!p.at) return;
    const was = p.at;
    const st = this.state[was];
    p.at = null;
    this.sync();
    this.undoStack.push(() => {
      p.at = was;
      this.state[was] = st;
    });
  }

  private drop(p: CamPart, t: SnapTarget | null): void {
    if (!t) return this.floatHome(p.obj, p.home, 0.7);
    if (this.style.id === 'tinker' && this.def.solution[t.id]?.shape !== p.shape) return this.refuse(p.obj, t, p.home, 0.7);
    p.at = t.id;
    this.tweens.add({ targets: p.obj, x: t.x, y: t.y, scale: 1, duration: 110, ease: 'Back.easeOut' });
    p.obj.setDepth(D.mech + 1);
    this.sync();
    this.clunkAt(t.x, t.y);
    const id = t.id;
    this.act(() => {
      p.at = null;
      this.state[id] = undefined;
    });
  }

  /** Engineers turn the cam one notch on its shaft. */
  private tapCam(id: string): void {
    if (this.fixed || this.style.autoRotate) return;
    const st = this.state[id];
    if (!st) return;
    const old = st.phase;
    st.phase = (st.phase + 1) % CAM_STEPS;
    sfx.ratchet(1);
    this.act(() => (st.phase = old));
  }

  protected refresh(): void {
    for (const p of this.parts) if (p.obj.input?.enabled) p.at = null;
    for (const f of this.def.followers) {
      const st = this.state[f.id];
      if (!st || this.parts.some((q) => q.at === f.id)) continue;
      const p = this.parts.find((q) => q.at === null && q.shape === st.shape);
      if (p) p.at = f.id;
    }
    for (const p of this.parts) {
      if (p.at) p.obj.setPosition(this.xs[p.at], SHAFT_Y).setScale(1).setDepth(D.mech + 1);
      else p.obj.setPosition(p.home.x, p.home.y).setScale(0.7).setDepth(D.trayPart);
    }
  }

  protected tick(dt: number): void {
    this.turn += dt * 0.3; // turns per second
    const g = this.g;
    const fg = this.fg;
    g.clear();
    fg.clear();
    const frac = this.turn % 1;
    const stepNow = Math.floor(frac * CAM_STEPS);
    // the drive shaft and its crank
    g.lineStyle(14, 0x554638, 1);
    g.lineBetween(180, SHAFT_Y, 1100, SHAFT_Y);
    g.lineStyle(6, 0xb88a2c, 1);
    g.lineBetween(180, SHAFT_Y, 1100, SHAFT_Y);
    g.fillStyle(0xad6b51, 1);
    g.fillCircle(180 + Math.cos(this.turn * Math.PI * 2) * 30, SHAFT_Y + Math.sin(this.turn * Math.PI * 2) * 30, 12);
    for (const f of this.def.followers) {
      const x = this.xs[f.id];
      const st = this.state[f.id];
      const p = this.parts.find((q) => q.at === f.id);
      const fig = this.figs[f.id];
      let up = 0;
      if (st && p) {
        // the cam turns so that the step under the rod is the step that sets the rod's height
        p.obj.rotation = -(frac + st.phase / CAM_STEPS) * Math.PI * 2;
        up = CAM_PROFILES[st.shape][(stepNow + st.phase) % CAM_STEPS];
      }
      const want = f.target[stepNow];
      const match = st ? camMatches(st.shape, st.phase, f.target, !this.style.autoRotate) : false;
      fig.h += (up - fig.h) * Math.min(1, dt * 16);
      fig.gh += (want - fig.gh) * Math.min(1, dt * 16);

      // the rod: a roller resting on the cam rim, pushed up by each bump
      const rim = st && p ? R_FLAT + fig.h * R_BUMP : R_FLAT;
      const rollerY = SHAFT_Y - rim - 8;
      const baseY = rollerY - ROD;
      fg.lineStyle(10, 0x60736d, 1);
      fg.lineBetween(x, rollerY, x, baseY);
      fg.fillStyle(0x342f29, 1);
      fg.fillCircle(x, rollerY, 10);
      fg.fillStyle(0xbca16a, 1);
      fg.fillCircle(x, rollerY, 6);
      // a little stage for the drawn figures (the paintings bring their own stand)
      if (!fig.painted && fig.art !== 'hammer') {
        fg.fillStyle(0x79503d, 1);
        fg.fillRoundedRect(x - 40, baseY - 8, 80, 12, 5);
      }

      this.pose(fig, fig.body, x, baseY - 8, fig.h, dt, false);
      if (fig.action === 'drop' && fig.h > 0.6) this.drawSugar(fg, x, baseY - 8, fig.h);

      // the ghost dance beside it: the same figure, pale, doing what it should
      const gBase = SHAFT_Y - R_FLAT - 8 - ROD - fig.gh * R_BUMP - 8;
      fg.lineStyle(2, 0xf4ebd5, 0.5);
      fg.strokeRoundedRect(x + GHOST_DX - 34, gBase, 68, 10, 5);
      this.pose(fig, fig.ghost, x + GHOST_DX, gBase, fig.gh, dt, true);
      fig.ghost.setVisible(!match);

      if (match) {
        fg.fillStyle(0xfff3b0, 0.22);
        fg.fillCircle(x, baseY - 70, 86);
      }

      // the dance as a row of steps (tall = up), with the current step lit
      const w = 15;
      const x0 = x + GHOST_DX / 2 - (CAM_STEPS * w) / 2;
      for (let k = 0; k < CAM_STEPS; k++) {
        const on = f.target[k] === 1;
        const now = k === stepNow;
        g.fillStyle(on ? 0xf1d391 : 0x3d2b25, now ? 1 : 0.75);
        g.fillRoundedRect(x0 + k * w, on ? 512 : 526, w - 3, on ? 22 : 8, 3);
      }
      g.fillStyle(0xf4ebd5, 1);
      g.fillTriangle(x0 + stepNow * w + 1, 504, x0 + stepNow * w + w - 4, 504, x0 + stepNow * w + w / 2 - 1.5, 510);

      // engineers: a turn badge on a placed cam, since tapping it turns it
      if (st && p && !this.style.autoRotate && !this.fixed) this.drawTurnBadge(fg, x + 46, SHAFT_Y + 44);
    }
    if (stepNow !== this.lastStep) {
      this.lastStep = stepNow;
      if (this.def.followers.some((f) => this.state[f.id] && CAM_PROFILES[this.state[f.id]!.shape][(stepNow + this.state[f.id]!.phase) % CAM_STEPS])) sfx.tick(1.3);
    }
  }

  /** Place a figure on its stage and play its action by how far up its rod is. */
  private pose(fig: Figure, c: Phaser.GameObjects.Container, x: number, y: number, h: number, dt: number, ghost: boolean): void {
    c.setPosition(x, y);
    const base = ghost ? 0.8 : 1;
    let spin = ghost ? fig.gspin : fig.spin;
    let sx = 1;
    let rot = 0;
    switch (fig.action) {
      case 'spin':
        // she turns round while up, and settles facing front when down
        if (h > 0.5) spin += dt * 9;
        else spin += (Math.round(spin / (Math.PI * 2)) * Math.PI * 2 - spin) * Math.min(1, dt * 10);
        sx = Math.cos(spin);
        if (Math.abs(sx) < 0.12) sx = sx < 0 ? -0.12 : 0.12;
        break;
      case 'bow':
        rot = -0.55 * h;
        break;
      case 'pour':
        rot = 0.6 * h;
        break;
      case 'drop':
        rot = -0.5 * h;
        break;
      case 'chirp':
        rot = -0.25 * h;
        break;
      case 'paw':
        rot = 0.2 * h;
        break;
    }
    if (ghost) fig.gspin = spin;
    else fig.spin = spin;
    c.setScale(base * sx, base).setRotation(rot);
  }

  private drawSugar(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number): void {
    const fall = (h - 0.6) / 0.4;
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - 40 - 8, y - 70 + fall * 50, 16, 14);
    g.lineStyle(1, 0xbca16a, 1);
    g.strokeRect(x - 40 - 8, y - 70 + fall * 50, 16, 14);
  }

  /** A "tap to turn" badge: a cream disc with a curved arrow. */
  private drawTurnBadge(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    const r = 13;
    g.fillStyle(0xf4ebd5, 1);
    g.fillCircle(x, y, r);
    g.lineStyle(2, 0x8a5f17, 1);
    g.strokeCircle(x, y, r);
    g.lineStyle(3, 0x79503d, 1);
    g.beginPath();
    g.arc(x, y, r * 0.55, -Math.PI * 0.85, Math.PI * 0.35);
    g.strokePath();
    const ex = x + Math.cos(Math.PI * 0.35) * r * 0.55;
    const ey = y + Math.sin(Math.PI * 0.35) * r * 0.55;
    g.fillStyle(0x79503d, 1);
    g.fillTriangle(ex - r * 0.4, ey - r * 0.05, ex + r * 0.25, ey - r * 0.3, ex + r * 0.05, ey + r * 0.4);
  }

  protected hintTarget(): HintTarget | null {
    for (const f of this.def.followers) {
      const want = this.def.solution[f.id];
      const st = this.state[f.id];
      if (st && camMatches(st.shape, st.phase, f.target, !this.style.autoRotate)) continue;
      if (st && st.shape === want.shape) return { to: { x: this.xs[f.id], y: SHAFT_Y } };
      const p = this.parts.find((q) => q.shape === want.shape && q.at === null);
      return { from: p ? { x: p.obj.x, y: p.obj.y } : undefined, to: { x: this.xs[f.id], y: SHAFT_Y } };
    }
    return null;
  }

  protected drawGhosts(g: Phaser.GameObjects.Graphics, alpha: number): void {
    for (const f of this.def.followers) {
      if (this.state[f.id]) continue;
      g.lineStyle(4, 0xf4ebd5, alpha + 0.2);
      // Little Tinkers see the outline of the cam that fits; everyone else sees an empty socket
      if (this.style.id === 'tinker') g.strokePoints(camPoints(this.def.solution[f.id].shape, this.xs[f.id], SHAFT_Y), true, true);
      else g.strokeCircle(this.xs[f.id], SHAFT_Y, R_FLAT + R_BUMP / 2);
    }
  }

  protected solutionSteps(): number {
    return this.def.followers.filter((f) => !f.start).length * (this.style.autoRotate ? 1 : 2);
  }
}
