/**
 * Light & lenses (GDD §8.10): beams travel in straight lines across a grid,
 * bounce off mirrors, split in prisms, take colour from filters and get
 * focused by lenses. Sensors wake up when the right beam reaches them.
 *
 * Tokens: <letter><rot><flags>[=<solution>][@id]
 *   . floor   # wall   _ empty slot
 *   A lamp (rot = direction it shines: 0 N, 1 E, 2 S, 3 W)
 *   R mirror (rot 0 = "/", rot 1 = "\")
 *   P prism (white light in → red straight on, green turned left, blue turned right)
 *   N lens (focuses the beam)
 *   Fr / Fg / Fb colour filter (the colour letter is a flag)
 *   D sensor; colour flags w/r/g/b (default: any colour), f = needs focused light
 * Flags: r rotatable (mirrors flip / and \), ! required (sensors default to required)
 */

export type Color = 'w' | 'r' | 'g' | 'b';
export type LightKind = '#' | '_' | 'A' | 'R' | 'P' | 'N' | 'F' | 'D';

export interface LightTile {
  kind: LightKind;
  rot: number;
  rotatable: boolean;
  slot: boolean;
  color?: Color; // filter colour, or the colour a sensor wants (undefined = any)
  focused?: boolean; // sensor needs focused light
  id?: string;
  sol?: { kind?: LightKind; rot?: number; color?: Color };
}

export interface LightGrid {
  cols: number;
  rows: number;
  cells: Array<LightTile | null>;
}

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const TOK = /^([.#_ARPNFD])([0-3])?([rwgbf]*)(?:=([ARPNF])?([0-3])?([rgb])?)?(?:@(\w+))?$/;

export function parseLightTile(tok: string): LightTile | null {
  const m = TOK.exec(tok);
  if (!m) throw new Error(`Bad light token "${tok}"`);
  const [, k, rot, flags = '', sk, sr, sc, id] = m;
  if (k === '.') return null;
  const col = (['w', 'r', 'g', 'b'] as Color[]).find((c) => flags.includes(c));
  const t: LightTile = {
    kind: k as LightKind,
    rot: rot ? Number(rot) : 0,
    rotatable: flags.includes('r'),
    slot: k === '_',
    id,
  };
  if (k === 'F') t.color = col ?? 'r';
  if (k === 'D') {
    t.color = col;
    t.focused = flags.includes('f');
  }
  if (sk || sr || sc) t.sol = { kind: sk as LightKind | undefined, rot: sr ? Number(sr) : undefined, color: sc as Color | undefined };
  return t;
}

export function parseLightGrid(rows: string[]): LightGrid {
  const tokens = rows.map((r) => r.trim().split(/\s+/));
  const cols = Math.max(...tokens.map((r) => r.length));
  const cells: Array<LightTile | null> = [];
  for (const row of tokens) for (let x = 0; x < cols; x++) cells.push(row[x] ? parseLightTile(row[x]) : null);
  return { cols, rows: tokens.length, cells };
}

export function cloneLight(g: LightGrid): LightGrid {
  return { ...g, cells: g.cells.map((c) => (c ? { ...c, sol: c.sol ? { ...c.sol } : undefined } : null)) };
}

export function applyLightSolution(g: LightGrid): LightGrid {
  const out = cloneLight(g);
  for (const t of out.cells) {
    if (!t?.sol) continue;
    if (t.sol.kind) {
      t.kind = t.sol.kind;
      t.slot = true;
    }
    if (t.sol.rot !== undefined) t.rot = t.sol.rot;
    if (t.sol.color) t.color = t.sol.color;
  }
  return out;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: Color;
  focused: boolean;
}

export interface LightResult {
  segments: Segment[]; // in cell coordinates (cell centres)
  lit: Map<number, { color: Color; focused: boolean }[]>; // sensor cell -> beams received
  satisfied: Set<number>;
  success: boolean;
}

function reflect(dir: number, rot: number): number {
  // "/" : N<->E, S<->W     "\" : N<->W, S<->E
  if (rot % 2 === 0) return [1, 0, 3, 2][dir];
  return [3, 2, 1, 0][dir];
}

export function traceLight(g: LightGrid): LightResult {
  const segments: Segment[] = [];
  const lit = new Map<number, { color: Color; focused: boolean }[]>();
  const seen = new Set<string>();
  type Beam = { x: number; y: number; dir: number; color: Color; focused: boolean };
  const queue: Beam[] = [];
  g.cells.forEach((t, i) => {
    if (t?.kind === 'A') queue.push({ x: i % g.cols, y: Math.floor(i / g.cols), dir: t.rot, color: 'w', focused: false });
  });

  let guard = 0;
  while (queue.length && guard++ < 2000) {
    const b = queue.shift()!;
    let { x, y, dir, color, focused } = b;
    const sx = x;
    const sy = y;
    // walk until something interacts
    for (;;) {
      const nx = x + DX[dir];
      const ny = y + DY[dir];
      if (nx < 0 || ny < 0 || nx >= g.cols || ny >= g.rows) {
        segments.push({ x1: sx, y1: sy, x2: x + DX[dir] * 0.5, y2: y + DY[dir] * 0.5, color, focused });
        break;
      }
      const i = ny * g.cols + nx;
      const t = g.cells[i];
      const key = `${nx},${ny},${dir},${color},${focused}`;
      if (seen.has(key)) {
        segments.push({ x1: sx, y1: sy, x2: nx, y2: ny, color, focused });
        break;
      }
      seen.add(key);
      x = nx;
      y = ny;
      if (!t || t.kind === '_') continue; // open floor / empty slot: light passes
      if (t.kind === '#' || t.kind === 'A') {
        segments.push({ x1: sx, y1: sy, x2: x - DX[dir] * 0.5, y2: y - DY[dir] * 0.5, color, focused });
        break;
      }
      segments.push({ x1: sx, y1: sy, x2: x, y2: y, color, focused });
      if (t.kind === 'D') {
        const list = lit.get(i) ?? [];
        list.push({ color, focused });
        lit.set(i, list);
        break;
      }
      if (t.kind === 'R') {
        queue.push({ x, y, dir: reflect(dir, t.rot), color, focused });
        break;
      }
      if (t.kind === 'N') {
        queue.push({ x, y, dir, color, focused: true });
        break;
      }
      if (t.kind === 'F') {
        if (color === 'w' || color === t.color) queue.push({ x, y, dir, color: t.color!, focused });
        break;
      }
      if (t.kind === 'P') {
        if (color === 'w') {
          queue.push({ x, y, dir, color: 'r', focused });
          queue.push({ x, y, dir: (dir + 3) % 4, color: 'g', focused });
          queue.push({ x, y, dir: (dir + 1) % 4, color: 'b', focused });
        } else queue.push({ x, y, dir, color, focused });
        break;
      }
    }
  }

  const satisfied = new Set<number>();
  let success = true;
  let anySensor = false;
  g.cells.forEach((t, i) => {
    if (t?.kind !== 'D') return;
    anySensor = true;
    const beams = lit.get(i) ?? [];
    const ok = beams.some((b) => (!t.color || t.color === b.color) && (!t.focused || b.focused));
    if (ok) satisfied.add(i);
    else success = false;
  });
  return { segments, lit, satisfied, success: success && anySensor };
}
