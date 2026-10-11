# Pendulum physics and puzzle follow-up — 11 October 2026

The clock, bridge and Quick Fix metronome boards now use the same pendulum
length for gravity, tempo, rod geometry, bob placement and adjustment targets.
The approved Copper & Moss materials remain in use.

## Changes

- Motion integrates gravity, `theta'' = -(9.81/L) sin(theta)`, in seconds and
  metres. Velocity Verlet substeps keep energy and timing stable. Longer
  pendulums swing more slowly; a tap adds momentum without changing position.
- An unfitted escapement gives no ticks or clock advancement, and its free
  swing loses energy. A working clock replenishes a small swing at centre
  crossings. The pictured spring drum supplies the clock drive.
- The copper pallet contacts the wheel teeth and links to the pendulum rod.
  The wheel advances at actual centre crossings, rather than arbitrary
  animation frames. Clock hands have a 60:1 seconds/minutes and 12:1
  minutes/hours relationship and retain their positions when stopped.
- Holding a bob pauses its swing while the player slides it along the rod.
  Length marks and the Peek target use its current angle. Tap-only Tinker
  boards do not accidentally change length while the player tries to push.
- The green tempo reference uses the same length scale as the adjustable bob.
  Its light flashes at centre crossings. Readouts and narration distinguish
  faster/shorter from slower/longer; correct tempo is observed for three ticks.
- Equal lengths give equal natural periods; they do not erase an existing
  phase difference. The bridge's triangular button visibly positions both
  bobs over 0.45 seconds, then releases them together. Their phases subsequently
  evolve independently under gravity. Three observed ticks and matching motion
  are required before completion.
- Editing, holding, removing the anchor and Undo invalidate the relevant
  trial. Wrong settings cannot receive a delayed success. Rules reject
  unavailable, fractional or changed fixed-reference notches.
- Updated ElevenLabs narration covers the actual controls and the science
  entries. Existing character voices and object sounds are retained.

The force/period model follows
[OpenStax, Pendulums](https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums).
The science entry about support-mediated clock interactions is supported by
[the experimental Huygens clock study](https://www.nature.com/articles/srep23580).
This is an ideal clock regulator with a light rod, point-mass bob model and
powered escapement, rather than a finite spring-winding or friction simulation.
The game's metronome task uses this clock regulator to match a reference beat.

## Verification

- **306 source tests pass**, including measured periods, restoring acceleration,
  conservation/decay of energy, repeated impulses, small/large frames,
  independent phases, shared release and all nine authored room/style settings.
- TypeScript and production builds pass.
- **36/36 real-input solutions:** three boards, three styles, desktop, phone,
  tablet and portrait. Evidence: `.qa/sweep/pendulum-solutions`.
- **18/18 physics/input sequences:** mouse and touch, correct and wrong attempts,
  bob holding, maximum length clearance, anchor removal, one-step Undo and
  stale-success prevention. Evidence: `.qa/sweep/pendulum-physics`.
- **4/4 final shared-release rechecks:** wrong/equal lengths, smooth positioning,
  true common release and Undo. Evidence: `.qa/sweep/pendulum-final-release`.
- **4/4 instruction captures**, **72/72 long Engineer/Tess captions**, and
  **12/12 captions covering all three pendulum boards** verify the new wording
  against the visible controls. Evidence: `pendulum-instructions`,
  `pendulum-final-voice` and `pendulum-specific-captions`.
- **2,491 active spoken IDs have recordings**, with no device-speech exceptions.
  All **1,200 referenced audio files** decode successfully.

Touch layouts are emulated. Browser drivers use actual clicks and drags; they do
not write mechanism state, invoke solve hooks or manufacture completion.

Repeat the focused input checks with:

```powershell
node scripts/check-pendulum-physics.mjs --url http://127.0.0.1:4179
```

The prior sweep was pushed to GitHub main at `17e6329`. This follow-up was
validated on `fix/pendulum-physics`, with matching `index-BWE0Z1t-.js` production
and `docs/play/` builds prepared
for the user's requested primary-branch push.
