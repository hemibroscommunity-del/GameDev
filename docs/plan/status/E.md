card: E
branch: claude/plan-e-9-pause (one branch a PR, each begun from the one before: merge #1758 to #1773 first)
prs: #1686, #1691, #1694, #1699, #1752, #1756 (merged); #1758, #1759, #1761, #1764, #1772, #1773, #1785 (ready); #1786 (ready, this branch)
state: ready

## Done

- PRs 1 to 6 (5080 to 5085: #1686, #1691, #1694, #1699, #1752, #1756), merged.
- New live flags (rule 3, one line each in the switch table): PR 6 `econ`,
  PR 8c `arenasettleplan`, PR 11 `xfer`, PR 9 `valuepause`.
- PR 7 (5086, #1758), the shared test room and `DISTURBANCES`;
  `chaos-restart` moved onto it, its output the same.
- PRs 8a, 8b (5087, 5088: #1759, #1761), two cases off `KNOWN`.
- PR 8c (5089, #1764), `arena-stake-settle-loss` fixed by a settlement
  plan, ONE record written in one run (sitting 9: one put more a match;
  `arenasettleplan: false` the old order).
- PR 10 (5091, #1772), the storm: the sum under every disturbance, a deploy
  before each message: all 0. Done before PR 9.
- PR 11 (5092, #1773), `xfer:`: a row a trade, in its own run (`trade2.js`,
  `trade.js`: the planning session's yes); none a kill; 90 days.
- PR 12 (5093, #1785), the owner's card in the Test panel.
- PR 9 (5090, #1786), on PR 11: for a minute after the storage refuses a save
  (card A's count), the 13 actions that hand value on refuse with the
  owner's words; payouts keep paying (the owner's "Go recommended").

## Next

- Follow-up (5094): `roomrow: false` must not silence the `econ` part;
  merged mail's `minted` across a rollback; which switch turns off what.

## Found

- `inbox.js`: goods mailed in the five dying seconds meet the respawn wipe.
- `threat.js`: the fine's take and its `bounty:` put are two runs.
- `gladiator.js`: the prize is paid before its entries are deleted.
- A new key inside `_econ` (card Q's sitting card) bumps `ECON_V` (gold.js).

## Needs

- Nothing.
