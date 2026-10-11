import { describe, expect, it } from 'vitest';
import { leverTorque, pulleyAdvantage, pulleyEffort, pulleyLifts, fewestWheels, stepLeverMotion, type LeverMotion } from './balance';
import { effective, initialState, solutionState, balanceSolved, balanceStateValid, leverWeights, type BalanceState } from '../rules';
import { STORY_ROOMS } from '../content';
import { QUICK_FIXES } from '../content/quickfixes';
import { atticRooms } from '../content/attic';
import type { BalanceRoomDef, PlayStyleId } from '../content/types';

const rooms = [...STORY_ROOMS, ...QUICK_FIXES.map(fix => fix.room), ...atticRooms()]
  .filter((room): room is BalanceRoomDef => room.kind === 'balance');
const styles: PlayStyleId[] = ['tinker', 'fixer', 'engineer'];
const engineer = effective(rooms.find(room => room.id === '1-1')!, 'engineer');
const trial = (weights: BalanceState['weights'], fulcrum = 0): BalanceState => ({ weights, fulcrum, wheels: 0, pulled: true });

describe('buildable balance configurations', () => {
  it('keeps every authored balance solution buildable in every style', () => {
    expect(rooms.map(room => room.id)).toEqual(['1-1', '3-5', '8-1']);
    for (const room of rooms) for (const style of styles) {
      const def = effective(room, style), start = initialState(def), solution = solutionState(def, style);
      expect(balanceStateValid(def, start), `${room.id}/${style} start`).toBe(true);
      expect(balanceSolved(def, start), `${room.id}/${style} start`).toBe(false);
      expect(balanceStateValid(def, solution), `${room.id}/${style} solution`).toBe(true);
      expect(balanceSolved(def, solution), `${room.id}/${style} solution`).toBe(true);
    }
  });

  it('a Tinker pulley cannot lift before its first real wheel is fitted', () => {
    for (const room of rooms.filter(room => room.mode === 'pulley')) {
      const def = effective(room, 'tinker'), state = { ...initialState(def), pulled: true };
      expect(balanceSolved(def, state)).toBe(false);
      expect(balanceSolved(def, { ...state, wheels: 1 })).toBe(true);
    }
  });

  it('accepts another available counterweight arrangement with the same torque', () => {
    const state = trial([{ mass: 5, slot: 2 }, { mass: 2, slot: 1 }]);
    expect(leverTorque(leverWeights(engineer, state), 0)).toBe(0);
    expect(balanceSolved(engineer, state)).toBe(true);
  });

  it.each([
    ['two weights on the same peg', trial([{ mass: 1, slot: 4 }, { mass: 2, slot: 4 }])],
    ['one drawer weight used twice', trial([{ mass: 2, slot: 2 }, { mass: 2, slot: 4 }])],
    ['a mass absent from the drawer', trial([{ mass: 3, slot: 4 }])],
    ['an off-board attachment', trial([{ mass: 1, slot: 12 }])],
    ['an unavailable fulcrum move onto the load', trial([], -2)],
    ['a negative mass cancelling a real weight', trial([{ mass: -8, slot: 1 }, { mass: 5, slot: 4 }])],
  ])('rejects the false win from %s', (_reason, state) => {
    // These all have zero torque and used to win despite being unbuildable.
    expect(leverTorque(leverWeights(engineer, state), state.fulcrum)).toBe(0);
    expect(balanceStateValid(engineer, state)).toBe(false);
    expect(balanceSolved(engineer, state)).toBe(false);
  });

  it('rejects excess, fractional and nonfinite pulley assemblies', () => {
    const def = effective(rooms.find(room => room.id === '8-1')!, 'engineer');
    const solution = solutionState(def, 'engineer');
    for (const wheels of [6, 3.5, Infinity, NaN, -1]) expect(balanceSolved(def, { ...solution, wheels })).toBe(false);
  });

  it('counts a helper\'s real pull even when Kip cannot supply force', () => {
    const base = effective(rooms.find(room => room.id === '8-1')!, 'engineer');
    const def = { ...base, pulley: { ...base.pulley!, strength: 0, helper: 4 } };
    expect(balanceSolved(def, solutionState<'balance'>(def, 'engineer'))).toBe(true);
  });
});

