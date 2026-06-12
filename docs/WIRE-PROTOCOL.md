# Wire Protocol — client ↔ server messages (BroTown)

Written 2026-06-12 at **v2.3.765**, derived from source, not from older docs.
Line numbers are anchors as of that version — they will drift; the **case
labels and function names are the durable references**. When this doc and the
code disagree, trust the code and fix the doc.

## Sources of truth, in priority order

1. **Client handlers:** the inline WebSocket client in `src/ui/BroTown.jsx`
   (the `useEffect` starting ~line 1845): the main message switch
   (~2048–2829) and the `_processGameEvent` dispatcher (~3033–4279).
2. **Server:** `server/src/index.js` — incoming-message switch in
   `GameRoom.webSocketMessage` (~3418–4018) and the `PRIVILEGED_EVENTS`
   deny-list (~line 91).
3. **v1/v2 delta semantics:** `server/test/protocol-v2.test.mjs` and the
   "Wire protocol" section of `CLAUDE.md`.

> **⚠ Do NOT use `src/networking/wsClient.js` as a reference.** It is a dead,
> pre-protocol-v2 copy from an abandoned extraction — `setupWebSocket` is
> never called anywhere. Only its `getTickTimes`/`getTickSizes` ring-buffer
> exports are live (imported by `src/rendering/systems/fpsOverlay.js`).
> Scheduled for removal in REBUILD-PLAN Phase 1.

## Transport and connection lifecycle

- **Endpoint:** `wss://brotown-server.hemibroscommunity.workers.dev`
  (overridable via `window.BROTOWN_WS_URL`). Server is a Cloudflare Worker
  with Durable Objects (`GameRoom` per room).
- **Room resolution** (BroTown.jsx ~1851+): a `?room=` URL param or
  `localStorage bt_room` wins (testing / friend rendezvous); otherwise
  `GET /api/lobby` returns the room to join (default `brotown-1`). Resolved
  once on initial connect, cached for reconnects.
- **Join** (~1900): first message after the socket opens —
  `{ type: 'join', id, name, device, protocolVersion: 2, data: {...} }`.
  `device` is a correlation nonce `{id, env}` for the server's multi-account
  anomaly tracker (v2.3.694; old workers ignore it). `data` carries spawn
  x/y/dir/zone plus the full appearance set (name, color, avatar, body
  colors, headwear/hair/facial-hair/skin/shirt + color variants, equipped
  armor pieces).
- **Reconnect:** exponential backoff starting at 1000 ms, ×1.5 per attempt,
  capped at 10 s; reset to 1000 ms on successful connect (~1875–1895, ~4290).
- **Heartbeat:** server sends `ping` (handler ~2813), client answers
  `{ type: 'pong' }` (server case ~3811) for RTT/liveness.
