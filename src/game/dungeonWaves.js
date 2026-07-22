/* ═══ DUNGEON WAVES — §14.1 wave progression, boss spawn, completion ═══ */
/* v2.3.810: moved verbatim from the game loop in src/ui/BroTown.jsx
   (REBUILD-PLAN Phase 8, slice 2; behavior-frozen). Runs once per frame.
   When all monsters in a dungeon wave are dead: spawns the next wave,
   or the boss (custom §DNG config or standard depth-scaled brute), or
   completes the dungeon (custom → rewards + return to farm_home;
   standard → dungeonClears unlock, next-depth warp, endgame-zone flag
   on core clear).
   Liveness: the CUSTOM dungeon path is reachable in play (Dungeon
   Workshop). The STANDARD path is dormant — zone-dungeon entry via
   tile 10 has been disabled since v2.3.54 (see zoneTransitions.js).
   deps = { stateRef, setRpgState }: the 3s return-home setTimeouts
   re-read stateRef.current (not the frame's S) exactly like the inline
   code did; setRpgState publishes reward state to React. */
import { ZONES, TILE, ELEMENTS, DEPTH_CONFIG, BT_AUDIO, createMonster, createDefaultCompStats, updateZoneDimensions, generateZoneMap, spawnMonstersForZone, spawnGatherNodes } from '@/data/index.js';
import { _objectSpread } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
export function updateDungeonWaves(S, deps) {
  /* v2.3.1127: server-authoritative dungeon instances.  When the run
     lives on the worker (S._serverDungeon set by the dungeon_started
     handler in gameEvents.js), wave advancement, boss spawn, and the
     completion rewards are all server-owned -- the client receives
     dungeon_wave / dungeon_boss / dungeon_complete events instead of
     running this loop.  The legacy body below stays for the
     caps-gated fallback path (old workers). */
  if (S._serverDungeon) return;
  var stateRef = deps.stateRef,
    setRpgState = deps.setRpgState;
  var P = S.player;
        /* §14.1 Dungeon wave progression */
        if (S._inDungeon && !S._dungeonComplete) {
          var allDead = S.monsters.every(function (m) {
            return !m.alive;
          });
          if (allDead && S.monsters.length > 0) {
            S._dungeonWave++;
            if (S._dungeonWave >= S._dungeonMaxWaves && !S._dungeonBossSpawned) {
              /* ═══ BOSS WAVE ═══ */
              S._dungeonBossSpawned = true;
              var _dW = S.map[0].length,
                _dH = S.map.length;
              if (S._inCustomDungeon && S._customDungeonConfig) {
                /* §DNG — Custom dungeon boss */
                var cfg = S._customDungeonConfig;
                if (cfg.hasBoss) {
                  var bossArch = cfg.bossArchetype || 'brute';
                  var boss = createMonster('cboss-0', bossArch, cfg.monsterLevel + 5, Math.floor(_dW / 2) * TILE, Math.floor(_dH / 3) * TILE, cfg.element);
                  boss.hp *= cfg.bossMultiplier || 4;
                  boss.maxHp = boss.hp;
                  boss.curHp = boss.hp;
                  boss.dmg = Math.ceil(boss.dmg * 1.5);
                  boss.emoji = '🐉';
                  boss.color = '#ff5e6c';
                  boss._isBoss = true;
                  boss._bossSize = 2.0;
                  boss._invulnerable = true;
                  boss._attackPhase = 'idle';
                  boss._phaseTimer = Date.now() + 2000;
                  boss._attackPattern = 0;
                  boss._bossAbilities = ['slam', 'charge'];
                  if (cfg.monsterLevel >= 20) boss._bossAbilities.push('summon');
                  if (cfg.monsterLevel >= 40) boss._bossAbilities.push('sweep');
                  boss._nextAbility = Date.now() + 3000;
                  boss._abilityInterval = 4000;
                  S.monsters = [boss];
                  pushDmgPopup(S, P.x, P.y - 50, 'BOSS FIGHT!', '#ff5e6c');
                  BT_AUDIO.beep(100, 0.25, 0.3, 'sawtooth');
                  S.screenShake = 8;
                } else {
                  /* No boss — dungeon complete */
                  S._dungeonComplete = true;
                  pushDmgPopup(S, P.x, P.y - 50, 'DUNGEON CLEARED!', '#f5c542');
                  var bonusGold = 20 * cfg.waves;
                  var bonusXp = 50 * cfg.waves;
                  S.rpg.coins += bonusGold;
                  S.rpg.xp += bonusXp;
                  if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += bonusGold;
                  pushDmgPopup(S, P.x, P.y - 35, '+' + bonusGold + 'G +' + bonusXp + 'XP', '#f5c542');
                  BT_AUDIO.levelUp();
                  S.screenShake = 6;
                  setTimeout(function () {
                    var st = stateRef.current;
                    st._inDungeon = false;
                    st._inCustomDungeon = false;
                    st._customDungeonConfig = null;
                    /* v2.3.1406: per-zone loading — warm the farm map (idempotent;
                       usually still resident from the entry warp). */
                    import('@/rendering/preloadAnimations.js').then(function (m) { return m.preloadZoneAssets('farm_home'); }).catch(function () {});
                    st.currentZone = 'farm_home';
                    updateZoneDimensions('farm_home');
                    st.map = generateZoneMap('farm_home');
                    var fz = ZONES.farm_home;
                    globalThis.TOWN_W = fz.w * TILE;
                    globalThis.TOWN_H = fz.h * TILE;
                    globalThis.COLS = fz.w;
                    globalThis.ROWS = fz.h;
                    st.monsters = [];
                    st.gatherNodes = [];
                    st.groundLoot = [];
                    st.hitParticles = [];
                    st.deathExplosions = [];
                    st.arrows = [];
                    st.player.x = Math.floor(fz.w / 2) * TILE;
                    st.player.y = (fz.h - 4) * TILE;
                    st._zoneWipe = Date.now();
                  }, 3000);
                }
              } else {
                /* Standard dungeon boss */
                var _zone3 = ZONES[S._dungeonZone];
                var _nextDepth2 = {
                  shallow: 'mid',
                  mid: 'deep',
                  deep: 'abyss',
                  abyss: 'core'
                }[S._dungeonDepth];
                var _dc3 = DEPTH_CONFIG[_nextDepth2];
                var bossLvl = _zone3.level[0] + _dc3.levelMod + 10;
                var _boss = createMonster('boss-0', 'brute', bossLvl, Math.floor(_dW / 2) * TILE, Math.floor(_dH / 3) * TILE, _zone3.element);
                _boss.hp *= 8;
                _boss.maxHp = _boss.hp;
                _boss.curHp = _boss.hp;
                _boss.dmg = Math.ceil(_boss.dmg * 2);
                _boss.emoji = '🐉';
                _boss.color = '#ff5e6c';
                _boss._isBoss = true;
                _boss._bossSize = 2.5;
                _boss._invulnerable = true;
                _boss._attackPhase = 'idle';
                _boss._phaseTimer = Date.now() + 2000;
                _boss._attackPattern = 0;
                var depthIdx = _dc3.depthIdx || 0;
                _boss._bossAbilities = ['slam', 'charge'];
                if (depthIdx >= 1) _boss._bossAbilities.push('summon');
                if (depthIdx >= 2) _boss._bossAbilities.push('sweep');
                if (depthIdx >= 3) _boss._bossAbilities.push('enrage');
                _boss._nextAbility = Date.now() + 3000;
                _boss._abilityInterval = Math.max(3000, 6000 - depthIdx * 800);
                S.monsters = [_boss];
                pushDmgPopup(S, P.x, P.y - 50, 'BOSS FIGHT!', '#ff5e6c');
                pushDmgPopup(S, P.x, P.y - 35, 'Dodge attacks to expose weakness!', '#fbbf24');
                BT_AUDIO.beep(100, 0.25, 0.3, 'sawtooth');
                setTimeout(function () {
                  return BT_AUDIO.beep(80, 0.3, 0.35, 'sawtooth');
                }, 150);
                S.screenShake = 8;
              }
            } else if (S._dungeonBossSpawned) {
              /* Boss killed — dungeon complete! */
              S._dungeonComplete = true;
              if (S._inCustomDungeon) {
                /* §DNG — Custom dungeon complete with boss */
                var _cfg = S._customDungeonConfig;
                var _bonusGold = 30 * ((_cfg === null || _cfg === void 0 ? void 0 : _cfg.waves) || 3) + ((_cfg === null || _cfg === void 0 ? void 0 : _cfg.monsterLevel) || 1) * 2;
                var _bonusXp = 80 * ((_cfg === null || _cfg === void 0 ? void 0 : _cfg.waves) || 3) + ((_cfg === null || _cfg === void 0 ? void 0 : _cfg.monsterLevel) || 1) * 5;
                S.rpg.coins += _bonusGold;
                S.rpg.xp += _bonusXp;
                pushDmgPopup(S, P.x, P.y - 60, 'DUNGEON CLEARED!', '#f5c542');
                pushDmgPopup(S, P.x, P.y - 45, '+' + _bonusGold + 'G +' + _bonusXp + 'XP', '#f5c542');
                if (!S.rpg._compStats) S.rpg._compStats = createDefaultCompStats();
                S.rpg._compStats.dungeonsCleared++;
                S.rpg._compStats.totalGoldEarned += _bonusGold;
                BT_AUDIO.levelUp();
                S.screenShake = 10;
                setRpgState(_objectSpread({}, S.rpg));
                try {
                  localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                } catch (e) {}
                setTimeout(function () {
                  var st = stateRef.current;
                  st._inDungeon = false;
                  st._inCustomDungeon = false;
                  st._customDungeonConfig = null;
                  /* v2.3.1406: per-zone loading — warm the farm map (idempotent). */
                  import('@/rendering/preloadAnimations.js').then(function (m) { return m.preloadZoneAssets('farm_home'); }).catch(function () {});
                  st.currentZone = 'farm_home';
                  updateZoneDimensions('farm_home');
                  st.map = generateZoneMap('farm_home');
                  var fz = ZONES.farm_home;
                  globalThis.TOWN_W = fz.w * TILE;
                  globalThis.TOWN_H = fz.h * TILE;
                  globalThis.COLS = fz.w;
                  globalThis.ROWS = fz.h;
                  st.monsters = [];
                  st.gatherNodes = [];
                  st.groundLoot = [];
                  st.hitParticles = [];
                  st.deathExplosions = [];
                  st.arrows = [];
                  st.player.x = Math.floor(fz.w / 2) * TILE;
                  st.player.y = (fz.h - 4) * TILE;
                  st._zoneWipe = Date.now();
                }, 3000);
              } else {
                var _DEPTH_CONFIG$_nextDe, _DEPTH_CONFIG$_nextDe2;
                var _nextDepth3 = {
                  shallow: 'mid',
                  mid: 'deep',
                  deep: 'abyss',
                  abyss: 'core'
                }[S._dungeonDepth];
                var _clearKey = S._dungeonZone + '_' + S._dungeonDepth;
                if (!S.rpg.lifeSkills.dungeonClears) S.rpg.lifeSkills.dungeonClears = {};
                S.rpg.lifeSkills.dungeonClears[_clearKey] = true;
                /* Bonus rewards */
                var _bonusGold2 = 100 * (((_DEPTH_CONFIG$_nextDe = DEPTH_CONFIG[_nextDepth3]) === null || _DEPTH_CONFIG$_nextDe === void 0 ? void 0 : _DEPTH_CONFIG$_nextDe.depthIdx) || 1);
                var _bonusXp2 = 200 * (((_DEPTH_CONFIG$_nextDe2 = DEPTH_CONFIG[_nextDepth3]) === null || _DEPTH_CONFIG$_nextDe2 === void 0 ? void 0 : _DEPTH_CONFIG$_nextDe2.depthIdx) || 1);
                S.rpg.coins += _bonusGold2;
                S.rpg.xp += _bonusXp2;
                if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += _bonusGold2;
                pushDmgPopup(S, P.x, P.y - 60, 'DUNGEON CLEARED!', '#f5c542');
                pushDmgPopup(S, P.x, P.y - 45, '+' + _bonusGold2 + 'G +' + _bonusXp2 + 'XP', '#f5c542');
                pushDmgPopup(S, P.x, P.y - 30, _nextDepth3.toUpperCase() + ' depth unlocked!', '#a855f7');
                /* ═══ SHADOW/RADIANT CONVERGENCE — clearing core unlocks endgame zones ═══ */
                if (_nextDepth3 === 'core' || S._dungeonDepth === 'core') {
                  pushDmgPopup(S, P.x, P.y - 15, 'Shadow & Radiant zones revealed!', '#F1C40F');
                  if (!S.rpg._questFlags) S.rpg._questFlags = {};
                  S.rpg._questFlags.endgameUnlocked = true;
                }
                BT_AUDIO.levelUp();
                S.screenShake = 10;
                setRpgState(_objectSpread({}, S.rpg));
                try {
                  localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                } catch (e) {}
                /* Return to zone at NEXT depth after 3 seconds */
                setTimeout(function () {
                  var _ELEMENTS$zn$element2;
                  var st = stateRef.current;
                  st._inDungeon = false;
                  var zn = ZONES[st._dungeonZone];
                  st._currentDepth = _nextDepth3;
                  /* Generate fresh zone at the new deeper depth */
                  st.map = generateZoneMap(st._dungeonZone);
                  var dc = DEPTH_CONFIG[_nextDepth3];
                  globalThis.TOWN_W = zn.w * TILE;
                  globalThis.TOWN_H = zn.h * TILE;
                  globalThis.COLS = zn.w;
                  globalThis.ROWS = zn.h;
                  st.monsters = spawnMonstersForZone(zn, (dc === null || dc === void 0 ? void 0 : dc.levelMod) || 0);
                  st.gatherNodes = spawnGatherNodes(st._dungeonZone, _nextDepth3);
                  st.groundLoot = [];
                  st.hitParticles = [];
                  st.deathExplosions = [];
                  st.arrows = [];
                  st._ambientParticles = [];
                  /* Spawn player at center of new depth zone */
                  st.player.x = zn.w / 2 * TILE;
                  st.player.y = (zn.h - 3) * TILE;
                  st._zoneWipe = Date.now();
                  var lvlRange = dc.lvlRange || [1, 10];
                  pushDmgPopup(st, st.player.x, st.player.y - 40, zn.name + ' - ' + _nextDepth3.toUpperCase(), ((_ELEMENTS$zn$element2 = ELEMENTS[zn.element]) === null || _ELEMENTS$zn$element2 === void 0 ? void 0 : _ELEMENTS$zn$element2.color) || '#fff');
                  pushDmgPopup(st, st.player.x, st.player.y - 25, 'Lv ' + lvlRange[0] + '-' + lvlRange[1], 'rgba(255,255,255,.5)');
                }, 3000);
              } /* end standard dungeon completion */
            } else if (S._dungeonWave < S._dungeonMaxWaves) {
              /* Spawn next wave */
              var _dW2 = S.map[0].length,
                _dH2 = S.map.length;
              if (S._inCustomDungeon && S._customDungeonConfig) {
                /* §DNG — Custom dungeon wave */
                var _cfg2 = S._customDungeonConfig;
                var _waveArchs = _cfg2.monsters || [{
                  archetype: 'fodder',
                  count: 4,
                  element: null
                }];
                _waveArchs.forEach(function (mg, gi) {
                  for (var _wi = 0; _wi < mg.count; _wi++) {
                    var _mx = (3 + Math.random() * (_dW2 - 6)) * TILE;
                    var _my = (2 + Math.random() * (_dH2 / 2 - 2)) * TILE;
                    var _m2 = createMonster('cdw-' + S._dungeonWave + '-' + gi + '-' + _wi, mg.archetype, _cfg2.monsterLevel + Math.floor(Math.random() * 3), _mx, _my, _cfg2.element || mg.element);
                    _m2.curHp = _m2.hp;
                    _m2.type = mg.archetype;
                    S.monsters.push(_m2);
                  }
                });
              } else {
                /* Standard dungeon wave */
                var _zone4 = ZONES[S._dungeonZone];
                var _nextDepth4 = {
                  shallow: 'mid',
                  mid: 'deep',
                  deep: 'abyss',
                  abyss: 'core'
                }[S._dungeonDepth];
                var _dc4 = DEPTH_CONFIG[_nextDepth4];
                var _waveLvl = _zone4.level[0] + _dc4.levelMod + S._dungeonWave * 2;
                var _waveArchs2 = ['fodder', 'swarm', 'brute', 'sentinel', 'volatile', 'hexer', 'stalker'];
                var waveSize = 4 + S._dungeonWave + Math.floor(Math.random() * 2);
                for (var _wi2 = 0; _wi2 < waveSize; _wi2++) {
                  var _arch2 = _waveArchs2[Math.floor(Math.random() * _waveArchs2.length)];
                  var _mx2 = (3 + Math.random() * (_dW2 - 6)) * TILE;
                  var _my2 = (2 + Math.random() * (_dH2 / 2 - 2)) * TILE;
                  var _m3 = createMonster('dw-' + S._dungeonWave + '-' + _wi2, _arch2, _waveLvl, _mx2, _my2, _zone4.element);
                  _m3.curHp = _m3.hp;
                  _m3.type = _arch2;
                  S.monsters.push(_m3);
                }
              }
              pushDmgPopup(S, P.x, P.y - 40, 'Wave ' + (S._dungeonWave + 1) + '/' + S._dungeonMaxWaves, '#ff5e6c');
              BT_AUDIO.beep(300, 0.1, 0.15, 'sawtooth');
              S.screenShake = 4;
            }
          }
        }
}
