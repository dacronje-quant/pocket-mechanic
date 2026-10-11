# Release verification

The current main/docs release is documented in [PAGES_RELEASE_2026-10-11.md](PAGES_RELEASE_2026-10-11.md):
Kip/Tess accessories and My Music Box, 322 passing tests, 48 art files and 1,206 audio files.
The following record preserves the earlier integrated release evidence.

## Integrated audio and visual release — 2026-10-10

The release combines the production audio update, recovered/generated Copper & Moss artwork and ten new puzzle kinds. It includes the latest main changes through `f24b7ee`, retaining the configured GitHub Pages source `main /docs` and refreshing the committed game under `docs/play/`.

## Pre-merge checks

| Check | Result |
|---|---|
| Typecheck | `node node_modules/typescript/bin/tsc --noEmit` passed |
| Rules, content, audio and voice tests | 12 files, 225 tests passed |
| Production and Pages builds | Both passed; game bundle `index-Bj3Irnpj.js` |
| Published asset comparison | `node scripts/check-pages.mjs`: 40 art files and 927 audio files identical; 971 total build/media files checked |
| Audio decoding and catalogue coverage | `node scripts/check-audio.mjs`: all 927 files decoded, zero failures; 1,146 recorded voice IDs, 129 deliberate device-speech lines, 14 themes and 44 cues |
| Fresh published story replay | Eight repairs, 61 rooms, all eight hub areas and a Quick Fix; `playthrough OK`, exit 0 |
| First-visit offline under `/play/` | Final bundle and all 40 art files cached; all ten new Engineer kinds opened and completed offline, zero errors |
| Direct interaction coverage | Prior checks: 30 desktop age variants, 15 emulated phone variants, ten Playground modes, Canvas/WebGL artwork and current spoken goals |
| Preservation | 947 original work files and all 30 recovered PNGs unchanged; 928 production audio media/catalogue files identical |

The fresh story replay used:

```text
node scripts/playthrough.mjs --url http://127.0.0.1:5190/play/?renderer=canvas --repairs 8 --out .asset-work/release-story
```

It applies authored solutions through each room's engine; story and hub navigation runs in the browser. Separate real-pointer and touch checks cover manipulation, limits and Undo. Touch results are browser emulation rather than physical-device measurements.

The recorded bank is preserved. The 129 new instructions, controls and archive payoffs use device speech until matching actor recordings are generated. Audition tooling remains available, while the local audition pack, recovered source PNGs, keys and working evidence stay outside the published game.

Pages publishes the committed `/docs` folder. The workflow validates tests, both builds and exact published media and rejects changes to `docs/play/` caused by rebuilding. Repository line-ending rules and normalized HTML make the published build reproducible across Windows and Linux. The root docs page redirects to `play/`; URLs and the service-worker scope remain relative.

GitHub merge, CI and deployment identity are confirmed separately after the candidate is pushed. Local pre-merge reports and screenshots remain in the ignored `.asset-work/` folders; the original audio workspace is retained.
