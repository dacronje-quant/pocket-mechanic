/** Browser regressions for real menu gestures and narration; no solve/action hooks. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runnerImport } from 'vite';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = process.env.PLAYWRIGHT_MODULE ? await import(process.env.PLAYWRIGHT_MODULE) : require('playwright'); }
catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const { chromium } = playwright;
const args = process.argv.slice(2);
const opt = (key, fallback) => args.includes(`--${key}`) ? args[args.indexOf(`--${key}`) + 1] : fallback;
const base = opt('url', 'http://127.0.0.1:4174');
const out = resolve(opt('out', '.qa/sweep/hubs'));
const only = opt('only', '');
mkdirSync(out, { recursive: true });
const load = async path => (await runnerImport(resolve(path), { configFile: false, logLevel: 'silent' })).module;
const { STORY_ROOMS } = await load('src/content/index.ts');
const { QUICK_FIXES } = await load('src/content/quickfixes.ts');
const { PEDIA } = await load('src/content/pedia.ts');
const { REPAIRS } = await load('src/content/repairs.ts');
const { STORIES } = await load('src/content/story.ts');
const { atticRooms } = await load('src/content/attic.ts');
const { effective } = await load('src/rules/index.ts');
const { roomVoice } = await load('src/content/roomVoice.ts');
const captionIds = opt('caption-ids', '').split(',').filter(Boolean);
const longInstructions = [...STORY_ROOMS, ...QUICK_FIXES.map(fix => fix.room), ...atticRooms()].map(room => {
  const voice = roomVoice(effective(room, 'engineer'), 'engineer');
  return { roomId: room.id, longest: Math.max(voice.intro.text.length, ...voice.hints.map(line => line.text.length)) };
}).filter(room => !captionIds.length || captionIds.includes(room.roomId)).sort((a, b) => b.longest - a.longest).slice(0, 18);
const atticIds = atticRooms().map(room => room.id);
const fixture = { rooms: [...STORY_ROOMS, ...QUICK_FIXES.map(fix => fix.room), ...atticRooms()].map(room => room.id), atticIds, pedia: PEDIA.map(entry => entry.id), seen: STORIES.map(story => story.id) };
const report = { started: new Date().toISOString(), input: 'real mouse clicks, drags and wheel events; save/scene fixtures only', cases: [], errors: [] };
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }), args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.stack ?? String(error)));

// Observe real recording start/stop/end without changing timing or playback.
await page.addInitScript(() => {
  const audio = window.__hubAudio = { events: [], sources: [] };
  const arrays = new WeakMap(), buffers = new WeakMap();
  const fetchOriginal = window.fetch;
  window.fetch = async function(...args) {
    const response = await fetchOriginal.apply(this, args);
    const url = String(args[0]);
    const array = response.arrayBuffer.bind(response);
    response.arrayBuffer = async () => { const data = await array(); arrays.set(data, url); return data; };
    return response;
  };
  const decode = AudioContext.prototype.decodeAudioData;
  AudioContext.prototype.decodeAudioData = function(data, success, error) {
    const url = arrays.get(data);
    const done = buffer => { buffers.set(buffer, url); success?.(buffer); };
    const result = decode.call(this, data, done, error);
    result?.then(buffer => buffers.set(buffer, url), () => undefined);
    return result;
  };
  const start = AudioBufferSourceNode.prototype.start;
  const stop = AudioBufferSourceNode.prototype.stop;
  const nodes = new WeakMap();
  AudioBufferSourceNode.prototype.start = function(...args) {
    const url = buffers.get(this.buffer);
    if (url?.includes('/voice/')) {
      const entry = { url, duration: this.buffer?.duration, started: performance.now(), stopped: false, ended: false };
      audio.sources.push(entry); nodes.set(this, entry); audio.events.push({ type: 'start', url });
      this.addEventListener('ended', () => { entry.ended = true; audio.events.push({ type: 'end', url }); });
    }
    return start.apply(this, args);
  };
  AudioBufferSourceNode.prototype.stop = function(...args) {
    const entry = nodes.get(this);
    if (entry) { entry.stopped = true; audio.events.push({ type: 'stop', url: entry.url }); }
    return stop.apply(this, args);
  };
});

const assert = (value, message) => { if (!value) throw new Error(message); };
const scene = () => page.evaluate(() => window.pm.game.scene.getScenes(true).find(scene => scene.scene.key === window.pm.scene)?.scene.key);
const inspect = callback => page.evaluate(callback);
const click = async (x, y) => { await page.mouse.click(x, y, { delay: 110 }); await page.waitForTimeout(180); };
const drag = async (from, to) => {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 14 }); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(120);
};
const wheel = async (x, y, amount) => { await page.mouse.move(x, y); await page.mouse.wheel(0, amount); await page.waitForTimeout(180); };
const grids = () => inspect(() => {
  const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === window.pm.scene);
  return sc.children.list.filter(object => object.getData?.('content')).map(object => ({ x: object.x, y: object.y, scroll: object.getData('content').y, count: object.getData('content').list.length }));
});
async function setup(key) {
  await page.evaluate(({ fixture, key }) => {
    const save = window.pm.dev.save, p = save.profiles.find(profile => profile.id === save.active);
    p.style = 'fixer'; p.repairs = [1, 2, 3, 4, 5, 6, 7, 8]; p.pedia = fixture.pedia; p.attic.rooms = fixture.atticIds;
    p.seen = fixture.seen;
    if (!p.flags.includes('festival')) p.flags.push('festival');
    p.rooms = Object.fromEntries(fixture.rooms.map(id => [id, { fixed: true, gold: [1, 2, 3], medal: 0 }]));
    Object.assign(save.settings, { voice: 1, sfx: 0, music: 0, muted: false, subtitles: 'on', readAloud: false, calm: true, coop: 'tess' });
    p.tools = ['beam', 'peek'];
    window.pm.dev.persist();
    window.pm.dev.go(key);
  }, { fixture, key });
  await page.waitForFunction(key => window.pm.scene === key, key);
  await page.waitForTimeout(700);
}
async function check(name, callback) {
  if (only && !only.split(',').some(filter => name.includes(filter))) return;
  const item = { name, passed: false };
  const started = Date.now();
  try { item.details = await callback(); item.passed = true; }
  catch (error) { item.error = error.stack ?? String(error); }
  item.seconds = +( (Date.now() - started) / 1000).toFixed(2);
  report.cases.push(item);
  await page.screenshot({ path: resolve(out, `${item.passed ? 'PASS' : 'FAIL'}-${name}.png`) });
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${item.passed ? 'PASS' : 'FAIL'} ${name}${item.error ? ` ${item.error.split('\n')[0]}` : ''}`);
}

try {
  await page.goto(`${base}/?renderer=canvas&scene=shelf`);
  await page.waitForFunction(() => window.pm?.dev && window.pm.scene === 'shelf');
  await setup('shelf');
  await check('tower-all-replays', async () => {
    const launches = [];
    for (const roomId of REPAIRS[7].rooms) for (const mode of ['playground', 'tuneup']) {
      await setup('shelf');
      await click(1075, 617); // visible tower base, not a debug callback
      await page.waitForFunction(() => window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'shelf').panel.length > 0);
      const button = await inspect(() => {
        const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'shelf');
        return sc.panel.filter(object => object.getData?.('icon') && Math.abs(object.y - 530) < 1).map(object => ({ x: object.x, y: object.y, icon: object.getData('icon').text, bounds: object.getBounds() }));
      });
      assert(button.length === 18, `Expected 18 controls; got ${button.length}`);
      const index = REPAIRS[7].rooms.indexOf(roomId) * 2 + (mode === 'tuneup' ? 1 : 0), target = button[index];
      assert(target.x >= 36 && target.x <= 1244, `${roomId} ${mode} button off canvas at ${target.x}`);
      await click(target.x, target.y);
      await page.waitForFunction(id => window.pm.room?.roomId === id, roomId, { timeout: 5000 });
      const launch = await inspect(() => window.pm.game.scene.getScenes(true).find(sc => sc.def)?.launch);
      assert(launch.mode === mode, `${roomId}: launched ${launch.mode} instead of ${mode}`);
      launches.push({ roomId, mode, x: target.x });
    }
    return launches;
  });

  for (const key of ['quickfixes', 'attic', 'pedia']) {
    await check(`${key}-viewport-input`, async () => {
      await setup(key);
      if (key === 'pedia') await click(80, 670); // actual Attic tab makes the collection overflow
      const before = (await grids())[0]; assert(before, 'No live scrolling collection');
      await wheel(640, 55, 120);
      const outside = (await grids())[0]; assert(outside.scroll === before.scroll, 'Wheel outside viewport changed scroll');
      await wheel(260, 380, 100);
      const inside = (await grids())[0]; assert(inside.scroll < before.scroll, 'Wheel inside viewport did not scroll');
      const stateBefore = await inspect(() => { const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === window.pm.scene); return { scene: window.pm.scene, page: sc.page?.length ?? sc.panel?.length ?? 0 }; });
      // First tile is partly above the visual mask after 100 px of scrolling.
      await click(key === 'quickfixes' ? 150 : key === 'attic' ? 133 : 260, 92);
      const stateAfter = await inspect(() => { const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === window.pm.scene); return { scene: window.pm.scene, page: sc.page?.length ?? sc.panel?.length ?? 0 }; });
      assert(JSON.stringify(stateAfter) === JSON.stringify(stateBefore), 'Clipped tile above viewport accepted a real tap');
      await drag({ x: 1220, y: 40 }, { x: 1220, y: 300 });
      assert((await grids())[0].scroll === inside.scroll, 'A drag that began outside viewport scrolled the collection');
      return { before: before.scroll, outside: outside.scroll, inside: inside.scroll, clippedTapRejected: true };
    });
  }

  await check('pedia-modal-owns-scroll-and-voice', async () => {
    await setup('pedia'); await click(80, 670); await wheel(260, 380, 60);
    await inspect(() => {
      window.__hubHits = [];
      const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'pedia');
      for (const event of ['pointerdown', 'pointerup']) sc.input.on(event, (pointer, over) => window.__hubHits.push({ event, x: pointer.x, y: pointer.y, over: over.map(object => ({ type: object.type, x: object.x, y: object.y, active: object.active, icon: object.getData?.('icon')?.text })) }));
    });
    await click(260, 330);
    await page.waitForFunction(() => window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'pedia').page.length > 0);
    await page.waitForFunction(() => window.__hubAudio.sources.some(source => !source.stopped && !source.ended), null, { timeout: 5000 });
    const owned = await inspect(() => window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'pedia').pageVoice);
    await page.waitForTimeout(5500); // the older collection bubble hides while the page speaks
    const current = await inspect(() => { const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'pedia'); return { token: sc.pageVoice, bubble: sc.bubble.alpha, playing: window.__hubAudio.sources.filter(source => !source.stopped && !source.ended).length }; });
    assert(current.token === owned && current.bubble < .1 && current.playing > 0, `Old bubble interrupted newer page narration: ${JSON.stringify(current)}`);
    const before = (await grids())[0].scroll;
    await wheel(820, 350, 60);
    const afterWheel = (await grids())[0].scroll;
    await click(1110, 140);
    await page.waitForTimeout(300);
    const closed = await inspect(() => { const sc = window.pm.game.scene.getScenes(true).find(sc => sc.scene.key === 'pedia'); return { page: sc.page.length, token: sc.pageVoice, playing: window.__hubAudio.sources.filter(source => !source.stopped && !source.ended).length, hits: window.__hubHits }; });
    assert(closed.page === 0 && closed.token === undefined && closed.playing === 0, `Closed page retained narration: ${JSON.stringify(closed)}`);
    await click(260, 330); // reopen a visible history tile, then try a backdrop drag
    const beforeDrag = (await grids())[0].scroll;
    await drag({ x: 820, y: 350 }, { x: 820, y: 240 });
    const afterDrag = (await grids())[0].scroll;
    writeFileSync(resolve(out, 'pedia-modal-diagnostic.json'), JSON.stringify({ before, afterWheel, beforeDrag, afterDrag, owned, current, closed }, null, 2));
    assert(afterWheel === before, `Modal wheel scrolled backing grid: ${before} -> ${afterWheel}`);
    assert(afterDrag === beforeDrag, `Modal drag scrolled backing grid: ${beforeDrag} -> ${afterDrag}`);
    return { before, afterWheel, afterDrag, stoppedOwnedVoice: true };
  });

  for (const style of ['tinker', 'fixer', 'engineer']) {
    await check(`room-${style}-persistent-voice-replay`, async () => {
      await page.goto(`${base}/?renderer=canvas&room=1-5&style=${style}&mode=free`);
      await page.waitForFunction(() => window.pm.room?.roomId === '1-5');
      await click(1276, 716); // outside the generous bottom-right sound hit circle
      await page.waitForFunction(() => window.pm.game.scene.getScenes(true).find(sc => sc.def)?.bubble?.speechToken !== undefined);
      await page.waitForFunction(() => window.__hubAudio.sources.some(source => !source.stopped && !source.ended), null, { timeout: 5000 });
      const before = await inspect(() => { const sc = window.pm.game.scene.getScenes(true).find(sc => sc.def); const b = sc.bubble; return { text: b.lastLine.msg, token: b.speechToken, x: b.x, y: b.y, textHeight: b.text.height, bounds: b.text.getBounds(), panelBounds: b.hit.getBounds(), keep: b.lastLine.opts.keep, visible: b.alpha }; });
      assert(before.keep && before.textHeight <= 82 && before.bounds.y >= 0 && before.bounds.y + before.bounds.height <= 122 && before.panelBounds.y >= 0 && before.panelBounds.y + before.panelBounds.height <= 122, `Goal text overflow: ${JSON.stringify(before)}`);
      await click(before.x, before.y);
      await page.waitForFunction(token => window.pm.game.scene.getScenes(true).find(sc => sc.def).bubble.speechToken !== token, before.token);
      const replay = await inspect(() => { const b = window.pm.game.scene.getScenes(true).find(sc => sc.def).bubble; return { token: b.speechToken, text: b.lastLine.msg, keep: b.lastLine.opts.keep }; });
      assert(replay.text === before.text && replay.keep, 'Replay changed the persistent goal');
      await page.waitForTimeout(5000);
      const after = await inspect(() => { const b = window.pm.game.scene.getScenes(true).find(sc => sc.def).bubble; return { text: b.lastLine.msg, visible: b.alpha, interactive: b.hit.input.enabled, fixed: window.pm.room.isFixed() }; });
      assert(after.visible > .9 && after.interactive && !after.fixed, 'Goal/replay disappeared during narration or puzzle changed');
      return { text: before.text, height: before.textHeight, oldToken: before.token, replayToken: replay.token, stayedVisible: true };
    });
  }
  await check('room-bottom-sound-and-tess-real-controls', async () => {
    await setup('shelf');
    await page.goto(`${base}/?renderer=canvas&room=1-5&style=engineer&mode=free`);
    await page.waitForFunction(() => window.pm.room?.roomId === '1-5');
    const state = () => inspect(() => {
      const sc = window.pm.game.scene.getScenes(true).find(sc => sc.def);
      return { muted: window.pm.dev.save.settings.muted, coop: window.pm.dev.save.settings.coop, tess: !!sc.tess, moves: sc.moves, fixed: window.pm.room.isFixed(), icon: sc.soundBtn.getData('icon').text };
    });
    const initial = await state();
    assert(!initial.muted && initial.tess && initial.coop === 'tess', 'Expected enabled narration and Tess fixture');
    await click(1224, 670);
    const muted = await state();
    assert(muted.muted && muted.icon !== initial.icon && muted.moves === initial.moves, 'Bottom sound control failed to mute or touched puzzle');
    await click(1224, 670);
    const restored = await state();
    assert(!restored.muted && restored.icon === initial.icon && restored.moves === initial.moves, 'Bottom sound control failed to restore sound');
    await click(56, 670);
    const solo = await state();
    assert(!solo.tess && solo.coop === 'off' && solo.moves === initial.moves, 'Bottom Tess control failed to switch to solo');
    await click(56, 670);
    const coop = await state();
    assert(coop.tess && coop.coop === 'tess' && coop.moves === initial.moves && !coop.fixed, 'Bottom Tess control failed to restore companion');
    return { initial, muted, restored, solo, coop };
  });
  await check('engineer-tess-longest-real-instructions', async () => {
    await setup('shelf');
    const measurements = [];
    for (const candidate of longInstructions) {
      // Query navigation is scene setup only; every requested hint is clicked.
      await page.goto(`${base}/?renderer=canvas&room=${candidate.roomId}&style=engineer&mode=free`);
      await page.waitForFunction(id => window.pm.room?.roomId === id, candidate.roomId);
      await click(1276, 716);
      await page.waitForFunction(() => window.pm.game.scene.getScenes(true).find(sc => sc.def)?.bubble?.lastLine);
      for (let tier = -1; tier < 3; tier++) {
        if (tier >= 0) {
          const question = await inspect(() => {
            const sc = window.pm.game.scene.getScenes(true).find(sc => sc.def);
            const button = sc.children.list.find(object => object.getData?.('icon')?.text === '?');
            return { x: button.x, y: button.y };
          });
          await click(question.x, question.y);
        }
        await page.waitForTimeout(260);
        const measured = await inspect(() => {
          const sc = window.pm.game.scene.getScenes(true).find(sc => sc.def), b = sc.bubble;
          // The hit zone uses the exact width/height/origin of the painted panel.
          return { roomId: sc.def.id, text: b.lastLine.msg, height: b.text.height, font: b.text.style.fontSize, width: b.bw, bounds: b.text.getBounds(), panelBounds: b.hit.getBounds(), tess: !!sc.tess, keep: b.lastLine.opts.keep };
        });
        measured.tier = tier; measurements.push(measured);
        if (measured.height > 82 || measured.bounds.y < 0 || measured.bounds.y + measured.bounds.height > 122 || measured.panelBounds.y < 0 || measured.panelBounds.y + measured.panelBounds.height > 122) {
          await page.screenshot({ path: resolve(out, `OVERFLOW-${candidate.roomId}-${tier}.png`) });
        }
      }
    }
    const overflow = measurements.filter(item => item.height > 82 || item.bounds.y < 0 || item.bounds.y + item.bounds.height > 122 || item.panelBounds.y < 0 || item.panelBounds.y + item.panelBounds.height > 122);
    writeFileSync(resolve(out, 'coop-measurements.json'), JSON.stringify(measurements, null, 2));
    assert(measurements.every(item => item.tess && item.keep), 'Tess/persistent speech fixture missing');
    assert(!overflow.length, `${overflow.length} of ${measurements.length} rendered instructions overflow: ${overflow.map(item => `${item.roomId} tier${item.tier}: ${item.height}px`).join(', ')}`);
    const worst = measurements.reduce((a, b) => a.height >= b.height ? a : b);
    await page.goto(`${base}/?renderer=canvas&room=${worst.roomId}&style=engineer&mode=free`);
    await page.waitForFunction(id => window.pm.room?.roomId === id, worst.roomId);
    await click(1276, 716);
    for (let tier = 0; tier <= worst.tier; tier++) {
      const question = await inspect(() => { const sc = window.pm.game.scene.getScenes(true).find(sc => sc.def); const button = sc.children.list.find(object => object.getData?.('icon')?.text === '?'); return { x: button.x, y: button.y }; });
      await click(question.x, question.y);
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(out, 'worst-engineer-tess-caption.png') });
    return { measured: measurements.length, worstHeight: worst.height, worst, rooms: longInstructions.map(item => item.roomId) };
  });
} finally {
  await browser.close();
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}
const failed = report.cases.filter(item => !item.passed);
console.log(JSON.stringify({ cases: report.cases.length, passed: report.cases.length - failed.length, failed: failed.length, errors: report.errors.length, report: resolve(out, 'report.json') }));
if (failed.length || report.errors.length) process.exitCode = 1;
