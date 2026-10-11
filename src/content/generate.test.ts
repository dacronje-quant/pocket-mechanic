import { describe, expect, it } from 'vitest';
import { generateRoom, type GenKind } from './generate';
import { effective, initialState, isSolved, solutionState } from '../rules';
import { parseLightGrid } from '../mechanism/light';

const KINDS: GenKind[] = ['gear', 'pipes', 'circuit', 'tracks', 'light', 'logic'];

describe('attic generators', () => {
  for (const kind of KINDS) {
    it(`${kind} rooms are solvable by construction, for many seeds and every Play Style`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        const def = generateRoom(kind, seed * 7919, { id: `t-${kind}-${seed}`, title: 'test' });
        for (const style of ['tinker', 'fixer', 'engineer'] as const) {
          const eff = effective(def, style);
          expect(isSolved(eff as never, solutionState(eff as never, style), style), `${kind} ${seed} ${style}`).toBe(true);
          expect(isSolved(eff as never, initialState(eff as never), style), `${kind} ${seed} ${style} starts solved`).toBe(false);
        }
      }
    });
  }

  it('is deterministic', () => {
    expect(generateRoom('pipes', 5, { id: 'a', title: 'a' })).toEqual(generateRoom('pipes', 5, { id: 'a', title: 'a' }));
  });

  it('generated light instructions explain the actual sensor requirements', () => {
    const variants = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const def = generateRoom('light', seed * 7919, { id: `light-${seed}`, title: 'test' });
      if (def.kind !== 'light') throw new Error('Expected a light room');
      const sensor = parseLightGrid(def.grid).cells.find(t => t?.kind === 'D')!;
      const words = [def.intro, ...def.hints].join(' ');
      if (sensor.color === 'g') {
        variants.add('colour'); expect(words).toContain('green filter');
      } else if (sensor.focused) {
        variants.add('focus'); expect(words).toContain('lens'); expect(words).toContain('ringed sensor');
      } else variants.add('plain');
    }
    expect([...variants].sort()).toEqual(['colour', 'focus', 'plain']);
  });
});
