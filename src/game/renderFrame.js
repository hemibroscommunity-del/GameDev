/* ═══ RENDER FRAME — PixiJS render dispatch + sim/render perf split ═══ */
/* v2.3.816: moved verbatim from the end of the game loop in
   src/ui/BroTown.jsx (REBUILD-PLAN Phase 8, slice 8 — the render half of
   the sim/render split; behavior-frozen). Calls pixiRef.current.update()
   (PixiJS-only; the Canvas-2D fallback was retired), self-heals a
   poisoned renderer after 90 consecutive throwing frames, and records the
   per-frame perf breakdown (sim vs render vs browser-interval) via
   perfTracker, with the throttled slow-frame [bt-frame-split] warn.
   `W`/`H` are computed inside from the canvas. Captures via deps:
   pixiRef, canvas, nfts, and the two frame-timing values perfNow /
   perfDelta computed at the top of the loop (passed as _perfNow /
   _perfDelta so the body is untouched). perfTracker is a module import;
   the crashTrap dynamic import path (`../debug/crashTrap.js`) resolves to
   the same src/debug/ target from this module as it did from src/ui/.
   S is stateRef.current. */
import { perfTracker } from '@/debug/perfTracker.js';
import { WORLD_ZOOM } from '@/data/constants.js';
import { checkQuestComplete } from './questComplete.js'; /* v2.3.1675 */

export function renderFrame(S, deps) {
  /* v2.3.1675: quest-completion watcher.  Self-throttled to 2 Hz inside, and
     it never throws — see questComplete.js for why this is a poll rather than
     an event (nothing on the wire marks the moment a bag count crosses a
     quest threshold). */
  try { checkQuestComplete(S); } catch (e) { /* never breaks the frame */ }

  var pixiRef = deps.pixiRef,
    canvas = deps.canvas,
    nfts = deps.nfts,
    _perfNow = deps.perfNow,
    _perfDelta = deps.perfDelta;
        var _simEndT = performance.now();
        if (pixiRef.current) {
          /* v2.3.1090: enlarge the logical viewport by WORLD_ZOOM so the
             world renders zoomed OUT (scale = cssW/viewW = 1/WORLD_ZOOM).
             Must match the camera-centering W/H in BroTown.jsx. */
          var W = (canvas.width / (window.devicePixelRatio || 1)) * WORLD_ZOOM;
          var H = (canvas.height / (window.devicePixelRatio || 1)) * WORLD_ZOOM;
          try {
            pixiRef.current.update(S, W, H, nfts);
            S.__pixiErrStreak = 0;
          } catch (pixiErr) {
            if (!window.__pixiUpdateErrLogged) {
              window.__pixiUpdateErrLogged = true;
              console.error('[pixi-render] update threw', pixiErr && pixiErr.message, pixiErr && pixiErr.stack);
              /* v2.3.773: a persistent update() throw was INVISIBLE on
                 iPhone -- UI stays alive, world stays black, and nothing
                 reaches the window error handler because this catch eats
                 it.  Put it in the crash log where the dev banner shows it. */
              try {
                var _pmsg = ((pixiErr && pixiErr.message) || String(pixiErr)) + ' | ' + (((pixiErr && pixiErr.stack) || '').split('\n')[1] || '').trim();
                import('../debug/crashTrap.js').then(function (ct) {
                  ct.recordCrash('pixi-update-err', _pmsg);
                }).catch(function () {});
              } catch (e2) {}
            }
            /* v2.3.773: self-heal a poisoned renderer.  90 consecutive
               throwing frames (~1.5s of black world) -> one rebuild
               attempt (=== so it can't loop; if the fresh renderer still
               throws, the streak keeps climbing past 90 and we keep the
               recorded error as evidence instead of thrashing). */
            S.__pixiErrStreak = (S.__pixiErrStreak || 0) + 1;
            if (S.__pixiErrStreak === 90 && window._rebuildRenderer) {
              window._rebuildRenderer('update() threw 90 consecutive frames');
            }
          }
        }
        var _renderEndT = performance.now();
        var _workMs = _renderEndT - _perfNow;
        /* totalMs is the INTERVAL between consecutive RAF callbacks
           (= S._perf.prevT delta computed earlier in this frame =
           _perfDelta).  THAT is what the user perceives as a freeze —
           it includes browser composite, GC, style recalc, and any
           work the browser does BETWEEN our RAFs.  workMs is what our
           callback alone spent.  When totalMs >> workMs, the freeze is
           browser-side, not our code. */
        var _intervalMs = (S._perf && _perfDelta) || _workMs;
        var _stages = (pixiRef.current && pixiRef.current.update && pixiRef.current.update._lastStages) || null;
        perfTracker.record({
          t: _renderEndT,
          totalMs: _intervalMs,
          workMs: _workMs,
          simMs: _simEndT - _perfNow,
          renderMs: _renderEndT - _simEndT,
          tileMs: _stages ? _stages.tileMs : 0,
          entityMs: _stages ? _stages.entityMs : 0,
          effectsMs: _stages ? _stages.effectsMs : 0,
          fpsMs: _stages ? _stages.fpsMs : 0,
          appMs: _stages ? _stages.appMs : 0,
          zone: S.currentZone,
          monsters: (S.monsters && S.monsters.length) || 0,
          others: (S.others && S.others.length) || 0,
          projectiles: (S.projectiles && S.projectiles.length) || 0,
          hitParticles: (S.hitParticles && S.hitParticles.length) || 0,
          slimeProj: (S.slimeProjectiles && S.slimeProjectiles.length) || 0,
          dmgNumbers: (S.dmgNumbers && S.dmgNumbers.length) || 0,
          groundLoot: (S.groundLoot && S.groundLoot.length) || 0,
          groundSplatter: (S.groundSplatter && S.groundSplatter.length) || 0,
          campfires: (S.campfires && S.campfires.length) || 0,
        });
        if (!S._splitLog) S._splitLog = { lastT: 0, worstTotal: 0, worstSim: 0, worstRender: 0 };
        if (_workMs > 30 && _workMs > S._splitLog.worstTotal) {
          S._splitLog.worstTotal = _workMs;
          S._splitLog.worstSim = _simEndT - _perfNow;
          S._splitLog.worstRender = _renderEndT - _simEndT;
        }
        if (_renderEndT - S._splitLog.lastT > 500 && S._splitLog.worstTotal > 30) {
           
          console.warn('[bt-frame-split]', {
            totalMs: +S._splitLog.worstTotal.toFixed(1),
            simMs: +S._splitLog.worstSim.toFixed(1),
            renderMs: +S._splitLog.worstRender.toFixed(1),
            monsters: (S.monsters && S.monsters.length) || 0,
            hitParticles: (S.hitParticles && S.hitParticles.length) || 0,
            slimeProj: (S.slimeProjectiles && S.slimeProjectiles.length) || 0,
            zone: S.currentZone,
          });
           
          S._splitLog.lastT = _renderEndT;
          S._splitLog.worstTotal = 0;
          S._splitLog.worstSim = 0;
          S._splitLog.worstRender = 0;
        }
}
