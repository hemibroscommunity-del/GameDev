/* ═══ GAME EVENTS — the server/peer event dispatcher (40+ message types) ═══ */
/* v2.3.783: _processGameEvent moved verbatim from the inline WS client in
   src/ui/BroTown.jsx (REBUILD-PLAN Phase 4, behavior-frozen). It handles
   both batched `tick.events` entries and direct sends (see
   docs/WIRE-PROTOCOL.md for the full message inventory).
   Closure captures became explicit:
   - module imports below (data tables, variant helpers, combat/chat
     helpers, babel runtime) per the extracted-module rule — never rely on
     the globalThis copies;
   - React setters + the effect-scoped _buildServerPile arrive via `deps`
     (destructured to the original names so the body is untouched).
   S is stateRef.current. */
import { _onBroNonce, _onBroResult } from './broWallet.js'; /* v2.3.1576 */
import { BT_AUDIO, ZONES, TILE, ARENA_CHAMPION_REWARD, ARENA_WIN_REWARD, CLAN_WAR_REWARDS, createDefaultCompStats, recalcDerived, DEATH_GOLD_PENALTY, PVP_THREAT_CONSENT_MS, updateZoneDimensions, generateZoneMap, trainDefense, getGuildRank, SKILL_GUILDS } from '@/data/index.js';
import { MONSTER_VARIANTS, maybeTransformMonster, isRemnantSkull, xpMultFor } from '@/data/monsterVariants.js';
import { rollMonsterShard } from '@/data/shards.js';
import { isWearingArmor } from '@/rendering/gearCatalog.js'; /* v2.3.1598: armoured-hit SFX check */
/* BT_API_BASE: same window.BROTOWN_WS_URL-derived value BroTown computes at
   its own module scope — the barrel export is the canonical copy. */
