/* ═══ v2.3.4800: THE WEAPON FEEL KIT -- the rules (build, then release) ═══
 *
 * The owner, 2026-11-11: "Instead of just copying what other games do I want
 * to think about the 'feel' of the combat.  Think about the sword swing.  The
 * bow pull back and release.  The staff building power and blasting the
 * orb."  Then, approving the design: "Yes remove the timing bar.  It needs
 * to be something else entirely, and yes but build all of them (sword, bow,
 * magic)."
 *
 * Every attack has four beats: TOUCH (the weapon answers the thumb at once,
 * on the phone), BUILD (tension seen and heard ON THE WEAPON, never a gauge),
 * RELEASE (what happens matches what was built), CONTACT (the payoff scales
 * with strength).  This file is the RULES every weapon shares; no imports but
 * the manual-combat rules (which import nothing), so node tests it
 * (server/test/weapon-feel.test.mjs).  The pieces beside it:
 *
 *   src/game/weaponFeel.js                  THIS: numbers and rules, pure
 *   src/game/swordFeel.js                   the sword's use of them
 *   src/rendering/systems/weaponFeelFx.js   the pictures (a world layer of
 *                                           its own: 'weaponFeel')
 *   src/data/weaponFeelSound.js             the sounds (synthesised, no files;
 *                                           BT_AUDIO.feelSound plays them)
 *   docs/specs/sword-feel.md                "For the bow and staff": this API
 *
 * ── THE API (for the bow and staff lanes) ──────────────────────────────────
 *
 *   FEEL                                the numbers (below)
 *   feelReadiness(prevAt, cycleMs, now) 0..1: how far the weapon has refilled
 *                                       since its last attack (1 when there
 *                                       was none).  The sword's blade
 *                                       brightness, a bow's bend, an orb's size.
 *   feelPhase(prevAt, cycleMs, now)     'fill' | 'glint' | 'rest': 'glint' is
 *                                       exactly the worker's perfect-strike
 *                                       window (PERFECT_EARLY_MS before a full
 *                                       cycle to PERFECT_LATE_MS after it);
 *                                       'rest' is full and past it (or never
 *                                       attacked).  A staff has no window
 *                                       (the owner): it ignores 'glint'.
 *   feelGlintT(prevAt, cycleMs, now)    0..1 how far the glint's streak has run
 *                                       down the edge (GLINT_RUN_MS), -1
 *                                       outside the window.
 *   feelPerfect(prevAt, cycleMs, now)   the phone's guess of the worker's
 *                                       verdict (the worker's `pf` is the
 *                                       truth; this drives the instant look).
 *   feelShare(heldMs, fullMs)           0..1: a build's share of a full one
 *                                       (the free-swing rule: damage is the
 *                                       share, so damage a second never moves).
 *   feelStage(r, n)                     0..n: which build stage r reaches
 *                                       (the staff: spark, orb, sphere = 1..3).
 *   feelStageCrossed(prevR, r, n)       the stage just reached, or -1.
 *   feelStrength(share, perfect)        the CONTACT's size: { tier: 'light' |
 *                                       'full' | 'perfect', k, spark, debris,
 *                                       knock, push, shake, vol }.
 *   feelBuildRate(r)                    the rising build tone's playback rate,
 *                                       1 (empty) to 2 (full: an octave up).
 *   feelClaimMs(claimMs, sinceLastMs, allowMs)
 *                                       THE BOUNDED CLAIM: a phone's build time
 *                                       (a bow's draw, a staff's gather) as
 *                                       the worker must read it -- never more
 *                                       than the time since that player's
 *                                       previous attack on the worker's clock
 *                                       plus a small allowance, never below 0.
 *                                       A slow line is not punished (the claim
 *                                       stands); a forged one gains nothing.
 *                                       The worker keeps its own copy (a
 *                                       MIRROR, pinned by a test, the
 *                                       FULL_SWING_SHARE way).
 *   feelArc(stroke, aimAng)             a swipe's cut: { dir: +1 clockwise on
 *                                       screen / -1, hand: 'fore' | 'back',
 *                                       kind: 'flick' | 'sweep', width (rad),
 *                                       travel (px), ms }.  stroke null (a
 *                                       computer's click): from the aim's side.
 *   feelArcGrow(arc, travelPx)          the thumb kept going: a wider arc.
 *   feelDim(r)                          a weapon's brightness for readiness r
 *                                       (DIM right after an attack, 1 full).
 *   feelTint(rgb, k)                    a 0xRRGGBB tint times k.
 *   pushFeelFx(S, ev)                   queue an effect for the renderer
 *                                       (S._feelFx, capped): { kind: 'arc' |
 *                                       'burst' | 'pulse' | 'streak', x, y,
 *                                       ang, k, color, at, ... } -- see
 *                                       weaponFeelFx.js for each kind's fields.
 *   feelSwitch(name, key, search, store) one device's off-ramp: `?<name>=0`
 *                                       off and remembered, `?<name>=1` back.
 *   swordFeelWanted()                   `?swordfeel=0` (bt_swordfeel).  The
 *                                       bow: feelSwitch('bowfeel', ...), the
 *                                       staff: feelSwitch('stafffeel', ...).
 *
 * NOTHING HERE CHANGES DAMAGE.  The worker rolls every hit (CLAUDE.md §5); the
 * sword's share and perfect strike are server/src/freeswing.js, unchanged.
 */
