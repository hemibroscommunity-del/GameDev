card: Z
branch: claude/plan-z-sitting-4
prs: this PR, tag 5360, the last line of the list (ready)
state: ready

## Done
- Sitting 4, `main` at 5eb94ec, 20 open PRs not drafts, each `test` green.
  Rehearsed: all 15 of B, P, N, H, G together, precheck RED (B's guards beside
  N, H, G; build green, questline 187 of 187); the 9 below alone: precheck 0
  FAIL, build green, questline 187 of 187 (tree d02b3ca). `/repo-review` on N,
  H, G, A with skeptics: `docs/plan/census/review-z4.md`. Ticked nothing.

## The list: merge in this order, in one sitting, each "Create a merge commit"
1 #1687 B2 · 2 #1689 B3 · 3 #1690 B4 · 4 #1693 B5 · 5 #1696 B6 · 6 #1698 B7 ·
7 #1702 B8 · 8 #1707 P's card · 9 #1713 P1 · 10 this PR. Stacked: no squash.
None touches `server/**`: no deploy. No cap, live flag or record's shape.
B, not N, H, G: B's guards are green on `main` and each guard's message names
the mend; held, they meet the same red at every sitting, on `main` each PR's
own `test` shows it. Merged, B unblocks U, T, V and P's PR 4.

## Held (expires at sitting 5): merge `main` after the list, then mend
- N #1684, #1695, #1697: `systems` (`server/src/wire/` has no system),
  `shapes-once` (`wayIn`, `mayStart`, `doesWhat` have no Where),
  `tests-by-system` (`wire-table.test` names `wsClient.js`: `lib/filesOf.mjs`).
- H #1700, #1709, #1712: `four-lines` (`entityRenderer.js` 9006 > 8968, H4;
  `gameDisplay.js` 4285 > 4270, H6: a line only falls). Verified: H5's plan
  taken by colour count (scrambled monster colours); H4's reads in series.
- G #1701: `four-lines` (`BroTown.jsx` 8372 > 8371; `BroTown()` 7802 > 7801).
- A #1706, #1708, #1711: `systems` (`report.js`, `roomrow.js`: 13 > 11).
  A_FINDINGS
- Y #1705: still a DRAFT (its file says ready): not ready.

## Stalled
- None.
## Found
- FOUND_LINES
