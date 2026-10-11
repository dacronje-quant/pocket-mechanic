# Visual overhaul: code-first plan

Goal: give the game a fresher, more consistent look while keeping its feel (timings, hitboxes,
snap behaviour, no-fail reactions) and without adding many images.

## Where we are

- **Materials exist.** `src/art/copperMoss.ts` (`CM`) defines the Copper & Moss palette, and
  `finish.ts` and `textures.ts` draw rivets, plates and gears in code. Gears are rendered once to
  canvas textures, which is already the right pattern.
- **Painted images carry the scene.** Room backgrounds, Kip and object art are generated
  pictures. Code-drawn pieces (pegs, rods, gauges, output widgets, UI) sit on top of them.
- **The drift is in raw hex.** Rooms, scenes and UI have about 1,050 hex literals. Many repeat a
  `CM` value (`0x554638` is `CM.woodDark`). Others are off-palette brights (`0x51cf66` green,
  `0xd64541` red, `0x7fd3ff` sky blue) that clash with the painted world. The worst files are
  FlowRoom (101), GearRoom (96), NookScene (86), LogicRoom (77) and SimpleRooms (66).

## Approach

1. **Semantic tokens (`src/art/style.ts`).** Draw with roles such as `TONE.ok`, `TONE.power`,
   `TONE.outline`, `LINE.bold` and `SHADOW`, never with hex. A restyle then means editing one file.
2. **A "toy" drawing kit in the same module.** Every round part uses one recipe: offset shadow,
   dark rim, face, top-left highlight arc and outline (`toyDisc`). The same goes for rods
   (`toyRod`) and dials (`toyDialFace`). One light direction and one outline weight make code
   art match the painted art.
3. **Feel through motion, not pixels.** `landSquash` adds a short squash after a snap. It only
   changes scale, so drag, snap radius and timings stay as they were. Later candidates:
   - a pickup lift (a bigger shadow under the dragged part)
   - idle bobs on outputs
   - particle colours drawn from `TONE`
4. **Images only where they earn it.** Keep the painted backgrounds and characters. Do not
   replace code-drawn widgets with pictures. If a widget needs more detail, bake it once with
   `generateTexture` or a canvas, as `ensureGearTexture` does.

## Pilot: GearRoom (done on this branch)

- New `src/art/style.ts`: tokens, `toyDisc`, `toyRod`, `toyDialFace` and `landSquash`.
- GearRoom pegs, output arbors, hint ghosts, blueprint lines and the speed gauge now use the
  tokens and kit. The bright green and red on the gauge became warm moss and brick.
  Unpowered blueprint lines became a softer teal.
- Gears get a landing squash on snap.
- GearRoom hex literals went from 96 to 66. The rest are output widgets (clock, fan, train,
  planets), which are the next step.
- `npm test` passes (295). Typecheck is clean. Before and after screenshots of rooms 1-2 and 1-5
  show the same layout, with the restyled pegs, rods and gauge.

## Rollout

1. Finish GearRoom output widgets on the tokens.
2. FlowRoom, then LogicRoom and SimpleRooms (the largest hex counts).
3. `src/ui/widgets.ts` and the hub scenes (NookScene, TownScene).
4. Add a test that fails when a new raw hex literal appears in `src/rooms`, `src/scenes` or
   `src/ui`, with a shrinking allow-list.
5. Use `scripts/sweep-visual-capture.mjs` for before and after captures for each room kind.
   Run `npm run playthrough` once per rollout step to confirm the feel is unchanged.

## Guardrails

- Change drawing only. Never change hitboxes, snap radii, durations of gameplay tweens or
  engine data, so the room solution tests stay meaningful.
- Calm mode (`settings().calm`) must stay calm: any new motion is scaled down or skipped there.
- High-contrast mode keeps its glow outline. Tokens must keep outline-to-face contrast.
- Test the FX budget on a low-end Android phone before adding post-FX such as bloom or glow.
