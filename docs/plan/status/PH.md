card: PH
branch: claude/plan-ph-5-heaptrend (stacked on claude/plan-ph-3-membudget)
prs: #2279 (PR 1, 6500, DEPLOYS: sitting 57's hold mended), #2291 (PR 2, 6501: hold mended), #2297 (PR 3, 6502: takes #2291's mend), #2306 (PR 5, 6504: this branch)
state: working (part 4: the chain mended, one push per PR; then PR 6)

## Done
- PR 1 (6500) #2279: the report sees heat, the board and the ramps.
  Sitting 57: 15.8c's fraction now positive (it sat on an empty bin, a
  -0.5); 15.8e/f the up row's late and below the kept verdict's, never
  the claim. Plants tried 2026-11-24 on the test box: rideGaps
  sign-only, `msg.late[0]`, `msg.rung[1]`, below `0` -> FAIL 15.8c/e/f/f.
- PR 2 (6501) #2291: the memory alarm on the game's own total, 120 MB
  (DECIDED FOR THE OWNER WHILE AWAY, not the owner's yes; `?memalarm=0`).
  Sitting 57: memFull exported with an address; 23i's filling phone rides
  memFull itself, thrown and not. Plants tried 2026-11-24: `memOver(m)`,
  `memOver(m, true)`, the address dropped, the read's cadence -> FAIL 23i.
- PR 3 (6502) #2297, on 6501: lines at the highest read + max(scatter,
  1.0): artCache 12.2, gpu 94.0, canvases 14.7, workers 24.3, sound 19.9
  (CI's 18.9 + 1.0); heap 40.0, buffers 24.8 kept; TOTAL 216.0.
- PR 5 (6504) #2306, on 6502: gatekeeper.mjs --heap (main's heap, the
  middle of three, a row of baseline.md; a rise over 1.0 MB since the last
  trim named with the PRs between); heap-trend.test holds the line at 40.0.
  tools/dev/heap-trend.mjs and its suite approved outside the card.
  First row, main b2cdd55a, test box: 39.6, +1.1 over the start: named.
- Main b966af81 merged once, at the chain's bottom (PR 1's branch).

## Next
- PR 6 (6505). Then PR 4 (6503): call 1 is answered (the orchestrator's
  messages, 2026-11-24 02:39-02:46 UTC: the Speed test's table, govern and
  groundsend both stay on, "all those off" felt best); its words go in
  census/PH-phone.md with PR 4. A default look changed is the owner's call.

## Found
- src/rendering/maskedEvict.js's header: the memory rung's old words.
- buffers: 24.2-24.3 on CI against 24.8 kept: the trim owed.
- main b2cdd55a on the test box: heap 39.5 / 40.2 / 39.6, one over 40.0.

## Needs
- The owner's word on the alarm's level (call 3): decided while away, 120.
