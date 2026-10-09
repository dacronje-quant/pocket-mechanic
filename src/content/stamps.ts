/**
 * Stamps in Kip's Job Book (GDD §19.2): celebrating curiosity and care, not grind.
 * Conditions are plain data; src/core/progress.ts checks them.
 */
import type { Family, ToolId } from './types';

export type StampCond =
  | { kind: 'stat'; stat: 'rooms' | 'fiddles' | 'peeks' | 'quick' | 'pedia' | 'songs' | 'cards' | 'attic' | 'gold'; at: number }
  | { kind: 'repair'; id: number }
  | { kind: 'treasures'; at: number }
  | { kind: 'marks'; at: number }
  | { kind: 'medal'; medal: 1 | 2 | 3 | 4; at: number }
  | { kind: 'family'; family: Family; at: number }
  | { kind: 'tool'; tool: ToolId | 'all' }
  | { kind: 'flag'; flag: string };

export interface StampDef {
  id: string;
  name: string;
  glyph: string;
  cond: StampCond;
}

const s = (id: string, name: string, glyph: string, cond: StampCond): StampDef => ({ id, name, glyph, cond });

const FAMILY_STAMPS: Array<[Family, string, string]> = [
  ['gears', 'Gear Guru', '⚙'],
  ['levers', 'Lever Lifter', '⚖'],
  ['springs', 'Spring Sprinter', '〰'],
  ['pendulums', 'Tick-Tock Timer', '⏲'],
  ['music', 'Music Maker', '♪'],
  ['tracks', 'Track Boss', '🚂'],
  ['circuits', 'Spark Sparker', '⚡'],
  ['pipes', 'Pipe Pro', '💧'],
  ['logic', 'Logic Legend', '◆'],
  ['light', 'Light Bender', '✦'],
];

