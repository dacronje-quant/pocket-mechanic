/**
 * Every room ships with an authored solution, and this test applies each one
 * through its engine in every Play Style (CLAUDE.md: never ship a room
 * without this passing). It also checks that no room starts already fixed,
 * that the drawer holds the parts the solution needs, and that ids resolve.
 */
import { describe, expect, it } from 'vitest';
import { applyLightSolution, parseLightGrid } from '../mechanism/light';
import { parseGrid } from '../mechanism/flow';
import { effective, initialState, isSolved, solutionState } from '../rules';
import { atticRooms, ATTIC_OBJECTS } from './attic';
import { getRoom, STORY_ROOMS } from './index';
import { QUICK_FIXES } from './quickfixes';
import { MARK_ROOMS, REPAIRS, TREASURES } from './repairs';
import type { PlayStyleId, RoomDef } from './types';

const STYLES: PlayStyleId[] = ['tinker', 'fixer', 'engineer'];

function multisetIncludes(have: Array<string | number>, need: Array<string | number>): boolean {
  const left = [...have];
  for (const n of need) {
    const i = left.indexOf(n);
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return true;
}

function trayCovers(def: ReturnType<typeof effective<RoomDef>>): boolean {
  switch (def.kind) {
    case 'gear':
      return multisetIncludes(def.tray, def.solution.map((p) => p.teeth));
    case 'flow': {
      const need = parseGrid(def.grid)
        .cells.filter((t) => t?.slot && t.sol?.kind)
        .map((t) => t!.sol!.kind!);
      return multisetIncludes(def.tray.map((t) => t[0]), need);
    }
    case 'light': {
      const need = parseLightGrid(def.grid)
        .cells.filter((t) => t?.kind === '_' && t.sol?.kind)
        .map((t) => t!.sol!.kind! + (t!.sol!.kind === 'F' ? t!.sol!.color ?? 'r' : ''));
      return multisetIncludes(def.tray, need);
    }
    case 'logic':
      return multisetIncludes(def.tray, Object.values(def.solution.gates ?? {}));
    case 'cards':
      return multisetIncludes(
        def.tray.map((c) => JSON.stringify(c)),
        def.solution.map((c) => JSON.stringify(c)),
      );
    case 'cam':
      return multisetIncludes(
        [...def.tray, ...def.followers.filter((f) => f.start).map((f) => f.start!.shape)],
        def.followers.map((f) => def.solution[f.id].shape),
      );
    case 'chain':
      return multisetIncludes(
        def.tray,
        def.links.filter((l) => l.slot).map((l) => l.sol!),
      );
    case 'balance':
      if (def.mode === 'pulley') return (def.solution.wheels ?? 0) <= Math.min(def.pulley!.wheels, def.pulley!.slots);
      return multisetIncludes(def.lever!.tray, (def.solution.weights ?? []).map((w) => w.mass)) && (def.solution.weights ?? []).every((w) => def.lever!.slots.includes(w.slot));
    default:
      return true;
  }
}

function checkRoom(room: RoomDef): void {
  for (const style of STYLES) {
    const eff = effective(room, style);
    const solved = isSolved(eff as never, solutionState(eff as never, style), style);
    expect(solved, `${room.id} (${style}): authored solution should fix the room`).toBe(true);
    const start = isSolved(eff as never, initialState(eff as never), style);
    expect(start, `${room.id} (${style}): room should not start fixed`).toBe(false);
    expect(trayCovers(eff), `${room.id} (${style}): drawer should hold the solution's parts`).toBe(true);
  }
}

describe('Great Repair rooms', () => {
  it('has 53 rooms plus 8 Big Fixes, all referenced by a repair', () => {
    const ids = REPAIRS.flatMap((r) => r.rooms);
    expect(ids.length).toBe(61);
    expect(ids.filter((id) => id.endsWith('-bf')).length).toBe(8);
    for (const id of ids) expect(getRoom(id), id).toBeDefined();
    expect(new Set(STORY_ROOMS.map((r) => r.id)).size).toBe(STORY_ROOMS.length);
  });

  for (const room of STORY_ROOMS) {
    it(`${room.id} ${room.title}: solvable in every Play Style`, () => checkRoom(room));
  }

  it('the light solution helper places parts into slots', () => {
    const g = applyLightSolution(parseLightGrid(['A1 _=R1', '. D0']));
    expect(g.cells[1]!.kind).toBe('R');
  });
});

describe('Quick Fixes', () => {
  it('keeps 24 originals in eight sets of three, plus six preserved story puzzles', () => {
    const originals = QUICK_FIXES.filter(q => !q.id.startsWith('qf-archive-'));
    expect(originals.length).toBe(24);
    expect(QUICK_FIXES.length).toBe(30);
    const sets = new Map<number, number>();
    for (const q of originals) sets.set(q.after, (sets.get(q.after) ?? 0) + 1);
    expect([...sets.values()].every((n) => n === 3)).toBe(true);
    expect(sets.size).toBe(8);
    expect(new Set(QUICK_FIXES.map((q) => q.id)).size).toBe(30);
  });

  for (const q of QUICK_FIXES) {
    it(`${q.id}: solvable in every Play Style`, () => checkRoom(q.room));
  }
});

describe('the Attic', () => {
  it('has 23 objects with unique clue symbols, and every generated room is solvable', () => {
    expect(ATTIC_OBJECTS.length).toBe(23);
    expect(new Set(ATTIC_OBJECTS.map((o) => o.clue)).size).toBe(23);
    const rooms = atticRooms();
    expect(rooms.length).toBe(69);
    for (const r of rooms) checkRoom(r);
  });
});

describe('collectibles and layout', () => {
  const all = [...STORY_ROOMS, ...QUICK_FIXES.map((q) => q.room)];

  it('every Lost Treasure is hidden in a room of its repair', () => {
    for (const [id, t] of Object.entries(TREASURES)) {
      const rooms = all.filter((r) => r.treasure?.id === id);
      expect(rooms.length, id).toBe(1);
      expect(rooms[0].id.startsWith(`${t.repair}-`), id).toBe(true);
      expect(REPAIRS[t.repair - 1].treasures).toContain(id);
    }
  });

  it('every Magnus Mark room has a mark spot', () => {
    for (const roomId of Object.keys(MARK_ROOMS)) expect(getRoom(roomId)!.mark, roomId).toBeDefined();
  });

  it('secret spots sit inside the room, above the parts drawer', () => {
    for (const r of all) {
      for (const [what, s] of [
        ['hidden', r.hidden],
        ['treasure', r.treasure],
        ['mark', r.mark],
        ['blueprint', r.blueprint],
      ] as const) {
        if (!s) continue;
        expect(s.x >= 170 && s.x <= 1110, `${r.id} ${what} x`).toBe(true);
        expect(s.y >= 130 && s.y <= 530, `${r.id} ${what} y`).toBe(true);
      }
    }
  });
});

describe('story, Part-o-pedia, cosmetics', async () => {
  const { STORIES, storyById, LINES } = await import('./story');
  const { PEDIA, pediaById } = await import('./pedia');
  const { COSMETICS, cosmeticById } = await import('./cosmetics');
  const { VOICES } = await import('./voices');
  const { STAMPS } = await import('./stamps');

  it('every repair story id resolves', () => {
    for (const r of REPAIRS) {
      for (const id of [r.doorbell, r.ret, ...(r.after ?? [])]) expect(storyById(id), id).toBeDefined();
    }
    for (const id of ['prologue', 'bell-silent', 'magnus-nest', 'attic-open', 'box-open', 'closing-time']) expect(storyById(id), id).toBeDefined();
  });

  it('voice line ids are unique and every speaker has a voice', () => {
    const ids = [...STORIES.flatMap((s) => s.lines.map((l) => l.id)), ...Object.keys(LINES)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STORIES) for (const l of s.lines) expect(VOICES[l.who], l.who).toBeDefined();
  });

  it('every Part-o-pedia id used by a room has a page', () => {
    expect(new Set(PEDIA.map((p) => p.id)).size).toBe(PEDIA.length);
    for (const r of all()) for (const id of r.pedia) expect(pediaById(id), `${r.id}: ${id}`).toBeDefined();
  });

  it('every reward is a real cosmetic, and every cosmetic source is real', () => {
    expect(new Set(COSMETICS.map((c) => c.id)).size).toBe(COSMETICS.length);
    for (const r of REPAIRS) expect(cosmeticById(r.reward), r.reward).toBeDefined();
    for (const q of QUICK_FIXES) expect(cosmeticById(q.reward), q.reward).toBeDefined();
    for (const c of COSMETICS) {
      if (c.source.kind === 'treasure') expect(TREASURES[c.source.treasure], c.id).toBeDefined();
      if (c.source.kind === 'quick') expect(QUICK_FIXES.find((q) => q.id === (c.source as { quick: string }).quick), c.id).toBeDefined();
    }
    expect(STAMPS.length).toBeGreaterThanOrEqual(50);
  });
});

function all(): RoomDef[] {
  return [...STORY_ROOMS, ...QUICK_FIXES.map((q) => q.room)];
}
