# Eyewear (v2.3.2361; art from v2.3.2362)

**Shipped:** 3D Glasses, Goggles (see-through), Laser Glasses, Thug Life,
White Glass, Golden Monocle (one lens), Golden Glasses, Eye Patch (all five
facings).

**v2.3.2379 — seven of the eight were redrawn and re-imported.** The owner sent
new mannequin sheets: *"I added the upgraded eyewear here."* Every pair except
the Goggles is now the second drawing of itself. Goggles was NOT re-imported:
the owner said *"You can just remove goggles for now. Those didn't turn out
well"* and then corrected themselves — *"Actually keep the goggles those are
fine"* — so it keeps its v2.3.2363 art and its `alpha: 0.5`, byte for byte.

What the round bought, measured by the importer's own eye check (the whole eye,
black top edge to pupil):

| pair | south | southwest | east | note |
|---|---|---|---|---|
| 3D Glasses | 100 / 100 | 100 / 100 | 100 | |
| Laser Glasses | 100 / 100 | 100 / 100 | 100 | |
| Thug Life | 100 / 100 | 100 / 100 | 100 | east seat hit the 8px limit |
| White Glass | 100 / 100 | 100 / 100 | 100 | |
| Golden Glasses | 100 / 100 | 100 / 100 | 100 | |
| Golden Monocle | 100 / 0 | 100 / 0 | 100 | **gained northeast** |
| Eye Patch | 100 / 38 | 100 / 63 | 100 | the second figure is the strap |

**This table is an IDLE-BODY measurement, and it should not be read as more.**
The importer's check runs against the `stand` frames, which is where placement
is authored; the pose passes (`--fit-pose jog|mine|fish|hit|pickup`) then carry
each facing onto bodies whose heads are drawn at a different size, and they get
close rather than exact. Measured on the jog southwest body, Thug Life still
leaves ~12% of each eye showing under its lens — better than the ~33% the
previous art left there, but not the zero the table above reports for standing.
An adversarial audit of this round raised that as a contradiction of the "100%
on every facing" claim; it is not a regression (the number improved), but the
claim needed the qualifier, so here it is.

The Golden Monocle is the structural change: it shipped with three facings
because the first sheet drew nothing on northeast, and the redrawn one draws
the ring's chain hanging behind the ear. It has four now. Nothing needed a code
change for that — the renderer reads `meta.anchors`, so a facing appearing is
data, exactly as a facing disappearing is (`--omit`).

The old art's failure was not placement, it was drawing: at 128px the first
round's lenses were flat filled rectangles, so Thug Life and White Glass read
as dark and light smudges and the Eye Patch's strap read as a second pair of
sunglasses. The redrawn sheets carry frames, a bridge, temple arms and a shine
streak, and leave the character's own eyes visible beside the piece instead of
painting fake ones over them — which is why none of the seven needed
`--flatten-lens` this time and the first round needed it twice.

Owner: *"I want to start adding eyewear options to my Hemi bros (see the first
image of the 3d glasses). I previously had this mannequin view ... Is this
still the best way to create new eyewear features?"*

Yes. The mannequin sheet is still the reference grid, and this change makes the
rest of the hat pipeline serve eyewear too. The slot shipped first with no art
in it (v2.3.2361) — catalog, renderer layer, creator tab, wire key, stored-look
key, tool flags — and the **3D Glasses** are the first pair through it
(v2.3.2362). Adding the next pair is one import command and one catalog line.

---

## 1. What eyewear is, mechanically

**It is the beard.** A pair of glasses is a crown-anchored trait like a hat,
hair or a beard: five still images (one per base direction) plus a
`meta.json`, placed by the shared `_placeTrait` in `entityRenderer.js`. The
beard is dropped from the crown to the chin by a positive `crownNudge` Y in
its meta; glasses are dropped to the eye line the same way. The importer
measures that drop off the head the glasses were drawn on, so there is no
by-eye tuning round.

**Placed by the head, not the shoulders.** This is the one place eyewear
differs from a hat inside the importer, and it was measured before it was
written. A hat is registered by fitting the figure's shoulders with one
uniform scale, because a hat may cover the whole head. Generators return
sheets resized non-uniformly (a real cape sheet came back 0.66 across by 0.75
down), so that scale carries an aspect error that grows from the shoulders up
to the eye line: on the test sheet the lenses landed 5 to 6 px above where
they were drawn, on every facing, which reads as glasses on the forehead. A
hat has that taken out by the seat pass, which measures contact with the
skull; glasses touch nothing. So for eyewear the importer maps the drawn
figure's crown and cut line onto the mannequin's, which fixes the vertical
axis by construction, keeps the shoulder fit for the horizontal axis,
starts the piece search at the drawn crown (the sheet's title once got keyed
into the tallest cell as part of the "glasses"), and prints each facing's
offset from the eyes the game actually paints, row and column. The reference
is the **whole eye**, its black top edge and the white-plus-pupil under it,
not the pupil: the white sits on one side of the pupil only, so the pupil is
2.5 px off the eye's centre, and a check centred on it put every lens that far
toward the pupil side (the owner saw it as "too far to the right"). After the
fix a test pair drawn over the mannequin's eyes lands within half a pixel of
them in both axes on every facing that paints eyes.

**Where it draws.** Above the hair, above a cape's hood, below the hat. Frames
sit on the face in front of a fringe and in front of a hood's edge; a brim or a
helmet's guard crosses the top of the frames (the 3D-glasses Bro wears his hat
over them). This is one decision, made once, in the sprites' child order
(`createPlayerDisplay` and the remote display) and the portrait's draw order
(`characterPortrait.js`). No per-item flags.

