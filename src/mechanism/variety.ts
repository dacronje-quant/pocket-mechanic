/** Ten tactile puzzles. Pure, deterministic moves; invalid moves leave state untouched. */
import type {
  Cell, DifferenceRoomDef, Direction, JugAction, JugsRoomDef, JugsState,
  LayerPlacement, LayersRoomDef, PieceBoardDef, Placement, SlideRoomDef, SlideState,
  SortingRoomDef, SortingState, SudokuRoomDef, SymmetryRoomDef, TiltRoomDef, TiltState,
} from '../content/variety-types';

export interface SudokuState { cells: number[] }
const integer = (n: number): boolean => Number.isInteger(n);
const sameNumbers = (a: number[], b: number[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
const turnOf = (turn: number): number => ((turn % 4) + 4) % 4;

export function rotateCells(cells: Cell[], turn: number): Cell[] {
  const t = turnOf(turn);
  const points = cells.map(({ x, y }) => t === 0 ? { x, y } : t === 1 ? { x: -y, y: x } : t === 2 ? { x: -x, y: -y } : { x: y, y: -x });
  const minX = Math.min(...points.map(p => p.x)), minY = Math.min(...points.map(p => p.y));
  return points.map(p => ({ x: p.x - minX, y: p.y - minY }));
}

export function pieceCells(def: PieceBoardDef, placement: Placement): number[] | null {
  const piece = def.pieces.find(p => p.id === placement.id);
  if (!piece || !integer(placement.x) || !integer(placement.y) || !integer(placement.turn) || (!def.allowRotate && turnOf(placement.turn) !== 0)) return null;
  const cells = rotateCells(piece.cells, placement.turn).map(p => ({ x: p.x + placement.x, y: p.y + placement.y }));
  if (cells.some(p => p.x < 0 || p.x >= def.cols || p.y < 0 || p.y >= def.rows)) return null;
  const indices = cells.map(p => p.y * def.cols + p.x);
  if (new Set(indices).size !== indices.length || indices.some(at => !def.board.includes(at))) return null;
  const outline = def.outlines?.find(o => o.id === placement.id);
  if (outline && indices.some(at => !outline.cells.includes(at))) return null;
  return indices;
}

export function placePiece(def: PieceBoardDef, state: Placement[], placement: Placement): Placement[] {
  const cells = pieceCells(def, placement);
  if (!cells) return state;
  const rest = state.filter(p => p.id !== placement.id);
  if (rest.some(p => (pieceCells(def, p) ?? []).some(at => cells.includes(at)))) return state;
  const before = state.find(p => p.id === placement.id);
  if (before && before.x === placement.x && before.y === placement.y && turnOf(before.turn) === turnOf(placement.turn)) return state;
  return [...rest, { ...placement, turn: turnOf(placement.turn) }];
}

export function removePiece(state: Placement[], id: string): Placement[] {
  return state.some(p => p.id === id) ? state.filter(p => p.id !== id) : state;
}

export function piecesSolved(def: PieceBoardDef, state: Placement[]): boolean {
  if (state.length !== def.pieces.length || new Set(state.map(p => p.id)).size !== def.pieces.length) return false;
  const covered: number[] = [];
  for (const p of state) {
    const cells = pieceCells(def, p);
    if (!cells || cells.some(at => covered.includes(at))) return false;
    covered.push(...cells);
  }
  return covered.length === def.board.length && def.board.every(at => covered.includes(at));
}

/** Counts genuinely different placements, ignoring duplicate rotations of symmetric pieces. */
export function countPackingSolutions(def: PieceBoardDef, limit = 2): number {
  const options = def.pieces.map(piece => {
    const found = new Map<string, { p: Placement; cells: number[] }>();
    for (let turn = 0; turn < (def.allowRotate ? 4 : 1); turn++) for (let y = 0; y < def.rows; y++) for (let x = 0; x < def.cols; x++) {
      const p = { id: piece.id, x, y, turn }, cells = pieceCells(def, p);
      if (cells) found.set([...cells].sort((a, b) => a - b).join(','), { p, cells });
    }
    return [...found.values()];
  });
  let count = 0;
  const search = (used: Set<number>, placed: Set<number>): void => {
    if (count >= limit) return;
    if (placed.size === def.pieces.length) { if (used.size === def.board.length) count++; return; }
    let best: Array<{ piece: number; cells: number[] }> | undefined;
    for (const at of def.board) if (!used.has(at)) {
      const candidates: Array<{ piece: number; cells: number[] }> = [];
      options.forEach((list, piece) => { if (!placed.has(piece)) for (const o of list) if (o.cells.includes(at) && o.cells.every(n => !used.has(n))) candidates.push({ piece, cells: o.cells }); });
      if (!best || candidates.length < best.length) best = candidates;
      if (!candidates.length) return;
    }
    for (const o of best ?? []) search(new Set([...used, ...o.cells]), new Set([...placed, o.piece]));
  };
  search(new Set(), new Set());
  return count;
}

export function slideSolved(def: SlideRoomDef, state: SlideState): boolean {
  return state.tiles.length === def.size * def.size && state.tiles.every((value, at) => value === (at + 1) % state.tiles.length);
}

export function slideMove(def: SlideRoomDef, state: SlideState, at: number): SlideState {
  const blank = state.tiles.indexOf(0), size = def.size;
  if (!integer(at) || at < 0 || at >= state.tiles.length || blank < 0 || Math.abs(at % size - blank % size) + Math.abs(Math.floor(at / size) - Math.floor(blank / size)) !== 1) return state;
  const tiles = [...state.tiles]; [tiles[blank], tiles[at]] = [tiles[at], 0];
  return { tiles, moves: state.moves + 1 };
}

const slideDistance = (tiles: number[], size: number): number => tiles.reduce((n, value, at) => value === 0 ? n : n + Math.abs(at % size - (value - 1) % size) + Math.abs(Math.floor(at / size) - Math.floor((value - 1) / size)), 0);
/** A* returns a legal next move even after the player wanders off the authored route. */
export function slideHint(def: SlideRoomDef, state: SlideState): number | null {
  if (slideSolved(def, state)) return null;
  type Node = { tiles: number[]; g: number; f: number; first: number; serial: number };
  const heap: Node[] = [], visited = new Map<string, number>(); let serial = 0;
  const push = (n: Node): void => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = Math.floor((i - 1) / 2); if (heap[p].f < n.f || (heap[p].f === n.f && heap[p].serial < n.serial)) break; heap[i] = heap[p]; i = p; } heap[i] = n; };
  const pop = (): Node => { const root = heap[0], last = heap.pop()!; if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let child = i * 2 + 1; if (child + 1 < heap.length && heap[child + 1].f < heap[child].f) child++; if (heap[child].f >= last.f) break; heap[i] = heap[child]; i = child; } heap[i] = last; } return root; };
  push({ tiles: [...state.tiles], g: 0, f: slideDistance(state.tiles, def.size), first: -1, serial: serial++ });
  for (let expanded = 0; heap.length && expanded < 150000; expanded++) {
    const node = pop(), key = node.tiles.join(',');
    if ((visited.get(key) ?? Infinity) <= node.g) continue;
    visited.set(key, node.g);
    if (slideSolved(def, { tiles: node.tiles, moves: 0 })) return node.first;
    const blank = node.tiles.indexOf(0);
    for (const at of [blank - def.size, blank + 1, blank + def.size, blank - 1]) {
      const next = slideMove(def, { tiles: node.tiles, moves: 0 }, at);
      if (next.tiles === node.tiles) continue;
      const g = node.g + 1;
      if ((visited.get(next.tiles.join(',')) ?? Infinity) > g) push({ tiles: next.tiles, g, f: g + slideDistance(next.tiles, def.size), first: node.first < 0 ? at : node.first, serial: serial++ });
    }
  }
  return null;
}

