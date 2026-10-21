# The Hotel opens: a real rest (v2.3.3539)

The owner, 2026-10-21: *"I value SIMPLICITY and INTELLIGIBILITY"*. This is
item 5 of the after-review list agreed with the outside evaluation.

## What it did

- **The farm's bed** promised "Restore All + Well Rested Buff" (+10% XP for
  30 minutes). It all happened on the phone (BroTown.jsx):
  - The phone filled its own health, stamina and mana, and the server's next
    update put them back.
  - It started a timer that only the phone's own, long-retired XP popups read.
  - The server never paid the +10%.
- **The Hotel** in BroTown stood shut ("Shut for now") for exactly that
  reason: its rest would have been the bed's, which only the phone believed.

## What it does now

**The server pays the rest** (`server/src/rest.js`).

- **Asking.** The phone sends `rest_request {where}`, which is `'hotel'` or
  `'farm'`.
  - **Hotel:** you must be in the Wheel, within `REST.HOTEL_R` (260 px) of the
    Hotel's door.
    - The door is `REST.HOTEL`, an offset from the Wheel's middle. The town is
      the same ground on both Wheels, as Lil Bro's race already relies on.
    - `tools/world/test-world-core.mjs` holds the offset to the door the
      ground worker actually places.
  - **Farm:** you must be on your own farm (`farm_home`). The bed is where its
    button is.
- **Refused**, with an answer and nothing changed or written:
  - **`fight`:** in a fight, meaning a blow dealt or taken in the last 10 s,
    or a fight with a player (the one-bite rule's own window).
  - **`soon`:** a second rest within a minute (`REST.GAP_MS`). Each rest is one
    saved row (the cost guard).
  - **`where`:** the wrong place, or an unknown `where`.
  - A dead player is answered nothing.
- **A rest**:
  - fills health, stamina and mana;
  - starts **Well Rested**, `_buffs.wellRested`, for 30 minutes. This is a
    different key from the Herb Bread's `rest`, its half hour of double
    healing;
  - is saved (one row), echoed (`player_state` carries `_buffs`), and answered
    `rest_result {ok, until, ms, where}`, a server-only message
    (`PRIVILEGED_EVENTS`).
- **What Well Rested pays:** +10% of the XP a fight pays (`prog3.js`
  `_prog3AwardXp`).
  - It **adds** to the Pumpkin Pie's +10%, so both together give +20%.
  - It never touches a flat award, such as a quest's XP.
  - A meal or a brew never clears it, it survives a death and a reconnect,
    and resting again restarts its half hour.
- **Free.** The Hotel is in town and the bed is on your own farm, so a rest
  costs the walk back, never gold.

### On the phone

- **The Hotel is a fifth hall** (`src/data/wheelBuildingDoors.js`
  `WHEEL_HALL_DOORS.hotel`), with the owner's bed on its Enter button.
  - It is open only against a server that says `caps.rest` (`WHEEL_HALL_CAPS`;
    `game/wheelTownDoors.js` `setWheelHallCaps`, which wsClient calls at every
    `state_sync`). Against an older server it stays shut and says so, as it
    always did.
  - `WHEEL_SHUT_DOORS` is now empty.
- **Its window** (`WheelHallPanel.jsx` `hotel`) sits over the owner's picture
  of the room (`BUILDING_ROOMS.hotel`; the picture waited in `SPARE_ROOMS`):
  - a line saying what a night does: "fills your health, stamina and mana,
    and makes you Well Rested: +10% combat XP for 30 minutes. Free.", or how
    long Well Rested has left;
  - one row, **Rest**.
- **Rest** closes the window, as every hall's row does, and the answer is said
  over your bro (`game/rest.js`):
  - "Fully Rested!" and "+10% combat XP for 30 min", with the bed's own sound;
  - or why not: "Can't rest in a fight", "You just rested".
- **The farm's bed** asks the server the same way: the E key, the right stick's
  tap and the Sleep button all go through BroTown's `_desktopSleep` (the
  button was a copy of it). The phone-only rest is kept for an older server.
- **Well Rested is a "Rested" chip** with the other timed effects at the top
  left.
  - Its picture is the owner's bed made 64 px (`BUFF_ICON.rested`, made by
    `tools/ui/make-rested-badge.py`).
  - The old badge at the top right is gone: in the Wheel it lay over the
    minimap.

## Switch and deploy order

- **Kill switch:** `rest: false` in the live flags.
  - The server refuses every rest (`off`) and pays no Well Rested XP.
  - `caps.rest` reads false at the next join, so the Hotel is shut again and
    the bed rests on the phone as before.
- **Deploy order:** either half can go live first.
  - A new page against an older server: the Hotel stays shut and the bed
    keeps its phone-only rest.
  - An older page against a new server never sends `rest_request`.

## Tests

- **`rest` suite** (48 checks):
  - a rest at the Hotel on both Wheels, and on the farm;
  - every refusal, each changing and writing nothing;
  - the XP: +10%, added to the pie's, never on flat awards, gone when it
    runs out;
  - a meal or brew leaves it, and it outlives a reconnect;
  - the switch and the caps;
  - the wire: routed, never relayed, and privileged;
  - the page's half (`game/rest.js`).

  15 of 16 broken versions fail it. The 16th changes nothing a player sees.
- **`small-icons`** counts nine buff pictures. **`sound-cues` 9e** checks that
  every way to rest is heard.
- **`test-world-core`** checks:
  - five halls, none shut;
  - seventeen windows and sixteen rooms, none spare;
  - `REST.HOTEL` is the placed door.
- **Phone checks:**
  - `mp-hotel` (13): the door, the window, a rest at the Hotel through the
    real button with the server's numbers read back, the refusal, and the
    farm bed's Sleep resting you through the server.
  - `mp-wheelhalls` (23): five halls, the Hotel's Enter.
  - `mp-buildingrooms` (21): sixteen rooms.
  - `mp-wheeldoors` (12) runs under `rest: false`, so it still sees the Hotel
    shut, as an older server leaves it.

## v2.3.3548: the bed's Sleep button shows when you stand there

- **Found** by the check of today's merged main: on your farm, standing at the
  bed at full health, the **Sleep** button did not come up. The Dungeon
  Workshop's and the Pet House's buttons had the same fault.
- **Why:** the three buttons are drawn from flags the game loop sets
  (`S._nearHouse`, `S._nearWorkshop`, `S._nearPetHouse`), and nothing handed
  them to React. Since v2.3.2330 the screen no longer redraws twice a second,
  so a button came up only when something else redrew it (a health change, a
  window). The E key and a tap on the right stick (its moon) still slept;
  only the button was missing.
- **Now** they are one piece of React state, synced twice a second with the
  town's doors (BroTown `setFarmNear`), so the button comes up as you arrive.
- **The check:** `mp-hotel` wants the Sleep button within 5 seconds of
  standing at the bed, before its minute's wait. On the build before, it
  never came (the rest went through only after the test lever changed your
  health); with the fix, all 13 checks pass. TRAPS §243.

## Not done

- **The respawn.** The Hotel's plan words were "rest, respawn", and a death
  still brings you back where you arrive in town.
- **A keeper outside the Hotel.** That needs the owner's picture of one.
