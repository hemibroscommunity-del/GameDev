card: L
branch: claude/plan-l-8-resets (one branch a PR, each begun from the one before)
prs: #1746, #1748 (merged), #1767, #1775, #1779, #1791, #1796 (ready), PR 4 tag 5208 (ready)
state: ready

## Done

- PR 1 (5201, #1746): the ledger's guard reads the code on GitHub.
- PR 2 (5202, #1748): the phase table and its guard (36 rows, 5 door).
- PR 3 (5203, #1767): `resetOn` at the zone and rejoin doors, 16 rows
  (484 -> 468), state-resets.test; the phase guard's holes (sitting 8) shut.
- PR 4 tags 5204 (#1775), 5205 (#1779): desktop, social, movement; economy,
  skills: 39 rows, 468 -> 429.
- PR 4 tags 5206 (#1791), 5207 (#1796), 5208: data, combat, wire, world:
  195 rows, 429 -> 234; `clearElemStatuses` deleted (state-resets §7).

## Next

- PR 4's `ui`, `render` wait for card H. Asked planning: PR 5 meanwhile?

## Found

- Red on main, not L's: ownersounds 3 (Quick Eat's munch), deathzones 12
  (a mire wisp), mp-hitsound.mjs (6), race (Lil Bro's start, his jog cells),
  desklunge (1 to 4 of 12 by run: the lunge does not leave), bowprops 3
  (the Town Hall takes no arrow).
- bodytake.js ~94 cites "rejoinresend's pose row" (none); session.phase:
  three writers, held by the phase table's scan (not its suite).
- Dead: S._shieldStamina (never set), S.shieldActive, S._iceAttack (unread).
- monsterCombat.js's own respawn (!S._serverMonsters): an old path.

## Needs

- The owner: wheelMusic `_m` (a return to the Wheel's music at once),
  deskTeach `_armed` (no "Almost!" after a change of place), `S._nmlAsked`
  (No man's land's window again for a player once asked?): `sitting`.
- Card SK's ride.js (S._ride). S._spar: the takeover's leave, unread.
- Card H's `done` (9 rows under src/rendering/**); card A (perfTracker.js
  `zoneStats`). The page's death door (phase table `life`, page) heads
  PR 5's page doors; the 8 death rows land with it.
