# The townsfolk walk around and work (v2.3.4058)

The owner, 2026-11-02: *"Make NPCs walk around and do stuff now since it
doesn't make much memory anymore."* His list of 2026-10-26, item 22: *"the
blacksmith hammering, a cook at the fire ... chopping, fishing, farming"*,
made the way players are drawn.

Client only: the worker is not touched, and no message is sent.

## What you see

In the Wheel's BroTown each of the 21 townsfolk has a day of his own
(`src/game/townsfolkWalk.js` `FOLK_DAYS`):

- **Keepers and locals walk a short loop** from their spot by their door, three
  to five stops, 80 to 260 px out, pausing 2 to 12 seconds at each. At some
  stops they work, in one of the player's own work poses:

  | Who | His job | The pose |
  | --- | --- | --- |
  | Chef Blaze | his cleaver, by the Cookhouse | the mining swing |
  | Gavel Greg | the gavel | the mining swing |
  | Sterling | stacking his coins | the pickup |
  | Glint | a gem held up to the light | the pickup |
  | Postmaster Pete | a parcel | the pickup |
  | Deed Dave | planting a SOLD sign | the pickup |
  | Benny | luggage | the pickup |
  | Old Man Reel | fishing by the river | the cast |

  Ace, Slim, Guildmaster Gary, Sheriff Buck (his beat), Bean and Tourist Terry
  walk and stand.
- **Quest givers stay findable.** UI-DESIGN-NOTES said *"A quest giver is
  pinned on purpose: one who wanders is one you have to hunt for"*. The
  owner's new words win, and the reason is kept: a giver (anyone with a
  quest in `QUEST_CHAINS`: Mayor Bro, Diego, Blacksmith Bro, Lil Bro,
  Beastmaster Bro, Woodworker Bro, Farmer Bro) keeps his spot and only shifts
  a step or two round it (every stop within 30 px). Three of them work there:
  the blacksmith hammering at the forge, the woodworker chopping, Farmer Bro
  hoeing (each the mining swing). When you come within 200 px a giver stops
  and turns to face you. A quest given to a keeper later is held to the
  givers' tether automatically (`folkStops`).
- **With a window or dialogue open**, anyone within 300 px of you (the tap's
  reach) stops and faces you.
- **Tap to talk works on a walking townsperson**: the tap, the map pins and
  the quest star all read his position (`S.npcs`), so they follow him.
- **At most 6 walk near the screen at once**: the nearest to the view's middle
  walk, the rest stand where they are until one stops, then walk back onto
  their loops (a phone's frame is the budget).

## How it stays the same on every phone

Where a townsperson is on his loop is a pure function of the clock and a
seed from his name (`folkAt`, `folkSeed`). Two phones with clocks a second
apart see him a second apart. What one phone does on its own (a giver
stopping for you, the cap, a walker waiting while you stand in his way) only
holds him where he is; he then walks back onto his loop at a walk's pace (a
little quicker while behind), never jumping (`folkStep`).

## Nobody walks through a building or into the water

Every stop is an offset from his own spot, never a Wheel coordinate.
`tools/world/test-world-core.mjs` walks every leg of every loop against the
town's footprints and ground (every stop 24 px clear of any footprint, every
leg sampled every 8 px with 14 px round it, as Lil Bro's race line is, and
never within 110 px of another townsperson's spot so a tap finds the one
meant). The town is the same ground on both Wheels. In play, near the screen,
each step is also checked against what is really placed there: the walk
test's footprints (`zoneBlockers`) and the walk grid's walls and water; a step
into one, or into you, waits (`folkGroundBlocked`). The Wheel's plan and
placing are not changed, so nothing is re-baked.

## Townsfolk never block you (v2.3.4098)

The owner, 2026-11-03: *"I walked into Npc who walked into me and I got
stuck."*

**The rule: no townsperson ever stops you.** Walking or standing, keeper,
local or quest giver, you walk through him. He is the one who waits.

**Why you got stuck.** From v2.3.1794 (when the townsfolk stood still) a
townsperson was solid to your walk: `BroTown.jsx` `isSolid` treated a 14 px
circle round his feet as a wall, tested at each corner of your 20 px box,
with a "never trap someone already inside" pass read at your box's centre.
Once they walked, a walker stopped 22 px from your feet (his bump, so as not
to walk into you). There a corner of your box was inside his circle while
your centre was outside it: every step you tried, any way, was "solid", and
his own next step was a bump too. Both of you held for good.

