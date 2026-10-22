# The Points tab's two heads, in the owner's art (v2.3.3557)

The owner, 2026-10-21, sent a sheet of art for the Points tab and a mockup of
how it goes together (kept as `assets/icons-source/sheet-points-heads.png` and
`assets/icons-source/mock-points-heads.png`):

> On the character points screen swap out the old style icons with these.
> It should look similar to the second screenshot mockup but it won't have the
> shaped backgrounds behind the icons. Also the character icon should have the
> up arrow instead of the 4 point star.

Then, having seen the first cut on the phone, a second picture of the three
weapons alone, thick-outlined (kept as
`assets/icons-source/sheet-points-weapons.png`):

> Actually swap out just the icons for these slightly thicker ones I think
> these will look better at that tiny scale for sword, staff, and bow

## What changed

| Where | Was | Now |
|---|---|---|
| The weapons' head (the top row's first cell) | the sword, bow and staff fanned down a diagonal, each with a blue badge of the points it can spend | a gold frame holding three rows -- the owner's thick-outlined sword, staff, bow -- each with its count on its right, and a carved seam between two rows: a dark line over a faint warm one, nothing on it |
| The character's head (the bottom row's first cell) | your portrait with a blue badge | a gold frame holding the gold bust with the up arrow, its count under it |
| The counts | the badge numerals on blue circles and pills; "99+" past 99; sideways a plain 7 px brass pill | the sheet's numerals: **gold** while that pool has a point to spend, **grey** at 0 (the sheet's "NUMBER COLOR RULES"); the exact count, a long one drawn smaller to fit ("147"); the same upright and sideways |
| The weapon in your hand | on a small brass plate | its row lit in the frame |
| The spend window's lane tabs | the hero sheet's weapon icons and your portrait | the same sword, staff, bow and bust as the grid |
| The two heads | different widths (the shared row has one more column) | one width, the two frames standing one over the other as the mockup draws them |

Kept, and slowed: a count with points waiting still glows and swells
(v2.3.3052, the owner's "glow and grow and shrink if there are still points
that need to be allocated"), now from its middle with a warm haze behind its
numerals, and SLOWLY -- the owner, on this change: "If there are unallocated
numbers waiting to be spent make them slowly grow then shrink". One breath is
3.2 s (1.6 s growing to 1.16x, 1.6 s shrinking back, eased), twice the Points
tab's own 1.6 s glow so the two still meet every other beat; a grey 0 never
moves (`game.css` `bt-pts-count`; transform and opacity only, still with
reduced motion). The heads still name their rows and are not buttons (v2.3.2684); the
weapon is chosen on the spend window's tabs.

## Pictures

From `mp-pointheads` on the QA phone in the world's BroTown (390 x 844 at 3x,
and sideways; the "before" crops are the grid alone, from main):

- `docs/shots/points-heads-390.webp` -- before and after, every pool full;
- `docs/shots/points-heads-states.webp` -- Bow 4 alone (grey 0s beside gold
  9s), nothing to spend, three numerals;
- `docs/shots/points-heads-sideways.webp` -- before and after, sideways;
- `docs/shots/points-heads-window.webp` -- the spend window's lane tabs;
- `docs/shots/points-heads-dividers.webp` -- the seven dividers the owner chose
  the seam from (below), every pool full above and Bow 4 alone below (drawn
  with the first cut's thinner weapons, before the owner's thicker ones);
- `docs/shots/points-heads-weapons.webp` -- the first cut's weapons beside the
  owner's thicker ones in the frame, every pool full and Bow 4 alone, upright
  and sideways.

## Decided here, and why

- **The weapons are the owner's thicker icons** (the second sheet): a sword,
  a staff with a big blue orb (no sparkles) and a bow with its arrow, each
  in a thick dark outline. They are cut the same way and drawn at the same
  sizes (12-17 CSS px); they fill more of their square than the first cut's
  (the sword and staff top to bottom, the bow 94 of 96 px tall where it was
  76), so the bow is about a quarter bigger. Nothing else changed: the bust,
  the frames, the numerals and every size the tab works out are the first
  sheet's, byte for byte.
