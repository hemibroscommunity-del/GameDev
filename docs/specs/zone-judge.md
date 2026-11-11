# The server decides a change of place (v2.3.4640)

> The owner's working list (docs/OWNER-LIST-2026-10-26.md §10; docs/STATE-MACHINES.md
> "What is left"): *"who decides a change of place (the server placing you at the
> entry instead of taking the phone's word)"*. The state-machine sweep's Wave 2
> item 1 (2026-11-03, V1 S3-15): *"A modified phone can still leave the fight by
> changing zone."* The judges have played; the owner said to do the big repairs now.

## What was wrong

Every `move` a phone sends names the place (zone) it is in, and the server took
it: "a zone change is never judged" (server/src/movement.js, the move budget's
notes). Three honest roads had been gated around it: a dungeon nobody opened
(#1499, `dungeonlive`), the half second of safety on entering a place (#1508,
`entrygrace`) and the dungeon mouth in a fight (#1523, `fightlockdoor`). The
change itself was not, so a modified phone losing a fight with another player in
No man's land could leave it, with the bag the winner should take, by naming
today's town, its farm, the old World View, an old land, or someone else's live
dungeon (every run's name rides the once-a-second roster). Nobody in the world
can hit a player the server holds somewhere else.

## Every honest change of place (the inventory)

Checked against today's phone code, both ends:

| # | On the phone | From → to | What the server already knows |
|---|---|---|---|
| 1 | The trip down today's town's stairs (game/wheelHome.js, zoneTransitions.js): on login, after a death, out of a Wheel dungeon, home from the farm | town → wheel | The place is judged (lastplace.js: where you left the Wheel, or its arrival) |
| 2 | The respawn (game/respawn.js) | anywhere → town | The server writes it itself first (index.js `_tickPlayerRespawn`) |
| 3 | A Wheel dungeon's mouth (game/wheelDungeons.js → `dungeon_start`) | wheel → dungeon | `dungeon_started`, sent to this player |
| 4 | The party leader's pull (dungeon.js `_dungeonPullPartyMembers`) | the leader's place → dungeon | `dungeon_started`, sent to this player |
| 5 | The Dungeon Workshop's runs, on the farm | farm → dungeon | `dungeon_started` |
| 6 | Out of a Wheel dungeon, its door or its clear (`leaveWheelDungeon`) | dungeon → town, then #1 to the mouth | nothing |
| 7 | Out of a Workshop run, its door or its clear | dungeon → farm | nothing |
| 8 | The farm trip: the Land Office's "Travel to Farm", the Feed & Seed's "Visit Your Farm" (game/farmTrip.js) | wheel (or town) → farm | **nothing at all**: no message. The doors stand 1,202 px (Feed & Seed) and 1,519 px (Land Office) inside the safe ground's edge, every door in Brotown 958 px or more |
| 9 | The farm's gate home | farm → town, then #1 to where you left | nothing |
| 10 | `?wayback` (QA only): the exit four tiles west of the arrival | wheel → town | nothing; it is on the safe ground. Without it the world has no exit at all |
| 11 | `body_place` (game/bodyPlace.js): a relaunch mid-fight lands at its body via #1 | town → wheel on the phone | The server keeps the body's zone and drops every move until the phone stands at it (bodytake.js), before the zone gate |
| 12 | A reconnect | (a join, not a move) | join.js; lastplace.js judges the place; mid-fight the body lingers (#309) or is taken over (#1509) |
| 13 | The Test panel's zone chips | hub doors only; from the world there is none | — |

The retired old map (`?trial=off`, and the old tests frozen in
tools/qa/mp/oldMap.mjs): town ↔ World View ↔ the old lands, and the endgame
pair. Its exits are tile tables on the phone only, and No man's land does not
exist there (`nmlLevelAt` is 0 outside the world). Five of TRAPS §304's nine
hand-written zone changes are there or are single-player leftovers that never
run against the server.

So the only honest ways **out of the world** are a dungeon on its
`dungeon_started` (3, 4), the farm from the safe ground (8), `?wayback` from the
safe ground (10), and the server's own respawn (2).

## The rule (server/src/zonejudge.js)

A move naming a zone other than the server's own is taken only with a reason.
It is one more clause in movement.js's zone gate, asked on a CHANGE only, as
the quest lock and `dungeonlive` are:

- **R1. Into a dungeon, from anywhere:** only on the **pass** the run gave this
  player when the server sent them `dungeon_started` (their own tap, or the
  leader's pull). Used once, within `PASS_MS` (20 s: the phone steps in after
  its loading screen's race, 8 s at most, and the network). The pass lives on
  the run, so a reconnect behind the dungeon's loading screen keeps it, and a
  swept run takes it along. It is not asked again whether the player is
  fighting at the step in: an honest player hit during the loading screen must
  not land in an empty arena (the orchestrator's choice A); the mouth already
  refuses a tap mid-fight (`fightlockdoor`).
- **R2. Out of the world to anywhere else:** only while the server's own last
  place for the player is on the world's safe ground (`_wheelSafeAt`, BroTown
  and its commons). Its edge is No man's land's own (`NML.SAFE_R`), so nobody it
  lets out is in No man's land. Not asked of a phone that draws another world
  size than the room plays (another map's numbers: No man's land holds nothing
  for it, as lastplace.js leaves it alone); R1 still is.
- Everything else as before: today's town to anywhere (every way home passes
  it), the farm's and the dungeons' ways out, the old map, and every way INTO
  the world, whose place is judged already. The server's own zone writes (the
  respawn, the join, a sparring clone, a body taken over) never pass here.

It protects the other player: never asks test mode. Memory only (rule 11): the
passes go with their runs, and the passes are written whatever the switch says,
so turning it on mid-run strands nobody.

## R3: the retired lands are closed (v2.3.4675)

The owner retired the old map on 2026-10-02 ("The Wheel is the world") and, on
2026-11-11, asked whether to close it for good: **"Close it"**. The server had
never closed its lands. A phone in today's town (where every login, death and
way back starts) could name meadow, hollows, thunder, tidal or mist at any time,
and verdant, frost, sky or ember once the first tutorial quests were under way
(movement.js `QUEST_ZONE_GATE`), and the server spawned their monsters and paid
their kills in full: XP, gold, shards, quest credit. `?trial=off` was the honest
way there; a modified phone needed no switch at all. (The monsters there are
level 1 and 2, so the value was low, but it was an open door.)

- **R3. Into a retired land, from anywhere: never.** `RETIRED_LANDS`
  (zonejudge.js) is the old map's eight element lands, its commons (meadow) and
  the endgame pair (shadow, radiant). A change into one takes the refused-move
  path below: nothing written, nothing sent. Its road counts on the overview as
  `<from>>retired`.
- **A join naming one arrives in today's town**, as a join naming no place does
  (join.js `_sanitizeJoinData`).
- **A player already there can still walk and leave**: R3 refuses a change INTO
  a land, never a move within one.
- **Its own switch**: `retiredlands: false` in the live flags opens the lands
  again at once. `zonejudge: false` leaves R3 in force, so turning the rest of
  the judge off never reopens them. The overview shows it (`retiredLands`).
- **The lands' rows stay** (server/src/data.js `ZONES`): the world's monsters,
  nodes, shards, pets and dungeons are keyed by the same eight ids as their
  homes (wheelzone.js `_wheelSpawnMonsters`). It is the PLACES that are closed.
  Today's town, the farm, the world and the old World View (the world's own
  fallback under `wheelmonsters: false`) stay open.
