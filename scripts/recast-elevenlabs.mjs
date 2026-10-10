#!/usr/bin/env node
/** Resumable portrait-directed casting. Keeps prior voices and recordings intact. */
import { loadEnvFile } from 'node:process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profiles = JSON.parse(readFileSync(join(root, 'scripts/character-voice-profiles.json'), 'utf8'));
const castPath = join(root, 'scripts/elevenlabs-cast.json');
const cast = JSON.parse(readFileSync(castPath, 'utf8'));
const work = join(root, '.asset-work/voice-alignment/casting');
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
const atomic = (file, value) => { writeFileSync(file + '.tmp', JSON.stringify(value, null, 2) + '\n'); renameSync(file + '.tmp', file); };
const jobs = Object.entries(profiles.characters).filter(([who]) => !only || who === only);
if (!jobs.length) throw new Error('No matching character profile.');
if (dry) { console.log(JSON.stringify(jobs.map(([who, p]) => ({ who, appearance: p.appearance, direction: p.direction })), null, 2)); process.exit(0); }
if (existsSync(join(root, '.env'))) loadEnvFile(join(root, '.env'));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('Set ELEVENLABS_API_KEY through the local environment.');
mkdirSync(work, { recursive: true });
if (!existsSync(join(work, 'cast-before.json'))) atomic(join(work, 'cast-before.json'), cast);
async function api(url, body) {
  let res;
  try {
    res = await fetch('https://api.elevenlabs.io' + url, { method: body ? 'POST' : 'GET',
      headers: { 'xi-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(120000) });
  } catch { throw new Error('Request outcome uncertain. Check ElevenLabs history before retrying.'); }
  if (!res.ok) { const message = (await res.text()).split(key).join('[redacted]'); throw new Error(`ElevenLabs ${res.status}: ${message.slice(0, 500)}`); }
  return res.json();
}
const subscription = await api('/v1/user/subscription');
const current = (who, profile) => cast.characters[who]?.castingRevision === profiles.revision && cast.characters[who]?.description === profile.description;
const needed = jobs.filter(([who, profile]) => !current(who, profile)).length;
console.log(`${needed} portrait-directed actors to assign; ${subscription.voice_limit - subscription.voice_slots_used} free voice slots.`);
if (subscription.voice_limit - subscription.voice_slots_used < needed) throw new Error('Not enough free voice slots. No existing voices have been removed.');
const previewText = 'Hello! What a wonderful surprise. I found something lovely in the workshop today. Look at those little wheels turning together! Thank you for helping. Now everything is working again, and there is time to try something new.';
for (const [who, p] of jobs) {
  if (current(who, p)) { console.log(`Reusing ${p.name}.`); continue; }
  const fingerprint = createHash('sha256').update(JSON.stringify({ model: profiles.model, description: p.description, previewText })).digest('hex').slice(0, 16);
  const recordPath = join(work, `${who}-${fingerprint}.json`);
  let record = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, 'utf8')) : null;
  if (!record) {
    console.log(`Designing ${p.name}: ${p.direction}`);
    const result = await api('/v1/text-to-voice/design?output_format=mp3_44100_128', {
      voice_description: p.description, text: previewText, model_id: profiles.model,
      guidance_scale: 5, loudness: 0, seed: 20261011 + Object.keys(profiles.characters).indexOf(who),
    });
    if (!result.previews?.length) throw new Error(`No preview returned for ${who}.`);
    record = { who, fingerprint, description: p.description, previews: result.previews.map((v, i) => {
      const file = `${who}-${fingerprint}-${i}.mp3`;
      writeFileSync(join(work, file), Buffer.from(v.audio_base_64, 'base64'));
      return { generatedVoiceId: v.generated_voice_id, file, seconds: v.duration_secs };
    }), selected: 0 };
    atomic(recordPath, record);
  }
  const name = `Pocket Mechanic - ${p.name} - ${profiles.revision}`;
  // Recover an actor saved remotely before a local interruption; do not create duplicates.
  const available = await api('/v2/voices?page_size=100&search=' + encodeURIComponent(name));
  let voice = available.voices?.find(v => v.name === name && v.description === p.description);
  if (!voice) voice = await api('/v1/text-to-voice', { voice_name: name, voice_description: p.description,
    generated_voice_id: record.previews[record.selected].generatedVoiceId });
  cast.characters[who] = { name: p.name, voiceId: voice.voice_id, description: p.description,
    castingRevision: profiles.revision, direction: p.direction,
    settings: { stability: .5, similarity_boost: .8, speed: p.speed, use_speaker_boost: true } };
  atomic(castPath, cast);
  console.log(`Assigned ${p.name}.`);
}
console.log('Cast saved. Run the production voice generator to record the affected dialogue.');
