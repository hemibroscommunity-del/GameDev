# Optimization Roadmap (2026-07-01 analysis · status refreshed 2026-07-07)

A full-repo review (client, server, docs, tooling) with priorities for
where work pays off most. Written for the repo owner in plain language;
file/line references are for whoever implements each item. Line numbers
drift as code changes — treat them as "near here", not exact.

**Status as of v2.3.1191: P1–P4 have ALL shipped.** The server test
safety net exists (33 zero-dependency suites, 850+ assertions), the
trust gaps are closed or deliberately documented, the client smoke test
gates every PR, and the server decomposition is COMPLETE —
`server/src/index.js` is down from 5,434 lines to ~2,570, with every
subsystem in its own mixin module (map in §P4). What remains of this
roadmap is the P5 small-findings list, partially burned down below.

---

## What's already healthy (no action needed)

- **Client rendering.** No per-frame texture/text recreation, no filter
  compositing issues, lazy asset loading behind the intro, perf tracker
  with slow-frame logging already built in (`src/game/renderFrame.js`).
  The BroTown.jsx decomposition (33k → ~8.6k lines) did its job.
- **iOS Safari defenses.** Audio unlock, WebGL context-loss recovery,
  ImageBitmap purge workaround, wake-stall resync — all handled and
  documented with version tags.
- **Server tick loop.** 45Hz with delta encoding, aggregated
  player-state flush, per-entity dirty tracking for v2 clients, no
  per-tick storage writes (`server/src/tick.js` since v2.3.1174).
  Estimated well under the tick budget at current player counts.
- **Server-computed damage.** `_computeAttackDamage`
  (`server/src/combat.js` since v2.3.1191) rolls player→monster damage
  from server-tracked stats; the client only sends intent (slot +
  special). The old "client claims 99999 damage" cheat is closed.

## P1 — Server test safety net — SHIPPED

Landed as planned (anticheat + combat-lifecycle suites alongside
protocol-v2), then grew with every system PR per handoff rule 24. As of
v2.3.1191 `cd server && npm test` runs **33 suites / 850+ assertions**
against a mocked DO storage — including the v2.3.1142 core net
(persistence / tick / lifeskills-economy) that was written specifically
so the P4 extraction slices had coverage, and the v2.3.1151 conformance
audits (wire-protocol emission sites + mirror-table drift) that turn
two whole classes of regression into CI failures. `server-ci.yml` runs
it all on every PR.

## P2 — Remaining trust gaps — closed or deliberately documented

1. ~~**Weapon blob trust on join/load**~~ **(done, v2.3.1104)**: weapon
   objects from the first-connect bootstrap and legacy stored records
   pass through `_sanitizeWeapon` (tierMult clamped to the legit forge
   range). Since v2.3.912 the server's own damage roll multiplies by
   tierMult, so this guards *authoritative* damage, not cosmetics.
2. ~~**Sell overpay**~~ **(done, v2.3.1104)**: `_weaponSellValue` clamps
   tierMult defensively, so a stale pre-clamp stored blob can't cash
   out at forged value.
3. ~~**Cooking minigame cadence**~~ **(done — and the remaining trust is
   now a documented design decision, not a gap)**: `cook_request` is
   rate-limited 20/min (v2.3.1104) with the history persisted in the
   rpg blob, and v2.3.1167 added a physics floor — sub-window
   `cook_request` bursts are dropped. The outcome (`kind`) itself stays
   client-reported ON PURPOSE: the minigame is player *timing*, not a
   skill roll, so a server dice roll would burn fish for players who
   flipped correctly. Full rationale in `docs/specs/cooking.md`.
4. ~~**Elemental damage follow-up**~~ **(shipped, v2.3.1139)**: CC
   (freeze/root/slow) gates the real server monster AI, the
   resonance-streak mana restore settles server-side, and amulet
   elemDmg + the hexer curse are in `_computeAttackDamage`. Spec:
   `docs/specs/elemental-completion.md`. Still open (small, listed
   there): amulets are a client-crafted blob (forgery ceiling ≈ legit
   mythic +10.5%; a server amulet-forge handler is the real fix),
   shock/fracture/soak statuses are mechanically inert, and
   peer-visible status FX are cosmetic-only.

## P3 — Client smoke test in CI — SHIPPED (v2.3.1105)

`client-ci.yml` has a `smoke` job that builds the client, stands up a
LOCAL worker (`wrangler dev`/Miniflare — no Cloudflare token; the DO
bindings are fully emulated), serves the build with `vite preview`, and
runs `tools/qa/qa-smoke.mjs` against the pair. The script has a real
exit code (fails on: never joined, any uncaught page error, or a
captured crash log) and a `QA_WS_URL` override so CI never touches the
production worker. Because the smoke is the only client↔worker
integration gate, `server/**` changes trigger it too. It would have
caught the v2.3.756 class of shipped ReferenceError at PR time.

## P4 — Server decomposition — COMPLETE (v2.3.1162–1175)

