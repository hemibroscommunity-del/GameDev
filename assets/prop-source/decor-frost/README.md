# Frost decor — raw generator output (batch 1, 2026-09-22)

The first environment-decor batch generated for Frost Ridge. **Raw, as
delivered**: 1254×1254 (and one 1448×1086), which is 6.00 MB of decoded
RGBA each — the same texture cost as an entire zone map. They are kept at
source resolution so an asset can be re-exported at a different size
without re-generating it, and processed on the way into `public/` by

```sh
node tools/import-decor-art.mjs --report --long=512 --world=260 <file>
```

| File | Free-standing? | Status |
|---|---|---|
| `frost-rock-ridge.png` | yes, base is 53% of its width | **placeable today** — 512×243, `worldH: 260` |
| `frost-peak-corner.png` | no — runs off bottom 100%, left 73% | held for Phase 3 (foreground layer) |
| `frost-pine-canopy-a.png` | no — runs off left 22% | held for Phase 3 |
| `frost-pine-canopy-b.png` | no — runs off bottom 67%, left 43% | held for Phase 3 |

An edge-cropped piece has no ground-contact line, and `depthSort.js` places
everything in the world by where it touches the ground — so three of these
four cannot be drawn by any code path that exists yet. See
`docs/ART-ASSET-PHASES.md`.
