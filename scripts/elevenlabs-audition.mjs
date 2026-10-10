#!/usr/bin/env node
/** Generate only the audition pack. Never edits the game's audio manifest. */
import { loadEnvFile } from 'node:process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { runnerImport } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'auditions', 'elevenlabs');
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const soundsOnly = args.includes('--sounds');
const records = join(OUT, 'pack.json');
const readPack = () => existsSync(records) ? JSON.parse(readFileSync(records, 'utf8')) : { provider: 'ElevenLabs', items: [], failures: {} };
const savePack = (pack) => writeFileSync(records, JSON.stringify(pack, null, 2) + '\n');

if (args.includes('--serve')) {
  // Serve only the audition folder, so the project and .env are inaccessible.
  const server = createServer((req, res) => {
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    const name = path === '/' ? 'index.html' : path.slice(1);
    if (!/^[a-zA-Z0-9._-]+$/.test(name) || !existsSync(join(OUT, name))) {
      res.writeHead(404).end('Not found'); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const bytes = readFileSync(join(OUT, name));
    const mime = name.endsWith('.mp3') ? 'audio/mpeg' : name.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/json';
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    let start = 0, end = bytes.length - 1, status = 200;
    if (range) {
      start = Number(range[1]);
      end = range[2] ? Math.min(Number(range[2]), end) : end;
      if (start > end || start >= bytes.length) { res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }).end(); return; }
      status = 206;
    }
    res.writeHead(status, {
      'Content-Type': mime, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store', ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${bytes.length}` } : {}),
    });
    res.end(req.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1));
  });
  const host = args.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
  server.listen(4178, host, () => console.log(`Audition player: http://127.0.0.1:4178${args.includes('--lan') ? ' (local network enabled)' : ''}`));
} else {
  await generate();
}

