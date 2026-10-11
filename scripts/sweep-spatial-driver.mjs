/** Browser QA for the five spatial boards. No state writes or solver callbacks. */
const read = (h) => h.page.evaluate(() => {
  const sc = window.pm.game.scene.getScenes(true).find((s) => s.def && s.state);
  if (!['shadow', 'packing', 'slide', 'symmetry', 'tilt'].includes(sc.def.kind)) return { def: sc.def };
  return { def: sc.def, state: sc.state, fixed: sc.fixed, S: sc.S, ox: sc.ox, oy: sc.oy,
    parts: sc.parts?.filter((p) => p.piece).map((p) => ({ id: p.piece.id, turn: p.turn, x: p.obj.x, y: p.obj.y })),
    tokens: sc.tokens?.map((p) => ({ token: p.token, x: p.obj.x, y: p.obj.y })),
  };
});
const rotate = (cells, turn) => {
  const points = cells.map(({ x, y }) => turn === 0 ? { x, y } : turn === 1 ? { x: -y, y: x } : turn === 2 ? { x: -x, y: -y } : { x: y, y: -x });
  const minX = Math.min(...points.map((p) => p.x)), minY = Math.min(...points.map((p) => p.y)); return points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
};
const cell = (s, at, cols = s.def.size ?? s.def.cols) => ({ x: s.ox + (at % cols + 0.5) * s.S, y: s.oy + (Math.floor(at / cols) + 0.5) * s.S });

export async function driveSpatial(h) {
  let s = await read(h); const kind = s.def.kind;
  if (!['shadow', 'packing', 'slide', 'symmetry', 'tilt'].includes(kind)) return false;
  if (kind === 'shadow' || kind === 'packing') {
    for (const step of s.def.solution) {
      s = await read(h); const part = s.parts.find((p) => p.id === step.id);
      await h.click(part.x, part.y);
      for (let i = 0; i < (step.turn - part.turn + 4) % 4; i++) await h.click(1070, 596);
      s = await read(h); const current = s.parts.find((p) => p.id === step.id), piece = s.def.pieces.find((p) => p.id === step.id);
      const cells = rotate(piece.cells, step.turn), w = Math.max(...cells.map((c) => c.x)) + 1, height = Math.max(...cells.map((c) => c.y)) + 1;
      await h.drag(current, { x: s.ox + (step.x + w / 2) * s.S, y: s.oy + (step.y + height / 2) * s.S });
      const after = await read(h);
      if (!after.state.some((p) => p.id === step.id && p.x === step.x && p.y === step.y && p.turn === step.turn)) throw new Error(`${s.def.id}: real placement failed ${JSON.stringify(step)}`);
    }
  } else if (kind === 'slide') {
    for (const at of s.def.solutionMoves) {
      s = await read(h); const value = s.state.tiles[at], c = cell(s, at); await h.click(c.x, c.y);
      await h.page.waitForFunction(({ value, at }) => {
        const sc = window.pm.game.scene.getScenes(true).find((s) => s.def && s.state); return !sc.moving && sc.state.tiles.indexOf(value) !== at;
      }, { value, at }, { timeout: 10000 });
    }
  } else if (kind === 'symmetry') {
    for (const step of s.def.solution) {
      s = await read(h); if (s.state[step.at] === step.token) continue;
      const token = s.tokens.find((p) => p.token === step.token), c = cell(s, step.at);
      await h.click(token.x, token.y); await h.click(c.x, c.y);
    }
  } else {
    const positions = { up: [1035, 272], right: [1100, 338], down: [1035, 404], left: [970, 338] };
    for (const direction of s.def.solution) {
      await h.click(...positions[direction]);
      await h.page.waitForFunction(() => !window.pm.game.scene.getScenes(true).find((s) => s.def && s.state)?.rolling, undefined, { timeout: 10000 });
    }
  }
  await h.page.waitForFunction(() => window.pm.game.scene.getScenes(true).find((s) => s.def && s.state)?.fixed, undefined, { timeout: 20000 });
  return true;
}
