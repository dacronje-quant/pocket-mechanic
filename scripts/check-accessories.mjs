/** Render every cosmetic on both real character rigs; validate persistence and real taps. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runnerImport } from 'vite';
const require=createRequire(import.meta.url);
let playwright;
try {playwright=process.env.PLAYWRIGHT_MODULE?await import(process.env.PLAYWRIGHT_MODULE):require('playwright');}
catch {playwright=require('C:/Users/dacro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
const {chromium}=playwright;
const args=process.argv.slice(2),option=(name,fallback)=>args.includes(`--${name}`)?args[args.indexOf(`--${name}`)+1]:fallback;
const base=option('url','http://127.0.0.1:4176'),out=resolve(option('out','.qa/accessory-overhaul'));
const {module:{COSMETICS,DEFAULT_LOOK,TESS_LOOK}}=await runnerImport(resolve('src/content/cosmetics.ts'),{configFile:false,logLevel:'silent'});
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:['--disable-gpu','--autoplay-policy=no-user-gesture-required']});
const report={catalogue:COSMETICS.length,rendered:[],interactions:[],screenshots:[],errors:[]};
const assert=(ok,message)=>{if(!ok)throw Error(message);};
try{
  const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto(`${base}/?scene=paint&renderer=canvas`);
  await page.waitForFunction(()=>window.pm?.ready&&window.pm?.hot['slot-hat']);
  await page.evaluate(ids=>{
    const save=window.pm.dev.save,p=save.profiles.find(p=>p.id===save.active);p.repairs=[1,2,3,4,5,6,7,8];p.owned=ids;p.shiny=5000;save.settings.muted=true;
    window.pm.dev.go('paint',{who:'kip'});
  },COSMETICS.map(c=>c.id));
  await page.waitForFunction(()=>window.pm.game.scene.getScene('paint').big.dimensional);
  const capture=async(name)=>{await page.waitForTimeout(180);await page.screenshot({path:resolve(out,`${name}.png`)});report.screenshots.push(name);};
  const defaultRig=await page.evaluate(()=>{
    const k=window.pm.game.scene.getScene('paint').big;
    return {body:k.dimensional.name,old:[k.keyG,k.bulb,k.eyesG,k.legL,k.legR,k.hatG,k.plateG].some(o=>o.visible),rig:k.accessories.front.visible};
  });
  assert(defaultRig.body==='kip:modular'&&!defaultRig.old&&defaultRig.rig,'Default look contains legacy or missing layers');
  report.interactions.push({name:'modular body replaces baked accessories',passed:true});
  const groups=[...new Set(COSMETICS.map(c=>c.slot))];
  for(const who of ['kip','tess']){
    await page.evaluate(who=>window.pm.dev.go('paint',{who}),who);
    await page.waitForFunction(()=>window.pm.game.scene.getScene('paint').big.dimensional);
    for(const slot of groups){
      await page.evaluate(slot=>window.pm.hot[`slot-${slot}`](),slot);
      await page.waitForFunction(()=>!window.pm.game.scene.getScene('paint').load.isLoading());
      for(const cosmetic of COSMETICS.filter(c=>c.slot===slot&&!(who==='tess'&&c.id==='plate-monogram'))){
        const result=await page.evaluate(({cosmetic,baseLook})=>{
          const scene=window.pm.game.scene.getScene('paint'),big=scene.big;
          big.setLook({...baseLook,[cosmetic.slot]:cosmetic.id,initials:'QA'});
          return {id:cosmetic.id,who:big.variant,look:big.getLook()[cosmetic.slot]};
        },{cosmetic,baseLook:who==='kip'?DEFAULT_LOOK:TESS_LOOK});
        await page.waitForFunction(()=>!window.pm.game.scene.getScene('paint').load.isLoading());
        const rendered=await page.evaluate(cosmetic=>{
          const big=window.pm.game.scene.getScene('paint').big,images=[...big.accessories.back.list,...big.accessories.front.list].filter(o=>o.type==='Image');
          const missing=images.filter(o=>!o.visible||o.texture.key==='__WHITE').map(o=>o.name);
          return {missing,oldVisible:[big.keyG,big.bulb,big.eyesG,big.legL,big.legR,big.hatG,big.plateG].some(o=>o.visible),selected:big.getLook()[cosmetic.slot]};
        },cosmetic);
        assert(!rendered.missing.length,`${who}/${cosmetic.id}: missing ${rendered.missing}`);
        assert(!rendered.oldVisible,`${who}/${cosmetic.id}: legacy parts reappeared`);
        assert(rendered.selected===cosmetic.id,`${cosmetic.id}: failed try-on`);
        report.rendered.push({...result,passed:true});
      }
      await capture(`${who}-${slot}`);
    }
    // Fit representative mixed looks to every authored animation pose.
    await page.evaluate(({baseLook})=>{
      const sc=window.pm.game.scene.getScene('paint');sc.big.setLook({...baseLook,hat:'hat-feather',plate:'plate-teacup',key:'key-anchor',bulb:'bulb-flower',feet:'feet-clogs',trail:'trail-notes',tool:'tool-golden'});
    },{baseLook:who==='kip'?DEFAULT_LOOK:TESS_LOOK});
    await page.waitForFunction(()=>!window.pm.game.scene.getScene('paint').load.isLoading());
    for(let pose=0;pose<8;pose++){
      await page.evaluate(pose=>{const big=window.pm.game.scene.getScene('paint').big;big.pose=pose;big.poseUntil=Infinity;},pose);
      await capture(`${who}-pose-${pose}`);
    }
  }
  // Real item taps, saving a look, then a full reload from localStorage.
  await page.evaluate(()=>window.pm.dev.go('paint',{who:'kip'}));
  await page.waitForFunction(()=>window.pm.hot['slot-hat']);
  await page.evaluate(()=>window.pm.hot['slot-hat']());await page.waitForTimeout(300);
  await page.mouse.click(764,245,{delay:100});await page.waitForTimeout(300);
  const worn=await page.evaluate(()=>{const s=window.pm.dev.save;return s.profiles.find(p=>p.id===s.active).look.hat;});
  assert(worn==='hat-party',`Real hat tap wore ${worn}`);
  await page.evaluate(()=>window.pm.game.scene.getScene('paint').bubble.hide());
  await page.mouse.click(1186,650,{delay:100});await page.waitForTimeout(220);
  await page.reload();await page.waitForFunction(()=>window.pm?.ready&&window.pm.hot['slot-hat']);
  const saved=await page.evaluate(()=>{const s=window.pm.dev.save,p=s.profiles.find(p=>p.id===s.active);return{hat:p.look.hat,saved:p.looks.at(-1)?.hat};});
  assert(saved.hat==='hat-party'&&saved.saved==='hat-party','Equipped and saved look did not survive reload');
  report.interactions.push({name:'real item tap, save and reload',passed:true});
  // A borrowed preview must reset on category change; purchasing requires a second tap.
  await page.evaluate(()=>{
    const s=window.pm.dev.save,p=s.profiles.find(p=>p.id===s.active);p.owned=p.owned.filter(id=>id!=='key-heart');p.shiny=120;
    window.pm.hot['slot-key']();
  });await page.waitForTimeout(250);
  await page.mouse.click(764,245,{delay:100});await page.waitForTimeout(200);
  let trial=await page.evaluate(()=>{const s=window.pm.dev.save,p=s.profiles.find(p=>p.id===s.active),sc=window.pm.game.scene.getScene('paint');return{saved:p.look.key,preview:sc.big.getLook().key,bits:p.shiny};});
  assert(trial.saved==='key-classic'&&trial.preview==='key-heart'&&trial.bits===120,'First tap bought rather than previewed the key');
  await page.evaluate(()=>window.pm.hot['slot-hat']());
  assert(await page.evaluate(()=>window.pm.game.scene.getScene('paint').big.getLook().key)==='key-classic','Category change retained an unsaved try-on');
  await page.evaluate(()=>window.pm.hot['slot-key']());await page.waitForTimeout(120);
  await page.mouse.click(764,245,{delay:100});await page.waitForTimeout(100);await page.mouse.click(764,245,{delay:100});await page.waitForTimeout(180);
  trial=await page.evaluate(()=>{const s=window.pm.dev.save,p=s.profiles.find(p=>p.id===s.active);return{saved:p.look.key,bits:p.shiny,owned:p.owned.includes('key-heart')};});
  assert(trial.saved==='key-heart'&&trial.bits===60&&trial.owned,'Confirmed purchase lost its appearance or price');
  report.interactions.push({name:'try-on cancellation and confirmed purchase',passed:true});
  // Scrolling and taps work at phone landscape size without page overflow.
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>window.pm.hot['slot-bulb']());await page.waitForTimeout(300);
  await capture('phone-landscape-bulbs');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Phone page overflow');
  report.interactions.push({name:'phone landscape fit',passed:true});
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(()=>{
    const s=window.pm.dev.save,p=s.profiles.find(p=>p.id===s.active);
    p.look={...p.look,hat:'hat-conductor',key:'key-star',bulb:'topper-star',feet:'feet-wheels',plate:'plate-gear',tool:'tool-rainbow'};
    p.tessLook={...p.tessLook,hat:'hat-flowers',key:'key-heart',bulb:'bulb-flower',feet:'feet-clogs',plate:'plate-heart',tool:'tool-teapot'};
    s.settings.coop='tess';window.pm.dev.persist();
  });
  await page.goto(`${base}/?room=1-1&mode=free&renderer=canvas`);
  await page.waitForFunction(()=>window.pm?.room?.roomId==='1-1');
  await page.waitForFunction(()=>window.pm.game.scene.getScenes(true).find(s=>s.def)?.kip?.dimensional);
  await page.waitForTimeout(600);await capture('room-both-characters');
  const both=await page.evaluate(()=>{const sc=window.pm.game.scene.getScenes(true).find(s=>s.def);return{kip:sc.kip?.dimensional?.name,tess:sc.tess?.dimensional?.name};});
  assert(both.kip==='kip:modular'&&both.tess==='tess:modular','Room did not use both refreshed rigs');
  report.interactions.push({name:'both characters in a real repair room',passed:true});
  // Fresh install caches the complete accessory pack, including categories never opened online.
  const offlineContext=await browser.newContext({viewport:{width:1280,height:720}}),offlinePage=await offlineContext.newPage();
  offlinePage.on('pageerror',e=>report.errors.push(String(e)));
  await offlinePage.goto(`${base}/?scene=paint&renderer=canvas`);
  await offlinePage.waitForFunction(()=>window.pm?.ready&&window.pm.hot['slot-hat']);
  await offlinePage.evaluate(()=>navigator.serviceWorker.ready);
  await offlinePage.waitForFunction(()=>navigator.serviceWorker.controller);
  const offlineCache=await offlinePage.evaluate(async()=>{
    const key=(await caches.keys()).find(key=>key.startsWith('pm-')),cache=await caches.open(key),files=(await(await cache.match(new URL('./art/manifest.json',location.href).href)).json()).images;
    const accessories=Object.values(files).filter(file=>file.startsWith('accessories/'));
    for(const file of accessories)if(!await cache.match(new URL('./art/'+file,location.href).href))throw Error('Uncached accessory '+file);
    return accessories.length;
  });assert(offlineCache===8,`Expected eight cached sheets, found ${offlineCache}`);
  await offlineContext.setOffline(true);await offlinePage.reload();
  await offlinePage.waitForFunction(()=>window.pm?.ready&&window.pm.hot['slot-hat']);
  await offlinePage.evaluate(()=>window.pm.hot['slot-hat']());
  await offlinePage.waitForFunction(()=>!window.pm.game.scene.getScene('paint').load.isLoading());
  await offlinePage.waitForFunction(()=>window.pm.game.scene.getScene('paint').big.dimensional);
  await offlinePage.screenshot({path:resolve(out,'offline-hats.png')});report.screenshots.push('offline-hats');
  assert(!(await offlinePage.evaluate(()=>window.pm.errors)).length,'Offline accessory scene raised errors');
  report.interactions.push({name:'fresh-install offline accessory pack',passed:true,cachedSheets:offlineCache});
  await offlineContext.close();
  report.errors.push(...await page.evaluate(()=>window.pm.errors));assert(!report.errors.length,report.errors.join('\n'));
  writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({rendered:report.rendered.length,interactions:report.interactions.length,screenshots:report.screenshots.length,errors:report.errors.length}));
}catch(error){report.failure=String(error.stack??error);writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));throw error;}
finally{await browser.close();}
