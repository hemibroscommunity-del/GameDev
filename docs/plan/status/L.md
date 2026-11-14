card: L
branch: claude/plan-l-9-door-tree (one branch a PR, each begun from the one before)
prs: #1746, #1748 (merged), #1767, #1775, #1779, #1791, #1796, #1801 (ready), PR 4 tag 5209 (ready)
state: ready

## Done

- PR 1 (5201, #1746), PR 2 (5202, #1748): the ledger's guard on GitHub; the
  phase table and its guard (36 rows, 5 door).
- PR 3 (5203, #1767): `resetOn` at the zone and rejoin doors, 16 rows
  (484 -> 468), state-resets.test; the phase guard's holes (sitting 8) shut.
- PR 4 tags 5204 (#1775), 5205 (#1779): desktop, social, movement; economy,
  skills: 39 rows, 468 -> 429.
- PR 4 tags 5206 (#1791), 5207 (#1796), 5208 (#1801): data, combat, wire,
  world: 196 rows, 429 -> 233; `clearElemStatuses` deleted (state-resets §7).
- PR 4 tag 5209: the phase guard reads DOOR_SUITES' doors off the tree too.

## Next

- PR 5's worker doors (trade first; tags 5210 on, then 5520 to 5539), and
  PR 4's `ui`/`render` in the files TF and SK do not hold (H is done).

## Found

- Red on main, not L's: ownersounds 3 (Quick Eat's munch), deathzones 12
  (a mire wisp), mp-hitsound.mjs (6), race (Lil Bro's start, his jog cells),
  desklunge (1 to 4 of 12 by run: the lunge does not leave), bowprops 3
  (the Town Hall takes no arrow).
- bodytake.js ~94 cites "rejoinresend's pose row" (none); session.phase:
  three writers, held by the phase table's scan (not its suite).
- Dead: S._shieldStamina, S.shieldActive, S._iceAttack; monsterCombat.js's
  own respawn (!S._serverMonsters), an old path.

## Needs

- The owner: wheelMusic `_m` (a return to the Wheel's music at once) and
  deskTeach `_armed` (no "Almost!" after a change of place): `sitting`.
- Card SK's ride.js (S._ride). S._spar: the takeover's leave, unread.
- Card A (perfTracker.js `zoneStats`). The page's death door heads PR 5's
  page doors; the 8 death rows land with it.
