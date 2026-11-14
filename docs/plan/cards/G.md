# Card G: the pixel budget (step 2.2a only)

**Starts:** after W is merged (it is).
**Read:** `CLAUDE.md` (§7 the laws: memory, the page's thread, drawing,
desktop); the ten rules at the top of part 5 of `docs/GRAND-PLAN.md`; steps
2.1 to 2.3 (to know what is NOT yours); `docs/STATE-MACHINES.md` "Smooth on
every device", item A2 and its point 1; `src/game/renderRes.js`;
`docs/specs/view-cap.md`, `sharp-pixels.md`.
**Tags:** 5140 to 5159, one a PR. One PR is expected; a second only if the
first's review asks for one.
**Browser:** light (`mp-desksmooth`, `landview`, `questline`).
**Effort:** standard.

## PRs, in order

1. **(tag 5140) A canvas never has more pixels than the art can fill.**
   - Files: `src/game/renderRes.js`; a new suite
     `server/test/render-res.test.mjs` (it imports the file with a stand-in
     window: its merge deploys the worker); a new spec
     `docs/specs/pixel-budget.md`.
   - **The budget**: the view cap's reference area (850 x 1330 game px,
     `src/game/worldViewport.js`) times the art's 2 px a game px each way:
     about 4.52 million canvas pixels. Read from the constants, never
     written as a number of its own. At `?zoom=k` the reference grows as
     the view cap's does.
   - `renderDpr()` returns the lowest of: the screen's own ratio, `?res=`,
     the speed test's, and the ratio at which the window's CSS pixels
     times the ratio squared meet the budget.
   - **The window, not the play column, on purpose**: the canvas is never
     larger than the window, so the cap errs towards sharp. `renderRes.js`
     reads the window's size in a `resize` listener of its own, added as
     the file is imported, so it runs before BroTown's own resize listener
     (listeners fire in the order they were added). Never inside a frame.
   - **The four callers keep calling `renderDpr()` with no argument**
     (`BroTown.jsx` `resize()`, `pixiApp.js`, `pixiRenderer.js`,
     `worldViewport.js`): they must agree (the file's header says why).
     None of them is changed.
   - On by default, with `?pixbudget=0` for one screen (the memory law's
     form).
   - **Done when**: the suite shows an iPhone's window (390 x 844 at 3), a
     1920 x 1080 laptop at 1 and an 11-inch iPad (820 x 1180 at 2, 3.9
     million) untouched; and a 12.9-inch iPad (1024 x 1366 at 2, 5.6
     million), a 2560 x 1440 window at 1.5 (8.3 million) and a 5K one
     lowered to the budget; `mp-desksmooth`, `landview` and `questline` green; and
     the PR shows two pictures of a 2560 x 1440 window at 1.5, before and
     after, side by side.

## Readings chosen for you

- **Safe for phones**: every phone is under the budget today (the owner's
  iPhone is about 2.9 million). The big iPad is over it, and is lowered
  like a computer: the same engine, more pixels than its art can fill.
- **What a player sees changes on a big screen** (a lowered canvas is
  stretched smoothly up, `[data-res-soft]` in `game.css`, the look the
  house chose over a grainy one). So the PR's words ask the owner one
  question in plain words, with the two pictures: "On a big computer
  screen, is the right-hand picture as good as the left?" Merge waits for
  the yes.
- **Memory**: fewer canvas pixels is less graphics memory; `mp-membudget`
  plays at a phone's size and should not move. If it moves, say how much.
- **Not yours**: the passes (shadows, shine, water), the look palette on
  computers (2.2b, later), the lanes and the governor (card O), the pacer.
  STATE-MACHINES' A2 line: write under Found what the PR settled; the
  gatekeeper ticks the plan.
- Never side by side with card H in one file: H is not in `renderRes.js`.

## Not yours

`BroTown.jsx` and the renderers; `framePacer.js`; `lookPaletteChoice.js`;
`speedTest.js` (card A: its `res2` step keeps working through
`setRenderResLive`).
