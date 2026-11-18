card: M
branch: claude/plan-m-2-steps (#2127, 5341); claude/plan-m-3-reads (#2131, 5342)
prs: #2089 (5340): merged; #2127 (5341), #2131 (5342): ready (sitting 45)
state: ready

## Done
- Chain A only (lines 1-3, BroTown.jsx, tags 5340-5342); chain B is M2
- PR 1 #2089 (5340): merged (main fcd1ae9)
- PR 2 #2127 (5341): ten single calls inside legacy named as steps
  (`to(a, b)`); legacy 1555 -> 1531; after-frame 2a `\d+` (planner; deploys)
- PR 3 #2131 (5342, on #2127): BroTown.jsx's 16 reads through the page's
  one reader; switch-reader check 3 33 -> 17 on main 7f0fb20f; frame-clock
  8b, frame-pacer 10c to pageAddress() (planner's (a); deploys, batched)

## Next
- The gatekeeper's merge of #2127 then #2131 (one batch, one deploy).
  Then chain A is done (card lines 1-3).

## Found
- mp-manualcombat 10a (a computer's click: one arrow on the press) red on
  main 3750ba4a too: the arrow comes on the release (TRAPS §177).
- mp-crowdfight "the phone knew (nearly) every bot" red on main 3750ba4a
  too (30 bots, 20 known).
- server/test/canvas-witness 8b now passes on BroTown.jsx's comment for
  `?owedrebuild=0` only (the read is `sw('owedrebuild')` since #2131).
- tools/dev/precheck.mjs: server-tests' 5-minute limit times out on this
  box, main too (guards/switches-thrown alone 5-8 min); `npm test` green.
- Held for the later card, not M's (owner's review, item 6): KNOWN_SECOND 5
  (the frame measured by two clocks) and 7 ("is the world in play" asked
  four ways); BUDGETS part 3's caches.

## Needs
- Nothing.
