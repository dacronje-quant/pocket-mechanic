/** Observe real Web Audio; trigger performances only through visible Town/Shelf controls. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { runnerImport } from 'vite';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = process.env.PLAYWRIGHT_MODULE ? await import(process.env.PLAYWRIGHT_MODULE) : require('playwright'); }
catch { playwright = require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const args = process.argv.slice(2);
const opt = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`)+1] : fallback;
const base = opt('url', 'http://127.0.0.1:4176'), out = resolve(opt('out', '.qa/sweep/object-sounds'));
const { REPAIRS } = (await runnerImport(resolve('src/content/repairs.ts'), { configFile:false,logLevel:'silent' })).module;
mkdirSync(out, {recursive:true});
const manifest = await (await fetch(`${base}/audio/manifest.json`)).json();
const expected = Object.fromEntries(REPAIRS.map(repair => [repair.object,manifest.sfx[`object-${repair.object}`]?.[0]]));
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
writeFileSync(resolve(out,'audition.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Repaired object sounds</title><style>body{margin:0;padding:32px;background:#ece2c8;color:#342f29;font:18px system-ui;max-width:1100px;margin:auto}h1{font:36px Georgia;margin:0 0 12px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}article{padding:20px;background:#f7efd9;border:2px solid #956d48;border-radius:12px}h2{font:24px Georgia;margin:0 0 14px}audio{width:100%}small{display:block;font-size:12px;overflow-wrap:anywhere;margin-top:10px}</style><h1>Repaired object sounds</h1><p>Play each recording to review its character and sound quality. These are the exact files used by the game.</p><main>${REPAIRS.map(repair=>{const file=expected[repair.object],path=file?relative(out,resolve('public/audio',file)).replaceAll('\\','/'):'';return `<article><h2>${repair.id}. ${esc(repair.object)}</h2>${file?`<audio controls preload="none" src="${esc(path)}"></audio><small>${esc(file)}</small>`:'Recording is not yet generated.'}</article>`;}).join('')}</main></html>`);
if(args.includes('--audition-only')) {console.log(resolve(out,'audition.html'));process.exit(0);}
const requireRecorded = args.includes('--require-recorded');
if(requireRecorded&&Object.values(expected).some(file=>!file)) throw new Error('All eight object-* recordings must exist before the recorded-output audit.');
const browser = await playwright.chromium.launch({ channel:'chrome',args:['--disable-gpu','--autoplay-policy=no-user-gesture-required'] });
const report = { started:new Date().toISOString(), build:base, input:'actual mouse clicks; save and scene fixtures only', limit:'Verifies actual source starts, gain paths and cancellation in headless Web Audio. It does not verify physical speaker output or human judgement of the recordings.', cases:[] };
const assert = (value, message) => { if(!value) throw new Error(message); };

function installAudioProbe() {
  const ids = new WeakMap(), nodes = new Map(), edges = new Map(), starts = [], stops = [], disconnected = [];
  let next = 0;
  const id = n => { if(!ids.has(n)){ids.set(n,++next);nodes.set(next,n);} return ids.get(n); };
  const connect = AudioNode.prototype.connect, disconnect = AudioNode.prototype.disconnect;
  AudioNode.prototype.connect = function(...args) {
    const result = connect.apply(this,args), to=args[0];
    if(to instanceof AudioNode){const source=id(this);if(!edges.has(source))edges.set(source,new Set());edges.get(source).add(id(to));}
    return result;
  };
  AudioNode.prototype.disconnect = function(...args) {
    const result=disconnect.apply(this,args), source=id(this);
    disconnected.push({id:source,at:performance.now()});
    if(!args.length) edges.delete(source);
    else if(args[0] instanceof AudioNode) edges.get(source)?.delete(id(args[0]));
    return result;
  };
  const route = node => {
    const result=[],seen=new Set();let at=id(node);
    while(at&&!seen.has(at)){seen.add(at);const n=nodes.get(at);result.push({id:at,type:n.constructor.name,gain:n instanceof GainNode?n.gain.value:undefined});at=[...(edges.get(at)??[])][0];}
    return result;
  };
  const arrays=new WeakMap(),buffers=new WeakMap(),decodedUrls=[],fetchOriginal=window.fetch;
  window.fetch=async function(...args){const response=await fetchOriginal.apply(this,args),array=response.arrayBuffer.bind(response),url=String(args[0]);response.arrayBuffer=async()=>{const data=await array();arrays.set(data,url);return data;};return response;};
  const decode=AudioContext.prototype.decodeAudioData;
  AudioContext.prototype.decodeAudioData=function(data,success,error){const url=arrays.get(data);const remember=buffer=>{buffers.set(buffer,url);if(url&&!decodedUrls.includes(url))decodedUrls.push(url);};const done=buffer=>{remember(buffer);success?.(buffer);};const result=decode.call(this,data,done,error);result?.then(remember,()=>undefined);return result;};
  for(const Ctor of [AudioBufferSourceNode,OscillatorNode]) {
    const start=Ctor.prototype.start,stop=Ctor.prototype.stop;
    Ctor.prototype.start=function(...args){const path=route(this),gains=path.filter(n=>n.type==='GainNode'),entry={id:id(this),at:performance.now(),scheduled:args[0]??0,context:this.context.currentTime,contextState:this.context.state,type:Ctor.name,url:buffers.get(this.buffer),frequency:this.frequency?.value,path,group:gains.length>=4?gains[gains.length-3].id:null,outputLevel:gains.length>=2?gains.slice(-2).reduce((v,n)=>v*n.gain,1):null,ended:false};starts.push(entry);this.addEventListener('ended',()=>{entry.ended=true;});return start.apply(this,args);};
    Ctor.prototype.stop=function(...args){stops.push({id:id(this),at:performance.now(),scheduled:args[0]??null,context:this.context.currentTime,immediate:args[0]===undefined||args[0]<=this.context.currentTime+.04});return stop.apply(this,args);};
  }
  window.__objectAudio={decodedUrls,snapshot:()=>({now:performance.now(),starts:starts.map(s=>({...s})),stops:[...stops],disconnected:[...disconnected]})};
}

const makePage = async () => {
  const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'}),page=await context.newPage();
  await page.addInitScript(installAudioProbe);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`${base}/?renderer=canvas&scene=shelf`);
  await page.waitForFunction(()=>window.pm?.dev&&window.pm.scene==='shelf');
  await page.mouse.click(1275,715,{delay:80}); // actual first input unlocks the audio context
  if(requireRecorded) await page.waitForFunction(files=>files.every(file=>window.__objectAudio.decodedUrls.some(url=>url.endsWith(file))),Object.values(expected),{timeout:20000});
  return {context,page,errors};
};
const audio = page => page.evaluate(()=>window.__objectAudio.snapshot());
async function setup(page, scene, levels={muted:false,sfx:.85}) {
  await page.evaluate(({scene,levels})=>{const save=window.pm.dev.save,p=save.profiles.find(p=>p.id===save.active);p.repairs=[1,2,3,4,5,6,7,8];p.style='fixer';Object.assign(save.settings,{music:0,voice:0,readAloud:false,calm:true,subtitles:'on',...levels});window.pm.dev.persist();window.pm.dev.go(scene);},{scene,levels});
  await page.waitForFunction(key=>window.pm.scene===key,scene);await page.waitForTimeout(350);
}
const machine = (page,scene,repair) => page.evaluate(({scene,repair})=>{const sc=window.pm.game.scene.getScenes(true).find(s=>s.scene.key===scene);const m=scene==='town'?sc.machines.get(repair):sc.children.list.find(o=>o.id===window.__objectIds[repair]);return m?{id:m.id,x:m.x,y:m.y,performing:m.performing,t:m.t,working:m.working}:null;},{scene,repair});
async function trigger(page,scene,repair,replay=false) {
  const target=await page.evaluate(({scene,repair,replay})=>{const sc=window.pm.game.scene.getScenes(true).find(s=>s.scene.key===scene);if(scene==='town'){const zone=sc.children.list.find(o=>o.name===`town:visit:${repair}`);return{x:zone.x,y:zone.y};}if(replay)return{x:1100,y:160};const m=sc.children.list.find(o=>o.id===window.__objectIds[repair]);return{x:m.x,y:m.y-20};},{scene,repair,replay});
  await page.mouse.click(target.x,target.y,{delay:70});await page.waitForTimeout(350);
}
async function check(name,callback,page) {
  const record={name,passed:false};
  try {record.details=await callback();record.passed=true;}
  catch(e){record.error=String(e);if(page)await page.screenshot({path:resolve(out,`FAILED-${name}.png`)});}
  report.cases.push(record);writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(`${record.passed?'PASS':'FAIL'} ${name}${record.error?' '+record.error:''}`);
}
const newOwned = (snapshot,since) => snapshot.starts.filter(s=>s.at>=since&&s.group!==null);
// Background music can have several gain stages too. Recorded-output checks
// must identify the object's exact file, rather than treating every deep path as it.
const objectSources = (snapshot,since,object) => newOwned(snapshot,since).filter(source=>!requireRecorded||source.url?.endsWith(expected[object]));
try {
  const live=await makePage();
  await live.page.evaluate(ids=>window.__objectIds=ids,Object.fromEntries(REPAIRS.map(r=>[r.id,r.object])));
  for(const scene of ['town','shelf'])for(const repair of REPAIRS) {
    await check(`${scene}-${repair.object}-play-replay`,async()=>{
      await setup(live.page,scene);const before=await audio(live.page);await trigger(live.page,scene,repair.id);
      const first=await audio(live.page),sources=objectSources(first,before.now,repair.object),m=await machine(live.page,scene,repair.id);
      assert(sources.length>0,'No owned audio sources from actual object tap');
      assert(sources.every(s=>s.outputLevel>0),'Performance did not reach audible output levels');
      if(requireRecorded)assert(sources.some(s=>s.url?.endsWith(expected[repair.object])),`Tap did not start object-${repair.object} recording`);
      assert(m?.working&&m.performing>0,'Performance animation did not start');
      const groups=[...new Set(sources.map(s=>s.group))];await trigger(live.page,scene,repair.id,true);
      const replay=await audio(live.page),restarted=objectSources(replay,first.now,repair.object);
      assert(restarted.some(s=>!groups.includes(s.group)),'Replay failed to create a fresh performance');
      if(requireRecorded)assert(restarted.some(s=>s.url?.endsWith(expected[repair.object])),`Replay did not start object-${repair.object} recording`);
      assert(groups.every(g=>replay.disconnected.some(d=>d.id===g&&d.at>=first.now)),'Replay left old owned audio connected');
      assert(sources.every(s=>replay.stops.some(stop=>stop.id===s.id&&stop.immediate&&stop.at>=first.now)),'Replay did not stop the previous audio sources');
      return {sources:sources.length,recording:expected[repair.object],signature:sources.map(s=>({type:s.type,url:s.url,frequency:s.frequency})),oldGroups:groups,newGroups:[...new Set(restarted.map(s=>s.group))],stoppedSources:sources.map(s=>s.id),animation:m.performing};
    },live.page);
    for(const [label,levels] of [['muted',{muted:true,sfx:.85}],['sfx-off',{muted:false,sfx:0}]])await check(`${scene}-${repair.object}-${label}`,async()=>{
      await setup(live.page,scene,levels);const before=await audio(live.page);await trigger(live.page,scene,repair.id);
      const after=await audio(live.page),sources=objectSources(after,before.now,repair.object),m=await machine(live.page,scene,repair.id);
      assert(sources.length>0,'Expected source observation even at zero output');assert(sources.every(s=>s.outputLevel===0),'Silent setting retained nonzero output path');assert(m?.working&&m.performing>0,'Silent setting stopped the visual performance');
      return{sources:sources.length,outputLevels:[...new Set(sources.map(s=>s.outputLevel))],animation:m.performing};
    },live.page);
  }
  assert(!live.errors.length,live.errors.join('\n'));
  await live.context.close();
  // One shared seven-second observation covers leaving both scenes before long melodies finish.
  const pending=[];
  for(const scene of ['town','shelf']){
    const fixture=await makePage();await fixture.page.evaluate(ids=>window.__objectIds=ids,Object.fromEntries(REPAIRS.map(r=>[r.id,r.object])));
    await setup(fixture.page,scene);const before=await audio(fixture.page);await trigger(fixture.page,scene,2);const started=await audio(fixture.page),sources=objectSources(started,before.now,'musicbox'),groups=[...new Set(sources.map(s=>s.group))];
    await fixture.page.mouse.click(scene==='town'?56:1200,scene==='town'?52:140,{delay:70});
    if(scene==='shelf')await fixture.page.mouse.click(56,52,{delay:70});
    await fixture.page.waitForFunction(()=>window.pm.scene==='shop');const left=await audio(fixture.page);pending.push({scene,...fixture,groups,sources,left});
  }
  await pending[0].page.waitForTimeout(7000);
  for(const item of pending){await check(`${item.scene}-leave-cancels-future-cues`,async()=>{const final=await audio(item.page);assert(item.groups.length>0,'No performance groups observed');assert(item.groups.every(g=>final.disconnected.some(d=>d.id===g&&d.at>=item.left.now-500)),'Scene leave retained connected performance');assert(item.sources.every(s=>final.stops.some(stop=>stop.id===s.id&&stop.immediate&&stop.at>=item.left.now-500)),'Scene leave did not stop the prior audio sources');assert(!final.starts.some(s=>item.groups.includes(s.group)&&s.at>item.left.now),'A prior-scene cue started after leaving');assert(!item.errors.length,item.errors.join('\n'));return{groups:item.groups,stoppedSources:item.sources.map(s=>s.id),watchedMs:final.now-item.left.now,futureStarts:0};},item.page);await item.context.close();}
} finally {await browser.close();}
report.completed=new Date().toISOString();writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));
const failed=report.cases.filter(c=>!c.passed);console.log(JSON.stringify({cases:report.cases.length,failed:failed.length,report:resolve(out,'report.json')}));if(failed.length)process.exitCode=1;
