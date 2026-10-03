/* ═══ v2.3.3003: SWIMMING IN THE WHEEL ═══
 *
 * Owner, 2026-10-03: "I'm thinking you can add swimming and just use the
 * characters head poking out of the water plus code effects to make it look
 * like swimming and change the movement behavior".
 *
 * WHERE.  The walk grid opens the water you may swim in (public/tools/world/
 * core/ground.js swimBits: every river, pond, lake and oasis and the sea's
 * shallows -- the OPEN SEA past them stays a wall, as it keeps the spokes
 * apart).  You are SWIMMING while the ground DRAWN under your boots is water
 * (wheelTrial.js wheelWaterAt, the piece's own pixels every 3 game px): five
 * looks round the boots, SWIM_IN of them wet to start and SWIM_OUT or fewer
 * to stop, so a walk along a shore does not flicker in and out.
 *
 * WHAT CHANGES while you swim:
 *   - you move at SWIM_MULT of your walk, in strokes: STROKE_MS each, a push
 *     of +-SWIM_SURGE through it, and you GLIDE -- your way through the water
 *     is eased toward the stick (SWIM_GLIDE of it kept every 60fps frame), so
 *     you ease into a stroke and drift on a little when you let go;
 *   - no attacks, specials, abilities, roll or shield: only your head is out
 *     of the water.  Each says "Swimming!" over your head when tried (not
 *     more often than NOTE_MS), and going in drops the shield and lets go of
 *     a held attack;
 *   - you are drawn as a head in the water with its ripples, wake and
 *     splashes (rendering/swimFx.js), and hear strokes instead of steps, a
 *     splash going in and a drip coming out (BT_AUDIO.swimStroke/swimSplash).
 * Other players are drawn swimming by the same test at their boots
 * (swimFx.js).  The worker knows nothing of it: the glide never outruns your
 * walk, so it stays inside the worker's move bound.  `?noswim` in the
 * address: the water stays a wall and none of this runs.
 *
 * Pure but for wheelTrial.js (which imports nothing), so node can test it:
 * BroTown.jsx carries out what updateWheelSwim() reports (the shield, the
 * sounds), and each refusal site says "Swimming!" with its own popup.
 */
import { wheelSwimOn, wheelWaterAt } from './wheelTrial.js';

/* the walk in the water, and the push of a stroke round it (the average is
   SWIM_MULT; the peak, SWIM_MULT * (1 + SWIM_SURGE) = 0.63 of a walk, is
   well inside the worker's bound) */
export const SWIM_MULT = 0.55;
export const SWIM_SURGE = 0.15;
/* how much of your way through the water is kept each 60fps frame: about
   0.16 s to ease in or out, ~15 game px of drift when you let go */
export const SWIM_GLIDE = 0.9;
/* one stroke, at a full stick; slower as you slow, none while you tread */
export const STROKE_MS = 650;
const TREAD = 0.15;
/* the looks round the boots (game px), and how many must be wet */
export const SWIM_PROBES = [[0, 0], [-9, 0], [9, 0], [0, -6], [0, 6]];
export const SWIM_IN = 4;
export const SWIM_OUT = 1;
/* never in and out again inside this */
const FLIP_MS = 200;
/* a jump further than this between two frames is a teleport -- a respawn,
   a zone's way in -- not a walk: in or out of the water then, silently
   (dying in a pond must not splash you out onto the town square) */
export const JUMP_PX = 200;
/* "Swimming!": not more often than this, and this far over your boots --
   over the head, which is drawn down at the waterline while you swim */
export const NOTE_MS = 1200;
const NOTE_UP = 50;
export const SWIM_NOTE = 'Swimming!';
export const SWIM_NOTE_COLOR = '#7fd3ff';

/**
 * How many of the looks round the boots at (x, fy) are water, by `waterAt`
 * (true / false / null where nothing is laid yet).  -1 when none is known.
 */
export function wetProbes(waterAt, x, fy) {
  let wet = 0, known = 0;
  for (let i = 0; i < SWIM_PROBES.length; i++) {
    const w = waterAt(x + SWIM_PROBES[i][0], fy + SWIM_PROBES[i][1]);
    if (w == null) continue;
    known++;
    if (w) wet++;
  }
  return known ? wet : -1;
}

/** Swimming after this look, from whether you were: in at SWIM_IN wet, out
    at SWIM_OUT or fewer, else as you were (and as you were when unknown). */
export function swimNext(was, wet) {
  if (wet < 0) return !!was;
  return was ? wet > SWIM_OUT : wet >= SWIM_IN;
}

/**
 * Once a frame, before the walk: are you swimming, and the stroke's clock.
 * `inWheel` -- this zone is the Wheel; `feetDy` -- how far below your
 * position your boots are (entityRenderer playerGroundDy).  Returns what
 * happened for the caller to carry out: 'in' (waded in), 'landed' (put in
 * the water by a teleport: no splash), 'out', 'stroke' or null.
 */
