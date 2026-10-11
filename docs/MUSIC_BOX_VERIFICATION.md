# My Music Box

The shop's former Invention Bench opens a free music composer. Its `bench` route and repair-four
unlock are retained. The shop displays the painted fox music box and a musical staff even after
the painted shop background loads. The composer uses the established Copper & Moss art.

Players write a sixteen-beat melody with ten keys (C4 through E5), use a silent beat, and tap
the brass roll to add or remove chord notes. Playback starts at beat one; its highlight and
keyboard illumination follow the same audio clock as the notes. Tempo runs from 40 to 180 BPM.
Play becomes Stop while playing. Loop repeats the roll. Undo retains every edit in the session.
Editing, opening a gallery, leaving,
or pressing Stop cancels sounding and scheduled notes. No repair solution or success lock
is applied to the composer.

Drafts persist per profile. Save keeps notes, chords and tempo, avoids identical duplicate tunes,
and awards the existing composition stamp. Clear is undoable. My Tunes loads songs for further
editing. Existing Pin Garden compositions and older bench saves remain intact. The Nook plays
every chord at the saved tempo; collected songs retain their authored speed. Changing a Nook
song or closing the gallery cancels its previous playback. Magnus's Nest Studio remains available
after repair eight.

Eight new ElevenLabs recordings use the existing Nana cast: four composer instructions, two
updated shop descriptions, Help and Silent Beat. Musical comb notes remain precisely tuned
Web Audio oscillators, with decaying steel-comb partials; recorded effects cannot change their
pitch or timing. API credentials remain in the ignored generator environment.

## Checks

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` passes.
- Production build: `node node_modules/vite/bin/vite.js build` passes.
- Full regression suite: 322 tests in 24 files pass, including 13 new composition/audio tests.
- All current spoken line IDs have recordings in the production audio manifest.
- All eight new recordings match the current text and Nana actor, and decode completely.
- `scripts/check-music-box.mjs` uses real mouse/touch taps and initial save fixtures only. It
  observes actual Web Audio oscillator starts, stops, frequencies and timestamps. No edit,
  playback, completion, or save action hooks are called.
- All 36 browser cases, including a 64-edit undo stress check on each layout, pass with zero browser or game-loop errors.
- Coverage includes desktop, landscape touch, reading-free Little Tinker and portrait touch:
  blank start, caption fit, painted object, keys, rest, chords, pin removal, undo, BPM limits,
  matching audible pitches, simultaneous chords, beat timing, Play/Stop labels, saving,
  reloads, legacy preservation, duplicate saves, Clear/Undo, modal input ownership,
  loading old high notes, looping, stopping, shop routing, leaving with active playback,
  Nook chord/tempo playback and cancellation when switching collected songs or closing.

Release browser reports and screenshots are generated in the ignored `.qa/release-main/music-box/`
directory. These checks run against the exact `docs/play/` build served locally on port 4192.

The combined release includes the Music Box and accessory update under `docs/play/`, published
through `main/docs`. Its final build checks are recorded in `PAGES_RELEASE_2026-10-11.md`.
