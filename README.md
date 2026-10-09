# Pocket Mechanic: The Clockwork Repair Shop — web prototype

A touch-first prototype of **Room 1.2, The Gear Gallery** from the GDD (Mr. Finch's cuckoo clock).
Built with **Phaser 3 + TypeScript + Vite**, deployed to **GitHub Pages**, installable on Android as an app (PWA).

## What's in this first room

- **Drag, snap, CLUNK** — drag a gear from the parts tray onto the empty peg. Correct fits snap in with sound, sparks, a camera bump and a phone vibration.
- **A real gear solver** (`src/mechanism/graph.ts`) — meshing gears turn opposite ways, tooth counts set speed, loops of gears jam. No physics engine, fully deterministic, unit-tested.
- **Wrong parts are funny, never failures** — the big gear refuses with a "nuh-uh" wiggle and floats back; the small one fits but whirrs alone in the air.
- **Three Play Styles** (GDD §12.1):
  - 🪛 *Little Tinker* — one gear, huge snap zone, snaps as soon as it's close, ghost outline always on, no reading.
  - 🔧 *Fixer* — three gears to choose from, Peek Lens, ghost after 30 s, Nana's spoken-style hints.
  - 📐 *Engineer* — tooth counts on every gear, a ratio gauge, small snap zone, hints only on request (`?`).
- **Peek Lens** (🔍, or tap Kip) — X-ray blueprint view; power glows gold and pools at the break.
- **Rewind Crank** (↺) — unlimited undo.
- **The Big Fix** — gears kick in one after another with a ticking cascade, the clock hands sweep (hour hand at 12:1), fanfare.
- **5 Fiddle Toys** — bell, owl, spring, light switch, loose cog.
- **3 Golden Gears** — fix the room · tap the owl's eyes three times · touch every fiddle toy. Saved in the browser.
- **Kip** walks along the floor and holds parts with a magnet beam.

All art and sound are generated in code for now (no asset files). Swap in real sprites and recorded foley later using the same texture keys and the functions in `src/audio/sfx.ts`.

## Run it on your PC

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (http://localhost:5173).

**Try it on your Android phone without deploying:** with the phone on the same Wi-Fi, open the *Network* address `npm run dev` prints (e.g. `http://192.168.1.20:5173`). If it doesn't load, allow Node.js through Windows Firewall when prompted.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Unit tests for the gear solver |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

## Put it on GitHub Pages

1. Create a new repository on GitHub, e.g. `pocket-mechanic` (public, so Pages is free).
2. Push this folder:
   ```bash
   git remote add origin https://github.com/<you>/pocket-mechanic.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` runs the tests, builds and publishes on every push to `main`. Your game will be at `https://<you>.github.io/pocket-mechanic/`.

## Install it on Android

Open the Pages link in **Chrome** → ⋮ menu → **Add to Home screen** (or **Install app**). It then launches fullscreen in landscape and works offline after the first visit.

## Project layout

```
src/
  main.ts                    Phaser game config, service worker registration
  state.ts                   Play Styles + saved progress (localStorage)
  platform.ts                Fullscreen / landscape lock helpers
  mechanism/graph.ts         The Mechanism Graph (gear solver) + tests
  rooms/gearGallery.ts       Room data: gears, pegs, solution, hints
  scenes/MenuScene.ts        Title + Play Style picker
  scenes/GearGalleryScene.ts The room: drag/snap, Peek Lens, Big Fix, fiddle toys
  art/textures.ts            Procedural gear textures
  art/Kip.ts                 Kip, drawn from shapes
  audio/sfx.ts               Synthesised placeholder sounds + haptics
  ui/widgets.ts              Buttons, Nana's speech bubble
public/                      manifest, service worker, icons
```

## Good next steps

1. Playtest the "Fiddle Test" (GDD §32.2) with a child on a real tablet.
2. Add Room 1.3 (Rusty Stair: the Oil Can) as a second `RoomDef` + scene, reusing the solver.
3. Replace placeholder sounds with recorded clock foley.
4. Later, for the Play Store: wrap this build with Capacitor (no rewrite needed).
