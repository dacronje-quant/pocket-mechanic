# Full-game polish and recorded audio — 11 October 2026

The work starts from `main` at `84d14fd`. It retains the approved Copper & Moss
direction, every room and authored solution, stable voice/cosmetic/save IDs,
existing recorded media, and the no-fail design. The concurrent audio task's
removal of device speech and procedural recovery sounds is preserved.

## Corrections and polish

- Kip/Tess's topper and stalk share a socket on the case crown, including all
  poses. They no longer float over the right hand or drift apart.
- Bertie's Return uses one machine body with his original recorded dialogue and
  portrait badge. Every supporting character fits in the finale; the previous
  four-position layout could not place its six townsfolk.
- Story scenes have a visual progress indicator and replay control, readable
  minimum holds, visible awakenings, solid character opacity, and cancellation
  of stale narration callbacks. Returns, chapter beats and the festival recover
  from interrupted saves without repeating a Big Fix or granting rewards twice.
- Every puzzle kind receives a quieter, framed work surface with restrained
  material detail and a stronger High Contrast treatment. Piece sockets are
  recessed; cam demonstrations have distinct loop cues and cleaner silhouettes;
  the sugar bowl uses the established porcelain, brass and teal palette.
- Cut-figure outlines sample the actual texture frame, preventing unrelated
  atlas silhouettes behind figures. Destroyed badges release their listeners.
- Touch snapping prefers a compatible socket inside overlapping assist radii.
  Wrong fits retain gentle feedback. Room visits reuse the existing touch
  pointers. The menu freezes puzzle, hint and medal clocks and dance queues.
- Still machines, dance scores and fixed chain cards reuse their drawings.
  Animated outputs and signals remain live. Wrong dance/logic demonstrations
  respect Calm Visuals.

## Recording coverage

All **2,497 required spoken line IDs** have matching recorded performances, with
no device-speech exceptions. The catalogue contains 1,113 unique required spoken
recordings, Pudding's recorded animal cues, 14 recorded music themes and **61
effect cues**. Every one of its **1,215 distinct referenced audio files** decodes
successfully and passes the silence/clipping checks.

Nine new ElevenLabs performances cover all six robot voice chips plus toy horns,
valve hum and mechanical whistles. Kip/Tess dialogue now loads recorded robot
performances through the voice bus and cancels them on replay/scene changes;
Tess uses her own saved chip. Story music-box and Bertie celebrations use the
recorded object performances instead of old synthesized flourishes. Prompts,
model and deterministic processing are in `scripts/elevenlabs-audio-plan.mjs`
and `scripts/generate-elevenlabs.mjs`; the key stays in local generation only.

The audio audit checks literal runtime effect IDs and dynamic robot chip IDs in
addition to the generation catalogue. Failed downloads release their failed
cache entry and can retry; network requests have a six-second bound. Missing
or temporarily unreachable media stays silent and never selects a fake voice.
Exact-pitch playable notes, freely composed tunes and melody puzzle references
remain live instruments, rather than substitutes for missing recordings.

## Verification

| Check | Evidence |
| --- | --- |
| Unit/content/audio tests and strict TypeScript | 344 tests across 29 files pass; every authored room solution is checked in all age modes. |
| Story staging and lifecycle | All 25 stages render; real Next/Replay, persisted Return recovery, blocked storage, menu pause, fixed pointer allocation and score reuse pass. |
| Desktop puzzle input | All 61 Engineer story rooms pass with real mouse actions; no solve hooks or puzzle-state writes. |
| Phone input | All 75 cases pass: 25 kinds in three styles with real touch events. |
| Visual captures | 100 cases: 25 kinds in three desktop styles plus Fixer phone; zero runtime errors or text extending outside the canvas. |
| Customisation | 207 cosmetic/character combinations, six real interactions, poses, both characters and offline accessory sheets pass. |
| Menus and narration | Ten checks pass, including Tower replays, clipped/modal input, voice/replay ownership, Tess and the longest Engineer captions. |
| WebGL | Bertie's Return, finale, chain and dance render without runtime errors; the main sweeps use Canvas for efficient headless execution. |
| Audio files | All 1,215 recordings decode and are available over HTTP; required speech and runtime effect references are complete. |
| Recorded character playback | Kip and Tess pass all six voice chips (12 cases), using the correct recording and pitch, with zero oscillator or device-speech fallback calls. |
| Complete campaign | Fresh save reaches the festival after all 61 rooms and eight repairs, including rewards, hubs and a Quick Fix. |
| Offline | Fresh-install cache contains the release bundle and all 48 art files; all ten added puzzle kinds pass offline. |
| Source/Pages parity | `check-pages` compares the built code, 48 art files and all 1,215 audio files (1,267 checked static files). |

The fresh-save campaign harness exercises all 61 rooms, eight repairs, festival,
rewards, hubs and a Quick Fix through authored solutions. Separate real-input
checks establish legal playable actions. Fresh-install offline checks exercise
all ten added puzzle kinds and the complete art cache.

Reproducible commands include `npm test`, `npm run build`, `npm run build:pages`,
`npm run check:pages`, `npm run check:audio`, `npm run check:polish`,
`npm run check:recordings`, and the existing puzzle/menu/offline harnesses.
Browser harnesses require a running production preview. Detailed reports and
screenshots are retained locally in `.qa/full-improvement/`; development runs
interrupted by hot reload are superseded by frozen production checks.

These checks do not claim every possible input sequence, physical Android frame
rates, or human approval of every voice pronunciation. No save migration, online
features, advertisements or player text input are introduced.
