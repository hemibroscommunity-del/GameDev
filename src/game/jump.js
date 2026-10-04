/* ═══ v2.3.3017: JUMPING ═══
 *
 * Owner, 2026-10-03: "start working on real jumping.  Might be able to just
 * use the jog directions instead of a custom jump animation".  And of where
 * its button goes: beneath the right joystick (the attack disc), with Space
 * already the dodge roll on a keyboard -- so X jumps there.
 *
 * WHAT A JUMP IS.  Your POSITION never leaves the ground: the server checks
 * only how far you moved (movement.js, 500 px a second), the walk test, the
 * depth sort and the shadows all read the ground, and a jump moves you no
 * faster than a walk.  What leaves the ground is the picture: for JUMP_MS the
 * body is drawn JUMP_PEAK x jumpLiftAt(t) world px up, holding one leaping
 * frame of the jog for the way it faces (JUMP_FRAME -- the owner's "jog
 * directions"), and its sun shadow stays on the ground (entityRenderer
 * figureFeetY adds the lift back), so the gap between them is the height.
 *
 * WHAT MAKES IT REAL: low things are cleared.  While you are high enough
 * (the lift at least JUMP_CLEAR of the peak) a fence, a barrel, a crate, a
 * bench, a rock or a bush -- JUMP_OVER, by catalog id -- does not stop your
 * feet, as long as the way you are going carries you out of its footprint
 * before you come down (overLow): you never land inside one.  Trees,
 * boulders, carts, buildings and anything not on the list stop you in the air
 * exactly as on the ground, and so do monsters, people, the resources and the
 * open sea.  In the air you keep going the way you took off if you let go of
 * the stick, and steer if you hold it.
 *
 * Pure -- no imports -- so node can test it (tools/world/test-world-core.mjs
 * "jumping"); game/jumpActions.js starts one, BroTown.jsx moves you through
 * it, rendering/jumpFx.js draws it. */

/* how long you are in the air, and how high you go at the top (world px; a
   bro is ~66 tall at the Wheel's scale, so about his own height).  68 is
   twice the first cut's 34 -- the owner, having tried it: "I'd also like it
   if the jump were about 2x as high".  The time in the air is the same, so
   the window for clearing low things is too: only the picture rises higher,
   and the things it clears (JUMP_OVER, 70 px tall or less) are now about as
   tall as the jump. */
export const JUMP_MS = 560;
export const JUMP_PEAK = 68;
/* low things are cleared while the lift is at least this share of the peak:
   the middle ~74% of the jump, from ~70 ms after take-off to ~70 ms before
   touching down */
export const JUMP_CLEAR = 0.45;
/* on the ground at least this long between two jumps */
export const JUMP_REST_MS = 120;

/* The leaping frame of each jog sheet: one knee up, the other leg trailing
   (chosen by eye off the sheets -- the flight phase of the stride).  West,
   northwest and southeast are mirrors of east, northeast and southwest, so
   they share these. */
export const JUMP_FRAME = Object.freeze({ east: 1, north: 8, northeast: 4, south: 7, southwest: 6 });

/* What a jump clears, by the Wheel catalog's id (public/tools/objects/
   catalog.js): the low things with a footprint, 70 game px tall or less as
   drawn -- and `fence-down`, a fence running north-south, drawn 170 tall
   because it runs up the picture but no higher than `fence`.  Boulders (90),
   carts (94), minecarts (79), rowboats (81), haystacks (110) and everything
   taller are NOT cleared.  test-world-core checks every id is in the catalog
   and every low thing with a footprint is here or named in JUMP_NOT. */
export const JUMP_OVER = new Set([
  'stump', 'charstump', 'driftwood', 'haybale', 'trough', 'stone', 'barrel',
  'bench', 'crate', 'bush', 'snowrock', 'scrap', 'stonewall', 'hitch',
  'fence', 'fence-down', 'basalt', 'coal', 'searock',
]);
/* ...and the low things deliberately left off: a minecart and a rowboat are
   about as tall as a bro on the picture. */
export const JUMP_NOT = new Set(['minecart', 'rowboat']);

/** The lift's share of the peak at phase t (0 taking off, 1 landing). */
export function jumpLiftAt(t) {
  if (!(t > 0) || !(t < 1)) return 0;
  return 4 * t * (1 - t);
}

/** Where a jump is, 0..1, or -1 when there is none. */
export function jumpPhase(j, now) {
  if (!j || !(j.dur > 0)) return -1;
  return (now - j.t0) / j.dur;
}

/** In the air right now? */
export function jumpActive(j, now) {
  const p = jumpPhase(j, now);
  return p >= 0 && p < 1;
}

/** How high the body is drawn, in world px (0 on the ground). */
export function jumpHeight(j, now) {
  const p = jumpPhase(j, now);
  if (!(p > 0 && p < 1)) return 0;
  return (j.peak > 0 ? j.peak : JUMP_PEAK) * jumpLiftAt(p);
}

