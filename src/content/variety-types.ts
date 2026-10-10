import type { RoomBase } from './types';

export type VarietyKind = 'shadow' | 'slide' | 'symmetry' | 'packing' | 'sorting' | 'sudoku' | 'jugs' | 'tilt' | 'layers' | 'difference';
export interface Cell { x: number; y: number }
export interface Placement { id: string; x: number; y: number; turn: number }
export interface BoardPiece { id: string; cells: Cell[]; art: string }
export interface PieceBoardDef extends RoomBase {
  kind: 'shadow' | 'packing'; cols: number; rows: number; board: number[];
  pieces: BoardPiece[]; solution: Placement[]; allowRotate: boolean;
  /** Tool silhouettes for young players; older players combine several pieces. */
  outlines?: Array<{ id: string; cells: number[] }>;
}
export interface ShadowRoomDef extends PieceBoardDef { kind: 'shadow' }
export interface PackingRoomDef extends PieceBoardDef { kind: 'packing' }
export interface SlideRoomDef extends RoomBase {
  kind: 'slide'; size: number; initial: number[];
  /** Legal moves from initial to solved: each entry is the tile cell to move. */
  solutionMoves: number[]; image?: string;
}
export interface SymmetryRoomDef extends RoomBase {
  kind: 'symmetry'; size: number; mirrors: 'vertical' | 'both';
  seeds: Array<{ at: number; token: string }>; palette: string[];
  solution: Array<{ at: number; token: string }>;
}
export interface SortingRoomDef extends RoomBase {
  kind: 'sorting'; items: Array<{ id: string; size: number; weight: number }>;
  mode: 'size' | 'weight'; maxWeighings?: number;
}
export interface SortingState { order: string[]; weighings: number; comparison?: [string, string] }
export interface SudokuRoomDef extends RoomBase {
  kind: 'sudoku'; size: 3 | 4; symbols: Array<{ color: number; shape: string }>;
  givens: number[]; solution: number[];
  /** 4x4 fuse boxes also have 2x2 regions. The 3x3 starter is a Latin square. */
  regions?: boolean;
}
export type JugAction = { kind: 'fill' | 'empty'; jug: number } | { kind: 'pour'; from: number; to: number };
export interface JugsRoomDef extends RoomBase {
  kind: 'jugs'; capacities: number[]; initial: number[]; target: number[];
  maxPours?: number; solution: JugAction[];
  /** Engineer has a sealed reservoir: fill/empty unavailable, all water conserved. */
  sealed?: boolean;
}
export interface JugsState { volumes: number[]; pours: number }
export type Direction = 'up' | 'right' | 'down' | 'left';
export interface TiltRoomDef extends RoomBase {
  kind: 'tilt'; cols: number; rows: number; walls: number[]; holes: number[];
  initial: number[]; goals: number[]; solution: Direction[]; par: { moves: number; seconds: number };
}
export interface TiltState { marbles: number[]; moves: number }
export interface SlideState { tiles: number[]; moves: number }
export interface LayerPlacement { id: string; turn: number; flipped?: boolean }
export interface LayersRoomDef extends RoomBase {
  kind: 'layers'; size: number; slides: Array<{ id: string; cells: Array<{ at: number; color: string }> }>;
  target: Array<{ at: number; color: string }>; solution: LayerPlacement[];
  orderMatters: boolean; allowRotate: boolean; allowFlip: boolean;
}
export interface DifferenceRoomDef extends RoomBase {
  kind: 'difference'; differences: Array<{ x: number; y: number; art: string; correct: string; wrong: string }>;
}
export type VarietyRoomDef = ShadowRoomDef | SlideRoomDef | SymmetryRoomDef | PackingRoomDef | SortingRoomDef | SudokuRoomDef | JugsRoomDef | TiltRoomDef | LayersRoomDef | DifferenceRoomDef;
