# Generated game art

The new raster assets were generated with the **built-in image_gen tool**, using the recovered Copper & Moss paintings as style references. No API-key CLI was used. Final transparent outputs are copied into this checkout as WebP files; source PNGs remain in the Codex generated-images folder.

The final prompt set is saved in [`GENERATED_ART_PROMPTS.json`](GENERATED_ART_PROMPTS.json). It includes exact atlas prompts and corrective iterations from this thread; superseded variants are marked. Runtime uses the final files listed below. The latest prop prompt specifies tactile copper, brass, chipped teal enamel, glass reflections, warm upper-left lighting, generous transparent margins and no baked lettering or controls.

| Runtime asset in `public/art/` | Use |
|---|---|
| `kip-dimensional-atlas-v2.webp` | Eight Kip poses with live eyes, finishes and cosmetics |
| `tess-dimensional-atlas-v2.webp` | Eight matching Tess poses with her own silhouette and key |
| `portrait-cast-v2.webp` | Sixteen human customer portraits |
| `portrait-creatures-v2.webp` | Clockwork residents and animals |
| `portrait-clementine-v3.webp` | Corrected dancing fox, consumed only in her atlas cell |
| `item-atlas-v2.webp`, `item-atlas-extra-v2.webp` | Great Repair and Quick Fix objects |
| `item-musicbox-v3.webp` | Corrected fox music box |
| `busy-gadgets-v2.webp` | Nine gadgets, with idle and pressed states |
| `busy-board-v2.webp` | Blank tactile backing, underneath real interactive gadgets |
| `ui-surfaces-v2.webp` | Parchment and metal UI surfaces with live labels |
| `puzzle-props-v4.webp` | Sixteen props for the visibility and puzzle-variety update |

The latest source is `C:/Users/dacro/.codex/generated_images/01a126f7-4a71-73a2-b9e2-889af242c9a2/exec-2635d0d1-8757-4809-8487-22b7acf23bca.png`.

Its 4×4 atlas contains, in reading order: owl, steel spring, toggle switch, cuckoo bird, tools, family-photo locket, cake, presents, radio valve, fuses, balance scale, water jugs, marble tray, star slide, blueprints, cargo crate. Runtime frames follow the generated row boundaries so feet and backing plates remain intact.

The locket photo is used as the sliding-tile picture. Other new puzzles keep their manipulable geometry in Phaser: polyomino silhouettes, cell boundaries, mirror decorations, exact jug levels, star positions and blueprint differences remain deterministic and agree with their rules. These assets do not replace live controls.

The original 30 recovered images and all existing audio remain preserved. The manifest contains 40 distinct illustrated WebPs, including 28 recovered paintings. Cached alpha edges, a small contact shadow and a warm rim sit behind active sprites without changing their artwork.
