# The town on the minimap: only the pictures, and four that say what they are (v2.3.3678)

The owner, 2026-10-27:

> I also want the building shapes behind the town icons to go away so only the
> icons are left. But I also want to double check all the icons because not all
> of them make sense.

## Only the pictures

Each building in BroTown stood on the minimap as a terracotta footprint with a
light door notch, its picture (20 px, v2.3.3630) over it. Now the picture alone
is drawn, on the middle of the ground its building stands on
(`src/rendering/systems/wheelMinimap.js` `_drawFootprints`).

A footprint is still drawn for a building whose picture has not loaded (it goes
the moment the picture is up), so the town is never blank.

## Every picture, checked at 20 px

| Building | Was | Now | Why |
|---|---|---|---|
| Town Hall | bell tower | (kept) | a town hall's bell |
| Blacksmith | anvil | (kept) | |
| Woodworker | saw on a plank | (kept) | |
| **Gem Works** | grinding wheel | **gem and chisel** (the Gem Cutting skill's) | the wheel was a muddle at 20 px |
| Sheriff's Office | crossed swords | (kept) | what you do there: duels and the arena. A star would be confused with the quest's gold star on the same minimap |
| Saloon | mug | (kept) | |
| Gambling Den | dice | (kept) | |
| Hotel | bed | (kept) | |
| Post Office | letter | (kept) | |
| Cookhouse | pot on a fire | (kept) | |
| **Feed & Seed** | red barn | **sprout in soil** (its own window's picture) | a barn says "farm", not a seed shop |
| **Land Office** | parchment map | **red barn** (its own window's picture) | a map on the minimap read as "open the world map"; the barn is free now |
| Guild Hall | banner | (kept) | |
| Bank | vault door | (kept) | |
| **General Store** | balance scales | **shop awning and coin** | the scales read as a court |
| Auction House | gavel | (kept) | |

Each new picture is one the game already shows elsewhere, at the same address,
so nothing new is loaded. The Enter button at each door wears the same picture
(it reads the same table, `src/data/wheelBuildingDoors.js`
`WHEEL_BUILDING_ICONS`).

## Checked

`mp-wheelmap`, moved to the world (it began in the retired old town and walked
down its stairs; it now starts in BroTown as a player does, and its way off the
Wheel is the farm): **38 of 38**. Among them:
- every building on the minimap, its picture on it, **no footprint drawn**
  (the probe's count, 0) and none of the roofs' terracotta outside the pictures;
- the four new pictures loaded for their buildings;
- the world map's town view, the Frost Ridge walk, the farm's own small minimap.

`test-world-core`: 495 of 495 (its picture check updated; and its keeper check,
which read one line of `desktopControls.js` word for word, now reads it as a
pattern: #1151 had added the townsperson's hum to that line, so the check had
failed on main since).

Found on the way, not fixed here: the farm trip sets the zone straight in, so
the Wheel's art (its lands' banner strips, about 16 MB decoded, the buildings'
pictures, the signposts' icons) stays held while you are on the farm.
