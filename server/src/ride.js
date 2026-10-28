/* ═══ v2.3.3776: THE SKATEBOARD ═══
 *
 * The owner, 2026-10-28: "I just added a skateboard to the root.  I want to be
 * able to ride around on this just in the safe Brotown area.  You can tap it
 * to ride (maybe a button somewhere on screen).  When outside of town it makes
 * you get off."  And on the owner's list (OWNER-LIST item 26): "faster than
 * sprinting, off when you fight, swim or get hit".
 *
 * sprint.js is the template: the WORKER decides, the walk's bound is widened
 * for what it allows and nothing else, and nothing is stored.
 *
 * THE WIRE.  Client -> worker `ride` {on: 1 | 0}: get on, get off.  Worker ->
 * client `ride_state` {on, why}: the answer to your own toggle, and the news
 * when the worker puts you off (`why`: 'edge' off the safe ground or out of
 * the Wheel, 'zone', 'dead', 'hit', 'fight' a swing / ability / roll / harvest
 * / pose / shield, 'duel', 'off' the kill switch; a refused `on` says why it
 * was refused: 'where' not on the safe ground, 'busy' in a duel, a race, a
 * harvest or a pose, 'soon' too quick a toggle).  PRIVILEGED (index.js), so a
 * client cannot forge one to another.
 *
 * ON THE WORKER.  `ps._ride` (true while on) and `ps._ridePid` (the session it
 * tells), underscore fields on playerState: NOTHING IS PERSISTED (handoff rule
 * 1), no storage key, and a reconnect or a worker restart drops the board --
 * the phone forgets it too (wsClient: a fresh join is off the board).
 *
 * THE SPEED.  While `ps._ride`, the walk's bound is judged at RIDE.MULT --
 * twice the walk (the owner: "about twice as fast as run speed"), stacking
 * with the potion and the move stat as the walk does -- folded into
 * movement.js _moveSpeedK, so the budget, the follow, the glide's cap
 * (movepath.js) and the join's judge agree by construction.  A rider does
 * not sprint: the phone stops the sprint when you get on, and the worker
 * pays for no sprint step while riding (sprint.js _sprintAllowed).
 *
 * WHAT ENDS IT (_rideEnd, each telling the rider):
 *   - an accepted move off the safe ground (wheelzone.js _wheelSafeAt, the
 *     WORKER's own place) or out of the Wheel, and a zone change;
 *   - death (index.js _handlePlayerDeath), a hit that lands (combat.js
 *     _applyDamage -- any damage, monster or player);
 *   - fighting: a swing, an ability, a burst, a strike, a harvest's start, a
 *     pose (index.js _onMessage, RIDE_ENDS_ON), and on a move the shield up,
 *     a roll or a harvest under way;
 *   - a duel or the arena starting for the rider (duel.js _makeDuel);
 *   - `ride: false` in the live flags: un-advertises caps.ride (the flags are
 *     spread over the caps, liveops.js) AND ends every ride on the rider's
 *     next move or tick (_rideK).
 * Swimming: the Wheel's safe ground is dry land (the town and its commons);
 * the phone gets off in the water on its own, and the worker has no water
 * test of its own to ask.
 *
 * THE OTHERS SEE IT.  The tick's player carries `brd: 1` while `ps._ride`
 * (tick.js playerWire, the one builder both tick paths use: tick-share.test),
 * absent otherwise, so nobody else's wire changes.  `brd`, not a cosmetic
 * key: peerCosmetics' keys are a player's look, and `sk`, `sp`, `pt`, `pw`
 * are taken.
 *
 * DEPLOY ORDER (rule 19): `caps.ride` (join.js).  The phone shows the button
 * only against a worker that advertises it: an old worker would refuse the
 * unknown `ride` (deny by default) and judge the faster moves at the walk.
 */

export const RIDE = {
  /* the walk on the board: faster than a sprint (SPRINT.MULT 1.33) --
     MIRROR: src/game/ride.js RIDE_MULT (mirror-audit.test.mjs pins the pair) */
  MULT: 2.0,   /* v2.3.3776: the owner, "It can maybe be about twice as fast as run speed" (1.6 first) */
  /* the least time between two toggles the worker takes; a quicker one is
     answered `soon` and changes nothing */
  TOGGLE_MS: 400,
  /* why a ride ends, for `ride_state` (and the phone's line) */
  WHY: Object.freeze(['edge', 'zone', 'dead', 'hit', 'fight', 'duel', 'off', 'asked']),
};

/* Messages that end a ride when the rider sends them: fighting, gathering
   and posing (index.js _onMessage, before its switch) */
export const RIDE_ENDS_ON = new Set([
  'player_attack', 'monster_damage', 'arrow_blast', 'node_strike', 'extraction_start',
  'ability_use', 'ability', 'element_burst', 'nml_attack', 'pose', 'trap_arm',
  'dungeon_start', 'race_start',
]);

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

