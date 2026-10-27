# A monster's element, seen as it winds up (v2.3.3619)

The owner, 2026-10-26 (docs/OWNER-LIST-2026-10-26.md, item 17's "telegraphs"):

> It would be cool if you could telegraph the attacks of each monster (briefly)
> using code to represent their elements. Maybe a brief snow swirl effect before
> a snowman throws a snowball for instance. This will promote blocking and more
> skilled play.

## What a player sees

Every monster already warns before it hits: the worker winds up each basic
swing and throw for 350-600 ms (server/src/telegraph.js `BASIC_WINDUP`), and a
kit's slam, lunge or burst for longer, and the phone throbs the monster's body
for it. For exactly that moment, the monster's element is now drawn round it:

| Element | Who | The look |
|---------|-----|----------|
| frost | the snowmen | snowflakes and glints swirling in to him, gathering as the throw comes |
| flame | the fire goblins | flames at its hands, sparks rising off it |
| wind | the mummies | streaks of wind and grains of sand circling it |
| stone | the rock monsters | pebbles hopping off the ground round its feet, dust puffing out |
| storm | the storm slimes | lightning bolts and sparks jumping about it |
| water | the fishmen | droplets swirling in round it, flecks of spray |
| venom | the wisps and bog lurkers | poison fumes rising, motes circling |
| flora | the slimes of the Verdant Wilds | goo bubbles swelling and popping on top, goo flicked off |

It comes and goes with the wind-up: up within 70 ms (a wind-up can be 350 ms),
a little stronger as the blow comes, gone the moment it lands. A monster that is
not winding up shows nothing.

The look is the monster's ELEMENT, the worker's own word for what its hit does
(server/src/monsterstatus.js `ELEM_HITS`, carried on every monster as
`element`), so the look before a blow always matches what that blow will do:
the snow swirl comes before a chill, the sparks before a burn.

## How it is drawn

- `src/data/elemWindup.js`: the eight looks (how the pieces move, which shapes,
  how many, how big), no imports.
- `src/game/elemWindup.js`: where each piece is on this frame, worked out from
  the time alone (how long since the wind-up began, how far through it is) and
  a number from the monster's id. Nothing is kept from frame to frame and
  nothing is random, so two phones watching one monster see the same swirl.
- `src/rendering/elemWindupShapes.js`: the 16 shapes, drawn in code with a
  dark edge each (a white flake on snow, a tan streak on sand or a green bubble
  on grass reads as nothing without one).
- `src/rendering/elemWindup.js`: a pool of 128 sprites made once with the
  renderer, in one container on the projectiles layer, every one cut from ONE
  picture (192 x 192 px, made on the loading screen). A frame only moves,
  turns, sizes and fades pieces and picks their cell of that picture: nothing
  is added, removed, hidden or re-blended, so the layer's draw list is never
  rebuilt for it (TRAPS §218).
- On the projectiles layer, over everything that stands, as an arrow in flight
  is: a warning has to be seen. The first cut drew on the particles layer, and
  a monster south of you (which the depth pass draws in front of you, above
  that layer) hid its own swirl behind its body.
- Only a monster the entity renderer drew this frame (it stamps `_tgSeen` in
  the throb): one far off screen, or whose look is not loaded yet, has none.
  At most 8 at once, the nearest to you.
- Sizes are for a phone: a flake is 24 world px, about 15 CSS px at the
  world's 0.6 scale. The first cut's 13-15 px pieces read as specks.
- Nothing new on the wire and nothing on the worker.

## Switches and probes

- `?nowindupfx` draws none (the throb alone, as before).
- `window.__btElemWindup()`: on, made, the pool, the pieces lit, and (with the
  QA probe armed) who is drawn, where each piece is, and the last wind-ups.

## Memory

One 192 x 192 picture (~147 KB, kept with its canvas so a rebuilt renderer
uploads it again) and 128 sprites.

## Tests

- `server/test/elem-windup.test.mjs`: a look for each of the worker's eight
  elements and no other; every shape drawn, on a stand-in canvas; every piece,
  at every moment, as many as its look, alpha 0..1, near the body, the same for
  the same monster and moment and not for another, and moving; the snow swirls
  in, sparks rise, the storm jumps every 70 ms, pebbles hop, the gust circles;
  the strength; and the wiring (the stamp, the layer, the loading screen, the
  switch, one picture, a pool never added to or hidden).
- `mp-elemwindup` (a phone in the world): the picture made on the loading
  screen; eight monsters, one of each element, winding up at once, each with
  every piece of its look round it (pictures of all eight and of each); the
  pieces move; the look ends with the wind-up and a monster not winding up has
  none; a real snowman at Frost Ridge winding up for real draws the snow swirl
  (its picture); `?nowindupfx` draws none while the body still throbs.
