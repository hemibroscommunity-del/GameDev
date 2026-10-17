# Into the Wheel with only the monsters around you (v2.3.3318)

The owner, 2026-10-17, after the Wheel became five times longer
(`docs/specs/wheel-5x.md`): "Push all these to main then keep going." This is
the first item on the 5x work's "not in this PR" list.

## What was wrong

A phone stepping into the Wheel was sent every monster in it, whole: the
`zone_state` monster list, and the same list in `state_sync` for a join that
lands in the Wheel (a reconnect). On the five-times Wheel that is 1,920
monsters:

- about 480 KB of the 580 KB `zone_state` (the rest is the 1,222 nodes and the
  loot);
- 12-29 ms of the room's time to build;
- on every trip in: a login, a death's way back, a dungeon's, the farm's.

The phone then kept a copy of each. But the worker tells a phone only about
the monsters within `WHEEL.INTEREST_R` (2,400 px), and the renderer draws only
those near the screen. Nearly all of the list was never used.

It was sent anyway because the tick cannot introduce a monster:

- A tick's monster says where it is and how it is doing: `id`, `x`, `y`,
  `hp`, `alive`, sometimes `st`, `ph`, `bu`, `tg` (tick.js `monsterWire`). It
  does not say what the monster is.
- The phone updates only monsters it already holds (wsClient.js, the tick's
  monsters).
- An EMPTY arrival list meant "the worker runs no monsters here". The phone
  then made its own (wsClient `_applyZoneMonstersMsg`).

## What changes

A phone that says it can take it sends `wn: 1` in its join, beside
`protocolVersion: 2`. Every phone from this version does. Such a phone gets:

1. **On the way in, only the monsters around it.** These are the monsters
   within `WHEEL_NEAR.R` (= `WHEEL.INTEREST_R`, 2,400 px) of where it stands
   (`server/src/wheelnear.js` `_wheelNearPick`).
   - The `zone_state` is marked `mnear: 1`; a join's `state_sync` is marked
     `monstersNear: 1`.
   - An empty list (BroTown's square: the nearest monsters are a stretch
     away) still means "the worker runs the monsters here".
   - Each monster is said exactly as the whole list says it. One function,
     `monsterSnapWire` (spawnscale.js), makes both.
2. **The first time a monster comes into its reach, that monster whole.** It
   comes in that phone's tick as `mw: {"wheel": [...]}`, keyed by zone like
   the tick's monsters, in the snapshot's wire.
   - The phone makes it (wsClient `_monsterFromWire`, the one copy shared
     with the join and the zone change) BEFORE the tick's monsters update it.
     So the tick that first shows it shows it whole.
   - It is sent once. The session keeps the ids it has sent whole
     (`session._wheelWhole`) until it leaves the Wheel, as the phone keeps
     its copies. A monster that walks out of reach and back comes back by
     the tick alone.
   - Only that phone's copy of the tick carries it. The message the room
     caches is unchanged, and tick-share's byte-for-byte check still holds.
3. **The arrival seeds what the tick's interest has heard.** The arrival's
   monsters are put in `session._wheelSeen`, so the first tick after it sends
   none of them again. The old way in sent them twice: the list, then the
   first tick.

## What a player sees

Nothing new.

- Every monster the screen or the minimap can show is within `INTEREST_R`
  (wheelzone.js: wider than any view's half-diagonal plus `FAR_MARGIN`).
- The world map shows only "the monsters near you".
- A far monster's death is still told to every phone in the Wheel
  (`monster_kill`, eventplace.js). A phone that does not hold it ignores it,
  as every handler already did for an id it does not hold (gameEvents.js:
  each lookup guards, and `xpMultFor(undefined)` is 1).
- A kill's death sound carries 1,150 px (`EAR_FAR`). That is inside the reach,
  so no kill a player would have heard goes silent. A roll for a kill the
  phone does not hold shows over you (`killRoll.js`), as one off screen
  always did.
- A monster first met dead is made dead (its wire says `alive: false`). There
  is no alive-to-dead edge, so no remnant pile and no death sound for a death
  you never saw.

## Measured

- Server suite `wheelnear` (on the live, five-times Wheel):
  - the town square's `zone_state` 140 KB where the whole list's is 580 KB
    (what remains is the nodes and the loot);
  - an arrival among Frost Ridge's first stretch carries its 29 monsters in
    reach.
- Phone test `mp-wheelnear` (two phones on a real worker, 11 checks):
  - the way in 140 KB, marked near, with no monster in BroTown's square;
    a `?wheelwhole` phone's is 582 KB with all 1,920;
  - out on Frost Ridge's first stretch, its 30 snowmen came into the list
    as the phone came near (36 monsters whole in 24 ticks), each with its
    home, skin, level and health, drawn from the land's live art;
  - the Flame Fields' fire goblins the same; one of them fought, died and
    paid its XP;
  - back at Frost Ridge, 65 of the 1,920 held, none in the list twice, none
    sent whole twice.

## Deploy order

- **An old phone** sends no `wn`. It gets every list and every tick byte for
  byte as before.
- **A new phone against an old worker** gets the whole list, no mark and no
  `mw`, and needs neither.
- **Kill switch:** `wheelnear: false` in the live flags. Every arrival after it
  gets the whole list again, and `caps.wheelnear` reads false. A phone already
  holding a near list keeps getting its `mw`s, which it needs, until it leaves
  the Wheel.
- `caps.wheelnear` is for the record and the tests. The phone reads the marks
  on the messages, never the cap.

## For tests

- `?wheelwhole` makes a phone ask for the whole list, as before (no `wn`).
  Six phone tests that read the whole list off the arrival use it:
  `mp-wheelmonsters`, `mp-wheeldeep`, `mp-wheelpast20`, `mp-rollhit`,
  `mp-blockcost`, `mp-farfeel`.
- `mp-killroll`'s far kill names the worker's own id (`wm-tidal-0`) when the
  phone does not hold one.
- `mp-wheeldeep` and `mp-wheelpast20` had counted the short Wheel's monsters
  (384, 48 a land) since the five-times Wheel (v2.3.3315), and walked to the
  middle of a stretch's first six places, up to 2,600 px from any of them on
  the long one. They now count `6 x WHEEL_LONG` a stretch a land (the
  worker's own rule, wheelzone.js `_wheelSpawnMonsters`) and walk to a
  monster's own place.

## Not changed

- **The nodes and the loot** still come whole on the way in (about 140 KB on
  the long Wheel). A node has no interest yet: the tick sends a changed node
  to everyone in the zone. Trimming them needs the same machinery for nodes.
- **Every other zone**, and v1 phones, are untouched.

## Files

- `server/src/wheelnear.js` (new)
- `server/src/spawnscale.js` (`monsterSnapWire`, `_zoneSnapshotWire(zone, pick)`)
- `server/src/movement.js` (the zone change)
- `server/src/join.js` (the join's flag, `state_sync`, `caps.wheelnear`)
- `server/src/tick.js` (`mw`, `_wheelWhole` forgotten out of the Wheel)
- `server/src/index.js` (the methods)
- `src/networking/wsClient.js` (`wn`, `_monsterFromWire`, the marks, `mw`)
- `server/test/wheelnear.test.mjs`
- `tools/qa/mp/mp-wheelnear.mjs`
