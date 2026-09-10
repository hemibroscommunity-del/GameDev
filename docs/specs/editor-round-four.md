# The designer's fourth round (v2.3.2423–2426)

Nine notes from the owner after testing the tattoo editor, taken in one pass.
Seven were defects, one was a sentence that lied, and one was a feature.

| # | note | what it turned out to be |
|---|---|---|
| 1 | "the zoom in and zoom out percentage doesn't change" | a fixed string that looked like a readout |
| 2 | "the select button doesn't seem to work" | it worked; the hint named a control that no longer exists |
| 3 | "letters aren't ... pasting ... not scaling/resizing" | a letter had no size, and was let go of the instant it landed |
| 4 | "the shirt canvas should be a preview of the shirt" | a comment saying it was impossible, about code that already did the work |
| 5 | "letters need to default smaller on the pants" | same missing size as #3 |
| 6 | "select something and recolor it" | the palette only ever armed the NEXT mark |
| 7 | "do front and back on the pants" | the fourth surface to need it; three already had it |
| 8 | "during shield block ... custom designs weren't there" | a second bake site that never got the drawings |

## 1. The zoom readout (v2.3.2423)

The corner control was `<span>100%</span>` — a literal. v2.3.1994 named it that
deliberately (*"'Fit' named the mechanism; '100%' names the view you get
back"*), and that reasoning is right about a **button** and wrong about what it
looks like: a number between a minus and a plus, where the other two controls
change the zoom.

It states the live zoom against the **fitted** zoom now (the view the editor
opens on, so 100% is where you started) and it is still the button that puts the
view back: it reads 332%, you tap it, it reads 100%.

`mp-skinink` selected that button by its text. The moment the label started
telling the truth the selector matched nothing, clicked nothing, and reported
that 100% had stopped working — a scenario failing because the thing it tested
got fixed. It selects by `data-zoom-pct` now and asserts the readout.

## 2. The select tool (v2.3.2423)

Measured on both surfaces before changing anything: tapping a drawn stroke with
Select picks it up, on the body and on the flat grid, and reports *"Layer 1 of 1
· brush stroke"*. Nothing was broken.

What was broken was the only sentence on screen that says the feature exists:

> Layers: pick **the hand**, tap something you drew

The tool was renamed from the hand to **Select** at v2.3.1967 and this line was
not. Someone who read it looked for a hand, found none, and concluded the
feature did not work — which is the correct conclusion from what the screen
said. It now names the button that is there and what picking something up is
for, which is a longer list than it was: recolour, resize, re-layer.

## 3 & 5. Letters have a size (v2.3.2423)

A letter op was `{k:'t', g, x, y, i, m}`. `letterCells` stamped a fixed 5×7
centred on the tap, and `resizeTo` carried a comment explaining that *"a letter
has no size, so its handle MOVES it"* — true of the data, and never true of the
ask.

- A letter carries a **box** (`a:[x0,y0,x1,y1]`), so it is adjusted with exactly
  the gesture a rectangle is: same handle, same drag, same ratio lock, same
  Place/Cancel.
- It **stays selected** when placed. That is what *"not pasting"* was: it pasted
  — 16 cells landed in the store, measured — and was released in the same frame,
  so there was no handle, no Place/Cancel and no visible sign anything had
  happened.
- On the trousers it starts **4×6** instead of 5×7. That grid is stretched over
  a narrow, tapering region, so the outer columns of a 5-wide glyph land off the
  garment and are never painted — *"cut off"*, exactly as reported, with no size
  to reduce.

**The glyph samples by coverage, not by point.** Shrinking 5×7 by
nearest-neighbour drops whole columns, and the column it drops from an `E` is
its stem. A target cell is on if *any* glyph pixel inside its footprint is on,
so a shrunken letter thickens and stays connected. Growing is unaffected — every
target cell has exactly one source pixel.

**Old drawings are untouched.** An op with no box still replays through the
centred 5×7 path, so nothing made before this version resizes itself under a
player who never asked.

## 6. Recolour what you picked up (v2.3.2423)

The palette set `ink`, the colour of the *next* mark, and nothing ever re-read a
mark already down. Every other property of a selected op could be changed — size,
position, layer — and the one you can see from across the room could not.

Tapping a colour with something held repaints it, one undo step per selection,
and still arms the next mark. `i` is the whole edit: cells are re-derived from
the op on every replay, so a colour swap is a one-field change.

## 7. The trousers get a back (v2.3.2424)

The fourth instance of one idea — the shirt has had two sides since v2.3.1939,
the face since v2.3.2042, the back of the head since v2.3.2043, the torso since
v2.3.2148 — so nothing here is a new mechanism:

- a `pantsBack` canvas with its own storage key;
- `artForFacing` swaps it in on back facings, and an undrawn back falls through
  to `emptyArt`, so a player with only a front print shows **plain** trousers
  from behind rather than the front one wrapped round;
- it joins the sheet cache key, so two different back prints cannot share a bake;
- the Front/Back switch appears on the pants **draw** screen and not the pattern
  one — a pattern tiles the whole garment and has no sides.

**On the wire, both gates, one change.** `pb` is admitted by
`JOIN_COSMETIC_KEYS`, `TRACK_COSMETIC_KEYS` and `DRAWING_KEYS` together.
v2.3.1939 put a drawing key on one gate and not the other and the print appeared
on join then vanished on the first two-second relay; v2.3.2043 and v2.3.2084
each re-learned it. Display-only at the far end, through the same sanitiser as
the other six drawings, and safe in either deploy order.

## 4. The shirt is designed on the shirt (v2.3.2426)

The shirt was the last editor working on a bare 16×16 grid. The reason was in
the code, at v2.3.2416:

> a shirt print is stamped on a different sheet with no region to hit-test
> against

True of the code and never of the sheet. `stampShirtArt` computes the exact box
it fits the grid into, per frame, and has since v2.3.1938 — it had no *report*,
which is a different thing from having no *region*. Six lines that push the box
it already has, in the record shape `stampRegion` already uses, and the surface
hit-tests a shirt with the code it already had. Written up as `TRAPS` §72.

- the report keeps the measuring pass alive for a **blank** drawing, the same
  rule the body regions needed at v2.3.1965: keyed on ink alone the first mark
  can never be made;
- the shirt layer is drawn through the identical `ctx` transform the body was,
  so `__btGridXform` maps both and there is no second matrix;
- the surface keeps the garment **on** for this region (it strips it for skin)
  and puts the catalogue's first shirt on when none is worn, or the screen is
  un-drawable for every new player;
- front and back come through one `side` value, where the shirt's mode strip and
  the tattoo screens' Front/Back switch already agree.

**The flat grid now has no target routing to it, and is kept anyway.** It is the
`else` of a two-branch ternary; it costs nothing; and the next drawable surface
that *cannot* report a region on the figure needs exactly it. Said out loud in
the code and flagged here rather than deleted quietly — if drawing on the
character is the answer everywhere, it and its paint effect are a clean removal.

## 8. A swing and a raised shield wear your drawings (v2.3.2425)

Raising a shield swaps the whole figure to the **bow** art (v2.3.1800) and a
swing swaps it to the **sword** art. Those sheets are baked by their own loader
in `effectsRenderer`, not by `getBodyFrame`, and that loader handed
`recolorBodyToCanvas` skin, pants and shoes and stopped. The ninth argument —
the drawings — was never passed.

This is the third time that site has been caught short (`TRAPS` §73): v2.3.1788
found it one argument over, v2.3.1710 found the same class on the cook. When a
per-player property is added to the body bake, grep for `recolorBodyToCanvas`,
not for `getBodyFrame` — there are two call sites and only one is the obvious
one.

With it come two things the walking body already does:

- **`artForFacing` per sheet direction**, so the north and northwest stand-ins
  take the back canvases rather than wrapping the front ones round;
- **a mirrored twin** for the three facings drawn by flipping a base sheet, or
  the design reads backwards there. Bounded on both sides: built only when there
  is a drawing to flip, and only for directions the facing map actually mirrors,
  so the default player pays nothing. Built up front, because a bake mid-fight
  is the first-use hitch the animation-preload law exists to prevent.

The loader also rebakes on `onArtChange`/`onPatternChange`, beside the three
hooks it copies. Nothing can reach that today — the designer is creator-only, so
no drawing can change while these strips are alive — and the scenario says so
rather than pretending to prove it.

## Testing

| suite | assertions | what it gained |
|---|---|---|
| `mp-ccink` | 158 → 163 | the Shirt tab in the editor loop, ending in "a touch on the shirt inks the SHIRT and not the chest under it"; the pants Front/Back switch, store separation, and the renderer's own facing decision |
| `mp-shapelayer` | 29 → 36 | moved onto the body surface with the shirt; letters land as a box, stay held, resize from the handle, recolour from the palette |
| `mp-standinart` | new, 13 | two players through the same code, one who drew a **blue** chest and a **green** back and one who drew nothing, asserted as the difference per sheet |
| `mp-skinink` | 30 → 31 | the zoom readout, by handle rather than by label |

**Ten mutations, ten caught** — after one was made catchable. Breaking
`artForFacing` so the trousers keep their front print on both sides passed every
assertion in the repo: the editor-level separation was covered and the
*renderer's* decision was not. `window.__btArtForFacing` — a read-only probe
that exists precisely because "does facing away pick the back canvas?" has no
other exact answer — gained `pants`, and the mutation now fails.

The `mp-standinart` split by facing is worth reading twice: a first version
asserted "every stand-in sheet gains blue" and the six north-facing ones failed.
That read as a broken bake and was the opposite — `artForFacing` correctly
showing a back the test player had not drawn on. Two colours and a split by
facing turned a wrong assertion into the strongest one in the file.

## Not changed

- No server logic. The only server edit is `pb` on two cosmetic allowlists.
- The trouser **pattern** stays one garment-wide property. A pattern tiles the
  whole thing; it has no front and no back.
- Nothing about how drawings are stored or sanitised.
