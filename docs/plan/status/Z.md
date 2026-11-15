card: Z
branch: claude/plan-z-sitting-18
prs: (this PR), tag 5375, the last line of the list (ready)
state: ready

## Done
- Sitting 18, `main` abff2ef: the list rehearsed in its order (tree
  f9d37ca3, this branch aside): precheck 0 FAIL (8 WARN, named), build,
  questline 187 of 187 (499 s); each base `main`, ONE merge base step by step. Review:
  `census/review-z18.md`. Notes on 2.3, 3.1, 4.3, 5.3b, 5.8, 8.1, 9.5;
  `TODO_LINE` 27 -> 24; monsterCombat.js 1792 -> 1785 and its
  `updateMonsterCombat` 1732 -> 1724.

## The list: merge in this order, in one sitting, each "Create a merge commit"
1 #1863 (T) · 2 #1847 (R) · 3 #1864 (L) · 4 #1866 (L) · 5 #1848 (K) ·
6 #1853 (P) · 7 #1868 (P) · 8 #1871 (RT, a draft: ready first) · 9 this
PR. Five deploy (1 to 5): back to back. New live flags `roomexport`,
`posedoor`, `racedoor` (ON), `sprintmark` (OFF); new page switches
`?elemicons`, `?beltstandin` (each carrying #1863). No stored record
changes its shape.

## Held (expires at sitting 19)
- #1872 RT: its moved head 051dbbd writes tag 5602 in full (with its
  version prefix), #1891's own tag: land it after #1891 (sitting 19), or
  write the tag bare.

## Stalled
- None.

## Found
- L: spar.js ~374 writes `.po` on a spar clone (`po` not in
  `SPAR_NOT_COPIED`): a clone fights sitting.
- J2: `dailychest.test` red once in a full run crossing UTC midnight.
- OPS's branch writes tag-blocks.json on #1868's lines: drop its edit.
- Not listed, the planning session's word: R's #1873 (a stored shape,
  after OPS's Test panel row and #1872); R's #1877, L's #1876, RT's
  #1878 for sitting 19.
