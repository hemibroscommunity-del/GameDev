/* ═══ v2.3.5185: THE ACTION DOOR (grand plan step 5.8; card K PR 5) ═══
 *
 * One way out of the page.  Every request a player's page makes of the worker
 * is a row here: its name (the wire table's: server/src/wire/), and its WAY,
 * how it leaves:
 *
 *   own        the connection's own (join, pong, track): wsClient.js sends it,
 *              and act() refuses it
 *   move       a step: the batch's latest place, never queued
 *   alone      sent at once, in a frame of its own (the shim's pass-through)
 *   claim      alone, a waiting batch flushed first when frames bundle
 *              (monster_damage: the move rides the claim's frame)
 *   aftermove  alone, the pending move sent first (the worker measures it from
 *              where it has you: loot_pickup, ability)
 *   priority   a broadcast event sent at once, the 33 ms batch flushed first
 *   attack     a PvP swing: the batch flushed, then sent as its own type
 *   rider      rides the next frame (gather_node: game/quietPhone.js)
 *   batch      a broadcast event in the 33 ms batch
 *   http       a route: a GET as a plain request (no headers, its fields in
 *              the query), a POST with its JSON body (v2.3.5191)
 *
 * and its flags: `settled` (the worker answers it, so the dead-pipe watch
 * waits for one: wsClient.js SETTLED_SENDS), `held` (kept through a lost
 * socket and sent on the rejoin: node_strike), `req` (it moves value out or
 * cannot be undone: the door gives it a request id, below), `body: 'top'`
 * (its fields sit at the message's top, not in `payload`), `legacy` (sent for
 * an older worker; today's drops it), `auth` (a route that reads the session's
 * token: the door sends it in x-bt-auth; v2.3.5191, the table's `trust`).
 *
 * THE SHIM IS THE DOOR'S TRANSPORT.  wsClient.js's channelShim reads these
 * rows: its pass-through (the list it kept by hand, TRAPS §18), its
 * PRIORITY_EVENTS and its SETTLED_SENDS are made here, one list.  A direct
 * type with no row was silently dropped; it still is not sent, but it is
 * counted (doorCounts) and, on a QA page (window.__btProbe), said aloud.
 *
 * act(name, payload): the door itself.  It refuses (and counts) a name with
 * no row, and gives every `req` row a request id (SHAPES part 2: `reqId`, one
 * maker, 1 to 64 of A-Z a-z 0-9 _ -), sent as payload.reqId (in an HTTP body,
 * reqId): bytes, never a message.  A worker that does not read it yet lets
 * it pass.  Nothing calls act() in this PR: card K's PR 7 moves the page's
 * sends here a family at a time, the same payload, the same way.
 *
 * NO IMPORTS, and never the worker's table (it would carry every row and its
 * notes into a phone's memory): the rows are the page's own, and
 * tools/guards/action-door.test.mjs holds them to the table.  Where a helper
 * would one day act for a player (pillar 11), it acts here.
 */

const A = (way, more) => Object.freeze({ way, ...(more || {}) });

