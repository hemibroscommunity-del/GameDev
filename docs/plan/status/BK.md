card: BK
branch: claude/plan-bk-1-worldsum
prs: 6460 (ready, opening)
state: ready

## Done

- 6460 (PR 1): world-sum writes down every road the room's real handlers
  ran (a module hook in front of the bag's and stashes' doors, the gold door
  wrapped on the room; a door called by hand is not counted), and fails a
  move or escrow road (51) neither played nor on UNPLAYED (7, a line that
  only falls). §1 now plays the General Store, the Auction House, the
  jackpot, duel.js, gladiator.js, an item drop, a staged weapon, the gift
  trade, gear worn, No man's land's kill. Plants 2 and 3 red by the sum
  itself ("slime_gel 1", "unexplained gold 3"); a new unplayed escrow row
  red by the gate.

## Next

- 6461 (PR 2): the restart sweep made from VALUE_PAUSE (plant R2 red).

## Found

- `escrow_debit_stored` (gold.js) looks unreachable from a handler: every
  route that takes it asks for a live session first (httpauth.js). On
  UNPLAYED with that reason.
- `escrow_item`, `escrow_item_stored` run only with `ahonewrite: false`
  (store.js): the old listing path behind its switch.
- Mints and burns (harvest, cook, forge, a weapon's sale, a quest's hand-in,
  loot gold, pets, the farm) are not held by the gate: a mint is explained
  by construction; a door that books other than it moves is card DG's.

## Needs

- Nothing.
