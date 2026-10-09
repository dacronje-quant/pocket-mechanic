import { describe, expect, it } from 'vitest';
import { fewestWheels, leverSucceeds, leverTilt, pulleyLifts } from './balance';
import { bestPhase, bumps, camMatches, followerPattern } from './cams';
import { cardsSucceed, matchingPrefix, runCards, type Card } from './cards';
import { chainScore, runChain, solvedPlacement, type ChainLink } from './chain';
import { inSync, notchTempo, period, tempoMatches } from './pendulum';
import { pinKey, pinProgress, pinsMatch, stepsToNotes } from './pins';
import { hashString, mulberry32 } from './rng';
import { allTuned, clarity, dialTuned } from './tune';

describe('punch cards', () => {
  it('runs a plain sequence', () => {
    const rack: Card[] = [
      { type: 'move', move: 'stepL' },
      { type: 'move', move: 'stepR' },
      { type: 'move', move: 'spin' },
      { type: 'move', move: 'clap' },
    ];
    expect(runCards(rack)).toEqual(['stepL', 'stepR', 'spin', 'clap']);
  });

  it('Repeat cards loop the next cards; empty slots are skipped', () => {
    const rack: Array<Card | null> = [{ type: 'repeat', times: 3 }, null, { type: 'move', move: 'clap' }, { type: 'move', move: 'spin' }];
    expect(runCards(rack)).toEqual(['clap', 'clap', 'clap', 'spin']);
    const span: Card[] = [{ type: 'repeat', times: 2, span: 2 }, { type: 'move', move: 'stepL' }, { type: 'move', move: 'stepR' }];
    expect(runCards(span)).toEqual(['stepL', 'stepR', 'stepL', 'stepR']);
  });

  it('nested repeats multiply', () => {
    const rack: Card[] = [{ type: 'repeat', times: 2 }, { type: 'repeat', times: 3 }, { type: 'move', move: 'jump' }];
    expect(runCards(rack)).toHaveLength(6);
  });

  it('sensor cards branch on the music', () => {
    const rack: Card[] = [{ type: 'repeat', times: 3 }, { type: 'if', sensor: 'fast', then: 'spin', else: 'wave' }];
    expect(runCards(rack, { fast: [1] })).toEqual(['wave', 'spin', 'wave']);
    expect(cardsSucceed(rack, [{ sensors: { fast: true }, moves: ['spin', 'spin', 'spin'] }, { moves: ['wave', 'wave', 'wave'] }])).toBe(true);
  });

  it('slot limit and runaway loops', () => {
    const rack: Card[] = [{ type: 'repeat', times: 999 }, { type: 'move', move: 'clap' }];
    expect(runCards(rack).length).toBe(64);
    expect(cardsSucceed([{ type: 'move', move: 'clap' }, { type: 'move', move: 'clap' }], [{ moves: ['clap', 'clap'] }], 1)).toBe(false);
    expect(matchingPrefix(['clap', 'spin'], ['clap', 'wave'])).toBe(1);
  });
});

describe('cams', () => {
  it('a heart cam lifts the follower twice per turn', () => {
    expect(bumps(followerPattern('heart'))).toBe(2);
    expect(bumps(followerPattern('star'))).toBe(4);
    expect(bumps(followerPattern('round'))).toBe(0);
  });

  it('turning the cam on its shaft shifts the timing', () => {
    const target = followerPattern('egg', 3);
    expect(camMatches('egg', 0, target, true)).toBe(false);
    expect(camMatches('egg', 0, target, false)).toBe(true);
    expect(camMatches('egg', bestPhase('egg', target), target, true)).toBe(true);
    expect(camMatches('pear', 0, target, false)).toBe(false);
  });
});

describe('levers and pulleys', () => {
  it('moving the fulcrum lets a small weight lift a big one', () => {
    const ws = [
      { id: 'load', pos: -4, mass: 6 },
      { id: 'kip', pos: 4, mass: 1 },
    ];
    expect(leverSucceeds(ws, 0, { kind: 'lift', side: 'left' })).toBe(false);
    expect(leverSucceeds(ws, -3, { kind: 'lift', side: 'left' })).toBe(true);
    expect(leverTilt([{ id: 'a', pos: -2, mass: 6 }, { id: 'b', pos: 3, mass: 4 }], 0)).toBe(0);
  });

  it('more rope strands make heavy things light', () => {
    expect(pulleyLifts(4, 1, 1)).toBe(false);
    expect(pulleyLifts(4, 4, 1)).toBe(true);
    expect(fewestWheels(5, 2)).toBe(3);
  });
});

describe('pendulums', () => {
  it('longer swings slower; length sets the beat, not weight', () => {
    expect(period(1)).toBeCloseTo(2.006, 2);
    expect(notchTempo(2)).toBeGreaterThan(notchTempo(8));
    expect(tempoMatches(5, notchTempo(5))).toBe(true);
    expect(tempoMatches(4, notchTempo(6))).toBe(false);
    expect(inSync(3, 3)).toBe(true);
  });
});

describe('tuning', () => {
  it('dials match within tolerance', () => {
    expect(dialTuned(0.52, 0.5, 0.03)).toBe(true);
    expect(allTuned([{ id: 'a', value: 0.1, target: 0.5, tol: 0.03 }])).toBe(false);
    expect(clarity(0.5, 0.5, 0.03)).toBe(1);
    expect(clarity(0.0, 0.5, 0.03)).toBe(0);
  });
});

describe('chain reactions', () => {
  const links: ChainLink[] = [{ part: 'hourwheel' }, { slot: true, sol: 'cam' }, { part: 'lever' }, { slot: true, sol: 'ropelift' }, { part: 'bell' }];

  it('the signal stops at a gap and at a part that cannot use it', () => {
    expect(runChain(links, {}).reached).toBe(1);
    expect(runChain(links, { 1: 'dynamo' }).stop).toBe('mismatch');
    expect(runChain(links, solvedPlacement(links)).ok).toBe(true);
  });

  it('scores steps and systems', () => {
    expect(chainScore(links, solvedPlacement(links))).toEqual({ steps: 5, systems: 3 });
  });
});

describe('pins', () => {
  it('the melody needs exactly its pins', () => {
    const mel: Array<[number, number]> = [
      [0, 0],
      [1, 2],
      [2, 4],
    ];
    const placed = new Set([pinKey(0, 0), pinKey(1, 2)]);
    expect(pinsMatch(placed, mel)).toBe(false);
    placed.add(pinKey(2, 4));
    expect(pinsMatch(placed, mel)).toBe(true);
    placed.add(pinKey(3, 1));
    expect(pinsMatch(placed, mel)).toBe(false);
    expect(pinProgress(placed, mel)).toEqual({ right: 3, extra: 1, total: 3 });
    expect(stepsToNotes(placed, 4)[2]).toEqual([4]);
  });
});

describe('rng', () => {
  it('is deterministic', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(hashString('attic')).toBe(hashString('attic'));
  });
});
