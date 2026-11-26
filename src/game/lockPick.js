/* ═══ v2.3.6820: THE LOCK TAKES THE NEAREST, AND THE STICK CHOOSES BETWEEN CLOSE ONES (card LOCK) ═══
 *
 * The owner (the only player, an iPhone, the usual touch controls),
 * 2026-11-26: "I'm often running into an issue where it will lock on the
 * wrong target.  I think it should go towards the nearest enemy or at least
 * let you switch to nearest enemy."
 *
 * THE PICK of the sword's automatic lock (mode 4, the game's own controls),
 * moved here out of targeting.js updateTargeting whole: that function finds
 * the candidates, the held lock and the stick, and asks `lockPick` who wears
 * the lock this frame.  Three rules, in this order:
 *
 *   1. THE STICK CHOOSES BETWEEN CLOSE ONES.  When the candidates nearest to
 *      the body are within TIE of each other (distance, not distance
 *      squared: the second is within 25% of the FIRST's) and the stick is
 *      pushed past PUSH_MIN, the one nearest the push's direction takes the
 *      lock at once (the player asked: no dwell).  The stick and the
 *      positions are both world space, y down: the stick's (x, y) is the
 *      walk's own (stickZones.js stickFrame), so the push is compared with
 *      the bearing (m - player) with no flip.  It never picks outside the
 *      ring (the candidates are the ring's), nor one more than TIE farther
 *      than the nearest, nor one BEHIND the push (PUSH_FRONT).  The choice
 *      lasts while the stick is pushed: the thumb lifted, rules 2 and 3 judge
 *      again (in mode 4 the walk IS the push, so a pick kept after it would
 *      keep every walk's accidental choice: the census measured the lock off
 *      the nearest 14.3% of fight frames with a keep, 8.3% without; today's
 *      rule 10.8%).  Walking toward the one you chose brings it nearer, so it
 *      is usually the nearest by the time you stop.
 *   2. NEAR MEANS NEAR.  Inside the sword's reach (`inReach`: the swing's own
 *      sum plus the lunge, reachHas below), the nearest ALWAYS has the lock:
 *      no 12% step.  The flip-flop the step was made for (two monsters at
 *      near-equal distance, each flip moving the reticle, the facing, the
 *      shield and the next swing) is answered by TIME: a rival takes the lock
 *      only once it has been the nearest for DWELL_MS without a break, on the
 *      clock (ms, never frames: this box draws a few a second, a phone 60 or
 *      120).  A held lock that is itself OUTSIDE reach gives way to a
 *      candidate inside reach at once: that is no flip-flop between equals.
 *   3. OUTSIDE REACH the old step stays: a rival takes the lock only when it
 *      is FAR_STEP (12%) nearer than the held one.
 *
 * With no lock held, the nearest is taken at once (today's).
 *
 * `?locknear=0` (`near: false`) is today's rule whole: the 12% step at every
 * distance, no dwell, no push (v2.3.2251's "always the nearest" with the
 * AUTO_SWITCH_MARGIN of targeting.js).
 *
 * PURE: no imports, no clock read, no page.  The caller hands the clock
 * (`now`, ms) and the memory (`mem`, carried on S between frames: the rival
 * and since when); the answer is written into `out`
 * (one object a caller, so a frame makes no garbage).  The spec is
 * docs/specs/lock-pick.md; the suite tools/guards/lock-pick.test.mjs; the
 * census of how often the lock is off the nearest tools/qa/lock-census.mjs.
 */

export const LOCK_PICK = Object.freeze({
  /* rule 2: how long a rival must be the nearest, both inside reach, before
     it takes the lock (the card's start; ms on the caller's clock) */
  DWELL_MS: 120,
  /* rule 3: outside reach a rival must be this share of the held one's
     distance or nearer (0.88: 12% nearer; targeting.js's AUTO_SWITCH_MARGIN) */
  FAR_STEP: 0.88,
  /* rule 1: a candidate is a near-tie when its distance is at most this
     times the nearest's (1.25: within 25% of the nearest) */
  TIE: 1.25,
  /* rule 1: the push counts past this share of the stick's travel.  The
     stick's own 12 px dead zone already writes 0 inside it (stickAnalog),
     and upright its travel past the dead zone is only 5.5 px, so 0.2 is about
     a pixel past the dead zone's edge: a thumb resting on the line is not a
     choice. */
  PUSH_MIN: 0.2,
  /* rule 1: and only a candidate IN FRONT of the push: its bearing within
     this cosine of the push's direction (0: within 90 degrees).  The census
     (tools/qa/lock-census.mjs) found the push without it harmful: in mode 4
     the walk IS the push, so a player walking away from a chasing pack had
     the lock turned by the walk among monsters all behind them (85% of the
     stick's choices while pushed), not by nearness: the owner's "wrong
     target" again.  A push points at what it chooses, or chooses nothing. */
  PUSH_FRONT: 0,
  /* the reach: the lunge's dash, which the lock feeds (dodge.js: a dodge
     toward the lock is a lunge), LUNGE_DASH_FRAMES 8 x LUNGE_DASH_PX_PER_FRAME
     6 (gameSystems.js; the suite holds the two equal) */
  LUNGE_PX: 48,
});

