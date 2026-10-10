import { describe, expect, it } from 'vitest';
import { effective, initialState, isSolved, solutionState } from '../rules';
import { getRoom, STORY_ROOMS } from '../content';
import { QUICK_FIXES } from '../content/quickfixes';
import { REPAIRS } from '../content/repairs';
import { ADDED_ROOM_IDS, ARCHIVE_QUICK_FIXES, REPLACED_ROOM_IDS, VARIETY_ROOMS } from '../content/rooms/variety';
import type { PlayStyleId, RoomDef } from '../content/types';
import type { DifferenceRoomDef, JugsRoomDef, LayersRoomDef, PackingRoomDef, ShadowRoomDef, SlideRoomDef, SortingRoomDef, SudokuRoomDef, SymmetryRoomDef, TiltRoomDef } from '../content/variety-types';
import { afterRoom, startRepair } from '../core/journey';
import { goldNeeded, nextRoomOf, repairDone, repairOpen } from '../core/progress';
import { newProfile } from '../core/save';
import {
  countPackingSolutions, countSudokuSolutions, differenceFind, differenceSolved, jugHint, jugMove, jugsSolved,
  layersSet, layersSolved, pieceCells, piecesSolved, placePiece, removePiece, rotateCells, slideHint, slideMove, slideSolved,
  sortingSolution, sortingSwap, sortingWeigh, sudokuCandidates, sudokuSet, symmetrySet, symmetrySolved, tiltHint, tiltMove, tiltSolved,
} from './variety';

const styles: PlayStyleId[] = ['tinker', 'fixer', 'engineer'];
function def<T extends RoomDef>(id: string, style: PlayStyleId = 'fixer'): Omit<T, 'styles'> { return effective(getRoom(id)!, style) as Omit<T, 'styles'>; }

describe('piece boards', () => {
  it('normalizes every rotation and rejects out-of-board, colliding, unknown or forbidden pieces', () => {
    expect(rotateCells([{ x: 0, y: 0 }, { x: 0, y: 1 }], 1)).toEqual([{ x: 1, y: 0 }, { x: 0, y: 0 }]);
    const d = def<PackingRoomDef>('3-4', 'tinker'), empty: PackingRoomDef['solution'] = [];
    expect(placePiece(d, empty, { ...d.solution[0], x: -1 })).toBe(empty);
    expect(placePiece(d, empty, { ...d.solution[0], turn: 1 })).toBe(empty);
    expect(placePiece(d, empty, { ...d.solution[0], id: 'missing' })).toBe(empty);
    let s = placePiece(d, empty, d.solution[0]);
    expect(placePiece(d, s, { ...d.solution[1], x: d.solution[0].x, y: d.solution[0].y })).toBe(s);
    expect(piecesSolved(d, [...d.solution, d.solution[0]])).toBe(false);
    const before = [...s]; s = removePiece(s, d.solution[0].id); expect(s).toEqual([]); expect(before).toHaveLength(1);
  });
  it('has a single young-player packing layout and one exact seven-piece Engineer solution', () => {
    for (const style of ['tinker', 'engineer'] as PlayStyleId[]) {
      const d = def<PackingRoomDef>('3-4', style);
      expect(countPackingSolutions(d)).toBe(1);
      expect(new Set(d.solution.flatMap(p => pieceCells(d, p)!)).size).toBe(d.board.length);
      if (style === 'engineer') expect(d.par!.moves).toBeGreaterThanOrEqual(d.solution.length + d.solution.reduce((n, p) => n + p.turn, 0));
    }
  });
  it('young tool outlines enforce the correct tool and Engineer pieces combine into one outline', () => {
    const easy = def<ShadowRoomDef>('1-7', 'tinker'), hard = def<ShadowRoomDef>('1-7', 'engineer');
    expect(easy.pieces).toHaveLength(3); expect(easy.outlines).toHaveLength(3);
    expect(placePiece(easy, [], { ...easy.solution[0], x: easy.solution[1].x })).toEqual([]);
    expect(hard.pieces).toHaveLength(7); expect(hard.outlines).toEqual([]);
    expect(piecesSolved(hard, solutionState(hard, 'engineer'))).toBe(true);
  });
});

