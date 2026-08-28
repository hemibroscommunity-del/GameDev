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
import { TILE, ZONES, ELEMENTS, TOWN_EXITS, WORLDVIEW_EXITS, WORLDVIEW_ARRIVAL, DEPTH_CONFIG, BT_AUDIO, updateZoneDimensions, discoverZone, generateZoneMap, spawnMonstersForZone, spawnGatherNodes, createMonster } from '@/data/index.js';
import { zoneUnlockQuest } from '@/game/questRoute.js'; /* v2.3.1817: which quest opens a zone */
import { perfTracker } from '@/debug/perfTracker.js';
import { _typeof } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
import { onZoneEntered } from '@/networking/nodeSync.js'; /* v2.3.1301: gather-node self-heal */
import { preloadZoneAssets } from '@/rendering/preloadAnimations.js'; /* v2.3.1405: per-zone asset gate */
import { freeZoneMap, isZoneMapResident } from '@/rendering/tiledMaps.js'; /* v2.3.1405: map eviction + sync residency check */

/* ═══ v2.3.1693: KEEP PORTALS OFF THE MAP EDGE ═══
   Owner: "move the portals (to and from the worldview to the zones) a bit
   closer inside the map.  They're getting cut off by the dashboard a bit so
   they barely poke out."
   Every live hub exit today enters a zone heading north/ne/nw, and all three
   of those put the return marker (tile 9) on the LAST row of the zone map.
   With the camera clamped to the map bottom, that row sits under the bottom
   dashboard — the same occlusion v2.3.823 already worked around by making the
   return a proximity trigger instead of a step-on tile, because the player's
   foot margin couldn't reach those rows either.  The portal was always there;
   you just couldn't see it.  Pull the bottom-edge markers this many tiles up.
   The bottom-edge ENTRY SPAWNS move up by the same amount, or the arrival
   would land inside RETURN_R (2) of the marker and bounce the player straight
   back to the hub.  Top-edge markers (south/se/sw entries — no live exit uses
   them today) are left alone: nothing covers the top of the screen. */
var PORTAL_EDGE_INSET = 3;

/* v2.3.1708: how long the trail-head you just arrived through ignores you.
   Long enough to swallow the momentum of the walk that brought you here
   (the owner's "continuing the downward run makes the character run into the
   portal into town again"), short enough that a deliberate turn-around is
   never refused — the previous 8-tile distance latch refused it for as long
   as you stayed near the portal, which read as the portal being broken. */
var HUB_EXIT_DEAF_MS = 2500;

/* v2.3.1347: fixed directional entry spawns don't consult the painted
   walkability masks, so zones whose mask blocks the spawn point strand
   the player on unwalkable ground — Desert Winds ('sky') stuck every
   south-entry player on the dune mask (owner playtest). After the spawn
   point is chosen, snap it to the nearest walkable grid cell: ring
   search outward from the spawn cell, preferring cells whose four
   neighbours are also walkable (so we don't drop onto a 1-cell island),
   falling back to any walkable cell. Zones without a mask are fully
   walkable — no-op. Grid semantics match isSolid(): grid[gy][gx] ===
   false blocks; the grid has its own resolution, scaled via the zone's
   world-pixel extent. */
function nudgeSpawnToWalkable(S, zoneId, zone) {
  var P = S.player;
  var grid = (S._tiledWalkable && S._tiledWalkable[zoneId]) || null;
  if (!grid || !grid.length || !grid[0] || !grid[0].length) return;
  var gh = grid.length, gw = grid[0].length;
  var mw = zone.w * TILE, mh = zone.h * TILE;
  var gx = Math.max(0, Math.min(gw - 1, Math.floor(P.x * gw / mw)));
  var gy = Math.max(0, Math.min(gh - 1, Math.floor(P.y * gh / mh)));
  var open = function (x, y) { return y >= 0 && y < gh && x >= 0 && x < gw && grid[y][x] !== false; };
  /* Full 3x3 block open — the movement hitbox (20x20, hs=10 in
     BroTown.jsx) spans up to 3 grid cells including diagonals when the
     grid runs finer than TILE (sky's mask is 64x64 → 16px cells), so a
     lone walkable cell still wedges the player. */
  var roomy = function (x, y) {
    for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
      if (!open(x + ox, y + oy)) return false;
    }
    return true;
  };
  if (roomy(gx, gy)) return;
  var fallback = open(gx, gy) ? { x: gx, y: gy } : null;
  var maxR = Math.max(gw, gh);
  for (var r = 1; r < maxR; r++) {
    var best = null, bestD = Infinity;
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; /* ring perimeter only */
        var nx = gx + dx, ny = gy + dy;
        if (!open(nx, ny)) continue;
        if (!fallback) fallback = { x: nx, y: ny };
        if (!roomy(nx, ny)) continue;
        var d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
      }
    }
    if (best) {
      P.x = (best.x + 0.5) * (mw / gw);
      P.y = (best.y + 0.5) * (mh / gh);
      return;
    }
  }
  if (fallback) {
    P.x = (fallback.x + 0.5) * (mw / gw);
    P.y = (fallback.y + 0.5) * (mh / gh);
  }
}