export const ACTIONS = Object.freeze({
  /* ── the connection's own sends (wsClient.js): the door names them, and act() refuses them ── */
  join: A('own'),
  pong: A('own'),
  track: A('own'),
  /* a step: the batch's latest place, never queued (the adaptive rate, the message diet) */
  move: A('move'),

  /* ── sent alone, at once: the shim's pass-through (TRAPS §18: a type with no row never left the
     page; now the door refuses it and counts it).  The comments are the pass-through's own, moved
     here word for word (v2.3.5185) ── */
  monster_damage: A('claim'),
  /* v2.3.2026: opening a golden ticket.  This list is an ALLOWLIST — a
     type with no line here is silently dropped and the feature runs on
     nothing, which is what TRAPS #18 and the harvest handshake below
     record.  The redeem is the only way a cape is granted, so a missing
     case would mean tickets that never open, in public, during the
     event. */
  cape_redeem: A('alone', { req: 1 }),
  /* v2.3.2109: equipping/unequipping the cape you won. Same allowlist
     rule as the redeem above -- a type with no line here is silently
     dropped and the feature runs on nothing (TRAPS #18). */
  cape_equip: A('alone'),
  /* v2.3.2127: drinking a potion out of the bag. Same allowlist rule --
     a type with no line here is silently dropped and the feature runs on
     nothing (TRAPS #18). This one would fail in the worst way: the
     bottle stays in the bag and nothing happens, which reads as a broken
     item rather than as a broken send. */
  /* v2.3.2820: Open Chest (ItemDetailPopup) -> dailychest.js.  The shim
     passes only the types it names, so without this the button sent
     nothing at all -- caught by mp-polish opening a real chest. */
  chest_open: A('alone', { req: 1 }),
  /* v2.3.3140: the daily rewards' four asks (dailyRewards.js) ->
     dailyrewards.js.  TRAPS #18: a type this allowlist does not name never
     leaves the browser, and the Spin button would turn a wheel nothing
     answers. */
  /* v2.3.4295: the login wheel's two asks (loginSpinWheel.js) -> loginspin.js */
  loginspin_ask: A('alone'),
  loginspin_go: A('alone'),
  loginspin_double: A('alone', { req: 1 }),
  loginspin_collect: A('alone'),
  rewards_get: A('alone'),
  daily_spin: A('alone', { req: 1 }),
  daily_reroll: A('alone'),
  season_claim: A('alone'),
  /* v2.3.2822: Smelt at the blacksmith (SmithyPanel) -> smelting.js. */
  smelt_bar: A('alone', { req: 1 }),
  /* v2.3.3127: the farm (FarmPanel's Feed & Seed window) -> farm.js.
     Without these three lines the window would ask and never hear back
     -- TRAPS #18, the allowlist's one way to fail silently. */
  /* v2.3.3134: + farm_order, the Feed & Seed's order board (farmorders.js). */
  farm_open: A('alone', { settled: 1 }),
  farm_act: A('alone', { settled: 1, req: 1 }),
  farm_buy: A('alone', { settled: 1, req: 1 }),
  farm_order: A('alone', { settled: 1, req: 1 }),
  /* v2.3.3120: pet trapping -- the Woodworker's Traps tab, the TRAP
     pop-up and the Pets page (game/trapping.js, game/petBook.js) ->
     trapping.js / petbook.js.  TRAPS #18: a type with no line here is
     silently dropped, and the button would do nothing at all. */
  /* v2.3.3139: five logs into one hardened wood (the Woodworker's
     Harden tab, HardenedWoodTab.jsx) -> hardenedwood.js.  TRAPS #18:
     without this line the Make button would send nothing at all. */
  make_hardened_wood: A('alone', { req: 1 }),
  /* v2.3.3525: Lil Bro's race (game/race.js) -> race.js.  TRAPS #18:
     without this line Race! would send nothing at all. */
  race_start: A('alone'),
  /* v2.3.3776: the skateboard (game/ride.js) -> ride.js.  TRAPS #18:
     without this line the board button would send nothing at all. */
  ride: A('alone'),
  /* v2.3.3539: a rest at the Hotel or on your farm's bed (game/rest.js)
     -> rest.js.  TRAPS #18: without this line Rest would send nothing
     at all. */
  rest_request: A('alone'),
  /* v2.3.3785: the Bank's vault (game/bank.js) -> bank.js.  TRAPS #18:
     without these the window would send nothing at all. */
  bank_open: A('alone'),
  bank_deposit: A('alone'),
  bank_withdraw: A('alone'),
  /* v2.3.3748: standing in a burning heap (game/heapBurn.js) ->
     heapburn.js.  TRAPS #18: without this line the worker never hears
     and nobody burns. */
  heap_burn: A('alone', { req: 1 }),
  /* v2.3.3123: more room in the Pet House */
  make_traps: A('alone', { req: 1 }),
  trap_arm: A('alone'),
  pet_active: A('alone'),
  pet_name: A('alone'),
  pet_release: A('alone', { req: 1 }),
  pet_house_buy: A('alone', { req: 1 }),
  /* v2.3.3092: Forge armor from bars (SmithyPanel's Armor tab) ->
     armorforge.js.  TRAPS #18: without this the request never leaves. */
  forge_armor: A('alone', { req: 1 }),
  /* v2.3.3141: Salvage and Use an essence (SmithyPanel's Salvage tab) ->
     salvage.js.  TRAPS #18: without these the requests never leave. */
  smith_salvage: A('alone', { req: 1 }),
  essence_apply: A('alone', { req: 1 }),
  /* v2.3.4012: Reveal on a mystery piece's card (game/revealBag.js) ->
     revealbag.js.  TRAPS #18: without this the ask never leaves. */
  reveal_item: A('alone', { req: 1 }),
  /* v2.3.3091: the shield on the arm (game/shieldWear.js) -> shieldwear.js.
     TRAPS #18: without this line the report never leaves the browser. */
  shield_wear: A('alone'),
  /* v2.3.3392: a held pose -- sit, sleep, flop, a dance
     (game/emoteMoves.js) -> poses.js, which keeps it on the player.
     TRAPS #18: without this line the pose never leaves the browser. */
  pose: A('alone', { body: 'top' }),
  /* v2.3.3393: "/roll" or "/flip" (game/dice.js) -> dice.js, which rolls.
     TRAPS #18: without this line the ask never leaves the browser. */
  dice: A('alone', { body: 'top' }),
  /* v2.3.3473: Drop, from the bag's item card (game/itemDrop.js) ->
     itemdrop.js.  TRAPS #18: without this line the ask never leaves the
     browser, and the item would stay in the bag with nothing said. */
  /* v2.3.5185 (the gatekeeper, sitting 14): `key` and `qty` sit at the top */
  item_drop: A('alone', { req: 1, body: 'top' }),
  /* v2.3.3527: the title on your card, from the Achievements page
     (game/achievements.js sendAchvTitle) -> achievements.js _achvTitle,
     which answers with a fresh achv_state.  TRAPS #18: without this line
     the ask never leaves the browser and "Use as title" waits for an
     answer that never comes. */
  achv_title: A('alone'),
  /* v2.3.4036: Inspect on a fish and the biggest-fish boards
     (game/fishWeigh.js) -> fishlog.js.  TRAPS #18: without these the
     asks never leave the browser and the weigh-in card waits forever. */
  fish_inspect: A('alone', { req: 1 }),
  fish_board_request: A('alone'),
  /* v2.3.4393: the daily spin's records (game/spinBoard.js) -> boards.js.
     TRAPS #18: without this the ask never leaves the browser. */
  spin_board_request: A('alone'),
  /* v2.3.4545: the Journey page's ask (game/accuracy.js askAccuracy) -> accuracy.js.  TRAPS #18. */
  acc_request: A('alone'),
  /* v2.3.4453: the chest's ask (game/climbActions.js openRiseChest) -> risechest.js.  TRAPS #18. */
  rise_chest_open: A('alone'),
  /* v2.3.3187: a gem into the shield (game/shieldGem.js) -> shieldgem.js.
     TRAPS #18: without this line the ask never leaves the browser. */
  shield_gem: A('alone', { req: 1 }),
  /* v2.3.3513: a gem into a weapon (game/weaponGem.js) -> weapongem.js.
     TRAPS #18: without this line the ask never leaves the browser. */
  weapon_gem: A('alone'),
  /* v2.3.3516: a land's shards cracked, raw gems combined
     (game/shardCrack.js) -> shardcrack.js.  TRAPS #18: without these
     lines the asks never leave the browser. */
  shard_crack: A('alone', { req: 1 }),
  gem_combine: A('alone', { req: 1 }),
  /* v2.3.3250: the open world map's watch (game/presence2.js
     sendMapWatch: open, every 4 s, shut) -> presence2.js.  TRAPS #18:
     without this line the watch never left the browser and the open map
     was sent no far player at all -- mp-presence2's first run. */
  map_watch: A('alone', { body: 'top' }),
  /* v2.3.3530: the window's Attack is the attack (game/nmlAsk.js
     sendChoice) -> nomansland.js _handleNmlAttack: both skulls at
     once.  TRAPS #18: without this line the choice never leaves the
     browser. */
  nml_attack: A('alone', { req: 1, body: 'top' }),
  /* v2.3.3770: the lock after a red skull's death (game/noMansLand.js
     nmlLockAsk, nmlLockAllow) -> nomansland.js _handleNmlLockAsk,
     _handleNmlLockAllow.  TRAPS #18: mp-nmllock's first run found the
     rematch's "?" and "Let them attack you again" never left the
     browser without this line. */
  nml_lock_ask: A('alone'),
  nml_lock_allow: A('alone', { req: 1 }),
  /* v2.3.3313: the alliance (game/alliance.js, the Saloon's Alliance
     part) -> alliance.js: the leader's Name and Declare war, and anyone's
     board.  TRAPS #18: without this line all three would send nothing. */
  alliance_name: A('alone'),
  alliance_war: A('alone', { req: 1 }),
  alliance_board: A('alone'),
  potion_drink: A('alone', { req: 1 }),
  /* v2.3.1704: THE HARVEST HANDSHAKE'S MISSING HALF.  TRAPS #18 again,
     and this one had been silently dead since v2.3.229: the client has
     always sent `extraction_start` (lifeSkillRewards.js startExtraction)
     and the worker has always had a `case` for it, but there was never a
     line HERE — so the message fell off the bottom of this allowlist and
     never left the browser.  Two systems were quietly running on nothing
     as a result:
       1. the swipe-timing anticheat (gathering.js) — with no
          extraction_start record, EVERY node_strike in production took
          the permissive "legacy client" branch and just incremented
          session._extractionMissing;
       2. the v2.3.1690 harvest shield, whose whole job is to stop
          monsters interrupting a harvest — `this.extractions` was empty
          for every player, so it never once engaged.  That is the owner's
          report ("the monsters keep attacking you while harvesting
          resources") in one missing line.
     Invisible to server/test/*, which send this straight down a socket
     and so never exercise the shim; caught by mp-harvest.mjs, which asks
     the worker. */
  extraction_start: A('alone', { settled: 1 }),
  node_strike: A('alone', { settled: 1, held: 1 }),
  /* v2.3.2279: the bow special's blast.  Same allowlist rule as every
     line around it -- a type with no passthrough here is silently
     dropped and the feature runs on nothing (TRAPS #18).  This one
     would fail in the quietest way of all: the DoT would tick out
     exactly as before and the explosion simply would never happen, with
     no error anywhere. */
  arrow_blast: A('alone'),
  loot_pickup: A('aftermove'),
  /* v2.3.2047: Shopkeeper Bro. Three asks, no answers -- the client
     never states a price or a coin total, it names an item and a
     quantity and takes whatever the server echoes back. */
  shop_list: A('alone'),
  shop_sell: A('alone', { req: 1 }),
  shop_buy: A('alone', { req: 1 }),
  shop_quote: A('alone'),
  /* v2.3.2621: the auction house's per-listing message threads
     (storechat.js). Passthrough only -- the client names a listing and
     a line of text; the server stamps the sender, clamps the text and
     decides who may see it. */
  /* v2.3.2623 */
  store_offer: A('alone', { req: 1 }),
  store_offer_cancel: A('alone'),
  store_offer_reply: A('alone', { req: 1 }),
  store_dm: A('alone'),
  store_dm_open: A('alone'),
  stat_allocate: A('alone', { settled: 1 }),
  /* v2.3.1660: trained-rebuild point spend */
  prog3_allocate: A('alone', { settled: 1 }),
  /* v2.3.3541: the free points reset (game/pointsReset.js -> the
     worker's pointsreset.js).  TRAPS #18: without this line the Reset
     button would ask and never hear back. */
  points_reset: A('alone'),
  cook_request: A('alone', { settled: 1, req: 1 }),
  stats_update: A('alone'),
  ability_use: A('alone'),
  /* v2.3.1733: the stamina-ability cast (Shield Bash / Whirlwind).
     THIS LINE IS ONE OF THE THREE LEGS — server case + handler +
     this passthrough (TRAPS #18).  Without it the send returns
     normally, the worker never hears it, and the ability is a button
     that drains a predicted bar and does nothing. */
  ability: A('aftermove'),
  eat_request: A('alone', { req: 1 }),
  /* v2.3.1734: Element Burst (COMBAT-OVERHAUL-PLAN PR 6).  This
     line is the whole difference between the ability working and
     the ability silently not existing — TRAPS #18, and precheck
     rule 8 exists because the same omission ate extraction_start
     for 1400 versions. */
  element_burst: A('alone'),
  /* ═══ v2.3.1706: THREE MORE THE ALLOWLIST WAS EATING ═══
     Found by the precheck rule added in v2.3.1704 to mechanise TRAPS
     #18 — every one of these has a server `case`, a written handler and
     a spec, and not one of them has ever reached the worker.
     gem_cut_request is the worst of the three and is a live economy
     bug, not a dormant one: caps.gems is advertised (join.js), so
     GemcutPanel takes the server-settled branch — it consumes the RAW
     gem locally as prediction, returns early, and waits for the
     private gem_cut_result event to tell it polished-or-shattered.
     That event can never arrive, so cutting a gem destroys it and pays
     nothing, every time.
     amulet_forge_request (op:'gem') is the same shape one step milder:
     the local slot happens anyway, so the amulet LOOKS gemmed until the
     worker's next player_state echo — which has never heard of the gem
     — puts it back.  The gem is gone either way.
     build_point_earned is the harmless one: its handler only recomputes
     maxes early.  Included because leaving one known-dead send in place
     re-teaches the next reader that the warning is noise.
     No double-spend from switching them on: all three clients already
     treat their local mutation as PREDICTION against a server that
     settles from its own copy (rule 20), which is exactly why they were
     written this way and exactly what has been going unused. */
  gem_cut_request: A('alone'),
  amulet_forge_request: A('alone', { req: 1 }),
  build_point_earned: A('alone'),
  /* v2.3.1702: firemaking (light a campfire from a wood_* log).  THIS
     SHIM IS AN ALLOWLIST -- a message type with no case here does not
     reach the worker, it falls through to the broadcast/drop tail
     below.  A new client->server type therefore needs BOTH a server
     `case` and a line here, and the failure mode is silent: the send
     looks fine from the client, the worker simply never hears it.
     Caught in the headless run for this exact message. */
  firemaking_request: A('alone', { req: 1 }),
  shop_purchase: A('alone'),
  cook_recipe: A('alone', { req: 1 }),
  equip_request: A('alone'),
  /* v2.3.1159: the loadout menu now mirrors unequips to the worker
     (the handler predates this but no client path ever sent it, so
     the shim had no passthrough — a locally-unequipped weapon kept
     swinging server-side). */
  unequip_request: A('alone'),
  sell_weapon: A('alone', { req: 1 }),
  forge_weapon: A('alone', { req: 1 }),
  quest_accept: A('alone'),
  /* v2.3.1347: self-service character restart (SettingsPanel
     confirmation flow -> persistence.js _handleCharacterReset). */
  character_reset: A('alone', { req: 1 }),
  quest_turn_in: A('alone', { req: 1 }),
  set_active_slot: A('alone'),
  /* v2.3.5122: the field report (debug/report.js), numbers and closed
     lists only; sent only to a worker that takes one */
  report: A('alone', { body: 'top' }),   /* v2.3.5185 (sitting 14): its fields sit at the top */

  /* ── priority: a broadcast event sent at once, the batch flushed first (wsClient.js PRIORITY_EVENTS,
     moved here with its comments) ── */
  pvp_confirmed: A('priority'),
  stunned: A('priority'),
  duel_accept: A('priority', { req: 1 }),
  duel_decline: A('priority'),
  duel_wager_request: A('priority'),
  pvp_threat: A('priority'),
  threat_response: A('priority', { req: 1 }),
  trade_offer: A('priority'),
  trade_accept: A('priority', { req: 1 }),
  trade_reject: A('priority'),
  clan_war_kill: A('priority', { legacy: 1 }),
  clan_war_end: A('priority', { legacy: 1 }),
  clan_war_declare: A('priority'),
  clan_invite: A('priority'),
  /* v2.3.1132: two-sided trade commands -- the window is a
     server-truth renderer, so a 33ms batch delay would make every
     stage/confirm click feel laggy. */
  /* v2.3.1754: trade2_ready — TRAPS #18, the third leg */
  trade2_open: A('priority'),
  trade2_set: A('priority'),
  trade2_ready: A('priority'),
  trade2_confirm: A('priority', { req: 1 }),
  trade2_cancel: A('priority'),
  trade2_stage_weapon: A('priority', { req: 1 }),
  trade2_unstage_weapon: A('priority'),
  /* v2.3.3122: the trade window's pet lane (trade2.js _handleTrade2Pets) */
  trade2_pets: A('priority'),
  /* v2.3.1185: party commands -- same server-truth-renderer posture
     as trade2; invite/accept clicks should not sit in a batch. */
  party_invite: A('priority'),
  party_accept: A('priority'),
  party_decline: A('priority'),
  party_leave: A('priority', { req: 1 }),
  party_kick: A('priority'),
  party_chat: A('priority'),
  /* v2.3.2301: clan_leave, for the same reason party_leave is here.  The
     Leave button became a server-truth renderer (it no longer clears its own
     UI and waits for the clan_state echo), so a 33ms batch behind position
     updates is 33ms of a button that looks broken. */
  clan_leave: A('priority', { req: 1 }),
  /* v2.3.2136: the two new chat lanes.  Priority for the same reason
     party_chat is -- a line you just typed should not sit in the 33ms
     input batch behind position updates. */
  area_chat: A('priority'),
  whisper: A('priority'),

  /* ── a PvP swing: the batch flushed, then sent alone as its own type ── */
  player_attack: A('attack', { req: 1 }),
  /* ── a rider: the tree you chop, again for a watcher, rides the next frame (game/quietPhone.js) ── */
  gather_node: A('rider'),

  /* ── the 33 ms batch: every other broadcast event the page sends ── */
  ace_board_request: A('batch'),
  ace_flip_request: A('batch', { req: 1 }),
  ace_item_flip_request: A('batch', { req: 1 }),
  arena_sponsor: A('batch', { req: 1 }),
  bro_nonce: A('batch'),
  bro_verify: A('batch'),
  campfire_lit: A('batch'),
  campfire_out: A('batch'),
  chat: A('batch'),
  chat_mute: A('batch'),
  chat_report: A('batch', { req: 1 }),
  clan_create: A('batch'),
  clan_join_accept: A('batch'),
  dungeon_start: A('batch'),
  emote: A('batch'),
  friend_request: A('batch'),
  /* v2.3.5191: the friends' answers, sent by SocialPanel's sendFriend(event, payload) -- a name
     passed to a helper, which the guard's literal scan (§2) never saw, so they had no row: the shim
     passed every broadcast, but act() refuses a name with no row.  The 33 ms batch, as the shim
     sent them (none is a PRIORITY_EVENT) */
  friend_accept: A('batch'),
  friend_decline: A('batch'),
  friend_remove: A('batch'),
  friend_dm: A('batch'),
  gamble_request: A('batch', { req: 1 }),
  guild_quest_turn_in: A('batch'),
  harden_weapon: A('batch', { req: 1 }),
  jackpot_deposit: A('batch', { req: 1 }),
  monster_dmg_at: A('batch'),
  player_died_to_monster: A('batch'),
  player_dodge: A('batch'),
  player_hurt_by_monster: A('batch'),
  player_jump: A('batch'),
  player_projectile: A('batch'),
  player_respawned: A('batch'),
  player_shield: A('batch'),
  player_swing: A('batch'),

  /* ── a route a player's page calls (its path, its method; `auth`: the session's token in x-bt-auth,
     on the routes whose table row reads it -- v2.3.5191, card K PR 7.5: the economy's, as the page
     sent it, and no other.  v2.3.1178: the worker refuses an economy call whose playerId is not
     backed by the caller's own state_sync token: the forged entry fee, the market's item theft) ── */
  'http:/api/market/orders': A('http', { method: 'GET', path: '/api/market/orders' }),
  'http:/api/market/my': A('http', { method: 'GET', path: '/api/market/my' }),
  'http:/api/market/place': A('http', { req: 1, auth: 1, method: 'POST', path: '/api/market/place' }),
  'http:/api/market/cancel': A('http', { auth: 1, method: 'DELETE', path: '/api/market/cancel' }),
  'http:/api/store/browse': A('http', { method: 'GET', path: '/api/store/browse' }),
  'http:/api/store/mine': A('http', { method: 'GET', path: '/api/store/mine', authQuery: 1 }),   /* v2.3.5817 (card RV): its bids only to its own player, the token as a query field (a GET with a header costs a preflight) */
  'http:/api/store/list': A('http', { req: 1, auth: 1, method: 'POST', path: '/api/store/list' }),
  'http:/api/store/buy': A('http', { req: 1, auth: 1, method: 'POST', path: '/api/store/buy' }),
  'http:/api/store/bid': A('http', { req: 1, auth: 1, method: 'POST', path: '/api/store/bid' }),
  'http:/api/store/accept': A('http', { req: 1, auth: 1, method: 'POST', path: '/api/store/accept' }),
  'http:/api/store/cancel': A('http', { auth: 1, method: 'DELETE', path: '/api/store/cancel' }),
  'http:/api/arena/join': A('http', { req: 1, auth: 1, method: 'POST', path: '/api/arena/join' }),
  'http:/api/arena/leave': A('http', { auth: 1, method: 'POST', path: '/api/arena/leave' }),
  'http:/api/arena/status': A('http', { method: 'GET', path: '/api/arena/status' }),
  'http:/api/arena/tournament': A('http', { method: 'GET', path: '/api/arena/tournament' }),
  'http:/api/arena/*': A('http', { method: 'GET', path: '/api/arena/history' }),
  'http:/api/leaderboard/top': A('http', { method: 'GET', path: '/api/leaderboard/top' }),
  'http:/api/feedback/submit': A('http', { method: 'POST', path: '/api/feedback/submit' }),
  'http:/api/feedback/list': A('http', { method: 'GET', path: '/api/feedback/list' }),
  'http:/api/feedback/vote': A('http', { method: 'POST', path: '/api/feedback/vote' }),
});

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const ENV_OF_WAY = Object.freeze({ own: 'own', move: 'event', alone: 'direct', claim: 'direct', aftermove: 'direct', priority: 'event', attack: 'event', rider: 'event', batch: 'event', http: 'http' });

