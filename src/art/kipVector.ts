/**
 * Prototype: Kip drawn entirely in code (docs/KIP_REDRAW.md).
 *
 * The body, the wear and every accessory share one rig: one light from the top left,
 * one ink outline, one shading recipe. Accessories attach to anchors that the pose
 * computes (crown, eyes, key socket, ankles), so a hat tilts with the head and the
 * bulb stem grows up through it instead of the hat sitting on top of a picture.
 *
 * Pure Canvas 2D with no Phaser import, so a look/pose can be baked once into a
 * texture the way `ensureGearTexture` bakes gears.
 */
import { CM } from './copperMoss';
import { cosmeticById, DEFAULT_LOOK, type KipLook } from '../content/cosmetics';

export type KipEyes = 'open' | 'closed' | 'happy' | 'sleepy';

export interface KipPose {
  /** Head/body tilt in radians, positive leans right. */
  tilt: number;
  eyes: KipEyes;
  /** Pupil offset, -1 (look left) to 1 (look right). */
  look: number;
  /** 0 = arms down, 1 = arms up (cheer). */
  arms: number;
  /** -1..1: which foot is forward when walking. */
  step: number;
}

export const POSES: Record<string, KipPose> = {
  idle: { tilt: 0, eyes: 'open', look: 0.2, arms: 0, step: 0 },
  cheer: { tilt: -0.08, eyes: 'happy', look: 0, arms: 1, step: 0 },
  walk: { tilt: 0.1, eyes: 'open', look: 0.6, arms: 0.2, step: 1 },
  sleepy: { tilt: 0.14, eyes: 'sleepy', look: 0, arms: 0, step: 0 },
};

/** The design box. Ground is at y = 200; `drawKip` scales it to any size. */
export const KIP_BOX = { w: 200, h: 220, ground: 200 } as const;

type C = CanvasRenderingContext2D;
type P = { x: number; y: number };

const INK = '#342f29';
const LINE = 2.6;

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
function mix(a: number, b: number, t: number): number {
  const ch = (n: number, s: number) => (n >> s) & 255;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t) << s;
  return m(16) | m(8) | m(0);
}
const lighten = (c: number, t: number) => mix(c, 0xfff6e0, t);
const darken = (c: number, t: number) => mix(c, 0x1e1a16, t);

/** Seeded hash so the wear pattern is stable for every look and pose. */
const rnd = (i: number, salt: number) => {
  const q = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return q - Math.floor(q);
};

/**
 * The one material recipe. A gradient from a lit top-left to a shaded bottom-right,
 * a firm ink outline, then a soft specular glint. Every part of Kip goes through this.
 */
