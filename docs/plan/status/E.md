card: E
branch: claude/plan-e-8-known-stake (one branch a PR, each begun from the one before: merge #1752, #1756, #1758, #1759 first)
prs: #1686, #1691, #1694, #1699, #1752 (merged); #1756, #1758, #1759 (ready); PR 8b on the branch above (ready)
state: ready

## Done

- PRs 1 to 4 (5080 to 5083: #1686, #1691, #1694, #1699), merged.
- PR 5 (5084, #1752), the world's sum: merged (sitting 8).
- PR 6 (5085, #1756), the book's `econ` part; sitting 8's mend: one
  last-out writer (card A's), the part rides, `econ: false`, one `ECON_V`.
- PR 7 (5086, #1758), the shared test room and `DISTURBANCES`;
  `chaos-restart` moved onto it, its output the same.
- PR 8a (5087, #1759), `trade-weapon-half` off `KNOWN` (v2.3.4795).
- PR 8b (5088), `arena-stake-place` off `KNOWN` (v2.3.4796); break proof:
  the old two writes fail case 5 again.

## Next

- PR 8c (5089), `arena-stake-settle-loss`, the one left to fix
  (`gladiator.js` `_arenaSettleStakes`: the settle in one run).

## Found

- `inbox.js` / `index.js`: goods mailed to a player in the five dying
  seconds land in the bag the respawn's wipe empties (read, not reproduced).
- `threat.js`: the fine's take and its `bounty:` put are two runs.
- `gladiator.js`: the prize is paid before its entries are deleted.
- `deathpilesave: false` keeps piles in memory only (rule 4's two configs).
- A new key inside `_econ` (card Q's sitting card) bumps `ECON.V`.

## Needs

- Nothing.
