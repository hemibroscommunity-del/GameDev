# Coming back to a parked tab: the pictures Safari threw away (v2.3.3574)

The owner, 2026-10-22, with a screenshot:

> I returned to the game after I went into a different tab on my phone and my
> character was missing features at certain angles. In screenshot you can see
> my head and legs missing

The screenshot showed the copper torso, the copper greaves, the green hair,
the slung wooden shield and the staff. There was no skin, face or boots under
them. The body the game bakes under armour was blank.

## What happens

The game makes most of its pictures itself, on canvases. Examples are every
body and armour sheet cut to its frames, the body baked under the armour one
frame at a time, the gathering figures and the effects' strips. Pixi sends a
canvas to the graphics chip only the first time it is drawn.

A phone in BroTown wearing armour held about **690 canvases (~70 MB)**, and
**~580 of them had never been drawn** (mp-tabwipe's census). They include the
frames of facings you have not turned to and poses you have not struck.
Only **19 of 173** masked body frames were on the graphics chip. The loading
screen's upload (v2.3.701) runs before the bake worker has delivered most of
its frames.

iPhone Safari can empty a canvas while the tab is parked, and gives a 2D
canvas no event for it (WebKit bug 195325; MDN lists no `contextlost` for
Safari). The owner's screenshot is the evidence. The likeliest mechanism is
that the memory behind the canvas is given back to the system; that has not
been measured on a phone. When it happens:

- what is already on the graphics chip is untouched, so the screen looks fine
  at first;
- a picture drawn for the first time afterwards is uploaded from the emptied
  canvas, blank, and stays blank;
- a picture baked afterwards **from** an emptied one (a new frame of the body,
  from its sheet) is blank too;
- pictures loaded from files (the hair, the armour's own art, the shield, the
  staff) are read again from their files and look right.

That is the screenshot: whatever the body needed that had not been drawn
before the tab was parked.

## Made to happen on a test phone

`mp-tabwipe` wears armour the real way and walks east, so the east frames are
drawn. It hides the page, then empties every canvas behind a texture with
`clearRect`, as Safari empties them; their copies on the graphics chip are
untouched. Then it shows the page again and walks every way, reading each
facing's body back off the graphics chip.

On the game before this change, the body under the armour came back with
**0 opaque pixels in all eight facings**. That includes east, whose other
frames of the run had not been drawn either.

The census also named what makes the canvases that were never drawn. Gear
sheets, body sheets, gathering figures, effects' strips, masked bakes,
blades, clouds and the campfire all make them. So the problem is not the
body's alone: any of them can come back blank.

## What the game does now

**Each packed picture is witnessed as it is made.**
- `gearSheets.packTrimmed` notes one solid pixel of every picture it packs
  (alpha 128 and up), in `rendering/canvasWitness.js`. Its own scan already
  finds those pixels, so this costs nothing.
- Witnesses are weak references, so a picture let go of is let go of here
  too.
- A canvas freed on purpose (`width = 0`: gpuOnly.js, the bakes' scratch) is
  skipped.

**Coming back, they are read again.**
- wsClient's `_resumeRecover` (the page shown again, a back-forward restore, a
  thaw) first reads a sample of the witnesses, one pixel each: the 24 biggest
  canvases and a spread of 24 of the rest. On the test phone that took
  1-3 ms.
- **Nothing empty:** nothing happens.
- **One empty:** every witness is read before anything is decided. A canvas
  cleared on purpose must never reload the game, and a few emptied must not
  be missed.
- **Two or more empty:** the pictures were thrown away. A `canvas-purge` entry
  goes in the crash log, and BroTown's recovery reload brings every picture
  back from its files. The page reloads straight into the world behind the
  bro's own veil (game/avatarHold.js), as the black-screen watchdog's reload
  does: the same door, the same cap of two reloads in five minutes.

**On the same spot.**
- The reload keeps where you stood in the Wheel (`_recoveryReload(why,
  { spot: true })`, `bt_resume_spot`).
- The straight-in road hands it to the trip down town's stairs
  (`setWheelArrival`). That is the same way a dungeon's door puts you back at
  its mouth.
- The worker judges that way in from where it last had you
  (server/src/lastplace.js).
- In a dungeon or on the farm, the road's own arrival is used, as before.
- The door opens only once you are in the world (`worldInMs`). On the login
  door or in the creator there is nobody to put back.

**Why a reload, not a repair in place.** Uploading every picture when it is
made would put about 45 MB more on the graphics chip, against the memory
budget that keeps an iPhone from going black. Remaking pictures in place would
need a remake path in each of the dozen systems that make one. Any one of
them missed would leave its pictures blank, and the census shows how many
there are. A fresh page brings every picture back, and the v2.3.777 note
records that a fresh boot "has worked 100% of the time".

`?canvascheck=0` is the game as it was. `window.__btCanvasWitness()` shows the
witnesses and the last check.

## A black screen's rebuild asks too (v2.3.3701)

The owner, 2026-10-27: "Northwest jog has trouble loading reloading textures
after recovering from black screen."

**Why northwest.** In a matched set of armour (a copper torso with copper
greaves, an iron torso with iron greaves) the jog is the painted knight
figure, loaded from its file, in every facing but one: northeast, and its
mirror northwest, have no figure (`_fullsetFrame`), so they are drawn as the
body baked under the armour on canvases, with the plate and greaves over it.
Those two facings are the only ones whose jog depends on canvases.

**What happened.** A black screen is the graphics chip reset; the game
rebuilds its renderer 2.5 s later (crashTrap `watchContextLoss`, BroTown
`_rebuildRenderer`) and sends every picture to the new chip again from where
the page keeps it. On an iPhone that reset comes from memory pressure, the
same pressure that can make Safari empty the page's canvases (TRAPS §250). A
rebuild after such a purge uploads the emptied canvases: blank. The check
above ran only when the page came back to the tab or thawed from a freeze, and
a black screen during play is neither.

`mp-rebuildjog` made it happen on a test phone (the canvases emptied as Safari
empties them, then the context lost). On main the rebuild went ahead and drew
blanks; a reload was asked for 8.5 s after the black screen and the new page
was up at about 15 s, and only because this test machine froze for 6 s during
the rebuild (a "thaw"), with the black-screen watchdog counting dark samples
behind it. A phone that does not freeze would have stayed
on the blanks: whatever the watchdog does not see as dark, such as the body in
two facings.

**What it does now.** `_rebuildRenderer` reads the witnesses first, after its
debounce and before it remounts the canvas. Two or more read empty and it is
the recovery reload instead, on the same spot of the Wheel, through the same
door and under the same cap (two reloads in five minutes); otherwise the
rebuild goes ahead as before. `canvas-purge` in the crash log says
`rebuild (...)`. `?canvascheck=0` is the old way.

Measured with the fix: the reload 3.7 s after the black screen ("48 of 48
pictures read back empty", 1 ms), and every layer drawn in all eight facings
once back. A black screen with the pictures intact rebuilds as before, and
every layer is drawn in all eight facings after it.

## Tests

- `mp-tabwipe` (7 checks, a phone in the world):
  1. (guard) the armour is worn and the bakes are made;
  2. a return with the pictures intact remakes nothing (48 read back, 0
     empty, 1 ms);
  3. (guard) the wipe empties ~700 canvases, ~580 of them not on the chip;
  4. the game finds them emptied ("48 of 48 pictures read back empty") and
     reloads straight back in;
  5. on the same spot: **0 px** from where it was parked;
  6. the body is whole in all eight facings;
  7. no page errors.
  With `BT_QA_QUERY=canvascheck=0 QA_TW_EXPECT=blank` it shows the game as it
  was: no reload, and blank in all eight facings. `QA_TW_SHOTS=1` saves each
  facing; `QA_TW_CENSUS=1` with `QA_DIST=dist-prof` names each canvas's maker.
- `canvas-witness` server suite (16 checks): the sample, the answer of two,
  one empty reading everything, freed canvases skipped, the switch, and the
  wiring in packTrimmed, wsClient and BroTown -- since v2.3.3701 the black
  screen's rebuild asking first and stopping at the reload. Five deliberate
  breakages are all caught, and a rebuild that reloads and rebuilds anyway.
- `mp-rebuildjog` (8 checks, a phone in the world in a trouser pattern, hair,
  a hat, glasses and the copper torso and greaves): every layer of the figure
  -- body, shirt, plate, greaves, hair, hat, glasses, head -- read back off
  the graphics chip in all eight facings, jogging: before; after a black
  screen (the context lost, the game's own rebuild), twice; and with the
  canvases emptied and the context lost, the rebuild reloading instead
  (within 15 s, caught at the rebuild, not after it), back on the same spot
  and every layer drawn.
- TRAPS §250.

## Not done

- Whether Safari empties only accelerated (large) canvases, so that making the
  game's canvases software-backed would stop it happening at all. That cannot
  be tested off a phone, and it would move ~70 MB between Safari's processes
  without a measure.
- Pictures that are not packed (the worker-cropped masked frames, the clouds,
  the campfire) are not witnessed. They do not need to be: a reload brings
  them back too, and the packed ones are hundreds of witnesses for the same
  event.
