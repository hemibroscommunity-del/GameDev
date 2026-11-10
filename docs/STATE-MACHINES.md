# The state-machine sweep (2026-11-03) and its fixes (v2.3.4381)

## What it was

A "state machine" here is anything in the game that goes through steps: a
duel (asked, accepted, fighting, over), a trade window, a death (dying, dead,
standing up), a socket (connecting, joined, dropped). Many of these were
never written as one list of steps. They were spread over several true/false
fields set in different places, so two places could disagree about which step
you were in. That is where bugs hide: a duel the phone thinks is on and the
server does not, a trade window nobody can close.

On 2026-11-03 a sweep went through the code looking for these, checked each
finding, and had three reviewers read the result. It wrote a fix plan.

## Where its files are

Not on `main`. They live on the storage branch `claude/state-machine-sweep`
(pull request #1415, never to be merged), in the folder
`docs/state-machine-sweep-2026-11-03/`:

- `README.md`: what the sweep is and how its files fit together;
- `PLAN.md`: the fix plan, one item a system;
- `verified/<V>.md`: each system's checked findings (V1, V2, ... VA, VB, VC);
- `reviews/R1.md`, `R2.md`, `R3.md`: the three reviews.

The owner's readable copy is the doc "Implicit State Machines in BroTown"
(https://claude.ai/artifact/PrspeJRdJWG6ciAYtRspen).

## How to use them

Before you fix an item, read its `verified/<V>.md` and the item's bullets in
all three reviews. Then **confirm each claim in today's code first**: about 1
claim in 5 was wrong when the lanes checked, and the code has moved since.
A fix starts with a test that fails on today's code.

## What shipped (2026-11-10, pull requests #1457 to #1476)

| PR | Tag | What | Kill switch |
|----|-----|------|-------------|
| #1458 | v2.3.4361 | phantom duel: an accept waits for the server's word; a duel swing names its foe | |
| #1459 | v2.3.4362 | trade window: Leave never waits forever; a reconnect keeps a live window | |
| #1457 | v2.3.4363 | the phone never plays a death on its own; one stand-up | |
| #1460 | v2.3.4364 | loot piles on the server's clock (`workerClock.js`); one mayAsk for hand and pet | |
| #1462 | v2.3.4365 | block list: one writer, one table (`blockedAsks.js`); Block stops direct messages | |
| #1461 | v2.3.4366 | dungeon opening ignores a second Enter; one farm trip (`farmTrip.js`) | |
| #1463 | v2.3.4367 | one socket at a time (`socketLine.js`); the "Reconnecting" cover re-checks under the loading screen | |
| #1465 | v2.3.4368 | looks: one head-key builder; chained body retry; eyewear and eye-style "ready" | |
| #1464 | v2.3.4369 | General Store sell tap: one at a time, no old pick (a stop-gap) | |
| #1466 | v2.3.4370 | the ground helper: a failed start retries (`startFetch.js`) | |
| #1468 | v2.3.4371 | a dueller who leaves the zone forfeits after 15 s | `duelzone` |
| #1476 | v2.3.4372 | the points reset's minute survives a rejoin | `pointsresetroom` |
| #1470 | v2.3.4373 | "dead" is the server's word | `serverdead` |
| #1469 | v2.3.4374 | a join at 0 health stands up in BroTown | `joinstandup` |
| #1467 | v2.3.4375 | the old gift trade is closed while the trade window is on | `giftclosed` |
| #1471 | v2.3.4376 | the kill switches load before any web request | (none, on purpose) |
| #1472 | v2.3.4377 | a takeover saves what a close would save | `takeoversave` |
| #1474 | v2.3.4378 | a never-seen party leader's idle clock | `leaderidleat` |
| #1475 | v2.3.4379 | the anti-bot record of a live player is never evicted | `botrecordkeep` |
| #1473 | v2.3.4380 | old skill tracks frozen under prog3: no heal on a forged rise | `skillfreeze` |

A kill switch is a live flag: setting it to `false` brings back the old
behaviour without a deploy. The lessons are in `docs/TRAPS.md` §262-278.

## What is left

This is a list, not a promise. The plan is `PLAN.md` on the storage branch.

**In flight on 2026-11-10:** the rejoin re-sending a live duel and trade
(v2.3.4382); a death pile's windows sent as time left (v2.3.4383).

**Not started, no decision needed:** rare armour lost on the phone after a
reconnect (V9b); quest and gear predictions the server refuses without a word
(V9a, V9b); friend requests (V12); a monster's life across deaths (V7); the
shield's kept parts (V10); art loads and the renderer's rebuilds (V17a,
V17b); the small-bugs bundles (VA, VB, VC); the General Store's request
timeout (V8a); the feedback board's typed id (VA); dungeon ids made up on the
phone (V1, V6); the money-in-one-write items (V8a, V8b).

**Waiting on the owner:**
- a second tab in the middle of a fight, and two characters in two tabs (V3, V5);
- whether forging, hardening and equipping count as leaving a fight (V21);
- the farm's two phone-only workshops (V9c);
- a server-side "entering" grace for the dungeon's loading screen (V11; TRAPS §262);
- showing the guard break on the phone (V10);
- a death pile surviving a server restart (V22);
- a monster's pile: 30 or 60 seconds;
- hiding a blocked player's attack warning;
- a grace period for a trade that loses its server.

**Already red on `main`, not the lanes' doing (2026-11-10):**
- `node tools/world/test-world-core.mjs --check` fails 2 of 540 (the Town
  Hall window, the forge room's stage);
- `mp-farmmusic` step 4 (the frost land's music after the farm gate);
- `node tools/art/head-bake.mjs --check` listed 49 stale head sheets on the
  orchestrator's machine, the same on `main` before any lane. Unconfirmed: it
  may be that machine's picture encoder.

## How the lanes were run (for the next orchestrator)

1. **One system a lane, one pull request.** The brief points at
   `verified/<V>.md` and the item's review bullets instead of pasting them,
   and the lane confirms each claim before fixing it.
2. **A test that fails before and passes after.** Node tests in
   `server/test/`, not phone scenarios, wherever node can reach the code.
3. **Lanes never collide.** They never append to `docs/TRAPS.md` or
   `server/test/liveops.test.mjs` (each put its lesson under "For TRAPS" in
   its pull request body), never put a new import in the middle of a block,
   and are told which lines sibling lanes touch. Before anything merges, the
   orchestrator merges every open lane branch together, in both orders, in a
   scratch `git worktree`, and runs precheck and the server suite on the
   result.
4. **Lanes do not message the orchestrator.** It checks each wave once.
5. **The reviewer reads every diff.** It caught a brief of the orchestrator's
   own that would have hidden live trades on a reconnect (TRAPS §278).

And: every merge with a file under `server/` deploys the worker, a test
included (TRAPS §277). Merge a batch together, in a quiet hour.

## Smooth on every device: items A, A2, A3 (v2.3.4400)

The owner's first goal for this work (2026-11-09): "the game runs smoothly on
whatever device or browser, computers included". These three are not from the
sweep's plan: they are the judges' computers at the expo (2026-11-05) and the
owner's own iPhone, each found from a capture of the frame meter (`?perf=1`).
One line an item, ticked when done; a session takes the first open one.

Also from that day, the owner's answer to the plan's question 4 (should the
server stop believing the phone about dead, guard, cooking, zone and world
size?): **YES**. "Dead" is the server's word since v2.3.4373 (above).

- [x] **A. Patches like a checker pattern round the edge of the view, and
  "not smooth", on the judges' computers.** DONE, v2.3.4400.
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

- [ ] **A2. How a computer DRAWS the game.** OPEN: next, by the
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
  - **Prepared without a computer** (v2.3.4400), all of which reach a
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
    **A lead that needs no computer** (measured on the test box, v2.3.4400,
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
  town".** PART DONE, v2.3.4400; still OPEN. The owner, on the fix below:
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
