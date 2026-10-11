import { describe, expect, it } from 'vitest';
import { applySolution, parseGrid, simulateTrains, solveCircuit, solvePipes, trainsSucceed } from './flow';
import { applyLightSolution, parseLightGrid, traceLight } from './light';
import { evalExpr, evaluate, matchesTruth, LogicNode } from './logic';

describe('pipes', () => {
  it('water reaches the cup once the missing corner is placed', () => {
    const g = parseGrid(['W1 I1 _=L2', '.  .  K0!']);
    expect(solvePipes(g).success).toBe(false);
    expect(solvePipes(applySolution(g)).success).toBe(true);
  });

  it('a closed valve stops the flow; a forbidden tank must stay dry', () => {
    const g = parseGrid(['W1 V1t=s K3!', '.  .  .']);
    expect(solvePipes(g).success).toBe(false);
    expect(solvePipes(applySolution(g)).success).toBe(true);
    const h = parseGrid(['W1 K3x']);
    expect(solvePipes(h).success).toBe(false);
  });

  it('reports leaks at open pipe ends', () => {
    const g = parseGrid(['W1 I1 I1']);
    expect(solvePipes(g).leaks.length).toBe(1);
  });
});

describe('circuits', () => {
  // battery on the left (+ up, - down), bulb on the right: a complete loop
  const loop = ['L1 I1 L2', 'B0 .  O0!', 'L0 I1 L3'];

  it('a complete loop lights the bulb', () => {
    const r = solveCircuit(parseGrid(loop));
    expect(r.success).toBe(true);
    expect(r.components[0].level).toBeCloseTo(1);
  });

  it('a gap in the loop leaves it dark', () => {
    const r = solveCircuit(parseGrid(['L1 _=I1 L2', 'B0 . O0!', 'L0 I1 L3']));
    expect(r.success).toBe(false);
    expect(solveCircuit(applySolution(parseGrid(['L1 _=I1 L2', 'B0 . O0!', 'L0 I1 L3']))).success).toBe(true);
  });

  it('two bulbs in series are dim, in parallel are bright', () => {
    const series = solveCircuit(parseGrid(['L1 O1 L2', 'B0 .  O0', 'L0 I1 L3']));
    expect(series.components.every((c) => Math.abs(c.level - 0.5) < 1e-6)).toBe(true);
    const parallel = solveCircuit(parseGrid(['L1 T1 L2', 'B0 O0 O0', 'L0 T3 L3']));
    expect(parallel.components.every((c) => c.level > 0.99)).toBe(true);
  });

  it('a short circuit pops the Snap Link instead of anything breaking', () => {
    const r = solveCircuit(parseGrid(['L1 L2', 'B0 F0', 'L0 L3']));
    expect(r.short).toBe(true);
    expect(r.blown.length).toBe(1);
  });

  it('an open switch breaks the loop', () => {
    const g = parseGrid(['L1 V1t=s L2', 'B0 .  O0!', 'L0 I1 L3']);
    expect(solveCircuit(g).success).toBe(false);
    expect(solveCircuit(applySolution(g)).success).toBe(true);
  });
});

describe('trains', () => {
  // a little oval with a station on the far side
  const oval = ['L1 I1 L2', 'S0@t I0 P0@town', 'L0 I1 L3'];

  it('the train loops the oval and visits the station', () => {
    const runs = simulateTrains(parseGrid(oval));
    expect(runs[0].end).toBe('loop');
    expect(trainsSucceed(runs, [{ train: 't', visit: ['town'], end: 'loop' }])).toBe(true);
  });

  it('a missing track piece stops the train with a bump', () => {
    const runs = simulateTrains(parseGrid(['L1 _=I1 L2', 'S0@t I0 P0@town', 'L0 I1 L3']));
    expect(runs[0].end).toBe('bump');
  });

  it('points choose the branch', () => {
    // train heads east into the points: straight on = buffer stop, curve = down past the hill station
    const g = parseGrid(['S1@t Z1t=s E3', '.    P0@hill .', '.    E0 .']);
    expect(simulateTrains(g)[0].visits).toEqual([]);
    expect(simulateTrains(applySolution(g))[0].visits).toEqual(['hill']);
    // mirrored points curve the other way
    const m = parseGrid(['.    E2 .', '.    P0@hill .', 'S1@t Y1t=s E3']);
    expect(simulateTrains(applySolution(m))[0].visits).toEqual(['hill']);
  });

  it('two trains that meet head-on stop safely', () => {
    const runs = simulateTrains(parseGrid(['S1@a I1 I1 S3@b']));
    expect(runs.every((r) => r.end === 'crash')).toBe(true);
  });
});

describe('light', () => {
  it('red colour flags do not make sensors or filters turnable', () => {
    const g = parseLightGrid(['Dr Fr A1r R0r']);
    expect(g.cells.map(t => t?.rotatable)).toEqual([false, false, true, true]);
    expect(g.cells[0]?.color).toBe('r');
    expect(g.cells[1]?.color).toBe('r');
  });

  it('a mirror bounces the lamp onto the sensor', () => {
    const g = parseLightGrid(['A1 . _=R1', '.  . D0']);
    expect(traceLight(g).success).toBe(false);
    expect(traceLight(applyLightSolution(g)).success).toBe(true);
  });

  it('a prism splits white light into colours', () => {
    // lamp shines east into a prism: red continues east, green turns north, blue turns south
    const g = parseLightGrid(['.  .  Dg .', 'A1 .  P0 Dr', '.  .  Db .']);
    expect(traceLight(g).success).toBe(true);
  });

  it('colour and focus requirements', () => {
    expect(traceLight(parseLightGrid(['A1 F0b Db'])).success).toBe(true);
    expect(traceLight(parseLightGrid(['A1 F0b Dr'])).success).toBe(false);
    expect(traceLight(parseLightGrid(['A1 . Df'])).success).toBe(false);
    expect(traceLight(parseLightGrid(['A1 N0 Df'])).success).toBe(true);
  });
});

describe('logic', () => {
  const both: LogicNode[] = [
    { id: 'a', kind: 'input' },
    { id: 'b', kind: 'input' },
    { id: 'g', kind: 'gate', gate: 'AND', inputs: ['a', 'b'] },
    { id: 'door', kind: 'output', inputs: ['g'] },
  ];

  it('the "Both" door needs both levers', () => {
    expect(evaluate(both, { a: true, b: false }).door).toBe(false);
    expect(evaluate(both, { a: true, b: true }).door).toBe(true);
  });

  it('expressions and truth tables', () => {
    expect(evalExpr('(music & light) | clap', { music: true, light: false, clap: true })).toBe(true);
    expect(evalExpr('!a & b', { a: false, b: true })).toBe(true);
    expect(matchesTruth(both, {}, 'door', 'a & b')).toBe(true);
    expect(matchesTruth(both, { g: 'OR' }, 'door', 'a & b')).toBe(false);
  });

  it('the "Remember" latch stays on until reset', () => {
    const nodes: LogicNode[] = [
      { id: 'bell', kind: 'input' },
      { id: 'reset', kind: 'input' },
      { id: 'm', kind: 'gate', gate: 'LATCH', inputs: ['bell', 'reset'] },
      { id: 'flag', kind: 'output', inputs: ['m'] },
    ];
    const mem: Record<string, boolean> = {};
    expect(evaluate(nodes, { bell: true }, {}, mem).flag).toBe(true);
    expect(evaluate(nodes, { bell: false }, {}, mem).flag).toBe(true);
    expect(evaluate(nodes, { reset: true }, {}, mem).flag).toBe(false);
  });
});