/* v2.3.1405: per-zone loading overlay — a full-screen dark veil with a
   spinner + destination zone name, injected DIRECTLY on document.body
   (outside the React tree, z-index above everything) while
   preloadZoneAssets warms the next zone's map + monster variants.  Mirrors
   the body-injected bt-rejoin-loading spinner (BroTown.jsx); lives here
   because the gate that drives it lives here.  Its compositor-driven CSS
   spin keeps turning through main-thread stutter. */
var _zoneLoadEl = null;
function showZoneLoadingOverlay(name) {
  if (typeof document === 'undefined') return;
  try {
    if (!_zoneLoadEl) {
      _zoneLoadEl = document.createElement('div');
      _zoneLoadEl.className = 'bt-zone-loading';
      var spin = document.createElement('div');
      spin.className = 'bt-zone-loading-spin';
      var lbl = document.createElement('div');
      lbl.className = 'bt-zone-loading-name';
      _zoneLoadEl.appendChild(spin);
      _zoneLoadEl.appendChild(lbl);
      document.body.appendChild(_zoneLoadEl);
    }
    var nameEl = _zoneLoadEl.querySelector('.bt-zone-loading-name');
    if (nameEl) nameEl.textContent = name || '';
  } catch (e) {}
}
function hideZoneLoadingOverlay() {
  try { if (_zoneLoadEl) { _zoneLoadEl.remove(); _zoneLoadEl = null; } } catch (e) {}
}

/* ═══ v2.3.1748: EVERYTHING ZONE-LOCAL THAT OUTLIVED THE ZONE ═══
 * Owner: "we made a fire in the frost zone level and it appeared in worldview
 * too even when we didn't make one there."
 *
 * The five clear blocks below each wiped npcs / loot / particles / explosions
 * / arrows / slime orbs, and every one of them missed the same class of
 * state: props and in-progress actions that hold ABSOLUTE world coordinates
 * and no zone.  They therefore redrew, and stayed interactive, at the same
 * (x, y) on whatever map you walked onto:
 *
 *   _campfire   — the reported bug.  45s of ghost fire you could still cook on.
 *   _firemaking — an in-flight light; its completion then lit a fire in the
 *                 NEW zone at the old zone's coordinates.
 *   _extraction — an in-progress gather/cook holding a nodeRef to a node that
 *                 no longer exists here (lifeSkillRewards reads nodeRef).
 *   _remoteProjectiles — arrows fired by other players.  S.arrows (yours) was
 *                 already cleared; theirs never was, and visualSystems re-anchors
 *                 each one to the owner's CURRENT position every frame, so a
 *                 shooter who zoned out teleported their arrow across the map.
 *   _whirlFx / _bashPose / _fxBursts — short-lived, but free.
 *
 * Called from every clear block instead of adding six lines to each, so the
 * next zone-change path cannot half-adopt the list. */
export function clearZoneLocalFx(S) {
  if (!S) return;
  S._campfire = null;
  /* v2.3.1753: other players' fires are zone-local for the same reason yours
     is — the relay is room-wide and the payload carries absolute coordinates,
     so a peer's fire would otherwise redraw on the next map exactly as your
     own used to. */
  if (S._peerCampfires && S._peerCampfires.clear) S._peerCampfires.clear();
  S._firemaking = null;
  S._extraction = null;
  S._remoteProjectiles = [];
  S._whirlFx = null;
  S._bashPose = null;
  S._fxBursts = [];
}

