card: M
branch: claude/plan-m-1-framesteps (PR 1, tag 5340; from main)
prs: PR 1 (5340): building, held until card L's #2052, #2058, #2065, #2067 are on main
state: working

## Done
- (none merged yet)

## Next
- PR 1 (5340), the frame as a list, moves nothing: src/game/frameSteps.js,
  the marks in gameLoop, 'frame-step' quiet in crashTrap, `?framesteps=0`,
  tools/guards/frame-steps.test.mjs (legacy's census 1555 code lines),
  tools/qa/mp/mp-framesteps.mjs. Then the phone runs beside main's.

  after-frame.test 2a accepts the step marks (the planning session's
  answer, 2026-11-17; server/test: the merge deploys the worker).

## Found
- (none)

## Needs
- Card L done (its #2052, #2058, #2065, #2067 merged) before PR 1 opens
  (the planning session's answer 1). No open PR touches BroTown.jsx or the
  two renderers today (checked 2026-11-17).
