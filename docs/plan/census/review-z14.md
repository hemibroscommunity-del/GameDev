# The gatekeeper's review, sitting 14 (card Z; tag 5371)

Taken 2026-11-14 on `main` at 1cce0b2 (tree 45dd9b75, sitting 13's ten
merged, exactly its rehearsed tree). Tags in this file are written bare.
Each new PR that changes `server/` or `src/` had a finder read the code
around its diff (the angles of `/repo-review` that apply), re-try its break
proofs and try to disprove what it found; the gatekeeper re-read every mend
pushed during the sitting itself. Documents and tools got step 3.

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or a reading). PLAUSIBLE: the code does it, what sets it
off is unproven (it says what would settle it). The probes are not in the
repository.

## Decided for the owner while away

Each with its switch, for the planning session to read to the owner:

- **#1825** (card R, listed): the storage's size in the day's book lands
  ON (the planning session's word: no row read or written, measured by
  cost-guard §15d). Its switch: `storesize: false` in the live flags.
- Not under the heading, the nearest: #1823, #1826, #1829 and #1830 say
  "Nothing" (no behaviour changes); T's two and TF's are tools and
  documents.
- For the owner, costs (never decided this way), each on the list
  because it changes no game cost, only the paid GitHub minutes:
  K's #1826 adds about 12 s of wall time to every server run (the
  slowest suite, 48 s on CI); card T's thrown run (#1817) adds its share
  to every PR's `test` (T's status: 29 s, at the card's 30 s line); the
  full thrown run (about 45 minutes) is the owner's to ask for.
