import { describe, expect, it } from 'vitest';
import { G, CLOCK_AMPLITUDE, notchLength, notchPixels, period, releasePendulum, pushPendulum, stepPendulum, type PendulumMotion } from './pendulum';
import { STORY_ROOMS } from '../content';
import { QUICK_FIXES } from '../content/quickfixes';
import { effective, initialState, pendulumSolved, solutionState } from '../rules';

const energy = (l: number, m: PendulumMotion) => .5 * m.velocity ** 2 + G / l * (1 - Math.cos(m.angle));
const evolve = (l: number, start: PendulumMotion, seconds: number, drive = false) => {
  let motion = start;
  for (let i = 0; i < seconds * 120; i++) motion = stepPendulum(l, motion, 1 / 120, { damping: 0, escapement: drive });
  return motion;
};

describe('physical clock pendulums', () => {
  it('accelerates toward the bottom and does not drift from rest', () => {
    expect(stepPendulum(.75, { angle: .2, velocity: 0 }, .05).velocity).toBeLessThan(0);
    expect(stepPendulum(.75, { angle: -.2, velocity: 0 }, .05).velocity).toBeGreaterThan(0);
    expect(stepPendulum(.75, { angle: 0, velocity: 0 }, 1)).toEqual({ angle: 0, velocity: 0, crossings: 0 });
  });
  it('keeps energy across an undamped minute', () => {
    const start = releasePendulum(), end = evolve(.75, start, 60);
    expect(energy(.75, end) / energy(.75, start)).toBeCloseTo(1, 4);
  });
  it('measured half-periods follow the physical length, including a large frame', () => {
    for (const l of [.25, .75, 1.15]) {
      let motion = releasePendulum(), t = 0; const times: number[] = [];
      while (times.length < 5) {
        const next = stepPendulum(l, motion, 1 / 240, { damping: 0 }); t += 1 / 240;
        if (next.crossings) times.push(t);
        motion = next;
      }
      const half = (times[4] - times[0]) / 4;
      expect(Math.abs(half / (period(l) / 2) - 1)).toBeLessThan(.01);
    }
    expect(stepPendulum(.25, releasePendulum(), 2, { damping: 0 }).crossings).toBe(4);
  });
  it('releases equal lengths together without a phase correction', () => {
    expect(evolve(.65, releasePendulum(), 10, true)).toEqual(evolve(.65, releasePendulum(), 10, true));
    const a = evolve(.65, { angle: -.2, velocity: 0 }, 1);
    const b = evolve(.65, { angle: .1, velocity: .2 }, 1);
    expect(Math.abs(a.angle - b.angle)).toBeGreaterThan(.05);
  });
  it('different lengths drift after the same release', () => {
    expect(Math.abs(evolve(.35, releasePendulum(), 1).angle - evolve(.65, releasePendulum(), 1).angle)).toBeGreaterThan(.1);
  });
  it('a tap changes momentum, preserves position and limits repeated pushes', () => {
    let motion: PendulumMotion = { angle: -.1, velocity: .2 };
    const next = pushPendulum(.75, motion);
    expect(next.angle).toBe(motion.angle); expect(next.velocity).toBeGreaterThan(motion.velocity);
    for (let i = 0; i < 100; i++) motion = pushPendulum(.75, motion);
    expect(energy(.75, motion)).toBeLessThanOrEqual(G / .75 * (1 - Math.cos(.26)) + 1e-9);
  });
  it('missing escapement loses energy; a fitted escapement sustains a small swing', () => {
    const start = releasePendulum();
    let free = start, clock = start;
    for (let i = 0; i < 1200; i++) {
      free = stepPendulum(.75, free, 1 / 60, { damping: .25 });
      clock = stepPendulum(.75, clock, 1 / 60, { damping: .025, escapement: true });
    }
    expect(energy(.75, free) / energy(.75, start)).toBeLessThan(.01);
    expect(energy(.75, clock) / energy(.75, start)).toBeGreaterThan(.95);
    expect(Math.abs(clock.angle)).toBeLessThan(CLOCK_AMPLITUDE + .001);
  });
  it('rendered length uses one metres-to-pixels scale at every notch', () => {
    for (let n = 1; n <= 10; n++) expect(notchPixels(n) / notchLength(n)).toBe(300);
    expect(notchPixels(6) / notchPixels(2)).toBeCloseTo(notchLength(6) / notchLength(2));
  });
  it('substeps make a stalled frame agree with ordinary frames without mutation', () => {
    const start = releasePendulum(), copy = { ...start }, large = stepPendulum(.75, start, 1);
    let small = start;
    for (let i = 0; i < 60; i++) small = stepPendulum(.75, small, 1 / 60);
    expect(large.angle).toBeCloseTo(small.angle, 10); expect(large.velocity).toBeCloseTo(small.velocity, 10); expect(start).toEqual(copy);
  });
  it('all nine authored room/style configurations have legal solutions and start unsolved', () => {
    for (const room of [...STORY_ROOMS, ...QUICK_FIXES.map(q => q.room)].filter(r => r.kind === 'pendulum')) for (const style of ['tinker', 'fixer', 'engineer'] as const) {
      const d = effective(room, style);
      expect(pendulumSolved(d, initialState(d))).toBe(false);
      expect(pendulumSolved(d, solutionState(d, style))).toBe(true);
    }
  });
  it('equal lengths alone do not prove synchronised motion, and impossible settings cannot win', () => {
    const raw = STORY_ROOMS.find(r => r.id === '8-4')!; if (raw.kind !== 'pendulum') throw Error('wrong fixture');
    const d = effective(raw, 'fixer'), valid = solutionState(d, 'fixer');
    expect(pendulumSolved(d, { ...valid, pushed: false })).toBe(false);
    for (const n of [0, 10, 5.5, NaN]) expect(pendulumSolved(d, { ...valid, notches: { a: n, b: n } })).toBe(false);
    expect(pendulumSolved(d, { ...valid, notches: { a: 4, b: 4 } })).toBe(false);
  });
});
