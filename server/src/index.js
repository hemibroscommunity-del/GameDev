/**
 * Hemi Bros ARPG — Cloudflare Durable Objects Multiplayer Server
 *
 * Architecture:
 * - Worker routes /ws?room=ROOM_NAME to GameRoom DO per room
 * - Marketplace DO handles global cross-room buy/sell order book
 * - Leaderboard DO persists player rankings across sessions
 * - ~45Hz server tick batches position broadcasts
 *
 * v2.3.1106 (P4 decomposition, slice 1): the non-GameRoom Durable
 * Objects live in their own modules now -- marketplace.js,
 * leaderboard.js, arena.js, feedback.js.  They are re-exported below
 * because wrangler resolves each binding's class_name from THIS entry
 * module (wrangler.toml `main`); removing a re-export breaks that DO
 * in production even though the code still exists.
 */

export { Marketplace } from './marketplace.js';
export { Leaderboard } from './leaderboard.js';
export { Arena } from './arena.js';
export { Feedback } from './feedback.js';

// v2.3.1114: server-authoritative elemental model (statuses / DoT /
// collisions) -- see elemental.js header for what is and isn't ported.
import {
  ELEMENT_STATUS, applyElementStatus, tickElementStatuses, resolveElementCollision,
  elementMoveMult,
} from './elemental.js';
// v2.3.1115 (P4 slice 2): embedded data tables moved to data.js -- the
// lookup methods stay (call sites unchanged); only the literals moved.
import {
  ARCHETYPES, ZONES, FISH_TIERS, COOKING_RECIPES, SHOP_ITEMS,
  QUEST_REWARDS, BLACKSMITH_TIERS, WOODWORKING_TIERS, QUALITY_GRADES,
  AMULET_TIER_POWER,
  MONSTER_HP_CURVE, RARITY_TIERS,
} from './data.js';
// v2.3.1118 (heavy-systems PR3): order book folded into the GameRoom --
// escrow-at-placement settlement under one DO's input gates.  Methods
// are mixed into the class below (see market.js header for why).
import { marketMethods } from './market.js';
// v2.3.1119 (heavy-systems PR4): server-settled trades -- the relay
// handshake stays, but the room intercepts it and moves the goods
// itself (see trade.js header for the duplication engine this kills).
import { tradeMethods } from './trade.js';
// v2.3.1121 (heavy-systems PR6): duel machine -- real state machine with
// deploy-proof wager escrow; replaces the PR1 interim consent handling
// for duels (threat consent stays interim).
import { duelMethods } from './duel.js';
// v2.3.1125 (Wave 2 PR9): clan registry + server-scored wars -- clans
// leave localStorage, war kills are counted from the server's own PvP
// death resolution (see clans.js header).
import { clanMethods } from './clans.js';
// v2.3.1126 (Wave 2 PR10): the Gladiator Arena on the duel backbone --
// server-observed match results, escrowed entries (see gladiator.js
// header; the old Arena DO is retired from routing below).
import { arenaMethods } from './gladiator.js';
// v2.3.1127 (PR12): server-authoritative instanced dungeons -- folded
// instances riding zone ids the ZONES table doesn't know (see
// dungeon.js header for why that makes the whole combat stack free).
import { dungeonMethods } from './dungeon.js';
// v2.3.1128 (PR11): guild-quest verification -- server-checked
// life-skill quest ladder, claims under guild_claims:<pid>.
import { guildMethods } from './guilds.js';
// v2.3.1129 (PR13): threat machine -- server countdown/cooldown,
// ignore/expiry consent, Call Guards levy + storage-backed gear lock.
import { threatMethods } from './threat.js';
// v2.3.1130 (PR14): server-validated pet capture -- trap consumption,
// server monster HP/range checks, sanitized pet minting.
import { petMethods } from './pets.js';
// v2.3.1131 (PR15): quality grades + hardening v1 -- the §4.6b/§4.6c
// loot layers (effective_base formula, forge quality roll, harden
// ladder).  See hardening.js for the name-collision warning vs the
// client's legacy hardenBonus affix.
import { hardeningMethods } from './hardening.js';
// v2.3.1132 (PR16): two-sided trade window -- both-stage-both-confirm
// sessions on the validate-at-commit core (the gift handshake in
// trade.js stays untouched for old clients; see trade2.js header).
import { trade2Methods } from './trade2.js';
// v2.3.1143: account-login pre-flight -- read-only Login Key check so
// the client can validate a typed key before switching identity.
import { accountMethods } from './account.js';
// v2.3.1146: behavioral anti-bot for life skills (flag-only) -- see botfp.js.
import { botfpMethods } from './botfp.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': '*' } });
    }

    if (url.pathname === '/ws') {
      const room = url.searchParams.get('room') || 'brotown';
      return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(room)).fetch(request);
    }

    // v2.3.1112 (owner directive): ONE SHARED ROOM for everyone.  The old
    // lobby sharded players across brotown-1..10 by scanning room counts,
    // and a probe hiccup or count blip could split two players who joined
    // seconds apart into different rooms -- invisible to each other with
    // no error anywhere (confirmed live: two tabs landed in different
    // rooms; forcing ?room=qa1 on both made them see each other).  At
    // prototype scale everyone belongs together; every lobby call now
    // returns the same room.  The ?room=X URL query stays as the escape
    // hatch for testing / private sessions.  Re-introduce sharding (the
    // scan loop is in git history at v2.3.1111) only when concurrent
    // population approaches MAX_PLAYERS=60, and prefer explicit shard
    // assignment over count-probing when that day comes.
    // Room name 'brotown-1' (not 'brotown') on purpose: the old lobby's
    // first pick was brotown-1, so that DO holds the existing players'
    // stored progress (rpg blobs live per GameRoom DO).
    if (url.pathname === '/api/lobby') {
      return new Response(JSON.stringify({ room: 'brotown-1' }), { headers: corsHeaders });
    }

    // v2.3.1118: the order book lives in the GameRoom now (escrow needs
    // the same DO that owns the player wallets -- see market.js).  Route
    // to the shared room, honoring the ?room=X escape hatch so a qa1
    // session's market ops land in the DO that holds its blobs.  The old
    // global Marketplace DO is retired from routing (class still
    // exported for the wrangler binding; its stale orders were
    // prototype throwaways).
    if (url.pathname.startsWith('/api/market')) {
      const mktRoom = url.searchParams.get('room') || 'brotown-1';
      return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(mktRoom)).fetch(request);
    }

    if (url.pathname.startsWith('/api/leaderboard')) {
      return env.LEADERBOARD.get(env.LEADERBOARD.idFromName('global')).fetch(request);
    }

    // v2.3.1146: anti-bot evidence surface lives in the GameRoom (the
    // botstat:/device: records are in its storage).  ?room= escape hatch
    // honored, same as /api/market.
    if (url.pathname.startsWith('/api/botstat')) {
      const botRoom = url.searchParams.get('room') || 'brotown-1';
      return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(botRoom)).fetch(request);
    }

    // v2.3.1126: the arena lives in the GameRoom now (matches are
    // duels; entries escrow against the same wallets the room owns --
    // see gladiator.js).  The old Arena DO is retired from routing,
    // class kept exported for the wrangler binding (the marketplace.js
    // precedent).  Honor ?room= like /ws and /api/market.
    if (url.pathname.startsWith('/api/arena')) {
      const arenaRoom = url.searchParams.get('room') || 'brotown-1';
      return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(arenaRoom)).fetch(request);
    }

    // v2.3.1143: account-login pre-flight (Login Key check).  Lives in
    // the GameRoom because auth:<id>/rpg:<id> records are per-room DO
    // storage.  Read-only endpoint -- see account.js header for why the
    // client must pre-flight instead of blind write+reload.
    if (url.pathname.startsWith('/api/account')) {
      const acctRoom = url.searchParams.get('room') || 'brotown-1';
      return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(acctRoom)).fetch(request);
    }

    if (url.pathname.startsWith('/api/feedback')) {
      return env.FEEDBACK.get(env.FEEDBACK.idFromName('global')).fetch(request);
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', ts: Date.now() }), { headers: corsHeaders });
    }

    return new Response('Hemi Bros Game Server', { status: 200 });
  },
};


// ═══════════════════════════════════════
//  GAME ROOM — One per room, handles WebSocket multiplayer
// ═══════════════════════════════════════

