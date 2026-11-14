card: L
branch: claude/plan-l-5-resets (one branch a PR, each begun from the one before)
prs: #1746, #1748 (merged), #1767, #1775 (ready), PR 5 (working)
state: working

## Done

- PR 1 (5201, #1746): the ledger's guard reads the code on GitHub.
- PR 2 (5202, #1748): the phase table and its guard (36 rows, 5 door).
- PR 3 (5203, #1767): `resetOn` at the zone and rejoin doors; the census's
  `resets`; the guard's §6-7; 16 rows (484 -> 468); state-resets.test
  (deploys); the phase guard's two holes (sitting 8) closed.
- PR 4 (5204, #1775): desktop, social, movement: 22 rows, 468 -> 446.
- PR 5 (5205): economy, skills: 17 rows (a smelt's pose), 446 -> 429.

## Next

- PR 6 (5206): data, combat (card PR 4's list).

## Found

- run.mjs: the census's two guards are not in SLOW_FIRST (81 s, not 72).
- Red on main, not L's: ownersounds 3 (Quick Eat's munch), deathzones 12
  (a mire wisp), mp-hitsound.mjs (6), race (Lil Bro's start, his jog cells).
- bodytake.js ~94 cites "rejoinresend's pose row": there is none.
- session.phase: three writers, held by the phase table's scan (not its suite).
- Dead fields: S._shieldStamina (never set), S.shieldActive and
  S._iceAttack (never read; playerActions.js writes them).
- monsterCombat.js's own respawn (!S._serverMonsters): an old path.

## Needs

- The owner: wheelMusic `_m` (a return to the Wheel's music at once) and
  deskTeach `_armed` (no "Almost!" after a change of place): `sitting`.
- Card SK's ride.js (S._ride). S._spar: the takeover's leave, unread.
- Card H's `done` (9 rows under src/rendering/**); card A (perfTracker.js
  `zoneStats`). The page's death door (phase table `life`, page) heads
  PR 5's page doors; the 3 death rows land with it.
