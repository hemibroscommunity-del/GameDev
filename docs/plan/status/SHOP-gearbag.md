card: SHOP-gearbag
branch: claude/plan-shop-2-gearbag
prs: the draft PR of this branch (tag 6801, ready)
state: ready

## Done
- The phone's bag adopts the worker's armour, legs, cosmetic and amulet
  lists from every player_state, by id (add, never take; the cap 48; an old
  copy with no id answers once; a worn piece is held; a "?" stays a "?"), and
  every reply's piece (loot, chest, forge, quest, mail) goes in by the same
  one way: src/game/gearAdopt.js. wsClient.js and gameEvents.js gain calls.
  Phone-only (no worker change): `?gearadopt=0` turns the adopt off.
- server/test/gear-adopt.test.mjs: the real room (forge, chest, join seeds,
  the mail, the reveal) and the page's rule; the handlers' calls held by the
  syntax tree. Every dodge (a) to (i) planted: red. Mutation run: 149 of 150
  killed; the one survivor equivalent (a slot that is not a string is never
  worn: gearCatalog getEquip answers 'none').
- Seen green on the final code: precheck 0 FAIL (the whole server suite in
  it), mp-gearadopt 6 of 6.

## Next
- Nothing: the PR waits for the gatekeeper. Only server/test/ changed under
  server/: its merge does not deploy the worker.

## Found
- The bag stacks look-alike pieces on one tile with a count (GearPanels):
  not a fault; mp-gearadopt reads the counts.

## Needs
- Nothing. Taken beyond the card's list (made by their own scripts):
  src/game/switches.js and docs/SWITCHES.md (switch --write),
  tools/guards/lib/systems.mjs and docs/SYSTEMS.md (the new file's system),
  src/state/ui.js (state-census --ledger ui --write).
