# BroTown Environment Art — Phased Asset Plan

*v2.3.2649; §4/§6 corrected v2.3.2650; Phases 1–3 shipped v2.3.2651–2655.*

A commissioning plan for environment art: what to ask a generator for, at
what size, in what order, and which of it the renderer can actually put on
screen today.

It is the art-side companion to `docs/DEPTH-ROADMAP.md`, which costs the
*code* work against the renderer that exists. Where the two touch, the
roadmap is the authority on code and this document is the authority on
assets.

> **Why this document exists.** A phased plan was drafted for this work
> outside the repo, and its instincts were largely right — skip shadows,
> no full-screen plates, small reusable overlays, one biome at a time, a
> strict per-asset brief to stop the generator drifting. What it could not
> have is the renderer's own numbers. The first batch generated against it
> came back at **6.00 MB of decoded texture per asset — the same cost as an
> entire zone map** — and three of its four pieces cannot be placed by any
> code path that exists. Both are size-and-shape problems, not art problems.
> This document supplies the missing numbers so the next batch lands usable.

---

## 1. The thing that changed while the plan was being written

**Dynamic occlusion shipped on 2026-09-22, in v2.3.2633–2635** —
`src/rendering/depthSort.js`, eight commits before this document.

The player now passes behind and in front of props, NPCs, monsters and pets
according to where each one **touches the ground**. Before it, draw order in
the world was static: a building could never occlude anything, and a tree
occluded from every position including when you stood south of it.

This matters for commissioning in one specific way: **the code half of
"things the player can walk behind" is done, and it is the art that is now
the bottleneck.** A free-standing prop dropped into a zone occludes
correctly with no further engineering. That is the cheapest depth in the
game and it is where the art budget should go first.

What it did *not* give you was a near-camera framing layer — that arrived
separately at v2.3.2655. See §3.

## 2. The only budget number that matters: decoded RGBA

Every asset brief written for this game so far has asked for a "file size
goal". **File size is the wrong metric and this repo has the receipt.**

What an iPhone runs out of is *decoded* texture, which is:

```
width x height x 4 bytes
```

independent of how detailed the painting is. A flat silhouette and a densely
rendered one cost exactly the same at the same dimensions. From
`src/rendering/zoneTextures.js`, measured off the PNG headers:

> fire-goblin is **1.9 MB as PNG and 60.5 MB as RGBA** — which is why file
> sizes never made this look like a problem.

That is also how the +92 MB texture drift of v2.3.2272 went unnoticed while
it was happening (`hub 382.5 → ember 413 → sky 449.2 → frost 468.8 →
verdant 474.4 MB`, monotone, never released). Per-zone loading exists
*because* of RAM on iPhone; the ZONE-ASSET EXCEPTION in `CLAUDE.md` is that
incident's fix.

So the brief's instruction to "keep internal detail controlled; don't
over-texture" buys nothing. **Dimensions are the only lever.**

| Long edge | Decoded RGBA |
|---|---|
| 128 | 0.06 MB |
| 256 | 0.25 MB |
| 512 | 1.00 MB |
| 1024 | 4.00 MB |
| 1254 (what batch 1 shipped) | 6.00 MB |

For scale: **a whole zone map is 1254×1254 = 6.00 MB** (`frost_v5.webp`,
430 KB on disk). Batch 1 asked the phone to hold a second, third, fourth and
fifth zone map's worth of texture for four decorative overlays.

### The per-zone decor cap

`DEPTH-ROADMAP.md` item 5 says foreground depth "needs a cap per zone agreed
before the art is made". This is that cap:

> **A zone's decor may not cost more decoded texture than the zone's own
> map: 6.00 MB. No single asset may exceed a 512 px long edge.**

It is a per-zone figure because only one zone's art is resident at a time
(`preloadZoneAssets` / `freeZoneAssets`), so the cap is also the peak.

> **Corrected at v2.3.2655.** This originally also said "no more than 8 decor
> assets", and that count was wrong — not too tight, but *measuring the wrong
> thing*. It was a proxy for the megabytes, and it punishes exactly the assets
> that deserve encouraging: frost's footprint strip is 0.139 MB, 2% of the cap,
> and a count limit treats it as one-eighth of the budget. Frost now carries
> **10 assets for 4.2 MB** and is comfortably inside the limit that matters.
> The MB cap bounds the total and the 512 ceiling bounds any one asset; a
> count adds nothing except a wrong signal. Scene complexity was the other
> worry behind it, and 10 sprites is nothing — town has drawn 9 props plus
> NPCs plus monsters since v2.3.2065.