export function symmetrySet(def: SymmetryRoomDef, state: Record<number, string>, at: number, token: string): Record<number, string> {
  if (!integer(at) || at < 0 || at >= def.size * def.size || def.seeds.some(p => p.at === at) || (token !== '' && !def.palette.includes(token))) return state;
  if ((state[at] ?? '') === token) return state;
  const next = { ...state }; if (token) next[at] = token; else delete next[at]; return next;
}

export function symmetrySolved(def: SymmetryRoomDef, state: Record<number, string>): boolean {
  const target = Object.fromEntries(def.solution.map(p => [p.at, p.token]));
  return Object.keys(state).length === Object.keys(target).length && Object.entries(target).every(([at, token]) => state[Number(at)] === token) && def.seeds.every(p => state[p.at] === p.token);
}

export function sortingSwap(def: SortingRoomDef, state: SortingState, a: number, b: number): SortingState {
  if (![a, b].every(n => integer(n) && n >= 0 && n < def.items.length) || a === b || state.order.length !== def.items.length) return state;
  const order = [...state.order]; [order[a], order[b]] = [order[b], order[a]]; return { ...state, order };
}

export function sortingWeigh(def: SortingRoomDef, state: SortingState, a: string, b: string): SortingState {
  if (def.mode !== 'weight' || a === b || ![a, b].every(id => def.items.some(item => item.id === id)) || state.weighings >= (def.maxWeighings ?? Infinity)) return state;
  return { ...state, weighings: state.weighings + 1, comparison: [a, b] };
}

