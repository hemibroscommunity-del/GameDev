# Far players less often, positions in whole pixels (v2.3.3197)

> Owner, 2026-10-13, on the load test's next steps (`docs/specs/load-test.md`):
> *"Send far away players less often and using shorter position numbers make
> sense go ahead with it"*.

## What changed (the worker only)

`server/src/tick.js`, `FAR_PLAYERS`:

- **Far players less often.** In the Wheel, a v2 session (every phone today)
  is sent the players moving within **2,400 px** of it (`NEAR_R`) on every
  tick, as before. The ones further off are sent at most every **250 ms**
  (`EVERY_MS`), each time at where they are now, so nothing is lost but the
  steps in between. Everyone who moved since the last such send waits in
  `_farPending`; when 250 ms have passed, every v2 session in the Wheel gets
  all of them at once (`farList`, one string for everyone). The 1 Hz presence
  roster is untouched.
- **Positions in whole pixels.** Every player entry's `x`, `y`, `vx` and `vy`
  go out as whole numbers (`rp`), in every zone.

What does not change: v1 sessions, today's town, the farm and the dungeon
arenas get every mover on every tick; a player's own moves reach them every
tick (they are 0 px from themselves); events and monsters are as they were.

## Why nobody sees the difference

- **2,400 px is past the screen and the minimap.** The minimap is 3,200 game
  px across (`wheelMinimap.js` `WHEEL_WINDOW`), so everyone on it is within
  about 2,263 px of you, and a phone's screen shows less than that
  (`worldViewport.js`). 2,400 is also the distance the worker already uses for
  monsters (`WHEEL.INTEREST_R`).
- **Coming closer is seen in time.** A player who walks into the 2,400 px
  circle is sent on that very tick, still a long way off your screen.
- **The game already copes with a player it hears from less often.** It
  carries another player along on their last speed between updates
  (`visualSystems.js`), and drops one only after 10 s of silence (`wsClient.js`,
  the ghost sweep). A far player who stops is sent where they stopped within
  250 ms, even if nothing else happens that tick.
- **Whole pixels are half a game pixel off at most**, under one CSS pixel on a
  phone, and the drawn figure is smoothed anyway.

The only places a far player is drawn are the **world map**, when opened and
zoomed in on them, where their dot now moves four times a second instead of
about thirty, and snow footprints a far player leaves while you are too far
to see them, which come out further apart.

## Shorter numbers: the honest size of it

The load test's bots (#883) sent positions to a hundredth of a pixel and their
speed as a 16-digit fraction, and the estimate that shorter numbers would cut
"about a quarter" of the bytes came from those. Real phones already send
positions to a tenth of a pixel and speeds as whole numbers (BroTown.jsx's
move broadcast), so on real phones whole pixels save **about 2.4%** of each
player entry (153 -> 149 bytes for a typical one). The change is kept because
it is free, invisible, and bounds what any other client can put on everyone's
download. The bots now send what a phone sends.

## What it buys

