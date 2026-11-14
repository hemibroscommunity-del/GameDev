card: E
branch: claude/plan-e-7-testroom (one branch a PR, each begun from the one before: merge #1756 first)
prs: #1686, #1691, #1694, #1699, #1752 (merged); #1756 (ready); #1758 (ready, this branch)
state: ready

## Done

- PR 1 (5080, #1686), the day's book's frame.
- PR 2 (5081, #1691), the roads' classes; SHAPES part 3's edges ruled.
- PR 3 (5082, #1694), the registry's marks (`storagemarks.js`).
- PR 4 (5083, #1699), `_econ`, schema 21; the gatekeeper's hold mended.
- PR 5 (5084, #1752), the world's sum: merged (sitting 8).
- PR 6 (5085, #1756), the book's `econ` part; sitting 8's mend: one
  last-out writer (card A's), the part rides, `econ: false`, one `ECON_V`.
- PR 7 (5086), the shared test room (`server/test/testroom.mjs`, its suite)
  and `DISTURBANCES`; `chaos-restart` moved onto it, its output the same.

## Next

- PR 8 (5087 to 5089), `KNOWN` empty: two of its three cases already pass
  on main (`trade-weapon-half`, `arena-stake-place`: chaos-restart says so);
  `arena-stake-settle-loss` is the one left to fix.

## Found

- `inbox.js` / `index.js`: goods mailed to a player in the five dying
  seconds land in the bag the respawn's wipe empties (read, not reproduced).
- `threat.js`: the fine's take and its `bounty:` put are two runs.
- `gladiator.js`: the prize is paid before its entries are deleted.
- `deathpilesave: false` keeps piles in memory only (rule 4's two configs).
- A new key inside `_econ` (card Q's sitting card) bumps `ECON.V`.

## Needs

- Nothing.