export function sortingSolved(def: SortingRoomDef, state: SortingState): boolean {
  if (state.order.length !== def.items.length || new Set(state.order).size !== def.items.length || state.weighings > (def.maxWeighings ?? Infinity)) return false;
  const values = state.order.map(id => def.items.find(item => item.id === id)?.[def.mode]);
  return values.every((value, i) => value !== undefined && (i === 0 || value > values[i - 1]!));
}

/** Legal comparison-sort solution; no reading the answer into the state in one assignment. */
export function sortingSolution(def: SortingRoomDef): SortingState {
  let state: SortingState = { order: def.items.map(i => i.id), weighings: 0 };
  const merge = (ids: string[]): string[] => {
    if (ids.length < 2) return ids;
    const mid = Math.floor(ids.length / 2), left = merge(ids.slice(0, mid)), right = merge(ids.slice(mid)), out: string[] = [];
    while (left.length && right.length) {
      if (def.mode === 'weight') state = sortingWeigh(def, state, left[0], right[0]);
      const a = def.items.find(i => i.id === left[0])![def.mode], b = def.items.find(i => i.id === right[0])![def.mode];
      out.push(a < b ? left.shift()! : right.shift()!);
    }
    return [...out, ...left, ...right];
  };
  const answer = merge([...state.order]);
  answer.forEach((id, at) => { state = sortingSwap(def, state, at, state.order.indexOf(id)); });
  return state;
}

export function sudokuCandidates(def: SudokuRoomDef, state: SudokuState, at: number): number[] {
  if (!integer(at) || at < 0 || at >= def.size * def.size || def.givens[at] !== -1) return [];
  const x = at % def.size, y = Math.floor(at / def.size), blocked = new Set<number>();
  state.cells.forEach((value, index) => { if (index === at || value < 0) return; const xx = index % def.size, yy = Math.floor(index / def.size); if (xx === x || yy === y || (def.regions && Math.floor(xx / 2) === Math.floor(x / 2) && Math.floor(yy / 2) === Math.floor(y / 2))) blocked.add(value); });
  return Array.from({ length: def.size }, (_, n) => n).filter(n => !blocked.has(n));
}

export function sudokuSet(def: SudokuRoomDef, state: SudokuState, at: number, symbol: number): SudokuState {
  if (!integer(at) || at < 0 || at >= def.size * def.size || def.givens[at] !== -1 || !integer(symbol) || symbol < -1 || symbol >= def.size || state.cells[at] === symbol) return state;
  if (symbol >= 0 && !sudokuCandidates(def, state, at).includes(symbol)) return state;
  const cells = [...state.cells]; cells[at] = symbol; return { cells };
}

export function sudokuSolved(def: SudokuRoomDef, state: SudokuState): boolean {
  if (state.cells.length !== def.size * def.size || state.cells.some((n, at) => !integer(n) || n < 0 || n >= def.size || (def.givens[at] >= 0 && n !== def.givens[at]))) return false;
  for (let i = 0; i < def.size; i++) {
    if (new Set(state.cells.slice(i * def.size, (i + 1) * def.size)).size !== def.size) return false;
    if (new Set(state.cells.filter((_, at) => at % def.size === i)).size !== def.size) return false;
  }
  if (def.regions) for (let y = 0; y < def.size; y += 2) for (let x = 0; x < def.size; x += 2) if (new Set([state.cells[y * def.size + x], state.cells[y * def.size + x + 1], state.cells[(y + 1) * def.size + x], state.cells[(y + 1) * def.size + x + 1]]).size !== 4) return false;
  return true;
}

