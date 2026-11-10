# A look that loads as you ride is unpacked between frames (v2.3.4400)

> The owner, 2026-11-10, an iPhone 14 Pro Max: "It noticeably slowed when I
> rode by the blacksmith hammering."

## What was wrong

Not the hammer (a townsperson at work costs under a millisecond a frame:
measured with Chrome's profiler). The Blacksmith stands on the Flame Fields'
side of the town, and riding up to him is where the fire goblin's look starts
to load: a monster's look loads as you walk toward it
(`src/rendering/wheelMonsterArt.js`, the owner's own rule of 2026-10-02, for
memory). A look is many strips of frames (the fire goblin: fourteen), and as
each strip's file arrived it was unpacked on the page in one go
(`zoneTextures.js loadTrackedStrip`): every frame cropped to its art and
packed (`gearSheets.js packTrimmed`), then the packed picture read into its
colour numbers (`picsNumbers.js stripAsNumbers`). On the test box that is 13
to 39 ms a strip, and the fourteen come within about a second: 180 to 300 ms
of the page held, in pieces each longer than a frame.

## What the game does now

While the world is **in play**, a strip is unpacked a piece at a time:

- the file is unpacked off the page's thread where the browser can
  (`img.decode()`);
- the crop is found a frame at a time and the crops are drawn one at a time
  (`gearSheets.js packTrimmedSliced`), and the colour numbers are read a band
  of rows at a time (`heldNumbers.js numbersOfSliced`);
- **one strip at a time**, and between pieces the loader asks for its turn
  (`zoneTextures.js stripTurn`): once its slice of the frame is spent it
  waits for the next frame to be drawn first. A slice is a quarter of the
  frame's length, never under 3 ms: about 4 ms a frame on a 60-a-second
  phone. (This box's frames are 200 ms, so its slice is a whole strip and
  every phone test loads as fast as before.)

**Behind a loading screen nothing waits**: a zone's own art, a dungeon's, the
farm's all load flat out, as they always did. "In play" is told by
`BroTown.jsx` (`setStripPlay`): no loading hold up (`_zoneLoading`,
`_netHold`, `_townArtHold`, `_farmArtHold`, `_wheelDungeonOpening`, the
intro) and the tab on screen. A loading screen that comes up while a strip is
being unpacked ends the waiting at once.

**The same look, to the byte.** Both packers call the same rules
(`src/rendering/trimRules.js`: which pixels are a frame's art, the pad and
snap, the layout, "not worth it"), and the numbers are built by the same loop
whether it is fed the whole picture or bands (`numbersBuilder`).

A zone left while its strip was being unpacked keeps nothing of it.

`?stripgentle=0` is the old way for one tab. `?stripslice=4` fixes the slice
in ms (QA: a phone's slice on a slow box).

The cost: the fire goblin's look is ready about a second later than before on
a 60-a-second phone (300 ms of work at 4 ms a frame). A monster comes on
screen within about 500 px and its look starts loading at 2,600, so there are
still several seconds of walking to spare; a monster whose look is not ready
is not drawn, as before.

## What was proved, and how

| | The old way (`?stripgentle=0`) | Now |
|---|---|---|
| Riding up to the Blacksmith (`mp-stripgentle`, a phone's 4 ms slice): strips unpacked in one job each | 14, the longest 25 to 36 ms | **0** |
| ...the page held, a piece at a time | 137 to 200 ms in 14 pieces | 37 to 43 slices, the longest 10 to 15 ms |
| ...the look at the end | | every strip the same size and the same pixels |

- **`node tools/qa/mp/run.mjs stripgentle`**: the ride, twice.
- **`server/test/strip-slices.test.mjs`** (21 checks): the packer's rules;
  six strips scanned whole and a cell at a time (the same cells, layout and
  witness pixel); the colour numbers in bands of 1 to 100 rows against the
  whole; more than 256 colours refused either way; the wiring.
- `mp-monstertrim` and `mp-picsonce` (every cropped frame against the served
  file; the numbers against the canvas) pass on the refactored packer.

## What it does not do

- It cannot be SEEN here: the test box draws a few frames a second.
- The longest slice is the budget plus one piece of work that cannot be cut
  (a band's read, the strip's last step): 10 to 15 ms on the test box at a
  4 ms slice. A 120-a-second screen can still lose a frame to one.
- A monster's RECOLOUR (`monsterRecolor.js`) and a gear or stand-in sheet met
  for the first time are still unpacked in one go: the next ones to look at
  if the meter names them ("between frames: ...").
- Not from this change: `mp-geartrim` fails 15 of 40 on `main` too.