**Anything per-zone must load per-zone.** Until v2.3.2651 prop art did not:
`propSpriteSources()` handed the whole table to the *global* startup gate, so
a frost prop added the obvious way would have downloaded on every player's
loading screen and stayed decoded for the life of the page. It now returns
only the resident hubs' props; everything else goes through
`zoneDecorSources(zoneId)` → `loadZoneDecor` / `freeZoneDecor`, awaited behind
the per-zone overlay and released on exit. **The split is derived from the
zone, not flagged per prop** — a flag is a thing to forget.

## 3. The split that decides whether art is usable: free-standing vs cropped

The draft plan's primary split was *reusable-neutral vs map-specific*. That
is a useful thing to know, but it is not what decides whether a finished
asset can go in the game. This is:

| | Free-standing | Edge-cropped |
|---|---|---|
| **Shape** | complete object, ink nowhere near its canvas edge, sits on a base | subject runs off its own canvas edge; a corner or border piece |
| **Has a ground-contact line?** | yes — the bottom of the art | no |
| **Consumed by** | `WORLD_PROPS` + `depthSort.js` | `ZONE_FOREGROUND` + the `foreground` layer (v2.3.2655) |
| **Ships** | today, art-only change | today — but read the placement rule below |

`depthSort.js` sorts everything in the world by its **ground-contact line**,
which it reads as the sprite's `y` — and every world sprite is anchored
bottom-centre. An asset with no base has no sortable position, which is why
until v2.3.2655 an edge-cropped piece could not be drawn by anything at all.

**Both kinds now ship**, but they are still not interchangeable: a
free-standing prop is *in* the world (it sorts, it blocks, it stops a shot);
an edge-cropped piece is *in front of* the world (it never sorts, never
blocks, and must never be cover).

### The placement rule for edge-cropped art

**Every pre-cut edge must lie outside the map.** The crop is what makes a
piece read as continuing past the frame; a cut that lands inside the playfield
draws as a hard straight seam — a pasted rectangle over the painting.

"Near an edge" is not enough. In a 32×32 zone the camera **never scrolls
vertically** (a 1024 px view over a 1024 px map — `worldViewport`'s per-zone
floor, v2.3.2247), so a piece cut across its bottom has exactly one home: a
bottom corner. Horizontally the camera does scroll, so a side cut only has to
clear the map edge.

`tools/dev/check-foreground-crops.mjs` enforces this and precheck runs it. It
exists because the first placement shipped a 100%-cut bottom edge at y 370 —
a seam straight across frost — with **four passing browser assertions** on
that exact piece (drawn, right layer, right size, correctly mirrored). None
of them can see a seam: a seam is a relationship between the art's alpha and
the map's bounds, and nothing in the scene graph knows about either.

Two consequences for the brief, both cheap to state and expensive to discover
late:

- **The lowest opaque pixel must be the point that touches the ground.** If a
  canopy overhangs below the trunk's base, the prop sorts by the canopy and
  the occlusion is wrong.
- **Leave no empty canvas.** The importer trims to the alpha bounding box
  anyway, but a subject floating in a 1254² canvas is a sign the generator
  was not told a size, which is also how it ends up over-resolved.

## 4. How big a world is, and how big the art has to be

> **Corrected at v2.3.2650.** The first cut of this section reasoned from
> `REF_VIEW_W = 390 × WORLD_ZOOM(3.0) = 1170` world px and concluded that one
> world px is 0.67–1.0 *device* px, so a 1:1 texture-to-world ratio was
> "already generous". **That was wrong by about 2.5×**, because `REF_VIEW_W`
> is a *target* that a combat zone never reaches. `worldViewport()` floors the
> scale per zone — `max(scale, cssW / (z.w × TILE), cssH / (z.h × TILE))`,
> v2.3.2247, so that a map smaller than the viewport is never surrounded by
> empty tray. A 32×32 zone is only 1024 world px deep, and a phone is tall, so
> the **height** term wins and the zone zooms *in*.

Evaluating the real formula for frost (1024×1024 world px):

| Canvas | dpr | scale | Visible world px | **Device px per world px** |
|---|---|---|---|---|
| 375×553 (SE) | 2 | 0.540 | 694 | 1.08 |
| 390×844 (13/14) | 3 | 0.824 | **473** | **2.47** |
| 430×932 (14 Pro Max) | 3 | 0.910 | 472 | 2.73 |
| 402×874 (16 Pro) | 3 | 0.854 | 471 | 2.56 |

