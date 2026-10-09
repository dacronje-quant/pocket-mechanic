/**
 * Progress, rewards and unlocks (GDD §13, §19, §20). Pure functions over a
 * Profile so they are easy to test; callers persist afterwards.
 */
import { ATTIC_OBJECTS, atticRoomId } from '../content/attic';
import { GADGET_UNLOCKS, STARTER_GADGETS, type GadgetKind } from '../content/bench';
import { COSMETICS, type Cosmetic } from '../content/cosmetics';
import { getRoom, STORY_ROOMS } from '../content/index';
import { MARK_ROOMS, repairById, REPAIRS, TREASURES } from '../content/repairs';
import { QUICK_FIXES } from '../content/quickfixes';
import { SONGS } from '../content/songs';
import { STAMPS, type StampDef } from '../content/stamps';
import type { Family, QuickFixDef, RepairDef, ToolId } from '../content/types';
import type { Profile, RoomRecord } from './save';

export const ALL_TOOLS: ToolId[] = ['beam', 'oilcan', 'peek', 'boots', 'grapple', 'spool', 'wrench', 'pencil', 'prism'];

export function record(p: Profile, roomId: string): RoomRecord {
  p.rooms[roomId] ??= { fixed: false, gold: [], medal: 0 };
  return p.rooms[roomId];
}

export const roomFixed = (p: Profile, id: string): boolean => !!p.rooms[id]?.fixed;

export function goldTotal(p: Profile): number {
  return Object.values(p.rooms).reduce((n, r) => n + r.gold.length, 0);
}

export function storyGold(p: Profile): number {
  return STORY_ROOMS.reduce((n, r) => n + (p.rooms[r.id]?.gold.length ?? 0), 0);
}

/** Award a Golden Gear (1 fix, 2 hidden spot, 3 clever). Returns true if it is new. */
export function awardGold(p: Profile, roomId: string, n: 1 | 2 | 3): boolean {
  const r = record(p, roomId);
  if (r.gold.includes(n)) return false;
  r.gold.push(n);
  p.shiny += n === 1 ? 0 : 5;
  return true;
}

// ───────────────────────────── repairs & gating ─────────────────────────────

/** Golden Gears needed to open a repair: well under what fixing the earlier rooms guarantees. */
export function goldNeeded(r: RepairDef): number {
  const before = REPAIRS.filter((q) => q.id < r.id).reduce((n, q) => n + q.rooms.length, 0);
  return Math.floor(before * 0.5);
}

export const repairDone = (p: Profile, id: number): boolean => p.repairs.includes(id);

export function repairOpen(p: Profile, r: RepairDef): boolean {
  return r.requires.every((id) => repairDone(p, id)) && storyGold(p) >= goldNeeded(r);
}

/** The next repair to offer at the door (lowest open, unfinished one). */
export function nextRepairs(p: Profile): RepairDef[] {
  return REPAIRS.filter((r) => !repairDone(p, r.id) && repairOpen(p, r));
}

export function nextRoomOf(p: Profile, r: RepairDef): string {
  return r.rooms.find((id) => !roomFixed(p, id)) ?? r.rooms[r.rooms.length - 1];
}

export function repairStarted(p: Profile, r: RepairDef): boolean {
  return r.rooms.some((id) => roomFixed(p, id)) || p.seen.includes(r.doorbell);
}

export function quickOpen(p: Profile, q: QuickFixDef): boolean {
  return q.after === 0 || repairDone(p, q.after);
}

export type Area = 'shelf' | 'pedia' | 'nook' | 'paint' | 'window' | 'bench' | 'tess' | 'attic' | 'quick' | 'door';

export function areaOpen(p: Profile, a: Area): boolean {
  switch (a) {
    case 'door':
    case 'quick':
      return true;
    case 'shelf':
    case 'pedia':
    case 'nook':
      return repairDone(p, 1);
    case 'paint':
      return repairDone(p, 2);
    case 'window':
      return repairDone(p, 3);
    case 'bench':
      return repairDone(p, 4);
    case 'tess':
      return repairDone(p, 5);
    case 'attic':
      return repairDone(p, 8);
  }
}

export const tessUnlocked = (p: Profile): boolean => repairDone(p, 5);

