# Playable species — what it costs, what shipped (v2.3.2643)

Owner ask: *"What's the feasibility of adding new species to play as? I'm
wanting to add alien and monkey"*, with a reference sprite for each.

This is the costed answer, written against the code rather than against the
GDD (which is stale — see CLAUDE.md). **Stage 1 has shipped**; stages 2 and 3
are scoped here so the next session does not re-derive any of it.

## What makes the COLOUR cheap (and only the colour)

Both reference sprites are the **same body**: identical pose, identical olive
trousers, identical grey boots, identical proportions, identical outline. The
only differences are:

| | alien | monkey |
|---|---|---|
| skin | cyan, measured lit (207,250,250) | dark warm fur, measured lit (85,56,23) |
| face | thin mouth, black almond eyes | lighter muzzle (measured #91765e, lum 123) |
| ears | pointed, outside the head silhouette | round, outside the head silhouette |
| body | unchanged | unchanged |

The renderer is built around the first two of those: skin is a recolourable
region and the face is an addressable one. So a new body rig — the genuinely
expensive thing — is not what these references need.

The third, head-attached sprites, is where the first draft of this document was
wrong: it assumed a trait-category registry that turned out to have no
consumers. The ears are the real work. See Stage 2.

## Stage 1 — SHIPPED in v2.3.2642

Two `SKIN_CATALOG` rows in `src/rendering/playerSkins.js`, measured off the
owner's own reference art, plus a `species: true` flag that keeps them out of
the creator's dice roll (`SKIN_ROLL_CATALOG`, read by `randomizeAppearance` in
`BroTown.jsx`). No new art, no wire change, no server change.

They are named for a **colour**, not a species, deliberately: a saved
appearance stores the catalog id, so these ids are permanent, and when the
Stage 2 species axis lands it should select a tone from this catalog rather
than duplicate one.

The recolour propagates for free to all 82 body sheets including the armoured
and bow/sword variants, the head-overlay sheets, the creator portrait, the
inspect card and every remote player — it is keyed
`(skin, pants, shoes)` and nothing needed touching per-sheet.

**Verified**, not reasoned about:

- `node tools/skin_clip.mjs` — Alien Cyan clips 0.38% of skin pixels against
  Alabaster's shipping 11.81%. The raw reference value would have clipped
  13.40%, i.e. worse than anything in the list; see TRAPS §89 for why the
  measurement off the art is not the catalog target.
- `QA_WS=ws://127.0.0.1:8787 node tools/qa/qa-skin-tone.mjs` — real client,
  real worker, creator + town for each tone.
- Rendered torso pixels land at ratio 0.964-0.971 of target for both new
  tones, the same ratio the shipping `default` lands at (0.971). That equality
  is the proof the targets land where intended rather than reading
  bright or muddy.

### What Stage 1 deliberately does NOT do

At play scale the monkey reads as a **dark-skinned bro, not a monkey** — the
muzzle and the ears are what make it a monkey, and neither is a colour. The
alien is closer to its reference because more of what makes it alien *is* the
hide colour, but it is still a bald human silhouette. This is expected and is
the honest state of Stage 1: it proves the colour half and the pipeline, and it
is the cheap half.

## Stage 2 — the face and the ears

**v2.3.2643: this section was materially wrong when first written and is
rewritten from measurement.** It claimed "the machinery mostly exists". Three
of the four things it leaned on do not work, each rejected with a measurement
rather than an opinion. The ear ANATOMY is real work, not wiring.

### The owner's second reference (v2.3.2643)

Two 32x32 head portraits, far better spec than the full-body pair. Measured:

- **Identical head silhouette** in both — the outline occupies the same cells;
  only the fill and the features differ. Core head `x 7..22` (16px wide),
  `y 8..26` (19px tall).
- **Alien** — skin lit `(201,251,252)`, shade `(156,224,224)`; outline
  `(31,13,28)`. Pointed ear: rows 15-17, protruding 2px, profile `1,2,1`.
  16% of head height, 12.5% of head width, centre 42% down from the crown.
