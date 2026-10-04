# The Wheel's buildings have doors (v2.3.3032)

> Owner, 2026-10-04: *"Push to main. Then after that add doors."*

With the portal to today's town gone (v2.3.3025) the forge, the bank, the
shops and the auction house could not be reached at all. The Wheel's Brotown
had seventeen buildings with pictures and footprints and nothing behind them.
Now twelve of them open **today's own building** — the same panels, the same
things the server settles behind them — and the other five say why not.

## What the player sees

Stand at the foot of a building's steps (your boots within 140 px of it) and a
small button comes up above the controls: the word **Enter** over **the name on
the sign**. A tap — or **E** on a keyboard — opens the building.

| Plot (the sign) | Opens | Today's building |
|---|---|---|
| Blacksmith | the forge | BLACKSMITH |
| Woodworker | the woodworker's bench | WOODWORKER |
| Gem Cutter | gem cutting | GEM CUTTER |
| Saloon | the party panel (and the arena's sign-up) | TAVERN |
| Gambling Den | the gambling panel | GAMBLING DEN |
| Cookhouse | cooking | KITCHEN |
| Feed & Seed | the farm panel (plots, seeds, "Visit Your Farm") | FARM |
| Land Office | "Travel to your farm" | YOUR FARM |
| Bank | the bank | BANK |
| Assay Office | the enchanter | ENCHANTER |
| General Store | the market | MARKETPLACE |
| Auction House | the auction house | AUCTION HOUSE |

Nothing else changed in any of them: the same panels open, and every deal in
them is settled by the server exactly as before (the market, the bank, the
forge all work from anywhere — the server never asked which zone you were in).

- **Shut doors.** The Sheriff's Office, the Hotel, the Post Office & Telegraph
  and the Guild Hall are the plan's "(new: …)" buildings and have nothing to
  open yet. Standing at one shows its name and **"Shut for now"** in a small
  caption (not a button) so nobody takes the door for broken. The **Town
  Hall** shows nothing: Mayor Bro stands on its steps.
- **Diego keeps the General Store.** The shopkeeper who buys your loot stands
  west of its steps, facing the street. Walk up to him (within 90 px) or tap
  him and his window opens, as in the old town. Standing at the store's door
  does **not** open it (he is 135 px from there). He stands still here; in the
  old town he strolls.
- **Your farm.** The Land Office's "Travel to Farm" and Feed & Seed's "Visit
  Your Farm" both take you to your farm; its gate at the bottom brings you
  back **to the Wheel, at the door you left by**, behind the same "Entering The
  Wheel" screen a death or a dungeon's way out uses. Today's town is a stop on
  the way, never shown.
- **"Visit 3 buildings"** (Mayor Bro's errand, mayor_1) can be done in the
  Wheel again, and mayor_3 (which asks for the Farm's door) is offered again.
  v2.3.3029 hid both while the Wheel had no doors; they come back by
  themselves. Twelve different buildings entered count as twelve visits.

## How it works

- **Where (the worker, once).** `public/tools/world/core/placing.js`
  `doorSpots(plan, bp, placed)` reads the *placed* objects: a building is
  placed with its foot — the bottom of its steps — on its plot's door, so that
  point is the door. Only buildings with a picture get one (nothing drawn,
  nothing to walk up to). The ground worker ships the list as `objects.doors`
  (`[{ id, name, x, y }]`, 17 entries) after it knows which pictures exist.
- **What (a table).** `src/data/wheelBuildingDoors.js` maps plot id → the
  `TOWN_BUILDINGS` id it opens (`WHEEL_BUILDING_DOORS`), lists the four shut
  plots (`WHEEL_SHUT_DOORS`), says who stands where (`WHEEL_TOWNSFOLK`) and the
  reach (`WHEEL_DOOR_REACH` 140). No imports, so test-world-core reads it: every
  key is a plot of the plan, every value is that plot's own `today`.
- **When (the client).** `src/game/wheelTownDoors.js` `wheelTownDoorAt(S)`:
  the nearest door to your **boots** (`playerGroundDy` below your middle). The
  proximity scan in `BroTown.jsx` sets `S.nearBuilding` to the door's
  `BUILDINGS` index, the very thing the old town's props set — so the Enter
  button, the E key, `enterBuilding`, the visit count and the saved visits all
  work untouched. The button's label is the plot's name in capitals (the old
  labels said TAVERN where the sign says SALOON), laid out as "Enter" over the
  name in the stretch between the bell and the jump button so it covers no
  control.
- **Quests.** `gameSystems.js` `setWheelDoorsOpen(true)` (set by
  `worldTrial.js` with the zones it closes) makes `anyBuildingDoor` count the
  twelve actions the Wheel's doors open, so `questReachable` finds mayor_1's
  three doors and mayor_3's Farm.
- **Diego.** `BroTown.jsx` `_spawnWheelNpcs` adds him at his door's spot.
  `npcSprites.js` loads his **south strip only**, cropped, as the Wheel's own
  copy (`wheelWalkSources`, behind the same loading overlay as Mayor Bro's
  picture; freed when the Wheel's worker stops): about 0.4 MB of textures, not
  the eight strips he walks with in town.
- **The farm trip.** `rememberFarmTrip(S)` (both ways into the farm) notes
  where you stood; the farm's gate (`zoneTransitions.js`, the return branch)
  sets the Wheel's arrival to that spot (`setWheelArrival`), asks for the trip
  down the stairs (`wantWheelSpawn`) and raises the veil
  (`veilWheelTrip`) — the machinery `leaveWheelDungeon` already uses. From
  anywhere that is not the Wheel (`?wayback`, the old World View) nothing is
  noted and the gate leads to town as before.

## Not yet

- The Sheriff's Office, Hotel, Post Office and Guild Hall have nothing behind
  them (duels and bounties, a bed, mail, clans). The Guild Hall could open the
  clan panel and the Post Office a mail list; neither is built.
- The blacksmith, Ace and Lil Bro stay in today's town; only Mayor Bro and
  Diego are in the Wheel.
- The buildings are doors, not rooms: there is no inside to walk into.

## Tests

- `tools/world/test-world-core.mjs` "the buildings' doors": 17 doors at the
  placed buildings' feet, none for a building without a picture, the table
  matches the plan's `today` words, all twelve of today's buildings covered,
  the doors far apart, every door stood-at-able, Diego's spot clear and far
  enough from the store's door.
- `server/test/tutorial.test.mjs` §9: with today's town shut, the Wheel's doors
  bring mayor_1 back and let mayor_3 find its Farm.
- `mp-wheeldoors` (a phone, a real worker): the seventeen doors known; each of
  the twelve walked to — the button says Enter and the sign's name, lies over
  no other control, and opens the right panel; no button a step before (and the
  140 px reach); the four shut captions; twelve visits; Diego drawn, shut at
  the door, open when walked up to; both farm trips there and back to the door
  by way of town's stairs only.
