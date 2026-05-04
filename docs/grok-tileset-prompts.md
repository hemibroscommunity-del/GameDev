# Grok Imagine prompts — per-zone tilesets

One prompt per zone. Each one:
- Targets a 1024×1024 image with a 32×32 grid (32-px tiles).
- Pulls the zone's palette and element themes from `src/data/zones.js`.
- Uses the same row layout convention so `tools/process_grok_tileset.py --split 13-16=plant --split 17-24=buildings` produces walkable + solid tilesets without per-zone tuning.
- Ends with the same hard constraints (no text, hard pixels, no halos) so the cleaner tool gets clean input.

After you generate a tileset, save the raw output to `assets/tilesets-source/<zone>.png`, then run:

```
python tools/process_grok_tileset.py assets/tilesets-source/<zone>.png <zone> \
  --split 13-16=plant --split 17-24=buildings
```

(Drop `--split` flags if a zone's row 13–24 don't carry plants/structures.)

---

## Town

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Cozy medieval village hub. Mossy cobblestone, packed-earth roads,
timber-and-thatch buildings, fenced gardens, a town square with a well.
Palette anchored on warm forest greens (#4a6741), tan packed-dirt paths
(#8b7355), and lighter mossy accents (#5a7a50). Friendly, lived-in,
inviting — this is the safe hub the player returns to.

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — short grass, mossy grass, trampled
               grass, packed-earth.
  Rows 5-8   : path variants — cobblestone road, dirt road, brick road,
               road-edge transitions.
  Rows 9-12  : water variants — village fountain center, fountain edge,
               pond, small stream, stone-edged water transitions.
  Rows 13-16 : trees and large plants — oak, fruit tree, hedge bushes,
               flower beds, vegetable rows.
  Rows 17-20 : rocks, walls, stone fences — low cobble walls, wooden
               fence posts, wood gate, stone-and-mortar wall pieces.
  Rows 21-24 : structures in 2x2 chunks — timber-frame houses with thatch
               roofs, blacksmith forge, market stall, well, church spire.
  Rows 25-28 : decorations — barrels, crates, hay bales, wagons, lanterns,
               flower pots, bunting flags.
  Rows 29-32 : transitions and corner pieces between grass/path/water
               and between path/cobble.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects (clean white, not patterned).
```

---

## Starting Meadow

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Bright open meadow at the edge of civilization — gently rolling
grasslands, scattered wildflowers, a slow-running creek. Tone is hopeful
and welcoming. This is the player's first wilderness zone, level 1-10.
Palette anchored on lush deep greens (#3d6b2e), warm tan paths (#7a6a45),
and bright vivid green accents (#5a9a40). Daylight, slight breeze.

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — short meadow grass, wildflower grass,
               clover patches, taller wild grass.
  Rows 5-8   : path variants — packed-earth trail, single-tile footpath,
               wider beaten path, path-edge transitions.
  Rows 9-12  : water variants — slow creek center, creek edges with
               reeds, small pond, lily-pad pond, stepping-stone crossings.
  Rows 13-16 : trees and large plants — birch, willow, scattered shrubs,
               berry bushes, wild fern clusters.
  Rows 17-20 : rocks, walls, fence pieces — moss-covered boulders, low
               wooden fences, stone cairns, ramshackle fence posts.
  Rows 21-24 : structures in 2x2 chunks — abandoned hunter's hut, ruined
               watchtower base, hay-stacked shelter, dilapidated cottage.
  Rows 25-28 : decorations — wildflowers (red, blue, yellow), butterflies
               at rest, mushroom rings, fallen logs, bird's nests.
  Rows 29-32 : transitions and corner pieces — grass-to-path, grass-to-
               water, grass-to-fence, with curves and inside corners.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects.
```

---

## Ember Fields

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Volcanic plains baked under a red sky. Cracked basalt ground,
sulfur-tinted dirt, lava streams, scorched stone outcroppings, charred
plants. Element: flame (primary) + stone (secondary). Mood is hostile,
heat-shimmering, dangerous. Level 1-10 wilderness.
Palette anchored on dark scorched browns (#5a3a2a), warm tan ash paths
(#8b6545), and glowing red-orange accents (#a04020). Slight overall
warm-red atmospheric tint.

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — cracked basalt, scorched dirt, ember-
               flecked ash, dried magma crust.
  Rows 5-8   : path variants — soot trail, obsidian-paved road, bare
               stone walkway, path-edge transitions.
  Rows 9-12  : water variants — flowing LAVA (deep glowing core, edges
               with a darker crust), bubbling magma pools, lava-to-stone
               transitions.
  Rows 13-16 : trees and large plants — charred dead trees, black skeletal
               branches, scorched cacti, glowing ember-flower patches.
  Rows 17-20 : rocks, walls, cliff edges — basalt boulders, obsidian
               shards, jagged volcanic ridges, low stone walls.
  Rows 21-24 : structures in 2x2 chunks — ruined stone watchtowers,
               half-collapsed forges, blackened shrines, lava-cracked
               temple fragments.
  Rows 25-28 : decorations — bones, scorch marks, embers, glowing cracks,
               smoking braziers, cooled magma stalagmites.
  Rows 29-32 : transitions — stone-to-lava edges, ash-to-basalt fades,
               cliff-edge corners, lava-flow curves.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects.
```

---

## Mistwood

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Toxic swamp forest, perpetually fogged. Mottled green-grey ground,
poisoned puddles, gnarled half-rotten trees, glowing toxic mushrooms,
spore clouds. Element: venom (primary) + wind (secondary). Mood is
oppressive, hazy, hushed. Level 1-10 wilderness.
Palette anchored on dark muted greens (#2a4a2a), greyed-tan paths
(#5a6a45), and pale toxic green accents (#3a5a30). Slight overall green
atmospheric tint.

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — wet moss, peat, slime-coated dirt,
               mushroom-clumped soil.
  Rows 5-8   : path variants — wooden plank boardwalk, mossy stone steps,
               muddy footpath, plank-edge transitions.
  Rows 9-12  : water variants — toxic green swamp pools, deeper murk,
               bubbling poisoned water, swamp-edge with reeds and lily
               pads.
  Rows 13-16 : trees and large plants — gnarled willows with hanging
               moss, half-rotten oaks, glowing toxic mushroom clusters,
               carnivorous plants, fern thickets.
  Rows 17-20 : rocks, walls, cliff edges — mossy boulders, fallen logs,
               root-tangle barriers, low woven-stick fences.
  Rows 21-24 : structures in 2x2 chunks — abandoned witch's hut on
               stilts, rotting fishing shack, swamp shrine with hanging
               candles, half-sunk wagon.
  Rows 25-28 : decorations — toad-stools, fireflies, glowing spores, bone
               piles, hanging vines, hex symbols carved into wood.
  Rows 29-32 : transitions — moss-to-water edges, dry-to-swamp fades,
               plank-to-mud, with curves and inside corners.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects.
```

---

## Frozen Shore

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Glacial coast. Snow-covered ground, cracked sea ice, pebbled
beach, looming pine forest at the snowline, frozen waterfalls, distant
storm clouds. Element: frost (primary) + storm (secondary). Mood is
cold, vast, quiet, with a hint of brewing weather. Level 1-10 wilderness.
Palette anchored on cool blue-greys (#5a6a7a), pale icy paths (#8a9aaa),
and deep navy accents (#3a5a8a). Slight overall cool-blue atmospheric tint.

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — fresh snow, packed snow with footprint
               trails, snow-with-grass-poking-through, frozen earth.
  Rows 5-8   : path variants — pebble beach trail, ice-cracked walkway,
               packed-snow road, path-edge transitions.
  Rows 9-12  : water variants — sea ice (deep dark blue cracks),
               half-frozen tidepools, open dark water with floating ice
               chunks, water-to-ice edges.
  Rows 13-16 : trees and large plants — snow-laden pines, bare birch,
               icicle-hung branches, dead bushes, frostbitten ferns.
  Rows 17-20 : rocks, walls, cliff edges — snow-capped boulders, ice
               shelf edges, wind-carved cliff faces, low stone walls
               half-buried in snow.
  Rows 21-24 : structures in 2x2 chunks — Nordic log cabin with smoking
               chimney, frozen lighthouse base, abandoned ice-fishing
               hut, half-collapsed wooden pier.
  Rows 25-28 : decorations — frost crystals, animal tracks, fishing
               nets, shipwreck debris, runic stones, broken oars.
  Rows 29-32 : transitions — snow-to-ice edges, beach-to-water, snow-to-
               stone fades, with curves and inside corners.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects.
```

---

## Thunder Peaks

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Storm-wracked mountain plateau. Dark wet stone, lightning-scorched
ground, perpetual rain, jagged peaks, scorched dead trees, ozone-smelling
air. Element: storm (primary) + flame (secondary, from lightning
strikes). Mood is electric, threatening, kinetic. Level 1-10 wilderness.
Palette anchored on dark slate greys (#4a4a5a), wet stone path tones
(#6a6a7a), and electric purple accents (#7a5aaa). Slight overall
purple-storm atmospheric tint.

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — wet slate, lightning-scorched stone,
               cracked obsidian, ash-streaked rock.
  Rows 5-8   : path variants — slick stone road, fissured walkway,
               metal-veined trail, path-edge transitions.
  Rows 9-12  : water variants — rain-pooled puddles, electrified pools
               with arcing energy, runoff streams, water-to-stone edges.
  Rows 13-16 : trees and large plants — lightning-struck dead pines,
               gnarled black trees with glowing scars, thunder-fern
               clusters, charged crystal flowers.
  Rows 17-20 : rocks, walls, cliff edges — jagged peaks, lightning-cracked
               boulders, glowing copper veins through stone, sheer cliff
               faces with metal deposits.
  Rows 21-24 : structures in 2x2 chunks — ruined stormcaller tower with
               crackling top, lightning-rod shrine, abandoned mine shaft
               entrance, copper-domed temple fragments.
  Rows 25-28 : decorations — lightning-glass shards, arcing energy
               sparks, weather-worn standing stones, broken metal
               lanterns, bird skeletons.
  Rows 29-32 : transitions — stone-to-puddle edges, scorched-to-clean
               stone fades, plateau-to-cliff corners.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects.
```

---

## Deep Hollows

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Underground stone labyrinth — mining tunnels, cave passages, dim
torchlight, mineral veins, deep crystal pools, fossilized bones in
strata. Element: stone (primary) + venom (secondary, from cavern lichens
and pools). Mood is claustrophobic, ancient, weight-of-earth heavy.
Level 1-10 wilderness.
Palette anchored on cool dark greys (#3a3a3a), mid-grey paths (#5a5a5a),
and warm earthen-brown accents (#6a5a4a). Cavern darkness — most cells
should feel dim, with isolated bright crystal/torch glints.

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — rough stone floor, gravel, dirt-patched
               cavern floor, dust-coated bedrock.
  Rows 5-8   : path variants — worn stone walkway, mining cart rails,
               cobble-paved chamber floor, path-edge transitions.
  Rows 9-12  : water variants — dark underground pools, glowing
               crystal-lit water, deep-cavern lake, slow-dripping
               water-stone edges.
  Rows 13-16 : trees and large plants — luminous cave mushrooms, pale
               cave moss, glowing fungus clusters, mineral-vein roots.
  Rows 17-20 : rocks, walls, cliff edges — stalagmites, stalactites
               (hanging), jagged cave walls, crystal-vein boulders.
  Rows 21-24 : structures in 2x2 chunks — broken mining shaft head,
               ancient stone altar, collapsed pillar, miner's tool
               shed, gem-vendor stall.
  Rows 25-28 : decorations — pickaxes, ore carts, lanterns, mineral
               clusters, fossil patches, scattered bones.
  Rows 29-32 : transitions — stone-to-pool edges, lit-to-shadow fades,
               passage-to-chamber corners.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects.
```

---

## Sky Reaches

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Floating sky islands above the cloud line. Pale stone platforms
suspended over endless blue, wind-carved arches, drifting cloud banks
under the player's feet, ancient airy ruins. Element: wind (primary) +
frost (secondary, high-altitude chill). Mood is serene, weightless,
slightly vertigo-inducing. Level 1-10 wilderness.
Palette anchored on pale blue-greys (#6a7a8a), bright pale-blue paths
(#aabbcc), and silvery accents (#8a9aaa). Soft, bright, high-key — much
of the image should read as "above the clouds in sunlight".

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — pale weathered stone, wind-scoured
               flagstone, mossy stone, sky-grass tufts on stone.
  Rows 5-8   : path variants — polished stone road, wind-rune walkway,
               narrow bridge plank, path-edge transitions.
  Rows 9-12  : water variants — sky-mist pools (translucent pale blue),
               reflective stone basins, drifting cloud "water" tiles
               (player can stand near but not on), edges.
  Rows 13-16 : trees and large plants — wind-bent silver pines, floating
               pale-leafed shrubs, sky-flower clusters, drifting seed
               pods.
  Rows 17-20 : rocks, walls, cliff edges — wind-carved stone arches,
               broken airy columns, low ruined walls, edge-of-island
               cliff faces showing falling cloud beneath.
  Rows 21-24 : structures in 2x2 chunks — sky-temple gazebo, broken
               windmill, levitating shrine fragment, half-fallen
               stone tower.
  Rows 25-28 : decorations — silver bells, wind-chime cords, prayer
               flags, feather piles, weather vanes, drifting petals.
  Rows 29-32 : transitions — stone-to-cloud edges (with falling-off
               vertigo cues), grass-to-stone fades, bridge corners.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects.
```

---

## Tidal Caves

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Sea caves at low tide — wet barnacled rock, kelp forests
half-submerged, glowing bioluminescent pools, scattered shipwreck
timbers, salt-crusted ledges. Element: water (primary) + venom
(secondary, from cave anemones and toxic kelp). Mood is briny, echoing,
mysterious. Level 1-10 wilderness.
Palette anchored on deep teal-greys (#2a4a5a), mid-teal paths
(#4a6a7a), and saturated ocean-blue accents (#2a6a9a). Damp, cool,
slightly moonlit-feeling.

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — wet sand, barnacled stone, kelp-strewn
               rock, salt-crusted cave floor.
  Rows 5-8   : path variants — wet stone walkway, plank-and-rope
               boardwalk, sandy trail, path-edge transitions.
  Rows 9-12  : water variants — tidepool (deep), shallow tidepool with
               anemones, glowing bioluminescent pool, water-to-rock
               edges with foam.
  Rows 13-16 : trees and large plants — kelp forests (tall blades),
               sea-fern clusters, coral outcroppings, glowing
               anemones.
  Rows 17-20 : rocks, walls, cliff edges — barnacle-covered boulders,
               jagged sea-stack pillars, half-submerged cliff faces,
               wet stone arches.
  Rows 21-24 : structures in 2x2 chunks — half-sunken shipwreck hull,
               abandoned dockmaster shack, smuggler's cave entrance,
               broken lighthouse base.
  Rows 25-28 : decorations — seashells, starfish, fishing buoys,
               coiled rope, treasure-chest fragments, anchor pieces.
  Rows 29-32 : transitions — sand-to-water edges with foam, rock-to-
               kelp fades, dock-to-water corners.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects.
```

---

## Shadow Sanctum (endgame, optional for now)

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Endgame dark cathedral. Black marble floors, crypt corridors,
purple-flame braziers, looming gargoyle statues, void-tinged stained
glass. Element: dark. Mood is solemn, oppressive, final. Level 81-100
endgame.
Palette anchored on near-black blue-purples (#1a1a2a), slightly lighter
path tones (#2a2a3a), and muted purple-violet accents (#3a2a4a). Very
dark overall — most pixels should be near-black, with isolated purple
ember/glow accents punctuating each cell.

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — black marble, cracked obsidian, void-
               tinted stone, deep-shadow tile.
  Rows 5-8   : path variants — polished crypt walkway, blood-rune-
               carved walkway, gravel-and-bone trail, path-edge
               transitions.
  Rows 9-12  : water variants — void pools (pure black with purple
               edges), shadow-reflecting basins, drifting dark-energy
               pools, edges.
  Rows 13-16 : trees and large plants — twisted dead trees with no
               leaves, black thornbushes, soul-flower clusters with
               pale purple glow, dead vines.
  Rows 17-20 : rocks, walls, cliff edges — gargoyle-carved walls,
               crypt-stone slabs, low iron fences, broken pillar
               fragments.
  Rows 21-24 : structures in 2x2 chunks — sealed sarcophagus, void-
               altar with floating skulls, ruined cathedral nave
               fragment, gargoyle pedestal.
  Rows 25-28 : decorations — black candles with purple flame, skull
               piles, chained tomes, ritual circles, hanging chains.
  Rows 29-32 : transitions — marble-to-pool edges, lit-to-void fades,
               crypt-corridor corners.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects.
```

---

## Radiant Heights (endgame, optional for now)

```
A 32x32 grid of game tiles in pixel art style. The full image is exactly
1024x1024 pixels and each cell is exactly 32x32 pixels.

Theme: Endgame celestial heights. Sun-bleached marble, golden-roofed
temples, blazing braziers, halo-flecked statues, white-hot light.
Element: light. Mood is overwhelming, brilliant, divine. Level 81-100
endgame.
Palette anchored on warm tan-golds (#6a6a4a), bright golden-cream paths
(#aaa870), and saturated yellow-gold accents (#ccc060). Bright overall —
most cells should read as "lit by intense direct sun".

Rows top-to-bottom must contain:
  Rows 1-4   : ground variants — sunlit marble, gold-flecked stone,
               sun-bleached flagstone, polished travertine.
  Rows 5-8   : path variants — gold-inlaid road, mosaic-tile walkway,
               polished marble path, path-edge transitions.
  Rows 9-12  : water variants — reflective pools (mirror-bright),
               cascading sunlit fountains, sacred stream tiles, edges
               with golden mosaic borders.
  Rows 13-16 : trees and large plants — olive trees, golden-leafed
               cypress, halo-glowing flower clusters, white-blooming
               vines.
  Rows 17-20 : rocks, walls, cliff edges — pale marble columns, broken
               pediments, low gold-trimmed walls, sun-hot stone slabs.
  Rows 21-24 : structures in 2x2 chunks — open-air temple gazebo,
               golden-domed shrine, sun-disc altar, pillared
               processional gateway fragment.
  Rows 25-28 : decorations — laurel wreaths, golden chalices, censers
               with rising white smoke, holy banners, prayer scrolls.
  Rows 29-32 : transitions — marble-to-pool edges, sun-to-shade fades,
               temple-courtyard corners.

Hard constraints: consistent palette across the whole grid, no text,
no numbers, no borders or grid lines between cells, pixel-perfect with
hard pixel edges, no anti-aliasing, no gradient halos around objects,
solid white background between objects.
```

---

## Tips for working with Grok Imagine

- **Iterate the prompt, not the seed.** If a generation has a row that's empty or a row that drifted off-theme, edit *that row's description* to be more specific and re-run. Don't reroll blindly.
- **The constraint paragraph at the bottom matters most.** "Pixel-perfect, no anti-aliasing, no halos" prevents the most common quality problem. Keep it verbatim across zones.
- **If the grid drifts off-32px**, generate again — Grok's first try usually nails the grid; a drift means it interpreted the prompt as "sketch a vibe" instead of "produce a tilesheet". Be more emphatic on "32x32 grid" and "1024x1024 image".
- **Solid white background between objects** is what `tools/process_grok_tileset.py` flood-fills out. If Grok produces a coloured background, the cleaner won't strip it. You can ask for "pure white (255,255,255) inter-cell space" if needed.
- **Two-cell objects (2x2 chunks for buildings) are mentioned in rows 21–24.** Grok will sometimes draw a building that spans more than one cell — that's fine, the slicer doesn't care, you just reference both halves of the building when authoring the map.
