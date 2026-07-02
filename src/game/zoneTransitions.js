/* ═══ ZONE TRANSITIONS — town exits, return-to-town, dungeon entrance/exit ═══ */
/* v2.3.787: moved verbatim from the game loop in src/ui/BroTown.jsx
   (REBUILD-PLAN Phase 6, behavior-frozen). Runs once per frame after
   movement/collision. Contains:
   - town-exit proximity warp (v2.3.387 pink path-end markers) → themed zone
     at shallow depth, with spawn placement, monster push-back, and tile 9/10
     remap + path carving per entry direction;
   - combat-zone tile 9 → return to town at the exit you left from;
   - dungeon entrance tile 10 (DISABLED since v2.3.54 — the `if (false &&`
     gate is preserved verbatim, flip to `tile === 10` to re-enable);
   - dungeon exit tile 9 → return to the combat zone at current depth.
   Closure captures made explicit via imports below (never the globalThis
   copies). Frame-scope values arrive as arguments:
   - ptx/pty: the player tile BEFORE any transition this frame — the caller
     keeps using them after this returns (water check), so
     they are computed in BroTown and passed in;
   - _zone: ZONES[S.currentZone] read BEFORE any transition (the inline code
     evaluated it earlier in the frame — the dungeon-entrance bounds check
     intentionally sees the pre-transition zone);
   - W/H: CSS-pixel canvas size for the camera snap.
   S is stateRef.current; P is S.player (same object the loop mutates). */
import { TILE, ZONES, ELEMENTS, TOWN_EXITS, WORLDVIEW_EXITS, DEPTH_CONFIG, BT_AUDIO, updateZoneDimensions, discoverZone, generateZoneMap, spawnMonstersForZone, spawnGatherNodes, createMonster } from '@/data/index.js';
import { perfTracker } from '@/debug/perfTracker.js';
import { _typeof } from '@/lib/babelHelpers.js';

