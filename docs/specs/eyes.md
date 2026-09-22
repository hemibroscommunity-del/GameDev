# Eye styles (v2.3.2643)

**Shipped:** Sleepy Eyes, One Eye, Demon Eyes, WTF Eyes — south, southwest and
east, plus their runtime mirrors.

Owner, with four mannequin sheets: *"I want these as 'eyes' choices — Sleepy
eyes, one eye, demon eyes, wtf eyes."*

They are a **slot of their own**, `eyestyle`, not four more entries in the
eyewear catalogue. The art arrived on the eyewear reference sheet and is placed
by the same crown-anchored machinery, so folding it in would have been two
lines — and it would have made "demon eyes" and "sunglasses" mutually
exclusive, which is the one combination a player is most likely to want. The
child order puts eyewear **above** eye styles: glasses go over your eyes,
whatever your eyes are. `mp-eyestyle.mjs` wears both and asserts it.

Where they appear: the creator's existing **Eyes** tab, which was a colour-only
tab (v2.3.1929) and now takes the standard two-step shape every trait tab has —
the style in the option strip, the eye colour in the row below it. No tenth tab.

| style | eye coverage (south / southwest / east) | notes |
|---|---|---|
| Sleepy Eyes | 100/100 · 100/100 · 100 | navy half-lids, pale inner highlight |
| One Eye | 57/57 · 43/29 · 80 | **centred** cyclops eye — see below |
| Demon Eyes | 100/100 · 94/86 · 94 | flames; the erase probe (§3) |
| WTF Eyes | 86/86 · 100/100 · 99 | wide-set, pupils in the inner corners |

Those are the importer's own numbers against the `stand` bodies, the same
measurement `docs/specs/eyewear.md` tabulates and with the same qualifier: it is
an **idle-body** figure, and the pose passes get close rather than exact.

**Read the coverage column as "does it hide the real eye", not as a score.**
The importer's eye check is an eyewear heuristic — it asks whether a *lens* is
over an *eye* and prints `LOW: the lenses are not over the eyes` under about
95%. One Eye trips it on every facing by design: a single eye centred between
two is *supposed* to cover half of each. What actually matters was measured in
the real renderer instead, by `mp-eyestyle.mjs`: every one of the four covers
**100%** of the iris row the game paints, on the creator's composited preview,
at the scale a player sees.

---

## 1. What an eye style is, mechanically

