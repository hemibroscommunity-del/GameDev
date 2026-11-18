card: M
branch: claude/plan-m-3-reads (PR 3, tag 5342; stacked on PR 2, base main)
prs: #2089 (5340): merged; #2127 (5341): ready (sitting 44); PR 3 (5342): ready
state: ready

## Done
- Chain A only (lines 1-3, BroTown.jsx, tags 5340-5342); chain B is M2
- PR 1 #2089 (5340): merged (main fcd1ae9)

## Next
- PR 2 (5341), more named steps: ten single calls inside legacy marked
  `to(a, b)`; legacy 1555 -> 1531; after-frame 2a `\d+` (planner; deploys).
  Phone: framesteps 19/19, heldcombat 6/6, monstermoves 8/8; manualcombat
  43/44 as main; crowdfight hung (main's run next).
- PR 3 (5342), BroTown.jsx's 16 reads: 13 on sw/swHas (MOVED, chain A's
  block), 3 rules on pageAddress(); switch-reader check 3 34 -> 18;
  frame-clock 8b, frame-pacer 10c patterns to pageAddress() (planner's (a);
  deploys, batched with PR 2).

## Found
- mp-manualcombat 10a (a computer's click: one arrow on the press) red on
  main 3750ba4a too: the arrow comes on the release (TRAPS §177: the test's
  or main's, not card M's).
- tools/dev/precheck.mjs: server-tests' 5-minute limit times out on this
  box, main too (guards/switches-thrown alone 4m58s on main 17f749b);
  `cd server && npm test` is green in full (501 suites, 378 s).
- Held for the later card, not M's (owner's review, item 6): KNOWN_SECOND 5
  (the frame measured by two clocks) and 7 ("is the world in play" asked
  four ways); BUDGETS part 3's caches.

## Needs
- Sitting 44 reviews #2127 and PR 3 (one batch: both deploy).

