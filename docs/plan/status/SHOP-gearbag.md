card: SHOP-gearbag
branch: claude/plan-shop-2-gearbag
prs: the draft PR of this branch (tag 6801)
state: working

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

## Next
- The phone test mp-gearadopt, precheck, the PR.

## Found
- (none yet)

## Needs
- Nothing.
