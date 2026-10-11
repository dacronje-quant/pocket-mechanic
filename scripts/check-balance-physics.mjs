/** Physical balance regressions driven only through real mouse/touch input. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
if (process.env.PLAYWRIGHT_MODULE) playwright = await import(process.env.PLAYWRIGHT_MODULE);
else {
  try { playwright = require('playwright'); }
  catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
}
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback;
const base = option('url', 'http://127.0.0.1:4179');
const out = resolve(option('out', '.qa/sweep/balance-physics'));
const devices = option('devices', 'mouse,touch').split(',');
const only = option('only', '').split(',').filter(Boolean);
mkdirSync(out, { recursive: true });
const report = { url: base, started: new Date().toISOString(), input: 'real mouse and touch gestures; query/save setup only; read-only state and rendered geometry observations', cases: [], errors: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const close = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;
const browser = await playwright.chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }), args: ['--disable-gpu'] });

try {
  for (const device of devices) {
    const context = await browser.newContext(device === 'touch' ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ device, error: error.stack ?? String(error) }));
    const cdp = device === 'touch' ? await context.newCDPSession(page) : null;
    let canvas;
    const point = ({ x, y }) => ({ x: canvas.x + x * canvas.width / 1280, y: canvas.y + y * canvas.height / 720 });
    const tap = async (x, y) => {
      const p = point({ x, y });
      if (cdp) await page.touchscreen.tap(p.x, p.y);
      else await page.mouse.click(p.x, p.y, { delay: 40 });
      await page.waitForTimeout(65);
    };
    const snapshot = () => page.evaluate(() => {
      const s = window.pm.game.scene.getScenes(true).find(scene => scene.def?.kind === 'balance');
      const p = object => object ? { x: object.x, y: object.y } : null;
      const undo = s.children.list.find(object => object.getData?.('icon')?.text === '\u21ba');
      return {
        def: s.def, state: s.state, fixed: s.fixed, moves: s.moves, tilt: s.tilt, motion: s.motion,
        lift: s.lift, trying: s.trying, geometry: s.g.getData('balance-geometry'), readout: s.readout?.text,
        weights: s.weights.map(w => ({ mass: w.mass, slot: w.slot, home: w.home, ...p(w.obj), targets: s.def.lever.slots.map(slot => ({ slot, ...s.weightPoint(slot, w.mass) })) })),
        wheels: s.wheels.map(w => ({ slot: w.getData('slot'), home: w.getData('home'), ...p(w) })),
        mounts: s.def.mode === 'pulley' ? s.pulleySlots() : [], fulcrum: p(s.fulcrumKnob), undo: p(undo),
        kip: { ...p(s.kip), groundY: s.kip.groundY }, kipBeam: s.def.lever?.kip ? s.beamPoint(s.def.lever.kip.pos) : null,
        errors: window.pm.errors,
      };
    });
    const wait = async (predicate, message, timeout = 10000) => {
      const started = Date.now();
      let state;
      do {
        state = await snapshot();
        if (predicate(state)) return state;
        await page.waitForTimeout(80);
      } while (Date.now() - started < timeout);
      throw new Error(`${message}: ${JSON.stringify(state)}`);
    };
    const drag = async (from, to, retarget) => {
      const a = point(from), b = point(to), length = Math.hypot(b.x - a.x, b.y - a.y);
      const nudge = Math.min(7 * canvas.width / 1280, length);
      const start = length ? { x: a.x + (b.x - a.x) * nudge / length, y: a.y + (b.y - a.y) * nudge / length } : a;
      const send = async (type, p) => cdp ? cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: p.x, y: p.y, id: 1, radiusX: 2, radiusY: 2 }] }) : undefined;
      if (cdp) await send('touchStart', a);
      else { await page.mouse.move(a.x, a.y); await page.mouse.down(); }
      await page.waitForTimeout(35);
      if (cdp) await send('touchMove', start); else await page.mouse.move(start.x, start.y);
      await page.waitForTimeout(50);
      for (let i = 1; i <= 12; i++) {
        const p = { x: a.x + (b.x - a.x) * i / 12, y: a.y + (b.y - a.y) * i / 12 };
        if (cdp) await send('touchMove', p); else await page.mouse.move(p.x, p.y);
        await page.waitForTimeout(16);
      }
      if (retarget) {
        const latest = point(await retarget());
        if (cdp) await send('touchMove', latest); else await page.mouse.move(latest.x, latest.y);
      }
      await page.waitForTimeout(60);
      if (cdp) await send('touchEnd', b); else await page.mouse.up();
      await page.waitForTimeout(180);
    };
    const setup = async (roomId, style = 'engineer') => {
      await page.goto(`${base}/?renderer=canvas&room=${roomId}&style=${style}&mode=free`);
      await page.waitForFunction(id => window.pm?.room?.roomId === id, roomId);
      await page.waitForTimeout(2050);
      canvas = await page.locator('canvas').boundingBox();
      const s = await snapshot();
      assert(!s.fixed && s.moves === 0 && !s.state.pulled, 'Fresh room setup is not unsolved');
      return s;
    };
    const place = async (mass, slot) => {
      const before = await snapshot(), weight = before.weights.find(w => w.mass === mass && w.slot === null);
      assert(weight, `Missing loose mass ${mass}`);
      await drag(weight, weight.targets.find(t => t.slot === slot), async () => (await snapshot()).weights.find(w => w.mass === mass).targets.find(t => t.slot === slot));
      const after = await snapshot();
      assert(after.state.weights.some(w => w.mass === mass && w.slot === slot), `Mass ${mass} did not snap to position ${slot}`);
      return after;
    };
    const fit = async count => {
      for (let i = 0; i < count; i++) {
        const before = await snapshot(), wheel = before.wheels.find(w => w.slot < 0);
        assert(wheel && before.mounts.length === 1, 'A visible empty mount and loose wheel are required');
        await drag(wheel, before.mounts[0]);
        const after = await snapshot();
        assert(after.state.wheels === before.state.wheels + 1, 'Wheel did not fit the visible mount');
      }
      return snapshot();
    };
    const level = () => wait(s => Math.abs(s.tilt) < .008 && Math.abs(s.motion.velocity) < .025, 'Balanced beam never settles level');
    const failedPull = async () => {
      await tap(1180, 600);
      const pulling = await snapshot();
      assert(pulling.state.pulled && !pulling.fixed, 'Actual Pull button did not start a trial');
      const samples = [pulling];
      for (let i = 0; i < 5; i++) { await page.waitForTimeout(280); samples.push(await snapshot()); }
      assert(samples.every(s => !s.fixed), 'Wrong physical arrangement celebrated');
      await wait(s => !s.state.pulled, 'Failed pull did not return control');
      return samples;
    };
    const complete = async () => {
      await tap(1180, 600);
      return wait(s => s.fixed, 'Valid physical arrangement did not complete');
    };
    const undo = async () => {
      const s = await snapshot(); assert(s.undo, 'Visible Undo button missing');
      await tap(s.undo.x, s.undo.y);
    };
    const hanging = state => {
      for (const a of state.geometry.attachments) assert(close(a.beam.x, a.weightTop.x, .1) && close(a.weightTop.y - a.beam.y, 28, .1), 'A hanging weight is disconnected from its beam peg');
    };
    const check = async (name, body) => {
      if (only.length && !only.some(filter => name.includes(filter))) return;
      const result = { name: `${device}-${name}`, passed: false }, started = Date.now();
      try { result.details = await body(); result.passed = true; }
      catch (error) { result.error = error.stack ?? String(error); result.lastState = await snapshot().catch(() => null); }
      result.seconds = +((Date.now() - started) / 1000).toFixed(2);
      report.cases.push(result);
      await page.screenshot({ path: resolve(out, `${result.passed ? 'PASS' : 'FAIL'}-${result.name}.png`) });
      writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
      console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? ` ${result.error.split('\n')[0]}` : ''}`);
    };

    // Save settings are only a fixture; no mechanism or progression is written.
    await page.goto(`${base}/?renderer=canvas&room=1-1&style=engineer&mode=free`);
    await page.waitForFunction(() => window.pm?.dev && window.pm.room);
    await page.evaluate(() => { Object.assign(window.pm.dev.save.settings, { muted: true, readAloud: false, music: 0, sfx: 0, voice: 0, calm: true, coop: 'off' }); window.pm.dev.persist(); });

    await check('initial-left-load-lowers-left', async () => {
      await setup('1-1');
      const s = await wait(s => s.tilt < -.12, 'Initial left load does not lower left');
      assert(s.geometry.beamLeft.y > s.geometry.beamRight.y && !s.fixed && !s.state.pulled, 'Visible tilt disagrees with initial left load');
      hanging(s); return s;
    });
    await check('wrong-light-counterweight-rejected', async () => {
      await setup('1-1'); await place(1, 1);
      const s = await wait(s => s.tilt < -.12, 'Insufficient counterweight does not leave left down'); hanging(s);
      const samples = await failedPull();
      assert(samples.every(s => s.geometry.beamLeft.y > s.geometry.beamRight.y), 'Wrong Pull visually balanced an insufficient weight');
      return { before: s, after: await snapshot() };
    });
    await check('equal-torque-level-then-manual-pull', async () => {
      await setup('1-1'); await place(4, 3); const s = await level(); hanging(s);
      assert(!s.fixed && !s.state.pulled && Math.abs(s.geometry.beamRight.y - s.geometry.beamLeft.y) < 5, 'Live balance should be level and await Pull');
      return { beforePull: s, completed: await complete() };
    });
    await check('alternative-valid-torques', async () => {
      await setup('1-1'); await place(2, 4); await place(4, 1);
      const s = await level(); hanging(s);
      assert(s.state.weights.length === 2 && !s.fixed, 'Alternative equal torque arrangement did not remain playable');
      return { beforePull: s, completed: await complete() };
    });
    await check('heavier-right-torque-lowers-right', async () => {
      await setup('1-1'); await place(5, 4);
      const s = await wait(s => s.tilt > .12, 'Heavier right torque does not lower right'); hanging(s);
      assert(s.geometry.beamRight.y > s.geometry.beamLeft.y, 'Visible beam lowers the wrong side');
      await failedPull(); return { before: s, after: await snapshot() };
    });
    await check('moving-fulcrum-and-real-kip-load', async () => {
      const initial = await setup('1-1', 'fixer');
      assert(initial.fulcrum, 'Fixer fulcrum is not draggable');
      await drag(initial.fulcrum, { x: 448, y: 420 });
      const moved = await snapshot();
      assert(moved.state.fulcrum === -3 && close(moved.geometry.pivot.x, 448), 'Moving fulcrum did not move visible pivot');
      const beamNeckY = 360 + 19.2 * Math.cos(moved.tilt);
      assert(beamNeckY > moved.geometry.pivot.y, 'Suspended beam should be below its pivot');
      await tap(1180, 600);
      const pulled = await wait(s => s.state.pulled && s.tilt > .02, 'Kip does not lower the right side after fulcrum shift');
      assert(close(pulled.kip.x, pulled.kipBeam.x, 1) && close(pulled.kip.y, pulled.kipBeam.y + 95, 1), 'Kip is not visibly hanging on the pulling endpoint');
      assert(pulled.geometry.beamRight.y > pulled.geometry.beamLeft.y, 'Kip pull does not visibly lift the left load');
      return { initial, moved, pulled, completed: await wait(s => s.fixed, 'Shifted fulcrum plus Kip did not lift') };
    });
    await check('zero-wheel-tinker-refusal-and-recovery', async () => {
      const results = [];
      for (const room of ['3-5', '8-1']) {
        const initial = await setup(room, 'tinker');
        const samples = await failedPull();
        assert(samples.every(s => close(s.geometry.loadTravel, 0) && close(s.geometry.loadY, 430)), 'Disconnected rope lifted a load');
        await fit(1); results.push({ room, initial, failed: await snapshot(), completed: await complete() });
      }
      return results;
    });
    await check('insufficient-pulley-refusal', async () => {
      const results = [];
      for (const room of ['3-5', '8-1']) {
        await setup(room, 'fixer'); const fitted = await fit(2); const samples = await failedPull();
        assert(fitted.geometry.supportingStrands === 2 && fitted.geometry.wheels.filter(w => w.moving).length === 1, 'Two-strand tackle topology is wrong');
        assert(samples.every(s => close(s.geometry.loadTravel, 0) && close(s.geometry.loadY, 430)), 'Insufficient pull visibly raised load');
        assert((await snapshot()).state.wheels === 2, 'Failed pull discarded fitted wheels');
        results.push({ room, fitted, after: await snapshot() });
      }
      return results;
    });
    for (const [n, room, style] of [[1, '3-5', 'tinker'], [3, '3-5', 'fixer'], [4, '3-5', 'engineer'], [5, '8-1', 'engineer']]) {
      await check(`pulley-${n}-strands-rope-work-and-moving-blocks`, async () => {
        await setup(room, style); const rest = await fit(n), g0 = rest.geometry;
        assert(g0.supportingStrands === n && g0.wheels.filter(w => w.moving).length === Math.floor(n / 2), 'Pulley support topology does not match installed wheel count');
        await tap(1180, 600);
        const during = await wait(s => s.geometry.loadTravel > 10 && s.geometry.loadTravel < 65, 'Pull did not animate a measurable load lift'), g = during.geometry;
        const loadUp = g0.loadY - g.loadY, ropeDown = g.freeEndY - g0.freeEndY;
        assert(close(ropeDown, n * loadUp, .1), `Free rope did ${ropeDown}px work for ${loadUp}px load travel, expected ratio ${n}`);
        assert(close(g.freeRopeTravel, ropeDown, .1), 'Reported and drawn free rope movement disagree');
        for (const wheel of g.wheels) {
          const before = g0.wheels.find(w => w.id === wheel.id), view = during.wheels.find(w => w.slot === wheel.id);
          assert(close(wheel.y, before.y - (wheel.moving ? loadUp : 0), .1), 'Fixed/moving pulley does not follow its block');
          assert(view && close(view.x, wheel.x, .1) && close(view.y, wheel.y, .1), 'Drawn pulley and draggable wheel disagree');
        }
        const completed = await wait(s => s.fixed, 'Sufficient pulley did not complete');
        assert(completed.geometry.freeEndX - 16 > 1020 && completed.geometry.freeEndX + 16 < 1132, 'Pulley grip overlaps the drawer or Pull control');
        return { rest, during, ratio: ropeDown / loadUp, completed };
      });
    }
    await check('edit-and-undo-cancel-stale-pull', async () => {
      await setup('1-1'); await place(4, 3); await level(); await tap(1180, 600);
      const pulling = await snapshot(), weight = pulling.weights.find(w => w.mass === 4);
      await drag(weight, weight.home);
      const edited = await snapshot();
      assert(!edited.state.pulled && !edited.fixed && edited.state.weights.length === 0, 'Editing during Pull did not cancel its trial');
      await undo(); const restored = await snapshot();
      assert(restored.state.weights.some(w => w.mass === 4 && w.slot === 3) && !restored.state.pulled, 'Undo did not restore weight without resuming stale Pull');
      await page.waitForTimeout(1700); const afterDelay = await snapshot();
      assert(!afterDelay.fixed, 'Cancelled old timer celebrated after edit+Undo');
      await level(); return { pulling, edited, restored, afterDelay, completed: await complete() };
    });
    await check('undo-during-pull-cancels-stale-win', async () => {
      await setup('1-1'); await place(4, 3); await level(); await tap(1180, 600); const pulling = await snapshot();
      await undo(); const undone = await snapshot();
      assert(!undone.state.pulled && !undone.fixed && undone.state.weights.length === 0, 'Undo during Pull did not remove the counterweight and cancel');
      await page.waitForTimeout(1700); const afterDelay = await snapshot();
      assert(!afterDelay.fixed && afterDelay.tilt < -.12, 'Old Pull celebrated or left a weightless beam level after Undo');
      await place(4, 3); await level(); return { pulling, undone, afterDelay, completed: await complete() };
    });
    await context.close();
  }
} finally {
  report.finished = new Date().toISOString();
  report.passed = report.cases.filter(test => test.passed).length;
  report.failed = report.cases.filter(test => !test.passed).length;
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, browserErrors: report.errors.length, report: resolve(out, 'report.json') }));
if (report.failed || report.errors.length) process.exitCode = 1;
