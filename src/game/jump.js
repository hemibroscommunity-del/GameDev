/* ═══ v2.3.3017: JUMPING ═══
 *
 * Owner, 2026-10-03: "start working on real jumping.  Might be able to just
 * use the jog directions instead of a custom jump animation".  And of where
 * its button goes: beneath the right joystick (the attack disc), with Space
 * already the dodge roll on a keyboard -- so X jumps there.  v2.3.3844 (the
 * owner: "spacebar I think should be jump"): Space jumps, X rolls.
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
   they share these.  v2.3.3499: the RISING frame of the four below; a call
   with no phase still gets it. */
export const JUMP_FRAME = Object.freeze({ east: 1, north: 3, northeast: 3, south: 14, southwest: 10 });

/* ═══ v2.3.3499: A JUMP THAT MOVES -- THE STRIDE, THE SQUASH, THE LEAN ═══
   The owner, after the 25% higher jump: "is there any 'jump effect' you can
   add just using code that would make it look more realistic than just the
   static frame?"  Four things, all drawn in code on the art the game has (no
   new picture, no new memory):
     1. THE STRIDE, SLOWED.  Not one held frame but four of the jog's own,
        one after the other, for the way you face (JUMP_FRAMES): the push-off
        (a knee driving up off the back foot), the rise, the split over the
        top and the front foot reaching for the ground.  Picked off the
        sheets by eye and by the feet's lowest row (128 px frames): east
        109 -> 105 -> 97 -> 102, north 117 -> 107 -> 104 -> 115, northeast
        113 -> 104 -> 103 -> 108, south 114 -> 101 -> 102 -> 111, southwest
        118 -> 114 -> 103 -> 118 -- planted, then the stride's highest feet,
        then coming down.  Each holds its share of the air (JUMP_FRAME_AT).
     2. SQUASH AND STRETCH about the feet: crouched at the press, springing
        long on the way up, round over the top, a little long reaching down
        (jumpStretchAt); on the touch-down a squash that springs back over
        JUMP_LAND_MS (jumpLandStretch); wider as it squashes, thinner as it
        stretches (jumpWidthFor).
     3. THE LEAN into the way you go: forward on the way up, upright over the
        top, back a touch to land (jumpLeanAt x JUMP_LEAN radians, times how
        fast you go across the screen: a standing jump does not lean, nor one
        straight up or down the screen).
     4. A kick of dust behind the boots at the take-off (rendering/worldFx.js),
        where the landing already had its ring.
   rendering/jumpFx.js draws 2 and 3 on the whole figure ABOUT ITS FEET, the
   emotes' way (game/emoteMoves.js placeEmote): the name plate and HP bar
   ride up with the body but never squash or tilt, and the feet the depth
   pass and the shadows read stay on the ground. */
export const JUMP_FRAMES = Object.freeze({
  east: Object.freeze([13, 1, 3, 4]),
  north: Object.freeze([2, 3, 5, 6]),
  northeast: Object.freeze([1, 3, 4, 5]),
  south: Object.freeze([13, 14, 15, 16]),
  southwest: Object.freeze([9, 10, 11, 12]),
});
/* where in the air each frame gives way to the next: the push-off for the
   first 7% (~44 ms, a flash of the crouch), the rise to 40%, the split to
   70%, then the reach */
export const JUMP_FRAME_AT = Object.freeze([0.07, 0.4, 0.7]);
/* the touch-down's squash and spring, ms (x the jump's length over JUMP_MS:
   `?jumpms=` stretches it with the air, so a slow test machine sees it) */
export const JUMP_LAND_MS = 220;
/* the most the body leans into a run, radians (~5 degrees) */
export const JUMP_LEAN = 0.09;
/* how fast across the screen leans in full (world px a ms: a walk's pace) */
export const JUMP_LEAN_PX_MS = 0.22;

