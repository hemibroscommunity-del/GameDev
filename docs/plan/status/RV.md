card: RV
branch: claude/rv-market (PR 2, stacked on claude/rv-review)
prs: #2072 (5800, ready); PR 2 (5801, working)
state: working

## Done

- #2072 (5800): the review, `docs/plan/census/RV-review.md`: every road
  of GOLD_ROADS (47), BAG_ROADS (71), STASH_ROADS (36), PLAYER_ROADS (14)
  and ESCROW_PLACES (12), every account and social row of the wire table.
  Findings: 2 high (market.js), 6 medium, the rest low. No code.

## Next

- PR 2 (5801): `market.js`, `inbox.js`: MS-2 (a sell filed under its
  weapon's own tier, `mkttier`), MS-4 (a refund and its order's delete in
  one write, `mktheal`). Suite `market-own-place.test`: 10 FAIL on main.

## Found

- For card K2 (`join.js`, `seathold.js`): ACC-1, ACC-2, SEC-F1, ACC-3, and
  S2's join half (the census, part 1).
- For `index.js` (K2, then card L): S2's `track` half, S3's board report.
- For card L (`wsClient.js`): SEC-F3, the 49th chest piece.
- `mktsettle: false` + a re-listed noted order: its cancel loses the
  taker's escrow even with no restart (market.js; read, not shown; switch
  off only).

## Needs

- The planning session: may PR 7 add one call each in `join.js`
  `_sanitizeJoinData` and `index.js` `case 'track'` (S2), or do those wait
  for K2 and L? And the current gatekeeper's id (sitting 40's is inactive).
- The owner's calls, listed in the census part 2 (none blocks a fix PR).
