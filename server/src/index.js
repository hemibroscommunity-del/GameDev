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
import { tickElementStatuses, elementMoveMult } from './elemental.js';
// v2.3.1115 (P4 slice 2): embedded data tables moved to data.js -- the
// lookup methods stay (call sites unchanged); only the literals moved.
import {
  ARCHETYPES, ZONES,
  MONSTER_HP_CURVE, monsterHpFlat, RARITY_TIERS, BLOCK_COSTS_STAMINA, BLOCK_STAMINA_COST, BLOCK_ARC_HALF,
  MONSTER_ARMOR_DROPS, RARE_GEM_MONSTER_DROP, RARE_GEM_KEY,
  MONSTER_IRON_WEAPON_DROP /* v2.3.1924b */ } from './data.js'; // v2.3.1451: t2Accel/T2_UNITS reads replaced by the ps.t2Flat accumulator
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
import { telegraphMethods } from './telegraph.js'; /* v2.3.1730 */
import { abilityMethods } from './abilities.js'; /* v2.3.1733 */
// v2.3.1128 (PR11): guild-quest verification -- server-checked
// life-skill quest ladder, claims under guild_claims:<pid>.
import { guildMethods } from './guilds.js';
// v2.3.1129 (PR13): threat machine -- server countdown/cooldown,
// ignore/expiry consent, Call Guards levy + storage-backed gear lock.
import { threatMethods } from './threat.js';
// v2.3.1130 (PR14): server-validated pet capture -- trap consumption,
// server monster HP/range checks, sanitized pet minting.
// v2.3.1200: PETS config also imported directly -- _handleLootPickup
// reads PETS.VACUUM_RANGE for the pet loot vacuum (viaPet pickups).
import { petMethods, PETS } from './pets.js';
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
import { liveopsMethods } from './liveops.js';
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
import { joinMethods, cosmeticCap } from './join.js';   /* v2.3.1940: ONE cap rule for the drawing keys */
// v2.3.1174 (P4 decomposition): the 45Hz tick loop -- see tick.js.
import { tickMethods } from './tick.js';
// v2.3.1178: per-session tokens for the mutating HTTP economy
// endpoints (market place/cancel, arena join/leave) -- see httpauth.js.
import { httpAuthMethods } from './httpauth.js';
// v2.3.1185: party roster (handoff item D) -- invite/accept handshake +
// cross-zone vitals HUD; memory-only, no combat/XP changes -- see party.js.
import { partyMethods } from './party.js';
import { friendsMethods } from './friends.js';
import { broVerifyMethods } from './broverify.js'; /* v2.3.1576: Hemi Bro ownership */
// v2.3.1191 (P4 decomposition): the combat/damage core -- see combat.js.
import { combatMethods } from './combat.js';
// v2.3.1192: server amulet forge (handoff item I follow-up) -- smelt/
// craft/gem ops + the server-owned nugget/bar ledger -- see amulet.js.
import { amuletMethods } from './amulet.js';
// v2.3.1659: the trained-skill combat rebuild (PROGRESSION-REDESIGN) --
// XP accrual, seven-stat allocation, prog3 pool recompute -- see prog3.js.
// v2.3.1734: PROG3 itself is read here now too -- _abilityCost's flat
// special-attack mana cost lives with the rest of the progression
// constants (and its client mirror), not as a literal in the handler.
import { prog3Methods, PROG3 } from './prog3.js';
// v2.3.1664: on-chain score checkpoints to Hemi (contracts/BroTownScores.sol);
// signing/encoding lives in chainwriter.js -- see chainscore.js.
import { chainScoreMethods } from './chainscore.js';
// v2.3.1734: Element Burst (COMBAT-OVERHAUL-PLAN PR 6) -- the elemental
// nova + its four server-side gates -- see burst.js.
import { burstMethods } from './burst.js';
// v2.3.1983: population-scaled spawns -- monsters and gather nodes sized to
// how many players are standing in THAT zone -- see spawnscale.js.
import { spawnScaleMethods } from './spawnscale.js';

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
      // v2.3.1178: the public route is READ-ONLY.  POST /update trusted
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

/* ═══ v2.3.1970: THE ROOM-CHAT RELAY, THE LAST UNCLAMPED TEXT LANE ═══
 *
 * Every other line of player text in this server is clamped, control-
 * stripped and stamped with the SERVER's idea of who sent it: party chat
 * at PARTY.CHAT_MAX = 200 (party.js), a friend DM at FRIENDS.DM_MAX = 280
 * (friends.js).  Room `chat` had none of it, for the oldest reason there
 * is -- it has no case in the router switch, so it falls through to the
 * default branch and relays byte-for-byte.  Its only bound was the
 * v2.3.1618 frame gate, MAX_INBOUND_BYTES = 16 KB.
 *
 * That is a room-wide client crash, not untidiness.  The one thing that
 * RENDERS a chat line is the overhead bubble (client
 * effectsRenderer._renderChatBubble): a PIXI Text at fontSize 21 with
 * wordWrapWidth 320, plus a background Graphics sized from the measured
 * text.  16 KB is ~640 wrapped lines -- a text texture and a rounded rect
 * on the order of 17,000 px tall, past the max texture size of every iOS
 * GPU, which is the primary platform.  One socket, one message, and chat
 * is the ONE relay v2.3.1575's interest management deliberately did not
 * zone-scope, so it reaches every player in the world.
 *
 * Identity is the other half, and it was already on the record: the
 * v2.3.1150 server_announce entry in PRIVILEGED_EVENTS says in so many
 * words that "any client could impersonate the server" on this relay.
 * The client reads payload.id / payload.name straight off the wire and
 * only falls back to the server-stamped msg.from when they are ABSENT,
 * so a forged pair wins.  party_chat already solved this by stamping
 * `from` from the session (v2.3.1212); this does the same thing.
 *
 * Deliberately NOT a dedicated case in the switch: keeping it on the
 * default path preserves everything about chat's DELIVERY (eventBuffer
 * fan-out, the relay token bucket, room-wide reach) and changes only
 * what is allowed to ride it.  And the payload is REBUILT from an
 * allowlist rather than filtered in place, so the next field somebody
 * adds to the send is dropped instead of trusted (rule 16 / TRAPS #13). */
export const CHAT_RELAY = {
  TEXT_MAX: 200,   // matches PARTY.CHAT_MAX -- one line looks the same in either lane
  COLOR_MAX: 32,   // a CSS colour, nothing more
};

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
  // v2.3.1659: prog3 combat-rebuild emissions (prog3.js) — the trained
  // level-up celebration and the allocation ack are both server-truth;
  // forging either would paint fake levels/points on the client.
  'prog3_level', 'prog3_allocated',
  // v2.3.1687: a quest reward handed to the client's own stash because the
  // worn slot was full (quests.js).  Server truth about a real grant — a
  // forged one would mint free armour on the client, so it is denied like
  // every other server-EMITTED type.
  'quest_reward_stashed',
  // v2.3.1664: the on-chain checkpoint receipt (chainscore.js).  Server-sent
  // only -- a forged one would paint a fake block-explorer link.
  'chain_score_recorded',
  // v2.3.1117: inbox/mail delivery notification -- forging it wouldn't
  // grant anything (credits are server-persisted before it's sent) but
  // it drives "you received X" UI, so don't let clients spoof it.
  'inbox_delivered', 'join_rejected',
  /* v2.3.1982: the room-full refusal (join.js _roomFullRefusal).  Server-
     emitted only -- a forged one would put "the world is full" in front of
     every other player in the room, which is a one-message denial of
     service on a demo day.  It rides its own socket and is closed
     immediately after, so it never reaches the rebroadcast branch from the
     server side; the deny-list is what stops a CLIENT sending it. */
  'room_full',
  /* v2.3.1576: Hemi Bro ownership. Both are server-emitted only -- a forged
     bro_verify_result would let a client show peers a badge it never earned,
     and a forged bro_nonce would let it choose the text it 'signed'. */
  'bro_nonce', 'bro_verify_result',
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
  // v2.3.1194: boss ability telegraphs/executions are server-scripted
  // (dungeon.js _dungeonTickBossAbilities); the client handler is
  // display-only, but a forged one would paint fake warnings/rings.
  'dungeon_boss_ability',
  // v2.3.1128: sponsorship stakes settle off SERVER-observed match
  // results; guild quests verify against server-owned skill levels.
  'arena_stake_placed', 'arena_stake_error', 'arena_stake_result',
  'arena_stake_board', // v2.3.1210: server-summed spectator stake board (display-only)
  'guild_quest_result', 'guild_quest_error',
  // v2.3.1129: threat-machine emissions (guard fines, lock notices).
  'threat_penalty', 'threat_expired', 'gear_locked',
  // v2.3.1130: pet-capture outcomes are server-rolled + private.
  'pet_capture_result',
  // v2.3.1131: hardening rolls are server-side + private.
  'harden_result',
  // v2.3.1347: character-restart ack (persistence.js) -- the client
  // handler wipes localStorage and reloads; a forged one would wipe
  // another player's local caches (their server blob would survive,
  // but the grief is real).  Server-emitted only.
  'character_reset_done',
  // v2.3.1198: gem-cut outcomes are server-rolled + private (amulet.js
  // _handleGemCut); forging one is fake-popup grief surface.
  'gem_cut_result',
  // v2.3.1149: jackpot pool state is private; the draw result is a
  // server-only broadcast (forging it would announce fake winners).
  'jackpot_state', 'jackpot_result',
  // v2.3.1150: operator announcements -- deliberately NOT riding the
  // un-privileged 'chat' relay (any client could impersonate the
  // server there); this type is forgeable only by the worker.
  'server_announce',
  // v2.3.1132: two-sided trade session echoes (server-truth renderer).
  'trade2_state', 'trade2_invite',
  // v2.3.1185: party roster echoes (server-truth HUD renderer) + the
  // private invite/error notices.  Forging party_state would paint fake
  // rosters; forging party_invited is popup-spam surface.
  'party_state', 'party_invited', 'party_error',
  'party_chat', // v2.3.1212: server-relayed party-only chat (party.js)
  // v2.3.1323: friends system emissions (friends.js) -- the graph sync,
  // request/accept notifications, error channel, and DMs (live +
  // join-time backlog) are all server-authored; a forged friend_sync
  // could paint a fake roster and a forged friend_dm a fake message.
  'friend_sync', 'friend_request_in', 'friend_accepted', 'friend_error',
  'friend_dm', 'friend_dm_backlog',
  // Combat resolution
  'monster_attack', 'monster_hit', 'monster_kill', 'pvp_hit',
  /* v2.3.1640: display-only snowball. Carries no damage (the authoritative
     hit rides monster_attack on the impact tick), but a forged one would
     let a client paint fake incoming projectiles on every screen in the
     zone, so it is server-emitted only like the rest of this family. */
  'monster_projectile',
  /* v2.3.1730: telegraph/execute notice for standard-zone monster abilities.
     Display-only (damage rides monster_attack), but server-emitted, so it
     belongs here or a client could forge a fake wind-up. */
  'monster_ability',
  /* v2.3.1731: parry notice — display-only, but server-emitted. */
  'parry',
  /* v2.3.1734: Element Burst's nova (burst.js).  Display-only — every
     point of its damage rides monster_hit — but a forged one would let a
     client paint fake elemental statuses onto every monster on every
     screen in the zone, which is exactly the class of thing this list
     exists for.  NOTE the client->server half is named `element_burst`
     and has its own switch case, so it never reaches this deny-list. */
  'element_nova',
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

/* v2.3.1465: `track` IS COSMETICS ONLY -- the allowlist that makes that
 * true.  This message predates the whole trust boundary (rules 13-21)
 * and its handler did a raw `Object.assign(playerState[id], msg.data)`
 * on a payload every client sends every 2 seconds.  One crafted track
 * set coins to 999999999, power to 99999, level to 500, minted a
 * weapon with tierMult 99 (the legit forge ceiling is ~2.6, so this
 * walked straight past _sanitizeWeapon), and teleported the sender --
 * all of it then persisted by the next _saveRpg from its fixed field
 * list.  The identical jump sent as `move` was correctly REJECTED by
 * the 500px/s cap in movement.js, which is what makes this the one
 * hole left in an otherwise closed boundary: a message whose name
 * reads as telemetry was never re-read as an input.  Handoff rule 16
 * ("never trust client-supplied value blobs") applied at last.
 *
 * ALLOWLIST, not deny-list -- an unknown key is DROPPED, so a new
 * client field has to be added here deliberately.  That is the rule-13
 * posture (deny by default) applied to the c->s direction.  Iterating
 * this fixed Set instead of the client's own keys also means
 * '__proto__' can never be written: TRAPS #6 is avoided structurally
 * rather than by a guard someone can forget.
 *
 * These are exactly the keys the live client sends (BroTown.jsx's
 * 2-second track emit) -- display/appearance values whose names are
 * deliberately DISJOINT from the authoritative playerState namespace
 * (`rpgLv`/`rpgHp`/`rpgMaxHp`, not level/hp/maxHp; `dir`, not d; the
 * stat block is nested under rpgData so it can never reach ps.power).
 * That disjointness is why this fix changes nothing for an honest
 * client -- only forged keys stop working. */
/* v2.3.1945: the bound on the ONE track cosmetic that is legitimately nested
   (`rpgData`).  Same size and same reasoning as JOIN_RPG_MAX_BYTES: big enough
   that a real inspect-card blob never approaches it, small enough that it
   actually binds.

   NOT EXPORTED, and that is not a style choice.  This file is the Worker's
   ENTRY module, and the runtime treats every named export as a handler to
   register: a plain number is not one, so `export const TRACK_BLOB_MAX_BYTES =
   8192` made workerd refuse to boot at all --

     Uncaught TypeError: Incorrect type for map entry 'TRACK_BLOB_MAX_BYTES':
     the provided value is not of type 'function or ExportedHandler'

   -- which would have taken the whole server down on deploy.  The Sets beside
   it get away with it because an object can be coerced to a handler with no
   handlers in it; a primitive cannot.  The node test suite never sees this,
   because importing the module in node is not booting a worker; the `playable`
   check, which boots a real one, is what caught it.  Keep entry-module exports
   to handlers, Durable Object classes, and the Sets that already live here. */
const TRACK_BLOB_MAX_BYTES = 8192;

export const TRACK_COSMETIC_KEYS = new Set([
  // Position hint (relayed to peers; NOT merged into player state --
  // see TRACK_STATE_EXCLUDED below).
  'x', 'y',
  // Identity + presence.  `name` must stay: friends.js, party.js and
  // trade2.js all read ps.name for their notices.
  'name', 'color', 'avatar', 'aw', 'dir', 'zone',
  // Body / appearance.
  'bt', 'bl', 'hw', 'fh', 'hr', 'sk', 'hc', 'htc', 'fhc', 'st', 'stc',
  /* v2.3.1930: 'ec' is the eye colour, relayed so peers draw the eyes you
     picked.  Display-only, exactly like 'stc' and 'wpnMat' beside it: the
     receiving client maps it through its own EYE_COLOR_CATALOG and answers
     null for anything it does not recognise, so a forged value can only ever
     select a colour that catalog already contains -- it cannot paint an
     arbitrary RGB, and it reaches nothing but a canvas. */
  'ec',
  /* v2.3.1939: the drawn shirt, front and back.  Display-only like every
     cosmetic here: the receiving client rejects anything that is not exactly
     256 hex characters, so a forged value paints nothing rather than something
     unexpected. */
  /* v2.3.1940: + the drawn pants print and the chest tattoo.
     v2.3.1941: + the shirt and trouser patterns. */
  'sa', 'sb', 'pa', 'ta', 'tf', 'tm', 'sp', 'pp', 'fp',   /* v2.3.1949: +face/arm tattoos */
  /* v2.3.1953: 'hg' is the height and 'fr' the frame -- two short catalog ids
     ('tall', 'large'), relayed so peers see the build you picked.  Display-only
     in the strictest sense available: they reach a RENDER SCALE on the
     receiving client and nothing else, and that client maps them through its
     own HEIGHT_CATALOG / FRAME_CATALOG, answering the default for anything it
     does not recognise -- so a forged value can only ever select a build the
     catalog already contains.  It cannot touch a hitbox, because no hitbox on
     either side reads a display object. */
  'hg', 'fr',
  'pt', 'sh', 'bs', 'mask', 'cape', 'pet',
  // Live equipment visuals (armour on/off for remote renderers).
  'eqc', 'eql', 'eqs',
  // Display-only mirrors of server-owned numbers (distinct key names
  // from the real fields on purpose -- see the note above).
  'rpgLv', 'rpgHp', 'rpgMaxHp',
  // Weapon look + element tints, PvP reputation badge.
  // v2.3.1760: 'wpnMat' is the weapon's blacksmith tier, relayed so peers draw
  // the metal you are holding.  Display-only, like wpnType beside it — the
  // receiving client maps it through its own materials table and answers
  // native white for anything it does not recognise, so a forged value can
  // only ever paint a sword a colour that table already contains.
  'wpnType', 'wpnMat', 'wpnE1', 'wpnE2', 'rep',
  // Inspect-card blob (nested; display-only).
  'rpgData',
  // Clan cosmetics -- the server OVERWRITES these via _clanStampTag
  // (v2.3.1125) after the copy, so they are listed to be stamped, not
  // to be trusted.
  'clanTag', 'clanColor1',
]);

/* v2.3.1465: keys that may be RELAYED to peers as a visual hint but
 * must never merge into authoritative player state.  Position is
 * owned by `move` alone, behind the anti-teleport speed cap; the
 * client sends a move at >=1 Hz even standing still (the idle
 * keepalive the client's ghost-sweep relies on), so track's copy was
 * pure redundancy AND the cap bypass above. */
