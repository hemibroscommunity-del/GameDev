/* ═══ VISUAL SYSTEM UPDATES — pre-render simulation ═══ */
/* v2.3.814: moved verbatim from the game loop in src/ui/BroTown.jsx
   (REBUILD-PLAN Phase 8, slice 6; behavior-frozen). The "pre-render
   simulation" block the original banner describes — game logic pulled
   out of the render section so rendering stays "read state, draw pixels":
   screen-shake decay, player facing (discrete dir + continuous angle),
   footstep timer/stats, other-player interpolation, and remote-projectile
   simulation. Only capture is BT_AUDIO (footsteps); S is stateRef.current
   and the block reads S.player directly. */
import { BT_AUDIO } from '@/data/index.js';
import { zoneLeavesPrints } from '@/rendering/footprintSprites.js'; /* v2.3.2654 */
import { sweepBlockPoint, boxFace } from '@/data/worldProps.js';   /* v2.3.2730: a peer's shot stops at a prop on your screen too */
import { spawnPropDebris, propImpactSound, orbCrashFx, markProp, queueArrowSnap } from '@/game/combatHelpers.js';   /* v2.3.2730; v2.3.2731 the snap */
import { arrowSnaps } from '@/data/arrowSnap.js';   /* v2.3.2731 */
import { BOW_VOLLEY, LONE_BURN_MS } from '@/game/bowVolley.js';   /* v2.3.2849: how long a peer's special stands burning */
/* v2.3.2730: how far up a prop's face a PEER's shot marks it -- see the remote
   projectile sweep below. */
var REMOTE_SHOT_H = 26;

/* World px between footprint PAIRS, and the live cap.  PRINT_TTL_MS lives in
   the renderer with the fade it drives; stateCleanup filters on the same
   number and the two are asserted in lockstep there. */
var PRINT_GAP = 46;
var PRINT_MAX = 40;

