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
  ['red', 'Cherry Enamel', 0xa96859],
  ['orange', 'Marmalade Enamel', 0xc38b57],
  ['yellow', 'Buttercup Enamel', 0xcbb56f],
  ['lime', 'Lime Enamel', 0xa0a477],
  ['green', 'Clover Enamel', 0x78815a],
  ['teal', 'Teal Enamel', 0x537a72],
  ['sky', 'Sky Enamel', 0x9aafb2],
  ['blue', 'Harbour Enamel', 0x657c80],
  ['violet', 'Violet Enamel', 0x8a7b96],
  ['pink', 'Rosebud Enamel', 0xc09891],
  ['cream', 'Cream Enamel', 0xe9dcc0],
  ['black', 'Inkwell Enamel', 0x403d38],
];

const QUICK_BULBS: Array<[string, string, string, number]> = [
  ['bulb-red', 'Red Bulb', 'qf-hinge', 0xc17e70],
  ['bulb-orange', 'Orange Bulb', 'qf-mouse', 0xd3a278],
  ['bulb-yellow', 'Sunny Bulb', 'qf-doorbell', 0xe4cc88],
  ['bulb-green', 'Green Bulb', 'qf-bikebell', 0xa0b895],
  ['bulb-blue', 'Blue Bulb', 'qf-timer', 0x9aafb2],
  ['bulb-purple', 'Purple Bulb', 'qf-pepper', 0xa99cb5],
  ['bulb-pink', 'Pink Bulb', 'qf-jack', 0xd8b8b0],
  ['bulb-white', 'Moonbeam Bulb', 'qf-piano', 0xf4ebd5],
  ['topper-star', 'Star Topper', 'qf-cat', 0xd1b972],
  ['topper-propeller', 'Tiny Propeller', 'qf-car', 0xa96859],
  ['topper-flag', 'Little Flag', 'qf-boat', 0x657c80],
  ['topper-lighthouse', 'Mini Lighthouse', 'qf-whistle', 0xa96859],
  ['bulb-heart', 'Heart Bulb', 'qf-flashlight', 0xc09891],
  ['bulb-moon', 'Moon Bulb', 'qf-lamp', 0xf4ebd5],
  ['bulb-flower', 'Flower Bulb', 'qf-vane', 0xc09891],
  ['topper-gear', 'Gear Topper', 'qf-sprinkler', 0xbca16a],
  ['topper-note', 'Music Note', 'qf-metronome', 0x8a7b96],
  ['topper-bell', 'Bell Topper', 'qf-coinbank', 0xd3a278],
  ['topper-cloud', 'Cloud Topper', 'qf-gumball', 0xe4e3d8],
  ['topper-rainbow', 'Rainbow Topper', 'qf-robot', 0xc17e70],
  ['topper-lightning', 'Lightning Bolt', 'qf-top', 0xd1b972],
  ['topper-sun', 'Sun Topper', 'qf-nightlight', 0xd3a278],
  ['topper-snowflake', 'Snowflake Topper', 'qf-kaleidoscope', 0xcbd8d0],
  ['topper-rocket', 'Rocket Topper', 'qf-bird', 0xbfc3bd],
];

