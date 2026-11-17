# The gatekeeper's review, sitting 34 (card Z; tag 5672)

Taken 2026-11-17 on `main` ea7df6b0 (sitting 33 merged: R #2017, J2
#2019, K #2018, Z #2020). Two cards still run (K and L); the window
closed about 14:00 UTC; later arrivals go to sitting 35. Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open and not a draft,
with one merge base at every step (`git merge-base --all`, each against
`main` with the PRs above it merged in as merge commits). The tree after
each merge:

1 K #2021 633aad5cbc4c5dd9f044696786dc26a80aa87c91 -> 8435db296e258aea63bc55fa0a0b678deba6c91a
2 K #2023 5594e52d6ece32bd80cb506eb94172e5bacc9b3e -> 0bc2ffb281022a7599b14ee99a7646adccffd85a
3 L #2022 7010c83c70f221b479fbf9de9314c7bc2411ac23 -> b682f768c878cb46ee945da6c97db25e2bb175a0
4 Z (this PR): its head and tree are in the list (`status/Z.md`).

#2023 holds #2021's head (K merged 633aad5c in at sitting 34's word: the
two met in `status/K.md` and `claims-gain.test.mjs`); its one base after
#2021 lands is 633aad5c. L #2022 merged `main` ea7df6b0 in (7010c83c:
the same tree as its 4fb1fc7f merged with `main`).

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
  Sitting 34: 15/16 on the merged tree (`main` + #2021 + #2022), the
  same step (the board: an 8 s wait for the worker's list, `board: []`),
  and 16/16 on `main` once more. The step reads the Saloon's board, not
  `S._party`, and failed with the party writes put back: not held, and
  under Found (no card owns the scenario).
- Only `server/test/` under `server/`: DEPLOYS the worker.

## K #2023 (5550): a bow's claim is an arrow the worker saw leave (`bowshot`)

READY (reviewed in full: `server/`). Card K item 14's third judge (a
sword's claim labelled a bow's, TRAPS §329). New `server/src/bowshot.js`
(in `fight`'s scratch list: `_bs`, memory only), mixed into `GameRoom`;
with `bowshot: true`:
- the shot: each `player_projectile` relay (index.js, beside
  `_pfBowShot`) counts a bow's arrow from an allowance of 2 at the bow's
  own rate (`_pfBowCycleMs`, the flicked bow's); a staff's bolt and a
  special's are not judged; a paid retreat's arrow is free in its window;
- the claim: an ordinary `ranged` claim on a monster lands on one of the
  last 8 arrows counted (the one its `sw` names, else the oldest with a
  target left; each monster once an arrow, 1 + Piercing targets, 4 at
  most), or on an arrow drawn from the allowance (a relay lost costs an
  honest arrow nothing); past it, dropped quietly (`shot`; the quiet-drop
  list FROZEN 271 -> 272, named, `rate`).
- Left: a paid special's window (`_pveVolleyLive`), a staff, test mode
  (`_tm`, combat.js 1312), a player's arrow at a player.
- Off: `_bowShotSeen` returns before any state; `_bowShotDrop` is false
  (`_bowShotOn()` reads an own `true`): every path as today.
- The bench (`claims-gain` 2f, `claims.md`): the honest archers (a new
  flicking archer, a shot every 371 ms) unrefused on every disturbance;
  `bowlabel` 3.3 -> 1.60 with it on (the rest is the bow's reach, K's
  next judge). DEPLOYS the worker.
- Found: neither `bowshot` nor #2018's `swordswing` is said in
  `testmode.js`'s header list (CLAUDE.md §5; test-mode §8 checks files,
  and combat.js is listed): card K.

## Not on this list

- The owner's word, relayed by the planner at 13:21 UTC: `swordswing`
  and `movetop` ON ("Go recommended"). K's PR that turns both on had not
  opened when the window closed: sitting 35, after #2021.


## The rehearsal

`tools/dev/gatekeeper.mjs` on ea7df6b0 with #2021, #2023 and #2022 in
that order: tree b682f768 (the same as the step-by-step merges); build
PASS; questline 187/187; precheck 0 FAIL but the server suites' 5-minute
limit under load (the settled one), so `cd server && npm test` was run
alone in the merged tree: 478 suites, all green (351 s). Earlier, #2021
and #2022 alone: tree 1c39a73e, build PASS, questline 187/187, server 478
all green (342 s). `test` green on every listed head. No two listed PRs
share a file except #2023 with #2021 (it holds #2021's head) and the
switch table's rows (`switches.mjs`, `SWITCHES.md`: each its own line,
merged clean).

## Z (this PR, 5672)

4.1b ticked: the send door (K #2006, #2013, #2014; the census strict,
#2020), merged at sitting 33. The plan noted for sitting 33's merges
(K #2018 under 4.2). Documents only: no deploy of its own.
