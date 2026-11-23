card: BK
branch: claude/plan-bk-2-restart (on claude/plan-bk-1-worldsum)
prs: #2278 6460 (ready), 6461 (ready, opening)
state: ready

## Done

- 6460 (PR 1): world-sum writes down every road the room's real handlers
  ran (a hook in front of the bag's and stashes' doors, the gold door
  wrapped; a door called by hand is not counted) and fails a move or escrow
  road (51) neither played nor on UNPLAYED (7, a line that only falls).
  Plants 2 and 3 red by the sum itself ("slime_gel 1", "gold 3").
- 6461 (PR 2): chaos-restart §7, the sweep made from VALUE_PAUSE: its 14
  rows driven through their messages or routes, crashed before every write
  and after the last, judged by worldsum unexplained(); a row with no
  driver fails. Plant R2 (jackpot deposit's save removed) red: "gold 100".

## Next

- This session handed over at 258k tokens; a fresh one takes PR 3.
- 6462 (PR 3): the 1.5 bar, honestly (after card CK's first PR merges);
  branch it from main once #2278 and 6461 merge. Hint: the module hook and
  AsyncLocalStorage in world-sum's header show how to watch a door unedited.

## Found

- `escrow_debit_stored` (gold.js) looks unreachable from a handler: every
  route that takes it asks for a live session first (httpauth.js).
- `escrow_item`, `escrow_item_stored` run only with `ahonewrite: false`.
- Mints and burns are not held by PR 1's gate: a mint is explained by
  construction; a door booking other than it moves is card DG's.
- A pile dropped on the ground is lost on a restart, by design (handoff
  rule 11, itemdrop.js): §7 allows exactly that loss, nothing more.
- A crossing or a sale a restart cut is finished at the first shop request
  after the wake (`_mktEnsureIndex`, `_stEnsureIndex`); until then the
  buyer's gold reads as gone.

## Needs

- Nothing.
