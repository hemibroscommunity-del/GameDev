card: E
branch: claude/plan-e-10-storm (one branch a PR, each begun from the one before: merge #1756 to #1764 first)
prs: #1686, #1691, #1694, #1699, #1752 (merged); #1756, #1758, #1759, #1761, #1764 (ready); PR 10 on the branch above (ready)
state: ready

## Done

- PRs 1 to 4 (5080 to 5083: #1686, #1691, #1694, #1699), merged.
- PR 5 (5084, #1752), the world's sum: merged (sitting 8).
- PR 6 (5085, #1756), the book's `econ` part; sitting 8's mend: one
  last-out writer (card A's), the part rides, `econ: false`, one `ECON_V`.
- PR 7 (5086, #1758), the shared test room and `DISTURBANCES`;
  `chaos-restart` moved onto it, its output the same.
- PRs 8a, 8b (5087, 5088: #1759, #1761), two cases off `KNOWN`.
- PR 8c (5089, #1764), `arena-stake-settle-loss` fixed by a settlement
  plan written in one run (`arenasettleplan: false` the old order).
- PR 10 (5091), the storm: the sum (now `worldsum.mjs`) under every
  disturbance, a deploy before each of 33 messages: unexplained 0, nobody
  flagged, no reload, no dead worker. Done before PR 9 (its Needs below).

## Next

- PR 9 (5090), a value road failing closed: card A's counter is on main
  (`_savesRefused`); its design waits on the owner (Needs).
- PR 11 (5092), the transfer ledger `xfer:`.

## Found

- `inbox.js` / `index.js`: goods mailed to a player in the five dying
  seconds land in the bag the respawn's wipe empties (read, not reproduced).
- `threat.js`: the fine's take and its `bounty:` put are two runs.
- `gladiator.js`: the prize is paid before its entries are deleted.
- A new key inside `_econ` (card Q's sitting card) bumps `ECON_V` (gold.js).

## Needs

- The owner (asked 2026-11-14, through the planning session): PR 9's
  which actions refuse, how long, what the phone says.
