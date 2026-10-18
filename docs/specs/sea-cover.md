# The ground under open sea, and the black under the ground, are not drawn (v2.3.3451)

The owner, 2026-10-18: *"I'd like you to iterate on what best improves
framerate without loss of quality (or negligible loss) for phone gameplay
(iPhone, android)"*. One of that round's changes (draw-lists.md, sheen-batch.md,
one-batch.md, shadow-prepass.md, hair-clip-stencil.md, moving-water.md "Worked
out only where it shows").

## What was wrong

The Wheel's ground is laid in pieces, 192 game px square, each a picture
(wheelGround.js). Since v2.3.3019 a piece with water also gets a quad of moving
water drawn over it (wheelWater.js), which reads the piece's own picture and
draws the water moved and lit, at the strength the piece's water field says:
full strength (`wet` 1) on water a game px from the shore, nothing on land.

A piece of **open sea with no shore in reach** carries one field for all of it
(`uniform`, the field's distance at its cap, 10 game px). Its quad is water at
full strength over every px of the piece, and its colour replaces whatever is
under it to the bit (premultiplied, alpha 1). So the piece's ground sprite,
drawn first, was never seen.

It was not free: a piece kept as colour numbers (paletteTex.js, v2.3.3190) is
eight texture reads a px, and a phone's tile-based chip cannot leave out a
surface that something blended is drawn over (its hidden-surface removal is for
opaque draws only). Wherever the view takes in open sea -- the coasts between
the lands -- that was the sea's whole area drawn twice.

## What changes

- While the water draws, the ground sprite of a piece whose field is uniform at
  full strength is hidden (`visible` false, wheelWater.js `set`; the test of
  "full strength" is the shader's own numbers, `wetAll`). It stays laid: the
  quad reads its picture, and the piece's texture stays on the graphics chip.
- When the quad goes, the ground comes back: a piece freed or laid again
  (`drop`), the whole water torn down, and the water's live switch
  (`window.__btWaves.off()`, the Speed test's "Still water" step) -- the frame
  the quads are put away, the grounds are shown (`tick` -> `cover`). Each hide
  or show is a change to the ground's draw list, so only on a change.
- A piece's sprite shows half a game px of its apron over each neighbour. Next
  to a uniform piece that neighbour's edge is open sea too (the field is
  uniform over the piece's apron as well), so the neighbour's own quad covers
  that strip at full strength: hiding the sprite changes nothing there either.
- `__btUnderSame` (the ground's own check that the pieces cover the overview
  under them, mp-speedtest) shows the hidden pieces while it draws them alone.
- `?seacover=0` draws the ground under every quad, as it was;
  `window.__btWaves.cover(on)` switches it live, and `probe().covered` counts
  the hidden pieces.

## And the black under the ground

Found by counting what a phone's chip paints in one frame (every drawn
sprite's area on the screen, by kind): under every ground the tile layer draws
a black rectangle, the colour past the world's edge -- the world and a screen's
width round it (tileRenderer `bgGfx`). In the Wheel that is one whole screen
of pixels painted every frame, and every one of them is painted over by the
ground's pieces, exactly as the overview under them was before v2.3.3339.

- Each frame WheelGround works out whether its pieces cover the view
  (`coversView`): every piece the view touches is laid, `UNDER_PAD` (48 game
  px, a shake's room) past it -- the same test that puts the overview away --
  and the view with that pad lies inside the world. Past the world's edge only
  the black is drawn, so near the edge it stays.
- While they do, the tile layer does not draw the black (`bgGfx.visible`
  false). The frame any of the view is not covered -- the world's edge, a piece
  still being laid, the overview shown, a zone change, any other zone -- it is
  drawn again. Each change is a change to the draw list, so only on a change.
- A piece is only freed well outside the view and is laid again by swapping
  the new picture in before the old one goes, so nothing the test counted goes
  between the test and the draw.
- It is decided every frame, after the ground's own update, even one that
  threw (tileRenderer `_groundBg`, in a `finally`): the ground sets
  `coversView` false first thing, so a frame it did not finish shows the black.
- Where a graphics reset blanks the ground (TRAPS §130, §142), the canvas's own
  navy now shows where the black did; the black-screen watchdog counts both as
  unlit (BroTown `_wdLitPx`), so it still notices and rebuilds.
- `?groundbg=1` keeps it drawn every frame, as it was; `window.__btGroundBgKeep`
  the same, live. `window.__btGroundBg()` says whether it is drawn and whether
  the pieces cover the view; `.show(on)` sets it for a held frame.

What it saves: one screen of flat colour a frame, about 3 million pixels on a
3x iPhone. A flat colour is the cheapest thing a chip paints (one write a
pixel, no picture read), so this is a small saving: *estimate*, up to about a
millisecond a frame on a cheap Android phone, next to nothing on an iPhone.
The QA box, which draws in software, took 356 ms for a frame at the coast with
it hidden and 422 ms with it drawn; only the difference means anything there,
and a phone's chip paints flat colour far more cheaply than this box does.

## How it is checked

`mp-seacover`, on a phone-sized page at the Wind Dunes' first coast:
- open-sea pieces are laid there and hidden while the water draws (guard);
- one held frame drawn with the ground hidden, drawn and hidden again: the
  same to the bit; with the quads put away the hidden ground leaves holes, so
  the comparison is not of nothing;
- the water's live switch shows every hidden piece and hides them again;
- `__btUnderSame` still sees every piece;
- the frame's cost each way on the QA box, which draws in software: a skipped
  sprite is pixels it does not draw (reported; a phone's numbers are its own);
- the black under the ground: not drawn at the coast with every piece laid; one
  held frame drawn with it hidden, drawn and hidden again, the same to the bit;
  with the ground put away, hiding it changes most of the screen (the canvas's
  own navy shows for black), so it really is not drawn; drawn again the frame
  the overview is kept shown (a piece missing) and with the keep switch, hidden
  again after both; and the frame's cost each way (reported).
