# The metal shine is drawn in the frame, not in a pass a piece (v2.3.3375)

The owner, 2026-10-18: *"I'd like you to iterate on what best improves
framerate without loss of quality (or negligible loss) for phone gameplay
(iPhone, android)"*.

## What was wrong

Since v2.3.2887 every piece of metal on screen shines: a sword, a torso, a
pair of greaves, on you and on every other player. Each one did it through a
**filter of its own** (`src/rendering/lightfx/glint.js`):

1. the piece drawn into a picture of its own,
2. the shine worked out over that picture,
3. the result drawn back onto the frame.

A filter is a **render pass**. The graphics chip stops drawing the frame,
draws the piece somewhere else, and comes back. On a phone's chip (tile-based:
every iPhone, most Androids) that means the frame drawn so far is written out
of the chip's own fast memory and read back in again, **for each piece, every
frame**. A player in plate, greaves and a sword is three passes; a few
armoured players about is dozens. The speed-test PR (#963) put it second on
its list of likely costs: "one filter pass a piece of metal, a frame, for
every armoured player on screen".

## What changes

The ordinary shine (the permanent sheen of v2.3.2864, on a piece with no
grade) is worked out **where the piece is drawn**, by a batcher of its own:
`src/rendering/lightfx/sheenBatch.js`.

- It is the 'sharp' batcher (`sharpPixels.js`, how a figure's pixels are
  read) with the filter's own lines run on the colour it drew.
- Those lines are ONE TEXT for both, `src/rendering/lightfx/sheenLift.js`: the
  filter's program reads exactly as it did (its source is byte for byte the
  same), and the batcher names its inputs as the filter's uniforms.
- Each piece carries in its corners what the filter knew:
  - the box the filter laid its shine across: the piece's whole frame (a
    sprite's bounds are its `orig`, placed by its anchor) in its group, then
    on the graphics chip -- where the camera is -- through the group's matrix,
    clipped to the screen and widened to whole device pixels, as Pixi's
    FilterSystem does (`_calculateFilterArea`, `_calculateFilterBounds`);
  - the figure's frame inside it (`uFig`), the metal's shine colour and the
    sheen's strength, the sun's side, and the tint it is drawn with.
- Pixi packs a piece again only when it changes (it moves, its picture or
  tint changes), so a new number on a piece standing still asks for it
  (`onViewUpdate`). Moving a piece between a pass and the frame rebuilds its
  layer's draw list.
- Its program is built behind the loading screen (`warmSheenBatch`, next to
  the filter's own warm-up).

**Still a pass of its own:**

- a piece wearing a GRADE (rare, elite, godly armour): its coloured edge needs
  the pixels round it, which only a picture of its own has;
- a sweep pinned across the metal (QA's pictures);
- a piece the sharp batcher would not draw, and a sprite some other effect
  filters;
- every piece with `?sheenpass` in the address (the old way, to compare).

## The same picture, to a level

The filter read its piece back from an 8-bit picture. Here the colour is used
as drawn, unrounded, so a pixel of metal can come out a level (of 255) apart.
`mp-sheenbatch` draws one held frame both ways and counts them (below).

## Measured

On this box, which draws in software and has no tile memory, so it shows how
many passes are gone, not what each one cost a phone:

- `mp-sheenbatch`, a 3x phone in iron plate, greaves and a greatsword:
  - the same held frame both ways: no pixel more than 2 levels apart (2,571
    pixels 1 level, 7 pixels 2, of 102,960 round the figure); the shine itself
    moves 2,434 pixels by up to 62;
  - render-target switches a frame: 3 in the frame, 9 in a pass a piece;
  - the frame, four alternations of 6 s each way: 311.7 ms against 317.1 ms
    between frames (software drawing), the game's own work 4.04 against
    4.35 ms.
- `mp-crowdbots`, bots in iron plate and greaves (each a matched set, so one
  shining knight figure) walking round a phone page in BroTown
  (`BT_CROWD_STEPS=0,8,16 BT_CROWD_WALKR=260 BT_CROWD_LOOK=...`), against
  `BT_CROWD_QUERY=sheenpass`:

  | armoured players on screen | 0 | 8 | 16 |
  |---|---|---|---|
  | render-target switches a frame, a pass a piece | 3.3 | 20.1 | 36.3 |
  | render-target switches a frame, in the frame | 3.3 | 3.4 | 3.4 |

  Every armoured player on screen cost two switches a frame (away and back);
  now none. The 3.3 left is the start of the frame and the shadow layer's pass.

On a phone each switch writes the frame out of the chip's own memory and reads
it back in. The owner's Speed test now times the old way as a step of its own
(`shinepass`) and says what the new one saves on that phone.

## How it is checked

- `mp-sheenbatch` (new): a 3x phone in iron plate, greaves and a greatsword:
  - all three shine in the frame and none is filtered; the batcher was built
    behind the loading screen;
  - THE SAME PICTURE: one held frame drawn in the frame, in a pass a piece
    (`window.__btSheenPass`) and in the frame again;
  - it really is the shine: the frame with the shine off differs;
  - six fewer render-target switches a frame for the three pieces;
  - elite plate and greaves keep their passes while the sword stays in the
    frame; a pinned sweep is the filter's;
  - the frame's time both ways.
- `mp-sheen`, `mp-sheenall`, `mp-armorgrade`: the shine's own tests.
  `mp-sheenall` now counts a piece as shining when it is filtered as before
  OR drawn by the shine's batcher with a sheen and the tint it is drawn with.
- `mp-crowdbots` takes `BT_CROWD_LOOK` (JSON merged into the bots' look):
  `'{"eqc":"ironplate","eql":"irongreaves","wpnType":"sword","wpnMat":"iron"}'`
  dresses every bot in iron, and each row says how many pieces shine in the
  frame and in passes, and the render-target switches a frame.

## Not here

The grade's edge in the frame. It reads the pixels round each pixel of the
piece as drawn; the batcher would read them from the piece's own picture,
which comes out a little different at the edge. Graded pieces are few, so
they keep their pass.