The strangler-fig extraction finished. `server/src/index.js` (~2,570
lines) keeps only the genuine core: the worker router + GameRoom
lifecycle, the `webSocketMessage` switch, monster spawn/AI
(`_tickMonsters` and its zone/variant helpers), loot piles + pickup,
player death/respawn/regen, abilities, PvP consent bookkeeping, and
the weapon build-CHANNEL helpers (`_wpnCat`/`_wpnDmgChannel`/crit
variants — combat-damage inputs shared by paths on both sides of the
module line). Everything else is a prototype mixin, mixed in via
`Object.assign(GameRoom.prototype, …)` at the bottom of index.js:

| Module | System |
|---|---|
| `combat.js` | damage application, authoritative attack roll + anti-cheat ceilings, monster_damage, kill resolution, PvP lag-comp rollback |
| `tick.js` | the 45Hz tick loop (calls back into `_tick*` everywhere) |
| `join.js` | identity gate + join bootstrap + caps advertisement |
| `persistence.js` | rpg-blob load/save (fixed field list) + player_state emit |
| `movement.js` | move handler (anti-teleport + zone streaming) |
| `grids.js` | build grids, progression, stats_update sanitizers |
| `gear.js` | equipment store: sanitizers, sell, forge, equip |
| `gathering.js` | gather nodes, harvest, extraction validation |
| `cooking.js` | eat / cook / recipes / NPC shop |
| `inbox.js` | inbox + escrow primitives (`_creditPlayer`, opId journal) |
| `gamble.js` | Gamble Hall (wheel + card) |
| `quests.js` | server-authoritative quest objectives |
| `market.js` / `trade.js` / `trade2.js` | order book, gift-trade settlement, two-sided trade window |
| `duel.js` / `gladiator.js` / `clans.js` / `guilds.js` / `threat.js` | duels, arena, clans + wars, guild quests, threat machine |
| `dungeon.js` / `pets.js` / `hardening.js` / `elemental.js` | instanced dungeons, pet capture, quality/hardening, elemental statuses (pure functions) |
| `account.js` / `botfp.js` / `admin.js` / `cadence.js` / `liveops.js` / `migrations.js` | login keys, anti-bot fingerprint, operator toolkit, daily/weekly settles, flags/MOTD/metrics, save-format migrations |
| `data.js` | mirrored data tables (CI-pinned against the client) |
| `marketplace.js` / `arena.js` / `leaderboard.js` / `feedback.js` | standalone DO classes (marketplace/arena retired from routing, kept for wrangler bindings) |

What made it safe, for anyone repeating the pattern elsewhere: each
slice was a byte-identical hoist (hash-compared against HEAD), one
slice per commit, all suites green per slice, and a tombstone comment
at the old site pointing to the new module. The P1/v2.3.1142 test net
was built BEFORE the risky slices — do not reorder those steps.

## P5 — Small findings & opportunistic cleanups (refreshed 2026-07-07)

- ~~**Event-buffer overflow drops events**~~ **(fixed, v2.3.1163)**:
  overflow past the 500/tick cap is now spliced and delayed to the next
  tick instead of discarded (`server/src/tick.js`; pinned by
  `test/tick.test.mjs` §10).
- ~~**Duplicate `case 'arena_bet'`**~~ **(fixed, v2.3.1176)**: the dead
  shadowing case was removed and the relay is ONE explicitly-ignoring
  case (un-shadowing the old handler was reviewed and rejected as
  unsafe — see ARCHITECTURE-HANDOFF item L for the full story);
  `no-duplicate-case` guards the whole tree in eslint.
- **Dormant content systems**: disabled tile-10 dungeon entrance,
  zeroed collectibles, dormant quest content — owner decision needed
  before removing or reviving. (An earlier version of this list called
  `src/networking/wsClient.js` dead code — wrong: it IS the live
  Phase-5 connection module.)
- ~~**Grandfathered globals burn-down**~~ **(done, v2.3.1189)**: the
  eslint LEGACY DEBT register is empty; `no-undef` guards the whole
  tree at full strength.
- ~~**Client damage-number helper**~~ **(done, v2.3.1188)**:
  `pushDmgPopup()` in combatHelpers.js replaced ~420 hand-rolled
  `S.dmgNumbers.push({...})` literals tree-wide.
