/* ═══ v2.3.3392: A HELD POSE IS PART OF THE PLAYER (docs/specs/emote-moves.md) ═══
 *
 * The fun & social plan's Phase 1 (docs/FUN-SOCIAL-PLAN.md): sit, sleep, flop
 * and three dances move the whole bro in code (src/game/emoteMoves.js,
 * rendering/emoteFx.js) and are HELD until the player moves.  A held pose is
 * not an event: a relay is heard by the phones near at the moment it is sent,
 * and one that walks up a minute later would be told nothing and draw the
 * sitter standing (TRAPS §176, the rule events-by-place was built on).  So it
 * is STATE, like the sprint's legs and the skull: `ps.po` here, `po` on the
 * player's tick entry (tick.js playerWire) for every phone that is sent them
 * whole, absent when they are not posing so everyone else's wire is
 * unchanged, read by the phone into `other._po` (wsClient.js).
 *
 * Set by the phone's `pose {id}` (an id from POSE.IDS, or null to stand up),
 * ended by the WORKER when the player really moves (movement.js: a step past
 * MOVE_END_PX, a zone change, a speed, a raised shield, a harvest, a death),
 * so a phone that never says "stand up" cannot leave a walker drawn sitting.
 * In memory only -- nothing stored, a deploy stands everyone up -- and no
 * coins, items or XP come near it.
 *
 * Kill switch: `emotemoves: false` (or `emotes: false`) in the live flags
 * (emotes.js _movesOff) refuses poses and moves, stands a poser up at their
 * next pose message, and un-advertises `caps.emotemoves`, which hides the
 * Moves tab on the phone at its next join.
 */

export const POSE = Object.freeze({
  /* src/game/emoteMoves.js EMOTE_HOLD_IDS, in its order (mirror-audit) */
  /* v2.3.3395: + Halloween week's Zombie Shuffle (the phone shows its tile
     only then; kept here any day, a look and never a rule) */
  IDS: Object.freeze(['sit', 'sleep', 'flop', 'bounce', 'robot', 'sprinkler', 'zombie']),
  /* a step longer than this ends a pose (the quiet phone's keepalive move,
     standing still, moves nobody) */
  MOVE_END_PX: 1.5,
  /* a change of pose at most this often from one socket */
  MIN_GAP_MS: 300,
});
const POSE_SET = new Set(POSE.IDS);

/* whether `id` is a pose the worker keeps */
export function poseListed(id) {
  return typeof id === 'string' && POSE_SET.has(id);
}

/* ═══ v2.3.5216: THE POSE DOOR -- A HELD POSE'S ONE WRITER (card L PR 5) ═══
   (docs/specs/pose-door.md; held by server/test/pose-door.test.mjs and the
   phase table's guard, tools/guards/phase-table.test.mjs)
   A pose's phase is ONE field, `ps.po`: none (standing), or one of
   POSE.IDS.  Written only by _poseTo, by a way of POSE_WAYS -- `hold` and
   `stand` (the phone's `pose {id}`, _handlePose), `move` (the worker ends it
   on a real move, movement.js _handleMove + _poseEndsOn) and `take` (a body a
   second tab takes over stands up, bodytake.js).  The door's rule: a pose
   held is one of POSE.IDS, and never by the dead or the dying -- the
   handler's own two checks, so nothing a player sees changes;
   `posedoor: false` in the live flags writes any pose a caller asks, as the
   old line would have.  The spacing (POSE.MIN_GAP_MS, the session's
   `_poseAt`) and the kill switches (`emotes`, `emotemoves`) stay the
   handler's: they say whether to ask, not what a pose is.  No join way: a
   join makes the body afresh with none. */
export const POSE_WAYS = Object.freeze({ hold: 'pose', stand: 'none', move: 'none', take: 'none' });

export const poseMethods = {
  /* v2.3.5216: the pose door's kill switch (live flag `posedoor: false`) */
  _poseDoorOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'posedoor') && !f.posedoor);
  },

  /* v2.3.5216: THE ONE WRITER of a held pose.  `id` is the pose for
     `hold`, ignored for the ways to none.  True when it wrote. */
  _poseTo(ps, id, way) {
    if (!ps || typeof ps !== 'object' || !Object.prototype.hasOwnProperty.call(POSE_WAYS, way)) return false;
    let next = null;
    if (POSE_WAYS[way] === 'pose') {
      if (!this._poseDoorOff() && (!poseListed(id) || ps.dead || ps.dying)) return false;
      next = id;
    }
    ps.po = next;
    return true;
  },

  /* `pose {id}`: hold a pose, or stand up (id null).  Answers nothing: the
     tick's `po` is the answer, to the poser's own phone as well */
  _handlePose(session, msg) {
    const sid = session && session.id;
    if (!sid) return;
    const ps = this.playerState[sid];
    if (!ps) return;
    const raw = msg ? msg.id : null;
    let id = poseListed(raw) ? raw : null;
    if (id && (ps.dead || ps.dying || this._movesOff())) id = null;
    /* only a pose SET is spaced: standing up is always heard, and never
       holds back the next pose (the phone stands you up when you walk, and
       may sit again a moment later) */
    if (id) {
      const now = Date.now();
      if (session._poseAt && now - session._poseAt < POSE.MIN_GAP_MS) return;
      session._poseAt = now;
    }
    if ((ps.po || null) === id) return;
    /* v2.3.5216: the pose door.  Dirty only when it wrote: a refusal there
       (unreachable today, the checks above are its own) changes nothing,
       and the tick's `po` stays the answer -- no new exit (refusal-door) */
    if (this._poseTo(ps, id, id ? 'hold' : 'stand')) this.dirtyPlayers.add(sid);
  },

  /* movement.js, on an accepted move: whether this move ends the pose */
  _poseEndsOn(ps, stepPx, zoneChanged, msg) {
    if (!ps || !ps.po) return false;
    return stepPx > POSE.MOVE_END_PX || !!zoneChanged || !!ps.vx || !!ps.vy
      || !!(msg && (msg.dead || msg.blocking || msg.dodging)) || !!ps.ex;
  },
};
