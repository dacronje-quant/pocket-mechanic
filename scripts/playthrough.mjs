#!/usr/bin/env node
/**
 * Automated playthrough in headless Chromium: starts from an empty save,
 * makes a profile on the title screen, plays the story from the prologue
 * through the Great Repairs (applying each room's authored solution through
 * the room's own pipeline via window.pm), visits every hub scene, and fails
 * on any page error. Screenshots go to the output folder.
 *
 *   npm run dev            # in another terminal (or point at a preview build)
 *   node scripts/playthrough.mjs [--url http://localhost:5173] [--repairs 8] [--out playthrough] [--style fixer]
 *
 * Needs Playwright (`npm i -D playwright`, or set PLAYWRIGHT_MODULE to an
 * installed copy) and a Chromium (set CHROMIUM_PATH to use a specific one).
 * Software GL is slow, so the script waits on game state, never on fixed
 * delays alone.
 */
import { mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const URL_BASE = opt('url', 'http://localhost:5173');
const REPAIRS = Number(opt('repairs', '8'));
const OUT = opt('out', 'playthrough');
const STYLE = opt('style', 'fixer');
mkdirSync(OUT, { recursive: true });

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
});

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s]`, ...a);
const scene = () => page.evaluate(() => window.pm?.scene ?? '');
const waitScene = (pred, timeout = 60000) =>
  page.waitForFunction((src) => new Function('s', `return ${src}`)(window.pm?.scene ?? ''), pred, { timeout });
const hot = (name) => page.evaluate((n) => window.pm.hot[n]?.(), name);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const check = (where) => {
  if (errors.length) {
    console.error(`✗ errors at ${where}:\n  ${errors.join('\n  ')}`);
    process.exitCode = 1;
    errors.length = 0;
  }
};

// a clean start: no save at all
await page.goto(URL_BASE);
await page.evaluate(() => {
  try {
    localStorage.clear();
  } catch {
    /* no storage */
  }
});
await page.goto(URL_BASE);
await waitScene("s === 'title'");
await page.mouse.click(640, 600); // the first tap unlocks sound
await page.waitForFunction(() => window.pm.hot.colour0, null, { timeout: 30000 });
await shot('01-new-profile');
await hot('colour0');
await page.waitForFunction(() => window.pm.hot.lettersNext, null, { timeout: 30000 });
await hot('lettersNext');
await page.waitForFunction((s) => window.pm.hot[`style-${s}`], STYLE, { timeout: 30000 });
await hot(`style-${STYLE}`);
log('profile made');
check('title');

let fixedRooms = 0;
let repairsDone = 0;
let lastScene = '';
const deadline = Date.now() + 4 * 3600 * 1000;
while (Date.now() < deadline) {
  const s = await scene();
  if (s !== lastScene) {
    log('scene', s, s.startsWith('room') ? await page.evaluate(() => window.pm.room?.roomId) : '');
    lastScene = s;
  }
  if (s === 'story' || s === 'reveal' || s === 'rewards' || s === 'festival') {
    await page.waitForTimeout(1200);
    if (s === 'rewards') repairsDone++;
    await shot(`story-${String(repairsDone).padStart(2, '0')}-${s}-${Date.now() % 100000}`);
    await page.evaluate(() => window.pm.next?.());
    await page.waitForFunction((was) => window.pm.scene !== was, s, { timeout: 30000 }).catch(() => undefined);
  } else if (s.startsWith('room-')) {
    const id = await page.evaluate(() => window.pm.room?.roomId);
    if (!id) {
      await page.waitForTimeout(300);
      continue;
    }
    await page.waitForTimeout(500);
    await page.evaluate(() => window.pm.room.solve());
    await page.waitForFunction(() => window.pm.room?.isFixed(), null, { timeout: 180000 });
    fixedRooms++;
    // the "Fixed!" banner offers Next (a Big Fix goes straight on to the Test Run)
    const moved = await page
      .waitForFunction((rid) => window.pm.next || window.pm.room?.roomId !== rid, id, { timeout: 30000 })
      .then(() => true, () => false);
    if (fixedRooms % 7 === 1) await shot(`room-${id}`);
    check(`room ${id}`);
    // press Next only if still in this room (a Big Fix has already moved on to its Test Run)
    if (moved) await page.evaluate((rid) => window.pm.room?.roomId === rid && window.pm.next?.(), id);
    await page.waitForFunction((rid) => window.pm.room?.roomId !== rid, id, { timeout: 30000 }).catch(() => undefined);
  } else if (s === 'shop') {
    await page.waitForTimeout(800);
    if (repairsDone >= REPAIRS) break;
    const hasJob = await page.evaluate(() => !!window.pm.hot.job);
    if (!hasJob) break;
    await shot(`shop-after-${repairsDone}`);
    await hot('job');
    await page.waitForFunction(() => window.pm.scene !== 'shop', null, { timeout: 30000 });
  } else {
    await page.waitForTimeout(500);
  }
}
log(`story done: ${repairsDone} repairs, ${fixedRooms} rooms`);
check('story');

// every hub scene, in the state the story left them
await waitScene("s === 'shop'");
for (const area of ['shelf', 'pedia', 'nook', 'paint', 'window', 'bench', 'quick', 'attic']) {
  const ok = await page.evaluate((a) => !!window.pm.hot[a], area);
  if (!ok) continue;
  await hot(area);
  await page.waitForFunction(() => window.pm.scene !== 'shop', null, { timeout: 30000 }).catch(() => undefined);
  if ((await scene()) === 'story') await page.evaluate(() => window.pm.next?.());
  await page.waitForTimeout(2500);
  await shot(`hub-${area}`);
  log('visited', area, '→', await scene());
  check(area);
  await page.evaluate(() => window.pm.dev.go('shop'));
  await waitScene("s === 'shop'");
}

// one Quick Fix, start to finish
await page.evaluate(() => window.pm.dev.go('quickfixes'));
await waitScene("s === 'quickfixes'");
await hot('qf-hinge');
await page.waitForFunction(() => window.pm.room?.roomId === 'qf-hinge', null, { timeout: 30000 });
await page.waitForTimeout(500);
await page.evaluate(() => window.pm.room.solve());
await page.waitForFunction(() => window.pm.room?.bannerShown(), null, { timeout: 120000 });
await shot('quick-fix-done');
check('quick fix');

const pmErrors = await page.evaluate(() => window.pm.errors);
if (pmErrors.length) {
  console.error('✗ window.pm.errors:', pmErrors);
  process.exitCode = 1;
}
log(process.exitCode ? 'FAILED' : 'playthrough OK');
await browser.close();
