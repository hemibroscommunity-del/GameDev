card: RR
branch: claude/plan-rr-4-recoverpay (one PR a branch, claude/plan-rr-*)
prs: #2251 (6300), #2256 (6301): sitting 52; #2258 (6302): sitting 53; (6303) recoverpay: opening (on #2258)
state: ready

## Done
- #2251 (6300) the census (`docs/plan/census/RR-reds.md`): a SAMPLE of 48
  on main 736f954c + the planner's 3 + 3 node scripts; 1236 of 1272 in the
  batches. Red alone: mayordoor, recoverpay, firststeps (the tests'),
  deskkeys, headframes, quietphone, desklunge, brocard, geartab, cuelevels.
- #2256 (6301) mayordoor, the TEST's: `H.keepAlive` (the phone idled out in
  part 1); part 3's spot quiet when the clicks come; a copy read standing
  still; the monster clicked where drawn (up to 3 tries). 5 of 5 green.
- #2258 (6302) firststeps 6, the TEST's: the CLOSE arrow (guideArrow.js, since
  v2.3.4343) is one of the first quest's; 5 of 5 green (46/46).
- skateboard (SB's red): 30/30 three times alone on main 1cd3fced: not
  reproduced; asked SB for its command.

- (6303) recoverpay, the TEST's: step B's reload keeps `lane=`
  (H.withLane); 5 of 5 green (28/28).

## Next
- waterfrog (part 6 hangs) and hairstencil (3 parts) from HB2: run alone;
  then deskkeys, quietphone, headframes, desklunge, cuelevels traced.

## Found
- precheck's server-tests cap is already 20 min (TL's #2175), not 5; the
  gatekeeper's 15-min cap on the whole precheck is under it (PR 3).
- This session is at lineage depth 8 of 8: it cannot start helpers.
- SB: wsClient `_flushOutbox` 23.6 ms on a ride (budget-android): with PR 6.
- guideArrow's CLOSE lesson came up once BEFORE the weapon arrow on a phone
  (mp-firststeps: mayor -> close -> weapon -> close); its rule wants it only
  once no weapon is left to wear. A game question (src/ui/guideArrow.js).

## Needs
