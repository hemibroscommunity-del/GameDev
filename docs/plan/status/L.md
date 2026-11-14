card: L
branch: claude/plan-l-17-race-door (each PR on main, main merged in)
prs: #1746 to #1839 (merged), #1851 (5214), #1855 (5215), #1864 (5216), PR 5 tag 5217: ready
state: ready

## Done

- PR 1, 2 (#1746, #1748): the ledger's guard; the phase table and guard.
- PR 3, 4 (5203 to 5209, #1767 to #1803): `resetOn` at the zone and rejoin
  doors; the resets, 484 -> 233 rows.
- PR 5 tags 5210 to 5213 (merged), 5214 to 5217: the worker's trade, duel,
  party, cook, harvest+fishing, dungeon, pose, race doors (`_t2To` ...
  `_raceTo`); live flags `tradedoor` ... `racedoor`.

## Next

- PR 5: guard waits for card K (combat.js, index.js), ride for SK, arena for
  E's e-14; then each page half after its worker door; `connection` after
  card K's last wsClient.js PR.
- Backlog (J2's find): a rejoin (a stall past 5 s, RESYNC_AWAY_MS) clears the
  party at state_sync and makes the Saloon's alliance forms afresh, empty:
  what was typed is lost. A REJOIN_SLOTS row, with the page's party door.

## Found

- Red on main, not L's: ownersounds 3 (Quick Eat's munch), deathzones 12
  (a mire wisp), mp-hitsound.mjs (6), race (Lil Bro's start, his jog cells),
  desklunge (1 to 4 of 12 by run), bowprops 3 (the Town Hall takes no arrow),
  alliance (16, 14, 9 of 16 by run: the typed name or the war's tap lost),
  fishvariants (4a-5: no Inspect on the card; 6c by run: healed before Eat),
  moresounds (setup and 10 every run; 8b, 9a by run: other cues heard).
- bodytake.js ~94 cites a pose row that is none; session.phase: the scan's.
- Dead: S._shieldStamina, S.shieldActive, S._iceAttack, monsterCombat's respawn.

## Needs

- The owner: wheelMusic `_m` (a return to the Wheel's music at once) and
  deskTeach `_armed` (no "Almost!" after a change of place): `sitting`.
- Card SK's ride.js (S._ride); S._spar (the takeover's leave, unread); card
  A's perfTracker.js. The page's death door (its 8 rows) leads the page.