**Five directions, not eight.** West, northwest and southeast are runtime
mirrors of east, northeast and south. Do not draw them. Consequence worth
knowing before choosing what to build, and the Eye Patch is the worked example
(see below): an **asymmetric** piece (a patch over
one eye, a monocle) swaps eyes when the character faces west. That is a
property of the five-direction system, not of this slot.

**And the sheet can swap it too** (owner, on the Eye Patch: *"I noticed south
and southwest switch eyes"*). The mannequin's heads have no eyes drawn on them,
so the generator has nothing to aim at and picks a side per cell: the first
Eye Patch sheet put the patch on the character's **right** eye in the south
cell and their **left** in the southwest one. Measured, south covered eye 0 at
100% and southwest covered eye 1 at 100%.

**No bounded placement fixes that**, and it is worth knowing why before
reaching for one. Moving that southwest patch onto eye 0 was an 18 px sideways
move; the piece would then have spanned 78-135 against a head spanning 92-166,
hanging 14 px of strap off the face. The seat pass is capped at 8 px for
exactly this reason — it corrects where a piece sits, it does not relocate it.
So the swap was **measured and reported, not forced**, and the fix was to
redraw the cell:

```
In the SOUTHWEST cell, put the patch on the character's other eye — the one
further from the viewer, on the same side of the face as in the SOUTH cell.
Keep the strap where it is.
```

That is what shipped (v2.3.2371): the redrawn sheet reads **south 100% / 33%
and southwest 100% / 51%**, both on eye 0, the second figure in each pair being
the strap crossing the free eye. The lesson to carry: when a piece lands on the
wrong feature, first measure whether it is *drawn* wrong or *placed* wrong. A
placement error is the tool's to fix; a drawing error is one cell to redraw,
and forcing the tool at it only breaks the placement that works.

Even so, the three mirrored facings (west, northwest, southeast) still show an
asymmetric piece on the opposite eye. Full consistency is not available for a
one-eye piece in a five-direction mirrored system; the best achievable is that
the five **drawn** facings agree, which is now the case.

**Not every direction ships.** Glasses are invisible from behind. The beard
precedent (v2.3.1530) is to omit BOTH the png and the `meta.anchors` entry for
that facing; the renderer then hides the piece there without a retry or a crash
report, and the portrait skips it. The importer's `--omit north` does exactly
that. An eye patch or an eye mask has a strap visible from behind and keeps all
five cells.

**No recolour.** A pair is the colour it was drawn. The tab has no colour row.

**It may be see-through.** `alpha` in a pair's `meta.json` (set at import with
`--alpha`) renders it at that opacity, so the character's own eyes — painted
into the body sheets, and recoloured by the Eyes tab — show through a tinted
pane. The Goggles ship at `0.5`. It is applied by the renderer rather than
baked into the art, in all three places a trait is drawn (both placement paths
and the portrait compositor), which keeps the picker thumbnail readable and
lets the level be re-tuned without re-importing.

---

## 2. The art pipeline, in order

Everything below runs from the repo root. Python tools need `pillow`, `numpy`
and `scipy`; the Node tools need nothing.

### Step 1: make the sheet

```
python3 tools/make_headwear_mannequin.py --title "EYEWEAR REFERENCE  -  draw the glasses ON each head" --out eyewear-mannequin.png
```

Make it fresh rather than reusing an old PNG. The sheet is built from the
current body art, and the importer rebuilds the same sheet to register the
cells it reads back. `--title` changes only the caption; the grid is
unchanged.

### Step 2: generate the art

One pair per sheet. Measured on the hats (v2.3.1506): ten sheets sent in one
batch came back with east fits of 0.77 to 0.88, sent one at a time they landed
at 0.95 to 0.97. Send this with the sheet:

```
Draw the [3D glasses] on each of the five heads, in the direction each cell is
labelled: front, three-quarter, side, three-quarter back, back. From the back
draw nothing (glasses are not visible from behind).
Paint the entire person, head and shoulders, flat solid green #00FF00 with no
shading. (Any flat saturated colour works — cyan reads better under gold or
yellow art. The importer finds the person's colour rather than assuming green.) Keep the magenta background and the labels. Do not resize or
re-lay-out the sheet.
Draw the glasses at the size they would be on this head, resting on the nose
with the lenses over the eyes, in the same pixel style as the head. Draw only
the glasses in colour; do not draw eyes, skin or hair.
```

**Expect the eyes to be drawn anyway.** The goggles sheet came back with the
character's eyes painted into the lens despite that last sentence, which for a
see-through pane means a fake eye sitting in front of the real one.
`--flatten-lens` repaints the piece over the eye boxes to that region's own
median tint, which removes it; section 3 says why it is targeted at the eye
boxes rather than at the colours. It has caught two shapes of the same
mistake so far: eyes drawn *inside* a tinted pane (Goggles) and eyes drawn
*over* an opaque lens (Thug Life). Both land inside the eye boxes, so both
flatten away.

For an eye patch or an eye mask, replace the "from the back draw nothing"
sentence with "from the back draw the strap around the head".

**It does not matter whether the person comes back outlined.** The first real
sheet returned the green figure with a black outline round it, which is how
pixel art is drawn and which no wording reliably prevents. The importer strips
the person's own outline (section 3), so both kinds of sheet import correctly.
An earlier version of this prompt asked for the outline to be painted green as
well; that clause is gone because it was ignored and is no longer needed.

What a good sheet looks like: the person is one flat green shape (outlined or
not), the glasses are the only coloured thing, and the five figures are roughly
the size they were sent at. The generator usually returns the sheet resized; the importer
registers each cell against the real body, so that is fine. A figure drawn
**narrow and tall** is the failure that matters. The importer reports a fit
score per direction; 0.95 and above is good, under 0.90 says regenerate that
direction.

### Step 3: import

