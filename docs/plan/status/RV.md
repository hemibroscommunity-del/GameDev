card: RV
branch: claude/rv-review
prs: #2072 (5800, ready)
state: ready

## Done

- #2072 (5800): the review, `docs/plan/census/RV-review.md`: every road
  of GOLD_ROADS (47), BAG_ROADS (71), STASH_ROADS (36), PLAYER_ROADS (14)
  and ESCROW_PLACES (12), every account and social row of the wire table.
  Findings: 2 high (market.js), 6 medium, the rest low. No code.

## Next

- PR 2 (5801): `market.js`, MS-2 and MS-4 (`mkttier`, `mktheal`), started.

## Found

- For card K2 (`join.js`, `seathold.js`): ACC-1, ACC-2, SEC-F1, ACC-3, and
  S2's join half (the census, part 1).
- For `index.js` (K2, then card L): S2's `track` half, S3's board report.
- For card L (`wsClient.js`): SEC-F3, the 49th chest piece.

## Needs

- The planning session: may PR 7 add one call each in `join.js`
  `_sanitizeJoinData` and `index.js` `case 'track'` (S2), or do those wait
  for K2 and L?
- The owner's calls, listed in the census part 2 (none blocks a fix PR).
