card: G
branch: claude/plan-g-pixel-budget
prs: #1701 (ready; sitting 4's hold answered: main merged, four-lines green)
state: ready

## Done

- (nothing merged yet)

## Next

- #1701 (tag 5140), the pixel budget. The owner's answer (relayed by the
  planning session, 2026-11-14): "decrease it much further". A phone keeps
  the art's budget (~4.52M, touches none); anything else is capped at a
  1920 x 1080 screen's (~2.07M); `?pixbudget=<pixels>` tries another.
  `render-res.test` 34 of 34; `device-profile.test` green; `desksmooth` 29
  of 29; `landview` 55 of 55; `questline` 187 of 187; the new picture taken.

## Found

- STATE-MACHINES A2 point 1 ("no pixel budget"): settled by PR 1 once
  merged (`docs/specs/pixel-budget.md`); the gatekeeper ticks it.
- `src/game/deviceProfile.js`: gained `phoneScreen()` (the budget's class:
  no mouse, the screen's short side under 600), the one file outside the
  card's list, because CLAUDE.md puts every device question there.
- Card H's open branches (`claude/grand-plan-h-2-whose-row`,
  `-h-3-gear-sheet`) do not touch `src/ui/BroTown.jsx`, so PR 1 tells
  `renderRes.js` the canvas's size from `resize()`, in one line (and the
  import line beside it extended).

- `tools/qa/mp/mp-desksmooth.mjs`: the large monitor's (2560 x 1440 at 1)
  walk line "the overview under at most 5%" is flaky on this box on MAIN too
  (main 0%, 7.1%, 10.3%; this branch 3.4%, 10.3%, 10.3%: 1 to 3 frames of
  29). At ratio 1 that screen is under the budget, so PR 1 does not change it.

## Needs

- Nothing: the gatekeeper's merge.
