/** Authored solutions performed entirely through the visible reasoning controls. */
export async function driveReasoning(h) {
  const { def, style } = await h.snapshot();
  const tap = async qa => {
    const snapshot = await h.snapshot(), object = snapshot.objects.find(o => (o.qa || o.name) === qa);
    if (!object) throw new Error(`Missing visible control ${qa}`);
    await h.click(object.x, object.y);
  };
  switch (def.kind) {
    case 'sorting': {
      let target;
      if (def.mode === 'weight') {
        // Merge-sort comparisons use the actual scale before arranging valves.
        const merge = async ids => {
          if (ids.length < 2) return ids;
          const mid = Math.floor(ids.length / 2), left = await merge(ids.slice(0, mid)), right = await merge(ids.slice(mid)), out = [];
          while (left.length && right.length) {
            const { state } = await h.snapshot();
            await tap(`sorting-valve:${state.order.indexOf(left[0])}`);
            await tap(`sorting-valve:${state.order.indexOf(right[0])}`);
            await tap('sorting-weigh');
            const scale = await h.page.evaluate(() => window.pm.game.scene.getScenes(true).find(s => s.def && s.state).drawing.getData('sortingScale'));
            if (scale?.left.id !== left[0] || scale?.right.id !== right[0] || !Number.isFinite(scale.left.y) || !Number.isFinite(scale.right.y) || scale.left.y === scale.right.y) throw new Error('Scale did not visibly compare the selected distinct valves');
            const a = left[0], b = right[0];
            // The lower pan is heavier: learn the order from the drawn result,
            // so an inverted display cannot pass by reading authored masses.
            out.push(scale.left.y < scale.right.y ? left.shift() : right.shift());
            await tap(`sorting-valve:${state.order.indexOf(a)}`);
            await tap(`sorting-valve:${state.order.indexOf(b)}`);
          }
          return [...out, ...left, ...right];
        };
        target = await merge(def.items.map(i => i.id));
      } else target = [...def.items].sort((a, b) => a.size - b.size).map(i => i.id);
      for (let i = 0; i < target.length; i++) {
        const { state, fixed } = await h.snapshot();
        if (fixed) break;
        const j = state.order.indexOf(target[i]);
        if (i === j) continue;
        await tap(`sorting-valve:${i}`); await tap(`sorting-valve:${j}`); await tap('sorting-swap');
      }
      return true;
    }
    case 'sudoku': {
      for (let i = 0; i < def.givens.length; i++) {
        if (def.givens[i] >= 0) continue;
        await tap(`sudoku-symbol:${def.solution[i]}`); await tap(`sudoku-cell:${i}`);
      }
      return true;
    }
    case 'jugs': {
      for (const action of def.solution) {
        await tap(`jugs-jug:${action.kind === 'pour' ? action.from : action.jug}`);
        await tap(action.kind === 'pour' ? `jugs-pour:${action.to}` : `jugs-${action.kind}`);
      }
      return true;
    }
    case 'layers': {
      for (let i = 0; i < def.solution.length; i++) {
        const placement = def.solution[i];
        await tap(`layers-slide:${placement.id}`);
        for (let turn = 0; turn < placement.turn; turn++) await tap('layers-rotate');
        if (placement.flipped) await tap('layers-flip');
      }
      return true;
    }
    case 'difference': {
      for (let i = 0; i < def.differences.length; i++) await tap(`difference-feature:${i}`);
      return true;
    }
    default: return false;
  }
}
