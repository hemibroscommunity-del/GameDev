# The roster's far players, slim (v2.3.3218)

> Owner, 2026-10-13: *"Go recommended but I want you to stress test to see
> what can be optimized."* This is the first step of Phase 0b of the server
> split plan (`docs/SERVER-SPLIT-PLAN.md`, "Presence at scale").

## What the roster is, and what it cost

About once a second (`PRESENCE_REFRESH_TICKS`, 45 ticks) every phone is sent
EVERY connected player's whole entry: position, facing, zone, speed, worn
gear, what they are harvesting, sprint, skull, pet and armour grade. This is
the presence roster (`server/src/tick.js`). It does four jobs:

- **It keeps the ghost sweep fed.** The client deletes a player it has not
  heard of for 10 s (`wsClient.js`, the ghost sweep). A player standing still
  is never "dirty", so without the roster they would vanish.
- **It counts who is online.** "N online" is counted from what survives the
  sweep.
- **It puts far players on the world map.** Since v2.3.3213 they come only
  with the roster.
- **It heals a missed join.** A join that a suspended tab missed is filled in
  by the next roster.

Each entry is about 150 bytes, so at 120 players the roster was about 18 KB a
second to every phone, and at 1,000 players about 150 KB a second. A phone
draws only the players near it, and the world map needs only a far player's
position.

## What changed (the worker only)

In the Wheel, a v2 phone's roster is now its own (`tick.js` `rosterPlanFor`):

- **A player near it is sent whole, as before.** Near means the same zone and
  within `FAR_PLAYERS.NEAR_R`, 2,400 px. That is everyone on its screen and its
  minimap, and the phone itself.
- **A far player is sent slim**: `{x, y, d, z, vx, vy}`. That is where they
  are for the world map, which way they face, their zone, and their speed so
  the dot glides.
  - These are the fields the client writes whether or not they are there:
    `dir` and `zone` are copied over even when missing. So a slim entry never
    blanks them.
  - The other fields it either keeps as they were (gear, facing, harvest), or
    reads as "none" (sprint, skull, pet, the armour's grade). That only
    happens for a player it does not draw.
  - The first whole entry puts them back. A far player who walks into reach is
    sent whole on that very tick. One who stands still while you walk up is
    sent whole in the next roster. Either way that is long before they are on
    screen.
- **A far player who has not changed since the last roster is sent again only
  once `ROSTER.FAR_STILL_MS` (4 s) has passed.** That keeps the client's 10 s
  sweep fed. Their entries are at most 4 s plus one roster apart: 5.1 s at the
  usual 45 ticks a second, 8.5 s with the room down to 10.
- **Unchanged:**
  - old v1 phones, phones in today's town, the farm and the dungeons, and a
    socket that has not joined still get everyone whole every second;
  - the 2,400 px circle is the one the far players already use (v2.3.3197).

No caps flag is needed, because an old client reads the same fields. Kill
switch: `slimroster: false` in the live flags sends everyone the whole roster
again, from the next roster.

## Measured

**The room alone** (in-process, `tools/qa/load/roster-bench.mjs`):
- **Setup.** N players in the Wheel: a third about Brotown, two thirds at the
  monsters. 30% of them walk; every message is encoded as the runtime must.
  8 s each way, after a warm-up.
- **Which run counts.** The second of two runs each way; the first runs were
  higher before and after alike.

| players | a phone is sent, everyone whole | far players slim | the room's time a tick |
|---|---|---|---|
| 120 | 73 KB a second | 64 KB (-12%) | 3.3 -> 3.2 ms |
| 500 | 157 KB | 130 KB (-17%) | 12.9 -> 12.6 ms |
| 1,000 | 283 KB | 219 KB (-23%) | 36.8 -> 37.7 ms |

- **The saving grows with the crowd.** The far players are the ones that grow.
- **Building each phone's own roster costs the room nothing it can measure.**
  It is a list put together from strings made once a tick.
- **What is left is the players near you.** At 1,000 that is most of Brotown,
  all sent whole every second. The plan's whole 0b (below) is what removes
  the rest.

**The load test** at 120 (`load.mjs --steps 120 --hold 60 --track --diet
--relays --events --tick-parts`): a real local worker with #895-#899 and #901
in it, before and after, run alternately, two each.

| at 120 players | before | after |
|---|---|---|
| everything a phone is sent | 136-144 KB/s | 122-132 KB/s |
| the room's thread | 69-73% busy | 67-70% busy |
| ticks a second | 41.3-41.4 | 41.4-41.5 |

About 9% less for each phone. The room was as busy as before within the noise
between runs: at 120 its time goes on each message, not each byte.

**On a phone** (two-screen scenarios on a real worker, with every open PR and
this change built together):
- 8 of 9 scenarios pass in full (235 checks): far peers and the world map,
  No man's land's skulls, sprinting peers, the armour's grade, the halls'
  player lists, the party, and the quest line.
- The ninth, `mp-petsmatter`, fails two checks (a golden catch's animation),
  and they fail the same way on today's `main`.

## Tests

`server/test/slim-roster.test.mjs`, 21 checks, on a room with a fake clock:

- **Near and far.**
  - A near player is sent whole, exactly as a v1 phone gets them.
  - A far player who moved is sent slim, with the whole entry's own values.
  - A far player standing still is left out until 4 s have passed, then sent
    slim at the very next roster.
- **The ghost sweep.** Over 30 s at 45 and at 10 ticks a second, a far player
  standing still is never more than 4 s plus one roster apart. The client's
  sweep is 10 s.
- **Unchanged phones.** A v1 phone in the Wheel, a phone in today's town and a
  socket that never joined still get everyone whole.
- **Other zones.** A player in today's town is slim for a Wheel phone, with
  their zone.
- **Coming into reach.** A far player standing still is sent whole in the next
  roster once the phone comes near them.
- **The kill switch.** `slimroster: false`, and back.
- **Byte for byte.** The two message builders agree over a dozen rosters,
  including ids such as "0" and "17", which JSON puts first in an object.
- **The client's own fields.** The slim entry carries every field the
  client's tick merge writes without a check, read from `wsClient.js` itself.
  A future client change that starts writing a new field that way fails here.
- **Forgetting.** A player who left is forgotten.

Seven bugs put in on purpose each fail it:

- the facing left out;
- a far player standing still never sent again;
- "near" by zone alone;
- the kill switch ignored;
- a mover treated as standing still;
- nothing forgotten;
- the old builder sending everyone whole.

`far-players.test.mjs` §8c now checks the near players and the far mover in
the roster, and the far ones standing still within a few rosters.

## What is next for presence (needs a phone change)

The plan's whole 0b sends far players' positions only while the world map is
open: the map asks for them. The roster would then carry only the players
near you, plus who joined and who left. That needs the phone to stop
sweeping away the players it no longer hears about, so it comes with a caps
flag. This step is the part the worker can do alone.
