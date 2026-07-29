# Wire Protocol — client ↔ server messages (BroTown)

Written 2026-06-12 at **v2.3.765**, derived from source, not from older docs.
Line numbers are anchors as of that version — they will drift; the **case
labels and function names are the durable references**. When this doc and the
code disagree, trust the code and fix the doc.

## Sources of truth, in priority order

> **Updated v2.3.784 (REBUILD-PLAN Phases 4–5):** the client networking code
> moved out of BroTown.jsx. The connection lifecycle (room resolution, join,
> the main message switch, reconnect/resume-resync, channelShim) now lives in
> `src/networking/wsClient.js` (`setupWebSocket`), and the per-event
> dispatcher (`_processGameEvent` → `processGameEvent`) in
> `src/networking/gameEvents.js`. Both were moved verbatim, so every handler
> description below still applies — only the file (and therefore the line
> anchors) changed. BroTown.jsx keeps a thin useEffect wiring.

1. **Client handlers:** `src/networking/wsClient.js` (connection lifecycle +
   main message switch) and `src/networking/gameEvents.js` (the event
   dispatcher).
2. **Server:** `server/src/index.js` — incoming-message switch in
   `GameRoom.webSocketMessage` (~3418–4018) and the `PRIVILEGED_EVENTS`
   deny-list (~line 91).
3. **v1/v2 delta semantics:** `server/test/protocol-v2.test.mjs` and the
   "Wire protocol" section of `CLAUDE.md`.

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
- **Session identity & supersede (verified v2.3.780):** the join `id` is
  minted **randomly per page load** (`myId` in BroTown's stateRef init, ~line
  223) — it is NOT the passphrase id (`getBtPlayerId` is used only for the
  separate RPC sync) and NOT derived from name or device. The server's only
  multi-socket rule is in the `join` case (server ~3455): any *other* socket
  with the **same `msg.id`** is evicted with close reason
  `'superseded by reconnect'`. Two windows therefore can never legitimately
  supersede each other (their random ids differ); every observed
  "kicked by the other window" was a **self-supersede**: a same-window
  reconnect joins with the same id, the server closes that window's own old
  socket, and (pre-v2.3.778) the old socket's still-attached `onclose`
  showed the takeover banner in the very window that initiated the
  reconnect. v2.3.778's resume-resync detaches the old socket's handlers
  before any deliberate rejoin, which closes that hole. The `device` nonce
  sent in join is currently **ignored by the server** (the v2.3.694
  anomaly tracker never landed server-side) — it must not be used for
  session eviction without revisiting the two-windows-one-iPhone case.
- **Reconnect:** exponential backoff starting at 1000 ms, ×1.5 per attempt,
  capped at 10 s; reset to 1000 ms on successful connect (~1875–1895, ~4290).
- **Resume resync (v2.3.778):** v2's tick deltas are never retransmitted, so
  a client frozen by iOS with a SURVIVING socket has a permanently stale
  world (invisible monsters that still deal damage). `_resumeRecover` in the
  inline client therefore tracks away-time (visibilitychange-to-hidden stamp
  + a 1 s heartbeat whose gap measures freezes that fire no events); if the
  socket is OPEN after >5 s away, the client detaches the old socket's
  handlers, closes it, and re-runs `connect()` — the fresh `join` returns a
  full `state_sync`, which is the resync. Handler detachment is what keeps
  the server's `superseded by reconnect` close on the old socket from
  false-triggering the takeover banner. Crash-log kind: `resume-resync`.
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
| `tick` | Batched per-tick frame: `players` (id → x/y/dir/facing/zone/vx/vy + live equip fields), `events` (array fed to `_processGameEvent`), `monsters`/`nodes` (zone → entity list; v2 = dirty entities only). **Zone-scoped since v2.3.1575** — see below | ~2048 |
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
| `track` | **Cosmetics/appearance only** (2 s cadence) — allowlisted, see below | ~3819 |
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
| `amulet_forge_request` | v2.3.1192 server amulet forge — `{op:'smelt'\|'craft'\|'gem', ...}` under `caps.amuletForge`; echo is `player_state` only (see `docs/specs/amulet-forge.md`) | amulet.js |
| `gem_cut_request` | v2.3.1198 server gem cutting — `{gem}` under `caps.gems`; answers private `gem_cut_result` + `player_state` echo (see `docs/specs/amulet-forge.md` "Gem income") | amulet.js |
| `quest_accept` / `quest_turn_in` | Quest lifecycle | ~4000 / ~4009 |

