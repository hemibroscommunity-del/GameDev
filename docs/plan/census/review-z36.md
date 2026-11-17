# The gatekeeper's review, sitting 36 (card Z; tag 5674)

Taken 2026-11-17 on `main` 52244a81 (sitting 35 merged: K #2024, L
#2027, RT #2026, Z #2029). Two cards still run (K and L), told this
sitting's session at its start (15:37 UTC). Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open and not a draft,
with one merge base at every step (`git merge-base --all`, each against
`main` with the PRs above it merged in as merge commits). The tree after
each merge:

1 SEC #2030 9d5bd5d634026afa2ecf7e3b65ae2c6e4d9414c5 -> 3e7982267c4b4737eb6a15275a617b55f211620f
2 K #2028 30d7681eba2b841d800cedb446a1d8ec826b7194 -> f8c83a616c73eb72e391a486b9a19211d5d473df
3 L #2031 37bb49117d6db24f038ed9c99de88be17d47023f -> 8dfd8e5695459accf6b1193b301e6dff920c3f85
4 L #2033 97af140bad7b63e3f1628acb76353251c6a64736 -> c6c5c8a60390557c74e489130efd136545502a44
5 Z (this PR): its head and tree are in the list (`status/Z.md`).

The bases, step by step: #2030 52244a81; #2028 fe1297b0 (#2024's head,
on `main`); #2031 52244a81; #2033 37bb4911 (#2031's head: it holds #2031, merged in
at 16:21 so its status file and #2031's agree); this PR 52244a81. One
line each.

