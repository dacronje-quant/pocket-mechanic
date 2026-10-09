/** Repair 1 — Mr. Finch's Cuckoo Clock (GDD §14, Appendix A). */
import { meshedPosition } from '../../mechanism/graph';
import type { RoomDef } from '../types';

const T = 'clock' as const;

// 1.2 — the prototype room, now data on the shared gear kind.
const A = { teeth: 24, x: 245, y: 425 };
const P = meshedPosition(A, 20, -25);
const B = meshedPosition({ ...P, teeth: 20 }, 16, -10);
const C = meshedPosition({ ...B, teeth: 16 }, 36, 15);
const D = meshedPosition({ ...C, teeth: 36 }, 14, -40);
const E = meshedPosition({ ...D, teeth: 14 }, 28, 10);

// 1.5 Fixer: a gear pair between the drive and the hands arbor.
const hD = { teeth: 20, x: 300, y: 410 };
const hP1 = meshedPosition(hD, 28, -20);
const hP2 = meshedPosition({ ...hP1, teeth: 28 }, 16, 15);
const hH = meshedPosition({ ...hP2, teeth: 16 }, 30, -10);
// 1.5 Engineer: constant centre distances (40 and 50 teeth) → 10→30 then 10→40 = 12:1.
const eI = { x: 330, y: 420 };
const eC = { x: eI.x + 100 * Math.cos((-15 * Math.PI) / 180), y: eI.y + 100 * Math.sin((-15 * Math.PI) / 180) };
const eO = { x: eC.x + 125 * Math.cos((-5 * Math.PI) / 180), y: eC.y + 125 * Math.sin((-5 * Math.PI) / 180) };

