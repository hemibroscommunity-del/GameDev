card: RV
branch: claude/rv-devicewords (6020, stacked on claude/rv-shieldclaim)
prs: #2109-#2123 open (ready, sitting 44); #2072, #2083, #2091, #2094 merged
state: ready

## Done

- Merged: #2072 (5800) the review; #2083 (5801) MS-2, MS-4;
  #2091 (5802), #2094 (5803). Decided while away: a character reset never
  frees the rise chest (the planner's ruling).

## Open (#2109-#2123, each red on main first; one full run on the top)

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
  6020 the players' device words (RV's block 6020+, registered by sitting 44).
- Next: PR 10 `paidmark` (the owner's yes); 6021 market.js's list limit;
  S3 and `track` (index.js); the dead-player takes (`deadtake`).

## Found

- For card K2: ACC-1, ACC-2, SEC-F1, ACC-3, S2's join (PR 11), duelquiet.
- For `index.js` (card L done: RV next, telling K2 the lines): S2's `track`
  half, S3's board report.
- For card L (`wsClient.js`): SEC-F3.
- `mktsettle: false` + a re-listed noted order loses the taker's escrow
  on its cancel (market.js; read, not shown).

## Needs

- MD-2 (5810): a second put a payout; the planner asks the owner. Held.
- #2072: merge main in again once T2's #2071 lands (every block kept).
