card: BK
branch: claude/plan-bk-5-pieces (on claude/plan-bk-1-worldsum)
prs: #2278 6460 (ready), #2281 6461 (ready again), 6464 (ready, opening)
state: ready

## Done

- 6460 (PR 1): world-sum fails a move or escrow road (51) its real
  handlers never ran and not on UNPLAYED (7, only falls). Plants 2, 3 red.
- 6461 (PR 2): chaos-restart §7, the sweep made from VALUE_PAUSE (14 rows),
  crashed before every write and after the last, judged by unexplained().
  Sitting 56's hold mended: the axes seeded with ids on file, the judge
  counting the pieces the sum's readers hold by id. Plants B1, B4, R2 red.
- 6464 (sitting 56's Found on #2278, the orchestrator's word): world-sum §1
  counts the pieces the sum holds by id at every step; a step names the
  pieces it made, any other change fails. Plant E1 (gear.js's swap spliced
  after its stashSet: a weapon lost) was green, is red ("weapons swapped").

## Next

- 6462 (PR 3): the 1.5 bar, honestly, once card CK's #2284 merges; from
  main once #2278 and #2281 merge. claims-gain.test's 162 s (card CK's
  Found) is brought down there, no check weakened, or said why not.

## Found

- `escrow_debit_stored` (gold.js) looks unreachable from a handler.
- `escrow_item`, `escrow_item_stored` run only with `ahonewrite: false`.
- A mint is explained by construction; a door booking other than it moves
  is card DG's.
- A pile dropped on the ground is lost on a restart, by design (rule 11).
- A crossing or sale a restart cut is finished at the first shop request
  after the wake; until then the buyer's gold reads as gone.

## Needs

- Nothing.