**How it is done** (client only: the worker never knew where a townsperson
stands, so it refuses no move for one, and nothing ships to it):

- `isSolid` reads no townsperson at all (`townsfolk-walk.test` §5a holds it);
  your walk, a dash, a slide, a gust and a pet's fetch all go through it.
- A walker whose next step would take him into you pauses that frame
  (`townsfolkWalk.js` `folkStepBumps`, used by `townsfolkDay.js`): his step
  is read along its length, not just at its end, so a long frame on a slow
  phone cannot hop him through you; and if you have walked into him, a step
  that heads away from your feet is let be, so he walks out of you rather
  than freezing there. Once you have moved on he walks again and catches up
  with his loop. So in the common case you do not see the two of you walk
  through each other.
- Quest givers stay tethered and still stop and face you within 200 px, as
  before. A tap on a walking townsperson still talks to him.
- On the retired old map the rule is the same (the walk test is shared);
  `mp-townmap`'s old "he still blocks you" check is turned round.
- On a computer that draws the townsfolk from photographs (Windows, a Mac:
  `lookPaletteChoice.js`) they stand at their spots; they do not block there
  either.

**Checked by** `townsfolk-walk.test` §5 and `mp-folkpass`: on a phone (the
joystick) and a computer (held keys, the sideways layout), you walk head-on
into a walking keeper and across his way; you keep moving and are past him
within a second of meeting him (scaled for a page that draws slowly), never
standing still beside him, and he never steps into you. With the old
`isSolid` put back, `mp-folkpass` goes red: you stop 24 px from him.

## Memory: nothing new

- The walk is the jog the live townsfolk already used (v2.3.3809).
- The work poses are the player's own body sheets that the look palette holds
  as colour numbers for every phone (`lookSets/body.js`: `mine-south`,
  `pickup-south`, `fish-south`, loaded with the stand and the jog behind the
  loading screen), and the tee's own sheet for each (`gearSheets.js`
  `preloadGear` warms every pose). `rendering/folkPose.js` only lets a
  townsperson work in a pose the palette has in numbers: otherwise the old
  path would bake a copy of the sheet for his look, so he stands instead.
- While he works, his tee is drawn in its colour without its print: the
  palette's tee has numbers for the stand and the jog only, and a printed tee
  in another pose is a picture of its own (`getShirtLookFrame`, a few MB a
  look).
