card: M
branch: claude/plan-m-2-steps (PR 2, tag 5341; stacked on #2089, base main)
prs: #2089 (5340): ready, in sitting 42's rehearsal; PR 2 (5341): working
state: working

## Done
- Chain A only (lines 1-3, BroTown.jsx, tags 5340-5342); chain B is M2
- PR 1 #2089 (5340): ready, at the gatekeeper

## Next
- PR 2 (5341), more named steps, moves nothing: the ten single calls
  inside legacy (tap, sound, ride, zone, farm, townsfolk, monsters,
  weaponFeel, loot, peers) marked `to(a, b)` on their own lines; the guard
  walks every mark; legacy 1555 -> 1531 code lines; mp-framesteps 19/19,
  17 steps. after-frame.test 2a takes a mark's index as `\d+` (the
  planning session's answer; deploys). Running the combat tests.

## Found
- tools/dev/precheck.mjs: server-tests' 5-minute limit times out on this
  box, main too (guards/switches-thrown alone 4m58s on main 17f749b);
  `cd server && npm test` is green in full (501 suites, 378 s).
- Held for the later card, not M's (owner's review, item 6): KNOWN_SECOND 5
  (the frame measured by two clocks) and 7 ("is the world in play" asked
  four ways); BUDGETS part 3's caches.

## Needs
- The gatekeeper's review of #2089 (sitting 42).

