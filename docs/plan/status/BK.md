card: BK
branch: claude/plan-bk-3-claimsbar (6462); claude/plan-bk-4-levers (6463); claude/plan-bk-6-roads (6465, stacked on 6463: both write this file; main b966af81 in)
prs: #2278 6460, #2281 6461, #2289 6464 (merged); #2299 6462, #2301 6463, 6465 (the PR of claude/plan-bk-6-roads): ready
state: ready

## Done

- 6460, 6461, 6464: merged (sittings 56, 57).
- 6462 (PR 3): claims-gain judges the worst of six seeds against 1.5 (a PR
  runs one seed's gains; `--whole` is the gatekeeper's). KNOWN (only falls):
  reach 1.92, freeswing 1.75, staff 2.97, harvest 1.57. Plant C1 red. Seed
  names fingerprinted by check 0 (a reworded bot fails; words go in `say`).
- 6463 (PR 4): LEVERS marks fee, hold, pace `wired: false`; road-levers
  guard (syntax tree) fails a read of one, or a wired mark unread.
- 6465 (item 5, sitting 57's review): chaos-restart §7 sweeps the AH WEAPON
  listing as a second way into the store/list row (`ALSO`); world-sum's
  `piecesHeld` and chaos-restart's `held()` compare id sets. Plants, green
  on the old suites, red now: store.js:815 `await this._saveRpg(...)` (axe
  lost); gear.js:819 the swap's put-back `Object.assign({}, activeItem,
  { gid: undefined })` (one id lost, one came). The review's line 814
  (`stashItem`) is red today already by its step's own check. Tests only:
  the merge deploys the worker, no behaviour changed.

## Next

- Nothing: the card's five PRs are written; sitting 58 merges them.

## Found

- The sword's reach over six seeds is 1.92 (seed d); call 5 says 1.55.
- The staff's judge (hitproof.js) lets a liar take 2.97x an honest caster.
- `escrow_debit_stored` (gold.js) looks unreachable from a handler.

## Needs

- Call 5 (the sword's reach) and a staff's-judge card: not this card's.