- **Monkey** — fur `(69,46,20)`, shade `(59,40,19)`, **lighter muzzle**
  `(133,112,87)` (lum 115 against the fur's 50). Round ear: rows 15-19,
  protruding 2px, profile `1,2,2,2,1`. 26% of head height, 12.5% of head
  width, centre 47% down.
- The monkey also has a **cigar and smoke**. Read as a joke/accessory, not
  species anatomy, and deliberately out of scope — flag it if it was meant.

The two ear centres (42% / 47% down) straddle the head's own widest row (~49%),
which is what makes "attach at the widest row" the right rule: the ear then
tracks a head that bobs, instead of a fixed fraction that does not.

### Ears are ANATOMY, not an accessory

That decides the design. A hat is a sticker over the head and can be a trait
sprite; an ear is part of the body, must carry the body's own skin tone, and
must never drift from the skull. So ears follow the **eyes**: derive the
geometry offline, ship it as data, paint it in the recolour pass the bake
already runs. `eyeMask.json`'s header makes the same case for the iris — "the
eyes are not a layer" — and an ear is the same kind of thing.

### Five candidate anchors, four dead — with receipts

1. **`TRAIT_CATEGORIES` (`traitCategories.js`)** advertises precisely this: an
   `attachAt: 'head.eyes'` registry with a `widthRatio`, and a comment saying
   "Adding a new trait category? Add a row here." **It has no consumers** —
   grep the repo. Hair, hats, beards and eyewear are actually placed by
   `entityRenderer.js` and `characterPortrait.js` off `body-tops.json`. A row
   added here places nothing. *(The first version of this document cited this
   file as evidence the machinery existed. It was not checked. That was the
   error.)*
2. **`body-anchors.json`'s head box** is wrong on the moving poses: `stand-south`
   64px, `jog-south` **95px**, `hit-south` **108px** — the neck detector merged
   into the shoulders. Ears pinned to those edges float ~15px off the head.
3. **`_headBoxInFrame` (`playerDecal.js`, v2.3.2516)**, the face-tattoo walker,
   breaks out the moment the crown's first skin run is narrow: measured, a
   **1px** head for `stand-east` and `stand-north`, **6px** for `hit-south`.
   That is *fine there and not a bug* — its own header says a failed walk
   leaves the face region exactly as it was, because it can only ever add. An
   ear is not additive that way, so it cannot be the anchor.
4. **The reviewed eye row — works, but is not dense enough.** `eyeMask.json`
   holds human-reviewed iris rects for 32 sheets / 417 frames; ears sit on the
   eye line, so scanning outward from a reviewed iris to the silhouette edge
   gives the attachment point using only local information.
   `tools/ears/derive-ear-anchors.mjs` implements it and it is *correct where it
   fires*: `stand-south` measures a 51px head and `jog-south` 54px in the same
   256-space — the same head at the same size, from sheets drawn at different
   disk resolutions. None of the rejected anchors agree with themselves that
   closely.

### Stage 2a — the review harness (SHIPPED v2.3.2644)

The blocker at v2.3.2643 was coverage: the reviewed-iris rule fired on only 297
of 823 frames, with gaps *inside* cycles, so ears would have strobed as the
player ran. Two things fixed most of that, and a third stopped a real bug from
shipping.

**Interpolation, because a head does not teleport.** The sparse measured frames
became seeds and the frames between them are lerped along the strip. A run
cycle moves the head a couple of pixels per frame, so between two measured
frames a straight line is bounded on both sides by a measurement — not a search
that can be wrong. **Reviewed on `jog-east`: the interpolated ears are
indistinguishable from the measured ones across all 28 frames and stay locked
to a head that bobs ~6px.** The result is that *every sheet with any iris data
ends up 100% covered*, which is what removed the strobing.

**The walker was rejected by looking at it.** The silhouette walker had been
allowed on strips with no iris (north/northeast). The contact sheet showed it
placing the ears **on the shoulders** — its "widest row" is the deltoid line,
not the ear line. Removed rather than shipped; that is what the red tier was
for, and it cost 192 frames of fake coverage.

**The ear rule itself was wrong in profile.** Drawing both ears put one of them
**on the character's nose and mouth** on every `east` frame. Now in
`src/rendering/earSides.js`: profile facings paint the rear ear only, and
because the renderer draws `west` from the flipped `east` sheet, authoring it
once for east is automatically correct for west. Front, back and 3/4 views keep
both ears (checked on `stand-south` and `stand-southwest`).

None of those three were findable by measurement. They came from rendering the
proposal onto the real frames and looking, which is the whole argument for the
harness.

### Stage 2b — the plateau anchor, and a bug in Stage 2a (v2.3.2645)

**Stage 2a shipped a systematic error.** The ear line was taken as
`max(ry + rh/2)` over the iris rects — which is the **bottom** of the iris, not
its middle, because the mask stores an iris as a stack of 1-row rects.
`stand-south`'s rows 53..59 gave 60 instead of 56. Four pixels low put the ear
on the jaw, and the outward scan from there ran into the **shoulder**: that head
measured 51px wide where the art says 43.

**The contact sheet did not catch it.** 4px on a 96px review cell reads as
"about right", and it was accepted. What caught it was hand-reading the sheet as
ASCII in 256-space and counting columns. That is the second lesson of TRAPS §92:
a review has to be as precise as the thing being reviewed.

**The fix decoupled the two measurements**, because they need different
evidence:

- **Ear line** ← the iris *centre*, where an iris exists.
- **Head sides** ← the **width plateau** below the crown. A skull widens from
  the crown, holds near-constant through the ear line, then the shoulders add a
  second, separate widening. The longest near-constant run is the head.

Two bounds make the plateau work, both found by getting it wrong: search only
`crown..crown+32` (unbounded, the **torso** is a longer plateau and wins —
`stand-south` returned the chest at 64px), and compare each row to the run's
*first* width rather than a running median (a median drifts up as the head
widens and closes the run early).

**Receipt:** it matches a hand read of the art exactly on `stand-north`
(107..147) and within 1px on `stand-south` (106..149 vs 106..148). And because
it needs no iris, it reaches the back-facing sheets Stage 2a had to leave bare.

For frames with no iris the ear line is a calibrated drop below the crown —
`0.53 × head width`, measured across every frame that has both (0.477–0.609, a
tight band). Two guards reject a "crown" that is really a raised weapon: the
drop band itself (`sword-south`'s sword tip scores 3.77) and the gap between
crown and plateau (`sword-south` 0.58 head-widths, `stand-south` 0.23).

A third guard came from the review: the head-width ceiling. A loose 110 let
`bow-east` through with a **100px "head"** — the plateau swallowing the bow. The
measured range is 41–54, with the dodge roll at 73, so the cap is now 78.

### Stage 2c — every sheet carries its own space (v2.3.2646)

v2.3.2645 excluded the bow and sword strips because they are not 256-square.
That was right *given the file format*: the anchor file emitted a bare array per
sheet, so a consumer had to assume a coordinate space — and a file mixing
256-space with `sword-east`'s 402×246 frame places ears correctly almost
everywhere and is silently wrong on the bow, unfixably from the consumer's side.

**The fix was to stop assuming.** Each sheet now carries its own frame size:

```
{ "stand-south": { fw: 256, fh: 256, frames: [[L,R,y,tier], ...] },
  "sword-east":  { fw: 402, fh: 246, frames: [ ... 11 frames ... ] },
  "bow-south":   { fw: 130, fh: 234, frames: [ ... 3 frames ... ] } }
```

Coordinates are frame-local in that sheet's *own* native frame. A painter scales
by `fw`/`fh` and cannot mix spaces even by accident, because there is no default
left to get wrong. That is what let the strips back in.

Two scales had to be separated to make it work, and the distinction is easy to
miss: `eyeMask.json` is authored in **256-space whatever the sheet's frame is**,
so an iris row scales by `h/256`, while everything emitted scales by `h/fh`.
They are identical on a 256-square sheet and differ on exactly the strips this
stage re-admitted.

### Where the coverage actually stands

**682 of 694 frames that should have ears — 98%.**

| | state |
|---|---|
| **Placed** | `stand` `jog` `hit` `attack` `pickup` `mine` `fish` `dodge` (all directions) and the `sword` strips |
| **Short** | `bow-east`, `bow-north`, `bow-northwest`, `bow-southwest` — 12 frames. The bow is held across the face, so neither the crown nor a plateau around the iris finds the skull |

Sheets that legitimately have no ear are excluded from the count: `*-armored`
(the helmet is erased and the head comes from a `*-head` sheet), `*-weapon` (no
head), and `welcome-bro` (an orphan nothing references).

Reviewed on the contact sheet: `stand-south`, `stand-north`, `stand-east`
(profile — rear ear only), all 23 frames of `jog-north`, all 28 of `jog-east`,
`hit-south` through its recoil, and all 11 of `sword-east` — the last of which
was the frame that exposed the mixed-space bug in the first place.

### What is left after that

The painter (`_paintEars` in the recolour pass, ear profiles scaled to head
width, skin tone plus outline), then the species axis and its wiring, then a
visual pass at play scale — the ears are ~4px there, so how they *read* is a
judgement, not a measurement.

### The muzzle and the eyes

**The muzzle** (the monkey's lighter face patch) rides the face-decal path:
`FACE_BOX`, `stampRegion` and `splitSkinRegions` in `playerDecal.js`, and
`playerArt.js` already does direction-aware face decals — v2.3.2042
specifically taught it that "a face tattoo does not revolve to the back of a
head", which is the hard part and is already solved. Unlike the ears this is
*inside* the existing silhouette, so it needs no new landmark.

**The eyes** need little new: `eyeMask.json` already masks the iris across those
417 frames and `EYE_COLOR_CATALOG` recolours it. The alien's black eyes are the
art's own default; the monkey's pale eyes are close to the existing `white`
option (v2.3.1929). What a species axis adds is *presetting* them, not new
rendering.

### Stage 2d — the monkey piece and its per-frame fixes (v2.3.2647–2652)

The ears and muzzle ended up as drawn ART, not the painter above: the owner
had ChatGPT draw them on the mannequin, `tools/clean-generated-sheet.mjs` and
`tools/import_headwear_green.py --category species` imported them to
`public/sprites/traits/species/monkey/` (one 256 image per facing plus
`meta.json`, placed by `_placeTrait`'s crown anchor like any trait). Nothing
in the game loads it yet.

Everything done to the art since the import, and how to redo it:

| what | where | redo with |
|---|---|---|
| the bro's own ear painted out beside the new one (SW, NE) | the SW/NE PNGs | `node tools/species-cover-ears.mjs --id monkey` after any re-import |
| muzzle pulled back 3px jogging east/west | `meta.poseNudge.jog.east` | — |
| MEASURED pose sizes, not the legacy hat guesses | `meta.poseFit` + `meta.scaleByPose` | — |
| 196 of 231 frames fixed one by one | `tools/species-fixes/monkey.json` → `frames/*.png` + `meta.frameOverlays` | `python3 tools/species_frames.py bake --id monkey` |

**See every frame** with `python3 tools/species_contact_sheet.py --id monkey
--out <dir>` (one labelled sheet per animation; `*` marks a baked frame, drawn
from the baked strip so the sheet shows the shipped data). `--zoom
pose-dir:a-b` draws frames big with a coordinate grid, for writing fixes.

**The fixes, and why each exists:** hit-east — the head bows forward, so the
muzzle moves onto the mouth, ROTATES clockwise with the head (34-44°, measured
per frame from the eye-to-mouth line against stand-east's) and the gritted
teeth are covered; hit-south — same, the head rolls the other way, so the
muzzle turns counter-clockwise to lie along the teeth line (40-55°) (v2.3.2653:
`rot` in the fix format, rotated at 4x and brought back down by majority colour
so the outline stays one clean pixel); hit-southwest 0-1 — the bowed head's
human ear covered, 2-5 and every jog-southwest frame — ears set to stand's
overlap (far ear 1px, near ear 15px incl. its fur patch); hit-north/-northeast — the turned head shows
the human ear mid-head (covered), and on north 3-4 / northeast 3-5 body-tops is
the raised FIST (see TRAPS §94) so those frames carry a `crown` override;
pickup and jog-south — the eyes sit 2-13px lower against the crown than at
stand, so the muzzle drops per frame by the eyeMask measurement; every south,
north and northeast jog/pickup/fish/mine frame — each ear is moved so it
overlaps the head side by exactly what it does at stand (4px south/north, 3px
the NE far ear), which is what hides the human ear; fish — a crown-relative
fur patch for the right ear's last 2px; mine 0-3, 12-13 — the pickaxe is
drawn in front of the piece.

**The renderer contract, for whoever wires the species layer:**

1. Place it like eyewear (`_placeEyewear`): `_placeTrait` with the piece's
   meta. `meta.poseFit` is set, so the tune must be `null` (no
   `hairPoseTune`) — the measured `scaleByPose` already is the head ratio.
2. BEFORE the normal placement, look up
   `meta.frameOverlays[pose + '-' + dir][frameIdx]` →
   `[sx, sy, w, h, x, y]`. If present, draw the strip
   `frames/<pose>-<dir>.png` cropped to `(sx, sy, w, h)` with its TOP-LEFT on
   body pixel `(x, y)` of the 256-space frame — sprite anchor (0,0) at
   `spriteBody.x + (x - 128) * s * m`, `spriteBody.y + (y - 128) * s`, scale
   `(s * m, s)` where `s = |bodyScale|` and `m` the mirror sign. No anchor,
   nudge or pose scale: it is already in body space, and mirrors with the body.
3. Preload the strips with the piece (CLAUDE.md animation-preloading law:
   register them in `preloadWorldAnimations`). They are 40KB on disk,
   ~1.4MB of GPU as 10 textures.
4. The fur is baked in Monkey Brown (85,56,23): the species must pin that
   skin tone.

### Stage 2's three plumbing traps

1. **BOTH wire gates, in the same change.** A species id must go in
   `JOIN_COSMETIC_KEYS` (`server/src/join.js`) *and* `TRACK_COSMETIC_KEYS`
   (`server/src/index.js`). The code flags this shape three separate times:
   v2.3.1939 put a drawing key on one gate only and the result was a print
   that "appeared on join and vanished on the first two-second relay". For a
   species that means joining as an alien and turning human to everyone two
   seconds later.
2. **The two-letter key space is nearly full.** Taken: `bt bl hw fh hr sk hc
   htc fhc st stc ec ew ewc sa sb pa pb ta tf tm tb tr sp pp fp hg fr`. Note
   `sp` is the shirt *pattern*, not species. `rc` and `sc` are free.
3. **A new appearance key is NOT permanent for an existing character.** See
   below — load-bearing, and not a species problem.

## The permanence hole (pre-existing, affects Stage 2)

`_loadOrCreateCharacter` (`server/src/join.js`) opens with:

```js
const stored = await this.state.storage.get('char:' + id);
if (stored && stored.look) return stored;
```

The character record is written **once, at creation, and never updated** —
there is one `put` and no key-level backfill anywhere in `server/src`. That is
correct for its purpose (v2.3.1814, "first-write-wins, because permanent has
to mean permanent"), but it means an appearance axis added *after* a character
was created is never stored for that character. The client's restore loop
(`applyCharacterRecord`) skips absent keys, so the pick survives in that
browser's localStorage and is re-sent on every join — visible to peers, and
**gone on a new device**, which is exactly the pre-v2.3.1814 condition the
owner asked to end.

Stage 2 needs a record-backfill path before a species key can honestly be
called permanent.

**This already affects shipped features.** `ew` / `ewc` (eyewear, v2.3.2361 /
v2.3.2424) landed after v2.3.1814, so for every character created before those
versions the eyewear is device-local rather than identity-bound. The
`look-parity` precheck gate does not catch it: that gate asks whether a stored
key is *restored*, not whether an existing record can ever *acquire* a new key.
Worth confirming and fixing on its own, separately from species.

Also note `char:<pid>.look` is snapshotted into the Ace hall-of-fame board
(`server/src/gamble.js`), so rows recorded before a species key exists will
render species-less. That is correct there by design — "the face that took the
bet" — but it is a second reader to keep in mind.

## Stage 3 — a real body rig (NOT recommended for these two)

82 distinct sheets / **823 frames** (stand, jog, hit, attack, pickup, mine,
fish, dodge, plus 25 bow and 15 sword variants), re-deriving
`anchors.json` / `body-anchors.json` / `body-tops.json` / `eyeMask.json`, plus
~13MB of gear art baked against the human silhouette. That is the whole
character pipeline again, per species. Justified only for a species that needs
a tail, digitigrade legs or different proportions — none of which the alien or
the monkey do.

**Precedent against faking it with scale:** v2.3.2268 removed the tall/short
build tab on the owner's own instruction — *"I changed my mind on the build
sizes during the create a character. It looks bad. Use the medium (default)
character only."* `kind: 'build'` and `_buildTile` are still in `NameModal.jsx`
unreached, which is what a future height axis would switch back on. A species
that is a scaled body should be expected to get the same verdict: species has
to be art, not scale.
