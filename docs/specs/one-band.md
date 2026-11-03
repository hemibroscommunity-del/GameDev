# One dashboard on every screen (`?oneband`) (v2.3.4072; the default since v2.3.4152)

## v2.3.4152 (B4, second part): sideways rests folded; a wide band's content centred

The owner, 2026-11-03, shown the default sideways (the controls over the
player frame and the minimap):

> The new universal dashboard system will need to adapt to the new redesign
> we're adding for "gear" and "bro." Go recommended on default behavior going
> into landscape mode and recommendations on anything else for that

Decided (owner-approved), and built:

1. **A phone on its side rests FOLDED** to the band's button row (the nav row
   alone, `data-dash-fold="min"`, 48 px at 844 x 390), so the world above it
   is 342 px, not 260. A nav button opens its page, as upright (the band
   unfolds); CLOSE folds it again, and so does closing a page any other way
   (a panel closing itself, a window that clears the band) and Diego's
   drawer or a trade shutting. The bag button pressed with a page open shows
   the bag's columns, as upright (CLOSE then folds them). `src/ui/mobile/bandSideways.js`.
   - *Sideways* is: the one band on, the window wider than tall, at most
     500 px tall (`ONE_BAND_SIDE_MAX_H`: a phone is 320-430; an iPad on its
     side is 768+ and keeps the band open), and not a mouse (`pointer:fine`:
     a computer's short window keeps its band open). Two classes on `<html>`:
     `bt-band-side` and `bt-band-side-open` (sideways and unfolded).
   - **The stored fold (decided here).** Going sideways, or loading
     sideways, folds the band WITHOUT writing `bt_dash_min`
     (`dashMinBus.sideways`: while it is set, a fold or unfold is the
     moment's only). A player who unfolds sideways keeps it open until they
     fold it or turn the phone: nothing re-folds it behind them. Turning
     upright gives the band back the upright's own remembered choice
     (`dashMinBus.stored()`), so sideways never changes how the band rests
     upright. A page open when the phone turns closes (the rotation rule
     since v2.3.2157) and the band folds; Diego's drawer or a trade open
     when it turns keeps the band open for its bag until the deal shuts.
2. **While the band is open sideways the controls step aside**: the stick,
   the attack disc, Sprint, the skateboard, Quick eat, Jump, Block, Special,
   the weapon triangle, the abilities, Element Burst, the charge gauge, the
   round TRAP button, and the two touch zones (a drag on the world does not
   start a walk under a page). Hidden by `visibility` (a hidden box is never
   hit, and keeps its rect for the coach and the probes) and not touchable,
   back the moment the band folds. game.css's `html.bt-band-side-open`
   block; **no control file is edited for it**: each is found by the hook it
   already carries (`data-sprint`, `.bt-rjoy-zone`, ...).
3. **Folded, the controls play the sideways geometry** (the side column's
   world was short too): BroTown's `isLandscape` for TouchControls and its
   siblings, and ElementBurstButton's and SpecialChargePie's own, ask
   `ctlLandscape()` (bandSideways.js: `playIsLandscape() || bandSideways()`)
   -- one line in each of those three files. They are already inside the
   world's box (`.brotown-wrap`'s `contain:paint` is the containing block of
   every fixed control in it), so they stand in from the bars with the world.
   That geometry was laid out for a 390 px world; over the folded row it is
   342, and measured, two things met that never did: the attack disc's top
   corner and the minimap's plate (13 px), and Quick eat (the left cluster's
   top) and the player frame's foot (13 px). So, in game.css only: the disc
   is drawn at 0.85 (80 px, its foot where it was, so Jump, Block and Shield
   Bash keep their places), and the left thumb's cluster (the stick, Element
   Burst, Quick eat, the weapon triangle) sits 20 px lower. Every touch
   target keeps 44 px. What the screenshot showed is gone: the stick is under
   the player frame, not on it; Sprint and the disc are left of and under the
   minimap; the weapon triangle is low on the left, far from the HP number.
