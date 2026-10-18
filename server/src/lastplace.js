/* ═══ v2.3.3327: A RECONNECT STARTS WHERE THE SERVER LAST HAD YOU ═══
 *
 * The anti-bot review's fix 7, its third part (docs/specs/antibot-review.md
 * §4; the owner's "Yes" to the bot farming holes).  v2.3.3325 held every MOVE
 * to a budget (movement.js MOVE_BUDGET) and closed the three ways round it --
 * but a JOIN was still a fresh player state built from the phone's own word
 * (join.js), so a script that dropped its socket and came back could be
 * anywhere: the join took the place it named, and the first move after it was
 * a first move, judged from nothing.  Two teleports a reconnect, and the
 * one-socket limit allows 20 sockets a minute an address.
 *
 * WHAT HAPPENS NOW.  When a player's state goes -- a socket's close
 * (index.js webSocketClose), a lingering body's end (linger.js _lingerEnd),
 * or a second join taking over a live session (join.js) -- the worker
 * remembers where it had them: the zone, the place, when it last judged a
 * move there, what was left of the budget, and the Wheel's way back.  The next
 * join of that player is judged from it (_placeOnJoin):
 *   - SAME ZONE (a dead pipe, the app brought back, a dropped connection):
 *     the place the phone names is judged from the remembered one, at the
 *     fastest an honest phone can go while the worker hears nothing from it --
 *     the walk's bound with a sprint, x SPRINT.MULT, since a sprint that sends
 *     no moves is not billed -- for all the time since, with NO cap: a phone
 *     whose pipe died walks on for up to the 15 s it takes to notice.  Within
 *     it, taken; past it, the worker puts them as far as it reaches and
 *     FOLLOWS the rest (movement.js _tickMoveFollow), never refuses: the
 *     budget's own rule, so nobody honest is ever held.  The budget carries on
 *     from what was left, so a reconnect never buys a fresh 3 s of it.
 *   - INTO THE WHEEL FROM ELSEWHERE (the phone came down the stairs while its
 *     pipe was dead): judged as the way in is, from where they left the Wheel
 *     or its arrival.
 *   - OUT OF THE WHEEL (a reload: a fresh page starts in today's town): the
 *     place is taken -- nothing is farmed in today's town -- and the next way
 *     into the Wheel is judged from where they left it OR from its ARRIVAL,
 *     whichever is nearer what the phone says (a fresh page lands at the
 *     arrival; a trip cut short by the drop comes back where it left).
 * And the first move after ANY join is judged from where the join put them
 * (lastMoveAt), no longer a free first move -- with no memory too, when the
 * join named a real place.
 *
 * A DEATH LANDS AT THE ARRIVAL TOO.  The respawn puts the player in today's
 * town (index.js _tickPlayerRespawn) and the phone comes back down the stairs
 * to the Wheel's arrival (respawn.js: never the dungeon's mouth), so the next
 * way in is judged from the arrival (movement.js _moveRespawned).  Before, it
 * was the one free way in v2.3.3325 left.
 *
 * WHAT IS NOT JUDGED.  A join with no memory -- the first ever, the first
 * after a deploy or once the room has emptied (memory only, rule 11), or after
 * LAST_PLACE.KEEP_MS -- is taken as it was, and so is its first way into the
 * Wheel: after a deploy an honest phone in a dungeon comes back out at its
 * mouth, and judging that from the arrival would follow it across a land, and
 * every test's new character walks in where it is put.
 * A phone that draws another Wheel than the room plays (wheeltables.js
 * _wheelInStep) is in another map's numbers, and is left alone as the room
 * leaves it alone.
 *
 * Kill switch `lastplace: false` (and `movebudget: false`, which this rides
 * on): every join takes its place again, and the first move after it is free.
 */
import { MOVE_BUDGET } from './movement.js';
import { WHEEL_ZONE } from './wheelzone.js';
import { SPRINT } from './sprint.js';

export const LAST_PLACE = Object.freeze({
  /* how long a place is remembered.  Its allowance covers the whole Wheel
     within minutes; what an hour keeps is the Wheel's way back, so a reload's
     way in is judged -- a script that waits an hour for one free way in is
     no farming bot */
  KEEP_MS: 60 * 60 * 1000,
  /* how many: four times the cap of 120, oldest first out */
  MAX: 480,
  /* the Wheel's arrival in BroTown, game px south of its centre -- on both
     Wheels (the ground worker's `ay = cy + 0.25 * P`; the phone's WHEEL_GEOM
     arrival, worldTrial.js; last-place.test.mjs holds them together) */
  ARRIVAL_DY: 288,
});

