/** Serialising grids back to room tokens (used when a room is simplified for Little Tinkers). */
import type { Grid, Tile } from '../mechanism/flow';
import type { LightGrid, LightTile } from '../mechanism/light';

export function tileToken(t: Tile | null): string {
  if (!t) return '.';
  let s = t.kind + String(t.rot);
  if (t.rotatable) s += 'r';
  if (t.toggle) s += 't';
  if (t.state) s += 's';
  if (t.required) s += '!';
  if (t.forbidden) s += 'x';
  if (t.bright) s += 'b';
  if (t.sol) {
    s += '=';
    if (t.sol.kind) s += t.sol.kind;
    if (t.sol.rot !== undefined) s += String(t.sol.rot);
    if (t.sol.state !== undefined) s += t.sol.state ? 's' : 'u';
  }
  if (t.id) s += '@' + t.id;
  return s;
}

export function gridToRows(g: Grid): string[] {
  const rows: string[] = [];
  for (let y = 0; y < g.rows; y++) {
    const toks: string[] = [];
    for (let x = 0; x < g.cols; x++) toks.push(tileToken(g.cells[y * g.cols + x]));
    rows.push(toks.join(' '));
  }
  return rows;
}

export function lightTileToken(t: LightTile | null): string {
  if (!t) return '.';
  let s = t.kind + String(t.rot);
  if (t.rotatable) s += 'r';
  if (t.kind === 'F' && t.color) s += t.color;
  if (t.kind === 'D') {
    if (t.color) s += t.color;
    if (t.focused) s += 'f';
  }
  if (t.sol) {
    s += '=';
    if (t.sol.kind) s += t.sol.kind;
    if (t.sol.rot !== undefined) s += String(t.sol.rot);
    if (t.sol.color) s += t.sol.color;
  }
  if (t.id) s += '@' + t.id;
  return s;
}

export function lightToRows(g: LightGrid): string[] {
  const rows: string[] = [];
  for (let y = 0; y < g.rows; y++) {
    const toks: string[] = [];
    for (let x = 0; x < g.cols; x++) toks.push(lightTileToken(g.cells[y * g.cols + x]));
    rows.push(toks.join(' '));
  }
  return rows;
}
