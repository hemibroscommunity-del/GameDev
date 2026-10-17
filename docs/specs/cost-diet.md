# The cost diet: what a player-hour costs, and what is left to save (v2.3.3270)

> The owner, 2026-10-16: *"Build my game so that it's the most cost effective
> that it can be without losing quality. Beware a separate session is
> currently doing some server splitting work though"*

## The short answer

The game already sends and saves about the least it can without a player seeing
a difference. The big savings were made before this:
- the quiet phone (#913, v2.3.3254) cut the messages phones send;
- v2.3.1619 and v2.3.1623 stopped the health and stamina saves happening every
  tick.

This change does three things:
1. **Trims one save nobody sees:** a gatherer's bot statistics were written
   every 30 s, and are now written every 5 minutes. That is 13-17% fewer rows
   for a gatherer.
2. **Adds a guard** (`server/test/cost-guard.test.mjs`), so a future feature
   cannot quietly make play expensive again.
3. **Adds a measuring tool** (`tools/qa/load/cost-audit.mjs`), so the next
   question about cost has a number behind it.

Everything that would save more changes something a player can see. Those
options are listed at the end with what each costs. Choosing one is the
owner's call.

Nothing here touches the server split (join, the tick, the rosters).

## What Cloudflare charges for

From Cloudflare's own pricing pages (read 2026-10-16), the paid plan is $5 a
month and includes:

| What | Included each month | Past that |
|---|---|---|
| Requests: 20 messages from phones count as one; messages to phones are free | 1 million | $0.15 a million |
| Time a server is awake | 400,000 GB-s, about one room awake all month | $12.50 a million GB-s |
| Rows written: each save of one stored record is one | 50 million | $1.00 a million |

On the free plan (today) the same things are limited per day instead:
100,000 requests, 13,000 GB-s and 100,000 rows written. At the game's
measured rates, requests run out first, at about 100 player-hours a day.

## What a player-hour costs, measured

`node tools/qa/load/cost-audit.mjs 15 3 --seed=N` runs a real game room in
this machine's memory, with storage that counts every save. Three players
each do one thing for 15 minutes of game time. Rows written in a player-hour,
before and after this change (the same seeds, so the same harvests):

| Doing | Before | After | Where the rows come from |
|---|---|---|---|
| Standing in BroTown | 4 | 4 | one save of the bot statistics when the idle logout ends the session |
| Walking | 0 | 0 | nothing |
| Fighting | 955-1,145 | the same | one save of your record a kill (~570); a hit near death saves at once by design (your health at or under a quarter); your health otherwise at most every 10 s; the codex at most every minute |
| Gathering | 367-592 | 311-513 | one save of your record a harvest; the bot statistics: 65-91 an hour before, 9-12 after |

**v2.3.3305: a melee kill that heals you was TWO saves of your record**, not
one. The kill's lifesteal (and Lifeblood) ran after the kill's save and saved
the whole record again for the healed health. In the audit every one of a
fighter's melee kills healed, so "one save a kill (~570)" above was really
~285 kills saving twice. The heals now run first and the kill's one save
carries them (combat.js `_resolveMonsterKill`; same health, same events).
`cost-audit.mjs 6 1 --seed=1`, the fighter: **1,030 -> 760 rows a
player-hour** (the kills' saves 550 -> 280). `cost-guard` §5c holds it.

**The simulated fighters are reckless.** They eat at half health and spend a
lot of the fight near death, where every hit saves at once. A real player's
hour is mostly walking, standing and menus, with fights and harvests in
between. The game's real figure is about 250 rows a player-hour: Cloudflare's
own count for the 2026-10-11 playtest was 747 rows for about 3 player-hours.

A new character's first join writes 5 rows, and coming back writes 3 (the
day's snapshot of the character is 2 of them). The room's own writes with
one player in it come to 1 an hour.

**Messages from phones** (measured on a real game page by `mp-quietphone`,
docs/specs/quiet-phone.md):
- standing: about 0.2 a second;
- walking: about 15 a second;
- walking or fighting next to another player, turning: about 30 a second.

These are already the floor; the experiment below shows why.

## What was tried, and why it was not shipped

### Fewer messages for a thumb's curving walk

A steady walk is sent every 66 ms instead of 33 (v2.3.3204, v2.3.3254). Today
"steady" means the speed is within 4% of the last move's, about 2 degrees.
The stick is analog, so the idea was to judge a move by where it leaves you
instead of by its angle: hold it while the others still draw you within 2 px.

The test (`move-diet.test.mjs`'s room, a thumb's walk with wobble and S-curves)
compared both rules with sending every move:

| Turning, degrees a second | Moves sent: every 33 ms | the rule today | position rule | Others draw you, every move: average / 95% | position rule: average / 95% |
|---|---|---|---|---|---|
| 0 | 121 | 64 | 61 | 5.4 / 6.9 px | 5.5 / 7.1 px |
| 35 | 121 | 70 | 61 | 7.1 / 9.6 | 7.7 / 11.1 |
| 90 | 121 | 90 | 61 | 12.4 / 19.9 | 14.6 / 24.2 |
| 140 | 121 | 110 | 61 | 17.0 / 27.4 | 19.7 / 32.1 |

- **Gentle turns:** the rule today already holds most of what can be held.
  The position rule saves 3-9 more of 121.
- **Fast turns:** it saves up to 49 of 121, but the other phones draw the
  turning walker 2-5 px further from where they are. That fails the bar this
  game set for "nobody can see it" (`move-diet.test.mjs` 2k: within 1 px on
  average and 3 px at the 95th percentile).

So it was not shipped.

### Health and stamina saved every 30 s instead of 10

Measured on the same seeded fights, this made 11% fewer rows for a fighter.
Most of a fighter's health saves happen near death, where every hit saves at
once on purpose, and kills save anyway. It is the same kind of trade the
owner took for v2.3.1623: a restart gives back what was not saved. Here that
would be up to 30 s of damage instead of 10, so it is listed below rather
than shipped.

### The arena's background check

Every player's page asks the arena for news every 5 minutes, 12 requests a
player-hour (about 1% of the requests). It looked unneeded for a player with
no arena business, but the page's own "do I have arena business?" (a queue
place, a tournament, a bet not yet paid) is read off these answers
(BroTown.jsx, the v2.3.1623 poll). Stopping it safely would mean rebuilding
that, for about 1% of the requests. Left alone.

### Idle players

The room logs out anyone with no thumb on anything for 2 minutes, and an
empty room stops its tick and costs nothing (v2.3.1913, ARCHITECTURE-HANDOFF
rule 12). Nothing wasted there.

## What is left: each would save money and cost some quality

Dollars are at 20,000 monthly players, with about 2,000 online at the busiest
hour (about 580,000 player-hours a month). There, the bill was estimated at
about $320 a month:
- messages ~$115;
- saves ~$125;
- servers awake ~$55 and the split's doors ~$20 (the server split's own
  work);
