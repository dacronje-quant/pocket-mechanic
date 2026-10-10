#!/usr/bin/env node
/** Verify catalogue coverage and decode each unique production recording. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';
import { SOUNDS } from './elevenlabs-audio-plan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'public/audio/manifest.json'), 'utf8'));
const cast = JSON.parse(readFileSync(join(ROOT, 'scripts/elevenlabs-cast.json'), 'utf8'));
const ffmpeg = process.env.FFMPEG_PATH || join(ROOT, '.tools/ffmpeg/ffmpeg.exe');
const run = promisify(execFile);
const load = async path => (await runnerImport(join(ROOT, path), { configFile: false, logLevel: 'silent' })).module;
const { allVoiceLines } = await load('src/content/voicelines.ts');
const { VOICES } = await load('src/content/voices.ts');
const { THEMES } = await load('src/audio/music.ts');
const labels = new Set();
function scan(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) scan(path);
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) for (const m of readFileSync(path, 'utf8').matchAll(/\bsay: '([^'\\]{2,60})'/g)) labels.add(m[1]);
  }
}
scan(join(ROOT, 'src'));
const lines = allVoiceLines([...labels]).filter(line => !VOICES[line.who]?.beeps);
const failures = [];
const deviceSpeechIds = lines.filter(line => line.deviceFallback && !manifest.voice[line.id]).map(line => line.id);
for (const line of lines) if (!manifest.voice[line.id] && !line.deviceFallback) failures.push(`Missing voice: ${line.id}`);
for (const id of Object.keys(THEMES)) if (!manifest.music[id]) failures.push(`Missing music: ${id}`);
for (const sound of SOUNDS) if (manifest.sfx[sound.id]?.length !== (sound.variants || 1)) failures.push(`Missing effect variations: ${sound.id}`);
if (cast.characters.nana?.audition !== 'nana-a') failures.push('Nana A is not the selected production actor.');
const files = [...new Set([...Object.values(manifest.voice), ...Object.values(manifest.music), ...Object.values(manifest.sfx).flat()])];
const decoded = [];
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < files.length) {
    const file = files[next++];
    if (!/^(voice|music|sfx)\/[\w-]+\.mp3$/.test(file)) { failures.push(`Invalid asset path: ${file}`); continue; }
    const path = join(ROOT, 'public/audio', file);
    if (!existsSync(path)) { failures.push(`Missing file: ${file}`); continue; }
    try {
      const { stderr } = await run(ffmpeg, ['-hide_banner', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'], { maxBuffer: 256000 });
      const peak = Number(stderr.match(/max_volume: ([-\d.]+) dB/)?.[1]);
      const mean = Number(stderr.match(/mean_volume: ([-\d.]+) dB/)?.[1]);
      if (!Number.isFinite(peak) || peak >= 0 || !Number.isFinite(mean) || mean < -65) throw new Error('Silent or clipped recording.');
      decoded.push({ file, bytes: statSync(path).size, peakDb: peak, meanDb: mean });
    } catch (err) { failures.push(`${file}: ${String(err.message).slice(0, 200)}`); }
  }
}));
const report = {
  checkedAt: new Date().toISOString(), expectedVoiceIds: lines.length, coveredVoiceIds: lines.filter(line => manifest.voice[line.id]).length,
  recordedVoiceIds: Object.keys(manifest.voice).length, deviceSpeechIds,
  uniqueSpokenRecordings: new Set(lines.filter(line=>line.who!=='pudding').map(line=>manifest.voice[line.id]).filter(Boolean)).size,
  musicThemes: Object.keys(manifest.music).length, effectCues: Object.keys(manifest.sfx).length,
  decodedFiles: decoded.length, bytes: decoded.reduce((sum,item)=>sum+item.bytes,0), failures, files: decoded,
};
writeFileSync(join(ROOT, 'public/audio/validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, files: undefined, deviceSpeechIds: deviceSpeechIds.length, failures: failures.slice(0, 15) }, null, 2));
if (failures.length) process.exitCode = 1;
