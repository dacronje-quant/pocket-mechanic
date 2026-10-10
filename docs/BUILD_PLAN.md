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
| All 53 rooms + 8 Big Fixes across 25 room kinds and the 10 mechanical families | Voices: ElevenLabs pre-generated files; device speech as fallback | 3D diorama camera (2D cutaways instead) |
| Shop hub, town map (Window Seat), Display Shelf, Tune-Ups + medals | Music: ElevenLabs themes pre-generated; synthesized fallback | 12-language localisation (English only) |
| 30 Quick Fixes (24 originals + 6 preserved puzzles), Attic (23 objects, generated rooms) + Mystery Box | Foley: recorded ElevenLabs effects with synthesized fallbacks | Online sharing, Classroom Edition, physical toys |
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
  audio/                      sfx.ts (recorded + synth), music.ts (adaptive layers / recorded themes), voice.ts (TTS files → speechSynthesis fallback)
  mechanism/                  pure TS engines, unit-tested, no Phaser imports
    graph.ts                  gears: meshing, ratios, direction, jams, compound shafts (layers)   ✅
    flow.ts                   tile grid: pipes, circuits (nodal analysis), trains (points, collisions)   ✅
    light.ts                  beams: mirrors, prisms, filters, lenses, sensors   ✅
    logic.ts                  gates AND/OR/NOT/LATCH, goal expressions, truth tables   ✅
    cards.ts                  punch-card interpreter: sequence, repeat(span), if-sensor   ✅
    cams.ts                   cam shapes → follower motion patterns   ✅
    variety.ts                shadow, slide, symmetry, packing, sorting, sudoku, jugs, tilt, layers, differences   ✅
  art/                        textures, Kip (customisable looks), Tess, portraits, objects, themes, icons
  ui/                         buttons, panels, scroll lists, speech bubble, parental gate, toasts
  rooms/                      RoomBase + 25 room kinds; SpatialPuzzleRooms and ReasoningPuzzleRooms share live drawing/input helpers
  content/                    repairs, rooms data, story scripts, quick fixes, attic generator, parts, cosmetics, stamps, contraption cards
  scenes/                     Title/Profiles, Shop (hub), Story, Reveal/Return, Town, Shelf, Partopedia, PaintPolish, Nook, InventionBench, Attic, QuickFixes, GrownUps
