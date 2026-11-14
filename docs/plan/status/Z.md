card: Z
branch: claude/plan-z-sitting-3
prs: this PR, tag 5034, the last line of the list (ready)
state: ready

## Done
- Sitting 3, `main` at 67a6f3d, 18 open PRs green. The 5 below on `main`:
  precheck 0 FAIL, build green, `questline` (running). `/repo-review`, 7 angles:
  N1, N2, B1, A1 to A4, E4. Ticked 8.0 (card W's four are merged).

## The list: merge in this order, in one sitting, each "Create a merge commit"
1 #1699 E4 BY ITSELF (schema 21: a rollback past it needs `newersave: false`);
wait for its "Deploy worker" run to go green · 2 #1688 A1 · 3 #1685 B1
(deploys) · 4 #1692 A2 (deploys) · 5 #1703 A3 (sends nothing until A4) · 6
this PR. Stacked: no squash. No cap or live flag on the list.

## Held (expires at sitting 4)
- #1706 A4, wrong numbers (verified; mend on its branch): a frame after a
  hidden page is a freeze (`BroTown.jsx:4914` prevT); off then on sends the
  off stretch (`setReportOn` keeps `_a`, `_lastFrameT`); `build` is the
  phone's (previews fill the day's ~10 cells); `secs` counts hidden time.
- #1684, #1695, #1697 N: conflict with `main` in `bag-door`, `gold-door`
  tests (#1691): `git merge-tree origin/main <N1>`. Merge main into each.
- #1687 to #1702 B2-B8: on `main`, `systems.test` (unsorted 13 > 11:
  `daybook.js`, `storagemarks.js`) and `shapes-once` (`daybook:` no row) red;
  with A3, `four-lines` (`wsClient.js` 3296 > 3290) and `shapes-once`
  (`report.js` devClass, drawLane) red. Merge main after this list, re-measure.
- #1700 H4: unchanged since sitting 2 (41ce16e): that hold stands. #1701 G:
  the owner's yes on the two pictures.

## Stalled
- None. #1705 Y is a DRAFT though its file says ready: mark it for sitting 4.
## Found
- E's PR 5: a live `_econ` wins at `_econAdopt`, and `join.js` ~1042
  `join_stored` runs first: a door booking it blanks the stored counts.
- A: `near` counts unparked far players; no send at pagehide; a report resets
  the AFK clock; `waver` takes the phone's `hd`; `madeLog` drops the pose.
- N: A4 lands, `report` needs its row. B: old-map lets 5 files go unread.
  No card: `mp-topaudit` red, the GAME's (`pixiRenderer.js:869`); census
  check. The owner's answers: N, B, A, Y (1 each), E (PR 5), G (pictures).
