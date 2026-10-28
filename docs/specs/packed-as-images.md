# The armour, body and effect sheets kept as images of themselves (v2.3.3702)

The owner, 2026-10-28: *"Memory seems to be the persistent bottleneck in terms
of performance in this game. Getting that to run as low as possible without
sacrificing performance is the goal"*, and that night: *"Keep running tests
through the night on memory fixes/improvements and testing for disappearing
traits."*

## What the page held

`mp-battlemem`'s census (BT_BATTLE_CENSUS on a readable build: every picture
once, by the code that made its canvas) at a Flame Fields fight named the
biggest pictures the page holds as canvases:

| what | canvases | the page | the chip |
|---|---|---|---|
| the walking armour, belt and shirt sheets (`gearSheets.js` `_buildSheet`) | 64 | 18.1 MB | 18.1 MB |
| the body sheets (`playerSprites.js` `loadSheet` through `sliceCropped`) | 25 | 8.9 MB | 1.0 MB |
| the effect and townsfolk strips (`loadCroppedStrip`) | 10 | 8.5 MB | 1.1 MB |
| your coloured body sheets (`playerSkins.js` `buildBodySheet` through `sliceCropped`) | 9 | 3.6 MB | 0 |

About 39 MB of the page's ~81 MB of canvases at a fight. A canvas is held whole
until the page closes. The armour sheets could not simply be emptied once on the
chip (`gpuOnly.js`, v2.3.3088): the masked bakes read them back (`drawGearFrame`,
the bake worker's `createImageBitmap`), and a black screen's rebuilt renderer
uploads them again from the page.

## What it does now

Every strip `gearSheets.js` packs is **kept as an image of itself**
(`keepAsImage.js`, the head pieces' way since v2.3.3606): a PNG of its own
pixels, taken the moment it is made, loaded as an `<img>`, the texture's source
swapped to it, the canvas let go of.

- **What the page holds then:** the PNG's bytes for certain, about a fifth of
  what the canvas took (measured: 3.5 MB of PNG for the 77 pictures the screen
  was drawing from, 19.3 MB as canvases); the decoded pixels only while the
  browser chooses to. A browser drops a picture's decoded copy under
  memory pressure and decodes it again when the picture is next used. A canvas
  it cannot drop.
- **Safari's purge of a parked tab** (TRAPS §250) empties canvases. An `<img>`
  it cannot blank, so these sheets can no longer come back empty after a tab is
  parked or after a black screen.
- **No reader changes:** every reader of these sheets draws them with
  `drawImage` or `createImageBitmap`, which take an `<img>` as they take a
  canvas.
- **Nothing sent twice** (`quiet`): a sheet already on the graphics chip when
  its image is ready is not sent again. The copy there is these very pixels;
  the image is only for the next upload (a black screen's rebuild). Without it,
  the dozens of sheets made behind the loading screen would each be decoded and
  uploaded again in the first seconds of play.
- **Asked twice, one PNG:** `loadCroppedStrip` keeps the head pieces it cuts,
  and their loader asks again (v2.3.3606). The second ask gets the first one's
  answer. A keep that failed may be asked again.
- **Kept as canvases for the QA scenarios** that compare packed canvases byte
  for byte (`?gpucopies`, `__btTrimVerify`). `?keepimage=0` is the game as it
  was.

## Measured

**The memory check** (`mp-membudget`, the check every pull request runs: a
phone at 3x in BroTown, at the Flame Fields' fight and home again, three
times), main and main with this change, the same day:

| | main | with this |
|---|---|---|
| canvases, arriving in BroTown | 68 MB | 26 MB |
| canvases, at the fight (the trip's highest) | 90.2-93.2 MB | 48.1-49.7 MB |
| art from files, at the fight (the trip's highest) | 144.2 MB | 102.2 MB |
| the graphics chip, at most | 86.1 MB | 87.2 MB |
| heap, buffers, sound, workers | 30.7, 23.9, 30.1, 29 MB | 31, 23.8, 30.1, 29.1 MB |

What takes the canvases' place is in no line: their PNGs, about a fifth of
the canvases' size (3.5 MB for the 19.3 MB of pictures the screen was drawing
from), so roughly 8 MB of the 42 at the fight; and, for as long as the browser
keeps them, the images' decoded pixels, which Safari can drop when memory runs
short and a canvas it could not.

The art-from-files line falls by the same ~42 MB as the canvases because
Pixi kept every texture made from a canvas in the asset cache that line reads,
keyed by the canvas: those canvases were counted twice. The graphics chip holds
what it held: the same pictures, drawn as before.

The budget's `canvases` line comes down from 96 to 56 MB and `artCache` from
156 to 112 MB (tools/qa/mp/memory-budget.mjs), locking the saving in. No line
goes up.

**The pictures** (`mp-packedimages`): 432 pictures kept as images in a session
in copper armour and a full look, none failed; all 64 walking gear sheets the
page holds are images, none a canvas; and the shirt, the plate and the greaves,
sent to the chip again from their images, read back with **0 bytes different**
from what their canvases sent. Every layer of the bro is drawn jogging every
way, the body under the armour baked from the images, and again after a black
screen's rebuild.

## Tests

- **`keep-as-image` suite §8-9** (node): asked twice while it is kept, one PNG
  and one answer; `quiet` sends nothing again to the chip; asked again once
  kept, no new PNG; a failure may be asked again; an encode that throws at once
  leaves no answer behind; and the wiring (`keepPackedAsImage` in all three
  places, quietly, never under `?gpucopies` or `__btTrimVerify`).
- **`mp-packedimages`** (a phone in copper armour and a full look): every
  walking gear sheet an image, none a canvas; each worn picture sent again from
  its image reads back off the chip byte for byte as it did from its canvas;
  every layer drawn jogging every way, the body baked under the armour from the
  images; and again after a black screen's rebuild. `BT_PI_QUERY=keepimage=0`
  is the game as it was.
- **`mp-membudget`**, the memory check every pull request runs.
