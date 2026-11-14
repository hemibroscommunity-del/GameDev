card: L
branch: claude/plan-l-7-resets (one branch a PR, each begun from the one before)
prs: #1746, #1748 (merged), #1767, #1775, #1779, #1791 (ready), PR 4 tag 5207 (ready)
state: ready

## Done

- PR 1 (5201, #1746): the ledger's guard reads the code on GitHub.
- PR 2 (5202, #1748): the phase table and its guard (36 rows, 5 door).
- PR 3 (5203, #1767): `resetOn` at the zone and rejoin doors, 16 rows
  (484 -> 468), state-resets.test; the phase guard's holes (sitting 8) shut.
- PR 4 tags 5204 (#1775), 5205 (#1779): desktop, social, movement; economy,
  skills: 39 rows, 468 -> 429.
- PR 4 tag 5206 (#1791): data, combat: 65 rows, 429 -> 364; D's Found
  `clearElemStatuses` deleted, state-resets.test §7 holds it gone.
- PR 4 tag 5207: wire: 61 rows (the place's hazards), 364 -> 303.

## Next

- PR 4 tag 5208: world (D's Found `S._nmlAsked`).

## Found

- run.mjs: the census's two guards are not in SLOW_FIRST (81 s, not 72).
- Red on main, not L's: ownersounds 3 (Quick Eat's munch), deathzones 12
  (a mire wisp), mp-hitsound.mjs (6), race (Lil Bro's start, his jog cells),
  desklunge (1 to 4 of 12 by run: the lunge does not leave).
- bodytake.js ~94 cites "rejoinresend's pose row": there is none.
- session.phase: three writers, held by the phase table's scan (not its suite).
- Dead: S._shieldStamina (never set), S.shieldActive, S._iceAttack (unread).
- monsterCombat.js's own respawn (!S._serverMonsters): an old path.

## Needs

- The owner: wheelMusic `_m` (a return to the Wheel's music at once) and
  deskTeach `_armed` (no "Almost!" after a change of place): `sitting`.
- Card SK's ride.js (S._ride). S._spar: the takeover's leave, unread.
- Card H's `done` (9 rows under src/rendering/**); card A (perfTracker.js
  `zoneStats`). The page's death door (phase table `life`, page) heads
  PR 5's page doors; the 8 death rows land with it.
