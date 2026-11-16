card: L
branch: claude/plan-l-21-guard-page (each PR on main, main merged in)
prs: #1746 to #1866 (merged), #1876 (5218), #1894 (5219), #1903 (5520), #1910 (5521)
state: ready

## Done

- PR 1, 2 (#1746, #1748): the ledger's guard; the phase table and guard.
- PR 3, 4 (5203 to 5209, #1767 to #1803): `resetOn` at the zone and rejoin
  doors; the resets, 484 -> 233 rows.
- PR 5 tags 5210 to 5213 (merged), 5214 to 5217: the worker's trade, duel,
  party, cook, harvest+fishing, dungeon, pose, race doors; the page's: 5218
  race (`raceTo`), 5219 harvest+cook+fishing (`harvestTo`), 5520 pose (`poseTo`),
  5521 guard (`guardTo`).

## Next

- PR 5: free page halves (5522 on); the worker's guard waits for K (combat.js,
  index.js), ride SK, arena E's e-14, death door K's k-7, `connection` K.
- Backlog (J2's find): a rejoin (a stall past 5 s) clears the party and the
  Saloon's alliance forms (what was typed is lost): a REJOIN_SLOTS row.

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