```
python3 tools/import_headwear_green.py --art sheet.png --category eyewear --id 3d-glasses --name "3D Glasses" --omit north
```

Add `--flatten-lens` when the generator has drawn the eyes through the lens,
and `--alpha 0.5` for a pane you should see through. The Goggles used both:

```
python3 tools/import_headwear_green.py --art sheet.png --category eyewear \
  --id goggles --name "Goggles" --omit north --flatten-lens --alpha 0.5
```

Writes `public/sprites/traits/eyewear/3d-glasses/{south,southwest,east,northeast}.png`,
`thumb.png` and `meta.json`, and prints the catalog line. Read the per-facing
report: the fit score says how faithfully the figure was redrawn, the aspect
line says whether the sheet came back squashed (harmless, it is placed by the
head), and the **eyes** figures are the ones that matter. They are the piece's
centre against the centre row of the eyes the game paints, and against the
midpoint between the two eyes where both are painted, for the three facings
that paint eyes; the eye is measured whole, black top edge to pupil. A pair of
glasses drawn over the eyes reads within a pixel or two on both; a bigger number means the generator drew the piece somewhere else on
the face, and the cell should be regenerated rather than nudged. A warning
that the piece is taller than most of the head means something else was keyed
with it; `--debug DIR` shows what.

### Step 4: fit the other poses

The jog, mine, fish, hit and pickup sheets draw the head at different sizes
from the idle sheet, so each pose gets a measured `scaleByPose` and `poseNudge`:

```
for p in jog mine fish hit pickup; do python3 tools/tune_headwear.py --category eyewear --id 3d-glasses --fit-pose $p; done
```

A direction the pair does not ship is skipped. Once `poseFit` is set the
renderer uses these numbers instead of its blanket by-eye corrections.

### Step 5: even out the size per facing (report only, for eyewear)

```
node tools/fit-headwear-scale.mjs --category=eyewear
```

The pass normalises drawn width against head width, which is the right measure
for a hat and the wrong one for a pair of glasses: the front view shows two
lenses side by side and the profile shows one lens plus a temple arm, so the
two widths are not the same quantity. On the 3D glasses it asked for east +15%,
which would have inflated a lens that already reads correctly. **Run it to see
the numbers, do not pass `--write`** unless a facing is visibly wrong in the
preview from step 9.

### Step 6: halve the art, keeping the 256 original for the login portrait

```
python3 tools/downscale_traits.py --cats eyewear --stash-hi --apply
```

Trait textures are stored at 128 for phone memory (v2.3.1526); the login
portrait prefers a `hi/` 256 copy (v2.3.1579). `--stash-hi` copies each 256
frame into `hi/` before halving it.

**On a RE-import it overwrites (v2.3.2371).** It used to stash only when `hi/`
held nothing, which quietly kept the *previous* sheet's original: the world got
the new art and the login portrait — the one thing that reads `hi/` — went on
rendering the old one. Caught re-importing the Eye Patch from the redrawn
sheet, where the stale copy would have shown the patch on the wrong eye in the
portrait alone. Read the tool's last line: it now says how many originals it
replaced, and `N replacing an older original — a re-import` is the expected
line the second time you import a pair. (The old guard was protecting nothing:
a frame already at 128 is skipped by the size test before the stash is
reached, so an original can never be overwritten by its own halved copy.)

### Step 7: picker thumbnails

**v2.3.2376 — eyewear no longer takes its thumbnails from this generator.**
Owner, on the derived ones: *"the eyewear icons look pretty bad. Use these
instead"*, with a sheet of nine hand-drawn icons. All eight pairs now ship the
owner's drawings as both `thumb.png` and `thumb-sw.png`, cut from the sheet by
a tool of their own:

```
python3 tools/ui/slice_eyewear_thumbs.py          # re-cut all eight
python3 tools/ui/slice_eyewear_thumbs.py --check  # verify, write nothing
```

The sheet itself is checked in at `assets/icons-source/sheet-eyewear-icons.png`,
so a redraw is one command away and nothing has to be re-eyeballed.  `eyewear`
has also been removed from `CATS` in `tools/ui/make-southwest-thumbs.mjs` so a
routine run of THAT generator cannot recompute them from `southwest.png` and
silently overwrite the art.

Why the drawings win at 44px: a cut from the worn southwest frame is a
three-quarter view of a small object, drawn to sit on a face and lit for the
world — off-axis, unoutlined, and only a few dozen pixels of actual lens. The
owner's icons are front-facing, outlined, and fill the tile. That is a
readability difference, not a taste one.

Consequences to respect:

- Do not put `eyewear` back in `CATS`. `--check` still reports the folder as
  complete (49 present, 0 missing) because the files exist — it checks presence,
  not provenance, so it will not warn you.
- `import_headwear_green.py` DOES write `thumb.png`. Re-importing a pair
  therefore clobbers the owner's icon for that pair — run
  `slice_eyewear_thumbs.py` again in the same commit, or the picker goes back
  to a dim off-axis crop for one item and nobody notices until it ships.
  `slice_eyewear_thumbs.py --check` is what catches it.
- `none` is not one of the eight: that tile renders the shared
  `/ui/welcome/cc/cc-no-hair.webp` for every category, so the sheet's slash
  cell was deliberately not cut.

For every OTHER category the generator is still the source:

```
node tools/ui/make-southwest-thumbs.mjs
node tools/ui/make-southwest-thumbs.mjs --check
```

Run the check. Re-importing a pair means deleting its folder first, and the
importer writes `thumb.png` but not `thumb-sw.png` — which is the one the
picker shows. Two pairs shipped a commit without theirs before the check
caught it.

### Step 7b: the three hand corrections, which a re-import undoes

Three pairs carry a change that is NOT in their sheet, so the sheet and the
shipped frames disagree by exactly these operations. **A re-import silently
reverts all three** — the same shape as the thumbnail hazard above, and the
reason each one is a command rather than a memory.

