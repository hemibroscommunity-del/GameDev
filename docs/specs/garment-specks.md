# The trousers and boots are painted where they are (v2.3.3647)

The owner, 2026-10-27: "check all the animations for ghost remnants of either a
body beneath or areas for cleanup".

`mp-ghostaudit` dressed a bro in colours nothing else wears (pink trousers, blue
boots) and photographed every frame of every animation. Nearly every pose came
back with specks of pink and blue round the head: along its outline, on an eye,
down the arms and the back.

## Why

The recolour (`playerSkins.js` `recolorBodyToCanvas`) finds the trousers and
the boots by colour. An olive-green pixel is trousers; a flat grey from 45 to
139 is a boot. The art's outlines are anti-aliased, and many of the pixels where
a dark line meets the skin or the background are exactly that grey or that
olive. They lie all over the figure, and every one was painted the player's
trouser or boot colour. In the default colours they pass for outline. In pink,
white, red or blue they do not.

The patterns met the same specks in v2.3.1944 and were confined by height
(`playerDecal.js` `regionFromFeet`). The plain colour never was. Height alone
cannot do it: in the roll the legs go overhead, and the boots would lose their
colour (TRAPS §256).

## The rule (`src/rendering/garmentConfine.js`)

Frame by frame:

- **Trousers.** A trouser-coloured pixel in the bottom 68% of the figure (the
  band the patterns already use) is painted. One above it is painted only when
  it is part of a trouser piece of 30 px or more (at a 256 px frame), or within
  2 px of one.
- **Boots.** A boot-grey pixel in the bottom 35% of the figure is painted. One
  above it is painted only when its whole grey piece hangs off a trouser piece
  (within 4 px) and has an inside (24 px whose four neighbours are grey too). A
  boot hangs off its leg however the leg is turned; a line of outline grey down
  the back is not a boot.
  - One thin piece is a boot too: the rim of a raised sole, as the north jog
    lifts its back boot. It has no skin beside it, and at least 25 px of solid
    black (the sole, black with its four neighbours black) within 3 px. An
    outline's grey always runs beside skin; a sole's rim never does.
- **Head sheets** (the head drawn over armour, `_buildPickupHeadSheet`) take no
  garment colours at all. A frame that is all head has no trousers or boots,
  and its "bottom" is the chin.
- **Torso strips** (the top half of a running swing or shot, drawn over the jog
  legs) are cut at the waist. Their trousers are the sliver at the cut (the
  bottom 5%), which the legs are drawn under, and they have no boots.

A pixel the rule does not paint keeps the art's own colour, the outline's grey
or olive, as the default bro has always shown it. Everything the rule paints,
the old bake painted too.

**What it costs.** Nearly every garment pixel lies in its band, so the bake
paints those as it finds them and keeps back only the ones outside. Only those,
and the pieces they belong to, are walked afterwards, and a trouser piece is
sized only when a speck asks (a walk that stops at 30 px). On the widest sheet,
jog-east (7,168 x 256 px), the recolour's pass goes from 13.5 to 18 ms in Node.
Walking every garment pixel had cost three times the pass. Nothing is kept
after the bake.

`?garmentspecks=0` is the game as it was. `window.__btGarmentSpecks()` says
whether the rule is on and, by sheet, how many trouser and boot pixels each
bake left in the art's colour.

## Checked on every sheet

`tools/qa/garment-confine.mjs` runs the rule over every player sheet's real
pixels, at the size the game bakes it, and draws each frame twice: what the rule
paints (pink and blue) and what it leaves (yellow and magenta).

| sheets | boot-grey painted | left | left in the bottom fifth | trousers painted | left |
|---|---|---|---|---|---|
| 46 whole figures | 419,032 | 43,698 | 0 | 978,757 | 1,854 |
| 11 head sheets | 0 | 3,891 | (no boots) | 0 | 92 |
| 8 torso strips | 0 | 6,508 | (no boots) | 844 | 1,011 |

Nothing is left unpainted in a whole figure's bottom fifth, where only boots
can be. The pictures were checked by eye too: the jog's raised back boot and
the roll's boots overhead keep their colour.

## The test: `mp-garmentspecks`

Two bros in pink trousers, blue boots and a yellow tee stand on the commons, far
apart. One plays the game; the other plays it with `?garmentspecks=0`. Both are
photographed alone (every world layer but the figure put away), their clocks
held at the same moment so the two show the same frame of the same pose:

