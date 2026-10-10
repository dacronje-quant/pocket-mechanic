# Copper & Moss local verification — 2026-10-10

The overhaul is on `art/copper-moss-full`, based on `64325a3`, in the managed local checkout `C:/Users/dacro/.codex/worktrees/copper-moss-overhaul/pocket-mechanic`. At the time of this pre-integration record, the changes were **local, uncommitted and unpushed**. The original `audio/elevenlabs-production` checkout and its existing work remain preserved. A new `Preview-Copper-Moss.bat` in the original project opens this isolated build; its own `Launch-Copper-Moss.bat` also works.

## Confirmed results

| Check | Observed result |
|---|---|
| `node node_modules/typescript/bin/tsc --noEmit` | Passed after final Playground fixes |
| `node node_modules/vitest/vitest.mjs run` | 12 files, **225 tests passed** |
| `node node_modules/vite/bin/vite.js build` | Passed; final bundle `index-Bj3Irnpj.js` |
| Full fresh-save story harness, `node scripts/playthrough.mjs --url http://127.0.0.1:5188/?renderer=canvas --repairs 8 --out .asset-work/visual-overhaul/variety-story` | **Eight repairs, 61 rooms**, all eight hub areas and a Quick Fix; `playthrough OK` |
| Real desktop input for new puzzles | **30 kind/age combinations** passed; legal taps/drags, rotations, immutable seeds/givens, invalid moves and solved feedback |
| Touch input for new puzzles | **15 phone-landscape variants** passed: spatial Tinker + Engineer (10), reasoning Engineer (5); zero browser errors |
| Playground compatibility | All ten new kinds accept changes and HUD Undo. Five spatial checks ran on final compiled build; five reasoning checks ran on the same final source through the development server |
| Engineer limits and reasoning | Scale comparison cap and Undo; water conservation and Undo; fuse conflicts; slide order, turns/flips and decoys; nearest visible blueprint detail hits all passed |
| Locket completion | All three age modes reveal the final photo square when solved while preserving the legal blank in puzzle state |
| Final visual checks | Busy board, Quick Fixes, clock and shop rendered in **both Canvas and WebGL**, with separation edges and generated faces; 30 customer portraits plus Nana loaded; zero errors |
| Spoken goals | Actual device-speech calls matched current Engineer valve/jug goals and Tinker fuse goal; replaced rooms never use their old instruction IDs |
| Live gear/cosmetics | Real gear drag completed 1-2; dimensional red finish, live star eyes and SAM plate work; all eight repair themes rendered |
| First-visit offline | `pm-v7-variety-offline` caches the **final JS bundle and all 40 distinct WebPs** before activation. All ten new Engineer kinds opened and completed offline from a fresh context; zero errors |
| Missing artwork | Blocked art requests and completed all ten new kinds without errors; original gear-room fallback also passed |
| Audio validator | **1,146 recorded IDs**, 867 unique spoken recordings, **129 explicitly declared device-speech lines**, 14 themes and 44 cues; all **927 media files decoded**, zero failures |
| Preservation | Hashes of **947 original work files** and **30 recovered PNGs** unchanged; **928 audio media/catalogue files** identical in the overhaul checkout |
| `git diff --check` | Passed; no whitespace errors |

The story harness applies authored solutions through each room's engine; surrounding story and hub navigation is exercised in the browser. The separate new-puzzle checks use real pointer and touch events, including legal moves and Undo. Touch checks are browser emulation, not physical-device testing. The 61-room story run preceded the final Playground-only guard changes; those changes received focused replay checks, and final rule tests, rendering and offline checks passed afterward.

The offline startup fix precaches the HTML-referenced build scripts. Same-origin JS/CSS cache lookups account for Vite's `Vary: Origin`, which otherwise made a precached module miss during an offline module request. The optional audio manifest is also cached. Original recordings were preserved; new instructions currently use device speech rather than newly recorded actors. Listening quality and physical-device performance remain human checks.

## Evidence

- This checkout: `.asset-work/visual-overhaul/variety-story/`, `integration-results.json`, `preservation-results.json`.
- Original project's ignored QA folder: `.asset-work/staging/spatial-ui-check/` contains desktop 15, phone 10 and final spatial Playground 5 reports/screenshots.
- Original project: `.asset-work/staging/reasoning-qa/`, `reasoning-qa-final-engineer/`, `reasoning-qa-final-engineer-phone/`, `reasoning-qa-playground/`.
- Original project: `.asset-work/variety-qa/final-art-check.json`, `final-offline-check.json` and final Canvas/WebGL screenshots.
- `scripts/check-offline.mjs` preserves the fresh first-visit offline regression check. It uses bundled or installed Playwright and Chrome through the same environment overrides as the story harness.

No deployment, publication, commits or pushes were performed during this local verification pass. The integrated main release is recorded separately in `RELEASE_VERIFICATION.md`. Art paths and generation prompts are in [`GENERATED_ART.md`](GENERATED_ART.md); puzzle placements, ages and save compatibility are in [`PUZZLE_VARIETY.md`](PUZZLE_VARIETY.md).
