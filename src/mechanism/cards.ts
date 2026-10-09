/**
 * Punch-card programming for Big Bertie (GDD §8.9, Appendix C).
 *
 * A program is a rack of card slots. Each card is one of:
 *   - a move card: Bertie does one dance move (sequence)
 *   - a Repeat card: runs the next `span` cards `times` times (loops)
 *   - a Sensor card: "if <sensor> do A, otherwise B" (conditionals)
 * Empty slots are skipped. Pure and deterministic.
 */

export type Move = 'stepL' | 'stepR' | 'spin' | 'clap' | 'wave' | 'jump';
export const MOVES: Move[] = ['stepL', 'stepR', 'spin', 'clap', 'wave', 'jump'];

export type Card =
  | { type: 'move'; move: Move }
  | { type: 'repeat'; times: number; span?: number }
  | { type: 'if'; sensor: string; then: Move; else?: Move };

/** Sensors can be constant or switch on for a list of beats (0-based move count). */
export type SensorTimeline = Record<string, boolean | number[]>;

export interface Scenario {
  sensors?: SensorTimeline;
  moves: Move[];
}

type Node = { card: Card; body?: Node[] };

/** Group cards into a tree: a Repeat card owns the next `span` nodes (which may be Repeats themselves). */
function parse(cards: Card[], start: number, count: number): { nodes: Node[]; next: number } {
  const nodes: Node[] = [];
  let i = start;
  while (i < cards.length && nodes.length < count) {
    const card = cards[i++];
    if (card.type === 'repeat') {
      const inner = parse(cards, i, Math.max(1, card.span ?? 1));
      i = inner.next;
      nodes.push({ card, body: inner.nodes });
    } else nodes.push({ card });
  }
  return { nodes, next: i };
}

export function sensorOn(t: SensorTimeline | undefined, name: string, beat: number): boolean {
  const v = t?.[name];
  if (v === undefined) return false;
  if (typeof v === 'boolean') return v;
  return v.includes(beat);
}

/** Run the rack and return the dance Bertie performs. `limit` stops runaway loops. */
export function runCards(rack: Array<Card | null | undefined>, sensors?: SensorTimeline, limit = 64): Move[] {
  const cards = rack.filter((c): c is Card => !!c);
  const { nodes } = parse(cards, 0, Infinity);
  const out: Move[] = [];
  const exec = (list: Node[]) => {
    for (const n of list) {
      if (out.length >= limit) return;
      const c = n.card;
      if (c.type === 'move') out.push(c.move);
      else if (c.type === 'if') {
        const m = sensorOn(sensors, c.sensor, out.length) ? c.then : c.else;
        if (m) out.push(m);
      } else {
        for (let k = 0; k < Math.max(0, c.times) && out.length < limit; k++) exec(n.body ?? []);
      }
    }
  };
  exec(nodes);
  return out;
}

export function sameDance(a: Move[], b: Move[]): boolean {
  return a.length === b.length && a.every((m, i) => m === b[i]);
}

/** Does the rack perform the target dance in every scenario (and fit in the slots)? */
export function cardsSucceed(rack: Array<Card | null | undefined>, scenarios: Scenario[], slots = Infinity): boolean {
  if (rack.filter(Boolean).length > slots) return false;
  return scenarios.every((s) => sameDance(runCards(rack, s.sensors), s.moves));
}

/** How many beats of the target are already right, from the start (for the "almost!" feedback). */
export function matchingPrefix(performed: Move[], target: Move[]): number {
  let k = 0;
  while (k < performed.length && k < target.length && performed[k] === target[k]) k++;
  return k;
}

export function cardKey(c: Card): string {
  if (c.type === 'move') return c.move;
  if (c.type === 'repeat') return `x${c.times}${c.span && c.span > 1 ? `:${c.span}` : ''}`;
  return `if-${c.sensor}-${c.then}-${c.else ?? ''}`;
}
