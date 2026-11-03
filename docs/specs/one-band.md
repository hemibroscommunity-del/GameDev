# One dashboard on every screen (`?oneband`) (v2.3.4072; the default since v2.3.4092)

## v2.3.4092: the default, on every device

The owner, 2026-11-03:

> Move the left side menu to the bottom of screen on computer and all other
> devices if this isn't already being worked on

So the one band is **on by default** on every device: a computer, a sideways
phone, a tablet and an upright phone. These words supersede the owner's
earlier choices the side column was built on:

- sideways, "No I don't want an overlay over the world" (v2.3.2157) and "You
  can actually remove that whole bottom length bar now" (v2.3.2168);
- on a computer, "Yes base desktop off the landscape mode but fix the menu
  sizes" (v2.3.3687);
- UI-DESIGN-NOTES "Please don't suggest: bringing back a bottom bar sideways"
  (taken off that list).

**The old layout stays reachable** for one device: `?oneband=0` in the
address, or the Test panel's **Side column (old layout)** row (its button
"Use the side column (old layout)", then "Back to the dashboard at the
bottom"). The device keeps the choice.

**The stored key.** Until v2.3.4092 `localStorage` `bt_oneband` held `'1'` for
on and was removed for off, so "no key" meant off. Now it records only an
explicit off, `'0'`: no key (a device that never asked, or an old "off") and
the old `'1'` (a device that tried `?oneband=1`) both read **on**.
`?oneband=0` and the row store `'0'`; `?oneband=1` and the row again remove
it.

**A computer's own sizes** (`deskWide.js` `deskBigActive`: the old column
or the band): the 470 px building windows, the world map key's zoom, the
swap hint's "Swap weapons: 1 Melee, 2 Bow, 3 Staff" and the coach card's step
clear of the quest card hold under the band too. The player frame and the
controls' ⌨ move in with the world past its bars (game.css's
`html.bt-one-band` block), and the chat bar spans the world, not the bars.

**A computer's controls list.** The keys strip is the side column's, so it
goes; the nav buttons wear their key caps and I P J L K O and Esc work as
before. The controls list (`KeyboardHintsPanel`) had come up over the world's
bottom-left, above the band; on a computer playing the band it now starts
folded to its ⌨ (`deskWide.js` `deskBandActive`) until the player opens it
(the ⌨ or H; the choice kept in `bt_kb_hints_off`, `'0'` open).

## The owner's words it is built on (v2.3.4072)

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

B3 (v2.3.4072, #1396) shipped it **off**, behind `?oneband=1` and the Test
panel's "One dashboard (to try)" row, for the owner to try; B4 (v2.3.4092)
made it the default.

## What the one band does

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
- **Today's height, never taller** (v2.3.4092, the owner: keep today's
  dashboard height on every layout, no taller band). An upright screen keeps
  exactly the band it has always had (`sheetGeometry.js` `barHeight`: 243 at
  390 x 844, 235 at 375 x 667, 269 on an upright tablet). A wider screen gets
  `min(ONE_BAND_MAX_H, round(screen height / 3))`, where `ONE_BAND_MAX_H` is
  the upright phone's band, 243: a sideways phone (844 x 390) gets 130, a
  computer at 1280 x 720 240, at 1440 x 900 or 1920 x 1080 243 (B3's rule gave
  269 there, the upright formula for a wide box; and it capped short upright
  phones at a third, 222 at 375 x 667). The nav row keeps its upright height
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
- `src/ui/panels/DevPanel.jsx` -- the Test panel's row (v2.3.4092: "Side
  column (old layout)", the off switch).
- v2.3.4092: `src/ui/deskWide.js` `deskBandActive` and BroTown's
  `kbHintsOff` initialiser (the controls list folded on a computer playing the
  band).

## Tests

- `mp-oneband`: an upright phone, a sideways phone and a computer (`wide:
  true`), each asking for nothing (the default) in the Wheel's BroTown -- the
  upright layout, the band at most a third (the upright band upright), the
  slots fitting the box and more of them on a wider one, Quests opening
  inside the band at its height, the canvas above the band no wider than
  2.2:1 and centred, the joysticks above the band; on a computer the key caps,
  every page key opening its page inside the band and Esc closing it, I
  folding the band and bringing it back, the controls list folded until H;
  the device's choice (no key on, the old `'1'` on, `?oneband=0` off and kept,
  `?oneband=1` clearing it); and with `?oneband=0` a sideways phone still
  plays the side column. Pictures in `tools/qa/mp/out/oneband-*.png`.
- The old layout's suites pass `?oneband=0`: `landdash` (the sideways side
  column) and `deskwide` (the computer's side column and keys strip), and the
  sideways parts of the scenarios whose subject is the side column (B4's PR
  lists them).
- `BT_QA_QUERY=oneband=0 node tools/qa/mp/run.mjs <name>` runs any scenario
  on the old layout.
- Pictures: `docs/shots/oneband-default-computer.webp` (1280 x 720) and
  `docs/shots/oneband-default-sideways.webp` (844 x 390).

## Not done

- Pages other than the band's resting row (Character, Quests, Life Skills,
  Codex, More) lay themselves out from the play area's width as upright; on a
  sideways phone they scroll inside an 82 px body. Density per page (more
  columns on a wide band, fewer rows) waits on the owner's verdict, and on
  Lane A's Gear tab, which lays itself out from the box it gets (it receives
  the same box here).
- The UI review's sideways and computer views now show the band (the
  default); it has no state for the old layout (the switch needs a reload).
- The doubled minimap on a computer (the owner's "double the size",
  v2.3.3986) stays the old layout's: under the band the world is a third
  shorter (480 px tall at 1280 x 720) and a 264 px minimap with its plate took
  two thirds of it and lay over the skateboard's button, so the band keeps a
  phone's 132 px (`wheelMiniSize.js`). The owner's call whether to bring it
  back at some window height.
- On a sideways phone the world above the band is 260 px tall: the right-hand
  controls column (Sprint, the attack disc) reaches up over the minimap's
  lower half (`docs/shots/oneband-default-sideways.webp`). The UI review
  (`capture.mjs --views=landscape`) names what that costs: Sprint's middle is
  under the world map's button (a tap there opens the map), and the weapon
  triangle's bow and staff are under the player frame's HP number. Not moved
  here: it needs the controls or the minimap laid out for a short world (the
  owner's call). Diego's drawer sideways covers the whole world above the
  band (it is 226 px tall), and still sells (mp-shopkeeper).
- Dropping the old layout, if the owner never goes back to it: the side
  column, the dock and the keys strip
  (`landDockFootprint`, `landscapeSheetW`, DashColumns `stacked` / `desk`,
  HeroExpanded `landPane` / `deskCol`, game.css's `data-orient="landscape"`
  and `bt-desk-wide` column blocks); the owner's call, since `?oneband=0` is
  how the old layout stays reachable.
