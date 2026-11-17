# The gatekeeper's review, sitting 35 (card Z; tag 5673)

Taken 2026-11-17 on `main` 01b8f33d (sitting 34 merged: K #2021, K
#2023, L #2022, Z #2025). Two cards still run (K and L), told this
sitting's session at its start (14:22 UTC). Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open and not a draft,
with one merge base at every step (`git merge-base --all`, each against
`main` with the PRs above it merged in as merge commits). The tree after
each merge:

1 K #2024 fe1297b0b43e5c23f19a7d57847bdeb17544ea8d -> 72a2f75571700a54e74ee580358fdc2c77cadf17
2 L #2027 679e99ace270943d914539e02aacb244497e3aa0 -> c4b358d0849a7481ee4f576464e1dbc9b92e70e8
3 RT #2026 a75ba2af1025a574eca0c0990e234e33bf03213d -> ede3156a78323938001efc1b53b2bcf889d4d85a
4 Z (this PR): its head and tree are in the list (`status/Z.md`).

#2024 was built on #2021 and #2023, both now on `main`. Rehearsed at
c778c680 (one base 5594e52d, tree a8c82322); at 14:44 K sent fe1297b0:
`main` 01b8f33d merged in (its one base now `main` itself) and sitting
34's carry fixed. The new tree differs from the rehearsed one in three
files only: `server/src/testmode.js` (five comment lines), `docs/specs/
test-mode.md` (two rows), `docs/plan/status/K.md`.

## K #2024 (5551): `swordswing` and `movetop` ON (the owner's yes)

READY (reviewed in full: `server/`). The owner's yes, relayed by the
planner at 13:21 UTC: "Go recommended". The two switches merged OFF
(#2018 at sitting 33, #2021 at sitting 34), reviewed then in full; this
PR turns their defaults:
- `server/src/movement.js` `_moveTopOn()` and `server/src/swordswing.js`
  `_swordSwingOn()`: from "an own `true`" to "on unless an own falsy
  value", the form the ON switches already use (`power.js` 349,
  `store.js` 1250, 1283). `movetop: false` / `swordswing: false` in the
  live flags is the kill switch: every path as before #2021 / #2018.
- The switch table (`switches.mjs`, `SWITCHES.md`): both rows `thrown:
  'false'`, `on: 2026-11-17`; their `thrownFails` now the one check that
  tests the new path (move-budget 10, hit-proof 4b).
- 16 server suites: those that test the flat 500 px a second itself
  (move-budget 1-8, move-path, ride, sprint, potions, prog3, last-place,
  monsterstatus) set `movetop: false` explicitly; those that swing a test
  sword faster than a cycle clear the swing's bucket (`_ss`) as they
  already clear the cadence (`_monHitCad`): "the next swing a cycle
  later, as in real play". No assertion removed; hit-proof 4b's count
  30 -> 24 (one swing takes SWING_TARGETS, #2018's own rule);
  combat-lifecycle section 6 measures the spark with `swordswing: false`
  (the sword's `noKb` is only believed there) and puts the flags back.
  New: move-budget 10 (with `movetop` on, an honest walk and a walk just
  under its own top all taken; 600 px a second with no stats behind it
  followed, not taken whole).
- The bench (`claims-gain`): the expected gains `reach` 2.96 -> 1.42 and
  `move` 2.56 -> 1.17; 2d and 2e now run their off sides with the switch
  thrown, and 2e asks the on gain to be under the bar AND under the off.
- What a player feels: a sword claim lands from 150 px (was 400), one
  swing a cycle with an allowance of two, a swing's ring at 24 targets;
  the move's bound is the player's own top speed (a new character ~293 px
  a second before the buff, the ride and the sprint) instead of 500. K's
  phone runs at #2021 with `movetop` on: sprint 38/38, townride 10/10,
  rollhit 5/5, questline 187/187.
- Review note, not a hold: the ride, sprint and potion suites are now
  held only on the flat bound (`movetop: false`); with it on they are
  covered by the bench and #2021's phone runs, not by a node suite.
- Sitting 34's carry, fixed here (fe1297b0): `swordswing` and `bowshot`
  (each asks `_tm`, combat.js 1312-1375, 1735) are now named in
  `testmode.js`'s header and `test-mode.md`'s table (CLAUDE.md §5's three
  lists; `test-mode` §8 already lists combat.js). Comments and a doc
  only: no behaviour change.
- DEPLOYS the worker (`server/src/`).

## L #2027 (5530): the trade's and the ride's page doors

READY (reviewed in full: `src/`). Card L PR 5's page halves, the trade
and the ride (L's message at 14:51 UTC; based on `main`, holding
01b8f33d; one base before and after #2024 lands). Tag 5530: L's block
5520-5539.
- `src/game/tradeSlot.js` `t2LiveTo` (ways open, close, rejoin), the one
  writer of `S._t2Live` (four writes in `gameEvents.js`, one in
  `rejoinSlots.js` before). Open takes an id (true, a non-empty string
  or a finite number), the others none; the worker's trade id is a
  `crypto.randomUUID()` string (`trade2.js` 204), so every write the old
  code made is made, with the same value. `?tradedoor=0` writes what the
  caller asks.
- `src/game/ride.js` `rideTo` (ways make, apply, forget), the one writer
  of `S._ride` and its `on`: `r0`'s record (`RIDE_FRESH`, the same 18
  fields and values as the literal it replaces), `rideApply`'s `on`,
  `clearRide`'s null. The record's other numbers stay notes written by
  their own steps. `?ridedoor=0`. `ride.js` now imports the page's switch
  reader (`switches.js`, no imports of its own; `sw` is cached by the
  page's address), so node still tests it.
- The phase table: page `trade` and `ride` `todo` -> `door` (9 -> 7
  `todo`); the state ledger's `_ride` and `_t2Live` rows name the doors;
  SHAPES, SWITCHES and the switch table each a line of their own. New
  suites `trade-page-door`, `ride-page-door`; `trade-window-slot` 4f
  follows the import line. Nothing a player sees changes.
- Only `server/test/` under `server/`: DEPLOYS the worker (with #2024's
  deploy, one).
- After it lands the phase line can go 9 -> 7 (sitting 36: only a
  merged count is ticked).

## RT #2026 (5059): two pieces of an outside review into the plan

READY (documents only: step 3). No card's: the planning side's own plan
edit, its tag from that side's own run (5055 to 5058 merged before; 5059
unused on `main`), its status file `status/RT.md` (`ready`); open, not a
draft since 14:34, `test` green on a75ba2af (holding `main` 01b8f33d).
Three files: `GRAND-PLAN.md` (5.5 gains "tables first": the renderers'
hand-tuned tables leave as leaf files before any code moves; a new 7.5
[LATER] "the caps leave too": a census of the 173 caps, then 7.2's
four-week rule), `docs/specs/grand-plan-review.md` (round 4, the seven
recommendations), `status/RT.md`. It quotes the owner, 2026-11-17: "Add
whatever pieces are worth adding". Not rehearsed (documents); merges
clean with this PR (they touch the plan in different places). No deploy.
- For the owner: 7.5 is new plan scope. The PR quotes your words; a
  gatekeeper cannot check them. Merge it if those are yours.

## The rehearsal

`tools/dev/gatekeeper.mjs` on 01b8f33d with #2024 (at c778c680, its
first head) alone: tree a8c82322; build PASS; questline 187/187;
precheck 0 FAIL but the server suites' 5-minute limit under load (the
settled one, sittings 33 and 34), so `cd server && npm test` was run
alone in that tree: 478 suites, all green (325 s). #2024's new head
fe1297b0 changes only comments, a spec table and K's status against that
tree; `test-mode` and `send-door` (the suites that read `testmode.js`)
green on its tree 72a2f755.

Then the list: #2024 (fe1297b0) and #2027 in that order: tree c4b358d0
(the same as the step-by-step merges); build PASS; questline 187/187;
precheck the same one timeout and nothing else red (its one WARN the
branch count); `cd server && npm test` alone: 480 suites, all green
(368 s). This PR merged on top (one base, 01b8f33d): every guard in
`tools/guards/` green (34), the phase table 7 `todo` under the line 9.
`test` green on every listed head. No two listed PRs share a file but
the switch table's rows (`switches.mjs`, `SWITCHES.md`: each its own
line, merged clean) and this PR's `phase-table.test.mjs` with #2027
(another part of the file, merged clean).

## Z (this PR, 5673)

The phase table's line 11 -> 9 (`tools/guards/phase-table.test.mjs`
`TODO_LINE`; 8 fails 7, tried), the count on `main` 01b8f33d after L's
#2022. The plan noted for sitting 34's merges: 4.2 (K #2021 `movetop`,
#2023 `bowshot`, both merged OFF), 5.3b (L #2022). Documents and the
guard's one number: no deploy of its own.

