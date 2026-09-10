# The tattoo editor's door becomes you, and your tools (v2.3.2399)

**Owner, first:**

> "I'd rather make the tattoo editor simplified, just a preview of the body
> you'd be editing right there in the panel. I don't really want a button to
> launch the editor anymore. Every time somebody playtests the game they always
> never notice it"

**Owner, on the first cut of that:**

> "Instead of using space for 'tattoo your body or face' I'd rather you just
> have the tools for tattooing right there beneath the character"

The first message is a **discoverability** report, not a layout preference, and
the fix has to be judged against it: would somebody who has never been told the
feature exists touch this? The second says how the space it frees is spent —
on the tools, not on a label describing them.

## 1. Why the button was missed

Not for want of shouting. v2.3.1946 had already made it 54px of brass with a
1px brass rim, a 34px painted tattoo-gun icon and a sentence-long label, after
the owner asked for exactly that ("Make it more noticeable ... large with a
pencil icon next to it"). It was missed for **where it stood**.

Measured in a real client (Chromium, `hasTouch`, `dist/`), Skin tab:

| | 390×844 | 390×664 |
|---|---|---|
| swatch grid ends | 501.9 | 485.9 |
| `.bt-cc-colors` ghost band (`visibility:hidden`) | 100.5px | 100.5px |
| `.bt-cc-draw` | 624.4–678.4 | 590–644 |
| empty panel **below** the button | **147.6px** | 2.0px |
| **dead height around the control** | **270.1px** | 102.5px |

The ghost band above it is not empty because of anything the player did: the
Skin tab's `_typeDefs` entry carries `colors: null` unconditionally — its
swatch row **is** its option strip — so that 100.5px is reserved and blank on
every visit, forever. The button therefore sat in a gap between two things,
with more nothing under it. That is the one place an eye scanning a column
does not stop: it reads the grid, finds nothing beneath, and leaves for ENTER
BRO TOWN.

## 2. What shipped

`.bt-cc-draw` is retired. In its place, `.bt-cc-ink` — a brass-rimmed card
holding two things:

- **`.bt-cc-ink-pane`** — a `<button>` showing a live composite of *this
  player*, framed on the thing the tab edits, on the dark ground `.bt-paint-pv`
  uses inside the editor. A `+` sits on it until there is ink; the tab's
  painted icon sits in its corner.
- **`.bt-cc-ink-tools`** — **the editor's actual tools**, beneath him: the
  sixteen-colour ink palette (index 0 is the eraser, drawn as a hole exactly as
  the editor draws it) and the three brush widths. On Shoes, which are
  pattern-only, the pattern tiles instead.

**Every one of them opens the editor**, with that tool already armed. So there
is no part of the card that is only a label, and no launch button anywhere.

Three things make it read as a control rather than a thumbnail:

1. it is made of controls — a picture with a palette under it is not a
   thumbnail, whatever else it is;
2. the tools are the light plate the picker's own tappable things wear (see
   §2a), which is the shape the eye has been hitting for the last thirty
   seconds;
3. the picture is **of you**, and it changes when you change, which a
   decorative thumbnail cannot do.

### 2a. Why the tools are light and the card is still brass

On this screen gold is the **wallpaper**, not a signal: the panel rim, every
resting tab rim, the selected tab, the check coin on a chosen swatch, the name
frame and ENTER BRO TOWN are all gold. A brass band under the picture would be
the one fill here that cannot stand out. What is scarce in the picker column is
**light** — and both controls the player has already tapped by the time they
reach this card wear the same plate: the option tiles (`_apTileStyle`) and the
Default button (`.bt-cc-defcolor`). So the half of the card that is a *control*
takes that plate; the half that is *art* keeps the dark well pixel art needs.
Rendered side by side against a brass-soft bar and against a whole-card light
plate: the whole-card version turns the picture into a hole punched in a tile,
and the brass bar disappears into the gold around it.

