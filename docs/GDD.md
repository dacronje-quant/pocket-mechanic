# POCKET MECHANIC: The Clockwork Repair Shop
### Full Game Design Document — v1.0

> *"Small hands. Big fixes. Every broken thing belongs to someone."*

| | |
|---|---|
| **Working title** | Pocket Mechanic: The Clockwork Repair Shop |
| **Genre** | Tactile physics-puzzle / "inside-out" adventure |
| **Audience** | Children aged 4–10, and the grown-ups and siblings who play beside them |
| **Players** | 1–2 local: symmetric co-op (Kip & Tess) or asymmetric "Outside Hands" co-op |
| **Platforms** | iPad / Android tablets (lead platform), Nintendo Switch 2, PC/Mac (Steam), PlayStation 5, Xbox Series X|S |
| **Session length** | 3–5 minutes per room; 2–3 minute "Quick Fixes"; natural stops at every room |
| **Main campaign** | ~14–16 hours; ~35–40 hours for 100% completion, plus open-ended Invention Bench |
| **Business model** | Premium, one-time purchase. No ads, no loot boxes, no in-game currency for sale |
| **Rating target** | PEGI 3 / ESRB E (Everyone) |

---

## Table of Contents

1. [Vision & High Concept](#1-vision--high-concept)
2. [Design Pillars](#2-design-pillars)
3. [Audience & the Two-Depth Promise](#3-audience--the-two-depth-promise)
4. [World & Story](#4-world--story)
5. [Characters](#5-characters)
6. [The Core Loop: A Repair, Start to Finish](#6-the-core-loop-a-repair-start-to-finish)
7. [Kip: Movement, Tools & Abilities](#7-kip-movement-tools--abilities)
8. [The Parts Toybox: Every Mechanical System](#8-the-parts-toybox-every-mechanical-system)
9. [Snap Physics & the "Busy Board" Feel](#9-snap-physics--the-busy-board-feel)
10. [Diagnosis: The Peek Lens & Hint System](#10-diagnosis-the-peek-lens--hint-system)
11. [No-Fail Design](#11-no-fail-design)
12. [Controls & Play Styles](#12-controls--play-styles)
13. [Game Structure: The Shop, the Town & the Objects](#13-game-structure-the-shop-the-town--the-objects)
14. [The Eight Great Repairs — Full Breakdown](#14-the-eight-great-repairs--full-breakdown)
15. [Quick Fixes](#15-quick-fixes)
16. [Post-Game: The Mystery Attic](#16-post-game-the-mystery-attic)
17. [The Rube Goldberg Layer: Chain Reactions & Contraptions](#17-the-rube-goldberg-layer-chain-reactions--contraptions)
18. [Customization: Making Kip Yours](#18-customization-making-kip-yours)
19. [Collectibles, Progression & Rewards](#19-collectibles-progression--rewards)
20. [Mastery: Tune-Ups, Medals & Showing Off](#20-mastery-tune-ups-medals--showing-off)
21. [Co-op & Family Play](#21-co-op--family-play)
22. [The Invention Bench (Sandbox & Creator)](#22-the-invention-bench-sandbox--creator)
23. [Audio Design](#23-audio-design)
24. [Art Direction](#24-art-direction)
25. [Accessibility](#25-accessibility)
26. [Child Safety, Wellbeing & Ethics](#26-child-safety-wellbeing--ethics)
27. [Learning Outcomes (STEM Without Homework)](#27-learning-outcomes-stem-without-homework)
28. [Parent & Grown-Up Features](#28-parent--grown-up-features)
29. [Business Model & Franchise Potential](#29-business-model--franchise-potential)
30. [Technical Design](#30-technical-design)
31. [Content Scope](#31-content-scope)
32. [Production Plan](#32-production-plan)
33. [Risks & Mitigations](#33-risks--mitigations)
34. [Appendix A — Full Walkthrough: Mr. Finch's Cuckoo Clock](#appendix-a--full-walkthrough-mr-finchs-cuckoo-clock)
35. [Appendix B — Gear Ratio Puzzle Design](#appendix-b--gear-ratio-puzzle-design)
36. [Appendix C — Logic Gate Puzzle Design](#appendix-c--logic-gate-puzzle-design)
37. [Appendix D — The Townsfolk of Brasswick](#appendix-d--the-townsfolk-of-brasswick)
38. [Appendix E — Playtest Plan](#appendix-e--playtest-plan)
39. [Appendix F — Glossary](#appendix-f--glossary)

---

## 1. Vision & High Concept

### The one-liner
**Pocket Mechanic is a cozy, hands-on puzzle adventure where you play a thumb-sized wind-up robot who climbs *inside* broken household treasures and fixes them from the inside out.**

### The elevator pitch
In the little seaside town of **Brasswick**, at the end of crooked Mainspring Lane, is a repair shop called **Odette's Tick & Tinker**. For fifty years, old **Nana Odette** has fixed every clock, music box, radio and toy in town. But her hands have grown shaky, and her eyes need thicker glasses every year. So one stormy night, she builds herself an apprentice — a tiny automaton no bigger than her thumb, with a brass body, round glass eyes and a big winding key on its back.

Its name is **Kip**. And Kip can do something Nana never could: **go inside**.

Every broken object that comes through the shop door is a whole world waiting to be explored. A cuckoo clock is a towering cathedral of gears. A music box is a garden of shining pins. A retro radio is a glowing city of wires and humming tubes. A toy train set is a sprawling railway kingdom. Kip shrinks through a keyhole, climbs inside, figures out what's wrong — a missing gear, a tangled wire, a stuck valve — and fixes it, piece by satisfying piece. Then comes the best part: Kip climbs back out, the object **whirs to life**, and Kip gets to watch it go back to the person who loves it.

### The experience in one sentence per age
- **Age 4:** *"I put the big gear on the pin and it went CLUNK and everything spun around and the bird came out and went CUCKOO!"*
- **Age 7:** *"The wire had to go round the long way so the light and the bell both turned on — and I found a lost ring inside the radio!"*
- **Age 10:** *"The minute hand needs to go twelve times faster than the hour hand, so I used a 60-tooth gear with a 5-tooth pinion — and I beat the Tune-Up with only four parts."*

### What makes Pocket Mechanic different
1. **It's a digital busy board with a soul.** Every lever clicks, every gear spins, every switch sparks. It satisfies the universal childhood urge to *fiddle* — and then gives that fiddling a purpose.
2. **"Inside-out" is a fresh perspective.** Players don't look *at* a machine; they stand *inside* it, at the scale of a mouse, among gears the size of houses. It's a sense of wonder very few games offer.
3. **Fixing is caring.** Every object belongs to someone in town, with a story and a reason it matters. The reward isn't just a working machine — it's a person's happiness.
4. **Real mechanics, real understanding.** The gears really mesh, the circuits really complete, the pendulums really keep time. Children walk away understanding how the world's machines work — without ever feeling taught.
5. **One room, two depths.** A four-year-old snaps a glowing gear onto a glowing peg. A ten-year-old works out gear ratios and logic gates — in the same room, on the same couch.

---

## 2. Design Pillars

### Pillar 1 — "Every Part Is a Toy"
Every movable object in the game must be satisfying to touch *on its own*, before it's ever part of a puzzle. A gear should feel good to spin. A lever should feel good to pull. A switch should feel good to flick. If a part isn't fun to fiddle with, it isn't finished.

### Pillar 2 — "It Clicks Because It Fits"
Parts snap with magnetic confidence when they're in the right place. The game *wants* you to succeed and meets you halfway. The "CLUNK" of a correct fit is the signature sound of Pocket Mechanic.

### Pillar 3 — "See How It Works"
Power is always visible. When a mechanism runs, glowing energy flows through it — along shafts, across gears, down wires, through pipes — so children can *see* cause and effect travel. Machines are never black boxes.

### Pillar 4 — "Fixing Is Caring"
Every repair is for someone. Owners' stories frame every object, and the "Return" moment — seeing the owner's joy — is the emotional payoff of every chapter.

### Pillar 5 — "Simple to Touch, Deep to Master"
The same mechanism can be fixed simply (snap the obvious part) or masterfully (optimise ratios, minimise parts, chain reactions). Depth is always available and never required.

### Pillar 6 — "Nothing Breaks for Good"
There is no wrong move that can't be undone. Parts never break, nothing explodes, nobody gets hurt. Mistakes produce funny wobbles and gentle "boing" sounds, then everything resets on its own.

---

## 3. Audience & the Two-Depth Promise

### Player bands

| Band | Approx. age | What they want | What they struggle with | How Pocket Mechanic serves them |
|---|---|---|---|---|
| **Little Tinkers** | 4–6 | Touching, turning, clicking, lights and sounds, "I did it!" | Fine motor precision, multi-step plans, reading | Direct drag-and-drop, big snap zones, ghost outlines show where parts go, one-step fixes, every part is a toy |
| **Fixers** | 6–8 | Figuring things out, secrets, characters, collections | Abstract rules, long sequences | 2–3 step repairs, Peek Lens diagnosis, Lost Treasures, customer stories, Part-o-pedia |
| **Engineers** | 8–10+ | Real challenge, logic, optimisation, building their own creations, customisation | Being bored or patronised | Gear ratios, timing, logic gates, punch-card programming, Tune-Up challenges, the Invention Bench, deep Kip customisation |

### The Two-Depth Promise — illustrated

Take one ordinary repair: **the hands of Mr. Finch's cuckoo clock won't turn.**

- **Little Tinker:** Kip climbs in and sees a glowing ghost-outline of a gear on an empty peg. A big brass gear lies on the floor nearby, gently bobbing. The child drags it toward the peg — it **snaps on with a CLUNK**, sparkles burst, every gear in the room starts spinning with a cascade of ticking, and the clock's hands sweep around. The child cheers.
- **Fixer:** There's no outline — but the Peek Lens shows glowing power flowing up a shaft and *stopping* at an empty peg. There are three gears on the floor: small, medium and large. The child tries the small one: it spins, but doesn't touch the next gear. The large one: too big, it won't fit. The medium: perfect fit, power flows on.
- **Engineer:** In the Tune-Up version, the clock runs — but too fast. The minute hand completes a lap in 30 seconds. The player must replace the gear pair to get the correct **12-to-1 ratio** between minute and hour hands, using a tooth-count readout, with a bonus medal for using the fewest gears.

**Same clock. Three games. Zero menus.**

---

## 4. World & Story

### Brasswick
Brasswick is a cozy seaside town of cobbled lanes, crooked rooftops, bunting, gulls and lamplight. Everything in Brasswick is a little old-fashioned and *well-loved*: people here don't throw things away — they fix them. At the heart of the town stands the **Brasswick Clock Tower**, whose great bell has rung every noon for a hundred years and starts the town's beloved **Tick-Tock Festival** every summer.

### Odette's Tick & Tinker
The repair shop is the game's hub: a warm, cluttered, golden-lit treasure trove of half-fixed things, labelled drawers of parts, hanging tools, sleeping cats and ticking clocks. From Kip's tiny perspective, it's a vast landscape — the workbench is a plateau, the parts drawers are skyscrapers, and the shop cat is a friendly, fluffy mountain.

### The story in three acts

**Act I — "Small Hands, Big Jobs" (Repairs 1–3: Cuckoo Clock, Music Box, Toy Train)**
Nana Odette builds Kip on a stormy night; a lightning-flicker in the lamp gives Kip a spark of life (a warm, magical moment — Nana gasps, then laughs with delight). The next morning, the baker Mr. Finch arrives in a panic: his cuckoo clock stopped, he overslept, and the whole town has no bread! Kip's first repair saves breakfast. Word spreads. Children and grown-ups start bringing their treasures to "the tiny fixer." But Kip keeps noticing something odd inside every object: **missing parts**. Not broken — *missing*. Someone has been taking the shiniest pieces...

**Act II — "Sparks & Steam" (Repairs 4–6: Retro Radio, Grand Tea Machine, Big Bertie the Arcade Robot)**
The repairs grow bigger and more complex. Kip discovers the culprit: **Magnus**, a vain but lovable magpie who has been sneaking into Brasswick's machines and stealing their shiniest gears, springs and bulbs to decorate his nest. Magnus is cheeky, dramatic and never truly bad — he just wants to be admired. Meanwhile, Nana builds Kip a sister, **Tess**, so Kip will never be lonely (the co-op character, introduced as a heartwarming story beat). And then, one noon, the unthinkable happens: **the Brasswick Clock Tower bell doesn't ring.** The Tick-Tock Festival is in one week.

**Act III — "The Heart of Brasswick" (Repairs 7–8: Star Orrery, The Great Clock Tower)**
Kip learns that Magnus's nest is *inside the Clock Tower* — he's taken so many parts that the great clock has stopped. Kip also learns that Nana Odette built the Clock Tower's mechanism herself, fifty years ago, as a young apprentice — and that she always wished she could fix it from the inside. The finale is the biggest repair in the game: a vertical, multi-floor journey up the tower, using every skill Kip has learned. Every customer Kip has helped *helps back*: the cuckoo bird carries parts, the toy train delivers gears, the radio relays messages, the tea machine provides steam power, Big Bertie lifts heavy weights. At the very top, Kip finds Magnus — not triumphant, but stuck and sad: his nest is so heavy with stolen shiny things that he can't move it, and nobody comes to visit him. Kip doesn't scold; Kip **builds Magnus a better nest** — a shining, spinning, music-playing nest made from spare parts — and Magnus returns everything he took. The great clock ticks, the bell rings at noon, and the festival begins.

**Epilogue — "Open for Business"**
The festival in full swing. Every repaired object is there, working, in the hands of its owner. Nana Odette, watching her old clock tower ring, squeezes Kip gently and says the game's final line: *"Everything broken can be loved back to working."* Magnus becomes a regular shop visitor — and drops off a mysterious key that opens **the Attic** (the post-game).

### Story delivery rules
- **Short scenes:** 15–45 seconds; every one skippable after first viewing.
- **Visual first:** Every story beat works with sound off and no reading.
- **Spoken, warm dialogue:** Characters speak in short, simple, fully voiced lines (localised). Kip speaks only in beeps, whirs and chimes.
- **Customers are the stars:** Each repair opens and closes with the owner — why it matters to them, and their joy when it's back.

---

## 5. Characters

### Kip — the hero
- **Look:** A thumb-sized automaton with a round, polished brass body like a pocket-watch case; a big, oversized winding key on its back; two round glass-lens eyes with little shutter-eyelids that blink; springy legs; mitten-like magnetic hands; and a tiny antenna topped with a glowing bulb that changes brightness with Kip's mood.
- **Personality:** Earnest, eager, endlessly curious. Kip *loves* how things work. Kip pats a fixed machine like a pet. Kip gets the giggles (rapid little ticks) when something goes boing.
- **Signature animations:** "Proud Polish" (Kip buffs its chest after a fix); "Wind-Up Wiggle" (a happy spin that winds its own key); "Peek" (Kip pushes its lens-eyes forward like binoculars); "Tick-Tock Nap" (idle: Kip sits, and its key slowly turns as it snores in ticks).
- **Voice:** Beeps, whirs, chimes and the occasional musical "bloop" — warm and expressive.

### Nana Odette — the maker
A kind, funny, slightly forgetful old clockmaker with silver hair piled in a bun stuck through with pencils, magnifying spectacles that make her eyes huge, and a cardigan full of tiny tools. Her hands shake a little now, which is why she needs Kip. She narrates the hints in Little Tinker mode, delivers jobs, and celebrates every repair with genuine delight. Her story — a lifelong fixer passing her craft on — is the emotional heart of the game.

### Tess — the sister (Player 2)
Built by Nana in Act II as Kip's companion. Copper-colored where Kip is brass, with a heart-shaped winding key, a little skirt-like gear rim, and a periscope antenna. Tess is bolder and bouncier than Kip, and does everything with a flourish. Tess is the default Player 2 character, but is also present in single-player as an occasional helper.

### Whisker — the shop mouse
A plump, friendly mouse who lives behind the parts drawers. Whisker is Kip's ride around the shop hub (Kip sits on Whisker's head and steers by holding its ears). Whisker carries big objects to the workbench and is the game's comic relief — easily startled, always hungry for crumbs.

### Pudding — the shop cat
An enormous, sleepy ginger cat who is, from Kip's point of view, a soft orange mountain. Pudding is always asleep somewhere different in the shop. Kip can climb Pudding (who purrs, rumbling the whole screen). Pudding is the game's gentlest secret-keeper — certain collectibles are hidden in Pudding's fur.

### Magnus — the magpie
A glossy black-and-white magpie with an iridescent blue shimmer, a monocle he stole from the optician, and a flair for drama. Magnus steals shiny parts, monologues about his own magnificence, and flees with a flurry of feathers whenever Kip catches him. He's never scary — he's a *show-off who's secretly lonely*. Over the game, kids see him gradually soften. He becomes a friend.

### The customers
Each Great Repair belongs to a townsperson (full roster in Appendix D). They're diverse in age, background and personality, and they're the faces of "Fixing Is Caring."

### The "residents" inside objects
Every object has small inhabitants that live inside it: the **cuckoo bird** Coo in the clock, the **dancing fox** Clementine in the music box, **the conductor mice** in the train set, **the Hum-bugs** (tiny glowing beetles) in the radio. They're friendly, they react to Kip's repairs, and some give hints by pointing or pantomiming.

---

## 6. The Core Loop: A Repair, Start to Finish

```
 ┌───────────┐   ┌───────────┐   ┌────────────┐   ┌───────────┐   ┌────────────┐   ┌───────────┐
 │ 1. THE    │──►│ 2. SHRINK │──►│ 3. PEEK &  │──►│ 4. FIX    │──►│ 5. TEST    │──►│ 6. THE    │
 │   DOORBELL│   │   & ENTER │   │  DIAGNOSE  │   │ Find, drag│   │   RUN      │   │  RETURN   │
 │ Customer  │   │ Through a │   │ What's     │   │ & snap the│   │ Everything │   │ Owner's   │
 │ & story   │   │ keyhole,  │   │ broken?    │   │ parts;    │   │ springs to │   │ joy; tips,│
 │           │   │ vent, gap │   │            │   │ room by   │   │ life — the │   │ gifts &   │
 │           │   │           │   │            │   │ room      │   │ big reveal │   │ rewards   │
 └───────────┘   └───────────┘   └────────────┘   └───────────┘   └────────────┘   └─────┬─────┘
       ▲                                                                                 │
       └──────────────────── Shop grows · Kip upgrades · New customers arrive ◄──────────┘
```

### 6.1 The Doorbell (≈30 seconds)
The shop bell jingles. A customer comes in carrying a broken object and tells Nana (and Kip) what's wrong in a short, warm scene: *"My music box was my grandmother's. It hasn't played since she... well, since a long time. Can you help?"* The object is placed on the workbench — huge from Kip's perspective.

### 6.2 Shrink & Enter (≈15 seconds)
Kip walks up to the object and finds a way in: a keyhole, an air vent, a gap under a lid, a battery hatch, the cuckoo's door. A satisfying "squeeze-pop" transition takes the camera inside.

### 6.3 Peek & Diagnose (seconds to minutes)
Inside, Kip looks around. The Peek Lens (Section 10) shows how power *should* flow and where it stops. Broken or missing things wobble and sparkle.

### 6.4 Fix (the bulk of play)
Each Great Repair is split into **5–6 rooms** (sections of the machine), each a self-contained puzzle space of 3–8 minutes. Kip finds parts, carries or beams them into place, oils rusty joints, turns valves, rewires circuits and pulls levers. Fixing one room sends power on to the next, visibly lighting up the path.

### 6.5 Test Run (≈30–60 seconds — the big payoff)
When the final room is fixed, the camera pulls back through the *whole* machine in one continuous, glorious shot as every gear, wire and pipe the player has repaired springs into motion together. This is the **"Big Fix" moment** — the game's signature spectacle. Then the camera pops out, and the object works in the shop: the cuckoo sings, the music box plays, the radio crackles to life.

### 6.6 The Return (≈30 seconds)
The customer returns. Their reaction is the emotional reward: the baker hugging his clock, the little girl dancing to her music box, the lighthouse keeper weeping happily at the radio. The customer leaves a **Thank-You Token** (a unique gift for Kip or the shop) and sometimes returns a favor later in the story.

### 6.7 Back in the Shop
New rewards are unlocked: customisation items, tools, new Quick Fixes, new customers. The repaired object goes on the **Display Shelf**, where it can be re-entered at any time as a **Playground** — a version of the object that now works and can be played inside freely — and as a **Tune-Up** challenge (Section 20).

---

## 7. Kip: Movement, Tools & Abilities

### 7.1 Movement
Kip explores 3D cutaway "diorama" rooms inside each object (see Section 24.4 on camera).

| Move | Description |
|---|---|
| **Walk / Trot** | Kip's springy legs give a bouncy little trot. Speed scales with stick tilt (or the distance of the touch point). |
| **Hop** | A small spring-hop. Can climb onto anything about Kip's own height. |
| **Climb** | Kip auto-climbs ladders, chains, rungs and gear teeth (gear teeth make great ladders — when a gear is turning, Kip rides it like a Ferris wheel). |
| **Ride** | Kip can ride moving parts: gears, belts, pistons, train cars, swinging pendulums. |
| **Slide** | Down banisters, wires and copper rails, with a delightful zizz of sparks. |
| **Wind-Up Dash** | Optional speed boost: wind up Kip's key at **Wind-Up Posts** for a sprint and a happy chime (a reward, never a requirement — see 7.3). |

### 7.2 Tools (unlocked over the story)

| Tool | Unlocked | What it does | Feel |
|---|---|---|---|
| **Magnet Mitts** | Start | Grab and carry metal parts. Small parts are carried in hands; big parts are dragged. | Heavy, satisfying weight; parts clink |
| **Magnet Beam** | Repair 1 | Lift and move parts at a distance with a glowing beam (the core "drag-and-drop" tool; on touch screens, your finger drives the beam) | Floaty, magical, precise |
| **Oil Can** | Repair 1 | Squirt oil on rusty, squeaky or stuck parts so they move freely | A rising squeak becomes a smooth purr — deeply satisfying |
| **Peek Lens** | Repair 1 | X-ray view showing how power flows (Section 10) | Kip's eyes zoom forward like binoculars |
| **Spring Boots** | Repair 2 | Higher hops; bounce on springs | Boing! |
| **Grapple Spring** | Repair 3 | Shoot a coiled spring to grab and pull a lever or swing across a gap | Zing-thwip |
| **Wire Spool** | Repair 4 | Lay down copper wire from point to point to complete circuits | Wire unspools with a crackle; sparks when connected |
| **Valve Wrench** | Repair 5 | Turn big valves and tighten pipe joints | Heavy, ratcheting clicks |
| **Punch Pencil** | Repair 6 | Punch holes in cards to program machines (simple coding) | Satisfying "chk" per hole |
| **Prism Lamp** | Repair 7 | Shine and redirect light beams | Soft hum and glow |
| **Tuning Fork** | Post-game | Set resonant frequencies; make parts vibrate in sympathy | Pure ringing tone |

### 7.3 The Winding Key — a reward, not a timer
Kip is a wind-up automaton, so winding is part of its charm. We deliberately **avoid** making winding a stressful stamina meter.
- **Little Tinker & Fixer modes:** Kip never runs down. Winding at Wind-Up Posts just gives a "Fully Wound!" sparkle, a speed boost, and a happy dance.
- **Engineer mode (optional setting "Real Clockwork," off by default):** Kip slowly unwinds; when unwound, Kip just walks a bit slower and makes a sleepy tick-tock sound until wound again. Never stops, never fails. This exists purely as flavour and a light routing consideration for Tune-Up challenges.

---

## 8. The Parts Toybox: Every Mechanical System

Pocket Mechanic is built from **ten mechanical "families."** Each family is introduced in its own Great Repair, then reused and combined. Every family has a Little Tinker version (one step, obvious) and an Engineer version (real reasoning).

### 8.1 ⚙️ Gears & Shafts
**The heart of the game.**
- **Parts:** Spur gears (small/medium/large with visible teeth counts), pinions, crown gears (turn power 90°), worm gears (slow and strong), shafts, pegs, axles, gear trains.
- **Behaviors:** Meshed gears turn in opposite directions; bigger gears turn slower; a gear with no mesh spins freely; three gears meshed in a closed triangle **jam** (and grumble comically).
- **Tinker:** Snap the glowing gear onto the glowing peg.
- **Fixer:** Choose the right-sized gear to bridge a gap; fix the direction a part turns by adding an "idler" gear.
- **Engineer:** Achieve precise **gear ratios** (e.g., 12:1 for clock hands), compound gear trains, speed-vs-strength trade-offs (big loads need slow, strong gearing to lift).

### 8.2 🔩 Levers, Pulleys & Simple Machines
- **Parts:** Levers, seesaws, pulleys, ropes, counterweights, ramps, wedges, screws, winches.
- **Behaviors:** Moving the fulcrum changes effort and range; pulleys make heavy things light; counterweights balance loads.
- **Tinker:** Pull the big lever; something wonderful happens.
- **Fixer:** Move a fulcrum so Kip's tiny weight can lift a big part.
- **Engineer:** Balance multi-weight scales; build block-and-tackle pulley systems to lift the heaviest parts with the least force.
- *(These map to the classic six simple machines — lever, wheel & axle, pulley, inclined plane, wedge and screw — all of which appear in the game and in the Part-o-pedia.)*

### 8.3 🌀 Springs, Ratchets & Escapements
- **Parts:** Mainsprings, coil springs, ratchets & pawls, escapement wheels, flywheels, governors.
- **Behaviors:** Springs store energy when wound and release it; ratchets allow turning one way only; escapements release energy in steady ticks.
- **Tinker:** Wind the big spring with a crank — ticka-ticka-ticka — and let go!
- **Fixer:** Fix a ratchet pawl so a winding mechanism stops slipping.
- **Engineer:** Tune an escapement and governor so a mechanism runs at the correct steady speed.

### 8.4 🕰 Pendulums & Timing
- **Parts:** Pendulums with sliding bobs, swinging hammers, metronomes, cams, timing belts.
- **Behaviors:** A longer pendulum swings slower (true to real physics: period depends on length, not on weight). Timing determines when hammers strike, doors open, platforms align.
- **Tinker:** Give the pendulum a push; it swings; the clock ticks.
- **Fixer:** Slide the bob to make a swinging platform reach a ledge.
- **Engineer:** Synchronise two pendulums so hammers strike in rhythm; match a pendulum to a beat so a clock keeps perfect time.

### 8.5 🎵 Pins, Cams & Music Mechanisms
- **Parts:** Pinned music cylinders, steel combs (tuned teeth), cams (shaped wheels that push followers up and down), cranks, bellows.
- **Behaviors:** Each pin plucks a comb tooth (a note); cams turn rotation into up-and-down motion (dancers, pistons, hammers).
- **Tinker:** Push pins into glowing holes; the song plays.
- **Fixer:** Restore a melody by matching the pins to a song the music box hums.
- **Engineer:** **Compose** — place pins freely to write your own tunes (which become music box songs you keep); shape cams to make a dancer perform a specific dance.

### 8.6 🚂 Tracks, Switches & Routing
- **Parts:** Track pieces (straight, curve, bridge, loop), switch points, signals, turntables, cargo cars, couplings.
- **Behaviors:** Switch points send trains left or right; signals stop and start; cargo must reach destinations.
- **Tinker:** Drop the missing track piece into the glowing gap; the train chugs through.
- **Fixer:** Flip switch points so the train visits stations in order.
- **Engineer:** Route multiple trains on shared track without collisions (they gently bump and "beep beep"), delivering cargo efficiently.

### 8.7 ⚡ Wires & Circuits
- **Parts:** Batteries ("Spark Cells"), copper wires, switches, bulbs, bells, motors, fuses ("Snap Links"), dials, glowing tubes, buzzers.
- **Behaviors:** Electricity flows only in a **complete loop** from the battery and back. Breaks stop everything after them. Switches open and close loops. Power is visualised as bright sparks traveling along wires.
- **Tinker:** Plug the cable into the glowing socket; the whole room lights up with a shower of sparks.
- **Fixer:** Route wire around obstacles to complete a loop; replace a blown Snap Link.
- **Engineer:** Series vs. parallel (one dim bulb vs. two bright bulbs; break one, and both or only one goes out); tune a radio by matching a waveform dial.

### 8.8 💧 Pipes, Valves & Steam
- **Parts:** Pipes (straight, elbow, T-junction), valves, pumps, tanks, pressure gauges, boilers, pistons, whistles, sprinklers.
- **Behaviors:** Water flows downhill and through open valves; heated water becomes steam; steam pressure pushes pistons and blows whistles; too much pressure safely vents through a comic "pfffft" relief valve (never explodes).
- **Tinker:** Turn the big wheel valve; water whooshes; the waterwheel spins.
- **Fixer:** Connect pipes to route water to the right tank; close valves to send it elsewhere.
- **Engineer:** Balance pressure across multiple outputs to play a chord on steam whistles; time valve openings to drive a piston sequence.

### 8.9 🔀 Logic & Programming
- **Parts:** Logic gates (as friendly physical mechanisms — see Appendix C), punch cards, sequencers, sensors (pressure plates, light sensors), memory latches.
- **Gates:**
  - **"Both" Gate (AND):** A door with two keyholes — opens only when both inputs are on.
  - **"Either" Gate (OR):** A Y-shaped chute — a marble from either side gets through.
  - **"Flip" Gate (NOT):** A seesaw — when the input goes down, the output goes up.
  - **"Remember" Latch:** A ratchet that stays clicked until reset.
- **Tinker:** Press the big buttons; things light up; the robot dances.
- **Fixer:** Work out which two levers must be on to open the "Both" door.
- **Engineer:** Build gate chains; **program Big Bertie's dance** by punching sequences into cards (a gentle introduction to coding: sequence, repetition with loops, and simple conditions).

### 8.10 🔦 Light, Lenses & Mirrors
- **Parts:** Lamps, mirrors, lenses, prisms, colored glass, shutters, light sensors.
- **Behaviors:** Light travels in straight lines, reflects off mirrors at matching angles, bends through lenses, splits into colors through prisms; light sensors trigger mechanisms.
- **Tinker:** Turn the lamp on; the room glows; a sleeping mechanism wakes.
- **Fixer:** Rotate mirrors to bounce a beam to a sensor.
- **Engineer:** Split light through a prism and filter colors to power multiple colored sensors in sequence.

### 8.11 Parts at a glance

| Family | Introduced in | Core concept | Signature sound |
|---|---|---|---|
| Gears & Shafts | Cuckoo Clock | Turning transmits turning | Rich mechanical ticking cascade |
| Levers & Simple Machines | Cuckoo Clock | Small force, big lift | Wooden creak + heavy thunk |
| Springs & Escapements | Cuckoo Clock / Music Box | Stored energy, steady release | Ratchet clicks, spring "sproing" |
| Pendulums & Timing | Cuckoo Clock / Clock Tower | Swinging keeps time | Deep tock |
| Pins, Cams & Music | Music Box | Rotation becomes music & motion | Plucked comb notes |
| Tracks & Routing | Toy Train | Choices route movement | Chugga-chugga, whistle |
| Wires & Circuits | Retro Radio | Electricity needs a loop | Crackle, hum, spark |
| Pipes & Steam | Grand Tea Machine | Pressure pushes | Whoosh, hiss, whistle |
| Logic & Programming | Big Bertie | Rules and sequences | Clacky relays, punch "chk" |
| Light & Lenses | Star Orrery | Light travels and bends | Soft glassy hum |

---

## 9. Snap Physics & the "Busy Board" Feel

### 9.1 Snap Physics
Every part has **sockets** (where it can attach) and every slot has a **type** (peg, axle, track joint, wire terminal, pipe flange...). When a part is dragged near a compatible slot:
1. A soft **"ghost preview"** appears showing exactly where it will land.
2. Within the **snap radius**, the part is magnetically pulled into position.
3. On release (or immediately, in Little Tinker mode), it locks in with a **CLUNK**, a burst of sparkles, a camera micro-bump and a haptic thud.

| Setting | Little Tinker | Fixer | Engineer |
|---|---|---|---|
| Snap radius | Very large (forgiving) | Medium | Small |
| Auto-rotate to fit | Yes | Yes | No — the player must orient parts (e.g., which way a crown gear faces) |
| Ghost outlines of missing parts | Always visible | Appear after 30s or via Peek Lens | Only via Peek Lens "Blueprint" view |
| Wrong-part feedback | Part gently refuses with a "nuh-uh" wiggle and floats back | Same, plus Kip shrugs | Part fits but the machine behaves wrongly (e.g., too fast) — the player must reason about why |

### 9.2 The Busy Board principle
Every room is packed with **"Fiddle Toys"** — interactive elements that aren't required for the puzzle but are simply fun to touch:
- Switches that click and make a light blink
- Little bells that ding
- Cranks that spin a whirligig
- Buttons that make a tiny resident (a Hum-bug, a conductor mouse) do a dance
- Springs that boing when bopped
- Gauges with needles that wobble when tapped

**Rule:** At least **5 Fiddle Toys per room**. For Little Tinkers, these are as valuable as the puzzle itself — and they teach the vocabulary of the machine before the puzzle needs it.

### 9.3 Juice: the feedback checklist
Every successful action must deliver at least **four** of these, within 100ms:
- 🔊 A crisp, real, recorded mechanical sound (Section 23)
- ✨ Particles (sparkles, sparks, oil drops, steam puffs)
- 🎥 Camera response (micro-bump, slight zoom)
- 📳 Haptic pulse matched to the material (brass = sharp, wood = soft, rubber = bouncy)
- 💡 Light change (bulbs flicker on, glows bloom)
- 🎶 A musical sting in the room's key
- 🤖 A reaction from Kip (thumbs-up, proud polish, a happy chirp)
- 🐭 A reaction from a resident (a mouse cheers, the cuckoo peeks out)

### 9.4 Power you can see
When a mechanism runs, **glowing energy flows visibly through it**:
- Along shafts as spinning light rings
- Across gear teeth as flickering golden sparks
- Down wires as racing blue-white sparks
- Through pipes as visible water or puffs of steam (glass pipe sections everywhere)
- Through logic gates as glowing marbles rolling through chutes

When energy hits a break, it **pools and pulses** right at the break point — a gentle, wordless "the problem is here!"

---

## 10. Diagnosis: The Peek Lens & Hint System

### 10.1 The Peek Lens
Kip's lens-eyes push forward like binoculars, and the world shifts to an **X-ray blueprint view**: walls go translucent, mechanisms show as glowing lines, and power flow is animated.

**What the Peek Lens shows:**
- **Power path:** Glowing flow from the power source to where it stops
- **Breaks:** Pulsing, wobbling markers at the point power stops (never red "error" symbols — a friendly sparkle-wobble)
- **Missing parts:** Ghost outlines (detail level depends on Play Style)
- **Rust & stuck joints:** Shown with little brown squiggles and a "squeak" icon
- **Hidden secrets:** Faint shimmer where Lost Treasures and Golden Gears hide behind panels (for those who look carefully)

### 10.2 Layered hints
Hints escalate gently and never solve the puzzle without the child doing the final action.

| Stuck for... | Little Tinker | Fixer | Engineer |
|---|---|---|---|
| 20 seconds | A resident points at the next part | — | — |
| 45 seconds | The part pulses and hums | A resident points | — |
| 90 seconds | Nana's voice gives a spoken nudge ("Hmm, I wonder where that big gear goes...") | The part pulses | Hint available on request |
| 2+ minutes | The ghost outline glows brightly and a dotted path shows the way | Nana's spoken nudge | On request: a three-tier hint card (nudge → strong clue → show me) |

**The hint button (Engineer):** A little "?" lightbulb. It always offers the *gentlest* clue first. Using hints never reduces rewards (except Tune-Up medal criteria, which are optional).

---

## 11. No-Fail Design

### 11.1 Nothing breaks, nobody falls
- **Falling:** If Kip falls off a high gear, a soft spring at the bottom bounces Kip back up with a "boing!" (or a resident catches Kip). Back in control within 3 seconds.
- **Getting caught in machinery:** Kip is never crushed. If Kip is in the path of a moving part, Kip simply rides it, gets gently nudged aside, or spins with it giggling.
- **Wrong parts:** Never break. The part either refuses to fit (wiggle-float back) or fits and does something *funny-wrong* (the cuckoo comes out backwards, the train runs in reverse, the radio plays a goat bleating). These "funny fails" are deliberately delightful — kids will often try wrong parts on purpose just to see what happens, which is wonderful exploration.
- **Jams:** Mechanisms that jam grumble, shake and puff a little dust, then the last part placed gently pops out. No permanent consequences.
- **Running out of parts:** Impossible. Parts that roll off the edge reappear in the room's **Parts Tray** (a little drawer that slides out).

### 11.2 Undo
A **Rewind Crank** (a little crank icon) undoes the last action with a satisfying reverse-whir animation. Unlimited. In Engineer Tune-Ups, a full **Reset Room** option resets to the room's start.

### 11.3 Challenge without failure
For Engineers, challenge comes from optional criteria: **Fewest Parts**, **Speed Fix**, **Exact Ratio**, **Chain Reaction score**, **No Hints**, and the very hard **Attic** objects. Getting any medal is a celebration; missing one is just an invitation to try again.

---

## 12. Controls & Play Styles

### 12.1 Choosing a Play Style
Players pick a **tool** — no ages, no "easy/hard" labels:

| Play Style | Tool icon | Spoken line | Key differences |
|---|---|---|---|
| **🪛 Little Tinker** | Chunky screwdriver | *"Click, clunk, and make it go!"* | Direct touch, auto-movement to parts, huge snap zones, auto-rotate, ghost outlines always on, one-step fixes on the main path, frequent friendly hints |
| **🔧 Fixer** | Wrench | *"Find the problem and fix it!"* | Free movement, Peek Lens diagnosis, medium snap, 2–3 step repairs, Lost Treasures emphasised |
| **📐 Engineer** | Blueprint | *"Gears, gates and genius!"* | Orientation matters, no automatic outlines, ratio readouts and tooth counts, logic and timing puzzles, Tune-Up medals visible, hints on request |

Players can switch styles at any time from the pause menu. **Quick Swap** lets a sibling borrow the game with their own style in one button press.

### 12.2 Touch controls (lead platform: tablets)
Pocket Mechanic is designed **touch-first**, because direct manipulation is the most natural interaction for young children.
- **Tap a spot:** Kip trots there.
- **Tap a part:** Kip grabs it with the Magnet Beam.
- **Drag a part:** The beam carries it along your finger; release near a slot to snap.
- **Twist gesture / circular swipe:** Turn cranks, valves and dials (you literally turn them with your finger — a key "busy board" moment). Little Tinkers can also just tap-and-hold to auto-turn.
- **Two-finger pinch:** Zoom in/out of the room.
- **Two-finger swipe:** Rotate the diorama camera in 90° steps.
- **Tap Kip:** Kip does a cute reaction (and activates the Peek Lens in Fixer/Engineer modes).
- Minimum touch target: 15mm. Generous "fat-finger" tolerance on all interactions.

### 12.3 Controller
- **Left stick:** Move Kip
- **A:** Hop / interact
- **B:** Grab / drop (Magnet Mitts)
- **Right stick:** Aim the Magnet Beam cursor (with soft auto-targeting to nearby parts and slots)
- **Hold R:** Beam lift; release to place
- **Rotate with right stick while holding a part** (Engineer orientation)
- **Y:** Peek Lens
- **X:** Use current tool (oil, wrench, wire, punch)
- **L / ZL:** Rotate camera
- **D-pad:** Quick tool select
- **Rumble:** Material-specific haptics; on Switch 2, Joy-Con mouse mode offers PC-style pointing

### 12.4 Mouse & keyboard (PC/Mac)
Click-to-move, click-and-drag parts, scroll-to-turn cranks, keyboard shortcuts for tools. Ideal for Engineers in the Invention Bench.

### 12.5 Accessibility controls
Full remapping, one-switch scanning mode, hold-to-toggle, adjustable drag sensitivity, dwell-clicking for pointer users (see Section 25).

---

## 13. Game Structure: The Shop, the Town & the Objects

### 13.1 The shop as hub
Odette's Tick & Tinker is explored at Kip's scale, riding on Whisker the mouse. It **grows over the game**:

| Area | What's there | Unlocks |
|---|---|---|
| **The Workbench** | Where objects are placed for repair; the start of every job | Start |
| **The Front Counter & Doorbell** | Customers arrive here; the Job Board shows pending repairs | Start |
| **The Display Shelf** | Every repaired object, re-enterable as Playground and Tune-Up | After Repair 1 |
| **The Parts Drawers** | The Part-o-pedia: every part collected, with "How It Really Works" explainers | After Repair 1 |
| **Kip's Nook** | Kip's home (starts as a matchbox bed; upgrades to a tin-can cottage, then a tiny clockwork house) — decoratable | After Repair 1 |
| **The Paint & Polish Station** | Kip's customisation (Section 18) | After Repair 2 |
| **The Window Seat** | Looks out over Brasswick; the town map; watch fixed objects working around town | After Repair 3 |
| **The Invention Bench** | Sandbox & creator (Section 22) | After Repair 4 |
| **Tess's Corner** | Tess's own nook (co-op character customisation) | After Repair 5 |
| **The Attic** | Post-game challenge objects | After credits |

### 13.2 Brasswick on the map
From the Window Seat, the player sees the town. As repairs are completed, **fixed objects visibly work around town**: smoke rises from the bakery (cuckoo clock fixed), music drifts from a window (music box), the toy train circles a shop display, the lighthouse beam turns (radio), steam curls from the café (tea machine), Big Bertie dances at the fairground. **The town's restoration is the progress bar.**

### 13.3 Progression
- **Repairs 1 → 2 → 3** are linear (teaching gears, music mechanisms, routing).
- **Repairs 4, 5, 6** can be done in any order (circuits, steam, logic).
- **Repair 7** opens after 4–6. **Repair 8** (the Clock Tower) opens after 7.
- **Quick Fixes** unlock in sets of three alongside each Great Repair; they're optional but satisfying, and the best place for very young players to play repeatedly.
- **Gating:** New Great Repairs require a modest number of **Golden Gears**, always **≤70%** of those available on main paths — secrets are rewards, never requirements.

### 13.4 Anatomy of a Great Repair
| Component | Count | Description |
|---|---|---|
| **Rooms** | 5–6 | Sections of the machine, each a self-contained puzzle space (3–8 min) |
| **Big Fix** | 1 | The finale: a chain-reaction set piece and the full-machine test run |
| **Golden Gears** | 3 per room | ① for fixing the room, ② for a hidden spot, ③ for a clever optional objective |
| **Lost Treasures** | 1–2 per repair | Personal items the owner lost inside the object, returned for an extra story beat |
| **Magnus Marks** | 1 per repair (Act I–II) | Clues — a feather, a peck mark — that Magnus was here |
| **Fiddle Toys** | 5+ per room | Non-puzzle interactive toys |
| **Shiny Bits** | Many | The currency (screws, washers, springs) for cosmetics |

---

## 14. The Eight Great Repairs — Full Breakdown

---

### ⏰ REPAIR 1 — MR. FINCH'S CUCKOO CLOCK
**"Wake up, Brasswick!"**

| | |
|---|---|
| **Owner** | **Albert Finch**, the town baker — round, floury, gentle, always humming |
| **Why it matters** | His cuckoo clock wakes him at 4 a.m. to bake the town's bread. It stopped, he overslept, and Brasswick has no breakfast! |
| **Systems taught** | Gears & shafts, levers, weights, pendulum basics, oiling |
| **Tools gained** | Magnet Beam, Oil Can, Peek Lens |
| **Resident** | **Coo**, the wooden cuckoo bird — dramatic, squawky, desperate to do his job |
| **Inside look** | A towering, carved-wood cathedral of brass gears, chains and weights, lit by sunbeams through the clock-face numbers |
| **Lost Treasure** | Albert's late wife's recipe card, which slipped behind the clock face years ago |

**Rooms:**
| # | Room | Puzzle focus | Big moment |
|---|---|---|---|
| 1.1 | **The Weight Well** | Pulling chains to raise the clock weights; first lever | The weights rise like elevators — Kip rides one up |
| 1.2 | **The Gear Gallery** | Placing the first missing gear | The first CLUNK — a whole wall of gears clatters to life |
| 1.3 | **The Rusty Stair** | Oiling stuck gears so they turn | Squeaky gears become a smooth spinning staircase |
| 1.4 | **The Pendulum Hall** | Pushing the pendulum; sliding its bob | The pendulum swings and the whole clock starts to tick |
| 1.5 | **The Hands Room** | Connecting the gear train to the clock hands | From behind the clock face, Kip watches the huge hands sweep around |
| 1.6 | **Coo's Loft** | Repairing the cuckoo's bellows and door lever | Coo bursts out of his door for the first time in weeks |
| **Big Fix** | **"Four O'Clock!"** | Setting a chain reaction so the hour strike triggers Coo | Full-machine reveal; at 4:00, Coo sings, and down the street the bakery lights come on |

**The Return:** Albert's flour-dusted hug for the clock; the whole town lines up for warm bread. If the Lost Treasure was found, Albert reads the recipe card, smiles teary-eyed, and bakes "Martha's Honey Buns" — which appear on the town map forever.

---

### 🎶 REPAIR 2 — ROSA'S MUSIC BOX
**"A song that remembers."**

| | |
|---|---|
| **Owner** | **Rosa Delgado**, age 7 — bright, chatty, missing a front tooth |
| **Why it matters** | The music box was her abuela's. It plays the lullaby her abuela used to sing. It's been silent for a year. |
| **Systems taught** | Springs & winding, pinned cylinders & combs, cams, flywheel governors |
| **Tools gained** | Spring Boots |
| **Resident** | **Clementine**, a tiny dancing fox figurine who spins on the lid |
| **Inside look** | A velvet-lined jewelry garden: a giant silver cylinder covered in pins like a field of shining flowers, a comb of steel teeth like organ pipes |
| **Lost Treasure** | A tiny photograph of Rosa and her abuela, tucked under the velvet |

**Rooms:**
| # | Room | Puzzle focus | Big moment |
|---|---|---|---|
| 2.1 | **The Velvet Drawer** | Exploring, finding the winding crank | Kip bounces on velvet cushions (Spring Boots tutorial) |
| 2.2 | **The Mainspring Vault** | Winding the mainspring with a crank and fixing the ratchet pawl | The spring tightens with rising clicks — then holds |
| 2.3 | **The Pin Garden** | Replacing missing pins on the cylinder | Each pin placed plays its note; the melody appears gradually |
| 2.4 | **The Comb Organ** | Straightening bent comb teeth (tuning) | Each tooth rings truer as it's straightened |
| 2.5 | **The Governor's Fan** | Fixing the spinning air-brake that keeps the tune steady | The wild, too-fast song slows to a gentle lullaby |
| 2.6 | **Clementine's Stage** | Cams for the dancing fox | Clementine dances again, spinning and bowing |
| **Big Fix** | **"Abuela's Lullaby"** | Everything together | The lid opens, Clementine dances, and the lullaby plays in full |

**Engineer extra — "Compose Your Own":** After the repair, the Pin Garden becomes a **composition tool**: players place pins freely to write their own melodies, which can be saved as music box songs and played in Kip's Nook. (A beloved creative feature with real musical learning: rhythm, pitch, repetition.)

**The Return:** Rosa winds the box, hears the lullaby, and sings along. She gives Kip a tiny friendship bracelet (a cosmetic).

---

### 🚂 REPAIR 3 — THE TWINS' BIRTHDAY TRAIN
**"All aboard!"**

| | |
|---|---|
| **Owners** | **Theo & Ada Okafor**, 5-year-old twins (Theo loves trains; Ada loves being in charge of Theo) |
| **Why it matters** | Their toy train set is meant to deliver party favors around the table at their birthday party — tomorrow! |
| **Systems taught** | Tracks, switch points, signals, routing, wind-up locomotive mechanics |
| **Tools gained** | Grapple Spring |
| **Residents** | **The Conductor Mice** (three tiny mice in conductor hats) |
| **Inside look** | Not *inside* one object, but inside a whole **miniature world**: Kip shrinks into the train set's landscape — tunnels, bridges, a tiny village, a papier-mâché mountain |
| **Lost Treasure** | Ada's missing baby tooth (she'd hidden it in the train's coal car for safekeeping and forgot) |

**Rooms:**
| # | Room | Puzzle focus | Big moment |
|---|---|---|---|
| 3.1 | **Toy Town Station** | Replacing missing track pieces | The train chugs its first loop |
| 3.2 | **Switchback Mountain** | Switch points: sending the train left or right | The train spirals up the mountain |
| 3.3 | **The Tunnel of Gears** | The locomotive's wind-up motor (inside the engine itself) | The engine's pistons pump; steam puffs (cotton!) |
| 3.4 | **Signal Junction** | Signals & two trains on shared track | Two trains pass each other perfectly |
| 3.5 | **The Wobbly Bridge** | Grapple Spring to fix bridge supports | The train crosses a bridge as it rebuilds itself behind Kip |
| 3.6 | **The Party Express** | Routing cargo: party favors to every seat | Each car unloads favors at the right station |
| **Big Fix** | **"Happy Birthday Line"** | A full routing chain-reaction | The train delivers a favor to every guest's place; candles light along the track |

**The Return:** A birthday party scene where the train circles the table, the twins cheer, and Kip gets a slice of cake (a cosmetic hat: a tiny party hat).

**Act I closer:** That night, Kip finds a single glossy feather inside the coal car. Something has been stealing shiny parts...

---

### 📻 REPAIR 4 — CAPTAIN MARIGOLD'S RADIO
**"Calling all boats!"**

| | |
|---|---|
| **Owner** | **Captain Marigold Pike**, the retired lighthouse keeper — gruff, kind, with a parrot-less shoulder she keeps meaning to fill |
| **Why it matters** | She uses her old valve radio to relay weather reports to the fishing boats. A storm is coming, and the radio is dead. |
| **Systems taught** | Circuits, complete loops, switches, bulbs, glowing tubes, tuning |
| **Tools gained** | Wire Spool |
| **Residents** | **The Hum-bugs** — tiny glowing beetles who live in the warm tubes and hum in harmony |
| **Inside look** | A glowing art-deco city: vacuum tubes like glass towers, copper wires like highways, dials like giant clock faces, the speaker like a vast drum |
| **Lost Treasure** | Her old captain's medal, fallen behind the speaker grille |

**Rooms:**
| # | Room | Puzzle focus | Big moment |
|---|---|---|---|
| 4.1 | **The Power Plug** | Plugging in the main cable | The first room lights up with a shower of sparks |
| 4.2 | **Copper Crossroads** | Laying wire to complete loops | Sparks race around a completed loop for the first time |
| 4.3 | **The Tube Towers** | Replacing a cracked tube; switches | The Hum-bugs return and hum in chords |
| 4.4 | **The Fuse Box** | Replacing blown Snap Links; series vs. parallel bulbs | A dark maze lit room by room |
| 4.5 | **The Dial Observatory** | Tuning: match the wave on the dial to find a station | Static clears into a crackly voice: "...this is Brasswick Harbor..." |
| 4.6 | **The Great Speaker** | Reattaching the speaker cone's wire | The speaker booms — Kip is blown back, giggling |
| **Big Fix** | **"Storm Warning"** | A full power-through, all circuits on | The radio crackles, Captain Marigold's voice warns the boats, and on the map the fishing boats turn safely for harbor |

**The Return:** The storm passes; the boats are safe. The fishermen visit the shop to thank Kip. Captain Marigold decides Kip deserves a medal of its own — a tiny brass plate engraved "First Mate" (cosmetic).

**Story beat:** Kip catches Magnus mid-theft inside the radio, holding a shiny tube in his beak. Magnus monologues ("I am Magnus the Magnificent, collector of the exquisite!") and flaps off. The chase is on.

---

### ☕ REPAIR 5 — THE GRAND TEA MACHINE
**"Full steam ahead!"**

| | |
|---|---|
| **Owner** | **Mrs. Pepperwhistle**, owner of the Teapot Café — tall, theatrical, wears enormous hats |
| **Why it matters** | Her magnificent Victorian-style steam tea machine — all brass pipes, whistles and gauges — serves the whole town every afternoon. It's spluttering, hissing and serving cold tea. |
| **Systems taught** | Pipes, valves, pumps, pressure, boilers, steam pistons, whistles |
| **Tools gained** | Valve Wrench |
| **Resident** | **Sir Steamington**, a dignified clockwork butler figurine who pours the tea |
| **Inside look** | A gleaming steampunk palace: glass pipes with bubbling water, a giant copper boiler like a sun, pistons like towers, whistles like organ pipes |
| **Lost Treasure** | Mrs. Pepperwhistle's lucky hatpin, lost in the sugar dispenser |

**Rooms:**
| # | Room | Puzzle focus | Big moment |
|---|---|---|---|
| 5.1 | **The Water Tank** | Turning the big wheel valve | Water whooshes through glass pipes |
| 5.2 | **Pipe Maze** | Connecting pipe pieces to route water | Water fills a waterwheel that powers a lift |
| 5.3 | **The Boiler Heart** | Lighting the boiler, managing heat | The water turns to steam — clouds billow |
| 5.4 | **Piston Plaza** | Steam pressure and pistons | Pistons pump in sequence; Kip rides one like an elevator |
| 5.5 | **The Whistle Organ** | Balancing pressure across whistles | The whistles play a jaunty tune (a musical puzzle) |
| 5.6 | **Sir Steamington's Pantry** | The pouring mechanism: cams and timing | Sir Steamington bows and pours a perfect cup |
| **Big Fix** | **"Teatime!"** | A full steam-powered chain reaction | Cups line up on a conveyor; each is filled, sugared and stirred in a dance of steam |

**The Return:** The café reopens; the whole town comes for tea; Mrs. Pepperwhistle gives Kip a ridiculous tiny feathered hat (cosmetic).

**Story beat:** Nana, seeing how much Kip loves company, builds **Tess**. A wordless, heartwarming scene: Tess blinks awake and immediately hugs Kip. Co-op unlocks across the whole game.

---

### 🤖 REPAIR 6 — BIG BERTIE, THE FAIRGROUND ROBOT
**"Let's dance!"**

| | |
|---|---|
| **Owner** | **Professor Pockets**, the eccentric fairground showman (oversized coat, a hundred pockets, each with a surprise) |
| **Why it matters** | Big Bertie is the fairground's famous dancing robot, the star of the summer fair. Bertie has forgotten how to dance — his punch-card brain is scrambled and parts of his logic are missing. |
| **Systems taught** | Logic gates (Both/Either/Flip/Remember), sensors, sequences, punch-card programming |
| **Tools gained** | Punch Pencil |
| **Resident** | **Bertie's memory sprites** — little light-spirits that represent Bertie's lost dance moves |
| **Inside look** | A whirring, clacking, retro-futuristic control room: relays, marble-run logic chutes, card readers, lit-up buttons |
| **Lost Treasure** | Professor Pockets' original Bertie blueprint, rolled up inside Bertie's leg |

**Rooms:**
| # | Room | Puzzle focus | Big moment |
|---|---|---|---|
| 6.1 | **The Button Board** | A giant busy board of buttons and lights (pure Tinker joy) | Every button does something wonderful |
| 6.2 | **The "Both" Doors** | AND gates — two levers to open a door | Kip and a resident pull levers together |
| 6.3 | **Marble Logic Run** | OR and NOT gates as marble chutes and seesaws | A marble zigzags through gates to light up a sign |
| 6.4 | **The Remember Room** | Latches and memory | Bertie remembers his name — he says "BER-TIE!" happily |
| 6.5 | **The Card Reader** | Punch cards: sequences (step, step, spin, clap) | Bertie's arm moves for the first time |
| 6.6 | **The Dance Studio** | Loops & conditions on cards ("repeat 3 times," "if the music is fast, spin") | Bertie performs a short routine the player programmed |
| **Big Fix** | **"Bertie's Big Show"** | Program a full dance from collected moves | Bertie dances on the fairground stage to the player's choreography as the crowd cheers |

**Learning note:** This is the game's gentle introduction to **computational thinking**: sequencing, loops and conditionals, presented as dance moves — never as code syntax. Little Tinkers get a "Dance Party" version where they simply press colorful move buttons and Bertie performs them immediately.

**The Return:** The fair opens; Bertie dances; Professor Pockets pulls a tiny top hat from one of his hundred pockets for Kip.

**Story beat (Act II closer):** At noon, everyone waits — and **the Clock Tower bell doesn't ring.** Silence over Brasswick. The festival is in one week.

---

### 🔭 REPAIR 7 — MISS JUNIPER'S STAR ORRERY
**"The sky in a box."**

| | |
|---|---|
| **Owner** | **Miss Juniper Hale**, the town schoolteacher — gentle, stargazing, owns too many cardigans |
| **Why it matters** | The school's antique orrery (a clockwork model of the planets) projects the night sky onto the classroom ceiling. She promised her class a "night sky lesson" and it's jammed. It also holds a secret: an old map of the Clock Tower's insides, drawn by a young apprentice named *Odette*. |
| **Systems taught** | Light, mirrors, lenses, prisms; planetary (epicyclic) gears; counterweights |
| **Tools gained** | Prism Lamp |
| **Resident** | **Lumen**, a shy moth who lives in the projector lamp |
| **Inside look** | A cosmic brass world: planets on long arms sweeping overhead, a glowing lamp-sun in the center, lenses like crystal lakes |
| **Lost Treasure** | A child's drawing of a rocket, dated many years ago — signed "Juniper, age 8" |

**Rooms:**
| # | Room | Puzzle focus | Big moment |
|---|---|---|---|
| 7.1 | **The Sun Lamp** | Lighting the central lamp | The orrery's sun glows; shadows of planets sweep the walls |
| 7.2 | **Mirror Lane** | Rotating mirrors to bounce light to sensors | A light beam zig-zags across the room |
| 7.3 | **The Lens Lake** | Lenses: focusing and spreading light | A focused beam warms a frozen mechanism awake |
| 7.4 | **The Planet Arms** | Planetary gears: inner planets go round faster | Kip rides Mercury on a fast lap, then Saturn on a slow one |
| 7.5 | **The Prism Garden** | Splitting light into colors to power colored sensors | A rainbow floods the room |
| 7.6 | **The Star Projector** | Assembling the projector's star plate | Stars appear on the ceiling |
| **Big Fix** | **"The Night Sky Lesson"** | Everything aligned | In a darkened classroom, the planets turn and the ceiling fills with stars as the children gasp |

**The Return:** The children lie on the classroom floor watching the stars. Miss Juniper hands Nana the map she found — and Nana goes quiet, then smiles: *"I drew this when I was your age, Kip."*

---

### 🔔 REPAIR 8 — THE GREAT BRASSWICK CLOCK TOWER
**"The heart of the town."**

| | |
|---|---|
| **Owner** | The whole town of Brasswick (and, secretly, Nana Odette) |
| **Why it matters** | The tower's noon bell starts the Tick-Tock Festival. It's silent. Magnus's nest is inside. |
| **Systems taught** | Everything — combined at enormous scale |
| **Residents** | **The Bell-ringers**: a family of pigeons; and **Magnus** |
| **Inside look** | A vertical cathedral of clockwork: house-sized gears, a pendulum like a swinging bridge, bell-hammers like giant arms, the four great clock faces glowing like stained glass, and at the top, Magnus's glittering, enormous, over-stuffed nest |

**Floors (rooms):**
| # | Floor | Puzzle focus | Helpers from earlier repairs |
|---|---|---|---|
| 8.1 | **The Foundation Weights** | Massive counterweights and pulleys | **Big Bertie** lifts the heaviest weights |
| 8.2 | **The Steam Lift** | Pipes and pistons power an elevator | **The Grand Tea Machine** sends steam up a hose through the window |
| 8.3 | **The Gear Cathedral** | Compound gear trains at massive scale | **The toy train** runs along the beams delivering replacement gears |
| 8.4 | **The Pendulum Bridge** | Timing across a swinging pendulum | **Coo the cuckoo** flies parts across gaps |
| 8.5 | **The Four Faces** | Light & alignment — synchronising four clock faces | **Miss Juniper's orrery lens** focuses light through the faces |
| 8.6 | **The Signal Room** | Circuits & logic coordinating the whole tower | **Captain Marigold's radio** relays messages between Kip and Tess |
| 8.7 | **Magnus's Nest** | The emotional climax: building Magnus a new nest | **Rosa's music box** song plays inside the new nest |
| **Big Fix** | **"Noon"** | The biggest chain reaction in the game | Every floor springs to life in one continuous camera ride from bottom to top; the great bell swings; **BONG** — the festival begins |

**The Magnus resolution:** Kip reaches the nest. Magnus is wedged in, tangled in shiny junk, too heavy to fly — and admits, finally, that he only took shiny things because he thought nobody would visit a plain old magpie. Kip doesn't scold. Using the Invention Bench interface (a guided version), the player **builds Magnus a new nest** from spare parts: a spinning, glittering, music-playing nest. (Every player's design is different — and it appears in the epilogue.) Magnus, moved, returns every stolen part.

**The Return (Epilogue):** The Tick-Tock Festival. Every customer, every resident, every fixed object, all together. Nana stands under her clock tower as it rings. The final line. Credits roll over a playable festival where Kip and Tess can ride the fairground rides.

---

## 15. Quick Fixes

Short, self-contained repairs (2–3 minutes) — perfect for very young players, short sessions and "one more" moments. **24 Quick Fixes** in total, unlocking in threes. Each has a single owner, a single mechanism and a single satisfying payoff.

| Quick Fix | Owner | Mechanism | Payoff |
|---|---|---|---|
| **Squeaky Door Hinge** | Mr. Finch | Oiling | The squeak becomes silent; the shop cat stops glaring |
| **The Wind-Up Mouse** | A toddler named Pip | Spring & gear | The mouse scurries in circles |
| **The Doorbell** | Nana's shop | Circuit | Ding-dong! |
| **The Bicycle Bell** | The postman, Mr. Ade | Lever & spring | Brring brring! |
| **The Flashlight** | Captain Marigold | Battery & switch | A beam lights the dark |
| **The Jack-in-the-Box** | Rosa's little brother | Crank & spring | POP! (gentle, funny, never scary) |
| **The Pepper Grinder** | Mrs. Pepperwhistle | Gear & screw | A sneeze-inducing puff |
| **The Metronome** | The piano teacher, Mr. Lindqvist | Pendulum | A steady tick to play along with |
| **The Kitchen Timer** | Albert Finch | Spring & escapement | Ding! The cookies are ready |
| **The Toy Car** | The twins | Pull-back flywheel | Zoom across the floor |
| **The Weather Vane** | The farmer, Mrs. Odum | Bearings & oil | It spins with the wind |
| **The Coin Bank** | Miss Juniper's class | Lever & ramp | The coin rolls, the bank's monkey claps |
| **The Spinning Top** | A park busker | Gear & ripcord | Mesmerising spin with a hum |
| **The Desk Lamp** | Nana | Wire & bulb | Warm light on the workbench |
| **The Clockwork Bird** | Magnus (post-reformation) | Cams & bellows | Tweet tweet! |
| *...and 9 more* | | | |

**Design notes:**
- Quick Fixes are the ideal "first game" for a 4-year-old and are **replayable** forever (each has 3 visual variations on replay so it feels fresh).
- In Engineer mode, each Quick Fix has an "Over-Engineer It" challenge: make the payoff happen via a chain reaction using at least 5 extra parts (deliberately silly, deeply fun).

---

## 16. Post-Game: The Mystery Attic

Magnus's thank-you gift is a key to Nana's **Attic** — a dusty, moonlit treasure trove of strange antique machines Nana collected over fifty years but never managed to fix. Designed for **Engineers (8–10+)** and completionists.

- **24 Attic Objects**, each a compact 3-room repair with harder, combined mechanics:
  *Typewriter · Gramophone · Player Piano · Mechanical Calculator · Pinball Machine · Cash Register · Sewing Machine · Camera · Mechanical Bird Cage · Telegraph · Zoetrope (animation wheel) · Marble Clock · Water Clock · Automaton Writer (writes the player's name!) · Barometer · Projector · Carousel · Diving Helmet Pump · Telescope · Orchestrion · Moving Theatre · Calliope · Lighthouse Lens · The Mystery Box (the final secret)*
- **The Mystery Box:** A puzzle-box with no visible way in, opened only by solving clues hidden across all the other Attic objects. Inside: a final message from a young Odette, and Kip's ultimate customisation item, **the Master Key** (a golden winding key that makes Kip leave a trail of tiny spinning gears).
- **Real-history touch:** Each Attic object's Part-o-pedia entry includes a short, narrated "Real History" note about the real invention it's based on (e.g., the zoetrope as an early form of animation).

---

## 17. The Rube Goldberg Layer: Chain Reactions & Contraptions

The concept's promise for older kids is **Rube Goldberg sequencing** — elaborate, multi-system chain reactions. This layer runs through the whole game and peaks in the late repairs and the Invention Bench.

### 17.1 Big Fix chain reactions
Every Great Repair ends with a **Big Fix** — a chain reaction the player completes and then watches play out in a single spectacular camera move. Early Big Fixes are mostly pre-built with one or two missing links; later ones (Tea Machine, Bertie, Clock Tower) require the player to design substantial parts of the chain.

### 17.2 Chain-reaction design toolkit
Mechanisms designers combine across systems:

| Trigger type | Examples |
|---|---|
| **Mechanical → Mechanical** | A gear turns a cam that lifts a lever that releases a marble |
| **Mechanical → Electrical** | A swinging pendulum closes a switch that lights a bulb |
| **Electrical → Mechanical** | A motor winds a spring that launches a toy car |
| **Fluid → Mechanical** | Steam pushes a piston that pulls a rope that rings a bell |
| **Light → Logic** | A light sensor triggers a "Both" gate when combined with a pressure plate |
| **Timing → Everything** | A pendulum's swing times when a door opens for a rolling marble |

### 17.3 Late-game Engineer puzzles (examples)
- **"The Breakfast Machine" (Tune-Up, Cuckoo Clock):** When Coo cuckoos at 7:00, a chain must crack an egg (a toy egg, into a toy pan), pop the toast and ring a bell — using only the parts in the tray.
- **"The Ratio Riddle" (Clock Tower 8.3):** Four clock faces must show the same time, driven from one shaft, but each face sits at a different distance with different gear tray options. Solve the gear train for each.
- **"Pendulum Harmony" (Clock Tower 8.4):** Two pendulums must swing in sync so a platform bridge forms at the right moment; adjust bob heights and verify by watching.
- **"Gate Keeper" (Bertie 6.3):** A marble must reach the lamp only if both the left lever and the right sensor are on, *or* if the red button is held — construct it from gate parts.

### 17.4 Contraption scoring (Engineer mode)
Optional chain-reaction scores reward creativity:
- **Steps:** More distinct links = more points
- **Systems:** Using more different families (gear, circuit, steam...) = bonus
- **Style:** "Clockwork Cleverness" bonuses for elegant tricks (e.g., reusing the same marble twice)
- **Efficiency medal:** The opposite — the fewest parts to achieve the goal

Players choose which to chase. Both are celebrated.

---

## 18. Customization: Making Kip Yours

Customization is a huge motivator for 7–10-year-olds. In Pocket Mechanic it's tactile and in-world: Kip is *physically* rebuilt at the **Paint & Polish Station**, which is itself a satisfying mini-game (unscrew a plate, snap on a new one, polish it with a cloth until it shines).

### 18.1 Customization slots

| Slot | Examples | How earned |
|---|---|---|
| **Winding Key** | Classic brass, heart, star, anchor (Captain Marigold), whisk (Albert), treble clef (Rosa), train wheel (twins), lightning bolt, the golden Master Key | Repair rewards, Lost Treasures, Attic |
| **Chest Plate** | Engraved brass plates: "First Mate," gear motif, wave pattern, starfield, Bertie's face, custom monogram (pick your initials from letter stamps) | Thank-You Tokens, Shiny Bits |
| **Finish** | Polished brass, rose copper, silver, gunmetal, verdigris patina, enamel colors (12), candy stripes, pearl | Shiny Bits |
| **Eyes (Lenses)** | Round, monocle (a nod to Magnus), heart-lenses, star-lenses, telescope eyes, colored glass | Repair rewards |
| **Antenna Bulb** | Bulb colors, star topper, tiny propeller, little flag, mini lighthouse | Quick Fixes |
| **Headwear** | Party hat, feathered hat, top hat, conductor's cap, captain's hat, flour-dusted baker's toque, graduation cap | Customer gifts |
| **Feet** | Spring boots, roller wheels, tiny wooden clogs, rocket boots (cosmetic sparkles only) | Tune-Up medals |
| **Voice Chip** | Alternate beep sets: chirpy, musical, bubbly, robotic-retro, music-box | Attic |
| **Trail** | Sparks, gears, music notes, steam puffs, stars | Tune-Up medals |
| **Tool Skins** | Oil can styles, rainbow wire spool, golden wrench | Golden Gear milestones |

### 18.2 Design rules for customization
- **Everything is earned in play.** Nothing is purchasable with real money. There is no premium currency.
- **Cosmetic only.** No customization changes difficulty or gives advantages. (Engineer kids will want to show off — that's the point.)
- **Meaningful origin.** Most items come from people Kip helped, so each one tells a story. A child can point at Kip's anchor key and say, "That's from the Captain, because I saved the boats."
- **Saved Looks:** Up to 6 saved outfits. Tess has her own full customization set.
- **Nook decorating:** Kip's Nook (matchbox → tin-can cottage → clockwork house) can be furnished with items made from spare parts: a thimble chair, a spool table, a bottle-cap rug, a working mini music box (playing songs the player composed).

---

## 19. Collectibles, Progression & Rewards

| Collectible | What it is | Count | Purpose |
|---|---|---|---|
| **Golden Gears** | Shining gears; 3 per Great Repair room, 2 per Quick Fix, 1 per Attic room | ~195 (main) + ~72 (Attic) | Open new repairs (gated at ≤70% of main-path gears), unlock Nook upgrades |
| **Shiny Bits** | Screws, washers, springs | Thousands | Spend at the Paint & Polish Station |
| **Thank-You Tokens** | Customer gifts | 1 per repair & Quick Fix | Unique customization items |
| **Lost Treasures** | Personal items lost inside objects | 16 | Extra story moments, unique rewards |
| **Magnus Marks** | Feathers, peck marks, dropped trinkets | 7 | Piece together the Magnus mystery (story collectible) |
| **Part-o-pedia Entries** | Every part in the game | ~120 | "How It Really Works" learning library |
| **Blueprints** | Rolled-up plans hidden in objects | 40 | Unlock new parts for the Invention Bench |
| **Songs** | Music box melodies | 12 found + unlimited composed | Play in the Nook and the music box |
| **Stamps** | Achievements as rubber stamps in Kip's Job Book | 100 | Celebrate milestones |

### 19.1 The Part-o-pedia
Every part Kip touches is added to a beautifully illustrated encyclopedia in the shop's Parts Drawers. Each entry contains:
- A **spoken description** for young players ("A gear is a wheel with teeth. When two gears touch, turning one turns the other!")
- An **interactive 3D model** to spin, take apart and reassemble
- **"How It Really Works"**: a short narrated animation showing the part in a real-world machine (gears in a bicycle, a pendulum in a grandfather clock, a valve in a kitchen tap)
- **"Spot It at Home!"**: a gentle prompt to find the real thing around the house (with a safety note where relevant, e.g., "Ask a grown-up before touching anything that plugs into the wall!")

### 19.2 Stamps (achievements)
Celebrating curiosity and care, not grind: *"Fiddled with 100 Fiddle Toys!", "Made a funny-wrong fix!", "Returned a Lost Treasure!", "Rode a gear all the way round!", "Composed a song!", "Petted Pudding the cat!", "Fixed something with Tess!"*.

---

## 20. Mastery: Tune-Ups, Medals & Showing Off

### 20.1 Tune-Ups
Every Great Repair, once completed, unlocks **Tune-Ups** — challenge versions of its rooms played from the Display Shelf. The object now has a new, *subtler* problem (it runs too fast, the song is in the wrong key, the train is late, the tea is too weak) and the player must diagnose and optimise.

**Tune-Up challenge types:**
| Type | Goal |
|---|---|
| **Exact Ratio** | Achieve a precise gear ratio / speed |
| **Fewest Parts** | Solve with the minimum number of parts |
| **Speed Fix** | Fix within a target time (optional timer) |
| **Chain Reaction** | Achieve a goal through a chain of at least N steps |
| **No Peeking** | Solve without the Peek Lens |
| **Perfect Timing** | Sync pendulums / pistons / trains |
| **Composer** | Recreate a played melody by ear |

### 20.2 Medals
**Copper → Silver → Gold → Brass Masterpiece** (the developer benchmark). Medals unlock cosmetics, trails and Invention Bench parts. Medal criteria are shown up-front so kids know exactly what they're chasing.

### 20.3 Showing off (safely)
- **Replay Reel:** Record your Big Fix chain reactions and contraptions, replay from any angle, slow-motion.
- **Contraption Codes:** Share Invention Bench creations via a QR code scanned by another device locally. No accounts or internet required.
- **Family Leaderboard:** Local, per-device, across family profiles.
- **Optional online sharing** is off by default, behind a parental gate, with moderated, text-free sharing (titles chosen from preset word combinations).

---

## 21. Co-op & Family Play

### 21.1 Kip & Tess (symmetric co-op)
Two players inside the object together. Drop-in, drop-out.
- **Two-Hands Jobs:** Some heavy parts can be carried faster by two; some levers are "Both" gates that need two players at once (in single-player, a resident helps instead).
- **Hold & Turn:** One player holds a part steady while the other screws it in.
- **Boost:** Tess can toss Kip to high places (and vice versa).
- **Per-player Play Style:** A Little Tinker and an Engineer can play together; snap and hint settings apply per player.

### 21.2 Outside Hands (asymmetric co-op) — *a signature feature*
One player is **inside** as Kip. The other is **outside** — playing as **Nana's hands**, seen from inside as enormous, gentle, warm hands reaching through the open back of the machine.
- **Outside Hands can:** shine a **flashlight** to light dark rooms; use **tweezers** to deliver parts Kip can't reach; **tilt and rotate** the whole object so things roll where they're needed; **wind** big mainsprings from outside; **tap** on the casing to wake up sleepy residents.
- **Outside Hands cannot:** snap parts into place or complete the fix — that's always Kip's job, preserving the child's role as the hero.
- **Who it's for:** Parents and grandparents helping young children; older siblings playing with younger ones; or two older kids for a genuinely cooperative puzzle experience.
- **On tablets:** Outside Hands works on the **same screen** — one person controls Kip, the other uses a second finger for the hands (tweezers via tap-and-drag, tilt via device tilt or a dial).
- **On consoles:** The second player uses a controller with a pointer cursor (or Joy-Con mouse on Switch 2).

### 21.3 Family features
- Up to 6 local profiles
- Shared Display Shelf (each family member's repairs appear)
- Couch-friendly camera that keeps both players in view
- Celebration moments for two: Kip and Tess high-five; Outside Hands give Kip a gentle thumbs-up

---

## 22. The Invention Bench (Sandbox & Creator)

Unlocked after Repair 4. A free-build sandbox where every part the player has discovered becomes a building block. It's where Engineers will spend dozens of hours — and where very young children can simply play with gears.

### 22.1 Modes
- **Free Build:** An empty workbench; build anything. Gears, levers, wires, pipes, gates, lights, marbles, bells, Kip-sized seats. Hit **"Run"** and watch it go.
- **Contraption Cards:** 60 goal-based challenges ("Ring the bell three times," "Get the marble into the teacup," "Make the fox dance when the light turns on," "Make a machine that waves hello").
- **Magnus's Nest Studio:** Build nests and gadgets for Magnus, who visits and reacts to them (he's a harsh but hilarious critic: "Insufficiently sparkly!").
- **Gadget Gallery:** Display your favorite creations on shelves in the shop.

### 22.2 Creation tools
- **Snap grid** (on/off), **copy & mirror**, **undo** (Rewind Crank), **slow-motion run**, **Peek Lens debug view** (see power flow through your own machine — an incredible learning tool for figuring out why a contraption doesn't work).
- **Starter Templates:** "Marble Run," "Music Machine," "Domino Drop," "Light Show," "Toy Train Loop."
- **Little Tinker version:** A simplified "Toy Box" with chunky pre-built modules (a gear tower, a bell, a ramp) that snap together and always do something fun.

### 22.3 Why it matters
The Invention Bench converts everything the game teaches into *creation*. A child who has learned that gears change speed, that circuits need loops and that pendulums keep time can now **invent** with those ideas. It's the deepest long-term engagement in the game — earned through creativity, not compulsion.

---

## 23. Audio Design

### 23.1 Real sounds from real machines
The game's audio identity is **authentic mechanical foley**. The audio team records a library of real antique and vintage mechanisms: longcase and cuckoo clocks, music boxes and combs, toy trains, valve radios, kettles and steam whistles, typewriters, cash registers, sewing machines, ratchets, springs and switches. Each part family has a deep bank of recordings so repeated actions never sound identical.

**The sound is half the reward.** The click of a ratchet, the CLUNK of a snapped gear and the warm crackle of a valve radio warming up are the "pop" of this game.

### 23.2 Music that is the machine
- **Each object has a theme** built from its own sounds: the cuckoo clock's music is driven by ticking percussion; the music box's theme *is* the lullaby; the train's theme chugs; the radio's is a warm swing tune emerging from static.
- **Fixing brings the music back:** Each object's music is broken into layers. A broken machine plays a sparse, gentle version; every room repaired adds an instrument. The Big Fix plays the full arrangement. **Players hear their progress.**
- **Rhythm sync:** Gears, pistons and pendulums in each room tick in time with the music's tempo, so the whole machine feels like it's playing the song.

### 23.3 Voices
- **Kip & Tess:** Expressive beeps, chirps and chimes.
- **Nana & townsfolk:** Short, simple, fully voiced, warm lines, localised.
- **Magnus:** Gloriously over-the-top theatrical voice.

### 23.4 Sensory comfort
- **"Soft Clockwork" setting:** Reduces sharp transients (bells, whistles, sparks) for sound-sensitive children.
- **Volume normalisation**; no sudden loud sounds; the Jack-in-the-Box Quick Fix has a gentle "pop" variant in Soft Clockwork.
- **ASMR-friendly quiet mode** in the Invention Bench: no music, just mechanical sounds.

---

## 24. Art Direction

### 24.1 Visual style: "Copper & Moss"

The approved direction is a **hand-drawn industrial storybook**: fine walnut-coloured outlines,
pencil hatching, aged paper, tarnished copper, chipped teal paint, crooked timber and trailing
greenery. Warm lamplight and pale daylight make the worn workshop welcoming. Machinery feels
patched, handmade and loved; its texture stays quieter around faces, words and puzzle targets.

The approved title page and stormy-night opening establish the visual baseline for the full
game. Their composition, Kip proportions and copper/teal/moss materials carry into every room
and menu. The implementation guide is [`ART_DIRECTION.md`](ART_DIRECTION.md).

### 24.2 Inside vs. outside

- **Outside (the shop, the town):** Layered illustrations of a seaside workshop and crooked town:
  drawers, jars, patched wood, copper fittings, ivy, amber lamps and soft blue-green windows.
  Familiar objects beside Kip establish his thumb-sized scale.
- **Inside (the objects):** Fixed 2D cutaways with the same ink and material treatment. Gears can
  feel enormous, wires become tree roots, and shafts of light reveal the machine's interior.
  Each object keeps a distinct, muted colour story:

| Object | Color story |
|---|---|
| Cuckoo Clock | Pencilled walnut, tarnished brass, amber morning light |
| Music Box | Dusty rose velvet, aged silver, ivory, soft candlelight |
| Toy Train | Faded painted copper, moss hills, pale blue-green sky |
| Retro Radio | Worn art-deco wood, copper, Bakelite brown, amber tubes |
| Tea Machine | Patched copper, muted green glass, cream steam |
| Big Bertie | Faded tin-toy red, parchment cream, small warm bulbs |
| Star Orrery | Desaturated midnight teal, ivory stars, tarnished brass |
| Clock Tower | Moss-grey stone, weathered iron, muted glass, copper sunset |

### 24.3 Kip's design rules

- Readable silhouette at small sizes: a round copper pocket-watch body, large winding key,
  spring legs and broad, slightly mismatched feet.
- Chipped teal repair patches, small rivets and etched seams connect Kip to the workshop.
  Player-selected finishes, keys, plates, eyes, hats and feet remain visible and customisable.
- The winding key stays visible — it's the icon.
- Big glass-lens eyes are the emotional centre: live pupils, shutter-eyelids, curious looks and
  bright reflections. A small amber antenna bulb gives warmth without washing out the face.
- **Toy-ready:** Kip is designed to be manufactured as a real wind-up toy (Section 29).

### 24.4 Camera: the Diorama View

The web edition uses **fixed 2D illustrated cutaways**, composed for a 1280×720 landscape canvas
and scaled to the device. Layered walls, furniture, light and foreground details suggest depth.

- Keep active mechanisms, empty sockets and the parts tray clear of decorative clutter.
- Animate the live parts: Kip's eyes and spring legs, winding keys, gears, power flow and repaired
  machines. Painted backdrops provide scenery; they do not replace puzzle interactions.
- Present words on quiet parchment surfaces with dark walnut type, copper rims and clear
  moss/teal selections. Preserve generous touch targets, high-contrast outlines and visual hints.
- Use fine paper grain and bounded hatching; Calm Visuals reduces particles and optional camera effects.
- Manifest-listed painted assets sit behind live characters and controls. Procedural art remains
  available when an image is missing or has not been cached for offline play.

---

## 25. Accessibility

### 25.1 Motor
- Touch, controller, mouse and switch support; full remapping
- **Adjustable snap radius** independent of Play Style
- **Auto-turn** for cranks and valves (tap-and-hold instead of circular gestures)
- **Hold-to-toggle** for all held actions
- **One-switch scanning mode:** The game cycles highlights through interactable parts and slots; one switch selects
- **Dwell-click** for eye-gaze and head-pointer users
- **No required timing** in Little Tinker and Fixer modes (timing puzzles slow down or auto-sync)

### 25.2 Visual
- **Every system is double-coded:** Wire colors also have patterns (stripes, dots); pipe contents are visible and labelled with icons; logic gates have distinct shapes; power flow has motion, not just color
- **Color-vision presets** (protan/deutan/tritan) and a **high-contrast mode** that outlines interactive parts
- **Large UI** and scalable text; screen-reader support for menus and the Part-o-pedia
- **Magnifier zoom** in every room

### 25.3 Hearing
- All story is visual-first; subtitles with speaker portraits
- **Visual sound cues:** Every important sound has a visual indicator (ticks shown as small pulses, whistles as puffs, radio tones as visible waveforms)
- **Haptic metronome** for timing puzzles

### 25.4 Cognitive
- Reading-free main path
- Layered hints with adjustable timing
- **"What Was I Doing?"** button: Nana gives a spoken recap of the current goal
- Rooms are short and self-contained; progress saves at every room

### 25.5 Sensory & photosensitivity
- No rapid flashing; all spark and electrical effects pass photosensitivity guidelines
- **Calm Visuals:** reduces sparks, steam and particle density; disables camera bumps
- **Soft Clockwork** audio mode

---

## 26. Child Safety, Wellbeing & Ethics

### 26.1 Commitments
- **No advertising.** Ever.
- **No loot boxes, gacha, or randomised rewards for money.**
- **No in-game purchases** of currency or items. Expansions are complete content packs, purchased by a parent through the platform store.
- **No dark patterns:** no daily rewards, no streaks, no timers that punish absence, no artificial waiting.
- **No open chat or free text**; no user-generated text anywhere online.
- **Privacy:** Fully playable offline. Compliant with COPPA (US), GDPR including its children's data provisions (EU), and the UK Age Appropriate Design Code. Analytics are anonymous and opt-in by a parent.

### 26.2 Healthy play
- **"Closing Time":** A parent-set play timer (off by default). When it's reached, Nana flips the shop sign to "Closed," the lamps dim, Kip and Tess yawn and climb into their Nook, and the game saves. A story-driven, gentle stop — not a hard cut.
- **Natural stopping points** at every room (3–8 minutes).
- **Wind-Down Mode:** Quieter music, warmer lighting, Quick Fixes only — great before bedtime.

### 26.3 Real-world safety messaging
Because the game is about fixing household objects, it carries **clear, gentle real-world safety messaging**:
- The Part-o-pedia's "Spot It at Home" prompts always include "Ask a grown-up first."
- Electricity entries clearly explain: "Real electricity from the wall is dangerous — only grown-ups should open things that plug in."
- Kip only fixes objects that Nana has already unplugged and opened — shown explicitly in the first repair ("Safety first, Kip: unplugged and opened by a grown-up!").

### 26.4 Emotional safety
- No villains to fear; the antagonist (Magnus) is a cheeky, lonely bird who becomes a friend.
- Sad themes (Rosa's abuela, Nana's shaky hands) are handled gently and hopefully, focusing on love and memory.
- No death, no danger, no failure states.

---

## 27. Learning Outcomes (STEM Without Homework)

Pocket Mechanic's systems are built on real-world mechanics, making it a natural fit for early engineering and science learning — **embedded in play, never quizzed**.

| Area | What children practise | Where |
|---|---|---|
| **Simple machines** | Levers, pulleys, wheels & axles, ramps, wedges, screws | Throughout; Part-o-pedia |
| **Gears & ratios** | Direction, speed vs. strength, ratios | Cuckoo Clock, Clock Tower, Tune-Ups |
| **Energy** | Stored energy (springs), transfer, conversion (heat → steam → motion) | Music Box, Tea Machine |
| **Electricity** | Complete circuits, switches, series vs. parallel | Radio |
| **Physics of time** | Pendulums, escapements, rhythm | Cuckoo Clock, Clock Tower |
| **Fluids** | Flow, pressure, valves | Tea Machine |
| **Light** | Reflection, refraction, color spectrum | Star Orrery |
| **Logic & computing** | AND/OR/NOT, memory, sequences, loops, conditionals | Big Bertie |
| **Music** | Pitch, melody, rhythm, composition | Music Box, Whistle Organ |
| **Engineering design** | Diagnose → hypothesise → build → test → improve | Every repair; the Invention Bench |
| **Social-emotional** | Empathy, helpfulness, caring for others' treasured things, forgiveness | Customers, Magnus |
| **Persistence** | Trying, testing, iterating without fear of failure | No-fail design, Tune-Ups |

The engineering design cycle — *notice a problem, investigate, try a fix, test, improve* — is the literal structure of every repair, which aligns naturally with the engineering-practice goals found in many primary school science curricula.

**Grown-Up Guide:** An in-game and printable guide suggests real-world activities: taking apart an old (unplugged!) toy together, building a cardboard marble run, finding gears on a bicycle, making a pendulum with string and a washer.

---

## 28. Parent & Grown-Up Features

Behind a simple parental gate (a press-and-hold pattern or simple math problem):
- **Play Style** per profile
- **Closing Time** play timer and **Wind-Down Mode** schedule
- **Online toggles** (all off by default)
- **Accessibility** quick settings
- **"What We Learned" summary:** A friendly weekly overview ("This week, Sam fixed a radio circuit, programmed Bertie to dance, and composed 3 songs!") — great conversation starters
- **Printables:** Coloring pages, a "How Gears Work" poster, Contraption Card challenges to try with real household objects, the Grown-Up Guide

---

## 29. Business Model & Franchise Potential

### 29.1 Pricing (indicative)
- **Premium launch** at a mid-premium family price point; tablet version as a one-time purchase (no "freemium" model).
- **Expansion 1: "Kitchen Chaos"** — repairs set in a bakery and kitchen: mixers, toasters, scales, a cuckoo-clock oven timer, with a new cooking-machine system.
- **Expansion 2: "The Toy Shop"** — a rival toy shop across the street gets flooded; Kip and Tess repair a whole toy store's worth of wind-up toys, robots and dollhouses.
- **Free updates:** New Contraption Cards, Attic objects, seasonal Brasswick events (no time pressure; all content stays permanently).

### 29.2 Franchise extensions
Pocket Mechanic is unusually well-suited to **physical products**, because its core fantasy is tactile:
- **Kip Wind-Up Toy:** A real, palm-sized wind-up Kip that walks.
- **"Pocket Mechanic Workshop" STEM kits:** Real snap-together gear, lever and marble kits with a Kip figure, linked to in-game Contraption Cards (scan a card to unlock the digital version).
- **Educational licensing:** A **Classroom Edition** with teacher dashboards, lesson plans aligned to early engineering and physical science units, and a no-account, shared-device mode for schools.
- **Museum partnerships:** Interactive exhibits with science and technology museums ("Inside the Machine").
- **Animated series:** "The Tick & Tinker" — each episode a repair and a customer's story.
- **Picture books:** "Kip Fixes the Cuckoo Clock," etc.

---

## 30. Technical Design

### 30.1 Engine
**Unity** recommended (strong touch support and tablet performance, 3D diorama scenes, rapid UI iteration). Unreal Engine 5 is viable for console visual fidelity but heavier on tablets.

### 30.2 Key systems

**The Mechanism Graph (core tech):**
Rather than relying on a general-purpose rigid-body physics engine (which can produce jitter, tunneling and unpredictable jams that would frustrate children), Pocket Mechanic uses a **deterministic kinematic constraint system**:
- Every part is a **node** with typed **sockets** (peg, axle, mesh edge, wire terminal, pipe flange, track joint, gate input/output).
- Connected parts form a **graph**. When a power source runs, the solver propagates **motion** through the graph: gear meshes multiply angular velocity by tooth-count ratios and invert direction; belts preserve direction; cams map rotation to linear displacement; levers map displacement through fulcrum ratios.
- **Jam detection:** Cycles with inconsistent constraints (e.g., three meshed gears in a triangle) are detected analytically, triggering the jam animation.
- **Circuit solver:** Electrical networks are evaluated as connectivity graphs (simplified: loops, switches, series/parallel brightness rules) — not full circuit simulation.
- **Fluid network:** Pipes form a flow graph with simplified pressure propagation (source → valves → outputs), visualised with particle effects.
- **Logic evaluation:** Gates evaluated per tick, with latches holding state.
- **Real physics where it's fun:** Marbles, falling weights, swinging pendulums and rolling cars use **deterministic fixed-step physics** in contained spaces, so chain reactions replay identically (essential for sharing Contraption Codes and for replays).

**Snap System:** Socket compatibility + distance + orientation scoring, with per-player assist profiles (snap radius, auto-rotate) driven by data.

**Diorama Camera:** Per-room authored camera rigs with 90° rotation states, auto-framing and cinematic splines for Big Fix sequences.

**Audio:** Wwise or FMOD; foley banks per part family with randomisation; music stems driven by "repair progress" parameters; tempo-sync for animated parts.

**Data-Driven Puzzles:** Rooms authored in a level editor using the same part library as the Invention Bench (one toolset for designers and players, reducing cost and guaranteeing every designer puzzle is buildable in the sandbox).

### 30.3 Performance targets

| Platform | Resolution | Frame rate |
|---|---|---|
| iPad (recent) / high-end Android tablets | Native (dynamic) | 60 fps (30 fps fallback on older devices) |
| Switch 2 | 1080p docked / handheld dynamic | 60 fps |
| PS5 / Xbox Series X|S / PC | Up to 4K | 60 fps |

### 30.4 Save system
Autosave at every room and repair; up to 6 local profiles; platform cloud saves; Contraption Codes encode creations compactly (deterministic graph data) for QR sharing.

---

## 31. Content Scope

| Content | Count |
|---|---|
| Great Repairs | 8 (≈ 49 rooms + 8 Big Fixes) |
| Quick Fixes | 24 |
| Attic Objects | 24 (× 3 rooms = 72 rooms) |
| Tune-Up Challenges | ~60 |
| Contraption Cards | 60 |
| **Total puzzle spaces** | **~270** |
| Mechanical families | 10 |
| Unique parts | ~120 |
| Tools | 11 |
| Named characters | ~30 |
| Customization items | ~180 |
| Music | ~3 hours of adaptive, stem-based score |
| Voice-over | ~4,500 words of dialogue in 12 languages |
| Main campaign | 14–16 hours (Fixer pace) |
| 100% completion | 35–40 hours, plus open-ended Invention Bench |

---

## 32. Production Plan

*All figures are indicative planning estimates, to be validated in pre-production.*

### 32.1 Phases

| Phase | Duration | Goals | Team (approx.) |
|---|---|---|---|
| **Concept & Prototype** | 3 months | Mechanism Graph prototype; snap feel; gears + circuits; first child playtests on tablet | 8–10 |
| **Vertical Slice** | 4 months | The Cuckoo Clock at shipping quality, incl. Outside Hands co-op, Peek Lens, audio identity | 18–22 |
| **Pre-Production** | 3 months | Level editor (shared with Invention Bench), part library, full repair planning | 22–28 |
| **Production** | 13 months | All repairs, Quick Fixes, shop/town, Invention Bench, Attic | 40–50 (peak) |
| **Alpha → Beta → Polish** | 5 months | Content complete, child playtests, localisation, certification, tablet optimisation | 35–45 |
| **Launch & Live Support** | Ongoing | Free updates, expansions, Classroom Edition | 12–18 |

**Total time to launch: ~28 months.**

### 32.2 Go/no-go gates
1. **Month 3 — "The Fiddle Test":** Do 4-year-olds keep touching parts unprompted for 10+ minutes? Do 10-year-olds solve a ratio puzzle and ask for a harder one?
2. **Month 7 — Vertical Slice:** The Cuckoo Clock passes the Couch Test (mixed-age pair, both want to replay); Outside Hands proves its value with parent-child pairs.
3. **Month 17 — Content Midpoint:** Repairs 1–5 playable.
4. **Month 23 — Alpha.** 5. **Month 26 — Beta.** 6. **Month 28 — Launch.**

### 32.3 Core team roles
Creative Director, Game Director, Lead Puzzle Designer, Puzzle/Level Designers (×5–7), Systems Designer (Mechanism Graph), Child Development & STEM Education Consultants, Art Director, 3D Environment Artists, Prop/Mechanism Artists, Character Artist & Animators, Technical Artist, Lead Engineer, Gameplay Engineers, Tools Engineer, Audio Director, Foley Lead (recording antique mechanisms), Composer, UX Designer (child touch UX specialist), Accessibility Lead, QA incl. child-playtest coordinator, Producers, Localisation.

---

## 33. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Physics jank** (jitter, unpredictable jams) frustrating kids | High (with general physics) | Very high | Deterministic kinematic Mechanism Graph; real physics only in contained, tested spaces |
| **Fiddly controls** for small fingers | Medium | High | Touch-first design, huge snap zones, auto-rotate, auto-turn, tested with 4-year-olds from month 1 |
| **Repetitiveness** ("just dragging parts") | Medium | High | Ten mechanical families, a new tool and system per repair, Fiddle Toys, story variety, Big Fix spectacles |
| **Feels like homework** | Medium | High | Fun first; learning embedded, never quizzed; humor and characters; Part-o-pedia optional |
| **Too complex for 4-year-olds / too simple for 10-year-olds** | Medium | High | Play Styles change rules, not just numbers; Quick Fixes for little ones; Tune-Ups, Attic and Invention Bench for older ones |
| **3D camera confusion** | Medium | Medium | Diorama view with authored angles and 90° rotation |
| **Scope (Attic + Invention Bench)** | Medium | Medium | Shared level editor/part library; Attic can partially ship as free post-launch updates |
| **Parental trust** | Low | Very high | Ethical commitments (Section 26), no IAP, third-party kids' privacy certification |

---

## Appendix A — Full Walkthrough: Mr. Finch's Cuckoo Clock

**Repair 1. Target: 25–35 minutes (Fixer), ~15 minutes (Engineer speedrun of rooms).**

**The Doorbell:** Dawn. Rain on the shop window. The bell jangles; Albert Finch bursts in, flour on his nose, holding a carved cuckoo clock. *"It stopped in the night! I overslept! There's no bread in Brasswick!"* Nana opens the back panel (unplugged and opened by a grown-up — safety shown), sets it on the bench, and looks at Kip. *"Well, little one. Want to see what's inside?"* Kip squeezes through the opening.

**Room 1.1 — The Weight Well**
- Kip lands at the bottom of a tall wooden shaft. Two pinecone-shaped brass weights hang from chains, sitting on the floor. A huge lever sticks out of the wall.
- **Fiddle Toys:** A little bell on a string; a loose cog that rolls when bumped; a carved wooden owl whose eyes swivel when tapped; a peg that boings.
- **Puzzle:** Pull the lever (Tinker: tap it; Fixer: Kip hangs on it and it lowers under Kip's weight) → the chain ratchets → the weights rise. One weight acts as an elevator; Kip rides it up. *Teaches: levers and weights. Can't fail.*
- **Golden Gears:** ① Fixing the room; ② Hidden inside the owl's head (tap its eyes three times); ③ Ride the weight all the way up without stepping off.

**Room 1.2 — The Gear Gallery**
- A wall of gears, all still. One peg is empty. Power (Peek Lens) flows up the weight chain into the first gear and stops at the gap.
- **Tinker:** The ghost outline glows; a medium gear sits nearby; drag → **CLUNK** → the whole wall clatters into motion, gears turning in alternating directions, with a cascade of ticks.
- **Fixer:** Three gears in the tray (small, medium, large). Small: spins alone, doesn't reach (funny "whirr" in the air). Large: doesn't fit (wiggles back). Medium: fits.
- **Engineer twist:** The large gear *does* fit on a different peg, making the wall turn backwards — the clock hands later run anticlockwise (a funny-wrong fix). Solving it "properly" requires noticing direction.
- **Golden Gears:** ① Fix; ② Ride a spinning gear for a full rotation; ③ (Engineer) Use the idler gear trick to fix direction with the "wrong" big gear.

**Room 1.3 — The Rusty Stair**
- A spiral of gears forming a staircase — but they're rusty and squeal horribly when Kip pushes them, then stop.
- **Puzzle:** Kip receives the **Oil Can** from a tiny shelf (Nana's voice: "A little oil makes everything happier"). Oil each squeaky gear: the squeak rises in pitch, then becomes a smooth purr (deeply satisfying). Oiled gears turn smoothly, forming a moving staircase up.
- **Fiddle Toys:** A rusty spring that boings in different notes once oiled.
- **Golden Gears:** ① Fix; ② Oil every squeaky thing in the room (12 of them); ③ Hidden behind a rust patch you can only see after oiling.

**Room 1.4 — The Pendulum Hall**
- A long hall with the pendulum hanging still, like a giant wooden spoon.
- **Puzzle (Tinker):** Push the pendulum → it swings → the escapement starts ticking → the whole clock starts to *tick-tock*. The room's music kicks in, in time with the swing.
- **Fixer:** The pendulum swings but the escapement is missing a pallet piece; find it and snap it on.
- **Engineer:** The clock runs too fast. Slide the bob down to lengthen the swing and slow the tick until it matches the metronome beat shown on a dial (and the music's tempo).
- Kip receives the **Peek Lens** here, in a lovely moment: Kip peeks, and for the first time sees the whole machine glowing with flowing power.
- **Golden Gears:** ① Fix; ② Ride the pendulum for 10 swings; ③ (Engineer) Perfect tempo match.

**Room 1.5 — The Hands Room**
- Behind the enormous clock face; numbers glow like windows. The hands' gear train is disconnected.
- **Puzzle:** Connect the drive shaft to the hands via a gear pair. Tinker: one gear. Fixer: a gear pair with a crown gear to turn the power 90° toward the face. Engineer: the minute hand must turn 12 times for every turn of the hour hand — choose gears from a tray with visible tooth counts to make 12:1 (see Appendix B).
- **Big moment:** The hands sweep around, casting moving shadows across Kip.
- **Lost Treasure:** Behind the "4" — Martha's recipe card.

**Room 1.6 — Coo's Loft**
- Coo the cuckoo sits slumped behind his little door, bellows torn, door lever unhooked. Coo is *outraged* ("Coo! COO!").
- **Puzzle:** Patch the bellows (drag a felt patch), hook the door lever to a cam on the hour wheel, and reconnect the bellows' push-rod.
- **Fiddle Toys:** Coo himself — tap him and he does dramatic poses.

**Big Fix — "Four O'Clock!"**
- The player is shown the full chain: hour wheel → cam → lever → door opens → bellows pump → Coo sings. One link is missing (Tinker: one part to place; Engineer: build the cam-lever linkage from parts).
- **The Test Run:** The camera starts at the weights, flies up through the gear gallery, spirals up the oiled staircase, swings with the pendulum, slides behind the clock face as the hands strike 4:00 — and bursts out through Coo's door as Coo leaps out singing **"CUCKOO! CUCKOO! CUCKOO! CUCKOO!"** Out the shop window, down the street, the bakery's lights blink on.

**The Return:** Albert hugs the clock, then Nana, then (very carefully) Kip. If the recipe card was found, he holds it to his chest for a long moment. Next morning on the town map: smoke from the bakery chimney and a new item — Martha's Honey Buns. Kip receives the **Whisk Key** (cosmetic).

---

## Appendix B — Gear Ratio Puzzle Design

### The rules players learn (by doing)
1. Two meshed gears turn in **opposite directions**.
2. A gear between them (an **idler**) makes the outer two turn the **same** direction — and doesn't change speed.
3. A **small gear driving a big gear** makes the big gear turn **slower but stronger**.
4. A **big gear driving a small gear** makes the small gear turn **faster but weaker**.
5. **Ratio = teeth on driven gear ÷ teeth on driving gear.** A 10-tooth gear driving a 30-tooth gear: the big gear turns once for every 3 turns of the small one (3:1).
6. **Compound gears** (two gears fixed on the same shaft) multiply ratios: 3:1 then 4:1 = 12:1.

### How it's shown (Engineer mode)
- Each gear displays its **tooth count** on its face.
- A **Ratio Gauge** on the output shows the current speed ratio as a dial with a target zone.
- Speed is shown visually with **speed lines** and a little **tortoise ↔ hare** icon scale (readable without numbers for younger players who wander in).

### Example puzzles

| Puzzle | Goal | Tray | Solution |
|---|---|---|---|
| **The Slow Lift** | Lift a heavy weight (needs ≥ 4:1) | 8, 16, 32 teeth | 8 → 32 (4:1) |
| **Clock Hands** | Minute : hour = 12:1 | 10 (×2), 20, 30, 40, 60 teeth; one compound shaft | 10 → 30 (3:1), compound with 10 → 40 (4:1) = 12:1 |
| **Same Way Round** | Output must turn the same direction as input at the same speed | Two 20-tooth gears, one 12-tooth | 20 → 12 (idler) → 20 |
| **Spin Top** | Make the spinner go 6× faster than the crank | 10, 20, 30, 60 teeth | 60 → 10 (1:6) |
| **Four Faces** (Clock Tower) | Four outputs at 1:1 from one shaft, around corners | Crown gears, 20-tooth gears, shafts | Crown gears at each corner, equal teeth on every pair |

### Difficulty ladder
Direction only → size choice → two-gear ratio → idler → compound gears → multiple outputs → constrained trays (fewest parts) → combined with timing (pendulum period must match ratio output).

---

## Appendix C — Logic Gate Puzzle Design

Logic gates are presented as **physical, visible mechanisms** — marbles, doors and seesaws — never as abstract symbols (symbols appear only as small labels in Engineer mode).

| Gate | In-world form | Rule | Kid-language |
|---|---|---|---|
| **AND** | **"Both" Door:** a door with two keyholes, each turned by a lever | Opens only if both levers are on | "Both have to be ON!" |
| **OR** | **"Either" Chute:** a Y-shaped marble chute | A marble from either side gets through | "Either one works!" |
| **NOT** | **"Flip" Seesaw:** when the input pushes down, the output pops up | Output is the opposite of input | "It does the opposite!" |
| **Latch (memory)** | **"Remember" Ratchet:** clicks into place and stays | Stays on after a pulse until reset | "It remembers!" |
| **Sensor** | Pressure plate, light eye, sound ear | Becomes ON when triggered | — |

### Example puzzles (Big Bertie)
1. **"Two Friends Door" (AND):** Kip stands on one plate, a resident stands on the other → the door opens. *Teaches: both needed.*
2. **"Any Way In" (OR):** Two marble launchers; either one lights the bulb. *Teaches: either is enough.*
3. **"Lights Out Lullaby" (NOT):** Bertie's nightlight must turn ON when the room light goes OFF. Use a Flip seesaw. *Teaches: opposites.*
4. **"Doorbell Memory" (Latch):** A visitor presses a bell once; the "someone's here" flag must stay up until Kip resets it.
5. **"Dance Only When the Music's On AND the Stage Light's On, OR When Professor Pockets Claps":** Combine AND + OR (Engineer capstone).

### Punch-card programming (Bertie's Dance)
- **Cards are rows of moves** (step-left, step-right, spin, clap, wave, jump) punched in order — **sequence**.
- A **Repeat Card** with a number of holes repeats the next row — **loops**.
- A **Sensor Card** ("if the light is green...") branches — **conditionals**.
- Little Tinkers press big move buttons and Bertie performs instantly (cause and effect). Fixers punch short sequences. Engineers write compact routines using loops to fit Bertie's limited card slots ("Fewest Cards" medal).

---

## Appendix D — The Townsfolk of Brasswick

| Character | Role | Personality | Repairs / Quick Fixes |
|---|---|---|---|
| **Nana Odette** | Clockmaker, Kip's maker | Warm, funny, forgetful, wise | Hub; Clock Tower history |
| **Albert Finch** | Baker | Gentle, floury, sentimental | Cuckoo Clock; Kitchen Timer; Door Hinge |
| **Rosa Delgado** | Girl, age 7 | Chatty, imaginative, brave | Music Box |
| **Theo & Ada Okafor** | Twins, age 5 | Train-obsessed / bossy-sweet | Toy Train; Toy Car |
| **Captain Marigold Pike** | Retired lighthouse keeper | Gruff, kind, secretly sentimental | Radio; Flashlight |
| **Mrs. Pepperwhistle** | Café owner | Theatrical, enormous hats | Tea Machine; Pepper Grinder |
| **Professor Pockets** | Fairground showman | Eccentric, a hundred pockets | Big Bertie |
| **Miss Juniper Hale** | Schoolteacher | Gentle stargazer | Star Orrery; Coin Bank |
| **Mr. Ade** | Postman | Cheerful, always whistling | Bicycle Bell |
| **Mrs. Odum** | Farmer | Down-to-earth, loves weather | Weather Vane |
| **Mr. Lindqvist** | Piano teacher | Precise, secretly silly | Metronome |
| **Magnus** | Magpie | Vain, dramatic, lonely, reformed | Antagonist → friend; Clockwork Bird |
| **Whisker** | Shop mouse | Easily startled, crumb-obsessed | Hub ride |
| **Pudding** | Shop cat | Asleep. Always asleep. | Hub mountain |
| **Tess** | Kip's sister automaton | Bold, bouncy, flourish-prone | Co-op partner |

---

## Appendix E — Playtest Plan

**Who:** Families with children aged 4–5, 6–7 and 8–10, mixed-age sibling pairs, and parent–child pairs (for Outside Hands); diverse backgrounds and experience levels; children with motor, visual and hearing accessibility needs. Parental consent, a parent present, child-friendly facilitators, short sessions for under-6s.

| Metric | Method | Target |
|---|---|---|
| **The Fiddle Test** (4–5) | Time spent touching parts unprompted | 10+ minutes engagement in first session |
| **First successful snap** | Telemetry (local) | < 45 seconds for 4-year-olds on touch |
| **Mis-drops per snap** | Telemetry | Decreasing across session; < 2 average for Tinkers |
| **Stuck time** | Telemetry | < 90 seconds average on main path |
| **Concept transfer** (6–8) | Post-play task: "Show me with these cardboard gears which way this one turns" | > 70% correct |
| **Ratio reasoning** (8–10) | Engineer Tune-Up completion & explanation | > 60% complete one ratio puzzle and can explain why |
| **Outside Hands value** | Parent survey + observation | Parents rate "helped without taking over" ≥ 4/5 |
| **Couch Test** | Mixed-age pairs post-play choice | Both children want to play again |
| **Emotional response to Returns** | Observation & child interview ("How did Rosa feel?") | Children can describe the owner's feelings |

**Cadence:** Monthly from month 2; biweekly in production; weekly in beta.

---

## Appendix F — Glossary

| Term | Meaning |
|---|---|
| **Big Fix** | The finale chain reaction and full-machine test run of each Great Repair |
| **Busy Board principle** | Every room is full of satisfying optional interactions |
| **Contraption Code** | A QR code encoding an Invention Bench creation for local sharing |
| **Diorama View** | The cutaway, dollhouse-style camera used inside objects |
| **Fiddle Toy** | A non-puzzle interactive element in a room |
| **Golden Gear** | Main collectible; 3 per room; opens new repairs |
| **Great Repair** | A main campaign object (8 total) |
| **Invention Bench** | The sandbox and contraption creator |
| **Lost Treasure** | A personal item found inside an object and returned to its owner |
| **Mechanism Graph** | The deterministic kinematic system that simulates connected parts |
| **Outside Hands** | Asymmetric co-op where Player 2 plays Nana's hands from outside |
| **Part-o-pedia** | The illustrated encyclopedia of every part, with real-world explainers |
| **Peek Lens** | Kip's X-ray view showing power flow and breaks |
| **Play Style** | Little Tinker, Fixer, Engineer |
| **Quick Fix** | A short 2–3 minute single-mechanism repair |
| **Return, the** | The scene where a repaired object goes back to its owner |
| **Rewind Crank** | Unlimited undo |
| **Shiny Bits** | Currency for cosmetics |
| **Snap Physics** | Magnetic socket-based part placement |
| **Tune-Up** | Mastery challenge version of a completed repair |

---

*End of document — Pocket Mechanic: The Clockwork Repair Shop, GDD v1.0*
