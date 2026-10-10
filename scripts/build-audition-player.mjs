#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(ROOT, 'auditions', 'elevenlabs');
const pack = JSON.parse(readFileSync(join(dir, 'pack.json'), 'utf8'));
const data = JSON.stringify(pack).replace(/</g, '\\u003c');
writeFileSync(join(dir, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pocket Mechanic · Audio audition</title>
<style>
:root{color-scheme:light;--ink:#26382f;--muted:#647168;--paper:#f5f1e7;--card:#fffdf7;--line:#dcded1;--green:#345d43;--gold:#b8812d}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1120px;margin:auto;padding:42px 28px 150px}.eyebrow{font-size:12px;letter-spacing:.18em;font-weight:750;color:var(--green);text-transform:uppercase}
header{border-bottom:1px solid var(--line);padding-bottom:30px;margin-bottom:34px}h1{font:normal clamp(34px,5vw,55px)/1.1 Georgia,serif;letter-spacing:-.035em;max-width:700px;margin:18px 0}
p{margin:10px 0}.intro{max-width:720px;color:var(--muted)}.tags{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.tag{border:1px solid var(--line);border-radius:24px;padding:5px 13px;font-size:13px;background:var(--card)}
section{margin:38px 0}h2{font:normal 30px/1.2 Georgia,serif;margin:0 0 8px}h3{font-size:17px;line-height:1.3;margin:6px 0 14px}.section-top{display:flex;gap:20px;align-items:baseline;justify-content:space-between}.number{color:var(--gold);font:italic 19px Georgia,serif;margin-right:12px}
.help{font-size:14px;color:var(--muted);margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card{background:var(--card);border:1px solid var(--line);border-radius:15px;padding:20px;position:relative}
.card:has(input:checked){border:2px solid var(--green);padding:19px;background:#f0f5ea}.badge{display:inline-flex;align-items:center;justify-content:center;background:#e9ecdF;color:var(--green);border-radius:50%;width:38px;height:38px;font-weight:750;margin-bottom:10px}
audio{display:block;width:100%;height:42px;margin:12px 0}label.pick{display:flex;align-items:center;gap:10px;cursor:pointer;min-height:44px;font-size:14px;font-weight:650}input[type=radio],input[type=checkbox]{accent-color:var(--green);width:18px;height:18px;flex-shrink:0}
details{margin:18px 0;font-size:14px;color:var(--muted)}summary{cursor:pointer;min-height:36px}.transcript{border-left:2px solid var(--gold);padding:8px 16px;max-width:900px}
.music-card{display:grid;grid-template-columns:1fr 1.2fr;gap:30px;align-items:center}.music-description{color:var(--muted);font-size:14px}.music-actions{display:flex;flex-wrap:wrap;gap:8px 24px}.pending{border-style:dashed;background:#f7f5ef;color:var(--muted);padding:20px;border-radius:12px}
.sound-icon{font-size:26px;line-height:1.3;color:var(--gold);min-height:40px}.sounds h3{min-height:42px}.sound-duration{font-size:12px;color:var(--muted)}
.choices{background:#e9eedf;padding:25px;border-radius:15px;border:1px solid #ced9bf}.choices h2{font-size:26px}textarea{display:block;width:100%;font:inherit;font-size:14px;min-height:85px;border:1px solid #becbb1;border-radius:8px;background:var(--card);padding:12px;margin:12px 0}
.footer{position:fixed;bottom:0;left:0;right:0;background:rgba(255,253,247,.97);border-top:1px solid var(--line);padding:16px 28px;z-index:2}.footer-inner{max-width:1064px;display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;align-items:center;margin:auto}.selection-text{font-size:14px;color:var(--muted)}
button{font:inherit;font-size:14px;font-weight:650;border:1px solid var(--green);background:var(--green);color:white;border-radius:8px;padding:10px 18px;cursor:pointer;min-height:44px}button.secondary{background:transparent;color:var(--green)}button:focus-visible,input:focus-visible,audio:focus-visible,textarea:focus-visible{outline:3px solid var(--gold);outline-offset:3px}.buttons{display:flex;gap:10px}#message{font-size:13px;color:var(--green);min-height:24px}a{color:var(--green)}
@media(max-width:760px){main{padding:28px 18px 190px}.grid{grid-template-columns:1fr}.music-card{grid-template-columns:1fr;gap:12px}.section-top{display:block}.footer{padding:12px 18px}.footer-inner{gap:8px}.buttons{width:100%}.buttons button{flex:1}.sounds h3{min-height:0}}
</style>
</head>
<body><main>
<header><div class="eyebrow">Pocket Mechanic / Audio audition</div><h1>Find the voice of Brasswick.</h1>
<p class="intro">A kind clockmaker, a magnificent magpie, and a workshop full of little sounds. Listen, compare, and choose what feels right for the game.</p>
<div class="tags"><span class="tag">Three Nana candidates</span><span class="tag">Three Magnus candidates</span><span class="tag">One workshop theme</span><span class="tag">Six mechanical sounds</span></div></header>
<section><div class="section-top"><h2><span class="number">01</span>Nana Odette</h2><span class="help">Warm · patient · gently playful</span></div>
<p class="help">Each candidate reads the same game dialogue. Listen for kindness, clarity, and an unhurried pace.</p><div class="grid" id="nana"></div><details><summary>Read Nana’s audition lines</summary><div class="transcript" id="nana-text"></div></details></section>
<section><div class="section-top"><h2><span class="number">02</span>Magnus the Magnificent</h2><span class="help">Theatrical · vain · secretly lonely</span></div>
<p class="help">Listen for comic grandeur and the softer moment beneath it. He should feel lovable to young children.</p><div class="grid" id="magnus"></div><details><summary>Read Magnus’s audition lines</summary><div class="transcript" id="magnus-text"></div></details></section>
<section><h2><span class="number">03</span>The clockwork workshop</h2><p class="help">An instrumental music audition. Try repeating it to hear how the ending meets the opening.</p><div id="music"></div></section>
<section><h2><span class="number">04</span>Small sounds, big satisfaction</h2><p class="help">Select the mechanical sounds you like. Listen for a tactile, gentle feel that is comfortable to hear repeatedly.</p><div class="grid sounds" id="sfx"></div></section>
<section class="choices"><h2>What should we carry into the game?</h2><label for="notes">Anything to soften, brighten, or make more playful?</label><textarea id="notes" placeholder="For example: Nana B, Magnus A, quieter bells, more wooden clicks…"></textarea><p class="help">Your picks stay on this device. Copy or download them to share your choices in the chat.</p><button class="secondary" id="clear">Clear choices</button><div id="message" role="status" aria-live="polite"></div></section>
</main><footer class="footer"><div class="footer-inner"><span class="selection-text" id="selection">Choose Nana and Magnus to get started.</span><div class="buttons"><button class="secondary" id="copy">Copy choices</button><button id="download">Download choices</button></div></div></footer>
<script id="pack-data" type="application/json">${data}</script>
<script>
const pack=JSON.parse(document.getElementById('pack-data').textContent);
const stateKey='pocket-mechanic-elevenlabs-audition-v1';
let choices={nana:null,magnus:null,music:null,sounds:[],notes:''};
try{const saved=JSON.parse(localStorage.getItem(stateKey)||'null');if(saved)Object.assign(choices,saved)}catch{}
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node};
const allAudio=[];
function player(item){const audio=el('audio');audio.controls=true;audio.preload='metadata';audio.src=item.file;audio.setAttribute('aria-label',item.title+(item.option?' candidate '+item.option:''));audio.volume=item.kind==='music'?0.35:0.65;allAudio.push(audio);audio.addEventListener('play',()=>allAudio.forEach(other=>{if(other!==audio)other.pause()}));return audio}
function pick(label,name,value,type='radio'){const line=el('label','pick');const input=el('input');input.type=type;input.name=name;input.value=value;input.checked=type==='checkbox'?choices.sounds.includes(value):choices[name]===value;input.addEventListener('change',()=>{if(type==='checkbox'){choices.sounds=choices.sounds.filter(v=>v!==value);if(input.checked)choices.sounds.push(value)}else choices[name]=value;save()});line.append(input,document.createTextNode(label));return line}
function save(){choices.notes=document.getElementById('notes').value;try{localStorage.setItem(stateKey,JSON.stringify(choices))}catch{}const chosen=[choices.nana?'Nana '+choices.nana.split('-').at(-1).toUpperCase():null,choices.magnus?'Magnus '+choices.magnus.split('-').at(-1).toUpperCase():null,choices.music?(choices.music==='keep-existing'?'Existing music':'Workshop theme'):null,choices.sounds.length+' '+(choices.sounds.length===1?'sound':'sounds')].filter(Boolean);document.getElementById('selection').textContent=chosen.join(' · ')}
function pending(message){return el('div','pending',message)}
for(const who of ['nana','magnus']){const items=pack.items.filter(item=>item.taskId===who);for(const item of items){const card=el('article','card');card.append(el('span','badge',item.option),el('h3',null,'Candidate '+item.option),player(item),pick('Choose '+item.option,who,item.id));document.getElementById(who).append(card)}if(!items.length)document.getElementById(who).append(pending('Voice audition is not available yet.'));document.getElementById(who+'-text').textContent=items[0]?.text||''}
const music=pack.items.find(item=>item.kind==='music');
if(music){const card=el('article','card music-card');const info=el('div');info.append(el('h3',null,music.title),el('p','music-description','Soft ukulele, glockenspiel, warm bass, and ticking percussion. A gentle theme for tinkering.'));const controls=el('div');const audio=player(music);controls.append(audio);const actions=el('div','music-actions');const loop=el('label','pick');const check=el('input');check.type='checkbox';check.addEventListener('change',()=>audio.loop=check.checked);loop.append(check,document.createTextNode('Repeat theme'));actions.append(loop,pick('Prefer this theme','music',music.id),pick('Keep existing music','music','keep-existing'));controls.append(actions);card.append(info,controls);document.getElementById('music').append(card)}else document.getElementById('music').append(pending('Music preview is waiting for the API key’s Music generation permission.'));
const icons={clunk:'⚙',ratchet:'↻','tick-tock':'◷',spring:'〰',steam:'♨',doorbell:'♧'};
const sfx=pack.items.filter(item=>item.kind==='sfx');for(const item of sfx){const card=el('article','card');card.append(el('div','sound-icon',icons[item.taskId]||'◌'),el('h3',null,item.title),el('span','sound-duration',item.duration.toFixed(1)+' seconds'),player(item),pick('Keep this sound','sounds',item.id,'checkbox'));document.getElementById('sfx').append(card)}
if(!sfx.length)document.getElementById('sfx').append(pending('Mechanical previews are waiting for the API key’s Sound generation permission.'));
document.getElementById('notes').value=choices.notes;document.getElementById('notes').addEventListener('input',save);save();
function output(){return {project:'Pocket Mechanic',pack:'elevenlabs',nana:choices.nana,magnus:choices.magnus,music:choices.music,sounds:choices.sounds,notes:choices.notes}}
document.getElementById('copy').addEventListener('click',async()=>{const text=JSON.stringify(output(),null,2);try{await navigator.clipboard.writeText(text);document.getElementById('message').textContent='Choices copied. Paste them into the chat.'}catch{document.getElementById('message').textContent='Copy is unavailable here. Use Download choices instead.'}});
document.getElementById('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(output(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pocket-mechanic-audition-choices.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.getElementById('message').textContent='Your choices have been downloaded.'});
document.getElementById('clear').addEventListener('click',()=>{choices={nana:null,magnus:null,music:null,sounds:[],notes:''};document.querySelectorAll('input[name=nana],input[name=magnus],input[name=music],input[name=sounds]').forEach(input=>input.checked=false);document.getElementById('notes').value='';save();document.getElementById('message').textContent='Choices cleared.'});
</script></body></html>`);
console.log(`Built audition player with ${pack.items.length} samples.`);
