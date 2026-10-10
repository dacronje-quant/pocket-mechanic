#!/usr/bin/env node
/**
 * Pre-generates the game's optional media with Google's Gemini API:
 *
 *   voices  – every spoken line (src/content/voicelines.ts) with Gemini TTS,
 *             one fixed prebuilt voice + delivery style per character
 *   music   – one 30-second instrumental loop per object theme with Lyria
 *   images  – painted story backdrops, the title picture, postcards from
 *             Brasswick and Attic history plates with Gemini's image model
 *             ("Nano Banana")
 *
 * Files land in public/audio/{voice,music} and public/art, with manifests the
 * game reads at start-up. Anything missing simply falls back to the code-made
 * art, synthesised music and the device's own speech, so this script is
 * optional and can be re-run at any time (it only fills in what is missing).
 *
 * Usage:
 *   GEMINI_API_KEY=… node scripts/generate-assets.mjs [voices] [music] [images]
 *        [--only <id-prefix>] [--force] [--dry-run] [--concurrency 3]
 *
 * The API key is read from the environment only. It is sent in a request
 * header and never printed, logged or written to disk. Commit the generated
 * files, never the key. Review every generated line, loop and picture before
 * committing — this is a children's game.
 *
 * Models can be overridden with GEMINI_TTS_MODEL, GEMINI_MUSIC_MODEL and
 * GEMINI_IMAGE_MODEL. Video (Veo) is deliberately not used: cutscenes are
 * animated in code, which keeps the offline app small.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// GEMINI_API_BASE only exists so the script can be tested against a local mock server.
const API = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELS = {
  tts: process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts',
  music: process.env.GEMINI_MUSIC_MODEL || 'lyria-3-clip-preview',
  image: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
};

// ───────────────────────────── command line ─────────────────────────────

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const kinds = ['voices', 'music', 'images'].filter((k) => argv.includes(k));
const want = kinds.length ? kinds : ['voices', 'music', 'images'];
const ONLY = opt('only', '');
const FORCE = flag('force');
const DRY = flag('dry-run');
const CONCURRENCY = Math.max(1, Number(opt('concurrency', '2')));

const KEY = process.env.GEMINI_API_KEY;
if (!KEY && !DRY) {
  console.error('Set GEMINI_API_KEY in your environment (it is never stored). Use --dry-run to see what would be made.');
  process.exit(1);
}

let ffmpeg = true;
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  ffmpeg = false;
  console.warn('ffmpeg not found: voices stay WAV, music and pictures are not re-compressed (bigger files).');
}

// ───────────────────────────── helpers ─────────────────────────────

const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
};

/** POST to a model, retrying on rate limits and server errors. Never logs the key. */
async function generate(model, body) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const text = await res.text();
    let msg = text.slice(0, 300);
    try {
      msg = JSON.parse(text).error?.message ?? msg;
    } catch {
      /* not JSON */
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      const wait = Math.min(60000, 2000 * 2 ** attempt);
      console.warn(`  ${model}: ${res.status}, retrying in ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${model}: HTTP ${res.status} ${msg}`);
  }
}

function inlineParts(json) {
  return (json.candidates?.[0]?.content?.parts ?? []).filter((p) => p.inlineData?.data);
}

/** Wrap raw 16-bit PCM in a WAV header (TTS can return headerless PCM). */
function wav(pcm, rate = 24000, channels = 1) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * channels * 2, 28);
  h.writeUInt16LE(channels * 2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

function rateOf(mime) {
  const m = /rate=(\d+)/.exec(mime ?? '');
  return m ? Number(m[1]) : 24000;
}

function convert(input, output, args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, ...args, output], { stdio: 'inherit' });
  unlinkSync(input);
}