- Far from the screen a townsperson still has no figure at all (v2.3.3809's
  rule: destroyed past the view's half-diagonal + 300 px).

Measured (mp-membudget's trip on the QA box, the same build with walking off,
`QA_MB_QUERY=folkwalk=0`, against on): the graphics chip's highest reading
106.2 / 104.2 MB off (main's own, already at its line of 105) against
110.2-113.9 on; the page's heap's highest 35.8-36.2 off against 37.3-37.4 on.
The work poses are not it (`folkwork=0`: 110.2 / 111.4). In the town alone the
chip held 0-2 MB more walking: every facing of the shared head pieces and tees
drawn within the last minute (Pixi lets a texture go after 60 s unused), and
about 1 MB of heap for the townsfolk's figures that walking brings near the
screen. So `tools/qa/mp/memory-budget.mjs` raises `gpu` 105 -> 115 and `heap`
36 -> 38, said there. mp-wheelfolk: no photograph fetched or held (0 MB), as
before.

## The looks the numbers refuse: baked behind the loading screen (v2.3.4400)

> The owner's iPhone 14 Pro Max on the skateboard through the town, its frame
> meter (`?perf=1`) reading "late frames 10 in 10s", "worst 170.0 = game 40.0
> + outside 130.0": "still gritty looking".

"Memory: nothing new" above was true of the POSES and not of every LOOK. The
shared colour numbers refuse a look with an **eye style** (the body's own
eyes are blanked for it) or a **pattern on the trousers or boots** (stamped
on the body): `playerSkins.js getLookBodyFrame` returns nothing, and the old
path bakes a copy of the body sheet for that look, on the page, the first
time he is seen in each pose and each direction. Four of the twenty-one have
such a look (Blacksmith Bro's striped sweatpants; Farmer Bro's, Beastmaster
Bro's and Old Man Reel's eyes). On a ride through the town that was five
bakes of 80 to 250 ms each on the test box, each a frozen frame.

What a townsperson can be drawn in is known before he takes a step
(`game/townsfolkWalk.js folkDayPoses`, `folkBakeJobs`): standing and walking
in **all eight facings**, and each job of his day facing south. The renderer
asks for exactly those sheets, with the very call that draws him, only where
the numbers refuse his look, and waits for the bakes
(`entityRenderer.js prewarmFolkBodies`), behind the world's loading screen
(`worldTrial.js preloadWheel`; PRELOADING IS LAW). 34 sheets, 2.5 s on the
test box. Never held past 8 s (`FOLK_BAKE_WAIT_MS`); `?folkbake=0` is the old
way. They keep walking and working, and their looks are untouched.

**All eight, not only his route's.** The first cut baked the jog along each
leg of his route and the stand at each stop (23 sheets), and the owner's next
ride read "way better with just a few occasional hiccups", the meter naming
one: "between frames: body jog-east 101.0 ms". He does not keep to his legs.
He stops and turns to YOU (`townsfolkDay.js`, attend: any facing), and after
any wait (you, the walkers' cap, a bump) he walks STRAIGHT to where his route
has him now, across its corners (`folkStep`: any facing). The Blacksmith's
route runs on the diagonals only, so his walk east or west was never baked:
91 ms on the test box, the owner's 101.

The same memory, sooner: these are the sheets a walk round the town baked one
by one before. What the memory check reads of them is in the PR's body.

Another PLAYER with an eye style or a drawing is still baked when first met,
as every pose of a peer's is (the preload law's named exception): in a crowd
that is the same freeze, and is `docs/STATE-MACHINES.md` A2's to fix.

Checked by the `folk-bakes` suite and `mp-townride`: a ride right through
the town (5 moving sheets baked on the page before, the longest 258 ms; none
now, the longest job 21 ms), and each of the four set down off his route in
each of the eight directions to walk straight back (7 sheets baked on the
page with the first cut, 45 to 91 ms each; none now).

## Where it is off

- **On a computer** (Windows, a Mac) the look palette is not built
  (`lookPaletteChoice.js`), so the townsfolk are drawn from their photographs,
  which cannot step or work: they stand at their spots facing the street, as
  before. Drawing them live there would bake a copy of the body for each look
  (the old path), which is a separate choice for the owner.
- The Test panel's **"Townsfolk drawn live"** off (`clientOff` `lookfolk`) does
  the same on every phone, live.
- `?folkwalk=0` keeps them at their spots on one phone.
- `?folkwork=0` lets them walk but stand at their stops (no work poses), on one phone.

## The code

- `src/game/townsfolkWalk.js`: the days (`FOLK_DAYS`), the loop, the step, the
  ground test, the cap (no imports).
- `src/game/townsfolkDay.js`: the frame's work on the game's state
  (`townsfolkFrame` once a frame, `townsfolkStep` for each townsperson in the
  NPC pass, after Lil Bro's race); the probe `window.__btFolkWalk()`.
- `src/rendering/folkPose.js`: the work pose and its frame, and the standing
  facing, for `entityRenderer` `_drawFolk`.
- Hook-ups: `src/ui/BroTown.jsx` (the NPC pass: two calls, two conditions),
  `src/rendering/systems/entityRenderer.js` (`_drawFolk`: the pose, facing and
  frame lines; the tee's print at work; the probe's `pose`).

## How it is checked

- `server/test/townsfolk-walk.test.mjs`: the loop, who does what, a frame
  (givers stop for you, the cap, no walking into a footprint, the water or
  you), the wiring; §5 townsfolk never block you (v2.3.4098).
- `server/test/npc-cast.test.mjs` §2b: each of the new cast walks his own day,
  a quest giver tethered.
- `tools/world/test-world-core.mjs`: every loop on the town's ground, through
  no footprint.
- `mp-folkpass` (v2.3.4098): you walk into a walking townsperson, head-on
  and sideways, on a phone and a computer, and keep moving past him.
- `mp-folkwalk`: on a phone, the townsfolk move along their loops, a keeper
  works, at most six walk near the screen, a giver stops and faces you, and a
  tap on a moving keeper opens his window.
- `mp-wheelfolk`, `mp-npccast`, `mp-membudget`, and an `mp-ghostaudit` sample
  of each work pose once.
