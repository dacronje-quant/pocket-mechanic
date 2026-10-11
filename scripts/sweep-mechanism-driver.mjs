/** Browser QA: solve through pointer events; evaluation only reads the live scene. */
const read = (h) => h.page.evaluate(() => {
  const sc = window.pm.game.scene.getScenes(true).find((s) => s.def && s.state);
  if (!['gear', 'flow', 'light', 'logic', 'oil'].includes(sc.def.kind)) return { def: sc.def };
  const xy = (o) => ({ x: o.x, y: o.y });
  return {
    def: sc.def, style: sc.style.id, fixed: sc.fixed,
    state: sc.def.kind === 'oil' ? { ...sc.state, oiled: [...sc.state.oiled] } : sc.state,
    S: sc.S, ox: sc.ox, oy: sc.oy,
    parts: sc.parts?.map((p) => ({ kind: p.kind, gate: p.gate, cell: p.cell, node: p.node, ...xy(p.obj ?? p.g ?? p) })),
    optics: sc.optics?.map((p) => ({ kind: p.kind, color: p.color, cell: p.cell, ...xy(p.obj) })),
    views: Array.isArray(sc.views) ? sc.views.map((v) => ({ teeth: v.teeth, fixed: v.fixed, shaft: v.shaft, layer: v.layer, home: v.home, depth: v.img.depth, ...xy(v.img) })) : [],
    can: sc.can ? xy(sc.can) : null, pawl: sc.pawlObj ? xy(sc.pawlObj) : null,
  };
});
const wait = (h, predicate, timeout = 10000) => h.page.waitForFunction(predicate, undefined, { timeout });
const cell = (s, at) => ({ x: s.ox + (at % s.state.cols + 0.5) * s.S, y: s.oy + (Math.floor(at / s.state.cols) + 0.5) * s.S });

export async function driveMechanism(h) {
  let s = await read(h);
  const kind = s.def.kind;
  if (!['gear', 'flow', 'light', 'logic', 'oil'].includes(kind)) return false;
  if (kind === 'gear') {
    // Some repairs start with the wrong gears already fitted. Lift the front
    // layer first so the lower layer can be reached, returning parts to their
    // actual tray homes before assembling the requested train of gears.
    const initial = s.views.filter((p) => !p.fixed && p.shaft).sort((a, b) => b.depth - a.depth);
    for (const part of initial) await h.drag(part, part.home);
    for (const step of s.def.solution) {
      s = await read(h);
      if (s.fixed || s.state.some((p) => p.shaft === step.shaft && p.layer === step.layer && p.teeth === step.teeth)) continue;
      const part = s.views.find((p) => !p.fixed && !p.shaft && p.teeth === step.teeth);
      if (!part) throw new Error(`${s.def.id}: no real gear for ${JSON.stringify(step)}`);
      const target = s.def.shafts.find((p) => p.id === step.shaft);
      await h.drag(part, target);
    }
  } else if (kind === 'flow' || kind === 'light') {
    for (let at = 0; at < s.state.cells.length; at++) {
      s = await read(h); if (s.fixed) break;
      let tile = s.state.cells[at]; if (!tile?.sol) continue;
      const want = tile.sol;
      if (want.kind && tile.kind === '_') {
        const part = kind === 'flow' ? s.parts.find((p) => p.cell === null && p.kind === want.kind) : s.optics.find((p) => p.cell === null && p.kind === want.kind && (!want.color || p.color === want.color));
        if (!part) throw new Error(`${s.def.id}: no real ${kind} part at ${at}`);
        await h.drag(part, cell(s, at));
        if (process.env.SWEEP_TRACE) { const after = await read(h); console.log(JSON.stringify({ event: 'drop', at, part, target: cell(s, at), tile: after.state.cells[at], parts: after.parts })); }
      }
      for (let turns = 0; turns < 4; turns++) {
        s = await read(h); tile = s.state.cells[at];
        if (s.fixed || want.rot === undefined || (kind === 'light' && tile.kind === 'R' ? tile.rot % 2 === want.rot % 2 : tile.rot === want.rot)) break;
        await h.click(cell(s, at).x, cell(s, at).y);
        if (process.env.SWEEP_TRACE) { const after = await read(h); console.log(JSON.stringify({ event: 'turn', at, tile: after.state.cells[at], parts: after.parts })); }
      }
      s = await read(h); tile = s.state.cells[at];
      if (!s.fixed && want.state !== undefined && tile.state !== want.state) await h.click(cell(s, at).x, cell(s, at).y);
    }
    if (kind === 'flow' && s.def.family === 'tracks') await h.click(1180, 600);
  } else if (kind === 'logic') {
    for (const [id, gate] of Object.entries(s.def.solution.gates ?? {})) {
      s = await read(h); if (s.fixed || s.state.gates[id] === gate) continue;
      const part = s.parts.find((p) => p.gate === gate && p.node === null), target = s.def.nodes.find((n) => n.id === id);
      if (!part) throw new Error(`${s.def.id}: no real ${gate} gate`);
      await h.drag(part, target);
    }
    for (const [id, value] of Object.entries(s.def.solution.inputs ?? {})) {
      s = await read(h); if (s.fixed || !!s.state.inputs[id] === value) continue;
      const n = s.def.nodes.find((n) => n.id === id); await h.click(n.x, n.y);
    }
    if (s.def.goal.kind !== 'reach') await h.click(1180, 600);
  } else {
    if (s.def.pawl && !s.state.pawl) await h.drag(s.pawl, s.def.pawl);
    for (let attempt = 0; attempt < s.def.parts.length + 2; attempt++) {
      s = await read(h);
      if (s.fixed || s.def.parts.filter((p) => p.required).every((p) => s.state.oiled.includes(p.id))) break;
      // The can returns on a live tween after each pour. Start the next drag
      // once it is back in the tray, where a child can reliably pick it up.
      await h.page.waitForFunction(() => {
        const sc = window.pm.game.scene.getScenes(true).find((s) => s.def && s.state);
        return Math.hypot(sc.can.x - sc.canHome.x, sc.can.y - sc.canHome.y) < 1;
      }, undefined, { timeout: 10000 });
      s = await read(h);
      // Tinker hover snapping may pour on a lower bearing on the way to an
      // upper one. Every pour counts, so approach the closest remaining part
      // and follow the observed result rather than insisting on an order.
      const candidates = s.def.parts.filter((p) => !s.state.oiled.includes(p.id) && (s.style === 'tinker' || p.required));
      const p = candidates.sort((a, b) => Math.hypot(a.x - s.can.x, a.y - s.can.y) - Math.hypot(b.x - s.can.x, b.y - s.can.y))[0];
      const count = s.state.oiled.length;
      await h.drag(s.can, p);
      await h.page.waitForFunction((count) => {
        const sc = window.pm.game.scene.getScenes(true).find((s) => s.def && s.state); return sc.state.oiled.size > count;
      }, count, { timeout: 10000 });
    }
    if (s.def.crank) {
      const k = s.def.crank, pts = [{ x: k.x + 96, y: k.y }, { x: k.x, y: k.y + 96 }, { x: k.x - 96, y: k.y }, { x: k.x, y: k.y - 96 }];
      for (let i = 0; i < k.turns * 8 + 8; i++) {
        s = await read(h); if (s.fixed || s.state.turns >= k.turns) break;
        await h.drag(pts[i % 4], pts[(i + 1) % 4]);
      }
    }
  }
  await wait(h, () => window.pm.game.scene.getScenes(true).find((s) => s.def && s.state)?.fixed, 45000);
  return true;
}