export function handleZoneTransitions(S, ptx, pty, _zone, W, H) {
  var P = S.player;
        /* v2.3.1406: STUCK-GATE FAILSAFE.  S._zoneLoading is normally
           consumed by the hub-exit gate below, but that only runs while
           the player is in a hub AND still within the armed exit's
           radius.  If either stops holding mid-load — a server-forced
           zone flip (respawn / dungeon event) empties _hubExits, or
           something displaces the frozen player off the exit — the gate
           object would orphan: movement frozen (BroTown zeroes finalSpd
           on it) under a stuck overlay, forever.  Clear it here, before
           the hub block, whenever we're no longer in a hub or the load
           has aged past 20s (the arm's own 15s cap makes the age check
           pure belt-and-braces).  The bestExit-mismatch case is cleared
           inside the hub block where bestExit is known. */
        if (S._zoneLoading) {
          var _zlStale = S.currentZone !== 'town' && S.currentZone !== 'worldview';
          if (!_zlStale && S._zoneLoading.t && Date.now() - S._zoneLoading.t > 20000) _zlStale = true;
          if (_zlStale) { S._zoneLoading = null; hideZoneLoadingOverlay(); }
        }
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
          /* ═══ v2.3.1708: THE MARKER YOU CAME OUT OF IS DEAF FOR A MOMENT ═══
             Owner: "the portal from worldview back into town doesn't work."

             My fault, and worth writing down properly because I got it wrong
             in both directions first.

             v2.3.1703 made this a DISTANCE latch (8 tiles) and spawned the
             player on the far side of the trail-head, to satisfy "spawn below
             the town portal".  Both halves were wrong together: you land 4
             tiles from the marker, so the latch is still armed, and walking
             straight back into town does nothing until you have wandered 8
             tiles away first.  From the seat, the portal home is simply
             broken — which is exactly what got reported.

             And the spawn cannot stay below it either.  Flame Fields (25,10)
             is almost due north of the town marker (24,28), so ANY arrival
             point south of the marker puts it on the straight line to that
             spoke: that is the v2.3.1700 bug, and no offset dodges it — I
             checked the other three spokes too, and ember is the one that
             cannot be dodged.

             So the spawn goes back INSIDE (north of the marker, toward the
             hub centre), where no spoke route crosses the marker at all, and
             the latch only has to do the one job the owner actually asked
             for: stop the momentum of walking south out of town from carrying
             you straight back in.  That is a moment, not a distance — hence a
             short timer.  Nothing else on the map is behind this marker, so a
             brief deafness costs nothing, and after it the portal home works
             from anywhere including standing right on top of it. */
          var _dis = S._hubExitDisarm;
          if (_dis && (_dis.zone !== S.currentZone || Date.now() > _dis.until)) {
            S._hubExitDisarm = null;
            _dis = null;
          }
          var bestExit = null,
            bestDist = Infinity;
          _hubExits.forEach(function (ex) {
            if (_dis && ex.tx === _dis.tx && ex.ty === _dis.ty) return;
            var d = Math.abs(ptx - ex.tx) + Math.abs(pty - ex.ty);
            if (d <= TOWN_EXIT_R && d < bestDist) {
              bestDist = d;
              bestExit = ex;
            }
          });
          /* v2.3.1406: second half of the stuck-gate failsafe — the armed
             load no longer matches where the player is standing (drifted
             off the exit, or a different exit now wins).  Abandon it; the
             kicked load finishes harmlessly in the background and the maps
             it warmed just make the next approach instant. */
          if (S._zoneLoading && (!bestExit || bestExit.zoneId !== S._zoneLoading.toZone)) {
            S._zoneLoading = null;
            hideZoneLoadingOverlay();
          }
          if (bestExit) {
            /* v2.3.1147: SOFT entry gating -- with zone bands live
               (v2.3.1140) a fresh player can walk from the hub into a
               L55-80 spoke and get two-shot.  First approach to a zone
               whose band floor exceeds player level + 5 bounces them
               back with a red warning; approaching the same exit again
               within 10 s passes (informed consent, not a wall).  The
               +5 threshold mirrors the ±5 valid-threat convention.
               MAP-REDESIGN lists hard gating as a possible follow-up. */
            /* ═══ v2.3.1676: TALK TO THE MAYOR FIRST ═══
               Owner: "not be allowed to leave town without speaking to mayor
               bro first.  He'll give you the sword and shield."
               A HARD gate, unlike the level-band warning below it — that one
               is informed consent (walk in again to pass), this one is not,
               because on the other side of it you are unarmed.  Accepting
               tut_1 is what grants the sword and shield, so "has talked to
               him" and "is equipped to leave" are the same fact; gating on
               the quest record rather than on a separate flag means the two
               can never disagree.
               Any status counts — active, complete, turnedIn — so a returning
               player is never re-gated, and the worldview is gated too (its
               exits run through this same block), or you could hop the wall
               by going up to the map first. */
            var _tutR = S.rpg || {};
            var _spokeToMayor = !!(_tutR._quests && _tutR._quests.tut_1);
            if (!_spokeToMayor) {
              if (!S._mayorGateAt || Date.now() - S._mayorGateAt > 2500) {
                S._mayorGateAt = Date.now();
                if (typeof window !== 'undefined' && typeof window._setLevelUpMsg === 'function') {
                  window._setLevelUpMsg({
                    kind: 'warning',
                    text: 'Speak to Mayor Bro first',
                    sub: "He's outside the Mayor's House — he'll arm you",
                    ts: Date.now(),
                  });
                } else {
                  pushDmgPopup(S, P.x, P.y - 30, 'Speak to Mayor Bro first', '#f5c542', { ttl: 3 });
                }
                try { BT_AUDIO.beep(220, 0.08, 0.08, 'square'); } catch (e) {}
              }
              /* Nudge back toward the hub centre, exactly as the level gate
                 does: without it the proximity test re-fires every frame and
                 the banner never stops. */
              var _mhz = ZONES[S.currentZone];
              if (_mhz) {
                var _mcx = (_mhz.w * TILE) / 2, _mcy = (_mhz.h * TILE) / 2;
                var _mang = Math.atan2(_mcy - P.y, _mcx - P.x);
                P.x += Math.cos(_mang) * TILE * 2;
                P.y += Math.sin(_mang) * TILE * 2;
              }
              return;
            }

            /* ═══ v2.3.1817: A ZONE OPENS WHEN A QUEST SENDS YOU THERE ═══
               Owner: "make each zone open up only after a mayor bro quest
               requires that area."

               HARD, like the Mayor gate directly above and unlike the level
               warning below — walking in again does not pass it, because the
               point is that you have no reason to be there yet.

               The SERVER is what enforces this (_zoneUnlocked in
               server/src/movement.js, gating on the quest table's own
               objective.zone).  This is the courtesy half: without it the
               worker silently refuses the zone change and the portal reads as
               broken, which is precisely how the v2.3.1708 incident above got
               reported.  Client and server derive the rule from the same
               quest ids, so they cannot disagree about which zone is open.

               Any status counts — an accepted quest opens its zone, and a
               finished one leaves it open — matching the server exactly. */
            var _zq = zoneUnlockQuest(bestExit.zoneId);
            if (_zq && !(S.rpg && S.rpg._quests && S.rpg._quests[_zq])) {
              if (!S._zoneLockAt || Date.now() - S._zoneLockAt > 2500) {
                S._zoneLockAt = Date.now();
                var _zlName = (ZONES[bestExit.zoneId] && ZONES[bestExit.zoneId].name) || bestExit.zoneId;
                if (typeof window !== 'undefined' && typeof window._setLevelUpMsg === 'function') {
                  window._setLevelUpMsg({
                    kind: 'warning',
                    text: _zlName + ' is not on your map yet',
                    sub: 'Mayor Bro will send you when it is time',
                    ts: Date.now(),
                  });
                } else {
                  pushDmgPopup(S, P.x, P.y - 30, 'Not yet', '#f5c542', { ttl: 3 });
                }
                try { BT_AUDIO.beep(220, 0.08, 0.08, 'square'); } catch (e) {}
              }
              /* Same nudge as the Mayor gate: without it the proximity test
                 re-fires every frame and the banner never clears. */
              var _zlz = ZONES[S.currentZone];
              if (_zlz) {
                var _zcx = (_zlz.w * TILE) / 2, _zcy = (_zlz.h * TILE) / 2;
                var _zang = Math.atan2(_zcy - P.y, _zcx - P.x);
                P.x += Math.cos(_zang) * TILE * 2;
                P.y += Math.sin(_zang) * TILE * 2;
              }
              return;
            }

            var _gzone = ZONES[bestExit.zoneId];
            var _gfloor = (_gzone && Array.isArray(_gzone.level)) ? _gzone.level[0] : 0;
            var _plvl = (S.rpg && S.rpg.level) || 1;
            /* v2.3.1406: never re-run the warning while the per-zone load
               for THIS exit is armed — the player already passed it to arm
               the gate, and a load outlasting the 10s warning window would
               re-fire it, nudge the frozen player off the exit, and orphan
               the gate (the drift-clear would then abandon their entry). */
            var _zlArmedHere = S._zoneLoading && S._zoneLoading.toZone === bestExit.zoneId;
            if (_gfloor > _plvl + 5 && !_zlArmedHere) {
              if (!S._zoneWarnAt) S._zoneWarnAt = {};
              var _warnedAt = S._zoneWarnAt[bestExit.zoneId] || 0;
              if (Date.now() - _warnedAt > 10000) {
                S._zoneWarnAt[bestExit.zoneId] = Date.now();
                /* v2.3.1160: screen-space banner instead of a world-space
                   damage number — the world-view camera scales dmgNumbers
                   with the terrain, so the warning rendered unreadably
                   tiny there ("tiny font" playtest report).  Unreachable
                   with today's flat [1,2] demo bands (floor is never >
                   level+5), but the gate must stay readable if bands ever
                   rise again.  Fallback keeps the old popup for safety. */
                if (typeof window !== 'undefined' && typeof window._setLevelUpMsg === 'function') {
                  window._setLevelUpMsg({
                    kind: 'warning',
                    text: (_gzone.name || bestExit.zoneId) + ' is Lv ' + _gzone.level[0] + '–' + _gzone.level[1],
                    sub: 'Walk in again to enter',
                    ts: Date.now(),
                  });
                } else {
                  pushDmgPopup(S, P.x, P.y - 30, '⚠️ ' + (_gzone.name || bestExit.zoneId) + ' is Lv ' + _gzone.level[0] + '–' + _gzone.level[1] + '! Walk in again to enter', '#ff5e6c', { ttl: 3 });
                }
                try { BT_AUDIO.beep(220, 0.08, 0.08, 'square'); } catch (e) {}
                /* Nudge back toward the hub center so the proximity
                   trigger disarms; without this the exit re-fires every
                   frame and the popup spams. */
                var _hz = ZONES[S.currentZone];
                var _cx = (_hz.w * TILE) / 2, _cy = (_hz.h * TILE) / 2;
                var _ang = Math.atan2(_cy - P.y, _cx - P.x);
                P.x += Math.cos(_ang) * TILE * 2;
                P.y += Math.sin(_ang) * TILE * 2;
                return;
              }
              /* Second approach within the window: fall through and enter. */
            }
            /* Zone exits — open to all players (quest gate removed) */
            {
              /* v2.3.1405: PER-ZONE ASSET GATE (owner: "per zone loading
                 instead of one long pregame loading screen").  Zone maps +
                 monster variants no longer preload at startup; they load
                 HERE, on entry, behind a brief loading overlay.  This
                 transition is SYNCHRONOUS (called every frame, no await
                 seam), so we mirror the introWaitRef flag+polled-promise
                 pattern: on the first frame at an exit whose map isn't
                 resident, kick preloadZoneAssets, show the overlay, and hold
                 at the hub exit.  BroTown.jsx zeroes move speed while
                 S._zoneLoading is set, and currentZone is NOT flipped — so
                 the server keeps the player in the hub and no zone_state
                 churn / stale-guard drops occur.  When the load resolves,
                 free the PREVIOUS zone's map, drop the overlay, and fall
                 through into the entry body once.  Resident maps (hubs,
                 un-freed revisits) skip the gate entirely and enter
                 instantly, exactly like before this change. */
              var _tz = bestExit.zoneId;
              var _zl = S._zoneLoading;
              if (_zl && _zl.toZone === _tz) {
                if (!_zl.done) return; /* still loading — hold frozen at the exit */
                hideZoneLoadingOverlay();
                S._zoneLoading = null;
                if (_zl.from && _zl.from !== 'town' && _zl.from !== 'worldview') {
                  Promise.resolve(freeZoneMap(_zl.from)).catch(function () {});
                }
                /* fall through: run the entry body once, now that assets are warm */
              } else if (!isZoneMapResident(_tz)) {
                var _zlObj = { toZone: _tz, from: S.currentZone, done: false, t: Date.now() }; /* v2.3.1406: t feeds the 20s failsafe */
                S._zoneLoading = _zlObj;
                var _tzName = (ZONES[_tz] && ZONES[_tz].name) || _tz;
                showZoneLoadingOverlay(_tzName);
                /* race a 15s cap so a hung network fetch can never freeze
                   the player forever — the map self-heals on cache-miss
                   (tileRenderer) if it wasn't ready. */
                Promise.race([
                  Promise.resolve(preloadZoneAssets(_tz)).catch(function () {}),
                  new Promise(function (r) { setTimeout(r, 15000); }),
                ]).then(function () { _zlObj.done = true; });
                return; /* hold this frame; enter once _zlObj.done flips */
              }
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
              /* v2.3.1301: apply a buffered node snapshot that raced the
                 zone flip, or arm the lost-move reclaim (nodeSync.js). */
              onZoneEntered(S, bestExit.zoneId);
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
              /* v2.3.1693: the four bottom-edge spawns keep their 5-tile
                 clearance from the return marker, which itself moved
                 PORTAL_EDGE_INSET tiles up off the bottom edge — so they move
                 up with it (5 -> 8 tiles in). Without this the arrival lands
                 within RETURN_R of the marker and warps straight back. */
              var _botSpawnY = nH - TILE * (5 + PORTAL_EDGE_INSET);
              if (bestExit.dir === 'north')      { P.x = midX;             P.y = _botSpawnY; }
              else if (bestExit.dir === 'south') { P.x = midX - TILE * 5;  P.y = TILE * 8;       }
              else if (bestExit.dir === 'east')  { P.x = TILE * 5;         P.y = midY;           }
              else if (bestExit.dir === 'west')  { P.x = nW - TILE * 5;    P.y = midY;           }
              else if (bestExit.dir === 'ne')    { P.x = TILE * 5;         P.y = _botSpawnY;  }
              else if (bestExit.dir === 'nw')    { P.x = nW - TILE * 5;    P.y = _botSpawnY;  }
              else if (bestExit.dir === 'se')    { P.x = TILE * 5;         P.y = TILE * 8;       }
              else if (bestExit.dir === 'sw')    { P.x = nW - TILE * 5;    P.y = TILE * 8;       }
              else                                { P.x = midX;             P.y = _botSpawnY; }
              /* v2.3.860: entering the World View, spawn by the central town
                 circle (just south of centre), not flung to the ocean edge. */
              /* v2.3.948: hub destinations (worldview AND town) drop the player
                 just south of centre, clear of the OTHER hub's return-trigger.
                 Town's worldview-exit sits at the bottom edge (ty 44); the old
                 dir='north' spawn landed the player at ty 43 -- one tile from that
                 trigger -- so worldview->town instantly bounced back, spamming the
                 enter/exit-town messages. Landing near centre breaks the bounce. */
              /* ═══ v2.3.1700: LAND *INSIDE* THE HUB, NOT OUTSIDE ITS OWN PORTAL ═══
                 v2.3.948 put the hub arrival "just south of centre".  On the
                 World View that is tile (24,31) — three tiles SOUTH of the
                 town trail-head at (24,28), i.e. on the far side of the town
                 portal from every spoke that matters.  TOWN_EXIT_R is 2
                 manhattan TILES, so walking in a straight line from that
                 arrival point to Frost Ridge (13,13), Flame Fields (25,10) or
                 Wind Dunes (39,12) clips the town marker and warps the player
                 straight back to town.  Measured headlessly on the tutorial
                 arc: town -> World View -> walk at Frost Ridge -> town, every
                 time, which reads as "the world map is broken" and strands a
                 new player on the first quest.  (Verdant Wilds, at (7,20),
                 was the one spoke whose line missed it — which is why the arc
                 looked half-working rather than dead.)
                 Fix: emerge on the INSIDE of the trail-head you arrived
                 through — the marker for the zone you just left, offset 4
                 tiles toward the hub centre.  That is not a new rule: it is
                 exactly what the spoke->hub return below already does with
                 S._enteredFromExit, so both directions now agree.  With the
                 town portal BEHIND you, every spoke is a straight walk, and
                 walking back onto it still goes to town.
                 Falls back to the old centre-south spawn when no reciprocal
                 marker exists, so an unexpected hub pairing can never strand
                 anyone at (0,0). */
              /* ═══ v2.3.1708: EMERGE INSIDE THE TRAIL-HEAD ═══
                 Owner asked (v2.3.1703) to "spawn below the town portal
                 instead of above it", because running on after arriving took
                 them straight back into town.  Shipped literally, and it
                 broke the portal home — see the long note on the latch in the
                 proximity scan above.  The complaint was real; "below" just
                 was not the cure, because Flame Fields sits due north of the
                 town marker and every arrival south of it lands on the line
                 to that spoke.
                 So the offset is the v2.3.1700 one again — 4 tiles toward the
                 hub centre, on the inside of the marker you arrived through —
                 and the accidental walk-back-in is handled by the latch
                 instead, which is what the owner was describing rather than a
                 request about geometry.
                 Falls back to the old centre-south spawn when no reciprocal
                 marker exists, so an unexpected hub pairing can never strand
                 anyone at (0,0). */
              if (bestExit.zoneId === 'worldview' || bestExit.zoneId === 'town') {
                P.x = midX; P.y = midY + TILE * 7;
                /* ═══ v2.3.2075: THE WORLD VIEW'S TOWN IS WALLED NOW ═══
                   Owner: "make sure the player doesn't spawn on the line or
                   outside of it."  The rule below -- four tiles from the
                   marker you came through, toward the hub centre -- was
                   written when the World View was open ground, and against a
                   walled ring it puts you 16 px from the inside face of the
                   wall with a half-width of 10.  Arriving from town lands you
                   in the middle of the town instead; the point is checked
                   against the wall mask by the generator that draws it. */
                var _dstExits = bestExit.zoneId === 'town' ? TOWN_EXITS : WORLDVIEW_EXITS;
                var _backMark = null;
                for (var _bi = 0; _bi < _dstExits.length; _bi++) {
                  if (_dstExits[_bi].zoneId === S._enteredFromHub) { _backMark = _dstExits[_bi]; break; }
                }
                if (bestExit.zoneId === 'worldview') {
                  P.x = WORLDVIEW_ARRIVAL.x; P.y = WORLDVIEW_ARRIVAL.y;
                }
                if (_backMark) {
                  var _hcx = newZone.w / 2, _hcy = newZone.h / 2;
                  var _hdx = _hcx - _backMark.tx, _hdy = _hcy - _backMark.ty;
                  var _hlen = Math.max(0.001, Math.sqrt(_hdx * _hdx + _hdy * _hdy));
                  /* The World View keeps the arrival set above -- inside its
                     walls.  Town has no wall and keeps the original rule. */
                  if (bestExit.zoneId !== 'worldview') {
                    P.x = (_backMark.tx + _hdx / _hlen * 4) * TILE;
                    P.y = (_backMark.ty + _hdy / _hlen * 4) * TILE;
                  }
                  /* Deaf for a moment, so the walk that brought you here
                     cannot carry you straight back through. */
                  S._hubExitDisarm = {
                    zone: bestExit.zoneId, tx: _backMark.tx, ty: _backMark.ty,
                    until: Date.now() + HUB_EXIT_DEAF_MS,
                  };
                }
              }
              /* v2.3.1347: snap the chosen spawn onto walkable ground
                 (Desert Winds stuck-spawn fix). Runs BEFORE the monster
                 push-back so monsters clear the FINAL position. */
              nudgeSpawnToWalkable(S, bestExit.zoneId, newZone);
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
              /* v2.3.1693: bottom-edge return row, pulled PORTAL_EDGE_INSET
                 tiles up out from under the dashboard (see the constant). */
              var mapRetY = mapH - 1 - PORTAL_EDGE_INSET;
              if (bestExit.dir === 'north') {
                S.map[mapRetY][mapMX] = 9; S.map[mapRetY][mapMX+1] = 9;
                S.map[2][mapMX] = 10; S.map[2][mapMX+1] = 10;
                carvePath(mapMX, mapRetY, 0, -1, 4);
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
                S.map[mapRetY][1] = 9; S.map[mapRetY][2] = 9;
                S.map[2][mapW-3] = 10; S.map[2][mapW-2] = 10;
                carvePath(2, mapRetY, 0, -1, 4); carvePath(2, mapRetY, 1, 0, 4);
                carvePath(mapW-3, 2, 0, 1, 4); carvePath(mapW-3, 2, -1, 0, 4);
              } else if (bestExit.dir === 'nw') {
                /* SE corner spawn → return SE, dungeon NW. */
                S.map[mapRetY][mapW-3] = 9; S.map[mapRetY][mapW-2] = 9;
                S.map[2][1] = 10; S.map[2][2] = 10;
                carvePath(mapW-3, mapRetY, 0, -1, 4); carvePath(mapW-3, mapRetY, -1, 0, 4);
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
              pushDmgPopup(S, P.x, P.y - 40, newZone.name, newZone.element ? ELEMENTS[newZone.element].color : '#fff');
              S.npcs = null;
              S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
              S.hitParticles = [];
              S.deathExplosions = [];
              S.arrows = [];
              S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */
              clearZoneLocalFx(S); /* v2.3.1748: campfire / in-flight action / peer arrows */
              /* v2.3.1710 (owner: "locking on a monster (tap to target) continues
                 to follow the monster even when you exit the zone").  Same class
                 of leak as the slime orbs above and fixed in the same place: the
                 lock holds a direct REF to a monster object from the zone you
                 just left, so the reticle, the aim assist (playerActions aims at
                 the locked target instead of the stick) and the auto-attack all
                 keep pointing at a monster that is not in this zone — and it
                 never self-clears, because the only teardown is "the target
                 died" (monsterCombat) and a monster you walked away from is
                 still alive.  Cleared on EVERY zone change rather than at one
                 call site: there are five wipe blocks in this file (hub exit,
                 spoke return, dungeon entry/exit) and a lock surviving any one
                 of them is the same bug. */
              S.lockedTarget = null;
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
            var _leftZone = S.currentZone; /* v2.3.1405: free its ~4MB map on exit (below) */
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
            pushDmgPopup(S, P.x, P.y - 40, _retHub === 'worldview' ? 'World View' : 'Town', '#5b52ff');
            S.npcs = null;
            S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
            S.hitParticles = [];
            S.deathExplosions = [];
            S.arrows = [];
            S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */
            clearZoneLocalFx(S); /* v2.3.1748: campfire / in-flight action / peer arrows */
            /* v2.3.1710 (owner: "locking on a monster (tap to target) continues
               to follow the monster even when you exit the zone").  Same class
               of leak as the slime orbs above and fixed in the same place: the
               lock holds a direct REF to a monster object from the zone you
               just left, so the reticle, the aim assist (playerActions aims at
               the locked target instead of the stick) and the auto-attack all
               keep pointing at a monster that is not in this zone — and it
               never self-clears, because the only teardown is "the target
               died" (monsterCombat) and a monster you walked away from is
               still alive.  Cleared on EVERY zone change rather than at one
               call site: there are five wipe blocks in this file (hub exit,
               spoke return, dungeon entry/exit) and a lock surviving any one
               of them is the same bug. */
            S.lockedTarget = null;
            S._zoneWipe = Date.now();
            S._ambientParticles = [];
            /* Snap camera to player — keep them centered, no edge clamp. */
            S.camera.x = P.x - W / 2;
            S.camera.y = P.y - H / 2;
            /* v2.3.1405: the combat zone we just left is no longer on
               screen — free its ~4MB map so steady-state map memory stays
               bounded to the hubs + the current zone (else every visited
               zone's map would accumulate resident).  Hub maps are kept
               (freeZoneMap skips town/worldview).  Safe: tileRenderer
               destroyed the old ground sprite on the hub's rebuild. */
            if (_leftZone && _leftZone !== 'town' && _leftZone !== 'worldview') {
              Promise.resolve(freeZoneMap(_leftZone)).catch(function () {});
            }
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
              pushDmgPopup(S, P.x, P.y - 30, 'Zone fully cleared!', '#3dd497');
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
              onZoneEntered(S, S.currentZone); /* v2.3.1301: node self-heal */
              P.x = zn.w / 2 * TILE;
              P.y = (zn.h - 3) * TILE;
              S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
              S.hitParticles = [];
              S.deathExplosions = [];
              S.arrows = [];
              S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */
              clearZoneLocalFx(S); /* v2.3.1748: campfire / in-flight action / peer arrows */
              /* v2.3.1710 (owner: "locking on a monster (tap to target) continues
                 to follow the monster even when you exit the zone").  Same class
                 of leak as the slime orbs above and fixed in the same place: the
                 lock holds a direct REF to a monster object from the zone you
                 just left, so the reticle, the aim assist (playerActions aims at
                 the locked target instead of the stick) and the auto-attack all
                 keep pointing at a monster that is not in this zone — and it
                 never self-clears, because the only teardown is "the target
                 died" (monsterCombat) and a monster you walked away from is
                 still alive.  Cleared on EVERY zone change rather than at one
                 call site: there are five wipe blocks in this file (hub exit,
                 spoke return, dungeon entry/exit) and a lock surviving any one
                 of them is the same bug. */
              S.lockedTarget = null;
              S._ambientParticles = [];
              S._zoneWipe = Date.now();
              var lvlRange = dc.lvlRange || [1, 10];
              pushDmgPopup(S, P.x, P.y - 40, zn.name + ' - ' + nextDepth.toUpperCase(), ((_ELEMENTS$zn$element = ELEMENTS[zn.element]) === null || _ELEMENTS$zn$element === void 0 ? void 0 : _ELEMENTS$zn$element.color) || '#fff');
              pushDmgPopup(S, P.x, P.y - 25, 'Lv ' + lvlRange[0] + '-' + lvlRange[1], 'rgba(255,255,255,.5)');
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
              S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */
              clearZoneLocalFx(S); /* v2.3.1748: campfire / in-flight action / peer arrows */
              /* v2.3.1710 (owner: "locking on a monster (tap to target) continues
                 to follow the monster even when you exit the zone").  Same class
                 of leak as the slime orbs above and fixed in the same place: the
                 lock holds a direct REF to a monster object from the zone you
                 just left, so the reticle, the aim assist (playerActions aims at
                 the locked target instead of the stick) and the auto-attack all
                 keep pointing at a monster that is not in this zone — and it
                 never self-clears, because the only teardown is "the target
                 died" (monsterCombat) and a monster you walked away from is
                 still alive.  Cleared on EVERY zone change rather than at one
                 call site: there are five wipe blocks in this file (hub exit,
                 spoke return, dungeon entry/exit) and a lock surviving any one
                 of them is the same bug. */
              S.lockedTarget = null;
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
              pushDmgPopup(S, P.x, P.y - 40, 'DUNGEON: Wave 1/' + S._dungeonMaxWaves, '#ff5e6c');
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
            onZoneEntered(S, S.currentZone); /* v2.3.1301: node self-heal */
            S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
            S.hitParticles = [];
            S.deathExplosions = [];
            S.arrows = [];
            S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */
            clearZoneLocalFx(S); /* v2.3.1748: campfire / in-flight action / peer arrows */
            /* v2.3.1710 (owner: "locking on a monster (tap to target) continues
               to follow the monster even when you exit the zone").  Same class
               of leak as the slime orbs above and fixed in the same place: the
               lock holds a direct REF to a monster object from the zone you
               just left, so the reticle, the aim assist (playerActions aims at
               the locked target instead of the stick) and the auto-attack all
               keep pointing at a monster that is not in this zone — and it
               never self-clears, because the only teardown is "the target
               died" (monsterCombat) and a monster you walked away from is
               still alive.  Cleared on EVERY zone change rather than at one
               call site: there are five wipe blocks in this file (hub exit,
               spoke return, dungeon entry/exit) and a lock surviving any one
               of them is the same bug. */
            S.lockedTarget = null;
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
            pushDmgPopup(S, P.x, P.y - 30, 'Exited dungeon', '#3dd497');
            BT_AUDIO.beep(500, 0.05, 0.06, 'sine');
          }
        }
}