describe('sliding photo and mirrored cake', () => {
  it('only moves adjacent tiles, preserving the full tile permutation and prior snapshots', () => {
    const d = def<SlideRoomDef>('2-7', 'tinker'), s = { tiles: [...d.initial], moves: 0 };
    expect(slideMove(d, s, 1)).toBe(s); expect(slideMove(d, s, -1)).toBe(s);
    const next = slideMove(d, s, 0); expect(s.tiles).toEqual(d.initial); expect(next.moves).toBe(1);
    expect([...next.tiles].sort()).toEqual([0, 1, 2, 3]);
  });
  it('uses genuinely three, fifteen and twenty-five legal moves, with shortest-path hints', () => {
    for (const [style, n] of [['tinker', 3], ['fixer', 15], ['engineer', 25]] as const) {
      const d = def<SlideRoomDef>('2-7', style); let s = { tiles: [...d.initial], moves: 0 };
      for (let step = 0; !slideSolved(d, s) && step <= n; step++) {
        const at = slideHint(d, s); expect(at).not.toBeNull(); s = slideMove(d, s, at!);
      }
      expect(slideSolved(d, s)).toBe(true); expect(s.moves).toBe(n);
    }
  });
  it('keeps seed decorations fixed, rejects unknown tokens and requires both mirror lines with no decoys', () => {
    const d = def<SymmetryRoomDef>('3-2', 'engineer');
    const s = Object.fromEntries(d.seeds.map(p => [p.at, p.token]));
    expect(symmetrySet(d, s, d.seeds[0].at, d.palette[1])).toBe(s);
    expect(symmetrySet(d, s, 63, 'not-a-decoration')).toBe(s);
    const solved = solutionState(d, 'engineer'); expect(symmetrySolved(d, solved)).toBe(true);
    const at = d.solution.find(p => !d.seeds.some(seed => seed.at === p.at))!.at;
    expect(symmetrySolved(d, symmetrySet(d, solved, at, 'yellow-star'))).toBe(false);
    expect(symmetrySolved(d, { ...solved, 32: d.palette[0] })).toBe(false);
  });
});

describe('valves and fuse boxes', () => {
  it('has visible size distinctions and a comparison-sorted weight route within the allowance', () => {
    const easy = def<SortingRoomDef>('4-3', 'tinker'), hard = def<SortingRoomDef>('4-3', 'engineer');
    expect(new Set(easy.items.map(i => i.size)).size).toBe(3);
    expect(new Set(hard.items.map(i => i.size)).size).toBe(1);
    const s = sortingSolution(hard); expect(isSolved(hard, s, 'engineer')).toBe(true); expect(s.weighings).toBeGreaterThan(0); expect(s.weighings).toBeLessThanOrEqual(11);
    const exhausted = { ...s, weighings: 11 };
    expect(sortingWeigh(hard, exhausted, hard.items[0].id, hard.items[1].id)).toBe(exhausted);
    expect(sortingSwap(hard, s, -1, 0)).toBe(s); expect(sortingWeigh(hard, s, 'missing', hard.items[0].id)).toBe(s);
  });
  it('every age has a unique fuse solution and protects givens, rows, columns and regions', () => {
    for (const style of styles) {
      const d = def<SudokuRoomDef>('4-4', style); expect(countSudokuSolutions(d)).toBe(1);
      const s = { cells: [...d.givens] }, given = d.givens.findIndex(n => n >= 0), blank = d.givens.findIndex(n => n < 0);
      expect(sudokuSet(d, s, given, (d.givens[given] + 1) % d.size)).toBe(s);
      const blocked = Array.from({ length: d.size }, (_, n) => n).find(n => !sudokuCandidates(d, s, blank).includes(n));
      if (blocked !== undefined) expect(sudokuSet(d, s, blank, blocked)).toBe(s);
      expect(sudokuSet(d, s, blank, d.size)).toBe(s);
    }
  });
  it('Engineer is solved with logical singles and hidden singles, without a guess', () => {
    const d = def<SudokuRoomDef>('4-4', 'engineer'); let s = { cells: [...d.givens] };
    const units = [
      ...Array.from({ length: 4 }, (_, y) => Array.from({ length: 4 }, (_, x) => y * 4 + x)),
      ...Array.from({ length: 4 }, (_, x) => Array.from({ length: 4 }, (_, y) => y * 4 + x)),
      ...[0, 2, 8, 10].map(at => [at, at + 1, at + 4, at + 5]),
    ];
    for (let step = 0; s.cells.includes(-1) && step < 16; step++) {
      const options = s.cells.map((value, at) => value < 0 ? sudokuCandidates(d, s, at) : []);
      let at = options.findIndex(o => o.length === 1), value = options[at]?.[0];
      if (at < 0) outer: for (const unit of units) for (let n = 0; n < 4; n++) { const places = unit.filter(i => options[i].includes(n)); if (places.length === 1) { at = places[0]; value = n; break outer; } }
      expect(at).toBeGreaterThanOrEqual(0); s = sudokuSet(d, s, at, value!);
    }
    expect(isSolved(d, s, 'engineer')).toBe(true);
  });
});