This is **not** the light-and-airy palette returning — that lock is in-game
(`docs/LANTERN-SLATE-SPEC.md`, Scope, v2.3.2359, owner directive) and this exact
gradient already ships twice on this screen. **No new accent and no second gold
action**: the card keeps v2.3.1946's brass rim, and brass stays on the pressed
and focused states, where it means "you got it" the way it does on a swatch.

### 2b. The tools are the editor's tools, not a lookalike row

`src/ui/panels/paintTools.js` holds the ink index and the brush width. The
editor seeds its state from it and writes back on change; the card reads it and
subscribes. So picking a colour under the character arms the editor with it, and
changing it in there updates the row when you come back.

A module store rather than props because the editor is a **sibling** of the
card, not a child: it mounts and unmounts as it opens and closes, and its tool
state would go with it. Nothing is persisted — these are a session's tool
settings, not part of the character, and a colour restored across a reload would
be surprising rather than helpful.

Patterns are deliberately *not* in that store. A pattern is part of the garment,
not a tool setting: it already lives in `patternCatalog`'s own persisted store,
and the shoes card writes straight to it.

The end-to-end test for all of this is in §7 — it taps colour 5 under the
character, draws in the editor, and reads the cell back out of the drawing
store as the hex digit `5`. Two pickers that merely agree about highlighting
cannot pass that.

### Where the height comes from

| | 390×844 | 390×664 |
|---|---|---|
| gap above the card | **15px** (was 122.5) | 15px (was 100.5) |
| free panel below | ~49px (was 147.6) | ~2px |
| **dead height** | **~64px** (was 270.1) | ~17px (was 102.5) |

The card's own split between picture and tools is set by what the panel has
left. The tool block wants about 110px (three palette rows plus the widths row);
below roughly 60px of picture the body stops being a picture of anyone, so
`.bt-cc-ink-pane` carries a 60px floor and the palette drops to two rows under
`max-height:760px` rather than taking it. At 390×664 that lands about 58–60px of
body — head and chest, enough to see a chest tattoo on — against a full palette.

Two rules do it:

```css
.bt-cc-colors--yield{display:none}          /* the ghost band gives up its 100.5px */
.bt-cc-ink{flex:1 1 0;min-height:170px;max-height:290px}
```

`--yield` is set only where the colour block is a **ghost** *and* a live card
is below it — which is exactly Skin, Pants and Shoes, the three tabs whose
`colors` is `null` unconditionally. Shirt keeps its band: with a shirt on, that
block holds twelve real swatches.

`flex-basis: 0`, not `auto`, is the line that decides how the card and the
option strip share a short phone. With `auto` the card's basis is its own
footer, so on a deficit the two shrink in proportion and the **strip** pays:
measured at 390×664 on Pants, an `auto` basis took the strip from 281.4 to
253.8 and started hiding 27px of a catalogue that had been fully visible. With
basis 0 the card is sized purely by what is left after the strip has its
content. The picture takes the spare room; it does not take the catalogue's.

### Was the constant-height rule safe to break?

Yes, and it was already broken. v2.3.1938 rendered this control on all eight
tabs and ghosted five, to hold the sheet's height constant for v2.3.1252 —
whose actual purpose was that the flex **stage** must not resize the character.
The v2.3.1524 two-column split retired that in practice: the stage is a sibling
of the picker now. Measured, `.bt-cc-stage`'s `offsetHeight` is **172px at
390×844 and 120px at 390×664 on every one of the nine tabs**, while the old
button's own `y` already ranged 397.6 → 770 across them. It had not been
providing that guarantee for a long time.

So a tab with nothing to draw on now renders nothing here. **Hats gets 69px of
its catalogue back** (strip 427.1 → 496.1 at 844, 265.1 → 334.1 at 664), and
Skin's strip stops scrolling at 390×664 entirely.