4. **A computer and a tablet: the band open at rest** at today's height, as
   built, and its content -- the nav row, an open page, the resting columns
   (`data-band-box` in BottomDashboard) -- **centred**, as wide as the world
   above it (`--play-w`: its edges line up with the world's, bars and all)
   and at most **1200 px**. Why 1200: the Gear and Bro mockups (the repo
   root's `61C354F2-...png` and `D474F679-...png`) are three panels side by
   side at about 3.4 : 1, drawn for a phone's width; across a 1920 px window
   they would be three thin strips. 1200 over a 191 px body is a little over
   6 : 1, each of three panels about 400 px (the mockup's panel at a
   computer's 63 px tile), and it is what a 1280 px laptop window nearly
   fills. Measured: 1056 px at 1280 x 720 (the world's width there), 1200 at
   1920 x 1080. The band's background stays the window's width. Every tab
   inherits the box: Lane A's Gear tab and the Bro tab draw inside the page
   box, so they need nothing of their own.
5. **Upright phones unchanged.** The Test panel's "Side column (old layout)"
   row stays the off-ramp.

**Diego's drawer sideways** is not changed: the band unfolds for his bag (as
it must: you sell from it), the world above is 260 px, and his drawer (226
px: his name, his shelf, the deal) cannot be shorter without dropping one of
them. Closing it now folds the band again. Left for the owner (below).

## v2.3.4152: the default, on every device

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

**The stored key.** Until v2.3.4152 `localStorage` `bt_oneband` held `'1'` for
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
panel's "One dashboard (to try)" row, for the owner to try; B4 (v2.3.4152)
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
- **Today's height, never taller** (v2.3.4152, the owner: keep today's
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
- `src/ui/panels/DevPanel.jsx` -- the Test panel's row (v2.3.4152: "Side
  column (old layout)", the off switch).
- v2.3.4152: `src/ui/deskWide.js` `deskBandActive` and BroTown's
  `kbHintsOff` initialiser (the controls list folded on a computer playing the
  band).
- v2.3.4152 (sideways folded, the centred box): `src/ui/mobile/bandSideways.js`
  (new: the shape, the two classes, the fold, `ctlLandscape`, the probe
  `window.__btBandSide()`), started in `src/main.jsx`; `dashMinBus.js`
  (`sideways`, `stored`); BottomDashboard's three `data-band-box` hooks;
  game.css (the centred box, the controls stepping aside, the disc at 0.85
  and the left cluster 20 px lower sideways); one line each in BroTown,
  ElementBurstButton and SpecialChargePie (`ctlLandscape()`).

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
  v2.3.4152: sideways, with a fight's controls on screen (a shield, three
  weapons, food and a hurt bar, an enchanted sword, a monster near): the band
  rests folded and the fold is not stored; every control above the row,
  inside the world, clear of the player frame, the minimap and its plate
  (rects), shown and reached by a tap at its middle, 44 px or more; a nav
  button opens its page and every control is hidden and untouchable; CLOSE
  folds it and they come back where they were; a page closed by its own
  button folds it too. A phone turned sideways folds and turned back is the
  upright band, open. Not sideways (upright, the computer): no fold. A
  computer at 1920 x 1080 and 1280 x 720: the nav row, the resting columns and
  an open page centred at min(1200, the world's width), the band the
  window's width.
- The old layout's suites pass `?oneband=0`: `landdash` (the sideways side
  column) and `deskwide` (the computer's side column and keys strip), and the
  sideways parts of the scenarios whose subject is the side column (B4's PR
  lists them).
- `BT_QA_QUERY=oneband=0 node tools/qa/mp/run.mjs <name>` runs any scenario
  on the old layout.
- Pictures (v2.3.4152): `docs/shots/oneband-default-computer.webp` (1280 x
  720, the bag's page open: the Gear button's until Lane A's Gear tab),
  `docs/shots/oneband-sideways-folded.webp` (844 x 390, playing, a fight's
  controls up) and `docs/shots/oneband-sideways-open.webp` (844 x 390, the
  bag's page open, the controls away). B4's first sideways picture
  (`oneband-default-sideways.webp`) is gone with what it showed.

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
- Sideways (v2.3.4152): Diego's drawer, opened, covers the world above the
  unfolded band (226 of its 260 px; it sells from the bag, which needs the
  band open). A shorter drawer sideways (a smaller shelf row, the deal beside
  it) is the next step if the owner wants it. The special-attack charge
  gauge (SpecialChargePie, shown only while mana refills after a special)
  still hangs from the disc's old numbers and can sit over the minimap's
  lower edge for those seconds; it is not touchable.
- Sideways, the pages inside an open band still scroll inside an 82 px body
  (Character, Quests, Life Skills, Codex, More): the owner's Gear and Bro
  redesign is where their sideways density gets decided.
- Dropping the old layout, if the owner never goes back to it: the side
  column, the dock and the keys strip
  (`landDockFootprint`, `landscapeSheetW`, DashColumns `stacked` / `desk`,
  HeroExpanded `landPane` / `deskCol`, game.css's `data-orient="landscape"`
  and `bt-desk-wide` column blocks); the owner's call, since `?oneband=0` is
  how the old layout stays reachable.
