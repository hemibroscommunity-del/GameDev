# Eye styles (v2.3.2643)

**Shipped:** Sleepy Eyes, One Eye, Demon Eyes (all five facings), WTF Eyes.

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

| style | facings | eye coverage (south / southwest / east) | notes |
|---|---|---|---|
| Sleepy Eyes | S, SW, E | 73/79 · 81/81 · 64 | navy half-lids, pale inner highlight |
| One Eye | S, SW, E | 57/57 · 43/29 · 74 | **centred** cyclops eye — see below |
| Demon Eyes | **all five** | 100/100 · 94/86 · 94 | flames; visible from behind |
| WTF Eyes | S, SW, E | 71/76 · 86/90 · 73 | wide-set, pupils in the inner corners |

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

**Not every facing ships.** Three of the four are invisible from behind and
omit `northeast` and `north` — the beard precedent (v2.3.1530): no png and no
`meta.anchors` entry, and the renderer hides the piece there without a retry or
a crash report. **Demon Eyes ships all five**, because the flames stand off the
sides of the head and the owner drew them on the three-quarter-back and back
cells. Nothing in the code decided that: the renderer reads `meta.anchors`, so a
facing existing is data, exactly as a facing disappearing is.

**No recolour.** A style is the colours it was drawn in. The colour row on the
Eyes tab is the **eye colour** — the recolour of the real irises underneath
(`eyeMask.json`, v2.3.1928) — and it is unchanged.

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

## 3. What had to be wired, and where

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

## 4. Verification

`node tools/dev/precheck.mjs` — green, including `look-parity` (the new stored
key is restored) and the storage-key registry.

`node tools/qa/mp/run.mjs eyestyle` — 34 assertions, all green, against a real
worker and a real Chromium. What it establishes, beyond the guards:

- all four styles are in the Eyes tab, with `None` first;
- the eye-**colour** row is live while the style is `None`;
- the eye row is located by diffing two eye colours — the game's own answer to
  "where are the eyes", not a fraction of a bounding box (TRAPS §89) — and each
  style covers **100%** of it without hanging onto the mouth;
- the Thug Life shades and Demon Eyes are worn **together**, with the shades
  still the picked eyewear afterwards.

`cd server && npm test` — all suites green; the cosmetic-key suites are driven
off `JOIN_COSMETIC_KEYS` (v2.3.2445) so they followed the new key on their own.
