# Do snowmen attack?

**v2.3.2419.** Investigation + pin. No product code changes.

> Owner, 2026-09-09: *"Also snowman monsters aren't attacking."*

## The answer: they attack, hard, and the report does not reproduce

Against a worker built from this repo's own `server/`, a starting character is
**killed in about fifteen seconds** standing at any of three distances:

| distance | HP over 14s | |
|---|---|---|
| 55px (inside melee reach) | 103 → **0** | dead |
| 85px (between the two bands) | 103 → 43 | −60 |
| 200px (snowball band) | 103 → **0** | dead |

Roughly 14–15 damage every 2–3 seconds, at every range tested.

## What was ruled out

**No live flag can turn monster attacks off.** The whole liveops kill-switch
surface is `disable_jackpot`, `disable_weapon_drops`, `disable_dungeons`,
`disable_threats`, `disable_event_capes` — plus the value flags `xp_mult`,
`event_cape_rate`, `max_players`. None of them is read anywhere in the monster
tick, the telegraph, or `_monsterStrikePlayer`. So unlike the lunge
(v2.3.2418), this one has **no capability-shaped explanation**, and pointing at
the flag map would be a guess dressed as a diagnosis.

**Nor the burrow.** A snowman burrows at or below half health and is harmless
as a pile — but for 4.2s against a 20s downtime floor, so about **17%** of his
time at worst. That is not "isn't attacking".

## A prediction this investigation made, and then refuted

The two range constants leave a gap:

```js
_atkRange  = (m.arch === 'snowman') ? 70 : ATTACK_RANGE   // melee reach
MONSTER_RANGED_BY_ARCH.snowman = { range: 300, minRange: 100, ... }
```

Between **70 and 100px** a snowman can do neither — too far to swing, too close
to throw. That is *exactly* where you stand when you walk up to fight one, so
the 85px round was written to confirm it.

**It didn't.** 60 hp came off in 14 seconds there.

The reason is worth keeping: frost spawns **six** snowmen, and the round holds
its distance from **one**. The others close and swing. The dead band is real
arithmetic about a single snowman in an empty zone, and the game never produces
that. It is the kind of reasoning that reads as an answer and isn't one, which
is why the round is still in the file — with the prediction recorded as refuted
rather than deleted.

## What the pin actually asserts

`tools/qa/mp/mp-snowman.mjs`, **9 assertions**, three bands, **a fresh bro per
band**.

They can't share one: at every distance the snowman kills a starting character
inside the window, and a corpse **respawns in town** — so band two of a shared
run measures an empty town square and reports a passive snowman. The first cut
of this file did exactly that, twice.

Two guards run before each measurement, and both exist because the first cut
failed them:

1. **The bro is in frost, beside a worker-driven snowman.** An earlier version
   parked him at `monster + (an angle) × gap`, which put him off the frost map
   and fired the zone exit — so it spent 14 seconds in **town**, measured no
   damage, and would have reported a passive snowman. He is now placed on the
   segment from the monster *toward the map centre*, clamped inside the edges.
2. **The WORKER agrees that is where he stood**, sampled at ~2.4s **while he is
   still alive**. Position is set by writing `S.player.x/y`, and a client
   teleport is not a move the worker has to accept; every aggro and range
   decision is made against the worker's copy. Sampling this at the *end* is
   worthless — he is dead by then and the reading is of the town square.

Damage is judged on the **low-water HP** across the window, never the final
reading, for the same respawn reason.

**Mutation-tested.** One line in `_monsterStrikePlayer`:

```js
if (m && m.arch === 'snowman') return;   // snowmen do not attack
```

All three damage assertions go red; **all six guards stay green** — which is
the property that matters, because it shows the guards measure the fixture and
the assertions measure the behaviour.

## What is left open

The report is real — the owner saw something. This rules out the server AI,
the liveops rail and the burrow, and pins the floor so a future regression here
goes red. What it cannot rule out from here is what the owner's *character* and
*zone state* were at the time. The most useful next thing is a detail from
them: were the snowmen moving toward you, or standing still? A snowman that
chases but never swings is a different bug from one that never notices you.
