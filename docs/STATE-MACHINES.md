# STATE-MACHINES: the working list (v2.3.4395)

One line an item. A session takes the first OPEN line, proves it is real on
today's main, fixes it with a test that failed first, and ticks it here in the
same PR. A claim that turns out wrong is marked REFUTED with the evidence:
that is a finished item too.

**Where this came from.** A read-through on 2026-11-03 found 964 places where
something moves through phases ("implicit state machines") and checked the 149
that looked risky. Its raw notes are NOT in this repo's `docs/`: they are on
the branch `claude/state-machine-sweep` (draft PR #1415, never to be merged),
under `docs/state-machine-sweep-2026-11-03/`. Read one file at a time with
`git show origin/claude/state-machine-sweep:docs/state-machine-sweep-2026-11-03/PLAN.md`
(the detail of each cluster is `verified/V*.md`). By the run's own count 18%
of the claims it checked were wrong, so **every line below is a lead until its
turn comes**. Do not re-sweep the repo: it cost a third of a week's usage.

**What "explicit" means here** (owner, 2026-11-09): a phase lives in one
field, one function changes it, and a test fails any other writer, the way
`hit-door.test` does. Not a rewrite of all 964: most are harmless.

**What the owner wants from it**: the game smooth on every device; a modified
client cannot cheat (the server decides, the phone only asks); an honest
player never loses items, gold or a fight to a phase that stuck.

## A. The computer faults from the expo (2026-11-05)

- [x] **A. Patches like a checker pattern round the edge of the view, and
  "not smooth", on the judges' computers.** DONE, v2.3.4395.
  - **The cause was not the computer's size or its graphics chip.** It was a
    computer that had never opened the game, on a slow line, with its
    processor busy. Three faults, each reproduced on the test box first:
    1. a ground picture still downloading was drawn as the Ground Studio's
       "not made yet" chequer (`ground-worker.js`, A SLOW LINE);
    2. a download was cut at 15 s and begun again from nothing;
    3. the zone gate let go at a flat 15 s while the first screen's ground
       was still being laid, the missing squares on the outer ring
       (`src/game/zoneGate.js`).
  - **The spec**: `docs/specs/slow-line-ground.md`. **The measuring**:
    `node tools/qa/mp/run.mjs desksmooth` (three computer sizes, slowed, and
    on a thin line; its lines are numbers a later PR can break).
  - **Not provable on the test box**: a fault only a real graphics chip
    shows, and a real frame rate (the box draws in software). The evidence
    did not point there. To capture it on a computer: the Test panel's
    **Speed test**, and a screenshot of its card.
  - **The owner's call, 2026-11-09 ("Go recommended")**: on a slow first
    visit the loading screen waits for the town's pictures while they are
    still coming (up to 30 s; the gate up to 45), so the town arrives drawn.
    Only a line under about 80 KB a second, or one gone silent, still starts
    in plain colours.

- [ ] **A2. How a computer DRAWS the game.** OPEN: next, ahead of B, by the
  owner's word of 2026-11-09: "It's just unoptimized for desktop. Can you fix
  how the game gets processed when used on desktop? It's all been focused on
  mobile performance."
  - **What is already known** (item A's measuring): the game's own work a
    frame on a computer's view is small and the same at every window size
    (4 to 6 ms on the test box), because every screen sees the same area of
    world (`docs/specs/view-cap.md`). So the code is not what a computer
    waits for. What is left is the drawing, and that was only ever tuned on
    phones:
    1. **no pixel budget.** The canvas is drawn at the screen's own pixels
       (`src/game/renderRes.js`): 1.9 million at 1920 x 1080, but about 6
       million on a 4K screen at 150% and 11 million on a 5K one, against the
       2.9 million of the iPhone the frame-rate work was measured on. The art
       has 2 px a game px, which a canvas past about 4.5 million px is finer
       than: pixels the chip pays for in every pass and nobody can see;
    2. **the passes** (shadows, metal shine, moving water) were each kept or
       cut by what they cost a phone's chip, never a laptop's built-in one
       that is also encoding a stream;
    3. Windows and a Mac draw every look the old way
       (`src/game/lookPaletteChoice.js`).
  - **Prepared without a computer** (v2.3.4395), all of which reach a
    computer too:
    - the steady step (A3): the same uneven movement was on every screen;
    - the townsfolk's bakes and the object pages' reads moved off the ride;
    - a look's bake keeps its canvas on the page's side
      (`playerSkins.js bakeReadCtx`, `?bakeread=0` the old way): on a real
      chip the bake read every pixel back FROM the chip. Windows and a Mac
      bake every look they meet, so this is their cost most of all. Not
      measurable on the test box (it draws every canvas in software);
    - the strip (`?perf=1`) names the machine (the chip, the canvas's
      pixels, looks `palette` or `baked` and why), counts late frames,
      splits the worst and names the job between frames, so ONE screenshot
      from any computer and browser says where its frames go;
    - the pacer (A3, `docs/specs/frame-pacer.md`): a laptop with a 120 or
      144 screen whose chip cannot keep up draws a steady 60 or 72, not an
      uneven mix. The strip's `screen` and `frames` lines say what it has,
      and its `outside` is split into the page busy and the page waiting
      (waiting is the chip: fewer pixels or fewer frames, not a code hunt).
  - **The biggest thing still open for a computer**: Windows and a Mac do
    not build the look palette (`lookPaletteChoice.js`), so every other
    player's look is baked on the page, per pose and direction, the first
    time it is met: the freeze A3 removed for the townsfolk, in any crowd
    (the expo). Two ways out, each needing one check on a real computer:
    a Mac probably can build the palette (an iPhone's Safari uses the same
    Metal path and builds it in under a second: try `?lookpalette=1&perf=1`
    there); on Windows the program must shrink (TRAPS §259) or the bake move
    to a worker.
    **A lead that needs no computer** (measured on the test box, v2.3.4395,
    `mp-townride`'s "as before" page): a bake's time is its sheet's frames. A
    stand is one frame of 256 px and bakes in 3 to 5 ms; a jog sheet is 23
    to 28 frames (`jog-east.png`: 28) and bakes in 45 to 147 ms, about 3 ms
    a frame, in ONE go on the page (`playerSkins.js buildBodySheet`). So the
    freeze is not the bake but that it is not split: baked a few frames a
    turn (a jog's drawings are steadied across the whole strip, so that pass
    stays whole: `recolorBodyToCanvas` `steadyArt`), no job would hold the
    page past a few ms on any machine, for any look, with no memory added.
    `window.__btMade` already times it, so `mp-townride`'s `?folkbake=0`
    page is the failing test.
  - **None of it can be measured on the test box**, which draws in software.
    So first a capture from a real computer: the Test panel's Speed test and
    a screenshot of its card, with the computer (Windows or Mac), the browser
    and the screen. The Speed test has no lower-resolution step for a screen
    at 2x or under (`speedTest.js` LOW_RES): add one, so the card can say
    whether the pixels are the cost. Then fix what the card shows; a pixel
    budget for big screens is the likely first fix and needs no capture to be
    safe for phones (they are under it).

- [ ] **A3. The skateboard on an iPhone: "gritty framerate ... riding through
  town".** PART DONE, v2.3.4395; still OPEN. The owner, on the fix below:
  "I think it looks a little smoother but it's still gritty looking."
  - **What is left to tell apart** (the phone's strip, `?perf=1`, now says
    each): (1) real late frames: the strip read "p95 17.0 max 38.0", one
    frame in each two seconds two refreshes late, and nothing on the test box
    shows where it goes (the game's own worst frame on a ride is 10 ms); the
    strip's new lines give the count in ten seconds and the worst one's
    split; (2) the ceiling: an iPhone 14 Pro Max's screen is 120 Hz and
    Safari gives a web page 60 (its feature flag "Prefer Page Rendering
    Updates near 60fps"), so 60 may itself be what reads as gritty beside the
    rest of the phone; (3) the stick is analog: a thumb short of the rim
    moves you at a speed that wavers with it (the strip's `stick` line).
  - **Proved steady with steady input** (`mp-steadystep`): your step, the
    camera's slide and your place on the screen, frame to frame.
  - **The late frames, found** (the owner's next capture: "late frames 10
    in 10s", "worst 170.0 = game 40.0 + outside 130.0", the stick at 1.00):
    art made on the page the first time it came on screen. Four townsfolk
    whose looks the shared colour numbers refuse were baked for each pose and
    direction when first met (80 to 250 ms a sheet), and every frame of an
    object page was read in one go as it came. Now baked behind the world's
    loading screen, and read a few ms at a time: `mp-townride` (5 bakes on
    the ride, the longest 258 ms, to none, the longest job 18 ms);
    `docs/specs/living-town.md`.
  - **"Way better with just a few occasional hiccups"** (the owner on that,
    the strip naming one: "between frames: body jog-east 101.0 ms"). The
    first cut baked the facings of each townsperson's own route. He leaves
    it: he turns to you, and after any wait he walks straight back across
    its corners, facing any way (the Blacksmith's route is all diagonals, so
    east and west were never baked). Now all eight facings, standing and
    walking: 34 sheets in 2.5 s behind the loading screen on the test box
    (23 in 1.8 s), and `mp-townride` sets each of the four down off his
    route in each direction: 7 bakes on the page with the first cut (the
    Blacksmith's walk east 91 ms), none now.
  - **"Still performance issues"** (the owner, 2026-11-10, twenty-four
    minutes into a session with Safari's 60 flag off: "fps ~51  frame avg
    19.6 p95 26.0 max 32.0", "work 6.8 ... outside 12.8", where the cool
    phone read "fps ~106"). Not a freeze this time: a 120 screen the phone
    could no longer keep up with, its frames on the glass for two, three and
    four refreshes mixed, so the steady step showed as an unsteady speed.
    Now a pacer (`src/game/framePacer.js`, `docs/specs/frame-pacer.md`;
    `?pace=0` the old way): on a screen over about 70 a second the game
    draws on a whole number of refreshes it can keep to (that phone: every
    third, a steady 40), tries faster after 20 s clean, and never touches a
    60 screen. `mp-steadypace` plays the hot phone to the real game: the
    speed on the glass 33% out for one frame in ten before, 3.3% now.
    Its first cut made the black-screen watchdog read an empty canvas on the
    refreshes it passed (a strike each; two rebuild the renderer): caught by
    that scenario before it reached a phone, and fixed (`whenDrawn`).
    Waits on the owner's eye (warm phone, with and without `?pace=0`).
  - **Not found**: that capture's one freeze ("worst 378.0 = game 16.0 +
    outside 362.0", no job named past 13 ms, another player newly on
    screen). `mp-peerarrive` (Chrome's profiler on a phone as a dressed
    player rides up, circles and swings) finds nothing a new player makes
    the watcher's page do outside its frame, apart from the black-screen
    watchdog's read of the canvas (it waits for the graphics side: 77 to 164
    ms on the test box with a second page open, now named "screen check" on
    the strip). The strip now splits "outside" into the page BUSY and the
    page WAITING (`src/debug/busyBeat.js`), which is what the next capture
    of a freeze like it will say.
  - **Why the phone slowed is not proved**: its own work went from 2.7 to
    6.8 ms a frame with fewer monsters loaded, which reads as heat.
  - **Still to do, for A2**: another PLAYER with an eye style or a drawing
    is baked on the page when first met, the same freeze, in any crowd.
  - **The cause**: not the frame rate. The owner's captures (`?perf=1`,
    2026-11-09) read 60 frames a second with the game's work 3.4 to 4.1 ms
    of each, and the ride was as gritty at a lower resolution and with no
    buildings. The game moved you by each frame's own measured length, which
    wobbles a few ms round the screen's steady 16.7: a third too far on one
    frame, a third too little on the next.
  - **The fix**: the step is the mean of the last ten frames' lengths
    (`src/game/frameClock.js`; `?dtsmooth=0` is the old way).
    `docs/specs/steady-step.md`; `node tools/qa/mp/run.mjs steadystep` plays
    the phone's wobble to the real game: 36% out a frame before, 3.6% now.
  - **REFUTED on the way**: this page's first guess, that the graphics chip
    was the wait (13 new pieces of ground a second). A third of the pixels
    made no difference and the meter shows the chip keeping up.
  - The same uneven step is on computers too, so this is part of A2's "not
    smooth". A2 stays open for what a computer's graphics chip costs.

## B. Cheap closes against a modified client

From PLAN.md, "the cheap closes for modified phones".

- [ ] **B1. The `dead` gate.** Target gates ask `ps.dying`; a phone that
  never says it is dead cannot be hit ("god mode"). OPEN: first of B.
- [ ] **B2. Minted `dungeon:` ids** grow the room's memory (about 100 MB an
  hour against a 128 MB room). OPEN.
- [ ] **B3. A points-reset loop** can write about 131,000 rows a day, past
  the free plan's 100,000. OPEN.
- [ ] **B4. The feedback board trusts any typed id.** OPEN.

## C. Wave 1: honest players' harms, in PLAN.md's order

- [ ] **C1. The phantom duel (V6)**: a red skull, and worn gear lost to a
  player kill. OPEN. Needs owner decision 2 for the zone-change rule.
- [ ] **C2. Undone blocks (V12).** OPEN. Needs owner decision 3.
- [ ] **C3. Bag losses**: the dying window (V2) and death piles (V22). OPEN.
  Needs owner decision 6.
- [ ] **C4. The guard break shown on the phone (V10).** OPEN.
- [x] **C5. The pond memory leak (V17b, R1-8).** On main as v2.3.4157 ("a
  fishing overlay pushed out of its cache is freed for good"), by the commit
  log; not re-checked.
- [ ] **C6. The bag lost behind the dungeon's loading screen (V11).** OPEN.
  Do not add a movement freeze: holding a player still and blind while
  monsters hit them makes it worse.
- [ ] **C7. The frozen trade window (V8b).** OPEN.
- [ ] **C8. The Rare armour lost on the phone after a reconnect (V9b)**:
  match by gid. OPEN.

## D. Wave 2: the five causes, then "keep it fixed"

- [ ] **D1. The server decides the player's phases itself**: dead, guard,
  zone flips, world size, cooking. The phone's fields become requests, as
  v2.3.3292 did for dodging. OPEN. **Owner decision 4: YES** (2026-11-09).
- [ ] **D2. One fight-lock table in the router**: every message that moves
  gold or items names its gate; a test sends each during a player fight and
  checks nothing moved. OPEN. Needs owner decision 7.
- [ ] **D3. Phone copies of server sessions** (the duel, the trade window,
  the held pose, the arena) cleared at every rejoin and sent again by the
  worker, as the party already is. OPEN.
- [ ] **D4. One server clock on the phone**, from the ping, for every server
  timestamp (loot piles, the trade countdown, buffs). OPEN.
- [ ] **D5. Two habits**: a dropped send is never stamped as sent; a cache
  never evicts what this frame draws. OPEN.
- [ ] **D6. Money**: each payment, its stamp and the record's "paid" phase
  in one synchronous run, a phase per escrow record that the wake finishes.
  OPEN.
- [ ] **K1. A "one door" test per machine**, as `hit-door.test`. OPEN.
- [ ] **K2. Chaos tests**, node first: a second tab mid-fight, a deploy
  mid-trade, a restart between two saves, an app switch, a black-screen
  rebuild, a wrong phone clock. OPEN.
- [ ] **K3. A precheck rule** against any load with no time limit or retry.
  OPEN.
- [ ] **K4. Two CLAUDE.md lines**: "a phase lives in one field with one
  transition function"; "the server never takes a phase from the phone's
  move". OPEN (the owner approves CLAUDE.md's rules).

**Order notes from PLAN.md**: the cold-flags fix (V13) before the HTTP-route
changes; the shared loader helper before the "load once, never retry" fixes;
move mp-remnant off the retired map before relying on it; the second-tab
takeover (V3) and two-tab identity (V5) ship under one answer; the duel's
rejoin clear only ships with the worker's re-send.

## Already on main from the sweep (by the commit log)

- v2.3.4154: the 1/2/3 keys take up only a weapon you hold (VB, G2-17).
- v2.3.4155: "Your map" is never refused for its size (V15, M1-1).
- v2.3.4156: a full crash ring still uploads a new crash (VA, N2-1).
- v2.3.4157: the pond memory leak (C5 above).

## Small leads not yet in a wave (PLAN.md, "optional")

- [ ] Monsters drawn as a generic body after a short walk (V17b, R6-5).
- [ ] The Wheel's ground helper retrying after a Wi-Fi blip (V11, G3-4,
  T1-12). Partly touched by item A (a download is no longer cut for being
  slow); the helper's own start is not checked.
- [ ] A computer-only raise of the dressed-shirt cap (V18, R7-3). Unmeasured:
  measure with `lookpalette=0` first.

## The owner's decisions (PLAN.md's numbers)

| # | Question | Answer |
|---|---|---|
| 1 | The expo's per-address limits | Past (v2.3.4158's Test panel switch) |
| 2 | A zone change mid-duel: forfeit after 15 s, or doors refuse duellers? Should a challenge time out on the phone? (V6) | OPEN |
| 3 | Blocks kept by the server, also stopping DMs and requests, and unfriending? (V12) | OPEN |
| 4 | Should the server stop believing the phone about dead, guard, cooking, zone and world size? (V1) | **YES** (2026-11-09) |
| 5 | Two characters in two tabs, and a second tab mid-fight: allowed? (V5, V3) | OPEN |
| 6 | A death pile across a deploy, and the dying window across a closed app (V22, V2) | OPEN |
| 7 | The fight lock: do forging, hardening, gems and equipping count? (V21) | OPEN |
| 8 | The farm's two phone-only workshops: remove or rebuild? (V9c) | OPEN |
| 9 | Smaller: a monster pile 30 s or 60 s; a failed monster look invisible or a stand-in; the guard break shown, and whether the guard comes back by itself | OPEN |