**It is eyewear.** Sprites under `public/sprites/traits/eyestyle/<id>/`, base
directions plus a `meta.json`, placed by the shared crown-anchored `_placeTrait`
and dropped from the crown to the eye line by the positive `crownNudge` Y its
meta carries. `eyestyle` is in the importer's `FACE_WORN` tuple for the same
reason `eyewear` is — a face-worn piece is registered by the **head** (the drawn
crown and cut line mapped onto the mannequin's), not by the shoulder fit, because
a generator's non-uniform resize carries an aspect error that grows from the
shoulders up to the eye line. `docs/specs/eyewear.md` §1 has the full argument;
none of it changes here.

**Where it draws.** Above the hair and the cape hood, **below the eyewear**,
below the hat. That is one decision made once, and it is spelled out in three
places because three places draw a character: the two child orders in
`entityRenderer.js` (`createPlayerDisplay` and the remote display), the
stand-in set order in `effectsRenderer.js` (`_STAND_IN_TRAIT_KEYS`), and the
draw order in `characterPortrait.js`. No per-item flags.

**Three facings, and the two rear ones are omitted.** The beard precedent
(v2.3.1530): no png and no `meta.anchors` entry, and the renderer hides the
piece there without a retry or a crash report.

**Demon Eyes shipped all five for one commit**, because the owner's sheet draws
the flames on the back-of-the-head cells and they imported cleanly. He then
asked for them gone — *"You can ignore the demon eyes in the back of the head I
just wanted south, southwest (and mirror) and east (and mirror)"* — so it was
re-imported with `--omit northeast,north` like the rest. Nothing in the code
decided either way: the renderer reads `meta.anchors`, so a facing existing is
data, exactly as a facing disappearing is, and a re-import without the flag
brings them back.

**No recolour.** A style is the colours it was drawn in. The colour row on the
Eyes tab is the **eye colour** — the recolour of the real irises underneath
(`eyeMask.json`, v2.3.1928) — and it is unchanged, though §3 below means it has
nothing left to paint while a style is on.

**The colour row stays live on `none`.** The picker's standing rule blanks a
colour row when the pick is `none`; that is right everywhere else (there is no
hat to paint) and exactly backwards here, because `none` **is** the real eyes.
One flag, `colorsWhenNone`, in `NameModal`'s `_typeDefs.eyes`. It is one boolean
away from regressing, and a player would experience the regression as eye colour
disappearing, so `mp-eyestyle.mjs` asserts it directly.

The row is **not** hidden while a style is selected either, even though the
styles cover the irises they paint. It is the same control it has always been,
it comes straight back on `none`, and a control that vanishes when you touch an
unrelated tile reads as a bug.

---

## 2. The art pipeline, in order

Everything runs from the repo root. The Python tools need `pillow`, `numpy` and
`scipy`.

### Step 1: make the sheet

```
python3 tools/make_headwear_mannequin.py --title "EYEWEAR REFERENCE  -  draw the glasses ON each head" --out eyes-mannequin.png
```

The same grid every head trait uses. `--title` changes only the caption.

### Step 2: draw the eyes on it

One style per sheet. Unlike eyewear, **the mannequin is NOT repainted flat
green** — the eyes are drawn straight onto the face as generated:

```
Draw [sleepy eyes] on each of the five heads, in the direction each cell is
labelled: front, three-quarter, side, three-quarter back, back. Draw nothing on
the cells the feature is not visible from.
Draw ONLY the eyes: replace the eyes that are there. Leave the skin, the
outline, the nose, the mouth and the ears exactly as they are, keep the magenta
background and the labels, and do not resize or re-lay-out the sheet.
```

**Why this sheet is not flat-keyed, and why that is correct.** Every other
trait can be drawn on a flat green silhouette because it sits *on* the figure.
A facial feature has to be drawn *in place of* one — you cannot draw an eye onto
a head that has no face. So the sheets come back with the real mannequin on
them, and a step is added rather than the artist being asked for the impossible.

### Step 3: re-key the sheet (NEW — eyewear has no equivalent)

```
python3 tools/flatkey_drawn_mannequin.py --art sleepy.png --out sleepy-keyed.png [--debug DIR]
```

This repaints the person flat `#00FF00` on magenta and leaves **only** what was
drawn by hand, which is exactly the sheet `import_headwear_green.py` was
promised. Fed the raw sheet instead, the importer fails twice — see TRAPS §90
for both failures and why neither is a bug in the importer.

Its test: a pixel that sits off **all three** base-colour segments
(magenta→skin, magenta→ink, ink→skin) was painted by hand. Segments rather than
endpoints, because the resampling blend band along every edge lies *on* those
segments — which is what lets the tolerance stay tight enough to keep the Sleepy
style's near-black navy (63 off the ink→skin segment, against under 12 for the
widest blend band on these sheets). Then: blobs under `--min-blob` go (speckle),
each survivor reaches `--grow` px into adjacent ink so a drawn eye keeps its own
outline, and holes are filled so a pupil inside a white eye survives.

It finds the skin rather than assuming it — the WTF sheet came back at
`rgb(227,152,79)` against `rgb(201,133,77)` for the other three, the same lesson
eyewear learned from the cyan mannequin (v2.3.2367).

**The dark parts of a drawing are FOLLOWED, not reached into.** An eye's
outline and its pupil are both near-black, so both read as mannequin by the test
above and have to be recovered — by starting from the ink that *touches* the
art and propagating through connected ink, bounded to `--grow × 6` (under two
game pixels at the scale these cells are drawn, which crosses any pupil and
cannot get round a head).

