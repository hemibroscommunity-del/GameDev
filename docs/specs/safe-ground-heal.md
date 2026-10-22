# BroTown's safe ground heals you quickly (v2.3.3569)

The owner, on the second risk in the first-30-minutes estimate
(docs/specs/first-30-minutes.md): "Yes standing on the safe ground should heal
you quickly."

## What changed

| Where you stand | Before | Now |
|---|---|---|
| BroTown and the commons around it (the world's safe ground) | 1% of your HP a tick (~0.67 s), starting 6 s after a fight: about **67 s** from empty to full | **10% of your HP, stamina and mana a tick**, starting 6 s after a fight: about **7 s** from empty to full |
| Anywhere else in the world | 1% a tick after 6 s | unchanged |
| The retired old town, the farm | 10% a tick | unchanged |

On a phone (`mp-safeheal`): from 25 of 250 HP the bar was full in 5.8–6.9 s.
With the switch off, the same 25 climbed to 61 in 8 s.

## Why it waits 6 s, when the old town never did

The old town had no monsters. The safe ground can: a monster you hurt follows
you onto it (v2.3.3056). So the fast heal starts only when nothing has hit you
**and** you have hit nothing for 6 seconds. That's the same "out of a fight"
the wilds' slow heal already uses, so the fast heal starts exactly when the slow
one would have. A fight at the town's edge heals nobody faster.

A player walking back from the slimes is out of the fight long before they
reach the Mayor, so in practice the bar fills as they arrive.

## What still doesn't heal fast

- **A duel** on the safe ground: none of the three bars (a heal that outruns the
  damage makes a duel unendable, the reason the old town's duels and the arena
  already turn healing off). Unlike the old town, stamina and mana aren't topped
  off in a duel either: in the world they never were, and duels stay as they
  were.
- **An arena match**: no HP, as before.
- **Lil Bro's race** (run on the town square): HP and mana as fast, but stamina
  only its usual refill, because the race's sprint was tuned against it
  (server/src/race.js "THE NUMBERS"). A race left past its end time stops
  counting.
- **Holding the shield, a broken guard, sprinting**: stamina drains or holds as
  it always did.
- **A phone out of step with the room's world** (a tab left open across a
  deploy that changed the world's size): it stands somewhere else on its own
  map, so no fast heal until it reloads.

## How it's built

- `server/src/safeheal.js` (a mixin, handoff rule 22): `_safeHealHere(ps, now,
  inDuel)` says whether the regen tick heals a player at the hub's pace;
  `_safeHealRacing` holds the race's stamina; `_safeHealOff` reads the switch.
- `server/src/index.js` `_tickPlayerRegen`: the hub's HP branch and its
  stamina/mana top-off read `inHub || safeHeal`, so the pace is the hub's own
  code, not a copy. Everything else there still reads `inHub`.
- The safe ground is `_wheelSafeAt` (wheelzone.js): within the baked
  `WHEEL_SAFE_R` of the world's middle, the same ground monsters already treat
  as safe.

## Wire, storage and cost

| | |
|---|---|
| New messages | none: the pools are the worker's, and the phone's bar climbs as each `player_state` echo arrives (its climbing heal keeps the bar up while it fills) |
| Caps flag | none (no phone change) |
| Kill switch | `safeheal: false` in the live flags: the wilds' 1% trickle again |
| Storage | the regen tick's own write, coalesced to `REGEN_SAVE_MS` (handoff rule 4): healing empty to full writes one row, as before |

## Tests

- **`server/test/safe-heal.test.mjs`** (36 checks) covers:
  - the hub's 10% on the safe ground, and empty to full in ten ticks (the
    wilds' trickle takes 83);
  - 40 px inside the edge is fast, 40 px past it is the trickle;
  - a hit taken or dealt in the last 6 s heals nothing;
  - a duel, an arena match, the race and a sprint;
  - the kill switch, and a phone out of step;
  - the old town, the wilds and a dungeon unchanged;
  - one row written.

  Ten deliberate breakages are all caught.
- **`mp-safeheal`** (a phone in the world, 4 checks): from a tenth of the bar,
  full in about seven seconds in BroTown; with the switch off only the trickle;
  quick again once it's cleared; no page errors.
