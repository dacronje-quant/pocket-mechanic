/** Real-input parental-gate regression for painted art and its offline fallback. */
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
const { chromium } = playwright;
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback;
const base = option('url', 'http://127.0.0.1:4176');
const out = resolve(option('out', '.qa/sweep/parental-gate'));
mkdirSync(out, { recursive: true });
const report = { url: base, input: 'real mouse and touch gestures; scene/save fixtures only', cases: [], errors: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }), args: ['--disable-gpu'] });

try {
  for (const kind of ['mouse', 'touch']) {
    const context = await browser.newContext(kind === 'mouse' ? { viewport: { width: 1280, height: 720 } } : { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    // Let the procedural gate appear first, then replace its panel with real art.
    await context.route('**/art/ui-surfaces-v2.webp', async route => { await new Promise(resolve => setTimeout(resolve, 4500)); await route.continue(); });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ kind, error: String(error) }));
    const cdp = kind === 'touch' ? await context.newCDPSession(page) : null;
    const at = (x, y) => page.evaluate(({ x, y }) => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x + x * r.width / 1280, y: r.y + y * r.height / 720 }; }, { x, y });
    const tap = async (x, y) => { const p = await at(x, y); if (kind === 'touch') await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y, { delay: 100 }); await page.waitForTimeout(150); };
    const press = async (x, y) => { const p = await at(x, y); if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] }); else { await page.mouse.move(p.x, p.y); await page.mouse.down(); } };
    const release = async () => { if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up(); await page.waitForTimeout(120); };
    const state = () => page.evaluate(() => {
      const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === window.pm.scene);
      const modal = sc.children.list.filter(object => object.depth >= 8000);
      const question = modal.find(object => object.type === 'Text' && /^What is \d+ \+ \d+\?$/.test(object.text));
      return { scene: window.pm.scene, count: modal.length, question: question?.text, updates: sc.events.listenerCount('update'), pendingGateTick: sc.events.listeners('update').includes(window.__gateTick), objects: modal.map(object => ({ type: object.type, depth: object.depth, text: object.text ?? object.getData?.('icon')?.text, texture: object.texture?.key, x: object.x, y: object.y, visible: object.visible, alpha: object.alpha })) };
    });
    const foreground = async () => {
      const s = await state(), panel = s.objects.find(object => object.type === 'Image' && object.texture === 'art:ui-surfaces');
      assert(panel, 'Painted gate panel did not load');
      const controls = s.objects.filter(object => object.type === 'Text' || object.type === 'Container');
      assert(controls.some(object => object.text === 'For grown-ups') && controls.some(object => object.text === '✕'), 'Gate heading/cancel missing');
      assert(controls.every(object => object.visible && object.alpha > .99 && object.depth > panel.depth), `Painted panel covers controls: ${JSON.stringify(s.objects)}`);
      return s;
    };
    const check = async (name, callback) => {
      const result = { name: `${kind}-${name}`, passed: false };
      try { result.details = await callback(); result.passed = true; }
      catch (error) { result.error = error.stack ?? String(error); }
      report.cases.push(result);
      await page.screenshot({ path: resolve(out, `${result.passed ? 'PASS' : 'FAIL'}-${result.name}.png`) });
      console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? ` ${result.error.split('\n')[0]}` : ''}`);
      writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
    };
    await page.goto(`${base}/?renderer=canvas&scene=shop`);
    await page.waitForFunction(() => window.pm?.scene === 'shop' && window.pm.dev);
    await page.evaluate(() => { Object.assign(window.pm.dev.save.settings, { muted: true, readAloud: false, calm: true }); window.pm.dev.persist(); });
    const open = async () => {
      await page.evaluate(() => { window.__beforeGateUpdates = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'shop').events.listeners('update'); });
      await tap(1226, 52);
      await page.waitForFunction(() => window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'shop').children.list.some(object => object.type === 'Text' && object.text === 'Press and hold the key for 2 seconds.'));
      // Keep the listener itself: a loader can finish during the test and remove
      // its unrelated update listener, so total listener counts are unstable.
      await page.evaluate(() => { window.__gateTick = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'shop').events.listeners('update').find(fn => !window.__beforeGateUpdates.includes(fn)); });
      assert((await state()).pendingGateTick, 'Hold timer listener was not registered');
    };
    const holdToSum = async () => {
      await press(640, 390);
      try { await page.waitForFunction(() => window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'shop').children.list.some(object => object.type === 'Text' && /^What is \d+ \+ \d+\?$/.test(object.text)), null, { timeout: 10000 }); }
      finally { await release(); }
      const s = await foreground();
      const sum = s.question.match(/\d+/g).map(Number).reduce((a, b) => a + b);
      const answers = s.objects.filter(object => object.type === 'Container' && /^\d+$/.test(object.text));
      assert(answers.length === 3, 'Expected three visible sum answer controls');
      return { sum, answers, question: s.question };
    };

    await check('fallback-and-painted-gate-visible-and-cancel', async () => {
      await open();
      const fallback = await state();
      assert(fallback.objects.some(object => object.text === 'For grown-ups') && fallback.objects.some(object => object.text === '🔑'), 'Fallback gate heading/key missing');
      await page.waitForFunction(() => window.pm.game.textures.exists('art:ui-surfaces'), null, { timeout: 15000 });
      // A late core preload may leave the already-open card on its procedural
      // fallback. Cancel it and reopen from the warm cache to exercise the async
      // painted callback that previously covered all later labels and buttons.
      await tap(930, 180);
      assert((await state()).count === 0, 'Fallback cancel did not close the gate');
      await open();
      await page.waitForFunction(() => window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'shop').children.list.some(object => object.depth >= 8000 && object.type === 'Image' && object.texture.key === 'art:ui-surfaces'));
      await page.waitForTimeout(150);
      const s = await foreground();
      assert(s.objects.some(object => object.text === '🔑'), 'Visible hold key missing');
      await page.screenshot({ path: resolve(out, `${kind}-painted-gate.png`) });
      await press(640, 390); await page.waitForTimeout(450); await release();
      await tap(930, 180);
      const closed = await state();
      assert(closed.scene === 'shop' && closed.count === 0 && !closed.pendingGateTick, `Cancel left a gate/update listener: ${JSON.stringify(closed)}`);
      return { panelDepth: s.objects.find(object => object.texture === 'art:ui-surfaces').depth, controlsVisible: true, updates: closed.updates };
    });
    await check('short-hold-stays-locked', async () => {
      await open(); await press(640, 390); await page.waitForTimeout(700); await release(); await page.waitForTimeout(1000);
      const s = await state();
      assert(!s.question && s.scene === 'shop' && s.objects.some(object => object.text === '🔑'), 'Short hold bypassed the gate');
      await tap(930, 180);
      return { lockedAfterShortHold: true };
    });
    await check('wrong-answer-stays-in-shop', async () => {
      await open(); const question = await holdToSum();
      await page.screenshot({ path: resolve(out, `${kind}-sum-challenge.png`) });
      const wrong = question.answers.find(object => Number(object.text) !== question.sum);
      await tap(wrong.x, wrong.y);
      const closed = await state();
      assert(closed.scene === 'shop' && closed.count === 0 && !closed.pendingGateTick, `Wrong answer entered settings or retained gate: ${JSON.stringify(closed)}`);
      return { question: question.question, answer: wrong.text, stayedInShop: true };
    });
    await check('sum-cancel-removes-gate', async () => {
      await open(); await holdToSum(); await tap(930, 180);
      const closed = await state();
      assert(closed.scene === 'shop' && closed.count === 0 && !closed.pendingGateTick, `Sum-stage cancel did not clean up: ${JSON.stringify(closed)}`);
      return { cancelledAtSum: true };
    });
    await check('correct-answer-opens-settings', async () => {
      await open(); const question = await holdToSum(); const correct = question.answers.find(object => Number(object.text) === question.sum);
      await tap(correct.x, correct.y);
      await page.waitForFunction(() => window.pm.scene === 'grownups');
      await page.waitForTimeout(400);
      await page.screenshot({ path: resolve(out, `${kind}-grownups.png`) });
      await tap(56, 52); await page.waitForFunction(() => window.pm.scene === 'shop');
      assert((await state()).count === 0, 'Settings return retained the gate');
      return { question: question.question, enteredSettingsAndReturned: true };
    });
    await check('title-gate-cancel', async () => {
      await page.waitForTimeout(400);
      await page.evaluate(() => window.pm.dev.go('title')); await page.waitForFunction(() => window.pm.scene === 'title' && window.pm.game.scene.getScenes(true).some(scene => scene.scene.key === 'title')); await page.waitForTimeout(500);
      await tap(60, 660); await page.waitForTimeout(200);
      await foreground(); await tap(930, 180);
      const s = await state(); assert(s.scene === 'title' && s.count === 0, 'Title cancel changed scene or retained gate');
      return { titleGateVisibleAndCancelled: true };
    });
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}
const failed = report.cases.filter(test => !test.passed);
console.log(JSON.stringify({ cases: report.cases.length, passed: report.cases.length - failed.length, failed: failed.length, errors: report.errors.length, report: resolve(out, 'report.json') }));
if (failed.length || report.errors.length) process.exitCode = 1;
