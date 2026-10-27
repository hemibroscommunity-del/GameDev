# The tee's hem reaches the trousers while mining (v2.3.3622)

The owner's list of 2026-10-26 (docs/OWNER-LIST-2026-10-26.md, item 11):

> The shirt shifts while mining.

## What was wrong

In the pickaxe swing (`public/sprites/gear/shirt/tshirt/mine-south.png`, 14
frames of 128 px) the tee rides up on some frames and not on others, so a band of
bare belly shows between its hem and the trousers and then is gone again: the
shirt seems to jump up and down as the bro swings. It was measured as 1,340 px
of skin under the hem over the fourteen frames (mp-tierore's count, v2.3.3443).
v2.3.3443 hid most of it behind a taller copper rock; from iron on the rocks
stand further south, and on the frames where the swing lifts the arms the band
showed whatever stood in front of it.

The art leaves the belly bare on purpose (tools/fit_shirt_art.py: "a tee
legitimately leaves the forearms, hands and belly bare"), which is right for a
tee standing still and reads as the shirt jumping in a swing.

## The fix

`tools/gear/lower-mine-hem.mjs`, the same kind of column walk v2.3.2924 used for
the jog (`tools/gear/lower-jog-hem.mjs`):

- For each column, the skin under the tee's lowest pixel. Only a run of 1 to 6
  rows that ends on the trousers (or on the body's outline with the trousers a
  row or two under it) is belly; a longer run, or one that ends anywhere else, is
  a forearm or a hand, left bare. And only a column whose hem is within 6 rows
  of the frame's middle belly hem (a sleeve ends higher).
- Only a stretch of three or more such columns side by side. A lone column
  (beside the hand or the pickaxe's handle) lowered alone hung under the hem
  like a drip.
- The hem AS DRAWN moves down to the trousers: its dark outline and the shade
  row or two the art lays just above it. The rows it leaves are filled with the
  tee's own tone just above that shade. So the shirt is simply longer, with the
  same hem. (A first try moved the outline alone, and the shade left behind read
  as a stripe across the longer shirt.)
- Frame 9 had a one-pixel slit down the middle of the tee where the body's
  belly line showed through; the hem lowered on both sides of it made it longer,
  so it is closed with its neighbour's column, from its top to the new hem.

264 px in all: 255 under a short hem on 8 of the 14 frames, 9 in the slit.
Nothing is drawn off the body (the body's own alpha), nothing over anything but
skin, and no pixel of the tee is taken away. Run again, it finds nothing to do.

The `.webp` beside the sheet is deleted (webpImage.js prefers it; CI makes the
new one), and `GEAR_VERSION` (src/rendering/gearSheets.js) is 2.3.3622 so every
phone fetches the new sheet.

## What it does not change

- The other mining facings, and the stand, jog and other actions' sheets.
- A printed or patterned shirt follows: it is made from this strip
  (`_dressedShirtFrame`).
- Armour: a torso plate has its own mining strip and covers the tee.

## Tests

- `mine-hem` suite: the tool's dry run finds nothing left to do; the sheet is
  still the body's size; no frame shows a band of belly three columns wide or
  more between the hem and the trousers (it fails on the old sheet, listing the
  8 frames); GEAR_VERSION is 2.3.3622 or later.
- `mp-tierore` still counts the skin under the hem against the old copper
  vein's picture. With the belly covered, what it counts is now mostly the arms
  and hands under the hem (1,113 px where it was 1,340).
