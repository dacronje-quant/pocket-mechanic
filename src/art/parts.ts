/**
 * Part icons, drawn in code: chain-reaction links, Part-o-pedia pages, tools.
 * drawPart(g, id, x, y, s) fits the part in roughly an 80·s pixel square.
 */
import Phaser from 'phaser';
import { heart, star } from './Kip';
import { CM, drawPatina } from './copperMoss';

const BRASS = CM.brass;
const DARK = CM.ink;
const STEEL = CM.tealLight;
const COPPER = CM.copper;
const WOOD = CM.wood;

/** Many ids share a drawing. */
const ALIAS: Record<string, string> = {
  mesh: 'gear2',
  idler: 'gear3',
  'gear-train': 'gear3',
  ratio: 'gear2',
  'compound-gear': 'gear2',
  'planetary-gear': 'planets',
  gearbox: 'gear2',
  hourwheel: 'gear',
  escapement: 'escapement',
  governor: 'fan',
  mainspring: 'spring',
  windkey: 'key',
  dropweight: 'weights',
  counterweight: 'weights',
  fulcrum: 'lever',
  follower: 'cam',
  crankrod: 'crank',
  ropelift: 'pulley',
  winch: 'pulley',
  'pinned-cylinder': 'cylinder',
  comb: 'comb',
  pitch: 'wave',
  chord: 'notes',
  wave: 'wave',
  'radio-dial': 'dial',
  'magic-eye': 'eye',
  'spark-cell': 'battery',
  plug: 'plug',
  series: 'bulbs',
  parallel: 'bulbs',
  'snap-link': 'fuse',
  elbow: 'pipe',
  't-junction': 'pipe',
  tap: 'valve',
  boiler: 'kettle',
  steam: 'kettle',
  'pressure-gauge': 'dial',
  spout: 'kettle',
  'both-gate': 'gate-and',
  'either-gate': 'gate-or',
  'flip-gate': 'gate-not',
  latch: 'gate-latch',
  'punch-card': 'card',
  cardreader: 'card',
  loop: 'card',
  'sensor-card': 'card',
  button: 'button',
  trapdoor: 'marble',
  chute: 'marble',
  plate: 'marble',
  reflection: 'mirror',
  focus: 'lens',
  colour: 'prism',
  sunlamp: 'bulb',
  lamp: 'bulb',
  starplate: 'stars',
  sync: 'pendulum',
  metronome: 'metronome',
  'chain-reaction': 'chain',
  locomotive: 'train',
  cargo: 'train',
  'paddle-wheel': 'waterwheel',
  flywheel: 'gear',
  'wheel-axle': 'wheel',
  bearing: 'bearing',
  candles: 'candles',
  boats: 'boat',
  teacups: 'cups',
  coo: 'bird',
  clementine: 'fox',
  bike: 'bell',
  monkey: 'monkey',
  oilcan: 'oilcan',
  oil: 'oilcan',
  beam: 'magnet',
  peek: 'peeklens',
  boots: 'boots',
  grapple: 'grapple',
  spool: 'spool',
  wire: 'spool',
  wrench: 'wrench',
  pencil: 'pencil',
  prism: 'prism',
  fork: 'fork',
  microphone: 'mic',
  nest: 'nest',
};

