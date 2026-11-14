# Card L: state and phases (step 5.3, step 2, and step 5.3b)

**Starts:** now. Card U's nine PRs (the ledger, `src/state/`) are all
merged (sitting 6).
**Read:** `CLAUDE.md` (§5 the wire's rules: one field and one transition
function a phase; §7 the laws); the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md` (rules 1, 2, 3, 4 and 8 most); steps 5.3 and 5.3b;
`src/state/README.md` (card U's ledger, its columns and its guard);
`tools/guards/state-ledger.test.mjs`; `tools/dev/state-census.mjs` (its
header, `--ledger`, `--check`); `tools/guards/lib/fourLines.mjs` (~30 to
~50); `docs/plan/census/review-z6.md` ("Card U", the two findings);
`docs/plan/census/state.md` (its rules and its `phase` mark);
`docs/STATE-MACHINES.md` ("What it was", "What is left": what the doors of
2026-11-11 and 2026-11-12 are, and how each was built);
`docs/SHAPES.md` part 5 (the wire's `phase` column and its names) and
part 8 (names); `src/game/rejoinSlots.js` (`REJOIN_SLOTS`) and TRAPS §278;
the four doors of today: `server/src/life.js` (`_lifeTo`, `ps.life`) with
`docs/specs/life-door.md` and `life-door.test`; `server/src/leave.js`
(`session.phase`, `_playerLeaves`) with `docs/specs/session-door.md` and
`session-door.test`; `server/src/monsterlife.js` (`_monsterNewLife`) and
`src/game/monsterCarry.js` (`monsterNewLife`) with `monster-newlife.test`
and `monster-life.test` §6; `src/game/zoneTransitions.js` (`changeZone`)
with `zone-leftovers.test` §6.
**Tags:** 5201 to 5219, one a PR, in the order below. If they run out,
ask the planning session for a second block: never take one yourself.
The card is committed by the orchestrator's PR (v2.3.5200, card L's
first number, with card J2's): do not commit it yourself.
**Browser:** light: `questline` before each PR that changes a game file,
and the scenarios of the system it changes. One run at a time.
**Effort:** extra (the big files, and every phase a player can be in).

## PRs, in order

1. **(tag 5201) The ledger's guard reads the code on GitHub.**
   - The gatekeeper's finding (sitting 6, `review-z6.md`, "Card U"): the
     `test` job installs only `server/`'s packages, so the guard takes its
     rows off `docs/plan/census/state.md`, not the code, and between
     rewrites of the page it is blind (a new top-of-file `let`: green by
     the page, red by `--live`). Nothing runs `state-census --check`,
     though `fourLines.mjs` ~45 says something does. Make the guard read
     the code where GitHub runs it.
   - **Chosen:** `@babel/parser` and `@babel/traverse` become
     devDependencies of `server/` (the root's exact versions);
     `state-census.mjs`'s loader tries the root's packages, then
     `server/`'s (as `fourLines.mjs` already does for esbuild). The
     ledger guard and four-lines' fourth number then read the script
     whenever it loads (one run of it a `npm test`, shared by both), and
     the page only when it cannot, saying which they read. `fourLines.mjs`
     ~45 says what is true.
   - **Not chosen: `--check` as the gate.** The page carries line numbers
     (`fly :562`, `| file | line |`), so every PR that moves a line under
     `src/` would fail it. The page stays a census the script rewrites.
   - The gatekeeper's second finding, here too: while it reads the code,
     the guard holds the machine's columns (`system`, `born`, `twoFiles`,
     `noRead`, `noSet`, `neverChanged`, `phase`, `flag`, `writers`,
     `suggested`) to the script's, so a row changed by hand fails. The
     hand's columns (`lifetime`, and PR 3's `reset`) stay the hand's.
     The cosmetic one: the info line prints the room, not the count.
   - Files: `server/package.json`, `server/package-lock.json`,
     `tools/dev/state-census.mjs` (its loader only),
     `tools/guards/state-ledger.test.mjs`, `tools/guards/lib/fourLines.mjs`,
     `tools/guards/four-lines.test.mjs` (if it needs to), `src/state/README.md`.
   - It touches `server/`: its merge deploys the worker (say so in the PR).
   - Done when, on a copy with only `server/`'s packages installed (as
     GitHub's job), a new top-of-file `let` in a `src/` file fails the
     guard, and a ledger row's `writers` changed by hand fails it. Both
     break proofs in the guard's header (rule 8), tried by hand.
2. **(tag 5202) The phase table and its guard** (step 5.3b; changes no
   game file).
   - A new leaf file, `src/state/phases.js`: plain data, no imports, one
     row a state machine: its name (SHAPES part 5's names: `session`,
     `life`, `zone`, `fight`, `duel`, `trade`, `party`, `ride`, `harvest`,
     `cook`, `guard`, `pose`, `race`, `arena`, `fishing`, and the plan's
     `dungeon`, `connection`, `loading`, `window`, and a monster's life);
     its side (worker, page, or both, a row a side if they differ); its one
     field; its states; its one transition function and file; what clears
     it (which edge, which function); what a rejoin re-sends (its row in
     `REJOIN_SLOTS`, or `none` and why); and `door` (one field, one
     function, a suite that fails a second writer: life, session, a
     monster's life, the zone) or `todo`. A `todo` row lists today's
     fields and writers, read from the code, each with its file.
   - The guard (`tools/guards/phase-table.test.mjs`): every row has its
     columns; a `door` row's field has no writer outside its function (the
     door's own suite where one holds it today: the guard checks that
     suite names the field and the function, and never writes a second
     rule that could disagree); every slot of `REJOIN_SLOTS` is named by a
     row and every row's slot is in `REJOIN_SLOTS`; every name in the wire
     table's `phase` column (`server/src/wire/`, card N's) is a row; every
     ledger row with D's `phase` mark (11 today) is a row's field or is
     listed `not a machine` with why. The `todo` count is a census (rule
     3): it only falls, and the gatekeeper alone makes it strict.
   - Files: `src/state/phases.js`, `tools/guards/phase-table.test.mjs`,
     `tools/guards/state-ledger.test.mjs` (to take `phases.js` as the one
     file in `src/state/` that is not a ledger), `src/state/README.md`,
     new `docs/specs/phase-table.md`, `docs/SHAPES.md` (part 5's
     `implicit` list points at the table; part 8, the new names, rule 2).
   - Done when every machine of step 5.3b's list and SHAPES part 5's is a
     row, the four doors are `door`, and each break proof is tried: a
     second writer of `ps.life`, a slot added to `REJOIN_SLOTS` with no
     row, a ledger phase with no row.
3. **(tag 5203) `resetOn` at the one zone door, and the first systems'
   resets** (step 5.3, step 2).
   - A reset is a value, a function, or "kept, and why". State outside
     `S` joins through `resetOn(edge, fn)` at the one zone door
     (`changeZone`, `zoneTransitions.js`). The edges are D's three: `zone`,
     `death`, `rejoin`. Name the death's and the rejoin's one door in the
     spec (the rejoin's is likely `rejoinClear`, `rejoinSlots.js`): an
     edge with no one door gets none here; write it under Found.
   - **Chosen:** the reset lives beside its state, in its own system's
     file, registered with `resetOn`; a new leaf, `src/game/resetOn.js`,
     no imports, node-testable. The ledger records it: `lifetime` set by
     hand, and a new hand column `reset` (`value <v>`, `fn <name>`, or
     `kept: <why>`) that `--ledger --write` keeps (the README says it
     does). The page never imports a ledger (2,000 rows the page would
     carry). The guard (PR 1's) fails a row whose lifetime is an edge
     with no `resetOn` for it in a writer's file, and a `resetOn` whose
     field has no such row. Teaching the census script to read `resetOn`
     calls is a new output, not a change to D's reading rules.
   - **Each system has its switch** (rule 4): a lower-case `?name=0`
     (one a system) turns that system's resets off, and its node suite
     runs once with it thrown. Once card T's switch table is on `main`,
     each new switch is its row there (T's guard fails it otherwise).
   - The first systems: those with the fewest rows D suggests a reset for
     (today `life`, `liveops`, `debug`, `look`, `townsfolk`, `audio`,
     `memory`, `page-thread`, `art`, `preload`, `input`, `quests`,
     `monsters`: about 30 rows), unless the census says otherwise when you
     start. A row whose suggestion is wrong says `kept:` and why.
   - Files: new `src/game/resetOn.js`, `src/game/zoneTransitions.js` (the
     door's one call), each system's own files for its resets, its
     ledger, `src/state/README.md`, new `docs/specs/state-resets.md`, a
     node suite (`server/test/state-resets.test.mjs`: its merge deploys
     the worker), `docs/SHAPES.md` part 8 (`resetOn`).
4. **(tags 5204 on) The rest of the resets, a few systems a PR**, fewest
   suggested rows first: `desktop`, `social`, `economy`, `movement`,
   `skills`; then `data`, `combat`; then `wire`, `world`; then `ui`
   alone; then `render` alone (`ui` and `render` wait: below). Each PR
   lowers the rows still `sitting` with a suggestion (484 today), and the
   guard's line with it.
   - D's Found act here, each in its system's PR, a test each:
     `clearElemStatuses` with no caller, `S._nmlAsked`,
     `S._preDungeonMap`, `_npcDrawn`, `_stripStats`.
   - Done when no row with a suggestion is `sitting` (each has its edge
     and its reset, or `kept:` and why).
5. **(the tags after) The phase doors, one machine a PR**, each as the
   life door was built (v2.3.4820): step 1 changes nothing a player sees;
   one field, one transition function, which writes the old booleans for
   their readers; a suite that fails a second writer; a lower-case kill
   switch (`liveops.js`) on the worker, a `?name=0` on the page; its row
   in the table turned `door`; its row in `REJOIN_SLOTS` if a rejoin must
   re-send it (CLAUDE.md §5). The order, worker first, free files first:
   `trade`, `duel`, `party`, `cook`, `harvest`, `fishing`, `dungeon`,
   `guard`, `ride`, `pose`, `race`, `arena`; then the page's
   `connection`, `loading`, `window`. A phase sent to the phone is a new
   field on a message: its cap first (`CAP_GATES`), and its wire row
   (card N's table).
   - Done when the table has no `todo` row, or each left says why.

## Readings chosen for you

- **One field a phase, never a second boolean beside the first**
  (CLAUDE.md §5). The server never takes a phase from the phone's move:
  a move's field is a request.
- **A fix never turns on something nobody has seen** (TRAPS §305). A
  reset clears state; it never starts a sound, a screen or an effect. A
  reset that changes what a player sees, beyond the stale thing gone,
  is the owner's question: put it under Needs.
- **The resets' edge is the door's.** A system never listens for the
  edge itself (a timer, its own zone check): it registers with
  `resetOn`, and the one door calls it.
- **A reset of a field another file writes** goes in the file that
  writes it most (the ledger's `system`), and is named in the PR.
- Server phases need no ledger rows: the ledger is the page's state.
  Their rows in the phase table carry their fields.

## Files L waits on (read the status files again before each PR)

- `src/ui/BroTown.jsx` and the two renderers in `src/rendering/systems/`
  (`entityRenderer.js`, `effectsRenderer.js`), and every file of card H's
  families (`src/rendering/**`, `bodyBake.js`, the gear tab under
  `src/ui/`): **card H** is moving code there (its last PR, `body-bake`,
  tag 5049, is next). L touches none of them until H's status says
  `done`: the `ui` and `render` resets and the `loading` and `window`
  doors wait for it. **Never while card M runs** (part 11: the state's
  resets and the frame's steps never half-done together; M starts after
  L).
- `src/rendering/npcSprites.js`, `pixiApp.js`, `paletteLoad.js`,
  `cacheBytes.js`, `effectsRenderer.js`, `AceFlipPanel.jsx`: **card P**
  (#1736, #1743, its tree-tiers PR).
- `src/rendering/systems/minimapRenderer.js`: **card Y** (#1739).
- `src/debug/**`, `src/game/speedTest.js`, `src/ui/panels/DevPanel.jsx`,
  `ReportTable.jsx`; on the worker `join.js`, `leave.js`,
  `persistence.js`, `tick.js`, `index.js`, `roomrow.js`, `report.js`:
  **card A** (#1708, #1711).
- `server/src/join.js`, `persistence.js`, `bag.js`, `gold.js`,
  `nomansland.js`, `gladiator.js`: **card E** (its PR 5, the world's sum,
  and PR 6, `leave.js` and `daybook.js`). The `arena` door waits for both.
- `server/src/liveops.js`: cards A and E add flags. A new flag meets its
  neighbours on one line (TRAPS §333): say so in the status file.
- `src/networking/wsClient.js`: never while **card K** runs (not started
  today). The `connection` door goes before K starts, or after K.
- `server/test/liveops.test.mjs` §8f, §8g: **card T**.

## Not yours

The ledger's machine columns and D's reading rules (a fault: Found); the
frame's steps (card M); the action door (card K); the switch table itself
(card T: you add rows, never its form); anything a running card's status
names as its own.
