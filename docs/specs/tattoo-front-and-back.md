# The tattoo editor's two sides (v2.3.2422)

Owner, after testing the ink card: *"On the tattoos the back button does not
make the large canvas rotate to the back. Also the front copies its drawings
onto the back (these should be separate). Center and bold the 'TATTOOS'
label."*

Two of those three are one object seen twice, and the object is not the switch.

## What the switch was, and what it was missing

`tattooBack` (v2.3.2148) and `tattooHeadBack` (v2.3.2043) are real, separate
canvases with their own storage keys, and the walking character has always
rendered them correctly: `artForFacing` (playerSkins) swaps the torso and head
drawings for their back counterparts whenever the facing is a back one, and
leaves the ARM alone because an arm is the same arm from behind.

v2.3.2150 added the Front/Back switch that made those canvases reachable at
all. It did one thing: **remap which canvas a touch writes to**. Its own comment
explains why it stopped there —

> The surface still frames a front-facing figure — there is no back-view art to
> paint on — so the touch REGIONS are unchanged and only the canvas each one
> writes to moves.

That premise is false. `north` is a real back-view sheet (playerSprites
`SOURCE_DIRS`), not a mirror of `south`; the little worn preview beside the
editor had been turning round to it since that same version. So the editor was
in the one state that reads as broken from either end:

- you draw on a chest and the ink goes somewhere you cannot see, and
- what you CAN see, while drawing the back, is the front's drawing.

The second half is what the owner reported as copying. Nothing was ever copied.

## Why the front's drawing was on the back

`drawCharacterPortrait` does **not** call `artForFacing`. It assembles
`_bodyArt` inline and hands it to `recolorBodyToCanvas`, so a portrait facing
north stamps whatever the caller put in `tattooArt` — and its caller contract
(characterPortrait.js:575) is:

```js
opts.tattooArt !== undefined ? sanitize(opts.tattooArt) : inkedArt('tattoo')
```

**An unset slot means "read this device's own store", not "nothing."** That is
the property every live preview in the creator is built on, and it is what
turned a missing table row into a wrong picture: `WornPreview`'s branch table
named `tattoo`, `tattooFace` and `tattooArm` and had no entry for either back
canvas, so on the back it left `tattooArt` unset, and the portrait filled it
with the front chest drawing. The big surface had the same shape of bug from the
other direction: it passed `tattooArt: A.tattoo` unconditionally.

Written up as `docs/TRAPS.md` §70.

## What changed

**`BodyInk.jsx` — the surface faces the side being inked.** The composite takes
a `dir` (`north` when the panel is on Back) and stamps the back canvases into
the torso and head slots, mirroring `artForFacing`'s own mapping. The ARM is
untouched, for the reason that function gives.

The hit-testing needed **no** change, which is worth knowing before touching
it: the grid report is keyed by body REGION (`tattoo`, `face`, `arms`,
`pants`) and says nothing about facing, so the north sheet reports `tattoo` for
the back of the torso, and `regionAt` already remapped a region hit onto the
back canvas through `BACK_TARGET`. The region masks are measured on the sheet
being baked, so they now describe the back of the torso and the back of the
head — which is where those drawings are stamped. The finger is on the pixel it
inks, which is the premise of this surface (v2.3.1965) applied to the far side.

**`PlayerPaint.jsx` — the worn preview names its drawing.** Branches for
`tattooBack` and `tattooHeadBack` (each also taking off what covers it — a
shirt, a hat — exactly as the chest and face branches do), plus a facing rule
underneath the table:

```js
if (side === 'back') {
  if (opts.tattooArt === undefined) opts.tattooArt = getArt('tattooBack');
  if (opts.faceTattooArt === undefined) opts.faceTattooArt = getArt('tattooHeadBack');
}
```

The rule is not redundant with the branches, and this is the part a later reader
is most likely to delete. The branches cover the canvas being EDITED. The rule
covers every other slot on the figure — and on the Body screen your finger moves
the canvas (v2.3.1994), so with Back selected and an ARM chosen, neither branch
fires and the torso slot falls back to the store again. Mutation-tested: pulling
the rule alone puts the chest drawing back on the back.

**`game.css` — the title.** Centred over the head cell. "Bold" could not be done
with a weight: Source Sans 3 is loaded at 400/600/700 only (`src/index.html`),
so the 800 already declared resolves to the 700 face and 900 resolves to the
same one — `font-weight:900` would have changed nothing and looked like a fix.
Size and contrast carry it instead: **13 → 15px**, and `--ui-text` in place of
`--ui-text-secondary`. Still one line in an existing cell, so it costs its own
text height and no row.

## Testing

`mp-bodyink` goes from 27 assertions to 43.

The scenario now **dresses the character** before opening the editor. That is
not decoration: each tattoo screen takes off what covers the canvas it is
pointed at, and on a bare character "take the shirt off" and "do nothing" are
the same picture — the rule was untestable, and a mutation that deleted it
survived a full run. It is also the normal case; most players are wearing
something by the time they open this.

