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

- **Endpoint:** `wss://api.brotown.net` (v2.3.2446; the worker's original `wss://brotown-server.hemibroscommunity.workers.dev` address still answers, but `workers.dev` is on common DNS block lists -- see `server/wrangler.toml`)
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

**v2.3.3304: and the default branch is an ALLOWLIST.** Only the types an
honest phone relays (`RELAY.TYPES`, server/src/relay.js) are rebroadcast; any
other type is dropped, silently, as a privileged one always was, and costs no
relay budget. Every relay goes out REBUILT: `{type, from, payload}` and nothing
else, the payload a copy whose sender fields are the worker's -- `id` always,
and `from` / `playerId` (the sender's id) and `fromName` / `playerName` /
`name` (the worker's name for them) wherever the phone put one. The phone
reads the worker's `from` before the payload's `id` (wsClient.js). Before, a
script could relay "Bob died" or "Bob invites you to his clan" in Bob's name.
A new relay goes in `RELAY.TYPES` or it reaches no one: `relay.test.mjs` holds
the list to every broadcast in src/. Kill switch `relaylist: false` (any
unprivileged type relays again, still rebuilt). Spec: docs/specs/relay.md.

## Server → client messages

Handlers live in the main WS switch unless marked `[dispatcher]`
(= `_processGameEvent`, which handles both batched `tick.events` and direct
sends). All of these are in `PRIVILEGED_EVENTS` unless noted.

| Type | Purpose / payload | Client handler (BroTown.jsx) |
|---|---|---|
| `tick` | Batched per-tick frame: `players` (id → x/y/dir/facing/zone/vx/vy + live equip fields; v2.3.3015: `spr: 1` while that player sprints -- a step the worker paid for in the last 600 ms, absent when walking, and deliberately not `sp`, which in a player's data is the shirt pattern; docs/specs/sprint.md "Seen and heard"; v2.3.3123: `pw`, the pet out with that player as the worker keeps it, `'kind.stage.gold.size.lv'`, absent with none -- deliberately not `pt`, which in a player's data is the pants, nor `pet`, the old client-relayed one; docs/specs/trapping.md "Pets that matter"; v2.3.3142: `eqg`, the grades of the torso and greaves that player wears as the worker counts them, two letters `n`/`r`/`e`/`g` (`'rn'`, `'ee'`; godly only on a piece the worker minted, else `e`, combat.js's rule), absent in plain armour; docs/specs/armor-grade-look.md), `events` (array fed to `_processGameEvent`), `monsters`/`nodes` (zone → entity list; v2 = dirty entities only). **Zone-scoped since v2.3.1575** — see below | ~2048 |
| `move_path` | v2.3.3732: `{on, all}`, sent to every phone when the live flag `movepath` (the kill switch) or `pathall` is set or cleared: `on` is caps.movepath (the worker glides), `all` caps.pathall (every phone on the path). Privileged; the client updates its caps (server/src/movepath.js, docs/specs/move-path.md) | ~40 |
| `client_off` | v2.3.3755: `{off}`, the memory savers turned off for every phone as a comma list (`''` with none), sent to every phone when a live flag `off_<name>` is set or cleared; `caps.clientoff` carries the same at join. Privileged; the client follows it (server/src/clientoff.js, src/game/clientOff.js, docs/specs/client-off.md) | ~40 |
| `state_sync` | Full room snapshot on join: players, zone monsters, etc. v2.3.3244: each other player as the public keys only (`PEER_PUBLIC_KEYS`, index.js: position, name, look, gear on show) -- see "What the others are told about you" below | ~2223 |
| `zone_state` | v2 zone change: `{ zone, monsters, nodes, loot }` merged. **v2.3.1983: also sent MID-SESSION**, unprompted, when population-scaled spawns change a zone's roster — the client already replaces its lists wholesale on it, and a per-entity `tick` delta cannot introduce an entity, so this resend is how a new monster becomes real on any client (`docs/specs/spawn-scaling.md`) | ~2352 |
| `zone_monsters` / `zone_nodes` / `zone_loot` | v1 legacy zone-change trio (kept as fallback). v2.3.1983: `zone_monsters` + `zone_nodes` are the v1 half of the mid-session roster push above (no `zone_loot` — piles are unaffected) | ~2732 / ~2727 / ~2347 |
| `player_state` | Authoritative pool/progression mirror (hp, coins, xp, inventory…); v2 sends field deltas | ~2421 |
| `player_died` | Server-confirmed own death | ~2567 |
| `player_respawned` | Respawn confirm (server→self) / corpse-clear visual (peer broadcast) | ~2619 and [dispatcher] ~3721 (see Quirks) |
| `loot_credit` / `harvest_credit` / `combat_credit` / `lifesteal_credit` | Server-authoritative reward credits (loot pickup, gathering, kill XP/level, melee lifesteal heal; v2.3.3264: a player kill's lifesteal names `victimId` where a monster's names `monsterId`) | ~2362 / ~2643 / ~2677 / ~2372 |
| `loot_pickup_rejected` | Denied loot claim (anti-cheat / race) | ~2402 |
| `gather_hits` | v2.3.2956 the worker's HITS for the harvest in flight, private to the harvester: `{seq, nodeId, zone, hp, hits:[...]}` — each hit is 1..the skill level, the last is the one that empties `hp`; or `{seq, nodeId, zone, off: true}` when the `gatherhits` kill switch is thrown. For a COOK it names the fish instead of a node: `{seq, fishKey, hp, hits}` / `{seq, fishKey, off: true}` (the fish's tier sets `hp`, the cooking level rolls the hits). Sent only in answer to an `extraction_start` that carried `hitSeq`, which is echoed as `seq` so a plan for an abandoned attempt is dropped. Privileged: a forged plan would paint numbers the worker never rolled and open a gesture window early. See `docs/specs/gathering-hits.md` | gathering.js |
| `stat_allocated` | Confirms a `stat_allocate` request | ~2700 |
| `ability_rejected` | Server denied an `ability_use` / `ability` / `element_burst`. v2.3.1733 gave it a client handler at last; v2.3.1734 adds `reason` (`level` / `no_weapon` / `no_element` / `mana` / `cooldown`) so a refusal can say WHY — an old client ignores the extra field | abilities.js / burst.js |
| `element_nova` | v2.3.1734 Element Burst's ring — `{id, zone, x, y, element, status, r, targets[]}`. Display-only (every point of damage rides `monster_hit`), but privileged: a forged one would paint fake elemental statuses on every monster on every screen in the zone. The client applies the status to its LOCAL monster objects, which is where the ambient particles and the status pips come from — the server owns statuses and does not otherwise sync them | burst.js |
| `player_join` / `player_leave` / `player_count` / `player_update` | Room presence + remote appearance changes | ~2737 / ~2781 / ~2789 / ~2794 |
| `ping` | Heartbeat; client replies `pong` | ~2813 |
| `loot_drop` / `loot_claimed` / `loot_despawn` | Ground-loot lifecycle fan-outs | [dispatcher] ~3035 / ~3047 / ~3070 |
| `monster_attack` | Monster attack windup/strike against a player. v2.3.2235: a TELEGRAPH hit (the boss kits, the snowman throw, the slime burst) carries `ability` = the kit's kind. It means "the worker resolved this one here", and the client uses it to skip three proximity filters that exist for melee ghost hits and are the wrong question for a blast — resolved against where the player stood at detonation, by a monster in the act of dying, with running away being the correct response. Display-only; nothing server-side reads it back. An older worker omits it and the client filters exactly as before (rule 19). v2.3.2996: a hit by a frost/flame/wind/flora monster may carry `elem` (the damage type, the icon on the number), and when it landed, `st` (`chill`/`burn`/`gust`/`stuck`), `stMs` and, for a gust, `kb` `[dx, dy]` — the client slows, burns, shoves or holds itself ONLY on these; a burn's ticks are further `monster_attack`s stamped `ability: 'burn'`, `elem: 'flame'`, and the fire trail's ticks now say `elem: 'flame'` too. All additive, no caps flag (docs/specs/monster-statuses.md). v2.3.3014: and stone/storm/water/venom monsters' hits: `st` `daze`/`shock`/`soak`/`poison` (`stMs` as before); a storm hit that arced carries `arcs` (how many players it reached), and each arc is its own `monster_attack` to that player stamped `ability: 'shock'`, `elem: 'storm'`, `attackerX/Y` = where the struck player stood; a poison's ticks are `ability: 'poison'`, `elem: 'venom'`. v2.3.3123: `wd`, the percent the pet out with that player took off the status (its land ward, docs/specs/trapping.md "Pets that matter") | [dispatcher] ~3389 |
| `monster_hit` | **The truth** for damage dealt to a monster (client popups are local prediction). v2.3.2232: carries `slot` (`melee`/`ranged`/`staff`) — the slot the room RESOLVED, not the client's claim — so the damage number can be marked with the weapon that dealt it, for peer hits as well as your own. Display-only; nothing server-side reads it back. An older worker omits it and the client falls back to the slot it is holding (own hits) or to no mark at all (peers). **v2.3.2481: `rawDmg`** — the roll BEFORE the overkill clamp, sent only on the hits where it differs from `dmg` (i.e. the killing blow). `dmg` stays the credited amount and is what the HP bar, the §7 contribution share and trained XP all read; `rawDmg` exists so the popup can print the hit the player actually landed instead of the sliver of HP that was left. Display-only, additive, and an older client that ignores it prints `dmg` exactly as before. **v2.3.2481: `splash: true`** — this hit is the 50% splash from a basic staff bolt that landed on a NEIGHBOUR (see `monster_damage`); it also carries `slot: 'staff'`. Display-only: it tells the client to paint the flash/debris the splashed monster has no local hit site for, and to tint the number | [dispatcher] ~3187 |
| `monster_kill` | Server-confirmed kill (drives loot/XP via credits) | [dispatcher] ~3222 |
| `monster_transform` | Variant transform (e.g. remnant skull) | [dispatcher] ~3163 |
| `pvp_hit` | Server-resolved PvP damage. v2.3.3264 (the one formula's `slot`, `staminaDrain`, `parried`, `hp`/`maxHp` aside): what a player's blow did beyond its number, in `monster_attack`'s own words -- `elem`, `st` (`burn`/`stuck`/`daze`/`soak`/`shock`, and three a monster never sends: `slow` with `mult`, `fracture` with `stacks`, `thorn`), `stMs`, `kb` `[dx, dy]` (a bash's shove or a whirlwind's pull -- never an ordinary hit's: the target's own page carries it out, the worker granted the room), `wd`; and `ability` naming a blow that was not a plain hit (`bash`/`sworddash`/`whirl`/`lunge`/`burst`/`splash`/`blast`/`collision` with `collision` the id, or a tick: `burn`/`root`/`thorn`). Additive; an older page draws it as a plain hit (server/src/pvpextras.js, docs/specs/one-formula.md "The extras") | [dispatcher] ~3890 |
| `chat_mute_list` | v2.3.1981 the SERVER's copy of who you have muted — `{list:[{id,name,at}], settled:true, error?}`, on join and after every mutation. Privileged: a forged one could paint (or silently empty) a mute list in the UI while the worker enforced something else | [dispatcher] chatmod.js |
| `chat_report_ack` | v2.3.1981 answer to one `chat_report` — `{ok, id?, lines?, error?}`. A forged one would tell a harassed player their report was filed when nothing was written | [dispatcher] chatmod.js |

## Client → server messages (accepted cases)

Server cases in `GameRoom.webSocketMessage`, `server/src/index.js`
~3418–4017. Everything not listed here hits the default rebroadcast branch.

| Type | Purpose | Server case |
|---|---|---|
| `join` | Session start; negotiates `protocolVersion` | ~3418 |
| `move` | Position/zone update (batched client-side, 33 ms). v2.3.3006: `sp: 1` marks a sprint step, judged at 1.33x the walking bound and paid for in stamina (server/src/sprint.js; an old worker ignores it). v2.3.3732: `pd: 1` asks to be moved along `vx`/`vy` until the next move (caps.movepath; sent with caps.pathall, on by default since v2.3.3744, or `?diet=1`; server/src/movepath.js) | ~3672 |
| `pong` | Heartbeat reply | ~3811 |
| `track` | **Cosmetics/appearance only** (2 s cadence) — allowlisted, see below | ~3819 |
| `player_attack` | Attack swing (also relayed to peers — see Quirks) | ~3828 |
| `monster_damage` | Damage claim against a monster (server validates; truth returns as `monster_hit`). **v2.3.2481:** a BASIC staff bolt (`slot: 'staff'`, no `special`) additionally splashes 50% of its own capped roll to up to 3 other monsters within 60 px of the impact point (× Detonation, the server mirror of the client's `staffAoeMult`), each answered by its own `monster_hit` tagged `splash: true`. The scan is server-side ON PURPOSE: the worker rolls FULL damage for every `monster_damage` it receives, so a client sending a second event for the neighbour would deal 100%, not 50%. **v2.3.2842: `orbs`** — the staff special is ONE big bolt (behind `caps.bigorb`) and says how many of the old volley's orbs it stands for (`orbs: 3`). Honoured only on a staff special (`slot: 'staff'`, `special: true`), clamped to 1..3, and each orb spends a slot in the special lane (3 per 1200 ms per monster); the worker rolls that many special hits, each under its own cap, and sums them into ONE `monster_hit`. Absent -> one roll, byte-identical. **v2.3.2849 (specials-rebalance.md):** the big bolt is ONE roll from its own band (0.3–2.5, `STAFF_BOLT.BAND`) × the orbs the lane admitted, under that many special ceilings × `CAP_K`, and it EXPLODES: every other monster within 90 px of the impact (× Detonation) takes a third of it, each answered by its own `monster_hit` tagged `splash: true` — the basic bolt's splash scan with the bolt's own radius and share. The cap is `caps.bigorb` (lower case since v2.3.2849). **v2.3.2848:** an arrow of the bow volley adds `part: 3` — the worker gives it `WORTH / part` of its OWN capped special roll (`slot: 'ranged'` specials only, integers 2–3, anything else is 1). v2.3.2848 shipped it as a third (the three arrows landed what one did); **v2.3.2849** made `BOW_VOLLEY_WORTH` 2, so an arrow lands two-thirds and the volley twice the old arrow (the client burns 2.5 s instead of 4). Honoured unconditionally because the share is under 1 for every honoured part, so it can only lower damage against a plain special. Arrows 2–3 into a monster the volley already hit also send `noKb: true` (the v2.3.1435 flag), so the volley shoves once. See `docs/specs/bow-volley.md` | ~3834 |
| `extraction_start` | Begin gather/extraction channel. **v2.3.2956 (`caps.gatherhits`):** optional `hitSeq` (a positive integer ≤ 1e9, per attempt) asks the worker to roll the wind-up as HITS against the node's HP and answer `gather_hits`; the strike is then held to that plan's window, `(hits - 1)` swings, instead of `computeOpenDelay`'s. The skill the dice use is the NODE's, never this payload's `skill`. Absent or malformed → the old timer, byte-identical, and no reply. **A cook** sends `{skill: 'cooking', fishKey, hitSeq}` (no node, no zone; clients before v2.3.2956 never send a cook here): the worker answers `gather_hits` and keeps NO record — `cook_request` is unchanged and held to no plan. See `docs/specs/gathering-hits.md` | ~3841 |
| `node_strike` | Hit a gather node; v2.3.3725: with `caps.gesturepts`, `g: {v: 1, b}` the gesture's own points (base64, 3 bytes a point: dx, dy as signed bytes, dt as unsigned) in place of `swipeFp`, and `k: [[start, held], ...]` E's presses (gesture-points.md) | ~3852 |
| `loot_pickup` | Claim ground loot (server answers `loot_credit` or `loot_pickup_rejected`) | ~3863 |
| `stat_allocate` | Spend a stat point (answers `stat_allocated`) | ~3872 |
| `cook_request` / `cook_recipe` | Cooking minigame start / result | ~3881 / ~3926 |
| `stats_update` | Push derived stats (maxHp/def/regen) so worker damage math stays in sync, plus the two ARMOUR slots — `armor` and (v2.3.1701) `legsArmor`, each `{name, tierMult}` or `null`. Absent means "no opinion", never "unequip": only the flow that changed a slot sends that slot's key (`equipActions.js syncArmorChange`), so a client that has not learned a piece cannot wipe it. **v2.3.2535 (`caps.gearRef`):** a piece the server MINTED is named rather than described — `armorRef` / `legsArmorRef` carry the piece's server-assigned `gid` (or `null` to unequip) and nothing else, and the worker equips its own copy (gearprov.js). A ref that names nothing this player owns in this slot is a REFUSAL (the worn piece stays) and deliberately does NOT fall through to an `armor` object sent alongside it. The describe shape stays for gear minted before the ledger existed, which has no id to name — see `docs/specs/gear-provenance.md`, "Retiring the describe path" | ~3891 |
| `ability_use` | Special moves — `payload.type` ∈ `dodge`, `lunge`, `retreat`, `swipe` (+ tier); server may answer `ability_rejected` | ~3900 |
| `ability` | v2.3.1733 stamina abilities — `{kind}` ∈ `bash`, `whirl`, under `caps.abil`. Server-resolved end to end (targets, damage, stun, knockback, kill credit); may answer `ability_rejected`. See abilities.js | abilities.js |
| `element_burst` | v2.3.1734 Element Burst, under `caps.elemBurst`. **Payload is EMPTY** — the server reads the weapon, its `element1`, the position, the pools and the cooldown from its own state and picks the targets itself. Answers a broadcast `element_nova` + `monster_hit` per target (tagged `burst:true`), or `ability_rejected` with `{type:'burst', reason}`. Its own type rather than an `ability` kind: that table prices costs as a % of STAMINA, and this spends flat MANA behind an element gate | burst.js |
| `arrow_blast` | v2.3.2279 the bow special's send-off: `{zone, x, y}` — a position and nothing else; the worker picks the targets (220 px) and rolls a bow special on each, answering a broadcast `arrow_boom`. **v2.3.2848: RETIRED while the volley is live** — refused silently as `retired` (counted in the operator view) whenever the worker advertises `caps.bowvolley`; the `bowvolley: false` live flag un-advertises the volley and lets the blast through again. See `docs/specs/bow-volley.md` | arrowblast.js |
| `eat_request` | Consume food (server-authoritative heal) | ~3909 |
| `shop_purchase` | Buy from vendor | ~3918 |
| `equip_request` / `unequip_request` | Equip/unequip gear | ~3935 / ~3953 |
| `sell_weapon` | Sell to vendor | ~3944 |
| `build_point_earned` | T1 build-point tick for the server-side BP level gate (v2.3.154, `docs/specs/build-points-gate-server.md`) | ~3961 |
| `set_active_slot` | Switch weapon slot (melee/ranged/staff) | ~3971 |
| `forge_weapon` | Blacksmithing forge | ~3991 |
| `amulet_forge_request` | v2.3.1192 server amulet forge — `{op:'smelt'\|'craft'\|'gem', ...}` under `caps.amuletForge`; echo is `player_state` only (see `docs/specs/amulet-forge.md`) | amulet.js |
| `chat_mute` | v2.3.1981 persistent chat mute — `{target, on, name?}` under `caps.chatMute`. Stored in `chat_mute:<pid>` against the stable `bp_` identity and enforced on the FAN-OUT: a muted player's `chat`/`emote` is filtered out of the muter's own tick frame (tick.js), and their party chat / friend DM is not sent. Answers `chat_mute_list`. Its own case, never rebroadcast — an old worker would relay it and announce your mute to the room, which is why the client gates the send on the cap | chatmod.js |
| `chat_report` | v2.3.1981 abuse report — `{target, reason?}` under `caps.chatMute`. Stored in `chat_report:<id>` with the SERVER's copy of the recent chat; a client-supplied text/name is ignored outright (rule 16). Reason clamped to an allowlist; rate-limited per reporter (60 s per target, 5/h, 20/day). Answers `chat_report_ack`. Operator reads them at `GET /api/admin/reports` | chatmod.js |
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
  combat with social relays; do not scope them. *(Superseded by v2.3.3245,
  below: the fights' events are placed by an allowlist; the social relays are
  still room-wide.)*

The v1/v2 split is unchanged *within* a zone. No caps flag — nothing new is
claimed, so it is deploy-order safe both ways. Full detail and the measurements:
`docs/specs/interest-management.md`.

**v2.3.3197: far players less often, positions in whole pixels.** In the Wheel
a v2 session's `players` carries the movers within 2,400 px of it on every tick
(`FAR_PLAYERS.NEAR_R` in `server/src/tick.js`, the monsters' own reach) and
the ones further off at most every 250 ms, each time where they are now; v1
sessions and every other zone are as above. Every player entry's `x`, `y`, `vx`
and `vy` are whole numbers. Kill switches (live flags): `farplayers: false`,
`roundpos: false`. No caps flag: an old client already handles a peer updated
less often (the 1 Hz roster). `docs/specs/far-players.md`.

**v2.3.3243: far players once a second, with the roster.** The far send above
is gone by default (`FAR_PLAYERS.EVERY_MS` 0): a player more than 2,400 px from
a v2 session in the Wheel reaches it only in the presence roster, every
`PRESENCE_REFRESH_TICKS` (about once a second), where they are now. Near players
are unchanged. `far_ms` in the live flags (a number, 100-5000) brings back a far
send that often (250 is v2.3.3197's). Same fields; no caps flag, for the same
reason. `docs/specs/far-players.md` "Once a second".

**v2.3.3203: a player walking steadily is sent less often.** A Wheel player's
entry is held for the next tick while they stay on the line their last entry
drew them along (its `x`, `y`, `vx`, `vy`; within 2 px), with every other field
unchanged and still moving (or still standing), for at most 66 ms; a turn, a
stop, a start, new gear, a shove or any other change goes out at once, and the
far send and the 1 Hz roster count as sent. Same fields, fewer entries: a
straight walk about 15 a second instead of 30. Kill switch: `steadymovers:
false`. `docs/specs/steady-movers.md`.

**v2.3.3246: the roster's far players, slim.**
- **The roster is built for each phone.** On a presence tick (the 1 Hz roster),
  a v2 phone in the Wheel gets its own roster.
- **Near players whole.** The players within 2,400 px of it in its zone are sent
  whole, as before.
- **Far players slim.** The far ones are sent `{x, y, d, z, vx, vy}`: the
  fields the client writes whether or not they are present.
- **A far player standing still waits.** One who has not changed since the last
  roster is sent again only after 4 s (`ROSTER.FAR_STILL_MS`). That is still
  inside the client's 10 s ghost sweep.
- **Everyone else unchanged.** v1 phones, the other zones and a socket that has
  not joined still get everyone whole.
- **Deploy order.** No caps flag. The kill switch is `slimroster: false`.
- `docs/specs/slim-roster.md`.

**v2.3.3250: far players only while your world map is open (presence v2).**
- **join `pres: 2`** (v2 only) and **`caps.presence2`**: a phone that opts in,
  in the Wheel, is sent the players near it and its party (whole, wherever
  they are), and far players only while its world map is open.
- **client -> server `map_watch {on: true|false}`**: the world map opening, its
  4 s heartbeat, its closing. One `true` lasts 8 s. Sent only to a worker that
  advertises `presence2`; the page's channel names it (TRAPS #18).
- **tick `nr: 1`**: on a pres-2 phone's roster while its map is shut -- every
  player near it is in this roster. The phone parks the rest out of sight.
- **tick `on: {id: zone}`**: everyone in the room, on a pres-2 phone's first
  tick and every 30 s. It replaces the 10 s ghost sweep while it keeps coming.
- **Deploy order.** An old phone keeps the v2.3.3246 roster; a new phone
  against an old worker never sends `map_watch`. Kill switch `presence2:
  false`. `docs/specs/presence-v2.md`.

**v2.3.3318: into the Wheel with only the monsters around you.**
- **join `wn: 1`** (v2 only): this phone takes a near list.
- **`zone_state` `mnear: 1`** and a join's **`state_sync` `monstersNear: 1`**:
  in the Wheel, the monster list holds only those within 2,400 px of the phone
  (`WHEEL_NEAR.R`, the tick's own reach). An empty list marked so still means
  the worker runs the monsters there.
- **tick `mw: {zone: [...]}`**: on that phone's tick only, each monster coming
  into its reach for the first time this visit, in the snapshot's wire
  (`monsterSnapWire`). The phone makes it before the tick's monsters update
  it, and gets it once until it leaves the Wheel.
- **Deploy order.** An old phone (no `wn`) and a new phone against an old
  worker get the whole list, as before. Kill switch `wheelnear: false`
  (`caps.wheelnear` false; the phone reads the marks, not the cap).
  `docs/specs/wheel-arrival.md`.

**v2.3.3204: a steady walk on the safe ground is sent half as often.** The
client's `move` cadence: on the Wheel's safe ground, not in a fight, against a
worker advertising `caps.movediet`, a move on the line the last one drew waits
until 66 ms after it (`src/game/moveDiet.js`, the worker's own steady rule); a
turn, stop, start or any other change goes on the next 33 ms batch. The worker
passes such a move on at its next tick (`STEADY.SPACED_MS`). Same message, sent
less often; an old worker gets every move, an old client sends every move. Kill
switch: `movediet: false` (un-advertises the cap). `docs/specs/move-diet.md`.

**v2.3.3732: the message diet -- a steady walk is sent as a path (v2.3.3744:
on for every phone by default; the owner: "Just turn the message diet on now
I'll turn it off if I do not like").** Against a worker advertising
`caps.movepath` (on unless the kill switch `movepath: false`), a client in the
Wheel, not in a duel or an arena match, that is told `caps.pathall` (on unless
the live flag `pathall: false`) and was not opened with `?diet=0`, or was
opened with `?diet=1` (changes to either flag reach every client at once as
the privileged `move_path {on, all}`), marks every `move` with `pd: 1` ("move me along my speed until my
next one"). A steady move (every other field as sent, the same speed within ~2
degrees, on its line, as far along it as the speed says, under 500 px/s)
waits until 200 ms after the last one sent; a change (a turn, start, stop,
sprint, roll, any field) goes on the next 33 ms batch; a move only off its
line at the same speed (a wall, a shove) keeps the old rate
(`src/game/moveDiet.js` pathMayWait / pathTurned). The worker moves its copy
of a `pd` player along the speed between moves, at most the walk bound and 300
ms past the last move, judging each new move from the last move's place
(`server/src/movepath.js`), and sends a glider to the other phones every 66
ms. Without `pd` (an old client, or the switch off) nothing changes; an old
worker never advertises the cap. `docs/specs/move-path.md`.

**v2.3.3254: the quiet phone -- several messages in one frame, and fewer.**
- **A bundle.** Against a worker advertising `caps.bundle`, a frame may be a
  JSON ARRAY of client messages: everything the phone sent in one turn of its
  loop. The worker takes each in order exactly as if it had come alone
  (`server/src/bundle.js`; index.js `webSocketMessage` -> `_onMessage`): the
  same handlers, AFK clock, cadence lanes and caps. Never a `join`, nothing but
  plain objects, at most `BUNDLE.MAX` 24; the 16 KB frame gate is the whole
  frame's. One message still goes as itself. A worker always TAKES a bundle;
  `bundle: false` only stops advertising it. The phone bundles only once the
  socket's OWN `state_sync` advertised it (a reconnect keeps the last worker's
  caps until then, and an older worker would relay an array to the room).
- **`pong` may ride.** `{type: 'pong', ts, hd}`: `hd` is how long the phone
  held the answer to ride on a frame going anyway; the worker subtracts it, and
  takes a sample only for the latest ping (`ts` must be `session.lastPing`).
  An old phone's pong (no `hd`) is measured as before.
- **Sent less often** against a worker advertising `caps.quiet`
  (`src/game/quietPhone.js`): moves every 66 ms with no player within 2,400 px
  (33 with one, or in an arena match); a steady walk held to 66 ms anywhere in
  the Wheel out of a fight, unless a player near you may fight you there; a
  standing phone's keepalive move once 1 s after its last move, then every 10
  s (a death, a gear change or a place changed with no thumb on the stick goes
  at once); no 500 ms harvest heartbeat (the
  start and stop still go); `track` at once when its news changes (the worker's
  own `LOOK_RELAY` rule), else riding, or alone every 30 s; one ping in four
  answered when nothing else goes; the tree's `gather_node` repeat riding.
  Kill switch `quiet: false`. `docs/specs/quiet-phone.md`.

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

**v2.3.3240: the `player_update` relay carries what CHANGED, and only when
something did** (`server/src/lookrelay.js`, `docs/specs/look-relay.md`).
The phones merge it, writing only the keys it carries.

- `x`/`y`/`dir`, the LAZY keys (`rpgHp`, `rpgMaxHp`) and the inspect card's
  counters (LAZY_IN: `rpgData`'s `kills`, `svKills`, `goldEarned`, `playtime`)
  never send a relay on their own; they ride along in one that goes.  Any
  other change to `rpgData` relays it, whole, at once: the phone draws a
  peer's slung shield from `rpgData.shield`.
- `hg`/`fr` are in every relay that has them: the phone sets the build from
  each relay unconditionally.
- A whole copy goes every minute.
- Any other `player_update` a server sends must carry the player's `hg`/`fr`
  too (the clan clear does), or it resets their build on every screen.
- Kill switch: `lookdelta: false`.

Before v2.3.1465 the handler `Object.assign`-ed the raw blob into player state:
one crafted `track` forged coins/power/level, minted a weapon past
`_sanitizeWeapon`'s ceiling, and teleported the sender — all persisted by the
next `_saveRpg`. `reportToLeaderboard` also now takes rank from the server's
`ps.level`, not the client's `rpgLv`.

### `join.data` is allowlisted too (v2.3.1627)

**If you add a field to `join.data` and it does not appear on other
players' screens, this section is why.** The server copies only named
keys out of the join payload; anything else is dropped silently, with no
error and no failing test.

`_handleJoin` used to build authoritative state as
`{...defaults, ...msg.data}` and set `session.data = msg.data`, so every
field a client invented survived into `playerState` — and, because
`getAllPlayerData()` spreads `...s.data` LAST, into the `state_sync`
every other player receives, where it shadowed the server's own values.
A forged `_zoneEntryGraceUntil` bought permanent immunity to all damage
(`_applyDamage` short-circuits on it) on an id that needs no passphrase.
It was the same primitive as `track`, one message earlier, and the
v2.3.1465 pass did not reach it.

### What the others are told about you (v2.3.3244)

A joining phone's `state_sync.players` and the `player_join` every phone gets
when someone joins describe each player by the **public** keys alone
(`PEER_PUBLIC_KEYS` / `_peerPublic` in `server/src/index.js`): what the look
relay already sends everyone (`TRACK_COSMETIC_KEYS`), the join's look
(`JOIN_COSMETIC_KEYS`), and what every tick says (`playerWire`: position,
facing, zone, speed, the armour on show, what they are harvesting, the Hemi
Bro badge). Until v2.3.3244 they spread the player's whole `playerState` --
coins, bag, every stash, quests, life skills, buffs, the anti-cheat's own
histories -- and the join's `rpg*` claims (`player_join` too); no phone read
them, and in No man's land the bag is the killer's prize. Precedence is
unchanged (the phone's look over the state, the session's name over the
state's). A field added to `playerState` later stays private unless it is
added to the list on purpose. `server/test/peer-view.test.mjs` holds every key
a phone reads on the snapshot road (wsClient.js, `peerCosmetics.js`) to the
list. No caps flag: a phone reads a subset of these keys, from any worker.

`_sanitizeJoinData` (`server/src/join.js`) now admits exactly:

| Group | Keys | Bound |
|---|---|---|
| Presence | `x`, `y` (finite numbers), `d` (≤16 chars), `z` | `z` must pass `_validZone` |
| Cosmetics | `name`, `color`, `avatar`, `bt`, `bl`, `hw`, `fh`, `hr`, `sk`, `hc`, `htc`, `fhc`, `st`, `stc`, `ec`, `ew`, `sa`, `sb`, `pa`, `ta`, `tf`, `tm`, `sp`, `pp`, `fp`, `eqc`, `eql`, `eqs`, `eqst`, `pt`, `sh`, `bs`, `wpnMat` | truncated to 64 chars; `avatar` and the six drawing keys to 512 |
| Bootstrap | anything matching `/^rpg[A-Z][A-Za-z0-9]*$/` | scalars pass; containers capped at 8 KB |

`ew` is the eyewear id (v2.3.2361), a short catalog id exactly like `hw` and
`fh`; it is on both gates (join and `track`) and in the stored character look.
`ec` is the eye colour (v2.3.1930) and `wpnMat` the weapon's blacksmith
tier (v2.3.1760); both were in the code allowlist before this table named
them.  `sa`/`sb` are the player's drawn shirt, front and back (v2.3.1939),
`pa`/`ta` their drawn pants print and chest tattoo (v2.3.1940), and `tf`/`tm`
their FACE and ARM tattoos (v2.3.1949 — `tm` rather than a suffixed `ta`
because these keys are two letters by convention and `ta` was taken; one arm
drawing covers both arms, since at eight-odd pixels an arm a left/right
distinction is invisible and would double the bytes for nothing).  Those
six are the reason the cap is not a flat 64: each is exactly 256 hex
characters (a 16x16 grid, one character per cell) and the receiving client
rejects any string that is not exactly that, so a truncated drawing is not a
smaller drawing — it is no drawing at all.  `join.js` exports `cosmeticCap`
and BOTH gates call it (the join sanitiser and the `track` handler), because
v2.3.1939 shipped the two caps spelled out separately and the second one was
missed: prints appeared on join and vanished on the first 2 s relay.  The
anticheat suite now asserts the WHOLE drawing-key set survives the `track`
gate at 256 characters, rather than only the newest member, so the next key
cannot repeat it.  `sp`/`pp`/`fp`
are the shirt, trouser and shoe PATTERNS (v2.3.1941, v2.3.1944) — a tile id and
a palette index, e.g. `stripe-v:3`.  They are deliberately not drawings: a pattern repeats across
a whole garment, so it needs about a dozen characters rather than 256, sits
inside the flat 64-char cap, and needs none of the special handling above.
Note the server does not know that shoes offer only four of the nine tiles —
that is a client catalog rule applied on the way in to a canvas, so a forged
`fp` naming a tile shoes do not offer paints nothing rather than being
rejected here. Like every cosmetic here they are DISPLAY-ONLY and unvalidated
server-side: the receiving client maps the string through its own catalog
and answers null for anything unknown, so a forged value can only ever
select something that catalog already contains.

Three consumers share the sanitized copy — `session.data`, the
`playerState` spread, and the `player_join` broadcast. All three must
keep using it; the broadcast was missed on the first pass (v2.3.1629)
and relayed the raw blob to every peer.

**To add a cosmetic:** put it in `JOIN_COSMETIC_KEYS` *and* in
`TRACK_COSMETIC_KEYS` (`server/src/index.js`) — the two lists overlap but
are not identical (join carries `eqst`; track carries `mask`, `cape`,
`pet`). Both paths truncate strings to the same bounds, so a value can be
clipped but never dropped.

**And two client-side halves, v2.3.1961.** A server that admits a key
relays nothing if the sender never sends it and paints nothing if the
receiver never maps it — `tf`/`tm` cleared both server gates in v2.3.1949
and were still missing from the client's `track` payload until v2.3.1961,
so the two newest canvases could reach a peer only on their join frame.
So: (3) send it from the `track` payload in `src/ui/BroTown.jsx` beside
`sa`/`ta`, and (4) if the wire name differs from the field the renderer
reads off a peer — `sa` → `shirtArtFront`, `hr` → `hair` — add the pair to
`PEER_COSMETIC_FIELDS` in `src/networking/peerCosmetics.js`. That one table
feeds the `state_sync` snapshot, `player_join`, both self-heal placeholders
and the `player_update` relay; before it existed the relay wrote the SHORT
keys onto peers and every renamed cosmetic was frozen at its join value.

**v2.3.3245: a fight's events go to the phones near it.** The events a tick
carries are now chosen per phone from an ALLOWLIST of the ones that happen at a
place (`server/src/eventplace.js`): monsters' hits, attacks, special moves,
thrown balls, fire patches, parries, bow blasts, element bursts, a bash's
wind-up, and the relays `player_swing`, `player_projectile`, `player_dodge`,
`player_jump`, `gather_node`, `monster_dmg_at`, `player_hurt_by_monster`.

- **Where it is.** The place comes from the room's own state: the monster
  where it is now, the fields the room wrote, and for a relay the sender as the
  room has them (never the payload).
- **Who gets one:**
  - the players it is about (attacker, target, sender), wherever they are;
  - in the Wheel, a v2 phone within 2,800 px of it (`EVENT_PLACE.R`, the
    monsters' `INTEREST_OUT`);
  - anywhere else, the phones in its zone (and a v1 phone in the Wheel the
    whole Wheel).
- **Still room-wide:** everything else -- chat, emotes, trades, duels, clans,
  the arena, the jackpot, hits between players, and the events a phone keeps
  until the next one: kills (a far monster's only news of its death), loot, a
  raised shield, a mummy's change, a lit campfire. And any new type. A phone with no zone yet still hears everything.
- **On the wire:** an event's bytes are unchanged, and a phone near all of a
  tick's events gets the same `events` it got before. No caps flag.
- **Kill switch:** `eventplace: false`.

At 120 players with real swings and arrows it cut a phone's events from about
50 to 16 a second. `docs/specs/events-by-place.md`.

**v2.3.3255: the Hemi Bro checkmark and count.** No new message types.
- **`bro_verify {count: 1, signature, tokenId?}`** (only against
  `caps.broCount`) is the WALLET check: the worker recovers the signer of its
  own nonce and reads the collection's `balanceOf(signer)`; `tokenId` (the
  worn Bro) is optional and checked by `ownerOf` as before, its failure no
  longer fatal. The old shape (`tokenId` required, no `count`) is unchanged.
  One chain read per 5 s a socket (`slow_down`).
- **`bro_verify_result`** gains `count` (and `tokenId: null` when the worn Bro
  is not theirs); with `refresh: true` it is a join's background re-read of a
  stale link, sent to that player only (PRIVILEGED, as before).
- **The tick's player entry** gains `brn` (the count, 1..6666), absent at 0;
  `bro` (the verified worn Bro's id) is unchanged -- and the phone reads both
  now: it never read `bro` before, so nobody saw anyone else's badge. A far
  player's slim entry carries neither and leaves them as they were.
- **`state_sync`** gains `broN` (the count, 0 with no fresh link).
- Server-owned, never client-settable (not in TRACK_COSMETIC_KEYS or
  JOIN_COSMETIC_KEYS). Kill switch `broCount: false`.
  `docs/specs/hemi-bro-count.md`.

## Peer-relayed broadcast events (client ↔ client)

Sent via `channelShim.send({...})`, hit the server's default branch, pass the
`PRIVILEGED_EVENTS` check, and are rebroadcast to the room. Handled in
`_processGameEvent`. These are **cosmetic/social by design** — anything with
gameplay authority must instead get a real server case.

**v2.3.3304:** each one must be in `RELAY.TYPES` (server/src/relay.js), and
each goes out in its sender's name -- see the Security model above and
docs/specs/relay.md. The table below is that list.

| Event | Purpose | Dispatcher case |
|---|---|---|
| `chat` / `emote` | Chat lines and emotes | ~3091 / ~3122 |

> **v2.3.1981 — the relay is filtered PER RECIPIENT.** `chat` and `emote` are
> the family a server-side mute suppresses: the tick fan-out drops them from
> the muter's own frame (`MUTABLE_RELAY_TYPES`, chatmod.js), keyed on the
> server-stamped `from`, never `payload.id`. Nothing else this player relays
> is touched — mute is a chat control, block is an interaction control. See
> `docs/specs/chat-moderation.md`.

### `chat` is clamped and its sender is stamped (v2.3.1970)

`chat` is still a relay — it keeps the `eventBuffer` fan-out, the relay
token bucket and its deliberately un-zone-scoped reach — but the payload is
no longer whatever the sender wrote. (v2.3.3396: `chat` and `emote` spend an
allowance of their own now, `SOCIAL` — five at once, one every 2 s — not the
relay bucket; the text is cleaned after the clamp below; and the same room line
twice in 30 s is relayed once. `docs/specs/chat-guard.md`.) `_sanitizeChatRelay` (index.js) REBUILDS
it from an allowlist before the rebroadcast:

| Field | Rule |
|---|---|
| `id` | **stamped** from `session.id`; a claimed id is discarded |
| `name` | **stamped** from server state (`playerState.name`, else the sanitized `session.name`) |
| `text` | clamped to `CHAT_RELAY.TEXT_MAX` (200, matching `PARTY.CHAT_MAX`), control chars stripped, trimmed; an empty result relays **nothing** |
| `color` | clamped to `CHAT_RELAY.COLOR_MAX` (32), control chars stripped |
| anything else | dropped |

Why: the only bound before this was the 16 KB frame gate, and the only thing
that renders a chat line is a PIXI Text bubble whose background is sized from
the measured text — so one message was a ~17,000px texture on every screen in
the world. The identity half was already on the record in the v2.3.1150
`server_announce` note ("any client could impersonate the server there").
Clients clamp on receipt as well (`src/game/chat.js clampChatText`), because
worker and client ship independently. Pinned by `anticheat.test.mjs` §9 and
`tools/qa/mp/mp-socialgrief.mjs`.

The top-level `join.name` is sanitized the same way (`sanitizeDisplayName`,
join.js): it is the copy `getAllPlayerData()` publishes in every `state_sync`
and the one `_reportToLeaderboard` prefers, and the client draws it into an
unwrapped nameplate Text.
| `player_swing` / `player_projectile` / `player_shield` | Remote attack/projectile/shield visuals | ~3134 / ~3142 / ~3155 |
| `player_projectile` `delayMs` | v2.3.2259 the staff volley's stagger (a peer holds the orb that long at the caster's hand, in ms). **v2.3.2848:** the bow volley sends one `player_projectile` per arrow with `delayMs` 0 / 167 / 333 — sized for a peer's 8 px-a-frame arrow — and a peer holds a non-staff projectile that many FRAMES (`round(delayMs / 16.7)`, `holdFrames`), since that is what its flight is counted in; an older peer draws the three at once, which is what it drew before. **v2.3.2849:** each also carries `volley: 1` (additive), so a peer's arrow that stands in a rock burns out on the volley's 2.5 s rather than the lone arrow's 4; absent -> 4 s, as before | gameEvents.js |
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
- v2.3.3275 (the account check, docs/specs/account-check.md): `join`
  gains `verify`, a Cloudflare Turnstile token, present only when the
  room asked for one. A join for an id the room has no record of, with
  the check on and no good token, is answered `join_rejected
  {reason:'verify', sitekey}` and closed with 4014; the client shows the
  widget and joins again with its token. Nothing is written for a
  refused join. Off until both Turnstile keys are set.
- v2.3.3274 (one socket cannot stop the game, docs/specs/one-socket.md):
  every message counts against the socket's budget (300 at once, then 120
  a second, a bundle's parts one each); past it a message is dropped, and
  a socket that keeps flooding is closed with code 4012. Nothing but
  `join` and `pong` is taken before the join; a socket that has not
  joined within 15 s, or sends a second `join`, is closed with 4011. An
  address past `ip_sockets` places or `ip_joins_min` opens a minute gets
  `room_full` with `reason: 'ip'` and the full room's 4009. The client
  treats 4011 and 4012 as an ordinary drop (reconnect on its backoff).
- v2.3.1913 (AFK): a session with no PLAYER INPUT for
  `IDLE_TIMEOUT_MS` (2 min) is evicted and closed with code 4006,
  reason `idle timeout`; the client shows a resume banner and must NOT
  auto-reconnect. Input is judged server-side: `pong` and `track` are
  pure heartbeats and never count, and a `move` counts only when
  something the player controls changed (position, facing, zone,
  harvest, shield up/angle, dodge) — the client's 1 Hz idle keepalive
  is by construction the move where nothing did. The client hangs up
  first, at the same 2 minutes, off its own `_lastInputAt` (which also
  sees taps that put nothing on the wire); the sweep is the backstop.
- `state_sync` gains `caps` (e.g. `{trade: true, questTrack: true}`) —
  the server's capability advertisement. Clients store `S._serverCaps`
  and run legacy client-side credit paths ONLY when the server hasn't
  claimed the job. HTTP responses use `settled: true` for the same
  purpose. This is the deploy-order safety mechanism; preserve it.
- v2.3.2978 (wheel-monsters.md): **`caps.wheelmonsters`** — the worker
  runs the Wheel's own zone, `wheel` (in `VALID_ZONE_IDS`, not in `ZONES`):
  each element zone's spawn list at the inner end of its spoke, every monster
  carrying `home` in the join snapshot and in `zone_state` (with `variant`
  there), in `wheel` only. The client takes town's World View stairs into
  `wheel` only in the `?trial=wheel` trial against a worker that advertises
  it; without it the trial stays on `worldview`, as before. Lower case:
  `wheelmonsters: false` in liveflags un-advertises it and leaves a Wheel
  spawned after it empty. **In `wheel` only, a v2 session's `tick` carries
  only the monsters within 2,400 px of the player** (kept until 2,800), and a
  monster coming into that reach is sent whole that tick, moving or not
  (tick.js, wheelzone.js `_wheelInterest`); such a session's tick is
  serialised for it alone. Every other zone's tick is unchanged.  (Whole
  here means the tick's own entry, where it is and how it is doing; since
  v2.3.3318 a `wn` phone also gets what it IS, in `mw`, the first time:
  docs/specs/wheel-arrival.md.)
- v2.3.2956 (gathering-hits.md): **`caps.gatherhits`** — mining,
  woodcutting, fishing and cooking wind up as worker-rolled hits on the
  node's (or the fish's) HP
  (`extraction_start.hitSeq` → `gather_hits`). The client asks only
  against a worker that advertises it; without it the wind-up stays the
  `computeOpenDelay` timer. Lower case: `gatherhits: false` in liveflags
  un-advertises it AND answers a client that still asks with `off`.
- v2.3.2848 (bow-volley.md): **`caps.bowvolley`** — the bow special is
  three arrows (`monster_damage.part`; two-thirds of a special each since
  v2.3.2849) with no send-off blast (`arrow_blast` refused as `retired`).
  The client gates the whole volley on it; without it the special stays
  the one arrow with its 4 s burn and its blast.
  Lower case on purpose: it doubles as a kill switch, and `POST
  /api/admin/flags` only accepts `/^[a-z0-9_]{1,32}$/`.
- v2.3.2842 / v2.3.2849 (specials-rebalance.md): **`caps.bigorb`** — the
  staff special is ONE big bolt (`monster_damage.orbs: 3`): one roll from
  its own wide band, and it explodes on the monsters around its target.
  Without it the client fires the three-orb volley, each orb rolled and
  capped as before, no blast. Renamed from `bigOrb` before it ever
  shipped, so that `bigorb: false` is a kill switch the admin route can
  throw (TRAPS §117).
- v2.3.1178 (http-auth.md): `join` gains an optional `httpAuth: true`
  declaration and `state_sync` gains `httpToken` (private per-session
  token, plus `caps.httpAuth`). The client sends the token as the
  `x-bt-auth` header on the mutating economy endpoints (market
  place/cancel, arena join/leave); the server rejects requests whose
  `playerId` isn't backed by that player's own live-session token.
  Public `/api/leaderboard` is GET-only.
- v2.3.2551 (auction-house.md): `POST /api/store/list` with
  `kind: 'gear'` names the piece by its server-assigned `gid`
  (`{field, gid, price}`) when the worker advertises
  **`caps.storeGearRef`**, and by the v2.3.2531 selector
  (`{field, sel, hint, price}`) when it does not — both are accepted, and
  on the selector path the id that reaches the sell gate is read off the
  SERVER's own stash entry, never off the selector. A refusal answers
  `{ok: false, settled: true, reason, error}`: `reason` is a stable
  string from `_gearSellable` (`legacy` / `cosmetic` / `worn` /
  `in_mail` / `not_held` / `wrong_slot` / `no_player`) that the client
  keys its explanation off, and `error` is a human sentence for a client
  that does not know a newer reason. `caps.storeGearRef` gates only HOW a
  piece is named — the gate itself runs on both paths, so an old browser
  can sell exactly what a new one can. See `docs/specs/gear-provenance.md`.

**New server→client messages (all in `PRIVILEGED_EVENTS`):**

| Type | Purpose | Spec |
|---|---|---|
| `room_full` | v2.3.1982 admission refusal at the player cap: `{reason:'full', count, cap, retryMs}` on an upgraded socket the worker closes immediately with code **4009**. OPT-IN — sent only when the connect URL carries `?rf=1`; everything else keeps the legacy `503 Room full` on the un-upgraded handshake. Deliberately NOT a `join_rejected` reason: an old client treats an unknown reason as fatal and stops retrying (v2.3.1181) | room-full.md |
| `join_rejected` | Join refusal: `reason:'auth'` (close 4003 — client mints a fresh id once) or `reason:'frozen'` (v2.3.1148 operator freeze, close 4004 — client shows a banner, stops reconnecting, must NOT mint) | identity.md / admin.md |
| `inbox_delivered` | Offline-mail delivery: `{entries: [{kind, payload, note, source}], queued}` | inbox-escrow.md |
| `duel_end` | Server duel resolution: `{winner, loser, wager, how: kill\|death\|forfeit\|timeout}` | duels.md |
| `gamble_result` | Server-rolled gamble outcome (private): `{won, wager, payout}` | gambling.md |
| `clan_state` / `clan_error` / `clan_war_kill` / `clan_war_end` | Clan registry echo + war referee (private; `clan_create` / `clan_invite` / `clan_join_accept` / `clan_leave` / `clan_kick` / `clan_war_declare` c→s cases, all gated client-side on `caps.clans`). v2.3.2301: `clan_leave` finally has a SENDER — the button had been local-only, so the registry kept you a member and the clan returned on reload. Removal now also emits `player_update {clanTag:null, clanColor1:null}` to peers, because the peer merge is `Object.assign` and cannot remove a key | clans.md |
| `arena_match_start` / `arena_match_result` / `arena_tournament_complete` | Arena bracket (matches are duels). v2.3.3713: `arena_match_start` is sent again on a rejoin mid-match (`rejoin: true`); an arena match's `duel_end` carries `arena: true`; `GET /api/arena/status?playerId=` says where that player stands (`status` queued/fighting/eliminated/waiting/none) | arena.md |
| `dungeon_started` / `dungeon_wave` / `dungeon_boss` / `dungeon_complete` / `dungeon_error` | Instanced dungeons (private; `dungeon_start` c→s case) | dungeons.md |
| `dungeon_boss_ability` | v2.3.1194 boss ability telegraph/execute notice (private to players inside; client handler is display-only — damage rides `monster_attack`). v2.3.1199 adds kind `enrage` (soft anti-stall timer; `{stacks, pct}` extras) on the same type | dungeons.md |
| `arena_stake_placed` / `arena_stake_result` / `arena_stake_error` | Sponsorship stakes (private; `arena_sponsor` c→s case; legacy `arena_bet` relay stays cosmetic) | sponsorship.md |
| `guild_quest_result` / `guild_quest_error` | Guild-quest turn-ins (private; `guild_quest_turn_in` c→s case) | guild-quests.md |
| `threat_penalty` / `threat_expired` / `gear_locked` | Threat machine (pvp_threat/threat_response stay relays, intercepted + annotated with server countdown/settled/levy) | threats.md |
| `pet_capture_result` | Server-rolled pet capture (private; `pet_capture` c→s case; consumes a basic_trap) | pets.md |
| `harden_result` | §4.6c hardening roll (private; `harden_weapon` c→s case; forge mints now carry `quality`/`hardness`/`temper`; v2.3.3139 adds `material`/`amount`, the bars or hardened wood the attempt took and how many, and the `no-materials` refusal) | hardening.md |
| `hardened_wood_result` | v2.3.3139: five logs into one hardened wood at the Woodworker (private; `make_hardened_wood {key, count}` c→s case; `{key, count, xp, leveled, fromLevel, newLevel, have}` or `{error}`: `off`, `bad-key`, `skill`, `no-logs`) | hardened-wood.md |
| `trade2_state` / `trade2_invite` | Two-sided trade window (private; `trade2_open/set/confirm/cancel` c→s cases; gift trade relay unchanged) | trading.md addendum |
| `party_state` / `party_invited` / `party_error` | Party roster echo + invite/error notices (private; `party_invite/accept/decline/leave/kick` c→s cases; roster re-echoed ~2s for cross-zone vitals) | party.md |

**Cadence + jackpot (v2.3.1149, caps.jackpot):** new c→s case
`jackpot_deposit {amount}` (multiple of 50 in [50,5000]); new s→c types
(both PRIVILEGED) `jackpot_state {pool, period, yourTickets, deposited?}`
(private, on join + after deposit) and `jackpot_result {winnerId,
winnerName, amount, period}` (broadcast on the lazy weekly draw). The
daily login reward reuses `inbox_delivered` — no new types. GamblePanel
deposits are caps-gated; the legacy local stub remains for old workers.

**Daily rewards (v2.3.3140, caps.dailyspin + caps.dailyquests):** the login
pays nothing now (the daily chest and its gold fallback are gone; a chest
still held opens as before). New c→s cases `rewards_get {}`, `daily_spin
{act: 'spin'|'double'|'collect', opId}` (a lump sum, double or nothing on
the pot, take the pot), `daily_reroll {i}`, `season_claim {tier} | {all:
true}`; new s→c types (both PRIVILEGED) `rewards_state {now, resetAt, spin,
streak, dq, season, news, kept?}` (private: after `player_state` on join,
and after every change) and `daily_progress {i, n, g}` (private, a quest's
count). Quest, season and spin-pot payouts ride `_creditPlayer` →
`inbox_delivered` with sources `dailyquest` / `season` / `dailyspin`, kept
out of chat by the client. Full table:
docs/specs/daily-rewards.md.
v2.3.3400: the daily quests and the season are put away --
`caps.dailyquests` is false unless the live flag `dailyquests: true` is set
(then `daily_reroll` and `daily_progress` work as above), and `caps.season`
false unless `season: true` (then `season_claim` works as above; off, it is
refused with no answer). `rewards_state.season` carries `on` (0/1); with the
season off, the first state after the worker mailed a player's reached and
unclaimed tiers carries news `{kind: 'season_drop', s, mailed: [tier...]}`
(their coins and items `inbox_delivered`, source `season`). A new day online
sends news `{kind: 'spinday'}` in place of `'newday'`, and tut_1's turn-in a
state with no news in place of `'unlocked'`.

**Salvage and essences (v2.3.3141, caps.salvage):** new c→s cases
`smith_salvage {field: 'armorStash'|'legsStash', gid}` or `{field:
'weaponStash', idx, sig}` (a carried copper, iron or black steel piece back
into two of its bars, and a Rare/Elite/Godly one's essence) and
`essence_apply {essence, field, gid}` or `{essence, field: 'weaponStash',
idx, sig}` (an essence raises a carried piece of its metal to its grade); new
s→c types (both PRIVILEGED, private) `smith_salvage_result {ok, field,
gid|idx, name, bar, bars, essence, grade, metal}` and `essence_result {ok,
field, gid|idx, essence, grade, metal, piece}`, or `{ok: false, reason}`
(worn, in_mail, legacy, not_held, wrong_slot, gone, changed, not_metal,
no_essence, wrong_metal, not_lower, bad); a player_state follows each paid
act. Full table: docs/specs/salvage.md.

**Shield gems (v2.3.3187, caps.shieldgem):** new c→s case `shield_gem {gem,
gid}` or `{gem, sig}` (a polished gem into the shield the worker holds for
you, named by its ledger id or, with no id, by its signature
name|gearBase|tierMult|tier); new s→c type (PRIVILEGED, private)
`shield_gem_result {ok, gem, name, gid, was, worn}` or `{ok: false, reason,
gem}` (off, down, bad_gem, locked, bad, not_held, no_gem); a player_state
follows a slotted gem. Full table: docs/specs/shield-gems.md.

**No man's land's losses, and Diego's tools (v2.3.3316, caps.nomansland):**
no new c→s case. `nml_loss` gains `named: true` (its `gear` list names
every piece taken, a red skull's too, and the game takes out exactly those)
and `keepWorn` (a red skull no player killed keeps its worn slots); `coins`
is every loss's now (a player's kill takes the gold). New s→c type
(PRIVILEGED, private) `nml_take {from, items, lootId, coins, weapons, gear,
worn}` to the killer. Diego's `shop_state` items gain the three gathering
tools `{key, qty: null, tool: true, sell}`; a `shop_quoted` for one carries
`tool: true` and, when he will not sell it to you, `qty: 0` and `why`
('have', 'quest', 'off'); `shop_buy` of one buys one. An older game shows no
tool row (it lists staples and stock). Full rules: docs/specs/no-mans-land.md
"Everything but what you wear".

**No man's land: a group, and the window's Attack (v2.3.3530, caps.nmlgroup,
caps.nmlchoice):**
- **client -> server `nml_attack {target}`**: the window's Attack (and a tap
  that aims at a chosen player). The worker starts both skulls at once,
  before any blow: the attacker red unless hitting back, the one attacked
  white with the attacker's right to be hit back. No kill is stamped by it.
  Sent only to a worker that advertises `nmlchoice`; the page's channel names
  it (TRAPS #18). Its own router case, never relayed.
- **`nml_skull` gains `bys`**: `[[id, ms left], ...]`, every player whose
  right to be hit back still runs (16 at most, most time first), beside `by`
  (the last). An older game reads `by` alone.
- **Storage:** `nml_state:<pid>` gains `from` (the same pairs).
- **Deploy order.** A new phone against an older worker sends no `nml_attack`
  and joins no attacker without a window; an older phone never sends it and
  the skulls wait for the first blow. Kill switches `nmlgroup: false` (the
  last attacker's right alone, no `bys`, no join, area moves as v2.3.3528)
  and `nmlchoice: false` (the choice ignored). Full rules:
  docs/specs/no-mans-land.md "A group attacks you: one window" and "You are
  white the moment they choose".

**No man's land: beaten by them, not again for half an hour (v2.3.3770,
caps.nmllock):**
- c→s: `nml_lock_ask {target}`, from a player locked out from `target`; the
  worker passes it on once a minute per pair. `nml_lock_allow {target}`,
  from the one who beat them, lifts that player's lock. Each is its own
  router case, never relayed.
- s→c (PRIVILEGED, private): `nml_lock {out: [[id, ms left]], in: [[id, ms
  left]]}`, the locks this player is in, sent to both players when one is set
  or lifted, and at a join only when there is one. `nml_lock_ask {from}` goes
  to the target alone: the sword clash and "?" over `from`'s head.
- Storage: `nml_state:<pid>` gains `lock` (`[[id, until]]`).
- Kill switch `nmllock: false`.
- Full rules: docs/specs/no-mans-land.md "Beaten by them, not again for half
  an hour".

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

**The pet's fetch (v2.3.3806, caps.petfetch):** no new message types. The
same `loot_pickup {viaPet: true}` reaches `PETS.FETCH_RANGE` (600 px from the
owner) for a monster pile the sender is a recipient of; a death drop or a
dropped item keeps `VACUUM_RANGE` (240). The phone's pet runs to such a pile
up to 450 px from you and asks from there (docs/specs/pet-fetch.md).
`petfetch: false` in the live flags un-advertises the cap and puts every pile
back on 240.

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
