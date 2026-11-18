card: RV
branch: claude/rv-market (PR 2, stacked on claude/rv-review)
prs: #2072 (5800, ready: sitting 42, after #2070 and #2071); PR 2 (5801, ready)
state: ready

## Done

- #2072 (5800): the review, `docs/plan/census/RV-review.md`: every road
  of GOLD_ROADS (47), BAG_ROADS (71), STASH_ROADS (36), PLAYER_ROADS (14)
  and ESCROW_PLACES (12), every account and social row of the wire table.
  Findings: 2 high (market.js), 6 medium, the rest low. No code.

## Next

- PR 2 (5801, ready): `market.js`, `inbox.js`: MS-2 (`mkttier`), MS-4
  (`mktheal`). `market-own-place.test`: 10 FAIL on main, green here.
- Then PR 3 (5802): `risechest.js`, `inbox.js`'s prune (MD-1, `risekeep`).

## Found

- For card K2 (`join.js`, `seathold.js`): ACC-1, ACC-2, SEC-F1, ACC-3, and
  S2's join half (the census, part 1).
- For `index.js` (K2, then card L): S2's `track` half, S3's board report.
- For card L (`wsClient.js`): SEC-F3, the 49th chest piece.
- `mktsettle: false` + a re-listed noted order: its cancel loses the
  taker's escrow even with no restart (market.js; read, not shown; switch
  off only).

## Needs

- #2072: merge main in once #2070 and #2071 land (every block kept,
  nextBlock 5820), as sitting 41 asked.
- PR 7's `index.js` half waits for card L's #2058, #2065, #2067 on main.
