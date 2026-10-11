#!/usr/bin/env node
/** Resumable production generator. API keys are never saved or sent to the client. */
import { loadEnvFile } from 'node:process';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';
import { MUSIC, SOUNDS } from './elevenlabs-audio-plan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = join(ROOT, 'public/audio');
const WORK = join(ROOT, '.asset-work/elevenlabs');
const CAST_PATH = join(ROOT, 'scripts/elevenlabs-cast.json');
const REPORT_PATH = join(WORK, 'report.json');
const MANIFEST_PATH = join(AUDIO, 'manifest.json');
const args = process.argv.slice(2);
const opt = (key, fallback) => args.includes(`--${key}`) ? args[args.indexOf(`--${key}`) + 1] : fallback;
const dry = args.includes('--dry-run');
const only = opt('only', '');
const limit = Number(opt('limit', 'Infinity'));
const concurrency = Math.max(1, Math.min(3, Number(opt('concurrency', '2'))));
const want = ['cast', 'voices', 'music', 'sfx'].filter(k => args.includes(k));
if (!want.length) want.push('voices', 'music', 'sfx');
const load = async p => (await runnerImport(join(ROOT, p), { configFile: false, logLevel: 'silent' })).module;
const { VOICES } = await load('src/content/voices.ts');
const { allVoiceLines } = await load('src/content/voicelines.ts');
const { THEMES } = await load('src/audio/music.ts');
const readJson = (p, fallback) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback;
const atomic = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path + '.tmp', JSON.stringify(value, null, 2) + '\n'); renameSync(path + '.tmp', path); };
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 20);
const labels = new Set();
function scan(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) scan(path);
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) for (const m of readFileSync(path, 'utf8').matchAll(/\bsay: '([^'\\]{2,60})'/g)) labels.add(m[1]);
  }
}
scan(join(ROOT, 'src'));
const catalogue = allVoiceLines([...labels]).filter(l => !VOICES[l.who]?.beeps);
const lines = catalogue.filter(l => l.who !== 'pudding');
const actors = [...new Set(lines.map(l => l.who))];
const cast = readJson(CAST_PATH, { provider: 'ElevenLabs', model: 'eleven_v3', characters: {} });
const report = readJson(REPORT_PATH, { completed: {}, reportedCredits: 0 });
const manifest = { voice: {}, music: {}, sfx: {}, ...readJson(MANIFEST_PATH, {}) };
const ffmpeg = process.env.FFMPEG_PATH || (existsSync(join(ROOT, '.tools/ffmpeg/ffmpeg.exe')) ? join(ROOT, '.tools/ffmpeg/ffmpeg.exe') : 'ffmpeg');
if (!dry) {
  if (existsSync(join(ROOT, '.env'))) loadEnvFile(join(ROOT, '.env'));
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('Set ELEVENLABS_API_KEY in the root .env.');
  execFileSync(ffmpeg, ['-version'], { stdio: 'ignore' });
  mkdirSync(WORK, { recursive: true });
}
const key = process.env.ELEVENLABS_API_KEY;
const safe = text => String(text).split(key || '__no_key__').join('[redacted]');
const snooze = ms => new Promise(r => setTimeout(r, ms));
let halted = false;
async function api(path, body, timeout = 120000) {
  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try {
      res = await fetch('https://api.elevenlabs.io' + path, {
        method: body ? 'POST' : 'GET', headers: { 'xi-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeout),
      });
    } catch (err) { halted = true; throw new Error(safe(`Outcome uncertain; check ElevenLabs history before resuming: ${err.message}`)); }
    if (res.status === 429 && attempt < 3) { await res.arrayBuffer(); await snooze(Math.min(30000, 4000 * 2 ** attempt)); continue; }
    if (!res.ok) {
      const err = safe(await res.text());
      if (res.status === 401 || res.status === 403 || /quota|credit|limit_exceeded/i.test(err)) halted = true;
      throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 700)}`);
    }
    const cost = Number(res.headers.get('character-cost') || 0);
    report.reportedCredits += cost;
    return res;
  }
}
function normalize(source, relative, kind, trim = {}, voiceProcessing, highQuality = false) {
  const output = join(AUDIO, relative);
  mkdirSync(dirname(output), { recursive: true });
  const filters = [];
  if (trim.start !== undefined) filters.push(`atrim=start=${trim.start}:duration=${trim.seconds},asetpts=PTS-STARTPTS`);
  if (kind !== 'music') filters.push('silenceremove=start_periods=1:start_duration=0.005:start_threshold=-48dB');
  if (voiceProcessing === 'clockwork-robot-v1') {
    // A gentle mechanical buzz and short metallic resonance; retain clear words.
    filters.push('tremolo=f=35:d=0.32', 'aecho=0.8:0.75:7|14:0.22|0.12');
  } else if (voiceProcessing) throw new Error('Unsupported voice processing profile.');
  const target = kind === 'voice' ? -20 : kind === 'music' ? -24 : -23;
  let normalization = `loudnorm=I=${target}:TP=-2:LRA=7`;
  if (highQuality) {
    // Measure in the final channel layout, then apply a fixed loudness gain.
    // A single dynamic pass can make short, uneven foley performances vary.
    filters.push('aformat=sample_rates=44100:channel_layouts=stereo');
    const measured = spawnSync(ffmpeg, ['-hide_banner', '-i', source, '-af', [...filters, `${normalization}:print_format=json`].join(','), '-f', 'null', '-'], { encoding: 'utf8' });
    if (measured.status) throw new Error('Unable to measure object sound loudness.');
    const levels = JSON.parse(measured.stderr.slice(measured.stderr.lastIndexOf('{')));
    if (['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset'].some(key => !Number.isFinite(Number(levels[key])))) throw new Error('Object sound is silent or has invalid loudness.');
    normalization += `:measured_I=${levels.input_i}:measured_TP=${levels.input_tp}:measured_LRA=${levels.input_lra}:measured_thresh=${levels.input_thresh}:offset=${levels.target_offset}:linear=true`;
  }
  filters.push(normalization, 'alimiter=limit=0.7:level=false', 'afade=t=in:d=0.003');
  if (highQuality) filters.push('areverse', 'afade=t=in:d=0.04', 'areverse');
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-af', filters.join(','), '-ac', kind === 'music' || highQuality ? '2' : '1', '-ar', kind === 'voice' ? '24000' : '44100', '-b:a', kind === 'voice' ? '64k' : highQuality ? '192k' : '96k', '-f', 'mp3', output + '.tmp'], { stdio: 'pipe' });
  renameSync(output + '.tmp', output);
}
function save() { atomic(MANIFEST_PATH, manifest); atomic(REPORT_PATH, report); }
async function binary(path, body, raw, timeout) {
  if (existsSync(raw)) return;
  const res = await api(path, body, timeout);
  if (!res.headers.get('content-type')?.includes('audio')) throw new Error('Expected an audio response.');
  let bytes;
  try { bytes = Buffer.from(await res.arrayBuffer()); }
  catch (err) { halted=true; throw new Error(`Outcome uncertain while downloading audio; check ElevenLabs history before resuming: ${err.message}`); }
  if (bytes.length < 1000) throw new Error('Empty audio response.');
  writeFileSync(raw + '.tmp', bytes); renameSync(raw + '.tmp', raw);
}
async function makeCast() {
  const needed = actors.filter(who => !cast.characters[who]);
  console.log(`Cast: ${actors.length} speaking characters; ${needed.length} to assign.`);
  if (dry) return;
  const subscription = await (await api('/v1/user/subscription')).json();
  console.log(`Credits available: ${subscription.character_limit - subscription.character_count}; voice slots available: ${subscription.voice_limit - subscription.voice_slots_used}.`);
  if (subscription.voice_limit - subscription.voice_slots_used < needed.length) throw new Error('Not enough free voice slots; existing voices must be selected before generating the remaining cast.');
  const pack = readJson(join(ROOT, 'auditions/elevenlabs/pack.json'), { items: [] });
  // These fictional young roles use existing adult performers. The service
  // does not allow designing children's voices; never resubmit that prompt.
  const adultPerformers = {
    rosa: ['cgSgspJ2msm6clMCkdW9', 'Jessica'],
    ada: ['FGY2WhTYpPnrIDTdsKH5', 'Laura'],
    theo: ['bIHbv24MWmeRgasZH58o', 'Will'],
    pip: ['hpp4J3VqNfWAUOO0d1Us', 'Bella'],
    mateo: ['TX3LPaxmHKxFdv7VOQHJ', 'Liam'],
    odette: ['Xb7hH8MSUJpSbSDYk0k2', 'Alice'],
  };
  for (const who of needed) {
    console.log(`Assigning ${VOICES[who].name}...`);
    if (adultPerformers[who]) {
      const [voiceId, performer] = adultPerformers[who];
      cast.characters[who] = { name: VOICES[who].name, voiceId, performer, description: 'Existing adult performer for a fictional storybook character.', settings: { stability: 0.5, similarity_boost: 0.8, speed: 0.95, use_speaker_boost: true } };
      atomic(CAST_PATH, cast); continue;
    }
    const approved = pack.items.find(item => item.id === (who === 'nana' ? 'nana-a' : who === 'magnus' ? 'magnus-a' : ''));
    const description = approved?.prompt || `A fictional character voice for a warm children's clockwork storybook: ${VOICES[who].gemini?.style || VOICES[who].name}. British English, clear diction, natural and warm, measured pace suitable for young children, distinctive and expressive but never threatening or shrill. Clean studio speech, no music or background effects.`;
    let generatedVoiceId = approved?.generatedVoiceId;
    const previewPath = join(WORK, `cast-${who}.json`);
    if (!generatedVoiceId) {
      let preview = readJson(previewPath, null);
      if (!preview) {
        let text = lines.filter(l => l.who === who).map(l => l.text).join(' ').slice(0, 420);
        while (text.length < 110) text += ' ' + lines.find(l => l.who === who).text;
        const res = await api('/v1/text-to-voice/design?output_format=mp3_44100_128', { voice_description: description, text, model_id: 'eleven_ttv_v3', loudness: 0, guidance_scale: 5, seed: 1000 + actors.indexOf(who) });
        const data = await res.json();
        preview = { generatedVoiceId: data.previews[0].generated_voice_id, description, text };
        writeFileSync(join(WORK, `cast-${who}.mp3`), Buffer.from(data.previews[0].audio_base_64, 'base64'));
        atomic(previewPath, preview);
      }
      generatedVoiceId = preview.generatedVoiceId;
    }
    // Recover a previously saved actor if a prior save succeeded before a local interruption.
    const voiceName = `Pocket Mechanic - ${VOICES[who].name}`;
    const existing = await (await api('/v2/voices?page_size=100&search=' + encodeURIComponent(voiceName))).json();
    let voice = existing.voices.find(v => v.name === voiceName);
    if (!voice) voice = await (await api('/v1/text-to-voice', { voice_name: voiceName, voice_description: description, generated_voice_id: generatedVoiceId })).json();
    cast.characters[who] = { name: VOICES[who].name, voiceId: voice.voice_id, description, audition: approved?.id, settings: { stability: 0.5, similarity_boost: 0.8, speed: Math.max(0.85, Math.min(1.02, VOICES[who].rate)), use_speaker_boost: true } };
    atomic(CAST_PATH, cast); atomic(REPORT_PATH, report);
  }
}
async function pool(jobs, callback) {
  const todo = jobs.slice(0, limit);
  let cursor = 0, done = 0, failed = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < todo.length && !halted) {
      const job = todo[cursor++];
      try { await callback(job); }
      catch (err) { failed++; console.error(safe(`${job.id}: ${err.message}`)); }
      done++;
      if (done % 10 === 0 || done === todo.length) console.log(`  ${done}/${todo.length} done; ${failed} failed.`);
    }
  }));
  if (failed || halted) process.exitCode = 1;
}
async function voices() {
  const jobs = new Map();
  for (const line of lines.filter(l => l.id.startsWith(only))) {
    const actor = cast.characters[line.who];
    const identity = { model: cast.model, actor, text: line.text };
    const file = `voice/${hash(identity)}.mp3`;
    if (!jobs.has(file)) jobs.set(file, { ...line, actor, file });
    if (existsSync(join(AUDIO, file))) manifest.voice[line.id] = file;
  }
  const todo = [...jobs.values()].filter(job => !existsSync(join(AUDIO, job.file)));
  console.log(`Voices: ${lines.length} line ids, ${jobs.size} unique recordings, ${todo.length} missing, ${todo.reduce((n,j)=>n+j.text.length,0)} text characters.`);
  if (dry) return;
  await pool(todo, async job => {
    if (!job.actor) throw new Error(`No voice assigned for ${job.who}.`);
    const raw = join(WORK, job.file.split('/').at(-1));
    await binary(`/v1/text-to-speech/${job.actor.voiceId}?output_format=mp3_44100_128`, { text: job.text, model_id: cast.model, voice_settings: job.actor.settings, seed: 20261010 }, raw);
    normalize(raw, job.file, 'voice', {}, job.actor.voiceProcessing);
    for (const line of lines) if (line.who === job.who && line.text === job.text) manifest.voice[line.id] = job.file;
    report.completed[job.file] = { kind: 'voice', who: job.who, text: job.text, model: cast.model };
    save();
  });
  save();
}
async function music() {
  const jobs = Object.entries(THEMES).filter(([id]) => id.startsWith(only)).map(([id, theme]) => ({ id, theme, file: `music/elevenlabs-${id}.mp3` }));
  console.log(`Music: ${jobs.length} themes, ${jobs.filter(j=>!existsSync(join(AUDIO,j.file))).length} missing.`);
  if (dry) return;
  await pool(jobs, async job => {
    if (!existsSync(join(AUDIO, job.file))) {
      const raw = join(WORK, `music-${job.id}.mp3`);
      if (job.id === 'shop') normalize(join(ROOT, 'auditions/elevenlabs/music-shop.mp3'), job.file, 'music');
      else {
        const prompt = `Original instrumental background music: ${MUSIC[job.id]}. ${job.theme.bpm} BPM, ${job.theme.beatsPerBar===3?'three-four waltz':'four-four'} time. A cosy children's clockwork repair game, warm acoustic storybook sound. Gentle, memorable and playful, never loud, harsh or scary. No vocals or spoken words. Steady texture throughout, no dramatic introduction or closing cadence. The final phrase leads naturally back into the opening for repeated background play.`;
        await binary('/v1/music?output_format=mp3_44100_128', { prompt, model_id: 'music_v1', music_length_ms: 36000, force_instrumental: true }, raw, 240000);
        normalize(raw, job.file, 'music');
      }
    }
    manifest.music[job.id] = job.file;
    report.completed[job.file] = { kind: 'music', bpm: job.theme.bpm, model: 'music_v1', reusedAudition: job.id === 'shop' };
    save();
  });
}
async function sfx() {
  const jobs = SOUNDS.filter(s=>s.id.startsWith(only)).flatMap(s=>Array.from({length:s.variants||1},(_,i)=>{
    const sourceHash = s.quality === 'high' ? hash({ prompt: s.prompt, seconds: s.seconds, model: 'eleven_text_to_sound_v2', format: 'mp3_44100_192' }) : '';
    const revision = sourceHash ? '-' + hash({ sourceHash, processing: 'stereo-loudness-two-pass-v1' }) : '';
    return {...s,index:i,sourceHash,file:`sfx/${s.id}${s.variants?'-'+(i+1):''}${revision}.mp3`};
  }));
  console.log(`Sound effects: ${SOUNDS.length} cues, ${jobs.length} files including gear variations.`);
  if (dry) return;
  await pool(jobs, async job => {
    if (!existsSync(join(AUDIO, job.file)) || args.includes('--reprocess')) {
      let raw = job.reuse ? join(ROOT, 'auditions/elevenlabs', job.reuse) : join(WORK, `sfx-${job.id}-${job.index}.mp3`);
      if (job.prompt.length > 450) throw new Error(`Sound prompt exceeds 450 characters: ${job.prompt.length}`);
      if (job.sourceHash) {
        const legacy = raw;
        raw = join(WORK, `sfx-${job.id}-${job.index}-${job.sourceHash}.mp3`);
        // Migrate the already generated first production take without another
        // API call. Future prompt edits get a distinct raw and browser cache key.
        if (!existsSync(raw) && existsSync(legacy) && report.completed[`sfx/${job.id}.mp3`]?.prompt === job.prompt) copyFileSync(legacy, raw);
      }
      if (!job.reuse) await binary(`/v1/sound-generation?output_format=${job.quality === 'high' ? 'mp3_44100_192' : 'mp3_44100_128'}`, { text: job.prompt, model_id: 'eleven_text_to_sound_v2', duration_seconds: job.seconds, prompt_influence: 0.7, loop: false }, raw);
      normalize(raw, job.file, 'sfx', job.start!==undefined?{start:job.start,seconds:job.seconds}:{}, undefined, job.quality === 'high');
    }
    const files = manifest.sfx[job.id] ??= [];
    if (job.quality === 'high') manifest.sfx[job.id] = [job.file];
    else if (!files.includes(job.file)) files.push(job.file);
    if (job.id === 'meow') for (const line of catalogue.filter(l=>l.who==='pudding')) manifest.voice[line.id]=job.file;
    report.completed[job.file] = { kind: 'sfx', prompt: job.prompt, model: 'eleven_text_to_sound_v2', quality: job.quality || 'standard', reusedAudition: job.reuse || undefined };
    save();
  });
}
try {
  if (want.includes('cast') || want.includes('voices')) await makeCast();
  if (!halted && want.includes('voices')) await voices();
  if (!halted && want.includes('music')) await music();
  if (!halted && want.includes('sfx')) await sfx();
  if (!dry) console.log(`Manifest: ${Object.keys(manifest.voice).length} voice ids, ${Object.keys(manifest.music).length} themes, ${Object.keys(manifest.sfx).length} effect cues. Credits reported by optional response headers: ${report.reportedCredits}.`);
} catch(err) { console.error(safe(err.message)); process.exitCode=1; }
