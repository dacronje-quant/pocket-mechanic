/**
 * Making Kip yours (GDD §18). Everything is earned in play, cosmetic only,
 * and most items come from someone Kip helped. Shiny Bits are earned, never bought.
 */

export type CosmeticSlot = 'key' | 'plate' | 'finish' | 'eyes' | 'bulb' | 'hat' | 'feet' | 'voice' | 'trail' | 'tool';

export type CosmeticSource =
  | { kind: 'start' }
  | { kind: 'shiny'; cost: number }
  | { kind: 'repair'; repair: number }
  | { kind: 'treasure'; treasure: string }
  | { kind: 'quick'; quick: string }
  | { kind: 'medals'; count: number }
  | { kind: 'gold'; count: number }
  | { kind: 'attic'; count: number }
  | { kind: 'box' };

export interface Cosmetic {
  id: string;
  slot: CosmeticSlot;
  name: string;
  source: CosmeticSource;
  color?: number;
  color2?: number;
}

const start = { kind: 'start' } as const;
const shiny = (cost: number) => ({ kind: 'shiny', cost }) as const;
const repair = (r: number) => ({ kind: 'repair', repair: r }) as const;
const treasure = (t: string) => ({ kind: 'treasure', treasure: t }) as const;
const quick = (q: string) => ({ kind: 'quick', quick: q }) as const;
const medals = (n: number) => ({ kind: 'medals', count: n }) as const;
const gold = (n: number) => ({ kind: 'gold', count: n }) as const;
const attic = (n: number) => ({ kind: 'attic', count: n }) as const;

const c = (id: string, slot: CosmeticSlot, name: string, source: CosmeticSource, color?: number, color2?: number): Cosmetic => ({ id, slot, name, source, color, color2 });

const ENAMELS: Array<[string, string, number]> = [
  ['red', 'Cherry Enamel', 0xd64541],
  ['orange', 'Marmalade Enamel', 0xe67e22],
  ['yellow', 'Buttercup Enamel', 0xf1c40f],
  ['lime', 'Lime Enamel', 0x9bd34a],
  ['green', 'Clover Enamel', 0x2e9b5f],
  ['teal', 'Teal Enamel', 0x1a9e9a],
  ['sky', 'Sky Enamel', 0x6ec1f0],
  ['blue', 'Harbour Enamel', 0x3463b5],
  ['violet', 'Violet Enamel', 0x8e5cc4],
  ['pink', 'Rosebud Enamel', 0xef8fb5],
  ['cream', 'Cream Enamel', 0xf2e6c8],
  ['black', 'Inkwell Enamel', 0x2b2b33],
];

const QUICK_BULBS: Array<[string, string, string, number]> = [
  ['bulb-red', 'Red Bulb', 'qf-hinge', 0xff6b6b],
  ['bulb-orange', 'Orange Bulb', 'qf-mouse', 0xffa94d],
  ['bulb-yellow', 'Sunny Bulb', 'qf-doorbell', 0xffe066],
  ['bulb-green', 'Green Bulb', 'qf-bikebell', 0x8ce99a],
  ['bulb-blue', 'Blue Bulb', 'qf-timer', 0x74c0fc],
  ['bulb-purple', 'Purple Bulb', 'qf-pepper', 0xb197fc],
  ['bulb-pink', 'Pink Bulb', 'qf-jack', 0xfcc2d7],
  ['bulb-white', 'Moonbeam Bulb', 'qf-piano', 0xffffff],
  ['topper-star', 'Star Topper', 'qf-cat', 0xffd43b],
  ['topper-propeller', 'Tiny Propeller', 'qf-car', 0xe03131],
  ['topper-flag', 'Little Flag', 'qf-boat', 0x1c7ed6],
  ['topper-lighthouse', 'Mini Lighthouse', 'qf-whistle', 0xf03e3e],
  ['bulb-heart', 'Heart Bulb', 'qf-flashlight', 0xff8787],
  ['bulb-moon', 'Moon Bulb', 'qf-lamp', 0xfff3bf],
  ['bulb-flower', 'Flower Bulb', 'qf-vane', 0xf783ac],
  ['topper-gear', 'Gear Topper', 'qf-sprinkler', 0xd9a441],
  ['topper-note', 'Music Note', 'qf-metronome', 0x5f3dc4],
  ['topper-bell', 'Bell Topper', 'qf-coinbank', 0xfab005],
  ['topper-cloud', 'Cloud Topper', 'qf-gumball', 0xe9ecef],
  ['topper-rainbow', 'Rainbow Topper', 'qf-robot', 0xff6b6b],
  ['topper-lightning', 'Lightning Bolt', 'qf-top', 0xffd43b],
  ['topper-sun', 'Sun Topper', 'qf-nightlight', 0xffa94d],
  ['topper-snowflake', 'Snowflake Topper', 'qf-kaleidoscope', 0xd0ebff],
  ['topper-rocket', 'Rocket Topper', 'qf-bird', 0xadb5bd],
];