The first cut dilated the art by `--grow` and took whatever ink that landed on.
That recovers an *outline* — a thin thing, everywhere within `--grow` of the
colour it edges — and guts anything solid. The One Eye's pupil is a 20px block
whose top and sides touch the white sclera and whose bottom runs past it, so the
dilation caught only its rim, `binary_fill_holes` could not close a shape that
is open at the bottom, and it imported as a hollow arch: *"Looks like one eye
lost its black pupil"* (owner). The 256px frame carried **4** dark pixels where
the fixed one carries **24**; `mp-eyestyle.mjs` asserts that statically, because
the defect is in the art and a browser adds nothing to seeing it. Both of WTF
Eyes' pupils were hollow the same way, and Sleepy Eyes was missing its dark lid
— which is why its coverage went from 73-81% to 100%.

**Its per-cell report is the `--omit` list.** A cell that keyed 0px is a facing
the style is not drawn on, and it says so:

```
  northeast       0px  -- nothing drawn here; pass --omit northeast to the importer
```

### Step 4: import

```
python3 tools/import_headwear_green.py --art sleepy-keyed.png --category eyestyle \
    --id sleepy --name "Sleepy Eyes" --omit northeast,north
```

Unchanged from the eyewear path except for the category. `seat_eyes()` moves
each facing onto the eye row the game paints, bounded at 8px and reported.

### Step 5: fit the action poses

```
python3 tools/tune_headwear.py --category eyestyle --id sleepy --fit-pose jog
```

…and `mine`, `fish`, `hit`, `pickup`. The action sheets draw the head at a
different size from the idle sheets, so this measures the ratio per facing into
`scaleByPose` and scales the placement about the crown.

### Step 6: downscale

```
python3 tools/downscale_traits.py --cats eyestyle --stash-hi --apply
```

128px art, 256 originals kept in `hi/` (the portrait loads those first).

### Step 7: cut the picker tiles

```
python3 tools/ui/make_eyestyle_thumbs.py [--ids …] [--check]
```

**Not** `slice_eyewear_thumbs.py` (that cuts the owner's hand-drawn eyewear
contact sheet, and there is none for eye styles), and **not** the thumb the
importer writes. The importer crops the piece's own art, which is right for a
hat and hopeless for a pair of eyes: the tiles it produced here were two navy
slits, a white blob, two flames and two white blocks floating on transparency.
A player picking an eye style is picking a **face**, so the tile shows one — the
piece composited onto the game's own head through `preview_headwear.place()`,
which is itself a term-for-term mirror of `_placeTrait`. Writes `thumb.png`
(south) and `thumb-sw.png` (southwest).

### Step 8: one catalogue line

```js
{ id: 'sleepy', name: 'Sleepy Eyes' },
```

in `src/rendering/traits/eyeStyleCatalog.js`. Nothing else: the renderer, the
portrait, the preload manifest, the picker, the wire and the server all read the
catalogue.

---

## 3. Erasing the eye under the style (v2.3.2643)

Owner, on the first cut: *"I still see some remnants around the eyes where you
stickered over the old ones, can that be cleaned up with whatever skin color it
is (the ones that gets changed with custom skin color choice)?"*

No drawn shape covers another drawn shape exactly. What showed round the edges
was the base eye's hard black top edge and a sliver of sclera — which reads as a
second eye behind the first — so the real eye is now **painted out** under a
style rather than merely covered.

**The colour is sampled, the region is shipped.** The fill has to follow the
skin-tone pick, which is a runtime recolour, so `playerSkins._blankEyes` takes
the per-channel **median of a ring of cheek and brow pixels** read off the
canvas *after* the retint — whatever the player's skin has become, including a
tone added years from now, with no table to keep in step. The region comes from
`src/rendering/eyeBlankMask.json`, derived offline by
`tools/eyes/extract-eye-blank.mjs` and reviewed as a contact sheet, the same
rule `eyeMask.json` beside it follows: the frame loop never searches for an eye.