export const TRACK_STATE_EXCLUDED = new Set(['x', 'y']);

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    // v2.3.1202: keyed by CLIENT-CHOSEN join ids -- Object.create(null)
    // so a magic id ('__proto__') can't write through Object.prototype
    // (defense-in-depth behind the join-id gate in join.js).
    this.playerState = Object.create(null);
    this.dirtyPlayers = new Set();
    this.eventBuffer = [];
    this.tickInterval = null;
    this.tickSeq = 0;
    this.TICK_RATE = 22; // 45Hz (22ms)
    /* The hard ceiling on concurrent sockets in this room.  It is a
       RECEIVER-side number, not a server one (see the refusal comment in
       fetch() below): ~4KB/s of download per co-located moving peer is
       what an iPhone on cellular can carry, so ~20 people in one zone is
       the real comfort limit and 60 in the room is the ceiling above it.
       v2.3.1982: `_roomCap()` (join.js) is the read path -- the
       `max_players` live-ops flag can only LOWER this, never raise it. */
    this.MAX_PLAYERS = 60;
    this.EVENTS_PER_TICK_CAP = 500;
    /* ═══ v2.3.1618: inbound abuse bounds ═══
       Sized from the real client, not guessed.
       MAX_INBOUND_BYTES 16 KB: the largest legitimate message is `join`,
       whose `data` carries the full appearance set, and `track`, whose
       rpgData inspect blob is the widest recurring one -- both are well
       under 2 KB.  Chat is capped at 200 chars client-side
       (ChatPanel.jsx). 16 KB leaves an order of magnitude of headroom
       while refusing the ~900 KB fan-out bomb.
       RELAY_BURST / RELAY_REFILL_PER_S: the token bucket on the default
       relay branch -- the only path a client can push into the room-wide
       eventBuffer.  8 burst + 4/s absorbs a human hammering chat and
       emotes together, and is far below the rate needed to outrun the
       tick drain.  EVENT_BYTES_PER_TICK: a BYTE ceiling to sit beside
       EVENTS_PER_TICK_CAP, which only ever bounded the COUNT -- 500
       events of unbounded size was a legal tick payload. */
    this.MAX_INBOUND_BYTES = 16 * 1024;
    this.RELAY_BURST = 8;
    this.RELAY_REFILL_PER_S = 4;
    this.EVENT_BYTES_PER_TICK = 64 * 1024;
    /* v2.3.1619: how often the regen tick may durably persist.  The regen
       loop itself still runs every ~670 ms and still flushes player_state
       to the wire every time -- this throttles ONLY the storage write.
       10 s costs a player at most ~10 s of pool regeneration across a DO
       restart (deterministic, recomputes from maxima, invisible) and cut
       measured storage writes by ~93%.  See _tickPlayerRegen. */
    this.REGEN_SAVE_MS = 10000;
    /* ═══ v2.3.1701: OUT-OF-COMBAT REGEN IN THE SPOKE (COMBAT) ZONES ═══
       Owner playtest: a fresh level-1 character in Frost Ridge gets about
       ONE snowman kill per full health bar, and HP only regenerated in the
       hubs (town / worldview / farm_home).  So every kill was followed by a
       round trip to the World View to heal: the measured run died 7 times
       and made 7 heal trips, which turns the first quest into a walking
       simulator rather than a fight.
       The rule chosen, deliberately narrow:
         - Only when the player has neither TAKEN nor DEALT damage for
           SPOKE_REGEN_OOC_MS.  It therefore cannot fire during a fight at
           all (melee cadence is 600 ms), and a kited retreat has to be a
           real disengagement to earn it.
         - SPOKE_REGEN_PCT is one TENTH of the hub's 10%/tick pace: a full
           bar takes ~67 s of standing still versus ~7 s in a hub, so the
           hubs stay the fast way to heal and the trickle is what lets you
           keep playing instead of commuting.
       Both stamps are in-memory scratch (rule 11 / rule 1: NOT in _saveRpg's
       fixed field list) — a deploy that loses them only lets regen start a
       few seconds early, which is the cheapest possible thing to lose. */
    this.SPOKE_REGEN_OOC_MS = 6000;
    this.SPOKE_REGEN_PCT = 0.01;
    /* v2.3.1623: below this fraction of max HP, a damage write bypasses
       the coalescing and persists immediately.  25% is roughly "one or
       two more hits from death" across the damage curve -- the band
       where a rolled-back HP value would actually change what happens to
       a player.  Above it, the worst a restart costs is a few seconds of
       damage given back.  See _saveRpgVitals. */
    this.HP_URGENT_SAVE_FRAC = 0.25;
    /* v2.3.1575 (interest management, tick.js): how often the tick
       carries the FULL player roster.  45 ticks ~= 1 s.  Out-of-zone
       peers ride this instead of the 45Hz dirty list -- they can't be
       rendered, but the client's ghost-sweep deletes any peer silent
       for 10 s and counts the survivors for "N online", so they must
       keep arriving.  10x margin on that sweep; do not raise past ~7 s
       without revisiting the sweep window in wsClient.js. */
    this.PRESENCE_REFRESH_TICKS = 45;
    this.WEAPON_STASH_CAP = 8; // mirrors WEAPON_STASH_MAX in src/data/gameSystems.js
    /* v2.3.1704: the free-block flag, mirrored onto the room so dungeon.js
       can read it through `this`.  Importing the module constant there would
       close an index.js <-> dungeon.js cycle (index mixes dungeonMethods in),
       and one boolean is not worth a new shared module. */
    this.BLOCK_COSTS_STAMINA = BLOCK_COSTS_STAMINA;
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
    this.stateHistory = Object.create(null); // v2.3.1202: client-id-keyed (see playerState)
    this.LAGCOMP_BUFFER_TICKS = 14; // 300ms of history at 45Hz
    this.LAGCOMP_RTT_CAP = 300;
    this.LAGCOMP_RTT_ALPHA = 0.3;

    /* v2.3.1629: PvE melee proximity bound for monster_damage
       (combat.js).  400, not the 250 the PvP path uses: this one has to
       survive client/server position lag on iPhone Safari over cellular
       on top of the swing's own reach (GS_OUTER_RADIUS 72 + monster
       body), and 250 left only ~46 px of slack -- about 105 ms of
       movement at the legit max speed.  Still far inside a 32-40 tile
       zone, so it keeps doing the one job it has: no cross-map melee.
       Ranged/staff are deliberately NOT bounded here -- see the comment
       at the call site. */
    this.PVE_MELEE_RANGE = 400;

    /* Server-authoritative monsters.
       v2.3.1625: null-prototype, like every other map keyed by a
       client-supplied string (TRAPS #6).  The zone allowlist in
       _validZone is the real gate -- an unlisted id never reaches these
       maps now -- but these stay null-proto as defence in depth, so the
       NEXT path that forgets to validate degrades into a harmless own
       key instead of returning Object.prototype and making
       _tickMonsters throw room-wide, every tick. */
    this.monsters = Object.create(null); // zoneId -> [monster, ...]
    this.dirtyMonsters = new Set(); // zoneIds with changed monsters
    // Protocol v2 per-entity dirty tracking.  v1 sessions still get the
    // full dirty-zone entity list; v2 sessions get only the entities in
    // these id sets (client merges by id).  Zone-level dirtyMonsters /
    // dirtyNodes stay authoritative for "does this tick carry a delta
    // at all" — the id sets only narrow the v2 payload.
    this.dirtyMonsterIds = Object.create(null); // zoneId -> Set(monsterId)  /* v2.3.1625: null-proto (TRAPS #6) */
    this.dirtyNodeIds = Object.create(null);    // zoneId -> Set(nodeId)     /* v2.3.1625: null-proto (TRAPS #6) */
    /* v2.3.1592 (owner: "only 3 monsters per zone ... but with quick
       respawn"): 15s -> 5s.  The two halves of that request are one change —
       zone populations dropped to 3 (data.js ZONES.spawns), so at the old
       15s a cleared zone stood empty and the kill cadence fell by roughly the
       same factor the population did.  5s restores it: 3 monsters on a 5s
       clock is the same steady-state supply as 9 on 15s.  There is no
       hourly kill cap to breach — botfp caps harvesting and cooking only —
       so unlike the node timer below this one is bounded by feel, not by an
       anticheat ceiling. */
    /* v2.3.1739 (owner, playtesting the combat overhaul): "make monster
       respawn about 3x slower globally ... one timer beginning after they
       die."  5s -> 15s, which lands back on the pre-v2.3.1592 number.

       REVERSING v2.3.1592 ON PURPOSE, and the note above is kept rather
       than rewritten because its reasoning was sound for the game it was
       written in.  What changed is the kill rate, not the population: since
       then the player got +130% damage over ten levels (v2.3.1727), two
       stamina abilities (v2.3.1733), Element Burst (v2.3.1734) and a
       Whirlwind that gathers sixteen monsters into one swing (v2.3.1738).
       "Quick respawn" was tuned against a player who killed slowly; at the
       current pace 5s meant a zone refilled faster than it could be cleared.

       THE TRADE, stated because it is the thing that will be felt: zone
       populations are still 3 (data.js ZONES.spawns), so at 15s a cleared
       zone now stands empty for roughly the time it took to clear it.  That
       is the same effect v2.3.1592 was fixing — the difference is that it is
       now the intended pacing rather than an accident.  If it reads as dead
       air rather than breathing room, raise the per-zone spawn counts rather
       than winding this back, or the two will keep undoing each other. */
    this.RESPAWN_TIME = 15000; // 15s respawn (3x the v2.3.1592 timer)
    this.MONSTER_AGGRO_RANGE = 120; // pixels
    /* v2.3.1639: per-archetype aggro overrides.  Absent = the 120 default,
       so nothing but the listed archetype changes behaviour.  Scoped the
       same way _atkRange already is a few hundred lines down
       (`m.arch === 'snowman' ? 70 : ATTACK_RANGE`), and deliberately NOT a
       bump to MONSTER_AGGRO_RANGE itself: that constant is read inside
       _tickMonsters, which loops _activeZones() — dungeon instances ride
       ordinary zone ids through the same loop, so a global bump would
       re-pull every archetype in every open-world zone AND inside every
       dungeon.
       Snowman 120 -> 300 (owner: "way too passive"): at 120px an unprovoked
       monster does not react until the player is roughly one body-length
       away, which reads as "it ignores me".  300 is still well inside a
       phone screen and still leaves the player free to walk away — a
       snowman closes at 18 px/s against a 150 px/s walk, so this changes
       when it ENGAGES, never whether the player can disengage. */
    this.MONSTER_AGGRO_BY_ARCH = { snowman: 300 };
    /* v2.3.1639: px/tick a chasing monster repays knockback debt on top of
       its normal step (server/src/combat.js records the debt).  1.1 px/tick
       x the 27.3 ticks in one player swing (SWING_COOLDOWN 600ms /
       TICK_RATE 22ms) = 30px, i.e. exactly one normal hit's shove undone
       per swing.  Chosen from that identity, not tuned by feel. */
    this.KB_RECOVER_PX_PER_TICK = 1.1;
    /* v2.3.1640: per-archetype RANGED attack profiles.  Absent = melee
       only, so this changes exactly one archetype.
       Snowman: fires in the 100..300px band — outside its own 70px swing
       ring (so closing to melee still switches it back to swinging) and
       inside its 300px aggro radius (so it never throws at something it
       has not noticed).  travelMs 900 is a deliberately slow, readable
       arc: a big lobbed snowball you can see coming and walk out of,
       which is the whole point of giving the SLOW archetype the ranged
       attack.  cd 2600 vs the 1500 melee cooldown keeps it from
       out-DPSing a swing — range is the reward, not damage.  Damage
       itself is untouched: the impact uses the same m.dmg the swing
       does, so the [1,2] demo band is unaffected. */
    this.MONSTER_RANGED_BY_ARCH = {
      snowman: { range: 300, minRange: 100, travelMs: 900, cd: 2600 },
      /* v2.3.1678 (owner: "make sure they can throw their slime projectiles
         like the snowmen").  Slimes get the same ranged band the snowman has
         — and unlike the snowman, this is not compensation for being slow: a
         blue slime is FAST (spd 1.15), so its ball is a second threat while
         it closes rather than its only one.  Tuned shorter and quicker
         accordingly: less reach, a faster ball, a shorter cooldown than the
         snowman's artillery lob.
         `kind` rides on the wire so the client can pick the right art — the
         snowball was falling back to the green slime orb, which is how it
         ended up invisible against snow. */
      fodder: { range: 220, minRange: 70, travelMs: 650, cd: 2000 },
    };
    /* v2.3.1640: how far a player may drift from the aim point and still be
       hit.  40px against a ~34px body is roughly "you didn't really move",
       so walking out of the arc dodges while standing still never loses a
       hit to client/server position drift.  Paired with travelMs: a longer
       flight with the same radius is strictly easier to dodge. */
    this.SNOWBALL_HIT_RADIUS = 40;
    /* Monster stop + attack distance.  Bumped 25 -> 55 over a couple
       tuning passes so monsters halt about ~30 px away from the
       player, leaving plenty of room to face the threat and raise
       the directional shield before the swing connects.  Same
       constant gates both "stop advancing" (line ~262) and "attack
       if in range" (line ~292) so they stay paired -- monster halts
       and attacks at the same ring. */
    this.MONSTER_ATTACK_RANGE = 45;
    this.MONSTER_ATTACK_CD = 1500; // ms
    /* v2.3.1731: parry (see _parryOpen for why the window is 250, not 150) */
    this.PARRY_WINDOW_MS = 250;
    this.PARRY_STAGGER_MS = 1500;
    this.PARRY_STAMINA_REWARD = 10;
    this.TILE = 32;

    // Server-authoritative gather nodes (trees / fish spots / ore veins).
    // Parallel to the monster pattern above: lazy-spawn on first player
    // entry per zone, store in this.nodes, mark dirty on state change,
    // tick respawns alongside _tickMonsters().
    this.nodes = Object.create(null); // zoneId -> [node, ...]  /* v2.3.1625: null-proto (TRAPS #6) */
    this.dirtyNodes = new Set(); // zoneIds with changed node state
    /* v2.3.1592 (owner: "one resource per zone but with quick respawn"):
       2 min -> 20s, paired with the 9-nodes-per-zone -> 3 drop in
       gathering.js _getZoneNodeConfig.
       THE 20s IS PINNED BY THE ANTICHEAT, NOT BY TASTE.  botfp's
       HARVEST_HOUR_CAP (270/skill/hour) is justified as "50% above the
       PHYSICAL ceiling" — the most a teleporting bot could take if it
       harvested every node the instant it respawned.  Drop the count to one
       node per skill per zone and that ceiling becomes 3600/RESPAWN_SECONDS.
       At 20s it is 180/hour, which is exactly the ceiling the cap was
       written against, so the 50% margin survives verbatim.  At 10s it
       would be 360 — ABOVE the cap — and legitimate players would start
       tripping an anticheat that is documented as having zero false-positive
       risk by design.  If this ever needs to be faster, raise
       HARVEST_HOUR_CAP in the same commit and redo that arithmetic;
       node-respawn.test.mjs fails if the two drift apart. */
    this.NODE_RESPAWN_TIME = 20000; // 20s — see the ceiling note above

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
    /* v2.3.1690 (owner: "monsters don't attack you while you're extracting
       resources ... it's really annoying and glitchy").  How long a started
       extraction keeps monsters off you.
       v2.3.1704 (owner, again: "the monsters keep attacking you while
       harvesting resources.  I wanted monsters to ignore you during resource
       extraction"): 12s -> 120s.  12s was picked as "the wind-up plus a normal
       swipe", but v2.3.1416 had ALREADY made the ready phase hold indefinitely
       (owner: "all resources NOT have a time out window") — so the shield
       routinely lapsed while the player was still standing there mid-harvest,
       which is precisely the report.  This is now a CEILING, not the mechanism:
       _extractionShielded ends the shield on the player's live harvest signal,
       on walking off the node, on zone change, on death and on attacking, and
       the ceiling is only the backstop for a client that stops telling the
       truth.  Not unbounded, because "tap a tree, become invulnerable forever"
       is a worse bug than the one being fixed. */
    this.EXTRACT_SHIELD_MS = 120000;
    /* v2.3.1704: how far you may drift from the node and still count as
       harvesting it.  The CLIENT cancels an extraction much sooner (walk-away
       at nodeReachDist + EXTRACT_CANCEL_R = 90, and since v2.3.1500 on the
       joystick itself), so for an honest client this never fires — it exists so
       a modified client cannot carry the shield around the zone.  Generously
       above NODE_STRIKE_RANGE (110) because the gather STANCE already sits ~86
       px off the node (startExtraction's mining/fishing snap) and the server's
       view of a position lags the client's by up to a move throttle. */
    this.EXTRACT_SHIELD_RANGE = 200;
    /* ═══ v2.3.1765: THE SAME PEACE FOR COOKING AND FIREMAKING ═══
       Owner: "snowmen were still attacking me (attacks from enemies should
       stop during cooking and firemaking too)."
       The gathering shield above anchors on a live server node, and the note
       on _extractionShielded used to declare cooking/firemaking out of scope
       for exactly that reason: neither has a node, so there is nothing
       verifiable to bind to.  That reasoning decided the wrong thing.  Look at
       what the anchor is actually WORTH: the worst a liar buys from the
       gathering shield is "stand perfectly still, unable to attack, taking no
       monster damage" — and the node requirement does not make that cheaper or
       dearer, it only makes it happen next to a tree.  An immobile player who
       cannot swing has gained nothing they could not have had by walking away,
       which is the same argument that already licensed the 120s ceiling.
       So cook/fire get the shield with the two bounds that carry real weight —
       a CEILING and an ANCHOR ON WHERE THEY STOOD — and, like the node path,
       it breaks on attacking, on death, on a zone change and the instant the
       client stops reporting the activity.
       Shorter ceiling than the node path (30s vs 120s) because these are short:
       lighting a fire is 700ms client-side, and one cook is an open delay
       (<=10s) plus a 3.5s window, after which S._extraction clears, `ex` goes
       null, and the next cook re-arms a fresh window.  A player who is still
       "cooking" 30s later is not cooking. */
    this.COOK_SHIELD_MS = 30000;
    /* Cooking and firemaking are STATIONARY — the client pins the player to
       the campfire for both — so the drift allowance is tighter than the node
       path's 200 (which has to absorb startExtraction's 86px gather-stance
       snap).  Still generous enough for a move-throttle of lag. */
    this.COOK_SHIELD_RANGE = 120;
    this.EXTRACTION_TIMEOUT_MS = 600000;    // walk-away cancel is silent; sweep stale state after this.  v2.3.1416: 15s -> 10min — the harvest phase no longer times out client-side, so a strike minutes after extraction_start is legitimate; the record must outlive the player's patience (one small record per session, bounded by session count).
    this.EXTRACTION_GRACE_MS = 250;         // forgiveness on both ends to absorb network jitter
    this.SWIPE_FP_CAP_PER_SESSION = 100;    // ring-buffer the fp samples for offline analysis
    this.LATENCY_CAP_PER_SESSION = 200;     // ring-buffer the open->swipe latencies for stats
    // sessionId -> { nodeId, zone, skill, startedAt, skillLevel, nodeTier, openDelayBase }
    this.extractions = Object.create(null); // v2.3.1202: client-id-keyed (see playerState)

    // Server-authoritative ground loot.  Worker owns the canonical pile
    // list per zone; clients render from broadcasts and send pickup
    // requests via loot_pickup.  Server validates each pickup (range,
    // recipient, single-claim) and emits a private loot_credit back to
    // the picker with their authorized share + any one-of inventory.
    this.loot = Object.create(null); // zoneId -> [pile, ...]  /* v2.3.1625: null-proto (TRAPS #6) */
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

    /* v2.3.1917: open-world PvP master switch -- see _pvpAllowed.  false
       = the wilderness `lawless` flag and the threat system are both
       inert and the ONLY way to fight another player is a duel or an
       arena match, which are opt-in.  Owner: "remove the option to kill
       other players for now." */
    this.OPEN_PVP = false;

    /* v2.3.1919: how long a broken guard stays broken.  Long enough that
       turtling is a real risk rather than a rhythm — you cannot simply
       re-raise on the next frame — and short enough that one mistake does
       not decide the whole duel.  The shield's hold drain (5 per ~670ms
       tick) empties a 100 bar in about 13 seconds, so a full-stamina player
       still gets a long, deliberate block; what they no longer get is an
       indefinite one. */
    this.GUARD_BREAK_MS = 3000;

    /* v2.3.1620: leaderboard report throttle.  See reportToLeaderboard
       for the full rationale -- in short, `track` arrives every 2 s and
       the Leaderboard DO writes a row unconditionally, so this used to
       cost 1,800 rows + 1,800 cross-DO requests per player-hour to
       rewrite a mostly-identical record.
       MIN_MS       -- floor between reports when the record CHANGED.
       HEARTBEAT_MS -- ceiling: report even when unchanged, so `lastSeen`
                       stays fresh against getTop's 7-day staleness
                       filter (leaderboard.js:51).  Do not raise this
                       anywhere near 7 days. */
    /* v2.3.1635: 1 min -> 5 min.  Rank on a polled panel that already
       shows week-old data does not need minute freshness, and this is a
       cross-DO fetch that bills 1:1 with no WebSocket discount. */
    this.LEADERBOARD_MIN_MS = 300000;       // 5 min
    this.LEADERBOARD_HEARTBEAT_MS = 600000; // 10 min

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
      verdant: { fodder: 'blueSlime', brute: 'thornShambler' },   /* v2.3.1675: all blue (owner) */
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
      // v2.3.1535 (owner: "one fast squishier blue slime and the rest the
      // regular green"): the rare Verdant Wilds spawn.  1.15 is 2.3x the
      // fodder base 0.5 and sits below fireGoblin's 1.5, so it reads as
      // genuinely fast without being unoutrunnable.  The matching
      // squishiness is _variantHpMult below -- speed alone would just make
      // the zone harder.  MIRROR: src/data/monsterVariants.js blueSlime.spd
      // (mirror-audit.test.mjs pins it); a mismatch makes server-driven
      // movement fight the client's prediction and the slime rubber-bands.
      blueSlime: 1.15,
      mireWisp: 0.5,
      thornShambler: 0.5,
      bogLurker: 0.5,
    };
    return SPEEDS[variantKey];
  }

  // v2.3.1535: per-variant maxHp multiplier, applied at spawn on top of the
  // base archetype's hpMult.  Until now variants were stats-identical to
  // their base archetype and differed only in art and speed; this is the
  // first one that trades a stat.  Server-only ON PURPOSE -- HP is
  // authoritative here (handoff: the client renders maxHp from the server
  // and never derives it), so there is no client mirror to drift.
  //
  // The multiplier lands in BOTH hp and maxHp at spawn, so the respawn path
  // (m.hp = m.maxHp) carries it for free and needs no changes.
  _variantHpMult(variantKey) {
    const HP = {
      // 0.55 = a bit under two thirds.  Paired with 2.3x speed it makes the
      // blue slime a glass-cannon rush rather than a tankier chase: it
      // reaches you fast and dies fast.  XP and gold are deliberately
      // untouched -- they come off the level curve, and cutting them would
      // make the rare spawn pay worse than the common one it stands next to.
      blueSlime: 0.55,
    };
    return HP[variantKey];
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
        const m = this._makeZoneMonster(zoneId, zone, spawn, 'sm-' + zoneId + '-' + idx, x, y);
        if (m) monsters.push(m);
        idx++;
      }
    }
    return monsters;
  }

  /* v2.3.1983: ONE monster, built from a spawn entry at a given point.
     Hoisted verbatim out of the _spawnZoneMonsters double loop (only the
     id and the push/return changed) so the population scaler
     (spawnscale.js) can add a monster mid-session that is identical in
     every respect to an authored one — same entrance ramp, same variant
     resolution, same hp/dmg/xp/gold curves.  A second copy of this math
     would drift, and drifted monster stats desync client damage
     prediction from monster_hit (the v2.3.1144 lockstep lesson). */
  _makeZoneMonster(zoneId, zone, spawn, id, x, y) {
    const H = zone.h * this.TILE;
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
    /* v2.3.1535: a spawn entry may pin its own variant (verdant's single
       blueSlime among mossSlimes).  Falls back to the whole-archetype
       zone map for every other spawn, so nothing else changes. */
    const variantKey = spawn.variant || this._variantForArchInZone(spawn.arch, zoneId);
    // Variant speed override: if this (arch, zone) maps to a variant
    // with its own spd (e.g. ember fodder -> fireGoblin spd 1.5),
    // use it.  This is what makes server-driven AI move the variant
    // at the right pace, so the client can stop running its own AI
    // for the variant (was the `clientSideMovement: true` escape
    // hatch on the client side).
    const variantSpd = variantKey ? this._variantSpeed(variantKey) : null;
    const finalSpd = (variantSpd != null) ? variantSpd : (0.5 * a.spdMult);
    /* v2.3.1535: variant HP trade (blue slime = fast but squishy).
       Multiplies the archetype's own hpMult; absent for every other
       variant, so they stay exactly as they spawned before. */
    const variantHpMult = variantKey ? this._variantHpMult(variantKey) : null;
    const hpMult = a.hpMult * ((variantHpMult != null) ? variantHpMult : 1);
    const spawnHp = Math.max(1, Math.ceil(baseHp * hpMult) + monsterHpFlat(lvl));
    return {
      id,
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
      hp: spawnHp, /* v2.3.1364: Lv1-2 -> flatLow; v2.3.1535: + variant hp mult */
      maxHp: spawnHp,
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
    };
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
  /* v2.3.1640: the damage half of a monster attack, shared by the melee
     swing in _tickMonsters and the ranged snowball impact.  Extracted
     rather than copied: a second copy of the thorn/hexer/lifesteal/death
     sequence would drift, and this repo has been bitten by exactly that
     (the client/server zone tables, which now need a lockstep test).

     atkX/atkY become the event's attackerX/attackerY.  For melee that is
     the monster's own position.  For a snowball it is the IMPACT POINT,
     and that distinction is load-bearing: the client drops any
     monster_attack whose attacker is more than 160px away
     (src/networking/gameEvents.js) — a deliberate guard against "mystery
     damage with no visible attacker".  A ranged hit reported from the
     thrower's position would trip that guard and the player would lose HP
     with no popup, no flash, and no defense XP.  Reported from the impact
     point it passes cleanly, and every visible effect the client draws
     (popup, hit flash, particles, shake, defense XP) is anchored on the
     PLAYER anyway — so this renders correctly on clients that are already
     deployed, with no client change and no caps flag. */
  _monsterStrikePlayer(zoneId, m, targetId, atkX, atkY) {
    const now = Date.now();
    // Apply HP damage server-side BEFORE emitting the event so
    // dmgTaken rides on the wire and the client renders the
    // exact number the server applied.
    const targetPs = this.playerState[targetId];
    /* ═══ v2.3.1704: A HARVESTER TAKES NO MONSTER DAMAGE, FULL STOP ═══
       Owner: "the monsters keep attacking you while harvesting resources."
       The aggro filter in _tickMonsters is the primary fix (the monster never
       comes over), but this method is the ONE choke point every monster→player
       hit funnels through, and one caller sits deliberately outside the aggro
       branch: the in-flight snowball resolved at the top of the monster loop,
       which lands even on a target the monster has since lost interest in
       (v2.3.1640, and rightly so — a ball in the air is committed).  Without
       this line, tapping a tree while a snowball was airborne still knocked
       the swipe out from under you, which is the exact interruption being
       fixed.  Silent, like a dodge: no monster_attack event, so the client
       draws nothing rather than a "0" it would have to explain. */
    if (this._extractionShielded(targetId, now)) return;
    /* ═══ v2.3.1686: THE BLOCK IS RESOLVED HERE, AT IMPACT ═══
       Owner: "it seems like snowman don't launch projectiles while the
       character is blocking, which isn't the correct behavior. It should
       still launch projectiles."
       The throw used to be gated on `!nearest.blocking`, so raising a shield
       stopped snowballs being created at all — a block that deleted the
       attack rather than stopping it, and it read as the monster freezing.
       That gate is gone; the ball now flies whatever the player is doing.
       Which moves the question to WHEN the block counts, and impact is the
       only correct answer: the ball is ~900ms in the air, so a shield raised
       (or dropped) mid-flight has to matter.  Reading `targetPs.blocking`
       here rather than trusting the caller is what makes that true, and it
       matches what the client has always done for slime orbs ("Block/shield
       is recomputed at impact since the player can raise shield mid-flight",
       monsterCombat.js).
       The melee path still short-circuits on its own blocking branch before
       reaching this method, so nothing is handled twice. */
    /* v2.3.1705: …and facing the right way.  atkX/atkY is where the attack came
       FROM (the thrower for a snowball, the monster for a swing), which is
       exactly what the arc has to be measured against. */
    const _blocking = this._blockArcCovers(targetPs, atkX, atkY);
    const dmgResult = this._applyDamage(targetPs, m.dmg, _blocking);
    const dmgTaken = dmgResult.dmgTaken;
    /* Same block cost the melee branch charges (15 × Bulwark efficiency),
       so blocking a snowball and blocking a swing cost the same stamina. */
    let _blockStamina = 0;
    /* v2.3.1704: … unless blocking is free for the demo (see
       BLOCK_COSTS_STAMINA in data.js).  Left as a guard on the
       whole branch rather than a zeroed cost so no pool write, no coalesced
       save and no wire field happens at all. */
    if (BLOCK_COSTS_STAMINA && _blocking && targetPs && typeof targetPs.stamina === 'number') {
      _blockStamina = Math.max(1, Math.round(15 * this._blockStaminaMult(targetPs)));
      targetPs.stamina = Math.max(0, targetPs.stamina - _blockStamina);
      this._saveRpgPools(targetId, targetPs);
    }
    /* v2.3.1569: THORN retaliation (Flora's status).  Every other
       status is something that happens TO the monster over time;
       thorn is the one that answers the monster's own aggression,
       so it lands here — the moment the monster commits to an
       attack — rather than on a passive timer.  A timer would just
       make it a weaker Burn and lose the identity the GDD gives
       Flora ("the only status that punishes enemies for
       attacking").  Same power-snapshot pricing as burn/root, and
       it routes through the normal kill-credit path so a monster
       that thorns itself to death still pays out. */
    if (m.statuses && m.statuses.thorn) {
      const _th = m.statuses.thorn;
      const _recoil = Math.round(4 + (_th.power || 0) * 0.25);
      if (_recoil > 0) this._applyMonsterDot(zoneId, m, _recoil, _th.sourceId, 'thorn');
    }
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
        targetId,
        dmg: m.dmg,
        dmgTaken,
        dodged: dmgResult.dodged,
        /* v2.3.1686: tells the client to show "Blocked!" + the stamina cost
           instead of an HP number.  undefined when not blocking, so
           JSON.stringify drops both and the wire is unchanged for every
           existing hit — an old client simply sees dmgTaken 0. */
        blocked: _blocking || undefined,
        /* v2.3.1704: `> 0`, not just `_blocking` — with the free-block flag
           on this would otherwise send 0 and the client's v2.3.1686 popup
           would float a "-0⚡" next to every Blocked!. */
        staminaDrain: (_blocking && _blockStamina > 0) ? _blockStamina : undefined,
        // v2.3.1137: Second Wind heal rides the attack event so the
        // client pops the green number without a round-trip (the
        // authoritative hp echo arrives via player_state anyway).
        // v2.3.1314: Last Stand survival flag rides the same way.
        lastStand: dmgResult.lastStand || undefined,
        // undefined when 0 -- JSON.stringify drops it from the wire.
        secondWind: dmgResult.secondWind || undefined,
        zone: zoneId,
        attackerX: atkX,
        attackerY: atkY,
      }
    });
    // Echo authoritative hp to the victim + persist.  Death
    // check feeds the player_died event below.
    if (targetPs) {
      this._saveRpgVitals(targetId, targetPs); // v2.3.1623: coalesced unless near death
      this._queuePlayerStateFlush(targetId);
      if (targetPs.hp <= 0 && !targetPs.dying) {
        this._handlePlayerDeath(targetPs, targetId, 'monster:' + m.id);
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

  _tickMonsters() {
    const now = Date.now();
    const activeZones = this._activeZones();

    // v2.3.1183: one pass over playerState per tick, not one per active
    // zone -- and slim {id,x,y,blocking} records instead of spreading
    // the full ~50-field state (inventory, quest maps, ...) per player
    // per zone at 45 Hz.  The AI below reads these five fields from the
    // slim copy (all its mutations go through this.playerState[nearest.id]),
    // so behavior is unchanged; the copies were read-only.
    // v2.3.1726: the slim copy is deliberately NOT given `ba` — the melee
    // block-arc check reads the FULL record via this.playerState[nearest.id]
    // instead.  v2.3.1705 added the arc check against the slim copy, and
    // _blockArcCovers fail-opens on a missing facing (an old-client
    // affordance), so monster melee silently stayed omnidirectional for
    // seven versions while snowballs and boss abilities were directional.
    // If you add a reader here, take the full record or widen this comment.
    const playersByZone = new Map();
    for (const [id, ps] of Object.entries(this.playerState)) {
      if (ps.dead || ps.disconnected || !ps.z) continue;
      let arr = playersByZone.get(ps.z);
      if (!arr) playersByZone.set(ps.z, arr = []);
      /* v2.3.1690: `extracting` rides along so the AI can leave a harvester
         alone without a second pass over playerState. */
      arr.push({ id, x: ps.x, y: ps.y, blocking: ps.blocking,
        extracting: this._extractionShielded(id, now) });
    }

    for (const zoneId of activeZones) {
      const monsters = this._ensureZoneMonsters(zoneId);
      if (!monsters || monsters.length === 0) continue;

      const playersInZone = playersByZone.get(zoneId) || [];

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
            /* ═══ v2.3.1709: A RESPAWNED MONSTER COMES BACK CLEAN ═══
               Owner, playtesting before judging: "the slimes were apparently
               brand new ones that I had freshly killed in that zone.  I saw
               no damage from any other person on them.  And new ones that
               spawned still attributed the loot to that other person."

               `m.statuses` was created (elemental.js) and never cleared —
               not on death, not here.  So a burn or a thorn another player
               landed OUTLIVED the monster it was on: the corpse respawned
               still burning, still stamped with THEIR sourceId, and every
               DoT tick after that credited them through _applyMonsterDot,
               which writes straight into dmgByPlayer.  A slime the owner
               killed single-handedly therefore listed a contributor they had
               never seen touch it, and once that stale credit outgrew the
               GDD §7 gold cutoff (share < 0.05) the owner dropped out of
               `goldRecipients` entirely — so the pile said it was somebody
               else's and `_handleLootPickup` refused the grab with
               'not-recipient'.  It compounded across lives, which is why it
               looked like a curse that followed them rather than one bad
               kill.

               dmgByPlayer is reset at the end of _resolveMonsterKill, but it
               is cleared HERE too on purpose: that reset only runs on the
               kill path, and anything that lands damage between the kill and
               the respawn (a DoT tick resolving after death, a reflect) puts
               credit back onto a corpse.  Belt and braces on the field that
               decides who owns the loot. */
            m.statuses = Object.create(null); // v2.3.1709: null-proto, rule 4
            m.dmgByPlayer = Object.create(null);
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
        /* v2.3.1733: a STUN is a freeze with a different source.  Shield
           Bash stamps _stunUntil (abilities.js); folding it into
           ccMoveMult rather than adding a second gate means it inherits
           every check the CC semantics already own — no chasing, no basic
           swing, no snowball, no telegraph start — from one line, instead
           of four places that could each be forgotten. */
        const _stunned = m._stunUntil && now < m._stunUntil;
        const ccMoveMult = _stunned ? 0 : elementMoveMult(m);
        /* v2.3.1730: resolve a wind-up already in flight, BEFORE target
           acquisition and regardless of aggro.  A player who runs away
           mid-cast used to strand the monster in a pending telegraph
           forever — see the note on _resolveMonsterTelegraph. */
        if (this._resolveMonsterTelegraph(zoneId, m, now)) continue;

        /* v2.3.1640: resolve an in-flight snowball.  Deliberately OUTSIDE
           the aggro branch and ahead of it — a thrown ball is already in
           the air, so it must land even if the target walked out of aggro
           range, died, or the monster lost interest.  Gating this on aggro
           would make walking backwards delete incoming damage, which is
           exactly the "monsters can't touch me" problem the whole change
           exists to fix. */
        if (m._projImpactAt && now >= m._projImpactAt) {
          const _pt = m._projTargetId;
          const _ptx = m._projTx;
          const _pty = m._projTy;
          m._projImpactAt = 0;
          m._projTargetId = null;
          const _tps = _pt ? this.playerState[_pt] : null;
          /* DODGE: the ball lands where it was aimed.  A player who moved
             more than SNOWBALL_HIT_RADIUS from that point in the 900ms
             flight is missed outright — that is what makes the telegraph a
             real mechanic rather than decoration, and it is the honest
             counterpart to the client visual, which flies to the aim point
             and sails past a player who stepped aside.  Radius is generous
             (the client despawns its visual at 16px) so ordinary
             client/server position drift never steals a hit the player
             believed they took. */
          const _hit = _tps && (typeof _ptx !== 'number' ||
            Math.hypot((_tps.x || 0) - _ptx, (_tps.y || 0) - _pty) <= this.SNOWBALL_HIT_RADIUS);
          /* Still in the same zone, alive, and not mid-respawn. */
          if (_hit && _tps.z === zoneId && !_tps.dying && (_tps.hp || 0) > 0) {
            /* v2.3.1705: …and facing it.  The direction is taken from the
               THROWER (m), not from the ball's landing point: the ball lands on
               the player, so its own position carries no direction, and a
               snowball you never turned to face should get through exactly like
               a swing from behind does. */
            if (this._blockArcCovers(_tps, m.x, m.y)) {
              /* Blocked. Evaluated at IMPACT, not at throw — raising the
                 shield while the ball is in the air has to work, or the
                 telegraph is decoration.  Emits a blocked monster_attack
                 so the client shows the same BLOCK feedback a blocked
                 swing gives; no stamina drain, since that cost is tied to
                 the melee cadence and adding a second drain source would
                 be a balance change smuggled in with a feature. */
              this.eventBuffer.push({
                type: 'monster_attack',
                payload: {
                  monsterId: m.id,
                  targetId: _pt,
                  dmg: m.dmg,
                  dmgTaken: 0,
                  blocked: true,
                  zone: zoneId,
                  attackerX: _tps.x,
                  attackerY: _tps.y,
                }
              });
            } else {
              this._monsterStrikePlayer(zoneId, m, _pt, _tps.x, _tps.y);
            }
          }
        }

        // Find nearest player for aggro.  If the monster has a recent
        // sticky-aggro override (someone shot it with a bow, etc.),
        // prefer that target even if they're outside proximity range.
        // This is what makes ranged attacks actually pull a monster
        // off its wander -- previously aggro was proximity-only so a
        // sniped mummy just took the hit and kept patrolling.
        /* ═══ v2.3.1704: A HARVESTER IS NOT A TARGET ═══
           Owner: "I wanted monsters to IGNORE you during resource extraction."
           v2.3.1690 only suppressed the swing and the throw, which left the
           monster free to acquire the harvester, walk over and stand on top of
           them for the whole extraction — silent, but it reads as being
           attacked, and it is not what was asked for.  Extracting players are
           now invisible to target acquisition outright: the monster keeps its
           distance and falls through to idle wander (which clears m.targetId),
           and it re-acquires the instant the shield ends.
           This also drops a sticky aggro override that points at a harvester —
           a bow-snipe followed by a tap on a tree would otherwise have dragged
           the monster across the zone to hover.  Dropping rather than parking
           the override is deliberate: re-provoking is one arrow, whereas a
           held override would make the monster pounce the instant the swipe
           lands, which is the interruption the owner is complaining about. */
        let nearest = null;
        let nearestDist = Infinity;
        const stickyAggroActive = m._aggroOverrideUntil && now < m._aggroOverrideUntil;
        if (stickyAggroActive) {
          const _sticky = playersInZone.find(p => p.id === m._aggroOverrideTarget);
          const stickyP = (_sticky && _sticky.extracting) ? null : _sticky;
          if (stickyP) {
            const dxS = stickyP.x - m.x;
            const dyS = stickyP.y - m.y;
            nearest = stickyP;
            nearestDist = Math.sqrt(dxS * dxS + dyS * dyS);
          } else {
            // Sticky target left the zone (or started harvesting, v2.3.1704)
            // -- drop the override and fall through to proximity.
            m._aggroOverrideTarget = null;
            m._aggroOverrideUntil = 0;
          }
        }
        if (!nearest) {
          for (const p of playersInZone) {
            /* v2.3.1704: harvesters are skipped, not merely spared.  If every
               player in the zone is extracting, `nearest` stays null and the
               monster wanders — which is the whole point. */
            if (p.extracting) continue;
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
        /* v2.3.1409 (owner: "snowmen attacks are lethargic — I can stand
           there for 5 seconds and they won't attack me once").  Geometry
           conflict, not AI: the snowman's CLIENT collision body
           (BroTown _monBody: disc centred 19px above the feet, r13+10)
           push-outs the player to ~42px from m.y, but the attack test
           here needs dy <= 45/Y_SCALE = 15px — so the client physically
           holds the player OUTSIDE the attack window forever and the
           push (≈120px/s at 60fps) outruns the snowman's slowest-in-game
           chase (spdMult 0.8).  Slimes don't collide with their own
           window (low body disc) which is why only the tall snowman
           reads as passive.  Relax the ring for snowmen only: range 70
           with Y_SCALE 1.5 puts the collision equilibrium (dy≈42 ->
           scaled 63) inside reach on every approach angle. */
        const _atkRange = m.arch === 'snowman' ? 70 : ATTACK_RANGE;
        const _yScale = m.arch === 'snowman' ? 1.5 : Y_SCALE;
        // Effective aggro range -- bumps to 1200 px when the sticky
        // override is active, so a bow-snipe from anywhere on screen
        // pulls the monster.  Without the bump the monster could be
        // damaged but still wouldn't pass the proximity gate to enter
        // the chase branch.
        /* v2.3.1639: per-archetype base range (MONSTER_AGGRO_BY_ARCH),
           falling back to the 120 default for every archetype not listed.
           Object.create(null)-safe: `m.arch` is a server-authored spawn
           field, never client-supplied, but read it defensively anyway so a
           future client-fed arch can't reach Object.prototype. */
        const _archAggro = Object.prototype.hasOwnProperty.call(this.MONSTER_AGGRO_BY_ARCH, m.arch)
          ? this.MONSTER_AGGRO_BY_ARCH[m.arch]
          : this.MONSTER_AGGRO_RANGE;
        const effAggroRange = stickyAggroActive ? 1200 : _archAggro;
        if (nearest && nearestDist < effAggroRange) {
          m.targetId = nearest.id;
          const dxA = nearest.x - m.x;
          const dyA = nearest.y - m.y;
          const attackDist = Math.sqrt(dxA * dxA + (dyA * _yScale) * (dyA * _yScale));

          // Move toward player -- but freeze in place while the monster
          // is in the middle of its post-attack animation window.  The
          // worker stamps m._attackingUntil after firing a monster_attack
          // event so the body stops sliding during the swing/lunge sheet.
          const attackingNow = m._attackingUntil && now < m._attackingUntil;
          if (attackDist > _atkRange && !attackingNow && ccMoveMult > 0) {
            const dx = nearest.x - m.x;
            const dy = nearest.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              /* v2.3.1639: walk off knockback debt (server/src/combat.js).
                 A shove is recorded rather than reduced, and repaid here at
                 KB_RECOVER_PX_PER_TICK on top of the normal chase step, so
                 a 30px hit is undone in ~600ms — one player swing — instead
                 of the ~2.8s a snowman's 0.4 px/tick would take on its own.
                 Repaid only while CHASING and only toward the target: a
                 monster that loses aggro or wanders keeps its ground rather
                 than gliding, and the debt is dropped on aggro loss below. */
              let step = m.spd * ccMoveMult;
              if (m._kbDebt > 0) {
                const repay = Math.min(m._kbDebt, this.KB_RECOVER_PX_PER_TICK) * ccMoveMult;
                step += repay;
                m._kbDebt -= repay;
                if (m._kbDebt < 0.01) m._kbDebt = 0;
              }
              m.x += (dx / dist) * step;
              m.y += (dy / dist) * step;
              this._markMonsterDirty(zoneId, m.id);
            }
          }

          /* ═══ v2.3.1640: RANGED ATTACK (the snowman's snowball) ═══
             Owner: "the snow men are way too passive ... might be good to
             make a snowball projectile or more aggressive."

             This is the design answer to a monster that is too slow to
             ever close.  A snowman chases at 18 px/s against a 150 px/s
             walk — it can NEVER reach a player who doesn't want to be
             reached, so melee-only means its threat is entirely opt-in.
             Giving the slow, tanky archetype a ranged attack turns that
             slowness from a bug into its identity: you can always walk
             away from a snowman, but not for free.

             Fires only in the band BETWEEN melee reach and the aggro
             radius, so closing to melee still switches it back to
             swinging and the two never compete for the same tick. */
          const _rangedCfg = Object.prototype.hasOwnProperty.call(this.MONSTER_RANGED_BY_ARCH, m.arch)
            ? this.MONSTER_RANGED_BY_ARCH[m.arch]
            : null;
          if (_rangedCfg
              && !m._projImpactAt                      /* one ball in the air at a time */
              && attackDist > Math.max(_atkRange, _rangedCfg.minRange)
              && attackDist <= _rangedCfg.range
              && now > m.atkCd
              && ccMoveMult > 0                        /* frozen/rooted can't throw either */
              /* v2.3.1686: the `!nearest.blocking` term that used to sit here
                 is GONE (owner: "it should still launch projectiles").  A
                 raised shield stopped the ball being created at all, so
                 blocking deleted the attack instead of stopping it and the
                 monster looked frozen.  The block is now resolved when the
                 ball LANDS — see _monsterStrikePlayer. */
              /* v2.3.1690: ...but a harvester IS left alone — the whole point
                 is not interrupting the swipe, and a ball in the air lands on
                 it just as rudely as a swing.
                 v2.3.1704: unreachable by construction now (an extracting
                 player is filtered out of target acquisition above, so
                 `nearest` can never be one).  Kept as the second line of
                 defence — if a future change ever lets monsters target a
                 harvester again for movement or telegraph reasons, the throw
                 must still not fire. */
              && !nearest.extracting) {
            m.atkCd = now + _rangedCfg.cd;
            m._attackingUntil = now + 400;
            m._projImpactAt = now + _rangedCfg.travelMs;
            m._projTargetId = nearest.id;
            /* Where the ball is aimed.  Stored so the impact can MISS: the
               ball flies to this point, not to wherever the player ends up,
               which is what makes the 900ms telegraph mean something.
               Without it the throw would be an undodgeable homing hit and
               the slow readable arc would be pure decoration. */
            m._projTx = nearest.x;
            m._projTy = nearest.y;
            /* Display-only event: it carries NO damage and the client
               applies none.  The authoritative hit lands on the impact
               tick via _monsterStrikePlayer.  Registered in
               PRIVILEGED_EVENTS so a client can't forge incoming balls.
               Deploy-order safe in both directions with no caps flag: an
               OLD client ignores an unknown event type (its message
               switch has no default side effects) and simply sees the
               damage arrive as it always did, while a NEW client against
               an OLD worker never receives one because the old worker
               never throws. */
            this.eventBuffer.push({
              type: 'monster_projectile',
              payload: {
                monsterId: m.id,
                /* v2.3.1678: the archetype decides the look.  A snowman
                   throws a snowball; a slime spits an orb. */
                kind: m.arch === 'snowman' ? 'snowball' : 'slime',
                zone: zoneId,
                x: m.x,
                y: m.y,
                tx: nearest.x,
                ty: nearest.y,
                travelMs: _rangedCfg.travelMs,
              }
            });
            this._markMonsterDirty(zoneId, m.id);
          }

          /* v2.3.1730: START a telegraphed ability (brute slam, stalker
             pounce).  ABOVE the basic swing so a wind-up suppresses it —
             the two must never resolve on the same tick, or the tell is a
             free extra hit instead of a choice.  The RESOLVE half runs
             earlier and unconditionally (see the call before the aggro
             branch); only starting one needs a live target.
             Gated on ccMoveMult like the swing below: a frozen or rooted
             monster cannot begin a cast either (v2.3.1139's rule). */
          if (ccMoveMult > 0 && this._maybeStartTelegraph(zoneId, m, nearest, attackDist, now)) {
            continue;
          }

          // Attack player if in range.  v2.3.1139: frozen/rooted
          // monsters can't swing either (client gates the whole AI
          // branch on moveMult > 0 -- mirror that here).
          if (attackDist <= _atkRange && now > m.atkCd && ccMoveMult > 0) {
            // Don't fire damage events while the player is blocking — the
            // client's monster_attack handler also computes block reduction,
            // but that path was producing inconsistent block resolution
            // (client snapshot of monster position can drift from server,
            // making the directional arc test miss). Skipping the event
            // entirely when the player has shield up gives reliable
            // blocking. We still set atkCd so the monster doesn't keep
            // queuing while the player blocks.
            /* v2.3.1690 (owner: "monsters don't attack you while you're
               extracting resources"): the swing is skipped outright, cooldown
               still stamped so the monster does not queue one up for the
               instant the swipe lands.  Placed ABOVE the blocking branch so a
               harvester is left alone whether or not a shield happens to be
               up.
               v2.3.1704: like the throw gate above, this is now unreachable by
               construction (harvesters are filtered out of aggro entirely) and
               is kept as the second line of defence.  The line that actually
               guarantees no damage is in _monsterStrikePlayer. */
            if (nearest.extracting) {
              m.atkCd = now + this.MONSTER_ATTACK_CD;
              m._attackingUntil = 0;
              continue;
            }
            /* v2.3.1726: arc-test the FULL record, not the slim projection.
               `nearest` (built at the top of the tick, v2.3.1183) has no
               `ba`, and _blockArcCovers deliberately fail-opens on a missing
               facing — so this check, added as "directional" in v2.3.1705,
               actually made every monster melee swing blockable from behind.
               The owner's report was the symptom: "the shield blocks all
               attacks from everywhere."  The full record is one map hit and
               was already being fetched a few lines down for stamina. */
            const blockerPs = this.playerState[nearest.id];
            if (this._blockArcCovers(blockerPs, m.x, m.y)) { // v2.3.1705: directional; v2.3.1726: actually so
              m.atkCd = now + this.MONSTER_ATTACK_CD;
              m._attackingUntil = now + 400;
              // Block cost: 15 stamina (mirrors client at BroTown.jsx:2663).
              // Server is authoritative for stamina now, so deduct here
              // and echo via player_state so the bar visibly drops.
              // v2.3.1153: × Bulwark block-stamina efficiency (−1%/pt,
              // cap −50%).  The exact cost rides the wire as
              // staminaDrain below, so pre-fix clients render the
              // discounted number correctly with zero client changes.
              // v2.3.1704: free for the demo — see BLOCK_COSTS_STAMINA in data.js.
              /* v2.3.1731: a shield RAISED IN TIME is a parry — costs
                 nothing, pays stamina back, and staggers the swing. */
              const _parried = this._parryOpen(blockerPs, now);
              if (_parried) this._applyParry(zoneId, m, nearest.id, blockerPs, now);
              /* v2.3.1731: 15 -> 10, and BLOCK_COSTS_STAMINA is ON again.
                 Deliberately a per-BLOCKED-HIT cost and NOT a hold tax: a
                 drain-while-held punishes the player who raises early and
                 reads the fight, which is the exact behaviour v2.3.1730's
                 wind-ups exist to teach.  Paying per hit absorbed still ends
                 infinite turtling, because the hits are what drain you. */
              const staminaCost = (BLOCK_COSTS_STAMINA && !_parried)
                ? Math.max(1, Math.round(BLOCK_STAMINA_COST * this._blockStaminaMult(blockerPs)))
                : 0;
              if (staminaCost > 0 && blockerPs && typeof blockerPs.stamina === 'number') {
                blockerPs.stamina = Math.max(0, blockerPs.stamina - staminaCost);
                /* v2.3.1619b: stamina only -> coalesced (see
                   _saveRpgPools).  This fires on the monster-attack
                   cadence, so a player holding a shield in a fight was
                   writing a full rpg blob every 1.5 s per engaged
                   monster.  The wire is unchanged -- the flush below
                   still runs every time, so the stamina bar drops
                   exactly as before. */
                this._saveRpgPools(nearest.id, blockerPs);
                this._queuePlayerStateFlush(nearest.id);
              }
              // v2.3.1137: THORNS — reflect 1%/pt of the monster's attack
              // back at it on every successful block (cap 50% at the
              // defenseSpec clamp).  Server-owned: the reflect is
              // authoritative damage, credited like any hit so a thorns
              // kill pays XP/loot/quests through the shared pipeline.
              // slot 'thorns' denies melee lifesteal exactly like 'dot'
              // (you didn't swing — nothing to refund).
              // v2.3.1659 (prog3): thorns is a dropped channel for
              // respecced players — the stored points must not keep
              // firing (the banked flat already reads 0 via _t2Flat's
              // prog3 gate, but the trigger reads raw points).
              const _thornsPts = (blockerPs && !blockerPs.prog3 && blockerPs.defenseSpec && blockerPs.defenseSpec.thorns) || 0;
              if (_thornsPts > 0 && m.hp > 0) {
                const reflect = Math.min(Math.max(0, m.hp),
                  Math.max(1, this._t2Flat(blockerPs, 'defense', 'thorns'))); // v2.3.1451: bench-locked banked payback (was t2Accel)
                m.hp -= reflect;
                if (!m.dmgByPlayer) m.dmgByPlayer = Object.create(null); // v2.3.1202: player-id-keyed
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
                  parried: _parried || undefined, /* v2.3.1731 */
                  staminaDrain: staminaCost > 0 ? staminaCost : undefined, /* v2.3.1704: no 0 on the wire (the client pops it as "-0⚡") */
                  zone: zoneId,
                  attackerX: m.x,
                  attackerY: m.y,
                }
              });
              continue;
            }
            m.atkCd = now + this.MONSTER_ATTACK_CD;
            m._attackingUntil = now + 400;
            /* v2.3.1640: the damage half of a monster attack now lives in
               _monsterStrikePlayer so the melee swing here and the ranged
               snowball impact share ONE implementation.  attackerX/Y is the
               melee monster's own position; the ranged path passes the impact
               point instead (see the method for why that matters). */
            this._monsterStrikePlayer(zoneId, m, nearest.id, m.x, m.y);
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
          /* v2.3.1639: drop any unpaid knockback debt on aggro loss, so a
             monster shoved and then abandoned doesn't bank it and glide on
             its next engagement. */
          m._kbDebt = 0;
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
          this._applyMonsterDot(zoneId, m, ev.dmg, ev.sourceId, ev.statusId);
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
    /* v2.3.1626: own-property lookup -- C['constructor'] is a truthy
       inherited FUNCTION, which would be returned as the category and
       then used as a key into the channel tables (TRAPS #6, same sweep
       as gear.js _weaponBase). */
    return Object.prototype.hasOwnProperty.call(C, type) ? C[type] : 'sword';
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
  // v2.3.1659 (prog3): 0 for respecced players — the three per-weapon
  // crit channels collapsed into the global `crit` allocated stat, so
  // the deterministic lucky-hit accumulator retires with them (the
  // spec points stay stored for rollback and must not keep paying).
  _wpnCritPts(ps, type) {
    if (ps && ps.prog3) return 0;
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
  // v2.3.1451 (bench-locked T2): the BANKED flat value of the type's
  // damage / crit-damage channel — reads the server-owned accumulator
  // (ps.t2Flat, priced in grids.js at spend time), NOT a formula over
  // point counts.  The point-count twins above survive for the crit
  // COUNTER (_wpnCritPts) and any stale display reader.
  _wpnDmgFlat(ps, type) {
    const K = { sword: 'edge', bow: 'drawPower', staff: 'spellPower' };
    const cat = this._wpnCat(type);
    return this._t2Flat(ps, cat, K[cat]);
  }
  _wpnCritDmgFlat(ps, type) {
    const K = { sword: 'executioner', bow: 'headshot', staff: 'focus' };
    const cat = this._wpnCat(type);
    return this._t2Flat(ps, cat, K[cat]);
  }
  // v2.3.1136: Attunement status-duration multiplier.  Successor to the
  // retired Influence bonus; weaponSpecs is server-clamped so a forged
  // client can't exceed the cap.  Applies to statuses from ANY weapon's
  // element (global, matching the Influence it replaces).
  _attuneMult(ps) {
    // v2.3.1343 (kid-simple reprice): +1%/pt, ceiling ×2.00 — fire &
    // ice last twice as long at the 100-pt cap.  elemental.js's
    // durMult clamp rises in lockstep.
    // v2.3.1659 (prog3): ×1 for respecced players — attunement is on
    // the dropped-channel casualty list (PROGRESSION-REDESIGN §4).
    if (ps && ps.prog3) return 1;
    const pts = (ps && ps.weaponSpecs && ps.weaponSpecs.staff && ps.weaponSpecs.staff.attunement) || 0;
    return 1 + Math.min(100, pts) * 0.01;
  }
  // v2.3.1153: BULWARK repurposed — block stamina efficiency, −1%/pt on
  // both block stamina costs (per-blocked-hit AND shield-hold drain),
  // cap −50% at the [0,50] defenseSpec clamp.  The channel's original
  // block-%-mitigation identity died when full-block-invuln shipped
  // (owner directive, v2.3.232; reaffirmed 2026-07-03 — blocks stay
  // 100%), leaving Bulwark inert since v2.3.1021.  New identity: "hold
  // your shield twice as long, block twice as many hits."  defenseSpec
  // is client-trained but server-clamped, so the discount is bounded.
  /* ═══ v2.3.1705: THE BLOCK IS DIRECTIONAL ═══
   * Owner, asked directly: "yes blocking should be directional."
   *
   * v2.3.1110 unified client and server on an OMNI block, and every arc test
   * in the game was commented out rather than deleted.  This is the server's
   * half of putting it back: does the attack, coming from (ax, ay), land
   * inside the wedge the player's shield is facing?
   *
   * `ps.ba` is the shield's facing angle, ridden in on the move message
   * (movement.js) so it is measured against the SAME position update the
   * geometry below uses.  It is deliberately FAIL-OPEN: undefined/null means
   * "this client has not told us where it is pointing", which is exactly the
   * state of every pre-v2.3.1705 client, and those keep the omni block they
   * have today rather than losing their shield to a deploy-order gap.
   *
   * BLOCK_ARC_HALF is mirrored from src/data/gameSystems.js and is the same
   * number the shield cone is DRAWN at (effectsRenderer) — the picture on the
   * player's screen is the hitbox, which is the whole reason the owner asked
   * for the cone in the first place.  Retune one, retune all three.
   *
   * Degenerate geometry (the attacker standing exactly on the player) has no
   * meaningful direction, so it counts as covered — a monster inside your own
   * hitbox is not a flanking manoeuvre. */
  _blockArcCovers(ps, ax, ay) {
    if (!ps || !ps.blocking) return false;
    if (typeof ps.ba !== 'number' || !Number.isFinite(ps.ba)) return true; // old client: omni
    const dx = (ax || 0) - (ps.x || 0), dy = (ay || 0) - (ps.y || 0);
    if (dx * dx + dy * dy < 1) return true;
    const from = Math.atan2(dy, dx);
    const d = ((from - ps.ba + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return Math.abs(d) <= BLOCK_ARC_HALF;
  }

  /* ═══ v2.3.1731: PARRY — the reward for blocking ON TIME ═══
     Owner: "No timed blocking, no dodging, etc."  v2.3.1730 gave monsters a
     wind-up; this gives the wind-up an answer better than standing there
     with the shield already up.

     A hit landing within PARRY_WINDOW_MS of the shield going UP is negated,
     staggers the attacker, and pays stamina back instead of costing it.
     Server-OBSERVED, never client-claimed (see movement.js): an "I parried!"
     flag on the wire would be the purest possible self-report, and TRAPS #13
     is the rule that a handler is audited by what it WRITES.

     250ms, not the 150ms the UI spec drew.  The window is measured from a
     `move` packet sent on a 22ms cadence that then crosses the internet, so
     the tolerance has to swallow a packet's jitter or a correctly-timed
     parry on a phone simply would not register.  The dormant client ring
     (blockRingBus.resolveIncoming) could use 150ms because it compared local
     input against local state with no network in the middle. */
  _parryOpen(ps, now) {
    if (!ps || !ps.blocking) return false;
    const t = ps.blockStartT;
    if (typeof t !== 'number' || t <= 0) return false;   /* old client: no stamp, no parry */
    return now >= t && (now - t) <= this.PARRY_WINDOW_MS;
  }

  /* Staggering is what makes a parry worth the risk: the attacker loses its
     next swing AND any wind-up it was in, so the reward is TEMPO rather than
     a damage number.  A parried cast takes its full cooldown — interrupting
     it into an instant retry would punish the parry. */
  _applyParry(zoneId, m, pid, ps, now) {
    m.atkCd = Math.max(m.atkCd || 0, now + this.PARRY_STAGGER_MS);
    m._attackingUntil = 0;
    if (m._tgPhase) {
      m._tgPhase = null; m._tgUntil = 0; m._tgAim = null; m._tgTarget = null;
      m._tgNextAt = now + this.PARRY_STAGGER_MS;
    }
    if (typeof ps.stamina === 'number') {
      ps.stamina = Math.min(ps.maxStamina || 100, ps.stamina + this.PARRY_STAMINA_REWARD);
    }
    this.eventBuffer.push({
      type: 'parry',
      payload: { zone: zoneId, monsterId: m.id, targetId: pid, x: Math.round(m.x), y: Math.round(m.y) },
    });
    this._markMonsterDirty(zoneId, m.id);
  }

  _blockStaminaMult(ps) {
    // v2.3.1343 (kid-simple reprice): -1%/pt, cap -100% — free blocking
    // at max.  Safe ONLY because both cost sites keep their
    // Math.max(1, …) floor (a block always drains at least 1 stamina —
    // no permanent-invuln turtle; hardening.test pins the floor).
    // v2.3.1659 (prog3): ×1 for respecced players — bulwark is a
    // dropped channel; block costs return to full price.
    if (ps && ps.prog3) return 1;
    const pts = (ps && ps.defenseSpec && ps.defenseSpec.bulwark) || 0;
    return 1 - Math.min(1.00, Math.min(100, pts) * 0.01);
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
  /* v2.3.1673: BASE-ARCHETYPE FALLBACK — a real drop bug, not a tidy-up.
     This took the SKULL name, which is `monster.variant || monster.arch`, and
     matched it against a hand-written list of five names.  Every zone-flavoured
     slime reskin therefore failed the test and dropped NOTHING: Verdant Wilds
     (mossSlime + blueSlime — and it is slimes ONLY since v2.3.1534) and Poison
     Forest (mireWisp) have been dropping no remnants at all.  Nobody noticed
     because the pile still spawns for the gold.
     Passing the base archetype fixes those AND every future reskin, because a
     variant of `fodder` is a slime whatever it is painted. */
  _isRemnantSkullArch(arch, baseArch) {
    if (arch === 'fireGoblin' || arch === 'mummy' || arch === 'skeleton') return true;
    const b = baseArch || arch;
    return b === 'fodder' || b === 'snowman';
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

  _invKeyForSkull(skull, baseArch) {
    if (skull === 'fireGoblin') return 'fire-goblin-remnants';
    // Mummy and skeleton both stack into 'skeleton-remnants' (matches
    // the client's local-pickup mapping at BroTown.jsx ~9071).  Skeleton
    // is the runtime transform target of mummy; both map the same way.
    if (skull === 'mummy' || skull === 'skeleton') return 'skeleton-remnants';
    /* v2.3.1673: fall back to the BASE archetype, so mossSlime / blueSlime /
       mireWisp all stack into the same 'slime-remnants' the plain meadow
       fodder drops.  They are slimes — the paint should not decide what falls
       out of them, and a tutorial that asks for slime remnants from the
       Verdant Wilds is only possible if it does not. */
    const b = baseArch || skull;
    if (skull === 'fodder' || b === 'fodder') return 'slime-remnants';
    if (skull === 'snowman' || b === 'snowman') return 'snowman';
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

  /* ═══ v2.3.1742: YOUR PARTY IS NOT A FREE-FIRE TARGET ═══
     Owner: "party mode looks like it needs fixed.  It auto targeted my
     teammate and looked like my attacks were damaging them."

     They were.  EVERY wilderness zone carries lawless:true (data.js), and
     this returned true for any two players in one — with no party test
     anywhere in the PvP path.  So a co-op pair grinding the meadow could
     damage and kill each other the moment one locked onto the other, which
     is the exact opposite of what a party is for.

     ORDER MATTERS HERE.  The consent pair is checked FIRST, so a deliberate
     DUEL between two party members still works: consent is an explicit,
     two-sided act and must override the shield.  What the party blocks is
     the free-fire branch below it — the accidental case, where being in a
     lawless zone alone was enough.

     Server-side because it is the only place that counts: the client's own
     gate (monsterCombat's pvpLocked test) decides what is worth SENDING,
     and a client is never the authority on whether damage lands. */
  /* ═══ v2.3.1917: OPEN PvP IS OFF ═══
     Owner: "Also remove the option to kill other players for now."

     "For now" is load-bearing, so this is ONE flag rather than a deletion
     of the machine.  Flip it back to true and the wilderness is lawless
     again exactly as it was; nothing else has to be remembered.

     What it gates is only the NON-CONSENSUAL routes -- the `lawless`
     zone flag below (which is every wilderness zone, server/src/data.js)
     and the threat system's consent grant (threat.js).  Duels and arena
     matches are opt-in by construction and keep working: both register a
     _pvpConsent pair, and that check sits ABOVE this flag on purpose.
     The flag itself is set in the constructor with the other tunables,
     which is where this class keeps them. */
  _pvpAllowed(attackerId, targetId, zone) {
    const zc = ZONES[zone];
    /* Explicit consent (duel / arena) wins over everything. */
    if (this._pvpConsent) {
      const until = this._pvpConsent.get(this._pvpPairKey(attackerId, targetId));
      if (until && until > Date.now()) return true;
    }
    if (!this.OPEN_PVP) return false;   /* v2.3.1917 */
    if (zc && zc.lawless) {
      /* Compared by party ID, not object identity: _partyByPlayer stores the
         same object for every member today, but an id comparison stays true
         if that ever changes (a rebuild, a rejoin) and costs nothing. */
      const pa = this._partyOf && this._partyOf(attackerId);
      const pb = this._partyOf && this._partyOf(targetId);
      if (pa && pb && pa.id && pa.id === pb.id) return false;
      return true; // open-PvP wilderness (data.js flag)
    }
    return false;
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

  // ═══ HP store + damage application ═══ moved to combat.js
  // (v2.3.1191, P4 decomposition) -- _applyDamage and the melee-
  // lifesteal pair (_trackMonsterDamage / _applyMeleeLifesteal)
  // live in combatMethods, mixed into this prototype below.

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
    /* Swipe (special attack).
       v2.3.172 made the cost floor(maxMana / 5) so the HUD's 5-segment
       charge meter drained exactly one segment per cast.  That contract
       is what made mana un-progressable: a cost expressed as a FRACTION
       OF MAX is five casts per bar at Magic 1 and five casts per bar at
       Magic 100, and the regen tick is also a percentage of max, so even
       the sustained rate never moved.  v2.3.1734 makes it FLAT — see the
       long note on PROG3.SPECIAL_MANA_COST for the pacing table and the
       deliberate floor nerf.  The charge pie now derives its segment
       count from the same constant (SpecialChargePie.jsx), so the HUD
       contract survives; it just stopped being five.
       payload.tier still rides the wire for back-compat but has not
       affected cost since v2.3.172 (it scales DAMAGE, not cost). */
    if (type === 'swipe')   return PROG3.SPECIAL_MANA_COST;
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
    /* v2.3.1619b: the ONLY durable change here is a pool number, so it
       coalesces (see _saveRpgPools).  Ability use is one of the highest-
       frequency events in the game -- dodge, lunge, retreat and swipe
       all land here -- and each one was writing the whole rpg blob.
       The immediate _sendPlayerState below is untouched: this handler
       answers the client synchronously exactly as before. */
    this._saveRpgPools(session.id, ps);
    if (ws) this._sendPlayerState(ws, session.id);
  }

  /* v2.3.1569: status damage against a monster — overkill clamp,
     contribution credit, dirty mark, monster_hit event and kill
     resolution, all through the same pipeline a landed blow uses so a
     status kill awards XP, gold and loot identically.  Extracted from
     the elemental tick loop when Thorn arrived and needed to apply the
     same damage from a DIFFERENT moment (the monster's own attack), and
     a second copy of this pipeline is exactly how kill credit silently
     diverges.  Kills resolve with slot 'dot' so melee lifesteal
     correctly denies.
     v2.3.1734: `opts.burst` rides through to the monster_hit payload.
     The caster's OWN client suppresses popups for its own monster_hit
     (they are normally echoes of a locally-predicted swing), and an
     Element Burst has no local prediction — the same gap the Thorns
     reflect needed a flag for at v2.3.1137.  It is a display tag only;
     nothing server-side reads it. */
  _applyMonsterDot(zoneId, m, rawDmg, sourceId, statusId, opts) {
    if (!m || !m.alive || m.hp <= 0) return 0;
    const dmg = Math.min(Math.max(0, Math.round(rawDmg || 0)), Math.max(0, m.hp));
    if (dmg <= 0) return 0;
    m.hp -= dmg;
    if (!m.dmgByPlayer) m.dmgByPlayer = Object.create(null); // v2.3.1202: player-id-keyed
    if (sourceId) m.dmgByPlayer[sourceId] = (m.dmgByPlayer[sourceId] || 0) + dmg;
    this._markMonsterDirty(zoneId, m.id);
    this.eventBuffer.push({
      type: 'monster_hit',
      payload: {
        monsterId: m.id, zone: zoneId, dmg, isCrit: false,
        attackerId: sourceId, status: statusId,
        burst: !!(opts && opts.burst),
        hpPct: Math.max(0, m.hp / m.maxHp),
      },
    });
    if (m.hp <= 0) {
      this._resolveMonsterKill(zoneId, m, sourceId, this.playerState[sourceId], 'dot');
    }
    return dmg;
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
    /* v2.3.1562: every hook below is OPTIONAL bookkeeping (duel payout,
       clan-war score, bounty, death pile).  The two things that are NOT
       optional are the player_died send at the bottom and the dying flag
       set above, which _tickPlayerRespawn reads to bring the player back.
       Before this, a throw in any hook skipped the send AND left the
       player marked dying — dead on screen with no notification and no
       way back.  Each hook is isolated so the death itself always
       completes. */
    const _hook = (label, fn) => {
      try { return fn(); } catch (e) {
        try { console.error('[death] ' + label + ' threw:', e && e.message); } catch {}
        return undefined;
      }
    };
    const _duelKill = _hook('duel', () => this._duelOnDeath(playerId, cause));
    // v2.3.1125: clan-war scoring rides the same server-resolved death
    // (cause 'pvp:<attacker>'); duel kills are excluded inside the hook.
    _hook('war', () => this._warOnDeath(playerId, cause));
    // v2.3.1211 (item C): a killed threatener's guard-fine bounty pays
    // out to their killer here too (same server-observed 'pvp:' cause;
    // self / duel / same-clan / non-PvP excluded inside the hook).
    _hook('bounty', () => this._bountyOnDeath(playerId, cause).catch(() => {}));
    // v2.3.1116: death ends any remaining threat consent this player
    // was party to -- the survivor can't keep hitting them through the
    // respawn.  (Duel pairs already cleared by the resolution above.)
    _hook('pvpConsent', () => this._clearPvpConsent(playerId));
    if (!_duelKill) {
      // Spawn a pickable death pile at the death location carrying the
      // player's entire general inventory (mummy remains, fish, wood,
      // etc.).  Equipped loadout (weapon / rangedWeapon / staffWeapon /
      // armor / shield / amulet) and weaponStash are NOT included.
      // Anyone in the zone can pick the pile up; despawns after 60 s.
      // Spawn BEFORE the inventory wipe so we capture the items.
      _hook('deathPile', () => this._spawnDeathPile(ps, playerId));
      /* v2.3.1688: the gathering TOOLS survive (see _keepGatherTools).  They
         are equipment held in the bag for storage reasons, not loot — losing
         them to a death silently ends woodcutting/fishing/mining for good. */
      ps.inventory = this._keepGatherTools(ps.inventory);
    }
    /* v2.3.1616: carry the duel exemption forward to the RESPAWN wipe, which
       is a second, unconditional `ps.inventory = {}` five seconds from now
       (_tickPlayerRespawn).  Without this the protection above is cosmetic: a
       duel kill correctly keeps the bag, and then the respawn empties it
       anyway.  In-memory only, and it needs to survive exactly the 5 s between
       death and respawn — _saveRpg's fixed field list ignores it, which is
       what we want (rule 11: losing it costs a bag on a mid-death reconnect,
       where the duel forfeits regardless). */
    ps._duelDeathKeepsBag = !!_duelKill;
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
      /* v2.3.1562: STUCK-AT-ZERO SWEEP.  The death flow only ever starts
         at the instant damage is applied (the two _applyDamage callers).
         Any other way a live player's hp reaches 0 — a path that writes
         hp directly, a hook that threw before the flow finished, a state
         restored from storage mid-death — leaves them at 0 HP with
         dying=false, which is a permanent stuck state: no death, no
         respawn, and the client happily keeps sending actions.  Starting
         the flow from the tick closes that for every source at once
         instead of chasing them one at a time.  Guarded on connected,
         non-dying players so it cannot fire on a corpse mid-respawn. */
      if (!ps.dying && !ps.disconnected && typeof ps.hp === 'number' && ps.hp <= 0) {
        try { this._handlePlayerDeath(ps, id, 'stuck-at-zero'); } catch (e) {}
      }
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
      /* v2.3.1616: ...and it has to match the EXEMPTION there too.  The death
         wipe is inside `if (!_duelKill)`; this one was unconditional, so a
         duel kill kept the loser's bag for exactly five seconds and then the
         respawn emptied it anyway — the duel's "no item loss" promise broken
         by the very code meant to back up the wipe.  It read as flaky rather
         than broken because whether you saw items depended on whether you
         looked before or after the respawn.  server/test/duel.test.mjs
         asserted the inventory right after _handlePlayerDeath, which is
         precisely the window where it was still intact, so the suite was
         green throughout. */
      if (ps._duelDeathKeepsBag) delete ps._duelDeathKeepsBag;
      /* v2.3.1688: the respawn wipe keeps the tools too — it is the second,
         unconditional wipe, so sparing them at death alone would not have
         saved them. */
      else ps.inventory = this._keepGatherTools(ps.inventory);
      ps.dmgFromMonster = {};
      this._saveRpg(id, ps);
      const ws = this._wsBySessionId(id);
      /* ═══ v2.3.1822: A RESPAWN NOBODY HEARD STILL HAPPENED ═══
         Owner: "I died while I was on another tab and my character just got
         stuck there.  I had to wait for a monster to attack me again and die
         again while it was my active screen to respawn in town."

         That is this branch.  A backgrounded tab's socket gets suspended or
         closed by the browser, so five seconds later the respawn runs here
         with no `ws` to send to, and `player_respawned` is dropped on the
         floor.  On the client, `S._dying` is cleared by exactly ONE thing —
         receiving that message (wsClient) — so it stays true forever, and
         isPlayerDead() keeps the player frozen at the death spot.  Dying
         again is not a workaround, it is the only path back: the SECOND
         respawn arrives on a live socket and clears the flag.

         Rejoin does not fix it by itself: join.js resets ps.dying/respawnAt
         server-side but sends nothing that clears the client's copy, and
         player_state carries no zone, so it could not teleport them home
         even if it did.  So mark the respawn as owed and let the join path
         replay the real message, zone and all.
         In-memory only (rule 11) — a worker restart drops the debt, which is
         correct: a restart re-joins everyone from stored state anyway. */
      if (!ws) { ps._respawnOwed = true; continue; }
      try {
        ws.send(JSON.stringify({
          type: 'player_respawned',
          payload: { zone: 'town' },
        }));
      } catch (e) {
        /* Same reasoning as the missing-ws case: a send that threw did not
           arrive, so the debt stands.  This was a bare swallow before, which
           is how the failure could be invisible. */
        ps._respawnOwed = true;
      }
      this._queuePlayerStateFlush(id);
    }
  }

  // Pool regen tick + shield drain.  Runs every 30 server ticks
  // (~670 ms at TICK_RATE=22) for all three pools:
  //
  //   HP:
  //     Hub:        ceil(maxHp * 0.10)   (town / worldview / farm_home)
  //     Spoke OOC:  round(maxHp * SPOKE_REGEN_PCT), only after
  //                 SPOKE_REGEN_OOC_MS with no damage taken OR dealt
  //                 (v2.3.1701)
  //     In-combat:  nothing — lifesteal and food are the only heals
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
      /* v2.3.1414 (owner: "make the character heal and restore all combat
         resources when in worldview and in town"): the WORLD VIEW joins
         the safe-zone list, and the same fast top-off now covers stamina
         + mana below (the hub block after the normal regen paths), so a
         few seconds in any hub returns a full expedition kit. */
      const inHub = ps.z === 'town' || ps.z === 'worldview' || ps.z === 'farm_home';
      /* v2.3.1613 (owner: "dueling ... this was a duel in town"): a DUEL gets
         the same regen gate an arena match already has, and for exactly the
         reason the v2.3.1126 comment above gives.  Hub regen is 10% of maxHp
         every ~670 ms — about 15 hp/s at 100 maxHp — while a melee swing lands
         ~4 damage on a 300 ms cadence.  Healing therefore beat damage by more
         than an order of magnitude and a town duel could never move either
         health bar: the two players hit each other until one gave up.  The
         arena was gated for this in v2.3.1126 ("literally unendable for
         non-burst builds"); duels are the same fight in the same place and
         were simply never added.  Measured headlessly (tools/qa/mp/run.mjs
         duel): confirmed hits for 4 damage each, target pinned at 100/100.
         DERIVED from this._duels rather than mirrored onto ps: a flag would
         need clearing on every duel exit (kill, forfeit, disconnect, timeout,
         deploy) and a missed one leaves a player who can never heal in town.
         _duelFor is a walk of a map that holds a handful of entries, once per
         player per 670 ms tick.  Only HP is gated, matching the arena: stamina
         and mana keep regenerating below, so blocking still works. */
      const inDuel = this._duelFor ? !!this._duelFor(id) : false;
      if (!ps._arenaMatch && !inDuel && inHub && ps.hp < ps.maxHp) {
        const heal = Math.max(1, Math.ceil(ps.maxHp * 0.10));
        const beforeHp = ps.hp;
        ps.hp = Math.min(ps.maxHp, ps.hp + heal);
        if (ps.hp !== beforeHp) changed = true;
      } else if (!ps._arenaMatch && !inDuel && !inHub && ps.hp < ps.maxHp) {
        /* v2.3.1701: OUT-OF-COMBAT TRICKLE in the combat zones (see the
           SPOKE_REGEN_* constants in the constructor for the why).  Gated on
           BOTH halves of "in combat": lastDamageAt (damage taken, stamped in
           _applyDamage) and _lastDealtAt (damage dealt, stamped in
           _handleMonsterDamage and the PvP lane) — a player standing over a
           monster they are beating on is fighting even though nothing has
           landed on them yet.  Same arena/duel exclusions as the hub branch
           above, for the v2.3.1126 reason: a heal that outruns the damage
           makes the fight unendable. */
        const _oocSpoke = (now - (ps.lastDamageAt || 0)) > this.SPOKE_REGEN_OOC_MS
          && (now - (ps._lastDealtAt || 0)) > this.SPOKE_REGEN_OOC_MS;
        if (_oocSpoke) {
          /* ROUND, not ceil: at 1% a ceil turns every maxHp above 100 into
             2 hp/tick (a level-3 prog3 character has 106), which is nearly
             double the intended pace for no reason anyone could see. */
          const heal = Math.max(1, Math.round(ps.maxHp * this.SPOKE_REGEN_PCT));
          const beforeHp = ps.hp;
          ps.hp = Math.min(ps.maxHp, ps.hp + heal);
          if (ps.hp !== beforeHp) changed = true;
        }
      }

      // Stamina: shield drain takes priority over regen.  When blocking,
      // drain ~5/tick and auto-release at 0 (mirrors client behavior at
      // BroTown.jsx:9370 -- 0.167 stamina/frame at 60 fps).
      // v2.3.1153: × Bulwark block-stamina efficiency (−1%/pt, cap −50%),
      // floored at 1 so holding a shield is never free.
      if (typeof ps.maxStamina === 'number' && typeof ps.stamina === 'number') {
        /* v2.3.1704: the held-shield drain, and with it the auto-release at
           zero, are what "block as much as you want" actually means — a
           shield that drops itself after ten seconds is not unlimited
           blocking however cheap each hit is.  With the flag off this branch
           is skipped entirely, so a blocking player falls through to the
           regen arm below and their stamina refills while they hold: exactly
           the demo behaviour the owner asked for. */
        /* ═══ v2.3.1919: `ps.stamina > 0` WAS THE LEAK ═══
           With it, a blocker at zero stamina fell out of this branch and
           into the REGEN arm below — refilling while still holding the
           shield.  Pair that with the client re-asserting `blocking` on
           every move packet (now latched, movement.js) and the result was a
           shield that could be held for the whole fight and cost nothing:
           measured at 1.5 damage a swing over 40 seconds, against 11.8
           unguarded.  Both halves had to go, or fixing either alone just
           moves the free block somewhere else.
           Holding now means never regenerating, and hitting zero starts a
           real guard break the client cannot cancel. */
        if (BLOCK_COSTS_STAMINA && ps.blocking) {
          const beforeSt = ps.stamina;
          ps.stamina = Math.max(0, ps.stamina - Math.max(1, Math.round(5 * this._blockStaminaMult(ps))));
          if (ps.stamina !== beforeSt) changed = true;
          if (ps.stamina <= 0) {
            /* Drop the shield AND lock it down.  Before the latch this
               assignment survived milliseconds. */
            ps.blocking = false;
            ps.blockStartT = 0;
            ps._guardBrokenUntil = Date.now() + this.GUARD_BREAK_MS;
            changed = true;
          }
        } else if (ps.stamina < ps.maxStamina) {
          const stAmuletMult = 1 + (ps.amuletStaminaRegen || 0) / 100;
          // Phase 2 of the T1/T2 spec: Endurance multiplies stamina regen.
          const stEndMult = 1 + (ps.endurance || 0) * 0.002;
          // v2.3.1154: × Endurance-grid Conditioning (+1%/pt, cap +50%)
          // — the successor to the retired restoration mult, deleted
          // v2.3.1155 (it was ×1.0 for every live player since v2.3.910).
          const stHeal = Math.max(1, Math.ceil(7 * stAmuletMult * stEndMult) + this._conditioningFlat(ps)); // v2.3.1345: flat regen add
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

      /* v2.3.1414: HUB TOP-OFF — in town/worldview/farm_home the normal
         stamina/mana trickle above is topped up to the HP pace (10% of
         max per regen tick), so ALL combat resources refill in ~7s of
         standing in a hub (owner: "heal and restore all combat resources
         when in worldview and in town").  Skipped while blocking (the
         drain above must win) and during an arena match (same posture
         as the HP gate).
         v2.3.1919: and skipped while the GUARD IS BROKEN.  The break clears
         ps.blocking, which is what makes it a break — and this block, later
         in the SAME tick, then saw a non-blocking player and topped them
         straight back up.  Town is a hub and town is where duels are
         fought, so the guard break refunded itself instantly exactly where
         it mattered: the drain ran 100 -> 0 and the bar was back at 10
         before the next tick.  Caught by test/blockcost.test.mjs, which
         watched the whole sequence rather than the end state. */
      if (inHub && !ps._arenaMatch && !ps.blocking
          && !(ps._guardBrokenUntil && Date.now() < ps._guardBrokenUntil)) {
        if (typeof ps.maxStamina === 'number' && typeof ps.stamina === 'number' && ps.stamina < ps.maxStamina) {
          const beforeSt2 = ps.stamina;
          ps.stamina = Math.min(ps.maxStamina, ps.stamina + Math.max(1, Math.ceil(ps.maxStamina * 0.10)));
          if (ps.stamina !== beforeSt2) changed = true;
        }
        if (typeof ps.maxMana === 'number' && typeof ps.mana === 'number' && ps.mana < ps.maxMana) {
          const beforeMn2 = ps.mana;
          ps.mana = Math.min(ps.maxMana, ps.mana + Math.max(1, Math.ceil(ps.maxMana * 0.10)));
          if (ps.mana !== beforeMn2) changed = true;
        }
      }

      if (changed) {
        /* v2.3.1619: COALESCED, not per-tick.  This loop runs every 30
           ticks (~670 ms) and used to call _saveRpg on every player whose
           pools moved -- which, since pools are almost always regenerating,
           meant a full rpg-blob write per player per 670 ms.  Measured on
           the real room: 5,855 storage writes per player-hour, of which
           93% (600 of 644) came from exactly here.
           That matters twice.  Cloudflare bills key-value puts as ROWS
           WRITTEN -- 100,000/day on the free tier, which 5,855/player-hour
           exhausts in ~17 player-hours, marginally BEFORE the request
           limit; and on the paid plan rows are $1.00/million against
           requests' $0.15, so at scale this line was the single most
           expensive thing the server did.
           Regen is also the cheapest possible thing to lose: it is
           deterministic and recomputes from maxima, so a DO restart
           costing a player a few seconds of stamina is invisible.  The
           wire is unaffected -- _queuePlayerStateFlush still runs every
           time, so the client's bars move at the same 670 ms cadence.
           Only the DURABLE write is coalesced.
           Any value-bearing mutation (coins, inventory, loot, forge,
           trade) calls _saveRpg directly on its own path and is untouched
           by this -- rule 7's money-at-rest guarantee is not weakened. */
        this._queuePlayerStateFlush(id);
        if (!ps._regenSaveAt || now - ps._regenSaveAt >= this.REGEN_SAVE_MS) {
          this._saveRpg(id, ps); // stamps _regenSaveAt / clears _regenDirty
        } else {
          ps._regenDirty = true;
        }
      } else if (ps._regenDirty && (!ps._regenSaveAt || now - ps._regenSaveAt >= this.REGEN_SAVE_MS)) {
        /* v2.3.1619b: DRAIN ARM.  _regenDirty is now also set by the
           combat pool paths (_saveRpgPools), and those can leave it set
           on a player whose pools then stop moving -- e.g. a shield
           blocker whose stamina is drained to 0 and held there, so
           `changed` is false on every subsequent tick.  Without this the
           flag would sit unflushed until disconnect.  No wire emit here:
           nothing changed, so there is nothing to tell the client. */
        this._saveRpg(id, ps);
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

  /* ═══ v2.3.1924: THE IRON PIECES ═══
     Owner: "monsters now have a 1 in 500 chance to drop an iron chest and 1
     in 500 of dropping iron legs."

     Flat rates, deliberately: the weapon roll above is a cubic level curve
     because a weapon's TIER scales with the monster, and these two do not —
     an iron torso is an iron torso off a slime or off a boss.  A curve here
     would mean the owner's number was true at exactly one monster level and
     nowhere else.

     Each piece rolls on its OWN chance (see MONSTER_ARMOR_DROPS) and the
     result is an ARRAY, so a corpse that hits both keeps both rather than
     one silently shadowing the other.  The minted record is the same shape a
     quest piece is, so nothing downstream can tell them apart — see the
     constant's note for why that matters. */
  _rollArmorDropsForKill() {
    const out = [];
    for (const d of MONSTER_ARMOR_DROPS) {
      if (Math.random() >= d.chance) continue;
      /* ═══ v2.3.1925: ARMOUR ROLLS QUALITY TOO ═══
         Owner: "I also want the drop to consider a rarity system."  Quality
         has been weapon-only since v2.3.1131; GDD §4.6b is explicit that the
         rates apply to "all weapon drops regardless of source", and the owner
         has now extended the ladder to armour.  Same roller, deliberately:
         one distribution means normal/rare/elite/godly mean the same thing on
         a breastplate as on a blade, and there is one place to retune. */
      out.push({ name: d.name, mat: d.mat, slot: d.slot, tierMult: d.tierMult,
        quality: this._rollWeaponQuality() });
    }
    return out.length ? out : null;
  }

  /* ═══ v2.3.1924b: THE IRON GREATSWORD ═══
     Owner: "Also add iron greatsword 1 in 500 chance to drop."

     Flat, like the two armour pieces and unlike the ordinary weapon roll
     above, for the same reason: that one is a cubic level curve because the
     TIER it mints scales with the monster, and this mints one fixed item.

     Built here rather than in _rollWeaponDropForKill because they answer
     different questions — that function decides what RARITY a random weapon
     is, and this one is not random. */
  _rollIronWeaponForKill() {
    const d = MONSTER_IRON_WEAPON_DROP;
    if (Math.random() >= d.chance) return null;
    return {
      type: d.type,
      tier: 'common',
      tierMult: d.tierMult,
      element1: null,
      element2: null,
      /* Verbatim the forge's own string (gear.js: `tierKey + ' ' + type`).
         The client rebuilds the display name from gearBase — the itemcard
         suite pins that it never prints this raw — so matching the forge is
         what keeps a dropped blade indistinguishable from a crafted one. */
      name: d.gearBase + ' ' + d.type,
      gearBase: d.gearBase,
      isVolatile: false,
      reforgeBonus: null,
      hardenBonus: null,
      /* Rolled, like the forge's and like the ordinary drop's — which also
         hands this the pile's hidden-until-pickup reveal for free. */
      quality: this._rollWeaponQuality(),
      hardness: 0,
      temper: 0,
    };
  }

  /* v2.3.1924: "Add a 1 in 200 chance to drop a rare gem."  A plain
     stackable that lands in the bag — NOT the elemental raw_<element> the
     Gem Cutter eats (_gemRawOnKill, amulet.js), which is zone-gated and
     lives in lifeSkills.  Two different things on purpose; see RARE_GEM_KEY. */
  _rollRareGemForKill() {
    return Math.random() < RARE_GEM_MONSTER_DROP ? RARE_GEM_KEY : null;
  }

  /* ═══ v2.3.1925: THE MYSTERY GRADES ═══
     GDD §4.6b.ii: "Drops at Rare grade and above appear in the world as
     mystery icons ... Normal drops appear immediately as their normal
     icons."  Normal is ~90% of everything, so gating on grade is what keeps
     the ceremony meaning something — a question mark over every kill is just
     a slower pickup. */
  _isMysteryGrade(q) {
    return q === 'rare' || q === 'elite' || q === 'godly';
  }

  /* A pile carries a mystery when ANY unclaimed thing on it does.  Claimed
     lanes are excluded: once someone has taken the blade, the pile should
     stop advertising a secret it no longer holds. */
  _pileHasMystery(p) {
    if (!p) return false;
    if (!p.weaponClaimed && p.weapon && this._isMysteryGrade(p.weapon.quality)) return true;
    if (!p.armorClaimed && Array.isArray(p.armor)) {
      for (const a of p.armor) if (a && this._isMysteryGrade(a.quality)) return true;
    }
    return false;
  }

  /* The public face of one armour piece: everything EXCEPT the grade.  Name
     and metal stay (you can see it is an iron breastplate); `mystery` says
     only that there is something to find out.  Written as a strip rather than
     a pick so a field added to the piece later is public by accident in the
     harmless direction, never the grade by omission — `quality` is deleted
     explicitly and drops.test.mjs asserts it never reaches the wire. */
  _mysteryPiece(a) {
    if (!a) return a;
    const out = { ...a };
    delete out.quality;
    out.mystery = this._isMysteryGrade(a.quality);
    return out;
  }

  /* Build the credit's reveal list.  Kept beside _revealLadder rather than
     inline at the pickup site because it is the ONLY place that decides what
     a player is shown about a grade, and one place is what makes "the client
     never holds the answer before the animation reaches it" checkable. */
  _revealsFor(weapon, armorPieces) {
    const out = [];
    if (weapon && this._isMysteryGrade(weapon.quality)) {
      out.push({
        kind: 'weapon',
        name: weapon.name || 'Weapon',
        itemType: weapon.type || null,
        mat: weapon.gearBase || null,
        quality: weapon.quality,
        ladder: this._revealLadder(weapon.quality),
      });
    }
    for (const a of (armorPieces || [])) {
      if (!a || !this._isMysteryGrade(a.quality)) continue;
      out.push({
        kind: a.slot === 'legsArmor' ? 'legs' : 'armor',
        name: a.name || 'Armor',
        itemType: null,
        mat: a.mat || null,
        quality: a.quality,
        ladder: this._revealLadder(a.quality),
      });
    }
    return out.length ? out : null;
  }

  /* ═══ THE REVEAL LADDER ═══
     The animation the client plays is a PRESENTATION of a grade this worker
     already committed at mint — it is not a second chance at a better roll,
     and it cannot be, because the item is already in the pile.  §4.6b.ii puts
     it exactly right: the player cannot distinguish "the server is showing me
     the real rolls" from "the server is showing me outcomes calibrated to
     land on the pre-committed result", because the two produce mathematically
     equivalent animations.

     So the server sends the LADDER — how many stages to play and what each
     one resolves to — and the client animates it.  Sending the shape rather
     than letting the client derive it from the grade matters for the same
     reason the grade itself is withheld: the client should never hold the
     answer before the animation reaches it.

       rare  -> ['rare']                    one stage, settles on the floor
       elite -> ['elite']                   one stage, escalates past rare
       godly -> ['elite', 'godly']          two stages
     Normal returns null: no ceremony, nothing hidden. */
  _revealLadder(q) {
    if (!this._isMysteryGrade(q)) return null;
    if (q === 'godly') return ['elite', 'godly'];
    return [q];
  }

  // Pile shape (server-side, full):
  //   { lootId, zone, x, y, coins, skull, shard, gem, weapon, weaponClaimed,
  //     armor, armorClaimed, recipients, shares: {pid: number}, killerName,
  //     ts, inventoryClaimed, claimedBy: {pid: true} }
  _spawnLootForKill(zone, monster, killerSessionId, recipients, shares) {
    const lootId = 'mk-' + monster.id;
    // Use the variant if set (e.g. ember fodder -> fireGoblin, sky
    // fodder -> mummy) so _invKeyForSkull produces the correct
    // inventory key on pickup.  Falls back to the base archetype
    // for monsters with no variant override.
    const skullSource = monster.variant || monster.arch;
    /* monster.arch is always the TRUE base archetype (the server runs AI on it
       and only the skin is per-zone), so it is the honest fallback. */
    const skull = this._isRemnantSkullArch(skullSource, monster.arch) ? skullSource : null;
    const shard = this._rollShardForKill(zone);
    // v2.3.1141: weapon rides the pile; only rolled when someone can
    // actually claim it (the claim is recipient-gated below).
    // v2.3.1150: disable_weapon_drops kill switch -- caps.weaponDrops
    // stays true so clients do NOT fall back to legacy local minting;
    // drops just stop rolling until the flag clears.
    const anyClaimant = !!(recipients && recipients.length > 0);
    const wpnDropsOn = anyClaimant && !this._flagOn('disable_weapon_drops');
    /* ═══ v2.3.1924b: THE IRON GREATSWORD TAKES THE WEAPON SLOT ═══
       A pile carries ONE weapon (its own claim lane, v2.3.1141), so when both
       rolls land, one of them has to win.  The iron blade wins, which keeps
       the owner's number EXACT: 1 in 500 kills drop it, full stop.

       THE COST, MEASURED RATHER THAN WAVED AT, because it is a real if tiny
       one: on a kill where both hit, an ordinary weapon that would have
       dropped is replaced.  The ordinary rate runs 0.05% at level 1 to ~3% at
       level 100, so the overlap is 1-in-2,000,000 kills at the bottom and
       1-in-17,000 at the very top — and only at the top can the thing
       replaced be rarer than iron (an elemental or fusion roll).  The
       alternative orderings both cost more than that: letting the ordinary
       roll win makes the owner's 1-in-500 quietly 1-in-515 at level 100, and
       carrying two weapons means reworking an established claim lane and its
       client credit on both sides for an event this rare.

       Also gated by disable_weapon_drops (v2.3.1150): that kill switch exists
       to stop weapons entering the economy, and a drop that ignored it would
       be a hole in the lever rather than a new feature. */
    const ironWeapon = wpnDropsOn ? this._rollIronWeaponForKill() : null;
    const weapon = ironWeapon
      || (wpnDropsOn ? this._rollWeaponDropForKill(zone, monster) : null);
    /* v2.3.1924: both gated on there being someone who could claim them, the
       same condition the weapon roll uses — rolling loot for an empty
       recipient list mints an item nobody can ever pick up and then counts it
       against the player's odds. */
    const armor = anyClaimant ? this._rollArmorDropsForKill() : null;
    const gem = anyClaimant ? this._rollRareGemForKill() : null;
    /* v2.3.1924: !armor && !gem are BELT-AND-BRACES and cannot fire today —
       this early-out is recipient-gated, and both new rolls are themselves
       gated on there being a recipient, so any pile that could carry them has
       already failed the second term.  They are here so the condition stays
       correct if that gating is ever loosened; drops.test.mjs says so rather
       than pretending to cover it. */
    if (!skull && (!recipients || recipients.length === 0) && monster.gold <= 0 && !shard && !weapon && !armor && !gem) {
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
      /* v2.3.1673: the skull's BASE archetype rides along.  The pickup site
         (which credits the inventory) only ever saw the skull NAME, and a
         variant name alone cannot say whether the thing was a slime — that is
         exactly how the reskinned slimes ended up dropping nothing.  Memory-
         only (rule 11): loot piles live in this.loot[zone] and never persist,
         so there is no stored shape to migrate. */
      skullArch: monster.arch,
      shard,
      /* v2.3.1924: the gem rides the SHARED inventory slot (skull/shard), so
         one pile hands its one-of items to one picker — the rule that has
         governed this pile since it existed.  The armour gets its OWN claim
         flag for the same reason the weapon did at v2.3.1141: it must not
         consume, or be consumed by, that slot. */
      gem,
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
      armor,
      armorClaimed: false,
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
      /* v2.3.1925: is the blade's grade worth a reveal?  The pile has hidden
         `quality` since v2.3.1141; what it could never say is whether there
         was anything worth hiding, so every drop looked the same on the
         ground.  This is the one bit §4.6b.ii asks for. */
      weaponMystery: this._isMysteryGrade(p.weapon && p.weapon.quality),
      weaponTier: p.weapon ? p.weapon.tier : null,
      weaponType: p.weapon ? p.weapon.type : null,
      weaponName: p.weapon ? p.weapon.name : null,
      /* ═══ v2.3.1925: THE ARMOUR NO LONGER GOES OUT IN FULL ═══
         v2.3.1924 broadcast it whole, and its reasoning was sound at the
         time: "a dropped armour piece has no hidden roll at all — every field
         is fixed by MONSTER_ARMOR_DROPS".  That stopped being true the moment
         armour started rolling quality, so the same argument now points the
         other way and the piece is stripped exactly like the weapon.

         `_mysteryPiece` keeps the NAME and the metal — GDD §4.6b.ii: the
         player "knows what KIND of item dropped" and nothing about the grade,
         so a Rare and a Godly are indistinguishable on the ground. */
      armor: Array.isArray(p.armor) ? p.armor.map((a) => this._mysteryPiece(a)) : null,
      armorClaimed: !!p.armorClaimed,
      /* Is there anything on this pile whose grade is still unknown?  One
         flag for the renderer, computed here because the server is the only
         side that can see the grades it is hiding. */
      mystery: this._pileHasMystery(p),
      gem: p.gem || null,
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
    /* v2.3.1688: the gathering tools are NOT loot.  They stay in the bag
       through death (see _keepGatherTools), so dropping copies here would
       mint a second axe on the ground every time the player died.
       v2.3.1701: quest objective items keep the bag for the same reason and
       must be excluded here for the same reason — ONE predicate decides
       both, so "kept" and "dropped" can never disagree and duplicate. */
    for (const [k, v] of Object.entries(ps.inventory)) {
      if (this._keptThroughDeath(k)) continue;
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
      shares: {}, // proto-ok: player-keyed; join ids gate-hardened v2.3.1202
      killerName: ownerName,
      ts: Date.now(),
      inventoryClaimed: false,
      claimedBy: {}, // proto-ok: player-keyed; join ids gate-hardened v2.3.1202
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
    /* v2.3.1200: pet loot vacuum rides THIS handler.  The client's
       §18.1 auto-loot used to self-credit coins/shards that the next
       player_state echo stomped (pure theatre -- the pets.md "attach
       points" note).  A vacuum pickup is now the same loot_pickup
       request with payload.viaPet=true, so it meets every gate here
       (pile exists, per-player claimedBy flags, recipient list, death-
       drop windows) and every grant/despawn line below IDENTICALLY to
       a manual grab -- double credit with a manual pickup is impossible
       because both paths share one claimedBy map.  Only two deltas:
       the sender must have a server-known active pet, and the range
       gate widens to PETS.VACUUM_RANGE (still measured from the
       OWNER's position -- the server does not track pet position; see
       the constant's comment in pets.js for the geometry). */
    const viaPet = !!(payload && payload.viaPet);
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
    // v2.3.1200: a viaPet pickup requires a server-known active pet --
    // the wider vacuum radius is the pet's feature, not a free upgrade
    // any client can flip on with a payload flag.
    if (viaPet) {
      const petList = (ps.lifeSkills && Array.isArray(ps.lifeSkills.pets)) ? ps.lifeSkills.pets : [];
      const petIdx = ps.lifeSkills ? ps.lifeSkills.activePet : null;
      if (typeof petIdx !== 'number' || !petList[petIdx]) return reject('no-pet');
    }
    const dx = ps.x - pile.x;
    const dy = ps.y - pile.y;
    const distSq = dx * dx + dy * dy;
    const range = viaPet ? PETS.VACUUM_RANGE : this.LOOT_PICKUP_RANGE;
    const rangeSq = range * range;
    if (distSq > rangeSq) return reject('out-of-range', { dist: Math.round(Math.sqrt(distSq)), max: range });

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
              // v2.3.1200: echo the pet-vacuum origin so the client can
              // render the pickup at the pet instead of the player.
              viaPet,
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
    let gemForMe = null;      /* v2.3.1924 */
    let inventoryClaimedNow = false;
    if (!pile.inventoryClaimed) {
      if (pile.skull || pile.shard || pile.gem) inventoryClaimedNow = true;
      skullForMe = pile.skull || null;
      shardForMe = pile.shard || null;
      gemForMe = pile.gem || null;
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
    /* ═══ v2.3.1924: ARMOUR CLAIM ═══
       Modelled on the weapon lane directly above: first eligible picker takes
       it, own flag, independent of the skull/shard/gem slot.

       There is NO server-side armour stash and handoff rule 1 forbids adding
       one to the rpg blob, so — exactly as v2.3.1695 settled for quest
       armour — the pieces are handed to the client's own armourStash /
       legsStash through the private credit below, and the player equips them.
       Which means, unlike the weapon, there is no stash-full fallback to
       auto-sell into: the bag that receives these is not the worker's to
       measure.  The worker still learns what ends up worn, because equipping
       sends stats_update. */
    let armorForMe = null;
    if (pile.armor && pile.armor.length && !pile.armorClaimed) {
      pile.armorClaimed = true;
      armorForMe = pile.armor.slice();
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
      const invKey = this._invKeyForSkull(skullForMe, pile.skullArch);
      ps.inventory[invKey] = (ps.inventory[invKey] || 0) + 1;
    }
    if (shardForMe) {
      if (!ps.inventory) ps.inventory = {};
      ps.inventory[shardForMe] = (ps.inventory[shardForMe] || 0) + 1;
    }
    /* v2.3.1924: the gem is a plain stackable, credited exactly like the
       shard — server-side, before the credit goes out, so the player_state
       that follows carries the authoritative count and a client that tried to
       self-credit is simply overwritten (rule 20). */
    if (gemForMe) {
      if (!ps.inventory) ps.inventory = {};
      ps.inventory[gemForMe] = (ps.inventory[gemForMe] || 0) + 1;
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
            /* v2.3.1924: the gem key (popup) and the armour pieces (which the
               client routes into its own armourStash / legsStash -- see the
               claim block above for why that store is the client's). */
            gem: gemForMe,
            armor: armorForMe,
            /* ═══ v2.3.1925: THE REVEAL ═══
               One entry per thing on this pickup whose grade was hidden, in
               the order the client should play them.  Almost always empty
               (normal is ~90%) and almost never longer than one — two
               mysteries needs two rare-or-better rolls landing on one corpse.
               Supported anyway because "usually one" is not "only one", and a
               ceremony that silently dropped the second item's grade would
               hand the player an elite they never saw revealed. */
            reveals: this._revealsFor(weaponForMe, armorForMe),
            // v2.3.1141: full blob incl. quality -- the private reveal.
            weapon: weaponForMe,
            weaponStashed,
            weaponSoldFor,
            // v2.3.1200: echo the pet-vacuum origin so the client can
            // render the pickup at the pet + count the pet-loot quest.
            viaPet,
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
      /* v2.3.1924: armorClaimedNow rides the same broadcast as the weapon's
         so watchers can drop the piece's label off the pile they can see. */
      payload: { lootId, zone, byPlayer: session.id, inventoryClaimedNow, weaponClaimedNow: !!weaponForMe, armorClaimedNow: !!armorForMe },
    });

    // If every recipient has now claimed, the pile is fully spent --
    // despawn so watchers stop seeing it.
    if (Object.keys(pile.claimedBy).length >= pile.recipients.length) {
      this._despawnLoot(zone, lootId);
    }
  }

  // ═══ Attack roll + monster damage + kill resolution ═══ moved
  // to combat.js (v2.3.1191, P4 decomposition) -- _maxWeaponDmg/
  // _maxDmgForAttacker (anti-cheat ceilings), _computeAttackDamage
  // (the authoritative roll), _handleMonsterDamage, and
  // _resolveMonsterKill live in combatMethods, mixed into this
  // prototype below.  _tickMonsters' thorns/DoT kill paths above
  // still reach _resolveMonsterKill via the prototype.

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
    /* ═══ v2.3.1982: THE 61st PLAYER IS TOLD WHY ═══
       This gate used to answer a bare `503 Room full` to a socket that
       had not been upgraded yet, so the refusal reached the client as a
       failed handshake and NOTHING ELSE.  wsClient's onclose cannot tell
       that apart from a dropped cell connection, so it fell into the
       ordinary reconnect backoff and retried every 10s forever behind a
       loading screen that never said a word.  To that player the game is
       simply broken, with no idea whether waiting would help.

       The cap itself is NOT the bug and is not being raised: the headless
       capacity campaign measured the worker at 0.16ms of its 22ms tick
       with 60 players (server/test/load-crowd.mjs), so CPU is nowhere
       near the wall — what binds is per-client DOWNLOAD bandwidth, ~4KB/s
       per co-located moving peer on a phone (tools/qa/mp/mp-crowd.mjs).
       Sixty is a receiver-side number.  The fix is a MESSAGE.

       `_roomFullRefusal` (join.js) owns the answer, including the
       deploy-order split: only a client that asked for the wire refusal
       (`?rf=1`) gets the upgraded socket + `room_full`; everything else
       still gets the byte-identical 503 it got before. */
    await this._liveFlagsEnsure();
    if (this.sessions.size >= this._roomCap()) {
      return this._roomFullRefusal(url);
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);
    this.sessions.set(server, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
    if (!this.tickInterval && this.sessions.size === 1) this.startTickLoop();
    return new Response(null, { status: 101, webSocket: client });
  }

  /* v2.3.1913: AFK activity signature for a `move` packet.
     Everything the player themself controls, and nothing the server or
     the world controls.  Positions are rounded to whole pixels so float
     noise on a stationary body can't read as movement (a walking player
     crosses a pixel boundary many times a second, so real motion is
     never missed), and the shield angle to ~3 deg -- the same hysteresis
     the client uses before it bothers to broadcast a new one
     (v2.3.1726).  `dead` is deliberately absent: dying is something that
     happens TO you, and a corpse should age out like anything else. */
  _moveActivitySig(msg) {
    const n = (v) => (Number.isFinite(+v) ? Math.round(+v) : 0);
    return n(msg.x) + ',' + n(msg.y) + ',' +
      (msg.d || '') + ',' + (msg.f || '') + ',' +
      (msg.z || '') + ',' + (msg.ex || '') + ',' +
      (msg.blocking ? 1 : 0) + ',' + (msg.dodging ? 1 : 0) + ',' +
      (Number.isFinite(+msg.ba) ? Math.round(+msg.ba * 20) : '') + ',' +
      (msg.eqc || '') + ',' + (msg.eql || '') + ',' + (msg.eqs || '');
  }

  /* v2.3.1970: sanitise a room-chat relay in place (see CHAT_RELAY
     above).  Returns false when there is nothing left worth relaying,
     matching _handlePartyChat's "drop, don't answer" posture -- a
     refusal is both a signal to a flooder and a second message to fan
     out (the v2.3.1134 lane rule). */
  _sanitizeChatRelay(session, msg) {
    const p = msg && msg.payload;
    if (!p || typeof p !== 'object') return false;
    /* Clamp the RAW length FIRST so a padded string cannot smuggle a long
       line past the trim -- the ordering _handlePartyChat documents. */
    let text = typeof p.text === 'string' ? p.text : '';
    text = text.slice(0, CHAT_RELAY.TEXT_MAX).replace(/[\x00-\x1f\x7f]/g, ' ').trim();
    if (!text) return false;
    const ps = this.playerState[session.id];
    /* The server's own copy of who this is.  session.name is itself
       sanitised at join (join.js sanitizeDisplayName, same version), and
       ps.name is the stored permanent character name where there is one. */
    const name = (ps && typeof ps.name === 'string' && ps.name) || session.name || 'Bro';
    const color = typeof p.color === 'string'
      ? p.color.slice(0, CHAT_RELAY.COLOR_MAX).replace(/[\x00-\x1f\x7f]/g, '') : '';
    msg.payload = { id: session.id, name, text, color };
    return true;
  }

  async webSocketMessage(ws, message) {
    const session = this.sessions.get(ws);
    if (!session) return;
    /* ═══ v2.3.1618: INBOUND SIZE GATE ═══
     *
     * There was no size check anywhere in this file, and the default
     * branch at the bottom of this switch pushes the ENTIRE parsed object
     * by reference into this.eventBuffer, which the tick fans out to every
     * socket in the room.  `chat` and `emote` have no case here and are
     * not in PRIVILEGED_EVENTS, so they relay byte-for-byte, uncapped.
     *
     * One authenticated socket looping a ~900 KB message therefore cost:
     * a parse, permanent retention in eventBuffer (v2.3.1163 made overflow
     * DELAY rather than drop, which turns bounded loss into unbounded
     * memory), a fan-out to all 60 sockets (~54 MB egress per message),
     * and a re-stringify per zone-group on the single DO thread every
     * 22 ms.  EVENTS_PER_TICK_CAP bounds the COUNT of events, never bytes.
     *
     * Checked BEFORE JSON.parse: parsing is itself the work we are
     * refusing to do.  `message` is a string for text frames; ArrayBuffer
     * carries byteLength.  Silent drop, no reply -- same posture as the
     * v2.3.1134 cadence lanes: a cheater learns nothing from a refusal,
     * and a legitimate client never approaches this. */
    const _len = typeof message === 'string' ? message.length
      : (message && message.byteLength) || 0;
    if (_len > this.MAX_INBOUND_BYTES) {
      session.oversize = (session.oversize || 0) + 1;
      return;
    }
    let msg;
    try { msg = JSON.parse(message); } catch { return; }
    /* Reset the AFK clock on real input only.  Pong replies are
       keepalive heartbeats, not player activity -- counting them would
       mean the timeout fires only on TCP death, not on AFK players
       (the original 45 s behavior, which never actually kicked anyone
       who had a live tab open).

       v2.3.1913: `move` and `track` are heartbeats TOO, and that is why
       the 2-minute sweep had still never kicked anyone.  Owner:
       "Sometimes I login to the game and see characters I played in
       separate window hours ago just idle."  The client sends a move at
       >=1 Hz even standing still (the idle keepalive the peer
       ghost-sweep relies on -- see TRACK_STATE_EXCLUDED above) and a
       `track` every 2 s on a bare timer.  Both are type !== 'pong', so
       both stamped lastRecv, so an abandoned-but-open tab refreshed the
       AFK clock twice a second forever.  The v2.3.1621 eviction was
       correct and simply never ran.

       So: judge a move by whether ANYTHING about the player changed.
       The idle keepalive is by construction the packet where nothing
       did -- same tile, same facing, same shield, same harvest, same
       zone -- so a signature compare separates it from real input at
       one string build per move.  `track` arriving proves nothing (it
       is a bare timer), but the AWAY flag it carries does -- see below.
       Everything else -- attacks, harvest strikes, zone changes, chat,
       panel actions -- is input and stamps the clock. */
    if (msg.type === 'pong') {
      /* keepalive, never activity */
    } else if (msg.type === 'track') {
      /* `track` is a 2 s telemetry timer, so its ARRIVAL says nothing.
         Its `aw` flag does: the client stamps _lastInputAt from
         window-capture touchstart/pointerdown/keydown/wheel and sends
         aw:0 while that is under two minutes old (v2.3.1324, added for
         the peers' AWAY pip).  That is the one thing the worker cannot
         work out for itself -- a player reading the market panel is
         right there with a thumb on the glass and puts NOTHING on the
         socket, and evicting them would be a worse bug than the one
         this version fixes.  Read explicitly as 0: absent means an old
         client that never sent the flag, which is no evidence either
         way, and moves alone then decide. */
      if (msg.data && msg.data.aw === 0) session.lastRecv = Date.now();
    } else if (msg.type === 'move') {
      const _sig = this._moveActivitySig(msg);
      if (_sig !== session.moveSig) {
        session.moveSig = _sig;
        session.lastRecv = Date.now();
      }
    } else {
      session.lastRecv = Date.now();
    }

    switch (msg.type) {
      case 'join':
        // Identity gate + eviction + rpg load/bootstrap + state_sync.
        // Hoisted to join.js _handleJoin (v2.3.1173, byte-identical
        // body; the awaits keep the input gate closed exactly as
        // before -- rule 9).
        await this._handleJoin(session, ws, msg);
        // v2.3.1177: the v2.3.1173 hoist dropped this break, so every
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
          // v2.3.1465: sanitize ONCE, then use the same clean copy for
          // all three consumers.  Each of them used to receive the raw
          // client blob, and all three were exploitable:
          //   - session.data feeds getAllPlayerData(), which spreads
          //     ...s.data LAST over playerState -- so a forged field
          //     there overwrote real values in the state_sync every
          //     joiner receives;
          //   - playerState is the authoritative store (the coins /
          //     stats / weapon forge documented at TRACK_COSMETIC_KEYS);
          //   - the player_update relay paints peers' screens.
          // Non-object payloads stay a no-op exactly as before.
          if (!msg.data || typeof msg.data !== 'object') break;
          const clean = Object.create(null);
          for (const k of TRACK_COSMETIC_KEYS) {
            if (!Object.prototype.hasOwnProperty.call(msg.data, k)) continue;
            const _tv = msg.data[k];
            /* v2.3.1631: bound the cosmetic STRINGS, matching the caps
               _sanitizeJoinData applies on the join path.  Without this
               the join caps were trivially bypassable: `track` copies
               the same keys every 2 s, and both session.data and
               playerState are spread into the state_sync EVERY later
               joiner receives -- so one 15 KB avatar (comfortably inside
               MAX_INBOUND_BYTES) is re-sent to every arrival, twice
               over, indefinitely.  Truncate rather than drop, for the
               same reason as the join path: a clipped string degrades
               visibly, a missing one reads as a broken feature.
               `rpgData` is a nested display blob, not a string, and
               stays as-is -- it is a documented client-reported posture
               (see reportToLeaderboard), out of scope here. */
            if (typeof _tv === 'string') {
              /* v2.3.1939: the shirt drawings share `avatar`'s larger bound
                 for the same reason they do on the join path -- they are a
                 fixed 256 chars, and the client rejects anything that is not
                 exactly that, so a 64-char cut is not a smaller drawing but no
                 drawing at all.  Kept in lockstep with _sanitizeJoinData: if
                 these two caps ever disagree, the join print and the track
                 print disagree too. */
              const _tcap = cosmeticCap(k);
              clean[k] = _tv.length > _tcap ? _tv.slice(0, _tcap) : _tv;
            } else if (_tv === null || typeof _tv === 'boolean'
                || (typeof _tv === 'number' && Number.isFinite(_tv))) {
              /* scalars are self-bounding */
              clean[k] = _tv;
            } else if (k === 'rpgData' && typeof _tv === 'object') {
              /* ═══ v2.3.1945: THE CAP BOUNDED STRINGS ONLY ═══
                 Everything that was not a string fell through to a blind copy,
                 so a peer could park an OBJECT under any cosmetic key -- `ta`,
                 `sa`, `sp`, any of them -- and it rode session.data,
                 playerState, the player_update fan-out, and the state_sync
                 every later joiner receives.  That is precisely the blob
                 channel the string cap exists to close, reachable by sending
                 the same key with a different type.  Found by fuzzing the
                 gate, not in the wild.
                 The join sanitiser never had the hole: it admits strings and
                 finite numbers and drops the rest.  This now matches it, with
                 the one documented exception -- `rpgData` is a nested
                 inspect-card blob by design -- bounded by serialized size the
                 same way _sanitizeJoinData bounds an rpg* container.
                 Non-finite numbers go too: NaN and Infinity survive neither
                 JSON round-trip nor arithmetic on the receiving side. */
              let _approx = 0;
              try { _approx = JSON.stringify(_tv).length; } catch { continue; }  /* cyclic: drop */
              if (_approx <= TRACK_BLOB_MAX_BYTES) clean[k] = _tv;
            }
          }
          // v2.3.1125: the registry owns the clan tag -- override the
          // client-supplied cosmetics BEFORE they merge/broadcast (this
          // blind merge was the tag-forgery hole).
          this._clanStampTag(session.id, clean);
          session.data = { ...session.data, ...clean };
          const _trackPs = this.playerState[session.id];
          if (_trackPs) {
            for (const k of Object.keys(clean)) {
              // Position is `move`'s alone -- see TRACK_STATE_EXCLUDED.
              if (!TRACK_STATE_EXCLUDED.has(k)) _trackPs[k] = clean[k];
            }
          }
          this.broadcastExcept(ws, { type: 'player_update', id: session.id, data: clean });
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
        // v2.3.1200: payload.viaPet = the pet loot vacuum -- same
        // handler, same claim flags, wider range gated on a
        // server-known active pet (caps.petLoot on the client side).
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

      case 'prog3_allocate':
        // v2.3.1659: spend 1 prog3 pool point on one of the seven
        // allocated stats (prog3.js — pool + per-stat caps validated
        // server-side; ack via prog3_allocated + player_state echo).
        if (session.id) {
          this._handleProg3Allocate(session, msg.payload || msg);
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

      /* v2.3.1733: a stamina ABILITY cast (Shield Bash / Whirlwind).
         Separate from ability_use above on purpose: that handler only
         spends a pool for an action the CLIENT resolves (dodge, lunge,
         the swipe's damage), whereas this one resolves the whole thing
         server-side — targets, damage, stun, knockback, kill credit —
         because it is new surface and new surface starts authoritative
         (rule zero).  See abilities.js. */
      case 'ability':
        if (session.id) {
          this._handleAbility(session, msg.payload || msg);
        }
        break;

      /* v2.3.1734: Element Burst (COMBAT-OVERHAUL-PLAN PR 6).  Its own type
         rather than a third `ability` kind: `ability` dispatches through
         STAM_ABILITIES (abilities.js) and prices its cost as a percentage of
         STAMINA, and the burst spends a flat MANA cost with an entirely
         different gate (an element on the equipped weapon).  Squeezing it
         into that table would mean a stamina ability that charges no
         stamina.  Payload carries NOTHING — the server reads the weapon,
         the element, the position, the pools and the cooldown from its own
         state and picks the targets itself.  See burst.js. */
      case 'element_burst':
        if (session.id) {
          this._handleElementBurst(session);
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

      case 'firemaking_request':
        // v2.3.1702: player tapped a wood_* log in the Bag to light a
        // campfire.  Server validates ownership, consumes 1, emits
        // player_state.  Without this the client's local delete was
        // refunded by the next inventory echo -- one log, unlimited
        // fires.  See _handleFiremakingRequest in cooking.js.
        if (session.id) {
          this._handleFiremakingRequest(session, msg.payload || msg);
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
      case 'trade2_ready':
        /* v2.3.1754: stage one of the two-stage trade (see trade2.js).  TRAPS
           #18: a new client->server type needs THREE things — this case, the
           handler, and a channelShim passthrough in wsClient.js.  Without the
           third it leaves the browser as a broadcast and the worker never
           hears it, silently. */
        if (session.id) this._handleTrade2Ready(session, msg.payload || msg);
        break;
      case 'trade2_confirm':
        if (session.id) await this._handleTrade2Confirm(session);
        break;
      case 'trade2_cancel':
        if (session.id) this._handleTrade2Cancel(session);
        break;
      case 'trade2_stage_weapon':
        // v2.3.1213: weapon lane -- escrow a stash weapon into the live
        // window (trade2.js).  Explicit case; gated client-side on
        // caps.trade2Weapons so an old worker never receives it.
        if (session.id) await this._handleTrade2StageWeapon(session, msg.payload || msg);
        break;
      case 'trade2_unstage_weapon':
        if (session.id) await this._handleTrade2UnstageWeapon(session, msg.payload || msg);
        break;

      case 'party_invite':
        // v2.3.1185: party roster (party.js).  Explicit cases so forged
        // halves meet validation, never the rebroadcast branch.  All
        // synchronous -- a party holds no escrowed value, no storage.
        if (session.id) this._handlePartyInvite(session, msg.payload || msg);
        break;
      case 'party_accept':
        if (session.id) this._handlePartyAccept(session, msg.payload || msg);
        break;
      case 'party_decline':
        if (session.id) this._handlePartyDecline(session, msg.payload || msg);
        break;
      case 'party_leave':
        if (session.id) this._handlePartyLeave(session);
        break;
      case 'party_kick':
        if (session.id) this._handlePartyKick(session, msg.payload || msg);
        break;
      case 'party_chat':
        // v2.3.1212: party-scoped chat -- its OWN validated case (rule
        // 13), never the room-wide rebroadcast branch; the server stamps
        // the sender + relays only to party members (party.js).
        if (session.id) this._handlePartyChat(session, msg.payload || msg);
        break;

      // v2.3.1323: friends system (friends.js) -- request/accept/decline/
      // remove handshake (rule 14/15: accepts validated against stored
      // requests, forged accepts dropped) + friend-gated DMs on the
      // party_chat shape.  All own validated cases; none rebroadcast.
      /* v2.3.1576: Hemi Bro ownership (broverify.js) -- server mints the
         challenge, recovers the signer and asks the chain who holds the
         token.  Own validated cases; neither rebroadcasts. */
      case 'bro_nonce':
        if (session.id) this._handleBroNonce(session, ws);
        break;
      case 'bro_verify':
        if (session.id) await this._handleBroVerify(session, msg.payload || msg, ws);
        break;

      case 'friend_request':
        if (session.id) await this._handleFriendRequest(session, msg.payload || msg);
        break;
      case 'friend_accept':
        if (session.id) await this._handleFriendAccept(session, msg.payload || msg);
        break;
      case 'friend_decline':
        if (session.id) await this._handleFriendDecline(session, msg.payload || msg);
        break;
      case 'friend_remove':
        if (session.id) await this._handleFriendRemove(session, msg.payload || msg);
        break;
      case 'friend_dm':
        if (session.id) await this._handleFriendDm(session, msg.payload || msg);
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

      case 'amulet_forge_request':
        // v2.3.1192: server-authoritative amulet forge -- smelt
        // (nuggets->bar), craft (bars+gold->amulet mint), gem
        // (polished gem->amulet.gem).  Validates + consumes from
        // SERVER state, echoes player_state; see amulet.js.  The
        // explicit case also keeps the message out of the default
        // rebroadcast branch.
        if (session.id) {
          this._handleAmuletForge(session, msg.payload || msg);
        }
        break;

      case 'gem_cut_request':
        // v2.3.1198: server-settled gem cutting (Gem Cutter building).
        // Consumes a server-held raw gem, rolls success from the
        // server-held gemCutting level, mints the polished gem the
        // amulet forge's gem op consumes; outcome rides the private
        // gem_cut_result event.  See amulet.js _handleGemCut.
        if (session.id) {
          this._handleGemCut(session, msg.payload || msg);
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

      case 'character_reset':
        // v2.3.1347: self-service full character restart -- snapshot,
        // delete rpg:<pid>, ack + close so the client reloads into a
        // fresh level-1 bootstrap.  See persistence.js.
        if (session.id) {
          await this._handleCharacterReset(session, msg.payload || msg);
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
        /* ═══ v2.3.1618: RELAY BUDGET ═══
         *
         * The size gate at the top of this method bounds ONE message; this
         * bounds the RATE at which a session may push into the room-wide
         * eventBuffer, which is the amplifying resource (every push is
         * fanned to every socket, and events are the one tick section
         * v2.3.1575's interest management deliberately did NOT zone-scope).
         *
         * A token bucket rather than a fixed window: the legitimate traffic
         * here is bursty and human (a chat line, an emote, a trade offer),
         * so a burst allowance with a slow refill fits it exactly, while a
         * sustained flood cannot outrun the refill.  RELAY_BURST is sized
         * well above any human rate -- the client's own PRIORITY_EVENTS
         * flush is the fastest legitimate producer and it is nowhere near.
         *
         * Silent drop, deliberately (the v2.3.1134 posture): no reject
         * event, because a reject is both a signal to a cheater and a
         * second message to fan out.  Gated on session.id so the pre-join
         * path is untouched. */
        if (session.id) {
          const _now = Date.now();
          if (session.relayTokens === undefined) {
            session.relayTokens = this.RELAY_BURST;
            session.relayAt = _now;
          }
          session.relayTokens = Math.min(this.RELAY_BURST,
            session.relayTokens + ((_now - session.relayAt) / 1000) * this.RELAY_REFILL_PER_S);
          session.relayAt = _now;
          if (session.relayTokens < 1) { session.relayDropped = (session.relayDropped || 0) + 1; break; }
          session.relayTokens -= 1;
        }
        if (session.id) {
          /* v2.3.1970: room chat is a relay, but not a blank cheque --
             clamp the line, strip control chars and stamp the sender
             before it is fanned out.  False means there is nothing left
             to say, so nothing is relayed (see CHAT_RELAY above). */
          if (msg.type === 'chat' && !this._sanitizeChatRelay(session, msg)) break;
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

  // ═══ _resolvePvPAttack ═══ moved to combat.js (v2.3.1191, P4
  // decomposition) -- the §16.12 lag-comp rollback PvP resolution
  // lives in combatMethods, mixed into this prototype below.

  async webSocketClose(ws) {
    const session = this.sessions.get(ws);
    if (session?.id) {
      if (this.playerState[session.id]) this.playerState[session.id].disconnected = true;
      /* v2.3.1619: flush coalesced regen before the in-memory blob is
         dropped.  The regen tick only writes durably every
         REGEN_SAVE_MS, so a player who regenerated inside that window
         and then left would reload the PRE-regen pools on their next
         join -- visible as HP/stamina snapping backwards at the worst
         possible moment.  Awaited: this is the last chance to persist,
         a disconnect is not latency-critical, and an unawaited put can
         be lost to DO eviction.  No-ops (_regenDirty false) for every
         player whose last write was value-bearing. */
      const _ps = this.playerState[session.id];
      if (_ps && _ps._regenDirty) await this._saveRpg(session.id, _ps);
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
      this._partyOnDisconnect(session.id); // v2.3.1185: mark 'away' (grace), don't remove -- reconnects are routine
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

  async reportToLeaderboard(session, force) {
    try {
      if (!session || !session.id) return;
      const stub = this.env.LEADERBOARD.get(this.env.LEADERBOARD.idFromName('global'));
      /* v2.3.1465: RANK COMES FROM THE SERVER.  This used to post
         `session.data.rpgLv` -- a number the client typed into a track
         message -- so any client could claim level 500 on the global
         board.  v2.3.1178 closed exactly this forge on the public
         POST /api/leaderboard route (see the router comment) and noted
         the GameRoom reports "server-side" via the DO binding instead;
         but the value it reported was still the client's.  ps.level is
         the authoritative one (build-point gated in grids.js), so read
         that and fall back to the claim only when there's no live
         player state.  rpgData stays client-reported for now: it is the
         inspect-card blob (gear names, kill tallies) and is vanity-only
         once rank itself is authoritative -- rebuilding it from server
         state is a follow-up, not a widening of this fix. */
      const lbPs = this.playerState[session.id];
      const lbLevel = (lbPs && typeof lbPs.level === 'number')
        ? lbPs.level : (session.data?.rpgLv || 1);
      const name = session.name || session.data?.name || 'Anon';
      const color = session.data?.color || '#5b52ff';
      const rpgData = session.data?.rpgData || {};

      /* v2.3.1620: REPORT ONLY WHAT CHANGED.  The client sends `track`
         every 2 s (BroTown.jsx:4592) and this fired on every one of them,
         so each player drove 1,800 cross-DO fetches AND 1,800
         Leaderboard storage.put calls per hour -- updatePlayer
         (leaderboard.js:41) writes unconditionally, never comparing.
         Measured: only ~3.4% of those rows differed in content from the
         row before them.  That is 1,800 billed rows + 1,800 billed
         requests per player-hour to mostly rewrite an identical record;
         for scale, it is over 5x the whole regen writer after v2.3.1607.
         The signature below covers EXACTLY the fields updatePlayer
         persists -- not the whole rpgData blob, so churn in fields the
         leaderboard ignores can never trigger a write.  `ts`/`lastSeen`
         are deliberately excluded: including them would make every
         signature unique and defeat the compare entirely.
         Three ways through the gate:
           - force        : the join path (join.js), so a fresh joiner
                            appears on the board immediately.
           - MIN_MS       : content genuinely changed, and it has been
                            long enough.  Dropping a change here is safe
                            -- `track` returns in 2 s and the next one
                            re-evaluates, so a real change lands within
                            one MIN_MS window at worst.
           - HEARTBEAT_MS : nothing changed, but refresh `lastSeen` so a
                            long-lived session can't age out of getTop's
                            7-day staleness filter (leaderboard.js:51).
                            10 min leaves ~1000x margin on that window.
         Worst case per player-hour is now 60 rows (a changed record every
         MIN_MS); a steady one costs 6. */
      /* v2.3.1671: the per-skill board is SERVER-AUTHORITATIVE.  Combat
         levels come from ps.prog3, life-skill levels from ps.lifeSkills and
         kills from svKills — the exact same object `_chainScoreSeries`
         signs for the chain, so the in-game hiscores and the public ledger
         are computed once and can never tell different stories.
         The `rpgData` columns below stay client-reported: they feed the
         legacy desktop panel only, and the new categories never read them.
         Falls back to an empty series when there is no live player state
         (the join path can report before `ps` exists), which just means the
         row carries no skill columns until the next report. */
      const series = lbPs ? this._chainScoreSeries(lbPs) : {};

      const sig = JSON.stringify([
        name, color, lbLevel,
        rpgData.lifeTotal || 0, rpgData.ap || 0, rpgData.kills || 0,
        rpgData.dungeons || 0, rpgData.goldEarned || 0, rpgData.playtime || 0,
        rpgData.clanTag || null,
        /* The series MUST be inside the change signature or a level-up would
           never reach the board: the throttle below only writes when this
           string differs, and a fishing level moving is exactly the kind of
           change the old signature could not see. */
        series,
      ]);
      const now = Date.now();
      const since = now - (session._lbAt || 0);
      if (!force
        && since < this.LEADERBOARD_HEARTBEAT_MS
        && !(sig !== session._lbSig && since >= this.LEADERBOARD_MIN_MS)) return;
      session._lbSig = sig;
      session._lbAt = now;

      await stub.fetch(new Request('https://internal/api/leaderboard/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: session.id, name, color, level: lbLevel,
          rpgData, series, ts: now,
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
Object.assign(GameRoom.prototype, broVerifyMethods); /* v2.3.1576 */
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
// v2.3.1730: telegraphed standard-zone attacks -- see telegraph.js.
Object.assign(GameRoom.prototype, telegraphMethods);
// v2.3.1733: stamina abilities + the milestone ladder -- see abilities.js.
Object.assign(GameRoom.prototype, abilityMethods);
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
// v2.3.1178: HTTP economy-endpoint session tokens -- see httpauth.js.
Object.assign(GameRoom.prototype, httpAuthMethods);
// v2.3.1173 (P4 decomposition): join bootstrap -- see join.js.
Object.assign(GameRoom.prototype, joinMethods);
// v2.3.1174 (P4 decomposition): tick loop -- see tick.js.
Object.assign(GameRoom.prototype, tickMethods);
// v2.3.1185: party roster mixin (handoff item D).
Object.assign(GameRoom.prototype, partyMethods);
// v2.3.1191 (P4 decomposition): combat/damage core -- see combat.js.
Object.assign(GameRoom.prototype, combatMethods);
// v2.3.1192: server amulet forge (handoff item I follow-up) -- see amulet.js.
Object.assign(GameRoom.prototype, amuletMethods);
// v2.3.1323: mutual friendships + requests + DMs -- see friends.js.
Object.assign(GameRoom.prototype, friendsMethods);
Object.assign(GameRoom.prototype, prog3Methods); /* v2.3.1659 */
Object.assign(GameRoom.prototype, chainScoreMethods); /* v2.3.1664 */
Object.assign(GameRoom.prototype, burstMethods); /* v2.3.1734 */
// v2.3.1983: population-scaled spawns -- see spawnscale.js.
Object.assign(GameRoom.prototype, spawnScaleMethods);
