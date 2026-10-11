/** Composer regressions through real mouse/touch input. Only initial save fixtures are written. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const args = process.argv.slice(2), opt = (key, fallback) => args.includes(`--${key}`) ? args[args.indexOf(`--${key}`) + 1] : fallback;
const url = opt('url', 'http://127.0.0.1:4179'), out = resolve(opt('out', '.qa/music-box'));
mkdirSync(out, { recursive: true });
const report = { input: 'real pointer and touch taps, read-only audio and scene observation; initial save fixture only', cases: [], errors: [] };
const only = opt('only', '');
const assert = (value, message) => { if (!value) throw Error(message); };
const browser = await playwright.chromium.launch({ channel: 'chrome', args: ['--disable-gpu'] });
const frequencies = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33, 659.25];
try {
  for (const device of opt('devices', 'desktop,touch,tinker,portrait').split(',')) {
    const mobile = device === 'touch' || device === 'portrait', style = device === 'tinker' ? 'tinker' : 'fixer';
    const context = await browser.newContext({ viewport: device === 'portrait' ? { width: 390, height: 844 } : mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 }, hasTouch: mobile, isMobile: mobile, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push({ device, error: String(e) }));
    await page.addInitScript(() => {
      window.__notes = [];
      const start = OscillatorNode.prototype.start, stop = OscillatorNode.prototype.stop;
      const entries = new WeakMap();
      OscillatorNode.prototype.start = function(...args) {
        const entry = { frequency: this.frequency.value, at: args[0] ?? this.context.currentTime, now: this.context.currentTime, stopped: false, ended: false };
        window.__notes.push(entry); entries.set(this, entry); this.addEventListener('ended', () => entry.ended = true);
        return start.apply(this, args);
      };
      OscillatorNode.prototype.stop = function(...args) { if (!args.length && entries.has(this)) entries.get(this).stopped = true; return stop.apply(this, args); };
    });
    const tap = async (x, y) => {
      const c = await page.locator('canvas').boundingBox(), px = c.x + x * c.width / 1280, py = c.y + y * c.height / 720;
      if (mobile) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py, { delay: 30 });
      await page.waitForTimeout(70);
    };
    const button = async name => {
      const point = await page.evaluate(name => { const scene = window.pm.game.scene.getScene('bench'), object = scene.children.list.find(o => o.name === `composer:${name}`); return { x: object.x, y: object.y }; }, name);
      await tap(point.x, point.y);
    };
    const read = () => page.evaluate(() => {
      const s = window.pm.game.scene.getScene('bench'), p = window.pm.dev.save.profiles.find(p => p.id === window.pm.dev.save.active);
      return { draft: s.draft, playing: !!s.playing, beat: s.lastBeat, loop: s.loop, panel: s.panel.length, songs: p.composed, bench: p.bench,
        caption: s.playButton?.getData('caption')?.text, bubble: { text: s.bubble?.text?.text, height: s.bubble?.text?.height }, errors: window.pm.errors,
        notes: window.__notes, cursorCommands: s.playhead?.commandBuffer?.length,
        active: window.pm.scene };
    });
    const check = async (name, fn) => {
      if (only && !name.includes(only)) return;
      const c = { device, name, passed: false };
      try { c.details = await fn(); c.passed = true; } catch (error) { c.error = String(error); c.state = await read().catch(() => null); }
      report.cases.push(c); await page.screenshot({ path: resolve(out, `${c.passed ? 'PASS' : 'FAIL'}-${device}-${name}.png`) });
      writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2)); console.log(`${c.passed ? 'PASS' : 'FAIL'} ${device} ${name}${c.error ? ': ' + c.error : ''}`);
      if (!c.passed) throw Error(c.error);
    };
    try {
      await page.goto(`${url}/?renderer=canvas&room=1-1&style=${style}&mode=free`);
      await page.waitForFunction(() => window.pm?.dev && window.pm.room);
      await page.evaluate(style => {
        const save = window.pm.dev.save, p = save.profiles.find(p => p.id === save.active);
        p.style = style; p.repairs = [1, 2, 3, 4]; p.musicBox = { pins: [], bpm: 100, steps: 16, cursor: 0 };
        p.bench = { saved: [{ name: 'Preserved machine', code: 'ABC123' }], cards: { oldCard: 5 } };
        p.composed = [{ name: 'Old Pin Garden tune', pins: ['0:0', '0:4', '4:9'] }]; p.nook[0] = 'mini-musicbox'; p.songs = ['song-teatime'];
        Object.assign(save.settings, { music: .5, sfx: 0, voice: .9, muted: false, readAloud: false, coop: 'off', calm: true, closingMin: 0, windDown: false, windDownHour: null, subtitles: style === 'tinker' ? 'auto' : 'on' });
        window.pm.dev.persist();
      }, style);
      await page.goto(`${url}/?renderer=canvas&scene=bench&style=${style}`);
      await page.waitForFunction(() => window.pm?.scene === 'bench' && window.pm.game.scene.getScene('bench').playButton);
      await page.waitForTimeout(1400);
      if (device === 'portrait') await page.locator('#rotate').click();
      await check('fresh-composer-and-voice-fit', async () => {
        const s = await read(); assert(s.draft.pins.length === 0 && !s.playing, 'Composer imposes a preset song');
        assert(s.bubble.height <= 82, 'Instruction caption crosses onto the music roll');
        if (style !== 'tinker') assert(s.bubble.text.includes('Tap the keys') && s.bubble.text.includes('brass holes'), 'Instructions do not describe visible controls');
        const box = await page.evaluate(() => window.pm.game.scene.getScene('bench').children.list.find(o => o.name === 'composer:musicbox').list.some(o => o.name === 'machine:musicbox'));
        assert(box, 'Composer has no painted music box'); return { caption: s.bubble, paintedBox: box };
      });
      await check('keys-rest-chord-and-undo', async () => {
        for (const note of [0, 4, 7]) await tap(310 + note * 88, 578);
        await button('rest');
        let s = await read(); assert(JSON.stringify(s.draft.pins) === JSON.stringify(['0:0', '1:4', '2:7']) && s.draft.cursor === 4, 'Keyboard/rest writes the wrong beats');
        await tap(325, 210 + (10 - 4 - .5) * 28); s = await read();
        assert(s.draft.pins.includes('0:4') && s.draft.pins.includes('0:0') && s.draft.cursor === 0, 'Grid cannot add a chord');
        await tap(325, 210 + (10 - 4 - .5) * 28); assert(!(await read()).draft.pins.includes('0:4'), 'Pin cannot be removed');
        await button('undo'); s = await read(); assert(s.draft.pins.includes('0:4'), 'Undo did not restore chord');
        return { draft: s.draft };
      });
      await check('unlimited-undo', async () => {
        const before = (await read()).draft;
        for (let i = 0; i < 64; i++) await tap(525, 210 + (10 - 1 - .5) * 28);
        for (let i = 0; i < 64; i++) await button('undo');
        const after = (await read()).draft;
        assert(JSON.stringify(before) === JSON.stringify(after), 'Undo cannot restore a draft after more than sixty edits');
        return { edits: 64, restored: true };
      });
      await check('tempo-playhead-and-real-pitches', async () => {
        for (let i = 0; i < 8; i++) await button('faster');
        let s = await read(); assert(s.draft.bpm === 180, 'Tempo control does not clamp');
        const before = s.notes.length; await button('play'); await page.waitForTimeout(700); s = await read();
        assert(s.playing && s.beat >= 2 && s.beat <= 3, 'Playhead ignores the chosen BPM');
        if (style !== 'tinker') assert(s.caption === 'Stop', 'Playing button still says Play');
        const notes = s.notes.slice(before).filter(n => frequencies.some(f => Math.abs(f - n.frequency) < .01));
        assert(notes.length >= 4, 'Chord/melody is not audible');
        assert(Math.abs(notes[0].frequency - 261.63) < .01 && Math.abs(notes[1].frequency - 392) < .01, 'First chord pitches differ from the roll');
        assert(Math.abs(notes[0].at - notes[1].at) < .001, 'Chord notes are not simultaneous');
        assert(Math.abs(notes[2].at - notes[0].at - 1 / 3) < .01, 'Audio notes ignore BPM');
        await button('play'); assert(!(await read()).playing, 'Stop does not stop transport');
        return { beat: s.beat, notes };
      });
      await check('save-reload-draft-and-legacy-preservation', async () => {
        await button('save'); let s = await read(); assert(s.songs.length === 2 && s.songs[1].bpm === 180 && s.songs[1].pins.includes('0:4'), 'Save loses tempo or chord');
        await button('save'); assert((await read()).songs.length === 2, 'Repeated Save duplicates same tune');
        const draft = s.draft; await page.reload(); await page.waitForFunction(() => window.pm?.scene === 'bench' && window.pm.game.scene.getScene('bench').playButton); await page.waitForTimeout(900);
        if (device === 'portrait') await page.locator('#rotate').click();
        s = await read(); assert(JSON.stringify(s.draft) === JSON.stringify(draft), 'Draft lost after reload');
        assert(s.bench.saved[0].code === 'ABC123' && s.bench.cards.oldCard === 5, 'Replacement destroyed older machines');
        return { draft: s.draft, songs: s.songs.length, bench: s.bench };
      });
      await check('clear-undo-gallery-input-ownership', async () => {
        const original = (await read()).draft.pins;
        await button('clear'); assert(!(await read()).draft.pins.length, 'Clear failed');
        await button('undo'); assert(JSON.stringify((await read()).draft.pins) === JSON.stringify(original), 'Clear is not undoable');
        await button('songs'); const before = (await read()).draft;
        await tap(1000, 578); assert(JSON.stringify((await read()).draft) === JSON.stringify(before), 'Modal tap changes keys underneath it');
        await tap(272, 248); const s = await read();
        assert(s.panel === 0 && s.draft.pins.includes('0:0') && s.draft.pins.includes('0:4') && s.draft.pins.includes('4:9'), 'Old song did not load with chord and high note');
        return { draft: s.draft };
      });
      await check('loop-stop-cancels-queued-notes', async () => {
        // Restore the faster tune through its visible saved card.
        await button('songs'); await tap(517, 248); await button('loop'); await button('play');
        await page.waitForTimeout(5450); let s = await read(); assert(s.playing && s.loop && s.beat <= 2, 'Loop does not wrap the roll');
        await button('play'); const count = (await read()).notes.length; await page.waitForTimeout(800); s = await read();
        assert(!s.playing && s.notes.length === count, 'Stopped loop keeps scheduling sound');
        return { stopped: !s.playing, loopBeat: s.beat };
      });
      await check('shop-shows-music-box-and-opens-composer', async () => {
        const before = (await read()).notes.length; await button('play'); const until = (await read()).notes.length;
        await tap(56, 52); await page.waitForFunction(() => window.pm.scene === 'shop'); await page.waitForTimeout(700);
        const left = await page.evaluate(({ before, until }) => window.__notes.slice(before, until), { before, until });
        assert(left.every(note => note.stopped || note.ended), 'Leaving composer leaves scheduled notes sounding');
        const art = await page.evaluate(() => {
          const s = window.pm.game.scene.getScene('shop'), c = s.children.list.find(o => o.name === 'shop:musicbox');
          return { visible: c?.visible, graphicsVisible: c?.list[0]?.visible, painted: c?.list.some(o => o.id === 'musicbox' && o.list.some(image => image.name === 'machine:musicbox')) };
        });
        assert(art.visible && art.graphicsVisible && art.painted, 'Painted shop hides the new Music Box');
        await tap(650, 365); await page.waitForFunction(() => window.pm.scene === 'bench'); await page.waitForTimeout(500);
        return art;
      });
      await check('nook-plays-saved-chord-and-tempo', async () => {
        await page.goto(`${url}/?renderer=canvas&scene=nook&style=${style}`); await page.waitForFunction(() => window.pm?.scene === 'nook'); await page.waitForTimeout(1200);
        if (device === 'portrait') await page.locator('#rotate').click();
        await tap(230, 580); await page.waitForTimeout(200);
        const collectedStart = await page.evaluate(() => window.__notes.length); await tap(332, 205);
        const before = await page.evaluate(() => window.__notes.length);
        await tap(742, 205); await page.waitForTimeout(420);
        const collected = await page.evaluate(({ collectedStart, before }) => window.__notes.slice(collectedStart, before), { collectedStart, before });
        assert(collected.length && collected.every(note => note.stopped || note.ended), 'Switching songs leaves the collected tune playing');
        const played = await page.evaluate(before => window.__notes.slice(before), before);
        const notes = played.filter(n => frequencies.some(f => Math.abs(f-n.frequency) < .01));
        assert(notes.length >= 3 && Math.abs(notes[0].frequency-261.63)<.01 && Math.abs(notes[1].frequency-392)<.01, 'Nook loses saved chord');
        assert(Math.abs(notes[2].at-notes[0].at-1/3)<.01, 'Nook ignores saved BPM');
        await tap(1045, 150); const count = await page.evaluate(() => window.__notes.length); await page.waitForTimeout(800);
        assert(await page.evaluate(count => window.__notes.length === count, count), 'Closing Nook gallery leaves tune playing');
        return { notes };
      });
      assert(!(await read()).errors.length, 'Game error log is not empty');
    } catch (error) { report.errors.push({ device, error: String(error) }); }
    await context.close();
  }
} finally { await browser.close(); writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ passed: report.cases.filter(c=>c.passed).length, failed: report.cases.filter(c=>!c.passed).length, errors: report.errors.length, report: resolve(out, 'report.json') }));
if (report.errors.length || report.cases.some(c=>!c.passed)) process.exitCode = 1;
