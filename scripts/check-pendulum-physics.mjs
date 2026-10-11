/** Real mouse/touch regressions. Puzzle state and completion hooks are read only. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = process.env.PLAYWRIGHT_MODULE ? await import(process.env.PLAYWRIGHT_MODULE) : require('playwright'); }
catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const args = process.argv.slice(2);
const opt = (key, fallback) => args.includes('--' + key) ? args[args.indexOf('--' + key) + 1] : fallback;
const url = opt('url', 'http://127.0.0.1:4179'), out = resolve(opt('out', '.qa/sweep/pendulum-physics'));
const only = opt('only', '').split(',').filter(Boolean);
const report = { url, input: 'real mouse/touch gestures; settings fixture only; no mechanism-state or solve writes', cases: [], errors: [] };
mkdirSync(out, { recursive: true });
const assert = (condition, message) => { if (!condition) throw Error(message); };
const close = (a, b, tolerance = .01) => Math.abs(a - b) <= tolerance;
const browser = await playwright.chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }), args: ['--disable-gpu'] });
try {
  for (const device of opt('devices', 'mouse,touch').split(',')) {
    const context = await browser.newContext(device === 'touch' ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 720 } });
    const page = await context.newPage(), cdp = device === 'touch' ? await context.newCDPSession(page) : null;
    page.on('pageerror', error => report.errors.push({ device, error: String(error) }));
    let canvas;
    const point = p => ({ x: canvas.x + p.x * canvas.width / 1280, y: canvas.y + p.y * canvas.height / 720 });
    const read = () => page.evaluate(() => {
      const s = window.pm.game.scene.getScenes(true).find(s => s.def?.kind === 'pendulum');
      const xy = o => o ? { x: o.x, y: o.y } : null;
      return { def: s.def, state: s.state, fixed: s.fixed, elapsed: s.elapsed, geometry: s.g.getData('pendulum-geometry'), meter: s.meter?.text,
        views: s.views.map(v => ({ id: v.id, ...xy(v.bob), motion: v.motion, dragging: v.dragging, targets: Array.from({ length: s.def.maxNotch - s.def.minNotch + 1 }, (_, i) => ({ notch: i + s.def.minNotch, ...s.notchPoint(v, i + s.def.minNotch) })) })),
        pallet: xy(s.pallet), palletHome: s.palletHome, undo: xy(s.children.list.find(o => o.getData?.('icon')?.text === '↺')), errors: window.pm.errors };
    });
    const tap = async p => { const q = point(p); if (cdp) await page.touchscreen.tap(q.x, q.y); else await page.mouse.click(q.x, q.y, { delay: 25 }); await page.waitForTimeout(40); };
    const wait = async (predicate, message, timeout = 10000) => {
      const start = Date.now(); let s;
      do { s = await read(); if (predicate(s)) return s; await page.waitForTimeout(50); } while (Date.now() - start < timeout);
      throw Error(message + ': ' + JSON.stringify(s));
    };
    const setup = async (id, style = 'engineer') => {
      await page.goto(url + '/?renderer=canvas&room=' + id + '&style=' + style + '&mode=free');
      await page.waitForFunction(id => window.pm?.room?.roomId === id, id);
      await page.waitForTimeout(2150); canvas = await page.locator('canvas').boundingBox();
      const s = await read(); assert(!s.fixed, 'Fresh board already completed'); return s;
    };
    const drag = async (from, target, inspectHold) => {
      const a = point(from), original = point(typeof target === 'function' ? target(await read()) : target);
      const d = Math.hypot(original.x - a.x, original.y - a.y), nudge = Math.min(7 * canvas.width / 1280, d);
      const send = async (type, q) => {
        if (cdp) await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: q.x, y: q.y, id: 1, radiusX: 2, radiusY: 2 }] });
        else if (type === 'touchStart') { await page.mouse.move(q.x, q.y); await page.mouse.down(); }
        else if (type === 'touchEnd') await page.mouse.up();
        else await page.mouse.move(q.x, q.y);
      };
      await send('touchStart', a); await page.waitForTimeout(25);
      await send('touchMove', { x: a.x + (original.x-a.x) * nudge/d, y: a.y + (original.y-a.y) * nudge/d }); await page.waitForTimeout(50);
      if (inspectHold) await inspectHold(await read());
      const b = point(typeof target === 'function' ? target(await read()) : target);
      for (let i = 1; i <= 12; i++) { await send('touchMove', { x: a.x + (b.x-a.x)*i/12, y: a.y + (b.y-a.y)*i/12 }); await page.waitForTimeout(12); }
      await page.waitForTimeout(30); await send('touchEnd', b); await page.waitForTimeout(80); return read();
    };
    const length = async (id, notch, hold = false) => {
      const s = await read(), v = s.views.find(v => v.id === id);
      const result = await drag(v, next => next.views.find(v => v.id === id).targets.find(t => t.notch === notch), hold ? async held => {
        const a = held.views.find(v => v.id === id); assert(a.dragging, 'Bob did not enter its hold state');
        await page.waitForTimeout(400); const b = (await read()).views.find(v => v.id === id);
        assert(close(a.motion.angle, b.motion.angle, 1e-10), 'Held bob continues swinging under the pointer');
      } : null);
      assert(result.state.notches[id] === notch, 'Bob did not follow the visible notch target');
      return result;
    };
    const fit = async () => { const s = await read(); assert(s.pallet, 'Drawer anchor absent'); return drag(s.pallet, s.geometry.palletTarget); };
    const undo = async () => { const s = await read(); assert(s.undo, 'Undo absent'); await tap(s.undo); return read(); };
    const physical = s => {
      for (const v of s.geometry.views) {
        assert(close(Math.hypot(v.bob.x-v.pivot.x, v.bob.y-v.pivot.y), v.lengthPixels), 'Bob is detached from its physical radius');
        assert(close(v.lengthPixels/v.lengthM, 300), 'Pictures and force model use different length scales');
        assert(v.bob.y + 39 < 550 && v.bob.x - 34 > 0 && v.bob.x + 34 < 1280, 'Bob crosses drawer or screen boundary');
      }
    };
    const complete = () => wait(s => s.fixed, 'Legal assembly did not finish after three ticks');
    const check = async (name, body) => {
      if (only.length && !only.some(filter => name.includes(filter))) return;
      const result = { name: device + '-' + name, passed: false };
      try { result.details = await body(); result.passed = true; } catch (error) { result.error = String(error); result.lastState = await read().catch(() => null); }
      await page.screenshot({ path: resolve(out, (result.passed ? 'PASS-' : 'FAIL-') + result.name + '.png') });
      report.cases.push(result); writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
      console.log((result.passed ? 'PASS ' : 'FAIL ') + result.name + (result.error ? ' ' + result.error.split('\n')[0] : ''));
    };
    await page.goto(url + '/?renderer=canvas&room=1-4&style=tinker&mode=free'); await page.waitForFunction(() => window.pm?.dev && window.pm.room);
    await page.evaluate(() => { Object.assign(window.pm.dev.save.settings, { muted: true, readAloud: false, music: 0, sfx: 0, voice: 0, calm: true, coop: 'off' }); window.pm.dev.persist(); });

    await check('still-clock-tap-is-an-impulse', async () => {
      const initial = await setup('1-4', 'tinker'); physical(initial);
      assert(initial.geometry.beat === 0 && initial.views[0].motion.angle === 0 && initial.views[0].motion.velocity === 0, 'Stopped clock already swings/ticks');
      await drag(initial.views[0], { x: initial.views[0].x + 110, y: initial.views[0].y + 100 });
      const ignored = await read(); assert(!ignored.state.pushed && ignored.state.notches.p === initial.state.notches.p, 'Tap-only board lets a drag change its length/start it');
      await tap(ignored.views[0]); const pushed = await read();
      assert(!pushed.fixed && Math.abs(pushed.views[0].motion.angle) < .1 && Math.abs(pushed.views[0].motion.velocity) > .1, 'Tap teleports to a turning point or immediately wins');
      const completed = await complete(); physical(completed);
      assert(completed.geometry.observed >= 3 && completed.geometry.clockSeconds === completed.geometry.beat, 'Clock hands/ticks disagree');
      return { initial, pushed, completed };
    });
    await check('missing-anchor-stops-clock-and-cannot-win', async () => {
      const initial = await setup('1-4', 'fixer'); await tap(initial.views[0]);
      const pushed = await read(); await page.waitForTimeout(3200); const after = await read(); physical(after);
      assert(after.state.pushed && !after.state.pallet && !after.fixed && after.geometry.beat === 0 && after.geometry.clockSeconds === 0, 'Unfitted escapement advances clock or wins');
      const energy = s => { const m=s.views[0].motion,l=s.geometry.views[0].lengthM; return .5*m.velocity**2+9.81/l*(1-Math.cos(m.angle)); };
      assert(energy(after) < energy(pushed) * .65, 'Missing escapement gives the bob perpetual motion');
      return { initial, pushed, after };
    });
    await check('fitted-anchor-contacts-wheel-and-three-ticks-start-clock', async () => {
      await setup('1-4', 'fixer'); const fitted = await fit(); physical(fitted);
      assert(fitted.state.pallet && !fitted.state.pushed && fitted.geometry.beat === 0, 'Fitting alone falsely starts the clock');
      const g=fitted.geometry, distance=Math.hypot(g.palletTarget.x-35-g.wheel.x,g.palletTarget.y-25-g.wheel.y);
      assert(Math.abs(distance-g.wheel.radius)<3, 'Anchor tips float away from the wheel teeth');
      await tap(fitted.views[0]); return { fitted, completed: await complete() };
    });
    await check('anchor-removal-undo-is-one-action', async () => {
      await setup('1-4', 'fixer'); const fitted=await fit();
      const removed=await drag(fitted.pallet,fitted.palletHome); assert(!removed.state.pallet, 'Installed anchor cannot be removed');
      const restored=await undo(); assert(restored.state.pallet&&!restored.fixed, 'One Undo did not restore fitted anchor');
      await tap(restored.views[0]); return { removed, restored, completed: await complete() };
    });
    await check('tempo-bob-holds-and-longer-is-slower', async () => {
      const initial=await setup('1-4'); const long=await length('p',10,true); physical(long);
      assert(long.meter.includes('too slow') && !long.fixed && long.geometry.views[0].lengthM > initial.geometry.views[0].lengthM, 'Long setting does not visibly slow the clock');
      const correct=await length('p',6,true); assert(correct.meter.includes('same beat'), 'Correct length/readout disagree');
      return { initial, long, correct, completed:await complete() };
    });
    await check('tempo-edit-and-undo-do-not-award-stale-success', async () => {
      await setup('1-4'); const target=await length('p',6); const wrong=await length('p',10);
      await page.waitForTimeout(2500); const after=await read(); assert(!after.fixed&&after.geometry.observed===0, 'Wrong edited tempo receives old success');
      const restored=await undo(); assert(restored.state.notches.p===6&&!restored.fixed, 'Tempo Undo did not restore the previous length without stale win');
      return { target, wrong, after, restored, completed:await complete() };
    });
    await check('sync-wrong-release-and-equal-lengths-need-common-release', async () => {
      await setup('8-4','fixer'); await tap({x:1180,y:600}); await page.waitForTimeout(2200);
      const wrong=await read(); assert(!wrong.fixed&&wrong.geometry.observed===0, 'Different lengths complete');
      await length('b',5,true); await page.waitForTimeout(2500); const matched=await read(); physical(matched);
      assert(!matched.fixed&&!matched.state.pushed, 'Matching length magically completes without a shared release');
      const [a,b]=matched.views;
      assert(Math.abs(a.motion.angle-b.motion.angle)+Math.abs(a.motion.velocity-b.motion.velocity)>.02, 'Matching lengths silently copies phase');
      await tap({x:1180,y:600}); const released=await wait(s=>s.state.pushed&&!s.geometry.preparingRelease,'Common release did not finish positioning the bobs');
      assert(close(released.views[0].motion.angle,released.views[1].motion.angle)&&close(released.views[0].motion.velocity,released.views[1].motion.velocity)&&!released.fixed, 'Shared release is not visible or awards an instant win');
      const completed=await complete(); physical(completed); assert(close(completed.views[0].y,completed.views[1].y), 'Completed bridge tilts despite synchronised motion');
      return {wrong,matched,released,completed};
    });
    await check('sync-undo-cancels-release-trial', async () => {
      await setup('8-4'); await length('b',5); await tap({x:1180,y:600}); const released=await read();
      const undone=await undo(); await page.waitForTimeout(2500); const after=await read();
      assert(!undone.state.pushed&&!after.fixed, 'Undo left a stale shared-release win');
      await tap({x:1180,y:600}); return {released,undone,after,completed:await complete()};
    });
    await check('two-bob-tinker-starts-together-from-second-bob', async () => {
      const initial=await setup('8-4','tinker'); assert(initial.state.notches.a===initial.state.notches.b, 'Tinker bridge starts with mismatched lengths');
      await tap(initial.views[1]); const pushed=await read();
      assert(pushed.views.every(v=>Math.abs(v.motion.velocity)>.1)&&close(pushed.views[0].motion.angle,pushed.views[1].motion.angle), 'Second bob does not give both the shared impulse');
      const completed=await complete(); physical(completed); assert(close(completed.views[0].y,completed.views[1].y), 'Tinker bridge does not remain level');
      return {initial,pushed,completed};
    });
    await context.close();
  }
} finally {
  report.passed=report.cases.filter(c=>c.passed).length; report.failed=report.cases.length-report.passed;
  writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2)); await browser.close();
}
console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors.length,report:resolve(out,'report.json')}));
if(report.failed||report.errors.length)process.exitCode=1;