export function updateWheelSwim(S, now, inWheel, feetDy, waterAt) {
  const P = S && S.player;
  if (!P || !inWheel || !wheelSwimOn()) {
    if (S && S._wheelSwim) S._wheelSwim = null;
    return null;
  }
  let sw = S._wheelSwim;
  if (!sw) sw = S._wheelSwim = { on: false, at: 0, t: now, fx: P.x, fy: P.y, vx: 0, vy: 0, ph: 0, strokes: 0, noteAt: 0 };
  const dtMs = Math.max(0, Math.min(100, now - (sw.t || now)));
  sw.t = now;
  const fx = P.x, fy = P.y + (feetDy || 0);
  const jumped = Math.abs(fx - sw.fx) > JUMP_PX || Math.abs(fy - sw.fy) > JUMP_PX;
  sw.fx = fx;
  sw.fy = fy;
  const wet = wetProbes(waterAt || wheelWaterAt, sw.fx, sw.fy);
  const next = swimNext(sw.on, wet);
  if (jumped && next !== sw.on) {
    sw.on = next;
    sw.at = now;
    sw.ph = 0;
    sw.vx = 0;
    sw.vy = 0;
    return next ? 'landed' : null;
  }
  if (next !== sw.on && now - sw.at >= FLIP_MS) {
    sw.on = next;
    sw.at = now;
    sw.ph = 0;
    /* going in, you carry your walk's way into the water (a glide from
       standing would stall you at the edge); coming out, the walk takes over */
    const pv = Math.sqrt((P.vx || 0) * (P.vx || 0) + (P.vy || 0) * (P.vy || 0));
    sw.vx = next && pv > 0.01 ? P.vx / pv : 0;
    sw.vy = next && pv > 0.01 ? P.vy / pv : 0;
    return next ? 'in' : 'out';
  }
  if (!sw.on) return null;
  /* the stroke's clock runs with how fast you are going through the water */
  const v = Math.min(1, Math.sqrt(sw.vx * sw.vx + sw.vy * sw.vy));
  if (v < TREAD) return null;
  const ph = sw.ph + (dtMs / STROKE_MS) * v;
  sw.ph = ph - Math.floor(ph);
  if (ph >= 1) { sw.strokes++; return 'stroke'; }
  return null;
}

/** Swimming right now? */
export function isWheelSwimming(S) {
  return !!(S && S._wheelSwim && S._wheelSwim.on);
}

/**
 * v2.3.3012: out of the water NOW.  Fishing and mining SEAT you
 * (lifeSkillRewards.startExtraction), and the Wheel's seats are baked onto
 * dry ground -- so a swimmer who taps a fishing spot is put on its bank.  The
 * looks round the boots can still find the drawn shore a few px off a seat
 * (a survey of all 32 seats as drawn: two with one or two of the five wet),
 * and a swimmer seated there would stay one -- fishing as a head in the
 * water.  The seat is the
 * bank, so this ends the swim; the looks decide again from here as ever
 * (back in only at SWIM_IN wet).  True when you were swimming, for the drip.
 */
export function climbOut(S, now) {
  const sw = S && S._wheelSwim;
  if (!sw || !sw.on) return false;
  sw.on = false;
  sw.at = typeof now === 'number' ? now : Date.now();
  sw.ph = 0;
  sw.vx = 0;
  sw.vy = 0;
  return true;
}

/** The walk's multiplier: SWIM_MULT with the stroke's push, 1 out of it. */
export function wheelSwimMult(S) {
  const sw = S && S._wheelSwim;
  if (!sw || !sw.on) return 1;
  return SWIM_MULT * (1 + SWIM_SURGE * Math.sin(sw.ph * Math.PI * 2));
}

/**
 * The glide: your way through the water, eased toward the stick (dx, dy),
 * written back into `out` ([dx, dy]) for the step.  `dt` is the frame in
 * 60fps frames (S._dtScale).  A blend of directions no longer than one, so
 * the step is never faster than the walk it replaces -- it is not added to
 * it (the ice slide's 2x, BroTown v2.3.1402).
 */
export function swimGlide(S, dx, dy, dt, out) {
  const sw = S && S._wheelSwim;
  if (!sw || !sw.on) { out[0] = dx; out[1] = dy; return out; }
  const r = Math.pow(SWIM_GLIDE, dt > 0 ? dt : 1);
  sw.vx = sw.vx * r + dx * (1 - r);
  sw.vy = sw.vy * r + dy * (1 - r);
  if (Math.abs(sw.vx) < 0.004) sw.vx = 0;
  if (Math.abs(sw.vy) < 0.004) sw.vy = 0;
  out[0] = sw.vx;
  out[1] = sw.vy;
  return out;
}

/**
 * "Swimming!" -- where to say it (over your head in the water) if it is
 * time to say it again, else null.  For each refusal: an attack, a special,
 * an ability, a roll or the shield tried in the water.
 */
export function swimNote(S, now) {
  const sw = S && S._wheelSwim;
  if (!sw || !sw.on) return null;
  const t = typeof now === 'number' ? now : Date.now();
  if (sw.noteAt && t - sw.noteAt < NOTE_MS) return null;
  sw.noteAt = t;
  return { x: sw.fx, y: sw.fy - NOTE_UP };
}

/** Where your boots were looked at this frame, and whether you swim there:
    the footstep's ground reads it (worldTrial.footstepSurface). */
export function swimFeet(S) {
  const sw = S && S._wheelSwim;
  return sw ? { x: sw.fx, y: sw.fy, on: sw.on } : null;
}