describe('water measurements and rolling marbles', () => {
  it('conserves sealed water, only pours to the next limit, and enforces the move allowance', () => {
    const d = def<JugsRoomDef>('5-1', 'engineer'), initial = { volumes: [...d.initial], pours: 0 };
    expect(jugMove(d, initial, { kind: 'fill', jug: 0 })).toBe(initial);
    expect(jugMove(d, initial, { kind: 'empty', jug: 0 })).toBe(initial);
    expect(jugMove(d, initial, { kind: 'pour', from: 0, to: 0 })).toBe(initial);
    expect(jugMove(d, initial, { kind: 'pour', from: 8, to: 1 })).toBe(initial);
    let s = initial;
    for (const action of d.solution) { const next = jugMove(d, s, action); expect(next).not.toBe(s); s = next; expect(s.volumes.reduce((a, b) => a + b)).toBe(8); }
    expect(jugsSolved(d, s)).toBe(true); expect(s.pours).toBe(7);
    const exhausted = { volumes: [3, 5, 0], pours: 9 }; expect(jugMove(d, exhausted, { kind: 'pour', from: 1, to: 2 })).toBe(exhausted);
  });
  it('jug hints remain legal and complete every age puzzle', () => {
    for (const style of styles) {
      const d = def<JugsRoomDef>('5-1', style); let s = { volumes: [...d.initial], pours: 0 };
      for (let step = 0; !jugsSolved(d, s) && step < 12; step++) { const action = jugHint(d, s); expect(action).not.toBeNull(); s = jugMove(d, s, action!); }
      expect(jugsSolved(d, s)).toBe(true);
    }
  });
  it('tilt paths are genuine shortest routes, move both marbles without overlap, and preserve snapshots', () => {
    for (const style of styles) {
      const d = def<TiltRoomDef>('6-7', style), before = [...d.initial]; let s = { marbles: [...d.initial], moves: 0 };
      for (let step = 0; !tiltSolved(d, s) && step < 20; step++) { const direction = tiltHint(d, s); expect(direction).not.toBeNull(); s = tiltMove(d, s, direction!); expect(new Set(s.marbles).size).toBe(s.marbles.length); }
      expect(tiltSolved(d, s)).toBe(true); expect(s.moves).toBe(d.par.moves); expect(d.initial).toEqual(before);
    }
  });
  it('holes return every marble safely to its initial place, with one reversible move', () => {
    const d = { ...def<TiltRoomDef>('6-7', 'fixer'), cols: 4, rows: 2, walls: [], holes: [2], initial: [0, 4], goals: [3, 7] };
    const s = { marbles: [1, 4], moves: 2 }; expect(tiltMove(d, s, 'right')).toEqual({ marbles: [0, 4], moves: 3 }); expect(s.marbles).toEqual([1, 4]);
  });
});

describe('glass slides and blueprints', () => {
  it('requires the right order and rejects decoys, forbidden turns and flips', () => {
    const d = def<LayersRoomDef>('7-6'), solved = solutionState(d, 'fixer'); expect(layersSolved(d, solved)).toBe(true);
    expect(layersSolved(d, [...solved].reverse())).toBe(false);
    const extra = layersSet(d, solved, { id: 'comet', turn: 0 }); expect(layersSolved(d, extra)).toBe(false);
    expect(layersSet(d, [], { id: 'north', turn: 1 })).toEqual([]);
    expect(layersSet(d, [], { id: 'north', turn: 0, flipped: true })).toEqual([]);
    expect(layersSolved(d, solved.map((p, i) => i === 0 ? { ...p, turn: NaN } : p))).toBe(false);
    const hard = def<LayersRoomDef>('7-6', 'engineer'); expect(layersSolved(hard, solutionState(hard, 'engineer'))).toBe(true);
    expect(layersSolved(hard, hard.solution.map(p => ({ ...p, turn: 0, flipped: false })))).toBe(false);
  });
  it('counts only authored differences; repeated taps and outside indices cannot award success', () => {
    const d = def<DifferenceRoomDef>('8-0', 'engineer'), s = new Set<number>(); expect(d.differences).toHaveLength(7);
    expect(differenceFind(d, s, -1)).toBe(s); expect(differenceFind(d, s, 7)).toBe(s);
    const next = differenceFind(d, s, 0); expect(next.size).toBe(1); expect(s.size).toBe(0); expect(differenceFind(d, next, 0)).toBe(next);
    expect(differenceSolved(d, new Set([0, 1, 2, 3, 4, 5, 100]))).toBe(false);
  });
});