**Golden Monocle — the claw is flipped on the two front facings** (v2.3.2380).
Owner: *"Can you flip the golden monocle so the claw side faces the other way?"*

```
python3 tools/ui/flip_eyewear_piece.py --id golden-monocle --facings south,southwest
python3 tools/ui/flip_eyewear_piece.py --id golden-monocle --facings south,southwest --check
```

It mirrors the pixels inside the piece's own alpha bounding box, so the box does
not move and `bboxes`, `anchors` and `crownNudge` stay valid — the ring keeps its
eye and the claw swaps sides. Both the 128 world frame and its 256 `hi/` original
are flipped, because a piece that disagrees between them is the v2.3.2371 bug
wearing a different hat.

Only south and southwest. "The other way" is not one direction: on those two the
claw hooked inward toward the nose, while on east and northeast it already hooks
back past the eye toward the ear, which is the outer side on a profile. Flipping
those as well would hang the claw off the front of the face. The rule the two
arguments encode is *the claw is on the outer side of the face*.

**Thug Life — the south facing is scaled to 0.912** (v2.3.2380). Owner: *"the
south black glasses need to be shrunk a bit"*. That number is
`fit-headwear-scale.mjs`'s own measurement for that facing (−8.8%, drawn width
against a 43px head), and it lives in `meta.scale.south`, so it survives
everything except a re-import — which rewrites `meta.json` whole.

Only south takes it, and step 5 explains why: that pass measures *width*, and the
front view is the one facing where width is the right quantity for a pair of
glasses. The same pass asks east for +15% and must not get it.

`crownNudge.south` y moves by `bboxH * (s − s') / 2`, half of what the pass
itself would write. The pass holds the piece's **bottom** edge, which is right
for a hat sitting on a skull and wrong here: it would drop the lenses off the
eye row by half the height they just lost. Holding the centre keeps them on it.

**Golden Glasses — the northeast facing is the PREVIOUS art** (v2.3.2385).

```
git show 68897ae4^:public/sprites/traits/eyewear/golden-glasses/northeast.png \
  > public/sprites/traits/eyewear/golden-glasses/northeast.png
git show 68897ae4^:public/sprites/traits/eyewear/golden-glasses/hi/northeast.png \
  > public/sprites/traits/eyewear/golden-glasses/hi/northeast.png
# and in meta.json:  bboxes.northeast = [120, 6, 17, 19],  crownNudge.northeast = [20, 20]
```

Northeast is the three-quarter-BACK view. Every other pair of glasses draws only
the temple arm at the ear there — 17–19px wide in the 256 frame, measured across
3D Glasses, Laser Glasses, White Glass and Thug Life. The redrawn Golden Glasses
sheet drew a **full face-on lens with a shine streak**, 38px wide: from behind it
reads as a gold slab floating beside the head rather than as glasses seen from
behind. The previous sheet had drawn the hook correctly, so that one cell is kept.

This is a **drawing** fault, not a placement one, which is why no importer flag
fixes it — the same distinction the Eye Patch established at v2.3.2369. The
lasting fix is a redrawn northeast cell on the source sheet; until then, the four
lines above go with any re-import of this pair. The other three facings are the
redraw and should stay that way.

### Step 8: the catalog line

In `src/rendering/traits/eyewearCatalog.js`:

```js
{ id: '3d-glasses', name: '3D Glasses' },
```

That line is what makes the Eyewear tab appear, puts the pair on the startup
preload, and lets RANDOMIZE roll it.

### Step 9: look at it

First on paper:

```
python3 tools/preview_headwear.py --category eyewear --ids 3d-glasses --out preview.png
```

composites the pair onto the real idle and jog bodies by the renderer's own
arithmetic, all five facings, so a bad import is visible before anything is
built. Then in the game: open the creator (a fresh browser profile, or the QA
hook `window.__btSetEyewear('3d-glasses')` in the console), rotate through
all eight facings, then check the jog, the sword swing, the bow shot and
chopping. The pair must stay on the face through every one of them. Two
pixels off reads as "on the forehead" at this size, which is why the eye-line
figure in the import report matters more for eyewear than a fit score does
for a hat.

---

## 3. Six things a sheet can do (v2.3.2362-2371)

### The person's own outline

The keying rule is "the piece is everything that is neither the magenta
backdrop nor the green person". A black outline round the person is neither,
so on the first real sheet the whole head-and-shoulders outline came through as
part of the glasses: the piece measured 97-101% of the figure's height and its
centre sat 14-26 px below the eyes. The import checks printed both numbers,
which is the only reason it did not ship.

An outline is separated from a piece by two facts, and it takes both:

- **It is thin.** One art pixel, where a lens or a brim is a blob. So the piece
  is seeded on local thickness and grown back a bounded distance to recover its
  own thin parts (the nose bridge, a temple arm). Bounded, because the outline
  *touches* the glasses where they cross the silhouette, and an unbounded flood
  would walk straight out of the piece and around the whole head.
- **It hugs the silhouette.** The person's outline is the black *between* the
  green and the backdrop; the piece's own outline is between the piece and the
  green. So near-black close to both keys is dropped, which also clears the
  stubs the bounded regrowth leaves where the two meet.

Both run only when an outline is actually there, measured as the share of the
green silhouette's perimeter that near-black ink traces. A sheet whose person
really is flat green takes exactly the path it always did, which is what keeps
this from re-cutting the 39 hats and 8 hairstyles already imported.

The case this trims is a piece drawn *entirely* in near-black at the very edge
of the silhouette: its blobs survive on thickness, its outermost edge does not.
No such piece has come through yet, and the numbers will say so if one does.

### A scrap of the face the outline strip missed

