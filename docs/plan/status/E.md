card: E
branch: claude/plan-e-11-xfer (one branch a PR, each begun from the one before: merge #1758 to #1772 first)
prs: #1686, #1691, #1694, #1699, #1752, #1756 (merged); #1758, #1759, #1761, #1764, #1772 (ready); #1773 (ready, this branch); #1785, #1786 on it
state: ready

## Done

- PRs 1 to 6 (5080 to 5085: #1686, #1691, #1694, #1699, #1752, #1756), merged.
- New live flags (rule 3, one line each in the switch table): PR 6 `econ`,
  PR 8c `arenasettleplan`, PR 11 `xfer`.
- PR 7 (5086, #1758), the shared test room and `DISTURBANCES`.
- PRs 8a, 8b (5087, 5088: #1759, #1761), two cases off `KNOWN`.
- PR 8c (5089, #1764), `arena-stake-settle-loss` fixed: ONE plan record a
  match, the prune waits while one is open, a kept plan pays nothing
  (sittings 9, 10). Two rows a match: OFF until the owner says yes.
- PR 10 (5091, #1772), the storm: the sum under every disturbance, a
  deploy before each message: all 0.
- PR 11 (5092, #1773), `xfer:`: a row a trade, in its own run (`trade2.js`,
  `trade.js`: the planning session's yes); none a kill, none an empty
  window; 90 days (then its delete: two rows a settlement).

## Next

- PR 12 (5093, #1785) and PR 9 (5090, #1786) are on this branch.

## Found

- `inbox.js`: goods mailed in the five dying seconds meet the respawn wipe.
- `threat.js`: the fine's take and its `bounty:` put are two runs.
- `gladiator.js`: the prize is paid before its entries are deleted.
- A new key inside `_econ` (card Q's sitting card) bumps `ECON_V` (gold.js).

## Needs

- The owner's yes to the arena plan's two rows a match (#1764).
