# Pocket Mechanic — Build Plan (full game, web edition)

This is the working plan for turning `docs/GDD.md` into a complete, playable web game.
It records the scope decisions, the architecture, how every GDD room maps onto a reusable
room type, the audio pipeline, and what is done vs. still to do.

## 1. Scope decision

The GDD describes a ~28-month, 40–50 person production. The web edition builds **everything the
player experiences**, with code-generated stand-ins where a studio would hand-make assets:

| In scope | Stand-in for studio work | Out of scope |
|---|---|---|
| Story: prologue → 8 Great Repairs → finale → epilogue | Art drawn in code (Phaser Graphics → textures) | Consoles (Switch 2, PS5, Xbox), Steam build |
| All 49 rooms + 8 Big Fixes across the 10 mechanical families | Voices: Gemini TTS pre-generated files; device speech as fallback | 3D diorama camera (2D cutaways instead) |
| Shop hub, town map (Window Seat), Display Shelf, Tune-Ups + medals | Music: Lyria loops pre-generated; synthesized fallback | 12-language localisation (English only) |
| 24 Quick Fixes, Attic (24 objects, generated rooms) + Mystery Box | Foley: synthesized SFX (`src/audio/sfx.ts`) | Online sharing, Classroom Edition, physical toys |
| Invention Bench + Contraption Cards + Contraption Codes | | One-switch scanning mode (later) |
| Paint & Polish (Kip + Tess), Kip's Nook, Part-o-pedia, stamps | | |
| Local profiles (up to 6), Play Styles, grown-up settings, Closing Time, Wind-Down | | |
| Co-op: Tess on screen + multi-touch; "Outside Hands" flashlight in dark rooms | | |
| Accessibility: calm visuals, soft clockwork audio, high contrast, snap assist, read-aloud | | |

Platform: Vite + Phaser 3 + TypeScript → GitHub Pages → Android Chrome as an installable PWA.
Later Play Store option: wrap the same build with Capacitor.

## 2. Architecture

```
src/
  main.ts                     game config, scene list, service worker
  core/                       save (profiles/settings), journey (repair flow), stats, stamps
  audio/                      sfx.ts (synth), music.ts (adaptive layers / Lyria loops), voice.ts (TTS files → speechSynthesis fallback)
  mechanism/                  pure TS engines, unit-tested, no Phaser imports
    graph.ts                  gears: meshing, ratios, direction, jams, compound shafts (layers)   ✅
    flow.ts                   tile grid: pipes, circuits (nodal analysis), trains (points, collisions)   ✅
    light.ts                  beams: mirrors, prisms, filters, lenses, sensors   ✅
    logic.ts                  gates AND/OR/NOT/LATCH, goal expressions, truth tables   ✅
    cards.ts                  punch-card interpreter: sequence, repeat(span), if-sensor   ⬜
    cams.ts                   cam shapes → follower motion patterns   ⬜
  art/                        textures, Kip (customisable looks), Tess, portraits, objects, themes, icons
  ui/                         buttons, panels, scroll lists, speech bubble, parental gate, toasts
  rooms/                      RoomBase + one scene class per room kind
  content/                    repairs, rooms data, story scripts, quick fixes, attic generator, parts, cosmetics, stamps, contraption cards
  scenes/                     Title/Profiles, Shop (hub), Story, Reveal/Return, Town, Shelf, Partopedia, PaintPolish, Nook, InventionBench, Attic, QuickFixes, GrownUps
```

Rules:
- Engines stay pure and deterministic (GDD §30.2). Every room is data + a room kind.
- Every room has an authored solution; `content.test.ts` applies each one through its engine and
  must pass. A debug hook `window.pm.debug.solve()` applies it in-game for automated playthroughs.
- Browser storage is always wrapped in try/catch; the game must run without it.

## 3. Room kinds