export const COSMETICS: Cosmetic[] = [
  // winding keys
  c('key-classic', 'key', 'Classic Brass Key', start, 0xe7bb55),
  c('key-heart', 'key', 'Heart Key', shiny(60), 0xef8fb5),
  c('key-star', 'key', 'Star Key', shiny(80), 0xffd43b),
  c('key-bolt', 'key', 'Lightning Key', shiny(100), 0x74c0fc),
  c('key-whisk', 'key', "Albert's Whisk Key", repair(1), 0xe7bb55),
  c('key-clef', 'key', "Rosa's Treble Clef Key", treasure('photo'), 0xd9d9e8),
  c('key-wheel', 'key', "The Twins' Train-Wheel Key", treasure('ticket'), 0xe05a47),
  c('key-anchor', 'key', "The Captain's Anchor Key", treasure('medal'), 0x9aa6b4),
  c('key-bell', 'key', 'Tower Bell Key', repair(8), 0xb07d0c),
  c('key-master', 'key', 'The Master Key', { kind: 'box' }, 0xffd700),
  // chest plates
  c('plate-plain', 'plate', 'Plain Plate', start),
  c('plate-monogram', 'plate', 'Monogram Plate', start),
  c('plate-gear', 'plate', 'Gear Plate', shiny(40)),
  c('plate-heart', 'plate', 'Heart Plate', shiny(50)),
  c('plate-firstmate', 'plate', '"First Mate" Plate', repair(4)),
  c('plate-wave', 'plate', 'Wave Plate', treasure('postcard')),
  c('plate-teacup', 'plate', 'Teacup Plate', treasure('hatpin')),
  c('plate-bertie', 'plate', "Bertie's Face Plate", treasure('plans')),
  c('plate-rocket', 'plate', 'Rocket Plate', treasure('rocket')),
  c('plate-stars', 'plate', 'Starfield Plate', shiny(90)),
  c('plate-clockface', 'plate', 'Clock-face Plate', treasure('locket')),
  // finishes
  c('finish-brass', 'finish', 'Polished Brass', start, 0xd9a441, 0x8a5f17),
  c('finish-copper', 'finish', 'Rose Copper', shiny(30), 0xc8703f, 0x6e3418),
  c('finish-silver', 'finish', 'Silver', shiny(50), 0xc9d1d9, 0x6c757d),
  c('finish-gunmetal', 'finish', 'Gunmetal', shiny(60), 0x6c7a89, 0x2f3a45),
  c('finish-verdigris', 'finish', 'Verdigris Patina', shiny(70), 0x5fae9b, 0x2f6b5c),
  c('finish-pearl', 'finish', 'Pearl', shiny(120), 0xf4efe6, 0xb9ab95),
  c('finish-candy', 'finish', 'Candy Stripes', shiny(150), 0xff8fab, 0xffffff),
  ...ENAMELS.map(([k, name, col]) => c(`finish-${k}`, 'finish', name, shiny(40), col, darken(col))),
  // eyes
  c('eyes-round', 'eyes', 'Round Lenses', start, 0xeaf6ff),
  c('eyes-heart', 'eyes', 'Heart Lenses', treasure('apron-button'), 0xffd6e0),
  c('eyes-star', 'eyes', 'Star Lenses', repair(7), 0xfff3bf),
  c('eyes-monocle', 'eyes', 'Monocle (a nod to Magnus)', treasure('pocketwatch'), 0xeaf6ff),
  c('eyes-telescope', 'eyes', 'Telescope Eyes', gold(25), 0xeaf6ff),
  c('eyes-green', 'eyes', 'Green Glass', gold(50), 0xb2f2bb),
  c('eyes-amber', 'eyes', 'Amber Glass', gold(100), 0xffd8a8),
  // antenna bulbs & toppers (Quick Fixes)
  c('bulb-classic', 'bulb', 'Classic Bulb', start, 0xffe98a),
  ...QUICK_BULBS.map(([id, name, q, col]) => c(id, 'bulb', name, quick(q), col)),
  // headwear
  c('hat-none', 'hat', 'No Hat', start),
  c('hat-party', 'hat', 'Party Hat', repair(3), 0xff6b6b, 0xffd43b),
  c('hat-feather', 'hat', 'Ridiculous Feathered Hat', repair(5), 0x6a3d9a, 0x2ecc71),
  c('hat-tophat', 'hat', 'Top Hat', repair(6), 0x222222, 0xd64541),
  c('hat-toque', 'hat', "Flour-dusted Baker's Toque", treasure('recipe'), 0xffffff),
  c('hat-bow', 'hat', "Abuela's Ribbon Bow", treasure('ribbon'), 0xe64980),
  c('hat-conductor', 'hat', "Conductor's Cap", treasure('tooth'), 0x1c3d6e, 0xffd43b),
  c('hat-flowers', 'hat', 'Starflower Crown', treasure('flower'), 0xb197fc),
  c('hat-captain', 'hat', "Captain's Hat", gold(45), 0xffffff, 0x1c3d6e),
  c('hat-grad', 'hat', 'Graduation Cap', gold(120), 0x222222, 0xffd43b),
  // feet (Tune-Up medals)
  c('feet-springs', 'feet', 'Spring Feet', start),
  c('feet-wheels', 'feet', 'Roller Wheels', medals(3)),
  c('feet-clogs', 'feet', 'Tiny Wooden Clogs', medals(8)),
  c('feet-rocket', 'feet', 'Rocket Boots', medals(15)),
  // voice chips (Attic)
  c('voice-classic', 'voice', 'Classic Beeps', start),
  c('voice-chirpy', 'voice', 'Chirpy Chip', attic(3)),
  c('voice-musical', 'voice', 'Musical Chip', attic(6)),
  c('voice-bubbly', 'voice', 'Bubbly Chip', attic(10)),
  c('voice-retro', 'voice', 'Robotic-Retro Chip', attic(15)),
  c('voice-musicbox', 'voice', 'Music-box Chip', attic(20)),
  // trails
  c('trail-none', 'trail', 'No Trail', start),
  c('trail-notes', 'trail', "Rosa's Music-Note Trail", repair(2), 0x5f3dc4),
  c('trail-sparks', 'trail', 'Spark Trail', medals(5), 0xffd43b),
  c('trail-steam', 'trail', 'Steam Puff Trail', medals(10), 0xffffff),
  c('trail-stars', 'trail', 'Star Trail', medals(20), 0xfff3bf),
  c('trail-gears', 'trail', 'Spinning Gear Trail', { kind: 'box' }, 0xffd700),
  // tool skins (Golden Gear milestones)
  c('tool-classic', 'tool', 'Classic Tools', start),
  c('tool-rainbow', 'tool', 'Rainbow Wire Spool', gold(30), 0xff6b6b),
  c('tool-golden', 'tool', 'Golden Wrench', gold(60), 0xffd700),
  c('tool-teapot', 'tool', 'Teapot Oil Can', treasure('spoon'), 0x3fa37a),
  c('tool-screwdriver', 'tool', "Odette's Screwdriver", treasure('screwdriver'), 0xb07d0c),
  c('tool-copper', 'tool', 'Copper Oil Can', gold(90), 0xc8703f),
];

