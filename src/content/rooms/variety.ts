/** Authored puzzle variety, retaining all story ids, collectibles and old repairs. */
import { pieceCells, projectLayers, rotateCells } from '../../mechanism/variety';
import type { Family, PlayStyleId, QuickFixDef, RoomBase, RoomDef, Styled, ThemeId } from '../types';
import type { BoardPiece, Cell, DifferenceRoomDef, JugsRoomDef, LayersRoomDef, PackingRoomDef, PieceBoardDef, Placement, ShadowRoomDef, SlideRoomDef, SortingRoomDef, SudokuRoomDef, SymmetryRoomDef, TiltRoomDef, VarietyRoomDef } from '../variety-types';
import { R3_ROOMS } from './r3';
import { R4_ROOMS } from './r4';
import { R5_ROOMS } from './r5';
import { R7_ROOMS } from './r7';

export const ADDED_ROOM_IDS = ['1-7', '2-7', '6-7', '8-0'];
export const REPLACED_ROOM_IDS = ['3-2', '3-4', '4-3', '4-4', '5-1', '7-6'];
const originals = [...R3_ROOMS, ...R4_ROOMS, ...R5_ROOMS, ...R7_ROOMS];

function common(id: string, title: string, theme: ThemeId, families: Family[], intro: string, hints: [string, string, string]): Omit<RoomBase, 'kind'> {
  const old = originals.find(r => r.id === id);
  return { id, title, theme, families, intro, hints, simplify: false,
    pedia: old?.pedia ?? ['gear'], hidden: old?.hidden ?? { x: 1060, y: 180 },
    treasure: old?.treasure, mark: old?.mark, blueprint: old?.blueprint, dark: old?.dark,
    gives: old?.gives, resident: old?.resident, helper: old?.helper,
    clever: { kind: 'par' }, par: { moves: 20, seconds: 150 } };
}
function styled<T extends VarietyRoomDef>(base: T, easy: Partial<T>, hard: Partial<T>): Styled<T> {
  return { ...base, styles: { tinker: easy, engineer: hard } };
}

