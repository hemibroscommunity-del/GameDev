card: E
branch: claude/plan-e-8-known-stake (one branch a PR, each begun from the one before: merge #1752, #1756, #1758, #1759 first)
prs: #1686, #1691, #1694, #1699 (merged); #1752, #1756, #1758, #1759 (ready); PR 8b on the branch above (ready)
state: ready

## Done

- PRs 1 to 4 (5080 to 5083: #1686, #1691, #1694, #1699), merged.
- PR 5 (5084), the world's sum: the two doors count into `_econ`; the
  join brings it back (`join.js`); `nml_lost` (`nomansland.js`); the
  prize's `house` (`gladiator.js`); the payout handed to the door
  (`inbox.js`): the owner's own "Go recommended" (2026-11-14), read in
  the planning session's transcript. Unexplained 0; planted pays seen.
- PR 6 (5085, #1756), the book's `econ` part; the last one out writes
  the book (`leave.js`); the gatekeeper's finds; `bookPut` waits its turn.
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
