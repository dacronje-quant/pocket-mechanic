# Pocket Mechanic — notes for Claude

Kids' (4–10) tactile repair-puzzle game. The design is `docs/GDD.md`; the working plan, scope
decisions, room-kind mapping and status checklist are in `docs/BUILD_PLAN.md`. Read both before
building, and tick items off in BUILD_PLAN §8 as they land.

## Stack
- Vite + Phaser 3 + TypeScript (strict). Game canvas 1280×720, `Scale.FIT`, touch-first.
- Deployed to GitHub Pages by `.github/workflows/deploy.yml` (tests → build → Pages).
- Installable PWA on Android (`public/manifest.webmanifest`, `public/sw.js`).

## Commands
- `npm run dev` — dev server (also on the LAN for phone testing)
- `npm test` — vitest (engines + content solvability)
- `npm run build` — typecheck + production build to `dist/`
- `npm run playthrough` — headless Chromium plays the story from an empty save (needs a running server)
- `npm run assets` — optional Gemini voices/music/pictures (`--dry-run` works without a key)

## Conventions
- Mechanism engines in `src/mechanism/` are pure TS with no Phaser imports, deterministic, and
  unit-tested. Rooms are data (`src/content/`) + a room kind (`src/rooms/`).
- Every room has an authored solution that a test applies through its engine. Never ship a room
  without that test passing.
- No-fail design (GDD §11): wrong parts wiggle back or do something funny; nothing breaks; unlimited undo.
- Little Tinker mode is reading-free: no instructions that need text; hints are visual or spoken.
- All `localStorage` access goes through try/catch; the game must work without storage.
- Art and SFX are generated in code; real assets replace them later under the same keys.
- Child safety (GDD §26): no ads, no purchases, no online features, no free text from players.

## Secrets
- `GEMINI_API_KEY` is only ever read from the environment by the asset generation script
  (`scripts/generate-assets.mjs`: voices, music, pictures). Never commit it, never put it in client
  code, never write it to a file or log. Commit the generated audio and art files instead.

## Testing in a browser
Headless Chromium via Playwright works for screenshots and playthroughs. Software GL is slow, so
game time runs slower than wall time — wait on game state (`window.pm`), not fixed delays.