type BoardData = Pick<PieceBoardDef, 'cols' | 'rows' | 'board' | 'pieces' | 'solution' | 'allowRotate'>;
const PACKS: Record<PlayStyleId, BoardData> = {"tinker":{"cols":4,"rows":3,"board":[0,1,2,3,4,5,6,7,8,9,10,11],"pieces":[{"id":"0","cells":[{"x":0,"y":1},{"x":1,"y":0},{"x":1,"y":1},{"x":2,"y":0},{"x":2,"y":1},{"x":2,"y":2}],"art":"present"},{"id":"1","cells":[{"x":0,"y":0},{"x":1,"y":0}],"art":"present"},{"id":"2","cells":[{"x":0,"y":0},{"x":0,"y":1},{"x":0,"y":2},{"x":1,"y":0}],"art":"present"}],"solution":[{"id":"0","x":1,"y":0,"turn":0},{"id":"1","x":1,"y":2,"turn":0},{"id":"2","x":0,"y":0,"turn":0}],"allowRotate":false},"fixer":{"cols":5,"rows":4,"board":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19],"pieces":[{"id":"0","cells":[{"x":0,"y":0},{"x":0,"y":1},{"x":0,"y":2},{"x":0,"y":3},{"x":1,"y":3}],"art":"present"},{"id":"1","cells":[{"x":0,"y":2},{"x":1,"y":2},{"x":2,"y":0},{"x":2,"y":1},{"x":2,"y":2}],"art":"present"},{"id":"2","cells":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":0},{"x":1,"y":1}],"art":"present"},{"id":"3","cells":[{"x":0,"y":0},{"x":1,"y":0}],"art":"present"},{"id":"4","cells":[{"x":0,"y":0},{"x":0,"y":1},{"x":0,"y":2},{"x":1,"y":0}],"art":"present"}],"solution":[{"id":"0","x":0,"y":0,"turn":0},{"id":"1","x":2,"y":1,"turn":0},{"id":"2","x":1,"y":1,"turn":0},{"id":"3","x":1,"y":0,"turn":0},{"id":"4","x":3,"y":0,"turn":0}],"allowRotate":true},"engineer":{"cols":7,"rows":5,"board":[1,2,3,4,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,32,33,34],"pieces":[{"id":"0","cells":[{"x":0,"y":0},{"x":0,"y":1},{"x":0,"y":2}],"art":"present"},{"id":"1","cells":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":0},{"x":1,"y":1}],"art":"present"},{"id":"2","cells":[{"x":0,"y":2},{"x":1,"y":1},{"x":1,"y":2},{"x":2,"y":0},{"x":2,"y":1},{"x":3,"y":0}],"art":"present"},{"id":"3","cells":[{"x":0,"y":0},{"x":1,"y":0}],"art":"present"},{"id":"4","cells":[{"x":0,"y":2},{"x":0,"y":3},{"x":1,"y":0},{"x":1,"y":1},{"x":1,"y":2},{"x":2,"y":1},{"x":2,"y":2}],"art":"present"},{"id":"5","cells":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":0}],"art":"present"},{"id":"6","cells":[{"x":0,"y":1},{"x":0,"y":2},{"x":0,"y":3},{"x":1,"y":0},{"x":1,"y":1}],"art":"present"}],"solution":[{"id":"0","x":0,"y":1,"turn":0},{"id":"1","x":1,"y":3,"turn":0},{"id":"2","x":1,"y":0,"turn":0},{"id":"3","x":5,"y":4,"turn":0},{"id":"4","x":4,"y":1,"turn":0},{"id":"5","x":1,"y":0,"turn":0},{"id":"6","x":3,"y":1,"turn":0}],"allowRotate":true}};
const SLIDES: Record<string, Pick<SlideRoomDef, 'initial' | 'solutionMoves'>> = {"15":{"initial":[4,5,2,3,1,6,7,0,8],"solutionMoves":[8,5,2,1,4,3,0,1,2,5,4,1,2,5,8]},"25":{"initial":[3,5,2,6,4,0,7,1,8],"solutionMoves":[2,1,4,3,0,1,2,5,4,7,8,5,2,1,4,3,0,1,2,5,4,1,2,5,8]}};
const TILTS: Record<PlayStyleId, Pick<TiltRoomDef, 'cols' | 'rows' | 'walls' | 'holes' | 'initial' | 'goals' | 'solution' | 'par'>> = {"tinker":{"cols":5,"rows":4,"walls":[3,2,1,5],"holes":[],"initial":[4],"goals":[10],"solution":["down","left","up"],"par":{"moves":3,"seconds":60}},"fixer":{"cols":6,"rows":5,"walls":[9,27,3,0,8,4],"holes":[10,25],"initial":[26,22],"goals":[2,28],"solution":["down","up","left","up","right","up","right"],"par":{"moves":7,"seconds":120}},"engineer":{"cols":7,"rows":6,"walls":[14,25,24,11,40,29,41,35,15],"holes":[26,28,18],"initial":[33,19],"goals":[39,8],"solution":["right","up","left","up","left","down","up","right","down","left","down","right"],"par":{"moves":12,"seconds":120}}};
const FUSES: Record<string, number[]> = {"fixer":[-1,-1,-1,-1,2,3,-1,1,1,-1,3,-1,3,2,1,-1],"engineer":[-1,-1,-1,-1,2,-1,-1,1,-1,0,3,-1,-1,-1,-1,-1]};

/** Tray orientations require real turns; the authored placements retain exact geometry. */
function oriented(data: BoardData, arts: string[]): BoardData {
  return { ...data, pieces: data.pieces.map((p, i) => ({ ...p, art: arts[i % arts.length], cells: rotateCells(p.cells, -((i + 1) % 4)) })), solution: data.solution.map((p, i) => ({ ...p, turn: (i + 1) % 4 })) };
}
function toolWall(count: 3 | 5): BoardData & Pick<ShadowRoomDef, 'outlines'> {
  const shapes: Cell[][] = [
    [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  ];
  const arts = ['wrench', 'hammer', 'wrench', 'screw', 'saw'];
  const pieces: BoardPiece[] = shapes.slice(0, count).map((cells, i) => ({ id: `tool-${i}`, cells, art: arts[i] }));
  const solution: Placement[] = count === 3 ? [
    { id: 'tool-0', x: 0, y: 0, turn: 0 }, { id: 'tool-1', x: 4, y: 0, turn: 0 }, { id: 'tool-2', x: 7, y: 2, turn: 0 },
  ] : [
    { id: 'tool-0', x: 0, y: 0, turn: 1 }, { id: 'tool-1', x: 4, y: 0, turn: 2 }, { id: 'tool-2', x: 8, y: 0, turn: 3 },
    { id: 'tool-3', x: 0, y: 4, turn: 1 }, { id: 'tool-4', x: 5, y: 4, turn: 0 },
  ];
  const cols = count === 3 ? 9 : 11, rows = count === 3 ? 5 : 6;
  const board = solution.flatMap(p => rotateCells(pieces.find(q => q.id === p.id)!.cells, p.turn).map(c => (c.y + p.y) * cols + c.x + p.x));
  const data: BoardData = { cols, rows, board, pieces, solution, allowRotate: count === 5 };
  const outlines = solution.map(p => ({ id: p.id, cells: pieceCells({ ...data, kind: 'shadow' } as ShadowRoomDef, p)! }));
  return { ...data, outlines };
}

const shadow = styled<ShadowRoomDef>({
  ...common('1-7', "Finch's Tool Wall", 'clock', ['gears'], 'Coo knocked Mr. Finch\'s tools off their hooks. Match each tool to its shadow on the wall.', ['Look for a shadow with the same shape.', 'Turn the tool until its shape fits the dark patch.', 'Fill the whole shadow without crossing another tool.']),
  kind: 'shadow', resident: 'coo', ...toolWall(5),
}, { ...toolWall(3), intro: 'Coo knocked three tools off their hooks. Put each tool on the shadow with the same shape.', hints: ['Find a shadow shaped like your tool.', 'The tools are already facing the right way.', 'Drag each tool onto its matching shadow.'], par: { moves: 3, seconds: 90 } }, { ...oriented(PACKS.engineer, ['wrench', 'hammer', 'screw', 'saw']), outlines: [], intro: 'Finch has one odd shadow and seven tool pieces. Turn and combine them to cover the whole shadow.', hints: ['Several pieces share one shadow.', 'Look for corners and narrow parts that only one piece can fill.', 'Combine all seven pieces without gaps or overlaps.'], par: { moves: 19, seconds: 180 } });

const slide = styled<SlideRoomDef>({
  ...common('2-7', "Abuela's Locket", 'musicbox', ['logic'], 'Rosa\'s photograph of Abuela slipped into little squares. Slide a square into the empty space to put their picture back together.', ['Only a square beside the empty space can move.', 'Find the corners of the picture first.', 'Use the empty space to bring each square home.']),
  kind: 'slide', size: 3, ...SLIDES['15'], image: 'puzzle-locket', resident: 'clementine', par: { moves: 15, seconds: 150 },
}, { size: 2, initial: [3, 1, 0, 2], solutionMoves: [0, 1, 3], intro: 'Rosa and Abuela are in this little picture. Slide a square beside the empty space until their picture is whole.', hints: ['A square beside the empty space can slide.', 'Look for the top of the picture.', 'Slide the squares around the empty space to join the picture.'], par: { moves: 3, seconds: 90 } }, { ...SLIDES['25'], intro: 'Rebuild Rosa and Abuela\'s picture by sliding squares through the empty space. A perfect route takes twenty-five moves.', par: { moves: 25, seconds: 240 } });

function cake(size: number, mirrors: SymmetryRoomDef['mirrors'], count: number): Pick<SymmetryRoomDef, 'size' | 'mirrors' | 'seeds' | 'palette' | 'solution'> {
  const tokens = ['gold-star', 'pink-flower', 'green-leaf', 'red-berry'];
  const available = Array.from({ length: size * size }, (_, at) => at).filter(at => at % size < size / 2 && (mirrors === 'vertical' || Math.floor(at / size) < size / 2));
  const seeds = available.slice(0, count).map((at, i) => ({ at, token: tokens[i % tokens.length] }));
  const solution = seeds.flatMap(p => {
    const x = p.at % size, y = Math.floor(p.at / size);
    const cells = [p.at, y * size + size - 1 - x];
    if (mirrors === 'both') cells.push((size - 1 - y) * size + x, (size - 1 - y) * size + size - 1 - x);
    return cells.map(at => ({ at, token: p.token }));
  });
  return { size, mirrors, seeds, solution, palette: mirrors === 'both' ? [...tokens, 'yellow-star', 'purple-flower'] : tokens };
}
const symmetry = styled<SymmetryRoomDef>({
  ...common('3-2', "The Twins' Cake", 'train', ['music'], 'Theo and Ada want matching cake decorations. Put the same decoration the same distance on the other side of each mirror line.', ['The middle line is a mirror.', 'Match the colour and shape, then count spaces from the mirror.', 'Every decoration needs its matching reflection.']),
  kind: 'symmetry', ...cake(6, 'vertical', 8),
}, { ...cake(4, 'vertical', 4), intro: 'Make Theo and Ada\'s two cake halves match. Put the same decoration in the same place across the middle line.', hints: ['The middle line is a mirror.', 'Match the shape and colour on the other half.', 'Put each decoration the same distance from the middle.'], par: { moves: 4, seconds: 90 } }, { ...cake(8, 'both', 4), intro: 'The twins want four matching cake quarters. Reflect each decoration across both mirror lines and watch for nearly matching colours.', hints: ['Each decoration needs three matching reflections.', 'Match across the upright line and the sideways line.', 'Check the shape, colour and distance from both mirror lines.'], par: { moves: 12, seconds: 180 } });

const packing = styled<PackingRoomDef>({
  ...common('3-4', 'The Cargo Car', 'train', ['tracks'], 'The twins\' birthday presents must all ride in one wagon. Turn and fit the parcels so none overlap or hang over the edge.', ['The presents cannot sit on top of each other.', 'Try the awkward shapes against the wagon corners.', 'Fill the wagon floor completely.']),
  kind: 'packing', ...oriented(PACKS.fixer, ['present']),
}, { ...PACKS.tinker, intro: 'Fit the three birthday parcels into the twins\' wagon. The parcels are already facing the right way.', hints: ['Find space for the biggest parcel.', 'The parcels must sit beside each other.', 'Fill the wagon without gaps or overlaps.'], par: { moves: 3, seconds: 90 } }, { ...oriented(PACKS.engineer, ['present']), intro: 'Turn and fit all seven birthday parcels into the wagon. Its floor must be completely full; there is one way to pack it.', par: { moves: 19, seconds: 180 } });

const sorting = styled<SortingRoomDef>({
  ...common('4-3', 'The Tube Towers', 'radio', ['circuits'], 'Captain Marigold\'s radio valves belong in a neat row. Put the smallest valve first and the biggest last.', ['Compare two valves side by side.', 'The two middle valves are nearly the same size.', 'Make the row grow steadily from small to large.']),
  kind: 'sorting', mode: 'size', items: [1.3, .55, 1.6, .81, 1.05, .77].map((size, i) => ({ id: `valve-${i}`, size, weight: i + 1 })),
}, { items: [1.5, .7, 1.1].map((size, i) => ({ id: `valve-${i}`, size, weight: i + 1 })), intro: 'Captain Marigold has three valves. Put them in a row from the littlest to the biggest.', hints: ['Find the littlest valve.', 'Put the middle-sized valve beside it.', 'Littlest, middle, biggest: make the valves grow along the row.'], par: { moves: 3, seconds: 90 } }, {
  mode: 'weight', items: [4, 1, 6, 3, 5, 2].map((weight, i) => ({ id: `valve-${i}`, size: 1, weight })), maxWeighings: 11,
  intro: 'These identical radio valves have different weights. Use the balance to compare them, then arrange lightest to heaviest in eleven weighings.',
  hints: ['The low pan holds the heavier valve.', 'Keep the valves you have already compared in order.', 'Build two ordered groups, then compare their front valves to join the groups.'], par: { moves: 20, seconds: 240 },
});

const fuseSymbols = [{ color: 0xc66850, shape: 'circle' }, { color: 0x4b897e, shape: 'triangle' }, { color: 0xd6ad58, shape: 'square' }, { color: 0x9982b6, shape: 'star' }];
const fuseSolution = [0, 1, 2, 3, 2, 3, 0, 1, 1, 0, 3, 2, 3, 2, 1, 0];
const sudoku = styled<SudokuRoomDef>({
  ...common('4-4', 'The Fuse Box', 'radio', ['circuits', 'logic'], 'Each row, column and little box needs one fuse of every kind. Fit the missing fuses to bring the lamps back.', ['No row or column can repeat a fuse.', 'Look for a row with only one kind missing.', 'The four little boxes need all four kinds too.']),
  kind: 'sudoku', dark: false, size: 4, symbols: fuseSymbols, givens: FUSES.fixer, solution: fuseSolution, regions: true,
}, { size: 3, symbols: fuseSymbols.slice(0, 3), givens: [0, 1, -1, 1, -1, 0, -1, -1, 1], solution: [0, 1, 2, 1, 2, 0, 2, 0, 1], regions: false, intro: 'Put a fuse in each empty socket. Every row and every column needs one of each of the three kinds.', hints: ['A row needs three different fuses.', 'Look for the fuse that is missing.', 'Give every row and column one fuse of each kind.'], par: { moves: 4, seconds: 90 } }, { givens: FUSES.engineer, par: { moves: 12, seconds: 240 } });

const jugs = styled<JugsRoomDef>({
  ...common('5-1', 'The Water Tank', 'tea', ['pipes'], 'Measure exactly four cups in the five-cup jug for Mrs. Pepperwhistle’s kettle. You can fill, empty, or pour until a jug is full.', ['A pour stops when one jug is empty or the other is full.', 'Fill the big jug and use the little jug to measure.', 'Make two cups in the big jug, move them to the little jug, then fill the big jug again.']),
  kind: 'jugs', capacities: [3, 5], initial: [0, 0], target: [-1, 4], solution: [{ kind: 'fill', jug: 1 }, { kind: 'pour', from: 1, to: 0 }, { kind: 'empty', jug: 0 }, { kind: 'pour', from: 1, to: 0 }, { kind: 'fill', jug: 1 }, { kind: 'pour', from: 1, to: 0 }],
}, { capacities: [4, 2], initial: [0, 0], target: [2, 2], solution: [{ kind: 'fill', jug: 0 }, { kind: 'pour', from: 0, to: 1 }], intro: 'Fill the big jug, then pour into the little jug. Bring both water levels to their golden lines.', hints: ['Start with the big empty jug.', 'Fill the big jug all the way.', 'Pour from the big jug into the little jug until it is full.'], par: { moves: 2, seconds: 90 } }, {
  capacities: [8, 5, 3], initial: [8, 0, 0], target: [4, 4, 0], sealed: true, maxPours: 9,
  solution: [{ kind: 'pour', from: 0, to: 1 }, { kind: 'pour', from: 1, to: 2 }, { kind: 'pour', from: 2, to: 0 }, { kind: 'pour', from: 1, to: 2 }, { kind: 'pour', from: 0, to: 1 }, { kind: 'pour', from: 1, to: 2 }, { kind: 'pour', from: 2, to: 0 }],
  intro: 'The sealed tank holds eight cups. Share it into two groups of four using the eight-, five- and three-cup jugs, in nine pours or fewer.', hints: ['All eight cups stay inside the three jugs.', 'Pour from the eight-cup jug into the five-cup jug, then from the five into the three.', 'Use full and empty jugs to measure until the eight-cup and five-cup jugs each hold four cups.'], par: { moves: 7, seconds: 240 },
});

const tilt = styled<TiltRoomDef>({
  ...common('6-7', 'Marble Alley', 'bertie', ['tracks', 'levers'], 'Bertie\'s fairground game rolls every marble when you tilt the board. Get them into their cups; a hole bounces them safely back to the start.', ['A marble rolls until it reaches a wall or a cup.', 'Both marbles move when you tilt.', 'Use the walls to line up each marble with its cup.']),
  kind: 'tilt', ...TILTS.fixer, resident: 'sprites',
}, { ...TILTS.tinker, intro: 'Tilt Bertie\'s board to roll the marble into its cup. A wall stops the marble until you tilt another way.', hints: ['The marble rolls until a wall or cup stops it.', 'Use the walls to line up with the cup.', 'Tilt down, then left, then up to reach the cup.'] }, { ...TILTS.engineer });

function starSlides(engineer: boolean): Pick<LayersRoomDef, 'size' | 'slides' | 'target' | 'solution' | 'orderMatters' | 'allowRotate' | 'allowFlip'> {
  const size = engineer ? 5 : 4;
  const slides = [
    { id: 'north', cells: [{ at: 0, color: 'amber' }, { at: 5, color: 'amber' }, { at: 10, color: 'amber' }] },
    { id: 'tail', cells: [{ at: 3, color: 'teal' }, { at: 5, color: 'teal' }, { at: 12, color: 'teal' }] },
    { id: 'glow', cells: [{ at: 10, color: 'ivory' }, { at: 15, color: 'ivory' }] },
    { id: 'comet', cells: [{ at: 7, color: 'rose' }] },
    { id: 'cloud', cells: [{ at: 0, color: 'amber' }, { at: 6, color: 'amber' }] },
  ];
  if (engineer) slides.push({ id: 'extra', cells: [{ at: 0, color: 'rose' }, { at: 13, color: 'teal' }] }, { id: 'echo', cells: [{ at: 1, color: 'ivory' }, { at: 22, color: 'rose' }] });
  const solution = engineer ? [{ id: 'north', turn: 1 }, { id: 'tail', turn: 3, flipped: true }, { id: 'glow', turn: 2 }] : [{ id: 'north', turn: 0 }, { id: 'tail', turn: 0 }, { id: 'glow', turn: 0 }];
  const data = { size, slides, solution, orderMatters: true, allowRotate: engineer, allowFlip: engineer };
  return { ...data, target: projectLayers(data as LayersRoomDef, solution) };
}
const layers = styled<LayersRoomDef>({
  ...common('7-6', 'The Star Projector', 'orrery', ['light'], 'Miss Juniper\'s constellation is on glass slides. Stack the right slides in the right order to bring her sky back.', ['Match every star in the little sky plan.', 'A top slide can cover a star colour below it.', 'Leave out slides that add stars the plan does not have.']),
  kind: 'layers', ...starSlides(false),
}, {
  intro: 'Choose the two glass slides that make Miss Juniper\'s little star picture. Leave out the slide with the extra star.', hints: ['Match the stars in the little sky plan.', 'Try the slides with the same stars as the plan.', 'Use the two matching slides and leave out the extra star.'],
  size: 3, slides: [{ id: 'north', cells: [{ at: 0, color: 'amber' }, { at: 4, color: 'amber' }] }, { id: 'tail', cells: [{ at: 2, color: 'teal' }, { at: 6, color: 'teal' }] }, { id: 'comet', cells: [{ at: 8, color: 'rose' }] }],
  target: [{ at: 0, color: 'amber' }, { at: 2, color: 'teal' }, { at: 4, color: 'amber' }, { at: 6, color: 'teal' }], solution: [{ id: 'north', turn: 0 }, { id: 'tail', turn: 0 }], orderMatters: false, allowRotate: false, allowFlip: false, par: { moves: 2, seconds: 90 },
}, { ...starSlides(true), intro: 'Choose, turn and flip the glass slides to rebuild Miss Juniper\'s constellation. Leave out slides that add stars outside her plan.', hints: ['Match every star position and colour in the sky plan.', 'Turn a slide a quarter turn or flip it to change its stars.', 'Use the right three slides with the right turns and flip; reject extra stars.'], par: { moves: 10, seconds: 240 } });

const differences: DifferenceRoomDef['differences'] = [
  { x: 72, y: 62, art: 'gear', correct: '12', wrong: '8' },
  { x: 230, y: 52, art: 'arrow', correct: 'right', wrong: 'left' },
  { x: 245, y: 157, art: 'bell', correct: 'whole', wrong: 'cracked' },
  { x: 156, y: 65, art: 'clock', correct: '12:00', wrong: '3:00' },
  { x: 72, y: 170, art: 'window', correct: 'star', wrong: 'moon' },
  { x: 156, y: 164, art: 'wire', correct: 'joined', wrong: 'gap' },
  { x: 263, y: 220, art: 'bird', correct: 'upright', wrong: 'upside-down' },
];
const difference = styled<DifferenceRoomDef>({
  ...common('8-0', "Magnus's Blueprints", 'tower', ['gears', 'logic'], 'Magnus found Nana\'s tower plans. Compare the tower with the plan and touch every part that is different.', ['Look at the same place in both pictures.', 'Some parts face the wrong way or have the wrong shape.', 'Check the gear, arrow, bell, clock and window.']),
  kind: 'difference', differences: differences.slice(0, 5), resident: 'pigeons',
}, { differences: differences.slice(0, 3).map((d, i) => i === 0 ? { ...d, wrong: '6' } : d), intro: 'Magnus found Nana\'s tower picture. Look at both pictures and touch the three parts that look different.', hints: ['Look at the same place in both pictures.', 'Find the parts with a different shape or direction.', 'Check the gear, arrow and bell.'], par: { moves: 3, seconds: 90 } }, { differences: differences.map((d, i) => i === 0 ? { ...d, wrong: '10' } : d), intro: 'Compare Nana\'s clock-tower plan with the tower Magnus found. Spot all seven differences, including small changes in teeth and direction.', hints: ['Compare one section of the plan at a time.', 'Count gear teeth and check which way parts face.', 'Inspect the gear, arrow, bell, clock, window, wire and bird.'], par: { moves: 7, seconds: 180 } });

export const VARIETY_ROOMS: RoomDef[] = [shadow, slide, symmetry, packing, sorting, sudoku, jugs, tilt, layers, difference];
const replacement = new Map(VARIETY_ROOMS.map(r => [r.id, r]));
/** Additions appear at their intended story beats; replaced rooms keep their original id. */
export function varietyStoryRooms(rooms: RoomDef[]): RoomDef[] {
  return rooms.flatMap(r => {
    const room = replacement.get(r.id) ?? r;
    if (r.id === '1-bf') return [shadow, room];
    if (r.id === '2-bf') return [slide, room];
    if (r.id === '6-1') return [room, tilt];
    if (r.id === '8-1') return [difference, room];
    return [room];
  });
}

/** The former story puzzles remain playable, with story-only collectibles stripped. */
export const ARCHIVE_QUICK_FIXES: QuickFixDef[] = REPLACED_ROOM_IDS.map((id) => {
  const old = originals.find(r => r.id === id)!;
  const repair = Number(id[0]), archived = { ...old, id: `qf-archive-${id}`, treasure: undefined, mark: undefined, blueprint: undefined, gives: undefined } as RoomDef;
  const owner = repair === 3 ? 'theo' : repair === 4 ? 'marigold' : repair === 5 ? 'pepperwhistle' : 'juniper';
  const ownerName = repair === 3 ? 'Theo & Ada' : repair === 4 ? 'Captain Marigold' : repair === 5 ? 'Mrs. Pepperwhistle' : 'Miss Juniper';
  return { id: archived.id, title: old.title, owner, ownerName, object: old.theme, payoff: 'The mechanism runs smoothly again.', after: repair, reward: 'bulb-orange', room: archived };
});
