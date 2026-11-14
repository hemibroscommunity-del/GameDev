# The grand plan: what to build next, in what order, and when each part is done (v2.3.5020)

**Plan version 2, 2026-11-13, after the review.** Nine experts each attacked
one system of version 1, then three reviewers attacked the seams between
systems. What they found and what was done with it:
`docs/specs/grand-plan-review.md`. A session does not read all of this file:
it reads its card (`docs/plan/cards/`) and the ten rules at the top of part
5, and reads them again before each PR.

The owner, 2026-11-13: *"make a grand plan for this codebase that can then
guide future development ... look at the sessions around architecture and
performance enhancements (especially per device per browser)."* The aim it
serves (2026-11-09): *"bulletproof performance wise depending on the device
and software ... preventing malicious attacks ... buttery smooth."*

And for the review (2026-11-13): *"carefully future proofed. This means
anticipating a future where AI agents will heavily be involved in assisting
players with payments, external research, etc (I don't even know) and ...
bots that will slip into the game undetected, but have systems in place that
can carefully fingerprint and detect any anomalies so the game's integrity
can be preserved."*

**This is the plan above the plans.** It does not repeat them. It says what
the last five months of fixes have in common, names eleven finish lines,
puts the open work in one order, and (part 11) cuts it into sessions. The
detail stays where it is (`STATE-MACHINES.md`, `PERFORMANCE-IDEAS.md`,
`SERVER-SPLIT-PLAN.md`, `REBUILD-PLAN.md`, `MEMORY-MAP.md`, the specs).

History never goes in this file: it goes in a step's spec. Each step that
changes what a player sees still needs the owner's yes (part 9).

## 1. The short of it

- **The game is measured where it is not played.** Every automatic check
  runs in one browser engine on a test box with no graphics chip. Device
  problems reach us as the owner's screenshots, one at a time.
- **The game does not record who acted, and keeps almost nothing of what
  happened.** A helper acting for a player would have to hold the player's
  whole login key, and would look the same as a thief or a bot. Gold that
  moves between players leaves no lasting trace. Both are cheap to decide
  now and a rewrite later.
- **The door is never the defence.** A bot in a real browser passes every
  check a person passes. So the game judges what an account does over time,
  and keeps the records that make that possible.
- **The house already has its best pattern: one table, one door, a test
  that fails a second way in, and a line that only goes down.** Most of this
  plan is that pattern, applied to what is not yet held.
- **A gate that GitHub does not run is not a gate.** Only the server's test
  suite is required before a merge. Every new wall in this plan is a test in
  that suite.
- **No pull request merges on its own green.** A gatekeeper session merges
  every ready branch together in a scratch copy, runs the checks on the
  whole, and gives the owner one list.
- **The first three days build rails and instruments.** The big moves of
  code come after, when they can be checked.
- **No rewrite, no new engine, no new framework. Scale waits for players.**

## 2. What the fixes have in common

Eight root causes. Each is a pattern in the record, with where it shows.

1. **Measured where it is not played.** The test box draws in software at
   about four frames a second, in Chromium only. The primary platform is
   iPhone Safari. What only a real device showed, each found by the owner:
   - a body vanishing on four facings (v2.3.3864: an iPhone's chip keeps
     16 bits where the box keeps 32);
   - the judges' checker pattern (a first visit on a slow line);
   - 106 frames a second falling to 51 after 24 minutes (heat);
   - the skateboard's grit.

   Crash reports have a road home. Smoothness has none
   (PERFORMANCE-IDEAS 1b is not built). The server has no report of its own
   either: no alert, no daily row.
2. **Each device choice is made where it was needed.** The look palette is
   off for Windows and for a Mac by NAME (`lookPaletteChoice.js`). One
   drawing program, the pacer, the screen's resolution and the crowd cap
   each decide for themselves. About 120 `?name=0` off-ramps are named in
   the client. Nothing steps down when a phone gets hot or full.
3. **Pixel work happens when a thing is first seen.** Ten of the thirteen
   families on the debt list (`held-budget.mjs` `KNOWN`) are one fault: art
   recoloured, packed or composed on the page the first time it comes on
   screen. The other three are the test box's or the browser's own.
4. **The client has no walls.**
   - three files of 16 to 19 thousand lines, nearly half of them the
     comments the house asks for. The unreadable unit is the function: the
     game loop is about 3,600 lines and `_updatePlayer` about 3,200;
   - the state object `S` has about 610 field names, most created on the
     fly, 146 written from two or more files; another 850 variables at the
     top of files hold state too (a reviewer's counts: card D's census
     replaces them, with how each was counted);
   - `window._gameState` hands the whole state to anyone with the page open;
   - REBUILD-PLAN took `BroTown.jsx` down to 8,969 lines. It is 15,938
     again, because nothing held the line.
5. **Rules are kept in step by hand.** CLAUDE.md §8 has 21 rows of "if you
   add X, also change Y". The wire's rules live in four lists, ten or more
   smaller ones and about 139 cases of the router. About 100 test suites
   read the big client files as text and look for exact lines, so moving
   code turns them red or, worse, leaves a "must not exist" check passing
   for ever.
6. **Old paths never leave, and stack.** Every saver lands on with an
   off-ramp (the owner's rule, and a good one). None has an end. About 98
   switches on the server are on by default; tests throw one at a time; a
   thrown switch is stored and outlives deploys. So the live game can run a
   combination no test runs.
7. **The project's memory costs more each week.** The written documents are
   3.4 MB: TRAPS 580 KB (339 traps), CLAUDE-HISTORY 465 KB, UI-DESIGN-NOTES
   457 KB, 467 specs. A trap kept as prose is paid for on every read. A trap
   kept as a test is paid for once.
8. **Nobody is named as acting, and nothing is kept.**
   - a login key is the whole account, with no scope and no way to take one
     helper's access back;
   - the gold log is the last 32 moves of a purse, in memory; a sold listing
     is deleted; a trade names its other side only in a note;
   - a restore covers the character and not the bank, pets or listings, so
     putting a player back can copy goods;
   - a deploy wipes the room's memory and runs no "leave", so anything
     counted in memory is lost up to dozens of times a day.

### What is measured on each device today

| Device and browser | What is known | How it is measured |
|---|---|---|
| iPhone Safari (primary) | 60 frames a second unless the owner's flag is off; the tab dies near 250 MB; heat halves the frame rate in a long session; the chip's name and the model are hidden from a page | the owner's `?perf=1` screenshots |
| iPad | more pixels than a phone, same engine | nothing |
| Android Chrome | the engine is the test box's; no real chip has run the game; many of its chips keep 16-bit numbers in a drawing program, as the iPhone's does | nothing on a device |
| Windows, Chrome or Edge | the judges' machines; every look is baked on the page; building the look palette's program froze it for minutes (TRAPS §259) | `mp-desksmooth`, in software |
| Mac, Safari or Chrome | the look palette is off by name; it can probably build it | nothing |
| Firefox, any machine | unknown | no test runs it |

## 3. Where it stands (2026-11-13, main at v2.3.5019)

From wave 0 on, a machine makes this table (`tools/dev/scoreboard.mjs`). A
session never reports its own numbers.

| Measure | Today | The line to reach |
|---|---|---|
| Devices that report their own smoothness | 0 | every sitting |
| Device choices made by a name, outside the profile | the look palette, others | 0 |
| Hold families on the debt list that are ours to fix | 10 | 0 |
| Controllers reading "the frames are late" | 1 (the pacer); the plan adds more | 1 |
| Wire rows that say who may start them and what they do | 0 | all, the HTTP routes included |
| Bounded claims, and what a lying phone gains by each | not counted | counted; each gain at most 1.5 times an honest player's |
| Unexplained gold in the whole world's sum | not measured | 0 |
| Losses the restart test knows of | listed in `chaos-restart.test.mjs` `KNOWN` | 0 |
| Records of value a restore covers | the character only | all, by the registry |
| Longest function in the client | about 3,600 lines | a line that only falls |
| Code lines in the largest file, comments not counted | about 8,700 | a line that only falls |
| State fields with an owner and a lifetime | the monsters' | all, by system |
| Switches with a row (risk, what it needs, fallback or not) | 0 | all |
| Art: MB held at the memory check's fight, by family | by hand, `pictures-256.md` | by machine, each family at its bar |
| Supplied files with their papers (where from, licence, AI-made) | 0 | all |
| Tests red on `main` | listed in STATE-MACHINES | 0 |
| Traps held by a test that has a break proof | not counted | counted, rising |

## 4. The eleven finish lines

1. **Every device reports.** A device problem is first seen in a table.
2. **One ladder, one controller.** Every quality choice reads one lane; one
   state machine decides when to step.
3. **Nothing of ours holds the page.** In a crowd, on every lane.
4. **The server believes nothing it cannot bound.** A request is judged; a
   claim it must take is bounded, and what a liar gains by it is measured.
5. **The books balance and can be put back.** Everything of value in the
   world sums to what the game made less what it took; a player can be
   restored without copying goods.
6. **The client has walls.** Steps with names, state with owners, tests that
   find code by system.
7. **One table per rule, one shape per thing.** Designed once, in one place.
8. **Old paths leave; fallbacks stay.** Two configurations are supported:
   all new, or one switch thrown.
9. **Working here stays cheap and checked.** One page a system; no merge on
   a session's own word.
10. **Every file goes through the asset door, with its papers.**
11. **The game knows who acted and what an account did.** Bots are found by
    what they do; a declared helper has a lane of its own.

## 5. The work

### The rules every step keeps

1. **A gate is a test GitHub runs.** A new wall is a suite the required
   check runs: under `server/test/` when it tests the server, under
   `tools/guards/` (run by `server/test/run.mjs`, no deploy) when it reads
   source or counts things. Precheck stays the fast local copy.
2. **A shape is designed once.** Before a step adds an id, a record, a wire
   column or a feed, it gives it one row in `docs/SHAPES.md`: its one
   writer, its readers, its cost in rows. A guard fails a second definition.
   A session that needs a shape another card owns asks for a column and
   never builds a twin.
3. **A table lands as a census.** Its count of unlisted things may only
   fall. The gatekeeper alone makes it strict, in a PR of its own, once
   every open branch holds the table and its mover's card is open. The
   mover lands within seven days or the table is removed. Until then the
   old list is the truth. Sets that value hangs on (roads, storage keys,
   rows that move value) are strict from the start.
4. **Two configurations.** All new, or exactly one switch thrown. A new
   switch's row names what it needs; a dependent turns off with what it
   needs; a guard runs its system's suite once with it thrown. Where the
   dependent may never go off (a ledger), the switch beneath is removed
   first.
5. **What the sums read is written with what it counts.** In the same put.
   Nothing that matters lives only in memory across a deploy. A session is a
   sitting, not a socket.
6. **One controller a signal, and a budget for what is shared.** Each system
   declares, in one table a guard reads, what it reads, spends or controls
   of the shared things: ms on the page's thread, lateness, MB, the loading
   screen's seconds, rows, messages, and how a player looks to the server.
   The guard fails a second controller, or a sum over its line.
7. **No PR merges on its own green.** Part 11.
8. **A finish line has a break proof.** A guard records the one-line change
   that turns it red. A number met by renaming is not met.
9. **Records that cannot be made up later start first. Features wait for a
   number** (part 7).
10. **The door is never the defence.** Judge what an account does, not
    whether it is a person.

Each step is marked **[NOW]** (the rails, the instruments, what cannot be
made up later), **[NEXT]** (before real players) or **[LATER]** (when a
number or a player asks: part 7). "Step 1 changes nothing" means the door's
way: build the table from what exists, add the test, move no behaviour.

### Pillar 1. See: the field report

- [ ] **1.0 [NOW] One list of hold names.** The phone's own notes
  (`madeLog.js noteMade`) take only the debt list's names, and
  `mp-heldsweep` fails a known hold that left no note. Without this the
  report cannot name what the sweep names.
- [x] **1.1 [NOW] The report**, one `report` message on the game's own
  socket (the crash road takes posts from anyone, limited only by an id the
  sender invents). Numbers and closed lists only: no free text reaches a
  table a coding session reads. Fixed bins, not percentiles, so days can be
  added. In it:
  - the device class (2.1), the lane, the switches thrown, the build;
  - frame times, late frames, the strip's split of a late frame;
  - the worst holds by name (1.0), the zone and how many players were near;
  - the game's own memory count, lost graphics, "the tab died last time"
    (sent at the next join);
  - the line's delay and how much it wavers.

  On the server each field has one sink (`docs/SHAPES.md`). Smoothness loses
  its player and joins the day's bins by device class. A few integrity facts
  (a software chip, frames drawn against moves sent, seconds visible) go to
  the sitting's card (10.2). A kill switch, a cap, a row in the About panel,
  and a stated time kept.
  *Merged: #1703 and #1706 (card A), the phone's side (`src/debug/report.js`)
  and the worker's (`server/src/report.js`). Ticked by the gatekeeper,
  sitting 6 (v2.3.5362).*
- [ ] **1.2 [NOW] The Speed test sends its card**, with a model name the
  player picks from a list (a page cannot read it). Until 1.3's reader, the
  Test panel has "copy table" and the owner pastes it.
- [ ] **1.3 [NEXT] The reader and the device table.** A session cannot reach
  the live game, so the table needs a road into the repo: a workflow, in the
  owner's own words (call 6). Each cell prints how many reports it holds and
  is blank under 20. A perf PR quotes the Speed test's own off-and-on step,
  not a week-to-week difference.
- [ ] **1.4 [LATER] Real engines, on demand**: `playable` in Playwright's
  WebKit and Firefox. Engines, not chips.
- [ ] **1.5 [NEXT] Two slow profiles** from switches that exist ("a budget
  Android", "an old laptop on a hotel's line"); the `light` lane's sweeps
  run under them.
- [ ] **1.6 [NOW] The room's own row**, in the day's book (10.4): the tick's
  95th, rows written, saves refused, joins by protocol version, restarts.
- [ ] **1.7 [NEXT] A self-test at the door.** The report cannot see a body
  that vanishes at perfect frame times. Each of the game's own drawing
  programs draws a known picture behind the loading screen and compares it
  with the page's recolour. One that fails falls back alone, and the report
  names it. Each has a forced-fail scenario.

**Done when** a session answers "how does it run on X" from the table.
Every step that needs field numbers says how many reports from how many
devices it waits for: with one player, the table is empty for weeks.

### Pillar 2. Adapt: one ladder, one controller

- [ ] **2.1 [NEXT] The device class and the lanes.** The class is facts
  only: the chip's limits, software or not, a coarse timed fill, pixels,
  the screen's rate. Never a timed bake or a timed program build: a cold
  phone behind the loading screen always answers "fast", and timing the
  look palette's build is the Windows freeze. A lane is a ROW of knobs:
  the pixel budget, the passes, the crowd cap, how a look is made, one
  program or three, the pacer's target, the queue's ms, the prewarm ring,
  the cache caps. The speed rung starts where the last sitting settled.
  Every phone test names its lane; `run.mjs` refuses one that does not.
- [x] **2.2a [NOW] The pixel budget** for big screens (STATE-MACHINES A2
  item 1). Safe for phones: they are under it.
  *Merged: #1701 (card G), `src/game/renderRes.js`, `?pixbudget=0`.*
- [ ] **2.2b [LATER] The look palette on computers**: a smaller program
  (TRAPS §259's cure), built without blocking against a deadline, else the
  bake. Waits for reports from real Windows machines.
- [ ] **2.3 [NEXT] The governor is the pacer, grown.** One state machine,
  one table: `framePacer.js` owns the one verdict "late" on every screen
  (today it gives none at 60 or 30). It picks its axis from the strip's
  split: the game's own work, then the crowd and the rate; waiting for the
  chip, then pixels and passes. Pixels move only behind a veil, a covering
  window or a tab's return (a live resize rebuilds the crowd's shared
  picture, the worst moment to do it). A full memory frees caches and
  crowd, never resizes. Off in the test box unless a test asks for it.
  **Combat's timing and loading are never on the ladder.** Done when a node
  model of a heating and cooling phone settles and comes back at 30, 60 and
  120, with no see-saw.
- [ ] **2.4 [NEXT] Off-ramps become overrides of the ladder**, through one
  reader (pillar 7's table).
- [ ] **2.5 [NEXT] The 30 lane** (an iPhone in Low Power Mode): named by the
  pacer, the step's cap set by lane (today 50 ms, which at 30 turns one
  missed refresh into slow motion). To confirm with 1.1.

**Done when** no name of a system or browser decides a quality choice
outside the profile.

### Pillar 3. Never hold the page

- [ ] **3.1 [NOW] The debt list, ours first.** Each row of `KNOWN` is marked
  ours, the box's or the browser's. Done when no row is ours. The order is
  by size until the table has numbers. Found by the review and first in
  line: a bake worker let go after 20 silent seconds is never started again
  (`bodyBake.js`), so a phone back from its lock screen may bake on the
  page for the rest of the sitting. Watch clocks count visible time; one
  restart; `mp-bodyworker` survives a frozen page.
- [ ] **3.2 [LATER] One queue for work that is not this frame's**, with
  priorities. It takes nothing while the frames are late or the pacer is
  trying a step up. Work put off (after a fight, at a veil) joins it one a
  frame, never all at once. Its ms are a column of the lane.
- [ ] **3.3 [LATER] Make it before it is seen**: a ring ordered by time to
  arrival, capped at the cache less what is on screen. (The server's "near"
  list is 2,400 px, the whole town: not a ring.)
- [ ] **3.4 [LATER] A look is a few colours, on every lane.** The bake stays
  as a fallback while anything can still fall back to it (7.1).

**Done when** no row of the debt list is ours, on the crowd tour, in the
`full` and the `light` lane (once 2.1 has made lanes). In the field: holds over 16 ms a minute of
play, a number 1.1 can measure.

### Pillar 4. The server's word

- [ ] **4.1 [NOW] The wire census.** Every message both ways, the HTTP
  routes too (the market's, the store's, the arena's are in no list today),
  one row. The columns are in `docs/SHAPES.md`. These need the handler read,
  so they are filled in the one reading:
  - where it comes in, its envelope, the sender's phase;
  - who may start it (a person, a helper with a grant, the system, the
    owner, never a helper);
  - what it does (reads, changes your own state, moves value out, cannot be
    undone, speaks, plays);
  - its request id, if a repeat must not act twice;
  - each field's trust: a **request** the server judges, a **look**, a
    **claim** it believes, a **bounded claim** with the name of its judge,
    or **words** a player wrote;
  - what "absent" means and what a bad value gets (clamped, dropped,
    refused).

  First PR: the door tests read `server/src/` in depth, so a new folder is
  not invisible to them. Step 2 [NEXT]: the lists and the checks at the door
  are made FROM the table as checked-in source, with a hostile-values suite.
  *Step 1 merged: #1667 (card C's census), #1684, #1695 and #1697 (card N:
  the walker, the table `server/src/wire/`, its guard). Step 2 is card K's;
  the box waits for it (the gatekeeper, sitting 7, v2.3.5363).*
- [ ] **4.1b [NEXT] The send door**: one `_send` (132 places write to a
  socket today), counting bytes by type.
- [ ] **4.2 [NEXT] Claims, bounded.** "No claims" can be met by calling a
  loose check a judge. So each bounded claim carries its **gain**: a
  maximal liar's take an hour over an honest player's, measured by a house
  bot written for it. Every gain at most 1.5, in `npm test`; and an honest
  player on a slow line meets no refusal. Known today, to measure first:
  - a sword hit is accepted from 400 px (`PVE_MELEE_RANGE`), and a miss
    never reaches the server;
  - a move is accepted up to 500 px a second (`MOVE_BUDGET`), with no walls;
  - the harvest's grade, the cook's result;
  - the guard and cooking beyond #1530's limits; the quest hand-in and the
    weapon sale with no take-back; gold taken on the page in two panels;
    the local-monster mode; a sword's claim labelled a bow's (TRAPS §329).
- [ ] **4.3 [NEXT] Doors for what is left of value**: experience and
  levels, the stashes, quest state, skill points. A weapon gets an id of its
  own, as gear has.
- [ ] **4.4 [NOW] The whole world's sum.** "A purse equals its start plus
  the roads that ran" is true by construction; past copies went through
  legal roads (ore sold 24 times in one bundle). So every road in
  `GOLD_ROADS` and `BAG_ROADS` is marked mint, burn, move or escrow, and the
  storage registry marks every record that holds value. Purses, vaults,
  mail and every escrow equal the start, plus minted, less burned. Done
  when a planted double pay through a legal road fails the suite, and so
  does a value record nobody counts.
- [ ] **4.5 [NOW the harness; NEXT the rest] The restart test, finished.**
  It exists (`chaos-restart.test.mjs`) and passes while it lists a known
  loss. One shared room for tests: a batch that commits or does not, a
  queue that knows the room's gates, a seeded clock. Then: `KNOWN` empty; a
  save the storage refuses is counted, and an action that moves value fails
  closed; the storm of 4.4 replays under a closed list of disturbances (a
  deploy at any message, a hidden tab, 30, 20 and 4 frames a second, each
  lane) and ends with unexplained gold 0, no honest player flagged, no
  reload and no dead worker.
- [ ] **4.7 [NEXT] The way back.** A player's restore made from the registry
  (every record of theirs, not the character alone); a paged export; a
  restore tried in the Cloudflare lab; the storage's size in the day's
  book. Done when a lab restore to an hour ago balances 4.4's sum.

(4.6 of version 1 is pillar 10.)

**Done when** every bounded claim has its number, 4.4 and 4.5 are green with
nothing known, and a restore copies nothing.

### Pillar 5. Give the client walls

- [x] **5.1 [NOW] Four lines**, as a guard: code lines by file (comments
  are the project's memory and are not counted), the longest function,
  import cycles (five today), and writes to `S` from `src/rendering/` (89
  today). Only the gatekeeper lowers a line.
  *Merged: #1687 (card B), `tools/guards/four-lines.test.mjs`. Ticked by
  the gatekeeper, sitting 5 (v2.3.5361).*
- [x] **5.2 [NOW] The system map**: each system's files, spec, traps,
  tests, doors, switches. An `unsorted` bucket with a falling count, since
  `src/` gains a file every few hours.
  *Merged: #1689 (card B), `docs/SYSTEMS.md` and `tools/guards/lib/systems.mjs`.*
- [x] **5.2b [NOW] Tests find code by system.** One helper reads "the files
  of system X"; a suite that names a big file is listed, and the list only
  falls. No file moves before the suites that read it are converted.
  *Merged: #1690 (card B), `tools/guards/lib/filesOf.mjs`.*
- [ ] **5.3 [NEXT] The state ledger.** Step 1 is made by machine: every `S`
  field and every top-of-file variable that holds state, its writers, its
  system; lifetime "the sitting, never reset" until someone says otherwise.
  Rows live in one file a system. Step 2, a system at a time, each with its
  switch: a reset is a value, a function, or "kept, and why"; state outside
  `S` joins through `resetOn(edge, fn)` at the one zone door.
  *Step 1 merged: #1721 to #1734 (card U), the ledgers in `src/state/` and
  `tools/guards/state-ledger.test.mjs`, 16 rows left unlisted (four files
  the map has not placed). Step 2 is card L's; the box waits for it.*
- [ ] **5.3b [NEXT] The phase table** (the owner, 2026-11-13: every implicit
  state machine explicit, through one door). Every state machine one row:
  its one field, its states, the one function that changes it, what clears
  it, what a rejoin re-sends (`REJOIN_SLOTS`). A guard fails a second
  writer. Has one today: the life phase, the session, a monster's life, the
  zone. To do: duels, trades, parties, harvesting, cooking, the guard,
  dungeons, the arena, fishing, the connection, loading, the open window.
- [ ] **5.4 [LATER] The frame as named steps.** PR 1 moves nothing: the six
  calls the loop already makes, plus one `legacy` step, become the list;
  each counts its errors to the crash ring (a throw in the frame reaches
  only the console today) and its time summed over 600 frames (Safari's
  clock ticks in whole ms). First move: the monsters' step. After 5.2b and
  5.3.
- [ ] **5.5 [LATER] The two renderers split** along the system map. After
  5.2b.
- [ ] **5.6 [LATER] Types on the new walls only**: one `getState()`, the
  action door, the frame's context, the wire folder. As a suite, with
  TypeScript as the server's test tool. Typing the old code is a flood.
- [ ] **5.7 [NEXT] Close the open hand.** `window._gameState` and
  `_gameFns` are not on a player's page; QA's probes attach under a token.
- [ ] **5.8 [NEXT] The action door.** `src/game/actions.js`: one function a
  request row; a guard fails a send from anywhere else (150 places pass one
  allowlist today). Each call carries the request id. It is also where a
  helper would act (pillar 11), so it is built once.
- [x] **5.9 [NOW] Pins.** PixiJS at an exact version; the places the game
  patches its inside, one table with a test.
  *Merged: #1702 (card B), PixiJS at 8.17.1, `tools/guards/pixi-pins.test.mjs`.*

### Pillar 6. One table per rule

- [ ] **6.1 [NEXT] Each row of CLAUDE.md §8 names its test and its break
  proof.** A row with none is on the list to fix.
- [ ] **6.2 [LATER] Copied tables become one**, as leaf files with no
  imports under `server/src/`. A build check finds no server-only value in
  the page's script. Each table's hash rides in `state_sync.caps`; a
  mismatch asks the build watch to look now and never reloads by itself:
  the page and the worker deploy apart, so a mismatch is normal for minutes.

### Pillar 7. Let old paths leave

- [ ] **7.1 [NEXT] The switch table.** Every `?name=` (220 reads in 132
  files today) and every live flag one row: born, what it turns off, its
  risk (logic, memory, the chip), what it needs, and whether it is a
  **fallback** with the trigger that still uses it. One reader. Rule 4 is
  held here.
- [ ] **7.2 [NEXT] The end date** (the owner: yes). For a logic switch: four
  weeks on with no revert, then the old way goes. A device off-ramp stays
  while its risk is live. A fallback stays while its trigger lives: a guard
  fails reaping one. Nothing is reaped by age in the first sprint: every
  step is adding switches.
- [ ] **7.3 [LATER] Reap by system**, a batch a PR, each saying the bytes
  and MB that went.
- [ ] **7.4 [LATER] The big leftovers**, each the owner's call: protocol v1
  (counted by the SERVER's joins: the page always says 2), dormant systems,
  the old map's last code.

### Pillar 8. Keep working here cheap and checked

- [x] **8.0 [NOW] Wave 0: the rails** (part 11): scenarios found by file
  name, guards in files of their own, tag blocks, status files, the
  scoreboard, the gatekeeper's script, the baseline.
- [ ] **8.1 [NOW] Red on `main` is zero.** Fixed, or deleted with its
  reason. Never skipped.
- [ ] **8.2 [NEXT] Traps become guards**, each with a break proof. The count
  that matters is traps held by a proof, not traps of prose.
  *Card V merged, #1724 to #1740: 31 traps held by a proof (25 the rule, 6
  one case; its status names what is left for the next card). The step is
  open: most traps are still prose.*
- [ ] **8.3 [LATER] Docs by system**, with an index that keeps every §.
- [x] **8.6 [NOW] The shapes page** (`docs/SHAPES.md`, rule 2): the actor,
  the ids, the roads' classes, the report's sinks, the wire's columns, the
  device class. Frozen before the sessions that read them start.
  *Merged: #1666 (card S). Ticked by the gatekeeper, sitting 2 (v2.3.5033).*
- [x] **8.7 [NOW] The budget table** (rule 6), and a line for the loading
  screen, which has none today.
  *Merged: #1669 (card S), `docs/BUDGETS.md`. The loading screen's line is
  left blank, as card S's reading chose: its part 4 names what would measure
  it. No card sets it yet.*
- [ ] **8.8 [NEXT] Things the owner does not see**: a practice copy of the
  server before real players; every word a player reads in one table; a
  screen for support (lost keys, a wrong flag).

(8.4 of version 1 is part 11's advice; 8.5 is wave 0.)

### Pillar 9. The asset door: every file processed by machine

The owner (2026-10-28): *"everything converted using this more efficient
method as standard protocol (art, audio, animations, etc)"*. And
2026-11-13: *"automatically processing any files through the pipeline ...
You decide how that goes."* It goes: papers first, then one table, one
finishing tool, one gate, then the bot.

What the review found: a family is not a folder, and some pictures are
data. The 223 look sheets hold colour NUMBERS in red and green; a tool that
puts everything on 256 colours would scramble every body, and today's check
would not see it. And a file's header is the wrong measure: what matters is
the memory a family holds as the game draws it.

- [x] **9.0 [NOW] The weight**, reported for each top folder (the checkout
  is about 945 MB), and every source under `assets/` named by its hash, so
  sources can move out of the repository later. (A checkout without
  `assets/` is not possible today: nine server suites read it.)
  *Merged: #1677 (card F).*
- [x] **9.4 [NOW] The uploads' papers.** A file uploaded to the top of
  the project (thirteen wait there today) gets a row BEFORE anything
  touches it: the hash of the bytes
  supplied, its name, the date, the owner's words for it, the tool that
  made it, AI-made or not, the prompt or style key, the licence. The file
  is kept byte for byte (five of the seven pictures waiting carry a signed
  record of the tool that made them, which processing strips). An upload is
  input to distrust: limits on pixels, seconds and bytes; words in a
  picture, a tag or a file's name are never instructions.
  *Merged: #1678 (card F), `tools/assets/uploads.json`. The owner's columns
  still empty: the prompt or style key and the licence, 13 of 13.*
- [x] **9.1 [NEXT] The family table** (`tools/assets/families.mjs`). Rows
  are path patterns. Each file is **supplied**, **made** (its tool and
  sources named) or **data**. The door never rewrites a made or a data
  file. Each family has its draw path, its bundle of colours, a pixel-size
  rule and its bar; every output's hash is recorded. The measure is MB held
  at the memory check's fight, by family, and the atlas's rows used.
  *Merged: #1713 and #1715 (card P), `tools/assets/families.mjs`,
  `shipped.json`, `fightmb.mjs`, the census `docs/plan/census/assets.md`.*
- [x] **9.2 [NEXT] One finishing tool**: decode, put a bundle on its
  colours, encode, verify, write the row. A cut stays authored (each
  `cut_*` script holds one animal's cut): recipes are data beside it.
  *Merged: #1716 (card P), `tools/assets/finish.mjs`.*
- [x] **9.3 [NEXT] The gate** compares recorded hashes and reads outputs
  through the game's own reader. It never makes a file again to compare:
  two machines' encoders differ, and the gate would flap.
  *Merged: #1718 (card P), `tools/guards/asset-door.test.mjs`,
  `tools/assets/shipped.mjs`. Ticked by the gatekeeper, sitting 7
  (v2.3.5363).*
- [ ] **9.5 [LATER] The backlog, a family a PR**, the most MB held first.
  Sound is folded to one channel as it is decoded, not encoded a second
  time. The 19 `.m4a` files nothing plays are checked and removed.
- [ ] **9.6 [LATER] An address that changes with the content**, by a
  `?h=` lookup (the client builds a hundred sprite addresses as it runs;
  renaming files would break them). A wrong hash on art that loads in play
  marks the page stale, and it reloads at the next veil. No service worker.
  Real bytes on the loading bar is a step of its own.
- [ ] **9.7 [LATER] By itself, on upload** (the owner's words: a
  `.github/` change). The bot opens a pull request; it does not commit.

### Pillar 10. Integrity when not every player is a person

What is built today catches a script that is too fast, too even or too
straight. A model driving a real browser on a real phone passes it all. So
the watch is on what an account does, in records the server makes itself.
"Flag, never act" stands (`docs/specs/server-botsig.md`): nothing here
punishes by itself.

- [x] **10.1 [NOW] The shapes** (8.6): the actor on every session; a
  sitting's id made by the server; one request id; the roads' classes.
  *Merged as shapes: #1666 (a section of `docs/SHAPES.md`). No card builds
  them yet; the roads' rows are card E's.*
- [ ] **10.2 [NEXT] The sitting's card.** About 120 bytes: when, how long,
  active seconds, the longest gap, the network, the build; moves and moves
  over budget; hits claimed, landed, refused by reason; gold by road class;
  the hours of the day played. Its counters ride a save that is already
  paced, and a card cut by a deploy is closed at the next join. No new row.
- [ ] **10.3 [NEXT] The transfer ledger.** One lasting row each time value
  settles between two players, in the settlement's own write: when, the
  road, from, to, gold, goods, their ids, the price. Kept 90 days. One row
  a settlement, none a kill, held by `cost-guard`.
- [ ] **10.4 [NOW its room and device rows; NEXT the economy's] The day's
  book and the owner's card.** One book a day: minted and burned by road
  class, the room's numbers (1.6), the device bins (1.1). The owner's card
  in the Test panel reads it. Five numbers for the economy: unexplained
  gold; gold made a player-hour against the week; the share moved one way
  for nothing; the share of new gold reaching the richest; cases waiting.
- [ ] **10.5 [NEXT] The roads between players, one table.** Every road that
  moves value from one account to another, one row: its fee, its hold, its
  pace, its ledger. All zero today (a trade moves 999,999 gold with no fee,
  and the daily spin pays a new character about 464 gold). A guard fails a
  road with no row. Turning any of them up is the owner's call.
- [ ] **10.6 [NEXT] What an honest player's trouble looks like.** Each
  signal lists what changes it without any cheating: the frame rate, the
  line's delay, a deploy, a hidden tab. Every Low Power iPhone shares one
  rhythm, and every deploy starts every session in the same second: both
  read as a fleet of bots unless the signal knows.
- [ ] **10.7 [NEXT] The league**, tools only. The house's own bots, each
  rung harder: a script on the wire; one with noise; the real page driven
  by a script; a person's recorded play replayed; a model driving the
  browser. A detector is scored on bots written by another session after it
  was frozen. Replays run at 60, 30, 20 and 4 frames a second and through a
  deploy. `npm test` fails when a person's trace is flagged or an easy rung
  is missed.
- [ ] **10.8 [NEXT] The owner's play is the first human record.** With the
  owner's yes: the first ten active minutes of a sitting, one row, labelled
  human. Test mode runs the checks in shadow and records "would refuse",
  because today the one real player is not measured at all.
- [ ] **10.9 [NEXT] Evidence and cases.** A flag keeps its detector's
  version, the hidden settings' version and its numbers, so it can be
  explained from its record alone. The owner's cases: a hold on one
  account's transfers, a take, "unwind this transfer" from the ledger, a
  mail with the reason, undone in one tap. "Scam" as a reason to report; a
  block the server keeps; a login key refused in chat.
- [ ] **10.10 [NEXT] Before the chain or the pass.** A score goes to the
  chain the moment it is crossed, on a contract nothing can retract; a pass
  that can be given can be sold for gold. Part 7 holds both until 10.3 and
  10.9 exist.

**The line, written now.** The game enforces effects: hours, accounts a
person, funnels of value, bounded claims. A declared helper gets a marked
lane (pillar 11). The game does not try to tell a model from a person input
by input, detect a changed page, hide its code, or add gesture fingerprints:
each is an arms race one owner cannot win, and the code was public until
2026-10-28. What is secret lives in the hidden settings.

### Pillar 11. Helpers that act for players

The owner: *"I don't even know."* So this pillar decides the shapes that
are cheap now and a rewrite later, and builds no helper feature.

- [x] **11.1 [NOW] Who may start a thing** is a column of the wire census
  (4.1), filled in its one reading. Never a helper's: combat, movement,
  gathering, chat, trades, wagers, the account itself.
  *Merged: #1667 (card C's census, `docs/plan/census/wire.md`, a column).*
- [x] **11.2 [NOW] The actor** (`docs/SHAPES.md`): the account, the
  character, the sitting, the kind (a person, QA, the owner, the system, a
  helper), where it came in, its grant. Set once as a connection or a
  request comes in. An account above characters is an empty field for now
  (card S names it: `acct` already means the device in the daily spin). A grant will have a storage prefix of its own, never a row among
  the login keys: an older worker would honour it as a full login.
  *Merged as a shape: #1666 (a section of `docs/SHAPES.md`). No card builds
  it yet.*
- [ ] **11.3 [NEXT] Ids and repeats.** Whatever can be listed has a server
  id, never a place in a list (the market's `place` takes a position and no
  request id: a retry after a timeout can sell the next sword). Every
  request that moves value takes a request id and acts once.
- [ ] **11.4 [NEXT] The words rule.** Text a player wrote (a name, chat, a
  shop's note) never sits inside a sentence the game speaks: mail today
  reads "sold to" and then the buyer's name. Such messages carry a template
  and its parts, and a guard fails a server string built from a player's
  words. Another player's assistant must be able to tell the game's voice
  from a stranger's.
- [ ] **11.5 [NEXT] Found on the way**: `/api/store/mine?playerId=` shows
  anyone's bids; public reads wake the one room with no pace.
- [ ] **11.6 [LATER] The game's public facts**, made in the build from the
  shared tables (6.2), in players' words, with a version: so an assistant
  answers "how do I get X" from the truth and not from a stale page. A
  guard finds no hidden setting in it.
- [ ] **11.7 [LATER] The helper door.** Not the game's socket. Made in the
  game, on a known device, by an account that passed the human check; with
  scopes (read my things, list, buy), a gold limit a day, an end date, the
  player's own list and "take it back", a kill switch, and a mark other
  players can see. Through the action door's rows (5.8). The 91 actions
  card C's wire census marks as started by "a person", with no ruling on
  helpers, stay open until this step (the owner, 2026-11-14: *"Leave
  open"*; v2.3.5056).
- [ ] **11.8 [LATER] The pass, safe for a helper to buy**: a signed quote,
  a receipt, a public way to check. With the pass's own build.

**Not to build:** an adapter for any one agent or payment standard (each is
a bet; the shapes above serve them all), money held for players, gold for
money, a helper that plays.

## 6. The order

**Wave 0, one session alone, merged before anything starts:** 8.0.

**Then, the twelve boxes open now:**

1. 8.6 the shapes page, and 8.7 the budget table.
2. The gatekeeper, every sitting (part 11).
3. 4.1 the wire census, with who may start each row.
4. 5.2 and 5.2b the system map, and tests that find code by system.
5. 4.4 and 4.5 the roads' classes, the shared test room, the world's sum.
6. 1.0, 1.1, 1.2, 1.6 the report on the socket and the room's row.
7. 3.1 the debt list, ours first.
8. 2.2a the pixel budget.
9. 8.1 red on `main` to zero.
10. 9.0 and 9.4 the weight line and the papers of what was uploaded.
11. 5.1 and 5.9 the four lines and the pins.
12. Censuses that only read, each a page under `docs/plan/census/`: state
    (5.3) and traps (8.2).

**Next, before real players**, in four chains that run side by side. One
session at a time in each chain's files.

- **The wire:** census, then the lists made from it and the hostile suite,
  the action door, bounded claims, the send door.
- **The walls:** the map and the helper, then the guards that read source,
  the state ledger by system, the phase table.
- **The books:** classes and the test room, then the sums and the restart
  test, the ledger, the day's book, the roads' table, restore, cases.
- **The watch on devices:** hold names, the report, the reader, days of
  data, then the lanes and the governor.

The longest is the wire: it is one session at a time in `wsClient.js` and
`index.js`.

**Later:** part 7, and every step marked LATER.

Why this order:

- **Rails before builders.** Ten sessions with no gatekeeper turn `main`
  red against each other, and a red `main` deploys no server.
- **Shapes before readers.** The wire is read once. A column added later is
  a second reading of every message.
- **Records before detectors.** What was not kept cannot be studied.
- **Measure before changing**, and say how much data a step waits for.
- **The owner is the only player.** So smoothness and honesty come before
  scale, and a ledger of trades between players is not needed until there
  is a second player.

**Baselines.** With a deploy at most merges and the game changing daily, no
before-and-after means anything unless it is frozen. So: the test box's
own numbers (never the Cloudflare lab's) are taken once at a recorded
commit and then by the gatekeeper for each batch; every record carries its build and its thrown switches; merges
happen in one sitting a day; and a play window with no deploy follows it.

## 7. Choices that wait for a number

| Choice | Start when | Until then |
|---|---|---|
| The server split, phase 1 (SERVER-SPLIT-PLAN) | the room's tick or its bill nears a line with real crowds | phase 0 only where it helps a phone at today's cap |
| Drawing on a worker (OffscreenCanvas) | no row of the debt list is ours AND the report still blames the page for late frames | a falling line on `window.` and `document.` in `src/rendering/` keeps it cheap |
| A binary wire | making and squeezing messages is a large share of the tick (bytes are not what Cloudflare bills) | 4.1b, the send door, makes it one place |
| WebGPU | Pixi's and Safari's are both ordinary, and a chip limit blocks something | nothing |
| Detectors, canaries, traces of other players, enforcement in waves | about 200 accounts; the owner's policy (part 9) | pillar 10's records, the league |
| The helper door, the public facts, the pass's receipt | a player asks, or the pass is built | pillar 11's shapes |
| Scores on the chain for an account under review; a pass that can be given | 10.3 and 10.9 exist | as today, with the owner as the only player |
| Slowing value between accounts (a fee, a hold, a pace) | the owner's yes; real players | 10.5's table, all at zero |
| The worker's `compatibility_date` (2024-12-01) | the owner asks; tried in the Cloudflare lab first | leave it |
| Retiring protocol v1 | a month with no v1 join counted by the server | both keep working |

## 8. What not to do

- **No rewrite, engine change, state library, ECS library or TypeScript
  conversion.**
- **No compressed textures for the chip**, no service worker, no git LFS.
- **No server split, binary wire or area servers before players.**
- **No quality lowered in silence.** Every rung is a row the owner can read.
- **No new prose rule where a test can hold it, and no wall GitHub does not
  run.**
- **No fix that turns on something nobody has seen** (TRAPS §305).
- **No second copy of a shape** (rule 2), and no second controller of a
  signal (rule 6).
- **No memory-only record of anything the sums read** (rule 5).
- **No timing a program's build to decide a lane.**
- **No file of numbers through a tool for pictures.**
- **No telling a model from a person input by input; no client-side
  tamper checks; no adapter for one agent standard.**
- **No free text from a player's device into a table a coding session
  reads.**
- **No two big moves in one file at once** (part 11, "never side by side").

## 9. Your calls

**Decided, 2026-11-13 ("Go recommended"):**

1. The smoothness report on for every player, with a switch: YES.
2. An end date for off-ramps: YES. As the review narrowed it: for logic
   switches only; a device off-ramp or a fallback stays while it is needed.
3. The ladder may step down by itself on a hot or full phone, never
   combat, with a mark on the strip: YES.
4. Lines that only fall on the big files: YES (as code lines and the
   longest function, 5.1).
5. A type check: YES (as a suite, on the new walls only, 5.6).
7. Reopen the decision to leave the game loop inside `BroTown.jsx`: YES.
8. Shared tables live under `server/src/`: YES.

**Still yours, in your own words** (each changes `.github/`, REPO-SAFETY):

6. **A reader for the report's table.** Without it no session can see a
   field number; until then you paste "copy table". WebKit and Firefox runs
   can wait.
9. **The asset bot on upload** (9.7), once 9.1 to 9.3 are in.

**New, from the review.** Each a yes or no; my recommendation after the dash.

10. **One merge sitting a day, from the gatekeeper's list, then an hour's
    play with no deploy.** YES. It is what makes any measurement mean
    something.
11. **The first three days build the rails and the instruments; the big
    moves of code come after.** YES.
12. **May moving value between accounts ever be slowed** (a fee, a hold on a
    new account's trades, a pace on the market)? This is not "no play
    caps", which is about hours of play. YES to building the table with
    everything at zero; turning one up is a later call.
13. **May the game keep** 90 days of trades between players and each
    account's last 32 sitting cards, said in the About panel? And ten
    minutes of your own play a sitting, labelled human? YES to all three.
14. **One person, one account, as a fact the server holds** (an account
    above characters). YES, as an empty field now.
15. **Declared AI helpers are welcome to run errands** (the market, the
    bank, payments) in a marked lane, and never to play. YES.
16. **A hot phone: a softer picture, or a steady lower frame rate?** A
    steady lower rate first: a third fewer pixels made no difference on
    your iPhone.
17. **A stale tab reloads by itself at a zone's veil, never in a fight,
    when the game has changed.** YES.
18. **Can you open one address on a Windows laptop and on a Mac**, once the
    Speed test sends its card? It is the only way to real numbers there.
19. **What made each kind of art, and may the game say "AI-made"?**
    DECIDED (2026-11-14): *"Yes you can say the art assets were generated
    by ChatGPT."* The uploads at the top are sprite-sheet sources, some
    outdated by newer designs.

**Yours outside the code:** two-step login on GitHub and Cloudflare, and
the wallet key that deployed the scores contract kept safe; a spending
alarm on both; terms, a privacy page and a refund rule before the pass; the
licence (MIT on purpose for the contest: `docs/specs/provenance.md` says a
later one is still to choose); whether players in the EU or under 13 will
be invited, which decides how the report asks for consent.

## 10. Where the detail is

| For | Read |
|---|---|
| The review: every finding, what was taken, what was not, and why | `docs/specs/grand-plan-review.md` |
| The sessions' cards, their status files and their censuses | `docs/plan/` |
| The device work so far, and items A to A4 | `STATE-MACHINES.md`, "Smooth on every device" |
| The ideas the ladder and the report come from | `PERFORMANCE-IDEAS.md` |
| The page-hold debt list | `tools/qa/mp/held-budget.mjs`, `docs/specs/held-sweep.md` |
| Memory's slots and lines | `MEMORY-MAP.md`, `tools/qa/mp/memory-budget.mjs` |
| The doors, and what is left of the sweep | `STATE-MACHINES.md` "What is left", `docs/specs/*-door.md` |
| The server's law | `ARCHITECTURE-HANDOFF.md` |
| The server at 1,000 players | `SERVER-SPLIT-PLAN.md`, `WORLD-ARCHITECTURE.md` §11 |
| The client's shape so far | `REBUILD-PLAN.md`, `docs/specs/device-profile.md` |
| Bots and hidden settings as built | `docs/specs/server-botsig.md`, `antibot-review.md`, `hidden-settings.md`, `ANTICHEAT-SPEC.md` |
| Logins, the pass, the chain | `docs/specs/account-login.md`, `SUPPORTER-PASS-PLAN.md`, `docs/specs/sponsorship.md` |

## 11. Splitting it across sessions

The owner, 2026-11-13: *"how I can separate it out across different sessions
(not lanes since those share the same 1 headless browser and compute
power)"*.

A session is its own machine with its own browser. Lanes inside one session
share four processors and one browser: inside a session they are right only
for reading and for node tests.

### A session works from its card

Each session has a **card**, a file of its own: `docs/plan/cards/<letter>.md`.
A card names its PRs in order, each with its files, its tag and its "done
when", and the readings already chosen, so no session has to guess. (A dry
run of version 2 gave nine fresh readers only their prompt: every one could
start, and every one had to guess. The cards are the cure.)

- A session reads `CLAUDE.md`, the ten rules at the top of part 5, its
  card, and the steps its card names. Not the whole plan.
- **A session with no card does not start.** Day one's nine cards exist.
  A later card is written when what it waits for has landed, from its row
  below.
- `docs/plan/README.md` says what a status file and a census are.

### The rule that prevents the most damage

**No PR merges on its own green.** Each sitting, a fresh gatekeeper session
(card Z) checks every ready PR against its card, reviews the ones that
change the game, merges them all together in a scratch copy, runs the
checks on the whole, and writes one list: what to merge, in what order, and
what is held and why. The owner merges only that list.

- Z writes no game code, merges nothing and comments on no PR.
- Z ticks this file's boxes for steps whose PRs are MERGED, never for work
  that is only on its list. It is the only session that edits this file.
- A hold names a failing command or a review's finding, and expires at the
  next sitting unless stated again.
- A red on `main` that no open PR caused is named by Z, with the card whose
  files it is in. No session "fixes" a red it did not cause.
- Z is started fresh each sitting. No list from Z: merge nothing, start a
  new Z.

### Rules for sessions side by side

1. **A session writes only in its card's files**, its own status file and
   its own census. A fault outside the card is written under Found in the
   status file, not fixed.
2. **Tags come from the card** (day one) **or from
   `tools/dev/tag-blocks.json`** (once wave 0 has made it), one a PR. Not
   the number the start-up brief suggests: it offers every new session the
   same one. A block is never written as a range in a commit's title: the
   tag check reads a range as every tag in it taken.
3. **A new line in a shared list goes in a place of its own.** A new cap or
   a new live flag still meets its neighbours on one line (TRAPS §333): a
   session that adds one says so in its status file, and the gatekeeper
   lists those PRs one after another.
4. **One PR for each numbered line of the card, opened when that line is
   done** (a push to a branch with no PR runs no paid check). Merge `main`
   into the branch before the last push.
5. **The status file** lives on the session's branch, at most 40 lines,
   committed with the work.
6. **Long output goes in a census** (`docs/plan/census/`), never in the
   status file.
7. **Everything lands by PR, a census too**, so the next session reads it
   from `main`.
8. **One heavy browser job at a time. A check over about 30 minutes runs as
   a sample**, and the owner is offered the full run (CLAUDE.md §6).
9. **Read the card again before each PR.**

### Day one

Card W goes first: it is the only one in the shared lists. The cards in
this table may start beside it, because each only reads or writes files
nothing else touches. **Nothing else starts until W and S are merged.**

| Card | Session | Steps | Tags v2.3. | Browser |
|---|---|---|---|---|
| W | Wave 0: the rails | 8.0 | 5021 to 5024 | light |
| S | The shapes page and the budget table | 8.6, 8.7 (10.1 and 11.2 are its sections) | 5025, 5026 | none |
| F | The weight, and the uploads' papers | 9.0, 9.4 | 5027, 5028 | none |
| C | The wire, read | 4.1's census, as a document | 5029 | none |
| D | The state, read | 5.3's census, as a document | 5030 | none |
| I | The traps, read | 8.2's index, as a document | 5031 | none |
| Z | The gatekeeper | every sitting | 5032 to 5034, then the blocks file | light |
| J | Red on `main` | 8.1 | 5035 to 5039 | heavy |
| H | The debt list | 3.1 | 5040 to 5054 | heavy |

Wave 0's blocks file starts new blocks at 5060.

### After wave 0 and the shapes page are merged

Each of these gets its card then. One session, one card, one letter: the
session that read is not the session that builds.

| Card | Session | Steps | After | Owns |
|---|---|---|---|---|
| N | The wire table | 4.1 step 1 as code and its guard, from C's census | W, S, C | new `server/src/wire/`, its guard |
| E | The books | 4.4, 4.5's harness, then 4.5, 10.3, 10.4 | W, S | the roads' classes, the shared test room |
| B | The walls' rails | 5.1, 5.2, 5.2b, 5.9 | W | `tools/guards/`, `docs/SYSTEMS.md`, the test helper |
| A | The report | 1.0, 1.1, 1.2, 1.6 | W, S; H for the names | `src/debug/`, `speedTest.js`, its router case and flag, the About row |
| G | The pixel budget | 2.2a only | W | `renderRes.js`, its test |
| U | The state ledger | 5.3 step 1 as files a system and its guard, from D's census | B, D | one ledger file a system |

### Later, one session at a time in each chain's files

| Card | Session | Steps | After |
|---|---|---|---|
| K | The wire, moved | 4.1 step 2, 5.8, 4.2, 4.1b, 11.3, 11.4 | N, and E's fixes |
| L | State and phases | 5.3 step 2, 5.3b | U |
| O | Lanes and the governor | 2.1, 2.3, 2.4, 2.5, 1.7 | A's reports, H |
| P | The asset door | 9.1, 9.2, 9.3, then 9.5 | F |
| Q | The watch | 10.2, 10.6, 10.7, 10.8, 10.9 | E, K |
| R | Roads and restore | 10.5, 4.7, 4.3 | E |
| T | The switch table | 7.1, 7.2 | B |
| V | Traps into guards | 8.2's guards, from I's index | B, I |
| M | The frame as steps | 5.4, then 5.5 | B, L; H and P stopped |

**Never side by side:** M with any other change to `BroTown.jsx` or the two
renderers; K with E's fixes still open; G or O with H in the same file; two
sessions writing `GOLD_ROADS`; the wire moved, the action door and 6.2
half-done together; the state's resets and the frame's steps half-done
together.

### The owner's requests

The owner opens a session and says what they want in plain words, with
no prompt to paste (CLAUDE.md §3): that session is the orchestrator, and
it does the rest: checks what is running, writes the card, starts the
session, and says what will land and when (`docs/plan/orchestrator.md`,
its job and its prompt).

### The owner's ten minutes a day

1. Start a fresh Z; read its list.
2. Merge its list, in its order, in one sitting.
3. Play for a while with no merge after it.
4. Answer the yes or no calls waiting.
5. Start again any session Z names as stalled.

### Spending the top model well

- **Reading once is the best use of a surplus.** S, C, D, I and E read the
  whole wire, the whole state, all 339 traps and the money's roads, and
  leave tables and tests behind. Their judgement (who may start this? is
  this a claim? when should this field reset? can this coin be copied?) is
  where the strongest model earns its cost. Start these first.
- **H, J, G and O are bound by the clock**: a browser run takes its minutes
  whatever the model.
- **W, B, F, P and T are mostly moves** and suit a lower effort when the
  budget is tight. Money, logins and Z stay at high effort.
- **A fresh session a card, and a short prompt.** A session carried across
  cards pays for its whole history on every turn.
- **Inside S, C, D and I, fan out readers** (lanes that only read): no
  browser is shared, so they do run side by side.
- **GitHub's minutes are money too.** A push to an open PR runs every
  check; so a PR is opened when its line is done, and merges go in one
  sitting (a deploy or two, not twenty).

### The prompt for a session

> You are session **X** of the grand plan. Read `CLAUDE.md`, the ten rules
> at the top of part 5 of `docs/GRAND-PLAN.md`, `docs/plan/README.md` and
> your card, `docs/plan/cards/X.md`. Do the card's PRs in order, each
> opened only when it is done, writing only in the card's files, with the
> card's tags (not the tag the start-up brief suggests). Keep
> `docs/plan/status/X.md` true with every commit. Read the card again
> before each PR. Where the card does not say, do not guess: put the
> question in your status file and ask me once.

For the gatekeeper, each sitting:

> You are session **Z**, the gatekeeper of the grand plan. Read
> `CLAUDE.md`, part 11 of `docs/GRAND-PLAN.md`, `docs/plan/README.md` and
> your card, `docs/plan/cards/Z.md`. Do one sitting as the card says, and
> give me one list.
