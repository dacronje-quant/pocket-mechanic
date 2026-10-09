/**
 * Logic & programming (GDD §8.9, Appendix C). Gates are physical things in the
 * game ("Both" door, "Either" chute, "Flip" seesaw, "Remember" ratchet); here
 * they are plain boolean nodes.
 */

export type GateType = 'AND' | 'OR' | 'NOT' | 'LATCH';

export interface LogicNode {
  id: string;
  kind: 'input' | 'gate' | 'output';
  gate?: GateType;
  /** Source node ids, in order. LATCH: [set, reset?]. NOT: [a]. */
  inputs?: string[];
}

export function gateValue(gate: GateType, ins: boolean[], latched = false): boolean {
  switch (gate) {
    case 'AND':
      return ins.length > 0 && ins.every(Boolean);
    case 'OR':
      return ins.some(Boolean);
    case 'NOT':
      return !ins[0];
    case 'LATCH':
      if (ins[1]) return false;
      return latched || !!ins[0];
  }
}

/**
 * Evaluate every node. `gates` overrides the gate type per node (for slots the
 * player fills); a node with no gate yet outputs false. `latches` holds the
 * remembered value of each LATCH and is updated in place.
 */
export function evaluate(
  nodes: LogicNode[],
  inputs: Record<string, boolean>,
  gates: Record<string, GateType | undefined> = {},
  latches: Record<string, boolean> = {},
): Record<string, boolean> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const val: Record<string, boolean> = {};
  const visiting = new Set<string>();
  const get = (id: string): boolean => {
    if (id in val) return val[id];
    const n = byId.get(id);
    if (!n || visiting.has(id)) return false;
    visiting.add(id);
    let v = false;
    if (n.kind === 'input') v = !!inputs[id];
    else if (n.kind === 'output') v = n.inputs?.length ? get(n.inputs[0]) : false;
    else {
      const g = gates[id] ?? n.gate;
      const ins = (n.inputs ?? []).map(get);
      if (g) {
        v = gateValue(g, ins, !!latches[id]);
        if (g === 'LATCH') latches[id] = v;
      }
    }
    visiting.delete(id);
    val[id] = v;
    return v;
  };
  for (const n of nodes) get(n.id);
  return val;
}

// ── tiny boolean expressions for puzzle goals: names, & | ! and parentheses ──

export function evalExpr(expr: string, vars: Record<string, boolean>): boolean {
  const toks = expr.match(/[A-Za-z_]\w*|[&|!()]/g) ?? [];
  let i = 0;
  const peek = () => toks[i];
  const next = () => toks[i++];
  const atom = (): boolean => {
    const t = next();
    if (t === '!') return !atom();
    if (t === '(') {
      const v = or();
      next();
      return v;
    }
    return !!vars[t];
  };
  const and = (): boolean => {
    let v = atom();
    while (peek() === '&') {
      next();
      const r = atom();
      v = v && r;
    }
    return v;
  };
  const or = (): boolean => {
    let v = and();
    while (peek() === '|') {
      next();
      const r = and();
      v = v || r;
    }
    return v;
  };
  return or();
}

/** Every on/off combination of the given inputs. */
export function allCases(ids: string[]): Array<Record<string, boolean>> {
  const out: Array<Record<string, boolean>> = [];
  for (let m = 0; m < 1 << ids.length; m++) {
    const c: Record<string, boolean> = {};
    ids.forEach((id, k) => (c[id] = !!(m & (1 << k))));
    out.push(c);
  }
  return out;
}

/** Does the circuit's output match the goal expression for every input combination? */
export function matchesTruth(
  nodes: LogicNode[],
  gates: Record<string, GateType | undefined>,
  outputId: string,
  goal: string,
): boolean {
  const ins = nodes.filter((n) => n.kind === 'input').map((n) => n.id);
  return allCases(ins).every((c) => evaluate(nodes, c, gates)[outputId] === evalExpr(goal, c));
}