It inks in **three colours**, so a pixel says whose drawing it is:

| colour | canvas | shows on |
|---|---|---|
| blue | chest, face | the front |
| green | `tattooBack`, `tattooHeadBack` | the back |
| pink | `tattooArm` | both — an arm is the same arm from behind |

That is what makes "the front came round" and "the back is showing" separate
readings of one frame instead of a single count that has to be interpreted. The
arm needed its own colour the moment the scenario drew on it: as green, a green
pixel on a front view meant either a bug or the arm working exactly as designed.

What it now asserts: the figure is a **different picture** after the switch (98%
of its opaque pixels; the bar is 60%, and with the composite left facing south
the same run reports 22–25% rather than 0, because the drawings still swap under
it); no front ink on a back view or its worn preview; back ink that does show on
both; the arm case; and the **back of the head** — a canvas that has existed
since v2.3.2043 and had never been read by any scenario, which is how it stayed
possible for it to be the last surface still showing you your face.

`mp-ccink` measures the title's painted inline box (a `Range` around the text
node, because the `h2` fills the cell whatever its alignment) against the
panel's centre, and its size and colour.

**Mutations: eight applied, seven caught.** The eighth is `backSide` dropping
out of the composite's dependency list, which is genuinely unobservable —
`dir` changes with it, so the effect re-runs either way. It stays as a stated
dependency because the value is read inside the effect and the coincidence is
the caller's, not a guarantee; it is listed here rather than claimed as
covered.

Two mutations were only caught after the tests were fixed, and both are in
`TRAPS` §71: a yellow stroke is shaded down into skin tones and cannot be
counted, and an aim taken before a click is stale in X (clicking the Back switch
scrolls `.bt-paint` 67px sideways).

## Not changed

- No `src/rendering/**` edits. The renderer already reported everything this
  needed; `artForFacing` and the grid report are untouched.
- No server, wire or storage change. The two back canvases and their keys are
  as they were — this is about which drawing a preview asks for.
- The Face screen's Back side still frames the head using the skin region of
  the north sheet. Hair is a trait sprite drawn over the body sheet, not baked
  into it, so the region exists whatever hairstyle is worn — the same way the
  forehead works from the front.

---

# The zone picker replaces the switch (v2.3.2472)

Owner, with a mockup of the finished screen
(`docs/triage-2026-09-14/assets/tattoo-editor-mock.png`) and a sheet of UI art
(`tools/gear/src-art/creator/tattoo-zone-ui.png`): the little character beside
the editor gets **tappable frames over the head and the torso**, a **flip
button** under him turns him round, and a **label** names the side and the zone.

Read the section above first. Everything in it still holds — this replaces the
CONTROL that chooses a canvas, and nothing about the canvases themselves.

## What this replaces, and what it deliberately does not

Two controls are retired:

- the tattoo screen's **body/face mode strip** (v2.3.1978), and
- the **Front/Back switch** (v2.3.2150), on every screen that had one.

`TATTOO_SPOT`, `TATTOO_SPOT_BACK`, `PANTS_SPOT`, `TAB_SPOTS`, BodyInk's
`BACK_TARGET` / `FRONT_OF` and every stored drawing are **exactly as they
were** — the same four tattoo canvases, the same two for the trousers and the
shirt, the same storage keys, the same wire. A zone in `PlayerPaint`'s `ZONES`
table is a POINTER at an existing spot. If adding one ever seems to need a new
canvas id, the model has been misread.

Tapping a frame sets `mode`, which is what `TATTOO_SPOT` has always read. The
flip button sets `inkBack`, which is what `side` has always resolved from. That
is the whole wiring.

| zone tapped | side | canvas inked |
|---|---|---|
| head | front | `tattooFace` |
| head | back | `tattooHeadBack` |
| torso | front | `tattoo` (and `tattooArm`, by finger — v2.3.1994) |
| torso | back | `tattooBack` (and `tattooArm`) |

## The shirt stopped being the odd one out

The shirt reached its two sides through the **mode strip** (v2.3.1939) while the
tattoo screens and the trousers used the switch — two idioms for one question,
which is what v2.3.2431 had to come back and fix once already. Every drawing
screen now resolves its side through `inkBack` alone, so the shirt's strip says
what every other garment's says: **pattern, or drawing**. `side`'s old
`mode === 'back'` fallback is gone with it.

## Where the frames come from

They are **not** measured fractions of the pane. `WornPreview` asks the
composite for its grid report (`reportGrids`, already built for the body-ink
surface at v2.3.1965) and hands each region's box up as a fraction of its own
box, through `onZones`. So a frame is correct for this look, this build and this
facing by construction — the same reason `FOCUS` had to be re-derived when build
scaling landed (v2.3.1953) is the reason nothing here is typed in.

Two numbers are stated rather than reported, and both are written down where
they are used:

