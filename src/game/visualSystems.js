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
import { zoneLeavesPrints, printsAt } from '@/rendering/footprintSprites.js'; /* v2.3.2654; v2.3.3000: + where the ground takes them */
import { playerGroundDy } from '@/rendering/systems/entityRenderer.js';   /* v2.3.3000: prints are where the boots are */
import { jumpActive } from '@/game/jump.js';   /* v2.3.3017: no prints in the air */
import { sweepBlockPoint, boxFace } from '@/data/worldProps.js';   /* v2.3.2730: a peer's shot stops at a prop on your screen too */
import { spawnPropDebris, propImpactSound, orbCrashFx, markProp, queueArrowSnap, STUCK_ARROW_MS, SCORCH_MS, scorchStyle, propHitHeight } from '@/game/combatHelpers.js';   /* v2.3.2730; v2.3.2731 the snap; v2.3.2995 what stays in the Wheel's objects; v2.3.3206 how high a hit shows */
import { strikeWheelObject } from '@/game/wheelBreak.js';   /* v2.3.2995: a peer's shot hits the Wheel's objects on your screen too */
import { earVol } from '@/game/hitSounds.js';   /* v2.3.3343: a peer's shot on a prop, heard by distance */
import { arrowSnaps } from '@/data/arrowSnap.js';   /* v2.3.2731 */
import { shotSkip } from '@/game/projectiles.js';   /* v2.3.3206: a peer's shot flies over low things as yours does */
import { BOW_VOLLEY, LONE_BURN_MS } from '@/game/bowVolley.js';   /* v2.3.2849: how long a peer's special stands burning */
import { parkAway } from '@/game/presence2.js';   /* v2.3.3250: a far player's copy stays out of sight */
import { PEER_SHOT, peerShotTargetAt, stepReaches } from '@/game/peerShots.js';   /* v2.3.3266: a peer's shot as it flies on their screen */
/* (v2.3.2730's REMOTE_SHOT_H, how far up a prop's face a peer's shot marked
   it, went in v2.3.3206: the shot is now judged at its owner's boots and shown
   where it flew -- see the remote projectile sweep below.) */

/* World px between footprint PAIRS, and the live cap.  PRINT_TTL_MS lives in
   the renderer with the fade it drives; stateCleanup filters on the same
   number and the two are asserted in lockstep there. */
var PRINT_GAP = 46;
var PRINT_MAX = 40;
/* v2.3.2918: other players' prints get a pool of their own, so a crowd walking
   past cannot shorten YOUR trail by pushing it out of the shared cap. */
