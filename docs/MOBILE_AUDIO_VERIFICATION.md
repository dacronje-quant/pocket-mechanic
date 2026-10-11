# Mobile audio startup repair — 11 October 2026

The previous release could open its title after the boot timeout while a phone
was still downloading the audio catalogue. The first tap marked audio unlocked,
but the music player found no file and never retried that theme. Its first
caption also continued silently. With the catalogue delayed by 4.5 seconds,
the production build reproduced a running audio context with zero recordings
started and zero output signal.

The audio players now wait for both a running context and the catalogue. An
active first caption can start when they become ready; scene changes and replay
cancel pending captions. Music cancels its pending request when replaced. The
caption wait remains bounded and no device voice or procedural recovery sound
is introduced.

Native document capture listeners create/resume audio within taps, including
the portrait rotation card, and prime the output with one silent PCM frame.
The engine resumes both suspended and interrupted contexts. Returning to the
page attempts recovery and subsequent taps retry permission. Where available,
the optional Audio Session API selects playback. Phaser's unused audio manager
is disabled so the game uses one shared context.

`npm run check:mobile-audio` uses real touch events, phone layouts and Chromium's
normal document-user-activation autoplay rule. It checks decoded recording URLs
and nonzero audio samples at the master output, rather than counting starts
alone. Five checks pass: ordinary startup, delayed catalogue, portrait overlay,
saved mute followed by the actual sound-button tap, and interrupted-state
recovery. The latter suspends a real context and exposes Safari's interrupted
state to the player; it is an emulation, not a physical iPhone test.

All 350 unit/content tests pass, including delayed startup, denied resume retry,
interrupted recovery and cancellation while awaiting the first tap. The existing
recorded-character harness also uses normal autoplay restrictions. Reports are
retained locally in `.qa/mobile-audio/`. Physical handset confirmation remains
necessary for the reported device; browser automation cannot inspect its volume,
audio route or site-specific sound settings.

Platform references: [WebKit activation](https://webkit.org/blog/13862/the-user-activation-api/),
[WebKit interrupted-context report](https://bugs.webkit.org/show_bug.cgi?id=273511),
and [Audio Session specification](https://www.w3.org/TR/audio-session/).
