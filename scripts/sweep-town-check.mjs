/** Town regression: fixture saves only, then real landmark presses and read-only inspection. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(`--${key}`) ? args[args.indexOf(`--${key}`) + 1] : fallback;
const base = option('url', 'http://127.0.0.1:4176');
const out = resolve(option('out', '.qa/town-repair-art'));
mkdirSync(out, { recursive: true });
const report = { input: 'real mouse/touch landmark presses; save and scene fixtures only', cases: [] };
const browser = await playwright.chromium.launch({ channel: 'chrome', args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const assert = (value, message) => { if (!value) throw new Error(message); };

try {
  for (const device of ['desktop', 'phone']) for (const state of ['early', 'all']) {
    const context = await browser.newContext({ viewport: device === 'phone' ? { width: 667, height: 375 } : { width: 1280, height: 720 }, hasTouch: device === 'phone' });
    const page = await context.newPage();
    const entry = { device, state, passed: false };
    try {
      await page.goto(`${base}/?renderer=canvas&scene=shop`);
      await page.waitForFunction(() => window.pm?.dev && window.pm.scene === 'shop');
      const repairs = state === 'early' ? [1] : [1, 2, 3, 4, 5, 6, 7, 8];
      await page.evaluate(repairs => {
        const save = window.pm.dev.save, p = save.profiles.find(p => p.id === save.active);
        p.repairs = repairs; p.style = 'fixer';
        Object.assign(save.settings, { voice: 0, music: 0, sfx: 0, muted: true, subtitles: 'on' });
        window.pm.dev.go('town');
      }, repairs);
      await page.waitForFunction(() => window.pm.scene === 'town');
      await page.waitForFunction(() => {
        const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'town');
        return sc.children.list.filter(o => o.name?.startsWith('town:machine:')).length === 8 && [...sc.machines.values()].every(m => m.painted?.visible);
      });
      await page.waitForFunction(() => window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'town').cameras.main.fadeEffect.isComplete);
      const snapshot = () => page.evaluate(() => {
        const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'town');
        const p = window.pm.dev.save.profiles.find(p => p.id === window.pm.dev.save.active);
        return { repairs: p.repairs, oldOverlay: !!sc.live,
          machines: [...sc.machines.values()].map(m => ({ id: m.id, repair: m.getData('repair'), working: m.working, performing: m.performing, t: m.t, painted: m.painted.visible, fallback: m.list.find(o => o.texture?.key.startsWith('copper-moss:machine:'))?.visible })),
          landmarks: sc.children.list.filter(o => o.name?.startsWith('town:visit:')).map(o => ({ x: o.x, y: o.y, repair: o.getData('repair') })),
          postcards: sc.children.list.filter(o => o.active && o.name?.startsWith('town:postcard:')).map(o => ({ name: o.name, x: o.x, y: o.y })),
          errors: window.pm.errors,
        };
      });
      const tap = async (x, y) => {
        const canvas = await page.locator('canvas').boundingBox();
        const point = { x: canvas.x + x * canvas.width / 1280, y: canvas.y + y * canvas.height / 720 };
        if (device === 'phone') await page.touchscreen.tap(point.x, point.y);
        else await page.mouse.click(point.x, point.y, { delay: 75 });
        await page.waitForTimeout(50);
      };
      const before = await snapshot();
      assert(!before.oldOverlay, 'Old primitive town animation layer remains');
      assert(before.machines.length === 8 && before.machines.every(m => m.painted && !m.fallback), 'Town has duplicate or missing machine art');
      assert(before.machines.every(m => m.working === repairs.includes(m.repair)), 'Unrepaired objects are working');
      await page.screenshot({ path: resolve(out, `${device}-${state}-map.png`) });
      const replay = [];
      for (const landmark of before.landmarks.filter(l => repairs.includes(l.repair))) {
        await tap(landmark.x, landmark.y);
        await page.waitForFunction(repair => {
          const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'town');
          return sc.machines.get(repair).performing > 0;
        }, landmark.repair);
        await page.waitForTimeout(400);
        const first = (await snapshot()).machines.find(m => m.repair === landmark.repair).performing;
        await tap(landmark.x, landmark.y);
        const repeated = (await snapshot()).machines.find(m => m.repair === landmark.repair).performing;
        assert(repeated > first, `Repair ${landmark.repair} did not replay with postcard open`);
        replay.push({ repair: landmark.repair, first, repeated });
      }
      if (state === 'early') {
        const closed = before.landmarks.find(l => l.repair === 3);
        await tap(closed.x, closed.y);
        assert((await snapshot()).machines.find(m => m.repair === 3).performing === 0, 'Unrepaired train performed');
      }
      await page.waitForTimeout(500);
      const after = await snapshot();
      assert(after.postcards.length === 1, `Expected one visit postcard, got ${after.postcards.length}`);
      assert(JSON.stringify(after.repairs) === JSON.stringify(repairs), 'Landmark presses changed repair progression');
      assert(after.errors.length === 0, after.errors.join('\n'));
      await page.screenshot({ path: resolve(out, `${device}-${state}-visit.png`) });
      entry.details = { before, after, replay }; entry.passed = true;
    } catch (error) {
      entry.error = error.stack ?? String(error);
      await page.screenshot({ path: resolve(out, `FAILED-${device}-${state}.png`) });
    } finally { await context.close(); }
    report.cases.push(entry);
    writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`${entry.passed ? 'PASS' : 'FAIL'} ${device} ${state}${entry.error ? ` ${entry.error.split('\n')[0]}` : ''}`);
  }
} finally { await browser.close(); }
if (report.cases.some(entry => !entry.passed)) process.exitCode = 1;
