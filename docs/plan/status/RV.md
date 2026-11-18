card: RV
branch: claude/rv-devicewords (6020, stacked on claude/rv-shieldclaim)
prs: #2072, #2083, #2091, #2094 (heads to sitting 43); PRs 5-18 built
state: ready

## Done

- #2072 (5800): the review, `docs/plan/census/RV-review.md`.
- #2083 (5801): market.js MS-2 (`mkttier`), MS-4 (`mktheal`).
- #2091 (5802), #2094 (5803). Decided while away: a character reset never
  frees the rise chest (the planner's ruling).

## Next (built, each red on main first; full runs one at a time)

- PR 5 (5804): No man's land, one write (`nmlonewrite`).
- PR 6 (5805): duel.js S1, S4, MS-6 (`duelpace`, `duelonewrite`).
- PR 6b (5806): mute holds on open; a muter away (`storemute`, `mutehides`).
- PR 7 (5807): `lookform.js`, the board, the page (S2; `?lookform=0`).
- PR 8 (5808): loginkeys.js SEC-F5 (`oldkeyheld`).
- PR 9 (5809): MS-5, MS-6 (`offerpend`, `leftoverheal`).
- PR 11 (5811): friends.js ACC-5, SEC-F4 (`friendfix`).
- 14 (5814) `cleanmore`, `namestaff`; 15 `rewindsays`; 16 pass words;
  13 jackpot; 18 the sum's buy leg; 17 `/mine`'s bids to the asker (`minebids`);
  12 (5812) SEC-F2, a join's shield claim only if minted (`shieldclaim`);
  6020 the players' device words (block 6020-6039 added after #2097).
  Then S3 and `track` (after card L's index.js).

## Found

- For card K2: ACC-1, ACC-2, SEC-F1, ACC-3, S2's join (PR 11), duelquiet.
- For `index.js` (K2, then card L): S2's `track` half, S3's board report.
- For card L (`wsClient.js`): SEC-F3. For the planner: the players' device
- `mktsettle: false` + a re-listed noted order loses the taker's escrow
  on its cancel (market.js; read, not shown).

## Needs

- MD-2 (5810): a second put a payout; the planner asks the owner. Held.
- #2072: merge main in again once T2's #2071 lands (every block kept).
