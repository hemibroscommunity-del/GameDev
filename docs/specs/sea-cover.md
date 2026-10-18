# The ground under open sea is not drawn (v2.3.3411)

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

## How it is checked

`mp-seacover`, on a phone-sized page at the Wind Dunes' first coast:
- open-sea pieces are laid there and hidden while the water draws (guard);
- one held frame drawn with the ground hidden, drawn and hidden again: the
  same to the bit; with the quads put away the hidden ground leaves holes, so
  the comparison is not of nothing;
- the water's live switch shows every hidden piece and hides them again;
- `__btUnderSame` still sees every piece;
- the frame's cost each way on the QA box, which draws in software: a skipped
  sprite is pixels it does not draw (reported; a phone's numbers are its own).
