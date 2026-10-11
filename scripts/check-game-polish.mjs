/** Story/lifecycle regressions and rendered stage evidence. Isolated browser saves only. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runnerImport } from 'vite';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = process.env.PLAYWRIGHT_MODULE ? await import(process.env.PLAYWRIGHT_MODULE) : require('playwright'); }
catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const args = process.argv.slice(2);
const opt = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback;
const base = opt('url', 'http://127.0.0.1:4174'), out = resolve(opt('out', '.qa/full-improvement/regressions'));
const { module: { STORIES } } = await runnerImport(resolve('src/content/story.ts'), { configFile: false, logLevel: 'silent' });
mkdirSync(out, { recursive: true });
const report = { checks: [], stages: [], errors: [] };
const assert = (ok, message) => { if (!ok) throw Error(message); };
const browser = await playwright.chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }), args: ['--disable-gpu'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
  page.on('pageerror', error => report.errors.push(String(error)));
  await page.goto(`${base}/?renderer=canvas&room=6-5&style=fixer&mode=free`);
  await page.waitForFunction(() => window.pm?.room?.roomId === '6-5');
  const pointers = await page.evaluate(() => window.pm.game.input.pointers.length);
  for (let i = 0; i < 24; i++) {
    await page.evaluate(i => window.pm.dev.go(i % 2 ? 'room-gear' : 'room-cards', { launch: { roomId: i % 2 ? '1-2' : '6-5', mode: 'free' } }), i);
    await page.waitForFunction(() => !!window.pm.room);
  }
  const after = await page.evaluate(() => window.pm.game.input.pointers.length);
  assert(after === pointers, `Touch pointers grew from ${pointers} to ${after}`);
  report.checks.push({ name: '24 room transitions keep pointer allocation constant', pointers, after });

  await page.goto(`${base}/?renderer=canvas&room=6-5&style=fixer&mode=free`);
  await page.waitForFunction(() => window.pm?.room?.roomId === '6-5');
  await page.waitForFunction(() => window.pm.game.scene.getScene('room-cards').time.now > 2200);
  await page.mouse.click(56, 52, { delay: 70 });
  await page.waitForFunction(() => window.pm.game.scene.getScene('room-cards').menuOpen);
  const paused = await page.evaluate(() => { const s = window.pm.game.scene.getScene('room-cards'); return { elapsed: s.elapsed, queue: s.queue.length, paused: s.time.paused }; });
  await page.waitForTimeout(650);
  const still = await page.evaluate(() => { const s = window.pm.game.scene.getScene('room-cards'); return { elapsed: s.elapsed, queue: s.queue.length, paused: s.time.paused }; });
  assert(JSON.stringify(paused) === JSON.stringify(still), 'Dance or puzzle clock continued behind the menu');
  await page.mouse.click(820, 290, { delay: 70 });
  await page.waitForFunction(() => !window.pm.game.scene.getScene('room-cards').menuOpen);
  await page.waitForFunction(t => window.pm.game.scene.getScene('room-cards').elapsed > t, paused.elapsed);
  report.checks.push({ name: 'menu pauses dance, puzzle and hint clocks; resume restores play', passed: true });

  await page.waitForFunction(() => !window.pm.game.scene.getScene('room-cards').demoing);
  await page.evaluate(() => {
    const s = window.pm.game.scene.getScene('room-cards'), clear = s.scoreG.clear;
    window.__scoreClears = 0;
    s.scoreG.clear = function(...args) { window.__scoreClears++; return clear.apply(this, args); };
  });
  await page.waitForTimeout(650);
  const clears = await page.evaluate(() => window.__scoreClears);
  assert(clears <= 1, `Idle score redrawn ${clears} times`);
  report.checks.push({ name: 'idle dance score reuses its drawing', intervalMs: 650, redraws: clears });

  for (const story of STORIES) {
    await page.evaluate(id => { window.pm.dev.save.settings.muted = true; window.pm.dev.go('story', { id, next: { scene: 'shop' } }); }, story.id);
    await page.waitForFunction(() => window.pm.game.scene.getScene('story').cur === 0);
    await page.waitForFunction(() => !window.pm.game.scene.getScene('story').load.isLoading());
    const stage = await page.evaluate(() => {
      const s = window.pm.game.scene.getScene('story');
      s.time.paused = true;
      return { id: s.story.id, actors: [...s.cast.entries()].map(([who, actor]) => ({ who, x: actor.x, y: actor.y })), machine: s.machine?.id };
    });
    assert(stage.actors.every(a => Number.isFinite(a.x) && Number.isFinite(a.y)), `${story.id}: invalid actor placement`);
    if (story.id === 'r6-return') assert(stage.machine === 'bertie' && !stage.actors.some(a => a.who === 'bertie'), 'Bertie duplicated');
    await page.screenshot({ path: resolve(out, `story-${story.id}.png`) });
    report.stages.push(stage);
    await page.evaluate(() => { window.pm.game.scene.getScene('story').time.paused = false; });
  }

  await page.evaluate(() => window.pm.dev.go('story', { id: 'r6-return', next: { scene: 'shop' } }));
  await page.waitForFunction(() => window.pm.game.scene.getScene('story').cur === 0);
  await page.waitForFunction(() => { const s = window.pm.game.scene.getScene('story'); return s.time.now - s.shownAt > 400; });
  await page.mouse.click(1180, 640, { delay: 70 });
  await page.waitForFunction(() => window.pm.game.scene.getScene('story').cur === 1);
  await page.mouse.click(90, 640, { delay: 70 });
  const version = await page.evaluate(() => window.pm.game.scene.getScene('story').lineVersion);
  await page.waitForTimeout(900);
  assert(await page.evaluate(v => { const s = window.pm.game.scene.getScene('story'); return s.cur === 1 && s.lineVersion === v; }, version), 'Old narration advanced a replayed line');
  report.checks.push({ name: 'real Next and Replay taps do not permit stale auto-advance', passed: true });
  const balances = await page.evaluate(ids => {
    const save = window.pm.dev.save, p = save.profiles.find(p => p.id === save.active);
    p.repairs = [6]; p.seen = ids.filter(id => id !== 'r6-return');
    window.pm.dev.persist();
    return { shiny: p.shiny, owned: p.owned, repairs: p.repairs };
  }, STORIES.map(story => story.id));
  await page.goto(`${base}/?renderer=canvas&scene=shop`);
  await page.waitForFunction(() => window.pm?.scene === 'story' && window.pm.game.scene.getScene('story').story.id === 'r6-return');
  await page.evaluate(() => window.pm.next());
  await page.waitForFunction(() => window.pm.scene === 'rewards');
  await page.evaluate(() => window.pm.next());
  await page.waitForFunction(() => window.pm.scene === 'shop');
  const restored = await page.evaluate(() => {
    const save = window.pm.dev.save, p = save.profiles.find(p => p.id === save.active);
    return { shiny: p.shiny, owned: p.owned, repairs: p.repairs };
  });
  assert(JSON.stringify(restored) === JSON.stringify(balances), 'Recovered return duplicated rewards');
  report.checks.push({ name: 'reload recovers an interrupted return without duplicating rewards', passed: true });
  report.errors.push(...await page.evaluate(() => window.pm.errors));

  const ephemeral = await browser.newPage({ serviceWorkers: 'block' });
  ephemeral.on('pageerror', error => report.errors.push(String(error)));
  await ephemeral.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } }));
  await ephemeral.goto(`${base}/?renderer=canvas&room=1-2&style=tinker&mode=free`);
  await ephemeral.waitForFunction(() => window.pm?.room?.roomId === '1-2');
  await ephemeral.evaluate(() => window.pm.room.solve());
  await ephemeral.waitForFunction(() => window.pm.room.isFixed());
  report.errors.push(...await ephemeral.evaluate(() => window.pm.errors));
  await ephemeral.close();
  report.checks.push({ name: 'game remains playable when local storage throws', passed: true });
  assert(!report.errors.length, report.errors.join('\n'));
  console.log(JSON.stringify({ checks: report.checks, stages: report.stages.length, errors: report.errors }, null, 2));
} finally {
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
