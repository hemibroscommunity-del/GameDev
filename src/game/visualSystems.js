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
            if (rp.holdUntil && Date.now() < rp.holdUntil) {
              var _hOwner = S.others[rp.ownerId];
              var _hX = _hOwner ? (_hOwner.renderX || _hOwner.x) : rp.x;
              var _hY = _hOwner ? (_hOwner.renderY || _hOwner.y) : rp.y;
              rp._renderX = _hX + Math.cos(rp.ang) * rp.dist;
              rp._renderY = _hY + Math.sin(rp.ang) * rp.dist;
              return true;
            }
            rp.dist += rp.isStaff ? 5 : 8;
            rp.life--;
            if (rp.life <= 0) return false;
            var owner = S.others[rp.ownerId];
            var originX = owner ? (owner.renderX || owner.x) : rp.x;
            var originY = owner ? (owner.renderY || owner.y) : rp.y;
            rp._renderX = originX + Math.cos(rp.ang) * rp.dist;
            rp._renderY = originY + Math.sin(rp.ang) * rp.dist;
            return true;
          });
        }
}