export function countSudokuSolutions(def: SudokuRoomDef, limit = 2): number {
  let count = 0;
  const search = (state: SudokuState): void => {
    if (count >= limit) return;
    let at = -1, options: number[] = [];
    for (let i = 0; i < state.cells.length; i++) if (state.cells[i] < 0) { const c = sudokuCandidates(def, state, i); if (!c.length) return; if (at < 0 || c.length < options.length) { at = i; options = c; } }
    if (at < 0) { if (sudokuSolved(def, state)) count++; return; }
    for (const n of options) search(sudokuSet(def, state, at, n));
  };
  search({ cells: [...def.givens] }); return count;
}

export function jugMove(def: JugsRoomDef, state: JugsState, action: JugAction): JugsState {
  const valid = (at: number): boolean => integer(at) && at >= 0 && at < def.capacities.length;
  if (!integer(state.pours) || state.pours < 0 || state.pours >= (def.maxPours ?? Infinity) || state.volumes.length !== def.capacities.length || state.volumes.some((v, i) => !integer(v) || v < 0 || v > def.capacities[i])) return state;
  const volumes = [...state.volumes];
  if (action.kind === 'pour') {
    if (!valid(action.from) || !valid(action.to) || action.from === action.to) return state;
    const amount = Math.min(volumes[action.from], def.capacities[action.to] - volumes[action.to]);
    if (amount <= 0) return state;
    volumes[action.from] -= amount; volumes[action.to] += amount;
  } else {
    if (def.sealed || !valid(action.jug)) return state;
    volumes[action.jug] = action.kind === 'fill' ? def.capacities[action.jug] : 0;
  }
  return sameNumbers(volumes, state.volumes) ? state : { volumes, pours: state.pours + 1 };
}

export function jugsSolved(def: JugsRoomDef, state: JugsState): boolean {
  return state.volumes.length === def.capacities.length && state.pours <= (def.maxPours ?? Infinity) && state.volumes.every((v, i) => integer(v) && v >= 0 && v <= def.capacities[i]) && def.target.every((v, i) => v < 0 || state.volumes[i] === v);
}

function jugActions(def: JugsRoomDef): JugAction[] {
  const actions: JugAction[] = [];
  def.capacities.forEach((_, from) => { if (!def.sealed) actions.push({ kind: 'fill', jug: from }, { kind: 'empty', jug: from }); def.capacities.forEach((__, to) => { if (from !== to) actions.push({ kind: 'pour', from, to }); }); });
  return actions;
}
export function jugHint(def: JugsRoomDef, state: JugsState): JugAction | null {
  if (jugsSolved(def, state)) return null;
  const queue: Array<{ state: JugsState; first?: JugAction }> = [{ state }], seen = new Set([state.volumes.join(',')]);
  for (let q = 0; q < queue.length; q++) for (const action of jugActions(def)) {
    const current = queue[q], next = jugMove(def, current.state, action);
    if (next === current.state || seen.has(next.volumes.join(','))) continue;
    const first = current.first ?? action; if (jugsSolved(def, next)) return first;
    seen.add(next.volumes.join(',')); queue.push({ state: next, first });
  }
  return null;
}

export function tiltSolved(def: TiltRoomDef, state: TiltState): boolean {
  return state.marbles.length === def.goals.length && new Set(state.marbles).size === state.marbles.length && state.marbles.every(at => def.goals.includes(at));
}