**Two tables, not one.** `eyeMask.json` records the **iris**, because that is
what the eye-colour feature repaints. An erase needs the opposite — everything
that is not skin. The blank table is a strict superset (34 sheets against 32)
and is derived from the same reviewed `irisIn` predicate, each iris grown to its
own eye by the walk `import_headwear_green.eye_boxes` already uses to measure
eyewear coverage.

**Three numbers that were each wrong once, and are worth keeping:**

- **Sample two pixels out, not one.** The box is tight on the eye, so the pixels
  immediately beside it are the eye's own anti-aliasing. Measured on
  `stand-south`, the one-pixel ring reads rgb(183,120,66) and rgb(200,136,83)
  with nothing appearing more than twice; two and three pixels out it is flat
  rgb(198-199,128-131,71-73). The first cut sampled at one pixel and filled the
  socket with rgb(173,114,70) against a face of rgb(199,129,72) — the same
  visible rectangle, in a different colour.
- **Median, not mode and not mean.** The sheets are dithered by a pixel or two,
  so no triple dominates (the best count in a three-pixel ring is 8 of ~50) and
  a mode picks noise; a mean is dragged dark by the head outline the ring
  catches on the side views.
- **Pad the box by one *sheet* pixel.** Erasing only the eye's hard pixels left
  its anti-aliased brown ring behind, which at game size is a brown rectangle
  where the eye used to be. The pad is applied at extraction, where the sheet's
  own scale is known — one disk pixel is 2px of 256-space pad on the 128px
  sheets and 1px on the 256px ones. The fill is skin, so a pad that overshoots
  paints skin onto skin; one that undershoots is visible.

**Where it reaches.** Everywhere the body is baked: `getBodyFrame` (so every
pose and both the local and remote paths), the **head overlay** an armoured
player's fullset figure draws its face from (`getPickupHeadFrame` — missing this
would have left the erase working on everyone except a knight), and
`characterPortrait`, so the creator, the character sheet, the inspect card and
the friends list cannot disagree with the sprite.

**Where it does not.** The `mine`, `fish` and `hit` faces are drawn squinting
with no white in them, so the extractor finds no eye and they bake unchanged —
the same set the eye **colour** already skips, for the same reason. The
swing/bow/chop stand-in strips (`effectsRenderer`) bake through their own cache,
keyed on skin/pants/shoes alone, and pass no eye data at all; they have never
carried the eye colour either, and extending that boundary is a separate change.

**Passed in, never read from a store.** `eyeStyleId` is an argument at every
call site for the v2.3.1930 reason `eyeId` is: these functions bake **remote**
players too, and a store read would put your eyes on a stranger's face. The
local prewarms are the exception and say so — they prewarm the local player by
definition.