export function updateVisualSystems(S) {
        /* ── Screen shake decay ── */
        /* v2.3.2200: dt-scaled (the v2.3.1771 pow() pattern used for
           facing just below).  `*= 0.85` per FRAME decayed shake twice
           as fast on a 120Hz iPhone as on a 60Hz screen — the primary
           platform was getting HALF the impact feel of desktop. */
        if (S.screenShake > 0.1) {
          S.screenShake *= Math.pow(0.85, S._dtScale || 1);
        } else {
          S.screenShake = 0;
        }

        /* ── Player facing direction (discrete + continuous angle) ── */
        var _fDx = S.player.vx || 0, _fDy = S.player.vy || 0;
        var _fAbsDx = Math.abs(_fDx), _fAbsDy = Math.abs(_fDy);
        var _fIsMoving = _fAbsDx > 0.01 || _fAbsDy > 0.01;
        if (_fAbsDx > 0.03 || _fAbsDy > 0.03) {
          var _vertBias = (S._facing === 'up' || S._facing === 'down') ? 0.7 : 1.3;
          var _wasUpDown = S._facing === 'up' || S._facing === 'down';
          if (_fAbsDy > _fAbsDx * _vertBias) S._facing = _fDy > 0 ? 'down' : 'up';
          else if (_fAbsDx > _fAbsDy * (_wasUpDown ? 0.7 : 1.3)) S._facing = _fDx > 0 ? 'right' : 'left';
        }
        if (_fAbsDx > 0.02 || _fAbsDy > 0.02) {
          S._targetFacingAngle = Math.atan2(_fDy, _fDx);
        }
        if (S._facingAngle === undefined) S._facingAngle = Math.PI / 2;
        if (S._targetFacingAngle !== undefined) {
          var _fDiff = S._targetFacingAngle - S._facingAngle;
          while (_fDiff > Math.PI) _fDiff -= Math.PI * 2;
          while (_fDiff < -Math.PI) _fDiff += Math.PI * 2;
          /* v2.3.1771: the player's facing angle is what melee and aim swing
             FROM, so a turn rate of "18% of the remaining angle per frame"
             literally meant a desktop turned toward a target 2.4x faster than
             a phone.  pow() gives both the same turn per second. */
          S._facingAngle += _fDiff * (1 - Math.pow(_fIsMoving ? 0.82 : 0.92, S._dtScale || 1));
          while (S._facingAngle > Math.PI) S._facingAngle -= Math.PI * 2;
          while (S._facingAngle < -Math.PI) S._facingAngle += Math.PI * 2;
        }

        /* ── Footstep timer + stats ──
           v2.3.1771: was one tick per FRAME with a `% 6 === 0` test, so the
           lifetime step counter — a stat, and what achievements read — ran
           2.4x faster on a 144Hz monitor than on a phone walking the same
           distance.  Counting in 60Hz-frame units and draining the
           accumulator keeps one step per 100ms on every screen; the `%`
           test could not survive a fractional increment. */
        if (_fIsMoving) {
          if (!S._footstepTimer) S._footstepTimer = 0;
          S._footstepTimer += (S._dtScale || 1);
          /* v2.3.839: footstep AUDIO moved into the renderer (entityRenderer
             _updatePlayer jog branch) so it's locked to the animation cycle
             and matches the visible stride exactly.  This timer now only
             drives the step COUNTER for stats/achievements. */
          while (S._footstepTimer >= 6) {
            S._footstepTimer -= 6;
            if (S.stats) S.stats.steps++;
          }
        }

        /* ═══ v2.3.2654: PRINTS IN THE SNOW ═══
           The visible half of a footstep, in the zones that have the art.

           BY DISTANCE, NOT BY THE STEP TIMER ABOVE.  That timer is a fixed
           6 dt-units -- ~10 a second whatever your speed -- so pinning prints
           to it would space them by SPEED: a smear when you dawdle and a
           dotted line when you sprint, which is backwards.  Distance gives one
           pair every PRINT_GAP px however fast you cross it, which is what a
           trail is.

           The gap is a little wider than the art (95px of frame drawn at ~40
           world px) so consecutive pairs read as separate prints rather than a
           continuous furrow.

           Spawned from the LAST position, not the current one: the print
           belongs where the foot was when it came down. */
        if (_fIsMoving && zoneLeavesPrints(S.currentZone)) {
          var _pLast = S._printLast;
          if (!_pLast) { S._printLast = { x: S.player.x, y: S.player.y }; }
          else {
            var _pdx = S.player.x - _pLast.x, _pdy = S.player.y - _pLast.y;
            if (_pdx * _pdx + _pdy * _pdy >= PRINT_GAP * PRINT_GAP) {
              if (!S.footprints) S.footprints = [];
              S.footprints.push({
                x: _pLast.x, y: _pLast.y,
                /* Rotated to the direction of travel so the toes point the way
                   you went.  A pair of prints that always faces south would be
                   wallpaper, not a trail. */
                ang: Math.atan2(_pdy, _pdx),
                ts: Date.now(),
              });
              /* Hard cap, like every other decal pool here: the renderer's
                 sprite pool is sized off this array, so an uncapped walk would
                 grow the scene graph for the life of the session. */
              if (S.footprints.length > PRINT_MAX) {
                S.footprints.splice(0, S.footprints.length - PRINT_MAX);
              }
              S._printLast = { x: S.player.x, y: S.player.y };
            }
          }
        } else if (!_fIsMoving) {
          /* Standing still resets the anchor, so the first step after a pause
             is a fresh gap rather than a print dropped the instant you move. */
          S._printLast = null;
        }

        /* ── Other player interpolation ── */
        /* v2.3.1771: EVERY TERM IN THIS BLOCK WAS PER FRAME.  A remote's _vx
           arrives as px per 60Hz frame, so dead-reckoning it once per frame
           made another player sprint across a 144Hz monitor and then snap
           back when the next real position landed — rubber-banding produced
           by the viewer's refresh rate, not by their connection.  The three
           gap lerps are exponential approaches and get the same pow() shape
           as the camera and the monster interpolator. */
        var _oDt = S._dtScale || 1;
        var _oVK = 1 - Math.pow(0.85, _oDt);   /* was 0.15 per frame */
        var _oNearK = 1 - Math.pow(0.97, _oDt); /* was 0.03 per frame */
        var _oIdleK = 1 - Math.pow(0.85, _oDt); /* was 0.15 per frame */
        Object.values(S.others).forEach(function (o) {
          if (o.renderX === undefined) { o.renderX = o.x; o.renderY = o.y; }
          var rawVx = o._vx || 0, rawVy = o._vy || 0;
          if (o._smoothVx === undefined) { o._smoothVx = rawVx; o._smoothVy = rawVy; }
          o._smoothVx += (rawVx - o._smoothVx) * _oVK;
          o._smoothVy += (rawVy - o._smoothVy) * _oVK;
          /* v2.3.840: snap a stopped remote's decaying velocity to 0 so it
             doesn't hover near the move/idle threshold and flicker the pose. */
          if (rawVx === 0 && Math.abs(o._smoothVx) < 0.01) o._smoothVx = 0;
          if (rawVy === 0 && Math.abs(o._smoothVy) < 0.01) o._smoothVy = 0;
          var oDx = o.x - o.renderX, oDy = o.y - o.renderY;
          var oDist = Math.sqrt(oDx * oDx + oDy * oDy);
          if (oDist > 100) {
            o.renderX = o.x; o.renderY = o.y;
          } else {
            var oMoving = Math.abs(o._smoothVx) > 0.005 || Math.abs(o._smoothVy) > 0.005;
            if (oMoving) {
              o.renderX += o._smoothVx * _oDt; o.renderY += o._smoothVy * _oDt;
              if (oDist > 30) { o.renderX += oDx * _oNearK; o.renderY += oDy * _oNearK; }
            } else {
              if (oDist > 0.5) { o.renderX += oDx * _oIdleK; o.renderY += oDy * _oIdleK; }
              else { o.renderX = o.x; o.renderY = o.y; }
            }
          }
          /* Facing angle interpolation */
          var oAdx = Math.abs(oDx), oAdy = Math.abs(oDy);
          if (oAdx > 0.02 || oAdy > 0.02) o._targetAngle = Math.atan2(oDy, oDx);
          if (o._fAngle === undefined) o._fAngle = Math.PI / 2;
          if (o._targetAngle !== undefined) {
            var aDiff = o._targetAngle - o._fAngle;
            while (aDiff > Math.PI) aDiff -= Math.PI * 2;
            while (aDiff < -Math.PI) aDiff += Math.PI * 2;
            var oIsMoving = Math.abs(o._smoothVx) > 0.005 || Math.abs(o._smoothVy) > 0.005;
            o._fAngle += aDiff * (1 - Math.pow(oIsMoving ? 0.82 : 0.92, _oDt)); /* v2.3.1771: turn rate per second */
            while (o._fAngle > Math.PI) o._fAngle -= Math.PI * 2;
            while (o._fAngle < -Math.PI) o._fAngle += Math.PI * 2;
          }
          /* Discrete facing.  Gated on the delta AGREEING with the smoothed
             velocity: when a remote player stops, renderX/Y keep advancing on
             the decaying _smoothVx/Vy and sail PAST the frozen server
             position -- the convergence delta then points BACKWARDS for a
             dozen frames, which used to rewrite _moveFacing8 to the opposite
             direction the moment they stopped (and freeze it there, since no
             further deltas arrive).  Real movement keeps delta and velocity
             roughly aligned; a fresh start from idle has _smoothV ~ 0, so
             the dot is ~0 and still passes. */
          if ((oAdx > 0.03 || oAdy > 0.03) && (oDx * o._smoothVx + oDy * o._smoothVy >= 0)) {
            if (oAdy > oAdx) o._facing = oDy > 0 ? 'down' : 'up';
            else o._facing = oDx > 0 ? 'right' : 'left';
            /* v2.3.398: 8-way facing from POSITION delta (which is correct --
               remote players appear in the right spots).  The renderer uses
               this instead of broadcast velocity, whose vy sign didn't survive
               the server relay and produced the front/back facing mirror. */
            var _o8 = Math.round(Math.atan2(oDy, oDx) / (Math.PI / 4));
            o._moveFacing8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'][((_o8 % 8) + 8) % 8];
          }
        });

        /* ── Remote projectile simulation ── */
        if (S._remoteProjectiles && S._remoteProjectiles.length > 0) {
          S._remoteProjectiles = S._remoteProjectiles.filter(function(rp) {
            /* v2.3.2259: a staggered volley orb waits at its owner's hand.
               Neither distance NOR life advances while it waits -- the same
               rule the local orbs follow (projectiles.js), so what a peer
               sees covers the same ground as what the caster sees. */
            /* v2.3.2848: ...or, for a bow volley's arrow, a count of frames (gameEvents.js) */
            /* ═══ v2.3.2919: AND THE SAME FRAME-RATE TERM AS YOURS ═══
               Owner: "check all other broadcasted player animations to make
               sure they match what your character does client side."
               Your own shot flies and spends its life per 60 Hz TICK -- step x
               _dtScale, life - _dtScale (projectiles.js) -- so it covers the
               same ground in the same time at any frame rate.  A peer's copy
               stepped once per FRAME: on a 30 fps screen (a phone in Low
               Power Mode, typically) every other player's arrow flew at half speed and
               hung in the air twice as long as it did on theirs, and its fade
               came late.  Same term now, clamp included.  The volley's wait
               below is counted in the same scaled frames it flies in, so the
               80 px train v2.3.2848 measured still holds at any rate. */
            var _rpDt = S._dtScale || 1;
            var _rpWait = false;
            if (rp.holdFrames > 0) { rp.holdFrames -= _rpDt; _rpWait = true; }
            else if (rp.holdUntil && Date.now() < rp.holdUntil) _rpWait = true;
            if (_rpWait) {
              var _hOwner = S.others[rp.ownerId];
              var _hX = _hOwner ? (_hOwner.renderX || _hOwner.x) : rp.x;
              var _hY = _hOwner ? (_hOwner.renderY || _hOwner.y) : rp.y;
              rp._renderX = _hX + Math.cos(rp.ang) * rp.dist;
              rp._renderY = _hY + Math.sin(rp.ang) * rp.dist;
              rp._held = true;   /* v2.3.2848: a bow-volley arrow is not drawn until it is loosed (effectsRenderer) */
              return true;
            }
            rp._held = false;
            /* v2.3.2848: MIRROR-PINNED -- the 8 below is bowVolley.js
               PEER_PX_PER_FRAME; the bow volley staggers a peer's copies by it */
            var _rpStep = (rp.speedPx != null ? rp.speedPx : (rp.isStaff ? 5 : 8)) * _rpDt;   /* v2.3.2919: x the frame-rate term */
            rp.dist += _rpStep;
            rp.life -= _rpDt;
            if (rp.life <= 0) return false;
            var owner = S.others[rp.ownerId];
            var originX = owner ? (owner.renderX || owner.x) : rp.x;
            var originY = owner ? (owner.renderY || owner.y) : rp.y;
            /* v2.3.2730: where it was last frame, for the prop sweep below.  The
               first step has no last frame, so it starts one step back along the
               same line -- the shape v2.3.2473 gave the local first frame. */
            var _rpX0 = (typeof rp._renderX === 'number') ? rp._renderX : originX + Math.cos(rp.ang) * (rp.dist - _rpStep);
            var _rpY0 = (typeof rp._renderY === 'number') ? rp._renderY : originY + Math.sin(rp.ang) * (rp.dist - _rpStep);
            rp._renderX = originX + Math.cos(rp.ang) * rp.dist;
            rp._renderY = originY + Math.sin(rp.ang) * rp.dist;
            /* ═══ v2.3.2730: A PEER'S SHOT MEETS THE PROP ON YOUR SCREEN TOO ═══
               This simulation is cosmetic -- the worker settles a peer's hits
               and this copy touches no monster -- and it never asked about
               props, so another player's arrow sailed through the ridge on your
               screen while it stuck in it on theirs.  Same sweep as the local
               arrow, and the same impact: the bolt crashes, the arrow stands in
               the rock (a mark, since there is no planted object here to hold
               it), and the prop throws its chips.  A remote projectile is drawn
               from its owner's FEET, so its drawn point is a ground point and
               needs no conversion. */
            var _rpHit = sweepBlockPoint(S.currentZone, _rpX0, _rpY0, rp._renderX, rp._renderY);
            if (_rpHit) {
              var _rpId = _rpHit.box ? _rpHit.box.id : null;
              if (_rpId) {
                /* ...and the mark goes up the face to where YOUR arrows stick.
                   A peer's shot is drawn at its owner's feet (above), so taken
                   literally it would stand in the dirt at the foot of the rock,
                   which reads as a miss that planted.  Yours hit at the bow
                   grip, ~30px up; this is that height, give or take a hand. */
                var _rpY = _rpHit.y - REMOTE_SHOT_H;
                spawnPropDebris(S, { id: _rpId, x: _rpHit.x, y: _rpY, gy: _rpHit.y,
                  ang: rp.ang + Math.PI, weapon: rp.isStaff ? 'bolt' : 'arrow' });
                propImpactSound(_rpId, 0.22);   /* someone else's shot: quieter than your own */
                if (rp.isStaff) {
                  orbCrashFx(S, _rpHit.x, _rpY, rp.isSpecial ? '#f5c542' : '#a78bfa');
                } else if (!rp.isSpecial && arrowSnaps(rp.ownerId, rp.shotTs)) {
                  /* v2.3.2731: the same one-in-eight snap the shooter rolled --
                     same id, same shot timestamp, same answer (arrowSnap.js) */
                  queueArrowSnap(S, _rpHit.x, _rpY, _rpHit.y, rp.ang, 0.18);
                } else {
                  markProp(S, { kind: 'arrow', id: _rpId, x: _rpHit.x, y: _rpY, gy: _rpHit.y,
                    face: boxFace(_rpHit.box, _rpHit.x, _rpHit.y), ang: rp.ang,
                    ttl: rp.isSpecial ? (rp.volley ? BOW_VOLLEY.BURN_MS : LONE_BURN_MS) : 2000, special: !!rp.isSpecial });   /* v2.3.2849: a volley's 2.5 s */
                }
              }
              return false;
            }
            return true;
          });
        }
}