import { MANUAL } from './manualCombat.js';

export const FEEL = {
  /* MIRRORS of the perfect strike's window (manualCombat.js MANUAL, itself a
     mirror of server/src/freeswing.js FREE_SWING): the glint IS the window */
  PERFECT_EARLY_MS: MANUAL.PERFECT_EARLY_MS,
  PERFECT_LATE_MS: MANUAL.PERFECT_LATE_MS,
  /* a swing at or over this share is a full one (the worker's shove, the
     gem's status: FULL_SWING_SHARE); under it a light cut */
  FULL_SHARE: MANUAL.FULL_SWING_SHARE,
  /* the perfect strike's bonus, for the look only (the worker's
     FULL_SWING_BONUS is the damage) */
  PERFECT_K: 1.12,
  /* the glint's streak runs from the grip to the point in this long, then the
     edge stays lit to the end of the window */
  GLINT_RUN_MS: 220,
  /* a weapon right after an attack is this bright (its tint times this),
     brightening to 1 over its cycle: "dull right after a swing" */
  DIM: 0.5,
  /* THE CUT'S ARC: a swipe is a FLICK under FLICK_PX of travel (a quick cut,
     a narrow arc), a SWEEP over it; the arc widens from ARC_MIN to ARC_MAX
     (radians) between the first stroke (MANUAL.SWIPE_PX) and SWEEP_PX */
  FLICK_PX: 60,
  SWEEP_PX: 140,
  ARC_MIN: 1.0,
  ARC_MAX: 2.5,
  /* a stroke whose turn about the bro is under this share of its length
     went straight at (or away from) the aim: its side is its left-right */
  SIDE_SHARE: 0.25,
  /* the trail's run: a flick is quick, a sweep the swing's full time
     (entityRenderer SWORD_SWING_MS, 300) */
  FLICK_MS: 170,
  SWEEP_MS: 300,
  /* THE BOUNDED CLAIM's allowance: a phone's build may claim this much more
     than the worker's own time since the last attack (the network's wobble
     between two messages; the free swing's 50 ms, with room) */
  CLAIM_ALLOW_MS: 150,
  /* the build stages (the staff: spark -> orb -> sphere) */
  STAGES: 3,
  /* effects waiting for the renderer, at most */
  FX_CAP: 24,
};

/** 0..1: how far the weapon has refilled since its last attack at `prevAt`,
 *  over `cycleMs`.  1 when it never attacked. */
export function feelReadiness(prevAt, cycleMs, now) {
  if (!(prevAt > 0)) return 1;
  var c = Math.max(1, cycleMs || MANUAL.NEED_DEFAULT_MS);
  var r = (now - prevAt) / c;
  return r <= 0 ? 0 : r >= 1 ? 1 : r;
}

/** 'fill' (refilling), 'glint' (the perfect window), 'rest' (full, past it --
 *  or never attacked). */
export function feelPhase(prevAt, cycleMs, now) {
  if (!(prevAt > 0)) return 'rest';
  var c = Math.max(1, cycleMs || MANUAL.NEED_DEFAULT_MS);
  var el = now - prevAt;
  if (el < c - FEEL.PERFECT_EARLY_MS) return 'fill';
  if (el <= c + FEEL.PERFECT_LATE_MS) return 'glint';
  return 'rest';
}

/** How far the glint's streak has run down the edge, 0..1; -1 outside the
 *  window. */
export function feelGlintT(prevAt, cycleMs, now) {
  if (feelPhase(prevAt, cycleMs, now) !== 'glint') return -1;
  var c = Math.max(1, cycleMs || MANUAL.NEED_DEFAULT_MS);
  var t = (now - prevAt - (c - FEEL.PERFECT_EARLY_MS)) / FEEL.GLINT_RUN_MS;
  return t <= 0 ? 0 : t >= 1 ? 1 : t;
}

