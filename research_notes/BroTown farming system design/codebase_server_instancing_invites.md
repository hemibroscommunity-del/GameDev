# BroTown server architecture, instancing, invites, anti-cheat and scale -- what a private, invite-able, real-time-crop farm must build on

Scope: server architecture, persistence, instancing, invites, anti-cheat, cost/scale and shipping conventions. Farm gameplay, the Land Office / Feed & Seed panels, and items/economy are covered by other researchers; this file reports only how the server treats the farm ZONE. Every code claim is cited as `path:line`, relative to /home/user/GameDev. Status labels: **[exists and works]**, **[exists but dormant/hidden/client-only]**, **[does not exist]**. Code is the source of truth. The docs cited are the ones CLAUDE.md lists as trustworthy: ARCHITECTURE-HANDOFF, WORLD-ARCHITECTURE, WIRE-PROTOCOL, TRAPS and docs/specs. This was read-only research: nothing was run.

## 1. Conventions a new server-settled "farm" system must obey (an ARCHITECTURE-HANDOFF checklist)

### Takeaway
The rules in Part 1 of ARCHITECTURE-HANDOFF are load-bearing, and several are checked by machine: wire-audit, caps-audit, opid-audit, mirror-audit, and precheck's storage-key and shim checks. For a farm, the rules that matter most are:
- farm state goes under its own storage key, never in the rpg blob;
- every value goes through `_creditPlayer` with a deterministic opId;
- no cross-DO await between validating and committing;
- no alarms, so time is resolved lazily;
- every client message gets an explicit router case, and every type the server emits goes in PRIVILEGED_EVENTS;
- the system gets its own narrow, lower-case `caps` flag, which doubles as its kill switch;
- every new client-to-server type gets a passthrough line in the client shim.

### Cited Findings
**Storage**
- [exists and works] Rule zero: the game is 100% server-based. Client logic exists only as prediction, or as a legacy fallback gated on caps. — docs/ARCHITECTURE-HANDOFF.md:28-40
- [exists and works] Rule 1: never add a field to the rpg blob. `_saveRpg` rewrites `rpg:<playerId>` from a fixed field list, so any other field is silently dropped on the next save. The one exception is `_v`. — docs/ARCHITECTURE-HANDOFF.md:44-51; code at server/src/persistence.js:159-311
- [exists and works] Rule 2 is the storage-key registry:
  - keys are `prefix:id`, enumerable with `storage.list({prefix})`;
  - prefixes are lowercase_snake;
  - every new prefix must be registered in the table (docs/ARCHITECTURE-HANDOFF.md:52-102);
  - precheck PARSES that table, so breaking its format fails the gate (docs/ARCHITECTURE-HANDOFF.md:619-623; tools/dev/precheck.mjs check 5 "storage-keys").
- [exists and works] A durable write may be coalesced only for deterministic, recomputable state. The example is regen: `REGEN_SAVE_MS` is 10 s, which cut 5,455 rows to 341 per player-hour. The doc adds: "Money-at-rest is untouched: every value-bearing path still saves immediately on its own." — docs/ARCHITECTURE-HANDOFF.md:107-122; server/src/index.js:796

**Settlement and idempotency**
- [exists and works] Rule 4: all payouts go through `_creditPlayer`. Online, it applies to live state and sends `inbox_delivered`; offline, it parks the credit in `inbox:<id>`. — docs/ARCHITECTURE-HANDOFF.md:126-130; server/src/inbox.js:159-195
- [exists and works] Rule 5: a deterministic opId is stamped in `oplog:`, and a duplicate debit returns `{ok:true, dup:true}`. — docs/ARCHITECTURE-HANDOFF.md:131-134; server/src/inbox.js:66-73, 385-440
- Rule 6: a sweep never refunds over a payout that is already stamped. — docs/ARCHITECTURE-HANDOFF.md:135-138
- Rule 7: money at rest (listings, wagers, fees) is escrowed at placement so it survives a deploy; instant swaps are validated at commit. — docs/ARCHITECTURE-HANDOFF.md:139-145
- Rule 8: prefer a single mutation over two phases. — docs/ARCHITECTURE-HANDOFF.md:146-149

**Durable Object concurrency**
- [exists and works] Rule 9:
  - The DO handles one event at a time. Storage awaits keep the input gate closed; any other await (a cross-DO fetch, a timer) opens it.
  - So there must be "no cross-DO await between a validation and the commit that depends on it". The doc calls this "why the order book was folded INTO the GameRoom".
  - An unbounded `storage.list()` on the join path or a tick slot stalls the whole room, so housekeeping must be a paged JOB.
  - Sources: docs/ARCHITECTURE-HANDOFF.md:153-170. The reference implementation is the paged oplog prune, `OP_PRUNE {PAGE 500, TTL_MS 48h, SLOT_MS 3000}` at server/src/inbox.js:31-36.
- Rule 10: a fire-and-forget `_saveRpg` is correct, because output gates hold messages until writes commit. — docs/ARCHITECTURE-HANDOFF.md:171-173
- Rule 11: a deploy wipes ALL memory, so keep something only in memory if losing it costs nothing of value. — docs/ARCHITECTURE-HANDOFF.md:174-177
- [exists and works] Rule 12: "There are NO alarms in this codebase, and the tick loop stops when the room empties". Anything time-based must resolve lazily, on the tick AND on the next activity. — docs/ARCHITECTURE-HANDOFF.md:178-181
  - Verified in code: there is no `setAlarm`, `alarm(` or `getAlarm` anywhere in server/src (grep is empty).
  - The tick starts with the first socket (server/src/index.js:4569) and is cleared when no sessions remain (server/src/index.js:5629).

**Trust boundary**
- [exists and works] Rule 13: every type the server emits goes in `PRIVILEGED_EVENTS` (the set is at server/src/index.js:377). — docs/ARCHITECTURE-HANDOFF.md:185-193
  - The router's default branch REBROADCASTS any unknown, non-privileged client type to every client in the room (server/src/index.js:5490-5578; the privileged check is at 5507, the push to eventBuffer at 5578).
  - server/test/wire-audit.test.mjs enforces this by machine.
- Rule 14: each half of a handshake is validated against the sender's own session. Rule 15: an accept with no matching live offer is DROPPED, not relayed. — docs/ARCHITECTURE-HANDOFF.md:194-201
- Rule 16: never trust value blobs from the client. Take the server's own copy by reference, and use allowlists (`_sanitizeJoinData`, `track`). The doc's lesson: "audit by what a handler WRITES". — docs/ARCHITECTURE-HANDOFF.md:202-230
- Rule 17: PvP fails closed (it needs `ZONES[zone].lawless` or a consent pair). — docs/ARCHITECTURE-HANDOFF.md:231-233. A zone id missing from ZONES fails closed automatically. — server/src/dungeon.js:24-25
- Rule 18: never make the server write `_questFlags` mid-session. — docs/ARCHITECTURE-HANDOFF.md:234-240