#2028 was built on #2024 (its one base fe1297b0, #2024's head, now on
`main`): the base GitHub shows (01b8f33d) is only the `main` it was
opened against. Reviewed and rehearsed at ffff340b (tree f16d6174); at
15:50 K sent 30d7681e, one commit on top: `docs/plan/status/K.md` only
(card K `done`, the planner's word: item 14 closed). The new tree differs
from the rehearsed one in that file alone.

## SEC #2030 (5700): card SEC, its status and its tag block

READY (documents and the tag table: step 3). The planner's message
(15:52 UTC) names card SEC (session ...oMQ3nmwcTbRueMgd, tags 5700-5719)
and card K2 (5720-5739). Open, not a draft, based on `main` 52244a81;
`test` green on 14cda149 and on its new head 9d5bd5d6 (SEC's message
at 16:33: one commit, `docs/plan/cards/SEC.md` only, +23 lines: items
16 to 20 and item 15's addition, "word for word, from the orchestrator
on the owner's 'go recommended'"). Rehearsed at 14cda149: the new
head's trees differ from the rehearsed ones in that file alone. Three
files: `docs/plan/cards/SEC.md` (the
card: PRs 2 to 15, the second red team's fixes that need no decision and
sit in no running card's files), `docs/plan/status/SEC.md` (`ready`),
`tools/dev/tag-blocks.json` (the block `"SEC": [[5700, 5719]]`;
`nextBlock` 5700 -> 5720). Tag 5700 the block's first; unused on `main`.
No deploy.
- K2's first PR also moves `nextBlock` (planner): it is not on this list;
  when it comes, it merges `main` with #2030 in first (the same line).
- For the owner: card SEC is new scope. Its words quote you, 2026-11-17
  (*"Go recommended"*; items 16 to 20: *"For all decisions waiting on me
  just go recommended"*); a gatekeeper cannot check them. Merge it if
  those are yours. Items 17 and 20 bring words a player reads (refusals)
  and 19 a tick in the Test panel, each behind its switch.
- SEC #2032 (5701, the join's id held to its form; `joinidform`, ON;
  `server/`) came at 16:33 and #2034 (5702) is a draft: both to sitting
  37 (a change to the join wants a full review and its own rehearsal,
  past this list's close). K2 #2035 (5720, `bodycap`, `server/`; card
  K2's PR 1) came at 16:35: sitting 37 too, after it merges the `main`
  that holds #2030 (both write `tag-blocks.json`'s block list).

## K #2028 (5553): `cookstart`, a cook is a cook the worker started (OFF)

READY (reviewed in full: `server/`). Card K PR 14, the cook's result
(4.2); K's tag 5553 (block 5540-5559). Open, not a draft (K marked it
ready at this sitting's start); `test` green on ffff340b (15:28 UTC).
- `test` green on 30d7681e too (15:59 UTC), with playable, memory-budget
  and lint-build.
- `server/src/cooking.js` `_cookStartOn()` (an own `true` only: OFF),
  `_cookStartTake(ps, fishKey, now, session)`: with it on, a
  `cook_request` lands only on the plan `extraction_start` rolled
  (`gathering.js` `_planCookHits`, `ps._cookHits`: its `fishKey`, `hits`,
  `rolledAt`), the same fish, once (`used`), and no sooner than
  ((hits - 1) x 650 + 1,510) x 0.7 ms after the roll (`COOK_START`, its
  two numbers mirrors of `gathering.js`, named). No plan at all (a worker
  restarted mid-cook): one result a session (`session._cookNoPlan`). A
  refusal is the rate's posture: dropped before the fish is taken, the
  state sent back. Placed after the rate and botfp checks, before the
  900 ms floor; test mode passes (`testmode.js` header, `test-mode.md`
  row: CLAUDE.md §5's three lists; `test-mode` §8 already names
  `cooking.js`).
- Lists: the switch table (`switches.mjs`, `SWITCHES.md`: `thrown:
  'true'`, `on: 'off'`, three `thrownFails`), the refusal list (`FROZEN`
  272 -> 273, its `ALLOW` line `rate`, the PR names it), K's status.
- The bench (`claims-gain` 2h, new): with it on, the honest cook takes
  what it took (1,508 an hour) and meets no refusal on any disturbance;
  the bare `cook_request` 1.59 -> 0.00; a cheat that starts each cook and
  answers at the plan's quickest 0.99 (under the bar). The census's line
  stays (the switch is off), as `bowshot`'s (#2023) did.
- Off, nothing changes: the only new code on the path is behind
  `_cookStartOn()`, false unless the live flags hold `cookstart: true`.
- Review note, not a hold: `_cookStartTake` marks the plan `used` (or a
  session's no-plan result spent) before the 900 ms floor and the bag's
  fish check, so a result those drop still spends its plan. An honest page
  starts every cook afresh (a new plan), so no honest cook is lost; for K
  when it is turned on.
- DEPLOYS the worker (`server/src/`).

## L #2031 (5531): the arena's page door

READY (reviewed in full: `src/`). Card L PR 5's page halves, the arena
(L's message at 16:04 UTC; based on `main`, 52244a81 merged in). Tag 5531:
L's block 5520-5539. `test` green on 37bb4911 (16:09 UTC).
- `src/game/arenaDoor.js` `arenaTo(S, way, involved, match, tid)` (one
  way, `poll`), the one writer of `S._arenaMatch` and its two notes
  (`_arenaInvolved`, `_arenaTournamentId`); its one caller the arena's
  status poll in `BroTown.jsx`, replacing four direct writes. Read side by
  side, the poll's old lines and the door write the same values in every
  case: involved `!!(queue || tourney)`; with a fighting status and a
  match, the match and the tournament's id; else the match null and the
  id kept. The door's one new refusal, a match that is no record, never
  meets the worker's answer (`arena.js` 143: `currentMatch: myMatch ||
  null`). `?arenadoor=0` writes what the poll asks.
- The phase table: page `arena` `todo` -> `door` (7 -> 6 `todo`); its
  guard's door-suite row; the state ledger's three rows move to the
  `social` system with the door as writer; SHAPES, SWITCHES, SYSTEMS, the
  switch table, `phase-table.md` each a line of their own. New suite
  `arena-page-door` (11 checks, its break proof named). Nothing a player
  sees changes.
- Only `server/test/` under `server/`: DEPLOYS the worker (with #2028's
  deploy, one).
- After it lands the phase line can go 7 -> 6 (sitting 37: only a merged
  count is ticked).

## L #2033 (5532): a relay's damage floater held to its form

READY (reviewed in full: `src/`). Card SEC's find, handed to card L by
the planner (L's message, 16:19 UTC). Tag 5532, L's block. It sits on
#2031: its first head f86bd164 (on `main`) met #2031 in
`docs/plan/status/L.md`; at Z's word L merged #2031's head (37bb4911,
no newer `main`) in and sent 97af140b. Over #2031 it changes three files
only: `gameEvents.js`, `relay-popup.test.mjs`, `status/L.md`.
- `src/networking/gameEvents.js` `monster_dmg_at` (a relay: another
  phone's words, passed on): the floater's text is `'-' + (Number(dmg)
  || 0)` and its place finite numbers, where it drew `payload.dmg` and
  `x`, `y` as sent (a string a sender chose drawn over your world). An
  honest number draws as before. Nothing else in the case changes.
- New suite `relay-popup` (6 checks): runs the real case, cut from the
  event switch (found by system, `filesOf`), in a sandbox.
- Review note, not a hold: a damage of `Infinity` still draws
  "-Infinity" (a number, never a sender's words).
- Only `server/test/` under `server/`: DEPLOYS the worker (with the
  others, one).

## The rehearsal

`tools/dev/gatekeeper.mjs` on 52244a81 with #2028 (at ffff340b): tree
f16d6174 (the same as the step-by-step merge); build PASS; questline
187/187; precheck 0 FAIL but the server suites' 5-minute limit under load
(the settled one, sittings 33 to 35; its one WARN the branch count), so
`cd server && npm test` was run alone in that tree: 480 suites, all green
(346 s). #2028's new head 30d7681e changes only K's status file against
that tree (tree 6c43fb23). This PR merged on top of both (one base,
52244a81; tree fce1b531): every guard in `tools/guards/` green (34), the
phase table 7 `todo`, at the line 7. `test` green on both of #2028's heads.

## Z (this PR, 5674)

The phase table's line 9 -> 7 (`tools/guards/phase-table.test.mjs`
`TODO_LINE`; 6 fails 7, tried), the count on `main` 52244a81 after L's
#2027. The plan noted for sitting 35's merges: 4.2 (K #2024, `swordswing`
and `movetop` ON), 5.3b (L #2027). Documents and the guard's one number:
no deploy of its own.