// Event types the worker emits itself (server -> client).  The default
// branch of webSocketMessage rebroadcasts unknown msg.type values to
// every client, so we MUST refuse to rebroadcast any of these from a
// client -- otherwise a cheater can forge them and grief the room
// (e.g. forge player_state { hp: 0 } to one-shot everyone).
const PRIVILEGED_EVENTS = new Set([
  // Pool / progression mirrors
  'player_state', 'player_died',
  // 'player_respawned' intentionally OMITTED: the client broadcasts it
  // to peers as a visual signal (clears _isDead on remote entries so
  // the corpse stops rendering).  Blocking it here leaves other clients
  // showing the respawned player as a corpse forever.  The server's
  // own server->self player_respawned still fires (direct ws.send,
  // doesn't route through this deny-list).  Forgery risk is purely
  // visual -- a cheater can clear their own corpse on others' screens
  // but can't actually revive themselves server-side.
  'combat_credit', 'harvest_credit', 'loot_credit', 'lifesteal_credit', 'loot_pickup_rejected',
  'stat_allocated', 'ability_rejected',
  // v2.3.1117: inbox/mail delivery notification -- forging it wouldn't
  // grant anything (credits are server-persisted before it's sent) but
  // it drives "you received X" UI, so don't let clients spoof it.
  'inbox_delivered', 'join_rejected',
  // v2.3.1121: duel resolution is server-emitted only.
  'duel_end',
  // v2.3.1124: gamble outcomes are server-rolled + privately sent;
  // forging one at the room is pure grief-popup surface.
  'gamble_result',
  // v2.3.1125: clan registry echoes + war referee emissions.  NOTE
  // deny-listing clan_war_kill/end breaks OLD-client peer-scored wars
  // against this worker -- accepted, that relay was pure forgery
  // surface (each client scored its own kills and paid itself).
  'clan_state', 'clan_error', 'clan_war_kill', 'clan_war_end',
  // v2.3.1126: arena referee emissions (results are server-observed
  // duel outcomes; the old client-claimed /result was the forgery).
  'arena_match_start', 'arena_match_result', 'arena_tournament_complete',
  // v2.3.1127: dungeon instance lifecycle (server-spawned waves,
  // server-settled completion rewards -- see dungeon.js).
  'dungeon_started', 'dungeon_wave', 'dungeon_boss', 'dungeon_complete', 'dungeon_error',
  // v2.3.1128: sponsorship stakes settle off SERVER-observed match
  // results; guild quests verify against server-owned skill levels.
  'arena_stake_placed', 'arena_stake_error', 'arena_stake_result',
  'guild_quest_result', 'guild_quest_error',
  // v2.3.1129: threat-machine emissions (guard fines, lock notices).
  'threat_penalty', 'threat_expired', 'gear_locked',
  // v2.3.1130: pet-capture outcomes are server-rolled + private.
  'pet_capture_result',
  // v2.3.1131: hardening rolls are server-side + private.
  'harden_result',
  // v2.3.1132: two-sided trade session echoes (server-truth renderer).
  'trade2_state', 'trade2_invite',
  // Combat resolution
  'monster_attack', 'monster_hit', 'monster_kill', 'pvp_hit',
  // World state fan-outs
  'loot_drop', 'loot_claimed', 'loot_despawn',
  'zone_monsters', 'zone_nodes', 'zone_loot', 'zone_state',
  // Bootstrap + protocol
  'state_sync', 'tick', 'ping', 'player_count',
  'player_join', 'player_leave', 'player_update',
]);

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.playerState = {};
    this.dirtyPlayers = new Set();
    this.eventBuffer = [];
    this.tickInterval = null;
    this.tickSeq = 0;
    this.TICK_RATE = 22; // 45Hz (22ms)
    this.MAX_PLAYERS = 60;
    this.EVENTS_PER_TICK_CAP = 500;
    this.WEAPON_STASH_CAP = 8; // mirrors WEAPON_STASH_MAX in src/data/gameSystems.js
    this.QUEST_AP_REWARD = 5;  // mirrors QUEST_AP_REWARD in src/data/items.js
    // §16.8 aggregated TickDelta.  Tick-path mutations (regen,
    // monster attacks, respawn, combat XP) used to fire individual
    // _sendPlayerState immediately, producing many small per-player
    // emits per tick.  Now the tick paths queue here and a single
    // flush at end-of-tick emits at most one player_state per
    // affected player per tick.  Action handlers (eat, shop, etc.)
    // still emit immediately since they're rare and want snappy
    // response.
    this.pendingPlayerStateFlush = new Set();

    // §16.12 — PvP Lag Compensation
    this.stateHistory = {};
    this.LAGCOMP_BUFFER_TICKS = 14; // 300ms of history at 45Hz
    this.LAGCOMP_RTT_CAP = 300;
    this.LAGCOMP_RTT_ALPHA = 0.3;

    // Server-authoritative monsters
    this.monsters = {}; // zoneId -> [monster, ...]
    this.dirtyMonsters = new Set(); // zoneIds with changed monsters
    // Protocol v2 per-entity dirty tracking.  v1 sessions still get the
    // full dirty-zone entity list; v2 sessions get only the entities in
    // these id sets (client merges by id).  Zone-level dirtyMonsters /
    // dirtyNodes stay authoritative for "does this tick carry a delta
    // at all" — the id sets only narrow the v2 payload.
    this.dirtyMonsterIds = {}; // zoneId -> Set(monsterId)
    this.dirtyNodeIds = {};    // zoneId -> Set(nodeId)
    this.RESPAWN_TIME = 15000; // 15s respawn
    this.MONSTER_AGGRO_RANGE = 120; // pixels
    /* Monster stop + attack distance.  Bumped 25 -> 55 over a couple
       tuning passes so monsters halt about ~30 px away from the
       player, leaving plenty of room to face the threat and raise
       the directional shield before the swing connects.  Same
       constant gates both "stop advancing" (line ~262) and "attack
       if in range" (line ~292) so they stay paired -- monster halts
       and attacks at the same ring. */
    this.MONSTER_ATTACK_RANGE = 45;
    this.MONSTER_ATTACK_CD = 1500; // ms
    this.TILE = 32;

    // Server-authoritative gather nodes (trees / fish spots / ore veins).
    // Parallel to the monster pattern above: lazy-spawn on first player
    // entry per zone, store in this.nodes, mark dirty on state change,
    // tick respawns alongside _tickMonsters().
    this.nodes = {}; // zoneId -> [node, ...]
    this.dirtyNodes = new Set(); // zoneIds with changed node state
    this.NODE_RESPAWN_TIME = 120000; // 2 min — matches client v2.3.30

    // ═══ Resource-extraction validation (client v2.3.229 windowed-swipe) ═══
    //
    // Constants mirror src/data/gameSystems.js exactly -- keep in sync.
    // computeOpenDelay base is gap-driven: tier-lvl gap of +1 stretches
    // the wait by 1200 ms; -1 compresses by 250 ms; clamped to [2000, 10000].
    // Jitter ±15% applied per attempt (we use the bounds to validate, not
    // the same jitter sample the client picked).
    // v2.3.846: was 1500 -- stale.  The client's phase-2 sustained gesture
    // (mining pump / wood chop / fishing reel) gives the player a 3500 ms
    // window (EXTRACT_WINDOW_MS in src/data/gameSystems.js), but this validator
    // still bounded the strike to 1500 ms, so any harvest that took longer than
    // ~1.75 s (very common for a 2-turn fishing reel) arrived past latestClose
    // and was silently coerced to 'miss': node consumed + respawned, no
    // resource credited.  Must match the client window.
    this.EXTRACT_WINDOW_MS = 3500;
    this.EXTRACT_OPEN_MIN  = 2000;
    this.EXTRACT_OPEN_MAX  = 10000;
    this.EXTRACT_OPEN_BASE = 4000;
    this.EXTRACT_JITTER    = 0.15;
    this.EXTRACTION_TIMEOUT_MS = 15000;     // walk-away cancel is silent; sweep stale state after this
    this.EXTRACTION_GRACE_MS = 250;         // forgiveness on both ends to absorb network jitter
    this.SWIPE_FP_CAP_PER_SESSION = 100;    // ring-buffer the fp samples for offline analysis
    this.LATENCY_CAP_PER_SESSION = 200;     // ring-buffer the open->swipe latencies for stats
    // sessionId -> { nodeId, zone, skill, startedAt, skillLevel, nodeTier, openDelayBase }
    this.extractions = {};

    // Server-authoritative ground loot.  Worker owns the canonical pile
    // list per zone; clients render from broadcasts and send pickup
    // requests via loot_pickup.  Server validates each pickup (range,
    // recipient, single-claim) and emits a private loot_credit back to
    // the picker with their authorized share + any one-of inventory.
    this.loot = {}; // zoneId -> [pile, ...]
    this.LOOT_EXPIRY_MS = 60000;
    // Death-drop timing: dying player has DEATH_PILE_OWNER_MS alone
    // to recover their dropped inventory; after that anyone in zone
    // may grab it; pile despawns entirely at DEATH_PILE_TOTAL_MS.
    this.DEATH_PILE_OWNER_MS = 60000;
    this.DEATH_PILE_TOTAL_MS = 120000;
    this.LOOT_PICKUP_RANGE = 90; // px; was 30 -> 60 -> 90.  The client magnetises a pile toward the player from up to 50 px away (groundLoot.js) and fires the pickup once the *pulled* pile is within 20 px, so the player's true distance to the ORIGINAL drop can approach the magnet range; 60 still rejected those (esp. large monsters like the snowman, where the player attacks/stands further from the drop center) as "out of range".  90 covers the magnet range + movement lag.
    // v2.3.846: node_strike proximity gate.  Separate from LOOT_PICKUP_RANGE
    // because the gather STANCE can sit further from the node than a loot
    // pickup: fishing seats the player ~67 px up-right of the pond so the rod
    // line drops into it (startExtraction snap), and the mining "stand one
    // tile north" spot is a tile away.  60 px silently rejected those strikes.
    this.NODE_STRIKE_RANGE = 110;
    // Zone-entry damage immunity window -- _applyDamage zeroes incoming
    // hits while ps._zoneEntryGraceUntil > now.  Long enough to orient
    // (read monster positions, raise shield), short enough that camping
    // an entry tile to farm isn't a thing.
    // Long grace (1500 ms) was masking lifesteal after respawn -- the
    // player could one-shot a monster before any damage tracked, so
    // dmgFromMonster[m.id] stayed 0 and the kill produced reason
    // 'no-this-mon'.  500 ms is enough to read positions on entry
    // without suppressing the first incoming hit of a normal fight.
    this.ZONE_ENTRY_GRACE_MS = 500;
    this.SHARD_DROP_RATE = 0.10; // 10% per kill, matches client rollMonsterShard

    // AFK timeout — drop sessions that haven't sent real input (move /
    // combat / zone change / etc.) for this long.  Pong replies do NOT
    // reset this clock (see webSocketMessage below), so a tab that's
    // open but idle still gets booted instead of pinging forever and
    // consuming a session slot + tick bandwidth.
    this.IDLE_TIMEOUT_MS = 120000; // 2 minutes

    // On DO wake, close any hibernated sockets we don't have a session for.
    // These are orphans from prior wakes (crashed tabs, expired clients, etc.)
    // and would otherwise leak forever since webSocketClose only fires on TCP close.
    try {
      for (const ws of this.state.getWebSockets()) {
        try { ws.close(1000, 'stale on wake'); } catch {}
      }
    } catch {}
  }

  // Monster stat scaling (mirrors client-side monsterStat).
  // v2.3.1144: rewritten from the iterative loop to the client's CLOSED
  // form, which ceils at the L30/L65 phase breaks.  The loop ceiled only
  // once at the end, so past L30 the two drifted (e.g. brute L35 base
  // HP: client 66, server 65) — invisible while every monster was L1,
  // but a real prediction desync once v2.3.1140 unpinned the bands to
  // L100.  The server is authoritative for monster stats, so the mirror
  // must be exact — zones.test.mjs asserts parity at the boundaries.
  _monsterStat(base, level, r1, r2, r3) {
    if (level <= 30) return Math.ceil(base * Math.pow(r1, level - 1));
    const at30 = Math.ceil(base * Math.pow(r1, 29));
    if (level <= 65) return Math.ceil(at30 * Math.pow(r2, level - 30));
    const at65 = Math.ceil(at30 * Math.pow(r2, 35));
    return Math.ceil(at65 * Math.pow(r3, level - 65));
  }

  // Archetype definitions (mirrors client ARCHETYPES — keep in sync
  // with src/data/gameSystems.js).
  _getArchetype(arch) {

    return ARCHETYPES[arch] || ARCHETYPES.fodder;
  }

  // Zone spawn definitions (mirrors client src/data/zones.js).  w/h
  // match the client's 32x32-tile maps (1024x1024 world px) so
  // monsters spawn and roam inside the visible bounds — wider 50x40
  // values were spawning monsters off the client's map.
  _getZoneConfig(zoneId) {
    // Emoji-only archetypes (brute/swarm/sentinel/volatile/stalker/hexer
    // in zones without a sprite-backed variant) stripped per user
    // request -- they'll be re-added one by one as proper monsters
    // ship.  Kept: anything that resolves to a real sprite on the
    // client renderer.  Snowman/fodder are always sprite-backed;
    // brute in hollows -> rockmonster sprite, brute in tidal -> fishman
    // sprite (via client ZONE_VARIANT_MAP); sky remaps every archetype
    // to mummy so the existing stalker/hexer/volatile mix is preserved.
    // v2.3.1140: level bands UNPINNED (were flattened to [1,1] behind
    // BF-1; see the ZONES table in data.js for the live bands + the
    // client-lockstep rule -- the server is authoritative for monster
    // stats, so a mismatch desyncs client damage prediction from
    // monster_hit AND trips the client's applyZoneVariant level clamp).

    return ZONES[zoneId] || null;
  }

  // Per-zone monster variant overrides.  Mirrors ZONE_VARIANT_MAP in
  // src/data/monsterVariants.js.  Server AI runs against the BASE
  // archetype (fodder/brute/etc.) so this only affects the variant
  // name used for skull / inventory-key resolution on kill --
  // without it, killing a flame-zone fodder (rendered as a fire
  // goblin on the client) drops 'slime-remnants' instead of
  // 'fire-goblin-remnants'.  Keep in sync if new variants ship.
  _variantForArchInZone(arch, zoneId) {
    const MAP = {
      ember: { fodder: 'fireGoblin' },
      sky: {
        fodder: 'mummy', stalker: 'mummy', hexer: 'mummy',
        volatile: 'mummy', brute: 'mummy', swarm: 'mummy', sentinel: 'mummy',
      },
    };
    const zm = MAP[zoneId];
    if (zm && zm[arch]) return zm[arch];
    return null;
  }

  // Per-variant gameplay overrides (speed only for now).  Mirrors the
  // `spd` field on entries in src/data/monsterVariants.js.  Keep in
  // sync if a variant's speed changes -- the server's AI uses this to
  // move the monster at the correct pace, so a stale value here means
  // server-driven movement runs at the wrong speed and clients with
  // the new variants on screen drift away from the server position.
  //
  // skeleton is listed but currently spawns only via the (still
  // client-side) mummy->skeleton transform.  Once that transform
  // moves server-side, dropping `clientSideMovement: true` from the
  // skeleton variant becomes safe; until then, the client keeps
  // running skeleton AI locally and this entry is informational.
  _variantSpeed(variantKey) {
    const SPEEDS = {
      fireGoblin: 1.5,
      mummy: 0.4,
      skeleton: 1.4,
    };
    return SPEEDS[variantKey];
  }

  // Variant transform thresholds + targets.  Mirrors the
  // transformAt + transformsTo fields on entries in
  // src/data/monsterVariants.js.  Returns null for variants that
  // don't transform.
  //
  // Mummy at 50% HP shreds its bandages and becomes a skeleton.  The
  // worker runs this check in _tickMonsters for every alive variant
  // monster + emits a monster_transform event; the client plays the
  // shred animation locally on receipt and updates its archetype.
  _variantTransform(variantKey) {
    const T = {
      mummy: { at: 0.5, to: 'skeleton' },
    };
    return T[variantKey] || null;
  }

  // Spawn monsters for a zone
  _spawnZoneMonsters(zoneId) {
    const zone = this._getZoneConfig(zoneId);
    if (!zone || !zone.spawns) return [];
    const W = zone.w * this.TILE;
    const H = zone.h * this.TILE;
    const margin = 4 * this.TILE;
    const monsters = [];
    let idx = 0;
    for (const spawn of zone.spawns) {
      for (let i = 0; i < spawn.count; i++) {
        const x = margin + Math.random() * (W - margin * 2);
        const y = margin + Math.random() * (H - margin * 2);
        const depthPct = Math.max(0, Math.min(1, y / H));
        const baseLvl = zone.level[0] || 1;
        const maxLvl = zone.level[1] || 10;
        const lvl = Math.max(1, Math.round(baseLvl + depthPct * (maxLvl - baseLvl)));
        const a = this._getArchetype(spawn.arch);
        // baseline-10 rescale: 60 ÷ 4.8; HP curve centralized v2.3.1140 (BF-1)
        const baseHp = this._monsterStat(MONSTER_HP_CURVE.base, lvl, MONSTER_HP_CURVE.ramp, MONSTER_HP_CURVE.plateau, MONSTER_HP_CURVE.endgame);
        const baseDmg = this._monsterStat(12, lvl, 1.045, 1.025, 1.018);
        const baseXp = this._monsterStat(10, lvl, 1.045, 1.025, 1.018);
        const baseGold = this._monsterStat(5, lvl, 1.035, 1.020, 1.015);
        const variantKey = this._variantForArchInZone(spawn.arch, zoneId);
        // Variant speed override: if this (arch, zone) maps to a variant
        // with its own spd (e.g. ember fodder -> fireGoblin spd 1.5),
        // use it.  This is what makes server-driven AI move the variant
        // at the right pace, so the client can stop running its own AI
        // for the variant (was the `clientSideMovement: true` escape
        // hatch on the client side).
        const variantSpd = variantKey ? this._variantSpeed(variantKey) : null;
        const finalSpd = (variantSpd != null) ? variantSpd : (0.5 * a.spdMult);
        monsters.push({
          id: 'sm-' + zoneId + '-' + idx,
          arch: spawn.arch,
          // Variant tag used at kill time for skull / inventory key
          // resolution AND for visual / AI dispatch on the client.
          // Server's AI uses m.spd directly (set above with variant
          // override applied), so variant is also the source of truth
          // for movement pace -- not just cosmetics.
          variant: variantKey,
          // Mid-fight transforms (mummy -> skeleton) mutate m.variant
          // + m.spd; the respawn path resets to these spawn values so
          // a re-spawned mummy starts back in mummy form instead of
          // re-spawning as a skeleton.
          spawnVariant: variantKey,
          spawnSpd: finalSpd,
          level: lvl,
          element: zone.element || null,
          hp: Math.ceil(baseHp * a.hpMult),
          maxHp: Math.ceil(baseHp * a.hpMult),
          dmg: Math.ceil(baseDmg * a.dmgMult),
          xp: Math.ceil(baseXp),
          gold: Math.ceil(baseGold),
          spd: finalSpd,
          emoji: a.emoji,
          color: a.color,
          x, y, spawnX: x, spawnY: y,
          alive: true,
          targetId: null, // player being chased
          atkCd: 0,
          respawnAt: 0,
        });
        idx++;
      }
    }
    return monsters;
  }

  // Mark a single monster / node as changed this tick.  Adds the zone
  // to the v1 zone-level dirty set AND the entity id to the v2 per-
  // entity set, so both protocol payloads stay in sync from one call.
  _markMonsterDirty(zoneId, monsterId) {
    this.dirtyMonsters.add(zoneId);
    if (!this.dirtyMonsterIds[zoneId]) this.dirtyMonsterIds[zoneId] = new Set();
    this.dirtyMonsterIds[zoneId].add(monsterId);
  }

  _markNodeDirty(zoneId, nodeId) {
    this.dirtyNodes.add(zoneId);
    if (!this.dirtyNodeIds[zoneId]) this.dirtyNodeIds[zoneId] = new Set();
    this.dirtyNodeIds[zoneId].add(nodeId);
  }

  // Ensure monsters exist for a zone (lazy spawn)
  _ensureZoneMonsters(zoneId) {
    if (!this.monsters[zoneId]) {
      this.monsters[zoneId] = this._spawnZoneMonsters(zoneId);
      for (const m of this.monsters[zoneId]) this._markMonsterDirty(zoneId, m.id);
    }
    return this.monsters[zoneId];
  }

  // Get zones that have players in them
  _activeZones() {
    const zones = new Set();
    for (const ps of Object.values(this.playerState)) {
      if (ps.z && ps.z !== 'town' && ps.z !== 'farm_home') zones.add(ps.z);
    }
    return zones;
  }

  // Tick monster AI and respawns
  _tickMonsters() {
    const now = Date.now();
    const activeZones = this._activeZones();

    for (const zoneId of activeZones) {
      const monsters = this._ensureZoneMonsters(zoneId);
      if (!monsters || monsters.length === 0) continue;

      // Get players in this zone
      const playersInZone = [];
      for (const [id, ps] of Object.entries(this.playerState)) {
        if (ps.z === zoneId && !ps.dead && !ps.disconnected) {
          playersInZone.push({ id, ...ps });
        }
      }

      for (const m of monsters) {
        // Respawn check
        if (!m.alive) {
          if (m.respawnAt > 0 && now >= m.respawnAt) {
            m.alive = true;
            m.hp = m.maxHp;
            m.x = m.spawnX;
            m.y = m.spawnY;
            m.targetId = null;
            m.atkCd = 0;
            // Revert any in-life variant transform (mummy -> skeleton)
            // so a respawned monster comes back in its original form
            // with the original spd.  Stamped at spawn time and
            // restored here on respawn.
            if (m.spawnVariant !== undefined) {
              m.variant = m.spawnVariant;
              const respawnSpd = m.spawnVariant ? this._variantSpeed(m.spawnVariant) : null;
              if (respawnSpd != null) m.spd = respawnSpd;
              else if (m.spawnSpd != null) m.spd = m.spawnSpd;
            }
            this._markMonsterDirty(zoneId, m.id);
          }
          continue;
        }

        // Mid-fight variant transform (currently just mummy -> skeleton
        // at HP <= 50%).  Server is the source of truth: the worker
        // detects the threshold, swaps m.variant + m.spd, and emits a
        // monster_transform event for the client to play the shred
        // animation locally.  Idempotent -- the m.variant check at the
        // top guarantees only one transform per monster life (until
        // respawn resets m.hp and m.variant via re-spawn flow above).
        if (m.variant) {
          const tx = this._variantTransform(m.variant);
          if (tx && m.maxHp > 0 && (m.hp / m.maxHp) <= tx.at) {
            const fromVariant = m.variant;
            const toVariant = tx.to;
            m.variant = toVariant;
            const newSpd = this._variantSpeed(toVariant);
            if (newSpd != null) m.spd = newSpd;
            this.eventBuffer.push({
              type: 'monster_transform',
              payload: { id: m.id, zone: zoneId, fromVariant, toVariant },
            });
            this._markMonsterDirty(zoneId, m.id);
          }
        }

        // Knockback freeze removed -- the 200 ms AI lockout combined
        // with monster speed (~22 px/sec) meant the 30-60 px shove
        // pushed the monster out of the 45 px attack range and it
        // couldn't catch back up before the player's next swing
        // (600 ms cd), so dmgFromMonster[m.id] never accumulated and
        // _applyMeleeLifesteal returned reason:'no-this-mon' on every
        // kill -- lifesteal silently broke.  The position shove still
        // happens in _handleMonsterDamage; the monster now resumes
        // chase immediately, so the visual bounce is briefer but
        // monsters can re-engage and land hits between swings.

        // v2.3.1139 (item I): CC finally reaches the REAL monsters.
        // freeze/root -> full stop AND no attacks; slow -> x0.4 speed
        // (attacks normal) -- the client's exact moveMult semantics
        // (monsterCombat.js), which until now only slowed the visual
        // while the authoritative monster kept chasing at full speed.
        const ccMoveMult = elementMoveMult(m);

        // Find nearest player for aggro.  If the monster has a recent
        // sticky-aggro override (someone shot it with a bow, etc.),
        // prefer that target even if they're outside proximity range.
        // This is what makes ranged attacks actually pull a monster
        // off its wander -- previously aggro was proximity-only so a
        // sniped mummy just took the hit and kept patrolling.
        let nearest = null;
        let nearestDist = Infinity;
        const stickyAggroActive = m._aggroOverrideUntil && now < m._aggroOverrideUntil;
        if (stickyAggroActive) {
          const stickyP = playersInZone.find(p => p.id === m._aggroOverrideTarget);
          if (stickyP) {
            const dxS = stickyP.x - m.x;
            const dyS = stickyP.y - m.y;
            nearest = stickyP;
            nearestDist = Math.sqrt(dxS * dxS + dyS * dyS);
          } else {
            // Sticky target left the zone -- drop the override and
            // fall through to proximity.
            m._aggroOverrideTarget = null;
            m._aggroOverrideUntil = 0;
          }
        }
        if (!nearest) {
          for (const p of playersInZone) {
            const dx = p.x - m.x;
            const dy = p.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
              nearest = p;
              nearestDist = dist;
            }
          }
        }

        // Movement AI
        //
        // Stop / attack range is read as a literal here (not from
        // this.MONSTER_ATTACK_RANGE) so re-tuning takes effect on the
        // next deploy without needing the DO to restart its
        // constructor.  Existing DO instances that were created with
        // a stale value still pick up new tuning on the next tick
        // because they execute the latest deployed bytecode.
        //
        // Y-axis scaling for the stop ring: sprites stand taller than
        // they are wide, so a 45 px Euclidean ring leaves a visible
        // gap between feet/heads on N-S approaches even though the
        // E-W approach reads as touching.  Weighting dy by Y_SCALE in
        // the range test alone (movement still uses true direction)
        // tightens the effective Y stopping distance to 45 / Y_SCALE
        // while keeping the X stopping distance at 45 px, so the
        // monster ends up at the same perceived contact ring
        // regardless of approach angle.  Y_SCALE=3.0 -> 15 px N-S
        // stopping distance (per user: "needs to be about half of
        // what it is now" from the 30 px v2.3.96 ring).
        const ATTACK_RANGE = 45;
        const Y_SCALE = 3.0;
        // Effective aggro range -- bumps to 1200 px when the sticky
        // override is active, so a bow-snipe from anywhere on screen
        // pulls the monster.  Without the bump the monster could be
        // damaged but still wouldn't pass the proximity gate to enter
        // the chase branch.
        const effAggroRange = stickyAggroActive ? 1200 : this.MONSTER_AGGRO_RANGE;
        if (nearest && nearestDist < effAggroRange) {
          m.targetId = nearest.id;
          const dxA = nearest.x - m.x;
          const dyA = nearest.y - m.y;
          const attackDist = Math.sqrt(dxA * dxA + (dyA * Y_SCALE) * (dyA * Y_SCALE));

          // Move toward player -- but freeze in place while the monster
          // is in the middle of its post-attack animation window.  The
          // worker stamps m._attackingUntil after firing a monster_attack
          // event so the body stops sliding during the swing/lunge sheet.
          const attackingNow = m._attackingUntil && now < m._attackingUntil;
          if (attackDist > ATTACK_RANGE && !attackingNow && ccMoveMult > 0) {
            const dx = nearest.x - m.x;
            const dy = nearest.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              m.x += (dx / dist) * m.spd * ccMoveMult;
              m.y += (dy / dist) * m.spd * ccMoveMult;
              this._markMonsterDirty(zoneId, m.id);
            }
          }

          // Attack player if in range.  v2.3.1139: frozen/rooted
          // monsters can't swing either (client gates the whole AI
          // branch on moveMult > 0 -- mirror that here).
          if (attackDist <= ATTACK_RANGE && now > m.atkCd && ccMoveMult > 0) {
            // Don't fire damage events while the player is blocking — the
            // client's monster_attack handler also computes block reduction,
            // but that path was producing inconsistent block resolution
            // (client snapshot of monster position can drift from server,
            // making the directional arc test miss). Skipping the event
            // entirely when the player has shield up gives reliable
            // blocking. We still set atkCd so the monster doesn't keep
            // queuing while the player blocks.
            if (nearest.blocking) {
              m.atkCd = now + this.MONSTER_ATTACK_CD;
              m._attackingUntil = now + 400;
              // Block cost: 15 stamina (mirrors client at BroTown.jsx:2663).
              // Server is authoritative for stamina now, so deduct here
              // and echo via player_state so the bar visibly drops.
              const blockerPs = this.playerState[nearest.id];
              const staminaCost = 15;
              if (blockerPs && typeof blockerPs.stamina === 'number') {
                blockerPs.stamina = Math.max(0, blockerPs.stamina - staminaCost);
                this._saveRpg(nearest.id, blockerPs);
                this._queuePlayerStateFlush(nearest.id);
              }
              // v2.3.1137: THORNS — reflect 1%/pt of the monster's attack
              // back at it on every successful block (cap 50% at the
              // defenseSpec clamp).  Server-owned: the reflect is
              // authoritative damage, credited like any hit so a thorns
              // kill pays XP/loot/quests through the shared pipeline.
              // slot 'thorns' denies melee lifesteal exactly like 'dot'
              // (you didn't swing — nothing to refund).
              const _thornsPts = (blockerPs && blockerPs.defenseSpec && blockerPs.defenseSpec.thorns) || 0;
              if (_thornsPts > 0 && m.hp > 0) {
                const reflect = Math.min(Math.max(0, m.hp),
                  Math.max(1, Math.round(m.dmg * Math.min(0.50, _thornsPts * 0.01))));
                m.hp -= reflect;
                if (!m.dmgByPlayer) m.dmgByPlayer = {};
                m.dmgByPlayer[nearest.id] = (m.dmgByPlayer[nearest.id] || 0) + reflect;
                this.eventBuffer.push({
                  type: 'monster_hit',
                  payload: {
                    monsterId: m.id, zone: zoneId, dmg: reflect, isCrit: false,
                    attackerId: nearest.id, thorns: true,
                    hpPct: Math.max(0, m.hp / m.maxHp),
                  },
                });
                this._markMonsterDirty(zoneId, m.id);
                if (m.hp <= 0) {
                  this._resolveMonsterKill(zoneId, m, nearest.id, blockerPs, 'thorns');
                }
              }
              // Still emit a monster_attack event so the client can show
              // the "Blocked!" popup + the stamina drain.  blocked: true
              // tells the client to skip the HP-damage path entirely;
              // staminaDrain rides on the wire so the floating number
              // matches the exact server-side cost.
              this.eventBuffer.push({
                type: 'monster_attack',
                payload: {
                  monsterId: m.id,
                  targetId: nearest.id,
                  dmg: m.dmg,
                  dmgTaken: 0,
                  blocked: true,
                  staminaDrain: staminaCost,
                  zone: zoneId,
                  attackerX: m.x,
                  attackerY: m.y,
                }
              });
              continue;
            }
            m.atkCd = now + this.MONSTER_ATTACK_CD;
            m._attackingUntil = now + 400;
            // Apply HP damage server-side BEFORE emitting the event so
            // dmgTaken rides on the wire and the client renders the
            // exact number the server applied.  Block already handled
            // by the early-continue above (server skips the attack
            // entirely while shielded), but pass !blocking to be
            // defensive in case the path changes.
            const targetPs = this.playerState[nearest.id];
            const dmgResult = this._applyDamage(targetPs, m.dmg, false);
            const dmgTaken = dmgResult.dmgTaken;
            // v2.3.1139 (item I): a hexer's landed hit curses the
            // victim -- -30% outgoing damage for 4s, consumed by
            // _computeAttackDamage (mirrors the client's
            // S._cursedUntil, which only ever dimmed the DISPLAY
            // number while the server rolled full damage).
            if (targetPs && m.arch === 'hexer' && !dmgResult.dodged) {
              targetPs._cursedUntil = now + 4000;
            }
            // Don't credit lifesteal damage on a dodge -- nothing to
            // refund since no HP was taken.  But DO track during the
            // zone-entry grace window so the next kill produces a
            // refund instead of silently failing with 'no-this-mon'.
            if (!dmgResult.dodged) {
              const trackAmt = dmgResult.graced ? (dmgResult.dmgIntent || 0) : dmgTaken;
              this._trackMonsterDamage(targetPs, m.id, trackAmt);
            }
            this.eventBuffer.push({
              type: 'monster_attack',
              payload: {
                monsterId: m.id,
                targetId: nearest.id,
                dmg: m.dmg,
                dmgTaken,
                dodged: dmgResult.dodged,
                // v2.3.1137: Second Wind heal rides the attack event so the
                // client pops the green number without a round-trip (the
                // authoritative hp echo arrives via player_state anyway).
                // undefined when 0 -- JSON.stringify drops it from the wire.
                secondWind: dmgResult.secondWind || undefined,
                zone: zoneId,
                attackerX: m.x,
                attackerY: m.y,
              }
            });
            // Echo authoritative hp to the victim + persist.  Death
            // check feeds the player_died event below.
            if (targetPs) {
              this._saveRpg(nearest.id, targetPs);
              this._queuePlayerStateFlush(nearest.id);
              if (targetPs.hp <= 0 && !targetPs.dying) {
                this._handlePlayerDeath(targetPs, nearest.id, 'monster:' + m.id);
              }
            }
            // Mark zone dirty so the monster's position is included in the
            // outgoing tick delta. Without this, a stationary monster that
            // attacks a stationary player produces attack events but no
            // position broadcast, so any client that missed the initial sync
            // never registers the monster locally — leading to "ghost hit"
            // damage reports with no visible attacker.
            this._markMonsterDirty(zoneId, m.id);
          }
        } else {
          // Idle wander -- pick a random target ~30-80 px from the
          // monster's current position (within WANDER_LEASH of spawn),
          // walk to it at full spd, pause 0.5-1.5s on arrival, then
          // pick the next one.
          //
          // Why no time-based target expiry: slow variants (mummy 0.4
          // spd) can't traverse 100 px in 4s, and the previous "expire
          // after 1.5-4s no matter what" loop made them re-roll long
          // before they ever reached the target -- net displacement
          // per target was ~5 px, the user-reported "severely
          // limited" symptom.  Targets now persist until reached or
          // the leash pull-back overrides.
          m.targetId = null;
          const WANDER_STEP_MIN = 30;
          const WANDER_STEP_MAX = 80;
          const WANDER_REACH = 6;
          const WANDER_PAUSE_MIN_MS = 500;
          const WANDER_PAUSE_MAX_MS = 1500;
          const WANDER_LEASH = 180; // hard pull-back if monster drifts far
          const distSpawn = Math.sqrt(
            (m.spawnX - m.x) * (m.spawnX - m.x) +
            (m.spawnY - m.y) * (m.spawnY - m.y)
          );
          if (ccMoveMult === 0) {
            // v2.3.1139: frozen/rooted -- no wander either.
          } else if (distSpawn > WANDER_LEASH) {
            const dxL = m.spawnX - m.x;
            const dyL = m.spawnY - m.y;
            m.x += (dxL / distSpawn) * m.spd * ccMoveMult;
            m.y += (dyL / distSpawn) * m.spd * ccMoveMult;
            this._markMonsterDirty(zoneId, m.id);
            m._wanderTx = null;
            m._wanderTy = null;
          } else if (m._wanderPausedUntil && now < m._wanderPausedUntil) {
            // Mid-pause between wander legs -- standing still.
          } else {
            // Pick a fresh target if we don't have one (just reached
            // the last one, just spawned, or got pulled by the leash).
            if (m._wanderTx == null || m._wanderTy == null) {
              const ang = Math.random() * Math.PI * 2;
              const step = WANDER_STEP_MIN + Math.random() * (WANDER_STEP_MAX - WANDER_STEP_MIN);
              let tx = m.x + Math.cos(ang) * step;
              let ty = m.y + Math.sin(ang) * step;
              // Clamp inside the leash circle around spawn so wander
              // doesn't accumulate outward drift over many segments.
              const dxC = tx - m.spawnX;
              const dyC = ty - m.spawnY;
              const distC = Math.sqrt(dxC * dxC + dyC * dyC);
              if (distC > WANDER_LEASH * 0.8) {
                const k = (WANDER_LEASH * 0.8) / Math.max(distC, 1);
                tx = m.spawnX + dxC * k;
                ty = m.spawnY + dyC * k;
              }
              m._wanderTx = tx;
              m._wanderTy = ty;
            }
            const dxw = m._wanderTx - m.x;
            const dyw = m._wanderTy - m.y;
            const distw = Math.sqrt(dxw * dxw + dyw * dyw);
            if (distw < WANDER_REACH) {
              m._wanderTx = null;
              m._wanderTy = null;
              m._wanderPausedUntil = now + WANDER_PAUSE_MIN_MS
                + Math.random() * (WANDER_PAUSE_MAX_MS - WANDER_PAUSE_MIN_MS);
            } else {
              m.x += (dxw / distw) * m.spd * ccMoveMult;
              m.y += (dyw / distw) * m.spd * ccMoveMult;
              this._markMonsterDirty(zoneId, m.id);
            }
          }
        }
      }

      // v2.3.1114: elemental status tick -- burn/root DoT + expiry.
      // Damage flows through the same overkill clamp / contribution /
      // kill pipeline as weapon hits, so DoT kills award XP, gold and
      // loot exactly like a landed blow.  DoT kills resolve with slot
      // 'dot' so melee lifesteal correctly denies ('not-melee').
      for (const m of monsters) {
        if (!m.alive || !m.statuses) continue;
        const dotEvents = tickElementStatuses(m, this.TICK_RATE / 1000, now);
        for (const ev of dotEvents) {
          if (m.hp <= 0) break;
          const dotDmg = Math.min(ev.dmg, Math.max(0, m.hp));
          if (dotDmg <= 0) continue;
          m.hp -= dotDmg;
          if (!m.dmgByPlayer) m.dmgByPlayer = {};
          m.dmgByPlayer[ev.sourceId] = (m.dmgByPlayer[ev.sourceId] || 0) + dotDmg;
          this._markMonsterDirty(zoneId, m.id);
          this.eventBuffer.push({
            type: 'monster_hit',
            payload: {
              monsterId: m.id, zone: zoneId, dmg: dotDmg, isCrit: false,
              attackerId: ev.sourceId, status: ev.statusId,
              hpPct: Math.max(0, m.hp / m.maxHp),
            },
          });
          if (m.hp <= 0) {
            this._resolveMonsterKill(zoneId, m, ev.sourceId, this.playerState[ev.sourceId], 'dot');
          }
        }
      }

      // v2.3.1110: monster<->monster separation.  Chase + wander have no
      // body collision, so several monsters aggroing one player stack
      // into a single visual blob ("walking through each other").  One
      // gentle pairwise pass per tick: if two live monsters' feet are
      // within MIN_SEP, push each half the overlap apart.  O(n^2) with
      // n <= ~14 per zone (~100 pair checks) -- negligible at 45 Hz.
      // Player<->monster separation stays client-side (the _monBlock
      // push-out in BroTown.jsx) so the server never shoves a player.
      {
        const MIN_SEP = 22;
        for (let i = 0; i < monsters.length; i++) {
          const a = monsters[i];
          if (!a.alive) continue;
          for (let j = i + 1; j < monsters.length; j++) {
            const b = monsters[j];
            if (!b.alive) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= MIN_SEP * MIN_SEP || d2 < 0.0001) continue;
            const d = Math.sqrt(d2);
            const push = (MIN_SEP - d) / 2;
            const ux = dx / d, uy = dy / d;
            a.x -= ux * push; a.y -= uy * push;
            b.x += ux * push; b.y += uy * push;
            this._markMonsterDirty(zoneId, a.id);
            this._markMonsterDirty(zoneId, b.id);
          }
        }
      }
    }
  }

  // ═══ Gather nodes (trees / fish spots / ore veins) ═══
  //
  // The client owns the tier/name/flavor data tables (WOODCUTTING_TIERS
  // / FISHING_TIERS / MINING_TIERS in src/data/lifeSkills.js).  The
  // server only needs to know: how many of each type per zone, their
  // positions, alive/respawnAt, and a tierLvl per node so two clients
  // see the same tier (otherwise each client's createGatherNode() picks
  // a tier via Math.random() and they diverge).
  //
  // tierLvl values for the "shallow" depth: 1 or 6 — that's the set of
  // tier .lvl values <= 10 across all three tier tables.
  _getShallowNodeTierLvls() {
    return [1, 6]; // eligible tier .lvl values for depth=shallow
  }

  // Per-zone node count + type split.  Entry-level resource extraction
  // is zone-specialized -- one resource type per zone so each life-skill
  // has its own home base.  Other zones get no nodes until specific
  // resources are designed for them.
  //   - meadow:  fishing holes
  //   - hollows: ore veins (the rock zone)
  //   - frost:   trees (the snowy zone -- client renders these as pines)
  _getZoneNodeConfig(zoneId) {
    const ZONE_NODES = {
      meadow:  { treeCt: 0, fishCt: 6, oreCt: 0 },
      hollows: { treeCt: 0, fishCt: 0, oreCt: 6 },
      frost:   { treeCt: 6, fishCt: 0, oreCt: 0 },
    };
    return ZONE_NODES[zoneId] || { treeCt: 0, fishCt: 0, oreCt: 0 };
  }

  // Spawn the static node layout for a zone.  Positions are randomized
  // once at first-ever zone activation; after that they're fixed for
  // the lifetime of the Durable Object (re-randomized only on DO wake).
  _spawnZoneNodes(zoneId) {
    const zone = this._getZoneConfig(zoneId);
    if (!zone) return [];
    const W = zone.w * this.TILE;
    const H = zone.h * this.TILE;
    const margin = 8 * this.TILE; // matches client lifeSkills.js inset
    const cfg = this._getZoneNodeConfig(zoneId);
    // Entry-level zones pin to tier 1 (the lowest of the shallow set).
    // _getShallowNodeTierLvls is still defined for future deeper-depth
    // tiers but the active zones (meadow / hollows / frost) all use
    // entry-tier nodes only.
    const nodes = [];
    let idx = 0;
    const placeOne = (type) => {
      const x = margin + Math.random() * (W - margin * 2);
      const y = margin + Math.random() * (H - margin * 2);
      const tierLvl = 1;
      nodes.push({
        id: 'sn-' + zoneId + '-' + idx,
        nodeType: type,
        x, y,
        tierLvl,
        alive: true,
        respawnAt: 0,
      });
      idx++;
    };
    for (let i = 0; i < cfg.treeCt; i++) placeOne('tree');
    for (let i = 0; i < cfg.fishCt; i++) placeOne('fishSpot');
    for (let i = 0; i < cfg.oreCt; i++) placeOne('oreVein');
    return nodes;
  }

  _ensureZoneNodes(zoneId) {
    if (zoneId === 'town' || zoneId === 'farm_home') return [];
    if (!this.nodes[zoneId]) {
      this.nodes[zoneId] = this._spawnZoneNodes(zoneId);
      for (const n of this.nodes[zoneId]) this._markNodeDirty(zoneId, n.id);
    }
    return this.nodes[zoneId];
  }

  // Tick the node respawn loop — flip alive=true on any depleted node
  // whose respawnAt has passed.  No need to scope to "active zones"
  // like _tickMonsters; gather respawn is cheap and tiny.
  _tickNodes() {
    const now = Date.now();
    for (const zoneId of Object.keys(this.nodes)) {
      const list = this.nodes[zoneId];
      if (!list || list.length === 0) continue;
      for (const n of list) {
        if (!n.alive && n.respawnAt > 0 && now >= n.respawnAt) {
          n.alive = true;
          n.respawnAt = 0;
          this._markNodeDirty(zoneId, n.id);
        }
      }
    }
  }

  // Process a player's harvest strike against a gather node.  The
  // client's minigame already gates this on success (mining miss
  // does NOT send node_strike), so we just validate and apply.
  // Tier + resource key mappings for gather nodes.  Hardcoded on the
  // server so the client can't cheat the harvest by lying about what
  // tier was struck.  Limited to the "shallow" depth tier set today
  // (tierLvl 1 + 6); extend if/when deeper depths reach the server.
  _harvestNameForTier(nodeType, tierLvl) {
    const TREE = { 1: 'Kindling', 6: 'Softwood' };
    const FISH = { 1: 'Minnow',   6: 'Clownfish' };
    const ORE  = { 1: 'Copper Ore', 6: 'Iron Ore' };
    const t = tierLvl || 1;
    if (nodeType === 'tree') return TREE[t] || TREE[1];
    if (nodeType === 'fishSpot') return FISH[t] || FISH[1];
    return ORE[t] || ORE[1];
  }

  _harvestResourceType(nodeType) {
    if (nodeType === 'tree') return 'wood';
    if (nodeType === 'fishSpot') return 'fish';
    return 'ore';
  }

  _harvestInvKey(nodeType, tierLvl) {
    const name = this._harvestNameForTier(nodeType, tierLvl);
    const resType = this._harvestResourceType(nodeType);
    return resType + '_' + name.replace(/\s+/g, '_').toLowerCase();
  }

  _harvestYieldMult(accuracy, nodeType) {
    // v2.3.851: a felled tree always yields one log — woodcutting skips the
    // perfect-accuracy 2x bonus (owner).
    // v2.3.853: fishing does the same — one fish per catch regardless of reel
    // accuracy (owner: "only get one fish when I successfully fish"). Mining
    // keeps the perfect-accuracy 2x bonus.
    if (nodeType === 'tree' || nodeType === 'fishSpot') return 1;
    if (accuracy === 'perfect') return 2;
    return 1; // 'good' / 'ok' / unknown
  }

  _harvestXpMult(accuracy) {
    if (accuracy === 'perfect') return 2.0;
    if (accuracy === 'good') return 1.5;
    return 1.0; // 'ok' / unknown
  }

  // Slice 18: rate-limit 'perfect' harvest claims.  The minigame
  // outcome is still client-trusted (server doesn't simulate the
  // minigame), so a cheater could spam accuracy:'perfect' for the
  // doubled yield + XP.  Bound it: only HARVEST_PERFECT_PER_MIN
  // "perfect" claims accepted per 60s window per player; excess
  // downgrades to 'good' (keeps the XP bonus a skilled player
  // would earn but drops the yield doubler).
  //
  // 10/min = 1 every 6 sec, well above the realistic minigame
  // cadence for legit play (each fishing / mining / wood-chop
  // minigame takes several seconds + walk-to-next-node time).
  _ratedHarvestAccuracy(ps, claimed) {
    if (claimed !== 'perfect') return claimed || 'ok';
    const now = Date.now();
    if (!Array.isArray(ps._perfectHistory)) ps._perfectHistory = [];
    // Prune entries older than 60 sec.
    ps._perfectHistory = ps._perfectHistory.filter((t) => (now - t) < 60000);
    if (ps._perfectHistory.length >= 10) {
      return 'good'; // cap exceeded
    }
    ps._perfectHistory.push(now);
    return 'perfect';
  }

  _harvestSkillName(nodeType) {
    if (nodeType === 'tree') return 'woodcutting';
    if (nodeType === 'fishSpot') return 'fishing';
    return 'mining';
  }

  // Base XP per harvest = ceil(tierLvl * 1.5 + 5); the accuracy
  // multiplier (xpMult above) is applied on top.  Mirrors the client
  // formula in createGatherNode (lifeSkills.js).
  _harvestXpForTier(tierLvl, accuracy) {
    const baseXp = Math.ceil(((tierLvl || 1) * 1.5) + 5);
    return Math.ceil(baseXp * this._harvestXpMult(accuracy));
  }

  // lifeSkill level-up threshold curve.  Mirrors LIFE_SKILL_XP on the
  // client (lifeSkills.js): ceil(500 * 1.08^(level - 1)).
  _lifeSkillXpThreshold(level) {
    return Math.ceil(500 * Math.pow(1.08, (level || 1) - 1));
  }

  // Apply XP to a lifeSkill, returns { leveled, newLevel }.  Mirrors
  // addLifeSkillXp on the client; needs to stay byte-identical so
  // local-vs-server level outcomes don't drift.
  _addLifeSkillXp(ps, skill, xpAmt) {
    if (!ps.lifeSkills) ps.lifeSkills = {};
    if (!ps.lifeSkills[skill]) ps.lifeSkills[skill] = { level: 1, xp: 0 };
    const s = ps.lifeSkills[skill];
    s.xp = (s.xp || 0) + xpAmt;
    let leveled = false;
    while (s.xp >= this._lifeSkillXpThreshold(s.level || 1)) {
      s.xp -= this._lifeSkillXpThreshold(s.level || 1);
      s.level = (s.level || 1) + 1;
      leveled = true;
    }
    return { leveled, newLevel: s.level };
  }

  // 33% shard drop per successful harvest (matches the client's
  // rollHarvestShard rate; the monster-kill path uses 10% via
  // _rollShardForKill above).  Server-rolled so a modified client
  // can't force shard drops.
  _rollHarvestShard(zoneId) {
    if (Math.random() >= 0.33) return null;
    return 'shard_' + zoneId;
  }

  // ═══ Combat XP + level (server-authoritative) ═══
  //
  // Mirrors xpRequired() in src/data/gameSystems.js so the worker
  // computes the same level-up threshold the client used to.  Three
  // segments (lvl <= 30, <= 65, <= 100) plus a post-100 prestige
  // ramp -- keep this byte-identical with the client if you ever
  // tune the curve.
  _xpRequiredForLevel(level) {
    const L = level || 1;
    if (L <= 30) return Math.ceil(500 * Math.pow(1.10, L - 1));
    const at30 = Math.ceil(500 * Math.pow(1.10, 29));
    if (L <= 65) return Math.ceil(at30 * Math.pow(1.07, L - 30));
    const at65 = Math.ceil(at30 * Math.pow(1.07, 35));
    if (L <= 100) return Math.ceil(at65 * Math.pow(1.04, L - 65));
    const at100 = Math.ceil(at65 * Math.pow(1.04, 35));
    return Math.ceil(at100 * Math.pow(1.08, L - 100));
  }

  // Accumulate combat XP for the bar / analytics only.  Per
  // docs/specs/build-points-gate-server.md, combat level-up is now
  // gated purely on build points (5 BP = 1 level, fired by the
  // build_point_earned event), not on XP thresholds.  killXp still
  // accumulates on ps.xp so the XP bar can repurpose into a BP bar
  // or analytics without losing the running total.
  _addCombatXp(ps, xpAmt) {
    if (!ps) return { leveled: false, levelsGained: 0, newLevel: 1 };
    ps.level = ps.level || 1;
    ps.xp = (ps.xp || 0) + (xpAmt || 0);
    return { leveled: false, levelsGained: 0, newLevel: ps.level };
  }

  // Drain build points into combat levels: every 5 BP = +1 level +
  // 5 unspentT2 + full pool restore.  Carries excess (10 BP → +2
  // levels).  Returns { leveled, levelsGained, newLevel } matching
  // the old _addCombatXp shape so combat_credit consumers keep
  // working unchanged.
  _tryLevelUpFromBuildPoints(ps) {
    if (!ps) return { leveled: false, levelsGained: 0, newLevel: 1 };
    ps.level = ps.level || 1;
    ps.unspentT2 = ps.unspentT2 || 0;
    ps.buildPointsThisLvl = ps.buildPointsThisLvl || 0;
    let levelsGained = 0;
    const LEVEL_CAP = 100;
    while (ps.level < LEVEL_CAP && ps.buildPointsThisLvl >= 5) {
      ps.buildPointsThisLvl -= 5;
      ps.level += 1;
      ps.unspentT2 += 5;
      levelsGained += 1;
    }
    if (levelsGained > 0) {
      this._recomputeMaxes(ps);
      if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
      if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
      if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
    }
    return { leveled: levelsGained > 0, levelsGained, newLevel: ps.level };
  }

  _handleBuildPointEarned(session) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    // v2.3.910: a build-skill stat went up on the client.  Combat level is now
    // derived from the stat sum, so recompute maxes (which re-derives level)
    // and, on a level gain, top off the pools.  The exact stat values arrive
    // via stats_update; this is a best-effort early recompute, and the
    // authoritative new level reaches the client via the player_state flush.
    const prevLevel = ps.level || 1;
    this._recomputeMaxes(ps);
    if ((ps.level || 1) > prevLevel) {
      if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
      if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
      if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
    }
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
  }

  // ═══ T2 stat allocation (server-validated) ═══
  //
  // Client sends stat_allocate { stat }; worker validates that
  // ps.unspentT2 > 0 and the stat name is in the 10-stat list,
  // decrements unspentT2 by 1, persists, and emits a private
  // stat_allocated event so the client applies R[stat]++ + recalc.
  // Closes the "spend more T2 points than you have" cheat -- the
  // client can no longer mint phantom unspentT2 via localStorage
  // because the server is the source of truth for the counter.
  //
  // What's NOT closed: directly writing R.power = 999 in DevTools.
  // T1 use-trained increments also still flow client-side.  Closing
  // those needs server-tracked stat VALUES (with T1 mutations also
  // server-mediated); a bigger slice -- this one just enforces the
  // T2 spend gate.
  _isValidStat(stat) {
    return stat === 'power' || stat === 'vitality' || stat === 'endurance'
        || stat === 'agility' || stat === 'mind' || stat === 'ferocity'
        || stat === 'elementalMastery' || stat === 'fortification'
        || stat === 'restoration' || stat === 'influence';
  }

  _handleStatAllocate(session, payload) {
    if (!session || !session.id) return;
    const { stat } = payload || {};
    if (!this._isValidStat(stat)) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if ((ps.unspentT2 || 0) <= 0) return;
    ps.unspentT2 -= 1;
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'stat_allocated',
          payload: { stat, newUnspentT2: ps.unspentT2 },
        }));
      } catch (e) {}
      this._sendPlayerState(ws, session.id);
    }
  }

  // ═══ Eating cooked fish (server-authoritative HP heal) ═══
  //
  // Client sends eat_request { invKey } when the player clicks Eat on
  // a cooked_fish_* inventory item.  Server validates the player owns
  // at least one of the item, looks up the heal amount from the
  // hardcoded fish-tier table (mirrors client getFishHealAmount in
  // gameSystems.js), decrements inventory, increments hp (clamped to
  // maxHp), persists, and emits player_state.
  //
  // Closes the "eat to heal beyond what server thinks" cheat: server
  // applies the heal, so a modified client that bypasses inventory
  // decrement still gets stomped on the next player_state.  Mirrors
  // FISHING_TIERS from src/data/lifeSkills.js -- keep in sync if new
  // fish tiers ship to the client.
  _fishHealAmount(invKey) {
    if (typeof invKey !== 'string') return 0;
    if (!invKey.startsWith('cooked_fish_') && !invKey.startsWith('fish_')) return 0;
    // Strip 'fish_' or 'cooked_fish_' prefix to get the species name.
    const species = invKey.replace(/^(cooked_)?fish_/, '').toLowerCase();

    const tier = FISH_TIERS.find((t) => species.includes(t.name));
    if (!tier) return 20; // default for unmapped cooked fish
    return Math.ceil(15 + tier.lvl * 8);
  }

  _handleEatRequest(session, payload) {
    if (!session || !session.id) return;
    const { invKey } = payload || {};
    if (typeof invKey !== 'string') return;
    // Only cooked_fish_* keys are edible this slice; raw fish goes
    // through cook_request first.
    if (!invKey.startsWith('cooked_fish_')) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    if (ps._arenaMatch) return; // v2.3.1126: no healing during an arena match (GDD §43)
    if (!ps.inventory) ps.inventory = {};
    if ((ps.inventory[invKey] || 0) <= 0) return;
    const heal = this._fishHealAmount(invKey);
    if (heal <= 0) return;
    // Decrement inventory + apply heal.  Heal is "wasted" if at max;
    // we still consume the item to match client semantics (the click
    // handler returns early at full, but a race-condition cheater
    // could trigger this server-side -- consume anyway).
    ps.inventory[invKey] -= 1;
    if (ps.inventory[invKey] <= 0) delete ps.inventory[invKey];
    if (typeof ps.maxHp !== 'number') ps.maxHp = 100;
    if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
    ps.hp = Math.min(ps.maxHp, ps.hp + heal);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // ═══ Equipment store (opaque blobs + equip_request) ═══
  //
  // Slots tracked on playerState:
  //   weapon         -- active melee weapon
  //   rangedWeapon   -- active ranged weapon (bow / crossbow)
  //   staffWeapon    -- active staff weapon
  //   activeSlot     -- 'melee' | 'ranged' | 'staff' (which is "in hand")
  //   armor          -- equipped armor
  //   shield         -- equipped shield (with off-hand)
  //   amulet         -- equipped amulet
  //   weaponStash    -- array of stored weapons (max WEAPON_STASH_MAX = 8)
  //
  // This slice stores equipment as opaque objects the client provided.
  // v2.3.1104: no longer fully opaque -- weapon blobs pass through
  // _sanitizeWeapon (tierMult clamp) at every entry point (first-connect
  // bootstrap, stored-record load), because server-computed damage
  // (v2.3.912) and sell value both multiply by tierMult.  Sales are
  // paid from the server-tracked stash entry, never a client-supplied
  // object.
  //
  // Mirror of WEAPON_TYPES base damage values from
  // src/data/gameSystems.js.  Used for sell-value math and (later)
  // server-computed weapon damage.  Keep in sync if new weapon types
  // ship to the client.
  _weaponBase(type) {
    // Baseline-10 rescale (÷4.8): greatsword 48->10 (stays hardest).
    // Mirrors WEAPON_TYPES base in src/data/gameSystems.js (the client
    // mirror divides the same table).  Shared by _computeAttackDamage,
    // the _maxWeaponDmg cap, and _weaponSellValue -- sell values scale
    // down 4.8x in lockstep with the client (coins are NOT rescaled).
    const T = { greatsword: 10, sword: 6.67, bow: 7.29, staff: 8.54 };
    return T[type] || 6.25;          // fists fallback (was 30)
  }

  // v2.3.912: weapon build-CHANNEL resolution (mirrors WEAPON_CHANNELS in
  // src/data/gameSystems.js).  Only the damage + crit channels are live.  The
  // client clamps each channel value to [0,99]; so do we on stats_update.
  // greatsword shares the 'sword' (melee) category, per WEAPON_CATEGORY.
  _wpnCat(type) {
    const C = { greatsword: 'sword', sword: 'sword', bow: 'bow', staff: 'staff' };
    return C[type] || 'sword';
  }
  // Flat base-damage bonus from the type's category damage channel
  // (edge / drawPower / spellPower), perPt 1.0 — mirror gameSystems.js.
  _wpnDmgChannel(ps, type) {
    const K = { sword: 'edge', bow: 'drawPower', staff: 'spellPower' };
    const cat = this._wpnCat(type);
    const v = (ps && ps.weaponSpecs && ps.weaponSpecs[cat] && ps.weaponSpecs[cat][K[cat]]) || 0;
    return v * 1.0;
  }
  // Crit-channel point total (precision / marksmanship / overload).
  _wpnCritPts(ps, type) {
    const K = { sword: 'precision', bow: 'marksmanship', staff: 'overload' };
    const cat = this._wpnCat(type);
    return (ps && ps.weaponSpecs && ps.weaponSpecs[cat] && ps.weaponSpecs[cat][K[cat]]) || 0;
  }
  // v2.3.1133: crit-DMG-channel point total (executioner / headshot / focus)
  // — mirrors client weaponSpecs reads; feeds the crit multiplier at
  // +0.008 per point (99 pts = +79.2%), replacing the retired Ferocity amp.
  _wpnCritDmgPts(ps, type) {
    const K = { sword: 'executioner', bow: 'headshot', staff: 'focus' };
    const cat = this._wpnCat(type);
    return (ps && ps.weaponSpecs && ps.weaponSpecs[cat] && ps.weaponSpecs[cat][K[cat]]) || 0;
  }
  // v2.3.1136: Attunement status-duration multiplier (+0.5%/pt, <=1.495).
  // Successor to the retired Influence bonus; weaponSpecs is server-clamped
  // [0,99] so a forged client can't exceed the cap.  Applies to statuses
  // from ANY weapon's element (global, matching the Influence it replaces).
  _attuneMult(ps) {
    const pts = (ps && ps.weaponSpecs && ps.weaponSpecs.staff && ps.weaponSpecs.staff.attunement) || 0;
    return 1 + Math.min(99, pts) * 0.005;
  }

  // v2.3.1104: weapon-blob sanitizer (P2 of docs/OPTIMIZATION-ROADMAP.md).
  // Weapon objects enter server state from the client on first-connect
  // bootstrap (and legacy stored blobs predate any validation).  Since
  // v2.3.912 the server's own damage roll multiplies by tierMult, so a
  // forged { tierMult: 9999 } blob inflates AUTHORITATIVE damage and
  // sell value -- the old "opaque blobs are harmless" comment stopped
  // being true when server-computed damage shipped.
  //
  // Clamp tierMult to [0, 8] (max legit forge tier is worldbreaker at
  // 7.84; mirrors the armor clamp in _handleStatsUpdate).  Deliberately
  // does NOT reject unknown weapon types: they already fall back to the
  // fists base (6.25) in _weaponBase, and nulling them would destroy
  // legit items if the client ships a new type before this table learns
  // about it.
  // v2.3.1131: the sanitizer now KNOWS the quality/hardness/temper
  // fields (BALANCE-PLAN's "sanitizers must learn the new fields"
  // warning).  Two postures:
  //   - default (stored blob / server-held stash): CLAMP -- quality to
  //     the enum, hardness to [0,5], temper to [0,9999].  The server
  //     wrote these; keep them.
  //   - strict (client-supplied join bootstrap): STRIP -- quality and
  //     hardness multiply the anti-cheat damage ceiling, so a forged
  //     "godly H5" blob from a fresh client would raise its own cap.
  //     v2.3.1141: drops are server-minted now, so every legit weapon
  //     with quality was minted HERE (forge or drop) and persists via
  //     _saveRpg -- a join blob carrying quality is by definition not
  //     ours.  Strict stays strip.
  _sanitizeWeapon(w, strict) {
    if (!w || typeof w !== 'object') return null;
    const out = { ...w };
    out.tierMult = (typeof out.tierMult === 'number' && out.tierMult > 0)
      ? Math.min(8, out.tierMult) : 1;
    if (strict) {
      delete out.quality;
      delete out.hardness;
      delete out.temper;
    } else {
      if (out.quality !== undefined && !QUALITY_GRADES[out.quality]) delete out.quality;
      if (out.hardness !== undefined) {
        out.hardness = (typeof out.hardness === 'number' && out.hardness > 0)
          ? Math.min(5, Math.floor(out.hardness)) : 0;
      }
      if (out.temper !== undefined) {
        out.temper = (typeof out.temper === 'number' && out.temper > 0)
          ? Math.min(9999, Math.floor(out.temper)) : 0;
      }
    }
    return out;
  }

  _sanitizeWeaponList(arr, strict) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, this.WEAPON_STASH_CAP)
      .map((w) => this._sanitizeWeapon(w, strict))
      .filter(Boolean);
  }

  // Sell value mirrors the client at BroTown.jsx ~26613:
  //   ceil((tierMult || 1) * (WEAPON_TYPES[type].base || 30) * 0.5)
  // v2.3.1104: tierMult bounded via _sanitizeWeapon at every entry
  // point; clamp again here so a stale stored blob can't overpay.
  _weaponSellValue(weapon) {
    if (!weapon) return 0;
    const tierMult = (typeof weapon.tierMult === 'number' && weapon.tierMult > 0)
      ? Math.min(8, weapon.tierMult) : 1;
    const base = this._weaponBase(weapon.type);
    return Math.max(1, Math.ceil(tierMult * base * 0.5));
  }

  _handleSellWeapon(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    const { stashIdx } = payload || {};
    if (!Number.isInteger(stashIdx) || stashIdx < 0) return;
    if (!Array.isArray(ps.weaponStash) || stashIdx >= ps.weaponStash.length) return;
    const weapon = ps.weaponStash[stashIdx];
    if (!weapon) return;
    const sellVal = this._weaponSellValue(weapon);
    ps.weaponStash.splice(stashIdx, 1);
    ps.coins = (ps.coins || 0) + sellVal;
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // equip_request swaps a stash entry with an active equipment slot.
  // Server validates stashIdx is in range + slot name is known.
  // (WEAPON_STASH_CAP set in constructor; mirrors WEAPON_STASH_MAX
  // in src/data/gameSystems.js.)
  _isValidEquipSlot(slot) {
    return slot === 'weapon' || slot === 'rangedWeapon' || slot === 'staffWeapon'
        || slot === 'armor' || slot === 'shield' || slot === 'amulet';
  }

  // ═══ Quests (accept + turn-in with reward validation) ═══
  //
  // Mirrors the 25-quest QUEST_CHAINS table in src/data/gameSystems.js
  // for reward amounts + chain progression.  The QUEST COMPLETION
  // CRITERIA (kill counts, item collection, NPC interactions) still
  // run client-side -- mirroring them all would require porting the
  // full quest.check predicate for every quest, plus tracking every
  // mutation that feeds those predicates (loot pickup keys, monster
  // kills, item drops, etc.).  Out of scope for this slice.
  //
  // What this slice closes:
  //   - quest_turn_in spam for free rewards (server checks state
  //     transitions: must be 'active' before turning in).
  //   - Cheater claiming a higher-tier quest's reward by forging
  //     the questId (server uses its own reward table lookup).
  //   - Accepting a quest the player isn't supposed to have yet
  //     (chain order: must be 'available' before active).
  //
  // What still depends on client trust:
  //   - The "quest is actually completed" claim.  Cheater can
  //     accept a quest, immediately turn it in (without doing the
  //     work), and get the reward.  Closing this needs server-
  //     tracked kill counts / inventory acquisition flags / NPC
  //     dialog state -- a separate, bigger slice.
  _QUEST_REWARDS_DATA() {
    return QUEST_REWARDS;
  }

  // (this.QUEST_AP_REWARD set in constructor; mirrors QUEST_AP_REWARD
  // in src/data/items.js -- 5 AP per quest.)
  _handleQuestAccept(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    const { questId } = payload || {};
    if (typeof questId !== 'string') return;
    const reward = this._QUEST_REWARDS_DATA()[questId];
    if (!reward) return; // unknown quest
    if (!ps._quests) ps._quests = {};
    const cur = ps._quests[questId];
    // Allow accepting from 'available' (chain entry granted) or
    // from missing (first quest in chain).  Reject if already
    // active / turnedIn.
    if (cur === 'active' || cur === 'turnedIn') return;
    ps._quests[questId] = 'active';
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // v2.3.1120: increment quest progress counters for every active quest
  // whose declarative objective (data.js QUEST_REWARDS) matches this
  // signal.  kind: 'kill' (arch = monster archetype) | 'gather'.
  // The server is the SOLE writer of _questKills now (client increment
  // sites are gated off by caps.questTrack), so the wholesale
  // player_state echo/adopt of the map is safe.
  _creditQuestObjective(playerId, kind, arch) {
    const ps = this.playerState[playerId];
    if (!ps || !ps._quests) return;
    const table = this._QUEST_REWARDS_DATA();
    let changed = false;
    for (const [qid, status] of Object.entries(ps._quests)) {
      if (status !== 'active') continue;
      const obj = table[qid] && table[qid].objective;
      if (!obj || obj.type !== kind) continue;
      if (kind === 'kill' && obj.arch && obj.arch !== arch) continue;
      if (!ps._questKills) ps._questKills = {};
      ps._questKills[qid] = Math.min(99999, (ps._questKills[qid] || 0) + 1);
      changed = true;
    }
    if (changed) this._queuePlayerStateFlush(playerId);
  }

  _handleQuestTurnIn(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    const { questId } = payload || {};
    if (typeof questId !== 'string') return;
    const reward = this._QUEST_REWARDS_DATA()[questId];
    if (!reward) return;
    if (!ps._quests) ps._quests = {};
    // Must be 'active' to turn in.  This is the spam-defeat:
    // a cheater can't reclaim the reward by spamming the event,
    // and can't claim a quest they never accepted.
    if (ps._quests[questId] !== 'active') return;
    // v2.3.1120: verify the declarative objective before paying.  The
    // old handler validated only the state transition and trusted the
    // completion claim (free gold/XP/AP on request).  Quests without
    // an objective stay client-trusted -- see data.js QUEST_REWARDS
    // header for the whitelist rationale.
    const _obj = reward.objective;
    if (_obj) {
      if (_obj.type === 'kill' || _obj.type === 'gather') {
        if (((ps._questKills && ps._questKills[questId]) || 0) < (_obj.count || 1)) return;
      } else if (_obj.type === 'collect') {
        if (((ps.inventory && ps.inventory[_obj.invKey]) || 0) < (_obj.count || 1)) return;
      } else if (_obj.type === 'flag') {
        if (!(ps._questFlags && ps._questFlags[_obj.flag])) return;
      }
    }
    ps._quests[questId] = 'turnedIn';
    ps.coins = (ps.coins || 0) + (reward.gold || 0);
    // XP via _addCombatXp so level-up logic runs (including
    // pool restores via _recomputeMaxes inside).
    if (reward.xp > 0) {
      const { leveled } = this._addCombatXp(ps, reward.xp);
      if (leveled) {
        this._recomputeMaxes(ps);
        if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
        if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
        if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
      }
    }
    ps.achievementPoints = (ps.achievementPoints || 0) + this.QUEST_AP_REWARD;
    // Unlock next quest in chain.
    if (reward.next && !ps._quests[reward.next]) {
      ps._quests[reward.next] = 'available';
    }
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // ═══ Weapon crafting (blacksmith + woodworker) ═══
  //
  // Mirrors BLACKSMITH_TIERS + WOODWORKING_TIERS from src/data/
  // gameSystems.js (20 tiers each).  Only the fields the worker
  // needs are mirrored (minLvl / tierMult / statReq / *Cost +
  // wood resource key for ww).  Display fields (label / color /
  // desc) stay client-only since the worker doesn't render UI.
  //
  // Client sends forge_weapon { weaponType, tierKey, isWoodwork }.
  // Server validates:
  //   - tierKey exists in the matching tier table
  //   - ps.lifeSkills.[blacksmithing|woodworking].level >= minLvl
  //   - ps[required stat] >= statReq (per EQUIP_STAT_MAP)
  //   - ps.inventory has required ore/wood
  //   - ps.coins >= goldCost
  // Then consumes ingredients + coins, mints the new weapon
  // (matches the client weapon shape exactly), swaps old active
  // weapon to stash (rejected if stash full), applies crafting XP,
  // and emits player_state.  Closes the "forge max-tier weapon for
  // free" cheat: a cheater bypassing the local resource consume
  // still gets stomped because the worker re-validates + applies.
  _BLACKSMITH_TIERS_DATA() {
    // 20 tiers from BLACKSMITH_TIERS.  Keep in sync if the client
    // ships new tiers (greatsword/sword forge use these via
    // gearBase = tier key).
    return BLACKSMITH_TIERS;
  }

  _WOODWORKING_TIERS_DATA() {
    return WOODWORKING_TIERS;
  }

  // EQUIP_STAT_MAP mirror.  Used for the forge statReq gate.
  _equipStatFor(weaponType) {
    if (weaponType === 'greatsword') return 'power';
    if (weaponType === 'sword') return 'agility';
    if (weaponType === 'bow') return 'agility';
    if (weaponType === 'staff') return 'mind';
    return 'power';
  }

  _handleForgeWeapon(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    // v2.3.1129: forging mints INTO the active slot -- that's a gear
    // change, so the guard lock covers it (see threat.js).
    if (this._threatGearLocked(session.id, ps)) return;
    const { weaponType, tierKey, isWoodwork } = payload || {};
    if (weaponType !== 'greatsword' && weaponType !== 'sword' && weaponType !== 'bow' && weaponType !== 'staff') return;
    if (typeof tierKey !== 'string') return;

    // Validate woodwork-vs-blacksmith match with weapon type.
    // Blacksmith forges melee (greatsword/sword); woodworking
    // forges ranged (bow/staff).  Reject mismatches.
    const wantWw = (weaponType === 'bow' || weaponType === 'staff');
    if (wantWw !== !!isWoodwork) return;

    const table = wantWw ? this._WOODWORKING_TIERS_DATA() : this._BLACKSMITH_TIERS_DATA();
    const tier = table[tierKey];
    if (!tier) return;

    // Skill level gate
    const skillName = wantWw ? 'woodworking' : 'blacksmithing';
    const skillLvl = (ps.lifeSkills && ps.lifeSkills[skillName] && ps.lifeSkills[skillName].level) || 1;
    if (skillLvl < tier.minLvl) return;

    // Stat gate (per EQUIP_STAT_MAP)
    const reqStat = this._equipStatFor(weaponType);
    if ((ps[reqStat] || 0) < (tier.statReq || 0)) return;

    // Coin + resource validation.
    if ((ps.coins || 0) < tier.goldCost) return;
    if (!ps.inventory) ps.inventory = {};
    const resourceKey = wantWw ? ('wood_' + tier.wood) : ('ore_' + tier.oreName + '_ore');
    const have = ps.inventory[resourceKey] || 0;
    const cost = wantWw ? tier.woodCost : tier.oreCost;
    if (have < cost) return;

    // Active slot for the new weapon (matches client logic).
    const slot = (weaponType === 'bow') ? 'rangedWeapon'
               : (weaponType === 'staff') ? 'staffWeapon'
               : 'weapon';

    // Stash full check -- if existing active weapon would need to
    // be stashed but stash is full, reject (matches client where
    // stash.push silently no-ops at cap).  Future: auto-sell oldest.
    const current = ps[slot];
    if (current) {
      if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
      if (ps.weaponStash.length >= this.WEAPON_STASH_CAP) return;
    }

    // Apply: consume resources, mint new weapon, swap old to stash.
    ps.inventory[resourceKey] -= cost;
    if (ps.inventory[resourceKey] <= 0) delete ps.inventory[resourceKey];
    ps.coins -= tier.goldCost;

    if (current) {
      ps.weaponStash.push(current);
    }
    ps[slot] = {
      type: weaponType,
      tier: 'common',
      tierMult: tier.tierMult,
      element1: null,
      element2: null,
      isVolatile: false,
      // Name is built client-side from display label; server stores
      // gearBase so the client can reconstruct.
      name: tierKey + ' ' + weaponType,
      gearBase: wantWw ? ('ww_' + tierKey) : tierKey,
      reforgeBonus: null,
      hardenBonus: null,
      // v2.3.1131: §4.6b quality rolled ONCE at mint, immutable
      // (90.1/9/0.9% + godly 1-in-400k); §4.6c hardness starts 0.
      quality: this._rollWeaponQuality(),
      hardness: 0,
      temper: 0,
    };

    // Crafting XP -- mirrors client at the forge sites:
    //   blacksmithing: tier.minLvl * 5
    //   woodworking:   tier.minLvl * 5  (same formula)
    this._addLifeSkillXp(ps, skillName, (tier.minLvl || 1) * 5);

    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // Unequip an active equipment slot.  Weapons move to stash (if
  // room); armor/shield/amulet simply null out since they don't have
  // a stash today.  Closes the cheat where a client unequips locally
  // and gets "lost" gear that server still thinks is equipped --
  // future damage/def math would diverge from client view otherwise.
  _handleUnequipRequest(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    // v2.3.1129: guard gear lock (see threat.js).
    if (this._threatGearLocked(session.id, ps)) return;
    const { slot } = payload || {};
    if (!this._isValidEquipSlot(slot)) return;
    const current = ps[slot];
    if (!current) return;
    // Weapons go to stash; armor/shield/amulet just null out.
    if (slot === 'weapon' || slot === 'rangedWeapon' || slot === 'staffWeapon') {
      if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
      if (ps.weaponStash.length >= this.WEAPON_STASH_CAP) return; // stash full -- reject
      ps.weaponStash.push(current);
    }
    ps[slot] = null;
    // Recompute pool maxes when armor changes -- per the T1/T2 stat
    // redesign spec, armor folds into maxHp via _armorHp.  Cheap call;
    // covers future armor-affecting equipment too.
    if (slot === 'armor') this._recomputeMaxes(ps);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  _handleEquipRequest(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    // v2.3.1129: guard gear lock (see threat.js).
    if (this._threatGearLocked(session.id, ps)) return;
    const { stashIdx, slot } = payload || {};
    if (!this._isValidEquipSlot(slot)) return;
    if (!Number.isInteger(stashIdx) || stashIdx < 0) return;
    if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
    if (stashIdx >= ps.weaponStash.length) return;
    // Swap stash entry with current active slot.  If active slot
    // empty, the stash item moves in and the stash entry becomes
    // null (which we then splice out so stash stays compact).
    const stashItem = ps.weaponStash[stashIdx];
    // Guard against a stash entry that is null/undefined (could
    // happen from a corrupted stored blob from before the
    // splice-on-empty logic existed).  Without this, a cheater
    // could equip a "null" stash entry to wipe the active slot.
    if (!stashItem) return;
    const activeItem = ps[slot] || null;
    ps[slot] = stashItem;
    if (activeItem) {
      ps.weaponStash[stashIdx] = activeItem;
    } else {
      ps.weaponStash.splice(stashIdx, 1);
    }
    // Sanity cap so stash can't grow past the client-side limit even
    // if a cheater somehow inflates it via prior bootstrap.
    if (ps.weaponStash.length > this.WEAPON_STASH_CAP) {
      ps.weaponStash.length = this.WEAPON_STASH_CAP;
    }
    // Armor swap changes maxHp via _armorHp; recompute pool maxes.
    if (slot === 'armor') this._recomputeMaxes(ps);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // ═══ Cooking recipes (multi-ingredient -> buff or heal) ═══
  //
  // Mirrors COOKING_RECIPES in src/data/gameSystems.js.  Client sends
  // cook_recipe { recipeIdx } when the player triggers a recipe from
  // either of the two onClick sites (cooking panel + farm food kiosk
  // -- BroTown.jsx ~18981 / ~29762).  Server validates ingredient
  // ownership via substring match (same as client), consumes the
  // ingredients, and applies the buff or heal.
  //
  // Buff state is tracked on ps._buffs as { regen: endsAt, resist:
  // endsAt, damage: endsAt, all: endsAt, hp: endsAt, mana: endsAt }
  // -- only the buffs that affect server-computed values get applied
  // server-side (regen in _tickPlayerRegen, resist in _applyDamage,
  // hp overheal cap in _tickPlayerRegen).  damage / all / spd buffs
  // affect outgoing damage + move speed which the server doesn't
  // currently enforce -- those flags are tracked for future use and
  // emitted in player_state so the client can render correctly.
  //
  // Closes the cheat surface for when recipe buffs get wired up:
  // currently no recipe has buff:'heal' so the heal path is dead
  // code on the client, but if it gets added later the worker
  // already handles it safely.
  _getCookingRecipe(idx) {
    // Mirror of COOKING_RECIPES from src/data/gameSystems.js.  Keep
    // in sync when new recipes ship.  The indices must match the
    // client's array order since the client sends the index.

    if (!Number.isInteger(idx) || idx < 0 || idx >= COOKING_RECIPES.length) return null;
    return COOKING_RECIPES[idx];
  }

  // Match-then-consume helper.  Mirrors the CLIENT's behavior but with
  // a stricter matcher: client uses bare k.includes(type), which would
  // unintentionally match unrelated inventory keys that happen to
  // contain the type string as a substring (e.g. "shard_herb_firebloom"
  // would be consumed by a "herb_firebloom" ingredient).  We restrict
  // matches to k === type OR k === ('cooked_' + type) so only the
  // canonical inventory key (and its cooked variant) is consumed.
  // Client matches more loosely; the divergence means the server may
  // refuse some recipes the client would accept, but that's safer than
  // the inverse.
  _ingredientMatches(invKey, type) {
    return invKey === type || invKey === ('cooked_' + type);
  }

  _consumeIngredient(ps, type, count) {
    if (!ps.inventory) return false;
    let remaining = count;
    // First pass: count availability across matching keys.
    let total = 0;
    for (const [k, v] of Object.entries(ps.inventory)) {
      if (this._ingredientMatches(k, type) && v > 0) total += v;
    }
    if (total < count) return false;
    // Second pass: consume from matching keys until satisfied.
    for (const k of Object.keys(ps.inventory)) {
      if (remaining <= 0) break;
      if (!this._ingredientMatches(k, type) || ps.inventory[k] <= 0) continue;
      const take = Math.min(ps.inventory[k], remaining);
      ps.inventory[k] -= take;
      remaining -= take;
      if (ps.inventory[k] <= 0) delete ps.inventory[k];
    }
    return true;
  }

  _handleCookRecipe(session, payload) {
    if (!session || !session.id) return;
    const { recipeIdx } = payload || {};
    const recipe = this._getCookingRecipe(recipeIdx);
    if (!recipe) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    if (!ps.inventory) ps.inventory = {};

    // First-pass dry-run: confirm ALL ingredients are available
    // before consuming any (so we don't half-consume on a failure).
    for (const [type, count] of Object.entries(recipe.ingredients)) {
      let total = 0;
      for (const [k, v] of Object.entries(ps.inventory)) {
        if (this._ingredientMatches(k, type) && v > 0) total += v;
      }
      if (total < count) return;
    }
    // Second pass: actually consume.
    for (const [type, count] of Object.entries(recipe.ingredients)) {
      this._consumeIngredient(ps, type, count);
    }

    // Apply the recipe effect.  Buffs go onto ps._buffs as endsAt
    // timestamps; heal modifies hp directly.  Duration is seconds
    // in the recipe table, ms on the wire.
    if (!ps._buffs) ps._buffs = {};
    const dur = (recipe.duration || 0) * 1000;
    const endsAt = Date.now() + dur;
    if (recipe.buff === 'heal') {
      // v2.3.1126: dead data today (no recipe carries buff:'heal') but
      // gated anyway -- arena matches disable healing (GDD §43).
      if (ps._arenaMatch) return;
      if (typeof ps.maxHp !== 'number') ps.maxHp = 100;
      ps.hp = Math.min(ps.maxHp, (ps.hp || 0) + (recipe.power || 0));
    } else if (recipe.buff === 'regen') {
      ps._buffs.regen = endsAt;
    } else if (recipe.buff === 'resist') {
      ps._buffs.resist = endsAt;
    } else if (recipe.buff === 'damage') {
      ps._buffs.damage = endsAt;
    } else if (recipe.buff === 'all') {
      // 'all' buff sets all four sub-buffs.  Mirrors the client at
      // BroTown.jsx ~29766: damage + spd + hp + mana all extended.
      ps._buffs.damage = endsAt;
      ps._buffs.spd = endsAt;
      ps._buffs.hp = endsAt;
      ps._buffs.mana = endsAt;
    }

    // Cooking XP grant -- mirrors addLifeSkillXp on the client.
    this._addLifeSkillXp(ps, 'cooking', (recipe.tier || 1) * 25);

    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // Buff-active helpers used in regen + damage paths.  Treat undefined
  // / 0 / past timestamps as inactive.
  _buffActive(ps, name) {
    return !!(ps && ps._buffs && ps._buffs[name] && Date.now() < ps._buffs[name]);
  }

  // ═══ NPC consumables shop (server-authoritative purchase) ═══
  //
  // Client sends shop_purchase { itemId } when the player clicks Buy
  // on the NPC vendor.  Server mirrors the 5-item table (see client at
  // BroTown.jsx ~17905), validates ps.coins >= discounted cost (where
  // discount = min(0.20, ps.influence * 0.002) per §2.6), deducts coins,
  // applies the effect to the appropriate playerState field, persists,
  // and emits player_state.
  //
  // Closes the "buy infinite potions" + "buy without spending coins"
  // cheats: server is the only writer for coins/inventory/pools after
  // a purchase.  The dmgBuff effect is transient client-only (_dmgBuff
  // timer); no server tracking needed for that one.
  _getShopItem(itemId) {

    return SHOP_ITEMS[itemId] || null;
  }

  /* ═══ v2.3.1124: SERVER-SETTLED GAMBLING (Wave 2 PR8; spec in
   * docs/specs/gambling.md) ═══
   *
   * The Gamble Hall roll used to be the PLAYER'S OWN Math.random() with
   * a local 2x self-credit (GamblePanel.jsx) -- phantom today, but a
   * solo infinite-gold faucet the moment any settlement trusted it.
   * The server rolls and settles in ONE mutation on live state: no
   * escrow, no opId, no crash window (ARCHITECTURE-HANDOFF rule 8) --
   * a resent request is legitimately a new roll, bounded by the rate
   * limit.  Constants mirror src/data/items.js GAMBLE_* (keep in sync).
   * ps._lastGambleAt is deliberately NOT in the _saveRpg field list, so
   * the rate-limit window is in-memory only (a deploy reset loses
   * nothing).  Invalid requests are ignored silently -- the panel's own
   * client gates keep legitimate players from ever sending them. */
  _handleGambleRequest(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const wager = Math.floor(Number(payload && payload.wager));
    if (!Number.isFinite(wager) || wager < 10 || wager > 10000) return;
    const now = Date.now();
    if (ps._lastGambleAt && now - ps._lastGambleAt < 2000) return;
    if ((ps.coins || 0) < wager) return;
    ps._lastGambleAt = now;
    const won = Math.random() < 0.40; // GAMBLE_WIN_CHANCE mirror
    ps.coins += won ? wager : -wager;
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'gamble_result',
          payload: { won, wager, payout: won ? wager * 2 : 0 },
        }));
      } catch (e) { /* echo carries the coins either way */ }
    }
  }

  _handleShopPurchase(session, payload) {
    if (!session || !session.id) return;
    const { itemId } = payload || {};
    if (typeof itemId !== 'string') return;
    const item = this._getShopItem(itemId);
    if (!item) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    // §2.6 Influence discount — 0.2% per point, max 20%.
    const discount = Math.min(0.20, (ps.influence || 0) * 0.002);
    const finalCost = Math.max(1, Math.floor(item.cost * (1 - discount)));
    if ((ps.coins || 0) < finalCost) return;
    ps.coins -= finalCost;
    // Apply effect.  Pool restores clamp to max; trap grants inventory;
    // dmgBuff is transient client-only (server doesn't track buff timers).
    if (item.effect === 'healFish') {
      // v2.3.1126: no healing during an arena match (GDD §43).  The
      // coins were already spent above -- matching the eat_request
      // consume-anyway posture would be wrong here, so refund.
      if (ps._arenaMatch) { ps.coins += finalCost; return; }
      if (typeof ps.maxHp !== 'number') ps.maxHp = 100;
      if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
      ps.hp = Math.min(ps.maxHp, ps.hp + (item.power || 23));
    } else if (item.effect === 'stamina') {
      if (typeof ps.maxStamina !== 'number') ps.maxStamina = 100;
      if (typeof ps.stamina !== 'number') ps.stamina = ps.maxStamina;
      ps.stamina = Math.min(ps.maxStamina, ps.stamina + (item.power || 60));
    } else if (item.effect === 'mana') {
      if (typeof ps.maxMana !== 'number') ps.maxMana = 100;
      if (typeof ps.mana !== 'number') ps.mana = ps.maxMana;
      ps.mana = Math.min(ps.maxMana, ps.mana + (item.power || 40));
    } else if (item.effect === 'trap') {
      if (!ps.inventory) ps.inventory = {};
      ps.inventory.basic_trap = (ps.inventory.basic_trap || 0) + 1;
    }
    // dmgBuff: no-op server-side (transient buff state).
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // ═══ Cooking (raw fish -> cooked / burnt) ═══
  //
  // Client sends cook_request { fishKey, kind } when the cooking
  // minigame finishes.  Server validates the player actually holds the
  // raw fish, consumes 1, and applies the outcome:
  //   kind === 'cooked' -> +1 cooked_<fishKey>, +8 cooking XP
  //   kind === 'burnt'  -> +1 burnt_dust
  // Then persists + emits player_state so the client overwrites its
  // inventory + lifeSkills with the authoritative values.
  //
  // Trusts the client on `kind` (the minigame outcome).  Closing that
  // fully needs server-side minigame validation -- separate slice.
  //
  // v2.3.1104: rate-limited (P2 of docs/OPTIMIZATION-ROADMAP.md), same
  // posture as the Slice-18 harvest limit: the server can't simulate
  // the pan minigame, but it CAN bound the cadence.  Each cook takes
  // several seconds of minigame; 20/min (one per 3 s) is well above
  // legit play, so a script hammering cook_request to convert a fish
  // stockpile + farm cooking XP at inhuman speed gets throttled.
  // Excess requests are dropped WITHOUT consuming the fish, and we
  // echo player_state so the client's optimistic local outcome snaps
  // back to the authoritative inventory.
  _cookRateOk(ps) {
    const now = Date.now();
    if (!Array.isArray(ps._cookHistory)) ps._cookHistory = [];
    ps._cookHistory = ps._cookHistory.filter((t) => (now - t) < 60000);
    if (ps._cookHistory.length >= 20) return false;
    ps._cookHistory.push(now);
    return true;
  }

  _handleCookRequest(session, payload) {
    if (!session || !session.id) return;
    const { fishKey, kind } = payload || {};
    if (typeof fishKey !== 'string' || !fishKey.startsWith('fish_')) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (!this._cookRateOk(ps)) {
      const ws = this._wsBySessionId(session.id);
      if (ws) this._sendPlayerState(ws, session.id);
      return;
    }
    // v2.3.1146: anti-bot hourly cap + flip-gesture replay/presence
    // bookkeeping (botfp.js).  drop mirrors _cookRateOk's posture: the
    // fish is NOT consumed (we return before the decrement) and
    // player_state snaps the client's optimistic outcome back.
    const bot = this._botfpOnCook(session, ps, payload);
    if (bot.drop) {
      const ws = this._wsBySessionId(session.id);
      if (ws) this._sendPlayerState(ws, session.id);
      return;
    }
    if (!ps.inventory) ps.inventory = {};
    if ((ps.inventory[fishKey] || 0) <= 0) return;
    ps.inventory[fishKey] -= 1;
    if (ps.inventory[fishKey] <= 0) delete ps.inventory[fishKey];
    if (kind === 'cooked') {
      const cookedKey = 'cooked_' + fishKey;
      ps.inventory[cookedKey] = (ps.inventory[cookedKey] || 0) + 1;
      this._addLifeSkillXp(ps, 'cooking', 8);
    } else {
      ps.inventory.burnt_dust = (ps.inventory.burnt_dust || 0) + 1;
    }
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // Mirror of computeOpenDelay() in src/data/gameSystems.js, sans the
  // jitter sample -- returns the BASE delay so the validator can bound
  // the per-attempt window by base * (1 ± EXTRACT_JITTER).
  _computeOpenDelayBase(skillLevel, nodeTier) {
    const lvl = Number(skillLevel) || 0;
    const tier = Number(nodeTier) || 1;
    const gap = tier - lvl;
    let base;
    if (gap > 0) base = this.EXTRACT_OPEN_BASE + gap * 1200;
    else if (gap < 0) base = this.EXTRACT_OPEN_BASE + gap * 250;
    else base = this.EXTRACT_OPEN_BASE;
    return Math.max(this.EXTRACT_OPEN_MIN, Math.min(this.EXTRACT_OPEN_MAX, base));
  }

  // Sweep extraction entries past EXTRACTION_TIMEOUT_MS.  Walk-away
  // cancel is silent on the client -- the player just stops getting the
  // swipe cue; the server cleans up so the map doesn't grow unbounded.
  _sweepStaleExtractions(nowMs) {
    const cutoff = (nowMs || Date.now()) - this.EXTRACTION_TIMEOUT_MS;
    for (const sid of Object.keys(this.extractions)) {
      const e = this.extractions[sid];
      if (!e || e.startedAt < cutoff) delete this.extractions[sid];
    }
  }

  // Client sent extraction_start { nodeId, zone, skill } -- record what
  // we need to validate the eventual node_strike (the swipe-landed
  // event).  Server also captures skillLevel + nodeTier at the start so
  // a mid-attempt level-up doesn't shift the expected window.
  _handleExtractionStart(session, payload) {
    if (!session || !session.id) return;
    const { nodeId, zone, skill } = payload || {};
    if (!nodeId || !zone || !skill) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    const list = this.nodes[zone];
    if (!list) return;
    const n = list.find((x) => x.id === nodeId);
    if (!n || !n.alive) return;
    const skillLevel = (ps.lifeSkills && ps.lifeSkills[skill] && ps.lifeSkills[skill].level) || 0;
    const nodeTier = n.tierLvl || 1;
    this.extractions[session.id] = {
      nodeId, zone, skill,
      startedAt: Date.now(),
      skillLevel, nodeTier,
      openDelayBase: this._computeOpenDelayBase(skillLevel, nodeTier),
    };
  }

  _handleNodeStrike(session, payload) {
    if (!session || !session.id) return;
    const { id, zone, accuracy, swipeFp } = payload || {};
    if (!id || !zone) return;
    const list = this.nodes[zone];
    if (!list) return;
    const n = list.find((x) => x.id === id);
    if (!n || !n.alive) return;
    /* Position gate -- player must actually be near the node.  The
       client's minigame wouldn't open without proximity but a
       handcrafted node_strike would; check anyway. */
    const ps = this.playerState[session.id];
    if (!ps || ps.z !== zone || ps.dead || ps.disconnected) return;
    const dx = ps.x - n.x;
    const dy = ps.y - n.y;
    if (dx * dx + dy * dy > this.NODE_STRIKE_RANGE * this.NODE_STRIKE_RANGE) return;

    // ═══ Timing validation against the recorded extraction_start ═══
    //
    // Per v2.3.229 hand-off: the windowed-swipe loop tells us when the
    // attempt began so we can compute the same open-delay window the
    // client did.  If the strike arrives BEFORE the earliest jitter
    // bound, it's a cheat (no human swiped that fast).  If it arrives
    // AFTER the latest bound + window, it's a miss regardless of what
    // accuracy the client claimed.
    //
    // Permissive on missing extraction state (DO restart mid-attempt,
    // legacy clients): treat as a pre-v2.3.229 strike, skip the window
    // check, fall through to existing logic.  We log a counter for
    // visibility but don't reject.
    const now = Date.now();
    const ex = this.extractions[session.id];
    let coercedAccuracy = accuracy || 'good';
    let openLatencyMs = null;
    if (ex && ex.nodeId === id && ex.zone === zone) {
      const jitterLo = 1 - this.EXTRACT_JITTER;
      const jitterHi = 1 + this.EXTRACT_JITTER;
      const earliestOpen = ex.startedAt + Math.floor(ex.openDelayBase * jitterLo) - this.EXTRACTION_GRACE_MS;
      const latestClose  = ex.startedAt + Math.ceil(ex.openDelayBase * jitterHi) + this.EXTRACT_WINDOW_MS + this.EXTRACTION_GRACE_MS;
      if (now < earliestOpen) {
        // Too early -- impossibly fast swipe.  Drop the strike, leave
        // the node alive, leave extraction state so a legit follow-up
        // can still complete.
        if (!session._extractionRejects) session._extractionRejects = 0;
        session._extractionRejects++;
        return;
      }
      if (now > latestClose) {
        // Past the window -- whatever the client said, it was a miss.
        coercedAccuracy = 'miss';
      }
      // Latency telemetry: ms from earliest-possible-open to swipe.
      openLatencyMs = now - earliestOpen;
    } else if (!ex) {
      if (!session._extractionMissing) session._extractionMissing = 0;
      session._extractionMissing++;
    }
    // Extraction resolved (success or timeout) -- clear the state so a
    // fresh tap doesn't reuse stale timing.
    delete this.extractions[session.id];

    // swipeFp telemetry -- ring-buffered per session for offline
    // anomaly review.  v2.3.1146: now retains the FULL fingerprint
    // (tv/vc/h/n were captured by the client since v2.3.694 but dropped
    // here); the scoring itself lives in _botfpOnStrike below.
    if (swipeFp && typeof swipeFp === 'object' && coercedAccuracy === 'good') {
      if (!session._swipeFps) session._swipeFps = [];
      const fp = {
        ts: now,
        nodeId: id,
        len: Number(swipeFp.len) || 0,
        n: Number(swipeFp.n) || 0,
        ent: Number(swipeFp.ent) || 0,
        tv: Number(swipeFp.tv) || 0,
        vc: Number(swipeFp.vc) || 0,
        h: swipeFp.h != null ? String(swipeFp.h) : null,
        dur: Number(swipeFp.dur) || 0,
        latency: openLatencyMs,
      };
      session._swipeFps.push(fp);
      if (session._swipeFps.length > this.SWIPE_FP_CAP_PER_SESSION) {
        session._swipeFps.shift();
      }
    }
    if (openLatencyMs != null && coercedAccuracy === 'good') {
      if (!session._extractionLatencies) session._extractionLatencies = [];
      session._extractionLatencies.push(openLatencyMs);
      if (session._extractionLatencies.length > this.LATENCY_CAP_PER_SESSION) {
        session._extractionLatencies.shift();
      }
    }

    // Deplete the node + broadcast respawn regardless of outcome (the
    // client already consumed it visually on miss-timeout too).  Same
    // respawn timer either way.
    n.alive = false;
    n.respawnAt = Date.now() + this.NODE_RESPAWN_TIME;
    this._markNodeDirty(zone, n.id);

    // Miss path: no inventory, no XP, no shard, no harvest_credit.
    // Client already knows it missed (it sent accuracy:'miss') so the
    // node delta broadcast is enough.
    if (coercedAccuracy === 'miss') return;

    // v2.3.1146: behavioral anti-bot (botfp.js).  FLAG-ONLY per owner:
    // scores/flags never change gameplay; the two exceptions are the
    // forged-'perfect' entropy cap (bot.accuracy) and the §6 hourly cap
    // (grant:false -- node stays consumed, grant withheld, player_state
    // snaps the client's optimistic prediction back).  Counted on
    // GRANTED harvests only, so the cap is resources/hour as specced.
    const bot = this._botfpOnStrike(session, ps, {
      swipeFp, accuracy: coercedAccuracy,
      skill: this._harvestSkillName(n.nodeType), now,
    });
    if (!bot.grant) {
      const wsCap = this._wsBySessionId(session.id);
      if (wsCap) this._sendPlayerState(wsCap, session.id);
      return;
    }

    /* Apply the inventory grant server-side and persist.  Client used
       to do this in _applyFishingReward / _applyWoodReward /
       _applyMiningReward; now it just sends node_strike with the
       accuracy and waits for the player_state event we emit below.
       Slice 18: rate-limit 'perfect' claims so a cheater can't spam
       perfect-accuracy for the doubled yield + XP. */
    const ratedAccuracy = this._ratedHarvestAccuracy(ps, bot.accuracy);
    const invKey = this._harvestInvKey(n.nodeType, n.tierLvl);
    const yieldQty = this._harvestYieldMult(ratedAccuracy, n.nodeType);
    if (!ps.inventory) ps.inventory = {};
    ps.inventory[invKey] = (ps.inventory[invKey] || 0) + yieldQty;

    /* lifeSkill XP -- server applies the XP gain and detects level-up.
       Client used to do this via addLifeSkillXp(R.lifeSkills, ...);
       now it predicts the popup locally but the authoritative
       lifeSkills snapshot rides on the player_state event below. */
    const skillName = this._harvestSkillName(n.nodeType);
    const xpAmt = this._harvestXpForTier(n.tierLvl, ratedAccuracy);
    const { leveled, newLevel } = this._addLifeSkillXp(ps, skillName, xpAmt);

    /* Shard roll -- 33% per successful harvest.  Server-rolled so a
       modified client can't force shard drops.  Goes straight into
       inventory under shard_<zone> keyed off node.zone. */
    const shard = this._rollHarvestShard(n.zoneId || zone);
    if (shard) {
      ps.inventory[shard] = (ps.inventory[shard] || 0) + 1;
    }

    // v2.3.1120: gather-objective quest credit (trader_2 et al).  The
    // client never counted harvests at all -- its only _questKills
    // writers were the kill sites, which wrongly advanced this quest
    // on kills.  The player_state send below carries the new counter.
    this._creditQuestObjective(session.id, 'gather', null);

    this._saveRpg(session.id, ps);

    /* Push the new authoritative totals to the picker.  Same
       player_state event the loot path uses; client OVERWRITES
       R.coins / R.inventory / R.lifeSkills wholesale on receive. */
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      this._sendPlayerState(ws, session.id);
      /* Non-deterministic feedback the client can't predict on its
         own (shard roll outcome + level-up confirmation): private
         harvest_credit event so the client can fire the appropriate
         floating popups. */
      try {
        ws.send(JSON.stringify({
          type: 'harvest_credit',
          payload: {
            nodeId: id,
            zone,
            skillName,
            xpAmt,
            leveled,
            newLevel,
            shard,
          },
        }));
      } catch (e) {}
    }
  }

  // ═══ Server-authoritative loot ═══
  //
  // The worker owns the ground-loot list per zone.  When a monster
  // dies in _handleMonsterDamage, we compute the contribution-weighted
  // recipients (existing code) and ALSO push a pile object into
  // this.loot[zone] with the total gold, optional skull/shard, and the
  // recipients list.  Pickup is a client request (loot_pickup); the
  // server checks position + recipient + not-already-claimed and emits
  // a private loot_credit to the picker with their share.  Public
  // loot_claimed broadcasts visibility changes; loot_despawn finalises.
  _isRemnantSkullArch(arch) {
    return arch === 'fodder' || arch === 'snowman' || arch === 'fireGoblin' || arch === 'mummy' || arch === 'skeleton';
  }

  _rollShardForKill(zoneId) {
    if (Math.random() >= this.SHARD_DROP_RATE) return null;
    return 'shard_' + zoneId;
  }

  // ═══ Server-authoritative RPG state (coins + inventory) ═══
  //
  // The worker owns each player's coins and inventory.  Loot pickups
  // (and, in future slices, sales / harvest / quest grants) apply
  // increments here, persist to DO storage, and emit a player_state
  // event so the client mirrors the authoritative totals -- a modified
  // client overwriting R.coins locally gets stomped on the next sync.
  //
  // Bootstrap: on a player's first connection to this DO we don't have
  // their state yet, so we read rpgCoins/rpgInventory from the join
  // payload as the initial value.  Cheat surface (one-time, at first
  // connect only); after that the server is the source.

  _invKeyForSkull(skull) {
    if (skull === 'fodder') return 'slime-remnants';
    if (skull === 'fireGoblin') return 'fire-goblin-remnants';
    // Mummy and skeleton both stack into 'skeleton-remnants' (matches
    // the client's local-pickup mapping at BroTown.jsx ~9071).  Skeleton
    // is the runtime transform target of mummy; both map the same way.
    if (skull === 'mummy' || skull === 'skeleton') return 'skeleton-remnants';
    return skull;
  }

  async _loadRpg(playerId) {
    try {
      const stored = await this.state.storage.get('rpg:' + playerId);
      if (stored && this._healLifeSkills(stored)) {
        // self-heal corrupted records in place (see _healLifeSkills), then
        // persist so storage converges clean without a manual wipe.
        try { await this.state.storage.put('rpg:' + playerId, stored); } catch (e) { /* best-effort */ }
      }
      return stored || null;
    } catch (e) {
      return null;
    }
  }

  /* ═══ v2.3.1116: PERSISTENT IDENTITY (PR1 of the heavy-systems plan) ═══
   * The auth record lives in its OWN storage key ('auth:<id>'), NOT inside
   * the rpg blob -- _saveRpg rewrites the blob from a fixed field list and
   * would silently drop any extra field on the next save. */

  // SHA-256 hex of the passphrase, domain-separated with a version prefix
  // so the scheme can rotate ('btv2|...') without ambiguity.  The digest
  // is compared with === : a timing leak on a hash comparison doesn't help
  // recover a preimage, and the real online risk (join-spam brute force of
  // the ~6x10^8 phrase space) is handled by the lockout below.
  async _phraseHash(phrase) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('btv1|' + phrase));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async _verifyJoinAuth(id, phrase) {
    const now = Date.now();
    if (!this._authFails) this._authFails = new Map(); // in-memory: a deploy reset just clears lockouts
    const rec = this._authFails.get(id);
    if (rec && rec.until > now) return false; // lockout window active
    const auth = await this.state.storage.get('auth:' + id);
    if (!auth) {
      // Unregistered id.  Register when the client proves it owns a
      // phrase; otherwise allow as a legacy/guest throwaway.  Ids that
      // predate this slice (random per-pageload) are unknowable and
      // valueless, so grandfathering them unauthenticated is safe --
      // and every post-slice client sends a phrase, so real characters
      // get locked at their first join.
      if (phrase) {
        await this.state.storage.put('auth:' + id, { pfHash: await this._phraseHash(phrase), createdAt: now });
      }
      return true;
    }
    if (phrase && (await this._phraseHash(phrase)) === auth.pfHash) {
      this._authFails.delete(id);
      return true;
    }
    // Failed verify: count toward the brute-force lockout (5 fails ->
    // 60s).  Keyed by target id, so an attacker hammering someone's id
    // locks the ATTACK out; the owner's correct phrase clears it.
    const f = this._authFails.get(id) || { count: 0, until: 0 };
    f.count += 1;
    if (f.count >= 5) { f.until = now + 60000; f.count = 0; }
    this._authFails.set(id, f);
    return false;
  }

  /* ═══ v2.3.1116: PvP CONSENT (interim until the PR6 duel machine) ═══
   * A pair earns consent when the server RELAYS both halves of a
   * handshake: duel_request from A targeting B, then duel_accept from B
   * targeting A (or pvp_threat + accepted threat_response).  Each half
   * must arrive on its own sender's session, so neither side can forge
   * the other's consent.  In-memory on purpose: a worker deploy wiping
   * it just ends duels -- no value at risk (wagers are PR6 + storage). */
  _pvpPairKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

  // v2.3.1129: _observePvpConsent removed -- the last handshake it
  // covered (threats) moved to the threat machine (threat.js
  // _interceptThreat), which registers the consent pair itself.  It
  // was also dead in practice: it required payload.accepted, a field
  // the client's ThreatIncomingPanel never sent (it sends
  // action:'ignored'|'guards'), so threat consent was never granted.

  _pvpAllowed(attackerId, targetId, zone) {
    const zc = ZONES[zone];
    if (zc && zc.lawless) return true; // open-PvP wilderness (data.js flag)
    if (!this._pvpConsent) return false;
    const until = this._pvpConsent.get(this._pvpPairKey(attackerId, targetId));
    return !!(until && until > Date.now());
  }

  _clearPvpConsent(id) {
    if (this._pvpConsent) {
      for (const k of [...this._pvpConsent.keys()]) {
        if (k.split('|').includes(id)) this._pvpConsent.delete(k);
      }
    }
    if (this._pvpChallenges) {
      for (const k of [...this._pvpChallenges.keys()]) {
        if (k.split('>').includes(id)) this._pvpChallenges.delete(k);
      }
    }
  }

  /* ═══ v2.3.1117: INBOX + ESCROW PRIMITIVES (PR2 of the heavy-systems
   * plan; spec in docs/specs/inbox-escrow.md) ═══
   *
   * The settlement plumbing every economy system builds on: the
   * marketplace (PR3), trade sessions (PR4), and duel wagers (PR6) all
   * credit and debit players through these methods instead of trusting
   * the client to pay itself (the self-credit hole this plan retires).
   *
   * Storage layout -- all SEPARATE keys, never inside the rpg blob
   * (_saveRpg rewrites the blob from a fixed field list and would drop
   * foreign fields on the next save):
   *   inbox:<playerId>  array of pending credit entries (offline mail)
   *   oplog:<opId>      idempotency journal, ts value, pruned after 48h
   *
   * Concurrency: every method runs inside one DO event and only awaits
   * STORAGE ops, so input gates make each call a critical section.
   * Callers must keep the discipline rule: no cross-DO await between a
   * validation and the commit that depends on it. */

  // Idempotency journal.  Settlement callers pass a deterministic opId
  // (e.g. 'refund:<orderId>'); a retry after a crash or double-fire
  // finds the stamp and reports already-applied instead of paying twice.
  async _opSeen(opId) {
    if (!opId) return false;
    return (await this.state.storage.get('oplog:' + opId)) !== undefined;
  }

  async _opStamp(opId) {
    if (opId) await this.state.storage.put('oplog:' + opId, Date.now());
  }

  // Lazy prune, piggybacked on inbox drains and rate-limited to one
  // sweep per hour per DO lifetime -- there is no storage TTL, and 48h
  // is far beyond any legitimate retry window.
  async _opPruneMaybe() {
    const now = Date.now();
    if (this._lastOpPrune && now - this._lastOpPrune < 3600000) return;
    this._lastOpPrune = now;
    try {
      const entries = await this.state.storage.list({ prefix: 'oplog:' });
      for (const [k, ts] of entries) {
        if (typeof ts !== 'number' || now - ts > 172800000) await this.state.storage.delete(k);
      }
    } catch (e) { /* prune is best-effort */ }
  }

  /* Credit a player.  entry = { opId, source, kind, payload, note }:
   *   kind 'gold'   payload { amount }
   *   kind 'item'   payload { invKey, count }
   *   kind 'weapon' payload { weapon }   (opaque blob, sanitized on apply)
   * Online -> applied to live playerState immediately (+ inbox_delivered
   * notification).  Offline, or online with a full weapon stash -> parked
   * in inbox:<id> and drained at the next join.  Returns 'delivered' |
   * 'inboxed' | 'dup'. */
  async _creditPlayer(playerId, entry) {
    if (await this._opSeen(entry.opId)) return 'dup';
    await this._opStamp(entry.opId);
    const ps = this.playerState[playerId];
    if (ps && this._applyCreditToPs(ps, entry)) {
      this._saveRpg(playerId, ps);
      this._queuePlayerStateFlush(playerId);
      this._sendInboxDelivered(playerId, [entry], 0);
      return 'delivered';
    }
    await this._inboxAppend(playerId, entry);
    return 'inboxed';
  }

  // Apply one credit entry to a live playerState.  Returns false ONLY
  // when the entry must stay queued (weapon + full stash -- _saveRpg
  // truncates the stash at cap, so pushing past it would silently
  // DESTROY the weapon).  Malformed entries return true so a bad
  // payload can never wedge the inbox forever.
  _applyCreditToPs(ps, entry) {
    const p = entry.payload || {};
    if (entry.kind === 'gold') {
      ps.coins = Math.max(0, (ps.coins || 0) + Math.max(0, Math.floor(p.amount || 0)));
      return true;
    }
    if (entry.kind === 'item') {
      const k = typeof p.invKey === 'string' ? p.invKey : '';
      if (!k) return true;
      if (!ps.inventory) ps.inventory = {};
      ps.inventory[k] = (ps.inventory[k] || 0) + Math.max(1, Math.floor(p.count || 1));
      return true;
    }
    if (entry.kind === 'weapon') {
      const w = this._sanitizeWeapon(p.weapon);
      if (!w) return true;
      if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
      if (ps.weaponStash.length >= this.WEAPON_STASH_CAP) return false;
      ps.weaponStash.push(w);
      return true;
    }
    return true;
  }

  // Append to the offline inbox.  At the soft cap, gold and item
  // entries merge losslessly into an existing same-kind entry (gold:
  // amounts sum; items: counts sum per invKey) so bulk payouts can't
  // grow the box unboundedly.  Weapons can't merge; they still append
  // (dropping value is worse than storage growth, and the producers --
  // market listings, trades -- are themselves capped per player).
  async _inboxAppend(playerId, entry) {
    const key = 'inbox:' + playerId;
    const box = (await this.state.storage.get(key)) || [];
    if (box.length >= 200) {
      const p = entry.payload || {};
      if (entry.kind === 'gold') {
        const g = box.find((e) => e.kind === 'gold');
        if (g) {
          g.payload.amount = (g.payload.amount || 0) + Math.max(0, Math.floor(p.amount || 0));
          g.note = 'merged payouts';
          await this.state.storage.put(key, box);
          return;
        }
      }
      if (entry.kind === 'item' && typeof p.invKey === 'string') {
        const it = box.find((e) => e.kind === 'item' && e.payload && e.payload.invKey === p.invKey);
        if (it) {
          it.payload.count = (it.payload.count || 1) + Math.max(1, Math.floor(p.count || 1));
          it.note = 'merged payouts';
          await this.state.storage.put(key, box);
          return;
        }
      }
    }
    box.push({ opId: entry.opId, ts: Date.now(), source: entry.source || '', kind: entry.kind, payload: entry.payload, note: entry.note || '' });
    await this.state.storage.put(key, box);
  }

  // Drain the offline inbox into a freshly joined player.  Called from
  // the join handler AFTER the rpg load/bootstrap and BEFORE state_sync,
  // so the first snapshot the client renders already includes the mail.
  // Weapons that don't fit the stash stay queued for a later join.
  async _drainInbox(playerId, ws) {
    try {
      await this._opPruneMaybe();
      const key = 'inbox:' + playerId;
      const box = await this.state.storage.get(key);
      if (!box || !box.length) return;
      const ps = this.playerState[playerId];
      if (!ps) return;
      const delivered = [];
      const remainder = [];
      for (const entry of box) {
        if (this._applyCreditToPs(ps, entry)) delivered.push(entry);
        else remainder.push(entry);
      }
      if (remainder.length) await this.state.storage.put(key, remainder);
      else await this.state.storage.delete(key);
      if (delivered.length) {
        this._saveRpg(playerId, ps);
        this._sendInboxDelivered(playerId, delivered, remainder.length, ws);
      }
    } catch (e) { /* mail must never block a join */ }
  }

  _sendInboxDelivered(playerId, entries, queued, wsOverride) {
    const ws = wsOverride || this._wsBySessionId(playerId);
    if (!ws) return;
    try {
      ws.send(JSON.stringify({
        type: 'inbox_delivered',
        payload: {
          entries: entries.map((e) => ({ kind: e.kind, payload: e.payload, note: e.note || '', source: e.source || '' })),
          queued: queued || 0,
        },
      }));
    } catch (e) { /* dead socket: the credits are already persisted */ }
  }

  /* Escrow debits.  Validate-and-take in one gated event; online players
   * are debited on the LIVE playerState (storage lags it -- mutating the
   * blob for an online player would diverge memory and disk), offline
   * players on the stored blob directly.  A duplicate opId reports
   * { ok: true, dup: true } so settlement retries converge. */
  async _escrowDebitGold(playerId, amount, opId) {
    const amt = Math.floor(amount || 0);
    if (amt <= 0) return { ok: false, reason: 'bad_amount' };
    if (await this._opSeen(opId)) return { ok: true, dup: true };
    const ps = this.playerState[playerId];
    if (ps) {
      if ((ps.coins || 0) < amt) return { ok: false, reason: 'insufficient_gold' };
      await this._opStamp(opId);
      ps.coins -= amt;
      this._saveRpg(playerId, ps);
      this._queuePlayerStateFlush(playerId);
      return { ok: true };
    }
    const stored = await this._loadRpg(playerId);
    if (!stored || (stored.coins || 0) < amt) return { ok: false, reason: 'insufficient_gold' };
    await this._opStamp(opId);
    stored.coins -= amt;
    await this.state.storage.put('rpg:' + playerId, stored);
    return { ok: true };
  }

  async _escrowTakeItem(playerId, invKey, count, opId) {
    const k = typeof invKey === 'string' ? invKey : '';
    const c = Math.floor(count || 0);
    if (!k || c <= 0) return { ok: false, reason: 'bad_item' };
    if (await this._opSeen(opId)) return { ok: true, dup: true };
    const ps = this.playerState[playerId];
    if (ps) {
      if (!ps.inventory || (ps.inventory[k] || 0) < c) return { ok: false, reason: 'insufficient_items' };
      await this._opStamp(opId);
      ps.inventory[k] -= c;
      if (ps.inventory[k] <= 0) delete ps.inventory[k];
      this._saveRpg(playerId, ps);
      this._queuePlayerStateFlush(playerId);
      return { ok: true };
    }
    const stored = await this._loadRpg(playerId);
    if (!stored || !stored.inventory || (stored.inventory[k] || 0) < c) return { ok: false, reason: 'insufficient_items' };
    await this._opStamp(opId);
    stored.inventory[k] -= c;
    if (stored.inventory[k] <= 0) delete stored.inventory[k];
    await this.state.storage.put('rpg:' + playerId, stored);
    return { ok: true };
  }

  // v2.3.769: records bootstrapped from pre-fix clients carry lifeSkills
  // with ARRAYS object-spread into plain objects (pets: {0:..}) and null
  // into {} (activePet) -- the client-side merge bug that caused the
  // multiplayer corruption storm.  Heal the stored shape: pets back to an
  // array, empty-object activePet back to null.  Returns true if changed.
  _healLifeSkills(stored) {
    const ls = stored && stored.lifeSkills;
    if (!ls || typeof ls !== 'object') return false;
    let changed = false;
    if (ls.pets && !Array.isArray(ls.pets) && typeof ls.pets === 'object') {
      ls.pets = Object.values(ls.pets);
      changed = true;
    }
    if (ls.activePet && typeof ls.activePet === 'object' && Object.keys(ls.activePet).length === 0) {
      ls.activePet = null;
      changed = true;
    }
    return changed;
  }

  // Prune expired buff entries from ps._buffs.  _buffActive treats
  // past timestamps as inactive, but unpruned entries would otherwise
  // accumulate forever (each persisted to storage).  Called from
  // _saveRpg so pruning lands every time we persist.
  _pruneBuffs(ps) {
    if (!ps || !ps._buffs) return;
    const now = Date.now();
    for (const k of Object.keys(ps._buffs)) {
      if (typeof ps._buffs[k] !== 'number' || ps._buffs[k] <= now) {
        delete ps._buffs[k];
      }
    }
  }

  // v2.3.1021: weapon/defense SKILL-TRACK persistence (level / xp / unspent
  // points / channel allocations).  Previously these lived ONLY in the
  // browser's localStorage -- never saved server-side, loaded on join, or
  // echoed in player_state -- so a reconnect, device switch, or cache clear
  // reset a player's trained weapon-skill levels to 0.  Now the server is
  // the durable store: the client trains (awardWeaponXp) + spends locally and
  // reports via stats_update / the join payload; the server clamps + stores +
  // echoes.  Pure store-and-echo -- the only field that affects combat is
  // weaponSpecs, which keeps its own authoritative [0,99] clamp in
  // _handleStatsUpdate / _computeAttackDamage, so trusting client level/xp
  // here opens no damage exploit beyond what weaponSpecs already allows.
  static get _WEAPON_SKILL_CATS() { return ['sword', 'bow', 'staff']; }
  static get _DEFENSE_CHANNEL_KEYS() { return ['bulwark', 'ironskin', 'thorns', 'secondwind', 'poise']; }
  _sanitizeWeaponSkills(src) {
    const out = {};
    if (!src || typeof src !== 'object') return out;
    for (const cat of GameRoom._WEAPON_SKILL_CATS) {
      const s = src[cat];
      if (!s || typeof s !== 'object') continue;
      out[cat] = {
        level: Math.max(0, Math.min(99, Math.floor(Number(s.level) || 0))),
        xp: Math.max(0, Math.min(1e8, Number(s.xp) || 0)),
      };
    }
    return out;
  }
  _sanitizeWeaponUnspent(src) {
    const out = {};
    if (!src || typeof src !== 'object') return out;
    for (const cat of GameRoom._WEAPON_SKILL_CATS) {
      if (typeof src[cat] === 'number') out[cat] = Math.max(0, Math.min(999, Math.floor(src[cat])));
    }
    return out;
  }
  _sanitizeDefenseSkill(src) {
    if (!src || typeof src !== 'object') return { level: 0, xp: 0 };
    return {
      level: Math.max(0, Math.min(99, Math.floor(Number(src.level) || 0))),
      xp: Math.max(0, Math.min(1e8, Number(src.xp) || 0)),
    };
  }
  _sanitizeDefenseSpec(src) {
    const out = {};
    if (!src || typeof src !== 'object') return out;
    for (const k of GameRoom._DEFENSE_CHANNEL_KEYS) {
      if (typeof src[k] === 'number') out[k] = Math.max(0, Math.min(50, Math.floor(src[k])));
    }
    return out;
  }
  // Mirror of the WCH clamp in _handleStatsUpdate, factored out so the join /
  // migration paths apply the SAME [0,99] channel clamp (weaponSpecs feeds the
  // authoritative damage roll, so it can't be stored raw from a join payload).
  _sanitizeWeaponSpecs(src) {
    const WCH = {
      sword: ['edge', 'precision', 'executioner', 'tempo', 'cleave'],
      bow:   ['drawPower', 'marksmanship', 'headshot', 'piercing', 'longshot'],
      staff: ['spellPower', 'overload', 'detonation', 'attunement', 'focus'],
    };
    const out = {};
    if (!src || typeof src !== 'object') return out;
    for (const cat of Object.keys(WCH)) {
      const s = src[cat];
      if (!s || typeof s !== 'object') continue;
      out[cat] = {};
      for (const k of WCH[cat]) {
        if (typeof s[k] === 'number') out[cat][k] = Math.max(0, Math.min(99, Math.floor(s[k])));
      }
    }
    return out;
  }

  async _saveRpg(playerId, ps) {
    if (!playerId || !ps) return;
    this._pruneBuffs(ps);
    try {
      await this.state.storage.put('rpg:' + playerId, {
        coins: ps.coins || 0,
        inventory: ps.inventory || {},
        lifeSkills: ps.lifeSkills || {},
        level: ps.level || 1,
        xp: ps.xp || 0,
        unspentT2: ps.unspentT2 || 0,
        buildPointsThisLvl: ps.buildPointsThisLvl || 0,
        hp: typeof ps.hp === 'number' ? ps.hp : 100,
        maxHp: typeof ps.maxHp === 'number' ? ps.maxHp : 100,
        stamina: typeof ps.stamina === 'number' ? ps.stamina : 100,
        maxStamina: typeof ps.maxStamina === 'number' ? ps.maxStamina : 100,
        mana: typeof ps.mana === 'number' ? ps.mana : 100,
        maxMana: typeof ps.maxMana === 'number' ? ps.maxMana : 100,
        // Raw stats (clamped to per-level cap by _handleStatsUpdate).
        // Persisted so reconnects don't bootstrap from a freshly-spoofed
        // join payload.  Cheater would need to re-cheat through the
        // clamp on every stats_update.
        power: ps.power || 0,
        vitality: ps.vitality || 0,
        endurance: ps.endurance || 0,
        agility: ps.agility || 0,
        mind: ps.mind || 0,
        ferocity: ps.ferocity || 0,
        elementalMastery: ps.elementalMastery || 0,
        fortification: ps.fortification || 0,
        restoration: ps.restoration || 0,
        influence: ps.influence || 0,
        // Active food buff timers (endsAt timestamps).  Persisted so
        // they survive reconnect.  Expired entries get pruned lazily
        // by _buffActive checks; no need to clean on save.
        _buffs: ps._buffs || {},
        // Equipment slots.  Stored as opaque objects the client
        // provided; server doesn't compute weapon stats from these
        // yet (separate slice).  Validating ownership on sell /
        // marketplace flows is the immediate cheat closure.
        weapon: ps.weapon || null,
        rangedWeapon: ps.rangedWeapon || null,
        staffWeapon: ps.staffWeapon || null,
        activeSlot: ps.activeSlot || 'melee',
        armor: ps.armor || null,
        shield: ps.shield || null,
        amulet: ps.amulet || null,
        weaponStash: Array.isArray(ps.weaponStash) ? ps.weaponStash.slice(0, this.WEAPON_STASH_CAP) : [],
        // Quest state (slice 17).  Chain progression + flags +
        // kill counters.  Server validates accept/turn-in state
        // transitions but currently trusts the client's claim
        // that the underlying criteria are met -- see comments
        // on _handleQuestAccept / _handleQuestTurnIn.
        _quests: ps._quests || {},
        _questFlags: ps._questFlags || {},
        _questKills: ps._questKills || {},
        achievementPoints: ps.achievementPoints || 0,
        // Slice 18 rate-limit history.  Persisted so a cheater
        // can't reset the 60-second window by reconnecting (which
        // would otherwise let them claim 'perfect' indefinitely
        // by cycling the WS connection between batches).
        _perfectHistory: Array.isArray(ps._perfectHistory) ? ps._perfectHistory : [],
        // v2.3.1104: cook rate-limit history, same reconnect-cycling
        // rationale as _perfectHistory above.
        _cookHistory: Array.isArray(ps._cookHistory) ? ps._cookHistory : [],
        // v2.3.1021: weapon/defense skill track -- durable now (was localStorage-only).
        weaponSkills: ps.weaponSkills || {},
        weaponUnspent: ps.weaponUnspent || {},
        weaponSpecs: ps.weaponSpecs || {},
        defenseSkill: ps.defenseSkill || { level: 0, xp: 0 },
        defenseUnspent: ps.defenseUnspent || 0,
        defenseSpec: ps.defenseSpec || {},
      });
    } catch (e) {}
  }

  // Queue a player_state emit for the next tick flush.  Used by
  // tick-path mutators (regen, monster attack, respawn, combat XP)
  // to coalesce multiple per-tick mutations into one wire emit per
  // affected player.  Action handlers (eat / shop / forge / etc.)
  // still call _sendPlayerState directly for immediate response.
  _queuePlayerStateFlush(playerId) {
    if (playerId) this.pendingPlayerStateFlush.add(playerId);
  }

  _flushPendingPlayerStates() {
    if (this.pendingPlayerStateFlush.size === 0) return;
    for (const id of this.pendingPlayerStateFlush) {
      const ws = this._wsBySessionId(id);
      if (ws) this._sendPlayerState(ws, id);
    }
    this.pendingPlayerStateFlush.clear();
  }

  _sendPlayerState(ws, playerId) {
    const ps = this.playerState[playerId];
    if (!ps || !ws) return;
    try {
      const full = {
          coins: ps.coins || 0,
          inventory: ps.inventory || {},
          lifeSkills: ps.lifeSkills || {},
          level: ps.level || 1,
          xp: ps.xp || 0,
          unspentT2: ps.unspentT2 || 0,
          buildPointsThisLvl: ps.buildPointsThisLvl || 0,
          hp: typeof ps.hp === 'number' ? ps.hp : (ps.maxHp || 100),
          maxHp: typeof ps.maxHp === 'number' ? ps.maxHp : 100,
          stamina: typeof ps.stamina === 'number' ? ps.stamina : (ps.maxStamina || 100),
          maxStamina: typeof ps.maxStamina === 'number' ? ps.maxStamina : 100,
          mana: typeof ps.mana === 'number' ? ps.mana : (ps.maxMana || 100),
          maxMana: typeof ps.maxMana === 'number' ? ps.maxMana : 100,
          // Active food buff timers.  Client renders the buff icons +
          // computes its own multipliers; server's view is authoritative
          // for the timer (cheater can't extend by writing _dmgBuff =
          // Infinity locally, since the next player_state clobbers).
          _buffs: ps._buffs || {},
          // Equipment slots.  Worker is authoritative for ownership;
          // client renders from these on player_state arrival.
          weapon: ps.weapon || null,
          rangedWeapon: ps.rangedWeapon || null,
          staffWeapon: ps.staffWeapon || null,
          activeSlot: ps.activeSlot || 'melee',
          armor: ps.armor || null,
          shield: ps.shield || null,
          amulet: ps.amulet || null,
          weaponStash: Array.isArray(ps.weaponStash) ? ps.weaponStash.slice(0, this.WEAPON_STASH_CAP) : [],
          // Quest state mirror (slice 17).
          _quests: ps._quests || {},
          _questFlags: ps._questFlags || {},
          _questKills: ps._questKills || {},
          achievementPoints: ps.achievementPoints || 0,
          // v2.3.1021: weapon/defense skill track echoed so a reconnecting
          // client restores its trained levels / points / channels instead
          // of falling back to the localStorage copy (which a device switch
          // or cache clear loses).
          weaponSkills: ps.weaponSkills || {},
          weaponUnspent: ps.weaponUnspent || {},
          weaponSpecs: ps.weaponSpecs || {},
          defenseSkill: ps.defenseSkill || { level: 0, xp: 0 },
          defenseUnspent: ps.defenseUnspent || 0,
          defenseSpec: ps.defenseSpec || {},
      };
      const session = this.sessions.get(ws);
      let payload = full;
      if (session && session.protocolVersion === 2) {
        // Protocol v2 delta: send only fields changed since the last
        // emit on this session.  The client's player_state handler
        // already merges field-by-field (presence-gated), so a partial
        // payload lands cleanly.  Cache holds JSON-stringified field
        // values so nested objects (inventory / _buffs / equipment)
        // compare by content, not identity.  First emit after join
        // sends everything (cache starts empty); a reconnect gets a
        // fresh session object, so the bootstrap sync stays full.
        const cache = session.lastPlayerStateSent || (session.lastPlayerStateSent = {});
        payload = {};
        let changed = 0;
        for (const k of Object.keys(full)) {
          const s = JSON.stringify(full[k]);
          if (cache[k] !== s) {
            cache[k] = s;
            payload[k] = full[k];
            changed++;
          }
        }
        if (changed === 0) return; // nothing changed -- skip the emit
      }
      ws.send(JSON.stringify({ type: 'player_state', payload }));
    } catch (e) {}
  }

  // ═══ HP store + damage application (server-authoritative) ═══
  //
  // Server owns current hp; clamps to [0, maxHp].  Damage flows through
  // Per docs/specs/t1-t2-stat-redesign-server.md:
  //   - Phase 1: `def` reduction retired -- armor now folds into maxHp
  //     via _armorHp, no per-hit damage reduction.  Resist cooking buff
  //     still applies (separate mechanic).
  //   - Phase 4: Agility rolls a per-hit passive dodge, capped at 30%.
  //     A successful roll zeros the hit; the caller emits a dodged: true
  //     event so the client can render the popup.
  //   - Phase 2: Full block invuln stays for the monster→player path
  //     (caller short-circuits when blocking) and is enforced here via
  //     isBlock=true (PvP partial-block path callers can opt in).
  //
  // Returns { dmgTaken, dodged } -- dmgTaken is 0 for both block and
  // dodge, dodged disambiguates so the caller can route to the right
  // popup.
  _applyDamage(ps, rawDmg, isBlock) {
    if (!ps) return { dmgTaken: 0, dodged: false, graced: false };
    const r = Math.max(1, Math.round(rawDmg || 0));
    // Zone-entry damage immunity (replaces the prior monster-shove on
    // zone entry).  Short grace window after the player drops into a
    // combat zone so they can orient before hits land.  Returns
    // graced:true so the caller can still track the would-be damage
    // into dmgFromMonster -- otherwise the player kills the monster
    // before any hits register and lifesteal silently produces
    // reason:'no-this-mon' on the kill.
    if (ps._zoneEntryGraceUntil && Date.now() < ps._zoneEntryGraceUntil) {
      return { dmgTaken: 0, dodged: false, graced: true, dmgIntent: r };
    }
    if (isBlock) {
      ps.lastDamageAt = Date.now();
      return { dmgTaken: 0, dodged: false };
    }
    // Phase 4: Agility passive dodge roll.  Cap 30% so pure-Agility
    // builds still eat ~70% of hits.
    const dodgePct = Math.min((ps.agility || 0) * 0.0008, 0.30);
    if (Math.random() < dodgePct) {
      ps.lastDamageAt = Date.now();
      return { dmgTaken: 0, dodged: true };
    }
    let dmgTaken = Math.max(1, r);  // def reduction removed (Phase 1)
    // Resist buff (cooking recipe with buff:'resist', power 0.05 = 5%
    // reduction).  Cooking recipe power values are stored as the
    // fractional reduction; mirror the client's intent here.
    if (this._buffActive(ps, 'resist')) {
      dmgTaken = Math.max(1, Math.ceil(dmgTaken * (1 - 0.05)));
    }
    // v2.3.1113: Iron Skin (defense channel, -0.5%/pt, cap -25%) -- mirror
    // of applyIronSkin in src/data/gameSystems.js.  ps.defenseSpec is
    // client-trained but server-clamped [0,50] via _sanitizeDefenseSpec,
    // so the cut is bounded.  Part of the defense-loop revival: the
    // channel existed since v2.3.1021 but was never consumed anywhere.
    const _ironskin = (ps.defenseSpec && ps.defenseSpec.ironskin) || 0;
    if (_ironskin > 0) {
      dmgTaken = Math.max(1, Math.round(dmgTaken * (1 - Math.min(0.25, _ironskin * 0.005))));
    }
    if (typeof ps.maxHp !== 'number') ps.maxHp = 100;
    if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
    ps.hp = Math.max(0, ps.hp - dmgTaken);
    ps.lastDamageAt = Date.now();
    // v2.3.1137: SECOND WIND — after SURVIVING an unblocked hit, heal
    // 1% of maxHp per point (cap 50% at the [0,50] defenseSpec clamp)
    // on a 10s internal cooldown.  1%/pt, not 0.5: the balance-sim DF-02
    // gate prices 50 pts vs a band-brute at ~+27% EHP, inside Iron
    // Skin's +33% yardstick band (0.5%/pt bought only +12%).  Never
    // fires on the lethal hit (hp 0 routes to the death flow untouched).
    // Applies to monster AND PvP damage — that's the channel's identity.
    // _secondWindReadyAt is in-memory only (rule 11): a DO restart just
    // re-arms it.
    let secondWind = 0;
    const _sw = (ps.defenseSpec && ps.defenseSpec.secondwind) || 0;
    if (ps.hp > 0 && _sw > 0) {
      const _nowSw = Date.now();
      if (!ps._secondWindReadyAt || _nowSw >= ps._secondWindReadyAt) {
        secondWind = Math.round((ps.maxHp || 100) * Math.min(0.50, _sw * 0.01));
        if (secondWind > 0) {
          ps.hp = Math.min(ps.maxHp, ps.hp + secondWind);
          ps._secondWindReadyAt = _nowSw + 10000;
        }
      }
    }
    return { dmgTaken, dodged: false, secondWind };
  }

  // ═══ Melee lifesteal (per docs/specs/lifesteal-server.md) ═══
  //
  // Track net damage each monster has dealt to a player; on a melee
  // kill, refund 90% of that accumulated amount as healing.  Only
  // melee kills qualify (ranged/staff use a separate vitality-progress
  // path, not health).  Ephemeral session state -- not persisted.
  _trackMonsterDamage(ps, monsterId, amount) {
    if (!ps || !monsterId || !(amount > 0)) return;
    if (!ps.dmgFromMonster) ps.dmgFromMonster = {};
    ps.dmgFromMonster[monsterId] = (ps.dmgFromMonster[monsterId] || 0) + amount;
  }

  // slotOverride: if the client passed an explicit slot in monster_damage
  // (the slot the killing hit was actually struck with), trust that
  // over ps.activeSlot.  ps.activeSlot only updates when the client
  // sends set_active_slot, which the desktop slot-select UI skips --
  // a stale 'ranged' value there silently kills lifesteal for what the
  // player sees as a melee swing.
  //
  // Returns { refund, reason }.  reason is one of:
  //   'ok'           — heal applied, refund > 0
  //   'no-ps'        — attackerPs missing (player disconnected mid-kill)
  //   'not-melee'    — slot resolved to ranged/staff (denied by design)
  //   'no-damage'    — dmgFromMonster map empty (player took no damage from any monster)
  //   'no-this-mon'  — player took damage but not from this specific monster
  // Caller can use reason to surface debug info in the lifesteal_credit
  // event so a "no heal" outcome is diagnosable.
  _applyMeleeLifesteal(ps, monsterId, slotOverride) {
    if (!ps || !monsterId) return { refund: 0, reason: 'no-ps' };
    const slot = slotOverride || ps.activeSlot || 'melee';
    if (slot !== 'melee') return { refund: 0, reason: 'not-melee' };
    if (!ps.dmgFromMonster) return { refund: 0, reason: 'no-damage' };
    const taken = ps.dmgFromMonster[monsterId] || 0;
    if (taken <= 0) return { refund: 0, reason: 'no-this-mon' };
    const refund = Math.ceil(taken * 0.9);
    const maxHp = ps.maxHp || 100;
    ps.hp = Math.min(maxHp, (ps.hp || 0) + refund);
    delete ps.dmgFromMonster[monsterId];
    return { refund, reason: 'ok' };
  }

  // Apply stats_update payload to playerState.  Client sends after
  // every recalcDerived (BroTown.jsx mutation sites listed in the plan).
  // Clamps current hp to the new maxHp so re-derives that shrink the
  // pool don't leave hp > maxHp.
  // ═══ Stat validation (clamp raw stats to per-level cap) ═══
  //
  // Without this, a client could push stats_update { maxHp: 99999 } and
  // the worker would believe it -- effectively giving themselves an
  // infinite HP bar.  We close this by tracking the 10 raw stats
  // (vit / end / mind / power / etc.) ourselves, clamping each to a
  // per-level cap, and computing maxHp / maxStamina / maxMana from the
  // formulas in src/data/gameSystems.js (calcMaxHp / Stam / Mana).
  //
  // Cap formula: level * 10 + 20.  Each level grants 5 T2 stat points
  // (one stat could legitimately reach level*5+1 just from T2), plus
  // T1 use-trained increments, plus amulet stat bonuses.  level*10+20
  // is ~2x the realistic per-stat ceiling -- generous enough for legit
  // play (preserves T1 + amulet contributions), tight enough to block
  // R.vit = 99999 cheats.
  //
  // Client's pushed maxHp / maxStamina / maxMana are IGNORED -- the
  // worker computes its own from the clamped raw stats.
  _statCap(level) {
    return Math.max(20, (level || 1) * 10 + 20);
  }

  _clampStat(value, level) {
    const cap = this._statCap(level);
    return Math.max(0, Math.min(cap, Math.floor(value || 0)));
  }

  _calcMaxHp(level, vitality) {
    // v2.3.910: flat per-combat-level HP 12 -> 2.5 (mirrors the client
    // HP_PER_COMBAT_LEVEL in gameSystems.js) because combat level now climbs
    // ~5x faster -- it is the sum of the build-skill levels.
    return Math.floor(100 + ((level || 1) - 1) * 2.5 + (vitality || 0) * 10);
  }

  // Armor HP contribution -- mirrors getArmorHp() in
  // src/data/gameSystems.js per docs/specs/t1-t2-stat-redesign-server.md.
  // Phase 1: armor went from damage-reduction (def) to flat-HP.
  // tierMult is clamped to a defensive ceiling (8) so a forged-shape
  // armor with `tierMult: 999` can't inflate maxHp out of bounds.
  _armorHp(armor, vitality) {
    if (!armor) return 0;
    const ARMOR_HP_BASE = 20;
    const ARMOR_TIER_MULT_CAP = 8;  // legit armor tops out around 6×
    const tmRaw = (typeof armor.tierMult === 'number' && armor.tierMult > 0) ? armor.tierMult : 1.0;
    const tm = Math.min(ARMOR_TIER_MULT_CAP, tmRaw);
    return Math.floor(ARMOR_HP_BASE * tm * (1 + (vitality || 0) * 0.01));
  }

  _calcMaxStamina(endurance) {
    return Math.floor(100 + (endurance || 0) * 3);
  }

  _calcMaxMana(mind) {
    return Math.floor(100 + (mind || 0) * 3.5);
  }

  _recomputeMaxes(ps) {
    if (!ps) return;
    // v2.3.910: combat level is DERIVED -- the sum of the use-trained
    // build-skill levels, clamped to 500.  Mirrors recalcDerived on the
    // client and replaces the old 5-build-point gate.
    // v2.3.1138: + defenseSkill.level (the 6th skill; spec Phase 2).
    // Trust posture: defenseSkill is client-trained-but-clamped [0,99]
    // (_sanitizeDefenseSkill), same known-loose class as weaponSkills --
    // a forged claim buys <= +99 level (~ +247 maxHp).  Documented, not
    // fixed here; tightens when training moves fully server-side.
    ps.level = Math.max(1, Math.min(500,
      (ps.power || 0) + (ps.vitality || 0) + (ps.endurance || 0)
      + (ps.agility || 0) + (ps.mind || 0)
      + ((ps.defenseSkill && ps.defenseSkill.level) || 0)));
    const lvl = ps.level;
    const oldMaxHp = ps.maxHp || 100;
    const oldMaxStam = ps.maxStamina || 100;
    const oldMaxMana = ps.maxMana || 100;
    ps.maxHp = this._calcMaxHp(lvl, ps.vitality || 0) + this._armorHp(ps.armor, ps.vitality || 0);
    ps.maxStamina = this._calcMaxStamina(ps.endurance || 0);
    ps.maxMana = this._calcMaxMana(ps.mind || 0);
    // Clamp current values into the new ranges.
    if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
    ps.hp = Math.min(ps.hp, ps.maxHp);
    if (typeof ps.stamina !== 'number') ps.stamina = ps.maxStamina;
    ps.stamina = Math.min(ps.stamina, ps.maxStamina);
    if (typeof ps.mana !== 'number') ps.mana = ps.maxMana;
    ps.mana = Math.min(ps.mana, ps.maxMana);
  }

  _handleStatsUpdate(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    const lvl = ps.level || 1;
    // Raw stats: accept client value, clamp to bounds.  T1 stats use
    // the per-level cap (max(20, level*10+20)) since they grow via
    // use-training.  T2 stats are allocated from the unspentT2 pool
    // and per the T1/T2 stat redesign spec are capped at 99 regardless
    // of level.  Server computes its own pool maxes from these and
    // ignores any maxHp / maxStamina / maxMana the client tries to push.
    const T1_STATS = ['power', 'vitality', 'endurance', 'agility', 'mind'];
    const T2_STATS = ['ferocity', 'elementalMastery', 'fortification', 'restoration', 'influence'];
    const T2_CAP = 99;
    let statsChanged = false;
    for (const s of T1_STATS) {
      if (typeof payload[s] === 'number') {
        const clamped = this._clampStat(payload[s], lvl);
        if (ps[s] !== clamped) {
          ps[s] = clamped;
          statsChanged = true;
        }
      }
    }
    for (const s of T2_STATS) {
      if (typeof payload[s] === 'number') {
        const clamped = Math.max(0, Math.min(T2_CAP, Math.floor(payload[s])));
        if (ps[s] !== clamped) {
          ps[s] = clamped;
          statsChanged = true;
        }
      }
    }
    // v2.3.912: per-weapon-category build channels.  Client-trusted-but-clamped
    // (same posture as the T1 stats above): copy the known channel keys per
    // category, each clamped to [0,99] (mirror WEAPON_CHANNEL_CAP), so the
    // damage + crit channels in _computeAttackDamage are server-authoritative.
    if (payload.weaponSpecs && typeof payload.weaponSpecs === 'object') {
      const WCH = {
        sword: ['edge', 'precision', 'executioner', 'tempo', 'cleave'],
        bow:   ['drawPower', 'marksmanship', 'headshot', 'piercing', 'longshot'],
        staff: ['spellPower', 'overload', 'detonation', 'attunement', 'focus'],
      };
      if (!ps.weaponSpecs) ps.weaponSpecs = {};
      for (const cat of Object.keys(WCH)) {
        const src = payload.weaponSpecs[cat];
        if (!src || typeof src !== 'object') continue;
        if (!ps.weaponSpecs[cat]) ps.weaponSpecs[cat] = {};
        for (const k of WCH[cat]) {
          if (typeof src[k] === 'number') {
            const c = Math.max(0, Math.min(99, Math.floor(src[k])));
            if (ps.weaponSpecs[cat][k] !== c) { ps.weaponSpecs[cat][k] = c; statsChanged = true; }
          }
        }
      }
    }
    // v2.3.1021: weapon/defense SKILL TRACK (level / xp / unspent points and
    // the defense channels).  Pure persistence -- client-trained, the server
    // just stores the reported value (sanitized) so it survives reconnect.
    // These don't feed _recomputeMaxes, so they don't toggle statsChanged
    // (no pool refill); _saveRpg below persists them regardless.
    if (payload.weaponSkills && typeof payload.weaponSkills === 'object') {
      ps.weaponSkills = this._sanitizeWeaponSkills(payload.weaponSkills);
    }
    if (payload.weaponUnspent && typeof payload.weaponUnspent === 'object') {
      ps.weaponUnspent = this._sanitizeWeaponUnspent(payload.weaponUnspent);
    }
    if (payload.defenseSkill && typeof payload.defenseSkill === 'object') {
      ps.defenseSkill = this._sanitizeDefenseSkill(payload.defenseSkill);
    }
    if (typeof payload.defenseUnspent === 'number') {
      ps.defenseUnspent = Math.max(0, Math.min(999, Math.floor(payload.defenseUnspent)));
    }
    if (payload.defenseSpec && typeof payload.defenseSpec === 'object') {
      ps.defenseSpec = this._sanitizeDefenseSpec(payload.defenseSpec);
    }
    // Armor swap routes through stats_update (not equip_request) because
    // armor lives in a client-only armorStash and the popup mutates it
    // locally before pushing.  Worker accepts the new armor object (or
    // null on unequip), clamps tierMult defensively, recomputes maxHp.
    // Without this, the worker's ps.armor stays stale, its echoed
    // player_state re-applies the old armor on the client, and the
    // local unequip silently undoes itself.
    if ('armor' in payload) {
      const incoming = payload.armor;
      let newArmor = null;
      if (incoming && typeof incoming === 'object' && incoming.name !== 'Leather Armor') {
        // Shallow copy + clamp tierMult.  Mirror the cap from _armorHp
        // so a forged blob with tierMult: 999 can't inflate maxHp.
        // Leather Armor rejected outright per v2.3.249 removal.
        newArmor = { ...incoming };
        if (typeof newArmor.tierMult === 'number') {
          newArmor.tierMult = Math.max(0, Math.min(8, newArmor.tierMult));
        }
      }
      // JSON-compare so an identical re-send doesn't trigger spurious
      // recompute + flush.
      const oldSig = ps.armor ? JSON.stringify(ps.armor) : 'null';
      const newSig = newArmor ? JSON.stringify(newArmor) : 'null';
      if (oldSig !== newSig) {
        // v2.3.1129: guard gear lock -- reject the swap; the
        // player_state echo from the gate snaps the client's local
        // armorStash mutation back (see the comment block above: the
        // echo re-applying ps.armor is exactly the documented
        // self-correction behavior).
        if (this._threatGearLocked(session.id, ps)) {
          // locked: keep the old armor
        } else {
          ps.armor = newArmor;
          statsChanged = true;
        }
      }
    }
    if (statsChanged) {
      // v2.3.910: stats grew -> derived combat level may have risen; refill
      // pools on a gain so a level-up restores HP/stamina/mana as before.
      const prevLevel = ps.level || 1;
      this._recomputeMaxes(ps);
      if ((ps.level || 1) > prevLevel) {
        if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
        if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
        if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
      }
    }
    // Session-only equipment-derived values flow from client but are
    // capped to per-level bounds.  Without a cap, a cheater can push
    // def: 999999 and take 1 damage forever (since _applyDamage's
    // `max(1, ceil(r - def * 0.3))` floors at 1).  Same risk for
    // amulet regen mults (60k HP/regen tick).
    //
    // def cap: max armor tier mult is 5 + endurance contribution. At
    // level N, max endurance = level*10+20, contributing 0.5x.  Max
    // armor.tierMult = 5, contributing 3x.  So legit max def = (level*10+20)*0.5 + 15.
    // Cap at 4x that to leave headroom for unknown equipment additions.
    const defCap = lvl * 20 + 100;
    if (typeof payload.def === 'number') {
      ps.def = Math.max(0, Math.min(defCap, payload.def));
    }
    // Amulet regen mults are percentages.  Real amulets cap around 30%
    // per tier; 100% is double, well above any realistic stack.
    if (typeof payload.amuletHpRegen === 'number') {
      ps.amuletHpRegen = Math.max(0, Math.min(100, payload.amuletHpRegen));
    }
    if (typeof payload.amuletStaminaRegen === 'number') {
      ps.amuletStaminaRegen = Math.max(0, Math.min(100, payload.amuletStaminaRegen));
    }
    // Persist (raw stats + pool values get carried via _saveRpg).
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // ═══ Ability cost gating (server-authoritative stamina / mana) ═══
  //
  // Client sends ability_use { type, tier? } when the player triggers
  // a stamina-/mana-costing action.  Server computes the cost from
  // ps.maxStamina / hardcoded swipe ramp (mirrors client constants),
  // validates sufficient pool, deducts, and emits player_state.  A
  // separate ability_rejected event flies back when the pool is empty
  // so the client can surface "Not enough stamina!" without waiting on
  // the player_state diff.
  //
  // Closes the "infinite-dodge" / "infinite-stamina write" cheat:
  // server is the only writer for ps.stamina/mana, so a modified
  // client that sets R.stamina = 99999 gets stomped on the next
  // player_state.  Client still predicts the deduction locally for
  // snappy UX (the dash animates immediately); server's value wins.
  _abilityCost(ps, type, tier) {
    if (!ps) return 0;
    if (type === 'dodge')   return Math.ceil((ps.maxStamina || 100) * 0.20);
    if (type === 'lunge')   return Math.ceil((ps.maxStamina || 100) * 0.25);
    if (type === 'retreat') return Math.ceil((ps.maxStamina || 100) * 0.20);
    // Swipe (special attack): v2.3.172+ the client HUD shows MP as a
    // 5-segment charge meter where each segment funds exactly one
    // special, so cost MUST be maxMana / 5 to keep the contract.
    // payload.tier still rides the wire for back-compat but no longer
    // affects cost (it still scales DAMAGE client-side via
    // SPECIAL_ATK_MULT).
    if (type === 'swipe')   return Math.floor((ps.maxMana || 100) / 5);
    return 0;
  }

  _abilityPool(type) {
    if (type === 'swipe') return 'mana';
    return 'stamina';
  }

  _handleAbilityUse(session, payload) {
    if (!session || !session.id) return;
    const { type, tier } = payload || {};
    if (type !== 'dodge' && type !== 'lunge' && type !== 'retreat' && type !== 'swipe') return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    const cost = this._abilityCost(ps, type, tier);
    const pool = this._abilityPool(type);
    const have = (pool === 'mana') ? (ps.mana || 0) : (ps.stamina || 0);
    const ws = this._wsBySessionId(session.id);
    if (have < cost) {
      if (ws) {
        try {
          ws.send(JSON.stringify({
            type: 'ability_rejected',
            payload: { type, pool, cost, have },
          }));
        } catch (e) {}
      }
      return;
    }
    if (pool === 'mana') {
      ps.mana = Math.max(0, have - cost);
    } else {
      ps.stamina = Math.max(0, have - cost);
    }
    this._saveRpg(session.id, ps);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  // Player death.  Marks the player as dying for the respawn window;
  // _tickPlayerRespawn flips them back when respawnAt elapses.
  _handlePlayerDeath(ps, playerId, cause) {
    if (!ps || ps.dying) return;
    ps.dying = true;
    ps.dead = true;
    ps.respawnAt = Date.now() + 5000;
    ps.dmgFromMonster = {};
    // v2.3.1121: resolve any active duel FIRST -- a clean duel kill
    // (cause 'pvp:<opponent>') pays the pot to the winner and is
    // protected: no death pile, no inventory wipe, per the promise the
    // duel popup makes ("No item loss").  Any other death mid-duel
    // (monster, environment) still forfeits the pot but dies normally.
    const _duelKill = this._duelOnDeath(playerId, cause);
    // v2.3.1125: clan-war scoring rides the same server-resolved death
    // (cause 'pvp:<attacker>'); duel kills are excluded inside the hook.
    this._warOnDeath(playerId, cause);
    // v2.3.1116: death ends any remaining threat consent this player
    // was party to -- the survivor can't keep hitting them through the
    // respawn.  (Duel pairs already cleared by the resolution above.)
    this._clearPvpConsent(playerId);
    if (!_duelKill) {
      // Spawn a pickable death pile at the death location carrying the
      // player's entire general inventory (mummy remains, fish, wood,
      // etc.).  Equipped loadout (weapon / rangedWeapon / staffWeapon /
      // armor / shield / amulet) and weaponStash are NOT included.
      // Anyone in the zone can pick the pile up; despawns after 60 s.
      // Spawn BEFORE the inventory wipe so we capture the items.
      this._spawnDeathPile(ps, playerId);
      ps.inventory = {};
    }
    this._saveRpg(playerId, ps);
    this._queuePlayerStateFlush(playerId);
    const ws = this._wsBySessionId(playerId);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'player_died',
          payload: { cause: cause || 'unknown', respawnInMs: 5000 },
        }));
      } catch (e) {}
    }
  }

  // Walk active players for respawn-ready dying players.  Resets hp
  // to max and emits player_respawned + player_state so the client
  // teleports to town and clears its death state.  Cheap; runs once
  // per tick alongside _tickMonsters.
  _tickPlayerRespawn() {
    const now = Date.now();
    for (const [id, ps] of Object.entries(this.playerState)) {
      if (!ps.dying) continue;
      if (now < (ps.respawnAt || 0)) continue;
      ps.hp = ps.maxHp || 100;
      ps.stamina = ps.maxStamina || 100;
      ps.mana = ps.maxMana || 100;
      ps.dying = false;
      ps.dead = false;
      ps.respawnAt = 0;
      ps.z = 'town';
      ps.lastDamageAt = 0;
      // Defense-in-depth: wipe again on respawn in case anything
      // re-seeded inventory or dmgFromMonster between death and
      // respawn (e.g., a late monster_attack tick).  Matches the
      // wipe in _handlePlayerDeath.
      ps.inventory = {};
      ps.dmgFromMonster = {};
      this._saveRpg(id, ps);
      const ws = this._wsBySessionId(id);
      if (ws) {
        try {
          ws.send(JSON.stringify({
            type: 'player_respawned',
            payload: { zone: 'town' },
          }));
        } catch (e) {}
        this._queuePlayerStateFlush(id);
      }
    }
  }

  // Pool regen tick + shield drain.  Runs every 30 server ticks
  // (~670 ms at TICK_RATE=22) for all three pools:
  //
  //   HP:
  //     OOC:        ceil(maxHp * 0.001 * restMult * amuletMult) * 10
  //     In-combat:  ceil(maxHp * 0.0005) * 6
  //   Stamina:
  //     Always:     ~7/tick (matches client's 10/sec at 60 fps),
  //                 * (1 + amuletStaminaRegen/100)
  //     Override:   when ps.blocking, drain 5/tick instead of regenning
  //                 (mirrors client's 0.167/frame * 30 frames shield drain)
  //   Mana:
  //     OOC (>2s):  maxMana * 0.018/tick (~2.7%/sec)
  //     In-combat:  maxMana * 0.007/tick (~1%/sec)
  //
  // Only emits player_state when at least one pool actually changed.
  // Rate calibration is approximate -- see plan file "Regen rate math".
  _tickPlayerRegen() {
    const now = Date.now();
    for (const [id, ps] of Object.entries(this.playerState)) {
      if (!ps || ps.dying || ps.dead || ps.disconnected) continue;
      if (typeof ps.hp !== 'number' || typeof ps.maxHp !== 'number') continue;
      const ooc = (now - (ps.lastDamageAt || 0)) > 5000;
      const oocMana = (now - (ps.lastDamageAt || 0)) > 2000;
      let changed = false;

      // HP regen: fast in safe zones (town / farm_home), off in combat
      // zones.  Lifesteal + eating remain the only heals while fighting;
      // walking back to town tops you off in ~7 s so a fresh expedition
      // doesn't start at the HP you happened to limp home with.
      // v2.3.1126: GATED during an active arena match (GDD §43 "healing
      // disabled") -- arena fights happen in town, and 10% maxHp per
      // regen tick would make them literally unendable for non-burst
      // builds.  HP only; stamina/mana below keep regenerating so
      // blocking still works.
      if (!ps._arenaMatch && (ps.z === 'town' || ps.z === 'farm_home') && ps.hp < ps.maxHp) {
        const heal = Math.max(1, Math.ceil(ps.maxHp * 0.10));
        const beforeHp = ps.hp;
        ps.hp = Math.min(ps.maxHp, ps.hp + heal);
        if (ps.hp !== beforeHp) changed = true;
      }

      // Stamina: shield drain takes priority over regen.  When blocking,
      // drain ~5/tick and auto-release at 0 (mirrors client behavior at
      // BroTown.jsx:9370 -- 0.167 stamina/frame at 60 fps).
      if (typeof ps.maxStamina === 'number' && typeof ps.stamina === 'number') {
        if (ps.blocking && ps.stamina > 0) {
          const beforeSt = ps.stamina;
          ps.stamina = Math.max(0, ps.stamina - 5);
          if (ps.stamina !== beforeSt) changed = true;
          if (ps.stamina <= 0) {
            // Auto-release shield to match client's drop-at-0 behavior.
            ps.blocking = false;
          }
        } else if (ps.stamina < ps.maxStamina) {
          const stAmuletMult = 1 + (ps.amuletStaminaRegen || 0) / 100;
          const stRestMult = 1 + (ps.restoration || 0) * 0.001;
          // Phase 2 of the T1/T2 spec: Endurance multiplies stamina regen.
          const stEndMult = 1 + (ps.endurance || 0) * 0.002;
          const stHeal = Math.max(1, Math.ceil(7 * stAmuletMult * stRestMult * stEndMult));
          const beforeSt = ps.stamina;
          ps.stamina = Math.min(ps.maxStamina, ps.stamina + stHeal);
          if (ps.stamina !== beforeSt) changed = true;
        }
      }

      // Mana.  manaBuff (1.3x regen mult) layered on top of restoration.
      // Phase 4b of the T1/T2 spec: Mind also multiplies mana regen.
      const manaBuffActive = this._buffActive(ps, 'mana');
      if (typeof ps.maxMana === 'number' && typeof ps.mana === 'number' && ps.mana < ps.maxMana) {
        const restMult = 1 + (ps.restoration || 0) * 0.001;
        const buffMult = manaBuffActive ? 1.3 : 1.0;
        const mindMult = 1 + (ps.mind || 0) * 0.001;
        const rate = oocMana ? 0.018 : 0.007;
        const manaHeal = Math.max(1, Math.ceil(ps.maxMana * rate * restMult * buffMult * mindMult));
        const beforeMn = ps.mana;
        ps.mana = Math.min(ps.maxMana, ps.mana + manaHeal);
        if (ps.mana !== beforeMn) changed = true;
      }

      if (changed) {
        this._saveRpg(id, ps);
        this._queuePlayerStateFlush(id);
      }
    }
  }

  // v2.3.1141: SERVER-MINTED WEAPON DROPS (closes the last client-
  // authored economy input; unlocks drop-time quality §4.6b.ii).
  // Weapon drops were effectively DORMANT in production: the client
  // mint paths (monsterCombat.js / projectiles.js) only run inside
  // kill blocks gated on !S._serverMonsters, and every live zone is
  // server-managed -- they survived only as the legacy-worker
  // fallback.  This restores the feature server-side on the §4.6
  // cubic curve (the canonical one; the projectiles path had drifted
  // to a far more generous linear table -- deliberately unified down).
  // Rarity/element gating mirrors monsterCombat.js:2233-2262; the
  // blob shape mirrors the forge mint (_handleForgeWeapon) exactly,
  // including quality rolled ONCE here (hidden until pickup -- the
  // broadcastable pile carries no quality field, see _serializePile).
  // hardenBonus stays null: that field belongs to the client's legacy
  // affix system (NAME COLLISION warning in hardening.js).
  _rollWeaponDropForKill(zoneId, monster) {
    const lvl = Math.max(1, monster.level || 1);
    const lvlFactor = Math.pow(lvl / 100, 3); // cubic: L1≈0, L50=0.125, L100=1
    const dropChance = 0.0005 + lvlFactor * 0.03; // L1: 0.05%, L100: ~3%
    if (Math.random() >= dropChance) return null;
    const zone = this._getZoneConfig(zoneId);
    const zoneElem = (zone && zone.element) || null;
    const secondaryElem = (zone && zone.secondary) || null;
    const shiftChance = 0.0000002 + lvlFactor * 0.002;
    const fusionChance = 0.000002 + lvlFactor * 0.02;
    const elemChance = 0.0002 + lvlFactor * 0.25;
    const tierRoll = Math.random();
    let tier = 'common', e1 = null, e2 = null, isVolatile = false;
    if (tierRoll < shiftChance && zoneElem) {
      tier = 'shift'; e1 = zoneElem;
    } else if (tierRoll < shiftChance + fusionChance && zoneElem) {
      tier = 'fusion'; e1 = zoneElem;
      e2 = secondaryElem || ['flame', 'frost', 'water', 'venom', 'storm', 'stone', 'wind']
        .filter((e) => e !== zoneElem)[Math.floor(Math.random() * 6)];
      const volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'],
        ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
      isVolatile = volPairs.some(([a, b]) => (e1 === a && e2 === b) || (e1 === b && e2 === a));
    } else if (tierRoll < shiftChance + fusionChance + elemChance && zoneElem) {
      tier = 'elemental'; e1 = zoneElem;
    }
    const types = ['greatsword', 'sword', 'bow', 'staff'];
    const type = types[Math.floor(Math.random() * types.length)];
    // Labels mirror WEAPON_TYPES[type].label in src/data/gameSystems.js.
    const label = { greatsword: 'Great Sword', sword: 'Sword', bow: 'Bow', staff: 'Staff' }[type];
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    let name;
    if (tier === 'common') name = label;
    else if (tier === 'elemental') name = cap(e1) + ' ' + label;
    else if (tier === 'fusion') name = cap(e1) + cap(e2) + ' ' + label;
    else name = 'Prismatic ' + label;
    return {
      type,
      tier,
      tierMult: RARITY_TIERS[tier].mult,
      element1: e1,
      element2: e2,
      name,
      isVolatile,
      reforgeBonus: null,
      hardenBonus: null,
      quality: this._rollWeaponQuality(),
      hardness: 0,
      temper: 0,
    };
  }

  // Pile shape (server-side, full):
  //   { lootId, zone, x, y, coins, skull, shard, weapon, weaponClaimed,
  //     recipients, shares: {pid: number}, killerName, ts,
  //     inventoryClaimed, claimedBy: {pid: true} }
  _spawnLootForKill(zone, monster, killerSessionId, recipients, shares) {
    const lootId = 'mk-' + monster.id;
    // Use the variant if set (e.g. ember fodder -> fireGoblin, sky
    // fodder -> mummy) so _invKeyForSkull produces the correct
    // inventory key on pickup.  Falls back to the base archetype
    // for monsters with no variant override.
    const skullSource = monster.variant || monster.arch;
    const skull = this._isRemnantSkullArch(skullSource) ? skullSource : null;
    const shard = this._rollShardForKill(zone);
    // v2.3.1141: weapon rides the pile; only rolled when someone can
    // actually claim it (the claim is recipient-gated below).
    const weapon = (recipients && recipients.length > 0)
      ? this._rollWeaponDropForKill(zone, monster) : null;
    if (!skull && (!recipients || recipients.length === 0) && monster.gold <= 0 && !shard && !weapon) {
      // Nothing of value would drop -- skip the pile entirely.
      return null;
    }
    const killerSession = this._sessionById(killerSessionId);
    const killerName = (killerSession && killerSession.name) || 'Player';
    const pile = {
      lootId,
      zone,
      x: monster.x,
      y: monster.y,
      coins: monster.gold || 0,
      skull,
      shard,
      recipients: recipients.slice(),
      shares: { ...shares },
      killerName,
      ts: Date.now(),
      inventoryClaimed: false,
      claimedBy: {},
      // v2.3.1141: weapon has its OWN claim flag -- it must not consume
      // (or be consumed by) the skull/shard inventoryClaimed slot.
      weapon,
      weaponClaimed: false,
    };
    if (!this.loot[zone]) this.loot[zone] = [];
    this.loot[zone].push(pile);
    return pile;
  }

  // Serialize a pile for the wire.  Strips server-only fields
  // (claimedBy) and keeps just what clients need to render + decide
  // visual state.  inventoryClaimed is part of the wire because
  // late-joiners + zone-change syncs need it.
  _serializePile(p) {
    return {
      lootId: p.lootId,
      zone: p.zone,
      x: p.x, y: p.y,
      coins: p.coins,
      skull: p.skull,
      shard: p.shard,
      recipients: p.recipients,
      shares: p.shares,
      killerName: p.killerName,
      ts: p.ts,
      inventoryClaimed: p.inventoryClaimed,
      // v2.3.1141: weapon PRESENCE rides the broadcast (render glow /
      // late-join sync) but the quality NEVER does -- it was committed
      // at mint and reveals only in the picker's private loot_credit.
      // That withholding IS the §4.6b.ii mystery-reveal contract.
      hasWeapon: !!p.weapon,
      weaponClaimed: !!p.weaponClaimed,
      weaponTier: p.weapon ? p.weapon.tier : null,
      weaponType: p.weapon ? p.weapon.type : null,
      weaponName: p.weapon ? p.weapon.name : null,
      // Death-drop fields (null for normal monster-kill piles).
      isDeathDrop: p.isDeathDrop || false,
      deathItems: p.deathItems || null,
      expiry: p.expiry || null,
      // Death drops are owner-only until ownerOnlyUntil, then free-
      // for-all until expiry.  Null for monster-kill piles.
      ownerOnlyUntil: p.ownerOnlyUntil || null,
    };
  }

  // Spawn a death pile at the dying player's location carrying their
  // entire general inventory (mummy remains, fish, wood, etc.).
  // Equipped loadout + weaponStash are NOT included -- caller wipes
  // ps.inventory after this returns.  Anyone in the zone can pick the
  // pile up (recipients=null bypasses the recipient gate in
  // _handleLootPickup); first picker gets everything.  TTL is the
  // standard LOOT_EXPIRY_MS (60 s) so _tickLoot despawns it on schedule.
  _spawnDeathPile(ps, playerId) {
    if (!ps || !ps.inventory) return null;
    const items = [];
    for (const [k, v] of Object.entries(ps.inventory)) {
      const qty = Math.floor(Number(v) || 0);
      if (qty > 0) items.push({ key: k, qty });
    }
    if (items.length === 0) return null;
    const zone = ps.z;
    if (!zone || zone === 'town' || zone === 'farm_home') return null;
    const session = this._sessionById(playerId);
    const ownerName = (session && session.name) || 'Player';
    const pile = {
      lootId: 'dd-' + playerId + '-' + Date.now(),
      zone,
      x: ps.x || 0,
      y: ps.y || 0,
      coins: 0,
      skull: null,
      shard: null,
      // Recipients = just the dying player for the owner-only window;
      // after DEATH_PILE_OWNER_MS the server-side _handleLootPickup
      // and client-side recipient gate both flip to free-for-all so
      // anyone in zone may claim (driven by ownerOnlyUntil + isDeathDrop).
      recipients: [playerId],
      shares: {},
      killerName: ownerName,
      ts: Date.now(),
      inventoryClaimed: false,
      claimedBy: {},
      isDeathDrop: true,
      deathItems: items,
      ownerOnlyUntil: Date.now() + this.DEATH_PILE_OWNER_MS,
      expiry: Date.now() + this.DEATH_PILE_TOTAL_MS,
    };
    if (!this.loot[zone]) this.loot[zone] = [];
    this.loot[zone].push(pile);
    this.eventBuffer.push({
      type: 'loot_drop',
      payload: { pile: this._serializePile(pile) },
    });
    return pile;
  }

  _zoneLootForWire(zone) {
    const list = this.loot[zone] || [];
    return list.map((p) => this._serializePile(p));
  }

  _sessionById(sessionId) {
    for (const [, s] of this.sessions) {
      if (s.id === sessionId) return s;
    }
    return null;
  }

  _wsBySessionId(sessionId) {
    /* v2.3.702: LAST match wins -- Map iterates in insertion order, so if a
       stale same-id session somehow survives the join-time eviction, the
       newest socket (most recent join) is the live one. */
    let found = null;
    for (const [ws, s] of this.sessions) {
      if (s.id === sessionId) found = ws;
    }
    return found;
  }

  _despawnLoot(zone, lootId) {
    const list = this.loot[zone];
    if (!list) return;
    const idx = list.findIndex((p) => p.lootId === lootId);
    if (idx < 0) return;
    list.splice(idx, 1);
    this.eventBuffer.push({
      type: 'loot_despawn',
      payload: { lootId, zone },
    });
  }

  _tickLoot() {
    const now = Date.now();
    for (const zoneId of Object.keys(this.loot)) {
      const list = this.loot[zoneId];
      if (!list) continue;
      // Walk back-to-front so splice is safe.
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        // Honor pile.expiry if set (death drops use 120 s); else fall
        // back to the standard ts + LOOT_EXPIRY_MS window for monster
        // kill piles.
        const expired = p.expiry
          ? now > p.expiry
          : (now - p.ts > this.LOOT_EXPIRY_MS);
        if (expired) {
          list.splice(i, 1);
          this.eventBuffer.push({
            type: 'loot_despawn',
            payload: { lootId: p.lootId, zone: zoneId },
          });
        }
      }
    }
  }

  _handleLootPickup(session, payload) {
    // Diagnostic helper -- when a pickup is rejected silently the
    // user has no signal why.  Emit loot_pickup_rejected with a
    // reason so the client can render a floater the same way
    // lifesteal does.
    const reject = (reason, extra) => {
      if (!session || !session.id) return;
      const ws = this._wsBySessionId(session.id);
      if (!ws) return;
      try {
        ws.send(JSON.stringify({
          type: 'loot_pickup_rejected',
          payload: { lootId: (payload && payload.lootId) || null, zone: (payload && payload.zone) || null, reason, ...(extra || {}) },
        }));
      } catch (e) {}
    };
    if (!session || !session.id) return;  // no session = no way to tell them
    const { lootId, zone } = payload || {};
    if (!lootId || !zone) return reject('bad-payload');
    const list = this.loot[zone];
    if (!list) return reject('no-loot-zone');
    const pile = list.find((p) => p.lootId === lootId);
    if (!pile) return reject('no-pile');

    // Already claimed this pile?  Per-player single claim for gold;
    // inventory is single-claim across the pile.
    if (pile.claimedBy[session.id]) return reject('already-claimed');

    // Recipient gate.  Death drops enforce owner-only until
    // ownerOnlyUntil, then anyone in zone may claim until expiry.
    const deathFreeForAll = pile.isDeathDrop
      && pile.ownerOnlyUntil
      && Date.now() > pile.ownerOnlyUntil;
    if (!deathFreeForAll
        && pile.recipients
        && !pile.recipients.includes(session.id)) {
      return reject('not-recipient', { mySession: session.id, recipients: pile.recipients });
    }

    // Range gate -- player must be near the pile per server-tracked
    // position.  Bumped to 60 px (was 30) so client/server position
    // lag during pickup doesn't silently drop legit grabs -- the
    // client's own 20 px trigger is still the tight bound.
    const ps = this.playerState[session.id];
    if (!ps) return reject('no-ps');
    if (ps.z !== zone) return reject('wrong-zone', { psZ: ps.z });
    if (ps.dead) return reject('dead');
    if (ps.disconnected) return reject('disconnected');
    const dx = ps.x - pile.x;
    const dy = ps.y - pile.y;
    const distSq = dx * dx + dy * dy;
    const rangeSq = this.LOOT_PICKUP_RANGE * this.LOOT_PICKUP_RANGE;
    if (distSq > rangeSq) return reject('out-of-range', { dist: Math.round(Math.sqrt(distSq)), max: this.LOOT_PICKUP_RANGE });

    // Death-drop pickup: first picker grabs everything, pile despawns.
    // Separate code path from monster-kill loot since there are no
    // shares + coins/skull/shard, just bulk items.
    if (pile.isDeathDrop) {
      if (!ps.inventory) ps.inventory = {};
      const itemsForMe = [];
      for (const it of (pile.deathItems || [])) {
        const key = it && it.key;
        const qty = Math.floor(Number(it && it.qty) || 0);
        if (!key || qty <= 0) continue;
        ps.inventory[key] = (ps.inventory[key] || 0) + qty;
        itemsForMe.push({ key, qty });
      }
      pile.claimedBy[session.id] = true;
      pile.inventoryClaimed = true;
      this._saveRpg(session.id, ps);
      const ws = this._wsBySessionId(session.id);
      if (ws) {
        try {
          ws.send(JSON.stringify({
            type: 'loot_credit',
            payload: {
              lootId,
              zone,
              coins: 0,
              skull: null,
              shard: null,
              items: itemsForMe,
              isDeathDrop: true,
            },
          }));
        } catch (e) {}
        this._sendPlayerState(ws, session.id);
      }
      this.eventBuffer.push({
        type: 'loot_claimed',
        payload: { lootId, zone, byPlayer: session.id, inventoryClaimedNow: true },
      });
      this._despawnLoot(zone, lootId);
      return;
    }

    // Compute the player's authorized share.
    const share = pile.shares[session.id] || 0;
    const coinsForMe = Math.round(pile.coins * share);

    // First picker also gets the one-of inventory drop.
    let skullForMe = null;
    let shardForMe = null;
    let inventoryClaimedNow = false;
    if (!pile.inventoryClaimed) {
      if (pile.skull || pile.shard) inventoryClaimedNow = true;
      skullForMe = pile.skull || null;
      shardForMe = pile.shard || null;
      pile.inventoryClaimed = true;
    }
    // v2.3.1141: weapon claim -- first eligible picker takes it (own
    // flag; independent of the skull/shard slot).  Stash if there's
    // room, else auto-sell for coins (mirrors the legacy client
    // behavior in groundLoot.js -- dropping value on the floor is
    // worse than a forced sale).  Quality reveals HERE, in the private
    // credit: the pile broadcast never carried it.
    let weaponForMe = null;
    let weaponStashed = false;
    let weaponSoldFor = null;
    if (pile.weapon && !pile.weaponClaimed) {
      pile.weaponClaimed = true;
      weaponForMe = pile.weapon;
      if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
      if (ps.weaponStash.length < this.WEAPON_STASH_CAP) {
        ps.weaponStash.push(weaponForMe);
        weaponStashed = true;
      } else {
        weaponSoldFor = this._weaponSellValue(weaponForMe);
        ps.coins = (ps.coins || 0) + weaponSoldFor;
      }
    }
    pile.claimedBy[session.id] = true;

    // Apply the grant to server-tracked playerState (the authoritative
    // store) BEFORE we emit the credit -- a cheating client that tries
    // to manipulate the local R.coins value will get overwritten on
    // the next player_state event we send.  Persist async; the in-
    // memory state is what subsequent operations read.  Reusing the
    // `ps` variable from the range check above.
    ps.coins = (ps.coins || 0) + coinsForMe;
    if (skullForMe) {
      if (!ps.inventory) ps.inventory = {};
      const invKey = this._invKeyForSkull(skullForMe);
      ps.inventory[invKey] = (ps.inventory[invKey] || 0) + 1;
    }
    if (shardForMe) {
      if (!ps.inventory) ps.inventory = {};
      ps.inventory[shardForMe] = (ps.inventory[shardForMe] || 0) + 1;
    }
    this._saveRpg(session.id, ps);

    // Private credit to the picker -- this is the authoritative grant.
    // Goes direct via ws.send (not the room broadcast) so other clients
    // can't see another player's per-share amount.  The accompanying
    // player_state (sent right after) carries the new authoritative
    // totals so the client can overwrite its local rpg state -- the
    // loot_credit values are kept here for popup display only.
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'loot_credit',
          payload: {
            lootId,
            zone,
            coins: coinsForMe,
            skull: skullForMe,
            shard: shardForMe,
            // v2.3.1141: full blob incl. quality -- the private reveal.
            weapon: weaponForMe,
            weaponStashed,
            weaponSoldFor,
          },
        }));
      } catch (e) {}
      this._sendPlayerState(ws, session.id);
    }

    // Public broadcast: visual state changed (skull/shard removed from
    // the rendered pile, picker logged for future "X claimed" feedback
    // if the client wants it).
    this.eventBuffer.push({
      type: 'loot_claimed',
      payload: { lootId, zone, byPlayer: session.id, inventoryClaimedNow, weaponClaimedNow: !!weaponForMe },
    });

    // If every recipient has now claimed, the pile is fully spent --
    // despawn so watchers stop seeing it.
    if (Object.keys(pile.claimedBy).length >= pile.recipients.length) {
      this._despawnLoot(zone, lootId);
    }
  }

  // Process player damage to a monster
  // Weapon-aware damage cap.  Replaces the prior level-only cap
  // ((level+5)*100) with a tighter bound computed from the attacker's
  // actual equipped weapon + power + ferocity (all server-tracked
  // since slices 12 / stat-validation).  Closes the "claim huge
  // damage to one-shot tough monsters" cheat with much less false-
  // positive headroom -- a level 1 player with a wood weapon can no
  // longer claim 600 dmg, only ~350.
  //
  // Formula mirrors calcWeaponDmg in src/data/gameSystems.js:
  //   base = (WEAPON_TYPES[type].base + power * 0.8) * weapon.tierMult
  // Multiplied by crit cap (1.75 + ferocity * 0.0008) and a generous
  // 5x "combo + status + amulet + lunge" boost to cover the legit
  // upper bound without rejecting real hits.
  _maxWeaponDmg(ps, isSpecial) {
    if (!ps) return 0;
    const candidates = [ps.weapon, ps.rangedWeapon, ps.staffWeapon].filter(Boolean);
    if (candidates.length === 0) return 6.25; // fists fallback (baseline-10: 30 ÷ 4.8)
    let max = 0;
    // Phase 4a of the T1/T2 spec: Mind scales special attacks; Power
    // still scales normal swings.  Coefficient baseline-10 rescaled
    // (0.8 ÷ 4.8 = 0.1667) so the cap tracks the new damage scale.
    const statBonus = isSpecial ? ((ps.mind || 0) * 0.1667) : ((ps.power || 0) * 0.1667);
    for (const w of candidates) {
      // v2.3.912: include the damage channel (normal swings only, matching
      // _computeAttackDamage) so a channel-boosted hit isn't rejected by the
      // anti-cheat ceiling.
      const dmgChannel = isSpecial ? 0 : this._wpnDmgChannel(ps, w.type);
      // v2.3.1131: §4.4 effective base -- (raw + hardness×1.0417) ×
      // quality, BEFORE stat/channel/tierMult.  Identity for legacy
      // weapons (H0/Normal); keeps godly/hardened hits from being
      // rejected as cheats.
      const base = (this._weaponEffBase(w.type, w) + statBonus + dmgChannel) * (w.tierMult || 1);
      if (base > max) max = base;
    }
    return max;
  }

  _maxDmgForAttacker(ps, isSpecial) {
    if (!ps) return 21; // baseline-10: 100 ÷ 4.8
    const maxWpn = this._maxWeaponDmg(ps, isSpecial);
    // v2.3.1133: ceiling assumes a MAXED crit-dmg channel (+0.792 at 99 pts)
    // instead of reading live points, so a fully-invested crit isn't rejected
    // by the anti-cheat cap (same bug class v2.3.912 fixed for the damage
    // channel).  Replaces the retired Ferocity term.
    const critMult = 1.5 + (ps.power || 0) * 0.001 + 0.792;
    const comboBoost = 5; // covers combo + status amplifier + amulet elemDmg + lunge mult
    // SPECIAL_ATK_MULT = 2.0 applied client-side; double the cap on
    // special hits so they don't get rejected as too-high.
    const specialMult = isSpecial ? 2.0 : 1.0;
    // Floor baseline-10 rescaled (100 ÷ 4.8 ≈ 21) so it doesn't sit ~10x
    // above a real hit.  Now a sanity backstop on the server's own roll
    // (monster damage is server-computed) AND the PvP dmgBase cap.
    return Math.max(21, Math.ceil(maxWpn * critMult * comboBoost * specialMult));
  }

  // Server-authoritative player->monster damage roll.  Mirrors the
  // client's calcWeaponDmg / calcSpecialDmg (src/data/gameSystems.js)
  // plus calcCritChance / calcCritMult, on the baseline-10 (÷4.8) scale.
  // The client now sends an INTENT (which slot, special or not) instead
  // of a damage number -- the server rolls the actual value here so the
  // last client-trusted-damage cheat vector is closed.
  //
  // NOTE (scoped per the server-computed-damage spec): this roll covers
  // weapon base + governing stat + per-type variance + special (2x) +
  // volatile (1.3x) + cooked damage buff (1.2x) + crit.  It deliberately
  // omits amulet elemDmg / elementalMastery / curse / elemental-collision
  // combo damage -- those stay client-side for now and are a follow-up
  // slice (the server has no elemental-status model).  So an elemental
  // combo build's authoritative damage is weapon-only until then.
  _computeAttackDamage(ps, slot, isSpecial) {
    if (!ps) return { dmg: 1, isCrit: false };
    // Trust the wire slot when it's a known value, else fall back to the
    // server's tracked activeSlot (mirrors the lifesteal slot resolution).
    const eff = (slot === 'melee' || slot === 'ranged' || slot === 'staff')
      ? slot : (ps.activeSlot || 'melee');
    const w = eff === 'ranged' ? ps.rangedWeapon
            : eff === 'staff'  ? ps.staffWeapon
            :                    ps.weapon;
    const type = (w && w.type) || 'greatsword';
    const tierMult = (w && w.tierMult) || 1;
    // Governing stat mirrors client EQUIP_STAT_MAP: melee (greatsword +
    // sword) = power, bow = agility, staff = mind.  All specials scale on
    // Mind regardless of weapon (client calcSpecialDmg).
    const stat = isSpecial ? (ps.mind || 0)
               : type === 'bow'   ? (ps.agility || 0)
               : type === 'staff' ? (ps.mind || 0)
               :                    (ps.power || 0);
    // v2.3.912: + weapon damage channel (edge/drawPower/spellPower) so spent
    // build points raise authoritative damage.  Specials stay channel-free
    // (mirrors client calcSpecialDmg).
    const dmgChannel = isSpecial ? 0 : this._wpnDmgChannel(ps, type);
    // v2.3.1131: _weaponBase -> _weaponEffBase (quality × hardness
    // layers, BALANCE-PLAN §4.4 order: pre-stat, pre-tier).  Reduces
    // exactly to the old formula at Hardness 0 / Normal quality --
    // tools/balance-sim.mjs asserts that equivalence.
    let base = (this._weaponEffBase(type, w) + stat * 0.1667 + dmgChannel) * tierMult; // 0.8 ÷ 4.8
    // Per-type variance -- same rolls as the client.
    const v = type === 'staff' ? (0.5  + Math.random() * 1.0)
            : type === 'bow'   ? (0.6  + Math.random() * 0.2)
            :                    (0.75 + Math.random() * 0.5);
    base *= v;
    if (isSpecial) base *= 2.0;                        // SPECIAL_ATK_MULT
    if (w && w.isVolatile) base *= 1.30;               // §4.7 volatile weapon
    if (this._buffActive(ps, 'damage')) base *= 1.20;  // cooked damage buff (client gameLoop.js:2346)
    // Crit (calcCritChance + calcCritMult).
    // v2.3.912: crit chance = Power baseline + the weapon CRIT channel
    // (precision/marksmanship/overload) at +0.5%/pt, capped +30% (linear,
    // mirrors calcCritChance).  Ferocity is retired; crit mult stays Power-based.
    const P = ps.power || 0;
    const critChance = Math.max(0, Math.min(1,
      40 * P / (P + 200) / 100 + Math.min(0.30, this._wpnCritPts(ps, type) * 0.005)));
    const isCrit = Math.random() < critChance;
    // v2.3.1133: crit mult gains the crit-DMG channel (executioner/headshot/
    // focus) at +0.008/pt, mirroring client calcCritMult.  The Ferocity term
    // (retired, pinned 0 since v2.3.910) is dropped.
    if (isCrit) base *= (1.5 + P * 0.001 + this._wpnCritDmgPts(ps, type) * 0.008);
    // v2.3.1139 (item I): the two multipliers the v2.3.912 scope note
    // deliberately omitted, now server-side (the client applies both
    // locally and its numbers finally match the wire truth):
    //   - amulet elemDmg: FLAME-gem amulets boost ELEMENTAL weapons by
    //     1 + (3 + 2.5×tierPower)/100 (monsterCombat.js:76 verbatim;
    //     the _maxDmgForAttacker comboBoost explicitly reserves
    //     headroom for this).
    //   - hexer curse: -30% outgoing damage for 4s after a hexer's
    //     hit lands (ps._cursedUntil stamped in the monster-attack
    //     path).
    if (ps.amulet && ps.amulet.gem === 'flame' && w && w.element1) {
      const tierPower = AMULET_TIER_POWER[ps.amulet.tier] || 1.0;
      const elemDmgPct = Math.round((3 + 2.5 * tierPower) * 10) / 10;
      base *= 1 + elemDmgPct / 100;
    }
    if (ps._cursedUntil && Date.now() < ps._cursedUntil) base *= 0.7;
    return { dmg: Math.max(1, Math.round(base)), isCrit };
  }

  _handleMonsterDamage(session, payload) {
    // Client damage number is no longer trusted -- ignore payload.dmg /
    // payload.isCrit; we keep only the intent (slot + special) + element.
    const { monsterId, zone, element, slot } = payload;
    if (!monsterId || !zone) return;
    const monsters = this.monsters[zone];
    if (!monsters) return;
    const m = monsters.find(x => x.id === monsterId);
    if (!m || !m.alive) return;

    // Apply damage. Clamp the credited amount to the monster's remaining
    // HP so the overkill on the final blow doesn't inflate the killer's
    // contribution share (GDD §7: DPS = damage / monster_max_hp).
    // Also clamp the incoming value to the per-level cap so a cheater
    // can't claim 99999 damage to one-shot tough monsters.
    const attackerPs = this.playerState[session.id];
    const isSpecial = !!payload.special;

    // v2.3.1134: HIT-CADENCE FLOOR.  Until now damage-per-hit was capped
    // but hit FREQUENCY was not -- a hacked client could spam
    // monster_damage far faster than any weapon swings.  Now that Tempo
    // makes cadence a build stat, give it a server backstop keyed per
    // (player, monster) so Cleave/pierce fan-out (many monsters, one
    // swing) can never false-positive.  Two classes:
    //  - normal hits: min 335ms gap = 600ms swing x 0.80 (Tempo CAP, not
    //    live points -- needs no client sync) x ~0.7 lag headroom (mobile
    //    bunches sends).  Legit fastest today is ~450ms (Tempo cap +
    //    mythic storm amulet 6.5%).
    //  - specials: <=3 hits per 1200ms per monster.  The staff special is
    //    a 3-bolt cone that can land all 3 on one target within ~100ms,
    //    and the melee special bypasses the swing cooldown entirely
    //    (playerActions.js resets swingTimer), so specials can't share
    //    the normal floor.  Swipe itself has a 1500ms client cooldown.
    // Excess hits are silently dropped (no reject event -- a cheater
    // learns nothing, a laggy legit client just loses a ghost hit its
    // next authoritative tick corrects).  In-memory only (rule 11).
    if (attackerPs) {
      const nowTs = Date.now();
      if (!attackerPs._monHitCad) attackerPs._monHitCad = new Map();
      let cad = attackerPs._monHitCad.get(monsterId);
      if (!cad) { cad = { n: 0, s: [] }; attackerPs._monHitCad.set(monsterId, cad); }
      if (isSpecial) {
        cad.s = cad.s.filter(t => nowTs - t < 1200);
        if (cad.s.length >= 3) return;
        cad.s.push(nowTs);
      } else {
        if (nowTs - cad.n < 335) return;
        cad.n = nowTs;
      }
      // Bound the map (fighting packs cycles monsters; oldest-in first-out).
      if (attackerPs._monHitCad.size > 32) {
        for (const k of attackerPs._monHitCad.keys()) {
          if (attackerPs._monHitCad.size <= 24) break;
          attackerPs._monHitCad.delete(k);
        }
      }
    }

    // Server computes the actual damage from server-tracked stats +
    // weapon + the client's intent (slot/special).  _maxDmgForAttacker
    // stays as a cheap sanity clamp on our OWN roll (weapon-aware, slice
    // 16 / T1-T2): special hits get the 2x cap headroom.
    const rolled = this._computeAttackDamage(attackerPs, slot, isSpecial);
    const dmgCap = this._maxDmgForAttacker(attackerPs, isSpecial);
    const rawDmg = Math.max(1, Math.min(dmgCap, rolled.dmg));
    const actualDmg = Math.min(rawDmg, Math.max(0, m.hp));
    // Subtract actualDmg (capped at remaining hp) so m.hp doesn't go
    // negative on overkill -- otherwise the broadcast hpPct goes < 0
    // and any subsequent code reading m.hp sees a nonsensical value.
    m.hp -= actualDmg;

    // Track per-player damage contribution for the kill-time share.
    // dmgByPlayer is created lazily so existing monster snapshots
    // without it stay compatible.
    if (!m.dmgByPlayer) m.dmgByPlayer = {};
    m.dmgByPlayer[session.id] = (m.dmgByPlayer[session.id] || 0) + actualDmg;

    // v2.3.1114: SERVER-AUTHORITATIVE ELEMENTAL.  The wire already carried
    // `element` (destructured above) but the server ignored it -- burns,
    // roots and collision detonations only ever mutated the client's local
    // hp prediction, which the next authoritative tick overwrote.  Mirror
    // of the client order (monsterCombat.js:1478/1548): the hit's own
    // status applies first, then a collision consumes the OLDEST
    // different-element status already on the monster.
    if (m.hp > 0 && element && ELEMENT_STATUS[element] && attackerPs) {
      const _now = Date.now();
      applyElementStatus(m, element, session.id, attackerPs.power || 0, _now,
        this._attuneMult(attackerPs));
      // Volatile mirrors _computeAttackDamage's slot resolution.
      const _eff = (slot === 'melee' || slot === 'ranged' || slot === 'staff')
        ? slot : (attackerPs.activeSlot || 'melee');
      const _w = _eff === 'ranged' ? attackerPs.rangedWeapon
               : _eff === 'staff' ? attackerPs.staffWeapon
               : attackerPs.weapon;
      const col = resolveElementCollision(m, element, attackerPs, !!(_w && _w.isVolatile), _now);
      if (col) {
        const colDmg = Math.min(col.dmg, Math.max(0, m.hp));
        m.hp -= colDmg;
        m.dmgByPlayer[session.id] += colDmg;
        this.eventBuffer.push({
          type: 'monster_hit',
          payload: {
            monsterId: m.id, zone, dmg: colDmg, isCrit: false,
            attackerId: session.id, collision: col.id,
            hpPct: Math.max(0, m.hp / m.maxHp),
          },
        });
        // v2.3.1139 (item I): resonance-streak mana restore, finally
        // REAL -- the client has always computed this locally
        // (gameSystems.js §3.5/§5.7) but mana is server-authoritative,
        // so the echo stomped it every flush.  Constants verbatim:
        // 10s streak window, +10%/step capped +50%, restore
        // 4% maxMana × restoration mult, throttled to once per 3s.
        if (attackerPs) {
          if (col.resonating) {
            const streak = attackerPs._resonanceStreak || { count: 0, lastTs: 0 };
            streak.count = (_now - streak.lastTs <= 10000) ? Math.min(streak.count + 1, 5) : 1;
            streak.lastTs = _now;
            attackerPs._resonanceStreak = streak;
            if (!attackerPs._lastCollisionMana || _now - attackerPs._lastCollisionMana >= 3000) {
              attackerPs._lastCollisionMana = _now;
              const streakMult = 1 + Math.min(streak.count * 0.10, 0.50);
              const restMult = 1 + (attackerPs.restoration || 0) * 0.0012;
              const restore = Math.round(0.04 * (attackerPs.maxMana || 100) * restMult * streakMult);
              if (restore > 0) {
                attackerPs.mana = Math.min(attackerPs.maxMana || 100, (attackerPs.mana || 0) + restore);
                this._saveRpg(session.id, attackerPs);
                this._queuePlayerStateFlush(session.id);
              }
            }
          } else if (attackerPs._resonanceStreak) {
            attackerPs._resonanceStreak.count = 0; // non-resonating collision breaks the streak
          }
        }
      }
    }

    // Sticky-aggro override -- being hit pulls the monster onto its
    // attacker regardless of proximity, so a player sniping with a bow
    // from outside MONSTER_AGGRO_RANGE doesn't just see the mummy
    // shrug it off and keep wandering.  Re-stamped on every hit, so
    // an active fight keeps the target locked even between proximity
    // checks.  _tickMonsters checks _aggroOverrideUntil first when
    // choosing a target.
    m._aggroOverrideTarget = session.id;
    m._aggroOverrideUntil = Date.now() + 10000;

    // Knockback (client v2.3.222+).  Push the monster directly away
    // from the attacker by kbForce px.  Force ramps with hit type:
    // 60 on special (was 180, reduced 66% per user request), 45 on
    // crit, 30 otherwise.  Clamped to zone bounds so a corner-shove
    // doesn't fling the monster off the map.
    //
    // No AI freeze: the 200 ms _kbUntil lockout used to prevent the
    // monster from chasing back, but combined with monster speed
    // (~22 px/sec) and the player swing cooldown (600 ms), the shove
    // pushed monsters out of the 45 px attack range and they never
    // landed hits between swings -- dmgFromMonster stayed at 0 and
    // lifesteal silently broke.  Monster now resumes chase
    // immediately; visual bounce is briefer but the damage economy
    // works.
    if (attackerPs) {
      const kbForce = payload.special ? 60 : (rolled.isCrit ? 45 : 30);
      const kbAng = Math.atan2(m.y - attackerPs.y, m.x - attackerPs.x);
      m.x += Math.cos(kbAng) * kbForce;
      m.y += Math.sin(kbAng) * kbForce;
      const zoneCfg = this._getZoneConfig(zone);
      if (zoneCfg) {
        const W = zoneCfg.w * this.TILE;
        const H = zoneCfg.h * this.TILE;
        const edgePad = this.TILE;
        m.x = Math.max(edgePad, Math.min(W - edgePad, m.x));
        m.y = Math.max(edgePad, Math.min(H - edgePad, m.y));
      }
    }

    this._markMonsterDirty(zone, m.id);

    // Push damage event for all clients to see
    this.eventBuffer.push({
      type: 'monster_hit',
      payload: {
        monsterId: m.id,
        zone,
        dmg: actualDmg,
        isCrit: rolled.isCrit,
        attackerId: session.id,
        hpPct: Math.max(0, m.hp / m.maxHp),
      }
    });

    // Kill check -- resolution moved VERBATIM to _resolveMonsterKill
    // (v2.3.1114) so the elemental DoT/collision path can share the same
    // contribution/loot/XP/lifesteal pipeline.
    if (m.hp <= 0) this._resolveMonsterKill(zone, m, session.id, attackerPs, slot);
  }

  // v2.3.1114: kill resolution -- moved verbatim from _handleMonsterDamage
  // (session.id -> killerId, attackerPs -> killerPs; behavior-frozen).
  // Shared by weapon kills and elemental DoT/collision kills.  DoT kills
  // pass slot 'dot' so melee lifesteal correctly denies ('not-melee').
  _resolveMonsterKill(zone, m, killerId, killerPs, slot) {
      m.alive = false;
      // v2.3.1127: dungeon-instance monsters never respawn -- a cleared
      // wave must STAY cleared or _tickDungeons can't advance (the
      // respawn check requires respawnAt > 0, so 0 means "stay dead").
      m.respawnAt = m.noRespawn ? 0 : Date.now() + this.RESPAWN_TIME;

      // GDD §7 — contribution-weighted XP/gold distribution.
      // DPS share = dmgByPlayer[id] / m.maxHp.  We also require the
      // recipient to be alive, connected, and still in the kill zone
      // (anyone who tagged the monster then walked away or died forfeits).
      const contributions = m.dmgByPlayer || {};
      const totalShareDenom = Object.values(contributions).reduce((a, b) => a + b, 0) || 1;
      const xpRecipients = [];
      const goldRecipients = [];
      const shares = {};
      for (const [pid, contributed] of Object.entries(contributions)) {
        const ps = this.playerState[pid];
        if (!ps || ps.dead || ps.disconnected || ps.z !== zone) continue;
        const share = contributed / totalShareDenom;
        shares[pid] = share;
        xpRecipients.push(pid);
        // GDD §7: gold cutoff at 0.05 contribution; below → no gold
        if (share >= 0.05) goldRecipients.push(pid);
      }
      // Fallback: if every contributor dropped out (dead/left zone),
      // fall back to last-hit credit so the loot doesn't vanish.
      if (xpRecipients.length === 0) {
        xpRecipients.push(killerId);
        goldRecipients.push(killerId);
        shares[killerId] = 1.0;
      }

      this.eventBuffer.push({
        type: 'monster_kill',
        payload: {
          monsterId: m.id,
          zone,
          killerId: killerId,
          xp: m.xp,
          gold: m.gold,
          level: m.level,
          arch: m.arch,
          element: m.element,
          x: m.x,
          y: m.y,
          // GDD §7 contribution-weighted recipients.  Each gets
          // xp_per_player = m.xp * shares[id], gold_per_player =
          // m.gold * shares[id] if their share >= 0.05.
          recipients: xpRecipients,
          goldRecipients,
          shares,
        }
      });

      // Server-authoritative loot drop.  The pile lives on the worker;
      // clients render it from the broadcast and request pickup via
      // loot_pickup.  Cheaters can't credit themselves coins/inventory
      // without a server-emitted loot_credit acknowledging a valid
      // pickup request (range + recipient + single-claim gates in
      // _handleLootPickup).  The client still applies the credit to
      // local rpg state -- moving that store to the worker is a
      // follow-up slice.
      const pile = this._spawnLootForKill(zone, m, killerId, goldRecipients, shares);
      if (pile) {
        this.eventBuffer.push({
          type: 'loot_drop',
          payload: { pile: this._serializePile(pile) },
        });
      }

      // Server-authoritative combat XP.  For every contribution-weighted
      // recipient (xpRecipients above), apply their share of m.xp to
      // playerState[id].xp + run the level-up loop.  Emit a private
      // combat_credit event so the picker's "+N XP" popup + level-up
      // SFX fire on receive; player_state then carries the new
      // authoritative totals so the client overwrites R.xp / R.level /
      // R.unspentT2.
      for (const rid of xpRecipients) {
        const recipPs = this.playerState[rid];
        if (!recipPs) continue;
        // v2.3.1120: server-authoritative quest kill counters.  Every XP
        // recipient with an active kill-objective quest gets credit (the
        // client used to count EVERY active quest on ANY kill -- kills
        // were advancing trader_2, a gathering quest).  Quest-id keyed,
        // exactly the shape the client predicates read; the flush below
        // echoes it, so the progress UI updates on the same tick.
        this._creditQuestObjective(rid, 'kill', m.arch);
        const share = shares[rid] || 0;
        const xpForRecipient = Math.round((m.xp || 0) * share);
        if (xpForRecipient <= 0) continue;
        const { leveled, levelsGained, newLevel } = this._addCombatXp(recipPs, xpForRecipient);
        // Level-up restores all three pools to max (mirrors the client's
        // existing level-up restore at BroTown.jsx:8973 / 8504 / 9851).
        // Also recompute maxes since level bumps the maxHp formula
        // (each level adds 12 base HP).
        if (leveled) {
          this._recomputeMaxes(recipPs);
          if (typeof recipPs.maxHp === 'number') recipPs.hp = recipPs.maxHp;
          if (typeof recipPs.maxStamina === 'number') recipPs.stamina = recipPs.maxStamina;
          if (typeof recipPs.maxMana === 'number') recipPs.mana = recipPs.maxMana;
        }
        this._saveRpg(rid, recipPs);
        const recipWs = this._wsBySessionId(rid);
        if (recipWs) {
          try {
            recipWs.send(JSON.stringify({
              type: 'combat_credit',
              payload: {
                monsterId: m.id,
                zone,
                xpAmt: xpForRecipient,
                leveled,
                levelsGained,
                newLevel,
              },
            }));
          } catch (e) {}
        }
        this._queuePlayerStateFlush(rid);
      }

      // Melee lifesteal -- refund 90% of net damage the killer took
      // from this monster, if the kill was struck with melee.  Heals
      // the killer (last-hit attribution); party members who tagged
      // but didn't land the kill get nothing.  Mirrors the client's
      // existing applyMeleeLifesteal (slated for removal once this
      // server path is the source of truth).
      // Pass the wire-sent slot through so a desktop slot-select user
      // whose server-side activeSlot didn't get the set_active_slot
      // update still gets the heal on a real melee swing.
      const { refund, reason } = this._applyMeleeLifesteal(killerPs, m.id, slot);
      // Emit lifesteal_credit even when refund is 0 so the client can
      // log the reason and the user can tell whether the gate failed
      // (vs. the heal landing silently because they were already at
      // max hp).
      const killerWs = this._wsBySessionId(killerId);
      if (killerWs) {
        try {
          killerWs.send(JSON.stringify({
            type: 'lifesteal_credit',
            payload: {
              playerId: killerId,
              monsterId: m.id,
              refund,
              reason,
              // Echo the resolved slot + activeSlot so a stale-state
              // debug session has the full picture.
              slot: slot || null,
              activeSlot: (killerPs && killerPs.activeSlot) || null,
            },
          }));
        } catch (e) {}
        if (refund > 0) {
          // Persist the post-heal hp.  Without a fresh _saveRpg the
          // xpRecipients loop above already wrote the pre-heal hp to
          // storage, so a reconnect would reload the lower value.
          this._saveRpg(killerId, killerPs);
          // Push player_state synchronously so the bumped hp lands the
          // same tick instead of waiting for _flushPendingPlayerStates.
          this._sendPlayerState(killerWs, killerId);
        }
      }

      // Clear contribution tracking for the next life of this monster.
      m.dmgByPlayer = {};
  }

  async fetch(request) {
    // Internal lobby probe -- outer worker hits this on each scanned
    // room to read the player count without opening a WebSocket.
    // Predates the Upgrade check so a non-WS request resolves cleanly.
    const url = new URL(request.url);
    if (url.pathname === '/_room_count') {
      return new Response(JSON.stringify({ count: this.getPlayerCount() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // v2.3.1118: marketplace HTTP surface (order book lives in this DO
    // now -- see market.js).  Before the Upgrade check like _room_count.
    if (url.pathname.startsWith('/api/market')) {
      return this._marketFetch(request);
    }
    // v2.3.1126: arena HTTP surface (same fold -- see gladiator.js).
    if (url.pathname.startsWith('/api/arena')) {
      return this._arenaFetch(request);
    }
    // v2.3.1143: account-login pre-flight -- see account.js.
    if (url.pathname.startsWith('/api/account')) {
      return this._accountFetch(request);
    }
    // v2.3.1146: anti-bot evidence read surface (owner-only; 404 unless
    // env.ADMIN_KEY is configured AND presented -- see botfp.js).
    if (url.pathname.startsWith('/api/botstat')) {
      return this._botfpAdminFetch(request);
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    if (this.sessions.size >= this.MAX_PLAYERS) {
      return new Response('Room full', { status: 503 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);
    this.sessions.set(server, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    if (!this.tickInterval && this.sessions.size === 1) this.startTickLoop();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const session = this.sessions.get(ws);
    if (!session) return;
    let msg;
    try { msg = JSON.parse(message); } catch { return; }
    // Reset the AFK clock on real input only.  Pong replies are
    // keepalive heartbeats, not player activity -- counting them would
    // mean the timeout fires only on TCP death, not on AFK players
    // (the original 45 s behavior, which never actually kicked anyone
    // who had a live tab open).
    if (msg.type !== 'pong') session.lastRecv = Date.now();

    switch (msg.type) {
      case 'join':
        // v2.3.1116: identity auth gate.  Runs BEFORE the eviction loop
        // below on purpose -- player ids are broadcast to the whole room
        // (player_join / state_sync), so before this gate existed anyone
        // could read a victim's id off the wire, join with it, evict
        // their live session, AND own their stored progress.  Rules:
        //   - id with a stored auth record: the join must carry the
        //     matching passphrase or it's rejected without touching the
        //     existing session or playerState.
        //   - unregistered id: allowed through (v1 / legacy clients never
        //     send a phrase -- the deploy-order safety property), and the
        //     auth record is stamped when a phrase IS provided, locking
        //     the id from then on.
        if (msg.id) {
          const _authOk = await this._verifyJoinAuth(msg.id, typeof msg.phrase === 'string' ? msg.phrase : null);
          if (!_authOk) {
            try { ws.send(JSON.stringify({ type: 'join_rejected', reason: 'auth' })); } catch {}
            try { ws.close(4003, 'auth'); } catch {}
            this.sessions.delete(ws);
            return;
          }
        }
        // v2.3.702: EVICT any lingering session with the same player id.
        // A reconnect (worker-deploy bounce, iOS tab suspend/resume)
        // re-joins with the same stable passphrase id while the old
        // socket can sit in this.sessions until TCP close or the 2-min
        // AFK sweep.  _wsBySessionId returned the FIRST match -- the
        // corpse -- so every direct-to-player send (lifesteal_credit,
        // combat_credit, harvest_credit, and the synchronous post-heal
        // player_state push) black-holed for up to two minutes.  This
        // is the thrice-recurring "lifesteal broke client-side /
        // missing id" incident (v2.3.462, v2.3.25x, v2.3.701).
        if (msg.id) {
          for (const [oldWs, oldS] of this.sessions) {
            if (oldS.id === msg.id && oldWs !== ws) {
              this.sessions.delete(oldWs);
              try { oldWs.close(1000, 'superseded by reconnect'); } catch {}
            }
          }
        }
        session.id = msg.id;
        session.name = msg.name || 'Anon';
        session.data = msg.data || {};
        // Protocol v2 opt-in.  v2 sessions get delta player_state emits,
        // per-entity monster/node tick deltas, and the merged zone_state
        // message on zone change.  Anything else (older clients) stays
        // on v1 full payloads.
        session.protocolVersion = msg.protocolVersion === 2 ? 2 : 1;
        session.lastPlayerStateSent = {};
        this.playerState[msg.id] = {
          x: 0, y: 0, d: 'down', z: 'town', vx: 0, vy: 0,
          dodging: false, blocking: false, dead: false, disconnected: false,
          ...msg.data
        };
        this.stateHistory[msg.id] = [];
        // v2.3.1146: capture join.device (sent by clients since v2.3.694,
        // never read until now) + hydrate the durable anti-bot summary so
        // reconnect-cycling resets neither the hour caps nor the replay
        // ring.  Await is input-gate-safe (rule 9).
        await this._botfpOnJoin(session, msg);
        /* Load (or bootstrap) the player's server-authoritative
           coins + inventory.  Stored entry wins; if there's no
           record yet, fall back to the values the client sent in
           the join payload (one-time trust at first connection)
           and persist them so subsequent connects use the stored
           value. */
        {
          const stored = await this._loadRpg(msg.id);
          if (stored) {
            this.playerState[msg.id].coins = stored.coins || 0;
            this.playerState[msg.id].inventory = stored.inventory || {};
            this.playerState[msg.id].lifeSkills = stored.lifeSkills || {};
            this.playerState[msg.id].level = stored.level || 1;
            this.playerState[msg.id].xp = stored.xp || 0;
            this.playerState[msg.id].unspentT2 = stored.unspentT2 || 0;
            this.playerState[msg.id].buildPointsThisLvl = stored.buildPointsThisLvl || 0;
            this.playerState[msg.id].hp = typeof stored.hp === 'number' ? stored.hp : 100;
            this.playerState[msg.id].maxHp = typeof stored.maxHp === 'number' ? stored.maxHp : 100;
            this.playerState[msg.id].stamina = typeof stored.stamina === 'number' ? stored.stamina : 100;
            this.playerState[msg.id].maxStamina = typeof stored.maxStamina === 'number' ? stored.maxStamina : 100;
            this.playerState[msg.id].mana = typeof stored.mana === 'number' ? stored.mana : 100;
            this.playerState[msg.id].maxMana = typeof stored.maxMana === 'number' ? stored.maxMana : 100;
            this.playerState[msg.id]._buffs = (stored._buffs && typeof stored._buffs === 'object') ? { ...stored._buffs } : {};
            // Equipment from stored.  v2.3.1104: weapon blobs are
            // re-sanitized on load too -- records persisted before the
            // bootstrap clamp existed may carry forged tierMult values;
            // this heals them on the next reconnect.  Stash truncated
            // to cap.
            this.playerState[msg.id].weapon = this._sanitizeWeapon(stored.weapon);
            this.playerState[msg.id].rangedWeapon = this._sanitizeWeapon(stored.rangedWeapon);
            this.playerState[msg.id].staffWeapon = this._sanitizeWeapon(stored.staffWeapon);
            this.playerState[msg.id].activeSlot = stored.activeSlot || 'melee';
            // v2.3.249: Leather Armor removed from the game.  Strip
            // any persisted leather armor on load so pre-existing saves
            // don't keep echoing it back to the client.
            this.playerState[msg.id].armor = (stored.armor && stored.armor.name === 'Leather Armor') ? null : (stored.armor || null);
            this.playerState[msg.id].shield = stored.shield || null;
            this.playerState[msg.id].amulet = stored.amulet || null;
            this.playerState[msg.id].weaponStash = this._sanitizeWeaponList(stored.weaponStash);
            this.playerState[msg.id]._quests = (stored._quests && typeof stored._quests === 'object') ? { ...stored._quests } : {};
            this.playerState[msg.id]._questFlags = (stored._questFlags && typeof stored._questFlags === 'object') ? { ...stored._questFlags } : {};
            this.playerState[msg.id]._questKills = (stored._questKills && typeof stored._questKills === 'object') ? { ...stored._questKills } : {};
            this.playerState[msg.id].achievementPoints = stored.achievementPoints || 0;
            // Restore the perfect-claim history so the rate-limit
            // window survives reconnects.  Stale entries (>60s old)
            // get pruned on the next _ratedHarvestAccuracy call.
            this.playerState[msg.id]._perfectHistory = Array.isArray(stored._perfectHistory) ? stored._perfectHistory : [];
            this.playerState[msg.id]._cookHistory = Array.isArray(stored._cookHistory) ? stored._cookHistory : [];
            // v2.3.1021: weapon/defense skill track.  These were never
            // persisted before this slice, so an existing player's stored
            // record has none -- fall back to the join payload (their current
            // localStorage copy) the first time, so the migration CAPTURES
            // their trained levels instead of zeroing them.  Once stored, the
            // stored copy wins on every later reconnect.
            const _md = msg.data || {};
            this.playerState[msg.id].weaponSkills = (stored.weaponSkills && Object.keys(stored.weaponSkills).length)
              ? this._sanitizeWeaponSkills(stored.weaponSkills) : this._sanitizeWeaponSkills(_md.rpgWeaponSkills);
            this.playerState[msg.id].weaponUnspent = (stored.weaponUnspent && Object.keys(stored.weaponUnspent).length)
              ? this._sanitizeWeaponUnspent(stored.weaponUnspent) : this._sanitizeWeaponUnspent(_md.rpgWeaponUnspent);
            this.playerState[msg.id].weaponSpecs = (stored.weaponSpecs && Object.keys(stored.weaponSpecs).length)
              ? this._sanitizeWeaponSpecs(stored.weaponSpecs) : this._sanitizeWeaponSpecs(_md.rpgWeaponSpecs);
            this.playerState[msg.id].defenseSkill = (stored.defenseSkill && typeof stored.defenseSkill === 'object')
              ? this._sanitizeDefenseSkill(stored.defenseSkill) : this._sanitizeDefenseSkill(_md.rpgDefenseSkill);
            this.playerState[msg.id].defenseUnspent = (typeof stored.defenseUnspent === 'number')
              ? Math.max(0, Math.min(999, Math.floor(stored.defenseUnspent)))
              : Math.max(0, Math.min(999, Math.floor(Number(_md.rpgDefenseUnspent) || 0)));
            this.playerState[msg.id].defenseSpec = (stored.defenseSpec && Object.keys(stored.defenseSpec).length)
              ? this._sanitizeDefenseSpec(stored.defenseSpec) : this._sanitizeDefenseSpec(_md.rpgDefenseSpec);
          } else {
            // First-connect bootstrap caps.  Stored values (the
            // branch above) win on reconnect; this branch only runs
            // when a player has no DO storage entry yet.  Cheaters
            // who localStorage-tamper before their first ever connect
            // would otherwise inject huge values that then persist
            // forever.  Cap each field at "reasonable migrated SP
            // character" thresholds; legit new players are unaffected
            // (their values are tiny), legit veteran SP players see
            // some progression capped (acceptable trade — the user
            // can raise these caps if they hear complaints).
            // v2.3.910: combat level is now the sum of the build-skill levels
            // (up to 500), so the first-connect cap rises to match.  The level
            // is re-derived from the stat sum on the next stats_update anyway.
            const BOOTSTRAP_LEVEL_CAP = 500;
            const BOOTSTRAP_XP_CAP = 50000;
            const BOOTSTRAP_UT2_CAP = 75;
            const BOOTSTRAP_COINS_CAP = 2000;
            const BOOTSTRAP_INV_PER_ITEM_CAP = 50;
            const BOOTSTRAP_INV_KEY_COUNT_CAP = 100;

            const _rawInv = (msg.data && msg.data.rpgInventory && typeof msg.data.rpgInventory === 'object') ? msg.data.rpgInventory : {};
            const _cappedInv = {};
            let _kc = 0;
            for (const [k, v] of Object.entries(_rawInv)) {
              if (_kc >= BOOTSTRAP_INV_KEY_COUNT_CAP) break;
              const n = Number(v);
              if (!Number.isFinite(n) || n <= 0) continue;
              _cappedInv[k] = Math.min(BOOTSTRAP_INV_PER_ITEM_CAP, Math.floor(n));
              _kc++;
            }

            this.playerState[msg.id].coins = Math.max(0, Math.min(BOOTSTRAP_COINS_CAP,
              (msg.data && typeof msg.data.rpgCoins === 'number') ? Math.floor(msg.data.rpgCoins) : 0));
            this.playerState[msg.id].inventory = _cappedInv;
            this.playerState[msg.id].lifeSkills = (msg.data && msg.data.rpgLifeSkills && typeof msg.data.rpgLifeSkills === 'object') ? { ...msg.data.rpgLifeSkills } : {};
            this.playerState[msg.id].level = Math.max(1, Math.min(BOOTSTRAP_LEVEL_CAP,
              (msg.data && typeof msg.data.rpgLevel === 'number') ? Math.floor(msg.data.rpgLevel) : 1));
            this.playerState[msg.id].xp = Math.max(0, Math.min(BOOTSTRAP_XP_CAP,
              (msg.data && typeof msg.data.rpgXp === 'number') ? Math.floor(msg.data.rpgXp) : 0));
            this.playerState[msg.id].unspentT2 = Math.max(0, Math.min(BOOTSTRAP_UT2_CAP,
              (msg.data && typeof msg.data.rpgUnspentT2 === 'number') ? Math.floor(msg.data.rpgUnspentT2) : 0));
            // build_point_earned dispatches own up to 4 in a flurry on
            // a multi-stat-threshold crossing -- cap at 4 on bootstrap
            // so a cheater can't seed a huge BP carry-over.
            this.playerState[msg.id].buildPointsThisLvl = Math.max(0, Math.min(4,
              (msg.data && typeof msg.data.rpgBuildPointsThisLvl === 'number') ? Math.floor(msg.data.rpgBuildPointsThisLvl) : 0));
            this.playerState[msg.id].hp = (msg.data && typeof msg.data.rpgHp === 'number') ? msg.data.rpgHp : 100;
            this.playerState[msg.id].maxHp = (msg.data && typeof msg.data.rpgMaxHp === 'number') ? msg.data.rpgMaxHp : 100;
            this.playerState[msg.id].stamina = (msg.data && typeof msg.data.rpgStamina === 'number') ? msg.data.rpgStamina : 100;
            this.playerState[msg.id].maxStamina = (msg.data && typeof msg.data.rpgMaxStamina === 'number') ? msg.data.rpgMaxStamina : 100;
            this.playerState[msg.id].mana = (msg.data && typeof msg.data.rpgMana === 'number') ? msg.data.rpgMana : 100;
            this.playerState[msg.id].maxMana = (msg.data && typeof msg.data.rpgMaxMana === 'number') ? msg.data.rpgMaxMana : 100;
            this.playerState[msg.id]._buffs = {};
            // Equipment bootstrap.  v2.3.1104: weapon blobs are now
            // SANITIZED on entry (tierMult clamped to the legit forge
            // range) because server-computed damage (v2.3.912) and
            // sell value both multiply by tierMult -- the old "opaque
            // blobs are harmless" posture stopped being true.
            // Stash truncated to cap to prevent join-time inflation.
            // v2.3.1131: strict=true -- client-supplied blobs are
            // STRIPPED of quality/hardness/temper (they multiply the
            // anti-cheat damage ceiling; a forged godly would raise
            // its own cap).  Stored-blob loads keep the default clamp.
            this.playerState[msg.id].weapon = this._sanitizeWeapon(msg.data && msg.data.rpgWeapon, true);
            this.playerState[msg.id].rangedWeapon = this._sanitizeWeapon(msg.data && msg.data.rpgRangedWeapon, true);
            this.playerState[msg.id].staffWeapon = this._sanitizeWeapon(msg.data && msg.data.rpgStaffWeapon, true);
            this.playerState[msg.id].activeSlot = (msg.data && typeof msg.data.rpgActiveSlot === 'string') ? msg.data.rpgActiveSlot : 'melee';
            // v2.3.249: drop leather armor from the first-connect bootstrap too.
            {
              const _bootArmor = (msg.data && msg.data.rpgArmor && typeof msg.data.rpgArmor === 'object') ? msg.data.rpgArmor : null;
              this.playerState[msg.id].armor = (_bootArmor && _bootArmor.name === 'Leather Armor') ? null : (_bootArmor ? { ..._bootArmor } : null);
            }
            this.playerState[msg.id].shield = (msg.data && msg.data.rpgShield && typeof msg.data.rpgShield === 'object') ? { ...msg.data.rpgShield } : null;
            this.playerState[msg.id].amulet = (msg.data && msg.data.rpgAmulet && typeof msg.data.rpgAmulet === 'object') ? { ...msg.data.rpgAmulet } : null;
            this.playerState[msg.id].weaponStash = this._sanitizeWeaponList(msg.data && msg.data.rpgWeaponStash, true);
            // Quest state bootstrap (slice 17).  Trust shape but not
            // size -- a cheater could pass a 10000-entry _questKills
            // map to inflate storage.  Strip non-numeric values and
            // cap key count.
            const _qK = (msg.data && msg.data.rpgQuestKills && typeof msg.data.rpgQuestKills === 'object') ? msg.data.rpgQuestKills : {};
            const _qKclean = {};
            let _qKc = 0;
            for (const [k, v] of Object.entries(_qK)) {
              if (_qKc >= 50) break;
              const n = Number(v);
              if (Number.isFinite(n) && n >= 0) {
                _qKclean[k] = Math.min(99999, Math.floor(n));
                _qKc++;
              }
            }
            // Cap _quests + _questFlags key counts so a cheater
            // can't fill storage with a 100k-entry map at first
            // connect.  100 keys is well above the known
            // QUEST_CHAINS table size (25 quests) + a generous
            // buffer for flags + future expansion.
            const _capObjKeys = (src) => {
              const out = {};
              if (!src || typeof src !== 'object') return out;
              let n = 0;
              for (const [k, v] of Object.entries(src)) {
                if (n >= 100) break;
                out[k] = v;
                n++;
              }
              return out;
            };
            this.playerState[msg.id]._quests = _capObjKeys((msg.data && msg.data.rpgQuests) || null);
            this.playerState[msg.id]._questFlags = _capObjKeys((msg.data && msg.data.rpgQuestFlags) || null);
            this.playerState[msg.id]._questKills = _qKclean;
            this.playerState[msg.id].achievementPoints = Math.max(0, Math.min(99999,
              (msg.data && typeof msg.data.rpgAchievementPoints === 'number') ? Math.floor(msg.data.rpgAchievementPoints) : 0));
            this.playerState[msg.id]._perfectHistory = [];
            this.playerState[msg.id]._cookHistory = [];
            // v2.3.1021: weapon/defense skill track -- bootstrap from the join
            // payload on first connect (sanitized), then persisted below.
            {
              const _md = msg.data || {};
              this.playerState[msg.id].weaponSkills = this._sanitizeWeaponSkills(_md.rpgWeaponSkills);
              this.playerState[msg.id].weaponUnspent = this._sanitizeWeaponUnspent(_md.rpgWeaponUnspent);
              this.playerState[msg.id].weaponSpecs = this._sanitizeWeaponSpecs(_md.rpgWeaponSpecs);
              this.playerState[msg.id].defenseSkill = this._sanitizeDefenseSkill(_md.rpgDefenseSkill);
              this.playerState[msg.id].defenseUnspent = Math.max(0, Math.min(999, Math.floor(Number(_md.rpgDefenseUnspent) || 0)));
              this.playerState[msg.id].defenseSpec = this._sanitizeDefenseSpec(_md.rpgDefenseSpec);
            }
            await this._saveRpg(msg.id, this.playerState[msg.id]);
          }
          // Session-only equipment-derived values.  Always read from join
          // — recomputed client-side on every recalcDerived.
          this.playerState[msg.id].def = (msg.data && typeof msg.data.rpgDef === 'number') ? Math.max(0, msg.data.rpgDef) : 0;
          this.playerState[msg.id].amuletHpRegen = (msg.data && typeof msg.data.rpgAmuletHpRegen === 'number') ? Math.max(0, msg.data.rpgAmuletHpRegen) : 0;
          this.playerState[msg.id].amuletStaminaRegen = (msg.data && typeof msg.data.rpgAmuletStaminaRegen === 'number') ? Math.max(0, msg.data.rpgAmuletStaminaRegen) : 0;
          this.playerState[msg.id].lastDamageAt = 0;
          this.playerState[msg.id].dying = false;
          this.playerState[msg.id].respawnAt = 0;

          // Raw stats: prefer stored (already-clamped) values; bootstrap
          // from join payload otherwise, clamped to the per-level cap.
          // Cheater spoofing rpgVitality: 99999 on join gets clamped to
          // level * 10 + 20 -- bounded forever after, even on reconnect.
          {
            const _ps = this.playerState[msg.id];
            const _lvl = _ps.level || 1;
            const RAW_STATS = ['power', 'vitality', 'endurance', 'agility', 'mind',
              'ferocity', 'elementalMastery', 'fortification', 'restoration', 'influence'];
            const _storedHasStats = stored && typeof stored.vitality === 'number';
            for (const s of RAW_STATS) {
              if (_storedHasStats && typeof stored[s] === 'number') {
                _ps[s] = stored[s];
              } else {
                const joinKey = 'rpg' + s.charAt(0).toUpperCase() + s.slice(1);
                const joinVal = (msg.data && typeof msg.data[joinKey] === 'number') ? msg.data[joinKey] : 0;
                _ps[s] = this._clampStat(joinVal, _lvl);
              }
            }
            // Server-owned max values: compute from clamped raw stats.
            // Persisted hp / stamina / mana already loaded above; clamp
            // them to the recomputed maxes here.
            this._recomputeMaxes(_ps);
            this._saveRpg(msg.id, _ps);
          }
        }
        // v2.3.1117: drain offline mail (market refunds, trade payouts,
        // wager returns) into the freshly loaded state BEFORE state_sync
        // below, so the first snapshot the client renders already
        // includes the credits.
        await this._drainInbox(msg.id, ws);
        // v2.3.1121: duel bookkeeping on (re)join -- clear a reconnect
        // grace window if this player dropped mid-duel, and kick the
        // rate-limited orphaned-wager sweep (fire-and-forget; refunds
        // land via the inbox path above on the NEXT join).
        this._duelOnRejoin(msg.id);
        this._duelEscrowSweep();
        this._arenaEntrySweep(); // v2.3.1126: refund entries orphaned by a deploy
        this._arenaStakeSweep(); // v2.3.1128: same contract for sponsorship stakes
        // v2.3.1129: load a surviving guard gear lock -- storage-backed
        // so relogging can't shed the punishment (threat.js).
        {
          const _gl = await this.state.storage.get('gearlock:' + msg.id);
          if (_gl && _gl > Date.now() && this.playerState[msg.id]) {
            this.playerState[msg.id]._gearLockUntil = _gl;
          }
        }
        // v2.3.1130: sanitize server-held pets + one-time adoption of
        // legacy client-side captures (see pets.js header).
        this._petsAdoptOnJoin(this.playerState[msg.id], msg.data);
        // v2.3.1125: authoritative clan tag -- the registry overrides
        // whatever the client stuffed in its cosmetics (msg.data is the
        // same object session.data / playerState spread / player_join
        // broadcast all read).  Also the lazy war-resolve hook, and the
        // clan snapshot echo so the client's panel has server truth.
        await this._clansEnsure();
        this._clanStampTag(msg.id, msg.data);
        this._clanStampTag(msg.id, this.playerState[msg.id]);
        this._clanSendState(msg.id);
        this.broadcastExcept(ws, { type: 'player_join', id: msg.id, name: msg.name, data: msg.data });
        // Send current state + monsters for player's zone
        const joinZone = msg.data?.z || 'town';
        const zoneMonsters = (joinZone !== 'town' && joinZone !== 'farm_home') ? this._ensureZoneMonsters(joinZone) : [];
        const zoneNodes = (joinZone !== 'town' && joinZone !== 'farm_home') ? this._ensureZoneNodes(joinZone) : [];
        const zoneLootForJoin = (joinZone !== 'town' && joinZone !== 'farm_home') ? this._zoneLootForWire(joinZone) : [];
        ws.send(JSON.stringify({
          type: 'state_sync',
          // v2.3.1119: capability advertisement.  Clients gate their
          // legacy client-side settlement paths on these flags so old
          // workers keep old behavior (deploy-order safety).  WS-flow
          // capabilities go here; HTTP flows use per-response flags
          // (marketplace settled:true, v2.3.1118).
          caps: { trade: true, questTrack: true, gamble: true, clans: true, arena: true, dungeon: true, sponsor: true, guilds: true, pets: true, harden: true, trade2: true, weaponDrops: true, botfp: true },
          players: this.getAllPlayerData(),
          playerCount: this.getPlayerCount(),
          monsters: zoneMonsters.map(m => ({
            id: m.id, arch: m.arch, level: m.level, element: m.element,
            x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, dmg: m.dmg,
            xp: m.xp, gold: m.gold, spd: m.spd, emoji: m.emoji, color: m.color,
            alive: m.alive,
          })),
          nodes: zoneNodes.map(n => ({
            id: n.id, nodeType: n.nodeType, x: n.x, y: n.y,
            tierLvl: n.tierLvl, alive: n.alive, respawnAt: n.respawnAt,
          })),
          loot: zoneLootForJoin,
          monsterZone: joinZone,
        }));
        /* Authoritative rpg state sync -- the client overwrites its
           local R.coins / R.inventory with whatever's on the worker.
           Bootstrap-from-join (above) means this matches what the
           client just sent on the first connect, and matches the
           stored value on subsequent connects. */
        this._sendPlayerState(ws, msg.id);
        this.broadcastAll({ type: 'player_count', count: this.getPlayerCount() });
        this.reportToLeaderboard(session);
        break;

      case 'move':
        if (session.id && this.playerState[session.id]) {
          const ps = this.playerState[session.id];
          const oldZone = ps.z;
          const newZone = msg.z || ps.z;

          // ═══ Movement validation (anti-teleport) ═══
          //
          // Worker used to trust msg.x / msg.y blindly.  A cheater
          // could write into the move event and warp anywhere -- which
          // bypassed the range checks in _handleLootPickup,
          // _handleNodeStrike, _resolvePvPAttack, and the monster aggro
          // distance (all of those compare against ps.x/y after the
          // overwrite).  Now we cap the per-event position delta to a
          // speed * elapsed-time bound.
          //
          // Client max walk speed (calcMoveSpeed in gameSystems.js):
          //   baseSpd = calcMoveSpeed(agility)/5.0 * SPEED
          //           = (1 + min(agility*0.0012, 0.60)) * 2.5 px/frame
          //   Max ~4 px/frame * 60fps = 240 px/sec.  spdBuff adds 15%
          //   = 276 px/sec.  Dodge / lunge burst ~48 px instantaneously.
          //
          // Cap: 500 px/sec sustained + 80 px burst slack (covers
          // dodge/lunge + a bit of network jitter).  Far below the
          // egregious "teleport across the room" cheat (1024+ px),
          // generous enough for legit lag-recovery jumps.
          //
          // Zone changes legitimately move the player to a new zone's
          // spawn coords -- bypass the check on z-change.  Also bypass
          // on the FIRST move event (no prior position to delta from).
          if (typeof msg.x !== 'number' || typeof msg.y !== 'number') break;
          const _now = Date.now();
          const zoneChanged = newZone !== oldZone;
          const firstMove = typeof ps.lastMoveAt !== 'number';
          let accept = true;
          if (!zoneChanged && !firstMove && typeof ps.x === 'number' && typeof ps.y === 'number') {
            const dt = Math.max(0.001, (_now - ps.lastMoveAt) / 1000);
            const maxDist = 500 * dt + 80;
            const dx = msg.x - ps.x;
            const dy = msg.y - ps.y;
            if (dx * dx + dy * dy > maxDist * maxDist) {
              // Reject: do not update ps.x/y.  Still update lastMoveAt
              // so spam-bursts don't compound dt.  dropped silently --
              // client's next legit move will snap back to server view
              // via the broadcast tick.
              accept = false;
            }
          }
          ps.lastMoveAt = _now;

          // Position + velocity + flags update only on accept.  On
          // reject, ps.z is still updated for zone-change bypasses
          // (those always set accept=true); for non-zone-change
          // rejections, we drop EVERYTHING so a cheater can't flip
          // blocking/dodging/dead while teleporting.
          if (accept) {
            ps.x = msg.x; ps.y = msg.y;
            /* v2.3.1107: accept any DEFINED d/f, not just truthy -- today
               both are non-empty strings so `||` worked, but a future
               numeric encoding (0 = north) would silently stop relaying.
               null/undefined still mean "no update" (client sends f: null
               when it has no facing yet). */
            if (msg.d !== undefined && msg.d !== null) ps.d = msg.d;
            ps.z = newZone;
            ps.vx = msg.vx || 0; ps.vy = msg.vy || 0;
            /* v2.3.840: persist the sender's 8-way facing + live equip so
               the tick can relay them -- peers render the correct jog
               direction and live armour on/off. */
            if (msg.f !== undefined && msg.f !== null) ps.f = msg.f;
            if (msg.eqc !== undefined) ps.eqc = msg.eqc;
            if (msg.eql !== undefined) ps.eql = msg.eql;
            if (msg.eqs !== undefined) ps.eqs = msg.eqs;
            /* v2.3.1092: harvest activity code (mine|chop|fish|cook|fire, or
               null). Pure presentation state relayed to peers so they can see
               this player gathering; not authoritative over loot/XP. */
            if (msg.ex !== undefined) ps.ex = msg.ex || null;
            if (msg.dodging !== undefined) ps.dodging = !!msg.dodging;
            if (msg.blocking !== undefined) ps.blocking = !!msg.blocking;
            if (msg.dead !== undefined) ps.dead = !!msg.dead;
            this.dirtyPlayers.add(session.id);
          }

          // Zone change handling.
          if (ps.z !== oldZone) {
            // Lifesteal damage tracking is per-zone; clear so a kill
            // in the new zone can't refund off old-zone monster IDs.
            ps.dmgFromMonster = {};
            if (ps.z !== 'town' && ps.z !== 'farm_home') {
              // Combat zone -- send the new zone's monster + gather +
              // loot state so the client can render them.
              const newMonsters = this._ensureZoneMonsters(ps.z);
              // Zone-entry damage immunity: replaces the prior
              // ENTRY_SAFE_RADIUS monster-shove (visually janky
              // teleport) with a 1500 ms grace window where incoming
              // damage to the player is zeroed.  _applyDamage reads
              // ps._zoneEntryGraceUntil and short-circuits to 0 dmg /
              // 0 dodge while it's in the future, so monsters can
              // walk/swing as normal but the player has a moment to
              // orient before hits land.
              ps._zoneEntryGraceUntil = Date.now() + this.ZONE_ENTRY_GRACE_MS;
              const zoneMonstersWire = newMonsters.map(m => ({
                id: m.id, arch: m.arch, level: m.level, element: m.element,
                x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, dmg: m.dmg,
                xp: m.xp, gold: m.gold, spd: m.spd, emoji: m.emoji, color: m.color,
                alive: m.alive,
              }));
              const newNodes = this._ensureZoneNodes(ps.z);
              const zoneNodesWire = newNodes.map(n => ({
                id: n.id, nodeType: n.nodeType, x: n.x, y: n.y,
                tierLvl: n.tierLvl, alive: n.alive, respawnAt: n.respawnAt,
              }));
              const zoneLootWire = this._zoneLootForWire(ps.z);
              if (session.protocolVersion === 2) {
                // Protocol v2: one merged snapshot instead of three messages.
                ws.send(JSON.stringify({
                  type: 'zone_state', zone: ps.z,
                  monsters: zoneMonstersWire, nodes: zoneNodesWire, loot: zoneLootWire,
                }));
              } else {
                ws.send(JSON.stringify({
                  type: 'zone_monsters', zone: ps.z, monsters: zoneMonstersWire,
                }));
                ws.send(JSON.stringify({
                  type: 'zone_nodes', zone: ps.z, nodes: zoneNodesWire,
                }));
                ws.send(JSON.stringify({
                  type: 'zone_loot', zone: ps.z, loot: zoneLootWire,
                }));
              }
            } else {
              // Safe zone (town / farm_home) -- explicitly send empty
              // state for all three so the client clears stale entries
              // from the previous combat zone.  Without this, ember
              // monsters / nodes / loot piles persist in the client's
              // S.monsters / S.gatherNodes / S.groundLoot after the
              // player crosses to town, and render on the town map.
              if (session.protocolVersion === 2) {
                ws.send(JSON.stringify({
                  type: 'zone_state', zone: ps.z, monsters: [], nodes: [], loot: [],
                }));
              } else {
                ws.send(JSON.stringify({
                  type: 'zone_monsters', zone: ps.z, monsters: [],
                }));
                ws.send(JSON.stringify({
                  type: 'zone_nodes', zone: ps.z, nodes: [],
                }));
                ws.send(JSON.stringify({
                  type: 'zone_loot', zone: ps.z, loot: [],
                }));
              }
            }
          }
        }
        break;

      case 'pong':
        if (session.lastPing > 0) {
          const sample = Date.now() - session.lastPing;
          session.rtt = session.rtt * (1 - this.LAGCOMP_RTT_ALPHA) + sample * this.LAGCOMP_RTT_ALPHA;
          session.rtt = Math.min(session.rtt, this.LAGCOMP_RTT_CAP);
        }
        break;

      case 'track':
        if (session.id) {
          // v2.3.1125: the registry owns the clan tag -- override the
          // client-supplied cosmetics BEFORE they merge/broadcast (this
          // blind merge was the tag-forgery hole).
          this._clanStampTag(session.id, msg.data);
          session.data = { ...session.data, ...msg.data };
          if (this.playerState[session.id]) Object.assign(this.playerState[session.id], msg.data);
          this.broadcastExcept(ws, { type: 'player_update', id: session.id, data: msg.data });
          this.reportToLeaderboard(session);
        }
        break;

      case 'player_attack':
        if (session.id) {
          this._resolvePvPAttack(session, msg.payload || msg);
        }
        break;

      case 'monster_damage':
        // Client reports damage dealt to a server monster
        if (session.id) {
          this._handleMonsterDamage(session, msg.payload || msg);
        }
        break;

      case 'extraction_start':
        // Client v2.3.229+ -- player tapped a node to begin the
        // windowed-swipe extraction loop.  Server records timing so
        // the eventual node_strike can be validated against the
        // expected open-delay window (see _handleExtractionStart +
        // _handleNodeStrike).
        if (session.id) {
          this._handleExtractionStart(session, msg.payload || msg);
        }
        break;

      case 'node_strike':
        // Client reports the swipe-landed event for an extraction.
        // Server validates timing vs. extraction_start record, treats
        // strikes past the window-close as miss regardless of the
        // accuracy the client claimed, drops too-early strikes as
        // cheats, otherwise applies the existing harvest reward flow.
        if (session.id) {
          this._handleNodeStrike(session, msg.payload || msg);
        }
        break;

      case 'loot_pickup':
        // Client requests to pick up a loot pile.  Server validates
        // (range, recipient, single-claim) and emits a private
        // loot_credit back to the picker with their authorized share.
        if (session.id) {
          this._handleLootPickup(session, msg.payload || msg);
        }
        break;

      case 'stat_allocate':
        // Client requests to spend 1 unspentT2 on a named stat.
        // Server checks ps.unspentT2 > 0 + stat name validity, applies,
        // and emits stat_allocated so the client mirrors the increment.
        if (session.id) {
          this._handleStatAllocate(session, msg.payload || msg);
        }
        break;

      case 'cook_request':
        // Cooking minigame finished; client reports the outcome (kind)
        // and the raw fish key.  Server validates the player has the
        // raw fish, applies the consume + cooked/burnt outcome + cooking
        // XP, and emits player_state.
        if (session.id) {
          this._handleCookRequest(session, msg.payload || msg);
        }
        break;

      case 'stats_update':
        // Client recalcDerived ran (equipment / stat-alloc / level-up
        // changed derived stats); push new maxHp + def + regen mods so
        // the worker's damage math and regen tick use current values.
        if (session.id) {
          this._handleStatsUpdate(session, msg.payload || msg);
        }
        break;

      case 'ability_use':
        // Player triggered a stamina/mana-costing action (dodge / lunge
        // / retreat / swipe).  Server computes cost from ps.maxStamina
        // or the swipe ramp, validates, deducts, and emits player_state.
        if (session.id) {
          this._handleAbilityUse(session, msg.payload || msg);
        }
        break;

      case 'eat_request':
        // Player clicked Eat on a cooked_fish_* inventory item.
        // Server validates ownership, consumes 1, heals hp, emits
        // player_state.
        if (session.id) {
          this._handleEatRequest(session, msg.payload || msg);
        }
        break;

      case 'shop_purchase':
        // Player clicked Buy on the NPC vendor.  Server validates
        // coins + applies effect (pool restore or inventory grant).
        if (session.id) {
          this._handleShopPurchase(session, msg.payload || msg);
        }
        break;

      case 'arena_sponsor':
        // v2.3.1128: spectator stakes on arena matches -- escrowed at
        // placement, settled ONLY off the server-observed result in
        // _arenaOnMatchResolved (the legacy arena_bet relay stays
        // cosmetic; see gladiator.js).
        if (session.id) {
          await this._handleArenaSponsor(session, msg.payload || msg);
        }
        break;

      case 'guild_quest_turn_in':
        // v2.3.1128: guild-quest turn-in -- ladder + level check run
        // against the server's own lifeSkills numbers (see guilds.js;
        // GuildPanel's local mint stays as caps fallback).
        if (session.id) {
          await this._handleGuildTurnIn(session, msg.payload || msg);
        }
        break;

      case 'trade2_open':
        // v2.3.1132: two-sided trade window (trade2.js).  Mutual-open
        // handshake; explicit cases so forged halves meet validation,
        // never the rebroadcast branch.
        if (session.id) this._handleTrade2Open(session, msg.payload || msg);
        break;
      case 'trade2_set':
        if (session.id) this._handleTrade2Set(session, msg.payload || msg);
        break;
      case 'trade2_confirm':
        if (session.id) await this._handleTrade2Confirm(session);
        break;
      case 'trade2_cancel':
        if (session.id) this._handleTrade2Cancel(session);
        break;

      case 'harden_weapon':
        // v2.3.1131: the §4.6c Blacksmith lottery -- gold cost, odds
        // ladder, temper pity bands, all server-rolled (hardening.js).
        if (session.id) {
          await this._handleHardenWeapon(session, msg.payload || msg);
        }
        break;

      case 'pet_capture':
        // v2.3.1130: server-validated capture -- checks the SERVER's
        // monster hp/range, consumes a basic_trap (finally), rolls
        // server-side, and removes the monster for everyone (see
        // pets.js; the client's local roll stays as caps fallback).
        if (session.id) {
          this._handlePetCapture(session, msg.payload || msg);
        }
        break;

      case 'dungeon_start':
        // v2.3.1127: server-authoritative dungeon instances -- the
        // worker validates/clamps the client's Dungeon Workshop config
        // and spawns the run into a private 'dungeon:<id>' zone (see
        // dungeon.js; the client-spawned path stays as caps fallback).
        if (session.id) {
          this._handleDungeonStart(session, msg.payload || msg);
        }
        break;

      case 'gamble_request':
        // v2.3.1124: the Gamble Hall roll -- server rolls and settles
        // (see _handleGambleRequest; the client's own Math.random was
        // the old "house").
        if (session.id) {
          this._handleGambleRequest(session, msg.payload || msg);
        }
        break;

      // v2.3.1125: clan commands -- registry + war referee live in
      // clans.js.  Explicit cases (not relays) so forged messages meet
      // validation instead of the rebroadcast branch.
      case 'clan_create':
        if (session.id) await this._handleClanCreate(session, msg.payload || msg);
        break;
      case 'clan_join_accept':
        if (session.id) await this._handleClanJoinAccept(session, msg.payload || msg);
        break;
      case 'clan_leave':
        if (session.id) await this._handleClanLeave(session);
        break;
      case 'clan_kick':
        if (session.id) await this._handleClanKick(session, msg.payload || msg);
        break;
      case 'clan_war_declare':
        if (session.id) await this._handleClanWarDeclare(session, msg.payload || msg);
        break;

      case 'cook_recipe':
        // Cooking recipe triggered (multi-ingredient -> buff or heal).
        // Server validates ingredient ownership, consumes, applies
        // buff timer to ps._buffs, emits player_state.
        if (session.id) {
          this._handleCookRecipe(session, msg.payload || msg);
        }
        break;

      case 'equip_request':
        // Swap a weaponStash entry with an active equipment slot.
        // Server validates stashIdx + slot name, performs the swap,
        // emits player_state with the new equipment layout.
        if (session.id) {
          this._handleEquipRequest(session, msg.payload || msg);
        }
        break;

      case 'sell_weapon':
        // Sell a weaponStash entry to an NPC for coins.  Server
        // validates ownership + computes sell value, credits coins,
        // emits player_state.
        if (session.id) {
          this._handleSellWeapon(session, msg.payload || msg);
        }
        break;

      case 'unequip_request':
        // Unequip an active equipment slot (weapon -> stash,
        // armor/shield/amulet -> null).
        if (session.id) {
          this._handleUnequipRequest(session, msg.payload || msg);
        }
        break;

      case 'build_point_earned':
        // Client crossed a T1 stat threshold inside addBuildProg.
        // Server increments buildPointsThisLvl and runs the 5-BP-per-
        // level loop (per docs/specs/build-points-gate-server.md).
        // Combat XP no longer gates level-up; only build points do.
        if (session.id) {
          this._handleBuildPointEarned(session);
        }
        break;

      case 'set_active_slot': {
        // Persist the player's chosen weapon slot.  Without this, any
        // subsequent player_state (loot / kill / credit event) would
        // carry the worker's stale activeSlot and revert the client's
        // local cycle.  No broadcast back -- the client already updated
        // locally, and the next server-driven player_state will carry
        // the now-fresh persisted value.
        if (session.id) {
          const ps = this.playerState[session.id];
          if (ps) {
            const slot = msg.payload && msg.payload.slot;
            if (slot === 'melee' || slot === 'ranged' || slot === 'staff') {
              ps.activeSlot = slot;
              this._saveRpg(session.id, ps);
            }
          }
        }
        break;
      }

      case 'forge_weapon':
        // Blacksmith / woodworker forge.  Server validates resource +
        // coin + skill + stat gates, consumes, mints new weapon,
        // swaps old to stash, applies crafting XP.
        if (session.id) {
          this._handleForgeWeapon(session, msg.payload || msg);
        }
        break;

      case 'quest_accept':
        // Player accepted a quest from the NPC dialog.  Server
        // validates the questId + current state, transitions to
        // 'active'.
        if (session.id) {
          this._handleQuestAccept(session, msg.payload || msg);
        }
        break;

      case 'quest_turn_in':
        // Player turning in a completed quest.  Server validates
        // 'active' state + applies reward (gold + xp + AP) + unlocks
        // next in chain.
        if (session.id) {
          this._handleQuestTurnIn(session, msg.payload || msg);
        }
        break;

      default:
        // Critical security gate: the default branch rebroadcasts the
        // message to every client in the room via eventBuffer.  Without
        // a deny-list, a malicious client could forge any server-only
        // event type (player_state hp:0 to kill everyone, player_died
        // to grief, combat_credit to fire fake level-up popups, etc.)
        // and the worker would faithfully rebroadcast it -- every
        // client's WS switch would then trigger the handler for that
        // type, which assumes the event came from the server.
        //
        // Anything the worker emits itself (player_state, player_died,
        // _credit fan-outs, monster_* events, loot_* events, tick,
        // state_sync, etc.) is privileged: never accept it from a
        // client.  Legitimate client→client broadcasts (chat, emote,
        // pvp_confirmed, player_shield, player_died_to_monster, etc.)
        // still flow through here -- they hit the deny-list miss and
        // get rebroadcast normally.
        if (PRIVILEGED_EVENTS.has(msg.type)) break;
        if (session.id) {
          // v2.3.1119: trades keep the relay handshake but the room now
          // settles them -- the intercept validates at commit, moves the
          // goods, and annotates the accept with settled:true (or drops
          // forged/replayed accepts entirely).  Null means "don't relay".
          if (msg.type === 'trade_offer' || msg.type === 'trade_accept') {
            msg = await this._interceptTrade(session.id, msg);
            if (!msg) break;
          }
          // v2.3.1121: duels are a real server machine now (escrowed
          // wagers, no-drop kills, reconnect grace -- see duel.js).
          // The intercept validates/activates and annotates the accept,
          // or drops forged handshakes.  Null means "don't relay".
          if (msg.type === 'duel_request' || msg.type === 'duel_wager_request'
            || msg.type === 'duel_accept' || msg.type === 'duel_decline') {
            msg = await this._interceptDuel(session.id, msg);
            if (!msg) break;
          }
          // v2.3.1125: clan_invite stays a relay (the target's popup
          // UI renders it) -- record the pending half so a later
          // clan_join_accept can be validated per-sender-session.
          if (msg.type === 'clan_invite') {
            await this._observeClanInvite(session.id, msg);
          }
          // v2.3.1129: the threat handshake is a real machine now
          // (threat.js) -- server countdown/cooldown, ignore/expiry
          // consent, Call Guards levy + gear lock.  The intercept
          // validates and annotates, or drops forged/expired/
          // cooldown-blocked halves.  Null means "don't relay".
          if (msg.type === 'pvp_threat' || msg.type === 'threat_response') {
            msg = await this._interceptThreat(session.id, msg);
            if (!msg) break;
          }
          msg.from = session.id;
          this.eventBuffer.push(msg);
        }
        break;
    }
  }

  // §16.12 — Attacker-favored rollback PvP resolution
  _resolvePvPAttack(attackerSession, payload) {
    const attackerId = attackerSession.id;
    const attackerPs = this.playerState[attackerId];
    if (!attackerPs) return;

    // Calculate rewind depth from attacker's RTT
    const halfRtt = attackerSession.rtt / 2;
    const rewindTicks = Math.min(Math.ceil(halfRtt / this.TICK_RATE), this.LAGCOMP_BUFFER_TICKS);

    // Gate: dead / dying / disconnected attackers can't keep firing
    // PvP hits.  Other handlers (ability_use, eat_request, etc.) all
    // gate on these flags; PvP was missing the check.
    if (attackerPs.dying || attackerPs.dead || attackerPs.disconnected) return;
    // Bound the client-supplied attack geometry so a cheater can't
    // claim a 99999-pixel range or full-circle arc to hit every player
    // in the room.  Realistic max: bow range = 200 + amulet bonus,
    // greatsword arc = PI*0.85 ≈ 2.67 rad.  Cap a bit above those.
    const range = Math.max(10, Math.min(250, payload.range || 40));
    const arc = Math.max(0.1, Math.min(Math.PI * 1.1, payload.arc || 1.2));
    const angle = payload.angle || 0;
    // Weapon-aware cap (slice 16) -- mirrors monster_damage cap above.
    // Server now owns the weapon table so the bound is tighter than
    // the previous level-only formula.  Pass payload.special if the
    // PvP attack is a swipe so the Mind-scaled cap applies.
    const dmgCap = this._maxDmgForAttacker(attackerPs, !!payload.special);
    const dmgBase = Math.max(1, Math.min(dmgCap, payload.dmgBase || 10));
    const critChance = Math.max(0, Math.min(100, payload.critChance || 0));

    // Check all players in room for hits
    for (const [targetId, targetPs] of Object.entries(this.playerState)) {
      if (targetId === attackerId) continue;
      if (targetPs.z !== attackerPs.z) continue; // different zone
      if (targetPs.dead || targetPs.disconnected) continue;
      // v2.3.1116: consent gate.  Damage lands only in lawless zones
      // (data.js ZONES flag) or between a consented pair (duel /
      // accepted threat).  Town and any unknown zone fail CLOSED --
      // town was never in ZONES, and before this gate that meant "no
      // rule at all": anyone could gank anyone in town with a full
      // death-pile drop.  Duels still work in town via the pair.
      if (!this._pvpAllowed(attackerId, targetId, attackerPs.z)) continue;

      // §16.12 — Look up target's historical state
      const history = this.stateHistory[targetId];
      let checkState = targetPs; // fallback: current state
      if (history && history.length > 0) {
        const idx = Math.max(0, history.length - 1 - rewindTicks);
        checkState = history[idx] || targetPs;
      }

      // Range check against historical position
      const dx = checkState.x - attackerPs.x;
      const dy = checkState.y - attackerPs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range) continue;

      // Arc check
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > arc / 2) continue;

      // §16.12 — Resolve dodge/block against historical state
      if (checkState.dodging) continue; // was in i-frames from attacker's perspective

      let blocked = false;
      if (checkState.blocking) blocked = true;

      // Crit roll
      const isCrit = Math.random() * 100 < critChance;

      // Apply HP damage server-side.  Per Phase 2 of the T1/T2 spec,
      // a blocked hit is full invuln (was 0.25× partial), so pass
      // isBlock=true straight through.  Phase 4 dodge rolls inside
      // _applyDamage independently of block.
      const rawDmg = dmgBase * (isCrit ? 1.5 : 1);
      const dmgResult = this._applyDamage(targetPs, rawDmg, blocked);
      const dmgTaken = dmgResult.dmgTaken;

      // Build hit event — server-authoritative hp now mirrors via
      // player_state below, but dmgTaken in the payload drives the
      // damage popup so it doesn't have to wait a round-trip.
      const hitEvent = {
        type: 'pvp_hit',
        payload: {
          attacker: attackerId,
          attackerName: attackerSession.name,
          target: targetId,
          dmgBase: dmgBase,
          dmgTaken,
          isCrit: isCrit,
          blocked: blocked,
          dodged: dmgResult.dodged,
          // v2.3.1137: Second Wind fires in PvP too (channel identity);
          // undefined when 0 so the field stays off the wire.
          secondWind: dmgResult.secondWind || undefined,
          ts: Date.now(),
          rewindTicks: rewindTicks,
        }
      };
      this.eventBuffer.push(hitEvent);

      // Echo authoritative hp + death check.
      this._saveRpg(targetId, targetPs);
      this._queuePlayerStateFlush(targetId);
      if (targetPs.hp <= 0 && !targetPs.dying) {
        this._handlePlayerDeath(targetPs, targetId, 'pvp:' + attackerId);
      }
    }
  }

  async webSocketClose(ws) {
    const session = this.sessions.get(ws);
    if (session?.id) {
      if (this.playerState[session.id]) this.playerState[session.id].disconnected = true;
      delete this.playerState[session.id];
      delete this.stateHistory[session.id];
      delete this.extractions[session.id];
      this.dirtyPlayers.delete(session.id);
      // v2.3.1121: an active duel gets a 15s reconnect grace (iOS tab
      // suspends and deploy bounces are routine) before _tickDuels
      // forfeits it -- so this runs BEFORE the consent clear, which
      // would otherwise end the fight unconditionally.
      this._duelOnDisconnect(session.id);
      this._trade2OnDisconnect(session.id); // v2.3.1132: a dropped party cancels the window
      this._botfpFlush(session); // v2.3.1146: final botstat: write so evidence survives the disconnect
      this._clearPvpConsent(session.id); // v2.3.1116: consent doesn't survive a disconnect
      this.broadcastAll({ type: 'player_leave', id: session.id });
      this.broadcastAll({ type: 'player_count', count: this.getPlayerCount() - 1 });
    }
    this.sessions.delete(ws);
    if (this.sessions.size === 0 && this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
  }

  async webSocketError(ws) { this.webSocketClose(ws); }

  startTickLoop() {
    let pingCounter = 0;
    let regenCounter = 0;

    this.tickInterval = setInterval(() => {
      // §16.12 — Snapshot player states to history buffer
      for (const [id, ps] of Object.entries(this.playerState)) {
        if (!this.stateHistory[id]) this.stateHistory[id] = [];
        this.stateHistory[id].push({
          x: ps.x, y: ps.y, d: ps.d, z: ps.z,
          dodging: ps.dodging || false,
          blocking: ps.blocking || false,
          dead: ps.dead || false,
          tick: this.tickSeq,
        });
        if (this.stateHistory[id].length > this.LAGCOMP_BUFFER_TICKS) {
          this.stateHistory[id].shift();
        }
      }

      // Monster AI tick
      this._tickMonsters();

      // Gather-node respawn tick (cheap; iterates Object.keys(this.nodes))
      this._tickNodes();

      // Loot pile expiry tick -- piles older than LOOT_EXPIRY_MS get
      // despawned with a broadcast event so clients drop them too.
      this._tickLoot();

      // Extraction state sweep -- walk-away cancel is silent on the
      // client so any extraction_start without a matching node_strike
      // sits in this.extractions until cleaned here.
      this._sweepStaleExtractions(Date.now());

      // Player respawn tick — flip dying=>alive when respawnAt elapses.
      // Cheap; iterates active player entries.
      this._tickPlayerRespawn();

      // v2.3.1121: duel housekeeping — expire stale challenges, enforce
      // the 15s reconnect-grace forfeit.  Cheap map walks.
      this._tickDuels(Date.now());

      // v2.3.1125: clan-war endings (30-min timer; also resolved lazily
      // on wake for wars that end in an empty room).
      this._tickClanWars(Date.now());

      // v2.3.1126: arena housekeeping -- gather timer, deferred match
      // activation, post-completion cleanup.
      this._tickArena(Date.now());

      // v2.3.1127: dungeon instances -- wave advancement on all-dead,
      // boss spawn, completion settlement, empty-instance sweep.
      this._tickDungeons(Date.now());

      // v2.3.1129: unanswered threat countdowns expire as "ignored"
      // (consent pair granted, both sides notified).
      this._tickThreats(Date.now());

      // v2.3.1132: expire idle two-sided trade sessions + invites.
      this._tickTrades2(Date.now());

      // HP regen tick — every 30 server ticks (~670 ms at TICK_RATE=22).
      // Skip when no one needs healing to avoid wasted iteration.
      regenCounter++;
      if (regenCounter >= 30) {
        regenCounter = 0;
        this._tickPlayerRegen();
      }

      // §16.8 aggregated player_state flush.  Tick-path mutations
      // (monster attacks, regen, respawn, combat XP) queue here
      // instead of emitting per-mutation, so multiple per-tick
      // updates to the same player collapse to one wire emit.
      this._flushPendingPlayerStates();

      // Periodic ping for RTT estimation + idle-session eviction (every ~3s at 30Hz)
      pingCounter++;
      if (pingCounter >= 90) {
        pingCounter = 0;
        const nowMs = Date.now();
        const pingMsg = JSON.stringify({ type: 'ping', ts: nowMs });
        for (const [ws, session] of this.sessions) {
          if (nowMs - session.lastRecv > this.IDLE_TIMEOUT_MS) {
            try { ws.close(1000, 'idle timeout'); } catch {}
            continue;
          }
          session.lastPing = nowMs;
          try { ws.send(pingMsg); } catch {}
        }
      }

      const hasDirty = this.dirtyPlayers.size > 0;
      const hasEvents = this.eventBuffer.length > 0;
      const hasMonsters = this.dirtyMonsters.size > 0;
      const hasNodes = this.dirtyNodes.size > 0;
      if (!hasDirty && !hasEvents && !hasMonsters && !hasNodes) { this.tickSeq++; return; }

      // Build single room-wide tick delta
      const delta = { type: 'tick', seq: this.tickSeq++, ts: Date.now() };

      // Batched player positions (only dirty)
      if (hasDirty) {
        const players = {};
        for (const id of this.dirtyPlayers) {
          const ps = this.playerState[id];
          if (ps) players[id] = { x: ps.x, y: ps.y, d: ps.d, z: ps.z, vx: ps.vx, vy: ps.vy, f: ps.f, eqc: ps.eqc, eql: ps.eql, eqs: ps.eqs, ex: ps.ex };
        }
        delta.players = players;
        this.dirtyPlayers.clear();
      }

      // Batched game events (capped)
      if (hasEvents) {
        delta.events = this.eventBuffer.length <= this.EVENTS_PER_TICK_CAP
          ? this.eventBuffer
          : this.eventBuffer.slice(0, this.EVENTS_PER_TICK_CAP);
        this.eventBuffer = [];
      }

      // Monster + node deltas are protocol-versioned: v1 sessions get
      // every entity in each dirty zone (legacy behavior); v2 sessions
      // get only the entities marked dirty this tick (client merges by
      // id, so unsent entries keep their last-known state).  Build each
      // variant only when a session of that version is connected.
      let hasV1 = false, hasV2 = false;
      for (const [, s] of this.sessions) {
        if (s.protocolVersion === 2) hasV2 = true; else hasV1 = true;
      }

      const monsterWire = (m) => ({
        id: m.id, x: Math.round(m.x), y: Math.round(m.y),
        hp: m.hp, alive: m.alive,
      });
      // Gather-node deltas carry only state-change fields (alive /
      // respawnAt).  The full node payload (type / x / y / tierLvl) is
      // sent once at state_sync or zone change; the client already has
      // the position.
      const nodeWire = (n) => ({ id: n.id, alive: n.alive, respawnAt: n.respawnAt });

      let msgV1 = null, msgV2 = null;
      if (hasV1) {
        const v1 = { ...delta };
        if (hasMonsters) {
          const mData = {};
          for (const zoneId of this.dirtyMonsters) {
            const monsters = this.monsters[zoneId];
            if (!monsters) continue;
            mData[zoneId] = monsters.map(monsterWire);
          }
          v1.monsters = mData;
        }
        if (hasNodes) {
          const nData = {};
          for (const zoneId of this.dirtyNodes) {
            const list = this.nodes[zoneId];
            if (!list) continue;
            nData[zoneId] = list.map(nodeWire);
          }
          v1.nodes = nData;
        }
        msgV1 = JSON.stringify(v1);
      }
      if (hasV2) {
        const v2 = { ...delta };
        if (hasMonsters) {
          const mData = {};
          for (const zoneId of this.dirtyMonsters) {
            const monsters = this.monsters[zoneId];
            const ids = this.dirtyMonsterIds[zoneId];
            if (!monsters || !ids) continue;
            const changed = monsters.filter((m) => ids.has(m.id));
            if (changed.length > 0) mData[zoneId] = changed.map(monsterWire);
          }
          if (Object.keys(mData).length > 0) v2.monsters = mData;
        }
        if (hasNodes) {
          const nData = {};
          for (const zoneId of this.dirtyNodes) {
            const list = this.nodes[zoneId];
            const ids = this.dirtyNodeIds[zoneId];
            if (!list || !ids) continue;
            const changed = list.filter((n) => ids.has(n.id));
            if (changed.length > 0) nData[zoneId] = changed.map(nodeWire);
          }
          if (Object.keys(nData).length > 0) v2.nodes = nData;
        }
        msgV2 = JSON.stringify(v2);
      }
      this.dirtyMonsters.clear();
      this.dirtyNodes.clear();
      this.dirtyMonsterIds = {};
      this.dirtyNodeIds = {};

      for (const [ws, s] of this.sessions) {
        const msg = s.protocolVersion === 2 ? msgV2 : msgV1;
        if (msg) { try { ws.send(msg); } catch {} }
      }
    }, this.TICK_RATE);
  }

  async reportToLeaderboard(session) {
    try {
      const stub = this.env.LEADERBOARD.get(this.env.LEADERBOARD.idFromName('global'));
      await stub.fetch(new Request('https://internal/api/leaderboard/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: session.id, name: session.name || session.data?.name || 'Anon',
          color: session.data?.color || '#5b52ff', level: session.data?.rpgLv || 1,
          rpgData: session.data?.rpgData || {}, ts: Date.now(),
        }),
      }));
    } catch {}
  }

  broadcastAll(msg) { const s = JSON.stringify(msg); for (const [ws] of this.sessions) { try { ws.send(s); } catch {} } }
  broadcastExcept(ex, msg) { const s = JSON.stringify(msg); for (const [ws] of this.sessions) { if (ws !== ex) { try { ws.send(s); } catch {} } } }
  getAllPlayerData() { const r = {}; for (const [, s] of this.sessions) { if (s.id) r[s.id] = { ...this.playerState[s.id], name: s.name, ...s.data }; } return r; }
  getPlayerCount() { let c = 0; for (const [, s] of this.sessions) { if (s.id) c++; } return c; }
}

// v2.3.1118: mix the marketplace methods into GameRoom (see the
// market.js header for the fold rationale + re-extraction path).
Object.assign(GameRoom.prototype, marketMethods);
// v2.3.1119: trade settlement mixin (same pattern).
Object.assign(GameRoom.prototype, tradeMethods);
// v2.3.1121: duel machine mixin.
Object.assign(GameRoom.prototype, duelMethods);
// v2.3.1125: clan registry + war referee mixin.
Object.assign(GameRoom.prototype, clanMethods);
// v2.3.1126: gladiator arena mixin.
Object.assign(GameRoom.prototype, arenaMethods);
// v2.3.1127 (PR12): instanced dungeons -- see dungeon.js.
Object.assign(GameRoom.prototype, dungeonMethods);
// v2.3.1128 (PR11): guild-quest verification -- see guilds.js.
Object.assign(GameRoom.prototype, guildMethods);
// v2.3.1129 (PR13): threat machine -- see threat.js.
Object.assign(GameRoom.prototype, threatMethods);
// v2.3.1130 (PR14): pet capture -- see pets.js.
Object.assign(GameRoom.prototype, petMethods);
// v2.3.1131 (PR15): quality + hardening -- see hardening.js.
Object.assign(GameRoom.prototype, hardeningMethods);
// v2.3.1132 (PR16): two-sided trade window -- see trade2.js.
Object.assign(GameRoom.prototype, trade2Methods);
// v2.3.1143: account-login pre-flight -- see account.js.
Object.assign(GameRoom.prototype, accountMethods);
// v2.3.1146: behavioral anti-bot for life skills (flag-only) -- see botfp.js.
Object.assign(GameRoom.prototype, botfpMethods);
