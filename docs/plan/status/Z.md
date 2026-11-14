card: Z
branch: claude/plan-z-sitting-14
prs: (this PR), tag 5371, the last line of the list (ready)
state: ready

## Done
- Sitting 14, `main` 1cce0b2: the list rehearsed in its order (tree
  0f04b30b, this branch aside): precheck 0 FAIL, build, questline 187;
  each base `main`, ONE merge base step by step. Review:
  `census/review-z14.md`. Lines lowered: entityRenderer 8955, the phase
  table's `TODO_LINE` 30. Notes on 2.3, 4.1, 5.3b, 10.5.

## The list: merge in this order, in one sitting, each "Create a merge commit"
1 #1816 (T) · 2 #1817 (T) · 3 #1828 (TF) · 4 #1823 (R) · 5 #1826 (K) ·
6 #1825 (R) · 7 #1830 (J2) · 8 this PR. Three deploy (4, 5, 6): back
to back. #1825 adds the live flag `storesize` (ON) and a part to the
day's book (its shape number kept 1, a rollback loses one day's size):
the last deploy, on its own line.

## Held (expires at sitting 15)
- #1824 L: conflict at `phase-table.test.mjs`'s `DOOR_SUITES` end with
  O's `_rung` row; L merges the new `main` (keep both). Reviewed: clean
  (lows).
- #1829 K: conflict at `docs/SYSTEMS.md`'s `wire` with T's #1816; K
  merges the new `main`. Reviewed: clean (lows, for K before PR 7).
- #1831 K: conflict at `docs/SHAPES.md` with T's #1816; opened during
  the sitting, unreviewed.
- #1782 SK: the owner's yes to +8 to +10 moves a ride.

## Stalled
- None. P `working` (17:44, under 3 h): its fire goblin, no branch.

## Found
- K: `item_drop`, `report` rows want `body: 'top'`; the door's transport
  is not cleared at a teardown; four friend events have no row.
- L: duel-door's gladiator.js exception matches `mt.status = ` too.
- R: the `daybook:` registry row and daybook.js's shape lines stale.
- K: claims-gain is the slowest suite (48 s on CI); its margin passes a
  reach of 500 px.
