# One dashboard on every screen, to try (`?oneband=1`) (v2.3.4052)

The owner, 2026-11-02:

> unification of all different screen types (mobile landscape, portrait)
> desktop, tablet, etc to use the same layout and just scale differences to
> screen size (as much as possible - tap buttons won't exist on desktop). I
> think having the same layout maximizes simplicity consistency and fairness.
> User attention is best focused on the bottom portion of whatever screen for
> menus. I like the 1/3 idea where the menu takes up that much of the bottom
> of the screen even in layout orientation.

and the refinement he adopted:

> One universal layout, one interaction philosophy, and one underlying
> interface system -- with responsive density rather than uniform scaling ...
> Use the available space to determine the number of inventory slots, stat
> rows, label sizes, and information density. Maintain minimum readable text
> and touch-target sizes.

## It reverses earlier decisions, so it is a switch, off

This undoes things the owner chose before:

- sideways, "No I don't want an overlay over the world" (v2.3.2157) and "You
  can actually remove that whole bottom length bar now" (v2.3.2168);
- on a computer, "Yes base desktop off the landscape mode but fix the menu
  sizes" (v2.3.3687);
- UI-DESIGN-NOTES "Please don't suggest: bringing back a bottom bar sideways".

So it ships **off**. It is on for a device with `?oneband=1` in the address,
or the Test panel's **One dashboard (to try)** row (the installed app has no
address bar); `?oneband=0` or the row again turns it off. The choice is kept
on the device (`localStorage` `bt_oneband`) until switched off, unlike
`?deskwide` (the tab's). The PR asks the owner to try it on a sideways phone
and a computer before it becomes the default. Nothing changes for anyone who
has not switched it on.

## What the switch does

Every screen uses the **upright layout** -- the one an upright phone has
always had -- and only its size changes:

- **The band at the bottom, the world above it.** `playIsLandscape()`
  (`src/ui/mobile/playViewport.js`) answers no and `deskWideActive()`
  (`src/ui/deskWide.js`) answers no, so every place that picks between the
  upright, sideways and computer layouts picks upright: `data-orient` reads
  `portrait`, BottomDashboard draws the band (not the side column and the
  dock), NavRail's row and the CLOSE / OPEN pill are in it, Hero and More lay
  out as upright, the joysticks and the combat buttons sit above the band
  (they ride `--dash-h` / `--sheet-h`), and a key does what its button does.
  Whatever upright draws -- six buttons and the pill on main today, five and
  the grip once #1386 lands -- is what every screen draws.
- **At most a third of the screen.** The band's height is
  `min(the upright band, round(screen height / 3))` (`sheetGeometry.js`
  `barHeight`). An upright phone's band is already under its third (243 of
  844 at 390 x 844), so it does not move; a sideways phone (844 x 390) gets
  130, a computer at 1280 x 720 gets 240. The nav row keeps its upright height
  and the columns row is what is left (`bandFootprint`).
- **A page opens inside the band at the same height**, as upright
  (`expandedSheetHeight` and `drillSheetHeight` read `barHeight`).
- **The band's contents from its measured box, never a device check.**
  `OneBandColumns.jsx` measures the columns row (a ResizeObserver) and hands
  the box to DashColumns (`box`), which takes its numbers from
  `oneBandLayout(w, h)`:
  - `columns = floor((w + gap) / (tile + gap))`, `rows = floor((h + gap) /
    (tile + gap))`, in the band's own algebra (frame, borders, pads, one gap);
  - the tile is the upright tile for the box's width (`dashTileSize`,
    40..76), shrunk only to fit the height, at least 44 (the touch minimum)
    while there is room; one more row when the tile keeps three quarters of
    its size;
  - a band too short for the filter header and a row of tiles drops the
    header (then the peek); the chips stay on the Bag pane;
  - the combat cards stack down a narrow column while each is at least 34 px
    tall, else they lie side by side; the bag takes every whole column left
    after the combat column's floor (78 px, its upright width at 320).
  On an upright phone this comes out at exactly the upright band (4 x 2 of
  63 px, the header, the peek, 94 x 54 cards at 390 x 844). Measured
  (mp-oneband): a sideways phone 9 x 1 of 51 px with the cards in a row; a
  computer at 1280 x 720 17 x 2 of 63 px.
