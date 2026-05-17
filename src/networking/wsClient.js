/* ═══ DURABLE OBJECTS WEBSOCKET CLIENT ═══ */
/* Extracted from index.html lines 10309-11445 */

/* Tick arrival timestamps — module-level so the buffer survives
 * WebSocket reconnects and can be sampled by the FPS/NET overlay
 * regardless of when setupWebSocket() is called.  performance.now()
 * values, capped at ~5 minutes of history.  Bytes-per-tick payload
 * sizes ride along so we can flag size spikes too. */
const TICK_HISTORY_MS = 5 * 60 * 1000;
const tickTimes = [];
const tickSizes = [];

/** Returns the live tick-time ring buffer (do not mutate from outside). */
export function getTickTimes() { return tickTimes; }
/** Returns the live tick-size ring buffer (do not mutate from outside). */
export function getTickSizes() { return tickSizes; }

/**
 * Sets up the WebSocket connection to the game server.
 * Called from a useEffect in BroTown.
 * @param {Object} ctx - Closure dependencies from the component
 * @returns {Function} cleanup function
 */
export function setupWebSocket(ctx) {
  const {
    stateRef, setPlayerCount, setPlayerList, setChatLog, setJoinFlash,
    setDuelRequest, setThreatIncoming, setIncomingTrade,
    setArenaStatus, setArenaTournament, setArenaBets,
    setCampfires, setClanData,
    showNameModal, showLogin,
  } = ctx;
    if (showNameModal || showLogin) return;
    var S = stateRef.current;

    /* ═══ DURABLE OBJECTS WEBSOCKET CLIENT ═══ */
    var WS_URL = (window.BROTOWN_WS_URL || 'wss://brotown-server.hemibroscommunity.workers.dev') + '/ws?room=brotown';
    var ws = null;
    var reconnectTimer = null;
    var reconnectDelay = 1000;
    function connect() {
      try {
        ws = new WebSocket(WS_URL);
      } catch (e) {
        scheduleReconnect();
        return;
      }
      ws.onopen = function () {
        var _S$rpg, _S$rpg2, _S$rpg3;
        S._realtimeStatus = 'connected';
        reconnectDelay = 1000;
        ws.send(JSON.stringify({
          type: 'join',
          id: S.myId,
          name: S.myName,
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
            bs: S.bodySize || 'slim',
            rpgLv: ((_S$rpg = S.rpg) === null || _S$rpg === void 0 ? void 0 : _S$rpg.level) || 1,
            rpgHp: ((_S$rpg2 = S.rpg) === null || _S$rpg2 === void 0 ? void 0 : _S$rpg2.hp) || 50,
            rpgMaxHp: ((_S$rpg3 = S.rpg) === null || _S$rpg3 === void 0 ? void 0 : _S$rpg3.maxHp) || 50
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
        var msg;
        try {
          msg = JSON.parse(evt.data);
        } catch (_unused1) {
          return;
        }
        switch (msg.type) {
          case 'tick':
            {
              /* Record arrival time + payload size for the NET overlay /
               * bt_net() command.  Trim history older than TICK_HISTORY_MS. */
              {
                const _tNow = performance.now();
                tickTimes.push(_tNow);
                tickSizes.push(evt.data && evt.data.length ? evt.data.length : 0);
                const _cutoff = _tNow - TICK_HISTORY_MS;
                let _i = 0;
                while (_i < tickTimes.length && tickTimes[_i] < _cutoff) _i++;
                if (_i > 0) {
                  tickTimes.splice(0, _i);
                  tickSizes.splice(0, _i);
                }
              }
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
                    S.others[pid].zone = data.z;
                    S.others[pid]._vx = (data.vx || 0) / 100;
                    S.others[pid]._vy = (data.vy || 0) / 100;
                    S.others[pid]._lastUpdate = Date.now();
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
                  _processGameEvent(_evt.type, payload, S);
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
                      localM.x = md.x;
                      localM.y = md.y;
                      localM.curHp = md.hp;
                      /* Don't overwrite maxHp — it stays at the spawn value */
                      if (md.alive && !localM.alive) {
                        /* Monster respawned */
                        localM.alive = true;
                        localM.renderX = md.x;
                        localM.renderY = md.y;
                      }
                      if (!md.alive && localM.alive) {
                        /* Monster died (from another player's kill) */
                        localM.alive = false;
                      }
                    } else if (md.alive) {
                      /* Server has a monster we don't — this happens when the
                         client missed the initial sync for a zone (e.g. very
                         fast zone-change before state_sync arrived). Register
                         a placeholder so it's at least visible and damage
                         events from it can be associated. Tick deltas only
                         carry id/x/y/hp/alive, so spd/dmg/level/arch/etc are
                         null until the next state_sync — but the monster will
                         render at its server position with default visuals
                         and behave correctly. */
                      var placeholderArch = (S.currentZone === 'ember') ? 'fireGoblin' : 'fodder';
                      S.monsters.push({
                        id: md.id,
                        x: md.x, y: md.y,
                        renderX: md.x, renderY: md.y,
                        curHp: md.hp, hp: md.hp, maxHp: md.hp,
                        alive: true,
                        archetype: placeholderArch,
                        type: placeholderArch,
                        spawnX: md.x, spawnY: md.y,
                        statuses: {},
                      });
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
                  rpgLv: _data.rpgLv || 1,
                  rpgHp: _data.rpgHp || 50,
                  rpgMaxHp: _data.rpgMaxHp || 50,
                  bodySize: _data.bs || 'slim',
                  zone: _data.z || 'town'
                };
              }
              S.others = others;
              setPlayerCount(msg.playerCount || Object.keys(others).length + 1);
              /* Load server monsters if provided */
              if (msg.monsters && msg.monsters.length > 0) {
                S._serverMonsters = true;
                S.monsters = msg.monsters.map(function(m) {
                  /* Server only knows the base fodder archetype, but
                     Ember Fields renders fodder as fire goblins.  Remap
                     here so the entity renderer routes to the goblin
                     sheets (it keys on archetype === 'fireGoblin'). */
                  var arch = m.arch;
                  if (S.currentZone === 'ember' && arch === 'fodder') arch = 'fireGoblin';
                  return _objectSpread(_objectSpread({}, m), {}, {
                    arch: arch, archetype: arch, type: arch,
                    curHp: m.hp, renderX: m.x, renderY: m.y, spawnX: m.x, spawnY: m.y,
                    alive: m.alive, statuses: {}, _hitThisSwing: false,
                    _atkCd: 0, _stunUntil: 0, respawnAt: 0, moveTimer: 0, targetX: m.x, targetY: m.y,
                    _stuckArrows: [],
                  });
                });
                /* Rebind lockedTarget.ref — .map() replaced every monster
                   object, so the old ref is orphaned.  Try id first; if
                   that fails (e.g. local-spawned `m-meadow-N` vs server
                   `sm-meadow-N` after the first snapshot arrives),
                   fall back to nearest-by-position within 40 world px,
                   so the lock stays glued to whichever monster the user
                   was actually targeting. */
                if (S.lockedTarget && S.lockedTarget.type === 'monster' && S.lockedTarget.ref) {
                  var _oldRef = S.lockedTarget.ref;
                  var _lockedId = S.lockedTarget.id;
                  var _newRef = _lockedId ? S.monsters.find(function (m) { return m.id === _lockedId; }) : null;
                  if (!_newRef) {
                    var _ox = _oldRef.x, _oy = _oldRef.y;
                    var _bestD = 40 * 40;
                    for (var _mi = 0; _mi < S.monsters.length; _mi++) {
                      var _cm = S.monsters[_mi];
                      if (!_cm.alive) continue;
                      var _ddx = _cm.x - _ox, _ddy = _cm.y - _oy;
                      var _dd = _ddx * _ddx + _ddy * _ddy;
                      if (_dd < _bestD) { _bestD = _dd; _newRef = _cm; }
                    }
                  }
                  if (_newRef && _newRef.alive) {
                    S.lockedTarget.ref = _newRef;
                    S.lockedTarget.id = _newRef.id;
                  } else {
                    S.lockedTarget = null;
                  }
                }
              }
              break;
            }
          case 'zone_monsters':
            {
              /* Server sent full monster list for a zone */
              if (msg.monsters) {
                S._serverMonsters = true;
                S.monsters = msg.monsters.map(function(m) {
                  /* Same fodder -> fireGoblin remap as state_sync above
                     so respawn / late-arriving snapshots route to the
                     goblin renderer in Ember Fields. */
                  var arch = m.arch;
                  if (S.currentZone === 'ember' && arch === 'fodder') arch = 'fireGoblin';
                  return _objectSpread(_objectSpread({}, m), {}, {
                    arch: arch, archetype: arch, type: arch,
                    curHp: m.hp, renderX: m.x, renderY: m.y, spawnX: m.x, spawnY: m.y,
                    alive: m.alive, statuses: {}, _hitThisSwing: false,
                    _atkCd: 0, _stunUntil: 0, respawnAt: 0, moveTimer: 0, targetX: m.x, targetY: m.y,
                    _stuckArrows: [],
                  });
                });
                /* Same rebind as above — id first, then nearest-by-position
                   within 40 world px so the lock survives the local→server
                   id transition. */
                if (S.lockedTarget && S.lockedTarget.type === 'monster' && S.lockedTarget.ref) {
                  var _oldRef2 = S.lockedTarget.ref;
                  var _lockedId2 = S.lockedTarget.id;
                  var _newRef2 = _lockedId2 ? S.monsters.find(function (m) { return m.id === _lockedId2; }) : null;
                  if (!_newRef2) {
                    var _ox2 = _oldRef2.x, _oy2 = _oldRef2.y;
                    var _bestD2 = 40 * 40;
                    for (var _mi2 = 0; _mi2 < S.monsters.length; _mi2++) {
                      var _cm2 = S.monsters[_mi2];
                      if (!_cm2.alive) continue;
                      var _ddx2 = _cm2.x - _ox2, _ddy2 = _cm2.y - _oy2;
                      var _dd2 = _ddx2 * _ddx2 + _ddy2 * _ddy2;
                      if (_dd2 < _bestD2) { _bestD2 = _dd2; _newRef2 = _cm2; }
                    }
                  }
                  if (_newRef2 && _newRef2.alive) {
                    S.lockedTarget.ref = _newRef2;
                    S.lockedTarget.id = _newRef2.id;
                  } else {
                    S.lockedTarget = null;
                  }
                }
              }
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
              if (S.others[msg.id]) Object.assign(S.others[msg.id], msg.data);
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
              _processGameEvent(msg.type, _payload, S);
            }
        }
      };

      /* §16.10 — Shared game event dispatcher (used by both direct messages and batched tick events) */
      function _processGameEvent(type, payload, S) {
        switch (type) {
          case 'chat':
            {
              if (!payload || payload.id === S.myId) break;
              try {
                var bl = JSON.parse(localStorage.getItem('bt_blocked') || '[]');
                if (bl.includes(payload.id)) break;
              } catch (e) {}
              var isMuted = false;
              try {
                var ml = JSON.parse(localStorage.getItem('bt_muted') || '[]');
                isMuted = ml.includes(payload.id);
              } catch (e) {}
              if (!isMuted && payload.id) S.chatBubbles[payload.id] = {
                text: payload.text,
                ts: Date.now()
              };
              BT_AUDIO.chatReceive();
              S.chatLog = [].concat(_toConsumableArray(S.chatLog.slice(-40)), [{
                id: payload.id,
                name: payload.name,
                text: isMuted ? '[muted]' : payload.text,
                color: payload.color,
                ts: Date.now(),
                muted: isMuted
              }]);
              setChatLog(_toConsumableArray(S.chatLog));
              if (!isMuted) setUnreadChats(function (prev) {
                return prev + 1;
              });
              break;
            }
          case 'emote':
            {
              if (payload.id && S.others[payload.id]) S.others[payload.id].emote = {
                emoji: payload.emoji,
                ts: Date.now()
              };
              BT_AUDIO.beep(800, 0.06, 0.06, 'sine');
              setTimeout(function () {
                return BT_AUDIO.beep(1000, 0.04, 0.06, 'sine');
              }, 60);
              break;
            }
          case 'player_swing':
            {
              if (payload.id && S.others[payload.id]) {
                S.others[payload.id]._swingTs = Date.now();
              }
              break;
            }
          case 'player_projectile':
            {
              /* Another player fired an arrow or staff bolt */
              if (payload.id === S.myId) break;
              if (!S._remoteProjectiles) S._remoteProjectiles = [];
              S._remoteProjectiles.push({
                x: payload.x, y: payload.y, ang: payload.ang,
                isStaff: payload.isStaff, dist: 14,
                life: payload.isStaff ? 90 : 120,
                ts: Date.now(), ownerId: payload.id
              });
              break;
            }
          case 'player_shield':
            {
              if (payload.id && S.others[payload.id]) {
                S.others[payload.id]._shieldUp = payload.up;
                S.others[payload.id]._shieldTs = Date.now();
              }
              break;
            }
          case 'monster_hit':
            {
              /* A monster was hit — show damage number and hit effects for everyone */
              if (S.monsters) {
                var hitM = S.monsters.find(function(m) { return m.id === payload.monsterId; });
                if (hitM) {
                  hitM.hp = Math.round(payload.hpPct * hitM.maxHp);
                  hitM.curHp = hitM.hp;
                  hitM._hitFlash = Date.now();
                  /* Show damage number (skip our own — we already show it locally) */
                  if (payload.attackerId !== S.myId) {
                    S.dmgNumbers.push({
                      x: hitM.x || hitM.renderX, y: (hitM.y || hitM.renderY) - 20,
                      text: '-' + payload.dmg, color: payload.isCrit ? '#fbbf24' : '#ff8888',
                      ts: Date.now()
                    });
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
              /* A monster was killed — show death effects, award XP/gold if we're a recipient */
              if (S.monsters) {
                var deadM = S.monsters.find(function(m) { return m.id === payload.monsterId; });
                if (deadM) {
                  deadM.alive = false;
                  deadM.curHp = 0;
                  deadM.hp = 0;
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
              /* Award XP and gold if we are a recipient */
              if (payload.recipients && payload.recipients.includes(S.myId)) {
                var R = S.rpg;
                if (R) {
                  var killXp = payload.xp || 0;
                  var killGold = payload.gold || 0;
                  R.xp = (R.xp || 0) + killXp;
                  R.coins = (R.coins || 0) + killGold;
                  if (R._compStats) {
                    R._compStats.monstersKilled = (R._compStats.monstersKilled || 0) + 1;
                    R._compStats.totalGoldEarned = (R._compStats.totalGoldEarned || 0) + killGold;
                  }
                  S.dmgNumbers.push({
                    x: S.player.x, y: S.player.y - 30,
                    text: '+' + killXp + 'XP +' + killGold + 'G',
                    color: '#f5c542', ts: Date.now()
                  });
                  /* Check level up */
                  while (R.xp >= xpRequired(R.level)) {
                    R.xp -= xpRequired(R.level);
                    R.level++;
                    R.unspentT1 = (R.unspentT1 || 0) + 5;
                    R.unspentT2 = (R.unspentT2 || 0) + 5;
                    R.unspentPts = R.unspentT1 + R.unspentT2;
                    recalcDerived(R);
                    R.hp = R.maxHp; R.stamina = R.maxStamina; R.mana = R.maxMana;
                    setLevelUpMsg({ level: R.level, ts: Date.now() });
                    BT_AUDIO.levelUp();
                  }
                  setRpgState(_objectSpread({}, R));
                  try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch(e) {}
                }
              }
              break;
            }
          case 'monster_attack':
            {
              /* Server monster attacked us */
              if (payload.targetId !== S.myId) break;
              var R2 = S.rpg;
              if (!R2 || R2.hp <= 0) break;
              var mDmg = payload.dmg || 5;
              /* Apply player defense */
              var pDef2 = (R2.endurance || 0) * 0.5 + ((R2.armor ? R2.armor.tierMult : 1) || 1) * 3;
              var dmgTaken2 = Math.max(1, mDmg - pDef2 * 0.3);
              /* Check blocking */
              if (S._shieldUp) {
                var blockRed = calcBlockReduction ? calcBlockReduction(R2.fortification || 0, R2.shield) : 0.25;
                dmgTaken2 *= (1 - blockRed);
                R2.stamina = Math.max(0, (R2.stamina || 0) - 15);
              }
              /* Check dodge */
              if (S._dodgeRoll) break; /* in i-frames */
              R2.hp = Math.max(0, R2.hp - Math.ceil(dmgTaken2));
              S.dmgNumbers.push({
                x: S.player.x, y: S.player.y - 20,
                text: '-' + Math.ceil(dmgTaken2), color: '#ff5e6c', ts: Date.now()
              });
              for (var hp3 = 0; hp3 < 4; hp3++) S.hitParticles.push({
                x: S.player.x, y: S.player.y,
                vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                life: 0.6, color: '#ff5e6c', size: 2
              });
              S.screenShake = 3;
              BT_AUDIO.beep(200, 0.1, 0.15, 'sawtooth');
              if (R2.hp <= 0) {
                /* Player death from server monster */
                if (!R2._compStats) R2._compStats = createDefaultCompStats();
                R2._compStats.deaths++;
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
                S.dmgNumbers.push({
                  x: S.player.x, y: S.player.y - 40,
                  text: '💀 YOU DIED', color: '#ff5e6c', ts: Date.now()
                });
                if (goldLost2 > 0) S.dmgNumbers.push({
                  x: S.player.x, y: S.player.y - 55,
                  text: '-' + goldLost2 + 'G', color: '#fbbf24', ts: Date.now()
                });
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
                  S.player.x = 16 * TILE;
                  S.player.y = 16 * TILE;
                  S.respawnTimer = Date.now() + 3000;
                  setRpgState(_objectSpread({}, R2));
                  try { localStorage.setItem('bt_rpg', JSON.stringify(R2)); } catch(e) {}
                }, respawnDelay);
              }
              setRpgState(_objectSpread({}, R2));
              break;
            }
          case 'player_hurt_by_monster':
            {
              /* Phase 1 shared-monster visual feedback: a remote player
                 broadcast that they just took monster damage on their
                 own client.  We render the hit-flash + a floating dmg
                 number over their sprite so the encounter reads as a
                 real fight to bystanders, even though monsters are
                 still client-local. */
              if (payload.id === S.myId) break;
              var hurtOther = S.others && S.others[payload.id];
              if (!hurtOther) break;
              hurtOther._hitFlash = Date.now();
              S.dmgNumbers.push({
                x: hurtOther.x || 0,
                y: (hurtOther.y || 0) - 20,
                text: '-' + (payload.dmg || 0),
                color: '#ff5e6c',
                ts: Date.now()
              });
              break;
            }
          case 'monster_dmg_at':
            {
              /* Phase 1 shared-monster visual feedback: another player
                 just damaged a monster on their client.  Monsters are
                 still client-local so we can't tag the same instance,
                 but rendering a floating damage number at the world
                 position they hit (sent in the payload) makes nearby
                 fights read as real, not invisible. */
              if (payload.id === S.myId) break;
              S.dmgNumbers.push({
                x: payload.x || 0,
                y: (payload.y || 0) - 20,
                text: '-' + (payload.dmg || 0),
                color: payload.isCrit ? '#fbbf24' : '#ff8888',
                ts: Date.now()
              });
              break;
            }
          case 'player_died_to_monster':
            {
              /* Phase 1 shared-monster visual feedback: a remote player
                 died on their client (to monster damage, not PvP — PvP
                 deaths are already handled by pvp_confirmed).  Spawn the
                 same red death-burst particles + "💀" popup we render
                 locally, anchored to the position they reported, so the
                 kill reads visibly in shared zones. */
              if (payload.id === S.myId) break;
              var dx = payload.x || 0, dy = payload.y || 0;
              for (var dp3 = 0; dp3 < 20; dp3++) {
                var dpA3 = dp3 / 20 * Math.PI * 2;
                S.hitParticles.push({
                  x: dx, y: dy,
                  vx: Math.cos(dpA3) * (2 + Math.random() * 4),
                  vy: Math.sin(dpA3) * (2 + Math.random() * 4) - 1,
                  life: 1.0,
                  color: ['#ff5e6c','#cc2233','#ff8888'][Math.floor(Math.random()*3)],
                  size: 2 + Math.random() * 2
                });
              }
              S.dmgNumbers.push({
                x: dx, y: dy - 40,
                text: '💀',
                color: '#ff5e6c',
                ts: Date.now(),
                ttl: 2.0
              });
              break;
            }
          /* mkt_order removed — marketplace uses server API now */
          case 'arena_bet':
            {
              /* Track remote bets for pot calculation */
              if (payload.bettorId === S.myId) break;
              if (!S._remoteBets) S._remoteBets = [];
              S._remoteBets.push(payload);
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
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 40,
                  text: '⚔️ [' + war.challenger.tag + '] declared WAR!',
                  color: '#ff5e6c',
                  ts: Date.now()
                });
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 25,
                  text: 'Battle zone: ' + (((_ZONES$war$zone = ZONES[war.zone]) === null || _ZONES$war$zone === void 0 ? void 0 : _ZONES$war$zone.name) || war.zone),
                  color: 'rgba(255,255,255,.5)',
                  ts: Date.now()
                });
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
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 50,
                text: '⚔️ ' + payload.kill.killer + ' → ' + payload.kill.victim,
                color: 'rgba(255,255,255,.4)',
                ts: Date.now()
              });
              break;
            }
          case 'clan_war_end':
            {
              if (!S._activeClanWar || payload.warId !== S._activeClanWar.id) break;
              S._activeClanWar.status = 'ended';
              S._activeClanWar.winner = payload.winner;
              var isWinner = S._clanData && payload.winner === S._clanData.tag;
              var reward = isWinner ? CLAN_WAR_REWARDS.winner : CLAN_WAR_REWARDS.loser;
              if (S.rpg) {
                S.rpg.coins += reward.gold;
                S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + reward.ap;
                if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += reward.gold;
              }
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 50,
                text: isWinner ? '🏆 WAR WON!' : '💀 War lost...',
                color: isWinner ? '#f5c542' : '#ff5e6c',
                ts: Date.now()
              });
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 35,
                text: '+' + reward.gold + 'G +' + reward.ap + 'AP',
                color: '#f5c542',
                ts: Date.now()
              });
              if (isWinner) BT_AUDIO.levelUp();else BT_AUDIO.beep(150, 0.1, 0.15, 'triangle');
              setTimeout(function () {
                S._activeClanWar = null;
              }, 10000); /* clear after 10s */
              break;
            }
          case 'arena_bet':
            {
              /* Receive spectator bet from another player */
              if (payload.playerId === S.myId) break;
              setArenaBets(function (prev) {
                return [].concat(_toConsumableArray(prev), [payload]);
              });
              break;
            }
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
                var offer = payload.offer;
                if (offer.coins) _R.coins = (_R.coins || 0) + offer.coins;
                if (offer.items && _R.inventory) Object.entries(offer.items).forEach(function (_ref10) {
                  var _ref11 = _slicedToArray(_ref10, 2),
                    k = _ref11[0],
                    v = _ref11[1];
                  _R.inventory[k] = (_R.inventory[k] || 0) + v;
                });
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 40,
                  text: 'Trade complete!',
                  color: '#3dd497',
                  ts: Date.now()
                });
                BT_AUDIO.collect();
                setRpgState(_objectSpread({}, _R));
              }
              break;
            }
          case 'trade_reject':
            {
              if (payload.target === S.myId) {
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: 'Trade declined',
                  color: '#ff5e6c',
                  ts: Date.now()
                });
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
                  S.dmgNumbers.push({
                    x: S.player.x + 20,
                    y: S.player.y - 20,
                    text: payload.blocked ? 'Blocked!' : 'Hit!',
                    color: payload.blocked ? '#888' : '#fbbf24',
                    ts: Date.now()
                  });
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
              _R2.hp = Math.max(0, _R2.hp - Math.ceil(dmgTaken));
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 20,
                text: '-' + Math.ceil(dmgTaken),
                color: payload.blocked ? '#607D8B' : '#ff5e6c',
                ts: Date.now()
              });
              if (payload.blocked) S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 35,
                text: 'BLOCKED',
                color: '#607D8B',
                ts: Date.now()
              });
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
              BT_AUDIO.beep(200, 0.1, 0.15, 'sawtooth');
              if (_R2.hp <= 0) {
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 45,
                  text: 'Killed by ' + (payload.attackerName || '???'),
                  color: '#ff5e6c',
                  ts: Date.now()
                });
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
                  died: _R2.hp <= 0,
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
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: 'Safe zone!',
                  color: '#3dd497',
                  ts: Date.now()
                });
                break;
              }
              var _pDef = _R3.endurance * 0.5 + (((_R3$armor = _R3.armor) === null || _R3$armor === void 0 ? void 0 : _R3$armor.tierMult) || 1) * 3 + (((_R3$_shieldBonus = _R3._shieldBonus) === null || _R3$_shieldBonus === void 0 ? void 0 : _R3$_shieldBonus.blockFlat) || 0);
              var _rawDmg = payload.dmg || 10;
              var _dmgTaken = Math.max(1, _rawDmg - _pDef * 0.3);
              var isCrit = payload.isCrit;
              if (isCrit) _dmgTaken = Math.ceil(_dmgTaken * 1.5);
              _R3.hp = Math.max(0, _R3.hp - Math.ceil(_dmgTaken));
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 20,
                text: '-' + Math.ceil(_dmgTaken),
                color: '#ff5e6c',
                ts: Date.now()
              });
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
              if (_R3.hp <= 0) {
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 45,
                  text: 'Killed by ' + payload.name,
                  color: '#ff5e6c',
                  ts: Date.now()
                });
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
                  died: _R3.hp <= 0
                }
              });
              setRpgState(_objectSpread({}, _R3));
              break;
            }
          case 'pvp_confirmed':
            {
              if (payload.target !== S.myId) break;
              S.dmgNumbers.push({
                x: S.player.x + 20,
                y: S.player.y - 20,
                text: 'Hit! -' + Math.ceil(payload.dmg),
                color: '#fbbf24',
                ts: Date.now()
              });
              if (payload.died) {
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 50,
                  text: 'KILL!',
                  color: '#3dd497',
                  ts: Date.now()
                });
                BT_AUDIO.collect();
                if (!S.rpg._compStats) S.rpg._compStats = createDefaultCompStats();
                S.rpg._compStats.pvpKills++;
                /* §CW — Score clan war kill */
                if (S._activeClanWar && S._activeClanWar.status === 'active' && S.currentZone === S._activeClanWar.zone) {
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
                  S.dmgNumbers.push({
                    x: S.player.x,
                    y: S.player.y - 65,
                    text: '⚔️ +' + points + ' war points!',
                    color: '#ff5e6c',
                    ts: Date.now()
                  });
                }
                /* §ARENA — Report arena match result if this was an arena fight */
                if (S._arenaMatch && (payload.from === S._arenaMatch.p1 || payload.from === S._arenaMatch.p2)) {
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
                        S.dmgNumbers.push({
                          x: S.player.x,
                          y: S.player.y - 80,
                          text: '🏆 GLADIATOR CHAMPION!',
                          color: '#f5c542',
                          ts: Date.now()
                        });
                        S.dmgNumbers.push({
                          x: S.player.x,
                          y: S.player.y - 65,
                          text: '+' + ARENA_CHAMPION_REWARD.gold + 'G +' + ARENA_CHAMPION_REWARD.ap + 'AP',
                          color: '#f5c542',
                          ts: Date.now()
                        });
                        BT_AUDIO.levelUp();
                        S.screenShake = 10;
                      } else {
                        var _d$tournament;
                        S.rpg.coins += ARENA_WIN_REWARD.gold;
                        S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + ARENA_WIN_REWARD.ap;
                        S.dmgNumbers.push({
                          x: S.player.x,
                          y: S.player.y - 80,
                          text: '🏟️ Arena win! Round ' + ((_d$tournament = d.tournament) === null || _d$tournament === void 0 ? void 0 : _d$tournament.round),
                          color: '#3dd497',
                          ts: Date.now()
                        });
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
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 40,
                  text: 'DUEL STARTED!',
                  color: '#fbbf24',
                  ts: Date.now()
                });
              }
              break;
            }
          case 'duel_decline':
            {
              if (payload.target === S.myId) S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 30,
                text: 'Duel declined',
                color: '#888',
                ts: Date.now()
              });
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
                  countdown: payload.countdown || 120,
                  responded: false
                });
                BT_AUDIO.beep(300, 0.1, 0.15, 'square');
                setTimeout(function () {
                  return BT_AUDIO.beep(200, 0.08, 0.12, 'square');
                }, 150);
              }
              break;
            }
          case 'threat_response':
            {
              if (payload.target === S.myId) {
                if (payload.accepted) S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 40,
                  text: 'Threat accepted!',
                  color: '#fbbf24',
                  ts: Date.now()
                });else S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 40,
                  text: 'They fled!',
                  color: '#888',
                  ts: Date.now()
                });
              }
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
      } /* end _processGameEvent */

      ws.onclose = function () {
        S._realtimeStatus = 'disconnected';
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

    /* Close WS on page refresh/close so server drops the connection immediately */
    function _onBeforeUnload() {
      if (ws) try { ws.close(); } catch (e) {}
    }
    window.addEventListener('beforeunload', _onBeforeUnload);

    return function () {
      window.removeEventListener('beforeunload', _onBeforeUnload);
      stopBatchTimer();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }
      S.channel = null;
      S._realtimeStatus = 'disconnected';
    };
}