/** The phone's guess: is an attack now a perfect strike?  (The worker judges;
 *  its `pf: 1` on the hit is the truth.) */
export function feelPerfect(prevAt, cycleMs, now) { return feelPhase(prevAt, cycleMs, now) === 'glint'; }

/** A build's share of a full one, 0..1 (the free swing's rule). */
export function feelShare(heldMs, fullMs) {
  if (!(heldMs > 0)) return 0;
  var f = Math.max(1, fullMs || MANUAL.NEED_DEFAULT_MS);
  return heldMs >= f ? 1 : heldMs / f;
}

/** Which of `n` build stages readiness `r` has reached: 0 (none yet) to n
 *  (full).  The staff's spark, orb and sphere are 1, 2 and 3. */
export function feelStage(r, n) {
  var k = n > 0 ? n : FEEL.STAGES;
  if (!(r > 0)) return 0;
  if (r >= 1) return k;
  return Math.floor(r * k);
}
/** The stage just reached going from `prevR` to `r` (a pulse and a deeper
 *  note land on it), or -1. */
export function feelStageCrossed(prevR, r, n) {
  var a = feelStage(prevR, n), b = feelStage(r, n);
  return b > a ? b : -1;
}

/** THE CONTACT'S SIZE.  `share` the attack's share of a full one, `perfect`
 *  whether it was struck in the glint.  A quick cut is a light tick and a
 *  small spark; a full cut a thud and the debris; a perfect one a heavy thud,
 *  a bigger burst, knock-back and a push of the camera. */
export function feelStrength(share, perfect) {
  var s = share > 0 ? (share >= 1 ? 1 : share) : 0;
  var tier = perfect ? 'perfect' : (s >= FEEL.FULL_SHARE ? 'full' : 'light');
  return {
    tier: tier,
    k: s * (perfect ? FEEL.PERFECT_K : 1),
    /* the spark's size, 0.45 (a flick) to 1 (full), 1.3 perfect */
    spark: 0.45 + 0.55 * s + (perfect ? 0.3 : 0),
    /* the material's debris: a full or perfect cut only */
    debris: tier !== 'light',
    /* the monster's knock-back look, times today's (6 / 7 / 10 px) */
    knock: tier === 'light' ? 0.35 : tier === 'full' ? 1 : 1.4,
    /* the camera's push in the attack's direction, px */
    push: tier === 'light' ? 0 : tier === 'full' ? 4 : 8,
    /* the screen shake (today's 3, a crit's 6) */
    shake: tier === 'light' ? 1 : tier === 'full' ? 3 : 5,
    /* the contact sound's level, 0.35 to 1 */
    vol: 0.35 + 0.65 * s,
  };
}

/** The rising build tone's playback rate: 1 empty, 2 full (an octave). */
export function feelBuildRate(r) { var x = r > 0 ? (r >= 1 ? 1 : r) : 0; return 1 + x; }

/** THE BOUNDED CLAIM.  A phone says how long it built (`claimMs`: a bow's
 *  draw, a staff's gather); the worker reads at most the time since that
 *  player's previous attack on its OWN clock (`sinceLastMs`) plus `allowMs`
 *  (FEEL.CLAIM_ALLOW_MS), and never less than 0.  So a slow connection is not
 *  punished (an honest claim is under the bound) and a forged claim gains
 *  nothing (it cannot outrun the worker's clock).  The caller then caps it at
 *  the full build (feelShare). */
export function feelClaimMs(claimMs, sinceLastMs, allowMs) {
  var c = Number(claimMs);
  if (!isFinite(c) || c <= 0) return 0;
  var a = (allowMs == null || !isFinite(allowMs)) ? FEEL.CLAIM_ALLOW_MS : Math.max(0, allowMs);
  var since = Number(sinceLastMs);
  if (!isFinite(since)) return c;   /* no attack before: only the full build caps it */
  var cap = Math.max(0, since) + a;
  return c > cap ? cap : c;
}

function arcWidth(travel) {
  var t = (travel - MANUAL.SWIPE_PX) / Math.max(1, FEEL.SWEEP_PX - MANUAL.SWIPE_PX);
  t = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return FEEL.ARC_MIN + (FEEL.ARC_MAX - FEEL.ARC_MIN) * t;
}

