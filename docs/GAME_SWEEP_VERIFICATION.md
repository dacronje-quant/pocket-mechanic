# Game, picture and voice sweep — 11 October 2026

The sweep keeps the approved Copper & Moss art direction and checks that the
visible parts, legal actions, goal, hints and recorded narration agree. It covers
160 rooms: 61 story rooms, 30 Quick Fixes and 69 seeded Attic rooms, in Little
Tinker, Fixer and Engineer styles.

Latest GitHub main was pulled twice during the work. The final integration base
is `3103683dc85f8599a8649578ae4aace40773abbb`, including the distinct Big Show repeat
cards and art-loading cleanup. Both the user's original local work and the
completed first sweep have recoverable Git stashes. The work was validated on
`fix/visual-puzzle-voice-sweep`. At the user's subsequent request to push all
completed changes to the primary branch, `docs/play/` was rebuilt and checked
against the source build before committing and pushing to GitHub `main`.

## What changed

| Boards | Corrections |
| --- | --- |
| Balance, gear, oil, pendulum, chain | Actual torque and effort cues; both stopped hands; distinct bearings and responsive oiling; correctly linked bobs and timing; matching chain parts, ports and signal pictures; edits and Undo recover from Run. |
| Music, tune, cam, cards | Matching reference pitches and beats; independent drag history; removable cam parts; Watch demonstrates every sensor scenario; edits cancel stale playback; latest main's one-card/two-card repeat symbols are retained. |
| Flow, light, logic | Working tube and powered output effects; isolated crossings and visible shut valves; picture-appropriate destinations; colour/shape cues; correct filter/lens hints and red colour flags; input labels match the rule. |
| Shadow, hunt, slide, symmetry, packing | Recognisable continuous tool silhouettes and family photograph; hints point to visible objects; distinct tile edges; guidance handles removal, selection and rotation before placement. |
| Sorting, sudoku, jugs, busy, tilt, layers, difference, nest | Distinguishable patterns and quantities; live fuse rack matches the symbols; visible jug sizes and legal pours; transformed layer thumbnails and order arrows; blank initial star projection; instructions name the correct picture and controls. |

Goals and hints stay visible, replay speaks the visible line, and old captions
cannot cancel a newer speaker. Captions fit even with Engineer instructions,
Tess and the Peek Lens. The sound and Tess controls now occupy the lower corners.
All Tower replay buttons fit. Clipped list entries reject taps, and lists reject
gestures belonging to a modal above them.

The two supplied screenshots exposed additional hub problems. Painted card art
now sits immediately above its own graphic, below later labels and controls,
even when it loads asynchronously. The grown-up gate also uses explicit layers.
Brasswick displays the actual repaired object artwork instead of primitive train,
robot and other overlays. Repeated landmark presses replay each object's own
animation and sound; one postcard at a time leaves the landmarks accessible.
The Display Shelf's replay chooser also has a sound button.

Eight repaired objects have distinct performances: cuckoo calls and ticks, music
box chimes, train whistle and chugs, radio tuning and tones, tea steam and pouring,
Bertie's mechanical dance, orrery chimes, and tower bells. They use the effects
volume and Soft Clockwork treatment. Replaying, destroying an object or leaving
its scene cancels its previous sound and delayed cues.

## Evidence

- **480/480 desktop room/style combinations:** actual mouse events, with no solve
  callback, action callback or puzzle-state writes. The complete matrix was run
  against the first frozen sweep; later rechecks cover the final changes.
- **125/125 representative touch combinations:** all 25 kinds in all three styles
  on a 667×375 phone layout, plus Engineer on 1024×768 tablet and 375×667 portrait
  layouts. Twelve additional targeted mouse/touch cases also pass.
- **100/100 visual captures:** all 25 kinds in three desktop styles and Fixer phone,
  reviewed against their goals; twelve final captures recheck the changed
  constellation, fuse and blueprint boards.
