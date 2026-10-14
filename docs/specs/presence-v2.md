# Far players only while your world map is open (presence v2, v2.3.3250)

> Owner, 2026-10-14: *"Go recommended and keep working autonomously"* -- item 24
> of the open-decisions log, the rest of Phase 0b of the server split plan
> (`docs/SERVER-SPLIT-PLAN.md`, "Presence at scale"). The first step,
> v2.3.3246, was the worker alone (`docs/specs/slim-roster.md`); this one
> needs the phone too.

## What a phone in the Wheel is sent now

| who | before (v2.3.3246) | now, with your world map shut | now, with it open |
|---|---|---|---|
| players within 2,400 px of you (your screen and minimap) | whole, every roster and every move | the same | the same |
| your party, wherever they are | whole when near, slim when far | **whole** | whole |
| everyone else in the room | slim, movers every roster, the still every 4 s | **nothing** | slim, as before; the first roster of the watch carries all of them |
| who is online | the roster above | **`on` every 30 s**: everyone's id and zone | the same |

A far player is on no screen and no minimap: the minimap is 3,200 px across,
inside the 2,400 px circle. Only the world map draws them, and only while it
is open, so only then are they sent.

## The wire

- **join**: `pres: 2` (v2 joins only; a v1 join's `pres` counts for nothing).
- **state_sync**: `caps.presence2: true`.
- **client -> server `map_watch {on}`**: `true` when the world map opens and
  every 4 s while it stays open (`MAP_HEARTBEAT_MS`); `false` when it closes.
  One `true` keeps far players coming for 8 s (`MAP_WATCH_MS`), so a map that
  shuts without saying so (a dropped socket, a killed tab) stops them within
  8 s. Anything but a boolean is ignored. The first roster after a watch
  starts carries every far player (`_mapWatchFresh`), so the map fills in one
  roster rather than over the 4 s still-player wait.
- **tick `nr: 1`**: on a pres-2 phone's roster in the Wheel, while its map is
  shut. Every player near it is in this roster, whole -- so one missing from
  it is far or elsewhere. Never while the map is open: then the far players
  who are not due this second are missing too, and the map draws them.
- **tick `on: {id: zone}`**: on a pres-2 phone's first tick and every 30 s
  (`ONLINE_EVERY_MS`), everyone in the room. About 25 bytes a player: at 120
  players 3 KB every 30 s.

The worker's half is `server/src/presence2.js` and the roster plan in
`server/src/tick.js` (`rosterPlanFor`, `playersPlanFor`, the `nr` and `on`
appends). The phone's half is `src/game/presence2.js`.

## The phone

- **The ghost sweep stands down.** The phone used to forget a player it had
  not heard of for 10 s (v2.3.1112) -- the fix for a tab that slept through a
  `player_leave`. Far players are now silent on purpose, so while the online
  list is fresh (`ONLINE_STALE_MS` 75 s, two and a half lists) the sweep does
  nothing, and the list does its job: a player missing from it is forgotten,
  a parked player takes their zone from it (a friend gone into a dungeon), and
  a player the phone never heard join is added, parked, until their look
  arrives -- as a tick's unknown player always was.
- **A far player's copy is PARKED.** Found writing this change's phone test,
  before it shipped: a far player's last copy stood frozen where they were
  last seen -- off your screen while they were far from you, but walk that
  way and you met them there, still walking on the spot. So a player missing
  from an `nr` roster is marked `_away` and stopped (`parkMissing`), and every
  frame `parkAway` (visualSystems.js, the peers' interpolation loop) keeps an
  `_away` copy at least `PARK_R` 2,400 px from you, along the line from you
  through it. About forty places in the game read other players' positions
  (bodies, pets, lights, dust, sounds, targets, the minimap); a parked copy
  is past the minimap's corner (2,263 px) and every reach, so not one of them
  can draw, hear or hit a ghost, and none of them had to change. Any update
  the worker sends of that player (near again, a party member, an open map)
  is where they really are, and clears it. The world map and the minimap skip
  parked copies.
- **The world map says when it is open** (`sendMapWatch`), and only to a
  worker that advertises presence2: an older worker would rebroadcast an
  unknown message type to the whole room (index.js's default branch).
- **TRAPS #18 again.** The page's channel lets out only the types it names
  (wsClient.js `channelShim`). `map_watch` has its line; without it the open
  map was sent no far player at all -- caught by the phone test's first run.

## Deploy order and the kill switch

- **An old phone** (no `pres`) gets the v2.3.3246 roster, byte for byte.
- **A new phone against an old worker** sees no `caps.presence2`: it never
  sends `map_watch`, keeps its ghost sweep, and is never parked (no `nr`).
- **Kill switch:** `presence2: false` in the live flags. New joins are not
  told `presence2` (join.js spreads the live flags over the caps); every pres-2
  phone is back on the v2.3.3246 roster from the next tick, with no `nr` and
  no `on`. Its parked copies are updated within one still-player wait (4 s),
  and its ghost sweep comes back 75 s after the last list.
- No storage, no new server-emitted message type (`nr` and `on` are fields on
  the tick).

## Measured

`tools/qa/load/roster-bench.mjs` (the real GameRoom in Node: a third of the
players about BroTown, two thirds out at the monsters, 30% walking), the same
room and phones in three modes, two rounds each:

| players | everyone whole | far players slim (v2.3.3246) | presence v2, maps shut |
|---|---|---|---|
| 120 | 104-109 KB a second a phone | 90-98 | **72-74** |
| 500 | 284-301 | 218-250 | **144-149** |

The room's time a tick is the same in all three (3.3-4.0 ms at 120, 13.5-15
at 500). This branch still has the four-a-second far send (#898 takes it
away); presence v2 leaves far players out of that too.

Merged with #898 (far players only with the roster), most of the far players'
traffic is gone before presence v2, so its own share is smaller:

| players | slim roster + #898 | + presence v2, maps shut |
|---|---|---|
| 120 | 75-82 KB a second a phone | 74 (1-10% less) |
| 500 | 157-186 | 145-152 (3-22% less) |
| 1,000 | 261-311 | 235-242 (8-24% less) |

and the room's time a tick the same or a little lower (1,000: 40-41 ms against
42-48). At 120 it is groundwork: what changes is that a phone's download no
longer grows with the far players at all, only with the crowd around it --
the shape a 1,000-player world needs.

## What a player sees

- **Near players and your party:** nothing changes.
- **The world map:** on opening, the far players are where they really are
  within one roster (about a second; a heavily loaded room's slower tick
  stretches that to a few seconds). They are drawn from zoom 1.5 (one tap of
  +) anyway.
- **The friends list's zone of a far friend:** from the online list, so up to
  30 s late (it was about a second).
- **A player who joined while your tab slept, far from you:** listed within
  30 s, as "Anon" until their look arrives -- as before.

## Tests

- **`presence2` suite, 55 checks** (server/test/presence2.test.mjs): the
  roster with the map shut and open, the far send, the watch's start, length
  and end, `nr` only on a shut map's roster and never between rosters or to an
  old phone, `on` with zones, the kill switch, v1, no rebroadcast, the two
  message builders byte for byte, and the phone's own code (the online list,
  parking, the channel's allowlist, the map's watch). Twenty deliberate bugs,
  each caught. It also passes merged with #898.
- **`mp-presence2`, 15 checks** on a real worker: a phone and two bare
  sockets -- the ghost walk (the copy parked 2,400 px off after every frame
  while the phone walks toward where the walker was last seen; frozen it
  would have stood 400 px ahead), 22 s of silence kept, the map opened (the
  walker where they are, their walk, a dot, a heartbeat every 4 s), the map
  shut (nothing reaches the phone while an old phone still gets them), a
  player gone without a word forgotten at the next list, the kill switch, a
  leave.
- **`mp-farpeer`** opens the map for its far step.
