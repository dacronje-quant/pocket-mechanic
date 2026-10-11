/** Real touch permission and nonzero recorded audio, with normal autoplay rules. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = process.env.PLAYWRIGHT_MODULE ? await import(process.env.PLAYWRIGHT_MODULE) : require('playwright'); }
catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const args = process.argv.slice(2), opt = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback;
const base = opt('url', 'http://127.0.0.1:4175'), out = opt('out', '.qa/mobile-audio');
mkdirSync(out, {recursive:true});
const browser = await playwright.chromium.launch({ ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {channel:'chrome'}), args:['--disable-gpu','--autoplay-policy=document-user-activation-required'] });
const report = { checks:[], errors:[] };
try {
  for (const scenario of ['normal','slow-catalogue','portrait','muted']) {
    const context = await browser.newContext({viewport:scenario==='portrait'?{width:390,height:844}:{width:844,height:390},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page = await context.newPage();
    page.on('pageerror',error=>report.errors.push(String(error)));
    await page.addInitScript(() => {
      const Native = window.AudioContext, arrays = new WeakMap(), buffers = new WeakMap(), originalFetch = window.fetch;
      window.__mobileAudio = [];
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this,args), read = response.arrayBuffer.bind(response);
        response.arrayBuffer = async () => { const bytes=await read();arrays.set(bytes,String(args[0]));return bytes; }; return response;
      };
      window.AudioContext = class extends Native {
        constructor(...args) { super(...args); this.report={context:this,createdInTap:navigator.userActivation.isActive,started:[],analysers:[]};window.__mobileAudio.push(this.report); }
        get state() { return this.simulateInterrupted && super.state==='suspended' ? 'interrupted' : super.state; }
        decodeAudioData(bytes,done,fail) { const url=arrays.get(bytes);return super.decodeAudioData(bytes,buffer=>{buffers.set(buffer,url);done?.(buffer);},fail); }
        createBufferSource() { const src=super.createBufferSource(),start=src.start;src.start=(...args)=>{this.report.started.push(buffers.get(src.buffer));return start.apply(src,args);};return src; }
      };
      const connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(dest,...args) { const result=connect.call(this,dest,...args);if(dest===this.context.destination && this.context.report){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);this.context.report.analysers.push(a);}return result; };
      window.__audioPeak=()=>Math.max(0,...window.__mobileAudio.flatMap(r=>r.analysers.map(a=>{const b=new Float32Array(a.fftSize);a.getFloatTimeDomainData(b);return Math.sqrt(b.reduce((sum,v)=>sum+v*v,0)/b.length);})));
    });
    if(scenario==='slow-catalogue') await page.route('**/audio/manifest.json',async route=>{await new Promise(resolve=>setTimeout(resolve,4500));await route.continue();});
    await page.goto(`${base}/?renderer=canvas${scenario==='muted'?'&room=1-2':''}`);
    await page.waitForFunction(()=>window.pm?.ready);
    if(scenario==='muted') {
      await page.evaluate(()=>{window.pm.dev.save.settings.muted=true;window.pm.dev.persist();});
      await page.reload();await page.waitForFunction(()=>window.pm?.ready && window.pm.room?.roomId==='1-2');
    }
    assert.equal(await page.evaluate(()=>window.__mobileAudio.length),0,'Audio must wait for a real tap');
    const tap = async(x,y)=>{const b=await page.locator('canvas').boundingBox();await page.touchscreen.tap(b.x+x*b.width/1280,b.y+y*b.height/720);};
    if(scenario==='portrait') await page.locator('#rotate .ok').tap(); else await tap(600,55);
    await page.waitForFunction(()=>window.__mobileAudio.some(r=>r.context.state==='running' && r.started.some(url=>url?.includes('/music/'))));
    if(scenario==='muted') {
      assert.equal(await page.evaluate(()=>window.__audioPeak()),0,'Saved mute must remain silent');
      await tap(1224,670);
      await page.waitForFunction(()=>!window.pm.dev.save.settings.muted);
    } else await page.waitForFunction(()=>window.__mobileAudio.some(r=>r.started.some(url=>url?.includes('/voice/'))));
    await page.waitForFunction(()=>window.__audioPeak()>0.0001);
    const result=await page.evaluate(()=>({contexts:window.__mobileAudio.length,createdInTap:window.__mobileAudio[0].createdInTap,state:window.__mobileAudio[0].context.state,peak:window.__audioPeak(),recordings:window.__mobileAudio[0].started.filter(Boolean),errors:window.pm.errors}));
    assert.equal(result.contexts,1);assert.equal(result.createdInTap,true);assert.deepEqual(result.errors,[]);
    report.checks.push({scenario,...result});
    if(scenario==='normal') {
      await page.evaluate(async()=>{const c=window.__mobileAudio[0].context;await c.suspend();c.simulateInterrupted=true;});
      assert.equal(await page.evaluate(()=>window.__mobileAudio[0].context.state),'interrupted');
      await tap(600,55);
      await page.waitForFunction(()=>window.__mobileAudio[0].context.state==='running' && window.__audioPeak()>0.0001);
      report.checks.push({scenario:'interrupted-then-tap',passed:true});
    }
    await context.close();
  }
  assert.deepEqual(report.errors,[]);
  console.log(JSON.stringify(report,null,2));
} finally {writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
