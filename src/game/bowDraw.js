/* ═══ v2.3.4802: THE BOW'S DRAW -- the rules (tension, stillness, the snap) ═══
 *
 * The owner, 2026-11-11: "Think about the sword swing.  The bow pull back and
 * release."  The approved brief (docs/specs/bow-feel.md):
 *   - thumb down NOCKS the arrow (the bro raises the bow);
 *   - drag BACK (away from where the arrow goes) to DRAW: the bow bends, the
 *     string creaks rising in pitch, a faint aim line grows forward, wide and
 *     loose at first, narrowing as the draw fills;
 *   - FULL DRAW SETTLES: the line goes crisp gold, a quiet click, the walk
 *     slows (the bow wants you planted);
 *   - held too long the ARM TIRES: the line trembles, the sweet spot passes.
 *     The perfect shot is letting go in the moment just after it settles;
 *   - LIFT TO LOOSE: a sharp twang, the arm's recoil, a beat of quiet, the
 *     streak.  A half draw is weaker but quicker (a snipe on the run);
 *   - slide back to the touch point to LET THE STRING DOWN (no shot);
 *   - a computer: hold the left button to draw (the cursor aims), let go to
 *     loose.
 *
 * THE NUMBERS ARE THE WORKER'S (src/game/drawGather.js, the mirror of
 * server/src/drawgather.js): the full draw is fullDrawMs (the flicked bow's
 * cycle, 371 ms on a new character), the perfect window PERFECT_DRAW_MS after
 * it, the share buildShare, the claim bounded by the worker's own clock plus
 * its 100 ms allowance (CLAIM_ALLOW_MS here, the worker's SLACK_MS: the kit's
 * own 150 is the sword's guess, not the worker's).  So the gold line promises
 * exactly the worker's perfect shot, and the bend shows the share it pays.
 *
 * ONE PHASE, ONE TRANSITION FUNCTION (CLAUDE.md §5): `st.phase` is 'idle' |
 * 'nock' | 'drawing', changed only by bowStep(st, ev).  What the player SEES
 * of a draw -- 'draw', 'full' (settled: the perfect window), 'tired' -- is
 * derived from the time by bowView, never stored beside it.
 *
 * No imports but the pure rules (drawGather.js, manualCombat.js), so node
 * tests it (server/test/bow-feel.test.mjs).  The wiring is game/bowFeel.js. */
import { DRAW_GATHER, buildShare, buildWire } from './drawGather.js';
import { MANUAL } from './manualCombat.js';

export var BOW_FEEL = {
  /* the pull that starts a draw: a flick's length (MANUAL.SWIPE_PX), so a
     thumb that only rolls on a tap never draws */
  PULL_PX: MANUAL.SWIPE_PX,
  /* back inside this of the touch point lets the string down: the stick's own
     dead zone (MANUAL.CENTRE_PX) -- the slingshot bow's cancel */
  CENTRE_PX: MANUAL.CENTRE_PX,
  /* MIRROR of the worker's SLACK_MS (server/src/drawgather.js; bow-feel.test
     §1 pins it): a draw is read as at most the time since the last shot plus
     this.  The phone draws the bend and the gold line by it, so they promise
     what the worker will count */
  CLAIM_ALLOW_MS: 100,
  /* a loose no sooner than this after the last shot: the worker lands
     nothing under its MIN_GAP_MS (100), and the 50 between is the network's
     wobble -- the free swing's FREE_GAP_MS, the same reasoning */
  GAP_MS: MANUAL.FREE_GAP_MS,
  /* the arm tires over this long past the sweet spot (the tremble's growth) */
  TIRE_MS: 900,
  /* the walk, drawn: 1 at the nock, (1 - DRAW_SLOW) at a full draw's edge,
     SETTLED_WALK settled and tired ("the bow wants you planted").  Slower
     only: the worker bounds a move from above, never below */
  DRAW_SLOW: 0.2,
  SETTLED_WALK: 0.6,
  /* THE AIM LINE: its reach grows from LINE_MIN of the bow's to all of it at
     a full draw; two faint lines SPREAD apart (radians) at the first pull
     narrow to one at full ("wide and loose at first") */
  LINE_MIN: 0.3,
  SPREAD_MAX: 0.32,
  /* a pose frame of the bow's stand-in (load, pull, release): the pull's from
     this much of a draw */
  POSE_PULL_R: 0.3,
  /* the string's pull behind the grip, px: at the nock and at a full draw */
  NOCK_PX: 3,
  STRING_PX: 14,
  /* a loose waiting for the loop to take it is let go after this */
  LOOSE_HOLD_MS: 600,
};