/* rule 2's test: is a body inside the sword's reach?  The swing's own sum
   (monsterCombat's hit test, the reach ring and the reticle's
   nearestInMeleeReach: `swordPx` = GS_OUTER_RADIUS x meleeRangeMult, plus
   the monster's hit radius x its size, measured to its BODY CENTRE, `bodyUp`
   px above its feet) plus the lunge. */
export function reachHas(px, py, fx, fy, bodyUp, swordPx, hitR) {
  const dx = fx - px, dy = (fy - bodyUp) - py;
  const r = swordPx + hitR + LOCK_PICK.LUNGE_PX;
  return dx * dx + dy * dy <= r * r;
}

/* one key a candidate: a monster's id, a clone's or a foe's (the ids are
   numbers in some spawn paths and strings over the wire: targeting.js) */
function same(a, b) { return a != null && b != null && String(a) === String(b); }

/**
 * c = {
 *   cands: [{ key, d2, x, y, inReach }]  inside the ring, nearest first
 *   held:  { key, d2, inReach } | null   the automatic lock now, only when it
 *                                        still holds (alive, inside the
 *                                        hysteresis ring)
 *   push:  { x, y } | null               the stick (world space, y down)
 *   px, py                               the player
 *   now                                  ms
 *   mem:   { rival, since }              carried between frames by the caller
 *   near:  boolean                       false: `?locknear=0`, today's rule
 * }
 * out <- { take, why }: `take` the candidate that wears the lock (null: keep
 * the held one, or nothing when nothing is held and there are no candidates),
 * `why` one word (the census and the QA probe read it).
 */
export function lockPick(c, out) {
  out = out || {};
  out.take = null;
  out.why = 'none';
  const cands = c.cands || [], held = c.held || null, mem = c.mem || {};
  if (!cands.length) { mem.rival = null; out.why = held ? 'held' : 'none'; return out; }
  const best = cands[0];

  if (c.near === false) {
    /* today's rule (v2.3.2251 + AUTO_SWITCH_MARGIN): the 12% step everywhere */
    mem.rival = null;
    if (held && (same(held.key, best.key) || best.d2 > held.d2 * LOCK_PICK.FAR_STEP * LOCK_PICK.FAR_STEP)) {
      out.why = 'held';
      return out;
    }
    out.take = best;
    out.why = 'nearest';
    return out;
  }

  const bestD = Math.sqrt(best.d2);
  const tieD = bestD * LOCK_PICK.TIE;

  /* 1. the stick chooses between close ones */
  const push = c.push;
  const pl = push ? Math.sqrt(push.x * push.x + push.y * push.y) : 0;
  let pick = null, pickCos = -2;
  if (pl > LOCK_PICK.PUSH_MIN && cands.length > 1 && Math.sqrt(cands[1].d2) <= tieD) {
    for (let i = 0; i < cands.length; i++) {
      const q = cands[i];
      if (Math.sqrt(q.d2) > tieD) break;            /* nearest first: the band ends here */
      const bx = q.x - c.px, by = q.y - c.py;
      const bl = Math.sqrt(bx * bx + by * by);
      const cos = bl > 0 ? (bx * push.x + by * push.y) / (bl * pl) : 1;
      if (cos > LOCK_PICK.PUSH_FRONT && cos > pickCos) { pickCos = cos; pick = q; }
    }
  }
  if (pick) {
    mem.rival = null;
    if (held && same(held.key, pick.key)) { out.why = 'push'; return out; }
    out.take = pick;
    out.why = 'push';
    return out;
  }

  /* nothing held: the nearest, at once */
  if (!held) { mem.rival = null; out.take = best; out.why = 'nearest'; return out; }
  if (same(held.key, best.key)) { mem.rival = null; out.why = 'nearest'; return out; }

  /* 2. near means near */
  if (best.inReach) {
    if (!held.inReach) { mem.rival = null; out.take = best; out.why = 'reach'; return out; }
    if (!same(mem.rival, best.key)) { mem.rival = best.key; mem.since = c.now; out.why = 'dwell'; return out; }
    if (c.now - mem.since >= LOCK_PICK.DWELL_MS) { mem.rival = null; out.take = best; out.why = 'dwell'; return out; }
    out.why = 'dwell';
    return out;
  }

  /* 3. outside reach, the step */
  mem.rival = null;
  if (bestD <= Math.sqrt(held.d2) * LOCK_PICK.FAR_STEP) { out.take = best; out.why = 'step'; return out; }
  out.why = 'held';
  return out;
}
