# Stress tests: what was found, what was fixed (v2.3.3242)

> Owner, 2026-10-13: *"Go recommended but I want you to stress test to see
> what can be optimized."*

Two machines were pushed past the room's cap of 120: the server (the load
test's bots against a private copy of the room, up to 300 players) and a phone
(a phone-sized page in BroTown with up to 250 bots walking round it). Each
finding below was measured before it was fixed, and measured again after.

## What the stress tests found

### 1. The 2 s look relay was never in the load test (server) -- fixed in #895

- Every phone sends its whole look (~940 bytes) every 2 s, and the room sent
  each one on to every other player, as a message of its own. At 120 players
  that is about 7,000 messages a second, more than all the ticks.
- The load test's bots never sent it, so every capacity number before was too
  kind: the room was smooth to about **105** players, not 145, and the cap of
  120 was past it.
- **#895** sends a look on only when it changes, and only what changed
  (`server/src/lookrelay.js`): smooth to about 145 again with real looks.
- While checking #895 before it could merge, two things a "send only changes"
  rule could break were found and fixed in it: leaving a clan reset your build
  on everyone's screen, and a shield put on could take a minute to show.

### 2. Players far off the screen cost the phone as much as players on it -- fixed in #896

- With 150 bots spread round the town and the commons, only 12 on the phone's
  screen, its frame cost as much as with all 150 on screen: every player in the
  Wheel was dressed and posed every frame, wherever they stood.
- And two parts of the renderer moved every player south of you between two
  layers every frame, rebuilding the whole draw list each time.
- **#896** draws nobody far off the screen (the monsters' rule since v2.3.2978),
  stops the two parts fighting, and adds the crowd cap the owner chose (the
  nearest 50 in full, and always your party, target, duel and attackers):
  150 players spread out, the frame's work 36 -> 20 ms on the test machine.

### 3. The leaderboard report did its work before checking its clock (server) -- fixed here

- Every `track` (every player, every 2 s) built the Leaderboard's stub, every
  combat and life skill level (`_chainScoreSeries`) and a signature of all of
  it, and then threw it away: the report goes at most once in 5 minutes.
- About 100 microseconds a track: 7.6 ms of every second of the room's thread
  at 150 players.
- Now the clock is read first (`reportToLeaderboard`, `server/src/index.js`).
  The same reports go at the same times; `anticheat` §7b checks both.

### 4. Where the room's time goes now (server)

A CPU profile of the real runtime at 120 players with real looks (`load.mjs
--track --diet`, 30% fighting; `--keep-bundle` to read the lines; a minute,
so each player's once-a-minute look counts once), in ms of every second of the
room's thread:

| Where | ms a second |
|---|---|
| building and sending each player's tick (tick.js, the compressing and the socket included) | ~400 |
| which monsters each player hears about (`_wheelInterest`) | 145 |
| reading the phones' messages (`webSocketMessage`: parsing ~21%, the rest the `track` and `move` handling) | 53 |
| far players' plans and the monsters' parts of the ticks (`planPart`, `monstersPart`) | 60 |
| moves (`_handleMove`) | 19 |
| look relays (`broadcastExcept`, the once-a-minute whole copies) | 15 |
| the monsters' own AI (`_tickMonsters`, `_wheelSeparate`) | 19 |

- **The ticks** are most of it: each Wheel player's is built for them (the
  monsters near them, the players near them often, far ones less often) and
  compressed for their socket. The next step there is the split plan's Phase 0
  and the doors (docs/SERVER-SPLIT-PLAN.md), not a small fix.
- **`_wheelInterest` is the biggest single function.** Fixed here, exactly
  (below).
- **The look relay's whole copy every minute** (#895) is about 1.5% of the
  thread at 120 players: each copy goes to everyone. It could go less often,
  or a phone could ask for a look it lacks; noted for the owner.

### 4b. Which monsters each player hears about, a third cheaper -- fixed here

Every Wheel player, every tick, `_wheelInterest` made two Sets, an array and a
closure, looked every candidate monster up in last tick's set before knowing
whether it was even near, and asked the monster grid for the same squares as
everyone standing in the same squares. Now (`server/src/wheelzone.js`):

- the distance first: a candidate past `INTEREST_OUT` (about half of them) is
  dropped before any set is touched;
- each player's two sets are used in turn and its list kept (they are only read
  in the tick that made them), and `entered` is made only when something
  enters;
- the grid's answer for a block of squares is kept for the tick, so the players
  in the same squares (the town) ask once.

The answer is exactly the old one: `tick-share` §5f holds it to a copy of the
code before, for 40 players over 300 ticks, monster for monster, in order;
breaking it four ways (the kept answers' key, last tick's set, one set for both
ticks, the distance cut) each fails it. Timed alone, at 120 players among the
Wheel's ~360 monsters: 0.33-0.36 ms a tick before, 0.24-0.30 after.