The strip above clears the outline it can identify; what survives is dropped by
a speck rule, "under 3% of the biggest part goes". The redrawn Eye Patch sheet
found the hole in that: **32 px of the drawn chin** came through on southwest —
7.5% of the patch, so many times over the threshold, and sitting 24 rows below
a patch it touches nowhere. It made the piece 49 px tall against a 71 px head,
which the height warning duly shouted about.

Size cannot separate that from a real part of a piece. Position can, for a
**face-worn** piece specifically: eyewear is one thing worn on the eyes, so a
fragment that touches it nowhere and lies wholly *below* it is the face the
generator drew — a chin, a jaw, a mouth — and not the eyewear. That rule now
runs after the strip, and the import report names what it dropped:

```
389px dropped below the piece: a loose scrap of the drawn face
(a chin or a jaw the outline strip missed), not eyewear
```

Two deliberate limits, both worth keeping if you touch this. It is gated on the
eyewear category, because a **hat** may legitimately carry a detached part
below its brim — a chinstrap — and a hat is fitted with the whole figure in
reach. And it wants a clear gap below the piece rather than mere non-overlap,
because a dangling element hangs just under the thing it dangles from: the
Golden Monocle's chain is joined to its ring and so is one part, but a sheet
that draws the links detached should keep them. It prints what it drops for
exactly that case — if it ever eats something real, the report is where you
catch it, not the game.

### The piece is drawn low, and the southwest cell most of all

Measured on the first four sheets, as a fraction of the crown-to-shoulder span,
the generator draws the piece **below** the eye row the game paints — and it is
worst on southwest every single time:

| sheet | south | southwest | east |
|---|---|---|---|
| 3D Glasses | +0.1% | +2.6% | −1.8% |
| Goggles | +1.5% | +2.5% | −1.3% |
| Laser Glasses | −0.1% | +2.5% | −1.8% |
| Thug Life | +2.4% | **+6.1%** | +0.2% |

That is a bias of the generator, not a bad sheet. The first three absorbed it
because their lenses are deep (19-22 px in the 256 frame); the Thug Life lenses
are 13, and the same offset dropped their eye coverage to 25%.

`seat_eyes()` moves each facing onto the eyes, bounded to 8 px and reported. It
maximises the **worst** eye's coverage rather than the total, so a pair cannot
buy one eye by abandoning the other, and ties go to the smallest move — a pair
already on the eyes is left exactly where it is. It runs automatically.

**A one-lens piece is judged on the eye it covers.** A monocle or an eye patch
must leave the other eye bare, and the worst-eye rule does exactly the wrong
thing with that: the Golden Monocle's south cell was drawn at a perfect
0% / 100% and got dragged 8 px to a compromise 40% / 83%. So the objective is
chosen from what the piece was *drawn* covering — if one eye is under half the
other, the **best** eye is maximised instead, and ties still keep it on the eye
the generator chose.

That question is asked **once per item, on south**, not per facing. Whether a
piece has one lens is a fact about the object, and the per-facing reading is
not reliable enough to keep re-asking: the first Eye Patch sheet read
100% / 22% on south, which is unmistakable, and 56% / 78% on southwest, where
the strap crosses the free eye — so southwest alone would have called it a pair
and balanced the patch between both eyes. South is the facing that shows both
eyes squarely.

The redrawn sheet (v2.3.2371) makes the same point twice over: it reads
100% / 33% on south and **100% / 51%** on southwest. That 51% is a hair over
half, so southwest *still* reads as a pair on its own — a different sheet, a
different strap angle, the same wrong answer. Settling it on south is what
makes both sheets import correctly.

**Per facing**, which is a real difference from the hat seat pass
(`tools/seat_headwear.py`) and worth understanding. That one insists on one
correction for the whole hat, because seating each direction separately would
make the hat jump as you turn: a hat's reference is contact with the skull, a
proxy that genuinely varies with perspective, so a per-direction fix would
encode perspective as error. The reference here is the eyes — an exact landmark
the game paints on each facing — so aligning every facing to its own eyes is
the definition of consistent.

### A person who is not green

The mannequin paints the person `#00FF00` and the prompt asks for it back, but
green is a poor backdrop for gold or yellow art — which is why the Golden
Monocle sheet came back with the person in **cyan**. The keying rule tested for
greenness specifically (`g - max(r, b) > 120`), which cyan fails outright, so
the whole body would have keyed as the piece.

The importer now *finds* the person: the modal non-backdrop colour, quantised
to 8 levels per channel because resampling leaves no two interior pixels equal.
The person is the largest flat thing on a sheet by a wide margin — 13% of that
one, against 0.2% for the outline — so the mode is the person. It is a
fallback, tried only when the green test plainly misses (under 2% of the
panel), so every sheet imported before takes exactly the path it always did.

Two downstream guards had the same assumption baked in and were fixed with it:
the speckle guard on the finished frame and the last-ditch "nothing that ships
should still BE the key colour" test. Both now measure distance to whatever the
person's colour actually is.

### A lens drawn as a transparency checkerboard

The White Glass sheet came back with its lenses drawn as **literal white-and-
grey squares** — a transparency checkerboard, in an RGB file with no alpha
channel. That is an image editor drawing "nothing here", and shipping it would
be shipping a screenshot of the editor. So a sheet like this has to be read as
one of two intents:

- **A solid lens** — `--flatten-lens`, which repaints the checkerboard to its
  own median. This is what White Glass ships as, and it reads cleanly.
- **A clear lens** — `--clear-lens`, which erases the lens and leaves the
  frame. It exists, and nothing ships with it, because the hole is cut to the
  **eye box** rather than to the lens outline, so the frame comes out
  fragmented. Doing it properly means detecting the drawn lens shape, which is
  worth building the day a pair actually wants clear lenses.

