# The farm trip lets go of the Wheel (v2.3.3705)

The owner, 2026-10-28: *"Memory seems to be the persistent bottleneck in terms
of performance in this game. Getting that to run as low as possible without
sacrificing performance is the goal."*

## What happened

Every place in the game frees its own pictures when you leave it: walking out
of the Wheel lets its lands' banner strips, the signposts' icons, the
buildings' pictures and every monster look go (preloadAnimations.js
`freeZoneAssets`, from zoneTransitions), and so does a dungeon's way in
(gameEvents' `dungeon_started`, `releaseLeftZoneArt`).

The farm is reached another way. The Feed & Seed's "Visit Your Farm", the old
Farm window and the Land Office's "Travel to Farm" each set the farm straight
in, with no zone change, and then wait for its pictures under its loading
screen (game/farmTrip.js `holdFarmUntilReady`, v2.3.3136). Nothing on that way
let the Wheel go, so for the whole visit the page held, beside the farm's own:

- the four lands' banner strips (Frost Ridge, the Flame Fields, the Wind
  Dunes, the Verdant Wilds): decoded images held by the page, not textures,
  2,205 x 410, 2,043 x 382, 2,250 x 518 and 2,268 x 474 px, 15 MB in all;
- every monster look loaded near where you stood;
- the signposts' eight land icons and the buildings' sixteen pictures (under
  1 MB).

(The Wheel's ground, objects and townsfolk were already let go: they go
whenever the Wheel stops drawing, `wheelOnStop`.)

## What it does now

- `rememberFarmTrip` (wheelTownDoors.js), which those three ways already call
  just before they set the farm in, also notes the zone the trip leaves
  (`S._farmLeaving`).
- `holdFarmUntilReady`, the one call every way onto the farm makes, releases
  that zone's pictures exactly as a dungeon's way in does
  (`releaseLeftZoneArt(left, 'farm_home')`): a beat late, as the renderer has
  not yet seen the change of place.
- The way back out through the farm's gate goes into the Wheel by its own zone
  change, so all of it is loaded again behind its loading screen, as after a
  dungeon.
- The Dungeon Workshop's dungeons on their way home name no zone: they leave
  a dungeon, not the Wheel (what they hold is not touched here).

## Measured

`mp-farmfree` on the QA phone: out at the Flame Fields' first monsters, then
"Visit Your Farm".

| | main | with this |
|---|---|---|
| the lands' banner strips held on the farm | 4 (Wind Dunes, Flame Fields, Verdant Wilds, Frost Ridge) | 0 |
| the buildings' pictures / the signposts' icons | 16 / 8 | 0 / 0 |
| the monster looks loaded where you stood | the fire goblin's 16 sheets, the Wheel's footprints | none |
| the page on the farm, on the GPU / cached (MB) | 81.4 / 106.7 | 75.2 / 92.8 |

About 20 MB less for the whole visit (6 on the graphics chip, 14 of decoded
pictures: the fire goblin's sheets and the icons), and the banner strips' 15 MB
on top, which neither reading counts (they are images in the page, not the
game's textures: zoneBannerPreload.js).  A trip from BroTown itself, with no
monster look loaded, saves the strips and the icons (mp-farmwalk's reading,
GPU and cache, is 167 MB either way).  Back out through the gate everything is loaded again behind the
world's loading screen, as after a dungeon: the four strips, sixteen pictures,
eight icons, the minimap wearing the buildings' pictures, the fire goblins'
look where you left (both builds alike).

## Tests

- **`mp-farmfree`**: the Wheel's own pictures in, in BroTown; out at the
  Flame Fields' first monsters, their look loaded; the Feed & Seed's "Visit
  Your Farm" (a real touch) onto the farm, all of it drawn; on the farm none of
  the Wheel's pictures held (no banner strip, building's picture, signpost
  icon or monster look); back out through the gate every one of them loaded
  again, the minimap wearing the buildings' pictures, the monsters' look back;
  no page errors.  On the build before it, step 4 finds all of them held.
