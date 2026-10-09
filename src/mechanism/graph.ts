/**
 * The Mechanism Graph (GDD §30.2) — a deterministic kinematic solver.
 *
 * No physics engine: gears are nodes, meshes and shared shafts are edges, and
 * angular velocity is propagated through the graph by tooth-count ratios.
 * Pure TypeScript with no Phaser imports, so it is unit-testable and can be
 * reused later by the Invention Bench.
 */

/** Pixels of pitch radius per tooth (pitch radius = teeth * MODULE / 2). */
export const MODULE = 5;

/** How far (px) two pitch circles may miss each other and still mesh. */
export const MESH_TOLERANCE = 6;

export interface GearNode {
  id: string;
  teeth: number;
  x: number;
  y: number;
  /** Gears sharing a shaft id are fixed together (compound gears) and never collide. */
  shaft?: string;
  /** Depth layer: gears only mesh or collide with gears on the same layer (compound gears stack two layers). */
  layer?: number;
}

export interface Driver {
  gearId: string;
  /** Radians per second. Positive = clockwise on screen (y points down). */
  omega: number;
}

export interface Solution {
  /** Angular velocity per gear id. Unpowered or jammed gears are 0. */
  omega: Map<string, number>;
  /** Gears reached by power, in the order power reached them (driver first). */
  order: string[];
  /** Meshes that carry power, as [from, to] pairs in propagation order. */
  powerEdges: Array<[string, string]>;
  jammed: boolean;
  /** Gears in the jammed group (they grumble and stop). */
  jamGroup: Set<string>;
}

export function pitchRadius(teeth: number, module = MODULE): number {
  return (teeth * module) / 2;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function sameShaft(a: GearNode, b: GearNode): boolean {
  return a.shaft !== undefined && a.shaft === b.shaft;
}

function sameLayer(a: GearNode, b: GearNode): boolean {
  return (a.layer ?? 0) === (b.layer ?? 0);
}

/** Two gears mesh when their pitch circles just touch. */
export function meshes(a: GearNode, b: GearNode, module = MODULE, tol = MESH_TOLERANCE): boolean {
  if (sameShaft(a, b) || !sameLayer(a, b)) return false;
  const gap = dist(a, b) - (pitchRadius(a.teeth, module) + pitchRadius(b.teeth, module));
  return Math.abs(gap) <= tol;
}

/** Two gears physically overlap (can't both sit there). */
export function collides(a: GearNode, b: GearNode, module = MODULE, tol = MESH_TOLERANCE): boolean {
  if (sameShaft(a, b) || !sameLayer(a, b)) return false;
  const gap = dist(a, b) - (pitchRadius(a.teeth, module) + pitchRadius(b.teeth, module));
  return gap < -tol;
}

/** Position a gear so it meshes exactly with `from`, in direction `angleDeg` (0 = right, 90 = down). */
export function meshedPosition(
  from: { x: number; y: number; teeth: number },
  teeth: number,
  angleDeg: number,
  module = MODULE,
): { x: number; y: number } {
  const d = pitchRadius(from.teeth, module) + pitchRadius(teeth, module);
  const a = (angleDeg * Math.PI) / 180;
  return { x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d };
}

interface Edge {
  to: string;
  /** omega(to) = omega(from) * factor */
  factor: number;
  kind: 'mesh' | 'shaft';
}

function buildAdjacency(gears: GearNode[], module: number): Map<string, Edge[]> {
  const adj = new Map<string, Edge[]>();
  for (const g of gears) adj.set(g.id, []);
  for (let i = 0; i < gears.length; i++) {
    for (let j = i + 1; j < gears.length; j++) {
      const a = gears[i];
      const b = gears[j];
      if (sameShaft(a, b)) {
        adj.get(a.id)!.push({ to: b.id, factor: 1, kind: 'shaft' });
        adj.get(b.id)!.push({ to: a.id, factor: 1, kind: 'shaft' });
      } else if (meshes(a, b, module)) {
        // Meshed gears turn in opposite directions; the smaller one turns faster.
        adj.get(a.id)!.push({ to: b.id, factor: -a.teeth / b.teeth, kind: 'mesh' });
        adj.get(b.id)!.push({ to: a.id, factor: -b.teeth / a.teeth, kind: 'mesh' });
      }
    }
  }
  return adj;
}

/**
 * Propagate motion from the driver. If any loop demands two different speeds
 * for the same gear (e.g. three gears meshed in a triangle), the whole
 * connected group jams.
 */
export function solve(gears: GearNode[], driver: Driver, module = MODULE): Solution {
  const adj = buildAdjacency(gears, module);
  const omega = new Map<string, number>();
  for (const g of gears) omega.set(g.id, 0);

  const order: string[] = [];
  const powerEdges: Array<[string, string]> = [];
  if (!adj.has(driver.gearId)) {
    return { omega, order, powerEdges, jammed: false, jamGroup: new Set() };
  }

  const assigned = new Map<string, number>([[driver.gearId, driver.omega]]);
  const queue = [driver.gearId];
  order.push(driver.gearId);
  let jammed = false;

  while (queue.length) {
    const id = queue.shift()!;
    const w = assigned.get(id)!;
    for (const e of adj.get(id)!) {
      const want = w * e.factor;
      const have = assigned.get(e.to);
      if (have === undefined) {
        assigned.set(e.to, want);
        order.push(e.to);
        if (e.kind === 'mesh') powerEdges.push([id, e.to]);
        queue.push(e.to);
      } else if (Math.abs(have - want) > 1e-9 * Math.max(1, Math.abs(want))) {
        jammed = true;
      }
    }
  }

  if (jammed) {
    // Everything connected to the driver locks up.
    return { omega, order, powerEdges: [], jammed: true, jamGroup: new Set(order) };
  }
  for (const [id, w] of assigned) omega.set(id, w);
  return { omega, order, powerEdges, jammed: false, jamGroup: new Set() };
}

/**
 * Rotation that makes `b`'s teeth interlock with `a`'s, given `a`'s current rotation.
 * Teeth are drawn with a tooth centred at local angle 0.
 */
export function meshPhase(a: GearNode, aRotation: number, b: GearNode): number {
  const theta = Math.atan2(b.y - a.y, b.x - a.x);
  const TAU = Math.PI * 2;
  let f1 = (a.teeth * (theta - aRotation)) / TAU;
  f1 -= Math.floor(f1);
  return theta + Math.PI - (TAU * (0.5 - f1)) / b.teeth;
}

/** Output speed as a ratio of input speed (signed: negative = opposite direction). */
export function speedRatio(sol: Solution, inputId: string, outputId: string): number {
  const wi = sol.omega.get(inputId) ?? 0;
  const wo = sol.omega.get(outputId) ?? 0;
  return wi === 0 ? 0 : wo / wi;
}
