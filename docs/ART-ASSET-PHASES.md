# BroTown Environment Art — Phased Asset Plan (v2.3.2642)

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

What it does *not* give you is a near-camera framing layer. See §3.

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
> map: 6.00 MB, and no more than 8 decor assets.**

Memorable, and it lands in the right place — at 512 long edge that is six
large pieces, or a mix of large and small. It is a per-zone figure because
only one zone's art is resident at a time (`preloadZoneAssets` /
`freeZoneAssets`), so the cap is also the peak.

**Anything per-zone must load per-zone.** Today prop art does not:
`propSpriteSources()` feeds the *global* startup gate via
`src/rendering/npcSprites.js:84`, so a frost prop added naively downloads on
every player's loading screen and stays resident for the life of the page.
Fixing that is Phase 1 code work (§7), not an art constraint — but it is the
reason no zone decor exists yet.

## 3. The split that decides whether art is usable: free-standing vs cropped

The draft plan's primary split was *reusable-neutral vs map-specific*. That
is a useful thing to know, but it is not what decides whether a finished
asset can go in the game. This is:

| | Free-standing | Edge-cropped |
|---|---|---|
| **Shape** | complete object, ink nowhere near its canvas edge, sits on a base | subject runs off its own canvas edge; a corner or border piece |
| **Has a ground-contact line?** | yes — the bottom of the art | no |
| **Consumed by** | `WORLD_PROPS` + `depthSort.js` | **nothing — no code path exists** |
| **Ships** | today, art-only change | after `DEPTH-ROADMAP` item 5 |

`depthSort.js` sorts everything in the world by its **ground-contact line**,
which it reads as the sprite's `y` — and every world sprite is anchored
bottom-centre. An asset with no base has no sortable position, and there is
no screen-space foreground layer to hang it on instead: `WORLD_LAYER_NAMES`
(`src/rendering/pixiApp.js:54`) has no foreground entry, and a search of
`src/rendering/`, `src/data/` and `src/game/` for a foreground, decor or
map-overlay concept returns nothing.

**Commission free-standing pieces until item 5 lands.** They are the ones
that pay off immediately.

Two consequences for the brief, both cheap to state and expensive to discover
late:

- **The lowest opaque pixel must be the point that touches the ground.** If a
  canopy overhangs below the trunk's base, the prop sorts by the canopy and
  the occlusion is wrong.
- **Leave no empty canvas.** The importer trims to the alpha bounding box
  anyway, but a subject floating in a 1254² canvas is a sign the generator
  was not told a size, which is also how it ends up over-resolved.

## 4. Size table, taken from the art that already ships

The design-target phone shows `REF_VIEW_W = 390 × WORLD_ZOOM(3.0) = 1170`
world pixels across a 390 CSS-pixel screen (`src/game/worldViewport.js`,
`src/data/constants.js`). So one world pixel is 0.33 CSS pixels, and at
devicePixelRatio 2–3 that is **0.67–1.0 device pixels**.

**Texture pixels beyond an asset's own world size are never resolved on the
primary platform.** A 1:1 ratio of texture pixels to world pixels is already
generous. The shipped buildings sit exactly there — 512 px of art drawn at
500–550 world px — and the small props are well past it (the anvil is 256 px
of art at `worldH: 52`, a 4.9× over-resolve; the bench 209 px at 75).

Non-town zones are 32×32 tiles at `TILE = 32`, so **1024×1024 world px** —
the whole zone is roughly one screen wide. Town is 68×72 tiles (2176×2304).
A person is 120 world px tall (`NPC_SPRITE_SCALE`).

| Class | World size | Art long edge | RGBA | Examples |
|---|---|---|---|---|
| Ground cue, particle, puff | 20–60 | **128** | 0.06 MB | footprint, snow puff, dust, sparkle |
| Small prop | 50–120 | **256** | 0.25 MB | shrub, stump, small rock, stake, sign |
| Medium mass | 120–300 | **384** | 0.56 MB | rock cluster, pine clump, snowbank |
| Large mass / canopy / ridge | 300–550 | **512** | 1.00 MB | cliff lip, ridge, big canopy, building |
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

## 6. Batch 1, measured

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
loss. Suggested placement values from the tool: `worldH: 260, blockW: 438,
blockD: 91`.

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

### Phase 1 — per-zone decor, and the first free-standing masses

**Code first, and it is small.** Per-zone decor loading does not exist:
prop art rides the global startup gate (§2). It needs

- a per-zone decor list (`WORLD_PROPS` already filters by zone via
  `propsForZone`; it currently holds nine props, all `zone: 'town'`),
- its art loaded in `preloadZoneAssets(zoneId)` through
  `loadTracked('decor:' + zoneId, url)` and freed in
  `freeZoneAssets(from, to)` via `unloadBundle`, matching how the snowman
  and the zone banner already work,
- `propSpriteSources()` split so only global props reach the startup gate.

**Then the art**, free-standing only, ~4–6 pieces per zone inside the cap:
rock clusters, pine clumps, snowbanks, boulder groups, frozen stumps, dead
shrubs. Frost first — batch 1's ridge is the first one and is ready.

**Placement caution:** every prop blocks, since v2.3.2073 ("make sure the
objects are unwalkable"), so each one adds a `blockW`/`blockD` collision box
to a live zone. Frost's walk mask already has a known fault — *"north ice
flat over-blocked by the mask; repaint to open it"*
(`src/rendering/tiledMaps.js:177`) — so placements want checking against the
mask, not just against the painting.

### Phase 2 — grounding cues

`DEPTH-ROADMAP` §7, currently at zero. Footprints, snow puffs, dust, impact
scuffs, harvest puffs, pickup glints. 128 px, cheap, no light-direction
commitment, and they fix the floating-sticker feeling that the removed
ellipse was reaching for. Each needs a draw site; the fx-strip machinery
(`src/rendering/fxStrips.js`) is the pattern to follow, and anything global
registers in `preloadWorldAnimations` per the preloading law.

### Phase 3 — near-camera foreground framing

**`DEPTH-ROADMAP` item 5, and the only phase that is blocked on a renderer
feature.** Cropped canopies, cliff lips and branches drawn in front of the
player and cut off by the screen edge. Needs a foreground layer in
`WORLD_LAYER_NAMES` and a per-zone overlay list. Its perf risk is the
roadmap's own *"medium — watch this one"*.

Batch 1's three cropped pieces are held for this phase. **Do not commission
more of them until the layer exists** — that is where the wasted generation
budget went.

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
