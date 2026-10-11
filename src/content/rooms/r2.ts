/** Repair 2 — Rosa's Music Box. */
import { followerPattern } from '../../mechanism/cams';
import { melodyFromNotes } from '../../mechanism/pins';
import type { RoomDef } from '../types';

const T = 'musicbox' as const;

/** Abuela's lullaby (Brahms' Lullaby, opening phrase): E E G · E E G · E G C' B A A G. */
export const LULLABY = melodyFromNotes([2, 2, 4, -1, 2, 2, 4, -1, 2, 4, 7, 6, 5, 5, 4, -1]);

// 2.5: spring barrel 30 → compound shaft (10 behind) → fan shaft. Centre distances are 40 teeth.
const gD = { x: 300, y: 420 };
const gM = { x: gD.x + 100 * Math.cos((-20 * Math.PI) / 180), y: gD.y + 100 * Math.sin((-20 * Math.PI) / 180) };
const gF = { x: gM.x + 100, y: gM.y };

export const R2_ROOMS: RoomDef[] = [
  {
    id: '2-1',
    kind: 'hunt',
    title: 'The Velvet Drawer',
    theme: T,
    families: ['springs'],
    pedia: ['crank'],
    intro: "Somewhere under these velvet cushions is the winding crank. Bounce around and find it!",
    hints: ['Tap a cushion to lift it up.', 'Things are hiding under the big cushions.', 'Try the big cushion at the bottom right.'],
    covers: [
      { x: 300, y: 470, art: 'cushion', item: 'bits' },
      { x: 470, y: 400, art: 'cushion', item: 'boots' },
      { x: 640, y: 470, art: 'cushion' },
      { x: 810, y: 400, art: 'cushion', item: 'photo' },
      { x: 980, y: 470, art: 'cushion', item: 'crank', target: true },
      { x: 390, y: 260, art: 'box', item: 'button' },
      { x: 720, y: 250, art: 'spool', item: 'spring' },
      { x: 940, y: 260, art: 'cushion', item: 'gear' },
    ],
    gives: 'boots',
    treasure: { id: 'photo', x: 810, y: 400 },
    hidden: { x: 210, y: 180 },
    clever: { kind: 'special', id: 'liftAll', label: 'Look under every cushion' },
    resident: 'clementine',
  },
  {
    id: '2-2',
    kind: 'oil',
    title: 'The Mainspring Vault',
    theme: T,
    families: ['springs'],
    pedia: ['mainspring', 'ratchet'],
    intro: 'Wind the big mainspring with the crank — and fix the ratchet pawl so it holds!',
    hints: ['Turn the crank round and round.', 'The spring slips back. Something needs to catch the ratchet teeth.', 'Snap the little pawl onto the ratchet, then wind three times.'],
    parts: [
      { id: 'r1', x: 260, y: 230, art: 'hinge', size: 28, required: false },
      { id: 'r2', x: 1030, y: 230, art: 'spring', size: 28, required: false },
      { id: 'r3', x: 1040, y: 470, art: 'bearing', size: 24, required: false },
    ],
    crank: { x: 470, y: 380, turns: 3 },
    pawl: { x: 760, y: 300 },
    payoff: 'vault',
    hidden: { x: 230, y: 470 },
    clever: { kind: 'par' },
    resident: 'clementine',
  },
  {
    id: '2-3',
    kind: 'music',
    title: 'The Pin Garden',
    theme: T,
    families: ['music'],
    pedia: ['pinned-cylinder', 'comb'],
    intro: "Some pins fell off the cylinder. Put them back and Abuela's lullaby will play again!",
    hints: ['Each pin plucks one note as the cylinder turns.', 'Listen to the lullaby, then find the gaps in the tune.', 'Tap the glowing holes to put the pins back.'],
    steps: 16,
    notes: 8,
    melody: LULLABY,
    missing: [2, 5, 8, 10, 12],
    tempo: 3,
    hidden: { x: 1060, y: 170 },
    clever: { kind: 'noPeek' },
    resident: 'clementine',
    styles: {
      engineer: {
        intro: 'Recreate the lullaby by ear: some pins are missing and some are in the wrong place.',
        missing: [1, 2, 5, 7, 8, 10, 12],
        extra: [
          [3, 5],
          [11, 2],
        ],
      },
    },
  },
  {
    id: '2-4',
    kind: 'tune',
    title: 'The Comb Organ',
    theme: T,
    families: ['music'],
    pedia: ['comb', 'pitch'],
    intro: 'Three comb teeth are bent and sound wobbly. Straighten them until they ring true.',
    hints: ['Drag a tooth and listen. Does it sound right?', 'Watch the wave: when it lines up with the ghost wave, the tooth is true.', 'Slide each tooth to the middle.'],
    mode: 'comb',
    dials: [
      { id: 't1', start: 0.12, target: 0.5, tol: 0.04 },
      { id: 't2', start: 0.86, target: 0.5, tol: 0.04 },
      { id: 't3', start: 0.27, target: 0.5, tol: 0.04 },
    ],
    treasure: { id: 'ribbon', x: 1050, y: 180 },
    hidden: { x: 220, y: 180 },
    clever: { kind: 'par' },
    resident: 'clementine',
  },
  {
    id: '2-5',
    kind: 'gear',
    title: "The Governor's Fan",
    theme: T,
    families: ['gears', 'springs'],
    pedia: ['governor', 'compound-gear'],
    intro: 'The fan spins far too fast, so the lullaby gallops! Change the gears to slow the fan down.',
    hints: [
      'Big gears turn slowly. Small gears turn fast.',
      'The fan gear is too small. Give the fan a bigger gear.',
      'Put the small gear in front on the middle shaft, and the big gear on the fan.',
    ],
    shafts: [
      { id: 'D', ...gD, gears: [{ teeth: 30, paint: 'steel' }] },
      { id: 'M', ...gM, peg: true, layers: [0, 1] },
      { id: 'F', ...gF, peg: true, layers: [1] },
    ],
    driver: { shaft: 'D', source: 'spring', turnsPerSecond: 0.25 },
    outputs: [{ shaft: 'F', widget: 'fan', at: { x: 840, y: 290 }, size: 120, maxRatio: 1, label: 'fan: slow and steady' }],
    tray: [10, 20, 20, 10, 30],
    initial: [
      { shaft: 'M', layer: 0, teeth: 10 },
      { shaft: 'M', layer: 1, teeth: 20 },
      { shaft: 'F', layer: 1, teeth: 20 },
    ],
    solution: [
      { shaft: 'M', layer: 0, teeth: 10 },
      { shaft: 'M', layer: 1, teeth: 10 },
      { shaft: 'F', layer: 1, teeth: 30 },
    ],
    mark: { x: 1050, y: 470 },
    hidden: { x: 230, y: 170 },
    clever: { kind: 'par' },
    resident: 'clementine',
    styles: {
      engineer: {
        intro: 'Exact Ratio: make the fan turn at exactly the same speed as the spring barrel.',
        outputs: [{ shaft: 'F', widget: 'fan', at: { x: 840, y: 290 }, size: 120, ratio: 1, tol: 0.01, label: 'fan 1:1' }],
      },
    },
  },
  {
    id: '2-6',
    kind: 'cam',
    title: "Clementine's Stage",
    theme: T,
    families: ['music'],
    pedia: ['cam', 'follower'],
    intro: 'Clementine forgot her dance! Give each of her rods the right cam so she spins and bows.',
    hints: ['A cam is a bumpy wheel. Each bump pushes the rod up.', 'The spin rod pops up twice per turn. The bow rod stays up for half a turn.', 'Heart cam for the spin, pear cam for the bow.'],
    followers: [
      { id: 'spin', art: 'fox', target: followerPattern('heart', 0) },
      { id: 'bow', art: 'dancer', target: followerPattern('pear', 3) },
    ],
    tray: ['egg', 'pear', 'heart', 'star', 'round'],
    solution: { spin: { shape: 'heart', phase: 0 }, bow: { shape: 'pear', phase: 3 } },
    hidden: { x: 1060, y: 180 },
    clever: { kind: 'fiddle' },
    resident: 'clementine',
  },
  {
    id: '2-bf',
    kind: 'chain',
    title: "Big Fix: Abuela's Lullaby",
    theme: T,
    families: ['springs', 'music'],
    pedia: ['chain-reaction'],
    intro: 'Wind, steady, play! Fill in the links so the whole music box sings.',
    hints: ['The crank turns. What should the turning do next?', 'A mainspring stores the winding; the cylinder turns turning into music.', 'Mainspring after the crank, cylinder before Clementine.'],
    links: [{ part: 'crank' }, { slot: true, sol: 'mainspring' }, { part: 'governor' }, { slot: true, sol: 'cylinder' }, { part: 'clementine' }],
    tray: ['mainspring', 'cylinder', 'cam', 'dynamo'],
    reveal: 'musicbox',
    blueprint: { id: 'bp-musicdrum', x: 1050, y: 170 },
    clever: { kind: 'par' },
    resident: 'clementine',
    styles: {
      engineer: {
        links: [{ part: 'crank' }, { slot: true, sol: 'mainspring' }, { slot: true, sol: 'governor' }, { slot: true, sol: 'cylinder' }, { part: 'clementine' }],
        tray: ['mainspring', 'governor', 'cylinder', 'cam', 'dynamo', 'striker'],
      },
    },
  },
];