export function handleZoneTransitions(S, ptx, pty, _zone, W, H) {
  var P = S.player;
        /* v2.3.387: town exits are PROXIMITY zones on the painted
           path-ends (the pink markers), not the map edge.  Transition when
           the player walks within TOWN_EXIT_R tiles (manhattan) of an exit
           marker.  Nearest marker wins if two overlap. */
        /* v2.3.859: hubs with exit markers -- the town and the World View.
           Each branches via its own exits array. */
        var _hubExits = S.currentZone === 'town' ? TOWN_EXITS
          : (S.currentZone === 'worldview' ? WORLDVIEW_EXITS : null);
        if (_hubExits) {
          var TOWN_EXIT_R = 2;
          var bestExit = null,
            bestDist = Infinity;
          _hubExits.forEach(function (ex) {
            var d = Math.abs(ptx - ex.tx) + Math.abs(pty - ex.ty);
            if (d <= TOWN_EXIT_R && d < bestDist) {
              bestDist = d;
              bestExit = ex;
            }
          });
          if (bestExit) {
            /* Zone exits — open to all players (quest gate removed) */
            {
              S._enteredFromHub = S.currentZone; /* v2.3.859: which hub (town/worldview) to return to */
              S.currentZone = bestExit.zoneId;
              perfTracker.setZone(bestExit.zoneId);
              updateZoneDimensions(bestExit.zoneId);
              BT_AUDIO.startZoneAmbient(bestExit.zoneId);
              discoverZone(bestExit.zoneId); /* §ENC — Encyclopedia zone discovery */
              if (S.rpg) {
                if (!S.rpg._questFlags) S.rpg._questFlags = {};
                if (!S.rpg._questFlags.zonesVisited || _typeof(S.rpg._questFlags.zonesVisited) !== 'object') S.rpg._questFlags.zonesVisited = {};
                /* Fix broken Set from old save data */
                if (S.rpg._questFlags.zonesVisited instanceof Set) {
                  var old = S.rpg._questFlags.zonesVisited;
                  S.rpg._questFlags.zonesVisited = {};
                  old.forEach(function (v) {
                    return S.rpg._questFlags.zonesVisited[v] = true;
                  });
                }
                if (typeof S.rpg._questFlags.zonesVisited.add === 'function') S.rpg._questFlags.zonesVisited = {}; /* nuclear fallback */
                S.rpg._questFlags.zonesVisited[bestExit.zoneId] = true;
              }
              /* ═══ ZONE ENTRY — always start at shallow depth ═══ */
              /* Players always enter the first zone layer. Dungeons warp to deeper depths. */
              /* This preserves the sense of progression — you walk through the shallow zone */
              /* to reach the dungeon entrance, which then takes you to your deepest unlocked depth. */
              var entryDepth = 'shallow';
              S._currentDepth = entryDepth;
              S.map = generateZoneMap(bestExit.zoneId);
              var newZone = ZONES[bestExit.zoneId];
              /* Monsters + nodes at shallow depth */
              var depthCfg = DEPTH_CONFIG[entryDepth];
              if(!S._serverMonsters) S.monsters = spawnMonstersForZone(newZone, (depthCfg === null || depthCfg === void 0 ? void 0 : depthCfg.levelMod) || 0);
              if (!S._serverGatherNodes) S.gatherNodes = spawnGatherNodes(bestExit.zoneId, entryDepth);
              var nW = newZone.w * TILE,
                nH = newZone.h * TILE;
              /* Spawn continues your direction of travel from town.
                 Then remap tile 9 (return) to the entry edge and tile 10 (dungeon) to the far edge. */
              S._enteredFromDir = bestExit.dir; /* remember entry direction for return */
              S._enteredFromExit = { tx: bestExit.tx, ty: bestExit.ty }; /* v2.3.861: exact hub exit, so the return lands where you left */
              var midX = Math.floor(newZone.w / 2) * TILE;
              var midY = Math.floor(newZone.h / 2) * TILE;
              /* Spawn opposite to entry direction so the zone is "in
                 front of" the player. Cardinal: drop in on the back
                 edge. Diagonal: drop in at the opposite corner.
                 The dungeon entrance (tile 10) is placed at column MX,
                 row 2 in every themed zone — for entries that would
                 otherwise land the player on column MX near the north
                 edge ('south'), shift them off-axis so they don't
                 spawn on the dungeon-approach path facing the
                 entrance.  For 'se' / 'sw' / 'south' that share the
                 north-area band, also tuck them a bit deeper. */
              if (bestExit.dir === 'north')      { P.x = midX;             P.y = nH - TILE * 5; }
              else if (bestExit.dir === 'south') { P.x = midX - TILE * 5;  P.y = TILE * 8;       }
              else if (bestExit.dir === 'east')  { P.x = TILE * 5;         P.y = midY;           }
              else if (bestExit.dir === 'west')  { P.x = nW - TILE * 5;    P.y = midY;           }
              else if (bestExit.dir === 'ne')    { P.x = TILE * 5;         P.y = nH - TILE * 5;  }
              else if (bestExit.dir === 'nw')    { P.x = nW - TILE * 5;    P.y = nH - TILE * 5;  }
              else if (bestExit.dir === 'se')    { P.x = TILE * 5;         P.y = TILE * 8;       }
              else if (bestExit.dir === 'sw')    { P.x = nW - TILE * 5;    P.y = TILE * 8;       }
              else                                { P.x = midX;             P.y = nH - TILE * 5; }
              /* v2.3.860: entering the World View, spawn by the central town
                 circle (just south of centre), not flung to the ocean edge. */
              /* v2.3.948: hub destinations (worldview AND town) drop the player
                 just south of centre, clear of the OTHER hub's return-trigger.
                 Town's worldview-exit sits at the bottom edge (ty 44); the old
                 dir='north' spawn landed the player at ty 43 -- one tile from that
                 trigger -- so worldview->town instantly bounced back, spamming the
                 enter/exit-town messages. Landing near centre breaks the bounce. */
              if (bestExit.zoneId === 'worldview' || bestExit.zoneId === 'town') { P.x = midX; P.y = midY + TILE * 7; }
              /* Push monsters away from player spawn — minimum 200px distance */
              var _minSpawnDist = 200;
              if (S.monsters) {
                S.monsters.forEach(function(mon) {
                  var mdx2 = mon.x - P.x, mdy2 = mon.y - P.y;
                  var md2 = Math.sqrt(mdx2 * mdx2 + mdy2 * mdy2);
                  if (md2 < _minSpawnDist && md2 > 0) {
                    var pushScale = _minSpawnDist / md2;
                    mon.x = P.x + mdx2 * pushScale;
                    mon.y = P.y + mdy2 * pushScale;
                  } else if (md2 === 0) {
                    mon.x += _minSpawnDist;
                  }
                  mon.x = Math.max(TILE * 3, Math.min(nW - TILE * 3, mon.x));
                  mon.y = Math.max(TILE * 3, Math.min(nH - TILE * 3, mon.y));
                  mon.spawnX = mon.x;
                  mon.spawnY = mon.y;
                });
              }
              /* Remap exits: move return exit (tile 9) to entry edge, dungeon (tile 10) to far edge */
              var mapH = S.map.length, mapW = S.map[0].length;
              var mapMX = Math.floor(mapW / 2);
              var mapMY = Math.floor(mapH / 2);
              /* Clear old exit/dungeon tiles */
              for (var my = 0; my < mapH; my++) for (var mx = 0; mx < mapW; mx++) {
                if (S.map[my][mx] === 9 || S.map[my][mx] === 10) S.map[my][mx] = 1;
              }
              /* Helper: carve a path (tile 1) through walls from edge to center road */
              function carvePath(startX, startY, dirX, dirY, length) {
                for (var step = 0; step < length; step++) {
                  var py2 = startY + dirY * step;
                  var px2 = startX + dirX * step;
                  if (py2 >= 0 && py2 < mapH && px2 >= 0 && px2 < mapW) {
                    if (S.map[py2][px2] === 7 || S.map[py2][px2] === 4) S.map[py2][px2] = 1;
                    /* Also clear adjacent tile for 2-wide path */
                    var adj = dirY !== 0 ? px2 + 1 : py2 + 1;
                    if (dirY !== 0 && adj < mapW && (S.map[py2][adj] === 7 || S.map[py2][adj] === 4)) S.map[py2][adj] = 1;
                    if (dirX !== 0 && adj < mapH && (S.map[adj][px2] === 7 || S.map[adj][px2] === 4)) S.map[adj][px2] = 1;
                  }
                }
              }
              /* Place return exit at the spawn corner/edge, dungeon at
                 the far corner/edge, then carve a short cardinal path
                 from each so the player has a walkable tile to step on.
                 Diagonals get tile placements at corners with paths
                 carved along both adjacent cardinals. */
              if (bestExit.dir === 'north') {
                S.map[mapH-1][mapMX] = 9; S.map[mapH-1][mapMX+1] = 9;
                S.map[2][mapMX] = 10; S.map[2][mapMX+1] = 10;
                carvePath(mapMX, mapH-1, 0, -1, 4);
                carvePath(mapMX, 2, 0, 1, 4);
              } else if (bestExit.dir === 'south') {
                S.map[0][mapMX] = 9; S.map[0][mapMX+1] = 9;
                S.map[mapH-3][mapMX] = 10; S.map[mapH-3][mapMX+1] = 10;
                carvePath(mapMX, 0, 0, 1, 4);
                carvePath(mapMX, mapH-3, 0, -1, 4);
              } else if (bestExit.dir === 'east') {
                S.map[mapMY][0] = 9; S.map[mapMY+1][0] = 9;
                S.map[mapMY][mapW-3] = 10; S.map[mapMY+1][mapW-3] = 10;
                carvePath(0, mapMY, 1, 0, 4);
                carvePath(mapW-3, mapMY, -1, 0, 4);
              } else if (bestExit.dir === 'west') {
                S.map[mapMY][mapW-1] = 9; S.map[mapMY+1][mapW-1] = 9;
                S.map[mapMY][2] = 10; S.map[mapMY+1][2] = 10;
                carvePath(mapW-1, mapMY, -1, 0, 4);
                carvePath(2, mapMY, 1, 0, 4);
              } else if (bestExit.dir === 'ne') {
                /* Entered from town's NE → spawned in zone's SW corner.
                   Return tile at SW; dungeon at NE. */
                S.map[mapH-1][1] = 9; S.map[mapH-1][2] = 9;
                S.map[2][mapW-3] = 10; S.map[2][mapW-2] = 10;
                carvePath(2, mapH-1, 0, -1, 4); carvePath(2, mapH-1, 1, 0, 4);
                carvePath(mapW-3, 2, 0, 1, 4); carvePath(mapW-3, 2, -1, 0, 4);
              } else if (bestExit.dir === 'nw') {
                /* SE corner spawn → return SE, dungeon NW. */
                S.map[mapH-1][mapW-3] = 9; S.map[mapH-1][mapW-2] = 9;
                S.map[2][1] = 10; S.map[2][2] = 10;
                carvePath(mapW-3, mapH-1, 0, -1, 4); carvePath(mapW-3, mapH-1, -1, 0, 4);
                carvePath(2, 2, 0, 1, 4); carvePath(2, 2, 1, 0, 4);
              } else if (bestExit.dir === 'se') {
                /* NW corner spawn → return NW, dungeon SE. */
                S.map[1][1] = 9; S.map[1][2] = 9;
                S.map[mapH-3][mapW-3] = 10; S.map[mapH-3][mapW-2] = 10;
                carvePath(2, 1, 0, 1, 4); carvePath(2, 1, 1, 0, 4);
                carvePath(mapW-3, mapH-3, 0, -1, 4); carvePath(mapW-3, mapH-3, -1, 0, 4);
              } else if (bestExit.dir === 'sw') {
                /* NE corner spawn → return NE, dungeon SW. */
                S.map[1][mapW-3] = 9; S.map[1][mapW-2] = 9;
                S.map[mapH-3][1] = 10; S.map[mapH-3][2] = 10;
                carvePath(mapW-3, 1, 0, 1, 4); carvePath(mapW-3, 1, -1, 0, 4);
                carvePath(2, mapH-3, 0, -1, 4); carvePath(2, mapH-3, 1, 0, 4);
              }
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 40,
                text: newZone.name,
                color: newZone.element ? ELEMENTS[newZone.element].color : '#fff',
                ts: Date.now()
              });
              S.npcs = null;
              S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
              S.hitParticles = [];
              S.deathExplosions = [];
              S.arrows = [];
              /* §5.5 Restore death-scattered items if returning to death zone */
              if (S._deathDrops) {
                var zoneDrops = S._deathDrops.filter(function (d) {
                  return d.zone === bestExit.zoneId && Date.now() < d.expiry;
                });
                zoneDrops.forEach(function (dd) {
                  S.groundLoot.push({
                    x: dd.x,
                    y: dd.y,
                    ts: Date.now(),
                    isDeathDrop: true,
                    deathItems: dd.items,
                    coins: 0,
                    xp: 0,
                    expiry: dd.expiry
                  });
                });
                /* Remove expired drops */
                S._deathDrops = S._deathDrops.filter(function (d) {
                  return Date.now() < d.expiry && d.zone !== bestExit.zoneId;
                });
              }
              S._zoneWipe = Date.now(); /* trigger transition wipe */
              S._ambientParticles = []; /* clear old zone particles */
              /* Snap camera to player — keep them centered, no edge clamp. */
              S.camera.x = P.x - W / 2;
              S.camera.y = P.y - H / 2;
            } /* end zone transition */
          }
        } else if (S.currentZone !== 'town' && S.currentZone !== 'worldview' && !S._inDungeon) {
          /* In combat zones: return to town when NEAR a tile-9 return marker.
             v2.3.823: was an exact step-onto-tile-9 check, but the player's
             bottom foot-margin (kept off the dashboard) now leaves the very
             bottom rows unreachable -- return markers placed on the bottom
             edge (north/ne/nw entries) could never be stepped on.  Match the
             town-exit model: trigger within RETURN_R tiles (manhattan) of a
             return marker.  The 5-tile entry spawn keeps the player clear of
             this radius on arrival, so it won't fire immediately. */
          var czZone = ZONES[S.currentZone];
          var czPtx = Math.floor(P.x / TILE),
            czPty = Math.floor(P.y / TILE);
          var czMX = Math.floor(czZone.w / 2);
          var RETURN_R = 2;
          var _czNearReturn = false;
          if (S.map) {
            for (var _ry = czPty - RETURN_R; _ry <= czPty + RETURN_R && !_czNearReturn; _ry++) {
              var _crow = S.map[_ry];
              if (!_crow) continue;
              for (var _rx = czPtx - RETURN_R; _rx <= czPtx + RETURN_R; _rx++) {
                if (_crow[_rx] === 9 && (Math.abs(_ry - czPty) + Math.abs(_rx - czPtx)) <= RETURN_R) { _czNearReturn = true; break; }
              }
            }
          }
          if (_czNearReturn) {
            var _retHub = (S._enteredFromHub === 'worldview') ? 'worldview' : 'town'; /* v2.3.859 */
            S.currentZone = _retHub;
            updateZoneDimensions(_retHub);
            BT_AUDIO.startZoneAmbient(_retHub);
            S.map = generateZoneMap(_retHub);
            S.monsters = []; /* hub has no monsters */
            S.gatherNodes = []; /* and no harvestable resources -- clear stale entries from the previous zone */
            /* Spawn at the same town extreme you originally left from
               — 8 directions including diagonals so corner-exit zones
               return you to the same corner. */
            /* v2.3.387: return to town just INSIDE the exit marker you
               left from -- offset 4 tiles toward the hub center so you land
               on the path clear of the proximity trigger (else you'd warp
               straight back out). */
            var twn2 = ZONES[_retHub];
            var _rcx = twn2.w / 2, _rcy = twn2.h / 2;
            /* v2.3.861: return to the EXACT hub exit the player left from, so
               they land back on the trail-head they entered the zone at. */
            var _rex = S._enteredFromExit;
            if (_rex) {
              var _rdx = _rcx - _rex.tx, _rdy = _rcy - _rex.ty;
              var _rlen = Math.max(0.001, Math.sqrt(_rdx * _rdx + _rdy * _rdy));
              P.x = (_rex.tx + _rdx / _rlen * 4) * TILE;
              P.y = (_rex.ty + _rdy / _rlen * 4) * TILE;
            } else {
              P.x = _rcx * TILE; P.y = _rcy * TILE;
            }
            S._enteredFromDir = null;
            S._enteredFromExit = null;
            S.dmgNumbers.push({
              x: P.x,
              y: P.y - 40,
              text: _retHub === 'worldview' ? 'World View' : 'Town',
              color: '#5b52ff',
              ts: Date.now()
            });
            S.npcs = null;
            S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
            S.hitParticles = [];
            S.deathExplosions = [];
            S.arrows = [];
            S._zoneWipe = Date.now();
            S._ambientParticles = [];
            /* Snap camera to player — keep them centered, no edge clamp. */
            S.camera.x = P.x - W / 2;
            S.camera.y = P.y - H / 2;
          }
        }

        /* Dungeon entrance — tile 10 */
        if (S.map && ptx >= 0 && pty >= 0 && pty < _zone.h && ptx < _zone.w) {
          var _S$map$pty;
          var tile = (_S$map$pty = S.map[pty]) === null || _S$map$pty === void 0 ? void 0 : _S$map$pty[ptx];
          /* Dungeon entry disabled v2.3.54 per user request -- the
             depth-tier dungeons aren't ready for play yet so the
             tile-10 trigger no-ops.  Flip this to `tile === 10` to
             re-enable.  Generated maps still place tile 10 at the
             far edge but stepping on it does nothing now. */
          if (false && tile === 10 && S.currentZone !== 'town' && !S._inDungeon) {
            var _S$rpg6;
            /* §14.1 Dungeon entrance — find deepest accessible depth */
            var currentDepth = S._currentDepth || 'shallow';
            var depthOrder = ['shallow', 'mid', 'deep', 'abyss', 'core'];
            var currentIdx = depthOrder.indexOf(currentDepth);
            var clearKey = S.currentZone + '_' + currentDepth;
            var isCleared = (_S$rpg6 = S.rpg) === null || _S$rpg6 === void 0 || (_S$rpg6 = _S$rpg6.lifeSkills) === null || _S$rpg6 === void 0 || (_S$rpg6 = _S$rpg6.dungeonClears) === null || _S$rpg6 === void 0 ? void 0 : _S$rpg6[clearKey];
            if (currentIdx >= depthOrder.length - 1 && isCleared) {
              /* Core is cleared — zone fully done */
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 30,
                text: 'Zone fully cleared!',
                color: '#3dd497',
                ts: Date.now()
              });
            } else if (isCleared) {
              var _ELEMENTS$zn$element;
              /* Current depth already cleared — warp to next depth zone (skip dungeon) */
              var nextDepth = depthOrder[currentIdx + 1];
              S._currentDepth = nextDepth;
              var dc = DEPTH_CONFIG[nextDepth];
              var zn = ZONES[S.currentZone];
              S.map = generateZoneMap(S.currentZone);
              if(!S._serverMonsters) S.monsters = spawnMonstersForZone(zn, (dc === null || dc === void 0 ? void 0 : dc.levelMod) || 0);
              if (!S._serverGatherNodes) S.gatherNodes = spawnGatherNodes(S.currentZone, nextDepth);
              P.x = zn.w / 2 * TILE;
              P.y = (zn.h - 3) * TILE;
              S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
              S.hitParticles = [];
              S.deathExplosions = [];
              S.arrows = [];
              S._ambientParticles = [];
              S._zoneWipe = Date.now();
              var lvlRange = dc.lvlRange || [1, 10];
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 40,
                text: zn.name + ' - ' + nextDepth.toUpperCase(),
                color: ((_ELEMENTS$zn$element = ELEMENTS[zn.element]) === null || _ELEMENTS$zn$element === void 0 ? void 0 : _ELEMENTS$zn$element.color) || '#fff',
                ts: Date.now()
              });
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 25,
                text: 'Lv ' + lvlRange[0] + '-' + lvlRange[1],
                color: 'rgba(255,255,255,.5)',
                ts: Date.now()
              });
              BT_AUDIO.beep(500, 0.08, 0.1, 'sine');
            } else {
              /* Current depth NOT cleared — enter dungeon fight! */
              var nextDepthMap = {
                shallow: 'mid',
                mid: 'deep',
                deep: 'abyss',
                abyss: 'core'
              };
              var _nextDepth = nextDepthMap[currentDepth];
              /* Enter dungeon! */
              S._inDungeon = true;
              S._dungeonZone = S.currentZone;
              S._dungeonDepth = currentDepth;
              S._dungeonWave = 0;
              S._dungeonMaxWaves = 3 + DEPTH_CONFIG[_nextDepth].depthIdx;
              S._dungeonBossSpawned = false;
              S._dungeonComplete = false;
              S._preDungeonPos = {
                x: P.x,
                y: P.y
              };

              /* Generate small dungeon arena */
              var dW = 25,
                dH = 20;
              S._preDungeonMap = S.map;
              S._preDungeonMonsters = S.monsters;
              S._preDungeonNodes = S.gatherNodes;
              var dMap = Array.from({
                length: dH
              }, function () {
                return Array(dW).fill(0);
              });
              /* Walls around edge */
              for (var x = 0; x < dW; x++) {
                dMap[0][x] = 7;
                dMap[dH - 1][x] = 7;
              }
              for (var y = 0; y < dH; y++) {
                dMap[y][0] = 7;
                dMap[y][dW - 1] = 7;
              }
              /* Path cross */
              var dMX = Math.floor(dW / 2),
                dMY = Math.floor(dH / 2);
              for (var _x17 = 1; _x17 < dW - 1; _x17++) dMap[dMY][_x17] = 1;
              for (var _y15 = 1; _y15 < dH - 1; _y15++) dMap[_y15][dMX] = 1;
              S.map = dMap;
              /* Add exit tile at bottom of dungeon (tile 9 = return) */
              dMap[dH - 1][dMX] = 9;
              dMap[dH - 1][dMX + 1] = 9;
              globalThis.TOWN_W = dW * TILE;
              globalThis.TOWN_H = dH * TILE;
              globalThis.COLS = dW;
              globalThis.ROWS = dH;
              S.monsters = [];
              S.gatherNodes = [];
              S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
              S.hitParticles = [];
              S.deathExplosions = [];
              S.arrows = [];
              P.x = dMX * TILE;
              P.y = (dH - 3) * TILE;

              /* Spawn first wave */
              var _zone2 = ZONES[S.currentZone];
              var _dc = DEPTH_CONFIG[_nextDepth];
              var waveLvl = _zone2.level[0] + _dc.levelMod;
              var waveArchs = ['fodder', 'swarm', 'brute', 'sentinel', 'volatile', 'hexer', 'stalker'];
              for (var wi = 0; wi < 4 + S._dungeonWave; wi++) {
                var _arch = waveArchs[Math.floor(Math.random() * waveArchs.length)];
                var mx = (3 + Math.random() * (dW - 6)) * TILE;
                var my = (2 + Math.random() * (dH / 2 - 2)) * TILE;
                var m = createMonster('dw-0-' + wi, _arch, waveLvl + Math.floor(Math.random() * 5), mx, my, _zone2.element);
                m.curHp = m.hp;
                m.type = _arch;
                S.monsters.push(m);
              }
              S.dmgNumbers.push({
                x: P.x,
                y: P.y - 40,
                text: 'DUNGEON: Wave 1/' + S._dungeonMaxWaves,
                color: '#ff5e6c',
                ts: Date.now()
              });
              BT_AUDIO.beep(200, 0.15, 0.2, 'sawtooth');
              setTimeout(function () {
                return BT_AUDIO.beep(150, 0.2, 0.25, 'sawtooth');
              }, 100);
            }
          }
        }

        /* ═══ DUNGEON EXIT — tile 9 in dungeon returns to zone ═══ */
        if (S._inDungeon && S.map && ptx >= 0 && pty >= 0) {
          var _S$map$pty2;
          var dTile = (_S$map$pty2 = S.map[pty]) === null || _S$map$pty2 === void 0 ? void 0 : _S$map$pty2[ptx];
          if (dTile === 9) {
            /* v2.3.1127: abandoning a server-dungeon instance --
               restore the real zone BEFORE the legacy regen below
               reads S.currentZone, drop the synthetic ZONES entry,
               and tell the worker we left (the emptied instance is
               swept server-side; no partial rewards). */
            if (S._serverDungeon) {
              if (ZONES[S._serverDungeon] && ZONES[S._serverDungeon]._instance) delete ZONES[S._serverDungeon];
              S.currentZone = S._dungeonZone || 'town';
              S._serverDungeon = null;
              S._inCustomDungeon = false;
              S._customDungeonConfig = null;
              S._serverMonsters = false;
              S.monsters = [];
              if (S.channel) {
                try { S.channel.send({ type: 'broadcast', event: 'move', payload: { x: P.x, y: P.y, z: S.currentZone, vx: 0, vy: 0 } }); } catch (e) {}
              }
            }
            /* Exit dungeon — return to combat zone at current depth */
            S._inDungeon = false;
            S._dungeonComplete = false;
            var _zn = ZONES[S._dungeonZone || S.currentZone];
            var depth = S._currentDepth || 'shallow';
            S.map = generateZoneMap(S.currentZone);
            var _dc2 = DEPTH_CONFIG[depth];
            globalThis.TOWN_W = _zn.w * TILE;
            globalThis.TOWN_H = _zn.h * TILE;
            globalThis.COLS = _zn.w;
            globalThis.ROWS = _zn.h;
            if(!S._serverMonsters) S.monsters = spawnMonstersForZone(_zn, (_dc2 === null || _dc2 === void 0 ? void 0 : _dc2.levelMod) || 0);
            if (!S._serverGatherNodes) S.gatherNodes = spawnGatherNodes(S.currentZone, depth);
            S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
            S.hitParticles = [];
            S.deathExplosions = [];
            S.arrows = [];
            S._ambientParticles = [];
            /* Spawn south of the dungeon entrance — the entrance sits at
               (MX, 2) and the path runs along column MX down to the
               south exit, so dropping the player on (MX, 5) like
               before put them facing the entrance with one stray
               north step re-entering the dungeon.  Shift off-column
               and a few rows south so they're clearly OUTSIDE. */
            P.x = (Math.floor(_zn.w / 2) - 5) * TILE;
            P.y = TILE * 8;
            S._zoneWipe = Date.now();
            S.dmgNumbers.push({
              x: P.x,
              y: P.y - 30,
              text: 'Exited dungeon',
              color: '#3dd497',
              ts: Date.now()
            });
            BT_AUDIO.beep(500, 0.05, 0.06, 'sine');
          }
        }
}
