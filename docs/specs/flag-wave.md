# The Town Hall's flag waves (v2.3.3347)

> Owner, 2026-10-18: *"Also make the town square flag wave using code it looks
> silly being still"*

## What there was

No flag object. The flag on the Town Hall's clock tower is painted into the
building's own picture (`public/world/objects/buildings-17.png`, the
Object Studio's Town Hall, "a flagpole on the tower"), so it stood still while
the trees round it swayed and the chimney smoked.

The old map's town had waving flags (`worldLife.js`, v2.3.2816): cut out of the
town's art by a tool and drawn as meshes. The Wheel's buildings are drawn from
palette pages (v2.3.3190: one byte a pixel, coloured on the graphics chip), and
each building with life is one Container, its picture and its life
(`wheelLife.js`, v2.3.2983).

## What it is now

**The cut** (`src/rendering/wheelLife.js` `cutFlag`, once per page source):

- The cloth's place is in `src/data/buildingLife.js`, the Town Hall's `flag`
  entry, on the picture's own pixels (812 x 807): what is solid in `box`
  [412, 12)-[538, 84) and not in `keep` -- the ring under the finial
  [412, 12)-[418, 19) and the knob the pole stands on [412, 65)-[433, 84). That
  is 5,476 px in one piece (`n`); it hangs from column `pole` 412.
- Its colour numbers are copied into a little picture of its own (126 x 72, on
  the page's own colours, `makePaletteSource`), so it is drawn by the same
  lookup and comes out the same pixels at rest.
- Only then are they set see-through in the page itself, and the page uploaded
  again (`source.update()`), so the painted cloth is never seen behind the
  moving one. Everything that reads the page afterwards -- a hit's chips, a
  burn mark, a shatter's shards -- sees the page without it.
- Never cut: a page whose cloth does not count `n` (within 1%) -- a picture
  drawn again, whose flag may be elsewhere: it just stays still, never cut
  where the cloth is not; a page that is not colour numbers (`?nopalette`,
  WebGL1); `?nolife` (no building life at all); a full colour atlas.
- Once per page SOURCE (a WeakMap): a building mended after it shattered, or
  walked away from and back to while its page stayed, is built again and finds
  the cut made -- a second cut would read the already see-through cloth. The
  cloth's picture is destroyed with the page.

**The wave**:

- The cloth is a 9 x 4 `MeshPlane` in the building's life, placed where it was
  painted (a cloth pixel is 1/2 of a picture point, the picture drawn k times
  its points from its foot) and mirrored with a mirrored building.
- `worldLife.js` `_updateWheelFlags` steps it every frame through
  `wheelObjects.js` `forEachWheelFlag`, with its own clock, the wind
  (`timeOfDay.js` `windAt`) and the gusts that move the trees round it
  (`gustAt` at the building's foot) -- the old map's flags' motion: a wave
  running from the pole to the free end (a full wave along the cloth, a little
  phase down it), its swing growing as `u^1.25` along the cloth, the cloth a
  little shorter as it ripples. Its free end swings `FLAG_AMP` x (1.5 + 1.2 x
  wind + 1.6 x gust) of the cloth's pixels -- ~5-13, 2-5 CSS px on the QA
  phone -- at 1.2-2.6 waves a second.
- Under the calm switch (`__btAmbienceOff`, the QA harness's) it lies exactly
  as painted.
- The cloth casts no shadow: the building's shadow is cast from its picture,
  now without it, and a flag ~500 game px up would throw a shadow far across
  the square.

## Cost

One 36-vertex mesh, updated a frame while the Town Hall is near; a 9 KB
palette picture and one more row in the colour atlas; one cut a page load (a
loop over the 9,072 pixels of its box and one upload of the page).

## Probe and tests

- `window.__btWheelFlags()`: each live flag's swing (`amp`), its free end's
  rise (`tipDy`), whether it is at rest, its gust, its box and its building's
  on the screen (CSS px); how many pages were cut or refused, and why the last
  was; `.hide(true)` hides the cloth.
- test-world-core "the Town Hall's flag": on the picture as the game has it,
  the cut counts `n`, in one piece, and no cloth runs past its box.
- `mp-flagwave` (13): a phone in the square, the tutorial handed in (Mayor Bro
  would open his first quest's window over the world), every page element
  hidden while it looks at the canvas:
  1. cut once, nothing refused;
  2. at rest its box is the picture's [412, 12)-[538, 84) to a pixel, and red
     and gold fill it as the painting did;
  3. hidden, none of it is left painted (0.1% red), the pole's gold knob still
     drawn;
  4. in the wind its free end rises and falls (10 px of cloth in 3 s), its box
     changes between frames (~22%), the wall beside the door does not;
  5. at rest again;
  6. `?nopalette` cuts nothing and shows the painted flag;
  7. no page errors.
  `BT_FLAG_FRAMES=n` saves n pictures of it waving.
