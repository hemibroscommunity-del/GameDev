/* ═══ v2.3.4455: A SECOND LOGIN MID-FIGHT TAKES OVER THE BODY WHERE IT STANDS ═══
 *
 * The owner (2026-11-10), on what a second login during a fight between
 * players should do: "So yes do the take over body message" -- the body
 * where it stands: same place, zone, health, fight lock and bag; nothing
 * reset, nothing saved over, no moment of safety.  A deliberate exception to
 * "players start in BroTown on login", ONLY while the linger's own test
 * (linger.js _lingerWouldStay) says the body is in a fight.
 *
 * v2.3.4432 closed the escape first: such a takeover is a leave, the body
 * lingers and a fresh launch waits (`linger_wait`, 4010).  That stays the
 * answer for a phone that cannot be placed, and the fallback here.
 *
 * HOW.  A phone says in its join that it can be placed (`tb: 1`, beside
 * `rb`, `nj`, ...).  On a fight takeover from such a phone the join keeps
 * the LIVE player state (join.js: no rebuild from the record, no place
 * judged, nothing saved), and after state_sync sends `body_place {z, x, y,
 * d}`.  The phone takes the trip down today's town's stairs as every login
 * does, landing at that spot instead of the town square (src/game/
 * bodyPlace.js; worldTrial.js setWheelArrival, the dungeon mouth's door).
 *   - Until the phone stands at the body, its moves move nothing: a move
 *     from another zone (today's town, on the stairs) or far from the body is
 *     dropped, so the body neither walks nor leaves the Wheel.  It is
 *     hittable the whole time (by players and monsters: it is in the room).
 *   - The phone's answer is its first move from the body's zone within
 *     RESUME_PX of it (the linger's own reach for "a return to the body").
 *     A move is chosen over a new "I am here" message: no new message from
 *     the phone to trust or rate, and the move is what the body needs next
 *     anyway.
 *   - No answer within WAIT_MS (a trip that never came, a phone that landed
 *     elsewhere), or a move from the Wheel past RESUME_PX (it landed
 *     somewhere else): the body falls back to v2.3.4432's linger -- the
 *     session gets the real close and the phone the linger's wait.  Nothing
 *     is ever stuck.
 * The same for a body already LINGERING (linger.js): the app closed first
 * and opened again inside the 20 s, or a socket the phone gave up on in the
 * middle of the takeover itself.  A phone that can be placed takes it back
 * where it stands (_bodyTakeLingering); one that cannot waits, as before.
 * One field holds the phase: `ps._bodyWait` (the time it gives up), set and
 * cleared only here.  Memory only (rule 11): a deploy ends it with the body.
 *
 * Kill switch `bodytake: false` in the live flags: v2.3.4432 for every
 * phone (and `caps.bodyTake` un-advertised).  It protects the OTHER player:
 * never asks _testMode.
 */
import { LINGER } from './linger.js';