### `tick` is zone-scoped (v2.3.1575)

The tick no longer carries the whole room. Per receiving session:

- `monsters` / `nodes` — **only the receiver's own zone** (the client already
  read only `msg.monsters[myZone]`; everything else was discarded). Dungeon
  instances therefore stop leaking to the room.
- `players` — same-zone peers every tick; out-of-zone peers on a **1 Hz
  presence roster** (all players, dirty or not). The roster is load-bearing:
  the client's ghost-sweep deletes any peer silent for 10 s and counts the
  survivors for "N online".
- `events` — **unchanged, room-wide.** They are 1% of egress and mix zone-local
  combat with social relays; do not scope them.

The v1/v2 split is unchanged *within* a zone. No caps flag — nothing new is
claimed, so it is deploy-order safe both ways. Full detail and the measurements:
`docs/specs/interest-management.md`.

### `track` is cosmetics-only (v2.3.1465)

`track` carries appearance and display values, nothing authoritative. The
handler copies **only** the keys in `TRACK_COSMETIC_KEYS`
(`server/src/index.js`, beside `PRIVILEGED_EVENTS`) into `session.data`, the
player state, and the `player_update` peer relay. An unknown key is dropped, so
a new client field must be added to that Set deliberately — the deny-by-default
posture of rule 13, applied to the c→s direction.

Two properties make this safe and worth preserving:

- The legit payload's key names are deliberately **disjoint** from the
  authoritative namespace: `rpgLv`/`rpgHp`/`rpgMaxHp` (not `level`/`hp`/`maxHp`),
  `dir` (not `d`), and the stat block nested under `rpgData` so it can never
  reach `ps.power`. Keep new display fields disjoint the same way.
- `x`/`y` are in the allowlist but in `TRACK_STATE_EXCLUDED`: relayed to peers
  as a visual hint, **never** merged into player state. Position belongs to
  `move` alone, behind the 500 px/s anti-teleport cap.

Before v2.3.1465 the handler `Object.assign`-ed the raw blob into player state:
one crafted `track` forged coins/power/level, minted a weapon past
`_sanitizeWeapon`'s ceiling, and teleported the sender — all persisted by the
next `_saveRpg`. `reportToLeaderboard` also now takes rank from the server's
`ps.level`, not the client's `rpgLv`.

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
| `trade_offer` / `trade_accept` / `trade_reject` | Trading handshake — **since v2.3.1119 the server INTERCEPTS this relay and settles the trade itself** (see Settlement layer below); forged/replayed accepts are dropped, honored accepts are relayed with `settled: true` | ~3841–3876 |
| `duel_request` / `duel_accept` / `duel_decline` / `duel_wager_request` | Duel handshake — **since v2.3.1121 intercepted by the server duel machine** (wager escrow, server-resolved outcomes); accepts relayed with `settled: true` + authoritative `wager` | ~4188–4262 |
| `pvp_confirmed` / `pvp_threat` / `threat_response` | PvP consent flow (threat handshake still relay-observed — the red-skull machine is deferred) | ~4067 / ~4225 / ~4243 |
| `clan_war_declare` / `clan_war_kill` / `clan_war_end` | Clan war state relay | ~3745–3795 |
| `arena_bet` | Arena betting relay | ~3737 (see Quirks) |

