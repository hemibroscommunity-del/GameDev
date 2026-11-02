/* ═══ v2.3.3946: A MONSTER MOVE'S OWN PARTS, ON THE PHONE ═══
 * (spec: docs/specs/monster-moves.md; the worker: server/src/monstermoves.js)
 *
 * gameEvents.js's `monster_ability` case draws every telegraphed attack the
 * same way: a warning on the ground that fills as the wind-up runs, the body
 * throbbing (and its element swirling, elemWindup), a wind-up sound; then a
 * ring and a shake where it lands, or MISS.  The moves of the tiers past the
 * first ride that, their warning's shape on the ring (moveGeometry,
 * telegraphShapes.js).  This handles the two parts that are not a warning or
 * a landing, and says so (true: the case is done with the event):
 *
 *   enrage   an elder under 30% of its bar: a growl and a small shake near
 *            it (the red pulse is the body's tint, worked out from its bar:
 *            src/game/monsterMoves.js enrageTint)
 *   volley   its release: each ball flown from the thrower to where it lands,
 *            on the same display-only path as a snowball (game/projectiles.js
 *            with `displayOnly`: the worker deals each ball's blow)
 *
 * Gated on the worker's cap: an event no worker of today sends draws nothing.
 * And `moveColor`: a move's warning is in its monster's element colour. */
import { ELEMENTS } from '@/data/elements.js';
import { cueAt } from '@/game/eventSounds.js';
import { movesCapOn, volleyBalls, MOVE_KINDS } from '@/game/monsterMoves.js';

function monsterOf(S, id) {
  const list = (S && S.monsters) || [];
  for (let i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
  return null;
}

/** A move's warning colour: its monster's element's (ELEMENTS), else `dflt`. */
export function moveColor(S, payload, dflt) {
  if (!payload || MOVE_KINDS.indexOf(payload.ability) < 0 || !movesCapOn()) return dflt;
  const m = monsterOf(S, payload.monsterId);
  const e = m && m.element && Object.prototype.hasOwnProperty.call(ELEMENTS, m.element) ? ELEMENTS[m.element] : null;
  return (e && e.color) || dflt;
}

/** The parts of a move that are not its warning or its landing.  True when
 *  the event is handled (the case breaks). */
export function monsterMoveEvent(S, payload) {
  if (!payload) return false;
  /* this socket's worker (the noted caps are the same object, moveKindOn) */
  const can = !!(S && S._serverCaps && S._serverCaps.monstermoves === true) && movesCapOn();
  if (payload.ability === 'enrage') {
    if (!can || !S.player) return true;
    const m = monsterOf(S, payload.monsterId);
    const x = typeof payload.x === 'number' ? payload.x : (m ? m.x : S.player.x);
    const y = typeof payload.y === 'number' ? payload.y : (m ? m.y : S.player.y);
    const dx = x - S.player.x, dy = y - S.player.y;
    if (dx * dx + dy * dy < 500 * 500) S.screenShake = Math.max(S.screenShake || 0, 4);
    try { cueAt(S, 'bossEnrage', x, y); } catch (e) { /* sound only */ }
    return true;
  }
  if (payload.ability === 'volley' && payload.phase === 'execute' && payload.release) {
    const balls = can ? volleyBalls(payload) : [];
    if (!balls.length) return true;
    if (!S.slimeProjectiles) S.slimeProjectiles = [];
    const m = monsterOf(S, payload.monsterId);
    if (m) m._throwReleaseAt = Date.now();
    const ms = Math.max(1, Math.min(3000, Number(payload.travelMs) || 650));
    const frames = Math.max(1, Math.round((ms / 1000) * 60));
    const kind = payload.ball === 'slime' ? 'slime' : 'snowball';
    for (const b of balls) {
      const dx = b.tx - b.x, dy = b.ty - b.y;
      S.slimeProjectiles.push({
        x: b.x, y: b.y, ang: Math.atan2(dy, dx), speed: Math.sqrt(dx * dx + dy * dy) / frames, life: frames,
        propStopT: null, displayOnly: true, ownerId: payload.monsterId, rawDmg: 0, kind, ts: Date.now(),
        shooterArch: m ? (m.archetype || m.type || null) : null, _fxLife0: frames, _fxFrames: frames,
      });
    }
    try { cueAt(S, kind === 'snowball' ? 'throwSnow' : 'throwGoo', balls[0].x, balls[0].y); } catch (e) { /* sound only */ }
    return true;
  }
  return false;
}