/** The row of a name, or null. */
export function actionRow(name) { return typeof name === 'string' && own(ACTIONS, name) ? ACTIONS[name] : null; }
/** The way a name leaves, or null (no row). */
export function actionWay(name) { const r = actionRow(name); return r ? r.way : null; }
/** Every name of one way, a Set (wsClient.js: PRIORITY_EVENTS). */
export function namesOfWay(way) { return new Set(Object.keys(ACTIONS).filter((n) => ACTIONS[n].way === way)); }
/** The names the worker answers, as wsClient.js's SETTLED_SENDS has always read them ({ type: 1 }). */
export function settledSends() { const o = {}; for (const n of Object.keys(ACTIONS)) if (ACTIONS[n].settled) o[n] = 1; return o; }

/* ══════════ THE REQUEST ID: one maker (SHAPES part 2) ══════════ */
export const REQ_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
let _reqN = 0;
/** A new request id: rq-<clock>-<count>-<random>, always in SHAPES' form. */
export function makeReqId(now, rnd) {
  const t = Math.floor(typeof now === 'number' ? now : Date.now()).toString(36);
  const r = Math.floor((typeof rnd === 'number' ? rnd : Math.random()) * 2176782336).toString(36);
  _reqN = (_reqN + 1) % 1679616;
  return 'rq-' + t + '-' + _reqN.toString(36) + '-' + r;
}

