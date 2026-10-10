# Character voices and recorded puzzle guidance

Updated 11 October 2026 against the Copper & Moss portraits.

All 1,290 authored spoken line IDs have recordings. This includes the 120 new
puzzle introductions/hints across three play styles, six archived-puzzle payoffs,
three new static button labels, and 15 previously omitted computed menu/control
labels. Identical words in the same cast share recordings: 990 spoken files,
plus Pudding's meow. All existing original media remains available.

## Casting decisions

The aim is clear, warm conversation matching each portrait's age, personality
and scale. The six young roles previously used general adult presenter voices;
Pip used a mature female narrator, while young Odette used a mature educator.
The updated performances use lighter registers and distinct personalities.

ElevenLabs restricts child-like voice creation. These are **natural adult
performances for fictional roles**, not recordings of children, voice clones,
or adult voices electronically pitched to impersonate children. That remains
a limitation when judging the fit of the youngest characters. The provider's
[voice policy](https://elevenlabs.io/docs/eleven-creative/voices/voice-library/)
explains the restriction.

| Character | Portrait and intended performance | Decision |
|---|---|---|
| Nana Odette | Silver-haired grandmother clockmaker; warm, patient and gently playful. | Preserve Nana A. |
| Albert Finch | Round baker with moustache and chef's hat; warm, sentimental, a little flustered. | Preserve existing actor. |
| Rosa | Girl with pigtails; bright, curious and affectionate. | New light soprano adult performer. |
| Theo | Small curly-haired boy in overalls; eager about trains. | New light, energetic tenor adult performer. |
| Ada | Small girl in orange overalls; confident, decisive and playful. | New lively upper mezzo adult performer, distinct from Rosa. |
| Pip | Very small blond boy in a yellow jumper; soft, cheerful and bashful. | New light male adult performer, replacing the mature female narrator. |
| Mateo | Small boy in green; mischievous and warmly amused. | New light tenor adult performer, replacing the social-media presenter. |
| Young Odette | Apprentice with goggles and a braid; bright, earnest and curious. | New lyrical soprano adult performer, distinct from Nana. |
| Captain Marigold | Older silver-haired woman in a navy captain's coat. | New older female actor: steady, reassuring and gently weathered. |
| Mrs. Pepperwhistle | Expressive café owner with curls and feathered hat; theatrical warmth. | Preserve existing actor. |
| Professor Pockets | White-haired older man with spectacles and top hat. | New older male actor: light, whimsical, animated and gently amused. |
| Miss Juniper | Bespectacled teacher with a star clip; soft, thoughtful and calm. | Preserve existing actor. |
| Mrs. Odum | Silver-braided gardener in a straw hat. | New older female actor: practical, relaxed and affectionate. |
| Mr. Lindqvist | Silver-haired teacher in a bow tie and waistcoat. | New older male actor: precise, musical and quietly playful. |
| Mr. Ade | Friendly moustached postman; cheerful and conversational. | Preserve existing actor. |
| The Busker | Bearded musician in a knitted cap; friendly and easygoing. | Preserve existing actor. |
| The Fishers | Bearded fisherman in an oilskin coat; cheerful gratitude. | Preserve existing actor. |
| Magnus | Glossy magpie; grand, theatrical, comic, able to soften. | Preserve Magnus A. |
| Big Bertie | Large friendly robot; booming but joyful. | Preserve existing actor. |
| Whisker | Small, round shop mouse; chattery, easily startled, comic. | Preserve existing actor. |

Kip and Tess keep expressive beeps. Pudding keeps recorded cat foley. Residents
without authored spoken lines have not been given new dialogue.

Pip's mouse payoff now speaks as the delighted owner, rather than narrating a
description. Mateo's payoff has actual dialogue instead of a parenthetical
production direction that could be read aloud.

## Generation and verification

`scripts/character-voice-profiles.json` records the ten replacement casting
directions. `scripts/recast-elevenlabs.mjs` designs and assigns those actors,
preserving prior voices and cached previews; `--dry-run` makes no API requests.
`scripts/generate-elevenlabs.mjs voices` records changed/missing dialogue into
new hashed MP3s and updates the manifest. Keys stay in the local environment.

The catalogue explicitly includes computed tilt directions, character-picker
names, bench actions and play-style taglines. The coverage test includes those
controls, so the static `say: '…'` source scan cannot silently omit them again.

`npm run check:audio` requires every line to have a file matching its current
speaker, model and words, and decodes every referenced asset to check for missing,
silent or clipped files. `npm test`, production builds and browser playback
checks verify integration. These checks establish coverage and functionality;
the listening page remains useful for subjective voice fit and pronunciation.
