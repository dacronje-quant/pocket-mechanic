#!/usr/bin/env node
/**
 * Touch-only playthrough on emulated phones and tablets (Playwright, hasTouch,
 * isMobile). Unlike scripts/playthrough.mjs, every menu, button and story step
 * is driven by real touchscreen taps at the object's on-screen position, so
 * it catches buttons that are covered, too small, off-screen or dead, frozen
 * game loops and soft-locks. Puzzles are completed with each room's authored
 * solution (window.pm.room.solve(), which runs through the room's own
 * pipeline); everything around them is tapped.
 *
 *   npm run dev                                  # in another terminal
 *   node scripts/touch-playthrough.mjs [--url http://localhost:5173]
 *        [--device phone|tablet|phone-portrait|tablet-portrait|all] [--repairs 8] [--out touch-playthrough]
 *        [--webgl]   # default uses ?renderer=canvas, which is ~20× faster under headless software GL
 *
 * Needs `playwright` or `playwright-core` (PLAYWRIGHT_MODULE to override) and a
 * Chromium (CHROMIUM_PATH). Exits non-zero on any page error, console error,
 * frozen loop or stuck state.
 */
import { mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const URL_BASE = opt('url', 'http://localhost:5173');
const REPAIRS = Number(opt('repairs', '8'));
const OUT = opt('out', 'touch-playthrough');
const WEBGL = argv.includes('--webgl');
const DEVICES = {
  phone: { width: 667, height: 375 },
  tablet: { width: 1024, height: 768 },
  'phone-portrait': { width: 375, height: 667 },
  'tablet-portrait': { width: 768, height: 1024 },
};
const which = opt('device', 'phone');
const runList = which === 'all' ? Object.keys(DEVICES) : which.split(',');
mkdirSync(OUT, { recursive: true });

let pw;
try {
  pw = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
} catch {
  pw = await import('playwright-core');
}
const { chromium } = pw;

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(5)}s]`, ...a);
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`✗ ${msg}`);
};

async function run(device) {
  const vp = DEVICES[device];
  const portrait = vp.height > vp.width;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: WEBGL ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] : ['--disable-gpu'],
  });
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.stack ?? e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  const check = (where) => {
    if (errors.length) {
      fail(`[${device}] errors at ${where}:\n  ${errors.join('\n  ')}`);
      errors.length = 0;
    }
  };
  const shot = (name) => page.screenshot({ path: `${OUT}/${device}-${name}.png` });
  const scene = () => page.evaluate(() => window.pm?.scene ?? '');

  /** Tappable objects in the running scenes, with on-screen (CSS px) centres and sizes. */
  const tappables = () =>
    page.evaluate(() => {
      const g = window.pm.game;
      const c = document.querySelector('#game canvas').getBoundingClientRect();
      const sx = c.width / 1280;
      const sy = c.height / 720;
      const out = [];
      for (const sc of g.scene.getScenes(true)) {
        for (const o of sc.input._list) {
          if (!o.active || !o.input?.enabled) continue;
          let vis = true;
          for (let q = o; q; q = q.parentContainer) if (!q.visible || q.alpha === 0) vis = false;
          if (!vis) continue;
          const ha = o.input.hitArea;
          let lx = 0;
          let ly = 0;
          let w = o.width;
          let h = o.height;
          if (ha && typeof ha.radius === 'number') {
            lx = ha.x - o.displayOriginX;
            ly = ha.y - o.displayOriginY;
            w = h = ha.radius * 2;
          } else if (ha && typeof ha.width === 'number') {
            lx = ha.x + ha.width / 2 - o.displayOriginX;
            ly = ha.y + ha.height / 2 - o.displayOriginY;
            w = ha.width;
            h = ha.height;
          }
          const m = o.getWorldTransformMatrix();
          const p = m.transformPoint(lx, ly);
          let label = '';
          const icon = o.getData?.('icon');
          if (icon?.text) label = icon.text;
          else if (o.list) {
            const t = o.list.find((k) => k.type === 'Text' && k.text);
            if (t) label = t.text;
          } else if (o.type === 'Text') label = o.text;
          // what is drawn on top: the outermost container's depth, then the child's
          let top = o;
          while (top.parentContainer) top = top.parentContainer;
          const depth = top.depth * 1000 + (top === o ? 0 : o.depth);
          out.push({ scene: sc.scene.key, label, gx: p.x, gy: p.y, x: c.left + p.x * sx, y: c.top + p.y * sy, w: w * Math.abs(m.scaleX) * sx, h: h * Math.abs(m.scaleY) * sy, depth });
        }
      }
      return out;
    });

  const vw = vp.width;
  const vh = vp.height;
  /** Tap the topmost tappable whose label matches (in the given scene). */
  const tapLabel = async (label, inScene) => {
    const list = (await tappables()).filter((t) => t.label === label && (!inScene || t.scene === inScene));
    if (!list.length) return false;
    const t = list.sort((a, b) => b.depth - a.depth)[0];
    if (t.x < 0 || t.y < 0 || t.x > vw || t.y > vh) fail(`[${device}] "${label}" in ${t.scene} is off-screen at ${t.x.toFixed(0)},${t.y.toFixed(0)}`);
    if (Math.min(t.w, t.h) < (device.startsWith('phone') && portrait ? 14 : 24)) smallTargets.add(`${t.scene}:${label} ${t.w.toFixed(0)}×${t.h.toFixed(0)}px`);
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForTimeout(150);
    return true;
  };
  /** Tap a game-space point (1280×720). */
  const tapAt = async (gx, gy) => {
    const r = await page.evaluate(() => {
      const c = document.querySelector('#game canvas').getBoundingClientRect();
      return { l: c.left, t: c.top, w: c.width, h: c.height };
    });
    await page.touchscreen.tap(r.l + (gx / 1280) * r.w, r.t + (gy / 720) * r.h);
    await page.waitForTimeout(150);
  };
  /** Wait until the scene is no longer `was` (true) or time runs out (false). */
  const leftScene = (was, timeout = 20000) =>
    page.waitForFunction((w) => window.pm.scene !== w, was, { timeout }).then(
      () => true,
      () => false,
    );
  /** The loop must keep running: a thrown error inside a frame used to stop it for good. */
  const alive = async (where) => {
    const a = await page.evaluate(() => window.pm.game.loop.frame);
    await page.waitForTimeout(600);
    const b = await page.evaluate(() => window.pm.game.loop.frame);
    if (b <= a) fail(`[${device}] game loop frozen at ${where}`);
  };
  const smallTargets = new Set();

  await page.goto(`${URL_BASE}/${WEBGL ? '' : '?renderer=canvas'}`);
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {
      /* no storage */
    }
  });
  await page.goto(`${URL_BASE}/${WEBGL ? '' : '?renderer=canvas'}`);
  await page.waitForFunction(() => window.pm?.scene === 'title', null, { timeout: 60000 });

  // Upright phone/tablet: the "turn me sideways" card must not be a dead end.
  if (portrait) {
    const shown = await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display !== 'none');
    if (shown) {
      await shot('00-rotate');
      const ok = await page.locator('#rotate .ok').boundingBox();
      await page.touchscreen.tap(ok.x + ok.width / 2, ok.y + ok.height / 2);
      await page.waitForTimeout(300);
      const still = await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display !== 'none');
      if (still) fail(`[${device}] rotate card cannot be dismissed`);
    }
  }

  // ── new profile, by touch: colour → letters (with backspace) → ▶ → Play Style ──
  await tapAt(500, 515);
  await page.waitForFunction(() => window.pm.hot.colour0, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await shot('01-colours');
  // a colour then ✕ straight away: the keypad must not appear on its own afterwards
  await tapAt(470, 250);
  await tapAt(1135, 112);
  await page.waitForTimeout(1500);
  if ((await tappables()).some((t) => t.label === 'A')) fail(`[${device}] keypad appeared after the panel was closed`);
  await tapAt(500, 515); // + : a new fixer, by touch
  await page.waitForFunction(() => window.pm.hot.colour0, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await tapAt(470 + 200, 250); // second colour
  await tapAt(470 + 200, 250); // a double tap must not build two keypads
  await page.waitForFunction(() => window.pm.hot.lettersNext, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  for (const k of ['S', 'A', 'X', '⌫', 'M', 'Q']) {
    if (!(await tapLabel(k, 'title'))) fail(`[${device}] keypad key ${k} not found`);
    // slow enough for a blink timer to fire between letters: this froze the game before
    await page.waitForTimeout(k === 'A' ? 4500 : 300);
  }
  const typed = await page.evaluate(() => window.pm.game.scene.getScene('title').children.list.find((o) => o.name === 'keypad-value')?.text);
  if (typed !== 'SAM') fail(`[${device}] initials should read SAM, got ${typed}`);
  await alive('letters');
  await shot('02-letters');
  await tapLabel('▶', 'title');
  await page.waitForFunction(() => window.pm.hot['style-fixer'], null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await tapAt(470 + 210, 360); // 🔧 Fixer
  if (!(await leftScene('title'))) fail(`[${device}] stuck on Play Style step`);
  log(device, 'profile made by touch');
  check('title');

  // ── the story, every button tapped ──
  let rooms = 0;
  let repairs = 0;
  let last = '';
  let sameFor = 0;
  const deadline = Date.now() + 3 * 3600 * 1000;
  while (Date.now() < deadline) {
    const s = await scene();
    if (s !== last) {
      log(device, 'scene', s, s.startsWith('room') ? await page.evaluate(() => window.pm.room?.roomId) : '');
      last = s;
      sameFor = 0;
    } else if (++sameFor > 60) {
      await shot(`stuck-${s}`);
      fail(`[${device}] stuck in ${s}`);
      break;
    }
    if (s === 'story' || s === 'reveal' || s === 'festival' || s === 'rewards') {
      if (s === 'rewards' && sameFor === 0) {
        repairs++;
        await page.waitForTimeout(600);
        await tapLabel('✓', 'rewards'); // wear the prize, if one is offered
      }
      // let the festival reach its credits parade before moving on
      await page.waitForTimeout(s === 'festival' && sameFor === 0 ? 15000 : 400);
      if (s === 'festival' && sameFor === 0) await shot('festival-credits');
      if (!(await tapLabel('▶', s))) await tapAt(640, 300); // story: a tap anywhere also moves on
      await leftScene(s, 1500);
    } else if (s.startsWith('room-')) {
      const id = await page.evaluate(() => window.pm.room?.roomId);
      if (!id) {
        await page.waitForTimeout(300);
        continue;
      }
      await page.waitForTimeout(400);
      if (rooms === 0) {
        // the in-room menu, by touch: open it and keep playing
        await tapLabel('⌂', s);
        await page.waitForTimeout(400);
        await shot('room-menu');
        if (!(await tapLabel('▶', s))) fail(`[${device}] room menu has no way back`);
        await page.waitForTimeout(400);
      }
      await page.evaluate(() => window.pm.room.solve());
      const fixed = await page.waitForFunction(() => window.pm.room?.isFixed(), null, { timeout: 180000 }).then(
        () => true,
        () => false,
      );
      if (!fixed) {
        await shot(`unsolved-${id}`);
        fail(`[${device}] room ${id} did not become fixed with its authored solution`);
        break;
      }
      rooms++;
      // the "Fixed!" banner (a Big Fix moves on to its Test Run by itself)
      const banner = await page.waitForFunction((rid) => window.pm.room?.bannerShown() || window.pm.room?.roomId !== rid, id, { timeout: 60000 }).then(
        () => true,
        () => false,
      );
      if (!banner) fail(`[${device}] no banner and no way on in ${id}`);
      await page.waitForTimeout(700);
      if (rooms % 9 === 1) await shot(`room-${id}`);
      if ((await page.evaluate(() => window.pm.room?.roomId)) === id) {
        if (!(await tapLabel('▶', s))) fail(`[${device}] no ▶ on the banner in ${id}`);
        if (!(await leftScene(s, 15000)) && (await page.evaluate(() => window.pm.room?.roomId)) === id) {
          await shot(`banner-${id}`);
          fail(`[${device}] ▶ on the banner did nothing in ${id}`);
          break;
        }
      }
      check(`room ${id}`);
    } else if (s === 'shop') {
      await page.waitForTimeout(800);
      if (repairs >= REPAIRS) break;
      const hasJob = await page.evaluate(() => !!window.pm.hot.job);
      if (!hasJob) break;
      if (sameFor === 0) await shot(`shop-after-${repairs}`);
      await tapAt(560, 427); // the job on the painted workbench surface
      if (!(await leftScene('shop', 8000))) await tapAt(118, 400); // or the door
      await leftScene('shop', 8000);
    } else {
      await page.waitForTimeout(500);
    }
  }
  log(device, `story: ${repairs} repairs, ${rooms} rooms`);
  check('story');
  await alive('end of story');

  // ── every hub area by touch, and back out with the on-screen back button ──
  const hubs = [
    ['shelf', 650, 160],
    ['bench', 650, 370],
    ['window', 1060, 220],
    ['paint', 950, 520],
    ['pedia', 1130, 500],
    ['nook', 330, 650],
    ['quick', 540, 655],
    ['attic', 640, 30],
  ];
  if ((await scene()) !== 'shop') await page.evaluate(() => window.pm.dev.go('shop'));
  await page.waitForFunction(() => window.pm.scene === 'shop', null, { timeout: 30000 });
  for (const [area, x, y] of hubs) {
    await page.waitForTimeout(700);
    const open = await page.evaluate((a) => !!window.pm.hot[`${a}:open`], area);
    if (!open) continue;
    await tapAt(x, y);
    if (!(await leftScene('shop', 10000))) {
      fail(`[${device}] tapping ${area} in the shop did nothing`);
      continue;
    }
    // a first visit may start with a short story
    for (let k = 0; k < 30 && (await scene()) === 'story'; k++) {
      await tapLabel('▶', 'story');
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1200);
    const where = await scene();
    await shot(`hub-${area}`);
    log(device, 'visited', area, '→', where);
    check(area);
    // back to the shop by touch: ⌂ / ← in the top-left
    const back = (await tappables()).filter((t) => t.scene === where && t.gx < 140 && t.gy < 120).sort((a, b) => b.depth - a.depth)[0];
    if (!back) fail(`[${device}] ${where} has no back button`);
    else {
      await page.touchscreen.tap(back.x, back.y);
      if (!(await leftScene(where, 10000))) fail(`[${device}] back button in ${where} did nothing`);
    }
    await page.waitForFunction(() => window.pm.scene === 'shop', null, { timeout: 15000 }).catch(() => fail(`[${device}] back from ${area} did not reach the shop`));
  }

  // ── a Quick Fix from its menu, by touch ──
  await page.evaluate(() => window.pm.dev.go('quickfixes'));
  await page.waitForFunction(() => window.pm.scene === 'quickfixes', null, { timeout: 30000 });
  await page.waitForTimeout(800);
  const qf = (await tappables()).filter((t) => t.scene === 'quickfixes' && t.gy > 150).sort((a, b) => a.gy - b.gy || a.gx - b.gx)[0];
  if (qf) await page.touchscreen.tap(qf.x, qf.y);
  if (await page.waitForFunction(() => window.pm.room, null, { timeout: 20000 }).then(() => true, () => false)) {
    await page.waitForTimeout(500);
    await page.evaluate(() => window.pm.room.solve());
    await page.waitForFunction(() => window.pm.room?.bannerShown(), null, { timeout: 120000 }).catch(() => fail(`[${device}] quick fix banner never showed`));
    await page.waitForTimeout(600);
    await tapLabel('⌂', await scene());
    await page.waitForFunction(() => window.pm.scene === 'shop', null, { timeout: 15000 }).catch(() => fail(`[${device}] ⌂ on the quick-fix banner did not return to the shop`));
  } else fail(`[${device}] could not open a quick fix by touch`);
  check('quick fix');

  // ── grown-ups: press-and-hold the key (a real 2.5 s touch), answer the sum, come back with ✓ ──
  await page.waitForTimeout(800);
  await tapAt(1226, 52); // ⚙
  await page.waitForTimeout(800);
  const key = (await tappables()).find((t) => t.label === '🔑');
  if (!key) fail(`[${device}] parental gate did not open`);
  else {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: key.x, y: key.y, id: 1 }] });
    await page.waitForTimeout(3000);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
    const sum = await page.evaluate(() => {
      for (const sc of window.pm.game.scene.getScenes(true)) {
        const t = sc.children.list.find((o) => o.type === 'Text' && /^What is \d+ \+ \d+\?$/.test(o.text));
        if (t) {
          const [a, b] = t.text.match(/\d+/g).map(Number);
          return a + b;
        }
      }
      return null;
    });
    if (sum == null) fail(`[${device}] holding the key did not reach the sum`);
    else {
      await tapLabel(String(sum));
      if (!(await page.waitForFunction(() => window.pm.scene === 'grownups', null, { timeout: 10000 }).then(() => true, () => false))) fail(`[${device}] right answer did not open the grown-ups page`);
      else {
        await page.waitForTimeout(800);
        await shot('grownups');
        await tapLabel('✓', 'grownups');
        await page.waitForFunction(() => window.pm.scene === 'shop', null, { timeout: 10000 }).catch(() => fail(`[${device}] ✓ on the grown-ups page did not go back`));
      }
    }
  }
  check('grown-ups');

  // ── back to the title via the profile badge, and in again with the profile card ──
  await page.waitForTimeout(800);
  await tapAt(60, 52);
  await page.waitForFunction(() => window.pm.scene === 'title', null, { timeout: 15000 }).catch(() => fail(`[${device}] profile badge did not open the title`));
  await page.waitForTimeout(1200);
  const card0 = (await tappables()).filter((t) => t.scene === 'title' && t.gy > 300 && t.gy < 540).sort((a, b) => a.gx - b.gx)[0];
  if (card0) await page.touchscreen.tap(card0.x, card0.y);
  if (!(await leftScene('title', 10000))) fail(`[${device}] tapping the profile card on the title did nothing`);
  check('title again');
  await alive('finish');

  const pmErrors = await page.evaluate(() => window.pm.errors);
  if (pmErrors.length) fail(`[${device}] window.pm.errors: ${pmErrors.join(' | ')}`);
  if (smallTargets.size) log(device, 'small tap targets (CSS px):', [...smallTargets].join(', '));
  await shot('zz-end');
  await browser.close();
}

for (const d of runList) {
  if (!DEVICES[d]) {
    fail(`unknown device ${d}`);
    continue;
  }
  log('──', d, DEVICES[d]);
  await run(d);
}
log(failures ? `FAILED (${failures})` : 'touch playthrough OK');
process.exitCode = failures ? 1 : 0;
