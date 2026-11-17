/* A BOW'S CLAIM IS AN ARROW THE WORKER SAW LEAVE -- v2.3.5550 (grand plan
 * step 4.2, a sword's claim labelled a bow's, TRAPS §329; card K PR 14;
 * docs/specs/bow-shot.md).  ON since v2.3.5727 (card K2 PR 8; decided for
 * the owner while away by the planning session, on the owner's words of
 * 2026-11-17: "For all decisions waiting on me just go recommended.");
 * `bowshot: false` in the live flags is its kill switch.
 *
 * The bench (claims-gain.test, `bowlabel`) found a `ranged` claim worth 3.91
 * times an honest archer's take: with a bow worn, the worker believed five
 * claims a second (hitproof.js _hitRateTake) on anything in the bow's reach,
 * whether an arrow was ever loosed or not -- a sword's blow with a bow's
 * label.  Every arrow a page looses is relayed first (`player_projectile`,
 * index.js), so with this on:
 *
 *   1. THE SHOT: a bow's arrow is counted when its relay comes, at the bow's
 *      own rate (freeswing.js _pfBowCycleMs, the quickest a page looses:
 *      the flicked bow's), from an allowance of BURST shots; a relay sooner
 *      is relayed as before but counts as no arrow.
 *   2. THE CLAIM: an ordinary `ranged` claim on a monster lands on one of
 *      the last KEPT arrows counted -- the one it names (`sw`, a drawn
 *      arrow's: projectiles.js bowFeelSw) or else the oldest with a target
 *      left; each monster once an arrow, an arrow's 1 + Piercing targets at
 *      most (hitproof.js _hitPierce) -- or, with none, on an arrow drawn from
 *      the allowance as its relay would have (a relay lost to a dropped line
 *      or the relay's bucket costs an honest arrow nothing).  With the
 *      allowance spent it is dropped quietly (counted: `shot`).  So the bound
 *      is ARROWS AT THE BOW'S OWN RATE, each with its targets.
 *
 * Left as they are: a paid special's claims and everything inside its window
 * (the volley's stuck arrows' chips, its burning patch: hitproof.js
 * _pveVolleyLive), a staff's bolts, a test-mode character, and a player's
 * arrow at a player.  NOTHING IS PERSISTED: `_bs` lives on the player state.
 */
import { FREE_SWING } from './freeswing.js';

export const BOW_SHOT = Object.freeze({
  BURST: 2,        /* the allowance's top: an arrow, and one the network delayed */
  RETREAT_SLACK_MS: 500,   /* a paid retreat's arrow may come this long after its roll ends */
  KEPT: 8,         /* the arrows kept to judge claims by: no clock on them, so a claim a hidden tab held
                      (its arrow's relay before the hold, the claim after) still finds its arrow; banked
                      arrows buy a script KEPT hits at most, each paid at the bow's rate */
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const bowShotMethods = {
  /* v2.3.5727: ON (decided for the owner while away, the planning session,
     2026-11-17); `bowshot: false` is its kill switch (on unless its own
     falsy value, as `swordswing`) */
  _bowShotOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'bowshot') && !f.bowshot);
  },
  _bowShotState(ps) {
    return ps._bs || (ps._bs = { tokens: BOW_SHOT.BURST, t: 0, q: [] });
  },
  /* A `player_projectile` relay (index.js): a bow's arrow leaves.  Counted
     at the bow's own rate; a staff's bolt and a special's are not arrows
     this judges. */
  _bowShotSeen(session, payload, now) {
    if (!session || !session.id || !payload || typeof payload !== 'object' || payload.isStaff || payload.isSpecial || !this._bowShotOn()) return;
    const ps = this.playerState && this.playerState[session.id];
    if (!ps) return;
    const sw = (typeof payload.ts === 'number' && Number.isFinite(payload.ts)) ? payload.ts : null;
    /* a paid retreat's arrow is an arrow more, never the bow's own: counted
       free while the retreat the worker charged is on (movement.js
       _rollStamp, kind 'retreat') */
    if (payload.retreat && ps._rollKind === 'retreat' && now <= (ps._rollUntil || 0) + BOW_SHOT.RETREAT_SLACK_MS) {
      const st = this._bowShotState(ps);
      st.q.push({ sw, at: now, ids: null });
      if (st.q.length > BOW_SHOT.KEPT) st.q.shift();
      return;
    }
    this._bowShotCount(ps, sw, null, now);
  },
  /* one arrow from the allowance (refilled at the bow's own rate), or null */
  _bowShotCount(ps, sw, key, now) {
    const s = this._bowShotState(ps);
    const cyc = this._pfBowCycleMs(ps);
    s.tokens = Math.min(BOW_SHOT.BURST, s.tokens + (s.t ? Math.max(0, now - s.t) / cyc : BOW_SHOT.BURST));
    s.t = now;
    if (s.tokens < 1) return null;
    s.tokens -= 1;
    const shot = { sw, at: now, ids: key ? new Set([key]) : null };
    s.q.push(shot);
    if (s.q.length > BOW_SHOT.KEPT) s.q.shift();
    return shot;
  },
  /* combat.js's gate: true when this ordinary `ranged` claim is dropped --
     the switch on, no paid special's window live, and no arrow for it */
  _bowShotDrop(ps, sw, id, now) {
    return this._bowShotOn() && !this._pveVolleyLive(ps, now) && !this._bowShotTake(ps, sw, id, now);
  },
  /* May this ordinary `ranged` claim on monster `id` land now?  Takes a
     target of the arrow it is. */
  _bowShotTake(ps, sw, id, now) {
    if (!ps) return true;
    const key = 'm:' + String(id);
    const s = this._bowShotState(ps);
    const cap = Math.min(FREE_SWING.SHOT_TARGETS, 1 + (typeof this._hitPierce === 'function' ? this._hitPierce(ps) : 0));
    const live = s.q;
    const named = (typeof sw === 'number' && Number.isFinite(sw)) ? live.find((x) => x.sw === sw) : null;
    const shot = named || live.find((x) => !(x.ids && (x.ids.has(key) || x.ids.size >= cap)));
    /* no arrow seen with a target left: its relay was lost (a dropped line,
       the relay's own bucket) or never sent -- an arrow from the allowance,
       so the bound is the bow's rate whatever the relays say */
    if (!shot) {
      /* a paid retreat's one arrow, its relay or not (the worker charged it) */
      if (ps._rollKind === 'retreat' && now <= (ps._rollUntil || 0) + BOW_SHOT.RETREAT_SLACK_MS && s.retreatOf !== ps._rollUntil) {
        s.retreatOf = ps._rollUntil;
        s.q.push({ sw: null, at: now, ids: new Set([key]) });
        if (s.q.length > BOW_SHOT.KEPT) s.q.shift();
        return true;
      }
      return !!this._bowShotCount(ps, null, key, now);
    }
    if (!shot.ids) shot.ids = new Set();
    if (shot.ids.has(key) || shot.ids.size >= cap) return false;
    shot.ids.add(key);
    return true;
  },
};
