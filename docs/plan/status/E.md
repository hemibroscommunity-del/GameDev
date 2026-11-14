card: E
branch: claude/plan-e-8-known-settle (one branch a PR, each begun from the one before: merge #1756 to #1761 first)
prs: #1686, #1691, #1694, #1699, #1752 (merged); #1756, #1758, #1759, #1761 (ready); #1764 (ready, this branch)
state: ready

## Done

- PRs 1 to 4 (5080 to 5083: #1686, #1691, #1694, #1699), merged.
- PR 5 (5084, #1752), the world's sum: merged (sitting 8).
- PR 6 (5085, #1756), the book's `econ` part; sitting 8's mend: one
  last-out writer (card A's), the part rides, `econ: false`, one `ECON_V`.
- PR 7 (5086, #1758), the shared test room and `DISTURBANCES`;
  `chaos-restart` moved onto it, its output the same.
- PR 8a (5087, #1759), `trade-weapon-half` off `KNOWN` (v2.3.4795).
- PR 8b (5088, #1761), `arena-stake-place` off `KNOWN` (v2.3.4796).
- PR 8c (5089), `arena-stake-settle-loss` fixed: the settlement is a plan
  on every stake record in one run, each leg paid once, the sweep finishes
  it (`arenasettleplan: false` the old order). `KNOWN` empty, held empty.

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
