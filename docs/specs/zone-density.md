# Zone density & respawn cadence (v2.3.1592)

Owner directive: *"I want to try only 3 monsters per zone and one resource per
zone but with quick respawn."*

Explicitly an **experiment** — every number here is a constant in one place,
and the suite that guards them tells you which ones are free to move.

## What changed

| | before | after |
|---|---|---|
| Monsters per wilderness zone | 3–10 (varied) | **3** (uniform) |
| Gather nodes per zone | 9 (3 tree + 3 fish + 3 ore) | **3** (1 of each) |
| Monster respawn | 15s | **5s** |
| Node respawn | 120s | **20s** |

Population and cadence are one change, not two. Cutting the population alone
leaves a cleared zone standing empty; quickening the clock alone just adds
crowding. The pairing keeps steady-state supply roughly where it was while
putting far fewer entities on screen at once — 3 monsters on a 5s clock is the
same throughput as 9 on 15s.

## "One resource per zone" means one of *each*

Read as **every resource appears once in every zone** — the direct inverse of
the v2.3.1346 line it replaces ("EVERY resource appears 3 times in EVERY
zone"), so `{treeCt: 1, fishCt: 1, oreCt: 1}`.

Not "one node total". That reading would leave two of the three gathering
skills unharvestable in any given zone, undoing both v2.3.1346 and the
2026-07-06 "add fishing spots to each zone" request, whose whole point is that
every skill is playable wherever you're standing. `node-respawn.test.mjs`
asserts each of the three types is present, so a future `{tree:1, fish:0,
ore:0}` can't pass a naive "one node" check.

## Monster variety survives the cut

Counts scale to 3 while preserving each zone's archetype mix, rather than
collapsing to three copies of one thing:

| zone | before | after |
|---|---|---|
| `meadow` | fodder ×10 | fodder ×3 |
| `ember` / `thunder` | fodder ×6 | fodder ×3 |
| `mist` | fodder ×6, brute ×4 | fodder ×2, brute ×1 |
| `verdant` | fodder ×7, blueSlime ×1 | fodder ×2, blueSlime ×1 |
| `frost` | snowman ×4 | snowman ×3 |
| `hollows` | brute ×4 | brute ×3 |
| `sky` | stalker ×4, hexer ×3, volatile ×3 | stalker ×1, hexer ×1, volatile ×1 |
| `tidal` | brute ×3 | *unchanged — already 3* |

## The 20s node timer is pinned by the anticheat, not by taste

This is the one number here that is **not** free to tune.

`botfp.js` caps harvests at `HARVEST_HOUR_CAP: 270` per skill per hour, and
justifies it as sitting 50% above the *physical* ceiling — the most a
teleporting bot could take if it harvested every node the instant it
respawned. That claim ("zero false-positive risk by design") is only true
while the ceiling stays below the cap.

    ceiling = nodesPerSkill × (3600 / respawnSeconds)

- Before: 6 nodes × 30/hour = **180**
- After: 1 node × 180/hour = **180** — same product, so the cap and its margin
  needed no edit
- At a 10s respawn: 1 × 360 = **360**, which is *above* the 270 cap —
  legitimate players would start tripping the bot detector

So 20s is the floor, not a preference. To go faster, raise
`HARVEST_HOUR_CAP` in the same commit and redo the arithmetic.
`node-respawn.test.mjs` recomputes the ceiling from the live constants on
every run and fails if they drift apart — verified by temporarily setting 10s
and watching it fail with `{"ceiling":360,"cap":270}`.

Monsters have no equivalent constraint: `botfp` caps harvesting and cooking
only, so there is no hourly kill ceiling to breach. The 5s figure is bounded
by feel alone.

## Where the constants live

| what | file |
|---|---|
| Monster counts (authoritative) | `server/src/data.js` → `ZONES[].spawns` |
| Monster counts (client mirror) | `src/data/zones.js` → `ZONES[].spawns` |
| Node counts (authoritative) | `server/src/gathering.js` → `_getZoneNodeConfig` |
| Node counts (client mirror) | `src/data/lifeSkills.js` → `spawnGatherNodes` default |
| Monster respawn | `server/src/index.js` → `RESPAWN_TIME` |
| Node respawn | `server/src/index.js` → `NODE_RESPAWN_TIME` |
| Harvest cap | `server/src/botfp.js` → `HARVEST_HOUR_CAP` |

The client tables are mirrors; the server is authoritative for what actually
spawns. `zones.test.mjs` asserts the monster tables match each other;
`node-respawn.test.mjs` pins them to the actual target, since two tables that
both say 5 would satisfy a lockstep check.

## Wire surface

None. No message type, field, or capability changed — this is entirely a
tuning-constant pass, so there is no deploy-order concern and no `caps` flag.
An old client against a new worker simply receives fewer entities in its
existing `zone_monsters` / `zone_nodes` payloads.

## If it doesn't feel right

Most likely dials, in order:

1. **Zones feel empty between kills** → lower `RESPAWN_TIME` (no ceiling).
2. **Gathering feels thin** → raise the per-type counts back toward 2;
   cheaper than touching the timer, since count and timer trade off against
   the same ceiling.
3. **Both** → the population target is one constant (`TARGET_PER_ZONE` in the
   suite) plus nine table rows.