/* the phases between which the lift is at least JUMP_CLEAR */
const _CLR = Math.sqrt(1 - JUMP_CLEAR);
export const CLEAR_FROM = (1 - _CLR) / 2;
export const CLEAR_TO = (1 + _CLR) / 2;

/** How many ms more you are high enough to clear a low thing (0 when you
    are not, yet or any more). */
export function clearMsLeft(j, now) {
  const p = jumpPhase(j, now);
  if (!(p >= CLEAR_FROM && p < CLEAR_TO)) return 0;
  return (CLEAR_TO - p) * j.dur;
}

/** S is in the air (your own jump). */
export function jumpAirborne(S, now) {
  return !!(S && S._jump) && jumpActive(S._jump, typeof now === 'number' ? now : Date.now());
}

/**
 * Why a jump is refused right now, or null when it may start.  `extra`
 * carries what this module cannot know without imports: `stuck` (a slime's
 * goo, elemHits.isStuck), `stunned`.
 */
export function jumpRefusal(S, now, extra) {
  if (!S || !S.player || !S.rpg) return 'none';
  if (S._dying || (typeof S.rpg.hp === 'number' && S.rpg.hp <= 0)) return 'dead';
  if (S._jump) {
    if (jumpActive(S._jump, now)) return 'airborne';
  }
  if (S._jumpLandAt && now - S._jumpLandAt < JUMP_REST_MS) return 'landing';
  if (extra && extra.stunned) return 'stunned';
  if (extra && extra.stuck) return 'stuck';
  if (S._dodgeRoll) return 'rolling';
  if (S._bashDash) return 'dashing';
  if (S._wheelSwim && S._wheelSwim.on) return 'swimming';
  if (S._extraction || S._firemaking) return 'harvesting';
  if (S._lootFreezeUntil && now < S._lootFreezeUntil) return 'busy';
  if (S._sled || S._zoneLoading || S._netHold || S._townArtHold) return 'busy';
  return null;
}

/**
 * Take off.  (dx, dy) is the stick at take-off (each -1..1, length <= 1): the
 * way you keep going if you let go of it in the air.
 */
export function startJump(S, now, dx, dy) {
  const len = Math.sqrt((dx || 0) * (dx || 0) + (dy || 0) * (dy || 0));
  const k = len > 1 ? 1 / len : 1;
  S._jump = { t0: now, dur: JUMP_MS, peak: JUMP_PEAK, dx: (dx || 0) * k, dy: (dy || 0) * k };
  return S._jump;
}

/** Touch down (or cut short: a death, a zone change). */
export function endJump(S, now) {
  if (!S) return;
  S._jump = null;
  S._jumpLandAt = now;
}

/**
 * How long (ms) it takes a feet box of half-size h at (x, fy), going (vx, vy)
 * px a ms, to be out of box b on some side -- Infinity when it is not going
 * out at all.  The box is out as soon as EITHER axis has separated.
 */
export function crossMs(b, h, x, fy, vx, vy) {
  let tx = Infinity, ty = Infinity;
  if (vx > 1e-6) tx = Math.max(0, (b.x1 + h) - x) / vx;
  else if (vx < -1e-6) tx = Math.max(0, x + h - b.x0) / -vx;
  if (vy > 1e-6) ty = Math.max(0, (b.y1 + h) - fy) / vy;
  else if (vy < -1e-6) ty = Math.max(0, fy + h - b.y0) / -vy;
  return Math.min(tx, ty);
}

/**
 * May the feet pass over this footprint?  Only a JUMP_OVER thing, only while
 * high enough, and only if the way you are going (vx, vy px a ms) takes the
 * feet box (half-size h, at x, fy -- where the step would put it) out of it
 * before you are too low: you never come down inside one.
 */
export function overLow(b, j, now, h, x, fy, vx, vy) {
  if (!b || !JUMP_OVER.has(b.id)) return false;
  const left = clearMsLeft(j, now);
  if (!(left > 0)) return false;
  return crossMs(b, h, x, fy, vx, vy) <= left;
}

/** The held jog frame for a sheet direction (the five that are drawn). */
export function jumpFrame(dir, frameCount) {
  const f = JUMP_FRAME[dir];
  const n = frameCount > 0 ? frameCount : 24;
  return typeof f === 'number' ? Math.min(n - 1, Math.max(0, f)) : 0;
}

/** A peer's jump from the relay (game events), its numbers clamped: a
    forged or garbled one must not hang a figure in the air. */
export function peerJump(payload, now) {
  const dur = Number(payload && payload.dur);
  const peak = Number(payload && payload.peak);
  return {
    t0: now,
    dur: isFinite(dur) && dur > 0 ? Math.max(200, Math.min(900, dur)) : JUMP_MS,
    peak: isFinite(peak) && peak > 0 ? Math.max(8, Math.min(120, peak)) : JUMP_PEAK,   /* room above JUMP_PEAK 68 */
  };
}