export const BODY_TAKE = Object.freeze({
  /* the trip down the stairs waits up to 45 s for its art (zoneGate.js
     gateCap); past this the body falls back to the linger */
  WAIT_MS: 60000,
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const bodyTakeMethods = {
  _bodyTakeOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'bodytake') && !f.bodytake);
  },

  /* join.js: does this join take the old session's body over?  A phone that
     can be placed, the switch on, and the linger's own test. */
  _bodyTakeWants(msg, oldSession, now) {
    return !!msg && msg.tb === 1 && this._bodyTakeOn() && this._lingerWouldStay(oldSession, now);
  },

  /* join.js: ...or a body already LINGERING (the old socket closed first: the
     app swiped away and opened again, or a socket the phone gave up on in
     the middle of this very takeover -- mp-bodytake caught that on a slow
     worker), from a phone that can be placed: taken back where it stands,
     as above, instead of the linger's wait.  A dying body waits for its
     respawn as before.  Returns the body, or null. */
  _bodyTakeLingering(msg, now) {
    if (!msg || msg.tb !== 1 || !this._bodyTakeOn() || this._takeoverLingerOff() || this._lingerOff()) return null;
    const b = this._lingerBodies ? this._lingerBodies.get(msg.id) : null;
    const ps = b ? this.playerState[msg.id] : null;
    if (!ps || !ps.lingering || ps.dying || ps.dead || now >= b.until || ps.z !== ps._lingerZ) return null;
    this._lingerBodies.delete(msg.id);
    ps.lingering = false;
    return ps;
  },

  /* join.js, the body kept: the wait begins (the one transition in) */
  _bodyTakeStart(id, now) {
    const ps = this.playerState[id];
    if (!ps) return;
    ps._bodyWait = now + BODY_TAKE.WAIT_MS;
    /* it stands still with its guard down, as a lingering body: nobody holds
       the stick until the phone stands at it (no moment of safety) */
    ps.vx = 0; ps.vy = 0; ps._mvFollow = undefined;
    ps.blocking = false; ps.blockStartT = 0; ps.dodging = false;
    ps.ex = null; ps._exAt = 0; ps._sprintStep = false;
    ps.po = null;   /* and stands up: no pose crosses a join (the phone clears its own: rejoinresend's pose row) */
    this.dirtyPlayers.add(id);
    if (!this._bodyTakes) this._bodyTakes = new Set();
    this._bodyTakes.add(id);
  },

  /* ...and, after state_sync, where the phone is to stand */
  _bodyTakeSend(ws, id) {
    const ps = this.playerState[id];
    if (!ps || !ps._bodyWait) return;
    try { ws.send(JSON.stringify({ type: 'body_place', payload: { z: ps.z, x: ps.x, y: ps.y, d: ps.d } })); } catch (e) { /* the wait runs out into the linger */ }
  },

  /* the one transition out */
  _bodyTakeDone(id, ps) {
    if (ps) ps._bodyWait = 0;
    if (this._bodyTakes) this._bodyTakes.delete(id);
  },

  /* movement.js, first: true when the move is dropped (the body stays put) */
  _bodyTakeMove(session, ps, msg) {
    if (!ps || !ps._bodyWait) return false;
    const x = Number(msg && msg.x), y = Number(msg && msg.y);
    const here = msg && msg.z === ps.z;
    if (here && Number.isFinite(x) && Number.isFinite(y)
      && (x - ps.x) * (x - ps.x) + (y - ps.y) * (y - ps.y) <= LINGER.RESUME_PX * LINGER.RESUME_PX) {
      this._bodyTakeDone(session.id, ps);   /* it stands at the body: this move goes on */
      return false;
    }
    /* landed in the body's zone, somewhere else: it could not be placed */
    if (here) this._bodyTakeFailSoon(session.id);
    return true;
  },

  /* the tick: a wait that ran out falls back */
  _bodyTakeSweep(now) {
    if (!this._bodyTakes || this._bodyTakes.size === 0) return;
    for (const id of [...this._bodyTakes]) {
      const ps = this.playerState[id];
      if (!ps || !ps._bodyWait) { this._bodyTakes.delete(id); continue; }
      if (now >= ps._bodyWait) this._bodyTakeFailSoon(id);
    }
  },

  _bodyTakeFailSoon(id) {
    const p = this._bodyTakeFail(id);
    if (p && p.catch) p.catch(() => {});
  },

  /* v2.3.4432's answer, late: the session gets the real close (the body
     lingers if its fight is still on) and the phone the linger's wait */
  async _bodyTakeFail(id) {
    const ps = this.playerState[id];
    this._bodyTakeDone(id, ps);
    const ws = this._wsBySessionId ? this._wsBySessionId(id) : null;
    if (!ws) return;
    await this._playerLeaves(ws, 'bodyTakeFailed');   /* v2.3.4830: the session door (leave.js) */
    const b = this._lingerBodies ? this._lingerBodies.get(id) : null;
    if (b) {
      try { ws.send(JSON.stringify({ type: 'linger_wait', payload: { ms: Math.ceil(Math.max(0, b.until - Date.now()) + LINGER.WAIT_SLACK_MS) } })); } catch {}
      try { ws.close(LINGER.CLOSE_CODE, 'linger'); } catch {}
    } else {
      try { ws.close(1011, 'try again'); } catch {}   /* the fight is over: an ordinary rejoin */
    }
  },
};