| Kind | Families (GDD §8) | Mechanic |
|---|---|---|
| `gear` | Gears & Shafts | drag gears onto pegs; compound parts (two layers on one shaft); outputs drive widgets (clock hands, fan, wheels, planet arms); Engineer target ratio |
| `flow` | Pipes & Steam, Wires & Circuits, Tracks & Routing | tile grid (`flow.ts` tokens): place tray tiles in slots, tap to rotate, tap valves/switches/points |
| `light` | Light, Lenses & Mirrors | tile grid (`light.ts` tokens): mirrors, prisms, filters, lenses → sensors |
| `logic` | Logic | gate slots in a marble-run diagram; levers/plates/buttons; goals: reach or truth table; latch |
| `cards` | Programming | punch-card rows for Big Bertie: moves, Repeat cards, If-sensor cards; slot limit for Engineer |
| `music` | Pins & Music | pinned cylinder (steps × notes); restore melody; compose mode |
| `tune` | Comb, radio dial, whistles, boiler | sliders with target values, heard and seen (waveform overlay) |
| `pendulum` | Pendulums & Timing | slide the bob; match metronome; two-pendulum sync; missing pallet piece |
| `balance` | Levers, Pulleys | seesaw torque with movable fulcrum/weights; block-and-tackle rope count |
| `oil` | Springs, Ratchets, oiling | oil rusty parts; wind a crank; place the missing ratchet pawl |
| `cam` | Cams | pick cam shapes so followers match the dance pattern |
| `chain` | Big Fix chain reactions (§17) | strip of linked mechanisms with typed signals; fill missing links; Run |
| `hunt` | exploration rooms | tap covers (cushions, crates) to find parts |
| `busy` | Button Board | busy board; done after N different gadgets |
| `nest` | Magnus's Nest | attach decorations to the nest; saved design appears in the epilogue |

## 4. GDD room → kind map

| # | Room | Kind | Notes |
|---|---|---|---|
| 1.1 | Weight Well | balance | pull lever, ride weight |
| 1.2 | Gear Gallery | gear | ✅ prototype exists |
| 1.3 | Rusty Stair | oil | gives Oil Can |
| 1.4 | Pendulum Hall | pendulum | gives Peek Lens |
| 1.5 | Hands Room | gear | Engineer 12:1 compound |
| 1.6 | Coo's Loft | chain (short) | bellows + door lever |
| BF1 | Four O'Clock! | chain | |
| 2.1 | Velvet Drawer | hunt | gives Spring Boots |
| 2.2 | Mainspring Vault | oil | crank + pawl |
| 2.3 | Pin Garden | music | |
| 2.4 | Comb Organ | tune | |
| 2.5 | Governor's Fan | gear | fan output, slow it down |
| 2.6 | Clementine's Stage | cam | |
| BF2 | Abuela's Lullaby | chain | |
| 3.1 | Toy Town Station | flow (tracks) | |
| 3.2 | Switchback Mountain | flow (tracks) | points |
| 3.3 | Tunnel of Gears | gear | locomotive motor |
| 3.4 | Signal Junction | flow (tracks) | two trains |
| 3.5 | Wobbly Bridge | balance (pulley) | gives Grapple Spring |
| 3.6 | Party Express | flow (tracks) | visit stations in order |
| BF3 | Happy Birthday Line | chain | |
| 4.1 | Power Plug | flow (circuit) | |
| 4.2 | Copper Crossroads | flow (circuit) | gives Wire Spool |
| 4.3 | Tube Towers | flow (circuit) | switches, replace tube |
| 4.4 | Fuse Box | flow (circuit) | series vs parallel, Snap Links, dark room (Outside Hands flashlight) |
| 4.5 | Dial Observatory | tune | radio tuning |
| 4.6 | Great Speaker | flow (circuit) | |
| BF4 | Storm Warning | chain | |
| 5.1 | Water Tank | flow (pipes) | gives Valve Wrench |
| 5.2 | Pipe Maze | flow (pipes) | |
| 5.3 | Boiler Heart | tune | heat gauge |
| 5.4 | Piston Plaza | flow (pipes) | several pistons |
| 5.5 | Whistle Organ | tune | chord |
| 5.6 | Sir Steamington's Pantry | cam | |
| BF5 | Teatime! | chain | |
| 6.1 | Button Board | busy | |
| 6.2 | "Both" Doors | logic | AND |
| 6.3 | Marble Logic Run | logic | OR / NOT |
| 6.4 | Remember Room | logic | LATCH |
| 6.5 | Card Reader | cards | sequence; gives Punch Pencil |
| 6.6 | Dance Studio | cards | loops & conditions |
| BF6 | Bertie's Big Show | cards (show) | |
| 7.1 | Sun Lamp | light | gives Prism Lamp |
| 7.2 | Mirror Lane | light | |
| 7.3 | Lens Lake | light | focus |
| 7.4 | Planet Arms | gear | several outputs |
| 7.5 | Prism Garden | light | colours |
| 7.6 | Star Projector | light | |
| BF7 | Night Sky Lesson | chain | |
| 8.1 | Foundation Weights | balance (pulley) | Bertie helps |
| 8.2 | Steam Lift | flow (pipes) | tea machine steam |
| 8.3 | Gear Cathedral | gear | ratio riddle |
| 8.4 | Pendulum Bridge | pendulum (sync) | Coo helps |
| 8.5 | Four Faces | light | orrery lens |
| 8.6 | Signal Room | logic | radio relays |
| 8.7 | Magnus's Nest | nest | |
| BF8 | Noon | chain | biggest |

