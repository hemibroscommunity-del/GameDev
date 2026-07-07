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
- **Runtime perf: nothing actionable now.** The monster-AI
  nearest-player scan (`_tickMonsters`, still in index.js) is
  O(monsters × players) per tick but only in player-occupied zones;
  revisit with a spatial grid only if rooms approach the 60-player cap.
