card: L
branch: claude/plan-l-14-harvest-door (each PR on main, main merged in)
prs: #1746 to #1835 (merged; #1791, #1796, #1801 through #1809, #1824), #1839 (5213), #1851 (5214)
state: ready

## Done

- PR 1 (5201, #1746), PR 2 (5202, #1748): the ledger's guard on GitHub; the
  phase table and its guard (36 rows, 5 door).
- PR 3 (5203, #1767): `resetOn` at the zone and rejoin doors, 16 rows
  (484 -> 468), state-resets.test; the phase guard's holes (sitting 8) shut.
- PR 4 tags 5204 to 5209 (#1775 to #1803, merged): 235 rows, 468 -> 233;
  `clearElemStatuses` deleted; the guard reads DOOR_SUITES' trees.
- PR 5 tags 5210 to 5212 (merged), 5213, 5214: the worker's trade, duel, party,
  cook, harvest+fishing doors (`_t2To`, `_duelTo`, `_partyIn`, `_exTo`,
  `_harvestTo`); live flags `tradedoor` ... `harvestdoor`.

## Next

- PR 5: the dungeon door (5215); each page half after its worker door,
  its own PR; `connection` after card K's last wsClient.js PR.

## Found

- Red on main, not L's: ownersounds 3 (Quick Eat's munch), deathzones 12
  (a mire wisp), mp-hitsound.mjs (6), race (Lil Bro's start, his jog cells),
  desklunge (1 to 4 of 12 by run), bowprops 3 (the Town Hall takes no arrow),
  alliance (16, 14, 9 of 16 by run: the typed name or the war's tap lost),
  fishvariants (4a-5: no Inspect on the card; 6c by run: healed before Eat).
- bodytake.js ~94 cites a pose row that is none; session.phase: the scan's.
- Dead: S._shieldStamina, S.shieldActive, S._iceAttack; monsterCombat.js's
  own respawn (!S._serverMonsters), an old path.

## Needs

- The owner: wheelMusic `_m` (a return to the Wheel's music at once) and
  deskTeach `_armed` (no "Almost!" after a change of place): `sitting`.
- Card SK's ride.js (S._ride). S._spar: the takeover's leave, unread.
- Card A (perfTracker.js `zoneStats`). The page's death door heads PR 5's
  page doors; the 8 death rows land with it.