function darken(col: number): number {
  const r = ((col >> 16) & 255) * 0.55;
  const g = ((col >> 8) & 255) * 0.55;
  const b = (col & 255) * 0.55;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

export const cosmeticById = (id: string): Cosmetic | undefined => COSMETICS.find((x) => x.id === id);

export interface KipLook {
  key: string;
  plate: string;
  finish: string;
  eyes: string;
  bulb: string;
  hat: string;
  feet: string;
  voice: string;
  trail: string;
  tool: string;
  initials: string;
}

export const DEFAULT_LOOK: KipLook = {
  key: 'key-classic',
  plate: 'plate-plain',
  finish: 'finish-brass',
  eyes: 'eyes-round',
  bulb: 'bulb-classic',
  hat: 'hat-none',
  feet: 'feet-springs',
  voice: 'voice-classic',
  trail: 'trail-none',
  tool: 'tool-classic',
  initials: '',
};

export const TESS_LOOK: KipLook = { ...DEFAULT_LOOK, finish: 'finish-copper', key: 'key-heart' };

/** Nook furniture, made from spare parts (GDD §18.2). */
export interface Furniture {
  id: string;
  name: string;
  cost: number;
}

export const FURNITURE: Furniture[] = [
  { id: 'thimble-chair', name: 'Thimble Chair', cost: 20 },
  { id: 'spool-table', name: 'Spool Table', cost: 25 },
  { id: 'cap-rug', name: 'Bottle-cap Rug', cost: 15 },
  { id: 'mini-musicbox', name: 'Mini Music Box', cost: 40 },
  { id: 'matchbox-bed', name: 'Matchbox Bed', cost: 0 },
  { id: 'button-lamp', name: 'Button Lamp', cost: 30 },
  { id: 'gear-clock', name: 'Gear Wall Clock', cost: 35 },
  { id: 'sock-blanket', name: 'Sock Blanket', cost: 15 },
  { id: 'cork-stool', name: 'Cork Stool', cost: 10 },
  { id: 'teaspoon-shelf', name: 'Teaspoon Shelf', cost: 25 },
  { id: 'stamp-frame', name: 'Stamp Picture', cost: 20 },
  { id: 'plant-pot', name: 'Thimble Plant', cost: 15 },
];
