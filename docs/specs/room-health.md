# The room's own health (v2.3.5601, card OPS PR 2)

Red team RT-2, F3 and F4 (`docs/security/rt2-findings.md` on #1867).

## Why

`/health` answers from the outer worker and never asks the game's room. A
room that is stuck, crash-looping or refusing every save still read "ok"
there, so an uptime monitor pointed at it could never fire. And a dashboard
rollback past a change to how characters are stored shuts out every player
the newer worker saved (the join closes 1011, `migrations.md`), with no word
anywhere.

## What

`GET https://api.brotown.net/health/room` asks the room (3 s at most) and
answers with numbers only:

| field | what |
|---|---|
| `ok` | no problem |
| `problems` | `no tick`, `tick late`, `save refused`, `newer saves refused` |
| `players`, `sockets` | joined players; every socket |
| `ticking`, `tickAgeMs` | the tick loop runs; since its last tick began |
| `savesRefused` | `{ put, newer }` since the worker started (`roomrow.js`) |

- 200 when `ok`; 503 with the same numbers when not; 503 `{ room: 'no
  answer' }` when the room does not answer in 3 s.
- `tick late`: the loop runs and its last tick is over 5 s old. An empty
  room has no loop (it stops with the last socket), and is healthy.
- `save refused` / `newer saves refused`: one in the last minute. The second
  is a rollback shutting players out: OPERATIONS, "Rolling back"
  (`newersave` false).
- The room's answer is the internal `/_room_health`, reached only through
  this route (as `/_room_count`).
- Asking wakes an idle room (a cold start, which it tests too). A monitor at
  5 minutes is ~9,000 requests a month. Nothing is written.

## The switch

`roomhealth: false` in the live flags: the room answers 404 and the route
passes it on. `/health` is unchanged either way.

## For the owner

Point an uptime monitor with a phone alert at the URL above, every 5
minutes, alerting on anything but 200.

## Tests

`server/test/room-health.test.mjs`; on a local worker, 200 idle, 200 with a
player in (ticking, the tick 3 ms old), 200 after the last one left.
