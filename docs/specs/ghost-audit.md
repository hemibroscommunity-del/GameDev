# The ghost audit: every animation, nothing of the body under it (v2.3.3651)

The owner, 2026-10-27: "check all the animations for ghost remnants of either a
body beneath or areas for cleanup".

Until now each bug of this kind was found one at a time, by the owner:
- the plain body flashing under the armour (v2.3.3577);
- bare hands over the plate while fishing (v2.3.3623);
- a band of belly in the mining swing (v2.3.3622).

The audit looks for all of them at once.

## The tool

`node tools/qa/mp/run.mjs ghostaudit`, then
`python3 tools/qa/ghost_audit_report.py`.

`mp-ghostaudit` walks one bro through every animation his own screen draws and
photographs every frame:

- **He is painted in colours nothing else wears:** green skin, a yellow tee,
  pink trousers, blue boots, no hair. He wears an iron plate and greaves, put on
  the way a player puts them on (the worker's kit, then the game's own equip).
  So any of those colours where the armour should be is the body showing
  through, whichever piece of code drew it.
- **He is alone in each photograph.** Every world layer is hidden except the
  ones the figure is drawn in. Anything already standing in those layers before
  the animation began (the tree he chops, a passer-by) is hidden too. The
  figure stands on the canvas's own colour.
- **The game's clock is held** (`Date.now`, which every renderer reads) and
  stepped, so each frame is the one asked for, not whichever one a slow machine
  happened to draw. The held clock creeps half a microsecond a read, so code
  that runs "until N ms have passed" still finishes.
- **The black-screen watchdog is kept away.** A screen that is nearly all the
  canvas's colour looks to it like a lost graphics context, and it would rebuild
  the renderer or reload the page in the middle of a sweep. It does not judge
  behind a loading veil, so the audit lays a hidden one.
- **After each animation**, nothing of it may still be on screen, and the
  walking body must be back.

The animations covered:
- standing and jogging, all eight facings;
- the hit's flinch and the roll, eight facings each;
- the loot pickup;
- the sword's swing, the bow's draw and the staff's cast, eight facings each;
- the jump, eight facings;
- mining, chopping, fishing, lighting a fire and cooking.

Every frame goes to `tools/qa/mp/out/ghost/` with its pose in `index.json`. The
report counts each colour in each frame and draws contact sheets, each frame
beside a mask that paints the body's colours pure.

The settings:
- Three outfits: the full set, the plate alone, the greaves alone.
  `BT_GHOST_OUTFITS=full` runs the full set only (about 38 minutes on this box).
- `BT_GHOST_ONLY=stand,jog` runs only those animations.
- Up to 6 device pixels of a covered colour are forgiven a frame
  (antialiased edges).

## What the first run found (full set, 617 frames)

| animation | frames | frames with the body showing | worst (px) | what it was |
|---|---|---|---|---|
| sword swing | 80 | 80 | 688 | the swing's own body showed its trousers and boots beside the greaves, and the sword sheets had grey painted into their gaps, read as boots |
| bow draw | 168 | 43 | 15 | the bow's own pale wood, read as the yellow tee: not a fault |
| jog | 159 | 64 | 56 | pink at the waist between plate and greaves, north-east and north-west; elsewhere specks of the boots' and trousers' colours on the head's outline |
| hit, jump, chop | 105 | 23 | 31 | the same specks |
| fishing | 25 | 21 | 54 | over the greaves, the grip lifted the trousers instead of the hand |
| mining | 14 | 11 | 51 | the specks, and the miner's tee had pinholes. Also not counted here: the pickaxe painted in the player's skin colour |
| lighting a fire | 31 | 31 | 1,622 | the log was the art's magenta key, never coloured; the "tee" was the fire's own yellow flames |
| stand, roll, pickup, staff | 35 | 0 | 0 | clean |

Nothing showed both the walking body and a stand-in in the same frame, in any
animation.

## What each became

| found | fixed in |
|---|---|
| the swing's and bow's bodies under greaves; the grey fill in the sword sheets | v2.3.3640 (#1139): `docs/specs/standin-legs.md` |
| the specks of the trousers' and boots' colours round the head | v2.3.3647 (#1144): `docs/specs/garment-specks.md` |
| the angler's grip over greaves | v2.3.3646 (#1141): `docs/specs/fish-armour-hands.md` |
| the pickaxe in skin colour, the miner's tee pinholes | v2.3.3648: `docs/specs/pickaxe-wood.md` |
| the pink waist jogging north-east and north-west | v2.3.3645 (#1142): `docs/specs/iron-waist.md` |
| the fire-lighter's magenta log | v2.3.3649 (#1145): `docs/specs/fire-log.md` |
| the fire's painted flames (the owner's own ask: the fire drawn in code) | v2.3.3655: `docs/specs/fire-start.md` |

## Left as they are

- **The fire-lighter's waist and boot.** On the standing frame of lighting a
  fire, a thin line of the trousers shows at the waist between the plate and the
  greaves, and a sliver of boot behind the greaves. The fire-lighter is one
  painted figure with the garments laid over it frame by frame, and they do not
  quite meet there. It is a few pixels for about half a second.
- **The steel plate's mining sheet** has small holes over the skin, 5 to 20 px a
  frame. Whether they show after the armour's bake was not checked.
- **The tee's pickup sheet** has 28 px of holes over its 29 frames. The pickup
  showed nothing through the full set.
- **Leftovers the check flags, and why they are not faults:**
  - after lighting a fire, the campfire you lit, still burning (a Container in
    `gatherNodesFront`);
  - after the roll, a pine tree (`wood-pine.png`) that the roll carried into
    the photograph's window. The check now names each piece's picture, which is
    how it was found;
  - after mining, the rock you mined, still standing.
- **Cooking** drew no frames in this run: the audit's tap on the campfire did
  not start a cook. That is the test, not the game (`mp-cookink` covers the
  cook).

## After the fixes

The full set again, on a build with every fix above (the same 617 frames as the
first run; cooking again drew none):

| animation | first run: frames with the body showing, worst (px) | after |
|---|---|---|
| sword swing | 80 of 80, 688 | 2, 11 |
| jog | 64 of 159, 56 | 0 |
| hit, jump | in the 23 of 105 below, 31 | 0 |
| chop | in the 23 of 105, 31 | 10 of 31, 17 |
| fishing | 21 of 25, 54 | 5, 17 |
| mining | 11 of 14, 51 | 4, 18 |
| bow draw | 43 of 168, 15 | 43, 15: the bow's pale wood, not the body |
| lighting a fire | 31 of 31, 1,622 | 31, 804: the strip's painted flames, read as the tee's yellow |
| stand, roll, pickup, staff | 0 | 0 |

- **What is left on the swing, chop, fishing and mining** is at most 18 px a
  frame: edge pixels of the body's colours along the armour's outline, and on
  some frames a sliver at the waist between the plate and the greaves. The
  waist is the owner's "align the greaves so the waistband doesn't show", its
  own piece of work.
- **The fire's 804 px are the painted flames**, which v2.3.3655 takes out of
  the strip (`docs/specs/fire-start.md`). The fire is drawn in code there, so
  nothing yellow is left to be read as the tee.
- **Nothing showed the walking body and a stand-in in the same frame**, in any
  animation, before or after.