- **`S.channel` / channelShim** (~4302–4451): a Supabase-shaped send shim the
  rest of the client uses. Outbound input events are **batched in a 33 ms
  window** (`INPUT_BATCH_WINDOW`, matched to the server's 22 ms / 45 Hz tick)
  with move-overwrite semantics (only the latest `move` in a window is kept).
  Events in `PRIORITY_EVENTS` (~4302: `pvp_confirmed`, `stunned`,
  `duel_accept`, `duel_decline`, `duel_wager_request`, `pvp_threat`,
  `threat_response`, `trade_offer`, `trade_accept`, `trade_reject`,
  `clan_war_kill`, `clan_war_end`, `clan_war_declare`, `clan_invite`) bypass
  the batch window and flush immediately.

## Protocol versions (v1 / v2)

Both versions must keep working — this is the safety property that lets
client and server deploy in either order (see CLAUDE.md).

| Concern | v1 (no opt-in) | v2 (`protocolVersion: 2` in join) |
|---|---|---|
| `player_state` | always full snapshot | full on join, then **changed fields only**; no-change emits skipped entirely |
| `tick` monsters/nodes | every entity in each dirty zone | **only entities marked dirty** |
| Zone change | legacy trio: `zone_monsters` + `zone_nodes` + `zone_loot` | one merged `zone_state` (carries all three lists; empty lists for safe zones) |

The client keeps all v1 handlers as fallback so it works against any worker
version. Preserve this on both sides.

## Security model

The server's incoming-message switch has an explicit case per accepted
client→server type. **Anything else falls through to the default branch
(~server:4018) and is rebroadcast to every client in the room.** That default
is gated by `PRIVILEGED_EVENTS` (~server:91): any type the server emits
itself is refused from clients, otherwise a cheater could forge e.g.
`player_state { hp: 0 }`. `player_respawned` is *deliberately omitted* from
the deny-list — peers broadcast it as a visual corpse-clear signal; forgery
risk is cosmetic only (see the comment block at server:91 for the full
rationale). **New client→server events are denied by default** unless a case
is added deliberately.

## Server → client messages

Handlers live in the main WS switch unless marked `[dispatcher]`
(= `_processGameEvent`, which handles both batched `tick.events` and direct
sends). All of these are in `PRIVILEGED_EVENTS` unless noted.

| Type | Purpose / payload | Client handler (BroTown.jsx) |
|---|---|---|
| `tick` | Batched per-tick frame: `players` (id → x/y/dir/facing/zone/vx/vy + live equip fields), `events` (array fed to `_processGameEvent`), `monsters`/`nodes` (zone → entity list; v2 = dirty entities only) | ~2048 |
| `state_sync` | Full room snapshot on join: players, zone monsters, etc. | ~2223 |
| `zone_state` | v2 zone change: `{ zone, monsters, nodes, loot }` merged | ~2352 |
| `zone_monsters` / `zone_nodes` / `zone_loot` | v1 legacy zone-change trio (kept as fallback) | ~2732 / ~2727 / ~2347 |
| `player_state` | Authoritative pool/progression mirror (hp, coins, xp, inventory…); v2 sends field deltas | ~2421 |
| `player_died` | Server-confirmed own death | ~2567 |
| `player_respawned` | Respawn confirm (server→self) / corpse-clear visual (peer broadcast) | ~2619 and [dispatcher] ~3721 (see Quirks) |
| `loot_credit` / `harvest_credit` / `combat_credit` / `lifesteal_credit` | Server-authoritative reward credits (loot pickup, gathering, kill XP/level, melee lifesteal heal) | ~2362 / ~2643 / ~2677 / ~2372 |
| `loot_pickup_rejected` | Denied loot claim (anti-cheat / race) | ~2402 |
| `stat_allocated` | Confirms a `stat_allocate` request | ~2700 |
| `ability_rejected` | Server denied an `ability_use` | no dedicated client case in the main switch (privileged, reserved) |
| `player_join` / `player_leave` / `player_count` / `player_update` | Room presence + remote appearance changes | ~2737 / ~2781 / ~2789 / ~2794 |
| `ping` | Heartbeat; client replies `pong` | ~2813 |
| `loot_drop` / `loot_claimed` / `loot_despawn` | Ground-loot lifecycle fan-outs | [dispatcher] ~3035 / ~3047 / ~3070 |
| `monster_attack` | Monster attack windup/strike against a player | [dispatcher] ~3389 |
| `monster_hit` | **The truth** for damage dealt to a monster (client popups are local prediction) | [dispatcher] ~3187 |
| `monster_kill` | Server-confirmed kill (drives loot/XP via credits) | [dispatcher] ~3222 |
| `monster_transform` | Variant transform (e.g. remnant skull) | [dispatcher] ~3163 |
| `pvp_hit` | Server-resolved PvP damage | [dispatcher] ~3890 |

## Client → server messages (accepted cases)

Server cases in `GameRoom.webSocketMessage`, `server/src/index.js`
~3418–4017. Everything not listed here hits the default rebroadcast branch.

| Type | Purpose | Server case |
|---|---|---|
| `join` | Session start; negotiates `protocolVersion` | ~3418 |
| `move` | Position/zone update (batched client-side, 33 ms) | ~3672 |
| `pong` | Heartbeat reply | ~3811 |
| `track` | Telemetry/analytics event | ~3819 |
| `player_attack` | Attack swing (also relayed to peers — see Quirks) | ~3828 |
| `monster_damage` | Damage claim against a monster (server validates; truth returns as `monster_hit`) | ~3834 |
| `extraction_start` | Begin gather/extraction channel | ~3841 |
| `node_strike` | Hit a gather node | ~3852 |
| `loot_pickup` | Claim ground loot (server answers `loot_credit` or `loot_pickup_rejected`) | ~3863 |
| `stat_allocate` | Spend a stat point (answers `stat_allocated`) | ~3872 |
| `cook_request` / `cook_recipe` | Cooking minigame start / result | ~3881 / ~3926 |
| `stats_update` | Push derived stats (maxHp/def/regen) so worker damage math stays in sync | ~3891 |
| `ability_use` | Special moves — `payload.type` ∈ `dodge`, `lunge`, `retreat`, `swipe` (+ tier); server may answer `ability_rejected` | ~3900 |
| `eat_request` | Consume food (server-authoritative heal) | ~3909 |
| `shop_purchase` | Buy from vendor | ~3918 |
| `equip_request` / `unequip_request` | Equip/unequip gear | ~3935 / ~3953 |
| `sell_weapon` | Sell to vendor | ~3944 |
| `build_point_earned` | T1 build-point tick for the server-side BP level gate (v2.3.154, `docs/specs/build-points-gate-server.md`) | ~3961 |
| `set_active_slot` | Switch weapon slot (melee/ranged/staff) | ~3971 |
| `forge_weapon` | Blacksmithing forge | ~3991 |
| `quest_accept` / `quest_turn_in` | Quest lifecycle | ~4000 / ~4009 |

## Peer-relayed broadcast events (client ↔ client)

Sent via `channelShim.send({...})`, hit the server's default branch, pass the
`PRIVILEGED_EVENTS` check, and are rebroadcast to the room. Handled in
`_processGameEvent`. These are **cosmetic/social by design** — anything with
gameplay authority must instead get a real server case.

| Event | Purpose | Dispatcher case |
|---|---|---|
| `chat` / `emote` | Chat lines and emotes | ~3091 / ~3122 |
| `player_swing` / `player_projectile` / `player_shield` | Remote attack/projectile/shield visuals | ~3134 / ~3142 / ~3155 |
| `player_hurt_by_monster` / `monster_dmg_at` / `player_died_to_monster` | Peer combat-feedback visuals (drive the peer damage-number smoothing queue) | ~3646 / ~3666 / ~3683 |
| `player_respawned` | Peer corpse-clear (deliberately not privileged — see Security model) | ~3721 |
| `stunned` | Stun visual/state relay | ~3836 |
| `trade_offer` / `trade_accept` / `trade_reject` | Player trading handshake | ~3841–3876 |
| `duel_request` / `duel_accept` / `duel_decline` / `duel_wager_request` | Duel handshake | ~4188–4262 |
| `pvp_confirmed` / `pvp_threat` / `threat_response` | PvP consent flow | ~4067 / ~4225 / ~4243 |
| `clan_war_declare` / `clan_war_kill` / `clan_war_end` | Clan war state relay | ~3745–3795 |
| `arena_bet` | Arena betting relay | ~3737 (see Quirks) |

## Known quirks (documented, deliberately not "fixed" here)

- **Duplicate `case 'arena_bet'`** in `_processGameEvent` (~3737 and ~3827):
  the second is unreachable dead code.
- **`player_respawned` handled twice**: in the main switch (~2619,
  server→self confirm) and in `_processGameEvent` (~3721, peer visual).
  Intentional split, but easy to misread.
- **`player_attack`** appears both as an accepted server case (~3828) and a
  dispatcher case (~3985) — the server processes it and it is also relayed
  for remote swing rendering.
- **`src/networking/wsClient.js` drift**: contains an obsolete room-walking
  scheme and none of the v2 handlers. Dead code; do not extend it
  (REBUILD-PLAN Phase 1 deletes it, Phase 5 rebuilds it from the live
  inline client).
