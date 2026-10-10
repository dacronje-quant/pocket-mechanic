# Puzzle variety

The story now contains **61 rooms: 53 ordinary rooms and eight Big Fixes**, using **25 room kinds**. Ten new kinds add four story rooms and replace six repeated puzzles. The six former puzzles remain in Quick Fixes, alongside the original 24, for **30 Quick Fixes** total.

The implementation is in [`src/content/rooms/variety.ts`](../src/content/rooms/variety.ts), with pure rules in [`src/mechanism/variety.ts`](../src/mechanism/variety.ts). The spatial rooms and reasoning rooms share the existing room framework: local saves, undo, visual hints, snap assistance, co-op, Golden Gears and Tune-Up medals.

## Story placements and age challenges

| Kind and story | Placement | Little Tinker (4–5) | Fixer (6–7) | Engineer (8–10) |
|---|---|---|---|---|
| **Shadow board** — Finch's Tool Wall, `1-7`: Coo knocked Finch's tools off their hooks | Added after Coo's Loft and before the clock's Big Fix | Three ready-oriented tools, shaded matching outlines | Five tools with quarter-turns and individual shadows | Seven rotated pieces combine to fill one odd outline; par 19 actions |
| **Sliding tiles** — Abuela's Locket, `2-7`: Rosa's family photograph slipped into squares | Added after Clementine's Stage and before the music-box Big Fix | 2×2 picture, exactly three moves from solved | 3×3 picture, exactly 15 moves from solved | 3×3 picture, exactly 25 moves from solved, with a 25-move par |
| **Symmetry** — The Twins' Cake, `3-2`: Theo and Ada want matching birthday decorations | Replaces Switchback Mountain | Mirror four decorations across one line | Mirror eight decorations across one line | Reflect four starting decorations into four matching quarters, across two lines; near-matching decoys |
| **Packing** — The Cargo Car, `3-4`: all birthday presents must fit in one wagon | Replaces Signal Junction | Three parcels, no turning, one fitting layout | Five parcels, turning allowed | Seven parcels, exact floor coverage, one solution; par 19 actions including turns |
| **Size/weight sorting** — The Tube Towers, `4-3`: Marigold's radio valves belong in order | Replaces the circuit version of Tube Towers | Three visibly different sizes | Six sizes, including two close sizes | Six identical-looking valves with different weights; balance comparisons within 11 weighings |
| **Fuse-box sudoku** — The Fuse Box, `4-4`: restore the radio's missing fuses | Replaces the circuit version of Fuse Box | 3×3 row/column puzzle with three fuse kinds and five givens | 4×4, four fuse kinds, eight givens and 2×2 regions | 4×4 colour/shape fuses with four givens; a unique solution reachable by logical deductions |
| **Water jugs** — The Water Tank, `5-1`: Pepperwhistle needs measured kettle water | Replaces the pipe version of Water Tank | Four-cup and two-cup jugs; fill, then pour to make two cups in each | Three-cup and five-cup jugs; measure four cups in six actions | Sealed 8/5/3-cup system; split eight cups into 4/4/0 within nine pours; authored route takes seven |
| **Marble tilt** — Marble Alley, `6-7`: Bertie's fairground game | Added after Button Board and before the logic doors | One marble, no holes, three tilts | Two marbles and holes, seven-tilt route | Two marbles move together through a larger board with holes; 12-tilt par |
| **Layered slides** — The Star Projector, `7-6`: rebuild Juniper's constellation | Replaces the beam-grid version of Star Projector | Pick two of three slides, in either order | Pick three of five; overlapping star colours make order matter | Pick three of seven; rotate and flip slides while rejecting extra stars |
| **Spot the difference** — Magnus's Blueprints, `8-0`: compare the tower with Nana's plan | Added before Foundation Weights to open the finale | Three large differences: gear, arrow and bell | Five differences, adding clock and window | Seven differences, adding wire and bird, with closer tooth-count changes |

All ten definitions set `simplify: false`. Little Tinker uses its authored simple puzzle rather than the older generic one-step simplification. Goals and spoken hints match each age variant, including the three-kind fuse grid, single marble, fixed-orientation parcels and sealed water tank. The fuse sudoku remains fully lit so the whole grid can be reasoned about at once.

## Repetition counts

The proposal's **13 → 8** reduction refers to **all flow rooms**, including tracks. Pipes and wires alone change from **9 → 6**.

