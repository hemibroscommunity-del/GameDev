# The wire, read: every message and every route, one row each (tag 5029)

Card C of the grand plan (`docs/plan/cards/C.md`): step 4.1's census as a
document, with step 11.1 ("who may start a thing") as one of its columns.
Read from `main` at `2d4138e` (tag 5020), 2026-11-13. It changes no code.

**Who reads this.** Card N builds the worker's wire table and its guard from
these rows. Cards K, E, Q and R read single columns: the claims (4.2), the
request ids (11.3), the words (11.4), the roads that move value. Nobody needs
the whole page: find a message by its name
(`grep -n -A 14 '^#### .shop_sell. (phone to worker)' docs/plan/census/wire.md`).

**How it was made.** A script counted every key from the code (part 8 says
how). Readers then read every handler, a family each, and wrote one row a key
on a fixed form. A second script put the rows together, held them to the
counts, and checked every file and line a row cites. A row says what the code
does today. It is not a design.

**Line numbers are `main`'s at `2d4138e`.** They drift with every merge. The
name of the method beside a line is what to search for.

## 1. How to read a row

Parts 3 to 6 hold the rows. A row is a heading (the message's name and its
direction, or an HTTP method and path) and one labelled line a column.

| Part | What | Direction | Comes in |
|---|---|---|---|
| 3 | every `case` of the worker's router | phone to worker | the socket |
| 4 | every type in `RELAY.TYPES` | phone to worker to the other phones | the socket, the router's default branch |
| 5 | every type in `PRIVILEGED_EVENTS` | worker to phone | the socket |
| 6 | every HTTP method and path | request and answer | a public route, an admin route, or another server object |

A type that is on two lists has one row for each direction it travels, never
two rows for one direction. `party_chat` is a router case (part 3) and a
privileged type (part 5): two rows. `player_state` is a privileged type and a
case of the phone's direct switch: one row, in part 5, whose handler line
names the direct case. Part 8 names the row of every key on every list.

Inside a part the rows are grouped by family (the session, combat, the
shop...), a family in the order of the list it was counted from.

### The columns

- **Handler**: the file and line that takes it, then the method it hands to.
- **Sent by** (parts 3 and 4): one place the phone sends it from, or "no
  phone sends it".
- **Envelope**: how it arrives. Phone to worker: alone, or as one part of a
  bundle (part 2.1). A relay: rebuilt by the worker, out in the tick's
  events. Worker to phone: alone (a frame of its own), or in the tick's
  events, and to whom.
- **Sender's phase**: what the code demands of the sender today, in the
  order it checks. "joined" is the router's own gate. "nothing else checked"
  means exactly that.
- **Who may start it**: see below.
- **What it does**: one or more of **reads**; **changes your own state**;
  **moves value out** (gold, goods or a pet leave the sender's account:
  *burn*, *move to* someone, or *escrow*); **cannot be undone**; **speaks**
  (puts a player's words or a social ask in front of another player);
  **plays** (acts in the world as the character, in real time). A message
  that makes value says "changes your own state (mint: ...)".
- **Request id**: the field that stops a repeat acting twice, and where it
  is kept; or "none: a repeat acts twice", with what the second one does; or
  "none: a repeat changes nothing", with the state that stops it. A field
  that is a place in a list (a stash index) and not an id is called that.
- **Fields, and the trust in each**: every field the handler reads.
  - **request**: names what the sender wants; the worker judges it against
    its own state;
  - **look**: cosmetic; kept or passed on for drawing, read by no rule;
  - **claim**: a fact the worker takes on the phone's word with no check;
  - **bounded claim**: believed only inside a bound; its judge is named;
  - **words**: text a player wrote, with where it is cleaned and who reads
    it;
  - **not read**: the phone sends it and the worker never looks.
- **Absent, and a bad value**: what a missing payload or field means, and
  what a bad value gets: clamped, dropped (silently), refused (with which
  answer), or nothing (taken as it is).
- **Notes**: the answer it sends, its pace lane, its live flag.

For a row of part 5 the sender is the worker, so the columns turn round:
"the phone's own check" is what the phone demands of the frame (several
direct cases refuse a relayed copy), "what the phone does" is what happens
on receipt, and a field is **the worker's own**, an **echo** of the request,
a **look** passed on from another phone, or **words** a player wrote.

### Who may start it: how the column was filled

The card gives five answers and one list. This page applied them as a rule,
so the column can be checked:

1. **never a helper (class)**: the row is one of the card's seven classes:
   combat, movement, gathering, chat, trades, wagers, the account itself.
2. **a helper with a grant (scope)**: only the three scopes pillar 11.7
   names. *read*: reads the player's own things or a public board. *list*:
   puts the player's goods up for sale on the market or the auction house,
   or takes them down. *buy*: buys with the player's gold.
3. **a person**: everything else a player starts. The card neither grants
   it to a helper nor forbids it (crafting, gear, the farm, quests, the
   bank, pets). It is the open set: the owner's call, asked once in this
   card's status file.
4. **the owner**: an admin-keyed route.
5. **the system**: what only the worker or another server object starts.

A row on a border says "(border: why)". No helper exists today: every row a
phone sends is started by a person's page.

### Hidden settings

`server/src/hidden.js` holds numbers the owner keeps private. A row names
the constant and never its value.

## 2. What every message meets before its handler

A row's phase column starts after these. They are written once here.

### 2.1 Phone to worker (`server/src/index.js`)

In order, for every frame:

1. **The frame** (`webSocketMessage`, 5025). A frame over
   `MAX_INBOUND_BYTES` (16 KB) is dropped before it is parsed. JSON that
   does not parse, or is not an object, is dropped. No answer either way.
2. **A bundle** (5077, `server/src/bundle.js`). A JSON array is several
   messages in one frame: at most `BUNDLE.MAX` (24), each a plain object,
   never a `join`. Each part is taken in order and finished before the next
   begins. A part that throws does not stop the rest. So every row of part 3
   but `join` arrives "alone or in a bundle".
3. **The socket's budget** (`_onMessage`, 5099, `flood.js` `_floodMsgOk`).
   Every message, and every part of a bundle, spends one token
   (`FLOOD.MSG_BURST`, `FLOOD.MSG_PER_S`). Past it the message is dropped;
   a socket that keeps on is closed (`CLOSE_FLOOD` 4012).
4. **Nothing before the join** (5105). A socket with no `session.id` is
   taken for `join` and `pong` only. This is "joined" in every phase column.
5. **The AFK clock** (5131 to 5154). `pong` never stamps it; `track` only
   with `data.aw === 0`; `move` only when something about the player
   changed; every other type does.
6. **The ride** (5159, `ride.js:76` `RIDE_ENDS_ON`). Thirteen types put a
   rider off the skateboard before their handler runs: `player_attack`,
   `monster_damage`, `arrow_blast`, `node_strike`, `extraction_start`,
   `ability_use`, `ability`, `element_burst`, `nml_attack`, `pose`,
   `trap_arm`, `dungeon_start`, `race_start`.
7. **The fight lock** (5166, `fightlock.js:232` `FIGHT_GATED`). A sender in
   a fight with a player in No man's land is refused by the router itself
   for the rows of `FIGHT_LOCK` that carry a `refuse`; the other rows of
   that table refuse inside their handler. A row's phase column says which.
8. **The case** (the switch, 5168). Most cases read `msg.payload || msg`:
   the fields may sit in `payload` or on the message itself.

### 2.2 The default branch: a relay (`server/src/index.js:6304`)

A type with no case:

1. is dropped if it is in `PRIVILEGED_EVENTS` (6322);
2. is dropped if it is not in `RELAY.TYPES` (6325), unless the live flag
   `relaylist` is false;
3. `player_projectile` has its draw or gather stamped (`_dgShot`, 6331);
4. spends the relay budget (`RELAY_BURST` 8, `RELAY_REFILL_PER_S` 4), or,
   for chat and emotes, the social allowance (`chatguard.js`); past it,
   dropped silently;
5. is rebuilt (`relay.js` `_relayBuild`, 6382): a new `{type, payload}`
   and nothing else, the payload's `id` the sender's, and its `from`,
   `playerId`, `fromName`, `playerName`, `name` the worker's own wherever
   the phone put one;
6. meets its own hook: chat and emote are cleaned or dropped (6387, 6391);
   a trade, a duel and a threat are settled or dropped by their intercepts
   (6397 to 6427); a clan invite is recorded, or dropped when clans are
   parties;
7. is stamped `from` (6428) and pushed to `eventBuffer` (6431).

### 2.3 Worker to phone

- **Alone**: `ws.send`, `broadcastAll` or a module's own send. It arrives at
  `ws.onmessage` (`src/networking/wsClient.js:947`) and its direct switch
  (985). A type with no direct case falls to `default:` (4171), which hands
  it to `processGameEvent` (`src/networking/gameEvents.js:280`).
- **In the tick's events**: what the worker pushes to `eventBuffer` goes out
  inside the next `tick`, as `events[]` (`tick.js` about 750; at most
  `EVENTS_PER_TICK_CAP` and `EVENT_BYTES_PER_TICK` a tick, the rest kept
  for the next). The phone hands each to `processGameEvent`
  (`wsClient.js:1196`), never to the direct switch. `eventplace.js` decides
  who gets each: a type it places goes to the players it names and those
  near it; every other type goes to every phone in the room. Chat and
  emotes are held back from a phone that muted the speaker.
- On the phone, the worker's stamp wins: `payload.id = from || payload.id`
  (1209 and 4175).

### 2.4 HTTP (`routeHttp`, `server/src/index.js:300`)

Every answer carries `Access-Control-Allow-Origin: *`. A path under a room
needs a room name the worker makes (`flood.js` `roomNameFor`), or it is a
404 "no such room".

| Path | Who answers |
|---|---|
| `/ws` | the room (`GameRoom.fetch`, 4865), after the origin check (`origin.js`) |
| `/api/lobby`, `/health`, anything else | the worker itself |
| `/api/market*` | the room: `market.js` `_marketFetch` |
| `/api/store*` | the room: `store.js` `_storeFetch` |
| `/api/arena*` | the room: `gladiator.js` `_arenaFetch` |
| `/api/account*` | the room: `account.js` `_accountFetch` |
| `/api/botstat*` | the room: `botfp.js` `_botfpAdminFetch` |
| `/api/admin*` | the room: `admin.js` `_adminFetch` behind the owner's key, which answers its own routes and hands the rest on in turn (part 6 has each: the device lock, the live flags, the capes, the chain status, the chat reports, the test levers under `/dev/*`) |
| `/api/leaderboard*` | the Leaderboard object; from outside, GET only |
| `/api/feedback*` | the Feedback object |

## 3. Phone to worker: the router's cases

Direction: phone to worker. Comes in: the socket. One row for each `case` of `server/src/index.js` `_onMessage`, by family, in the router's own order inside a family.

### 3.A the session: join, move, track, pong (4)

#### `join` (phone to worker)

- **Handler**: server/src/index.js:5169 -> server/src/join.js:626 _handleJoin
- **Sent by**: src/networking/wsClient.js:687 (the socket's onopen; a frame of its own)
- **Envelope**: alone only (server/src/bundle.js:49 drops a join that sits inside a bundle)
- **Sender's phase**: the socket itself got through /ws first: the page's origin, the room's cap, the address's limits (index.js:4943-4953) | not yet joined on this socket (a second join closes it 4011, index.js:5176) and joined within FLOOD.JOIN_WINDOW_MS of opening (flood.js:170) | the identity gate (id, phrase, device, verify: see fields) | not frozen (frozen:\<id>, join.js:726) | no body of this id still lingering in a fight somewhere else (linger.js:196) | nothing asked of the character's life: a record at 0 health is stood up in town, or resumed as the same death from its life:\<id> note
- **Who may start it**: never a helper (the account itself)
- **What it does**: changes your own state (opens the session; builds the player from the stored record, or makes a new character from the worker's own defaults, mint: NEW_CHARACTER_COINS; writes auth:, char:, rpg:, device:, botstat: as needed; drains the mail; takes over any other socket of the same id, closed 1000) | cannot be undone (a bp_ character's name and look are written once to char:\<id>, first write wins; a first phrase registers the id to that key) | speaks (the name and look go to every other phone as player_join)
- **Request id**: none: a repeat changes nothing new (on the same socket a second join is closed 4011; on a new socket it takes the session over and the stored record wins, so nothing is made twice)
- **Fields**:
  - id: request (the character asked for, judged by the key below; a STRING in MAGIC_IDS is refused 'auth'; its type is never checked and a falsy one skips the gate: see found)
  - phrase: request (the Login Key: SHA-256 against auth:\<id>.pfHash, join.js:488 _verifyJoinAuthNow, or a new key's fingerprint in auth.keys, loginkeys.js:88 _keyJoinCheck; five wrong ones lock the id 60 s; the first phrase for an id with no record REGISTERS it; no phrase on an id with no record is let in as a guest, handoff rule 21)
  - device: claim ({id, env} or a string, cleaned to a-z0-9_- of BOTFP.DEVICE_ID_MAX: the device lock, devicelock.js:226 _deviceLockJoin, honours the key only from a listed device and takes the FIRST device named for a character with none; the login wheel counts one account a device; botfp's device: record)
  - verify: request (a Turnstile token of VERIFY.TOKEN_MAX at most, checked with Cloudflare by verify.js:67 _verifyToken, asked only of a character that does not exist yet and only when configured; and botsig's one re-check)
  - name: words (top level; session.name = sanitizeDisplayName, join.js:207: cut to 64, control characters to spaces, trimmed, 'Anon' when empty; a stored character's name replaces it; read by the leaderboard row; ALSO sent raw to the others: see found)
  - protocolVersion: request (2, anything else 1)
  - pres: request (2, with protocol 2: far players only while the map is open)
  - nj: request (1, with pres 2: a snapshot of the players around only)
  - wn: request (1, with protocol 2: the Wheel with only the monsters around)
  - ws: request (the Wheel sizes this phone draws: wheeltables.js:77 cleanWheelSizes keeps the listed sizes, eight at most)
  - rb: request (1: a mystery piece waits unrevealed in the bag)
  - fs: request (1 or 2: the free-swing trial for this phone's sword, read at every swing with the live switch)
  - tb: request (1: this phone can be placed, so a join over a live session in a fight keeps the body, bodytake.js:64 _bodyTakeWants)
  - kv: request (2: this phone can take a new Login Key, loginkeys.js:108 _keysAfterJoin)
  - httpAuth: request (truthy: this player's HTTP economy calls must carry the session token; absent: they are taken on the player's id alone, httpauth.js:41 _httpAuthMint)
  - data.x, data.y: bounded claim (judge: lastplace.js:168 _placeOnJoin, from where the worker last had this id, at the walk's bound x SPRINT.MULT for the time away, past it followed; NOT judged with no memory of the id (a first join, after a deploy, an emptied room), in test mode, or for a place outside the Wheel; finite numbers only)
  - data.z: request (movement.js:415 _validZone and never a retired land, zonejudge.js; else today's town)
  - data.d: look (a string of 16 at most)
  - data.name: words (cut to 64, control characters KEPT; for a new bp_ character it is trimmed and becomes the permanent name, join.js:619; a stored name wins; it is the name state_sync and chat tell the others)
  - data.\<look>: look (JOIN_COSMETIC_KEYS, 41 keys with name: strings cut to cosmeticCap, 512 for avatar and the nine drawings, else 64; finite numbers; for a bp_ id the stored record's look wins and any of the 28 RECORD_LOOK_KEYS the record lacks is dropped; a new bp_ character's look is written once; clanTag and the card's AP are the worker's stamps)
  - data.rpgDef: bounded claim (judge: the clamp 0..2100 at join.js:1358, read on EVERY join; the PvP mitigation input, cut again where it is used by combat.js PVP_TUNING.DEF_CAP)
  - data.rpgAmuletHpRegen, data.rpgAmuletStaminaRegen: bounded claim (clamp 0..100; the regen tick reads them only under amuletregen: false)
  - data.rpgArmorStash, data.rpgLegsStash, data.rpgShieldStash, data.rpgGearStash: claim (merged into the worker's own gear stashes on EVERY join of a character on file, gearstash.js:540 _gearStashAdoptOnJoin: checked for shape, never for ownership; cut at gearStashCap(), marked prov legacy, a piece forfeited in No man's land refused by its id)
  - data.rpgLifeSkills: bounded claim (its gems only, max-merged once until the record carries gemsCaptured, amulet.js:397 _gemsAdoptOnJoin, GEM_BOOTSTRAP_PER_KEY_CAP)
  - data.rpgGoldNuggets, rpgGoldBars, rpgWeaponSkills, rpgWeaponUnspent, rpgWeaponSpecs, rpgDefenseSkill, rpgDefenseUnspent, rpgDefenseSpec, rpgHpSpec, rpgEnduranceSpec, rpgHpUnspent, rpgEnduranceUnspent, rpgPower, rpgVitality, rpgEndurance, rpgAgility, rpgMind: bounded claim (each read only while the stored record lacks that field, through its own sanitizer or clamp: join.js:1096-1135 and 1440-1478)
  - data.rpgHp, data.rpgMaxHp: look (the health the others draw for you until your first track)
  - data.rpgLv: not read (stamped to the worker's ps.level, join.js:1535)
  - every other data.rpg\* (rpgCoins, rpgInventory, rpgLevel, rpgXp, rpgWeapon, rpgWeaponStash, rpgArmor, rpgQuests...): not read for a character on file (the stored record wins); for an id with NO record every rpg\* key is dropped before anything reads it (join.js:1016-1020)
  - data.rpgAmuletStash: not read (named and left out on purpose, join.js:277)
- **Absent, and a bad value**: no data: a body at 0,0 in today's town with no look | no data.x or data.y: the place is not judged | no phrase: a registered id is refused 'auth', an unregistered one is a guest | no device: a device-locked character is refused 'device' unless it has no device yet | a refusal is a message then a close: join_rejected {reason} with 'auth' 4003 (wrong or missing key, a magic id), 'key' 4017, 'locked' {ms: 60000} 4018, 'device' 4016, 'frozen' 4004, 'verify' {sitekey} 4014; linger_wait {ms} 4010 | a failed or newer-version read of rpg:\<id> closes 1011 with no message; a throw closes 4013 | a look value that is neither a string nor a finite number is dropped; an unknown data key is dropped; an rpg\* container over JOIN_RPG_MAX_BYTES is dropped
- **Notes**: answered by state_sync, then player_state, then the join's own sends (rewards_state, pets_state, codex_state, achv_state, clan_state, key_new, body_place...); player_join to the others; player_count to all | the whole frame is held to MAX_INBOUND_BYTES (16 KB) | live flags read here: devicelock, keys2, linger, takeoverlinger, bodytake, lastplace, joinstandup, lifesave, retiredlands, max_players

#### `move` (phone to worker)

- **Handler**: server/src/index.js:5240 -> server/src/movement.js:422 _handleMove (then server/src/botsig.js:273 _sigOnMove)
- **Sent by**: src/networking/wsClient.js:6346 (the channelShim builds it from the page's move broadcast; batched, the latest wins)
- **Envelope**: alone or in a bundle (fields sit on the message itself, never in a payload)
- **Sender's phase**: joined | has state | a body taken over mid-fight moves nothing until its phone stands within LINGER.RESUME_PX of it (bodytake.js:114 _bodyTakeMove) | x and y must be numbers | NOT checked: alive (a dying or dead player's move is written like any other), in a fight
- **Who may start it**: never a helper (movement)
- **What it does**: plays (moves the character; changes its zone and is sent that zone's state; raises and lowers the guard and opens the parry window; marks a roll; shows what it is gathering; ends a pose, a ride, a race step; spends stamina on a sprint step)
- **Request id**: none: a repeat changes nothing (a move sets the place and the flags; the same place spends no budget, and only a false-to-true edge of blocking opens a parry)
- **Fields**:
  - x, y: bounded claim (judge: movement.js:144 _moveBudgetNow and MOVE_BUDGET: 500 px/s x the worker's own speed buff, move stat, ride and paid sprint, holding BURST_S of it plus SLACK_PX, plus a gust the worker blew; past it the worker's copy is taken as far as the budget reaches and follows on; no walls; NOT bounded in test mode, on a change of zone other than into the Wheel, or on the first move after a join the worker had no memory for)
  - z: request (movement.js:415 _validZone; a CHANGE also needs dungeon.js _dungeonIdDead false and zonejudge.js:167 _zoneJudgeRefuses false: a run's pass, the Wheel's safe ground, never a retired land)
  - sp: request (1: a sprint step, the bound x SPRINT.MULT; judge: sprint.js:96 _sprintAllowed: stamina left, guard not broken, not riding; billed in stamina by the step)
  - pd: request (1: "move me along my speed until my next move"; movepath.js:130 _movePathNote, only in the Wheel, with the live switch)
  - vx, vy: bounded claim when pd is 1 (the glide's speed, cut to the walk's bound and to MOVE_PATH.HORIZON_MS; the next move is judged from the last real one) else look (passed on in the tick; any truthy value also ends a pose)
  - blocking: bounded claim (the guard is up on the phone's word; judges: the guard-break latch ps._guardBrokenUntil at movement.js:795, the stamina drain in the regen tick, a sword's claim lowering it, moveclaims.js:157 _swingDropsGuard; it buys a blocked blow inside the arc, and a parry only when the raise follows PARRY_REARM_MS with the guard down, moveclaims.js:137 _parryRearmed)
  - ba: claim (the shield's angle: any finite number at any time, read by index.js:2857 _blockArcCovers; no limit on how fast it turns)
  - dodging: bounded claim (counts only inside the window a paid roll opened: movement.js:293 _rollOn for a player's blow, :315 _rollIFrames for a monster's; ROLL.MAX_MS)
  - ex: bounded claim for 'cook' and 'fire' (monsters leave the player alone; judge: gathering.js:925 _extractionShielded with moveclaims.js _cookShieldHolds: the worker's own fire, COOK_FIRE_REACH, COOK_FIRE_MS, COOK_REARM_MS) else look (what the others see you gathering); any value ends a pose
  - d, f: look (the facing the others draw) and claim (the front arc of a raised guard that carries no ba, moveclaims.js:109 guardFacing)
  - eqc, eql, eqs: look (the armour on show)
  - dead: not read for life or death (the worker's own word since tag 4373); a truthy one ends a held pose; under serverdead: false it is a claim again (life.js:250 _lifeDeadClaim)
- **Absent, and a bad value**: no x or y number: the whole move is dropped silently | no z: the worker's own zone | a refused zone: nothing is written and nothing is said (the next move is judged from where the worker has the player) | past the budget: followed, never refused (under movebudget: false the old way: refused silently) | d or f null or absent: kept as they were | ba not a finite number: null (the guard then covers the front arc of f or d) | blocking while the guard is broken: stays down | d, f, eqc, eql, eqs, ex, vx, vy of any other type or size: taken as they are (see found)
- **Notes**: no answer of its own; a zone change sends this socket zone_state (protocol 2) or zone_monsters, zone_nodes and zone_loot (protocol 1), and fire_trail for burning ground | the others learn of it from the tick's player entries | stamps the AFK clock only when its signature changed (index.js:4978) | test mode (testmode.js) skips the budget, never the zone checks | live flags: movebudget, rollwindow, serverdead, entrygrace, zonejudge, retiredlands, movepath, sprint, parryrearm, swingguard, blockarc, cookshield

#### `pong` (phone to worker)

- **Handler**: server/src/index.js:5248 (the case itself, no method)
- **Sent by**: src/networking/wsClient.js:4160 (a quiet phone: rides its next frame; else alone at 4165)
- **Envelope**: alone or in a bundle
- **Sender's phase**: none checked (the one type besides join taken from a socket that has not joined, index.js:5105); it acts only once the worker has pinged this socket (session.lastPing > 0)
- **Who may start it**: never a helper (the account itself) (border: the socket's own heartbeat, sent by the page with no act of the player's)
- **What it does**: changes your own state (session.rtt, the round trip the lag compensation uses; memory only, nothing written)
- **Request id**: ts: a number that is not the latest ping's stamp is not a sample (session.lastPing); a repeat of the latest one is taken again as a second, later sample
- **Fields**:
  - ts: echo (the worker's own ping stamp sent back; a non-number skips the check)
  - hd: bounded claim (the ms the phone says it held the answer, taken off the sample up to the whole of it; judge: LAGCOMP_RTT_CAP and the LAGCOMP_RTT_ALPHA average at index.js:5259)
  - the moment it arrives: bounded claim (the same judge: a late answer raises session.rtt up to the cap)
- **Absent, and a bad value**: no ts: taken as an answer to the latest ping | no hd: nothing taken off | before any ping: nothing happens | a bad hd (not a positive number): nothing taken off
- **Notes**: answers the worker's ping (tick.js:161); never stamps the AFK clock (index.js:5131) | session.rtt is read by combat.js:2303 (a PvP hit rewinds the target by half the attacker's rtt, at most LAGCOMP_BUFFER_TICKS) and by botsig.js:332 (taken off a reaction time)

#### `track` (phone to worker)

- **Handler**: server/src/index.js:5264 (the case itself) -> server/src/lookrelay.js:146 _lookRelay
- **Sent by**: src/networking/wsClient.js:6438 (channelShim.track; the page calls it every 2 s, src/ui/BroTown.jsx:8201)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined | data must be an object, else nothing | nothing else checked (not alive, no pace of its own beyond the socket's budget; a missing player state only skips the state write)
- **Who may start it**: never a helper (the account itself) (border: the page's own look-and-presence report, on a timer)
- **What it does**: changes your own state (the look, name and card the worker holds for you in session.data and on the player state; memory only) | speaks (what changed of it goes to every other phone as player_update; name, colour and the card's counters to the leaderboard row, index.js:6452)
- **Request id**: none: a repeat changes nothing (the same look relays nothing: lookrelay.js:95 lookDelta; the leaderboard report is throttled)
- **Fields**:
  - data.aw: claim (0 means "a finger touched the screen in the last two minutes": it alone stamps the AFK clock, index.js:5145; also passed on as the AWAY pip)
  - data.ac: bounded claim (three whole shot counts, a weapon each, or nothing; judge: accuracy.js:206 _accShotsIn, ACC.SHOTS_BURST and ACC.SHOTS_PER_S, ACC.COUNT_MAX; a stat, never a payout; not stored on the player, not relayed)
  - data.name: words (a string cut to 64, control characters KEPT, NOT held to the character's record; written to ps.name and session.data.name: see found)
  - data.\<look>: look (the other 58 keys of TRACK_COSMETIC_KEYS: a string cut to cosmeticCap, 512 for avatar and the nine drawings, else 64; null, a boolean or a finite number as it is; anything else dropped; kept in session.data and on the player state, x and y in session.data only)
  - data.x, data.y, data.dir, data.zone: look (a place hint for the others; never the worker's own place, TRACK_STATE_EXCLUDED)
  - data.rpgHp, data.rpgMaxHp: look (the health bar the others draw for you is this number, not the worker's)
  - data.rpgData: look (the inspect card: an object of at most TRACK_BLOB_MAX_BYTES when serialized, kept whole; its ap, title and rarest are the worker's stamps, achievements.js:553 _achvStamp; its lifeTotal, kills, dungeons, goldEarned and playtime go to the leaderboard row as the phone says)
  - data.color: look (also the leaderboard row's colour)
  - data.avatar: look (a string of 512 at most that another phone may load as an image address: see found)
  - data.rpgLv: not read (stamped to the worker's ps.level, prog3.js:1114 _levelStamp)
  - data.clanTag, data.clanColor1: not read (the registry's, clans.js:106 _clanStampTag)
  - data.cape: not read (the ledger's worn cape, eventcapes.js:438 _capeStamp)
  - the 28 RECORD_LOOK_KEYS: look (a key the character's record lacks is dropped, and the 12 drawings and patterns are forced to the record's, join.js:576 _stampRecordLook)
- **Absent, and a bad value**: no data, or data not an object: nothing | a key not on the list is dropped | a string over its cap is cut | an object under any key but rpgData is dropped | rpgData over the byte cap or cyclic is dropped | aw absent or not exactly 0: the AFK clock is not stamped | ac not three finite numbers in 0..ACC.COUNT_MAX: not read
- **Notes**: the others get player_update {id, data} with what changed, whole every LOOK_RELAY.FULL_EVERY_MS (lookdelta: false sends every one whole) | the leaderboard report is a cross-object fetch, at most every LEADERBOARD_MIN_MS | the acc: record is written at most every ACC.FLUSH_MS

### 3.C1 small session messages (9)

#### `pose` (phone to worker)

- **Handler**: server/src/index.js:5211 -> server/src/poses.js:48 _handlePose
- **Sent by**: src/game/interactions.js:94 (a pose set; :105 stand up)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; a pose SET also needs alive (not dead/dying) and the moves switch on (emotes.js:62 _movesOff), else it is read as stand up; nothing else checked (no fight, zone or place check)
- **Who may start it**: never a helper (movement) (border: a held pose is the body's own state, ended by a step; it comes from the emote picker but carries no words)
- **What it does**: plays (holds sit / sleep / flop / a dance on the player: ps.po, memory only, out on the tick's po to the phones near, tick.js:586); changes your own state (puts a rider off the board first: ride.js:76 RIDE_ENDS_ON)
- **Request id**: none: a repeat changes nothing (the same id is already held, poses.js:64; a set inside POSE.MIN_GAP_MS is dropped)
- **Fields**: id: request (judge: poses.js:41 poseListed, one of POSE.IDS; read from the message itself only, msg.id: the router hands msg whole, so a payload.id is never read)
- **Absent, and a bad value**: no id, null, or an id not on the list -> stand up (po cleared), no answer; a set sooner than MIN_GAP_MS after the last -> dropped silently
- **Notes**: answers nothing: the tick's po is the answer | the worker ends the pose itself on an accepted move (movement.js:820 _poseEndsOn) | no rule reads ps.po but the ride's refusal (ride.js:105) | live flags emotemoves, emotes; cap emotemoves

#### `ride` (phone to worker)

- **Handler**: server/src/index.js:5216 -> server/src/ride.js:110 _handleRide
- **Sent by**: src/ui/panels/RideButton.jsx:113 (through src/game/ride.js:85 toggleRide; also desktopControls.js:263, TownBoardPage.jsx:48)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; to get ON (ride.js:100 _rideRefusal): the switch on, alive, not disconnected, in zone wheel on BroTown's safe ground (wheelzone.js _wheelSafeAt, the worker's own place), not in a duel, not racing, harvesting, posing, blocking or rolling; to get off: nothing more
- **Who may start it**: never a helper (movement)
- **What it does**: plays (on the board the walk's bound is judged at RIDE.MULT: movement.js _moveSpeedK; the others see brd on the tick, tick.js:567); changes your own state (ps._ride, memory only)
- **Request id**: none: a repeat changes nothing (on while on, or off while off, is answered with the state as it stands; a toggle inside RIDE.TOGGLE_MS is answered why 'soon')
- **Fields**: on: request (strictly the number 1 = get on, anything else = get off; read from msg.payload, else msg.data, else the message itself)
- **Absent, and a bad value**: no payload or no on -> read as get off; a refused on -> ride_state {on:false, why: 'off' / 'dead' / 'where' / 'busy'}; too quick -> ride_state {on: as it stands, why:'soon'}
- **Notes**: answers ride_state every time | nothing stored | the worker ends a ride itself (ride.js:143 _rideEnd: edge, zone, dead, hit, fight, duel, off) | live flag ride; cap ride

#### `dice` (phone to worker)

- **Handler**: server/src/index.js:5221 -> server/src/dice.js:71 _handleDice
- **Sent by**: src/game/chat.js:85 ("/roll", "/roll N", "/flip" typed in the chat, against caps.dice)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the switch on; has state; alive (not dead/dying); DICE.GAP_MS since this player's last roll; nothing else checked
- **Who may start it**: never a helper (chat) (border: typed in the chat and shown as a chat line in the roller's name, though it carries no words of the player's)
- **What it does**: speaks (a number the worker rolled, shown in the roller's name to the players near: dice_roll)
- **Request id**: none: a repeat acts twice (each ask past GAP_MS is a new roll with a new number; inside it, dropped)
- **Fields**:
  - kind: request ('roll' or 'flip'; dice.js:54 diceAsk)
  - max: request (an integer 2..DICE.MAX_SIDES, absent = DICE.SIDES; not read for a flip)
  - both are read from the message itself only: the router hands msg whole, a payload is never read
- **Absent, and a bad value**: no kind, an unknown kind, or a max that is not an integer in range -> dropped silently; sooner than GAP_MS -> dropped silently
- **Notes**: answers nothing of its own: the roll is the dice_roll event, to the roller too | nothing stored, paid or staked; the value is fairInt from the crypto source | live flag dice; cap dice

#### `race_start` (phone to worker)

- **Handler**: server/src/index.js:5627 -> server/src/race.js:122 _handleRaceStart
- **Sent by**: src/game/race.js:76 (requestRace)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the switch on; has state, alive, not disconnected; in zone wheel; quest race_1 is 'active' on the worker's own record; RACE.START_GAP_MS since the last start; within RACE.START_R of Lil Bro's spot by the worker's own place
- **Who may start it**: never a helper (movement)
- **What it does**: plays (starts a race the worker judges on the moves it accepts: race.js:152 _raceOnMove; a win credits the quest objective 'race' and saves, race.js:185); changes your own state (ps._race, memory only; puts a rider off the board: RIDE_ENDS_ON)
- **Request id**: none: a repeat acts twice (a second start past START_GAP_MS replaces the race under way and its lap is lost; inside the gap it is refused 'soon')
- **Fields**: (none read: the router hands the handler the session only)
- **Absent, and a bad value**: nothing to be absent; a refusal is race_end {won:false, err: 'off' / 'where' / 'quest' / 'soon' / 'far'}; a dead, dying or stateless sender gets no answer
- **Notes**: answers race_state (the course in the room's coordinates, the gun in COUNTDOWN_MS), then race_cp and race_end as the moves come | live flag race; cap race

#### `heap_burn` (phone to worker)

- **Handler**: server/src/index.js:5634 -> server/src/heapburn.js:60 _handleHeapBurn
- **Sent by**: src/ui/BroTown.jsx:5884 (about once a second while the phone draws its boots in a burning heap: src/game/heapBurn.js)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the switch on; has state; in zone wheel; alive (hp > 0, not dead/dying), not disconnected, not a spar; not in an arena match or a duel; on BroTown's safe ground by the worker's own place (_wheelSafeAt); not harvesting (_extractionShielded); HEAP_BURN.EVERY_MS since the last tick
- **Who may start it**: never a helper (combat) (border: the claim is about where you stand, its effect is damage)
- **What it does**: plays (one tick of flame on the sender alone: HEAP_BURN.PCT of max HP, at least 1, through the hit door's heap row, hits.js:210; it can kill: cause monster:heap, a death's ordinary rules, the bag's Remains on the ground); cannot be undone (a death by it)
- **Request id**: none: a repeat changes nothing inside EVERY_MS (one tick a second however often asked); past it each message is one more tick
- **Fields**: the message itself, no field: bounded claim (judge: heapburn.js:60-70: the fire is on the phone's screen only and the worker holds no heaps, so "I stand in one" is believed wherever the worker's own place for the sender is safe ground, once a second)
- **Absent, and a bad value**: nothing to be absent; every failed check returns with no answer
- **Notes**: the tick is a monster_attack on the sender (ability 'heapburn', elem 'flame') | no save of its own (the vitals' coalesced save) | no test-mode exception | live flag heapburn; cap heapburn

#### `map_watch` (phone to worker)

- **Handler**: server/src/index.js:5723 -> server/src/presence2.js:64 _presence2Watch
- **Sent by**: src/game/presence2.js:136 (sendMapWatch: the world map opening, every MAP_HEARTBEAT_MS while open, shutting)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked (no playerState needed; the mark is set on any session and read by the tick only for a pres-2 phone with presence2 on, tick.js:662, 715)
- **Who may start it**: a person (border: a read, but of the live room's far players for this socket's own roster, not of the player's things or a board)
- **What it does**: reads (far players ride this socket's roster for PRESENCE2.MAP_WATCH_MS after each true; the first roster of a new watch carries every far player); changes your own state (session._mapWatchUntil, _mapWatchFresh: memory only)
- **Request id**: none: a repeat changes nothing (true again only pushes the watch's end out: it is the heartbeat)
- **Fields**: on: request (strictly true or false; msg.payload || msg)
- **Absent, and a bad value**: on absent or not a boolean -> ignored, no answer
- **Notes**: no answer of its own: the roster is | no pace but the socket's budget, no write | live flag presence2; cap presence2

#### `acc_request` (phone to worker)

- **Handler**: server/src/index.js:6143 -> server/src/accuracy.js:343 _handleAccRequest
- **Sent by**: src/game/accuracy.js:68 (askAccuracy, the Journey page)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; nothing else checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (your own shots and hits a weapon: the stored acc:\<pid> plus what is counted and not yet written)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: (none read: the router hands the handler the session only)
- **Absent, and a bad value**: nothing to be absent; the switch off -> acc_state {off:true}; a failed storage read -> a blank record, sent as zeros
- **Notes**: answers acc_state to the asker; awaited | live flag accuracy; cap accuracy

#### `feedback` (phone to worker)

- **Handler**: server/src/index.js:6285 (an empty case: break)
- **Sent by**: no phone sends it (the Feedback panels POST /api/feedback/submit: src/ui/panels/FeedbackPanel.jsx:581)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked
- **Who may start it**: a person
- **What it does**: reads (in name only: swallowed -- nothing is read, kept, answered or relayed)
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read: whatever an old page put in it is dropped)
- **Absent, and a bad value**: nothing to be absent
- **Notes**: the case is there so an old page's report is not relayed to the room by the default branch (tag 2820) | it still spends the socket's budget and stamps the AFK clock (index.js:5153)

#### `character_reset` (phone to worker)

- **Handler**: server/src/index.js:6295 -> server/src/persistence.js:418 _handleCharacterReset -> server/src/persistence.js:444 _resetCharacterData
- **Sent by**: src/ui/mobile/dash/SettingsPanel.jsx:214 (after its confirmation screen)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; confirm is true; not in a fight with a player in No man's land (fightlock.js row character_reset, switch fightlockreset: the HANDLER refuses, persistence.js:426); nothing else checked (no alive check, no pace, the Login Key is not asked again)
- **Who may start it**: never a helper (the account itself)
- **What it does**: cannot be undone (the character deleted: rpg:, gear_prov:, bank:, farm:, pets:, codex:, fishlog:, achv:, aponce:, testmode:, life:, acc:, the oplog:questitem: stamps, its place in a party; its board rows retired); moves value out (burn: all its gold, goods, gear, vault and pets)
- **Request id**: none: a repeat acts twice (the first closes the socket 4005, so a second needs a new join, and then wipes the new level-1 character and writes one more prereset snapshot)
- **Fields**: confirm: request (must be exactly true; msg.payload || msg)
- **Absent, and a bad value**: no payload, or confirm not true -> dropped silently (an accidental send is a no-op); in the fight lock -> character_reset_refused {reason:'fight', message}
- **Notes**: answers character_reset_done, closes 4005 and leaves through the session door ('reset') | only rpg: is snapshotted (rpgsnap:\<pid>:prereset-\<ts>, best-effort), so a restore brings back the character and not its vault, pets or farm | kept on purpose: auth:, friends:, inbox:, farmorders:, guild_claims:, daily_rewards:, nml_state: (docs/specs/character-restart.md:35-54) | the same wipe is reached by POST /api/account/reset (account.js:111)

### 3.C2 dungeons, the Bro check, live switches (3)

#### `bro_nonce` (phone to worker)

- **Handler**: server/src/index.js:5999 -> server/src/broverify.js:111 _handleBroNonce
- **Sent by**: src/networking/broWallet.js:153
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked
- **Who may start it**: never a helper (the account itself) (border: it begins proving a wallet is the player's own; the wallet's signature is the person's)
- **What it does**: changes your own state (a single-use challenge kept on the session for NONCE_TTL_MS, over any earlier one; memory only)
- **Request id**: none: a repeat acts twice (a new challenge replaces the last; one live nonce a session, so nothing piles up)
- **Fields**: (none read: the payload is ignored)
- **Absent, and a bad value**: nothing to be absent
- **Notes**: answers bro_nonce (the text to sign, built by the worker from the session's id, the chain id and the nonce); no pace of its own (the socket's budget only); the phone shows the control only against caps.broVerify

#### `bro_verify` (phone to worker)

- **Handler**: server/src/index.js:6002 -> server/src/broverify.js:129 _handleBroVerify
- **Sent by**: src/networking/broWallet.js:132
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; a live nonce on this session (minted by bro_nonce, under NONCE_TTL_MS old); one verify a BRO_VERIFY_GAP_MS a socket (else slow_down); no state or life checked
- **Who may start it**: never a helper (the account itself) (border: as bro_nonce)
- **What it does**: changes your own state (writes bro_link:\<pid> {address, ts, count, tokenId?} and sets the worker's own ps.bro / ps.broN, the badge and count the others are sent on the next tick)
- **Request id**: none: a repeat changes nothing (the nonce is burned before the chain is asked, server/src/broverify.js:139: a second answers nonce_expired)
- **Fields**:
  - signature: bounded claim (judge: shape 0x + 130 hex, then server/src/onchain.js:285 verifyBroOwnership or :266 verifyBroWallet recover the signer of the worker's OWN nonce text; the phone never supplies the text or the address)
  - tokenId: request (a whole number 1..MAX_TOKEN_ID; the chain's ownerOf must name the signer; optional in count mode, where a token that is not the signer's is dropped, not refused)
  - count: request (truthy picks the wallet check: the chain's balanceOf for the signer, capped MAX_BRO_COUNT)
- **Absent, and a bad value**: no nonce or an old one: refused nonce_expired; tokenId missing (old mode) or out of range: bad_token_id; a signature of the wrong shape: bad_signature; the chain not answering: chain_unreachable; not the holder: not_owner / no_such_token; every refusal is bro_verify_result {ok:false, reason} and changes nothing (but the nonce is spent from bad_token_id on)
- **Notes**: answers bro_verify_result; it AWAITS the chain (two or three RPC fetches: the room's input gate is open meanwhile, handoff rule 9), then awaits the put; nothing judged before the wait is trusted after it but the nonce, already burned; the switch broCount: false only withdraws the cap, the worker still answers a `count`; bro_link is not among the keys a character restart deletes

#### `dungeon_start` (phone to worker)

- **Handler**: server/src/index.js:6081 -> server/src/dungeon.js:316 _handleDungeonStart
- **Sent by**: src/game/wheelDungeons.js:204 (a mouth in the world: {entrance}); src/ui/panels/DungeonCreatorPanel.jsx:884 (the Workshop: {config})
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlockdoor: the router refuses, answering dungeon_error not-now, server/src/fightlock.js:194); the flag disable_dungeons off; has state; alive (not dying/dead); no run of your own with someone still inside; under DUNGEONS.MAX_INSTANCES in the room; with `entrance`: the switch wheeldungeons on and the sender in the Wheel within WHEEL_DUNGEON.DOOR_R of that mouth (server/src/wheeldungeon.js:152 _wheelDungeonConfig); with a config: no place checked
- **Who may start it**: never a helper (movement) (border: it opens a fight's arena and takes the character into it, combat as much as movement)
- **What it does**: plays (opens a private run 'dungeon:\<id>' with wave 1 spawned and gives the sender the pass to step in, zonejudge.js PASS_MS; a party leader's start also pulls up to three members beside them, server/src/dungeon.js:394 _dungeonPullPartyMembers; ends an empty earlier run of yours); changes your own state (mint, later: the clear pays gold and XP sized by the config's waves, level, boss and monsters a wave, server/src/dungeon.js:887 _dungeonComplete)
- **Request id**: none: a repeat acts twice (each one ends your own empty run and opens a new one; refused already-running only while someone stands in the old one)
- **Fields**:
  - entrance: request (a mouth's id; judge _wheelDungeonConfig: a known door with spawns, the sender at it; the config is then all the worker's own)
  - config, or the payload itself when it has no `config`: request, every part clamped by server/src/dungeon.js:281 _dungeonSanitizeConfig
  - config.name: words (String, first 24 characters, not cleaned; echoed in dungeon_started to the owner and to each party member pulled)
  - config.terrain: look (first 24 characters; no rule reads it)
  - config.width 20..40, config.height 15..35: request (clamped)
  - config.waves: request (1..DUNGEONS.MAX_WAVES)
  - config.monsterLevel: request (1..the lower of the owner's level and LEVEL_HARD_CAP)
  - config.element, monsters[].element: request (one of VALID_ELEMENTS, else none)
  - config.monsters[]: request (the first MAX_GROUPS; archetype an own key of ARCHETYPES, else fodder; count 1..MAX_GROUP_COUNT)
  - config.hasBoss: request (a boolean)
  - config.bossArchetype: request (as archetype; brute when absent)
  - config.bossMultiplier: request (BOSS_MULT_MIN..BOSS_MULT_MAX)
- **Absent, and a bad value**: no payload, or one with neither field: a default Workshop run (25x20 'Dungeon', 3 waves, level 1, four fodder, no boss); a bad number: clamped, or its default; an unknown archetype or element: fodder / none; `entrance` not a string: read as a config; an unknown or far mouth: refused dungeon_error not-here; the mouths switched off: refused closed
- **Notes**: answers dungeon_started (to the sender and each member pulled) or dungeon_error {code, message}: disabled, not-now, already-running, room-full, closed, not-here; ends a ride (RIDE_ENDS_ON); no pace; memory only, nothing stored

### 3.D1 combat, the phone's claims (9)

#### `player_attack` (phone to worker)

- **Handler**: server/src/index.js:5369 -> server/src/combat.js:2297 _resolvePvPAttack (first server/src/moveclaims.js:157 _swingDropsGuard)
- **Sent by**: src/game/monsterCombat.js:3300 (a swing, as a broadcast event the shim sends direct at src/networking/wsClient.js:6395), src/game/projectiles.js:2552 (an arrow or bolt, at its impact), src/game/monsterCombat.js:3380 (a swing at a sparring clone)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; ends a ride (RIDE_ENDS_ON); has state; alive (not dying, dead or disconnected); not staggered by a parry (pvpextras.js _pvpStaggered); a melee kind not dazed (pvplunge.js _pvpDazed); then target by target: same zone as the sender, target not dead or disconnected, PvP allowed for the pair (index.js:3099 _pvpAllowed: a duel's or arena's consent, No man's land's rule, a sparring pair; never a Wheel spectator), inside the range and arc measured from the worker's own copy of the attacker to the target's rewound place, the pair's lane free, the target not in a paid roll's i-frames. Not on the fight lock (fightlock.js OPEN_GROUPS)
- **Who may start it**: never a helper (combat)
- **What it does**: plays (a blow at a player: the worker rolls it (combat.js _rollHit through pvpbalance.js _pvpRollFor), takes the target's health in _applyDamage and may kill; it ends the sender's own harvest, and a sword's claim lowers the sender's raised guard); cannot be undone (in No man's land a landed hit skulls both players (nomansland.js _nmlOnHit) and a kill takes the victim's bag)
- **Request id**: sw: a sword's swing lands one hit a swing id on each pair (pvpbalance.js:135 _pvpMeleeLane, the pair's lane, in memory), a drawn arrow or gathered bolt takes each target once a shot (drawgather.js:302 _dgTake). With no sw: none: a repeat acts twice (it lands again as soon as the pair's lane allows: PVP.NOSW_LANE_MS for a sword, PVP_TUNING.CADENCE_MS for a shot, three specials a SPECIAL_LANE_MS)
- **Fields**:
  - kind: bounded claim (judge: combat.js:2334: ranged or staff only with that weapon in the worker's own slot, anything else is melee; it picks the range cap, the daze rule, the lane and the weapon that rolls. A sword's swing labelled ranged with a bow worn resolves as a bow's: TRAPS 329)
  - range: bounded claim (judge: PVP_TUNING.RANGE_CAP by kind: clamped 10 to 250 for melee, 950 for ranged or staff; absent 40)
  - arc: bounded claim (clamped 0.1 to PI\*1.41; absent 1.2)
  - angle: bounded claim (a finite radian within one turn, else 0; the direction is the phone's word)
  - target: request (optional player id: only that player may be hit, and still passes every check)
  - special: bounded claim (judge: pvpbalance.js:92 _pvpSpecialOk: a special only inside the window a paid ability_use swipe opened, PVP.SPECIAL_WINDOW_MS and SPECIAL_CLAIMS; else an ordinary hit)
  - sw: bounded claim (the swing's or shot's own id; judge: pvpbalance.js _pvpMeleeLane (one hit a swing a pair, PVP.MELEE_MIN_MS between swings), freeswing.js:156 _fsSwing (the swing's share by the worker's clock), drawgather.js:282 _dgFind (a shot the worker stamped at its player_projectile relay))
  - orbs: bounded claim (a staff special only: 1 to PVP.SPECIAL_CLAIMS, and no more than the window has left)
  - part: bounded claim (a bow special only, 2 to 3: it can only make the hit smaller, combat.js _rollHit)
  - sn: bounded claim (the shot's number, for the accuracy stat; judge: accuracy.js:237 _accHitIn, ACC.COUNT_MAX, once a number; a stat, never a payout)
  - dmgBase: not read for the damage on today's path (the worker's own roll); with pvpbalance or oneformula thrown false, a bounded claim (judge: combat.js:829 _maxDmgForAttacker)
  - critChance: not read on today's path; on the old path a bounded claim (0 to 100)
  - nb: claim (1 = multiply by the worker's own brew; it only multiplies the old path's dmgBase, after the clamp)
  - element: not read while weapongem is on (the element is the worker's own gem, weapongem.js:179 _weaponHitElement); with weapongem false, a claim checked only against ELEMENT_STATUS's own keys (pvpextras.js:314 _pvpClaimElement)
  - id, x, y, ts, inDuel, rs: not read (the attacker's place is the worker's own copy)
- **Absent, and a bad value**: every field is optional. No kind, or an unknown one: melee (fails closed to the 250 cap). No range: 40. No arc: 1.2. A bad angle: 0. No target: every allowed player in the cone. No sw: the older lanes. A claim that fails a gate is dropped silently, target by target; there is no refusal message.
- **Notes**: answered by pvp_hit in the tick's events (to everyone: eventplace.js places no pvp_hit), the target's player_state, and on a death player_died. The rewind depth comes from the sender's own measured rtt (pong), at most LAGCOMP_BUFFER_TICKS. A miss: a duel's swing is sent whether or not it reaches (the worker tests the cone); a locked swing only inside the phone's own reach test; a shot only at the phone's own impact test. Live flags: pvpbalance, oneformula, pvpextras, pvplunge, pvpbrew, weapongem, freeswing, bowdraw, staffgather, swingguard, nomansland.

#### `monster_damage` (phone to worker)

- **Handler**: server/src/index.js:5378 -> server/src/combat.js:1180 _handleMonsterDamage (first server/src/botsig.js:432 _sigOnHit and server/src/moveclaims.js:157 _swingDropsGuard)
- **Sent by**: src/game/monsterCombat.js:2489 (a sword's hit), src/game/projectiles.js:1940 (an arrow's or bolt's hit), src/game/projectiles.js:1245 (a stuck arrow's chip), src/game/projectiles.js:1336 (a planted arrow's tick); the shim passes it straight on at src/networking/wsClient.js:5852
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; ends a ride (RIDE_ENDS_ON); monsterId and zone given, and the monster alive and damageable in the worker's own list for that zone; has state; alive by the worker's own view (not dying, not disconnected); not a Wheel spectator; the sender's own zone is the zone named; not staggered by a parry; then, unless test mode: a ranged or staff slot needs that weapon in the worker's own slot (hitproof.js:135 _hitWeaponOk), a sword within PVE_MELEE_RANGE (400 px) of the monster from the worker's copy of the player, a bow or staff within its reach (hitproof.js:198 _hitReach), a bow's or staff's rate bucket (hitproof.js:242 _hitRateTake), and the monster's lane (210 ms an ordinary hit, three specials a 1200 ms) or the free-swing trial's own floor. Not on the fight lock
- **Who may start it**: never a helper (combat)
- **What it does**: plays (a hit on a monster: the worker rolls the damage itself (combat.js:1160 _rollHit), takes the monster's health, pulls its aggro, shoves it and sets the element's status from the worker's own gem); changes your own state (mint: the weapon's trained XP on every hit, and on the kill the XP, gold, loot and lifesteal of _resolveMonsterKill; it ends your own harvest, and a sword's claim lowers your raised guard)
- **Request id**: sw, on the free-swing trial and for a drawn or gathered shot: one swing or shot takes each monster once (freeswing.js:156 _fsSwing, freeswing.js:235 _pfBowClaim, drawgather.js:302 _dgTake, all in memory). Otherwise none: a repeat acts twice (a second hit as soon as that monster's lane allows)
- **Fields**:
  - monsterId: request (a damageable monster in the worker's list for the zone)
  - zone: request (must be the worker's own zone for the sender; tag 1628's hole)
  - slot: bounded claim (judge: hitproof.js _hitWeaponOk: ranged needs a bow and staff a staff in the worker's own slot; any other value falls back to the worker's activeSlot. The label picks the weapon that rolls, the reach, the lane and whether the guard drops, so a sword's swing labelled ranged with a bow worn is a bow's hit at a bow's reach: TRAPS 329)
  - special: bounded claim (judge: hitproof.js:174 _pveSpecialTake: a special only inside a window a paid ability_use swipe opened, HIT_PROOF.SPECIAL_WINDOW_MS, one special's shape a window; else it rolls as an ordinary hit, never dropped)
  - orbs: bounded claim (a staff special only, 1 to 3; each orb spends a slot of the special lane and of the paid window)
  - part: bounded claim (a bow special only, 2 to 3: it only makes the hit smaller, BOW_VOLLEY_WORTH)
  - sw: bounded claim (the swing's or shot's own id; judge: freeswing.js _fsSwing (the swing's share by the worker's clock, FREE_SWING.MIN_SWING_GAP_MS, SWING_TARGETS), drawgather.js:282 _dgFind and freeswing.js _pfBowClaim (a shot the worker stamped at its player_projectile relay))
  - noKb: claim (true: no shove; with slot ranged and no special it also marks a stuck arrow's chip that keeps the harvest record, bounded by a paid volley's window: gathering.js:1027 _volleyChipKeeps)
  - sn: bounded claim (the shot's number, for the accuracy stat; judge: accuracy.js:237 _accHitIn, ACC.COUNT_MAX; never a payout)
  - element: not read while weapongem is on (the worker's own gem, weapongem.js:179 _weaponHitElement); with weapongem false, a claim checked only against ELEMENT_STATUS's own keys
  - dmg, isCrit: not read (an older phone's; the worker rolls both)
  - the message itself: claim ("my hit landed": the worker tests no swing, facing, arc or line of sight, only the gates in the phase column)
- **Absent, and a bad value**: no monsterId or zone, an unknown zone, a dead or invulnerable monster: dropped silently. An unknown slot: the worker's activeSlot, else melee. A special nobody paid for: an ordinary hit. A claim past its reach, rate or lane: dropped silently (counted by hitproof.js:129 _hpTally for the owner's overview). No refusal message on any of it.
- **Notes**: answered by monster_hit in the tick's events (placed: near the monster, and the attacker), and on a kill monster_kill, combat_credit, lifesteal_credit and the loot. A miss sends nothing: the worker hears only hits; shots are counted from track's `ac` (accuracy.js). Test mode (testmode.js) skips the weapon, the reaches and the lanes; the roll stays the worker's. Live flags: hitproof, freeswing, freeswingbonus, perfectbow, bowdraw, staffgather, weapongem, volleychip, swingguard.

#### `arrow_blast` (phone to worker)

- **Handler**: server/src/index.js:5405 -> server/src/arrowblast.js:141 _handleArrowBlast
- **Sent by**: src/game/projectiles.js:1134 (only for a lone special arrow, never a volley's: so never against a worker that advertises caps.bowvolley)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; ends a ride (RIDE_ENDS_ON); then arrowblast.js:98 _arrowBlastRefusal, in order: the volley not live (live flag bowvolley false; with it on, the default, EVERY blast is refused as retired); has state; alive (not dead, dying or disconnected); the sender's own zone is the zone named; not a Wheel spectator; x and y finite numbers; off its cooldown (ARROW_BLAST.CD_MS); the point within ARROW_BLAST.MAX_REACH of the worker's copy of the player; a bow in the worker's bow slot. Not on the fight lock
- **Who may start it**: never a helper (combat)
- **What it does**: plays (a blast at the point named: the worker picks up to ARROW_BLAST.MAX_TARGETS monsters within ARROW_BLAST.RADIUS of it and rolls each a bow special); changes your own state (mint: bow XP and a kill's rewards; it ends your harvest)
- **Request id**: none: a repeat inside ARROW_BLAST.CD_MS is dropped; after it, a repeat acts twice (blasts again)
- **Fields**:
  - zone: request (must be the worker's own zone for the sender)
  - x, y: bounded claim (where the phone says its arrow ended; judge: arrowblast.js _arrowBlastRefusal: finite, and within ARROW_BLAST.MAX_REACH of the worker's copy of the player)
- **Absent, and a bad value**: any gate failing: dropped silently and counted by reason (_arrowBlastRejects, for the owner's view). No refusal message.
- **Notes**: answered by monster_hit for each monster caught and arrow_boom, both in the tick's events. Retired by default since tag 2848 (the bow special is a volley).

#### `ability_use` (phone to worker)

- **Handler**: server/src/index.js:5550 -> server/src/index.js:3238 _handleAbilityUse (first server/src/botsig.js:302 _sigOnAbility)
- **Sent by**: src/game/dodge.js:130 (a dodge), src/game/dodge.js:189 (a lunge), src/game/dodge.js:290 (a retreat), src/game/playerActions.js:265 (a swipe: the special attack)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; ends a ride (RIDE_ENDS_ON); type one of dodge, lunge, retreat, swipe; has state; alive (not dying, dead or disconnected); the pool holds one block (stamina, or mana for a swipe: prog3.js:1094 _blockCost), else refused. The lunge's strike then asks its own: not a Wheel spectator, a target named, a sword held, not harvesting by the move's own `ex` (a fire excepted), off its cooldown (LUNGE.cooldownMs), not staggered, the target in reach. Not on the fight lock
- **Who may start it**: never a helper (combat)
- **What it does**: changes your own state (spends one block of stamina, or of mana for a swipe; saved paced, _saveRpgPools); plays (a paid dodge, lunge or retreat opens the roll's window against a player's blow (movement.js:285 _rollStamp); a lunge strikes the named monster or player with the worker's own roll (abilities.js:1104 _lungeStrike); a swipe opens the windows in which a special claim counts (pvpbalance.js:87 _pvpSpecialPaid, hitproof.js:142 _pveSpecialPaid); a retreat grants its shot (hitproof.js:153 _pveRetreatPaid)). What the roll, the dash and the special then do on the map is the phone's own: its moves, and its monster_damage and player_attack claims
- **Request id**: none: a repeat acts twice (a second block spent and a second window opened; the worker keeps no cooldown on a dodge, a retreat or a swipe, only on the lunge's strike)
- **Fields**:
  - type: request (one of dodge, lunge, retreat, swipe; the worker prices each itself: index.js:3193 _abilityCost)
  - targetId: request (a lunge's monster: an id in the worker's list for the sender's own zone, damageable, within the lesser of PVE_MELEE_RANGE and LUNGE.reach of the worker's copy of the player)
  - pid: request (a lunge's player: PvP allowed for the pair (pvpextras.js _pvpNamedPlayer) and within the same reach)
  - tier: not read (handed to _abilityCost, which has not used it since tag 172)
- **Absent, and a bad value**: no payload, or a type not among the four: dropped silently. Not enough in the pool: refused with ability_rejected {type, pool, cost, have}. A lunge with no target, or one out of reach: the block is still spent and the roll's window opened; no strike, and no message of its own.
- **Notes**: answered by player_state (the pools) to the sender at once. A paid swipe also grants HIT_PROOF.CHIP_GRANT bow claims to the sender's rate bucket.

#### `ability` (phone to worker)

- **Handler**: server/src/index.js:5567 -> server/src/abilities.js:547 _handleAbility
- **Sent by**: src/game/abilities.js:698 (a cast; an armed whirlwind's press at src/game/abilities.js:633)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; ends a ride (RIDE_ENDS_ON); kind an own key of STAM_ABILITIES (sworddash, bash, whirl); has state; alive by the worker's own view (not dying, not disconnected); the kind's level gate (none set today); a shield worn for bash, a sword for sworddash and whirl; not staggered by a parry; off the kind's cooldown; enough stamina for its blocks. At the strike (abilities.js:667 _abilityResolve; for a whirl, the tick that ends its windup): not a Wheel spectator, still alive and in the zone it was cast in, a target in reach, else a whiff. Not on the fight lock
- **Who may start it**: never a helper (combat)
- **What it does**: plays (the worker resolves the whole cast: it picks the targets from its own copy of the player, rolls the damage, stuns, shoves and credits the kill; a whirl arms and strikes on a later tick; a sworddash that connects places the player at contact); changes your own state (spends the kind's stamina blocks and stamps its cooldown; ends your harvest; mint: XP and a kill's rewards)
- **Request id**: none: a repeat inside the kind's cooldown is refused `cooldown`; after it, a repeat acts twice (casts and charges again)
- **Fields**:
  - kind: request (an own key of STAM_ABILITIES)
  - targetId: request (bash and sworddash only, and only when nobody stands inside the kind's radius: a monster id in the worker's list for the sender's zone, damageable, within the kind's reach)
  - pid: request (sworddash only: a player; pvplunge.js:124 _swordDashPlayer judges consent and reach)
- **Absent, and a bad value**: no kind, or one not in the table: dropped silently. Every later refusal is answered with ability_rejected {kind, reason}: locked, no-shield, no-weapon, staggered, cooldown (with ms), stamina (with cost and have), whiff (with spent). No target named: the nearest inside the radius.
- **Notes**: answered by player_state and, to those near, ability_windup (a whirl), monster_hit and the rest. A cast that reaches nobody is still charged (a whiff). Live flag whirlWindup (a camel-case name the flags route lists by hand, liveops.js CAMEL_SWITCHES).

#### `element_burst` (phone to worker)

- **Handler**: server/src/index.js:5582 -> server/src/burst.js:145 _handleElementBurst
- **Sent by**: src/game/playerActions.js:773 (an empty payload)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; ends a ride (RIDE_ENDS_ON); not a Wheel spectator (dropped silently, the mana kept); then burst.js:121 _burstRefusal, in order: has state; alive (not dying, dead or disconnected); a weapon in the worker's active slot; an element on that weapon; one block of mana; off its cooldown (PROG3.BURST_CD_MS); not staggered by a parry. Not on the fight lock
- **Who may start it**: never a helper (combat)
- **What it does**: plays (the worker casts the nova from its own copy of the player: every monster within PROG3.BURST_RADIUS, and each player the caster is already fighting, takes the worker's roll and the element's status); changes your own state (spends one block of mana, stamps the cooldown, ends your harvest; mint: XP and a kill's rewards)
- **Request id**: none: a repeat inside PROG3.BURST_CD_MS is refused `cooldown`; after it, a repeat acts twice (casts and charges again)
- **Fields**: none read (the handler is handed the session alone: the weapon, the element, the place, the pools and the targets are all the worker's own)
- **Absent, and a bad value**: nothing can be absent. A refusal is answered with ability_rejected {type: 'burst', pool: 'mana', reason, cost, have}.
- **Notes**: answered by player_state, monster_hit for each monster, and element_nova in the tick's events. The weapon is the one in the worker's activeSlot, which set_active_slot sets.

#### `nml_attack` (phone to worker)

- **Handler**: server/src/index.js:5730 -> server/src/nomansland.js:387 _handleNmlAttack
- **Sent by**: src/game/nmlAsk.js:259 (the window's Attack; `target` sits on the message itself, not in a payload)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; ends a ride (RIDE_ENDS_ON); No man's land on and the choice on (live flags nomansland, nmlchoice); the sender has state and is alive (not dead, dying or disconnected); the target a different player the room has, alive with health; both in the Wheel; the target within NML.CHOOSE_R of the sender; one choice a NML.CHOOSE_GAP_MS; No man's land's rule holds between the two (nomansland.js:306 _nmlAllowed: levels within the land's number, not one party, not locked out, no sparring clone); no duel or arena consent between them. Not on the fight lock
- **Who may start it**: never a helper (combat)
- **What it does**: plays (starts the fight before any blow: the sender takes a red skull unless hitting back, the target a white one with the sender's right to be hit back; it counts as the sender's engagement for area moves); cannot be undone (the red skull runs NML.SKULL_MS of play, and a death under it loses everything carried and worn)
- **Request id**: none: a repeat inside NML.CHOOSE_GAP_MS is dropped; a later one acts twice (both skulls' time set again: nomansland.js:468 _nmlSkulls)
- **Fields**: target: request (a player id, a string of at most 64, an own key of the worker's playerState; judged by every check in the phase column)
- **Absent, and a bad value**: no target, a bad one, or any check failing: dropped silently; there is no refusal message
- **Notes**: answered by nml_skull to both players. An older phone sends none, and the skulls start at the first landed blow (player_attack).

#### `nml_lock_ask` (phone to worker)

- **Handler**: server/src/index.js:5743 -> server/src/nomansland.js:979 _handleNmlLockAsk
- **Sent by**: src/game/noMansLand.js:146
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; No man's land and its lock on (live flags nomansland, nmllock); the sender has state, is not dead and not disconnected; the target a different player the room has; the sender is locked out from attacking that target now (nomansland.js:891 _nmlLockedFrom); once a NML.LOCK_ASK_MS for the pair; the target has a socket
- **Who may start it**: never a helper (combat) (border: a social ask, a "?" shown to one player, but it carries no words and belongs to No man's land's fight rule)
- **What it does**: speaks (asks the player who beat you for a rematch: a "?" over your head, on their screen alone)
- **Request id**: none: a repeat inside NML.LOCK_ASK_MS for the pair is dropped
- **Fields**: target: request (a player id, at most 64, an own key of playerState, and one the sender is locked out from)
- **Absent, and a bad value**: dropped silently; nothing is said to the sender
- **Notes**: sends nml_lock_ask {from} to the target alone. In memory only; writes nothing.

#### `nml_lock_allow` (phone to worker)

- **Handler**: server/src/index.js:5746 -> server/src/nomansland.js:1000 _handleNmlLockAllow
- **Sent by**: src/game/noMansLand.js:152
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; No man's land and its lock on (live flags nomansland, nmllock); the sender has state (its life is not checked); the target a different player the room has; one a NML.CHOOSE_GAP_MS; the target is locked out from attacking the sender now (nomansland.js:891 _nmlLockedFrom)
- **Who may start it**: never a helper (combat) (border: it is consent to be attacked again by a named player)
- **What it does**: changes your own state (your protection from the named player: the lock is taken off THEIR nml_state record and saved, nomansland.js:932 _nmlLockLift); cannot be undone (the lock does not come back; only a new red-skull death sets one)
- **Request id**: none: a repeat changes nothing (the lock is gone, so _nmlLockedFrom is false)
- **Fields**: target: request (a player id, at most 64, an own key of playerState, locked out from the sender)
- **Absent, and a bad value**: dropped silently
- **Notes**: answered by nml_lock to both players.

### 3.D2 combat, the worker's events, and loot (2)

#### `item_drop` (phone to worker)

- **Handler**: server/src/index.js:5226 -> server/src/itemdrop.js:100 _handleItemDrop
- **Sent by**: src/game/itemDrop.js:65 (Drop on the bag's item card; only against caps.itemdrop)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; live flag itemdrop not false; has state; alive (not dead, not dying); not disconnected; in a zone that is not town, worldview or farm_home (ITEM_DROP.NO_DROP_ZONES); not in a fight with a player (fight lock switch fightlock, refused by the handler: _bagLockedByFight); the key held in the bag; GAP_MS since the sender's last drop; fewer than MAX_LIVE of the sender's piles on the ground
- **Who may start it**: a person (border: a drop that another player picks up after its minute is a gift with no trade window; if that counts as a trade it is never a helper's)
- **What it does**: moves value out (bag goods to a pile on the ground in front of you: yours alone for PRIVATE_MS, then anyone's in the zone (move to whoever takes it), gone at GONE_MS (burn); the pile is kept in memory only)
- **Request id**: none: a repeat acts twice (drops the same count again out of what is left of that key; a second one inside GAP_MS is refused 'slow')
- **Fields**:
  - key: request (a string of 1 to KEY_MAX that is no Object.prototype member, held in the sender's bag; the trade window's rule, no list of kinds beyond it)
  - qty: request (a whole number of 1 or more; clamped to MAX_QTY and to what is held)
- **Absent, and a bad value**: the handler is given the message itself, not msg.payload || msg (server/src/index.js:5227): key and qty sit on the message, and inside a payload they are not seen (refused 'bad'); qty absent means 1; a bad key or count is refused 'bad', a key not in the bag 'none'; every refusal is item_drop_result {ok: false, reason, key}
- **Notes**: answered loot_drop (the pile, to the sender alone), player_state, then item_drop_result {ok, key, qty, lootId} | the bag's take, the pile and the save are one synchronous run (bag road item_drop, _saveRpg) | the room is told the pile at its minute by _tickLoot (server/src/itemdrop.js:205) | paced by ITEM_DROP.GAP_MS on the player's state, not a _paceTake lane | live flag itemdrop, cap itemdrop

#### `loot_pickup` (phone to worker)

- **Handler**: server/src/index.js:5500 -> server/src/index.js:4520 _handleLootPickup
- **Sent by**: src/game/groundLoot.js:282 (the hand, standing on the pile); src/ui/BroTown.jsx:7331 (the pet, viaPet); the shim sends the pending move first (src/networking/wsClient.js:6132)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; a pile of that id in that zone's list; not already claimed by the sender; a recipient of the pile, or a death pile past its ownerOnlyUntil; has state; in the pile's zone (ps.z); alive (not dead, not dying); not disconnected; for viaPet an active pet on the record (_petbookActive); within range of the pile from where the worker has the sender (LOOT_PICKUP_RANGE; for viaPet pets.js _petPickupRange)
- **Who may start it**: never a helper (gathering) (border: a pile is taken by standing on it, by place, in real time; it is not a node's harvest, and a death pile or a dropped item past its minute is another player's goods)
- **What it does**: plays; changes your own state (mint: a kill pile's gold share, remnant, shard, gem, weapon and armour; a weapon met by a full weapon bag is sold for gold at once); for a death pile or a dropped item takes the whole pile (move to you: a dead player's bag, or what a player dropped)
- **Request id**: none: a repeat changes nothing (lootId is the worker's own pile id; pile.claimedBy[sender], in memory, answers 'already-claimed', and a death pile is gone after its one taker: 'no-pile')
- **Fields**:
  - lootId: request (a pile in this.loot[zone])
  - zone: request (must be the zone the worker has the sender in)
  - viaPet: bounded claim (judge: _petbookActive and pets.js _petPickupRange; the worker keeps no place for a pet, so "my pet is at the pile" is believed within PETS.VACUUM_RANGE of the OWNER, or PETS.FETCH_RANGE for a kill pile the sender may claim)
- **Absent, and a bad value**: read from payload, or from the message itself; no lootId or no zone: refused (loot_pickup_rejected 'bad-payload'); every other failure is refused with its reason (no-loot-zone, no-pile, already-claimed, not-recipient, no-ps, wrong-zone, dead, disconnected, no-pet, out-of-range); viaPet is read as true or false, nothing else
- **Notes**: answered loot_credit then player_state to the sender, and loot_claimed (and loot_despawn once spent) to the room | one _saveRpg a pickup; a saved death pile's row is deleted in the same run (deathpile.js _deathPileGone) | gold roads loot_gold, loot_weapon_sold; bag roads loot_skull, loot_shard, loot_gem, loot_death_items | no pace lane of its own (the socket's budget only): every refused ask is answered with a frame | live flag petfetch false puts viaPet back on VACUUM_RANGE

### 3.E progression and quests (10)

#### `achv_title` (phone to worker)

- **Handler**: server/src/index.js:5232 -> server/src/achievements.js:576 _achvTitle
- **Sent by**: src/game/achievements.js:216
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; achievements on and the sender's record readable (not locked); nothing else checked
- **Who may start it**: a person
- **What it does**: changes your own state (the title on your card, which other players see)
- **Request id**: none: a repeat changes nothing (the same title again writes nothing: achievements.js:585)
- **Fields**: id: request (an id in ACHV.LIST that the sender's own record holds; null, '' or absent takes the title off: achievements.js:581-584)
- **Absent, and a bad value**: no id means take the title off; an id that is not a string, not in the list or not earned changes nothing; past the pace (PACE.ACHVT, flood.js:103) the change is not made; in every case the phone is answered achv_state with what stands (achievements.js:590)
- **Notes**: one storage put of achv:\<pid> a change, paced; the title reaches others through the track stamp (_achvStamp); fight lock: open ("moves no goods")

#### `points_reset` (phone to worker)

- **Handler**: server/src/index.js:5237 -> server/src/pointsreset.js:122 _handlePointsReset
- **Sent by**: src/game/pointsReset.js:60
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive (not dead or dying); has a prog3 block; not in a fight (cooking.js:628 _anyFightAt: a fight with a player, or a blow dealt or taken within PVP_HEAL.WINDOW_MS); not within POINTS_RESET.GAP_MS of the last reset (the socket's stamp and the room's Map, which outlives a rejoin); at least one point placed
- **Who may start it**: a person
- **What it does**: changes your own state (every placed point back in its pools; levels, XP, gear and gold kept)
- **Request id**: none: a repeat changes nothing (refused soon for a minute, and none once nothing is placed)
- **Fields**: none read (the router passes the session only: index.js:5238)
- **Absent, and a bad value**: a payload is ignored; dead, dying or no prog3 -> dropped silently (pointsreset.js:126); every other refusal is answered points_reset_result {ok: false, err: off, fight, soon (with wait) or none}
- **Notes**: answered points_reset_result then player_state; one _saveRpg a reset; live flags pointsreset and pointsresetroom; fight lock: open ("moves no goods")

#### `stat_allocate` (phone to worker)

- **Handler**: server/src/index.js:5512 -> server/src/grids.js:255 _handleStatAllocate
- **Sent by**: no phone sends it (only the shim's passthrough is left, src/networking/wsClient.js:6191; src/ui/panels/StatScreenPanel.jsx:296 says so)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; has a point left (ps.unspentT2 > 0); nothing else checked (not alive, not out of a fight)
- **Who may start it**: a person
- **What it does**: changes your own state (takes one unspentT2 point; the worker raises no stat itself: the phone adds 1 on stat_allocated and reports it by stats_update)
- **Request id**: none: a repeat acts twice (spends a second point while one is left)
- **Fields**: stat: request (one of power, vitality, endurance, agility, mind: grids.js:250 _isValidStat)
- **Absent, and a bad value**: no payload or a stat not on the list -> dropped silently (grids.js:258); no point left -> refused with a player_state resend of unspentT2, buildPointsThisLvl and the five stats (grids.js:263 _refusalEcho)
- **Notes**: answered stat_allocated then player_state; one _saveRpg a spend, not paced; fight lock: open ("moves no goods", fightlock.js:240)

#### `prog3_allocate` (phone to worker)

- **Handler**: server/src/index.js:5521 -> server/src/prog3.js:1401 _handleProg3Allocate
- **Sent by**: src/ui/mobile/sheet/HeroExpanded.jsx:1571 (one message a point: a batch spend sends it count times)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state with a prog3 block; nothing else checked (not alive, not out of a fight)
- **Who may start it**: a person
- **What it does**: changes your own state (one point from a pool into a stat; the worker recomputes level and pools)
- **Request id**: none: a repeat acts twice (spends a second point while one is left and the stat is under its bound; a points_reset gives every point back)
- **Fields**:
  - stat: request (an own key of the stat table: prog3.js:620 prog3StatDef; under its bound: statcap.js:61 _prog3StatBound)
  - cat: request (sword, bow or staff; needed for an attack stat, and that skill's own points or the unchannelled rest pay: prog3.js:1442-1446; not read for a shared stat)
- **Absent, and a bad value**: no stat, a stat not in the table, or an attack stat with no known cat -> dropped silently (prog3.js:1407-1409, 1442); no point of the right kind, or the stat at its bound -> refused with a player_state resend of prog3 (prog3.js:1437 _refusalEcho)
- **Notes**: answered prog3_allocated then player_state; one _saveRpg a point, not paced; live flag nostatcap (false brings the per-level bound back); fight lock: open ("moves no goods")

#### `stats_update` (phone to worker)

- **Handler**: server/src/index.js:5541 -> server/src/grids.js:722 _handleStatsUpdate
- **Sent by**: src/ui/BroTown.jsx:3593 (the page itself, after every recalculation; also src/ui/mobile/dash/equipActions.js:179 for an armour swap and src/ui/mobile/dash/SpendPointConfirm.jsx:129)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; for an armour or legs swap only: not gear-locked by a threat (grids.js:110 _threatGearLocked), not in a fight with a player (fight lock fightlockarmor, refused in the handler: grids.js:121), and the piece's requirement met (grids.js:127 _prog3EquipOk); nothing else checked (not alive)
- **Who may start it**: a person (border: the page sends it by itself after every recalculation; the armour swap inside it is a player's tap)
- **What it does**: changes your own state (the worn armour and legs, the worker's armour stash following the swap; the reported stat, skill and grid tracks; def and the amulet regen numbers)
- **Request id**: none: a repeat changes nothing (the mutation gate: an identical re-send finds nothing changed, writes nothing and sends nothing: grids.js:1131)
- **Fields**:
  - armorRef, legsArmorRef: request (the id of a piece in the sender's gear_prov ledger for that slot, null to take it off: grids.js:1008 _gearProvPieceByRef; the piece worn is the worker's own copy)
  - armor, legsArmor: bounded claim (judge: gearprov.js:436 _gearProvResolve: a gid in the ledger is rebuilt from the worker's copy; anything else is the phone's own description kept as legacy, tierMult clamped 0..8 at grids.js:1041, then _prog3EquipOk; it feeds the damage reduction _armorDrMult)
  - power, vitality, endurance, agility, mind: bounded claim (judge: grids.js:615 _clampStat at level\*10+20, never below the stored value: grids.js:807; not read for a prog3 character: grids.js:773)
  - weaponSpecs.{sword,bow,staff}.\<channel>: bounded claim (judge: T2_CHANNEL_CAP a channel at grids.js:831 and the COMBAT_BUILD_CEILING total at grids.js:289 _clampBuildTotal; stored for a prog3 character too)
  - weaponSkills, defenseSkill: bounded claim (judge: grids.js:339 _sanitizeWeaponSkills and grids.js:373 _sanitizeDefenseSkill: 0..100, level never falls; a rise fills hp, stamina and mana; not read for a prog3 character unless the live flag skillfreeze is false: grids.js:887)
  - defenseSpec: bounded claim (judge: grids.js:384 _sanitizeDefenseSpec)
  - hpSpec, enduranceSpec: bounded claim (judge: grids.js:398 _sanitizeGridSpec: a channel cap and sum \<= min(200, 2 x vitality or endurance))
  - weaponUnspent, defenseUnspent, hpUnspent, enduranceUnspent: bounded claim (clamped 0..999, then overwritten by computeCanonicalPools when a spec or skill arrives: grids.js:970)
  - def: bounded claim (judge: defCap level\*20+100 at grids.js:1111; read only by the old PvP formula under PVP_TUNING.DEF_CAP, combat.js:2586, not by the worker's own PvP roll)
  - amuletHpRegen: bounded claim (0..100; nothing reads it: join.js:1382)
  - amuletStaminaRegen: bounded claim (0..100; read by the regen tick only when the live flag amuletregen is false: staminaregen.js:64)
  - maxHp, maxStamina, maxMana: not read (the worker computes its own)
  - t2Flat: not read (grids.js:428)
- **Absent, and a bad value**: every field is optional and absent means no opinion (never "take it off"); armor present but null, or named Leather Armor, takes the piece off (grids.js:1018); armorRef null takes it off; an armorRef naming no piece of the sender's is dropped silently, the worn piece stays (grids.js:1008-1012); a number out of range is clamped; a wrong type is ignored; a refused armour swap gets a player_state resend of armor and legsArmor (grids.js:105); a payload that is not an object throws (see found)
- **Notes**: answers player_state only when something changed; saved at the player's pace (_saveRpgPaced, grids.js:1134); live flags skillfreeze, gearresend, fightlockarmor

#### `rest_request` (phone to worker)

- **Handler**: server/src/index.js:5654 -> server/src/rest.js:104 _handleRest
- **Sent by**: src/game/rest.js:64
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive, not disconnected; at the place it names (rest.js:93 _restPlaceOk: in zone farm_home, or in the Wheel within REST.HOTEL_R of the Hotel's door by the worker's own x, y); not in a fight (rest.js:86 _restInFight: a fight with a player, or a blow dealt or taken within REST.QUIET_MS); not within REST.GAP_MS of the last rest
- **Who may start it**: a person (border: a rest needs the character standing at the Hotel's door or on the farm)
- **What it does**: changes your own state (hp, stamina and mana filled; Well Rested for REST.MS: +10% of a fight's XP)
- **Request id**: none: a repeat changes nothing for a minute (refused soon by ps._restAt, kept in memory only: a reconnect lets one more through); after the minute a repeat rests again and starts the half hour again
- **Fields**: where: request ('hotel' or 'farm'; the worker checks its own copy of where the sender stands)
- **Absent, and a bad value**: where missing or anything else -> refused rest_result {ok: false, err: 'where'}; dead, dying, disconnected or no state -> dropped silently (rest.js:110); the other refusals are answered err off, fight or soon (with wait)
- **Notes**: answered player_state then rest_result; one _saveRpg a rest; live flag rest; fight lock: open ("moves no goods")

#### `guild_quest_turn_in` (phone to worker)

- **Handler**: server/src/index.js:5859 -> server/src/guilds.js:34 _handleGuildTurnIn
- **Sent by**: src/ui/panels/GuildPanel.jsx:299 (only against caps.guilds; it rides the input batch as a broadcast event)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive (not dying or dead; disconnected is not checked); the sender's own level in that life skill at or over the next rung's (guilds.js:48); nothing about place
- **Who may start it**: a person
- **What it does**: changes your own state (mint: the rung's gold by the gold road guild_rung and its achievement points; the claims count guild_claims:\<pid> moved in the same run)
- **Request id**: none: a repeat changes nothing for the same rung (the count is written with the pay: guilds.js:60-64); it claims the NEXT rung when the level already meets it, else it is refused not-ready
- **Fields**: skill: request (one of GUILD_SKILLS: guilds.js:39; the level and the claims count are the worker's own)
- **Absent, and a bad value**: skill missing or not on the list -> refused guild_quest_error bad-skill; no state, dying or dead -> not-now; the ladder finished -> done; the level short -> not-ready
- **Notes**: answered guild_quest_result and a queued player_state; two puts a paid rung (the claims and the record, one batch); no live flag of its own; fight lock: open ("brings things in")

#### `build_point_earned` (phone to worker)

- **Handler**: server/src/index.js:6217 -> server/src/grids.js:206 _handleBuildPointEarned
- **Sent by**: src/game/combatHelpers.js:486 (the page itself, when use-training ticks a stat)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; nothing else checked
- **Who may start it**: a person (border: no player taps it; the page sends it as a by-product of fighting)
- **What it does**: changes your own state (recomputes level and the pool maxes from what the worker already holds; a level gain fills hp, stamina and mana; it counts no build point)
- **Request id**: none: a repeat changes nothing (the recompute reads only the worker's own state; saved only when level or a max moved: grids.js:227)
- **Fields**: none read (the handler takes the session only; the message is the phone's word that a stat went up, and the worker takes nothing from it)
- **Absent, and a bad value**: a payload is ignored
- **Notes**: queues a player_state flush every time; saved at the player's pace when something moved; fight lock: open ("moves no goods")

#### `quest_accept` (phone to worker)

- **Handler**: server/src/index.js:6267 -> server/src/quests.js:131 _handleQuestAccept
- **Sent by**: src/game/quests.js:54 (kept and sent again at the rejoin when the channel drops it: src/game/questKept.js:34)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive, not disconnected; the quest neither active nor handed in; not barred (quests.js:248 _questBarred: its giver in the world, not retired, the first quest handed in before an unchecked one, the checked step before it handed in; a test-mode character skips all but the first of these)
- **Who may start it**: a person
- **What it does**: changes your own state (the quest active; mint: the items a quest gives on accept, for tut_1, farm_1, smith_1, wood_1, fish_1, life_1 and beast_1)
- **Request id**: none: a repeat changes nothing (the quest is already active: quests.js:155; the accept's items are given only on the accept that moves it to active)
- **Fields**: questId: request (an own key of QUEST_REWARDS: quests.js:147; judged against the sender's quest map)
- **Absent, and a bad value**: questId missing, not a string or unknown -> dropped silently (quests.js:139, 147); dead, already taken or barred -> refused with a player_state resend of _quests, coins, achievementPoints, xp and prog3 (quests.js:282 _questRefusedEcho; the live flag disable_quest_echo makes the first two silent again)
- **Notes**: answered player_state; one _saveRpg; a weapon that does not fit the stash goes to the mail (_questDrainUnfitWeapons); fight lock: open ("brings things in")

#### `quest_turn_in` (phone to worker)

- **Handler**: server/src/index.js:6276 -> server/src/quests.js:356 _handleQuestTurnIn
- **Sent by**: src/game/quests.js:174 (kept and sent again at the rejoin when the channel drops it: src/game/questKept.js:34)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive, not disconnected; the quest active; not barred (quests.js:248 _questBarred); its objective met by the worker's own record (quests.js:318 _questObjectiveMet: the quest's counter, the bag, a life skill's level, the dungeons cleared); for wood_2 a pine bow or staff to trade
- **Who may start it**: a person
- **What it does**: changes your own state (mint: the quest's gold by the gold road quest_reward, its XP into the skill named, 5 achievement points, its items; burn: the items a collect objective consumes; wood_2: a pine weapon remade in the next wood; the next quest opened); cannot be undone
- **Request id**: none: a repeat changes nothing (the quest must be active: quests.js:387; a second hand-in gets the resend)
- **Fields**:
  - questId: request (an own key of QUEST_REWARDS: quests.js:370)
  - xpCat: request (sword, bow or staff: which trained skill takes the XP; needed only when the quest pays XP to a prog3 character: quests.js:381)
  - trade: request ('bow' or 'staff' for wood_2's trade; absent or another value takes the first found: quests.js:517 _questTradePick)
  - the hand-in itself: claim only for a quest with no objective in the table: 22 of the 43, of which 21 are dormant (refused) and the other, mayor_1, is retired (it cannot be newly accepted, a save that holds it active still hands it in on the phone's word: 50 gold, 10 XP, 5 points)
- **Absent, and a bad value**: questId missing or unknown -> dropped silently (quests.js:364, 370); xpCat missing or unknown when needed, the quest not active, the objective unmet, dead, nothing to trade, or barred -> refused with a player_state resend of _quests, coins, achievementPoints, xp and prog3 (quests.js:282); a refusal takes nothing and writes nothing
- **Notes**: answered player_state, with prog3_level on a level-up and quest_reward_stashed for each armour piece; one _saveRpg; the flag objective type reads _questFlags but no quest in the table uses it today (data.js:708 warns why); live flags disable_quest_echo, disable_mayor3_check; fight lock: open ("brings things in")

### 3.F gathering, cooking, fish (10)

#### `extraction_start` (phone to worker)

- **Handler**: server/src/index.js:5387 -> server/src/gathering.js:1071 _handleExtractionStart (a cook's start goes on to server/src/gathering.js:1229 _planCookHits); before it server/src/botsig.js:342 _sigOnStart
- **Sent by**: src/game/lifeSkillRewards.js:287 (startExtraction; sent again with no hitSeq at src/game/lifeSkillRewards.js:483 when the phone gives a plan up)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; puts a rider off the board (RIDE_ENDS_ON); a node's start: the node is in the named zone's list and alive, the sender holds the tool the PAYLOAD's skill names (_hasGatherTool), and has the level for the node's own skill (_gatherLevelOk, live flag gatherreq); a cook's start: has state only; NOT checked: alive, the sender's zone, the distance to the node
- **Who may start it**: never a helper (gathering)
- **What it does**: plays (starts a harvest: writes the one extraction record a player has, its clock and, with hitSeq, its rolled hits; with the move's `ex` that record holds monsters off, _extractionShielded gathering.js:925); a cook's start changes nothing but a memory note for the owner's view (ps._cookHits)
- **Request id**: none: a repeat acts twice (the record is written over and its window starts again from now; with hitSeq the same node inside GATHER_HITS.REUSE_MS keeps its rolls). hitSeq is echoed in gather_hits so the phone can drop a late plan; it guards no repeat
- **Fields**:
  - nodeId: request (an alive node of this.nodes[zone])
  - zone: request (names the node list; not held to where the sender is)
  - skill: claim ('cooking' sends it to the cook's branch; else it names the tool looked for here, a name outside _GATHER_TOOL_FOR_SKILL needing none, and on the timer path it names whose level sets the window, _computeOpenDelayBase; the hit plan, the level gate and the strike use the node's own type)
  - hitSeq: request (a whole number 1..GATHER_HITS.SEQ_MAX; present = the hit plan and a gather_hits answer, absent = the old timer and no answer)
  - fishKey: request (a cook's start only: a string starting fish_, at most 64 chars; names a tier, echoed back, not checked against the bag)
- **Absent, and a bad value**: no nodeId, zone or skill -> dropped; an unknown or dead node, no tool, too low a level -> dropped, no answer; hitSeq missing, not a whole number or out of range -> read as none (the timer); a cook's start with no hitSeq or a bad fishKey -> dropped
- **Notes**: answered gather_hits to the sender alone, only with hitSeq | no pace lane of its own (the socket's budget) | the record lasts EXTRACTION_TIMEOUT_MS and outlives the socket | live flags gatherhits, hitladder, nodehp, gatherreq | open in a fight (fightlock.js FIGHT_OPEN: the fight itself) | botsig judges the walk to the node here (a flag, never a refusal)

#### `node_strike` (phone to worker)

- **Handler**: server/src/index.js:5411 -> server/src/gathering.js:1358 _handleNodeStrike; before it server/src/botsig.js:394 _sigOnStrike; inside it server/src/botfp.js:353 _botfpOnStrike
- **Sent by**: src/game/lifeSkillRewards.js:578 (the fishing reward; the other two at :695 and :792)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; puts a rider off the board (RIDE_ENDS_ON); the node alive; the sender in the node's zone, not dead, not disconnected; holds the node's tool; has the node's level; within _nodeStrikeRange of the node by the worker's own position of the sender; a start record for THIS node whose window has opened, or else a recovery strike once every HARVEST_PROOF.RECOVER_MS (live flag harvestproof); under HARVEST_HOUR_CAP for the skill; test mode skips the window, the need for a start, the bot score and the hour cap
- **Who may start it**: never a helper (gathering)
- **What it does**: plays (fells the node for everyone until it respawns, NODE_RESPAWN_TIME); changes your own state (mint: 1 of the node's resource, 2 ore on a perfect mining strike; life-skill XP; a shard on a 33% roll; quest and daily counts; a fish may roll albino or large)
- **Request id**: none: a repeat changes nothing (the node is dead after the first strike: 'node-already-dead', and the paid strike deleted its start record)
- **Fields**:
  - id: request (an alive node of this.nodes[zone])
  - zone: request (must be the worker's ps.z)
  - accuracy: bounded claim (judge: botfp.js _botfpOnStrike: 'perfect' stands only beside a swipeFp whose ent is at or over ENT_FLOOR, else it is paid 'good' with no fingerprint or 'ok' under the floor; gathering.js:590 _ratedHarvestAccuracy: at most HARVEST_PERFECT_PER_MIN perfects a minute, the rest 'good'. 'perfect' pays x2 XP and 2 ore; 'good' x1.5 XP; any other word x1 XP; 'miss' fells the node and pays nothing)
  - swipeFp {len, n, ent, tv, vc, h, dur}: claim (the phone's own measure of its gesture, which the worker never sees: ent decides whether a perfect stands, the rest feed the bot score, which flags and never refuses)
  - the strike's arrival time: bounded claim (judge: the start record's window, gathering.js:1438: too early -> refused 'too-early'; never too late)
- **Absent, and a bad value**: no id or zone -> dropped; accuracy absent -> 'good'; an unknown accuracy word -> paid as 'ok'; swipeFp absent -> a perfect is paid as 'good'; every refusal is silent but for the node and lifeSkills sent again (_strikeSnapBack, at most once a node every HARVEST_PROOF.DIRTY_MS; live flag strikesnap) and the hour cap's lifeSkills resend; the reason is kept for the owner's view (_lastStrikeFor)
- **Notes**: answered player_state and harvest_credit to the sender; the node's change goes to the zone on the tick | saved at once (_saveRpg) | HARVEST_HOUR_CAP and ENT_FLOOR are hidden settings | open in a fight (FIGHT_OPEN: the fight itself) | what a lying phone gains: every strike 'perfect' with a made-up fingerprint (2 ore for 1, x2 XP for x1 to x1.5) up to HARVEST_PERFECT_PER_MIN a minute; no gesture at all (the worker holds the wind-up only, never HONEST_CYCLE.GESTURE_FLOOR_MS); never a miss; a shorter wind-up as extraction_start's found lines say. All under the hour cap a skill, the reach, the tool and level gates, and the node's respawn. The shard and the fish's variant are the worker's rolls

#### `cook_request` (phone to worker)

- **Handler**: server/src/index.js:5530 -> server/src/cooking.js:928 _handleCookRequest; before it server/src/botsig.js:417 _sigOnCook; inside it server/src/botfp.js:534 _botfpOnCook
- **Sent by**: src/game/lifeSkillRewards.js:899
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; under COOK_PER_MIN a minute (_cookRateOk), under COOK_HOUR_CAP an hour (botfp), and COOK_FLOOR_MS after the last cook; holds the raw fish; NOT checked: alive, a fire, any place; test mode skips the three rates
- **Who may start it**: a person (border: a cook is played as a timed gesture at a fire, as a harvest is, but it gathers nothing; the card's seven classes do not name crafting)
- **What it does**: changes your own state (one raw fish used; mint: its cooked fish and 200 Cooking XP and the daily quest's count, or burnt_dust); cannot be undone (the raw fish is gone either way)
- **Request id**: none: a repeat acts twice (cooks the next fish of that key if one is held and COOK_FLOOR_MS has passed; inside the floor it is dropped)
- **Fields**:
  - fishKey: request (a string starting fish_, held in the worker's bag)
  - kind: claim ('cooked' pays the cooked fish and the XP, any other word pays burnt_dust; the worker cannot see the flip, so the word is taken as said; only its rate is bounded: COOK_PER_MIN, COOK_HOUR_CAP, COOK_FLOOR_MS)
  - swipeFp {h}: claim (the flip's fingerprint: h feeds the replay ring and the bot score, a flag only; a 'cooked' with none is counted, taplessCooks, and paid)
  - taps: not read
- **Absent, and a bad value**: no fishKey or one not starting fish_ -> dropped, no answer; kind absent or any word but 'cooked' -> burnt; over a rate, inside the floor, or no such fish -> nothing is used and a plain player_state echo goes, which sends a v2 phone nothing when nothing changed
- **Notes**: answered player_state (the bag, lifeSkills) | saved at once | COOK_HOUR_CAP is a hidden setting | not held to the hits gather_hits sent for it (server/src/gathering.js:1220) | open in a fight (FIGHT_OPEN: rearranges the bag) | what a lying phone gains: no fish ever burns, and no fire, log or gesture is needed: every raw fish held becomes a cooked one and 200 XP, up to COOK_PER_MIN a minute under the hour cap

#### `eat_request` (phone to worker)

- **Handler**: server/src/index.js:5811 -> server/src/cooking.js:118 _handleEatRequest
- **Sent by**: src/ui/panels/InventoryPanel.jsx:683 (also src/ui/BroTown.jsx:9915 and :9970, src/ui/panels/buildings/CookPanel.jsx:257)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; not dying / dead / disconnected; holds one; a heal at once (a cooked fish, a crop, a dish of slot 'now'): not in an arena match (_arenaInMatch) and not inside the one-bite wait of a fight (_pvpHealHeld, PVP_HEAL.GAP_MS; live flag pvpheal); no place asked
- **Who may start it**: a person (border: a heal eaten in a fight is part of the fight; out of one it is a bag action. The card's "combat" names the blows)
- **What it does**: changes your own state (one food used; hp up by the food's own fixed number, capped at maxHp, or a meal's timed effect replacing the running meal; the first albino and the first large of a species eaten grant their achievement points); cannot be undone (the food is eaten, at full health too)
- **Request id**: none: a repeat acts twice (eats the next one held; in a fight the one-bite wait refuses it)
- **Fields**: invKey: request (an own key of DISHES with slot meal or now, a crop of farm.js cropHealFor, or a key starting cooked_fish_; must be in the worker's bag; the heal is the worker's table's)
- **Absent, and a bad value**: invKey not a string -> dropped; a meal_ or brew_ key the worker does not know, a crop with cropeat off, dead, none held, an arena match, the one-bite wait -> refused: inventory, hp and _buffs sent again (and eat_refused for the wait); any other key (a raw fish, a brew, anything else) -> dropped, no answer
- **Notes**: answered player_state | eat_refused {wait} when the one-bite rule holds it back | saved at once | live flags cropeat, fishheal, pvpheal | open in a fight (FIGHT_OPEN: eaten or burnt in a fight, by design)

#### `potion_drink` (phone to worker)

- **Handler**: server/src/index.js:5820 -> server/src/cooking.js:300 _handleDrinkRequest
- **Sent by**: src/ui/mobile/dash/itemActions.js:133
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; not dying / dead / disconnected; holds one; the old minnow bottle (effect healFish): not in an arena match and not inside the one-bite wait; no place asked
- **Who may start it**: a person (border: as eat_request: a brew drunk in a fight changes the fight)
- **What it does**: changes your own state (one bottle used; its effect from the worker's SHOP_ITEMS or DISHES: a pool filled, or a timed brew replacing the running brew: damage, the mana surge, speed); cannot be undone
- **Request id**: none: a repeat acts twice (drinks the next bottle held; a timed brew starts again from now, it does not stack)
- **Fields**: invKey: request (an own key of DISHES with slot brew, or an own key of SHOP_ITEMS; must be in the worker's bag; the effect and its size are the worker's)
- **Absent, and a bad value**: invKey not a string, or a meal's key -> dropped; a brew_ key the worker does not know, dead, none held, an effect that cannot run (an arena match), the one-bite wait -> refused: inventory, hp and _buffs sent again; any other unknown key -> dropped, no answer
- **Notes**: answered player_state | saved at once | the phone sends it only against caps.potionBag | open in a fight (FIGHT_OPEN: eaten or burnt in a fight, by design)

#### `firemaking_request` (phone to worker)

- **Handler**: server/src/index.js:5830 -> server/src/cooking.js:223 _handleFiremakingRequest
- **Sent by**: src/ui/BroTown.jsx:9855
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; not dying / dead / disconnected; holds the log; no place asked (the fire is noted wherever the worker has the sender)
- **Who may start it**: a person (border: lighting a fire is the first step of a cook; it burns a log and gathers nothing)
- **What it does**: changes your own state (burn: one wood_ log; a memory note of the fire's place and time, ps._fireLit, which the cook's monster shield asks for, moveclaims.js _cookShieldHolds); cannot be undone
- **Request id**: none: a repeat acts twice (burns a second log and moves the noted fire)
- **Fields**: invKey: request (a string starting wood_, held in the worker's bag)
- **Absent, and a bad value**: invKey not a string or not starting wood_ -> dropped; dead -> dropped; no such log -> refused: inventory sent again (_refusalEcho) and firemaking_refused {invKey} (live flag firerefuse)
- **Notes**: answered player_state | saved at once | no XP: firemaking is not a skill | the fire the OTHER phones see is the phone's own relay campfire_lit (src/ui/BroTown.jsx:6833); the worker's default branch has no hook tying that relay to this message or its log | open in a fight (FIGHT_OPEN: eaten or burnt in a fight, by design)

#### `shop_purchase` (phone to worker)

- **Handler**: server/src/index.js:5841 -> server/src/cooking.js:849 _handleShopPurchase
- **Sent by**: no phone sends it (only the shim's passthrough is left: src/networking/wsClient.js:6293)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; then itemId must be on DIEGO_SHELF, which is empty (server/src/data.js:692): every message is dropped at server/src/cooking.js:857, before any state is read
- **Who may start it**: a helper with a grant (buy) (border: dormant; were the shelf filled it would buy a tonic with the player's gold)
- **What it does**: moves value out (burn: gold to the house for a tonic's effect at once; today nothing, the shelf is empty)
- **Request id**: none: a repeat acts twice (it would buy again; today nothing)
- **Fields**: itemId: request (must be on DIEGO_SHELF and an own key of SHOP_ITEMS; the cost is the worker's)
- **Absent, and a bad value**: itemId not a string, off the shelf, dead, or too little gold -> dropped, no answer
- **Notes**: dormant, and listed so (server/src/fightlock.js:274) | were the shelf filled: gold through _goldTake 'tonic_buy' and back through _goldGive 'tonic_refund' when the effect cannot run, then player_state

#### `fish_inspect` (phone to worker)

- **Handler**: server/src/index.js:6128 -> server/src/fishlog.js:422 _handleFishInspect
- **Sent by**: src/game/fishWeigh.js:39
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; holds a fish of that key; has a catch of its raw key not yet weighed (fishlog:\<pid> `u`); the log loaded and not locked; live flag fishweigh; NOT checked: alive
- **Who may start it**: a person (border: it looks like a read, but each one spends a catch's one roll and can put the player's name on a public board)
- **What it does**: changes your own state (one catch weighed: its roll spent, the personal best kept, fishlog:\<pid> written at once); cannot be undone (a catch is weighed once); speaks (a weight that makes a species' top ten puts the player's name, level and face on the public fish_board)
- **Request id**: none: a repeat acts twice (weighs the next unweighed catch of that key: a new roll, one less left; nothing once none is left)
- **Fields**: key: request (must read as one of the game's fish, fishKeyInfo: fish_\<species> with an optional _albino or _large, raw or cooked, at most 64 chars; one must be in the bag and a catch of its raw key unweighed)
- **Absent, and a bad value**: no key or not a fish key -> dropped, no answer; fishweigh off -> fish_weight {key, off}; the log locked or not loaded -> {unavailable}; none held or none left to weigh -> {none}
- **Notes**: answered fish_weight to the sender | the weight is the worker's roll (rollFishWeight) and the log is put before the answer goes | the fish is not used up and no catch is tied to a fish: what limits the rolls is the count of catches while one fish of the key is held | no pace lane of its own; a weigh-in writes one row, and at most one more for the board | open in a fight (FIGHT_OPEN: moves no goods)

#### `fish_board_request` (phone to worker)

- **Handler**: server/src/index.js:6131 -> server/src/fishlog.js:455 _handleFishBoardRequest
- **Sent by**: src/game/fishWeigh.js:66
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; nothing else checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the ten heaviest of each species, a public board; the first ask of a worker's life reads the fish_board key from storage, later asks read memory)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: none read (the phone sends an empty payload)
- **Absent, and a bad value**: nothing to be absent; fishweigh off -> fish_board {off}; a failed read -> {unavailable}
- **Notes**: answered fish_board to the asker alone | no pace lane of its own: each ask is answered with every board (5 species, 10 rows each, with faces) under the socket's budget only | open in a fight (FIGHT_OPEN: moves no goods)

#### `cook_recipe` (phone to worker)

- **Handler**: server/src/index.js:6182 -> server/src/cooking.js:406 _handleCookRecipe
- **Sent by**: src/ui/panels/buildings/CookPanel.jsx:473 (and src/ui/BroTown.jsx:15559)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; not dying / dead / disconnected; Cooking level at or over the recipe's cookLvl; every ingredient held (the exact key, or cooked_ + key); live flag meals; NOT checked: any place
- **Who may start it**: a person
- **What it does**: changes your own state (the ingredients used; mint: the recipe's dish into the bag with carry, or its effect at once without; Cooking XP of tier x 25; the tour's cook count); cannot be undone (the ingredients are gone)
- **Request id**: none: a repeat acts twice (cooks again while the ingredients last)
- **Fields**:
  - recipeIdx: request (a whole number inside COOKING_RECIPES, the worker's own fixed table: a row number, which means another dish only if a deploy reorders the table; the level and the ingredients are the worker's)
  - carry: request (true = the dish goes in the bag; anything else = an old phone's cook, the effect applied at once or, where it cannot be, the dish bagged)
- **Absent, and a bad value**: recipeIdx missing, not a whole number or outside the table -> refused: inventory, lifeSkills and _buffs sent again; too low a level, an ingredient short, or meals switched off with carry or a newer row -> the same resend; dead -> dropped, no answer
- **Notes**: answered player_state | saved at once | no pace lane and no hour cap of its own (cook_request has both): bounded by the ingredients | caps.cookRows tells the phone how many rows the worker has | open in a fight (FIGHT_OPEN: rearranges the bag)

### 3.G the farm, pets, traps (11)

#### `farm_open` (phone to worker)

- **Handler**: server/src/index.js:5667 -> server/src/farm.js:394 _handleFarmOpen
- **Sent by**: src/ui/mobile/farmBus.js:86 (farmBus.open; the shim passes it at src/networking/wsClient.js:5911)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive (not dying or dead); not disconnected (farm.js:374 _farmPs: else dropped silently); live flag farm not off (else farm_state err 'off'); under FARM.MSG_PER_MIN (farm.js:350 _farmRateOk: else dropped silently); the farm record not a newer worker's (else err 'newer'); no place check
- **Who may start it**: a helper with a grant (read) (border: a read, but the first open writes the free six-bed deed to farm:\<pid>, and a day's first read writes that day's order board to farmorders:\<pid>)
- **What it does**: reads (your own beds, the worker's clock, today's three orders); changes your own state (only the first time: the free deed and the day's board are created)
- **Request id**: none: a repeat changes nothing (a read; the deed and the board are written once and read back the same)
- **Fields**: payload: not read (the phone sends an empty one)
- **Absent, and a bad value**: nothing is read from the message; a missing payload is the same as any other
- **Notes**: answered farm_state {beds, now, plots, orders}; orders is null with live flag farmorders off or a newer board record. The phone sends it only against caps.farm.

#### `farm_act` (phone to worker)

- **Handler**: server/src/index.js:5668 -> server/src/farm.js:418 _handleFarmAct
- **Sent by**: src/ui/mobile/farmBus.js:90 (farmBus.act; one message for a tap or a whole drag across the beds)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive; not disconnected (_farmPs: else dropped silently); live flag farm not off (err 'off'); under FARM.MSG_PER_MIN (dropped silently); plant and feed only: not in a fight with a player (the handler refuses, nomansland.js:250 _bagLockedByFight, fight-lock switch fightlock, err 'fight'); the farm record not a newer worker's (err 'newer'); no place check
- **Who may start it**: a person (border: a harvest gathers a crop, but from the player's own timed beds, not from a node in the world; the brief's rule puts the farm with a person, not with gathering)
- **What it does**: changes your own state (dig: a rough bed tilled; water: a growing crop ready sooner, free; harvest: mint: the bed's crops by bag road farm_harvest and Farming XP, the bed rough again; any op: counts toward a running farm quest); moves value out (plant: burn one seed a bed, bag road farm_plant; feed: burn one compost a bed, bag road farm_feed); cannot be undone (a seed planted or compost fed is spent; there is no unplant)
- **Request id**: none: a repeat changes nothing (each bed's own state in farm:\<pid> stops it: a second dig finds it tilled, a second plant finds it planted, water and feed are flags, a second harvest finds it rough; answered err 'nothing'). beds are places in the farm's fixed list of beds: they never shift, so a place always names the same bed
- **Fields**:
  - op: request (an own key of OPS: dig, plant, water, feed, harvest)
  - beds: request (an array of bed places; only the first FARM.MAX_BEDS x 2 entries are looked at; each must be a whole number inside this farm, taken once, in the order given; then the bed's own state decides: dig needs rough, plant tilled, water planted and not watered and not yet ripe, feed planted and not fed, harvest planted and the worker's clock past the stored readyAt)
  - crop: request (plant only: an own key of FARM.CROPS; Farming level at least the crop's lvl; one seed from the worker's copy of the bag for each bed)
- **Absent, and a bad value**: no payload, an op that is not one of the five, beds not an array, or no valid place in it: dropped silently (no answer); a bad place (not a whole number, out of range, repeated): skipped; plant with an unknown crop: dropped silently; level short: refused farm_state err 'level'; seeds or compost run out: the beds done so far stand, err 'no-seeds' or 'no-compost'; no bed fit: err 'nothing'. Never a time, a yield or a bed's contents from the phone
- **Notes**: answered farm_state {beds, now, plots, did, err?}, then player_state when the bag changed (plant, feed, harvest). The farm record's put and _saveRpg go out in one synchronous run, the record first (farm.js:385 _farmCommit); dig and water write the farm record only.

#### `farm_buy` (phone to worker)

- **Handler**: server/src/index.js:5669 -> server/src/farm.js:590 _handleFarmBuy
- **Sent by**: src/ui/mobile/farmBus.js:93 (farmBus.buy)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive; not disconnected (_farmPs: else dropped silently); live flag farm not off (err 'off'); under FARM.MSG_PER_MIN (dropped silently); no place check; no fight lock (fightlock.js FIGHT_OPEN: 'rearranges the bag')
- **Who may start it**: a helper with a grant (buy)
- **What it does**: moves value out (burn: gold to the house, the worker's price x count, gold road farm_buy); changes your own state (the seeds or compost into the bag, bag road farm_buy)
- **Request id**: none: a repeat acts twice (buys the same count again and pays again)
- **Fields**:
  - item: request (FARM.COMPOST, or an own key of the seed table SEED_TO_CROP; a seed needs Farming level at least its crop's lvl)
  - count: request (clamped to 1..FARM.BUY_MAX; the gold must cover the whole order)
- **Absent, and a bad value**: no payload or an unknown item: dropped silently (no answer); count absent or not a number: 1; count over FARM.BUY_MAX or under 1: clamped; level short: refused farm_state {err: 'level', did: {op: 'buy', item, n: 0}}; gold short: refused {err: 'coins', ...}, never part of an order. The price is the worker's (FARM.CROPS price, FARM.COMPOST_PRICE), never the phone's
- **Notes**: answered player_state, then farm_state {did: {op: 'buy', item, n, cost}}; saved at once (_saveRpg).

#### `farm_order` (phone to worker)

- **Handler**: server/src/index.js:5670 -> server/src/farmorders.js:235 _handleFarmOrder
- **Sent by**: src/ui/mobile/farmBus.js:103 (farmBus.order; only for an order the phone's board shows not done)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive; not disconnected (_farmPs: else dropped silently); live flags farm and farmorders not off (err 'off', orders null); under FARM.MSG_PER_MIN (dropped silently); the board record not a newer worker's (err 'newer'); the order on today's stored board and not done; not in a fight with a player (the handler refuses, farmorders.js:196 _farmOrderInFight: a duel, or a hit between players within PVP_HEAL.WINDOW_MS, anywhere in the world; err 'order-fight'); the order's goods in the worker's copy of the bag; no place check
- **Who may start it**: a person
- **What it does**: moves value out (burn: the order's goods leave the bag to the house, bag road farm_order); changes your own state (mint: the order's gold by gold road farm_order, Farming XP, the Farmhand achievement's count); cannot be undone (a delivered order stays done for the UTC day)
- **Request id**: day + id: must equal the stored board's day and the id at that slot, else refused 'order-stale'; the slot's done flag in farmorders:\<pid>, set before anything is paid, refuses a repeat ('order-done')
- **Fields**:
  - slot: request (a whole number 0..FARM_ORDERS.PER_DAY - 1: a place on today's board, pinned by day and id)
  - day: request (must equal the stored board's day)
  - id: request (must equal the board's id at that slot; then looked up in FARM_ORDERS.POOL as an own key)
- **Absent, and a bad value**: no payload, or slot not a whole number in range: dropped silently (no answer); day or id absent or not the board's: refused farm_state err 'order-stale' with the board as it is now; an id this worker does not know: 'order-gone'; short of goods: 'order-short' and the bag is sent again (_resendPlayerState inventory). Never a key, a count or a price from the phone
- **Notes**: answered player_state, then farm_state {orders, did: {op: 'order', n: 1, slot, item, count, gold, xp, leveled, fromLevel, newLevel}}. The board's put and _saveRpg go out in one synchronous run, the board first. A character restart keeps the day's board.

#### `pet_capture` (phone to worker)

- **Handler**: server/src/index.js:6042 -> server/src/pets.js:78 _handlePetCapture
- **Sent by**: no phone sends it
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked
- **Who may start it**: never a helper (gathering) (border: retired; it was the old capture of a weakened monster and now touches nothing)
- **What it does**: reads (retired since tag 3120: it answers pet_capture_result 'retired' and changes nothing: the monster lives, the trap stays, nothing is paid)
- **Request id**: none: a repeat changes nothing (every one gets the same 'retired' answer)
- **Fields**: payload: not read
- **Absent, and a bad value**: nothing is read from the message; any payload, or none, gets the same answer
- **Notes**: answered pet_capture_result {captured: false, error: 'retired'}. No pace lane of its own (the socket's budget only).

#### `make_traps` (phone to worker)

- **Handler**: server/src/index.js:6055 -> server/src/trapping.js:263 _handleMakeTraps
- **Sent by**: src/ui/panels/buildings/TrapsTab.jsx:58 (the Woodworker's Traps tab; the shim passes it at src/networking/wsClient.js:5958)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; live flag trapcraft not off (else make_traps_result error 'off'); has state; alive; not disconnected (else dropped silently); no place check (the Woodworker's counter is not asked for); no fight lock (FIGHT_OPEN: 'rearranges the bag')
- **Who may start it**: a person
- **What it does**: changes your own state (logs into box traps, one for one, bag roads trap_logs and trap_made; mint: Woodworking XP, TRAPPING.MAKE_XP a trap; counts toward a running traps_made quest); cannot be undone (the logs are spent)
- **Request id**: none: a repeat acts twice (makes that many more from the logs left)
- **Fields**:
  - log: request (an own key of TRAPPING.LOGS)
  - count: request (floored; clamped to 1..TRAPPING.MAX_PER_REQUEST, then to the logs the worker's copy of the bag holds)
- **Absent, and a bad value**: no payload or log not a string: refused make_traps_result {error: 'bad-log', log: ''}; a log not in the table: refused 'bad-log' with the request's own string sent back; count absent, 0, negative or not a number: 1; more than the logs held: as many as the logs make; no logs: refused {error: 'no-logs', log, need, have}
- **Notes**: answered make_traps_result {made, log, xp, leveled, newLevel, traps}, then player_state; saved at once (_saveRpg). No pace lane of its own: one save a message, bounded by the logs held and the socket's budget. The phone sends it only against caps.trapcraft.

#### `trap_arm` (phone to worker)

- **Handler**: server/src/index.js:6064 -> server/src/trapping.js:302 _handleTrapArm
- **Sent by**: src/game/trapping.js:165 (armTrap, the TRAP button; only when the phone's own view says ready)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; on foot (the router puts a rider off first: ride.js RIDE_ENDS_ON); live flag trapping not off ('off'); has state, alive, not disconnected ('not-now'); in the Wheel (ps.z is WHEEL_ZONE, else 'not-here'); the monster alive in the sender's zone, with a home land, damageable ('no-monster'); neither the player nor the monster on safe ground (_wheelSafeAt, 'safe-ground'); the monster within TRAPPING.ARM_RANGE of the worker's own place for the player ('too-far'); Trapping level at least the monster's level ('level'); a box trap in the worker's copy of the bag ('no-trap'); the pets record loaded and not locked ('pets-unavailable') and not full ('pets-full'); under TRAPPING.CATCH_PER_HOUR ('catch-cap') and TRAPPING.ARMS_PER_MIN ('too-fast')
- **Who may start it**: never a helper (gathering) (border: a mark on a monster for the Trapping life skill, spent at a kill; it could be read as combat, and is no helper's either way)
- **What it does**: plays (marks one Wheel monster as armed for TRAPPING.MARK_MS, in memory only; the one mark moves off any other monster; the trap is spent and the roll made later, by the worker, at the kill)
- **Request id**: none: a repeat changes nothing (the same monster's mark only starts its clock again; each one counts on TRAPPING.ARMS_PER_MIN)
- **Fields**: monsterId: request (a string naming a monster; judged against the worker's own monsters, places, levels and bag: nothing about the monster or the player is taken from the phone)
- **Absent, and a bad value**: no payload or monsterId not a string: read as '' and refused trap_armed {monsterId: '', error: 'no-monster'} (after the flag, state and zone checks); every refusal answers trap_armed {monsterId, error} with the request's own string sent back, and costs nothing
- **Notes**: answered trap_armed {monsterId, until, ms, chance, stretch, traps}. Nothing is written or taken here; the roll (trap_result) runs in combat.js _resolveMonsterKill for an armed player who did TRAPPING.MIN_SHARE of the damage. The phone sends it only against caps.trapping.

#### `pet_active` (phone to worker)

- **Handler**: server/src/index.js:6067 -> server/src/petbook.js:721 _handlePetActive (through server/src/petbook.js:699 _petbookAct)
- **Sent by**: src/game/petBook.js:44 sendPetActive (the Pets page; only against caps.petbook)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; not disconnected (petbook.js:703: else dropped silently; a dying or dead player is not refused); live flag petbook not off ('off'); the pets record loaded and not a newer worker's ('pets-unavailable'); under PETBOOK.ACTIONS_PER_MIN ('too-fast'); no place check
- **Who may start it**: a person
- **What it does**: changes your own state (which pet is out with you, or none: pets:\<pid>.active, written at once; the others see it on the tick's pw; it fetches loot and wards its land's element)
- **Request id**: none: a repeat changes nothing (the same pet is already out; the record is written and the act counted again)
- **Fields**: id: request (null puts your pet away; a string must be the id of a pet in the sender's own record, found by an array search)
- **Absent, and a bad value**: no payload, or id absent, or neither null nor a pet of yours: refused pets_state {op: 'active', error: 'no-pet'}; id null: the pet is put away
- **Notes**: answered pets_state {the whole record, op: 'active', id}. A refusal is not counted by the pace and also carries the whole record (up to PETBOOK.CAP_MAX pets), to the sender only.

#### `pet_name` (phone to worker)

- **Handler**: server/src/index.js:6070 -> server/src/petbook.js:731 _handlePetName (through server/src/petbook.js:699 _petbookAct)
- **Sent by**: src/game/petBook.js:49 (sendPetName; the phone runs the same cleaner first and sends nothing it would refuse)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; not disconnected (else dropped silently; a dying or dead player is not refused); live flag petbook not off ('off'); the pets record loaded and not a newer worker's ('pets-unavailable'); under PETBOOK.ACTIONS_PER_MIN ('too-fast'); no place check
- **Who may start it**: a person (border: the name is a player's words, read by other players on a listing and in a trade window; it is a pet's label, not chat)
- **What it does**: changes your own state (the pet's name in pets:\<pid>, written at once); speaks (the name is shown to a trade partner and to anyone browsing the auction house)
- **Request id**: none: a repeat changes nothing (the same name is set again; the record is written and the act counted again)
- **Fields**:
  - id: request (a pet in the sender's own record)
  - name: words (cleaned by cleanPetName, petbook.js:228: a string of at most 64 raw characters, NFC, spaces collapsed and trimmed, then 2 to 16 letters, numbers, spaces, hyphens or apostrophes with at least one letter or number; no word list and not chatguard's cleaner. Read by the owner (pets_state), by a trade partner (trade2.js:107 _t2PetsWire through petPublic) and by every browser of the auction house (store.js:279 _stPetDisplay); never on the tick: the others' pet is drawn without its name)
- **Absent, and a bad value**: no payload or no such pet: refused pets_state {op: 'name', error: 'no-pet'}; name absent, not a string, too long, too short or holding any other character: refused 'bad-name' (never clamped or stripped)
- **Notes**: answered pets_state {the whole record, op: 'name', id}. Renaming a pet staged in an open trade window marks the offer changed (trade2.js:582 _t2PetRenamed).

#### `pet_release` (phone to worker)

- **Handler**: server/src/index.js:6073 -> server/src/petbook.js:781 _handlePetRelease (through server/src/petbook.js:699 _petbookAct)
- **Sent by**: src/game/petBook.js:52 sendPetRelease (the page asks first, then sends confirm: true)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; not disconnected (else dropped silently; a dying or dead player is not refused); live flag petbook not off ('off'); the pets record loaded and not a newer worker's ('pets-unavailable'); under PETBOOK.ACTIONS_PER_MIN ('too-fast'); no place check; no fight lock (FIGHT_OPEN: 'moves no goods')
- **Who may start it**: a person
- **What it does**: moves value out (burn: the pet leaves pets:\<pid> for good; if it was out with you, none is); cannot be undone
- **Request id**: id: the pet's own id (p_..., made by the worker, never used again); a repeat finds it gone from pets:\<pid> and is refused 'no-pet'
- **Fields**:
  - id: request (a pet in the sender's own record)
  - confirm: request (must be exactly true)
- **Absent, and a bad value**: no payload or no such pet: refused pets_state {op: 'release', error: 'no-pet'}; confirm absent or anything but true: refused 'confirm' (a stray send is a no-op)
- **Notes**: answered pets_state {the whole record, op: 'release', id}; written at once. The pet out with you, a legacy pet and one inside its trade hold can all be released; a pet staged in a trade window shows there as missing and the commit refuses it (trade2.js:113).

#### `pet_house_buy` (phone to worker)

- **Handler**: server/src/index.js:6077 -> server/src/petbook.js:761 _handlePetHouseBuy (through server/src/petbook.js:699 _petbookAct)
- **Sent by**: src/game/petBook.js:60 (sendPetHouseBuy; only against caps.pethouse)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player in No man's land (the router refuses: FIGHT_GATED, switch fightlocktable, answered pets_state {op: 'house', error: 'not-now'}); has state; not disconnected (else dropped silently; a dying or dead player is not refused); live flag petbook not off ('off'); the pets record loaded ('pets-unavailable'); under PETBOOK.ACTIONS_PER_MIN ('too-fast'); live flag pethouse not off ('off'); confirm true ('confirm'); below PETBOOK.CAP_MAX ('house-full'); cap equal to the record's ('stale'); the gold ('no-gold'); no place check
- **Who may start it**: a helper with a grant (buy) (border: it buys room, not goods, and for good; a narrower reading of "buy" leaves it a person's)
- **What it does**: moves value out (burn: gold to the house, petHousePrice of the record's cap, gold road pet_house); changes your own state (PETBOOK.HOUSE_STEP more places: pets:\<pid>.cap); cannot be undone (no refund, no way to give room back)
- **Request id**: cap: the size the page showed must equal pets:\<pid>.cap now; a buy raises it, so a repeat (or a stale page) is refused 'stale' and charges nothing
- **Fields**:
  - cap: request (floored; must equal the record's own cap)
  - confirm: request (must be exactly true)
- **Absent, and a bad value**: no payload, or confirm anything but true: refused pets_state {op: 'house', error: 'confirm'}; cap absent or not the record's: refused 'stale'. The price is the worker's (petHousePrice, petbook.js:101), never the phone's
- **Notes**: answered pets_state {the whole record, op: 'house'} and a queued player_state. The gold's _saveRpg (petbook.js:773) and the record's put (petbook.js:716) go out in one synchronous run.

### 3.H gear and the forges (11)

#### `smelt_bar` (phone to worker)

- **Handler**: server/src/index.js:5660 -> server/src/smelting.js:110 _handleSmeltBar
- **Sent by**: src/ui/panels/buildings/SmithyPanel.jsx:215
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the live flag smelting on; has state and a bag; alive, not disconnected; the bar's Smithing level; nothing else checked (open under the fight lock: FIGHT_OPEN 'rearranges the bag')
- **Who may start it**: a person
- **What it does**: changes your own state (ore out of the bag and bars in, at the worker's rate smelting.js:104 _smeltRecipe; mint: Smithing XP a bar; counts for the daily quest `smelt`); cannot be undone (no bar goes back to ore)
- **Request id**: none: a repeat acts twice (smelts again while the ore lasts)
- **Fields**:
  - barKey: request (an own key of SMELT.RECIPES, three of them)
  - count: request (clamped to 1..SMELT.MAX_PER_REQUEST, then to what the ore held pays for)
- **Absent, and a bad value**: no payload, an unknown barKey, the flag off or a dead sender -> dropped silently; no count or a bad one -> 1; level short or no ore -> refused: inventory and lifeSkills sent again
- **Notes**: answered smelt_result then player_state; saved at once; cap smelting; live flags smelting, onetoone

#### `forge_armor` (phone to worker)

- **Handler**: server/src/index.js:5694 -> server/src/armorforge.js:79 _handleForgeArmor
- **Sent by**: src/ui/panels/buildings/SmithyPanel.jsx:337
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the router refuses, resending inventory); the live flag armorforge on; has state and a bag; alive, not disconnected; the recipe's Smithing level; five of its bars held
- **Who may start it**: a person
- **What it does**: moves value out (five bars: burn); changes your own state (mint: a torso or greaves with a grade the worker rolls, written to gear_prov:\<pid> with its id and added to the worker's armour stash; Smithing XP; the quest objective `craft`); cannot be undone (a salvage gives two bars back)
- **Request id**: none: a repeat acts twice (a second piece from five more bars)
- **Fields**: recipe: request (an own key of ARMOR_FORGE.RECIPES, six of them; everything about the piece is the table's)
- **Absent, and a bad value**: no payload, an unknown recipe, the flag off or a dead sender -> dropped silently (the panel says "Could not forge" when no receipt comes); level or bars short -> refused: inventory and lifeSkills sent again
- **Notes**: answered forge_armor_result then player_state; saved at once; cap armorforge; no gear lock asked (the piece goes to the bag, not the body)

#### `shield_wear` (phone to worker)

- **Handler**: server/src/index.js:5750 -> server/src/shieldwear.js:99 _handleShieldWear
- **Sent by**: src/game/shieldWear.js:37
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the live flag shieldwear on; has state; a payload that is an object; nothing else checked (not alive, no gear lock, no gate on the shield's tier); in a fight with a player only a report naming a shield the worker does not hold is refused (fightlockequip: the handler, shieldwear.js:141)
- **Who may start it**: a person
- **What it does**: changes your own state (ps.shield becomes the shield worn, the one taken off joins ps.shieldStash; sets ps._shieldKnown for the session, which decides whether an ordinary No man's land loss may take spare shields)
- **Request id**: none: a repeat changes nothing (the same shield is already on the arm; `none` twice has nothing to move)
- **Fields**:
  - none: claim (true = nothing on the arm; believed)
  - gid: request (at most SHIELD_WEAR.GID_MAX chars; judge: the arm, ps.shieldStash, or the sender's own ledger row, gearprov.js:653 _gearProvPieceByRef)
  - sig: request (read only with no gid, at most SHIELD_WEAR.SIG_MAX chars; matched against pieces that have no id)
  - which held shield is the worn one: claim (the phone owns the arm; the worker never refuses a shield it holds)
- **Absent, and a bad value**: no payload, or none of none, gid, sig -> dropped silently; a shield the worker does not hold -> nothing moves and the arm is marked unknown for the session (in a fight: nothing at all)
- **Notes**: no answer of its own (the file's header says the player_state echo answers it; the handler sends none); saved at the player's pace; cap shieldwear; the phone sends it on every change of the arm and once on each join

#### `cape_redeem` (phone to worker)

- **Handler**: server/src/index.js:5784 -> server/src/eventcapes.js:544 _handleCapeRedeem
- **Sent by**: src/ui/mobile/dash/itemActions.js:114
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the router refuses, resending inventory and cape); has state; alive, not disconnected; a ticket of that key in the worker's bag; not already in the ledger's `redeemed` list
- **Who may start it**: a person
- **What it does**: changes your own state (the ticket leaves the bag and the cape is granted: the sender's id into capegrant:\<capeId> `redeemed` and its trophy item into the bag, in one synchronous run with the save); cannot be undone (one cape an account; the ticket is spent)
- **Request id**: opId: optional, any string; stamped oplog:capered:\<opId> with the save (inbox.js:106 _opStamp), and a stamped one is dropped silently. Without it a repeat changes nothing (the ticket is gone and the ledger holds the id: refused, the bag sent again)
- **Fields**:
  - invKey: request (must equal a ticket key of EVENT_CAPES, eventcapes.js:305 _capeForTicket; one must be in the bag)
  - opId: the request id (no bound on its length or shape; read as a storage key before the bag is checked)
- **Absent, and a bad value**: no payload or a key that is not a ticket -> dropped silently; no ticket held, or already redeemed -> refused: inventory and cape sent again
- **Notes**: answered player_state; saved at once; works after the contest has closed (no _capeEventOpen test); the phone makes a new opId on every tap (key, player id, Date.now()), so the id guards a frame sent twice and nothing else

#### `cape_equip` (phone to worker)

- **Handler**: server/src/index.js:5799 -> server/src/eventcapes.js:448 _handleCapeEquip
- **Sent by**: src/ui/mobile/dash/itemActions.js:93
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive, not disconnected; owns a cape by the ledger (eventcapes.js:321 _capeOwnedBy, the ledgers as held in memory)
- **Who may start it**: a person
- **What it does**: changes your own state (ps.capeOff: the cape on or off your back, which the worker stamps on what the others are sent, eventcapes.js:438 _capeStamp)
- **Request id**: none: a repeat changes nothing (already there, eventcapes.js:458)
- **Fields**: worn: request (truthy = wear it; it only toggles a cape the ledger says is yours)
- **Absent, and a bad value**: no payload or no `worn` -> read as take it off; no cape owned -> refused: cape sent again
- **Notes**: answered player_state; saved at the player's pace

#### `harden_weapon` (phone to worker)

- **Handler**: server/src/index.js:6034 -> server/src/hardening.js:242 _handleHardenWeapon
- **Sent by**: src/ui/panels/buildings/SmithyPanel.jsx:389
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the router refuses with harden_result 'not-now'); has state; alive, not disconnected; not under the guards' gear lock (no harden_result then, only gear_locked); a weapon in the named slot below H5; the Smithing or Woodworking level that makes its tier (forgeladder.js:92 _hardenLevelFor); the gold, and the bars or hardened wood
- **Who may start it**: a person (border: the code calls it a lottery, gold and materials for a roll at 80% down to 0.5%, but nothing is staked against a payout and a loss keeps the level since tag 3529: read as crafting, not a wager)
- **What it does**: moves value out (gold and materials: burn, won or lost); changes your own state (the worker rolls: +1 hardness on the weapon held, or nothing; with `hardenkeep: false` a loss drops it back); cannot be undone
- **Request id**: none: a repeat acts twice (pays and rolls again)
- **Fields**: slot: request (weapon, rangedWeapon or staffWeapon; the weapon, its cost, its material and the odds are the worker's)
- **Absent, and a bad value**: no payload or another slot -> refused: harden_result {success: false, error: 'bad-slot'}; every other gate refused the same way with its own code (not-now, no-weapon, maxed, skill-gate, no-gold, no-materials)
- **Notes**: answered harden_result then a queued player_state; saved at once, then two more writes: harden_ledger:\<pid> (the last 50 tries) and, at H5, harden_h5_log; live flags hardenmats, hardenwoodskill, hardenkeep, hardenedwood, forgeladder, fightlocktable

#### `equip_request` (phone to worker)

- **Handler**: server/src/index.js:6191 -> server/src/gear.js:740 _handleEquipRequest
- **Sent by**: src/ui/mobile/dash/equipActions.js:424
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlockequip: the router refuses, resending the weapon fields); has state; alive, not disconnected; not under the guards' gear lock (threat.js:248 _threatGearLocked: gear_locked and a player_state, at most one every 2 s)
- **Who may start it**: a person
- **What it does**: changes your own state (the weapon at a bag place goes into the slot its type is worn in, the one held goes back to that place; a "?" blade is revealed as it goes on)
- **Request id**: none: a repeat acts twice (stashIdx is a PLACE in weaponStash, not an id: with a weapon in the slot the swap is in place, so a repeat swaps the two back; with the slot empty the place is spliced out, so a repeat puts on whatever weapon moved into it, if its type fits)
- **Fields**:
  - stashIdx: request (a place in the list; judge: a whole number 0..length-1 holding a weapon and not a gear piece, gear.js:299 _isGearNotWeapon)
  - slot: request (weapon, rangedWeapon or staffWeapon, and the one that weapon's type is worn in, gear.js:288 _weaponSlotFor; then the tier gate gear.js:402 _prog3EquipOk)
- **Absent, and a bad value**: no payload, a slot that is not a weapon slot, or a stashIdx that is not a whole number >= 0 -> dropped silently; a place past the bag's end, an empty place, a gear piece, the wrong slot, or a tier above the trained level -> refused: the weapon fields sent again in a player_state (`gearresend: false` makes the tier refusal silent)
- **Notes**: answered player_state; saved at the player's pace (_saveRpgPaced); live flags gearresend, gearlevel, fightlockequip

#### `sell_weapon` (phone to worker)

- **Handler**: server/src/index.js:6200 -> server/src/gear.js:226 _handleSellWeapon
- **Sent by**: src/game/weaponSell.js:23
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive, not disconnected; nothing else checked (no place, no gear lock, no pace; open under the fight lock: FIGHT_OPEN 'rearranges the bag')
- **Who may start it**: a person
- **What it does**: moves value out (the weapon at that bag place: burn, sold to the house); changes your own state (mint: gold, road weapon_sell, at the worker's price gear.js:218 _weaponSellValue); cannot be undone (no buy-back)
- **Request id**: none: a repeat acts twice (stashIdx is a PLACE in weaponStash: the splice moves every later weapon down one, so the same message again sells the NEXT weapon in the bag, for good)
- **Fields**: stashIdx: request (a place in the list; judge: a whole number 0..length-1 holding a weapon and not a gear piece)
- **Absent, and a bad value**: no payload or a stashIdx that is not a whole number >= 0 -> dropped silently; a place past the end, an empty place or a gear piece -> refused: coins and the weapon fields sent again
- **Notes**: answered player_state; saved at once (_saveRpg), a row a sale; the price reads tierMult and type only (grade and hardness add nothing); the phone draws the sale once the channel takes the message (src/game/weaponSell.js:28 drawWeaponSale) and does not retry

#### `unequip_request` (phone to worker)

- **Handler**: server/src/index.js:6209 -> server/src/gear.js:680 _handleUnequipRequest
- **Sent by**: src/ui/mobile/dash/equipActions.js:106
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive, not disconnected; not under the guards' gear lock (_threatGearLocked); for armor, shield or amulet only: not in a fight with a player (fightlockarmor: the handler refuses, resending that slot, gear.js:697)
- **Who may start it**: a person
- **What it does**: changes your own state (a weapon slot's weapon goes to the weapon bag, and the hand falls back to melee if it held it; armour goes to the worker's armour stash; a shield or amulet slot is set to nothing)
- **Request id**: none: a repeat changes nothing (the slot is empty the second time, gear.js:690)
- **Fields**: slot: request (weapon, rangedWeapon, staffWeapon, armor, shield or amulet: gear.js:256 _isValidEquipSlot; the slot must hold something)
- **Absent, and a bad value**: no payload, an unknown slot or an empty slot -> dropped silently; the weapon bag full (WEAPON_STASH_CAP) -> refused: the weapon fields sent again
- **Notes**: answered player_state; saved at the player's pace; the phone sends it for the three weapon slots only (armour and legs come off through stats_update, a shield through shield_wear)

#### `set_active_slot` (phone to worker)

- **Handler**: server/src/index.js:6227 -> server/src/gear.js:823 _handleSetActiveSlot
- **Sent by**: src/ui/mobile/dash/WeaponBar.jsx:64
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; nothing else checked (not alive, not the gear lock, not that the slot holds a weapon)
- **Who may start it**: a person (border: a loadout choice, but which weapon is in hand is also a move in a fight: the worker's damage roll reads activeSlot on the next hit)
- **What it does**: changes your own state (activeSlot: melee, ranged or staff)
- **Request id**: none: a repeat changes nothing (the same slot again returns before any write, gear.js:831)
- **Fields**: slot: request (melee, ranged or staff, nothing else)
- **Absent, and a bad value**: no payload or any other value -> dropped silently
- **Notes**: no answer (the next player_state carries it); saved at the player's pace

#### `forge_weapon` (phone to worker)

- **Handler**: server/src/index.js:6235 -> server/src/gear.js:505 _handleForgeWeapon
- **Sent by**: src/ui/panels/buildings/SmithyPanel.jsx:294
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the router refuses, resending inventory, coins, lifeSkills and the weapon fields); has state; alive, not disconnected; not under the guards' gear lock; then the worker's own gates, in order: the tier is one that bench forges (forgeladder.js:73 forgeOffered), the Smithing or Woodworking level, the wear gate on the blade it would mint (_prog3EquipOk), the gold, the bars / hardened wood / logs / ore, and room in the weapon bag for the weapon in the slot
- **Who may start it**: a person
- **What it does**: moves value out (gold and materials: burn); changes your own state (mint: a weapon of the table's numbers with a grade the worker rolls, into its slot, the old one to the bag; crafting XP; the quest objective `craft`); cannot be undone
- **Request id**: none: a repeat acts twice (a second weapon forged and paid for; the first goes to the bag)
- **Fields**:
  - weaponType: request (greatsword, sword, bow or staff; a sword is made a greatsword unless `swordconvert: false`)
  - tierKey: request (an own key of BLACKSMITH_TIERS or WOODWORKING_TIERS; cost, tierMult, level and XP are the table's)
  - isWoodwork: request (must agree with weaponType)
  - nothing else is read: no stats, no name, no price
- **Absent, and a bad value**: no payload, an unknown weaponType, a tierKey that is not the table's own, or isWoodwork that disagrees -> dropped silently; a gate failed -> refused: coins, inventory, lifeSkills, prog3 and the weapon fields sent again
- **Notes**: answered player_state; saved at once; live flags forgeladder, swordconvert, gearlevel, fightlocktable

### 3.I gems, salvage, reveals (10)

#### `smith_salvage` (phone to worker)

- **Handler**: server/src/index.js:5701 -> server/src/salvage.js:213 _handleSmithSalvage
- **Sent by**: src/ui/panels/buildings/SmithyPanel.jsx:594 (the Salvage tab, a second tap on an armed row; shown against caps.salvage)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the `salvage` switch on, has state, alive (not dying/dead), not disconnected, and 250 ms since this player's last salvage or essence ask (salvage.js:161 _salvageWho: any miss is dropped unanswered); no fight lock (fightlock.js:266 'rearranges the bag'); no guard gear lock; no place check
- **Who may start it**: a person
- **What it does**: changes your own state (convert: one piece -> SALVAGE.BARS bars of its metal, its grade's essence if rare or better, and a weapon's gems back into the bag); cannot be undone (the piece is destroyed: the weapon spliced out of weaponStash, the armour's ledger row taken)
- **Request id**: none: a repeat changes nothing for armour (the row is gone: 'not_held'); for a weapon a repeat acts twice ONLY if the weapon now at that place has the same signature (a twin), else 'changed' or 'gone'
- **Fields**:
  - field: request ('weaponStash'
  - 'armorStash'
  - 'legsStash')
  - gid: request (armour's server id, at most 40; judge: server/src/gearprov.js:764 _gearSellable: a row in YOUR ledger, right slot, not worn, not in the mail; the piece is the ledger's copy)
  - idx: request (a PLACE in ps.weaponStash, an integer >= 0)
  - sig: request (must equal salvage.js:145 weaponSig of the weapon at idx: gearBase, type, quality, hardness, tierMult)
  - metal, grade, gems: never sent: read from the worker's copy
- **Absent, and a bad value**: no payload or an unknown field -> refused smith_salvage_result {ok:false, reason:'bad'}; gid missing or over 40 -> 'legacy'; idx not an integer -> 'bad'; nothing at idx -> 'gone'; sig wrong or missing -> 'changed'; not copper, iron or black steel -> 'not_metal'; the gate's 'worn', 'in_mail', 'not_held', 'wrong_slot'
- **Notes**: answers smith_salvage_result, then player_state on success; one _saveRpg at once (salvage.js:264) and the ledger's put (gearprov.js:879 _gearProvTake); live flag `salvage`, cap `salvage`; a "?" piece is not refused and the answer names its grade (revealbag.js:60-67 says so on purpose)

#### `reveal_item` (phone to worker)

- **Handler**: server/src/index.js:5708 -> server/src/revealbag.js:236 _handleRevealItem
- **Sent by**: src/game/revealBag.js:136 (sendReveal: the card's Reveal, and Equip on a "?", against caps.revealbag)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state and not disconnected (else dropped unanswered); nothing else checked: a dying or dead player may open one, no fight lock (fightlock.js:241 'moves no goods'), no place check
- **Who may start it**: a person
- **What it does**: changes your own state (clears the worker's `unrevealed` mark on the piece: the weapon in weaponStash, or the armour's ledger row and every stash or worn copy with its id; mint: the achievement its grade earns, revealbag.js:220); cannot be undone (nothing seals an opened piece again, revealbag.js:32-34)
- **Request id**: none: a repeat changes nothing (an open piece answers `already` with the piece and no ceremony; nothing is paid, revealbag.js:42-44)
- **Fields**:
  - field: request ('armorStash'
  - 'legsStash'
  - 'weaponStash')
  - gid: request (armour's id, 1 to 40 chars; judge: the row in YOUR ledger for that slot, or a stash copy carrying the id, revealbag.js:186-201)
  - idx: request (a PLACE in ps.weaponStash)
  - name: request (optional tiebreak: when sent it must equal the name of the weapon at idx, revealbag.js:174)
  - the grade: never sent: it is the worker's
- **Absent, and a bad value**: no payload -> refused item_reveal {ok:false, reason:'bad'}; an unknown field -> 'bad'; no such piece -> 'not_held'; name sent and different -> 'changed'; name absent -> not checked: whatever weapon sits at idx is opened; past the pace -> 'busy'
- **Notes**: answers item_reveal to the holder, then the achievements, then player_state for a weapon; paced flood.js:88 PACE.RPG through _paceTake (lane 'reveal'); works with `revealbag: false` too (opening always works); wearing a "?" (gear.js:794, grids.js:131) and the join (join.js:1644) open one without this message

#### `essence_apply` (phone to worker)

- **Handler**: server/src/index.js:5716 -> server/src/salvage.js:274 _handleEssenceApply
- **Sent by**: src/ui/panels/buildings/SmithyPanel.jsx:624 (the Salvage tab's Use, a second tap on an armed row)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; then smith_salvage's gate (salvage.js:161 _salvageWho: switch on, has state, alive, not disconnected, 250 ms since the last ask, else dropped unanswered); no fight lock; no place check
- **Who may start it**: a person
- **What it does**: changes your own state (the piece takes the essence's grade: quality on the weapon in weaponStash, or on the armour's ledger row and stash copy); cannot be undone (one essence is used up, salvage.js:311)
- **Request id**: none: a repeat changes nothing (the piece is already that grade: 'changed' for a weapon, whose signature holds the grade; 'not_lower' for armour)
- **Fields**:
  - essence: request (a bag key essence_\<grade>_\<metal>; judge: salvage.js:110 parseEssenceKey, and at least one in the worker's bag)
  - field: request (as smith_salvage)
  - gid: request (armour's id; judge: gearprov.js:764 _gearSellable)
  - idx: request (a PLACE in weaponStash)
  - sig: request (must match the weapon at idx)
  - the piece's metal and grade: never sent: the worker's copy must be the essence's metal ('wrong_metal') and a lower grade ('not_lower')
- **Absent, and a bad value**: no payload, a bad essence key or an unknown field -> refused essence_result {ok:false, reason:'bad'}; none held -> 'no_essence'; then smith_salvage's reasons for the piece ('legacy', 'gone', 'changed', 'not_metal', 'worn', 'in_mail', 'not_held')
- **Notes**: answers essence_result, then player_state on success; saved at once (salvage.js:312; armour through gearprov.js:927 _gearProvSetQuality); live flag `salvage`

#### `shield_gem` (phone to worker)

- **Handler**: server/src/index.js:5757 -> server/src/shieldgem.js:130 _handleShieldGem
- **Sent by**: src/game/shieldGem.js:87 (askShieldGem, the Enchanter, against caps.shieldgem; names the shield on the arm only)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:122, answered reason 'locked'); has state (else dropped); the `shieldgem` switch on ('off'); alive ('down'; disconnected is not asked); not under a guard's gear lock (server/src/threat.js:248 _threatGearLocked: 'locked'); no place check
- **Who may start it**: a person
- **What it does**: changes your own state (one gem from the bag into a shield the worker holds for you: its gem, its name if the worker made it, its ledger row; mint: GEM_SET_XP Enchanting XP while a gem you made of that element is owed); cannot be undone (a gem already in the shield is replaced and lost; Take out pays one back only from a shield the worker made)
- **Request id**: none: a repeat acts twice (a second gem of that element is taken and the first lost: no check that the shield already holds it)
- **Fields**:
  - gem: request (on AMULET_GEMS, and one in the worker's own count: server/src/gems.js:80 gemCount)
  - gid: request (the id of a shield the worker holds for you, at most 40: on the arm first, then shieldStash, shieldgem.js:114)
  - sig: request (read only when no gid, at most 200: the shield_wear signature of a piece with no id)
  - the shield itself: never sent
- **Absent, and a bad value**: no payload -> {ok:false, reason:'bad_gem'}; gem not on the list -> 'bad_gem'; neither gid nor sig (or over length) -> 'bad'; no such shield -> 'not_held'; none of that gem -> 'no_gem'
- **Notes**: answers shield_gem_result, then player_state on success; one _saveRpg at once (shieldgem.js:168); live flag `shieldgem`

#### `weapon_gem` (phone to worker)

- **Handler**: server/src/index.js:5764 -> server/src/weapongem.js:238 _handleWeaponGem
- **Sent by**: src/game/weaponGem.js:78 (askWeaponGem, the Enchanter, against caps.weapongem)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:113, reason 'locked'); has state (else dropped); the `weapongem` switch on ('off'); alive and not disconnected ('down'); not under a guard's gear lock (threat.js:248: 'locked'); no place check
- **Who may start it**: a person
- **What it does**: changes your own state (one gem from the bag into the weapon EQUIPPED in that slot: element1, or element2 on a two-slot weapon at Enchanting 20; tier, isVolatile and name follow; mint: GEM_SET_XP Enchanting XP while a made gem of that element is owed); the gem comes back by Take out for gold (amulet_forge_request op 'extract')
- **Request id**: none: a repeat changes nothing (the first slot now holds that gem: 'same', 'level' or 'full')
- **Fields**:
  - slot: request ('weapon'
  - 'rangedWeapon'
  - 'staffWeapon': a slot's name, the worker's own weapon in it)
  - gem: request (on WEAPON_GEMS, and one in the worker's count; a second gem must differ from the first, and a volatile pair needs a FUSION_BASES weapon)
  - the weapon: never sent
- **Absent, and a bad value**: no payload or a bad slot -> {ok:false, reason:'bad_slot'}; bad gem -> 'bad_gem'; nothing in the slot -> 'no_weapon'; slots full -> 'full'; second slot under Enchanting 20 -> 'level'; none held -> 'no_gem'
- **Notes**: answers weapon_gem_result, then player_state on success; one _saveRpg at once (weapongem.js:290); live flag `weapongem` (off also puts each hit back on the phone's claimed element, weapongem.js:76)

#### `shard_crack` (phone to worker)

- **Handler**: server/src/index.js:5772 -> server/src/shardcrack.js:120 _handleShardCrack
- **Sent by**: src/game/shardCrack.js:80 (askShardCrack, the Gem Works, against caps.shardcrack)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:132, reason 'fight'); has state (else dropped); the `shardcrack` switch on ('off'); alive and not disconnected ('down'); no place check
- **Who may start it**: a person
- **What it does**: changes your own state (convert: up to 50 of a land's shards, each rolled 1 to 100 by the worker against the chance for your Gem Cutting level, into the raw gems found; mint: CRACK_XP Gem Cutting XP a shard); cannot be undone (the shards are destroyed whatever the rolls)
- **Request id**: none: a repeat acts twice (another `count` of shards is cracked, while any are held)
- **Fields**:
  - land: request (an own key of shardcrack.js:66 SHARD_CRACK.LANDS)
  - count: request (clamped to 1..MAX_PER_ASK, then to the shards the worker's bag holds)
  - the rolls and the chance: the worker's own (Math.random, the worker's level)
- **Absent, and a bad value**: no payload or an unknown land -> {ok:false, reason:'bad_land'}; count absent or not a number -> 1; no shard held -> 'short'
- **Notes**: answers shard_crack_result (every roll, in order), then player_state; one _saveRpg a message (shardcrack.js:153); no pace of its own; live flag `shardcrack`

#### `gem_combine` (phone to worker)

- **Handler**: server/src/index.js:5778 -> server/src/shardcrack.js:160 _handleGemCombine
- **Sent by**: src/game/shardCrack.js:86 (askGemCombine, the Gem Works, against caps.shardcrack)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:138, reason 'fight'); has state (else dropped); the `shardcrack` switch on ('off'); alive and not disconnected ('down'); no place check
- **Who may start it**: a person
- **What it does**: changes your own state (convert: RAW_PER_GEM raw gems of an element, or one rare_gem, into one elemental gem in the bag, owed its set XP later; mint: COMBINE_XP Gem Cutting XP); cannot be undone (a combine never fails and has no way back)
- **Request id**: none: a repeat acts twice (another three raw gems, or another Rare Gem, combined while held)
- **Fields**:
  - element: request (on GEM_ELEMENTS; with rare, on WEAPON_GEMS)
  - rare: request (only the value true: pay with one rare_gem and choose the element)
  - the counts: the worker's own bag
- **Absent, and a bad value**: no payload or a bad element -> {ok:false, reason:'bad_gem'}; rare absent or not true -> the three-raw-gem road; too few -> 'short' {need, have}; no Rare Gem -> 'no_rare'
- **Notes**: answers gem_combine_result, then player_state; one _saveRpg (shardcrack.js:191); live flag `shardcrack`

#### `make_hardened_wood` (phone to worker)

- **Handler**: server/src/index.js:6061 -> server/src/hardenedwood.js:99 _handleMakeHardenedWood
- **Sent by**: src/ui/panels/buildings/HardenedWoodTab.jsx:63 (the Woodworker's Hardened tab, against caps.hardenedwood)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the `hardenedwood` switch on (else answered error 'off', before any state check); has state, alive, not disconnected (else dropped); Woodworking level at the recipe's minLvl ('skill'); no fight lock (fightlock.js:268 'rearranges the bag'); no place check
- **Who may start it**: a person
- **What it does**: changes your own state (convert: logs of one tree -> hardened wood of it, one log a piece, five with `onetoone: false`; mint: the recipe's Woodworking XP a piece); cannot be undone (no way back to logs)
- **Request id**: none: a repeat acts twice (another `count` made, while the logs last)
- **Fields**:
  - key: request (an own key of hardenedwood.js:61 HARDENED_WOOD.RECIPES; the worker's Woodworking level)
  - count: request (floored; clamped to 1..MAX_PER_REQUEST and to the logs the worker's bag pays for)
  - the bag: never sent
- **Absent, and a bad value**: no payload or an unknown key -> hardened_wood_result {error:'bad-key'}; count absent, under 1 or not a number -> 1; too few logs -> {error:'no-logs', need, have}; level short -> {error:'skill', need}
- **Notes**: answers hardened_wood_result, then player_state; one _saveRpg (hardenedwood.js:137); no pace of its own; live flags `hardenedwood` and `onetoone`

#### `amulet_forge_request` (phone to worker)

- **Handler**: server/src/index.js:6244 -> server/src/amulet.js:123 _handleAmuletForge
- **Sent by**: src/ui/panels/buildings/SmithyPanel.jsx:448 (smelt; craft at 463; extract at 423), src/ui/panels/buildings/EnchantPanel.jsx:501 (gem), src/game/weaponGem.js:91 (extract from a weapon slot); against caps.amuletForge and caps.gemExtract
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; for op craft and gem only, not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:107 `when`, answered by a resend of coins, goldBars, amulet, inventory, lifeSkills); has state, alive, not disconnected (else dropped); craft, gem and extract from a worn slot: not under a guard's gear lock (threat.js:248; silent but for its own gear_locked notice); smelt and extract are open in a fight; no place check
- **Who may start it**: a person
- **What it does**: FOUR ops, not three. smelt: changes your own state (convert NUGGETS_PER_BAR goldNuggets -> 1 goldBar); cannot be undone. craft: moves value out (burn: the tier's gold through gold.js road amulet_craft, and its gold bars); changes your own state (mint: the amulet onto the neck with a ledger row, Smithing XP); cannot be undone (it REPLACES the worn amulet, gem and all: no stash, amulet.js:162). gem: changes your own state (one gem from the bag into the worn amulet); cannot be undone (no Take out for an amulet; a gem already there is written over). extract: moves value out (burn: gold, road gem_extract); changes your own state (the gems of a weapon or shield back into the bag, the piece renamed plain)
- **Request id**: none: a repeat acts twice for smelt (five more nuggets), craft (the gold and bars paid again for the same amulet) and gem (a second gem burned); a repeat of extract changes nothing (nothing left in the piece)
- **Fields**:
  - op: request ('smelt'
  - 'craft'
  - 'gem'
  - 'extract')
  - craft tierKey: request (an own key of AMULET_FORGE_TIERS; the worker's Smithing level, goldBars and coins must cover it)
  - gem gem: request (on AMULET_GEMS; an amulet worn; one in the worker's count)
  - extract target: request ('weapon'
  - 'rangedWeapon'
  - 'staffWeapon'
  - 'shield': the worker's piece in that slot; or 'stash')
  - extract stashIdx: request (a PLACE in ps.weaponStash, with no signature or name beside it)
  - smelt: no fields
  - costs, gems paid, names: the worker's own (amulet.js:297, 326)
- **Absent, and a bad value**: no payload or an unknown op -> dropped silently (amulet.js:282); unknown tierKey, a gem not on the list, an unknown target or a bad stashIdx -> dropped silently, no echo (151, 185, 241, 238); short of nuggets, level, bars, gold or gems, no amulet, nothing to extract -> refused by a resend of the bench's fields (server/src/persistence.js:789 _refusalEcho); no result event of its own
- **Notes**: answered by player_state only (amulet.js:285-287, one _saveRpg); live caps amuletForge and gemExtract; a shield pays its gem back only if the worker made it (amulet.js:309)

#### `gem_cut_request` (phone to worker)

- **Handler**: server/src/index.js:6256 -> server/src/amulet.js:495 _handleGemCut
- **Sent by**: src/ui/panels/buildings/GemcutPanel.jsx:168 (against caps.gems; the panel is replaced by the crack and combine while caps.shardcrack is advertised, GemcutPanel.jsx:58, so no phone sends it under today's flags)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:131, by a resend of inventory and lifeSkills); has state, alive, not disconnected (else dropped); REFUSED WHOLE while the `shardcrack` switch is on, the default (amulet.js:505: a resend, nothing cut); no place check
- **Who may start it**: a person
- **What it does**: with `shardcrack: false` only: changes your own state (convert: one raw gem, rolled by the worker at the rate for your Gem Cutting level, into one polished gem owed its set XP; mint: 15 Gem Cutting XP either way); cannot be undone (a failed cut destroys the gem). Today: changes nothing
- **Request id**: none: a repeat acts twice (another raw gem cut) when the old cut is on; changes nothing today
- **Fields**:
  - gem: request (on AMULET_GEMS; one raw gem in the worker's count, gems.js:91 gemTake)
  - the rate and the roll: the worker's own (GEM_CUT_TIERS, Math.random)
- **Absent, and a bad value**: no payload or a gem not on the list -> dropped silently (amulet.js:511); no raw gem of it -> refused by a resend of inventory and lifeSkills (515)
- **Notes**: answers player_state then gem_cut_result (amulet.js:535-540), in that order; one _saveRpg (532); the old cut returns only with `shardcrack: false`

### 3.J the shop, the bank, the store on the socket (12)

#### `shop_list` (phone to worker)

- **Handler**: server/src/index.js:5435 -> server/src/shop.js:482 _shopList
- **Sent by**: src/ui/panels/ShopkeeperPanel.jsx:221 (through S.channel.send; the shim passes it at src/networking/wsClient.js:6173)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked (no state, no life, no place: asked from anywhere)
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (Diego's public pile shop_stock, his staples and tools, and a price for each key named)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: keys: request (which bag keys to quote at qty 0; shop.js:502-515: the first 60, each a string of 1..64 chars that he prices and will trade; NOT checked against the sender's bag, a price is public)
- **Absent, and a bad value**: payload absent -> the message itself is read (msg.payload || msg); keys absent or not an array -> the shelf and the pile alone; a key that is not a string, is empty, over 64 chars, unpriced, or food/drink -> dropped; keys past 60 -> dropped; a failed read -> no answer at all (the panel keeps its last list)
- **Notes**: answered shop_state to the asker; one read of shop_stock each ask; no pace lane of its own (the phone asks only when its bag's keys change, checked every 700 ms)

#### `shop_quote` (phone to worker)

- **Handler**: server/src/index.js:5447 -> server/src/shop.js:572 _shopQuote
- **Sent by**: src/ui/panels/ShopkeeperPanel.jsx:238 (debounced 140 ms; shim src/networking/wsClient.js:6173)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked (the sender's state is read only for a tool's quote, shop.js:382 _toolWhyNot; no place)
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (what a stack would pay or cost, walked through the sale's own per-unit loop; moves nothing)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**:
  - key: request (an item key; a staple, a tool, or a key he prices by family, shop.js:404 _shopBaseValue)
  - qty: request (Math.floor(Number()); whole 1..SHOP.MAX_QTY_PER_OP; a buy quote is cut to what his pile holds, a sell quote to the room left under SHOP.MAX_STOCK)
  - mode: request ('buy'; anything else is a sell quote)
- **Absent, and a bad value**: payload absent -> the message itself is read; key missing or not a string -> shop_quoted {ok:false, error:'Bad request'}; qty outside 1..MAX_QTY_PER_OP -> refused 'Bad quantity' (not clamped); mode absent -> a sell quote; a key he will not trade or has no price for -> ok with qty 0, total 0; a tool the asker may not buy -> ok, qty 0, with why ('off' | 'have' | 'quest'); a throw -> no answer
- **Notes**: answered shop_quoted to the asker; one read of shop_stock (none for a tool); no pace lane

#### `shop_sell` (phone to worker)

- **Handler**: server/src/index.js:5457 -> server/src/shop.js:624 _shopSell
- **Sent by**: src/ui/panels/ShopkeeperPanel.jsx:312 (shim src/networking/wsClient.js:6173)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state (router, index.js:5462); alive (not dying/dead) and not disconnected (shop.js:631); not in a fight with a player (the handler refuses: shop.js:644 _bagLockedByFight; fight-lock row sw 'fightlock'); no place check
- **Who may start it**: a person (border: a sale to the shopkeeper is not the market's "list"; pillar 11.7 names read, list, buy)
- **What it does**: moves value out (bag goods: move to Diego's public pile shop_stock, where any player may buy them; gold comes in: mint, road shop_sell, priced unit by unit against the growing pile)
- **Request id**: none: a repeat acts twice (a second lot of the same key is sold, at the lower price, while the bag holds enough)
- **Fields**:
  - key: request (must be held in the bag; not a staple, not food or drink, a key he prices: shop.js:637-651)
  - qty: request (Math.floor(Number()); whole 1..SHOP.MAX_QTY_PER_OP and no more than the bag holds, refused not clamped; cut only by his room under SHOP.MAX_STOCK)
- **Absent, and a bad value**: payload absent -> the message itself is read; no state -> dropped silently; key missing or not a string -> shop_result {ok:false, error:'Bad request'}; qty out of range -> refused 'Bad quantity'; more than held -> refused "You don't have that many"; a staple, food, drink or unpriced key -> refused in his words; his pile full -> sells what fits, or refused "He's full of those"; a throw -> shop_result 'Shop unavailable'
- **Notes**: answered shop_result {kind:'shop_sell', sold, paid, coins, stock, nextBuy}, then player_state to the seller, then shop_state to EVERY socket (broadcastAll) on a sale, to the asker alone on a refusal; the bag (bagTake), the purse (_goldGive) and the pile are saved in one run (shop.js:695-696); no pace lane; no price or total is read from the phone

#### `shop_buy` (phone to worker)

- **Handler**: server/src/index.js:5458 -> server/src/shop.js:704 _shopBuy
- **Sent by**: src/ui/panels/ShopkeeperPanel.jsx:312 (shim src/networking/wsClient.js:6173)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state (router); alive (not dying/dead) and not disconnected (shop.js:706); no fight check (fightlock.js: 'rearranges the bag'); no place check
- **Who may start it**: a helper with a grant (buy)
- **What it does**: moves value out (gold: burn, roads shop_tool / shop_staple / shop_pile; the goods come in from his shelf or out of the public pile shop_stock)
- **Request id**: none: a repeat acts twice (buys again while the gold and his pile last; a tool's second buy is refused 'You already have one')
- **Fields**:
  - key: request (a tool he sells back to a player a quest gave one and who holds none; a staple of DIEGO_SHELF; else a priced key his pile holds)
  - qty: request (Math.floor(Number()); whole 1..SHOP.MAX_QTY_PER_OP, refused outside it; from the pile it is cut to what he holds; a tool is always one)
- **Absent, and a bad value**: payload absent -> the message itself is read; no state -> dropped silently; key missing -> shop_result {ok:false, error:'Bad request'}; qty out of range -> refused 'Bad quantity'; over his stock -> clamped to the stock; not enough gold -> refused 'Not enough coins'; a tonic, a dish, cooked food, an unpriced key, an empty pile -> refused in his words; a throw -> 'Shop unavailable'
- **Notes**: answered shop_result {kind:'shop_buy', bought, cost, coins, ...}, then player_state, then shop_state to every socket on a purchase (to the asker alone on a refusal); the purse and the pile saved in one run (shop.js:794-795); the price is the worker's (flat, shop.js:437); no pace lane (see shop_sell's found)

#### `bank_open` (phone to worker)

- **Handler**: server/src/index.js:5644 -> server/src/bank.js:204 _handleBankOpen
- **Sent by**: src/game/bank.js:41 (shim src/networking/wsClient.js:5947)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state (after the read, bank.js:208); nothing else checked (anywhere, alive or not: it moves nothing)
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the sender's own vault bank:\<pid>; one storage get the first time in a session, then the cached copy)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: (none read; the phone sends an empty payload)
- **Absent, and a bad value**: nothing to be absent; no state after the read -> no answer; a failed read -> bank_state {ok:false, failed:true} and it reads again next time
- **Notes**: answered bank_state with last:null; still answered with the live flag bank off (on:false); no pace lane

#### `bank_deposit` (phone to worker)

- **Handler**: server/src/index.js:5647 -> server/src/bank.js:213 _handleBankMove (dir 'in')
- **Sent by**: src/game/bank.js:66 (shim src/networking/wsClient.js:5947)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive (not dying/dead); not disconnected; the vault readable (not a newer shape, not a failed read); live flag bank on; at the Bank's door (bank.js:169 _bankPlaceOk: zone 'wheel', within BANK.DOOR_R of the door); a token in the lane PACE.BANK; no fight check (fightlock.js: 'sound by place')
- **Who may start it**: a person
- **What it does**: changes your own state (bag stackables or gold out of the bag and purse into the sender's own vault bank:\<pid>, out of a death's reach; roads bank_deposit in the gold and bag doors; value stays in the account)
- **Request id**: opId: a string of 1..64 chars the phone makes; kept in the vault record's own ops list (the last BANK.OPS), written in the same put as the move; a repeat of a kept id answers ok and moves nothing (bank.js:228); only a move that happened spends its id
- **Fields**:
  - kind: request ('item' or 'gold', else refused)
  - id: request (an item's key, 1..64 chars, never __proto__/constructor/prototype; must be held in the bag; a gathering tool is refused 'kept')
  - n: request (Number.isInteger, 1..BANK.MAX_N; must be covered by the bag or purse and fit the vault's BANK.SLOTS and MAX_N; refused, never clamped)
  - opId: the request id
- **Absent, and a bad value**: payload not an object -> read as {} -> bank_state last {ok:false, err:'bad'}; no state, or dying/dead/disconnected -> dropped silently, no answer; kind, opId or n missing or bad (a string "5" is not a whole number) -> 'bad'; a bad key -> 'bad_key'; not at the door -> 'not_here'; flag off -> 'off'; lane dry or a failed read -> 'busy'; too few -> 'not_enough'; no room -> 'vault_full'
- **Notes**: answered player_state then bank_state {.., last:{opId, dir, kind, id, n, ok, err}}; the rpg: put and the bank: put go out in one run with no await between (bank.js:273-277); the replay check runs BEFORE the flag, the fields, the place and the pace, and answers ok echoing the replay's own kind/id/n, not the first move's

#### `bank_withdraw` (phone to worker)

- **Handler**: server/src/index.js:5650 -> server/src/bank.js:213 _handleBankMove (dir 'out')
- **Sent by**: src/game/bank.js:66 (shim src/networking/wsClient.js:5947)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; alive (not dying/dead); not disconnected; the vault readable; live flag bank on; at the Bank's door (bank.js:169 _bankPlaceOk); a token in the lane PACE.BANK; no fight check (fightlock.js: 'brings things in')
- **Who may start it**: a person
- **What it does**: changes your own state (stackables or gold out of the sender's own vault bank:\<pid> into the bag and purse; roads bank_withdraw)
- **Request id**: opId: as bank_deposit (kept in the vault's ops, the last BANK.OPS, in the move's own put; a kept id answers ok and moves nothing)
- **Fields**:
  - kind: request ('item' or 'gold')
  - id: request (an item's key the vault holds)
  - n: request (Number.isInteger, 1..BANK.MAX_N; must be in the vault, and the bag's stack may not pass BANK.MAX_N; refused, never clamped)
  - opId: the request id
- **Absent, and a bad value**: as bank_deposit; a key the vault does not hold -> 'bad_key'; more than the vault holds -> 'not_enough'; the bag's stack would pass MAX_N -> 'bag_full'
- **Notes**: answered player_state then bank_state with last; one run of two puts (bank.js:273-277); with the flag off what is in a vault cannot be taken out until it is on again ('off')

#### `store_dm` (phone to worker)

- **Handler**: server/src/index.js:5970 -> server/src/storechat.js:222 _handleStoreDm
- **Sent by**: src/ui/panels/buildings/StoreChatPanel.jsx:108 (through storeChatSend, src/ui/storeApi.js:89; shim src/networking/wsClient.js:6187)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; a token in the sender's own bucket (storechat.js:110 _scAllow: STORE_CHAT.BURST, one more every REFILL_MS); the listing is live; a seller may write only into a conversation a buyer already opened; nothing else checked (no state, no life, no place)
- **Who may start it**: never a helper (chat)
- **What it does**: speaks (one line to the other side of one listing's thread: buyer to seller, or seller to a buyer who wrote first; kept in store_thread:\<listingId>, the last STORE_CHAT.MSGS_MAX a conversation, at most THREADS_MAX conversations a listing, until the listing ends)
- **Request id**: none: a repeat acts twice (the same line is stored and delivered again; only the bucket bounds it)
- **Fields**:
  - listingId: request (storechat.js:134 _scListingId: a string of 1..64 chars, not an Object.prototype name; must be in the store's index)
  - text: words (storechat.js:124 _scText: cut to TEXT_MAX, control characters to spaces, trimmed, then chatguard.js:202 _chatGuardClean; stored, read by the other side of the thread and by the sender, and remembered for a report by _chatModRemember lane 'dm')
  - to: request (read only when the sender is the listing's seller: the buyer whose conversation is answered; must already exist in the thread's record)
- **Absent, and a bad value**: payload absent -> the message itself is read; listingId bad or text empty after cleaning -> dropped silently; bucket empty -> store_dm_error 'too-fast'; listing gone -> 'gone'; a seller with no or an unknown `to` -> 'no-thread'; a sixth buyer on one listing -> 'too-many'
- **Notes**: answered store_dm to the sender (the stored line echoed) and to the other side unless they muted the sender; one storage put a line (awaited before the echo); the sender's name on the line is the worker's copy (_scNameOf), never the phone's; live under caps.storeChat

#### `store_dm_open` (phone to worker)

- **Handler**: server/src/index.js:5973 -> server/src/storechat.js:171 _handleStoreDmOpen
- **Sent by**: src/ui/panels/buildings/StorePanel.jsx:268 (storeChatSend; shim src/networking/wsClient.js:6187)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked (any player may name any live listing; no pace)
- **Who may start it**: a helper with a grant (read) (border: it reads a listing's conversations, other players' words among them)
- **What it does**: reads (the listing's header, its offers, and the asker's own conversation, or every buyer's when the asker is the seller; one storage get of store_thread:\<listingId>)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: listingId: request (_scListingId; looked up in the store's index)
- **Absent, and a bad value**: payload absent -> the message itself is read; listingId missing, not a string, over 64 chars -> dropped silently; a listing that has ended -> store_dm_thread {listingId, gone:true, threads:[]}
- **Notes**: answered store_dm_thread to the asker; no pace lane of its own: every ask is a storage read, bounded only by the socket's message budget

#### `store_offer` (phone to worker)

- **Handler**: server/src/index.js:5982 -> server/src/storeoffer.js:411 _handleStoreOffer -> :137 _stOfferPlace -> :216 _soPlaceOneWrite
- **Sent by**: src/ui/panels/buildings/StoreChatPanel.jsx:241 (shim src/networking/wsClient.js:6182)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (the ROUTER refuses: FIGHT_GATED, sw 'fightlocktable', server/src/fightlock.js:173); the listing is live, not the sender's own, not mid-sale; a token in the offer bucket (storeoffer.js:92 _soAllow: STORE_OFFER.BURST, one more every REFILL_MS); has state ('Not in game', storeoffer.js:218); room for the offer (MAX_PER_LISTING, unless it replaces the sender's own); no life or place check
- **Who may start it**: a helper with a grant (buy) (border: it escrows gold on an offer the seller may accept, and puts the buyer's name and number in front of the seller)
- **What it does**: moves value out (gold: escrow on store_listing:\<id> as rec.offers[\<buyer>], roads ah_offer and ah_offer_back; held until the seller's yes or no, the buyer's withdrawal, the listing's end, or STORE_OFFER.OFFER_EXPIRY); speaks (the offer is shown to the seller under the buyer's name)
- **Request id**: none: a repeat acts twice (the standing offer is handed back and placed again: the same gold, a new seq, its 48 h clock and the seller's 'think' mark start over, and the seller is told again); the settlement's own ids store:\<id>:offer:\<seq> and store:\<id>:offerref:\<seq> are the worker's
- **Fields**:
  - listingId: request (_scListingId; a live listing in the store's index)
  - gold: request (storeoffer.js:108 _soGold: Math.floor(Number()), whole, STORE_OFFER.MIN..STORE.MAX_PRICE, REFUSED outside it, never clamped; must be covered by the purse plus the sender's standing offer; may be LOWER than the standing offer it replaces)
- **Absent, and a bad value**: payload absent -> the message itself is read; listingId bad -> dropped silently (and, in a fight, no refusal either); gold not a whole number in range -> store_offer_error 'Offer a whole number of gold'; own listing, ended, mid-sale, too fast, full, 'Not enough gold' (a failed raise also hands the old offer back) -> store_offer_error with the worker's sentence
- **Notes**: answered store_offer_state to the buyer, and to the seller (storeoffer.js:404 _soNotify); with the live flag ahonewrite on (the default) the purse, both stamps and the listing go out in one run (storeoffer.js:236-245); live under caps.storeOffer

#### `store_offer_cancel` (phone to worker)

- **Handler**: server/src/index.js:5985 -> server/src/storeoffer.js:421 _handleStoreOfferCancel -> :286 _stOfferWithdraw -> :251 _soRefundOne
- **Sent by**: src/ui/panels/buildings/StoreChatPanel.jsx:221 (shim src/networking/wsClient.js:6182)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the listing is live; the sender holds an offer on it; nothing else checked (no pace, no fight check: fightlock.js 'brings things in')
- **Who may start it**: a helper with a grant (buy) (border: it takes the buyer's own offer back)
- **What it does**: changes your own state (the sender's escrowed gold comes home from store_listing:\<id>, by _creditWith / _creditPlayer under opId store:\<id>:offerref:\<seq>; the listing is written without the offer in the same run)
- **Request id**: none: a repeat changes nothing (no offer left: refused 'You have no offer on that'; the refund's own opId pays once)
- **Fields**: listingId: request (_scListingId; a live listing on which the sender holds an offer)
- **Absent, and a bad value**: payload absent -> the message itself is read; listingId bad -> dropped silently; listing ended -> store_offer_error 'That listing has ended'; no offer -> 'You have no offer on that'
- **Notes**: answered store_offer_state to the buyer and the seller; the refund arrives as mail gold (inbox_delivered) and the purse's player_state

#### `store_offer_reply` (phone to worker)

- **Handler**: server/src/index.js:5988 -> server/src/storeoffer.js:431 _handleStoreOfferReply -> :299 _stOfferReply
- **Sent by**: src/ui/panels/buildings/StoreChatPanel.jsx:276 (shim src/networking/wsClient.js:6182)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the sender is the listing's seller (rec.sellerId); the listing is live and not mid-sale; the named buyer holds an offer; nothing else checked (no pace on the message, no fight check: fightlock.js 'brings things in')
- **Who may start it**: a person (border: Yes sells the listed goods at the buyer's price; pillar 11.7's "list" covers putting goods up and taking them down, not accepting a price)
- **What it does**: yes: moves value out (the listed goods, a stack, a weapon, a gear piece or a pet: move to the buyer; the offer's escrowed gold comes to the seller; every other bid and offer is refunded) and cannot be undone (a sale; the listing and its thread are deleted) | no: the buyer's escrowed gold goes home | think: a mark on the offer, the gold still held; speaks (an answer from a fixed list shown to the buyer, never text)
- **Request id**: none: a repeat changes nothing for yes (the listing is gone: 'That listing has ended') or no ('No offer to answer'); a repeated think sets the same mark and tells the buyer again. It names a BUYER, not an offer: there is no seq and no amount in it
- **Fields**:
  - listingId: request (_scListingId; must be the sender's own live listing)
  - buyerId: request (_scListingId; must hold a live offer on it)
  - reply: request (one of OFFER_REPLIES 'yes'
  - 'think'
  - 'no'; anything else refused 'Unknown reply')
- **Absent, and a bad value**: payload absent -> the message itself is read; listingId or buyerId bad -> dropped silently; not the seller, ended, mid-sale, no such offer, unknown reply -> store_offer_error with the worker's sentence
- **Notes**: answered store_offer_state (sold:true after a yes) to the seller and the buyer; a 'think' is written only while the lane PACE.THINK has a token (the mark still changes in memory and is told); a yes runs store.js _stSettle, the same settlement as Buy and Accept-Bid

### 3.K1 wagers: the hall, Ace, the jackpot, the arena (6)

#### `arena_sponsor` (phone to worker)

- **Handler**: server/src/index.js:5849 -> server/src/gladiator.js:473 _handleArenaSponsor
- **Sent by**: src/ui/panels/buildings/PartyPanel.jsx:932 (only against caps.sponsor)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:160, answering arena_stake_error code 'fight'); a tournament is running (gladiator.js:490); the match has no winner yet (499); the sender is not one of its two fighters (501); the sender's live state holds the gold (inbox.js:120 _escrowDebitGoldTogether). Not checked: alive, a place
- **Who may start it**: never a helper (wagers)
- **What it does**: moves value out (escrow arena_stake:\<tid>:\<matchId>:\<sponsor>; on the match's result it goes back with a share of the losing stakes, or to the winners and the winning fighter: gladiator.js:564); cannot be undone (no way to take a stake back)
- **Request id**: none: a repeat changes nothing (the record arena_stake:\<tid>:\<matchId>:\<sponsor> answers 'already-staked', gladiator.js:507; its stamp arenastake:\<tid>:\<matchId>:\<sponsor> is written with it in one run, 536)
- **Fields**:
  - targetId: request (must be fighter a or b of the match, gladiator.js:500)
  - matchId: request (optional: a match of this tournament by id; without it the open current-round match holding targetId, 494-498)
  - amount: request (floored; ARENA.STAKE_MIN..ARENA.STAKE_MAX; the purse must hold it)
- **Absent, and a bad value**: no tournament, no open match, a target not in it, own match, a bad amount, a second stake, too little gold -> refused: arena_stake_error {code, message, targetId?, matchId?}; no matchId -> looked up from targetId; fields read from msg.payload || msg
- **Notes**: answered arena_stake_placed to the sender, then arena_stake_board to everyone; the worker rolls nothing: the result is the duel's own (gladiator.js:670 _arenaOnMatchResolved); payouts by _creditPlayer under opIds arenastakewin: / arenastakecut: / arenastakeloss:, an orphan refunded under arenastakerefund: (gladiator.js:833); live flag arenastakeonewrite (false: the old two writes); no kill switch for staking itself

#### `gamble_request` (phone to worker)

- **Handler**: server/src/index.js:6091 -> server/src/gamble.js:290 _handleGambleRequest
- **Sent by**: src/ui/panels/buildings/GamblePanel.jsx:226 (only against caps.gamble)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:156, re-sending coins); has state; alive; not disconnected; 2 s since the last roll (ps._lastGambleAt, memory only). No place check
- **Who may start it**: never a helper (wagers)
- **What it does**: moves value out (burn: a loss takes the wager, gold road gamble_loss); changes your own state (mint: a win gives the wager again, gold road gamble_win); cannot be undone
- **Request id**: none: a repeat acts twice (a new roll; only the 2 s cooldown stands between, and a rejoin clears it)
- **Fields**: wager: request (floored; 10..10000; the purse must hold it)
- **Absent, and a bad value**: no wager or out of range -> dropped silently; inside the cooldown -> dropped silently; more than the purse -> refused: the true coins re-sent (gamble.js:299); fields read from msg.payload || msg
- **Notes**: the WORKER rolls (Math.random \< 0.40, gamble.js:301) and settles in one change, saved at once; no escrow, no opId; answered gamble_result to the sender and a player_state flush; no kill switch in the live flags

#### `ace_flip_request` (phone to worker)

- **Handler**: server/src/index.js:6100 -> server/src/gamble.js:246 _handleAceFlipRequest
- **Sent by**: src/ui/panels/AceFlipPanel.jsx:291
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:157, re-sending coins); has state; alive; not disconnected; ACE_FLIP.COOLDOWN_MS since the last flip of either kind (ps._lastAceFlipAt, memory only). No place check
- **Who may start it**: never a helper (wagers)
- **What it does**: moves value out (burn: a loss takes 3x the stake, gold road ace_flip_loss); changes your own state (mint: a win gives 3x the stake, gold road ace_flip_win); cannot be undone
- **Request id**: none: a repeat acts twice (a new flip; only the cooldown stands between)
- **Fields**: stake: request (floored; at least ACE_FLIP.MIN_STAKE; 3x the stake must fit the purse, gamble.js:258; no other ceiling)
- **Absent, and a bad value**: no stake or under the least -> dropped silently; inside the cooldown -> dropped silently; a loss the purse cannot pay -> refused: the true coins re-sent (gamble.js:258); fields read from msg.payload || msg
- **Notes**: the WORKER flips (Math.random \< ACE_FLIP.WIN_CHANCE) and settles in one change, saved at once; answered ace_flip_result, a player_state flush, then ace_board; a top-ten win or loss writes the public board ace_board with the player's name and stored look (gamble.js:127); no kill switch in the live flags

#### `ace_item_flip_request` (phone to worker)

- **Handler**: server/src/index.js:6115 -> server/src/gamble.js:177 _handleAceItemFlipRequest
- **Sent by**: src/ui/panels/AceFlipPanel.jsx:324
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:158, re-sending the bag); has state; alive; not disconnected; ACE_ITEMS.COOLDOWN_MS since the last flip of either kind (ps._lastAceFlipAt). No place check
- **Who may start it**: never a helper (wagers)
- **What it does**: moves value out (burn: a loss takes every staked stack, bag road ace_items_loss); changes your own state (mint: a win gives every staked stack again, bag road ace_items_win); cannot be undone
- **Request id**: none: a repeat acts twice (a new flip of whatever the bag then holds; only the cooldown stands between)
- **Fields**: items: request (a map of bag key -> quantity; the first ACE_ITEMS.MAX_KINDS keys are read; a key must be the bag's own, not a prototype name, not a golden ticket; the quantity is clamped to min(asked, held, ACE_ITEMS.MAX_QTY), gamble.js:189-210)
- **Absent, and a bad value**: no items or not an object -> dropped silently; a bad key or quantity -> that entry skipped, the rest still flips; nothing of it in the bag -> refused: the true bag re-sent (gamble.js:214); inside the cooldown -> dropped silently; fields read from msg.payload || msg
- **Notes**: the WORKER flips once for the whole stake (Math.random \< ACE_ITEMS.WIN_CHANCE), saved at once; answered ace_item_flip_result and a player_state flush; never written to the board; no kill switch in the live flags

#### `ace_board_request` (phone to worker)

- **Handler**: server/src/index.js:6147 -> server/src/gamble.js:171 _handleAceBoardRequest
- **Sent by**: src/ui/panels/AceFlipPanel.jsx:339 (also src/ui/mobile/dash/LeaderboardPanel.jsx:272)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the public board of Ace's ten biggest wins and losses)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: (none read: the payload is not passed to the handler)
- **Absent, and a bad value**: nothing to be absent
- **Notes**: answered ace_board to the sender; one storage get of ace_board an ask (gamble.js:114), paced only by the socket's budget

#### `jackpot_deposit` (phone to worker)

- **Handler**: server/src/index.js:6154 -> server/src/cadence.js:158 _handleJackpotDeposit
- **Sent by**: src/ui/panels/buildings/GamblePanel.jsx:305
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (fightlocktable: the ROUTER refuses, fightlock.js:153, re-sending coins); live flag disable_jackpot not set (silent); has state; alive; not disconnected. No place check
- **Who may start it**: never a helper (wagers)
- **What it does**: moves value out (escrow jackpot:draw: the week's pool; gold road jackpot_ticket; the whole pool goes to one ticket-weighted winner at the week's end, cadence.js:199); cannot be undone (no ticket is ever given back)
- **Request id**: none: a repeat acts twice (a second deposit buys more tickets; the handler says a resent deposit is a new deposit, cadence.js:177)
- **Fields**: amount: request (floored; CADENCE.JACKPOT_MIN..CADENCE.JACKPOT_MAX; a whole multiple of CADENCE.JACKPOT_TICKET; the purse must hold it)
- **Absent, and a bad value**: no amount, out of range or not a multiple -> dropped silently; more than the purse -> refused: the true coins re-sent (player_state, _refusalEcho, cadence.js:170); the switch thrown -> dropped silently; fields read from msg.payload || msg
- **Notes**: answered jackpot_state {deposited} to the sender and a player_state flush; a stale week is drawn first (_jackpotMaybeResolve, 173); the purse's save and the pool's put leave in one synchronous run (179-189); no pace lane of its own (each deposit costs gold)

### 3.K2 the daily rewards, the wheel, the chests (11)

#### `loginspin_ask` (phone to worker)

- **Handler**: server/src/index.js:5588 -> server/src/loginspin.js:166 _handleLoginSpinAsk
- **Sent by**: src/ui/mobile/LoginSpinWindow.jsx:159 (once the world is up, against caps.loginspin)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the switch `loginspin` not false; has state; alive (not dying or dead); not disconnected
- **Who may start it**: a helper with a grant (read) (border: before it answers it pays out an open or unpaid pot of the account, which ends that pot's double or nothing)
- **What it does**: reads (may this account spin today); changes your own state (mint: an open or unpaid pot of the account is closed and paid to the character that spun it, loginspin.js:128 _loginSpinSettle)
- **Request id**: none: a repeat changes nothing (it answers again; the pot's pay is opId loginspin:\<acct>:\<day> in oplog:, and `paid` on lspin:\<acct>)
- **Fields**: (none read: the router passes the session only)
- **Absent, and a bad value**: nothing to be absent; switch off, no state, dying or dead -> dropped, no answer
- **Notes**: answers loginspin_state {avail, day} | the account is the join's device id (d:\<id>), else the character (p:\<pid>): loginspin.js:88 | no pace of its own (the record is cached after one storage get)

#### `loginspin_go` (phone to worker)

- **Handler**: server/src/index.js:5589 -> server/src/loginspin.js:178 _handleLoginSpinGo
- **Sent by**: src/ui/mobile/LoginSpinWindow.jsx:181
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; switch `loginspin` not false; has state; alive; not disconnected; on the Wheel's safe ground (loginspin.js:115 _loginSpinSafe: any zone that is not the Wheel passes); the account has not spun this UTC day (lspin:\<acct>.day)
- **Who may start it**: a person (border: a free spin stakes nothing, so it is not a wager; it opens the pot a double can then lose)
- **What it does**: changes your own state (the account's spin for the day is spent and a pot opened in lspin:\<acct>; the worker rolls the segment, loginspin.js:195; no gold moves until the pot is settled)
- **Request id**: none: a repeat changes nothing (the day's stamp on lspin:\<acct>; the same character asking again at k 0 is sent the same loginspin_result, anyone else loginspin_state {avail:false})
- **Fields**: opId: not read (the phone sends one; the router passes no payload, index.js:5596)
- **Absent, and a bad value**: nothing to be absent; off safe ground -> refused, loginspin_state {avail, safe:false}; already spun -> refused, loginspin_state {avail:false}; the record's save fails -> the spin is undone in memory and nothing is answered
- **Notes**: answers loginspin_result {idx, base, pot, k, open, can} | the pot is paid by loginspin_collect, at the limit, after LOGIN_SPIN.IDLE_MS with no move (a setTimeout: memory only), or at the next loginspin_ask of any character on the account; a lost double pays nothing | the stamp is per ACCOUNT (the device id), one a UTC day | cap loginspin

#### `loginspin_double` (phone to worker)

- **Handler**: server/src/index.js:5590 -> server/src/loginspin.js:210 _handleLoginSpinRound
- **Sent by**: src/ui/mobile/LoginSpinWindow.jsx:275
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; switch `loginspin` not false; has state; alive; not disconnected; the sender is the character that spun (rec.pid) and its pot is open; on the Wheel's safe ground; one more double stays inside LOGIN_SPIN.POT_MAX
- **Who may start it**: never a helper (wagers) (border: the stake is the pot the free spin just made, never the purse; it is still a 50/50 that can lose it all)
- **What it does**: moves value out (a lost double burns the open pot, which was the account's to take); changes your own state (a won double doubles the pot in lspin:\<acct>; a pot that can double no further is paid at once: mint, opId loginspin:\<acct>:\<day>); cannot be undone
- **Request id**: k: the round's index, held on lspin:\<acct>.k; a k that is not the open round's is answered again from the record (loginspin_round {replay:true}), never rolled again
- **Fields**: k: request (judge: must equal rec.k of the sender's own open pot, loginspin.js:220)
- **Absent, and a bad value**: no k, or not a number -> never the open round: answered as a replay, nothing rolled; not the spinner, or no spin on record -> loginspin_state {avail:false}; off safe ground -> loginspin_state {avail:false, safe:false, held:true}; at the limit -> loginspin_round {replay:true}
- **Notes**: answers loginspin_round | the worker rolls the coin (loginspin.js:231) and saves the record before it answers | a lost pot may take a row on spin_board's losses

#### `loginspin_collect` (phone to worker)

- **Handler**: server/src/index.js:5591 -> server/src/loginspin.js:210 _handleLoginSpinRound
- **Sent by**: src/ui/mobile/LoginSpinWindow.jsx:269
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; switch `loginspin` not false; has state; alive; not disconnected; the sender is the character that spun and its pot is open (no place check: loginspin.js:225)
- **Who may start it**: a person (border: it ends a double or nothing by taking the pot; nothing is staked)
- **What it does**: changes your own state (mint: the pot's gold to the character that spun, through _creditPlayer, loginspin.js:135)
- **Request id**: k: as loginspin_double (a pot already closed is answered the same again); the pay itself is opId loginspin:\<acct>:\<day> in oplog:, `open` cleared and saved first, `paid` saved after
- **Fields**: k: request (judge: must equal rec.k of the sender's own open pot)
- **Absent, and a bad value**: no k -> answered as a replay and NOT collected (the pot stays open until the idle timer or the next ask pays it); not the spinner -> loginspin_state {avail:false}
- **Notes**: answers loginspin_round {collected:true, pot, ...}, then player_state | a paid pot may take a row on spin_board's wins

#### `chest_open` (phone to worker)

- **Handler**: server/src/index.js:5602 -> server/src/dailychest.js:100 _handleChestOpen
- **Sent by**: src/ui/mobile/ChestReveal.jsx:145
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; switch `dailyChest` not false; has state; alive; not disconnected; holds a daily_chest in the worker's copy of the bag (read again after the streak's await)
- **Who may start it**: a person
- **What it does**: changes your own state (burn: one daily_chest from the bag; mint: the worker rolls coins by the login streak, 10 fish_minnow, a rare gem, or a copper or iron armour piece entered in gear_prov: with src 'chest'); cannot be undone (the chest is spent for the rolled prize)
- **Request id**: opId: optional string; oplog:chestop:\<opId>, read before the roll and stamped after it (kept 48 h); a seen one is dropped with no answer. The phone makes a new one for every tap (ChestReveal.jsx:144), so it stops a replayed frame only; a repeat under a new one opens the NEXT chest in the bag (each open takes one chest, so no chest pays twice)
- **Fields**:
  - invKey: request (must be exactly 'daily_chest')
  - opId: the request id (any string)
- **Absent, and a bad value**: no payload -> the message itself is read; invKey anything else -> dropped; switch off -> dropped (the chest waits); no chest -> refused by sending the bag again (_refusalEcho ['inventory'])
- **Notes**: answers chest_opened {prize, streak}, then player_state; saved at once | nothing in server/src grants a daily_chest any more (cadence.js:95), so only chests left in bags from before tag 3140 reach this | cap dailyChest

#### `rewards_get` (phone to worker)

- **Handler**: server/src/index.js:5614 -> server/src/dailyrewards.js:1059 _handleRewardsGet
- **Sent by**: src/game/dailyRewards.js:98 askRewards
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state (dying or dead is not asked); at most one every 800 ms (ps._lastRewardsGetAt, memory)
- **Who may start it**: a helper with a grant (read) (border: it also turns the record over to today, which pays what is already owed)
- **What it does**: reads (the spin, the streak, the day's quests, the season); changes your own state (a new UTC day or a dropped season turns the record over, dailyrewards.js:409 _drRollover: mint, yesterday's open pot paid under opId spinpot:\<pid>:\<run>, a dropped season's reached tiers mailed under season:\<pid>:\<s>:\<t>:\<g>)
- **Request id**: none: a repeat changes nothing (a read; the turn-over's pays are stamped and the record saved at once)
- **Fields**: (none read: the router passes the session only)
- **Absent, and a bad value**: nothing to be absent; inside the 800 ms -> dropped, no answer
- **Notes**: answers rewards_state | the same state is sent unasked at the join (join.js:1983)

#### `daily_spin` (phone to worker)

- **Handler**: server/src/index.js:5617 -> server/src/dailyrewards.js:608 _handleDailySpin
- **Sent by**: src/game/dailyRewards.js:89 askSpin
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; switch `dailyspin` not false; has state; alive; not disconnected; SPIN.COOLDOWN_MS since the last act (memory); act spin: no pot open, tut_1 handed in (dailyrewards.js:689 _dqUnlocked), the day's free spin or a banked one left; double and collect: an open pot (double: inside SPIN.POT_MAX). No place is checked
- **Who may start it**: never a helper (wagers) (border: one type, three acts: 'double' is the wager; 'spin' is free and 'collect' takes the pot, and neither stakes anything)
- **What it does**: changes your own state (spin: the day's free spin or a banked one spent, the worker rolls a lump sum raised by the login streak into a pot on daily_rewards:\<pid>; collect, or a pot at the limit: mint, the pot's gold through _creditPlayer); moves value out (a lost double burns the open pot); cannot be undone (double)
- **Request id**: opId: optional string, 96 at most; oplog:spinop:\<opId>, read first and stamped after the act (48 h); a seen one is dropped with NO answer. The phone makes a new one for every ask (dailyRewards.js:93), so it stops a replayed frame only: a second 'double' under a new opId rolls again (the round is not named, unlike loginspin_double's k). A second 'spin' is refused 'open', a second 'collect' 'closed'. The pot's pay is opId spinpot:\<pid>:\<run>
- **Fields**:
  - act: request ('double' or 'collect'; anything else, or nothing, is 'spin')
  - opId: the request id (a string over 96 is taken as none)
- **Absent, and a bad value**: no payload or no act -> 'spin' (it spends the free spin); a refused act -> rewards_state {news: {kind:'spin', act, refused: open, locked, none, closed or limit}}; switch off, dead, inside the cooldown, a seen opId -> dropped, no answer
- **Notes**: answers rewards_state with news {kind:'spin', ...} | per CHARACTER (daily_rewards:\<pid>.sp), one free spin a UTC day | a pot left open is paid at the day's turn-over, never lost | a paid or a lost pot may take a row on spin_board | cap dailyspin

#### `daily_reroll` (phone to worker)

- **Handler**: server/src/index.js:5620 -> server/src/dailyrewards.js:849 _handleDailyReroll
- **Sent by**: src/game/dailyRewards.js:96 askReroll
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the daily quests switched ON (`dailyquests: true` in the live flags; off today, dailyrewards.js:354 _dqOff, so the message is dropped); has state; alive; not disconnected
- **Who may start it**: a person
- **What it does**: changes your own state (quest i of the day swapped for another the player can do, the day's one reroll spent, on daily_rewards:\<pid>.dq)
- **Request id**: none: a repeat changes nothing (dq.rr reaches QUESTS.REROLLS; the second is answered with the list as it stands)
- **Fields**: i: request (an exact integer, 0 to QUESTS.COUNT - 1; judge: that quest exists, is not done, a reroll is left, another template fits)
- **Absent, and a bad value**: no i, a fraction, a string, out of range -> dropped, no answer; a reroll refused -> rewards_state with no news (the true list)
- **Notes**: answers rewards_state {news: {kind:'reroll', i}}; saved at once

#### `season_claim` (phone to worker)

- **Handler**: server/src/index.js:5623 -> server/src/dailyrewards.js:973 _handleSeasonClaim
- **Sent by**: src/game/dailyRewards.js:97 askClaim
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the season switched ON (`season: true` in the live flags; dropped today, dailyrewards.js:360 _seOff, so the message is dropped); has state; alive; not disconnected
- **Who may start it**: a person
- **What it does**: changes your own state (mint: each claimed tier's coins and items through _creditPlayer, its bonus spins on the record, its streak freezes on cadence:login:\<pid>)
- **Request id**: none: a repeat changes nothing (the tier is marked in se.cl before anything is paid; each grant's opId is season:\<pid>:\<season>:\<tier>:\<grant>, the same for the season-end mail)
- **Fields**:
  - all: request (truthy: every tier)
  - tier: request (an exact integer, 1 to the tiers' count; judge: the stars reach dailyrewards.js:268 tierNeed, and the tier is not claimed)
- **Absent, and a bad value**: neither field -> dropped; a tier not reached or already claimed -> dropped, no answer
- **Notes**: answers rewards_state {news: {kind:'claim', tiers, grants}} | with the season dropped the turn-over mails every reached tier instead

#### `rise_chest_open` (phone to worker)

- **Handler**: server/src/index.js:6135 -> server/src/risechest.js:104 _handleRiseChest
- **Sent by**: src/game/climbActions.js:251
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; the switch `risechest` not false and the room plays the Wheel the faces were baked for (risechest.js:88 _riseChestOn); in the Wheel; not dead (dying is not asked); the worker's own copy of the feet on the rise's top and within REACH_PX + SLACK_PX of the chest's baked box (risechest.js:70 feetAtRiseChest)
- **Who may start it**: a person (border: it pays only a body walked to the chest, and movement is never a helper's)
- **What it does**: changes your own state (mint: the rise's coins, RISE_CHEST.COINS, through _creditPlayer)
- **Request id**: none of its own: the pay's opId risechest:\<pid>:\<rise id> in oplog: answers a second ask 'got' (per CHARACTER and rise)
- **Fields**: id: request (a string, cut to 40; judge: risechest.js:60 riseWithChest, a baked rise with a chest and a prize). Read from msg.payload, else from the message itself: the router passes the whole message (index.js:6136)
- **Absent, and a bad value**: no id, not a string, unknown -> refused, rise_chest {ok:false, why:'none'}; switch off -> 'off'; not at it, another zone, dead -> 'far'; had it -> 'got'
- **Notes**: answers rise_chest | no pace of its own | the place is the move's own bounded claim: the worker checks neither the jump nor the face (the file's header, risechest.js:21-33; step 4.2's move with no walls) | cap risechest

#### `spin_board_request` (phone to worker)

- **Handler**: server/src/index.js:6139 -> server/src/boards.js:261 _handleSpinBoardRequest
- **Sent by**: src/game/spinBoard.js:30
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; nothing else checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the ten biggest daily-spin pots paid and the ten biggest lost to a double: other players' names, ids, levels and faces)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: (none read: the router passes the session only)
- **Absent, and a bad value**: nothing to be absent
- **Notes**: answers spin_board {wins, losses}, {off:true} under `boards2: false`, or {unavailable:true} (a failed read or a newer record) | no pace of its own beyond the socket's budget (the book is read from storage once a worker's life) | cap boards2

### 3.L1 trades (8)

#### `trade2_open` (phone to worker)

- **Handler**: server/src/index.js:5868 -> server/src/trade2.js:134 _handleTrade2Open
- **Sent by**: src/ui/panels/InspectPlayerPanel.jsx:268 (the card's Trade; the invite's own Trade button sends the same back, src/ui/panels/TradeWindowPanel.jsx:1106)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; not dying or dead (136); the target has state and is not dying or disconnected (140); neither side already in an open window (146). Not checked: place or distance, a pace, the live flag trade2
- **Who may start it**: never a helper (trades)
- **What it does**: speaks (the target is sent trade2_invite with the asker's name); changes your own state (an invite kept in memory for TRADE2.INVITE_TTL; when the target had already opened toward you inside that time the window goes live: a new session with a fresh id, nothing staged)
- **Request id**: none: a repeat acts twice (each one sends the target another trade2_invite and renews the invite; once a window is live it is answered 'busy')
- **Fields**: target: request (a player id; judge: this.playerState[target] exists and is not the sender, 138-142)
- **Absent, and a bad value**: no target, not a string, or yourself -> dropped silently; a target not in the room, dying or disconnected -> refused, trade2_state {state:'cancelled', reason:'target-gone'}; either side in a window -> refused, reason 'busy'
- **Notes**: answers trade2_state {state:'invited', target} to the asker, or the open session to both; caps.trade2, trade2Weapons, trade2Review advertise the window; `trade2: false` in the live flags only un-advertises it (no trade2 handler reads the flag; it opens the gift lane, server/src/trade.js:63)

#### `trade2_set` (phone to worker)

- **Handler**: server/src/index.js:5874 -> server/src/trade2.js:185 _handleTrade2Set
- **Sent by**: src/ui/panels/TradeWindowPanel.jsx:1196
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; in an open window (186 _t2SessionFor); nothing else checked (not alive, not that the goods are held)
- **Who may start it**: never a helper (trades)
- **What it does**: changes your own state (replaces YOUR staged side whole; nothing moves; both readies and both accepts reset and the accept cooldown starts again); speaks (the other side is shown the offer)
- **Request id**: none: a repeat changes nothing in the offer (the same side set again) but un-readies both sides again
- **Fields**: offer: request (a map itemKey -> qty, and _gold; cleaned by server/src/trade.js:104 _sanitizeTradeOffer: a key at most 32 chars and no Object.prototype name, at most 20 keys, qty whole 1..9999, _gold whole 1..999999 (the literal at trade.js:111); what is held is judged only at the commit, trade2.js:266-272)
- **Absent, and a bad value**: no offer, not an object, or nothing left after cleaning -> an EMPTY side (legal: gold for goods); a bad key or qty -> that entry dropped; over a cap -> clamped
- **Notes**: answered trade2_state to both; memory only, no write, no pace of its own. No fee on a trade: what one side stages the other gets whole (trade2.js:325; pillar 10.5's 999,999)

#### `trade2_ready` (phone to worker)

- **Handler**: server/src/index.js:5877 -> server/src/trade2.js:213 _handleTrade2Ready
- **Sent by**: src/ui/panels/TradeWindowPanel.jsx:1911
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; in an open window; nothing else checked
- **Who may start it**: never a helper (trades)
- **What it does**: changes your own state (your "done editing" flag; when both are set the window shows the review; it commits nothing)
- **Request id**: none: a repeat changes nothing (the flag is set to what it was)
- **Fields**: ready: request (only the value false un-readies, the review's Back; anything else, or absent, readies; 219)
- **Absent, and a bad value**: no payload or no ready -> ready; no open window -> dropped silently
- **Notes**: answered trade2_state to both (stage 'review' once both are ready); the phone sends it only against caps.trade2Review

#### `trade2_confirm` (phone to worker)

- **Handler**: server/src/index.js:5885 -> server/src/trade2.js:224 _handleTrade2Confirm
- **Sent by**: src/ui/panels/TradeWindowPanel.jsx:1933
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; in an open window; both sides ready (235); TRADE2.ACCEPT_COOLDOWN_MS since the last change (236); neither side in a fight with a player (242: the handler refuses, fight lock `fightlock`, the window stays). At the commit: both have state and neither is disconnected (254); each still holds its gold and goods (266-272); each staged pet is still its owner's to trade and each side has room for the pets it gets (276-289). Not checked: alive
- **Who may start it**: never a helper (trades)
- **What it does**: moves value out (the second accept is the swap: each side's staged gold, goods, pets and escrowed weapons move to the other; roads trade_window; no fee); cannot be undone
- **Request id**: none: a repeat changes nothing (your accept is already set; after the swap the session is deleted, 316-317, and the handler finds none). The swap's credits carry opIds trade2:\<session id>:\<player>:gold, :\<item key>, :wpndeliver:\<owner>:\<seq>, :pet:\<pet id>
- **Fields**: (none read: the router passes no payload)
- **Absent, and a bad value**: nothing to be absent. A gate that fails -> trade2_state to both with reason 'not-ready', 'cooling' or 'fight'; a shortfall at the commit -> the window cancelled, reason 'insufficient:\<pid>', 'pet-gone:\<pid>', 'pets-full:\<pid>' or 'party-gone', escrowed weapons refunded
- **Notes**: validate at commit (only weapons are escrowed); both debits, the pets, the credits, their stamps and the weapons' escrow records go out in one synchronous run (383 -> server/src/inbox.js:285 _creditLiveTogether; `tradeonewrite: false` pays the weapons in writes of their own again); a full stash gets its weapon by mail, the record marked owed (`to`) so a restart's sweep delivers it; answered trade2_state {state:'done', settled:true, petsMoved} to both, the goods by player_state

#### `trade2_cancel` (phone to worker)

- **Handler**: server/src/index.js:5888 -> server/src/trade2.js:481 _handleTrade2Cancel
- **Sent by**: src/game/tradeSlot.js:66
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked
- **Who may start it**: never a helper (trades)
- **What it does**: changes your own state (ends your open window: both sides' escrowed weapons are refunded, trade2.js:698; clears every invite to or from you); speaks (the other side is told 'declined')
- **Request id**: none: a repeat changes nothing (the session and the invites are gone; with an id and no session each one is answered 'gone' again)
- **Fields**: id: echo (the trade the phone's window shows; a string, cut to 64, sent back in the 'gone' answer; never used to find a session: the session is the sender's own)
- **Absent, and a bad value**: no payload -> your open window and your invites are cancelled all the same; no window and no id -> only invites are cleared; an id that is not a string -> ignored
- **Notes**: the router reads msg.payload ONLY here (index.js:5889), not `msg.payload || msg`; answers trade2_state {state:'cancelled', reason:'declined'} to both sides of a window and to each invite's other end, or {reason:'gone', id} to the asker (off with `rejoinresend: false`); a disconnect (server/src/leave.js:250) and the tick (trade2.js:506: INVITE_TTL, SESSION_TTL) cancel the same way

#### `trade2_stage_weapon` (phone to worker)

- **Handler**: server/src/index.js:5891 -> server/src/trade2.js:611 _handleTrade2StageWeapon
- **Sent by**: src/ui/panels/TradeWindowPanel.jsx:1222
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; not in a fight with a player (the ROUTER refuses: FIGHT_GATED, switch `fightlocktable`, and re-sends weaponStash, server/src/fightlock.js:182); in an open window (612); the pace lane PACE.T2WPN (621); has state, not dying or dead (623); fewer than TRADE2.WEAPON_MAX staged (638)
- **Who may start it**: never a helper (trades)
- **What it does**: moves value out (escrow trade2wpn:\<pid>:\<seq>: the weapon leaves the worker's own stash for the window's escrow, the record and the stash's save in one write, 652-656; it comes back on unstage, cancel, disconnect, expiry or a restart's sweep, or goes to the other side at the commit)
- **Request id**: none: a repeat acts twice (it stages whatever weapon now stands at that place, up to WEAPON_MAX). stashIdx is a PLACE IN A LIST, not an id
- **Fields**:
  - stashIdx: request (a whole number inside the worker's weaponStash, 626; the weapon is the worker's own copy through _sanitizeWeapon, never a blob from the wire)
  - expectName: request (optional: when a string, the weapon at that place must carry this name, 631-632)
- **Absent, and a bad value**: no stashIdx, not a whole number, out of range, or a name that does not match -> dropped silently; at the cap -> refused, trade2_state with reason 'weapons-max' to the sender; past the pace -> dropped silently
- **Notes**: answered trade2_state to both (readies and accepts reset) and player_state (the stash); the phone sends it only against caps.trade2Weapons, always with expectName

#### `trade2_unstage_weapon` (phone to worker)

- **Handler**: server/src/index.js:5897 -> server/src/trade2.js:671 _handleTrade2UnstageWeapon
- **Sent by**: src/ui/panels/TradeWindowPanel.jsx:1567
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; in an open window holding weapons (673); seq is one of YOUR escrowed weapons (676); the pace lane PACE.T2WPN (680). Not fight-locked (server/src/fightlock.js:261: it only brings a weapon back)
- **Who may start it**: never a helper (trades)
- **What it does**: changes your own state (your escrowed weapon comes back: credited to your stash, or to your mail when it is full, then its escrow record deleted, 682-686; both readies and accepts reset)
- **Request id**: seq: the worker's own number for that escrowed weapon; it is taken out of the window's list before the credit (681) and the refund's opId trade2:\<session id>:wpnrefund:\<pid>:\<seq> is stamped, so a repeat finds nothing
- **Fields**: seq: request (must equal the seq of a weapon the sender staged in this window, 676)
- **Absent, and a bad value**: no seq, or one that is not yours -> dropped silently; past the pace -> dropped silently, the weapon stays staged
- **Notes**: answered trade2_state to both; the stash by player_state, or inbox_delivered when mailed

#### `trade2_pets` (phone to worker)

- **Handler**: server/src/index.js:5900 -> server/src/trade2.js:551 _handleTrade2Pets
- **Sent by**: src/ui/panels/TradeWindowPanel.jsx:1188
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; in an open window; nothing else checked on the sender (each pet is judged)
- **Who may start it**: never a helper (trades)
- **What it does**: changes your own state (names the pets YOU offer, whole; nothing leaves your record until the commit; both readies and accepts reset)
- **Request id**: none: a repeat changes nothing in the offer (the same list set again) but un-readies both sides again. A pet is named by the worker's own id (p_...), never by its place
- **Fields**: ids: request (an array of pet ids: the first 16 read, each a string of at most 64, doubles dropped, at most PETBOOK.TRADE_MAX; each judged by server/src/petbook.js:646 _petSellable: pet trading on, the record loaded, yours, not an old pet, not the one out with you, past its tradeAfter)
- **Absent, and a bad value**: no ids or not an array -> dropped silently; an empty array -> your pets come off the offer; too many -> refused, trade2_state with reason 'pets-max' to the sender; one pet that may not be traded -> the whole set refused, reason 'pet:\<why>', the staged list as it was
- **Notes**: answered trade2_state to both; validate at commit, no escrow (the header at trade2.js:532); the phone sends it only against caps.pettrade; kill switch `pettrade: false`

### 3.M1 the party and the alliance (9)

#### `party_invite` (phone to worker)

- **Handler**: server/src/index.js:5908 -> server/src/party.js:378 _handlePartyInvite
- **Sent by**: src/ui/panels/InspectPlayerPanel.jsx:252 (also src/ui/mobile/dash/SocialPanel.jsx:167; src/game/nmlAsk.js:338)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; has state; the target has state (is in the room); your stored party was read (not in _partyUnknownIds); the target is in no party and not unknown; your party is under _partyMax; no invite to this target in the last PARTY.INVITE_REPEAT_MS. Not checked: alive, place, leader (any member invites), the target's block list (the phone's own: src/game/blockedAsks.js:42)
- **Who may start it**: a person (border: a social ask put on another player's screen under your name, but a fixed card, not chat's words, and not the account)
- **What it does**: speaks (an invite card, a line and a chime on the target's phone: party_invited); records the invite `from>to` in memory for PARTY.INVITE_TTL
- **Request id**: none: a repeat acts twice (dropped silently inside INVITE_REPEAT_MS; after it the target gets the card again and the invite's clock restarts, party.js:421-423)
- **Fields**: target: request (a player id; judge: playerState[target], _partyOf, _partyUnknownIds, _partyMax)
- **Absent, and a bad value**: no target, not a string, or yourself -> dropped; target gone -> refused party_error target-gone; target in a party -> target-busy (with their name); own party full -> full; own party unread -> not-loaded
- **Notes**: read from msg.payload || msg; answers party_invited to the target only, nothing to the sender on success; the invite map is memory only (a deploy empties it); no live flag of its own; the phone offers it only against caps.party

#### `party_accept` (phone to worker)

- **Handler**: server/src/index.js:5914 -> server/src/party.js:431 _handlePartyAccept
- **Sent by**: src/ui/panels/PartyHUD.jsx:190
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; a live invite recorded from the inviter's own session to you, inside PARTY.INVITE_TTL (rule 14); has state; the inviter has state; you are in no party; neither side's stored party is unknown; the inviter's party is under _partyMax (checked again here). Not checked: alive, place
- **Who may start it**: a person (border: a social tie between characters; not chat, not the account)
- **What it does**: changes your own state (joins the inviter's party, or makes it with the inviter as leader; writes party_by_player:\<you> (and the inviter's on a new party), then party:\<id>, and ally:\<id> when it has been an alliance; the 20th active member turns it into an alliance and you wear its tag)
- **Request id**: none: a repeat changes nothing (the invite is deleted as it is read, party.js:439; a second accept is silent if you are already in the inviter's party, else answered party_error expired)
- **Fields**: target: request (the inviter's id; judge: the invite `target>you` in _partyInvites and its age, both playerStates, _partyOf, _partyMax)
- **Absent, and a bad value**: no target, not a string, or yourself -> dropped; no invite, or one past its TTL -> refused party_error expired; inviter gone -> target-gone; you in a party -> busy; an unknown party either side -> not-loaded; full -> full
- **Notes**: answers party_state {joined} to every online member (with `became` when the count flips); a new allyTag goes to the room as a player_update; the writes are fire-and-forget (rule 10)

#### `party_decline` (phone to worker)

- **Handler**: server/src/index.js:5917 -> server/src/party.js:514 _handlePartyDecline
- **Sent by**: src/ui/panels/PartyHUD.jsx:205
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; a pending invite from that inviter to you still in the map (its age is not checked); nothing else checked
- **Who may start it**: a person (border: the answer to a social ask; not chat, not the account)
- **What it does**: speaks (tells the inviter you declined, with your name: party_error declined); deletes the pending invite
- **Request id**: none: a repeat changes nothing (the first deletes the invite; no invite, no notice)
- **Fields**: target: request (the inviter's id; judge: _partyInvites.delete(`target>you`))
- **Absent, and a bad value**: no target, not a string, no invite map, or no such invite -> dropped
- **Notes**: only a real pending invite makes a notice (no free "X declined" lines); an inviter who has left gets nothing

#### `party_leave` (phone to worker)

- **Handler**: server/src/index.js:5920 -> server/src/party.js:523 _handlePartyLeave
- **Sent by**: src/ui/panels/PartyHUD.jsx:315
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; in a party (the one in memory); nothing else checked (not alive, not a fight, not a running war)
- **Who may start it**: a person (border: a social tie between characters; not chat, not the account)
- **What it does**: changes your own state (leaves: party_by_player:\<you> deleted, party:\<id> rewritten; the oldest member left leads if you led; your alliance tag comes off); cannot be undone (border: only at two edges: a party left with one member is deleted with its alliance's name and tag, party.js:548-559; and a member who fought in a running war is paid only if still in the party at its end, alliance.js:514)
- **Request id**: none: a repeat changes nothing (no party, dropped)
- **Fields**: (none read; the router passes no payload)
- **Absent, and a bad value**: nothing to be absent; not in a party -> dropped
- **Notes**: answers party_state {state:'none', reason:'left'} to you, {removed, reason} to the rest, 'disbanded' to a last member; an alliance under ALLIANCE.DROP falls back to a party (`became`)

#### `party_kick` (phone to worker)

- **Handler**: server/src/index.js:5923 -> server/src/party.js:529 _handlePartyKick
- **Sent by**: src/ui/panels/PartyHUD.jsx:353
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; in a party; party leader; the target is another member (online or not); nothing else checked
- **Who may start it**: a person (border: it acts on another player's membership; a social tie, not chat, not the account)
- **What it does**: changes your own state (your party's roster: removes another member, whose index is deleted and who is told party_state none 'kicked'; party_leave's two edges hold: a party of one ends with its alliance's name, and a kicked member who fought forfeits a running war's pay)
- **Request id**: none: a repeat changes nothing (the target is no longer a member)
- **Fields**: target: request (a member's id; judge: p.leader is you, p.members.includes(target))
- **Absent, and a bad value**: not the leader, no target, yourself, or not a member -> dropped, no answer
- **Notes**: answers party_state {removed, reason:'kicked'} to the rest; the kicked member can be invited again

#### `party_chat` (phone to worker)

- **Handler**: server/src/index.js:5926 -> server/src/party.js:339 _handlePartyChat
- **Sent by**: src/game/chat.js:146
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; in a party; the social allowance (server/src/chatguard.js:223 _socialAllow, shared with room chat and emotes; not asked when the live flag chatguard is false); nothing else checked
- **Who may start it**: never a helper (chat)
- **What it does**: speaks (your line to every online member of your party who has not muted you)
- **Request id**: none: a repeat acts twice (the line is said again; this lane has no repeat filter, party.js:348)
- **Fields**: text: words (cut to PARTY.CHAT_MAX, control characters to spaces, trimmed, then server/src/chatguard.js:202 _chatGuardClean; read by the party's members; kept for reports by server/src/chatmod.js:190 _chatModRemember)
- **Absent, and a bad value**: not in a party, text not a string, or nothing left after cleaning -> dropped; over the allowance -> dropped; no answer in any case
- **Notes**: answers party_chat (worker to phone) to each member, the sender included; the sender's id and name are the worker's; the phone sends it only against caps.partyChat (src/game/chat.js:137)

#### `alliance_name` (phone to worker)

- **Handler**: server/src/index.js:5936 -> server/src/alliance.js:307 _handleAllianceName
- **Sent by**: src/game/alliance.js:147 (passed on by the shim, src/networking/wsClient.js:6087)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the alliance is on (live flags alliance and partykeep); in a party; party leader; the party is an alliance now (_allyCheck: ALLIANCE.AT active members to become one, ALLIANCE.DROP to stay one); a change waits ALLIANCE.RENAME_MS from the last; all checked again after the storage reads
- **Who may start it**: a person (border: it publishes words the leader wrote to every player, as chat does, but as a name under a name's rules, not on a chat lane)
- **What it does**: speaks (the name and tag: on every member's plate as allyTag, on the board, in the party window); changes your own state (your alliance: party:\<id> and ally:\<id> rewritten in one run)
- **Request id**: none: a repeat changes nothing (the same name and tag only re-send the roster, alliance.js:323; a different one inside a day is refused rename-wait)
- **Fields**:
  - name: words (server/src/alliance.js:84 allyName: cut to 64, control, invisible and direction characters out, spaces folded, 3 to 16 characters; unique by lower-cased text across alliances and clans, _allyTaken; any visible letter of any alphabet is kept)
  - tag: words (server/src/alliance.js:90 allyTagOk: upper-cased, 1 to 4 of A-Z 0-9; unique the same way)
- **Absent, and a bad value**: either one missing or bad -> refused alliance_error bad-name / bad-tag; off -> off; no party -> no-party; not the leader -> not-leader; not an alliance -> not-alliance; taken -> name-taken / tag-taken (echoing the request's cleaned name and tag); a failed read -> not-loaded
- **Notes**: answers party_state {renamed:1} to every online member, and a player_update with allyTag for each to the room; a first use in a worker's life loads the alliance index and the clans

#### `alliance_war` (phone to worker)

- **Handler**: server/src/index.js:5939 -> server/src/alliance.js:378 _handleAllianceWar
- **Sent by**: src/game/alliance.js:153 (passed on by the shim, src/networking/wsClient.js:6087)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the alliance is on; in a party; party leader; your party is an alliance with a tag; the tag named is another party's and that party is an alliance now; neither is at war; neither is inside ALLIANCE.WAR_COOLDOWN of its last war; checked again after the reads. Not checked: the other side's consent (none is asked), No man's land being on
- **Who may start it**: a person (border: it opens a 30-minute contest of player kills that pays gold; no stake, so not a wager; the kills themselves are combat's)
- **What it does**: cannot be undone (both alliances are at war for ALLIANCE.WAR_MS with their rosters frozen; no message ends one early); changes your own state (ally_war:\<id> written; at its end the worker mints ALLIANCE.REWARD_WIN or REWARD_LOSE gold to each roster member who fought and is still in the party, by _creditPlayer, opId allywar:\<warId>:\<pid>); speaks (the other alliance's members are told: party_state war:'start')
- **Request id**: none: a repeat changes nothing (refused at-war while the war runs, then rest for WAR_COOLDOWN)
- **Fields**: tag: request (server/src/alliance.js:90 allyTagOk; judge: the row in _allyIndex with that tag, then that party as it stands in memory or in party:\<id>)
- **Absent, and a bad value**: missing or bad tag -> refused alliance_error bad-tag; your own tag -> self; nobody's -> no-such; the rest: off, no-party, not-leader, not-alliance, no-name, not-alliance-them, at-war, them-at-war, rest, rest-them, not-loaded
- **Notes**: answers party_state {war:'start'} to both parties' online members; a kill scores only under No man's land's rule (server/src/alliance.js:449 _allyWarOnDeath); the end is lazy: the tick or the next look (rule 12)

#### `alliance_board` (phone to worker)

- **Handler**: server/src/index.js:5942 -> server/src/alliance.js:548 _handleAllianceBoard
- **Sent by**: src/game/alliance.js:158 (passed on by the shim, src/networking/wsClient.js:6087)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the alliance is on; one answer a session every ALLIANCE.BOARD_EVERY_MS; nothing else checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the top ALLIANCE.BOARD_TOP alliances, how many there are, and your own row) (border: a first call in a worker's life loads the index, and any look ends the wars past their time and pays them, alliance.js:482)
- **Request id**: none: a repeat changes nothing (dropped silently inside BOARD_EVERY_MS, else answered again)
- **Fields**: (none read; the router passes no payload)
- **Absent, and a bad value**: nothing to be absent; off -> refused alliance_error off; a failed read -> not-loaded
- **Notes**: answers alliance_rows to the asker; the pace is kept on the session (a reconnect resets it)

### 3.M2 clans and friends (10)

#### `friend_request` (phone to worker)

- **Handler**: server/src/index.js:6006 -> server/src/friends.js:114 _handleFriendRequest
- **Sent by**: src/ui/panels/InspectPlayerPanel.jsx:517 (and once a browser, up to 25 from the old local list: src/networking/gameEvents.js:666)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked
- **Who may start it**: a person (border: a social ask to another player, but no words of the sender's reach them; not chat, and not the login the card means by the account itself)
- **What it does**: changes your own state (friends:\<me> reqOut and friends:\<target> reqIn; or, when the target had already asked, the friendship itself); speaks (the target is told friend_request_in with the sender's name as the worker holds it; kept for an offline target)
- **Request id**: none: a repeat changes nothing (reqOut already holds the target, friends.js:123)
- **Fields**:
  - target: request (a string up to 64, not self; online, or an rpg:\<target> record exists; their list under FRIENDS.LIST_MAX; the sender under FRIENDS.REQ_OUT_MAX pending)
  - name: words (the sender's own label for the target: cleanName friends.js:46, FRIENDS.NAME_MAX, control characters out; kept in the sender's reqOut, shown only to the sender)
- **Absent, and a bad value**: no target, not a string, self, over 64 -> dropped silently; no name -> 'Bro'; already friends, too many pending, unknown player, target's list full -> refused friend_error {reason, target}
- **Notes**: answers friend_sync to both sides; gated on caps.friends; crossing requests auto-accept (friends.js:125)

#### `friend_accept` (phone to worker)

- **Handler**: server/src/index.js:6009 -> server/src/friends.js:171 _handleFriendAccept
- **Sent by**: src/ui/mobile/dash/SocialPanel.jsx:299
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; a stored request from that player in the sender's reqIn (friends.js:156; rule 14)
- **Who may start it**: a person (border: as friend_request)
- **What it does**: changes your own state (each friends: list gains the other while under FRIENDS.LIST_MAX; the request rows go); speaks (the requester is told friend_accepted with the accepter's name)
- **Request id**: none: a repeat changes nothing (the stored request is gone, friends.js:156)
- **Fields**: from: request (judge: da.reqIn[from], friends.js:154 _friendAcceptCore)
- **Absent, and a bad value**: no from, not a string, no stored request -> dropped silently (rule 15)
- **Notes**: answers friend_sync to both sides

#### `friend_decline` (phone to worker)

- **Handler**: server/src/index.js:6012 -> server/src/friends.js:177 _handleFriendDecline
- **Sent by**: src/ui/mobile/dash/SocialPanel.jsx:301
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; a stored request from that player in the sender's reqIn
- **Who may start it**: a person (border: as friend_request)
- **What it does**: changes your own state (the request leaves both friends: rows; the requester is not told, on purpose)
- **Request id**: none: a repeat changes nothing (friends.js:182)
- **Fields**: from: request (judge: mine.reqIn[from])
- **Absent, and a bad value**: no from, not a string, no stored request -> dropped silently
- **Notes**: answers friend_sync to the sender, and to the requester if online (their pending row just goes)

#### `friend_remove` (phone to worker)

- **Handler**: server/src/index.js:6015 -> server/src/friends.js:194 _handleFriendRemove
- **Sent by**: src/ui/mobile/dash/SocialPanel.jsx:175
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; that player is on the sender's list
- **Who may start it**: a person (border: as friend_request)
- **What it does**: changes your own state (both friends: lists lose the other; put back only by a new request and its accept)
- **Request id**: none: a repeat changes nothing (friends.js:199)
- **Fields**: fid: request (judge: mine.list[fid])
- **Absent, and a bad value**: no fid, not a string, not a friend -> dropped silently
- **Notes**: answers friend_sync to the sender, and to the other if online; the other is told nothing else

#### `friend_dm` (phone to worker)

- **Handler**: server/src/index.js:6018 -> server/src/friends.js:212 _handleFriendDm
- **Sent by**: src/ui/mobile/dash/SocialPanel.jsx:150
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; something left of the text after cleaning; the sender's chat allowance (server/src/chatlanes.js:83 _laneAllow: CHAT_LANES.BURST, REFILL_MS); `to` is on the sender's own list (friends.js:228)
- **Who may start it**: never a helper (chat)
- **What it does**: speaks (one private line to one friend: live as friend_dm, or kept in friend_msg:\<to> for their next join)
- **Request id**: none: a repeat acts twice (the friend gets the line again; a DM has no repeat filter on purpose, friends.js:218-220; the allowance bounds it)
- **Fields**:
  - to: request (judge: mine.list[to]; any length, a lookup only)
  - text: words (cut to FRIENDS.DM_MAX first, control characters to spaces, trimmed, then server/src/chatguard.js:202 _chatGuardClean; read by the one friend; the worker keeps its copy for a report, _chatModRemember lane 'dm')
- **Absent, and a bad value**: no to, to or text not a string, nothing left of the text, or over the allowance -> dropped silently; not a friend -> refused friend_error {reason: 'not-friends', target}; the friend is online and muted the sender -> dropped silently; the friend's box already holds PACE.DM_PER_SENDER_BOX of the sender's lines -> dropped silently
- **Notes**: no echo to the sender (the phone appends its own copy); the name on the line is the worker's (_friendsNameOf); an offline line is one get and one put of friend_msg:\<to> (FRIENDS.DM_BACKLOG_MAX kept, oldest out)

#### `clan_create` (phone to worker)

- **Handler**: server/src/index.js:6166 -> server/src/clans.js:134 _handleClanCreate
- **Sent by**: src/ui/panels/ClanPanel.jsx:384 (only against caps.clans)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; TODAY (clanparty on, the default) refused at once, clans.js:140. With clanparty false: has state; not dying, dead or disconnected; in no clan; holds CLANS.CREATE_COST
- **Who may start it**: a person (border: it names a group other players see; not chat, and none of the card's seven classes holds it)
- **What it does**: TODAY nothing (refused). With clanparty false: moves value out (burn: CLANS.CREATE_COST gold, _goldTake road clan_create, clans.js:163); changes your own state (founds a clan you lead: clan:\<id>, clan_by_player:\<pid>, your tag on your look); speaks (its name and tag are shown to others)
- **Request id**: none: a repeat changes nothing (TODAY refused; else 'Already in a clan', clans.js:150)
- **Fields**:
  - name: words (trimmed, 3 to 16 chars, unique among clans and alliances; no control-character or chatguard clean)
  - tag: words (upper-cased, /^[A-Z0-9]{1,4}$/, unique)
  - color1, color2: look (any string, cut to 9 chars)
  - logo: look (any array, cut to 8 entries, entries unchecked)
- **Absent, and a bad value**: TODAY any payload is refused clan_error 'Make a party in the Saloon', nothing read or charged. Else: a bad name or tag, a taken one, or too little gold -> refused clan_error with its sentence; no colours -> two defaults; no logo -> null; no state or dead -> dropped silently
- **Notes**: answers clan_state and a player_state flush; kill switch `clanparty: false` brings clans back (needs partykeep); no pace lane of its own; the gold's save and the clan: row go out in one run, clan_by_player: after an await (clans.js:164-176)

#### `clan_join_accept` (phone to worker)

- **Handler**: server/src/index.js:6169 -> server/src/clans.js:197 _handleClanJoinAccept
- **Sent by**: src/ui/panels/ClanInviteCard.jsx:24
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; TODAY (clanparty on) refused at once, clans.js:201. With clanparty false: a live invite from that inviter to the sender (recorded from the inviter's own clan_invite relay, clans.js:184 _observeClanInvite; CLANS.INVITE_TTL; used once); the clan under CLANS.MAX_MEMBERS; sender in no clan and on no active war's roster
- **Who may start it**: a person (border: joining a group; a handshake that moves no goods)
- **What it does**: TODAY nothing. Else changes your own state (joins the clan: clan:\<id>, clan_by_player:\<pid>, your tag)
- **Request id**: none: a repeat changes nothing (the invite is deleted as it is read, clans.js:206; then being in a clan stops it)
- **Fields**: inviter: request (judge: the pending invite keyed inviter>me, clans.js:204-207)
- **Absent, and a bad value**: TODAY every one is answered clan_error 'Make a party in the Saloon', even with no inviter. Else: no inviter, not a string, no live invite, expired, clan full, already in a clan -> dropped silently (rule 15); on a war roster -> refused 'Cannot join during a clan war'
- **Notes**: answers clan_state to every member; TODAY no invite can be live: the clan_invite relay is dropped while clanparty is on (index.js:6416)

#### `clan_leave` (phone to worker)

- **Handler**: server/src/index.js:6172 -> server/src/clans.js:232 _handleClanLeave
- **Sent by**: src/ui/panels/ClanPanel.jsx:988 (only against caps.clans)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; in a clan (else nothing happens and nothing is answered); the clan in no active war. No clanparty check: TODAY _clansEnsure has turned every clan not at war into a party, so only a member of a clan at war (refused) or resting just after one is still in one
- **Who may start it**: a person
- **What it does**: changes your own state (leaves: clan_by_player:\<pid> deleted, the oldest member left leads, the tag off your look); cannot be undone (the last member out dissolves the clan: clan:\<id> deleted, name and tag free, the founding gold not returned, clans.js:272-275)
- **Request id**: none: a repeat changes nothing (in no clan, clans.js:268)
- **Fields**: (none read: the router passes no payload)
- **Absent, and a bad value**: nothing to be absent; in an active war -> refused clan_error 'Cannot leave during a clan war'; in no clan -> nothing, no answer
- **Notes**: answers clan_state to the leaver and the members left, and player_update {clanTag: null, clanColor1: null} to everyone else (clans.js:319); on the phone's PRIORITY_EVENTS

#### `clan_kick` (phone to worker)

- **Handler**: server/src/index.js:6175 -> server/src/clans.js:256 _handleClanKick
- **Sent by**: no phone sends it
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; sender leads a clan; the target is another member of it. No clanparty check and no war check (a kick mid-war is allowed on purpose, clans.js:211-217)
- **Who may start it**: a person
- **What it does**: changes your own state (your clan's roster: puts another member out, their tag comes off; they may be invited again)
- **Request id**: none: a repeat changes nothing (the target is no longer a member, clans.js:262)
- **Fields**: target: request (judge: clan.members.includes(target), not self, sender is leaderId)
- **Absent, and a bad value**: no target, self, not a member, or sender not the leader -> dropped silently, no answer
- **Notes**: answers clan_state to the kicked player and the members left, player_update to the rest; TODAY only a clan still at war or resting has members to kick

#### `clan_war_declare` (phone to worker)

- **Handler**: server/src/index.js:6178 -> server/src/clans.js:329 _handleClanWarDeclare
- **Sent by**: src/ui/panels/ClanPanel.jsx:901 (against caps.clans: defenderTag and zone only)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; TODAY (clanparty on) refused at once, clans.js:333. With clanparty false: sender leads a clan; the defender is another registered clan; neither clan in an active war; the zone is lawless in ZONES (data.js: the old lands); both clans past CLANS.WAR_COOLDOWN
- **Who may start it**: a person (border: it opens a war others fight and strikes no blow itself, so not combat by the card's list)
- **What it does**: TODAY nothing. Else changes your own state (a CLANS.WAR_DURATION war for both clans, rosters frozen: clan_war:\<id>); speaks (every phone is told, clan_war_declare); cannot be undone (nothing calls a war off; at its end it mints gold by mail to the members who fought, opId clanwar:\<warId>:\<pid>)
- **Request id**: none: a repeat changes nothing ('A war is already active', clans.js:343-346)
- **Fields**:
  - defenderTag (or war.defender.tag, the old phone's shape): request (upper-cased, no length bound; must be a registered clan's tag, not your own)
  - zone (or war.zone): request (ZONES[zone].lawless)
  - challengerTag and the rest of war: not read (the worker builds the war: id, clock, rosters, scores)
- **Absent, and a bad value**: TODAY refused clan_error 'Make a party in the Saloon'. Else: not a leader, no tag, own tag -> dropped silently; unknown tag, a war on, a bad zone, a clan resting -> refused clan_error with its sentence
- **Notes**: answers the sender nothing of its own, only the room-wide clan_war_declare event; on the phone's PRIORITY_EVENTS; with clanparty false a war could be declared but its zones are the closed old lands, so no kill would score (clans.js:395; clanparty.js:23-24)

### 3.N1 chat (4)

#### `area_chat` (phone to worker)

- **Handler**: server/src/index.js:5952 -> server/src/chatlanes.js:113 _handleAreaChat
- **Sent by**: src/game/chat.js:185 (typed "/a \<line>" or the picker's Area mode; only against caps.areaChat)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; a line left after cleaning (chatlanes.js:100 _laneText); the lane's bucket (chatlanes.js:83 _laneAllow: CHAT_LANES.BURST, one more every REFILL_MS, shared with whisper); has state with a zone (ps.z, else dropped); not the same line in this lane inside CHAT_GUARD.REPEAT_MS (chatguard.js _chatRepeated). Alive is not checked.
- **Who may start it**: never a helper (chat)
- **What it does**: speaks (the sender's line to every phone whose player is in the same zone, in the sender's stored name; a bubble over their head and a line in the feed)
- **Request id**: none: a repeat acts twice (said again), except the same cleaned line inside REPEAT_MS, said once
- **Fields**: text: words (cut to CHAT_LANES.TEXT_MAX raw, control characters to spaces, trimmed, then chatguard.js cleanChatText; read by every player in the zone who has not muted the sender)
- **Absent, and a bad value**: no payload, text not a string, or nothing visible left -> dropped silently; over the bucket, no zone, or a repeat -> dropped silently; any other field is ignored (the answer is built new)
- **Notes**: answers area_chat (s2c) to each recipient, the sender too; the worker's copy of the line is kept for a report (chatmod.js:190 _chatModRemember, lane 'area'); mute enforced per recipient before the send (chatlanes.js:144); nothing stored; live flag chatguard (cleaning and the repeat filter)

#### `whisper` (phone to worker)

- **Handler**: server/src/index.js:5955 -> server/src/chatlanes.js:150 _handleWhisper
- **Sent by**: src/game/chat.js:206 (typed "/w \<name> \<line>" or the picker's Whisper mode; only against caps.whisper)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; a line left after cleaning (_laneText); a name left after its clamp; the lane's bucket (_laneAllow, shared with area_chat); exactly one OTHER connected player whose name matches, case ignored (chatlanes.js:163-174). The sender needs no state; alive is not checked.
- **Who may start it**: never a helper (chat)
- **What it does**: speaks (the sender's line to one player, in the sender's stored name; a line in that player's feed, no bubble)
- **Request id**: none: a repeat acts twice (delivered again; whispers have no repeat filter)
- **Fields**:
  - text: words (as area_chat's: TEXT_MAX, control characters, cleanChatText; read by the one target)
  - to: request (a display name, cut to CHAT_LANES.NAME_MAX, control characters to spaces, trimmed; judge: chatlanes.js:163-174, one match among the sessions by _laneNameOf, else refused)
- **Absent, and a bad value**: no text or no to -> dropped silently; over the bucket -> dropped silently (the token is spent before the name is looked up); no match -> whisper_error {reason:'no-such-player'}; more than one -> whisper_error {reason:'ambiguous', count}; the target has muted the sender -> dropped silently, on purpose (chatlanes.js:186-190)
- **Notes**: answers whisper (s2c) to the target only; the phone has already written "to \<name>" in the sender's own feed (chat.js:212), so a silent drop reads as sent; the line is kept for a report before the mute test (lane 'whisper'); nothing stored

#### `chat_mute` (phone to worker)

- **Handler**: server/src/index.js:6027 -> server/src/chatmod.js:268 _handleChatMute
- **Sent by**: src/game/chatMute.js:162 _sendMute (and :236, the one-time move of this browser's old list); only against caps.chatMute
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; nothing else checked
- **Who may start it**: a person (border: a private setting on the player's own chat; it says nothing to anyone, and the card's chat class is about speaking)
- **What it does**: changes your own state (the sender's mute list, chat_mute:\<pid>: who the worker stops sending them chat, emotes, dice, area lines, whispers, party chat and friend messages from)
- **Request id**: none: a repeat changes nothing (on already equal to the list's state: nothing written, the list answered again; chatmod.js:278)
- **Fields**:
  - target: request (a string of 1 to CHATMOD.ID_MAX characters, not the sender's own id; NOT checked to be a real player; chatmod.js:102 validId)
  - on: request (truthy mutes, falsy unmutes)
  - name: words (the muter's own label, used only when the target is not connected; cut to CHATMOD.NAME_MAX, control characters to spaces; kept in the muter's list and shown back to the muter alone; a connected target's name is the worker's own; chatmod.js:214)
- **Absent, and a bad value**: no target or a bad one -> dropped silently; on absent -> an unmute; a 201st mute -> chat_mute_list with error 'list-full', nothing changed
- **Notes**: answers chat_mute_list (s2c); the write is paced (flood.js PACE.MUTE through _paced, the copy in memory the truth, flushed on leaving: chatmod.js:260); enforced at the tick's fan-out and each lane's send loop (_chatModMuted)

#### `chat_report` (phone to worker)

- **Handler**: server/src/index.js:6030 -> server/src/chatmod.js:320 _handleChatReport
- **Sent by**: src/game/chatMute.js:193 reportPlayer (only against caps.chatMute)
- **Envelope**: alone or in a bundle
- **Sender's phase**: joined; the target is connected or has an rpg: record (chatmod.js:330-331, one storage read when not connected); the reporter's gate (chatmod.js:301 _chatModReportGate: not the same target inside REPORT_DUP_MS, under REPORT_PER_HOUR and REPORT_PER_DAY, counted in memory)
- **Who may start it**: never a helper (chat) (border: it speaks to the owner about another player, not to a player)
- **What it does**: speaks (to the owner: a lasting record chat_report:\<id> naming the target, a reason code, both names and the zone from the worker's state, and the worker's own copy of the target's last CONTEXT_LINES lines); cannot be undone (the reporter cannot take it back; only the owner dismisses it)
- **Request id**: none: a repeat acts twice (a second record), except for the same target inside REPORT_DUP_MS, refused 'duplicate'; the gate is in memory, so a deploy empties it
- **Fields**:
  - target: request (validId, then must exist: connected or stored)
  - reason: request (one of chatmod.js:95 REPORT_REASONS, anything else becomes 'other')
- **Absent, and a bad value**: no target or a bad one -> chat_report_ack {ok:false, error:'bad-target'}; unknown player -> 'not-found'; over the gate -> 'duplicate', 'rate-hour' or 'rate-day'; reason absent or unknown -> 'other'. None of the reporter's words reach the record: the phone sends no text and the worker reads none (the lines are the worker's own, chatmod.js:205 _chatModRecentLines)
- **Notes**: answers chat_report_ack (s2c); one storage put a report, awaited; the reported player is told nothing


## 4. Relays: phone to worker to the other phones

Direction: phone to worker, then worker to phones. Comes in: the socket, through the router's default branch (`server/src/index.js:6304`). One row for each type in `RELAY.TYPES` (`server/src/relay.js`).

### 4.L1 trades (3)

#### `trade_accept` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/trade.js:131 _interceptTrade ; phone: src/networking/gameEvents.js:4086
- **Sent by**: src/ui/panels/IncomingTradePanel.jsx:205
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone (a phone acts only when payload.target is itself)
- **Sender's phase**: joined; the relay budget; target a string of at most 64, not yourself; a live offer kept FROM the target TO the sender (172-179: rules 14 and 15, taken out before anything else); inside TRADE_OFFER_TTL (183); the gift lane open and the offerer not in a fight with a player (188, fight lock `fightlock`); the offerer still has state (190) and still holds the gold and goods (194-201). Not checked: either side alive
- **Who may start it**: never a helper (trades)
- **What it does**: moves value out (the commit: the OFFERER's gold and goods, as the worker kept them, move to the accepter; roads gift_trade; no fee; the debit and the credits in one write, 224); cannot be undone; speaks (the offerer is told "Trade complete!")
- **Request id**: none: a repeat changes nothing (the kept offer is deleted before anything moves, 174; a second accept finds none and is dropped). The credits carry opIds trade:\<offer id>:gold and :\<item key>
- **Fields**:
  - target: request (the offerer; with the sender, the key of the kept offer)
  - offer: not read (the worker settles its own kept copy; the field rides the relay as the phone sent it)
  - from, id: stamped
  - settled: the worker's own (set true on the relayed accept, 238; the current phone does not read it)
- **Absent, and a bad value**: no target -> dropped silently; no live offer -> dropped silently, never relayed (forged or replayed); expired, lane closed, a fight, the offerer gone or short -> not relayed, the ACCEPTER gets a worker-made trade_reject
- **Notes**: the receiving phone only draws (a line, a sound, a re-render: gameEvents.js:4086-4106); the goods come by inbox_delivered and player_state; caps.trade says the worker settles

#### `trade_offer` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/trade.js:131 _interceptTrade ; phone: src/networking/gameEvents.js:4076
- **Sent by**: src/ui/panels/TradePanel.jsx:276 (only when caps.trade2 is off: src/ui/panels/InspectPlayerPanel.jsx:266)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone (eventplace.js places no trade type; a phone acts only when payload.target is itself)
- **Sender's phase**: joined; the relay budget; target a string of at most 64, not yourself (134-141); an offer left after cleaning (155); the gift lane open (trade.js:63: closed while the trade window is on, the default) and the sender not in a fight with a player (159, fight lock `fightlock`). Not checked: that the target exists
- **Who may start it**: never a helper (trades)
- **What it does**: speaks (the target is shown an offer card); changes your own state (the worker keeps the offer for this pair in memory for TRADE_OFFER_TTL; nothing moves until the accept)
- **Request id**: none: a repeat acts twice (the pair's kept offer is replaced, with a new id and time, and the card is shown again)
- **Fields**:
  - target: request (worker: the pair's key; phone: shows the card only when it is me)
  - offer: request (worker: cleaned by trade.js:104 _sanitizeTradeOffer as trade2_set's, kept, relayed as cleaned, what is held judged at the accept; phone: look, drawn on the card)
  - from, id: stamped
  - fromName: stamped (the worker's name for the sender; its first 24 chars kept for the mail's note; phone: look, the card's name)
- **Absent, and a bad value**: no target, yourself, or over 64 -> dropped silently; no offer or nothing left of it -> dropped silently; lane closed or in a fight -> not relayed, the SENDER gets a worker-made trade_reject ("Trade declined")
- **Notes**: with the trade window on every offer is refused: this is the fallback lane (`trade2: false` opens it; `giftclosed: false` opens it beside the window); a blocked sender's card is dropped on the phone (src/game/blockedAsks.js:41)

#### `trade_reject` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/trade.js:131 _interceptTrade ; phone: src/networking/gameEvents.js:4108
- **Sent by**: src/ui/panels/IncomingTradePanel.jsx:234
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone (a phone acts only when payload.target is itself)
- **Sender's phase**: joined; the relay budget; target a string of at most 64, not yourself. Not checked: that any offer exists, the gift lane, a fight
- **Who may start it**: never a helper (trades)
- **What it does**: speaks (the target is told "Trade declined", with its sound); changes your own state (voids the offer the target made TO you, if one is kept, 148-150)
- **Request id**: none: a repeat acts twice (the target is told again; nothing stands behind it)
- **Fields**:
  - target: request (worker: whose offer to you is voided; phone: shows "Trade declined" only when it is me)
  - from, id: stamped
- **Absent, and a bad value**: no target, yourself, or over 64 -> dropped silently
- **Notes**: also sent by the worker itself, pushed to eventBuffer in the OTHER player's name ({from: target, payload: {from: target, target: \<the one refused>}}): a refused offer to its sender (server/src/trade.js:160) and a refused accept to the accepter (server/src/trade.js:176); server/test/wire-audit.test.mjs keeps the type off PRIVILEGED_EVENTS for that

### 4.L2 duels, threats, the clan invite (7)

#### `clan_invite` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/index.js:6417 _observeClanInvite -> server/src/clans.js:184 _observeClanInvite ; phone: src/networking/gameEvents.js:3932
- **Sent by**: src/ui/panels/InspectPlayerPanel.jsx:598 (a tile shown only to a phone that holds a clan: :238)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone -- but dropped before the fan-out while clans are parties (index.js:6416; clanparty is on by default), so today nothing delivers it
- **Sender's phase**: joined; relay budget; clans not parties (live flag clanparty false, or partykeep false); then nothing stops the relay. The RECORD alone asks: target a string of 1 to 64 chars and not the sender, the sender leads a clan with room, the target in no clan (clans.js:186-192)
- **Who may start it**: a person (border: a social ask in front of another player; not one of the seven classes unless it counts as chat)
- **What it does**: speaks (an invite card naming a clan on the target's phone); changes your own state (records the invite sender>target for CLANS.INVITE_TTL, in memory)
- **Request id**: none: a repeat changes nothing on the worker (the same key rewritten) but is relayed again
- **Fields**:
  - target: request
  - from, fromName: stamped
  - clanName, clanTag: words (the sender's own text; the worker neither reads, cleans, clamps nor replaces them, though it holds the clan) ; receiving phone: target === its own id and in no clan -> parks the invite and prints '[clanTag] clan invite!' (gameEvents.js:3938-3949)
- **Absent, and a bad value**: clans are parties -> dropped silently (the sender's phone has already said 'Clan invite sent'); bad target, or a sender who leads no clan -> nothing recorded but still relayed; clanTag absent on the phone -> '?', fromName -> 'Someone'
- **Notes**: its accept is the router case clan_join_accept, refused while clans are parties (clans.js:201); a blocked sender is dropped on the receiving phone (blockedAsks.js:43)

#### `duel_accept` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/index.js:6407 _interceptDuel -> server/src/duel.js:105 _interceptDuel ; phone: src/networking/gameEvents.js:4739
- **Sent by**: src/ui/panels/DuelRequestPanel.jsx:209
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone; relayed only when the duel really started
- **Sender's phase**: joined; relay budget; a live challenge target>sender recorded from the challenger's own session, under DUEL.CHALLENGE_TTL (duel.js:145-171, rules 14 and 15); neither side in a duel; both have state and are not dying; both in the same zone (duel.js:195); neither in a fight with a player in No man's land (fightlocktable, the handler refuses: duel.js:202); the stake not above the accept's own number; both purses hold the stake (inbox.js:120)
- **Who may start it**: never a helper (wagers) (border: combat when the stake is 0)
- **What it does**: plays (starts the duel: the consent pair for DUEL.CONSENT_MS, one duel a player); moves value out (escrow duelEscrow:\<duelId>: both stakes debited and the record put in one write, duel.js:223; 2x paid to the winner by _creditPlayer); cannot be undone (a lost stake)
- **Request id**: none: a repeat changes nothing (the challenge is deleted by the first accept, duel.js:146; a second finds none and is answered duel_decline to the accepter alone). The worker's own ids: duelId (crypto.randomUUID), the debits' opIds duel:\<duelId>:a and :b, the pot's duelpot:\<duelId>, the sweep's duelrefund:\<duelId>:a and :b (oplog)
- **Fields**:
  - target: request (the challenger; judge: the live challenge, duel.js:145)
  - wager: request (the most the accepter agrees to stake: the CHALLENGE's number is the stake, and an accept below it is refused, duel.js:206-215)
  - from, fromName: stamped
  - settled: stamped true by the worker (duel.js:239) ; receiving phone: target === its own id -> enters the duel with payload.from, locks on, 'DUEL STARTED!' with no look at settled (gameEvents.js:4744-4768); the sender's own echo settles its pending duel (src/game/duelPending.js:74)
- **Absent, and a bad value**: bad target -> dropped silently; no live challenge (forged, replayed, expired) -> not relayed, duel_decline to the accepter alone (duel.js:168); any later refusal -> not relayed, duel_decline to both (declineBoth, duel.js:148); wager absent or not a number -> 0, so only a stake-0 challenge passes
- **Notes**: the fight lock's row: fightlock.js duel_accept (sw fightlocktable); the accepter's phone shows the duel at once and drops it after DUEL_PENDING.SETTLE_MS without the settled echo; a refused accept still spends the challenge (deleted before it is judged)

#### `duel_decline` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/index.js:6407 _interceptDuel -> server/src/duel.js:105 _interceptDuel ; phone: src/networking/gameEvents.js:4812
- **Sent by**: src/ui/panels/DuelRequestPanel.jsx:55
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone
- **Sender's phase**: joined; relay budget; target a string of 1 to 64 chars and not the sender; nothing else checked (no live challenge is needed)
- **Who may start it**: never a helper (combat)
- **What it does**: speaks ('Duel declined' on the target's phone); changes your own state (voids the challenge target>sender: duel.js:140)
- **Request id**: none: a repeat changes nothing on the worker (the key is already gone) but is relayed again (the popup again)
- **Fields**:
  - target: request (whose challenge to void; no judge beyond shape)
  - from: stamped ; receiving phone: target === its own id -> the popup, and its PENDING duel dropped if from is that duel's foe (gameEvents.js:4817, src/game/duelPending.js:107); a settled duel is never ended by it
- **Absent, and a bad value**: bad target -> dropped silently
- **Notes**: also sent by the worker itself, pushed to eventBuffer with from and payload {from, target}: to both sides of a refused accept (server/src/duel.js:151-152 declineBoth) and to the accepter of an accept with no live challenge, in the named challenger's name (duel.js:169)

#### `duel_request` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/index.js:6407 _interceptDuel -> server/src/duel.js:105 _interceptDuel ; phone: src/networking/gameEvents.js:4711
- **Sent by**: no phone sends it (relay.js:51: an older phone's plain duel; the game's Duel button sends duel_wager_request)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone (eventplace.js has no row for it)
- **Sender's phase**: joined; relay budget (RELAY_BURST); target a string of 1 to 64 chars and not the sender (duel.js:108-121); nothing else checked (not that the target exists, is alive or shares the zone)
- **Who may start it**: never a helper (combat)
- **What it does**: speaks (a challenge card and its sound on the target's phone); changes your own state (records the challenge sender>target with stake 0 for DUEL.CHALLENGE_TTL, in memory: duel.js:135)
- **Request id**: none: a repeat changes nothing on the worker (the same key rewritten, its clock restarted) but is relayed again (the card and its sound again)
- **Fields**:
  - target: request (the player challenged; judge: shape only, duel.js:108-121)
  - from: stamped (relay.js _relayBuild)
  - fromName: stamped where the phone put one (the worker's copy of the name)
  - wager: not read (forced to 0 for this type and relayed as 0, duel.js:132-136)
  - any other field: passed on unread ; receiving phone: target === its own id -> the duel card with from / fromName (gameEvents.js:4729)
- **Absent, and a bad value**: no payload, no target, a target that is not a string, is over 64 chars or is the sender -> dropped silently, nothing relayed
- **Notes**: the receiving phone drops a blocked sender's before its switch (src/game/blockedAsks.js:38)

#### `duel_wager_request` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/index.js:6407 _interceptDuel -> server/src/duel.js:105 _interceptDuel ; phone: src/networking/gameEvents.js:5278
- **Sent by**: src/ui/panels/InspectPlayerPanel.jsx:285 (the player card's Duel button; always wager 0)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone
- **Sender's phase**: joined; relay budget (RELAY_BURST); target a string of 1 to 64 chars and not the sender; nothing else checked (the sender's purse is asked only at the accept)
- **Who may start it**: never a helper (wagers) (border: the game's own button sends stake 0, which is combat)
- **What it does**: speaks (a challenge card with the stake, and its sound, on the target's phone); changes your own state (records the challenge sender>target with its stake for DUEL.CHALLENGE_TTL: duel.js:135; no gold moves yet)
- **Request id**: none: a repeat changes nothing on the worker (only the challenger's LATEST challenge to that target is kept, so a repeat with another stake replaces the first) but is relayed again
- **Fields**:
  - target: request (shape only)
  - wager: request (clamped to a whole 0..999999 and relayed as clamped, duel.js:132-136; the stake of the duel if accepted)
  - from: stamped
  - fromName: stamped where the phone put one ; receiving phone: target === its own id -> the card showing fromName and 'Wager: N g (winner takes all)' (gameEvents.js:5280, DuelRequestPanel.jsx:147-171)
- **Absent, and a bad value**: bad target -> dropped silently; wager absent or not a number -> 0; negative -> 0; over 999999 -> 999999
- **Notes**: blocked senders dropped on the receiving phone (blockedAsks.js:39); in PRIORITY_EVENTS (wsClient.js:5441), so sent at once

#### `pvp_threat` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/index.js:6425 _interceptThreat -> server/src/threat.js:76 _interceptThreat ; phone: src/networking/gameEvents.js:4823
- **Sent by**: no phone sends it (the Threat button is compiled out: src/ui/panels/InspectPlayerPanel.jsx:544 `false &&`; its dead send is at :557)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone -- but today never relayed (dropped at threat.js:98)
- **Sender's phase**: joined; relay budget; live flag disable_threats not set; target a string and not the sender; OPEN_PVP (index.js:1541, the constant false: every one is dropped here); then both have state and are not dying; the sender's THREAT.COOLDOWN_MS (in memory)
- **Who may start it**: never a helper (combat)
- **What it does**: speaks (a threat card on the target's phone, a red skull over the sender on every phone); plays (opens the countdown that ends in a fight between the two) -- none of it today
- **Request id**: none: a repeat changes nothing (the cooldown drops it, threat.js:106)
- **Fields**:
  - target: request
  - from, fromName: stamped
  - fromLevel: not read by the worker (it uses its own levels, threat.js:111) but passed on as written to the target's card (gameEvents.js:4829)
  - countdown, settled: stamped by the worker (threat.js:114-115) ; receiving phone: the card if target is its own id, and a red mark over payload.from for every receiver
- **Absent, and a bad value**: bad target -> dropped silently; every refusal is a silent drop (rule 15); a countdown absent on the phone reads as 120000 ms
- **Notes**: the phone's block table leaves it out on purpose (blockedAsks.js NOT_BLOCKED)

#### `threat_response` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/index.js:6425 _interceptThreat -> server/src/threat.js:76 _interceptThreat ; phone: src/networking/gameEvents.js:4865
- **Sent by**: src/ui/panels/ThreatIncomingPanel.jsx:142 (and :173; only from a threat card, which nothing raises today)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone -- today never relayed
- **Sender's phase**: joined; relay budget; disable_threats not set; target a string and not the sender; a live threat target>sender inside its deadline (threat.js:121-122; none can exist while OPEN_PVP is false, so every one is dropped)
- **Who may start it**: never a helper (combat)
- **What it does**: 'guards': moves value out (ANOTHER player's: THREAT.LEVY_PCT of the threatener's gold through the gold door's threat_levy into escrow bounty:\<threatener>, paid to whoever kills them, opId bountypay:\<victim>:\<ts>; and a gear lock gearlock:\<threatener> for THREAT.GEAR_LOCK_MS); cannot be undone; any other action: plays (opens the pair to PvP for THREAT.CONSENT_MS). Nothing of the sender's moves
- **Request id**: none: a repeat changes nothing (the threat's record is deleted by the first response, threat.js:123)
- **Fields**:
  - target: request (the threatener; judge: the live record)
  - action: request ('guards'; anything else, or nothing, is ignore)
  - from: stamped
  - levy, settled: stamped by the worker (levy for display) ; receiving phone: popups for the threatener, skull marks for every receiver (gameEvents.js:4872-4895)
- **Absent, and a bad value**: bad target, no record or a record past its deadline -> dropped silently; action absent -> ignore
- **Notes**: the threatener is told privately by threat_penalty; an unanswered threat ends as an ignore (threat_expired)

### 4.N1 chat (2)

#### `chat` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/index.js:4993 _sanitizeChatRelay ; phone: src/networking/gameEvents.js:522 -> src/game/chat.js:261 handleChatEvent
- **Sent by**: src/game/chat.js:219 sendChatMessage (and src/ui/mobile/ChatBubble.jsx:51, its fallback)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone in the room (eventplace.js places no chat), less each phone that muted the speaker (server/src/tick.js:887-893 and 1066)
- **Sender's phase**: joined; the social allowance (chatguard.js _socialAllow: SOCIAL.BURST, one more every REFILL_MS; the relay bucket instead under chatguard: false); a line left after cleaning; not the same line in the room lane inside CHAT_GUARD.REPEAT_MS. No state, zone or alive check.
- **Who may start it**: never a helper (chat)
- **What it does**: speaks (the sender's line to every phone in the room: a bubble over their head and a line in the feed)
- **Request id**: none: a repeat acts twice (said again), except the same cleaned line inside REPEAT_MS, said once
- **Fields**:
  - text: words (worker: cut to CHAT_RELAY.TEXT_MAX raw, control characters to spaces, trimmed, cleanChatText; phone: clamped again, drawn as the bubble and the feed line)
  - name: stamped (the phone's is thrown away; the worker writes ps.name or the session's name, a lane's mark taken off its front, index.js:5011; the phone clamps it and shows it in the feed)
  - id: stamped (the session's id; the phone keys the bubble, its block list and its old local mute list on it)
  - color: look (kept only if a #rgb or #rrggbb of at most COLOR_MAX, else ''; the phone colours the name in the feed with it)
  - any other field: dropped (the payload is rebuilt as {id, name, text, color})
- **Absent, and a bad value**: no payload or not an object -> dropped silently; text not a string, or nothing visible left -> dropped silently; a bad color -> ''; over the allowance or a repeat -> dropped silently, while the sender's own phone has already shown the line
- **Notes**: the worker's copy of the line is kept for a report (chatmod.js _chatModRemember, lane 'room', the last CONTEXT_LINES a speaker, in memory); the receiving phone changes nothing of its player's state (a bubble, a sound, the feed, the unread count); nothing stored; the worker itself never sends this type; live flags chatguard, relaylist

#### `emote` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/emotes.js:71 _sanitizeEmoteRelay ; phone: src/networking/gameEvents.js:528 -> src/game/chat.js:438 handleEmoteEvent
- **Sent by**: src/game/interactions.js:43 (an emoji or a quick line) and src/game/interactions.js:87 (a moment move)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to the placed (eventplace.js:80 RELAY_PLACED: the sender and the phones near where the room has the sender), less each phone that muted the speaker
- **Sender's phase**: joined; the social allowance (shared with chat); the live flag emotes on (and emotemoves for a move); the emote is on the worker's lists. No state or alive check.
- **Who may start it**: never a helper (chat) (border: no words of the player's own, a listed emoji, quick line or move; the worker counts it with chat, chatguard.js SOCIAL.TYPES)
- **What it does**: speaks (a listed emoji over the sender's head, or a listed quick line as their bubble, to the players near); plays (a moment move: the bro waves, laughs, cheers on the phones near)
- **Request id**: none: a repeat acts twice (shown again; no repeat filter, only the allowance and the phone's own cooldown)
- **Fields**:
  - emoji: request (judge: emotes.js:50 emoteListed: exactly one of EMOTE.EMOJI or EMOTE.LINES; the receiving phone takes only a listed one too and draws it)
  - move: request (judge: emotes.js:45 emoteMoveListed: one of EMOTE.MOVES; read first, an emoji beside it is ignored; the receiving phone plays the move and its own emoji)
  - id: stamped (the session's id; the phone finds the sender among its players by it)
  - any other field: dropped (the payload is rebuilt as exactly {id, emoji} or {id, move})
- **Absent, and a bad value**: no payload, or an emoji or move not on the lists -> dropped silently; emotes off -> every one dropped; a receiving phone that does not have the sender, or has them in another zone, or blocked or muted them, draws nothing
- **Notes**: the receiving phone only draws and plays a sound (chat.js:466-483): no state of its own player changes; held poses (sit, sleep, a dance) are the router's pose case, not this relay; nothing stored; the worker itself never sends this type

### 4.N2 the action relays (14)

#### `campfire_lit` (relay)

- **Handler**: server/src/index.js:6304 default branch (no hook reads the type) ; phone: src/networking/gameEvents.js:562
- **Sent by**: src/ui/BroTown.jsx:6833
- **Envelope**: relay: rebuilt in the sender's name (server/src/relay.js:91), out in the tick's events to everyone (not placed: server/src/eventplace.js:89-105 keeps it room-wide because a phone keeps the fire 45 s; the sender gets its own copy too)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351: RELAY_BURST 8, refilled RELAY_REFILL_PER_S 4 a second, one bucket a socket for every non-social relay; past it dropped silently); nothing else checked (not alive, not that firemaking_request was granted, not where the sender stands)
- **Who may start it**: a person (border: the picture of a fire lit by firemaking_request, a life skill's act in the world; it plays, but it is none of the card's seven classes by name)
- **What it does**: plays (draws the sender's campfire on the other phones, with its catching sound and its crackle)
- **Request id**: none: a repeat changes nothing but the sound (each phone keeps ONE fire a sender, a Map keyed by the stamped id, src/networking/gameEvents.js:587: a repeat replaces it and plays the catching sound again)
- **Fields**:
  - id: stamped (the worker's; the phone keys the fire by it and drops its own echo)
  - x, y: look (worker: relayed as written; phone: draws the fire there when both are finite numbers, no check against where the sender is drawn)
  - zone: look (worker: relayed as written; phone: drops the event unless it equals the phone's own zone, absent read as 'town'; it is the sender's word, not where the room has the sender)
  - expiresAt: look (phone: the fire's end, cut to at most 50 s from now; absent or past: 45 s)
- **Absent, and a bad value**: payload not an object under msg.payload: the relay goes out as {id} alone (relay.js:93) and the phone drops it (x, y not finite). The worker judges no field: each rides on as written, unknown ones too. Phone: non-finite x or y dropped; another zone dropped; a bad expiresAt clamped
- **Notes**: on the phone it is S._peerCampfires: drawn (src/rendering/campfireFx.js:425), heard (src/game/ambientBeds.js:116), its fuse pushed on while that peer's harvest code says cook (src/ui/BroTown.jsx:6862); a watcher cannot cook on it. Fight lock: open ('a relay', server/src/fightlock.js:279). Live flags: relaylist (relay.js:81), eventplace

#### `campfire_out` (relay)

- **Handler**: server/src/index.js:6304 default branch (no hook) ; phone: src/networking/gameEvents.js:595 -> src/game/fireRefuse.js:53 peerFireOut
- **Sent by**: src/networking/wsClient.js:3553 (in the firemaking_refused case; the message is built at src/game/fireRefuse.js:47)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone (not placed: it goes wherever its campfire_lit went, server/src/eventplace.js:102)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked
- **Who may start it**: a person (border: the taking back of campfire_lit; the same class as its fire)
- **What it does**: plays (puts the sender's own fire out on the other phones)
- **Request id**: none: a repeat changes nothing (the sender's entry is already gone from the Map)
- **Fields**:
  - id: stamped (phone: deletes the fire kept under that id only, so only the sender's own; its own echo dropped)
  - zone: not read (the worker and the receiving phone both ignore it)
- **Absent, and a bad value**: payload absent or not an object: relayed as {id}, which is all the phone needs. No id: dropped by the phone (cannot happen: the worker stamps it). Nothing else to be bad
- **Notes**: sent once, only after the worker's firemaking_refused took back a fire already relayed (tag 4942); the live flag firerefuse off stops the refusal and so this. Fight lock: open ('a relay', server/src/fightlock.js:279)

#### `gather_node` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/eventplace.js:80 RELAY_PLACED ; phone: src/networking/gameEvents.js:540 (read by src/rendering/systems/effectsRenderer.js:14453 _peerChopTree)
- **Sent by**: src/ui/BroTown.jsx:8039 (a repeat of the same tree may wait for the next frame: src/networking/wsClient.js:6410)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to the placed (eventplace.js:80: the sender, and the phones in the zone where the ROOM has the sender; in the Wheel a v2 phone within EVENT_PLACE.R of the sender)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked (not that an extraction is open, not that the node exists)
- **Who may start it**: never a helper (gathering)
- **What it does**: plays (stands the sender's lumberjack at the tree they chop on the other phones)
- **Request id**: none: a repeat changes nothing (it replaces the sender's one entry; the phone sends it again every 2 s on purpose and the entry lapses after PEER_GATHER_NODE_TTL_MS 5 s)
- **Fields**:
  - id: stamped (phone: drops its own echo and a sender it does not draw in its zone)
  - node: look (phone: kept as a string of at most 64 chars, else null; looked up by id in the phone's OWN node list, which must hold a live tree)
  - x, y: look (phone: must be finite; used only when the phone holds no node of that id)
  - zone: look (phone: must equal its own zone, absent read as 'town')
- **Absent, and a bad value**: payload absent: relayed as {id} and dropped by the phone (x, y not finite). Worker: no field judged. Phone: a spot more than PEER_CHOP_REACH 600 px from where the peer is drawn is ignored (effectsRenderer.js:14466), so a forged one cannot stand the figure across the map
- **Notes**: phone side is S._peerGatherNode, a Map keyed by the stamped id, cleared on a zone change (src/game/zoneTransitions.js:403). Fight lock: open ('a relay', server/src/fightlock.js:280)

#### `monster_dmg_at` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/eventplace.js:80 RELAY_PLACED ; phone: src/networking/gameEvents.js:3845 -> src/game/combatHelpers.js:325 enqueuePeerDamage
- **Sent by**: src/game/monsterCombat.js:2395 (also :2520 and src/game/projectiles.js:1900; each only when !S._serverMonsters: the phone runs the monsters itself)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to the placed (eventplace.js:80: the sender, and the phones in the sender's zone as the ROOM has it; in the Wheel within EVENT_PLACE.R)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked (no monster, no hit, no weapon)
- **Who may start it**: never a helper (combat)
- **What it does**: plays (draws a damage number on the other phones at the place the sender names)
- **Request id**: none: a repeat is drawn twice (another number in the queue; at most PEER_DMG_QUEUE_CAP 12 a place bucket)
- **Fields**:
  - id: stamped (phone: drops its own echo and a sender it does not draw in its zone)
  - x, y: look (phone: read as payload.x || 0, no type check; where the number is drawn, and its queue key)
  - dmg: look (phone: the number's text is '-' + payload.dmg, no type check and no clamp)
  - isCrit: look (crit colour and icon)
- **Absent, and a bad value**: payload absent: relayed as {id}; the phone draws '-0' at 0,-20 if it draws the sender in its zone. Worker: no field judged, nothing clamped. Phone: nothing clamped either
- **Notes**: the phone's own monsters only (the local-monster mode on 4.2's list); in a zone the worker runs, monster_hit carries the number and the phone sends none. Fight lock: open ('a relay', server/src/fightlock.js:280)

#### `player_died_to_monster` (relay)

- **Handler**: server/src/index.js:6304 default branch (no hook) ; phone: src/networking/gameEvents.js:3872
- **Sent by**: src/networking/wsClient.js:3480 (on the worker's player_died; also src/ui/BroTown.jsx:5060, src/game/monsterCombat.js:1149 and src/networking/gameEvents.js:3790, deaths the phone decides itself from its own monsters)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone (not placed; each phone drops a sender it does not draw in its zone)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked (the worker does not check that the sender is dead)
- **Who may start it**: never a helper (combat)
- **What it does**: plays (draws the sender's knockout on the other phones: the burst, the KO popup, the death sound, the corpse)
- **Request id**: none: a repeat is drawn twice (another burst, popup and sound; the dead mark set again and its clock restarted)
- **Fields**:
  - id: stamped (phone: drops its own echo and a sender it does not draw in its zone)
  - x, y: look (phone: payload.x || 0, no type check; where the burst, the popup and the sound are placed, with no check against where the sender is drawn)
  - the event itself: claim (the receiving phone marks its copy of the sender dead, _isDead and _deathTs, src/networking/gameEvents.js:3894, on the sender's word alone)
- **Absent, and a bad value**: payload absent: relayed as {id}; the phone still marks the sender dead and draws the burst at 0,0. Worker: no field judged. Phone: nothing clamped
- **Notes**: also sent by the worker itself for a sparring clone's knockout: server/src/spar.js:538 through _sparRelay (spar.js:515), which pushes straight to eventBuffer in the clone's name (no relay build, no budget). The dead mark is cleared by player_respawned, or by the phone itself once the body is drawn 24 px from the death spot 1.5 s after the last mark (src/rendering/systems/entityRenderer.js:12626). Fight lock: open ('a relay', server/src/fightlock.js:280)

#### `player_dodge` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/spar.js:611 _sparSeen (index.js:6430, only when the sender has sparring clones) ; server/src/eventplace.js:80 RELAY_PLACED ; phone: src/networking/gameEvents.js:2461
- **Sent by**: src/game/dodge.js:142 (a roll; also :210 a lunge, :308 a retreat shot, and src/game/abilities.js:566 the sword's dash)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to the placed (eventplace.js:80: the sender, and the phones in the sender's zone as the ROOM has it; in the Wheel within EVENT_PLACE.R)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked (not that a roll was paid for, not alive)
- **Who may start it**: never a helper (combat) (border: a roll is also movement; the lunge and the dash are attacks)
- **What it does**: plays (draws the sender's roll, lunge or dash on the other phones, with its rush of air)
- **Request id**: none: a repeat is drawn twice (the roll's picture and sound start again)
- **Fields**:
  - id: stamped (phone: drops a sender it does not draw in its zone, its own echo with it)
  - kind: look (phone: stored as written, absent read as 'dodge'; 'retreat_shot' keeps the facing; picks the sound's pitch) ; the worker reads it once: 'sworddash' makes the sender's OWN sparring clones defend (spar.js:618), nothing of the sender changes
  - angle: look (phone: no type check; turns the drawn body unless kind is retreat_shot)
  - dur: look (phone: clamped 150..1000 ms, else the default)
  - walk: look (phone: a real boolean or dropped)
  - ts: not read
- **Absent, and a bad value**: payload absent: relayed as {id}; the phone draws a plain roll with no angle. Worker: no field judged. Phone: dur clamped, walk dropped unless boolean, the rest taken as written
- **Notes**: also sent by the worker itself for a sparring clone: server/src/spar.js:819 (its dash) and :845 (its roll), through _sparRelay (spar.js:515). Not in PRIORITY_EVENTS (src/networking/wsClient.js:5441): it waits for the phone's next input batch. Fight lock: open ('a relay', server/src/fightlock.js:280)

#### `player_hurt_by_monster` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/eventplace.js:80 RELAY_PLACED ; phone: src/networking/gameEvents.js:3828
- **Sent by**: src/game/monsterCombat.js:680 (also :725, :967, :1008 and src/game/projectiles.js:2923: hits by monsters the phone runs itself)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to the placed (eventplace.js:80: the sender, and the phones in the sender's zone as the ROOM has it; in the Wheel within EVENT_PLACE.R)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked
- **Who may start it**: never a helper (combat)
- **What it does**: plays (flashes the sender's body and draws the damage they took on the other phones)
- **Request id**: none: a repeat is drawn twice (another flash and number)
- **Fields**:
  - id: stamped (phone: drops its own echo, a sender it does not draw in its zone, and one it does not know)
  - dmg: look (phone: a number through toDisplayDamage, src/data/gameSystems.js:5658; anything that is not a number above 0 reads as 0; drawn as '-N' over the sender's copy)
- **Absent, and a bad value**: payload absent: relayed as {id}; the phone flashes the sender and draws '-0'. Worker: no field judged. Phone: dmg coerced to a number, not bounded
- **Notes**: the phone's own monsters only (the local-monster mode on 4.2's list): where the worker runs the monsters, monster_attack tells the room. Fight lock: open ('a relay', server/src/fightlock.js:280)

#### `player_jump` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/eventplace.js:80 RELAY_PLACED ; phone: src/networking/gameEvents.js:2504 -> src/game/jump.js:388 peerJump
- **Sent by**: src/game/jumpActions.js:91 (a jump; :140 the flip)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to the placed (eventplace.js:80: the sender, and the phones in the sender's zone as the ROOM has it; in the Wheel within EVENT_PLACE.R)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked
- **Who may start it**: never a helper (movement)
- **What it does**: plays (draws the sender's body lifted over its jump or flip on the other phones, with the push-off and landing sounds)
- **Request id**: none: a repeat is drawn twice (the jump's picture and sounds start again)
- **Fields**:
  - id: stamped (phone: drops a sender it does not draw in its zone, its own echo with it)
  - dur: look (phone: clamped 200..900 ms, else the game's own; the landing sound's wait clamped 150..2000)
  - peak: look (phone: clamped 8..120 px, else the game's own)
  - flip: look (phone: truthy plays the flip and its sound)
  - h0, v, g: look (phone: the flip's arc, each inside a fixed range and the time they give inside 120..3200 ms, src/game/jump.js:563, else read as a plain jump)
  - ang: look (phone: a finite number, else 0)
  - ts: not read
- **Absent, and a bad value**: payload absent: relayed as {id}; the phone draws the game's own jump. Worker: no field judged. Phone: every number clamped or defaulted, so a forged one cannot hang a figure in the air
- **Notes**: the sender's place still comes only from its moves; this is the picture. Fight lock: open ('a relay', server/src/fightlock.js:281)

#### `player_projectile` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/drawgather.js:187 _dgShot (index.js:6331, BEFORE the relay budget) ; server/src/freeswing.js:219 _pfBowShot (index.js:6377) ; server/src/spar.js:611 _sparSeen (index.js:6430) ; server/src/eventplace.js:80 RELAY_PLACED ; phone: src/networking/gameEvents.js:2272
- **Sent by**: src/game/monsterCombat.js:1934 (a basic arrow or bolt; also src/game/playerActions.js:457 the bow volley, :609 the big bolt, :653 the three orbs, src/game/dodge.js:363 a retreat shot)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to the placed (eventplace.js:80: the sender, and the phones in the sender's zone as the ROOM has it; in the Wheel within EVENT_PLACE.R)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351) for the relay itself, but _dgShot has already stamped the shot when the budget drops it; _dgShot keeps a build only when the sender has state, is not dead, holds that weapon in the worker's own slot (server/src/hitproof.js:135 _hitWeaponOk) and the live flag bowdraw / staffgather is on; _pfBowShot only for a session on the free-swing trial (join's fs) with perfectbow on
- **Who may start it**: never a helper (combat)
- **What it does**: plays (draws the sender's arrow or bolt on the other phones, with the bow's draw or the staff's cast and their sounds); changes your own state (the worker stamps the shot on its own clock: ps._dg and ps._pfb, memory only, which the shot's later hit claims are judged by)
- **Request id**: ts: the shot's name; drawgather.js:206 keeps the FIRST shot of a ts and stamps a second of the same ts no more, and the hit claims name it as sw (monster_damage, player_attack). A repeat is still relayed and drawn twice, and freeswing.js:226-229 restarts the bow's clock and stamps it again
- **Fields**:
  - id: stamped
  - ts: bounded claim (judge: drawgather.js:203 and freeswing.js:227: a finite number or the shot is not stamped; it is only a name, the time is the worker's own Date.now()) ; phone: the volley's shared line and the sound's once-a-shot
  - isStaff: request (judge: _hitWeaponOk, the worker's own staff or bow slot; picks dr or ga) ; phone: look (a bolt or an arrow)
  - isSpecial, retreat: claim (worker: either one means the shot's build is not counted, drawgather.js:189, and the bow's clock restarts unjudged, freeswing.js:224; taken as written) ; phone: look
  - dr (a bow), ga (a staff): bounded claim (judge: drawgather.js _dgShot: at most the worker's own time since this player's last counted shot plus SLACK_MS, capped at CLAIM_MAX_MS, nothing inside MIN_GAP_MS; NaN, a string, a negative read 0; the worker WRITES its bounded number back into the payload before it relays it) ; phone: ga sizes the drawn bolt (src/game/staffFeel.js:393), dr is not read
  - big: look (worker: read only to pick the sparring clones' answer, spar.js:616)
  - x, y, ang: look (phone: stored as written, no type check; where the copy leaves and its line; ang turns the drawn body)
  - el: look (a real element key or none)
  - life: look (clamped to 600 frames)
  - speedPx: look (capped at 20)
  - delayMs: look (a bolt's wait capped at 1 s, an arrow's at 60 frames)
  - volley, pc: look
  - tg: look (a string under 80 chars: the player the drawn copy is aimed at and ends on)
  - lp: look (two finite numbers or none)
  - gf: look (five numbers in range or none, src/game/shotGround.js:78)
- **Absent, and a bad value**: payload absent or an array: nothing stamped, relayed as {id}, and the phone pushes a copy with no place or line. No dr / ga field: today's whole arrow, charged to the one clock as a full build (drawgather.js:246 _dgWhole). dr or ga bad: clamped (to 0, or to the bound). No finite ts: no build kept, the hit claims land as today's. A field on the wrong weapon: ignored. Phone: life, speedPx, delayMs, el, tg, lp, gf clamped or dropped; x, y, ang taken as written
- **Notes**: the only action relay the worker reads to change its OWN state. Also sent by the worker itself for a sparring clone's shots: server/src/spar.js:935, :939, :977, :983 through _sparRelay (spar.js:515). On the watcher's phone the copy also counts as a hit on a breakable Wheel object it flies into (src/game/wheelBreak.js:115, by design on that screen only). Fight lock: open ('a relay', server/src/fightlock.js:281). Live flags: bowdraw, staffgather, perfectbow, freeswing, freeswingbonus

#### `player_respawned` (relay)

- **Handler**: server/src/index.js:6304 default branch (no hook) ; phone: src/networking/gameEvents.js:3916 (a relayed copy, in the tick's events) ; and src/networking/wsClient.js:3484 direct -> src/game/respawn.js:37 applyLocalRespawn (the worker's own, sent alone)
- **Sent by**: src/game/respawn.js:108 (after the phone stands up; also src/game/monsterCombat.js:1279, the phone's own respawn from its own monsters)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone (not placed)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked (the worker does not check that the sender was dead or has respawned)
- **Who may start it**: never a helper (combat) (border: the end of a death; it follows the player's own respawn)
- **What it does**: plays (clears the sender's corpse on the other phones)
- **Request id**: none: a repeat changes nothing (the dead mark is already clear)
- **Fields**:
  - id: stamped (relayed copy: the phone clears _isDead and _deathTs on its copy of that sender, and drops its own echo)
  - zone: the worker's own, on the worker's own message only (direct case: where the phone stands up, absent read as 'town'); a relayed copy's zone is not read
- **Absent, and a bad value**: payload absent: relayed as {id}, which is all the relayed case needs. An unknown sender: nothing. Direct case: no payload reads as 'town'
- **Notes**: the same type is ALSO the worker's own message to the one who respawned: server/src/index.js:3587, sent alone with payload {zone: 'town'}, so it lands in the direct switch and moves that phone to town (applyLocalRespawn). It is deliberately NOT in PRIVILEGED_EVENTS (index.js:632). The direct case does not check msg.from: what keeps a relayed copy out of it is the envelope alone (a relay rides the tick's events and reaches only processGameEvent). Also sent by the worker for a sparring clone standing up: server/src/spar.js:569 and :723 through _sparRelay. Fight lock: open ('a relay', server/src/fightlock.js:281)

#### `player_shield` (relay)

- **Handler**: server/src/index.js:6304 default branch (no hook) ; phone: src/networking/gameEvents.js:2448 -> src/game/shieldCopies.js:34 applyPeerShieldEdge
- **Sent by**: src/game/shieldToggle.js:157 (up; :180 down; also src/game/playerActions.js:703)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone (not placed: eventplace.js:99, a guard stays up or down until the next toggle, so a missed edge would be drawn wrong)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked (the worker does not check a shield is worn or that the move's blocking request agrees)
- **Who may start it**: never a helper (combat)
- **What it does**: plays (draws the sender's shield raised or lowered on the other phones; the raise is heard by a peer in the same zone)
- **Request id**: none: a repeat changes nothing (the watcher's copy is set to the same up or down; the raise is heard again only after a down)
- **Fields**:
  - id: stamped (phone: an unknown sender is dropped; the edge is applied whatever the sender's zone)
  - up: look (phone: written as it came to the copy's _shieldUp, read only by the renderer, src/rendering/systems/entityRenderer.js:12819 and :13421)
- **Absent, and a bad value**: payload absent: relayed as {id}; the phone reads up as undefined: the shield drawn down. Worker: nothing judged. Phone: up not coerced
- **Notes**: the worker's own guard is NOT this relay: nothing in server/src reads a relayed player_shield; the worker's guard is set from the move message's blocking field (server/src/movement.js:796). So a relayed up with no guard behind it is a picture only. Also sent by the worker itself for a sparring clone: server/src/spar.js:486, :595, :860, :876 through _sparRelay. Fight lock: open ('a relay', server/src/fightlock.js:281)

#### `player_swing` (relay)

- **Handler**: server/src/index.js:6304 default branch -> server/src/spar.js:611 _sparSeen (index.js:6430, only when the sender has sparring clones) ; server/src/eventplace.js:80 RELAY_PLACED ; phone: src/networking/gameEvents.js:2187
- **Sent by**: src/game/monsterCombat.js:2064 (a basic swing; also src/game/playerActions.js:678 the special, src/game/abilities.js:755 Shield Bash and Whirlwind)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to the placed (eventplace.js:80: the sender, and the phones in the sender's zone as the ROOM has it; in the Wheel within EVENT_PLACE.R)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked (not that a weapon is held, a special paid for, or the sender alive)
- **Who may start it**: never a helper (combat)
- **What it does**: plays (draws the sender's swing, bash or whirlwind on the other phones, with its sound and its mark on a prop)
- **Request id**: none: a repeat is drawn twice (the swing's picture and sound again)
- **Fields**:
  - id: stamped (phone: drops a sender it does not draw in its zone, its own echo with it)
  - special: look ; the worker reads it once: a special that is neither whirl nor bash makes the sender's OWN sparring clones defend (spar.js:617)
  - bash: look (phone: the shove's picture and pose for BASH_POSE_MS)
  - whirl: look (phone: the vortex)
  - r: look (phone: clamped 0..600, absent 240)
  - wpn: look (phone: stored as written, picks the drawn weapon)
  - ang: look (phone: a number, else ignored; turns the body, aims the picture and the prop's mark)
  - ts: not read
- **Absent, and a bad value**: payload absent: relayed as {id}; the phone draws a plain swing with no angle. Worker: no field judged. Phone: r clamped, ang ignored unless a number, wpn taken as written
- **Notes**: the swing's DAMAGE is not this relay: it is the sender's monster_damage / player_attack claim. On the watcher's phone a swing's fan also counts as a blow on a breakable Wheel object in it (src/game/combatHelpers.js:1128 -> src/game/wheelBreak.js:115; by design on that screen only: a broken one loses its footprint there for REPAIR_MS). Also sent by the worker itself for a sparring clone: server/src/spar.js:831, :922, :966 through _sparRelay. Fight lock: open ('a relay', server/src/fightlock.js:281)

#### `pvp_confirmed` (relay)

- **Handler**: server/src/index.js:6304 default branch (no hook) ; phone: src/networking/gameEvents.js:4549
- **Sent by**: src/networking/gameEvents.js:4462 (the defender's phone, answering the worker's pvp_hit on it; a second site at :4535 sits in the phone's player_attack case, which nothing sends to)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone (not placed; only the phone named in target acts on it)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked (the worker does not check that it sent a pvp_hit on the sender, or that anyone died)
- **Who may start it**: never a helper (combat)
- **What it does**: plays (tells the attacker's phone its hit on the sender landed, and whether it killed)
- **Request id**: none: a repeat acts twice (each one carrying died adds one more to the receiving phone's PvP kill count and plays the kill again)
- **Fields**:
  - id, from, name: stamped (the sender, the worker's; the phone uses from to find its own memory of a pvp_hit on that player, PVP_SRV_HIT_MS)
  - target: claim (any player id; the phone named acts, every other phone ignores it)
  - died: claim (the receiving phone shows KILL!, plays the kill sound and adds 1 to its own S.rpg._compStats.pvpKills, src/networking/gameEvents.js:4595-4599)
  - dmg: look (the legacy 'Hit! -N' popup, Math.ceil of it, shown only when srv is absent and the phone remembers no pvp_hit on that player)
  - srv: claim (truthy hides that popup)
  - isCrit, blocked: not read
- **Absent, and a bad value**: payload absent: relayed as {id}; no phone is the target, nothing happens. Worker: no field judged. Phone: target must equal its own id or the event is ignored; nothing else checked
- **Notes**: in PRIORITY_EVENTS (src/networking/wsClient.js:5441: sent at once, not batched). The legacy clan-war scoring behind died (gameEvents.js:4605) runs only against a worker that does not advertise caps.clans, and what it sends (clan_war_kill) is in PRIVILEGED_EVENTS, so today's worker drops it. Fight lock: open ('a relay', server/src/fightlock.js:281)

#### `stunned` (relay)

- **Handler**: server/src/index.js:6304 default branch (no hook) ; phone: src/networking/gameEvents.js:4071
- **Sent by**: no phone sends it in practice (its one send site, src/networking/gameEvents.js:4521, is inside processGameEvent's player_attack case, which nothing sends to: the worker takes player_attack as a router case, server/src/index.js:5369, and never sends that type on)
- **Envelope**: relay: rebuilt in the sender's name, out in the tick's events to everyone (not placed; only the phone named in target acts on it)
- **Sender's phase**: joined; the relay budget (server/src/index.js:6351); nothing else checked
- **Who may start it**: never a helper (combat)
- **What it does**: plays (meant to stun the player it names; today it changes nothing: see found)
- **Request id**: none: a repeat changes nothing (it sets the same unread stamp again)
- **Fields**:
  - id: stamped
  - target: claim (any player id; the phone named writes S._stunEnd, every other phone ignores it)
  - duration: claim (ms, no clamp, absent 2000; added to now for S._stunEnd)
- **Absent, and a bad value**: payload absent: relayed as {id}; no phone is the target, nothing happens. Worker: no field judged. Phone: nothing clamped
- **Notes**: in PRIORITY_EVENTS (src/networking/wsClient.js:5441). The worker's own stuns (a daze, a stagger) do not use this type. Fight lock: open ('a relay', server/src/fightlock.js:282)


## 5. Worker to phone

Direction: worker to phone. Comes in: the socket. One row for each type in `PRIVILEGED_EVENTS` (`server/src/index.js:524`), and one more: `clan_war_declare`, which the worker sends itself though it is on neither list (family M2). The handler line names the phone's case: `direct` is the direct switch of `src/networking/wsClient.js`, the rest are `processGameEvent`'s (`src/networking/gameEvents.js`). The eight relay types the worker also sends itself are on their part 4 rows.

### 5.A the session: join, move, track, pong (6)

#### `test_mode` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2523 direct -> src/game/testMode.js:13 applyTestMode
- **Sent from**: server/src/testmode.js:154 _testModeTell (from server/src/testmode.js:117 _testModeSet, the owner's route POST /api/admin/dev/testmode)
- **Envelope, and to whom**: alone ; to the one character's socket
- **The phone's own check**: refuses a relayed copy (msg.from)
- **Who starts it**: the owner (POST /api/admin/dev/testmode, for a character who is online)
- **What the phone does**: sets the phone's TEST MODE tag on or off (display; the checks themselves are the worker's)
- **Id it echoes**: none
- **Fields**: payload.on: the worker's own (true only while the record is on and the live switch allows it)
- **Absent, and a bad value**: no payload, or on not exactly true: off
- **Notes**: a join learns it from state_sync instead | live flag testmode

#### `key_new` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2446 direct
- **Sent from**: server/src/loginkeys.js:179 (the end of _keysAfterJoinNow; called from server/src/join.js:2022, after the join is in)
- **Envelope, and to whom**: alone ; to the joining socket only
- **The phone's own check**: refuses a relayed copy (msg.from) ; the key must have a new key's shape ; id must be this phone's own id
- **Who starts it**: the system (answering a join that said kv: 2 and came in with the old key or as a new character; not again within LOGIN_KEYS.REMINT_MS for the same device)
- **What the phone does**: sets the phone's stored Login Key to the new one, keeping the key it came in with beside it until a join with the new one is in
- **Id it echoes**: none
- **Fields**:
  - key: the worker's own (eight words made here; the worker keeps only its fingerprint)
  - id: the worker's own (the character it belongs to)
- **Absent, and a bad value**: a bad key or another id: ignored, the old key goes on working on that device and the next join is handed another
- **Notes**: fields sit on the message itself, no payload | the key is a secret in clear on the socket; never logged, never relayed | live flag keys2

#### `join_rejected` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:1504 direct
- **Sent from**: server/src/join.js:716 (and :652, :691, :700, :710, :728: one a reason) ; server/src/verify.js:90 _verifyRefuse ; server/src/devicelock.js:118 _authPutOut ; server/src/origin.js:108 refuseOrigin
- **Envelope, and to whom**: alone ; to the refused socket only, which is closed straight after
- **The phone's own check**: none checked
- **Who starts it**: the system (answering join; devicelock.js:118 can also put a player out just after their join is in)
- **What the phone does**: sets which screen the close that follows opens: the account check for 'verify', "play at the official site" for 'origin', the device screen for 'device', the key screen for 'key', a wait for 'locked', a frozen notice for 'frozen'; for 'auth' the key screen (or, only under ?tabid=0, one new identity is made); any other reason stops the phone retrying for good
- **Id it echoes**: none
- **Fields**:
  - reason: the worker's own ('auth' close 4003, 'key' 4017, 'locked' 4018, 'device' 4016, 'frozen' 4004, 'verify' 4014, 'origin' 4015)
  - ms: the worker's own (with 'locked': 60000)
  - sitekey: the worker's own (with 'verify': the Turnstile site key)
  - home: the worker's own (with 'origin': the game's address)
- **Absent, and a bad value**: no reason is read as 'auth' (wsClient.js:1515) | ms outside 5 s to 2 min is clamped | sitekey not a string: an empty one | an unknown reason: not retried (S._joinRejectedFatal)
- **Notes**: fields sit on the message itself, no payload | the 'origin' one is sent by the worker's front door on a socket that never reaches a room

#### `room_full` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:1483 direct
- **Sent from**: server/src/join.js:348 _roomFullRefusal (called from server/src/index.js:4944 for the cap and :4952 for the address's limit)
- **Envelope, and to whom**: alone ; to the refused socket only, on a socket the room never keeps, closed 4009 straight after
- **The phone's own check**: none checked
- **Who starts it**: the system (answering the socket's opening, before any join; only for a page that asked with ?rf=1, every other gets a plain 503)
- **What the phone does**: sets the phone's status to "full" and the wait before its next try (the close's handler does the waiting, wsClient.js:4896)
- **Id it echoes**: none
- **Fields**:
  - reason: the worker's own ('full' or 'ip')
  - count: the worker's own (sockets held)
  - cap: the worker's own
  - retryMs: the worker's own (ROOM_FULL.RETRY_MS)
- **Absent, and a bad value**: a missing number reads as 0, and the phone uses its own wait
- **Notes**: fields sit on the message itself, no payload

#### `linger_wait` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:1473 direct
- **Sent from**: server/src/join.js:774 (a join while the body lingers elsewhere) ; server/src/bodytake.js:145 _bodyTakeFail (a taken-over body the phone never reached)
- **Envelope, and to whom**: alone ; to the one socket, closed 4010 straight after
- **The phone's own check**: none checked
- **Who starts it**: the system (answering join, or on a body take that ran out)
- **What the phone does**: starts the phone's "your bro is still in that fight" wait, then it joins again
- **Id it echoes**: none
- **Fields**: payload.ms: the worker's own (how long the body still stands, plus LINGER.WAIT_SLACK_MS)
- **Absent, and a bad value**: no ms, or not a number: LG_WAIT_DEFAULT (5 s)
- **Notes**: live flags linger, takeoverlinger

#### `body_place` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2104 direct -> src/game/bodyPlace.js:83 onBodyPlace
- **Sent from**: server/src/bodytake.js:101 _bodyTakeSend (from server/src/join.js:1977, after state_sync and player_state)
- **Envelope, and to whom**: alone ; to the joining socket only
- **The phone's own check**: refuses a relayed copy (msg.from) ; needs caps.bodyTake from this worker
- **Who starts it**: the system (answering a join with tb: 1 that took over a body in a fight)
- **What the phone does**: sets where the phone's own player will stand: the trip down the stairs lands at the body, or a phone already in the Wheel steps to it
- **Id it echoes**: none
- **Fields**: payload.z, payload.x, payload.y, payload.d: the worker's own (where the kept body stands and faces)
- **Absent, and a bad value**: no payload, a zone other than 'wheel', or x or y not finite: nothing is placed, and the worker's wait (BODY_TAKE.WAIT_MS) runs out into linger_wait
- **Notes**: until the phone stands at the body its moves move nothing (bodytake.js:114) | live flag bodytake

### 5.B1 the world stream, part 1 (6)

#### `zone_monsters` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3998 direct -> src/networking/wsClient.js:4597 _applyZoneMonstersMsg
- **Sent from**: server/src/movement.js:882 (a v1 phone's move into another land), server/src/movement.js:914 (into town or the farm: empty), server/src/dungeon.js:852 _dungeonPushZoneState (v1 phones get this alone), server/src/spawnscale.js:78 _pushZoneRoster (no caller left)
- **Envelope, and to whom**: alone; protocol v1 only (v2 gets zone_state); to the phone whose move changed zone, or to every v1 phone inside a dungeon's zone
- **The phone's own check**: none checked on the frame; dropped when its zone is not the phone's current zone (4612)
- **Who starts it**: the system (on the sender's own move into another zone; on a dungeon's wave)
- **What the phone does**: sets the phone's copy of the zone's monsters (replaced whole; a monster it already holds keeps its own state); an empty list ends server monsters on the phone
- **Id it echoes**: none
- **Fields**:
  - zone: the worker's own
  - monsters[id, arch, level, element, x, y, hp, maxHp, dmg, xp, gold, spd, emoji, color, alive, tg, home and variant on a Wheel monster, boss and its splits]: the worker's own (spawnscale.js monsterSnapWire; the dungeon's own copy at dungeon.js:854)
- **Absent, and a bad value**: monsters missing: nothing; zone missing: applied; an empty list: S._serverMonsters false and, after a server zone, the phone spawns its own for a zone in its ZONES table (4635); mnear is read here too but no v1 send carries it
- **Notes**: the empty list is the door to the phone's local-monster mode (4.2's list)

#### `zone_nodes` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3993 direct -> src/networking/wsClient.js:4642 _applyZoneNodesMsg
- **Sent from**: server/src/movement.js:885 (a v1 phone's move into another land), server/src/movement.js:917 (into town or the farm: empty), server/src/spawnscale.js:78 _pushZoneRoster (no caller left)
- **Envelope, and to whom**: alone; protocol v1 only (v2 gets zone_state); to the phone whose move changed zone
- **The phone's own check**: none checked on the frame; judged against the phone's current zone (see absent)
- **Who starts it**: the system (on the sender's own move into another zone)
- **What the phone does**: sets the phone's copy of the zone's gather nodes (replaced whole, each made with createGatherNode at the worker's tier) and turns the phone's own node spawning off (S._serverGatherNodes)
- **Id it echoes**: none
- **Fields**:
  - zone: the worker's own
  - nodes[id, nodeType, x, y, tierLvl, alive, respawnAt, home on a Wheel node]: the worker's own (spawnscale.js _zoneSnapshotWire)
- **Absent, and a bad value**: nodes missing: nothing; zone missing: the phone's current zone is assumed; zone not the phone's: the list is kept and applied on entering it (stashPendingZoneNodes, 4659); in a safe zone the phone's nodes are emptied whatever came; respawnAt missing: 0
- **Notes**: a dungeon's push sends a v1 phone no nodes frame (dungeon.js:881), by design

#### `zone_loot` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2012 direct -> src/networking/wsClient.js:4671 _applyZoneLootMsg -> src/networking/wsClient.js:4199 _buildServerPile
- **Sent from**: server/src/movement.js:888 (a v1 phone's move into another land), server/src/movement.js:920 (into town or the farm: empty)
- **Envelope, and to whom**: alone; protocol v1 only (v2 gets zone_state); to the phone whose move changed zone
- **The phone's own check**: none checked on the frame; dropped when its zone is not the phone's current zone (4680)
- **Who starts it**: the system (on the sender's own move into another zone)
- **What the phone does**: sets the phone's copy of the zone's ground loot (replaced whole) and turns the phone's own loot drops off (S._serverLoot); speaks (a pile's killerName)
- **Id it echoes**: none
- **Fields**:
  - zone: the worker's own
  - loot[a pile, server/src/index.js:4216 _serializePile]: lootId, zone, x, y, coins, skull, shard, recipients (player ids), shares {id: share}, ts, inventoryClaimed, hasWeapon, weaponClaimed, weaponMystery, weaponTier, weaponType, weaponName, armor[] (each piece without its quality, _mysteryPiece), armorClaimed, mystery, gem, isDeathDrop, deathItems [{key, qty}], expiry, ownerOnlyUntil; a death pile's openLeft, left; a dropped item's dropped, dropBy, openLeft, flashLeft, left: the worker's own
  - killerName: words (a player's name, the worker's copy)
- **Absent, and a bad value**: loot missing: nothing; zone not the phone's: dropped; in a safe zone the phone's loot is emptied whatever came; in a pile: x, y not finite: 0; killerName missing: 'Player'; ts missing: now; coins shown are coins times this phone's own share (no share: 0); the worker's times are put on the phone's clock (workerClock.toPhone), the time-left fields used first
- **Notes**: a pile hidden from the viewer (another player's drop in its private minute, itemdrop.js _pileHiddenFrom) is left out by index.js _zoneLootForWire

#### `zone_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2017 direct -> src/networking/wsClient.js:4597 _applyZoneMonstersMsg, src/networking/wsClient.js:4642 _applyZoneNodesMsg, src/networking/wsClient.js:4671 _applyZoneLootMsg
- **Sent from**: server/src/movement.js:875 (a move into another land), server/src/movement.js:909 (into town or the farm: three empty lists), server/src/dungeon.js:852 _dungeonPushZoneState (a wave or a boss spawned), server/src/spawnscale.js:78 _pushZoneRoster (no caller left)
- **Envelope, and to whom**: alone; protocol v2 only (one frame for v1's three); to the phone whose move changed zone, or to every v2 phone inside a dungeon's zone
- **The phone's own check**: none checked on the frame (no msg.from test); each part is judged against the phone's current zone (see absent)
- **Who starts it**: the system (on the sender's own move into another zone, movement.js; on a dungeon's wave, dungeon.js)
- **What the phone does**: sets the phone's copy of the zone: replaces its monsters (a monster it already holds keeps its own state, monsterCarry.js), its nodes and its ground loot; an empty monster list without mnear ends server monsters on the phone; speaks (a pile's killerName)
- **Id it echoes**: none
- **Fields**:
  - zone: the worker's own
  - monsters[id, arch, level, element, x, y, hp, maxHp, dmg, xp, gold, spd, emoji, color, alive, tg, home and variant on a Wheel monster, boss and its splits]: the worker's own (spawnscale.js monsterSnapWire)
  - nodes[id, nodeType, x, y, tierLvl, alive, respawnAt, home]: the worker's own
  - loot[a pile: see zone_loot]: the worker's own, the viewer's own private drops included; killerName: words
  - mnear: 1: the worker's own (only the monsters around a wn: 1 phone, wheelnear.js)
- **Absent, and a bad value**: monsters, nodes or loot missing: that part is skipped; zone not the phone's current zone: monsters dropped (4612), loot dropped (4680), nodes kept for the entry (4659); no zone: applied; monsters empty without mnear: 1: S._serverMonsters false and, after a server zone, the phone spawns its own (4635); in a safe zone nodes and loot are emptied whatever came
- **Notes**: followed by the zone's fire_trail snapshot (movement.js:900) | the dungeon's push carries nodes: [] and that viewer's loot

#### `state_sync` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:1649 direct -> src/networking/wsClient.js:283 peerFromSnapshot, src/networking/wsClient.js:4566 _monsterFromWire, src/networking/wsClient.js:4199 _buildServerPile, src/networking/serverReady.js:78 markServerReady
- **Sent from**: server/src/join.js:1827 (the one send, at the end of _handleJoin), players by server/src/index.js:6595 getAllPlayerData or server/src/nearjoin.js:244 _nearJoinPlayers
- **Envelope, and to whom**: alone; to the joining socket only, once a join
- **The phone's own check**: none checked (no msg.from test); needs players (see absent)
- **Who starts it**: the system (answering join)
- **What the phone does**: starts the session on the phone: sets its copy of the caps (every gate the phone reads, DevPanel.jsx CAP_GATES), its own character record, every other player, and the join zone's monsters, nodes and loot; clears what a reconnect must not keep (the party HUD, a trade's leftovers, the duel and trade with caps.rejoinResend, the ride, the shot counts); lifts the room-full and linger screens; caps without serverReady.js SERVER_READY_CAPS: holds the veil and joins again; speaks (other players' names and drawings)
- **Id it echoes**: none
- **Fields**:
  - caps{...}: the worker's own: about 170 capability keys, some counts (cookRows, farmCrops, bagWeapons, rejoinResend, wheelsize, clientoff), then EVERY live flag spread over them (..._liveFlags, join.js:1892), then freeSwing, perfectStrike, bowDraw, staffGather, accuracy
  - char {name, look, createdAt}: echo of the stored character record (char: on file): name is words (the player's own, join.js sanitizeDisplayName), look the player's own stored look; null with none
  - httpToken: the worker's own (httpauth.js: this session's token for the mutating HTTP routes)
  - bro, broN: the worker's own (broverify.js)
  - testMode: the worker's own (testmode.js), absent when off
  - players{id: entry}: a whole entry is index.js _peerPublic (PEER_PUBLIC_KEYS): look, passed on from that player's phone (its join and track looks, strings capped by cosmeticCap, rpgData at most TRACK_BLOB_MAX_BYTES), name: words (join.js sanitizeDisplayName, or the stored character name), and stamped by the worker: clanTag (clans.js _clanStampTag), cape (eventcapes.js _capeStamp), rpgLv (prog3.js _levelStamp), rpgData ap / title / rarest (achievements.js _achvStamp), the stored look (join.js _stampRecordLook), allyTag, bro, gear ids cropped (gearprov.js _gearProvCropPeer); d, z, vx, vy, f, ex from the state; a lingering body and a sparring clone are entries too
  - players, to a phone that joined with nj: 1: those around it whole with the worker's live place (nearjoin.js live), everyone else a list entry marked fa: 1 (name, color, avatar, rpgLv, clanTag, clanColor1, bro, allyTag, z, brn and a few rpgData keys)
  - playerCount: the worker's own
  - monsters[id, arch, level, element, x, y, hp, maxHp, dmg, xp, gold, spd, emoji, color, alive, tg, variant, home, boss and its splits]: the worker's own
  - monstersNear: 1: the worker's own (only the monsters around a wn: 1 phone, wheelnear.js)
  - nodes[id, nodeType, x, y, tierLvl, alive, respawnAt, home]: the worker's own
  - loot[a pile, index.js _serializePile: see zone_loot]: the worker's own, but killerName: words (a player's name)
  - monsterZone: the worker's own (the zone the three lists are for)
  - bodyPlace: 1: the worker's own (a body_place follows, bodytake.js)
- **Absent, and a bad value**: caps absent reads as {}: not ready, the phone joins again (_rejoinForReadiness); players absent THROWS at src/networking/wsClient.js:1924 and nothing after it is applied; char is applied only with caps.charLock and a record; httpToken not a string: null; monsters empty without monstersNear: 1 puts the phone in local-monster mode (S._serverMonsters false); nodes for a zone that is not the phone's: kept for the entry (stashPendingZoneNodes); loot for another zone: dropped; in a safe zone nodes and loot are emptied whatever came
- **Notes**: followed at once, in this order (join.js:1964 on): player_state, player_died for a death resumed, body_place, the join's item_reveal, rewards_state, pets_state, codex_state, achv_state, an arena match, duel_resume and the trade (rejoinresend.js), party_state, player_count to all, key_new; cape_status when its ledger is warm | built once: no second send site

#### `tick` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:986 direct -> for each of events[], processGameEvent (src/networking/wsClient.js:1215); helpers src/game/nearJoin.js:49 applyPeerLooks, src/game/presence2.js:103 applyOnlineList, src/game/presence2.js:85 parkMissing
- **Sent from**: server/src/tick.js:863 buildFor (the reference builder, live with tickshare: false), server/src/tick.js:1152 buildShared (the same bytes from parts made once a tick; tick-share.test holds the two together), server/src/tick.js:1274 (the one send, a phone at a time, after its own mw / pl / nr / on are added at 1233 to 1273)
- **Envelope, and to whom**: alone, about 45 a second while anything changed (nothing changed: no frame); to every socket in the room, one build shared by each (zone, protocol version, events heard, mute key) group, a v2 phone in the Wheel its own; it IS the envelope of every event (events[])
- **The phone's own check**: none checked (no msg.from test; the type is privileged, so no relay carries it); skips its own id in players
- **Who starts it**: the system (every tick with something to say: a moved player, a queued event, a changed monster or node, the 1 Hz roster, a far send)
- **What the phone does**: plays (drives the drawn world: every other player's place, facing and pose, the monsters' place and health, the nodes' state); sets the phone's copy of the players (makes one it does not hold with a placeholder look, forgets one gone), of the monsters and of the nodes; hands each event to processGameEvent; speaks (a pl entry carries a player's name and drawings; events carry chat)
- **Id it echoes**: none (seq counts the worker's ticks; the phone never reads it)
- **Fields**:
  - seq, ts: the worker's own (the phone's case reads neither)
  - players{id: entry}: the zone's movers, plus on the 1 Hz roster every player in the room; for a v2 phone in the Wheel its own plan (tick.js playersPlanFor / rosterPlanFor: the near whole, its party whole, the far slim and only when due or the map is open)
  - players x, y: the worker's own (that player's move as bounded by movement.js; rounded unless roundpos: false)
  - players z: the worker's own (zonejudge.js)
  - players d, f, vx, vy, ex, eqc, eql, eqs: look, passed on as that player's phone sent it in move (server/src/movement.js:731 to 760; taken as it is)
  - players bro, brn: the worker's own (broverify.js)
  - players spr (sprint.js _sprintWire), brd (ride.js _rideWire), sk 'r' or 'w' (nomansland.js), pw 'kind.stage.gold.size.lv' (petbook.js), eqg (gearprov.js armourGradeWire), po (poses.js: a listed pose): the worker's own, each absent when off
  - a slim entry (a far player): x, y, d, z, vx, vy only
  - events[]: {type, payload, from}: each its own row in parts 4 and 5; chosen for this phone by eventplace.js, a muted speaker's chat / emote / dice_roll left out
  - monsters{zone: [id, x, y, hp, alive, st stun until, ph burrow phase, bu burst until, tg the id it chases or null]}: the worker's own; v1 every monster of the zone, v2 the changed ones, in the Wheel the changed ones in reach and each one entering reach
  - nodes{zone: [id, alive, respawnAt]}: the worker's own; v1 all, v2 the changed
  - mw{zone: [a whole monster, spawnscale.js monsterSnapWire]}: the worker's own; only to a phone that joined with wn: 1, each monster once a visit (wheelnear.js)
  - pl{id: a whole public entry}: look, passed on from that player's phone, with its name (words) and the worker's live place (nearjoin.js _nearJoinWhole); only to a phone that joined with nj: 1
  - nr: 1: the worker's own (this roster holds everyone near you)
  - on{id: zone}: the worker's own (everyone in the room, every PRESENCE2.ONLINE_EVERY_MS, to a pres 2 phone)
- **Absent, and a bad value**: a part not sent is skipped (a tick carries only what changed); spr, brd, sk, pw, eqg, po absent mean off, since a whole entry is the whole wire; a slim entry leaves pose and bro as they were; monsters and mw are read only with S._serverMonsters, nodes only with S._serverGatherNodes, and only the phone's current zone's list; a monster or node id the phone does not hold: nothing (mw: made); an mw entry with no string id: dropped; eqg clamped to 2 chars; bro not a number: null; an event whose handler throws is logged and the rest go on (wsClient.js:1215); players x, y, d, z are taken as sent
- **Notes**: live flags that change what it carries: tickshare, roundpos, eventplace, petshow, farplayers / far_ms, steadymovers, slimroster, presence2, nearjoin, wheelnear | a change to what a tick carries goes in BOTH builders (tick-share.test) | with no online list the phone forgets a peer silent for 10 s (wsClient.js:1181)

### 5.B2 the world stream, part 2: the player (8)

#### `player_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2707 direct
- **Sent from**: server/src/persistence.js:605 _sendPlayerState (its one send, line 763); called from server/src/persistence.js:596 _flushPendingPlayerStates (the tick's flush of regen, hits and credits), from server/src/persistence.js:774 _resendPlayerState (a refusal's echo), and by action handlers at once
- **Envelope, and to whom**: alone ; to the player it is about, nobody else
- **The phone's own check**: needs a payload and a loaded S.rpg, else ignored; msg.from is not checked
- **Who starts it**: the system (at the join; after every action the worker settles for this player; on the tick's flush when regen, a hit or a credit moved something; as a refusal's echo)
- **What the phone does**: sets the phone's copy of its own character (purse, bag, pools, stats, gear, quests, skill tracks, buffs, the cape) over whatever the page predicted; shows a popup when gold nuggets or raw gems went up and a chat line when a cape arrives; saves the warm-start cache (saveRpgSoon); sets S._rpgFromServer
- **Id it echoes**: none
- **Fields**:
  - cape: the worker's own (the worn cape from the cape ledger, eventcapes.js _capeWornBy)
  - coins, goldNuggets, goldBars: the worker's own
  - inventory: the worker's own (the phone replaces its whole bag)
  - lifeSkills: the worker's own stored blob, merged a key at a time (the phone keeps its own keys the echo lacks)
  - level, xp, unspentT2, buildPointsThisLvl: the worker's own
  - hp, maxHp, stamina, maxStamina, mana, maxMana, manaBlocks, stamBlocks: the worker's own (applied last, after every recalc the case runs)
  - _buffs: the worker's own (timers damage, rest/regen, resist, spd, hp, mana, xp, wellRested and strengths damageMul, spdMul, manaFlat, xpMul)
  - weapon, rangedWeapon, staffWeapon, armor, legsArmor, weaponStash, armorStash, legsStash: the worker's own, through revealPublic (a piece still unrevealed goes without its grade)
  - shield, amulet, shieldStash, gearStash, amuletStash: the worker's own
  - activeSlot: echo (the phone's own set_active_slot as the worker kept it)
  - power, vitality, endurance, agility, mind: echo (this phone's own stats_update, clamped in grids.js, kept by the worker)
  - weaponSkills, weaponUnspent, weaponSpecs, defenseSkill, defenseUnspent, defenseSpec, hpSpec, hpUnspent, enduranceSpec, enduranceUnspent: echo (this phone's own stats_update, sanitised at grids.js:894-945, kept by the worker)
  - _quests, _questKills, achievementPoints: the worker's own (_questKills is server-sole-writer, handoff rule 18)
  - _questFlags: echo (what a phone claimed at an old join, as the stored record holds it, join.js:1103; the worker never writes it, rule 18)
  - t2Flat, prog3, svKills: the worker's own (prog3 is never read back from the phone)
- **Absent, and a bad value**: no payload or no S.rpg: ignored. Every field is presence- and type-gated, so absent means unchanged (a v2 delta carries only what changed). cape present and null means taken off. Inside _buffs an absent timer means off. A falsy shield keeps the phone's own; a shield the phone does not hold goes into its bag, never onto the arm. A T1 stat lower than the phone's is ignored (adopted upward only). activeSlot is ignored once the player cycled this session, and a slot the phone cannot fill is healed to melee. A pool that is not a number is ignored.
- **Notes**: v1 phones get every field each time; v2 phones only the fields whose JSON changed since this session's last send (session.lastPlayerStateSent; nothing changed, nothing sent), which is why a refusal forgets named fields first (_resendPlayerState, _refusalEcho persistence.js:789). On receipt the phone may itself send set_active_slot (wsClient.js:3046, the unfillable-slot heal) and shield_wear (syncShieldWorn, wsClient.js:3104).

#### `player_died` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3393 direct -> src/game/deathCard.js:56 noteDeath
- **Sent from**: server/src/index.js:3372 _handlePlayerDeath (the send is at 3493); server/src/join.js:1973 (a rejoin inside the dying window, from life.js's note)
- **Envelope, and to whom**: alone ; to the player who died, nobody else
- **The phone's own check**: needs S.rpg; ignored while the phone is already dying (S._dying); msg.from is not checked
- **Who starts it**: the system (when the player's health reaches 0: a monster's or a player's hit, a burning heap, the tick's stuck-at-zero sweep; and again at a rejoin whose death is still inside its five seconds)
- **What the phone does**: starts the phone's dying phase (S._dying, the death card, shake, flash, sound, lock and shield dropped, deaths counter +1); plays (the phone then sends a move and the relay player_died_to_monster so others draw the body)
- **Id it echoes**: none
- **Fields**:
  - cause: the worker's own ('monster:\<id>', 'monster:heap', 'pvp:\<player id>', 'stuck-at-zero', 'unknown'; an id, never a name)
  - respawnInMs: the worker's own (5000, or the ms left at a rejoin)
  - keptBag: the worker's own (1 when a dungeon or a duel kept the bag; absent otherwise)
- **Absent, and a bad value**: no payload: the death still plays, the card has no killer and holds DEATH_CARD.HOLD_MS; respawnInMs not a positive number: the same default, and a larger one is clamped to 30 s; an unknown cause shows "YOU DIED" with no killer; keptBag absent: nothing promised
- **Notes**: The phone waits for player_respawned and player_state to stand up; it changes no gold itself. The card's sentence "\<name> killed you" is built ON THE PHONE from its own copy of the killer's name (src/game/deathCard.js:45, type-checked and cut to 24), not sent by the worker.

#### `inbox_delivered` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1969 processGameEvent
- **Sent from**: server/src/inbox.js:654 _sendInboxDelivered ; called from server/src/inbox.js:313 _creditPlayerOnce and server/src/inbox.js:758 _creditWith (a credit to a player who is online), server/src/inbox.js:285 _creditLiveTogether (both sides of a swap), server/src/inbox.js:604 _drainInboxNow (the mail waiting at a join)
- **Envelope, and to whom**: alone ; to the player credited, nobody else
- **The phone's own check**: none checked (it reaches processGameEvent through the direct switch's default)
- **Who starts it**: the system (when a credit lands: a sale, a refund, a returned bid or offer, a trade's goods, a duel or arena pot, a war's pay, a daily reward, a quest reward that did not fit, the owner's grant; live, or drained from inbox:\<pid> at the join)
- **What the phone does**: shows (a chat line "You received \<what> (\<note>)", a toast and a sound for source 'market', a toast for the daily reward, the Post Office's list); sets the phone's copy of a gear stash (a `gear` entry's piece is pushed into the named local stash and bt_rpg written); speaks when the note carries a player's name or tag
- **Id it echoes**: none (the credit's opId stays on the worker; it is not sent)
- **Fields**:
  - entries[].kind: the worker's own (gold, item, weapon, gear, pet, achv)
  - entries[].payload: the worker's own credit, sent as stored (amount and ap; invKey and count; weapon; piece, field and the gear's provenance row; pet and from; an achievement id)
  - entries[].source: the worker's own (market, trade, duel, arena, daily, dailyquest, season, dailyspin, admin...)
  - entries[].note: the worker's sentence, but with words inside it for some credits: the buyer's name (store.js:1043), the other trader's name (trade2.js:323, 355, 434), the other alliance's or clan's tag (alliance.js:521, clans.js:495), the owner's own text for a grant (admin.js:368); see found
  - queued: the worker's own (deliveries still waiting because a stash is full)
- **Absent, and a bad value**: no entries: nothing shown; an unknown kind: "a delivery"; a gear entry whose field is not one of the five stash names, or with no piece: not adopted; a missing amount or count reads as 0 or 1; no note: no brackets; sources daily, dailyquest, season, dailyspin print no chat line
- **Notes**: The gold and goods are already applied and saved on the worker before this is sent (the player_state echo carries them); only a gear piece is adopted from this message, because the phone does not read the gear stashes off player_state. A pet entry's words are built on the phone (petMailWords: the pet's own name, then its kind and level).

#### `ping` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:4148 direct
- **Sent from**: server/src/tick.js:160 _tickPingAndAfk (the send is at 218; about every 3 s)
- **Envelope, and to whom**: alone ; to every socket still open: joined or not, not idle past IDLE_TIMEOUT_MS, and inside its join window if it never joined
- **The phone's own check**: none checked (the pong goes only if the socket is open)
- **Who starts it**: the system (the tick's ping and AFK sweep)
- **What the phone does**: sets the phone's worker clock (workerClock.sample: worker minus phone, the largest of the samples kept) and moves ground piles built before the first ping onto it; answers with pong {ts}, at once or, on a quiet phone, riding its next frame with `hd` (the ms it was held, wsClient.js:5683)
- **Id it echoes**: ts: echoed in the pong; the worker takes only the latest ping's answer as a round-trip sample (index.js:5256)
- **Fields**: ts: the worker's own (its clock at the send, ms)
- **Absent, and a bad value**: ts not a finite positive number: no clock sample, and the pong still goes back carrying whatever ts was; a relayed copy cannot arrive (the type is privileged)
- **Notes**: The worker stamps session.lastPing at the send. The pong is the one message a socket may send before it joins besides join, and it never stamps the AFK clock (index.js:5131).

#### `player_count` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:4053 direct
- **Sent from**: server/src/join.js:626 _handleJoin (at the join's end, line 2011); server/src/leave.js:142 _leaveRun (line 260: the count less the one leaving)
- **Envelope, and to whom**: alone ; to everyone in the room (broadcastAll)
- **The phone's own check**: none checked
- **Who starts it**: the system (on every join, and on every leaving whose row in LEAVE_WAYS has `count`)
- **What the phone does**: shows (sets the player-count pip to msg.count)
- **Id it echoes**: none
- **Fields**: count: the worker's own (sessions that have joined; fields sit on the message itself, there is no payload)
- **Absent, and a bad value**: no count: the pip is set to undefined; nothing is checked or clamped
- **Notes**: The phone also moves the same number itself on player_join, player_leave and when it meets or sweeps a peer, so this message is the correction.

#### `player_join` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:4003 direct
- **Sent from**: server/src/join.js:626 _handleJoin (the broadcast is at 1751-1752); server/src/nearjoin.js:212 _nearJoinJoinBroadcast (whole look, or a list entry for a phone the joiner is not around); server/src/spar.js:356 _sparSpawn (a sparring clone, to everyone)
- **Envelope, and to whom**: alone ; to every socket but the joiner's (a clone's goes to everyone)
- **The phone's own check**: none checked (msg.id is not compared with the phone's own; data may be absent)
- **Who starts it**: the system (on another player's join; on a sparring clone made from the Test panel)
- **What the phone does**: sets the phone's copy of another player (S.others[id] replaced whole: place, name, colours, armour on show, level and health for the plate, the renamed look keys); raises the player count unless it already listed them; flashes the join pip; parks a far list entry out of sight; speaks (it carries the joiner's name)
- **Id it echoes**: none
- **Fields**:
  - id: the worker's own (the joiner's session id)
  - name (top level): words (the joiner's own text: the RAW top-level name of its join message, see found)
  - data.name: words (the stored record's permanent name, else the join's data.name as _sanitizeJoinData capped it; the phone's case does not read it)
  - data.x, data.y, data.z, data.d: look (the joiner's own claim as its sanitised join data holds it; a kept body's place, join.js:872, and a stood-up character's zone, join.js:1589, are the worker's; the next tick carries the worker's place)
  - data.rpgLv: the worker's own for a prog3 character (join.js:1534), else as the joiner wrote it
  - data.clanTag, data.clanColor1: the worker's own (clans.js:106 _clanStampTag)
  - data.rpgData.ap, .title, .rarest: the worker's own (achievements.js:553 _achvStamp)
  - the record's look keys (join.js RECORD_LOOK_KEYS): the stored record's (stored look wins; a key the record lacks is dropped, join.js:576 _stampRecordLook)
  - every other public key (color, avatar, bt, bl, hg, fr, bs, eqc, eql, eqs, eqst, wpnMat, rpgHp, rpgMaxHp, rpgData): look (the joiner's own, type- and length-capped by _sanitizeJoinData; only PEER_PUBLIC_KEYS go out, index.js:1057)
  - data.fa: the worker's own (1 marks a list entry: no look, the player is far)
- **Absent, and a bad value**: no data: a peer at 0,0 in 'town' with default colours, level 1, 50/50 health; a falsy name: 'Anon'; a missing look key: the table's fallback (null, or 'slim' for bs); an unknown id simply makes a new peer; nothing is refused
- **Notes**: The joiner's own phone gets state_sync instead. Within about 2 s the joiner's first whole look relay (player_update) follows and fills what this case does not read.

#### `player_leave` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:4045 direct
- **Sent from**: server/src/leave.js:142 _leaveRun (the broadcast is at 259: every way of leaving whose row has `leave`, unless the body lingers); server/src/linger.js:144 _lingerEnd (a lingering body's end, line 179, unless a quiet resume); server/src/spar.js:478 _sparRemove (a clone removed)
- **Envelope, and to whom**: alone ; to everyone in the room (broadcastAll)
- **The phone's own check**: none checked
- **Who starts it**: the system (on a player leaving through the session door: close, error, AFK, flood, kick, device, reset, a failed join or body take, a takeover in a fight; not a takeover outside a fight, whose row has no `leave`)
- **What the phone does**: sets the phone's copy of the room (S.others[id] deleted; the player count down by one, never below 1)
- **Id it echoes**: none
- **Fields**: id: the worker's own (the session id that left)
- **Absent, and a bad value**: an id the phone does not hold: nothing to delete, and the count still goes down by one; no id: the same
- **Notes**: A player who leaves inside a player fight in the Wheel lingers (linger.js): no player_leave until _lingerEnd.

#### `player_update` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:4058 direct -> src/networking/peerCosmetics.js:180 applyPeerCosmetics
- **Sent from**: server/src/lookrelay.js:146 _lookRelay (a phone's track: whole, or only what changed); server/src/alliance.js:217 _allySetTag; server/src/clans.js:286 _clanUntag; server/src/charwatch.js:125 _watchWipe
- **Envelope, and to whom**: alone ; to every socket but the one it is about (broadcastExcept); a sparring clone's goes to everyone (server/src/spar.js:356 _sparSpawn, server/src/spar.js:577 _sparStandBack)
- **The phone's own check**: an unknown id makes a placeholder peer only if it is not the phone's own id and data is present; nothing else checked
- **Who starts it**: the system (relaying another phone's track when its look changed, and whole at least every LOOK_RELAY.FULL_EVERY_MS; on an alliance tag set or cleared; on leaving a clan; on the owner's wipe of a character's drawings; for a sparring clone)
- **What the phone does**: sets the phone's copy of another player's look (Object.assign of data onto S.others[id] verbatim, then the renamed look keys, the armour on show, and the build); speaks when data carries a name
- **Id it echoes**: none
- **Fields**:
  - id: the worker's own (the session id of the player it is about)
  - data.clanTag, data.clanColor1: the worker's own (clans.js:106 _clanStampTag; null on leaving a clan)
  - data.cape: the worker's own (the worn cape, eventcapes.js:438 _capeStamp)
  - data.rpgData.ap, .title, .rarest: the worker's own (achievements.js:553 _achvStamp)
  - data.rpgLv: the worker's own for a prog3 character (prog3.js:1114 _levelStamp), else as that phone wrote it
  - data.allyTag: the worker's own (alliance.js, on no track list)
  - the drawings and patterns (sa sb pa pb ta tf tm tb tr sp pp fp): the stored record's, or dropped when the record has none (join.js:576 _stampRecordLook); null after the owner's wipe
  - data.name: words (that phone's own text off its track: a string cut at 64 characters, control characters kept, NOT the stored permanent name; see found)
  - data.x, data.y, data.dir, data.zone: look (that phone's own claim, a finite number or a string cut at 64; x and y never reach the worker's state, index.js:1029; the tick's next word on that player writes over them)
  - data.rpgHp, data.rpgMaxHp and the rest of data.rpgData (the inspect card: stats, gear and clan names, counters; at most TRACK_BLOB_MAX_BYTES): look, as that phone wrote them
  - every other key of TRACK_COSMETIC_KEYS (color, avatar, aw, bt, bl, hw, fh, hr, sk, hc, htc, fhc, st, stc, ec, ew, ewc, es, sc, hg, fr, pt, sh, bs, mask, pet, eqc, eql, eqs, eqst, wpnType, wpnMat, wpnE1, wpnE2, rep): look, as that phone wrote them (a string cut at cosmeticCap, a finite number, a boolean or null; index.js:5282-5333)
- **Absent, and a bad value**: no data and an unknown id: nothing; no data and a known id: the peer's height and frame go back to average (buildHeight and buildFrame are set from EVERY update, `_ud.hg || null`, wsClient.js:4127), which is why every worker send carries hg and fr; a key the data lacks is kept as it was (delta); a null value clears a key; an unknown look id draws nothing (the phone's own catalogs)
- **Notes**: The worker relays a track only when something other than x, y, dir, rpgHp, rpgMaxHp or rpgData's counters changed (lookrelay.js; live flag lookdelta false relays every track whole). rep, mask, pet, wpnE1, wpnE2 are that phone's own word, drawn as a badge or a look and read by no rule.

### 5.C1 small session messages (8)

#### `dice_roll` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:534 processGameEvent -> src/game/chat.js:494 handleDiceEvent
- **Sent from**: server/src/dice.js:83 (_handleDice: eventBuffer.push)
- **Envelope, and to whom**: in the tick's events; to the roller and the players near (eventplace.js:74), outside the Wheel the roller's zone; held back from a phone that muted the roller (chatmod.js:89)
- **The phone's own check**: needs a result that checks (src/game/dice.js:31 diceResult: kind, value and max in range) and an id; drops a roller this phone blocked or muted
- **Who starts it**: the system (answering dice)
- **What the phone does**: shows (a line in the chat feed, the number over the roller's head, a sound); speaks (the roller's name)
- **Id it echoes**: none
- **Fields**:
  - id: the worker's own (the roller; the phone takes the stamp `from` first, wsClient.js:1209)
  - name: words (the roller's character name, the worker's own copy: relay.js:104 _relayName; clamped and its lane marks taken off again on the phone, chat.js:502)
  - kind, value, max: the worker's own (rolled at dice.js:82)
  - zone: the worker's own (for the placing; the phone does not read it)
- **Absent, and a bad value**: a result out of range, or no id -> ignored
- **Notes**: the name rides a field of its own (the chat row's speaker); the line's words are the phone's template (src/game/dice.js:41)

#### `race_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2340 direct -> src/game/race.js:109 onRaceState
- **Sent from**: server/src/race.js:146 (_handleRaceStart, through race.js:114 _raceSend)
- **Envelope, and to whom**: alone; to the asker only
- **The phone's own check**: refuses a relayed copy (msg.from); needs flags and path, each a list of two or more finite points
- **Who starts it**: the system (answering race_start)
- **What the phone does**: starts the race's countdown on the phone (holds the player on the line until the gun, draws Lil Bro on the worker's path at the worker's speed)
- **Id it echoes**: none
- **Fields**:
  - in, lilMs, speed, flagR: the worker's own
  - flags[], path[]: the worker's own (the course in the room's coordinates)
- **Absent, and a bad value**: no payload, or bad flags or path -> ignored (the phone's own ask times out); in clamped 0..10000 ms; speed, lilMs and flagR fall back to the phone's defaults
- **Notes**: the race is judged on the worker's clock and the moves it accepts; what the phone draws is a picture of it

#### `race_cp` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2351 direct -> src/game/race.js:123 onRaceCheckpoint
- **Sent from**: server/src/race.js:174 (_raceOnMove, from an accepted move: movement.js:827)
- **Envelope, and to whom**: alone; to the racer only
- **The phone's own check**: refuses a relayed copy (msg.from); needs a race on the phone in its count or run phase
- **Who starts it**: the system (on an accepted move that touches the next flag; never for the last, which is race_end)
- **What the phone does**: shows (the flag marked touched, a sound)
- **Id it echoes**: none
- **Fields**:
  - i: the worker's own (the flag touched)
  - of: the worker's own (the count of flags; the phone does not read it)
- **Absent, and a bad value**: i not a number, or not past the flags already marked -> ignored

#### `race_end` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2353 direct -> src/game/race.js:135 onRaceEnd
- **Sent from**: server/src/race.js:181 _raceEnd (the finish; err 'left' / 'late' / 'early' from race.js:152 _raceOnMove) ; server/src/race.js:125 (a refused start: err 'off' / 'where' / 'quest' / 'soon' / 'far')
- **Envelope, and to whom**: alone; to the racer only
- **The phone's own check**: refuses a relayed copy (msg.from); nothing else checked
- **Who starts it**: the system (answering race_start with a refusal; or on the accepted move that ends the race)
- **What the phone does**: ends the race on the phone (the result card, Lil Bro's line and a sound; a lost race counted in the phone's own tally)
- **Id it echoes**: none
- **Fields**: won, ms, lilMs, err: the worker's own
- **Absent, and a bad value**: no payload -> read as {}: a loss with no err, counted as a race lost; an err the phone does not know -> the 'denied' sound only
- **Notes**: the quest credit of a win is the worker's (race.js:185) and reaches the phone on player_state, not on this

#### `ride_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2349 direct -> src/game/ride.js:96 rideApply
- **Sent from**: server/src/ride.js:91 _rideSend (from ride.js:110 _handleRide and ride.js:143 _rideEnd: combat.js:494 a hit, duel.js:88 a duel, index.js:3378 a death, movement.js:561 the edge)
- **Envelope, and to whom**: alone; to the rider only
- **The phone's own check**: refuses a relayed copy (msg.from); needs a payload
- **Who starts it**: the system (answering ride; and on its own when the worker puts the rider off)
- **What the phone does**: sets the phone's copy of the ride (on or off, and why; a line on screen when put off)
- **Id it echoes**: none
- **Fields**:
  - on: the worker's own
  - why: the worker's own (null, asked, soon, where, busy, dead, off, edge, zone, hit, fight, duel)
- **Absent, and a bad value**: no payload -> ignored; on is read as a boolean (absent = off); a why the phone does not know -> no line (src/game/ride.js:163 rideOffLine)
- **Notes**: sent on every toggle, granted or refused | the others learn of the board from brd on the tick, never from this

#### `acc_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2324 direct -> src/game/accuracy.js:73 onAccState
- **Sent from**: server/src/accuracy.js:357 (_handleAccRequest)
- **Envelope, and to whom**: alone; to the asker only
- **The phone's own check**: refuses a relayed copy (msg.from); needs an object payload
- **Who starts it**: the system (answering acc_request)
- **What the phone does**: sets the phone's copy of its own accuracy (the Journey page's numbers)
- **Id it echoes**: none
- **Fields**:
  - w.melee / w.ranged / w.staff {s, h, rs, rh}: the worker's own record (the hits are the worker's count; the shots s and rs were the phone's own reports on track.data.ac, bounded by ACC.SHOTS_BURST and ACC.SHOTS_PER_S)
  - off: the worker's own (the switch thrown)
- **Absent, and a bad value**: no payload -> ignored; a missing weapon or number -> 0; hits clamped to shots on the phone
- **Notes**: a stat to look at: it pays and ranks nothing (accuracy.js:27-29)

#### `character_reset_done` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:1625 direct
- **Sent from**: server/src/persistence.js:580 (_resetCharacterData: the socket's character_reset, and POST /api/account/reset when that character is online, account.js:111)
- **Envelope, and to whom**: alone; to the restarted character's own socket, closed 4005 right after
- **The phone's own check**: none checked (no msg.from test: the type is privileged, so no relay carries it)
- **Who starts it**: the system (answering character_reset; or on the picker's HTTP restart of a character being played)
- **What the phone does**: ends the session (marks the reset so the 4005 close starts no reconnect, cancels the pending local save, removes bt_rpg bt_stats bt_codex bt_bestiary bt_materials bt_zones bt_resume from localStorage and the resume keys from sessionStorage, reloads the page)
- **Id it echoes**: none
- **Fields**: (none: the type alone)
- **Absent, and a bad value**: nothing to be absent
- **Notes**: the Login Key, the device id and the social keys stay on the phone | a phone that misses it reloads anyway after 8 s (SettingsPanel.jsx:214-219)

#### `character_reset_refused` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:1613 direct
- **Sent from**: server/src/persistence.js:428 (_handleCharacterReset, the fight lock)
- **Envelope, and to whom**: alone; to the asker only
- **The phone's own check**: none checked (no msg.from test)
- **Who starts it**: the system (answering character_reset during a fight with a player in No man's land)
- **What the phone does**: shows (the Settings screen says why and cancels its 8 s reload: the bt-reset-refused event, SettingsPanel.jsx:162)
- **Id it echoes**: none
- **Fields**:
  - reason: the worker's own ('fight')
  - message: the worker's own (a fixed sentence)
- **Absent, and a bad value**: no payload -> the phone's own sentence and reason 'fight'; a message that is not a string of 120 characters or fewer -> the phone's own sentence
- **Notes**: the HTTP restart refuses the same fight with its own answer (reason 'fight', account.js), not with this message

### 5.C2 dungeons, the Bro check, live switches (15)

#### `chain_score_recorded` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3879 direct
- **Sent from**: server/src/chainscore.js:230 _chainScoreCheckpoint (the send at 347)
- **Envelope, and to whom**: alone ; to the player whose milestone was written
- **The phone's own check**: needs msg.payload and payload.txHash, and a character on the page (S.rpg), else ignored
- **Who starts it**: the system (on a level-up that reaches a milestone, server/src/prog3.js:1380 _chainScoreOnLevelUp, once the chain has taken the write)
- **What the phone does**: shows ('ON-CHAIN Lv n'); sets the phone's copy of the receipt (S.rpg._chainScore, kept in localStorage: the Records page's link)
- **Id it echoes**: none
- **Fields**:
  - level, milestone, series, kills: the worker's own
  - txHash: the worker's own (the chain's)
  - explorer: the worker's own (a link built from CHAIN.explorer and txHash)
- **Absent, and a bad value**: no payload or no txHash: ignored
- **Notes**: sent only after chain_score:\<pid> is stored; a player who left meanwhile gets none (the record stands)

#### `bro_nonce` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:2173 processGameEvent -> src/networking/broWallet.js:57 _onBroNonce
- **Sent from**: server/src/broverify.js:111 _handleBroNonce
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: taken only while a verify is running on this phone (broWallet.js _pending), else ignored
- **Who starts it**: the system (answering bro_nonce)
- **What the phone does**: starts the wallet's step: asks the wallet for an account, has it sign `message` untouched, and sends bro_verify
- **Id it echoes**: none (the nonce inside `message` is the worker's own single-use challenge)
- **Fields**:
  - message: the worker's own (the text to sign: the game's name, the player's id, the chain id, the nonce)
  - chainId, contract, expiresAt: the worker's own (not read by the phone)
- **Absent, and a bad value**: no verify running: ignored; a wallet that refuses: the phone ends the verify itself and sends nothing
- **Notes**: the fields sit on the message itself (no `payload`); it has no direct case, so it reaches processGameEvent through the default

#### `bro_verify_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:2176 processGameEvent -> src/networking/broWallet.js:60 _onBroResult
- **Sent from**: server/src/broverify.js:129 _handleBroVerify (its reply, 131); server/src/broverify.js:190 _broVerifyWallet; server/src/broverify.js:243 _broRefresh (refresh: true, after a join's background re-read of a stale link)
- **Envelope, and to whom**: alone ; to the asker (a refresh: to the player whose link was read again)
- **The phone's own check**: none checked
- **Who starts it**: the system (answering bro_verify; or on a join, when a link older than RECHECK_MS has been read again)
- **What the phone does**: ends the phone's running verify (its result or its reason's text); sets the phone's copy of the worn Bro and the count (S.rpg._bro, _broN) when ok; the badge others see comes from the tick
- **Id it echoes**: none
- **Fields**:
  - ok, reason: the worker's own (nonce_expired, bad_token_id, bad_signature, slow_down, chain_unreachable, not_owner, no_such_token, recover_failed, not_verified)
  - tokenId, address, count: the worker's own (the chain's answer)
  - refresh: the worker's own (marks a background re-read: not this verify's answer)
- **Absent, and a bad value**: no verify running: only the copy of the Bro and count is set; an unknown reason is shown as its raw string; ok with no count: the count left as it was
- **Notes**: the fields sit on the message itself (no `payload`); `address` is the proven wallet, sent to its own player only

#### `dungeon_started` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:866 processGameEvent
- **Sent from**: server/src/dungeon.js:375 _dungeonSend (the starter); server/src/dungeon.js:425 _dungeonSend (each party member pulled)
- **Envelope, and to whom**: alone ; to the starter, and to each party member their leader's start pulls
- **The phone's own check**: needs payload.zone; nothing else checked (the phone does not ask whether it asked: the party pull relies on that)
- **Who starts it**: the system (answering dungeon_start: the sender's own, or their party leader's)
- **What the phone does**: starts a phase (in a dungeon): builds the arena, changes zone to payload.zone and sends a move into it at once (a Wheel dungeon first loads its land's looks behind the loading screen, 8 s at most); speaks (a Workshop run's name is its owner's words, shown to a pulled member)
- **Id it echoes**: none
- **Fields**:
  - zone: the worker's own (the run's id)
  - cfg: the worker's own for a mouth (home, levels, partySize...); for a Workshop run an echo of the owner's config as clamped, its name words (the run owner's; 24 characters, not cleaned), its terrain not read
  - wave: the worker's own (always 1)
  - back: the worker's own (the way out; a Wheel run only)
- **Absent, and a bad value**: no payload or no zone: ignored; no cfg: a 25x20 'Dungeon' of 3 waves; cfg.home not one of the phone's lands: taken as a Workshop run; home with no back: entered at once, no loading screen
- **Notes**: the worker holds the pass for PASS_MS (zonejudge.js); a phone that died or changed zone while loading does not enter, and the worker sweeps the empty run

#### `dungeon_wave` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1048 processGameEvent
- **Sent from**: server/src/dungeon.js:1026 _dungeonSend
- **Envelope, and to whom**: alone ; to each player alive and connected in the run's zone (server/src/dungeon.js:269 _dungeonZonePlayers)
- **The phone's own check**: payload.zone must be the phone's own run (S._serverDungeon), else ignored
- **Who starts it**: the system (on a wave cleared, in the tick)
- **What the phone does**: shows (the 'Wave n/total' popup, a shake, a sound); sets the phone's copy of the wave number
- **Id it echoes**: none
- **Fields**: zone, wave, total: the worker's own
- **Absent, and a bad value**: no payload or another zone: ignored; no wave: 1; no total: the phone's own count
- **Notes**: the new wave's monsters come just before it, on zone_state (v2) or zone_monsters (v1)

#### `dungeon_boss` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1059 processGameEvent
- **Sent from**: server/src/dungeon.js:1032 _dungeonSend
- **Envelope, and to whom**: alone ; to each player alive and connected in the run's zone
- **The phone's own check**: payload.zone must be the phone's own run, else ignored
- **Who starts it**: the system (on the last wave cleared of a run with a boss, in the tick)
- **What the phone does**: shows ('BOSS FIGHT!', a shake, a sound); sets the phone's flag that the boss is out
- **Id it echoes**: none
- **Fields**: zone: the worker's own
- **Absent, and a bad value**: no payload or another zone: ignored
- **Notes**: the boss itself comes just before it, on zone_state / zone_monsters

#### `dungeon_complete` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1068 processGameEvent
- **Sent from**: server/src/dungeon.js:932 _dungeonSend
- **Envelope, and to whom**: alone ; to each player alive and connected in the run's zone at the last kill
- **The phone's own check**: payload.zone must be the phone's own run, else ignored
- **Who starts it**: the system (on the last wave or the boss cleared: server/src/dungeon.js:887 _dungeonComplete, which pays and saves first)
- **What the phone does**: shows (the cleared popups; the clear's card with the boss's chest and the weapons' XP); starts a phase (the 30 s leave clock, then the phone walks out: a Workshop run to farm_home, a Wheel run to its mouth); sets the page's own counters (_compStats dungeonsCleared and totalGoldEarned)
- **Id it echoes**: none
- **Fields**:
  - zone, gold, xp, boss: the worker's own
  - chest {gold, items[{key, n}]}: the worker's own (a Wheel run's boss chest, server/src/dungeonreward.js)
  - skillXp {sword, bow, staff}: the worker's own
- **Absent, and a bad value**: no payload or another zone: ignored; no gold: '+0G'; no chest or skillXp: the card without them
- **Notes**: display only: the gold, the bag and the XP are saved before it goes and ride the player_state that follows

#### `dungeon_error` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1159 processGameEvent
- **Sent from**: server/src/dungeon.js:188 _dungeonSend (every refusal of _handleDungeonStart and _wheelDungeonConfig); server/src/fightlock.js:194 _dungeonError (the router's fight lock)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering dungeon_start)
- **What the phone does**: shows (the message over the player's head, a sound)
- **Id it echoes**: none
- **Fields**:
  - code: the worker's own (disabled, not-now, already-running, room-full, closed, not-here; the phone does not read it)
  - message: the worker's own (fixed text)
- **Absent, and a bad value**: no payload or no message: 'Dungeon unavailable'

#### `dungeon_boss_ability` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1723 processGameEvent
- **Sent from**: server/src/dungeon.js:577 _dungeonBossAbilityEvent (called at server/src/dungeon.js:674 enrage, 806 execute, 841 telegraph; server/src/slimeboss.js:163, 198, 262 the giant slime's split)
- **Envelope, and to whom**: alone ; to each player alive and connected in the run's zone
- **The phone's own check**: payload.zone must be the phone's own run, and payload.ability one of the phone's seven (slam, charge, summon, sweep, enrage, siphon, split), else ignored
- **Who starts it**: the system (the boss's script, in the tick)
- **What the phone does**: shows (a warning sound at the telegraph; a ring, a shake and a sound at the execute; the slime's swell, shockwave and its new slimes flown out; a red tint on an enraged boss): display only, the damage rides monster_attack and player_state
- **Id it echoes**: none
- **Fields**:
  - zone, monsterId, ability, phase (telegraph, execute, pop), x, y: the worker's own
  - by ability, all the worker's own: ms and range (telegraph), range or count or heal (execute), stacks and pct (enrage), ms, scale, stage, of, radius, hit, count, ids[] (split)
- **Absent, and a bad value**: no payload, another zone or an unknown ability: ignored; no x or y: the player's own place; ms, scale and radius clamped by the phone (120..4000 ms, 1..2, 10..600 px); ids read up to 24 (40 at the pop)

#### `spar_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2533 direct -> src/game/spar.js:44 applySparState
- **Sent from**: server/src/spar.js:347 _sparTell
- **Envelope, and to whom**: alone ; to the player whose clones they are
- **The phone's own check**: none checked (a payload that is not an object is ignored)
- **Who starts it**: the owner (POST /api/admin/dev/spar, server/src/devtools.js:776; after that the system, on each knockout, a clone's return, the player leaving, the spar switch thrown)
- **What the phone does**: sets the phone's copy of its sparring clones (ids it may aim at, the skill, the score); shows a line in the chat feed and a popup on a knockout
- **Id it echoes**: none
- **Fields**:
  - skill, rounds {you, clones}, clones[{id, weapon, name, hp, maxHp, down}]: the worker's own (a clone's name is a fixed one of three)
  - note (spawned, set, down, ko, up, left, off): the worker's own
  - who: the worker's own (a clone's name; the phone cuts it to 40 characters)
- **Absent, and a bad value**: no payload: ignored; no clones: an empty list, and a lock on a clone that is gone is dropped; an unknown note: no line
- **Notes**: the worker still refuses every hit on a player who is not the sender's own clone (_sparPair); memory only

#### `server_announce` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:2145 processGameEvent
- **Sent from**: server/src/liveops.js:325 _announce (broadcastAll); server/src/join.js:1686 server_announce (the sticky one, with motd: true)
- **Envelope, and to whom**: alone ; to everyone in the room at once; a sticky one again to each player as they join
- **The phone's own check**: none checked
- **Who starts it**: the owner (POST /api/admin/announce, server/src/liveops.js:391; a sticky one is stored as `motd` and sent by the system at every join until DELETE /api/admin/announce)
- **What the phone does**: shows (a banner over the player and a line in the chat log, with a megaphone and no name, and a chime)
- **Id it echoes**: none
- **Fields**:
  - text: the owner's own words (trimmed, first LIVEOPS.ANNOUNCE_MAX_LEN characters, not cleaned further; the banner cuts it to 60)
  - ts: the worker's own
  - motd: the worker's own (true on the join's copy; the phone does not read it)
- **Absent, and a bad value**: no payload or an empty text: ignored
- **Notes**: sent alone and never through eventBuffer, so it reaches a quiet room; it has no direct case, so it reaches processGameEvent through the default

#### `move_path` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2054 direct
- **Sent from**: server/src/movepath.js:112 _movePathFlagChanged
- **Envelope, and to whom**: alone ; to everyone in the room
- **The phone's own check**: none checked
- **Who starts it**: the owner (the live flag movepath or pathall set or cleared: POST or DELETE /api/admin/flags, server/src/liveops.js:341, 374)
- **What the phone does**: sets the phone's copy of two caps (S._serverCaps.movepath, pathall): its next batch of moves goes on the path, or off it
- **Id it echoes**: none
- **Fields**:
  - on: the worker's own (the glide's switch)
  - all: the worker's own (every phone on the path)
- **Absent, and a bad value**: a missing field reads as false (the path off)
- **Notes**: the fields sit on the message itself (no `payload`); a phone that joins later reads the same from state_sync's caps

#### `client_off` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2048 direct
- **Sent from**: server/src/clientoff.js:33 _clientOffChanged
- **Envelope, and to whom**: alone ; to everyone in the room
- **The phone's own check**: none checked
- **Who starts it**: the owner (a live flag off_\<name> set or cleared: POST or DELETE /api/admin/flags)
- **What the phone does**: sets the phone's copy of the memory savers turned off (S._serverCaps.clientoff, and setClientOff): the live ones follow at once, the rest at the next load
- **Id it echoes**: none
- **Fields**: off: the worker's own (a sorted comma list of the off_ flags that are true; the worker reads none of the names)
- **Absent, and a bad value**: `off` not a string: read as '' (every saver on)
- **Notes**: the fields sit on the message itself (no `payload`); the saver names are the phone's (src/game/clientOff.js)

#### `free_swing` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2062 direct
- **Sent from**: server/src/freeswing.js:127 _freeSwingFlagChanged
- **Envelope, and to whom**: alone ; to everyone in the room
- **The phone's own check**: none checked
- **Who starts it**: the owner (the live flag freeswing set or cleared: POST or DELETE /api/admin/flags)
- **What the phone does**: sets the phone's copy of the cap (S._serverCaps.freeSwing 1 or 0): a sword on the trial goes back to the untried swipes at once, or comes back to it
- **Id it echoes**: none
- **Fields**: on: the worker's own
- **Absent, and a bad value**: a missing `on` reads as 0 (off)
- **Notes**: the fields sit on the message itself (no `payload`); the worker counts a session on the trial only if its own join asked (_freeSwingFor)

#### `draw_gather` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2073 direct
- **Sent from**: server/src/drawgather.js:153 _drawGatherFlagChanged
- **Envelope, and to whom**: alone ; to everyone in the room
- **The phone's own check**: none checked
- **Who starts it**: the owner (the live flag bowdraw or staffgather set or cleared: POST or DELETE /api/admin/flags)
- **What the phone does**: sets the phone's copy of two caps (S._serverCaps.bowDraw, staffGather): a phone already playing goes back to the flick and the held staff at once, or takes the draw and gather up
- **Id it echoes**: none
- **Fields**: bow, staff: the worker's own (1 or 0, the two caps as a join would advertise them now)
- **Absent, and a bad value**: a missing field reads as off
- **Notes**: the fields sit on the message itself (no `payload`)

### 5.D1 combat, the phone's claims (9)

#### `nml_skull` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2084 direct -> src/game/noMansLand.js:235 applyNmlSkull
- **Sent from**: server/src/nomansland.js:527 _nmlSend (called at server/src/nomansland.js:488, server/src/nomansland.js:518, server/src/nomansland.js:840 and server/src/join.js:1713)
- **Envelope, and to whom**: alone ; to the player it is about
- **The phone's own check**: needs a payload; msg.from is not checked
- **Who starts it**: the system (on a landed hit or a chosen attack under No man's land's rule, a skull running out, a red skull's death, a join with a skull running)
- **What the phone does**: sets the phone's copy of your own skulls (ms left, and who gave the white one); joins a fight with those who chose to attack you (nmlAsk.js nmlJoinFromBys); shows the red skull's warning line and plays its sound
- **Id it echoes**: none
- **Fields**:
  - red, white (ms left)
  - by (a player id)
  - bys (a list of [player id, ms left]): all the worker's own
- **Absent, and a bad value**: no payload: ignored. red and white are coerced to numbers, 0 at least. A by that is not a string of at most 64: none. bys: 16 entries at most, a malformed one skipped, each ms clamped to white.

#### `nml_loss` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2092 direct -> src/game/noMansLand.js:300 applyNmlLoss
- **Sent from**: server/src/nomansland.js:827 (in _nmlOnDeath)
- **Envelope, and to whom**: alone ; to the player who died
- **The phone's own check**: needs a payload; msg.from is not checked
- **Who starts it**: the system (on a death under No man's land's rule)
- **What the phone does**: sets the phone's copy of what the death took (the spare weapons cleared, each named spare piece taken out, a red skull's worn slots, the gold to 0) and saves it locally; shows the line that says what went and marks the death card; speaks (it carries the killer's name)
- **Id it echoes**: none
- **Fields**:
  - by: words (the killer's display name, session.name as join.js cleaned it, or 'a player'; null with no killer)
  - red, gear (a list of {field, gid or sig}), coins, named, keepWorn: the worker's own
  - weapons, worn, bag: the worker's own, not read by the phone
- **Absent, and a bad value**: no payload: ignored. No named (an older worker): a red skull's lists are cleared whole. gear not a list: no piece taken out.
- **Notes**: the worker has already taken everything and paid the killer by mail (opId nmlloot:\<victim>:\<time>:\<n>); this only clears the phone's own copies so they are not offered again at the next join.

#### `nml_lock` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2109 direct -> src/game/noMansLand.js:99 applyNmlLock
- **Sent from**: server/src/nomansland.js:944 _nmlLockSend (called from server/src/nomansland.js:911 _nmlLockSet, server/src/nomansland.js:932 _nmlLockLift and server/src/nomansland.js:968 _nmlLockOnJoin)
- **Envelope, and to whom**: alone ; to each player of the pair
- **The phone's own check**: needs a payload that is an object; msg.from is not checked
- **Who starts it**: the system (on a red skull's death by a player, a lock lifted, a join by either of a locked pair)
- **What the phone does**: sets the phone's copy of who you may not attack (out) and who may not attack you (in), with the time left
- **Id it echoes**: none
- **Fields**: out, in (lists of [player id, ms left]): the worker's own
- **Absent, and a bad value**: no payload: ignored. A list that is not an array: empty. 16 entries at most; an id that is not a string of at most 64 is skipped; ms clamped 0 to 30 minutes.
- **Notes**: at a join it is not sent when there is no lock either way.

#### `nml_lock_ask` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2114 direct -> src/game/noMansLand.js:131 nmlLockAskShow
- **Sent from**: server/src/nomansland.js:994 (in _handleNmlLockAsk)
- **Envelope, and to whom**: alone ; to the named player (the one the asker is locked out from)
- **The phone's own check**: needs a payload; msg.from is not checked
- **Who starts it**: the system (passing on another player's nml_lock_ask, once the worker has judged it)
- **What the phone does**: shows (a "?" over the asker's head for NML_LOCK_ASK_SHOW_MS); speaks (a player's ask for a rematch, with no words)
- **Id it echoes**: none
- **Fields**: from: the worker's own (the asker's session id)
- **Absent, and a bad value**: no payload, or a from that is not a string of 1 to 64: ignored. The phone keeps 16 such marks at most.

#### `nml_take` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2120 direct -> src/game/noMansLand.js:336 applyNmlTake
- **Sent from**: server/src/nomansland.js:1035 _nmlTellKiller (called at server/src/index.js:3471, among the death's hooks)
- **Envelope, and to whom**: alone ; to the killer
- **The phone's own check**: needs a payload; msg.from is not checked
- **Who starts it**: the system (on a kill under No man's land's rule, after the pile is down)
- **What the phone does**: shows (one line of what the kill took, a LOOT popup and a sound); speaks (it carries the victim's name)
- **Id it echoes**: none
- **Fields**:
  - from: words (the victim's display name, session.name as join.js cleaned it, or 'a player')
  - items, coins, weapons, gear (counts): the worker's own
  - lootId, worn: the worker's own, not read by the phone
- **Absent, and a bad value**: no payload: ignored. No from: 'a player'; it is cut to 40 characters. Numbers are floored, 0 at least.
- **Notes**: display only: the gold and gear are already the killer's by mail, and the pile is on the ground with its own loot_drop.

#### `ability_windup` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1327 processGameEvent
- **Sent from**: server/src/abilities.js:632 (in _handleAbility, a kind with a windup: whirl)
- **Envelope, and to whom**: in the tick's events ; to near (eventplace.js: placed where the room has the caster, and to the caster)
- **The phone's own check**: none checked on the frame; the phone ignores a caster it does not hold as a peer in its own zone (so its own), and a zone that is not its current one
- **Who starts it**: the system (answering ability, a windup kind)
- **What the phone does**: shows (a peer's whirlwind ring over them for the windup, and its sound by distance)
- **Id it echoes**: none
- **Fields**:
  - playerId: the worker's own (the caster's session id)
  - kind: echo (table-checked)
  - zone, ms, radius: the worker's own
- **Absent, and a bad value**: no playerId, or not a peer in the zone: nothing. ms is clamped 0 to 5000; radius 0 to 600, 240 when absent.
- **Notes**: not sent with the live flag whirlWindup false (the whirl strikes on the press).

#### `ability_rejected` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3904 direct
- **Sent from**: server/src/index.js:3253 (in _handleAbilityUse), server/src/abilities.js:576 (in _handleAbility), server/src/abilities.js:674 (in _abilityResolve), server/src/burst.js:162 (in _handleElementBurst)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: needs a payload and a local player; msg.from is not checked
- **Who starts it**: the system (answering ability_use, ability or element_burst)
- **What the phone does**: shows (a popup worded by src/data/abilities.js:225 abilityRejectText); sets the phone's copy of an ability's cooldown on reason cooldown, clears a whirlwind's ring that never armed, and gives the ordinary swing back. The pools ride player_state, never this
- **Id it echoes**: none
- **Fields**:
  - from ability_use: type (echo, one of the four)
  - pool, cost, have: the worker's own ; from ability: kind (echo, table-checked)
  - reason, ms, need, have, cost, spent: the worker's own ; from element_burst: type ('burst'), pool ('mana'), reason, cost, have: the worker's own
- **Absent, and a bad value**: no payload, or no local player: ignored. A reason the phone has no words for, or none: the popup reads "\<name> failed", "Ability failed" with no kind.
- **Notes**: three shapes share the type. Reasons: locked, no-shield, no-weapon, staggered, cooldown, stamina, whiff (ability); no_player, dead, no_weapon, no_element, mana, cooldown, staggered (the burst); none at all (ability_use).

#### `element_nova` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1250 processGameEvent
- **Sent from**: server/src/burst.js:288 (in _handleElementBurst)
- **Envelope, and to whom**: in the tick's events ; to near (eventplace.js: placed at the nova's x, y, and to the caster)
- **The phone's own check**: none checked on the frame; needs a payload and a monster list; a zone that is not the phone's current one is ignored; the element must be a key of the phone's ELEMENTS table
- **Who starts it**: the system (answering element_burst)
- **What the phone does**: shows (the ring, particles, a shake for the caster, the sound); sets the phone's copy of the element's status on each monster named (drawing only: the local status tick takes no health in a server zone)
- **Id it echoes**: none
- **Fields**: id (the caster), zone, x, y, element, status, r, targets: all the worker's own
- **Absent, and a bad value**: an unknown element: nothing drawn. No r: 70. targets not a list, or a status the phone's table lacks: the ring alone.

#### `arrow_boom` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1226 processGameEvent
- **Sent from**: server/src/arrowblast.js:221 (in _handleArrowBlast)
- **Envelope, and to whom**: in the tick's events ; to near (eventplace.js: placed at the blast's x, y, and to the shooter)
- **The phone's own check**: none checked on the frame; needs a payload; a zone that is not the phone's current one is ignored; x and y must be numbers
- **Who starts it**: the system (answering arrow_blast)
- **What the phone does**: shows (the blast's ring, and its sound: in full for the shooter, by distance for the rest)
- **Id it echoes**: none
- **Fields**:
  - id: the worker's own (the shooter's session id)
  - zone: echo (checked against the worker's own)
  - x, y: echo (the request's point, after the reach bound)
  - r, targets: the worker's own
- **Absent, and a bad value**: no payload, or x or y not a number: nothing. The phone keeps 8 blasts waiting at most.
- **Notes**: never sent while the live flag bowvolley is on (the default): arrow_blast is refused as retired.

### 5.D2 combat, the worker's events, and loot (17)

#### `item_drop_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2217 direct -> src/game/itemDrop.js:87 applyItemDropResult
- **Sent from**: server/src/itemdrop.js:96 (in _dropReply)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (no check for a relayed copy)
- **Who starts it**: the system (answering item_drop)
- **What the phone does**: shows the drop's sound, or the refusal in words over the head; notes the last drop on the phone (S._dropLast)
- **Id it echoes**: none (lootId names the new pile)
- **Fields**:
  - ok, reason, lootId: the worker's own
  - key (cut to KEY_MAX), qty (the count really dropped): echo
- **Absent, and a bad value**: no payload: ignored; a reason the phone does not know: "You can't drop that right now"; 'slow' says nothing

#### `combat_credit` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3589 direct
- **Sent from**: server/src/combat.js:2194 (in _resolveMonsterKill: one to each XP recipient of the kill)
- **Envelope, and to whom**: alone ; to each XP recipient of the kill
- **The phone's own check**: needs a payload and a loaded character; no check for a relayed copy
- **Who starts it**: the system (on a kill the player helped with)
- **What the phone does**: shows the level-up banner when leveled (the level itself rides player_state); sets the phone's copy of the pet's XP (pet) and of the codex's count (cx); notes the kill's roll and drop for the drop lines (roll, rh)
- **Id it echoes**: none
- **Fields**:
  - all the worker's own: monsterId, zone
  - xpAmt (the XP paid, after the xp_mult flag), leveled, levelsGained, newLevel
  - pet {id, lv, xp, gain, leveled, cap}
  - cx {k, n, n2}
  - roll (the kill's one roll), rh (the drop it landed on, when it is this player's to have)
- **Absent, and a bad value**: no payload: ignored; pet, cx, roll and rh are each optional

#### `loot_credit` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2027 direct -> src/networking/wsClient.js:4292 _applyLootCredit
- **Sent from**: server/src/index.js:4799 (in _handleLootPickup: a kill pile) ; server/src/index.js:4638 (in _handleLootPickup: a death pile or a drop) ; server/src/revealbag.js:415 (in _revealBagDev: the owner's test lever)
- **Envelope, and to whom**: alone ; to the picker
- **The phone's own check**: needs a payload and a loaded character; no check for a relayed copy
- **Who starts it**: the system (answering loot_pickup; and the owner's POST /api/admin/dev/revealbag)
- **What the phone does**: shows the pickup (popups, sounds, the reveal ceremony); sets the phone's copy of the pile to collected; ADDS the armour pieces to the phone's own armour bag (armorStash or legsStash, saved to localStorage); counts a remnant in its local skull tally, the gold in its local totalGoldEarned and a pet's fetch in _questFlags.petLootCount; freezes the player 500 ms (not for viaPet); gold, shard, gem, the weapon and a death pile's items are NOT applied from it (player_state carries them)
- **Id it echoes**: lootId (the request's pile id sent back; an armour piece's gid stops a second copy on a repeat)
- **Fields**:
  - lootId, zone, viaPet: echo
  - coins (this player's share), skull, shard, gem: the worker's own
  - armor [{name, mat, slot, tierMult, gid, quality or unrevealed, prov}]: the worker's own (the minted pieces; the grade withheld while unrevealed)
  - weapon (the blade; its grade withheld while unrevealed), weaponStashed, weaponSoldFor: the worker's own
  - reveals (the ladders to play): the worker's own
  - isDeathDrop, items [{key, qty}]: the worker's own
- **Absent, and a bad value**: no payload: ignored; an armour piece already held (by gid, else by name and tierMult) is skipped; a piece's name absent 'Armor', tierMult absent 1, mat cut to 16; prov kept only when it is 'minted'

#### `lifesteal_credit` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2543 direct
- **Sent from**: server/src/combat.js:2223 (in _resolveMonsterKill: to the killer on every kill, a refund of 0 included) ; server/src/pvpextras.js:618 (in _pvpKillHeal: the kill of a player)
- **Envelope, and to whom**: alone ; to the killer
- **The phone's own check**: none checked (no check for a relayed copy)
- **Who starts it**: the system (on a kill)
- **What the phone does**: shows "+N HP" when refund is above 0 (the health itself rides player_state)
- **Id it echoes**: none
- **Fields**:
  - all the worker's own: refund
  - playerId, monsterId or victimId, reason, slot, activeSlot (diagnostics: read by no phone)
- **Absent, and a bad value**: no payload, or a refund of 0: nothing shown

#### `loot_pickup_rejected` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2561 direct
- **Sent from**: server/src/index.js:4531 (in _handleLootPickup: its reject helper)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: needs a payload and a player on the phone; no check for a relayed copy
- **Who starts it**: the system (answering loot_pickup)
- **What the phone does**: sets the phone's copy of the pile and of its ask: a permanent no (no-pile, already-claimed, not-recipient, wrong-zone) drops the pile from the phone; out-of-range re-arms the ask in 300 ms (eight fast tries); dead, disconnected, no-ps and no-loot-zone re-arm it in 1 s; a death pile's first not-recipient gets one more ask after its minute; shows nothing (a console line)
- **Id it echoes**: lootId (the request's pile id sent back)
- **Fields**:
  - lootId, zone, viaPet: echo
  - reason: the worker's own
  - mySession, recipients (with not-recipient), psZ (with wrong-zone), dist, max (with out-of-range): the worker's own, read only by the console line
- **Absent, and a bad value**: no payload: ignored; no lootId (a 'bad-payload'): nothing re-armed; a reason the phone does not know (bad-payload, no-pet): nothing

#### `monster_attack` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:3258 processGameEvent
- **Sent from**: server/src/hits.js:287 (in _monsterHit: a blow that landed, was dodged or met the zone-entry grace) ; server/src/hits.js:355 (in _hitStopped: a blocked or parried blow)
- **Envelope, and to whom**: in the tick's events ; to the target (targetId) and, by eventplace.js ROOM_PLACED (m: monsterId, xy: attackerX/attackerY), the phones within EVENT_PLACE.R of the monster in the Wheel, or in its zone elsewhere
- **The phone's own check**: none checked on the frame; for its own player the phone drops the event when it has no such monster and the event names no ability, or when the attacker is over 160 px away (src/networking/gameEvents.js:3440 and 3456); an event about another player is only drawn
- **Who starts it**: the system (on a monster's hit on a player: every way in hits.js MONSTER_HITS)
- **What the phone does**: shows (the number, blood, shake, sounds, Blocked, Dodged); sets the phone's own state for the target: the in-combat clock, the element's status on its own player (chill, stuck, daze, slow...), a shove of its own player (kb), _questFlags.blocksLanded +1 on a block, its local Defense training and build use; health is NOT taken from it on a worker with monsters (player_state carries it; only the legacy local mode subtracts)
- **Id it echoes**: none
- **Fields**:
  - all the worker's own: monsterId, targetId, zone
  - dmg (the raw roll), dmgTaken, dodged, blocked, parried, staminaDrain
  - hp (the target's bar after the blow)
  - lastStand, secondWind
  - attackerX, attackerY
  - ability (the source's tag: firetrail, a cast, a tick)
  - elem, st, stMs, kb, kbMs, wd, fz, wb (the element's after-effects: monsterstatus.js; a slime blast's shove: telegraph.js _blastShove)
- **Absent, and a bad value**: no dmgTaken: the phone works a figure out itself (dmg, default 5, less its own defence); st not one of ELEM_STATUSES: no status; stMs clamped to MAX_ST_MS; kb that is not two finite numbers of length 1 to MAX_KB_PX: no shove; fz and wb clamped
- **Notes**: live flag eventplace false sends it to every phone

#### `monster_hit` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:2737 processGameEvent
- **Sent from**: server/src/combat.js:1708 (in _handleMonsterDamage: a player's hit; 1607 its element collision) ; server/src/index.js:3334 (in _applyMonsterDot: a status tick, a splash, a spark, a burst, a blast) ; server/src/abilities.js:974 (in _abilityStrikeMonster) ; server/src/hits.js:389 (in _legacyThornsReflect)
- **Envelope, and to whom**: in the tick's events ; to the attacker (attackerId) and, by eventplace.js ROOM_PLACED (m: monsterId), the phones within EVENT_PLACE.R of the monster in the Wheel, or in its zone elsewhere
- **The phone's own check**: none checked; nothing is drawn for a monster the phone does not have
- **Who starts it**: the system (answering monster_damage, ability, element_burst, arrow_blast; and on a status tick or thorns)
- **What the phone does**: sets the phone's copy of the monster's health (hpPct times its maxHp); shows the number, the flash, debris and sound; for your own hit stamps the phone's dealt-damage clock and the monster's "hit by me"; on up sets _questFlags.usedEffectiveness
- **Id it echoes**: none
- **Fields**:
  - all the worker's own: monsterId, zone, attackerId
  - dmg (the credited amount), rawDmg (the roll, only on an overkill), isCrit, hpPct
  - slot (the weapon the worker resolved), ability, status, collision
  - thorns, burst, splash, spark (the monster it leapt from), up, pw, pf, gs (display marks)
- **Absent, and a bad value**: hpPct is taken as it is (no guard: absent, the phone's copy of the health would be NaN); an unknown monsterId draws nothing

#### `monster_kill` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:3049 processGameEvent
- **Sent from**: server/src/combat.js:1995 (in _resolveMonsterKill)
- **Envelope, and to whom**: in the tick's events ; to everyone in the room (not placed by eventplace.js: a phone in the Wheel keeps a copy of every monster)
- **The phone's own check**: none checked; the phone acts as a recipient only when recipients holds its own id
- **Who starts it**: the system (on a monster's death, from any hit that ends it)
- **What the phone does**: sets the phone's copy of the monster to dead; shows the death and, for a recipient, the "+XP" it works out itself (xp times its share); for a recipient also changes the phone's own record: _compStats.monstersKilled +1, and its build progress fed with that XP (distributeKillXpToBuild, which can send build_point_earned); on a worker with no monsters or no loot the phone also levels up and makes the pile itself (the legacy local mode)
- **Id it echoes**: none
- **Fields**:
  - all the worker's own: monsterId, zone, killerId
  - xp, gold (the monster's base, before the xp_mult flag), level, arch, element, x, y
  - recipients, goldRecipients (player ids)
  - shares (each recipient's fraction of the kill)
- **Absent, and a bad value**: no recipients: nobody is a recipient; no shares entry for me: my share read as 1; an unknown monsterId: no death drawn, the recipient's XP side still runs
- **Notes**: the phone's monstersKilled is its own tally (server/src/combat.js:2166-2173 keeps svKills apart from it for that reason)

#### `pvp_hit` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4116 processGameEvent
- **Sent from**: server/src/combat.js:2707 (in _resolvePvPAttack: the event built at 2653) ; server/src/pvpextras.js:540 (in _strikePlayer: an ability, a collision, a splash or a tick on a player)
- **Envelope, and to whom**: in the tick's events ; to everyone in the room (not placed by eventplace.js)
- **The phone's own check**: none checked; the phone takes the target's part only when target is its own id, the attacker's when attacker is; an onlooker draws it only within PVP_ONLOOK_R of the target
- **Who starts it**: the system (answering player_attack, and the hits a player's ability, burst, lunge, splash or status makes on a player)
- **What the phone does**: shows the number and sounds; sets the phone's copy of the target's health bar (hp, maxHp); for the target: the in-combat clock, the element's status and a shove on its own player, _questFlags.blocksLanded on a block, the attacker joined to its No man's land fight (nmlJoinFight), and it SENDS the relay pvp_confirmed back (src/networking/gameEvents.js:4462); for both sides stamps the phone's fight clock (the eating rule's, fightFood.js); speaks (carries the attacker's name)
- **Id it echoes**: none
- **Fields**:
  - attacker, target: the worker's own (player ids)
  - attackerName: words (the attacker's display name as the worker holds it: session.name, cleaned at the join)
  - slot, ability, collision, elem, pw: the worker's own
  - dmgBase, dmgTaken, isCrit, blocked, dodged, parried, staminaDrain, secondWind, lastStand: the worker's own
  - died, hp, maxHp (the target's): the worker's own
  - st, stMs, kb, wd, mult, stacks (after-effects): the worker's own
  - ts, rewindTicks: the worker's own, read by no phone
- **Absent, and a bad value**: no dmgTaken: the target's phone works a figure out itself from dmgBase (default 10) and its own defence; no died: the phone guesses from its own health; no attackerName: '???'

#### `monster_projectile` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:2577 processGameEvent
- **Sent from**: server/src/telegraph.js:701 (in _resolveBasicWindup: a snowman's ball or a slime's shot leaves the hand)
- **Envelope, and to whom**: in the tick's events ; by eventplace.js ROOM_PLACED (m: monsterId, xy: x/y) to the phones within EVENT_PLACE.R in the Wheel, or in the zone elsewhere
- **The phone's own check**: the phone's own check: zone must be the phone's own zone
- **Who starts it**: the system (on a monster's throw)
- **What the phone does**: shows (a display-only ball from x,y to tx,ty over travelMs, cut short at a rock; the throw's sound); it carries no damage (monster_attack does)
- **Id it echoes**: none
- **Fields**: all the worker's own: monsterId, kind (snowball or slime), zone, x, y, tx, ty, travelMs
- **Absent, and a bad value**: another zone: ignored; travelMs absent: 900; kind absent: slime; x, y, tx, ty absent read as 0

#### `monster_ability` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1353 processGameEvent -> src/networking/monsterMoveEvents.js:41 monsterMoveEvent
- **Sent from**: server/src/telegraph.js:532 _monsterAbilityEvent (the kit's telegraph and execute; called from telegraph.js and monstermoves.js) ; server/src/telegraph.js:753 (a slime's burst: swell; 789 its execute) ; server/src/telegraph.js:832 (the burrow: dig; 968 pile; 1004 emerge)
- **Envelope, and to whom**: in the tick's events ; to the target when one is named (targetId) and, by eventplace.js ROOM_PLACED (m: monsterId, xy: x/y), the phones within EVENT_PLACE.R in the Wheel, or in the zone elsewhere
- **The phone's own check**: the phone's own check: an event for a zone that is not the phone's own is ignored
- **Who starts it**: the system (on a monster's wind-up, cast, burst or burrow)
- **What the phone does**: shows (the warning ring, the label, shake, sounds, MISS); sets the phone's copy of the monster: its wind-up clock, a slime's swell, the burrow's phase and "cannot be hit" while it is a pile, a daze from a bonk; it carries no damage (monster_attack does)
- **Id it echoes**: none
- **Fields**:
  - all the worker's own: zone, monsterId, ability, phase, x, y
  - ms, radius, scale, ax, ay, hit
  - bonk, dazeMs, px, py, targetId (a burrow's emerge)
  - the tiers' moves' own fields (monstermoves.js, read by monsterMoveEvent)
- **Absent, and a bad value**: ms, radius, scale and dazeMs are each clamped on the phone to a range, with a default; an ability the phone has no label for: nothing drawn; no x/y: drawn at the phone's own player

#### `fire_trail` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:2531 processGameEvent
- **Sent from**: server/src/firetrail.js:168 (in _maybeDropFirePatch: a new patch) ; server/src/firetrail.js:275 (in _sendFireTrailSnapshot: the zone's live patches to a phone that just arrived, called from server/src/movement.js:900)
- **Envelope, and to whom**: both ; a new patch in the tick's events, by eventplace.js ROOM_PLACED (xy: x/y, m: monsterId) to the phones within EVENT_PLACE.R in the Wheel or in the zone elsewhere; the catch-up alone, to the one phone entering the zone
- **The phone's own check**: the phone's own check: zone must be the phone's own zone
- **Who starts it**: the system (on a fire goblin's chase; on a zone change for the catch-up)
- **What the phone does**: shows (a burning patch for ms, armed after arm; the phone keeps 80 at most); it carries no damage (monster_attack with ability firetrail does)
- **Id it echoes**: none
- **Fields**: all the worker's own: zone, monsterId, x, y, r, ms (its life, or what is left of it), arm
- **Absent, and a bad value**: another zone: ignored; ms clamped 200 to 15000 (absent 4000); arm clamped 0 to 2000; r absent 26

#### `parry` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1165 processGameEvent
- **Sent from**: server/src/index.js:2920 (in _applyParry: a monster's blow parried) ; server/src/pvpextras.js:282 (in _pvpParry: a player's blow parried)
- **Envelope, and to whom**: in the tick's events ; to the one who parried and the one staggered (targetId, attackerId) and, by eventplace.js ROOM_PLACED (xy: x/y, m: monsterId), the phones within EVENT_PLACE.R in the Wheel or in the zone elsewhere
- **The phone's own check**: none checked beyond a payload and a player on the phone
- **Who starts it**: the system (on a block inside the parry window, of a monster's blow or a player's)
- **What the phone does**: shows (PARRY! and a ring for the one who parried, a sound for a peer near by); for the attacker of a parried player blow starts a stagger on the phone (no swing, special, ability or burst for ms)
- **Id it echoes**: none
- **Fields**:
  - all the worker's own: zone, x, y
  - monsterId (a monster's blow)
  - targetId (who parried), attackerId (the player staggered), ms (the stagger, PARRY_STAGGER_MS)
- **Absent, and a bad value**: ms clamped 0 to 3000 on the phone, absent 1500; no x/y: the ring at the phone's own player

#### `monster_transform` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:2706 processGameEvent
- **Sent from**: server/src/index.js:2065 (in _tickMonsters: a variant changed by its first damage or at its mark, the mummy into a skeleton)
- **Envelope, and to whom**: in the tick's events ; to everyone in the room (not placed by eventplace.js: it is on no other wire, so a phone that missed it would draw the old form)
- **The phone's own check**: none checked; nothing happens for a monster the phone does not have; the zone is not checked
- **Who starts it**: the system (on a hit that crosses the variant's mark)
- **What the phone does**: sets the phone's copy of the monster: its archetype, type and speed become the new variant's; shows the change (the hold, the shed wrappings, a sound)
- **Id it echoes**: none
- **Fields**: all the worker's own: id (the monster), zone, fromVariant, toVariant
- **Absent, and a bad value**: no payload or an unknown id: nothing

#### `loot_drop` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:303 processGameEvent -> src/networking/wsClient.js:4199 _buildServerPile
- **Sent from**: server/src/combat.js:2037 (in _resolveMonsterKill: a kill's pile) ; server/src/index.js:4440 (in _spawnDeathPile) ; server/src/itemdrop.js:131 (in _handleItemDrop: to the dropper alone) ; server/src/itemdrop.js:208 (in _dropRevealDue: the room told at the drop's minute)
- **Envelope, and to whom**: both ; a kill's pile, a death pile and a drop's reveal in the tick's events, to everyone in the room (not placed by eventplace.js); a fresh drop alone, to its dropper only (and the dev lever's re-send, server/src/itemdrop.js:230)
- **The phone's own check**: the phone's own check: a pile whose zone is not the phone's own is ignored; a pile it already holds only has a drop's clocks refreshed
- **Who starts it**: the system (on a kill, on a player's death, answering item_drop, and at a drop's minute)
- **What the phone does**: sets the phone's copy of the ground's piles (adds one; its coins shown as coins times this player's share; the worker's clocks put on the phone's); shows the drop's lines, shine and sound; speaks (carries a player's name)
- **Id it echoes**: none
- **Fields**:
  - pile.lootId, zone, x, y, ts: the worker's own
  - pile.coins, shares (every recipient's fraction), recipients (player ids): the worker's own
  - pile.killerName: words (a player's display name: the killer's session.name, the dead player's, or the dropper's)
  - pile.skull, shard, gem, inventoryClaimed: the worker's own
  - pile.hasWeapon, weaponClaimed, weaponMystery, weaponTier, weaponType, weaponName, armor (name and metal only: _mysteryPiece), armorClaimed, mystery: the worker's own, a grade never
  - pile.isDeathDrop, deathItems [{key, qty}], ownerOnlyUntil, expiry, openLeft, left: the worker's own
  - pile.dropped, dropBy, flashLeft: the worker's own
- **Absent, and a bad value**: no payload.pile: ignored; no zone (an older worker): applied; x or y not finite: 0; no shares entry for me: my coins 0
- **Notes**: the phone's pickup ask (loot_pickup) is made from this copy | live flag pileleft false stops openLeft and left on a death pile

#### `loot_claimed` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:350 processGameEvent
- **Sent from**: server/src/index.js:4844 (in _handleLootPickup: a kill pile) ; server/src/index.js:4656 (in _handleLootPickup: a death pile or a drop, taken whole)
- **Envelope, and to whom**: in the tick's events ; to everyone in the room (not placed by eventplace.js)
- **The phone's own check**: none checked beyond a lootId; nothing for a pile the phone does not hold; the zone is not checked
- **Who starts it**: the system (answering a loot_pickup, yours or another player's)
- **What the phone does**: sets the phone's copy of the pile: the remnant and shard gone (inventoryClaimedNow), the weapon's glow gone (weaponClaimedNow)
- **Id it echoes**: none
- **Fields**: all the worker's own: lootId, zone, byPlayer (the taker's id), inventoryClaimedNow, weaponClaimedNow, armorClaimedNow
- **Absent, and a bad value**: no lootId: ignored

#### `loot_despawn` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:378 processGameEvent
- **Sent from**: server/src/index.js:4485 (in _despawnLoot: the last claim) ; server/src/index.js:4512 (in _tickLoot: the pile's time ran out)
- **Envelope, and to whom**: in the tick's events ; to everyone in the room (not placed by eventplace.js)
- **The phone's own check**: none checked beyond a lootId; the zone is not checked
- **Who starts it**: the system (on a pile fully claimed, or run out)
- **What the phone does**: sets the phone's copy of the pile to expired and disposes its sprite
- **Id it echoes**: none
- **Fields**: all the worker's own: lootId, zone
- **Absent, and a bad value**: no lootId: ignored; a pile the phone does not hold: only the sprite's dispose is tried

### 5.E progression and quests (10)

#### `points_reset_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2191 direct -> src/game/pointsReset.js:85 onPointsResetResult
- **Sent from**: server/src/pointsreset.js:119 (in _pointsResetSend, 116; called from _handlePointsReset, 122)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: refuses a relayed copy (msg.from); needs an object payload
- **Who starts it**: the system (answering points_reset)
- **What the phone does**: shows (a line over your bro and a cue); ends the phone's wait for the answer (S._pointsResetAskedAt)
- **Id it echoes**: none
- **Fields**: ok, err, wait, pool, poolBy, shared: the worker's own
- **Absent, and a bad value**: no payload -> ignored; an err the phone does not know reads as off
- **Notes**: the new points themselves ride the player_state that follows

#### `rest_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2368 direct -> src/game/rest.js:91 onRestResult
- **Sent from**: server/src/rest.js:79 (in _restSend, 76; called from _handleRest, 104)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: refuses a relayed copy (msg.from)
- **Who starts it**: the system (answering rest_request)
- **What the phone does**: shows (lines over your bro, a cue); on ok sets the phone's Well Rested time (S.rpg._wellRestedUntil); ends the phone's wait for the answer
- **Id it echoes**: none
- **Fields**:
  - ok, err, wait, until, ms: the worker's own
  - where: echo
- **Absent, and a bad value**: no payload, or an err the phone does not know, reads as off; a missing ms shows the phone's own 30 minutes

#### `stat_allocated` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3629 direct
- **Sent from**: server/src/grids.js:270 (in _handleStatAllocate, 255)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: needs a payload with a stat, and the phone's character loaded; a relayed copy is not refused (no msg.from check)
- **Who starts it**: the system (answering stat_allocate)
- **What the phone does**: sets the phone's copy (adds 1 to the named stat, takes the worker's unspentT2, recalculates, saves bt_rpg to localStorage); plays the pointsSpent cue
- **Id it echoes**: none
- **Fields**:
  - stat: echo
  - newUnspentT2: the worker's own
- **Absent, and a bad value**: no payload or no stat -> ignored; newUnspentT2 not a number -> the phone's count left as it was
- **Notes**: the phone ADDS one each time rather than taking a value: the worker holds no stat it raised (see the stat_allocate row); the player_state behind it carries unspentT2 again

#### `prog3_level` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3659 direct
- **Sent from**: server/src/prog3.js:1345 (in _prog3AwardXp, 1281)
- **Envelope, and to whom**: alone ; to the player whose skill rose
- **The phone's own check**: needs a payload and the phone's character loaded; a relayed copy is not refused (no msg.from check)
- **Who starts it**: the system (on a trained skill's level-up: XP from a fight, or from a quest's hand-in)
- **What the phone does**: shows (the skill's level-up burst); sets the phone's copy of the pools (pool, poolBy, shared) and which skill the new point came from
- **Id it echoes**: none
- **Fields**: skill, level, charLevel, pool, poolBy, shared, abilities: the worker's own
- **Absent, and a bad value**: no payload -> ignored; a missing pool, poolBy or shared -> that one left as it was (the player_state behind it repairs it); a missing charLevel -> the phone's own level shown
- **Notes**: the worker has already filled the pools, saved, and queued a player_state

#### `prog3_allocated` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3957 direct
- **Sent from**: server/src/prog3.js:1481 (in _handleProg3Allocate, 1401)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: needs a payload with a stat, and the phone's prog3 block; a relayed copy is not refused (no msg.from check)
- **Who starts it**: the system (answering prog3_allocate)
- **What the phone does**: sets the phone's copy (the stat's points, by cat for an attack stat; pool, poolBy, shared), recalculates, saves bt_rpg to localStorage; plays the pointsSpent cue
- **Id it echoes**: none
- **Fields**:
  - stat, cat: echo
  - pts, pool, poolBy, shared: the worker's own
- **Absent, and a bad value**: no payload or no stat -> ignored; pts not a number -> the stat left as it was; each pool field missing -> left as it was
- **Notes**: a refused spend sends no prog3_allocated (a player_state resend of prog3 instead)

#### `quest_reward_stashed` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3776 direct
- **Sent from**: server/src/quests.js:480 (in _handleQuestTurnIn, 356); server/src/devtools.js:162 (the owner's kit)
- **Envelope, and to whom**: alone ; to the player handing in (or the kit's target)
- **The phone's own check**: needs payload.item and the phone's character loaded; a relayed copy is not refused (no msg.from check)
- **Who starts it**: the system (answering quest_turn_in, once for each armour piece the quest pays; and the owner's lever /api/admin/dev/kit)
- **What the phone does**: sets the phone's copy (puts the piece in the phone's own armorStash or legsStash unless it already holds that gid, saves bt_rpg to localStorage); shows the QUEST REWARD banner
- **Id it echoes**: item.gid (the worker's id for the piece: a replay carrying the same gid adds nothing; a piece with no gid is matched by name and tierMult)
- **Fields**:
  - questId: the worker's own
  - item.name, item.tierMult, item.slot, item.gid, item.mat, item.quality, item.prov: the worker's own (minted at quests.js:663, recorded in the gear_prov ledger first)
- **Absent, and a bad value**: no payload or no item -> ignored; a missing name reads 'Quest Armor', a missing tierMult 1; a slot other than legsArmor goes to the chest stash; mat is cut to 16 characters; a quality or prov the phone does not know is left off
- **Notes**: the piece lives in the phone's bag until worn; wearing it comes back as stats_update (armorRef, or the described piece)

#### `guild_quest_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1924 processGameEvent
- **Sent from**: server/src/guilds.js:67 (in _handleGuildTurnIn, 34; through _guildSend, 28)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: needs payload.skill and the phone's character loaded; nothing else checked
- **Who starts it**: the system (answering guild_quest_turn_in)
- **What the phone does**: sets the phone's copy of the guild ladder (takes index + 1 for the skill), adds the rank's title and its own counters, saves bt_rpg to localStorage; shows two lines and a cue
- **Id it echoes**: none (the phone takes the worker's index, so a second copy cannot move the ladder twice; its own counters would count twice)
- **Fields**:
  - skill: echo
  - index, gold, ap: the worker's own
- **Absent, and a bad value**: no payload or no skill -> ignored; a missing index reads 0, a missing gold or ap 0
- **Notes**: the gold and the points themselves ride the player_state that follows

#### `guild_quest_error` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1963 processGameEvent
- **Sent from**: server/src/guilds.js:35 (in _handleGuildTurnIn, 34; through _guildSend, 28)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering guild_quest_turn_in, refused)
- **What the phone does**: shows (the message as a line over your bro, the denied cue)
- **Id it echoes**: none
- **Fields**: code, message: the worker's own (the not-ready message is built from the skill's key and two levels, none of it a player's words)
- **Absent, and a bad value**: no payload or no message -> 'Turn-in rejected'

#### `codex_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2294 direct -> src/game/monsterCodex.js:54 onCodexState
- **Sent from**: server/src/codex.js:178 (in _codexSend, 173; called at the join: join.js:1988, and from _codexDevSet, 207)
- **Envelope, and to whom**: alone ; to the player it is about
- **The phone's own check**: none checked (a relayed copy is not refused); needs a payload
- **Who starts it**: the system (at the join; and the owner's lever /api/admin/dev/codex)
- **What the phone does**: sets the phone's copy of the monster codex (kills a kind)
- **Id it echoes**: none
- **Fields**: v, k (a kind: [kills, kills past level 20]), unavailable: the worker's own
- **Absent, and a bad value**: no payload -> ignored; unavailable -> the page says so; a kind the phone does not know, or a row that is not a list, is left out; the second count is clamped to the first
- **Notes**: a kill's own count rides the kill's credit message, not this

#### `achv_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2305 direct -> src/game/achievements.js:178 onAchvState
- **Sent from**: server/src/achievements.js:317 (in _achvSend, 306; called at the join: join.js:1990, from _achvGrant, _achvTitle, _achvDev, and from revealbag.js:231, 373)
- **Envelope, and to whom**: alone ; to the player it is about
- **The phone's own check**: refuses a relayed copy (msg.from); held while a bag reveal plays (afterReveal)
- **Who starts it**: the system (at the join, on an achievement earned, answering achv_title; and the owner's lever /api/admin/dev/achv)
- **What the phone does**: sets the phone's copy of the achievements (what you have, counts, dungeons, title, rarest, AP); shows a banner or a chat line for each new one
- **Id it echoes**: none
- **Fields**: got, n, dg, t, ap, rarest, new, retro, unavailable: the worker's own
- **Absent, and a bad value**: unavailable -> the page shows none and no title; an id the phone does not know is left out; a title or rarest that is not one you have reads as none (src/game/achievements.js:108)
- **Notes**: also ends the phone's wait for a title ask

### 5.F gathering, cooking, fish (6)

#### `eat_refused` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2434 direct -> src/game/fightFood.js:144 noteEatRefused
- **Sent from**: server/src/cooking.js:649 _pvpHealHeld (asked by eat_request, potion_drink and an old-style cook_recipe)
- **Envelope, and to whom**: alone ; to the eater
- **The phone's own check**: none checked (the case's comment says a relayed copy is never trusted; the case itself has no msg.from test, and the worker drops a relayed one: the type is privileged)
- **Who starts it**: the system (answering eat_request, potion_drink or cook_recipe held back by the one-bite rule)
- **What the phone does**: sets the phone's own bite clock to the worker's (S._instantHealAt, S._pvpAt), shows "Eat again in Ns" and plays the denied cue; the bag and hp come back on the player_state resend that follows
- **Id it echoes**: none
- **Fields**: wait: the worker's own (ms still to wait; the phone clamps it to 0..PVP_HEAL.GAP_MS)
- **Absent, and a bad value**: no payload or no wait -> read as 0: the clock is set as if the wait were over and the line says 1 s
- **Notes**: private

#### `harvest_credit` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3497 direct
- **Sent from**: server/src/gathering.js:1624 (in _handleNodeStrike, after the paying strike's save)
- **Envelope, and to whom**: alone ; to the harvester
- **The phone's own check**: needs a payload and a loaded character (S.rpg); a relayed copy is not refused here (the worker drops a relayed one: the type is privileged)
- **Who starts it**: the system (answering node_strike, only when the strike paid)
- **What the phone does**: shows (the shard's popup, a rare fish's words, the level-up line and its sound); the bag and the XP themselves come on the player_state sent just before it
- **Id it echoes**: nodeId: the strike's node id sent back (the phone does not read it)
- **Fields**:
  - nodeId, zone: echo (not read by the phone)
  - skillName, leveled, newLevel: the worker's own
  - xpAmt: the worker's own (not read by the phone)
  - shard: the worker's own (its roll; an item key)
  - fish {key, sp, v}: the worker's own (the catch's key and variant, only for a fish)
- **Absent, and a bad value**: no payload or no character -> ignored; an unknown shard key -> the popup says "Shard"; no newLevel -> "?"; fish words only against caps.fishvariants
- **Notes**: private; sent only for a paid strike (a miss, a refusal and the hour cap send none)

#### `gather_hits` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3529 direct -> src/game/lifeSkillRewards.js:385 applyGatherHits
- **Sent from**: server/src/gathering.js:1255 _sendGatherHits (called from _planGatherHits server/src/gathering.js:1190 and _planCookHits server/src/gathering.js:1229)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: no check of a relayed copy in the case; applyGatherHits takes it only while a harvest of the phone's is waiting with hits asked and no plan yet, and the seq and the node id (a cook: the fishKey) are that attempt's
- **Who starts it**: the system (answering extraction_start that carried a hitSeq)
- **What the phone does**: sets the phone's plan for the harvest in flight (the hits it shows, and when its gesture window opens); `off` or a plan it cannot play puts the attempt back on the old timer
- **Id it echoes**: seq: the start's hitSeq sent back, with nodeId or fishKey
- **Fields**:
  - seq, nodeId, fishKey: echo
  - zone: echo (not read by the phone)
  - hp, hits[]: the worker's own (its rolls)
  - off: the worker's own (the kill switch gatherhits)
- **Absent, and a bad value**: no payload, a seq or node that is not the waiting attempt's -> dropped; hits not a list of 1 to GATHER_PLAN_MAX whole numbers of 1 or more, or hp not above 0 -> the attempt goes to the timer and the phone sends extraction_start again with no hitSeq (src/game/lifeSkillRewards.js:483)
- **Notes**: private | a bad plan makes the phone send a message (the timer's start), so the worker's record matches what the phone plays

#### `fish_weight` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2313 direct -> src/game/fishWeigh.js:47 onFishWeight
- **Sent from**: server/src/fishlog.js:344 _fishSend (from _handleFishInspect: server/src/fishlog.js:429, 434, 436 and 451)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: refuses a relayed copy (msg.from); needs a payload whose key is a string
- **Who starts it**: the system (answering fish_inspect)
- **What the phone does**: shows (fills the weigh-in card: the weight, a new best, the place on the board, how many are left to weigh; or why not)
- **Id it echoes**: key: the request's key sent back; there is no id, so two weigh-ins of one key cannot be told apart
- **Fields**:
  - key: echo
  - sp, v: the worker's own (read off the key)
  - g, best, newBest, rank, left: the worker's own (the roll, the player's best, the board place, catches left)
  - none, off, unavailable: the worker's own (why nothing was weighed)
- **Absent, and a bad value**: no payload, or a key that is not a string -> ignored (the card stays on "Weighing")
- **Notes**: private

#### `fish_board` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2315 direct -> src/game/fishWeigh.js:71 onFishBoard
- **Sent from**: server/src/fishlog.js:344 _fishSend (from _handleFishBoardRequest: server/src/fishlog.js:458 and 460)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: refuses a relayed copy (msg.from); needs a payload that is an object
- **Who starts it**: the system (answering fish_board_request)
- **What the phone does**: sets the phone's copy of the biggest-fish boards (S._fishBoard) for the Ranks page; speaks (it carries other players' names)
- **Id it echoes**: none
- **Fields**:
  - boards {\<species>: [{pid, name, g, v, at, lv, look, gone}]}: g, v, at, lv, gone: the worker's own
  - pid: the worker's own (another player's id, on a public board)
  - name: words (the player's name as the worker had it at the weigh-in, _laneNameOf or ps.name, cut to FISHLOG.NAME_MAX; cleaned where a name is, at the join)
  - look: look (that player's face ids, kept through boards.js boardFace: short ids, never a drawing)
  - off, unavailable: the worker's own
- **Absent, and a bad value**: no payload or not an object -> ignored
- **Notes**: private to the asker; the board itself is public (any joined player may ask)

#### `firemaking_refused` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3540 direct -> src/game/fireRefuse.js:28 takeBackFireWhat
- **Sent from**: server/src/cooking.js:247 (in _handleFiremakingRequest, no such log; live flag firerefuse)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering firemaking_request for a log the bag does not hold)
- **What the phone does**: ends the light the phone started on the tap, or puts out the campfire it lit inside FIRE_REFUSE.LIT_MS, and shows "No log to light"; when a lit fire was put out the phone then SENDS the relay campfire_out (src/game/fireRefuse.js:47) so the others' copy goes out
- **Id it echoes**: none
- **Fields**: invKey: echo (not read by the phone)
- **Absent, and a bad value**: the payload is not read at all; with no light and no fresh fire to take back, nothing happens
- **Notes**: private | sent after the inventory resend, so the bag is already true when it lands

### 5.G the farm, pets, traps (6)

#### `farm_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2476 direct -> src/ui/mobile/farmBus.js:58 apply, then src/game/farmFeedback.js:94 farmFeedback
- **Sent from**: server/src/farm.js:338 _farmSend (every answer of farm.js and farmorders.js); server/src/farm.js:625 _farmOnJoin (at join, flagged login, called at server/src/join.js:1679); server/src/devtools.js:496 (the owner's farm-ripe lever)
- **Envelope, and to whom**: alone; to the asker (the farm's owner, their own socket only)
- **The phone's own check**: none checked (no msg.from test; a direct case, which a relayed copy in the tick's events never reaches); a payload that is not an object is ignored
- **Who starts it**: the system (answering farm_open, farm_act, farm_buy, farm_order; on join when the player has a farm record; on the owner's /dev/farmripe)
- **What the phone does**: sets the phone's copy of the farm (the beds, the worker's clock offset, today's order board, the last answer); shows popups, sounds and the Farming level-up; on a join answer says how many beds are ripe (a chat-log line and a popup, only when more than last told); on a harvest sets the phone's own quest flag _questFlags.harvestedCrop
- **Id it echoes**: none (did.op names what it answers; an order's did.slot is the request's slot)
- **Fields**:
  - beds, now, plots[] {s, crop, plantedAt, readyAt, water, feed}: the worker's own
  - orders {day, resetsAt, list[] {id, key, n, gold, xp, done, gone}} or null: the worker's own
  - did {op, n, crop, used, items, xp, leveled, fromLevel, newLevel, item, cost, slot, count, gold}: the worker's own (op, crop, item and slot are the request's, after its checks)
  - err (off, newer, fight, level, no-seeds, no-compost, coins, nothing, order-stale, order-gone, order-done, order-fight, order-short): the worker's own
  - login: the worker's own
- **Absent, and a bad value**: no payload or not an object: ignored; plots not an array or beds not a number: the beds are left as they were; no orders key: the board is left as it was; orders null or without a list: the board is cleared and marked as told; no did: only an err is shown; an err word the phone does not know: 'Could not'
- **Notes**: carries no player's words. The bag, the gold and the XP ride the player_state sent beside it; nothing here credits anything. The harvestedCrop flag is the phone's own (handoff rule 18).

#### `pet_capture_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:5247 processGameEvent
- **Sent from**: server/src/pets.js:80 (in _handlePetCapture, through server/src/pets.js:70 _petSend)
- **Envelope, and to whom**: alone (no direct case, so the default branch hands it to processGameEvent); to the asker
- **The phone's own check**: none checked (a missing payload is ignored); the type is in PRIVILEGED_EVENTS, so this worker never relays one
- **Who starts it**: the system (answering pet_capture)
- **What the phone does**: shows one popup: 'Target a monster and tap TRAP' on error 'retired'; 'Captured \<pet name>!' when captured with a pet; 'Capture failed' on any other error
- **Id it echoes**: none
- **Fields**:
  - captured: the worker's own (always false today)
  - error: the worker's own (always 'retired' today)
  - pet: never sent today (the phone would read pet.name into its 'Captured ...' line)
- **Absent, and a bad value**: no payload: ignored; neither an error nor a capture: nothing shown
- **Notes**: the worker's only send is {captured: false, error: 'retired'} (pets.js:80).

#### `make_traps_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2330 direct -> src/game/trapping.js:294 onMakeTrapsResult
- **Sent from**: server/src/trapping.js:263 _handleMakeTraps (the reply at server/src/trapping.js:266)
- **Envelope, and to whom**: alone; to the asker
- **The phone's own check**: none checked (no msg.from test; a direct case); a missing payload is ignored
- **Who starts it**: the system (answering make_traps)
- **What the phone does**: shows the traps made, the Woodworking XP and a level-up, or why none were made; counts them for the Traps tab (S._trapsMade)
- **Id it echoes**: none (log is the request's own)
- **Fields**:
  - error (off, bad-log, no-logs): the worker's own
  - log: echo (on bad-log the request's own string, unchecked, back to its sender only)
  - need, have, made, xp, leveled, newLevel, traps: the worker's own
- **Absent, and a bad value**: no payload: ignored; made 0 or absent: nothing shown; an error word the phone does not know: 'No traps made'
- **Notes**: the phone reads error, made, xp, leveled and newLevel; log, need, have and traps are sent and not read (the bag rides player_state).

#### `trap_armed` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2284 direct -> src/game/trapping.js:175 onTrapArmed
- **Sent from**: server/src/trapping.js:302 _handleTrapArm (a refusal at server/src/trapping.js:308, the mark set at server/src/trapping.js:348)
- **Envelope, and to whom**: alone; to the asker
- **The phone's own check**: none checked (no msg.from test; a direct case); a missing payload is ignored
- **Who starts it**: the system (answering trap_arm)
- **What the phone does**: sets the phone's mark (which monster, for how long, the chance it shows) and clears its pending arm; on a refusal shows why; plays the latch sound
- **Id it echoes**: monsterId (the request's own, sent back)
- **Fields**:
  - monsterId: echo (on a refusal the request's own string, unchecked; on a mark the worker's monster id)
  - error (off, not-now, not-here, no-monster, safe-ground, too-far, level, no-trap, pets-unavailable, pets-full, catch-cap, too-fast): the worker's own
  - need, have, cap: the worker's own
  - until, ms, chance, stretch, traps: the worker's own
- **Absent, and a bad value**: no payload: ignored; ms absent or 0: the phone's own TRAPPING.MARK_MS; chance absent: 0; a monster the phone does not have: the mark is drawn at the player's own place; an error word the phone does not know: 'No trap set'
- **Notes**: the phone times the mark from its own clock plus ms; until, stretch and traps are sent and not read.

#### `trap_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2286 direct -> src/game/trapping.js:203 onTrapResult
- **Sent from**: server/src/trapping.js:368 _trapRollOnKill (the send at server/src/trapping.js:382), called at server/src/combat.js:2252 (the kill)
- **Envelope, and to whom**: alone; to each player whose live mark was on the killed monster (their own socket)
- **The phone's own check**: none checked (no msg.from test; a direct case); a missing payload is ignored
- **Who starts it**: the system (on the kill of a Wheel monster the player armed with trap_arm)
- **What the phone does**: shows the trap spring where the monster fell (the shakes, a catch or a miss, the XP, a level-up, golden or big), clears the phone's mark, mirrors the tries count, hides a new pet until the trap has snapped shut, then shows its card
- **Id it echoes**: monsterId (the armed monster's id)
- **Fields**:
  - monsterId, sprung, why (share, no-trap, pets-unavailable, level), caught, shakes, chance, stretch, xp, leveled, newLevel, tries, traps: the worker's own
  - pet {id, kind, look, home, stage, gold, size, name (null at a catch), lv, xp, at, caughtBy (the catcher's player id), owners, tradeAfter}: the worker's own
- **Absent, and a bad value**: no payload: ignored; sprung false or absent: 'Trap kept' words only; shakes clamped to 0..3 by the phone; caught without a pet: no card; a why word the phone does not know: 'Trap kept'
- **Notes**: one trap is spent on every sprung roll, caught or not; the bag and the Trapping XP ride a queued player_state, and a catch is followed at once by pets_state. The whole payload is kept as S._trapLast.

#### `pets_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2288 direct -> src/game/trapping.js:308 onPetsState
- **Sent from**: server/src/petbook.js:449 _petbookSend; called at server/src/join.js:1986 (join), server/src/petbook.js:699 _petbookAct (every Pets-page answer and refusal), server/src/petbook.js:666 _petbookTake and server/src/petbook.js:680 _petbookGive (a pet leaves or arrives by trade, sale or mail)
- **Envelope, and to whom**: alone; to the record's owner (their own socket only)
- **The phone's own check**: none checked (no msg.from test; a direct case); a missing payload is ignored
- **Who starts it**: the system (answering pet_active, pet_name, pet_release, pet_house_buy; on join; on a catch; when a trade, a sale or the mail takes or gives a pet; on the fight lock's refusal of pet_house_buy)
- **What the phone does**: sets the phone's copy of the whole pets record (replaced each time, on a refusal too); shows a line for the op (released, named, with you or put away, the Pet House's new size) or the refusal's words; plays the pet's sound; speaks (it carries pets' names)
- **Id it echoes**: op and id (what it answers: active, name, release, house, gone, arrived; id is the request's own or the moved pet's)
- **Fields**:
  - v, cap, active, journal {kind.stage: {tries, n, gold, big}}: the worker's own
  - list[] {id, kind, look, home, stage, gold, size, lv, xp, at, caughtBy, owners, tradeAfter, legacy}: the worker's own (caughtBy is a player id: another player's on a traded pet)
  - list[].name: words (the owner's, or a previous owner's on a traded or bought pet; cleaned by cleanPetName when set, petbook.js:228, and again whenever the record is loaded, petbook.js:259)
  - op, id: echo
  - error (off, pets-unavailable, too-fast, no-pet, bad-name, confirm, house-full, stale, no-gold, not-now): the worker's own
  - unavailable: the worker's own
- **Absent, and a bad value**: no payload: ignored; unavailable: an empty book marked unavailable; list not an array: an empty list; journal not an object: empty; an error word the phone does not know: 'Not done'
- **Notes**: also sent after a catch (server/src/trapping.js:432), by the fight lock's refusal (server/src/fightlock.js:149) and by the owner's /dev/trapping lever (server/src/devtools.js:607). Up to PETBOOK.CAP_MAX pets a message.

### 5.H gear and the forges (5)

#### `smelt_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2169 direct
- **Sent from**: server/src/smelting.js:150 (in _handleSmeltBar)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (no msg.from test; acts only when count > 0 and the player exists)
- **Who starts it**: the system (answering smelt_bar)
- **What the phone does**: shows (the bars and the XP over the player, the sound, a level celebration); the bag rides the player_state that follows
- **Id it echoes**: none
- **Fields**:
  - barKey: echo
  - count: the worker's own (what the ore paid for, at most what was asked)
  - xp, leveled, fromLevel, newLevel: the worker's own
- **Absent, and a bad value**: no payload or count 0 -> nothing drawn; a barKey the phone has no recipe for -> named 'Bar'

#### `forge_armor_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2410 direct -> src/networking/wsClient.js:4292 _applyLootCredit
- **Sent from**: server/src/armorforge.js:115 (in _handleForgeArmor)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (no msg.from test; acts only on a payload whose piece is an object)
- **Who starts it**: the system (answering forge_armor)
- **What the phone does**: sets the phone's copy of the armour bag (adds the piece), and shows the XP line, the sound and a level celebration
- **Id it echoes**: none (recipe is sent back)
- **Fields**:
  - recipe: echo
  - piece {name, mat, slot, tierMult, quality, gid}: the worker's own (minted, with its ledger id)
  - xp, leveled, fromLevel, newLevel: the worker's own
- **Absent, and a bad value**: no payload or no piece -> nothing (the piece reaches the phone's bag only by this message; lost, the next join adopts it)
- **Notes**: a player_state follows with the bars gone

#### `cape_status` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:429 processGameEvent
- **Sent from**: server/src/join.js:1818 (in the join, once the cape ledgers are loaded)
- **Envelope, and to whom**: alone ; to the joiner, once a join
- **The phone's own check**: none checked
- **Who starts it**: the system (on a join)
- **What the phone does**: shows (the golden-ticket chip by the chat through capeStatusBus, a console line, S._capeStatusLine)
- **Id it echoes**: none
- **Fields**:
  - live, rate: the worker's own
  - capes.\<id>.cap, remaining: the worker's own (remaining null = not counted yet); never the holders' ids
- **Absent, and a bad value**: no payload -> read as 'not running'
- **Notes**: sent only at a join, so the count on the chip is as old as the phone's last join (a ticket found later sends none)

#### `gear_locked` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:5268 processGameEvent
- **Sent from**: server/src/threat.js:253 (in _threatGearLocked, through threat.js:67 _threatSend)
- **Envelope, and to whom**: alone ; to the player whose gear change was refused
- **The phone's own check**: none checked
- **Who starts it**: the system (on equip_request, unequip_request, forge_weapon, harden_weapon, stats_update's armour, amulet_forge_request, weapon_gem or shield_gem while the guards' gear lock holds; at most one every 2 s)
- **What the phone does**: shows ('Gear locked by guards!' with the minutes left, and the denied sound)
- **Id it echoes**: none
- **Fields**: until: the worker's own (the lock's end, epoch ms; the phone counts the minutes on its own clock)
- **Absent, and a bad value**: no payload or no until -> shows 30 minutes
- **Notes**: a player_state follows it, putting back what the phone drew

#### `harden_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:5208 processGameEvent
- **Sent from**: server/src/hardening.js:239 _hardenSend (the roll's answer and every refusal of the handler; the fight lock's refusal, server/src/fightlock.js:104)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (needs a payload)
- **Who starts it**: the system (answering harden_weapon)
- **What the phone does**: shows (won or lost, what it took, the level now; a shake and a sound) and redraws the sheet; the gold, the materials and the weapon ride player_state
- **Id it echoes**: none
- **Fields**:
  - success, cost, material, amount, hardness, temper, odds: the worker's own
  - slot: echo
  - error, message: the worker's own words (a code and a fixed sentence; no player's text)
- **Absent, and a bad value**: no payload -> nothing; a refusal with no message -> 'Cannot harden'

### 5.I gems, salvage, reveals (9)

#### `item_reveal` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2208 direct -> src/game/revealBag.js:174 applyItemReveal
- **Sent from**: server/src/revealbag.js:226 _revealBagSend (reveal_item's answer; and a "?" put on: server/src/gear.js:794, server/src/grids.js:131), server/src/revealbag.js:362 _revealBagSendJoin (pieces the join opened, server/src/join.js:1980)
- **Envelope, and to whom**: alone ; to the holder
- **The phone's own check**: refuses a relayed copy (msg.from); an empty payload is ignored
- **Who starts it**: the system (answering reveal_item; or on wearing a "?"; or at a join that opens them)
- **What the phone does**: sets the phone's copy (the grade onto its armour piece by gid, the `unrevealed` mark off, saved locally; a weapon's comes by player_state); starts the reveal ceremony (the ladder onto revealBus) and then runs what waited for it (an equip); a refusal shows its words over the head
- **Id it echoes**: none (the phone matches its waiting step by field plus gid or idx)
- **Fields**:
  - ok, reason, already, piece (the opened piece, grade now included), reveals[] {kind, name, itemType, mat, quality, ladder}: the worker's own
  - field, gid, idx: echo
  - name: the worker's stored name of the weapon, cut to 40
- **Absent, and a bad value**: no payload -> ignored; ok false -> the reason's words ('busy' and 'bad' say nothing; unknown: 'That piece cannot be revealed right now'); reveals absent or with no ladder (an `already`) -> no ceremony, the waiting step runs at once
- **Notes**: the achievements the grade earned are sent right after it (achv_state), held by the phone until the ceremony lands; a refusal's reason never depends on the grade (revealbag.js:224)

#### `hardened_wood_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2380 direct (handled in the case itself)
- **Sent from**: server/src/hardenedwood.js:102 (the reply in _handleMakeHardenedWood)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (always counted in S._hardenedWoodSeen; nothing shown without S.player)
- **Who starts it**: the system (answering make_hardened_wood)
- **What the phone does**: shows (the '+N Hardened Wood' and XP popups, a sound, the Woodworking level celebration, or the refusal's words); counts the answer so the Harden tab's button lets go; the bag comes by player_state
- **Id it echoes**: none
- **Fields**:
  - count, xp, leveled, fromLevel, newLevel, have, error, need: the worker's own
  - key: echo (a recipe's key on a receipt; on error 'off' the string as the phone sent it, not cut, hardenedwood.js:103-104)
- **Absent, and a bad value**: no payload -> read as {}: counted, nothing shown; error other than 'no-logs' and 'skill' -> 'Cannot harden wood right now'; a receipt with count 0 or absent -> nothing shown
- **Notes**: a receipt carries no ok field: an `error` key is the refusal

#### `smith_salvage_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2226 direct -> src/game/salvage.js:60 applySalvageResult
- **Sent from**: server/src/salvage.js:172 _salvageSend (the refusal at 220, the receipt at 268)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (a payload that is not an object is ignored)
- **Who starts it**: the system (answering smith_salvage)
- **What the phone does**: sets the phone's copy of the armour bag (a salvaged torso or greaves is taken out of R.armorStash / R.legsStash by gid and saved locally); shows (the bars, essence and gems-back popup, two sounds; a refusal's words in the Salvage tab); the bag and the weapon bag come by the player_state behind it
- **Id it echoes**: none (it echoes field and gid or idx, which the tab matches its waiting row by time, not by id)
- **Fields**:
  - ok, reason, bar, bars, essence, grade, metal, gems[]: the worker's own
  - field, gid, idx: echo (field cut to 16, gid to 40)
  - name: the worker's stored name of the piece, cut to 40
- **Absent, and a bad value**: no payload -> ignored; ok false -> the reason's words (unknown reason: 'Could not salvage'); a gid the phone does not hold -> nothing removed, the popup still shows
- **Notes**: grade is sent for a "?" piece too (see smith_salvage)

#### `essence_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2236 direct -> src/game/salvage.js:86 applyEssenceResult
- **Sent from**: server/src/salvage.js:172 _salvageSend (the refusal at 282, the receipt at 314)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (a payload that is not an object is ignored)
- **Who starts it**: the system (answering essence_apply)
- **What the phone does**: sets the phone's copy (the new grade onto its armour pieces with that gid, saved locally; a weapon's comes by player_state); shows (the grade's popup and a sound, or the refusal's words)
- **Id it echoes**: none (echoes field, gid or idx, and the essence key)
- **Fields**:
  - ok, reason, grade, metal: the worker's own
  - piece: the worker's own copy of the whole piece (the ledger's rebuild, or the weaponStash entry itself; the phone's handler does not read it)
  - field, gid, idx, essence: echo (field cut to 16, gid and essence to 40)
- **Absent, and a bad value**: no payload -> ignored; ok false -> the reason's words (unknown: 'Could not use the essence'); no piece with that gid -> only the popup

#### `shield_gem_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2244 direct -> src/game/shieldGem.js:98 applyShieldGemResult
- **Sent from**: server/src/shieldgem.js:103 _shieldGemSend ; server/src/fightlock.js:122 (the router's refusal in a fight)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (a payload that is not an object is ignored)
- **Who starts it**: the system (answering shield_gem)
- **What the phone does**: sets the phone's copy (the gem and the worker's name onto its own copy of that shield, found by gid, else by signature; re-derives the shield's bonus; saved locally); shows (the bonus popup and a sound, or the refusal's words); lets the Enchanter's buttons go
- **Id it echoes**: none
- **Fields**:
  - ok, reason, name, gid, sig, worn, xp: the worker's own
  - gem: echo (only a gem on AMULET_GEMS, else null)
- **Absent, and a bad value**: no payload -> ignored; ok without a gem and a name -> nothing applied; no matching shield on the phone -> only the sound; ok false -> the reason's words (unknown: 'Could not slot the gem')
- **Notes**: the gem count and the XP come by the player_state behind it; that echo's shield also carries the gem (adoptShieldGem), which mends a lost answer

#### `weapon_gem_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2253 direct -> src/game/weaponGem.js:115 applyWeaponGemResult
- **Sent from**: server/src/weapongem.js:187 _weaponGemSend ; server/src/fightlock.js:113 (the router's refusal in a fight)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (a payload that is not an object is ignored)
- **Who starts it**: the system (answering weapon_gem)
- **What the phone does**: shows (the 'set!' popup, a sound, the Enchanting level celebration, or the refusal's words); sets the phone's own quest flags enchantedWeapon and slottedGem (R._questFlags: the phone's counters, handoff rule 18); lets the buttons go; the weapon itself comes by player_state
- **Id it echoes**: none
- **Fields**:
  - ok, reason, name, element1, element2, xp, leveled, newLevel, fromLevel: the worker's own
  - slot, gem: echo (null when not on the worker's lists)
- **Absent, and a bad value**: no payload -> ignored; ok false -> the reason's words (unknown: 'Could not set the gem'); leveled without a number newLevel -> no celebration

#### `shard_crack_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2262 direct -> src/game/shardCrack.js:107 applyShardCrackResult
- **Sent from**: server/src/shardcrack.js:104 _shardCrackSend (the refusal at 129, the result at 155) ; server/src/fightlock.js:132 (the router's refusal in a fight)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (a payload that is not an object is ignored)
- **Who starts it**: the system (answering shard_crack)
- **What the phone does**: shows (the gems-found popup, the Gem Cutting level celebration, and the record the Gem Works plays its crack from: at most 50 finite rolls); lets the buttons go; the bag and the XP come by player_state
- **Id it echoes**: none
- **Fields**:
  - ok, reason, element, chance, rolls[], found, left, xp, leveled, newLevel, fromLevel: the worker's own
  - land: echo (only an own key of the worker's LANDS, else null)
- **Absent, and a bad value**: no payload -> ignored; rolls not an array -> none played; ok false -> the reason's words

#### `gem_combine_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2271 direct -> src/game/shardCrack.js:125 applyGemCombineResult
- **Sent from**: server/src/shardcrack.js:104 _shardCrackSend (the refusal at 170, the result at 193) ; server/src/fightlock.js:138 (the router's refusal in a fight)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (a payload that is not an object is ignored)
- **Who starts it**: the system (answering gem_combine)
- **What the phone does**: shows (the 'Gem made!' popup, a sound, the level celebration, or the refusal's words with need and have); lets the buttons go; the bag comes by player_state
- **Id it echoes**: none
- **Fields**:
  - ok, reason, made, need, have, xp, leveled, newLevel, fromLevel: the worker's own
  - element, rare: echo (element only when on the worker's list, else null)
- **Absent, and a bad value**: no payload -> ignored; ok false with reason 'short' and no need -> 'No shards of that land left' (the crack's words); unknown reason -> 'Could not do that'

#### `gem_cut_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:3557 direct (handled in the case itself)
- **Sent from**: server/src/amulet.js:538 (in _handleGemCut, after its player_state)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: needs a payload, S.rpg and S.player, else ignored
- **Who starts it**: the system (answering gem_cut_request)
- **What the phone does**: shows (the 'Polished!' or 'Gem shattered!' popup, a sound, the Gem Cutting level celebration); the gems and the XP came by the player_state before it
- **Id it echoes**: none
- **Fields**:
  - success, leveled, newLevel: the worker's own
  - gem: echo (a gem on AMULET_GEMS)
- **Absent, and a bad value**: no payload -> ignored; a gem the phone has no name for -> '\<gem> Gem' in white; leveled with newLevel 1 or absent -> a plain 'Gem Cutting Lv?' popup
- **Notes**: not sent under today's flags: the cut is refused before its roll while `shardcrack` is on (amulet.js:505-509)

### 5.J the shop, the bank, the store on the socket (9)

#### `bank_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2355 direct -> src/game/bank.js:71 onBankState
- **Sent from**: server/src/bank.js:199 _bankSend (from :209 on bank_open, :226-265 on every refusal, :280 after a move, :228 on a replayed opId)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: refuses a relayed copy (msg.from); needs an object payload (bank.js:72)
- **Who starts it**: the system (answering bank_open, bank_deposit, bank_withdraw)
- **What the phone does**: sets the phone's copy of the vault (S._bank: gold, items, slots, which bag keys may not go in, and the last move's verdict, drawn as the line under the window); ends the phone's wait on its pending move
- **Id it echoes**: last.opId: the request's own id sent back; the phone clears S._bankPending when it matches, or when last is null (any bank_open answer)
- **Fields**:
  - ok, on, failed, gold, items[{key, n}], slots, noBank: the worker's own
  - last.opId, last.kind, last.id, last.n, last.dir: echo (the request as the worker read it)
  - last.ok, last.err: the worker's own (err a code: not_here, not_enough, vault_full, bag_full, bad_key, kept, busy, off, newer, bad; the phone has the words, src/game/bank.js REFUSED)
- **Absent, and a bad value**: payload missing or not an object -> ignored; items not an array -> none; an item with no string key or n \<= 0 -> dropped; gold not a number -> 0; ok/on absent -> taken as true; an unknown err -> "That didn't go through"
- **Notes**: the bag and the purse are not in it: they ride the player_state sent just before it after a move

#### `shop_state` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:405 processGameEvent -> src/ui/mobile/shopBus.js setStock
- **Sent from**: server/src/index.js:5439 (answering shop_list) | server/src/index.js:5492 broadcastAll (after a sale or a purchase) | server/src/index.js:5493 (the asker alone, after a refused one)
- **Envelope, and to whom**: alone ; to the asker, or to every socket in the room after a trade that happened (broadcastAll, index.js:6570: joined or not, whatever the zone)
- **The phone's own check**: none checked (processGameEvent; the worker's deny-list is what keeps a phone's copy out)
- **Who starts it**: the system (answering shop_list, shop_sell, shop_buy; and on every trade anyone makes)
- **What the phone does**: sets the phone's copy of Diego's shelf and pile (shopBus.stock: every number the panel and the bag's per-slot quotes draw); clears the panel's busy mark
- **Id it echoes**: none
- **Fields**:
  - ok, settled: the worker's own
  - items[]: the worker's own ({key, qty (null for a staple or tool), buy, base, sell, full, staple?, tool?, quote?}; a quote row only in the answer to the asker's own shop_list)
- **Absent, and a bad value**: payload missing -> read as {}; items missing or not an array -> an empty list (only the bag's old quote rows are kept); a row with no string key is kept in the list but replaces nothing
- **Notes**: the list is MERGED on the phone: a broadcast names only the pile, and the asker's quote rows for keys it does not name stay

#### `shop_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:471 processGameEvent -> src/ui/mobile/shopBus.js setNote
- **Sent from**: server/src/index.js:5475 (after _shopSell / _shopBuy) | server/src/index.js:5495 (a throw: 'Shop unavailable')
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering shop_sell or shop_buy)
- **What the phone does**: shows (the one-line receipt or his refusal, the coin sound on a sale, the buy cue on a purchase); the bag and the purse are NOT taken from it (they ride the player_state that follows)
- **Id it echoes**: none
- **Fields**:
  - kind: echo (the request's type)
  - ok, sold, paid, bought, cost, coins, stock, nextBuy, staple, tool, settled: the worker's own
  - error: the worker's own (a fixed sentence in the shopkeeper's voice, shown as it is)
- **Absent, and a bad value**: payload missing -> read as {} -> shown as a refusal 'He shakes his head.'; ok without a known kind -> the same; a missing sold/paid/bought/cost is drawn as 'undefined' in the line
- **Notes**: coins and stock are sent and not read by this handler

#### `shop_quoted` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:411 processGameEvent -> src/ui/mobile/shopBus.js setQuote
- **Sent from**: server/src/index.js:5452 (answering shop_quote)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering shop_quote)
- **What the phone does**: sets the phone's copy of one stack's price (the number on the Buy or Sell button; the button stays off until a quote matches the selection)
- **Id it echoes**: none (the panel matches it to its selection by key, mode and qty: src/ui/panels/ShopkeeperPanel.jsx:294)
- **Fields**:
  - key, mode: echo
  - qty, total, tool, staple, why, settled, ok: the worker's own
  - error: the worker's own (not shown: a refusal sets the quote to null)
- **Absent, and a bad value**: payload missing or ok false -> the quote is cleared (the button shows no number); a quote for another key, mode or qty is ignored by the panel

#### `store_dm` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:631 processGameEvent -> src/ui/mobile/storeChatBus.js addMsg
- **Sent from**: server/src/storechat.js:275 (the sender's own line echoed) | server/src/storechat.js:279 (the other side of the thread, unless they muted the sender)
- **Envelope, and to whom**: alone ; to the sender and to the other side of that conversation (the listing's seller, or the buyer the seller answered)
- **The phone's own check**: none checked (not in src/game/blockedAsks.js: see found)
- **Who starts it**: the system (on a player's store_dm)
- **What the phone does**: shows; speaks (one line of a listing's thread: appended to the open thread, or counted as unread for a listing that is not open, the dot on its row)
- **Id it echoes**: none
- **Fields**:
  - listingId, buyerId, msg.from, msg.ts: the worker's own
  - msg.fromName: words (the sender's character name, the worker's copy, cut to STORE_CHAT.NAME_MAX)
  - msg.text: words (the sender's line, cleaned by storechat.js:124 _scText)
- **Absent, and a bad value**: payload missing, or no listingId, or no msg -> ignored; a line for a conversation the phone does not hold starts one under msg.fromName or 'Someone'

#### `store_dm_thread` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:628 processGameEvent -> src/ui/mobile/storeChatBus.js setThread
- **Sent from**: server/src/storechat.js:194 (the thread) | server/src/storechat.js:179 (the listing is gone)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked by the case; the bus ignores a thread for any listing but the one open (p.listingId)
- **Who starts it**: the system (answering store_dm_open)
- **What the phone does**: sets the phone's copy of one listing's thread: its header, its conversations and its offers (the authoritative read of the offers for a seller whose panel was shut); speaks (carries stored lines)
- **Id it echoes**: none (matched by listingId)
- **Fields**:
  - listingId: echo
  - gone, amSeller, askPrice, expiresAt, sellerId: the worker's own
  - item: the worker's own copy of the listing's display (rec.disp; its name is a pet's own name on a pet listing: words)
  - sellerName, threads[].buyerName, offers[].buyerName, threads[].msgs[].fromName: words (players' names, the worker's copies)
  - sellerLook: look (the seller's bust cosmetics kept on the listing)
  - threads[].buyerId, threads[].msgs[].from, .ts: the worker's own
  - threads[].msgs[].text: words (stored lines, cleaned when written)
  - offers[].buyerId, gold, at, expiresAt, reply: the worker's own
- **Absent, and a bad value**: payload missing -> read as {} -> ignored (no listing matches); gone -> 'That listing has ended.' and no threads; threads or offers not arrays -> empty
- **Notes**: a buyer gets their own conversation only (none until they have written); a seller gets every buyer's; the offers go to whoever asks (store_dm_open's found)

#### `store_dm_error` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:634 processGameEvent -> src/ui/mobile/storeChatBus.js setErr
- **Sent from**: server/src/storechat.js:229 ('too-fast') | :233 ('gone') | :243, :250 ('no-thread') | :254 ('too-many')
- **Envelope, and to whom**: alone ; to the sender of the refused store_dm
- **The phone's own check**: none checked (and not matched to the open listing: the line shows whichever thread is open)
- **Who starts it**: the system (answering store_dm)
- **What the phone does**: shows (one line of the phone's own words for the reason)
- **Id it echoes**: none
- **Fields**:
  - listingId: echo (not read by the phone)
  - reason: the worker's own (a code; the phone has the words)
- **Absent, and a bad value**: payload missing -> read as {} -> 'The store could not send that.'; an unknown reason -> the same

#### `store_offer_state` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:639 processGameEvent -> src/ui/mobile/storeChatBus.js setOffers
- **Sent from**: server/src/storeoffer.js:406-407 _soNotify (the seller on a new, raised or withdrawn offer; the buyer and the seller on a reply) | :418 (answering store_offer) | :428 (store_offer_cancel) | :440 (store_offer_reply, with sold)
- **Envelope, and to whom**: alone ; to the asker, the listing's seller and the buyer concerned
- **The phone's own check**: none checked by the case; the bus ignores it for any listing but the one open
- **Who starts it**: the system (answering store_offer, store_offer_cancel, store_offer_reply; and to the other side when one of them changes the offers)
- **What the phone does**: sets the phone's copy of the offers on the open listing (whose gold is held, and each one's answer); sold shows 'Sold.'
- **Id it echoes**: none (matched by listingId)
- **Fields**:
  - listingId: echo
  - offers[].buyerId, gold, at, expiresAt, reply: the worker's own
  - offers[].buyerName: words (a buyer's character name, the worker's copy)
  - sold: the worker's own
- **Absent, and a bad value**: payload missing -> read as {} -> ignored; offers missing or not an array -> no offers
- **Notes**: the list is every offer on the listing, whoever receives it (store_offer's found); offers refunded by a sale through Buy or a bid are told by mail only (store.js _stSettle -> _soReleaseAll), no store_offer_state

#### `store_offer_error` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:642 processGameEvent -> src/ui/mobile/storeChatBus.js setOfferErr
- **Sent from**: server/src/storeoffer.js:417, :427, :439 (a refused offer, withdrawal or reply) | server/src/fightlock.js:177 (the router's fight lock on store_offer)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked by the case; the bus ignores it for any listing but the one open
- **Who starts it**: the system (answering store_offer, store_offer_cancel, store_offer_reply)
- **What the phone does**: shows (the refusal as the worker worded it)
- **Id it echoes**: none (matched by listingId)
- **Fields**:
  - listingId: echo
  - error: the worker's own (a fixed sentence, e.g. 'That listing has ended', 'Not enough gold', 'Not while you are fighting a player'; shown as it is, no player's words in it)
- **Absent, and a bad value**: payload missing -> read as {} -> ignored; error missing -> 'The store could not take that offer.'

### 5.K1 wagers: the hall, Ace, the jackpot, the arena (13)

#### `gamble_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:743 processGameEvent
- **Sent from**: server/src/gamble.js:310 (in _handleGambleRequest)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (needs S.rpg, else ignored)
- **Who starts it**: the system (answering gamble_request)
- **What the phone does**: shows (a popup, a shake, the win or loss sound); sets S._gambleResult for the panel; adds to the phone's own tallies (S.rpg._compStats). The gold comes by player_state, never from this
- **Id it echoes**: none
- **Fields**:
  - won: the worker's own (its roll)
  - wager: echo (floored)
  - payout: the worker's own (twice the wager, or 0)
- **Absent, and a bad value**: a missing number reads as 0; no S.rpg -> nothing
- **Notes**: sent after the save; a refusal sends player_state instead, never this

#### `ace_flip_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:771 processGameEvent -> aceFlipBus.settle (src/ui/mobile/aceFlipBus.js)
- **Sent from**: server/src/gamble.js:273 (in _handleAceFlipRequest)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked (needs S.rpg, else ignored)
- **Who starts it**: the system (answering ace_flip_request)
- **What the phone does**: shows (the panel's coin strip, a popup, a shake, the win or lose sting); adds to the phone's own tallies. The gold comes by player_state
- **Id it echoes**: none
- **Fields**:
  - won: the worker's own (its flip)
  - stake: echo (floored)
  - risk: the worker's own (3x the stake)
  - delta: the worker's own (signed)
- **Absent, and a bad value**: a missing number reads as 0; no S.rpg -> nothing

#### `ace_item_flip_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:809 processGameEvent -> aceFlipBus.settleItems (src/ui/mobile/aceFlipBus.js)
- **Sent from**: server/src/gamble.js:230 (in _handleAceItemFlipRequest)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering ace_item_flip_request)
- **What the phone does**: shows (the panel's result, a popup, a shake, the sting). The bag comes by player_state: nothing here adds or takes an item
- **Id it echoes**: none
- **Fields**:
  - won: the worker's own
  - items: the worker's own (what was really staked, key -> quantity, after its clamps; the keys are the request's that passed)
  - kinds, total: the worker's own
- **Absent, and a bad value**: a missing total reads as 0

#### `ace_board` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:829 processGameEvent -> aceFlipBus.setBoard (src/ui/mobile/aceFlipBus.js)
- **Sent from**: server/src/gamble.js:167 _aceBoardSend ; called at server/src/join.js:1675 (every join), server/src/gamble.js:287 (after a coin flip), server/src/gamble.js:173 (ace_board_request)
- **Envelope, and to whom**: alone ; to the asker or the joiner
- **The phone's own check**: none checked
- **Who starts it**: the system (answering ace_board_request or ace_flip_request, and on every join)
- **What the phone does**: sets the phone's copy of Ace's board (drawn by the Ace panel and the leaderboards page); speaks (it carries other players' names)
- **Id it echoes**: none
- **Fields**:
  - wins[], losses[]: at most ten rows each
  - row.pid, amount, kind, at, lv, gone: the worker's own
  - row.name: words (that player's character name, from char:\<pid> or the live state at the moment of the flip; kept as it then was)
  - row.look: look (that character's stored look, char:\<pid>.look, as snapshotted at the flip; passed on whole)
- **Absent, and a bad value**: the phone stores what it is given; the worker sends empty lists when the record is missing

#### `arena_match_start` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4637 processGameEvent -> lockOntoDuelOpponent
- **Sent from**: server/src/gladiator.js:409 (in _arenaTryActivate, to both fighters) ; server/src/gladiator.js:432 (in _arenaOnRejoin, after state_sync: server/src/join.js:1997)
- **Envelope, and to whom**: alone ; to each of the match's two fighters
- **The phone's own check**: none checked
- **Who starts it**: the system (on a bracket's match starting, or a fighter's rejoin)
- **What the phone does**: starts a phase on the phone: puts it in a duel with the opponent (S._activeDuel, S._inDuel with the arena's match, round and deadline), locks onto them, and shows a popup, a shake and a sound; speaks (the opponent's name)
- **Id it echoes**: none
- **Fields**:
  - matchId, tid, round, opponentId, deadline: the worker's own
  - opponentName: words (as arena_stake_placed's targetName)
  - rejoin: the worker's own (not read by the phone's case: a rejoin replays the popup)
- **Absent, and a bad value**: no opponentId -> the popup only, no duel; no opponentName -> '???'; no round -> 1
- **Notes**: duel_end clears what this sets; the match is a wager-0 duel on the worker (gladiator.js:397)

#### `arena_match_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4678 processGameEvent
- **Sent from**: server/src/gladiator.js:690 (eventBuffer, in _arenaOnMatchResolved)
- **Envelope, and to whom**: in the tick's events ; to everyone
- **The phone's own check**: none checked
- **Who starts it**: the system (on a match's end: a kill, a forfeit, the clock, a walkover)
- **What the phone does**: shows (a popup and a sound, on the winner's and the loser's phones only; every other phone does nothing)
- **Id it echoes**: none
- **Fields**: tid, matchId, round, winner, loser, how: the worker's own (the duel's own result, never a phone's word)
- **Absent, and a bad value**: no how -> 'kill'
- **Notes**: the window's bracket comes from GET /api/arena/status, not from this

#### `arena_tournament_complete` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4689 processGameEvent
- **Sent from**: server/src/gladiator.js:774 (eventBuffer, in _arenaCrown)
- **Envelope, and to whom**: in the tick's events ; to everyone
- **The phone's own check**: none checked
- **Who starts it**: the system (on the last match's end)
- **What the phone does**: clears the phone's copy of the stake board; on the champion's phone adds 'Gladiator' to the phone's own titles (S.rpg._titles) and shows the crown; on every other phone shows a popup naming the champion; speaks (the champion's name)
- **Id it echoes**: none (the prize is paid once under opId arenapot:\<tid>, gladiator.js:785)
- **Fields**:
  - tid: the worker's own (not read by the case)
  - champion.playerId: the worker's own
  - champion.playerName: words (as arena_stake_placed's targetName)
  - champion.prize, champion.ap: the worker's own (not read by the case)
- **Absent, and a bad value**: no champion -> the board is cleared, nothing shown
- **Notes**: the title is granted by the phone to itself on this message; the worker keeps no title, only the Gladiator achievement (gladiator.js:789)

#### `arena_stake_placed` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1868 processGameEvent -> markStakePlaced (src/game/arenaStakes.js)
- **Sent from**: server/src/gladiator.js:546 (in _handleArenaSponsor)
- **Envelope, and to whom**: alone ; to the sponsor
- **The phone's own check**: needs a payload
- **Who starts it**: the system (answering arena_sponsor)
- **What the phone does**: shows (a popup, a sound); marks the bet the phone drew at the tap as placed, so a later refusal cannot take it off; speaks (a fighter's name)
- **Id it echoes**: none
- **Fields**:
  - matchId: the worker's own
  - targetId: echo
  - amount: echo (floored)
  - targetName: words (the fighter's name as THEIR arena entry sent it)
- **Absent, and a bad value**: no payload -> nothing; no targetName -> 'a gladiator'

#### `arena_stake_error` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1901 processGameEvent -> dropRefusedStake (src/game/arenaStakes.js)
- **Sent from**: server/src/gladiator.js:487 (the handler's refusals) ; server/src/fightlock.js:166 (the router's fight lock, code 'fight')
- **Envelope, and to whom**: alone ; to the sponsor
- **The phone's own check**: none checked
- **Who starts it**: the system (answering arena_sponsor)
- **What the phone does**: shows (the refusal's line, the denied sound); takes the refused, still-pending bet off the phone's screen
- **Id it echoes**: none (targetId and matchId name which bet is refused)
- **Fields**:
  - code, message: the worker's own (fixed lines; two carry the stake's bounds or the amount asked)
  - targetId: echo (only a string of 64 characters or fewer)
  - matchId: the worker's own (when a match was found)
- **Absent, and a bad value**: no message -> 'Stake rejected'; no payload -> the popup only

#### `arena_stake_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1881 processGameEvent
- **Sent from**: server/src/gladiator.js:605 (in _arenaSettleStakes)
- **Envelope, and to whom**: alone ; to each sponsor of the resolved match who is connected
- **The phone's own check**: needs a payload
- **Who starts it**: the system (on a match's result)
- **What the phone does**: shows (a popup, the win or loss sound); adds to the phone's own tallies (S.stats._betsWon, _compStats). The gold comes by _creditPlayer and player_state
- **Id it echoes**: none (the payout is paid once under opId arenastakewin:\<tid>:\<matchId>:\<sponsor>)
- **Fields**: matchId, targetId, won, amount, payout: the worker's own (payout: the stake back plus its share of the losing stakes, or 0)
- **Absent, and a bad value**: no payload -> nothing; a missing number reads as 0
- **Notes**: an offline sponsor gets no such message; the payout waits in the mail

#### `arena_stake_board` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:1911 processGameEvent
- **Sent from**: server/src/gladiator.js:664 (eventBuffer, in _arenaBroadcastStakeBoard; after each stake placed, 550, and each match settled, 611)
- **Envelope, and to whom**: in the tick's events ; to everyone
- **The phone's own check**: none checked
- **Who starts it**: the system (on a stake placed or settled)
- **What the phone does**: sets the phone's copy of the spectators' board (S._arenaStakeBoard, drawn by the arena window); speaks (the fighters' names)
- **Id it echoes**: none
- **Fields**:
  - tid: the worker's own
  - board[]: one row an open match with a stake
  - row.matchId, round, aId, bId, aTotal, aBackers, bTotal, bBackers: the worker's own (summed from the arena_stake: records; no sponsor's id or amount)
  - row.aName, bName: words (as arena_stake_placed's targetName)
- **Absent, and a bad value**: board missing or not an array -> an empty board

#### `jackpot_state` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:838 processGameEvent
- **Sent from**: server/src/cadence.js:144 (in _jackpotSend) ; called at server/src/join.js:1671 (every join) and server/src/cadence.js:190 (after a deposit)
- **Envelope, and to whom**: alone ; to the joiner or the depositor
- **The phone's own check**: none checked
- **Who starts it**: the system (answering jackpot_deposit, and on every join)
- **What the phone does**: sets the phone's copy of the pool and of its own tickets (S._jackpotPool, S._jackpotTickets); after a deposit shows a popup and a sound
- **Id it echoes**: none
- **Fields**:
  - period, pool, yourTickets: the worker's own (from jackpot:draw)
  - playerId: the worker's own (the receiver's id)
  - deposited: echo (the amount just taken; absent on a join)
- **Absent, and a bad value**: a missing pool or count reads as 0; no deposited -> no popup

#### `jackpot_result` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:852 processGameEvent
- **Sent from**: server/src/cadence.js:234 (eventBuffer, in _jackpotMaybeResolve; run from a join, a deposit and the tick's slot at server/src/tick.js:414)
- **Envelope, and to whom**: in the tick's events ; to everyone (eventplace.js places no jackpot type)
- **The phone's own check**: none checked
- **Who starts it**: the system (on the first activity after the week ends)
- **What the phone does**: shows (a popup naming the winner and the pot, the winner's fanfare or everyone else's chime); clears the phone's copy of the pool and its tickets; speaks (it carries a player's name)
- **Id it echoes**: none (the pot itself is paid once under opId jackpotwin:\<period>, cadence.js:227)
- **Fields**:
  - period, amount, winnerId: the worker's own
  - winnerName: words (the winner's session name as the join cleaned it, or 'An offline hero' when they are not connected, cadence.js:240); no look
- **Absent, and a bad value**: no winnerName -> 'Someone'; no amount -> 0
- **Notes**: only phones connected at the draw hear it; the winner's gold rides _creditPlayer (live, or the mail); the phone builds its sentence from the parts

### 5.K2 the daily rewards, the wheel, the chests (8)

#### `chest_opened` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2147 direct -> src/networking/wsClient.js:4292 _applyLootCredit ; src/ui/mobile/ChestReveal.jsx:43 prize
- **Sent from**: server/src/dailychest.js:140
- **Envelope, and to whom**: alone; to the asker
- **The phone's own check**: none checked; needs payload.prize
- **Who starts it**: the system (answering chest_open)
- **What the phone does**: shows the prize (the reveal window, a gold popup); sets the phone's copy of its armour stash (an armour prize is added to armorStash or legsStash from this message; coins and bag goods ride the player_state that follows)
- **Id it echoes**: none (the request's opId is not echoed)
- **Fields**:
  - prize.kind: the worker's own (coins, fish, gem or armor)
  - prize.coins: the worker's own
  - prize.invKey, prize.count: the worker's own
  - prize.piece: the worker's own (name, mat, slot, tierMult, quality and its gear_prov id)
  - streak: the worker's own (the login streak the coins were rolled at)
- **Absent, and a bad value**: no prize -> nothing happens (the window gives up after its 8 s and offers the chest again)

#### `loginspin_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2136 direct -> src/game/loginSpinWheel.js:72 state
- **Sent from**: server/src/loginspin.js:174 (the ask's answer), server/src/loginspin.js:187 (a spin off safe ground), server/src/loginspin.js:192 (the day is spent), server/src/loginspin.js:219 (a round from a character that did not spin); all through server/src/loginspin.js:105 _loginSpinSend
- **Envelope, and to whom**: alone; to the asker
- **The phone's own check**: none checked (no test for a relayed copy)
- **Who starts it**: the system (answering loginspin_ask, or refusing loginspin_go, loginspin_double or loginspin_collect)
- **What the phone does**: sets the phone's copy of "may this account spin today" (the top bar's button; the window opening by itself); safe:false stamps a refusal the window words
- **Id it echoes**: none
- **Fields**:
  - avail: the worker's own (lspin:\<acct>.day is not today)
  - day: the worker's own (the UTC day's number)
  - safe: the worker's own (false only: not on safe ground)
  - held: the worker's own (true: a double refused, the pot still held)
- **Absent, and a bad value**: no payload -> avail read as false; a missing field reads as false

#### `loginspin_result` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2138 direct -> src/game/loginSpinWheel.js:88 result
- **Sent from**: server/src/loginspin.js:205 (the spin), server/src/loginspin.js:191 (the same character asking again at k 0)
- **Envelope, and to whom**: alone; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering loginspin_go)
- **What the phone does**: sets the phone's copy of the spin (the wheel turns to idx, then offers the double or the take) and marks the day spent
- **Id it echoes**: none
- **Fields**:
  - idx: the worker's own (the segment rolled)
  - base: the worker's own (its coins)
  - pot: the worker's own (held, not yet paid)
  - k: the worker's own (doubles so far)
  - open, can: the worker's own (a pot is open; a double is offered)
- **Absent, and a bad value**: no payload, or idx not a number -> ignored; another field missing reads as 0 or false
- **Notes**: no gold has moved when this arrives: the pot is in lspin:\<acct>

#### `loginspin_round` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2140 direct -> src/game/loginSpinWheel.js:95 round
- **Sent from**: server/src/loginspin.js:242 (a double's outcome, or the collect), server/src/loginspin.js:222 (a round already played, said again), server/src/loginspin.js:230 (a double at the limit)
- **Envelope, and to whom**: alone; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering loginspin_double or loginspin_collect)
- **What the phone does**: sets the phone's copy of the round (the window plays the win, the loss or the take); the gold rides the player_state that follows a pay
- **Id it echoes**: k: the round the pot now stands at; the phone sends it back as the next loginspin_double or loginspin_collect's k
- **Fields**:
  - idx, base, pot, k, open, can: the worker's own (as loginspin_result)
  - win, lost, collected: the worker's own
  - replay: the worker's own (true: nothing was rolled, the record is said again)
- **Absent, and a bad value**: no payload, or pot not a number -> ignored

#### `rewards_state` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2129 direct -> src/game/dailyRewards.js:239 applyRewardsState
- **Sent from**: server/src/dailyrewards.js:1155 (in _drSendState, line 1140: after every act, a finished quest, a new day online), server/src/join.js:1983 (at the join)
- **Envelope, and to whom**: alone; to the one player
- **The phone's own check**: none checked; needs an object payload
- **Who starts it**: the system (answering rewards_get, daily_spin, daily_reroll or season_claim; at the join; when a daily quest finishes; at the UTC day's turn for a player online)
- **What the phone does**: sets the phone's copy of the daily rewards whole (S._dailyRewards: the spin and its pot, the streak, the quests, the season); shows toasts and plays sounds by news.kind; the gold rides player_state
- **Id it echoes**: none (the request's opId is not echoed)
- **Fields**:
  - v, now, resetAt: the worker's own (its clock; the phone takes its skew from now)
  - spin {on, ready, locked, open, pot, k, i, canDouble, limit, chance, mult, prizes[], extra}: the worker's own
  - streak {n, fz, fzMax, every, saved, best, cap}: the worker's own (cadence:login:\<pid>)
  - dq {on, locked, list[], rr, all, bonus, stars}: the worker's own
  - season {on, s, st, per, endsAt, tiers, cl, ov, ovEvery, spinStars}: the worker's own
  - news: the worker's own (kind spin, daily, reroll, claim, season_end, season_drop, unlocked, newday or spinday); news.act: echo
  - kept: the worker's own (the coins of a pot paid at the day's end)
- **Absent, and a bad value**: no payload, or not an object -> ignored (the last state stands)
- **Notes**: carries the whole season track and the wheel's prizes every time, with the season dropped too | no player's words in it

#### `daily_progress` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2142 direct -> src/game/dailyRewards.js:290 applyDailyProgress
- **Sent from**: server/src/dailyrewards.js:1076 (in _drSendProgress, line 1073; called from _drSignal, line 797)
- **Envelope, and to whom**: alone; to the one player
- **The phone's own check**: none checked
- **Who starts it**: the system (on a kill, a harvest, a cook or a smelt the worker counted towards a daily quest; only with `dailyquests: true`, off today)
- **What the phone does**: sets the phone's copy of one daily quest's count
- **Id it echoes**: none
- **Fields**:
  - i: the worker's own (the quest's place in the day's list)
  - n: the worker's own (its count)
  - g: the worker's own (its goal; the phone does not read it)
- **Absent, and a bad value**: no state yet, i not a number, or no such quest -> ignored; n bad -> 0

#### `spin_board` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2320 direct -> src/game/spinBoard.js:35 onSpinBoard
- **Sent from**: server/src/boards.js:266 (the board), server/src/boards.js:264 (switched off); through server/src/boards.js:254 _boardSend
- **Envelope, and to whom**: alone; to the asker
- **The phone's own check**: refuses a relayed copy (msg.from); needs an object payload
- **Who starts it**: the system (answering spin_board_request)
- **What the phone does**: sets the phone's copy of the board (S._spinBoard) for the Leaderboards page; speaks (it carries other players' names)
- **Id it echoes**: none
- **Fields**:
  - wins[], losses[]: ten rows each at most, one a player
  - row.pid: the worker's own (another player's id; `\<pid>#\<when>` for a deleted character)
  - row.name: words (that player's character name as the worker holds it, chatlanes.js:71 _laneNameOf or the char: record, cut to BOARDS.NAME_MAX)
  - row.look: look (that player's face: the FACE_KEYS of their stored character record, short values only, boards.js:95 boardFace)
  - row.n, k, at, lv, gone: the worker's own
  - off, unavailable: the worker's own
- **Absent, and a bad value**: no payload -> ignored; wins or losses not a list -> an empty list

#### `rise_chest` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2328 direct -> src/game/climbActions.js:260 onRiseChest
- **Sent from**: server/src/risechest.js:95 (in _riseChestSend, line 92)
- **Envelope, and to whom**: alone; to the asker
- **The phone's own check**: refuses a relayed copy (msg.from); needs an object payload
- **Who starts it**: the system (answering rise_chest_open)
- **What the phone does**: shows the chest's words over it, with a sound; sets the phone's mark that this chest is had (S._riseChestGot, on ok or 'got', after which it stops asking); the coins ride inbox_delivered and player_state
- **Id it echoes**: none (id names the chest, not the ask)
- **Fields**:
  - id: echo (the request's id cut to 40, sent back even when unknown)
  - ok: the worker's own
  - coins: the worker's own
  - why: the worker's own (off, none, far or got)
- **Absent, and a bad value**: no payload -> ignored; no id -> the id of the phone's own pending ask; an unknown why -> the chest's plain note

### 5.L1 trades (2)

#### `trade2_state` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4957 processGameEvent (sent alone: by the direct switch's default, src/networking/wsClient.js:4171)
- **Sent from**: server/src/trade2.js:117 _t2Broadcast (every change, to both sides) ; server/src/trade2.js:465 _t2ClearInvites (a declined or dropped invite's other end) ; server/src/rejoinresend.js:68 (a rejoin's live window or waiting invite) ; one-side answers at server/src/trade2.js:141, 147, 182, 490, 521, 558, 638
- **Envelope, and to whom**: alone ; to the two players of the window, or to the one who asked
- **The phone's own check**: needs a payload; a 'busy' refusal is ignored while a live window shows (src/game/tradeSlot.js:90); a late 'declined' or 'gone' after the phone's own leave is hushed (src/game/tradeSlot.js:82); no check of msg.from
- **Who starts it**: the system (answering trade2_open, trade2_set, trade2_ready, trade2_confirm, trade2_cancel, trade2_stage_weapon, trade2_unstage_weapon, trade2_pets; on a disconnect, the tick's expiry, a rejoin, a staged pet renamed)
- **What the phone does**: sets the phone's copy of the trade window ('open' or 'invited': the window draws it whole); 'done' holds the window as a receipt until the player_state echo or 1.5 s; any other state ends the window with a line for its reason; speaks (carries both players' names, each pet's name, and item keys a player typed)
- **Id it echoes**: id: echo, only on the 'gone' answer to a trade2_cancel that named a trade; else none
- **Fields**:
  - id, a, b, state, stage, confirmed, ready, changedAt, changedBy, reason, settled, target, rejoin: the worker's own
  - aName, bName: words (each player's character name, the worker's stored copy)
  - offers: echo (each side's staged {itemKey: qty, _gold} as cleaned, NOT yet held to its bag; a key may be any text of 32)
  - weapons: the worker's own (per side [{seq, weapon}], the escrowed copies)
  - pets: the worker's own (petPublic of each staged pet, its owner-written name with it, or {id, missing})
  - petsMoved: the worker's own (on 'done')
- **Absent, and a bad value**: no payload -> ignored; an unknown state -> taken as a cancel (the window cleared, a line by reason; 'insufficient', 'pet-gone', 'pets-full' shown as a failed trade); nothing in offers, weapons or petsMoved on 'done' -> an empty receipt
- **Notes**: the phone also plays one to itself when the worker never answers a leave ({state:'cancelled', reason:'gone'}, src/networking/wsClient.js:4718); the goods of a 'done' come only by player_state

#### `trade2_invite` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4939 processGameEvent (sent alone: by the direct switch's default)
- **Sent from**: server/src/trade2.js:181 (in _handleTrade2Open, to the target) ; server/src/rejoinresend.js:86 (a live invite said again after a rejoin, rejoin: true)
- **Envelope, and to whom**: alone ; to the invited player
- **The phone's own check**: needs payload.from; an invite from a player this phone blocked is dropped before the switch (src/game/blockedAsks.js:40); no check of msg.from
- **Who starts it**: the system (on another player's trade2_open toward this one)
- **What the phone does**: sets the phone's trade window to the invite card (its Trade sends trade2_open back, its Decline trade2_cancel); a line and a sound, not on a rejoin's copy; speaks (carries the inviter's name)
- **Id it echoes**: none
- **Fields**:
  - from: the worker's own (the inviter's session id)
  - fromName: words (the inviter's character name, the worker's stored copy)
  - rejoin: the worker's own
- **Absent, and a bad value**: no payload or no from -> ignored; no fromName -> 'Someone'
- **Notes**: the line "\<name> wants to trade!" is put together on the phone from fromName (gameEvents.js:4953), not sent as a sentence

### 5.L2 duels, threats, the clan invite (4)

#### `duel_end` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4772 processGameEvent
- **Sent from**: server/src/duel.js:255 _resolveDuel (the push is line 263; called by duel.js:246 _duelOnDeath, and by _tickDuels for a forfeit and the clock)
- **Envelope, and to whom**: in the tick's events ; to everyone (eventplace.js has no row); a phone acts only when winner or loser is its own id
- **The phone's own check**: none checked (acts only for its own id; an arena duel only if the end names its current opponent, gameEvents.js:4796)
- **Who starts it**: the system (on a duel's end: a kill, a death to anything else, a forfeit after DUEL.GRACE_MS off the line or in another zone, the clock)
- **What the phone does**: ends the duel on the phone (clears _inDuel, _activeDuel and the lock, drops the shield); shows 'DUEL WON! +\<2x wager>g', 'Duel lost -\<wager>g' or 'Duel forfeited' with a sound; an arena match's is cleared quietly
- **Id it echoes**: none
- **Fields**:
  - winner, loser: the worker's own (player ids)
  - wager: the worker's own (the challenge's stake)
  - how: the worker's own ('kill', 'death', 'forfeit', 'timeout')
  - arena: the worker's own (true for an arena match)
- **Absent, and a bad value**: neither id is this phone's -> nothing; wager 0 or absent -> no gold in the line; any how but 'forfeit' reads as lost
- **Notes**: carries no gold: the pot arrives by player_state or mail (opId duelpot:\<id>, duel.js:280); the phone's line computes the amount itself

#### `threat_penalty` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4899 processGameEvent
- **Sent from**: server/src/threat.js:155 _threatSend (in _interceptThreat's guards branch)
- **Envelope, and to whom**: alone ; to the threatener
- **The phone's own check**: needs a payload; nothing else checked
- **Who starts it**: the system (answering threat_response 'guards') -- never today: no threat can be recorded while OPEN_PVP is false
- **What the phone does**: shows '-\<levy>G guard fine!' and 'Gear locked 30m by the guards!' with a sound; clears the phone's own red skull
- **Id it echoes**: none
- **Fields**:
  - levy: the worker's own (the gold taken)
  - lockUntil: the worker's own, not read by the phone (its line says 30m)
  - by: the worker's own (the responder's id), not read by the phone
- **Absent, and a bad value**: no payload -> nothing; levy 0 or absent -> the lock line alone
- **Notes**: the gold and the lock are the worker's (player_state, gearlock:); this is the notice

#### `threat_expired` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4917 processGameEvent
- **Sent from**: server/src/threat.js:181 _threatSend (in _tickThreats: to the threatener {target, attackable}, and line 182 to the target {from, attackable})
- **Envelope, and to whom**: alone ; to each of the pair
- **The phone's own check**: none checked
- **Who starts it**: the system (on a threat's countdown running out unanswered) -- never today, as threat_penalty
- **What the phone does**: shows 'Threat expired - fight is on!'; sets the white skull for PVP_THREAT_CONSENT_MS (the other's mark when from is given, the phone's own when target is)
- **Id it echoes**: none
- **Fields**:
  - from: the worker's own (the threatener's id, on the target's copy)
  - target: the worker's own (on the threatener's copy)
  - attackable: the worker's own, not read by the phone
- **Absent, and a bad value**: no payload -> the popup alone
- **Notes**: the consent pair itself is the worker's (threat.js:180); bystanders get nothing and whiten the mark on their own clock

#### `duel_resume` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2347 direct -> src/game/rejoinSlots.js:97 duelResume
- **Sent from**: server/src/rejoinresend.js:54 _duelResend (the send is line 60; called from server/src/join.js:2001 _rejoinResend, right after state_sync)
- **Envelope, and to whom**: alone ; to the joining socket only
- **The phone's own check**: refuses a relayed copy (msg.from); needs payload.foe
- **Who starts it**: the system (on a join whose player has a live duel that is not an arena match)
- **What the phone does**: sets the phone's duel again (_inDuel, _activeDuel, the lock on the foe), with no 'DUEL STARTED!'
- **Id it echoes**: none
- **Fields**:
  - foe: the worker's own (the opponent's id)
  - foeName: words (the foe's character name, the worker's copy; '' when the foe has no state)
  - wager: the worker's own
- **Absent, and a bad value**: no payload or no foe -> nothing; foeName absent -> ''; wager absent -> 0
- **Notes**: cap rejoinResend (REJOIN.COUNT; the phone clears its duel at state_sync only at that count: src/game/rejoinSlots.js); live flag rejoinresend; an arena match is re-sent by the arena's own message

### 5.M1 the party and the alliance (7)

#### `party_state` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:5145 processGameEvent (through the direct switch's default)
- **Sent from**: server/src/party.js:319 _partyBroadcast (a roster change; every PARTY.VITALS_MS from _tickParties; a member's join or disconnect; the alliance's moments); server/src/party.js:540 _partyRemoveMember (the end: state 'none'); server/src/clanparty.js:175 (a clan turned party)
- **Envelope, and to whom**: alone ; to every online member of the party; the end goes to the one removed
- **The phone's own check**: needs a payload; nothing else checked
- **Who starts it**: the system (on party_accept, party_leave, party_kick, alliance_name, alliance_war; every 2 s while a member is on; a member's join or disconnect; a war's kill and end)
- **What the phone does**: sets the phone's copy of the party (S._party and the HUD: the roster, the leader, each member's health, level and zone across zones); state 'none' clears it and shows why; shows the alliance's moments over you and as a system chat line, with a cue; speaks (members' names, the alliance's name and tag, a war's last kills by name)
- **Id it echoes**: none
- **Fields**:
  - id, leader, state, max: the worker's own
  - members[] id, level, hp, maxHp, zone, away, dead, off, seen, act: the worker's own (from playerState, or the stored meta for one offline)
  - members[].name: words (each member's character name, the worker's copy, cut to PARTY.NAME_MAX when stored)
  - ally on, since, active, at, drop, renameIn, warIn, clan: the worker's own
  - ally.name, ally.tag: words (the leader's, cleaned by allyName and allyTagOk)
  - ally.war us, them.score, endsIn, fought: the worker's own; them.tag, them.name: words (the other leader's); kills[].k, .v: words (the killer's and the victim's names)
  - joined, removed, reason, became, renamed, war, fromClan: the worker's own (what just happened)
- **Absent, and a bad value**: no payload -> ignored; anything but state 'open' with members -> the party is cleared and a line shown (an unknown reason reads 'Party ended'); no ally -> no alliance part
- **Notes**: the whole roster to every online member every 2 s (up to PARTY.KEEP_MAX members each way); the phone skips the redraw when nothing changed (sameWire); every member sees every other member's zone

#### `party_invited` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:5109 processGameEvent
- **Sent from**: server/src/party.js:378 _handlePartyInvite (sent at 424)
- **Envelope, and to whom**: alone ; to the invited player
- **The phone's own check**: needs payload.from; dropped before the switch when the sender is on the phone's own block list (src/game/blockedAsks.js:42)
- **Who starts it**: the system (answering another player's party_invite)
- **What the phone does**: shows the invite card (PartyHUD: Join or Decline), a line over you and a chime; the card clears itself after PARTY_INVITE_TTL_MS; speaks (the inviter's name)
- **Id it echoes**: none (the answer names `from` as its target)
- **Fields**:
  - from: the worker's own (the inviter's session id)
  - fromName: words (the inviter's character name, the worker's copy)
  - partySize: the worker's own
- **Absent, and a bad value**: no payload or no from -> ignored; no fromName -> 'Someone'; no partySize -> 1
- **Notes**: the phone builds '\<fromName> invites you to a party!' itself: the wire carries the parts, not a sentence; a blocked inviter is still sent by the worker and dropped on the phone

#### `party_error` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:5189 processGameEvent
- **Sent from**: server/src/party.js:378 _handlePartyInvite (387 to 399); server/src/party.js:431 _handlePartyAccept (454 to 480); server/src/party.js:514 _handlePartyDecline (520, to the inviter)
- **Envelope, and to whom**: alone ; to the asker; 'declined' to the inviter
- **The phone's own check**: needs a payload; nothing else checked
- **Who starts it**: the system (answering party_invite or party_accept; 'declined' on the other player's party_decline)
- **What the phone does**: shows one line over you (display only); speaks (a player's name on declined and target-busy)
- **Id it echoes**: none
- **Fields**:
  - reason: the worker's own (target-gone, not-loaded, target-busy, full, expired, busy, declined)
  - name: words (the other player's character name, the worker's copy)
- **Absent, and a bad value**: no payload -> ignored; an unknown reason -> 'Party action failed'; no name -> 'They'
- **Notes**: the words are the phone's; target-gone and target-busy tell any joined asker whether a player id is in the room and in a party

#### `party_chat` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:603 processGameEvent -> src/game/chat.js:407 handlePartyChatEvent
- **Sent from**: server/src/party.js:339 _handlePartyChat (sent at 374)
- **Envelope, and to whom**: alone ; to each online member of the sender's party who has not muted the sender (server/src/chatmod.js:141 _chatModMuted), the sender included
- **The phone's own check**: needs payload.from; drops its own (from is this phone's id); dropped when the sender is blocked (src/game/blockedAsks.js:34, and chat.js:415); a sender muted on this phone reads '[muted]'
- **Who starts it**: the system (answering a member's party_chat)
- **What the phone does**: shows the line in the chat log with the party's mark, and a bubble over the speaker; speaks
- **Id it echoes**: none
- **Fields**:
  - from: the worker's own (the sender's session id)
  - fromName: words (the sender's character name, the worker's copy; clamped again on the phone)
  - text: words (the sender's line as the worker cleaned it; clamped again on the phone)
  - ts: the worker's own (the phone does not read it)
- **Absent, and a bad value**: no payload or no from -> ignored; text empty after the phone's clamp -> ignored

#### `alliance_rows` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2499 direct -> src/game/alliance.js:128 apply
- **Sent from**: server/src/alliance.js:548 _handleAllianceBoard (sent at 573)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering alliance_board)
- **What the phone does**: sets the phone's copy of the board (allyBus.board, drawn by the Saloon); speaks (alliances' names and tags)
- **Id it echoes**: none
- **Fields**:
  - rows[] name, tag: words (each alliance's leader's, cleaned at the worker by allyName and allyTagOk)
  - rows[] active, total, members: the worker's own
  - n: the worker's own (how many alliances there are)
  - mine: null, or rank, name, tag, active, total, members of your own (the worker's own; name and tag as above)
- **Absent, and a bad value**: no payload, or rows not a list -> an empty board; n -> 0; mine -> null
- **Notes**: at most ALLIANCE.BOARD_TOP rows; only parties that are alliances now are listed

#### `alliance_error` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2500 direct -> src/game/alliance.js:128 apply (its words: src/game/alliance.js:83 allyErrorText)
- **Sent from**: server/src/alliance.js:152 _allyError
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering alliance_name, alliance_war or alliance_board)
- **What the phone does**: shows the refusal over you and in the Saloon (allyBus.error); display only
- **Id it echoes**: none
- **Fields**:
  - reason: the worker's own (off, no-party, not-leader, not-alliance, bad-name, bad-tag, rename-wait, not-loaded, tag-taken, name-taken, no-name, self, no-such, not-alliance-them, at-war, them-at-war, rest, rest-them)
  - active, at, ms: the worker's own
  - tag, name: echo (the asker's own request, cleaned; the phone shows the tag only in the worker's shape and the name cut to 16)
- **Absent, and a bad value**: an unknown reason -> 'That did not work'; no tag -> '[?]'
- **Notes**: the words are the phone's (ERR in src/game/alliance.js); the wire carries a reason and its parts

#### `alliance_war_end` (worker to phone)

- **The phone's handler**: src/networking/wsClient.js:2501 direct -> src/game/alliance.js:128 apply (its words: src/game/alliance.js:90 allyWarEndText)
- **Sent from**: server/src/alliance.js:492 _allyResolveWar (sent at 537)
- **Envelope, and to whom**: alone ; to every online member of each side's party that is in memory, whether they fought or not
- **The phone's own check**: none checked
- **Who starts it**: the system (a war's time is up: the tick, or the next look, server/src/alliance.js:482 _allyWarsLazy)
- **What the phone does**: shows the result over you and as a system chat line, with a cue when won or lost; display only: the gold comes by _creditPlayer (the purse's own echo, or the mail)
- **Id it echoes**: none on the wire (the pay's opId allywar:\<warId>:\<pid> stays in the worker's oplog)
- **Fields**:
  - won (true, false, or null for a draw), us, them (the scores), paid (the gold this player was paid, 0 if none): the worker's own
  - vs: words (the other alliance's tag, the worker's cleaned copy; the phone shows it only in the tag's shape)
- **Absent, and a bad value**: no payload -> an empty line; vs not a tag -> '[?]'; paid 0 or missing -> no gold shown
- **Notes**: sent after the credits are tried; followed by party_state {war:'end'}

### 5.M2 clans and friends (11)

#### `clan_state` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:3954 processGameEvent (reached through wsClient.js:4171 default)
- **Sent from**: server/src/clans.js:119 _clanSendState (called at server/src/join.js:1729 on every join, and after a create, a join, a leave or kick, and a clan's turn into a party)
- **Envelope, and to whom**: alone; to the named player
- **The phone's own check**: none checked
- **Who starts it**: the system (on every join; answering clan_create, clan_join_accept, clan_leave, clan_kick; when clanparty.js turns a clan into a party)
- **What the phone does**: sets the phone's copy of its clan (S._clanData, localStorage bt_clan, the panel's state); null clears all three
- **Id it echoes**: none
- **Fields**: clan: null, or the worker's own record {id, leaderId, members[], createdAt, lastWarEnd} with words {name, tag: the founder's, judged at founding} and look {color1, color2, logo: the founder's phone's, as sent}
- **Absent, and a bad value**: no clan field -> taken as no clan
- **Notes**: TODAY nearly every one is {clan: null}: clans are parties (clanparty.js); the roster is player ids, no names

#### `clan_error` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:3985 processGameEvent
- **Sent from**: server/src/clans.js:128 _clanError
- **Envelope, and to whom**: alone; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering clan_create, clan_join_accept, clan_leave, clan_war_declare)
- **What the phone does**: shows (a red line over the player's head)
- **Id it echoes**: none
- **Fields**: text: the worker's own sentence; three carry a tag: the asker's own typed tag ('Tag [X] is taken', 'No registered clan [X]') or another clan's ('[X] fought a war less than an hour ago ...')
- **Absent, and a bad value**: no text -> nothing shown
- **Notes**: TODAY the one text players meet is CLAN_PARTY.REFUSE, 'Make a party in the Saloon' (server/src/clanparty.js:38)

#### `clan_war_kill` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4011 processGameEvent
- **Sent from**: server/src/clans.js:410 (eventBuffer.push in _warOnDeath, called from server/src/index.js:3415 on a death)
- **Envelope, and to whom**: in the tick's events; to everyone
- **The phone's own check**: the phone holds an active war with this warId (else ignored)
- **Who starts it**: the system (on a PvP death between the two clans inside the war's zone; a duel's kill left out)
- **What the phone does**: sets the phone's copy of the war (adds kill.points to a side's score, appends the kill); shows 'killer -> victim'
- **Id it echoes**: none
- **Fields**:
  - warId, scoreSide, kill.points, kill.ts: the worker's own
  - kill.killer, kill.victim: words (the two players' session names as the worker holds them, else their ids)
- **Absent, and a bad value**: no war on the phone or another id -> ignored; no kill -> throws inside the tick's try
- **Notes**: the phone also SENDS this type from an old self-scoring block, only against a worker without caps.clans (src/networking/gameEvents.js:4605-4627): never against this worker, and the default branch would drop it (privileged)

#### `clan_war_end` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:4022 processGameEvent
- **Sent from**: server/src/clans.js:481 (eventBuffer.push in _resolveClanWar; from the tick, server/src/tick.js:378, or lazily on a wake)
- **Envelope, and to whom**: in the tick's events; to everyone
- **The phone's own check**: the phone holds a war with this warId (its status is not checked)
- **Who starts it**: the system (when the war's clock runs out)
- **What the phone does**: ends the war on the phone (status, winner; cleared 10 s later); shows 'WAR WON!' or 'War lost...' and a pay line
- **Id it echoes**: none
- **Fields**:
  - warId: the worker's own
  - winner: the winning clan's tag (words, the founder's) or null for a draw
  - paid[]: the worker's own (ids of the members it pays)
- **Absent, and a bad value**: no paid list -> the phone takes itself as paid (an older worker's shape); winner null -> read as lost
- **Notes**: the gold itself comes by mail (_creditPlayer, opId clanwar:\<warId>:\<pid>: inbox_delivered and player_state), only to roster members who fought and are still in the clan; a 0-0 war pays nobody

#### `friend_sync` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:655 processGameEvent -> src/ui/mobile/sheet/friendsSync.js:31 setDoc
- **Sent from**: server/src/friends.js:91 _friendsSyncTo (after every friend change, to each side that is online), server/src/friends.js:101 _friendsOnJoin (every join, from server/src/join.js:1649)
- **Envelope, and to whom**: alone; to the named player
- **The phone's own check**: none checked
- **Who starts it**: the system (on every join; answering friend_request, friend_accept, friend_decline, friend_remove, the other side's too)
- **What the phone does**: sets the phone's copy of its friends, requests in and requests out (the whole doc each time); once a browser it then sends friend_request for up to 25 of the old local list (gameEvents.js:659-668)
- **Id it echoes**: none
- **Fields**:
  - list {id: {name, since}}, reqIn {id: {name, at}}: ids and times the worker's own, names words (the other player's name as the worker held it when the request was made)
  - reqOut {id: {name, at}}: name words (the label this player's own phone sent with its request, cleaned)
- **Absent, and a bad value**: a part missing -> taken as empty
- **Notes**: the names are the copy taken at request time; nothing refreshes them

#### `friend_request_in` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:673 processGameEvent
- **Sent from**: server/src/friends.js:147 (in _handleFriendRequest, through _friendsSend)
- **Envelope, and to whom**: alone; to the target, if online
- **The phone's own check**: dropped before the switch when `from` is on the phone's block list (src/game/blockedAsks.js; gameEvents.js:300)
- **Who starts it**: the system (answering another player's friend_request)
- **What the phone does**: shows (a chime only; the request's row comes with the friend_sync sent beside it)
- **Id it echoes**: none
- **Fields**:
  - from: the worker's own (the requester's id)
  - fromName: words (the requester's name as the worker holds it)
  - at: the worker's clock
- **Absent, and a bad value**: nothing is needed: any frame of the type chimes
- **Notes**: an offline target is not sent it; they find the request in friend_sync at their next join

#### `friend_accepted` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:674 processGameEvent
- **Sent from**: server/src/friends.js:166 (in _friendAcceptCore, through _friendsSend)
- **Envelope, and to whom**: alone; to the first requester, if online
- **The phone's own check**: none checked (left out of the block table on purpose: blockedAsks.js NOT_BLOCKED)
- **Who starts it**: the system (answering the other player's friend_accept, or a crossing friend_request)
- **What the phone does**: shows (a chime; the new friend comes with the friend_sync sent beside it)
- **Id it echoes**: none
- **Fields**:
  - by: the worker's own (the accepter's id)
  - byName: words (the accepter's name as the worker holds it)
  - at: the worker's clock
- **Absent, and a bad value**: nothing is needed: any frame of the type chimes

#### `friend_error` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:696 processGameEvent
- **Sent from**: server/src/friends.js:121, 127, 133, 137 (in _handleFriendRequest), server/src/friends.js:229 (in _handleFriendDm)
- **Envelope, and to whom**: alone; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering friend_request or friend_dm)
- **What the phone does**: shows (a toast in the phone's own words for the reason, src/game/friendErrors.js, naming the target from the phone's own list of players near; the same reason again within 5 s is one toast); keeps the last error
- **Id it echoes**: none
- **Fields**:
  - reason: the worker's own (already-friends, too-many-requests, not-found, target-full, not-friends)
  - target: echo (the id the asker named)
- **Absent, and a bad value**: an unknown or missing reason -> the fallback sentence; no target, or one the phone cannot name -> 'That player'
- **Notes**: a code and its part, never a sentence: the shape 11.4 asks for; server/test/friend-errors.test.mjs holds every reason to its words

#### `friend_dm` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:680 processGameEvent -> src/ui/mobile/sheet/friendsSync.js:48 appendDm
- **Sent from**: server/src/friends.js:240 (in _handleFriendDm, through _friendsSend)
- **Envelope, and to whom**: alone; to the named friend, if online (else the line goes to their box: friend_dm_backlog)
- **The phone's own check**: dropped before the switch when `from` is on the phone's block list (src/game/blockedAsks.js); needs payload.from
- **Who starts it**: the system (answering a friend's friend_dm)
- **What the phone does**: speaks; appends the line to the phone's own archive of that thread (localStorage bt_dm:\<from>, 50 kept), counts it unread unless the thread is open, chimes
- **Id it echoes**: none
- **Fields**:
  - from: the worker's own (the sender's id, from the session)
  - fromName: words (the sender's name as the worker holds it)
  - text: words (the sender's, cleaned on the worker: friends.js:217-221)
  - ts: the worker's clock
- **Absent, and a bad value**: no from -> ignored; no ts -> the phone's clock
- **Notes**: the worker keeps no thread: the phone is the archive

#### `friend_dm_backlog` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:688 processGameEvent -> src/ui/mobile/sheet/friendsSync.js:48 appendDm
- **Sent from**: server/src/friends.js:108 (in _friendsOnJoin, from server/src/join.js:1649)
- **Envelope, and to whom**: alone; to the joiner, once, when their box holds lines
- **The phone's own check**: rows from a player on the phone's block list are taken out before the switch (src/game/blockedAsks.js BLOCKED_ROWS)
- **Who starts it**: the system (on a join, for the lines friends sent while the player was away)
- **What the phone does**: speaks; appends each row to its thread's archive and unread count (no chime)
- **Id it echoes**: none
- **Fields**: messages[] {from, fromName, text, ts}: as friend_dm's, stored when each was sent (FRIENDS.DM_BACKLOG_MAX a box, PACE.DM_PER_SENDER_BOX a sender)
- **Absent, and a bad value**: no messages -> nothing; a row with no from -> skipped

#### `clan_war_declare` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:3990 processGameEvent
- **Sent from**: server/src/clans.js:373 (eventBuffer.push in _handleClanWarDeclare, with from: the declarer)
- **Envelope, and to whom**: in the tick's events; to everyone (eventplace.js has no row for it)
- **The phone's own check**: needs payload.war and a clan on the phone; acts only when its clan's tag is the war's defender or challenger
- **Who starts it**: the system (answering clan_war_declare)
- **What the phone does**: starts a phase on the phone (S._activeClanWar: the war it scores kills into); shows two lines, a horn and a shake to the defenders
- **Id it echoes**: none
- **Fields**:
  - war {id, zone, status, startTime, endTime, killLog, challenger and defender {clanId, score, members[], fought[]}}: the worker's own
  - war.challenger and war.defender {tag, name}, challengerTag, defenderTag: words (the founders', judged at founding)
  - id: the declarer, from the worker's `from`
- **Absent, and a bad value**: no war, or no clan on the phone -> ignored; a war with no defender would throw inside the tick's try
- **Notes**: NOT in PRIVILEGED_EVENTS (it is on server/test/wire-audit.test.mjs RELAY_ECHO_ALLOWLIST) and not in RELAY.TYPES. Not a hole today: the type has a router case (index.js:6178), so a phone's copy always goes to _handleClanWarDeclare and never reaches the default branch, whatever `relaylist` says. The phone's case cannot tell the worker's copy from a relayed one, so that router case is the only guard. TODAY never sent: clanparty refuses the declare

### 5.N1 chat (5)

#### `area_chat` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:613 processGameEvent -> src/game/chat.js:346 handleAreaChatEvent
- **Sent from**: server/src/chatlanes.js:145 _handleAreaChat (through chatlanes.js:63 _laneSend)
- **Envelope, and to whom**: alone ; to every connected player whose zone is the speaker's, the speaker too, less those who muted the speaker
- **The phone's own check**: needs payload.from; drops its own (from is this phone's id)
- **Who starts it**: the system (answering area_chat, c2s)
- **What the phone does**: speaks (carries the speaker's line); shows it: a bubble over the speaker's head, a line in the feed under the area mark, a sound, the unread count
- **Id it echoes**: none
- **Fields**:
  - from: the worker's own (the speaker's session id)
  - fromName: words (the speaker's character name as the worker holds it, cleaned at the join: join.js:207 sanitizeDisplayName; the phone clamps it and puts the area mark before it)
  - text: words (the speaker's, cleaned by the worker as the c2s row says; the phone clamps it again)
  - zone, ts: the worker's own; the phone reads neither
- **Absent, and a bad value**: no payload, no from, or an empty text after the phone's clamp -> nothing shown; from a player this phone blocked -> nothing; from one on this browser's old local mute list -> a "[muted]" line, no bubble
- **Notes**: PRIVILEGED, so a phone cannot relay one

#### `whisper` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:618 processGameEvent -> src/game/chat.js:368 handleWhisperEvent
- **Sent from**: server/src/chatlanes.js:191 _handleWhisper (through _laneSend)
- **Envelope, and to whom**: alone ; to the one player the name matched, unless they muted the speaker
- **The phone's own check**: needs payload.from; drops its own
- **Who starts it**: the system (answering whisper, c2s)
- **What the phone does**: speaks (carries the speaker's line); shows it: a line in the feed under the whisper mark, a sound, the unread count; no bubble
- **Id it echoes**: none
- **Fields**:
  - from: the worker's own
  - fromName: words (the speaker's character name as the worker holds it; the phone clamps it)
  - text: words (the speaker's, cleaned by the worker; the phone clamps it again)
  - to, toName, ts: the worker's own (the target's id and name, the worker's clock); the phone reads none of them
- **Absent, and a bad value**: no payload, no from, or an empty text -> nothing shown; from a blocked player, or one on the old local mute list -> dropped (never shown as "[muted]")
- **Notes**: PRIVILEGED; the speaker gets no copy: their phone wrote its own line when it sent

#### `whisper_error` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:645 processGameEvent -> src/game/chat.js:393 handleWhisperErrorEvent
- **Sent from**: server/src/chatlanes.js:170 and server/src/chatlanes.js:173 _handleWhisper (through _laneSend)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering whisper, c2s, when no one or more than one player has the name)
- **What the phone does**: shows (a grey system line in the asker's own feed: "Nobody here is called \<to>." or "More than one player is called \<to> - nothing sent.")
- **Id it echoes**: none
- **Fields**:
  - reason: the worker's own ('no-such-player' or 'ambiguous')
  - to: echo (the name the asker typed, as the worker clamped it)
  - count: the worker's own (how many matched; the phone does not read it)
- **Absent, and a bad value**: no payload or an unknown reason -> the "Nobody here is called ." line; to is clamped by the phone before it goes into the sentence
- **Notes**: the sentence is built on the phone from the asker's own typed name and shown to the asker alone; a whisper stopped by a mute or by the bucket sends no error at all

#### `chat_mute_list` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:718 processGameEvent -> src/game/chatMute.js:204 applyServerMuteList
- **Sent from**: server/src/chatmod.js:247 _chatModOnJoin (at every join: server/src/join.js:1656) and server/src/chatmod.js:239 _chatModSendList (after each chat_mute)
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (on the join; answering chat_mute)
- **What the phone does**: sets the phone's copy of its mute list (replaces this browser's own list; lays any tap not yet agreed over it and sends it once; on the first one moves this browser's old local mutes to the worker); shows "Mute list is full" on error 'list-full'
- **Id it echoes**: none
- **Fields**:
  - list[]: {id, name, at}
  - id: echo (the ids the player muted, as stored)
  - name: the worker's own when the target was connected at the mute, else words (the muter's own label, clamped; chatmod.js:214)
  - at: the worker's own (its clock at the mute)
  - settled: the worker's own (always true)
  - error: the worker's own ('list-full' only)
- **Absent, and a bad value**: no payload or no list -> taken as an empty list (the phone's list is cleared, kept taps aside); a row with no string id is skipped
- **Notes**: sent before the player can be sent a tick, so the first tick is already filtered (chatmod.js:243-246)

#### `chat_report_ack` (worker to phone)

- **The phone's handler**: src/networking/gameEvents.js:726 processGameEvent
- **Sent from**: server/src/chatmod.js:356 _handleChatReport (the yes) and server/src/chatmod.js:325, 332, 335 (the refusals), through chatmod.js:226 _chatModSend
- **Envelope, and to whom**: alone ; to the asker
- **The phone's own check**: none checked
- **Who starts it**: the system (answering chat_report)
- **What the phone does**: shows (a popup over the player: "Report sent to the moderators", "Already reported just now", "Too many reports - try later" or "Report failed"); keeps the last one on S._lastReportAck for a test to read
- **Id it echoes**: id (the new report's own id, made by the worker; nothing reads it back)
- **Fields**:
  - ok: the worker's own
  - error: the worker's own ('bad-target', 'not-found', 'duplicate', 'rate-hour', 'rate-day')
  - id: the worker's own
  - lines: the worker's own (how many of the target's lines it attached)
  - settled: the worker's own
- **Absent, and a bad value**: no payload -> "Report failed"
- **Notes**: the only word a reporter gets; the reported player gets nothing


## 6. HTTP routes

Direction: a request and its answer. One row for each method and path the code tests.

### 6.H1 the room's door, the order book, the auction house (22)

#### `OPTIONS <any path>`

- **Handler**: server/src/index.js:304 routeHttp (answered there; no room, no object)
- **Comes in**: http (anyone)
- **Envelope**: alone: nothing read (no query, no body, no header)
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: the browser's own preflight before a cross-site call; nobody chooses to send it)
- **What it does**: reads (answers 200, empty body, Access-Control-Allow-Origin: \*, Allow-Methods GET/POST/DELETE/OPTIONS, Allow-Headers \*)
- **Request id**: none: a repeat changes nothing (nothing is kept)
- **Fields**: (none read)
- **Absent, and a bad value**: nothing to be absent; every path answers the same, known or not
- **Notes**: tested before the room name is read (index.js:313), so it never wakes the room and never 404s; it is what lets any website call every /api route with the x-bt-auth header (the Origin lock covers /ws only, index.js:320)

#### `GET /ws`

- **Handler**: server/src/index.js:315 routeHttp -> server/src/index.js:4865 GameRoom.fetch (the upgrade: 4916-4966)
- **Comes in**: http (anyone on an allowed Origin; a program that sends no Origin)
- **Envelope**: alone: query room, rf / headers Upgrade, Origin, CF-Connecting-IP / the edge's request.cf (asn, asOrganization); no body
- **What it demands of the caller**: the room is one the worker makes (flood.js:126 roomNameFor, else 404 'no such room'); the Origin is allowed (origin.js:83 originAllowed: the lock off, no Origin, a local host, or a listed site; refused BEFORE any room, index.js:320-322); Upgrade is websocket (index.js:4916, else 426); the room is under its cap (index.js:4943 sessions.size >= join.js:337 _roomCap); the address is under its limits (index.js:4951 -> flood.js:176 _floodIpOk)
- **Who may start it**: never a helper (the account itself) (border: it only opens the game's socket, and pillar 11.7 says the helper door is not the game's socket)
- **What it does**: changes your own state (opens a session: index.js:4963 sessions.set, phase 'open', holds one of the room's places until its join or the join window ends; starts the tick loop if it is the first socket, index.js:4965)
- **Request id**: none: a repeat acts twice (each upgrade is one more socket and one more place held; bounded by FLOOD.IP_SOCKETS, FLOOD.IP_JOINS_PER_MIN and the room cap)
- **Fields**:
  - room: request (judge: flood.js:126 roomNameFor: the main room, a name in env.ROOMS, any name on a local host)
  - rf: request ('1' asks for the refusal on the wire, join.js:351)
  - Upgrade: request (must be 'websocket')
  - Origin: bounded claim (judge: origin.js:83 originAllowed; a browser cannot change it, a program can write any, origin.js:22-25)
  - CF-Connecting-IP: the worker's own (the edge stamps it; flood.js:137 requestIp; absent locally, loopback never counted)
  - request.cf.asn, asOrganization: the worker's own (the edge's word; kept on the session for botsig, index.js:4961-4964)
  - method: not read (no method test on /ws)
- **Absent, and a bad value**: no room -> the main room 'brotown-1'; an unknown room -> 404 {ok:false,error:'no such room'}; no Origin -> allowed as a program ('none'); a refused Origin -> with Upgrade a socket that sends join_rejected {reason:'origin', home} and closes 4015, without it 403 {ok:false,error:'not the official site',home} (origin.js:108-126); no Upgrade -> 426 'Expected WebSocket'; room full or address over its limit -> with rf=1 a socket that sends room_full {reason:'full'|'ip', count, cap, retryMs} and closes 4009, without rf a plain 503 'Room full' (join.js:348-380)
- **Notes**: the phone's call: src/networking/wsClient.js:561 (always with rf=1); wakes the room; awaits _liveFlagsEnsure and _hiddenEnsure (one storage read each a worker's life, index.js:4939-4942); writes nothing; the refusal sockets never enter this.sessions; inside the room the path is not tested again: any request that is not one of the /api prefixes is taken for the upgrade

#### `GET /api/lobby`

- **Handler**: server/src/index.js:341 routeHttp (answered there; no room, no object)
- **Comes in**: http (anyone)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a helper with a grant (read) (border: it names no player and needs no grant at all: one public fact)
- **What it does**: reads (answers {room:'brotown-1'}, a constant)
- **Request id**: none: a repeat changes nothing (a constant)
- **Fields**:
  - (none read)
  - method: not read (any method but OPTIONS gets the same answer)
- **Absent, and a bad value**: nothing to be absent
- **Notes**: the phone's call: src/networking/wsClient.js:377 (before it builds its /ws address); exact path match (pathname === '/api/lobby'); never wakes the room

#### `GET /health`

- **Handler**: server/src/index.js:419 routeHttp (answered there; no room, no object)
- **Comes in**: http (anyone)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a helper with a grant (read) (border: it names no player; in practice only tools call it)
- **What it does**: reads (answers {status:'ok', ts: the worker's clock})
- **Request id**: none: a repeat changes nothing
- **Fields**:
  - (none read)
  - method: not read
- **Absent, and a bad value**: nothing to be absent
- **Notes**: no phone sends it (tools/qa/probe-room.mjs:112 does); says the worker is up, nothing about the room (it never wakes it)

#### `* <any other path>`

- **Handler**: server/src/index.js:423 routeHttp (the fall-through)
- **Comes in**: http (anyone)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: any caller; nothing is started)
- **What it does**: reads (answers 200, the plain text 'Hemi Bros Game Server')
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: an unknown path is NOT a 404: it is a 200 with a line of text, no JSON and no CORS header
- **Notes**: a throw anywhere in routeHttp is answered 500 {ok:false, error: the error's own message} with the CORS headers (server/src/index.js:427-438)

#### `* <a room route>?room=<a room the worker does not make>`

- **Handler**: server/src/index.js:313-314 routeHttp (roomNameFor, noSuchRoom) ; tested at index.js:316, 353, 363, 383, 393, 402, 415
- **Comes in**: http (anyone)
- **Envelope**: alone: query room
- **What it demands of the caller**: none checked (it is the check: before the Origin lock on /ws, before any auth on the others)
- **Who may start it**: a person (border: any caller; nothing is started)
- **What it does**: reads (answers 404 {ok:false, error:'no such room'}; no room is made or woken)
- **Request id**: none: a repeat changes nothing
- **Fields**: room: request (judge: flood.js:126 roomNameFor: absent or blank -> 'brotown-1'; another name only if env.ROOMS lists it; on a local host -- flood.js:118 ROOMS.LOCAL_HOSTS -- any name)
- **Absent, and a bad value**: no room -> the main room, never this answer; applies to /ws and every path starting /api/market, /api/store, /api/botstat, /api/arena, /api/account, /api/admin; /api/lobby, /api/leaderboard, /api/feedback and /health read no room
- **Notes**: tag 3274 (flood.js roomNameFor): before it ?room=\<anything> made a new room, awake and billed, on every route

#### `GET /_room_count`

- **Handler**: server/src/index.js:4870 GameRoom.fetch
- **Comes in**: internal (another server object only: routeHttp hands the room only /ws and the six /api prefixes with their paths unchanged, index.js:315-417, so no outside address arrives here as '/_room_count'; from outside the path gets the fall-through text)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked (answered before the live flags are loaded, index.js:4885)
- **Who may start it**: the system
- **What it does**: reads (answers {count: joined players}, getPlayerCount)
- **Request id**: none: a repeat changes nothing
- **Fields**:
  - (none read)
  - method: not read
- **Absent, and a bad value**: nothing to be absent
- **Notes**: the old lobby's probe of each room (the room scan removed in tag 1112, index.js:326-340)

#### `GET /api/market/orders`

- **Handler**: server/src/index.js:352 -> server/src/index.js:4891 -> server/src/market.js:219 _marketFetch -> server/src/market.js:263 _mktQueryOrders
- **Comes in**: http (anyone)
- **Envelope**: alone: query category, subtype, tier, room; no body
- **What it demands of the caller**: none checked (no token, no session, need not be online)
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (up to 100 resting orders of the book, each the WHOLE record: id, type, taxonomy, price, playerId, playerName, tierLabel, ts, expires and the escrowed weapon blob `item`)
- **Request id**: none: a repeat changes nothing (a read; the sweep it may start is paced by MARKET.SWEEP_INTERVAL)
- **Fields**:
  - category: request (an exact-match filter on order.category)
  - subtype: request (exact match)
  - tier: request (exact match on order.tierKey)
  - room: request (judge: flood.js:126 roomNameFor)
- **Absent, and a bad value**: a missing filter means no filter (all three missing: the first 100 orders of the whole book); a value that matches nothing -> {ok:true, orders:[]}; never refused; a wrong method on this path -> 404 {ok:false,error:'Not found'}
- **Notes**: the phone's call: src/ui/panels/buildings/ExchangePanel.jsx:774; wakes the room; first request after a wake rebuilds the book (market.js:95 _mktEnsureIndex) and every request may run the expiry sweep (market.js:557 _mktSweep: refunds through _creditPlayer and storage deletes); the answer carries the escrowed blob, which store.js:285-289 calls the order book's legacy shape, not one to copy

#### `GET /api/market/my`

- **Handler**: server/src/index.js:352 -> server/src/index.js:4891 -> server/src/market.js:223 _marketFetch -> server/src/market.js:263 _mktQueryOrders
- **Comes in**: http (anyone)
- **Envelope**: alone: query playerId, room; no body
- **What it demands of the caller**: none checked (no token: any caller may name any player)
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (up to 100 resting orders whose playerId is the one named, whole records as /orders)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**:
  - playerId: request (an exact-match filter on order.playerId; not checked against the caller)
  - room: request (judge: roomNameFor)
- **Absent, and a bad value**: no playerId -> no filter: the first 100 orders of the whole book; an unknown id -> {ok:true, orders:[]}; never refused
- **Notes**: the phone's call: src/ui/panels/buildings/ExchangePanel.jsx:1046; every order it shows is also in /orders with its playerId, so it lists nothing that route does not; wakes the room and may sweep, as /orders

#### `GET /api/market/history`

- **Handler**: server/src/index.js:352 -> server/src/index.js:4891 -> server/src/market.js:227 _marketFetch
- **Comes in**: http (anyone)
- **Envelope**: alone: query category, subtype, tier, element1, element2, room; no body
- **What it demands of the caller**: none checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the last MARKET.PRICE_HIST_CAP executed prices of one bucket: {history:[{p,ts}], avg, last}; one storage.get of mkt_hist:\<key>)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**:
  - category, subtype, tier: request (joined into the storage key mkt_hist:\<category>:\<subtype>:\<tier>:\<element1|none>:\<element2|none>; not passed through _mktField, no length or charset bound)
  - element1, element2: request (absent -> 'none')
  - room: request (judge: roomNameFor)
- **Absent, and a bad value**: a missing category, subtype or tier becomes the word 'null' in the key -> finds nothing -> {ok:true, history:[], avg:null, last:null}; a key the storage refuses (too long) throws -> 500 {ok:false, error: the storage's own message} (market.js:258-259)
- **Notes**: wakes the room and may sweep, as /orders; only ever reads under the mkt_hist: prefix

#### `POST /api/market/place`

- **Handler**: server/src/index.js:352 -> server/src/index.js:4891 -> server/src/market.js:233 _marketFetch -> server/src/market.js:289 _mktPlaceOrder
- **Comes in**: http (anyone holding the named player's session token)
- **Envelope**: alone: JSON body {playerId, type, price, category, subtype, tierKey, element1, element2, tierLabel, playerName, stashIndex, item} / header x-bt-auth / query room
- **What it demands of the caller**: a session token (httpauth.js:56 _httpAuthCheck: the named player has a live session in this room, and x-bt-auth equals its token; a session whose join did not say httpAuth is acted for with NO header); has state (market.js:316 'Not in game'); not in a fight with a player (fight lock 'fightlock', the handler refuses: market.js:320 _bagLockedByFight); under MARKET.MAX_ORDERS_PER_PLAYER; alive NOT checked
- **Who may start it**: a helper with a grant (list for a sell order, buy for a buy order)
- **What it does**: moves value out (escrow mkt_order:\<orderId>: a sell's weapon leaves weaponStash, a buy's gold leaves the purse by the gold door 'market_order'; when it crosses a resting order: move to the other side through _creditPlayer, opIds settle:\<makerId>:item|gold|diff); cannot be undone (a crossed order is a settled sale with no take-back; a resting one can be cancelled)
- **Request id**: none: a repeat acts twice (a second order is placed: a sell escrows whatever weapon NOW sits at stashIndex, a buy escrows the price again). stashIndex is A PLACE IN A LIST, not an id (market.js:329-343): after the first sell splices the stash, the same index names the next weapon
- **Fields**:
  - playerId: request (judge: _httpAuthCheck, then playerState)
  - type: request ('buy' or 'sell')
  - price: request (floored; 1..999999)
  - category, subtype, tierKey: for a buy request (the bucket it wants), for a sell claim (bounded only in shape by market.js:81 _mktField: 24 chars of [A-Za-z0-9_-]; nothing checks them against the escrowed weapon, market.js:60-80; 'sword' and wood greatsword rewritten, market.js:302-307)
  - element1, element2: for a buy request (_mktField), for a sell not read (overwritten from the escrowed weapon, market.js:341-342)
  - stashIndex: request (a place in the worker's own weaponStash; the weapon there is taken through _sanitizeWeapon)
  - tierLabel: words (the caller's text, cut to 32; shown on the order and joined into the mail's note, market.js:359, 384)
  - playerName: words (the caller's own word for their name, cut to 24, never compared with the worker's copy; shown to everyone on the order, market.js:360)
  - item: not read (on purpose: rule 16, market.js:280-284)
- **Absent, and a bad value**: body null or no playerId or a wrong/missing token -> 403 {ok:false,settled:true,error:'Not authorized'}; no type or price (0 too) -> {ok:false,error:'Missing fields'}; price outside 1..999999 -> refused 'Invalid price'; type not buy/sell -> 'Invalid type'; a taxonomy field missing or over the shape -> 'Missing fields'; a bad element -> 'Invalid element'; stashIndex missing, not a number or out of range -> 'Item not in stash'; tierLabel absent -> tierKey; playerName absent -> 'Unknown'; a body that is not JSON -> 500 with the parser's message; refusals other than the 403 are HTTP 200 with ok:false
- **Notes**: the phone's call: src/ui/panels/buildings/ExchangePanel.jsx:689; answers {ok, settled:true, matched, order | execPrice, matchedOrder, newOrder}; kill switch for the settle note `mktsettle`; writes: _saveRpg + the order's put (+ the legs' credits on a match); no pace lane; wakes the room

#### `DELETE /api/market/cancel`

- **Handler**: server/src/index.js:352 -> server/src/index.js:4891 -> server/src/market.js:247 _marketFetch -> server/src/market.js:512 _mktCancelOrder
- **Comes in**: http (anyone holding the named player's session token)
- **Envelope**: alone: query id, playerId, room / header x-bt-auth; no body
- **What it demands of the caller**: a session token (httpauth.js:56 _httpAuthCheck on the query's playerId: so the owner must be online); the order is on file and is that player's; NOT fight-locked (market.js:317-319 'Cancelling stays open'); alive not checked
- **Who may start it**: a helper with a grant (list) (takes the player's order down; a buy order's cancel brings its escrowed gold home)
- **What it does**: changes your own state (the escrow comes home through _creditPlayer, opId refund:\<orderId>: the weapon or the gold, to the live player or the mail; then the order record is deleted)
- **Request id**: none: a repeat changes nothing (the record is deleted, so a second cancel answers 'Not found'; the refund itself is stamped refund:\<orderId> in oplog:, and market.js:546-547 never refunds over a settle stamp)
- **Fields**:
  - id: request (an order id; judged against storage mkt_order:\<id> and its playerId)
  - playerId: request (judge: _httpAuthCheck, then order.playerId === playerId)
  - room: request (judge: roomNameFor)
- **Absent, and a bad value**: no playerId or a wrong/missing token -> 403 'Not authorized'; no id -> {ok:false,error:'Missing params'}; an unknown id -> 'Not found'; someone else's order -> 'Not yours'; an order mid-sale (a settle note) is finished, not refunded, and answers 'Not found' (market.js:521-524)
- **Notes**: the phone's call: src/ui/panels/buildings/ExchangePanel.jsx:1150; answers {ok:true, settled:true, cancelled: the order}; writes: the refund's credit and the delete; no pace lane; wakes the room

#### `* /api/market/<anything else>`

- **Handler**: server/src/index.js:352 -> server/src/index.js:4891 -> server/src/market.js:257 _marketFetch (the fall-through)
- **Comes in**: http (anyone)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: any caller; nothing is started)
- **What it does**: reads (answers 404 {ok:false,error:'Not found'})
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: an unknown sub-path, or a known one with the wrong method (POST /orders, GET /place, GET /cancel), gets this 404; the paths are tested with startsWith, so '/orders-x', '/myself' and '/placement' are taken for orders, my and place; any throw -> 500 {ok:false, error: the error's own message} (market.js:258-259)
- **Notes**: still wakes the room, and still runs _mktEnsureIndex and _mktSweep first (market.js:216-217), so a request for nothing costs what a read costs

#### `GET /api/store/browse`

- **Handler**: server/src/index.js:362 -> server/src/index.js:4895 -> server/src/store.js:593 _storeFetch -> server/src/store.js:645 _stBrowse
- **Comes in**: http (anyone)
- **Envelope**: alone: query cat, cursor, limit, room; no body
- **What it demands of the caller**: none checked (no token, no session, need not be online)
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (one page of the shelf, newest first: {listings:[the public view], nextCursor, total}; a listing mid-sale or being taken down is left out)
- **Request id**: none: a repeat changes nothing (a read; the sweep it may start is paced by STORE.SWEEP_INTERVAL)
- **Fields**:
  - cat: request (an exact-match filter on the listing's category; 'all' or absent: every category)
  - cursor: request (the last row's own key '\<createdAt>:\<id>'; looked up in the sorted rows)
  - limit: request (clamped 1..STORE.PAGE_MAX, default STORE.PAGE_DEFAULT)
  - room: request (judge: roomNameFor)
- **Absent, and a bad value**: no cat -> all; no cursor -> the first page; a cursor that matches no row -> the first page again, silently (store.js:658-661); limit absent, 0 or not a number -> the default; over the max -> clamped; a cat nothing is filed under -> an empty page; never refused
- **Notes**: the phone's call: src/ui/storeApi.js:147 (src/ui/panels/buildings/StorePanel.jsx:292); a row is store.js:396 _stPublic: sellerId, sellerName (the seller's character name as the worker held it at listing, cut to 24), sellerColor, sellerLook or sellerAvatar (the seller's own cosmetics passed on; the avatar only https: or same-site), kind, cat, qty, askPrice, disp (read off the escrowed goods, never the request), topBid {name, bidderId, amount, at}, bidCount, selling; the escrowed goods themselves never go out; wakes the room

#### `GET /api/store/mine`

- **Handler**: server/src/index.js:362 -> server/src/index.js:4895 -> server/src/store.js:597 _storeFetch
- **Comes in**: http (anyone)
- **Envelope**: alone: query playerId, room; no body
- **What it demands of the caller**: none checked (no token: any caller may name any player)
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads ({listings: the named player's own listings, bidding: every other seller's listing on which the named player holds the top bid}, each the public view, newest first)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**:
  - playerId: request (an exact match on sellerId and on topBid.bidderId; not checked against the caller)
  - room: request (judge: roomNameFor)
- **Absent, and a bad value**: no playerId -> both lists empty (null matches no seller and no bidder); an unknown id -> both empty; never refused
- **Notes**: the phone's call: src/ui/storeApi.js:154 (src/ui/panels/buildings/StorePanel.jsx:297); escrowed offers are not here (they ride the socket: store_offer_state); wakes the room and may sweep, as /browse

#### `POST /api/store/list`

- **Handler**: server/src/index.js:362 -> server/src/index.js:4895 -> server/src/store.js:614 _storeFetch -> server/src/store.js:679 _stCreateListing (gear: server/src/storegear.js:448 _stGearEscrow)
- **Comes in**: http (anyone holding the named player's session token)
- **Envelope**: alone: JSON body {playerId, kind, price, and by kind: invKey, qty | stashIndex | field, gid or sel + hint | petId} / header x-bt-auth / query room
- **What it demands of the caller**: a session token (httpauth.js:56 _httpAuthCheck, store.js:612, before the path is read); has state (store.js:698 'Not in game'); not in a fight with a player (fight lock 'fightlock', the handler refuses: store.js:700); under STORE.MAX_PER_PLAYER and STORE.MAX_GLOBAL; gear only while the live flag storeGear is not false; alive NOT checked
- **Who may start it**: a helper with a grant (list)
- **What it does**: moves value out (escrow store_listing:\<listingId>: a stack out of the bag by the bag door 'ah_listing', a weapon spliced out of weaponStash, a gear piece and its gear_prov row taken by _gearProvTake, a pet taken out of pets:\<pid>; the goods rest in the record until sold, taken down or expired after STORE.LISTING_EXPIRY)
- **Request id**: none: a repeat acts twice (a second listing with a new id: another stack if one is held, and for a weapon whatever NOW sits at stashIndex -- A PLACE IN A LIST, store.js:753-760; a gear piece named by gid or a pet by petId is refused the second time, its row or record already taken)
- **Fields**:
  - playerId: request (judge: _httpAuthCheck, then playerState)
  - kind: request ('item', 'weapon', 'gear', 'pet')
  - price: request (floored; 1..STORE.MAX_PRICE)
  - invKey: request (a bag key the seller holds: a string of 32 at most, never an Object.prototype member; no list of what may be sold)
  - qty: request (1..STORE.MAX_QTY, and held: inbox.js:91 _invCount)
  - stashIndex: request (a place in the worker's own weaponStash; the weapon there goes through _sanitizeWeapon)
  - field: request (judge: isGearField / slotForGearField, storegear.js:450-452)
  - gid: request (a gear id of STORE_GEAR.MAX_GID chars at most, resolved against the player's own ledger: gearprov.js:764 _gearSellable)
  - sel: request (a selector, sanitized strictly, matched against the worker's own stash; the id comes off the worker's entry, storegear.js:397-410)
  - hint: request (the phone's index, believed only if the worker's own entry at that place agrees)
  - petId: request (judge: _petSellable: yours, not out, not an old pet, past its tradeAfter)
  - item: not read (rule 16)
- **Absent, and a bad value**: body null or no playerId or a wrong/missing token -> 403 'Not authorized'; price missing or outside the range -> refused 'Invalid price'; kind missing or unknown -> 'Invalid kind'; invKey missing, too long or a prototype name -> 'Invalid item'; qty outside the range -> 'Invalid quantity'; not held -> 'You do not have that'; stashIndex missing or out of range -> 'Item not in stash'; a gear refusal carries a stable `reason` (bad_field, worn, in_mail, legacy, cosmetic, not_held, wrong_slot) beside its sentence; a pet refusal carries its `reason`; every refusal but the 403 is HTTP 200 {ok:false, settled:true, error}; the path is tested with startsWith('/list')
- **Notes**: the phone's call: src/ui/storeApi.js:186 storeList (src/ui/mobile/dash/ItemDetailPopup.jsx:1575), gated on caps.store; answers {ok:true, settled:true, listing: the public view}; the seller's name, colour and bust on the record are the worker's own copies (store.js:813-820); kill switches `storeGear`, `ahonewrite`; a put that throws mails the goods home (opId store:\<id>:unwind); no pace lane; wakes the room

#### `POST /api/store/buy`

- **Handler**: server/src/index.js:362 -> server/src/index.js:4895 -> server/src/store.js:620 _storeFetch -> server/src/store.js:887 _stBuyNow
- **Comes in**: http (anyone holding the named player's session token)
- **Envelope**: alone: JSON body {playerId, listingId} / header x-bt-auth / query room
- **What it demands of the caller**: a session token (store.js:612); not in a fight with a player (fight lock 'fightlock', refused in _storeFetch, store.js:617); the listing is live, not mid-sale or mid-bid, not being taken down, not the buyer's own; has state; holds the ask in gold; alive not checked
- **Who may start it**: a helper with a grant (buy)
- **What it does**: moves value out (the ask in gold: taken with its stamp store:\<id>:pay and the listing marked paid in one write, then move to the seller through _creditPlayer store:\<id>:gold; the goods come to the buyer, store:\<id>:goods; any standing bid and every escrowed offer refunded; the listing and its message threads deleted); cannot be undone (a settled sale has no take-back)
- **Request id**: none: a repeat changes nothing (the listing id is used once: the first buy deletes it, the second answers 'That listing is gone'; each leg is stamped under the listing's id). The price is not in the request: the buyer pays the ask on record, which never changes after listing
- **Fields**:
  - playerId: request (judge: _httpAuthCheck, then playerState and the purse)
  - listingId: request (a listing id, looked up in the worker's own shelf)
- **Absent, and a bad value**: no playerId or a bad token -> 403; listingId missing or unknown -> {ok:false,settled:true,error:'That listing is gone'}; mid-sale -> 'Someone is buying that right now'; being taken down -> 'That listing is being taken down'; own listing -> 'That is your own listing'; offline -> 'Not in game'; short of gold -> 'Not enough gold'; in a fight -> 'Not while you are fighting a player'
- **Notes**: the phone's call: src/ui/storeApi.js:187 storeBuy (src/ui/panels/buildings/StorePanel.jsx:420); answers {ok:true, settled:true, bought:true, price, listing}; kill switch `ahonewrite` (the old two-write order), `storehealnow`; no pace lane; wakes the room

#### `POST /api/store/bid`

- **Handler**: server/src/index.js:362 -> server/src/index.js:4895 -> server/src/store.js:621 _storeFetch -> server/src/store.js:952 _stPlaceBid
- **Comes in**: http (anyone holding the named player's session token)
- **Envelope**: alone: JSON body {playerId, listingId, amount} / header x-bt-auth / query room
- **What it demands of the caller**: a session token (store.js:612); not in a fight with a player (refused in _storeFetch, store.js:617); the listing is live, not mid-sale or mid-bid, not being taken down, not the bidder's own; has state; holds the amount in gold; alive not checked
- **Who may start it**: a helper with a grant (buy) (border: a bid is gold put in escrow that a higher bid sends home; an offer to buy, not a wager)
- **What it does**: moves value out (escrow: the amount leaves the purse, stamp store:\<id>:bid:\<seq>, and rests in the listing as its top bid; the bidder it outbids is refunded store:\<id>:bidref:\<seq>; an amount at or over the ask is a buy-now at the ask: see POST /api/store/buy)
- **Request id**: none: a repeat changes nothing (the first bid becomes the top bid, so the same amount again is under the floor topBid + STORE.MIN_BID_STEP and is refused 'Bid at least N'; the worker numbers each bid itself, bidSeq)
- **Fields**:
  - playerId: request (judge: _httpAuthCheck, then playerState and the purse)
  - listingId: request (looked up in the worker's own shelf)
  - amount: request (floored; 1..STORE.MAX_PRICE; at least the floor; at or over the ask it buys at the ask)
- **Absent, and a bad value**: no playerId or a bad token -> 403; listingId missing or unknown -> 'That listing is gone'; amount missing, 0 or out of range -> refused 'Invalid bid'; under the floor -> 'Bid at least N'; short of gold -> 'Not enough gold'; the same refusals as buy for mid-sale, taken down, own listing, offline, in a fight
- **Notes**: the phone's call: src/ui/storeApi.js:188 storeBid (src/ui/panels/buildings/StorePanel.jsx:433); answers {ok:true, settled:true, bid:true, amount, listing}; there is no route to take a bid back: it comes home when outbid, or when the listing sells, is taken down or expires; the bidder's name on the bid is the session's name (store.js:968) and goes out on every /browse row; no pace lane; wakes the room

#### `POST /api/store/accept`

- **Handler**: server/src/index.js:362 -> server/src/index.js:4895 -> server/src/store.js:622 _storeFetch -> server/src/store.js:1004 _stAcceptBid
- **Comes in**: http (anyone holding the named player's session token)
- **Envelope**: alone: JSON body {playerId, listingId} / header x-bt-auth / query room
- **What it demands of the caller**: a session token (store.js:612: so the seller must be online); the listing is the caller's, live, not mid-sale or mid-bid, not being taken down, and has a top bid; NOT fight-locked; alive not checked
- **Who may start it**: a helper with a grant (list) (border: it completes the sale a listing began; pillar 11.7 names list and buy, not accept)
- **What it does**: moves value out (the escrowed goods: move to the top bidder, store:\<id>:goods; the bid's escrowed gold comes to the seller, store:\<id>:gold; every escrowed offer refunded; the listing and its threads deleted); cannot be undone (a settled sale has no take-back)
- **Request id**: none: a repeat changes nothing (the listing is deleted by the first, the second answers 'That listing is gone'). The request names the listing, not the bid: whichever bid is on top when it arrives is taken (a bid can only be replaced by a higher one)
- **Fields**:
  - playerId: request (judge: _httpAuthCheck, then rec.sellerId === playerId)
  - listingId: request (looked up in the worker's own shelf)
- **Absent, and a bad value**: no playerId or a bad token -> 403; listingId missing or unknown -> 'That listing is gone'; not the seller -> 'Not yours'; no bid -> 'No bids yet'; mid-sale -> 'Someone is buying that right now'; being taken down -> 'That listing is being taken down'
- **Notes**: the phone's call: src/ui/storeApi.js:189 storeAccept (src/ui/panels/buildings/StorePanel.jsx:409); answers {ok:true, settled:true, accepted:true, price, listing}; no pace lane; wakes the room

#### `POST /api/store/<anything else>`

- **Handler**: server/src/index.js:362 -> server/src/index.js:4895 -> server/src/store.js:623 _storeFetch (the POST branch's last line)
- **Comes in**: http (anyone; a token-holder to see the 404)
- **Envelope**: alone: JSON body {playerId} / header x-bt-auth
- **What it demands of the caller**: a session token, asked BEFORE the path is read (store.js:610-612)
- **Who may start it**: a person (border: any caller; nothing is started)
- **What it does**: reads (answers 404 {ok:false,error:'Not found'} to a token-holder, 403 'Not authorized' to anyone else)
- **Request id**: none: a repeat changes nothing
- **Fields**:
  - playerId: request (judge: _httpAuthCheck)
  - the rest: not read
- **Absent, and a bad value**: a POST with no JSON body throws in request.json() -> 500 with the parser's message (store.js:633-634); a POST to /browse or /mine lands here; a POST whose path starts /buy or /bid from a player in a fight answers the fight refusal first
- **Notes**: wakes the room and runs _stEnsureIndex and _stSweep first (store.js:590-591)

#### `DELETE /api/store/cancel`

- **Handler**: server/src/index.js:362 -> server/src/index.js:4895 -> server/src/store.js:626 _storeFetch -> server/src/store.js:1128 _stCancel -> server/src/store.js:1067 _stRelease
- **Comes in**: http (anyone holding the named player's session token)
- **Envelope**: alone: query id, playerId, room / header x-bt-auth; no body
- **What it demands of the caller**: a session token (store.js:628 on the query's playerId: so the seller must be online); the listing is the caller's, live, not mid-sale or mid-bid; NOT fight-locked; alive not checked
- **Who may start it**: a helper with a grant (list) (takes the player's listing down)
- **What it does**: changes your own state (the escrowed goods come home through _creditPlayer, opId store:\<id>:refund, to the live player or the mail; the standing bid and every escrowed offer are refunded to their owners; the listing and its threads deleted)
- **Request id**: none: a repeat changes nothing (the listing is gone after the first: 'That listing is gone'; the record is marked `releasing` before anything moves and every leg is stamped under the listing's id, store.js:1098-1118)
- **Fields**:
  - id: request (a listing id, looked up in the worker's own shelf)
  - playerId: request (judge: _httpAuthCheck, then rec.sellerId === playerId)
  - room: request (judge: roomNameFor)
- **Absent, and a bad value**: no playerId or a bad token -> 403; no id -> {ok:false,settled:true,error:'Missing params'}; an unknown id -> 'That listing is gone'; not the seller -> 'Not yours'; mid-sale or mid-bid -> 'Someone is buying that right now'
- **Notes**: the phone's call: src/ui/storeApi.js:193 storeCancel (src/ui/panels/buildings/StorePanel.jsx:410); answers {ok:true, settled:true, cancelled: the public view}; the same _stRelease runs for an expiry (from the sweep); no pace lane; wakes the room

#### `* /api/store/<anything else>`

- **Handler**: server/src/index.js:362 -> server/src/index.js:4895 -> server/src/store.js:632 _storeFetch (the fall-through)
- **Comes in**: http (anyone)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: any caller; nothing is started)
- **What it does**: reads (answers 404 {ok:false,error:'Not found'})
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: a GET or DELETE on an unknown sub-path, a GET on /list, /buy, /bid, /accept or /cancel, a DELETE on anything but /cancel, and any other method get this 404; the paths are tested with startsWith, so '/browser' is browse and '/mineral' is mine; any throw -> 500 {ok:false, error: the error's own message} (store.js:633-634)
- **Notes**: still wakes the room, and still runs _stEnsureIndex and _stSweep first (store.js:590-591)

### 6.H2 the arena, the account, the boards, feedback (26)

#### `POST /api/arena/join`

- **Handler**: server/src/index.js:392 routeHttp -> server/src/gladiator.js:119 _arenaFetch -> server/src/gladiator.js:247 _arenaJoin
- **Comes in**: http (anyone; the room: ?room= or the main one)
- **Envelope**: alone: header x-bt-auth / JSON body {playerId, playerName | name, level, color}
- **What it demands of the caller**: a session token (httpauth.js:56 _httpAuthCheck: a live session of that playerId, its token in x-bt-auth; no header passes only while that session did not declare httpAuth); not in a fight with a player (the handler refuses: gladiator.js:131, fight-lock switch 'fightlocktable'); has state, alive (gladiator.js:253; disconnected not asked); the tournament is gathering or none yet (263); not already queued (270); holds ARENA.ENTRY_FEE (286); no place check
- **Who may start it**: never a helper (combat) (border: the fee is also a stake on your own fights)
- **What it does**: moves value out (ARENA.ENTRY_FEE gold: escrow arena_entry:\<tid>:\<pid>, road arena_entry; back on a leave or a cancelled bracket, else the first part of the champion's prize); plays (commits the character to the bracket's duels); may start the bracket at once (MAX_BRACKET reached: gladiator.js:298)
- **Request id**: none: a repeat changes nothing (while queued it is refused 'Already queued'; the debit's stamp arena:\<tid>:entry:\<pid>[:n] and the record go out with the purse in one run: gladiator.js:290-295)
- **Fields**:
  - x-bt-auth: request (judge: httpauth.js:64, the session's own token)
  - playerId: request (must be the token's session)
  - playerName, name: words (the request's own text, cut to 24, not cleaned, not the worker's copy of the name; shown to everyone in the queue and the bracket: gladiator.js:297)
  - level, color: not read (the phone sends them, src/ui/panels/buildings/PartyPanel.jsx:299; the worker reads its own ps.level and ps.color)
- **Absent, and a bad value**: no or wrong token, or no live session -> 403 {ok:false, settled:true, error:'Not authorized'}; in a fight -> 200 {ok:false, error:'Not while you are fighting a player'}; dead or no state -> 'Not in game'; a running or just-ended bracket -> 'Tournament in progress' / 'Tournament just ended'; short of gold -> 'Need 100g'; no name -> 'Gladiator'; a body that is not JSON -> 500 {ok:false, error: the parser's message}
- **Notes**: the phone's call: src/ui/panels/buildings/PartyPanel.jsx:285; answers {ok, settled:true, queueSize, queuePosition, startsAt}; awaits the house's hour (arena_house) once a worker's life; no pace; every arena request first runs _arenaLazyTick (gladiator.js:118)

#### `POST /api/arena/leave`

- **Handler**: server/src/index.js:392 routeHttp -> server/src/gladiator.js:137 _arenaFetch -> server/src/gladiator.js:305 _arenaLeave
- **Comes in**: http (anyone; the room)
- **Envelope**: alone: header x-bt-auth / JSON body {playerId}
- **What it demands of the caller**: a session token (as join's); the tournament is gathering (gladiator.js:307); the player is in its queue (309); no fight lock, no alive check
- **Who may start it**: never a helper (combat) (border: it only takes you out of the queue)
- **What it does**: changes your own state (out of the queue; the escrowed fee comes back by _creditPlayer, opId arenarefund:\<tid>:\<pid>[:n], and the arena_entry record is deleted: gladiator.js:316-319)
- **Request id**: none: a repeat changes nothing (no longer in the queue: 'Not queued'; the refund's opId pays once)
- **Fields**:
  - x-bt-auth: request (the session's token)
  - playerId: request (must be the token's session, and queued)
- **Absent, and a bad value**: no or wrong token -> 403 'Not authorized'; no gathering tournament -> {ok:false, error:'No open queue'}; not queued -> 'Not queued'; a body that is not JSON -> 500
- **Notes**: the phone's call: src/ui/panels/buildings/PartyPanel.jsx:426; answers {ok:true, settled:true}; the last one out drops the tournament (gladiator.js:312)

#### `POST /api/arena/result`

- **Handler**: server/src/index.js:392 routeHttp -> server/src/gladiator.js:147 _arenaFetch (answered there)
- **Comes in**: http (anyone; the room)
- **Envelope**: alone: nothing read (the body is not parsed)
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: a dead route kept for old pages; it refuses every call)
- **What it does**: reads (answers a fixed refusal; a match's result is the worker's own, from its duel)
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: every call -> 200 {ok:false, settled:true, error:'Results are server-observed now'}
- **Notes**: no phone sends it (grep src/); _arenaLazyTick still runs first

#### `GET /api/arena/status`

- **Handler**: server/src/index.js:392 routeHttp -> server/src/gladiator.js:152 _arenaFetch -> server/src/gladiator.js:179 _arenaStatusFor
- **Comes in**: http (anyone; the room)
- **Envelope**: alone: query playerId
- **What it demands of the caller**: none checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the open queue: every queued playerId and name; the bracket: _arenaWire, gladiator.js:215; and the named player's own place: none, queued, waiting, fighting with both sides' names, levels and colours, or eliminated)
- **Request id**: none: a repeat changes nothing (a read; but see the note on _arenaLazyTick)
- **Fields**: playerId: request (any id: whose place to say; public on purpose, gladiator.js:177)
- **Absent, and a bad value**: no playerId, or one not in the bracket -> status 'none'; no tournament -> queue [] and tournament null
- **Notes**: the phone polls it: src/ui/BroTown.jsx:9176, src/ui/panels/buildings/PartyPanel.jsx:198; the names it carries are the ones each join wrote (words); no token, no pace

#### `GET /api/arena/tournament`

- **Handler**: server/src/index.js:392 routeHttp -> server/src/gladiator.js:158 _arenaFetch -> server/src/gladiator.js:215 _arenaWire
- **Comes in**: http (anyone; the room)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the bracket: id, status, round, every player's id, name, level, colour, wins, the matches and the champion; null while gathering)
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: no tournament, or one still gathering -> {ok:true, settled:true, tournament:null}
- **Notes**: the phone's call: src/ui/panels/buildings/PartyPanel.jsx:216; level and colour are the worker's copy of each player (colour a look from track)

#### `* /api/arena/<anything else>`

- **Handler**: server/src/index.js:392 routeHttp -> server/src/gladiator.js:161 _arenaFetch (the fall-through)
- **Comes in**: http (anyone; the room)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: any caller; nothing is started)
- **What it does**: reads (answers 404 {ok:false, error:'Not found'})
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: a wrong method on a known path, or an unknown path -> 404; a throw anywhere in the handler -> 500 {ok:false, error: the error's own message}; paths are matched by startsWith ('/joinX' is join)
- **Notes**: _arenaLazyTick has already run

#### `POST /api/account/login`

- **Handler**: server/src/index.js:401 routeHttp -> server/src/account.js:60 _accountFetch -> server/src/account.js:117 _accountLogin
- **Comes in**: http (anyone; the room, the main one unless ?room=)
- **Envelope**: alone: JSON body {phrase, device} / header CF-Connecting-IP (the edge's)
- **What it demands of the caller**: none checked beyond the key itself: the address under ACCOUNT.IP_MAX_ATTEMPTS a minute (account.js:127-142); for an old key, its id not locked (five wrong in a minute lock it for a minute, shared with the join gate: account.js:160-162, join.js:502)
- **Who may start it**: never a helper (the account itself)
- **What it does**: reads (is this Login Key a character's: its id, level, age, name, whole look, and whether this device could play it); writes nothing of its own (the device lock's one-time fill may run under it: devicelock.js:164)
- **Request id**: none: a repeat changes nothing (a read; each one spends the address's allowance, a wrong old key one of the id's five)
- **Fields**:
  - phrase: request (the key; trimmed, at most ACCOUNT.PHRASE_MAX_LEN; a new key found by its fingerprint: loginkeys.js:184 _keyLookup; an old one by its id and hash: account.js:157-176, join.js:474 _phraseHash)
  - device: bounded claim (judge: devicelock.js:139 _deviceDecide against the record's devices, the owner's pass, or the first; the id is the phone's own word, cleaned by cleanDevice; not asked of a new key)
  - CF-Connecting-IP: the worker's own (the edge stamps it; absent -> one shared 'unknown' bucket)
- **Absent, and a bad value**: no phrase, not a string, empty or too long, or a body that is not JSON -> {ok:false, settled:true, reason:'bad_request'} (not counted); over the address's allowance -> reason 'rate'; a locked id -> 'locked'; a key no character has -> {ok:true, exists:false}, nothing written; a retired old key -> 'keychanged'; a registered id with the wrong key -> 'auth' (counted); the right key from an unknown device -> ok with device:'unknown' (answered, not refused)
- **Notes**: the phone's calls: src/networking/index.js:166 (the login door, the picker, the boot check); answers {ok, settled:true, exists, id, device, kv?, preview:{level, createdAt, hasChar, name, look}}; CORS is \* and no Origin is asked, so any site can try keys from a visitor's browser, on the visitor's address; the per-address count is in memory (a deploy clears it)

#### `POST /api/account/reset`

- **Handler**: server/src/index.js:401 routeHttp -> server/src/account.js:76 _accountFetch -> server/src/account.js:99 _accountReset -> server/src/persistence.js:444 _resetCharacterData
- **Comes in**: http (anyone; the room)
- **Envelope**: alone: JSON body {phrase, confirm, device} / header CF-Connecting-IP
- **What it demands of the caller**: confirm is exactly true (account.js:100); the key is a character's (the whole of login's check, one shared budget); the device is one it is played on (account.js:106; a new key is good from any); not in a fight with a player (the handler refuses: account.js:110, fight-lock switch 'fightlockreset'); the character need not be online
- **Who may start it**: never a helper (the account itself)
- **What it does**: cannot be undone (the character is deleted: rpg:, gear_prov:, bank:, farm:, pets:, codex:, fishlog:, achv:, aponce:, testmode:, life:, its party, its quest-item stamps; its board rows retired; a live session told character_reset_done and closed 4005); the owner can put the rpg blob alone back from rpgsnap:\<pid>:prereset-\<ts>
- **Request id**: none: a repeat acts twice (whatever the new life has made is wiped again; straight after the first there is no blob left to snapshot or lose)
- **Fields**:
  - phrase: request (as login's)
  - confirm: request (must be true)
  - device: bounded claim (as login's)
  - CF-Connecting-IP: the worker's own
- **Absent, and a bad value**: confirm missing or not true -> reason 'bad_request'; a login failure is returned as it is ('rate', 'auth', 'locked', 'keychanged', exists:false); an unknown device -> reason 'device'; in a fight -> reason 'fight'; done -> {ok:true, settled:true, reset:true, id}
- **Notes**: the phone's call: src/networking/index.js:203 (the character picker); keeps auth: (the key), char: (the name and look), farmorders: (the day's limit) and guild claims on purpose

#### `* /api/account/<anything else>`

- **Handler**: server/src/index.js:401 routeHttp -> server/src/account.js:83 _accountFetch (the fall-through)
- **Comes in**: http (anyone; the room)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: any caller; nothing is started)
- **What it does**: reads (answers 404 {ok:false, error:'Not found'})
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: a wrong method or an unknown path -> 404, with no `settled` (the phone reads that as 'unavailable'); a throw -> 500 {ok:false, error: the error's message}; paths are matched by startsWith

#### `* /api/leaderboard/* (any method but GET)`

- **Handler**: server/src/index.js:373 routeHttp (answered there; the Leaderboard object is not woken)
- **Comes in**: http (anyone)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: any caller; refused)
- **What it does**: reads (answers 405 {ok:false, error:'Read-only'})
- **Request id**: none: a repeat changes nothing
- **Fields**: method: request (anything but GET is refused here, so the object's four POST routes cannot be reached from outside)
- **Absent, and a bad value**: every such call -> 405
- **Notes**: OPTIONS is answered earlier (index.js:304)

#### `GET /api/leaderboard/top`

- **Handler**: server/src/index.js:376 routeHttp -> server/src/leaderboard.js:50 fetch -> server/src/leaderboard.js:184 getTop
- **Comes in**: http (anyone; the Leaderboard object 'global', no room)
- **Envelope**: alone: query category, limit
- **What it demands of the caller**: none checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the board's rows, each whole: id, name, colour, level, lv, the series, the old columns, clanTag, lastSeen, look; for the series and AP boards the deleted characters' stand-ins too)
- **Request id**: none: a repeat changes nothing
- **Fields**:
  - category: request (a key of SERIES_CATEGORIES ranks on the worker's own series; level, lifeskills, ap, dungeons, gold, playtime rank on an old column; anything else ranks as level, and is echoed back as sent)
  - limit: request (parseInt, 50 when absent or 0, capped at 100 from above only)
- **Absent, and a bad value**: no category -> 'level'; no limit -> 50; a stored row that does not parse is skipped; rows not seen for 7 days are left out
- **Notes**: the phone's calls: src/ui/mobile/dash/LeaderboardPanel.jsx:183, src/ui/panels/LeaderboardPanel.jsx:167; public/tools/draw.html:377 draws the contest from category=level; every call lists the whole player: prefix (and gone:), sorts it and answers: no cache, no pace

#### `POST /api/leaderboard/update`

- **Handler**: server/src/leaderboard.js:24 fetch -> server/src/leaderboard.js:92 updatePlayer
- **Comes in**: internal (the room's binding only: server/src/index.js:6557 reportToLeaderboard; from outside a POST is stopped at index.js:373)
- **Envelope**: alone: JSON body {playerId, name, color, level, rpgData, series, ts, look}
- **What it demands of the caller**: none checked (the object trusts its caller); the room sends it at a join (forced) and on track, at most every LEADERBOARD_MIN_MS when the row changed, every LEADERBOARD_HEARTBEAT_MS when not
- **Who may start it**: the system
- **What it does**: changes your own state (the player's board row player:\<pid>, written whole)
- **Request id**: none: a repeat changes nothing (the same report writes the same row; lastSeen moves)
- **Fields**:
  - playerId: the worker's own (session.id)
  - name: words (the join's cleaned name)
  - color: look (the phone's, from track)
  - level: the worker's own (ps.level; the phone's rpgLv only when there is no state: index.js:6487)
  - series: the worker's own (_chainScoreSeries)
  - look: the worker's own (the character record's face, boardFace)
  - rpgData.ap: the worker's own (stamped)
  - rpgData.lifeTotal, kills, dungeons, goldEarned, playtime, clanTag: claim (the phone's blob, as sent in track)
  - ts: the worker's own
- **Absent, and a bad value**: no playerId -> nothing written, still {ok:true}; a missing column -> 0, 'Anon', '#5b52ff', level 1, no look
- **Notes**: a cross-object fetch the track case and the join start without awaiting it (server/src/index.js:5365, server/src/join.js:2017)

#### `POST /api/leaderboard/gone`

- **Handler**: server/src/leaderboard.js:32 fetch -> server/src/leaderboard.js:127 markGone
- **Comes in**: internal (the room's binding only: server/src/boards.js:338 _boardsGone, from a character's restart; from outside stopped at index.js:373)
- **Envelope**: alone: JSON body {playerId, ts}
- **What it demands of the caller**: none checked
- **Who may start it**: the system
- **What it does**: changes your own state (the row player:\<pid> becomes the stand-in gone:\<pid>:\<ts>, marked gone; stand-ins older than 7 days are deleted)
- **Request id**: none: a repeat changes nothing (no player: row is left to move; answers gone:false)
- **Fields**:
  - playerId: the worker's own
  - ts: the worker's own (the delete's time; absent -> now)
- **Absent, and a bad value**: no playerId or not a string -> {ok:true, gone:false}; a row that does not parse is deleted, not moved
- **Notes**: its sweep lists the whole gone: prefix each call

#### `POST /api/leaderboard/faceless`

- **Handler**: server/src/leaderboard.js:42 fetch -> server/src/leaderboard.js:64 faceless
- **Comes in**: internal (the room's binding only: server/src/boards.js:288 _boardsFaceFill, once a worker's life; from outside stopped at index.js:373)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: the system
- **What it does**: reads (the ids of live rows that carry no look, 200 at most)
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: nothing to be absent
- **Notes**: tested before /faces, which its path also starts with; lists the whole player: prefix

#### `POST /api/leaderboard/faces`

- **Handler**: server/src/leaderboard.js:45 fetch -> server/src/leaderboard.js:74 fillFaces
- **Comes in**: internal (the room's binding only: server/src/boards.js:299 _boardsFaceFill; from outside stopped at index.js:373)
- **Envelope**: alone: JSON body {faces: {\<playerId>: look}}
- **What it demands of the caller**: none checked
- **Who may start it**: the system
- **What it does**: changes your own state (a row with no look is given one; nothing else of the row, never its lastSeen)
- **Request id**: none: a repeat changes nothing (a row that has a look is never written again)
- **Fields**: faces: the worker's own (each look from char:\<pid>, cut to the face keys by boardFace on both sides; the first 200 ids)
- **Absent, and a bad value**: no faces or not an object -> filled 0; an id with no row, or a look with nothing in it, is skipped

#### `GET /api/leaderboard/<anything else>`

- **Handler**: server/src/index.js:376 routeHttp -> server/src/leaderboard.js:57 fetch (the fall-through)
- **Comes in**: http (anyone)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: any caller; nothing is started)
- **What it does**: reads (answers 404 {ok:false, error:'Not found'})
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: a GET of any path but /top (the four POST paths included) -> 404; a throw -> 500 {ok:false, error: the error's message}

#### `POST /api/feedback/submit`

- **Handler**: server/src/index.js:406 routeHttp -> server/src/feedback.js:25 fetch -> server/src/feedback.js:106 submit
- **Comes in**: http (anyone; the Feedback object 'global', no room)
- **Envelope**: alone: JSON body {playerId, playerName, category, topic, text}
- **What it demands of the caller**: none checked (no token, no session, no key: the caller need not be a player); 5 an hour for the playerId it names (feedback.js:120-125)
- **Who may start it**: never a helper (chat) (border: a public board of players' words, not a chat lane)
- **What it does**: speaks (a ticket every caller of /list can read: the name, the topic, the text); changes the board (ticket:\<id>, the topic's count in _stats, the rate row)
- **Request id**: none: a repeat acts twice (a second ticket with the same words, while the hour's five last)
- **Fields**:
  - playerId: claim (any truthy value; only the rate limit's key)
  - playerName: words (taken as it is: no type check, no length, no cleaning; shown to everyone)
  - category: request (one of six: bug, balance, remove, add, qol, praise)
  - topic: words (taken as it is; also a key of the _stats record)
  - text: words (a string of at most FEEDBACK_TEXT_MAX; not cleaned)
- **Absent, and a bad value**: any of the five missing -> {ok:false, error:'Missing fields'}; text not a string or too long -> 'Max 500 characters'; an unknown category -> 'Invalid category'; a sixth in the hour -> 'Rate limited'; a body that is not JSON -> 500 {ok:false, error: the parser's message}
- **Notes**: the phone's calls: src/ui/mobile/dash/FeedbackPanel.jsx:49, src/ui/panels/FeedbackPanel.jsx:581; three storage writes a ticket; a ticket is never deleted

#### `GET /api/feedback/list`

- **Handler**: server/src/index.js:406 routeHttp -> server/src/feedback.js:31 fetch -> server/src/feedback.js:175 list
- **Comes in**: http (anyone)
- **Envelope**: alone: query sort, topic, category, limit, offset
- **What it demands of the caller**: none checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the tickets: id, playerName, category, topic, text, up, down, ts; never the playerId or who voted)
- **Request id**: none: a repeat changes nothing
- **Fields**:
  - sort: request (top, trending; anything else is newest first)
  - topic, category: request (an exact-match filter)
  - limit: request (parseInt, 20 when absent, capped at 50 from above only)
  - offset: request (parseInt, 0 when absent)
- **Absent, and a bad value**: every field has a default; a ticket that does not parse is skipped
- **Notes**: the phone's calls: src/ui/mobile/dash/FeedbackPanel.jsx:169, src/ui/panels/FeedbackPanel.jsx:179; playerName and text are other players' words, as they were sent

#### `POST /api/feedback/vote`

- **Handler**: server/src/index.js:406 routeHttp -> server/src/feedback.js:41 fetch -> server/src/feedback.js:148 vote
- **Comes in**: http (anyone)
- **Envelope**: alone: JSON body {ticketId, playerId, vote}
- **What it demands of the caller**: none checked (no token, no pace)
- **Who may start it**: a person (border: a thumb on a public post is a social signal, not words)
- **What it does**: speaks (moves a ticket's up or down count, which orders the board for everyone); one storage write
- **Request id**: none: a repeat acts twice (it is a toggle: the same vote again takes it back)
- **Fields**:
  - ticketId: request (must be a stored ticket)
  - playerId: claim (any truthy value; the key of the ticket's voters map, a plain object)
  - vote: request ('up' or 'down')
- **Absent, and a bad value**: a missing field or another vote word -> {ok:false, error:'Invalid vote'}; an unknown ticket -> 'Ticket not found'
- **Notes**: the phone's calls: src/ui/mobile/dash/FeedbackPanel.jsx:179, src/ui/panels/FeedbackPanel.jsx:308; answers {ok, up, down, myVote}

#### `GET /api/feedback/stats`

- **Handler**: server/src/index.js:406 routeHttp -> server/src/feedback.js:47 fetch -> server/src/feedback.js:215 getStats
- **Comes in**: http (anyone)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a helper with a grant (read)
- **What it does**: reads (the count of tickets for each topic and category, and the total)
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: no record yet -> {ok:true, stats:{}}
- **Notes**: no phone calls it (grep src/); its keys are the topics callers sent to submit, as sent

#### `POST /api/feedback/crash`

- **Handler**: server/src/index.js:406 routeHttp -> server/src/feedback.js:54 fetch -> server/src/feedback.js:78 crashReport
- **Comes in**: http (anyone)
- **Envelope**: alone: a body of JSON text (sent text/plain by sendBeacon) {sid, v, ua, zone, log[{t, kind, msg}], sha, gl}
- **What it demands of the caller**: none checked; 12 an hour for the sid it names (feedback.js:81-86)
- **Who may start it**: a person (border: the page's crash trap sends it by itself; nobody chooses to)
- **What it does**: changes your own state (border: nothing of the character; one report into the crash ring _crashlog, the newest 200, and the rate row crashrate:\<sid>)
- **Request id**: none: a repeat acts twice (a second copy in the ring; the phone sends a ring once: crashTrap.js:60)
- **Fields**:
  - sid: claim (the page's own session mark, cut to 32; the rate limit's key)
  - v, ua, zone: claim (cut to 16, 160, 24)
  - log: claim (the last 16 entries, each t and kind cut to 24, msg to 300)
  - sha, gl: not read
- **Absent, and a bad value**: no sid, or log missing, empty or not a list -> {ok:false, error:'Missing fields'}; a body that does not parse -> the same; a thirteenth in the hour -> 'Rate limited'
- **Notes**: the phone's call: src/debug/crashTrap.js:92; two storage writes a report; POST /crashes is taken for this route too (startsWith)

#### `GET /api/feedback/crashes`

- **Handler**: server/src/index.js:406 routeHttp -> server/src/feedback.js:61 fetch (answered there)
- **Comes in**: http (anyone)
- **Envelope**: alone: query limit
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: meant for the owner and the QA tools, but no key is asked)
- **What it does**: reads (the newest crash reports of every player's page: when, sid, version, the browser's name, the zone, the log's lines)
- **Request id**: none: a repeat changes nothing
- **Fields**: limit: request (parseInt, 50 when absent, capped at 200 from above only)
- **Absent, and a bad value**: no log yet -> {ok:true, count:0, reports:[]}
- **Notes**: no phone calls it; tools/qa/qa-telemetry.mjs:19 and tools/qa/mp/mp-killedpage.mjs:69 do

#### `* /api/feedback/<anything else>`

- **Handler**: server/src/index.js:406 routeHttp -> server/src/feedback.js:67 fetch (the fall-through)
- **Comes in**: http (anyone)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: none checked
- **Who may start it**: a person (border: any caller; nothing is started)
- **What it does**: reads (answers 404 {ok:false, error:'Not found'})
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: a wrong method or an unknown path -> 404; a throw -> 500 {ok:false, error: the error's message}; paths are matched by startsWith

#### `* /api/botstat?id=<playerId>`

- **Handler**: server/src/index.js:382 routeHttp -> server/src/index.js:4909 -> server/src/botfp.js:603 _botfpAdminFetch (the id branch: 616)
- **Comes in**: admin (the owner's key; the room)
- **Envelope**: alone: query id / header x-admin-key, or Authorization: Bearer
- **What it demands of the caller**: the admin key (botfp.js:611-613: x-admin-key equal to env.ADMIN_KEY, or admin.js:54 _adminAuth's Bearer); no method or sub-path is tested; the player need not be online
- **Who may start it**: the owner
- **What it does**: reads (one player's anti-bot record botstat:\<id>, with the live counters, score and device when they are here)
- **Request id**: none: a repeat changes nothing
- **Fields**:
  - id: request (any id; its stored record, or null)
  - x-admin-key, Authorization: request (the owner's key)
- **Absent, and a bad value**: no secret configured, or a missing or wrong key -> 404 'Not found' (plain text: the route looks absent); an id with no record -> {id, botstat:null}
- **Notes**: no phone calls it (the Test panel reads /api/admin/dev/botflags); its answers carry no CORS header, so a page on another site cannot read them; nothing is written to admin_log

#### `* /api/botstat?flagged=1`

- **Handler**: server/src/index.js:382 routeHttp -> server/src/index.js:4909 -> server/src/botfp.js:603 _botfpAdminFetch (the flagged branch: 630)
- **Comes in**: admin (the owner's key; the room)
- **Envelope**: alone: query flagged / the key's header
- **What it demands of the caller**: the admin key (as the id branch); read only when no id is given
- **Who may start it**: the owner
- **What it does**: reads (up to 50 stored records that carry a flag: id, flags, counters, updatedAt)
- **Request id**: none: a repeat changes nothing
- **Fields**: flagged: request (exactly '1')
- **Absent, and a bad value**: no key -> 404 'Not found'
- **Notes**: lists the whole botstat: prefix with no limit, inside the room (it holds the room's gate while it reads: handoff rule 9's second edge); stored records only, a live one's newer flags are not in it

#### `* /api/botstat (neither)`

- **Handler**: server/src/index.js:382 routeHttp -> server/src/index.js:4909 -> server/src/botfp.js:641 _botfpAdminFetch (the fall-through)
- **Comes in**: admin (the owner's key; the room)
- **Envelope**: alone: nothing read / the key's header
- **What it demands of the caller**: the admin key (as the id branch)
- **Who may start it**: the owner
- **What it does**: reads (answers the usage line)
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: with the key and neither id nor flagged=1 -> {usage:'/api/botstat?id=\<playerId> | /api/botstat?flagged=1'}; any method and any path under /api/botstat get the same three answers

### 6.H3 the owner's routes (25)

#### `* /api/admin/* (the key)`

- **Handler**: server/src/index.js:414 routeHttp -> server/src/index.js:4913 GameRoom.fetch -> server/src/admin.js:133 _adminFetch -> server/src/admin.js:54 _adminAuth
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: header Authorization: Bearer \<key>; query room (which room answers)
- **What it demands of the caller**: the room is one the worker makes (index.js:415, else 404 'no such room'); the live flags are loaded first (index.js:4886); then the key, before any path or body is read (admin.js:139)
- **Who may start it**: the owner
- **What it does**: reads (judges the key and nothing else; every row below runs only after it answers 'ok')
- **Request id**: none: a repeat changes nothing (nothing is kept, not even a count of wrong keys)
- **Fields**:
  - Authorization: request (must start 'Bearer '; the rest and env.ADMIN_KEY are each hashed, SHA-256 of 'btv1|' + text, join.js:474 _phraseHash, and the two hex digests compared with ===: no early exit on the secret itself)
  - room: request (flood.js roomNameFor)
- **Absent, and a bad value**: no ADMIN_KEY secret configured -> 404 {ok:false,error:'Not found'} on every path, as if the surface did not exist; no header, no 'Bearer ', or a wrong key -> 401 {ok:false,error:'Unauthorized'}; a throw anywhere below (a body that is not JSON) -> 500 {ok:false,error: the error's own message} (admin.js:468)
- **Notes**: every answer carries Access-Control-Allow-Origin: \* (admin.js:136) and the preflight allows any header (index.js:305): the key is the only guard, there is no Origin check here (origin.js covers /ws). Order inside _adminFetch: overview, economy, loot, player; then devtools.js _devFetch (/dev/\*, another family: admin.js:356); then grant, kick, freeze, restore, log; then devicelock, liveops, capes, chainscore, chatmod; then 404. The phone's caller is the Test panel (src/ui/panels/DevPanel.jsx:434), which keeps the key in localStorage (DevPanel.jsx:404)

#### `GET /api/admin/overview`

- **Handler**: server/src/admin.js:145 _adminFetch
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: no query, no body
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (the room's memory only: sessions, players, zones, the tick's pace, and each module's counters: moveBudget, movePath, lastPlace, zoneJudge, hitProof, testMode, deviceLock, loginKeys, lookRelay, farEveryMs, eventBufferLen, protocol v1/v2 counts)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: (none read)
- **Absent, and a bad value**: nothing to be absent; POST or DELETE on this path -> falls to the 404
- **Notes**: no storage read past the gate; names no player; the Test panel's key check calls it (DevPanel.jsx:464)

#### `GET /api/admin/economy`

- **Handler**: server/src/admin.js:196 _adminFetch -> server/src/liveops.js:215 _economySnapshot
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: no query, no body
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (every rpg: record's coins and level a page at a time, every mkt_order:, every inbox:, harden_h5_log, jackpot:draw, the last 7 metrics: days; answers totals, the ten richest {id, coins, level}, a day-over-day delta and alert when it passes 25%)
- **Request id**: none: a repeat changes nothing (a read; it writes nothing)
- **Fields**: (none read)
- **Absent, and a bad value**: nothing to be absent
- **Notes**: its time grows with the tables and every await is a storage read, so the room answers nothing else while it runs (handoff rule 9's second edge; the file says so, liveops.js:178-180). Counts gold in purses and in the market's buy orders only: not the bank's vault, a duel's wager, an arena entry, a store offer or bid, the jackpot's pool beside it (liveops.js:67-69)

#### `GET /api/admin/loot`

- **Handler**: server/src/admin.js:229 _adminFetch
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query zone (optional)
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (the loot piles in memory: place, age, expiry, coins, recipients, shares, who claimed what, death drop, owner-only time; and LOOT_PICKUP_RANGE)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: zone: request (an exact zone id; piles of other zones are left out)
- **Absent, and a bad value**: no zone -> every zone's piles; an unknown zone -> an empty list
- **Notes**: memory only; changes nothing

#### `GET /api/admin/player`

- **Handler**: server/src/admin.js:259 _adminFetch
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query id
- **What it demands of the caller**: the owner's key; the player need not be online or exist
- **Who may start it**: the owner
- **What it does**: reads (the stored rpg: record whole; auth: as {createdAt} only, never a hash or key; frozen:; the inbox's count; the names of the rpgsnap: snapshots; and, if in the room, live state: coins, level, hp, place, dead, disconnected, lingering, pose, the last strike's verdict, the hit plan, the arrow blast's refusals, blocking and ba, stamina, mana, sprint)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: id: request (taken as it is into four storage gets and one list by prefix 'rpgsnap:\<id>:')
- **Absent, and a bad value**: no id -> 400 {ok:false,error:'id required'}; an unknown id -> 200 with rpg null, live null, online false
- **Notes**: four gets and one small list a call; the list has no limit but one player's snapshots are a ring of SNAPSHOT.KEEP a class (admin.js:42)

#### `POST /api/admin/grant`

- **Handler**: server/src/admin.js:359 _adminFetch -> server/src/inbox.js:244 _creditPlayer
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, kind, payload, note, opId}
- **What it demands of the caller**: the owner's key; the player need not be online (offline: parked in inbox:\<id>) and is not checked to exist
- **Who may start it**: the owner
- **What it does**: changes your own state (mint: gold or a stackable item into the named player's purse or bag, live through the gold door's road mail_gold (inbox.js:392) or the bag door's mail_item (inbox.js:455), else into their mail); speaks (note is shown to the player with the delivery)
- **Request id**: opId: optional; stamped in oplog: with the payment (inbox.js:314, 338) and echoed in the answer; a second call with the same opId answers 'dup'. Left out, the worker makes a random one, so a blind retry pays twice
- **Fields**:
  - playerId: request (any string; no record needed)
  - kind: request ('gold' or 'item' only)
  - payload.amount: request (gold: floored, never below 0, no ceiling)
  - payload.invKey: request (item: any string not a name on Object.prototype; held against no item table)
  - payload.count: request (floored, at least 1, no ceiling)
  - note: words (the owner's; taken as written, default 'Grant from the operator')
  - opId: request (a non-empty string)
- **Absent, and a bad value**: no playerId, or kind not gold or item (a weapon, gear) -> 400 with the reason; no payload -> {} (gold 0, or an item credit with no key that is consumed and gives nothing); a body that is not JSON -> 500
- **Notes**: answers {ok:true, result:'delivered'|'inboxed'|'dup', opId}; admin_log gets {op:'grant', playerId, kind, payload, note, opId, result}; a live player is sent inbox_delivered and player_state

#### `POST /api/admin/kick`

- **Handler**: server/src/admin.js:373 _adminFetch -> server/src/admin.js:72 _adminPutOut
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, reason}
- **What it demands of the caller**: the owner's key; nothing demanded of the target (offline answers wasOnline:false)
- **Who may start it**: the owner
- **What it does**: changes your own state (ends the named player's session: the socket closed 4008 'admin_kick', then the session door, leave.js _playerLeaves(ws, 'kick'): the save, player_leave, the party's and duel's grace; a body in a fight with a player lingers as any leaver's)
- **Request id**: none: a repeat changes nothing (the player is already out; one more admin_log line)
- **Fields**:
  - playerId: request (looked up among live sessions, admin.js:377)
  - reason: words (the owner's; written to admin_log only, never sent to the player)
- **Absent, and a bad value**: no playerId -> 400 {ok:false,error:'playerId required'}; nobody online by that id -> 200 {ok:true, wasOnline:false}
- **Notes**: admin_log {op:'kick', playerId, reason}; the player may join again at once (a kick is not a freeze)

#### `POST /api/admin/freeze`

- **Handler**: server/src/admin.js:383 _adminFetch
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, note}
- **What it demands of the caller**: the owner's key; nothing demanded of the target (the id is not checked to exist)
- **Who may start it**: the owner
- **What it does**: changes your own state (writes frozen:\<playerId> {ts, note}, which the join gate refuses on; puts the player out if online: close 4004 'frozen', then the session door)
- **Request id**: none: a repeat changes nothing (the same record written again with a new ts)
- **Fields**:
  - playerId: request (taken as it is into the storage key)
  - note: words (the owner's; stored in frozen: and admin_log)
- **Absent, and a bad value**: no playerId -> 400; no note -> ''
- **Notes**: answers {ok:true, wasOnline}; admin_log {op:'freeze', playerId, note}; undone by DELETE /api/admin/freeze

#### `DELETE /api/admin/freeze`

- **Handler**: server/src/admin.js:394 _adminFetch
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query id
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: changes your own state (deletes frozen:\<id>: the player may join again)
- **Request id**: none: a repeat changes nothing (nothing left to delete)
- **Fields**: id: request (taken as it is into the storage key)
- **Absent, and a bad value**: no id -> 400 {ok:false,error:'id required'}; an id that was not frozen -> 200 {ok:true} all the same
- **Notes**: the id rides the query here and the body on POST (playerId); admin_log {op:'unfreeze', playerId}

#### `POST /api/admin/restore`

- **Handler**: server/src/admin.js:402 _adminFetch
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, snapKey}
- **What it demands of the caller**: the owner's key; the player has no live session (admin.js:411, else 409 'player online -- kick first'); the player has no state left in the room (admin.js:418: a body left in a fight stays up to 20 s, else 409)
- **Who may start it**: the owner
- **What it does**: changes your own state (writes the snapshot over rpg:\<playerId>, after copying the record it replaces to rpgsnap:\<playerId>:prerestore-\<ts>); cannot be undone by any route but another restore from that prerestore copy
- **Request id**: none: a repeat changes nothing new (the same snapshot is written again; each press adds one more prerestore copy, pruned only at the player's next daily snapshot)
- **Fields**:
  - playerId: request
  - snapKey: request (must start 'rpgsnap:' + playerId + ':', so only that player's own snapshots; then must exist in storage)
- **Absent, and a bad value**: either missing, or a snapKey of another player -> 400 {ok:false,error:'playerId + a matching snapKey required'}; no such snapshot -> 404 'snapshot not found'
- **Notes**: admin_log {op:'restore', playerId, snapKey}; the snapshot's shape is not looked at here (the next join's load runs the migrations)

#### `GET /api/admin/log`

- **Handler**: server/src/admin.js:430 _adminFetch
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: no query, no body
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (admin_log: the last 100 changing admin acts, each {ts, op, ...})
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: (none read)
- **Absent, and a bad value**: no log yet -> an empty list
- **Notes**: the log is one key, a ring of 100 written best-effort (admin.js:77-83): a failed write loses the line and the act still stands

#### `POST /api/admin/device-pass`

- **Handler**: server/src/admin.js:440 _adminFetch -> server/src/devicelock.js:255 _deviceLockAdminRoute -> server/src/devicelock.js:277 _deviceLockAdminRun
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId}
- **What it demands of the caller**: the owner's key; the character has an auth: record (else 200 {ok:false,error:'No character has that code. Check it for typos.'}); it need not be online
- **Who may start it**: the owner
- **What it does**: changes your own state (writes auth:\<id>.pass = {until: now + DEVICE_LOCK.PASS_MS, at}: the next login with the character's key from ONE new device is let in and that device remembered)
- **Request id**: none: a repeat changes nothing but the clock (the pass's window starts again)
- **Fields**: playerId: request (a string, trimmed; must name a registered character)
- **Absent, and a bad value**: no body, a body that is not JSON, or no playerId -> 400 {ok:false,error:'playerId required'}
- **Notes**: run in the record's own queue (_authSerial, devicelock.js:101); answers {ok, until, devices, forgot:0, sealed, wasOnline:false, taken:0}; admin_log {op:'device-pass', playerId}; may run the one-time device fill first (devicelock.js:164, two whole-prefix lists, once a room's life)

#### `POST /api/admin/device-forget`

- **Handler**: server/src/admin.js:440 _adminFetch -> server/src/devicelock.js:255 _deviceLockAdminRoute -> server/src/devicelock.js:277 _deviceLockAdminRun
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId}
- **What it demands of the caller**: the owner's key; the character has an auth: record; it need not be online
- **Who may start it**: the owner
- **What it does**: changes your own state (auth:\<id>: devs emptied, sealed set, any pass removed, every new Login Key removed and its keyidx: row deleted; whoever is playing it is sent join_rejected {reason:'device'}, closed DEVICE_LOCK.CLOSE and leaves by the session door); cannot be undone (the device list and the keys are gone; the way back in is a device-pass, then the old key)
- **Request id**: none: a repeat changes nothing (already empty and sealed)
- **Fields**: playerId: request (a string, trimmed; must name a registered character)
- **Absent, and a bad value**: as device-pass: no playerId -> 400; no such character -> 200 {ok:false, error}
- **Notes**: answers {ok, devices:0, forgot: how many devices were dropped, sealed:true, wasOnline, taken: how many keys were taken back}; admin_log {op:'device-forget', playerId, forgot, taken}

#### `POST /api/admin/key-new`

- **Handler**: server/src/admin.js:440 _adminFetch -> server/src/devicelock.js:255 _deviceLockAdminRoute -> server/src/devicelock.js:300 _deviceLockAdminRun
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId}
- **What it demands of the caller**: the owner's key; the character has an auth: record; it need not be online
- **Who may start it**: the owner
- **What it does**: changes your own state (all of device-forget, and: the old key retired (pfHash and fresh deleted, oldGone set), ONE new Login Key made by the worker and written as its fingerprint with its keyidx: row in the same put; whoever is playing is sent join_rejected {reason:'key'} and closed 4017); cannot be undone (the old key never works again)
- **Request id**: none: a repeat acts twice (a second new key is made and the first stops working; an answer lost on the way leaves a key nobody saw, and the next press replaces it)
- **Fields**: playerId: request (a string, trimmed; must name a registered character)
- **Absent, and a bad value**: as device-pass: no playerId -> 400; no such character -> 200 {ok:false, error}
- **Notes**: the answer carries the new key once, in the clear ({..., key}); admin_log gets {op:'key-new', playerId, forgot, taken} and never the key (devicelock.js:269)

#### `GET /api/admin/flags`

- **Handler**: server/src/admin.js:443 _adminFetch -> server/src/liveops.js:338 _liveopsRoutes
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: no query, no body
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (the liveflags map, from the room's cache)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: (none read)
- **Absent, and a bad value**: no flags set -> {}
- **Notes**: the same map is spread over every phone's state_sync.caps, so no flag's name or value is private (liveops.js:14-21); the private numbers live in hidden_settings (another family's /dev/hidden)

#### `POST /api/admin/flags`

- **Handler**: server/src/admin.js:443 _adminFetch -> server/src/liveops.js:341 _liveopsRoutes
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {name, value}
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: changes your own state (sets one live flag in memory and in liveflags, for every player and every later join; some names act at once: oneformula and onelevel re-size every bar and monster, movepath and pathall, off_\*, freeswing, bowdraw and staffgather tell every phone, monstermoves re-steps live monsters, disable_bigbags and bagonesum re-set the bag's limits)
- **Request id**: none: a repeat changes nothing (the same value written again; one more admin_log line)
- **Fields**:
  - name: request (judge: liveops.js:114 flagNameOk: lower case, digits and underscore, 1 to 32 long, or one of LIVEOPS.CAMEL_SWITCHES: storeGear, dailyChest, whirlWindup, broCount)
  - value: request (a boolean or a finite number; xp_mult clamped XP_MULT_MIN..XP_MULT_MAX; any other number stored as sent and clamped where it is read, liveops.js:152 _flagNum)
- **Absent, and a bad value**: a bad name -> 400 with the rule; a value that is a string, null or absent -> 400 'value must be a boolean or finite number'; a new name when LIVEOPS.FLAGS_MAX are set -> 400 'flag budget exhausted'
- **Notes**: answers {ok:true, flags: the whole map}; admin_log {op:'flag_set', name, value}; a flag named as a lower-case cap overrides that cap for every phone (the file's own warning, liveops.js:16-21)

#### `DELETE /api/admin/flags`

- **Handler**: server/src/admin.js:443 _adminFetch -> server/src/liveops.js:374 _liveopsRoutes
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query name
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: changes your own state (removes one live flag: the code's own default stands again; the same at-once effects as POST for the names it lists)
- **Request id**: none: a repeat changes nothing (the name is no longer in the map)
- **Fields**: name: request (must be a key of the map as it stands; not held to flagNameOk)
- **Absent, and a bad value**: no name, or a name not set -> 200 {ok:true, flags} with nothing changed and nothing logged
- **Notes**: admin_log {op:'flag_clear', name} only when something was removed

#### `POST /api/admin/announce`

- **Handler**: server/src/admin.js:443 _adminFetch -> server/src/liveops.js:391 _liveopsRoutes -> server/src/liveops.js:325 _announce
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {text, sticky}
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: speaks (the owner's line to every socket in the room at once, as server_announce, by broadcastAll: a socket that has not joined yet gets it too); changes your own state (sticky: stores motd {text, ts}, sent to every later join until deleted)
- **Request id**: none: a repeat acts twice (the line is shown again)
- **Fields**:
  - text: words (the owner's; String, trimmed, cut to LIVEOPS.ANNOUNCE_MAX_LEN; no control characters taken out, no other cleaning)
  - sticky: request (truthy: also keep it as the motd)
- **Absent, and a bad value**: no text, or only spaces -> 400 {ok:false,error:'text required'}, nothing sent
- **Notes**: sent alone, not through the tick's events, so it reaches a quiet room (liveops.js:328-330); admin_log {op:'announce', text: its first 80 characters, sticky}

#### `DELETE /api/admin/announce`

- **Handler**: server/src/admin.js:443 _adminFetch -> server/src/liveops.js:398 _liveopsRoutes
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: no query, no body
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: changes your own state (deletes motd: later joins get no sticky line; phones that already showed it are told nothing)
- **Request id**: none: a repeat changes nothing (already gone)
- **Fields**: (none read)
- **Absent, and a bad value**: no motd stored -> 200 {ok:true} all the same
- **Notes**: admin_log {op:'motd_clear'} every call, whether one was stored or not

#### `GET /api/admin/capes`

- **Handler**: server/src/admin.js:449 _adminFetch -> server/src/eventcapes.js:490 _capeAdminRoute
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: no query, no body
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (the cape contest's ledger, each cape of EVENT_CAPES: cap, ticket key, issued[] and redeemed[] (player ids), remaining; and whether the contest is open now)
- **Request id**: none: a repeat changes nothing (a read)
- **Fields**: (none read)
- **Absent, and a bad value**: a cape with no ledger yet -> issued [] and redeemed []
- **Notes**: not on the card's guide list of hand-offs: _adminFetch routes /capes between liveops and chainscore (admin.js:449); a POST to /capes falls to the 404

#### `DELETE /api/admin/capes`

- **Handler**: server/src/admin.js:449 _adminFetch -> server/src/eventcapes.js:513 _capeAdminRoute
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query cape, confirm
- **What it demands of the caller**: the owner's key; nothing else checked (the contest may be running)
- **Who may start it**: the owner
- **What it does**: changes your own state (writes an empty ledger over capegrant:\<cape>: every ticket issued and every cape redeemed is forgotten, and that ledger is the only record of who owns the cape); cannot be undone by a route (the answer and admin_log carry what was cleared)
- **Request id**: none: a repeat changes nothing (the ledger is already empty; it logs an empty `cleared`)
- **Fields**:
  - cape: request (must be an own key of EVENT_CAPES: hasOwnProperty, so '__proto__' is refused, eventcapes.js:522)
  - confirm: request (must be exactly 'yes')
- **Absent, and a bad value**: no cape or an unknown one -> 400 naming the real capes; confirm missing or not 'yes' -> 400 'this voids tickets people may have won'
- **Notes**: admin_log {op:'cape_ledger_reset', cape, cleared:{issued, redeemed}}; tickets and cape items already in players' bags are not touched

#### `GET /api/admin/chainstatus`

- **Handler**: server/src/admin.js:454 _adminFetch -> server/src/chainscore.js:396 _chainScoreAdminRoute
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query id (optional)
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (the on-chain score relayer's health: configured or what is missing, the contract, chain id and RPC address, the relayer's public address, a fresh preflight against the chain, its balance; with id, that player's chain_score: record and explorer link; without, the count of chain_score: records and the newest)
- **Request id**: none: a repeat changes nothing (a read; it drops the cached preflight verdict and asks the chain again each time)
- **Fields**: id: request (taken as it is into one storage get)
- **Absent, and a bad value**: not configured -> 200 {configured:false, missing:[...]} with no call to the chain; a malformed relayer key -> relayerKey:'malformed', never the value; no id -> the whole chain_score: prefix is listed
- **Notes**: awaits calls to the chain's RPC (a fetch to another host: the room's input gate is open meanwhile, handoff rule 9); with no id it lists chain_score: with no limit (chainscore.js:454), one row a player who ever wrote a score

#### `GET /api/admin/reports`

- **Handler**: server/src/admin.js:463 _adminFetch -> server/src/chatmod.js:368 _chatModAdminRoute
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query limit, target
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (players' abuse reports, newest first: reason, who reported whom, the zone, and `lines`, the worker's own copy of what was said; each row with whether its target is online and frozen now); changes your own state (deletes every chat_report: older than CHATMOD.RETAIN_MS on the way)
- **Request id**: none: a repeat changes nothing (a read; the prune finds nothing the second time)
- **Fields**:
  - limit: request (parseInt, clamped 1..CHATMOD.ADMIN_LIST_MAX, default 50)
  - target: request (keeps rows whose target or reporter is exactly this id)
- **Absent, and a bad value**: no limit or not a number -> 50; no target -> every row
- **Notes**: answers {ok, total, pruned, reports}; the rows carry players' words (the lines, and the reporter's reason) to the owner's screen; one frozen: get for each distinct target on the page; the prune is not written to admin_log

#### `DELETE /api/admin/reports`

- **Handler**: server/src/admin.js:463 _adminFetch -> server/src/chatmod.js:408 _chatModAdminRoute
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query id
- **What it demands of the caller**: the owner's key; nothing else checked
- **Who may start it**: the owner
- **What it does**: changes your own state (deletes one chat_report: record); cannot be undone (the report and its copy of the lines are gone; admin_log keeps only its key, target and reporter)
- **Request id**: id: the report's own key; a repeat changes nothing (404 'not found' the second time)
- **Fields**: id: request (a report's id, with or without the 'chat_report:' prefix; must exist)
- **Absent, and a bad value**: no id -> 400 {ok:false,error:'id required'}; no such report -> 404 {ok:false,error:'not found'}
- **Notes**: admin_log {op:'report_dismiss', reportKey, target, by}

#### `* /api/admin/<anything else>`

- **Handler**: server/src/admin.js:466 _adminFetch
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: the owner's key (checked first: a caller without it never learns which paths exist)
- **Who may start it**: the owner
- **What it does**: reads (answers 404 {ok:false,error:'Not found'})
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: an unknown path, or a known path with a method it does not take (GET /api/admin/grant, POST /api/admin/log), falls through every hand-off to this 404; an exact match is needed (path === '/grant': '/grant/' is unknown)
- **Notes**: the same body as the unconfigured surface's 404 (admin.js:142), so with a good key a typo and a missing secret read alike; a throw is the 500 of the first row

### 6.H4 the owner's test levers (/api/admin/dev/*) (34)

#### `GET /api/admin/dev/state`

- **Handler**: server/src/devtools.js:695 -> server/src/devtools.js:383 _devState
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query id
- **What it demands of the caller**: the admin key (server/src/admin.js:139, checked before the hand-off at admin.js:356); the named player online (devtools.js:96 _devTarget: a playerState exists)
- **Who may start it**: the owner
- **What it does**: reads (one live player's zone, hp, god mode and its ms left, test mode and whether the room allows it, character level, sparring summary, the zone's monster count and next respawn)
- **Request id**: none: a repeat changes nothing
- **Fields**: id: request (a live player's id; looked up in playerState)
- **Absent, and a bad value**: no id -> 400 {ok:false,error:'id required'}; not online -> 404 'player not online'
- **Notes**: SHARED BY EVERY /dev ROW. Reached only through _adminFetch, after its key check (unconfigured secret 404, wrong key 401). A GET names its target in the query (id, name); a POST lever in the JSON body's playerId (devtools.js:755; absent -> 400 'playerId required', asked before the path is known). Most levers need the player ONLINE (they change playerState and call _devPush, devtools.js:104: _saveRpg at once, then player_state). Every lever's ok:false is answered HTTP 404 whatever the reason (devtools.js:786). No lever asks test mode, the room's name or whose character it is: the key is the only guard. Every POST lever is written to admin_log AFTER it ran, with its whole body and result (devtools.js:785; a ring of 100, best effort, admin.js:77); a lever that throws is a 500 and no log line; the GETs are not logged. What the levers mint: bag items through bag.js's door (rows dev_shards, dev_traps, dev_logs, fish_dev, gem_give), health through life.js (dev_heal, dev_hp); none calls gold.js. Gear goes through _grantQuestItem and gear_prov; a weapon is pushed onto weaponStash (no door exists for one). The panel's caller: src/ui/panels/DevPanel.jsx:423 (Authorization: Bearer).

#### `GET /api/admin/dev/goldlog`

- **Handler**: server/src/devtools.js:705 -> server/src/gold.js:217 goldLogOf
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query id
- **What it demands of the caller**: the admin key; the named player online (an own key of playerState, devtools.js:707)
- **Who may start it**: the owner
- **What it does**: reads (a live purse's last GOLD_LOG.KEEP moves, oldest first: when, the road, how much, the purse after; memory only)
- **Request id**: none: a repeat changes nothing
- **Fields**: id: request (a live player's id)
- **Absent, and a bad value**: no id or not online -> 404 {ok:false,error:'not here'}
- **Notes**: answers {ok, id, coins, on (the live flag goldlog), keep, log}. No page or QA tool calls it (docs/OPERATIONS.md: by hand); the log is lost on a deploy.

#### `GET /api/admin/dev/botflags`

- **Handler**: server/src/devtools.js:713 -> server/src/botfp.js:654 _botfpFlaggedList
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: the admin key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (the 50 most recently flagged players: id, name if here, online, score, flag count and kinds, the last flag, counters; and the flag score in force)
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: nothing to be absent
- **Notes**: awaits _hiddenEnsure; flagAt is a hidden setting's value (hidden.js FLAG_AT), sent to the owner's panel only. Panel: src/ui/panels/DevPanel.jsx:616.

#### `GET /api/admin/dev/hidden`

- **Handler**: server/src/devtools.js:721 -> server/src/hidden.js:227 _hiddenAdmin
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: the admin key; the settings were read (hidden.js:229, else 503)
- **Who may start it**: the owner
- **What it does**: reads (every hidden setting: its name, group, words, range, placeholder, the stored value and the value in force; whether hidden_off is thrown; whether a newer worker stored it)
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: the record unreadable -> 503 {ok:false,error:'the settings could not be read; try again'}
- **Notes**: the one answer that carries the private values: it must stay with the owner. Not logged. Any method but GET, POST, DELETE on this path -> 405 'GET, POST or DELETE' (hidden.js:262). Panel: src/ui/panels/DevPanel.jsx:631.

#### `POST /api/admin/dev/hidden`

- **Handler**: server/src/devtools.js:721 -> server/src/hidden.js:227 _hiddenAdmin
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {name, value}
- **What it demands of the caller**: the admin key; the settings were read (else 503); not stored by a newer worker (hidden.js:231, else 409)
- **Who may start it**: the owner
- **What it does**: changes your own state (the room's: one hidden setting stored, or with value null taken back to its placeholder; the whole hidden_settings record in one put, the table rebuilt in the same run)
- **Request id**: none: a repeat changes nothing (the same value stored again)
- **Fields**:
  - name: request (must be a key of HIDDEN_SPEC)
  - value: request (judge: hidden.js hiddenRefusal: a number inside the setting's own range, whole where it must be; null clears)
- **Absent, and a bad value**: body unreadable or name unknown -> 400 'unknown setting' or '\<name>: \<why>'; out of range or not a number -> 400, nothing written
- **Notes**: admin_log gets {op:'hidden_set'|'hidden_clear', name}, never the value (hidden.js:246-248). Answers the view. No playerId: the setting is the room's. Panel: src/ui/panels/DevPanel.jsx:640.

#### `DELETE /api/admin/dev/hidden`

- **Handler**: server/src/devtools.js:721 -> server/src/hidden.js:227 _hiddenAdmin
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query name
- **What it demands of the caller**: the admin key; the settings were read (else 503); not stored by a newer worker (else 409)
- **Who may start it**: the owner
- **What it does**: changes your own state (the room's: one stored setting cleared; with no name EVERY stored setting cleared, back to the placeholders); cannot be undone (the private values are gone from storage; the owner must type them again)
- **Request id**: none: a repeat changes nothing
- **Fields**: name: request (a key of HIDDEN_SPEC, or absent for all)
- **Absent, and a bad value**: no name -> clears all (hidden.js:258-260); an unknown name -> 400 'unknown setting'
- **Notes**: admin_log {op:'hidden_clear', name} or {op:'hidden_clear_all'}. Answers the view.

#### `GET /api/admin/dev/testmodes`

- **Handler**: server/src/devtools.js:723 -> server/src/testmode.js:163 _testModeList
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: nothing read
- **What it demands of the caller**: the admin key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (every character with a testmode: record, newest first: id, name, when, online; and whether the room allows test mode)
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read)
- **Absent, and a bad value**: a failed list -> 500 {ok:false,error:'could not read the list'}
- **Notes**: one list of testmode: capped at TEST_MODE.LIST_MAX. No page or QA tool calls it (docs/specs/test-mode.md: by hand).

#### `GET /api/admin/dev/apinfo`

- **Handler**: server/src/devtools.js:731 -> server/src/devtools.js:644 _apInfo
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query name
- **What it demands of the caller**: the admin key; nothing else checked (the character may be offline)
- **Who may start it**: the owner
- **What it does**: reads (every character of that name, any case, 10 at most: its achievement points split by quests, guild rungs and achievements with their times, the unexplained rest, playtime, and the AP on each daily snapshot)
- **Request id**: none: a repeat changes nothing
- **Fields**: name: words (a character's name as a player wrote it; trimmed and lower-cased, compared to every char: record's name)
- **Absent, and a bad value**: no name -> 404 'name required'; no match -> 404 'no character named \<name>' (the caller's own text back); a failed scan -> 404 'could not read the characters'
- **Notes**: reads char: (a scan, see botflags' found), then rpg:, achv:, guild_claims: and a list of rpgsnap: for each match. Panel: src/ui/panels/DevPanel.jsx:611.

#### `GET /api/admin/dev/looks`

- **Handler**: server/src/devtools.js:737 -> server/src/charwatch.js:106 _watchLooks
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query before, limit
- **What it demands of the caller**: the admin key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (a page of the characters that carry a drawing, newest first, with the drawings, whether each is online, and how many are new since the owner's mark)
- **Request id**: none: a repeat changes nothing
- **Fields**:
  - before: request (a createdAt to page back from; whole, 0 or more)
  - limit: request (clamped 1..CHAR_WATCH.PAGE_MAX, default PAGE)
- **Absent, and a bad value**: no before -> from the newest; a bad number -> 0 or the default; a failed scan -> 500 'could not read the characters'
- **Notes**: the drawings are what players drew (looks a player made), shown to the owner only. Scans char: (see botflags' found). Panel: src/ui/panels/DevWatch.jsx:84.

#### `GET /api/admin/dev/accuracy`

- **Handler**: server/src/devtools.js:742 -> server/src/accuracy.js:361 _accAdminDays
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: query days
- **What it demands of the caller**: the admin key; nothing else checked
- **Who may start it**: the owner
- **What it does**: reads (every player's shots and accepted hits a weapon, a UTC day, newest first, with what is counted and not yet written)
- **Request id**: none: a repeat changes nothing
- **Fields**: days: request (clamped 1..ACC.DAY_KEEP, default 14)
- **Absent, and a bad value**: absent or bad -> 14; a failed read -> 500 'could not read the days'
- **Notes**: lists accday: (60 rows at most by its own keep). Test-mode characters are left out where the days are counted. Panel: src/ui/panels/DevWatch.jsx:184.

#### `POST /api/admin/dev/lookseen`

- **Handler**: server/src/devtools.js:750 -> server/src/charwatch.js:118 _watchSeen
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body (nothing read)
- **What it demands of the caller**: the admin key; nothing else checked
- **Who may start it**: the owner
- **What it does**: changes your own state (the room's: artwatch_seen set to now, so only characters made after it count as new)
- **Request id**: none: a repeat changes nothing (the mark moves to now again)
- **Fields**: (none read; no playerId)
- **Absent, and a bad value**: an unreadable body is taken as {} (devtools.js:748)
- **Notes**: admin_log {op:'lookseen', result}. Tested before the playerId check. Panel: src/ui/panels/DevWatch.jsx:93.

#### `POST /api/admin/dev/kit`

- **Handler**: server/src/devtools.js:759 -> server/src/devtools.js:112 _devKit
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, what, quality, count, raw}
- **What it demands of the caller**: the admin key; the named player online
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's; mint: three test weapons, four armour pieces in a grade, a shield, gems or raw gems, shards, or 40,000 XP into each of sword, bow and staff)
- **Request id**: none: a repeat acts twice (another set of weapons while the stash has room, another 40,000 XP a skill, more gems and shards)
- **Fields**:
  - playerId: request (a live player's id)
  - what: request ('all' by default; weapons, armor, levels, shield, gems, shards; shield, gems and shards are not part of all)
  - quality: request (rare, elite or godly for the armour; anything else is no grade)
  - count: request (gems clamped 1..50, default 3; shards 1..200, default 3)
  - raw: request (true: raw gems)
- **Absent, and a bad value**: no what -> all; an unknown what -> nothing given, still saved, logged and ok:true; not online -> 404 'player not online'; a weapon that does not fit a full stash is dropped, not mailed (devtools.js:137)
- **Notes**: weapons and armour through quests.js:643 _grantQuestItem (armour announced quest_reward_stashed, questId 'devkit'); gems gems.js gemGive and _gemMade; shards bagGive 'dev_shards'; levels _prog3AwardXp {flat:true}. Panel: src/ui/panels/DevPanel.jsx:903.

#### `POST /api/admin/dev/vitals`

- **Handler**: server/src/devtools.js:760 -> server/src/devtools.js:333 _devVitals
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, heal, stamina, hp, god, godMinutes}
- **What it demands of the caller**: the admin key; the named player online (dead or alive: a heal stands a dead one up)
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: full health, stamina and mana and the life phase to alive; or a set stamina or hp; or god mode on or off, in memory)
- **Request id**: none: a repeat changes nothing (the same bars again; god mode's end is pushed out again)
- **Fields**:
  - heal: request (anything but false heals)
  - stamina: request (clamped 0..maxStamina)
  - hp: request (clamped 1..maxHp, never 0)
  - god: request (truthy on, falsy off, absent untouched)
  - godMinutes: request (clamped 1..DEVKIT.GOD_MINUTES_MAX, default 20)
- **Absent, and a bad value**: an empty body heals; a non-number stamina or hp is skipped
- **Notes**: health through life.js _hpSet (roads dev_heal, dev_hp) and _lifeTo 'alive'; god mode is ps._godUntil, never saved, read in combat.js:449 _applyDamage (the one place every hit on a player lands, a player's hits too): the character takes no damage, and only GET /api/admin/dev/state says it is on. Panel: src/ui/panels/DevPanel.jsx:931.

#### `POST /api/admin/dev/quests`

- **Handler**: server/src/devtools.js:761 -> server/src/devtools.js:247 _devFinishQuests
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, except}
- **What it demands of the caller**: the admin key; the named player online
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: every quest of the worker's table marked turnedIn, which opens every gated zone); cannot be undone (no reward is paid and no lever sets a quest back: that character's quest rewards are forfeited, but for the tour's steps, which /dev/tour can re-open)
- **Request id**: none: a repeat changes nothing (already turnedIn)
- **Fields**: except: request (a quest-id prefix left as it is; any string, compared with startsWith)
- **Absent, and a bad value**: no except -> all; not online -> 404
- **Notes**: the quest ids come from the worker's own table, never the body. Answers {finished, quests, total}. Panel: src/ui/panels/DevPanel.jsx:1214.

#### `POST /api/admin/dev/tour`

- **Handler**: server/src/devtools.js:762 -> server/src/devtools.js:304 _devTour
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, at}
- **What it demands of the caller**: the admin key; the named player online
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: every tour step before `at` turnedIn unpaid, `at` offered, every later step and its count forgotten; mint: the one-of tools the earlier steps hand over, if missing)
- **Request id**: none: a repeat changes nothing (the same state; a tool already held is not given again)
- **Fields**: at: request (must be a step of QUEST_TOUR that the quest table has)
- **Absent, and a bad value**: no at or not a step -> 404 {ok:false,error:'not a step of the tour', tour: the list}
- **Notes**: tools through _grantQuestItem (kind inv, max 1). Answers {at, step, of, tools}. Panel: src/ui/panels/DevPanel.jsx:1235.

#### `POST /api/admin/dev/questcount`

- **Handler**: server/src/devtools.js:763 -> server/src/devtools.js:279 _devQuestCount
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, quest, n}
- **What it demands of the caller**: the admin key; the named player online; the quest active for them (devtools.js:286)
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: the worker's own count toward one active quest, _questKills[quest], set)
- **Request id**: none: a repeat changes nothing (the same count)
- **Fields**:
  - quest: request (an own key of the quest table)
  - n: request (clamped 0..999)
- **Absent, and a bad value**: unknown quest -> 404 'no such quest'; not active -> 404 'quest not active'; n absent -> 0
- **Notes**: never a hand-in: the quest is still the player's to claim, and its real reward is then paid. Callers: tools/qa/mp/mp-questline.mjs; no panel button.

#### `POST /api/admin/dev/clearwave`

- **Handler**: server/src/devtools.js:764 -> server/src/devtools.js:458 _devClearWave
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId}
- **What it demands of the caller**: the admin key; the named player standing in a dungeon zone (devtools.js:461)
- **Who may start it**: the owner
- **What it does**: changes your own state (the dungeon run's: every live monster of that instance dies where it stands, no credit, no loot; the run's own tick brings the next wave, the boss or the clear, whose reward is then real)
- **Request id**: none: a repeat acts twice (it clears the next wave too, once that has spawned)
- **Fields**: playerId: request (a player in playerState; only their zone is read)
- **Absent, and a bad value**: not in a dungeon, or not online -> 404 'not in a dungeon'
- **Notes**: a party's whole run is cleared, not the named player's alone. Callers: tools/qa/mp/mp-wheeldungeon.mjs and others; no panel button.

#### `POST /api/admin/dev/hurt`

- **Handler**: server/src/devtools.js:765 -> server/src/devtools.js:435 _devHurt
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, boss, id, dmg}
- **What it demands of the caller**: the admin key; the named player in a zone that has monsters
- **Who may start it**: the owner
- **What it does**: changes your own state (a live monster of the player's zone takes dmg through _applyMonsterDot, the credit the player's; a kill resolves as any kill: mint: its XP and loot)
- **Request id**: none: a repeat acts twice (the monster is hurt again)
- **Fields**:
  - boss: request (true: the zone's live dungeon boss)
  - id: request (a live monster's id in the zone)
  - dmg: request (clamped 1..10,000,000, default 1)
- **Absent, and a bad value**: no such live monster -> 404 'no such live monster in your zone'; no monsters -> 404 'no monsters here'
- **Notes**: any live monster of the zone, one other players are fighting too; the damage dealt is credited to the named player. Callers: tools/qa/mp/mp-slimeboss.mjs and others; no panel button.

#### `POST /api/admin/dev/daily`

- **Handler**: server/src/devtools.js:766 -> server/src/dailyrewards.js:1025 _drDev
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, stars, spins, seasonTier, quest}
- **What it demands of the caller**: the admin key; the named player online; their daily_rewards record loaded
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: season stars added, bonus spins banked, a past season's tier put on and turned over, or a count toward today's quest; mint: a quest it finishes pays its gold by the real road, and a turned-over season mails what it reached)
- **Request id**: none: a repeat acts twice (more stars, spins and count); a finished quest's gold is paid once (opId dq:\<pid>:\<day>:\<i>, dailyrewards.js:834)
- **Fields**:
  - stars: request (clamped 0..500, added)
  - spins: request (clamped 0..SPIN.EXTRA_MAX, added, the bank capped)
  - seasonTier: request (clamped 0..the tiers' count)
  - quest: request ([i, n]: i an index into today's three, n clamped 1..999, added up to the quest's goal)
- **Absent, and a bad value**: an empty body only rolls the day over and re-sends the state; not online -> 404 'not online'; no record -> 404 'no record'; a bad quest index is skipped
- **Notes**: awaits storage (the record's load and save). Sends rewards_state, and daily_progress for a count. Callers: tools/qa/mp/mp-dailyrewards.mjs; no panel button.

#### `POST /api/admin/dev/farmripe`

- **Handler**: server/src/devtools.js:767 -> server/src/devtools.js:482 _devFarmRipe
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId}
- **What it demands of the caller**: the admin key; nothing else checked (the character may be offline: it reads and writes farm:\<playerId> itself)
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's farm: every planted bed's readyAt set to now; the harvest is still the player's to take, and it pays the real crop)
- **Request id**: none: a repeat changes nothing (already ripe)
- **Fields**: playerId: request (taken as it is into the storage key)
- **Absent, and a bad value**: no farm record -> 200 {ok:true, ripened:0, note:'no farm yet'}; a newer worker's record -> 200, untouched
- **Notes**: one get and one put of farm:; sends farm_state if online. Panel: src/ui/panels/DevPanel.jsx:945.

#### `POST /api/admin/dev/trapping`

- **Handler**: server/src/devtools.js:768 -> server/src/devtools.js:567 _devTrapping
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, level, traps, logs, look, pet, next, kill, xp}
- **What it demands of the caller**: the admin key; the named player online
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: the Trapping level set, xp 0; box traps and pine logs SET in the bag; the next pet's look and the next trap roll forced, in memory; mint: a pet put in the record, or a monster killed through the real kill path with all its damage theirs, paying its XP and loot)
- **Request id**: none: a repeat acts twice (another pet, another kill); the set fields are the same again
- **Fields**:
  - level: request (clamped 1..120)
  - traps, logs: request (clamped 0..999; bagSet, so a higher count the player held is lowered)
  - look.gold: request (a boolean)
  - look.size: request (any finite number; clamped to the pets' own size range when the pet is made, petbook.js:516)
  - pet.home: request (a land's name, which picks the pet's kind: petbook.js:195 petKindOf; an unknown land makes the default kind, default 'frost')
  - pet.level: request (clamped 1..100)
  - pet.tradeable: request (truthy: past the 24-hour hold)
  - next: request ('catch' or 'miss')
  - kill: request (a live monster's id in the player's zone)
  - xp: request (that kill's XP, clamped 1..1,000,000)
- **Absent, and a bad value**: every field optional; a bad kill id or an unloaded pets record -> ok:false and HTTP 404 though the fields before it were applied, saved and logged (devtools.js:616-635)
- **Notes**: bag roads dev_traps, dev_logs. Panel: src/ui/panels/DevPanel.jsx:994.

#### `POST /api/admin/dev/codex`

- **Handler**: server/src/devtools.js:769 -> server/src/codex.js:207 _codexDevSet
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, kind, all, n, n2}
- **What it demands of the caller**: the admin key; the named player online (their codex loaded) and the record not locked
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's codex: one kind's kill counts, or every kind's, SET and written at once); cannot be undone (the counts they had are written over; n 0 deletes the kind)
- **Request id**: none: a repeat changes nothing (the same counts)
- **Fields**:
  - kind: request (an own key of PET_KINDS)
  - all: request (truthy: every kind)
  - n: request (clamped 0..CODEX.MAX)
  - n2: request (the same, and never above n)
- **Absent, and a bad value**: neither kind nor all -> 404 'kind (one of ...) or all'; a locked record -> 404 'codex record locked'
- **Notes**: writes codex:\<pid>, sends codex_state. Callers: tools/qa/mp/mp-codex.mjs; no panel button.

#### `POST /api/admin/dev/fish`

- **Handler**: server/src/devtools.js:770 -> server/src/fishlog.js:468 _fishDev
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, next, give, n}
- **What it demands of the caller**: the admin key; the named player online
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: the next fish they catch forced albino, large or normal, in memory; mint: n of a fish key into the bag, a raw one also counted as n catches to weigh)
- **Request id**: none: a repeat acts twice (n more fish)
- **Fields**:
  - next: request ('albino', 'large', 'normal'; null or '' clears)
  - give: request (judge: fishlog.js fishKeyInfo: one of the game's fish keys, raw or cooked)
  - n: request (clamped 1..FISHLOG.GIVE_MAX, default 1)
- **Absent, and a bad value**: neither next nor give -> 404 with the usage line; a bad give -> 404 after a good next was already set
- **Notes**: bag road fish_dev; saves rpg: and fishlog: at once. A given rare fish can be weighed onto the public fish board. Panel: src/ui/panels/DevPanel.jsx:1049.

#### `POST /api/admin/dev/achv`

- **Handler**: server/src/devtools.js:771 -> server/src/achievements.js:596 _achvDev
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, id, all, clear}
- **What it demands of the caller**: the admin key; the named player online (their achievements loaded) and the record not locked
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: one achievement, or all, stamped earned with NO points; or with clear every stamp, count and chosen title forgotten, the points kept); cannot be undone (a stamp set here means that achievement never pays its points to this character)
- **Request id**: none: a repeat changes nothing (a stamp present is left)
- **Fields**:
  - id: request (an own key of the achievements' list)
  - all: request (truthy)
  - clear: request (truthy; read first)
- **Absent, and a bad value**: none of the three, or an unknown id -> 404 with the list of ids; a locked record -> 404
- **Notes**: writes achv:\<pid>, sends achv_state (a single id plays its banner). Panel: src/ui/panels/DevPanel.jsx:1018.

#### `POST /api/admin/dev/killroll`

- **Handler**: server/src/devtools.js:772 -> server/src/killroll.js:158 _killRollDev
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, next, kill}
- **What it demands of the caller**: the admin key; the named player online
- **Who may start it**: the owner
- **What it does**: changes your own state (the named player's next kill's roll forced, in memory, once; mint: with kill, a live monster of their zone dies through the real kill path, all its damage theirs, so the forced roll's drop is minted)
- **Request id**: none: a repeat acts twice (another kill); next alone is the same mark again
- **Fields**:
  - next: request (a whole roll 1..KILL_ROLL.SIDES, refused outside it)
  - kill: request (a live monster's id in the player's zone)
- **Absent, and a bad value**: a bad next -> 404 'next: a roll of 1 to N'; a bad kill -> 404 though a good next was already set; neither -> ok:true, nothing done
- **Notes**: the rarest drop of the table is one call away. Callers: tools/qa/mp/mp-revealbag.mjs and others; no panel button.

#### `POST /api/admin/dev/lifeskill`

- **Handler**: server/src/devtools.js:773 -> server/src/devtools.js:509 _devLifeSkill
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, skill, level}
- **What it demands of the caller**: the admin key; the named player online
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: a life skill, or the four hit skills, SET to a level with xp 0); cannot be undone (the level and XP they had are written over)
- **Request id**: none: a repeat changes nothing (the same level)
- **Fields**:
  - skill: request (one of LIFE_SKILL_KEYS, or 'hits')
  - level: request (clamped 1..120, default 1)
- **Absent, and a bad value**: an unknown skill -> 404 with the list; no level -> 1
- **Notes**: a guild rung is verified against these levels (guilds.js), so a level set here can claim real guild rewards. Panel: src/ui/panels/DevPanel.jsx:958.

#### `POST /api/admin/dev/combat`

- **Handler**: server/src/devtools.js:774 -> server/src/devtools.js:533 _devCombatLevel
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, skill, level, deal}
- **What it demands of the caller**: the admin key; the named player online, with combat skills (a prog3 character)
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: a combat skill, or all, SET to a level with xp 0; with deal true every placed point taken back and the pools dealt for those levels); cannot be undone (the level and XP they had are written over)
- **Request id**: none: a repeat changes nothing (the same level; deal re-deals the same pools)
- **Fields**:
  - skill: request (one of PROG3.SKILLS, or 'all')
  - level: request (clamped 1..PROG3.LEVEL_CAP, default 1)
  - deal: request (true only)
- **Absent, and a bad value**: an unknown skill -> 404 with the list; no prog3 -> 404 'no combat skills'
- **Notes**: the character level others see and the leaderboard's rank follow it. Callers: tools/qa/mp/mp-alliance.mjs and others; no panel button.

#### `POST /api/admin/dev/botflag`

- **Handler**: server/src/devtools.js:775 -> server/src/botfp.js:703 _botfpTestFlag
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId}
- **What it demands of the caller**: the admin key; the named player online and not disconnected
- **Who may start it**: the owner
- **What it does**: changes your own state (the named player's bot record: one flag of kind 'test' added, its detail saying it was planted and is not evidence; nothing in the game acts on a flag)
- **Request id**: none: a repeat acts twice (another test flag)
- **Fields**: playerId: request (a live player's id)
- **Absent, and a bad value**: not online -> 404 'not online'
- **Notes**: the flag is written with the record at its own pace and shows in GET /api/admin/dev/botflags. No page or QA tool calls it (only server/test/bot-flags.test.mjs); the panel reads the list (src/ui/panels/DevPanel.jsx:616).

#### `POST /api/admin/dev/spar`

- **Handler**: server/src/devtools.js:776 -> server/src/spar.js:283 _sparDev
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, add, skill, clear}
- **What it demands of the caller**: the admin key; sparring not switched off (live flag spar); the named player online with a socket and not itself a clone; to add: standing in a zone of SPAR.ZONES and alive
- **Who may start it**: the owner
- **What it does**: changes your own state (the named player's sparring clones: spawned beside them, their skill set, or cleared; memory only); plays (the clones fight their owner, and only their owner)
- **Request id**: none: a repeat acts twice (another clone, up to SPAR.MAX; 'all' replaces what is out)
- **Fields**:
  - add: request ('sword', 'bow', 'staff' or 'all')
  - skill: request (an own key of SPAR_SKILLS)
  - clear: request (truthy; read first)
- **Absent, and a bad value**: an unknown weapon or skill -> 404 with its name; in a dungeon or the farm -> 404; down -> 404; a full set -> 404 'at most N clones'
- **Notes**: sends spar_state to the owner's phone; other phones see the clones as players. Panel: src/ui/panels/DevPanel.jsx:1115.

#### `POST /api/admin/dev/testmode`

- **Handler**: server/src/devtools.js:777 -> server/src/testmode.js:117 _testModeSet
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, on}
- **What it demands of the caller**: the admin key; to turn it ON the named player must be online; off works on anyone
- **Who may start it**: the owner
- **What it does**: changes your own state (the named character's: testmode:\<pid> put or deleted; while on and allowed by the live flag testmode, the honesty checks listed in testmode.js do not judge that character)
- **Request id**: none: a repeat changes nothing (the same record)
- **Fields**:
  - playerId: request (a string of at most TEST_MODE.ID_MAX)
  - on: request (true only; anything else is OFF, devtools.js:777)
- **Absent, and a bad value**: no on -> off; on for an offline player -> 404 'player not online'; a bad id -> 404 'playerId required'
- **Notes**: sends test_mode to that phone; off resets its move budget. Answers {on, online, allowed}. This is the one lever that lets a character past the worker's own checks, and it too is asked of any online character. Panel: src/ui/panels/DevPanel.jsx:1075.

#### `POST /api/admin/dev/dropage`

- **Handler**: server/src/devtools.js:778 -> server/src/itemdrop.js:218 _dropDevAge
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, ms}
- **What it demands of the caller**: the admin key; nothing else checked (it walks the piles the named player dropped)
- **Who may start it**: the owner
- **What it does**: changes your own state (the named player's dropped piles made ms older: sooner anyone's to take, sooner gone)
- **Request id**: none: a repeat acts twice (older again)
- **Fields**: ms: request (whole, 1..600,000, refused outside it)
- **Absent, and a bad value**: no ms or out of range -> 404 'ms 1..600000'
- **Notes**: re-sends loot_drop for each pile (a revealed one in the tick's events, a private one to its dropper). Callers: tools/qa/mp/mp-itemdrop.mjs; no panel button.

#### `POST /api/admin/dev/revealbag`

- **Handler**: server/src/devtools.js:779 -> server/src/revealbag.js:383 _revealBagDev
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId, grade, give}
- **What it demands of the caller**: the admin key; the named player online
- **Who may start it**: the owner
- **What it does**: changes your own state (with grade alone: the room's next mystery-capable drop rolls that grade, once; mint: with give, a graded piece put in the named player's bag now, unrevealed where their phone holds reveals)
- **Request id**: none: a repeat acts twice (another piece); grade alone is the same mark again
- **Fields**:
  - grade: request (rare, elite or godly)
  - give: request ('weapon', or a slot of MONSTER_ARMOR_DROPS: armor, legsArmor)
- **Absent, and a bad value**: a bad grade -> 404 'grade: rare, elite or godly'; a bad give -> 404; a full weapon bag -> 404 'weapon bag full'
- **Notes**: grade alone is ROOM-WIDE on purpose (revealbag.js:134-141): the next such drop of ANY player's kill takes it, not the named player's. A given weapon is pushed onto weaponStash and saved; a given armour piece is recorded in gear_prov as a 'drop' and announced by a loot_credit with lootId 'dev-reveal'. Callers: tools/qa/mp/mp-revealbag.mjs, tools/qa/ui-review/states.mjs; no panel button.

#### `POST /api/admin/dev/lookwipe`

- **Handler**: server/src/devtools.js:780 -> server/src/charwatch.js:125 _watchWipe
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: JSON body {playerId}
- **What it demands of the caller**: the admin key; a char: record with a look exists (online or not)
- **Who may start it**: the owner
- **What it does**: cannot be undone (the named character's drawings, the nine drawing keys, deleted from char:\<pid> for good and artWipedAt stamped; nothing else of the look goes); changes your own state (if online: gone from the session and playerState, and every other phone told by a player_update with those keys null)
- **Request id**: none: a repeat changes nothing (nothing left to wipe: ok:true, wiped [])
- **Fields**: playerId: request (taken into the storage key char:\<playerId>)
- **Absent, and a bad value**: no such character -> 404 'no such character'
- **Notes**: no snapshot is taken first. A later track from that phone is stamped back to the stored record's look (server/src/index.js:5352), so the drawings do not return. admin_log has the op and the list of keys wiped. Panel: src/ui/panels/DevWatch.jsx:102.

#### `* /api/admin/dev/<anything else>`

- **Handler**: server/src/devtools.js:746 -> server/src/admin.js:466 _adminFetch
- **Comes in**: admin (the owner's key)
- **Envelope**: alone: whatever was sent
- **What it demands of the caller**: the admin key
- **Who may start it**: the owner
- **What it does**: reads (answers a refusal; nothing changes)
- **Request id**: none: a repeat changes nothing
- **Fields**: (none read but playerId on a POST)
- **Absent, and a bad value**: an unknown /dev path, or a GET or DELETE on a lever's path -> _devFetch returns null (devtools.js:746, 781) and the request falls through admin.js's other routes to 404 {ok:false,error:'Not found'}; a POST with no playerId -> 400 'playerId required' BEFORE the path is known, so an unknown POST path reads as a missing id; a POST on a GET's path with a playerId -> 404; a method other than GET, POST, DELETE on /dev/hidden -> 405
- **Notes**: paths are matched whole (path === '/dev/kit'): a trailing slash or a longer path is unknown. A lever that throws is caught by _adminFetch and answered 500 with the error's own message.


## 7. Found, not fixed

What the readers met that is outside this card. One line each, as the reader wrote it, under the row it was found at. Nothing here was changed.

### Read these first

A pointer, not a ranking: the lines below that touch who a player is, value
made on the phone's word, value between players, or a private thing anyone
can read. Each is a reader's finding from the code; the ones that were also
run against the room's code say so in their line.

- **Who a player is.** F1 and F2 (a join's id of any type, or none); F9 (a `track` renames the player for chat and relays); F4 and F25 (names kept or sent uncleaned).
- **Claims step 4.2 does not list.** F5 (gear stashes claimed at a join); F58 (armour as the phone describes it); F59 (the staff's splash); F89 (the shield on the arm); F48 (a pet's reach); F40 and F38 (blows nobody saw swung); F69 (the harvest's wind-up; F72 is the detail of 4.2's own "harvest's grade").
- **Value between players.** F170 (a sell order's labels are the seller's word); F104 (a seller's Yes lands on whatever the offer is by then); F86 (a weapon named by its place in a list); F107 (a stake placed while the match is being watched); F111 (the item wager doubles any stackable); F129 (a duel's stake: a live path no page offers); F137 (an alliance war pays both sides).
- **Paid more than once.** F114 (the login wheel, by device id); F117 (the rise chest, after 48 hours).
- **Private things anyone can read.** F178 and F102 (bids and offers); F124 (a trade offer goes to every phone); F198 (crash reports); F19 (every live flag goes to every phone); F16 (the tick goes to sockets that never joined).
- **Putting a player back.** F203 (a restore writes the character's record and nothing else).

### A: the session: join, move, track, pong

- F1 (`join`, phone to worker): a join's id is never checked to be a string (join.js:651 tests MAGIC_IDS only for strings; :804 session.id = msg.id): ["toString"], ["__proto__"], 123, {a:1} and true all join, get state_sync, and key the room's maps and storage as 'toString', '__proto__', '123', '[object Object]', 'true' (run on the room code: rpg:toString and rpg:__proto__ were written). This reopens the class tag 1202 and tag 3167 closed (the jackpot won by an id named toString)
- F2 (`join`, phone to worker): a join with no id (or '', 0, null) is taken: join.js:672 skips the identity gate on a falsy id and :804 leaves session.id falsy, so the one-join rule (index.js:5176) never closes the socket. Run on the room code: each such join made a player keyed 'undefined', wrote cadence:login:undefined, sent player_join to every other phone and answered a whole state_sync; it can be repeated inside the message budget
- F3 (`join`, phone to worker): player_join carries the join's top-level name as it came (join.js:1751-1752 and nearjoin.js:225-231 send msg.name; only session.name is cleaned at join.js:808). Run on the room code: a 3,006-character name with a newline, and an object, reached the other phone, which keeps it as the nameplate (src/networking/wsClient.js:4016). The stored permanent name is not what goes out either
- F4 (`join`, phone to worker): the permanent name is written with its control characters: _sanitizeJoinData only cuts data.name to 64 (join.js:427) and _loadOrCreateCharacter only trims it (join.js:619-622). Run on the room code: char:\<id>.name kept a newline, a bell and a right-to-left override, and that is the name chat and state_sync then give the others
- F5 (`join`, phone to worker): a claim 4.2 does not list: the four gear-stash lists of a join are merged into the worker's stashes on every join of a character on file, checked for shape only (gearstash.js:540-592; its own note says "a modified client can still hand itself gear"). Run on the room code: a second join's rpgArmorStash and rpgShieldStash were saved to rpg:\<id> as prov legacy pieces. A new character cannot on its first join (its rpg\* keys are dropped), and can on its second
- F6 (`join`, phone to worker): a claim 4.2 does not list: data.rpgDef is taken from the phone on every join, clamped 0..2100 (join.js:1358); 99999 became 2100 on the room code. It is the PvP mitigation input until the phone's next stats_update
- F7 (`join`, phone to worker): a claim 4.2 does not list: device.id is the phone's own word (devicelock.js:71 cleanDevice). The device lock's first-device rule and the login wheel's one-account-a-device rule (loginspin.js:89) both rest on it
- F8 (`pong`, phone to worker): a claim 4.2 does not list: the phone sets its own round trip between 0 and LAGCOMP_RTT_CAP (answer late, or send hd), and combat.js:2303 rewinds a PvP target by half of it
- F9 (`track`, phone to worker): a track renames the player. `name` is on TRACK_COSMETIC_KEYS on purpose (index.js:920: friends.js, party.js and trade2.js read ps.name) and nothing holds it to the character's record. Run on the room code: track {name: 'Watcher'} from Alice set ps.name and session.data.name; the next chat line went out as {name: 'Watcher'} (index.js:5011), player_update carried it, and a later joiner's state_sync named her so. The same ps.name is read by relay.js:106, chatlanes.js:73, chatmod.js:216, friends.js:86, party.js:91, trade2.js:160 and 181, store.js:813, storechat.js:102, gamble.js:135 (Ace's board). A newline and a bell in it were kept. Only the leaderboard keeps the permanent name (session.name)
- F10 (`track`, phone to worker): a claim 4.2 does not list: track.data.aw === 0 is the phone's word that a person is there, and it alone stamps the AFK clock (index.js:5145): a script that sends it holds its place in the room for good
- F11 (`track`, phone to worker): a claim 4.2 does not list: the leaderboard row's kills, dungeons, goldEarned, playtime and lifeTotal are track.data.rpgData's, as the phone says (index.js:6491 and :6561; the code's own note: "rpgData stays client-reported")
- F12 (`track`, phone to worker): avatar is any string up to 512 characters, passed on to the other phones, and a phone that draws that player without its sprites loads it as an image address with no check that it is the game's own proxy (src/rendering/systems/entityRenderer.js:13370 getNftTextures -> src/rendering/nftAvatars.js:121): another player's phone can be made to fetch an address of the sender's choosing
- F13 (`move`, phone to worker): a move's d, f, eqc, eql, eqs and ex are stored as sent, any type and any size inside the frame (movement.js:731, :741-744, :760), and vx and vy any truthy value (:737); the tick puts d, f, eqc, eql, eqs and ex in every player entry it sends (tick.js:547-548) and state_sync tells a joiner the same (PEER_PUBLIC_KEYS). Run on the room code: a 12,000-character d, an object f, an object ex and a 500-character eqc were all kept and told to a later joiner. The join's own d is held to 16 characters (join.js:401); the move's is not
- F14 (`room_full`, worker to phone): room_full's reason is sent and never read by the phone (wsClient.js:1495-1500 keeps count, cap and retryMs): an address over its limit ('ip') is told the world is full

### B1: the world stream, part 1

- F15 (`tick`, worker to phone): a move's d, f, vx, vy, eqc, eql, eqs and ex are stored as sent, any JSON value, with no type or size check (server/src/movement.js:731 to 760; only x and y are typed, 532), and playerWire passes them to every phone on each roster, once a second (server/src/tick.js:546 to 548); d, vx, vy even in a far player's slim entry (tick.js:591). The blob channel tag 1945 closed on track is open on move.
- F16 (`tick`, worker to phone): the tick goes to sockets that have not joined: the send loop skips nobody (server/src/tick.js:1188); with no zone such a socket gets the whole roster each second and every event whatever its place (server/src/eventplace.js:151), room chat included, for up to FLOOD.JOIN_WINDOW_MS (server/src/flood.js:73), before any identity, key, device or account check.
- F17 (`tick`, worker to phone): seq and ts go out on every tick (server/src/tick.js:864, 977) and the phone's case reads neither (src/networking/wsClient.js:986 to 1472).
- F18 (`tick`, worker to phone): the phone reads eqst from a tick's player (src/networking/wsClient.js:1134, 1139); playerWire never sends it (server/src/tick.js:546 to 587).
- F19 (`state_sync`, worker to phone): caps spreads the whole liveflags record (server/src/join.js:1892): any limit the owner sets there, the socket door's ip_sockets and ip_joins_min included (server/src/flood.js:178, 184), is told to every phone that joins.
- F20 (`state_sync`, worker to phone): a monster's snapshot shape is written three times and they differ: the join's own (server/src/join.js:1919) sends variant always; monsterSnapWire (server/src/spawnscale.js:18) and the dungeon's (server/src/dungeon.js:854) send it only with home. spawnscale.js:51 says the join path uses the one definition; it does not (nodes too: join.js:1948 beside spawnscale.js:64).
- F21 (`state_sync`, worker to phone): for a phone that did not ask for near-join, a peer's x and y in players are that peer's own last track or join claim, not its bounded move: session.data wins in _peerPublic (server/src/index.js:6579) and x, y are TRACK_COSMETIC_KEYS; the next roster corrects it. nearjoin.js live (99) fixes it for near-join phones only.
- F22 (`zone_state`, worker to phone): _pushZoneRoster (server/src/spawnscale.js:78) sends zone_state, zone_monsters and zone_nodes and nothing in server/src calls it since the scaler went (tag 4850); only server/test/itemdrop.test.mjs:146 does.

### B2: the world stream, part 2: the player

- F23 (`player_state`, worker to phone): fields the worker sends that the phone's case never reads: armorStash, legsStash, shieldStash, gearStash, amuletStash (server/src/persistence.js:698-702, whose own comment says today's client does not read them), buildPointsThisLvl (server/src/persistence.js:651; the phone counts its own _buildPointsThisLvl) and svKills (server/src/persistence.js:737, sent "so the client can show the same number the chain attestation carries": nothing in src/ assigns R.svKills, so src/ui/mobile/dash/JourneyPanel.jsx:84 and MorePanel.jsx:125 always fall through to the phone's own counter)
- F24 (`player_state`, worker to phone): _questFlags (server/src/persistence.js:705) is the stored record's copy of an old join's claim (server/src/join.js:1103; empty for a new character, whose rpg\* claims are dropped at server/src/join.js:1017 before join.js:1292 reads them) and nothing on the worker writes it afterwards, yet the phone's case replaces its own live map with it at the first player_state of every session (src/networking/wsClient.js:3181): the counters the page keeps there go back to that copy at each join (the reset handoff rule 18 warns of, once a session)
- F25 (`player_join`, worker to phone): the top-level name is the joiner's raw join `name`, any JSON value up to the frame's 16 KB: server/src/join.js:1751-1752 pass msg.name, not session.name, which the same handler sanitised at join.js:808 and set to the record's permanent name at join.js:865 (the tag 1970 fix reached state_sync and the leaderboard, not this broadcast; server/src/nearjoin.js:225-231 send the same raw value). The phone stores it as the peer's name (src/networking/wsClient.js:4016); the name plate and the death card each bound it themselves (src/rendering/systems/entityRenderer.js:13811-13815, src/game/deathCard.js:45), and the first look relay that carries a name writes over it
- F26 (`player_join`, worker to phone): the phone's case reads the top-level name and, of data, only x y color avatar d bt bl eqc eql eqs eqst st rpgLv rpgHp rpgMaxHp z fa and the RENAMED look keys (src/networking/wsClient.js:4008-4035): data.name, wpnMat, clanTag, clanColor1, rpgData and every other same-named key are sent and not read here (the snapshot road reads them through peerPassthroughFromWire, wsClient.js:323; server/src/spar.js:426-432 sends a clone's player_update for exactly this reason). The comment at src/networking/wsClient.js:314-316 says this case Object.assigns the raw data; it does not
- F27 (`player_update`, worker to phone): data.name in a look relay is the sender's own track `name` as written: server/src/index.js:5298-5307 only cuts it to 64, none of the five stamps at index.js:5337-5352 touches it, and _stampRecordLook covers RECORD_LOOK_KEYS only (server/src/join.js:175-178, name left out on purpose); the phone's case Object.assigns it onto the peer (src/networking/wsClient.js:4076). So a modified page renames itself on every other screen mid-session although the stored name is permanent (server/src/join.js:854-865). The same track writes ps.name (server/src/index.js:5358), which room chat and every relay then sign with (server/src/index.js:5011, server/src/relay.js:106)
- F28 (`player_count`, worker to phone): after an AFK or a flood close the count can be one too low: those ways drop the session from the map as soon as the leave first awaits (server/src/leave.js:129-130, `dropNow`), and when it does await (a dirty regen save at leave.js:197, the daily counters at leave.js:204) the broadcast at server/src/leave.js:260 then sends getPlayerCount() - 1 with the leaver already gone from the count. It stands until the next join or leave
- F29 (`inbox_delivered`, worker to phone): a player's words inside a sentence the game speaks (pillar 11.4), beyond the one the plan names: besides `\<label> sold to \<buyer's name> for \<price>` (server/src/store.js:1043), the note is `trade with \<the other player's name>` (server/src/trade2.js:323, 355, 434: ps.name, which a track can rewrite) and `alliance war vs [\<tag>]` / `clan war vs [\<tag>]` (server/src/alliance.js:521, server/src/clans.js:495: a tag a leader typed). The phone prints each as a system line with no name (src/networking/gameEvents.js:2109) and, for source 'market', as a toast (gameEvents.js:2126)

### C1: small session messages

- F30 (`heap_burn`, phone to worker): a claim the plan's 4.2 does not list, and a miss that never reaches the worker: a phone that never sends heap_burn never burns, and one that sends it burns anywhere on the safe ground, heap or no heap (server/src/heapburn.js:60-70; the file's header accepts it at 29-31: a phone that lies can only hurt itself)
- F31 (`acc_request`, phone to worker): no pace on a read that goes to storage every time: each acc_request is one storage.get (server/src/accuracy.js:352), bounded only by the socket's budget
- F32 (`feedback`, phone to worker): a case no phone sends: nothing in src/ sends a 'feedback' message (grep), and since the relay became an allowlist (server/src/relay.js:41) the default branch would drop it too, unless the live flag relaylist is false
- F33 (`character_reset`, phone to worker): no pace, and the undo can be pushed out: each restart costs a snapshot put, about a dozen deletes and a list, and the parachute ring keeps SNAPSHOT.KEEP a player (server/src/admin.js:45, 127), so restarts repeated past that number drop the first life's prereset snapshot at the next daily prune (server/src/persistence.js:418-432, 448)
- F34 (`character_reset`, phone to worker): value parked outside the character's own keys outlives the wipe: _resetCharacterData touches no store_listing:, mkt_order: or inbox: (server/src/persistence.js:444-585; the mail is kept on purpose, docs/specs/character-restart.md:51), and a listing still pays its sellerId, the same id (server/src/store.js:1114): goods listed before a restart come back to the new character

### C2: dungeons, the Bro check, live switches

- F35 (`dungeon_start`, phone to worker): the Workshop's start (a config, no `entrance`) checks no place: from anywhere in the Wheel, out of a player fight, it gives the pass into a private run (server/src/dungeon.js:354-374; server/src/zonejudge.js:179 takes a step into a dungeon from anywhere on the pass), and a step OUT of a dungeon to the farm is not judged (server/src/zonejudge.js:181 judges only a move whose own zone is the Wheel): the zone judge's R2 (out of the Wheel only from its safe ground) is walked round, and the Wheel's monsters left, by one message
- F36 (`dungeon_start`, phone to worker): a start has no pace and no cost, and MAX_INSTANCES (8) is the whole room's: eight sockets each holding one run, sent again inside EMPTY_SWEEP_MS, keep every slot, and every other player's start is answered room-full (server/src/dungeon.js:337-343, 1004)
- F37 (`dungeon_start`, phone to worker): a player's words in the game's own voice (11.4): a Workshop run's name is its owner's text, clamped to 24 characters and not cleaned, and on each pulled party member's phone it becomes the zone's name and the popup over their head (server/src/dungeon.js:299, 425; src/networking/gameEvents.js:930, 992)

### D1: combat, the phone's claims

- F38 (`player_attack`, phone to worker): a blow at a player needs no swing or shot the worker saw: any claim lands on a player within PVP_TUNING.RANGE_CAP (250 px for a sword, far past a sword's own reach; 950 px with a bow or staff held) at whatever angle the phone names, in an arc up to PI\*1.41 (server/src/combat.js:2348, 2360, 2373). 4.2 lists the 400 px against monsters, not this.
- F39 (`player_attack`, phone to worker): the phone's processGameEvent still has a case 'player_attack' (src/networking/gameEvents.js:4485) that nothing can deliver: the type has a router case, so it is never relayed (relaylist on or off), and server/src sends no such type. Reached, it would print a hit from a payload.dmg the worker never sends and relay `stunned` and `pvp_confirmed` at the named sender (gameEvents.js:4521, 4537). Only the page's own window.__btDispatch (src/networking/wsClient.js:4713, set on every page, not only QA's) can call it.
- F40 (`monster_damage`, phone to worker): a sword has no bound on hits a second across monsters: hitproof.js:242 _hitRateTake lets every melee claim through, and off the free-swing trial each monster's lane is its own (server/src/combat.js:1405), so a claim lands a full roll on EVERY monster within PVE_MELEE_RANGE every 210 ms, whatever the character's Speed. The phone chooses the lane: the trial is asked for in the join (`fs`, server/src/join.js:890), and a join that leaves it out keeps the 210 ms lanes. On the trial one swing takes up to FREE_SWING.SWING_TARGETS (24) monsters anywhere inside the 400 px. 4.2 lists the 400 px, not the count or the choice of lane.
- F41 (`arrow_blast`, phone to worker): with bowvolley thrown false, a blast needs no paid special behind it: its gates are the cooldown, the reach and owning a bow (server/src/arrowblast.js:98), so a phone may send one every ARROW_BLAST.CD_MS with no arrow fired and no mana spent, each a bow-special roll on up to 16 monsters round any point within 1,400 px. Not on 4.2's list; unreachable while the switch is on.
- F42 (`ability_use`, phone to worker): `tier` rides the wire and nothing reads it: src/game/playerActions.js:265 sends it, server/src/index.js:3193 ignores it.
- F43 (`ability_rejected`, worker to phone): two of the three shapes lose their words on the phone: ability_use's refusal carries no kind and no reason (server/src/index.js:3253) and the burst's carries type 'burst' and reasons abilityRejectText has no case for (server/src/burst.js:162), so both print the default "Ability failed" (src/data/abilities.js:237) where the handler's own comment promises "Not enough stamina!" for a dodge, lunge, retreat or swipe (src/networking/wsClient.js:3904).
- F44 (`nml_loss`, worker to phone): the killer's name is set inside the game's own sentence on the phone: "\<name> killed you while you carried a red skull" and "\<name> took everything you carried in No man's land" (src/game/noMansLand.js:321, 327). The words rule, 11.4.
- F45 (`nml_loss`, worker to phone): three fields the worker sends are read by nothing on the phone: weapons, worn and bag (server/src/nomansland.js:827; src/game/noMansLand.js:300).
- F46 (`nml_take`, worker to phone): the victim's name is set inside the game's own sentence on the phone: "You took \<name>'s things" (src/game/noMansLand.js:347). The words rule, 11.4.
- F47 (`nml_take`, worker to phone): lootId and worn are sent and nothing on the phone reads them (server/src/nomansland.js:1044; src/game/noMansLand.js:336).

### D2: combat, the worker's events, and loot

- F48 (`loot_pickup`, phone to worker): viaPet is a claim the plan's 4.2 list does not have: a pickup marked viaPet is granted up to PETS.FETCH_RANGE from where the worker has the owner, for anyone with an active pet, because the worker tracks no pet (server/src/index.js:4594-4607, server/src/pets.js:64)
- F49 (`loot_pickup`, phone to worker): a road between players with no handshake, fee or record: a death pile after ownerOnlyUntil, and a dropped item after its private minute, go whole to the first player in range who asks (server/src/index.js:4565-4572 and 4612-4660)
- F50 (`item_drop`, phone to worker): with loot_pickup this hands goods to another player with no trade window, no fee and no record (server/src/itemdrop.js:16-21); and the pile lives in memory only, so a restart inside its 130 s destroys goods the bag's save has already left out (server/src/itemdrop.js:25-27)
- F51 (`pvp_hit`, worker to phone): a player's name inside a sentence made on the phone: 'Killed by ' + attackerName (src/networking/gameEvents.js:4454); the worker sends the name as a field of its own
- F52 (`pvp_hit`, worker to phone): rewindTicks, how far the worker rewound the fight for lag, goes to every phone in the room and no phone reads it (server/src/combat.js:2701; the name is nowhere in src/)
- F53 (`combat_credit`, worker to phone): xpAmt, the XP really paid, is read by no phone (it appears in src/ only in a comment, src/networking/wsClient.js:3592): the figure a player sees comes from monster_kill's base xp times their share (src/networking/gameEvents.js:3060), while server/src/combat.js:2129-2133 calls combat_credit "the multiplied truth"; levelsGained is not read either
- F54 (`loot_drop`, worker to phone): pile.killerName, a player's name, is drawn inside "\<name>'s loot" on the phone (src/rendering/systems/effectsRenderer.js:10524); the worker sends it as a field of its own
- F55 (`loot_drop`, worker to phone): every phone in the room is sent each recipient's share: the pile's coins and shares (server/src/index.js:4222-4225) and monster_kill's shares (server/src/combat.js:2010-2012), though the comment at server/src/index.js:4789-4792 says the credit is sent privately so others cannot see a player's share
- F56 (`loot_claimed`, worker to phone): byPlayer and armorClaimedNow are read by no phone (neither name is in src/): a watcher's copy of the pile keeps its armour label after another player took the piece, which server/src/index.js:4845-4846 says the field is for; the gem is not cleared either (src/networking/gameEvents.js:361-365 clear the remnant and the shard only)

### E: progression and quests

- F57 (`stat_allocate`, phone to worker): a dormant case: no phone sends stat_allocate, and nothing earns unspentT2 any more (grids.js:184 _tryLevelUpFromBuildPoints has no caller; only an old stored record or the join holds a count). A spend takes the point and raises no stat on the worker (grids.js:264): the stat is the phone's to add (src/networking/wsClient.js:3641) and to report by stats_update, whose stat loop a prog3 character's worker skips (grids.js:773)
- F58 (`stats_update`, phone to worker): a claim step 4.2 does not list: armour described by the phone. An armor or legsArmor object with no ledger gid is worn as the phone describes it, marked legacy (gearprov.js:501), inside the tierMult clamp and the equip gate only. Run against the room code: a fresh level-1 prog3 character sent armor {name, tierMult: 1}, owned nothing, and its damage taken fell to 0.7 (_armorDrMult). The page's own effect still sends the described form every time (src/ui/BroTown.jsx:3616)
- F59 (`stats_update`, phone to worker): a claim step 4.2 does not list: weaponSpecs.staff.detonation. The handler stores weaponSpecs for a prog3 character (grids.js:818-836 has no prog3 gate) and combat.js:1911 _staffSplashMult reads it with no prog3 gate, for the staff's splash on monsters (combat.js:1867), on players (pvpextras.js:700) and the gathered bolt (drawgather.js:348). Run against the room code: a prog3 character reporting detonation 100 doubled its splash radius. Nothing checks the points were ever earned
- F60 (`stats_update`, phone to worker): a payload that is not an object throws: msg.payload = "x" reaches `'armorRef' in payload` (grids.js:1002) and raises a TypeError. Nothing has changed by then; alone, the rejection leaves _onMessage (index.js:5087); in a bundle it is caught and logged (index.js:5083)
- F61 (`stats_update`, phone to worker): an armorRef or legsArmorRef that names no piece gets no answer at all (grids.js:1008-1012, 1073-1074): the comment above it promises an echo that puts the phone right, but the tail echoes only when something changed (grids.js:1131), so the phone keeps showing the piece on (the bare-return refusal, TRAPS 284's class)
- F62 (`build_point_earned`, phone to worker): the case does not do what its comment says: index.js:6217-6221 says the worker "increments buildPointsThisLvl and runs the 5-BP-per-level loop", but _handleBuildPointEarned only recomputes maxes (grids.js:206-229) and the loop it names, grids.js:184 _tryLevelUpFromBuildPoints, has no caller
- F63 (`guild_quest_turn_in`, phone to worker): a case with no pace: every guild_quest_turn_in that names a real skill, paid or refused, is a storage read of guild_claims:\<pid> (guilds.js:43); only the socket's message budget bounds it
- F64 (`prog3_level`, worker to phone): a field nothing reads: prog3_level carries abilities (prog3.js:1369 _abilityUnlockList) and no phone code reads it (the phone works its unlocks out from its own table: src/data/abilities.js:215)
- F65 (`points_reset_result`, worker to phone): fields nothing reads: wait and pool (pointsreset.js:137, 148): the phone's lines read ok, err, poolBy and shared only (src/game/pointsReset.js:73-80)
- F66 (`rest_result`, worker to phone): fields nothing reads: wait and where (rest.js:118, 129): the phone reads ok, err, until and ms only (src/game/rest.js:77-101)
- F67 (`quest_reward_stashed`, worker to phone): a field nothing reads: questId (quests.js:481, devtools.js:162): the phone's case never reads it
- F68 (`guild_quest_error`, worker to phone): a field nothing reads: code (guilds.js:35): the phone shows message only

### F: gathering, cooking, fish

- F69 (`extraction_start`, phone to worker): the hit plan is the phone's choice. A start with no hitSeq is recorded on the old timer (2 to 10 s, server/src/gathering.js:1095 to 1114, _computeOpenDelayBase :736) and the strike is held to that, not to the plan's (hits - 1) swings of 540 to 650 ms each, up to GATHER_HITS.MAX_HITS (server/src/gathering.js:1206). A phone that leaves hitSeq out skips the plan's wait on a high tier. Step 4.2 lists the harvest's grade, not its wind-up
- F70 (`extraction_start`, phone to worker): a start is not held to place: no check of the sender's zone, distance or life (server/src/gathering.js:1071 to 1115). A start sent while still walking runs its window on the way and the strike can land on arrival; only the strike checks place
- F71 (`extraction_start`, phone to worker): the start's tool gate reads the payload's skill (server/src/gathering.js:1090, _hasGatherTool :1044): a skill name outside _GATHER_TOOL_FOR_SKILL needs no tool, so a player with no tool gets a record, and with it the monster shield beside a live node (_extractionShielded server/src/gathering.js:925 asks for no tool). The strike still refuses
- F72 (`node_strike`, phone to worker): the judge of 'perfect' is a number the same message carries (swipeFp.ent against ENT_FLOOR, server/src/botfp.js:408): a forged fingerprint keeps every perfect, so the grade's only real bounds are HARVEST_PERFECT_PER_MIN (server/src/gathering.js:598) and the hour cap. This is the detail of 4.2's "the harvest's grade", not a new claim
- F73 (`cook_request`, phone to worker): taps is sent on every cook (src/game/lifeSkillRewards.js:888, "so the server can re-verify both landed in the golden zone") and the worker never reads it: no `taps` in server/src/cooking.js:928 to 1020 or anywhere in server/src
- F74 (`cook_request`, phone to worker): a cook asks for no fire: _handleCookRequest checks no place and not the worker's own note of a lit fire (ps._fireLit, server/src/moveclaims.js:193), so firemaking_request and its log can be skipped (server/src/cooking.js:928 to 1020)
- F75 (`cook_request`, phone to worker): a cook asks for no life: no dying / dead / disconnected check in server/src/cooking.js:928 to 1020, where eat_request, potion_drink, firemaking_request and cook_recipe each have one
- F76 (`cook_request`, phone to worker): its four refusals answer with _sendPlayerState (server/src/cooking.js:936, 946, 977, 988), which sends a v2 phone nothing when nothing changed (server/src/persistence.js:761), so the cook the phone drew stays drawn; server/test/refusal-door.test.mjs:241 lists the no-fish one as known
- F77 (`shop_purchase`, phone to worker): a case no phone sends and that can do nothing: DIEGO_SHELF is empty (server/src/data.js:692), so server/src/cooking.js:857 drops every message. Left standing for it: the router's case (server/src/index.js:5841), the handler, the shim's line (src/networking/wsClient.js:6293) and the gold roads tonic_buy and tonic_refund
- F78 (`harvest_credit`, worker to phone): three of its fields nothing reads: nodeId, zone and xpAmt are sent (server/src/gathering.js:1626 to 1629) and the phone's case reads only shard, fish, leveled, skillName and newLevel (src/networking/wsClient.js:3497 to 3527)

### G: the farm, pets, traps

- F79 (`farm_act`, phone to worker): no handler of the farm reads where the sender stands (farm.js:394, 418, 590 and farmorders.js:235 never read ps.z, ps.x or ps.y): beds are worked, seeds bought and orders delivered from anywhere in the world, where the bank asks its place (bank.js:232 _bankPlaceOk)
- F80 (`farm_order`, phone to worker): fightlock.js:85 lists farm_order under the switch fightlock, but farmorders.js:259 asks _farmOrderInFight (farmorders.js:196), which reads no live flag: fightlock false does not open a delivery, where every other fightlock road goes through _bagLockedByFight (nomansland.js:250), which does
- F81 (`pet_capture`, phone to worker): no phone sends pet_capture (no send site in src/, and the shim has no line for it at src/networking/wsClient.js:5958): the case at server/src/index.js:6042 and pets.js:78 answer only a page older than tag 3120
- F82 (`pet_name`, phone to worker): a pet's name leaves its owner as the game's own label: an auction listing takes it as the listing's name and for the sale's notes (store.js:279-282 _stPetDisplay: `name: pub.name || kindName`), and a trade window shows it (trade2.js:113), cleaned only by cleanPetName (petbook.js:228: a character class and a length, no word list)
- F83 (`pet_house_buy`, phone to worker): petbook.js:703 refuses only a missing or disconnected state, so a dying or dead player may still buy room (gold spent), rename, release or set a pet out; the farm and the traps refuse the dead (farm.js:377, trapping.js:269), the check shop.js:626 calls "the check every other counter makes"
- F84 (`pets_state`, worker to phone): the phone puts a pet's name inside its own sentences ('Named \<name>' at src/game/trapping.js:328, '\<name> is with you' at src/game/trapping.js:331); on a traded or bought pet that name is another player's words (the words rule, 11.4, on the phone's side)
- F85 (`pet_capture_result`, worker to phone): the phone's 'Captured' and 'Capture failed' branches (src/networking/gameEvents.js:5260-5264) can never run against this worker, which sends only 'retired', and no phone sends the pet_capture that asks for it

### H: gear and the forges

- F86 (`equip_request`, phone to worker): equip_request and sell_weapon name a weapon by its PLACE in weaponStash, with no id and no request id (server/src/gear.js:747, 231), and the two sides order the bag differently after an equip: the phone takes the entry out and puts the old weapon at the END (src/ui/mobile/dash/equipActions.js:413-416), the worker swaps in place (server/src/gear.js:797-801). Until the echo lands, the next place the phone sends names another weapon on the worker: an equip of the same type goes through on the wrong blade, and a sale sells the wrong one for good
- F87 (`unequip_request`, phone to worker): two branches no phone reaches (server/src/gear.js:713-714): `legsArmor` is tested there but can never pass _isValidEquipSlot (server/src/gear.js:256), and a `shield` or `amulet` named here is set to null and put in no stash (only armour is, since tag 4840), so a hand-written message takes a worn shield or amulet out of the worker's record
- F88 (`sell_weapon`, phone to worker): none of sell_weapon, forge_weapon, forge_armor, smelt_bar or harden_weapon checks where the sender stands: no place or zone test in server/src/gear.js, armorforge.js, smelting.js or hardening.js (the Bank has one: server/src/bank.js:232 _bankPlaceOk), so a hand-written message sells, smelts, forges and hardens from anywhere in the world
- F89 (`shield_wear`, phone to worker): a claim the plan's 4.2 does not list: which shield is worn is the phone's word, and its silence pays. A phone that never sends shield_wear, or names a shield the worker does not hold before any fight starts, leaves ps._shieldKnown unset or false, and an ordinary No man's land loss then takes NO spare shield (server/src/shieldwear.js:144, server/src/nomansland.js:790); the fight lock closes it only while a fight is on (server/src/shieldwear.js:141)

### I: gems, salvage, reveals

- F90 (`smith_salvage`, phone to worker): none of this family's ten handlers asks where the sender stands (no bench, no zone, no safe ground): salvage, essence, reveal, the three gem sets, crack, combine, the amulet forge, the old cut and hardened wood all run from anywhere, a monster fight or a dungeon included (salvage.js:161, revealbag.js:236, shieldgem.js:130, weapongem.js:238, shardcrack.js:120 and 160, amulet.js:123 and 495, hardenedwood.js:99); the bank and the rest do check a place (bank.js:169, rest.js:93)
- F91 (`smith_salvage`, phone to worker): a weapon's gems are paid back as real gems with no proof the worker ever took them: a salvage (salvage.js:240) and Take out (amulet.js:313-314) pay one gem for each element on the weapon, where a shield's gem is paid only for a shield the worker made (amulet.js:309); gear.js:157-158 says gems from a claim an old join took 'stay'
- F92 (`shield_gem`, phone to worker): a retry burns a second gem: shield_gem never asks whether the shield already holds that gem (shieldgem.js:152-158), and amulet_forge_request op 'gem' is the same with no answer of its own (amulet.js:192-196); the phone holds its buttons 4 s (src/game/shieldGem.js:40) and nothing on the worker stops a second ask
- F93 (`amulet_forge_request`, phone to worker): the phone offers Take out for the worn amulet and sends target 'amulet' (src/ui/panels/buildings/SmithyPanel.jsx:411 and 423), which the worker does not know: dropped with no echo (amulet.js:227-241), though the comment there (219-223) says that button never renders; the player waits, then reads 'Could not remove the gem'
- F94 (`amulet_forge_request`, phone to worker): extract's target 'stash' with stashIdx is a branch no phone sends (grep src/: only slot names, SmithyPanel.jsx:423 and src/game/weaponGem.js:90), and it names a place in a list with nothing to tell a moved list (amulet.js:233-239), where salvage sends idx and sig
- F95 (`amulet_forge_request`, phone to worker): op 'craft' moves value and acts twice on a repeat: nothing asks whether that tier is already worn, so a retry after a lost answer pays the gold and bars again and overwrites the amulet, a set gem with it (amulet.js:152-162); the phone's own busy flag is the only guard
- F96 (`shard_crack_result`, worker to phone): the fight lock's refusal says reason 'fight' for shard_crack_result and gem_combine_result (server/src/fightlock.js:135 and 143) and the phone has no words for it (src/game/shardCrack.js:52: off, down, bad_land, short, bad_gem, no_rare, bad): the player reads 'Could not do that'

### J: the shop, the bank, the store on the socket

- F97 (`shop_list`, phone to worker): no place check anywhere in the shop: server/src/shop.js (624 _shopSell, 704 _shopBuy, 482, 572) and the router's four cases (server/src/index.js:5435-5497) never read the sender's position or zone, so Diego is asked, sold to and bought from anywhere in the world; the Bank and the Hotel check their door (server/src/bank.js:169)
- F98 (`shop_list`, phone to worker): no pace on shop_list or shop_quote (server/src/index.js:5435-5455): each one is a read of shop_stock and an answer, bounded only by the socket's message budget
- F99 (`shop_sell`, phone to worker): shop_sell and shop_buy have no request id and no pace, and each one that succeeds sends the whole pile to every socket in the room (server/src/index.js:5491-5492): one unit sold and bought back in a loop is a room-wide broadcast a message, bounded only by the socket's message budget (tag 3163 stopped it for refused trades only)
- F100 (`bank_deposit`, phone to worker): the opId guards a resend the phone never makes: src/game/bank.js:36-40 and 62-66 make a new id on every tap, wsOut drops a message when the socket is not open (src/networking/wsClient.js:5657) and nothing re-sends S._bankPending, so a move that landed but whose answer was lost is made again by the next tap after BANK_ASK_MS (the file's own header says "a resend after a drop moves nothing twice")
- F101 (`store_dm`, phone to worker): a muted speaker's line is stored all the same and comes back with the thread: storechat.js:269 puts it before the mute check at 278, and _handleStoreDmOpen (185-192) returns every stored line with no mute check, against the file's own header (53-55: "dropping rather than storing")
- F102 (`store_dm_open`, phone to worker): any joined player who names a live listing (the ids are public, GET /api/store/browse) is sent EVERY offer on it: storechat.js:216 puts storeoffer.js:123 _soPublic in the answer whoever asks (each buyer's id, name, gold, when, and the seller's reply), though storeoffer.js:11 calls an offer "a private, per-buyer bid" and the phone shows a buyer only their own (src/ui/panels/buildings/StoreChatPanel.jsx:103)
- F103 (`store_offer`, phone to worker): an offer's answer is every buyer's offer: storeoffer.js:418 and _soNotify (405-406) send _soPublic(rec), the whole map (ids, names, gold, replies), to a buyer, where the phone shows only the buyer's own (see store_dm_open's found)
- F104 (`store_offer_reply`, phone to worker): a Yes lands on whatever that buyer's offer is when it arrives: storeoffer.js:299-352 settles at offers[buyerId].gold, the reply carries no seq or amount (StoreChatPanel.jsx:276), and a buyer may replace a standing offer with a LOWER one at any moment (storeoffer.js:137-153 has no "not lower" rule), so a seller tapping Yes on 1,000 can sell for 1 (the plan's 11.3: an id for whatever can be listed)
- F105 (`store_offer_reply`, phone to worker): a player's words inside the game's own sentence (11.4): the refund mail's note is 'offer declined on ' / 'offer withdrawn on ' / 'offer replaced on ' / 'offer expired on ' / 'offer returned on ' + _stLabel(rec) (storeoffer.js:161, 241, 290, 312, 334, 397), and a pet listing's label is the pet's own name, written by its seller (server/src/store.js:233-240, 279-283)
- F106 (`store_dm`, worker to phone): a player on the phone's block list still reaches you here: store_dm and store_dm_thread are in none of the tables of src/game/blockedAsks.js (30-60; friend_dm is, by the owner's "Block also stops direct messages"), and the worker's own check is the mute list only (storechat.js:278)

### K1: wagers: the hall, Ace, the jackpot, the arena

- F107 (`arena_sponsor`, phone to worker): a stake is taken until the match has a winner, with no cut-off at its start (server/src/gladiator.js:499): a spectator who sees the two health bars backs the fighter about to win and takes a share of the losing stakes
- F108 (`arena_sponsor`, phone to worker): no alive check: a dying or dead sender's stake is escrowed (server/src/gladiator.js:473-537; server/src/inbox.js:123-128 asks only for live state and the gold); the hall, Ace and the jackpot all refuse the dying (gamble.js:293)
- F109 (`arena_sponsor`, phone to worker): no place check on any wager: arena_sponsor, jackpot_deposit, gamble_request, ace_flip_request and ace_item_flip_request are taken from anywhere in the world (server/src/gladiator.js:473-505; cadence.js:158-170; gamble.js:290-299, 246-260, 177-185); the bank asks where the sender stands (bank.js:232)
- F110 (`arena_sponsor`, phone to worker): a phone handler nothing sends to: processGameEvent keeps case 'arena_bet' (src/networking/gameEvents.js:4050), which only breaks. No phone sends the type (grep src/: comments only), the worker never emits it, and the default branch drops it since it left RELAY.TYPES (server/src/relay.js:42). Only relaylist:false in the live flags would relay a scripted one (relay.js:81), and the case ignores it
- F111 (`ace_item_flip_request`, phone to worker): a mint road with no list of what it may mint: the item wager stakes ANY stackable the bag holds but a golden ticket (server/src/gamble.js:192-209), so a win makes a second copy of whatever it is, a daily chest (dailychest.js:39) or a gathering tool the bank refuses to hold (bank.js:178) included; the golden ticket was shut out only after it was doubled (gamble.js:194)
- F112 (`ace_board`, worker to phone): the Ace board's row keeps the WHOLE stored look (server/src/gamble.js:137-141), drawings included, where every other board cuts it to the short face ids (server/src/boards.js:95 boardFace); it goes to every phone at every join (server/src/join.js:1675), and the owner's drawings wipe (server/src/charwatch.js:125) does not reach a row already on the board
- F113 (`arena_stake_placed`, worker to phone): every name the arena sends is the entrant's own text from the body of POST /api/arena/join, cut to 24 characters and not cleaned, never the worker's copy of the character's name (server/src/gladiator.js:134, 297): a player enters under any name. It rides arena_stake_placed targetName, arena_stake_board aName / bName, arena_match_start opponentName and arena_tournament_complete champion.playerName

### K2: the daily rewards, the wheel, the chests

- F114 (`loginspin_go`, phone to worker): the login wheel's "account" is join.device.id, the phone's own word (server/src/join.js:944, server/src/loginspin.js:88-91), and the day's stamp is keyed by it alone. A character on a new Login Key is let in under any device id (server/src/join.js:533-538; server/src/loginkeys.js:88-95 tests the key only), and so is a keyless guest id (server/src/join.js:505-531): each rejoin under a fresh device id finds no lspin: record and spins again the same day, the gold to the same character (about 464 a spin, loginspin.js:14). The Gambling Den's spin was gated on tut_1 for this reason (server/src/dailyrewards.js:637-642); the login wheel has no such gate
- F115 (`loginspin_go`, phone to worker): a field nothing reads: loginspin_go's opId (src/ui/mobile/LoginSpinWindow.jsx:181; server/src/index.js:5596 passes the session only)
- F116 (`daily_spin`, phone to worker): the pot's pay and the record that closes the pot are separate writes with awaits between them (server/src/dailyrewards.js:587-592 the credit, 679-680 the stamp and then the save). After a restart between them the only guard is the oplog stamp spinpot:\<pid>:\<run>, which the prune deletes at 48 h (server/src/inbox.js:38): a pot left open on the record and met again more than two days later is paid a second time. The file names the class itself (server/src/dailyrewards.js:455-468). season_claim's grants are the same shape (server/src/dailyrewards.js:1004-1010), and its bonus spins and freezes have no stamp at all
- F117 (`rise_chest_open`, phone to worker): "once a character" lasts 48 hours: the only record that a character had the chest is the oplog stamp risechest:\<pid>:\<rise id> (server/src/risechest.js:121-126), and the prune deletes every oplog: key older than OP_PRUNE.TTL_MS (server/src/inbox.js:38, 174-199; run from server/src/tick.js:434), so the same character is paid again (300 and 100 coins, risechest.js:56) once two days have passed, and every two days after

### L1: trades

- F118 (`trade2_open`, phone to worker): no pace on an ask that reaches another player: every trade2_open sends the target a trade2_invite (a card, a line and a sound, src/networking/gameEvents.js:4939-4954) at up to the socket's own budget; only the target's block list, on its own phone, stops it (server/src/trade2.js:180-181; src/game/blockedAsks.js:40)
- F119 (`trade2_set`, phone to worker): an offered item's key is any text up to 32 characters, never held to a table of items, and the other side's window draws it as an item's name with its count (server/src/trade.js:115-120; src/ui/panels/TradeWindowPanel.jsx:118 labelFor falls back to the raw key): a player's words in the game's own window until the commit refuses them. trade_offer's offer goes through the same cleaner
- F120 (`trade2_set`, phone to worker): TRADE2.MAX_GOLD is read by nothing (server/src/trade2.js:52): the gold bound for both lanes is the literal 999999 in server/src/trade.js:111
- F121 (`trade2_confirm`, phone to worker): no alive check at the commit: a dying or dead side still swaps (server/src/trade2.js:254 tests only disconnected), where the open (136) and the weapon stage (623) refuse the dead, and a death does not cancel the window (server/src/fightlock.js:180-181)
- F122 (`trade2_confirm`, phone to worker): a player's name inside a sentence the game speaks (11.4), both lanes: each credit's note is 'trade with ' + the other side's name (server/src/trade2.js:323, 355) and the gift's is 'trade from ' + the offerer's name (server/src/trade.js:210); the note rides inbox_delivered (server/src/inbox.js:661)
- F123 (`trade2_stage_weapon`, phone to worker): a request that moves value by a place in a list: stashIdx with no id; expectName narrows it only when it is sent and the next weapon's name differs (two blades of one name, or a caller that leaves it out), so a repeat after a lost answer escrows the next weapon (server/src/trade2.js:625-645). The wrong one shows in the window and can be unstaged
- F124 (`trade_offer`, relay): a private offer goes to every phone in the room (trade_offer, trade_accept, trade_reject): the relay has no road to one player and eventplace.js places no trade type, so who offers whom what goods and gold is on every socket; only each phone's own `payload.target === S.myId` hides it (src/networking/gameEvents.js:4078, 4088, 4110)
- F125 (`trade_accept`, relay): a field nothing reads: trade_accept's offer (src/ui/panels/IncomingTradePanel.jsx:209). The worker never looks at it and the phone's case stopped reading it (tag 4915), yet it is relayed uncleaned, up to the frame's limit, to every phone whenever a live offer exists (server/src/trade.js:171-239 never touches payload.offer)
- F126 (`trade_reject`, relay): a decline with no offer behind it is relayed: an accept is dropped without a live offer (rule 15), but any phone can send trade_reject at any player, who is told "Trade declined" with its sound and no name on it, at the relay budget's pace (server/src/trade.js:148-151; src/networking/gameEvents.js:4108-4113)

### L2: duels, threats, the clan invite

- F127 (`duel_request`, relay): the duel handshake (duel_request, duel_wager_request, duel_accept, duel_decline) and duel_end go to EVERY phone in the room, each phone filtering on payload.target or winner / loser: server/src/eventplace.js:60-80 places none of them, so who challenged whom, for what stake, and who won is on every phone's wire
- F128 (`duel_request`, relay): a challenge (this row and duel_wager_request) has no pace of its own and no check on the target: a card and its sound on any player named, from any zone, at the relay budget (server/src/duel.js:126-138); the zone is asked only at the accept (duel.js:195), and only the phone's own block list stops it
- F129 (`duel_wager_request`, relay): the stake has no page: the one Duel button sends wager 0 (src/ui/panels/InspectPlayerPanel.jsx:290) and nothing in src/ offers a stake, yet the worker records any stake up to 999999 a modified phone names and an honest phone's card shows and accepts it (server/src/duel.js:132-134, 217-226): a live server path nobody has seen in play
- F130 (`duel_wager_request`, relay): a road between players pillar 10.5 does not name: a staked duel moves up to 999999 gold a duel from loser to winner with no fee, hold or pace, and losing is free to arrange (leave the zone for DUEL.GRACE_MS, server/src/duel.js:356-370, or close the app)
- F131 (`duel_decline`, relay): relayed with no challenge behind it (server/src/duel.js:139-142): any player raises 'Duel declined' on any player it names at the relay budget, the popup the worker's own comment sets out to prevent (duel.js:159-163); the phone's block table has no row for duel_decline (src/game/blockedAsks.js:29-50)
- F132 (`pvp_threat`, relay): dormant, a whole machine: OPEN_PVP is a constant false with no live flag (server/src/index.js:1541) and drops every pvp_threat (server/src/threat.js:98), and the phone's button is compiled out (InspectPlayerPanel.jsx:544). So pvp_threat and threat_response (relay.js:65-67), threat_penalty and threat_expired (index.js:717) and their four phone cases are on the lists with nothing that can send or deliver them; the levy, the bounty and the gear lock behind them have not run since tag 1917
- F133 (`threat_response`, relay): (dormant with pvp_threat) the guards' fine is not one write: the purse is debited and saved, then bounty: is read and put after two awaits, 'best-effort' (server/src/threat.js:133-149), so a restart between burns the gold; and a bounty stale for THREAT.BOUNTY_STALE_MS is deleted unpaid (threat.js:232-243). For the world's sum (4.4) the road threat_levy is a burn that is sometimes a mint later
- F134 (`clan_invite`, relay): with clanparty false the relay goes out whether or not an invite was recorded, and clanName / clanTag are the sender's free text inside the game's popup (server/src/index.js:6413-6418, server/src/clans.js:184-195, src/networking/gameEvents.js:3949): anyone raises an invite card with any words on any player (11.4). Today it is dropped for everyone, and a phone that still holds a clan (clanparty.js:28 keeps one at war until its war ends) is told 'Clan invite sent' (InspectPlayerPanel.jsx:607) for an invite the worker drops with no answer (index.js:6416)

### M1: the party and the alliance

- F135 (`alliance_name`, phone to worker): no pace on a re-send: alliance_name with the name and tag the alliance already has sends the whole roster (up to PARTY.KEEP_MAX members) to every online member each time (server/src/alliance.js:323), bounded only by the socket's budget
- F136 (`alliance_name`, phone to worker): the alliance index is read by two storage.list calls with no limit on a player's ask (server/src/alliance.js:250 and 264, prefixes ally: and ally_war:), reached from alliance_name, alliance_war, alliance_board and an alliance member's join (handoff rule 9, the second edge)
- F137 (`alliance_war`, phone to worker): a mint with no stake between two parties that agree: every roster member who took part in one scoring kill is paid at the war's end, REWARD_WIN a winner and REWARD_LOSE a loser, one war every 90 minutes a pair (server/src/alliance.js:466 and 508-522; the numbers at 66-70); nothing is paid in, and the only thing at risk is the victim's No man's land loss, which goes to the other side
- F138 (`alliance_war`, phone to worker): a player's words inside a sentence the game speaks (11.4): the war's mail note is 'alliance war vs [\<tag>] -- victory / defeat / draw', the tag the other leader's (server/src/alliance.js:521); allyTagOk bounds it to four of A-Z 0-9
- F139 (`party_chat`, worker to phone): a field the worker sends that no phone reads: party_chat's ts (server/src/party.js:362; src/game/chat.js:407-434 stamps its own clock)

### M2: clans and friends

- F140 (`clan_create`, phone to worker): with `clanparty: false` a clan's name is kept as typed (control and invisible characters; server/src/clans.js:151-153, no _chatGuardClean), its colours are any 9 characters and its logo any 8 JSON values the frame allows (clans.js:168-170); all are stored in clan:\<id> and sent to every member in clan_state, and the name to every phone inside clan_war_declare
- F141 (`clan_kick`, phone to worker): a case no phone sends: nothing in src/ sends clan_kick (grep), yet the handler is live and, unlike create, join and declare, has no clanparty refusal (server/src/clans.js:256-264)
- F142 (`friend_request`, phone to worker): no pace on the friend graph's writes (handoff rule 27), for friend_request, friend_accept, friend_decline and friend_remove: each writes two friends: rows and reads up to four with only the socket's budget over it; two sockets that answer each other (request then decline; or request, accept, remove) loop them (server/src/friends.js:145-146, 164-165, 186-187, 203-204)
- F143 (`friend_request`, phone to worker): the two sides of every friend change (the same four rows) are two awaited puts, one after the other (server/src/friends.js:145-146, 164-165, 186-187, 203-204): a restart between them leaves one side written, e.g. a friend removed on one list only, who can still message from the other (friends.js:228 reads the sender's list alone)
- F144 (`friend_accept`, phone to worker): an accept into a full list makes a one-sided friendship: the request rows are cleared and each list gains the other only if it is under FRIENDS.LIST_MAX (server/src/friends.js:160-163), and the requester's own list is never checked when they ask (114-138), so one side can list, and message, a player who does not list them
- F145 (`friend_dm`, phone to worker): a mute does not hold for a friend who is away: the muter's set leaves memory when their socket goes (server/src/chatmod.js:260-265), so _chatModMuted is false and a muted friend's lines are written to friend_msg:\<to> and sent whole at the next join (server/src/friends.js:239-249, 106-109), against the handler's own comment (232-235); the phone then drops only rows from players on its own block list (src/game/blockedAsks.js)
- F146 (`clan_error`, worker to phone): a player's words inside a sentence the game speaks (11.4): clan_error's text is built on the worker around a tag (server/src/clans.js:156, 342, 357; at 342 the asker's own defenderTag at any length), and a war's mail note is 'clan war vs [\<the other clan's tag>] -- victory' (server/src/clans.js:495); a tag is held to A-Z 0-9, 1 to 4, at founding. All need `clanparty: false`
- F147 (`clan_war_declare`, worker to phone): an active war is told once: a join is sent clan_state and no war (server/src/join.js:1719-1729), and a phone holds a war only from this event, so a phone that loads mid-war shows none and ignores its kills and its end (src/networking/gameEvents.js:4014, 4024); the score rides only inside this event, each kill adding to the phone's own copy
- F148 (`clan_war_end`, worker to phone): the pay line is the phone's own table, not the worker's word: it shows '+\<gold>G +\<ap>AP' from CLAN_WAR_REWARDS (src/data/gameSystems.js:1628; src/networking/gameEvents.js:4040), while the worker sends no amount and pays no AP (server/src/clans.js:482-484)
- F149 (`clan_war_end`, worker to phone): the phone still sends this privileged type and judges the war itself: when its own clock passes the war's end it marks the war ended, shows a result and '+gold +AP' from its own copy of the scores, and broadcasts clan_war_end {warId, winner} with no caps gate (src/ui/BroTown.jsx:7799-7833); the worker drops the send (server/src/index.js:6322), and its own clan_war_end then paints a second result
- F150 (`friend_request_in`, worker to phone): fields the phone never reads: friend_request_in's fromName and at, and friend_accepted's by, byName and at (src/networking/gameEvents.js:673-679 plays a chime and nothing else; `from` is read only by the block check)
- F151 (`friend_dm_backlog`, worker to phone): the box is deleted as soon as it is sent, with no word back from the phone (server/src/friends.js:108-109): a join whose socket drops before the frame lands loses every line in it, and the worker keeps no other copy

### N1: chat

- F152 (`area_chat`, phone to worker): in the Wheel every player has the one zone id (server/src/wheelzone.js:103 WHEEL_ZONE) and the lane tests zone equality only (server/src/chatlanes.js:141), so "area" reaches the whole world, not the players near: the lane the picker calls Area is room chat in another colour since the Wheel became the world
- F153 (`chat_report`, phone to worker): the read that proves the target exists runs before the reporter's gate (server/src/chatmod.js:331 then 334), so every report naming an offline or made-up id costs one storage read, bounded only by the socket's own budget
- F154 (`chat_report`, phone to worker): reports leave storage only when the owner reads the list (server/src/chatmod.js:373-384 prunes past RETAIN_MS on the admin read): nothing else bounds the chat_report: prefix, and the per-day limit that feeds it is in memory
- F155 (`chat`, relay): no lane looks for a Login Key in a line: room chat (server/src/index.js:4993-5023), the area lane and the whisper (server/src/chatlanes.js:100-110) share one cleaner (server/src/chatguard.js cleanChatText) that only takes characters away, so a key a player types, or is talked into typing, is relayed as written; pillar 10.9's "a login key refused in chat" does not exist yet
- F156 (`whisper_error`, worker to phone): the phone has words for a reason 'rate' (src/game/chat.js:398) that no worker code sends: a whisper past the lane's bucket is dropped silently (server/src/chatlanes.js:157), after the phone has shown it in the sender's feed as sent

### N2: the action relays

- F157 (`campfire_lit`, relay): campfire_lit's zone, x and y are the sender's word, and its phone case never asks _peerInZone (gather_node beside it does, src/networking/gameEvents.js:553): a phone standing anywhere can draw a fire, with its sound, at any point of any zone on every phone in that zone, up to 50 s a relay (src/networking/gameEvents.js:580-591)
- F158 (`monster_dmg_at`, relay): dmg is text on the watcher's screen: src/networking/gameEvents.js:3863 builds the number as '-' + payload.dmg with no type check or length clamp, the worker relays the field as written (server/src/relay.js:93), and the type is in neither the block table (src/game/blockedAsks.js:30) nor the mute fan-out (chat and emote only): a phone can float any string, up to the frame's 16 KB, as a damage number at any point of its zone on every phone near it, 4 a second
- F159 (`player_died_to_monster`, relay): a LIVE player can relay it and the other phones believe it: they draw the sender as a corpse and stop aiming at them (src/game/abilities.js:864 fightablePlayerLock, src/game/sparTargets.js:236 isLiveFoe and :279 fightingNow, src/ui/BroTown.jsx:5274 the lunge), for as long as it is sent again inside 1.5 s; the worker checks nothing (server/src/index.js:6304) and still lets that player hit and be hit
- F160 (`player_projectile`, relay): a claim the plan's 4.2 list does not have: the bow's draw (dr) and the staff's gather (ga) ride this RELAY and set the share of damage the shot's hit claims land (server/src/drawgather.js:187-230); bounded by the worker's clock, but the perfect draw's late side is the phone's own number: drawgather.js:223 calls a shot perfect when the bounded draw reached full and the CLAIMED draw is at most full + PERFECT_DRAW_MS, so a phone that held the bow any longer and claims exactly a full draw is paid the perfect bonus and its mana on every full-cycle shot
- F161 (`player_projectile`, relay): isSpecial and retreat on this relay are taken on the phone's word by both stamps (server/src/drawgather.js:189, server/src/freeswing.js:224): they decide whether a shot is judged at all, and nothing checks that a special was paid for or a retreat rolled at this point
- F162 (`player_swing`, relay): the relay's rebuild copies the WHOLE payload ({ ...src }, server/src/relay.js:93): every field a phone writes, known or not, nested or not, goes to every receiving phone up to the frame's MAX_INBOUND_BYTES; only chat and emote are rebuilt from a list of fields (server/src/index.js:5015, server/src/emotes.js:78 and :83). True of all 14 action relays: none has a field list on the worker
- F163 (`pvp_confirmed`, relay): any phone can relay pvp_confirmed {target: \<any player>, died: true} and that player's phone counts a PvP kill: KILL! and its sound, and S.rpg._compStats.pvpKills + 1 (src/networking/gameEvents.js:4551-4599), with no check that the worker's pvp_hit ever named the sender as its target (the phone's own memory of it, _pvpSrvHits, gates only the 'Hit!' popup); the count is shown on the Skills page (src/ui/panels/SkillsPanel.jsx:477) and rides that phone's own track as rpgData.pvpKills (src/ui/BroTown.jsx:8313) to the other players' Inspect card, 4 a second from one socket
- F164 (`stunned`, relay): a dead relay kept on the allowlist: no reachable phone code sends stunned (src/networking/gameEvents.js:4521 is in a case nothing sends to) and the receiving phone only writes S._stunEnd (src/networking/gameEvents.js:4073), a field nothing in src/ reads; while it is on RELAY.TYPES (server/src/relay.js:66) any phone may name any player as target with any duration, so a reader added for S._stunEnd would hand every player a stun on every other

### H1: the room's door, the order book, the auction house

- F165 (`GET /_room_count`, http): a route nothing reaches: no caller of '/_room_count' is left in server/src, src or tools (grep), and the outside cannot reach it (server/src/index.js:4870)
- F166 (`GET /api/market/orders`, http): a public read wakes the one room with no pace, and can start storage writes: any caller's GET runs _mktEnsureIndex and _mktSweep, whose expired orders are refunded and deleted (server/src/index.js:352-355 no limit; server/src/market.js:216-217, 557-576) -- pillar 11.5's second fault, confirmed
- F167 (`GET /api/market/orders`, http): the book's rebuild lists a whole prefix with no limit on the first market request after a wake, holding the room's gate (server/src/market.js:100 storage.list({prefix:'mkt_order:'}); handoff rule 9's second edge; the store pages its own, store.js:483)
- F168 (`GET /api/market/history`, http): a route no phone calls: nothing in src/ asks for /api/market/history (grep), and its key is built from unbounded query text straight into storage.get (server/src/market.js:228-229)
- F169 (`POST /api/market/place`, http): pillar 11.3's fault, confirmed: a sell order names its weapon by a place in weaponStash and the request carries no id, so a retry after a lost answer escrows the NEXT weapon and lists it at the same price (server/src/market.js:329-343)
- F170 (`POST /api/market/place`, http): a claim the plan's 4.2 does not list: a sell order's category, subtype and tierKey are the seller's word and are never checked against the weapon escrowed, yet they are the order's place in the book and what a resting buy order is matched on (server/src/market.js:298-308, 367-376; the file's own header says so at 60-80): a copper blade labelled a higher tier fills a buyer's order for that tier at the buyer's price
- F171 (`POST /api/market/place`, http): a player's words inside a sentence the game speaks (11.4): tierLabel is the caller's free text and becomes the mail's note '\<tierLabel> \<subtype> bought' / 'sold' on both sides of a match (server/src/market.js:359, 384, 444-445, and the settle plan's label at 409)
- F172 (`POST /api/market/place`, http): the name on an order is whatever the request says, not the worker's copy of the player's name: any seller can list under another name (server/src/market.js:360; the auction house takes ps.name, server/src/store.js:813)
- F173 (`POST /api/market/place`, http): the body is parsed whole before the token is checked, and nothing bounds its size (server/src/market.js:234 then 241): an unauthenticated POST of any size is read by the one room
- F174 (`POST /api/market/place`, http): no pace on a route that writes on a tap (handoff rule 27): place and cancel in a loop cost an rpg save, an order put, a credit and a delete each time, and HTTP calls are not counted by the socket's budget _floodMsgOk (server/src/market.js:233-256)
- F175 (`POST /api/market/place`, http): no alive check: a dying or dead player's order escrows gold or a weapon (server/src/market.js:315-320); shop.js:626-631 names this as 'the check every other counter makes' and the incident that added it there
- F176 (`POST /api/market/place`, http): the token's grace lane has no end: a live session whose join did not declare httpAuth is acted for by anyone who knows its public id, with no header at all (server/src/httpauth.js:63-64); the current phone always declares it (src/networking/wsClient.js:746)
- F177 (`GET /api/store/browse`, http): a public read wakes the one room with no pace, and can start storage writes: any caller's GET runs _stEnsureIndex (the shelf's paged rebuild on the first request after a wake) and _stSweep, which releases up to STORE.SWEEP_MAX expired listings and due offers (refunds, mail, deletes) (server/src/index.js:362-365 no limit; server/src/store.js:590-591, 1142-1191) -- pillar 11.5's second fault, confirmed for the store too
- F178 (`GET /api/store/mine`, http): pillar 11.5's first fault, confirmed: no token is asked, so anyone who knows a player's public id reads which listings that player is the top bidder on and for how much (server/src/store.js:597-607, no _httpAuthCheck). The same bid is also on every /browse row as topBid {name, bidderId, amount} (server/src/store.js:421), so the fault is the worker's public view of a bid as much as this route
- F179 (`POST /api/store/list`, http): a request that moves value, names a place in a list and carries no id: a weapon is listed by stashIndex, so a retry after a lost answer lists the NEXT weapon in the stash; the phone marks a lost answer `unsure` rather than retrying (src/ui/storeApi.js:131-139) but nothing on the worker stops a second one (server/src/store.js:753-760)
- F180 (`POST /api/store/list`, http): the body is parsed whole before the token is checked, and nothing bounds its size (server/src/store.js:610 then 612)
- F181 (`POST /api/store/list`, http): no pace on a route that writes on a tap (handoff rule 27): list and cancel in a loop cost an rpg save, a listing put, a credit and two deletes each time; HTTP calls are outside the socket's budget (server/src/store.js:609-631)
- F182 (`POST /api/store/list`, http): no alive check on listing, buying or bidding (server/src/store.js:697-700, 893-895, 963-965); shop.js:626-631 names it 'the check every other counter makes'
- F183 (`POST /api/store/buy`, http): a player's words inside a sentence the game speaks (11.4), the plan's own example confirmed: the seller's mail reads '\<label> sold to \<buyerName> for \<price>', buyerName the buyer's session name (server/src/store.js:1043, 911); and \<label> is the listing's display name, which for a pet is the name its owner typed (server/src/store.js:282, 233-239), so '\<pet name> bought', 'outbid on \<pet name>' and 'bid returned on \<pet name>' are a player's text in the game's voice too (server/src/store.js:1038, 989, 1048)

### H2: the arena, the account, the boards, feedback

- F184 (`POST /api/arena/join`, http): the body is parsed whole before the token is checked and nothing bounds its size, on join and leave (server/src/gladiator.js:120 then 125, 138 then 141): the same shape as the market's and the store's
- F185 (`POST /api/arena/join`, http): the name in the queue and the bracket is whatever the request says, not the worker's copy of the player's name (server/src/gladiator.js:134, 297): a gladiator can enter under another player's name, uncleaned
- F186 (`GET /api/arena/status`, http): a public read wakes the room with no pace and can change state: status, tournament and every other arena path run _arenaLazyTick before anything else, which starts a gathered bracket or cancels an undersubscribed one and refunds its entries (server/src/gladiator.js:118, 331-340): pillar 11.5's second fault, for the arena
- F187 (`* /api/arena/<anything else>`, http): the phone asks for a route the worker does not have: GET /api/arena/history (src/ui/panels/buildings/PartyPanel.jsx:964) was the old Arena object's (server/src/arena.js:50) and falls through to this 404, so the champions' list is never drawn
- F188 (`POST /api/account/reset`, http): the wipe leaves the character's value at rest elsewhere in place: it deletes no store_listing:, mkt_order:, inbox: or escrow record (server/src/persistence.js:444-585), so goods listed or mailed before a restart outlive it under the same player id, while the once-a-character marks (aponce:, achv:, the quest stamps) start again
- F189 (`GET /api/leaderboard/top`, http): limit is capped from above only: a negative one passes Math.min and slice(0, -n) answers every row but the last n (server/src/leaderboard.js:52, 210, 216); the feedback list has the same hole (server/src/feedback.js:35, 210)
- F190 (`GET /api/leaderboard/top`, http): a public read lists a whole prefix on every call with no pace (server/src/leaderboard.js:185, 200): pillar 11.5's second fault, for the Leaderboard object
- F191 (`GET /api/leaderboard/top`, http): four boards rank on the phone's own word: lifeskills, dungeons, gold and playtime read columns copied from the rpgData blob a phone sends in track (server/src/index.js:6491, server/src/leaderboard.js:101-102, 214); a claim the plan's 4.2 does not list (level and the series are the worker's; ap is stamped, achievements.js:557)
- F192 (`GET /api/leaderboard/top`, http): the row's clanTag is the phone's too, of any JSON type up to the track blob's bound, and is served to every caller: the registry's stamp writes the top-level clanTag, never rpgData's (server/src/clans.js:106-117, server/src/leaderboard.js:103)
- F193 (`POST /api/feedback/submit`, http): the feedback board takes anyone's word for who is speaking: submit and vote ask no token and no session, playerId is only a rate key (a new id is a new allowance), and playerName and topic are stored and served to every reader with no type, length or cleaning (server/src/feedback.js:107-129, 149-156); the body's size is unbounded
- F194 (`GET /api/feedback/list`, http): every call reads every ticket ever written (storage.list of the whole ticket: prefix, no limit; nothing deletes a ticket), with no pace (server/src/feedback.js:176)
- F195 (`POST /api/feedback/vote`, http): a vote is as many votes as the caller has names: playerId is unchecked, there is no pace, and the voters map is a plain object keyed by it, so '__proto__' counts every time and is never recorded (server/src/feedback.js:149-171); the map grows inside the ticket's one record
- F196 (`POST /api/feedback/crash`, http): fields the worker never reads: the phone sends sha (the build's commit) and gl (the graphics chip's limits and whether its context was lost) with every crash report and the worker keeps neither (src/debug/crashTrap.js:73, 89; server/src/feedback.js:79, 87-98)
- F197 (`POST /api/feedback/crash`, http): the rate limit is by a name the caller chooses, and each new sid writes a crashrate: row nothing ever deletes (server/src/feedback.js:81-86); the body's size is unbounded
- F198 (`GET /api/feedback/crashes`, http): every player's crash reports are public to read: no key on /crashes (server/src/feedback.js:61-65), where the anti-bot's evidence beside it is the owner's (/api/botstat)
- F199 (`* /api/botstat?id=<playerId>`, http): the x-admin-key lane compares the secret with === and counts no wrong guess (server/src/botfp.js:612), where the Bearer lane compares hashes (server/src/admin.js:60); neither lane has a pace

### H3: the owner's routes

- F200 (`* /api/admin/* (the key)`, http): no pace, no count and no log of wrong keys (server/src/admin.js:54-62, 142-143): each guess wakes the room and is answered at once, and 404 against 401 tells a caller whether a key is configured; the surface's whole strength is the secret's length
- F201 (`POST /api/admin/grant`, http): a grant's gold lands on the road mail_gold (server/src/inbox.js:392), the road every settlement's payout lands on too, so the road alone cannot tell new gold from moved gold (step 4.4's mint and move classes); only the mail entry's source 'admin' and admin_log say it was minted
- F202 (`POST /api/admin/grant`, http): nothing bounds what a grant makes (server/src/admin.js:361-368, server/src/inbox.js:392, 445-455): any amount, any count, any key (a key no table knows becomes a bag entry), to any id (an id nobody plays gets an inbox: record nothing drains)
- F203 (`POST /api/admin/restore`, http): step 4.7's fault, exact: a restore writes rpg:\<pid> and nothing else (server/src/admin.js:419-425). Not put back, and not looked at: bank:, pets:, gear_prov:, inbox:, achv:, aponce:, codex:, fishlog:, farm:, farmorders:, daily_rewards:, nml_state:, guild_claims:, friends:, party and alliance rows, and every escrow the player has value in (mkt_order:, store_listing:, duelEscrow:, arena_entry:, arena_stake:, trade2wpn:, death_pile:). Gold and goods that left the record after the snapshot (banked, listed, traded, mailed, dropped) come back in it and stay where they went
- F204 (`POST /api/admin/flags`, http): any well-formed name is stored, known or not (server/src/liveops.js:345-359): a mistyped kill switch answers ok, takes one of the 64 places and switches nothing; there is no table of the names the worker reads (the plan's 7.1)
- F205 (`POST /api/admin/flags`, http): a comment out of step with its list: liveops.js:89-105 speaks of five camelCase switches and names depth.js among their readers; LIVEOPS.CAMEL_SWITCHES holds four (server/src/liveops.js:106)
- F206 (`GET /api/admin/reports`, http): the owner's read lists the whole chat_report: prefix with no limit and deletes the stale ones one awaited delete at a time (server/src/chatmod.js:372, 384): the room answers nothing else meanwhile (handoff rule 9's second edge), and nothing else ever prunes the prefix

### H4: the owner's test levers (/api/admin/dev/*)

- F207 (`GET /api/admin/dev/state`, http): with the key, every lever works on ANY online character of the live room, and most of what it mints is not marked the owner's: the kit's armour is recorded in gear_prov as src 'quest' (server/src/devtools.js:140-156), a revealbag piece as 'drop' (server/src/revealbag.js:411), levels come through the real XP road (devtools.js:209), a daily quest finished by /dev/daily pays under its real opId (server/src/dailyrewards.js:834). So the whole world's sum (4.4) cannot tell a test mint from an earned one; only the bag's and the health's dev roads are named (server/src/bag.js:192-195, server/src/life.js:120-121). Covers kit, vitals, quests, tour, questcount, daily, trapping, fish, lifeskill, combat, revealbag.
- F208 (`GET /api/admin/dev/botflags`, http): the owner's reads walk whole prefixes in one storage read, holding the room's gate (handoff rule 9's second edge): botflags lists every botstat: record with no limit (server/src/botfp.js:658); apinfo and looks each list up to 20,000 char: records with their drawings (server/src/devtools.js:649, server/src/charwatch.js:110), and apinfo then reads four more keys a matching character. No player's path, but every player waits while one runs. Covers botflags, apinfo, looks.
- F209 (`POST /api/admin/dev/achv`, http): clear forgets the stamps and keeps the points (server/src/achievements.js:603-607), and the stamp is the only thing that stops a second pay (achievements.js:327): after it, every achievement earned again pays its AP again, into the total the public AP board ranks.

### Not confirmed

Questions a reader could not settle from the code it read. They are questions, not findings.

- (`trade2_stage_weapon`) can an escrow key be used twice across a restart? seq is a counter in memory that starts again with the worker (server/src/trade2.js:646) and is the storage key trade2wpn:\<pid>:\<seq> (652); a record of the same owner that the restart's sweep had not yet refunded (723: best-effort, at most once in five minutes) would be written over


## 8. The counts, and how each was counted

Counted from the code at `2d4138e` by a script, never by hand; the readers'
rows were then held to the script's lists. The card's guide counts are in
the last column.

| List | Where it is | Counted | Rows on this page | How it was counted | The card's guide |
|---|---|---|---|---|---|
| The router's cases | `server/src/index.js`, the `switch (msg.type)` of `_onMessage` (line 5168) down to its `default:` (line 6304) | 139 | 139, part 3 | every line `case '<type>':` at the switch's own indent, between those two lines | about 139 |
| `PRIVILEGED_EVENTS` | `server/src/index.js:524` | 163 | 163, part 5 | every quoted string inside the `new Set([ ... ])`, comments taken out first | about 96 |
| `RELAY.TYPES` | `server/src/relay.js:41` | 26 | 26, part 4 | the same | about 26 |
| The phone's direct switch | `src/networking/wsClient.js`, the `switch (msg.type)` of `ws.onmessage` (line 985) and its `default:` (line 4171) | 87 cases and the default | 86 on their part 5 rows (the handler line says `direct`); `player_respawned` on its part 4 row; the default is part 2.3 | every line `case '<type>':` at the switch's own indent | about 88 |
| HTTP routes | the files part 2.4 names | 107 | 107, part 6 | by reading: every test of `request.method` with a `path` in those files is one row, and each handler's fall-through is one more. The script listed the lines holding a path test as the readers' checklist | about 47 |

Every key the script counted has a row: the assembler fails a list with a
key missing, a row for a key the code does not count, and a second row for
one key and direction. 436 rows in all, and 209 lines in
part 7.

Not asked for by the card, counted because it is where part 4 and part 5
land on the phone: `processGameEvent` (`src/networking/gameEvents.js`) has
106 cases. 77 are privileged types with no direct case, 26
are the relays, and the rest are `clan_war_declare` (3990), `arena_bet` (4050), `player_attack` (4485). A privileged type with no
case in either switch: 0.

### Every key, by list

So a reader can check a list against the code without the script. The
router's cases, in the router's order:

`join` `pose` `ride` `dice` `item_drop` `achv_title` `points_reset` `move` `pong` `track` `player_attack` `monster_damage` `extraction_start` `arrow_blast` `node_strike` `shop_list` `shop_quote` `shop_sell` `shop_buy` `loot_pickup` `stat_allocate` `prog3_allocate` `cook_request` `stats_update` `ability_use` `ability` `element_burst` `loginspin_ask` `loginspin_go` `loginspin_double` `loginspin_collect` `chest_open` `rewards_get` `daily_spin` `daily_reroll` `season_claim` `race_start` `heap_burn` `bank_open` `bank_deposit` `bank_withdraw` `rest_request` `smelt_bar` `farm_open` `farm_act` `farm_buy` `farm_order` `forge_armor` `smith_salvage` `reveal_item` `essence_apply` `map_watch` `nml_attack` `nml_lock_ask` `nml_lock_allow` `shield_wear` `shield_gem` `weapon_gem` `shard_crack` `gem_combine` `cape_redeem` `cape_equip` `eat_request` `potion_drink` `firemaking_request` `shop_purchase` `arena_sponsor` `guild_quest_turn_in` `trade2_open` `trade2_set` `trade2_ready` `trade2_confirm` `trade2_cancel` `trade2_stage_weapon` `trade2_unstage_weapon` `trade2_pets` `party_invite` `party_accept` `party_decline` `party_leave` `party_kick` `party_chat` `alliance_name` `alliance_war` `alliance_board` `area_chat` `whisper` `store_dm` `store_dm_open` `store_offer` `store_offer_cancel` `store_offer_reply` `bro_nonce` `bro_verify` `friend_request` `friend_accept` `friend_decline` `friend_remove` `friend_dm` `chat_mute` `chat_report` `harden_weapon` `pet_capture` `make_traps` `make_hardened_wood` `trap_arm` `pet_active` `pet_name` `pet_release` `pet_house_buy` `dungeon_start` `gamble_request` `ace_flip_request` `ace_item_flip_request` `fish_inspect` `fish_board_request` `rise_chest_open` `spin_board_request` `acc_request` `ace_board_request` `jackpot_deposit` `clan_create` `clan_join_accept` `clan_leave` `clan_kick` `clan_war_declare` `cook_recipe` `equip_request` `sell_weapon` `unequip_request` `build_point_earned` `set_active_slot` `forge_weapon` `amulet_forge_request` `gem_cut_request` `quest_accept` `quest_turn_in` `feedback` `character_reset`

`PRIVILEGED_EVENTS`, in the list's order:

`test_mode` `key_new` `dice_roll` `item_drop_result` `item_reveal` `points_reset_result` `nml_skull` `nml_loss` `nml_lock` `nml_lock_ask` `nml_take` `chest_opened` `loginspin_state` `loginspin_result` `loginspin_round` `rewards_state` `daily_progress` `ability_windup` `smelt_result` `hardened_wood_result` `race_state` `race_cp` `race_end` `ride_state` `rest_result` `bank_state` `farm_state` `eat_refused` `forge_armor_result` `smith_salvage_result` `essence_result` `shield_gem_result` `weapon_gem_result` `shard_crack_result` `gem_combine_result` `shop_state` `shop_result` `shop_quoted` `store_dm` `store_dm_thread` `store_dm_error` `store_offer_state` `store_offer_error` `player_state` `player_died` `combat_credit` `harvest_credit` `loot_credit` `lifesteal_credit` `loot_pickup_rejected` `gather_hits` `stat_allocated` `ability_rejected` `prog3_level` `prog3_allocated` `quest_reward_stashed` `chain_score_recorded` `inbox_delivered` `join_rejected` `room_full` `linger_wait` `body_place` `cape_status` `bro_nonce` `bro_verify_result` `duel_end` `gamble_result` `ace_flip_result` `ace_item_flip_result` `ace_board` `clan_state` `clan_error` `clan_war_kill` `clan_war_end` `arena_match_start` `arena_match_result` `arena_tournament_complete` `dungeon_started` `dungeon_wave` `dungeon_boss` `dungeon_complete` `dungeon_error` `dungeon_boss_ability` `arena_stake_placed` `arena_stake_error` `arena_stake_result` `arena_stake_board` `guild_quest_result` `guild_quest_error` `threat_penalty` `threat_expired` `gear_locked` `pet_capture_result` `make_traps_result` `trap_armed` `trap_result` `pets_state` `codex_state` `achv_state` `fish_weight` `fish_board` `spin_board` `rise_chest` `acc_state` `spar_state` `harden_result` `character_reset_done` `character_reset_refused` `firemaking_refused` `gem_cut_result` `jackpot_state` `jackpot_result` `server_announce` `move_path` `client_off` `free_swing` `draw_gather` `trade2_state` `trade2_invite` `duel_resume` `party_state` `party_invited` `party_error` `party_chat` `alliance_rows` `alliance_error` `alliance_war_end` `area_chat` `whisper` `whisper_error` `friend_sync` `friend_request_in` `friend_accepted` `friend_error` `friend_dm` `friend_dm_backlog` `chat_mute_list` `chat_report_ack` `monster_attack` `monster_hit` `monster_kill` `pvp_hit` `monster_projectile` `monster_ability` `fire_trail` `parry` `element_nova` `arrow_boom` `monster_transform` `loot_drop` `loot_claimed` `loot_despawn` `zone_monsters` `zone_nodes` `zone_loot` `zone_state` `state_sync` `tick` `ping` `player_count` `player_join` `player_leave` `player_update`

`RELAY.TYPES`, in the list's order:

`campfire_lit` `campfire_out` `chat` `clan_invite` `duel_accept` `duel_decline` `duel_request` `duel_wager_request` `emote` `gather_node` `monster_dmg_at` `player_died_to_monster` `player_dodge` `player_hurt_by_monster` `player_jump` `player_projectile` `player_respawned` `player_shield` `player_swing` `pvp_confirmed` `pvp_threat` `stunned` `threat_response` `trade_accept` `trade_offer` `trade_reject`

The phone's direct switch, in the switch's order, each with its line:

`tick`:986 `linger_wait`:1473 `room_full`:1483 `join_rejected`:1504 `character_reset_refused`:1613 `character_reset_done`:1625 `state_sync`:1649 `zone_loot`:2012 `zone_state`:2017 `loot_credit`:2027 `client_off`:2048 `move_path`:2054 `free_swing`:2062 `draw_gather`:2073 `nml_skull`:2084 `nml_loss`:2092 `body_place`:2104 `nml_lock`:2109 `nml_lock_ask`:2114 `nml_take`:2120 `rewards_state`:2129 `loginspin_state`:2136 `loginspin_result`:2138 `loginspin_round`:2140 `daily_progress`:2142 `chest_opened`:2147 `smelt_result`:2169 `points_reset_result`:2191 `item_reveal`:2208 `item_drop_result`:2217 `smith_salvage_result`:2226 `essence_result`:2236 `shield_gem_result`:2244 `weapon_gem_result`:2253 `shard_crack_result`:2262 `gem_combine_result`:2271 `trap_armed`:2284 `trap_result`:2286 `pets_state`:2288 `codex_state`:2294 `achv_state`:2305 `fish_weight`:2313 `fish_board`:2315 `spin_board`:2320 `acc_state`:2324 `rise_chest`:2328 `make_traps_result`:2330 `race_state`:2340 `duel_resume`:2347 `ride_state`:2349 `race_cp`:2351 `race_end`:2353 `bank_state`:2355 `rest_result`:2368 `hardened_wood_result`:2380 `forge_armor_result`:2410 `eat_refused`:2434 `key_new`:2446 `farm_state`:2476 `alliance_rows`:2499 `alliance_error`:2500 `alliance_war_end`:2501 `test_mode`:2523 `spar_state`:2533 `lifesteal_credit`:2543 `loot_pickup_rejected`:2561 `player_state`:2707 `player_died`:3393 `player_respawned`:3484 `harvest_credit`:3497 `gather_hits`:3529 `firemaking_refused`:3540 `gem_cut_result`:3557 `combat_credit`:3589 `stat_allocated`:3629 `prog3_level`:3659 `quest_reward_stashed`:3776 `chain_score_recorded`:3879 `ability_rejected`:3904 `prog3_allocated`:3957 `zone_nodes`:3993 `zone_monsters`:3998 `player_join`:4003 `player_leave`:4045 `player_count`:4053 `player_update`:4058 `ping`:4148

The HTTP rows:

`OPTIONS <any path>`, `GET /ws`, `GET /api/lobby`, `GET /health`, `* <any other path>`, `* <a room route>?room=<a room the worker does not make>`, `GET /_room_count`, `GET /api/market/orders`, `GET /api/market/my`, `GET /api/market/history`, `POST /api/market/place`, `DELETE /api/market/cancel`, `* /api/market/<anything else>`, `GET /api/store/browse`, `GET /api/store/mine`, `POST /api/store/list`, `POST /api/store/buy`, `POST /api/store/bid`, `POST /api/store/accept`, `POST /api/store/<anything else>`, `DELETE /api/store/cancel`, `* /api/store/<anything else>`, `POST /api/arena/join`, `POST /api/arena/leave`, `POST /api/arena/result`, `GET /api/arena/status`, `GET /api/arena/tournament`, `* /api/arena/<anything else>`, `POST /api/account/login`, `POST /api/account/reset`, `* /api/account/<anything else>`, `* /api/leaderboard/* (any method but GET)`, `GET /api/leaderboard/top`, `POST /api/leaderboard/update`, `POST /api/leaderboard/gone`, `POST /api/leaderboard/faceless`, `POST /api/leaderboard/faces`, `GET /api/leaderboard/<anything else>`, `POST /api/feedback/submit`, `GET /api/feedback/list`, `POST /api/feedback/vote`, `GET /api/feedback/stats`, `POST /api/feedback/crash`, `GET /api/feedback/crashes`, `* /api/feedback/<anything else>`, `* /api/botstat?id=<playerId>`, `* /api/botstat?flagged=1`, `* /api/botstat (neither)`, `* /api/admin/* (the key)`, `GET /api/admin/overview`, `GET /api/admin/economy`, `GET /api/admin/loot`, `GET /api/admin/player`, `POST /api/admin/grant`, `POST /api/admin/kick`, `POST /api/admin/freeze`, `DELETE /api/admin/freeze`, `POST /api/admin/restore`, `GET /api/admin/log`, `POST /api/admin/device-pass`, `POST /api/admin/device-forget`, `POST /api/admin/key-new`, `GET /api/admin/flags`, `POST /api/admin/flags`, `DELETE /api/admin/flags`, `POST /api/admin/announce`, `DELETE /api/admin/announce`, `GET /api/admin/capes`, `DELETE /api/admin/capes`, `GET /api/admin/chainstatus`, `GET /api/admin/reports`, `DELETE /api/admin/reports`, `* /api/admin/<anything else>`, `GET /api/admin/dev/state`, `GET /api/admin/dev/goldlog`, `GET /api/admin/dev/botflags`, `GET /api/admin/dev/hidden`, `POST /api/admin/dev/hidden`, `DELETE /api/admin/dev/hidden`, `GET /api/admin/dev/testmodes`, `GET /api/admin/dev/apinfo`, `GET /api/admin/dev/looks`, `GET /api/admin/dev/accuracy`, `POST /api/admin/dev/lookseen`, `POST /api/admin/dev/kit`, `POST /api/admin/dev/vitals`, `POST /api/admin/dev/quests`, `POST /api/admin/dev/tour`, `POST /api/admin/dev/questcount`, `POST /api/admin/dev/clearwave`, `POST /api/admin/dev/hurt`, `POST /api/admin/dev/daily`, `POST /api/admin/dev/farmripe`, `POST /api/admin/dev/trapping`, `POST /api/admin/dev/codex`, `POST /api/admin/dev/fish`, `POST /api/admin/dev/achv`, `POST /api/admin/dev/killroll`, `POST /api/admin/dev/lifeskill`, `POST /api/admin/dev/combat`, `POST /api/admin/dev/botflag`, `POST /api/admin/dev/spar`, `POST /api/admin/dev/testmode`, `POST /api/admin/dev/dropage`, `POST /api/admin/dev/revealbag`, `POST /api/admin/dev/lookwipe`, `* /api/admin/dev/<anything else>`