- **Bars beside a world wider than the world rule.** Where the world above
  the band would be wider than 2.2:1 (game.css's computer-shell rule: "fair
  by height; past 2.2:1 the sides are bars"), `bandFootprint` returns a
  narrower `playW` and the bar each side (`barW`), resize() adds it to
  `--world-x` / `--world-r`, and game.css's `html.bt-one-band` block narrows
  and centres `.brotown-wrap` and the zone header (the sideways layout's own
  contain:paint mechanic). The band stays the screen's width. A sideways
  phone keeps a 572 px world of 844; a computer at 1280 x 720 a 1056 px one.
  `src/game/worldViewport.js` is not touched (Lane E's camera cap).
- **The Island.** Sideways the band steps in by the safe-area insets
  (`--world-pad-l/r`, 0 upright and headless), so no button sits under the
  punch hole; the zone header's exit chip clears it where a bar does not.
- **A computer keeps its keys.** `html.bt-desk-wide` stays on (it frees
  `#root` from the upright aspect lock, so the band is the window's width),
  but with the switch nothing reads it as the side column: the keys strip
  goes, the key caps on the buttons stay (game.css draws them for any mouse),
  and I P J L K O open and close their pages.

## Files

- `src/ui/oneBand.js` -- the switch (`oneBandWanted`, `oneBandActive`,
  `applyOneBand`, `setOneBand`), the probe `window.__btOneBand()`.
- `src/main.jsx` -- `applyOneBand()` before the render.
- `src/ui/mobile/playViewport.js`, `src/ui/deskWide.js` -- the two answers.
- `src/ui/mobile/sheet/sheetGeometry.js` -- `barHeight`'s third,
  `bandFootprint`'s upright branch and `oneBandFootprint`, `oneBandLayout`.
- `src/ui/mobile/sheetStamp.js` -- `--sheet-h` takes the upright branch.
- `src/ui/mobile/dash/OneBandColumns.jsx` (new) and a one-line hook-up in
  BottomDashboard; DashColumns' `box` prop (a few lines: the tile, the counts,
  the header, the cards' row).
- `src/ui/BroTown.jsx` -- resize() adds `barW` to `--world-x` / `--world-r`.
- `src/styles/game.css` -- the `html.bt-one-band` block.
- `src/ui/panels/DevPanel.jsx` -- the Test panel's row.

## Tests

- `mp-oneband` (new): an upright phone, a sideways phone and a computer
  (`wide: true`), each with `?oneband=1` in the Wheel's BroTown -- the
  upright layout, the band at most a third (the upright band upright), the
  slots fitting the box and more of them on a wider one, Quests opening
  inside the band at its height, the canvas above the band no wider than
  2.2:1 and centred, the joysticks above the band, a computer's key caps and
  J; and without the switch a sideways phone still sideways. Pictures in
  `tools/qa/mp/out/oneband-*.png`.
- With the switch off nothing reads differently: `deskwide`, `landdash`,
  `playable` and `membudget` run as before.
- `BT_QA_QUERY=oneband=1 node tools/qa/mp/run.mjs <name>` runs any scenario
  with the switch on.

## Not done (for after the owner has tried it)

- Pages other than the band's resting row (Character, Quests, Life Skills,
  Codex, More) lay themselves out from the play area's width as upright; on a
  sideways phone they scroll inside an 82 px body. Density per page (more
  columns on a wide band, fewer rows) waits on the owner's verdict, and on
  Lane A's Gear tab, which lays itself out from the box it gets (it receives
  the same box here).
- No UI-review state: the switch needs a reload, which the review's one
  session cannot make between states. mp-oneband's pictures stand in.
- If it becomes the default: drop the side column, the dock and the keys strip
  (`landDockFootprint`, `landscapeSheetW`, DashColumns `stacked` / `desk`,
  HeroExpanded `landPane` / `deskCol`, game.css's `data-orient="landscape"`
  and `bt-desk-wide` column blocks), and update UI-DESIGN-NOTES' "Please
  don't suggest".
