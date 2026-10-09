/**
 * Part icons, drawn in code: chain-reaction links, Part-o-pedia pages, tools.
 * drawPart(g, id, x, y, s) fits the part in roughly an 80·s pixel square.
 */
import Phaser from 'phaser';
import { heart, star } from './Kip';

const BRASS = 0xd9a441;
const DARK = 0x5e3f10;
const STEEL = 0x9aa6b4;
const COPPER = 0xc8703f;
const WOOD = 0x8a5a33;

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
  const C = (dx: number, dy: number, r: number, c: number, a = 1) => {
    g.fillStyle(c, a);
    g.fillCircle(x + dx * s, y + dy * s, r * s);
  };
  const R = (dx: number, dy: number, w: number, h: number, c: number, r = 4) => {
    g.fillStyle(c, 1);
    g.fillRoundedRect(x + dx * s, y + dy * s, w * s, h * s, Math.min(r, (w / 2) * 0.99, (h / 2) * 0.99) * s);
  };
  const L = (x1: number, y1: number, x2: number, y2: number, w: number, c: number) => {
    g.lineStyle(w * s, c, 1);
    g.lineBetween(x + x1 * s, y + y1 * s, x + x2 * s, y + y2 * s);
  };
  const T = (pts: number[], c: number) => {
    g.fillStyle(c, 1);
    const v: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < pts.length; i += 2) v.push(new Phaser.Math.Vector2(x + pts[i] * s, y + pts[i + 1] * s));
    g.fillPoints(v, true);
  };
  const gearAt = (dx: number, dy: number, r: number, c: number, teeth = 10) => {
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      C(dx + Math.cos(a) * r, dy + Math.sin(a) * r, r * 0.22, c);
    }
    C(dx, dy, r * 0.92, c);
    C(dx, dy, r * 0.35, DARK);
    C(dx - r * 0.25, dy - r * 0.3, r * 0.25, 0xffffff, 0.25);
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
      C(0, 0, 14, 0xffd76a);
      g.lineStyle(2 * s, BRASS, 1);
      g.strokeCircle(x, y, 26 * s);
      g.strokeCircle(x, y, 38 * s);
      C(26, 0, 6, 0x5fa8d3);
      C(-27, -27, 7, 0xe05a47);
      break;
    case 'escapement':
      gearAt(0, 10, 24, BRASS, 9);
      T([-30, -30, 30, -30, 0, -6], COPPER);
      break;
    case 'fan':
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        g.fillStyle(STEEL, 1);
        g.fillEllipse(x + Math.cos(a) * 18 * s, y + Math.sin(a) * 18 * s, 30 * s, 14 * s);
      }
      C(0, 0, 7, DARK);
      break;
    case 'spring':
      for (let i = 0; i < 5; i++) {
        g.lineStyle(4 * s, STEEL, 1);
        g.strokeEllipse(x, y + (-24 + i * 12) * s, 40 * s, 12 * s);
      }
      break;
    case 'key':
      R(-4, -6, 8, 34, BRASS, 3);
      g.fillStyle(BRASS, 1);
      g.fillEllipse(x - 14 * s, y - 16 * s, 24 * s, 32 * s);
      g.fillEllipse(x + 14 * s, y - 16 * s, 24 * s, 32 * s);
      break;
    case 'weights':
      L(-14, -38, -14, 4, 3, 0x8f8a7a);
      L(14, -38, 14, -8, 3, 0x8f8a7a);
      g.fillStyle(0x9a6b1f, 1);
      g.fillEllipse(x - 14 * s, y + 20 * s, 20 * s, 40 * s);
      g.fillEllipse(x + 14 * s, y + 8 * s, 20 * s, 40 * s);
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
      g.fillStyle(BRASS, 1);
      g.fillEllipse(x, y + 10 * s, 50 * s, 38 * s);
      C(-8, 10, 5, DARK);
      R(-5, -40, 10, 32, STEEL, 2);
      break;
    case 'crank':
      C(-14, 10, 18, BRASS);
      L(-14, 10, 20, -20, 6, DARK);
      C(20, -20, 7, 0xd64541);
      break;
    case 'bellows':
      T([-34, -18, 26, -24, 26, 24, -34, 18], 0x8a4a2a);
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
      R(-36, -18, 72, 36, 0xc0c8d0, 14);
      for (let i = 0; i < 12; i++) C(-28 + (i % 6) * 11, -8 + Math.floor(i / 6) * 16, 2.5, 0x5a5a6a);
      break;
    case 'comb':
      for (let i = 0; i < 7; i++) R(-34 + i * 10, -10, 7, 26 + i * 3, 0xc0c8d0, 2);
      R(-38, -18, 76, 10, STEEL, 2);
      break;
    case 'wave':
      g.lineStyle(4 * s, 0x5fa8d3, 1);
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
      C(0, 0, 32, 0x3d2412);
      C(0, 0, 26, 0xf6ead0);
      L(0, 0, 16, -14, 3, 0xd64541);
      C(0, 0, 4, DARK);
      break;
    case 'eye':
      C(0, 0, 26, 0x2b4b2b);
      C(0, 0, 18, 0x51cf66);
      C(0, 0, 7, 0x0b2b0b);
      break;
    case 'battery':
      R(-18, -30, 36, 60, 0x3b7dd8, 6);
      R(-8, -36, 16, 8, STEEL, 2);
      R(-12, -6, 24, 6, 0xffffff, 2);
      R(-3, -15, 6, 24, 0xffffff, 2);
      break;
    case 'plug':
      R(-20, -10, 30, 24, 0x333333, 6);
      R(10, -6, 18, 4, STEEL, 1);
      R(10, 4, 18, 4, STEEL, 1);
      L(-20, 2, -38, 20, 5, 0x333333);
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
      R(-24, 6, 48, 14, 0x333333, 4);
      L(-14, 6, 18, -22, 5, COPPER);
      C(-14, 6, 5, BRASS);
      break;
    case 'motor':
    case 'dynamo':
      R(-28, -20, 46, 40, key === 'dynamo' ? 0x2e9b5f : 0x3b7dd8, 8);
      R(18, -4, 18, 8, STEEL, 2);
      g.lineStyle(3 * s, 0xffd43b, 1);
      g.lineBetween(x - 10 * s, y - 10 * s, x - 2 * s, y);
      g.lineBetween(x - 2 * s, y, x - 12 * s, y + 4 * s);
      g.lineBetween(x - 12 * s, y + 4 * s, x - 2 * s, y + 14 * s);
      break;
    case 'fuse':
      R(-30, -10, 60, 20, 0xf6ead0, 8);
      R(-36, -8, 10, 16, STEEL, 2);
      R(26, -8, 10, 16, STEEL, 2);
      L(-26, 0, 26, 0, 2, COPPER);
      break;
    case 'tube':
      R(-14, -34, 28, 56, 0xffcf80, 12);
      C(0, -6, 10, 0xffb347);
      R(-16, 20, 32, 12, 0x333333, 3);
      break;
    case 'speaker':
      C(0, 0, 32, 0x3d2412);
      C(0, 0, 24, 0x6e4527);
      C(0, 0, 10, 0x2b1d14);
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
      L(14, 12, 40, 26, 3, 0x74c0fc);
      break;
    case 'stars':
      g.fillStyle(0xfff3b0, 1);
      star(g, x - 14 * s, y - 8 * s, 12 * s);
      star(g, x + 16 * s, y + 4 * s, 9 * s);
      star(g, x - 4 * s, y + 18 * s, 6 * s);
      break;
    case 'valve':
      R(-38, -6, 76, 12, COPPER, 3);
      C(0, -16, 18, 0xd64541);
      C(0, -16, 6, DARK);
      L(-18, -16, 18, -16, 3, DARK);
      L(0, -34, 0, 2, 3, DARK);
      break;
    case 'pipe':
      R(-38, -8, 46, 16, COPPER, 4);
      R(-8, -8, 16, 46, COPPER, 4);
      R(-12, -12, 24, 24, 0xb5652e, 4);
      break;
    case 'kettle':
      g.fillStyle(COPPER, 1);
      g.fillEllipse(x, y + 8 * s, 56 * s, 44 * s);
      T([22, 0, 40, -16, 26, 10], COPPER);
      R(-10, -22, 20, 8, DARK, 3);
      C(-36, -24, 8, 0xffffff, 0.7);
      C(-28, -36, 10, 0xffffff, 0.5);
      break;
    case 'piston':
      R(-20, -10, 40, 40, STEEL, 4);
      R(-6, -36, 12, 30, 0xc0c8d0, 2);
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
      R(-16, -16, 32, 44, 0x2e9b5f, 6);
      L(0, -16, 0, -36, 4, DARK);
      L(-18, -36, 18, -36, 5, DARK);
      R(16, 0, 18, 8, COPPER, 2);
      break;
    case 'gate-and':
      R(-30, -30, 60, 60, 0xd64541, 8);
      C(-12, -6, 6, 0x111111);
      C(12, -6, 6, 0x111111);
      R(-14, -6, 4, 14, 0x111111, 1);
      R(10, -6, 4, 14, 0x111111, 1);
      break;
    case 'gate-or':
      L(-26, -28, 0, 4, 8, 0x3b7dd8);
      L(26, -28, 0, 4, 8, 0x3b7dd8);
      L(0, 4, 0, 30, 8, 0x3b7dd8);
      C(-18, -20, 6, 0xffd43b);
      break;
    case 'gate-not':
      T([-6, 20, 6, 20, 0, 6], DARK);
      L(-34, 16, 34, -10, 7, 0x2e9b5f);
      C(-30, 6, 7, 0xffd43b);
      break;
    case 'gate-latch':
      gearAt(0, 0, 22, 0x8e5cc4, 10);
      T([10, -36, 26, -36, 16, -18], DARK);
      break;
    case 'card':
      R(-26, -34, 52, 68, 0xf6ead0, 4);
      for (let i = 0; i < 9; i++) C(-14 + (i % 3) * 14, -20 + Math.floor(i / 3) * 16, 3.5, (i * 7) % 3 === 0 ? 0x2b1d14 : 0xd9c7a0);
      break;
    case 'button':
      R(-28, 8, 56, 16, 0x555555, 4);
      g.fillStyle(0xe74c3c, 1);
      g.fillEllipse(x, y + 4 * s, 40 * s, 22 * s);
      break;
    case 'marble':
      L(-36, -26, 30, 10, 6, WOOD);
      C(-16, -24, 9, 0x74c0fc);
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
      C(0, 0, 32, 0xf6ead0);
      g.lineStyle(3 * s, BRASS, 1);
      g.strokeCircle(x, y, 32 * s);
      L(0, 0, 0, -24, 4, 0x2b1d14);
      L(0, 0, 16, 6, 5, 0x2b1d14);
      break;
    case 'chain':
      for (let i = 0; i < 4; i++) {
        g.lineStyle(4 * s, STEEL, 1);
        g.strokeEllipse(x + (-27 + i * 18) * s, y, 22 * s, 12 * s);
      }
      break;
    case 'train':
      R(-36, -16, 50, 28, 0x2b7a78, 6);
      R(4, -30, 10, 16, 0x222222, 2);
      R(14, -10, 22, 22, 0x2b7a78, 4);
      C(-24, 16, 8, 0x222222);
      C(0, 16, 8, 0x222222);
      C(24, 16, 8, 0x222222);
      break;
    case 'track':
      for (let i = 0; i < 5; i++) R(-34 + i * 16, -14, 8, 28, WOOD, 2);
      L(-40, -8, 40, -8, 4, 0x777777);
      L(-40, 8, 40, 8, 4, 0x777777);
      break;
    case 'points':
      L(-36, 20, 36, 20, 5, 0x777777);
      L(-10, 20, 30, -18, 5, 0x777777);
      R(-16, 26, 10, 10, 0xd64541, 2);
      break;
    case 'signal':
      R(-4, -10, 8, 46, 0x333333, 2);
      R(-14, -38, 28, 34, 0x222222, 6);
      C(0, -28, 6, 0xff6b6b);
      C(0, -14, 6, 0x51cf66);
      break;
    case 'buffer':
      R(-30, -10, 60, 30, 0xd64541, 4);
      C(-16, -16, 8, 0xffd43b);
      C(16, -16, 8, 0xffd43b);
      break;
    case 'hinge':
      R(-26, -20, 22, 40, STEEL, 3);
      R(4, -20, 22, 40, STEEL, 3);
      R(-4, -24, 8, 48, 0x6c757d, 4);
      break;
    case 'bearing':
      C(0, 0, 30, STEEL);
      C(0, 0, 14, 0xffffff);
      for (let i = 0; i < 8; i++) C(Math.cos((i / 8) * 6.28) * 22, Math.sin((i / 8) * 6.28) * 22, 5, 0xe9ecef);
      break;
    case 'screw':
      T([-10, -30, 10, -30, 6, 30, -6, 30], STEEL);
      for (let i = 0; i < 6; i++) L(-10, -24 + i * 9, 10, -20 + i * 9, 2, 0x6c757d);
      R(-18, -38, 36, 10, STEEL, 3);
      break;
    case 'ramp':
      T([-38, 26, 38, 26, 38, -22], WOOD);
      C(-8, 2, 8, 0x74c0fc);
      break;
    case 'wedge':
      T([-30, 26, 30, 26, 0, -30], STEEL);
      break;
    case 'wheel':
      C(0, 0, 30, WOOD);
      C(0, 0, 22, 0xc49a6c);
      L(-40, 0, 40, 0, 6, DARK);
      break;
    case 'candles':
      for (let i = 0; i < 3; i++) {
        R(-26 + i * 20, -6, 12, 34, [0xff8fab, 0x74c0fc, 0xffd43b][i], 3);
        g.fillStyle(0xffa94d, 1);
        g.fillEllipse(x + (-20 + i * 20) * s, y - 14 * s, 8 * s, 14 * s);
      }
      break;
    case 'boat':
      T([-34, 0, 34, 0, 24, 18, -24, 18], 0xe05a47);
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
      g.fillStyle(0x8a5a33, 1);
      g.fillEllipse(x, y + 4 * s, 50 * s, 36 * s);
      C(18, -14, 12, 0x8a5a33);
      T([28, -16, 28, -10, 40, -13], 0xe8a33d);
      C(20, -16, 3, 0x111111);
      break;
    case 'fox':
      g.fillStyle(0xe67e22, 1);
      g.fillEllipse(x, y + 10 * s, 30 * s, 40 * s);
      C(0, -18, 14, 0xe67e22);
      T([-12, -24, -6, -42, 0, -26], 0xe67e22);
      T([12, -24, 6, -42, 0, -26], 0xe67e22);
      break;
    case 'monkey':
      C(0, 0, 26, 0x8a5a33);
      C(0, 6, 14, 0xc49a6c);
      C(-26, -6, 8, 0x8a5a33);
      C(26, -6, 8, 0x8a5a33);
      break;
    case 'oilcan':
      g.fillStyle(0xd64541, 1);
      g.fillEllipse(x - 6 * s, y + 10 * s, 44 * s, 34 * s);
      L(10, 0, 38, -26, 5, BRASS);
      R(-14, -16, 16, 10, DARK, 3);
      break;
    case 'magnet':
      g.lineStyle(12 * s, 0xd64541, 1);
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
      R(-24, -24, 22, 34, 0x8a4a2a, 6);
      R(4, -24, 22, 34, 0x8a4a2a, 6);
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
      for (let i = 0; i < 5; i++) L(-18, -16 + i * 8, 18, -12 + i * 8, 2, 0xf0a77a);
      break;
    case 'wrench':
      L(-26, 26, 14, -14, 9, STEEL);
      C(20, -20, 14, STEEL);
      C(26, -26, 8, 0x000000, 0);
      g.fillStyle(0x2b1d14, 1);
      g.fillRect(x + 18 * s, y - 34 * s, 10 * s, 16 * s);
      break;
    case 'pencil':
      L(-28, 28, 22, -22, 10, 0xffd43b);
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
      g.fillStyle(0x8a5a33, 1);
      g.fillEllipse(x, y + 10 * s, 70 * s, 34 * s);
      C(-14, 2, 6, 0xffd700);
      C(8, 0, 5, 0xc0c8d0);
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
