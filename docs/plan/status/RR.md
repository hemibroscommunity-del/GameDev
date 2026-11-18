card: RR
branch: claude/plan-rr-1-census (one PR a branch, claude/plan-rr-*)
prs: #2251 (6300, the census): ready; (6301) mayordoor: running its 5
state: ready

## Done
- (nothing merged yet)

## Next
- 6300 the census (`docs/plan/census/RR-reds.md`): a SAMPLE of 48 on main
  736f954c + the planner's 3 + 3 node scripts; 1236 of 1272 in the batches.
  Red alone: mayordoor, recoverpay, firststeps (the tests'), deskkeys,
  headframes, quietphone, desklunge, brocard, geartab, cuelevels (to trace).
- 6301 mayordoor: `H.keepAlive`; five runs.

## Found
- precheck's server-tests cap is already 20 min (TL's #2175), not 5; the
  gatekeeper's 15-min cap on the whole precheck is under it (PR 3).
- This session is at lineage depth 8 of 8: it cannot start helpers.
- SB: wsClient `_flushOutbox` 23.6 ms on a ride (budget-android): with PR 6.

## Needs
