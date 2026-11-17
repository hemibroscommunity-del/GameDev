# The gatekeeper's review, sitting 42 (card Z; tag 5820)

Taken 2026-11-17 on `main` bdfa8734 (sitting 41 merged: U2 #2070, L
#2058, #2065, #2067, K2 #2068, Z #2086; cards L and SEC done). K2, M, M2,
T2, U2, V2 and RV were told this sitting's session at its start (22:24
UTC). Gathered 22:24 to about 23:05 UTC (the owner's pace: about 45
minutes). Tags bare. Card Z's third block (5660 to 5679) is used up: this
PR takes Z's fourth, 5820 to 5839, from `nextBlock` (after RV's 5800 to
5819), and moves `nextBlock` to 5840.

Reviews in full (`server/` or `src/`): four readers, the angles of
`/repo-review` in one pass each, each finding put to its own disproof
against the code and the suites: RV #2083; K2 #2073 and #2081; T2 #2075,
#2087 and M2 #2084; M #2089. T2 #2071 was READY at sitting 41 (its merges
of `main` since, and its row's move, read here). Documents and tools (step
3): V2 #2076 to #2080, U2 #2074 and #2082, M2 #2085, RV #2072.

## How the shared lists meet

- `tools/dev/tag-blocks.json`: T2's, V2's and RV's rows each sit on a
  line of their own (after "T", "V" and "R"); only RV moves `nextBlock`
  (5800 -> 5820), and this PR (5820 -> 5840) is stacked on RV's #2072
  head for that line. Rehearsed: clean in the list's order.
- `server/src/testmode.js` and `docs/specs/test-mode.md`: RV's #2083
  moved its clause to a sentence of its own, off the `movefields` line
  K2's #2081 changes.
- `docs/plan/status/U2.md`: #2082 merges #2074's head. `status/M2.md`:
  #2084 merges #2085's head and T2's #2087 head (its
  `switch-reader.test.mjs`: one import, both `MOVED` blocks, the line at
  the merged count 34).
- The live flags: `mkttier`, `mktheal` (RV #2083), `ceilfair` (K2
  #2081), `framesteps` (M #2089): rows apart in `switches.mjs`; merged
  clean in this order.
