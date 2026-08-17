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
import { stashPendingZoneNodes } from '@/networking/nodeSync.js'; /* v2.3.1301: node self-heal */
import { getDeviceNonce, generatePassphrase, passphraseToId } from '@/networking/index.js';
import { createGatherNode, spawnMonstersForZone, BT_AUDIO, ZONES, TILE, DEATH_GOLD_PENALTY, RARITY_TIERS, ZONE_RESOURCES, createDefaultCompStats, generateZoneMap, recalcDerived, updateZoneDimensions, setGridCapsEnabled, setT2SimpleEnabled, setT2BenchEnabled, setProg3Enabled, setAbilitiesEnabled, abilityRejectText, setElemBurstEnabled, PROG3_SKILL_META, PROG3 } from '@/data/index.js';
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
import { getEquip, syncArmorLayers } from '@/rendering/gearCatalog.js';
import { pushHudPopup } from '@/ui/XpFlyOverlay.jsx';

import { pushDmgPopup } from '@/game/combatHelpers.js';
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
    setTrade2 = ctx.setTrade2,
    setParty = ctx.setParty,
    setArenaTournament = ctx.setArenaTournament,
    setArenaBets = ctx.setArenaBets,
    setClanData = ctx.setClanData, /* v2.3.1611 */
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
          /* v2.3.1116: identity proof.  bp_ ids carry the passphrase so
             the worker can verify (or first-time register) ownership of
             the id.  Guest/random ids send none -- the worker treats
             them as unregistered throwaways (same as legacy clients). */
          phrase: (function () {
            try {
              return (S.myId && S.myId.indexOf('bp_') === 0) ? (localStorage.getItem('bt_passphrase') || undefined) : undefined;
            } catch (e) { return undefined; }
          })(),
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
          /* v2.3.1178: declare we attach the per-session state_sync
             token (x-bt-auth header) to mutating economy POSTs, so the
             worker ENFORCES it for this session. Old workers ignore
             the field. */
          httpAuth: true,
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
            /* v2.3.1155: rpgRestoration (and the other four retired T2
               seeds below) are off the join payload — the server's
               RAW_STATS fallback is T1-only now. */
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
            /* v2.3.1192 (amulet forge): nugget/bar ledger seed.  The
               worker owns these now (server/src/amulet.js); it captures
               this claim ONCE (clamped) for records that predate the
               server ledger, then the stored copy wins forever. */
            rpgGoldNuggets: (S.rpg && typeof S.rpg.goldNuggets === 'number') ? S.rpg.goldNuggets : 0,
            rpgGoldBars: (S.rpg && typeof S.rpg.goldBars === 'number') ? S.rpg.goldBars : 0,
            rpgWeaponStash: (S.rpg && Array.isArray(S.rpg.weaponStash)) ? S.rpg.weaponStash : [],
            /* Quest state bootstrap (slice 17). */
            rpgQuests: (S.rpg && S.rpg._quests) || {},
            rpgQuestFlags: (S.rpg && S.rpg._questFlags) || {},
            rpgQuestKills: (S.rpg && S.rpg._questKills) || {},
            rpgAchievementPoints: (S.rpg && typeof S.rpg.achievementPoints === 'number') ? S.rpg.achievementPoints : 0,
            /* v2.3.1021: weapon/defense skill track bootstrap.  Used on first
               connect (and as the migration fallback for existing players
               whose stored record predates server persistence) so trained
               weapon-skill levels / points / channels are captured server-side
               instead of staying localStorage-only. */
            rpgWeaponSkills: (S.rpg && S.rpg.weaponSkills) || {},
            rpgWeaponUnspent: (S.rpg && S.rpg.weaponUnspent) || {},
            rpgWeaponSpecs: (S.rpg && S.rpg.weaponSpecs) || {},
            rpgDefenseSkill: (S.rpg && S.rpg.defenseSkill) || { level: 0, xp: 0 },
            rpgDefenseUnspent: (S.rpg && typeof S.rpg.defenseUnspent === 'number') ? S.rpg.defenseUnspent : 0,
            rpgDefenseSpec: (S.rpg && S.rpg.defenseSpec) || {},
            /* v2.3.1154: HP/Endurance grid track (first-connect seed;
               stored copy wins on reconnect, mirroring the weapon track). */
            rpgHpSpec: (S.rpg && S.rpg.hpSpec) || {},
            rpgHpUnspent: (S.rpg && typeof S.rpg.hpUnspent === 'number') ? S.rpg.hpUnspent : undefined,
            rpgEnduranceSpec: (S.rpg && S.rpg.enduranceSpec) || {},
            rpgEnduranceUnspent: (S.rpg && typeof S.rpg.enduranceUnspent === 'number') ? S.rpg.enduranceUnspent : undefined
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
                  /* v2.3.1112: SELF-HEALING peer presence.  Peer entries were
                     created ONLY by the player_join event -- iOS Safari
                     suspends background tabs completely, so a join that
                     happened while this tab was suspended was missed forever:
                     ticks and player_update both skipped unknown ids, and no
                     later message ever re-created the entry ("1 online" in
                     one tab, "2 online" in the other).  The tick players
                     delta now CREATES unknown peers with placeholder
                     cosmetics; the peer's 2s track relay (player_update)
                     fills in name/avatar/gear moments later.  With the 1 Hz
                     idle keepalive every live player appears in a tick at
                     least once per second, so a resumed tab converges fast. */
                  if (!S.others[pid]) {
                    S.others[pid] = {
                      x: data.x, y: data.y, _serverX: data.x, _serverY: data.y,
                      renderX: data.x, renderY: data.y,
                      name: 'Anon', color: '#888', avatar: null,
                      dir: data.d || 'down', bt: '#2563eb', bl: '#1e3a5f',
                      headwear: null, facialhair: null, hair: null, skin: null,
                      hairColor: null, hatColor: null, facialHairColor: null,
                      shirt: null, shirtColor: null,
                      equip: { chest: 'none', legs: 'none', shoulders: 'none', shirt: 'none' },
                      pants: null, shoes: null, rpgLv: 1, rpgHp: 50, rpgMaxHp: 50,
                      bodySize: 'slim', zone: data.z || 'town',
                    };
                    setPlayerCount(Object.keys(S.others).length + 1);
                  }
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
                    /* v2.3.1092: current harvest activity (mine|chop|fish|cook|
                       fire, or null). Drives the remote body pose / skill
                       stand-in in the renderer. Absent (old server) => leave
                       untouched. */
                    if (data.ex !== undefined) S.others[pid]._ex = data.ex || null;
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
              /* v2.3.1112: GHOST SWEEP -- the symmetric bug to the missed
                 join: a peer who LEFT while this tab was suspended never got
                 its player_leave processed, leaving a frozen ghost forever.
                 With the 1 Hz idle keepalive every live player refreshes
                 _lastUpdate at least once a second, so an entry silent for
                 10s is gone from the room.  Swept at most once per second. */
              {
                var _gsNow = Date.now();
                if (!S._lastGhostSweep || _gsNow - S._lastGhostSweep > 1000) {
                  S._lastGhostSweep = _gsNow;
                  var _gsIds = Object.keys(S.others);
                  var _gsRemoved = false;
                  for (var _gsi = 0; _gsi < _gsIds.length; _gsi++) {
                    var _gsO = S.others[_gsIds[_gsi]];
                    if (!_gsO._lastUpdate) { _gsO._lastUpdate = _gsNow; continue; } /* grace for fresh entries */
                    if (_gsNow - _gsO._lastUpdate > 10000) { delete S.others[_gsIds[_gsi]]; _gsRemoved = true; }
                  }
                  if (_gsRemoved) setPlayerCount(Object.keys(S.others).length + 1);
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
                      /* v2.3.1735: adopt the worker's STUN clock (tick.js
                         sends `st` only while it is live).  Absolute epoch
                         ms, the same shape the local AI already writes for
                         its own stuns, so the renderer's stunActive test and
                         the star ring read one field either way.
                         MAX, never assignment: a local block-stun
                         (monsterCombat blockStunMs) may be running on this
                         monster too, and letting a shorter server clock
                         overwrite a longer local one would cut a stun the
                         player can see short.  When `st` is absent the
                         worker's stun has expired — but we do NOT clear,
                         because that same absence is what a purely local
                         stun looks like, and clearing here would delete it
                         every tick. */
                      if (typeof md.st === 'number' && md.st > Date.now()) {
                        localM._stunUntil = Math.max(localM._stunUntil || 0, md.st);
                      }
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
          case 'join_rejected':
            {
              /* v2.3.1148: the rejection REASON is load-bearing now.
                 The fresh-identity mint below is the correct response
                 ONLY to reason:'auth' (tampered localStorage / 31-bit
                 id collision -- the v2.3.1116 behavior).  A 'frozen'
                 rejection (operator freeze, docs/specs/admin.md) must
                 NOT mint: that would silently abandon the frozen
                 character and rejoin as a brand-new player --
                 freeze-evasion by accident.  Unknown future reasons
                 fail safe (no mint, no reconnect churn). */
              var _rejReason = msg.reason || 'auth';
              if (_rejReason === 'frozen') {
                S._frozenByAdmin = true; /* suppress reconnect churn */
                pushDmgPopup(S, S.player.x, S.player.y - 30, '🧊 Account frozen — contact the game owner', '#60a5fa', { ttl: 6 });
                console.error('[bt] join rejected: account frozen by the operator');
                break;
              }
              /* v2.3.1116: the worker refused our id -- the stored
                 passphrase doesn't match its auth record.  Mint a fresh
                 identity ONCE and let the auto-reconnect (the server
                 closes the socket after rejecting -> onclose ->
                 scheduleReconnect) rejoin under it.  A second rejection
                 means something is genuinely wrong -- stop churning
                 identities and surface it. */
              try {
                S._authRejects = (S._authRejects || 0) + 1;
                if (_rejReason === 'auth' && S._authRejects <= 1 && S.myId && S.myId.indexOf('bp_') === 0) {
                  var _newPf = generatePassphrase();
                  /* v2.3.1143: stash the phrase being destroyed -- this
                     regen is the one place a valid credential can be
                     irreversibly lost (e.g. a login attempt landing
                     inside someone else's brute-force lockout window).
                     The stash keeps it recoverable via the Account
                     panel's key display / devtools. */
                  try {
                    var _oldPf = localStorage.getItem('bt_passphrase');
                    if (_oldPf) localStorage.setItem('bt_passphrase_prev', _oldPf);
                  } catch (e2) {}
                  localStorage.setItem('bt_passphrase', _newPf);
                  /* The old character is unreachable under the new id --
                     drop the stale cache so the rejoin starts clean. */
                  localStorage.removeItem('bt_rpg');
                  S.myId = passphraseToId(_newPf);
                } else {
                  /* v2.3.1181: actually stop.  This branch logged "not
                     retrying" but nothing suppressed the reconnect: the
                     server closes with 4003 after rejecting, onclose only
                     special-cased frozen/4004, so scheduleReconnect looped
                     join->reject->close every 1-10s forever -- and each
                     attempt burned the server's 5-fails/60s per-id auth
                     budget, which could lock out the player's own Account-
                     panel login.  Flag it fatal like 'frozen' does. */
                  S._joinRejectedFatal = true;
                  console.error('[bt] join rejected by server (' + _rejReason + ') -- not retrying');
                }
              } catch (e) {}
              break;
            }
          case 'character_reset_done':
            {
              /* v2.3.1347: the server snapshotted + deleted our rpg blob
                 (self-service restart, persistence.js).  Wipe the local
                 per-character caches and reload -- the rejoin finds no
                 stored blob and bootstraps a fresh level-1 character.
                 KEEP identity (bt_passphrase / bt_passphrase_prev /
                 bt_device -- the Login Key survives a restart) and the
                 social keys (bt_friends / bt_clan / bt_blocked /
                 bt_muted); the character restarts, the account doesn't. */
              S._characterReset = true; /* onclose 4005 guard: no reconnect race */
              try {
                ['bt_rpg', 'bt_stats', 'bt_codex', 'bt_bestiary', 'bt_materials', 'bt_zones', 'bt_resume'].forEach(function (k) {
                  localStorage.removeItem(k);
                });
              } catch (e) {}
              try {
                sessionStorage.removeItem('bt_resume');
                sessionStorage.removeItem('bt_resume_now');
              } catch (e) {}
              try { window.location.reload(); } catch (e) {}
              break;
            }
          case 'state_sync':
            {
              /* v2.3.1119: server capability flags.  Settlement-aware
                 workers advertise what THEY handle (caps.trade etc.);
                 the legacy client-side credit paths stay in place but
                 only run when the server hasn't claimed the job. */
              S._serverCaps = msg.caps || {};
              /* v2.3.1576: the server's verified Hemi Bro for THIS player,
                 restored from storage if the link is still fresh.  Server-owned
                 — the client never writes it, it only renders from it. */
              if (S.rpg) S.rpg._bro = msg.bro || null;
              /* v2.3.1178: this session's private token for the
                 mutating HTTP economy endpoints (market place/cancel,
                 arena join/leave). Sent as the x-bt-auth header by
                 those call sites; absent against old workers, in which
                 case no header is attached. */
              S._httpToken = (typeof msg.httpToken === 'string') ? msg.httpToken : null;
              /* v2.3.1185: rosters are worker-memory only, so a deploy
                 (or room hop) may have wiped ours -- clear the party
                 HUD on every fresh sync.  The join path re-sends
                 party_state right after state_sync when the roster
                 survived, so a real party pops straight back. */
              try { if (setParty) setParty(null); S._party = null; } catch (e) {}
              /* v2.3.1154: HP/Endurance grid deploy-order gate.  The
                 pool multipliers only apply while THIS worker claims
                 caps.hpEndGrids — otherwise its player_state echo would
                 stomp a locally-boosted maxHp/maxStamina every flush.
                 Re-derive immediately so the gate takes effect now. */
              try {
                setGridCapsEnabled(!!(msg.caps && msg.caps.hpEndGrids));
                /* v2.3.1342: level-is-build deploy-order gate — the
                   client derives level = T2 points placed (cap 1000)
                   only while THIS worker claims caps.t2simple;
                   otherwise the worker's stat-sum level echo would
                   fight the local formula every player_state flush. */
                setT2SimpleEnabled(!!(S._serverCaps && S._serverCaps.t2simple));
                /* v2.3.1451: bench-locked T2 deploy-order gate — the
                   10 flat channels read the server-priced ps.t2Flat
                   accumulator only while THIS worker claims
                   caps.t2bench; otherwise every helper keeps the
                   legacy t2Accel math that matches the old worker's
                   authoritative rolls and echoes. */
                setT2BenchEnabled(!!(S._serverCaps && S._serverCaps.t2bench));
                /* v2.3.1660: prog3 deploy-order gate — the trained-
                   skill rebuild's Build UI, allocation sends, pool
                   formulas and damage readouts all run only while
                   THIS worker claims caps.prog3 (its player_state
                   carries the server-owned rpg.prog3 blob).  Against
                   an old worker everything keeps the legacy T2 math
                   that matches that worker's rolls and echoes. */
                setProg3Enabled(!!(S._serverCaps && S._serverCaps.prog3));
                /* v2.3.1733: stamina-abilities deploy-order gate.  The two
                   ability BUTTONS render and the `ability` message is sent
                   only while THIS worker claims caps.abil — an old worker
                   has no `case 'ability'`, so it would relay the message as
                   an unknown broadcast, never settle it, and the player
                   would watch a predicted stamina bar drain for nothing. */
                setAbilitiesEnabled(!!(S._serverCaps && S._serverCaps.abil));
                /* v2.3.1734: Element Burst + the flat special cost.  BOTH
                   gate on this flag, and the second one is the subtle
                   half: _abilityCost is charged by the WORKER, so a new
                   client against an OLD worker must keep predicting
                   floor(maxMana/5) or its local mana drifts from the wire
                   on every cast and the charge pie draws segments the
                   worker will not fund (rule 19). */
                setElemBurstEnabled(!!(S._serverCaps && S._serverCaps.elemBurst));
                if (S.rpg) recalcDerived(S.rpg);
              } catch (e) {}
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
                  /* v2.3.1301: mismatched snapshot is BUFFERED, not
                     dropped — if it raced the S.currentZone flip by a
                     frame, onZoneEntered applies it (the old silent
                     drop left the zone permanently node-less). */
                  stashPendingZoneNodes(S, _nzone, msg.nodes);
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
                pushDmgPopup(S, S.player.x, S.player.y - 40, '+' + msg.payload.refund + ' HP', '#3dd497');
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
                pushDmgPopup(S, S.player.x, S.player.y - 24, 'pickup: ' + (msg.payload.reason || 'unknown'), '#f5c542');
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
              /* v2.3.1192 (amulet forge): nugget/bar ledger -- the
                 worker owns these now (server/src/amulet.js validates
                 + consumes smelt/craft server-side, and rolls the
                 monster-kill nugget drop).  Adopt present-gated like
                 the other server-owned scalars; an increase in
                 goldNuggets is the server-rolled drop landing, so fire
                 the legacy "Gold Nugget!" popup here (the local roll in
                 monsterCombat.js is gated off under caps.amuletForge
                 and no private credit event exists for this). */
              if (typeof msg.payload.goldNuggets === 'number') {
                if (S.player && msg.payload.goldNuggets > (S.rpg.goldNuggets || 0)) {
                  pushDmgPopup(S, S.player.x, S.player.y - 40, 'Gold Nugget!', '#f5c542');
                  try { BT_AUDIO.beep(1000, 0.08, 0.1, 'sine'); } catch (e) {}
                }
                S.rpg.goldNuggets = msg.payload.goldNuggets;
              }
              if (typeof msg.payload.goldBars === 'number') {
                S.rpg.goldBars = msg.payload.goldBars;
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
                /* v2.3.1198 (gem income): under caps.gems the worker
                   owns lifeSkills.gems (kill drops rolled in
                   _gemRawOnKill, cuts settled in _handleGemCut) -- a
                   raw_<elem> INCREASE in the echo is the server-rolled
                   kill drop landing, so fire the legacy "Raw X Gem!"
                   popup here (monsterCombat's local roll is gated off;
                   no private credit event exists for this -- the
                   v2.3.1192 goldNuggets-popup pattern, including its
                   accepted one-time popup on a migration join where
                   the server captured more than localStorage holds). */
                if (S._serverCaps && S._serverCaps.gems && S.player
                  && msg.payload.lifeSkills.gems && typeof msg.payload.lifeSkills.gems === 'object') {
                  var _oldGems = (S.rpg.lifeSkills && S.rpg.lifeSkills.gems) || {};
                  var _newGems = msg.payload.lifeSkills.gems;
                  Object.keys(_newGems).forEach(function (_gk) {
                    if (_gk.indexOf('raw_') !== 0) return;
                    if ((_newGems[_gk] || 0) <= (_oldGems[_gk] || 0)) return;
                    var _gElem = _gk.slice(4);
                    var _gRes = ZONE_RESOURCES[_gElem];
                    pushDmgPopup(S, S.player.x, S.player.y - 65,
                      'Raw ' + ((_gRes && _gRes.gem) || _gElem + ' Gem') + '!',
                      (_gRes && _gRes.gemColor) || '#fff');
                  });
                }
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
                 fold is retired -- server's hp / maxHp are authoritative.
                 v2.3.1697: ...and there is no armor bonus in maxHp on
                 EITHER side any more (owner directive; armor pays out as
                 damage reduction).  The echo staying authoritative is what
                 makes that deploy-order safe: a worker still running the
                 old fold just sends its higher number and the client shows
                 it, instead of the two formulas fighting. */
              /* ═══ v2.3.1698: THE POOLS ARE APPLIED LAST, NOT HERE ═══
                 Owner: headless playtest — a brand-new character stood in
                 town at 100/106 HP forever, while the worker's stored blob
                 said 106/106 and therefore never regenerated or re-emitted.
                 Measured with a property watcher on S.rpg.hp: this handler
                 wrote the server's 106, and then `if (_armorChanged)
                 recalcDerived(S.rpg)` (~120 lines below) wrote it back to
                 100.  That recalc runs BEFORE `S.rpg.prog3` is adopted from
                 this same payload, so prog3Live() is false and recalcDerived
                 takes its LEGACY branch: it recomputes rpg.level from the
                 frozen T1 stats (all 0 under prog3 => level 1), sets
                 maxHp = calcMaxHp(1, 0) = 100, and clamps hp down to it.
                 `'armor' in msg.payload` is true in every full join
                 snapshot, so this fired on EVERY join for EVERY prog3
                 player — and the clamp target is the constant 100, so a
                 character with a real maxHp of 300 joined showing 100.
                 The comment above already states the rule this broke: the
                 server's hp/maxHp are AUTHORITATIVE.  So the assignments
                 move to the end of the handler, after every recalcDerived
                 it can run, instead of racing them.  Captured here (rather
                 than re-read down there) purely so the payload guard and
                 the write stay next to the comment explaining them. */
              var _poolsFromServer = {
                hp: typeof msg.payload.hp === 'number' ? msg.payload.hp : null,
                maxHp: typeof msg.payload.maxHp === 'number' ? msg.payload.maxHp : null,
                stamina: typeof msg.payload.stamina === 'number' ? msg.payload.stamina : null,
                maxStamina: typeof msg.payload.maxStamina === 'number' ? msg.payload.maxStamina : null,
                mana: typeof msg.payload.mana === 'number' ? msg.payload.mana : null,
                maxMana: typeof msg.payload.maxMana === 'number' ? msg.payload.maxMana : null,
              };
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
                 value is falsy, keep whatever the client has.
                 v2.3.1683 (owner: "I want it to be received in inventory
                 first not automatically equipped"): a shield the server
                 reports goes into the BAG, never straight onto the arm.
                 The server's `shield` field is an OWNERSHIP record — there
                 is no server-side shield stash (handoff rule 1 forbids a new
                 rpg-blob field) so equipped-vs-stashed has always been the
                 client's to decide, and this line decided it wrong: it wrote
                 the server's value into the EQUIPPED slot every time.
                 "Do I already hold this?" is what makes that safe to repeat:
                 the full player_state on every reconnect re-reports the same
                 shield, so an unconditional push would hand out a fresh copy
                 per reload, and a player who already had it equipped before
                 this version would get a second one in the bag.  Matching by
                 value means a shield we already hold — on the arm OR in the
                 bag — is recognised and ignored, and only a genuinely new
                 grant lands. */
              if ('shield' in msg.payload && msg.payload.shield) {
                var _svShield = msg.payload.shield;
                var _shSig = function (sh) {
                  return !sh ? '' : [sh.name || '', sh.gearBase || '',
                    sh.tierMult == null ? '' : sh.tierMult, sh.tier || ''].join('|');
                };
                var _wantSig = _shSig(_svShield);
                if (!Array.isArray(S.rpg.shieldStash)) S.rpg.shieldStash = [];
                var _held = _shSig(S.rpg.shield) === _wantSig
                  || S.rpg.shieldStash.some(function (sh) { return _shSig(sh) === _wantSig; });
                if (!_held) S.rpg.shieldStash.push(_svShield);
              }
              if ('amulet' in msg.payload) S.rpg.amulet = msg.payload.amulet;
              /* v2.3.1697: adopt the worker's legs piece.  ps.legsArmor has
                 been a real persisted field + echo since v2.3.1679, but no
                 client ever read it -- so the Hero pane's new armour
                 readout would have shown the chest half of a two-piece
                 formula and quietly disagreed with the damage the server
                 actually deals.  Read-only (there is no client legs-armour
                 equip path yet); the worker owns the slot. */
              if ('legsArmor' in msg.payload) { S.rpg.legsArmor = msg.payload.legsArmor; _armorChanged = true; }
              /* v2.3.1703: the WORN LAYER is derived from these two fields
                 (gearCatalog.syncArmorLayers), so the worker's echo has to
                 drive it as well as the local equip screens — otherwise a
                 reload, a device switch, or a quest reward applied
                 server-side leaves the character bare while the stats say
                 armoured.  Runs on every payload that mentions either
                 field, which is every full snapshot and any delta that
                 changed one. */
              if (_armorChanged) { try { syncArmorLayers(S.rpg); } catch (e) {} }
              /* v2.3.227 (Phase 1): armor swaps changed maxHp via
                 getArmorHp() in recalcDerived.
                 v2.3.1697: armor no longer touches maxHp, so this recompute
                 is no longer load-bearing for HP -- kept because it is the
                 one re-derive after a server-echoed equipment change and
                 also refreshes the amulet/shield bonus caches. */
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
              /* v2.3.1021: weapon/defense skill track -- worker is now the
                 durable store.  Adopt the echoed values (present-gated) so a
                 reconnect / device switch restores trained levels / points /
                 channels.  In protocol v2 these only arrive in a delta when
                 they actually changed server-side (which only happens right
                 after the client itself reported them via stats_update), so
                 mid-session this is idempotent and never stomps live training. */
              if (msg.payload.weaponSkills && typeof msg.payload.weaponSkills === 'object') S.rpg.weaponSkills = msg.payload.weaponSkills;
              if (msg.payload.weaponUnspent && typeof msg.payload.weaponUnspent === 'object') S.rpg.weaponUnspent = msg.payload.weaponUnspent;
              if (msg.payload.weaponSpecs && typeof msg.payload.weaponSpecs === 'object') S.rpg.weaponSpecs = msg.payload.weaponSpecs;
              if (msg.payload.defenseSkill && typeof msg.payload.defenseSkill === 'object') S.rpg.defenseSkill = msg.payload.defenseSkill;
              if (typeof msg.payload.defenseUnspent === 'number') S.rpg.defenseUnspent = msg.payload.defenseUnspent;
              if (msg.payload.defenseSpec && typeof msg.payload.defenseSpec === 'object') S.rpg.defenseSpec = msg.payload.defenseSpec;
              /* v2.3.1154: HP/Endurance grid track — same adopt rules. */
              if (msg.payload.hpSpec && typeof msg.payload.hpSpec === 'object') S.rpg.hpSpec = msg.payload.hpSpec;
              if (typeof msg.payload.hpUnspent === 'number') S.rpg.hpUnspent = msg.payload.hpUnspent;
              if (msg.payload.enduranceSpec && typeof msg.payload.enduranceSpec === 'object') S.rpg.enduranceSpec = msg.payload.enduranceSpec;
              if (typeof msg.payload.enduranceUnspent === 'number') S.rpg.enduranceUnspent = msg.payload.enduranceUnspent;
              /* v2.3.1451: bench-locked T2 accumulator — adopted
                 WHOLESALE, presence-gated.  This echo is the drift
                 corrector for the client's spend-time prediction
                 (SpendPointConfirm): the server priced the same diff
                 with the same helpers, so normally the numbers are
                 identical and this is a no-op; after a clamp,
                 truncation, or stale-echo scale they converge here. */
              if (msg.payload.t2Flat && typeof msg.payload.t2Flat === 'object') S.rpg.t2Flat = msg.payload.t2Flat;
              /* v2.3.1660: prog3 trained-skill track — adopted
                 WHOLESALE, presence-gated.  Server-owned end to end
                 (the worker never reads it back from us), so the echo
                 IS the state: trained levels/xp, the seven-stat
                 alloc, and the point pool all land here and the
                 recalc below re-derives level + pools from them. */
              if (msg.payload.prog3 && typeof msg.payload.prog3 === 'object') { S.rpg.prog3 = msg.payload.prog3; recalcDerived(S.rpg); }
              /* v2.3.1624: the five T1 raw stats, adopted present-gated.
                 The server has always PERSISTED these but never echoed
                 them, so a client with no localStorage copy (new device,
                 Login Key, cleared data) started at 0, reported 0 back in
                 its very first stats_update, and the worker wrote the 0
                 over the stored value -- a character wipe triggered by
                 nothing more than logging in somewhere new.  Adopting the
                 echo BEFORE that first emit is what closes the loop.
                 Mid-session these only arrive in a v2 delta when they
                 actually changed server-side (i.e. right after this
                 client reported them), so it stays idempotent and never
                 stomps live use-training -- same posture as the
                 weaponSkills block above. */
              /* v2.3.1630: ADOPT UPWARD ONLY.
                 The naive "adopt whatever arrives" version made a
                 long-standing SILENT server clamp suddenly visible as a
                 stat collapse at login.  _statCap is level*10+20 and,
                 since v2.3.1342, level = 1 + T2 points PLACED -- so a
                 player who has never opened the grid-spend UI sits at
                 level 1, cap 30, while their client has use-trained
                 power to 58.  The server has always settled damage on
                 30; the client has always displayed 58.  Adopting the
                 echo unconditionally would drop the dashboard 58 -> 30
                 on the next login and read as "the update stole my
                 stats", when nothing was actually lost -- the 58 was
                 never real.
                 That divergence is a genuine issue, but it is a DISPLAY
                 vs SETTLEMENT problem that predates this change, and
                 surfacing it as a one-time visible loss is not something
                 an audit follow-up should do by surprise.  It is written
                 up separately instead.
                 So: adopt when the client has no value (the new-device
                 case audit C-2 is actually about -- local 0, echo 47),
                 and never adopt a value LOWER than the client's, which
                 is only ever the invisible clamp talking. */
              var _t1Changed = false;
              var _adoptT1 = function (k) {
                var v = msg.payload[k];
                if (typeof v !== 'number') return;
                var cur = S.rpg[k];
                var unset = typeof cur !== 'number' || cur === 0;
                if (!unset && v <= cur) return;   // clamp echo: ignore
                if (cur === v) return;
                S.rpg[k] = v;
                _t1Changed = true;
              };
              _adoptT1('power'); _adoptT1('vitality'); _adoptT1('endurance');
              _adoptT1('agility'); _adoptT1('mind');
              /* Seeing ANY of the five (even one we chose not to adopt)
                 proves this worker echoes them, which is what entitles
                 the client to report them at all -- see _t1StatsPayload
                 in BroTown.jsx.  Without this an old-worker session
                 would stay unseeded forever and never sync T1 again. */
              if (typeof msg.payload.power === 'number'
                  || typeof msg.payload.vitality === 'number'
                  || typeof msg.payload.endurance === 'number'
                  || typeof msg.payload.agility === 'number'
                  || typeof msg.payload.mind === 'number') {
                S._t1Seeded = true;
              }
              /* v2.3.1624: maxHp / stamina / mana and the display formulas
                 are all derived from these five, so recompute on a real
                 change -- the same reason the armor adopt above calls it.
                 Gated on an ACTUAL change (not mere presence) so the
                 steady-state echo, where the server is just repeating what
                 this client reported, stays a no-op and cannot feed the
                 stats_update effect in BroTown.jsx a fresh signature every
                 tick -- that shape was the v2.3.1158 "coins flashing"
                 storm, and the server's own mutation gate is the other
                 half of the brake. */
              if (_t1Changed) recalcDerived(S.rpg);
              /* v2.3.1698: the server's pools land HERE — after every
                 recalcDerived this handler can run — so a local formula can
                 never clamp away the number the worker just told us.  See
                 the block near the top of this case for the incident. */
              for (var _pk in _poolsFromServer) {
                if (_poolsFromServer[_pk] !== null) S.rpg[_pk] = _poolsFromServer[_pk];
              }
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
              pushDmgPopup(S, S.player.x, S.player.y - 40, 'YOU DIED', '#ff5e6c');
              if (_goldLost3 > 0) pushDmgPopup(S, S.player.x, S.player.y - 55, '-' + _goldLost3 + 'G', '#fbbf24');
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
              /* v2.3.1127: dying inside a dungeon leaves it -- clear
                 the dungeon flags the legacy path left stale (harmless
                 then, but a stale _serverDungeon would suppress the
                 local wave engine and pin the synthetic ZONES entry). */
              if (S._serverDungeon) {
                if (ZONES[S._serverDungeon] && ZONES[S._serverDungeon]._instance) delete ZONES[S._serverDungeon];
                S._serverDungeon = null;
              }
              S._inDungeon = false;
              S._inCustomDungeon = false;
              S._customDungeonConfig = null;
              S._dungeonComplete = false;
              S._dungeonBossSpawned = false;
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
                pushDmgPopup(S, S.player.x, S.player.y - 54, '+ ' + (_pickedHShard ? _pickedHShard.label : 'Shard'), (_pickedHShard && _pickedHShard.color) || '#cce6ff');
              }
              if (hc.leveled && hc.skillName) {
                var _sklEmoji = hc.skillName === 'fishing' ? '🎣' : hc.skillName === 'woodcutting' ? '🪓' : '⛏';
                var _sklLabel = hc.skillName.charAt(0).toUpperCase() + hc.skillName.slice(1);
                pushDmgPopup(S, S.player.x, S.player.y - 50, _sklEmoji + ' ' + _sklLabel + ' Level ' + (hc.newLevel || '?') + '!', '#f5c542');
                try { BT_AUDIO.collect(); } catch (e) {}
              }
              break;
            }
          case 'gem_cut_result':
            {
              /* v2.3.1198: server's outcome for a gem_cut_request the
                 client just sent (GemcutPanel under caps.gems).  The
                 cut roll is server-owned RNG (harvest_credit's shard
                 precedent) so the Polished!/shattered popups wait for
                 this event; the authoritative gems map + gemCutting XP
                 ride the player_state echo the worker sends alongside. */
              if (!msg.payload || !S.rpg || !S.player) break;
              var gcr = msg.payload;
              var _gcRes = ZONE_RESOURCES[gcr.gem];
              var _gcName = (_gcRes && _gcRes.gem) || (gcr.gem + ' Gem');
              var _gcCol = (_gcRes && _gcRes.gemColor) || '#fff';
              if (gcr.success) {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Polished ' + _gcName + '!', _gcCol);
                try { BT_AUDIO.collect(); } catch (e) {}
              } else {
                pushDmgPopup(S, S.player.x, S.player.y - 30, 'Gem shattered!', '#ff5e6c');
                try { BT_AUDIO.beep(200, 0.06, 0.1, 'square'); } catch (e) {}
              }
              if (gcr.leveled) {
                pushDmgPopup(S, S.player.x, S.player.y - 50, 'Gem Cutting Lv' + (gcr.newLevel || '?') + '!', '#f5c542');
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
              /* v2.3.1155: def/lck aliased the retired fortification/
                 ferocity — pinned 0 for every live player, now literal. */
              Rsa.def = 0;
              Rsa.vit = Rsa.vitality;
              Rsa.spd = Rsa.agility;
              Rsa.lck = 0;
              if (typeof sa.newUnspentT2 === 'number') {
                Rsa.unspentT2 = sa.newUnspentT2;
              }
              Rsa.unspentPts = (Rsa.unspentT1 || 0) + (Rsa.unspentT2 || 0);
              recalcDerived(Rsa);
              setRpgState(_objectSpread({}, Rsa));
              try { localStorage.setItem('bt_rpg', JSON.stringify(Rsa)); } catch (e) {}
              break;
            }
          case 'prog3_level':
            {
              /* v2.3.1660: a TRAINED skill leveled server-side — under
                 the rebuild this IS the character level-up (level = Σ
                 trained), so the celebration fires here instead of the
                 retired client award path.  The worker restored the
                 pools and queued a player_state flush with the new
                 prog3 blob; this event exists for the banner + SFX so
                 they don't wait a round-trip. */
              if (!msg.payload || !S.rpg) break;
              var p3l = msg.payload;
              var p3meta = PROG3_SKILL_META.find(function (m) { return m.key === p3l.skill; });
              /* v2.3.1687 (owner: "it shows melee, bow, and magic as +1
                 simultaneously"): remember WHICH skill just levelled, so the
                 dashboard badges the unspent point on that chip alone
                 instead of on all three (DashColumns).  Client-only field —
                 it rides along in bt_rpg so a reload keeps the attribution,
                 and _saveRpg's fixed field list ignores it server-side. */
              if (typeof p3l.skill === 'string') S.rpg._p3PoolFrom = p3l.skill;
              /* ═══ v2.3.1727: SAY WHAT THE LEVEL BOUGHT ═══
                 Owner, after judging: "I DO want leveling to feel more
                 powerful."  Half of that is the retune (server prog3.js);
                 the other half is telling the player what they just got.
                 The banner said "You got stronger!" and left them to infer
                 it from a health bar, which is exactly how ten levels can
                 pass without feeling like anything.  Built here rather than
                 in the banner because the constants already live on this
                 side of the import graph. */
              var _dmgPer = (PROG3.DMG_PER_LEVEL && PROG3.DMG_PER_LEVEL[p3l.skill]) || 0;
              var _gains = [];
              if (_dmgPer > 0) _gains.push('+' + _dmgPer + ' damage');
              if (PROG3.HP_PER_LEVEL > 0) _gains.push('+' + PROG3.HP_PER_LEVEL + ' max HP');
              _gains.push('+1 point to spend');
              /* v2.3.1733: ...and name the MILESTONE, when this level crossed
                 one.  A new button appearing on the HUD with no explanation
                 is the same "level 13 doesn't feel different" problem in a
                 new costume — the unlock is the loudest thing a level can
                 buy, so it goes first in the line.  The fields are optional:
                 an old worker sends neither and the banner reads as before. */
              if (p3l.bonusPoints > 0) _gains.push('+' + p3l.bonusPoints + ' bonus point');
              if (p3l.milestone) _gains.unshift(p3l.milestone + ' unlocked!');
              setLevelUpMsg({
                kind: 'combat',
                level: p3l.charLevel || ((S.rpg && S.rpg.level) || 3),
                skillLabel: p3meta ? p3meta.label : null,
                skillLevel: p3l.level,
                gains: _gains.join(' \xB7 '),
                ts: Date.now(),
              });
              try { BT_AUDIO.levelUp && BT_AUDIO.levelUp(); } catch (e) {}
              break;
            }
          case 'quest_reward_stashed':
            {
              /* v2.3.1687 (owner: "I turned in the fire goblin remnants and
                 never received the quest reward").  The worker could not put
                 the armour on — that slot is already worn, and it will not
                 replace something the player chose — and it has no armour
                 stash of its own to overflow into.  So it hands the piece
                 here, to the bag the client already owns, rather than
                 dropping it: the quest used to complete, pay the gold, and
                 never mention the item again.
                 Guarded against re-delivery by value the same way the shield
                 adopt is, because any repeat of this event (a resend, a
                 reconnect that replays it) must not mint a second copy. */
              /* ═══ v2.3.1701: THE SLOT TRAVELS WITH THE PIECE ═══
                 Owner: "Iron Greaves" equipped to the CHEST.  The worker has
                 sent `slot` since v2.3.1695 ('armor' | 'legsArmor', quests.js
                 _grantQuestItem) and this handler dropped it on the floor:
                 every piece went into `armorStash`, which ItemDetailPopup
                 swaps against R.armor.  So the tut_4 greaves — granted as
                 kind:'legs' precisely because the owner wanted legs first
                 ("animations look better with legs only than they do chest
                 only") — landed on the torso, which defeats the change that
                 created them.
                 A legs piece now rides its own `legsStash` and equips into
                 R.legsArmor: the field the LEGS card reads (equipModel.js
                 getArmorPieceDr(R.legsArmor,'legs')), the field the worker
                 stores (persistence.js) and the field the SERVER's damage
                 reduction reads (combat.js _armorDrMult).  Anything else
                 would have been a piece that looks equipped and mitigates
                 nothing. */
              if (!msg.payload || !msg.payload.item || !S.rpg) break;
              var _qrs = msg.payload.item;
              var _qrsLegs = _qrs.slot === 'legsArmor';
              var _qrsName = String(_qrs.name || 'Quest Armor');
              var _qrsTm = Number(_qrs.tierMult) || 1;
              var _qrsKey = _qrsLegs ? 'legsStash' : 'armorStash';
              if (!Array.isArray(S.rpg[_qrsKey])) S.rpg[_qrsKey] = [];
              var _qrsWorn = _qrsLegs ? S.rpg.legsArmor : S.rpg.armor;
              var _qrsHeld = (_qrsWorn && _qrsWorn.name === _qrsName)
                || S.rpg[_qrsKey].some(function (a) {
                  return a && a.name === _qrsName && (Number(a.tierMult) || 1) === _qrsTm;
                });
              if (!_qrsHeld) {
                /* v2.3.1758: the METAL rides with the piece into the bag.  It
                   is what gearVariants resolves the art and the icon from, so
                   dropping it here would put a copper-named piece on the
                   character in steel — the same class of bug as v2.3.1701
                   dropping `slot`. */
                S.rpg[_qrsKey].push({ name: _qrsName, tierMult: _qrsTm,
                  slot: _qrsLegs ? 'legsArmor' : 'armor',
                  mat: _qrs.mat ? String(_qrs.mat).slice(0, 16) : undefined });
                try { localStorage.setItem('bt_rpg', JSON.stringify(S.rpg)); } catch (e) {}
              }
              /* ═══ v2.3.1746: A REWARD IS NOT A DANGER ═══
                 Owner: "right now it says 'danger iron graves were added to
                 your bag' for reward completion which is not the message I
                 want.  It's not a danger for iron greaves or the torso."
                 They were right, and it was not a copy mistake — this fired
                 the LEVEL-UP banner with kind:'warning', whose whole job is
                 the red zone-gate warning, so it rendered a literal
                 "⚠️ DANGER" headline over the good news that a quest had
                 just paid out.  It borrowed that banner because it was the
                 only screen-space one that could carry arbitrary text.
                 There is a right one now (v2.3.1745), so use it: brass
                 "QUEST REWARD", the piece's name, and the one instruction
                 that actually matters.
                 `queue: true` because this arrives a few hundred ms after
                 the player's own QUEST COMPLETED! banner and must not wipe
                 it — see the queue rule in BroTown.jsx. */
              if (typeof window !== 'undefined' && typeof window._setQuestMsg === 'function') {
                window._setQuestMsg({
                  kind: 'reward',
                  title: _qrsName,
                  sub: _qrsLegs
                    ? 'In your bag — equip it on your legs'
                    : 'In your bag — your chest slot was already full',
                  queue: true,
                  ts: Date.now(),
                });
              }
              break;
            }
          case 'chain_score_recorded':
            {
              /* v2.3.1664: the server wrote this run's milestone to Hemi
                 (contracts/BroTownScores.sol).  Server-emitted only — it is
                 in PRIVILEGED_EVENTS, because a forged one would paint a
                 fake block-explorer link.
                 Kept on S.rpg so it rides the existing localStorage
                 persistence and the Records tab can offer the link long
                 after the popup has faded; the chain is the durable copy,
                 this is just the receipt. */
              if (!msg.payload || !S.rpg) break;
              var cs = msg.payload;
              if (!cs.txHash) break;
              S.rpg._chainScore = {
                level: cs.level, kills: cs.kills, milestone: cs.milestone,
                txHash: cs.txHash, explorer: cs.explorer, at: Date.now(),
              };
              if (S.player) {
                pushDmgPopup(S, S.player.x, S.player.y - 70,
                  'ON-CHAIN ✓ Lv ' + cs.level, '#8FD3C7');
              }
              setRpgState(_objectSpread({}, S.rpg));
              try { localStorage.setItem('bt_rpg', JSON.stringify(S.rpg)); } catch (e) {}
              break;
            }
          case 'ability_rejected':
            {
              /* ═══ v2.3.1733: THE HANDLER THAT NEVER EXISTED ═══
                 The worker has emitted ability_rejected since the ability
                 pool gate was written, and no client has ever listened: a
                 dodge refused for empty stamina simply did nothing, which
                 is the same silent-refusal bug v2.3.1716 fixed for the
                 special attack ("No weapon equipped!").  PR 5 needs the
                 answer for its own casts, and wiring it here fixes the
                 older cases (dodge / lunge / retreat / swipe) for free.
                 Display only — the authoritative pools ride player_state,
                 so this never writes game state. */
              if (!msg.payload || !S.player) break;
              try {
                pushDmgPopup(S, S.player.x, S.player.y - 30,
                  abilityRejectText(msg.payload), '#F2C14E', { ts: Date.now() });
              } catch (e) {}
              break;
            }
          case 'prog3_allocated':
            {
              /* v2.3.1660: server confirmed a prog3_allocate spend.
                 Apply the authoritative pts + pool (the player_state
                 that follows carries the same numbers; the explicit
                 ack avoids any race, the stat_allocated pattern). */
              if (!msg.payload || !S.rpg || !S.rpg.prog3) break;
              var p3a = msg.payload;
              if (!p3a.stat || !S.rpg.prog3.alloc) break;
              if (typeof p3a.pts === 'number') S.rpg.prog3.alloc[p3a.stat] = p3a.pts;
              if (typeof p3a.pool === 'number') S.rpg.prog3.pool = p3a.pool;
              recalcDerived(S.rpg);
              setRpgState(_objectSpread({}, S.rpg));
              try { localStorage.setItem('bt_rpg', JSON.stringify(S.rpg)); } catch (e) {}
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
              /* v2.3.1112: create unknown peers from the track relay too --
                 it carries the full cosmetics, so a peer discovered this way
                 renders correctly immediately (see the tick-create note). */
              if (!S.others[msg.id] && msg.id !== S.myId && msg.data) {
                S.others[msg.id] = {
                  x: 0, y: 0, renderX: 0, renderY: 0, name: 'Anon', color: '#888',
                  avatar: null, dir: 'down', bt: '#2563eb', bl: '#1e3a5f',
                  equip: { chest: 'none', legs: 'none', shoulders: 'none', shirt: 'none' },
                  rpgLv: 1, rpgHp: 50, rpgMaxHp: 50, bodySize: 'slim', zone: 'town',
                };
                setPlayerCount(Object.keys(S.others).length + 1);
              }
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
          /* v2.3.1141: server-minted weapon drop riding the pile.
             Presence + tier + name only -- quality is withheld until
             the private loot_credit (§4.6b.ii mystery reveal).  These
             drive the effectsRenderer aura/label add-on; deliberately
             NOT `isWeapon` -- that flags the legacy client-mint loot
             whose pickup path equips/stashes locally, while these
             piles claim through the server loot_pickup flow. */
          hasWeapon: !!p.hasWeapon && !p.weaponClaimed,
          weaponTier: p.weaponTier || null,
          weaponType: p.weaponType || null,
          weaponName: p.weaponName || null,
          weaponTierColor: (p.weaponTier && RARITY_TIERS[p.weaponTier] && RARITY_TIERS[p.weaponTier].color) || '#8B9695' /* v2.3.1233: Lantern common grey (was navy-palette #8890b8) */,
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
        /* v2.3.1200: pet-vacuum credits (loot_pickup {viaPet:true},
           gated on caps.petLoot).  Skip the pickup freeze — the PET
           grabbed it, the player never stopped walking — and keep the
           legacy vacuum's petLootCount quest tally + at-the-pet popup
           so the pet quest line and the "pet fetched it" feel survive
           the move to server credit. */
        if (payload.viaPet) {
          S._lootFreezeUntil = 0;
          if (!R._questFlags) R._questFlags = {};
          R._questFlags.petLootCount = (R._questFlags.petLootCount || 0) + 1;
          if (typeof S._petX === 'number' && typeof S._petY === 'number') {
            pushDmgPopup(S, S._petX, S._petY - 15, 'PET +' + (payload.coins || 0) + ' G', '#f5c542');
          }
        }
        if (payload.coins && payload.coins > 0) {
          if (R._compStats) R._compStats.totalGoldEarned = (R._compStats.totalGoldEarned || 0) + payload.coins;
          pushHudPopup(S, { target: 'goldIcon', text: '+' + payload.coins + ' G', color: '#f5c542' });
        }
        if (payload.shard) {
          var _pickedShard = shardByKey(payload.shard);
          pushDmgPopup(S, S.player.x + 12, S.player.y - 22, '+ ' + (_pickedShard ? _pickedShard.label : 'Shard'), (_pickedShard && _pickedShard.color) || '#cce6ff');
        }
        if (payload.skull) {
          /* Local skull-counter tally still tracked client-side --
             not part of inventory; just a kill-trophy ledger.  Server
             doesn't replicate it. */
          if (!R.skulls) R.skulls = {};
          R.skulls[payload.skull] = (R.skulls[payload.skull] || 0) + 1;
        }
        /* v2.3.1141: server-minted weapon drop credit.  THE quality
           reveal moment (§4.6b.ii) -- the pile broadcast never carried
           quality; this private payload does.  Popup only: the
           authoritative stash/coins mutation rides the player_state
           that follows on this same socket flush, so do NOT touch
           R.weaponStash here. */
        if (payload.weapon) {
          var _wTier = payload.weapon.tier;
          var _wColor = (RARITY_TIERS[_wTier] && RARITY_TIERS[_wTier].color) || '#8B9695' /* v2.3.1233: Lantern common grey (was navy-palette #8890b8) */;
          var _wQual = payload.weapon.quality;
          var _wQualTag = (_wQual && _wQual !== 'normal') ? ' [' + String(_wQual).toUpperCase() + ']' : '';
          if (payload.weaponStashed) {
            pushDmgPopup(S, S.player.x, S.player.y - 34, 'STASHED: ' + (payload.weapon.name || 'Weapon') + _wQualTag, (_wQual && _wQual !== 'normal') ? '#f5c542' : _wColor, { ts: Date.now() + 1 });
          } else if (payload.weaponSoldFor) {
            pushDmgPopup(S, S.player.x, S.player.y - 34, '+' + payload.weaponSoldFor + 'G (sold, stash full)', '#f5c542', { ts: Date.now() + 1 });
          }
          if (_wQual && _wQual !== 'normal') { try { BT_AUDIO.collect && BT_AUDIO.collect(); } catch (e) {} }
        }
        /* Death-drop pickup: server bundles the dead player's whole
           general inventory under payload.items.  Authoritative R.inventory
           write rides on the player_state that follows; we only render
           the popup + recovered-count floater here. */
        if (payload.isDeathDrop && Array.isArray(payload.items) && payload.items.length > 0) {
          var _recovered = 0;
          payload.items.forEach(function (it) { _recovered += (it && it.qty) || 0; });
          if (_recovered > 0) {
            pushDmgPopup(S, S.player.x, S.player.y - 20, 'RECOVERED ' + _recovered + ' items!', '#3dd497');
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
        /* v2.3.1181: same stale-zone guard the nodes/loot appliers got in
           v2.3.136 -- this one was missed.  A server push stamped for a
           zone we already left (e.g. the dungeon wave re-push racing a
           local exit) wholesale-replaced S.monsters with the WRONG zone's
           list; the inverse race (stale empty zone_state after entering a
           combat zone) flipped _serverMonsters off and spawned client-local
           duplicates.  No-zone payloads (old workers) still apply. */
        if (msg.zone && msg.zone !== S.currentZone) return;
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
          /* v2.3.1301: buffer instead of drop (see nodeSync.js) — a
             snapshot that raced the zone flip is applied on entry. */
          stashPendingZoneNodes(S, _zzone, msg.nodes);
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
        setTrade2: setTrade2,
        setParty: setParty,
        setArenaTournament: setArenaTournament,
        setArenaBets: setArenaBets,
        setClanData: setClanData, /* v2.3.1611 */
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
        /* v2.3.1148: an operator freeze (close 4004 / join_rejected
           reason:'frozen') must not auto-reconnect either -- it would
           hammer the join gate forever.  The banner was already shown
           by the join_rejected handler. */
        if (S._frozenByAdmin || (event && event.code === 4004)) {
          S._realtimeStatus = 'frozen';
          return;
        }
        /* v2.3.1347: server closes 4005 after a character reset -- the
           character_reset_done handler is already reloading the page;
           don't race it with a reconnect (which would rejoin and
           bootstrap before the local wipe finishes). */
        if (S._characterReset || (event && event.code === 4005)) {
          return;
        }
        /* v2.3.1181: fatal join rejection (repeat auth fail / unknown
           future reason) -- the join_rejected handler said "not retrying"
           but this guard is what makes that true.  Without it the client
           looped join->reject->close(4003)->reconnect forever, burning
           the server's per-id auth-fail budget. */
        if (S._joinRejectedFatal) {
          S._realtimeStatus = 'rejected';
          return;
        }
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
    var PRIORITY_EVENTS = new Set(['pvp_confirmed', 'stunned', 'duel_accept', 'duel_decline', 'duel_wager_request', 'pvp_threat', 'threat_response', 'trade_offer', 'trade_accept', 'trade_reject', 'clan_war_kill', 'clan_war_end', 'clan_war_declare', 'clan_invite',
    /* v2.3.1132: two-sided trade commands -- the window is a
       server-truth renderer, so a 33ms batch delay would make every
       stage/confirm click feel laggy. */
    'trade2_open', 'trade2_set', 'trade2_ready', 'trade2_confirm', 'trade2_cancel', 'trade2_stage_weapon', 'trade2_unstage_weapon', /* v2.3.1754: trade2_ready — TRAPS #18, the third leg */
    /* v2.3.1185: party commands -- same server-truth-renderer posture
       as trade2; invite/accept clicks should not sit in a batch. */
    'party_invite', 'party_accept', 'party_decline', 'party_leave', 'party_kick', 'party_chat']);
    var INPUT_BATCH_WINDOW = 33; // ms — match server tick rate for smooth remote movement
    /* ═══ v2.3.1635: ADAPTIVE POSITION RATE ═══
       Position updates were ~87% of this game's entire Cloudflare request
       bill: one every INPUT_BATCH_WINDOW while in motion, ~30/s, and
       inbound WebSocket messages bill at 20 messages = 1 request.
       The insight is that a position update is only worth sending if
       SOMEBODY CAN SEE IT.  Peers render each other only when zones match
       (entityRenderer: `(other.zone || other.z || 'town') !== S.currentZone`
       -> skip), so while you are alone in a zone that 30 Hz stream is
       smoothness delivered to an empty room.
       So: full rate whenever any peer shares your zone, SOLO rate when
       none does.  Your own movement is unaffected either way -- it is
       client-predicted (_pendingMove is OVERWRITTEN below, "only latest
       position matters") and the server never echoes your position back,
       so this changes nothing you can feel.
       FAILS TOWARD FULL FIDELITY: any uncertainty -- no state, no peer
       map, a throw -- returns the fast rate.  The cost of guessing wrong
       in that direction is a few requests; guessing wrong the other way
       is visibly choppy multiplayer.
       Held-back moves are not queued: _pendingMove is overwritten by the
       next frame, so what eventually goes out is always the FRESHEST
       position, never a stale backlog.  The batch timer keeps firing
       while a move is pending, so a player who stops mid-window still
       has their final position flushed within SOLO_MS. */
    /* Both gaps are MULTIPLES OF INPUT_BATCH_WINDOW on purpose.  The
       check below only runs on a batch boundary, so any gap is silently
       rounded UP to the next multiple of 33 -- a naive 200 would really
       be 231 (4.33 Hz), which is a surprise waiting to be rediscovered.
       198 = 6 windows = 5.05 Hz, and it is also the worst-case delay
       before the rate ramps back up when a peer walks into your zone. */
    var MOVE_GAP_SEEN_MS = 33;   // 1 window — unchanged when a peer shares your zone
    var MOVE_GAP_SOLO_MS = 198;  // 6 windows (~5 Hz) when nobody can see you
    var _lastMoveSentAt = 0;
    function moveGapMs() {
      try {
        var _S = stateRef.current;
        if (!_S || !_S.others) return MOVE_GAP_SEEN_MS;
        /* PvP is belt-and-braces: an opponent is in your zone by
           definition, so the peer scan below already returns fast. */
        if (_S._arenaMatch) return MOVE_GAP_SEEN_MS;
        var _zone = _S.currentZone;
        if (!_zone) return MOVE_GAP_SEEN_MS;
        for (var _pid in _S.others) {
          var _o = _S.others[_pid];
          if (!_o) continue;
          var _oz = _o.zone || _o.z;
          /* A peer whose zone has not landed yet (v2.3.1112 creates
             placeholder entries from a tick delta before the roster
             fills them in) counts as VISIBLE.  Defaulting those to
             'town' the way the renderer does would fail toward the slow
             rate for up to a second every time someone appears -- the
             one direction this must never fail. */
          if (!_oz || _oz === _zone) return MOVE_GAP_SEEN_MS;
        }
        return MOVE_GAP_SOLO_MS;
      } catch (e) {
        return MOVE_GAP_SEEN_MS;
      }
    }
    var _inputBuffer = [];
    var _pendingMove = null;
    var _batchTimer = null;
    function flushInputBuffer() {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      // Send pending move if any, subject to the adaptive rate above.
      if (_pendingMove) {
        var _nowMv = Date.now();
        if (_nowMv - _lastMoveSentAt >= moveGapMs()) {
          ws.send(JSON.stringify(_pendingMove));
          _pendingMove = null;
          _lastMoveSentAt = _nowMv;
        }
        /* else: hold it.  The next frame overwrites it with a fresher
           position and the timer re-checks in INPUT_BATCH_WINDOW ms. */
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
        if (msg.type === 'extraction_start') {
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
        if (msg.type === 'prog3_allocate') { /* v2.3.1660: trained-rebuild point spend */
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
        /* v2.3.1733: the stamina-ability cast (Shield Bash / Whirlwind).
           THIS LINE IS ONE OF THE THREE LEGS — server case + handler +
           this passthrough (TRAPS #18).  Without it the send returns
           normally, the worker never hears it, and the ability is a button
           that drains a predicted bar and does nothing. */
        if (msg.type === 'ability') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'eat_request') {
          ws.send(JSON.stringify(msg));
          return;
        }
        /* v2.3.1734: Element Burst (COMBAT-OVERHAUL-PLAN PR 6).  This
           line is the whole difference between the ability working and
           the ability silently not existing — TRAPS #18, and precheck
           rule 8 exists because the same omission ate extraction_start
           for 1400 versions. */
        if (msg.type === 'element_burst') {
          ws.send(JSON.stringify(msg));
          return;
        }
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
        if (msg.type === 'gem_cut_request') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'amulet_forge_request') {
          ws.send(JSON.stringify(msg));
          return;
        }
        if (msg.type === 'build_point_earned') {
          ws.send(JSON.stringify(msg));
          return;
        }
        /* v2.3.1702: firemaking (light a campfire from a wood_* log).  THIS
           SHIM IS AN ALLOWLIST -- a message type with no case here does not
           reach the worker, it falls through to the broadcast/drop tail
           below.  A new client->server type therefore needs BOTH a server
           `case` and a line here, and the failure mode is silent: the send
           looks fine from the client, the worker simply never hears it.
           Caught in the headless run for this exact message. */
        if (msg.type === 'firemaking_request') {
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
        /* v2.3.1159: the loadout menu now mirrors unequips to the worker
           (the handler predates this but no client path ever sent it, so
           the shim had no passthrough — a locally-unequipped weapon kept
           swinging server-side). */
        if (msg.type === 'unequip_request') {
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
        /* v2.3.1347: self-service character restart (SettingsPanel
           confirmation flow -> persistence.js _handleCharacterReset). */
        if (msg.type === 'character_reset') {
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
              /* v2.3.1092: forward the harvest activity code so the server can
                 relay it and peers can render this player gathering. */
              ex: p.ex !== undefined ? p.ex : null,
              z: p.z || p.zone,
              vx: p.vx || 0,
              vy: p.vy || 0,
              dodging: !!_S4._dodgeRoll,
              blocking: !!_S4._shieldUp,
              /* v2.3.1705: the shield's FACING, so the worker can run the same
                 arc test the client does (owner: "yes blocking should be
                 directional").  It rides the move message rather than getting
                 its own event because it changes with the thumbstick, exactly
                 like x/y — a separate message would arrive at a different
                 cadence from the position the arc is measured against.
                 Sent as null when not blocking so the field costs nothing on
                 the wire the rest of the time, and an old worker simply
                 ignores it and keeps blocking omnidirectionally (deploy-order
                 safe: strictly more forgiving, never less). */
              ba: _S4._shieldUp
                ? (typeof _S4._shieldAngle === 'number' ? _S4._shieldAngle
                  : (typeof _S4._facingAngle === 'number' ? _S4._facingAngle : 0))
                : null,
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
      },
      /* v2.3.1424: ground-truth probe for UI gates (SettingsPanel
         restart).  S._realtimeStatus is a SHADOW of the socket state
         and can go stale on device: a zombie socket's late onclose/
         onerror stamps 'disconnected' AFTER a newer socket already
         opened (iOS resume race), and a 'superseded' session never
         auto-reconnects while the game keeps playing locally -- so a
         gate that refuses an action must ask the socket itself. */
      isLive: function isLive() {
        return !!(ws && ws.readyState === WebSocket.OPEN);
      },
      /* v2.3.1424: user-initiated reconnect (same intent as the
         superseded banner's "Play here instead" button): if no socket
         is open or already connecting, connect NOW, skipping any
         pending backoff window. */
      forceReconnect: function forceReconnect() {
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectDelay = 1000;
        try { connect(); } catch (e) {}
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