- Still waiting for the owner's own word: card SK's #1782 (+8 to +10
  move messages a ride; `?ridecoast=0`), not listed; card R's PR 9 needs
  `lab.yml` changed (`.github/`: the owner's words only); card E's
  `arenasettleplan` and `econresetput` (both OFF).

## What GitHub shows, step by step (card Z's step 5b)

Every listed PR's base is `main` (`base.ref`). Merged down the list in its
order in a scratch copy (each a merge commit), every head had ONE merge
base with the `main` above it (`git merge-base --all`), this branch last
included. Card T's #1817 carries #1816. R's #1823 and #1825 each carry
#1817's head 0796e23 (merged in during the sitting, at the planning
session's word): after T lands each has one base, 0796e23. #1826's and
#1830's base is 82fb78d (sitting 12's `main`), the rest 1cce0b2 or T's.

**The collisions found and mended during the sitting** (each tried in a
scratch copy, then re-tried on the new head):

- R's #1823 against T's #1816, either order: `tools/guards/lib/systems.mjs`
  and `docs/SYSTEMS.md`, the `quests` system (T's switch link beside R's
  new door and file line). R merged T's head and kept both (f0307d6).
- R's #1825 after T: T's new check 11 (`switches.test.mjs`: "every worker
  row with needs names its reader") failed on `storesize` (needs
  `daybook`, no reader). R named `storeSizeRide in server/src/daybook.js`,
  which now asks `room._daybookOff()` directly (the scan does not follow
  the `off` arrow); the same test as `off(room)`, read by the gatekeeper
  (2273924).
- R's two each add the same `docs/plan/status/R.md`: identical copies,
  so they merge clean in either order (sitting 13's add/add is gone).
- K's #1826: its `docs/plan/status/K.md` now equals `main`'s, clean.

## Card T: #1816 (tag 5303) and #1817 (5304): listed FIRST

Step 3 as at sittings 12 and 13 (tools and documents: the switch table and
its page, card B's map, SHAPES' two lines, the spec, the thrown run's guard
and preload, T's status; no `server/` or `src/` file). Since sitting 13's
reading (7ba13be, f03a1b3) only `main`'s merges: card O's four rows and
TF's `?folkskills` placed by name (PR 4 sorts the table: check 10), and
the page count's first line 76 (`NO_PLAY_LINE`). CI `test` green at
cb127ae and 0796e23. From here a row's place is its name: R's
`storesize` and L's `dueldoor` both landed in their places with no
conflict (check 10 green on each).

## Card TF: #1828 (tag 5463): listed

Documents only (`docs/plan/status/TF.md`, `state: done`). True: #1770
and #1812 are on `main`. Its Found routes two finds to card J2
(`mp-ghostaudit`'s cook, the heldsweep's `R > J`) and one to card P.

## Card R: #1823 (PR 4, tag 5283): listed

**The skill points' door (it DEPLOYS), read at a4caf37, then f0307d6
(T's head merged in, the conflict kept both): clean (lows).** A finder
read all 26 roads against the lines they replaced (13 in prog3.js, 5 in
grids.js, 4 in join.js, the 4 deal callers), then ran `main`'s worker and
the PR's side by side on one room: 5,860 cases (allocate, a level-up of
one and two, the deal with the sum rule on and off, the old grid's
level-up and `stat_allocate`; counts of 0, fractions, negatives, missing,
null, NaN, strings, Infinity, true, 998, 999, non-object `poolBy`/`atk`).
The `prog3` block, `unspentT2`/`bp`/`level`, the replies, the message
types and the storage batches were byte-identical (4,624 batches each
side): nothing writes or sends more (VERIFIED). No await in
`_handleProg3Allocate` (rule 9); road lookups by `hasOwnProperty`
(`__proto__` throws, §4); `join.js` loads a returning old-grid character
and a fresh one the same.

- Low, VERIFIED: grids.js `_tryLevelUpFromBuildPoints` has no caller, so
  four of the 26 roads sit on dead code (the spec says so; R's Found).
- Nit, VERIFIED: §2 sees `.field` writes only: spar.js ~373 deep-copies
  a whole `prog3` into a spar clone by a computed key (in memory, never a
  record: harmless), and `NOT_POINTS` matches its text anywhere in the
  file.
- Nits: CLAUDE.md's new §8 row asks for an `EXPECT` line for every new
  road, where only a give or take needs one; five test files deal on
  roads named for real ones (labels only today).
- CLAUDE.md: the §5 line and the §8 row each a line of their own
  (approved). Suites: skillpoints-door 48, prog3, one-level, points-reset,
  statboards, grids, migrations, devtools and 67 suites naming the points
  fields green; break proofs re-tried (the old `p3.pool` line, the cap,
  a second caller: each FAIL). CI `test`, `memory-budget` green at
  f0307d6.

## Card R: #1825 (PR 8, tag 5287): listed, its own line

**The storage's size in the day's book (it DEPLOYS; a live flag), read at
7636207, then 2273924 (T's head merged; the reader above): clean
(lows).** No write added (VERIFIED): `storeSizeRide` runs inside
`putDays` before its first await, adds to today's sums only when today
already has sums this put writes, and `size` is on `DAYBOOK.RIDES`, so it
starts no put; a failed put carries it back with the rest. A put for
yesterday alone reads nothing. `databaseSize` is a synchronous getter
(rule 9), in a try. cost-guard §15b and §15d: 12 writes each, the size
read once. The card with an older worker's day says "not read that day".

- **A stored record's shape** (card Z's reading: its own line). Low,
  VERIFIED, a deliberate exception: the day's book gains a part while
  `DAYBOOK.V` stays 1, against the letter of CLAUDE.md §5. A finder ran
  `main`'s daybook.js on a day the PR wrote: it does not throw, keeps its
  own counts and writes the day back without `size`. A rollback loses one
  day's reading; a bump would lose the old worker's counts for that day.
  Accepted, with its why written (daybook.js ~77-96).
- Low, VERIFIED: stale words. ARCHITECTURE-HANDOFF's `daybook:` registry
  row (~132) and daybook.js ~28 still list the old shape, ~114 says "all
  four parts" (five now; at most 120 KiB, under 128); SHAPES part 7's
  room-row line still files the size under `room`. For R's next PR on
  the book.
- Nit, PLAUSIBLE (cannot happen on Workers: the clock does not move inside
  an event): `storeSizeRide` and its `bookAdd` read the clock twice; at
  midnight between them the size alone would go to the next day.
- Suites: store-size 18, daybook 97, roomrow 39, econ-card 41, cost-guard
  44, liveops 110, switches green; both break proofs re-tried (each FAIL).

## Card K: #1826 (PR 6, tag 5186): listed

**The gain bench (tests and a census; it DEPLOYS, new files in
`server/test/`), read at 4b718e1: clean (lows).** Run three times on a
quiet box: 25 s, byte-identical output but the timing line; `--write`
twice gives the committed `claims.md`; the break proof
(`CLAIMS_PLANT=reach`, 5.08) re-tried, FAIL. `claimbots.mjs` replaces
`setInterval` for good when imported, but run.mjs runs each suite in its
own process and only this suite imports it; `Date.now`, `Math.random` and
`console` are restored in a `finally` (DISPROVED as a risk to other
suites).

- Low, VERIFIED: the margin is wide. A gain fails past its line plus its
  whole spread over five seeds: the reach judge loosened 400 -> 500 px
  still passes (3.50), 520 fails. The card's finish line (a doubled reach
  fails) is met; a half-spread margin or longer runs would tighten it.
- Low, VERIFIED: 48 s on CI, the slowest of 410 suites: about 12 s more
  wall time on every server run (paid minutes; above).
- Nit, VERIFIED: 27 of the 81 "no refusal" runs (quest, sale, local) end
  their sends in the first 1.25 s, before their disturbance: they prove
  only that the bots do not throw.
- Nit, PLAUSIBLE: the lines were measured on Node 22, CI runs Node 20
  (green there; `--verbose` on Node 20 would settle the numbers).

## Card J2: #1830 (PR 6, tag 5425): listed

**`mp-lookarmour` green again (a test and its QA-only probe; no deploy),
read by the gatekeeper: clean.** `lookArmourProbe.js` is installed only
under `?lookprobe` / `?lookpalette=1` (entityRenderer.js ~101); its
`picture()` now draws each row into the RenderTexture as soon as it is
made, with no await between (the cache's 30 s sweep had freed an earlier
row's texture: the `alphaMode` red). The test keeps the page alive
(`H.keepAlive`, as `mp-elemhits`), and asks the atlas to grow first, on a
fresh atlas. J2 ran the full test, 8 of 8. CI `test` green.

## Card L: #1824 (PR 5's second, tag 5211)

**The duel door (it DEPLOYS; a live flag), read at 80a7237: clean
(lows).** `_resolveDuel`'s order is unchanged: its `!== 'active'` guard,
the status (now `_duelTo`, synchronous, and it cannot refuse there: the
guard has just proved `active`), `_duels.delete`, the consent, `duel_end`,
the arena, and last the fire-and-forget `duelpot:` credit; no await
added (rule 9), the escrow and `_duelEscrowSweep` untouched (rules 4-7).
No duel can be left `active` (angle F). `dueldoor: false` is the old line
exactly. The four exceptions are not duels (an alliance war, a clan war,
the arena's tournament, the old Arena object's). Both break proofs
re-tried (each FAIL).

- Low, VERIFIED: the gladiator.js exception (`t.status = `) is matched
  by text containment, so `mt.status = 'resolved'` written there passes
  the suite and the guard. Name its two real writes, or match the whole
  name.
- Nit, VERIFIED: "a duel born outside `_makeDuel` fails" is checked in
  duel.js and gladiator.js's `_makeDuel({` only; a hand-built
  `_duels.set` in gladiator.js passes; a caller's `status` wins in
  `_makeDuel`'s `Object.assign`.
- Its conflict: `tools/guards/phase-table.test.mjs`'s `DOOR_SUITES` end
  with card O's `_rung` row (on `main`). Kept both in a scratch copy
  after T: `switches.test` and `phase-table.test` all green, `dueldoor`
  in its name's place.

## Card K: #1829 (PR 5, tag 5185)

**The action door (`src/game/actions.js`, 180 rows; the shim's chain one
lookup; it DEPLOYS, five suites in `server/test/`), read at c0ca6cb
(c096522: K's status only): clean (lows).** The finder made its own
equivalence, not the PR's §6: `main`'s chain (66 blocks, 94 types),
`PRIORITY_EVENTS` (31) and `SETTLED_SENDS` (9) against the door's
rows: 0 differences; then `main`'s and the head's `channelShim.send` run
on stubs that record every call, 1,488 cases (186 names, each as a type
and as an event, bundling on and off, the socket open and closed): 0
differences in return, settle stamp or call order (VERIFIED: nothing
leaves the phone otherwise). `__proto__`, `constructor`, `toString`,
`valueOf` read as no row; the lookup is an own-property check with no
allocation, in place of up to 94 compares a move walked. `act()` and
`makeReqId()` have no caller: no field is added to any live message.
Client +1.9 KB gzipped (an esbuild estimate).

- Low, VERIFIED, not live: the `item_drop` and `report` rows lack
  `body: 'top'` (the page and the worker read their fields at the top:
  itemDrop.js ~65, report.js ~433; itemdrop.js ~103, report.js ~275).
  Through `act()` a drop would be refused and the field report dropped
  unseen. It bites at K's PR 7 ("the same payload, the same way"); the
  guard's §5 tries two rows only. Nit: on `nml_attack` (`req` and top)
  `act()` puts `reqId` at the top, where SHAPES part 2 says
  `payload.reqId`. For K before PR 7.
- Low, VERIFIED, not live: the teardown sets `S.channel = null` but never
  `setActionTransport(null)`: an `act()` after a teardown would reach the
  dead shim (for `node_strike`, `reconnectNow()` from a torn-down set-up:
  the zombie socket of 4367/4482). One line, before PR 7.
- Low, VERIFIED: "every request has a row" is not yet true: SocialPanel.jsx
  sends `friend_dm`, `friend_remove`, `friend_accept`, `friend_decline` by
  a variable (~150, ~175, ~299, ~301), unseen by §2; they batch as
  before.
- Nits: CLAUDE.md's new §5 line says a request leaves through `act()`
  (nothing calls it until PR 7; one 118-character line); TRAPS §18 still
  describes the old chain (not K's file); `doorCounts()` copies by
  `Object.assign({}, ...)` (a diagnostic).
- Suites: action-door 12, state-ledger, wire-table 27, systems,
  tests-by-system, shapes-once, four-lines, switches; the five changed
  suites (each the same assertion, read from the door), mute-kept,
  quiet-phone, quest-kept, wire-audit, wire-hostile green; precheck's
  `shim-allowlist` and `town-gate` PASS; three break proofs re-tried
  (each FAIL).
- **Its conflict:** `docs/SYSTEMS.md`'s `wire` system with T's #1816 (T's
  switch link beside K's new file line), either order.

## Card K: #1831 (PR 2, tag 5182): HELD (a conflict), next batch

Opened during the sitting: the worker's other lists made from the wire
table (12 worker files, fightlock.js among them; +137 KB raw). Conflicts
with T's #1816 at `docs/SHAPES.md` (and so with R's two, which carry T).
K merges the new `main` after this list lands; the next sitting reviews
it in full.

## Not open

- Card P's fire goblin (A'): no branch, no PR.

## The lines

On `main` 1cce0b2, lowered in this PR (only the gatekeeper lowers one):

- `tools/guards/lib/fourLines.mjs`: entityRenderer.js 8961 -> 8955 (card
  TF's #1812). Every other file and function at its line; the cycles at
  5 (29 files); the writes to `S` from rendering at 114.
- `tools/guards/phase-table.test.mjs` `TODO_LINE` 31 -> 30 (30 `todo`
  since card L's #1809).
- The switch table's unlisted line goes to 0 in card T's #1816 itself.

## The whole

Rehearsed with `tools/dev/gatekeeper.mjs` from `main` 1cce0b2.

1. #1816, #1817, #1828, #1823 (f0307d6), #1825 (2273924), #1826, #1830
   (tree 0f04b30b): precheck 0 FAIL (3 WARN), build, questline (below).