export const COSMETICS: Cosmetic[] = [
  // winding keys
  c('key-classic', 'key', 'Old Brass Key', start, 0xbca16a),
  c('key-heart', 'key', 'Heart Key', shiny(60), 0xc09891),
  c('key-star', 'key', 'Star Key', shiny(80), 0xd1b972),
  c('key-bolt', 'key', 'Lightning Key', shiny(100), 0x9aafb2),
  c('key-whisk', 'key', "Albert's Whisk Key", repair(1), 0xbca16a),
  c('key-clef', 'key', "Rosa's Treble Clef Key", treasure('photo'), 0xbfc3bd),
  c('key-wheel', 'key', "The Twins' Train-Wheel Key", treasure('ticket'), 0xa96859),
  c('key-anchor', 'key', "The Captain's Anchor Key", treasure('medal'), 0x91a09b),
  c('key-bell', 'key', 'Tower Bell Key', repair(8), 0xa18759),
  c('key-master', 'key', 'The Master Key', { kind: 'box' }, 0xd4bd79),
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
  // Keep the original finish ID so existing profiles inherit the new art direction.
  c('finish-brass', 'finish', 'Copper & Moss', start, 0xb77b56, 0x79503d),
  c('finish-copper', 'finish', 'Rose Copper', shiny(30), 0xc28c72, 0x795344),
  c('finish-silver', 'finish', 'Old Silver', shiny(50), 0xbfc3bd, 0x737b76),
  c('finish-gunmetal', 'finish', 'Gunmetal', shiny(60), 0x6e7872, 0x38453f),
  c('finish-verdigris', 'finish', 'Verdigris Patina', shiny(70), 0x83a49a, 0x344f4b),
  c('finish-pearl', 'finish', 'Pearl', shiny(120), 0xf4efe6, 0xb9ab95),
  c('finish-candy', 'finish', 'Candy Stripes', shiny(150), 0xc09891, 0xf4ebd5),
  ...ENAMELS.map(([k, name, col]) => c(`finish-${k}`, 'finish', name, shiny(40), col, darken(col))),
  // eyes
  c('eyes-round', 'eyes', 'Round Lenses', start, 0xf4ebd5),
  c('eyes-heart', 'eyes', 'Heart Lenses', treasure('apron-button'), 0xe4c7bd),
  c('eyes-star', 'eyes', 'Star Lenses', repair(7), 0xf4ebd5),
  c('eyes-monocle', 'eyes', 'Monocle (a nod to Magnus)', treasure('pocketwatch'), 0xdce6d9),
  c('eyes-telescope', 'eyes', 'Telescope Eyes', gold(25), 0xdce6d9),
  c('eyes-green', 'eyes', 'Green Glass', gold(50), 0xc5d8b4),
  c('eyes-amber', 'eyes', 'Amber Glass', gold(100), 0xe6c69e),
  // antenna bulbs & toppers (Quick Fixes)
  c('bulb-classic', 'bulb', 'Amber Filament Bulb', start, 0xf1d391),
  ...QUICK_BULBS.map(([id, name, q, col]) => c(id, 'bulb', name, quick(q), col)),
  // headwear
  c('hat-none', 'hat', 'No Hat', start),
  c('hat-party', 'hat', 'Party Hat', repair(3), 0xc17e70, 0xd1b972),
  c('hat-feather', 'hat', 'Ridiculous Feathered Hat', repair(5), 0x82718c, 0x78815a),
  c('hat-tophat', 'hat', 'Top Hat', repair(6), 0x342f29, 0xa96859),
  c('hat-toque', 'hat', "Flour-dusted Baker's Toque", treasure('recipe'), 0xf4ebd5),
  c('hat-bow', 'hat', "Abuela's Ribbon Bow", treasure('ribbon'), 0xaf7985),
  c('hat-conductor', 'hat', "Conductor's Cap", treasure('tooth'), 0x526975, 0xd1b972),
  c('hat-flowers', 'hat', 'Starflower Crown', treasure('flower'), 0xa99cb5),
  c('hat-captain', 'hat', "Captain's Hat", gold(45), 0xf4ebd5, 0x526975),
  c('hat-grad', 'hat', 'Graduation Cap', gold(120), 0x342f29, 0xd1b972),
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
  c('trail-notes', 'trail', "Rosa's Music-Note Trail", repair(2), 0x8a7b96),
  c('trail-sparks', 'trail', 'Spark Trail', medals(5), 0xd1b972),
  c('trail-steam', 'trail', 'Steam Puff Trail', medals(10), 0xf4ebd5),
  c('trail-stars', 'trail', 'Star Trail', medals(20), 0xf4ebd5),
  c('trail-gears', 'trail', 'Spinning Gear Trail', { kind: 'box' }, 0xd4bd79),
  // tool skins (Golden Gear milestones)
  c('tool-classic', 'tool', 'Classic Tools', start),
  c('tool-rainbow', 'tool', 'Rainbow Wire Spool', gold(30), 0xc17e70),
  c('tool-golden', 'tool', 'Golden Wrench', gold(60), 0xd4bd79),
  c('tool-teapot', 'tool', 'Teapot Oil Can', treasure('spoon'), 0x537a72),
  c('tool-screwdriver', 'tool', "Odette's Screwdriver", treasure('screwdriver'), 0xa18759),
  c('tool-copper', 'tool', 'Copper Oil Can', gold(90), 0xb77b56),
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