export const R1_ROOMS: RoomDef[] = [
  {
    id: '1-1',
    kind: 'balance',
    title: 'The Weight Well',
    theme: T,
    families: ['levers'],
    pedia: ['lever', 'fulcrum', 'counterweight'],
    intro: "The clock weights are sitting on the floor. Hop on the big lever and lift them up!",
    hints: [
      'A lever is a see-saw. Where is its middle?',
      'Slide the fulcrum closer to the heavy weights. Then even little Kip can lift them.',
      'Push the fulcrum all the way to the weights, then pull the lever.',
    ],
    mode: 'lever',
    lever: {
      half: 4,
      fulcrum: 0,
      fulcrumMin: -3,
      fulcrumMax: 3,
      fixed: [{ id: 'load', pos: -4, mass: 6 }],
      slots: [],
      tray: [],
      goal: { kind: 'lift', side: 'left' },
      kip: { pos: 4, mass: 1 },
      art: 'weights',
    },
    solution: { fulcrum: -3 },
    hidden: { x: 1060, y: 170 },
    treasure: { id: 'apron-button', x: 214, y: 520 },
    clever: { kind: 'par' },
    par: { moves: 2, seconds: 45 },
    resident: 'coo',
    styles: {
      engineer: {
        intro: 'Balance the beam exactly: hang drawer weights so both sides turn the same.',
        lever: {
          half: 4,
          fulcrum: 0,
          fulcrumMin: 0,
          fulcrumMax: 0,
          fixed: [{ id: 'load', pos: -2, mass: 6 }],
          slots: [1, 2, 3, 4],
          tray: [1, 2, 4, 5],
          goal: { kind: 'balance' },
          art: 'weights',
        },
        solution: { weights: [{ slot: 3, mass: 4 }] },
        hints: [
          'Turning power is weight times distance from the middle.',
          'The load is 6 heavy, 2 steps out: that makes 12. Make 12 on the other side.',
          'Hang the 4 weight 3 steps out.',
        ],
      },
    },
  },
  {
    id: '1-2',
    kind: 'gear',
    title: 'The Gear Gallery',
    theme: T,
    families: ['gears'],
    pedia: ['gear', 'mesh', 'idler'],
    intro: "Mr. Finch's clock won't tick! The power stops somewhere. Can you find what's missing?",
    hints: [
      'Tap the lens to Peek. See where the golden power stops?',
      'Gears only turn each other when their teeth just touch. Which size reaches both gears?',
      'This one! Drag the middle-sized gear onto the glowing peg.',
    ],
    shafts: [
      { id: 'A', ...A, gears: [{ teeth: 24, paint: 'brass' }] },
      { id: 'P', ...P, peg: true },
      { id: 'B', ...B, gears: [{ teeth: 16, paint: 'copper' }] },
      { id: 'C', ...C, gears: [{ teeth: 36, paint: 'brass' }] },
      { id: 'D', ...D, gears: [{ teeth: 14, paint: 'steel' }] },
      { id: 'E', ...E, gears: [{ teeth: 28, paint: 'copper' }] },
    ],
    driver: { shaft: 'A', source: 'weights', dir: -1, turnsPerSecond: 0.146 },
    outputs: [{ shaft: 'E', widget: 'hands', at: { x: 985, y: 290 }, size: 140, dir: 1 }],
    tray: [12, 20, 32],
    solution: [{ shaft: 'P', layer: 0, teeth: 20 }],
    hidden: { x: 180, y: 160 },
    clever: { kind: 'fiddle' },
    resident: 'coo',
    styles: {
      engineer: {
        intro: 'Power climbs the weight chain and stops. Peek with the lens, then pick the gear that meshes with BOTH neighbours.',
      },
    },
  },
  {
    id: '1-3',
    kind: 'oil',
    title: 'The Rusty Stair',
    theme: T,
    families: ['gears', 'springs'],
    pedia: ['oil', 'hinge', 'bearing'],
    intro: 'A little oil makes everything happier. Oil the squeaky stair gears so they turn!',
    hints: ['Listen for the squeaks. Which gears are rusty?', 'Drag the oil can onto each rusty stair gear.', 'Oil the gears that make the staircase, from the bottom up.'],
    parts: [
      { id: 's1', x: 330, y: 480, art: 'gear', size: 46, required: true },
      { id: 's2', x: 440, y: 420, art: 'gear', size: 46, required: true },
      { id: 's3', x: 550, y: 360, art: 'gear', size: 46, required: true },
      { id: 's4', x: 660, y: 300, art: 'gear', size: 46, required: true },
      { id: 's5', x: 770, y: 240, art: 'gear', size: 46, required: true },
      { id: 's6', x: 880, y: 180, art: 'gear', size: 46, required: true },
      { id: 'h1', x: 230, y: 230, art: 'hinge', size: 30, required: false },
      { id: 'h2', x: 1030, y: 330, art: 'hinge', size: 30, required: false },
      { id: 'p1', x: 210, y: 430, art: 'spring', size: 30, required: false },
      { id: 'p2', x: 1050, y: 470, art: 'spring', size: 30, required: false },
      { id: 'w1', x: 800, y: 460, art: 'wheel', size: 34, required: false },
      { id: 'b1', x: 470, y: 230, art: 'bearing', size: 26, required: false },
    ],
    payoff: 'stair',
    gives: 'oilcan',
    hidden: { x: 1000, y: 180 },
    clever: { kind: 'special', id: 'oilAll', label: 'Oil all 12 squeaky things' },
    resident: 'coo',
  },
  {
    id: '1-4',
    kind: 'pendulum',
    title: 'The Pendulum Hall',
    theme: T,
    families: ['pendulums', 'springs'],
    pedia: ['pendulum', 'escapement'],
    intro: "The pendulum is still. Give it a push and the whole clock will tick-tock!",
    hints: ['The escapement needs a little piece to catch the teeth.', 'Find the pallet piece in the drawer and snap it on.', 'Snap on the pallet, then give the pendulum a push.'],
    goal: 'push',
    pallet: true,
    pendulums: [{ id: 'p', notch: 6 }],
    minNotch: 1,
    maxNotch: 10,
    solution: {},
    gives: 'peek',
    hidden: { x: 200, y: 170 },
    clever: { kind: 'noHints' },
    resident: 'coo',
    styles: {
      engineer: {
        goal: 'tempo',
        pallet: false,
        pendulums: [{ id: 'p', notch: 2 }],
        bpm: 69.1,
        solution: { notches: { p: 6 } },
        intro: 'The clock runs too fast. Slide the bob to match the metronome beat: 69 ticks a minute.',
        hints: ['A longer pendulum swings slower.', 'Slide the bob down to make the pendulum longer.', 'Notch 6 swings at 69 ticks a minute.'],
      },
    },
  },
  {
    id: '1-5',
    kind: 'gear',
    title: 'The Hands Room',
    theme: T,
    families: ['gears'],
    pedia: ['gear-train', 'ratio', 'compound-gear'],
    intro: 'Behind the clock face! Connect the drive gear to the hands so they sweep around.',
    hints: ['Two pegs are empty between the drive and the hands.', 'Each gear must touch the gear before and the gear after.', 'A big gear goes on the first peg, a small one on the second.'],
    shafts: [
      { id: 'D', ...hD, gears: [{ teeth: 20, paint: 'steel' }] },
      { id: 'P1', ...hP1, peg: true },
      { id: 'P2', ...hP2, peg: true },
      { id: 'H', ...hH, gears: [{ teeth: 30, paint: 'brass' }] },
    ],
    driver: { shaft: 'D', source: 'spring', turnsPerSecond: 0.2 },
    outputs: [{ shaft: 'H', widget: 'hands', at: { x: 960, y: 290 }, size: 150 }],
    tray: [12, 16, 28, 32],
    solution: [
      { shaft: 'P1', layer: 0, teeth: 28 },
      { shaft: 'P2', layer: 0, teeth: 16 },
    ],
    treasure: { id: 'recipe', x: 1040, y: 175 },
    hidden: { x: 240, y: 160 },
    clever: { kind: 'par' },
    resident: 'coo',
    styles: {
      engineer: {
        intro: 'The minute hand must turn 12 times for every turn of the hour hand. Build a 12 to 1 gear train.',
        hints: [
          'Ratio = teeth on the driven gear ÷ teeth on the driving gear.',
          'The middle shaft holds two gears stuck together. 3 to 1 then 4 to 1 makes 12 to 1.',
          'Input 10, then 30 behind with 10 in front, then 40 on the hour arbor.',
        ],
        shafts: [
          { id: 'I', ...eI, peg: true },
          { id: 'C', ...eC, peg: true, layers: [0, 1] },
          { id: 'O', ...eO, peg: true, layers: [1] },
        ],
        driver: { shaft: 'I', source: 'spring', turnsPerSecond: 0.6 },
        outputs: [{ shaft: 'O', widget: 'hands', at: { x: 960, y: 290 }, size: 150, ratio: 1 / 12, tol: 0.01, label: 'hour hand 12:1' }],
        tray: [10, 10, 20, 30, 40],
        solution: [
          { shaft: 'I', layer: 0, teeth: 10 },
          { shaft: 'C', layer: 0, teeth: 30 },
          { shaft: 'C', layer: 1, teeth: 10 },
          { shaft: 'O', layer: 1, teeth: 40 },
        ],
        par: { moves: 4, seconds: 120 },
      },
    },
  },
  {
    id: '1-6',
    kind: 'chain',
    title: "Coo's Loft",
    theme: T,
    families: ['music', 'levers'],
    pedia: ['cam', 'bellows'],
    intro: "Coo's door lever and bellows are unhooked. Hook them back up so Coo can sing!",
    hints: ['Follow the glow from the hour wheel.', 'A cam turns turning into pushing. Bellows turn pushing into sound.', 'Cam first, then the bellows, then Coo sings.'],
    links: [{ part: 'hourwheel' }, { slot: true, sol: 'cam' }, { slot: true, sol: 'bellows' }, { part: 'coo' }],
    tray: ['cam', 'bellows', 'gearbox', 'dynamo'],
    reveal: 'clock',
    mark: { x: 1050, y: 190 },
    hidden: { x: 230, y: 170 },
    clever: { kind: 'fiddle' },
    resident: 'coo',
  },
  {
    id: '1-bf',
    kind: 'chain',
    title: "Big Fix: Four O'Clock!",
    theme: T,
    families: ['gears', 'pendulums', 'music', 'levers'],
    pedia: ['chain-reaction'],
    intro: "The whole clock, start to finish! Fill the missing links so at four o'clock, Coo sings.",
    hints: ['The weight pulls, the gears turn… where does the glow stop?', 'Pick a part that takes in what arrives and passes on what comes next.', 'A gearbox after the weights, and a cam before the bellows.'],
    links: [
      { part: 'dropweight' },
      { part: 'weights' },
      { slot: true, sol: 'gearbox' },
      { part: 'pendulum' },
      { part: 'hands' },
      { slot: true, sol: 'cam' },
      { part: 'bellows' },
      { part: 'coo' },
    ],
    tray: ['gearbox', 'cam', 'pulley', 'striker'],
    reveal: 'clock',
    blueprint: { id: 'bp-cuckoo', x: 1040, y: 170 },
    clever: { kind: 'par' },
    resident: 'coo',
    styles: {
      engineer: {
        links: [
          { part: 'dropweight' },
          { slot: true, sol: 'weights' },
          { slot: true, sol: 'gearbox' },
          { part: 'pendulum' },
          { part: 'hands' },
          { slot: true, sol: 'cam' },
          { slot: true, sol: 'bellows' },
          { part: 'coo' },
        ],
        tray: ['weights', 'gearbox', 'cam', 'bellows', 'pulley', 'striker', 'dynamo'],
      },
    },
  },
];