> Measure `.bt-cc-stage` with `offsetHeight`, never `getBoundingClientRect()`:
> it carries `transform:translateX(7%) scale(2)` and the rect is double the
> layout box. `docs/TRAPS.md` §65.

## 3. Which tabs get a card, and why that is not one answer

`_PAINT_FROM_TAB` has **four** targets, not one — shirt, pants, skin (whose
drawing is a tattoo), and shoes — and the retired button was the only door to
all four. Measured, with a trait actually picked on each tab:

| tab | colour block with a pick | card | where its room comes from |
|---|---|---|---|
| Skin | **ghost, always** (`colors:null`) | ✅ | the ghost band + the button |
| Pants | **ghost, always** | ✅ | the ghost band + the button |
| Shoes | **ghost, always** | ✅ | the ghost band + the button |
| Shirt | 12 real swatches | ✅ *(shirt on)* | the button + the free panel below |
| Hair / Hats / Eyes / Eyewear / Beard | — | ❌ | n/a |

The ghost band is free on exactly the three tabs whose picker *is* a swatch
row. That measurement is what decides the design: Skin, Pants and Shoes reclaim
it; Shirt cannot, and does not need to — its catalogue is two tiles, so it has
174.6px of free panel at 390×664 even with its colour row live.

**Shirt with no shirt on renders no card at all.** A print with nothing to
print on is a dead control (v2.3.1938's rule, unchanged). It is *not* ghosted:
a ghosted card would reserve ~260px of invisible panel where the ghosted button
cost 62, and dead height is the bug being fixed. Picking a shirt already
reveals its twelve-swatch colour row on the same tap, so the card arriving with
it reads as one thing unlocking rather than as a jump.

**The tools differ where the tabs differ.** Skin, Shirt and Pants can be drawn
on, so they get the ink palette and the brush widths. Shoes cannot — a boot is
about eight pixels of art, which is why v2.3.1944 made that target pattern-only
— so an ink palette there would be sixteen controls that do nothing. Shoes get
the pattern tiles: `patternsFor('shoes')`, the four that still read at that
size, plus a "plain" one to take it off again.

## 4. How the picture stays the player's, and stays live

`drawCharacterPortrait`'s contract is
`opts.tattooArt !== undefined ? sanitize(opts.tattooArt) : inkedArt('tattoo')`
(`characterPortrait.js`). The card omits every drawing, so **the live store
supplies them** — no threading, and `src/rendering/**` needed no edit at all.

What that does *not* give for free is a repaint. The store write happens inside
`PlayerPaint`; React has no reason to re-render the creator for it, and the
card would go on showing the chest you had before you opened the editor. So:

```js
var offArt = onArtChange(bump);      // playerArt.js
var offPat = onPatternChange(bump);  // patternCatalog.js
```

…bumping a revision counter that is a **dependency** of the memoised look, not
a field in it. A counter rather than the drawings themselves because a tattoo
is five 256-char strings and none of them is read here; the only question is
"did any of them move".

The look is memoised on the selections for a reason: `portraitLook` returns a
fresh object every call, `NameModal` is an unmemoised component that re-renders
on every keystroke of the name field, and `WornPreview` lists `look` in its
effect deps — so an unstable identity would re-composite the whole character on
every scroll-affordance measurement. The editor now takes the same object, so
the panel and the card behind it cannot disagree about who they are showing.

### Reusing the editor's pane, and the two things it needed

`WornPreview` is exported rather than copied — a second implementation would
drift from the camera table the first time it changed. Two props were added,
both for the card, and a caller passing neither gets byte-identical v2.3.1947
behaviour:

- **`fit:'contain'`.** Every window in `FOCUS` was measured against
  `.bt-paint-pv`, which is `aspect-ratio:1/1`. The card is 170×214 at 390×844
  and 170×99 at 390×664 — never square — and `blit()` pins the window's
  *height* and derives its width from the box, which in a portrait box gives
  0.79× the intended width and **slices the arms off**. The arms are part of
  the canvas you are being invited to draw on. `contain` grows the window on
  the box's long axis so the whole designed frame stays in shot.
- **`focus`, an optional window override.** Three of the four targets survive
  the bigger box unchanged. **Shoes do not**: a boot is about eight pixels of
  art, so the editor's `{cy:.865, h:.27}` is already a tight crop at 125px and
  at card size became a 2.5× blow-up of two grey blocks with no character
  attached. The card takes a knee-to-sole window there instead. It is a
  *window*, not a zoom multiplier, so it goes through the same feet-anchored
  build correction every `FOCUS` entry does.

## 5. The empty state, and the icon

A blank body in a frame is the same failure wearing new clothes — it reads as a
picture of your chest. Until any of the target's canvases carries a single inked
cell, a **`+`** sits centred on the picture. A glyph rather than a sentence: the
first cut said "Nothing here yet", which is a *status report* — a player reads
it, agrees with it, and moves on. The `+` is an invitation, it is the mark the
editor behind this card already uses for an empty design slot, and it needs no
string that has to be true on four different tabs.

`_INK_SOURCES` is the table that answers "do you already wear anything here",
because one target can span several canvases: a tattoo spans five, a shirt two,
pants one, and shoes none at all (shoes are pattern-only, v2.3.1944, which is
why `pattern` is its own column).

The owner's painted tattoo-gun / sneaker icon (v2.3.2008 painted it; v2.3.2035
grew it 26 → 34 because the owner asked) lived in the label bar that is now the
palette. Rather than delete an asset the owner asked for twice, it is a badge in
the corner of the picture: **28px**, costing no layout height. That is smaller
than 34 and it is a judgement, not a measurement — on a 170px-wide picture 34px
reads as a sticker stuck to the character. It is still above the 26 it was asked
to grow from, which is the property `mp-ccsize` holds; if it reads too small on
a real phone, that is the number to change.

