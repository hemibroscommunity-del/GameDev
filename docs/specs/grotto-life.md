# The Goo Grotto moves (v2.3.3567)

The owner, about their four Goo Grotto pictures once they were in the game
(v2.3.3566, docs/specs/dungeon-art.md): "You can use code to make those a bit
more animated for the water effects and such. Maybe a little Breeze for the
ferns?"

The pictures themselves never change. Everything here is drawn over them, in
code, at the places the art tool reads off each picture.

## What moves

### At the entrance, out in the world

| What | How it moves |
|---|---|
| The slime hanging in the cave's mouth | At each of its 7 drips, a drop swells under the tip, lets go, falls to the cave's floor and splashes (a ring and two droplets). Then another forms. Each drip keeps its own time, so they never fall together. |
| The slime on the cave's floor and spilling out | Bubbles swell and pop at 12 spots, and the surface glints. |
| The four ferns | They sway in the world's wind, about their bases: the two big ones in front of the mound's corners and the two small ones up on its shoulders. |

### Inside the arena

| What | How it moves |
|---|---|
| The two torch posts | Each iron basket burns. The flame is the campfire's own pixel flame, so nothing new is loaded. It sits behind the basket's front bars, sparks climb off it, and a warm light flickers on the floor round the post. |
| The three puddles and the junk heap | They bubble and glint. The heap's coins glint gold. |
| The three mushroom clusters | Glowing spores float up off their caps, drift and go out. |
| The north wall | Drops run down its slime streaks and splash at its foot. |
| The two ferns | They sway in the wind, like the entrance's. The tangle of roots doesn't. |

## Where it moves: read off the pictures

`tools/world/add-dungeon-art.mjs` reads each picture as it cuts it and writes
the points into `src/data/dungeonArt.js`. A new cut moves them with the art.

- **Slime colours.** Each picture has its own: the entrance's deep blue, the
  wall's teal, the puddles' bright blue. The drops and bubbles are drawn in
  their own picture's colours.
- **The entrance's drips** are given by eye, as shares of the picture, and the
  tool snaps each one to the bottom pixel of its drop. Finding them on their
  own missed the drops with a dark rim and took a slime sheet's edge for a
  drip. Each drip also records the row its drop lands on: the first lit pixel
  under it.
- **The wall's drips** are found on their own: the bottom of each narrow run of
  slime with nothing under it.
- **A torch's basket** is the lowest row near its top with daylight between
  its bars.
- **Wet spots, caps and coins** are points spread over the slime, the
  mushrooms' caps and the gold.
- **The entrance's ferns** are cut out of its picture. A flood fill spreads
  through each fern's leaves from a seed, inside boxes drawn by eye. The moss
  on the rocks beside them is paler, so the fill stops there.
  - The four cut-out ferns are packed under the picture in the same file
    (880 × 603: the picture is the top 880 × 441).
  - Where a fern was, the picture keeps the fern's darkest green, the shade
    under its leaves. Where its leaves hung over the grass, the picture is
    see-through instead. So when a leaf sways aside, what shows is its own
    shadow or the grass.
  - Each fern stands where it was cut from, so at rest the entrance looks
    exactly as the owner's picture.

## How it is drawn

`src/rendering/grottoFx.js`.

- **Never a rebuild.** Every drop, ring, bubble, glint, spark and spore is a
  sprite made once and then only moved, scaled and faded. Nothing is added,
  removed, hidden, or given a picture from another file while it plays. So
  Pixi never has to rebuild the draw list of the layer it is in (TRAPS §218).
  The torch's flame steps through frames of the one campfire picture, which
  doesn't rebuild either.
- **The little pictures** for the drops, bubbles and lights are minted in code
  for each slime's colours: a strip about 40 × 7 px, a few hundred bytes.
  - The entrance's are made as its picture loads, and freed with it.
  - The arena's are made behind the dungeon's loading screen (game/
    dungeonArt.js), and freed when the arena's pictures are.
  - The campfire's flames are made there too, if no fire has been lit yet.
- **What draws in front of what:**
  - the entrance's drops, bubbles and ferns are in the mound's own container,
    so they sort with it;
  - a torch's fire is in a holder 1 px north of the post, so the depth pass
    draws it just before the post, with the basket's front bars over the
    flame;
  - the heap's and the mushrooms' effects ride on their sprites;
  - the puddles' and the wall's effects lie on the ground, under everyone.
- **The ferns' sway** is worldLife.js's own spring and wind, the same as the
  world's bushes: a `fern` kind, quick and light, its tips moving a couple of
  pixels.
- **The calm switch.** Under the QA harness's calm switch everything holds
  still: no drops, bubbles, glints, sparks or spores, every fern upright, and
  each torch on one frame.
- **Probe:** `window.__btGrottoFx()` counts what is running and how many pieces
  are showing.

## Also fixed: the line across the entrance

Since v2.3.3566 a faint straight line ran across the entrance's lower rocks
and ferns, at the row where the picture is split (the mound stands above it,
the spilled slime lies flat below it). The world's form shading darkens a
standing object toward its foot, so the mound was at its darkest on that row,
while the flat half started as painted.

Now every piece takes the mound's own shading at its height:
- the cut-out ferns their band of it, the two big ones darkening to the
  mound's foot shade at their bases, as any plant standing in the world does;
- the drops the shade where they form and land;
- the flat slime starts at the mound's foot shade and fades back to as painted
  at its far edge, where it meets the grass.

The other fix that comes to mind, the characters' one gradient over a whole
container, would have sent the painted mound to the characters' sharp
sampler (TRAPS §248).

## Tests

- **`server/test/dungeon-art.test.mjs` §6** checks the data:
  - every picture's slime colours, darkest first;
  - the entrance's drips hang above its floor, each with room to fall;
  - its wet spots lie on its floor and its spill;
  - its four ferns are in its file under the picture, each standing where it
    was cut from on its own base, two big ones in front and two up high;
  - the wall's drips have room to fall;
  - each torch's basket is at its top;
  - every puddle, heap, mushroom point is inside its frame;
  - only ferns sway.

  Eight deliberate breakages are all caught.
- **`mp-grottolife`** plays it on a phone (390 × 844, touch, in the world) with
  the calm switch off:
  - drops form, fall and splash at the entrance, its pools bubble and glint,
    and its ferns sway about bases that never move;
  - under the calm switch it all holds still;
  - inside, both torches burn behind their bars, the puddles, heap and
    mushrooms move, drops run down the wall and the ferns sway;
  - with the arena cleared, the layers' draw lists rebuild no more often with
    the effects running than held still;
  - leaving takes the arena's effects with it.

  Pictures: `tools/qa/mp/out/grotto-life-*.png`.