const num = (v) => typeof v === 'number' && Number.isFinite(v);

export const lastPlaceMethods = {
  /* the kill switch: on unless `lastplace: false`, and only with the budget */
  _lastPlaceOn() {
    const f = this._liveFlags;
    if (f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'lastplace') && !f.lastplace) return false;
    return this._moveBudgetOn();
  },

  /* the overview's counts */
  _lpTally(k) {
    const c = this._lpCount || (this._lpCount = { kept: 0, judged: 0, followed: 0, fresh: 0 });
    c[k] = (c[k] || 0) + 1;
  },

  /* The Wheel's arrival in the table this room plays. */
  _wheelArrival() {
    const T = typeof this._wheelT === 'function' ? this._wheelT() : null;
    const c = T && T.WHEEL_CENTRE;
    if (!Array.isArray(c) || !num(c[0]) || !num(c[1])) return null;
    return { x: c[0], y: c[1] + LAST_PLACE.ARRIVAL_DY };
  },

  /* Where a player's state has them, as the next join is judged from it --
     null for a state with no place, or in another Wheel's numbers. */
  _placeOf(ps, now) {
    if (!ps || typeof ps.z !== 'string' || !num(ps.x) || !num(ps.y)) return null;
    if (typeof this._wheelInStep === 'function' && !this._wheelInStep(ps)) return null;
    const at = num(ps._mvBudgetAt) ? ps._mvBudgetAt : (num(ps.lastMoveAt) ? ps.lastMoveAt : now);
    const back = ps._wheelBack && num(ps._wheelBack.x) && num(ps._wheelBack.y) ? { x: ps._wheelBack.x, y: ps._wheelBack.y } : null;
    /* the walk's bound as it stood (the potion, the move stat): the join that
       is judged from this has not read the player's record yet */
    const k = typeof this._moveSpeedK === 'function' ? this._moveSpeedK(ps) : { spdCap: 1, moveMult: 1 };
    return {
      z: ps.z, x: ps.x, y: ps.y, at, saved: now,
      budget: num(ps._mvBudget) ? ps._mvBudget : null,
      walk: MOVE_BUDGET.SPEED_PX * k.spdCap * k.moveMult,
      back, arrive: !!ps._wheelArrive,
    };
  },

  /* A player's state is going: remember where it had them.  A Map, keyed by
     the player id the join checked (never {}: handoff rule on client ids). */
  _placeRemember(id, ps, now) {
    if (!id || !this._lastPlaceOn()) return;
    const t = num(now) ? now : Date.now();
    const p = this._placeOf(ps, t);
    if (!p) return;
    const m = this._lastPlaces || (this._lastPlaces = new Map());
    m.delete(id);   /* re-inserted last: the oldest is first out */
    m.set(id, p);
    this._lpTally('kept');
    while (m.size > LAST_PLACE.MAX) m.delete(m.keys().next().value);
  },

  _placeForget(id) {
    if (this._lastPlaces) this._lastPlaces.delete(id);
  },

  /* The remembered place of `id`, taken out (a join uses it once), or null
     when there is none or it is older than KEEP_MS. */
  _placeTake(id, now) {
    const m = this._lastPlaces;
    if (!m) return null;
    const p = m.get(id);
    if (!p) return null;
    m.delete(id);
    return now - p.saved <= LAST_PLACE.KEEP_MS ? p : null;
  },

  /* Coming into the Wheel: where to judge the way in from -- where they left
     it, or its arrival after a login or a death, whichever is nearer the
     place the phone names (both are honest ways in).  null: not judged. */
  _wheelEntryFrom(ps, x, y) {
    const back = ps._wheelBack && num(ps._wheelBack.x) && num(ps._wheelBack.y) ? ps._wheelBack : null;
    let arr = null;
    if (ps._wheelArrive && this._lastPlaceOn()
        && !(typeof this._wheelInStep === 'function' && !this._wheelInStep(ps))) arr = this._wheelArrival();
    if (!back && !arr) return null;
    if (!arr) return { x: back.x, y: back.y, arrival: false };
    if (!back) return { x: arr.x, y: arr.y, arrival: true };
    const db = (x - back.x) * (x - back.x) + (y - back.y) * (y - back.y);
    const da = (x - arr.x) * (x - arr.x) + (y - arr.y) * (y - arr.y);
    return da < db ? { x: arr.x, y: arr.y, arrival: true } : { x: back.x, y: back.y, arrival: false };
  },

  /* The join of `id` built a fresh state `ps` from the place its phone named
     (`claimed`: it named one -- a join that names none stands at the fresh
     state's 0, 0, which is no place); `live` is the place of a session it
     took over (join.js), else the one remembered at the last leave is used. */
  _placeOnJoin(id, ps, live, now, claimed) {
    if (!ps || !this._lastPlaceOn()) return;
    const t = num(now) ? now : Date.now();
    const kept = this._placeTake(id, t);
    const mem = live || kept;
    if (typeof this._wheelInStep === 'function' && !this._wheelInStep(ps)) return;
    if (!claimed || !num(ps.x) || !num(ps.y) || typeof ps.z !== 'string') return;
    /* the first move after this join is judged from where it puts them */
    ps.lastMoveAt = t;
    if (!mem) {
      this._lpTally('fresh');
      return;
    }
    const inWheel = ps.z === WHEEL_ZONE;
    /* where this join is judged from, if it is judged */
    let from = null;
    if (mem.z === ps.z) from = { x: mem.x, y: mem.y };
    else if (inWheel) {
      const probe = { _wheelBack: mem.back, _wheelArrive: mem.arrive, _wheelSizes: ps._wheelSizes };
      const e = this._wheelEntryFrom(probe, ps.x, ps.y);
      if (e) from = { x: e.x, y: e.y };
    }
    /* the Wheel's way back: kept from the memory, and out of the Wheel the
       place they left it -- and its arrival whenever this join could be a
       fresh page's (one starts in today's town) or a trip the drop cut short */
    if (!inWheel) {
      ps._wheelBack = mem.z === WHEEL_ZONE ? { x: mem.x, y: mem.y } : (mem.back ? { x: mem.back.x, y: mem.back.y } : undefined);
      ps._wheelArrive = (ps.z === 'town' || mem.z === WHEEL_ZONE || mem.arrive || ps.z !== mem.z) ? true : undefined;
    }
    if (!from) {
      this._lpTally('fresh');
      return;
    }
    /* the fastest an honest phone goes while the worker hears nothing of it:
       the walk's bound when they left (the potion, the move stat) with a
       sprint, which is billed only by the moves it sends */
    const walk = num(mem.walk) && mem.walk > 0 ? mem.walk : MOVE_BUDGET.SPEED_PX;
    const away = Math.max(0, (t - mem.at) / 1000);
    const left = mem.budget !== null ? Math.max(0, mem.budget) : walk * MOVE_BUDGET.BURST_S + MOVE_BUDGET.SLACK_PX;
    const reach = left + walk * SPRINT.MULT * away;
    const dx = ps.x - from.x, dy = ps.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const cap = walk * MOVE_BUDGET.BURST_S + MOVE_BUDGET.SLACK_PX;
    this._lpTally('judged');
    if (dist <= reach) {
      ps._mvBudget = Math.min(cap, reach - dist);
      ps._mvBudgetAt = t;
      return;
    }
    /* past it: as far as it reaches, and followed on (movement.js) */
    const want = { x: ps.x, y: ps.y };
    const f = dist > 0 ? reach / dist : 0;
    ps.x = from.x + dx * f;
    ps.y = from.y + dy * f;
    ps._mvBudget = 0;
    ps._mvBudgetAt = t;
    ps._mvFollow = { x: want.x, y: want.y, z: ps.z, rate: walk };
    if (!this._mvFollowing) this._mvFollowing = new Set();
    this._mvFollowing.add(id);
    this._lpTally('followed');
  },

  /* for /api/admin/overview: places kept, joins judged from one, those
     followed past it, joins with nothing to judge from; places held now */
  _lastPlaceInfo() {
    const c = this._lpCount || {};
    return {
      on: this._lastPlaceOn(),
      kept: c.kept || 0,
      judged: c.judged || 0,
      followed: c.followed || 0,
      fresh: c.fresh || 0,
      held: this._lastPlaces ? this._lastPlaces.size : 0,
    };
  },
};
