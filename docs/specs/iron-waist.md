# No trousers at the waist of a full iron set (v2.3.3645)

The owner, 2026-10-27: "check all the animations for ghost remnants of either a
body beneath or areas for cleanup".

`mp-ghostaudit` dressed a bro in pink trousers and full iron (plate and
greaves). Jogging north-east or north-west (the second is the first mirrored),
he showed a strip of pink at the waist between the plate and the greaves: 21-23
px on frames 1 and 2, and 7-15 px on frames 11 to 13. In the default olive
trousers the same pixels read as a dark line, which is why nobody had noticed.
It is the body beneath, showing through the armour.

## Where it comes from

North-east has no painted knight figure (`gear/fullset/steel` covers east,
north, south and south-west). So that jog draws the player's own recoloured
body, cut away under the armour by the masked bake
(`src/rendering/maskedBake.js` `bakeMaskedCanvas`), with the plate and greaves
on top. The pink can only be body pixels the bake kept. Two separate faults
kept them.

**1. The fishing rod's restore ran on every pose (frames 1 and 2).** The
fishing sheet bakes the rod into the body. The bake's erase cuts the rod where
it crosses the plate's halo, so v2.3.1123 puts the rod's pixels back from the
original body. For a sheet loaded before the rod's shape was recorded, it finds
the rod by colour (high red, low green, blue above green). Its comment says
this "is a no-op for every other pose/body", which is true in the default
colours. Pink trousers (214, 112, 168) pass that colour test, and so does a
pink skin. So on every pose, the trousers the erase had cut came back.

Then the chain belt paint (v2.3.1347), which covers the waist with chain,
should have replaced them. But on north-east it keeps a skin test, and with
blue boots the sampled trouser and boot colours made a pink pixel score as a
boot. It was left pink.

**2. The chain belt stops short of the greaves (frames 11 to 13).** The belt
sheet the bake paints from (`belt/chainbelt/jog-northeast`) ends one or two rows
above the greaves' top on those frames. The trousers the bake keeps in the
waist band show through that seam in every trouser colour.

## The fix

- `maskedBake.js`: the rod restore runs on the fishing pose only. Every caller
  passes the pose, and only the fishing sheet has a rod; fishing is unchanged.
- `tools/gear/bridge-ne-belt.mjs`: in each frame and column where the greaves
  start one or two rows below the belt's lowest pixel, those rows take that
  pixel, copied down. This is `tools/relay_jog_belt.py`'s own rule, the belt's
  bottom bridged to the greaves' top. A wider gap (at the side, the arm) is
  left. It wrote 47 px over frames 8, 11-14, 21 and 23, and its dry run finds
  nothing left. The paint only lands where the body is, so a bridge over
  nothing draws nothing.
- `GEAR_VERSION` 2.3.3645, so every phone fetches the mended belt. Only the PNG
  is committed; CI mints its WebP twin.

`tools/posesheets/beltmask-northeast.png`, the mannequin generator's source, is
not touched. It has 23 frames to the sheet's 24, so it is already out of step
with the sheet, and a regeneration would need the bridge run again anyway.

## The test: `mp-ironwaist`

A bro in pink trousers and full iron jogs in place north-east, then north-west.
His clock is held and stepped through the whole stride, and each step is
photographed alone (the figure's layers only). At most 6 px of pink may show on
any frame of either way (an antialiased edge, `mp-ghostaudit`'s allowance), and
every frame must be seen.

Its run, against the same build without the fix:

| frame (north-east; north-west the same) | 1 | 2 | 11 | 12 | 13 | worst elsewhere |
|---|---|---|---|---|---|---|
| without the fix | 56 | 51 | 24 | 42 | 47 | 5 |
| with it | 1 | 0 | 0 | 0 | 0 | 5 |

Without the fix it fails on exactly the frames and counts `mp-ghostaudit` found.
With it, 8 checks of 8. The 5 px elsewhere is the edge of the greaves'
outline, the same on both builds.

`server/test/iron-waist.test.mjs` guards the parts a phone test cannot: the
bridge tool finds no seam left, the rod restore asks for the fishing pose, and
`GEAR_VERSION` is 2.3.3645 or later.