/** A fresh draw state. */
export function bowState() { return { phase: 'idle', ox: 0, oy: 0, downAt: 0, drawAt: 0, desk: false, loose: null, n: { nock: 0, draw: 0, letdown: 0, cancel: 0, loose: 0 } }; }

/** THE ONE TRANSITION.  `ev` { type, now, x, y }:
 *    'down'      the thumb went down: NOCK                     -> 'nock'
 *    'move'      the thumb moved: past PULL_PX from the touch point a nocked
 *                arrow is DRAWN ('draw'); back inside CENTRE_PX a drawn one
 *                is LET DOWN ('letdown', nocked again)          -> or 'none'
 *    'up'        the thumb lifted: a drawn arrow outside CENTRE_PX is
 *                LOOSED ('loose': st.loose = { drawMs, at }); a nocked one
 *                is put away ('cancel')                         -> or 'none'
 *    'deskdown'  a computer's left button: nocked AND drawing at once (the
 *                cursor aims; there is no pull to make)          -> 'draw'
 *    'deskup'    its release: a drawn arrow is loosed            -> 'loose'
 *    'abort'     the press ended some other way (the shield, a harvest, the
 *                weapon changed, the window lost focus): nothing is shot
 *                                                                -> 'cancel'
 *  Returns what happened. */
export function bowStep(st, ev) {
  if (!st || !ev) return 'none';
  var now = ev.now || 0;
  var t = ev.type;
  if (t === 'down') {
    st.phase = 'nock'; st.ox = ev.x; st.oy = ev.y; st.downAt = now; st.drawAt = 0; st.desk = false;
    st.n.nock++;
    return 'nock';
  }
  if (t === 'deskdown') {
    st.phase = 'drawing'; st.ox = 0; st.oy = 0; st.downAt = now; st.drawAt = now; st.desk = true;
    st.n.nock++; st.n.draw++;
    return 'draw';
  }
  if (t === 'move') {
    if (st.desk || (st.phase !== 'nock' && st.phase !== 'drawing')) return 'none';
    var dx = ev.x - st.ox, dy = ev.y - st.oy, d2 = dx * dx + dy * dy;
    if (st.phase === 'nock' && d2 >= BOW_FEEL.PULL_PX * BOW_FEEL.PULL_PX) {
      st.phase = 'drawing'; st.drawAt = now; st.n.draw++;
      return 'draw';
    }
    if (st.phase === 'drawing' && d2 <= BOW_FEEL.CENTRE_PX * BOW_FEEL.CENTRE_PX) {
      st.phase = 'nock'; st.drawAt = 0; st.n.letdown++;
      return 'letdown';
    }
    return 'none';
  }
  if (t === 'up' || t === 'deskup') {
    var was = st.phase;
    if (was === 'drawing' && (t === 'deskup') === st.desk) {
      var out = true;
      if (t === 'up') {
        var ux = ev.x - st.ox, uy = ev.y - st.oy;
        out = ux * ux + uy * uy > BOW_FEEL.CENTRE_PX * BOW_FEEL.CENTRE_PX;
      }
      st.phase = 'idle';
      if (out) {
        st.loose = { drawMs: Math.max(1, now - st.drawAt), at: now, taken: false };
        st.drawAt = 0; st.n.loose++;
        return 'loose';
      }
      st.drawAt = 0; st.n.cancel++;
      return 'cancel';
    }
    if (was === 'nock' && t === 'up') { st.phase = 'idle'; st.n.cancel++; return 'cancel'; }
    return 'none';
  }
  if (t === 'abort') {
    if (st.phase === 'idle') return 'none';
    st.phase = 'idle'; st.drawAt = 0; st.n.cancel++;
    return 'cancel';
  }
  return 'none';
}

/** THE CLAIM AS THE WORKER READS IT: a draw of `drawMs`, the last shot
 *  `sinceLastMs` ago (Infinity: none yet), bounded by the worker's own clock
 *  plus its allowance -- never below 0. */
export function bowClaimMs(drawMs, sinceLastMs) {
  var c = Number(drawMs);
  if (!isFinite(c) || c <= 0) return 0;
  var s = Number(sinceLastMs);
  if (!isFinite(s)) return c;
  var cap = Math.max(0, s) + BOW_FEEL.CLAIM_ALLOW_MS;
  return c > cap ? cap : c;
}

