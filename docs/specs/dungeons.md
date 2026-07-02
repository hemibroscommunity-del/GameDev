# Instanced Dungeons (server-authoritative) — v2.3.1127

The Dungeon Workshop's custom runs, moved server-side. Before this the
entire dungeon was client theatre: the client built the arena, spawned
monsters from a config it chose (`bossMultiplier`, `waves`,
`monsterLevel` were all attacker-editable), scored its own kills, and
self-credited the completion gold/XP. Now the worker validates the
config, owns the waves, and settles the rewards.

Server code: `server/src/dungeon.js` (mixin, `dungeonMethods`).
Tests: `server/test/dungeon.test.mjs`.

## Design: folded instances

An instance is a **zone id the ZONES table doesn't know**:
`dungeon:<8-char-id>`. That single trick reuses the whole combat stack
with one core change:

- `_activeZones()` ticks any zone players stand in → instance monsters
  get the full server AI (aggro / chase / attack / wander; all
  zone-config-independent, verified).
- The move handler's zone-change branch sends whatever
  `_ensureZoneMonsters` finds. `dungeon_start` pre-populates
  `this.monsters[zone]` **before** replying, so when the client zones
  in, wave 1 rides the normal `zone_state` and the client flips to
  server-authoritative combat (`S._serverMonsters`) automatically.
- `monster_damage` → `_resolveMonsterKill` pays kill XP/gold, drops
  loot piles, credits kill quests, and applies GDD §7 contribution
  sharing — zero new combat code.
- Zone ids absent from ZONES fail closed for PvP and are skipped by
  every zone-config branch (all guarded — audited).
- The one core change: `_resolveMonsterKill` stamps
  `respawnAt = m.noRespawn ? 0 : now + RESPAWN_TIME`, so cleared waves
  stay cleared (the respawn check requires `respawnAt > 0`).

**Membership = zone presence.** Whoever stands in the instance fights;
whoever is inside at the final kill gets paid. Parties need no roster.

**State is memory-only** (`this._dungeons` Map). Deliberate: no debited
value is at risk (unlike duel/market escrow), so a deploy or DO restart
mid-run just evaporates the run — the client's exit tile (bottom of the
arena) always works and returns the player to their previous zone.

## Wire surface

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `dungeon_start` | `{config}` | Explicit switch case. Config fully clamped server-side (below). |
| s→c | `dungeon_started` | `{zone, cfg, wave:1}` | Private. `cfg` is the SANITIZED config echo. Client builds the arena and zone-changes into `zone`. |
| s→c | `dungeon_wave` | `{zone, wave, total}` | Private to players inside. A full `zone_state` re-push precedes it (per-tick deltas only update entities the client already knows). |
| s→c | `dungeon_boss` | `{zone}` | Private to players inside. Boss spawned. |
| s→c | `dungeon_complete` | `{zone, gold, xp, boss}` | Private to each paid player. Coins already settled (player_state echo is authoritative); event drives the win UI + 3s return home. |
| s→c | `dungeon_error` | `{code, message}` | Codes: `not-now`, `already-running`, `room-full`. |