- **The weapons are parted by a carved seam** -- the owner's pick. The first
  cut had a gold hairline fading at its ends with a small diamond in its
  middle, and the owner, seeing it on the phone: "The new method is MUCH
  improved. But I want you to remove the diamonds on the little separators
  between the 3 combat skills if possible. It just muddles the nice crisp
  image differentiating the 3 combat types. Or maybe use a different divider
  style or one that you create yourself from code". Seven ways were drawn on
  the real tab, at 390 and sideways (`docs/shots/points-heads-dividers.webp`,
  left to right): the first cut; the same with no diamond; a carved seam; a
  gold line one device pixel thin; the UI's own divider colour; a flat gold
  line; no line. The owner: "Carved seam is the best". It is a 1 px dark line
  (`rgba(0,0,0,.55)`) over a 1 px warm one (Lantern Slate's edge-warm at .2),
  square-ended, across the frame's inside less its padding, with nothing on
  it. It is the third diamond the owner has taken out of the UI (the
  creator's Create button, v2.3.2207; its plate's divider, v2.3.2388), so
  docs/UI-DESIGN-NOTES.md now says not to suggest one. The seam is 2 px where
  the rule was 1, and the icons kept their size: at 390 a row is 16.3 px for
  its 17 px icon, as in the picture the owner chose; the icon's box reaches a
  third of a px into a seam. The thicker weapons fill their box top to bottom
  (the bow 1 of 96 px clear), so a blade's tip or the orb's top may lie a
  device px on a seam: their dark outline on its dark line.
  - The one-device-pixel gold line was the thinnest, but drawn as a box that
    thin it vanished sideways (0.34 px rounds to nothing at some heights): a
    line under a CSS pixel must be a border, which a browser never draws under
    one device pixel.

- **No shapes behind the icons**, as asked: the mockup's red square, blue
  circle and green diamond are not drawn. The weapon in your hand used to sit
  on a brass plate (v2.3.3051), a shape behind an icon, so its whole ROW is lit
  instead -- the six cells beside the frame are still that weapon's.
- **The character's count is under the bust, not beside it** as in the
  mockup. The head is taller than it is wide (55 x 63 px at 390): side by side
  the bust would be 19 px and its count 14 px tall; stacked they are 35 and 17.
  The weapons keep the mockup's icon-then-count rows.
- **No boxes round the counts.** The mockup draws each count in a dark box. At
  390 a weapon's row is 17 px tall and its count's column 22 px wide, so a box
  round "63" would shrink the numerals to about 9 px. The sheet's own
  put-together panels (its right-hand side) have none either.
- **The two frames are one width.** The shared row has eight columns to the
  lane row's seven, so the same `1.15fr` made its head 7 px narrower. Its share
  is now worked out to match (`SHARED_FR`, about 1.37 upright), which costs each
  of the seven shared cells under a px (41 -> 40.2 at 390). Every stat's name
  still fits whole upright, at 390 and at 320.
- **Sideways the head is 1.45 of a cell, not 1.15.** The head is ~27 px wide
  there and the icons sit beside their counts, so the first cut's icons were
  9 px (the diagonal's were 18). At 1.45 they are 13. Each stat cell gives up
  about a px, and two more stat names take their short form there, as six
  already did: SPEED -> SPD and STAM -> STA (`StatCaption.jsx` writes a name
  short only where it would be cut).

## Sizes, measured on the QA phone

| | 390 upright | 320 upright | sideways (844 x 390) |
|---|---|---|---|
| each head | 54.7 x 63 | 43.4 x 52 | 33.3 x 52 |
| a weapon's icon | 17 | 12 | 13 |
| its count's numerals | 13 tall | 9 | 10 |
| the bust | 35 | 28 | 28 |
| its count's numerals | 17 tall | 13 | 14 |
| stat names | all whole | all whole | SPD and STA short too |

A three-numeral count is drawn smaller to fit its column (at 390 a weapon's
"147" is 11.3 tall).

## How

- **Cut by a tool.** `tools/ui/cut-points-heads.py` reads the two sheets --
  the weapons from `sheet-points-weapons.png`, one piece in each third of it,
  everything else from `sheet-points-heads.png` -- and cuts each piece by its
  own outline (the parts that make it, never a box: the first sheet's word
  labels sit 0-4 px under its icons), drops the faint glow under alpha 40,
  lifts the background remover's solid (~250, ~253 on the weapons' sheet) to
  solid, and resizes with the colour weighted by alpha. It writes `public/icons/ui/points/`:
  - `sword`, `staff`, `bow` (the thick-outlined ones), `character` -- 96 px
    on their longer side (drawn 12-35 CSS px, 3x on an iPhone);
  - `frame-weapons`, `frame-character` -- the two brackets at 0.4 of the sheet;
  - `gold-0` .. `gold-9` and `grey-0` .. `grey-9` -- 64 px tall, each row's
    numerals cut to that row's own top and foot so a "63" stands on one line;
  and the GENERATED `src/data/pointsHeadArt.js`: each numeral's width (so a
  count is laid out before its pictures load, nothing jumps) and each frame's
  size, slice, stroke and corner radius, measured off the art.