async function generate() {
  const { STORIES } = (await runnerImport(join(ROOT, 'src/content/story.ts'), { configFile: false, logLevel: 'silent' })).module;
  const dialogue = STORIES.flatMap(s => s.lines);
  const selectedLines = (ids) => ids.map(id => {
    const line = dialogue.find(l => l.id === id);
    if (!line) throw new Error(`Unknown dialogue: ${id}`);
    return { id, text: line.text };
  });
  const voiceTasks = [
    {
      id: 'nana', kind: 'voice', title: 'Nana Odette', model: 'eleven_ttv_v3', seed: 417,
      description: 'An elderly British woman, a kind grandmother and clockmaker in a cosy storybook repair shop. Warm, slightly husky, smiling, patient, gently playful. Natural age in her voice, clear consonants and an unhurried pace for children aged four to ten. Conversational and affectionate, with a little wonder and gentle laughter. Studio clean, no music or effects.',
      lines: selectedLines(['prologue.5', 'prologue.7', 'r2d.3', 'ep.5']),
    },
    {
      id: 'magnus', kind: 'voice', title: 'Magnus the Magnificent', model: 'eleven_ttv_v3', seed: 418,
      description: 'A male British theatrical magpie in a warm children\'s storybook. Rich resonant baritone with a slightly croaky bird-like edge, extravagantly expressive, vain, flamboyant and comically grand. A lovable stage performer, never threatening. Clear words and measured pace for young children. Can soften into a shy, vulnerable tone when lonely. Studio clean, no music or effects.',
      lines: selectedLines(['mr.1', 'mr.2', 'mn.2']),
    },
  ];
  const soundTasks = [
    ['clunk', 'A gear snaps into place', 0.8, 'One satisfying small brass gear seating into a wooden clock mechanism: a warm low wooden clunk with one delicate metallic click. Handmade mechanical foley, close and dry, gentle for a children\'s repair game. Single action, quick onset and short decay. No speech, no music, no background ambience.'],
    ['ratchet', 'Winding a clockwork key', 1.4, 'A small antique brass clockwork winding key turned once: a short run of four gentle, precise ratchet clicks, then stops. Tactile dry close mechanical foley, quiet and rounded, no harsh squeals. No speech, music or background ambience.'],
    ['tick-tock', 'An antique clock', 2.4, 'A small warm antique wooden clock: three clearly separated tick-tock pairs at an even gentle pace. Subtle brass escapement and woody resonance, close dry recording, not a loud wall clock. No music, bells, voices or background noise.'],
    ['spring', 'A playful spring', 1.2, 'One small metal toy spring released: a friendly rising sproing with a short bouncy wobble, soft and playful, never startling. Close dry mechanical foley with smooth decay. No voices, music or background ambience.'],
    ['steam', 'A tiny steam valve', 1.8, 'A tiny brass steam valve opening and closing once: a soft, brief warm puff of steam, then silence. Gentle kettle-like air release, smooth onset, no loud pressure blast. Close dry mechanical foley, no music, speech or background ambience.'],
    ['doorbell', 'The repair-shop doorbell', 2.4, 'One welcoming antique shop doorbell ding-dong with two soft rounded brass bell tones and a warm natural decay. Small cosy repair shop, gentle and never sharp or loud. Close dry foley, no speech, music or background ambience.'],
  ].map(([id, title, seconds, description]) => ({ id, title, seconds, description, kind: 'sfx', model: 'eleven_text_to_sound_v2' }));
  const musicTask = {
    id: 'shop', title: 'The clockwork workshop', kind: 'music', model: 'music_v1', seconds: 36,
    description: 'A gentle, homely instrumental background theme for a cosy clockwork repair shop in a children\'s storybook game. Soft ukulele, glockenspiel, warm upright bass and delicate ticking wood-block percussion. D major, 80 BPM, four-four time. Simple memorable melody, light acoustic texture and space for dialogue. Warm, curious, playful and unhurried. Consistent gentle energy, no sudden changes, big crescendos or harsh sounds. Twelve bars, stable pulse, no dramatic intro or final cadence; the last phrase leads naturally back into the opening. No singing, spoken words or vocal sounds.',
  };
  const tasks = [...voiceTasks, musicTask, ...soundTasks].filter(task => (!only || task.id === only) && (!soundsOnly || task.kind === 'sfx'));
  if (!tasks.length) throw new Error('Unknown --only task. Choose nana, magnus, shop, clunk, ratchet, tick-tock, spring, steam or doorbell.');
  if (dry) {
    console.log(JSON.stringify(tasks.map(t => ({ id: t.id, kind: t.kind, model: t.model, seconds: t.seconds, previewText: t.lines?.map(l => l.text).join(' ') })), null, 2));
    return;
  }
  if (existsSync(join(ROOT, '.env'))) loadEnvFile(join(ROOT, '.env'));
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error('Add ELEVENLABS_API_KEY to the root .env file first.');
  mkdirSync(OUT, { recursive: true });
  const pack = readPack();
  pack.createdAt ??= new Date().toISOString();
  pack.tasks ??= {};
  const redact = (s) => String(s).split(key).join('[redacted]');
  async function request(path, body, timeout = 120000) {
    let res;
    try {
      res = await fetch('https://api.elevenlabs.io' + path, {
        method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      // Do not automatically retry a paid POST when its outcome is unknown.
      throw new Error(redact(`Request did not finish; check ElevenLabs history before retrying: ${err.message}`));
    }
    if (!res.ok) {
      const text = redact(await res.text());
      throw new Error(`ElevenLabs ${res.status}: ${text.slice(0, 700)}`);
    }
    return res;
  }
  for (const task of tasks) {
    const text = task.lines?.map(l => l.text).join(' ');
    const fingerprint = createHash('sha256').update(JSON.stringify({ ...task, text })).digest('hex');
    const prior = pack.items.filter(item => item.taskId === task.id);
    if (pack.tasks[task.id]?.fingerprint === fingerprint && prior.length && prior.every(item => existsSync(join(OUT, item.file)))) {
      console.log(`Reusing ${task.id}: ${prior.length} saved sample(s).`); continue;
    }
    if (prior.length) throw new Error(`${task.id} already has a different audition; keep it and use another output folder before regenerating.`);
    console.log(`Generating ${task.id}...`);
    try {
      const path = task.kind === 'voice' ? '/v1/text-to-voice/design?output_format=mp3_44100_128' : task.kind === 'music' ? '/v1/music?output_format=mp3_44100_128' : '/v1/sound-generation?output_format=mp3_44100_128';
      const body = task.kind === 'voice' ? {
        voice_description: task.description, text, model_id: task.model, seed: task.seed,
        auto_generate_text: false, loudness: 0, guidance_scale: 5,
      } : task.kind === 'music' ? {
        prompt: task.description, model_id: task.model, music_length_ms: task.seconds * 1000, force_instrumental: true,
      } : { text: task.description, model_id: task.model, duration_seconds: task.seconds, prompt_influence: 0.6, loop: false };
      const res = await request(path, body, task.kind === 'music' ? 240000 : 120000);
      const meta = { taskId: task.id, kind: task.kind, title: task.title, model: task.model, prompt: task.description, text, lines: task.lines, generatedAt: new Date().toISOString() };
      if (task.kind === 'voice') {
        const data = await res.json();
        if (!data.previews?.length) throw new Error('No voice previews returned.');
        for (const [index, preview] of data.previews.entries()) {
          const file = `${task.id}-${String.fromCharCode(97 + index)}.mp3`;
          const bytes = Buffer.from(preview.audio_base_64, 'base64');
          if (bytes.length < 1000) throw new Error('Empty voice preview.');
          writeFileSync(join(OUT, file), bytes);
          pack.items.push({ ...meta, id: file.slice(0, -4), file, option: String.fromCharCode(65 + index), generatedVoiceId: preview.generated_voice_id, duration: preview.duration_secs, bytes: bytes.length });
        }
      } else {
        if (!res.headers.get('content-type')?.includes('audio')) throw new Error('Expected audio from ElevenLabs.');
        const bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length < 1000) throw new Error('Empty generated audio.');
        const file = `${task.kind}-${task.id}.mp3`;
        writeFileSync(join(OUT, file), bytes);
        pack.items.push({ ...meta, id: `${task.kind}-${task.id}`, file, duration: task.seconds, bytes: bytes.length });
      }
      pack.tasks[task.id] = { fingerprint, status: 'complete', reportedCharacterCost: res.headers.get('character-cost') ?? undefined };
      delete pack.failures[task.id];
      console.log(`Saved ${task.id}.`);
    } catch (err) {
      pack.failures[task.id] = redact(err.message);
      console.error(`${task.id}: ${pack.failures[task.id]}`);
      if (/401|403|quota_exceeded|insufficient_credits|Request did not finish/.test(err.message)) {
        savePack(pack); process.exitCode = 1; break;
      }
      process.exitCode = 1;
    }
    savePack(pack);
  }
  console.log(`Pack: ${pack.items.length} samples saved in auditions/elevenlabs.`);
}
