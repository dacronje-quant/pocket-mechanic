# Weight and balance follow-up — 11 October 2026

The original solution sweep established that the authored routes could be played,
but missed misleading physical presentation and some alternative action sequences.
This follow-up checks the force model, visible motion and recovery together.

## Corrections

- Lever torque uses each mass times its distance from the fulcrum. The beam now
  moves under the actual loads before Pull, with inertia, damping and travel stops.
  It no longer resets flat while a heavier turning force is still present.
- The axle visibly sits above the beam, giving exact balance a stable level rest.
  Fixed loads and drawer weights hang from visible attachments and stay upright;
  their markings show true masses. Engineer marks measure distance from the pivot,
  and the readout shows both turning-force sums.
- Pull adds the actual Kip at the lever end. Load and body clearance constrain
  travel so they stay above the workbench.
- Pulley wheels now form a continuous alternating fixed/moving tackle. The odd
  arrangements anchor the rope to the load, the even arrangements to the ceiling.
  The visible supporting-strand count matches the effort calculation. The built-in
  return guide changes direction only. Rope travel is the strand count times load
  travel; insufficient force does not produce a pretend lift. Its grip remains
  visible beside the drawer throughout the lift.
- Zero fitted wheels cannot win. Rules also reject unavailable or reused masses,
  overlapping weight slots, invalid fulcrums and impossible pulley counts, while
  accepting other legitimate counterweight arrangements.
- Editing or undoing a trial cancels its delayed result. Success checks the
  current board and an exact balance waits until the beam visibly settles.
  Moving or removing a part can be undone in one step.
- The radio comparison scale has supported suspension points and upright pans.
  Valve symbols identify pieces without suggesting false mass values. New
  selections clear the old comparison; weighing limits and Undo remain visible.
- Eight updated instruction/hint recordings use the established ElevenLabs cast.
  The words shown and spoken name Pull, selecting two valves, Weigh and Swap.
- Brass pulley rims and spokes retain a clear rope groove; the Bertie helper
  uses the existing illustrated machine artwork beside the free rope.

The ideal torque and supporting-strand model follows
[OpenStax's simple-machine explanation](https://openstax.org/books/college-physics-ap-courses/pages/9-5-simple-machines).
Motion is speed-scaled for the game; this is an ideal mechanism rather than a
simulation of rope friction or deformable materials.

## Verification

The full source suite passes **295 tests in 20 files**, including all nine
authored balance room/style solutions, alternative balances, invalid assemblies,
motion direction, settling and stalled-frame stability. TypeScript checking and
the production build pass; the final bundle is `index-DmeqkqMS.js`.

Browser reports and visual evidence are under ignored `.qa/sweep/`:

- `balance-physics-stable`: **36/36** checks covering all three balance rooms in
  three styles on desktop, phone, tablet and portrait layouts, using actual
  pointer input.
- `balance-physics`: **28/28** mouse and touch checks for live tilt, alternative
  valid balances, moving the fulcrum, Kip, zero/insufficient wheels, 1/3/4/5 rope
  travel ratios and cancelling a stale Pull by editing or Undo. No browser errors.
- `balance-visuals`: live loads, attachments, Kip, the pivot and pulley geometry.
  Nine captured physical states pass the attachment and clearance checks.
  `balance-visuals/polished` adds **7/7** final-build captures: the Engineer lever
  instruction and three/five-wheel tackles before, during and after Pull. The
  illustrated Bertie, visible rope arcs and free grip all clear the drawer.
- `balance-final-pulleys`: **8/8** final mouse/touch rechecks of 1/3/4/5 supporting
  strands, including the relocated grip's clearance from the drawer and Pull.
  `balance-final-polished-pulleys` repeats these eight successfully after the
  brass wheel and illustrated Bertie polish, with no browser errors.
- `balance-final-voice`: two real-control checks pass, including **72/72** live
  Engineer/Tess intro and hint captions. `balance-final-instructions` captures all
  three desktop styles and Fixer phone for balance and sorting (**8/8**); no text
  extends outside the viewport and no browser errors are reported.
- `sorting-detail`: fourteen detailed comparison, selection, counter and Undo
  checks on desktop and phone. Six full Sorting solutions also pass.

The eight revised ElevenLabs recordings retain the existing character voices.
The audio audit decodes **1,181 files** successfully and covers all **2,490** active
voice IDs with recordings; none use device speech fallback.

To repeat the focused physical input checks:

```powershell
node scripts/check-balance-physics.mjs --url http://127.0.0.1:4179
```

Touch layouts are emulated. Reports retain interrupted development runs; the
production-preview rechecks avoid development hot-reload resetting a live board.
The previous full-game sweep remains documented in `GAME_SWEEP_VERIFICATION.md`.

Changes were validated on `fix/visual-puzzle-voice-sweep`, based on main commit
`3103683`. The user subsequently requested pushing all completed changes to the
primary branch. The matching `docs/play/` release was rebuilt and verified for
that GitHub `main` push.
