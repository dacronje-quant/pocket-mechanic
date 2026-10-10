# Visual & puzzle-clarity polish plan

Source: review of `main` at `b0cd757` (Fixer style), by screenshots and code. Rooms were viewed at their
starting state; a few were solved with the authored solution. Not every puzzle was played by hand.

Rule for every item: a 4–10 year old must see **what to do** and **what "done" looks like** without reading.
Keep the no-fail rules, Little Tinker reading-free rules and the room-solvability tests intact.

## Phase 0: Problems found on a phone (reported from device screenshots)

| # | Problem | Cause (from code) | Fix |
|---|---|---|---|
| 0.1 | Thank-you screen (`RewardsScene`): the postcard frame and the Kip "wear it" frame are both empty; only the right-hand list shows | Not yet found. The code draws the machine picture and Kip into those frames, so something is failing to render on the phone. Needs reproducing at phone size with the painted art loading slowly | Reproduce on a phone-sized viewport and a real device, find the cause, add a drawn fallback so a frame is never empty |
| 0.2 | Beginner (Little Tinker) oil rooms are solved by oiling a single gear | By design: `simplify` in `rules/index.ts` makes only the first required part count, drops the crank turns to 2 and removes the pawl. The room is still solved after one drop | Decide the intent. Suggested: Tinker needs every squeaky gear oiled (they are few and big), keep the crank/pawl simplification, and show a counter of squeaky gears left |
| 0.3 | Tracks and copper wires: it isn't obvious which pieces can be changed (rotate or swap) | Pieces look the same whether fixed or movable; only a tap rotates them and nothing shows that | Movable pieces get a visible "tap to turn" arrow and a raised look; fixed pieces are flat and darker |
| 0.4 | A piece in the tray points one way and snaps in pointing another | Fixer and Tinker styles use `autoRotate`: on drop, `FlowRoom.dropPart` replaces the tray piece's turn with `bestRot`, so the picture jumps | Show the piece already turned the right way while dragging (preview over the target cell), or animate the turn so it is clear it's happening; make directional ends (arrows, ports) obvious on every piece |
| 0.5 | Directional parts (curves, junctions, one-way points) are hard to read | Pieces are symmetric-looking shapes with no end markers | Draw a clear flow arrow or coloured ends on directional parts; use a different drawing for each kind |

## Phase 1: Fox and cam clarity (highest value)

| # | Problem | Fix | Where |
|---|---|---|---|
| 1.1 | Fox/Clementine is an orange oval + two triangles; "fox" and "dancer" look identical | Use the painted sprites from `portrait-clementine-v3` (fox on stand) and the other creature art; give each follower its own pose and colour | `CamRoom.drawFollower`, `art/parts.ts` (`fox`) |
| 1.2 | The rod floats 50px above the cam, so you can't see the bump pushing it | Add a roller on the rod resting on the cam edge | `CamRoom.tick/drawFollower` |
| 1.3 | Words say "spin" but the cam only moves the rod up and down | Make the figure turn while its rod is up, or change the wording to "pop up" and "bow" | `CamRoom`, `r2.ts` intro/hints |
| 1.4 | Goal is a strip of 10px bars; the faint ghost is the real goal | Large solid ghost figure beside the real one, plus a ✓ glow when matched | `CamRoom` |
| 1.5 | Five beige cams in the tray look alike | Colour each cam shape; faint matching outline on each empty shaft | `CamRoom.drawCam/drawGhosts` |
| 1.6 | Engineer mode: tapping a cam to rotate it is not shown | Small turn-arrow on placed cams | `CamRoom.tapCam` |
| 1.7 | Same issues in Sir Steamington's Pantry (5-6) | Check after the above (same room kind) | `r5.ts` |

## Phase 2: Visible goals and the speech bubble

| # | Problem | Fix | Where |
|---|---|---|---|
| 2.1 | Speech bubble (y≈150) covers the top of boards: Comb Organ waves, Pipe Maze source, Cake, Fuse grid, Marble Alley, Mirror Lane, Card Reader slot 1, Planet Arms | Dock the bubble at the bottom (over the tray) or to one side, in every room | `RoomBase.ts:848` |
| 2.2 | Goals are tiny abstract symbols | A "done" picture per room kind (ghost, outline or target icon) | each room kind |
| 2.3 | Drop targets are very faint (pawl slot, Shadow Wall spots) | Stronger pulsing outline on valid targets | `OilRoom`, `SpatialPuzzleRooms` |
| 2.4 | Title card stays up longer than it should on slow devices | Check it dismisses on tap and on time | `RoomBase.titleCard` |