- **A frame fits any cell** as a CSS border-image, nine slices: the corners
  whole, the sides stretched. Its slice is drawn so the gold is 3 px on screen
  (2 sideways): `border-image-width` = 3 x slice / stroke.
- **The heads** are `HeroExpanded.jsx` "THE TWO HEADS IN THE OWNER'S POINTS
  ART": every size is worked out from the head's own width and height
  (`HEAD_W`, `CELL_H`), so 390, 320 and sideways each get the largest icons and
  numerals that fit.
- The handles the scenarios read are kept: `data-prog3-lane` on each head,
  `data-prog3-head-badge` and `data-count` on each count, `data-prog3-held` on
  the held weapon's row. New: `data-points-frame`, `data-points-row`,
  `data-points-rule`.
- The old badge art (`public/icons/ui/badge/d*.png`, `circle*`, `pill*`,
  `plus.png`) is no longer drawn; its `w*` numerals still count the stat cells.

## Tested

- `mp-catgrid` (four views): every count is the worker's, in the sheet's
  numerals, gold with points and grey at 0, inside its head; both frames the
  sheet's and decoding; the three rows sword, staff, bow; every icon the
  sheet's; nothing of the old heads left; the two frames one width, one over
  the other; between the weapons two carved seams, a dark line over a warm
  one, with nothing on them, across the rows; the held weapon's row lit.
- `mp-pointheads` (390, 320, sideways, each in the world -- `world: 'wheel'`,
  main's rule for a new scenario since v2.3.3552 -- with the coach's lessons
  seeded done so its first-points card stays out of the pictures; pictures of each state in
  `tools/qa/mp/out/pointheads-*.png`): every pool full (all gold, breathing);
  the spend window's tabs; Bow 4 alone (grey 0s beside gold, only the gold
  breathing, and the breath read off its own animation: running, 3.2 s a
  breath, seeked through it 1x to 1.16x at exactly 1.6 s and back, the 0 beside
  it with no animation); nothing to spend (all grey,
  still); three numerals ("147", whole,
  inside its head, no stat name cut); sideways icons 12 px or more.
- `mp-statcols`, `mp-prog3`, `mp-landscape-dash`, `mp-statpeek`, `mp-charfit`,
  `mp-pointsreset`, `mp-nozoom`, `mp-pointsglow`, `mp-freshpoints`: the Points
  tab's other scenarios, run on the change.
- `server/test/points-heads.test.mjs` (every PR's server suite): every picture
  a file at the size the data says, the frames' slices, the Points tab
  reading them, nothing of the old heads, the carved seam with no diamond on
  it, and the slow breath.
