/* ═══ v2.3.3006: SPRINT ═══
 *
 * Owner, 2026-10-03: "Also adding a sprint button by the left joystick that
 * drains down stamina but makes you run about 33% faster until it drains out.
 * Maybe just to the right of the left joystick".
 *
 * STAMINA IS THE SERVER'S (abilities.js, "the stamina pool the SERVER owns"),
 * so the sprint is paid for here, and the anti-teleport bound (movement.js) is
 * widened here -- for steps this worker paid for and for nothing else.
 *
 * THE WIRE IS ONE FIELD ON THE MOVE.  A sprinting client marks each move it
 * sends with `sp: 1`; there is no sprint message.  That is deliberate:
 *   - nothing new for the router (an unknown type would fall to the default
 *     branch and be REBROADCAST to the room, handoff rule 13);
 *   - the flag rides the very message the bound is measured on, so the two
 *     can never arrive out of order;
 *   - a sprint ENDS on its own: stop marking the moves and the worker stops
 *     paying and stops widening (after GRACE_MS), whatever the client does.
 *
 * A MARKED MOVE IS A SPRINT STEP when the worker allows one -- not switched
 * off (`sprint: false` in liveflags), alive, not blocking, a guard not broken,
 * and stamina at MIN_START or more (or the sprint already under way, which
 * runs to zero).  It then:
 *   - widens the bound by MULT for that move (movement.js `_sprintK`);
 *   - bills DRAIN_PER_S for the time since the PREVIOUS MOVE, when that move
 *     was a paid sprint step too (the player ran through the gap), at most
 *     STEP_MAX_MS of it, and only when the move actually moved the player.
 *     A move that was not one -- the client's rest packet when you stop, its
 *     idle keepalive, a walk -- ends the run, so the first step after it bills
 *     nothing: standing still is never billed.  It is NOT "a gap over some
 *     length is a pause": that billed nothing at all to a phone drawing a
 *     few frames a second (its moves arrive ~400 ms apart -- found by
 *     mp-sprint, whose test machine does exactly that), and to a client that
 *     simply sent its moves slowly;
 *   - holds the stamina regen off for REGEN_PAUSE_MS (index.js
 *     _tickPlayerRegen, both arms), as a held shield does -- a sprint that
 *     refilled as it drained would never end.
 * At zero the sprint is over: the next marked move is an ordinary one.  The
 * client stops on its own bar (its prediction, then this worker's
 * player_state), and for GRACE_MS after the last paid step the bound stays
 * wide, so the client running a beat past the worker's zero is never
 * rubber-banded.
 *
 * WHAT A FORGED `sp: 1` BUYS: the sprint it pays for, nothing more -- the
 * stamina is spent here, the multiplier is a constant, and a client at zero
 * gets an ordinary bound.  WHAT A MISSING ONE COSTS: nothing (an old client
 * never sends it, and walks).
 *
 * DEPLOY ORDER (rule 19): `caps.sprint` (join.js).  The client shows the
 * button and marks its moves only against a worker that advertises it: an old
 * worker ignores `sp`, judges the faster moves at the walking bound and would
 * rubber-band every sprint.  Against a NEW worker an old client never marks a
 * move and simply walks.  Kill switch: `sprint: false` in liveflags
 * un-advertises it AND stops every sprint step here (_sprintOff); a tab that
 * joined before gets ordinary bounds and stops on the zero that follows.
 *
 * NOTHING IS PERSISTED (handoff rule 1): the sprint lives in underscore fields
 * on playerState and a worker restart forgetting it is correct.
 */

export const SPRINT = {
  /* the walk while sprinting -- MIRROR: src/game/sprint.js SPRINT_MULT
     (mirror-audit.test.mjs pins the pair) */
  MULT: 1.33,
  /* stamina a second of sprinting: about 9 s from a 100 bar, against the
     regen's ~10 s to fill it again -- MIRROR: src/game/sprint.js */
  DRAIN_PER_S: 11,
  /* the least stamina a sprint may START on -- MIRROR: src/game/sprint.js */
  MIN_START: 5,
  /* the bound stays wide this long after the last step the worker paid for */
  GRACE_MS: 1500,
  /* the most one step is billed for (a client sends a move every 22-66 ms
     while it moves; a slow phone every few hundred) */
  STEP_MAX_MS: 1000,
  /* no regen within this of a paid step */
  REGEN_PAUSE_MS: 1000,
  /* v2.3.3015: the tick tells the others a player sprints (`spr` on its
     player, tick.js) until this long after their last paid step -- a slow
     phone's moves arrive ~400 ms apart, and a peer's legs flicking between
     paces on every gap would be worse than a beat of sprint after it ends */
  WIRE_MS: 600,
};

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

