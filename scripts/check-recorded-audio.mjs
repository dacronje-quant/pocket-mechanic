/** Verify release URLs and actual recorded robot dialogue; no device TTS. */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = process.env.PLAYWRIGHT_MODULE ? await import(process.env.PLAYWRIGHT_MODULE) : require('playwright'); }
catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const args = process.argv.slice(2), opt = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback;
const base = opt('url', 'http://127.0.0.1:4175'), out = resolve(opt('out', '.qa/full-improvement/recorded-audio'));
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(readFileSync('public/audio/manifest.json', 'utf8'));
const files = [...new Set([...Object.values(manifest.voice), ...Object.values(manifest.music), ...Object.values(manifest.sfx).flat()])];
const report = { availableFiles: 0, missing: [], robotDialogue: [], errors: [] };
let next = 0;
await Promise.all(Array.from({length: 6}, async () => {
  while (next < files.length) {
    const file = files[next++], response = await fetch(`${base}/audio/${file}`, { method: 'HEAD' });
    if (!response.ok || !response.headers.get('content-type')?.includes('audio')) report.missing.push({ file, status: response.status });
    else report.availableFiles++;
  }
}));
const browser = await playwright.chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {channel:'chrome'}), args:['--disable-gpu','--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage({ viewport:{width:1280,height:720}, serviceWorkers:'block' });
  page.on('pageerror', error => report.errors.push(String(error)));
  await page.addInitScript(() => {
    const data = window.__recordedAudio = { started: [], oscillators: 0, deviceSpeech: 0 };
    const arrays = new WeakMap(), buffers = new WeakMap(), originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args), read = response.arrayBuffer.bind(response);
      response.arrayBuffer = async () => { const array = await read(); arrays.set(array, String(args[0])); return array; };
      return response;
    };
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function(array, success, error) {
      const url = arrays.get(array), record = buffer => { buffers.set(buffer, url); success?.(buffer); };
      const pending = decode.call(this, array, record, error); pending?.then(buffer => buffers.set(buffer, url), () => undefined); return pending;
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function(...args) { data.started.push({url:buffers.get(this.buffer),rate:this.playbackRate.value}); return start.apply(this,args); };
    const oscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function(...args) { data.oscillators++; return oscillator.apply(this,args); };
    if (window.speechSynthesis) window.speechSynthesis.speak = () => data.deviceSpeech++;
  });
  await page.goto(`${base}/?renderer=canvas&scene=story&id=tess-built`);
  await page.waitForFunction(() => window.pm?.ready && window.pm.scene === 'story');
  for (const who of ['kip','tess']) for (const flavour of ['classic','chirpy','musical','bubbly','retro','musicbox']) {
    await page.evaluate(({who,flavour}) => {
      const save = window.pm.dev.save, p = save.profiles.find(p => p.id === save.active);
      p.look.voice = who === 'kip' ? `voice-${flavour}` : 'voice-retro';
      p.tessLook.voice = who === 'tess' ? `voice-${flavour}` : 'voice-classic';
      save.settings.muted = false; save.settings.music = 0; save.settings.sfx = 0; save.settings.voice = 1;
      window.pm.dev.go('story', {id:'tess-built',next:{scene:'shop'}});
    }, {who,flavour});
    await page.waitForFunction(() => window.pm.game.scene.getScene('story').cur === 0);
    const targetLine = who === 'tess' ? 1 : 3;
    for (let line = 1; line <= targetLine; line++) {
      await page.waitForFunction(() => { const s = window.pm.game.scene.getScene('story'); return s.time.now - s.shownAt > 450; });
      if (line === targetLine) await page.evaluate(() => { window.__recordedAudio.started=[]; });
      await page.mouse.click(1180,640,{delay:70});
      await page.waitForFunction(line => window.pm.game.scene.getScene('story').cur === line, line);
    }
    const expected = manifest.sfx[`robot-${flavour}`][0];
    await page.waitForFunction(({file,rate}) => window.__recordedAudio.started.some(event => event.url?.endsWith(file) && event.rate === rate), {file:expected,rate:who==='tess'?1.25:1});
    const result = await page.evaluate(() => ({ played:window.__recordedAudio.started, oscillators:window.__recordedAudio.oscillators, deviceSpeech:window.__recordedAudio.deviceSpeech, errors:window.pm.errors }));
    if (result.oscillators || result.deviceSpeech || result.errors.length) throw Error('Procedural/device voice or runtime error during robot dialogue');
    report.robotDialogue.push({ who,flavour,recording:expected,passed:true });
  }
  if (report.missing.length || report.errors.length) throw Error(JSON.stringify({missing:report.missing,errors:report.errors}));
  console.log(JSON.stringify(report,null,2));
} finally { writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2)); await browser.close(); }
