card: E
branch: claude/plan-e-8-known-settle (one branch a PR, each begun from the one before: merge #1758 to #1761 first)
prs: #1686, #1691, #1694, #1699, #1752, #1756 (merged); #1758, #1759, #1761 (ready); #1764 (ready, this branch)
state: ready

## Done

- PRs 1 to 4 (5080 to 5083: #1686, #1691, #1694, #1699), merged.
- PR 5 (5084, #1752), the world's sum: merged (sitting 8).
- PR 6 (5085, #1756), the book's `econ` part: merged (sitting 9).
- New live flags (rule 3, one line each in the switch table): PR 6 `econ`,
  PR 8c `arenasettleplan`, PR 11 `xfer`.
- PR 7 (5086, #1758), the shared test room and `DISTURBANCES`;
  `chaos-restart` moved onto it, its output the same.
- PR 8a (5087, #1759), `trade-weapon-half` off `KNOWN` (v2.3.4795).
- PR 8b (5088, #1761), `arena-stake-place` off `KNOWN` (v2.3.4796).
- PR 8c (5089), `arena-stake-settle-loss` fixed: ONE plan record a
  match, the prune waits while one is open, a kept plan pays nothing
  (sittings 9, 10). Two rows a match (put, delete): OFF until the owner
  says yes (`arenasettleplan: true`). `KNOWN` empty (case 6 runs it on).

## Next

- PR 9 (5090), a refused save counted and a value road failing closed:
  waits on card A's "saves refused" (`roomrow.js`); if not on main, PR 10.

## Found

- `inbox.js` / `index.js`: goods mailed to a player in the five dying
  seconds land in the bag the respawn's wipe empties (read, not reproduced).
- `threat.js`: the fine's take and its `bounty:` put are two runs.
- `gladiator.js`: the prize is paid before its entries are deleted.
- `deathpilesave: false` keeps piles in memory only (rule 4's two configs).
- A new key inside `_econ` (card Q's sitting card) bumps `ECON.V`.

## Needs

- Nothing.
