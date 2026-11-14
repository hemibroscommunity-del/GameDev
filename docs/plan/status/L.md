card: L
branch: claude/plan-l-3-resets (one branch a PR, each begun from the one before)
prs: #1746 (merged), #1748 (ready), PR 3 (opening)
state: working

## Done

- PR 1 (5201, #1746): the ledger's guard and four-lines' fourth number read
  the code on GitHub; the guard holds the machine's columns. Deploys.
- PR 2 (5202, #1748): the phase table (36 rows, 5 door, 31 todo) and its
  guard; the spec; SHAPES parts 5, 7, 8. No game file.
- PR 3 (5203): `resetOn` (src/game/resetOn.js, map system `state`), the
  zone door's call (changeZone, a real change only) and the rejoin door's
  (rejoinClear); the census's `resets`; the guard's §6-7, SITTING_LINE
  484 -> 468; 16 rows decided (2 resets: the pose, the shots' ends; 14
  kept:); state-resets.test (deploys). Planning session's calls, 2026-11-14.

## Next

- PR 4 (5204): desktop, social, economy, movement, skills (by fewest rows).

## Found

- run.mjs: the census's two guards are not in SLOW_FIRST (81 s, not 72).
- Red on main 7593b4e, not L's: ownersounds 3 (Quick Eat's munch),
  deathzones 12 (a mire wisp's squash), mp-hitsound.mjs (6 voice checks).
- bodytake.js ~94 cites "rejoinresend's pose row": there is none.
- session.phase: three writers, held by the phase table's scan (not its suite).
- Dead fields: S._shieldStamina (never set), S.shieldActive and
  S._iceAttack (never read; playerActions.js writes them).
- monsterCombat.js's own respawn (!S._serverMonsters): an old path.

## Needs

- The owner: wheelMusic.js `_m` reset at the zone door would make a return
  to the Wheel pick its land's music at once (resetWheelMusic's words);
  today the last visit's wait may hold. Left `sitting` until asked.
- Card H's `done` (9 rows under src/rendering/**); card A (perfTracker.js
  `zoneStats`). The page's death door (phase table `life`, page) heads
  PR 5's page doors; the 3 death rows land with it.
