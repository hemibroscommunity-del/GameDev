# Eyewear (v2.3.2361)

Owner: *"I want to start adding eyewear options to my Hemi bros (see the first
image of the 3d glasses). I previously had this mannequin view ... Is this
still the best way to create new eyewear features?"*

Yes. The mannequin sheet is still the reference grid, and this change makes the
rest of the hat pipeline serve eyewear too. **This PR ships the slot with no
art in it**: the catalog, the renderer layer, the creator tab, the wire key,
the stored-look key and the tool flags all land now, so the first pair of
glasses is one import command and one catalog line. Until that line exists a
player sees nothing new. The Eyewear tab appears by itself the day the catalog
holds a real option.

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
knowing before choosing what to build: an **asymmetric** piece (a patch over
one eye, a monocle) swaps eyes when the character faces west. That is a
property of the five-direction system, not of this slot.

**Not every direction ships.** Glasses are invisible from behind. The beard
precedent (v2.3.1530) is to omit BOTH the png and the `meta.anchors` entry for
that facing; the renderer then hides the piece there without a retry or a crash
report, and the portrait skips it. The importer's `--omit north` does exactly
that. An eye patch or an eye mask has a strap visible from behind and keeps all
five cells.

**No recolour.** A pair is the colour it was drawn. The tab has no colour row.

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
Paint the entire person, head and shoulders including the black outline, flat
solid green #00FF00 with no shading. Keep the magenta background and the
labels. Do not resize or re-lay-out the sheet.
Draw the glasses at the size they would be on this head, resting on the nose
with the lenses over the eyes, in the same pixel style as the head. Draw only
the glasses in colour; do not draw eyes, skin or hair.
```

For an eye patch or an eye mask, replace the "from the back draw nothing"
sentence with "from the back draw the strap around the head".

What a good sheet looks like: the person is one flat green shape, the glasses
are the only coloured thing, and the five figures are roughly the size they
were sent at. The generator usually returns the sheet resized; the importer
registers each cell against the real body, so that is fine. A figure drawn
**narrow and tall** is the failure that matters. The importer reports a fit
score per direction; 0.95 and above is good, under 0.90 says regenerate that
direction.

### Step 3: import

```
python3 tools/import_headwear_green.py --art sheet.png --category eyewear --id 3d-glasses --name "3D Glasses" --omit north
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

### Step 5: even out the size per facing (optional, measure first)

```
node tools/fit-headwear-scale.mjs --category=eyewear
node tools/fit-headwear-scale.mjs --category=eyewear --write
```

The five idle sheets draw the head at five different widths; this brings the
facings that disagree onto the pair's own median, the same pass every hat had
in v2.3.1925. Read the report before writing.

### Step 6: halve the art, keeping the 256 original for the login portrait

```
python3 tools/downscale_traits.py --cats eyewear --stash-hi --apply
```

Trait textures are stored at 128 for phone memory (v2.3.1526); the login
portrait prefers a `hi/` 256 copy (v2.3.1579). `--stash-hi` copies each 256
frame into `hi/` before halving it.

### Step 7: picker thumbnails

```
node tools/ui/make-southwest-thumbs.mjs
```

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

## 3. What is wired where

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
| thumbnails | `traitThumbs.js`, `tools/ui/make-southwest-thumbs.mjs` | category listed |
| tools | `import_headwear_green.py`, `tune_headwear.py`, `seat_headwear.py`, `fit-headwear-scale.mjs`, `downscale_traits.py`, `make_headwear_mannequin.py`, `preview_headwear.py` | `--category eyewear`, `--omit`, `--title`, `--stash-hi`, head-relative placement + the eye-line check |
| QA probe | `src/rendering/pixiRenderer.js` | `bodyFigureProbe` reports `eyewearPx` and `eyewearScaleRatio` beside the hat and beard |

Deploy order is safe both ways. An old worker drops `ew` at its join gate, so
peers see no glasses until the worker carries the key; a new worker relaying
`ew` to an old client is ignored there. Nothing new is sent that an old worker
would rebroadcast as an unknown type.

---

## 4. The one thing this does not solve

**Looks are permanent.** Since v2.3.1814 a character's look is stored on the
worker against its identity and the stored record wins over the join payload;
the creator is skipped when a record exists, and there is no restyle path. So
eyewear is pickable by **newly created** characters. An existing character
would need a restyle feature (a barber, a mirror, a wardrobe) to add a pair,
and that is a separate system with its own decisions (free or paid, which
traits, whether the record is rewritten or versioned). Not built here.

---

## 5. The NFT eyewear, for a catalog

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

The owner's pilot is the 3D glasses. Eye Patch and Golden Monocle are the
asymmetric ones (see section 1).

---

## 6. A painted tab icon (optional)

The Eyewear tab draws an inline glyph today. To replace it with a painted icon
in the style of the other eight, generate `public/ui/welcome/cc/cc-tab-eyewear.png`
with the UI-BIBLE icon recipe and the subject "a pair of round glasses, front
view", then in `NameModal.jsx` change the tab's entry from
`img: null, glyph: 'eyewear'` to `img: _TAB_ICON('eyewear')`.
