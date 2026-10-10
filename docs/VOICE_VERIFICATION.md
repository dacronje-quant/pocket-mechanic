# Voice update verification — 11 October 2026

## Revision after listening feedback

The user approved fourteen voices and requested changes to Theo, Mateo,
Mrs. Pepperwhistle, Big Bertie, Miss Juniper and the Fishers. Only those six
actors were replaced: 30 distinct recordings covering 31 line IDs. The fourteen
approved actor assignments and their recordings are unchanged. Previous media,
music and effects are preserved. Theo and Mateo remain natural adult male
performances; Gemini is not configured, so actual childlike Gemini speech is
not claimed. Bertie's new synthetic voice also receives a gentle mechanical
effect during generation, captured in its cache fingerprint.

Verification repeated for this revision:

- 226 tests pass; TypeScript and both production builds pass.
- All 1,290 spoken IDs remain recorded; all 1,050 referenced audio files decode
  with zero missing, stale, silent or clipped-file failures.
- The browser starts all 30 replacement clips through the game speech path,
  with zero device-speech fallbacks and zero errors.
- All 30 replacement clips decode after an offline reload.
- Pages assets match the local build: 1,094 files checked with zero errors.
- The listening page contains 20 portraits/current clips and six previous
  clips, preselects the fourteen approved ratings, retains feedback on reload,
  plays one clip at a time and fits a 390-pixel phone viewport without overflow.

These are technical checks. The six replacement performances still need the
user's listening judgment. Raw ledgers are in the ignored
`.asset-work/voice-alignment/feedback-2026-10-11/` folder.

Scope: complete the recorded voice catalogue and align supporting voices with
the current Copper & Moss portraits. The work is on
`fix/character-voices-puzzle-guidance` in the Copper & Moss worktree.

## Result

- Added recordings for 144 previously uncovered line IDs: 120 new puzzle
  introductions/hints, six archived-puzzle payoffs, three newer static control
  labels and 15 computed control/menu labels missed by the literal source scan.
- Recast Rosa, Theo, Ada, Pip, Mateo, young Odette, Captain Marigold, Professor
  Pockets, Mrs. Odum and Mr. Lindqvist. Generated 46 replacement spoken files.
- All 1,290 spoken line IDs are covered by the active bank of 990 spoken files
  plus Pudding's meow. Repeated words in the same voice share a file.
- Nana A and Magnus A are unchanged. All previously referenced original files
  remain present; music and effect manifests are unchanged.
- Young roles use natural adult performers. The casting limitation and each
  portrait-based decision are documented in [VOICE_CASTING.md](VOICE_CASTING.md).

## Checks completed

| Check | Evidence |
|---|---|
| `node scripts/check-audio.mjs` | 1,290/1,290 covered; zero missing/stale assignments; 1,050 referenced audio assets fully decoded; no silent/clipped-file failures. |
| `node node_modules/vitest/vitest.mjs run` | 226 tests passed across 12 files, including recorded coverage of computed labels. |
| TypeScript check and Vite production build | Passed; `dist` refreshed for the local game launcher. |
| Pages build and `node scripts/check-pages.mjs` | Prepared `docs/play`; 1,094 matching files, including 1,050 audio assets and 40 art files; no errors. This is a local build check, not a deployment. |
| Production-browser voice routing | Started every one of the 120 new-puzzle introductions/hints through the live room speech path, across all three play styles; zero device-speech fallbacks and zero browser errors. |
| Offline audio | Cached all 1,050 referenced audio assets; reloaded offline and decoded all 170 newly referenced or changed recordings without errors. |
| Updated listening page | 20 current portrait/voice pairs plus ten previous clips; all 30 clips decoded, one clip plays at a time, feedback survives reload, no phone-width overflow or browser errors. |
| Original-media preservation | No original voice/music/effect file modified or removed; preserved actors and manifests compared with the pre-change snapshots. |

The browser contexts used isolated saves. The voice routing check starts clips
to verify selection and playback; it does not claim human listening of every
full line. Audio decoding and generation fingerprints establish coverage and
technical integrity. Voice fit and pronunciation can still be judged on the
updated portrait-and-voice comparison page.

Raw generation caches, prior-cast snapshots and browser ledgers are under the
ignored `.asset-work/voice-alignment/` folder. The original listening page is
retained separately from the updated one.
