# Main /docs release - 2026-10-11

This release combines the approved Kip/Tess accessory overhaul and My Music Box composer.
All 104 cosmetic IDs, prices and saved looks are retained. Eight modular painted WebP atlases
combine Workshop Heirlooms, Enamel Toybox and Botanical Clockwork. The composer supports
melodies, chords, rests, tempo, looping, unlimited undo, drafts and saved-tune playback in the Nook;
legacy bench saves and Pin Garden songs remain intact. Eight matching Nana recordings are included.

GitHub Pages is configured to publish `main /docs`. The playable game is the committed
`docs/play/` directory; the root docs page redirects to `play/`. Media and service-worker URLs
remain relative so deployment beneath `/pocket-mechanic/play/` works correctly.

## Release checks

| Check | Result |
|---|---|
| TypeScript | Strict typecheck passed |
| Full regression suite | 322 tests in 24 files passed |
| Production and Pages builds | Both passed; `assets/index-CljjxXZZ.js` |
| Published media equality | 48 art files and 1,206 audio files identical; 1,258 media/PWA files checked |
| Audio coverage and decoding | All 2,497 expected spoken IDs recorded; all 1,206 files decoded, zero failures |
| Accessory browser coverage | 207 combinations, six interaction checks, 39 screenshots, zero errors |
| Composer browser coverage | 36 cases across desktop, landscape touch, Little Tinker and portrait touch; zero failures/errors |
| Fresh-install offline | Final bundle and all 48 art files cached; ten added Engineer puzzle kinds completed offline |

Browser checks use isolated profiles and the final `docs/play/` output. Accessory checks cover
all eight poses, real pointer selection/purchase, saved-look reload, try-on cancellation and
both characters in a repair room. Composer checks observe real pointer/touch input and actual
Web Audio pitches/timing, including a 64-edit undo stress check per layout. Offline puzzle
completion applies each room's authored solution through its engine. Touch results are browser
emulation rather than physical-device measurements.

Reproduce the code/media checks with `npm test`, `npm run build`, `npm run build:pages`
and `npm run check:pages`. The validation workflow repeats these on Linux and rejects any
rebuild differences in the committed `docs/play/` output. Browser scripts are
`scripts/check-accessories.mjs`, `scripts/check-music-box.mjs` and `scripts/check-offline.mjs`.
Local release reports and screenshots are retained under the ignored `.qa/release-main/` directory.

Original art, generated source PNGs, local preview launchers, agent notes and credentials are
preserved locally. Only production code, generated production media, verification scripts,
documentation and the matching Pages build belong to this release. GitHub validation,
Pages deployment status and local/remote commit identity are checked after pushing.