## Settlement layer (v2.3.1116+ — heavy-systems architecture)

Added after the sections above were written; full detail lives in
`docs/specs/*.md` and the conventions in `docs/ARCHITECTURE-HANDOFF.md`.
Summary of the wire-visible changes:

**Join / identity (identity.md):**
- `join` gains `phrase` (the silent passphrase for `bp_` ids; absent for
  legacy/guest ids). Rejected auth → server sends `join_rejected
  {reason:'auth'}` then closes with code 4003; the client mints a fresh
  identity once and reconnects.
- `state_sync` gains `caps` (e.g. `{trade: true, questTrack: true}`) —
  the server's capability advertisement. Clients store `S._serverCaps`
  and run legacy client-side credit paths ONLY when the server hasn't
  claimed the job. HTTP responses use `settled: true` for the same
  purpose. This is the deploy-order safety mechanism; preserve it.
- v2.3.1178 (http-auth.md): `join` gains an optional `httpAuth: true`
  declaration and `state_sync` gains `httpToken` (private per-session
  token, plus `caps.httpAuth`). The client sends the token as the
  `x-bt-auth` header on the mutating economy endpoints (market
  place/cancel, arena join/leave); the server rejects requests whose
  `playerId` isn't backed by that player's own live-session token.
  Public `/api/leaderboard` is GET-only.

**New server→client messages (all in `PRIVILEGED_EVENTS`):**

| Type | Purpose | Spec |
|---|---|---|
| `join_rejected` | Join refusal: `reason:'auth'` (close 4003 — client mints a fresh id once) or `reason:'frozen'` (v2.3.1148 operator freeze, close 4004 — client shows a banner, stops reconnecting, must NOT mint) | identity.md / admin.md |
| `inbox_delivered` | Offline-mail delivery: `{entries: [{kind, payload, note, source}], queued}` | inbox-escrow.md |
| `duel_end` | Server duel resolution: `{winner, loser, wager, how: kill\|death\|forfeit\|timeout}` | duels.md |
| `gamble_result` | Server-rolled gamble outcome (private): `{won, wager, payout}` | gambling.md |
| `clan_state` / `clan_error` / `clan_war_kill` / `clan_war_end` | Clan registry echo + war referee | clans.md |
| `arena_match_start` / `arena_match_result` / `arena_tournament_complete` | Arena bracket (matches are duels) | arena.md |
| `dungeon_started` / `dungeon_wave` / `dungeon_boss` / `dungeon_complete` / `dungeon_error` | Instanced dungeons (private; `dungeon_start` c→s case) | dungeons.md |
| `dungeon_boss_ability` | v2.3.1194 boss ability telegraph/execute notice (private to players inside; client handler is display-only — damage rides `monster_attack`). v2.3.1199 adds kind `enrage` (soft anti-stall timer; `{stacks, pct}` extras) on the same type | dungeons.md |
| `arena_stake_placed` / `arena_stake_result` / `arena_stake_error` | Sponsorship stakes (private; `arena_sponsor` c→s case; legacy `arena_bet` relay stays cosmetic) | sponsorship.md |
| `guild_quest_result` / `guild_quest_error` | Guild-quest turn-ins (private; `guild_quest_turn_in` c→s case) | guild-quests.md |
| `threat_penalty` / `threat_expired` / `gear_locked` | Threat machine (pvp_threat/threat_response stay relays, intercepted + annotated with server countdown/settled/levy) | threats.md |
| `pet_capture_result` | Server-rolled pet capture (private; `pet_capture` c→s case; consumes a basic_trap) | pets.md |
| `harden_result` | §4.6c hardening roll (private; `harden_weapon` c→s case; forge mints now carry `quality`/`hardness`/`temper`) | hardening.md |
| `trade2_state` / `trade2_invite` | Two-sided trade window (private; `trade2_open/set/confirm/cancel` c→s cases; gift trade relay unchanged) | trading.md addendum |
| `party_state` / `party_invited` / `party_error` | Party roster echo + invite/error notices (private; `party_invite/accept/decline/leave/kick` c→s cases; roster re-echoed ~2s for cross-zone vitals) | party.md |

