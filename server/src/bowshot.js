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
 * 3. THE REACH (v2.3.5901, card K4 PR 2; `bowreach`, ON, its kill switch
 *    `bowreach: false`): an arrow seen keeps where the archer stood at its
 *    relay (the worker's copy), and a claim lands on it only with the
 *    monster within the arrow's own flight of that spot
 *    (hitproof.js _hitArrowReach: 675 px x Range, its slack) -- not, as
 *    the hit test's reach (_hitReach: the flight AND a second of the
 *    fastest run, 1,490 px for a new character), from wherever the archer
 *    stands now.  The bench's liar stood 1,490 px off and never walked
 *    (claims-gain `bowlabel`, 1.60).  And a claim with NO arrow seen (its
 *    relay lost) lands from the allowance as before only while a small
 *    allowance of its own lasts (LOST_BURST, one back every LOST_MS): an
 *    honest phone loses a relay now and then, a script that sends none to
 *    keep the old reach gets one claim in LOST_MS.  The page's sight gate
 *    needs nothing new (TRAPS §236): it never looses past the arrow's
 *    flight (projectiles.js plants it at BOW_RANGE_PX x Range), and this
 *    bound is that flight plus its slack.
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
  LOST_BURST: 3,   /* v2.3.5901: claims with no arrow seen (a relay lost) in hand... */
  LOST_MS: 3000,   /* ...and one back this often */
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
    return ps._bs || (ps._bs = { tokens: BOW_SHOT.BURST, t: 0, q: [], lost: BOW_SHOT.LOST_BURST, lostT: 0 });
  },
  /* v2.3.5901: the reach's switch (THE REACH above): on unless `bowreach:
     false`, and only with `bowshot` (it judges bowshot's arrows) */
  _bowReachOn() {
    const f = this._liveFlags;
    return this._bowShotOn() && !(f && typeof f === 'object' && own(f, 'bowreach') && !f.bowreach);
  },
  /* where the archer stands now, as an arrow's origin (the worker's copy) */
  _bowShotOrigin(ps) {
    return (typeof ps.x === 'number' && typeof ps.y === 'number') ? { x: ps.x, y: ps.y } : null;
  },
  /* v2.3.5901: may a claim on monster `m` land on `shot`?  Within the
     arrow's flight of where it left; a shot with no origin (one drawn from
     the allowance, a paid retreat's) or no monster to measure, yes */
  _bowShotReaches(ps, shot, m, reach) {
    if (!shot.o || !m || typeof m.x !== 'number' || typeof m.y !== 'number') return true;
    const dx = shot.o.x - m.x, dy = shot.o.y - m.y;
    return dx * dx + dy * dy <= reach * reach;
  },
  /* v2.3.5901: is there a claim with no arrow seen in its own allowance?
     (refilled here; spent by the caller once the claim lands) */
  _bowShotLostHas(s, now) {
    if (typeof s.lost !== 'number') { s.lost = BOW_SHOT.LOST_BURST; s.lostT = 0; }
    s.lost = Math.min(BOW_SHOT.LOST_BURST, s.lost + (s.lostT ? Math.max(0, now - s.lostT) / BOW_SHOT.LOST_MS : 0));
    s.lostT = now;
    return s.lost >= 1;
  },
  /* the monster a claim names, in the archer's zone (null: not found) */
  _bowShotMonster(ps, id) {
    const list = this.monsters && ps && this.monsters[ps.z];
    if (!Array.isArray(list)) return null;
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
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
    this._bowShotCount(ps, sw, null, now, this._bowReachOn() ? this._bowShotOrigin(ps) : null);
  },
  /* one arrow from the allowance (refilled at the bow's own rate), or null */
  _bowShotCount(ps, sw, key, now, o) {
    const s = this._bowShotState(ps);
    const cyc = this._pfBowCycleMs(ps);
    s.tokens = Math.min(BOW_SHOT.BURST, s.tokens + (s.t ? Math.max(0, now - s.t) / cyc : BOW_SHOT.BURST));
    s.t = now;
    if (s.tokens < 1) return null;
    s.tokens -= 1;
    const shot = { sw, at: now, ids: key ? new Set([key]) : null, o: o || null };   /* v2.3.5901: `o`, where it left (a relay's) */
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
    /* v2.3.5901: THE REACH -- only an arrow whose flight from where it left
       reaches the monster (bowshot's arrows: a relay's) */
    const reachOn = this._bowReachOn();
    const m = reachOn ? this._bowShotMonster(ps, id) : null;
    const reach = reachOn ? this._hitArrowReach(ps) : 0;
    const fits = (x) => !reachOn || this._bowShotReaches(ps, x, m, reach);
    const named = (typeof sw === 'number' && Number.isFinite(sw)) ? live.find((x) => x.sw === sw && fits(x)) : null;
    const shot = named || live.find((x) => !(x.ids && (x.ids.has(key) || x.ids.size >= cap)) && fits(x));
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
      /* v2.3.5901: ...from its own small allowance too, so a script
         sending no relays keeps no reach it lost (THE REACH) */
      if (reachOn && !this._bowShotLostHas(s, now)) return false;
      const drawn = !!this._bowShotCount(ps, null, key, now);
      if (drawn && reachOn) s.lost -= 1;
      return drawn;
    }
    if (!shot.ids) shot.ids = new Set();
    if (shot.ids.has(key) || shot.ids.size >= cap) return false;
    shot.ids.add(key);
    return true;
  },
};