/** A swipe's CUT.  `stroke` { dx, dy, ms } (manualCombat.js mcSwipeMove's),
 *  `aimAng` the way the blade goes (the swing's angle: toward the nearest
 *  monster, or the cursor).  The arc turns the way the thumb went round the
 *  bro: `dir` +1 clockwise on screen, -1 the other way, so the blade's point
 *  moves across the screen the way the thumb moved.  A thumb that went
 *  straight at (or away from) the aim turns by its left-right instead.
 *  `hand`: left-to-right a forehand, right-to-left a backhand (the owner's
 *  words).  stroke null (a computer's click): the arc from the aim's side --
 *  a cut to the right is a forehand.  Not a combo: nothing multiplies. */
export function feelArc(stroke, aimAng) {
  var a = typeof aimAng === 'number' && isFinite(aimAng) ? aimAng : 0;
  if (!stroke || !(isFinite(stroke.dx) && isFinite(stroke.dy))) {
    var right = Math.cos(a) >= 0;
    return { dir: right ? 1 : -1, hand: right ? 'fore' : 'back', kind: 'sweep', width: (FEEL.ARC_MIN + FEEL.ARC_MAX) / 2, travel: 0, ms: FEEL.SWEEP_MS, click: true };
  }
  var dx = stroke.dx, dy = stroke.dy;
  var len = Math.sqrt(dx * dx + dy * dy);
  /* the stroke's turn about the bro, seen from the aim: + is clockwise on
     screen (y grows down) */
  var cross = Math.cos(a) * dy - Math.sin(a) * dx;
  var dir = Math.abs(cross) >= FEEL.SIDE_SHARE * len ? (cross > 0 ? 1 : -1) : (dx >= 0 ? 1 : -1);
  var arc = { dir: dir, hand: dx >= 0 ? 'fore' : 'back', kind: 'flick', width: FEEL.ARC_MIN, travel: 0, ms: FEEL.FLICK_MS, click: false };
  return feelArcGrow(arc, len);
}

/** The thumb kept going (`travelPx` from where the stroke began): the arc
 *  widens, and past FLICK_PX it is a sweep.  Never narrows. */
export function feelArcGrow(arc, travelPx) {
  if (!arc || !(travelPx > arc.travel)) return arc;
  arc.travel = travelPx;
  arc.width = arcWidth(travelPx);
  if (travelPx >= FEEL.FLICK_PX) { arc.kind = 'sweep'; arc.ms = FEEL.SWEEP_MS; }
  return arc;
}

/** A weapon's brightness for readiness `r`: FEEL.DIM right after an attack,
 *  1 when full. */
export function feelDim(r) { var x = r > 0 ? (r >= 1 ? 1 : r) : 0; return FEEL.DIM + (1 - FEEL.DIM) * x; }

/** A 0xRRGGBB tint times `k` (0..1), each channel. */
export function feelTint(rgb, k) {
  var c = (typeof rgb === 'number' && isFinite(rgb)) ? rgb : 0xffffff;
  var m = k > 0 ? (k >= 1 ? 1 : k) : 0;
  var r = Math.round(((c >> 16) & 255) * m), g = Math.round(((c >> 8) & 255) * m), b = Math.round((c & 255) * m);
  return (r << 16) | (g << 8) | b;
}

/** Queue an effect for the renderer (weaponFeelFx.js drains S._feelFx each
 *  frame).  At most FEEL.FX_CAP wait: the oldest is let go. */
export function pushFeelFx(S, ev) {
  if (!S || !ev) return;
  if (!S._feelFx) S._feelFx = [];
  if (S._feelFx.length >= FEEL.FX_CAP) S._feelFx.shift();
  S._feelFx.push(ev);
}

/** One device's off-ramp: `?<name>=0` turns it off and is remembered under
 *  `key` ('0'), `?<name>=1` forgets; on otherwise (CLAUDE.md: a trial the
 *  owner likes is everyone's default, with its switch).  `search` and
 *  `store` are for tests. */
export function feelSwitch(name, key, search, store) {
  var q = search;
  if (q == null) { try { q = typeof location !== 'undefined' ? location.search : ''; } catch (e) { q = ''; } }
  var ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  var m = new RegExp('(?:^|[?&])' + name + '=([01])(?:&|$)').exec(String(q || ''));
  if (m) {
    try { if (ls) { if (m[1] === '0') ls.setItem(key, '0'); else ls.removeItem(key); } } catch (e) { /* the address still decides this visit */ }
    return m[1] === '1';
  }
  try { return !(ls && ls.getItem(key) === '0'); } catch (e) { return true; }
}
export var SWORD_FEEL_KEY = 'bt_swordfeel';
/** The sword's feel on this device?  `?swordfeel=0` brings back the look
 *  before it (no dimming, no glint, no arc, no weight), remembered. */
export function swordFeelWanted(search, store) { return feelSwitch('swordfeel', SWORD_FEEL_KEY, search, store); }