export const rideMethods = {
  /* `ride: false` in liveflags switches it off (lower case, TRAPS §117) */
  _rideOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'ride') && !f.ride);
  },

  _rideSend(pid, payload) {
    if (!pid || typeof this._wsBySessionId !== 'function') return;
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'ride_state', payload })); } catch (e) { /* the ride state stands */ }
  },

  /* Is this player where a board may roll, and free to get on?  Null when
     yes, else the refusal's word. */
  _rideRefusal(pid, ps) {
    if (this._rideOff()) return 'off';
    if (!ps || ps.dying || ps.dead || ps.disconnected) return 'dead';
    if (ps.z !== 'wheel' || !this._wheelSafeAt(ps.x, ps.y)) return 'where';
    if (typeof this._duelFor === 'function' && this._duelFor(pid)) return 'busy';
    if (ps._race || ps.ex || ps.po || ps.blocking || ps.dodging) return 'busy';
    return null;
  },

  /* ride {on: 1 | 0} -- get on, get off.  Answers `ride_state`. */
  _handleRide(session, msg) {
    if (!session || !session.id) return null;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps) return null;
    const data = msg && (msg.payload || msg.data || msg);
    const want = !!(data && data.on === 1);
    const now = Date.now();
    if (ps._rideAt && now - ps._rideAt < RIDE.TOGGLE_MS) {
      this._rideSend(pid, { on: !!ps._ride, why: 'soon' });
      return null;
    }
    ps._rideAt = now;
    if (!want) {
      if (ps._ride) return this._rideEnd(ps, 'asked', pid);
      this._rideSend(pid, { on: false, why: 'asked' });
      return null;
    }
    const no = this._rideRefusal(pid, ps);
    if (no) {
      this._rideSend(pid, { on: false, why: no });
      return null;
    }
    ps._ride = true;
    ps._ridePid = pid;
    ps._mp = undefined;   /* a glide noted at the walk's pace stops here (movepath.js; lane D) */
    this.dirtyPlayers.add(pid);   /* the others draw the board (tick.js brd) */
    this._rideSend(pid, { on: true, why: null });
    return true;
  },

  /* Off the board, the worker's say: tell the rider why.  Safe to call on
     anyone (one property read when they are not riding). */
  _rideEnd(ps, why, pid) {
    if (!ps || !ps._ride) return null;
    const id = pid || ps._ridePid || null;
    ps._ride = false;
    ps._ridePid = undefined;
    ps._mp = undefined;   /* a glide noted at the board's pace stops here (movepath.js; lane D) */
    if (id && this.dirtyPlayers) this.dirtyPlayers.add(id);
    this._rideSend(id, { on: false, why: why || 'asked' });
    return false;
  },

  /* The walk's factor on the board, read by movement.js _moveSpeedK and so
     by every bound (the budget, the follow, the glide, the join's judge).
     A pure read: 1 off the board, dead or dying, or with the kill switch
     thrown -- the ride itself is ended by _rideOnMove. */
  _rideK(ps) {
    if (!ps || !ps._ride || ps.dead || ps.dying || this._rideOff()) return 1;
    return RIDE.MULT;
  },

  /* Every move the worker accepted (movement.js), where it now has you:
     off the board past the safe ground's edge, out of the Wheel, into a
     fight.  One property read when nobody rides. */
  _rideOnMove(pid, ps, zoneChanged) {
    if (!ps || !ps._ride) return null;
    if (this._rideOff()) return this._rideEnd(ps, 'off', pid);
    if (zoneChanged) return this._rideEnd(ps, ps.z === 'wheel' ? 'zone' : 'edge', pid);
    if (ps.dying || ps.dead) return this._rideEnd(ps, 'dead', pid);
    if (ps.z !== 'wheel' || !this._wheelSafeAt(ps.x, ps.y)) return this._rideEnd(ps, 'edge', pid);
    if (ps.blocking || ps.dodging || ps.ex || ps.po) return this._rideEnd(ps, 'fight', pid);
    return null;
  },

  /* A message the rider sent that fights, gathers or poses (index.js) */
  _rideOnInput(pid, type) {
    if (!pid || !RIDE_ENDS_ON.has(type)) return null;
    const ps = this.playerState[pid];
    if (!ps || !ps._ride) return null;
    return this._rideEnd(ps, type === 'dungeon_start' || type === 'race_start' ? 'zone' : 'fight', pid);
  },

  /* tick.js playerWire: `brd: 1` while riding */
  _rideWire(ps) {
    /* the kill switch: no board drawn, from the next tick (the rider is told
       on their next move, _rideK) */
    return !!(ps && ps._ride) && !this._rideOff();
  },
};