/* ══════════ WHAT THE DOOR REFUSED ══════════ */
const _refused = Object.create(null);
let _refusedTotal = 0;
/** A name with no row: counted, and said aloud on a QA page (TRAPS §18's silent drop, gone). */
export function doorRefuse(name, where) {
  const k = String(name).slice(0, 64);
  _refused[k] = (_refused[k] || 0) + 1;
  _refusedTotal++;
  try {
    if (typeof window !== 'undefined' && window.__btProbe) {
      (window.__btDoorRefused || (window.__btDoorRefused = [])).push({ name: k, where: where || 'act', at: Date.now() });
      console.error('[action door] no row for "' + k + '" (' + (where || 'act') + '): it does not leave the page (src/game/actions.js)');
    }
  } catch (e) { /* a count only */ }
  return false;
}
/** The door's counts: what it refused, by name. */
export function doorCounts() { return { total: _refusedTotal, byName: Object.assign({}, _refused) }; }

/* ══════════ THE DOOR ══════════ */
/* The transport, set by the connection (wsClient.js, where S.channel is
   made): `send(msg)` the shim's, `http(path, init)` a fetch against the
   worker, `token()` the session's x-bt-auth. */
let _t = null;
export function setActionTransport(t) { _t = t && typeof t === 'object' ? t : null; }
/* v2.3.5546: how long the door waits before its one re-send of a route's
   request the worker never answered (caps.reqid only) */