It lands at ~472 on every modern iPhone, because once the height term wins
the visible width is just `1024 × (cssW / cssH)` and the aspect barely moves.

**So a decor texture wants roughly 2–2.5× its world size**, and the ceiling
matters more than the floor: past ~3× nothing is resolved on any iPhone.
The shipped buildings are *under*-resolved by this measure (512 px of art at
500–550 world px is 0.95×) and the small props are right (the anvil is 256 px
at `worldH: 52`, 4.9× — over, but it is a 0.25 MB texture, so nobody cares).

Town is 68×72 tiles (2176×2304) — far more world than any canvas wants, so it
never reaches its own floor and sits nearer the `REF_VIEW_W` figure.

### The scale the map is painted at — the constraint nothing recorded

Measured on `frost_v5.webp` with a world-pixel ruler: **the map's own
near-field pine trees are 95–115 world px tall.** A person is 120 world px
(`NPC_SPRITE_SCALE`; the *visible body* inside that 256 px frame is ~75).

**In BroTown's painted zones a tree is about as tall as a person.** That is
not physical, it is the scale the paintings are drawn at, and any new prop has
to obey it or it reads as a giant. Verified by looking, not by arithmetic: the
first pass at the frost decor was sized 280–320 (physically plausible for a
pine) and rendered onto the live map at ~3× the scale of every baked tree in
the same frame.

Useful anchors, for a prop that should read as a near-field landmark rather
than background dressing:

| Subject | worldH |
|---|---|
| shrub / brush clump | 70–90 |
| rock mound, ice outcrop | 100–140 |
| pine, pine clump | 140–180 |
| wide low ridge / snowbank | 110–130 (and 200–300 *wide*) |
| deliberate hero tree | 200 |

| Class | World size | Art long edge | RGBA | Examples |
|---|---|---|---|---|
| Ground cue, particle, puff | 20–60 | **128** | 0.06 MB | footprint, snow puff, dust, sparkle |
| Small prop | 70–110 | **256** | 0.25 MB | shrub, stump, small rock, stake, sign |
| Medium mass | 110–180 | **384** | 0.56 MB | rock cluster, pine clump, ice mound |
| Large / wide mass | 180–300 | **512** | 1.00 MB | ridge, snowbank, hero tree, building |
| — | — | *never above 512* | — | — |

512 is a ceiling, not a default. Nothing in this game needs more, and the
only assets above it today are a 2696×330 fountain strip and a 1288×773
interior — both animated or full-screen, neither a decor prop.

**Mirroring is free.** `WORLD_PROPS` supports `flipX: true` (see `bench-w`),
so one asset serves two placements. Ask for one good canopy, not an A and a
B that differ only in handedness.

## 5. Shadows: right call, and the reason is stronger than "it didn't look good"

The draft plan's instinct to stop chasing shadows is correct, and the repo
agrees on the record. The shared 64×32 radial contact ellipse was **removed
in v2.3.2632** after the owner reported it looked worse than nothing.
Darkening it (v2.3.1300c) and re-anchoring it (v2.3.1824) had both been
tried.

`DEPTH-ROADMAP.md` gives the structural reason, and it is the part worth
carrying into every brief:

> A symmetrical radial blob is a shadow for a scene lit from directly above.
> BroTown's maps are painted with their own light and throw long shadows to
> one side; a blob agreed with none of them and read as a smudge on the
> ground. **Any future grounding cue has to agree with the map it sits on.**

No zone records a light direction anywhere in the codebase. Until one does,
the rule for art is precise:

- **Internal form-shading: yes.** An asset must read as a solid object —
  its own lit and shaded faces, ambient occlusion in its own crevices. The
  batch-1 frost pieces do this well and it is why they read as rock and snow
  rather than as stickers.
- **Cast shadow on the ground: no.** A baked ground shadow commits the asset
  to a light direction the map may contradict, and it cannot be removed
  later without a repaint.

Grounding is `DEPTH-ROADMAP` §7 and it is **wide open — the game currently
has no grounding cue at all.** Terrain reaction is the path: footprints,
snow displacement, dust, partial burial, a scuff where a foot lands. That is
also the draft plan's "grounding cue kit", and it is the one part of it that
needs no new code capability beyond a place to draw it.

## 6. The frost batches, measured

### Batch 1 — four overlays, one usable

Four frost overlays, run through `tools/import-decor-art.mjs --report`:

