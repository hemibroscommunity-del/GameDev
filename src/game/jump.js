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
   bro is ~66 tall at the Wheel's scale).  68 was twice the first cut's 34 --
   the owner, having tried it: "I'd also like it if the jump were about 2x as
   high".  The time in the air stayed the same then, so the window for
   clearing low things did too. */
/* ═══ v2.3.3499: 25% HIGHER, AND A LITTLE LONGER IN THE AIR ═══
   The owner, after more play: "Try making jump 25% higher.  Gets stuck on
   some props sometimes that it should be clearing."  68 -> 85 px at the top,
   and 560 -> 625 ms in the air: the same pull of gravity (a height goes with
   the square of the time, so 25% higher is sqrt(1.25) = 1.118x the time), so
   it still reads as the same bro jumping, only harder.  The longer air is
   also more ground covered while you are high enough to clear something. */
export const JUMP_MS = 625;
export const JUMP_PEAK = 85;
/* low things are cleared while the lift is at least this share of the peak:
   the middle 80% of the jump, from ~62 ms after take-off to ~62 ms before
   touching down.  v2.3.3499: 0.45 -> 0.36 with the peak, so the feet are as
   high off the ground (~31 px) as they were when a crossing could start --
   0.36 x 85 = 0.45 x 68 -- and the window is 500 ms where it was 415. */
export const JUMP_CLEAR = 0.36;
/* on the ground at least this long between two jumps */
export const JUMP_REST_MS = 120;

/* The leaping frame of each jog sheet: one knee up, the other leg trailing
   (chosen by eye off the sheets -- the flight phase of the stride).  West,
   northwest and southeast are mirrors of east, northeast and southwest, so
   they share these. */
export const JUMP_FRAME = Object.freeze({ east: 1, north: 8, northeast: 4, south: 7, southwest: 6 });

/* What a jump clears, by the Wheel catalog's id (public/tools/objects/
   catalog.js): the low things with a footprint, JUMP_OVER_H game px tall or
   less as drawn -- and `fence-down`, a fence running north-south, drawn 170
   tall because it runs up the picture but no higher than `fence`.  Boulders
   (90), carts (94), haystacks (110) and everything taller are NOT cleared.
   test-world-core checks every id is in the catalog and every low thing with
   a footprint is here or named in JUMP_NOT.
   v2.3.3499: the jump's 25% gave the list 25% too, 70 -> 87 px: the minecart
   (79) and the rowboat (81), left off as "about as tall as a bro" while the
   jump was a bro's height, are lower than the new one's top. */
export const JUMP_OVER_H = 87;
export const JUMP_OVER = new Set([
  'stump', 'charstump', 'driftwood', 'haybale', 'trough', 'stone', 'barrel',
  'bench', 'crate', 'bush', 'snowrock', 'scrap', 'stonewall', 'hitch',
  'fence', 'fence-down', 'basalt', 'coal', 'searock',
  'minecart', 'rowboat',   /* v2.3.3499 */
]);
/* ...and the low things deliberately left off (none since v2.3.3499). */
export const JUMP_NOT = new Set([]);

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
  if (extra && extra.dazed) return 'dazed';   /* v2.3.3017: a rock monster's daze (#781's elemHits.js), as the roll waits for it */
  if (S._dodgeRoll) return 'rolling';
  if (S._bashDash) return 'dashing';
  if (S._wheelSwim && S._wheelSwim.on) return 'swimming';
  if (S._extraction || S._firemaking || S._farmWork) return 'harvesting';   /* v2.3.3136: kneeling at a bed too */
  if (S._lootFreezeUntil && now < S._lootFreezeUntil) return 'busy';
  if (S._sled || S._zoneLoading || S._netHold || S._townArtHold || S._farmArtHold) return 'busy';   /* v2.3.3136: + the farm's hold */
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

/** Touch down (or cut short: a death, a zone change).
    v2.3.3499: the low things this jump was crossing stay passable a moment
    after it (JUMP_LATCH_MS, landedOver), so feet that came down in one walk
    on out of it. */
export function endJump(S, now) {
  if (!S) return;
  const j = S._jump;
  S._jumpOver = (j && j.over && j.over.size) ? { keys: j.over, until: now + JUMP_LATCH_MS } : null;
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
 * before you are too low -- give or take JUMP_LAND_GRACE_MS (v2.3.3499).
 */
export function overLow(b, j, now, h, x, fy, vx, vy) {
  if (!b || !JUMP_OVER.has(b.id)) return false;
  const left = clearMsLeft(j, now);
  if (!(left > 0)) return false;
  return crossMs(b, h, x, fy, vx, vy) <= left + JUMP_LAND_GRACE_MS;
}

/* ═══ v2.3.3499: A CROSSING ONCE BEGUN IS NEVER JUDGED AGAIN ═══
   The owner: "Gets stuck on some props sometimes that it should be
   clearing."  overLow was asked afresh on EVERY frame of a crossing, with
   that frame's speed, so anything that slowed you over the fence -- a slow
   frame (a frame moves at most three 60 fps steps: S._dtScale's cap), a
   sprint running dry, a held attack's half pace, the stick eased or turned,
   the walk's x-then-y slide -- turned the answer to no with the feet already
   in it, and the walk test's "never deeper into a footprint" froze them
   there in mid-air: you came down IN the fence and had to back out.  And a
   jump taken a stride too far back reached the fence just after the last
   moment it could be out before landing, and stopped dead at its edge in
   the air.
   So: the first frame a jump may pass a low thing LATCHES it (jumpLatch, on
   the jump), and a latched thing is passed for the rest of the jump
   whatever the speed (jumpLatched); a crossing that comes down up to
   JUMP_LAND_GRACE_MS short is let start; and the jump's latches outlive it
   by JUMP_LATCH_MS (endJump, landedOver), so feet that did come down inside
   walk on out of it instead of being held.  Only a JUMP_OVER thing is ever
   latched, so a tree, a building or the sea is exactly as solid as before. */
export const JUMP_LAND_GRACE_MS = 160;
export const JUMP_LATCH_MS = 450;

/** A footprint's key: the same box every frame, whatever array it came in. */
export function jumpBoxKey(b) {
  return Math.round(b.x0) + ',' + Math.round(b.y0) + ',' + Math.round(b.x1) + ',' + Math.round(b.y1);
}

/** Has this jump already started across box b? */
export function jumpLatched(j, b) {
  return !!(j && j.over && b && JUMP_OVER.has(b.id) && j.over.has(jumpBoxKey(b)));
}

/** Start across box b on this jump (true, so a test can read `overLow(...) && jumpLatch(...)`). */
export function jumpLatch(j, b) {
  if (!j || !b) return false;
  if (!j.over) j.over = new Set();
  j.over.add(jumpBoxKey(b));
  return true;
}

/** Just landed from a jump that was crossing box b: the feet may walk on out of it. */
export function landedOver(S, b, now) {
  const L = S && S._jumpOver;
  if (!L || !L.keys || !b || !JUMP_OVER.has(b.id)) return false;
  if (!(now < L.until)) { S._jumpOver = null; return false; }
  return L.keys.has(jumpBoxKey(b));
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
    peak: isFinite(peak) && peak > 0 ? Math.max(8, Math.min(120, peak)) : JUMP_PEAK,   /* room above JUMP_PEAK (85 since v2.3.3499) */
  };
}
