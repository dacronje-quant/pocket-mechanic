# Pocket Mechanic: The Clockwork Repair Shop

A touch-first repair-puzzle game for children aged 4–10. Kip, a tiny clockwork robot, shrinks
inside the broken treasures people bring to Nana Odette's repair shop and fixes them from the
inside: gears, levers, springs, pendulums, music cylinders, tracks, circuits, pipes, logic gates
and light. Nothing can fail or break for good; wrong parts wiggle back or do something funny.

Built with **Phaser 3 + TypeScript + Vite**, deployed to **GitHub Pages**, installable on Android as
an app (PWA) and playable offline. The design is [`docs/GDD.md`](docs/GDD.md); the working plan and
status are in [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).

## What's in the game

- **The story** — a stormy-night prologue, eight Great Repairs (the cuckoo clock, Rosa's music box,
  the twins' birthday train, Captain Marigold's radio, the Grand Tea Machine, Big Bertie, Miss
  Juniper's star orrery and the Brasswick clock tower), Magnus the magpie's mystery, the Tick-Tock
  Festival and the credits.
- **57 rooms** — 49 rooms and 8 Big Fix chain reactions, built from 15 room kinds on pure,
  unit-tested mechanism engines (gear graph with compound shafts, pipe/circuit/track flow with real
  nodal analysis, light beams, logic gates and latches, punch-card programs, cams, levers and
  pulleys, pendulums, tuning, chain reactions, pinned music cylinders).
- **Three Play Styles** — 🪛 Little Tinker (reading-free, huge snap, everything but one step
  pre-built), 🔧 Fixer, 📐 Engineer (numbers, ratios, hints only on request). They change the rules,
  not just the numbers, and can be switched at any time.
- **The shop hub** — door and Job Board, Display Shelf (Playground and Tune-Ups with Copper → Brass
  medals), Parts Drawers (Part-o-pedia with "How It Really Works" and "Spot It at Home!"), Kip's
  Nook (matchbox → tin-can cottage → clockwork house, furniture, a mini music box, the Job Book of
  stamps), Paint & Polish (10 cosmetic slots, polish mini-game, saved looks, Tess's corner), the
  Window Seat (Brasswick comes back to life as you fix things), the Invention Bench, the Quick
  Fixes basket and the Attic.
- **24 Quick Fixes** and **the Mystery Attic** — 23 antique machines with three generated rooms each
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

Needs [Node.js](https://nodejs.org) 20 or newer.

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
| `npm run preview` | Serve the built `dist/` locally |
| `npm run playthrough` | Headless Chromium plays the whole story from an empty save (see below) |
| `npm run assets` | Generate voices, music and painted art with Gemini (optional, see below) |

Debug routes (handy while building): `?room=2-3&style=engineer` opens a room directly,
`?scene=bench` opens a scene. `window.pm` exposes the current room's `solve()` for automated tests;
it never changes how the game plays.

## Voices, music and painted art (Gemini, optional)

Everything in the game is drawn and synthesised in code, so it is complete without any asset
files. `scripts/generate-assets.mjs` can add, on top:

- **Voices** — every spoken line (story, rooms, hints, Part-o-pedia, menus: ~870 recordings) with
  Gemini text-to-speech, one fixed prebuilt voice and delivery style per character
  (`src/content/voices.ts`). Kip and Tess always beep.
- **Music** — one 30-second instrumental loop per object theme with Lyria. The player crossfades
  the loop into itself and plays it through a filter that opens up as rooms are fixed, so you still
  *hear* your progress.
- **Painted art** — story backdrops, the title picture, a postcard from each repaired object's home
  and Attic history plates with Gemini's image model ("Nano Banana"). The code-drawn characters and
  machines stay on top, so the art style stays consistent.

```bash
GEMINI_API_KEY=… npm run assets                 # everything that's missing
GEMINI_API_KEY=… npm run assets -- voices --only r1   # just some voice lines
npm run assets -- --dry-run                      # what would be made
```

The key is read from the environment only, sent in a request header, and never printed or written
anywhere. Commit the generated files under `public/audio` and `public/art`, never the key — and
listen to / look at everything before committing, because this is a children's game. Missing files
simply fall back to code-made art, synthesised music and the device's own speech. Video (Veo) is not
used: cutscenes are animated in code, which keeps the offline app small. Models can be changed with
`GEMINI_TTS_MODEL`, `GEMINI_MUSIC_MODEL` and `GEMINI_IMAGE_MODEL`; `ffmpeg` (if installed) compresses
the results.

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
                     catalogue, Part-o-pedia, cosmetics, stamps, songs, Contraption Cards
  core/              saves & profiles, progress & rewards, the repair journey, session timers
  rooms/             RoomBase + one scene per room kind
  scenes/            title, shop hub, story, Test Run, rewards, festival, shelf, town,
                     Part-o-pedia, Paint & Polish, Nook, Invention Bench, Attic, Quick Fixes, grown-ups
  art/               code-drawn Kip/Tess, portraits, machines, parts, shop, backdrops; optional
                     generated pictures
  audio/             Web Audio engine, synthesised SFX and adaptive music, voice player
  ui/                buttons, cards, speech bubble, parental gate, keypads, scroll grids
scripts/             generate-assets.mjs (Gemini), playthrough.mjs (Playwright)
public/              PWA manifest, service worker, icons, generated audio/art + manifests
```
