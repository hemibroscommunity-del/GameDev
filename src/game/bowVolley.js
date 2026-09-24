/* ═══ v2.3.2848: THE BOW SPECIAL IS A VOLLEY OF THREE ═══
 *
 * Owner: "the bow special should be 3 white hot arrows that follow each other
 * closely.  One shot for all 3 arrows.  I think the archetype for bow will be
 * speed and DPS as opposed to staff which is area damage and high damage
 * variance."  Asked how hard each should hit: "a third each" -- the three
 * together deal what the one arrow did.  Asked what happens after: "Burn, but
 * no blast" -- they stick and burn the monster you shot, and the area
 * send-off (arrowblast.js) is gone, because area belongs to the staff.
 *
 * playerActions fires the volley (behind caps.bowvolley -- an old worker would
 * roll every arrow at full strength), projectiles flies and settles it, and
 * effectsRenderer draws its embers.  They share the rules below, and this file
 * imports nothing, so any of them can read it.
 *
 * ONE TRAIN.  The arrows leave on a stagger sized in PIXELS, not
 * milliseconds: GAP_PX tip to tip, whatever the Longshot stat has done to
 * their speed.  The lead arrow's line -- origin and angle, stamped at its
 * release -- is the line the other two fly, so they follow it rather than
 * aiming afresh from wherever the player has walked to in the 100 ms since.
 *
 * WHAT THE VOLLEY SHARES, and why each lives on one object:
 *   - THE BURN.  The one arrow burned what it stuck in every 500 ms for 4 s
 *     (v2.3.2849: a volley burns for BURN_MS, 2.5 s -- see below).
 *     Three burning would triple it -- and the worker would drop two ticks in
 *     three anyway: they are ordinary hits, and its normal lane admits one
 *     per 210 ms per monster.  So one arrow carries the volley's burn: the
 *     first to come to rest (stuck in a monster, or planted in the ground),
 *     on a clock that starts then.  If the monster it is in dies, a sibling
 *     still resting in something takes over for the time that is left; the
 *     4 s and the 500 ms cadence are the volley's, not the arrow's, so a
 *     hand-over never buys an extra tick.  All three burn out together at
 *     the end of it.
 *   - THE SHOVE.  A special hit shoves its monster 60 px (combat.js); three
 *     would throw it 180, three times what the special did.  The first arrow
 *     of the volley to hit a monster shoves it and the rest send noKb, the
 *     flag the burn ticks already use (v2.3.1435).
 */

export const BOW_VOLLEY = {
  N: 3,
  /* ═══ v2.3.2849: THE REBALANCE -- MORE OF IT IN THE HIT ═══
     Owner: "the specials probably need rebalanced".  The burn was doing about
     twice what the three arrows did (a fresh character: ~71 against ~30), so
     the hit that looks like the special felt light.  Half the burn moved
     into the arrows, the total unchanged (~100):
       WORTH    the volley lands this many plain specials, WORTH / N an arrow
                -- two-thirds each (was a third).  MIRROR of the worker's
                BOW_VOLLEY_WORTH (server/src/combat.js), which is what the
                damage is: this is only the local prediction (client-only
                zones, a duel's dmgBase).
       BURN_MS  how long a volley's arrows burn once they are in -- 2.5 s,
                four 500 ms ticks (was 4 s, seven).  A lone arrow -- the one
                an old worker gets -- keeps its 4 s (burnLifeMs). */
  WORTH: 2,
  BURN_MS: 2500,
  /* Tip to tip, world px: one white-hot arrow (hotArrowFx HOT_LEN, 62.8) and
     a gap of about a quarter of its length.  At the bow's 24 px a frame that
     is ~56 ms between arrows.
     v2.3.2881: 80 -> 200.  Owner: "Arrow special is too fast can't discern 3
     arrows."  A 17 px gap between 63 px arrows read as one long streak.  Now
     each arrow has more than two of its own lengths of clear air behind it,
     ~200 ms apart at SPEED_K.  Ceiling 240: a peer's copy waits
     2 x GAP_PX / PEER_PX_PER_FRAME frames at the bow, and visualSystems caps
     that hold at 60. */
  GAP_PX: 200,
  /* v2.3.2881: the volley flies at this fraction of the bow's own speed
     (Longshot and depth still scale it) -- 24 -> ~17 px a frame, so the eye
     can follow three arrows instead of one blur.  Set on each arrow as
     `speedPx` (playerActions), the per-projectile override projectiles.js
     already honours.  A plain arrow and the peer's copy are untouched. */
  SPEED_K: 0.7,
  /* MIRROR-PINNED: a PEER's copy of an arrow flies at 8 px a frame
     (visualSystems.js, remote projectile simulation), a third of the real
     speed.  Their stagger is sized from this so the gap on their screen is
     the gap on yours. */
  PEER_PX_PER_FRAME: 8,
  /* Where a volley that missed stands in the ground: shorter by `along` and
     beside the line by `side`, world px, per arrow.  Three arrows planting on
     one point would draw as one. */
  PLANT_SPREAD: [{ along: 0, side: 0 }, { along: -9, side: 7 }, { along: -18, side: -6 }],
};

const FRAME_MS = 1000 / 60;

/** How long arrow `i` of a volley waits at the bow so the train is GAP_PX
 *  apart, for arrows flying `pxPerFrame` per 60 fps frame. */
export function volleyDelayMs(i, pxPerFrame) {
  if (!(i > 0) || !(pxPerFrame > 0)) return 0;
  return i * BOW_VOLLEY.GAP_PX * FRAME_MS / pxPerFrame;
}

/** The object the three arrows of one volley share. */
export function newVolley() {
  return { n: BOW_VOLLEY.N, path: null, burn: null, burnAt: 0, _lingerNext: null, kb: new Set() };
}

/** v2.3.2849: how long a resting bow special lives and burns: a volley's
 *  BURN_MS, or the lone arrow's 4 s it always had (an old worker's special,
 *  which is also the one that still ends in the blast). */
export const LONE_BURN_MS = 4000;
export function burnLifeMs(a) {
  return (a && a.volley) ? BOW_VOLLEY.BURN_MS : LONE_BURN_MS;
}

/** When a resting arrow's burn and life count from: the volley's first
 *  arrival, or a lone arrow's own stuckAt / plantedAt. */
export function burnT0(a) {
  if (!a) return 0;
  if (a.volley && a.volley.burnAt) return a.volley.burnAt;
  return (a.stuckIn ? a.stuckAt : a.plantedAt) || 0;
}

/** An arrow has come to rest -- stuck in a monster or planted.  The first of
 *  a volley starts its burn clock. */
export function volleyRested(a, now) {
  const v = a && a.volley;
  if (v && !v.burnAt) v.burnAt = now;
}

/** Does this resting arrow carry the burn this frame?  A lone arrow always
 *  does.  In a volley the first to ask takes it, and if that arrow is gone
 *  (`_spent`: its monster died) the next resting sibling that asks does. */
export function volleyBurns(a) {
  const v = a && a.volley;
  if (!v) return true;
  if (!v.burn || v.burn._spent) v.burn = a;
  return v.burn === a;
}

/** Does this hit shove the monster?  The first of a volley's arrows to hit
 *  it does; a lone arrow always does. */
export function volleyShoves(a, monsterId) {
  const v = a && a.volley;
  if (!v) return true;
  if (v.kb.has(monsterId)) return false;
  v.kb.add(monsterId);
  return true;
}
