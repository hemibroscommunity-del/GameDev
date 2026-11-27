# A dying monster's shadow sits under its feet (tag 6209, card EN)

The owner, 2026-11-27, playing the world on an iPhone: *"The skeletons shadow
during death animation (of mummy - skeleton is second phase) is far too low"*.

## The cause

A monster's shadow is cast from a ground point (`src/rendering/lightfx/casters.js`):
where its body sprite is anchored, the bottom of its frame's 256 px cell, less
the empty rows its look stands above that bottom at rest (`feetRow`, v2.3.4493,
the water frog). Every walk, stand and attack strip is cut with its feet on
the cell's bottom rows, so that is right for them. A death strip is not: it is
cut at its own scale and place (`deathScalePx`, `deathOffsetY`). The
skeleton's was shrunk into the middle of its canvas: its first frame ends on
row 126 of 256, so about 110 px of nothing lay between its feet and the point
its shadow was cast from, and the shadow, thrown along the sun from there, lay
far below it. Its last frames end on row 237 (16 px). The skeleton's death is
the one the owner sees after every mummy: a mummy killed within five seconds
of its transform always plays the strip, never a cut.

## The mend

While a body shows a frame of a death strip, its shadow hangs from that
frame's own lowest painted row (`src/game/frameFoot.js`):

- the strip packer already scans every frame for its art's box to crop it
  (`trimRules.js`); its lowest row is kept beside the crop (`by`), sent with
  the strip from the worker (`stripPack.js` `feet`, packed or not) and put on
  each frame's texture (`zoneTextures.js` `__btFoot`). No new read, no
  canvas, a number a frame, freed with its texture;
- the renderer's three death branches (a look's own strip, the slime's, the
  snowman's) show their frame through `showDeathFrame`, which marks it;
- the casters ask `deathGroundLift`: a marked frame's empty rows under its
  feet, never below the sprite's anchor (a slime's death is anchored on its
  base row); any other frame keeps the rule it had.

Walking, standing, attacking and the mummy's shred move by not a pixel.

## The check

- `tools/qa/mp/mp-deathshadow.mjs`: a mummy, transformed by the worker's own
  message, killed facing east and facing west: at every frame drawn the
  shadow's ground (the light's own list of casters) against the frame's
  painted bottom read from the served file, within 2 px. Red on main (worst
  103 px), green on this. Then the sample: one of every look family with a
  death strip (water frog, rock golem / thorn shambler, storm eye, fire
  goblin, rotcap, slime, snowman), alive and dying. Pictures in
  `docs/shots/skeleton-death-shadow-before.webp` / `-after.webp` (the whole phone, 375 x 667, frame 2) and `-before-strip.webp` / `-after-strip.webp` (frames 0, 2, 6, 15 close up).
- `tools/guards/frame-foot.test.mjs`: the rule, the packer's foot, and every
  way in.

## Left as it is

- The skeleton's death picture itself rises before it falls (its first frames
  float about 70 px up: the art). The shadow now follows the frame's feet; the
  picture is not moved (the art is the owner's).
- The storm eye's death frames' bottoms rise as it breaks up (row 229 to
  166): its shadow follows them up. A choice for the owner if it reads wrong.