// ───────────────────────────── fixing a room ─────────────────────────────

export interface FixReport {
  firstTime: boolean;
  shiny: number;
  tool?: ToolId;
  newStamps: StampDef[];
  newSongs: string[];
}

export function markFixed(p: Profile, roomId: string, opts: { quick?: boolean; attic?: boolean } = {}): FixReport {
  const r = record(p, roomId);
  const firstTime = !r.fixed;
  r.fixed = true;
  awardGold(p, roomId, 1);
  const def = getRoom(roomId);
  let shiny = 0;
  let tool: ToolId | undefined;
  const newSongs: string[] = [];
  if (firstTime && def) {
    shiny = opts.quick ? 8 : 12;
    p.shiny += shiny;
    p.stats.rooms += opts.quick || opts.attic ? 0 : 1;
    if (opts.quick) p.stats.quick += 1;
    for (const f of def.families) p.stats.families[f] = (p.stats.families[f] ?? 0) + 1;
    for (const id of def.pedia) if (!p.pedia.includes(id)) p.pedia.push(id);
    if (def.gives && !p.tools.includes(def.gives)) {
      p.tools.push(def.gives);
      tool = def.gives;
    }
    if (opts.attic && !p.attic.rooms.includes(roomId)) p.attic.rooms.push(roomId);
    for (const s of SONGS) {
      if (s.from === roomId && !p.songs.includes(s.id)) {
        p.songs.push(s.id);
        newSongs.push(s.id);
      }
    }
    p.log.push({ t: Date.now(), what: logLine(def.title, def.families) });
    if (p.log.length > 200) p.log.splice(0, p.log.length - 200);
  }
  return { firstTime, shiny, tool, newStamps: checkStamps(p), newSongs };
}

function logLine(title: string, fams: Family[]): string {
  const what: Record<Family, string> = {
    gears: 'fitted gears',
    levers: 'used levers and pulleys',
    springs: 'wound springs',
    pendulums: 'timed a pendulum',
    music: 'played with music and cams',
    tracks: 'routed a train',
    circuits: 'completed a circuit',
    pipes: 'piped water and steam',
    logic: 'built logic gates and programs',
    light: 'bent light with mirrors and lenses',
  };
  return `${what[fams[0]] ?? 'fixed something'} in ${title}`;
}

export function finishRepair(p: Profile, id: number): FixReport {
  const r = repairById(id);
  const firstTime = !p.repairs.includes(id);
  if (firstTime) {
    p.repairs.push(id);
    p.shiny += 40;
    if (r.song && !p.songs.includes(r.song)) p.songs.push(r.song);
    for (const t of r.tools) if (!p.tools.includes(t)) p.tools.push(t);
  }
  return { firstTime, shiny: firstTime ? 40 : 0, newStamps: checkStamps(p), newSongs: [] };
}

export function findTreasure(p: Profile, id: string): boolean {
  if (!TREASURES[id] || p.treasures.includes(id)) return false;
  p.treasures.push(id);
  p.shiny += 10;
  return true;
}

export function findMark(p: Profile, roomId: string): string | null {
  const id = MARK_ROOMS[roomId];
  if (!id || p.marks.includes(id)) return null;
  p.marks.push(id);
  return id;
}

export function findBlueprint(p: Profile, id: string): boolean {
  if (p.blueprints.includes(id)) return false;
  p.blueprints.push(id);
  return true;
}

export function setFlag(p: Profile, flag: string): boolean {
  if (p.flags.includes(flag)) return false;
  p.flags.push(flag);
  return true;
}

// ───────────────────────────── Tune-Up medals ─────────────────────────────

/** Copper for fixing; Silver/Gold/Brass for meeting 1/2/3 of: par moves, par time, no hints & no peeking. */
export function medalFor(par: { moves: number; seconds: number }, moves: number, secs: number, hints: number, peeks: number): number {
  let extra = 0;
  if (moves <= par.moves) extra++;
  if (secs <= par.seconds) extra++;
  if (hints === 0 && peeks === 0) extra++;
  return 1 + extra;
}

export function medalCount(p: Profile, atLeast = 1): number {
  return Object.values(p.rooms).filter((r) => r.medal >= atLeast).length;
}

// ───────────────────────────── cosmetics ─────────────────────────────