/** What a draw IS now: null when nothing is nocked, else
 *  { phase: 'nock' | 'draw' | 'full' | 'tired', ms (the raw draw), counted
 *  (as the worker will count it), r (its share, 0..1), perfect (a loose now
 *  is the perfect shot), settleT (0..1 through the sweet spot), tireT (0..1
 *  how tired the arm is) }.  `fullMs` the full draw (fullDrawMs), `lastAt`
 *  the last shot's stamp (0: none). */
export function bowView(st, now, fullMs, lastAt) {
  if (!st || st.phase === 'idle') return null;
  if (st.phase === 'nock') return { phase: 'nock', ms: 0, counted: 0, r: 0, perfect: false, settleT: 0, tireT: 0 };
  var full = fullMs > 0 ? fullMs : MANUAL.NEED_DEFAULT_MS;
  var raw = Math.max(0, now - st.drawAt);
  var counted = bowClaimMs(raw, lastAt > 0 ? now - lastAt : Infinity);
  var r = buildShare(counted, full);
  var perfect = bowPerfect(raw, counted, full);
  var late = raw - full - DRAW_GATHER.PERFECT_DRAW_MS;
  var phase = perfect ? 'full' : (r >= 1 && late > 0) ? 'tired' : 'draw';
  var settleT = perfect ? Math.min(1, (raw - full) / DRAW_GATHER.PERFECT_DRAW_MS) : (phase === 'tired' ? 1 : 0);
  var tireT = phase === 'tired' ? Math.min(1, late / BOW_FEEL.TIRE_MS) : 0;
  return { phase: phase, ms: raw, counted: counted, r: r, perfect: perfect, settleT: settleT, tireT: tireT };
}

/** The worker's perfect draw, as it judges it (drawgather.js _dgShot): the
 *  COUNTED draw reached full, and the phone's own measure is inside the
 *  window after it. */
export function bowPerfect(rawMs, countedMs, fullMs) {
  return fullMs > 0 && countedMs >= fullMs && rawMs <= fullMs + DRAW_GATHER.PERFECT_DRAW_MS;
}

/** The `dr` a loose sends: whole ms, the raw draw (the worker bounds it). */
export function bowWire(drawMs) { return buildWire(drawMs); }

/** The walk's multiplier for a draw's view (1 with none). */
export function bowWalkMult(v) {
  if (!v || v.phase === 'nock') return 1;
  if (v.phase === 'full' || v.phase === 'tired') return BOW_FEEL.SETTLED_WALK;
  return 1 - BOW_FEEL.DRAW_SLOW * Math.max(0, Math.min(1, v.r));
}

/** The aim line's look for a draw's view: { len (of the bow's reach, 0..1),
 *  spread (radians between the two loose lines; 0 one line), thick (px),
 *  alpha, gold (0..1 how gold), tremble (px, the tired arm) } -- or null. */
export function bowLineLook(v) {
  if (!v || v.phase === 'nock') return null;
  var r = Math.max(0, Math.min(1, v.r));
  if (v.phase === 'full') return { len: 1, spread: 0, thick: 2.5, alpha: 0.9, gold: 1, tremble: 0 };
  if (v.phase === 'tired') {
    var k = v.tireT;
    return { len: 1, spread: 0.05 * k, thick: 2.5 + 1.5 * k, alpha: 0.85 - 0.35 * k, gold: 1 - 0.8 * k, tremble: 1 + 5 * k };
  }
  return { len: BOW_FEEL.LINE_MIN + (1 - BOW_FEEL.LINE_MIN) * r, spread: BOW_FEEL.SPREAD_MAX * (1 - r) + 0.02, thick: 6 - 3 * r, alpha: 0.16 + 0.34 * r, gold: 0, tremble: 0 };
}

/** The bend of the bow (the string's pull behind the grip, px) for a view. */
export function bowStringPx(v) {
  if (!v) return 0;
  if (v.phase === 'nock') return BOW_FEEL.NOCK_PX;
  return BOW_FEEL.NOCK_PX + (BOW_FEEL.STRING_PX - BOW_FEEL.NOCK_PX) * Math.max(0, Math.min(1, v.r));
}

/** The stand-in's frame to hold (0 the bow raised, 1 drawn) for a view, or
 *  -1 for none. */
export function bowPoseFrame(v) {
  if (!v) return -1;
  return (v.phase === 'nock' || v.r < BOW_FEEL.POSE_PULL_R) ? 0 : 1;
}
