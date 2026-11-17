card: M
branch: claude/plan-m-1-framesteps (PR 1, tag 5340; from main)
prs: #2089 (5340): ready (L done; main bdfa8734 merged in)
state: ready

## Done
- Chain A only (lines 1-3, BroTown.jsx, tags 5340-5342); chain B is M2
- (none merged yet)

## Next
- PR 1 (5340), the frame as a list, moves nothing: src/game/frameSteps.js,
  the marks in gameLoop, 'frame-step' quiet in crashTrap, `?framesteps=0`,
  tools/guards/frame-steps.test.mjs (legacy's census 1555 code lines),
  tools/qa/mp/mp-framesteps.mjs (19/19). Phone runs beside main's: all green.
  after-frame.test 2a accepts the step marks (the planning session's
  answer, 2026-11-17; server/test: the merge deploys the worker).
  The card as amended by the owner's review (f8df9ed5) committed here.

## Found
- tools/dev/precheck.mjs: server-tests' 5-minute limit times out on this
  box, main too (guards/switches-thrown alone 4m58s on main 17f749b);
  `cd server && npm test` is green in full (501 suites, 378 s).
- Held for the later card, not M's (owner's review, item 6): KNOWN_SECOND 5
  (the frame measured by two clocks) and 7 ("is the world in play" asked
  four ways); BUDGETS part 3's caches.

## Needs
- The gatekeeper's review of PR 1 (sitting 42).
