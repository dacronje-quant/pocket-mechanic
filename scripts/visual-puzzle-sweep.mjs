/** Real-input regression sweep. It never calls pm.room.solve or scene actions. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runnerImport } from 'vite';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const opt = (key, fallback) => args.includes(`--${key}`) ? args[args.indexOf(`--${key}`) + 1] : fallback;
let playwright;
if (process.env.PLAYWRIGHT_MODULE) playwright = await import(process.env.PLAYWRIGHT_MODULE);
else {
  try { playwright = require('playwright'); }
  catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
}
const base = opt('url', 'http://127.0.0.1:5173');
const out = resolve(opt('out', '.qa/sweep/after'));
const styleList = opt('styles', 'tinker,fixer,engineer').split(',');
const filterKinds = opt('kinds', '').split(',').filter(Boolean);
const filterIds = opt('ids', '').split(',').filter(Boolean);
const devices = opt('devices', 'desktop').split(',');
const all = args.includes('--all');
const load = async path => (await runnerImport(resolve(path), { configFile: false, logLevel: 'silent' })).module;
const { STORY_ROOMS } = await load('src/content/index.ts');
const { QUICK_FIXES } = await load('src/content/quickfixes.ts');
const { atticRooms } = await load('src/content/attic.ts');
const rooms = [...STORY_ROOMS, ...QUICK_FIXES.map(q => q.room), ...atticRooms()].map(r => ({ id: r.id, kind: r.kind, title: r.title }));
const launch = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: opt('channel', 'chrome') };
mkdirSync(out, { recursive: true });

const drivers = [];
for (const [file, name] of [['sweep-mechanism-driver.mjs','driveMechanism'],['sweep-spatial-driver.mjs','driveSpatial'],['sweep-classic-driver.mjs','driveClassic'],['sweep-reasoning-driver.mjs','driveReasoning']]) {
  const module = await import(`./${file}`);
  drivers.push(module[name]);
}
const browser = await playwright.chromium.launch({ ...launch, args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const report = { started: new Date().toISOString(), input: 'real mouse/touch events; no solution or action callbacks', cases: [], errors: [] };
try {
  for (const device of devices) {
    const vp = device === 'phone' ? { width: 667, height: 375 }
      : device === 'portrait' ? { width: 375, height: 667 }
        : device === 'tablet' ? { width: 1024, height: 768 } : { width: 1280, height: 720 };
    const context = await browser.newContext({ viewport: vp, hasTouch: device !== 'desktop', isMobile: device !== 'desktop' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.stack ?? e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.goto(`${base}/?renderer=canvas&room=1-2`);
    await page.waitForFunction(() => window.pm?.room);
    let selected = args.includes('--story') ? rooms.filter(r => STORY_ROOMS.some(story => story.id === r.id)) : all ? rooms : [...new Map(rooms.map(r => [r.kind, r])).values()];
    if (filterKinds.length) selected = selected.filter(r => filterKinds.includes(r.kind));
    if (filterIds.length) selected = rooms.filter(r => filterIds.includes(r.id));
    for (const style of styleList) for (const room of selected) {
      const record = { ...room, style, device, passed: false };
      const started = Date.now();
      try {
        await page.goto(`${base}/?renderer=canvas&room=${encodeURIComponent(room.id)}&style=${style}&mode=free`);
        if (device === 'portrait') await page.locator('#rotate').click({ timeout: 1000 }).catch(() => undefined);
        await page.waitForFunction(id => window.pm?.room?.roomId === id, room.id);
        // Wait for opening art/title fade, then unlock audio through actual input.
        await page.waitForTimeout(2050);
        const canvas = await page.locator('canvas').boundingBox();
        const point = ({x,y}) => ({ x: canvas.x + x * canvas.width / 1280, y: canvas.y + y * canvas.height / 720 });
        const click = async (x,y) => {
          const p = point({x,y});
          if (device === 'desktop') await page.mouse.click(p.x,p.y,{delay:40});
          else await page.touchscreen.tap(p.x,p.y);
          await page.waitForTimeout(60);
        };
        const touch = device === 'desktop' ? null : await context.newCDPSession(page);
        const drag = async (from,to) => {
          const a = point(from), b = point(to);
          // Cross Phaser's drag threshold gradually. A large first movement
          // is retained as a grab offset and misses closely spaced sockets.
          const length = Math.hypot(b.x-a.x,b.y-a.y);
          const nudge = Math.min(7 * canvas.width / 1280, length);
          const start = length ? {x:a.x+(b.x-a.x)*nudge/length,y:a.y+(b.y-a.y)*nudge/length} : a;
          if (touch) {
            const send = (type,p) => touch.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:p.x,y:p.y,id:1,radiusX:2,radiusY:2}]});
            await send('touchStart',a);
            await send('touchMove',start);await page.waitForTimeout(50);
            for(let i=1;i<=12;i++){await send('touchMove',{x:a.x+(b.x-a.x)*i/12,y:a.y+(b.y-a.y)*i/12});await page.waitForTimeout(16);}
            await page.waitForTimeout(70);await send('touchEnd',b);
          } else {
            await page.mouse.move(a.x,a.y);await page.mouse.down();await page.waitForTimeout(35);
            await page.mouse.move(start.x,start.y);await page.waitForTimeout(50);
            for(let i=1;i<=12;i++){await page.mouse.move(a.x+(b.x-a.x)*i/12,a.y+(b.y-a.y)*i/12);await page.waitForTimeout(16);}
            await page.waitForTimeout(70);await page.mouse.up();
          }
          await page.waitForTimeout(180);
        };
        const snapshot = () => page.evaluate(() => {
          const sc = window.pm.game.scene.getScenes(true).find(s => s.def && s.state);
          if (!sc) return null;
          const objects=[];
          const visit=o=>{
            let shown=o.active && o.visible!==false && o.alpha!==0;
            for(let p=o.parentContainer;p;p=p.parentContainer) shown &&= p.visible && p.alpha!==0;
            if(shown){const m=o.getWorldTransformMatrix?.();const p=m?m.transformPoint(0,0):{x:o.x,y:o.y};objects.push({name:o.name,qa:o.getData?.('qa'),x:p.x,y:p.y,depth:o.depth,scaleX:o.scaleX,scaleY:o.scaleY,width:o.width,height:o.height,icon:o.getData?.('icon')?.text,draggable:!!o.input?.draggable,input:!!o.input?.enabled});}
            o.list?.forEach(visit);
          };
          sc.children.list.forEach(visit);
          return {def:sc.def,state:sc.state,style:sc.style.id,fixed:sc.fixed,moves:sc.moves,objects,errors:window.pm.errors};
        });
        const h={page,click,drag,snapshot,sceneData:snapshot};
        let handled=false;
        for(const driver of drivers) if(await driver(h)){handled=true;break;}
        if(!handled) throw new Error(`No real-input driver for ${room.kind}`);
        await page.waitForFunction(() => window.pm?.room?.isFixed(),null,{timeout:15000});
        const state=await snapshot();
        if(errors.length || state?.errors.length) throw new Error([...errors,...(state?.errors??[])].join('\n'));
        record.moves=state?.moves;
        record.passed=true;
        if(!all || args.includes('--screenshots')) await page.screenshot({path:resolve(out,`${device}-${style}-${room.id}.png`)});
        if (touch) await touch.detach();
      } catch(e) {
        record.error=e.stack ?? String(e);
        await page.screenshot({path:resolve(out,`FAILED-${device}-${style}-${room.id}.png`)}).catch(()=>undefined);
        const state = await page.evaluate(()=>{const sc=window.pm.game.scene.getScenes(true).find(s=>s.def&&s.state);return sc?{def:sc.def,state:sc.state,errors:window.pm.errors}:null;}).catch(()=>null);
        writeFileSync(resolve(out,`FAILED-${device}-${style}-${room.id}.json`),JSON.stringify(state,null,2));
      }
      errors.length=0;
      record.seconds=+( (Date.now()-started)/1000).toFixed(2);
      report.cases.push(record);
      writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));
      console.log(`${record.passed?'PASS':'FAIL'} ${device} ${style} ${room.id} ${room.kind} ${record.seconds}s${record.error?' '+record.error.split('\n')[0]:''}`);
    }
    await context.close();
  }
} finally { await browser.close(); }
const failures = report.cases.filter(c=>!c.passed);
console.log(JSON.stringify({cases:report.cases.length,passed:report.cases.length-failures.length,failed:failures.length,report:resolve(out,'report.json')}));
if(failures.length) process.exitCode=1;
