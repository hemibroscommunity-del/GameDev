# Landscape mode (optional view) — v2.3.2151 groundwork + v2.3.2152 dashboard

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

## The landscape dashboard (v2.3.2152 — this PR)

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

### Groundwork (v2.3.2151)


`tools/qa/mp/mp-landscape-view.mjs` (17 assertions): portrait pinned EXACTLY
(band px, canvas px, view width 585) at three device classes; the landscape
rule asserted as a rule (scale = max(0.5, canvasH/480)) so it holds unchanged
when the 48px band lands; visible area ≤ portrait's; the QA default viewport
(1000×780, which trips the desktop shell) still resolves to a portrait canvas.
Verified non-vacuous: 6 assertions fail against the pre-change code.

### The dashboard (v2.3.2152)

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

### The dashboard button, sideways (v2.3.2153 — owner device test)

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

### The install instruction (v2.3.2154 — owner request)

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