- **10/10 menu and narration checks:** all 18 Tower replay/Tune-Up buttons, viewport
  and modal input ownership, voice ownership, replay, and 72 long Engineer captions
  with Tess and Peek. No page errors were reported.
- **Fresh save:** all 61 story rooms and eight repairs reached the festival, with
  rewards and all eight hubs visited. This route harness uses authored solve
  callbacks for puzzle completion; the separate input matrix proves legal play.
- **Audio:** all 2,490 expected spoken IDs have recordings; 1,104 unique spoken
  recordings plus Pudding's meow, 14 music themes and 52 effect cues. All 1,173
  referenced files decoded successfully, with no authored device-speech exceptions.
  After eight revised balance/sorting recordings, all 1,181 currently referenced
  files decode and the same 2,490 expected spoken IDs remain fully covered.

The initial input runs reported 23 harness failures. Investigation found missing
removal of a wrong pre-fitted gear, oil snap/hover ordering, and a large initial
drag step becoming Phaser's grab offset. Corrected real-input rechecks pass for
every failed combination. Reports retain these failures rather than silently
discarding them. `.qa/sweep/final-summary.json` records the most recent dated
result and its source report for each combination.

The initial latest-main integration used bundle `index-Dibkn86z.js` and received
additional targeted checks in `.qa/sweep/latest-main-*`: 75 legal-input puzzle
solutions (all 25 kinds in three styles), 100 visual captures, 12 parental-gate
mouse/touch cases, four early/fully repaired Town cases, and the ten hub/narration
cases. All pass. The recorded object playback audit has 50 passing checks
for exact recording playback and replay, effects volume, mute, ownership and
leaving the scene. Its report and eight-track listening preview are in
`.qa/sweep/object-sounds`.

All eight new object effects were generated using ElevenLabs' sound-effects v2
model at 44.1 kHz and 192 kbps, retained as stereo MP3. Two-pass normalization
keeps their measured integrated loudness within 2 LU of -23 LUFS, with no true
peaks above -2 dB. Source responses are cached locally; prompt and processing
identities determine the asset filenames so an earlier clip cannot remain in
the browser cache after an update. The original voice cast and existing effects
are preserved. API format details are documented by
[ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert).

The original sweep's source test run passed 268 tests in 18 files. The subsequent
[weight and balance follow-up](BALANCE_PHYSICS_VERIFICATION.md) corrects live lever
motion, pulley topology, stale trial results and the comparison scale; its source
suite passes 295 tests in 20 files. TypeScript checking,
production build and `git diff --check` pass. Media coverage is checked separately
by `scripts/check-audio.mjs`.

## Repeat the checks

Start the game with `npm run dev`, then use:

```powershell
npm test
npm run typecheck
npm run build
npm run check:puzzles -- --url http://127.0.0.1:5173
npm run check:puzzles -- --url http://127.0.0.1:5173 --devices phone
npm run check:visuals -- --url http://127.0.0.1:5173
npm run check:menus -- --url http://127.0.0.1:5173
node scripts/check-parental-gate.mjs --url http://127.0.0.1:5173
node scripts/sweep-town-check.mjs --url http://127.0.0.1:5173
node scripts/sweep-object-sounds.mjs --url http://127.0.0.1:5173 --require-recorded
npm run check:audio
```

The browser scripts use installed Playwright and Chrome, or `PLAYWRIGHT_MODULE`
and `CHROMIUM_PATH`. On this host, direct Node entry points were used because the
npm wrapper could not resolve Node. Reports and screenshots stay under ignored
`.qa/` so they do not inflate the product repository.

These checks establish legal solution routes and targeted recovery, not every
possible action sequence. Touch devices are emulated, not physical phones.
Recording coverage and decoding do not replace a human pronunciation/listening
review of every line. The `docs/play/` website is rebuilt for the requested
release; GitHub Pages publishes it from `main/docs`.