Measured in the real runtime, a minute's CPU profile at 120 players each way:
`_wheelInterest` (with the grid's kept answers, `wheelGridNearKept`) went from
**145 to 95 ms of every second** of the room's thread, about 5% of it.

The whole room's "busy" figure cannot see a change that small: the load test at
120 players, three versions run twice each, interleaved (90 s each):

| | run 1 | run 2 |
|---|---|---|
| #895 alone | 76.0% | 79.7% |
| + the leaderboard's clock | 81.1% | 79.5% |
| + the interest (this PR) | 80.5% | 78.3% |

Two runs of the same code differ by up to 3.7 points, more than either change.
So this PR's gains are read off the profiles: the leaderboard report gone from
them (7.6 ms a second at 150 players), the interest a third cheaper.

### 4c. What a tick is made of

`load.mjs --tick-parts` (this PR) counts what the ticks the probes receive are
made of. With real looks, 30% fighting:

| Players | the players' positions | events | monsters |
|---|---|---|---|
| 60 | 90% (2.05 KB a tick) | 3% | 7% |
| 120 | 95% (4.46 KB a tick) | 3% | 2% |

At 120 players each phone downloads about 160-180 KB a second, unzipped, and
nearly all of it is the other players' positions: in a busy town every walker
is within reach (`FAR_PLAYERS.NEAR_R`, 2,400 px) of every other. Events and
monsters are small.

Two ways to cut it were then built and measured with the load test (120 and 150
players, real looks, each run more than once):

- **The crowd cap on the wire** -- each phone sent, every tick, only the movers
  among its nearest 65 (the 50 it draws, #896, and room for the ones it holds),
  the rest four times a second: **no gain** (the room 78.9-80.2% busy at 120
  with or without it, 174-182 KB a second to each phone). Steady movers
  (v2.3.3203) already keep the movers near a phone in one tick to about 25-35,
  so a tick almost never had more than 65. Kept on a local branch for when a
  door builds the ticks of a crowd of hundreds (split plan, Phase 2).
- **The far send** -- four times a second, every player who had moved, to
  every phone, the near ones it already had included -- about a third of what a
  phone in town was sent. Far players now go with the once-a-second roster
  (#898): at 120 players the room 78-80% -> 73-76% busy and each phone 175-182
  -> 145-150 KB a second; at 150, 35 -> 37 ticks a second.

### 5. Smaller things noticed

- **The load test's phone page never knew more than 150 others**, with 200 or
  250 bots connected. The bots ran in three processes; it was not looked into.
- **The black-screen watchdog asks the GPU for its errors** (`gl.getError`,
  BroTown.jsx, v2.3.3068's readback): each call waits for the GPU to finish
  everything queued, every 5 s. On the test machine that was ~70 ms a sample
  with 150 players drawn. A phone's GPU is far faster; not changed.
- **Pixi rebuilds the world's draw list most frames anyway**: any `zIndex` or
  `visible` change marks it, and a walking crowd changes many `zIndex`es. The
  world is one render group (v2.3.3079). Fewer things drawn is what helps.

### 6. Found later the same night

- **The join snapshot carried every player's whole state** (#899): bag,
  stashes, quests, skills, not only what the others draw. Now it carries only
  what they draw. At 120 players a join's snapshot went from 142 KB to 8 KB,
  and after everyone dropped at once (a deploy or a blip) all were back in 5 s
  instead of 6.
- **Every fight's events went to every phone in the Wheel** (#901). Now they
  go to the phones within 2,800 px of where they happened, and to whoever they
  are about. At 120 players a phone gets 77% fewer events, about 6 KB a second
  less.
- **The once-a-second roster sent every player whole to every phone** (#903).
  Now a far player goes slim (where, facing, zone, speed), and one standing
  still goes every 4 s. Each phone's download at 120 players is about 8% less.

### 7. All of it together: the final ramp

Today's main against main with all seven of the round's server PRs merged
together (#895, #896, #897, #898, #899, #901, #903).

The same load test drove both:
- real looks (`--track`);
- the fighters' swings and arrows (`--relays`);
- the safe ground's walk diet (`--diet`);
- 30% fighting;
- steps of 30 players up to 210, 45 s measured each step.

Each side ran twice, alternating (2026-10-13 night, this machine). The ranges
are the two runs.

| players | today's main | with all seven |
|---|---|---|
| 60 | 41% busy, 41.7 ticks a second, others' moves 28 ms | 36%, 41.9 ticks, 28 ms |
| 90 | 58-63%, 41.6, 34-40 ms | 51-53%, 41.6, 29 ms |
| 120 | 82-83%, 38-39, 69-78 ms | 71-74%, 41.3, 46-49 ms |
| 150 | 97%, 21-22, 123-128 ms | 83-88%, 37.5-39, 65-69 ms |
| 180 | 97-98%, **4**, 260-308 ms | 95-98%, 29-33, 81-91 ms |
| 210 | 97%, **0.5-0.7** (stopped), 0.9-1.1 s | 98%, 20-21, 107 ms |

"Busy" is the room's thread. "Ticks" is out of 45. "Others' moves" is how late
another player's moves arrive, at p95.

- **Full speed** (about 41 ticks a second): today to about 120 players; with
  all seven, about 150.
- **Half speed:** today from about 150; with all seven, about 210.
- **Today's room nearly stops at 180.** With all seven it still ran 20 ticks a
  second at 210.
- **Each phone's download at 120 players:** 225-242 KB a second today,
  142-154 with all seven (-37%).

These are this machine's numbers: wrangler runs everything on one thread here.
The Cloudflare lab (#904) measures what only Cloudflare can tell. The rest of
the room's time at 150-210 players is mostly the runtime's own work for each
message it sends (section 4). Taking that off the room is the split plan's
Phase 1 (`docs/SERVER-SPLIT-PLAN.md`).

## Tools added

- `load.mjs --track` (#895): the bots send a real phone's 2 s look, caught off a
  real page by `mp-trackcapture`.
- `load.mjs --walk-r` (#895): the town walkers in a smaller circle.
- `load.mjs --keep-bundle <dir>` (this PR): keeps the bundle the runtime ran, so
  a CPU profile's line numbers (`cdpprof.mjs`) can be read.
- The phone harness's `BT_MAX_PLAYERS` (#895), for crowd tests past the cap.
- `mp-crowdbots` `BT_CROWD_QUERY` and its `farHidden` / `crowdHidden` counts
  (#896), `mp-peercull` (#896).