- ~~**Runtime perf: nothing actionable now.**~~ **Re-measured 2026-07-26
  (v2.3.1465 + v2.3.1575) — the CPU half is CLOSED, the bandwidth half is SHIPPED.**
  The monster-AI nearest-player scan was the suspected risk; it is not one.
  `server/test/load-tick.mjs` at **120 players** (double the 60-player cap),
  175 real monsters, everyone moving and attacking: **~1.1 ms of the 22 ms
  tick budget, 0% of ticks over**. The spatial-grid idea is retired — do not
  build it; the v2.3.1183 slim-record pass plus dirty tracking already won.
  What the CPU harness could NOT see was the wire: `fakeWs.send()` only
  counts calls, so nobody had measured bytes. Doing so found the real
  ceiling — **~85% of tick egress was data the receiving client discards**
  (other zones' monsters and peers), costing 204 KB/s even for a player
  alone in a zone. Fixed in v2.3.1575 by zone-scoping the broadcast
  (`docs/specs/interest-management.md`): per-client egress **204 → 32 KB/s**,
  room egress at the cap **24.5 → 4.0 MB/s**, for ~15% more tick CPU.
  Lesson for the next perf pass: measure bytes AND cycles — this repo's
  harness measured only cycles for a year, and the answer was in the bytes.

## P6 — Server hot path, re-measured 2026-09-07 (v2.3.2335) — NOT YET SHIPPED

A second in-process pass on the real GameRoom (mocked DO storage, virtual
clock advancing 22 ms/tick so the 10 s save coalescer actually elapses;
60 players / 175 mummies, moves at ~30 Hz, swings at the real 600 ms
cadence, once spread over 7 zones and once all in one zone). CPU stays
closed: **0.56 ms avg / 1.20 ms p95 / 4.3 ms max per tick**, every
post-v2.3.1465 subsystem (fire trail, telegraph, burrow, burst,
spawn-scale, threats, dungeons, parties, trades2) ≤ 0.01 ms/tick. What
the pass DID find is on the wire and in storage, and it is deliberately
held out of the client-only PR that recorded it (a worker deploy is a
live-player disconnect; the owner prefers server merges at quiet hours).
Ship these as ONE server-only PR, each with its suite extended:

1. **Kill-path save is ~10× the regen storage floor** —
   `server/src/combat.js` (`this._saveRpg(rid, recipPs)` in the kill
   resolution, near the `_gemRawOnKill` call). Every kill is a full
   `_saveRpg` (a `storage.put` of the whole blob) per recipient, so a
   party farming at cadence writes an order of magnitude more than the
   regen tick's coalesced saves. The pattern to copy is the v2.3.1619b
   pool coalescer in `persistence.js` (`_saveRpgPools` /
   `_saveRpgVitals`): a SHORT window (≈2 s, not the regen 10 s — a kill
   carries loot/XP/coins, and a DO restart inside the window loses them),
   with the vitals coalescer's "near death → persist now" escape hatch
   kept for the same reason. Pin it in `test/combat-lifecycle` by
   counting `put` calls per N kills.
2. **Room-wide events are ~34% of tick egress** — `server/src/tick.js`
   `buildFor(zone, pv, muted)`: the `events` buffer is the room's, so a
   recipient in `frost` receives every `monster_hit` / loot / fx event
   from `ember`. v2.3.1575 zone-scoped monsters and peers but not
   events. Filter by `payload.zone` ONLY for event types that carry a
   zone (combat fx, loot, monster events); anything without one (world
   chat, party vitals, trade/duel invites, system notices) MUST stay
   room-wide — those are the cross-zone features. Pin it in
   `test/tick.test.mjs` next to the §10 overflow test with a byte count
   per recipient, the way v2.3.1575 was measured (bytes, not calls — the
   whole lesson of P5).
3. **Same-zone peer fan-out is O(n²) in BYTES in the crowd case** —
   `server/src/tick.js` `buildFor`: serialisation is already shared per
   (zone, protocolVersion) group, so CPU is flat, but every one of N
   recipients in a zone receives all N dirty peer records — 60 players
   in one zone is 3,600 peer records per tick at 45 Hz, and it is the one
   term that scales with the SQUARE of the crowd (the spread case above
   never shows it). The mitigation is a per-frame peer budget: each tick
   send the nearest K peers' deltas in full and round-robin the rest
   (positions are dead-reckoned client-side already, so a peer updated
   every 2nd–3rd tick at distance is not visible). Pin it with a bytes-
   per-recipient assertion at 60-in-one-zone in `test/tick.test.mjs`.
4. **`_tickParties` runs outside the v2.3.1562 `guard`** —
   `server/src/tick.js`, the bare `this._tickParties(Date.now())` between
   `guard('trades2', …)` and the regen block. Every other subsystem is
   wrapped so a throw is counted and logged once instead of aborting the
   tick; parties is the one that is not. One-line fix:
   `guard('parties', () => this._tickParties(Date.now()))`. Trivial, but
   it is the difference between "a party bug logs" and "a party bug
   freezes the room".
5. **`_economySnapshot` lists every rpg blob unbounded** —
   `server/src/liveops.js`: `storage.list({ prefix: 'rpg:' })` with no
   `limit`, walked into an array and sorted, on the daily metrics writer
   AND the admin `/economy` endpoint. At today's population it is fine;
   at a few thousand accounts it is a multi-MB read on the DO input gate
   (rule 9). Paginate with `limit` + `startAfter`, and keep only the
   top-N by coins as you go instead of materialising every player.

Not in this list because they were checked and are healthy: no `await`
in the tick body, per-tick allocation ~5N+40 short-lived objects with
nothing retained, monster AI per-zone (≤24 monsters × players-in-zone),
`_dungeonZonePlayers` ≤ 8 instances × N.
