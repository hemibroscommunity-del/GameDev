card: RV
branch: claude/rv-storemute (PR 6b, stacked on claude/rv-duel)
prs: #2072, #2083 (sitting 42); #2091, #2094 (ready); PRs 5, 6, 6b (5804-5806) in their runs
state: ready

## Done

- #2072 (5800): the review, `docs/plan/census/RV-review.md` (every road
  and every account and social row read; 2 high, 6 medium, the rest low).
- #2083 (5801): market.js MS-2 (`mkttier`), MS-4 (`mktheal`).
- #2091 (5802): the rise chest's stamp kept for good (MD-1, `risekeep`).
- #2094 (5803): goods credited in the dying seconds kept (MS-3,
  `dyingkeep`).

## Next

- PR 5 (5804): No man's land's killer paid in the victim's own write
  (MS-1, `nmlonewrite`). `nml-onewrite.test`: 1 FAIL on main.
- PR 6 (5805): duel.js: S1, S4, MS-6's pot (`duelpace`, `duelonewrite`).
  `duel-pace.test`: 6 FAIL on main. `duelquiet` is K2's (eventplace.js).
- PR 6b (5806): a muted line not shown on open; a muter away to you
  (`storemute`, `mutehides`). `store-mute.test`: 4 FAIL on main.
- Then PR 7 (5807, `lookform.js`, the board, the page; S2, S3).

## Found

- For card K2 (`join.js`, `seathold.js`): ACC-1, ACC-2, SEC-F1, ACC-3, and
  S2's join half (K2's PR 11).
- For `index.js` (K2, then card L): S2's `track` half, S3's board report.
- For card L (`wsClient.js`): SEC-F3, the 49th chest piece.
- `mktsettle: false` + a re-listed noted order: its cancel loses the
  taker's escrow even with no restart (market.js; read, not shown).

## Needs

- #2072: merge main in again once T2's #2071 lands (every block kept).
- PR 7's `index.js` half waits for card L's #2058, #2065, #2067 on main.