**Cadence + jackpot (v2.3.1149, caps.jackpot):** new c→s case
`jackpot_deposit {amount}` (multiple of 50 in [50,5000]); new s→c types
(both PRIVILEGED) `jackpot_state {pool, period, yourTickets, deposited?}`
(private, on join + after deposit) and `jackpot_result {winnerId,
winnerName, amount, period}` (broadcast on the lazy weekly draw). The
daily login reward reuses `inbox_delivered` — no new types. GamblePanel
deposits are caps-gated; the legacy local stub remains for old workers.

**Server-minted weapon drops (v2.3.1141, caps.weaponDrops):** no new
message types. The loot pile broadcast (`loot_drop`/`zone_loot`/
`state_sync.loot` via `_serializePile`) gains `hasWeapon`,
`weaponClaimed`, `weaponTier`, `weaponType`, `weaponName` — NEVER the
quality (that's the §4.6b.ii mystery: quality is pre-committed at mint
and revealed only in the picker's private `loot_credit`, which gains
`weapon` (full blob), `weaponStashed`, `weaponSoldFor`). The
`loot_claimed` fan-out gains `weaponClaimedNow`. Old clients ignore the
new fields and still receive the weapon via the `player_state` stash
echo; new clients keep the legacy client-mint fallback when
`caps.weaponDrops` is absent.

**Marketplace HTTP (worker routes `/api/market/*` to the GameRoom now;
the standalone Marketplace DO is retired from routing):**
- `POST /api/market/place` body gains `stashIndex` (sells escrow from the
  SERVER's stash copy; the `item` blob is ignored). All mutating
  responses carry `settled: true`.
- New `GET /api/market/history?category&subtype&tier` →
  `{history: [{p, ts}], avg, last}` (last 50 executions).
- All market calls carry `&room=` so escrow lands in the caller's room.

**Quest counters:** `player_state._questKills` is server-authored
(quests.md); client increment sites are gated on `caps.questTrack`.

**Pet loot vacuum (v2.3.1200, caps.petLoot):** no new message types.
The existing c→s `loot_pickup` gains an optional `viaPet: true` flag —
same handler, same claim flags, but the range gate widens to
`PETS.VACUUM_RANGE` (measured from the OWNER's server-known position;
the server tracks no pet position) and requires a server-known active
pet (new `loot_pickup_rejected` reason `no-pet`). The private
`loot_credit` echoes `viaPet` back for pet-side rendering + the
petLootCount quest tally. Client vacuum requests are gated on
`caps.petLoot`; absent it, the legacy self-credit vacuum stays (old
workers would out-of-range-reject the wide pickup).

## Known quirks (documented, deliberately not "fixed" here)

- ~~Duplicate `case 'arena_bet'` in `_processGameEvent`~~ — FIXED
  v2.3.1187: merged into one handler in `gameEvents.js` (the second,
  unreachable label was the spectator-bet UI feed — remote bets now
  reach `setArenaBets`); eslint `no-duplicate-case` guards recurrence.
- **`player_respawned` handled twice**: in the main switch (~2619,
  server→self confirm) and in `_processGameEvent` (~3721, peer visual).
  Intentional split, but easy to misread.
- **`player_attack`** appears both as an accepted server case (~3828) and a
  dispatcher case (~3985) — the server processes it and it is also relayed
  for remote swing rendering.
- **`src/networking/wsClient.js` is the LIVE client** since REBUILD-PLAN
  Phase 5 (v2.3.784) — the old "dead code, do not extend" warning
  referred to the pre-Phase-5 copy. An inline comment inside the file
  still carries the historical warning; fixes land in this file.
