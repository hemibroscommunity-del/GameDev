/* ═══ DURABLE OBJECTS WEBSOCKET CLIENT — connection lifecycle ═══ */
/* v2.3.784: the LIVE inline WebSocket client moved here verbatim from
   src/ui/BroTown.jsx (REBUILD-PLAN Phase 5, behavior-frozen), replacing the
   dead pre-protocol-v2 copy deleted in Phase 1. Contains: lobby room
   resolution, the protocol-v2 `join`, the main message switch (tick /
   state_sync / zone_state / player_state deltas / credits / presence),
   _buildServerPile, reconnect backoff, the v2.3.778 resume-resync recovery
   ladder, and the channelShim with 33ms input batching. The per-event
   dispatcher lives in gameEvents.js (Phase 4); docs/WIRE-PROTOCOL.md is the
   message reference.
   Called from a thin useEffect in BroTown:
     useEffect(function () { return setupWebSocket({...ctx}); },
               [showNameModal, showLogin]);
   ctx carries the component's closure captures (React setters, refs,
   gating flags), destructured below to the original names so the moved
   body is untouched. Returns the effect cleanup (or undefined when gated
   by showNameModal/showLogin — same as the original early return). */
import { processGameEvent } from '@/networking/gameEvents.js';
import { getDeviceNonce } from '@/networking/index.js';
import { createGatherNode, spawnMonstersForZone, BT_AUDIO, ZONES, TILE, DEATH_GOLD_PENALTY, createDefaultCompStats, generateZoneMap, recalcDerived, updateZoneDimensions } from '@/data/index.js';
import { _objectSpread, _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';
import { usesClientSideMovement, MONSTER_VARIANTS, isRemnantSkull, applyZoneVariant } from '@/data/monsterVariants.js';
import { rollMonsterShard, shardByKey } from '@/data/shards.js';
import { getHeadwear } from '@/rendering/traits/headwearCatalog.js';
import { getFacialHair } from '@/rendering/traits/facialHairCatalog.js';
import { getHair } from '@/rendering/traits/hairCatalog.js';
import { getSkin, getPants, getShoes } from '@/rendering/playerSkins.js';
import { getHairColor } from '@/rendering/traits/hairColorCatalog.js';
import { getHatColor } from '@/rendering/traits/hatColorCatalog.js';
import { getFacialHairColor } from '@/rendering/traits/facialHairColorCatalog.js';
import { getShirt } from '@/rendering/traits/shirtCatalog.js';
import { getShirtColor } from '@/rendering/traits/shirtColorCatalog.js';
import { getEquip } from '@/rendering/gearCatalog.js';
import { pushHudPopup } from '@/ui/XpFlyOverlay.jsx';

/* Tick arrival timestamps — module-level so the buffer survives
 * WebSocket reconnects and can be sampled by the FPS/NET overlay.
 * performance.now() values, capped at ~5 minutes of history.  Bytes-per-tick
 * payload sizes ride along so we can flag size spikes too.
 * NOTE (pre-existing, unchanged): nothing feeds these buffers since the
 * Phase 1 dead-code deletion -- the overlay reads empty history. Wiring the
 * live `tick` case into them is a deliberate follow-up, not part of the
 * behavior-frozen move. */
const TICK_HISTORY_MS = 5 * 60 * 1000;
const tickTimes = [];
const tickSizes = [];

/** Returns the live tick-time ring buffer (do not mutate from outside). */
export function getTickTimes() { return tickTimes; }
/** Returns the live tick-size ring buffer (do not mutate from outside). */
export function getTickSizes() { return tickSizes; }

export function setupWebSocket(ctx) {
  var stateRef = ctx.stateRef,
    showNameModal = ctx.showNameModal,
    showLogin = ctx.showLogin,
    setPlayerCount = ctx.setPlayerCount,
    setChatLog = ctx.setChatLog,
    setUnreadChats = ctx.setUnreadChats,
    setJoinFlash = ctx.setJoinFlash,
    setRpgState = ctx.setRpgState,
    setLevelUpMsg = ctx.setLevelUpMsg,
    setDuelRequest = ctx.setDuelRequest,
    setThreatIncoming = ctx.setThreatIncoming,
    setIncomingTrade = ctx.setIncomingTrade,
    setArenaTournament = ctx.setArenaTournament,
    setArenaBets = ctx.setArenaBets,
    pixiRef = ctx.pixiRef;
    if (showNameModal || showLogin) return;
    var S = stateRef.current;

    /* ═══ DURABLE OBJECTS WEBSOCKET CLIENT ═══ */
    /* Room selection: ?room=X URL query first (escape hatch for
       testing / friend rendezvous), then GET /api/lobby for the
       worker's auto-pick (first room under soft cap, mint fresh if
       all full), else fall back to brotown-1 if the lobby fetch
       fails.  Resolved once on initial connect, cached for reconnects
       so we don't bounce between rooms mid-session. */
    var WS_BASE = window.BROTOWN_WS_URL || 'wss://brotown-server.hemibroscommunity.workers.dev';
    var API_BASE = WS_BASE.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
    var WS_URL = null;
    async function resolveRoom() {
      try {
        var p = new URLSearchParams(window.location.search);
        var urlRoom = (p.get('room') || '').trim();
        if (urlRoom) return urlRoom;
      } catch (e) {}
      try {
        var res = await fetch(API_BASE + '/api/lobby');
        if (res.ok) {
          var j = await res.json();
          if (j && j.room) return j.room;
        }
      } catch (e) {}
      return 'brotown-1';
    }
    var ws = null;
    var reconnectTimer = null;
    var reconnectDelay = 1000;
    function connect() {
      if (!WS_URL) {
        resolveRoom().then(function (room) {
          WS_URL = WS_BASE + '/ws?room=' + encodeURIComponent(room);
          S._currentRoom = room;
          connect();
        });
        return;
      }
      try {
        ws = new WebSocket(WS_URL);
      } catch (e) {
        scheduleReconnect();
        return;
      }
      ws.onopen = function () {
        var _S$rpg, _S$rpg2, _S$rpg3, _S$rpgC, _S$rpgI, _S$rpgL, _S$rpgLV, _S$rpgXP, _S$rpgUT;
        S._realtimeStatus = 'connected';
        reconnectDelay = 1000;
        ws.send(JSON.stringify({
          type: 'join',
          id: S.myId,
          name: S.myName,
          /* v2.3.694: device correlation nonce {id, env} for the server's
             multi-account / bot-fleet anomaly tracker.  Old workers ignore it. */
          device: getDeviceNonce(),
          /* Protocol v2 opt-in: the worker sends this session delta
             player_state emits (only changed fields), per-entity
             monster/node tick deltas, and the merged zone_state
             message on zone change.  Old workers ignore the field and
             keep sending full v1 payloads, which this client still
             handles (the v1 cases below stay in place). */
          protocolVersion: 2,
          data: {
            x: S.player.x,
            y: S.player.y,
            d: S.player.dir,
            z: S.currentZone || 'town',
            name: S.myName,
            color: S.myColor,
            avatar: S.myAvatar,
            bt: S.bodyTorso || '#2563eb',
            bl: S.bodyLegs || '#1e3a5f',
            hw: getHeadwear(),
            fh: getFacialHair(),
            hr: getHair(),
            sk: getSkin(),
            hc: getHairColor(),
            htc: getHatColor(),
            fhc: getFacialHairColor(),
            st: getShirt(),
            stc: getShirtColor(),
            eqc: getEquip('chest'),
            eql: getEquip('legs'),
            eqs: getEquip('shoulders'),
            eqst: getEquip('shirt'),
            pt: getPants(),
            sh: getShoes(),
            bs: S.bodySize || 'slim',
            /* Bootstrap fields for server-authoritative coins / inventory
               / lifeSkills.  Used only on a player's FIRST connection
               to the GameRoom DO (when DO storage has no rpg:<playerId>
               entry yet); the server persists this and ignores the
               fields on subsequent connects, so localStorage tampering
               only affects the first session. */
            rpgCoins: ((_S$rpgC = S.rpg) === null || _S$rpgC === void 0 ? void 0 : _S$rpgC.coins) || 0,
            rpgInventory: ((_S$rpgI = S.rpg) === null || _S$rpgI === void 0 ? void 0 : _S$rpgI.inventory) || {},
            rpgLifeSkills: ((_S$rpgL = S.rpg) === null || _S$rpgL === void 0 ? void 0 : _S$rpgL.lifeSkills) || {},
            rpgLevel: ((_S$rpgLV = S.rpg) === null || _S$rpgLV === void 0 ? void 0 : _S$rpgLV.level) || 1,
            rpgXp: ((_S$rpgXP = S.rpg) === null || _S$rpgXP === void 0 ? void 0 : _S$rpgXP.xp) || 0,
            rpgUnspentT2: ((_S$rpgUT = S.rpg) === null || _S$rpgUT === void 0 ? void 0 : _S$rpgUT.unspentT2) || 0,
            rpgLv: ((_S$rpg = S.rpg) === null || _S$rpg === void 0 ? void 0 : _S$rpg.level) || 1,
            rpgHp: ((_S$rpg2 = S.rpg) === null || _S$rpg2 === void 0 ? void 0 : _S$rpg2.hp) || 50,
            rpgMaxHp: ((_S$rpg3 = S.rpg) === null || _S$rpg3 === void 0 ? void 0 : _S$rpg3.maxHp) || 50,
            /* Server-authoritative HP store derived stats.  def + amuletHpRegen
               + restoration are session-only on the worker (recomputed from the
               stats_update event whenever recalcDerived runs).  These join
               values are the initial seed before the first stats_update. */
            rpgDef: (function () {
              var _r = S.rpg || {};
              var _at = (_r.armor && typeof _r.armor.tierMult === 'number') ? _r.armor.tierMult : 1;
              return (_r.endurance || 0) * 0.5 + _at * 3;
            })(),
            rpgAmuletHpRegen: (function () {
              var _ab = (S.rpg && S.rpg._amuletBonus) || null;
              return (_ab && _ab.stat === 'hpRegen') ? (_ab.value || 0) : 0;
            })(),
            rpgAmuletStaminaRegen: (function () {
              var _ab2 = (S.rpg && S.rpg._amuletBonus) || null;
              return (_ab2 && _ab2.stat === 'staminaRegen') ? (_ab2.value || 0) : 0;
            })(),
            rpgRestoration: (S.rpg && typeof S.rpg.restoration === 'number') ? S.rpg.restoration : 0,
            /* Stamina + mana pools — slice 1b bootstrap. */
            rpgStamina: (S.rpg && typeof S.rpg.stamina === 'number') ? S.rpg.stamina : 100,
            rpgMaxStamina: (S.rpg && typeof S.rpg.maxStamina === 'number') ? S.rpg.maxStamina : 100,
            rpgMana: (S.rpg && typeof S.rpg.mana === 'number') ? S.rpg.mana : 100,
            rpgMaxMana: (S.rpg && typeof S.rpg.maxMana === 'number') ? S.rpg.maxMana : 100,
            /* Raw stats bootstrap (slice v2.3.79).  Worker clamps each
               to level * 10 + 20 on first connect; subsequent connects
               read from DO storage rather than this join payload. */
            rpgPower: (S.rpg && typeof S.rpg.power === 'number') ? S.rpg.power : 0,
            rpgVitality: (S.rpg && typeof S.rpg.vitality === 'number') ? S.rpg.vitality : 0,
            rpgEndurance: (S.rpg && typeof S.rpg.endurance === 'number') ? S.rpg.endurance : 0,
            rpgAgility: (S.rpg && typeof S.rpg.agility === 'number') ? S.rpg.agility : 0,
            rpgMind: (S.rpg && typeof S.rpg.mind === 'number') ? S.rpg.mind : 0,
            rpgFerocity: (S.rpg && typeof S.rpg.ferocity === 'number') ? S.rpg.ferocity : 0,
            rpgElementalMastery: (S.rpg && typeof S.rpg.elementalMastery === 'number') ? S.rpg.elementalMastery : 0,
            rpgFortification: (S.rpg && typeof S.rpg.fortification === 'number') ? S.rpg.fortification : 0,
            /* Equipment slots bootstrap (slice 12).  Worker stores
               these as opaque objects; stash truncated to cap server-
               side. */
            rpgWeapon: (S.rpg && S.rpg.weapon) || null,
            rpgRangedWeapon: (S.rpg && S.rpg.rangedWeapon) || null,
            rpgStaffWeapon: (S.rpg && S.rpg.staffWeapon) || null,
            rpgActiveSlot: (S.rpg && S.rpg.activeSlot) || 'melee',
            rpgArmor: (S.rpg && S.rpg.armor) || null,
            rpgShield: (S.rpg && S.rpg.shield) || null,
            rpgAmulet: (S.rpg && S.rpg.amulet) || null,
            rpgWeaponStash: (S.rpg && Array.isArray(S.rpg.weaponStash)) ? S.rpg.weaponStash : [],
            /* Quest state bootstrap (slice 17). */
            rpgQuests: (S.rpg && S.rpg._quests) || {},
            rpgQuestFlags: (S.rpg && S.rpg._questFlags) || {},
            rpgQuestKills: (S.rpg && S.rpg._questKills) || {},
            rpgAchievementPoints: (S.rpg && typeof S.rpg.achievementPoints === 'number') ? S.rpg.achievementPoints : 0
          }
        }));
        var welcomeMsg = {
          id: 'sys-' + Date.now(),
          name: '',
          text: S.myName + ' joined Bro Town!',
          color: '',
          ts: Date.now(),
          system: true
        };
        S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-50)), [welcomeMsg]);
        setChatLog(_toConsumableArray(S.chatLog));
      };
      ws.onmessage = function (evt) {
        var _wsStart = performance.now();
        var msg;
        try {
          msg = JSON.parse(evt.data);
        } catch (_unused1) {
          return;
        }
        /* Tail timing — wrap the rest of the body and log + push to
           perfTracker when this handler exceeds 5 ms.  Server sends
           ticks at 30 Hz; if each handler call takes 30+ ms we monopolise
           the main thread between RAF callbacks (= the rhythmic outside-
           the-RAF spike pattern we captured in v2.1.65). */
        var _wsType = msg.type;
        var _wsDone = function _wsDone() {
          var _wsMs = performance.now() - _wsStart;
          if (!ws._slowLog) ws._slowLog = { lastT: 0, worst: 0, worstType: '' };
          if (_wsMs > 5) {
            if (_wsMs > ws._slowLog.worst) { ws._slowLog.worst = _wsMs; ws._slowLog.worstType = _wsType; }
            if (window.perfTracker && window.perfTracker.recordExternal) {
              window.perfTracker.recordExternal('ws.' + _wsType, _wsMs);
            }
          }
          if (performance.now() - ws._slowLog.lastT > 500 && ws._slowLog.worst > 5) {
             
            console.warn('[bt-ws-slow]', { ms: +ws._slowLog.worst.toFixed(1), type: ws._slowLog.worstType });
             
            ws._slowLog.lastT = performance.now();
            ws._slowLog.worst = 0;
            ws._slowLog.worstType = '';
          }
        };
        try {
        switch (msg.type) {
          case 'tick':
            {
              // §16.9 — Process batched player positions
              if (msg.players) {
                for (var _i33 = 0, _Object$entries5 = Object.entries(msg.players); _i33 < _Object$entries5.length; _i33++) {
                  var _Object$entries5$_i = _slicedToArray(_Object$entries5[_i33], 2),
                    pid = _Object$entries5$_i[0],
                    data = _Object$entries5$_i[1];
                  if (pid === S.myId) continue;
                  if (S.others[pid]) {
                    S.others[pid].x = data.x;
                    S.others[pid].y = data.y;
                    S.others[pid]._serverX = data.x;
                    S.others[pid]._serverY = data.y;
                    S.others[pid].dir = data.d;
                    if (data.f) S.others[pid]._renderFacing = data.f;
                    S.others[pid].zone = data.z;
                    S.others[pid]._vx = (data.vx || 0) / 100;
                    S.others[pid]._vy = (data.vy || 0) / 100;
                    S.others[pid]._lastUpdate = Date.now();
                    /* v2.3.599: live equip -> the renderer reads other.equip
                       (nested), so rebuild it from the broadcast eqc/eql/eqs
                       whenever present, keeping armour on/off in sync. */
                    if (data.eqc !== undefined || data.eql !== undefined || data.eqs !== undefined || data.eqst !== undefined) {
                      var _oe5 = S.others[pid].equip || { head: 'none', chest: 'none', legs: 'none', shoulders: 'none', shirt: 'none' };
                      S.others[pid].equip = {
                        chest: data.eqc !== undefined ? (data.eqc || 'none') : _oe5.chest,
                        legs: data.eql !== undefined ? (data.eql || 'none') : _oe5.legs,
                        shoulders: data.eqs !== undefined ? (data.eqs || 'none') : _oe5.shoulders,
                        shirt: data.eqst !== undefined ? (data.eqst || 'none') : _oe5.shirt,
                      };
                    }
                    /* Snapshot interpolation — buffer positions + velocity */
                    if (!S.others[pid]._posBuffer) S.others[pid]._posBuffer = [];
                    S.others[pid]._posBuffer.push({
                      x: data.x, y: data.y,
                      vx: (data.vx || 0) / 100, vy: (data.vy || 0) / 100,
                      t: performance.now()
                    });
                    if (S.others[pid]._posBuffer.length > 20) S.others[pid]._posBuffer.shift();
                  }
                }
              }
              // §16.10 — Process batched game events
              if (msg.events) {
                for (var ei = 0; ei < msg.events.length; ei++) {
                  var _evt = msg.events[ei];
                  var payload = _evt.payload || _evt;
                  payload.id = payload.id || _evt.from;
                  processGameEvent(_evt.type, payload, S, _gameEventDeps);
                }
              }
              // Server gather-node state deltas (alive/respawnAt only;
              // position + type + tierLvl came once at state_sync /
              // zone_nodes).
              if (msg.nodes && S._serverGatherNodes && S.gatherNodes) {
                var myZoneN = S.currentZone || 'town';
                var zoneNodeData = msg.nodes[myZoneN];
                if (zoneNodeData) {
                  for (var nni = 0; nni < zoneNodeData.length; nni++) {
                    var nnd = zoneNodeData[nni];
                    var localN = S.gatherNodes.find(function (gn) { return gn.id === nnd.id; });
                    if (localN) {
                      localN.alive = !!nnd.alive;
                      localN.respawnAt = nnd.respawnAt || 0;
                      if (nnd.alive) localN.hp = localN.maxHp;
                    }
                  }
                }
              }

              // Server monster position/HP updates
              if (msg.monsters && S._serverMonsters && S.monsters) {
                var myZone = S.currentZone || 'town';
                var zoneData = msg.monsters[myZone];
                if (zoneData) {
                  for (var mi = 0; mi < zoneData.length; mi++) {
                    var md = zoneData[mi];
                    var localM = S.monsters.find(function(m) { return m.id === md.id; });
                    if (localM) {
                      /* Client-authoritative variants (e.g. fireGoblin)
                         keep their locally-simulated position; server
                         position is ignored.  HP / alive still sync.
                         v2.3.223: also skip while local knockback is
                         active so the visual bump on server-driven
                         variants (mummy / skeleton) doesn't get
                         instantly stomped by the next server tick. */
                      var _kbActive = localM._kbUntil && Date.now() < localM._kbUntil;
                      if (!usesClientSideMovement(localM) && !_kbActive) {
                        /* Stamp _lastPosChangeAt whenever the server's
                           rounded position differs from our cached
                           x/y.  Slow server-driven variants (mummy at
                           0.4 spd) only see integer x changes every
                           ~44 ms (round-trips below the 0.5-px interp
                           threshold), so renderX-delta detection in
                           the renderer is sparse + drops moving=false
                           between bumps.  This stamp gives the
                           renderer a direct "server pushed a new
                           position this recently" signal. */
                        if (md.x !== localM.x || md.y !== localM.y) {
                          localM._lastPosChangeAt = Date.now();
                        }
                        localM.x = md.x;
                        localM.y = md.y;
                      }
                      localM.curHp = md.hp;
                      /* Don't overwrite maxHp — it stays at the spawn value */
                      if (md.alive && !localM.alive) {
                        /* Monster respawned -- clear all per-life
                           transient flags so the next death replays
                           the loot drop, SFX, stuck arrows, and the
                           death animation cleanly. */
                        localM.alive = true;
                        localM.renderX = md.x;
                        localM.renderY = md.y;
                        localM._stuckArrows = [];
                        localM._slimeDeathStart = null;
                        localM._snowmanDeathStart = null;
                        localM._lootDropped = false;
                        localM._deathSfxPlayed = false;
                        /* Revert any mid-fight variant transform.  A
                           desert mummy that died as a skeleton needs to
                           come back as a mummy so the first 50% HP
                           still triggers the bandage-shred animation
                           next life.  Server already resets m.variant
                           on its side but doesn't broadcast that field
                           per tick, so the client uses the spawn
                           archetype it stashed at state_sync time. */
                        if (localM._spawnArchetype && localM.archetype !== localM._spawnArchetype) {
                          localM.archetype = localM._spawnArchetype;
                          localM.type = localM._spawnArchetype;
                          if (localM.arch !== undefined) localM.arch = localM._spawnArchetype;
                          localM._transformStart = null;
                          localM._transformHoldMs = 0;
                          localM._transformFromArch = null;
                          var _sv = MONSTER_VARIANTS[localM._spawnArchetype];
                          if (_sv && _sv.spd != null) localM.spd = _sv.spd;
                        }
                      }
                      if (!md.alive && localM.alive) {
                        /* Monster died (from another player's kill or
                           server-driven mechanics).  Drop the remnant
                           pile here as the canonical alive -> dead
                           transition for server-managed monsters --
                           m.curHp -= dmg in the local hit paths is
                           gated on !S._serverMonsters so those never
                           fire in MP, leaving this tick branch (and
                           the monster_kill handler) as the only
                           places that know the kill happened. */
                        localM.alive = false;
                        if (!localM._lootDropped && S.groundLoot && isRemnantSkull(localM.type)) {
                          localM._lootDropped = true;
                          var _shardA = rollMonsterShard(S.currentZone);
                          S.groundLoot.push({
                            x: (localM.x || localM.renderX || 0) + (Math.random() - 0.5) * 12,
                            y: (localM.y || localM.renderY || 0) + (Math.random() - 0.5) * 12,
                            coins: 0,
                            xp: 0,
                            skull: localM.type,
                            skullEmoji: '🦴',
                            ts: Date.now(),
                            shard: _shardA,
                          });
                        }
                        if (!localM._deathSfxPlayed) {
                          localM._deathSfxPlayed = true;
                          try { BT_AUDIO.monsterDeath(localM.archetype || localM.type); } catch (e) {}
                        }
                      }
                    }
                  }
                }
              }
              break;
            }
          case 'state_sync':
            {
              var others = {};
              for (var _i34 = 0, _Object$entries6 = Object.entries(msg.players); _i34 < _Object$entries6.length; _i34++) {
                var _Object$entries6$_i = _slicedToArray(_Object$entries6[_i34], 2),
                  _pid = _Object$entries6$_i[0],
                  _data = _Object$entries6$_i[1];
                if (_pid === S.myId) continue;
                others[_pid] = {
                  x: _data.x || 0,
                  y: _data.y || 0,
                  _serverX: _data.x || 0,
                  _serverY: _data.y || 0,
                  renderX: _data.x || 0,
                  renderY: _data.y || 0,
                  name: _data.name || 'Anon',
                  color: _data.color || '#888',
                  avatar: _data.avatar || null,
                  dir: _data.d || 'down',
                  bt: _data.bt || '#2563eb',
                  bl: _data.bl || '#1e3a5f',
                  headwear: _data.hw || null,
                  facialhair: _data.fh || null,
                  hair: _data.hr || null,
                  skin: _data.sk || null,
                  hairColor: _data.hc || null,
                  hatColor: _data.htc || null,
                  facialHairColor: _data.fhc || null,
                  shirt: _data.st || null,
                  shirtColor: _data.stc || null,
                  equip: { chest: _data.eqc || 'none', legs: _data.eql || 'none', shoulders: _data.eqs || 'none',
                    /* v2.3.756: layered shirt; old clients send no eqst -> infer from their legacy shirt style */
                    shirt: _data.eqst !== undefined ? (_data.eqst || 'none') : ((_data.st && _data.st !== 'none') ? 'tshirt' : 'none') },
                  pants: _data.pt || null,
                  shoes: _data.sh || null,
                  rpgLv: _data.rpgLv || 1,
                  rpgHp: _data.rpgHp || 50,
                  rpgMaxHp: _data.rpgMaxHp || 50,
                  bodySize: _data.bs || 'slim',
                  zone: _data.z || 'town'
                };
              }
              S.others = others;
              setPlayerCount(msg.playerCount || Object.keys(others).length + 1);
              /* Load server monsters when present — shared monster
                 instances across all players, GDD §7 damage-share
                 active.  Empty list means the server has no monsters
                 for this zone (town, or a dungeon the server doesn't
                 model); fall back to client-local. */
              if (msg.monsters && msg.monsters.length > 0) {
                S._serverMonsters = true;
                S.monsters = msg.monsters.map(function(m) {
                  var local = _objectSpread(_objectSpread({}, m), {}, {
                    archetype: m.arch, type: m.arch,
                    curHp: m.hp, renderX: m.x, renderY: m.y, spawnX: m.x, spawnY: m.y,
                    alive: m.alive, statuses: {}, _hitThisSwing: false,
                    _atkCd: 0, _stunUntil: 0, respawnAt: 0, moveTimer: 0, targetX: m.x, targetY: m.y,
                    _stuckArrows: [],
                  });
                  /* Apply per-zone variant skin (see monsterVariants.js).
                     Maps ember fodder -> fireGoblin so the renderer + AI
                     route to the variant sheets without any inline
                     zone/archetype check elsewhere in the codebase. */
                  applyZoneVariant(local, S.currentZone);
                  /* Remember the post-variant archetype so the respawn
                     branch in the tick handler can revert a transformed
                     monster (mummy -> skeleton) back to its spawn form.
                     Server resets m.variant on respawn but doesn't
                     broadcast that field per tick, so the client needs
                     its own source of truth here. */
                  local._spawnArchetype = local.archetype;
                  return local;
                });
              } else {
                S._serverMonsters = false;
              }
              /* Server-authoritative gather nodes — thicken the worker's
                 minimal {id,nodeType,x,y,tierLvl,alive,respawnAt} payload
                 into the full client node shape using createGatherNode
                 with a forced tier lvl (so two clients agree on tier
                 per server node id).  msg.monsterZone is the join zone. */
              if (msg.nodes) {
                S._serverGatherNodes = true;
                var _nzone = msg.monsterZone || S.currentZone;
                var _curZoneCfgN = ZONES[S.currentZone];
                /* Safe zones (town, farm) never have resource nodes --
                   ignore any server-sent set regardless of source so
                   stale snapshots can't leak trees/ores into town
                   (v2.3.136 bug report). */
                if (_curZoneCfgN && _curZoneCfgN.safe) {
                  S.gatherNodes = [];
                } else if (_nzone && _nzone !== S.currentZone) {
                  /* Stale snapshot for a different zone -- ignore. */
                } else {
                  S.gatherNodes = msg.nodes.map(function (n) {
                    var local = createGatherNode(_nzone, 'shallow', n.x, n.y, n.nodeType, n.tierLvl);
                    local.id = n.id;
                    local.alive = !!n.alive;
                    local.respawnAt = n.respawnAt || 0;
                    return local;
                  });
                }
              }
              /* Server-authoritative ground loot — server now owns the
                 pile list, validates pickups, and emits private
                 loot_credit events with the picker's authorized share.
                 Setting S._serverLoot disables the legacy client-local
                 loot push in the monster_kill handler. */
              if (msg.loot) {
                S._serverLoot = true;
                var _curZoneCfgL = ZONES[S.currentZone];
                var _lzone = msg.zone || msg.monsterZone;
                if (_curZoneCfgL && _curZoneCfgL.safe) {
                  /* Safe zones never have loot piles -- drop stale
                     payloads from previous-zone fights (v2.3.136). */
                  S.groundLoot = [];
                } else if (_lzone && _lzone !== S.currentZone) {
                  /* Stale loot for a different zone -- ignore. */
                } else {
                  S.groundLoot = msg.loot.map(function (p) { return _buildServerPile(p, S.myId); });
                }
              }
              break;
            }
          case 'zone_loot':
            {
              _applyZoneLootMsg(msg, S);
              break;
            }
          case 'zone_state':
            {
              /* Protocol v2: merged zone-change snapshot.  One message
                 carrying what v1 split across zone_monsters +
                 zone_nodes + zone_loot. */
              _applyZoneMonstersMsg(msg, S);
              _applyZoneNodesMsg(msg, S);
              _applyZoneLootMsg(msg, S);
              break;
            }
          case 'loot_credit':
            {
              /* Private message: server is granting us the share + (if
                 we were first to pick up) the one-of inventory drop.
                 _applyLootCredit handles the popup + SFX + local pile
                 despawn.  The actual coin/inventory mutation rides on
                 the player_state event that immediately follows. */
              if (msg.payload) _applyLootCredit(msg.payload, S);
              break;
            }
          case 'lifesteal_credit':
            {
              /* Worker tells us a melee-kill heal landed -- render the +N HP
                 floater (the HP itself rides on the player_state push).
                 v2.3.462: do NOT gate on payload.playerId === S.myId -- this is
                 direct-sent to the killer's own ws (server session.id != client
                 S.myId, which silently dropped every heal); combat_credit
                 (same direct-send path) doesn't gate either. */
              if (msg.payload && msg.payload.refund > 0 && S.dmgNumbers && S.player) {
                S.dmgNumbers.push({
                  x: S.player.x, y: S.player.y - 40,
                  text: '+' + msg.payload.refund + ' HP',
                  color: '#3dd497', ts: Date.now(),
                });
              }
              /* v2.3.824: the zero-refund diagnostic floater ('lifesteal:
                 <reason>') was removed at the owner's request -- a melee kill
                 with no damage to refund (e.g. a fully-blocked fight) should
                 simply show nothing.  Only the +N HP heal above ever
                 surfaces now. */
              break;
            }
          case 'loot_pickup_rejected':
            {
              /* v2.3.260 diagnostic: server tells us why a pickup
                 silently failed (recipient mismatch, out-of-range,
                 already-claimed, etc.).  Renders a small floater +
                 console.log so the user can see which gate is firing
                 instead of guessing why a pile won't grab.  Drop once
                 the underlying issue is identified. */
              if (!msg.payload || !S || !S.player) break;
              try { console.log('[loot_pickup_rejected]', msg.payload, 'myId=', S.myId); } catch (e) {}
              if (S.dmgNumbers) {
                S.dmgNumbers.push({
                  x: S.player.x, y: S.player.y - 24,
                  text: 'pickup: ' + (msg.payload.reason || 'unknown'),
                  color: '#f5c542', ts: Date.now(),
                });
              }
              break;
            }
          case 'player_state':
            {
              /* Server-authoritative rpg state snapshot.  OVERWRITE
                 local R.coins / R.inventory / R.lifeSkills with the
                 worker's totals -- this is the closure for cheats
                 that try to modify the local value (they get stomped
                 on the next sync).  Fires on join (bootstrap) and
                 after every server-validated rpg-mutating action
                 (currently loot pickup + harvest; future: sales /
                 quest / etc.). */
              if (!msg.payload || !S.rpg) break;
              if (typeof msg.payload.coins === 'number') {
                S.rpg.coins = msg.payload.coins;
              }
              if (msg.payload.inventory && typeof msg.payload.inventory === 'object') {
                S.rpg.inventory = _objectSpread({}, msg.payload.inventory);
              }
              if (msg.payload.lifeSkills && typeof msg.payload.lifeSkills === 'object') {
                /* Preserve client-only sub-fields (resources / gems /
                   farmPlots / pets / etc.) by spreading the server's
                   per-skill objects on top of the existing R.lifeSkills.
                   Server owns woodcutting / fishing / mining today; the
                   non-XP-bearing maps stay client-side until their own
                   migrations land. */
                if (!S.rpg.lifeSkills) S.rpg.lifeSkills = {};
                Object.keys(msg.payload.lifeSkills).forEach(function (k) {
                  /* v2.3.767: preserve the VALUE SHAPE.  _objectSpread({},v)
                     turned ARRAYS into plain objects ({0:..,1:..}) and null
                     into {} -- the server's lifeSkills echo (sent in the
                     player_state flush after every monster kill) corrupted
                     pets[] into an object, and the achievements timer's
                     (pets || []).filter then threw an uncaught TypeError
                     EVERY interval -- the multiplayer 'black world / kicked'
                     instability (found by the two-session headless repro). */
                  var _v = msg.payload.lifeSkills[k];
                  /* v2.3.768: the SERVER's stored copy can itself carry the
                     corrupted shape (it bootstrapped from a pre-fix client's
                     join payload and echoes it forever) -- heal known-array
                     keys on the way in, not just locally-persisted saves. */
                  if (k === 'pets' && _v && !Array.isArray(_v) && typeof _v === 'object') _v = Object.values(_v);
                  S.rpg.lifeSkills[k] = Array.isArray(_v) ? _v.slice()
                    : (_v && typeof _v === 'object') ? _objectSpread({}, _v)
                    : _v;
                });
              }
              /* Combat XP / level / unspent T2 stat points -- worker
                 applies on monster_kill (and persists), client mirrors
                 here.  A modified client that sets R.xp = 999999 will
                 get stomped on the next kill's player_state.
                 v2.3.154: the worker now uses the BP gate (per the
                 build-points-gate-server spec), so its level updates
                 only arrive after the player has earned 5 BP. Safe to
                 accept verbatim again; the v2.3.153 bootstrap-only
                 workaround came out. */
              if (typeof msg.payload.level === 'number') {
                S.rpg.level = msg.payload.level;
              }
              if (typeof msg.payload.xp === 'number') {
                S.rpg.xp = msg.payload.xp;
              }
              if (typeof msg.payload.unspentT2 === 'number') {
                S.rpg.unspentT2 = msg.payload.unspentT2;
              }
              /* HP / stamina / mana store -- worker applies damage,
                 ability costs, shield drain, regen, level-up + respawn
                 resets.  Client OVERWRITES on every player_state so a
                 DevTools R.hp/stamina/mana = 99999 cheat gets stomped
                 on the next sync.
                 LIFESTEAL TEST MODE (companion to the v2.3.132 client
                 regen pause): only let HP go DOWN from server. This
                 stops server-side regen ticks from undoing the C1
                 melee-kill heal (which is applied client-side, so the
                 next player_state would otherwise stomp it back down).
                 Also-stops in-combat / OOC regen for the same reason.
                 Trade-off: server-side heal sources (cooking, level-up
                 full restore, respawn) are blocked until the player
                 next takes damage, at which point HP resyncs. */
              /* v2.3.237: worker now mirrors getArmorHp() per the
                 t1-t2-stat-redesign-server spec.  The v2.3.231 client
                 fold is retired -- server's hp / maxHp are authoritative
                 and already include the armor bonus. */
              if (typeof msg.payload.hp === 'number') {
                S.rpg.hp = msg.payload.hp;
              }
              if (typeof msg.payload.maxHp === 'number') {
                S.rpg.maxHp = msg.payload.maxHp;
              }
              if (typeof msg.payload.stamina === 'number') {
                S.rpg.stamina = msg.payload.stamina;
              }
              if (typeof msg.payload.maxStamina === 'number') {
                S.rpg.maxStamina = msg.payload.maxStamina;
              }
              if (typeof msg.payload.mana === 'number') {
                S.rpg.mana = msg.payload.mana;
              }
              if (typeof msg.payload.maxMana === 'number') {
                S.rpg.maxMana = msg.payload.maxMana;
              }
              /* Food buff timers -- worker is authoritative for the
                 endsAt timestamps so a cheater can't extend their
                 _dmgBuff by writing it locally.  Mirror onto the
                 client's S._dmgBuff / _regenBuff / etc. flags so the
                 existing client-side UI + math reads the server values. */
              if (msg.payload._buffs && typeof msg.payload._buffs === 'object') {
                var _sb = msg.payload._buffs;
                if (typeof _sb.damage === 'number') S._dmgBuff = _sb.damage;
                if (typeof _sb.regen === 'number') S._regenBuff = _sb.regen;
                if (typeof _sb.resist === 'number') S._resistBuff = _sb.resist;
                if (typeof _sb.spd === 'number') S._spdBuff = _sb.spd;
                if (typeof _sb.hp === 'number') S._hpBuff = _sb.hp;
                if (typeof _sb.mana === 'number') S._manaBuff = _sb.mana;
              }
              /* Equipment slots -- worker is the canonical owner.  An
                 equip_request swap, marketplace buy, or future server-
                 side crafting result lands here.  Note: rangedWeapon /
                 staffWeapon may legitimately be undefined in payload
                 (e.g., a player who never bought a bow); only assign
                 when the field is present so we don't overwrite a
                 freshly-acquired weapon with null. */
              if ('weapon' in msg.payload) S.rpg.weapon = msg.payload.weapon;
              if ('rangedWeapon' in msg.payload) S.rpg.rangedWeapon = msg.payload.rangedWeapon;
              if ('staffWeapon' in msg.payload) S.rpg.staffWeapon = msg.payload.staffWeapon;
              /* activeSlot: server's value applies only when the user
                 hasn't explicitly cycled in this session.  Without this
                 guard, ANY stale persisted activeSlot on the worker
                 (e.g., set_active_slot lost to a race or pipeline hop)
                 reverts the player's cycled slot the moment a combat
                 kill / loot pickup / credit event fires player_state.
                 Client trusts itself once the user has touched the
                 cycle gesture. */
              if (typeof msg.payload.activeSlot === 'string' && !S._userCycledSlot) {
                S.rpg.activeSlot = msg.payload.activeSlot;
              }
              var _armorChanged = false;
              if ('armor' in msg.payload) { S.rpg.armor = msg.payload.armor; _armorChanged = true; }
              /* v2.3.189: never let the server stomp the default wood
                 shield. Pre-v2.3.188 saves on the worker may have
                 shield=null, which would erase the client default
                 added in the load-time migration. If the server's
                 value is falsy, keep whatever the client has. */
              if ('shield' in msg.payload && msg.payload.shield) {
                S.rpg.shield = msg.payload.shield;
              }
              if ('amulet' in msg.payload) S.rpg.amulet = msg.payload.amulet;
              /* v2.3.227 (Phase 1): armor swaps change maxHp via
                 getArmorHp() in recalcDerived.  Recompute so HP stays
                 consistent after server-echoed equipment changes. */
              if (_armorChanged) recalcDerived(S.rpg);
              if (Array.isArray(msg.payload.weaponStash)) S.rpg.weaponStash = msg.payload.weaponStash;
              /* Quest state mirror (slice 17).  Worker is authoritative
                 for chain progression + reward grants.  Quest completion
                 criteria (kill counts / item drops / NPC dialog) still
                 run client-side. */
              if (msg.payload._quests && typeof msg.payload._quests === 'object') S.rpg._quests = msg.payload._quests;
              if (msg.payload._questFlags && typeof msg.payload._questFlags === 'object') S.rpg._questFlags = msg.payload._questFlags;
              if (msg.payload._questKills && typeof msg.payload._questKills === 'object') S.rpg._questKills = msg.payload._questKills;
              if (typeof msg.payload.achievementPoints === 'number') S.rpg.achievementPoints = msg.payload.achievementPoints;
              setRpgState(_objectSpread({}, S.rpg));
              try { localStorage.setItem('bt_rpg', JSON.stringify(S.rpg)); } catch (e) {}
              break;
            }
          case 'player_died':
            {
              /* Server detected our HP hit 0.  Drives the death animation
                 + screen shake + gold-loss popup.  Server owns the respawn
                 timer; we wait for player_respawned to teleport home and
                 player_state to restore hp/stamina/mana.  Local R.hp
                 is no longer the trigger (worker authoritative this slice). */
              if (!S.rpg || S._dying) break;
              S._dying = true;
              if (!S.rpg._compStats) S.rpg._compStats = createDefaultCompStats();
              S.rpg._compStats.deaths++;
              S._deathStart = Date.now();
              /* Gold penalty mirrors the legacy local-death path
                 (worker doesn't apply this yet; client is still the
                 source for R.coins this slice will not change). */
              var _goldLost3 = Math.floor((S.rpg.coins || 0) * DEATH_GOLD_PENALTY);
              if (_goldLost3 > 0 && S.channel) {
                /* Client still mutates R.coins for the gold-loss popup;
                   server tracks coins via the loot path, so its view
                   will drift on death until coins-on-death migrates.
                   Note: the player_state on respawn does NOT re-apply
                   this penalty, so the cheat surface here is the same
                   as it was before this slice. */
                S.rpg.coins = Math.max(0, S.rpg.coins - _goldLost3);
              }
              /* Death particles + audio + popup. */
              for (var _dp3 = 0; _dp3 < 25; _dp3++) {
                var _dpA3 = _dp3 / 25 * Math.PI * 2;
                S.hitParticles.push({
                  x: S.player.x, y: S.player.y,
                  vx: Math.cos(_dpA3) * (2 + Math.random() * 4),
                  vy: Math.sin(_dpA3) * (2 + Math.random() * 4) - 1,
                  life: 1.0, color: ['#ff5e6c', '#cc2233', '#ff8888'][Math.floor(Math.random() * 3)], size: 2 + Math.random() * 3
                });
              }
              S.screenShake = 10;
              S.dmgNumbers.push({
                x: S.player.x, y: S.player.y - 40,
                text: 'YOU DIED', color: '#ff5e6c', ts: Date.now()
              });
              if (_goldLost3 > 0) S.dmgNumbers.push({
                x: S.player.x, y: S.player.y - 55,
                text: '-' + _goldLost3 + 'G', color: '#fbbf24', ts: Date.now()
              });
              BT_AUDIO.deathBoom();
              /* Tell the room we died so remote clients render a dead
                 pose at our last position.  Server already knows. */
              if (S.channel) S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } });
              if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_died_to_monster', payload: { id: S.myId, x: S.player.x, y: S.player.y } });
              setRpgState(_objectSpread({}, S.rpg));
              break;
            }
          case 'player_respawned':
            {
              /* Server's respawn timer elapsed -- teleport to town and
                 clear local death state.  hp/stamina/mana are restored
                 server-side and arrive via the player_state that fires
                 alongside this event. */
              S.currentZone = (msg.payload && msg.payload.zone) || 'town';
              updateZoneDimensions(S.currentZone);
              BT_AUDIO.startZoneAmbient(S.currentZone);
              S.map = generateZoneMap(S.currentZone);
              S.monsters = [];
              S.gatherNodes = [];
              S.player.x = (ZONES[S.currentZone] ? ZONES[S.currentZone].w / 2 : 16) * TILE;
              S.player.y = (ZONES[S.currentZone] ? ZONES[S.currentZone].h / 2 : 16) * TILE;
              S.respawnTimer = Date.now() + 3000;
              S._deathStart = 0;
              S._dying = false;
              /* Tell the server our new position + zone + dead=false.
                 Other clients clear our _isDead via the broadcast. */
              if (S.channel) S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } });
              if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_respawned', payload: { id: S.myId } });
              try { localStorage.setItem('bt_rpg', JSON.stringify(S.rpg)); } catch (e) {}
              break;
            }
          case 'harvest_credit':
            {
              /* Server's non-deterministic feedback for a harvest the
                 client just requested via node_strike.  Carries the
                 shard roll outcome (server-owned RNG) and the level-up
                 confirmation; the client uses these for the +Shard
                 popup and the "Skill Level N!" popup.  Deterministic
                 popups ("PERFECT!", "+Pine ×2", "+10 Woodcutting XP")
                 still fire client-side at apply time because the
                 client knows accuracy + tier and matches the server's
                 formula. */
              if (!msg.payload || !S.rpg) break;
              var hc = msg.payload;
              if (hc.shard) {
                var _pickedHShard = shardByKey(hc.shard);
                S.dmgNumbers.push({
                  x: S.player.x, y: S.player.y - 54,
                  text: '+ ' + (_pickedHShard ? _pickedHShard.label : 'Shard'),
                  color: (_pickedHShard && _pickedHShard.color) || '#cce6ff',
                  ts: Date.now(),
                });
              }
              if (hc.leveled && hc.skillName) {
                var _sklEmoji = hc.skillName === 'fishing' ? '🎣' : hc.skillName === 'woodcutting' ? '🪓' : '⛏';
                var _sklLabel = hc.skillName.charAt(0).toUpperCase() + hc.skillName.slice(1);
                S.dmgNumbers.push({
                  x: S.player.x, y: S.player.y - 50,
                  text: _sklEmoji + ' ' + _sklLabel + ' Level ' + (hc.newLevel || '?') + '!',
                  color: '#f5c542', ts: Date.now(),
                });
                try { BT_AUDIO.collect(); } catch (e) {}
              }
              break;
            }
          case 'combat_credit':
            {
              /* Server's combat-XP grant from a monster kill we
                 contributed to.  Carries the authoritative xpAmt + the
                 level-up confirmation.  The deterministic "+N XP"
                 popup still predicts client-side at monster_kill time
                 (same payload.xp * shares formula) so the player gets
                 instant feedback; this handler is for level-up only.
                 Combat-level regen (HP / stamina / mana to max) stays
                 client-side until its own slice migrates those pools
                 to the server. */
              if (!msg.payload || !S.rpg) break;
              var cc = msg.payload;
              if (cc.leveled) {
                setLevelUpMsg({ kind: 'combat', level: cc.newLevel || ((S.rpg && S.rpg.level) || 1), ts: Date.now() });
                try { BT_AUDIO.levelUp && BT_AUDIO.levelUp(); } catch (e) {}
                /* Pool restore on level-up: worker resets hp/stamina/mana
                   = max inside _addCombatXp and emits player_state alongside
                   this combat_credit, so R.* lands at max from the network.
                   No local write needed in MP. */
              }
              break;
            }
          case 'stat_allocated':
            {
              /* Server confirmed our stat_allocate request.  Apply
                 R[stat]++ locally, refresh the str/def/vit/spd/lck
                 aliases, and run recalcDerived so the dashboard
                 numbers update.  unspentT2 also mirrored here (the
                 player_state right after carries it too, but the
                 explicit value avoids any race). */
              if (!msg.payload || !S.rpg) break;
              var sa = msg.payload;
              if (!sa.stat) break;
              var Rsa = S.rpg;
              Rsa[sa.stat] = (Rsa[sa.stat] || 0) + 1;
              Rsa.str = Rsa.power;
              Rsa.def = Rsa.fortification;
              Rsa.vit = Rsa.vitality;
              Rsa.spd = Rsa.agility;
              Rsa.lck = Rsa.ferocity;
              if (typeof sa.newUnspentT2 === 'number') {
                Rsa.unspentT2 = sa.newUnspentT2;
              }
              Rsa.unspentPts = (Rsa.unspentT1 || 0) + (Rsa.unspentT2 || 0);
              recalcDerived(Rsa);
              setRpgState(_objectSpread({}, Rsa));
              try { localStorage.setItem('bt_rpg', JSON.stringify(Rsa)); } catch (e) {}
              break;
            }
          case 'zone_nodes':
            {
              _applyZoneNodesMsg(msg, S);
              break;
            }
          case 'zone_monsters':
            {
              _applyZoneMonstersMsg(msg, S);
              break;
            }
          case 'player_join':
            {
              var _msg$data, _msg$data2, _msg$data3, _msg$data4, _msg$data5, _msg$data6, _msg$data7, _msg$data8, _msg$data9, _msg$data0, _msg$data1, _msg$data10, _msg$data11, _msg$data12;
              S.others[msg.id] = {
                x: ((_msg$data = msg.data) === null || _msg$data === void 0 ? void 0 : _msg$data.x) || 0,
                y: ((_msg$data2 = msg.data) === null || _msg$data2 === void 0 ? void 0 : _msg$data2.y) || 0,
                _serverX: ((_msg$data = msg.data) === null || _msg$data === void 0 ? void 0 : _msg$data.x) || 0,
                _serverY: ((_msg$data2 = msg.data) === null || _msg$data2 === void 0 ? void 0 : _msg$data2.y) || 0,
                renderX: ((_msg$data3 = msg.data) === null || _msg$data3 === void 0 ? void 0 : _msg$data3.x) || 0,
                renderY: ((_msg$data4 = msg.data) === null || _msg$data4 === void 0 ? void 0 : _msg$data4.y) || 0,
                name: msg.name || 'Anon',
                color: ((_msg$data5 = msg.data) === null || _msg$data5 === void 0 ? void 0 : _msg$data5.color) || '#888',
                avatar: ((_msg$data6 = msg.data) === null || _msg$data6 === void 0 ? void 0 : _msg$data6.avatar) || null,
                dir: ((_msg$data7 = msg.data) === null || _msg$data7 === void 0 ? void 0 : _msg$data7.d) || 'down',
                bt: ((_msg$data8 = msg.data) === null || _msg$data8 === void 0 ? void 0 : _msg$data8.bt) || '#2563eb',
                bl: ((_msg$data9 = msg.data) === null || _msg$data9 === void 0 ? void 0 : _msg$data9.bl) || '#1e3a5f',
                headwear: (msg.data && msg.data.hw) || null,
                facialhair: (msg.data && msg.data.fh) || null,
                hair: (msg.data && msg.data.hr) || null,
                skin: (msg.data && msg.data.sk) || null,
                hairColor: (msg.data && msg.data.hc) || null,
                hatColor: (msg.data && msg.data.htc) || null,
                facialHairColor: (msg.data && msg.data.fhc) || null,
                shirt: (msg.data && msg.data.st) || null,
                shirtColor: (msg.data && msg.data.stc) || null,
                equip: { chest: (msg.data && msg.data.eqc) || 'none', legs: (msg.data && msg.data.eql) || 'none', shoulders: (msg.data && msg.data.eqs) || 'none',
                  shirt: (msg.data && msg.data.eqst !== undefined) ? (msg.data.eqst || 'none') : ((msg.data && msg.data.st && msg.data.st !== 'none') ? 'tshirt' : 'none') },
                pants: (msg.data && msg.data.pt) || null,
                shoes: (msg.data && msg.data.sh) || null,
                rpgLv: ((_msg$data0 = msg.data) === null || _msg$data0 === void 0 ? void 0 : _msg$data0.rpgLv) || 1,
                rpgHp: ((_msg$data1 = msg.data) === null || _msg$data1 === void 0 ? void 0 : _msg$data1.rpgHp) || 50,
                rpgMaxHp: ((_msg$data10 = msg.data) === null || _msg$data10 === void 0 ? void 0 : _msg$data10.rpgMaxHp) || 50,
                bodySize: ((_msg$data11 = msg.data) === null || _msg$data11 === void 0 ? void 0 : _msg$data11.bs) || 'slim',
                zone: ((_msg$data12 = msg.data) === null || _msg$data12 === void 0 ? void 0 : _msg$data12.z) || 'town'
              };
              setPlayerCount(function (prev) {
                setJoinFlash(true);
                setTimeout(function () {
                  return setJoinFlash(false);
                }, 1500);
                return prev + 1;
              });
              break;
            }
          case 'player_leave':
            {
              delete S.others[msg.id];
              setPlayerCount(function (prev) {
                return Math.max(1, prev - 1);
              });
              break;
            }
          case 'player_count':
            {
              setPlayerCount(msg.count);
              break;
            }
          case 'player_update':
            {
              if (S.others[msg.id]) {
                Object.assign(S.others[msg.id], msg.data);
                /* v2.3.599: track relays carry flat eqc/eql/eqs; rebuild the
                   nested other.equip the renderer reads so armour on/off syncs
                   (covers the standing-still case via the 2s track). */
                var _ud = msg.data || {};
                if (_ud.eqc !== undefined || _ud.eql !== undefined || _ud.eqs !== undefined) {
                  var _oe6 = S.others[msg.id].equip || { head: 'none', chest: 'none', legs: 'none', shoulders: 'none' };
                  S.others[msg.id].equip = {
                    chest: _ud.eqc !== undefined ? (_ud.eqc || 'none') : _oe6.chest,
                    legs: _ud.eql !== undefined ? (_ud.eql || 'none') : _oe6.legs,
                    shoulders: _ud.eqs !== undefined ? (_ud.eqs || 'none') : _oe6.shoulders,
                  };
                }
              }
              break;
            }
          case 'ping':
            {
              // §16.12 — Respond to server ping for RTT estimation
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'pong',
                  ts: msg.ts
                }));
              }
              break;
            }
          default:
            {
              /* All game events: chat, pvp, trade, emote, duel, etc. */
              var _payload = msg.payload || msg;
              _payload.id = _payload.id || msg.from;
              processGameEvent(msg.type, _payload, S, _gameEventDeps);
            }
        }
        } finally { _wsDone(); }
      };

      /* §16.10 — Shared game event dispatcher (used by both direct messages and batched tick events) */
      /* Thicken a server-authoritative loot pile (the worker's wire
         payload from loot_drop / zone_loot / state_sync.loot) into the
         shape the renderer + pickup filter consume.  The "coins" field
         is the player's own share (server's total * shares[myId]) so
         the existing renderer's "+Xg" label shows the right amount;
         watchers with no share get coins=0 and the renderer falls back
         to the dim "[killer]'s loot" view via the recipients gate. */
      function _buildServerPile(p, myId) {
        var myShare = (p.shares && typeof p.shares[myId] === 'number') ? p.shares[myId] : 0;
        var isDeath = !!p.isDeathDrop;
        return {
          lootId: p.lootId,
          x: isFinite(p.x) ? p.x : 0, y: isFinite(p.y) ? p.y : 0,
          coins: Math.round((p.coins || 0) * myShare),
          xp: 0,
          skull: p.skull || null,
          skullEmoji: p.skull ? '🦴' : null,
          shard: p.shard || null,
          /* Preserve null recipients for death drops -- the magnetism
             + bounce-back gates downstream check `loot.recipients` truthy,
             so null lets anyone walk over and trigger pickup. */
          recipients: p.recipients == null ? null : p.recipients,
          killerName: p.killerName || 'Player',
          ts: p.ts || Date.now(),
          inventoryClaimed: !!p.inventoryClaimed,
          /* Death-drop fields -- effectsRenderer renders aura/timer
             when isDeathDrop is set; expiry drives the urgency pulse.
             ownerOnlyUntil = wall-clock ms; after that the pile flips
             to free-for-all (anyone in zone can grab) until expiry. */
          isDeathDrop: isDeath,
          deathItems: isDeath ? (p.deathItems || []) : null,
          expiry: isDeath ? (p.expiry || null) : null,
          ownerOnlyUntil: isDeath ? (p.ownerOnlyUntil || null) : null,
          _serverLoot: true,
        };
      }

      /* Server-issued loot_credit handler.  The actual coin /
         inventory mutation lives in the player_state event that
         follows this one over the same WS (server is authoritative
         for the rpg store -- this handler stays purely cosmetic).
         Responsibilities here:
           * floating popups + SFX so the player feels the pickup
           * comp-stat increment (still local; will migrate later)
           * shard label lookup for the popup
           * despawn the picker's local copy of the pile
      */
      function _applyLootCredit(payload, S) {
        if (!S.rpg) return;
        var R = S.rpg;
        /* Server-loot path equivalent of the local pickup freeze in the
           groundLoot.filter at line ~9362. Sets the same gate variable
           so the movement gate, renderer facing override, and auto-swing
           suppression all kick in for MP loot too. Without this, the
           freeze only fired for single-player loot. */
        S._lootFreezeUntil = Date.now() + 500;
        if (payload.coins && payload.coins > 0) {
          if (R._compStats) R._compStats.totalGoldEarned = (R._compStats.totalGoldEarned || 0) + payload.coins;
          pushHudPopup(S, { target: 'goldIcon', text: '+' + payload.coins + ' G', color: '#f5c542' });
        }
        if (payload.shard) {
          var _pickedShard = shardByKey(payload.shard);
          S.dmgNumbers.push({
            x: S.player.x + 12, y: S.player.y - 22,
            text: '+ ' + (_pickedShard ? _pickedShard.label : 'Shard'),
            color: (_pickedShard && _pickedShard.color) || '#cce6ff',
            ts: Date.now(),
          });
        }
        if (payload.skull) {
          /* Local skull-counter tally still tracked client-side --
             not part of inventory; just a kill-trophy ledger.  Server
             doesn't replicate it. */
          if (!R.skulls) R.skulls = {};
          R.skulls[payload.skull] = (R.skulls[payload.skull] || 0) + 1;
        }
        /* Death-drop pickup: server bundles the dead player's whole
           general inventory under payload.items.  Authoritative R.inventory
           write rides on the player_state that follows; we only render
           the popup + recovered-count floater here. */
        if (payload.isDeathDrop && Array.isArray(payload.items) && payload.items.length > 0) {
          var _recovered = 0;
          payload.items.forEach(function (it) { _recovered += (it && it.qty) || 0; });
          if (_recovered > 0) {
            S.dmgNumbers.push({
              x: S.player.x, y: S.player.y - 20,
              text: 'RECOVERED ' + _recovered + ' items!',
              color: '#3dd497', ts: Date.now(),
            });
          }
        }
        BT_AUDIO.beep(500, 0.06, 0.1, 'sine');
        try { BT_AUDIO.collect && BT_AUDIO.collect(); } catch (e) {}
        /* Despawn the picker's local copy of the pile -- they're done
           with it.  v2.3.189: delay the actual despawn by 0.75 s so
           the pile remains visible while the pickup animation plays.
           The top-of-filter check in the pickup loop fires the dispose
           when Date.now() > _despawnAt. */
        if (payload.lootId && S.groundLoot) {
          for (var _glci = 0; _glci < S.groundLoot.length; _glci++) {
            if (S.groundLoot[_glci].lootId === payload.lootId) {
              S.groundLoot[_glci]._collected = true;
              S.groundLoot[_glci]._despawnAt = Date.now() + 500;
              break;
            }
          }
        }
      }

      /* Zone-snapshot appliers.  Shared between the legacy v1 trio
         (zone_monsters / zone_nodes / zone_loot, still sent by old
         workers) and the protocol-v2 merged zone_state message, which
         carries all three lists in one frame.  Bodies are the original
         case implementations, factored so both paths stay identical. */
      function _applyZoneMonstersMsg(msg, S) {
        /* Server sent the full monster list for a zone (sent on
           zone change).  Non-empty → server-authoritative,
           replace local snapshot.  Empty → server doesn't model
           this zone (dungeon, town); flip back to client-local
           and re-spawn if the local zone-change code skipped its
           spawn while the previous flag was still true. */
        if (!msg.monsters) return;
        if (msg.monsters.length > 0) {
          S._serverMonsters = true;
          S.monsters = msg.monsters.map(function(m) {
            var local = _objectSpread(_objectSpread({}, m), {}, {
              archetype: m.arch, type: m.arch,
              curHp: m.hp, renderX: m.x, renderY: m.y, spawnX: m.x, spawnY: m.y,
              alive: m.alive, statuses: {}, _hitThisSwing: false,
              _atkCd: 0, _stunUntil: 0, respawnAt: 0, moveTimer: 0, targetX: m.x, targetY: m.y,
              _stuckArrows: [],
            });
            applyZoneVariant(local, S.currentZone);
            /* See state_sync handler -- mirror the same spawn
               archetype stash so respawn can revert a transformed
               monster back to the zone's spawn variant. */
            local._spawnArchetype = local.archetype;
            return local;
          });
        } else {
          var _prevSrvFlag = S._serverMonsters;
          S._serverMonsters = false;
          /* If we just transitioned from a server-managed zone
             to a non-server zone, the local zone-change code
             skipped its spawnMonstersForZone call.  Re-spawn now
             for known ZONES entries (dungeons handle their own
             spawn in the depth-descent code). */
          if (_prevSrvFlag) {
            var _zn = ZONES[S.currentZone];
            if (_zn) S.monsters = spawnMonstersForZone(_zn);
          }
        }
      }

      function _applyZoneNodesMsg(msg, S) {
        /* Server sent the full gather-node list for a zone (sent on
           zone change).  Replace S.gatherNodes wholesale; the
           client-local spawnGatherNodes() and the v2.3.30 revive
           loop are gated on !S._serverGatherNodes so they stop
           running once we flip the flag here. */
        if (!msg.nodes) return;
        S._serverGatherNodes = true;
        var _zzone = msg.zone || S.currentZone;
        var _curZoneCfgZN = ZONES[S.currentZone];
        if (_curZoneCfgZN && _curZoneCfgZN.safe) {
          /* Safe zone -- never accept server resource nodes
             (v2.3.136). */
          S.gatherNodes = [];
        } else if (_zzone && _zzone !== S.currentZone) {
          /* Stale snapshot for a different zone -- ignore. */
        } else {
          S.gatherNodes = msg.nodes.map(function (n) {
            var local = createGatherNode(_zzone, 'shallow', n.x, n.y, n.nodeType, n.tierLvl);
            local.id = n.id;
            local.alive = !!n.alive;
            local.respawnAt = n.respawnAt || 0;
            return local;
          });
        }
      }

      function _applyZoneLootMsg(msg, S) {
        /* Sent on zone change.  Replace S.groundLoot with the new
           zone's authoritative pile list. */
        if (!msg.loot) return;
        S._serverLoot = true;
        var _curZoneCfgZL = ZONES[S.currentZone];
        var _zlzone = msg.zone;
        if (_curZoneCfgZL && _curZoneCfgZL.safe) {
          S.groundLoot = [];
        } else if (_zlzone && _zlzone !== S.currentZone) {
          /* Stale zone_loot for a different zone -- ignore. */
        } else {
          S.groundLoot = msg.loot.map(function (p) { return _buildServerPile(p, S.myId); });
        }
      }

      /* v2.3.783: _processGameEvent moved to src/networking/gameEvents.js
         (REBUILD-PLAN Phase 4). Its former closure captures are passed
         explicitly; built once per effect run (the setters and
         _buildServerPile are stable for the effect's lifetime). */
      var _gameEventDeps = {
        setRpgState: setRpgState,
        setChatLog: setChatLog,
        setUnreadChats: setUnreadChats,
        setDuelRequest: setDuelRequest,
        setThreatIncoming: setThreatIncoming,
        setLevelUpMsg: setLevelUpMsg,
        setIncomingTrade: setIncomingTrade,
        setArenaTournament: setArenaTournament,
        setArenaBets: setArenaBets,
        pixiRef: pixiRef,
        _buildServerPile: _buildServerPile
      };


      ws.onclose = function (event) {
        S._realtimeStatus = 'disconnected';
        /* v2.3.771: close-reason evidence.  NOTE this is the LIVE connection
           stack -- src/networking/wsClient.js is dead code (not in the
           bundle); fixes must land HERE. */
        try {
          import('../debug/crashTrap.js').then(function (ct) {
            ct.recordCrash('ws-close', 'code=' + (event && event.code) + ' reason=' + ((event && event.reason) || '(none)'));
          }).catch(function () {});
        } catch (e) {}
        /* v2.3.771: a LIVE page superseded by another login must not
           auto-reconnect (two windows would kick each other forever) --
           stop, tell the player, offer a manual take-over. */
        if (event && event.reason === 'superseded by reconnect') {
          S._realtimeStatus = 'superseded';
          try {
            var _el = document.createElement('div');
            _el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#1b2536;color:#fff;font:13px/1.5 sans-serif;padding:10px 12px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.5);';
            _el.textContent = 'This account connected from another window. ';
            var _btn = document.createElement('button');
            _btn.textContent = 'Play here instead';
            _btn.style.cssText = 'margin-left:8px;padding:4px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:#3dd497;color:#08231a;font-weight:700;cursor:pointer;';
            _btn.onclick = function () { _el.remove(); connect(); };
            _el.appendChild(_btn);
            document.body.appendChild(_el);
          } catch (e) { /* DOM unavailable */ }
          return;
        }
        scheduleReconnect();
      };
      ws.onerror = function () {
        S._realtimeStatus = 'disconnected';
      };
    }
    function scheduleReconnect() {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(function () {
        reconnectDelay = Math.min(reconnectDelay * 1.5, 10000);
        connect();
      }, reconnectDelay);
    }
    /* v2.3.771: iPhone tab-resume recovery.  iOS runs ONE Safari tab at a
       time: backgrounding freezes the page, kills the socket, and often
       reclaims the GPU context -- resuming showed a black, half-dead world
       until manual reload (reported as the 'two-window bug', but it hits
       anyone backgrounding Safari mid-fight).  On resume: reconnect a dead
       socket immediately (skip backoff) and rebuild the zone tiles once the
       restored context settles.  crashTrap's contextlost preventDefault
       (same version) lets the browser restore the GL context at all. */
    /* v2.3.778: how long were we actually gone?  Two clocks:
       _hiddenAt    -- visibilitychange to 'hidden' (when iOS bothers to fire it)
       _lastAliveAt -- 1s heartbeat; a frozen page stops ticking, so the gap
                       on resume IS the freeze length even with no events. */
    var RESYNC_AWAY_MS = 5000;
    var _hiddenAt = 0;
    var _lastAliveAt = Date.now();
    var _aliveTimer = setInterval(function () { _lastAliveAt = Date.now(); }, 1000);
    function _resumeRecover(tag) {
      try {
        import('../debug/crashTrap.js').then(function (ct) {
          ct.recordCrash('resume', tag + ' wsState=' + (ws ? ws.readyState : 'none'));
        }).catch(function () {});
      } catch (e) {}
      if (S._realtimeStatus !== 'superseded') {
        var _hiddenMs = _hiddenAt ? (Date.now() - _hiddenAt) : 0;
        var _frozenMs = Date.now() - _lastAliveAt - 1100; /* heartbeat period + slack */
        var _awayMs = Math.max(_hiddenMs, _frozenMs);
        if (!ws || ws.readyState === 2 || ws.readyState === 3) {
          /* dead socket: reconnect immediately, skip backoff (v2.3.771) */
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectDelay = 1000;
          try { connect(); } catch (e) {}
        } else if (ws.readyState === 1 && _awayMs > RESYNC_AWAY_MS) {
          /* v2.3.778: socket SURVIVED a long freeze ('[resume] visible
             wsState=1' in every crash log) = stale world.  Protocol v2
             sends only per-tick monster deltas; everything missed while
             frozen is never retransmitted -- the 'invisible monsters that
             still deal damage' session.  A deliberate rejoin gets a FULL
             state_sync (complete zone monster list) with zero server
             changes.  Detach handlers BEFORE closing so neither
             scheduleReconnect nor a late server 'superseded by reconnect'
             close can fire on the old socket. */
          try {
            import('../debug/crashTrap.js').then(function (ct) {
              ct.recordCrash('resume-resync', tag + ' away ' + Math.round(_awayMs / 1000) + 's, forcing rejoin');
            }).catch(function () {});
          } catch (e) {}
          var _oldWs = ws;
          ws = null;
          try {
            _oldWs.onclose = null;
            _oldWs.onmessage = null;
            _oldWs.onerror = null;
            _oldWs.close(1000, 'resume resync');
          } catch (e) {}
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectDelay = 1000;
          try { connect(); } catch (e) {}
        }
        /* readyState 0 (CONNECTING): a connect is already in flight. */
        _hiddenAt = 0;
        _lastAliveAt = Date.now();
      }
      /* v2.3.772: probe the GL context directly instead of trusting events.
         On the iPhone repro the context died with NO webglcontextlost ever
         firing (and a frozen tab can't record anything anyway), so:
         healthy context -> cheap tile rebuild; lost context -> give the
         browser a grace period to restore it (crashTrap + Pixi both
         preventDefault to request that), re-probe, and if still dead do a
         full renderer rebuild on a fresh canvas via _rebuildRenderer. */
      setTimeout(function () {
        try {
          /* v2.3.774: renderer never (re)initialized -- a prior init
             failed (iOS refused the context under GPU pressure) or a
             rebuild was cut short by a freeze.  Now that this tab is
             foreground again a fresh attempt usually succeeds. */
          if (window.__pixiActive === false) {
            if (window._rebuildRenderer) window._rebuildRenderer(tag + ': renderer dead on resume');
            return;
          }
          /* v2.3.774: stuck on the Canvas-renderer fallback (WebGL was
             refused during a rebuild and the backoff retries ran out
             while we were hidden) -- now that we're foreground, go again. */
          if (window.__btCanvasFallback) {
            if (window._rebuildRenderer) window._rebuildRenderer(tag + ': canvas fallback active, retrying WebGL');
            return;
          }
          /* v2.3.773: if the context was lost AT ALL while away, rebuild --
             even when it came back.  A restored context reports healthy but
             the baked render textures are gone (black world regardless). */
          if (window.__btGlLostAt && window.__btGlLostAt > (window.__btLastGlRebuild || 0)) {
            if (window._rebuildRenderer) window._rebuildRenderer(tag + ': context was lost while away');
            return;
          }
          var _r = window._pixiRenderer;
          var _gl = _r && _r.app && _r.app.renderer && _r.app.renderer.gl;
          if (!_gl || !_gl.isContextLost || !_gl.isContextLost()) {
            if (_r && _r.forceRefresh) _r.forceRefresh();
            return;
          }
          import('../debug/crashTrap.js').then(function (ct) {
            ct.recordCrash('gl-probe', tag + ': context LOST on resume, waiting for restore');
          }).catch(function () {});
          setTimeout(function () {
            try {
              var _r2 = window._pixiRenderer;
              var _gl2 = _r2 && _r2.app && _r2.app.renderer && _r2.app.renderer.gl;
              if (_gl2 && _gl2.isContextLost && _gl2.isContextLost()) {
                if (window._rebuildRenderer) window._rebuildRenderer(tag + ': context not restored 1.5s after resume');
              } else if (_r2 && _r2.forceRefresh) {
                _r2.forceRefresh();
              }
            } catch (e) {}
          }, 1500);
        } catch (e) {}
      }, 600);
    }
    try {
      document.addEventListener('visibilitychange', function () {
        /* v2.3.778: stamp when we go hidden so the resync threshold can
           use real away-time even when the heartbeat keeps ticking
           (desktop tab switches don't freeze JS). */
        if (document.visibilityState === 'hidden') { _hiddenAt = Date.now(); return; }
        if (document.visibilityState === 'visible') _resumeRecover('visible');
      });
      window.addEventListener('pageshow', function (e) {
        if (e && e.persisted) _resumeRecover('bfcache');
      });
    } catch (e) { /* ignore */ }

    /* Channel shim — wraps WebSocket with batched input protocol (§16.14)
     * Movement and non-critical events batch at 10Hz (100ms windows).
     * Combat-critical actions (attacks, PvP, duels, trades) flush immediately.
     * Track calls pass through unchanged (already throttled to 2s).
     */
    var PRIORITY_EVENTS = new Set(['pvp_confirmed', 'stunned', 'duel_accept', 'duel_decline', 'duel_wager_request', 'pvp_threat', 'threat_response', 'trade_offer', 'trade_accept', 'trade_reject', 'clan_war_kill', 'clan_war_end', 'clan_war_declare', 'clan_invite']);
    var INPUT_BATCH_WINDOW = 33; // ms — match server tick rate for smooth remote movement
    var _inputBuffer = [];
    var _pendingMove = null;
    var _batchTimer = null;
    function flushInputBuffer() {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      // Send pending move if any
      if (_pendingMove) {
        ws.send(JSON.stringify(_pendingMove));
        _pendingMove = null;
      }
      // Send all buffered events
      for (var i = 0; i < _inputBuffer.length; i++) {
        ws.send(JSON.stringify(_inputBuffer[i]));
      }
      _inputBuffer.length = 0;
    }
    function startBatchTimer() {
      if (_batchTimer) return;
      _batchTimer = setInterval(function () {
        if (_pendingMove || _inputBuffer.length > 0) flushInputBuffer();
      }, INPUT_BATCH_WINDOW);
    }
    function stopBatchTimer() {
      if (_batchTimer) {
        clearInterval(_batchTimer);
        _batchTimer = null;
      }
    }
    var channelShim = {
      send: function send(msg) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        /* Direct message types — sent immediately to server, not as broadcast events */
        if (msg.type === 'monster_damage') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'node_strike') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'loot_pickup') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'stat_allocate') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'cook_request') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'stats_update') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'ability_use') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'eat_request') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'shop_purchase') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'cook_recipe') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'equip_request') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'sell_weapon') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'forge_weapon') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'quest_accept') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'quest_turn_in') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'set_active_slot') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'broadcast' && msg.event) {
          if (msg.event === 'move') {
            // Movement: overwrite pending (only latest position matters)
            // §16.12 — Include combat state flags for lag compensation
            var p = msg.payload;
            var _S4 = stateRef.current;
            _pendingMove = {
              type: 'move',
              x: p.x,
              y: p.y,
              d: p.d || p.dir,
              /* v2.3.840: forward the 8-way facing + live equip too.  They
                 were in the broadcast payload but the shim dropped them, so
                 the server never saw them and peers fell back to a noisy
                 position-delta facing (wrong direction on fast turns) and
                 join-only armour. */
              f: p.f || null,
              eqc: p.eqc,
              eql: p.eql,
              eqs: p.eqs,
              z: p.z || p.zone,
              vx: p.vx || 0,
              vy: p.vy || 0,
              dodging: !!_S4._dodgeRoll,
              blocking: !!_S4._shieldUp,
              dead: _S4.rpg ? _S4.rpg.hp <= 0 : false
            };
            startBatchTimer();
          } else if (msg.event === 'player_attack') {
            // §16.12 — PvP attacks go directly to server for lag-compensated resolution
            flushInputBuffer();
            ws.send(JSON.stringify({
              type: 'player_attack',
              payload: msg.payload
            }));
          } else if (PRIORITY_EVENTS.has(msg.event)) {
            // Priority: flush buffer immediately, then send this event
            flushInputBuffer();
            ws.send(JSON.stringify({
              type: msg.event,
              payload: msg.payload
            }));
          } else {
            // Non-priority: buffer for next batch window
            _inputBuffer.push({
              type: msg.event,
              payload: msg.payload
            });
            startBatchTimer();
          }
        }
      },
      track: function track(data) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({
          type: 'track',
          data: data
        }));
      }
    };
    S.channel = channelShim;
    connect();
    return function () {
      stopBatchTimer();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(_aliveTimer); /* v2.3.778 resync heartbeat */
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }
      S.channel = null;
      S._realtimeStatus = 'disconnected';
    };
}