Measured in the sandbox with the bot load test (`tools/qa/load/load.mjs
--server`, #883), the v2.3.3195 server (#885) against this one, the same
steps one after the other, the bots sending what a phone sends. Each phone's
download, the room's thread and its ticks a second.

> **v2.3.3199: the downloads below are UNZIPPED** -- the messages as a phone
> reads them. The room compresses every message it sends, about 13 to 1, so on
> the wire each figure is about a thirteenth (100 players in town: 202 KB/s
> unzipped is about 15-17 KB/s on the wire). The percentages hold, and since
> what changes in a message costs the room CPU to compress -- and a far
> player's new position is exactly that -- the saving is the server's as well:
> `docs/specs/load-test.md`, "What a phone really downloads".

**A crowd mostly in town** (70% walking BroTown and its commons, 30% fighting
out in their lands -- the default mix):

| Players | Each phone downloads | Room's thread | Ticks a second |
|---|---|---|---|
| 25 | 92 -> 81 KB/s (-13%) | 26% -> 28% | 39 -> 39 |
| 50 | 167 -> 136 KB/s (-19%) | 45% -> 45% | 39 -> 38 |
| 75 | 231 -> 179 KB/s (-23%) | 68% -> 62% | 37 -> 37 |
| 100 | 270 -> 202 KB/s (-25%) | 82% -> 77% | 35 -> 35 |

**Everyone out in the lands** (`--fighters 1`: each player fighting in their
own land, the eight lands far apart):

| Players | Each phone downloads | Room's thread | Ticks a second |
|---|---|---|---|
| 25 | 68 -> 52 KB/s (-23%) | 26% -> 23% | 39 -> 39 |
| 50 | 87 -> 62 KB/s (-28%) | 41% -> 37% | 38 -> 39 |
| 75 | 116 -> 69 KB/s (-41%) | 58% -> 52% | 37 -> 37 |
| 100 | 114 -> 77 KB/s (-33%) | 71% -> 65% | 35 -> 36 |

- **Players on your screen are no later.** The lag the probes measure for
  players within 2,400 px of them is the same on both servers: at 100 players
  22 ms half the time and 38 ms for 95% (town), 22 / 36 ms (lands).
- **The saving is from far-away players who are moving.** In town everyone
  is near everyone and nothing changes. In the town runs above many of the
  fighters were still walking out to their lands while a step was measured;
  in a run that filled straight to 125 and 150 players most had arrived and
  were fighting in place, and the saving was smaller: 218 -> 211 KB/s (-3%)
  at 125 and 231 -> 205 KB/s (-11%) at 150, at the same ticks a second (30
  and 26). A real world is somewhere between these and the lands' table.
- **The room's thread works a little less, not more**: less to send.
- Bots move at random, so a step's numbers move a few percent from run to run
  (the messages the room took in differed by up to 15% between the two
  servers' runs of the same step); the trend is the same at every step.

## How we know it works

- `server/test/far-players.test.mjs` (27 checks, in `npm test`): whole
  numbers, and `roundpos: false`; a near mover on every tick and a far one
  only after 250 ms, at its latest position, and not again while it stands;
  about four far updates a second over two seconds of walking; a far player
  who stopped still sent within 250 ms on otherwise quiet ticks; 2,400 px
  exactly is near, one more is far; a player coming into reach is sent that
  tick; v1 sessions and today's town as before; `farplayers: false`; a player
  who left the Wheel before the far send is not sent as still in it, and the
  presence roster still carries everyone; and both message builders byte for
  byte, with ids that are array indexes (they change JSON's key order).
- `server/test/tick-share.test.mjs` (v2.3.3195) still compares every message
  both ways over 300 ticks of a busy mixed room: the far rule is in both
  builders.
- `tools/qa/mp/mp-farpeer.mjs`: a real phone in BroTown watching a walker
  that sends a phone's 30 moves a second. Beside it: 31 updates a second.
  2,700 px away: 4.7 a second (the four far sends and the roster), never
  missing from the game's players, and exactly where it stopped (0.0 px off)
  once it stops. Back beside it: 29 a second again. Positions in whole pixels,
  no page errors. (The walker is a bare socket because this box draws a
  browser a few frames a second, and a page sends a move a frame.)

## Once a second, with the roster (v2.3.3243)

> Owner, 2026-10-13: *"Go recommended but I want you to stress test to see
> what can be optimized."*

**What the stress test found.** The far send went to every phone in the Wheel
four times a second, and it carried EVERY player who had moved since the last
one -- in a town crowd, all the near players the phone was already being sent
on every tick, again. At 120 players that was about a third of the player
entries a phone in BroTown was sent. And the presence roster
(`PRESENCE_REFRESH_TICKS`, about once a second) already carries every player
to every phone, where they are now.

**What changed.** `FAR_PLAYERS.EVERY_MS` is 0: there is no far send. A player
more than 2,400 px from you reaches your phone only in the roster, about once a
second, where they are now. Players near you are sent exactly as before.

- They are on neither your screen nor your minimap (above, "Why nobody sees
  the difference").
- **The world map**, zoomed in on a part of the Wheel more than 2,400 px from
  you, shows their dots. Each dot is now carried along that player's last speed
  since their last update (`src/game/peerDot.js`, at most 1.5 s), so a walker
  glides instead of hopping once a second; a stop or a turn shows at the next
  roster. The minimap does the same, which matters only at the Wheel's edge,
  where the box stops centring on you and can show a player past 2,400 px.
- A player coming into your 2,400 px circle is sent on the tick they move,
  still well off your screen, as before.

**Measured** with the load test (`load.mjs --track --diet --tick-parts`, 120
then 150 players, 90 s each), today's server three times against this one
twice, interleaved:

| | today (3 runs) | once a second (2 runs) |
|---|---|---|
| **120 players:** the room's thread | 78.2-80.1% | 73.0-75.9% |
| ticks a second | 39.8-40.0 | 40.9-41.0 |
| each phone's download, unzipped | 175-182 KB/s | 145-150 KB/s |
| near players' moves seen, half / 95% under | 25-27 / 63-66 ms | 20-21 / 51-53 ms |
| **150 players:** the room's thread | 90.0-91.5% | 87.6-89.5% |
| ticks a second | 34.8-35.4 | 36.5-37.6 |
| each phone's download, unzipped | 205-206 KB/s | 174-176 KB/s |
| near players' moves seen, half / 95% under | 41-45 / 80-84 ms | 32-38 / 70-73 ms |

- The room does about 5 points less work at 120 players, and at 150 it turns
  the room it gains into 2 more ticks a second (the world nearer full speed).
- Each phone downloads 15-18% less. The far send's entries were new positions,
  which is what costs the room to compress (`docs/specs/load-test.md`).
- "Near players' moves seen" counts only players within 2,400 px of the probe:
  the ones on your screen arrive sooner, because the room is less busy.
- `mp-farpeer` on a phone: a walker 2,700 px away updated once a second, never
  missing from the game's players, and exactly where it stopped (0.0 px off)
  at the next roster; beside it, 15 a second, as before. With `far_ms: 250`
  set in the room's live flags, 4 a second again.

**Tried first, and dropped: the crowd cap on the wire.** Before this, each
phone was sent only the movers among its nearest 65 on every tick (the 50 a
phone draws, `src/game/crowdCap.js`, and room for the ones it holds), the rest
with the far send. Measured the same way it made no difference at 120 or 150
players (the room 78.9-80.2% busy at 120 with or without it, 174-182 KB a
second to each phone): steady movers (v2.3.3203) already keep the movers near a
phone in one tick to about 25-35, a walker being sent about 15 times a second,
not 40, so a tick almost never has more than 65. It was kept on a local branch
for Phase 2 of `docs/SERVER-SPLIT-PLAN.md`, when a door builds the ticks of a
crowd of hundreds.

**Tests.** `far-players.test.mjs` runs its sections 2-9 with `far_ms: 250`
(the far send, brought back by the live flag) and adds section 10, the
default: a far walker reaches a phone on the roster's ticks only, each time
where it is now; a near walker on every tick it moves; a far player who stopped
is where it stopped at the next roster; nobody waits for a far send; `far_ms`
kept to 100-5000 ms; `far_ms: 250` brings four a second back; both message
builders byte for byte. `steady-movers.test.mjs` 2k checks a far watcher with
`far_ms: 250`, 2m the default. `mp-farpeer` now expects a far walker about once
a second (`BT_FARPEER_FAR_MS=250` sets the room's flag and expects four).

## Turning it off

Live flags, no deploy: `farplayers: false` sends every mover every tick again;
`roundpos: false` sends positions as the phones sent them; `far_ms` (a number,
100-5000 ms) sends the far players on their own that often again -- 250 is
v2.3.3197's four times a second.

## Not done (each changes what the phones must understand)

- **Leave out what did not change.** A player's entry repeats their zone,
  gear and activity (`z`, `eqc`, `eql`, `eqs`, `ex`) on every move: about 60
  of its ~150 bytes. Sending them only when they change would cut each
  entry by about 40%, but today's phones read a missing `z` as "no zone" and
  would lose the player, so the phone must say it understands first (a new
  join flag) -- a change to both sides.
- **The message diet** (`docs/WORLD-ARCHITECTURE.md` §11): fewer moves from
  each phone, with the worker filling in between.