```

Rules:
- Engines stay pure and deterministic (GDD §30.2). Every room is data + a room kind.
- Every room has an authored solution; `content.test.ts` applies each one through its engine and
  must pass. A debug hook `window.pm.room.solve()` applies it in-game for automated playthroughs.
- Browser storage is always wrapped in try/catch; the game must run without it.

## 3. Room kinds

| Kind | Family or learning focus | Mechanic |
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
| `shadow` | Spatial reasoning | fit tools to individual shadows or combine seven pieces into one silhouette |
| `slide` | Spatial reasoning | slide adjacent photo squares into an empty space; exact 3/15/25-move age variants |
| `symmetry` | Patterns | mirror cake decorations across one or two lines; reject near-matching decoys |
| `packing` | Spatial reasoning | turn parcels and fill the wagon floor without overlap; unique Engineer solution |
| `sorting` | Size and weight | order visible valve sizes or compare identical-looking valves on a limited-use balance |
| `sudoku` | Logic | colour/shape fuse rows and columns; 4×4 also has 2×2 regions |
| `jugs` | Measurement | fill, empty and pour measured jugs; sealed Engineer 8/5/3 system |
| `tilt` | Routing | roll one or two marbles together; cups stop them, holes safely reset them |
| `layers` | Light and patterns | choose, order, turn and flip glass constellation slides |
| `difference` | Observation | compare tower details with a blueprint and mark the changed parts |


## 4. GDD room → kind map

| # | Room | Kind | Notes |
|---|---|---|---|
| 1.1 | Weight Well | balance | pull lever, ride weight |
| 1.2 | Gear Gallery | gear | ✅ prototype exists |
| 1.3 | Rusty Stair | oil | gives Oil Can |
| 1.4 | Pendulum Hall | pendulum | gives Peek Lens |
| 1.5 | Hands Room | gear | Engineer 12:1 compound |
| 1.6 | Coo's Loft | chain (short) | bellows + door lever |
| 1.7 | Finch's Tool Wall | shadow | added before BF1 |
| BF1 | Four O'Clock! | chain | |
| 2.1 | Velvet Drawer | hunt | gives Spring Boots |
| 2.2 | Mainspring Vault | oil | crank + pawl |
| 2.3 | Pin Garden | music | |
| 2.4 | Comb Organ | tune | |
| 2.5 | Governor's Fan | gear | fan output, slow it down |
| 2.6 | Clementine's Stage | cam | |
| 2.7 | Abuela's Locket | slide | added before BF2 |
| BF2 | Abuela's Lullaby | chain | |
| 3.1 | Toy Town Station | flow (tracks) | |
| 3.2 | The Twins' Cake | symmetry | former Switchback Mountain preserved in Quick Fixes |
| 3.3 | Tunnel of Gears | gear | locomotive motor |
| 3.4 | The Cargo Car | packing | former Signal Junction preserved in Quick Fixes |
| 3.5 | Wobbly Bridge | balance (pulley) | gives Grapple Spring |
| 3.6 | Party Express | flow (tracks) | visit stations in order |
| BF3 | Happy Birthday Line | chain | |
| 4.1 | Power Plug | flow (circuit) | |
| 4.2 | Copper Crossroads | flow (circuit) | gives Wire Spool |
| 4.3 | Tube Towers | sorting | size/weight ordering; original circuit puzzle preserved |
| 4.4 | Fuse Box | sudoku | fully lit fuse grid; original dark circuit puzzle preserved |
| 4.5 | Dial Observatory | tune | radio tuning |
| 4.6 | Great Speaker | flow (circuit) | |
| BF4 | Storm Warning | chain | |
| 5.1 | Water Tank | jugs | gives Valve Wrench; original pipe puzzle preserved |
| 5.2 | Pipe Maze | flow (pipes) | |
| 5.3 | Boiler Heart | tune | heat gauge |
| 5.4 | Piston Plaza | flow (pipes) | several pistons |
| 5.5 | Whistle Organ | tune | chord |
| 5.6 | Sir Steamington's Pantry | cam | |
| BF5 | Teatime! | chain | |
| 6.1 | Button Board | busy | |
| 6.7 | Marble Alley | tilt | inserted here before the logic doors; stable save id |
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
| 7.6 | Star Projector | layers | original beam puzzle preserved in Quick Fixes |
| BF7 | Night Sky Lesson | chain | |
| 8.0 | Magnus's Blueprints | difference | added to open the finale |
| 8.1 | Foundation Weights | balance (pulley) | Bertie helps |
| 8.2 | Steam Lift | flow (pipes) | tea machine steam |
| 8.3 | Gear Cathedral | gear | ratio riddle |
| 8.4 | Pendulum Bridge | pendulum (sync) | Coo helps |
| 8.5 | Four Faces | light | orrery lens |
| 8.6 | Signal Room | logic | radio relays |
| 8.7 | Magnus's Nest | nest | |
| BF8 | Noon | chain | biggest |

The story has 61 rooms (53 ordinary + 8 Big Fixes). Ten new kinds add four rooms and replace
six; the former rooms move to Quick Fixes, preserving the original 24 plus six archives. See
[`PUZZLE_VARIETY.md`](PUZZLE_VARIETY.md) for the placements, age rules and compatibility. All
flow rooms (tracks/pipes/circuits) drop from 13 to 8; pipes/circuits alone drop from 9 to 6.

Quick Fixes (30) are single rooms of these kinds. Attic objects (23 × 3 rooms) are generated
from seeds by construction-solvable generators (gear chains, flow paths, beam paths, logic goals)
at Engineer difficulty; each gives a clue symbol for the Mystery Box.

## 5. Progress, rewards, gating

- Golden Gears: 3 per room (① fix, ② hidden spot — shimmer visible in Peek Lens, ③ clever objective:
  touch all fiddle toys / under par moves / no hints / no peek / room-specific). Repairs unlock in
  GDD order (1→2→3, then 4–6 any order, 7, 8) and require Golden Gears ≤ the number already
  guaranteed by ① — never blocking.
- Shiny Bits per room → Paint & Polish. Thank-You Tokens and Lost Treasures give unique cosmetics.
- Saved progress: replaced rooms retain ids and collectibles; completed repair flags remain
  complete. Added rooms are available from the replay shelf, and legacy Golden Gear gates
  retain their original thresholds. Archived puzzles strip story-only awards.
- Tune-Ups: any finished room replays in Engineer rules; medals Copper / Silver / Gold / Brass by
  moves, time, hints, peeks vs. par.

## 6. Generated media pipeline

Production audio uses scripts/generate-elevenlabs.mjs (npm run assets:audio), with a local ignored ELEVENLABS_API_KEY in .env. The game receives only static media and retains immediate synthesized/device-speech fallbacks.

- **Preserved voices:** Nana A and Magnus A, plus a fixed supporting cast. The original bank has 867 unique spoken recordings for 1,145 spoken line IDs; Pudding's recorded meow completes the 1,146-entry voice manifest. Identical words from the same actor share a file. Robot beeps remain configurable synthesis. The ten new kinds use separate age-specific instruction ids and deliberate device speech until those recordings exist; archived puzzles reuse their unchanged original recordings. See `PUZZLE_VARIETY.md` for the fallback policy.
- **Music:** 14 instrumental themes, including the approved workshop theme. Playback crossfades repeats and adjusts filtering as repairs progress.
- **Effects:** 44 cues in 46 files, including three satisfying brass gear click variations. Approved clock, spring, steam, bell and ratchet recordings are reused. Pitch-sensitive musical puzzle tones remain exact synthesis.
- **Processing:** normalized MP3, a peak limiter, resumable raw response cache, bounded decoding caches, and background offline catalogue caching. node scripts/check-audio.mjs checks coverage and fully decodes every referenced file. Human listening is still needed to judge pronunciation and artistry.
- **Painted art:** Recovered illustrations and generated character, busy-board, object, UI and puzzle assets are catalogued in `public/art/manifest.json`. Exact puzzle geometry, animation, text and input remain live. The approved visual treatment and fallback policy are in `ART_DIRECTION.md`; the optional legacy Gemini generator remains separate.
- **Secrets:** API keys stay in the ignored root .env or environment and never enter the browser bundle.

## 7. Verification

1. `npm test` — engine tests + `content.test.ts` (every room's authored solution succeeds; every
   room id referenced by repairs/quick fixes exists; story ids resolve).
2. Headless playthrough (`npm run playthrough`, Playwright): from an empty save, make a profile,
   play every story scene and room (`pm.room.solve()` applies the authored solution through the
   room's own pipeline), visit every hub area and a Quick Fix, fail on any page error.
3. Real-input checks for the ten new kinds in all age modes: legal drags/taps, rotations, hints,
   undo/reset, reachable pars and solved feedback. Use touch-emulated portrait/landscape layouts
   as well as desktop. These checks do not establish physical-device performance.
4. Final browser, asset-preservation and offline results belong in `VISUAL_OVERHAUL_VERIFICATION.md`.

## 8. Status

- [x] Prototype room (1.2 Gear Gallery), PWA, Pages workflow
- [x] Engines: gears (+layers), flow (pipes/circuits/trains), light, logic
- [x] Engines: cards, cams (+ balance, pendulum, tune, chain, pins, seeded Attic generators)
- [x] Core: profiles/settings save, journey, voice/music players, UI kit
- [x] Art: themes, portraits, object drawings, customisable Kip/Tess
- [x] Copper & Moss direction approved from the title/prologue previews; palette, illustrated procedural art and shared UI treatment implemented (see `ART_DIRECTION.md`)
- [x] Copper & Moss painted WebP pack: 28 encoded originals, all room themes and story backdrop ids, plus source provenance for all 30 recovered PNGs
- [x] Copper & Moss integration checks: build, browser playthrough, touch controls, live customisations and offline art fallback
- [x] RoomBase + 25 room kinds, including ten authored spatial/reasoning kinds
- [x] Content: 53 rooms + 8 Big Fixes, story scripts, 30 Quick Fixes, 23-object Attic + Mystery Box, Part-o-pedia, cosmetics, stamps, Contraption Cards
- [x] Puzzle variety: all ten kinds, three genuine age variants, preserved archives and save-compatible gates (`PUZZLE_VARIETY.md`)
- [x] Age-specific instructions and stable voice ids; new lines use device speech pending recordings
- [x] Hub & meta scenes (title/profiles, shop, story, Test Run, rewards, festival, shelf + Tune-Ups, town, Part-o-pedia, Paint & Polish, Nook + Job Book, Invention Bench, Attic, Quick Fixes, grown-ups)
- [x] Generated media tooling and players; production ElevenLabs audio and recovered painted originals bundled locally (see section 6)
- [x] Engine/content/voice verification suite: 225 tests passing; all authored solutions checked in every age mode
- [x] Final 61-room browser and visual/touch evidence: record the completed checks in `VISUAL_OVERHAUL_VERIFICATION.md`
- [x] Release build, README