export const RESEND_MS = 1500;
/* v2.3.5196 (card K PR 11): a weapon named by its id, never by its place.
   The requests that take a weapon from the stash name it by its place (the
   key below, and when the payload says it is a stash weapon); against a
   worker that reads the id (caps.gidnames, the transport's weaponGid), the
   door adds the id of the weapon at that place, read from the same stash the
   tap was drawn from: if the stash moved before the worker reads it, the
   worker finds the weapon by its id, or refuses (server/src/gidnames.js). */
export const GID_PLACE = Object.freeze({
  sell_weapon: { key: 'stashIdx' },
  equip_request: { key: 'stashIdx' },
  trade2_stage_weapon: { key: 'stashIdx' },
  amulet_forge_request: { key: 'stashIdx', when: (p) => p.target === 'stash' },
  smith_salvage: { key: 'idx', when: (p) => p.field === 'weaponStash' },
  essence_apply: { key: 'idx', when: (p) => p.field === 'weaponStash' },
  reveal_item: { key: 'idx', when: (p) => p.field === 'weaponStash' },
  'http:/api/market/place': { key: 'stashIndex', when: (p) => p.type === 'sell' },
  'http:/api/store/list': { key: 'stashIndex', when: (p) => p.kind === 'weapon' },
});
/* v2.3.5546 (the gatekeeper, sitting 27): the routes the door may re-send --
   those whose repeat is safe even after the worker restarted and forgot its
   first answer: a listing finds itself on its own record; a buy, a bid or
   an accept finds the listing sold or the bid standing.  NOT the market's
   place (an order that matched at once leaves no record: a re-send after a
   restart would sell the next weapon) nor the arena's join (its repeat reads
   "Already queued", an error, while the player is queued). */