const _easeOut = (u) => 1 - (1 - u) * (1 - u);
const _easeInOut = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));

/** The body's height as a share of its own (1 = as drawn) at phase t of the
    air: 0.9 at the press (the crouch), springing to 1.07 by 12% (the push
    long), round again by 45%, then a little long (1.04) reaching down. */
export function jumpStretchAt(t) {
  if (!(t >= 0) || !(t < 1)) return 1;
  if (t < 0.12) return 0.9 + 0.17 * _easeOut(t / 0.12);
  if (t < 0.45) return 1.07 - 0.07 * _easeInOut((t - 0.12) / 0.33);
  if (t < 0.6) return 1;
  return 1 + 0.04 * Math.sin(((t - 0.6) / 0.4) * Math.PI / 2);
}

/** After the touch-down, u = the landing's share gone (0..1): squashed to
    0.86, springing back through a little stretch, settled by the end. */
export function jumpLandStretch(u) {
  if (!(u >= 0) || !(u < 1)) return 1;
  /* a damped spring, its last tenth faded out so it ends exactly at 1 */
  const s = 1 - 0.14 * Math.exp(-4 * u) * Math.cos(7.5 * u);
  return u > 0.9 ? 1 + (s - 1) * ((1 - u) / 0.1) : s;
}

/** The width that goes with a height: wider squashed, thinner stretched
    (four fifths of what keeps the area, so a stretch never looks thin). */
export function jumpWidthFor(ky) {
  return 1 + (1 - ky) * 0.8;
}

/** How far into the run the body leans at phase t, as a share of
    JUMP_LEAN: forward as it rises, easing upright over the top, back a
    touch as the foot reaches down. */
export function jumpLeanAt(t) {
  if (!(t >= 0) || !(t < 1)) return 0;
  if (t < 0.15) return _easeOut(t / 0.15);
  if (t < 0.55) return 1 - 0.8 * _easeInOut((t - 0.15) / 0.4);
  return 0.2 - 0.55 * _easeInOut((t - 0.55) / 0.45);
}

/**
 * The whole look of a jumping figure, or null when there is nothing to
 * draw: in the air (`j` active) its lift, stretch, width and lean; in the
 * touch-down's squash (`land` = {at, dur} of a jump just landed) the
 * squash alone.  `across` is how fast it goes across the screen, world px a
 * ms (+ east), for the lean.
 */
export function jumpLook(j, now, land, across) {
  const ax = Number.isFinite(across) ? Math.max(-1, Math.min(1, across / JUMP_LEAN_PX_MS)) : 0;
  const t = jumpPhase(j, now);
  if (t >= 0 && t < 1) {
    /* v2.3.3682: a flip is the roll's somersault (entityRenderer draws the
       dodge frames, FLIP_FRAMES): its own tuck, so no stretch or lean on top */
    /* v2.3.3738: ...drawn FLIP_BODY_K larger, about the feet (jumpFx) */
    if (j.flip) return { air: true, t, lift: jumpHeight(j, now), ky: FLIP_BODY_K, kx: FLIP_BODY_K, rot: 0, flip: true };
    const ky = jumpStretchAt(t);
    return { air: true, t, lift: jumpHeight(j, now), ky, kx: jumpWidthFor(ky), rot: JUMP_LEAN * jumpLeanAt(t) * ax };
  }
  if (land && land.at > 0) {
    const ms = JUMP_LAND_MS * (land.dur > 0 ? land.dur / JUMP_MS : 1);
    const u = (now - land.at) / ms;
    if (u >= 0 && u < 1) {
      const ky = jumpLandStretch(u);
      return { air: false, t: 1, u, lift: 0, ky, kx: jumpWidthFor(ky), rot: 0 };
    }
  }
  return null;
}

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
  /* v2.3.3682: a flip starts in the air, at its own height */
  if (j && j.flip) return (p >= 0 && p < 1) ? flipHeightAt(j, now - j.t0) : 0;
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
  /* v2.3.3682: a flip's arc is its own (flipClearMsLeft) */
  if (j && j.flip) return flipClearMsLeft(j, now);
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