### The eyes, painted into the lens

The goggles sheet came back with the character's eyes drawn *through* the
tinted pane — two pale blocks inside the lens — which the prompt's "do not draw
eyes" did not prevent. On an opaque lens that would merely be extra detail; on
a pane rendered at `alpha 0.5` it is a painted-on eye sitting in front of the
real one.

`--flatten-lens` repaints the piece where it covers the eyes to one flat tint.
**It is a judgement per sheet, never automatic.** The region it works on is
defined by where the *eyes* are, which spans lens and frame both — so when
those are different colours the median can come out as the frame. On the
Golden Glasses it flattened tan lenses to gold and turned the pair into a solid
bar, and the faint band it would have removed is one pixel at game size. Render
both and look before using it.

It is targeted at the **eye boxes**, not at the colours, and that is the whole
design decision: once the generator has resampled the sheet, the pale blocks
are neither a separable colour cluster nor an enclosed island. Measured on this
sheet, one 50×22 piece held **132 colour clusters**, and a 2-means split
separated antialiasing from everything else rather than pane from rim. What is
known exactly is where the game paints the eyes, and the piece covers them by
construction — the coverage check says 100%. So the region to flatten is the
eye boxes, padded, and the tint is that region's own median, because the
drawn-on eye is a minority of it. Near-black is left alone, so the piece's own
outline survives — unless the lens is itself that dark. The Thug Life
sunglasses are near-black by the same test that finds an outline, so protecting
near-black left only the drawn-on eye whites in the region and their median came
out **white**: the flatten repainted white with white and reported success. The
protection is now decided by what the region actually holds, so a predominantly
near-black lens is flattened whole.

---

## 4. What is wired where

| surface | file | what |
|---|---|---|
| catalog + store | `src/rendering/traits/eyewearCatalog.js` | ids, `get/set/onChange`, `bt-eyewear` storage, `eyewearHasOptions()` |
| world renderer | `src/rendering/systems/entityRenderer.js` | `_eyewearSprite` in both displays, `_placeEyewear`, hide sites, weapon lift, `preloadTraits` |
| attack stand-ins | `entityRenderer.js` + `effectsRenderer.js` | `sprites.eyewear` in every stand-in trait set, local and remote |
| portrait | `src/rendering/characterPortrait.js` | drawn after hair, before hat; `prewarmPortraitDirs`; `portraitOptsFromPeer` |
| creator | `src/ui/panels/NameModal.jsx`, `BroTown.jsx`, `characterCreatorEffects.js` | gated Eyewear tab with an inline glyph, state, randomize, reset, resume snapshot |
| other portraits | `CharacterView.jsx`, `BottomDashboard.jsx`, `friendPortraits.js`, `LoginScreen.jsx` | read + subscribe |
| wire | `wsClient.js` (join), `BroTown.jsx` (track), `peerCosmetics.js` | key `ew` |
| stored look | `characterRecord.js`, `server/src/join.js`, `server/src/index.js` | `ew` on both gates and in the character record |
| thumbnails | `traitThumbs.js` | v2.3.2376: the owner's hand-drawn icons, checked in — `make-southwest-thumbs.mjs` deliberately does NOT list the category |
| tools | `import_headwear_green.py`, `tune_headwear.py`, `seat_headwear.py`, `fit-headwear-scale.mjs`, `downscale_traits.py`, `make_headwear_mannequin.py`, `preview_headwear.py` | `--category eyewear`, `--omit`, `--title`, `--stash-hi`, head-relative placement + the eye-line check |
| QA probe | `src/rendering/pixiRenderer.js` | `bodyFigureProbe` reports `eyewearPx` and `eyewearScaleRatio` beside the hat and beard |

Deploy order is safe both ways. An old worker drops `ew` at its join gate, so
peers see no glasses until the worker carries the key; a new worker relaying
`ew` to an old client is ignored there. Nothing new is sent that an old worker
would rebroadcast as an unknown type.

---

## 5. The one thing this does not solve

**Looks are permanent.** Since v2.3.1814 a character's look is stored on the
worker against its identity and the stored record wins over the join payload;
the creator is skipped when a record exists, and there is no restyle path. So
eyewear is pickable by **newly created** characters. An existing character
would need a restyle feature (a barber, a mirror, a wardrobe) to add a pair,
and that is a separate system with its own decisions (free or paid, which
traits, whether the record is rewritten or versioned). Not built here.

---

## 6. The NFT eyewear, for a catalog

From the Hemi Bros catalogue spreadsheet, how many Bros wear each:

| trait | Bros |
|---|---|
| Thug Life Glass | 225 |
| Nerd | 187 |
| Eye Patch | 174 |
| Flattened | 135 |
| Dbz Glass | 121 |
| Eye Mask | 102 |
| White Glass | 94 |
| 3D Glass | 73 |
| Golden Glasses | 71 |
| Laser Glass | 65 |
| Gojo Satoru | 60 |
| Golden Monocle | 48 |
| Vision Pro | 45 |

Eight are in: Thug Life, Eye Patch, White Glass, 3D Glasses, Golden Glasses,
Laser Glasses, Golden Monocle and Goggles. Eye Patch and Golden Monocle are the
asymmetric ones (see section 1). Six of the catalogue remain: Nerd, Flattened,
Dbz Glass, Eye Mask, Gojo Satoru and Vision Pro.

---

## 7. The painted tab icon — DONE (v2.3.2389)

This section used to be a recipe: generate `cc-tab-eyewear.png` with the
UI-BIBLE icon prompt, then swap the tab's `img: null, glyph: 'eyewear'` for
`img: _TAB_ICON('eyewear')`. The owner supplied the art instead — *"Use this
for the eyewear thumbnail for the trait picker category"* — so the swap is
made and the inline glyph branch is deleted from `NameModal.jsx`. Build is
the only tab still drawing its own glyph.