export const sprintMethods = {
  /* `sprint: false` in liveflags switches it off (lower case, TRAPS §117:
     the admin flags route only takes lower-case names). */
  _sprintOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'sprint') && !f.sprint);
  },

  /* May this move be a sprint step?  Everything here is the worker's own
     state; the only thing the wire says is that the client wants one. */
  _sprintAllowed(ps, now) {
    if (!ps || this._sprintOff()) return false;
    if (ps.dying || ps.dead || ps.disconnected) return false;
    if (ps.blocking) return false;
    if (ps._guardBrokenUntil && now < ps._guardBrokenUntil) return false;
    const st = typeof ps.stamina === 'number' ? ps.stamina : 0;
    if (st <= 0) return false;
    /* a sprint under way (the move before this one a paid step) runs to
       zero; a new one needs MIN_START */
    return !!ps._sprintPrevPaid || st >= SPRINT.MIN_START;
  },

  /* The bound's multiplier for this move (movement.js), BEFORE it is judged:
     MULT for a sprint step, MULT for GRACE_MS after the last one paid for,
     else 1.  Marks the move to be paid for once it is accepted. */
  _sprintK(ps, msg, now) {
    ps._sprintStep = false;
    /* Was the move before this one a paid sprint step?  Asked of EVERY move,
       so any other move in between -- a rest packet, a keepalive, a walk, a
       refused move -- ends the run and the gap before it is not billed. */
    ps._sprintPrevPaid = !!ps._sprintLastPaid;
    ps._sprintLastPaid = false;
    /* what happened to the moves, for the admin view (QA: mp-sprint) */
    const d = ps._sprintTally || (ps._sprintTally = { moves: 0, marked: 0, steps: 0, paid: 0, still: 0, ms: 0 });
    d.moves++;
    if (msg && msg.sp === 1) d.marked++;
    if (msg && msg.sp === 1 && this._sprintAllowed(ps, now)) {
      ps._sprintStep = true;
      d.steps++;
      return SPRINT.MULT;
    }
    if (ps._sprintAt && now - ps._sprintAt < SPRINT.GRACE_MS && !this._sprintOff()) return SPRINT.MULT;
    return 1;
  },

  /* The move was accepted and moved the player `dist` px: pay for the step.
     Whole points come off the pool (the client's bar shows whole numbers and
     player_state carries what changed); the fraction is carried over. */
  _sprintPay(ps, dist, now, pid) {
    if (!ps || !ps._sprintStep) return;
    ps._sprintStep = false;
    const d = ps._sprintTally;
    if (!(dist > 0.5)) { if (d) d.still++; return; }
    /* the time since the move before, if that one was a paid sprint step:
       he ran through it.  The first step of a run bills nothing. */
    const last = ps._sprintAt || 0;
    const ms = ps._sprintPrevPaid && last ? Math.max(0, Math.min(now - last, SPRINT.STEP_MAX_MS)) : 0;
    ps._sprintAt = now;
    ps._sprintLastPaid = true;
    if (d) { d.paid++; d.ms += ms; }
    ps._sprintOwed = (ps._sprintOwed || 0) + (ms / 1000) * SPRINT.DRAIN_PER_S;
    const whole = Math.floor(ps._sprintOwed);
    if (whole < 1) return;
    ps._sprintOwed -= whole;
    const before = typeof ps.stamina === 'number' ? ps.stamina : 0;
    ps.stamina = Math.max(0, before - whole);
    if (ps.stamina !== before) {
      if (pid && typeof this._queuePlayerStateFlush === 'function') this._queuePlayerStateFlush(pid);
      ps._regenDirty = true;
    }
  },

  /* ═══ v2.3.3015: WHAT THE OTHERS SEE ═══
     Asked of the sprint "other players' legs run at walking pace when they
     sprint", the owner: "Yes continue working on those items".  The tick's
     player (tick.js playerWire) carries `spr: 1` while this is true: a step
     this worker paid for within WIRE_MS -- never the client's own say-so.
     Absent otherwise, so a walking player's wire is byte for byte what it
     was; a client reads "absent" as walking (wsClient.js), which is also what
     an old worker's wire means. */
  _sprintWire(ps, now) {
    return !!(ps && ps._sprintAt && now - ps._sprintAt < SPRINT.WIRE_MS);
  },

  /* Is the regen held off for a sprint (index.js _tickPlayerRegen)? */
  _sprintHoldsRegen(ps, now) {
    return !!(ps && ps._sprintAt && now - ps._sprintAt < SPRINT.REGEN_PAUSE_MS);
  },
};