- the plan $5.

| Option | Saves, at 20,000 players | What it costs in quality |
|---|---|---|
| **1. Save kills and harvests every 15 s, not each one** (and at once for a rare drop, a level-up, a death, leaving, and anything traded or sold) | about 60% of the saves, **~$100 a month** | A server restart (every deploy of a server change) could take back up to 15 s of loot and XP from players online at that moment. Today a player never sees a reward that a restart could take back (ARCHITECTURE-HANDOFF rule 10). |
| 2. Moves in a fight every 66 ms instead of 33 | about 20% of the messages, ~$20-25 a month | Monsters and other players hit the server's copy of you, which would be up to 33 ms older: a dodge could land a frame late. |
| 3. Fast-turning walks every 66 ms (the experiment above) | about 5-10% of the messages, ~$5-10 a month | Others draw a turning walker 2-5 px further off for a moment. |
| 4. Health and stamina saved every 30 s | about 5% of the saves, ~$6 a month | Up to 30 s of damage given back on a restart (10 s today). |

**Before about 7,000 regular players, none of these saves anything.** At about
250 rows a player-hour, the $5 plan's 50 million rows a month cover about
200,000 player-hours, and requests cost about 15 cents per 1,000
player-hours. The recommendation is to keep the quality, and to look at
option 1 again only if the game grows past that.

## The guard

`server/test/cost-guard.test.mjs` runs with the server suites on every PR, on
a simulated clock (about 8 seconds). It checks:

1. standing in BroTown writes nothing of yours (the idle logout's close a row
   or two);
2. walking for 3 minutes writes nothing of yours;
3. regenerating writes your record at most once a `REGEN_SAVE_MS`;
4. a monster's hits the same, out of the near-death band, and in it every hit
   at once;
5. a kill writes your record once, and the codex at most once a
   `CODEX.SAVE_MS`;
6. gathering writes the bot statistics at most once a `BOTFP.PUT_MIN_MS` (5
   minutes) and your record at most once a harvest, and leaving writes the
   statistics at once;
7. a new character's join is at most 6 rows, coming back at most 4;
8. the room's own writes with one player in it for 10 minutes are at most 5.

A feature that really needs more rows moves a line in the same PR and says so
in its body, in plain words. That is the memory budget's rule (CLAUDE.md,
"MEMORY IS BUDGETED").

## Files

- `server/src/botfp.js`: `BOTFP.PUT_MIN_MS` 30,000 -> 300,000.
- `server/test/cost-guard.test.mjs`: the guard (16 checks), added to
  `npm test`. Tried against two breaks on purpose: health saved on every hit
  (check 4 fails: 39 rows a minute, limit 7) and a save on every move (checks
  1, 2 and 6b fail: 1,637 rows in 3 minutes of walking).
- `server/test/botfp.test.mjs`: a comment (its §9b does not depend on the
  throttle).
- `tools/qa/load/cost-audit.mjs`: the measuring tool, under `tools/` so it
  never deploys the worker.
- `docs/specs/anticheat-botfp.md`: the write cadence.
- `CLAUDE.md`: Conventions, "WHAT PLAY WRITES IS GUARDED".
