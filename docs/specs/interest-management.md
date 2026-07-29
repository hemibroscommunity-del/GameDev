# Interest management — zone-scoped tick broadcasts (v2.3.1575)

Server-side only. No new message types, no client change, no caps flag.

## Why

The 45 Hz tick fanned **every dirty zone's** entities out to **every socket**
in the room. The client then threw almost all of it away:

- `src/networking/wsClient.js` reads only `msg.monsters[myZone]` /
  `msg.nodes[myZone]` and ignores every other key.
- `src/rendering/systems/entityRenderer.js` skips any peer whose zone differs
  from `S.currentZone`.

Measured against the real `GameRoom` (7 zones × 25 monsters, everyone moving
and fighting), tick payload decomposition at 20 players:

| section | share of egress | usable by receiver |
|---|---|---|
| monsters | 66.4% | 14% (own zone only) |
| players | 31.4% | own zone only |
| events | 1.0% | all |
| nodes | ~0% | own zone only |

**~85% of every byte sent was unusable by the receiver.** A player standing
*alone* in a zone still pulled 204 KB/s (~1.6 Mbit/s) — the primary platform is
iPhone Safari, frequently on cellular.

CPU was never the constraint (`load-tick.mjs`: ~1 ms of a 22 ms budget at 120
players, double the 60-player cap). Every prior optimization tuned the
*contents* of the broadcast — fewer fields, only-changed entities, one
serialization per protocol version. None tuned its *audience*. That was correct
when a room was a handful of prototype players in one or two zones; it stopped
being correct at twelve zones, because cost scales with `zones × entities`
rather than with what any one player can see.

## What changed

All of it lives in the broadcast section of `server/src/tick.js`.

**Monsters + nodes are scoped to the receiver's own zone.** A session standing
in `meadow` receives `monsters.meadow` and nothing else. This also closes an
incidental leak: dungeon instances (`dungeon:<id>` zones) were broadcasting
their contents to the whole room.

**Players split by zone.** Same-zone peers keep full 45 Hz fidelity — they are
the ones who can actually be rendered. Out-of-zone peers ride a **1 Hz presence
roster** instead of the per-tick dirty list.

The roster is not optional and not a dirty-list filter. The client's
ghost-sweep (`wsClient.js`) deletes any peer silent for 10 s and derives the
"N online" count from the survivors, so dropping out-of-zone peers outright
would collapse the roster to your own zone. The roster is therefore
**unconditional** — every connected player, dirty or not — because an idle peer
is never in `dirtyPlayers` and would otherwise age out. `PRESENCE_REFRESH_TICKS
= 45` (~1 s) gives the 10 s sweep 10× margin; do not raise it past ~7 s without
revisiting that sweep window.

**Events are deliberately NOT scoped.** They measured at 1% of egress, and the
buffer mixes zone-local combat (`monster_hit`, `loot_drop`) with room-wide
social relays (`chat`, `emote`, clan/trade/duel handshakes). Filtering would buy
approximately nothing and risks silently dropping social traffic. Left exactly
as it was.

**Serialization stays "build once, send many"** — now once per
`(zone, protocolVersion)` group rather than once per protocol version, cached in
a `Map` across the session loop. The dirty sets are cleared *after* that loop
because the group builder reads them lazily.

The **v1/v2 contract survives unchanged** inside each zone: v1 sessions get
every monster in their zone, v2 sessions get only the entities marked dirty this
tick.

## Results

Per-client egress, same scenario as above. Both columns measured on the same
commit (stash / measure / unstash), so the pair is apples-to-apples:

| players | before | after | reduction |
|---|---|---|---|
| 7 (one per zone) | 203.9 KB/s | **32.1 KB/s** | 6.4× |
| 20 | 262.0 KB/s | 40.1 KB/s | 6.5× |
| 40 | 340.8 KB/s | 55.7 KB/s | 6.1× |
| 60 (cap) | 418.7 KB/s | **67.7 KB/s** | 6.2× |

Room egress at the 60-player cap: **24.5 MB/s → 3.96 MB/s**.

CPU cost of the extra per-zone serializations, at 120 players across 7 zones
(the realistic worst case): 1.06 ms → 1.23 ms of the 22 ms budget, 0% of ticks
over. ~15% more tick CPU for ~6× less bandwidth, with 18× headroom remaining.

## Deploy-order safety

No caps flag (handoff rule 19), because nothing new is *claimed*. An old client
already ignores other-zone entities, and already tolerates a peer refresh at
1 Hz — its ghost-sweep window is 10 s. Nothing changes for it except that the
bytes it was discarding stop arriving. Safe to deploy client and worker in
either order.

## Tests

`server/test/tick.test.mjs` §11 pins: per-zone monster scoping for v1 and v2
sessions, the dungeon-leak closure, the v1-full / v2-delta contrast surviving
the scoping, events staying room-wide, and the presence roster delivering an
out-of-zone peer.

`server/test/protocol-v2.test.mjs` (harvest-activity block) now asserts both
paths — a same-zone peer gets the `ex` relay at tick rate, an out-of-zone peer
arrives on the presence roster.

Note for anyone extending these: `_ensureZoneMonsters` dirties the whole zone on
first spawn, so reset the dirty sets after setup or a "dirty only" assertion
will see every monster.

## Not done (deliberately)

Per-viewport AOI culling *within* a zone. The measurement says the zone boundary
is where essentially all the waste is; adding a spatial index would buy the
remainder at the cost of pop-in bugs at zone edges. Revisit only if per-zone
population grows enough to matter.
