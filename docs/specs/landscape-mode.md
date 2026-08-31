# Landscape mode (optional view) — v2.3.2156 groundwork + v2.3.2157 dashboard

> Owner: "Landscape would be an optional view. You can play in portrait or
> landscape."

Portrait remains the primary platform. Landscape is being built in three PRs;
this document is amended by each. This PR is the **groundwork**: the world-view
rule, the geometry seam, and the orientation stamp — all inert in portrait.

## What was broken

Rotating a phone gave an 844×390 viewport in which the width-driven dashboard
grew to ~261px (67% of the screen — the band's own law caps it at one third),
the canvas got a 143px strip, and the width-only world-view rule read "very
wide screen" and zoomed IN: 585×96 world px visible, about three tiles.

## The pieces in this PR

### 1. The view rule switches axes with the canvas (`src/game/worldViewport.js`)

`scale = landscape ? max(0.5, cssH/REF_VIEW_H) : max(0.5, cssW/REF_VIEW_W)`,
where landscape is the canvas's own `cssW > cssH`. One constraint active at a
time — the header's warning about dual constraints stands; the branches never
coexist. The desktop shell's canvas is aspect-locked to a portrait phone, so it
can never reach the landscape branch.

**REF_VIEW_H = 480, from area parity.** A 390×844 portrait phone sees
585×~922 ≈ 539K world px². With the landscape resting band at its final 48px:
844×390 → view 1138×480 (+1.3%), 812×375 → 1143×480 (+2.4%), 932×430 →
1130×480 (−1.1%). Same area, different shape; every landscape player sees the
same 480 world px of height. Nobody buys spotting range by rotating (the
fairness policy of v2.3.1768b and v2.3.2021, transposed).

**Interim state, deliberate:** until the landscape dashboard PR lands, the
portrait band still rides landscape, the canvas is ~143px tall, and the rule
bottoms out at MIN_SCALE 0.5 → view 1688×286. An overview rather than a
keyhole; area below portrait's, so the interim is fairness-safe too.

The server needs nothing: interest management is zone-scoped
(server/src/tick.js), so a wider view receives no extra entities.

### 2. One band footprint for both writers (`sheetGeometry.bandFootprint`)

`bandFootprint(vw, vh, folded) -> {dashH, colsH, overlap}`. BroTown's resize()
and its 500ms canvas watchdog previously each carried their own copy of the
barHeight/fold arithmetic; v2.3.2119 had to patch both when the fold shipped.
Orientation is about to be a third input, so the rule moved into one function
and both callers switched **in the same commit** — a disagreement past the
watchdog's 8% tolerance is a healing war twice a second.

`overlap` rides in the return because DASH_OVERLAP is conditional geometry: a
footprint with no bottom band earns no 14px canvas underlap.

**In this PR the landscape branch is deliberately absent** — portrait and
landscape return identical numbers, so the seam and its callers are proven by
the existing suite before any behavior changes.

### 3. The orientation stamp (`html[data-orient]`)

resize() stamps `data-orient="landscape"|"portrait"` from `playIsLandscape()`
beside the CSS vars it already owns. Future landscape CSS scopes under the
attribute, NOT media queries: a 1400×450 desktop window matches any
short-and-wide query while its aspect-locked play shell is portrait.
playViewport's two-widths law is the one source that knows the difference.

Also fixed: the `isLandscape` React seed read `innerWidth > innerHeight`
(wrong on the desktop shell for the first render); it now seeds from
`playIsLandscape()`, matching what orientationSync has fed it since v2.3.1715.

## The layout that ships next (owner's pick, after mockups)

At rest: the world gets the whole screen over a slim 48px identity strip (the
v2.3.2118 fold, made landscape's resting state). Opening a tab: the world
**shrinks sideways** and the panel takes the right side — side by side, never
an overlay ("No I don't want an overlay over the world"). Closing restores
full width. Canvas resizes on open/close as a discrete state change through
resize(), the fold's own shipped precedent; the panel slides, the canvas snaps
once; the nav strip never moves.

**The point of the side-by-side, in the owner's words: "You should be able to
play the game with the menus open. That's the idea."** The panel is a
passenger, not a pause screen. The architecture already agrees — the
dashboard's sheet has never joined `_anyPanelOpen`/`uiBusyBus` (that gate is
for the legacy full-screen panels), so the joysticks stay live under an open
destination in portrait today. Landscape PR2 must preserve exactly that:

- The side sheet must NOT join `_anyPanelOpen` — it is the dashboard sheet,
  which has never counted as "busy".
- **The world area reflows as a COMPLETE viewport, not a cropped one.** The
  owner rejected a mock where the panel visibly sat on world chrome ("No
  that's an overlay") and pointed at the real narrow-width capture as the
  target: zone header spanning the world's width only, minimap inside the
  world's top-right, banners and camera centered in the world — the whole
  in-play HUD belongs to the world's width, with the panel entirely outside
  it. This is the desktop shell's shipped mechanic (v2.3.1715/1768: narrow
  the containing block and every fixed overlay re-anchors via contain:paint,
  playVw() narrows with it) applied to landscape-open, so the ~59 overlays
  reflow without being edited one by one.
- The RIGHT control cluster and the joystick touch zones therefore ride the
  world area automatically — they are fixed-position descendants of the same
  containing block. The left cluster is untouched.
- Damage, camera, spawns, chat floaters keep running — nothing about the
  render or input loop pauses on open.

## The landscape dashboard (v2.3.2157 — this PR)

The contract above, built:

- **bandFootprint's landscape branch**: the band is the identity row alone
  (48px), unconditionally — `folded` is ignored sideways (the band cannot
  fold below what it already is), and the fold chip hides
  (`display:none!important`; its display is an inline style, like the wrap's
  width — the same !important the desktop block carries).
- **The world yields width, one discrete resize**: `bandFootprint(vw, vh,
  folded, sheetOpen)` returns `playW = vw − landscapeSheetW(vw)` when a
  destination is expanded in landscape. resize() sizes the canvas to playW
  and stamps `--play-w`/`--sheet-w`; the watchdog re-derives the same
  formula and now checks width too. dashboardPanelBus.emit() dispatches the
  same synthetic resize event dashMinBus pioneered — one geometry path.
- **The wrap narrows, everything reflows**: `html[data-orient="landscape"]
  .brotown-wrap { width:var(--play-w)!important; contain:paint }` — the
  desktop shell's v2.3.1768 mechanic one level down. Every fixed HUD overlay
  (joysticks, tracker, banners) re-anchors to the world's edges without
  per-element edits. The zone header takes `width:var(--play-w)` so the
  world reads as a complete window.
- **The side sheet**: `.bt-land-sheet`, a sibling of the band outside the
  wrap (placement beats z-index across the wrap's stacking context, TRAPS
  §20), from the screen top down to the band, `width:var(--sheet-w)`
  (`landscapeSheetW`: 400 at 844w, clamped 360..430). Hosts the same
  `<Active/>` panel the portrait sheet would. The band itself NEVER grows in
  landscape; nav keeps one screen position (v2.3.1637b), and `--sheet-h`
  reads the identity row's height in every landscape mode so the joystick
  zones stay right.
- **panelVw()** (playViewport.js): the width a dashboard panel's container
  actually has — the sheet's, in landscape; playVw() in portrait, unchanged
  by construction. InventoryPanel sizes its grid from it (a 844px playVw in
  a 400px sheet laid out ten tiles in a four-tile box — the v2.3.1715
  stretch, one level down).
- **Rotation closes an open destination** (toBar keeps the root); the
  portrait bottom sheet and the landscape side sheet share no geometry.
- The sheet never joins `_anyPanelOpen`/uiBusyBus — proven by walking with
  the Bag open.

Measured open state at 844×390: canvas 444×356, sheet x444 w400, view
599×480 world px, scale .7417 unchanged from rest.

## Testing

### Groundwork (v2.3.2156)


`tools/qa/mp/mp-landscape-view.mjs` (17 assertions): portrait pinned EXACTLY
(band px, canvas px, view width 585) at three device classes; the landscape
rule asserted as a rule (scale = max(0.5, canvasH/480)) so it holds unchanged
when the 48px band lands; visible area ≤ portrait's; the QA default viewport
(1000×780, which trips the desktop shell) still resolves to a portrait canvas.
Verified non-vacuous: 6 assertions fail against the pre-change code.

### The dashboard (v2.3.2157)

`mp-landscape-dash.mjs` (17 assertions): the rest state (48/0, canvas
844×356, ≤ one-third ceiling, fold chip gone), the open state (canvas
narrows to 844−sheetW — the world literally is not under the sheet; sheet
rect exactly in the yielded ground; band and nav pixel-identical before and
after; zone header == play width; bag grid fits with no horizontal
overflow), and the owner's whole idea: the character WALKS by real keyboard
input with the Bag expanded while `_uiBusy` stays false. Verified
non-vacuous: 12 of its assertions fail against groundwork-only code.

`mp-landscape-rotate.mjs` (9 assertions): portrait pins on boot, the flip
both ways, the open sheet closing on rotation, the BAR-height invariant
unleaked (portrait open does NOT resize the canvas), and the settled-state
war check — at most one watchdog heal across the rotation sequence (a race,
logged), zero once settled.

### The dashboard button, sideways (v2.3.2158 — owner device test)

First real-device report: "The one thing I don't understand is where my bag
went. I see the thin bar at the bottom but no inventory slots when dashboard
is active." In portrait the chart button's job is toBar() because rest IS
the dashboard — the columns row with the bag preview. Landscape has no
columns row, so the button lit and produced nothing. Sideways it now opens
the Bag sheet from rest and still rests from any open sheet (the toggle it
always was). mp-landscape-dash drives the REAL button both ways.

Browser chrome on iPhone: not a code problem this PR can solve in-browser —
Safari keeps its bar for a non-scrolling page. The app already ships
`apple-mobile-web-app-capable`, so Add to Home Screen launches it
chrome-free; that is the recommended way to play.

### The install instruction (v2.3.2159 — owner request)

Owner: "there needs to be some kind of instruction on the game itself on how
to do this" — then, in the next message, "Where is the share button?"

InstallHint (GameApp-mounted world chrome): iPhone/iPad Safari **in the
browser only** (standalone launches and Android see nothing — on Android the
instruction would be a lie until a web manifest ships). Appears 8s after the
world is in, above the band per zLayers rule 2; DRAWS the share glyph inline
(the button the player must find has no label and moves — bottom toolbar
upright, top-right sideways — and the card names both); 44pt dismiss,
remembered in localStorage. The way back is one tap away: Settings → "Play
full screen — hide the browser bar" (installHintBus), shown only to the same
audience. mp-a2hs proves the audience gate both ways with a spoofed iPhone
UA, the glyph, both locations in the copy, the 44pt dismiss, the memory, and
the Settings reopen past it.

### The narrowed sheet + standalone inset (v2.3.2163 — owner web-app test)

Owner, playing the installed web app sideways: "view kinda messy where
dashboard buttons are. They're off the dashboard top when playing as a web
app. Also landscape view needs to have dashboard area narrowed."

Two fixes, one commit:

- **The inset**: a standalone landscape launch has a real
  home-indicator inset; the identity row anchors above it, and a band that
  didn't count it was ~21px shorter than its own contents — the nav buttons
  poked out the top. JS cannot read `env()`, so resize() parks a fixed probe
  div (`#bt-sab-probe`) with `padding-bottom:env(safe-area-inset-bottom)` and
  reads it computed; `bandFootprint` adds it to the landscape band height.
  0 in a browser tab and in headless — every pinned number unchanged there.
- **The width**: the sheet stopped being a 0.474 share of the screen and
  became what its content earns, at the tile size the player already knows —
  `dashTileSize(min(vw,vh))`, the device's portrait tile by construction.

### The rotation rule (v2.3.2165 — owner correction)

Owner, with the portrait band screenshot beside it: "No it would actually be
2 slots wide and 4 slots vertical height leaving 8 slots viewable at one
time. This would make it equivalent to the portrait view of the bag. The
additional room goes to screen space of the world. … I was making a portrait
to landscape conversion of viewable game area that keeps equivalent
dashboard view space."

The dashboard's AREA is conserved and its SHAPE rotates with the screen:
portrait shows 4×2 slots in a wide band; landscape shows **2×4** in a tall
column; everything the rotation saves is world. Two sheet widths now
(`landscapeSheetW(vw, vh, kind)`):

- **`'dashboard'`** (the chart button's destination): the 2-column panel —
  390-basis tile 63 → panel 140 → sheet 158. DashColumns' stacked branch
  renders the bag `repeat(2, t)` with four whole rows plus the peek sliver,
  and the combat pills narrow to the grid's own width.
- **`'panel'`** (Bag detail, Hero, Settings, quests — "panes like character
  view … in vertical space below"): the 4-column width (292 at 390 basis) —
  those layouts need it to lay out at all.

resize() and the watchdog both pass the KIND into `bandFootprint`
(`false | 'dashboard' | 'panel'`), same inputs, same commit — the healing-war
rule. mp-landscape-dash asserts the narrow width against the pane width and
the 2-column × 4-visible-row grid geometry directly.

### One container on the right (v2.3.2166 — owner clarification)

Owner: "if you understand my vision it's to have equivalent dashboard
navigation space as the portrait mode. So actually the width of the entire
dashboard area should be enough to include the 3 combat skills at the
bottom. … Also this means the dashboard buttons (for dashboard bag view,
character view, lifeskills) should all be included in that container on
that whole right side."

The portrait band, stood upright — the sheet is the WHOLE right side now:

- **Full height**: `.bt-land-sheet` runs screen top to screen bottom; its
  content wrapper reserves `--dash-h` at the foot for the nav zone.
- **The strip narrows to the world** (`.bt-dashboard` takes the zone
  header's `width: var(--play-w)` rule), so no strip crosses under the
  container; it keeps only the identity readout.
- **The nav dock**: sideways the five buttons leave the band's flex row for
  a fixed `.bt-land-navdock` in the same bottom-right corner (one screen
  position, v2.3.1637b) — over the strip at rest, enclosed by the container
  when a sheet is open. Buttons narrow to `LAND_NAV_BTN_W` (28) so the
  five-button row fits the container, and that row is what BINDS the
  container's width (`landscapeDashColW`: nav 164 vs bag panel ~134 →
  sheet 188 at phone sizes; pane sheets keep 292).
- **The combat skills** are a row of three compact upright cards (icon over
  level over bar, `LAND_PILL_H` 44) at the container's foot — visible, not
  scrolled to.
- **The tile answers to height** (`landscapeDashTileSize`): the portrait
  tile unless four rows of it plus the combat row and the nav zone overrun
  the screen — 60 at 390-tall (portrait 63), the full 70 at 430-tall. The
  filter chips and the peek sliver are the portrait chrome that doesn't
  ride along (their height is what keeps the slots near portrait size);
  filters stay in the Bag pane.

The world keeps 656 of 844 with the dashboard open. mp-landscape-dash
asserts the full-height sheet, the strip spanning the world, the on-screen
combat row, and the dock sitting inside the container's footprint.

### The bar goes entirely (v2.3.2168 — owner)

Owner: "You can actually remove that whole bottom length bar now. Coins can
go someplace else (they don't need an entire screen length). And you'll
still need to fit the sort chips somewhere on the landscape bag view."

- **No band sideways at all**: `bandFootprint`'s landscape `dashH` is just
  the home-indicator inset (0 in a browser tab and headless), `overlap` is
  0 (a footprint with no band earns none — the v2.3.2156 note, now live),
  and the band is `display:none` under the landscape scope (a stamp flip,
  so its React tree never churns on rotation). The canvas takes the whole
  390: scale 390/480 = .8125, view 1038×480 (~498K px² — still under
  portrait's ~539K, fairness holds).
- **Gold is a chip** (`.bt-land-gold`): bottom centre of the WORLD, keyed
  to `--play-w` so it re-centres over the narrowed world when a sheet is
  open. The only gold count on a landscape screen — the v2.3.1563 one-count
  rule holds by construction. Pointer-events none; 1s self-tick.
- **The sort chips return as a vertical rail** (`BagFilterChips vertical`,
  `BAG_RAIL_W` 28): down the bag grid's left side, five chips splitting the
  grid's own height — the one placement costing no height (slots keep their
  v2.3.2166 size) and mostly dead-tray width.
- **The drill back-chip moved into the sheet's own header** (it rode the
  band's identity row); the nav dock and the sheet's bottom reserve state
  their own height (`identityRowHeight`) since `--dash-h` no longer
  carries it.

mp-landscape-dash asserts the barless rest (dash-h 0, canvas 844×390, gold
chip centred over the world at rest AND re-centred over the narrowed world
when open), the chip rail beside the slots, and the drill's back-chip
popping Settings back to its parent. mp-landscape-rotate pins the new
landscape numbers; mp-landscape-view holds unchanged (it asserts the rule,
not the interim numbers — as designed).

### The legacy bag pane retires; every label renders whole (v2.3.2173)

Owner, reviewing the seven view screenshots: the tiny-slot Bag pane "must
be a legacy view that needs to retire. It got replaced with the [dashboard
column] view" — and "you also need to actually examine all of the
screenshots of each view visually. It's obvious that the labels are
getting cut off."

- **The bag-pane tourniquet** (dashboardPanelBus `landSafe`): asking the
  bus for `'bag'` or `'inventory'` in landscape lands on `'dashboard'`.
  Nothing in src/ still opens them (v2.3.1654 made the resting dashboard
  the bag), so this guards old call sites and tests; portrait untouched.
- **Label fixes in the skinny column**, all gated on `panelVw() < 260` (or
  `landPane` where the component already holds it), portrait unchanged:
  - SkillsPanel: 1 column (2-across left one-letter names: "W Lv 0").
  - MorePanel: 2 columns (5-across left "Qu…", "Se…", "Lo…").
  - QuestsPanel + HeroExpanded tabs: `flex: 1 1 auto` — shares by
    content, so "Completed" and "Equipment" stop ellipsising (equal
    thirds starve the longest word).
- **The suite now pins what the eye caught**: for quests/skills/more,
  zero elements past the sheet's right edge AND zero truncated text
  leaves (scrollWidth > clientWidth = a clipped or ellipsised label) —
  a future panel that outgrows the column fails BY NAME. Plus: asking
  for 'bag' sideways is asserted to land on the dashboard column.

### The dashboard dodges the Dynamic Island (v2.3.2174 — owner)

Owner, sideways on a real iPhone: "How much work would it be to actually have
the whole dashboard area on the left side of the screen instead of the right?
The iPhone has a punch hole that's awkward since it goes right through the
menus."

Real, not cosmetic: `index.html` sets `viewport-fit=cover`, so the page draws
UNDER the Island, and nothing in the game read `env(safe-area-inset-left/right)`
before this. The Island lands on the LEFT or the RIGHT purely by which way the
phone was turned, so the side is **measured, not chosen** (owner's pick over a
static move):

- **One probe, three insets**: `#bt-sab-probe` (v2.3.2163, which existed to
  read the home-indicator inset because JS cannot read `env()`) now also
  carries `padding-left/right:env(safe-area-inset-left/right)`. resize() reads
  all three from one `getComputedStyle`.
- **The rule**: `side = insetLeft > insetRight ? 'right' : 'left'` — the panel
  takes the CLEAR edge. A tie (browser tab, Android, desktop, every headless
  run) resolves **left**, the side the owner asked for.
- **Stamps**: `data-dash-side` beside `data-orient`, plus `--world-x` (where
  the world begins — `sheetW` when the panel is left, else 0) and
  `--world-pad-l/r` (the Island's own insets).
- **One number moves the world**: `.brotown-wrap` takes
  `margin-left:var(--world-x)`, and `contain:paint` carries every fixed HUD
  child with it — the same v2.3.1768 mechanic that made narrowing free.
- **The four elements OUTSIDE the wrap** are told the side by hand: the sheet
  (`left:0` vs `right:0`, border and radius mirrored), the nav dock, the gold
  chip and the zone header. Three more that were pinned to the SCREEN's left
  and would have sat under a left-side panel now ride `--world-x`: the chat
  feed shell (carrying the v2.3.2155 notification bell), the quest coach card
  (which clamped itself to `window.innerWidth`), and the install hint.
- **Full-bleed world, clear controls** (owner's pick): the art still paints
  under the Island; the zone header and the keyboard-hint clusters take
  `--world-pad-l/r` so no control or text hides behind it.
- **A 180° flip is not a resize** — turning the phone end-for-end moves the
  Island without changing 844×390, so `resize` may never fire.
  `orientationchange` now re-runs resize() immediately and again after 300ms
  (iOS reports the new insets late).

**The bug this uncovered**: `isSelfTouch` and `isGestureTouch` (BroTown.jsx)
compared a raw viewport `clientX` against world coords converted to CANVAS
space — correct only while the canvas starts at screen x=0, and never correct
on the letterboxed desktop shell. Both now route through one `clientToCanvas()`
helper (the pattern `tapResourceAtClient` already used beside them). Without it
a tap on your own character would open chat ~220px away.

mp-landscape-dash pins all of it: the side rule and the world offset at rest
and open, every geometry assertion restated as a RULE so it holds on either
edge, a **simulated Island** (overriding the probe's padding — the source of
truth resize() reads) proving the whole dashboard flees to the right and comes
back, and a sweep asserting **no text-bearing world chrome intrudes into the
panel's column** — the guard that would have caught the bell and the coach
card, which a passing suite missed and only looking at the screenshot found.