export const STAMPS: StampDef[] = [
  s('first-fix', 'First fix!', '★', { kind: 'stat', stat: 'rooms', at: 1 }),
  s('ten-fixes', 'Ten rooms fixed', '❿', { kind: 'stat', stat: 'rooms', at: 10 }),
  s('thirty-fixes', 'Thirty rooms fixed', '✪', { kind: 'stat', stat: 'rooms', at: 30 }),
  s('all-rooms', 'Every room in Brasswick', '♛', { kind: 'stat', stat: 'rooms', at: 57 }),
  s('repair-1', 'Woke up Brasswick', '⏰', { kind: 'repair', id: 1 }),
  s('repair-2', "Played Abuela's lullaby", '🎶', { kind: 'repair', id: 2 }),
  s('repair-3', 'Happy Birthday, twins!', '🎂', { kind: 'repair', id: 3 }),
  s('repair-4', 'Saved the fishing boats', '⚓', { kind: 'repair', id: 4 }),
  s('repair-5', 'Teatime!', '☕', { kind: 'repair', id: 5 }),
  s('repair-6', 'Bertie dances again', '🤖', { kind: 'repair', id: 6 }),
  s('repair-7', 'Stars on the ceiling', '🔭', { kind: 'repair', id: 7 }),
  s('repair-8', 'BONG! Noon in Brasswick', '🔔', { kind: 'repair', id: 8 }),
  s('fiddle-10', 'Fiddled with 10 Fiddle Toys', '✋', { kind: 'stat', stat: 'fiddles', at: 10 }),
  s('fiddle-100', 'Fiddled with 100 Fiddle Toys!', '👐', { kind: 'stat', stat: 'fiddles', at: 100 }),
  s('funny-wrong', 'Made a funny-wrong fix!', '😜', { kind: 'flag', flag: 'funnyWrong' }),
  s('jam', 'Made a gear jam (oops!)', '😬', { kind: 'flag', flag: 'jam' }),
  s('treasure-1', 'Returned a Lost Treasure!', '💝', { kind: 'treasures', at: 1 }),
  s('treasure-all', 'Every Lost Treasure home', '💎', { kind: 'treasures', at: 16 }),
  s('mark-1', 'Found a Magnus Mark', '🪶', { kind: 'marks', at: 1 }),
  s('mark-all', 'Solved the Magnus mystery', '🔍', { kind: 'marks', at: 7 }),
  s('gold-10', '10 Golden Gears', '⚙', { kind: 'stat', stat: 'gold', at: 10 }),
  s('gold-50', '50 Golden Gears', '⚙', { kind: 'stat', stat: 'gold', at: 50 }),
  s('gold-100', '100 Golden Gears', '⚙', { kind: 'stat', stat: 'gold', at: 100 }),
  s('gold-all', 'Every Golden Gear in the story', '🏆', { kind: 'stat', stat: 'gold', at: 171 }),
  s('quick-1', 'First Quick Fix', '⚡', { kind: 'stat', stat: 'quick', at: 1 }),
  s('quick-12', 'Twelve Quick Fixes', '⚡', { kind: 'stat', stat: 'quick', at: 12 }),
  s('quick-24', 'Every Quick Fix', '⚡', { kind: 'stat', stat: 'quick', at: 24 }),
  s('compose', 'Composed a song!', '🎼', { kind: 'flag', flag: 'compose' }),
  s('pudding', 'Petted Pudding the cat!', '🐱', { kind: 'flag', flag: 'pudding' }),
  s('whisker', 'Gave Whisker a crumb', '🐭', { kind: 'flag', flag: 'whisker' }),
  s('coop', 'Fixed something with Tess!', '🤝', { kind: 'flag', flag: 'coop' }),
  s('hands', 'Helped by the Outside Hands', '🖐', { kind: 'flag', flag: 'hands' }),
  s('dark', 'Fixed a room in the dark', '🔦', { kind: 'flag', flag: 'dark' }),
  s('peek-10', 'Peeked 10 times', '👁', { kind: 'stat', stat: 'peeks', at: 10 }),
  s('no-hints', 'Fixed a room with no hints', '💡', { kind: 'flag', flag: 'noHints' }),
  s('medal-copper', 'First Copper medal', '🥉', { kind: 'medal', medal: 1, at: 1 }),
  s('medal-silver', 'First Silver medal', '🥈', { kind: 'medal', medal: 2, at: 1 }),
  s('medal-gold', 'First Gold medal', '🥇', { kind: 'medal', medal: 3, at: 1 }),
  s('medal-brass', 'Brass Masterpiece!', '🏅', { kind: 'medal', medal: 4, at: 1 }),
  s('oilcan', 'Got the Oil Can', '🛢', { kind: 'tool', tool: 'oilcan' }),
  s('tools-all', 'A full tool belt', '🧰', { kind: 'tool', tool: 'all' }),
  ...FAMILY_STAMPS.map(([f, name, glyph]) => s(`family-${f}`, name, glyph, { kind: 'family', family: f, at: 3 })),
  s('pedia-20', '20 Part-o-pedia pages', '📖', { kind: 'stat', stat: 'pedia', at: 20 }),
  s('pedia-all', 'The whole Part-o-pedia', '📚', { kind: 'stat', stat: 'pedia', at: 80 }),
  s('songs-5', 'Five songs collected', '🎵', { kind: 'stat', stat: 'songs', at: 5 }),
  s('paint', 'New look!', '🎨', { kind: 'flag', flag: 'paint' }),
  s('polish', 'Polished until it shone', '✨', { kind: 'flag', flag: 'polish' }),
  s('nook', 'Made the Nook cosy', '🛋', { kind: 'flag', flag: 'nook' }),
  s('town', 'Looked out of the Window Seat', '🏘', { kind: 'flag', flag: 'town' }),
  s('bench', 'Built a contraption', '🛠', { kind: 'flag', flag: 'bench' }),
  s('cards-10', 'Ten Contraption Cards', '🃏', { kind: 'stat', stat: 'cards', at: 10 }),
  s('code', 'Shared a Contraption Code', '🔢', { kind: 'flag', flag: 'code' }),
  s('nest', 'Built Magnus a nest', '🪺', { kind: 'flag', flag: 'nest' }),
  s('attic-1', 'Fixed an Attic treasure', '🗝', { kind: 'stat', stat: 'attic', at: 1 }),
  s('attic-all', 'The whole Attic', '🏚', { kind: 'stat', stat: 'attic', at: 23 }),
  s('box', 'Opened the Mystery Box', '📦', { kind: 'flag', flag: 'box' }),
  s('festival', 'Danced at the Tick-Tock Festival', '🎪', { kind: 'flag', flag: 'festival' }),
];