**It is in the cache key** (`bodySheetKey`'s `es:` segment) and deliberately
**empty when no style is worn**, the v2.3.1940 rule for the drawings: a player
with no style keeps the exact key they had before this version, so their sheets
stay shared and prewarmed. It has to be in the key at all because the bake
differs — a blanked sheet handed to a player with no style would leave them with
no eyes.

---

## 4. What had to be wired, and where

One system, five layers, and the list is here so the next face slot is a
checklist rather than a search.

**Catalogue** — `src/rendering/traits/eyeStyleCatalog.js`: the list,
`eyeStyleHasOptions()`, the `bt-eyestyle` localStorage store, the change
subscription, and `window.__btSetEyeStyle` for scenarios.

**World renderer** — `entityRenderer.js`: `_ensureEyeStyleLoaded`,
`_placeEyeStyle`, a sprite child **below** `eyewearSprite` in both display
builders, the place calls on the local and remote paths, all four hide sites,
the weapon z-order reference list, the remote swing/bow hide list, and the
catalogue on `preloadTraits`' gate. **Preloading is law** (CLAUDE.md): every
style loads during the loading screen, not on first sighting.

**Stand-ins** — `effectsRenderer.js`: `_STAND_IN_TRAIT_KEYS` (the literal order
**is** the z-order), the three sprite-set builders, and `eyeStyle` on the three
`looks` objects. Without this a face loses its eyes for the quarter-second of
every swing, shot, chop and cook — TRAPS §15 is the record of that failure.

**Portrait** — `characterPortrait.js`: loaded in the same concurrent batch as
everything else (a sequential await would make the portrait blink its real eyes
before the style lands), drawn under the eyewear, warmed by
`prewarmPortraitDirs`, and carried by `portraitOptsFromPeer`.

**Creator** — `NameModal.jsx` (the Eyes tab, `colorsWhenNone`, and the
disabled-recolour drop list, which `eyes` comes **off**: it is no longer a
recolour-only category, so switching eye colour off must not take the styles
with it), `BroTown.jsx` (state mirror, randomise, reset, props),
`characterCreatorEffects.js`, `LoginScreen.jsx`, `traitThumbs.js`.

**Elsewhere on the client** — `CharacterView.jsx` and `BottomDashboard.jsx` read
it *and subscribe to it in the same change* (the v2.3.1835 lesson);
`friendPortraits.js` puts it in the cache key as well as the draw, so a friend
who changes their eyes gets a fresh portrait rather than the stale one.

**Wire and persistence** — `es`, beside `ew`. `wsClient.js` sends it on join,
`BroTown.jsx` on the 2s relay and in both resume snapshots,
`peerCosmetics.js` maps it, `characterRecord.js` restores it. Server:
`JOIN_COSMETIC_KEYS` (join.js), `TRACK_COSMETIC_KEYS` (index.js) and
`STORE_BUST_KEYS` (store.js) — **all three in one change**, because a key on one
gate and not another is the v2.3.1939 shape: eyes that arrive on join and revert
on the first two-second relay. Display-only, like every cosmetic there: the
receiving client asks its own catalogue for the art, so a forged id loads no
texture and paints nothing.

Deploy order is safe in both directions. An old worker drops `es` at its join
gate and peers simply see the default eyes; an old client ignores the key.

---

## 5. Verification

`node tools/dev/precheck.mjs` — green, including `look-parity` (the new stored
key is restored) and the storage-key registry.

`node tools/qa/mp/run.mjs eyestyle` — 42 assertions, all green, against a real
worker and a real Chromium. What it establishes, beyond the guards:

- all four styles are in the Eyes tab, with `None` first;
- the eye-**colour** row is live while the style is `None`;
- the eye row is located by diffing two eye colours — the game's own answer to
  "where are the eyes", not a fraction of a bounding box (TRAPS §89) — and each
  style covers **100%** of it without hanging onto the mouth;
- **the erase leaves nothing behind**, two ways. Demon Eyes is drawn with no
  dark pixel at either resolution, so the hard-dark count in the eye window must
  fall from the bare face's 1264 to **0**; and with any style on, switching eye
  colour between Red and Default must change **0 pixels**, which is exact —
  the bake recolours the iris or erases it, never both.
- the **world** bake was handed the style, read off the cache keys it actually
  produced (`es:demon`, nine sheets across stand and jog) rather than from a
  40px screenshot — the creator and the walking figure are different code paths
  and the threading is the part most likely to be missed;
- the **One Eye's pupil is solid**, measured on the committed 256px art (24
  dark pixels; the hollowed import had 4) — see §2 step 3;
- the Thug Life shades and Demon Eyes are worn **together**, with the shades
  still the picked eyewear afterwards.

Two things the remnant assertion got wrong before it got right, both recorded in
TRAPS §89: a padded rectangle round the irises swept in the nose, the bridge
shading and the ear notches and reported ~1000 false remnants per style; a flood
outward from the irises leaked through that same shading into the nose and
called 2888px "eye" on a face whose eyes are about 300. What works uses no
footprint at all — it uses a style with no dark pixels in it as the probe.

`cd server && npm test` — all suites green; the cosmetic-key suites are driven
off `JOIN_COSMETIC_KEYS` (v2.3.2445) so they followed the new key on their own.
