card: Z
branch: claude/plan-z-sitting-9
prs: this PR, tag 5365, the last line of the list (ready)
state: ready

## Done
- Sitting 9, `main` at 0a5149b (sitting 8's nine merged). The four below
  and this branch rehearsed in this order (tree 72434929): precheck
  0 FAIL, build, questline 187/187.
  Review: `census/review-z9.md`. Ticked 1.0, 4.4; notes on 5.3b, 7.1.

## The list: merge in this order, in one sitting, each "Create a merge commit"
1 #1769 O's card · 2 #1771 LB-1 · 3 #1762 H-11 · 4 #1756 E6 · 5 this PR.
Two deploy (#1762, a test's line; #1756): back to back. #1756 adds the
live flag `econ` (rowed) and a mail entry's optional `minted` (ignored by
a rolled-back worker; no shape refused). No cap.

## Held (expires at sitting 10)
- #1749 P8, #1767 L3, #1768 T2: each adds switch rows, and the page's
  count line (`docs/SWITCHES.md` "N rows") makes any two conflict: one a
  sitting; #1756 goes now. Each merges `main` after it. #1749, #1767
  read clean. #1768 also conflicts with #1749 in `switches.mjs`.
- #1763, #1766 P: the trap box's twin is packed, and a missed trap's
  break reads it on the CPU (`wheelShatter.js` `cutPicture`): no pieces.
- #1758, #1759, #1761 E: no CI (they merged the old `main`): merge `main`.
- #1764 E8c: `arenasettleplan` has no row; each settle writes every stake
  record again (5 puts -> 7, 32 -> 52), undeclared, no cost-guard line.
- #1770 TF: `tag-blocks.json` conflicts with #1771 (keep both; next 5520).
- Not reviewed (opened during the sitting): #1772, #1773 (on #1764), #1777.

## Stalled
- None.

## Found
- T: the switch page's count line serialises every row-adding PR.
- All: a branch that merged an OLD `main` (two merge bases) gets no CI
  on GitHub ("has conflicts"); merging today's `main` mends it.
- L: the zone door held by a regex (`zone-leftovers` §6a); shapes the
  phase guard still misses (review-z9). E: `roomrow: false` silences the
  book's `econ` part. P: `families.mjs` marks the snowball `draw: 'none'`.
