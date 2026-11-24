card: PH
branch: claude/plan-ph-5-heaptrend (stacked on claude/plan-ph-3-membudget)
prs: #2279 (HELD, PR 1, 6500, DEPLOYS), #2291 (HELD, PR 2, 6501), #2297 (PR 3, 6502, waits with #2291), PR 5 (6504: this branch)
state: working

## Done
- PR 1 (6500) #2279: the report sees heat, the board and the ramps.
- PR 2 (6501) #2291: the memory alarm on the game's own total, 120 MB.
  PR 1's branch merged into it for sitting 57.
- PR 3 (6502) #2297, on 6501: lines at the highest read + max(scatter,
  1.0): artCache 12.2, gpu 94.0, canvases 14.7, workers 24.3, sound 19.9
  (CI's 18.9 + 1.0); heap 40.0, buffers 24.8 kept; TOTAL 216.0. Green.
- PR 5 (6504), on 6502: gatekeeper.mjs --heap (main's heap, the middle of
  three, a row of baseline.md; a rise over 1.0 MB since the last trim
  named with the PRs between); heap-trend.test holds the line at 40.0.
  tools/dev/heap-trend.mjs and its suite approved outside the card.
  First row, main b2cdd55a, test box: 39.6, +1.1 over the start: named.

## Next (part 3 handed over at 215k; sitting 57's holds, part 4 mends)
- #2279: the `up` row's late and below columns are taken raw
  (server/src/report.js:478); a rideGaps fraction stays green
  (report.test:709). docs/plan/census/review-z57.md on #2304.
- #2291: `memFull` calling `memOver(m)` without the switch stays green:
  `?memalarm=0` dead in play, no node check runs memFull (framePacer.js
  388-399); its header calls 120 MB "the owner's yes": it was decided
  while away. #2297 then takes #2291's mend in its next push.
- Then PR 6 (6505). PR 4 (6503) waits for call 1.

## Found
- src/rendering/maskedEvict.js's header: the memory rung's old words.
- buffers: 24.2-24.3 on CI against 24.8 kept: the trim owed.
- main b2cdd55a on the test box: heap 39.5 / 40.2 / 39.6, one over 40.0.

## Needs
- The owner's five minutes (call 1): PR 4's order of rungs.
