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
  ARCHETYPES, ZONES,
  AMULET_TIER_POWER,
  MONSTER_HP_CURVE, RARITY_TIERS, DAMAGE_CHANNEL_PCT,
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
// v2.3.1148: operator toolkit -- owner-keyed admin API + daily rpg
// snapshot ring (see admin.js header + docs/OPERATIONS.md).
import { adminMethods } from './admin.js';
// v2.3.1149: time-cadence framework -- lazy daily/weekly settlement
// under the no-alarms constraint (see cadence.js header).
import { cadenceMethods } from './cadence.js';
// v2.3.1150: live-ops rail -- flags/kill-switches, announcements/MOTD,
// daily economy metrics (see liveops.js header).
import { LIVEOPS, liveopsMethods } from './liveops.js';
// v2.3.1152: save-format migration registry (run in _loadRpg; _saveRpg
// stamps _v = RPG_SCHEMA_VERSION -- the one blessed rule-1 exception).
// v2.3.1132 (PR16): two-sided trade window -- both-stage-both-confirm
// sessions on the validate-at-commit core (the gift handshake in
// trade.js stays untouched for old clients; see trade2.js header).
import { trade2Methods } from './trade2.js';
// v2.3.1143: account-login pre-flight -- read-only Login Key check so
// the client can validate a typed key before switching identity.
import { accountMethods } from './account.js';
// v2.3.1146: behavioral anti-bot for life skills (flag-only) -- see botfp.js.
import { botfpMethods } from './botfp.js';
// v2.3.1162 (P4 decomposition): quest accept/credit/turn-in -- see quests.js.
import { questMethods } from './quests.js';
// v2.3.1164 (P4 decomposition): server-settled Gamble Hall roll -- see gamble.js.
import { gambleMethods } from './gamble.js';
// v2.3.1165 (P4 decomposition): inbox + escrow settlement primitives
// (the PR2 plumbing every economy system builds on) -- see inbox.js.
import { inboxMethods } from './inbox.js';
// v2.3.1166 (P4 decomposition): cooking / eating / NPC shop -- see cooking.js.
import { cookingMethods } from './cooking.js';
// v2.3.1168 (P4 decomposition): gather nodes + harvest + extraction validation -- see gathering.js.
import { gatheringMethods } from './gathering.js';
// v2.3.1169 (P4 decomposition): equipment store (sanitizers/sell/forge/equip) -- see gear.js.
import { gearMethods } from './gear.js';
// v2.3.1170 (P4 decomposition): build grids + progression + stats_update -- see grids.js.
import { gridMethods } from './grids.js';
// v2.3.1171 (P4 decomposition): the move handler (anti-teleport + zone streaming) -- see movement.js.
import { movementMethods } from './movement.js';
// v2.3.1172 (P4 decomposition): rpg-blob load/save + player_state emit -- see persistence.js.
import { persistenceMethods } from './persistence.js';
// v2.3.1173 (P4 decomposition): identity gate + join bootstrap -- see join.js.
import { joinMethods } from './join.js';
// v2.3.1174 (P4 decomposition): the 45Hz tick loop -- see tick.js.
import { tickMethods } from './tick.js';
// v2.3.1176: per-session tokens for the mutating HTTP economy
// endpoints (market place/cancel, arena join/leave) -- see httpauth.js.
import { httpAuthMethods } from './httpauth.js';

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
      // v2.3.1176: the public route is READ-ONLY.  POST /update trusted
      // a client-supplied playerId + rpgData blob (a free leaderboard-
      // row forge); no client has posted it since the GameRoom started
      // reporting server-side (reportToLeaderboard on track/join, via
      // the DO binding -- which bypasses this router and keeps working).
      if (request.method !== 'GET') {
        return new Response(JSON.stringify({ ok: false, error: 'Read-only' }), { status: 405, headers: corsHeaders });
      }
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

    // v2.3.1148: operator toolkit -- routes into the GameRoom that owns
    // the blobs (same ?room= resolution as /ws and /api/market).  Auth
    // happens INSIDE the DO against env.ADMIN_KEY; with no secret
    // configured the surface 404s (fail closed).
    if (url.pathname.startsWith('/api/admin')) {
      const admRoom = url.searchParams.get('room') || 'brotown-1';
      return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(admRoom)).fetch(request);
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
// v2.3.1151: exported so test/wire-audit.test.mjs can verify every
// server-emitted type is registered here (rule 13's mechanical check).
export const PRIVILEGED_EVENTS = new Set([
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
  // v2.3.1149: jackpot pool state is private; the draw result is a
  // server-only broadcast (forging it would announce fake winners).
  'jackpot_state', 'jackpot_result',
  // v2.3.1150: operator announcements -- deliberately NOT riding the
  // un-privileged 'chat' relay (any client could impersonate the
  // server there); this type is forgeable only by the worker.
  'server_announce',
  // v2.3.1132: two-sided trade session echoes (server-truth renderer).
  'trade2_state', 'trade2_invite',
  // Combat resolution
  'monster_attack', 'monster_hit', 'monster_kill', 'pvp_hit',
  // v2.3.1147: server-emitted since the mummy->skeleton transform moved
  // server-side (v2.3.856 era) but never deny-listed -- a client could
  // forge cosmetic transforms on everyone's screen.  Closed.
  'monster_transform',
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
    this.LOOT_PICKUP_RANGE = 160; // px; was 30 -> 60 -> 90 -> 160 (v2.3.1161, the snowman "out of range" playtest report).  The legit "loot is at my feet" geometry stacks: the pile spawns at the MONSTER's center (a large sprite puts that ~40-60 px from where the killer stands), client magnetism pulls the pile visually up to 50 px toward the player (render-only + server-anchored since v2.3.1161, groundLoot.js), and the server's view of the player position lags the client's move throttle by up to ~50 px mid-walk.  Sum ~150 px; 160 accepts it with margin while staying far under cross-screen theft range.
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
      // v2.3.1147: verdant/mist populated -- tinted reskins of existing
      // sheets (client MONSTER_VARIANTS carries the tint; stats stay
      // 100% base-archetype).  Keep in sync with ZONE_VARIANT_MAP.
      verdant: { fodder: 'mossSlime', brute: 'thornShambler' },
      mist: { fodder: 'mireWisp', brute: 'bogLurker' },
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
      // v2.3.1147: the new verdant/mist reskins.  Fodder skins keep the
      // fodder base 0.5; the brute skins run at 0.5 like the client's
      // fishman/rockmonster cfg (NOTE: legacy tidal/hollows brutes have
      // no entry here and move at brute base 0.35 -- a pre-existing
      // client/server speed disagreement documented in the client cfg;
      // left untouched to avoid changing shipped zones' feel).
      mossSlime: 0.5,
      mireWisp: 0.5,
      thornShambler: 0.5,
      bogLurker: 0.5,
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
        // v2.3.1147: entrance ramp -- the shallowest 15% of a zone
        // spawns up to 4 levels BELOW the band floor so walking into a
        // mid/high band isn't an instant wall (hollows entry reads
        // L34-38 instead of flat 38).  Mirrors spawnMonstersForZone in
        // src/data/gameSystems.js; the client's applyZoneVariant level
        // clamp was relaxed to minLv-4 to match.
        const ramp = depthPct < 0.15 ? Math.round((1 - depthPct / 0.15) * 4) : 0;
        const lvl = Math.max(1, Math.round(baseLvl + depthPct * (maxLvl - baseLvl)) - ramp);
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
              // v2.3.1153: × Bulwark block-stamina efficiency (−1%/pt,
              // cap −50%).  The exact cost rides the wire as
              // staminaDrain below, so pre-fix clients render the
              // discounted number correctly with zero client changes.
              const blockerPs = this.playerState[nearest.id];
              const staminaCost = Math.max(1, Math.round(15 * this._blockStaminaMult(blockerPs)));
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
                  Math.max(1, Math.round(m.dmg * Math.min(0.50, _thornsPts * 0.005)))); // v2.3.1156: 0.5%/pt (cap raise)
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

  // ═══ Gather nodes ═══ moved to gathering.js (v2.3.1168, P4
  // decomposition) -- node spawn/respawn lifecycle, harvest math,
  // and the life-skill XP curve live in gatheringMethods, mixed
  // into this prototype below.

  // ═══ Combat XP / build-point level-up / T2 allocation ═══ moved
  // to grids.js (v2.3.1170, P4 decomposition) -- _xpRequiredForLevel,
  // _addCombatXp, _tryLevelUpFromBuildPoints, _handleBuildPointEarned,
  // and _handleStatAllocate live in gridMethods, mixed into this
  // prototype below.

  // ═══ Eating cooked fish ═══ moved to cooking.js (v2.3.1166, P4
  // decomposition) -- _fishHealAmount + _handleEatRequest live in
  // cookingMethods, mixed into this prototype below.

  // ═══ Equipment store ═══ moved to gear.js (v2.3.1169, P4
  // decomposition) -- slots doc + _weaponBase live in gearMethods,
  // mixed into this prototype below.  The weapon build-CHANNEL
  // helpers below STAY here: they are combat-damage inputs owned
  // by the combat region.

  // v2.3.912: weapon build-CHANNEL resolution (mirrors WEAPON_CHANNELS in
  // src/data/gameSystems.js).  Only the damage + crit channels are live.  The
  // client clamps each channel value to [0,99]; so do we on stats_update.
  // greatsword shares the 'sword' (melee) category, per WEAPON_CATEGORY.
  _wpnCat(type) {
    const C = { greatsword: 'sword', sword: 'sword', bow: 'bow', staff: 'staff' };
    return C[type] || 'sword';
  }
  // Damage-channel POINT total for the type's category (edge / drawPower /
  // spellPower) — mirror gameSystems.js weaponDamageBonusFor.
  // v2.3.1153: was a flat +1/pt added PRE-tierMult, which priced 99 pts at
  // ~+725% DPS mid-band (BALANCE-PLAN §4 outlier, ~10x every %-channel).
  // Now returns raw points; _computeAttackDamage applies
  // ×(1 + pts × DAMAGE_CHANNEL_PCT) — tier-independent +0.5%/pt, +49.5%
  // at 99, just above the crit pair so the damage channel stays the
  // category ceiling (CH-01).  Spent points were refunded to
  // weaponUnspent by the refund-damage-channels migration.
  _wpnDmgChannel(ps, type) {
    const K = { sword: 'edge', bow: 'drawPower', staff: 'spellPower' };
    const cat = this._wpnCat(type);
    return (ps && ps.weaponSpecs && ps.weaponSpecs[cat] && ps.weaponSpecs[cat][K[cat]]) || 0;
  }
  // Crit-channel point total (precision / marksmanship / overload).
  _wpnCritPts(ps, type) {
    const K = { sword: 'precision', bow: 'marksmanship', staff: 'overload' };
    const cat = this._wpnCat(type);
    return (ps && ps.weaponSpecs && ps.weaponSpecs[cat] && ps.weaponSpecs[cat][K[cat]]) || 0;
  }
  // v2.3.1133: crit-DMG-channel point total (executioner / headshot / focus)
  // — mirrors client weaponSpecs reads; feeds the crit multiplier
  // (v2.3.1157: +1.2%/pt, +120% at the 100-pt cap — UN-01 parity retune),
  // replacing the retired Ferocity amp.
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
    // v2.3.1156: clamp 99 -> 100 with the uniform cap (ceiling 1.50).
    const pts = (ps && ps.weaponSpecs && ps.weaponSpecs.staff && ps.weaponSpecs.staff.attunement) || 0;
    return 1 + Math.min(100, pts) * 0.005;
  }
  // v2.3.1153: BULWARK repurposed — block stamina efficiency, −1%/pt on
  // both block stamina costs (per-blocked-hit AND shield-hold drain),
  // cap −50% at the [0,50] defenseSpec clamp.  The channel's original
  // block-%-mitigation identity died when full-block-invuln shipped
  // (owner directive, v2.3.232; reaffirmed 2026-07-03 — blocks stay
  // 100%), leaving Bulwark inert since v2.3.1021.  New identity: "hold
  // your shield twice as long, block twice as many hits."  defenseSpec
  // is client-trained but server-clamped, so the discount is bounded.
  _blockStaminaMult(ps) {
    // v2.3.1156: 0.5%/pt (halved with the 50 -> 100 cap raise; the
    // −50% cap value is unchanged).
    const pts = (ps && ps.defenseSpec && ps.defenseSpec.bulwark) || 0;
    return 1 - Math.min(0.50, Math.min(100, pts) * 0.005);
  }

  // ═══ Weapon sanitizers + sell ═══ moved to gear.js (v2.3.1169,
  // P4 decomposition) -- _sanitizeWeapon/_sanitizeWeaponList,
  // _weaponSellValue/_handleSellWeapon, and _isValidEquipSlot live
  // in gearMethods, mixed into this prototype below.

  // ═══ Quests ═══ moved to quests.js (v2.3.1162, P4 decomposition) --
  // accept / objective-credit / turn-in live in questMethods, mixed
  // into this prototype below.  Trust model unchanged; see the
  // quests.js header.

  // ═══ Weapon crafting + equip/unequip ═══ moved to gear.js
  // (v2.3.1169, P4 decomposition) -- forge_weapon, equip_request,
  // unequip_request, and set_active_slot live in gearMethods,
  // mixed into this prototype below.

  // ═══ Cooking recipes / NPC shop / pan-minigame cook ═══ moved to
  // cooking.js (v2.3.1166, P4 decomposition) -- cook_recipe,
  // _buffActive, shop_purchase, and the rate-limited cook_request
  // live in cookingMethods, mixed into this prototype below.

  // ═══ Gamble Hall ═══ moved to gamble.js (v2.3.1164, P4
  // decomposition) -- the v2.3.1124 server-settled roll lives in
  // gambleMethods, mixed into this prototype below.  jackpot_deposit
  // stays in cadence.js.

  // ═══ Extraction timing validation ═══ moved to gathering.js
  // (v2.3.1168, P4 decomposition) -- _computeOpenDelayBase,
  // _sweepStaleExtractions, _handleExtractionStart, and
  // _handleNodeStrike live in gatheringMethods, mixed into this
  // prototype below.

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

  // ═══ _loadRpg ═══ moved to persistence.js (v2.3.1172, P4
  // decomposition) -- load + the v2.3.1152 migrate-and-reput pass.

  // ═══ Persistent identity (v2.3.1116) ═══ moved to join.js
  // (v2.3.1173, P4 decomposition) -- _phraseHash/_verifyJoinAuth
  // live in joinMethods, mixed into this prototype below.

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

  // ═══ Inbox + escrow primitives ═══ moved to inbox.js (v2.3.1165,
  // P4 decomposition) -- _opSeen/_opStamp/_opPruneMaybe,
  // _creditPlayer/_applyCreditToPs, _inboxAppend/_drainInbox/
  // _sendInboxDelivered, _escrowDebitGold/_escrowTakeItem live in
  // inboxMethods, mixed into this prototype below.  Every economy
  // system settles through them; see the inbox.js header.

  // _healLifeSkills + _pruneBuffs ═══ moved to persistence.js
  // (v2.3.1172, P4 decomposition).

  // ═══ Skill-track sanitizers + build grids ═══ moved to grids.js
  // (v2.3.1170, P4 decomposition) -- the channel-key tables (now
  // module constants there), _clampBuildTotal, the sanitizers, and
  // the grid channel multipliers live in gridMethods, mixed into
  // this prototype below.

  // ═══ _saveRpg / player_state emit ═══ moved to persistence.js
  // (v2.3.1172, P4 decomposition) -- the fixed-field-list save,
  // _queuePlayerStateFlush/_flushPendingPlayerStates, and the
  // protocol-versioned _sendPlayerState delta live in
  // persistenceMethods, mixed into this prototype below.

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
    // v2.3.1154: + Endurance-grid Evasion (+0.2%/pt) INSIDE the same
    // min() — the BALANCE-PLAN §4 shared-cap hard rule: stacking dodge
    // sources share the one 30% cap so channel completion can't
    // compound past INV-06.  Mirrors client passiveDodgeChance.
    const dodgePct = Math.min((ps.agility || 0) * 0.0008 + this._evasionDodge(ps), 0.30); // v2.3.1156: evasion now 0.1%/pt inside the same shared cap
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
      dmgTaken = Math.max(1, Math.round(dmgTaken * (1 - Math.min(0.25, _ironskin * 0.0025)))); // v2.3.1156: 0.25%/pt (cap raise)
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
        // v2.3.1154: × HP-grid Recovery (+1%/pt on discrete heals, cap
        // +50%) — Second Wind is Recovery's flagship synergy.
        secondWind = Math.round((ps.maxHp || 100) * Math.min(0.50, _sw * 0.005) * this._recoveryMult(ps)); // v2.3.1156: 0.5%/pt (cap raise)
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

  // ═══ Stat validation + pool math + stats_update ═══ moved to
  // grids.js (v2.3.1170, P4 decomposition) -- _statCap/_clampStat,
  // _calcMax*/_armorHp/_recomputeMaxes, and _handleStatsUpdate live
  // in gridMethods, mixed into this prototype below.

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
      // v2.3.1153: × Bulwark block-stamina efficiency (−1%/pt, cap −50%),
      // floored at 1 so holding a shield is never free.
      if (typeof ps.maxStamina === 'number' && typeof ps.stamina === 'number') {
        if (ps.blocking && ps.stamina > 0) {
          const beforeSt = ps.stamina;
          ps.stamina = Math.max(0, ps.stamina - Math.max(1, Math.round(5 * this._blockStaminaMult(ps))));
          if (ps.stamina !== beforeSt) changed = true;
          if (ps.stamina <= 0) {
            // Auto-release shield to match client's drop-at-0 behavior.
            ps.blocking = false;
          }
        } else if (ps.stamina < ps.maxStamina) {
          const stAmuletMult = 1 + (ps.amuletStaminaRegen || 0) / 100;
          // Phase 2 of the T1/T2 spec: Endurance multiplies stamina regen.
          const stEndMult = 1 + (ps.endurance || 0) * 0.002;
          // v2.3.1154: × Endurance-grid Conditioning (+1%/pt, cap +50%)
          // — the successor to the retired restoration mult, deleted
          // v2.3.1155 (it was ×1.0 for every live player since v2.3.910).
          const stHeal = Math.max(1, Math.ceil(7 * stAmuletMult * stEndMult * this._conditioningMult(ps)));
          const beforeSt = ps.stamina;
          ps.stamina = Math.min(ps.maxStamina, ps.stamina + stHeal);
          if (ps.stamina !== beforeSt) changed = true;
        }
      }

      // Mana.  manaBuff (1.3x regen mult); Phase 4b of the T1/T2 spec:
      // Mind also multiplies mana regen.  (v2.3.1155: the restoration
      // mult deleted with the stat — ×1.0 for every live player.)
      const manaBuffActive = this._buffActive(ps, 'mana');
      if (typeof ps.maxMana === 'number' && typeof ps.mana === 'number' && ps.mana < ps.maxMana) {
        const buffMult = manaBuffActive ? 1.3 : 1.0;
        const mindMult = 1 + (ps.mind || 0) * 0.001;
        const rate = oocMana ? 0.018 : 0.007;
        const manaHeal = Math.max(1, Math.ceil(ps.maxMana * rate * buffMult * mindMult));
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
    // v2.3.1150: disable_weapon_drops kill switch -- caps.weaponDrops
    // stays true so clients do NOT fall back to legacy local minting;
    // drops just stop rolling until the flag clears.
    const weapon = (recipients && recipients.length > 0 && !this._flagOn('disable_weapon_drops'))
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
  // actual equipped weapon + governing stat (all server-tracked
  // since slices 12 / stat-validation).  Closes the "claim huge
  // damage to one-shot tough monsters" cheat with much less false-
  // positive headroom -- a level 1 player with a wood weapon can no
  // longer claim 600 dmg, only ~350.
  //
  // Formula mirrors calcWeaponDmg in src/data/gameSystems.js:
  //   base = (effBase + stat × 0.1667) × 1.495 × weapon.tierMult
  // then _maxDmgForAttacker multiplies the crit ceiling and a generous
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
    // v2.3.1153: damage channel repriced flat +1/pt -> ×(1+pts×0.005).
    // Ceiling assumes a MAXED channel (×1.495 at 99 pts) instead of
    // reading live points -- the v2.3.1133 crit-ceiling pattern.  Much
    // TIGHTER than the old flat term it replaces (+99 pre-tier was worth
    // ~×8 mid-band), so this closes anti-cheat headroom, not opens it.
    // Specials stay channel-free, matching _computeAttackDamage.
    const channelCeil = isSpecial ? 1.0 : 1 + 100 * DAMAGE_CHANNEL_PCT; // v2.3.1156: cap 99 -> 100
    for (const w of candidates) {
      // v2.3.1131: §4.4 effective base -- (raw + hardness×1.0417) ×
      // quality, BEFORE stat/channel/tierMult.  Identity for legacy
      // weapons (H0/Normal); keeps godly/hardened hits from being
      // rejected as cheats.
      const base = (this._weaponEffBase(w.type, w) + statBonus) * channelCeil * (w.tierMult || 1);
      if (base > max) max = base;
    }
    return max;
  }

  _maxDmgForAttacker(ps, isSpecial) {
    if (!ps) return 21; // baseline-10: 100 ÷ 4.8
    const maxWpn = this._maxWeaponDmg(ps, isSpecial);
    // v2.3.1133: ceiling assumes a MAXED crit-dmg channel instead of
    // reading live points, so a fully-invested crit isn't rejected by
    // the anti-cheat cap (same bug class v2.3.912 fixed for the damage
    // channel).  v2.3.1157: +1.20 at the 100-pt cap × the 1.2%/pt
    // UN-01 parity retune.
    const critMult = 1.5 + (ps.power || 0) * 0.001 + 1.20;
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
    // v2.3.1153: repriced flat +1/pt -> ×(1 + pts × DAMAGE_CHANNEL_PCT).
    // The flat term rode INSIDE the tierMult product, so 99 pts bought
    // ~+725% DPS mid-band; the multiplier prices identically at every
    // tier (+49.5% at 99 pts).  Mirrors client calcWeaponDmg.
    const dmgPts = isSpecial ? 0 : this._wpnDmgChannel(ps, type);
    // v2.3.1131: _weaponBase -> _weaponEffBase (quality × hardness
    // layers, BALANCE-PLAN §4.4 order: pre-stat, pre-tier).  Reduces
    // exactly to the old formula at Hardness 0 / Normal quality --
    // tools/balance-sim.mjs asserts that equivalence.
    let base = (this._weaponEffBase(type, w) + stat * 0.1667) * (1 + dmgPts * DAMAGE_CHANNEL_PCT) * tierMult; // 0.8 ÷ 4.8
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
    // v2.3.1156: crit channel 0.5 -> 0.3%/pt so the +30% cap lands at
    // exactly the 100-pt channel cap (was a silent trap at 60 pts).
    // Mirrors client calcCritChance; spent points refunded by the
    // uniform-t2-caps migration.
    const P = ps.power || 0;
    const critChance = Math.max(0, Math.min(1,
      40 * P / (P + 200) / 100 + Math.min(0.30, this._wpnCritPts(ps, type) * 0.003)));
    const isCrit = Math.random() < critChance;
    // v2.3.1133: crit mult gains the crit-DMG channel (executioner/headshot/
    // focus), mirroring client calcCritMult.  The Ferocity term (retired,
    // pinned 0 since v2.3.910) is dropped.  v2.3.1157: 0.8 -> 1.2%/pt —
    // the sim's UN-01 synergy-aware parity band showed crit-dmg
    // underpriced vs the damage channel under the fungible 1000-pt
    // economy (+120% at the 100-pt cap).
    if (isCrit) base *= (1.5 + P * 0.001 + this._wpnCritDmgPts(ps, type) * 0.012);
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
              // v2.3.1155: restoration mult deleted with the stat (×1.0
              // for every live player; client mirror deleted in lockstep).
              const restore = Math.round(0.04 * (attackerPs.maxMana || 100) * streakMult);
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
        // v2.3.1150: xp_mult live-ops flag -- the "2x weekend" lever.
        // Clamped [1,4] at read; monster_kill's payload.xp stays base
        // (client prediction is corrected by the player_state echo,
        // rule 20) while combat_credit carries the multiplied truth.
        const xpForRecipient = Math.round((m.xp || 0) * share * this._flagNum('xp_mult', 1, LIVEOPS.XP_MULT_MIN, LIVEOPS.XP_MULT_MAX));
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

      // v2.3.1154: LIFEBLOOD (HP grid) -- on-kill heal, 0.5%/pt of maxHp
      // (cap 25% at 50 pts), killing-blow attribution like lifesteal
      // below.  Applied BEFORE lifesteal so both heals ride the same
      // _saveRpg/player_state flush; deliberately NOT multiplied by
      // Recovery (a %-maxHp heal scaling with another %-heal channel
      // would double-dip the same grid's budget).  Skips dead killers.
      if (killerPs && killerPs.hp > 0) {
        const _lbFrac = this._lifebloodFrac(killerPs);
        if (_lbFrac > 0) {
          const _lbMax = killerPs.maxHp || 100;
          killerPs.hp = Math.min(_lbMax, killerPs.hp + Math.max(1, Math.round(_lbMax * _lbFrac)));
        }
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
      // (v2.3.1154: the 90% refund is deliberately NOT Recovery-boosted
      // -- see _recoveryMult's comment; >100% refunds mint sustain.)
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
    // v2.3.1148: operator toolkit (owner-keyed; fail-closed without the
    // ADMIN_KEY secret -- see admin.js).
    if (url.pathname.startsWith('/api/admin')) {
      return this._adminFetch(request);
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
        // Identity gate + eviction + rpg load/bootstrap + state_sync.
        // Hoisted to join.js _handleJoin (v2.3.1173, byte-identical
        // body; the awaits keep the input gate closed exactly as
        // before -- rule 9).
        await this._handleJoin(session, ws, msg);
        // v2.3.1175: the v2.3.1173 hoist dropped this break, so every
        // join fell through into case 'move'.  Benign only because
        // _handleMove early-returns on non-numeric top-level msg.x/y --
        // a crafted join carrying numeric x/y rode the first-move
        // bypass and stamped an arbitrary position.
        break;

      case 'move':
        // Hottest path -- anti-teleport cap, position/facing merge,
        // zone-change streaming.  Hoisted to movement.js
        // _handleMove (v2.3.1171, byte-identical body).
        this._handleMove(session, ws, msg);
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

      case 'jackpot_deposit':
        // v2.3.1149: weekly jackpot deposit -- escrow-at-placement into
        // the jackpot:draw record; the old GamblePanel stub burned local
        // coins into nothing (see cadence.js).
        if (session.id) {
          await this._handleJackpotDeposit(session, msg.payload || msg);
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

      case 'set_active_slot':
        // Persist the player's chosen weapon slot -- see gear.js
        // _handleSetActiveSlot (v2.3.1169: hoisted, byte-identical).
        if (session.id) {
          this._handleSetActiveSlot(session, msg.payload || msg);
        }
        break;

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

  // ═══ startTickLoop ═══ moved to tick.js (v2.3.1174, P4
  // decomposition; the roadmap's do-last slice) -- the 45Hz world
  // heartbeat lives in tickMethods, mixed into this prototype
  // below.  Start/stop call sites above are unchanged.

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
// v2.3.1148: operator toolkit -- see admin.js.
Object.assign(GameRoom.prototype, adminMethods);
// v2.3.1149: time-cadence framework (daily reward + jackpot) -- see cadence.js.
Object.assign(GameRoom.prototype, cadenceMethods);
// v2.3.1150: live-ops rail -- see liveops.js.
Object.assign(GameRoom.prototype, liveopsMethods);
// v2.3.1162 (P4 decomposition): quests -- see quests.js.
Object.assign(GameRoom.prototype, questMethods);
// v2.3.1164 (P4 decomposition): Gamble Hall -- see gamble.js.
Object.assign(GameRoom.prototype, gambleMethods);
// v2.3.1165 (P4 decomposition): inbox + escrow primitives -- see inbox.js.
Object.assign(GameRoom.prototype, inboxMethods);
// v2.3.1166 (P4 decomposition): cooking / eating / NPC shop -- see cooking.js.
Object.assign(GameRoom.prototype, cookingMethods);
// v2.3.1168 (P4 decomposition): gathering -- see gathering.js.
Object.assign(GameRoom.prototype, gatheringMethods);
// v2.3.1169 (P4 decomposition): gear -- see gear.js.
Object.assign(GameRoom.prototype, gearMethods);
// v2.3.1170 (P4 decomposition): grids + progression -- see grids.js.
Object.assign(GameRoom.prototype, gridMethods);
// v2.3.1171 (P4 decomposition): movement -- see movement.js.
Object.assign(GameRoom.prototype, movementMethods);
// v2.3.1172 (P4 decomposition): persistence core -- see persistence.js.
Object.assign(GameRoom.prototype, persistenceMethods);
// v2.3.1176: HTTP economy-endpoint session tokens -- see httpauth.js.
Object.assign(GameRoom.prototype, httpAuthMethods);
// v2.3.1173 (P4 decomposition): join bootstrap -- see join.js.
Object.assign(GameRoom.prototype, joinMethods);
// v2.3.1174 (P4 decomposition): tick loop -- see tick.js.
Object.assign(GameRoom.prototype, tickMethods);