| Story flow family | Before | After |
|---|---:|---:|
| Tracks | 4 | 2 |
| Circuits | 5 | 3 |
| Pipes | 4 | 3 |
| **All flow rooms** | **13** | **8** |
| **Pipes and circuits only** | **9** | **6** |

Radio now mixes three circuit rooms with valve sorting, fuse sudoku and tuning before its Big Fix. The tea machine gains water measurement. The train gains symmetry and packing, and the orrery gains layered slides alongside its remaining light and gear puzzles.

## Preserved puzzles and saved games

| Preserved puzzle | Quick Fix id | Unlocks after |
|---|---|---:|
| Switchback Mountain | `qf-archive-3-2` | Repair 3 |
| Signal Junction | `qf-archive-3-4` | Repair 3 |
| The Tube Towers, circuit version | `qf-archive-4-3` | Repair 4 |
| The Fuse Box, circuit version | `qf-archive-4-4` | Repair 4 |
| The Water Tank, pipe version | `qf-archive-5-1` | Repair 5 |
| The Star Projector, light version | `qf-archive-7-6` | Repair 7 |

The original 24 Quick Fix ids and rewards remain unchanged. Archived rooms keep their mechanism definitions and age overrides. Their story-only treasures, Magnus Marks, blueprints and tool awards are stripped to avoid duplicate awards; they reuse an existing cosmetic reward. The archived Fuse Box retains its original dark-room treatment.

The save format remains version 2. Replaced story rooms keep their original ids and collectible locations, including the train ticket, radio postcard and mark, Water Tank wrench and Star Projector rocket drawing. Recorded completion, Golden Gears and medals on those ids remain intact.

Added room ids are `1-7`, `2-7`, `6-7` and `8-0`. Completed repair flags remain completed; new rooms are available from the replay shelf without pretending they were previously solved. Existing Golden Gear unlock thresholds use the original room counts, so inserting four rooms cannot raise a saved profile's gates.

## Voice policy

[`roomVoiceId`](../src/content/roomVoice.ts) gives each new puzzle kind and age mode its own instruction ids, for example `4-3.sorting.engineer.intro`. Intros and all three hint tiers use the same ids in the live room and the generation catalogue. Replaced rooms therefore cannot select old recordings that describe tracks, pipes or beams.

All 120 age-specific introductions and hint tiers now have Nana recordings under those IDs. The archived payoffs and new control labels are also recorded. The audio checker rejects missing files and stale speaker/text assignments instead of allowing new lines to depend on device speech. Device speech still provides bounded recovery when a file cannot load. Archived puzzles reuse their original intro/hint IDs because their instructions are unchanged. The original recordings are retained alongside the current bank. See [VOICE_CASTING.md](VOICE_CASTING.md) for the portrait-directed supporting cast.

## Engine and integration verification

`node node_modules/typescript/bin/tsc --noEmit` passes. The full engine/content/voice suite has **225 passing tests** with `node node_modules/vitest/vitest.mjs run`; the focused variety/content/voice subset has 123 passing tests after the final instruction and par edits.

The checks cover:

- Legal authored solutions in all three age modes for every story room, Quick Fix and generated Attic room; none start solved.
- Piece boundaries, rotations, overlapping placements and correct tool shadows; exactly one young-player packing layout and one seven-piece Engineer layout. Engineer piece-board pars account for manual turn taps as well as placements.
- Exact shortest sliding routes of 3/15/25 moves and legal hints after different player moves.
- Immutable decoration seeds, both mirror lines and rejection of extra or decoy decorations.
- Weight sorting through legal comparisons within the allowance, with rejected invalid swaps and exhausted weighing budgets.
- Unique fuse solutions, protected givens, row/column/region conflicts, and an Engineer solution by singles and hidden singles without guessing.
- Capacity-limited jug pours, sealed-water conservation, move limits and legal hints in all age modes.
- Deterministic simultaneous marble rolls, no overlapping marbles, safe hole resets and shortest 3/7/12-tilt routes.
- Layer order, transformations and rejection of decoy stars; difference targets reject repeated or outside taps.
- Existing completion flags, legacy unlock thresholds, preserved collectible ownership and correct age-specific voice ids.

Browser evidence and the final visual/touch review are recorded separately in [`VISUAL_OVERHAUL_VERIFICATION.md`](VISUAL_OVERHAUL_VERIFICATION.md). Authored-solution playthroughs establish scene routing and progression; real input checks establish the tested drag, tap, undo and reset controls. Browser touch emulation is not physical phone or tablet validation.