/** Roll leading marbles first; cups hold them, holes safely return everyone to the start. */
export function tiltMove(def: TiltRoomDef, state: TiltState, direction: Direction): TiltState {
  const delta: Record<Direction, [number, number]> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  if (!delta[direction] || state.marbles.length !== def.initial.length || new Set(state.marbles).size !== state.marbles.length || state.marbles.some(at => !integer(at) || at < 0 || at >= def.cols * def.rows || def.walls.includes(at) || def.holes.includes(at))) return state;
  const [dx, dy] = delta[direction], marbles = [...state.marbles];
  const order = marbles.map((at, i) => ({ at, i })).sort((a, b) => dx ? dx * (b.at % def.cols - a.at % def.cols) : dy * (Math.floor(b.at / def.cols) - Math.floor(a.at / def.cols)));
  for (const { i } of order) {
    if (def.goals.includes(marbles[i])) continue;
    for (let step = 0; step < def.cols + def.rows; step++) {
      const x = marbles[i] % def.cols + dx, y = Math.floor(marbles[i] / def.cols) + dy, next = y * def.cols + x;
      if (x < 0 || x >= def.cols || y < 0 || y >= def.rows || def.walls.includes(next) || marbles.some((at, j) => j !== i && at === next)) break;
      if (def.holes.includes(next)) return { marbles: [...def.initial], moves: state.moves + 1 };
      marbles[i] = next; if (def.goals.includes(next)) break;
    }
  }
  return sameNumbers(marbles, state.marbles) ? state : { marbles, moves: state.moves + 1 };
}

export function tiltHint(def: TiltRoomDef, state: TiltState): Direction | null {
  if (tiltSolved(def, state)) return null;
  const queue: Array<{ state: TiltState; first?: Direction }> = [{ state }], seen = new Set([state.marbles.join(',')]);
  for (let q = 0; q < queue.length && q < 50000; q++) for (const dir of ['up', 'right', 'down', 'left'] as Direction[]) {
    const current = queue[q], next = tiltMove(def, current.state, dir), key = next.marbles.join(',');
    if (next === current.state || seen.has(key)) continue;
    const first = current.first ?? dir; if (tiltSolved(def, next)) return first;
    seen.add(key); queue.push({ state: next, first });
  }
  return null;
}

function transformedAt(at: number, size: number, p: LayerPlacement): number {
  let x = at % size, y = Math.floor(at / size); if (p.flipped) x = size - 1 - x;
  for (let turn = 0; turn < turnOf(p.turn); turn++) [x, y] = [size - 1 - y, x];
  return y * size + x;
}

export function layersSet(def: LayersRoomDef, state: LayerPlacement[], placement: LayerPlacement, index = state.length): LayerPlacement[] {
  if (!def.slides.some(s => s.id === placement.id) || !integer(placement.turn) || (!def.allowRotate && turnOf(placement.turn) !== 0) || (!def.allowFlip && placement.flipped) || !integer(index)) return state;
  const next = state.filter(p => p.id !== placement.id), at = Math.max(0, Math.min(index, next.length));
  next.splice(at, 0, { ...placement, turn: turnOf(placement.turn), flipped: !!placement.flipped });
  return JSON.stringify(next) === JSON.stringify(state) ? state : next;
}
export function layersRemove(state: LayerPlacement[], id: string): LayerPlacement[] { return state.some(p => p.id === id) ? state.filter(p => p.id !== id) : state; }

export function projectLayers(def: LayersRoomDef, state: LayerPlacement[]): Array<{ at: number; color: string }> {
  const cells = new Map<number, string>(), layers = def.orderMatters ? state : [...state].sort((a, b) => a.id.localeCompare(b.id));
  for (const p of layers) for (const cell of def.slides.find(s => s.id === p.id)?.cells ?? []) cells.set(transformedAt(cell.at, def.size, p), cell.color);
  return [...cells].sort((a, b) => a[0] - b[0]).map(([at, color]) => ({ at, color }));
}
export function layersSolved(def: LayersRoomDef, state: LayerPlacement[]): boolean {
  if (new Set(state.map(p => p.id)).size !== state.length || state.some(p => !def.slides.some(s => s.id === p.id) || !integer(p.turn) || (!def.allowRotate && turnOf(p.turn) !== 0) || (!def.allowFlip && p.flipped))) return false;
  const result = projectLayers(def, state), target = [...def.target].sort((a, b) => a.at - b.at);
  return result.length === target.length && result.every((c, i) => c.at === target[i].at && c.color === target[i].color);
}

export function differenceFind(def: DifferenceRoomDef, state: Set<number>, index: number): Set<number> {
  return integer(index) && index >= 0 && index < def.differences.length && !state.has(index) ? new Set([...state, index]) : state;
}
export function differenceSolved(def: DifferenceRoomDef, state: Set<number>): boolean { return state.size === def.differences.length && [...state].every(n => integer(n) && n >= 0 && n < def.differences.length); }