export function atticObjectsDone(p: Profile): number {
  return ATTIC_OBJECTS.filter((o) => [1, 2, 3].every((n) => p.attic.rooms.includes(atticRoomId(o.id, n)))).length;
}

export function cosmeticOwned(p: Profile, c: Cosmetic): boolean {
  const s = c.source;
  switch (s.kind) {
    case 'start':
      return true;
    case 'shiny':
      return p.owned.includes(c.id);
    case 'repair':
      return repairDone(p, s.repair);
    case 'treasure':
      return p.treasures.includes(s.treasure);
    case 'quick':
      return roomFixed(p, s.quick);
    case 'medals':
      return medalCount(p) >= s.count;
    case 'gold':
      return goldTotal(p) >= s.count;
    case 'attic':
      return atticObjectsDone(p) >= s.count;
    case 'box':
      return p.attic.box;
  }
}

export function buyCosmetic(p: Profile, c: Cosmetic): boolean {
  if (c.source.kind !== 'shiny' || p.owned.includes(c.id) || p.shiny < c.source.cost) return false;
  p.shiny -= c.source.cost;
  p.owned.push(c.id);
  return true;
}

export function ownedCosmetics(p: Profile): Cosmetic[] {
  return COSMETICS.filter((c) => cosmeticOwned(p, c));
}

export function benchGadgets(p: Profile): GadgetKind[] {
  const out = [...STARTER_GADGETS];
  for (const [k, g] of Object.entries(GADGET_UNLOCKS)) {
    const has = k.startsWith('repair-') ? repairDone(p, Number(k.split('-')[1])) : p.blueprints.includes(k);
    if (has && !out.includes(g)) out.push(g);
  }
  return out;
}

// ───────────────────────────── stamps ─────────────────────────────

export function stampEarned(p: Profile, st: StampDef): boolean {
  const c = st.cond;
  switch (c.kind) {
    case 'stat': {
      const v: Record<string, number> = {
        rooms: p.stats.rooms,
        fiddles: p.stats.fiddles,
        peeks: p.stats.peeks,
        quick: p.stats.quick,
        pedia: p.pedia.length,
        songs: p.songs.length,
        cards: Object.keys(p.bench.cards).length,
        attic: atticObjectsDone(p),
        gold: storyGold(p),
      };
      return (v[c.stat] ?? 0) >= c.at;
    }
    case 'repair':
      return repairDone(p, c.id);
    case 'treasures':
      return p.treasures.length >= c.at;
    case 'marks':
      return p.marks.length >= c.at;
    case 'medal':
      return medalCount(p, c.medal) >= c.at;
    case 'family':
      return (p.stats.families[c.family] ?? 0) >= c.at;
    case 'tool':
      return c.tool === 'all' ? ALL_TOOLS.every((t) => p.tools.includes(t)) : p.tools.includes(c.tool);
    case 'flag':
      return p.flags.includes(c.flag);
  }
}

/** Award any newly earned stamps and return them. */
export function checkStamps(p: Profile): StampDef[] {
  const out: StampDef[] = [];
  for (const st of STAMPS) {
    if (!p.stamps.includes(st.id) && stampEarned(p, st)) {
      p.stamps.push(st.id);
      out.push(st);
    }
  }
  return out;
}

// ───────────────────────────── grown-ups ─────────────────────────────

/** A friendly "What We Learned" summary of the last seven days (GDD §28). */
export function whatWeLearned(p: Profile, now = Date.now()): string {
  const week = p.log.filter((l) => now - l.t < 7 * 24 * 3600 * 1000);
  const name = p.initials || 'Your fixer';
  if (!week.length) return `${name} hasn't fixed anything this week yet — maybe today!`;
  const uniq = [...new Set(week.map((l) => l.what))].slice(0, 4);
  const songs = p.composed.length ? `, and composed ${p.composed.length} song${p.composed.length > 1 ? 's' : ''}` : '';
  return `This week, ${name} ${uniq.join('; ')}${songs}. That's ${week.length} fix${week.length > 1 ? 'es' : ''}!`;
}

export function quickFixesOpen(p: Profile): QuickFixDef[] {
  return QUICK_FIXES.filter((q) => quickOpen(p, q));
}
