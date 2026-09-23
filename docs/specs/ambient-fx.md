# Ambient life on the maps (v2.3.2720)

> Owner: "make subtle effects that appear as animations on the worldview? Lava
> smoke on the fire mountain maybe shimmering a bit on the lava, winds on the
> desert wind area, water softly waving, etc. also doing a pass on each of the
> 4 currently playable zones to see what effect like this can be added (maybe
> occasional soft snowflakes on snow level, etc)"

## What plays

| Map | Ground (under characters) | Air (in front) |
| --- | --- | --- |
| **World View** | the volcano's lava flows breathe (slow additive glow + flickering hot core); the sea and the western river carry faint moving light lines | smoke rising from the crater; embers off the lava; glints on the water; wind streaks and blown sand across the desert; snowflakes over the snowy peaks; petals through the cherry grove |
| **Flame Fields** | every lava channel shimmers (and still shines at night) | smoke from the hottest vents |
| **Wind Dunes** | — | wind streaks you can see, dust lifting off the dune crests |
| **Verdant Wilds** | the pools ripple | glints on the pools |
| **Frost Ridge** | the sea's edge ripples | glints on the sea, ice twinkles |

The spokes' pollen and fireflies, embers, blowing sand and snow come from
v2.3.2712's `worldFx` air (`ZONE_AIR`, docs/specs/world-fx.md), which landed on
main while this was built — this layer does not repeat them. The worldview has
no `ZONE_AIR`, so every effect on it is this layer's. Lava glow and embers draw
in the `glows` layer (above the night's light map), so lava shines after dark.

## How

* **Where** comes from the paintings themselves: `tools/maps/build_ambient_spots.py`
  classifies each map's colours offline (lava, water, the brightest vents,
  the desert / snow / blossom areas) and writes `src/data/ambientSpots.js` —
  points and boxes in 0..1 of the map, stretched over the zone exactly like
  the map sprite. Re-run it when a map is repainted.
* **What** is `src/rendering/systems/ambientFx.js`: pooled sprites over four
  textures minted from canvases (dot, streak, sparkle, petal) — nothing to
  download, so nothing to preload; per-map emitters with a rate and a cap,
  spawning only inside the camera's view; ground glows exist once per spot and
  hide off-screen. Ground effects go in `groundDetails`, air effects in
  `foreground`.
* **Tuning** lives in `ZONE_FX` at the top of that file (per-map `k` scales
  every size and speed — the worldview is a vista, so its effects are smaller).

## Verified

`tools/qa/mp/mp-ambient.mjs` stands the player at each of the worldview's
five features and in each spoke, asserts the expected effects are alive
(`window.__btAmbient`), and saves a still of each. `AMBIENT_CLIPS=1` also
records 5 s of the compositor's own frames per stop (for a human to watch —
a single frame of a low-alpha ripple cannot show it). `window.__btAmbientOff =
true` hides the layer, which is how the effects' real contribution was
measured (an on/off pixel diff): the first cut was too faint to see on a phone
and was scaled up from that measurement.
