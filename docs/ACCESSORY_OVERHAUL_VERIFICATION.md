# Kip and Tess accessory overhaul

The approved direction combines Workshop Heirlooms, Enamel Toybox and Botanical Clockwork within the existing Copper & Moss world. The 104 existing cosmetic IDs, prices, earning conditions and saved-look fields are retained.

Eight new transparent WebP atlases provide separate Kip/Tess bodies, nine hats, ten winding keys, chest badges, bulbs/toppers, shoes, tools and voice-chip cartridges. The original character atlases remain available in the repository. Generation prompts are in `docs/ACCESSORY_ART_PROMPTS.json`; original generated PNGs are preserved locally under `.asset-work/accessory-sources/`.

The character renderer attaches the selected parts to the body rather than drawing new accessories over baked default parts. Shoes follow walking poses; keys turn while winding and remain readable at rest; lenses blink and look towards activity. Glass lenses, finish swatches and trail particles use supersampled native material textures. The category controls and item cards show actual accessory art, including Tess's default periscope. Changing categories cancels an unsaved try-on. Reward portraits, saved looks, shop/nook characters and room companions share the same renderer.

Validation:

- TypeScript check and production Vite build passed.
- Full regression suite: 322 tests in 24 files passed, including art, content, save and composer coverage.
- Browser coverage: all 207 available cosmetic/character combinations (Tess excludes monogram), all eight poses for both characters, real item taps, saved-look reload, try-on cancellation, confirmed purchase, phone landscape fit, and both characters together in a repair room.
- Fresh-install offline coverage verifies all eight new sheets are cached and the unvisited hats category opens offline. The service worker version is bumped to refresh existing installations. The general offline checker now derives its art count from the manifest.
- Release browser report and 39 screenshots: `.qa/release-main/accessories/report.json` and adjacent PNGs, tested against the exact `docs/play` build. The isolated browser test profile does not alter the user's browser saves.
- Combined release suite: all 322 tests pass, including the complete voice catalogue. The final `docs/play/` build passes all 207 cosmetic/character combinations and six interaction/persistence/offline checks with zero errors.

Run `node scripts/check-accessories.mjs --url http://127.0.0.1:4182` against a built local preview. The script supports `PLAYWRIGHT_MODULE` and the repository's existing Windows runtime fallback. A review gallery is saved under `art-style-previews/kip-tess-accessories/index.html`.

These accessories are included with the Music Box in the combined `main/docs` release. The final build and release checks are recorded in `PAGES_RELEASE_2026-10-11.md`.
