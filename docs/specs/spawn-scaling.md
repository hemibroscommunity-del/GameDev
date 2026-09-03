> **v2.3.2244:** the base is **6** per wilderness zone now (owner: "Monsters per zone will increase to 6"), placed by farthest-point sampling (`_pickSpreadSpawn`, `server/src/index.js`) so they spread across the zone instead of stacking; the scaler's mid-session adds use the same picker. The formulas below are unchanged; read `base` as 6 where this doc says 3.

# Population-scaled spawns — v2.3.1983

Monsters and gather nodes now size themselves to **how many players are
standing in that zone**.

> Owner: *"Content throughout is a valid concern. Maybe it should spawn
> resources based on the number of players in the zone?"*

Server code: `server/src/spawnscale.js` (mixin, `spawnScaleMethods` +
the `SPAWN_SCALE` constant block).
Tests: `server/test/spawn-scale.test.mjs` (78 assertions), plus the
solo-ceiling additions in `server/test/node-respawn.test.mjs` §3b and
the grown-roster assertion in `server/test/protocol-v2.test.mjs` §4.

## The problem it fixes

Every wilderness zone carries the population its table declares — 3
monsters (`data.js ZONES.spawns`) — and one node per gathering skill
(`gathering.js _getZoneNodeConfig`), **shared by everyone in it**. Solo
that is deliberate and tuned: 3 monsters on the 15 s `RESPAWN_TIME` is
12 kills/minute available, which is exactly what v2.3.1739 set by feel.

Ten people on the same early quest need about 40 kills and are handed
the same 12/minute between them. One ore vein between ten miners is one
ore each per ~200 s. At a public demo the first ten people to log in
stand in an empty field waiting for a slime to come back — the first
impression is an empty world. That is a world-SIZE bug, not a balance
one: the zone was never sized for a crowd.

## The rule

Per zone, keyed on the players standing in **that** zone (never the room
total — the room is world-wide, and a zone nobody is in must keep
spawning nothing):

| dial | rule | p=1 | p=5 | p=10 | p=15 | p=25 |
|---|---|---|---|---|---|---|
| monster cap | `min(24, base + ceil((p-1) × 1.5))` | 3 | 9 | 17 | 24 | 24 |
| monster respawn | `max(6000, RESPAWN_TIME / (1 + (p-1) × 0.06))` | 15.0 s | 12.1 s | 9.7 s | 8.2 s | 6.1 s |
| nodes per skill | `min(3, base + floor((p-1) / 4))` | 1 | 2 | 3 | 3 | 3 |

**Why two monster dials and why both are gentle.** The CAP fixes "I look
around and the zone is empty"; the RESPAWN RATE fixes "I turned around
and there is nothing left", and the owner's own tuning history
(v2.3.1592, v2.3.1739) says rate is the half that gets felt. They
multiply — available kills/minute is `cap × 60000/respawn` — so a linear
cap on a linear rate would grow quadratically. What the shipped numbers
deliver per player per minute:

```
p=1   3 / 15.0s = 12.0/min -> 12.0 each   (solo: unchanged, bit for bit)
p=5   9 / 12.1s = 44.6/min ->  8.9 each
p=10 17 /  9.7s = 105 /min -> 10.5 each
p=15 24 /  8.2s = 176 /min -> 11.8 each
p=25 24 /  6.1s = 236 /min ->  9.4 each
```

Roughly flat at just under the solo experience, never richer than solo,
degrading gently past the ceiling instead of falling off a cliff.

**Why 24 is the ceiling.** Not a guess: `server/test/load-tick.mjs`
scenario B has always measured 25 real monsters per zone × 7 zones = 175
monsters against 120 players at ~0.35 ms average tick out of the 22 ms
budget. The ceiling is a shape the room is already proven to carry.
Bandwidth is the tighter constraint (a protocol-v1 session receives the
whole dirty-zone entity list every tick), which is the other reason the
curve is sublinear.

## Hysteresis (the part that matters more than the curve)

Population changes constantly as people walk between zones. A cap that
recomputed off the live count would pop monsters in and out of existence
in front of players, which reads far worse than a sparse zone. The cap
is therefore driven by a **held** population:

- rises **instantly** — ten people arriving at once should get their
  world now, not in a minute;
- falls by at most **one player per 60 s** while anyone is still there,
  so a zone that peaked at 15 unwinds over ~14 minutes;
- drops to zero the moment the zone is **empty** — nobody is there to
  watch it happen, and this is where nearly all trimming really occurs.

And nothing in use is ever taken away:

- only monsters this module added (`_scaled`) are removable — the
  authored 3 never are;
- a removable monster must be **more than 600 px from every player** in
  the zone (past the half-diagonal of the ~488 × 1056 px phone world
  viewport, `src/game/worldViewport.js`), so nothing winks out on
  someone's screen — dead ones included, so a death animation is never
  cut short;
- and it must be dead-and-waiting, or unengaged: no target, no damage
  credit, no statuses, no live stun;
- a node with a live extraction on it is pinned by id, so "never
  despawn a node someone is mining" holds even for a harvest that
  started minutes ago.

Consequence, stated because it is real: a player parked in a zone that
emptied around them keeps the monsters *near them* until they move or
leave. The cap bounds it at 24 either way, and an over-full zone is
invisible where a popping one is not.

## Wire

