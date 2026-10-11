/** Initial-state visual coverage for every puzzle kind and age mode. Product remains immutable. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runnerImport } from 'vite';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const opt = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback;
let playwright;
try { playwright = process.env.PLAYWRIGHT_MODULE ? await import(process.env.PLAYWRIGHT_MODULE) : require('playwright'); }
catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const base = opt('url', 'http://127.0.0.1:4174'), out = resolve(opt('out', '.qa/sweep/visuals'));
const load = async path => (await runnerImport(resolve(path), { configFile: false, logLevel: 'silent' })).module;
const { STORY_ROOMS } = await load('src/content/index.ts');
const { QUICK_FIXES } = await load('src/content/quickfixes.ts');
const rooms = [...STORY_ROOMS, ...QUICK_FIXES.map(q => q.room)];
const preferred = { gear:'1-5', flow:'qf-archive-4-4', light:'7-5', logic:'6-3', cards:'6-bf', music:'2-3', tune:'4-5', pendulum:'8-4', balance:'1-1', oil:'1-3', cam:'5-6', chain:'8-bf', hunt:'2-1', busy:'6-1', nest:'8-7' };
const kinds = opt('kinds', '').split(',').filter(Boolean);
const representatives = [...new Set(rooms.map(r => r.kind))].filter(kind => !kinds.length || kinds.includes(kind)).map(kind => rooms.find(r => r.id === preferred[kind]) ?? rooms.find(r => r.kind === kind));
mkdirSync(out, { recursive: true });
const browser = await playwright.chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }), args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const report = { started: new Date().toISOString(), build: base, representatives: representatives.map(r => ({ id:r.id,kind:r.kind,title:r.title })), cases:[] };
const batches = [ ['desktop','tinker'], ['desktop','fixer'], ['desktop','engineer'], ['phone','fixer'] ];
try {
  await Promise.all(batches.map(async ([device,style]) => {
    const viewport = device === 'phone' ? { width:667,height:375 } : { width:1280,height:720 };
    const context = await browser.newContext({ viewport, hasTouch:device==='phone', isMobile:device==='phone', serviceWorkers:'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    for (const room of representatives) {
      const name = `${device}-${style}-${room.kind}`, record = { name, device,style,id:room.id,kind:room.kind };
      try {
        await page.goto(`${base}/?renderer=canvas&room=${encodeURIComponent(room.id)}&style=${style}&mode=free`);
        await page.waitForFunction(id => window.pm?.room?.roomId === id, room.id);
        await page.waitForFunction(() => window.pm.game.scene.getScenes(true).filter(s => s.def).every(s => !s.load.isLoading()));
        // Title enters and exits over the first 1.8 seconds. Capture the untouched mechanism after it clears.
        await page.waitForTimeout(2100);
        // Concurrent tabs can advance the scene clock more slowly than wall time.
        // Wait for the actual instruction bubble, so each image includes the goal.
        await page.waitForFunction(() => window.pm.game.scene.getScenes(true).find(s => s.def && s.state)?.bubble?.showing);
        await page.waitForTimeout(250);
        const metadata = await page.evaluate(() => {
          const scene = window.pm.game.scene.getScenes(true).find(s => s.def && s.state);
          const texts=[], controls=[];
          const visit = object => {
            let visible = object.active && object.visible !== false && object.alpha > 0;
            for(let p=object.parentContainer;p;p=p.parentContainer) visible &&= p.visible && p.alpha>0;
            if(visible){
              const b=object.getBounds?.(), box=b?{x:b.x,y:b.y,width:b.width,height:b.height}:null;
              const data={name:object.name,qa:object.getData?.('qa'),depth:object.depth,box};
              if(typeof object.text==='string' && object.text.trim()) texts.push({...data,text:object.text,fontSize:object.style?.fontSize});
              if(object.input?.enabled) controls.push({...data,draggable:!!object.input.draggable});
            }
            object.list?.forEach(visit);
          };
          scene.children.list.forEach(visit);
          const boundsOutside=texts.filter(t=>t.box&&(t.box.x<-.5||t.box.y<-.5||t.box.x+t.box.width>1280.5||t.box.y+t.box.height>720.5));
          return { room:scene.def.id,kind:scene.def.kind,style:scene.style.id,words:scene.def.intro,texts,controls,boundsOutside,loadedArt:scene.textures.getTextureKeys().filter(k=>k.startsWith('art:')),loading:scene.load.isLoading(),errors:window.pm.errors };
        });
        await page.screenshot({ path:resolve(out,`${name}.png`) });
        writeFileSync(resolve(out,`${name}.json`),JSON.stringify(metadata,null,2));
        record.passed=!errors.length&&!metadata.errors.length&&!metadata.loading;
        record.outsideText=metadata.boundsOutside;
        record.loadedArt=metadata.loadedArt.length;
      } catch(e) {record.passed=false;record.error=String(e);}
      report.cases.push(record);errors.length=0;
      writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));
      console.log(`${record.passed?'CAPTURE':'FAIL'} ${name} ${room.id}${record.error?' '+record.error:''}`);
    }
    await context.close();
  }));
} finally { await browser.close(); }
report.completed=new Date().toISOString();
writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({cases:report.cases.length,failed:report.cases.filter(c=>!c.passed).length,report:resolve(out,'report.json')}));
if(report.cases.some(c=>!c.passed)) process.exitCode=1;
