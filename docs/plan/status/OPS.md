card: OPS
branch: claude/plan-ops-1-card (one branch a PR: claude/plan-ops-<n>-<word>)
prs: #1867 (findings, draft), #1871 (5587), #1872 (5588); PR 1 (5600, working)
state: working

## Done

- RT-2's findings (#1867, kept as the record); its two small fixes: #1871
  (the migrations guard) and #1872 (OPERATIONS: rolling back).

## Next

- PR 1 (5600): this card. Then PR 2 (5601): `/health/room`.

## Found

- The Test panel shows and clears live switches but cannot set one: a
  "set a switch" row would spare the owner a curl (card R's panel work).

## Needs

- PR 4 (`seathold`): built OFF; on, at most one small write a minute while
  the roster changes (~1,440 a day at most): the owner's word to turn it on.
- PR 5 starts after card R's PR 7 (`admin.js`, `liveops.js`) is merged.
