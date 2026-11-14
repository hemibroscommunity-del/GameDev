card: G
branch: claude/plan-g-pixel-budget
prs: PR 1 (tag 5140) on the branch above (working)
state: working

## Done

- (nothing merged yet)

## Next

- PR 1 (tag 5140), the pixel budget: `renderDpr()` holds a canvas to the
  view cap's reference at the art's 2 px a game px (~4.52 million).
  Suite `render-res.test` 21 of 21; `landview` 55 of 55; `questline` 187
  of 187; `desksmooth` 27 of 29 (see Found); the two pictures taken.

## Found

- STATE-MACHINES A2 point 1 ("no pixel budget"): settled by PR 1 once
  merged (`docs/specs/pixel-budget.md`); the gatekeeper ticks it.
- Card H's open branches (`claude/grand-plan-h-2-whose-row`,
  `-h-3-gear-sheet`) do not touch `src/ui/BroTown.jsx`, so PR 1 tells
  `renderRes.js` the canvas's size from `resize()`, in one line (and the
  import line beside it extended).

- `tools/qa/mp/mp-desksmooth.mjs`: the large monitor's (2560 x 1440 at 1)
  walk line "the overview under at most 5%" is flaky on this box on MAIN too
  (main 0%, 7.1%, 10.3%; this branch 3.4%, 10.3%, 10.3%: 1 to 3 frames of
  29). At ratio 1 that screen is under the budget, so PR 1 does not change it.

## Needs

- The owner's yes on the two pictures (PR 1's question) before merge.
