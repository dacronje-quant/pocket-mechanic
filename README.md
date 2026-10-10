# Pocket Mechanic: The Clockwork Repair Shop

A touch-first repair-puzzle game for children aged 4–10. Kip, a tiny clockwork robot, shrinks
inside the broken treasures people bring to Nana Odette's repair shop and fixes them from the
inside: gears, levers, springs, pendulums, music cylinders, tracks, circuits, pipes, logic gates
and light. Nothing can fail or break for good; wrong parts wiggle back or do something funny.

Built with **Phaser 3 + TypeScript + Vite**, published from `main/docs` to **GitHub Pages**, installable on Android as
an app (PWA) and playable offline. The design is [`docs/GDD.md`](docs/GDD.md); the working plan and
status are in [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).

The approved **Copper & Moss** art direction uses pencilled illustrations, worn copper and teal,
trailing greenery and parchment UI. Painted assets sit behind live characters and puzzles;
procedural art supports missing or uncached images. See [`docs/ART_DIRECTION.md`](docs/ART_DIRECTION.md)
for the visual guide and [`docs/BUILD_PLAN.md` §8](docs/BUILD_PLAN.md#8-status) for art-pass status.

## What's in the game

- **The story** — a stormy-night prologue, eight Great Repairs (the cuckoo clock, Rosa's music box,
  the twins' birthday train, Captain Marigold's radio, the Grand Tea Machine, Big Bertie, Miss
  Juniper's star orrery and the Brasswick clock tower), Magnus the magpie's mystery, the Tick-Tock
  Festival and the credits.
- **61 rooms** — 53 rooms and 8 Big Fix chain reactions, built from 25 room kinds on pure,
  unit-tested mechanism engines (gear graph with compound shafts, pipe/circuit/track flow with real
  nodal analysis, light beams, logic gates and latches, punch-card programs, cams, levers and
  pulleys, pendulums, tuning, chain reactions, pinned music cylinders), plus shadow boards,
  sliding photos, symmetry, parcel packing, valve sorting, fuse sudoku, water jugs, marble tilt,
  layered constellation slides and spot-the-difference blueprints. See
  [`docs/PUZZLE_VARIETY.md`](docs/PUZZLE_VARIETY.md) for placements and age challenges.
- **Three Play Styles** — 🪛 Little Tinker (reading-free, generous snap and simple visual
  challenges; older mechanisms often start mostly built), 🔧 Fixer, 📐 Engineer (numbers, ratios, hints only on request). They change the rules,
  not just the numbers, and can be switched at any time.
- **The shop hub** — door and Job Board, Display Shelf (Playground and Tune-Ups with Copper → Brass
  medals), Parts Drawers (Part-o-pedia with "How It Really Works" and "Spot It at Home!"), Kip's
  Nook (matchbox → tin-can cottage → clockwork house, furniture, a mini music box, the Job Book of
  stamps), Paint & Polish (10 cosmetic slots, polish mini-game, saved looks, Tess's corner), the
  Window Seat (Brasswick comes back to life as you fix things), the Invention Bench, the Quick
  Fixes basket and the Attic.
- **30 Quick Fixes** (the original 24 plus six preserved story puzzles) and **the Mystery Attic** — 23 antique machines with three generated rooms each
  (deterministic, solvable by construction) and the Mystery Box.
- **The Invention Bench** — free build on the same gear engine, 30 Contraption Cards, Contraption
  Codes to share a machine by typing a short code on another device (no internet), saved machines,
  a Peek Lens power view, the Little Tinker Toy Box, and Magnus's Nest Studio.
- **Secrets** — three Golden Gears per room, Lost Treasures returned to their owners, Magnus Marks,
  Blueprints, fiddle toys everywhere, songs, 66 stamps.
- **Family play** — up to six local profiles (a colour and letter-stamp initials, no names or free
  text), Tess on screen for two-finger co-op, Outside Hands flashlight in dark rooms.
- **Grown-ups** (behind a parental gate) — Play Style per profile, "What We Learned" weekly
  summary, sound levels, subtitles and read-aloud, Calm Visuals, Soft Clockwork, high-contrast
  outlines, snap assist, hint timing, Closing Time and Wind-Down Mode, co-op mode, the Grown-Up
  Guide.

**Child safety:** no ads, no purchases, no accounts, no chat, no online features. Saves stay on the
device, every `localStorage` access is guarded, and the game still runs when storage is blocked.

## Run it

Needs [Node.js](https://nodejs.org) 22.12 or newer.

On Windows, double-click [`Launch-Copper-Moss.bat`](Launch-Copper-Moss.bat). It installs missing
dependencies, checks and builds the game, then opens the local preview at `http://127.0.0.1:5188/`.
Keep its terminal open while playing. The local preview uses its own browser origin, so your
existing game's local profiles remain on their original address.

```bash
npm install
npm run dev
```

Open the address it prints (http://localhost:5173). To try it on an Android phone on the same
Wi-Fi, open the *Network* address `npm run dev` prints.

| Command | What it does |
|---|---|
| `npm test` | Engine tests, every room's authored solution in all three Play Styles, the Attic generators, story/journey/progress and the voice-line catalogue |
| `npm run build` | Type-check and build to `dist/` |
| `npm run build:pages` | Build into `docs/play/` for "Deploy from a branch → main → /docs" (commit the result) |
| `npm run check:pages` | Verify the published game code, all art and all audio match the source build |
| `npm run check:audio` | Decode the production recordings and verify recorded/device-speech catalogue coverage |
| `npm run check:offline` | Check fresh first-visit offline startup and all ten new puzzle kinds (Playwright required) |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run playthrough` | Headless Chromium plays the whole story from an empty save (see below) |
| `npm run assets` | Generate optional painted art with Gemini |

Debug routes (handy while building): `?room=2-3&style=engineer` opens a room directly,
`?scene=bench` opens a scene. `window.pm` exposes the current room's `solve()` for automated tests;
it never changes how the game plays.

## Voices, music and sound effects (ElevenLabs)

Production audio is pre-generated locally and shipped as static files. The game never
calls ElevenLabs or receives an API key. The selected guide is **Nana A** from the
audition; Magnus uses candidate A. Other speaking roles have fixed cast assignments
in `scripts/elevenlabs-cast.json`. Fictional young roles use existing adult performers.
Kip and Tess retain their configurable beeps, and musical puzzles keep precise
synthesized notes, tuning tones and timing.

- **Voices**: preserved recordings for story, hints, rooms, Part-o-pedia, Attic,
  treasures, cards and spoken button labels. Identical words from the same actor share
  one file. Pudding gets a recorded cat meow. New puzzle instructions have separate ids
  for each age mode and use device speech until those recordings exist, so replaced
  rooms never play their former puzzle instructions.
- **Music**: 14 gentle instrumental themes. The approved workshop audition is reused.
  Themes crossfade on repeat and become clearer as repairs progress; Wind-Down keeps
  them quieter and warmer.
- **Mechanical effects**: 44 cues, including three variations of the refined brass
  gear click. Approved bell, steam, spring, clock and ratchet sounds are reused.
  Short clock ticks and ratchet clicks are cut from the approved recordings so
  puzzle actions retain their original timing. Soft Clockwork lowers volume, rounds
  attacks and filters the recorded effects.

Put `ELEVENLABS_API_KEY` in the ignored root `.env`. Install ffmpeg and make it
available on PATH, or set `FFMPEG_PATH` to the executable. The Windows working setup
also finds `.tools/ffmpeg/ffmpeg.exe`. Use Node 20.12 or newer.

```powershell
npm run assets:audio -- --dry-run       # inspect the full plan without spending credits
npm run assets:audio                   # resume all missing production audio
npm run assets:audio -- voices         # only missing speech
npm run assets:audio -- music          # only missing themes
npm run assets:audio -- sfx            # only missing effects
npm run audition:serve                 # listen to the separate audition on the LAN
```

Generation preserves existing output and saves completed files immediately. Source
responses are kept in ignored `.asset-work/elevenlabs` so an interrupted conversion
can resume without another generation charge. Unknown outcomes are not automatically
retried. Generated audio is normalized and compressed; `public/audio/manifest.json`
contains only files that exist. Decoded voices and music have bounded memory caches.
The production service worker downloads the audio catalogue in the background for
future offline play. Missing/cold files always retain immediate safe fallbacks.

The original audition player is in `auditions/elevenlabs/index.html`. New recordings
still benefit from listening review; automated decoding verifies file integrity,
not pronunciation or artistic quality.

## Painted art (Gemini, optional)

The game layers recovered and generated illustrations with live puzzle geometry,
characters, animation and controls. Missing art has a procedural fallback. The legacy
Gemini script can optionally add other painted assets under `public/art`:

```powershell
npm run assets -- images --dry-run
# Supply GEMINI_API_KEY in the environment, then:
npm run assets -- images
```

Keep keys out of commits, browser code and logs. Missing art falls back to the
code-drawn game. Video is not used; cutscenes are animated in code.

## Automated playthrough

```bash
npm run dev                      # in one terminal
npm i -D playwright && npx playwright install chromium   # once
npm run playthrough -- --repairs 8 --out playthrough
```

It makes a profile on the title screen, plays every story scene and room (applying each room's
authored solution through the room's own pipeline), visits every hub area and a Quick Fix, and
fails on any page error. Screenshots land in `playthrough/`. Software rendering is slow, so it waits
on game state, not fixed delays.

### Touch-only playthrough (phones and tablets)

```bash
npm run build && npm run preview -- --port 4173   # a built copy, so edits don't reload the page mid-run
npm run playthrough:touch -- --url http://localhost:4173 --device all
```

Emulates phones and tablets (`phone`, `tablet`, `phone-portrait`, `tablet-portrait`, or `all`) with
touch only, and taps every menu button, story ▶, room banner, the letter-stamp keypad (including ⌫),
each hub area and its back button, the grown-ups gate (a real press-and-hold) and the title's
profile card at their on-screen positions. Puzzles are completed with each room's authored
solution. It fails on any page or console error, a frozen game loop, or a button that does nothing.
It uses the Canvas renderer (`?renderer=canvas`) because headless software WebGL runs at ~3 fps;
add `--webgl` to test the WebGL renderer.

## Deploy to GitHub Pages

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. `.github/workflows/deploy.yml` runs the tests, builds and publishes on every push to `main`.

## Install it on Android

Open the Pages link in **Chrome** → ⋮ → **Install app** (or **Add to Home screen**). It launches
fullscreen in landscape and works offline after the first visit. For the Play Store later, wrap the
same build with Capacitor.

## Project layout

```
src/
  main.ts            game config, error capture, service worker
  debug.ts           window.pm hooks for automated playthroughs
  mechanism/         pure, deterministic engines (no Phaser) + tests
  rules/             Play Style rules: effective rooms, initial/solution/solved per room kind
  content/           rooms (r1–r8), Quick Fixes, Attic generators, story, voices, voice-line
                     catalogue, variety age variants, Part-o-pedia, cosmetics, stamps, songs, Contraption Cards
  core/              saves & profiles, progress & rewards, the repair journey, session timers
  rooms/             RoomBase + one scene per room kind
  scenes/            title, shop hub, story, Test Run, rewards, festival, shelf, town,
                     Part-o-pedia, Paint & Polish, Nook, Invention Bench, Attic, Quick Fixes, grown-ups
  art/               code-drawn Kip/Tess, portraits, machines, parts, shop, backdrops; optional
                     generated pictures
  audio/             Web Audio engine, recorded effects and adaptive music, voice player
  ui/                buttons, cards, speech bubble, parental gate, keypads, scroll grids
scripts/             generate-elevenlabs.mjs (audio), generate-assets.mjs (art), playthrough.mjs
public/              PWA manifest, service worker, icons, generated audio/art + manifests
```

## Publishing the integrated game

GitHub Pages is configured for **Deploy from a branch → main → /docs**. Run `npm run build`, `npm run build:pages` and `npm run check:pages`, then include `docs/play/` in the merge to main. The validation workflow runs tests and both builds and rejects stale published files. It does not start a competing deployment; GitHub publishes the committed `/docs` folder.

The audio generator and separate audition tools remain available. Audition recordings and player files stay in the local ignored `auditions/` folder; production recordings are bundled in `public/audio/` and `docs/play/audio/`.
