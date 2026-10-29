# The world map's marks: pictures of what they are (v2.3.3780)

The owner, 2026-10-28: "Also the legend icons for the map are terrible. Those
all need different colors and shapes that actually more closely align with
what it's describing / To be clear I'm referring to this screenshot where
monster is red dot, fish is white dot, etc".

## What changed

The world map (`src/ui/WorldMapOverlay.jsx`, M or a tap on the minimap) and
its key draw each kind of thing as a small picture of it:

| Mark | Was | Now |
|---|---|---|
| town | white square | a house (white) |
| camp | gold triangle | a tent, its flap open (gold) |
| pass | white diamond | two peaks and the gap between (pale grey) |
| gate | purple dot | an arch (purple) |
| landmark (and a place of note) | teal dot | a flag on its pole (green-teal) |
| monster | red dot | a horned head (red) |
| fish | near-white oval | a fish (water blue; its tier's tint) |
| tree | green dot | a round tree on its trunk (its tier's tint) |
| ore | orange diamond | a grey rock with a fleck of metal (the fleck its tier's tint) |
| bro | green dot | a little person (green) |

Kept: the quest star and its gold road, the townsfolk's "!" quest pins, the
Town Hall board's red and blue pins, roads, rivers and rails, your party's
blue mark, the buildings' pictures in town.  The shape carries the meaning
(colour-blind safe); the colour agrees.

## How it is built

`src/ui/mapGlyphs.js`: each glyph is SVG path data in a 16 x 16 box (a
`body` filled with its colour or a tier's tint, outlined in the map's dark
halo, and a `detail` over it: eyes, a door, the tent's flap, the fish's eye,
the trunk, the ore's fleck).  The map draws them through `Path2D` objects
built once a glyph (`glyphPath`, never per frame) with `drawGlyph`; the key
draws the same path strings as SVG.  Nothing is a picture file: no memory to
budget, nothing to preload.  Sizes: monsters 12 px, bros 13, resources 11-18
by zoom, camps and passes 14, gates 16, the town 16.  The first tier's fish
on the world map is water blue (`#79C4F2`, was near-white).

**The minimap** (`src/rendering/systems/wheelMinimap.js`) draws its own marks
in Pixi, separately; it is unchanged (a follow-up if the owner wants the same
glyphs there).

## Tests

`mp-maplegend`: upright, sideways and on a computer, at Frost Ridge's edge:
zoomed out, the key's five places are glyphs of five different shapes and the
map draws the town's house and the gates' arches; zoomed in, the key adds the
monster, ore, tree and fish glyphs and the map draws every monster and
resource it shows as its glyph (the probe's `more.glyphs`), the key on the
screen.  Pictures: `docs/art/map-legend-before-after.jpg`,
`docs/art/map-legend-key.jpg`.