export const RESEND_ROWS = Object.freeze(new Set(['http:/api/store/list', 'http:/api/store/buy', 'http:/api/store/bid', 'http:/api/store/accept']));

/** A request, out of the page.  `opts.query` for a route's query string.
 *  Returns what the transport returns (false: nothing left the page). */
export function act(name, payload, opts) {
  const r = actionRow(name);
  if (!r || r.way === 'own') return doorRefuse(name, r ? 'own' : 'act');
  /* v2.3.5191: no transport (before a session, after its teardown): a route's
     call answers as a fetch that could not leave -- a rejected promise -- so
     its caller's catch runs as it always has; a socket's send answers false */
  if (!_t) return r.way === 'http' ? Promise.reject(new Error('offline')) : false;
  const p = payload && typeof payload === 'object' && !Array.isArray(payload) ? Object.assign({}, payload) : {};
  if (r.req && p.reqId === undefined) p.reqId = makeReqId();
  /* v2.3.5196: the weapon's id beside its place (GID_PLACE) */
  const gp = GID_PLACE[name];
  if (gp && p.gid === undefined && (!gp.when || gp.when(p)) && typeof _t.weaponGid === 'function') {
    const g = _t.weaponGid(p[gp.key]);
    if (typeof g === 'string' && g) p.gid = g;
  }
  const env = ENV_OF_WAY[r.way];
  if (env === 'event') return _t.send({ type: 'broadcast', event: name, payload: p });
  if (env === 'http') {
    if (typeof _t.http !== 'function') return Promise.reject(new Error('offline'));
    /* v2.3.5546 (card K PR 9): against a worker that answers a repeat once
       (caps.reqid, the transport's reqOnce), a request id rides a DELETE's
       query (it has no body), and a request the page heard nothing back from
       -- the fetch failed, or the worker answered 5xx -- is sent ONCE more with
       the same id after RESEND_MS: the worker acts once and answers the first
       answer again (server/src/reqonce.js).  Without the cap: the bytes and the
       one try of before. */
    const once = r.req && RESEND_ROWS.has(name) && typeof p.reqId === 'string' && typeof _t.reqOnce === 'function' && !!_t.reqOnce();
    let q = opts && opts.query ? '?' + opts.query : '';
    /* v2.3.5817 (card RV, step 11.5): a GET row that reads the session's
       token (`authQuery`) gets it as the query field `t`, never a header (the
       comment below: a header on a GET costs a phone a preflight); a worker
       that does not read it ignores it */
    if (r.authQuery && r.method === 'GET') {
      const qt = typeof _t.token === 'function' ? _t.token() : null;
      if (qt) q += (q ? '&' : '?') + 't=' + encodeURIComponent(qt);
    }
    if (once && r.method === 'DELETE') q += (q ? '&' : '?') + 'reqId=' + encodeURIComponent(p.reqId);
    /* v2.3.5191 (card K PR 7.5, the page's fetches moved here): the bytes the
       page sent before.  A GET is a plain request -- no headers, its fields in
       the query -- as every GET of the page was (a header on it would cost a
       phone a preflight's round trip on every list); a body only on a POST; the
       session's token only on a row that reads it (`auth`) */
    const init = { method: r.method };
    const headers = {};
    if (r.method === 'POST') { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(p); }
    const tok = r.auth && typeof _t.token === 'function' ? _t.token() : null;
    if (tok) headers['x-bt-auth'] = tok;
    if (Object.keys(headers).length) init.headers = headers;
    if (opts && opts.signal) init.signal = opts.signal;   /* a caller's time limit (storeAnswer.js postWithin) */
    if (!once) return _t.http(r.path + q, init);
    const url = r.path + q;
    const again = () => new Promise((res) => setTimeout(res, RESEND_MS)).then(() => {
      if (init.signal && init.signal.aborted) throw new Error('aborted');
      return _t ? _t.http(url, init) : Promise.reject(new Error('offline'));
    });
    return Promise.resolve().then(() => _t.http(url, init)).then(
      (res) => (res && typeof res.status === 'number' && res.status >= 500 ? again() : res),
      (e) => (init.signal && init.signal.aborted ? Promise.reject(e) : again()),
    );
  }
  if (r.body === 'top') return _t.send(Object.assign({}, p, { type: name }));
  return _t.send({ type: name, payload: p });
}
