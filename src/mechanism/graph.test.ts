import { describe, expect, it } from 'vitest';
import {
  GearNode,
  collides,
  meshPhase,
  meshedPosition,
  meshes,
  pitchRadius,
  solve,
  speedRatio,
} from './graph';

const at = (id: string, teeth: number, x: number, y: number, shaft?: string): GearNode => ({
  id,
  teeth,
  x,
  y,
  shaft,
});

function chain(...specs: Array<[string, number]>): GearNode[] {
  const out: GearNode[] = [];
  specs.forEach(([id, teeth], i) => {
    if (i === 0) out.push(at(id, teeth, 0, 0));
    else out.push({ id, teeth, ...meshedPosition(out[i - 1], teeth, 0) });
  });
  return out;
}

describe('mechanism graph', () => {
  it('meshed gears turn in opposite directions (GDD rule 1)', () => {
    const g = chain(['a', 20], ['b', 20]);
    const s = solve(g, { gearId: 'a', omega: 1 });
    expect(s.omega.get('b')).toBeCloseTo(-1);
  });

  it('small driving big is slower (10 -> 30 = 3:1)', () => {
    const g = chain(['a', 10], ['b', 30]);
    const s = solve(g, { gearId: 'a', omega: 3 });
    expect(s.omega.get('b')).toBeCloseTo(-1);
  });

  it('an idler restores direction without changing speed (rule 2)', () => {
    const g = chain(['in', 20], ['idler', 12], ['out', 20]);
    const s = solve(g, { gearId: 'in', omega: 2 });
    expect(speedRatio(s, 'in', 'out')).toBeCloseTo(1);
  });

  it('compound gears make 12:1 for clock hands (Appendix B)', () => {
    const a = at('a', 10, 0, 0);
    const b = { id: 'b', teeth: 30, ...meshedPosition(a, 30, 0), shaft: 's' };
    const c = { id: 'c', teeth: 10, x: b.x, y: b.y, shaft: 's' };
    const d = { id: 'd', teeth: 40, ...meshedPosition(c, 40, 90) };
    const s = solve([a, b, c, d], { gearId: 'a', omega: 12 });
    expect(Math.abs(s.omega.get('d')!)).toBeCloseTo(1);
    expect(s.jammed).toBe(false);
  });

  it('three gears meshed in a triangle jam', () => {
    const r = pitchRadius(20) * 2;
    const g = [at('a', 20, 0, 0), at('b', 20, r, 0), at('c', 20, r / 2, (r * Math.sqrt(3)) / 2)];
    const s = solve(g, { gearId: 'a', omega: 1 });
    expect(s.jammed).toBe(true);
    expect(s.omega.get('c')).toBe(0);
    expect(s.jamGroup.size).toBe(3);
  });

  it('an unmeshed gear gets no power', () => {
    const g = [at('a', 20, 0, 0), at('b', 12, 200, 0)];
    const s = solve(g, { gearId: 'a', omega: 1 });
    expect(s.omega.get('b')).toBe(0);
    expect(s.order).toEqual(['a']);
  });

  it('collision vs mesh vs gap', () => {
    const a = at('a', 24, 0, 0); // r = 60
    const pegX = pitchRadius(24) + pitchRadius(20); // 110
    expect(meshes(a, at('m', 20, pegX, 0))).toBe(true);
    expect(collides(a, at('L', 32, pegX, 0))).toBe(true); // too big
    expect(meshes(a, at('s', 12, pegX, 0))).toBe(false); // too small
    expect(collides(a, at('s', 12, pegX, 0))).toBe(false);
  });

  it('meshPhase interlocks teeth and stays interlocked while turning', () => {
    const a = at('a', 24, 0, 0);
    const b = { id: 'b', teeth: 16, ...meshedPosition(a, 16, 30) };
    const phaseB = meshPhase(a, 0.3, b);
    // Rotate a by d; b must rotate by -d * 24/16 and still satisfy the phase rule.
    const d = 0.77;
    const again = meshPhase(a, 0.3 + d, b);
    const diff = phaseB - (24 / 16) * d - again;
    const tooth = (Math.PI * 2) / 16;
    const k = diff / tooth;
    expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-9);
  });
});
