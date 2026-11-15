card: OPS
branch: claude/plan-ops-3-setswitch (one branch a PR: claude/plan-ops-<n>-<word>)
prs: #1867 (findings, draft), #1871 (5587), #1872 (5588), #1874 (5600), #1880 (5601), #1886 (5604); PR 3 (5602): all ready
state: ready

## Done

- RT-2's findings (#1867, kept as the record); its two small fixes: #1871
  (the migrations guard) and #1872 (OPERATIONS: rolling back).
- #1874 (5600) the card; #1880 (5601) `/health/room`; #1886 (5604)
  `rf_spread` (each carries the one before).
- PR 3 (5602): the Test panel sets a switch (`SetSwitchRow.jsx`,
  `ownerSwitches.js`); page only; `mp-setswitch` 8/8. Carries #1874's head.

## Next

- PR 4 (5603): the Test panel's feedback rows (RT-3's #1878 routes).

## Found

- The Test panel shows and clears live switches but cannot set one: a
  "set a switch" row would spare the owner a curl (card R's panel work).

## Needs

- PR 6 (`seathold`): built OFF; on, at most one small write a minute while
  the roster changes (~1,440 a day at most): the owner's word to turn it on.
- PR 7 starts after card R's PR 7 (`admin.js`, `liveops.js`) is merged.