var PEER_PRINT_MAX = 60;

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
        /* v2.3.3000: in the Wheel only on its snow (printsAt): off it the
           anchor is let go, so the first print back on the snow is not dropped
           where you left it */
        /* v2.3.3017: in the air no print, and the trail starts again where you
           land rather than joining the take-off to the landing */
        var _fAir = !!S._jump && jumpActive(S._jump, Date.now());
        var _pOn = _fIsMoving && !_fAir && zoneLeavesPrints(S.currentZone)
          && printsAt(S.currentZone, S.player.x, S.player.y + playerGroundDy(S.currentZone, S.player.x, S.player.y));
        if ((_fIsMoving && zoneLeavesPrints(S.currentZone) && !_pOn) || _fAir) S._printLast = null;
        if (_pOn) {
          var _pLast = S._printLast;
          if (!_pLast) { S._printLast = { x: S.player.x, y: S.player.y }; }
          else {
            var _pdx = S.player.x - _pLast.x, _pdy = S.player.y - _pLast.y;
            if (_pdx * _pdx + _pdy * _pdy >= PRINT_GAP * PRINT_GAP) {
              if (!S.footprints) S.footprints = [];
              S.footprints.push({
                x: _pLast.x, y: _pLast.y,
                /* v2.3.3000: where the BOOTS were -- x/y is the body's centre
                   (and what mp-peerprints compares); the print is drawn this
                   far below it (effectsRenderer _updateFootprints) */
                fdy: playerGroundDy(S.currentZone, _pLast.x, _pLast.y),
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
        /* ═══ v2.3.2918: AND EVERYONE ELSE'S ═══
           Owner: "check all other broadcasted player animations to make sure
           they match what your character does client side."
           Your walk leaves prints in the snow; every other player's walked on
           it without leaving a mark, on your screen -- while on their own screen
           it left the same trail yours does.  Same rule for a peer: a pair
           every PRINT_GAP px of where they ARE (the position their last packet
           reported, which their drawn figure follows a frame or two behind),
           only while they WALK -- the same vx/vy test yours reads above.
           Position and walking both come off the same packets, so the two can
           never disagree about when a stretch was walked.
           No separate roll rule, because yours has none: a roll with a
           direction held still walks (the stick is not locked out mid-roll) and
           lays prints, and one with nothing held lays none.  But mid-roll their
           packets carry the ROLL's velocity, not the walk's, so for the length
           of their roll the answer comes from the roll itself (dodge.js
           walkingNow, sent with it); an older client that doesn't say falls
           back to the velocity.
           The anchors live in a Map owned here (peer ids are client-supplied:
           rule 4), not on the peer object, which relays merge into verbatim. */
        if (zoneLeavesPrints(S.currentZone) && S.others) {
          if (!S._peerPrintLast) S._peerPrintLast = new Map();
          for (var _qid in S.others) {
            var _qo = S.others[_qid];
            var _qx = _qo ? _qo.x : NaN, _qy = _qo ? _qo.y : NaN;
            var _qRoll = _qo && _qo._dodgeRoll;
            var _qStep = (_qRoll && typeof _qRoll.walk === 'boolean') ? _qRoll.walk
              : !!_qo && (Math.abs(_qo._vx || 0) > 0.01 || Math.abs(_qo._vy || 0) > 0.01);
            var _qWalk = !!_qo && !_qo._isDead && _qStep
              && !(_qo._jump && jumpActive(_qo._jump, Date.now()))   /* v2.3.3017: none in the air */
              && (_qo.zone || _qo.z || 'town') === S.currentZone
              && isFinite(_qx) && isFinite(_qy)
              /* v2.3.3000: on the ground that takes prints (the Wheel's snow) */
              && printsAt(S.currentZone, _qx, _qy + playerGroundDy(S.currentZone, _qx, _qy));
            if (!_qWalk) { S._peerPrintLast.delete(_qid); continue; }
            var _qLast = S._peerPrintLast.get(_qid);
            if (!_qLast) { S._peerPrintLast.set(_qid, { x: _qx, y: _qy }); continue; }
            var _qdx = _qx - _qLast.x, _qdy = _qy - _qLast.y;
            if (_qdx * _qdx + _qdy * _qdy >= PRINT_GAP * PRINT_GAP) {
              if (!S.peerFootprints) S.peerFootprints = [];
              S.peerFootprints.push({ x: _qLast.x, y: _qLast.y, fdy: playerGroundDy(S.currentZone, _qLast.x, _qLast.y), ang: Math.atan2(_qdy, _qdx), ts: Date.now() });
              if (S.peerFootprints.length > PEER_PRINT_MAX) {
                S.peerFootprints.splice(0, S.peerFootprints.length - PEER_PRINT_MAX);
              }
              S._peerPrintLast.set(_qid, { x: _qx, y: _qy });
            }
          }
          /* A peer who left mid-stride is no longer in S.others to be deleted
             above: drop their anchor too, or the Map outlives them. */
          S._peerPrintLast.forEach(function (_v, _id) { if (!S.others[_id]) S._peerPrintLast.delete(_id); });
        } else if (S._peerPrintLast && S._peerPrintLast.size) {
          /* Out of the snow: nothing is laid, so no anchor may carry over to
             drop a print back where someone stood before you left. */
          S._peerPrintLast.clear();
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
          /* v2.3.3250: a PARKED copy (presence v2, src/game/presence2.js: the
             worker said this player is not near you) is kept at least PARK_R
             from you wherever you walk -- off the screen and the minimap, out
             of every reach, light and sound -- so their last copy is never a
             ghost standing where they were last seen */
          if (o._away) parkAway(S, o);
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
            /* v2.3.3266: an arrow's speedPx is always set now (gameEvents.js,
               peerShots.js: the shooter's own speed, read off its life), so the
               8 is only what a hand-made copy with none would fly at */
            var _rpStep = (rp.speedPx != null ? rp.speedPx : (rp.isStaff ? 5 : 8)) * _rpDt;   /* v2.3.2919: x the frame-rate term */
            rp.dist += _rpStep;
            rp.life -= _rpDt;
            if (rp.life <= 0) return peerShotEnd(rp, 'life');
            /* ═══ v2.3.3266: AN ARROW ENDS WHERE THE SHOOTER'S CAME DOWN ═══
               at its reach (peerShots.js) -- the shooter's own plants in the
               ground there.  Its life used to end it, at 8 px a frame, 720 px
               out; at the real speed that life would carry it 2,160.  Drawn
               solid to the end, as the shooter's own is (effectsRenderer's
               life/20 fade, which a 90-frame life never reaches in the 28
               frames an arrow flies: mp-projlook holds the copy to the
               shooter's rule). */
            if (rp.reach != null && rp.dist >= rp.reach) return peerShotEnd(rp, 'reach');
            var owner = S.others[rp.ownerId];
            var originX, originY;
            /* ═══ v2.3.3266: A LOOSED ARROW KEEPS ITS LINE HERE TOO ═══
               The shooter's own arrow keeps the line it was shot on, origin and
               angle stamped as it leaves (projectiles.js, v2.3.2258); its copy
               here was drawn from where the shooter IS each frame, so it slid
               sideways as they walked on.  Stamped as it leaves now; a volley's
               later arrows take the first one's line (gameEvents.js `_sib`), as
               the shooter's do.  An arrow at a player the shooter had locked
               (`tg`) leaves aimed at them as THIS screen draws them -- the
               shooter's left aimed at the lock -- so what happens to it here is
               what happened there: they are still in its way, or they have
               stepped out of it.  A bolt still sweeps round its caster (below),
               as it does on the caster's screen (v2.3.2261). */
            if (!rp.isStaff) {
              if (rp._x0 == null) {
                var _sib = rp._sib;
                if (_sib && _sib._x0 != null) {
                  rp._x0 = _sib._x0; rp._y0 = _sib._y0; rp.ang = _sib.ang;
                } else {
                  rp._x0 = owner ? (owner.renderX || owner.x) : rp.x;
                  rp._y0 = owner ? (owner.renderY || owner.y) : rp.y;
                  var _tgAim = rp.tg ? peerShotTargetAt(S, rp.tg) : null;
                  if (_tgAim && (_tgAim.x !== rp._x0 || _tgAim.y !== rp._y0)) rp.ang = Math.atan2(_tgAim.y - rp._y0, _tgAim.x - rp._x0);
                }
                rp._sib = null;   /* its line is its own now; let the first one go */
              }
              originX = rp._x0;
              originY = rp._y0;
            } else {
              originX = owner ? (owner.renderX || owner.x) : rp.x;
              originY = owner ? (owner.renderY || owner.y) : rp.y;
            }
            /* v2.3.3265: a shot that names its target (gameEvents.js `tg`; a
               sparring clone's, server spar.js) ends where it reaches them --
               the worker lands it there.  A bolt turns to them every frame, as
               a staff bolt does on its caster's screen, and is there when it
               has flown as far as they stand; an arrow keeps its line and is
               there when that line passes within a body of them (the worker's
               own test, projectiles.js's PvP radius).
               v2.3.3266: every page's locked shot names its target now, not a
               clone's alone; and a shot that pierces (`pierce`: a bow special,
               the Piercing stat) flies on through, as it does on the shooter's
               screen -- only its line was aimed at them (above). */
            var _tgPt = null;
            if (rp.tg) {
              var _tgO = peerShotTargetAt(S, rp.tg);
              if (_tgO) {
                if (rp.isStaff) {
                  rp.ang = Math.atan2(_tgO.y - originY, _tgO.x - originX);
                  if (rp.dist >= Math.hypot(_tgO.x - originX, _tgO.y - originY) - PEER_SHOT.BOLT_STOP) return peerShotEnd(rp, 'target', _tgO);
                } else if (!rp.pierce) {
                  _tgPt = _tgO;
                }
              }
            }
            /* v2.3.2730: where it was last frame, for the prop sweep below.  The
               first step has no last frame, so it starts one step back along the
               same line -- the shape v2.3.2473 gave the local first frame. */
            var _rpX0 = (typeof rp._renderX === 'number') ? rp._renderX : originX + Math.cos(rp.ang) * (rp.dist - _rpStep);
            var _rpY0 = (typeof rp._renderY === 'number') ? rp._renderY : originY + Math.sin(rp.ang) * (rp.dist - _rpStep);
            rp._renderX = originX + Math.cos(rp.ang) * rp.dist;
            rp._renderY = originY + Math.sin(rp.ang) * rp.dist;
            /* v2.3.3265: the arrow that named its target, reaching them (above).
               v2.3.3266: the room it has is the shooter's own test's
               (peerShots.js): a bow special's wider. */
            if (_tgPt && stepReaches(_rpX0, _rpY0, rp._renderX, rp._renderY, _tgPt.x, _tgPt.y,
              rp.isSpecial ? PEER_SHOT.SPECIAL_R : PEER_SHOT.ARROW_R)) return peerShotEnd(rp, 'target', _tgPt);
            /* ═══ v2.3.2730: A PEER'S SHOT MEETS THE PROP ON YOUR SCREEN TOO ═══
               This simulation is cosmetic -- the worker settles a peer's hits
               and this copy touches no monster -- and it never asked about
               props, so another player's arrow sailed through the ridge on your
               screen while it stuck in it on theirs.  Same sweep as the local
               arrow, and the same impact: the bolt crashes, the arrow stands in
               the rock (a mark, since there is no planted object here to hold
               it), and the prop throws its chips.  A remote projectile is drawn
               from its owner's FEET, so its drawn point is a ground point and
               needs no conversion.
               v2.3.3206: not the feet -- a player's position is the body's
               CENTRE (v2.3.2748), the boots playerGroundDy below it.  The
               shooter's own copy now asks the ground at the boots
               (projectiles.js _goy), so this one does too, or the two screens
               would put the same arrow in different props.
               v2.3.3206: and over the low things, as the shooter's own copy
               flies (projectiles.js shotSkip) -- bar the one it was aimed at,
               which the shooter sends as `lp` (gameEvents.js).  A shot from an
               older client says nothing, and flies over them all. */
            var _rpG = playerGroundDy(S.currentZone, originX, originY);
            if (!rp._skip) rp._skip = shotSkip(rp._lp || null);
            var _rpHit = sweepBlockPoint(S.currentZone, _rpX0, _rpY0 + _rpG, rp._renderX, rp._renderY + _rpG, rp._skip);
            if (_rpHit) {
              var _rpId = _rpHit.box ? _rpHit.box.id : null;
              if (_rpId) {
                /* ...and the mark goes up the face to where YOUR arrows stick.
                   A peer's shot is drawn at its owner's feet (above), so taken
                   literally it would stand in the dirt at the foot of the rock,
                   which reads as a miss that planted.  Yours hit at the bow
                   grip, ~30px up; this is that height, give or take a hand.
                   v2.3.3206: where it was drawn flying, _rpG over the contact,
                   and on a low thing in its upper part, as your own
                   (combatHelpers.propHitHeight). */
                var _rpY = _rpHit.y - propHitHeight(_rpHit.box, _rpG);
                /* v2.3.2995: one of the Wheel's objects takes it as it takes
                   yours -- its material, its shake, a hit toward breaking it --
                   so two players shooting one barrel both see it go */
                var _rpOi = (_rpHit.box && _rpHit.box.oi != null) ? _rpHit.box.oi : null;
                var _rpFace = boxFace(_rpHit.box, _rpHit.x, _rpHit.y);
                var _rpW = null;
                /* v2.3.3343: ...heard by how near it lands (hitSounds.earVol):
                   at one level it rang as loud from the far side of the view
                   as beside you (SOUND-GAPS "Also wrong") */
                var _rpK = earVol(S, _rpHit.x, _rpHit.y);
                if (_rpOi != null) {
                  _rpW = strikeWheelObject(S, { oi: _rpOi, x: _rpHit.x, y: _rpY, gy: _rpHit.y, ang: rp.ang + Math.PI,
                    weapon: rp.isStaff ? 'bolt' : 'arrow', special: !!rp.isSpecial, vol: 0.22 * _rpK, peer: true, k: _rpK });
                } else {
                  spawnPropDebris(S, { id: _rpId, x: _rpHit.x, y: _rpY, gy: _rpHit.y,
                    ang: rp.ang + Math.PI, weapon: rp.isStaff ? 'bolt' : 'arrow' });
                  if (_rpK > 0.02) propImpactSound(_rpId, 0.22 * _rpK);   /* someone else's shot: quieter than your own */
                }
                if (rp.isStaff) {
                  orbCrashFx(S, _rpHit.x, _rpY, rp.isSpecial ? '#f5c542' : '#a78bfa');
                  /* v2.3.2995: its mark, as yours leaves one (a peer's bolt
                     carries no element here: a plain burn) */
                  if (_rpW && !_rpW.broke && _rpFace !== 'n') {
                    markProp(S, { kind: 'scorch', id: _rpId, oi: _rpOi, x: _rpHit.x, y: _rpY, gy: _rpHit.y, face: _rpFace,
                      r: rp.isSpecial ? 18 : 11, style: scorchStyle(null), glow: rp.isSpecial ? 0xf5c542 : null, ttl: SCORCH_MS });
                  }
                } else if (_rpW && _rpW.broke) {
                  /* it broke what it hit: through the pieces (v2.3.2995) */
                  return true;
                } else if (!rp.isSpecial && arrowSnaps(rp.ownerId, rp.shotTs)) {
                  /* v2.3.2731: the same one-in-eight snap the shooter rolled --
                     same id, same shot timestamp, same answer (arrowSnap.js) */
                  queueArrowSnap(S, _rpHit.x, _rpY, _rpHit.y, rp.ang, 0.18 * _rpK);
                } else {
                  markProp(S, { kind: 'arrow', id: _rpId, oi: _rpOi, x: _rpHit.x, y: _rpY, gy: _rpHit.y,
                    face: _rpFace, ang: rp.ang,
                    /* v2.3.2995: a plain arrow stays in one of the Wheel's objects */
                    ttl: rp.isSpecial ? (rp.volley ? BOW_VOLLEY.BURN_MS : LONE_BURN_MS) : (_rpOi != null ? STUCK_ARROW_MS : 2000), special: !!rp.isSpecial });   /* v2.3.2849: a volley's 2.5 s */
                }
              }
              return peerShotEnd(rp, 'prop', _rpHit);
            }
            return true;
          });
        }
}

/* v2.3.3266: why another player's shot left your screen, the last few (QA
   probe `window.__btPeerShotEnds`, mp-peershots): its life, its reach, its
   target, or a prop.  Returns false, the filter's "gone". */
function peerShotEnd(rp, why, at) {
  if (typeof window !== 'undefined') {
    var q = window.__btPeerShotEnds || (window.__btPeerShotEnds = []);
    q.push({ why: why, owner: rp.ownerId != null ? String(rp.ownerId) : null, staff: !!rp.isStaff, special: !!rp.isSpecial,
      tg: rp.tg || null, dist: Math.round(rp.dist), x: Math.round(rp._renderX || 0), y: Math.round(rp._renderY || 0),
      at: at ? { x: Math.round(at.x), y: Math.round(at.y) } : null, t: Date.now() });
    if (q.length > 30) q.shift();
  }
  return false;
}
