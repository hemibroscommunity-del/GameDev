/* ═══ DUNGEON WAVES — §14.1 wave progression, boss spawn, completion ═══ */
/* v2.3.810: moved verbatim from the game loop in src/ui/BroTown.jsx
   (REBUILD-PLAN Phase 8, slice 2; behavior-frozen). Runs once per frame.
   When all monsters in a dungeon wave are dead: spawns the next wave,
   or the boss (custom §DNG config or standard depth-scaled brute), or
   completes the dungeon (custom → rewards + return to farm_home;
   standard → dungeonClears unlock, next-depth warp, endgame-zone flag
   on core clear).
   Liveness: the CUSTOM dungeon path is reachable in play (Dungeon
   Workshop). v2.3.4673: the STANDARD (depth-tier) path is deleted -- its
   only way in, the tile-10 entrance, was off from v2.3.54 and is gone too.
   deps = { stateRef, setRpgState }: the 3s return-home setTimeouts
   re-read stateRef.current (not the frame's S) exactly like the inline
   code did; setRpgState publishes reward state to React. */
import { ZONES, TILE, BT_AUDIO, createMonster, createDefaultCompStats, updateZoneDimensions, generateZoneMap } from '@/data/index.js';   /* v2.3.4673: the standard dungeon's imports went with it */
import { _objectSpread } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
import { FARM_FROM_WORKSHOP } from '@/data/farmLayout.js';   /* v2.3.3136: the farm you walk */
import { holdFarmUntilReady } from '@/game/farmTrip.js';
import { changeZone } from '@/game/zoneTransitions.js';   /* v2.3.4651: the one door (TRAPS §304) */
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
                  /* v2.3.3540: at the dungeon's level, as the worker's (server data.js DUNGEON_BOSS_UP; it was + 5) */
                  var boss = createMonster('cboss-0', bossArch, cfg.monsterLevel, Math.floor(_dW / 2) * TILE, Math.floor(_dH / 3) * TILE, cfg.element);
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
                    changeZone(st, 'farm_home');   /* v2.3.4651: the one door (TRAPS §304) */
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
                    /* v2.3.3136: back at the Dungeon Workshop's board, held
                       under the farm's loading screen (game/farmTrip.js) */
                    st.player.x = FARM_FROM_WORKSHOP.x;
                    st.player.y = FARM_FROM_WORKSHOP.y;
                    st._zoneWipe = Date.now();
                    holdFarmUntilReady(st);
                  }, 3000);
                }
              }
                /* v2.3.4673: the standard (depth-tier) dungeon's boss went here: only the
                   tile-10 entrance (never on since v2.3.54) ever started one */
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
                  changeZone(st, 'farm_home');   /* v2.3.4651: the one door (TRAPS §304) */
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
                  /* v2.3.3136: back at the Dungeon Workshop's board (game/farmTrip.js) */
                  st.player.x = FARM_FROM_WORKSHOP.x;
                  st.player.y = FARM_FROM_WORKSHOP.y;
                  st._zoneWipe = Date.now();
                  holdFarmUntilReady(st);
                }, 3000);
              }
                /* v2.3.4673: the standard dungeon's completion went here (the next depth, the
                   Shadow & Radiant unlock): unreachable, as above */
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
              }
                /* v2.3.4673: the standard dungeon's next wave went here: unreachable, as above */
              pushDmgPopup(S, P.x, P.y - 40, 'Wave ' + (S._dungeonWave + 1) + '/' + S._dungeonMaxWaves, '#ff5e6c');
              BT_AUDIO.beep(300, 0.1, 0.15, 'sawtooth');
              S.screenShake = 4;
            }
          }
        }
}
