#!/usr/bin/env node
/** Verify the committed /docs game contains the exact production code and media. */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=join(root,'public'),published=join(root,'docs/play');
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const art=json(join(source,'art/manifest.json')),audio=json(join(source,'audio/manifest.json'));
assert.deepEqual(json(join(published,'art/manifest.json')),art,'Published art catalogue is stale');
assert.deepEqual(json(join(published,'audio/manifest.json')),audio,'Published audio catalogue is stale');
const pictures=[...new Set(Object.values(art.images))];
const recordings=[...new Set([...Object.values(audio.voice),...Object.values(audio.music),...Object.values(audio.sfx).flat()])];
const files=[...pictures.map(file=>'art/'+file),...recordings.map(file=>'audio/'+file),'sw.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
for(const file of files){
  assert.ok(!file.includes('..')&&!file.startsWith('/')&&!file.includes('\\'),`Unsafe media path: ${file}`);
  assert.equal(hash(join(published,file)),hash(join(source,file)),`Published file differs: ${file}`);
}
const html=readFileSync(join(published,'index.html'),'utf8');
const moduleFile=html.match(/<script\b[^>]*src=["']([^"']+\.js)["']/)?.[1];
assert.ok(moduleFile?.startsWith('./assets/'),'Published HTML must load a relative local game bundle');
assert.ok(existsSync(join(published,moduleFile)),'Published JS bundle is missing');
if(existsSync(join(root,'dist/index.html'))){
  assert.equal(html,readFileSync(join(root,'dist/index.html'),'utf8'),'Published HTML differs from production dist');
  assert.equal(hash(join(published,moduleFile)),hash(join(root,'dist',moduleFile)),'Published JS differs from production dist');
}
console.log(JSON.stringify({published:'docs/play',bundle:moduleFile,identicalArtFiles:pictures.length,identicalAudioFiles:recordings.length,checkedFiles:files.length,errors:[]},null,2));