- It protects the economy and every other player: never asks test mode. No
  cap: the only phone that meets it is one on the retired map, which is
  closing on the phone too.

**Tests**: `server/test/retired-lands.test.mjs` (the list, a join, a move from
town and from the world's safe ground with every quest open, both switches, a
player already there; 9 of its checks fail without the rule). **Eighteen suites
still stand players in an old land as a fixture.** Each opens the lands for
itself with one marked line (`GameRoom.prototype._retiredLandsOn = ...`), and
that suite's `FIXTURES` list only shrinks: move a suite to the world and take
it off. `zone-judge.test` counts an old land's refusal as `retired` now.

## A refused move

It is the refused zone's path exactly (v2.3.1631, v2.3.3325): nothing is
written (not the zone, the place, the grace, the zone's lists, nor the move
budget) and nothing is sent. The next move in the server's zone is judged from
where it had the player.

**No message puts a phone back.** `body_place` lands only a taken-over body's
phone, and only from today's town (bodyPlace.js); the tick and `player_state`
never correct a phone's own place; the respawn plays a death. So a refused phone
shows where it went while the server keeps its body where it stood: in the
fight, hittable.

**What an honest player would meet if a road were missed:** they would arrive
somewhere with nothing in it (a dungeon with no monsters, a farm that does
nothing) until they walk back out the way they came, which puts them back where
the server has them (every way out of the farm or a dungeon comes down the
stairs to where they left the world). The safety net is the count on
`/api/admin/overview` (`zoneJudge.refused`, by road: `wheel>farm_home`,
`wheel>dungeon`, ...; a dungeon's own name is never a key), and **`zonejudge:
false`** in the live flags, which puts every change of place back as it was at
once (docs/OPERATIONS.md).

## Both kinds of phone

Protocol v1 and v2 phones send the same move, and the refusal returns before any
zone snapshot is built, so they fare alike. No cap: no honest phone meets it, so
the phone needs to know nothing, and either side may ship first.

## What it does not judge

- The old map's hubs (no fights there; their exits are the phone's). Its LANDS
  are closed since v2.3.4675 (R3 above).
- Today's town to anywhere: it is the hub every way home passes through.
- A join's zone: a reconnect mid-fight lingers or is taken over (#309, #1509).
- The place on entering a dungeon or the farm: small places, free entry as
  before. Into the world, the place is judged (lastplace.js).

## Tests

`server/test/zone-judge.test.mjs`, against the real GameRoom: a player losing a
fight in No man's land cannot leave by naming any place, and nothing is written;
off the safe ground, in no fight, the same; every honest road above still
changes place; the pass (once, its own run, within `PASS_MS`, kept across a
reconnect); a v1 phone, test mode, a phone out of step; the switch; the
overview; and the farm's doors measured on the safe ground (placing.js
`doorSpots`). It failed 25 checks on main, every one a refusal; every honest
road passed there too.

Seven suites walked a road the rule now refuses, each moved to an honest one
(never by switching the rule off): `duel-zone`, `dungeon`, `dungeon-live` (a
second player now comes into a live run by the leader's pull, as the phone
does; its `dungeonlive: false` check now throws `zonejudge: false` too, since a
made-up run has no pass), `fight-dodges` (the hop's way out is the server's
own placing in town; a check pins that the old way out is refused),
`move-budget`, `wheelnear` and `wheelzone` (out of the world from the safe
ground).