function shade(ctx: C, path: Path2D, base: number, box: { x: number; y: number; r: number }, opts: { glint?: boolean; line?: number } = {}): void {
  const g = ctx.createRadialGradient(box.x - box.r * 0.45, box.y - box.r * 0.5, box.r * 0.1, box.x, box.y, box.r * 1.35);
  g.addColorStop(0, hex(lighten(base, 0.42)));
  g.addColorStop(0.45, hex(base));
  g.addColorStop(1, hex(darken(base, 0.45)));
  ctx.fillStyle = g;
  ctx.fill(path);
  if (opts.glint !== false) {
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = 'rgba(255,248,226,0.38)';
    ctx.beginPath();
    ctx.ellipse(box.x - box.r * 0.38, box.y - box.r * 0.48, box.r * 0.32, box.r * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.lineWidth = opts.line ?? LINE;
  ctx.strokeStyle = INK;
  ctx.stroke(path);
}

/** Shade overlapping blobs as one shape: a thick outline under the fill shows only the silhouette. */
function shadeUnion(ctx: C, path: Path2D, base: number, box: { x: number; y: number; r: number }): void {
  ctx.lineWidth = LINE * 2;
  ctx.strokeStyle = INK;
  ctx.stroke(path);
  shade(ctx, path, base, box, { line: 0.01 });
}

const circlePath = (x: number, y: number, r: number) => {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  return p;
};
const ellipsePath = (x: number, y: number, rx: number, ry: number, rot = 0) => {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  return p;
};

function rivet(ctx: C, x: number, y: number, r = 2.6, metal: number = CM.brass): void {
  shade(ctx, circlePath(x, y, r), metal, { x, y, r }, { glint: false, line: 1.1 });
  ctx.fillStyle = 'rgba(255,248,226,0.7)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

/** A coil spring from a to b, drawn as stacked ellipses (arms and legs). */
function spring(ctx: C, a: P, b: P, width: number, coils: number): void {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(ang);
  ctx.fillStyle = hex(darken(CM.inkSoft, 0.2));
  ctx.fillRect(0, -width * 0.2, len, width * 0.4);
  for (let i = 0; i <= coils; i++) {
    const x = (i / coils) * len;
    ctx.beginPath();
    ctx.ellipse(x, 0, 2.2, width / 2, 0, 0, Math.PI * 2);
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = hex(lighten(CM.inkSoft, 0.35));
    ctx.stroke();
  }
  ctx.restore();
}

interface Rig {
  body: P;
  r: number;
  crown: P;
  /** Unit vector pointing "up" out of the head, for hats and the bulb. */
  up: P;
  eyeL: P;
  eyeR: P;
  keySocket: P;
  shoulderL: P;
  shoulderR: P;
  handL: P;
  handR: P;
  hipL: P;
  hipR: P;
  footL: P;
  footR: P;
}

/** Anchors for one pose. Accessories only ever attach here. */
function rig(pose: KipPose): Rig {
  const body = { x: 102, y: 104 - Math.abs(pose.step) * 3 };
  const r = 50;
  const t = pose.tilt;
  const rot = (p: P): P => {
    const dx = p.x - body.x, dy = p.y - body.y;
    return { x: body.x + dx * Math.cos(t) - dy * Math.sin(t), y: body.y + dx * Math.sin(t) + dy * Math.cos(t) };
  };
  const up = { x: Math.sin(t), y: -Math.cos(t) };
  const armLift = pose.arms;
  return {
    body,
    r,
    crown: rot({ x: body.x + 6, y: body.y - r + 2 }),
    up,
    eyeL: rot({ x: body.x - 2, y: body.y - 6 }),
    eyeR: rot({ x: body.x + 34, y: body.y - 8 }),
    keySocket: rot({ x: body.x - r + 4, y: body.y - 6 }),
    shoulderL: rot({ x: body.x - 40, y: body.y + 22 }),
    shoulderR: rot({ x: body.x + 44, y: body.y + 18 }),
    handL: { x: body.x - 62 - armLift * 6, y: body.y + 46 - armLift * 78 },
    handR: { x: body.x + 66 + armLift * 6, y: body.y + 42 - armLift * 80 },
    hipL: rot({ x: body.x - 20, y: body.y + r - 8 }),
    hipR: rot({ x: body.x + 22, y: body.y + r - 10 }),
    footL: { x: 78 - pose.step * 10, y: KIP_BOX.ground - 12 - Math.max(0, -pose.step) * 6 },
    footR: { x: 130 + pose.step * 10, y: KIP_BOX.ground - 12 - Math.max(0, pose.step) * 8 },
  };
}

// ───────────────────────────── parts ─────────────────────────────

function drawBody(ctx: C, R: Rig, face: number, dark: number, tilt: number): void {
  const { body, r } = R;
  const shell = circlePath(body.x, body.y, r);
  shade(ctx, shell, face, { x: body.x, y: body.y, r });
  ctx.save();
  ctx.clip(shell);
  // Verdigris patina on the left (the shaded, older side), seeded so it never flickers.
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (1.0 + rnd(i, 3) * 0.6);
    const d = r * (0.55 + rnd(i, 5) * 0.4);
    ctx.fillStyle = `rgba(92,140,128,${0.55 + rnd(i, 7) * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(body.x + Math.cos(a) * d, body.y + Math.sin(a) * d, 7 + rnd(i, 9) * 9, 5 + rnd(i, 11) * 6, rnd(i, 13) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Panel seam that wraps the sphere, rotated with the body.
  ctx.translate(body.x, body.y);
  ctx.rotate(tilt);
  ctx.strokeStyle = hex(darken(dark, 0.2));
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(-14, 0, r * 0.62, r * 1.02, 0, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  // Lighter face plate on the turned-toward-us side.
  const plate = ellipsePath(16, 6, r * 0.7, r * 0.76);
  const pg = ctx.createRadialGradient(6, -8, 4, 16, 6, r * 0.8);
  pg.addColorStop(0, 'rgba(246,222,160,0.95)');
  pg.addColorStop(1, 'rgba(214,170,104,0.55)');
  ctx.fillStyle = pg;
  ctx.fill(plate);
  ctx.restore();
  // Rim shadow on the lower edge sells the sphere.
  ctx.save();
  ctx.clip(shell);
  const rim = ctx.createRadialGradient(body.x - 10, body.y - 14, r * 0.7, body.x, body.y, r * 1.05);
  rim.addColorStop(0, 'rgba(30,26,22,0)');
  rim.addColorStop(1, 'rgba(30,26,22,0.35)');
  ctx.fillStyle = rim;
  ctx.fill(shell);
  ctx.restore();
  ctx.lineWidth = LINE;
  ctx.strokeStyle = INK;
  ctx.stroke(shell);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.62 + i * 0.13) + tilt;
    rivet(ctx, body.x + Math.cos(a) * (r - 6), body.y + Math.sin(a) * (r - 6), 2.2);
  }
}

function drawEye(ctx: C, c: P, rad: number, pose: KipPose, lens: number, kind: string, rimMetal: number): void {
  // Brass goggle rim
  shade(ctx, circlePath(c.x, c.y, rad + 5), rimMetal, { x: c.x, y: c.y, r: rad + 5 });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (0.25 + i * 0.5);
    rivet(ctx, c.x + Math.cos(a) * (rad + 2.6), c.y + Math.sin(a) * (rad + 2.6), 1.3);
  }
  // Glass
  const glass = circlePath(c.x, c.y, rad);
  const g = ctx.createRadialGradient(c.x - rad * 0.3, c.y - rad * 0.4, 1, c.x, c.y, rad);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(1, hex(mix(lens, 0xc9bda2, 0.4)));
  ctx.fillStyle = g;
  ctx.fill(glass);
  ctx.save();
  ctx.clip(glass);
  if (pose.eyes === 'open' || pose.eyes === 'sleepy') {
    const px = c.x + pose.look * rad * 0.28, py = c.y + rad * 0.06;
    const pr = rad * 0.52;
    ctx.fillStyle = '#4b6a7a';
    if (kind === 'eyes-heart') heartPath(ctx, px, py, pr * 1.15);
    else if (kind === 'eyes-star') starPath(ctx, px, py, pr * 1.15, pr * 0.5);
    else { ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); }
    ctx.fill();
    ctx.fillStyle = '#1d2023';
    ctx.beginPath();
    ctx.arc(px, py, pr * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lids are part of the same goggle, not stickers: metal shutters that close down.
  const lid = pose.eyes === 'closed' || pose.eyes === 'happy' ? 1 : pose.eyes === 'sleepy' ? 0.55 : 0;
  if (lid > 0) {
    const lidPath = new Path2D();
    lidPath.rect(c.x - rad, c.y - rad, rad * 2, rad * 2 * lid);
    shade(ctx, lidPath, rimMetal, { x: c.x, y: c.y - rad * 0.4, r: rad }, { line: 1.6 });
    if (pose.eyes === 'happy') {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(c.x, c.y + rad * 0.35, rad * 0.5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(c.x - rad, c.y - rad + rad * 2 * lid);
      ctx.lineTo(c.x + rad, c.y - rad + rad * 2 * lid);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Glass glare
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(c.x, c.y, rad - 2.5, Math.PI * 1.1, Math.PI * 1.4);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = INK;
  ctx.stroke(glass);
}

function heartPath(ctx: C, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.7);
  ctx.bezierCurveTo(x - s * 1.2, y - s * 0.1, x - s * 0.5, y - s * 0.95, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.95, x + s * 1.2, y - s * 0.1, x, y + s * 0.7);
  ctx.closePath();
}

function starPath(ctx: C, x: number, y: number, ro: number, ri: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? ri : ro;
    if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function drawFace(ctx: C, R: Rig, pose: KipPose, L: KipLook): void {
  const lens = cosmeticById(L.eyes)?.color ?? CM.cream;
  const rim = CM.brass;
  if (L.eyes === 'eyes-monocle') {
    drawEye(ctx, R.eyeL, 16, pose, lens, 'eyes-round', rim);
    drawEye(ctx, R.eyeR, 18, pose, lens, 'eyes-round', 0xd1b972);
    // The chain hangs from the monocle rim and follows gravity, not the tilt.
    ctx.strokeStyle = hex(CM.brass);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([2.2, 1.6]);
    ctx.beginPath();
    ctx.moveTo(R.eyeR.x + 14, R.eyeR.y + 8);
    ctx.quadraticCurveTo(R.eyeR.x + 24, R.eyeR.y + 40, R.body.x + 30, R.body.y + 40);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (L.eyes === 'eyes-telescope') {
    for (const [c, rad] of [[R.eyeL, 16], [R.eyeR, 15]] as const) {
      const tube = new Path2D();
      tube.roundRect(c.x - rad - 4, c.y - rad - 4, rad * 2 + 8, rad * 2 + 8, 6);
      shade(ctx, tube, CM.copperDark, { x: c.x, y: c.y, r: rad + 4 });
      drawEye(ctx, { x: c.x + 3, y: c.y }, rad - 1, pose, lens, 'eyes-round', rim);
    }
  } else {
    drawEye(ctx, R.eyeL, 16, pose, lens, L.eyes, rim);
    drawEye(ctx, R.eyeR, 15, pose, lens, L.eyes, rim);
  }
  // Nose rivet and mouth, following the tilt.
  const mx = (R.eyeL.x + R.eyeR.x) / 2 + 2, my = (R.eyeL.y + R.eyeR.y) / 2 + 6;
  rivet(ctx, mx, my + 14, 2.4, CM.copperDark);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (pose.eyes === 'happy') {
    ctx.moveTo(mx - 8, my + 24);
    ctx.quadraticCurveTo(mx, my + 36, mx + 9, my + 23);
    ctx.closePath();
    ctx.fillStyle = '#7a3b2e';
    ctx.fill();
  } else ctx.arc(mx, my + 20, 5.5, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
}

function drawKey(ctx: C, R: Rig, L: KipLook): void {
  const metal = cosmeticById(L.key)?.color ?? 0xcaa868;
  const s = R.keySocket;
  // Stem first, so the bows overlap it.
  const stem = new Path2D();
  stem.roundRect(s.x - 16, s.y - 5, 18, 10, 3);
  shade(ctx, stem, CM.brass, { x: s.x - 8, y: s.y, r: 10 }, { line: 2 });
  const bow = (cy: number) => {
    const p = new Path2D();
    p.ellipse(s.x - 34, cy, 16, 17, 0, 0, Math.PI * 2);
    p.ellipse(s.x - 34, cy, 6.5, 7.5, 0, 0, Math.PI * 2);
    return p;
  };
  for (const cy of [s.y + 15, s.y - 15]) {
    const p = bow(cy);
    ctx.save();
    const g = ctx.createLinearGradient(s.x - 50, cy - 17, s.x - 18, cy + 17);
    g.addColorStop(0, hex(lighten(metal, 0.4)));
    g.addColorStop(1, hex(darken(metal, 0.35)));
    ctx.fillStyle = g;
    ctx.fill(p, 'evenodd');
    ctx.lineWidth = LINE;
    ctx.strokeStyle = INK;
    ctx.stroke(p);
    ctx.restore();
  }
}

function drawArm(ctx: C, shoulder: P, hand: P, finish: number): void {
  spring(ctx, shoulder, hand, 11, 6);
  const glove = new Path2D();
  glove.ellipse(hand.x, hand.y, 9, 10, 0, 0, Math.PI * 2);
  shade(ctx, glove, CM.paperDark, { x: hand.x, y: hand.y, r: 10 });
  shade(ctx, circlePath(shoulder.x, shoulder.y, 6), finish, { x: shoulder.x, y: shoulder.y, r: 6 }, { line: 1.8 });
}

function drawLegs(ctx: C, R: Rig, L: KipLook, face: number, dark: number): void {
  for (const [hip, foot, tone] of [[R.hipL, R.footL, face], [R.hipR, R.footR, CM.teal]] as const) {
    spring(ctx, hip, { x: foot.x, y: foot.y - 6 }, 13, 5);
    if (L.feet === 'feet-wheels') {
      const wheel = circlePath(foot.x, foot.y + 2, 10);
      shade(ctx, wheel, CM.inkSoft, { x: foot.x, y: foot.y + 2, r: 10 });
      rivet(ctx, foot.x, foot.y + 2, 3.2);
      const fork = new Path2D();
      fork.roundRect(foot.x - 14, foot.y - 9, 28, 8, 4);
      shade(ctx, fork, dark, { x: foot.x, y: foot.y - 5, r: 14 }, { line: 2 });
    } else if (L.feet === 'feet-clogs') {
      const clog = new Path2D();
      clog.moveTo(foot.x - 18, foot.y + 10);
      clog.quadraticCurveTo(foot.x - 20, foot.y - 8, foot.x - 2, foot.y - 9);
      clog.quadraticCurveTo(foot.x + 26, foot.y - 4, foot.x + 22, foot.y + 10);
      clog.closePath();
      shade(ctx, clog, CM.woodLight, { x: foot.x, y: foot.y, r: 20 });
    } else if (L.feet === 'feet-rocket') {
      // Flame first so the boot covers its root.
      const flame = new Path2D();
      flame.moveTo(foot.x - 9, foot.y + 10);
      flame.quadraticCurveTo(foot.x, foot.y + 34, foot.x + 9, foot.y + 10);
      ctx.fillStyle = 'rgba(241,211,145,0.9)';
      ctx.fill(flame);
      ctx.fillStyle = 'rgba(196,85,63,0.8)';
      ctx.beginPath();
      ctx.moveTo(foot.x - 5, foot.y + 10);
      ctx.quadraticCurveTo(foot.x, foot.y + 24, foot.x + 5, foot.y + 10);
      ctx.fill();
      const boot = new Path2D();
      boot.roundRect(foot.x - 16, foot.y - 12, 32, 22, 8);
      shade(ctx, boot, 0xc4553f, { x: foot.x, y: foot.y, r: 18 });
      ctx.fillStyle = hex(CM.cream);
      ctx.fillRect(foot.x - 16, foot.y - 2, 32, 4);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(foot.x - 16, foot.y - 2, 32, 4);
    } else {
      const dome = new Path2D();
      dome.moveTo(foot.x - 22, foot.y + 10);
      dome.quadraticCurveTo(foot.x - 22, foot.y - 14, foot.x, foot.y - 14);
      dome.quadraticCurveTo(foot.x + 22, foot.y - 14, foot.x + 22, foot.y + 10);
      dome.closePath();
      shade(ctx, dome, tone, { x: foot.x, y: foot.y, r: 22 });
      rivet(ctx, foot.x - 12, foot.y + 4, 1.8);
      rivet(ctx, foot.x + 12, foot.y + 4, 1.8);
    }
  }
}

/**
 * The bulb rises from the crown along the head's "up" vector. A hat reports its height
 * and the stem grows by that much, so the bulb always pokes out of the hat's top.
 */
function drawBulb(ctx: C, R: Rig, L: KipLook, lift: number): void {
  const glow = cosmeticById(L.bulb)?.color ?? CM.glow;
  const base = R.crown;
  const len = 22 + lift;
  const tip = { x: base.x + R.up.x * len + 8, y: base.y + R.up.y * len };
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.bezierCurveTo(base.x + R.up.x * len * 0.6 - 10, base.y + R.up.y * len * 0.6, tip.x - 10, tip.y + 10, tip.x, tip.y + 6);
  ctx.stroke();
  ctx.strokeStyle = hex(CM.brass);
  ctx.lineWidth = 3;
  ctx.stroke();
  const halo = ctx.createRadialGradient(tip.x, tip.y - 8, 2, tip.x, tip.y - 8, 30);
  halo.addColorStop(0, `${hex(glow)}cc`);
  halo.addColorStop(1, `${hex(glow)}00`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y - 8, 30, 0, Math.PI * 2);
  ctx.fill();
  const glass = circlePath(tip.x, tip.y - 9, 9);
  shade(ctx, glass, lighten(glow, 0.3), { x: tip.x, y: tip.y - 9, r: 9 }, { line: 1.8 });
  const cap = new Path2D();
  cap.roundRect(tip.x - 5, tip.y - 1, 10, 7, 2);
  shade(ctx, cap, CM.brass, { x: tip.x, y: tip.y + 2, r: 6 }, { glint: false, line: 1.6 });
  ctx.strokeStyle = 'rgba(122,84,19,0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(tip.x - 3, tip.y - 6);
  ctx.lineTo(tip.x - 1, tip.y - 11);
  ctx.lineTo(tip.x + 1, tip.y - 6);
  ctx.lineTo(tip.x + 3, tip.y - 11);
  ctx.stroke();
}

interface HatDraw {
  /** How far the bulb stem must grow to clear the hat. */
  height: number;
  /** Parts drawn behind the bulb stem (the back of a crown) and in front of it. */
  back: (ctx: C) => void;
  front: (ctx: C) => void;
}

/** Hats are drawn in crown space: origin on the head, y up is negative, rotated with the tilt. */
function hatFor(L: KipLook): HatDraw | null {
  const c = cosmeticById(L.hat);
  const c1 = c?.color ?? 0xffffff, c2 = c?.color2 ?? CM.brass;
  const box = (x: number, y: number, r: number) => ({ x, y, r });
  const brim = (ctx: C, w: number, col: number) => shade(ctx, ellipsePath(0, 0, w, 6), col, box(0, 0, w), { glint: false });
  switch (L.hat) {
    case 'hat-party':
      return {
        height: 34,
        back: () => undefined,
        front: (ctx) => {
          const cone = new Path2D();
          cone.moveTo(-16, 2); cone.lineTo(16, 2); cone.lineTo(2, -36); cone.closePath();
          ctx.save();
          shade(ctx, cone, c1, box(0, -12, 22));
          ctx.clip(cone);
          ctx.fillStyle = hex(c2);
          for (const [x, y] of [[-6, -4], [6, -10], [0, -22], [-2, -12]]) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
          ctx.lineWidth = LINE; ctx.strokeStyle = INK; ctx.stroke(cone);
        },
      };
    case 'hat-tophat':
      return {
        height: 40,
        back: (ctx) => brim(ctx, 28, c1),
        front: (ctx) => {
          const crown = new Path2D();
          crown.roundRect(-16, -38, 32, 38, [4, 4, 2, 2]);
          shade(ctx, crown, lighten(c1, 0.12), box(0, -18, 22));
          const band = new Path2D();
          band.rect(-16, -10, 32, 7);
          shade(ctx, band, c2, box(0, -7, 16), { glint: false, line: 1.6 });
          ctx.fillStyle = hex(darken(c1, 0.3));
          ctx.beginPath(); ctx.ellipse(0, -38, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
        },
      };
    case 'hat-captain':
    case 'hat-conductor':
      return {
        height: 22,
        back: () => undefined,
        front: (ctx) => {
          const top = new Path2D();
          top.moveTo(-24, -6); top.quadraticCurveTo(-26, -26, 0, -24); top.quadraticCurveTo(28, -26, 26, -6); top.closePath();
          shade(ctx, top, c1, box(0, -14, 24));
          const band = new Path2D();
          band.rect(-22, -8, 44, 7);
          shade(ctx, band, L.hat === 'hat-captain' ? c2 : darken(c1, 0.3), box(0, -4, 22), { glint: false, line: 1.6 });
          const peak = new Path2D();
          peak.moveTo(-6, 0); peak.quadraticCurveTo(14, 10, 30, 1); peak.lineTo(18, -2); peak.closePath();
          shade(ctx, peak, CM.ink, box(12, 2, 16), { line: 1.8 });
          rivet(ctx, 0, -4, 3.4, L.hat === 'hat-captain' ? 0xd1b972 : c2);
        },
      };
    case 'hat-toque':
      return {
        height: 36,
        back: () => undefined,
        front: (ctx) => {
          const puff = new Path2D();
          for (const [x, y, r] of [[-11, -22, 11], [10, -24, 12], [0, -32, 12], [-2, -18, 10]]) { puff.moveTo(x + r, y); puff.arc(x, y, r, 0, Math.PI * 2); }
          shadeUnion(ctx, puff, c1, box(0, -24, 22));
          const band = new Path2D();
          band.roundRect(-15, -10, 30, 12, 3);
          shade(ctx, band, darken(c1, 0.06), box(0, -4, 16), { glint: false });
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(-12 + rnd(i, 21) * 24, -38 + rnd(i, 23) * 24, 0.9, 0, Math.PI * 2); ctx.fill(); }
        },
      };
    case 'hat-flowers':
      return {
        height: 4,
        back: (ctx) => {
          // The back half of the ring is hidden behind the head.
          ctx.strokeStyle = hex(CM.mossDark); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(0, -2, 26, 7, 0, Math.PI, Math.PI * 2); ctx.stroke();
        },
        front: (ctx) => {
          ctx.strokeStyle = hex(CM.mossDark); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(0, -2, 26, 7, 0, 0, Math.PI); ctx.stroke();
          const cols = [c1, 0xe4cc88, 0xc09891, c1, 0xe4cc88];
          cols.forEach((col, i) => {
            const a = Math.PI * (0.05 + i * 0.225);
            const x = Math.cos(a) * 26, y = -2 + Math.sin(a) * 7;
            const petals = new Path2D();
            for (let k = 0; k < 5; k++) { const b = (k / 5) * Math.PI * 2; petals.moveTo(x, y); petals.ellipse(x + Math.cos(b) * 3.6, y + Math.sin(b) * 3.6, 3.4, 2.4, b, 0, Math.PI * 2); }
            shadeUnion(ctx, petals, col, box(x, y, 6));
            rivet(ctx, x, y, 1.6, 0xe4cc88);
          });
        },
      };
    case 'hat-bow':
      return {
        height: 0,
        back: () => undefined,
        front: (ctx) => {
          ctx.save();
          ctx.translate(-22, 8);
          ctx.rotate(-0.5);
          for (const s of [-1, 1]) {
            const loop = new Path2D();
            loop.moveTo(0, 0); loop.quadraticCurveTo(s * 18, -14, s * 18, 0); loop.quadraticCurveTo(s * 18, 12, 0, 0);
            shade(ctx, loop, c1, box(s * 10, 0, 14));
          }
          shade(ctx, circlePath(0, 0, 4), darken(c1, 0.15), box(0, 0, 4), { glint: false, line: 1.6 });
          ctx.restore();
        },
      };
    case 'hat-grad':
      return {
        height: 24,
        back: () => undefined,
        front: (ctx) => {
          const cap = new Path2D();
          cap.roundRect(-14, -12, 28, 12, 3);
          shade(ctx, cap, c1, box(0, -6, 16));
          const board = new Path2D();
          board.moveTo(-28, -14); board.lineTo(0, -24); board.lineTo(28, -14); board.lineTo(0, -6); board.closePath();
          shade(ctx, board, lighten(c1, 0.15), box(0, -16, 28));
          ctx.strokeStyle = hex(c2); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, -15); ctx.quadraticCurveTo(18, -12, 20, 4); ctx.stroke();
          shade(ctx, ellipsePath(20, 7, 3, 5), c2, box(20, 7, 5), { glint: false, line: 1.2 });
        },
      };
    case 'hat-feather':
      return {
        height: 18,
        back: (ctx) => {
          const plume = new Path2D();
          plume.ellipse(16, -26, 6, 20, 0.35, 0, Math.PI * 2);
          shade(ctx, plume, c2, box(16, -26, 18));
        },
        front: (ctx) => {
          brim(ctx, 26, c1);
          const crown = new Path2D();
          crown.roundRect(-14, -18, 28, 18, [8, 8, 2, 2]);
          shade(ctx, crown, c1, box(0, -10, 18));
          const plume = new Path2D();
          plume.ellipse(-14, -22, 5, 15, -0.35, 0, Math.PI * 2);
          shade(ctx, plume, 0xe4cc88, box(-14, -22, 14));
        },
      };
    default:
      return null;
  }
}

function withHatSpace(ctx: C, R: Rig, tilt: number, fn: (ctx: C) => void): void {
  ctx.save();
  ctx.translate(R.crown.x, R.crown.y);
  ctx.rotate(tilt - 0.12); // a slight rakish angle, then follow the head
  fn(ctx);
  ctx.restore();
}

/** Draw Kip into a canvas context with the ground line at (x, y) and the given height in px. */
export function drawKip(ctx: C, x: number, y: number, height: number, look: KipLook = DEFAULT_LOOK, pose: KipPose = POSES.idle): void {
  const s = height / KIP_BOX.h;
  ctx.save();
  ctx.translate(x - (KIP_BOX.w / 2) * s, y - KIP_BOX.ground * s);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const fin = cosmeticById(look.finish);
  const face = fin?.color ?? CM.copper, dark = fin?.color2 ?? CM.copperDark;
  const R = rig(pose);
  const hat = hatFor(look);

  // Contact shadow
  ctx.fillStyle = 'rgba(23,26,23,0.22)';
  ctx.beginPath();
  ctx.ellipse(104, KIP_BOX.ground, 64, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  drawLegs(ctx, R, look, face, dark);
  drawArm(ctx, R.shoulderL, R.handL, face);
  drawKey(ctx, R, look);
  drawBody(ctx, R, face, dark, pose.tilt);
  drawFace(ctx, R, pose, look);
  if (hat) withHatSpace(ctx, R, pose.tilt, hat.back);
  if (look.hat !== 'hat-bow') drawBulb(ctx, R, look, hat?.height ?? 0);
  if (hat) withHatSpace(ctx, R, pose.tilt, hat.front);
  if (look.hat === 'hat-bow') drawBulb(ctx, R, look, 0);
  drawArm(ctx, R.shoulderR, R.handR, face);
  ctx.restore();
}