/** The jog frame for a sheet direction (the five that are drawn) at phase t
    of the air (v2.3.3499: JUMP_FRAMES, one after the other); with no phase,
    the rising one (JUMP_FRAME). */
export function jumpFrame(dir, frameCount, t) {
  const n = frameCount > 0 ? frameCount : 24;
  const seq = JUMP_FRAMES[dir];
  let f = JUMP_FRAME[dir];
  if (seq && Number.isFinite(t)) {
    let i = 0;
    while (i < JUMP_FRAME_AT.length && t >= JUMP_FRAME_AT[i]) i++;
    f = seq[i];
  }
  return typeof f === 'number' ? Math.min(n - 1, Math.max(0, f)) : 0;
}

/** A peer's jump from the relay (game events), its numbers clamped: a
    forged or garbled one must not hang a figure in the air. */
export function peerJump(payload, now) {
  /* v2.3.3682: their flip (the relay's `flip`), clamped as a jump is */
  if (payload && payload.flip) {
    const f = peerFlip(payload, now);
    if (f) return f;
  }
  const dur = Number(payload && payload.dur);
  const peak = Number(payload && payload.peak);
  return {
    t0: now,
    dur: isFinite(dur) && dur > 0 ? Math.max(200, Math.min(900, dur)) : JUMP_MS,
    peak: isFinite(peak) && peak > 0 ? Math.max(8, Math.min(120, peak)) : JUMP_PEAK,   /* room above JUMP_PEAK (85 since v2.3.3499) */
  };
}

/* ═══ v2.3.3682: THE DOUBLE JUMP -- A FLIP ═══
   The owner, 2026-10-27: "Now I'm wondering about the feasibility of a
   double jump feature.  You press jump then press jump again to do a little
   flip for a little more of a bounce.  You have to time it right to get
   maximum horizontal distance and the jump effect will be greater if you're
   sprinting into the jump.  See if you can use the roll or part of the roll
   for the double jump effect", and "I just uploaded the second jump (flip)
   sound effect".

   A second press in the air (the button, X, or a tap on the stick) is a FLIP,
   once a jump: a push up from where you are, smaller than the jump's own
   (FLIP_PUSH of it), falling under the jump's own gravity (its peak and time,
   so `?jumpms=` stretches it too) -- the record that replaces S._jump is a
   jump of its own (`flip: true`), so everything that reads a jump (the lift,
   the low things cleared, the landing, the peers' copy) reads it unchanged.
   It is drawn with the ROLL's somersault, the dodge sheets' tumble frames
   (FLIP_FRAMES), lifted by jumpFx as a jump is.

   TIMING IS DISTANCE.  For the flip's time in the air you go FLIP_BOOST_MIN
   to FLIP_BOOST_MAX faster across the ground, by its grade (flipGrade): 0 at
   FLIP_FROM, 1 at FLIP_SWEET -- coming down, about 0.12 s before the feet
   would touch -- and a little less after it, to FLIP_TO, where it is too late
   to tuck.  The later the flip, the more time in the air, but past the sweet
   spot the boost falls faster than the air grows: the most ground is covered
   at the sweet spot (docs/specs/jumping.md has the table: about twice a plain
   jump's distance there, 1.3x with a flip right after take-off).  A grade of
   FLIP_PERFECT or better is called "Perfect!" over you.

   SPRINTING INTO IT is a bigger flip: the push x FLIP_SPRINT_PUSH and the
   boost x FLIP_SPRINT_BOOST (a jump that took off in a sprint, or a sprint
   still running at the flip).

   THE WORKER hears a walk, as for a jump: at its best a flip is 1.45x the
   walk for ~0.5 s (2.1x with the sprint's own 1.33), under the move budget's
   500 px a second refill at the base walk and inside its three seconds of
   burst with every speed stat (server/src/movement.js MOVE_BUDGET). */
