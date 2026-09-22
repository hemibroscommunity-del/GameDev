# Frost decor — raw generator output

**Raw, as delivered**: 1254×1254 (the ridge 1448×1086), which is 6.00 MB of
decoded RGBA each — the same texture cost as an entire zone map. Kept at
source resolution so an asset can be re-exported at a different size without
re-generating it. Processed on the way into `public/` by:

```sh
node tools/import-decor-art.mjs --report --long=384 --world=160 <file>
node tools/import-decor-art.mjs --long=384 --out=public/sprites/props \
    --name=frost-pine-pair <file>
```

## Batch 2 — midground masses (2026-09-22) — all FREE-STANDING, all placeable

Sizes are matched to the scale `frost_v5.webp` is *painted* at, not to
physical plausibility: the map's own near-field pines measure **95–115 world
px** and a person is 120, so in this world a tree is about as tall as a
person. A first pass at 280–320 rendered ~3× the scale of every baked tree in
the same frame. `blockD` is a starting point — tune it on the art's own base.

| Asset | Texture | RGBA | `worldH` | draws | `blockW` | `blockD` |
|---|---|---|---|---|---|---|
| `frost-pine-pair` | 357×384 | 0.52 MB | 160 | 149×160 | 119 | 56 |
| `frost-pine-ridge` | 378×384 | 0.55 MB | 150 | 148×150 | 118 | 53 |
| `frost-rock-mound` | 384×335 | 0.49 MB | 130 | 149×130 | 119 | 46 |
| `frost-ice-mound` | 256×179 | 0.17 MB | 100 | 143×100 | 114 | 35 |
| `frost-snow-shrubs` | 256×218 | 0.21 MB | 80 | 94×80 | 75 | 28 |
| `frost-rock-ridge` | 512×243 | 0.47 MB | 120 | 253×120 | 202 | 42 |
| **total** | | **2.41 MB** | | | | |

**2.41 MB of 6.00 MB, 6 assets of 8** — inside the per-zone decor cap in
`docs/ART-ASSET-PHASES.md` §2, with room for two more.

## Batch 1 — the three that are held

Edge-cropped: their ink runs off their own canvas, so they have no
ground-contact line, and `depthSort.js` places everything in the world by
where it touches the ground. Nothing in the renderer can draw them until the
foreground layer exists (`DEPTH-ROADMAP` item 5 / `ART-ASSET-PHASES` Phase 3).

| Asset | Runs off | Held for |
|---|---|---|
| `frost-peak-corner` | bottom 100%, left 73% | Phase 3 |
| `frost-pine-canopy-a` | left 22% | Phase 3 |
| `frost-pine-canopy-b` | bottom 67%, left 43% | Phase 3 |
