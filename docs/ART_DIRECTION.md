# Pocket Mechanic — Copper & Moss

The approved **Copper & Moss** direction is established by the title page and stormy-night
opening previews. These are the visual baseline for the full game. The aim is a
warm industrial picture book: weathered copper, chipped teal paint, moss, intricate pencilled
machinery and welcoming light.

## Composition

Use fixed 2D illustrations on the existing 1280×720 landscape canvas. Layered walls, furniture,
light and foreground objects suggest depth. Keep Kip's scale legible with familiar objects:
spools, thimbles, screws, watch cases and a sleeping cat.

- **Title:** a clear title and profile area on the parchment workshop wall; Kip on the workbench;
  teal door, climbing greenery, amber lamps and a pale seaside-town window.
- **Prologue:** Nana's hands and the newly awake Kip under a warm bench lamp; blue-green rain
  outside; a quiet parchment dialogue strip and a large continue control.
- **Shop and hubs:** crooked timber, labelled drawers, old jars, soft greenery and visible repair
  objects. Illustrations support the existing places and actions.
- **Rooms:** illustrated cutaways with a quiet central workboard. Keep empty sockets, active
  parts, power flow and the parts tray distinct from scenery.

Do not bake controls, captions, draggable parts or solved mechanisms into background paintings.
Use the live scene for those elements, so they remain responsive and readable at every device
size and Play Style.

## Materials and palette

`src/art/copperMoss.ts` owns the shared materials and seeded drawing helpers. Fine outlines,
bounded pencil hatching, irregular timber seams, rivets and light patina give surfaces their
age. Paper grain is subtle; cards keep most marks on their rims so words have a quiet surface.

| Material | Main colour | Use |
|---|---|---|
| Walnut ink | `#342f29` | Outlines and readable text |
| Parchment | `#e9dcc0` / `#f4ebd5` | Walls, labels, cards and dialogue |
| Copper | `#b77b56` / `#79503d` | Kip, rims, pipes and worn metal |
| Teal | `#537a72` / `#83a49a` | Painted wood, repair patches and selection |
| Moss | `#78815a` / `#a0a477` | Greenery and action accents |
| Amber | `#f1d391` | Small lamps, bulbs and warm reflections |

`src/art/palette.ts` keeps each object recognisable within this treatment. The music box remains
dusty rose and ivory; the train has pale sky and moss hills; the radio has amber tubes; the
orrery has dark desaturated teal and ivory stars. Preserve these distinct palettes across every theme.

## Characters and motion

Kip has a round copper pocket-watch case, chipped teal patches, oversized glass lenses, a large
winding key, spring legs and broad, slightly mismatched feet. The antenna carries a small warm
bulb. Use small rivets and etched seams around the case; protect the eye reflections and
silhouette from heavy texture.

Kip and Tess now use matching eight-pose dimensional atlases. Live pupils, lids, walking, blinking and celebrations remain responsive. Tess keeps her heart-shaped key, antenna and distinct silhouette. Earned finishes recolour the case while preserving teal paint, glass and reflections; saved plates, eyes, hats, feet and other cosmetics remain live. Supporting people and creatures, including every Quick Fix customer, use the generated cast with larger face crops.

Gears, valves, wires, light beams, pendulums and repaired objects also remain live. Their motion
explains cause and effect. Decorative motion stays gentle; Calm Visuals preserves its reductions
in particles and optional camera effects.

## UI and puzzle readability

Cards resemble parchment held in worn copper frames. Round controls resemble small workshop
dials, with etched icons and visible press feedback. Selection uses teal, actions use moss, and
locked items use subdued parchment. Keep dark walnut body text, simple serif headings and the
existing reading-free speech-wave mode.

- Preserve existing touch areas, snap assistance, drag behaviour and undo.
- Active sprites receive a cached dark alpha edge, narrow warm outer rim and small contact shadow in both Canvas and WebGL. The edge follows rotation, scale, containers and masks. The room work area has a quiet translucent parchment backing. Native puzzle geometry uses solid surfaces, dark edges and light bevels. High-contrast settings and the Peek Lens remain available.
- Preserve distinct shapes, patterns and motion for mechanical signals; colour alone must not
  carry puzzle meaning.
- Keep captions and counters on quiet surfaces, and size long labels and code entries to fit.
- Render text in the live UI. Avoid decorative lettering inside puzzle targets.

## Painted asset pack and fallback

The recovered pack contains 28 WebP assets (17.4 MB) under `public/art/`. The runtime uses
[`public/art/manifest.json`](../public/art/manifest.json) as the catalogue: an `images` mapping
from logical ids to filenames. All twelve room/menu themes and fourteen story backdrop ids
have painted coverage, alongside the clean title, shop hub, Nana portrait and live Kip case.
Night shop scenes reuse the storm painting; Magnus's nest uses the tower stage with live saved
decorations; the town view reuses the festival plaza with illustrated interactive pins.
The complete runtime manifest now contains 40 distinct WebPs: the 28 recovered paintings plus 12 generated atlas/surface assets. Kip, Tess, the supporting cast, repair objects, busy-board gadgets and the new owl, spring, switch and bird use this generated pack. The title wordmark, labels, puzzle geometry and Attic history panels remain live. See [GENERATED_ART.md](GENERATED_ART.md) for saved asset paths and the prompt set.

`RECOVERED_ART.json` records the source filenames, hashes and runtime mapping of all 30
recovered originals. The final two images are approved title/prologue composition references;
their baked captions and controls are not placed behind live controls. The original PNG files
remain intact in the local recovery folder `pocket-mechanic-cloud-recovery-01a1245c/images`.

`src/art/generated.ts` loads manifest-listed illustrations without changing puzzle state. Scene
activation guards keep late image callbacks out of a restarted scene. Backdrops sit below live
characters, mechanisms and HUD controls. A failed or absent image leaves the procedural
Copper & Moss art in place.

The service worker caches the complete illustrated pack, including unvisited scenes, at
installation. If a download is unavailable, its painting uses the procedural fallback. Image assets do not add a network
account, change local saves or require a connection to play.

The optional Gemini media generator is separate from this approved pack. Any replacement art
must follow this direction and be reviewed before release. Voice and music fallbacks continue
to work independently of the visual assets.

## Review before release

The current art-pass checklist is in [`BUILD_PLAN.md` §8](BUILD_PLAN.md#8-status). Review rendered
openings, all environment themes, hubs, story stages and alternate Kip/Tess looks. Check both
desktop and touch layouts, control hit areas, active puzzle contrast, long text, scene restarts
and offline fallback. Build and playthrough results should be recorded only after the final
asset manifest is populated.

## Puzzle variety

Ten additional kinds use the same visual materials and live interaction system. They add four story rooms and replace six repetitive rooms, preserving those six as Quick Fixes. The story now has 61 rooms and the basket has 30 Quick Fixes. See [PUZZLE_VARIETY.md](PUZZLE_VARIETY.md) for placements and genuine age-specific rules.
