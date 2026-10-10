import { describe, expect, it } from 'vitest';
import { REPAIRS } from '../content/repairs';
import { afterRoom, startRepair, type Step } from './journey';
import { finishRepair, goldNeeded, markFixed, medalFor, nookLevel, repairOpen, storyGold, whatWeLearned } from './progress';
import { newProfile } from './save';

const scenes = (s: Step): string[] => {
  const out: string[] = [];
  let cur: Step | undefined = s;
  while (cur) {
    out.push(cur.scene === 'story' ? `story:${cur.id}` : cur.scene === 'room' ? `room:${cur.launch.roomId}` : cur.scene);
    cur = 'next' in cur ? cur.next : undefined;
  }
  return out;
};

describe('the journey through a Great Repair', () => {
  it('starts with the doorbell story, then the first room', () => {
    const p = newProfile('AB', 0, 'fixer');
    expect(scenes(startRepair(p, 1))).toEqual(['story:r1-doorbell', 'room:1-1']);
    p.seen.push('r1-doorbell');
    expect(scenes(startRepair(p, 1))).toEqual(['room:1-1']);
  });

  it('goes room to room, then Test Run → Return → rewards → home', () => {
    const p = newProfile('AB', 0, 'fixer');
    expect(scenes(afterRoom(p, { roomId: '1-3', mode: 'story' }))).toEqual(['room:1-4']);
    expect(scenes(afterRoom(p, { roomId: '1-bf', mode: 'story' }))).toEqual(['reveal', 'story:r1-return', 'rewards', 'shop']);
    expect(scenes(afterRoom(p, { roomId: '3-bf', mode: 'story' }))).toEqual(['reveal', 'story:r3-return', 'rewards', 'story:act1-closer', 'shop']);
  });

  it('plays the Act II closer after the last of repairs 4–6, and the festival after 8', () => {
    const p = newProfile('AB', 0, 'fixer');
    p.repairs.push(4, 6);
    expect(scenes(afterRoom(p, { roomId: '5-bf', mode: 'story' }))).toContain('story:bell-silent');
    const q = newProfile('AB', 0, 'fixer');
    expect(scenes(afterRoom(q, { roomId: '5-bf', mode: 'story' }))).not.toContain('story:bell-silent');
    expect(scenes(afterRoom(q, { roomId: '8-bf', mode: 'story' }))).toEqual(['reveal', 'story:epilogue', 'rewards', 'festival', 'shop']);
    expect(scenes(afterRoom(q, { roomId: '8-6', mode: 'story' }))).toEqual(['story:magnus-nest', 'room:8-7']);
  });

  it('sends other modes back where they came from', () => {
    const p = newProfile('AB', 0, 'fixer');
    expect(afterRoom(p, { roomId: 'qf-hinge', mode: 'quick' }).scene).toBe('quick');
    expect(afterRoom(p, { roomId: '1-2', mode: 'tuneup' }).scene).toBe('shelf');
    expect(afterRoom(p, { roomId: 'attic-typewriter-1', mode: 'attic' }).scene).toBe('attic');
    expect(afterRoom(p, { roomId: '8-7', mode: 'free' }).scene).toBe('bench');
  });
});

describe('progress and gating', () => {
  it('never asks for more than 70% of the Golden Gears on the main path (GDD §13.3)', () => {
    for (const r of REPAIRS) {
      const before = REPAIRS.filter((q) => q.id < r.id).reduce((n, q) => n + q.rooms.length * 3, 0);
      expect(goldNeeded(r)).toBeLessThanOrEqual(before * 0.7);
    }
  });

  it('opens each repair once the earlier ones are fixed, with only the guaranteed gears', () => {
    const p = newProfile('AB', 0, 'fixer');
    for (const r of REPAIRS) {
      expect(repairOpen(p, r), `repair ${r.id}`).toBe(true);
      for (const id of r.rooms) markFixed(p, id);
      finishRepair(p, r.id);
    }
    expect(storyGold(p)).toBe(REPAIRS.reduce((n, r) => n + r.rooms.length, 0));
    expect(p.repairs).toHaveLength(8);
    expect(p.stamps).toContain('repair-8');
  });

  it('keeps the order 1 → 2 → 3, then 4–6 in any order, then 7 and 8', () => {
    const p = newProfile('AB', 0, 'fixer');
    const open = () => REPAIRS.filter((r) => !p.repairs.includes(r.id) && repairOpen(p, r)).map((r) => r.id);
    expect(open()).toEqual([1]);
    for (const id of [1, 2, 3]) {
      for (const room of REPAIRS[id - 1].rooms) markFixed(p, room);
      finishRepair(p, id);
    }
    expect(open()).toEqual([4, 5, 6]);
  });

  it('gives tools, songs and shiny bits for a finished repair, once', () => {
    const p = newProfile('AB', 0, 'fixer');
    const a = finishRepair(p, 1);
    expect(a.firstTime).toBe(true);
    expect(p.tools).toContain('oilcan');
    expect(p.songs).toContain('song-cuckoo');
    const b = finishRepair(p, 1);
    expect(b.firstTime).toBe(false);
    expect(b.shiny).toBe(0);
  });

  it('awards medals by moves, time and no hints', () => {
    const par = { moves: 5, seconds: 60 };
    expect(medalFor(par, 9, 120, 2, 1)).toBe(1);
    expect(medalFor(par, 5, 120, 2, 0)).toBe(2);
    expect(medalFor(par, 5, 50, 0, 0)).toBe(4);
  });

  it('grows the nook and writes a friendly weekly summary', () => {
    const p = newProfile('SAM', 0, 'fixer');
    expect(nookLevel(p)).toBe(0);
    expect(whatWeLearned(p)).toContain('SAM');
    markFixed(p, '4-1');
    expect(whatWeLearned(p)).toMatch(/This week, SAM .*fix/);
    for (const id of ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '4-2']) markFixed(p, id);
    expect(nookLevel(p)).toBe(1);
  });
});
