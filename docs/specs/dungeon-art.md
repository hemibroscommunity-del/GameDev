# The dungeons in the owner's pictures (v2.3.3566)

The owner asked for ChatGPT prompts instead of code-drawn walls
(docs/art/DUNGEON-ART-PROMPTS.md), made the pictures and sent the first four:
"Here's the first 4". They are the Goo Grotto's entrance, its walls, the
things that stand inside its arena, and the boss's treasure chest (one for
every dungeon).

## What each picture became

| Picture | In the game | Size |
|---|---|---|
| Entrance | The Goo Grotto's mouth in the Verdant Wilds, where the dark oval drawn in code was | 440 × 220 game px (the mound 172 tall, its slime 49 more) |
| Walls | Two strips, each made to repeat along its length: the wall's front (along the arena's top) and its top (the sides and the bottom) | Front 120 game px tall, top 68 thick |
| Things inside | All 17 stand round the arena's edges: two pillars, two torch posts by the way out, three boulders, three mushroom clusters, two ferns and the roots, three slime puddles and the junk heap | The sizes the prompt asked for: a pillar 100 tall, a torch post 110, a boulder 60 |
| Chest | Lands where the boss fell, shut, then opens. The clear's card shows the same chest | 96 game px wide |

The originals are kept in `assets/prop-source/dungeons/`.
`node tools/world/add-dungeon-art.mjs` cuts them again. It uses the Object
Studio's own steps, so a picture comes out the way every other object in the
world does:

- the flat magenta background is cut away;
- the objects are found by count and read like a page;
- everything is drawn at 2 picture px a game px, with 64 colours of its own,
  as palette PNGs.

It writes `public/world/dungeons/` and `src/data/dungeonArt.js`.

## The mouth

The mound **stands**. The picture above its foot line (the front edge of the
cave's dark floor) is sorted with everyone by that line, so walking behind the
mound hides you.

What lies below the line lies **flat** on the ground: the slime spilling out
and the ferns' feet. You can walk up and stand on the slime at the cave's lip,
and "Enter the Goo Grotto" comes up there.

- **It stops you:** the mound stops your boots at the lip, as a building's walls do.
- **Its shadow:** the world's sun casts one from it.
- **Loading:** its picture (1.5 MB in memory; 2.1 MB since v2.3.3567, with
  its four ferns packed under it) loads as you come near and is let go once
  you're far away, inside the dungeon included. That's the
  world's way with its buildings, not the loading screen's.
- **Fallback:** until the picture is in, the old code-drawn opening shows.

## The arena

| Part | Where |
|---|---|
| The wall's front | Along the top, standing in the rows the top bar covers and nobody's middle reaches (its foot at y 176) |
| The wall's top | Above the front, and turned along both sides and the bottom |
| The way out | A gap in the bottom wall, a dark passage, a torch post either side |
| The things | Round the edges, clear of the fight's middle, where you arrive and the way out (`src/data/dungeonArena.js`) |

**What stops you:**

- **The walls:** they stop your boots where they're drawn, and an arrow
  fired into a wall sticks in it.
- **The tall things:** the pillars and the torch posts stop you, and arrows.
- **The low things:** the boulders and the junk heap stop you too, but a
  jump clears them and arrows fly over them, as with any low thing in the
  world.
- **The rest:** the mushrooms, ferns and puddles stop nobody.

**Loading:** the arena's pictures (2.6 MB in memory) load behind the
dungeon's loading screen with its floor, and are let go 1.5 s after you
leave. If you go straight back in, a file the new arena is loading is never
unloaded.

There are no shadows inside a dungeon (nothing in an arena casts one), so the
things cast none either.

## The chest

When a world dungeon is cleared, the worker pays the boss's chest (#1077,
docs/specs/boss-chest.md):

1. The chest drops where the boss last stood, kept inside the floor.
2. It opens at the same moment as the one on the clear's card, and gold glints
   up out of it.
3. It stays until you leave, and you walk past it.

The card's chest is the owner's picture too (it was the old daily chest).

## Tests

- `server/test/dungeon-art.test.mjs` (34 checks) covers:
  - every picture is on disk at its size;
  - every thing stands in the arena once, inside the floor;
  - nothing that stops you is in the fight's middle, by the arrival or on
    the way out;
  - the torch posts flank the way out and the puddles lie flat;
  - the walls leave the way out open;
  - the low things are ones a jump clears.

  Seven deliberate breakages are all caught.
- `mp-grottoart` plays it all on a phone (390 × 844, touch), in the world
  (7 checks):
  - the mouth is the owner's picture and stops your boots at its lip;
  - inside, the walls are the owner's and all 17 things stand where they go;
  - the tall pillar stops you;
  - the chest lands where the boss stood and opens, with the card's;
  - leaving lets the pictures go.

  Pictures: `tools/qa/mp/out/grotto-*.png`.
- `mp-bosschest` reads the owner's chest on the card (shut, then open).

## Since v2.3.3567: it moves

The owner: "You can use code to make those a bit more animated for the water
effects and such. Maybe a little Breeze for the ferns?" The slime drips and
bubbles, the torches burn, the mushrooms let spores float up and the ferns
sway. The tool now also reads where each picture moves, and cuts the
entrance's four ferns out so they can sway (they are packed under the picture
in its file, which is 880 × 603 now). See docs/specs/grotto-life.md.

## Next

The Great Cave's, the Foundry Dome's and the Buried City's pictures are still
to come. Each one is a run of the tool, plus a table of where its things stand
in `src/data/dungeonArena.js`. Their walls and mouths stay drawn in code until
then.