**Deploy order**
- [exists and works] Rule 19: WebSocket flows advertise capabilities in `state_sync.caps`; HTTP flows use `settled: true`. Rule 20: the `player_state` echo is the tiebreaker. Rule 21: v1/v2 dual protocol support is untouchable. — docs/ARCHITECTURE-HANDOFF.md:244-255
- [exists and works] The caps literal in join.js ends with `..._liveFlags`, so operator live flags override and can un-advertise baked caps. — server/src/join.js:1422
  - Its comments repeat one rationale (areaChat, whisper, storeChat, smelting, storeOffer, aceFlip): an old worker "has no case for X, so it would fall through to the default branch and REBROADCAST" it.
  - So every new client-to-server family gets its OWN narrow flag. The comments call this "the caps.gems lesson", TRAPS #9 (server/src/join.js:1422).
- [exists and works] A capability meant to double as a kill switch must match `FLAG_NAME_RE /^[a-z0-9_]{1,32}$/`. Otherwise `POST /api/admin/flags` refuses to set it. — server/src/liveops.js:59, 229-230; docs/TRAPS.md §117
  - Example: `smelting: false` both un-advertises the feature and refuses every smelt, through `_smeltOff` (server/src/smelting.js:51-58).
  - Example: `disable_dungeons` (server/src/dungeon.js:226-229).

**Code and test shape**
- Rule 22: new subsystems are mixin modules. Each exports a `*Methods` object, is mixed in with `Object.assign(GameRoom.prototype, …)` at the bottom of index.js, and hooks in through named points. — docs/ARCHITECTURE-HANDOFF.md:259-271; server/src/index.js:5743-5820
- Rule 23: do not repurpose behaviour-frozen files (arena.js, marketplace.js). Rule 24: every PR ships a test suite and a spec doc, the spec in `docs/specs/<system>.md` with its wire surface in a table. Rule 25: `v2.3.NNNN:` comments that say WHY, and constants in ALL-CAPS config objects. — docs/ARCHITECTURE-HANDOFF.md:272-285
- [exists and works] A new client-to-server type needs THREE things:
  - a server `case`;
  - its handler;
  - a passthrough line in `channelShim.send`, which is an ALLOWLIST (docs/TRAPS.md:255-280; src/networking/wsClient.js:4036-4405).
  - Sends shaped `{type:'broadcast', event:X}` reach the worker as `{type:X, payload}` (src/networking/wsClient.js:4332-4405).
  - precheck WARNs about any send with no shim line.
- [exists and works] Maps keyed by client-supplied ids must be `Object.create(null)` or a `Map` (CLAUDE.md). Examples: `playerState` at server/src/index.js:753-756, and the friends doc loaded into null-proto maps at server/src/friends.js:53-64. precheck's proto-safety check WARNs on violations.

**Stale pointers in the docs (found while verifying)**
- The handoff puts PRIVILEGED_EVENTS at "~line 122" (docs/ARCHITECTURE-HANDOFF.md:186); it is really at server/src/index.js:377.
- WIRE-PROTOCOL puts the default branch at "~server:4018" and the set at "~server:91" (docs/WIRE-PROTOCOL.md:101-104); they are really at index.js:5490 and index.js:377.
- WIRE-PROTOCOL says "New client→server events are denied by default" (docs/WIRE-PROTOCOL.md:109). That holds only in the sense that the server does not ACT on them: an unknown non-privileged type is still RELAYED to the whole room (server/src/index.js:5490-5578).

### Inferences
A checklist for a server-settled farm, each item derived from the findings above:
1. **Module.** Add a new mixin `server/src/farm.js` exporting `farmMethods` and an ALL-CAPS `FARM` config. Wire it in through named hooks: a join hook for lazy settling, a tick slot only if needed, and explicit router cases.
2. **Storage.** Add a new prefix such as `farm:<pid>`, registered in the handoff rule-2 table in the same PR (precheck parses it). Never add a field to `rpg:<pid>`.
3. **Value.** Every yield, seed debit and expansion purchase goes through `_creditPlayer`, `_escrowDebitGold` or `_escrowTakeItem` with deterministic opIds. Examples: `farmharvest:<pid>:<plot>:<plantedAt>` and `farmbuy:<pid>:<expansionN>`; opid-audit requires the `'word:'` literal prefix.
4. **Expansions.** Debit the gold and write the farm record in ONE input-gated event, with no cross-DO await in between (rules 8 and 9).
5. **Time.** No alarms. Store server timestamps and resolve state on read (section 2).
6. **Wire.**
   - Every farm client message gets an explicit router case, never the default relay.
   - Every type the server emits goes in PRIVILEGED_EVENTS (for example `farm_state`, `farm_error`, `farm_invited`).
   - Every client-to-server type gets a channelShim passthrough line.