All five server-emitted types are in `PRIVILEGED_EVENTS`.
Capability flag: `state_sync.caps.dungeon` — the client's
`launchDungeon` gates on it and falls back to the legacy local spawn
against old workers (deploy-order safety; delete the fallback once the
worker is stable per the handoff doc's Rule Zero note).

## Server clamps (`_dungeonSanitizeConfig`)

| Field | Clamp |
|---|---|
| `waves` | int 1..10 |
| `monsterLevel` | int 1..min(**owner's level**, 100) — the GDD §36 rule the client UI enforces and a forged config bypassed |
| `width` / `height` | int 20..40 / 15..35 (tiles) |
| `monsters` | ≤4 groups; per group `count` 1..8, archetype must exist in `ARCHETYPES` (else fodder), element whitelisted (else null) |
| `hasBoss` | boolean |
| `bossArchetype` | must exist in `ARCHETYPES` (else fodder) |
| `bossMultiplier` | int 2..8 |
| `element` | one of flame/venom/frost/storm/stone/wind/water, else null |
| `name` / `terrain` | strings, ≤24 chars |

Also: one active instance per owner, ≤8 instances room-wide, dying/dead
players rejected. Spawned monsters use the exact `_spawnZoneMonsters`
stat pipeline (same `_monsterStat` curves × archetype multipliers) with
+0..2 level jitter (legacy client parity), so dungeon monsters are
worth the same XP/gold as world monsters of their level.

## Waves, boss, completion (`_tickDungeons`)

- All-dead + players present → next wave (spawn, `zone_state` re-push,
  `dungeon_wave`).
- Final wave dead + `hasBoss` → boss: level `monsterLevel+5`,
  `hp × bossMultiplier × partyScale`, `dmg × 1.5`, party scale
  1.0/1.6/2.2/3.0 by players present (GDD §55.7).
- Boss dead (or final wave dead, no boss) → completion. Rewards are the
  legacy client formulas verbatim (value-neutral migration):
  - boss route: gold `30·waves + 2·monsterLevel`, xp `80·waves + 5·monsterLevel`
  - no boss: gold `20·waves`, xp `50·waves`
  Paid by single mutation on live ps (the gamble pattern — recipients
  are online by definition; no escrow, no opId, no crash window).
- Sweeps: instance empty for 60s → deleted (covers owner-never-entered,
  walked out, all died — respawn moves `ps.z` to town). Completed
  instances linger ≤15s after the last player leaves (hard cap 5 min).
  Cleanup deletes `monsters/loot/nodes[zone]` + dirty-set entries —
  **loot piles die with the instance**.

## Client integration

- `DungeonCreatorPanel.jsx` `launchDungeon`: caps-gated send of
  `dungeon_start`; legacy local spawn kept as fallback.
- `gameEvents.js`: `dungeon_started` builds the same local arena map
  the legacy path built, registers a **synthetic `ZONES[zone]` entry**
  (`{safe:false, spawns:[], _instance:true}` — keeps every
  `ZONES[S.currentZone]` deref alive while inside; `spawns:[]` keeps
  `spawnMonstersForZone` and the Encyclopedia counters inert), sets
  `S.currentZone = zone` + `S._serverDungeon = zone`, and sends an
  immediate move so `zone_state` arrives at once. `dungeon_wave/boss/
  complete/error` drive the legacy visuals; complete runs the 3s
  farm_home return.
- `dungeonWaves.js` `updateDungeonWaves`: early-return when
  `S._serverDungeon` (server owns progression).
- Exit paths all delete the synthetic entry + clear `_serverDungeon`:
  tile-9 abandon (`zoneTransitions.js` — restores the pre-dungeon zone
  BEFORE the legacy regen reads `S.currentZone`), death respawn
  (`wsClient.js` `player_respawned`), and the completion return.

## Attach points for successors

- **Boss abilities**: server bosses are stat-scaled chase-and-swing.
  The client's slam/charge/summon/sweep AI (`dungeonWaves.js` legacy
  path, `_bossAbilities`) is dead under server mode — porting it means
  teaching the server monster tick a per-monster ability script
  (keep it in `dungeon.js`; don't fork `_tickMonsters`).
- **Standard (depth) dungeons**: still dormant client-side (entry
  disabled since v2.3.54). If revived, reuse this instance machinery —
  config from `DEPTH_CONFIG` instead of the Workshop.
- **Run persistence**: if runs must survive deploys, persist
  `{id, ownerId, cfg, wave}` under a `dungeon_run:` storage key and
  lazy-rebuild the wave on first activity (rule: never add fields to
  the rpg blob).
- **Entry fees / better loot**: debit via `_escrowDebitGold` at start
  with an `oplog` refund sweep (the arena-entry pattern) before making
  rewards richer than the legacy formulas.