| Asset | Source | RGBA | Free-standing? | Verdict |
|---|---|---|---|---|
| rock ridge with pines | 1448×1086 | 6.00 MB | **yes** — base is 53% of its width | **usable**; 512×243 = 0.47 MB, a 12.6× RGBA saving |
| snowy peak, corner | 1254×1254 | 6.00 MB | no — runs off bottom 100%, left 73% | needs item 5 |
| pine canopy A | 1254×1254 | 6.00 MB | no — runs off left 22%, base only 24% of width | needs item 5 |
| pine canopy B (tree top) | 1254×1254 | 6.00 MB | no — runs off bottom 67%, left 43% | needs item 5 |

**24.0 MB of decoded texture for four assets, against a 6.00 MB cap; one of
the four placeable.** The art itself is good — the style matches the frost
map, the alpha is clean, the snow reads. What went wrong is entirely size
and framing, which is what §2–§4 exist to fix.

The ridge processes to 512×243 / 0.47 MB / 204 KB on disk with no visible
loss.

### Batch 2, measured — five midground masses, all usable

| Asset | Texture | RGBA | `worldH` | draws | `blockW` | `blockD` |
|---|---|---|---|---|---|---|
| `frost-pine-pair` | 357×384 | 0.52 MB | 160 | 149×160 | 119 | 56 |
| `frost-pine-ridge` | 378×384 | 0.55 MB | 150 | 148×150 | 118 | 53 |
| `frost-rock-mound` | 384×335 | 0.49 MB | 130 | 149×130 | 119 | 46 |
| `frost-ice-mound` | 256×179 | 0.17 MB | 100 | 143×100 | 114 | 35 |
| `frost-snow-shrubs` | 256×218 | 0.21 MB | 80 | 94×80 | 75 | 28 |
| `frost-rock-ridge` (batch 1) | 512×243 | 0.47 MB | 120 | 253×120 | 202 | 42 |
| **frost total** | | **2.41 MB** | | | | |

**All five are free-standing**, so all five place with today's renderer. Frost
now sits at **2.41 MB of its 6.00 MB cap across 6 of 8 assets**, with room for
two more. Each also arrived at 1254² / 6.00 MB, so the same 11–28× RGBA
reduction applies; the raw exports are in
`assets/prop-source/decor-frost/`.

The `worldH` column is the one thing here that is a judgement rather than a
measurement, and it was got wrong first: see §4's painted-scale note. The
first pass sized these 280–320 — physically right for a pine, ~3× the scale
of every tree baked into the same map. They were re-sized against the map's
own 95–115 world px pines and checked by rendering them onto the live art at
world scale beside a player figure, which is the method the town respread
used (`tools/maps/render-town-layout.mjs`, v2.3.2628) and the only one that
catches this.

One measurement worth recording because it cuts against the received wisdom:
the premultiplied downscale (§8, lesson 2) moved the partial-alpha edge
luminance by only **−0.2 and −1.4 of 255** against a straight-alpha resize on
this batch. The auction-house halo of v2.3.2626 was real, but these sources
have clean enough alpha that it barely bites. Premultiplied stays the default
— it is free and the failure mode is ugly — but it is not what is wrong with
batch 1.

## 7. The phases

Ordered by *what the renderer can consume*, which is the reordering this plan
needed most. Phase 0 is done by this document and its tool.

### Phase 0 — lock the rules · **done (this document)**

The size table, the RGBA cap, the free-standing test and the brief template
below. Plus `tools/import-decor-art.mjs`, so a delivered asset is measured
rather than eyeballed.

### Phase 1 — per-zone decor, and the first free-standing masses · **shipped v2.3.2651**

**Code first, and it is small.** Per-zone decor loading does not exist:
prop art rides the global startup gate (§2). It needs

- a per-zone decor list (`WORLD_PROPS` already filters by zone via
  `propsForZone`; it currently holds nine props, all `zone: 'town'`),
- its art loaded in `preloadZoneAssets(zoneId)` through
  `loadTracked('decor:' + zoneId, url)` and freed in
  `freeZoneAssets(from, to)` via `unloadBundle`, matching how the snowman
  and the zone banner already work,
- `propSpriteSources()` split so only global props reach the startup gate.

