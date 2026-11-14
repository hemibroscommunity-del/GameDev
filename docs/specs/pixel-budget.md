# The pixel budget: no more canvas pixels than the art can fill (v2.3.5140)

> The owner, 2026-11-09: "It's just unoptimized for desktop. Can you fix how
> the game gets processed when used on desktop? It's all been focused on
> mobile performance."

Grand plan step 2.2a; `docs/STATE-MACHINES.md` A2, point 1.

## What was wrong

The canvas was drawn at the screen's own pixel ratio (`src/game/renderRes.js`).
A computer's big screen paid for millions of pixels nobody can see:

| Screen | Canvas pixels before |
|---|---|
| The owner's iPhone (390 x 844 at 3) | ~2.9 million |
| 1920 x 1080 at 1 | ~1.9 million |
| 11-inch iPad (820 x 1180 at 2) | 3.9 million |
| 12.9-inch iPad (1024 x 1366 at 2) | 5.6 million |
| 2560 x 1440 at 1.5 | 8.3 million |
| 5K (2560 x 1440 at 2) | 14.7 million |

Every screen sees the same AREA of world (the view cap, `docs/specs/view-cap.md`:
850 x 1330 game px), and every picture has 2 px a game px
(`public/tools/style/bible.js` `PIXEL.gamePxPerArtPx`). So a canvas past
(850 x 2) x (1330 x 2), about **4.52 million** pixels, is finer than any picture
in it. The graphics chip still pays for each of those pixels in every pass.

## The rule

`renderDpr()` returns the LOWEST of:

- the screen's own ratio;
- `?res=`;
- the speed test's (`setRenderResLive`);
- the budget's: the ratio at which the canvas's CSS pixels times the ratio
  squared meet the budget.

- **Read from the constants**: `VIEW_CAP.REF_W` / `REF_H` (`viewCap.js`) and
  `GAME_PX_PER_ART_PX` (a mirror of bible.js; `render-res.test` 1a holds the two
  together). At `?zoom=k` the reference grows as the view cap's does
  (0.77 / k each way, clamped as `worldViewport.js` clamps it).
- **The canvas's CSS size, never the window's** (TRAPS §214: on a computer the
  band at the bottom takes part of the window). `BroTown.jsx` `resize()` tells
  `renderRes.js` the size it is about to give the canvas (`noteCanvasCss`), in
  one line before it reads `renderDpr()`. Every call reads that one kept value
  and never measures the page. Until the first resize there is no budget.
  - Why this way and not a `resize` listener in `renderRes.js`: card H's open
    branches did not touch `BroTown.jsx` (`git diff --stat` on
    `claude/grand-plan-h-2-whose-row` and `-h-3-gear-sheet`, 2026-11-14), so
    the card's first way applied. One copy of the canvas's size, not a second
    working-out of the band's footprint.
- **The four callers agree** (BroTown's `resize()`, `pixiApp.js`,
  `pixiRenderer.js`, `worldViewport.js`): all call `renderDpr()` with no
  argument and read the same kept size. A size that moves the ratio moves the
  renderer's resolution with it (as the speed test's does), or Pixi and
  `resize()` would size the canvas at two ratios and fight every frame
  (`render-res.test` 4a to 4c).
- A lowered canvas is stretched smoothly up (`[data-res-soft]` in `game.css`),
  the look the house chose over a grainy one.

## What it does to each screen

| Screen | Before | After |
|---|---|---|
| iPhone 390 x 844 at 3 | 3 | 3, untouched |
| 1920 x 1080 at 1 | 1 | 1, untouched |
| 11-inch iPad at 2 | 2 | 2, untouched |
| 12.9-inch iPad at 2 | 2 (5.6M) | ~1.80 (4.52M) |
| 2560 x 1440 at 1.5 | 1.5 (8.3M) | ~1.11 (4.52M) |
| 5K at 2 | 2 (14.7M) | ~1.11 (4.52M) |

(The window's size; the canvas is smaller on a computer by the band, so a real
computer is lowered a little less.) Measured in a browser, a 2560 x 1440 window
at 1.5 in BroTown: the canvas 2560 x 1211 CSS px, 3840 x 1817 (7.0 million)
before, 3092 x 1463 (4.52 million, ratio 1.21) after.

## The switch

On by default. `?pixbudget=0` turns it off for one screen (the memory law's
form).

## Memory

Fewer canvas pixels is less graphics memory. `mp-membudget` plays at a phone's
size, under the budget, so it does not move.

## Not here

The passes (shadows, shine, water), the look palette on computers (2.2b), the
lanes and the governor (card O), the frame pacer.

## Tests

- `server/test/render-res.test.mjs`: the budget from the constants; the six
  screens; the lowest of four; the switch; the four callers agree after a
  resize; one `?zoom=` reading. Its break proofs: `REF_W` 850 to 900 turns 1b
  red; dropping `followRenderer` from `noteCanvasCss` turns 4a and 4b red.
- `mp-desksmooth`, `landview`, `questline` in a browser.
