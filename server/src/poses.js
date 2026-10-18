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
  IDS: Object.freeze(['sit', 'sleep', 'flop', 'bounce', 'robot', 'sprinkler']),
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

export const poseMethods = {
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
    ps.po = id;
    this.dirtyPlayers.add(sid);
  },

  /* movement.js, on an accepted move: whether this move ends the pose */
  _poseEndsOn(ps, stepPx, zoneChanged, msg) {
    if (!ps || !ps.po) return false;
    return stepPx > POSE.MOVE_END_PX || !!zoneChanged || !!ps.vx || !!ps.vy
      || !!(msg && (msg.dead || msg.blocking || msg.dodging)) || !!ps.ex;
  },
};