The source is a 1254×1254 transparent PNG of gold-and-cream frames with pale
blue lenses. It was trimmed to its content bounding box (1168×553, taken at
alpha > 8 — there is a haze of near-zero alpha across most of the canvas that
makes a plain `getbbox()` return almost the whole image), the haze zeroed so
it could not smear into the resample, then LANCZOS'd to **176×83** — the same
width as `cc-tab-hat.png`, the widest of the eight siblings.

**Not quantized, deliberately.** Palette-reducing it to 16–32 colours takes
the file from 20.6 KB to ~5.5 KB, which is tempting for a 30×30 icon, but
both levels drop the black keyline around the frame and the icon loses the
edge that separates it from the tab. The siblings are hand-drawn pixel art
with hard edges and ~150 colours; this is a soft render with ~5 000, and the
honest trade at this display size is to keep the art and pay the 20 KB.

Its aspect ratio (2.1:1) is wider than any sibling, so `object-fit:contain` in
the 30×30 slot paints it 30×14 where the eye icon gets 30×21. It reads as
glasses at that size — checked against the siblings on the tab's own dark
ground — but it does carry less visual weight than its neighbours. If that
ever reads as wrong, the fix is to crop the swept-up temple arms rather than
to scale the art past its slot.


---

## 8. The Thug Life south frame stops bowing upward (v2.3.2390)

Owner: *"The current south idle black glasses view (I think thug life glasses)
doesn't look correct the lenses look bent upward."*

### The lenses were not bent

Measured off `hi/south.png`, both lens rectangles run dead level — top at bbox
row 9, bottom at row 22, across both — and they still do. Nothing in the art
tilts.

What bowed was the **silhouette**. The two temple arms sat as short fat wedges
**fused to the frame's outer top corners**, nine rows tall against a fourteen-row
lens. A stubby triangle welded to the corner of a lens is not read as an arm
going back over the ear; it is read as *that corner lifting*. Two raised corners
over a level bridge is an upward bow, which is exactly what was reported.

### Why the wedges were there

The owner's sheet (`assets/icons-source/eyewear-sheets/thug-life.png`) draws the
arms as long thin diagonal strokes — about 2% of the piece's width at the tip,
opening to 12% at the hinge, over **53 rows**. The v2.3.2379 import kept that
taper but compressed it into **nine**. Same shape, two and a half times too
short for its width, which turns a sweep into a wedge.

Two independent references say nine rows is wrong:

* **Every other pair in the catalogue** draws this hinge as a 2-row stub above
  the frame — golden-glasses and goggles and 3d-glasses at rows 0–1,
  white-glass at 0–2.
* **Thug Life's own southwest facing**, which was never complained about,
  tapers from 2px.

### The change

256-space rows 6–14 of `hi/south.png` are cleared; `south.png` is regenerated
from it (a 2×2 box average — the regeneration reproduces the committed file
byte-for-byte, which is how we know the downscale matches the pipeline). The
frame keeps its own end-caps, so the temple is still there; only the raised
wing is gone.

**`anchors` and `crownNudge` are deliberately untouched** even though the art's
bbox top moved from 6 to 15. The anchor is a coordinate, not a measurement, so
holding it renders every remaining pixel in exactly the place the owner already
approved in v2.3.2380 — no re-seating, no compensating nudge to get wrong. That
is proven rather than assumed: a pixel diff of `preview_headwear.py` before and
after changes only rows 99–113 of the south cell and nothing else in the sheet.

`bboxes.south` **is** updated, to `[99, 15, 58, 17]`, because that one is a
measurement. Nothing reads it for this item — `hatHairFit` consults it only for
`floatsAboveHair` pieces, which this is not — so it stays honest for tooling
without moving anything.

`scale.south` stays at 0.912: that number came from a **width** fit, and the
width is unchanged, the arms having lived inside the lens block's own column
range.

`TRAIT_VER` moves 2.3.2386 → 2.3.2390 in all six copies. This is the second time
it has ever had to move, and for the same reason as the first: art *and*
`meta.json` changed under paths already on main, so a returning player would
otherwise keep the frame the owner asked us to fix.

### The pin

`tools/qa/mp/mp-ccshades.mjs`, 11 assertions. It measures a **top-edge profile**
across the frame rather than looking for a tilt — a test that asked "are the two
lenses level with each other" would have been green throughout the entire
defect.

It isolates the glasses by capturing the same character with and without the
eyewear and subtracting, rather than by any colour threshold: the head outline
is near-black too, and so are hair and beards.

And it turns the figure to south first, then proves it turned, from the bare
body's own symmetry. See **§63 of `docs/TRAPS.md`** — the creator opens on
*southwest*, and the first cut of this scenario failed four assertions against
art that was already fixed.

Mutation-tested: 4 red against the pre-fix art (ends 18px and 16px above the
middle in canvas pixels), 0 red after. The whole creator suite — ccshades,
ccjoin, ccsize, ccbuttons, ccstand, ccfeet, ccload — is 115/115.

---

## 9. Two placements the owner corrected by eye (v2.3.2395)

> "In southwest view the eyeglass needs to hang off the eye more it's too far
> in the middle of the face"
>
> "Shrink the south view golden glasses a bit too"

Both are `meta.json` numbers. No art changed.

### The monocle, southwest: `crownNudge.southwest.x` −14 → −22

At −14 the lens sat almost entirely inside the face, immediately beside the
near eye — which is exactly the "middle of the face" reading. The **south**
facing is the one the owner is happy with, and it hangs roughly half the lens
past the head's left silhouette. −22 reproduces that proportion in the 3/4
view: measured in the running client, the piece now sits **40%** outside the
head's edge, against **14%** before.