7. **Caps and kill switch.**
   - Advertise a narrow, lower-case `caps.farm` (or a new name, if the client's legacy farm path must be told apart).
   - The client gates every farm send, and the retirement of its client-local farm logic, on that flag.
   - `farm: false` in liveflags is the kill switch: it un-advertises the feature and refuses actions through a `_farmOff()` helper.
8. **Validation.** Validate from server state only:
   - crop types and plot indices by own-property lookup and `clampInt`;
   - never accept a client's ready time, yield or plot contents.
9. **Shipping.** The PR includes:
   - `server/test/farm.test.mjs`, added to the `npm test` chain;
   - `docs/specs/farm.md` with its wire table;
   - mirror-audit entries for any crop table the client mirrors;
   - a `v2.3.N` tag claimed via session-brief, and precheck run before every push.

### Gaps
- I did not read docs/specs/conformance-audit.md, or each audit's full extraction rules; the audits are summarized from their file headers.

## 2. Persistent per-player state, offline-time progress, and the right pattern for crop timers

### Takeaway
All durable player data lives in the storage of the ONE GameRoom Durable Object (DO): the `rpg:<pid>` blob, plus per-system keys. Offline-time features never schedule anything. They store absolute server timestamps or period keys, and settle lazily on join, on the tick, or on the next action. The rpg blob has no farm field. Crop timers should follow the food-buff `endsAt` pattern:
- each plot stores an absolute `readyAt` on the server clock, in its own `farm:<pid>` record;
- that time is read and compared on access, never ticked;
- so crops keep growing while the owner is offline, and even while the room itself is empty or asleep.

### Cited Findings
**Where player data lives**
- [exists and works] Player data lives per GameRoom DO: "that DO holds the existing players' stored progress (rpg blobs live per GameRoom DO)" (server/src/index.js:222-225). Everyone shares one room, `brotown-1` (server/src/index.js:210-228).
- [exists and works] `_loadRpg` reads `rpg:<pid>` and runs the migration registry, re-putting the blob once if it changed. — server/src/persistence.js:48-62
- [exists and works] `_saveRpg` writes a fixed field list (server/src/persistence.js:159-311):
  - coins, inventory, lifeSkills, gold nuggets and bars;
  - level and xp, the HP/stamina/mana pools, raw stats;
  - `_buffs`, equipment, the capped weaponStash, the five gear stashes;
  - quests, `_perfectHistory`, `_cookHistory`;
  - the weapon/defense/hp grids, t2Flat, prog3, svKills, `_v`.
- [does not exist] There is no farm, plot or crop field in that list (server/src/persistence.js:179-311), and no `farm:` prefix in the storage-key registry (docs/ARCHITECTURE-HANDOFF.md:57-98).
- [exists but client-only] The farm bed's rest "runs only on your own device: no message, nothing the worker settles" (docs/specs/wheel-halls.md:78-80).
- Besides the blob, each player has registered keys, among them `auth:`, `char:`, `inbox:`, `gear_prov:`, `guild_claims:`, `gearlock:`, `nml_state:`, `bounty:`, `botstat:`, the `rpgsnap:` ring, `cadence:<scope>:<subject>`, `friends:`, `friend_msg:`, `chat_mute:`, `bro_link:` and `chain_score:`. — docs/ARCHITECTURE-HANDOFF.md:57-98

**How offline-time features work today**
- [exists and works] Offline mail and escrow:
  - `_creditPlayer` returns 'delivered', 'inboxed' or 'dup';
  - an offline entry is appended to `inbox:<pid>` and drained at the next join, BEFORE state_sync (server/src/inbox.js:159-195, 327-345);
  - entry kinds are gold, item, weapon and gear (server/src/inbox.js:225-300);
  - escrow debits change the stored blob directly when the player is offline (server/src/inbox.js:385-440).
- [exists and works] The daily reward:
  - `_cadenceLoginReward` runs on join and compares a UTC day key;
  - it credits a daily chest (or gold, if the `dailyChest` flag is off) with opId `daily:<pid>:<yyyymmdd>`, and keeps the streak in `cadence:login:<pid>` (server/src/cadence.js:78-115);
  - the framework header says: "NO alarms ... So nothing here schedules anything. Periods are pure functions of the clock ... settlement is LAZY ... A week that ends in an empty room settles when the next player shows up" (server/src/cadence.js:1-36).
- [exists and works] Timers based on server timestamps:
  - **Food buffs.** `const endsAt = Date.now() + dur` goes into `ps._buffs` (server/src/cooking.js:294-338, at 307). It is persisted as a timestamp: "Expired entries get pruned lazily by _buffActive checks" (server/src/persistence.js:218-221). `_pruneBuffs` is at persistence.js:76-96, called from `_saveRpg` at 177, and the buffs are echoed to the client at persistence.js:496. An absolute `endsAt` keeps running while the player is offline.
  - **Gather-node respawn.** `n.respawnAt = Date.now() + this.NODE_RESPAWN_TIME` (server/src/gathering.js:1107) is flipped by `_tickNodes`, which walks every zone's nodes (server/src/gathering.js:286-300).
  - **Clan wars** resolve "by endsAt on the tick AND lazily on wake (no alarms)" (server/src/clans.js:31-34).
  - **Anti-bot hour windows:** "Lazy hour-window rollover (rule 12: no alarms)" (server/src/botfp.js:283-293).
  - **Contrast — the No man's land skulls:** `nml_state` counts down "only while the player is connected, so it is time in the game, not on the clock" (docs/ARCHITECTURE-HANDOFF.md:73).

**Alarms, hibernation and idle**
- [does not exist] Alarms (grep). The tick runs only while at least one socket is connected (server/src/index.js:4569, 5629).
- The GameRoom uses the hibernation WebSocket API: `state.acceptWebSocket` at server/src/index.js:4567, and stale sockets are closed on wake at index.js:1240-1247. But "a DO with a live interval cannot hibernate, so it bills wall-clock GB-s indefinitely ... 0.125 GB x 86,400 s = 10,800 GB-s/day" (server/src/tick.js:46-51).
- [exists and works] AFK: `IDLE_TIMEOUT_MS = 120000` (2 minutes). A session with no real input is evicted; pong and track never count as input (server/src/index.js:1200-1206; server/src/tick.js:34-40; docs/WIRE-PROTOCOL.md:372-380).

**The client clock**
- [does not exist] There is no server-clock offset helper in src/ (grep for serverNow, `_serverTimeOffset` and similar names is empty).
- Existing countdowns subtract the DEVICE clock from server timestamps. Examples: `war.endTime - Date.now()` (src/ui/panels/WarBanner.jsx:31), and the buff chips (src/ui/BroTown.jsx:12246-12315).
- Every tick does carry the server's `ts`: `const ts = Date.now()` (server/src/tick.js:326), sent as `{type:'tick', seq, ts}` (tick.js:492).

### Inferences
**The right pattern for crop timers: lazy and alarm-free**
- **What to store.** Store `{crop, plantedAt, readyAt, ...}` per plot.
  - Every time comes from the server's `Date.now()`.
  - Grow durations come from a crop table on the server: an own-property lookup, mirrored to the client and pinned by mirror-audit.
- **How readiness is decided.** State is a pure function of the record and the current time: a crop is ready when `now >= readyAt`. Watering or fertilizing recomputes `readyAt` at the moment of the action.
- **When it is evaluated.** On read: at join (like the inbox drain and the daily chest), on entering the farm, on every farm action, and at harvest.
- **Why this works offline.** Nothing ticks per crop. The room may be empty for days and the crops are still grown the moment anyone looks.
- **Which existing semantics to copy.** This is `_buffs.endsAt` (wall clock, keeps running offline), NOT `nml_state` (online time only).
- **Persistence.** Use `farm:<pid>`. One record per player is simplest, at one storage row per put; per-plot keys would multiply the rows written. Write immediately on value-bearing actions (planting consumes a seed; harvesting pays). The coalescing exemption applies only to deterministic, recomputable state.
- **Display.** Send `readyAt` together with the server's `now` (or `remainingMs`) in a `farm_state` message, so an iPhone with a skewed clock still shows the right countdown. The client then counts down locally; no per-second server pushes are needed.
- **Offline growth is forced by the architecture.** The AFK sweep evicts idle players after 2 minutes, so a design that needs players connected while crops grow is impossible.
- **Ready notifications.** A "your crops are ready" notice while offline would need a channel the codebase does not have: no alarms, and no push. The cheap version is lazy: on join, compute and show "N crops ready", as the daily chest does.

### Gaps
- I did not read `_buffActive` in full, so I cannot say whether the client applies any skew correction for buffs; I only saw device-clock subtraction.
- Cloudflare's DO alarm semantics and pricing were not researched; the codebase convention is to use no alarms.

## 3. Zones, instances and visibility -- and what a private per-player farm instance would require

### Takeaway
Visibility is by zone id inside the single GameRoom:
- players in the same zone are streamed at 45 Hz;
- everyone else arrives on a 1 Hz roster that includes each player's zone.

`farm_home` is ONE shared hub zone id: the server has no notion of whose farm a player is in.

Dungeons prove the "folded instance" trick. An unknown zone id such as `dungeon:<id>` gets the whole combat and streaming stack for free. But dungeons deliberately have NO access control: anyone can walk into any instance id they learn from the roster.

A private per-player farm would therefore need:
- a new family of zone ids;
- an entry check on BOTH the move path and the join path;
- hub treatment through one helper, instead of about 9 literal `'town'`/`'farm_home'` guards;
- arrival placed by the server;
- a persistent record under its own key;
- farm events sent only to the farm's occupants, not to the whole room.

### Cited Findings
**Zone ids and the Wheel**
- [exists and works] `VALID_ZONE_IDS` is the ZONES keys, plus the hubs `town`, `farm_home` and `worldview` ("no monsters, no spawn config, special-cased all over the server"), plus `shadow`, `radiant` and `wheel`. — server/src/data.js:402-415
- `_validZone` accepts those ids, or anything matching `DUNGEON_ZONE_RE /^dungeon:[A-Za-z0-9_-]{1,32}$/`. Any zone id longer than 40 characters is rejected. — server/src/movement.js:78-82; server/src/data.js:422
- [exists and works] The Wheel is one zone id, `wheel`, with no ZONES config (server/src/data.js:412-415).
  - Monsters reach a player only within `WHEEL.INTEREST_R`, 2,400 px.
  - But "players, events and nodes ride" the ordinary zone path (server/src/wheelzone.js:41-44, 106-116, 314).
  - So every player in the Wheel receives every other Wheel player's moves (server/src/tick.js:500-505).

**Interest management**
- [exists and works] What each receiver is sent:
  - monsters and nodes are scoped to the receiver's zone;
  - same-zone peers are sent at 45 Hz;
  - out-of-zone peers are sent on a 1 Hz presence roster of ALL players, and each entry (`playerWire`) includes the zone `z`;
  - `events` are NOT zone-scoped: chat, emote and clan relays go to the whole room.
  - Sources: server/src/tick.js:278-316, 317, 328-345, 347-357; `PRESENCE_REFRESH_TICKS` is 45 (server/src/index.js:832).
- The client draws a peer only if `(other.zone || other.z || 'town') === S.currentZone`. — src/rendering/systems/entityRenderer.js:10504

**How the server treats `farm_home` today** — [exists and works, as a SHARED hub]
- It is always open (`ALWAYS_OPEN_ZONES`, server/src/movement.js:20). The nearby comment "farm_home is personal" is about gating, not instancing (server/src/movement.js:96-104).
- It is excluded from `_activeZones`, so no monster AI runs there (server/src/index.js:1603-1609).
- It has no nodes (server/src/gathering.js:277-279).
- Entering it sends an explicit EMPTY `zone_state`, or the empty v1 trio (server/src/movement.js:442, 497-520).
- It regenerates HP like a hub (server/src/index.js:3382).
- A death there leaves no death pile (server/src/index.js:4105).
- It is never spawn-scaled (server/src/spawnscale.js:137).
- Joining into it counts as not being "in the world" (server/src/join.js:1296).
- It is not `lawless`, so PvP is denied there (server/src/data.js:306-312).
- [does not exist] A per-player farm instance id, anywhere.
- How the client enters: it sets `S.currentZone='farm_home'` on one fixed 960x800 map and sends a `move` with `z:'farm_home'`. — src/networking/gameEvents.js:889-910; src/ui/panels/buildings/FarmPanel.jsx:108-116; src/data/constants.js:37; src/rendering/tiledMaps.js:78
- In the Wheel, the farm trip goes through today's town as a hidden stop, and the farm's gate returns you to the Wheel door you left by. — docs/specs/wheel-doors.md:57-61, 110-116

**Dungeon instances** — [exists and works]
- The trick: "FOLDED INSTANCES. An instance is just a zone id the ZONES table doesn't know: 'dungeon:<id>'". Monster AI, zone_state streaming, kill credit and fail-closed PvP all work on it unmodified. — server/src/dungeon.js:12-27
- Instances live in memory only (`this._dungeons`), and "zone presence IS membership". — server/src/dungeon.js:29-34
- Limits: `MAX_INSTANCES: 8` room-wide, `DONE_LINGER_MS` 15000, `EMPTY_SWEEP_MS` 60000. — server/src/dungeon.js:47-58
- What a start does (server/src/dungeon.js:224-277):
  - checks the kill switch, allows one active run per owner, and checks the room cap;
  - makes `id = crypto.randomUUID().slice(0, 8)` and the record `{id, zone, ownerId, cfg, wave, state, createdAt, emptySince, doneAt}`;
  - fills the monsters in before replying `dungeon_started`.
- The party pull (server/src/dungeon.js:290-310):
  - it happens only if the starter LEADS a party;
  - it takes members who are connected, alive and in the leader's current zone;
  - in the Wheel they must also be within `WHEEL_DUNGEON.PARTY_R`, 600 px (server/src/wheeldungeon.js:72). A start is accepted only within `DOOR_R`, 260 px, of the mouth (server/src/wheeldungeon.js:55).
- Cleanup deletes the zone's monsters, loot, nodes and dirty maps (server/src/dungeon.js:784-794). `_tickDungeons` sweeps empty instances: "an instance whose players all leave is swept next time ANYONE is online; if the DO restarts first, memory is simply gone" (server/src/dungeon.js:796-815).
- Completion pays live player state inside the tick, with no opId, because recipients are online by definition. — server/src/dungeon.js:770-782

**No access control on entering an instance** — [does not exist]
- "NOT OWNERSHIP either -- instances carry only {id, zone, ownerId, cfg, ...} with no member list, because they are SHARED by design ... instance ids are broadcast in the 1 Hz roster, so a stranger can walk into someone's dungeon -- true, and PRE-EXISTING". — server/src/movement.js:68-77

**The zone gate on move and join**
- `_zoneRejected` is true when the zone is invalid, or when it is a zone CHANGE and `!_zoneUnlocked` (server/src/movement.js:183). A rejected zone keeps the server's zone and leaves the player mobile; this shape exists because three earlier attempts froze players (server/src/movement.js:123-182).
- The file recommends "server-placed zone entry: the server already knows the destination ... the next person should build that instead" (server/src/movement.js:155-157). Zone changes bypass the anti-teleport speed cap (server/src/movement.js:205-215).
- On join, `_sanitizeJoinData` keeps `z` only if `_validZone(z)` (server/src/join.js:353-362), and the join zone is the sanitized z or 'town' (server/src/join.js:1295). So a client can JOIN directly into any valid zone id.

**Cost per zone**
- `_tickMonsters` runs a fire-trail tick and `_ensureZoneMonsters` for every active zone (server/src/index.js:1816-1852).
- The tick serializes once per (zone, protocolVersion) group, and Wheel v2 sessions already serialize once per session (server/src/tick.js:576-605).

**Precedents for sending only to one zone**
- `_handleAreaChat` sends only to sessions whose `ps.z` matches: "Denied by default rather than falling back to the room". — server/src/chatlanes.js:108-138
- Dungeon messages go only to `_dungeonZonePlayers`. — server/src/dungeon.js:174-182

**Player id length**
- Player ids are `'bp_' + base36(hash) + '_' + first two passphrase words` (server/src/account.js:28-34), which is variable in length. So `'farm:' + pid` can exceed `_validZone`'s 40-character limit (server/src/movement.js:79).

### Inferences
**What a per-player farm instance would require, if built inside the GameRoom**
1. **An id family.** For example `FARM_ZONE_RE /^farm:[A-Za-z0-9_-]{1,32}$/`, accepted by `_validZone`. Use a short farm id assigned by the server and stored in `farm:<pid>`, not the raw player id (the 40-character limit and the charset).
2. **An entry check on BOTH paths: move (`_zoneUnlocked`) and join.**
   - Allow entry only for the owner, or a guest with permission (a stored friend or clan rule, or a live invite).
   - Otherwise reject with the existing "keep the server's zone" shape; the history in movement.js says not to invent a new rejection shape.
   - Zone ids are broadcast at 1 Hz, so privacy must come from this check, not from keeping the id secret.
3. **Better still, server-placed entry.** A `farm_enter {owner}` request that the server validates and answers with the zone and the spawn point, in the `dungeon_started` shape. The client then never names coordinates for the jump.
4. **Hub treatment.** Send the 9 literal guards through one `_isHubZone(z)` helper that also matches farm instances: index.js:1606, 3382 and 4105; movement.js:20 and 442; gathering.js:278; spawnscale.js:137; join.js:1296; data.js:406. Keep farm instances out of `_activeZones`.
5. **Persistence.**
   - `farm:<pid>` is the source of truth.
   - Keep an in-memory cache (a Map keyed by owner), loaded on first entry and evicted once the instance has been empty for a while, in the shape of the `_tickDungeons` sweep.
   - A deploy that wipes the cache loses nothing.
6. **Streaming.** Two options:
   - A privileged `farm_state` message (in full on entry, small deltas on change), sent only to sessions in that instance and identical on v1 and v2.
   - Or reuse `this.nodes[zone]` and `zone_state`, which brings v1/v2 deltas for free, but the node schema is built for gathering.
7. **Capacity.** Farms run no monster AI, so the dungeon cap of 8 does not apply. The binding limit is the room's 60 sessions, so at most 60 farms can be occupied at once. Each occupied farm costs one more serialization group, which is already the norm in the Wheel.

#### Hosting options, with trade-offs (inference)
**A. Farm instances as zone ids inside the one GameRoom ("folded instances").** The recommended fit today.
- Everything a farm action touches (bag, coins, seeds, skills, friends, party) is in the same DO. So planting, harvesting and buying settle atomically, in one input-gated event (rule 9).
- Co-presence and movement streaming come free, and no new binding is needed.
- Guests can visit an OFFLINE owner:
  - the guest's event reads `farm:<owner>` from storage;
  - friend requests already read an offline target's records the same way (server/src/friends.js:128-133);
  - escrow already debits an offline player's stored blob (server/src/inbox.js:407-411 (gold) and 432-436 (items)).
- The costs:
  - the entry check and the hub refactor above;
  - farm traffic shares the room's message budget and its 60-player cap. Farm actions are taps, which is negligible beside 15–30 moves a second.

**B. A separate GameRoom per farm, via `idFromName('farm-<pid>')`** (the `?room=` escape hatch, server/src/index.js:206-208, 217-220). Not viable today:
- "rpg blobs live per GameRoom DO" (server/src/index.js:222-225), so the visitor's character, bag and coins are not in that DO;
- switching rooms means a new socket and a loading screen;
- friends still in `brotown-1` would not see you.

This becomes possible only after the character vault exists.

**C. A per-player Farm DO,** a new class needing a new wrangler binding and migration tag, that holds only farm state and is called from the GameRoom.
- For it:
  - it matches WORLD-ARCHITECTURE's "owned state outside every room";
  - it survives a future split into many worlds;
  - an idle farm DO can hibernate, since it has no tick.
- Against it:
  - every harvest becomes a cross-DO hand-off. Rule 9 forbids a cross-DO await between validating and committing, so each one would need the outbox-plus-opId pattern (docs/WORLD-ARCHITECTURE.md:134-138);
  - presence still lives in the GameRoom;
  - there is more code, more latency, and more rows written.
- At today's 60 concurrent players or fewer, this is overkill.

**D. The farm inside the future character vault** (one DO per player, which rooms lease).
- This is the documented long-run home for owned state (docs/WORLD-ARCHITECTURE.md:119-125), step 6 of the build order, "Before launch" (docs/WORLD-ARCHITECTURE.md:258).
- It is not built. Designing `farm:<pid>` as a self-contained record, with no references into room memory, keeps a later move into the vault mechanical.

**Visiting while the owner is offline.** This is possible under A, C and D. The permission must be a STORED fact: the friends list, clan membership, or an allow-list in `farm:<pid>`. Party rosters and the party, duel and clan invites live in memory only, so they need both players online.

### Gaps
- No measurement exists of the tick overhead of many zones without monsters. The 0.16 ms at 60 players figure is for one shared world (server/test/load-crowd.mjs, which I did not read).
- How the client would render different farms (a map per owner) was not examined; client farm rendering is another researcher's scope.
- The reason for `DUNGEONS.MAX_INSTANCES = 8` is not documented beyond "room-wide concurrent instance cap" (server/src/dungeon.js:53; docs/specs/dungeons.md:76).

## 4. Invites and the social graph

### Takeaway
Two durable social facts exist: mutual friendships (`friends:<pid>`) and clan membership (`clan:`, `clan_by_player:`). Three handshakes live only in memory: party invites (60 s), clan invites (120 s) and duel challenges (120 s). All three share one pattern:
- a 'from>to' key with a time limit;
- an accept that counts only against the inviter's own recorded half;
- a privileged answer;
- a card in the UI.

The only permission or rank model is clan leader versus member.

What could carry a farm invite:
- A standing "friends may visit" permission fits the friends graph, and works while the owner is offline.
- A one-off "come visit my farm" fits the party/duel/clan handshake, shown on a card like ClanInviteCard.
- Mail (the inbox) settles value; it is not a messaging channel.

### Cited Findings
**Party** — [exists and works]
- It lives in memory only: "Storage: NONE, deliberately ... a worker deploy wipes rosters".
- Limits: `PARTY.MAX_SIZE 4`, `INVITE_TTL 60000`, `VITALS_MS 2000`, `OFFLINE_GRACE_MS 120000`, `CHAT_MAX 200`, `INVITE_REPEAT_MS 5000`.
- The handshake: `party_invite {target}` is recorded as 'from>to' and sent privately as `party_invited`. A `party_accept` counts only against a live invite from the inviter's own connection.
- `party_state` is re-sent every 2 s, carrying each member's HP and zone.
- Sources: server/src/party.js:1-53, 147-250. The leader can pull the party into a dungeon (server/src/dungeon.js:290-310; docs/ARCHITECTURE-HANDOFF.md:366-385).

**Friends** — [exists and works], a server fact since v2.3.1323
- Storage:
  - `friends:<pid>` holds `{list, reqIn, reqOut}`, null-prototype in memory;
  - `friend_msg:<pid>` holds an offline DM backlog, capped at 50.
- Requests persist and reach offline players at their next join. `friend_dm` only works between friends.
- Limits: `FRIENDS.LIST_MAX 100`, `REQ_OUT_MAX 25`, `DM_MAX 280`. There are no opIds, because no value moves. The client is gated on `caps.friends`.
- Sources: server/src/friends.js:1-41, 53-108.
- A request to an offline player checks that `rpg:<target>` exists, and writes both players' records in one event. — server/src/friends.js:112-150
- The Social panel lists each friend as "Online · <zone>" or "Offline", read from the presence roster. — src/ui/panels/SocialPanel.jsx:136-188

**Clans** — [exists and works]
- Storage: `clan:<clanId>` holds `{id, name, tag, color1, color2, logo, leaderId, members[], createdAt}`; `clan_by_player:<pid>` points to it.
- Limits: `CLANS.CREATE_COST 500`, `MAX_MEMBERS 20`, `INVITE_TTL 120000`.
- The handshake:
  - `clan_invite` stays a relay, watched by `_observeClanInvite`, which records 'inviter>target' as {clanId, ts};
  - "only leaders invite";
  - `clan_join_accept` is checked against the sender's own session.
- Sources: server/src/clans.js:1-50, 121-188.
- [does not exist] Any rank beyond `leaderId` versus `members`.

**Duels** — [exists and works]
- `DUEL.CHALLENGE_TTL 120000` and `GRACE_MS 15000`. `_duelChallenges` maps 'challenger>target' to {wager, ts}. — server/src/duel.js:35-37, 100-130

**Invite UI precedent** — [exists and works]
- `ClanInviteCard` raises a card wherever the player is, because the worker keeps an invite only 120 s. Accept sends `clan_join_accept`. — src/ui/panels/ClanInviteCard.jsx:5-30 (v2.3.3066). It shares its look with the duel card (`DuelRequestPanel.jsx`).

**Where per-player actions live** — [exists and works]
- The inspect card sends `party_invite`, `trade2_open`, `duel_wager_request`, `friend_request`, `pvp_threat` and `clan_invite`. — src/ui/panels/InspectPlayerPanel.jsx:231-577
- The Sheriff's Office opens the player list: "tap someone, then Duel on their card". — docs/specs/wheel-halls.md:14, 73-77

**Mail** — [exists and works, for settlement only]
- Inbox entries are credits of kind gold, item, weapon or gear. — server/src/inbox.js:225-300
- The Post Office is a client-side view of this visit's `inbox_delivered` deliveries (the last 30, in `S._mail`): "Nothing new is sent between the game and the worker, and nothing is stored". Friend messages are the friends DM backlog. — docs/specs/wheel-halls.md:59-72

**Guild ranks**
- Guild ranks are derived from life skills and drive display only. CLAUDE.md's v2.3.3066 note says so (`guildRanks`, `bestGuildRank` in dash/GuildPanel.jsx). They are not a permission system.

### Inferences
- **Standing permission.** The setting ("friends may visit", "clan may visit", "anyone", "nobody") belongs in the farm record and is checked at entry against the stored friend list or clan registry. That works while the owner is offline and survives deploys.
- **One-off invite.** Copy the party/duel shape:
  - `farm_invite {target}` is recorded in memory as 'owner>guest', with a time limit;
  - a privileged `farm_invited` raises a card for the target, in the ClanInviteCard pattern;
  - `farm_invite_accept` is checked against the sender's own session (rules 14 and 15) and answered with a server-placed entry.
  - A deploy loses pending invites, which is acceptable (rule 11). Both players must be online.
- **Party.** A "Visit [member]'s farm" action from the party HUD. A leader pull, modelled on `_dungeonPullPartyMembers`, could bring the whole party into a farm.
- **Discovery.** Add "Visit farm" to the inspect card (for online players) and to each friend in the Social panel (online or offline). The Social panel prints the raw zone id, so `farm:xyz` would need a friendly label there.
- **Mail is the wrong carrier.** The inbox carries value credits only. A friend DM can mention a farm, but it cannot carry an accept the server can check.

### Gaps
- I did not read PartyHUD.jsx or PlayerListPanel.jsx in detail.
- I found no statement from the owner on whether non-friends should be allowed to visit.

## 5. Anti-cheat and rate-limit conventions relevant to timers and harvest claims

### Takeaway
The server owns every clock:
- it records `startedAt`, `endsAt` and `respawnAt` from its own `Date.now()`, and refuses claims that arrive too early;
- its per-minute and per-hour caps are derived from the fastest honest pace (HONEST_CYCLE gives 45 perfect claims a minute; harvests and cooks are capped at 2,400 an hour, in lazily rolled windows);
- it persists rate history so a reconnect cannot reset it;
- it gates resources on skill level;
- it treats every client-supplied key with own-property lookups, clamped integers and null-prototype maps.

By owner policy, behavioural bot detection only gathers evidence.

### Cited Findings
**Timing windows on the server clock** — [exists and works]
- `extraction_start` records `startedAt: Date.now()`. — server/src/gathering.js:753-781
- A `node_strike` that arrives before `startedAt + openDelayBase*jitterLo - GRACE` is refused as 'too-early'. Late strikes have been allowed since v2.3.1416. — server/src/gathering.js:1020-1060
- The range check uses the NODE's own position. — server/src/gathering.js:1016
- A node pays once, then waits for `respawnAt`. — server/src/gathering.js:1107

**Caps from the honest pace** — [exists and works]
- `HONEST_CYCLE` is `{LEAD_MS 90, SETTLE_MS 220, GESTURE_FLOOR_MS 1200}`, 1,510 ms in all. From it, `HARVEST_PERFECT_PER_MIN` is 45: "nothing honest beats 60000 / HONEST_CYCLE_MIN_MS = 39.7". — server/src/gathering.js:100-113
- `_perfectHistory` keeps a 60-second window. — server/src/gathering.js:379-386
- That window is persisted in the blob "so a cheater can't reset the 60-second window by reconnecting". — server/src/persistence.js:273 (field), with the comment just above it. Cook history works the same way (server/src/persistence.js:276).

**Skill gates** — [exists and works]
- `GATHER_REQ_LVL` is keyed by type and tier and read by own-property lookup. The server refuses `extraction_start` and `node_strike` below the level, with `gatherreq` as the kill switch. — server/src/gathering.js:134-160

**botfp (the anti-bot module)** — [exists and works]
- Behavioural signals are evidence only (owner policy, 2026-07-03), except the entropy floor and the economic hour caps.
- `HARVEST_HOUR_CAP` and `COOK_HOUR_CAP` are both 2,400.
- "Lazy hour-window rollover (rule 12: no alarms)". Past the cap, the grant is silently withheld.
- Storage is `botstat:<pid>` and `device:<deviceId>`.
- Sources: server/src/botfp.js:1-30, 148, 156, 283-306.

**Input hygiene** — [exists and works]
- Message bounds: `MAX_INBOUND_BYTES 16 KB`; a relay token bucket of 8 burst and 4 a second; `EVENT_BYTES_PER_TICK 64 KB`; `EVENTS_PER_TICK_CAP 500`. — server/src/index.js:770-791
- `clampInt` rejects NaN through `Number.isFinite`. — server/src/dungeon.js:157-161
- An own-property gate on archetypes (TRAPS #6). — server/src/dungeon.js:192-197
- `_invCount` uses own-property lookup and numeric coercion for inventory keys the client chooses. — server/src/inbox.js:41-62
- The quests own-property guard (handoff item H). — docs/ARCHITECTURE-HANDOFF.md:496-509
- The join gate rejects the magic ids `__proto__`, `constructor` and `prototype`. — server/src/join.js:532-551
- `playerState` is a null-prototype map. — server/src/index.js:753-756
- Activity for the AFK check is judged on the server (pong and track never count). — docs/WIRE-PROTOCOL.md:372-380

**A target, not built** — [does not exist yet as a general mechanism]
- "Every message type has a rate cap. `move` has none today." — docs/WORLD-ARCHITECTURE.md:93

### Inferences
For farm actions:
- **Readiness.** Check against the stored `readyAt` on the server clock, and refuse a harvest before it. No "too-early" grace is needed, since nothing is gesture-timed — unless a harvest gesture is added, in which case copy the extraction window.
- **One payout per planting.** Key the opId by plot and `plantedAt`, so a replay converges as 'dup'. That also makes dead-pipe replays safe (docs/specs/dead-connection.md:62-72).
- **Planting.** Debit the seed through the own-property, NaN-proof `_escrowTakeItem` path. The crop type must be an own key of the server's crop table.
- **Position.** The actor must be in the farm instance, and near the plot (gathering's out-of-range pattern). This prevents harvesting remotely.
- **Rate caps.**
  - A per-minute cap on farm actions, derived from an honest pace of one tap per plot.
  - A lazy hour cap if yields are large.
  - The history persisted, so cycling the connection cannot reset it.
- **Level gates.** Farming is already a life-skill key: server/src/migrations.js:88 (`LIFE_SKILL_KEYS`), server/src/chainscore.js:60, server/src/leaderboard.js:65. A crop-level table in the `GATHER_REQ_LVL` style fits naturally, mirror-audited.
- **Guests.**
  - Decide what a visitor may do; watering only, for example.
  - Pay any visitor reward through `_creditPlayer` with a deterministic opId.
  - Cap visitor help per owner per day, so alternate accounts cannot farm it.

### Gaps
- I did not read anticheat.test.mjs or docs/ANTICHEAT-SPEC.md in detail.

## 6. Play time: the 2 h/day free cap and the $2 supporter pass

### Takeaway
The cap is not implemented anywhere. It is the owner's stated intent in WORLD-ARCHITECTURE §11, marked "not built yet", with the server meant to count the hours per character. Offline crop growth runs on the wall clock, so no cap on online time affects it. Only the actions (planting, watering, harvesting) would use capped time.

### Cited Findings
- [does not exist] Any supporter-pass or play-time-cap code in server/src or src (grep).
  - The only "playtime" is a leaderboard column the client supplies: `playtime: rpgData?.playtime || 0` (server/src/leaderboard.js:44, 96; server/src/index.js:5706).
  - There is also a note in server/src/chainscore.js:18.
- WORLD-ARCHITECTURE §11: "The business model (the owner's intent; not built yet): free play up to 2 hours a day, and a $2-a-month supporter pass for unlimited play. The server counts the hours, per character (§1): the phone cannot be trusted with it." — docs/WORLD-ARCHITECTURE.md:383-385
- "The cap is not needed to control costs ... The cap's only job is to be a reason to buy the pass." — docs/WORLD-ARCHITECTURE.md:442-443. Notes on card fees, merchants of record and selling on the web follow at docs/WORLD-ARCHITECTURE.md:444-456.
- Machinery for counting time online already exists:
  - the `nml_state` timers count down only while the player is connected (docs/ARCHITECTURE-HANDOFF.md:73);
  - activity is judged on the server for the AFK check, after 2 minutes (docs/WIRE-PROTOCOL.md:372-380).

### Inferences
- Farming with long timers suits a capped free tier. Crops grow around the clock while the player spends their 2 hours elsewhere, and a 2-minute visit to harvest and replant uses little of the cap.
- If a cap is built, growth must stay on the wall-clock `readyAt`. Tying growth to online time, as `nml_state` does, would break offline growth.
- Whether a capped player may still look at their farm, and whether supporters get farm perks (extra plots, for example), are product decisions, not code constraints.

### Gaps
- No design exists for what the cap counts (time connected, or time with active input) or for what happens at the cap (a kick, or read-only play).

## 7. Scale and cost: message rate, rows written, and whether a farm needs its own Durable Object

### Takeaway
Cloudflare's guidance is that one Durable Object (DO) handles about 500–1,000 incoming requests a second. Today's room is limited by two things, neither of them CPU:
- incoming moves: each moving phone sends 15–30 a second;
- phone download: about 4 KB/s per moving player nearby.

CPU is 0.16 ms of a 22 ms tick at 60 players.

Farm actions are taps, negligible beside moves, provided that:
- each user action is one message;
- nothing polls;
- farm events go only to the farm's occupants.

Rows written are the second-largest cost line. Per-player Farm DOs are not needed at today's scale of 60 concurrent players or fewer. The splits the docs plan (area servers, a character vault per player, market/social/directory services) are targets, not code.

### Cited Findings
**Which DOs exist** — [exists and works]
- The GameRoom, one shared room (server/src/index.js:206-228).
- The Leaderboard, 'global' (server/src/index.js:252-261).
- Feedback, 'global' (server/src/index.js:291-292).
- The Marketplace and Arena DO classes are still bound in wrangler but retired from routing (server/wrangler.toml; docs/ARCHITECTURE-HANDOFF.md:272-275).
- The DOs were created by the free-plan migration `new_sqlite_classes`, tag v1 (server/wrangler.toml). A new DO class would need a new binding and a new migration tag.

**Room limits** — [exists and works]
- `MAX_PLAYERS 60` is "a RECEIVER-side number ... ~4KB/s of download per co-located moving peer ... ~20 people in one zone is the real comfort limit". — server/src/index.js:762-769
- CPU: 0.16 ms of 22 ms at 60 players (server/test/load-crowd.mjs), as cited in the room-full comment at server/src/index.js:4544-4566.

**Cost (docs/WORLD-ARCHITECTURE.md, a target document)**
- The Cloudflare DO pricing table, read 2026-09-29 (docs/WORLD-ARCHITECTURE.md:285-301):

  | Item | Price |
  |---|---|
  | Requests | $0.15 per million (20 incoming WebSocket messages count as 1 request) |
  | Outgoing messages | free |
  | Duration | $12.50 per million GB-s, at 128 MB per room |
  | Rows written | $1.00 per million (50 million included) |
  | Rows read | $0.001 per million |
  | Storage | $0.20 per GB-month |

- "A room with a running game tick ... cannot hibernate ... An empty room stops its tick ... and costs nothing". — docs/WORLD-ARCHITECTURE.md:304-305
- About $0.001 per player-hour (docs/WORLD-ARCHITECTURE.md:308-316):
  - messages in: $0.0004–0.0008, at 15–30 messages a second;
  - saves: about $0.0004, at 340–450 rows an hour;
  - room time: about $0.0001.
- "Cost follows players, not rooms ... many nearly empty rooms, each paying its half-cent an hour" wastes money. — docs/WORLD-ARCHITECTURE.md:322-326
- "one Durable Object handles about 500–1,000 requests a second"; "one room tops out around 30–60 busy players"; "200 in one room will not work". — docs/WORLD-ARCHITECTURE.md:329-343
- The planned fixes (docs/WORLD-ARCHITECTURE.md:345-372):
  - a message diet of about 5 Hz, sent with direction and speed. The server must fill in between messages: a plain 5 Hz made chasing monsters rubber-band in v2.3.1635;
  - 11 area servers per world, about 100 players each;
  - a handful of big worlds.
- After the diet, "saves are the biggest line". — docs/WORLD-ARCHITECTURE.md:458-461

**The character vault** — [does not exist]
- "one Durable Object per player id ... the character's home"; rooms borrow it with a lease; mail lives in the vault; a social service holds friends, clans and presence (docs/WORLD-ARCHITECTURE.md:103-133).
- Hand-offs between services commit locally first, then send with an opId that the receiver applies once (docs/WORLD-ARCHITECTURE.md:134-138).
- It is step 6 of the build order, "Before launch" (docs/WORLD-ARCHITECTURE.md:258). In the §1 table, "Owned" state lives "outside every room" (docs/WORLD-ARCHITECTURE.md:36-50).

**Rows and event fan-out**
- Coalescing the regen write cut rows from 5,455 to 341 per player-hour. On the free tier's 100k rows a day, "rows bind before requests". — docs/ARCHITECTURE-HANDOFF.md:107-122
- The default relay pushes into a room-wide `eventBuffer` that is fanned out to every socket, capped at 500 events and 64 KB per tick. — server/src/index.js:770-791, 5490-5578; server/src/tick.js:295-300

### Inferences
- **The farm's message budget.**
  - Send one message per deliberate action ("plant plot 7"), and batch multi-plot actions into one message.
  - The client never polls timers: it counts down from `readyAt`. The server sends no per-second pushes.
  - Farm events go only to occupants, in the area_chat pattern.
  - Even a busy farmer at about one action a second adds only 3–7% to a moving player's 15–30 messages a second.
- **Rows.**
  - One `farm:<pid>` put per value-bearing action, about one row.
  - A 10-minute session of 100 actions is about 100 rows, roughly $0.0001.
  - Avoid per-plot keys, which mean more rows per action, unless farms grow large.
  - Never `storage.list()` all farms on a hot path (a rule 9 stall). Any global sweep must be a paged job.
- **A DO of its own? Not now.** Everything a farm settles against is in the GameRoom, and a per-player Farm DO would force a cross-DO hand-off on every harvest. The case for a separate DO arrives with the character vault and the split into many worlds. Designing `farm:<pid>` as a self-contained record settled by opIds keeps that later move mechanical: the record would migrate into the vault along with mail.
- **Memory.** A farm record is small (tens of plots), so caching every occupied farm (60 at most) is trivial within 128 MB.

### Gaps
- The real cost per message of farm actions cannot be measured without a load test, which was not run.
- Cloudflare limits (value size per key on SQLite-backed DOs, request limits) were not re-checked against Cloudflare's docs; only the repo's reading of 2026-09-29 is cited.

## 8. Testing and shipping conventions

### Takeaway
A farm PR must ship:
- a zero-dependency server suite added to the `npm test` chain in `server/package.json` (84 suites today; CLAUDE.md's "twenty" is out of date);
- a `docs/specs/farm.md` spec with its wire table;
- a clean pass of the mechanical audits (wire, caps, opId, mirror);
- `node tools/dev/precheck.mjs`, run before every push.

The UI is checked with mp-* Playwright scenarios against a local wrangler worker. These are off the PR path. iPhone Safari touch is the primary platform.

### Cited Findings
- `npm test` chains 84 `node test/*.test.mjs` suites (server/package.json, scripts.test). server/test holds 87 files, including load-crowd.mjs and load-tick.mjs, which are not in the chain. CLAUDE.md still says "twenty zero-dependency suites ... 450+ assertions", which is out of date.
- The harness shape: a Map-backed storage mock with prefix `list`, a `fakeWs` that collects sent JSON, `check()` counters, a join helper that goes through the real `webSocketMessage`, exit 1 on failure, and registration in package.json. — docs/ARCHITECTURE-HANDOFF.md:276-281
- The audits:
  - **wire-audit:** every emitted type must be in PRIVILEGED_EVENTS (docs/ARCHITECTURE-HANDOFF.md:189-191).
  - **caps-audit:** every advertised caps flag must be read on the client as `_serverCaps.<flag>`, and every flag the client reads must be advertised; floors make it fail loudly if extraction breaks (server/test/caps-audit.test.mjs:1-37).
  - **opid-audit:** every `this._creditPlayer(` call's opId must start with a deterministic `'word:'` literal (server/test/opid-audit.test.mjs:1-28).
  - **mirror-audit:** the server and client mirror tables must match (server/test/mirror-audit.test.mjs:1-21).
- precheck runs these checks (tools/dev/precheck.mjs:1-80):
  - syntax, and duplicate switch cases;
  - the claimed version tag must be above the high-water mark;
  - raw damage-popup pushes;
  - the storage-key registry;
  - proto-safety (a WARN);
  - the server tests, also run when src/ changes;
  - the worker entry's exports;
  - the shim allowlist (a WARN);
  - hair-mask parity.
- The process (docs/ARCHITECTURE-HANDOFF.md:611-641; CLAUDE.md "AI session protocol" and "Deployment"):
  - the SessionStart hook `tools/dev/session-brief.mjs` gives the next free v2.3.N tag and the branches in flight, and the session claims one tag;
  - precheck before every push, and `/repo-review` plus TRAPS before risky diffs;
  - one system per PR, with PR text in plain language for an owner who is new to coding;
  - never deploy the worker locally; the server deploys on a merge to main that touches server/**.
- QA: tools/qa/mp/ holds 449 files (the mp-* scenarios), run only via workflow_dispatch. npm install, build and preview, and `wrangler dev --local`, all work in the sandbox. — CLAUDE.md, "Testing"
- Zone tables: a zone added on the client must be added to the server's `VALID_ZONE_IDS` in the same PR, and zones.test.mjs fails CI on drift. — server/src/data.js:397-401; server/src/movement.js:146-152

### Inferences
A farm feature would naturally need:
- `farm.test.mjs`, covering plant, ready, harvest, the opId 'dup' case, the entry check, the kill switch, a visit to an offline owner, and a deploy wipe;
- mirror-audit entries for the crop table;
- a caps flag that the client reads (caps-audit);
- PRIVILEGED_EVENTS entries (wire-audit);
- rows in the storage-key registry (precheck);
- an `mp-farm*` scenario with two browsers: the owner, plus a visitor on `?guest=1`.

### Gaps
- I did not open an existing mp-* scenario or the QA harness, so its API is not described here.
