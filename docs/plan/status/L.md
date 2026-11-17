card: L
branch: claude/plan-l-31-arena-page (from main)
prs: #1746 to #2027 (merged), #2031 (5531): ready
state: ready

## Done

- PR 1, 2 (#1746, #1748): the ledger's guard; the phase table and guard.
- PR 3, 4 (5203 to 5209, #1767 to #1803): `resetOn` at the zone and rejoin
  doors; the resets, 484 -> 233 rows.
- PR 5, 5210-5217, 5522-5523: the worker's trade, duel, party, cook, harvest+
  fishing, dungeon, pose, race, arena, ride doors; the page's (5218-5219,
  5520-5521, 5525-5531): race, harvest+cook+fishing, pose, guard, veils, windows,
  connection, duel, party, trade, ride, arena.
- 5524: the Saloon's alliance drafts outlive a rejoin (J2's find).

## Next

- Next: the page halves left (life, fight, dungeon), grouped
  by file. Guard (worker) waits for K2's index.js PRs (planner, 15:52).

## Found

- Red on main, not L's: ownersounds 3 (Quick Eat's munch), deathzones 12
  (a mire wisp), mp-hitsound.mjs (6), race (Lil Bro's start, his jog cells),
  desklunge (1 to 4 of 12 by run), bowprops 3 (the Town Hall takes no arrow),
  alliance (16, 14, 9 of 16 by run: the typed name or the war's tap lost),
  fishvariants (4a-5: no Inspect on the card; 6c by run: healed before Eat),
  moresounds (setup and 10 every run; 8b, 9a by run: other cues heard),
  deskharvest 5 (a phone's first-harvest hint, read as a computer's), blockface 2 (the block icon's disc: 13 of 560 px blue, on main too),
  comeback 1, 5 (on main c55c8b59). precheck's 5-min server limit < the suite's ~310 s.
- bodytake.js ~94 cites a pose row that is none. Dead: S._shieldStamina,
  S.shieldActive, S._iceAttack, monsterCombat's respawn, playerActions' raiseShield.

## Needs

- Decided by the planner (2026-11-17, the owner's "go recommended"): wheelMusic
  `_m` (the Wheel's music returns at once), deskTeach `_armed` (no "Almost!"
  after a change of place): both `sitting`, as written.
- SK's ride.js (S._ride); S._spar (unread); A's perfTracker.js; death door leads.
