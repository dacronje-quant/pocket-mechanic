/** Real pointer recipes for the classic mechanism rooms. Read scene state; never write it. */
export async function driveClassic(h) {
  const read = () => h.page.evaluate(() => {
    const s = window.pm.game.scene.getScenes(true).find(scene => scene.def && scene.state);
    const point = object => ({ x: object.x, y: object.y });
    switch (s.def.kind) {
      case 'balance': return { weights: s.weights.map(w => ({ mass: w.mass, slot: w.slot, ...point(w.obj) })), wheels: s.wheels.map(w => ({ slot: w.getData('slot'), ...point(w) })), slots: s.def.mode === 'pulley' ? s.pulleySlots() : null, weightTargets: s.def.mode === 'lever' ? s.def.lever.slots.map(slot => ({ slot, ...s.weightPoint(slot, 0) })) : null, fulcrum: s.fulcrumKnob ? point(s.fulcrumKnob) : null };
      case 'cam': return { parts: s.parts.map(p => ({ shape: p.shape, at: p.at, ...point(p.obj) })), xs: s.xs };
      case 'cards': return { parts: s.views.map(p => ({ card: p.card, slot: p.slot, ...point(p.obj) })), slots: s.slotPos, buttons: s.partyBtns.map(b => ({ move: b.move, ...point(b.btn) })) };
      case 'chain': return { parts: s.parts.map(p => ({ id: p.id, at: p.at, ...point(p.obj) })), slots: s.pos };
      case 'music': return { x0: s.x0, y0: s.y0, cw: s.cw, ch: s.ch, pins: [...s.state] };
      case 'pendulum': return { views: s.views.map(v => ({ id: v.id, fixed: v.fixed, px: v.px, py: v.py, ...point(v.bob) })), pallet: s.pallet ? point(s.pallet) : null, escape: s.escape };
      case 'tune': return { dials: s.dials.map(d => ({ id: d.id, a: d.a, b: d.b, ...point(d.knob) })) };
      case 'hunt': return { lifted: [...s.state] };
      case 'busy': return { pressed: [...s.state] };
      case 'nest': return { parts: s.decos.map(d => ({ deco: d.deco, at: d.at, ...point(d.obj) })) };
      default: return {};
    }
  });
  let { def, state, style } = await h.snapshot();
  switch (def.kind) {
    case 'balance': {
      if (def.mode === 'lever') {
        let ui = await read();
        if (def.solution.fulcrum !== undefined && state.fulcrum !== def.solution.fulcrum) {
          if (!ui.fulcrum) throw new Error('Missing movable fulcrum');
          await h.drag(ui.fulcrum, { x: 640 + def.solution.fulcrum * 64, y: 420 });
        }
        for (const wanted of def.solution.weights ?? []) {
          ui = await read();
          const weight = ui.weights.find(w => w.mass === wanted.mass && w.slot === null);
          if (!weight) throw new Error(`Missing weight ${wanted.mass}`);
          const target = await h.page.evaluate(({slot,mass}) => { const s=window.pm.game.scene.getScenes(true).find(scene=>scene.def?.kind==='balance');return s.weightPoint(slot,mass); }, wanted);
          await h.drag(weight, target);
        }
      } else {
        for (let i = 0; i < (def.solution.wheels ?? 0); i++) {
          const ui = await read(), wheel = ui.wheels.find(w => w.slot < 0);
          if (!wheel) throw new Error('Missing pulley wheel');
          if (!ui.slots?.length) throw new Error('Missing empty pulley mount');
          await h.drag(wheel, ui.slots[0]);
        }
      }
      await h.click(1180, 600);
      return true;
    }
    case 'cam': {
      for (const follower of def.followers) {
        if (follower.start) continue;
        const wanted = def.solution[follower.id], ui = await read();
        const part = ui.parts.find(p => p.shape === wanted.shape && p.at === null);
        if (!part) throw new Error(`Missing cam ${wanted.shape}`);
        const target = { x: ui.xs[follower.id], y: 450 };
        await h.drag(part, target);
        if (style === 'engineer') {
          for (let phase = 0; phase < wanted.phase; phase++) await h.click(target.x, target.y);
        }
      }
      return true;
    }
    case 'cards': {
      if (style === 'tinker') {
        const ui = await read();
        for (const move of def.scenarios[0].moves) {
          const button = ui.buttons.find(b => b.move === move);
          await h.click(button.x, button.y);
        }
      } else {
        for (let i = 0; i < def.solution.length; i++) {
          const wanted = JSON.stringify(def.solution[i]);
          for (let attempt = 0; attempt < 3; attempt++) {
            const current = await h.snapshot();
            if (JSON.stringify(current.state.rack[i]) === wanted) break;
            const ui = await read();
            const part = ui.parts.find(p => p.slot === null && JSON.stringify(p.card) === wanted);
            if (!part) throw new Error(`Missing loose card ${wanted} for slot ${i}`);
            if (attempt) console.log(`RETRY card drop ${def.id} slot ${i + 1}`);
            await h.drag(part, ui.slots[i]);
          }
          const placed = await h.snapshot();
          if (JSON.stringify(placed.state.rack[i]) !== wanted) throw new Error(`Card drop did not reach slot ${i + 1}`);
        }
        await h.click(1180, 600);
      }
      return true;
    }
    case 'chain': {
      for (let i = 0; i < def.links.length; i++) {
        if (!def.links[i].slot) continue;
        const ui = await read(), part = ui.parts.find(p => p.id === def.links[i].sol && p.at === null);
        if (!part) throw new Error(`Missing chain part ${def.links[i].sol}`);
        await h.drag(part, ui.slots[i]);
      }
      await h.click(1180, 600);
      return true;
    }
    case 'music': {
      const ui = await read(), wanted = new Set(def.melody.map(([step, note]) => `${step}:${note}`));
      const clickPin = async key => {
        const [step, note] = key.split(':').map(Number);
        await h.click(ui.x0 + (step + .5) * ui.cw, ui.y0 + (def.notes - note - .5) * ui.ch);
      };
      for (const key of ui.pins) if (!wanted.has(key)) await clickPin(key);
      for (const key of wanted) if (!ui.pins.includes(key)) await clickPin(key);
      return true;
    }
    case 'pendulum': {
      let ui = await read();
      if (def.pallet) await h.drag(ui.pallet, { x: ui.escape.x, y: ui.escape.y + 30 });
      if (def.goal === 'push') {
        ui = await read();
        const bob = ui.views.find(v => !v.fixed) ?? ui.views[0];
        await h.click(bob.x, bob.y);
      } else {
        for (const [id, notch] of Object.entries(def.solution.notches ?? {})) {
          ui = await read();
          const bob = ui.views.find(v => v.id === id);
          await h.drag(bob, { x: bob.px, y: bob.py + 80 + Number(notch) * 30 });
        }
      }
      return true;
    }
    case 'tune': {
      for (const wanted of def.dials) {
        if (Math.abs(state[wanted.id] - wanted.target) <= wanted.tol) continue;
        const ui = await read(), dial = ui.dials.find(d => d.id === wanted.id);
        await h.drag(dial, { x: dial.a.x + (dial.b.x - dial.a.x) * wanted.target, y: dial.a.y + (dial.b.y - dial.a.y) * wanted.target });
      }
      return true;
    }
    case 'hunt': {
      for (const cover of def.covers) if (cover.target) await h.click(cover.x, cover.y);
      return true;
    }
    case 'busy': {
      for (const gadget of def.gadgets.slice(0, def.need)) await h.click(gadget.x, gadget.y);
      return true;
    }
    case 'nest': {
      for (let i = 0; i < def.need; i++) {
        const ui = await read(), part = ui.parts.find(p => p.at === null);
        if (!part) throw new Error('Missing nest decoration');
        await h.drag(part, def.slots[i]);
      }
      return true;
    }
    default: return false;
  }
}