- standing, all eight facings;
- jogging east, south, north and southwest, two moments each (the stride's
  clock set the same on both: entityRenderer `_jogOff`);
- the hit's flinch, south;
- the sword's swing, east, three moments (its stand-in body and torso);
- the roll, east, part way through: the legs overhead.

For each frame it counts, in the figure's top 30% (the head), the pixels in the
trousers' pink or the boots' blue, and below it the trousers and boots left in
their colours. The test passes when the new page shows at most 2 such pixels in
any head, the old page shows the specks (at least 30 in all, and five times the
new), and the trousers keep 85% and the boots 80% of the pixels the old page
painted, the roll's overhead included (why the boots' bar is lower: below).

Its last run, 73 checks of 73 (on the build with the review's fixes):

| frames | head specks, new | as it was | trousers, new / as it was | boots |
|---|---|---|---|---|
| standing, 8 facings | 0 | 4 (two facings) | 6,946 / 6,944 | 3,697 / 3,730 |
| jogging, 8 moments | 0 | 35 | 9,761 / 9,768 | 2,792 / 2,876 |
| the hit's flinch | 0 | 22 | 1,496 / 1,496 | 629 / 633 |
| the sword, 3 moments | 0 | 63 | 4,820 / 4,814 | 2,860 / 3,010 |
| the roll | 0 | 0 | 662 / 662 | 227 / 231 |

None of the 20 frames compared kept a speck in its head, against 124 as it
was. The trousers kept their colour everywhere, and the boots at least 92% of
it in every frame of that run.

The north jog's raised boot is the smallest boot the test reads, about 100 px,
and up to 17 of them are the outline grey beside the sole's rim, which the rule
leaves as drawn. Which stride frame the test lands on varies a little from run
to run, and so did that boot: 84, 92 and 84 px of blue against 101 or 103 as
it was, over three runs. The boots' bar is therefore 80% (`BOOTS_KEEP`), the
trousers' still 85%.

Two runs also lost the sword: the press that starts the swing landed 170 px
east of the bro, where Mayor Bro stands and now wanders, and a tap on a
townsperson talks to him instead of swinging (v2.3.3583). The press is 110 px
out now, and tries again a little south of east (still the east facing) after
closing whatever opened.

The first runs found the test's own faults too, not the rule's: a sword whose
stand-in the isolation hid, and a roll the 250 ms poll missed. The page now
catches the roll as the game sets it.

## Not this change

The farmer and the gathering stand-ins (lumberjack, cook, fire-lighter) paint
their clothes by their own confined rule (`_standInClothes`, v2.3.3146) and are
untouched.

## Found in review, after the first push

An independent review of the change found two things it fixed and three it did
not.

Fixed in this change:
- **The head sheets' cache key** still named the trousers and boots. A head
  sheet takes neither now, so every pair of them baked the same head again, and
  the cache (32 sheets) evicted heads still in use. The key leaves them out
  (`_headSheetKey`).
- **The patterns' masks.** The rule kept a speck in the art's own colour, but a
  trouser or boot *pattern* could still be stamped on it. In a torso strip
  (the sword's swing) that meant the waist and the back's outline. The masks
  now follow the judge: a speck takes no pattern, and a torso strip no boot
  pattern at all.

Left for later:
- **Inside the band, nothing is judged.** The review counted outline pixels
  painted in the trousers' colour beside the arms at waist height: 188 on
  `jog-south`, 124 of them next to skin, a handful a frame. A crouch (`pickup`)
  brings the head down into the band, so its specks stay too, about 5 a frame.
  They sit against the trousers or the hands, where they read as the trousers'
  edge, and are much less visible than the head's were.
- **The real cure is a mask per sheet, made once offline.** The belt already
  has one (its `beltmask`), and the rod has its recorded shape. The garments are
  still found by colour as the sheet loads, with this rule to keep the colour
  test off the outline. A baked mask would make every bake exact and would save
  the rule's ~5 ms and its three full-sheet arrays a bake.
- **`tools/qa/garment-confine.mjs` marks skin everywhere.** The game marks skin
  only outside the shirt and the pickaxe (v2.3.3648), so for a shirted bake the
  tool's verdicts can differ from the game's by a few outline pixels at the hem.
  The phone test, `mp-garmentspecks`, reads the game's own bake.