**Frost shipped at v2.3.2651** — all six placed, 2.41 MB of the 6.00 MB cap.
`zoneDecorSources(zoneId)` splits per-zone art off the startup gate,
`loadZoneDecor` / `freeZoneDecor` (`npcSprites.js`) load and release it
through `loadTracked` / `unloadBundle`, and both are wired into
`preloadZoneAssets` / `freeZoneAssets`. `tools/qa/mp/mp-zonedecor.mjs` pins
the four properties that matter: none of it is resident in town, all six draw
in frost at their declared `worldH`, they sort on the correct side of the
player, and leaving frost releases them.

One thing this cost, recorded because the next per-zone art system will hit
it too: **a display that outlives its texture must drop the reference, not
just hide.** `_updateProps` hid a departed zone's props but kept
`spr.texture`, which was harmless while every prop was town's and global.
With decor actually being freed, re-entering frost found a sprite still
holding the destroyed texture — and because both the re-assign and `visible`
are guarded on `texture === Texture.EMPTY`, it turned itself back on and
rendered a null source (`mp-zonechurn`, second lap). Resetting to
`Texture.EMPTY` on the way out closes it.

Other zones want the same shape: free-standing only, 4–6 pieces, inside the
cap. The code is now zone-agnostic, so a second biome is a data change plus
art.

**Placement caution:** every prop blocks, since v2.3.2073 ("make sure the
objects are unwalkable"), so each one adds a `blockW`/`blockD` collision box
to a live zone — and since v2.3.2652 that same box is **cover**: a shot whose
line crosses it is refused, for the player's arrows (client-side, in
`projectiles.js`) and for a monster's hit (`_monsterStrikePlayer`, the worker's
one choke point). One box, one rule: *if you could not walk that line, a shot
cannot fly it.* So a footprint is now a gameplay decision as much as a
collision one, and `server/src/props.js` must gain any new blocker too —
`mirror-audit` fails if it does not. Frost's walk mask already has a known fault — *"north ice
flat over-blocked by the mask; repaint to open it"*
(`src/rendering/tiledMaps.js:177`) — so placements want checking against the
mask, not just against the painting.

### Phase 2 — grounding cues · **first cue shipped v2.3.2654**

`DEPTH-ROADMAP` §7, which was at zero. Footprints, snow puffs, dust, impact
scuffs, harvest puffs, pickup glints. 128 px, cheap, no light-direction
commitment, and they fix the floating-sticker feeling that the removed
ellipse was reaching for. Each needs a draw site; the fx-strip machinery
(`src/rendering/fxStrips.js`) is the pattern to follow, and anything global
registers in `preloadWorldAnimations` per the preloading law.

### Phase 3 — near-camera foreground framing · **shipped v2.3.2655**

**`DEPTH-ROADMAP` item 5.** Cropped canopies, cliff lips and branches drawn in
front of the player and cut off by the screen edge.

`foreground` joined `WORLD_LAYER_NAMES` above `projectiles` (a branch between
you and the camera covers an arrow as surely as it covers a body) and below
`damageNumbers` (a canopy must never hide the number telling you what you just
took). `ZONE_FOREGROUND` (`worldProps.js`) is the per-zone list; the pieces
ride the same `zoneDecorSources` bundle as the props, so they load and free
with the zone and need no second path.

**Batch 1's three held canopies all ship in frost**, which is what this phase
was for. They are a separate table from `WORLD_PROPS` on purpose: a prop sorts
by its ground line, blocks feet and stops shots, and a foreground piece must
do none of those — sharing the table would mean a `foreground: true` flag that
half the prop code has to remember to skip, which is how a canopy ends up with
a collision box.

**Known trade-off, not yet resolved.** `monsterUi` (name plate and health bar)
sits *below* `foreground` in the stack, so a canopy can clip a monster's health
bar near a map edge. The fix is to lift `monsterUi` above `foreground` — but
that layer sits below `player` today and v2.3.2636 deliberately tuned what may
and may not cover it, so moving it is its own change with its own screenshots.
Flagged rather than done.

### Phase 4 — biome kits

Repeat Phase 1's shape per biome once frost has proved it: floral/earthy,
fire, wind/dune, storm, venom, tidal, hollows. Reuse across zones wherever
the palette allows; `flipX` doubles every piece for free.

### Phase 5 — split baked occluders out of existing maps

Surgical only. A baked fence, cliff top or roof edge becomes an overlay
**only** where it sits in a gameplay-relevant place, is large enough to
occlude a 120 px figure, and is somewhere players actually walk. Every split
costs a new texture against the zone's cap and leaves a hole in the map that
must be repainted. `DEPTH-ROADMAP` items 2 and 3 come first and are free:
put props and NPCs where the *existing* paintings already give them
something to hide behind.