/** Run tasks with limited concurrency. */
async function pool(items, fn) {
  let i = 0;
  let done = 0;
  let failed = 0;
  const worker = async () => {
    while (i < items.length) {
      const item = items[i++];
      try {
        await fn(item);
      } catch (e) {
        failed++;
        console.error(`  ✗ ${item.id}: ${e.message}`);
      }
      done++;
      if (done % 10 === 0 || done === items.length) console.log(`  ${done}/${items.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return failed;
}

// ───────────────────────────── content ─────────────────────────────

const load = async (path) => (await runnerImport(join(ROOT, path), { configFile: false, logLevel: 'silent' })).module;
const { allVoiceLines } = await load('src/content/voicelines.ts');
const { VOICES } = await load('src/content/voices.ts');
const { THEMES } = await load('src/audio/music.ts');
const { REPAIRS } = await load('src/content/repairs.ts');
const { ATTIC_OBJECTS } = await load('src/content/attic.ts');

/** Read-aloud button labels (`say: '…'` in the source), so menus can use the same voice. */
function uiLabels() {
  const out = new Set();
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ts')) for (const m of readFileSync(p, 'utf8').matchAll(/\bsay: '([^'\\]{2,60})'/g)) out.add(m[1]);
    }
  };
  walk(join(ROOT, 'src'));
  return [...out];
}

const AUDIO_DIR = join(ROOT, 'public/audio');
const ART_DIR = join(ROOT, 'public/art');
const audioManifestPath = join(AUDIO_DIR, 'manifest.json');
const artManifestPath = join(ART_DIR, 'manifest.json');
const audioManifest = { voice: {}, music: {}, ...readJson(audioManifestPath, {}) };
const artManifest = { images: {}, ...readJson(artManifestPath, {}) };
const saveManifests = () => {
  writeFileSync(audioManifestPath, `${JSON.stringify(audioManifest, null, 1)}\n`);
  mkdirSync(ART_DIR, { recursive: true });
  writeFileSync(artManifestPath, `${JSON.stringify(artManifest, null, 1)}\n`);
};

// ───────────────────────────── voices ─────────────────────────────

async function voices() {
  mkdirSync(join(AUDIO_DIR, 'voice'), { recursive: true });
  const lines = allVoiceLines(uiLabels()).filter((l) => VOICES[l.who]?.gemini && l.id.startsWith(ONLY));
  if (!ONLY) audioManifest.voice = {}; // forget lines that no longer exist
  // identical words in the same voice share one file
  const jobs = new Map();
  for (const l of lines) {
    const v = VOICES[l.who].gemini;
    const key = hash(`${MODELS.tts}|${v.voice}|${v.style}|${l.text}`);
    const file = `voice/${key}.${ffmpeg ? 'mp3' : 'wav'}`;
    audioManifest.voice[l.id] = file;
    if (!jobs.has(file)) jobs.set(file, { id: l.id, file, text: l.text, voice: v.voice, style: v.style });
  }
  const todo = [...jobs.values()].filter((j) => FORCE || !existsSync(join(AUDIO_DIR, j.file)));
  console.log(`voices: ${lines.length} lines, ${jobs.size} unique recordings, ${todo.length} to make (${MODELS.tts})`);
  if (DRY) return 0;
  const failed = await pool(todo, async (j) => {
    const json = await generate(MODELS.tts, {
      contents: [{ parts: [{ text: j.text, speechMetadata: { style: j.style } }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: j.voice } } },
      },
    });
    const part = inlineParts(json)[0];
    if (!part) throw new Error('no audio in the response');
    const bytes = Buffer.from(part.inlineData.data, 'base64');
    const asWav = bytes.subarray(0, 4).toString() === 'RIFF' ? bytes : wav(bytes, rateOf(part.inlineData.mimeType));
    const out = join(AUDIO_DIR, j.file);
    if (!ffmpeg) return writeFileSync(out, asWav);
    const tmp = `${out}.wav`;
    writeFileSync(tmp, asWav);
    convert(tmp, out, ['-ac', '1', '-ar', '24000', '-b:a', '48k']);
  });
  for (const [id, file] of Object.entries(audioManifest.voice)) if (!existsSync(join(AUDIO_DIR, file))) delete audioManifest.voice[id];
  return failed;
}

// ───────────────────────────── music ─────────────────────────────

/** What each loop should sound like (GDD §23.2: each object's music is built from its own sounds). */
const MUSIC = {
  title: 'a warm, wondrous opening theme for a cosy clockwork repair shop: music box, celesta, soft strings, ticking clocks',
  shop: 'a gentle, homely workshop tune: ukulele, glockenspiel, upright bass, soft ticking clock percussion',
  clock: 'a cheerful waltz for a cuckoo clock: ticking wood-block percussion, bassoon, pizzicato strings, a little cuckoo flute call',
  musicbox: 'a tender lullaby played on a music box comb with soft harp and warm pads, in three-four time',
  train: 'a bouncy toy-train tune: chugging brushed snare, harmonica, tuba, a little train-whistle motif',
  radio: 'a warm 1940s swing tune emerging from a valve radio: clarinet, muted trumpet, brushed drums, walking bass',
  tea: 'a bubbly, jaunty teatime jig: pizzicato strings, flute, kettle-like whistles, light tambourine',
  bertie: 'a playful fairground robot boogie: band organ, glockenspiel, bouncy bass, clapping',
  orrery: 'a dreamy, starry night theme: celesta, soft choir pads, harp, slow and calm',
  tower: 'a grand but gentle clock-tower march: chiming bells, brass band, timpani, ticking',
  attic: 'a mysterious, moonlit attic theme, curious not scary: celesta, low strings, soft music-box notes',
  bench: 'an inventive, tinkering theme: marimba, plucked strings, light percussion of little clicks and clanks',
  home: 'a cosy bedtime theme for a tiny clockwork house: music box, soft guitar, gentle pads',
  festival: 'a joyful town-festival celebration: brass band, accordion, glockenspiel, hand claps and bells',
};

async function music() {
  mkdirSync(join(AUDIO_DIR, 'music'), { recursive: true });
  const jobs = Object.keys(THEMES)
    .filter((id) => id.startsWith(ONLY) && MUSIC[id])
    .map((id) => ({ id, file: `music/${id}.mp3`, bpm: THEMES[id].bpm, beats: THEMES[id].beatsPerBar }));
  for (const j of jobs) if (existsSync(join(AUDIO_DIR, j.file))) audioManifest.music[j.id] = j.file;
  const todo = jobs.filter((j) => FORCE || !existsSync(join(AUDIO_DIR, j.file)));
  console.log(`music: ${jobs.length} loops, ${todo.length} to make (${MODELS.music})`);
  if (DRY) return 0;
  const failed = await pool(todo, async (j) => {
    const prompt =
      `Instrumental only, no vocals. ${MUSIC[j.id]}. ${j.bpm} BPM, ${j.beats === 3 ? 'three-four waltz time' : 'four-four time'}. ` +
      'For a children’s game (ages 4 to 10): gentle, warm and happy, never loud, harsh or scary, no sudden changes. ' +
      'A seamless background loop with the same energy from start to end, so the end flows back into the beginning.';
    const json = await generate(MODELS.music, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['AUDIO', 'TEXT'] },
    });
    const part = inlineParts(json).pop();
    if (!part) throw new Error('no audio in the response');
    const out = join(AUDIO_DIR, j.file);
    const raw = `${out}.src`;
    writeFileSync(raw, Buffer.from(part.inlineData.data, 'base64'));
    if (ffmpeg) convert(raw, out, ['-ac', '2', '-ar', '44100', '-b:a', '80k']);
    else execFileSync('mv', [raw, out]);
    audioManifest.music[j.id] = j.file;
  });
  return failed;
}

// ───────────────────────────── images ─────────────────────────────

const STYLE =
  'A warm, cosy Copper & Moss storybook illustration for a children’s game (ages 4 to 10): scratchy pen contours, pencil hatching, ' +
  'watercolour washes and aged paper grain. Weathered copper, oxidised teal, moss green, cream plaster and dark walnut wood, ' +
  'trailing ivy, tiny rivets, repaired seams, friendly handmade shapes and warm amber lamplight. Keep play areas quiet and readable. ' +
  'No text, letters, numbers, signs with writing, logos or watermarks. Nothing scary.';
const STAGE = 'An empty scene with no people or animals: characters are drawn on top later, so keep the lower middle simple and uncluttered.';

const STAGES = {
  storm: 'Inside an old clockmaker’s workshop at night during a thunderstorm: rain on the window, a single warm desk lamp, shelves of clocks.',
  shop: 'Inside "Odette’s Tick & Tinker", a cosy clock and toy repair shop by day: a long wooden workbench, shelves of clocks, a big window onto a little town.',
  shopNight: 'The same cosy repair shop at bedtime: lamps turned low, moonlight through the window, everything calm and sleepy.',
  bakery: 'Inside a small town bakery in the early morning: bread ovens, flour, warm golden light.',
  street: 'A cobbled street in the little town of Brasswick with colourful houses on a sunny morning.',
  party: 'A garden birthday party: bunting, balloons, a table with a cake, a toy railway track on the grass.',
  harbor: 'A small fishing harbour at dusk with a red-and-white lighthouse, little boats and a calm sea.',
  cafe: 'A grand, cheerful café with green tiles, teacups and a big brass tea machine in the background.',
  fair: 'A friendly fairground by day: a big wheel, striped tents and bunting.',
  classroom: 'A school classroom at night, lit by soft starlight from a ceiling full of painted stars.',
  tower: 'The top of a tall stone clock tower in the town square at golden hour, with a big clock face.',
  nest: 'A magpie’s nest at the top of a clock tower, full of shiny buttons, keys and spoons, at sunset.',
  festival: 'A town square festival: bunting, lanterns, a clock tower, happy decorations, a bright sky.',
  attic: 'A dusty, moonlit attic full of antique machines under dust sheets, curious and magical, not scary.',
};

const POSTCARDS = {
  clock: 'A cuckoo clock on the wall of a cosy bakery at sunrise, with fresh bread on the counter.',
  musicbox: 'An old wooden music box with a tiny dancing fox, playing on a little girl’s bedroom windowsill at night.',
  train: 'A toy train circling a birthday cake on a garden party table.',
  radio: 'An old valve radio in a lighthouse keeper’s room, the lighthouse beam turning over a calm sea and little fishing boats.',
  tea: 'A grand brass tea machine puffing steam in a busy, happy café.',
  bertie: 'A friendly red fairground robot dancing in front of a big wheel and striped tents.',
  orrery: 'A brass star orrery projecting stars across a classroom ceiling at night.',
  tower: 'A town clock tower at noon with pigeons and bunting, the town celebrating below.',
};

function imageJobs() {
  const jobs = [];
  for (const [bg, scene] of Object.entries(STAGES)) jobs.push({ id: `stage-${bg}`, prompt: `${scene} ${STAGE}`, ratio: '16:9', width: 1280 });
  jobs.push({ id: 'title', prompt: 'The front of a tiny, cosy clock repair shop on a cobbled street at dusk, warm windows glowing, big brass gears in the sky. Keep the top third simple for a title.', ratio: '16:9', width: 1280 });
  for (const r of REPAIRS) jobs.push({ id: `postcard-${r.key}`, prompt: `A postcard picture: ${POSTCARDS[r.key]}`, ratio: '16:9', width: 960 });
  for (const o of ATTIC_OBJECTS) {
    jobs.push({ id: `attic-${o.id}`, prompt: `A single antique ${o.title.toLowerCase()} on a plain warm background, like a page in an old encyclopedia. ${o.history}`, ratio: '4:3', width: 640 });
  }
  return jobs.filter((j) => j.id.startsWith(ONLY));
}

async function images() {
  mkdirSync(ART_DIR, { recursive: true });
  const jobs = imageJobs();
  const ext = ffmpeg ? 'webp' : null;
  for (const j of jobs) {
    const hit = readdirSync(ART_DIR).find((f) => f.startsWith(`${j.id}.`) && !f.includes('.src.') && !f.endsWith('.json'));
    if (hit) artManifest.images[j.id] = hit;
  }
  const todo = jobs.filter((j) => FORCE || !artManifest.images[j.id]);
  console.log(`images: ${jobs.length} pictures, ${todo.length} to make (${MODELS.image})`);
  if (DRY) return 0;
  const failed = await pool(todo, async (j) => {
    const json = await generate(MODELS.image, {
      contents: [{ parts: [{ text: `${STYLE} ${j.prompt}` }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: j.ratio, imageSize: '1K' } },
    });
    const part = inlineParts(json)[0];
    if (!part) throw new Error('no image in the response');
    const mime = part.inlineData.mimeType ?? 'image/png';
    const srcExt = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
    const raw = join(ART_DIR, `${j.id}.src.${srcExt}`);
    writeFileSync(raw, Buffer.from(part.inlineData.data, 'base64'));
    let file = `${j.id}.${ext ?? srcExt}`;
    if (ext) convert(raw, join(ART_DIR, file), ['-vf', `scale=${j.width}:-2`, '-quality', '78']);
    else execFileSync('mv', [raw, join(ART_DIR, file)]);
    artManifest.images[j.id] = file;
  });
  return failed;
}

// ───────────────────────────── main ─────────────────────────────

let failed = 0;
if (want.includes('voices')) failed += await voices();
if (want.includes('music')) failed += await music();
if (want.includes('images')) failed += await images();
if (!DRY) {
  saveManifests();
  console.log(`manifests written: ${relative(ROOT, audioManifestPath)}, ${relative(ROOT, artManifestPath)}`);
}
if (failed) {
  console.error(`${failed} item(s) failed; run again to retry just those.`);
  process.exit(2);
}