export const FLIP_PUSH = 0.6;
export const FLIP_FROM = 0.15;
export const FLIP_SWEET = 0.8;
export const FLIP_TO = 0.96;
export const FLIP_PERFECT = 0.8;
export const FLIP_BOOST_MIN = 0.1;
export const FLIP_BOOST_MAX = 0.45;
export const FLIP_SPRINT_PUSH = 1.25;
export const FLIP_SPRINT_BOOST = 1.35;
/* the roll's tumble (dodge-east / dodge-south: 0 crouch, 1 hands down, 2 over,
   3-5 the tuck going round, 6 the crouch coming out, 7 rising, 8 the stand),
   and where in the flip each gives way to the next */
export const FLIP_FRAMES = Object.freeze([2, 3, 4, 5, 6]);
/* ═══ v2.3.3738: THE FLIP DRAWN LARGER ═══
   The owner: "The flipped body is too small (looks about 40% too small)."
   Measured on the sheets: the tumble's frames are drawn at the standing
   figure's own scale (the same head, 13-22 px of radius against 18-19
   standing; as many opaque pixels a frame), but curled up -- 85-103 px tall
   on the tuck frames against 186-194 standing -- so on screen it read as a
   smaller bro.  The whole figure (body, armour, head pieces) is drawn this
   much larger through the flip, about the feet (jumpFx, which holds the name
   plate unscaled): the owner's 40%.
   v2.3.3798: 25% smaller, 1.4 x 0.75 (the owner: "shrink the character a bit
   when he's doing the jump flip. I think it needs about 25% smaller"). */
export const FLIP_BODY_K = 1.05;
export const FLIP_FRAME_AT = Object.freeze([0.16, 0.36, 0.56, 0.78]);

/** The flip's grade at phase p of the jump: 0..1 (0 outside the window). */
export function flipGrade(p) {
  if (!(p >= FLIP_FROM && p < FLIP_TO)) return 0;
  if (p <= FLIP_SWEET) return Math.max(0, Math.min(1, (p - FLIP_FROM) / (FLIP_SWEET - FLIP_FROM)));
  return 1 - 0.5 * (p - FLIP_SWEET) / (FLIP_TO - FLIP_SWEET);
}

/** Why a flip may not start now, or null.  `j` is the jump in the air. */
export function flipRefusal(j, now) {
  if (!j || !jumpActive(j, now)) return 'ground';
  if (j.flip) return 'flipped';
  const p = jumpPhase(j, now);
  if (p < FLIP_FROM) return 'early';
  if (p >= FLIP_TO) return 'late';
  return null;
}

/** The jump's gravity (px a ms squared) and push (px a ms) from its own
    peak and time: a parabola 4 x peak x t(1-t) over dur. */
function jumpPhysics(j) {
  const dur = j && j.dur > 0 ? j.dur : JUMP_MS;
  const peak = j && j.peak > 0 ? j.peak : JUMP_PEAK;
  return { g: 8 * peak / (dur * dur), v0: 4 * peak / dur, peak, dur };
}

/** A flip's height (world px) `ms` into it. */
export function flipHeightAt(f, ms) {
  if (!f || !(ms >= 0) || !(ms < f.dur)) return 0;
  return Math.max(0, f.h0 + f.v * ms - f.g * ms * ms / 2);
}

/** How many ms more a flip is high enough to clear a low thing (the jump's
    own JUMP_CLEAR of its peak), 0 when it is not now. */