describe('content placement and existing progress', () => {
  it('adds four rooms, replaces six kinds without deleting old puzzles or duplicating rewards', () => {
    expect(STORY_ROOMS).toHaveLength(61); expect(VARIETY_ROOMS).toHaveLength(10); expect(QUICK_FIXES).toHaveLength(30); expect(ARCHIVE_QUICK_FIXES).toHaveLength(6);
    expect(REPAIRS.flatMap(r => r.rooms)).toEqual(STORY_ROOMS.map(r => r.id));
    for (const q of ARCHIVE_QUICK_FIXES) { expect(q.room.kind === 'flow' || q.room.kind === 'light').toBe(true); for (const field of ['treasure', 'mark', 'blueprint', 'gives'] as const) expect(q.room[field]).toBeUndefined(); }
    for (const id of REPLACED_ROOM_IDS) expect(VARIETY_ROOMS.find(r => r.id === id)).toBeDefined();
    expect(STORY_ROOMS.filter(r => r.kind === 'flow')).toHaveLength(8);
    expect(def<SudokuRoomDef>('4-4').dark).toBe(false);
    expect(ARCHIVE_QUICK_FIXES.find(q => q.id === 'qf-archive-4-4')!.room.dark).toBe(true);
    expect(ARCHIVE_QUICK_FIXES.find(q => q.id === 'qf-archive-3-2')!.title).toBe('Switchback Mountain');
  });
  it('each new kind has genuine age-specific data and starts unfinished', () => {
    for (const room of VARIETY_ROOMS) {
      const variants = styles.map(style => effective(room, style));
      expect(new Set(variants.map(v => JSON.stringify(v))).size).toBe(3);
      for (const style of styles) { const d = effective(room, style); expect(d.simplify).toBe(false); expect(isSolved(d as never, initialState(d as never), style)).toBe(false); expect(isSolved(d as never, solutionState(d as never, style), style)).toBe(true); }
    }
  });
  it('places new games at their intended story beats', () => {
    const p = newProfile('AB', 0, 'fixer');
    expect(afterRoom(p, { roomId: '1-6', mode: 'story' })).toEqual({ scene: 'room', launch: { roomId: '1-7', mode: 'story' } });
    expect(afterRoom(p, { roomId: '2-6', mode: 'story' })).toEqual({ scene: 'room', launch: { roomId: '2-7', mode: 'story' } });
    expect(afterRoom(p, { roomId: '6-1', mode: 'story' })).toEqual({ scene: 'room', launch: { roomId: '6-7', mode: 'story' } });
    p.seen.push('r8-doorbell'); expect(startRepair(p, 8)).toEqual({ scene: 'room', launch: { roomId: '8-0', mode: 'story' } });
  });
  it('keeps all eight completed repairs completed and retains legacy gold thresholds', () => {
    const p = newProfile('AB', 0, 'fixer'); p.repairs = [1, 2, 3, 4, 5, 6, 7, 8];
    for (const room of STORY_ROOMS.filter(r => !ADDED_ROOM_IDS.includes(r.id))) p.rooms[room.id] = { fixed: true, gold: [1], medal: 0 };
    expect(REPAIRS.map(goldNeeded)).toEqual([0, 3, 7, 10, 14, 17, 21, 24]);
    for (const repair of REPAIRS) { expect(repairDone(p, repair.id)).toBe(true); expect(repairOpen(p, repair)).toBe(true); expect(nextRoomOf(p, repair)).toBe(`${repair.id}-bf`); }
    expect(p.rooms['1-7']).toBeUndefined(); expect(p.repairs).toHaveLength(8);
  });
});