describe('alternating fixed and movable pulley tackle', () => {
  it('bases effort on the actual supporting strands, with no force advantage from a lone redirect', () => {
    expect(pulleyAdvantage(1)).toBe(1);
    expect(pulleyEffort(12, 1)).toBe(12);
    expect(pulleyEffort(12, 3)).toBe(4);
    expect(pulleyLifts(12, 3, 4)).toBe(true);
    expect(pulleyLifts(12, 2, 4)).toBe(false);
    expect(fewestWheels(12, 4)).toBe(3);
  });

  it('an unassembled rope or impossible force cannot lift a load', () => {
    for (const wheels of [0, -1, 1.5, Infinity, NaN]) {
      expect(pulleyAdvantage(wheels)).toBe(0);
      expect(pulleyEffort(4, wheels)).toBe(Infinity);
      expect(pulleyLifts(4, wheels, 100)).toBe(false);
    }
    expect(pulleyLifts(0, 1, 1)).toBe(false);
    expect(pulleyLifts(4, 4, 0)).toBe(false);
    expect(fewestWheels(4, 0)).toBe(Infinity);
  });
});

describe('live suspended lever motion', () => {
  const leftHeavy = [{ id: 'load', pos: -4, mass: 6 }, { id: 'kip', pos: 4, mass: 1 }];
  const balanced = [{ id: 'load', pos: -2, mass: 6 }, { id: 'weight', pos: 3, mass: 4 }];
  const still: LeverMotion = { angle: 0, velocity: 0 };

  it('lowers the heavy side and responds to a fulcrum move without changing the masses', () => {
    expect(stepLeverMotion(leftHeavy, 0, still, 0.1).angle).toBeLessThan(0);
    expect(stepLeverMotion(leftHeavy, -3, still, 0.1).angle).toBeGreaterThan(0);
  });

  it('returns an exactly balanced tilted beam to level within the celebration delay', () => {
    const motion = stepLeverMotion(balanced, 0, { angle: 0.22, velocity: 0 }, 1.3);
    expect(Math.abs(motion.angle)).toBeLessThan(0.01);
    expect(Math.abs(motion.velocity)).toBeLessThan(0.04);
  });

  it('settles every buildable alternative balance without requiring the authored placement', () => {
    const L = engineer.lever!;
    let balancedCases = 0;
    const tryWeights = (at: number, weights: BalanceState['weights']) => {
      if (at === L.tray.length) {
        const state = trial(weights);
        if (!balanceSolved(engineer, state)) return;
        balancedCases++;
        const motion = stepLeverMotion(leverWeights(engineer, state), 0, { angle: -0.22, velocity: 0 }, 1.3);
        expect(Math.abs(motion.angle), JSON.stringify(weights)).toBeLessThan(0.02);
        return;
      }
      tryWeights(at + 1, weights);
      for (const slot of L.slots) {
        if (weights.some(weight => weight.slot === slot)) continue;
        tryWeights(at + 1, [...weights, { mass: L.tray[at], slot }]);
      }
    };
    tryWeights(0, []);
    expect(balancedCases).toBeGreaterThan(1);
  });

  it('stops outward motion at each physical end stop', () => {
    const left = stepLeverMotion(leftHeavy, 0, still, 1);
    const right = stepLeverMotion(leftHeavy, -3, still, 1.3);
    expect(left).toEqual({ angle: -0.22, velocity: 0 });
    expect(right).toEqual({ angle: 0.22, velocity: 0 });
  });

  it('failed balance remains tilted under its actual weights instead of springing flat', () => {
    const motion = stepLeverMotion([{ id: 'load', pos: -2, mass: 6 }], 0, still, 2);
    expect(motion.angle).toBe(-0.22);
  });

  it('uses the same stable substeps for stalled and normal frames without mutating the input', () => {
    const original = { angle: 0.18, velocity: -0.2 };
    const stalled = stepLeverMotion(balanced, 0, original, 1);
    let normal = { ...original };
    for (let i = 0; i < 60; i++) normal = stepLeverMotion(balanced, 0, normal, 1 / 60);
    expect(stalled.angle).toBeCloseTo(normal.angle, 12);
    expect(stalled.velocity).toBeCloseTo(normal.velocity, 12);
    expect(original).toEqual({ angle: 0.18, velocity: -0.2 });
  });
});