## Phase 3: Invention Bench

| # | Problem | Fix | Where |
|---|---|---|---|
| 3.1 | Gadgets are coin-sized badges (scale 0.38) sitting inside the gear on their peg; the fox is a tiny brown shape | Show each gadget large on a small post above its peg, using painted sprites (fox on stand, real drum, bell) | `BenchScene.gadgetIcon/refresh` |
| 3.2 | Running shows almost nothing (fox bobs 10px, drum pulses 12%) | Real animation: fox spins on the stand, bell swings and rings, flag waves, drum beats | `BenchScene.update` |
| 3.3 | Card goal is text only | Small goal picture beside the text (crank → fox dancing → drum) | `BenchScene.loadCard` |

## Phase 4: Button Board (6-1)

| # | Problem | Fix | Where |
|---|---|---|---|
| 4.1 | No "already pressed" mark with the painted art (gold ring only in fallback) | Add a visible mark on pressed gadgets | `BusyRoom.tick` |
| 4.2 | Feedback is small (1.2s frame, 3.5% wobble, sparkles) | Bigger effects: horn blows notes, lights chase, crank raises a flag | `BusyRoom.press` |
| 4.3 | The two big red buttons are identical | Give them different colours or jobs | `r6.ts` |
| 4.4 | The tray at the bottom is empty and unused here | Hide it or use it for a progress row | `BusyRoom` |

## Phase 5: Other music box rooms

| # | Problem | Fix | Where |
|---|---|---|---|
| 5.1 | Pin Garden looks like a spreadsheet; hint says "glowing holes" but none glow | Curve the grid like a drum; make empty holes pulse | `MusicRoom` |
| 5.2 | Comb Organ teeth look like slanted levers; target waves hidden by the bubble | Draw real comb teeth; fixed by 2.1 for waves | `TuneRoom` |
| 5.3 | Governor's Fan: fan is four white ovals on a stick | Draw a bladed fan with housing; show "too fast" with a dial or a galloping Clementine | `GearRoom` |
| 5.4 | Mainspring Vault: pawl is tiny and its slot nearly invisible | Larger pawl, strong slot outline (see 2.3) | `OilRoom` |
| 5.5 | Velvet Drawer: cushions are flat coloured ovals | Draw puffy cushions that visibly lift | `hunt` room |

## Phase 6: Remaining rooms

| Room | Problem | Fix |
|---|---|---|
| 1-1 Weight Well | Plank floats above the pivot | Rest it on the pivot |
| 1-4 Pendulum Hall | Rod and bob in an empty room | Connect to the clock |
| 1-7 Finch's Tool Wall | Block shapes with tiny icons | Real tool silhouettes |
| 3-4 Cargo Car | Plain block presents | Use the painted presents |
| 6-7 Marble Alley | Cups and holes look alike | Distinct cup and hole art |
| 6-2 "Both" Doors | Plain brown door | Door art with keyholes |
| 7-4 Planet Arms | Hard to read | Clearer planets and orbits |

Good already, leave alone: train tracks, Pipe Maze and power grid layouts, sliding-photo locket,
valve sorting, star-slide layers, Big Fix chain.

## Phase 7 (optional): Gesture demonstrations

Short animated hand showing "drag this here" or "tap this", first time a room is opened. Most useful in the
cam rooms and on the bench. Needs your go-ahead.

## Working method
- New branch off `origin/main`; one PR per phase.
- After each phase: `npm test`, `npx tsc --noEmit`, screenshots of the changed rooms at phone and tablet sizes.
- Little Tinker mode checked separately for each change (no text-only instructions).
- Real-device check (iOS Safari, Android Chrome) still needed at the end.

## Tooling notes (found during the review)
- The in-app browser pane runs the game at ~5 fps and the loop can stall; restarting the loop with
  `forceSetTimeOut` fixes it. Playwright is not installed here, so `npm run playthrough` and
  `npm run playthrough:touch` have not been run on this branch.
