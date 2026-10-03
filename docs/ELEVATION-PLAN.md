# Elevation on the Wheel: how it could work (v2.3.2999)

> Owner, 2026-10-03: *"I'm also thinking how you might make elevation
> changes"*.

This plan comes from an overnight study of the code and of how other 2D games
do height. The full notes, with sources, are in
`docs/research/ELEVATION-RESEARCH.md`. Nothing here is built yet. It needs
your choices, below.

## The short answer

Do it the way **A Link to the Past, Stardew Valley and Eastward** do:
**terraces drawn on the flat map**.

- A raised area is ordinary ground.
- Its **south side** is a band of rock or earth, the *face*: you can't walk
  through it, and it's drawn from a face picture.
- Its other edges are a thin rim.
- **Steps** cut through the face let you up and down.
- Nobody has a height number. "Being on top" just means standing on the
  ground above the face.

Why this fits the game:

- **Almost nothing else has to change.** The depth sort (who's drawn in
  front), movement, dashes, gusts, arrows, the server's speed check and the
  messages between phone and server all keep working. They already work in
  screen space, which is where the terraces live.
- **The art pipeline already does the hard part.** The bridges' plank decks
  are drawn by the game itself, board by board (v2.3.2949). A cliff face
  and a flight of steps are drawn the same way.

The other ways, and why not now:

- **One-way ledges** you can hop down, as in Pokémon, are a small add-on
  once terraces exist. They're good for shortcuts back toward town.
- **Real height** (jumping, falling, arrows that know who's higher) touches
  every system and the server's messages. That's a project of its own, only
  worth it if jumping becomes something you do.
- **Shading only:** a cliff's shadow drawn in code would be polish on top of
  terraces.

## What exists today

- **The plan already has 6,981 `cliff` cells:** ridges in stages 2–4 of seven
  lands, plus the ledges at the river's falls. They're dead data. They're
  drawn as plain ground and you can walk straight through them. `plan.js`
  says "cliffs are where climbing will go", but that's an intention only.
- **Each land already has a `cliffPaint` description:**
  - frost: grey granite capped with snow and icicles;
  - ember: black basalt columns;
  - sky: layered red sandstone;
  - and so on.

  These become the prompts for each land's face picture.

## The first step you could see: "Prospector's Knoll", behind `?elev`

The plan already describes a commons landmark north-west of town as *"eight
weathered standing stones on a grassy knoll"*. Raise it for real:

- **Where:** about a minute's walk north-west of the town square, well
  inside the safe ground. No monster goes there, so **the server doesn't
  change**.
- **What you'd see:**
  - The knoll's ground raised by one step, 72 game px, about two-thirds of
    the bro's height.
  - Its south side is a bank of earth and stones under a grass lip.
  - A flight of stone steps up the middle of the bank.
  - Walking into the bank stops your boots at its foot. Walking off the
    other edges stops you at the rim.
  - The footpath comes in at the back, up a gentle slope.
  - Trees at the foot draw in front of it. You draw behind them when you're
    on top.
- **The rest of the world stays exactly as it is.** Like the big-town
  preview, it's a version of the plan you only get with the switch, so the
  monsters' places don't move.
- **Work:** about 3–5 sessions, each step testable on its own:
  1. the height layer in the plan;
  2. the face and steps drawn in the ground;
  3. the walk test;
  4. the Ground Studio cards;
  5. a phone test with pictures.

**Art you'd make, two Ground Studio pictures:**

| picture | size | what it shows |
|---|---|---|
| `face-commons` | 1024 × about 180 px (512 × 90 game px), seamless left to right | the front of a low grassy bank as seen from the game's angle: a grass lip on top, packed earth and set-in stones below, in soft shade; no shadow on the ground in front |
| `steps` | 1024 × 1024, like any swatch | rough grey stone steps seen from the same angle, running left to right; the game cuts them into 12 game px treads |

Optionally, standing stones from the Object Studio, about 130 game px tall.

## After that, your choices

1. **Should the lands climb toward their gates?** The plan's ridges could
   become real escarpments, "up" meaning "toward the keystone gate", with
   steps where the roads cross them. It needs one face picture per land,
   from the `cliffPaint` texts, and it changes how each land is walked:
   faces become choke points. This is a design call.
2. **Monsters on raised ground** need the server to know where the faces
   are. That means a baked table, the same pattern as the monsters' places,
   with a test and an off switch. It must come before any rise goes where
   monsters fight. Until then, rises stay where monsters don't go:
   stages 2–4 today, and the commons.
3. **One-way ledges with a little hop**, for shortcuts home. This is small
   once terraces exist.

## Things found in the code along the way

- **Water stops you at your middle, not your feet** (a bug today). In the
  Wheel the walk test reads the bro's middle, 52 px above his boots:
  - walking south into water, your boots go about 45 px in before you stop;
  - walking north, you stop 52 px short of the shore.

  Terraces need this fixed first, and so does water. *Fixed in the same PR
  (v2.3.2999): your boots stop at the water now, tested by walking into a
  river from the north and a pond from the south (`mp-wheelshore`).*
- **Collision must come from the plan, never from the pictures.** You turned
  picture-traced collision down twice (`tiledMaps.js`, v2.3.1777 and
  v2.3.1794).
- **Cliffs can't be Wheel objects.** Every object can be smashed and comes
  back after 3 minutes (v2.3.2995), so a cliff made of objects could be shot
  open. Cliffs belong in the ground and the walk grid.
- **Flat things can't be objects either.** Objects are drawn by their feet,
  so a staircase sprite would draw over a bro climbing it. Steps belong in
  the ground.
- **The art law still holds:**
  - no shadows baked into a picture;
  - no direction in a ground swatch;
  - no ruler-straight edges.

  So a face's lip is drawn per pixel from a smooth line, while the walk test
  stays per 24 px cell.
- **The word "stairs" is taken** by the old town's exit, so the new ones are
  `steps` in code.
- **CLAUDE.md said the near-camera "foreground" layer is missing.** It
  exists (`pixiApp.js`, since v2.3.2655). Corrected.