### Phase 6 — new maps born with depth

`DEPTH-ROADMAP` items 9 and 4. Baked background, a decor list inside the
cap, free-standing masses, elevation the player moves through.

## 8. The pipeline

```sh
# measure first, decide the size, then write
node tools/import-decor-art.mjs --report --long=512 --world=260 raw.png

node tools/import-decor-art.mjs --long=512 --out=public/sprites/props \
    --name=frost-rock-ridge raw.png
```

`tools/import-decor-art.mjs` reports source and output dimensions, decoded
RGBA before and after, how much of the canvas was empty, whether the art is
free-standing or edge-cropped, and — with `--world` — whether the texture is
over-resolved for the size it will be drawn at, plus suggested `worldH` /
`blockW` / `blockD`.

It is a sibling of `tools/import-building-art.mjs` (which scales by *height*,
right for buildings and wrong for a 2:1 snowbank) and carries the same three
lessons, each of which has been got wrong in this repo before:

1. **Trim to the alpha bounding box** — empty canvas under the art floats the
   prop above the ground, because placement is by `worldH` and a
   bottom-centre anchor.
2. **Resize premultiplied** — straight RGBA averaging bleeds transparent
   black into antialiased edges (v2.3.2626, the auction-house roofline).
3. **Encode with adaptive PNG row filters** — `tools/png.mjs` writes filter
   None on every row, which on painted art costs *more* than the source
   (v2.3.2627: a 2.4 MB painting came back 3.3 MB).

Raw generator output belongs in `assets/prop-source/`, tracked, so an asset
can be re-exported at a different size without re-generating it. Also
relevant: **do not sharpen art that is about to be minified** — `TRAPS.md`
§17; a pre-sharpened texture carries its halos into the downscale as edge
crunch and buys no detail.

## 9. The asset brief

The draft plan's template, with the invented numbers replaced by real ones
and two fields added that decide usability. Narrow briefs are the defence
against drift, so keep it strict.

```
ASSET:          <what it is, in one line>
CLASS:          ground cue | small prop | medium mass | large mass
                -> fixes the size from the table in §4
SHAPE:          FREE-STANDING (complete object, sits on a base, ink well
                clear of every canvas edge)
                -- or EDGE-CROPPED, only if commissioning for Phase 3
GROUND CONTACT: the lowest opaque pixel is the point that touches the
                ground; no part of the art hangs below the base
DESTINATION:    <zone(s)>; reusable across biomes or specific to one
DIMENSIONS:     <128 | 256 | 384 | 512> px long edge, hard ceiling 512.
                Crop tight to the subject: no empty canvas.
BACKGROUND:     transparent PNG, true alpha, no matte, no halo
STYLE:          painterly / illustrative, matching the destination map's
                painting; 3/4 top-down game environment asset
LIGHTING:       internal form-shading YES (it must read as a solid object).
                Cast shadow on the ground NO -- the maps carry their own
                baked light and nothing records its direction yet (§5).
READABILITY:    must read at gameplay scale on iPhone -- roughly 1 world px
                per device px, so detail finer than ~2 px is invisible
MUST NOT:       no baked background, no empty canvas, no ground shadow,
                no text, no border, nothing above 512 px, no near-duplicate
                that flipX would give for free
```

A worked example, in the narrow register that keeps a generator stable:

> One reusable free-standing frost rock cluster for BroTown. Transparent
> PNG, 256 px long edge, cropped tight to the subject with no empty canvas.
> Painterly, matching a snowy mountain map. 3/4 top-down. A complete object
> resting on visible ground contact at the very bottom of the image — no
> part cut off by any edge. Internal light and shade so it reads as solid
> rock under snow; no cast shadow on the ground. Compact silhouette,
> readable small.

## 10. What not to ask for

Drift guards, each one a mistake already made or already paid for here:

- **Nothing above 512 px long edge.** Batch 1's 1254² is 24× the RGBA of a
  256 px asset for detail the phone never resolves.
- **No full-screen or full-map plates.** `DEPTH-ROADMAP`'s own rule: create
  depth with the smallest amount of additional visual material that will do
  it. Five plates per zone on twelve zones is 3–5× the texture memory on the
  device that already forced per-zone loading.
- **No edge-cropped framing pieces until Phase 3.** Nothing can draw them.
- **No baked ground shadows.** §5.
- **No A/B pairs that differ only in handedness.** `flipX` is free.
- **No "make some frost assets".** One asset, one brief, every field filled.