## 6. Two bugs found in the editor panel while in here

### 6a. The Front/Back switch was off the bottom of the panel

`.bt-paint-sideswitch` — the control the owner asked for **by name** ("I don't
see a menu option that toggles tattooing the back", v2.3.2150) — had **no
`grid-area` at all**. `.bt-paint` is a grid, so it auto-placed into an implicit
row after every named one. Measured: `offsetTop` **708 in a 738px content
box** — below the tool rows, below the palette, below the Done button, and
entirely below the panel's own 635px fold at 390×664. Its own comment has said
"it sits under the tabs" since the day it was written.

The tabs and the switch are now one `.bt-paint-head` cell (a wrapper rather
than a fifth grid row, because an empty declared row still costs its gaps on
the three screens that have no switch — the v2.3.1950 finding). That is a
control recovered, and it takes 36px + a gap out of the panel:

| | before | after |
|---|---|---|
| 844×390 (landscape) overflow | 24px | **0** |
| 390×664 overflow | 103px | 93px |
| switch `offsetTop` | 708 | 28 |

### 6b. `.bt-paint` now declares what it allows

It was the only scroller inside `.bt-name-modal` with no `touch-action` of its
own; `.bt-cc-strip` and `.bt-cc-colors-row` both carry `pan-y` under the policy
stated on the modal's own rule (v2.3.738: *"the rail and sheet re-allow pan-y;
everything else is taps"*).

**Be precise about what this is.** It is *not* a fix for a reproduced bug. The
tempting inference — that an ancestor's `touch-action:none` stops a finger
panning a descendant scroller — is **false**, and was measured false before the
line was written: a real touch drag takes this panel's `scrollTop` from 0 to
102 of 103 with `.bt-paint`, `.bt-name-modal`, `body` and `html` in the chain
and three of those four set to `none`. The walk for a pan stops at the scroll
container that will perform it. That is now `docs/TRAPS.md` §67, because it is
plausible-but-wrong in the confident direction and it nearly sent this change
after the wrong thing.

What the declaration is for: it writes the modal's policy down on the last box
relying on an unstated default; `pan-y` (not `auto`) lets the compositor scroll
without waiting on the pointer handlers this panel is covered in; and it costs
no gesture that is not already gone, since pinch-zoom's default action belongs
to the viewport and its walk reaches `html,body{touch-action:none}`.
`overscroll-behavior:contain` is the concrete half: without it a drag past
either end chains into `.bt-name-modal`, which is `overflow:hidden;overflow:
clip` — and on iOS 14, where `clip` is dropped, `hidden` still leaves a scroll
container that can be shoved with no finger able to drag it back (§64).

## 7. Testing

`tools/qa/mp/mp-ccink.mjs`, registered in `run.mjs` as `ccink`, at **390×844,
390×664 and 844×390** with `touch: true`. 111 assertions. The ones that carry
the change:

- the dead height on *both* sides of the card — closing one gap and opening
  another would be no fix at all;
- `.bt-cc-stage`'s **identical** `offsetHeight` across all nine tabs, which is
  the property the retired ghost row was protecting;
- the option strip did not pay for the picture (Skin's catalogue stops
  scrolling at 390×664; Hats gains 60px+);
- the card exists on exactly the tabs with a drawing, and Shirt's twelve
  colour swatches are not eaten;
- the tools are **beneath** the picture, the picture is still ≥56px of body,
  and no control is a button inside a button;
- **the inline tools are the editor's tools**: tap colour 5 under the
  character, draw in the editor that opens, and read the cell back out of the
  drawing store as the hex digit `5`. Two pickers that merely agree about
  highlighting cannot pass this;
- shoes get pattern tiles and no ink palette;
- the framing is contained, asserted as a **fraction** of the canvas — see
  below;
- the two editor-panel fixes in §6.

Four existing scenarios drove the editor through `button.bt-cc-draw`
(`mp-skinink`, `mp-bodyink`, `mp-shapelayer`) or measured it (`mp-ccsize`); all
four are updated.

**Every assertion group was mutation-tested**, and the first round found a real
hole: breaking `fit:'contain'` left all 89 assertions green, because the
framing assertion asked for "more than 3px of margin" and a height-pinned
window still leaves 3.9% of the canvas clear. It is a fraction now (≥10%
against a measured 19%/32% contained and 3.9% cropped). That is the value of
mutation-testing stated concretely: the assertion existed, read plausibly, and
tested nothing.

## 8. Known, not fixed

- **The card is not on screen when the creator opens.** `activeCat` starts at
  `'hair'` (`useState('hair')`, `BroTown.jsx`) and only four of nine tabs carry
  a card, so a playtester who visits Hair, Hats and Beard and then presses
  ENTER BRO TOWN never sees it. `BroTown.jsx` is outside this change's file
  ownership and the creator's landing tab is an owner-facing product decision,
  so it is raised rather than taken. The one-line option is
  `useState('hair')` → `useState('skin')`.
- **`.bt-cc-more`'s fade stops at `var(--ui-sheet)` (#1E2E34) while the panel
  behind it has been a navy gradient since v2.3.2358.** The v2.3.2206 comment
  argues the 3px overshoot is invisible *because* it lands on `--ui-sheet`;
  that premise no longer holds, so the band may now paint a teal-grey stripe
  onto navy — the exact seam that comment exists to prevent. Not touched here;
  it is a separate bug in a separate control.
- **`.bt-paint` caps at `96vh` inside a modal that uses `100dvh`.** On iOS
  `vh` is the URL-bar-hidden large viewport, so the cap can exceed the visible
  area. The fix is `max-height:96vh;max-height:96dvh` (vh first — `dvh` is
  Safari 15.4+ and this repo's floor is iOS 14), but the cap is currently an
  inline style and moving it is a bigger change than this PR should carry.
