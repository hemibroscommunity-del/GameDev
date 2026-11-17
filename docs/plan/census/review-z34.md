# The gatekeeper's review, sitting 34 (card Z; tag 5672)

Taken 2026-11-17 on `main` ea7df6b0 (sitting 33 merged: R #2017, J2
#2019, K #2018, Z #2020). Two cards still run (K and L); the window
closed about 14:00 UTC; later arrivals go to sitting 35. Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open and not a draft,
with one merge base at every step (`git merge-base --all`, each against
`main` with the PRs above it merged in as merge commits). The tree after
each merge:

@@TREES@@

## K #2021 (5549): the move's top, the player's own (`movetop`)

READY (reviewed in full: `server/`). Card K item 14's second judge (the
move; its walls deferred by the planner: a new system and worker memory,
for when real players come; `docs/specs/move-top.md`). New in
`movement.js`: `MOVE_TOP` and `moveTopStatK(ps)`, the page's own walk
(150 px a second x `calcMoveSpeed`'s agility and swiftness, from the
worker's stored `ps.agility` and `ps.enduranceSpec.swiftness`) x the
fastest amulet (1.065) x the path tile (1.1) x a jump's flip (1.45) x
headroom 1.15, folded into `_moveSpeedK`'s `moveMult`, so every move
bound (the budget, the follow, the glide, the join's judge, the ride's
follow) reads it. The bow's and the staff's reach (`hitproof.js`
`_hitReach`, `{ reach: true }`) keep their run as before. `_moveCapFor`
keeps the burst's size at the old 1,580 px with it on (a lunge, a roll,
a gust, a stalled line's backlog), so only the refill tightens.
- Off (`_moveTopOn()` reads an own `true`): `_topK` 1 and the cap the
  old formula: every path byte for byte as today.
- The arithmetic checked against the page: `calcMoveSpeed`
  (gameSystems.js 5949), the path tile (BroTown.jsx 5534), the amulet's
  `moveSpd` (5573), `FLIP_BOOST_MAX` 0.45 (jump.js 445). A new character
  with it on: ~293 px a second before the buff, the ride and the sprint.
- `hitproof.js` is outside the move's listed files: one call given
  `{ reach: true }` so the reach does NOT change (no behaviour change).
- Its switch row lists the 26 checks that test the flat 500 itself
  (`move-budget`, `move-path` 5b, `ride` 3, `sprint`).
- The bench (`claims-gain` 2e): the honest walker and sprinter the same,
  no refusal on any disturbance; the move's liar 2.56 -> 1.17 (the bar
  1.5). K's phone runs with it on (before the flip factor, so tighter):
  sprint 38/38, townride 10/10, rollhit 5/5, questline 187/187; movepath
  10/11 (the harness walks in hops at 485 px a second); desklunge 8/12
  (red on main too). DEPLOYS the worker.

## L #2022 (5529): the duel's and the party's page doors

READY (reviewed in full: `src/`). Card L PR 5's page halves, the two
that share `gameEvents.js`. `src/game/duelDoor.js` `duelTo` (ways start,
resume, pending, drop, end, rejoin), the one writer of `S._inDuel` and
its note `S._activeDuel` (eleven places in four files before);
`src/game/partyDoor.js` `partyTo` (state, gone, rejoin), the one writer
of `S._party`. `?dueldoor=0`, `?partydoor=0` (page switches, ON).
- Each call site read against the lines it replaces: the same values in
  the same fields (the duel's `pending` leaves the note; `drop` clears
  the note only when it was this foe's, as before; `resume` and `start`
  write both). One narrowing: a `duel_accept` with no `from` now writes
  nothing (the worker always sends `from`); `?dueldoor=0` restores it.
- The phase table: duel and party `todo` -> `door` (11 -> 9 `todo`),
  `notes` for a field written beside the door's own; the census tool
  counts the notes. New suites `duel-page-door` (16), `party-page-door`
  (11); two older suites follow the moved lines.
- `mp-alliance` (reads the party): L's runs 13, 15, 15 of 16 on the
  branch, 14/16 with the party writes put back, 16/16 twice on main.
  @@ALLIANCE@@
- Only `server/test/` under `server/`: DEPLOYS the worker.

@@FLIP@@

## The rehearsal

@@REHEARSAL@@

## Z (this PR, 5672)

4.1b ticked: the send door (K #2006, #2013, #2014; the census strict,
#2020), merged at sitting 33. The plan noted for sitting 33's merges
(K #2018 under 4.2). Documents only: no deploy of its own.
