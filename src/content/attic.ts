/** The Mystery Attic (GDD §16): 23 antique objects × 3 generated rooms, plus the Mystery Box. */
import { hashString } from '../mechanism/rng';
import { generateRoom } from './generate';
import type { AtticObjectDef, RoomDef } from './types';

export const ATTIC_OBJECTS: AtticObjectDef[] = [
  { id: 'typewriter', title: 'Typewriter', kinds: ['logic', 'gear', 'circuit'], clue: '★', history: 'Typewriters let people print letters at home. Each key swings a little arm that stamps one letter through an inked ribbon.' },
  { id: 'gramophone', title: 'Gramophone', kinds: ['gear', 'tracks', 'light'], clue: '♪', history: 'Before radios and speakers, a gramophone played music from wavy grooves on a spinning disc, using a needle and a big horn.' },
  { id: 'pianola', title: 'Player Piano', kinds: ['logic', 'pipes', 'gear'], clue: '♫', history: 'A player piano plays itself! A paper roll full of holes lets air through to press the keys — a little like punch cards.' },
  { id: 'calculator', title: 'Mechanical Calculator', kinds: ['gear', 'logic', 'gear'], clue: '✚', history: 'Long before computers, clever gear wheels added and multiplied numbers. Turn the handle and the answer clicks into place.' },
  { id: 'pinball', title: 'Pinball Machine', kinds: ['circuit', 'logic', 'tracks'], clue: '●', history: 'Pinball machines use springs to launch the ball and electric bumpers to bounce it back — ding ding ding!' },
  { id: 'register', title: 'Cash Register', kinds: ['gear', 'circuit', 'logic'], clue: '◆', history: 'Old shop tills rang a bell every time the drawer opened, and showed the price on little flip-up number flags.' },
  { id: 'sewing', title: 'Sewing Machine', kinds: ['gear', 'gear', 'tracks'], clue: '✂', history: 'A sewing machine turns a wheel into a needle going up and down very fast, using a crank and a cam.' },
  { id: 'camera', title: 'Box Camera', kinds: ['light', 'light', 'gear'], clue: '◉', history: 'A camera is a dark box with a lens. Light from outside paints a picture inside, onto film.' },
  { id: 'birdcage', title: 'Mechanical Bird Cage', kinds: ['pipes', 'gear', 'logic'], clue: '❦', history: 'Singing bird automata used a tiny bellows and a sliding whistle to sound just like a real bird.' },
  { id: 'telegraph', title: 'Telegraph', kinds: ['circuit', 'circuit', 'logic'], clue: '⚡', history: 'The telegraph sent messages along wires as dots and dashes — long and short clicks of electricity.' },
  { id: 'zoetrope', title: 'Zoetrope', kinds: ['light', 'gear', 'light'], clue: '☼', history: 'A zoetrope is a spinning drum with slits. Peek through as it turns, and the pictures inside seem to move — early animation!' },
  { id: 'marbleclock', title: 'Marble Clock', kinds: ['tracks', 'gear', 'logic'], clue: '◍', history: 'Some clocks tell time with rolling marbles: each marble takes exactly one minute to zig-zag down its track.' },
  { id: 'waterclock', title: 'Water Clock', kinds: ['pipes', 'pipes', 'gear'], clue: '☂', history: 'Thousands of years ago, people measured time with dripping water. As the bowl filled, a float rose and moved a pointer.' },
  { id: 'writer', title: 'Automaton Writer', kinds: ['logic', 'gear', 'light'], clue: '✎', history: 'Over 250 years ago, a clockmaker built a doll that could write with a real quill, using a stack of cam wheels as its memory.' },
  { id: 'barometer', title: 'Barometer', kinds: ['pipes', 'gear', 'circuit'], clue: '☁', history: 'A barometer feels the weight of the air. When the needle drops, rain is probably coming.' },
  { id: 'projector', title: 'Magic Lantern', kinds: ['light', 'light', 'circuit'], clue: '▲', history: 'A magic lantern shone a lamp through painted glass slides and a lens, making big pictures on the wall.' },
  { id: 'carousel', title: 'Carousel', kinds: ['gear', 'tracks', 'gear'], clue: '✿', history: 'A carousel uses big gears and cranks to turn the platform and lift the horses up and down at the same time.' },
  { id: 'divingpump', title: 'Diving Helmet Pump', kinds: ['pipes', 'gear', 'pipes'], clue: '⚓', history: 'Old divers breathed air pumped down a hose by helpers turning big wheels on the boat above.' },
  { id: 'telescope', title: 'Telescope', kinds: ['light', 'gear', 'light'], clue: '☾', history: 'A telescope uses lenses or mirrors to gather lots of starlight, so faraway things look close and bright.' },
  { id: 'orchestrion', title: 'Orchestrion', kinds: ['pipes', 'logic', 'gear'], clue: '♬', history: 'An orchestrion is a whole band in a cabinet: drums, pipes and bells, all played by a pinned roll.' },
  { id: 'theatre', title: 'Moving Theatre', kinds: ['gear', 'light', 'tracks'], clue: '♞', history: 'Mechanical theatres moved little puppets along tracks and flipped scenery with hidden cranks.' },
  { id: 'calliope', title: 'Calliope', kinds: ['pipes', 'pipes', 'logic'], clue: '❖', history: 'A calliope plays tunes on steam whistles. It is so loud you can hear it from miles away — great for riverboats and fairs.' },
  { id: 'lighthouselens', title: 'Lighthouse Lens', kinds: ['light', 'circuit', 'light'], clue: '✦', history: 'Lighthouse lenses are made of many glass rings that bend all the lamp light into one strong beam for ships far out at sea.' },
];

export const MYSTERY_BOX = {
  id: 'mysterybox',
  title: 'The Mystery Box',
  history: 'Puzzle boxes have hidden ways in: sliding panels, secret catches and special orders of moves. Nana built this one when she was young.',
};

/** The four clue symbols whose order opens the Mystery Box's final dials. */
export const BOX_COMBINATION = ['☾', '♪', '✦', '★'];

export const atticRoomId = (obj: string, n: number): string => `attic-${obj}-${n}`;

const cache = new Map<string, RoomDef>();

/** Attic rooms are generated on demand (and always the same for the same id). */
export function atticRoom(id: string): RoomDef | undefined {
  const hit = cache.get(id);
  if (hit) return hit;
  const m = /^attic-(\w+)-(\d)$/.exec(id);
  if (!m) return undefined;
  const obj = ATTIC_OBJECTS.find((o) => o.id === m[1]);
  const n = Number(m[2]);
  if (!obj || n < 1 || n > 3) return undefined;
  const room = generateRoom(obj.kinds[n - 1], hashString(id), { id, title: `${obj.title} · ${n} of 3` });
  cache.set(id, room);
  return room;
}

export function atticRooms(): RoomDef[] {
  return ATTIC_OBJECTS.flatMap((o) => [1, 2, 3].map((n) => atticRoom(atticRoomId(o.id, n))!));
}