export function drawPart(g: Phaser.GameObjects.Graphics, id: string, x: number, y: number, s = 1): void {
  const key = ALIAS[id] ?? id;
  const seed = [...key].reduce((n, c) => n * 31 + c.charCodeAt(0), 17) >>> 0;
  const C = (dx: number, dy: number, r: number, c: number, a = 1) => {
    const cx = x + dx * s, cy = y + dy * s;
    g.fillStyle(c, a); g.fillCircle(cx, cy, r * s);
    if (a < 0.8 || r < 3) return;
    g.lineStyle(Math.max(0.6, 1.05 * s), CM.ink, 0.85); g.strokeCircle(cx, cy, r * s);
    if (r >= 9) {
      g.lineStyle(0.8 * s, CM.cream, 0.6);
      g.beginPath(); g.arc(cx - 0.5 * s, cy - 0.5 * s, (r - 1.6) * s, Math.PI, Math.PI * 1.75); g.strokePath();
      for (let i = 0; i < 5; i++) {
        const a = i * 2.1 + seed % 7;
        const rr = (0.28 + i * 0.1) * r;
        const px = cx + Math.cos(a) * rr * s, py = cy + Math.sin(a) * rr * s;
        g.lineStyle(0.5 * s, CM.ink, 0.16); g.lineBetween(px, py, px + 3 * s, py - s);
      }
    }
  };
  const R = (dx: number, dy: number, w: number, h: number, c: number, r = 4) => {
    const xx = x + dx * s, yy = y + dy * s;
    const rr = Math.min(r, (w / 2) * 0.99, (h / 2) * 0.99) * s;
    g.fillStyle(c, 1); g.fillRoundedRect(xx, yy, w * s, h * s, rr);
    g.lineStyle(Math.max(0.65, 1.05 * s), CM.ink, 0.9); g.strokeRoundedRect(xx, yy, w * s, h * s, rr);
    if (w > 12 && h > 10) {
      g.lineStyle(0.65 * s, CM.cream, 0.4); g.lineBetween(xx + rr, yy + 1.5 * s, xx + w * s - rr, yy + 1.5 * s);
      const ix = Math.max(3, r * 0.35), iy = Math.max(3, r * 0.5);
      drawPatina(g, xx + ix * s, yy + iy * s, (w - ix * 2) * s, (h - iy * 2) * s, seed + dx * 7 + dy, 1.1);
    }
    if (w >= 34 && h >= 28) {
      for (const rx of [xx + 5 * s, xx + (w - 5) * s]) {
        g.fillStyle(CM.ink, 0.95); g.fillCircle(rx, yy + 5 * s, 1.7 * s);
        g.fillStyle(CM.brass, 1); g.fillCircle(rx - 0.3 * s, yy + 4.7 * s, 1.1 * s);
      }
    }
  };
  const L = (x1: number, y1: number, x2: number, y2: number, w: number, c: number) => {
    if (w >= 4) {
      g.lineStyle((w + 1.6) * s, CM.ink, 0.9); g.lineBetween(x + x1 * s, y + y1 * s, x + x2 * s, y + y2 * s);
    }
    g.lineStyle(w * s, c, 1); g.lineBetween(x + x1 * s, y + y1 * s, x + x2 * s, y + y2 * s);
    if (w >= 5) {
      g.lineStyle(0.8 * s, CM.cream, 0.35); g.lineBetween(x + (x1 - 1) * s, y + (y1 - 1) * s, x + (x2 - 1) * s, y + (y2 - 1) * s);
    }
  };
  const T = (pts: number[], c: number) => {
    const v: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < pts.length; i += 2) v.push(new Phaser.Math.Vector2(x + pts[i] * s, y + pts[i + 1] * s));
    g.fillStyle(c, 1); g.fillPoints(v, true);
    g.lineStyle(1.1 * s, CM.ink, 0.9); g.strokePoints(v, true, true);
    if (v.length > 1) { g.lineStyle(0.7 * s, CM.cream, 0.4); g.lineBetween(v[0].x, v[0].y - s, v[1].x, v[1].y - s); }
  };
  const E = (dx: number, dy: number, w: number, h: number, c: number) => {
    const xx = x + dx * s, yy = y + dy * s;
    g.fillStyle(c, 1); g.fillEllipse(xx, yy, w * s, h * s);
    g.lineStyle(1.1 * s, CM.ink, 0.9); g.strokeEllipse(xx, yy, w * s, h * s);
    g.fillStyle(CM.cream, 0.28); g.fillEllipse(xx - w * 0.12 * s, yy - h * 0.23 * s, w * 0.4 * s, h * 0.11 * s);
    for (let i = 0; i < 4; i++) {
      g.lineStyle(0.6 * s, CM.ink, 0.2);
      const py = dy + (-0.18 + i * 0.11) * h;
      g.lineBetween(x + (dx - w * 0.29) * s, y + py * s, x + (dx - w * 0.05) * s, y + (py - h * 0.04) * s);
    }
  };
  const gearAt = (dx: number, dy: number, r: number, c: number, teeth = 10) => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < teeth * 4; i++) {
      const a = i * Math.PI * 2 / (teeth * 4);
      const rr = i % 4 === 1 || i % 4 === 2 ? r * 1.08 : r * 0.84;
      pts.push(new Phaser.Math.Vector2(x + (dx + Math.cos(a) * rr) * s, y + (dy + Math.sin(a) * rr) * s));
    }
    g.fillStyle(c, 1); g.fillPoints(pts, true);
    g.lineStyle(1.1 * s, CM.ink, 0.95); g.strokePoints(pts, true, true);
    C(dx, dy, r * 0.73, c);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      C(dx + Math.cos(a) * r * 0.49, dy + Math.sin(a) * r * 0.49, r * 0.14, CM.ink);
    }
    C(dx, dy, r * 0.29, CM.copperDark); C(dx, dy, r * 0.12, CM.ink);
    C(dx + r * 0.75, dy, 1.8, CM.cream);
  };
  switch (key) {
    case 'gear':
      gearAt(0, 0, 30, BRASS, 12);
      break;
    case 'gear2':
      gearAt(-14, 6, 24, BRASS, 10);
      gearAt(22, -14, 14, COPPER, 7);
      break;
    case 'gear3':
      gearAt(-26, 8, 16, BRASS, 8);
      gearAt(2, -8, 12, STEEL, 7);
      gearAt(28, 8, 16, COPPER, 8);
      break;
    case 'planets':
      C(0, 0, 14, CM.glow);
      g.lineStyle(2 * s, BRASS, 1);
      g.strokeCircle(x, y, 26 * s);
      g.strokeCircle(x, y, 38 * s);
      C(26, 0, 6, CM.slate);
      C(-27, -27, 7, CM.copperDark);
      break;
    case 'escapement':
      gearAt(0, 10, 24, BRASS, 9);
      T([-30, -30, 30, -30, 0, -6], COPPER);
      break;
    case 'fan':
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        E(Math.cos(a) * 18, Math.sin(a) * 18, 30, 14, STEEL);
      }
      C(0, 0, 7, DARK);
      break;
    case 'spring':
      for (let i = 0; i < 5; i++) {
        g.lineStyle(5.5 * s, CM.ink, 0.9);
        g.strokeEllipse(x, y + (-24 + i * 12) * s, 40 * s, 12 * s);
        g.lineStyle(3 * s, STEEL, 1);
        g.strokeEllipse(x, y + (-24 + i * 12) * s, 40 * s, 12 * s);
        g.lineStyle(0.65 * s, CM.cream, 0.75);
        g.strokeEllipse(x - s, y + (-25 + i * 12) * s, 40 * s, 12 * s);
      }
      break;
    case 'key':
      R(-4, -6, 8, 34, BRASS, 3);
      E(-13, -16, 27, 34, BRASS); E(13, -16, 27, 34, BRASS);
      E(-13, -17, 11, 18, CM.ink); E(13, -17, 11, 18, CM.ink);
      break;
    case 'weights':
      L(-14, -38, -14, 4, 3, 0x8f8a7a);
      L(14, -38, 14, -8, 3, 0x8f8a7a);
      E(-14, 20, 20, 40, CM.copperDark); E(14, 8, 20, 40, CM.copperDark);
      break;
    case 'lever':
      T([-6, 20, 6, 20, 0, 6], DARK);
      L(-38, 14, 38, -2, 7, WOOD);
      R(-40, 0, 14, 14, 0x9a6b1f, 3);
      break;
    case 'pulley':
      C(0, -18, 16, STEEL);
      C(0, -18, 6, DARK);
      L(-16, -18, -16, 30, 3, 0xc8b28a);
      L(16, -18, 16, 18, 3, 0xc8b28a);
      R(6, 16, 20, 18, 0x9a6b1f, 3);
      break;
    case 'cam':
      E(0, 10, 50, 38, BRASS);
      C(-8, 10, 5, DARK);
      R(-5, -40, 10, 32, STEEL, 2);
      break;
    case 'crank':
      C(-14, 10, 18, BRASS);
      L(-14, 10, 20, -20, 6, DARK);
      C(20, -20, 7, CM.copperDark);
      break;
    case 'bellows':
      T([-34, -18, 26, -24, 26, 24, -34, 18], CM.woodDark);
      for (let i = 0; i < 4; i++) L(-24 + i * 14, -18, -24 + i * 14, 18, 2, 0x5a2a12);
      R(26, -6, 14, 12, BRASS, 2);
      break;
    case 'striker':
    case 'bell':
      T([-26, 18, 26, 18, 0, -24], BRASS);
      C(0, -14, 14, BRASS);
      R(-30, 14, 60, 8, BRASS, 3);
      C(0, 26, 6, DARK);
      break;
    case 'cylinder':
      R(-36, -18, 72, 36, CM.sky, 14);
      for (let i = 0; i < 12; i++) C(-28 + (i % 6) * 11, -8 + Math.floor(i / 6) * 16, 2.5, 0x5a5a6a);
      break;
    case 'comb':
      for (let i = 0; i < 7; i++) R(-34 + i * 10, -10, 7, 26 + i * 3, CM.sky, 2);
      R(-38, -18, 76, 10, STEEL, 2);
      break;
    case 'wave':
      g.lineStyle(4 * s, CM.slate, 1);
      g.beginPath();
      for (let i = -36; i <= 36; i += 3) g.lineTo(x + i * s, y + Math.sin(i / 6) * 16 * s);
      g.strokePath();
      break;
    case 'notes':
      C(-16, 14, 8, DARK);
      C(12, 8, 8, DARK);
      L(-9, 14, -9, -22, 3, DARK);
      L(19, 8, 19, -28, 3, DARK);
      L(-9, -22, 19, -28, 5, DARK);
      break;
    case 'dial':
      C(0, 0, 32, CM.woodDark);
      C(0, 0, 26, CM.paper);
      L(0, 0, 16, -14, 3, CM.copperDark);
      C(0, 0, 4, DARK);
      break;
    case 'eye':
      C(0, 0, 26, 0x2b4b2b);
      C(0, 0, 18, 0x51cf66);
      C(0, 0, 7, 0x0b2b0b);
      break;
    case 'battery':
      R(-18, -30, 36, 60, CM.teal, 6);
      R(-8, -36, 16, 8, STEEL, 2);
      R(-12, -6, 24, 6, 0xffffff, 2);
      R(-3, -15, 6, 24, 0xffffff, 2);
      break;
    case 'plug':
      R(-20, -10, 30, 24, CM.ink, 6);
      R(10, -6, 18, 4, STEEL, 1);
      R(10, 4, 18, 4, STEEL, 1);
      L(-20, 2, -38, 20, 5, CM.ink);
      break;
    case 'bulb':
      C(0, -8, 26, 0xfff3b0, 0.35);
      C(0, -8, 18, 0xfff3b0);
      R(-9, 10, 18, 16, STEEL, 2);
      break;
    case 'bulbs':
      C(-18, -6, 14, 0xfff3b0);
      C(18, -6, 14, 0xfff3b0);
      R(-24, 8, 12, 10, STEEL, 2);
      R(12, 8, 12, 10, STEEL, 2);
      L(-18, 18, 18, 18, 3, COPPER);
      break;
    case 'switch':
      R(-24, 6, 48, 14, CM.ink, 4);
      L(-14, 6, 18, -22, 5, COPPER);
      C(-14, 6, 5, BRASS);
      break;
    case 'motor':
    case 'dynamo':
      R(-28, -20, 46, 40, key === 'dynamo' ? CM.moss : CM.teal, 8);
      R(18, -4, 18, 8, STEEL, 2);
      g.lineStyle(3 * s, CM.brass, 1);
      g.lineBetween(x - 10 * s, y - 10 * s, x - 2 * s, y);
      g.lineBetween(x - 2 * s, y, x - 12 * s, y + 4 * s);
      g.lineBetween(x - 12 * s, y + 4 * s, x - 2 * s, y + 14 * s);
      break;
    case 'fuse':
      R(-30, -10, 60, 20, CM.paper, 8);
      R(-36, -8, 10, 16, STEEL, 2);
      R(26, -8, 10, 16, STEEL, 2);
      L(-26, 0, 26, 0, 2, COPPER);
      break;
    case 'tube':
      R(-14, -34, 28, 56, 0xffcf80, 12);
      C(0, -6, 10, 0xffb347);
      R(-16, 20, 32, 12, CM.ink, 3);
      break;
    case 'speaker':
      C(0, 0, 32, CM.woodDark);
      C(0, 0, 24, CM.wood);
      C(0, 0, 10, CM.ink);
      break;
    case 'mic':
      R(-10, -34, 20, 36, STEEL, 10);
      L(0, 2, 0, 26, 4, DARK);
      R(-16, 24, 32, 6, DARK, 3);
      break;
    case 'mirror':
      L(-26, 26, 26, -26, 10, 0x9aa6b4);
      L(-24, 22, 24, -26, 4, 0xe6f0f8);
      break;
    case 'lens':
      g.fillStyle(0xb2f2ff, 0.7);
      g.fillEllipse(x, y, 22 * s, 64 * s);
      g.lineStyle(3 * s, BRASS, 1);
      g.strokeEllipse(x, y, 22 * s, 64 * s);
      break;
    case 'prism':
      T([0, -30, 30, 24, -30, 24], 0xd0ebff);
      L(-40, 0, -12, 0, 3, 0xffffff);
      L(14, 4, 40, -6, 3, 0xff6b6b);
      L(14, 8, 40, 10, 3, 0x8ce99a);
      L(14, 12, 40, 26, 3, CM.sky);
      break;
    case 'stars':
      g.fillStyle(0xfff3b0, 1);
      star(g, x - 14 * s, y - 8 * s, 12 * s);
      star(g, x + 16 * s, y + 4 * s, 9 * s);
      star(g, x - 4 * s, y + 18 * s, 6 * s);
      break;
    case 'valve':
      R(-38, -6, 76, 12, COPPER, 3);
      C(0, -16, 18, CM.copperDark);
      C(0, -16, 6, DARK);
      L(-18, -16, 18, -16, 3, DARK);
      L(0, -34, 0, 2, 3, DARK);
      break;
    case 'pipe':
      R(-38, -8, 46, 16, COPPER, 4);
      R(-8, -8, 16, 46, COPPER, 4);
      R(-12, -12, 24, 24, CM.copperDark, 4);
      break;
    case 'kettle':
      E(0, 8, 56, 44, COPPER);
      T([22, 0, 40, -16, 26, 10], COPPER);
      R(-10, -22, 20, 8, DARK, 3);
      C(-36, -24, 8, 0xffffff, 0.7);
      C(-28, -36, 10, 0xffffff, 0.5);
      break;
    case 'piston':
      R(-20, -10, 40, 40, STEEL, 4);
      R(-6, -36, 12, 30, CM.sky, 2);
      R(-16, -42, 32, 8, DARK, 3);
      break;
    case 'whistle':
      R(-10, -34, 20, 56, BRASS, 8);
      R(-14, 18, 28, 10, DARK, 3);
      C(0, -40, 10, 0xffffff, 0.7);
      break;
    case 'waterwheel':
      g.lineStyle(5 * s, WOOD, 1);
      g.strokeCircle(x, y, 26 * s);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        L(0, 0, Math.cos(a) * 32, Math.sin(a) * 32, 4, WOOD);
      }
      C(0, 0, 6, DARK);
      break;
    case 'pump':
      R(-16, -16, 32, 44, CM.moss, 6);
      L(0, -16, 0, -36, 4, DARK);
      L(-18, -36, 18, -36, 5, DARK);
      R(16, 0, 18, 8, COPPER, 2);
      break;
    case 'gate-and':
      R(-30, -30, 60, 60, CM.copperDark, 8);
      C(-12, -6, 6, CM.ink);
      C(12, -6, 6, CM.ink);
      R(-14, -6, 4, 14, CM.ink, 1);
      R(10, -6, 4, 14, CM.ink, 1);
      break;
    case 'gate-or':
      L(-26, -28, 0, 4, 8, CM.teal);
      L(26, -28, 0, 4, 8, CM.teal);
      L(0, 4, 0, 30, 8, CM.teal);
      C(-18, -20, 6, CM.brass);
      break;
    case 'gate-not':
      T([-6, 20, 6, 20, 0, 6], DARK);
      L(-34, 16, 34, -10, 7, CM.moss);
      C(-30, 6, 7, CM.brass);
      break;
    case 'gate-latch':
      gearAt(0, 0, 22, CM.slate, 10);
      T([10, -36, 26, -36, 16, -18], DARK);
      break;
    case 'card':
      R(-26, -34, 52, 68, CM.paper, 4);
      for (let i = 0; i < 9; i++) C(-14 + (i % 3) * 14, -20 + Math.floor(i / 3) * 16, 3.5, (i * 7) % 3 === 0 ? CM.ink : CM.paperDark);
      break;
    case 'button':
      R(-28, 8, 56, 16, 0x555555, 4);
      E(0, 4, 40, 22, CM.copper);
      break;
    case 'marble':
      L(-36, -26, 30, 10, 6, WOOD);
      C(-16, -24, 9, CM.sky);
      C(-18, -26, 3, 0xffffff);
      break;
    case 'pendulum':
      L(0, -36, 10, 20, 4, BRASS);
      C(10, 24, 14, BRASS);
      C(0, -36, 5, DARK);
      break;
    case 'metronome':
      T([-24, 34, 24, 34, 0, -38], WOOD);
      L(0, 30, 10, -24, 3, BRASS);
      C(7, -10, 5, BRASS);
      break;
    case 'hands':
      C(0, 0, 32, CM.paper);
      g.lineStyle(3 * s, BRASS, 1);
      g.strokeCircle(x, y, 32 * s);
      L(0, 0, 0, -24, 4, CM.ink);
      L(0, 0, 16, 6, 5, CM.ink);
      break;
    case 'chain':
      for (let i = 0; i < 4; i++) {
        g.lineStyle(4 * s, STEEL, 1);
        g.strokeEllipse(x + (-27 + i * 18) * s, y, 22 * s, 12 * s);
      }
      break;
    case 'train':
      R(-36, -16, 50, 28, CM.tealDark, 6);
      R(4, -30, 10, 16, CM.ink, 2);
      R(14, -10, 22, 22, CM.tealDark, 4);
      C(-24, 16, 8, CM.ink);
      C(0, 16, 8, CM.ink);
      C(24, 16, 8, CM.ink);
      break;
    case 'track':
      for (let i = 0; i < 5; i++) R(-34 + i * 16, -14, 8, 28, WOOD, 2);
      L(-40, -8, 40, -8, 4, CM.inkSoft);
      L(-40, 8, 40, 8, 4, CM.inkSoft);
      break;
    case 'points':
      L(-36, 20, 36, 20, 5, CM.inkSoft);
      L(-10, 20, 30, -18, 5, CM.inkSoft);
      R(-16, 26, 10, 10, CM.copperDark, 2);
      break;
    case 'signal':
      R(-4, -10, 8, 46, CM.ink, 2);
      R(-14, -38, 28, 34, CM.ink, 6);
      C(0, -28, 6, 0xff6b6b);
      C(0, -14, 6, 0x51cf66);
      break;
    case 'buffer':
      R(-30, -10, 60, 30, CM.copperDark, 4);
      C(-16, -16, 8, CM.brass);
      C(16, -16, 8, CM.brass);
      break;
    case 'hinge':
      R(-26, -20, 22, 40, STEEL, 3);
      R(4, -20, 22, 40, STEEL, 3);
      R(-4, -24, 8, 48, CM.inkSoft, 4);
      break;
    case 'bearing':
      C(0, 0, 30, STEEL);
      C(0, 0, 14, 0xffffff);
      for (let i = 0; i < 8; i++) C(Math.cos((i / 8) * 6.28) * 22, Math.sin((i / 8) * 6.28) * 22, 5, CM.cream);
      break;
    case 'screw':
      T([-10, -30, 10, -30, 6, 30, -6, 30], STEEL);
      for (let i = 0; i < 6; i++) L(-10, -24 + i * 9, 10, -20 + i * 9, 2, CM.inkSoft);
      R(-18, -38, 36, 10, STEEL, 3);
      break;
    case 'ramp':
      T([-38, 26, 38, 26, 38, -22], WOOD);
      C(-8, 2, 8, CM.sky);
      break;
    case 'wedge':
      T([-30, 26, 30, 26, 0, -30], STEEL);
      break;
    case 'wheel':
      C(0, 0, 30, WOOD);
      C(0, 0, 22, CM.woodLight);
      L(-40, 0, 40, 0, 6, DARK);
      break;
    case 'candles':
      for (let i = 0; i < 3; i++) {
        R(-26 + i * 20, -6, 12, 34, [0xff8fab, CM.sky, CM.brass][i], 3);
        g.fillStyle(0xffa94d, 1);
        g.fillEllipse(x + (-20 + i * 20) * s, y - 14 * s, 8 * s, 14 * s);
      }
      break;
    case 'boat':
      T([-34, 0, 34, 0, 24, 18, -24, 18], CM.copperDark);
      T([0, -34, 0, -2, 22, -2], 0xffffff);
      break;
    case 'cups':
      for (let i = 0; i < 2; i++) {
        R(-30 + i * 32, -10, 26, 24, 0xffffff, 6);
        g.lineStyle(3 * s, 0xffffff, 1);
        g.strokeCircle(x + (0 + i * 32) * s, y, 6 * s);
        R(-27 + i * 32, -8, 20, 6, 0x8a4a20, 2);
      }
      break;
    case 'bird':
      E(0, 4, 50, 36, CM.wood);
      C(18, -14, 12, CM.wood);
      T([28, -16, 28, -10, 40, -13], 0xe8a33d);
      C(20, -16, 3, CM.ink);
      break;
    case 'fox':
      E(0, 10, 30, 40, CM.copper);
      C(0, -18, 14, CM.copper);
      T([-12, -24, -6, -42, 0, -26], CM.copper);
      T([12, -24, 6, -42, 0, -26], CM.copper);
      break;
    case 'monkey':
      C(0, 0, 26, CM.wood);
      C(0, 6, 14, CM.woodLight);
      C(-26, -6, 8, CM.wood);
      C(26, -6, 8, CM.wood);
      break;
    case 'oilcan':
      E(-6, 10, 44, 34, CM.copperDark);
      L(10, 0, 38, -26, 5, BRASS);
      R(-14, -16, 16, 10, DARK, 3);
      break;
    case 'magnet':
      g.lineStyle(12 * s, CM.copperDark, 1);
      g.beginPath();
      g.arc(x, y - 4 * s, 20 * s, 0, Math.PI, false);
      g.strokePath();
      R(-26, -6, 12, 14, STEEL, 2);
      R(14, -6, 12, 14, STEEL, 2);
      break;
    case 'peeklens':
      C(-8, -8, 22, 0x7fd3ff, 0.5);
      g.lineStyle(5 * s, BRASS, 1);
      g.strokeCircle(x - 8 * s, y - 8 * s, 22 * s);
      L(8, 8, 30, 30, 8, DARK);
      break;
    case 'boots':
      R(-24, -24, 22, 34, CM.woodDark, 6);
      R(4, -24, 22, 34, CM.woodDark, 6);
      for (let i = 0; i < 2; i++) {
        g.lineStyle(3 * s, STEEL, 1);
        g.strokeEllipse(x + (-13 + i * 28) * s, y + 18 * s, 18 * s, 6 * s);
        g.strokeEllipse(x + (-13 + i * 28) * s, y + 26 * s, 18 * s, 6 * s);
      }
      break;
    case 'grapple':
      for (let i = 0; i < 5; i++) {
        g.lineStyle(3 * s, STEEL, 1);
        g.strokeEllipse(x + (-30 + i * 10) * s, y + 10 * s, 10 * s, 24 * s);
      }
      T([22, 0, 40, -10, 34, 10], DARK);
      break;
    case 'spool':
      R(-26, -30, 52, 10, WOOD, 3);
      R(-26, 20, 52, 10, WOOD, 3);
      R(-18, -20, 36, 40, COPPER, 4);
      for (let i = 0; i < 5; i++) L(-18, -16 + i * 8, 18, -12 + i * 8, 2, CM.copperLight);
      break;
    case 'wrench':
      L(-26, 26, 14, -14, 9, STEEL);
      C(20, -20, 14, STEEL);
      C(26, -26, 8, 0x000000, 0);
      g.fillStyle(CM.ink, 1);
      g.fillRect(x + 18 * s, y - 34 * s, 10 * s, 16 * s);
      break;
    case 'pencil':
      L(-28, 28, 22, -22, 10, CM.brass);
      T([22, -22, 34, -34, 28, -16], 0xf2c9a5);
      C(-28, 28, 5, 0xff8fab);
      break;
    case 'fork':
      L(0, 34, 0, -2, 6, STEEL);
      L(-12, -2, -12, -36, 5, STEEL);
      L(12, -2, 12, -36, 5, STEEL);
      L(-12, -2, 12, -2, 5, STEEL);
      break;
    case 'nest':
      E(0, 10, 70, 34, CM.wood);
      for (let i = 0; i < 8; i++) L(-26 + i * 7, 20, -20 + i * 7, 0, 1, CM.woodDark);
      C(-14, 2, 6, 0xffd700);
      C(8, 0, 5, CM.sky);
      C(20, 6, 4, 0xff8787);
      break;
    case 'heart':
      g.fillStyle(0xff8787, 1);
      heart(g, x, y, 50 * s);
      break;
    default:
      gearAt(0, 0, 22, STEEL, 8);
  }
}
