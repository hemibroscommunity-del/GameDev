# The grand plan: what to build next, in what order, and when each part is done (v2.3.5019)

The owner, 2026-11-13: *"make a grand plan for this codebase that can then
guide future development ... look at the sessions around architecture and
performance enhancements (especially per device per browser)."* And the aim
it serves (2026-11-09): *"bulletproof performance wise depending on the device
and software ... preventing malicious attacks ... buttery smooth."*

**This is the plan above the plans.** It does not repeat them. It says what
the last five months of fixes have in common, names nine finish lines, puts
the open work of the other plans in one order, and (part 11) cuts it into
sessions that can run side by side. The detail stays where it
is (`STATE-MACHINES.md`, `PERFORMANCE-IDEAS.md`, `SERVER-SPLIT-PLAN.md`,
`REBUILD-PLAN.md`, `MEMORY-MAP.md`, the specs).

**How a session uses it:** read part 6, take the first open step, do it as one
PR, tick its box here with the version. History never goes in this file: it
goes in the step's spec. Nothing here is built yet, and each step that
changes what a player sees still needs the owner's yes (part 9).

## 1. The short of it

- **The game is measured where it is not played.** Every automatic check runs
  in one browser engine on a test box with no graphics chip. Device problems
  reach us as the owner's screenshots, one at a time. Fix that first
  (pillar 1), because every later choice needs its numbers.
- **The house already has its best pattern: one table, one door, a test that
  fails a second way in, and a line that only goes down.** Gold, the bag,
  health, leaving, memory and the page's thread are held this way. Most of
  this plan is that pattern, applied to what is not yet held: device choices,
  the wire, the client's state, file sizes, off-ramps.
- **Three lists go to zero:** the page-hold debt list (`held-budget.mjs`
  `KNOWN`), the list of things the server still believes from the phone, and
  the list of old paths kept behind a switch.
- **No rewrite, no new engine, no new framework.** Every step is the size of
  the door PRs: step 1 changes nothing a player sees and adds the test; step
  2 moves the work.
- **Scale waits for players.** The split of the server is planned and
  measured; it starts when a number says so (part 7), not before.

## 2. What the fixes have in common

Seven root causes. Each is a pattern in the record, with where it shows.

1. **Measured where it is not played.** The test box draws in software at
   about four frames a second, in Chromium only (`held-budget.mjs`'s header;
   STATE-MACHINES A: "not provable on the test box"). The primary platform is
   iPhone Safari. What only a real device showed, each found by the owner:
   - a body vanishing on four facings (v2.3.3864: an iPhone's chip keeps
     16 bits where the box keeps 32);
   - the judges' checker pattern (a first visit on a slow line);
   - 106 frames a second falling to 51 after 24 minutes (heat);
   - the skateboard's grit.

   Crash reports have a road home (`crashTrap.js`, the Feedback object, the
   `crash-report` workflow). Smoothness has none: PERFORMANCE-IDEAS 1b,
   "measure real phones before changing them", is not built.
2. **Each device choice is made where it was needed.** The look palette is
   off for Windows and for a Mac by NAME (`lookPaletteChoice.js`), not by what
   the machine can do. One drawing program, the pacer, the screen's
   resolution and the crowd cap each decide for themselves. About 120
   `?name=0` off-ramps are named in the client. `deviceProfile.js` (step 1)
   gathers the questions and changes nothing. No one place says "this machine
   is in this lane", and nothing steps down when a phone gets hot or full.
3. **Pixel work happens when a thing is first seen.** The debt list has 13
   families and nearly all are one fault: art recoloured, packed or composed
   on the page the first time it comes on screen. They are being moved off
   the page one family at a time.
4. **The client has no walls.**
   - `effectsRenderer.js` is 19,105 lines, `entityRenderer.js` 19,007,
     `BroTown.jsx` 15,938 (the game loop starts at its line 3666);
   - the one state object `S` has about 650 field names across the client,
     and there are about 630 `window.__bt*` names;
   - REBUILD-PLAN took `BroTown.jsx` down to 8,969 lines. It is 15,938
     again, because nothing held the line.

   The state-machine sweep's hundred fixes were mostly one fault: a field
   with no owner and no stated lifetime, left behind at a zone change, a
   death or a rejoin.