- **`ZONE_APERTURE` (0.581)** — the hole in the middle of each frame, as a
  fraction of its PNG. `tools/ui/slice-zone-picker.mjs` normalises all four
  frames onto it so that the plain and the glowing art of a zone are
  interchangeable and tapping cannot make a frame jump. The tool prints its own
  copy of the number; the two must agree.
- **`ZONE_MIN_PX` (44)** — the floor a frame is grown to about its own centre.
  This is a touch target on a ~133px pane.

`ZONE_FOCUS` gives the tattoo screens a taller preview window than `FOCUS` does.
`FOCUS.tattooFace` opens at canvas y .205 and a bare head starts at .152, so it
crops the crown — invisible when the pane is a picture, wrong the moment a frame
is drawn round the head. Measured at 414x896, the top 11px of the face frame's
aperture and both its upper corners fell outside the pane.

## The art

`tools/gear/src-art/creator/tattoo-zone-ui.png` is a **contact sheet**, not a
spritesheet, and `tools/ui/slice-zone-picker.mjs` cuts it by measuring its own
transparent gutters — never on an assumed grid, which is `docs/TRAPS.md` §59.
It is worth stating why that mattered here specifically: at the threshold that
finds the artwork (alpha > 8) the two SELECTED frames' glows **touch**, and the
top row reads as three cells instead of four. Slicing on even quarters would
have cut both glowing frames wrong, silently.

Five cells are written to `public/ui/paint/`: four frames (two sizes, plain and
glowing) and the flip button. The sheet's previous/next chevrons and its "i"
button are measured and printed but not written — the picker has two zones, so
there is nothing to page through. Its two label plates are not written either:
their text is **baked into the artwork** ("Front • Chest + Arms") where the
screen needs a label that changes with the side and the zone, and the owner's
mockup draws both of those strings as plain text on the panel with no plate
around them.

## The panel had to stop moving

The caption under the picker (`TARGETS[].note`) is per-canvas, so it changes
length as you move from the chest to an arm. That was free until the picker went
in the cell above it: measured at 390x844, the picker takes `.bt-paint-side`
from 125.7px to 190.7px, which tips column 1 (side + note = 310) past the
drawing column (main = 253). From there the caption sets the panel's height —
and `.bt-modal-scrim` **centres** the panel, so switching canvas resized it by
28.6px and slid everything inside, the editor canvas included, **14.3px down the
screen**.

That is a phone bug rather than a cosmetic one: on a pointer you notice a
twitch; under a thumb your next tap lands 14px from where you aimed. It reached
the suite as two dead corner taps in `mp-skinink`, whose cached rect had gone
stale — a symptom two files from its cause.

Two lines fix it and both are about holding a height rather than choosing one:

- `.bt-paint-note` reserves its tallest self (`min-height:120px`, the chest
  caption in the narrowest column any of them get).
- `.bt-zone-label` is `white-space:nowrap` with an ellipsis, so a longer zone
  name can never wrap it to a second line. Its size is derived from
  `--paint-size`, not from the viewport, because the pane stops growing at 288px
  and the viewport does not.

The panel is not taller for any of this. The two retired strips took 76px out of
the head cell and the picker puts 65px back into the preview column, so at
390x844 the panel comes out ~18px SHORTER than before. What it does have is more
empty space beside the editor on the screens with a short caption (the trousers,
the shirt), because the preview column is now the taller of the two.

## Testing

`mp-bodyink` keeps its 46 assertions; the four structural ones move from the
strip and the switch onto the picker, asserting the same PROPERTIES because they
are what a player needs and none of them depends on the widget: there are
exactly two places to draw, they are named, the back canvases are reachable at
all, and nothing has moved for someone who never touches it. It also now asserts
that no mode strip or side switch is left over — two controls answering "which
canvas" is the hazard v2.3.2445 had to come back and fix one control over.

`mp-ccink` carries the v2.3.2414 reachability regression onto the flip button
(it is on the preview, overlapping its bottom edge, above Done and inside the
panel's own fold) and gains three checks the old full-width row did not need:
the flip button and every zone frame are at least 44px, and **picking a zone
does not move the drawing canvas** — with a guard that the caption really did
change, so that assertion cannot pass by being inert.

`mp-designs`, `mp-skinink` and `mp-shapelayer` drive the new control instead of
the old ones. `mp-inkback`, `mp-inkframes`, `mp-inkplace`, `mp-tattoos` and
`mp-facetat` are store- and wire-level and needed no change, which is the point:
the canvases did not move.

All eleven are green, plus `mp-ccsize`, `mp-inkreach` and `mp-inkoffgrid` — every
scenario that opens the editor.

**Not verified here:** a real iOS Safari touch. This sandbox has no WebKit
build, and the picker is a set of small targets over a small preview — the exact
thing that works on a desktop pointer and fails under a thumb. The 44px floors
and the no-jump assertion are what can be checked without a device.
