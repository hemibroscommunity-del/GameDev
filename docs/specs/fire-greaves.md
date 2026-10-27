# The greaves cover the trousers while you light a fire (v2.3.3669)

The owner, 2026-10-27: "Aligning the greaves so the waistband doesn't show would
be better".

Lighting a fire in a steel plate and greaves, a band of the olive trousers showed
at the waist on the standing frame the light ends on (frame 7), and a wedge of
thigh showed beside the log on the kneeling frames (3-6).

## Why

The fire-lighter is one painted body with each garment laid over it from a strip
of its own. The garments were painted in the same poses but not in the same
places, so `FIRE_GEAR_REG` (effectsRenderer.js) moves each one onto the body
frame by frame, at a scale the owner chose (the greaves x0.90).

That table was fitted by **how much of each garment lands on the body part it
covers**. It never asked how much of the **trousers** the greaves and the plate
leave showing, which is what the owner saw.

## The fit

Frames 3-7 of the greaves' row are placed again (the owner's x0.90 kept; only the
position moves):

- every offset within 36 art px of the old one was tried, on the art itself, with
  the plate where it is drawn;
- each was scored by the trouser and boot pixels left bare, against steel laid
  over the bro's hands or the log;
- the best of each frame was checked by eye.

Fitting the size as well was tried and turned down. It did no better, and it
sized the greaves differently on every frame (x0.86 to x0.96), which would show
as the steel swelling and shrinking while you kneel.

| Frame | Offset before | Offset now | Trousers bare (art px) |
|---|---|---|---|
| 0, 1 | as fitted | unchanged | 0 |
| 2 | (89, 48) | unchanged | about 1,000 (below) |
| 3 | (57, 7) | (43, 4) | 693 -> 84 |
| 4 | (73, 15) | (54, 15) | 852 -> 71 |
| 5 | (72, 15) | (51, 13) | 884 -> 167 |
| 6 | (64, 17) | (55, 12) | 792 -> 438 |
| 7 | (41, 15) | (43, 6) | **590 -> 16** (the waistband) |

All eight frames: 4,901 -> 1,866 px of the 384 x 512 art.

The same table places another player's fire-lighter (`_updateRemoteExtraction`'s
`_placeGear`), so everyone sees the greaves where you do.

## What is left

- **Frame 2's thigh.** Its greaves are painted in a different kneel from the body:
  the steel thigh runs where the body has no leg. No offset covers it. The frame
  shows for 67 ms, before the strike.
- **A kneeling boot shows a little more** where the steel moved off it (by the
  fit's count, 71/164/116 -> 174/501/401 px on frames 4-6). It is the dark of a
  foot behind the log, not a band of cloth.
- **Frame 6's leftover.** Some of the remaining 438 px is a patch of trousers the
  old painted glow had lit orange, on the near side. The bake does not take it
  for trousers, so it keeps that colour. It is a fault in the art, not the fit.

## The test: `mp-firegear`

Moved to the world (`world: 'wheel'`; off the old map's list). It already
checked that each garment lands on the body. Two checks are new, counted on the
art with the table and with the one before it:

- frame 7's bare trousers at most 40 px (it was over 200);
- all eight frames together at most 45% of before, and each of frames 3-6 lower.

The coverage floor for the greaves drops from 0.38 to 0.35, on purpose. The new
places tuck the greaves' top under the plate and reach over the log's end, which
that score counts as off the legs (0.394 -> 0.367).

`mp-firestart` (your light and a watcher's) and `mp-firepeer` (a peer's
fire-lighter) pass unchanged.
