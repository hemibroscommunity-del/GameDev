card: L
branch: claude/plan-l-23-ride-door (each PR on main, main merged in)
prs: #1746 to #1910 (merged), #1930 (5522, ready), 5523 ride door (worker, this branch, on #1930)
state: ready

## Done

- PR 1, 2 (#1746, #1748): the ledger's guard; the phase table and guard.
- PR 3, 4 (5203 to 5209, #1767 to #1803): `resetOn` at the zone and rejoin
  doors; the resets, 484 -> 233 rows.
- PR 5, 5210-5217, 5522-5523: the worker's trade, duel, party, cook, harvest+
  fishing, dungeon, pose, race, arena, ride doors; the page's (5218-5219,
  5520-5521): race, harvest+cook+fishing, pose, guard.

## Next

- #1930 arena (5522): mp-arena 28/28 (27/28 was timing), questline 187/187.
  On merge: card R may take the escrow ledger's other rows.
- Ride door (5523, ride.js only). The worker's guard door waits: it writes
  join.js, index.js (cards A, E); connection waits for K, loading/window H.
- Backlog (J2): a rejoin past 5 s clears the party and alliance forms: REJOIN_SLOTS.

## Found

- Red on main, not L's: ownersounds 3 (Quick Eat's munch), deathzones 12
  (a mire wisp), mp-hitsound.mjs (6), race (Lil Bro's start, his jog cells),
  desklunge (1 to 4 of 12 by run), bowprops 3 (the Town Hall takes no arrow),
  alliance (16, 14, 9 of 16 by run: the typed name or the war's tap lost),
  fishvariants (4a-5: no Inspect on the card; 6c by run: healed before Eat),
  moresounds (setup and 10 every run; 8b, 9a by run: other cues heard),
  deskharvest 5 (a phone's first-harvest hint, read as a computer's: to J2),
  blockface 2 (the block icon's disc: 13 of 560 px blue, on main too).
- bodytake.js ~94 cites a pose row that is none. Dead: S._shieldStamina,
  S.shieldActive, S._iceAttack, monsterCombat's respawn, playerActions' raiseShield.

## Needs

- The owner: wheelMusic `_m` (a return to the Wheel's music at once) and
  deskTeach `_armed` (no "Almost!" after a change of place): `sitting`.
- SK's ride.js (S._ride); S._spar (unread); A's perfTracker.js; death door leads.