5. **Rules are kept in step by hand.** CLAUDE.md §8 has 21 rows of "if you
   add X, also change Y". The wire's rules live in four lists
   (`PRIVILEGED_EVENTS`, `RELAY.TYPES`, `CAP_GATES`, the client's switch) and
   79 KB of prose. Tables are copied between server and client and audited
   after. Nothing checks a field's name before a test runs: no file is type
   checked. Art's rules are kept the same way: each family of pictures has
   its own tool that a session must know to run (pillar 9).
6. **Old paths never leave.** Every saver lands on with an off-ramp (the
   owner's rule, and a good one). None has an end date, so both ways stay in
   the script, the heap, the tests and every session's reading.
7. **The project's memory costs more each week.** `docs/` is 3.4 MB:
   TRAPS 580 KB (339 traps), CLAUDE-HISTORY 465 KB, UI-DESIGN-NOTES 457 KB,
   467 specs. A session cannot read them; it greps. A trap kept as prose is
   paid for on every read. A trap kept as a test is paid for once.

### What is measured on each device today

| Device and browser | What is known | How it is measured |
|---|---|---|
| iPhone Safari (primary) | 60 frames a second unless the owner's flag is off; the tab dies near 250 MB; heat halves the frame rate in a long session | the owner's `?perf=1` screenshots |
| iPad | more pixels than a phone, same engine | nothing |
| Android Chrome | the engine is the test box's; no real chip has run the game | nothing on a device |
| Windows, Chrome or Edge | the judges' machines; every look is baked on the page | `mp-desksmooth`, in software |
| Mac, Safari or Chrome | the look palette is off by name; it can probably build it | nothing |
| Firefox, any machine | unknown | no test runs it |

## 3. Where it stands (2026-11-13, main at v2.3.5018)

| Measure | Today | The line to reach |
|---|---|---|
| Devices that report their own smoothness | 0 | every session |
| Device choices made by a name, outside the profile | look palette, one program, others | 0 |
| Families on the page-hold debt list | 13 | 0, then the hold line 12 ms to 8 |
| Things the server believes from the phone | listed in STATE-MACHINES, not counted | counted, then 0 |
| Longest client file | 19,105 lines | 5,000, then 3,000 |
| `S` fields with a stated owner and lifetime | the monsters' only | all |
| Files type checked | 0 | the rules in `src/game/`, the server's doors, the wire |
| Off-ramps past an end date | no end dates | 0 |
| Pictures that are 256-colour files | 396 of 1,970 | every file in its family's form, or listed with why |
| Tests red on `main` | listed in STATE-MACHINES | 0 |
| Traps held by a test, not by prose | not counted | counted, then rising |

## 4. The nine finish lines

1. **Every device reports.** A device problem is first seen in a table.
2. **One ladder.** Every quality choice reads one lane; the lane comes from
   what the machine can do and how it is doing now.
3. **The debt list is empty.** Nothing holds the page past its line, in a
   crowd, on any lane.
4. **The claims list is empty.** The phone sends requests and looks. The
   server believes no result.
5. **The client has walls.** The loop is a list of named steps; every state
   field has an owner and a lifetime; no file is too big to read.
6. **One table per rule.** A rule two places must agree on is one table they
   both read, or a test that fails when they differ.
7. **Old paths leave.** An off-ramp has an end date, and the old way goes.
8. **Working here stays cheap.** A session reads one page for its system; a
   red test means something; the top model is spent on design.
9. **Every file goes through the asset door.** A picture or a sound reaches
   the game only in its family's cheapest form, made and checked by machine.

## 5. The work

Each step is one PR unless it says otherwise. "Step 1 changes nothing" means
the door's way: build the table from what exists, add the test, move no
behaviour.

### Pillar 1. See: the field report

- [ ] **1.1 The smoothness report** (PERFORMANCE-IDEAS 1b). A few hundred
  bytes, sent at a session's end and every ten minutes, on the crash
  report's road. In it:
  - `deviceProfile()`, the chip's name, the canvas's pixels, the screen's
    measured rate, the lane and any off-ramps in use;
  - frame times (middle, 95th, worst) and late frames a minute;
  - the strip's split of a late frame (the game's work, the page busy, the
    page waiting for the chip);
  - the three worst holds by family name (the held sweep's names);
  - the game's own memory count, lost graphics, rebuilds, "the tab died last
    time";
  - the line's delay and how much it wavers.

  No names and no chat. A kill switch (`perfreport`), a cap a day, one row a
  report (writes cost money).
- [ ] **1.2 The Speed test sends its card** and shows a short code, so a
  session reads the card instead of a screenshot.
- [ ] **1.3 The device table**: a tool that turns the feed into one table by
  device and browser (95th frame, late frames, worst family, memory). A perf
  PR quotes it before and after.
- [ ] **1.4 Real engines, on demand** (PERFORMANCE-IDEAS 1e): `playable` in
  Playwright's WebKit and Firefox. It catches engine differences, not chip
  ones (those come from 1.1). A `.github/` change and paid minutes, so the
  owner's word and on demand only.
- [ ] **1.5 Two standing slow profiles** for on-demand runs, from switches
  that exist (`BT_QA_CPU_THROTTLE`, the slow line): "a budget Android" and
  "an old laptop on a hotel's line".

**Done when** a session can answer "how does it run on X" from the table, and
PERFORMANCE-IDEAS 3b's minimum requirements are measured ones.

### Pillar 2. Adapt: one ladder

- [ ] **2.1 Lanes by what the machine can do** (`deviceProfile.js` step 2).
  Behind the loading screen: the chip's limits, a short timed draw and bake,
  the screen's pixels and rate. The answer is a lane (say `full`,
  `standard`, `light`), a ROW in one table of knobs:
  - the canvas's pixel budget (STATE-MACHINES A2 item 1);
  - the passes (shadows, shine, moving water);
  - the crowd cap;
  - how a look is made (palette, or baked on the worker);
  - one drawing program or three;
  - the pacer's target.

  Step 1 changes nothing: today's choices written as rows.
  `device-profile.test` already fails a device question asked elsewhere:
  extend it to the knobs.
- [ ] **2.2 The computer's lane** (A2, the judges). The pixel budget first
  (safe for phones: they are under it). Then the look palette by the probe,
  not by "Windows" or "Mac" (TRAPS §259).
- [ ] **2.3 The governor** (PERFORMANCE-IDEAS 1a with 2b). One rung down on
  frames late for many seconds (heat), on the memory count near its line, or
  after a tab that died. Back up slowly, and never during a fight. It moves
  pixels, passes and the crowd only. **Combat's timing and loading are never
  on the ladder** (the owner: "I definitely don't want combat to feel slow").
- [ ] **2.4 Off-ramps become overrides of the ladder**, read through one
  reader (`?lane=light`, `?knob=value`). This is pillar 7's registry too.
- [ ] **2.5 The 30 lane.** An iPhone in Low Power Mode, and some Android
  battery savers, give a page about 30 frames a second. Name it in the pacer
  and hold the step steady at it. To confirm with 1.1 first.

**Done when** no name of a system or browser decides a quality choice outside
the profile, and each lane's 95th frame is under its line on every device the
report has seen.

### Pillar 3. Never hold the page: finish the art's road

- [ ] **3.1 Empty the debt list**, in the order the device table ranks it.
  Until 1.3 exists, by size: `gear-sheet` 195 ms, the frame itself 70,
  `gc` 60, `portrait` 40, `masked-bake` 24, `strip-made` 24, `pack-page` 20,
  the fold to mono 20, the equip redraw 20, then the rest. Each family's
  `next` is already written in `held-budget.mjs`.
- [ ] **3.2 One queue for work that is not this frame's**
  (PERFORMANCE-IDEAS 2d). Today each family slices itself. One queue: the
  nearest first, a few ms a frame from the pacer's spare time, nothing heavy
  in a fight, a job dropped when its thing leaves view. Its job names are the
  held sweep's families, so the report (1.1) names them for free.
- [ ] **3.3 Make it before it is seen** (PERFORMANCE-IDEAS 2c). The server
  already sends who is near. A look is made when its player enters the far
  edge of that list, not at first sight.
- [ ] **3.4 A look is a few colours, on every lane** (PERFORMANCE-IDEAS 2a).
  Then the bake's code leaves by pillar 7.
- [ ] **3.5 The art's rules are proved before a phone finds them**: pillar 9,
  the asset door.

**Done when** `KNOWN` is empty on the crowd tour, the field's "page busy"
time at the 95th is under 4 ms, and `HOLD_MAX_MS` is lowered from 12 to 8 (a
120 screen's frame is 8.3 ms).

### Pillar 4. Trust nothing from the phone: finish the server's word

- [ ] **4.1 The wire table.** Every message, both ways, one row: its name,
  its fields with types and limits, its cap, its kill switch, whether it is
  privileged or a relay. Each field a phone sends is marked a **request**
  (the server judges it), a **look**, or a **claim** (a result the server
  believes). Step 1 changes nothing: the table is built from the four lists
  and a test holds them equal. Step 2: the lists, the checks at the door, the
  tables in WIRE-PROTOCOL.md and a hostile-values suite (`__proto__`, not a
  number, a huge string, in every field) are made FROM the table.
- [ ] **4.2 The claims list, to zero.** The rows marked claim are a debt list
  like `KNOWN`. Known today (STATE-MACHINES, "What is left"):
  - the guard and cooking beyond #1530's limits;
  - the quest hand-in and the weapon sale, shown with no take-back;
  - gold taken on the page in FurniturePanel and DungeonCreatorPanel;
  - the local-monster mode (`!S._serverMonsters`);
  - a sword's claim labelled a bow's (TRAPS §329).
- [ ] **4.3 Doors for what is left of value**: experience and levels, the
  stashes, quest state, skill points (the plan's waves 2 and 3, #1508). Gold's
  next steps are in `docs/specs/gold-door.md`.
- [ ] **4.4 The sums test.** Bots send a storm of honest and hostile
  messages; after it, every purse and bag equals its start plus the rows of
  `GOLD_ROADS` and `BAG_ROADS` that ran. A copied coin fails the suite, not a
  player's report.
- [ ] **4.5 The restart test.** The same storm with the room stopped between
  any two writes, a save refused, a reconnect at any message. It holds the
  "one write" rule (handoff rules 5 and 7) by machine.
- [ ] **4.6 The anti-bot order** as written (`ANTICHEAT-SPEC.md`,
  `HIDDEN-SERVER-PLAN.md`): unchanged, after 4.1 and 4.2.

**Done when** the claims list is empty, and 4.4 and 4.5 run in `npm test`.

### Pillar 5. Give the client walls

- [ ] **5.1 The size line** (first, small, safe). A precheck with a line for
  each file over 3,000 lines, at today's size. A PR may not raise one without
  saying why (the memory lines' way); lower it to lock a saving in.
- [ ] **5.2 The system map.** One table: each system's files, spec, traps,
  tests, doors and switches. Precheck fails a source file in no system. A
  session reads one system's card, parallel lanes are systems, and
  `run.mjs --for <system>` picks the tests.
- [ ] **5.3 The state ledger.** Every `S` field one row: its system, its
  lifetime (a frame, a fight, a zone, a life, a session, saved) and its blank
  value. Step 1: the list, and a test that fails a field in no row (the
  monsters' way, `monster-newlife.test`). Step 2: a zone change, a death and
  a rejoin reset FROM the table. STATE-SCHEMA.md is then made from it and
  stops being stale.
- [ ] **5.4 The frame as named steps.** The loop becomes an ordered list
  (input, the server's news, prediction, the world's step, the camera, the
  draw lists, effects, the band), each a module with a name and a clock.
  One step a PR, the smallest closure first. REBUILD-PLAN left the loop
  inline because nothing could prove a move safe; the phone scenarios, the
  held sweep and the ghost audit can now. Each step's time goes on the strip
  and in the report, and gets its own line in `held-budget.mjs`.
- [ ] **5.5 The two renderers split by what they draw**, along the system
  map. Moves only, no logic; a ghost-audit sample is the proof.
- [ ] **5.6 Types on the seams, with no conversion.** `// @ts-check` and
  JSDoc types for the wire's rows (made from 4.1), the ledger (from 5.3) and
  the server's player record, checked in precheck. A wrong field name is red
  before any phone test runs. It grows a file at a time.
- [ ] **5.7 The probes under one name** (`__bt.<system>.<probe>`), then left
  out of the players' build.

**Done when** no file is over 5,000 lines, every `S` field has a row, and the
loop is a list.

### Pillar 6. One table per rule

- [ ] **6.1 Each row of CLAUDE.md §8 names its test.** A row with none is on
  the list to fix. The wire table (4.1) takes four rows; the manifest (3.5)
  four; the ledger (5.3) the look keys.
- [ ] **6.2 Copied tables become one.** A table both sides need lives under
  `server/src/` and the client imports it, so a change deploys the worker by
  the rule that exists, with no change to `.github/`. Hidden numbers
  (`hidden.js`) stay out. `mirror-audit.test` shrinks as each table moves.

### Pillar 7. Let old paths leave

- [ ] **7.1 The switch table.** Every `?name=` and every live flag one row:
  the version it was born in, what it turns off, its end rule. One reader;
  precheck fails a switch read anywhere else.
- [ ] **7.2 The end date** (the owner's yes, part 9). A saver on by default
  for four weeks with no revert: its old way and its switch are removed.
  After that a revert is a git revert. The owner's tools (`?perf=1`,
  `?guest=1`, `?crowd=`, the trials) are kept for good.
- [ ] **7.3 Reap by system**, a batch a PR. Each says how many bytes of
  script and MB of heap went, and lowers the memory line to lock it in.
- [ ] **7.4 The big leftovers**, each the owner's call: protocol v1 (once the
  report shows no v1 join for a month), dormant systems, the old map's last
  code.

### Pillar 8. Keep working here cheap

- [ ] **8.1 Red on `main` is zero.** Each test on STATE-MACHINES' "already
  red" list is fixed or deleted with its reason, never skipped.
- [ ] **8.2 Traps become guards.** Each trap gets one line: "held by" a test,
  or "prose only". A new trap comes with its guard where one can exist. The
  count of prose-only traps is the number to bring down.
- [ ] **8.3 Docs by system.** TRAPS and UI-DESIGN-NOTES are split along the
  system map, with an index that keeps every § number working.
- [ ] **8.4 Spend the top model on design.** It writes the table and the
  failing test. Lighter lanes make it pass (moving rows, splitting files,
  reaping switches). Money and login work stays at high effort.
- [ ] **8.5 Shared lists that do not collide.** Sessions side by side all
  add lines to the same few lists. Precheck's checks become one file each in
  `tools/dev/checks/`, found by name. `run.mjs`'s scenarios go in name order
  (today each new one is put on the top line, where two sessions always
  collide). For every shared list: a new line in a place of its own, never
  the top one (TRAPS §316's rule for the caps).

### Pillar 9. The asset door: every file processed by machine

The owner's standing rule (2026-10-28): *"everything converted using this
more efficient method as standard protocol (art, audio, animations, etc)"*.
And 2026-11-13: *"automatically processing any files through the pipeline for
maximum performance efficiency (256 color conversion, compression, etc). You
decide how that goes."*

Today the rule is kept by hand:

- each family has its own tool (`reduce256`, `strip256`, `npc256`,
  `role-bake`, `head-bake`, `shirt-bake`, `optimize-sprites`, `encode_music`,
  the `cut_*` scripts), and a session must know which to run;
- only two folders get a `.webp` twin from the bot;
- of the 1,970 PNGs in `public/`, 396 are 256-colour files and 1,574 are
  not (40 MB: traits 937, look 223, gear 114, player 82, props 22, the
  icons and screens).
  Some of those are right as they are (a picture that holds numbers, not
  colours). Nothing says which;
- sound is 123 mp3 files (22 MB) and video six files (4 MB), with no stated
  form;
- the owner uploads to the top of the project: ten pictures and a video
  wait there now.

**How it goes (decided here): one table, one command, one gate, then the
bot.** The command and the gate work in every session with no change to
`.github/`. Running by itself on upload comes last, when it is ten lines.

- [ ] **9.1 The family table** (`tools/assets/families.mjs`). Every folder
  under `public/` one row:
  - what it is (a strip, a sheet, an icon, ground, numbers, an illustration,
    a sound, music, video);
  - the form its files must have: a 256-colour file (its own colours, or one
    row shared by a bundle), a lossless twin, "exact, leave alone", or "more
    than 256, allowed, and why";
  - its size limits, the door it loads through, its slot in MEMORY-MAP;
  - for sound: one channel or two, the rate, the longest a file may be before
    it must stream, how loud.

  Step 1 changes nothing: the table is built from what is on disk, and every
  file off its form is listed as debt, with its bytes and its MB in memory.
- [ ] **9.2 One command**: `node tools/assets/process.mjs <files>`. It finds
  the family from where the file is going, runs that family's own tool,
  checks the result (read back to the same colours, `strip256`'s way; a twin
  identical and smaller, `optimize-sprites`' way), writes the file's row in
  the manifest (hash, bytes, frames, colours), and prints before and after.
  The tools above stay, as its parts.
- [ ] **9.3 The gate**: precheck `asset-door`. It fails a file under
  `public/` in no family, a file off its form and not listed, and a source
  changed without its outputs (the Wheel bakes' `--check` way).
- [ ] **9.4 The inbox.** A file uploaded to the top of the project, or to
  `inbox/`, is named by the session brief ("3 files wait"). The session runs
  9.2, keeps the file as supplied under `assets/<kind>-source/`, and leaves
  the top clean. Its first job is the eleven waiting now, asking the owner
  what each is for.
- [ ] **9.5 The backlog, a family a PR**, the biggest in memory first
  (`docs/specs/pictures-256.md`'s inventory): the armour sheets, the game's
  own canvases, the weapon bodies, the icons, the traits, the props. Each is
  measured by `mp-membudget` and lowers its line; body and armour art goes
  through a ghost-audit sample. Sound: a file is one channel on disk unless
  its row says two, which takes `foldToMono` off the debt list (TRAPS §230).
- [ ] **9.6 The manifest in the build.** Every picture and sound gets an
  address that changes with its content. A returning player downloads
  nothing twice (PERFORMANCE-IDEAS 1d: `public/_headers` leaves the sprite
  and sound folders asked for again on each visit), and the loading bar
  counts real bytes.
- [ ] **9.7 By itself, on upload** (the owner's call: a `.github/` change).
  The bot that makes the `.webp` twins runs 9.2 on whatever was uploaded and
  commits the result. After 9.1 to 9.3. Its commit waits for an approval
  like the twins' does (CLAUDE.md §4).

**Done when** `asset-door` passes with no debt but the listed exceptions, and
adding art is "upload it".

## 6. The order

**Now (small, safe, nothing a player sees):**
5.1 the size line, 1.1 and 1.2 the report, 8.1 red to zero, 8.5 the shared
lists, 7.1 and 5.2 the switch table and the system map as lists, 9.1 to 9.4
the asset door.

**Next (the owner feels these):**
2.1 and 2.2 the ladder and the computer's lane, 3.1 the debt list by the
table's ranking, 2.3 the governor, 4.1 the wire table (step 1), 5.3 the
ledger (step 1).

**Then:**
3.2 to 3.4, 4.2 to 4.5, 5.4 to 5.6, 6, 7.2 and 7.3, 8.2 and 8.3, 9.5 to
9.7.

**When a number says so:** part 7.

Why this order:

- **Measure first.** The owner's own order (PERFORMANCE-IDEAS part 4: "1b
  first"). The report ranks the rest of pillars 2 and 3.
- **Lines before work.** A size line and a switch table cost a day and stop
  the loss while the real work is queued.
- **Lists before moves.** Every table starts as "step 1 changes nothing",
  which is why they can go early and in parallel.
- **The owner is the only player.** So smoothness and honesty come before
  scale.

What unlocks what: 1.1 feeds 2.3, 3.1 and part 7. 5.2 feeds 5.5, 8.3 and
test picking. 4.1 feeds 4.2, 5.6 and 6.1. 5.3 feeds 5.4. 7.1 feeds 2.4 and
7.2. 9.1 feeds 9.5 and 9.6. 5.4 makes the drawing-on-a-worker option in part
7 cheap.

## 7. Choices that wait for a number

| Choice | Start when | Until then |
|---|---|---|
| The server split, phase 1 (SERVER-SPLIT-PLAN) | the room's tick or its bill nears a line with real crowds | phase 0 only where it helps a phone at today's cap |
| Drawing on a worker, off the page's thread (OffscreenCanvas) | the debt list is empty AND the report still blames "page busy" for late frames | 5.4 keeps the option cheap; Safari has had it since version 17 |
| A binary wire | bytes lead the cost audit with real crowds | 4.1 makes it a change of coder, not of every message |
| WebGPU | Pixi's and Safari's are both ordinary, and a chip limit blocks something | nothing: 2D pixel art gains little |
| The worker's `compatibility_date` (2024-12-01) | the owner asks; tried in the Cloudflare lab first | leave it |
| Retiring protocol v1 | a month of reports with no v1 join | both keep working |

## 8. What not to do

- **No rewrite, engine change, state library, ECS library or TypeScript
  conversion.** Each restarts the trap list at zero. The plan gets their
  gains (walls, types, named steps) by the door's way.
- **No compressed textures for the chip.** They are lossy and made for
  photos. Colour numbers are already a quarter the size and exact.
- **No server split, binary wire or area servers before players.**
- **No quality lowered in silence.** Every rung of the ladder is a row the
  owner can read and override.
- **No new prose rule where a test can hold it.**
- **No fix that turns on something nobody has seen** (TRAPS §305).
- **No second big program at once.** Pillars 2 and 3 are one lane of work on
  the drawing, pillar 4 one on the server, pillar 5 one on the client's
  shape. More at once collide in the three big files.

## 9. Your calls

Each a yes or no. My recommendation is after the dash.

1. **The smoothness report on for every player**, with a switch to turn it
   off: the device's kind and its frame times, no names, no chat. YES.
2. **An end date for off-ramps**: four weeks on by default with no revert,
   then the old way is deleted. YES; your own tools are kept.
3. **The ladder may step down by itself** on a hot or full phone (pixels,
   passes, the crowd; never combat). YES, with a small mark on the strip so
   you can see when it did.
4. **Size lines on the big files.** YES.
5. **A type check in precheck** (one new development tool, TypeScript, used
   as a checker only; the game stays JavaScript). YES.
6. **A reader for the report feed in `.github/`**, and WebKit and Firefox
   runs on demand. Yours to ask for in your own words (REPO-SAFETY); the
   reader is worth it, the engines can wait for the first reports.
7. **Reopen REBUILD-PLAN's decision** to leave the game loop inside
   `BroTown.jsx`. YES, one step at a time, after 5.3.
8. **Shared tables live under `server/src/`**, so changing one deploys the
   worker. YES.
9. **The asset door runs by itself on upload** (9.7, a `.github/` change):
   the bot processes what you upload and commits the result. Yours to ask
   for in your own words, once 9.1 to 9.3 are in. Until then a session runs
   the one command.

## 10. Where the detail is

| For | Read |
|---|---|
| The device work so far, and items A to A4 | `STATE-MACHINES.md`, "Smooth on every device" |
| The ideas the ladder and the report come from | `PERFORMANCE-IDEAS.md` 1a, 1b, 1d, 1e, 1g, 2a to 2f, 3b |
| The page-hold debt list | `tools/qa/mp/held-budget.mjs`, `docs/specs/held-sweep.md` |
| Memory's slots and lines | `MEMORY-MAP.md`, `tools/qa/mp/memory-budget.mjs` |
| The doors, and what is left of the sweep | `STATE-MACHINES.md` "What is left", `docs/specs/*-door.md` |
| The server at 1,000 players | `SERVER-SPLIT-PLAN.md`, `WORLD-ARCHITECTURE.md` §11 |
| The client's shape so far | `REBUILD-PLAN.md`, `docs/specs/device-profile.md` |
| Anti-cheat and hidden settings | `ANTICHEAT-SPEC.md`, `HIDDEN-SERVER-PLAN.md` |

## 11. Splitting it across sessions

The owner, 2026-11-13: *"how I can separate it out across different sessions
(not lanes since those share the same 1 headless browser and compute
power)"*.

A session is its own machine with its own browser, so sessions truly run side
by side. Lanes inside one session share four processors and one browser:
inside a session they are right only for reading and for node tests.

### Rules for sessions side by side

1. **A session writes only in its card's files.** It reads anything. A
   change it needs elsewhere goes in its PR's words, for the session that
   owns that file.
2. **A block of twenty tags each** (the cards below), one tag a PR.
3. **A new line in a shared list goes in a place of its own, never the top
   line** (`precheck.mjs`, `run.mjs`, the caps, the live flags). `CLAUDE.md`
   is changed only for a new rule, in the session's last PR.
4. **One PR a step.** Merge `main` into the branch before each push.
5. **Merges in batches.** The node tests live in `server/test/`, so nearly
   every PR deploys the worker when merged (CLAUDE.md §4).
6. **Each session ticks its own boxes** in part 5 and writes what it found
   in its step's spec, for the session that comes after.
7. **One heavy browser job at a time** inside a session.

### Wave 1: start any or all now

None waits for another. Most are "step 1 changes nothing".

| | Session | Steps | Writes only | Browser | Tags v2.3. |
|---|---|---|---|---|---|
| A | The report | 1.1, 1.2, 1.3 | `src/debug/`, `speedTest.js`, `server/src/feedback.js`, its flag, `tools/dev/field-report.mjs` | light | 5020-5039 |
| B | Lines and maps | 8.5, 5.1, 5.2, 7.1 | `tools/dev/`, `tools/qa/mp/run.mjs`, `docs/SYSTEMS.md` | none | 5040-5059 |
| C | The wire table | 4.1 step 1, 4.2's list counted | new `server/src/wire/`, its test | none | 5060-5079 |
| D | The state ledger | 5.3 step 1 | new `src/game/stateLedger.js`, its test, its findings | none | 5080-5099 |
| E | The sums and restart tests | 4.4, 4.5, and the fixes they find | `server/test/`, the faulty system's file | none | 5100-5119 |
| F | The asset door | 9.1 to 9.4 | `tools/assets/`, the inbox, `tools/dev/session-brief.mjs` | none | 5120-5139 |
| G | The ladder | 2.1 step 1, 2.2 | `deviceProfile.js`, `renderRes.js`, `lookPaletteChoice.js`, `pixiApp.js` | yes | 5140-5159 |
| H | The debt list | 3.1, a family a PR | that family's files in `src/rendering/`, `held-budget.mjs` | heavy | 5160-5179 |
| I | Traps to guards | 8.2, 6.1 | a new index of the traps, new node tests | none | 5180-5199 |
| J | Red on `main` | 8.1 | `tools/qa/mp/` | heavy | 5200-5219 |

B's first PR is 8.5, so the others stop colliding in the shared lists: merge
it first.

### Wave 2: as wave 1 merges

| | Session | Steps | After | Owns (nobody else writes these meanwhile) | Tags v2.3. |
|---|---|---|---|---|---|
| K | The wire, moved | 4.1 step 2, 4.2, 4.3 | C, and E's fixes | the wire's parts of `index.js`, `relay.js`, `join.js`, `wsClient.js` | 5220-5239 |
| L | The ledger, moved | 5.3 step 2, and D's findings | D | the zone change, the death, the rejoin | 5240-5259 |
| M | The frame as steps | 5.4 | D | the loop in `BroTown.jsx` | 5260-5279 |
| N | Types on the seams | 5.6 | C, D, call 5 | the type files, precheck's check | 5280-5299 |
| O | The governor and the queue | 2.3, 2.4, 3.2, 3.3 | A's first reports, G | the ladder's files, the new queue | 5300-5319 |
| P | The art backlog | 9.5, 9.6 | F | a family's pictures and its loader | 5320-5339 |
| Q | Reaping | 7.2, 7.3 | B, call 2 | a system's old paths, the oldest switches first | 5340-5359 |

### Wave 3: last

| | Session | Steps | When | Tags v2.3. |
|---|---|---|---|---|
| R | The renderers split | 5.5 | H and P are merged and stopped: it owns both big renderers | 5360-5379 |
| S | Docs by system | 8.3 | nothing else is writing docs | 5380-5399 |
| T | Copied tables become one | 6.2 | K is merged | 5400-5419 |

**Never side by side:** M with any other change to `BroTown.jsx`; R with H
or P; K with E's fixes still open; H and P in the same family of art.

### Spending the top model well

- **Reading once is the best use of a surplus.** C, D, E and I read the
  whole wire, the whole state, the money's roads and all 339 traps, and
  leave tables and tests behind. Every later session is cheaper for them,
  and their judgement (is this field a claim? when should this field reset?
  can this coin be copied?) is where the strongest model earns its cost.
  Start these first.
- **G, H, J and P are bound by the clock**, not by tokens: a browser run
  takes its minutes whatever the model. They are worth running, and they
  spend slowly.
- **B, F, Q, R and S are mostly moves.** They suit a lower effort when the
  budget is tight.
- **A fresh session a card**, and a short prompt: this file is the brief. A
  session carried across cards pays for its whole history on every turn.
- **Inside C, D and I, fan out readers** (lanes that only read and report):
  no browser is shared, so they do run side by side.

### The prompt for a session

> You are session **X** of `docs/GRAND-PLAN.md` part 11. Read parts 5 and
> 11, then do your card's steps in order, one PR a step, writing only in
> your card's files, with your card's tags. Tick your boxes in the plan as
> each PR is ready. If a step needs my yes (part 9), ask me once and carry
> on with the next step.