**No new message type, no caps flag.** Growth is announced by re-sending
the zone snapshot the client has always understood — `zone_state` to
protocol-v2 sessions, `zone_monsters` + `zone_nodes` to v1 — the same
shape `_dungeonPushZoneState` has used since v2.3.1127.

This is forced, not stylistic: the per-entity tick delta **cannot
introduce an entity**. `wsClient`'s tick handler updates monster ids it
already knows and silently ignores the rest, so a monster announced only
by delta would be invisible on every existing client while its AI
happily attacked them. A snapshot resend is the only deploy-order-safe
answer, and it means an **old client sees the extra monsters correctly
against a new worker** (handoff rules 19/21).

Snapshots go out only when a zone's roster actually changed, and only to
sessions standing in that zone. The zone-entry and join paths scale the
zone *before* building their own snapshot (excluding the arriving
socket), so an arriving player is handed the grown world in one frame
instead of seeing the sparse one and being re-synced a moment later.

| trigger | who gets what |
|---|---|
| tick (≤ once per 2 s) | everyone in a zone whose roster changed |
| zone entry / join | the arriver via their normal snapshot; everyone else via the roster push |

## Anticheat: the harvest ceiling moved, and had to

`BOTFP.HARVEST_HOUR_CAP` went **270 → 810**. That is the existing
derivation re-run, not a clamp loosened to make something pass.

The cap is documented as sitting 50 % above the *physical* world supply
per skill per zone — `nodes × 3600/respawnSeconds` — which is what makes
"zero false-positive risk by design" true. Scaling gives a crowded zone
up to 3 nodes per skill, so that supply became `3 × 180 = 540/h`, and
540 × 1.5 = 810. `NODE_RESPAWN_TIME` is untouched at 20 s precisely
because the arithmetic is anchored to it.

There was no way to avoid this: throughput is `nodes × 3600/respawnSec`,
so *any* increase in what a crowded zone supplies pushes the physical
ceiling above a cap sized for one node. Leaving it at 270 would have
turned a clamp that can only fire on the impossible into one that
silently withholds resources from a real player grinding in a busy zone.

What it costs: a bot's per-skill hourly take triples. Bounded on
purpose — 3 nodes exist only while 9 other people are in the zone
competing for them (a lone harvester still sees exactly one node and the
old 180/h ceiling, pinned by `node-respawn.test.mjs` §3b), a fleet
manufacturing that crowd is what `FLEET_MIN_IDS` correlates, and the cap
was never the bound on the world anyway: a teleporting bot touring all 9
wilderness zones could reach 9 × 180 = 1620/h at base density, so 810
still clips the multi-zone tourist by half.

Whoever changes `SPAWN_SCALE.NODE_MAX` owns that number next.

## Cost

- The scaler is **self-throttled to one pass per 2 s** (`SCALE_MS`), i.e.
  ~1 tick in 90. Measured in the suite: **0.15–0.21 ms per full pass**
  with 60 players across every zone, ~0.0002 ms on a throttled tick —
  about **0.002 ms amortised per 22 ms tick**. It is one pass over
  `playerState` plus one over the zones that hold entities, never a
  per-zone re-scan per player.
- The respawn timer is computed at kill time, so the rate half costs
  nothing per tick.
- The ongoing cost is simply "more monsters in `_tickMonsters`", which
  is exactly the load-tick scenario-B shape (see the ceiling note above).

## Storage

**None.** Held population (`_zonePop`) and the id sequences
(`_zoneSpawnSeq` / `_zoneNodeSeq`) are in-memory scratch (handoff rule
11) on null-prototype maps (TRAPS #6). A deploy wipes them and the world
re-derives the correct cap within 2 s from live sessions — nothing of
value is lost, so there is no new storage key and no registry entry.

## Trust

Entirely server-side. Spawn counts are a pure function of the server's
own `playerState`; no message sets or influences them, forged fields on
`move` do nothing, and an unknown or prototype-shaped zone id has no
spawn table so it scales to nothing (`spawn-scale.test.mjs` §7).

## Attach points

| hook | site |
|---|---|
| `_tickSpawnScale(now)` | `tick.js`, guarded, immediately before `_tickMonsters` |
| `_spawnScaleZone(zone, now, pop, exceptWs)` | `movement.js` zone-change branch; `join.js` bootstrap |
| `_monsterRespawnMs(zone)` | `combat.js _resolveMonsterKill`; `pets.js` capture |
| `_makeZoneMonster(...)` | `index.js` — one monster builder shared with `_spawnZoneMonsters` |
| `_placeGatherNode(...)` | `gathering.js` — one node placer shared with `_spawnZoneNodes` |

## Dangers for the next session

- **Do not scale dungeon instances.** `dungeon:*` ids ride the same
  `this.monsters` map, but their populations are `_tickDungeons`' wave
  logic; `_spawnScalableZone` excludes anything without an authored
  spawn table for exactly this reason.
- **Do not announce new entities with a tick delta.** See the Wire
  section — it looks like the cheap option and it is invisible on every
  client that exists.
- **Do not raise `MON_MAX` without re-running load-tick**, and do not
  raise `NODE_MAX` without re-deriving `HARVEST_HOUR_CAP` in the same
  commit (`node-respawn.test.mjs` fails if the two drift).
- **Do not "restore" the authored counts** in `data.js` — the base
  tables are still the solo experience the owner tuned, and this feature
  is deliberately additive on top of them.