Quick Fixes (24) are single rooms of these kinds. Attic objects (24 × 3 rooms) are generated
from seeds by construction-solvable generators (gear chains, flow paths, beam paths, logic goals)
at Engineer difficulty; each gives a clue symbol for the Mystery Box.

## 5. Progress, rewards, gating

- Golden Gears: 3 per room (① fix, ② hidden spot — shimmer visible in Peek Lens, ③ clever objective:
  touch all fiddle toys / under par moves / no hints / no peek / room-specific). Repairs unlock in
  GDD order (1→2→3, then 4–6 any order, 7, 8) and require Golden Gears ≤ the number already
  guaranteed by ① — never blocking.
- Shiny Bits per room → Paint & Polish. Thank-You Tokens and Lost Treasures give unique cosmetics.
- Tune-Ups: any finished room replays in Engineer rules; medals Copper / Silver / Gold / Brass by
  moves, time, hints, peeks vs. par.

## 6. Audio pipeline (Gemini)

- **Voices:** `gemini-3.8-flash-tts` (Interactions API, `POST /v1beta/interactions`, 24 kHz mono
  WAV, 30 prebuilt voices, `speech_metadata.style` for delivery). Each character gets a fixed voice
  and style. A script reads every line from `src/content` and writes `public/audio/voice/<id>.mp3`
  plus a manifest; the game plays the file if present, otherwise uses `speechSynthesis`.
- **Music:** `lyria-3-clip-preview` (exactly 30 s loops, 44.1 kHz stereo, MP3) — one instrumental
  loop per object theme + shop + attic + bench + festival, written to `public/audio/music/`.
- **Key handling:** the script reads `GEMINI_API_KEY` from the environment only. The key is never
  committed, never bundled into the web build, never written to any file. Generated audio files
  are committed instead.
- Verify exact request fields against https://ai.google.dev/gemini-api/docs/speech-generation and
  the Lyria docs before running (both models are recent).

## 7. Verification

1. `npm test` — engine tests + `content.test.ts` (every room's authored solution succeeds; every
   room id referenced by repairs/quick fixes exists; story ids resolve).
2. Headless playthrough (Playwright): for each room, open it, call `pm.debug.solve()`, wait for
   the completion banner, assert no console errors; screenshot one room of each kind.
3. Touch test at Android phone size (915×412, `hasTouch`) with CDP touch events.

## 8. Status

- [x] Prototype room (1.2 Gear Gallery), PWA, Pages workflow
- [x] Engines: gears (+layers), flow (pipes/circuits/trains), light, logic — 26 tests passing
- [ ] Engines: cards, cams
- [ ] Core: profiles/settings save, journey, voice/music players, UI kit
- [ ] Art: themes, portraits, object drawings, customisable Kip/Tess
- [ ] RoomBase + 15 room kinds
- [ ] Content: 49 rooms + 8 Big Fixes, story scripts, 24 Quick Fixes, Attic + Mystery Box, Part-o-pedia, cosmetics, stamps, Contraption Cards
- [ ] Hub & meta scenes
- [ ] Audio generation script (Gemini TTS + Lyria) and players
- [ ] Verification suite + playthrough
- [ ] Release build, README