export function flipClearMsLeft(f, now) {
  const ms = now - f.t0;
  if (!(ms >= 0 && ms < f.dur)) return 0;
  const c = JUMP_CLEAR * (f.basePeak > 0 ? f.basePeak : JUMP_PEAK);
  if (flipHeightAt(f, ms) < c) return 0;
  /* h0 + v t - g t^2 / 2 = c, the later root */
  const disc = f.v * f.v + 2 * f.g * (f.h0 - c);
  if (!(disc >= 0)) return 0;
  const tc = (f.v + Math.sqrt(disc)) / f.g;
  return Math.max(0, Math.min(f.dur, tc) - ms);
}

/**
 * The flip that follows jump `j` pressed at `now`: a new jump record (it
 * replaces S._jump), or null when one may not start.  `opts`: `sprint` (the
 * jump was sprinted into, or a sprint is on), `dx`/`dy` (the stick, if held),
 * `ang` (the way the somersault faces).
 */
export function startFlip(j, now, opts) {
  if (flipRefusal(j, now)) return null;
  const o = opts || {};
  const ph = jumpPhysics(j);
  const p = jumpPhase(j, now);
  const h0 = jumpHeight(j, now);
  const sprint = !!(o.sprint || j.sprint);
  const v = FLIP_PUSH * ph.v0 * (sprint ? FLIP_SPRINT_PUSH : 1);
  const g = ph.g;
  const dur = (v + Math.sqrt(v * v + 2 * g * h0)) / g;
  const grade = flipGrade(p);
  const boost = (FLIP_BOOST_MIN + (FLIP_BOOST_MAX - FLIP_BOOST_MIN) * grade) * (sprint ? FLIP_SPRINT_BOOST : 1);
  const hasStick = Number.isFinite(o.dx) && Number.isFinite(o.dy) && (Math.abs(o.dx) > 0.1 || Math.abs(o.dy) > 0.1);
  return {
    t0: now, dur, peak: h0 + v * v / (2 * g), flip: true,
    h0, v, g, grade, boost, perfect: grade >= FLIP_PERFECT, sprint, at: p,
    dx: hasStick ? o.dx : (j.dx || 0), dy: hasStick ? o.dy : (j.dy || 0),
    ang: Number.isFinite(o.ang) ? o.ang : (j.ang || 0),
    basePeak: ph.peak, baseDur: ph.dur,
    over: j.over || null,   /* a fence it was already crossing stays crossed */
  };
}

/** How much faster across the ground right now: 1 + the flip's boost while
    one is in the air, else 1. */
export function flipBoost(j, now) {
  return j && j.flip && jumpActive(j, now) && j.boost > 0 ? 1 + j.boost : 1;
}

/** The roll's frame for a flip at phase t (FLIP_FRAMES), within the sheet. */
export function flipFrame(frameCount, t) {
  const n = frameCount > 0 ? frameCount : 9;
  let i = 0;
  while (i < FLIP_FRAME_AT.length && t >= FLIP_FRAME_AT[i]) i++;
  return Math.min(n - 1, Math.max(0, FLIP_FRAMES[i]));
}

/** A peer's flip from the relay, its numbers clamped as a jump's are (a
    forged one must not hang a figure in the air), or null to fall back to
    a plain hop. */
export function peerFlip(payload, now) {
  const num = (k) => Number(payload && payload[k]);
  const h0 = num('h0'), v = num('v'), g = num('g'), ang = num('ang');
  if (!(h0 >= 0 && h0 <= 200) || !(v > 0 && v <= 2) || !(g > 0 && g <= 0.05)) return null;
  const dur = (v + Math.sqrt(v * v + 2 * g * h0)) / g;
  /* a real flip is ~0.4-0.6 s; up to 3.2 s for a test page's `?jumpms=`
     (a jump drawn out to 3 s) -- still never a figure hung in the air */
  if (!(dur >= 120 && dur <= 3200)) return null;
  return {
    t0: now, dur, peak: h0 + v * v / (2 * g), flip: true, h0, v, g,
    ang: Number.isFinite(ang) ? ang : 0, basePeak: JUMP_PEAK, baseDur: JUMP_MS,
  };
}
