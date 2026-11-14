card: Z
branch: claude/plan-z-sitting-15
prs: (this PR), tag 5372, the last line of the list (ready)
state: ready

## Done
- Sitting 15, `main` d6b8acd: the list rehearsed in its order (tree
  db4ea362, this branch aside): precheck 0 FAIL, build, questline 187;
  each base `main`, ONE merge base step by step. Review:
  `census/review-z15.md`. Notes on 4.2, 4.3, 4.7, 7.1; no line to lower.

## The list: merge in this order, in one sitting, each "Create a merge commit"
1 #1824 (L) · 2 #1835 (L) · 3 #1829 (K) · 4 #1831 (K) · 5 #1833 (J2) ·
6 #1832 (O) · 7 this PR. Five deploy (1 to 4, and 6 by its old-map
test): back to back. #1824 and #1835 each add a live flag (`dueldoor`,
`partydoor`, ON); #1835 carries #1824.

## Held (expires at sitting 16)
- #1836 O: conflict with `main` at `tools/guards/lib/switches.mjs`; next
  sitting after T's #1837 (it merges #1837's head). Reviewed: one medium
  (crowd rungs that hide no one delay the rate's ~5 s), for the planning
  session.
- #1837 T: conflict with `main` (`docs/SWITCHES.md`, `switches.mjs`);
  next sitting FIRST, after merging the new `main`. Step 3 then.
- #1838 K: conflicts with #1829 and #1831 either way; K merges the new
  `main` after this list. Reviewed in full here.
- #1782 SK: the owner's yes to +8 to +10 moves a ride.

## Stalled
- P `working`, its branch quiet since 17:44 (over 3 h at the list).

## Found
- L: the party door's births matched by text (an unconditional new map
  in party.js passes); `?.delete` and an alias pass too.
- K: wire/README.md ~307 names `fightlockgear` (no such switch).
- O: crowd-cap §4 never calls the renderer's bare `crowdK()`; the old
  `?crowd` row says monsters (it caps players).