import { BT_API_BASE } from '@/networking/index.js';
import { pushHudPopup } from '@/ui/XpFlyOverlay.jsx';
import { enqueuePeerDamage, peerDmgKey, distributeKillXpToBuild, applyMeleeLifesteal, addBuildUse, pushDmgPopup, monsterPopupY } from '@/game/combatHelpers.js';
import { handleChatEvent, handleEmoteEvent, handlePartyChatEvent } from '@/game/chat.js';
import { friendsSrv } from '@/ui/mobile/sheet/friendsSync.js'; /* v2.3.1324 */
import { _objectSpread, _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';
import { saveRpgSoon } from '@/game/rpgSave.js'; /* v2.3.1356 */

/* v2.3.1107: angle -> 8-way compass, same SECTORS convention as
   entityRenderer (atan2(dy,dx) -> 'east' when dx>0).  Used to reconcile a
   remote's BODY facing with the angle carried by its action events
   (swing/dodge/bow) -- those angles were applied to the action stand-in
   only, so under broadcast latency the body could face one way while the
   swing pointed another.  The next move broadcast (sender's own `f`)
   overwrites this, so it's a between-packets correction, never a fork. */
/* v2.3.1193: threat-skull marks (docs/specs/threats.md, "Skull
   rendering").  S._threatMarks[pid] = { type:'red'|'white', until }
   drives the 💀 entityRenderer draws over OTHER players; the local
   player's own skull rides the previously ORPHANED S._pvpSkullType /
   S._pvpSkullUntil anchors (InspectPlayerPanel writes them at
   threat-issue; the handlers below keep them authoritative).  Pure
   display state derived from the relayed, server-validated handshake —
   never sent back to the server, and time-bounded (≤10-min consent
   window) so reconnects/deploys just let stale marks age out. */
function _setThreatMark(S, pid, type, until) {
  if (!pid || typeof pid !== 'string' || pid === S.myId) return;
  if (!S._threatMarks) S._threatMarks = {};
  S._threatMarks[pid] = { type: type, until: until };
}

/* v2.3.1574 (owner: "combat attacks broadcast to every zone in multiplayer
   where the other player is.  Keep it only where they are").
   Combat FX ride the room-wide broadcast channel -- there is one GameRoom for
   the whole world, and #327's tick scoping deliberately left this path alone
   because it carries chat/clan/trade alongside combat.  So a peer swinging in
   the Flame Fields sends their swing to everyone, in every zone.
   The BODY renderers already drop out-of-zone peers (entityRenderer's remote
   loop, this file's harvest stand-ins), which is why this never showed as a
   floating torso -- but the effects that do NOT go through a peer's body
   container still landed: their arrow flew across your screen, their dodge
   smear painted your zone, their damage popup opened over your ground.
   Peers carry their zone on every tick payload (wsClient sets `.zone` from
   `data.z`), so gate on that.  An UNKNOWN sender is dropped too: we cannot
   place them, and the renderers would not draw their body either. */
function _peerInZone(S, id) {
  var o = S && S.others && S.others[id];
  if (!o) return false;
  return (o.zone || o.z || 'town') === S.currentZone;
}

var _FACING8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
function _reconcileFacing(other, ang) {
  if (!other || typeof ang !== 'number' || !isFinite(ang)) return;
  var sector = Math.round(ang / (Math.PI / 4));
  other._renderFacing = _FACING8[((sector % 8) + 8) % 8];
}

export function processGameEvent(type, payload, S, deps) {
  var setRpgState = deps.setRpgState,
    pixiRef = deps.pixiRef,
    setChatLog = deps.setChatLog,
    setUnreadChats = deps.setUnreadChats,
    setDuelRequest = deps.setDuelRequest,
    setThreatIncoming = deps.setThreatIncoming,
    setLevelUpMsg = deps.setLevelUpMsg,
    setIncomingTrade = deps.setIncomingTrade,
    setTrade2 = deps.setTrade2,
    setParty = deps.setParty,
    setArenaTournament = deps.setArenaTournament,
    setArenaBets = deps.setArenaBets,
    setClanData = deps.setClanData, /* v2.3.1611 */
    _buildServerPile = deps._buildServerPile;
        switch (type) {
          case 'loot_drop':
            {
              /* Server-authoritative pile from a monster kill.  Push to
                 local groundLoot if not already present -- the worker
                 also includes new piles in state_sync / zone_loot for
                 joiners, so the same id may arrive twice. */
              if (!payload || !payload.pile || !S.groundLoot) break;
              var _existing = S.groundLoot.find(function (l) { return l.lootId === payload.pile.lootId; });
              if (_existing) break;
              S.groundLoot.push(_buildServerPile(payload.pile, S.myId));
              break;
            }
          case 'loot_claimed':
            {
              /* Broadcast: another player claimed against this pile.
                 If they were the first claimer, the one-of inventory
                 portion is gone -- null it on our local copy so the
                 visual reverts to a plain coin pile and a subsequent
                 pickup doesn't try to claim the inventory again. */
              if (!payload || !payload.lootId || !S.groundLoot) break;
              for (var _lcj = 0; _lcj < S.groundLoot.length; _lcj++) {
                var _loCl = S.groundLoot[_lcj];
                if (_loCl.lootId !== payload.lootId) continue;
                if (payload.inventoryClaimedNow) {
                  _loCl.inventoryClaimed = true;
                  _loCl.skull = null;
                  _loCl.shard = null;
                }
                /* v2.3.1141: weapon has its own claim flag; clear the
                   glow/label on everyone's copy once someone takes it. */
                if (payload.weaponClaimedNow) {
                  _loCl.hasWeapon = false;
                }
                /* If WE are the one who claimed, the loot_credit case
                   (top-level) handles the local despawn -- nothing
                   else to do here for the picker. */
                break;
              }
              break;
            }
          case 'loot_despawn':
            {
              /* Server says the pile is done -- last recipient claimed
                 or 60 s expiry hit.  Mark expired so renderer + filter
                 clear it.  v2.3.113: also immediate-dispose so a frame
                 of latency between _expired and the orphan sweep can't
                 leave a stale coin sprite (mummy / skeleton bug). */
              if (!payload || !payload.lootId || !S.groundLoot) break;
              for (var _lde = 0; _lde < S.groundLoot.length; _lde++) {
                if (S.groundLoot[_lde].lootId === payload.lootId) {
                  S.groundLoot[_lde]._expired = true;
                  break;
                }
              }
              try {
                if (pixiRef.current && pixiRef.current.disposeLootById) {
                  pixiRef.current.disposeLootById(payload.lootId);
                }
              } catch (_e) {}
              break;
            }
          case 'chat':
            {
              /* v2.3.767: body moved to src/game/chat.js (Phase 2). */
              handleChatEvent(payload, S, { setChatLog: setChatLog, setUnreadChats: setUnreadChats });
              break;
            }
          case 'emote':
            {
              /* v2.3.767: body moved to src/game/chat.js (Phase 2). */
              handleEmoteEvent(payload, S);
              break;
            }
          case 'party_chat':
            {
              /* v2.3.1212: server-validated party-only chat (item D
                 follow-up). Body in chat.js beside the room-chat path. */
              handlePartyChatEvent(payload, S, { setChatLog: setChatLog, setUnreadChats: setUnreadChats });
              break;
            }
          /* v2.3.1324: friends system (server/src/friends.js).  The doc
             sync is the single truth for list/requests; DMs append to
             the local thread archive (the server backlog is delivered-
             once).  A one-time migration graduates the legacy local
             bt_friends follows into real requests. */
          case 'friend_sync':
            {
              friendsSrv.setDoc(payload);
              try {
                if (S._serverCaps && S._serverCaps.friends && S.channel
                    && !localStorage.getItem('bt_friendsMigrated')) {
                  var _legacy = JSON.parse(localStorage.getItem('bt_friends') || '[]');
                  for (var _li = 0; _li < _legacy.length && _li < 25; _li++) {
                    var _lf = _legacy[_li];
                    var _lid = (_lf && _lf.id) || _lf;
                    if (!_lid || (payload.list && payload.list[_lid]) || (payload.reqOut && payload.reqOut[_lid])) continue;
                    S.channel.send({ type: 'broadcast', event: 'friend_request', payload: { target: _lid, name: (_lf && _lf.name) || 'Bro' } });
                  }
                  localStorage.setItem('bt_friendsMigrated', '1');
                }
              } catch (_e) {}
              break;
            }
          case 'friend_request_in':
          case 'friend_accepted':
            /* Display state rides the friend_sync that accompanies
               every mutation; these are notification hooks (badge
               refresh happens via the store's emit on that sync). */
            break;
          case 'friend_dm':
            {
              if (payload && payload.from) friendsSrv.appendDm(payload.from, payload, false);
              break;
            }
          case 'friend_dm_backlog':
            {
              var _msgs = (payload && payload.messages) || [];
              for (var _mi = 0; _mi < _msgs.length; _mi++) {
                if (_msgs[_mi] && _msgs[_mi].from) friendsSrv.appendDm(_msgs[_mi].from, _msgs[_mi], false);
              }
              break;
            }
          case 'friend_error':
            {
              friendsSrv.setError(payload || null);
              break;
            }
          case 'gamble_result':
            {
              /* v2.3.1124: server-rolled gamble outcome (private).  The
                 coins already moved server-side and arrive via the
                 authoritative player_state echo -- this event only
                 drives the win/loss feedback, mirroring the visuals the
                 legacy local roll produced (GamblePanel). */
              var _gR = S.rpg;
              if (!_gR) break;
              if (!_gR._compStats) _gR._compStats = createDefaultCompStats();
              _gR._compStats.totalGambled += payload.wager || 0;
              _gR._compStats.totalGoldSpent += payload.wager || 0;
              if (payload.won) {
                _gR._compStats.totalGambleWon += payload.payout || 0;
                _gR._compStats.totalGoldEarned += payload.payout || 0;
                S._gambleResult = { won: true, amount: payload.payout || 0, ts: Date.now() };
                pushDmgPopup(S, S.player.x, S.player.y - 30, '+' + (payload.payout || 0) + 'g!', '#3dd497');
                S.screenShake = 3;
                BT_AUDIO.collect();
              } else {
                _gR._compStats.totalGambleLost += payload.wager || 0;
                S._gambleResult = { won: false, amount: payload.wager || 0, ts: Date.now() };
                pushDmgPopup(S, S.player.x, S.player.y - 30, '-' + (payload.wager || 0) + 'g', '#ff5e6c');
                BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
              }
              setRpgState(_objectSpread({}, _gR));
              break;
            }
          case 'jackpot_state':
            {
              /* v2.3.1149: server-authoritative jackpot pool (private;
                 sent on join and after a deposit).  Coins already moved
                 server-side (player_state echo) -- this drives the
                 GamblePanel pool display + the deposit popup. */
              S._jackpotPool = payload.pool || 0;
              S._jackpotTickets = payload.yourTickets || 0;
              if (payload.deposited) {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Deposited ' + payload.deposited + 'g to jackpot (' + (payload.yourTickets || 0) + ' 🎟️)', '#f5c542');
              }
              break;
            }
          case 'jackpot_result':
            {
              /* v2.3.1149: weekly draw settled (broadcast).  Winner's
                 gold rides _creditPlayer (online delivery or inbox). */
              S._jackpotPool = 0;
              S._jackpotTickets = 0;
              pushDmgPopup(S, S.player.x, S.player.y - 44, '🎰 ' + (payload.winnerName || 'Someone') + ' won the ' + (payload.amount || 0) + 'g jackpot!', '#f5c542', { ttl: 5 });
              try { BT_AUDIO.collect(); } catch (e) {}
              break;
            }
          case 'dungeon_started':
            {
              /* v2.3.1127: the worker accepted our dungeon_start (config
                 re-validated + clamped server-side) and pre-spawned wave
                 1 into a private instance zone.  Build the local arena
                 exactly like the legacy launchDungeon did, register a
                 synthetic ZONES entry so every ZONES[S.currentZone]
                 deref keeps working while we're inside, and step into
                 the instance -- the move's zone change makes the server
                 reply with zone_state, which flips S._serverMonsters
                 and delivers the wave. */
              if (!payload || !payload.zone) break;
              var _dCfg = payload.cfg || {};
              var _ddW = _dCfg.width || 25,
                _ddH = _dCfg.height || 20;
              S._preDungeonPos = { x: S.player.x, y: S.player.y };
              var _ddMap = Array.from({ length: _ddH }, function () { return Array(_ddW).fill(0); });
              for (var _ddx = 0; _ddx < _ddW; _ddx++) { _ddMap[0][_ddx] = 7; _ddMap[_ddH - 1][_ddx] = 7; }
              for (var _ddy = 0; _ddy < _ddH; _ddy++) { _ddMap[_ddy][0] = 7; _ddMap[_ddy][_ddW - 1] = 7; }
              var _ddMX = Math.floor(_ddW / 2),
                _ddMY = Math.floor(_ddH / 2);
              for (var _ddx2 = 1; _ddx2 < _ddW - 1; _ddx2++) _ddMap[_ddMY][_ddx2] = 1;
              for (var _ddy2 = 1; _ddy2 < _ddH - 1; _ddy2++) _ddMap[_ddy2][_ddMX] = 1;
              for (var _ddi = 0; _ddi < Math.floor(_ddW * _ddH * 0.08); _ddi++) {
                _ddMap[2 + Math.floor(Math.random() * (_ddH - 4))][2 + Math.floor(Math.random() * (_ddW - 4))] = 1;
              }
              _ddMap[_ddH - 1][_ddMX] = 9;
              _ddMap[_ddH - 1][_ddMX + 1] = 9;
              S.map = _ddMap;
              globalThis.TOWN_W = _ddW * TILE;
              globalThis.TOWN_H = _ddH * TILE;
              globalThis.COLS = _ddW;
              globalThis.ROWS = _ddH;
              /* Synthetic zone entry: not safe (combat works), not
                 lawless (PvP fails closed server-side anyway), empty
                 spawns (spawnMonstersForZone guards on it).  Tagged
                 _instance so exit paths only ever delete what we added
                 and the Encyclopedia can filter it. */
              ZONES[payload.zone] = {
                id: payload.zone, name: _dCfg.name || 'Dungeon', w: _ddW, h: _ddH,
                level: [_dCfg.monsterLevel || 1, _dCfg.monsterLevel || 1],
                element: _dCfg.element || null, safe: false, spawns: [], _instance: true
              };
              S._dungeonZone = S.currentZone; /* return zone for the tile-9 exit */
              S.currentZone = payload.zone;
              S._serverDungeon = payload.zone;
              S._inDungeon = true;
              S._inCustomDungeon = true;
              S._customDungeonConfig = _dCfg;
              S._dungeonDepth = 'shallow';
              S._dungeonWave = 0;
              S._dungeonMaxWaves = _dCfg.waves || 3;
              S._dungeonBossSpawned = false;
              S._dungeonComplete = false;
              S.monsters = [];
              S.gatherNodes = [];
              S.groundLoot = [];
              if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
              S.hitParticles = [];
              S.deathExplosions = [];
              S.arrows = [];
              S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */
              S.player.x = _ddMX * TILE;
              S.player.y = (_ddH - 3) * TILE;
              S._zoneWipe = Date.now();
              /* Step into the instance NOW (not on the next joystick
                 packet) so the wave-1 zone_state arrives immediately. */
              if (S.channel) {
                try { S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } }); } catch (e) {}
              }
              pushDmgPopup(S, S.player.x, S.player.y - 50, _dCfg.name || 'Dungeon', '#a070e0');
              pushDmgPopup(S, S.player.x, S.player.y - 35, 'Wave 1/' + (_dCfg.waves || 3), 'rgba(255,255,255,.5)');
              BT_AUDIO.beep(400, 0.1, 0.12, 'sine');
              break;
            }
          case 'dungeon_wave':
            {
              /* Server cleared the wave-advance check; the fresh wave
                 arrives via a zone_state re-push right before this. */
              if (!payload || payload.zone !== S._serverDungeon) break;
              S._dungeonWave = (payload.wave || 1) - 1;
              pushDmgPopup(S, S.player.x, S.player.y - 40, 'Wave ' + (payload.wave || 1) + '/' + (payload.total || S._dungeonMaxWaves), '#ff5e6c');
              BT_AUDIO.beep(300, 0.1, 0.15, 'sawtooth');
              S.screenShake = 4;
              break;
            }
          case 'dungeon_boss':
            {
              if (!payload || payload.zone !== S._serverDungeon) break;
              S._dungeonBossSpawned = true;
              pushDmgPopup(S, S.player.x, S.player.y - 50, 'BOSS FIGHT!', '#ff5e6c');
              BT_AUDIO.beep(100, 0.25, 0.3, 'sawtooth');
              S.screenShake = 8;
              break;
            }
          case 'dungeon_complete':
            {
              /* Rewards are settled server-side (coins ride the
                 authoritative player_state echo; XP is the server's
                 analytics counter) -- this event drives the win
                 feedback and the 3s return-home, mirroring the legacy
                 dungeonWaves completion visuals. */
              if (!payload || payload.zone !== S._serverDungeon) break;
              S._dungeonComplete = true;
              var _dcR = S.rpg;
              if (_dcR) {
                if (!_dcR._compStats) _dcR._compStats = createDefaultCompStats();
                if (payload.boss) _dcR._compStats.dungeonsCleared++;
                _dcR._compStats.totalGoldEarned += payload.gold || 0;
                setRpgState(_objectSpread({}, _dcR));
              }
              pushDmgPopup(S, S.player.x, S.player.y - 60, 'DUNGEON CLEARED!', '#f5c542');
              pushDmgPopup(S, S.player.x, S.player.y - 45, '+' + (payload.gold || 0) + 'G +' + (payload.xp || 0) + 'XP', '#f5c542');
              BT_AUDIO.levelUp();
              S.screenShake = 10;
              setTimeout(function () {
                if (!S._serverDungeon) return; /* already left via the exit tile */
                if (ZONES[S._serverDungeon] && ZONES[S._serverDungeon]._instance) delete ZONES[S._serverDungeon];
                S._serverDungeon = null;
                S._inDungeon = false;
                S._inCustomDungeon = false;
                S._customDungeonConfig = null;
                S._serverMonsters = false;
                /* v2.3.1406: per-zone loading — warm the farm map (idempotent;
                   usually still resident from the entry warp). */
                import('@/rendering/preloadAnimations.js').then(function (m) { return m.preloadZoneAssets('farm_home'); }).catch(function () {});
                S.currentZone = 'farm_home';
                updateZoneDimensions('farm_home');
                S.map = generateZoneMap('farm_home');
                var _fz = ZONES.farm_home;
                globalThis.TOWN_W = _fz.w * TILE;
                globalThis.TOWN_H = _fz.h * TILE;
                globalThis.COLS = _fz.w;
                globalThis.ROWS = _fz.h;
                S.monsters = [];
                S.gatherNodes = [];
                S.groundLoot = [];
                S.hitParticles = [];
                S.deathExplosions = [];
                S.arrows = [];
                S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */
                S.player.x = Math.floor(_fz.w / 2) * TILE;
                S.player.y = (_fz.h - 4) * TILE;
                S._zoneWipe = Date.now();
                if (S.channel) {
                  try { S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: 'farm_home', vx: 0, vy: 0 } }); } catch (e) {}
                }
              }, 3000);
              break;
            }
          case 'dungeon_error':
            {
              pushDmgPopup(S, S.player.x, S.player.y - 30, (payload && payload.message) || 'Dungeon unavailable', '#ff5e6c');
              BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
              break;
            }
          case 'dungeon_boss_ability':
            {
              /* v2.3.1194: server-scripted boss ability notice
                 (handoff item F follow-up -- the slam/charge/summon/
                 sweep kit moved from the dead local boss AI into
                 dungeon.js).  DISPLAY-ONLY on purpose: warning popup at
                 telegraph, ring/shake/beep at execute, mirroring the
                 legacy monsterCombat.js visuals.  All damage arrives
                 via the authoritative monster_attack + player_state
                 events; never mutate HP or monsters here (v2.3.1199:
                 sole exception is the cosmetic color tint on enrage --
                 display state only, never hp/alive/dmg). */
              if (!payload || payload.zone !== S._serverDungeon) break;
              var _dbaLabels = { slam: 'SLAM!', charge: 'CHARGE!', summon: 'Summon!', sweep: 'SWEEP!', enrage: 'ENRAGED!', siphon: 'DRAIN!' };
              var _dbaColors = { slam: '#f5c542', charge: '#ea580c', summon: '#9333ea', sweep: '#a855f7', enrage: '#ff2020', siphon: '#22c55e' };
              var _dbaLabel = _dbaLabels[payload.ability];
              if (!_dbaLabel) break; /* whitelist -- never render arbitrary wire strings */
              var _dbaX = typeof payload.x === 'number' ? payload.x : S.player.x;
              var _dbaY = typeof payload.y === 'number' ? payload.y : S.player.y;
              if (payload.phase === 'telegraph') {
                /* Legacy telegraph read: amber "<ABILITY>!" over the boss. */
                pushDmgPopup(S, _dbaX, _dbaY - 40, _dbaLabel, '#fbbf24');
                BT_AUDIO.beep(400, 0.08, 0.1, 'sine');
                break;
              }
              /* Execute visuals per ability (legacy colors/shake). */
              pushDmgPopup(S, _dbaX, _dbaY - 30, _dbaLabel, _dbaColors[payload.ability]);
              if (payload.ability === 'slam' || payload.ability === 'sweep') {
                if (!S._impactRings) S._impactRings = [];
                S._impactRings.push({
                  x: _dbaX, y: _dbaY, ts: Date.now(),
                  color: _dbaColors[payload.ability],
                  maxR: payload.range || 80,
                  duration: payload.ability === 'slam' ? 400 : 300
                });
                S.screenShake = payload.ability === 'slam' ? 10 : 6;
                BT_AUDIO.beep(payload.ability === 'slam' ? 80 : 150, 0.2, 0.25, payload.ability === 'slam' ? 'sawtooth' : 'square');
              } else if (payload.ability === 'charge') {
                BT_AUDIO.beep(200, 0.15, 0.2, 'sawtooth');
              } else if (payload.ability === 'enrage') {
                /* v2.3.1199: soft anti-stall timer armed / ramped
                   server-side (BOSS_ABILITIES.ENRAGE).  Legacy enrage
                   visuals (monsterCombat.js: red popup + shake + low
                   sawtooth) plus a cosmetic red tint on the boss
                   sprite.  Best-effort tint: a full zone re-push (or
                   any v1 dirty-list resend) restores the server color,
                   but the event repeats every ramp step so it comes
                   back; the popup is the primary signal. */
                var _dbaBoss = (S.monsters || []).find(function (mm) { return mm && mm.id === payload.monsterId; });
                if (_dbaBoss) _dbaBoss.color = '#ff2020';
                if (payload.stacks > 1) {
                  pushDmgPopup(S, _dbaX, _dbaY - 45, '+' + (payload.pct || 0) + '% DMG', '#ff2020');
                }
                S.screenShake = 6;
                BT_AUDIO.beep(120, 0.2, 0.3, 'sawtooth');
              } else if (payload.ability === 'siphon') {
                /* v2.3.1217: life-drain.  DISPLAY-ONLY like the rest --
                   the boss's actual HP gain rides the authoritative
                   monster tick delta; here we just surface the heal as a
                   green "+N" over the boss and a rising two-note chime. */
                if (typeof payload.heal === 'number' && payload.heal > 0) {
                  pushDmgPopup(S, _dbaX, _dbaY - 45, '+' + payload.heal, '#22c55e');
                }
                BT_AUDIO.beep(500, 0.12, 0.18, 'sine');
              } else {
                /* summon -- the fresh minions arrive via the zone_state
                   re-push that precedes this event. */
                BT_AUDIO.beep(300, 0.1, 0.15, 'square');
              }
              break;
            }
          case 'arena_stake_placed':
            {
              /* v2.3.1128: the worker escrowed our sponsorship stake
                 (gold already debited server-side; the player_state
                 echo shows it).  Private ack -- just the confirm UI. */
              if (!payload) break;
              pushDmgPopup(S, S.player.x, S.player.y - 30, 'Staked ' + (payload.amount || 0) + 'G on ' + (payload.targetName || 'a gladiator'), '#f5c542');
              break;
            }
          case 'arena_stake_result':
            {
              /* v2.3.1128: server-observed match settled our stake --
                 3x credit already applied via _creditPlayer (or the
                 stake went to the winning competitor).  Visuals only. */
              if (!payload) break;
              var _stR = S.rpg;
              if (payload.won) {
                if (_stR && _stR._compStats) _stR._compStats.totalGoldEarned += payload.payout || 0;
                if (!S.stats._betsWon) S.stats._betsWon = 0;
                S.stats._betsWon++;
                pushDmgPopup(S, S.player.x, S.player.y - 50, 'SPONSORSHIP PAID! +' + (payload.payout || 0) + 'G', '#3dd497');
                BT_AUDIO.collect();
              } else {
                pushDmgPopup(S, S.player.x, S.player.y - 50, 'Stake lost (-' + (payload.amount || 0) + 'G)', '#ff5e6c');
              }
              if (_stR) setRpgState(_objectSpread({}, _stR));
              break;
            }
          case 'arena_stake_error':
            {
              pushDmgPopup(S, S.player.x, S.player.y - 30, (payload && payload.message) || 'Stake rejected', '#ff5e6c');
              BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
              break;
            }
          case 'arena_stake_board':
            {
              /* v2.3.1210: server-summed spectator stake board (display
                 only -- PRIVILEGED, so it can't be forged; the worker
                 recomputes it from the escrow ledger on each
                 placement/settlement).  Stored on the state object and
                 read by PartyPanel's arena view (which re-renders on its
                 3s poll) -- no self-mint, no coin touch.  This is NOT
                 the legacy arena_bet relay (TRAPS #1); it's a distinct
                 privileged type carrying only per-competitor sums. */
              S._arenaStakeBoard = (payload && Array.isArray(payload.board)) ? payload.board : [];
              break;
            }
          case 'guild_quest_result':
            {
              /* v2.3.1128: server-verified guild quest turn-in.  Gold
                 and AP are already applied server-side (authoritative
                 player_state echo); here we adopt the server's ladder
                 index into the client-owned _guildProgress UI field and
                 replay the completion visuals the old local mint drew
                 (GuildPanel).  ADOPT, don't increment -- a re-sent
                 result can't double-advance the ladder. */
              if (!payload || !payload.skill) break;
              var _gqR = S.rpg;
              if (!_gqR) break;
              if (!_gqR._guildProgress) _gqR._guildProgress = {};
              _gqR._guildProgress[payload.skill] = (payload.index || 0) + 1;
              var _gqLvl = (_gqR.lifeSkills && _gqR.lifeSkills[payload.skill] && _gqR.lifeSkills[payload.skill].level) || 1;
              var _gqRank = getGuildRank(_gqLvl);
              if (!_gqR._titles) _gqR._titles = [];
              var _gqTitle = _gqRank.title + ' ' + payload.skill.replace(/([A-Z])/g, ' $1').trim();
              if (!_gqR._titles.includes(_gqTitle)) _gqR._titles.push(_gqTitle);
              if (_gqR._compStats) {
                _gqR._compStats.totalGoldEarned += payload.gold || 0;
                _gqR._compStats.questsCompleted++;
              }
              if (!S.stats._guildRanksEarned) S.stats._guildRanksEarned = 0;
              S.stats._guildRanksEarned++;
              if (_gqRank.rank >= 5) {
                if (!S.stats._guildMasterCount) S.stats._guildMasterCount = 0;
                S.stats._guildMasterCount++;
              }
              var _gqG = SKILL_GUILDS[payload.skill] || {};
              pushDmgPopup(S, S.player.x, S.player.y - 40, (_gqG.name || 'Guild') + ' quest complete!', _gqG.color || '#f5c542');
              pushDmgPopup(S, S.player.x, S.player.y - 25, '+' + (payload.gold || 0) + 'G +' + (payload.ap || 0) + 'AP', '#f5c542');
              BT_AUDIO.collect();
              setRpgState(_objectSpread({}, _gqR));
              try {
                localStorage.setItem('bt_rpg', JSON.stringify(_gqR));
              } catch (e) {}
              break;
            }
          case 'guild_quest_error':
            {
              pushDmgPopup(S, S.player.x, S.player.y - 30, (payload && payload.message) || 'Turn-in rejected', '#ff5e6c');
              BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
              break;
            }
          case 'inbox_delivered':
            {
              /* v2.3.1117: offline mail landed (market refund, trade
                 payout, wager return).  The credits are already applied
                 server-side and arrive via the authoritative player_state
                 echo -- this event only drives the "you received X"
                 system message.  A dedicated mail panel can replace this
                 later; the payload shape is docs/specs/inbox-escrow.md. */
              var _inbEntries = (payload && payload.entries) || [];
              for (var _ie = 0; _ie < _inbEntries.length; _ie++) {
                var _e = _inbEntries[_ie] || {};
                var _ep = _e.payload || {};
                var _what = _e.kind === 'gold' ? '+' + (_ep.amount || 0) + ' gold'
                  : _e.kind === 'item' ? (_ep.count || 1) + '× ' + (_ep.invKey || 'item')
                  : _e.kind === 'weapon' ? ((_ep.weapon && _ep.weapon.name) || 'a weapon')
                  : 'a delivery';
                S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-50)), [{
                  id: 'inbox-' + Date.now() + '-' + _ie,
                  name: '',
                  text: '📫 You received ' + _what + (_e.note ? ' (' + _e.note + ')' : ''),
                  ts: Date.now()
                }]);
              }
              if (_inbEntries.length && setChatLog) setChatLog(_toConsumableArray(S.chatLog));
              if (payload && payload.queued) {
                S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-50)), [{
                  id: 'inbox-q-' + Date.now(),
                  name: '',
                  text: '📫 ' + payload.queued + ' more deliveries waiting (weapon stash is full)',
                  ts: Date.now()
                }]);
                if (setChatLog) setChatLog(_toConsumableArray(S.chatLog));
              }
              break;
            }
          case 'server_announce':
            {
              /* v2.3.1150: operator announcement (PRIVILEGED -- only the
                 worker can emit it; riding the un-privileged 'chat'
                 relay would let any client impersonate the server).
                 Sent as a broadcast from /api/admin/announce, and with
                 payload.motd:true on join when a sticky MOTD is set.
                 Pushed BOTH to the chat log (future mail/chat panel)
                 and as an on-screen banner -- the chat log currently
                 has no renderer (pre-existing gap), so the dmgNumbers
                 banner is the visible surface (gear_locked precedent). */
              var _annText = (payload && payload.text) || '';
              if (!_annText) break;
              S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-50)), [{
                id: 'sys-' + Date.now(),
                name: '',
                text: '📢 ' + _annText,
                ts: Date.now()
              }]);
              if (setChatLog) setChatLog(_toConsumableArray(S.chatLog));
              pushDmgPopup(S, S.player.x, S.player.y - 55, '📢 ' + (_annText.length > 60 ? _annText.slice(0, 57) + '…' : _annText), '#f5c542', { ttl: 5 });
              try { BT_AUDIO.beep(660, 0.08, 0.1, 'sine'); } catch (e) {}
              break;
            }
          /* v2.3.1576: Hemi Bro ownership handshake.  Both are SERVER-emitted
             (PRIVILEGED_EVENTS), so a peer cannot forge either one — a forged
             result would paint a badge that was never earned.  The flow lives
             in broWallet.js; this just hands the message over. */
          case 'bro_nonce':
            _onBroNonce(payload);
            break;
          case 'bro_verify_result':
            _onBroResult(payload);
            /* The badge itself comes from the authoritative echo, not from
               here — this only unblocks the UI's spinner. */
            if (payload && payload.ok && S.rpg) S.rpg._bro = payload.tokenId;
            break;

          case 'player_swing':
            {
              if (payload.id && _peerInZone(S, payload.id)) {
                S.others[payload.id]._swingTs = Date.now();
                S.others[payload.id]._swingSpecial = !!payload.special;
                /* v2.3.1011: weapon + angle let the remote render the full
                   sword/greatsword stand-in facing the right way. */
                S.others[payload.id]._swingWpn = payload.wpn || null;
                if (typeof payload.ang === 'number') S.others[payload.id]._swingAng = payload.ang;
                /* v2.3.1107: point the body the same way as the swing. */
                _reconcileFacing(S.others[payload.id], payload.ang);
              }
              break;
            }
          case 'player_projectile':
            {
              /* Another player fired an arrow or staff bolt */
              if (payload.id === S.myId) break;
              /* v2.3.1574: the worst of the cross-zone leaks -- this pushes onto a
                 GLOBAL array the projectile renderer walks without any zone
                 test, so a peer's arrow really did fly across your screen from
                 a zone away.  Every other combat case at least died at the
                 body renderer's own filter. */
              if (!_peerInZone(S, payload.id)) break;
              if (!S._remoteProjectiles) S._remoteProjectiles = [];
              S._remoteProjectiles.push({
                x: payload.x, y: payload.y, ang: payload.ang,
                isStaff: payload.isStaff, isSpecial: !!payload.isSpecial, dist: 14,
                life: payload.isStaff ? 68 : 90, /* v2.3.1335: mirror the -25% range */
                ts: Date.now(), ownerId: payload.id
              });
              /* v2.3.1011: a bow shot (non-staff) drives the remote bow-draw
                 stand-in (Phase 4 reads _bowShotAt/_bowShotAng). */
              if (!payload.isStaff && payload.id && S.others[payload.id]) {
                S.others[payload.id]._bowShotAt = Date.now();
                S.others[payload.id]._bowShotAng = payload.ang;
                /* v2.3.1107: point the body the same way as the bow shot. */
                _reconcileFacing(S.others[payload.id], payload.ang);
              }
              break;
            }
          case 'player_shield':
            {
              if (payload.id && _peerInZone(S, payload.id)) {
                S.others[payload.id]._shieldUp = payload.up;
                S.others[payload.id]._shieldTs = Date.now();
              }
              break;
            }
          case 'player_dodge':
            {
              /* v2.3.1011: another player dodged/lunged/retreated -- mirror the
                 local _dodgeRoll shape so the remote render shows the move. */
              if (payload.id && _peerInZone(S, payload.id)) {
                S.others[payload.id]._dodgeRoll = {
                  angle: payload.angle, kind: payload.kind || 'dodge', startTime: Date.now()
                };
                /* v2.3.1107: dodge/lunge re-point the body along the dash.
                   retreat_shot is EXCLUDED: it dashes away while firing AT
                   the target -- its player_projectile event (which follows
                   immediately) carries the correct shooting facing. */
                if (payload.kind !== 'retreat_shot') {
                  _reconcileFacing(S.others[payload.id], payload.angle);
                }
              }
              break;
            }
          case 'monster_transform':
            {
              /* Server-driven variant transform (currently just
                 mummy -> skeleton at HP <= 50%).  Worker detects the
                 threshold + emits this event for every client in the
                 zone, so every screen plays the shred animation at
                 the same tick.  Replaces the per-client
                 maybeTransformMonster() trigger in entityRenderer.js
                 -- that local path is now gated on !S._serverMonsters
                 (dungeon / SP only). */
              if (!payload || !S.monsters) break;
              var tm = S.monsters.find(function (mm) { return mm.id === payload.id; });
              if (!tm) break;
              var fromV = MONSTER_VARIANTS[payload.fromVariant];
              tm._transformStart = Date.now();
              tm._transformHoldMs = (fromV && fromV.transformHoldMs) || 480;
              tm._transformFromArch = payload.fromVariant;
              tm.archetype = payload.toVariant;
              tm.type = payload.toVariant;
              if (tm.arch !== undefined) tm.arch = payload.toVariant;
              var toV = MONSTER_VARIANTS[payload.toVariant];
              if (toV && toV.spd != null) tm.spd = toV.spd;
              break;
            }
          case 'monster_hit':
            {
              /* A monster was hit — show damage number and hit effects for everyone */
              if (S.monsters) {
                var hitM = S.monsters.find(function(m) { return m.id === payload.monsterId; });
                if (hitM) {
                  /* Update curHp from the server's authoritative hpPct,
                     but DON'T touch hitM.hp — that's the spawn-time
                     max-HP reference the HP bar uses as its denominator.
                     Clobbering it made curHp == hp on every hit, which
                     locked the bar percentage at 100%. */
                  hitM.curHp = Math.round(payload.hpPct * hitM.maxHp);
                  hitM._hitFlash = Date.now();
                  /* v2.3.1124: ice-burst impact flash on snowmen for PEER hits
                     only -- our own hits stamp _impactAt at the local melee/
                     projectile site (with the real weapon size), so stamping
                     here too would double-flash.  Peer weapon is unknown, so
                     default to full size. */
                  if (payload.attackerId !== S.myId && (hitM.archetype || hitM.type) === 'snowman') {
                    hitM._impactAt = Date.now();
                    hitM._impactScale = 1;
                    /* v2.3.1127: peer weapon/facing unknown -> default the eruption
                       plume to "up". Set explicitly so a stale angle from an earlier
                       OWN hit on this snowman doesn't carry over. */
                    hitM._impactAngle = -Math.PI / 2;
                  }
                  /* Show damage number (skip our own — we already show it
                     locally).  Peer numbers go through the smoothing queue so
                     a coalesced burst drips out at a live cadence instead of
                     stacking into a column. */
                  if (payload.attackerId !== S.myId) {
                    enqueuePeerDamage(S, peerDmgKey(payload.monsterId, hitM.x || hitM.renderX, hitM.y || hitM.renderY), {
                      x: hitM.x || hitM.renderX, y: monsterPopupY(hitM, -20),
                      text: '-' + payload.dmg, color: payload.isCrit ? '#fbbf24' : '#ff8888'
                    });
                  } else if (payload.thorns) {
                    /* v2.3.1137: Thorns reflect is SERVER-rolled with no
                       local prediction (unlike swings), so our own thorns
                       hits DO need the popup or the block just silently
                       chips the monster's bar. */
                    pushDmgPopup(S, hitM.x || hitM.renderX, monsterPopupY(hitM, -20), '-' + payload.dmg + ' 🌵', '#a3e635');
                  }
                  /* Hit particles for everyone */
                  for (var hp2 = 0; hp2 < 3; hp2++) {
                    S.hitParticles.push({
                      x: hitM.x || hitM.renderX, y: hitM.y || hitM.renderY,
                      vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                      life: 0.5, color: hitM.color || '#ff5e6c', size: 2
                    });
                  }
                }
              }
              break;
            }
          case 'monster_kill':
            {
              /* A monster was killed — show death effects, award XP if
                 we're a recipient.  Gold no longer auto-adds: it rides
                 on the loot pickup so the player must walk over the
                 coin (matches the SP melee/staff/bow paths). */
              var _amRecipient = payload.recipients && payload.recipients.includes(S.myId);
              var _goldList = payload.goldRecipients || payload.recipients || [];
              var _amGoldRecipient = _amRecipient && _goldList.includes(S.myId);
              var _myShare = (payload.shares && typeof payload.shares[S.myId] === 'number') ? payload.shares[S.myId] : 1;
              var _killVarMult = xpMultFor(S.monsters && S.monsters.find(function(mm) { return mm.id === payload.monsterId; }));
              var _killXpPre = _amRecipient ? Math.max(0, Math.round((payload.xp || 0) * _myShare * _killVarMult)) : 0;
              var _killGoldPre = _amGoldRecipient ? Math.max(0, Math.round((payload.gold || 0) * _myShare)) : 0;
              if (S.monsters) {
                var deadM = S.monsters.find(function(m) { return m.id === payload.monsterId; });
                if (deadM) {
                  /* In server-mode the local m.curHp -= dmg branches are
                     all gated on !S._serverMonsters, so neither melee nor
                     arrow kill code ever fires `if (m.curHp <= 0)` --
                     meaning the local loot push never happens.  Drop the
                     remnant here so fodder + variants leave debris on the
                     ground in MP.  _lootDropped is the canonical
                     "already pushed" flag (cleared on respawn in the
                     tick handler) -- v2.3.17 fix: the previous _wasAlive
                     gate fired false-negative when the tick handler
                     arrived first and set alive=false silently. */
                  /* Mummy -> skeleton on overkill (v2.3.135): MP kill events
                     can arrive before any damage tick, so curHp may still be
                     full client-side. Force curHp to 0 so the transform
                     check fires regardless of the cached HP fraction. */
                  deadM.curHp = 0;
                  maybeTransformMonster(deadM);
                  deadM.alive = false;
                  /* Loot drop: push the pile on every client so two screens
                     show the same drop at the same position.  Each client
                     stores its own per-share coin amount on the pile (coin
                     icon glow stays visible even when coins=0 because the
                     renderer also gates on l.recipients).  The recipients
                     list gates pickup so a non-contributor walking over
                     just gets a "not yours" beep instead of taking the
                     loot.  Position uses the server's kill x/y (payload.x/y)
                     so every screen agrees -- no per-client jitter. */
                  var _lootX = (typeof payload.x === 'number') ? payload.x : (deadM.x || deadM.renderX);
                  var _lootY = (typeof payload.y === 'number') ? payload.y : (deadM.y || deadM.renderY);
                  /* Local loot-pile push.  Skipped when the worker is
                     authoritative for loot (S._serverLoot): in that
                     mode the server emits loot_drop and we receive the
                     pile via the loot_drop case in _processGameEvent
                     above.  This block remains as the fallback for
                     dungeons / SP / zones the worker doesn't model.
                     Death SFX, particles, and XP attribution still run
                     either way (see below). */
                  if (!S._serverLoot) {
                    var _lootId = 'mk-' + payload.monsterId;
                    /* Killer name for the "[X]'s loot" label on non-owner
                       screens.  Fall back to 'Player' if we don't have the
                       other-player entry yet (e.g. they just joined). */
                    var _killerName = (payload.killerId === S.myId)
                      ? (S.myName || 'You')
                      : ((S.others && S.others[payload.killerId] && S.others[payload.killerId].name) || 'Player');
                    if (!deadM._lootDropped && S.groundLoot && isRemnantSkull(deadM.type)) {
                      deadM._lootDropped = true;
                      var _shardB = rollMonsterShard(S.currentZone);
                      S.groundLoot.push({
                        lootId: _lootId,
                        x: _lootX, y: _lootY,
                        coins: _killGoldPre,
                        xp: 0,
                        skull: deadM.type,
                        skullEmoji: '🦴',
                        ts: Date.now(),
                        shard: _shardB,
                        recipients: _goldList,
                        killerName: _killerName,
                      });
                    } else if (!deadM._lootDropped && S.groundLoot) {
                      deadM._lootDropped = true;
                      S.groundLoot.push({
                        lootId: _lootId,
                        x: _lootX, y: _lootY,
                        coins: _killGoldPre,
                        xp: 0,
                        ts: Date.now(),
                        recipients: _goldList,
                        killerName: _killerName,
                      });
                    }
                  }
                  /* Per-archetype death SFX (snowman-death, monster-death
                     fallback; slime fodder is muted via its own splat
                     hook in entityRenderer).  Local hit paths call this
                     too but bail in MP before reaching it -- monster_kill
                     is the only path that knows the kill happened here. */
                  if (!deadM._deathSfxPlayed) {
                    deadM._deathSfxPlayed = true;
                    try { BT_AUDIO.monsterDeath(deadM.archetype || deadM.type); } catch (e) {}
                  }
                  /* Don't clobber deadM.hp — for server monsters it's
                     the spawn-time max-HP reference used by the HP bar
                     denominator.  Zeroing it broke every slime's bar
                     on its 2nd life after respawn. */
                  /* Death particles */
                  for (var dp = 0; dp < 8; dp++) {
                    S.hitParticles.push({
                      x: deadM.x || deadM.renderX, y: deadM.y || deadM.renderY,
                      vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3,
                      life: 1.0, color: deadM.color || '#ff5e6c', size: 3
                    });
                  }
                }
              }
              /* Award XP if we are a recipient.  GDD §7:
                 contribution-weighted split — each recipient gets
                 monster.xp * shares[myId].  Gold is no longer added
                 here; it spawned on the loot drop above and the player
                 must walk over it (pickup logic awards coins + shows
                 the +NG popup in gold w/ coin icon). */
              if (_amRecipient) {
                var R = S.rpg;
                if (R) {
                  var killXp = _killXpPre;
                  if (R._compStats) {
                    R._compStats.monstersKilled = (R._compStats.monstersKilled || 0) + 1;
                  }
                  /* Use-trained T1 split: divide killXp across stats by
                     their relative _buildUse share since the last kill,
                     then reset the tally.  T1 stats are still
                     client-side; T2 (xp/level/unspentT2) is server-
                     authoritative when S._serverMonsters is true. */
                  distributeKillXpToBuild(R, killXp);
                  /* Melee lifesteal — refund 90% of damage this monster
                     dealt to us, but only if we currently have melee equipped. */
                  applyMeleeLifesteal(S, R, deadM);
                  /* "+N XP" popup -- client-predicted from
                     payload.xp * shares[myId] * killVarMult for snappy
                     UX.  The actual R.xp update arrives via
                     player_state shortly after; combat_credit handles
                     the level-up popup + SFX. */
                  pushHudPopup(S, { target: 'xpBar', text: '+' + killXp + ' XP', color: '#60a5fa' });
                  /* Local R.xp += / level-up loop runs only when the
                     worker doesn't own combat XP for this kill (i.e.
                     when _serverMonsters is false -- dungeons / SP).
                     For server monsters, _addCombatXp on the worker
                     applies XP + level-up + 5 unspentT2 per level,
                     then sends combat_credit (popup/SFX) and
                     player_state (authoritative totals). */
                  if (!S._serverMonsters) {
                    R.xp = (R.xp || 0) + killXp;
                    /* A1: combat level is determined PURELY by build
                       points -- 5 BP = 1 level. killXp accumulates on
                       R.xp for the bar UI but no longer gates anything. */
                    while ((R._buildPointsThisLvl || 0) >= 5) {
                      R._buildPointsThisLvl -= 5;
                      R.level++;
                      R.unspentT2 = 0; /* T2 retired — weapon points now come from per-category weapon-skill levels */
                      recalcDerived(R);
                      R.hp = R.maxHp; R.stamina = R.maxStamina; R.mana = R.maxMana;
                      setLevelUpMsg({ kind: 'combat', level: R.level, ts: Date.now() });
                      BT_AUDIO.levelUp();
                    }
                  }
                  setRpgState(_objectSpread({}, R));
                  /* v2.3.1356: debounced — a piercing special one-shotting
                     a pack delivers N monster_kill events back-to-back;
                     the inline full-blob write per event froze the frame
                     (owner report: bow specials vs snowmen).  rpgSave.js. */
                  saveRpgSoon();
                }
              }
              break;
            }
          case 'monster_attack':
            {
              /* Server monster attacked someone */
              if (payload.targetId !== S.myId) {
                /* Remote-player hit feedback: flash their sprite + float a
                   damage number over them so other players' fights read
                   as real, not invisible.  No HP math — server is
                   authoritative on remote HP; this is purely visual.
                   Suppress entirely when the remote is dead: prevents
                   phantom hit-flashes on a corpse while the server
                   hasn't yet stopped its monster AI from targeting
                   them (idle players, slow disconnect detection). */
                var rOther = S.others && S.others[payload.targetId];
                if (rOther && !rOther._isDead) {
                  rOther._hitFlash = Date.now();
                  pushDmgPopup(S, rOther.x || 0, (rOther.y || 0) - 20, '-' + (payload.dmg || 0), '#ff5e6c');
                }
                break;
              }
              var R2 = S.rpg;
              if (!R2 || R2.hp <= 0) break;
              /* ── Out-of-range filter ──
                 The server's monster-attack ranging was firing damage
                 events for monsters the player can't see (off-screen or
                 desynced from the local snapshot), which read as
                 mystery damage with no visible attacker. Drop the event
                 client-side when the attacker isn't a known nearby
                 monster. The server is authoritative on HP, so on the
                 next state_sync any genuine HP delta gets reconciled —
                 this just suppresses the visual "ghost hit" in the
                 normal case. */
              var atkSrc = (payload.monsterId && S.monsters) ? S.monsters.find(function (mm) { return mm.id === payload.monsterId; }) : null;
              /* Drop the event when the attacker isn't in our local
                 monster snapshot — even if the server provided
                 attackerX/Y. If the client doesn't have the monster
                 registered, it can't render the source, so the user
                 sees damage with no visible attacker. The
                 wsClient.js tick handler only UPDATES existing local
                 monsters, so a server-spawned monster the client
                 missed during initial sync stays invisible until a
                 zone change re-syncs. Server doesn't track player HP,
                 so dropping is safe — no desync to reconcile. */
              if (!atkSrc) {
                if (window.__dmgLog) try { console.log('[dmg] net-monster_attack DROPPED (not in snapshot)', { monsterId: payload.monsterId, srvAttackerXY: (typeof payload.attackerX === 'number') ? { x: Math.round(payload.attackerX), y: Math.round(payload.attackerY) } : null }); } catch (e) {}
                break;
              }
              /* Prefer the server's authoritative position (payload.attackerX/Y)
                 over the local snapshot — the server's view is what decided the
                 attack should fire, and the snapshot can lag a few ticks. */
              var _atkX = (typeof payload.attackerX === 'number') ? payload.attackerX : atkSrc.x;
              var _atkY = (typeof payload.attackerY === 'number') ? payload.attackerY : atkSrc.y;
              var _atkDx = _atkX - S.player.x, _atkDy = _atkY - S.player.y;
              var _atkDist = Math.sqrt(_atkDx * _atkDx + _atkDy * _atkDy);
              if (_atkDist > 160) {
                if (window.__dmgLog) try { console.log('[dmg] net-monster_attack DROPPED (out of range)', { monsterId: payload.monsterId, dist: Math.round(_atkDist) }); } catch (e) {}
                break;
              }
              /* Server-side block resolution (v2.3.103+): worker fires
                 monster_attack with blocked:true + staminaDrain when
                 ps.blocking was set at attack time.  Show the "Blocked!"
                 popup, push the floating stamina-cost number, skip the
                 HP-damage path entirely.  Player_state will arrive
                 shortly after to mirror the authoritative stamina value. */
              if (payload.blocked) {
                pushDmgPopup(S, S.player.x, S.player.y - 20, 'Blocked!', '#60a5fa');
                var _staminaDrainBlock = typeof payload.staminaDrain === 'number' ? payload.staminaDrain : 15;
                if (_staminaDrainBlock > 0) {
                  /* stamina yellow; ts+1 stacks it under the Blocked! popup */
                  pushDmgPopup(S, S.player.x + 18, S.player.y - 4, '-' + _staminaDrainBlock, '#facc15', { ts: Date.now() + 1 });
                }
                addBuildUse(R2, 'endurance', 3);
                /* v2.3.1113: DEFENSE LOOP REVIVAL -- awardDefenseXp/
                   trainDefense existed since v2.3.1021 but were never
                   called, so the 6th combat skill could not level and
                   Bulwark/Iron Skin points were unreachable.  Server-
                   confirmed block: prevented damage trains at full rate.
                   v2.3.1140: ±5 valid-threat gate re-enabled (atkSrc.level
                   from the local snapshot) -- the null bypass existed only
                   while every monster was pinned to level 1; zone bands
                   are now unpinned (BALANCE-PLAN §7/BF-1). */
                var _defUpBlk = trainDefense(R2, payload.dmg || 5, 0, atkSrc.level || null, false);
                if (_defUpBlk) pushDmgPopup(S, S.player.x, S.player.y - 34, '🛡️ Defense Lv ' + _defUpBlk.level, '#60a5fa', { ts: Date.now() + 2 });
                break;
              }
              var mDmg = payload.dmg || 5;
              /* Per-variant damage multiplier + range gating.  Server
                 doesn't know about variants, so we apply the local
                 attacker variant's scalars here:
                 - dmgMult: skeleton hits ~4x harder.
                 - noProjectile: server's fodder AI fires ranged
                   slime-orb attacks; the client suppresses the
                   visual via noProjectile, but the server's
                   monster_attack still applies the hit, which the
                   user reads as "invisible projectile".  Drop the
                   damage entirely when a noProjectile attacker is
                   outside melee range so mummies / skeletons can
                   only land melee swings. */
              var _atkArchKey = atkSrc.archetype || atkSrc.type;
              var _atkVariant = MONSTER_VARIANTS[_atkArchKey];
              if (_atkVariant && _atkVariant.noProjectile && _atkDist > 60) {
                if (window.__dmgLog) try { console.log('[dmg] net-monster_attack DROPPED (noProjectile out of melee)', { monsterId: payload.monsterId, dist: Math.round(_atkDist), arch: _atkArchKey }); } catch (e) {}
                break;
              }
              if (_atkVariant && _atkVariant.dmgMult) {
                mDmg = Math.ceil(mDmg * _atkVariant.dmgMult);
              }
              /* Apply player defense.  In MP the worker is the source of
                 truth for HP -- it ran the same formula and pushed the
                 resolved dmgTaken in the event payload.  Prefer that for
                 the popup; fall back to local recompute when serverMonsters
                 isn't set (SP-only mode, local AI). */
              var pDef2 = (R2.endurance || 0) * 0.5 + ((R2.armor ? R2.armor.tierMult : 1) || 1) * 3;
              var dmgTaken2 = (typeof payload.dmgTaken === 'number' && S._serverMonsters)
                ? payload.dmgTaken
                : Math.max(1, mDmg - pDef2 * 0.3);
              /* v2.3.1110: omnidirectional block (owner decision) -- the arc
                 test made this fallback disagree with the server's omni rule. */
              if (S._shieldUp) {
                /* Full block: no damage through.  (Was partial via
                   calcBlockReduction; user request is "the damage gets
                   blocked.")  In MP the server already skipped the
                   attack when ps.blocking was set on the move event,
                   so dmgTaken2 from payload is for non-block hits; but
                   if a stale shield-up arc-test landed here we still
                   want the local block visual. */
                dmgTaken2 = 0;
                R2.stamina = Math.max(0, (R2.stamina || 0) - 15);
                /* Count-based weight: 1 successful block = 3 hits worth
                   of endurance share.  Pairs with hit weight = 1 to
                   match the user's hits-vs-blocks ratio for the
                   Endurance share of killXp. */
                addBuildUse(R2, 'endurance', 3);
                /* v2.3.1113: fallback block trains defense too.
                   v2.3.1140: ±5 gate live (see block above). */
                trainDefense(R2, mDmg, 0, atkSrc.level || null, false);
              }
              /* Check dodge */
              if (S._dodgeRoll) break; /* in i-frames */
              /* HP mutation: worker authoritative in MP.  Don't decrement
                 local R.hp here -- the player_state event that follows
                 monster_attack carries the new authoritative hp.  Keep
                 the SP-only path for client-local monsters. */
              if (!S._serverMonsters) {
                R2.hp = Math.max(0, R2.hp - Math.ceil(dmgTaken2));
              }
              /* v2.3.1113: unblocked hit taken -> defense XP at quarter
                 rate (DEFENSE_XP_TAKEN inside trainDefense).  Runs in MP
                 too -- the damage really landed; only HP echo is deferred
                 to player_state. */
              if (dmgTaken2 > 0) {
                /* v2.3.1140: ±5 gate live (see block above). */
                var _defUpTk = trainDefense(R2, 0, Math.ceil(dmgTaken2), atkSrc.level || null, false);
                if (_defUpTk) pushDmgPopup(S, S.player.x, S.player.y - 34, '🛡️ Defense Lv ' + _defUpTk.level, '#60a5fa', { ts: Date.now() + 2 });
              }
              if (window.__dmgLog) try {
                console.log('[dmg] net-monster_attack', {
                  amt: Math.ceil(dmgTaken2),
                  monsterId: payload.monsterId,
                  /* server-side fields — present means brotown-server is deployed past 582553b */
                  srvAttackerXY: (typeof payload.attackerX === 'number') ? { x: Math.round(payload.attackerX), y: Math.round(payload.attackerY) } : null,
                  srvDeployed: typeof payload.attackerX === 'number',
                  /* local snapshot */
                  localAttacker: atkSrc ? { x: Math.round(atkSrc.x), y: Math.round(atkSrc.y), arch: atkSrc.arch || atkSrc.archetype, alive: atkSrc.alive } : 'NOT_IN_SNAPSHOT',
                  /* what the filter saw */
                  resolvedAtk: { x: Math.round(_atkX), y: Math.round(_atkY) },
                  player: { x: Math.round(S.player.x), y: Math.round(S.player.y) },
                  dist: Math.round(_atkDist),
                  shieldUp: !!S._shieldUp,
                  /* v2.3.1110: arc retired -- block is omnidirectional */
                  inArc: !!S._shieldUp,
                });
              } catch (e) {}
              /* v2.3.248: player sprite hit-flash on MP server-monster
                 hits.  SP paths (lines 7585 / 7653 / 7906 / 7950 / 10919)
                 already set this on local hits; the MP monster_attack
                 handler was missing it, so the renderer's
                 isHit = S._hitFlash && (now - S._hitFlash) < 250
                 check at entityRenderer.js:1943 never tripped and the
                 sprite never flashed red.  Only flash when actual damage
                 lands (block / dodge zero dmgTaken2 → no flash). */
              if (Math.ceil(dmgTaken2) > 0) {
                S._hitFlash = Date.now();
              }
              /* v2.3.110: heart glyph alongside "-N" popup so the
                 loss-of-HP intent reads instantly. */
              pushDmgPopup(S, S.player.x, S.player.y - 20, '-' + Math.ceil(dmgTaken2), '#ff5e6c', { iconKey: 'heart' });
              /* v2.3.1137: Second Wind — the worker healed us right after
                 this hit (defense channel, 10s cooldown); green popup.
                 The authoritative hp arrives via player_state as usual. */
              /* v2.3.1314: Last Stand — the killing blow left us at 1 HP. */
              if (payload.lastStand) {
                pushDmgPopup(S, S.player.x, S.player.y - 52, 'LAST STAND!', '#D8AA58', { ts: Date.now() + 3 });
              }
              if (payload.secondWind > 0) {
                pushDmgPopup(S, S.player.x + 16, S.player.y - 38, '+' + payload.secondWind + ' Second Wind', '#4ade80', { ts: Date.now() + 2 });
              }
              for (var hp3 = 0; hp3 < 4; hp3++) S.hitParticles.push({
                x: S.player.x, y: S.player.y,
                vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                life: 0.6, color: '#ff5e6c', size: 2
              });
              S.screenShake = 3;
              /* v2.3.1598 (owner): the armour clang, not a dead beep.
                 This is the SERVER-AUTHORITATIVE hit path — the one that
                 actually runs, since the game is 100% server-based — and it
                 still called beep(), which has been a no-op since v2.3.1103
                 removed all synthesised audio.  So being hit by a monster has
                 been SILENT ever since.  The real sound existed the whole
                 time: monsterHitHero() picks the metallic armor-hit-1/2 when
                 armoured and falls back to the bare 'monster-hit' thud, and
                 the legacy client-local combat path in monsterCombat.js has
                 called it since v2.3.1108.  Only the network path was missed,
                 and the network path is the only one players hear.
                 vol 0.85 matches the four monsterCombat.js call sites. */
              try { BT_AUDIO.monsterHitHero(isWearingArmor(), { vol: 0.85 }); } catch (e) {}
              /* Death path: in MP the worker fires player_died (which
                 handles the death animation + popup) and player_respawned
                 (which teleports to town) -- both wired in the WS switch
                 above.  Local R2.hp can lag the server by a tick, so we
                 must NOT trigger death from a local <=0 check in MP.
                 Keep the SP path for client-local monsters. */
              if (!S._serverMonsters && R2.hp <= 0 && !S._dying) {
                /* Player death from client-local monster (SP mode) */
                S._dying = true;
                if (!R2._compStats) R2._compStats = createDefaultCompStats();
                R2._compStats.deaths++;
                /* Death-anim timeline starts now; renderer plays the
                   21-frame sequence until respawn clears it. */
                S._deathStart = Date.now();
                /* Tell the server we died now so monster AI stops
                   targeting us during the 5 s respawn window, and
                   broadcast the death so remote clients render a
                   dead pose at our last position. */
                if (S.channel) S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } });
                if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_died_to_monster', payload: { id: S.myId, x: S.player.x, y: S.player.y } });
                /* Gold penalty */
                var goldLost2 = Math.floor(R2.coins * DEATH_GOLD_PENALTY);
                R2.coins = Math.max(0, R2.coins - goldLost2);
                /* Death particles */
                for (var dp2 = 0; dp2 < 25; dp2++) {
                  var dpA2 = dp2 / 25 * Math.PI * 2;
                  S.hitParticles.push({
                    x: S.player.x, y: S.player.y,
                    vx: Math.cos(dpA2) * (2 + Math.random() * 4),
                    vy: Math.sin(dpA2) * (2 + Math.random() * 4) - 1,
                    life: 1.0, color: ['#ff5e6c','#cc2233','#ff8888'][Math.floor(Math.random()*3)], size: 2 + Math.random() * 3
                  });
                }
                S.screenShake = 10;
                pushDmgPopup(S, S.player.x, S.player.y - 40, 'YOU DIED', '#ff5e6c');
                if (goldLost2 > 0) pushDmgPopup(S, S.player.x, S.player.y - 55, '-' + goldLost2 + 'G', '#fbbf24');
                BT_AUDIO.deathBoom();
                /* Respawn in town after delay */
                var respawnDelay = 5000;
                setTimeout(function() {
                  R2.hp = R2.maxHp;
                  R2.stamina = R2.maxStamina;
                  R2.mana = R2.maxMana;
                  S.currentZone = 'town';
                  updateZoneDimensions('town');
                  BT_AUDIO.startZoneAmbient('town');
                  S.map = generateZoneMap('town');
                  S.monsters = []; /* Town has no monsters */
                  S.gatherNodes = []; /* and no harvestable resources -- clear stale entries from the previous zone */
                  S.player.x = 24 * TILE;
                  S.player.y = 24 * TILE;
                  S.respawnTimer = Date.now() + 3000;
                  S._deathStart = 0;
                  S._dying = false;
                  /* Server learns dead=false + new zone via this move;
                     other clients clear our _isDead via the broadcast. */
                  if (S.channel) S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } });
                  if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_respawned', payload: { id: S.myId } });
                  setRpgState(_objectSpread({}, R2));
                  try { localStorage.setItem('bt_rpg', JSON.stringify(R2)); } catch(e) {}
                }, respawnDelay);
              }
              setRpgState(_objectSpread({}, R2));
              break;
            }
          case 'player_hurt_by_monster':
            {
              /* Client-local monster damage report — used in zones that
                 still run client-local AI (e.g. dungeon waves).  For
                 server-authoritative zones the monster_attack handler
                 above already does this; this case covers anything
                 else.  Visual only. */
              if (payload.id === S.myId) break;
              /* v2.3.1574: popup is drawn at THEIR world coords -- from another zone
                 those land at an arbitrary spot on your map. */
              if (!_peerInZone(S, payload.id)) break;
              var hurtOther = S.others && S.others[payload.id];
              if (!hurtOther) break;
              hurtOther._hitFlash = Date.now();
              pushDmgPopup(S, hurtOther.x || 0, (hurtOther.y || 0) - 20, '-' + (payload.dmg || 0), '#ff5e6c');
              break;
            }
          case 'monster_dmg_at':
            {
              /* Client-local monster damage broadcast — used in zones
                 that still run client-local AI.  Server-authoritative
                 zones use monster_hit instead, which the handler above
                 already covers.  Drops own echoes. */
              if (payload.id === S.myId) break;
              /* Client-local peer floater -> smoothing queue (keyed by a
                 coarse position bucket since this carries only x,y). */
              enqueuePeerDamage(S, peerDmgKey(null, payload.x || 0, payload.y || 0), {
                x: payload.x || 0,
                y: (payload.y || 0) - 20,
                text: '-' + (payload.dmg || 0),
                color: payload.isCrit ? '#fbbf24' : '#ff8888'
              });
              break;
            }
          case 'player_died_to_monster':
            {
              /* Remote player died on their client.  Spawn the same
                 red death-burst + skull popup we render locally,
                 anchored to the reported position.  Also set
                 _isDead on the remote entry so we render a death
                 pose and suppress further hit-flash events for them
                 until they broadcast player_respawned (or their next
                 tick payload shows them alive in a new zone).  PvP
                 deaths are handled by pvp_confirmed and aren't
                 double-rendered. */
              if (payload.id === S.myId) break;
              var deadOther = S.others && S.others[payload.id];
              if (deadOther) {
                deadOther._isDead = true;
                deadOther._deathTs = Date.now();
              }
              var dthX = payload.x || 0, dthY = payload.y || 0;
              for (var dpx = 0; dpx < 20; dpx++) {
                var dpAx = dpx / 20 * Math.PI * 2;
                S.hitParticles.push({
                  x: dthX, y: dthY,
                  vx: Math.cos(dpAx) * (2 + Math.random() * 4),
                  vy: Math.sin(dpAx) * (2 + Math.random() * 4) - 1,
                  life: 1.0,
                  color: ['#ff5e6c','#cc2233','#ff8888'][Math.floor(Math.random()*3)],
                  size: 2 + Math.random() * 2
                });
              }
              pushDmgPopup(S, dthX, dthY - 40, 'KO', '#ff5e6c', { ttl: 2.0 });
              break;
            }
          case 'player_respawned':
            {
              /* Remote player respawned — clear the death visual.  We
                 also tolerate the tick-arrival ordering case where the
                 remote's move msg (with the new town position) arrives
                 first; the renderer simply reads _isDead each frame, so
                 clearing it here is sufficient. */
              if (payload.id === S.myId) break;
              var resOther = S.others && S.others[payload.id];
              if (resOther) {
                resOther._isDead = false;
                resOther._deathTs = 0;
              }
              break;
            }
          /* mkt_order removed — marketplace uses server API now */
          case 'clan_invite':
            {
              /* v2.3.1125: incoming invites used to have NO handler --
                 joining a clan was impossible.  Park the invite; the
                 Clan panel's no-clan view renders the accept button
                 (sends clan_join_accept, validated server-side). */
              if (payload.target === S.myId && !S._clanData) {
                S._pendingClanInvite = {
                  inviter: payload.from,
                  fromName: payload.fromName || 'Someone',
                  clanName: payload.clanName || '',
                  clanTag: payload.clanTag || '?',
                  ts: Date.now()
                };
                pushDmgPopup(S, S.player.x, S.player.y - 40, '[' + S._pendingClanInvite.clanTag + '] clan invite! (open Clans)', '#a78bfa');
                BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
              }
              break;
            }
          case 'clan_state':
            {
              /* v2.3.1125: the server's clan registry echo -- cache it
                 where the panel reads (S._clanData) and where the boot
                 path caches (bt_clan).  null = not in a clan. */
              S._clanData = payload.clan || null;
              try {
                if (payload.clan) localStorage.setItem('bt_clan', JSON.stringify(payload.clan));
                else localStorage.removeItem('bt_clan');
              } catch (e) {}
              /* v2.3.1611: ...and into REACT state, which is what the UI
                 actually renders from.  Every clan surface reads the
                 `clanData` prop, and setClanData was called from exactly two
                 places: the mount-time bt_clan restore, and ClanPanel's
                 LEGACY local-mint create path.  Against a real (caps.clans)
                 worker the create path returns early after sending
                 clan_create, so this echo was the only thing that could
                 update the UI — and it didn't.  Founding a clan therefore
                 charged the 500g, created the clan server-side, and left the
                 screen insisting you had no clan: the panel still offered
                 "Create Clan (500g)", and the inspect card's
                 "Invite to [TAG]" button — gated on clanData — never
                 appeared, so a founder could not invite anyone.  Only a page
                 reload (which reads bt_clan) fixed it.  The same echo lands a
                 JOIN, so an accepted invite was equally invisible.
                 Found by the headless clan scenario (tools/qa/mp): the clan
                 existed in S._clanData with the fee debited, while the UI
                 offered no way to act on it. */
              if (setClanData) setClanData(payload.clan || null);
              break;
            }
          case 'clan_error':
            {
              if (payload && payload.text) pushDmgPopup(S, S.player.x, S.player.y - 30, payload.text, '#ff5e6c');
              break;
            }
          case 'clan_war_declare':
            {
              /* Another clan declared war — check if we're the target */
              var war = payload.war;
              if (!war || !S._clanData) break;
              if (war.defender.tag === S._clanData.tag) {
                var _ZONES$war$zone;
                /* We're being challenged! */
                S._activeClanWar = war;
                war.defender.members.push(S.myId);
                pushDmgPopup(S, S.player.x, S.player.y - 40, '[' + war.challenger.tag + '] declared WAR!', '#ff5e6c');
                pushDmgPopup(S, S.player.x, S.player.y - 25, 'Battle zone: ' + (((_ZONES$war$zone = ZONES[war.zone]) === null || _ZONES$war$zone === void 0 ? void 0 : _ZONES$war$zone.name) || war.zone), 'rgba(255,255,255,.5)');
                BT_AUDIO.beep(200, 0.2, 0.25, 'sawtooth');
                S.screenShake = 6;
              } else if (war.challenger.tag === S._clanData.tag) {
                /* We're in the challenger clan — join the war */
                if (!S._activeClanWar) S._activeClanWar = war;
                S._activeClanWar.challenger.members.push(S.myId);
              }
              break;
            }
          case 'clan_war_kill':
            {
              /* A kill happened in the war zone */
              if (!S._activeClanWar) break;
              var _war = S._activeClanWar;
              if (payload.warId !== _war.id) break;
              _war.killLog.push(payload.kill);
              if (payload.scoreSide === 'challenger') _war.challenger.score += payload.kill.points;else if (payload.scoreSide === 'defender') _war.defender.score += payload.kill.points;
              pushDmgPopup(S, S.player.x, S.player.y - 50, payload.kill.killer + ' -> ' + payload.kill.victim, 'rgba(255,255,255,.4)');
              break;
            }
          case 'clan_war_end':
            {
              if (!S._activeClanWar || payload.warId !== S._activeClanWar.id) break;
              S._activeClanWar.status = 'ended';
              S._activeClanWar.winner = payload.winner;
              var isWinner = S._clanData && payload.winner === S._clanData.tag;
              var reward = isWinner ? CLAN_WAR_REWARDS.winner : CLAN_WAR_REWARDS.loser;
              /* v2.3.1125: clan-capable workers pay war rewards
                 server-side via the mail/escrow plumbing (gold arrives
                 through inbox_delivered + the player_state echo) -- the
                 local mint below was the other half of the forgeable
                 peer war.  Legacy workers only. */
              if (!(S._serverCaps && S._serverCaps.clans) && S.rpg) {
                S.rpg.coins += reward.gold;
                S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + reward.ap;
                if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += reward.gold;
              }
              pushDmgPopup(S, S.player.x, S.player.y - 50, isWinner ? 'WAR WON!' : 'War lost...', isWinner ? '#f5c542' : '#ff5e6c');
              pushDmgPopup(S, S.player.x, S.player.y - 35, '+' + reward.gold + 'G +' + reward.ap + 'AP', '#f5c542');
              if (isWinner) BT_AUDIO.levelUp();else BT_AUDIO.beep(150, 0.1, 0.15, 'triangle');
              setTimeout(function () {
                S._activeClanWar = null;
              }, 10000); /* clear after 10s */
              break;
            }
          case 'arena_bet':
            /* v2.3.1176: relayed spectator bets are deliberately
               IGNORED.  History: this switch carried TWO 'arena_bet'
               cases; the first (dead code -- it keyed on bettorId,
               which only one of the send sites carries, and fed an
               unread S._remoteBets array) shadowed this one, so no
               remote bet ever reached the UI.  Un-shadowing the old
               setArenaBets handler here was tried and is UNSAFE: the
               arenaBets consumers in PartyPanel predate remote
               delivery -- the Active Bets renderer crashes on
               bettorId-shaped bets (b.playerId.slice of undefined),
               'Your Bets' filters by tournament only (others' bets
               would render as yours), the sender's own server echo
               isn't filtered (double-count), and on legacy workers
               (!caps.sponsor) the local pot-split mint would count
               forged remote amounts straight into S.rpg.coins.  Real
               stakes settle server-side via arena_sponsor
               (docs/specs/sponsorship.md); a spectator stake board
               needs a server-owned validated feed (handoff item A).
               Until then this relay is display-noise: drop it. */
            break;
          case 'stunned':
            {
              if (payload.target === S.myId) S._stunEnd = Date.now() + (payload.duration || 2000);
              break;
            }
          case 'trade_offer':
            {
              if (payload.target === S.myId) setIncomingTrade({
                from: payload.from,
                fromName: payload.fromName,
                offer: payload.offer,
                ts: Date.now()
              });
              break;
            }
          case 'trade_accept':
            {
              if (payload.target === S.myId) {
                var _R = S.rpg;
                if (!_R) break;
                /* v2.3.1119: this is the SENDER hearing their offer was
                   accepted.  The old mint below was the other half of
                   the trade duplication engine -- the GIVER credited
                   themselves the goods they just gave away (it also
                   read a shape that trade offers never had, offer.coins
                   / offer.items vs the real {itemKey: qty, _gold}).
                   Settlement-aware workers annotate the relay with
                   settled:true and have already debited us server-side;
                   the legacy mint stays only for old workers. */
                if (!payload.settled) {
                  var offer = payload.offer || {};
                  if (offer.coins) _R.coins = (_R.coins || 0) + offer.coins;
                  if (offer.items && _R.inventory) Object.entries(offer.items).forEach(function (_ref10) {
                    var _ref11 = _slicedToArray(_ref10, 2),
                      k = _ref11[0],
                      v = _ref11[1];
                    _R.inventory[k] = (_R.inventory[k] || 0) + v;
                  });
                }
                pushDmgPopup(S, S.player.x, S.player.y - 40, 'Trade complete!', '#3dd497');
                BT_AUDIO.collect();
                setRpgState(_objectSpread({}, _R));
              }
              break;
            }
          case 'trade_reject':
            {
              if (payload.target === S.myId) {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Trade declined', '#ff5e6c');
                BT_AUDIO.beep(200, 0.05, 0.08, 'square');
              }
              break;
            }
          case 'pvp_hit':
            {
              var _R2$armor, _R2$_shieldBonus;
              // §16.12 — Server-authoritative PvP hit (lag-compensated)
              // Server already decided this is a hit. Defender applies own defense calc.
              if (payload.target !== S.myId) {
                // Not targeted at us — if we're the attacker, show hit confirmation
                if (payload.attacker === S.myId) {
                  /* v2.3.1605 (owner: "all it says is hit when I hit the other
                     player ... needs to actually show HP damage numbers").
                     This used to float the literal word "Hit!" over the
                     ATTACKER'S OWN HEAD — the wrong text in the wrong place.
                     The server has always sent the resolved dmgTaken on this
                     payload (combat.js builds it); nothing read it on the
                     attacker's side.  Now the real number floats over the
                     TARGET, matching how PvE damage reads, with crit and the
                     block/dodge outcomes distinguished. */
                  var _pvTgt = S.others && S.others[payload.target];
                  var _pvX = _pvTgt ? (_pvTgt.x != null ? _pvTgt.x : _pvTgt.renderX) : S.player.x + 20;
                  var _pvY = (_pvTgt ? (_pvTgt.y != null ? _pvTgt.y : _pvTgt.renderY) : S.player.y) - 30;
                  if (payload.dodged) {
                    pushDmgPopup(S, _pvX, _pvY, 'Dodged', '#9ca3af');
                  } else if (payload.blocked) {
                    pushDmgPopup(S, _pvX, _pvY, 'Blocked', '#607D8B');
                  } else if (typeof payload.dmgTaken === 'number') {
                    pushDmgPopup(S, _pvX, _pvY,
                      '-' + Math.ceil(payload.dmgTaken) + (payload.isCrit ? '!' : ''),
                      payload.isCrit ? '#f5c542' : '#ff5e6c');
                  }
                  /* Flash the opponent so a hit reads even off-centre, the same
                     feedback a monster gets. */
                  if (_pvTgt && !_pvTgt._isDead) _pvTgt._hitFlash = Date.now();
                }
                break;
              }
              var _R2 = S.rpg;
              if (!_R2) break;
              var pDef = _R2.endurance * 0.5 + (((_R2$armor = _R2.armor) === null || _R2$armor === void 0 ? void 0 : _R2$armor.tierMult) || 1) * 3 + (((_R2$_shieldBonus = _R2._shieldBonus) === null || _R2$_shieldBonus === void 0 ? void 0 : _R2$_shieldBonus.blockFlat) || 0);
              var rawDmg = payload.dmgBase || 10;
              var dmgTaken = Math.max(1, rawDmg - pDef * 0.3);
              // §16.12 — Server already resolved block via historical state
              if (payload.blocked) dmgTaken = Math.ceil(dmgTaken * 0.25);
              if (payload.isCrit) dmgTaken = Math.ceil(dmgTaken * 1.5);
              /* Prefer the server's resolved dmgTaken when present
                 (worker now applies HP damage and the value rides on
                 the payload).  Falls back to local recompute if a peer
                 hasn't deployed the new worker yet. */
              if (typeof payload.dmgTaken === 'number') dmgTaken = payload.dmgTaken;
              /* Worker authoritative HP store: don't mutate R2.hp here.
                 The player_state event that follows pvp_hit carries the
                 new authoritative value.  Death is driven by the server's
                 player_died event. */
              if (window.__dmgLog) try { console.log('[dmg] net-pvp_hit', { amt: Math.ceil(dmgTaken), attacker: payload.attacker, blocked: payload.blocked }); } catch (e) {}
              pushDmgPopup(S, S.player.x, S.player.y - 20, '-' + Math.ceil(dmgTaken), payload.blocked ? '#607D8B' : '#ff5e6c');
              /* v2.3.1137: Second Wind fires in PvP too (see server
                 _applyDamage); mirror the green heal popup here. */
              /* v2.3.1314: Last Stand — the killing blow left us at 1 HP. */
              if (payload.lastStand) {
                pushDmgPopup(S, S.player.x, S.player.y - 52, 'LAST STAND!', '#D8AA58', { ts: Date.now() + 3 });
              }
              if (payload.secondWind > 0) {
                pushDmgPopup(S, S.player.x + 16, S.player.y - 38, '+' + payload.secondWind + ' Second Wind', '#4ade80', { ts: Date.now() + 2 });
              }
              if (payload.blocked) pushDmgPopup(S, S.player.x, S.player.y - 35, 'BLOCKED', '#607D8B');
              for (var hp2 = 0; hp2 < 6; hp2++) S.hitParticles.push({
                x: S.player.x,
                y: S.player.y,
                vx: (Math.random() - .5) * 4,
                vy: -1 - Math.random() * 2,
                life: 0.8,
                color: '#ff5e6c',
                size: 2
              });
              S.screenShake = payload.blocked ? 2 : 4;
              /* v2.3.1605: real hit sound, not the beep() that has been a no-op
                 since v2.3.1103 — the same dead call the monster hit carried
                 until v2.3.1598.  Being hit by a PLAYER was silent for the same
                 reason and is fixed the same way. */
              try { BT_AUDIO.monsterHitHero(isWearingArmor(), { vol: 0.85 }); } catch (e) {}
              /* Predict "Killed by X" popup from the (server-resolved
                 or locally-computed) dmgTaken vs current local hp.  HP
                 doesn't mutate locally in MP anymore, so checking
                 _R2.hp <= 0 directly would never fire.  The server-side
                 player_died event drives the death animation; this
                 attribution popup is best-effort. */
              /* v2.3.1306: prefer the server's authoritative died flag —
                 the local-hp prediction reads STALE hp when several
                 pvp_hits land before one player_state flush (staff heavy
                 = 3 bolts/cast), under-counting real kills and minting
                 phantom ones when Second Wind saved the target. */
              var _wouldDiePvp = typeof payload.died === 'boolean'
                ? payload.died
                : (_R2.hp - Math.ceil(dmgTaken)) <= 0;
              if (_wouldDiePvp) {
                pushDmgPopup(S, S.player.x, S.player.y - 45, 'Killed by ' + (payload.attackerName || '???'), '#ff5e6c');
                BT_AUDIO.deathBoom();
              }
              // Send pvp_confirmed back for kill tracking, clan wars, arena
              if (S.channel) S.channel.send({
                type: 'broadcast',
                event: 'pvp_confirmed',
                payload: {
                  target: payload.attacker,
                  from: S.myId,
                  dmg: dmgTaken,
                  isCrit: payload.isCrit,
                  died: _wouldDiePvp,
                  name: S.myName,
                  blocked: payload.blocked
                }
              });
              setRpgState(_objectSpread({}, _R2));
              break;
            }
          case 'player_attack':
            {
              var _S$_activeDuel, _ZONES$S$currentZone, _ZONES$S$currentZone2, _R3$armor, _R3$_shieldBonus;
              if (payload.target !== S.myId) break;
              var _R3 = S.rpg;
              if (!_R3) break;
              var isInDuel = ((_S$_activeDuel = S._activeDuel) === null || _S$_activeDuel === void 0 ? void 0 : _S$_activeDuel.partnerId) === payload.id;
              var isLawless = (_ZONES$S$currentZone = ZONES[S.currentZone]) === null || _ZONES$S$currentZone === void 0 ? void 0 : _ZONES$S$currentZone.lawless;
              if (!isInDuel && !isLawless && (_ZONES$S$currentZone2 = ZONES[S.currentZone]) !== null && _ZONES$S$currentZone2 !== void 0 && _ZONES$S$currentZone2.safe) {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Safe zone!', '#3dd497');
                break;
              }
              var _pDef = _R3.endurance * 0.5 + (((_R3$armor = _R3.armor) === null || _R3$armor === void 0 ? void 0 : _R3$armor.tierMult) || 1) * 3 + (((_R3$_shieldBonus = _R3._shieldBonus) === null || _R3$_shieldBonus === void 0 ? void 0 : _R3$_shieldBonus.blockFlat) || 0);
              var _rawDmg = payload.dmg || 10;
              var _dmgTaken = Math.max(1, _rawDmg - _pDef * 0.3);
              var isCrit = payload.isCrit;
              if (isCrit) _dmgTaken = Math.ceil(_dmgTaken * 1.5);
              /* Worker authoritative HP store: don't mutate R3.hp here.
                 The player_state event that follows player_attack carries
                 the new authoritative value.  Death is driven by the
                 server's player_died event. */
              if (window.__dmgLog) try { console.log('[dmg] net-player_attack', { amt: Math.ceil(_dmgTaken), attacker: payload.id, isCrit: isCrit }); } catch (e) {}
              pushDmgPopup(S, S.player.x, S.player.y - 20, '-' + Math.ceil(_dmgTaken), '#ff5e6c');
              for (var _hp = 0; _hp < 6; _hp++) S.hitParticles.push({
                x: S.player.x,
                y: S.player.y,
                vx: (Math.random() - .5) * 4,
                vy: -1 - Math.random() * 2,
                life: 0.8,
                color: '#ff5e6c',
                size: 2
              });
              S.screenShake = 4;
              BT_AUDIO.beep(200, 0.1, 0.15, 'sawtooth');
              if (S.channel) S.channel.send({
                type: 'broadcast',
                event: 'stunned',
                payload: {
                  target: payload.id,
                  duration: 2000
                }
              });
              /* Predict "Killed by X" popup from predicted dmg vs current
                 local hp (worker-authoritative store means _R3.hp won't
                 reflect the hit until player_state arrives). */
              var _wouldDieAtk = (_R3.hp - Math.ceil(_dmgTaken)) <= 0;
              if (_wouldDieAtk) {
                pushDmgPopup(S, S.player.x, S.player.y - 45, 'Killed by ' + payload.name, '#ff5e6c');
                BT_AUDIO.deathBoom();
              }
              if (S.channel) S.channel.send({
                type: 'broadcast',
                event: 'pvp_confirmed',
                payload: {
                  target: payload.id,
                  from: S.myId,
                  dmg: _dmgTaken,
                  isCrit: isCrit,
                  died: _wouldDieAtk
                }
              });
              setRpgState(_objectSpread({}, _R3));
              break;
            }
          case 'pvp_confirmed':
            {
              if (payload.target !== S.myId) break;
              pushDmgPopup(S, S.player.x + 20, S.player.y - 20, 'Hit! -' + Math.ceil(payload.dmg), '#fbbf24');
              if (payload.died) {
                pushDmgPopup(S, S.player.x, S.player.y - 50, 'KILL!', '#3dd497');
                BT_AUDIO.collect();
                if (!S.rpg._compStats) S.rpg._compStats = createDefaultCompStats();
                S.rpg._compStats.pvpKills++;
                /* §CW — Score clan war kill.  v2.3.1125: clan-capable
                   workers referee wars themselves (the server observes
                   its own pvp deaths and emits clan_war_kill) -- this
                   self-scoring block was half of the forgeable peer war
                   and runs only against legacy workers. */
                if (!(S._serverCaps && S._serverCaps.clans) && S._activeClanWar && S._activeClanWar.status === 'active' && S.currentZone === S._activeClanWar.zone) {
                  var _S$_clanData, _S$rpg4;
                  var _war2 = S._activeClanWar;
                  var isChallenger = ((_S$_clanData = S._clanData) === null || _S$_clanData === void 0 ? void 0 : _S$_clanData.tag) === _war2.challenger.tag;
                  var points = 1 + Math.floor((((_S$rpg4 = S.rpg) === null || _S$rpg4 === void 0 ? void 0 : _S$rpg4.level) || 1) / 20); /* higher level = more points */
                  var kill = {
                    killer: S.myName,
                    victim: payload.name || '???',
                    ts: Date.now(),
                    points: points
                  };
                  _war2.killLog.push(kill);
                  if (isChallenger) _war2.challenger.score += points;else _war2.defender.score += points;
                  if (S.channel) S.channel.send({
                    type: 'broadcast',
                    event: 'clan_war_kill',
                    payload: {
                      warId: _war2.id,
                      kill: kill,
                      scoreSide: isChallenger ? 'challenger' : 'defender'
                    }
                  });
                  pushDmgPopup(S, S.player.x, S.player.y - 65, '+' + points + ' war points!', '#ff5e6c');
                }
                /* §ARENA — Report arena match result if this was an arena fight.
                   v2.3.1126: refereeing workers (caps.arena) observe match
                   outcomes from their own duel resolution -- the client-claimed
                   winnerId POST below was the collusion hole (two clients could
                   trade fake wins), and the win/champion self-credit was
                   phantom.  Legacy workers only; the new flow renders from the
                   privileged arena_match_result / arena_tournament_complete
                   events instead. */
                if (!(S._serverCaps && S._serverCaps.arena) && S._arenaMatch && (payload.from === S._arenaMatch.p1 || payload.from === S._arenaMatch.p2)) {
                  var match = S._arenaMatch;
                  var loserId = payload.from; /* the person who sent pvp_confirmed with died=true is confirming WE killed THEM */
                  /* Actually: pvp_confirmed target=us, from=attacker. If died=true, the attacker got a kill confirmation.
                     So WE are the killer (target got confirmed as the killer) */
                  fetch(BT_API_BASE + '/api/arena/result', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      tournamentId: S._arenaTournamentId,
                      matchId: match.id,
                      winnerId: S.myId,
                      loserId: match.p1 === S.myId ? match.p2 : match.p1
                    })
                  }).then(function (r) {
                    return r.json();
                  }).then(function (d) {
                    if (d.ok) {
                      var _d$champion;
                      S._arenaMatch = null;
                      if (d.tournamentComplete && ((_d$champion = d.champion) === null || _d$champion === void 0 ? void 0 : _d$champion.id) === S.myId) {
                        /* WE ARE THE CHAMPION */
                        S.rpg.coins += ARENA_CHAMPION_REWARD.gold;
                        S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + ARENA_CHAMPION_REWARD.ap;
                        if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += ARENA_CHAMPION_REWARD.gold;
                        if (!S.rpg._titles) S.rpg._titles = [];
                        if (!S.rpg._titles.includes('Gladiator')) S.rpg._titles.push('Gladiator');
                        pushDmgPopup(S, S.player.x, S.player.y - 80, 'GLADIATOR CHAMPION!', '#f5c542');
                        pushDmgPopup(S, S.player.x, S.player.y - 65, '+' + ARENA_CHAMPION_REWARD.gold + 'G +' + ARENA_CHAMPION_REWARD.ap + 'AP', '#f5c542');
                        BT_AUDIO.levelUp();
                        S.screenShake = 10;
                      } else {
                        var _d$tournament;
                        S.rpg.coins += ARENA_WIN_REWARD.gold;
                        S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + ARENA_WIN_REWARD.ap;
                        pushDmgPopup(S, S.player.x, S.player.y - 80, 'Arena win! Round ' + ((_d$tournament = d.tournament) === null || _d$tournament === void 0 ? void 0 : _d$tournament.round), '#3dd497');
                      }
                      setRpgState(_objectSpread({}, S.rpg));
                      try {
                        localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                      } catch (_unused10) {}
                      if (d.tournament) setArenaTournament(d.tournament);
                    }
                  }).catch(function () {});
                }
              }
              break;
            }
          case 'arena_match_start':
            {
              /* v2.3.1126: the referee paired us -- server-observed
                 arena flow (spec: docs/specs/arena.md).  Damage works
                 via the duel consent pair; healing is server-gated. */
              pushDmgPopup(S, S.player.x, S.player.y - 50, '⚔️ ARENA R' + (payload.round || 1) + ': fight ' + (payload.opponentName || '???') + '!', '#f5c542');
              BT_AUDIO.beep(300, 0.15, 0.2, 'sawtooth');
              S.screenShake = 5;
              break;
            }
          case 'arena_match_result':
            {
              if (payload.winner === S.myId) {
                pushDmgPopup(S, S.player.x, S.player.y - 60, 'Arena win! (' + (payload.how || 'kill') + ')', '#3dd497');
                BT_AUDIO.collect();
              } else if (payload.loser === S.myId) {
                pushDmgPopup(S, S.player.x, S.player.y - 60, 'Eliminated from the arena', '#ff5e6c');
              }
              break;
            }
          case 'arena_tournament_complete':
            {
              /* v2.3.1210: the tournament is over -- clear the spectator
                 stake board so a stale board doesn't linger into the
                 gap before the next tournament. */
              S._arenaStakeBoard = [];
              var _champ = payload.champion || {};
              if (_champ.playerId === S.myId && S.rpg) {
                /* Gold arrives via _creditPlayer (player_state echo /
                   mail).  The title stays client-granted for now --
                   titles aren't server-owned yet (handoff backlog). */
                if (!S.rpg._titles) S.rpg._titles = [];
                if (!S.rpg._titles.includes('Gladiator')) S.rpg._titles.push('Gladiator');
                pushDmgPopup(S, S.player.x, S.player.y - 80, 'GLADIATOR CHAMPION!', '#f5c542');
                BT_AUDIO.levelUp();
                S.screenShake = 10;
                setRpgState(_objectSpread({}, S.rpg));
              } else if (_champ.playerName) {
                pushDmgPopup(S, S.player.x, S.player.y - 50, '🏆 ' + _champ.playerName + ' is the Gladiator champion!', '#f5c542');
              }
              break;
            }
          case 'duel_request':
            {
              if (payload.target === S.myId) setDuelRequest({
                fromId: payload.from,
                fromName: payload.fromName,
                ts: Date.now()
              });
              break;
            }
          case 'duel_accept':
            {
              if (payload.target === S.myId) {
                S._activeDuel = {
                  partnerId: payload.from,
                  startTs: Date.now()
                };
                /* v2.3.1306: the CHALLENGER never got S._inDuel — only the
                   accepter sets it (DuelRequestPanel).  Both PvP attack
                   gates key on it (monsterCombat melee, projectiles
                   ranged/staff), so the challenging side only landed hits
                   while tap-locked: the owner's "only melee hurt" duel
                   report was half challenger-side gating.  Mirror the
                   accepter's shape; duel_end clears both fields already. */
                S._inDuel = {
                  opponent: payload.from,
                  opponentName: payload.fromName || '',
                  wager: payload.wager || 0,
                  startTime: Date.now()
                };
                pushDmgPopup(S, S.player.x, S.player.y - 40, 'DUEL STARTED!', '#fbbf24');
              }
              break;
            }
          case 'duel_end':
            {
              /* v2.3.1121: server duel resolution (kill / death /
                 forfeit).  The pot (if any) was settled server-side --
                 winner's gold arrives via player_state echo or mail.
                 This just closes out the local duel state + tells the
                 participants how it ended. */
              if (payload.winner === S.myId || payload.loser === S.myId) {
                var _won = payload.winner === S.myId;
                S._activeDuel = null;
                S._inDuel = null;
                pushDmgPopup(S, S.player.x, S.player.y - 40, _won ? ('DUEL WON!' + (payload.wager ? ' +' + payload.wager * 2 + 'g' : '')) : (payload.how === 'forfeit' ? 'Duel forfeited' : 'Duel lost' + (payload.wager ? ' -' + payload.wager + 'g' : '')), _won ? '#f5c542' : '#ff5e6c');
                if (_won) BT_AUDIO.levelUp();else BT_AUDIO.beep(180, 0.1, 0.15, 'triangle');
              }
              break;
            }
          case 'duel_decline':
            {
              if (payload.target === S.myId) pushDmgPopup(S, S.player.x, S.player.y - 30, 'Duel declined', '#888');
              break;
            }
          case 'pvp_threat':
            {
              if (payload.target === S.myId) {
                setThreatIncoming({
                  fromId: payload.from,
                  fromName: payload.fromName,
                  fromLevel: payload.fromLevel,
                  ts: Date.now(),
                  /* v2.3.1129: the panel does MILLISECOND math on this
                     value.  Settlement-aware workers stamp the
                     authoritative countdown in ms; the old default of
                     `120` (seconds) rendered a ~0.12s bar. */
                  countdown: payload.countdown || 120000,
                  responded: false
                });
                BT_AUDIO.beep(300, 0.1, 0.15, 'square');
                setTimeout(function () {
                  return BT_AUDIO.beep(200, 0.08, 0.12, 'square');
                }, 150);
              }
              /* v2.3.1193: skull state for EVERY receiver — the relay is
                 room-wide, matching the panel copy ("red 💀 above their
                 head" that anyone can see).  Red over the threatener
                 while the countdown runs; the renderer flips a lapsed
                 red mark white for the consent window (expiry == ignore
                 is the server's own semantics, _tickThreats). */
              {
                var _thFrom = payload.from || payload.id;
                var _thUntil = Date.now() + (payload.countdown || 120000);
                if (_thFrom === S.myId) {
                  /* Echo of my own threat — replace InspectPlayerPanel's
                     optimistic base-countdown anchor with the server's
                     authoritative (level-scaled) one. */
                  S._pvpSkullType = 'red';
                  S._pvpSkullUntil = _thUntil;
                  if (S.rpg) S.rpg._threatState = { target: payload.target, ts: Date.now(), type: 'red', expires: _thUntil };
                } else {
                  _setThreatMark(S, _thFrom, 'red', _thUntil);
                }
              }
              break;
            }
          case 'threat_response':
            {
              /* v2.3.1129: read `action` -- the field the panel has
                 ALWAYS sent.  The old `payload.accepted` branch was
                 dead (nothing ever set it), so every response showed
                 "They fled!".  Guard-fine details arrive separately
                 via the private threat_penalty event. */
              if (payload.target === S.myId) {
                if (payload.action === 'guards') pushDmgPopup(S, S.player.x, S.player.y - 40, 'They called the guards!', '#ff5e6c');else pushDmgPopup(S, S.player.x, S.player.y - 40, 'Threat ignored — they can fight back!', '#fbbf24');
              }
              /* v2.3.1193: skull transitions for EVERY receiver.
                 payload.target is the original THREATENER: guards clears
                 their skull (no consent granted), ignore turns it white
                 for the fight window.  Forged/expired responses are
                 dropped server-side, so a relayed response is truth. */
              if (payload.target === S.myId) {
                if (payload.action === 'guards') {
                  S._pvpSkullType = null;
                  S._pvpSkullUntil = 0;
                  if (S.rpg) S.rpg._threatState = null;
                } else {
                  S._pvpSkullType = 'white';
                  S._pvpSkullUntil = Date.now() + PVP_THREAT_CONSENT_MS;
                  if (S.rpg) S.rpg._threatState = { target: payload.from || payload.id, ts: Date.now(), type: 'white', expires: S._pvpSkullUntil };
                }
              } else if (payload.target) {
                if (payload.action === 'guards') {
                  if (S._threatMarks) delete S._threatMarks[payload.target];
                } else {
                  _setThreatMark(S, payload.target, 'white', Date.now() + PVP_THREAT_CONSENT_MS);
                }
              }
              break;
            }
          case 'threat_penalty':
            {
              /* v2.3.1129: private guard-fine notice to the threatener.
                 The coins already moved server-side (authoritative
                 player_state echo); this drives the feedback only. */
              if (!payload) break;
              if (payload.levy > 0) pushDmgPopup(S, S.player.x, S.player.y - 55, '-' + payload.levy + 'G guard fine!', '#ff5e6c');
              pushDmgPopup(S, S.player.x, S.player.y - 40, 'Gear locked 30m by the guards!', '#ff5e6c');
              BT_AUDIO.beep(150, 0.15, 0.2, 'sawtooth');
              /* v2.3.1193: guards were called on me — drop my own red
                 skull.  The threat_response guards branch above does the
                 same via the relay; this private event is the guaranteed
                 copy (it only exists when the levy/lock really landed). */
              S._pvpSkullType = null;
              S._pvpSkullUntil = 0;
              if (S.rpg) S.rpg._threatState = null;
              break;
            }
          case 'threat_expired':
            {
              /* v2.3.1129: an unanswered threat countdown ran out --
                 the pair may fight (same as an ignore). */
              pushDmgPopup(S, S.player.x, S.player.y - 40, 'Threat expired — fight is on!', '#fbbf24');
              /* v2.3.1193: expiry == ignore, so skulls go WHITE for the
                 fight window.  This event is private to the pair:
                 payload.from set => I'm the target (whiten THEIR mark);
                 payload.target set => I'm the threatener (whiten MINE).
                 Bystanders never get it — their red mark self-whitens in
                 the renderer when the countdown lapses. */
              {
                var _thWhiteUntil = Date.now() + PVP_THREAT_CONSENT_MS;
                if (payload && payload.from) _setThreatMark(S, payload.from, 'white', _thWhiteUntil);
                if (payload && payload.target) {
                  S._pvpSkullType = 'white';
                  S._pvpSkullUntil = _thWhiteUntil;
                  if (S.rpg) S.rpg._threatState = { target: payload.target, ts: Date.now(), type: 'white', expires: _thWhiteUntil };
                }
              }
              break;
            }
          case 'trade2_invite':
            {
              /* v2.3.1132: someone opened a two-sided trade toward us.
                 Park the invite stub; TradeWindowPanel renders the
                 accept/decline card (accepting sends trade2_open back,
                 which completes the mutual open server-side). */
              if (!payload || !payload.from) break;
              if (setTrade2) setTrade2({ invite: true, from: payload.from, fromName: payload.fromName || 'Someone', ts: Date.now() });
              pushDmgPopup(S, S.player.x, S.player.y - 40, '🤝 ' + (payload.fromName || 'Someone') + ' wants to trade!', '#3dd497');
              BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
              break;
            }
          case 'trade2_state':
            {
              /* v2.3.1132: the server's session snapshot -- the window
                 is a pure renderer of this.  Terminal states clear it;
                 goods from a settled swap arrive via the authoritative
                 player_state echo (coins + inventory adopted). */
              if (!payload || !setTrade2) break;
              /* v2.3.1235: trade-completion receipt — any newer session
                 snapshot supersedes a pending done-reveal watcher (guards
                 a hyper-fast re-open racing the ≤1.5s echo wait below). */
              if (S._t2DoneWatch && payload.state !== 'done') {
                try { clearInterval(S._t2DoneWatch); } catch (e) {}
                S._t2DoneWatch = null;
              }
              if (payload.state === 'open' || payload.state === 'invited') {
                setTrade2(payload);
              } else if (payload.state === 'done') {
                /* v2.3.1235: trade-completion receipt — HOLD the window
                   open and drop the old floating "Trade complete!" world
                   popup (it rendered before the wallet echo and the modal
                   just vanished).  Receipt = the final session snapshot
                   (my offers = what I sent, theirs = what I received;
                   the v2.3.1213 weapon lanes ride alongside).  The
                   swapped goods/gold arrive ONLY via the authoritative
                   player_state echo, which trade2.js QUEUES before this
                   broadcast but flushes on the next tick — so 'done'
                   normally lands first, and revealing now would show a
                   stale balance.  player_state is applied in
                   wsClient.js's own switch case (it never reaches this
                   dispatcher), so we chain off its OBSERVABLE effects
                   instead of the message: wsClient overwrites R.coins
                   (number) and replaces R.inventory (fresh object
                   identity) whenever the echo carries them — either
                   differing from the pre-'done' snapshot means the echo
                   has been APPLIED.  A 1500ms fallback reveals anyway so
                   a dropped (or delta-elided no-change) echo can't wedge
                   the modal.  One-shot: the watcher clears itself. */
                var _t2OtherId = payload.a === S.myId ? payload.b : payload.a;
                var _t2Receipt = {
                  sent: (payload.offers && payload.offers[S.myId]) || {},
                  received: (payload.offers && payload.offers[_t2OtherId]) || {},
                  sentWeapons: (payload.weapons && payload.weapons[S.myId]) || [],
                  receivedWeapons: (payload.weapons && payload.weapons[_t2OtherId]) || [],
                  otherName: payload.a === S.myId ? (payload.bName || 'Trader') : (payload.aName || 'Trader'),
                };
                var _t2PreCoins = S.rpg ? S.rpg.coins : null;      /* pre-trade coins */
                var _t2PreInv = S.rpg ? S.rpg.inventory : null;    /* pre-trade inventory ref */
                if (S._t2DoneWatch) { try { clearInterval(S._t2DoneWatch); } catch (e) {} }
                var _t2Deadline = Date.now() + 1500;
                S._t2DoneWatch = setInterval(function () {
                  var _t2Echoed = !!(S.rpg && (S.rpg.coins !== _t2PreCoins || S.rpg.inventory !== _t2PreInv));
                  if (!_t2Echoed && Date.now() < _t2Deadline) return;
                  try { clearInterval(S._t2DoneWatch); } catch (e) {}
                  S._t2DoneWatch = null;
                  /* Only NOW may "Trade complete" render — the receipt's
                     Balance line reads the server-echoed wallet.  The
                     panel auto-closes itself (~2800ms) via the existing
                     setTrade2(null); no after-close toast (the only
                     toast mechanism is the salvage-undo queue in
                     ItemTooltip.jsx — item/undo-specific, not suitable —
                     and the floating world text is deliberately gone). */
                  setTrade2({ state: 'done', receipt: _t2Receipt, ts: Date.now() });
                  BT_AUDIO.collect();
                  if (S.rpg) setRpgState(_objectSpread({}, S.rpg));
                }, 80);
              } else {
                /* v2.3.1235: trade-completion receipt — settlement
                   failure is a CANCEL: trade2.js _handleTrade2Confirm
                   validates at commit and calls _t2Cancel(s,
                   'insufficient:<pid>') when a side spent its staged
                   goods, deleting the session.  The session is DEAD
                   server-side, so "return to Editing with the same
                   session" would be a lie — instead the panel keeps its
                   shell up briefly with an honest in-modal notice
                   ("Trade failed — nothing was exchanged", state
                   'failed', auto-closes ~2200ms).  Inventory/gold are
                   never touched locally on any trade path — a failed
                   commit sends no credit and no player_state mutation.
                   True retry-in-place would need a server change (the
                   session surviving a failed commit) — out of scope.
                   Every other cancel reason keeps the legacy
                   clear-window + world-popup behavior. */
                var _t2SettleFail = !!(payload.reason && String(payload.reason).indexOf('insufficient') === 0);
                if (_t2SettleFail) {
                  setTrade2({ state: 'failed', reason: payload.reason, ts: Date.now() });
                } else {
                  setTrade2(null);
                  var _t2Why = {
                    'declined': 'Trade declined', 'disconnected': 'They disconnected',
                    'expired': 'Trade expired', 'busy': 'They are already trading',
                    'target-gone': 'Player unavailable', 'party-gone': 'Player unavailable',
                  }[payload.reason] || 'Trade cancelled';
                  pushDmgPopup(S, S.player.x, S.player.y - 40, _t2Why, '#ff5e6c');
                }
              }
              break;
            }
          case 'party_invited':
            {
              /* v2.3.1185: someone invited us to a party.  Park the
                 invite stub; PartyHUD renders the accept/decline card
                 (accepting sends party_accept, validated against the
                 inviter's own recorded invite server-side). */
              if (!payload || !payload.from) break;
              if (setParty) setParty({ invite: true, from: payload.from, fromName: payload.fromName || 'Someone', partySize: payload.partySize || 1, ts: Date.now() });
              pushDmgPopup(S, S.player.x, S.player.y - 40, '🎪 ' + (payload.fromName || 'Someone') + ' invites you to a party!', '#fbbf24');
              BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
              break;
            }
          case 'party_state':
            {
              /* v2.3.1185: the server's roster snapshot -- the party
                 HUD is a pure renderer of this (same posture as
                 trade2_state).  Re-echoed every ~2s while partied so
                 member HP/zone stay live cross-zone; terminal
                 {state:'none'} clears it. */
              if (!payload || !setParty) break;
              if (payload.state === 'open' && payload.members) {
                setParty(payload);
                /* v2.3.1185: mirror for the renderer's nameplate party
                   marker (entityRenderer reads S._party per frame --
                   grafted from the competing party build, PR #221). */
                S._party = payload;
              } else {
                setParty(null);
                S._party = null;
                var _ptyWhy = {
                  'left': 'You left the party', 'kicked': 'Kicked from the party',
                  'disbanded': 'Party disbanded', 'offline': 'Removed from party (offline)',
                }[payload.reason] || 'Party ended';
                pushDmgPopup(S, S.player.x, S.player.y - 40, _ptyWhy, '#fbbf24');
              }
              break;
            }
          case 'party_error':
            {
              /* v2.3.1185: private invite-flow notices (declines and
                 validation misses).  Display only. */
              if (!payload) break;
              var _ptyErr = {
                'declined': (payload.name || 'They') + ' declined the party',
                'target-busy': (payload.name || 'They') + ' is already in a party',
                'target-gone': 'Player unavailable',
                'busy': 'You are already in a party',
                'full': 'Party is full',
                'expired': 'Party invite expired', /* v2.3.1185 */
              }[payload.reason] || 'Party action failed';
              pushDmgPopup(S, S.player.x, S.player.y - 40, _ptyErr, '#ff5e6c');
              break;
            }
          case 'harden_result':
            {
              /* v2.3.1131: the §4.6c hardening roll came back (private).
                 Gold already debited + weapon hardness/temper already
                 mutated server-side -- the authoritative player_state
                 echo carries both; this event drives the feedback. */
              if (!payload) break;
              if (payload.error) {
                pushDmgPopup(S, S.player.x, S.player.y - 30, payload.message || 'Cannot harden', '#ff5e6c');
                BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
                break;
              }
              if (payload.success) {
                pushDmgPopup(S, S.player.x, S.player.y - 45, '⚒️ HARDENED! Now H' + payload.hardness + '/5', '#f5c542');
                S.screenShake = 6;
                BT_AUDIO.collect();
                setTimeout(function () { return BT_AUDIO.beep(784, 0.12, 0.1, 'sine'); }, 120);
              } else {
                pushDmgPopup(S, S.player.x, S.player.y - 45, 'Hardening failed! (-' + (payload.cost || 0) + 'G) → H' + payload.hardness, '#ff5e6c');
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Temper ' + (payload.temper || 0) + ' (pity softens future resets)', 'rgba(255,255,255,.5)');
                BT_AUDIO.beep(180, 0.12, 0.18, 'sawtooth');
              }
              if (S.rpg) setRpgState(_objectSpread({}, S.rpg));
              break;
            }
          case 'pet_capture_result':
            {
              /* v2.3.1130: server-rolled capture outcome (private).
                 On success the pet already sits in the authoritative
                 lifeSkills echo (the per-key merge adopts it) -- this
                 event only drives the feedback the legacy local roll
                 drew (MenuBar). */
              if (!payload) break;
              if (payload.captured && payload.pet) {
                var _pcPet = payload.pet;
                S.lockedTarget = null;
                pushDmgPopup(S, S.player.x, S.player.y - 35, 'Captured ' + _pcPet.name + '!', '#3dd497');
                pushDmgPopup(S, S.player.x, S.player.y - 50, (_pcPet.emoji || '') + ' ' + _pcPet.archetype + ' Lv' + _pcPet.level, _pcPet.color || '#3dd497');
                BT_AUDIO.collect();
                setTimeout(function () { return BT_AUDIO.beep(523, 0.1, 0.08, 'sine'); }, 100);
                setTimeout(function () { return BT_AUDIO.beep(659, 0.1, 0.08, 'sine'); }, 200);
                if (S.rpg) setRpgState(_objectSpread({}, S.rpg));
              } else if (payload.error) {
                var _pcMsg = {
                  'no-monster': 'Lock a weak monster first!',
                  'too-healthy': 'Too healthy! (<20% HP)',
                  'too-far': 'Too far away!',
                  'slots-full': 'Pet slots full!',
                  'no-trap': 'Need a trap! (Vendor sells them)',
                  'not-now': 'Cannot trap right now'
                }[payload.error] || 'Capture failed';
                pushDmgPopup(S, S.player.x, S.player.y - 30, _pcMsg, '#ff5e6c');
                BT_AUDIO.beep(200, 0.08, 0.12, 'square');
              } else {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Escaped!', '#ff5e6c');
                BT_AUDIO.beep(200, 0.08, 0.12, 'square');
              }
              break;
            }
          case 'gear_locked':
            {
              /* v2.3.1129: an equip attempt was rejected by the guard
                 gear lock; the player_state echo alongside snaps any
                 local equip mutation back. */
              var _glMin = payload && payload.until ? Math.max(1, Math.ceil((payload.until - Date.now()) / 60000)) : 30;
              pushDmgPopup(S, S.player.x, S.player.y - 40, 'Gear locked by guards! (' + _glMin + 'm left)', '#ff5e6c');
              BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
              break;
            }
          case 'duel_wager_request':
            {
              if (payload.target === S.myId) {
                setDuelRequest({
                  fromId: payload.from,
                  fromName: payload.fromName,
                  ts: Date.now(),
                  wager: payload.wager
                });
                BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
                setTimeout(function () {
                  return BT_AUDIO.beep(800, 0.04, 0.06, 'sine');
                }, 80);
              }
              break;
            }
        }
}
