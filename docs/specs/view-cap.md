# The view cap: one visible area of world for every screen (v2.3.4074)

> A design review the owner shared: "I'd consider establishing a consistent
> maximum gameplay visibility range regardless of screen dimensions."
>
> The owner, choosing: "Cap it for everyone now".

## What was wrong

The one view rule (`src/game/worldViewport.js`) held every UPRIGHT phone to
the same 1330 game px of height, but a wide screen saw much more: sideways the
rule reads the short side (960 game px tall) and takes all the width it is
given. A sideways phone saw 2078 x 960 game px, twice an upright phone's area;
a 2560 x 1080 computer 1627 x 960. Seeing another player or a monster first
is the game's tactical layer (the fairness note, v2.3.2021), so that was an
edge bought with a screen. The worker sends things ~2,400 px out whatever the
screen, so the edge was real.

## The rule

Every screen sees about the same AREA of world as an upright phone with its
dashboard open: 850 x 1330 game px (1.13M px²) at the default zoom.

    scale = max(the scale the rule gave before, min(sqrt(canvas area / 850 x 1330),
                                                    canvas short side / 680))

* A screen that showed more area is zoomed IN until it shows that much. One
  number, so the view keeps the screen's shape: a wide screen still sees
  wider than tall, just not more area.
* It stops before the short side drops below **680 game px**: past that a
  strip of a screen would be looking through a letterbox. Such a screen keeps
  a little more area than the reference.
* It only ever zooms in, so it can never draw the void past a map's edge, and
  every screen that sees less than the reference (an upright phone, a
  1366 x 768 laptop) is untouched.
* At `?zoom=k` the reference grows with the view (0.77 / k each way).

Why 850 and not 760: the first cut took 760 x 1330 (half way between the
dashboard up and folded) and zoomed the open 390 x 844 phone in by 5%
(843 x 1330 to 801 x 1263). An upright phone is the reference and must not
move, so the reference is the widest upright view measured: 375 x 812 with
its dashboard open, 850 x 1330.

## The numbers (measured, mp-landscape-view, in the Wheel's BroTown)

| Screen | Canvas (CSS px) | Before: view, area | After: view, area | Scale |
|---|---|---|---|---|
| Upright 390 x 844, dashboard folded | 390 x 806 | 643 x 1330, 0.86M | 643 x 1330, 0.86M | 0.606, unchanged |
| Upright 390 x 844, dashboard open | 390 x 615 | 843 x 1330, 1.12M | 843 x 1330, 1.12M | 0.463, unchanged |
| Upright 375 x 812, open | 375 x 587 | 850 x 1330, 1.13M | 850 x 1330, 1.13M | unchanged |
| Upright 430 x 932, open | 430 x 689 | 830 x 1330, 1.10M | 830 x 1330, 1.10M | unchanged |
| Short upright 375 x 667, open | 375 x 446 | 974 x 1158, 1.13M | 974 x 1158, 1.13M | unchanged (the character floor) |
| Sideways 844 x 390 | 844 x 390 | 2078 x 960, 1.99M | 1564 x 723, 1.13M | 0.406 to 0.540 |
| Computer 1366 x 768 (sideways layout) | 820 x 768 | 1025 x 960, 0.98M | 1025 x 960, 0.98M | 0.800, unchanged |
| Computer 1920 x 1080 | 1374 x 1080 | 1221 x 960, 1.17M | 1199 x 943, 1.13M | 1.125 to 1.146 |
| Ultrawide 2560 x 1080 | 1830 x 1080 | 1627 x 960, 1.56M | 1384 x 817, 1.13M | 1.125 to 1.322 |

The computers are measured with their pages open (the columns either side of
the world); with the controls folded the world's canvas is wider and is capped
the same way. The shell holds a computer to 2.2:1 (game.css), so 2560 x 1080
is about the widest a window gets. No screen here reaches the 680 stop: the
sideways phone, the shortest, ends at 723.

## Where it applies

Every zone. D10 (the owner, 2026-09: "landscape zoom: town/worldview only;
combat zones stay") let the OLD town zoom out sideways where a 32 x 32 combat
map could not. The cap does not undo that trade: sideways the old town still
sees wider than a combat zone (scale 0.54 against 0.82, `view-cap.test` 3i),
and a combat zone (1024 x 473, 0.48M) is under the cap anyway. The old lands
are closed; the Wheel, where people fight, is where it matters.

## How it is built

* `src/game/viewCap.js` (no imports): `VIEW_CAP`, `capViewScale`,
  `viewCapChoice`.
* `worldViewport()` applies it LAST, as one more floor in the same `max()` on
  the one scale (its header warns against a second axis term fighting the
  first: this is not one). The camera (BroTown's loop) and the renderer
  (`renderFrame`) both call it, so they agree by construction.
* Taps, aim and every overlay convert with `S._worldScaleX/Y`, which the
  renderer publishes from the same scale (TRAPS §210): they follow with no
  change. The camera is still snapped to whole device pixels after the scale
  (pixiRenderer.js, TRAPS §231): nothing there assumes a scale.
* The character is drawn bigger on a capped screen (the figure scales with the
  world); in-world text counter-scales as it always has (`setPlateZoom`).
* Memory: a closer view draws less ground and fewer objects, never more.

## The switch

On by default (the house rule for a change the owner chose, CLAUDE.md §7).

* `?viewcap=0` turns it off for one tab; `?viewcap=1` forces it on.
* The Test panel, "Memory savers": **Same view for every screen** turns it off
  for every phone at once (`off_viewcap`, `src/game/clientOff.js`, live: no
  reload). It is not a memory saver; it rides that row the way the Hemi Bros
  portrait does. "All off" there turns it off too.
* `window.__btWorldView(zone)` says `viewCap: true|false`;
  `__btWorldView(zone, { cap: false })` answers the view without it.

## Checks

* `server/test/view-cap.test.mjs`: the cap alone, the switch, and the real
  `worldViewport()` on the measured canvases (the table above), the Test
  panel's row live, D10 sideways.
* `mp-landscape-view` (moved onto the Wheel from the retired map by this PR):
  each screen above in BroTown, the live view equal to the rule's, the
  renderer's scale equal to it, the upright phones unchanged, `?viewcap=0`
  the old view.
