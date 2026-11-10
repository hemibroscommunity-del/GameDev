# A look that loads as you ride costs the page almost nothing (v2.3.4400, v2.3.4470)

> The owner, 2026-11-10, an iPhone 14 Pro Max: "It noticeably slowed when I
> rode by the blacksmith hammering."

## In one paragraph

A monster's look loads as you walk toward it. Each of its strips is a
256-colour file and is held as colour numbers, but the way between the two
unpacked the file to full colour and worked the numbers out again on the
page. **v2.3.4400** spread that work over many frames. **v2.3.4470** removes
it: the file's own numbers are read, cropped and packed off the page's
thread, and the page only makes the texture. A guard
(`server/test/strip-door.test.mjs`) keeps it so. The sections below are in
that order.

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

## v2.3.4470: read from the file's own numbers, off the page's thread

> The owner, told the above: "I thought fire goblin strips were converted
> into 256 color art like everything should be", and then: "Yes go
> recommended and make sure that's a system going forward so it doesn't
> happen again."

They were converted, and held as numbers. The waste was the way in: a
browser that loads a 256-colour file as a picture unpacks it to full colour,
and the page then found the numbers again pixel by pixel. So:

- **The door.** `zoneTextures.js loadTrackedStrip` first asks the reader's
  worker for the strip (`stripRead.js` -> `png8Worker.js`, the worker the
  Wheel's object sheets and the farm's pictures are read on). The worker
  reads the file as its numbers (`png8Decode.js`) and crops and packs them
  there (`stripPack.js`: the page's packer's own rules, `trimRules.js`, on
  numbers, with no canvas). The page puts the numbers on the bundle's row of
  colours and makes the texture: about a millisecond a strip, in the same
  one-at-a-time line as before while the world is in play.
- **The fallback** is everything above: a strip the reader cannot read (not
  a 256-colour PNG, no worker, pictures not held as numbers on this device)
  is unpacked on the page, a few ms a frame in play. `?stripworker=0` is
  that way for one tab.
- **One strip at a time** is asked of the worker: a strip's unpacked bytes
  sit on its side while it is read (up to 2 MB), and a phone's memory counts
  the worker's. The worker is let go four seconds after its last strip.
- **The same picture.** Cells, layout and size are the page's packer's own.
  Every solid and every see-through pixel is the same. A partly see-through
  pixel keeps the file's own colour, where a canvas gave back that colour
  rounded through its store; drawn, they are the same (measured: 165,362
  such pixels in the fire goblin's fourteen strips, drawn 0 of 255 apart).
- **Everything was not everything.** Eight of the snowman's strips (its five
  attacks, its burrow, pile and emerge) were still full-colour files of
  24,000 to 42,000 colours each, held four bytes a pixel and unpacked on the
  page. They are on one shared list of 256 colours now
  (`tools/art/strip256.mjs --shared`; 149 to 224 KB a file down to 33 to
  55), looked at side by side before and after.

### The system (so it does not happen again)

`server/test/strip-door.test.mjs` fails when:

- a picture under `public/sprites/monsters` is not a 256-colour file (two
  effects' pictures are listed as not yet: the snowball and its burst, which
  Pixi's own loader loads whole and whose 256-colour twins are the effects'
  own switch, `p256.js`; the list can only shrink);
- a monster's strips are loaded round the door;
- the door stops asking the reader first;
- anything NEW calls the page's own packers (`packTrimmed`,
  `stripAsNumbers`, `numbersOf` and their sliced twins): their callers are a
  closed list.

CLAUDE.md carries the rule (the memory law) and a row in the same-change
checklist; TRAPS §317 has the lesson. And a strip that misses the door says
so on a phone: the meter names it ("between frames: strip ...").

### What was proved

| Riding up to the Blacksmith (`mp-stripgentle`) | All at once | A few ms a frame (v2.3.4400) | Read off the page (v2.3.4470) |
|---|---|---|---|
| Strips unpacked on the page in one job | 14, the longest 25 ms | 0 | **0** |
| Slices on the page | | 42, the longest 15 ms | **0** |
| The page's own work for the whole look | 198 ms | 215 ms | **20 ms** (14 textures, the longest 3 ms) |
| The look at the end | | the same | the same |

- `mp-stripgentle` also loads each strip both ways in one browser
  (`window.__btStripCompare`) and compares them pixel by pixel.
- `strip-door` (31 checks) packs made-up strips and the fire goblin's real
  ones from their numbers and compares each pixel with the page's packer's
  rules on the same picture.

## What it does not do

- It cannot be SEEN here: the test box draws a few frames a second.
- The longest slice is the budget plus one piece of work that cannot be cut
  (a band's read, the strip's last step): 10 to 15 ms on the test box at a
  4 ms slice. A 120-a-second screen can still lose a frame to one.
- A monster's RECOLOUR (`monsterRecolor.js`) and a gear or stand-in sheet met
  for the first time are still unpacked in one go: the next ones to look at
  if the meter names them ("between frames: ...").
- Not from this change: `mp-geartrim` fails 15 of 40 on `main` too.
