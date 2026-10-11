# Kip redraw: code-drawn character prototype

**Problem.** In game, Kip is a painted 3/4-view atlas (`kip-dimensional-atlas-v2.webp`). Earned
accessories are flat vector shapes with no outline or shading, placed at fixed offsets on top
(`Kip.ts`, `redraw()`). They don't share his lighting, ignore the pose (the hat stays put when he
cheers or walks), hide the bulb, and non-default feet hang below the painted feet. The painted
look also can't change finish without a recolour pass.

**Prototype.** `src/art/kipVector.ts` draws Kip and all accessories in code (Canvas 2D, no
Phaser):
- **One material recipe** (`shade`): a gradient lit from the top left, an ink outline and a soft
  glint. Body, goggles, key, feet and every hat go through it, so they always match.
- **A pose rig** (`rig`): each pose computes anchors (crown, eyes, key socket, shoulders, hips,
  feet) plus the head's "up" vector. Accessories only attach to anchors, so a hat tilts with
  the head and feet replace the domes instead of stacking under them.
- **Layering slots.** Each hat has `back` and `front` parts and a `height`. The bulb stem grows
  by that height and comes out of the hat's top. A flower crown wraps around the head.
- **Finishes and lens colours** come straight from `cosmetics.ts`, so every enamel works with
  no new art.

**Compare.** Run `npm run dev` and open `/kip-lab.html`. It shows 8 looks and poses: the current
in-game Kip next to the prototype. This page is dev only and not in the production build.

## To ship it
1. Bake each look and pose once to a canvas texture, keyed by look and pose, and cache it
   (`ensureGearTexture` does the same for gears). That costs one draw per outfit change and
   nothing per frame.
2. Keep the live parts animated separately: blink lids, pupils, key spin and bulb glow. That
   means drawing them as separate layers from the same rig, so the timing and feel of the
   current Kip stay the same.
3. Port the remaining slots: all keys, plates and initials, bulb shapes, trails, Tess's
   periscope and gear-rim skirt.
4. Art direction pass: decide how close it should sit to the painted style (patina detail,
   outline weight). Portraits and cutscenes can keep the painted Kip, as long as the in-play
   Kip matches them in proportions and palette.