−26 was also rendered and is too far: the lens leaves the eye and the piece
reads as floating beside the head rather than clamped on it.

### The golden glasses, south: `scale.south` 1 → 0.912

The same number Thug Life's south took at v2.3.2380 for the same request,
which keeps the two front views the owner has asked to shrink consistent with
each other. At 1.0 the frame reached **past the head on both sides** (piece
206–318 against a face of 207–316); at 0.912 it sits inside on both
(211–313), still spanning 94% of the face width, lenses still on the eyes.
0.88 was rendered too and is a step too far.

`crownNudge.south.y` moves by `bboxH*(1−s)/2` = `23 × 0.088 / 2` = **+1.012**,
holding the **centre**. Holding the bottom edge is right for a hat on a skull
and would lift these off the eye row (the v2.3.2380 note says the same).

`TRAIT_VER` moves 2.3.2390 → 2.3.2395. Third time it has had to move, and the
first for `meta.json` **alone** — placement rides the same cache key as the
art, so a returning player holding the old meta would wear the current art at
the old anchors.

### How this was measured, after three failures

You cannot find the face's silhouette in a picture where the eyewear is
covering it. Three static attempts failed on that, or a cousin of it:

* one re-implemented `_placeTrait`'s arithmetic by hand and got a different
  answer from the renderer — which is exactly what `preview_headwear.py`'s own
  header warns a hand-rolled preview is worth ("not a check, a second opinion
  from a different function");
* one keyed on skin colour, and since the monocle *covers* the skin at the
  face edge, it found the first skin pixel to the **right** of the piece;
* one took the head's edge from rows above and below the piece and caught the
  **skull's widest point**, above the brow, reporting a piece that visibly sat
  inside the face as sticking out of it.

`mp-ccfit` captures the character **bare**, captures him **wearing** the piece,
and subtracts. The difference is the piece exactly, with no threshold to tune,
and the bare capture still holds the face edge the piece is now hiding.

### The pin

`tools/qa/mp/mp-ccfit.mjs`, 13 assertions, mutation-tested **per change**:
reverting the monocle nudge turns its assertion red alone; reverting the
glasses scale turns the two overhang assertions red.

One number in it is load-bearing and worth stating: the monocle's "hangs off
by at least **25%** of the piece". This file shipped for one run with a 12%
floor, and the mutation check showed the rejected placement already managed
14% — so the assertion passed the very state the fix exists to leave behind.
The fix measures 40%; 25% clears both.

## 10. The monocle's SOUTH placement (v2.3.2411)

Owner: *"The south facing monocle needs to be nudged a bit to the right too"* —
"too" because §9 had just moved the **southwest** one for the same complaint.

`crownNudge.south.x` **−12 → −8**.

### How it was chosen

A rendered sweep of ten values (−16 −12 −10 −8 −6 −4 −2 0 +4 +12), injected by
fulfilling the runtime `meta.json` fetch per candidate with a modified copy — the
repo was never touched. One fresh browser context per candidate, because
`_metaCache` in `characterPortrait.js` only fetches once per page load.

Three things were **rendered rather than reasoned**, each because reasoning about
one of them has gone wrong here before:

- **The sign.** x −12 puts the lens left edge at canvas 308, x +12 puts it at
  386. Increasing x moves the lens **right**. Confirmed by picture, not by
  reading `_placeTrait` (§9 records two failed attempts to compute placement
  analytically).
- **The facing.** The creator opens on southwest (TRAPS §63), so south was
  proved every run from the *bare* body's own head-band symmetry — 0.022 at
  390×844, 0.029 at 390×664, both under the 0.06 face-on threshold. One run was
  lost before this to a subtler version of the same trap: clicking the **Eyes**
  tab swaps the stage to a zoomed head-only canvas (782→561px), which silently
  corrupts a bare-vs-worn diff. Take the bare capture on the *eyewear* tab.
- **The eye row**, off a bare render of the bald default character (no hair to
  confuse the silhouette). The covered eye spans canvas 355–374, centre 364.5.
  Cross-checked twice: mirroring the far eye about the head centre gives 363,
  and `eyeMask.json`'s stand-south iris rects are 3px in 256-space = 9.75 canvas
  px, exactly the width of the measured dark runs.

### Why −8, and why it is also the limit

At the shipped −12 the lens centre sat at 350.5 — **14 canvas px (4.3 meta px)
left of the eye**, on the temple, tangent to the head silhouette, with the eye
buried at the lens's inner edge. That is precisely the "too far" the owner saw.
At −8 the lens centre is 363.5 against an eye centre of 364.5: one canvas pixel,
0.3 meta px. Four meta px of travel is 15% of the lens width — a nudge.

**The failure going further is not the southwest one.** There, −26 was rejected
because the lens left the face and read as floating beside the head. Here the
lens is travelling *inward*, so the failure is the opposite: the rim crosses the
face and reaches the **other eye**. Far-eye clearance is +4px at −8 and −3px at
−6, where the rim visibly clips the far eye's sclera; by −4 it covers it
outright. **−8 is both the best value and the last safe one.** −7 lands the rim
at 409–410, exactly touching.

Proportions hold at 390×664 (overhang −11px vs −14px), so this is not
viewport-specific.

### The pin

`mp-ccfit.mjs`, two assertions, expressed against the **head silhouette** rather
than in canvas pixels — canvas size follows the viewport (782px at 390×844,
546px at 390×664) and a pixel threshold would pin the wrong thing. They bracket
the answer from opposite sides:

- the lens sits **inboard** of the head edge (>2% of head width in),
- its rim **stops short of the far eye** (<61% across the head).

Mutation-tested: restoring −12 puts the lens edge 1% *outside* the silhouette
and the first assertion goes red. 17/17 with the fix in place.
