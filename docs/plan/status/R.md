card: R
branch: claude/plan-r-1-roads (one branch a PR, each begun from main)
prs: PR 1 tag 5280 (working)
state: working

## Done

- (none merged yet)

## Next

- PR 1 (5280): the roads between players, one table (`playerroads.js`,
  `PLAYER_ROADS`, 14 rows, all zero); `XFER.ROADS`/`KILLS` made from it;
  `player-roads.test` strict, both break proofs red by hand.
- Then the free PRs while PR 2 waits: 4 (skill points' door, 5283).

## Found

- (none yet)

## Needs

- PR 2 (5281) waits for card K's 5181 and 5184 (`index.js`) and card L's
  trade door (#1809, `trade2.js`), merged. PRs 3, 5, 6 wait for PR 2.
- PR 7 (5286) waits for card K's 5182 (the wire table's columns).
- No new live flag or switch row in PR 1 (it changes no behaviour).
- Asked (planning session): may PR 1 change one line of SHAPES part 7
  (its 10.5 row, "three columns, not a table", to point at part 3's built
  table)? The card names parts 3 and 8 only.
