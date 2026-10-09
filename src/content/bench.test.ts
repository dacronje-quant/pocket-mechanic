import { describe, expect, it } from 'vitest';
import { canPlaceBenchGear, CARDS, cardSolved, decodeBench, encodeBench, runBench, type BenchState } from './bench';

describe('Contraption Cards', () => {
  it('has 30 cards with unique ids', () => {
    expect(CARDS.length).toBe(30);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(30);
  });

  for (const card of CARDS) {
    it(`${card.id} ${card.title}: the solution can be built and works; the empty board does not`, () => {
      const empty: BenchState = { gadgets: card.gadgets, gears: [] };
      expect(cardSolved(card, empty)).toBe(false);
      const s: BenchState = { gadgets: card.gadgets, gears: [] };
      for (const g of card.solution) {
        expect(canPlaceBenchGear(s, g), `${card.id}: gear on peg ${g.peg}`).toBe(true);
        s.gears.push(g);
      }
      expect(cardSolved(card, s)).toBe(true);
      expect(card.solution.length).toBeGreaterThanOrEqual(card.par);
    });
  }
});

describe('bench', () => {
  it('jams when two sources fight', () => {
    const s: BenchState = {
      gadgets: [
        { id: 'a', kind: 'crank', peg: 9 },
        { id: 'b', kind: 'motor', peg: 10 },
      ],
      gears: [
        { peg: 9, layer: 0, teeth: 20 },
        { peg: 10, layer: 0, teeth: 20 },
      ],
    };
    expect(runBench(s).jammed).toBe(true);
  });

  it('Contraption Codes round-trip and reject typos', () => {
    const s: BenchState = { gadgets: CARDS[10].gadgets.map((g, i) => ({ ...g, id: `g${i}` })), gears: CARDS[10].solution };
    const code = encodeBench(s);
    expect(decodeBench(code)).toEqual(s);
    const typo = code.slice(0, 2) + (code[2] === '0' ? '1' : '0') + code.slice(3);
    expect(decodeBench(typo)).toBeNull();
  });
});
