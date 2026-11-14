# The pixel budget: no more canvas pixels than a screen needs (v2.3.5140)

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

## The owner's answer (2026-11-14)

Asked with two pictures of a 2560 x 1440 window at 150%, before and after the
art's budget: *"For your big screen picture budget you can probably decrease
it much further this is a mediocre hd pixel art game."* So a screen that is
not a phone is held to a 1920 x 1080 screen's worth, below the art's own 2 px
a game px; the softer picture is accepted. Phones keep the art's budget, which
touches none of them (a third fewer pixels made no difference on the owner's
iPhone: STATE-MACHINES "Smooth on every device").

## The rule

`renderDpr()` returns the LOWEST of:

- the screen's own ratio;
- `?res=`;
- the speed test's (`setRenderResLive`);
- the budget's: the ratio at which the canvas's CSS pixels times the ratio
  squared meet the budget.

**The budget, by the device's class** (`deviceProfile.js phoneScreen()`: no
mouse, and the SCREEN's short side under 600 CSS px; the biggest phones are
~440, the smallest iPad 744):

| Class | Budget at the default zoom |
|---|---|
| A phone | the view cap's reference at the art's px: (850 x 2) x (1330 x 2), ~4.52 million |
| Anything else (a tablet, a computer) | a 1920 x 1080 screen's, ~2.07 million |
| `?pixbudget=<pixels>` (any class) | that count (at least 100000; `3000000` or `3e6`) |
| `?pixbudget=0` | none |

- **Read from the constants**: `VIEW_CAP.REF_W` / `REF_H` (`viewCap.js`),
  `GAME_PX_PER_ART_PX` (a mirror of bible.js; `render-res.test` 1a holds the two
  together) and `SCREEN_BUDGET_W` / `_H`. At `?zoom=k` both grow as the view
  cap's reference does (0.77 / k each way, clamped as `worldViewport.js`
  clamps it). A count given in the address is taken as it is.
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
- **The class is kept with the size**, worked out when `resize()` tells it, not
  at each call: a touch laptop's mouse comes and goes, and a ratio that moved
  between two callers in one frame would resize the canvas (`render-res.test`
  4d, 4e).
- **The four callers agree** (BroTown's `resize()`, `pixiApp.js`,
  `pixiRenderer.js`, `worldViewport.js`): all call `renderDpr()` with no
  argument and read the same kept size. A size or class that moves the ratio
  moves the renderer's resolution with it (as the speed test's does), or Pixi
  and `resize()` would size the canvas at two ratios and fight every frame
  (`render-res.test` 4a to 4c).
- A lowered canvas is stretched smoothly up (`[data-res-soft]` in `game.css`),
  the look the house chose over a grainy one. On a big computer screen the
  ratio goes below 1 (a canvas pixel bigger than a CSS pixel); the text drawn
  in the world (names) softens with it.

## What it does to each screen

| Screen | Before | After |
|---|---|---|
| iPhone 390 x 844 at 3 (a phone) | 3 | 3, untouched |
| The biggest iPhone, 440 x 956 at 3 | 3 | 3, untouched |
| 1920 x 1080 at 1 | 1 | 1, untouched (its canvas is under the window) |
| 11-inch iPad at 2 (3.9M) | 2 | ~1.46 (2.07M) |
| 12.9-inch iPad at 2 (5.6M) | 2 | ~1.22 (2.07M) |
| 2560 x 1440 at 1 (3.7M) | 1 | ~0.75 (2.07M) |
| 2560 x 1440 at 1.5 (8.3M) | 1.5 | ~0.75 (2.07M) |
| 5K at 2 (14.7M) | 2 | ~0.75 (2.07M) |

(The window's size; the canvas is smaller on a computer by the band, so a real
computer is lowered a little less.)
Measured in a browser, a 2560 x 1440 window at 1.5 in BroTown (canvas 2560 x
1210 CSS px): 3840 x 1817 (7.0 million) today; 3092 x 1463 (4.52 million) at
the first cut, the art's budget; 2094 x 990 (2.07 million, ratio 0.82) as
merged.

## The switch

On by default. `?pixbudget=0` turns it off for one screen (the memory law's
form); `?pixbudget=<pixels>` tries another budget on one screen.

## Memory

Fewer canvas pixels is less graphics memory. `mp-membudget` plays at a phone's
size, under the budget, so it does not move.

## Not here

The passes (shadows, shine, water), the look palette on computers (2.2b), the
lanes and the governor (card O), the frame pacer.

## Tests

- `server/test/render-res.test.mjs`: the budgets from the constants; the
  screens, phones told by their screen and pointer; the lowest of four; the
  switch and the count; the four callers agree after a resize; the class kept
  with the size; one `?zoom=` reading. Its break proofs: `REF_W` 850 to 900
  turns 1b red; `SCREEN_BUDGET_W` 1920 to 2560 turns 1c and 2b red; dropping
  `followRenderer` from `noteCanvasCss` turns 4a and 4b red.
- `server/test/device-profile.test.mjs`: the phone question.
- `mp-desksmooth`, `landview`, `questline` in a browser.
