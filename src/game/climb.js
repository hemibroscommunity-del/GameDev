/* ═══ v2.3.3986: CLIMBING, AND JUMPING UP A FACE — the rules ═══
 *
 * The owner, 2026-11-02: "Make a portion of the game that you need to swim in
 * (maybe add a dive feature) and also a portion of the game that you need to
 * climb (explore animations for this) and double jump to get to the next
 * part.  Maybe this is part of the 'elevation' addition of the game where you
 * add hills and dips."  docs/ELEVATION-PLAN.md has the design.
 *
 * THE GROUND.  A rise (public/tools/world/core/rises.js, from plan.js
 * `rises`, sent by the ground worker with `?climb=1`) is ordinary ground with
 * a rock FACE on its south side and a RIM round the rest: cells of the walk
 * grid you cannot walk into (wheelTrial.js lazyGrid).  Nobody has a height
 * number: "on top" is standing on the ground above the face, and a face `h`
 * game px tall is a band `h` px deep on the map, from its top edge down to its
 * foot.  So getting up is getting your feet across that band, northwards:
 *
 *   CLIMBING  a strip of vines down a face (`climb`): standing at its foot
 *             and pushing north (or at its top, pushing south) starts a
 *             climb -- straight up and down only,
 *             at CLIMB_MULT of the walk, no weapon, the body the jog's own
 *             back-facing frames at its own cadence (CLIMB_FRAMES, one every
 *             CLIMB_PX px climbed: nothing new is loaded).  Out at the top
 *             you are on it; out at the bottom you are off it.
 *   JUMPING   a jump going north (within FACE_NORTH of straight up the
 *             screen) may enter a face's band once it is high enough
 *             (FACE_ENTER of a jump's peak, the low props' own JUMP_CLEAR),
 *             and the face is then crossed for the rest of the jump -- the
 *             props' latch (game/jump.js jumpLatch), extended to faces.  It
 *             is judged where you come down (faceLanding): your feet clear of
 *             the band on its top, and a face no taller than a plain jump
 *             goes (FACE_JUMP_H: the 72 px terrace takes a SPRINTING jump --
 *             92 px of band and feet, where a walking jump covers 84 once
 *             high enough and a sprinting one 112), or any face to a FLIP
 *             (the 144 px ledge: a well-timed flip covers 175 px walking, 273
 *             sprinting; an early one 94).  Short of it, or too tall for the
 *             jump you made: you drop back where you jumped from.
 *   DOWN      a jump going south off a top drops you to the face's foot (a
 *             Pokemon ledge); walking into a face from above stops you, so
 *             nobody falls off by accident.  Or climb down the vines.
 *
 * THE SERVER hears a walk, as for a jump: a climb is 0.4 of the walk, a drop
 * back is a few hundred px in under half a second (inside the move budget's
 * burst, server/src/movement.js).  It knows nothing of the faces yet: the
 * walls are the phone's, like today's water (ELEVATION-PLAN.md has the next
 * PR's baked face table and movement clip).
 *
 * Pure -- no imports but the jump's rules -- so node tests it
 * (tools/world/test-world-core.mjs "climbing"); game/climbActions.js runs it,
 * BroTown.jsx moves you through it, entityRenderer draws it.
 */
import { JUMP_CLEAR, JUMP_PEAK, jumpHeight, jumpActive } from './jump.js';

/* a climb's speed, a share of your walk (the owner's ask: "0.4 of walk") */
export const CLIMB_MULT = 0.4;
/* the climb's frames: the jog's back-facing (north) sheet, a knee driving up
   on each side and the plants between, one after the other every CLIMB_PX
   px climbed -- its own cadence, by the distance, not the jog's clock (which
   follows the ground's speed) */
export const CLIMB_FRAMES = Object.freeze([7, 9, 11, 15, 19, 21, 0, 4]);
export const CLIMB_PX = 5;
/* the feet box's half-size (the walk test's own `hs`) */
export const FEET_HS = 10;
/* a jump enters a face's band once it is this share of a jump's peak up --
   the low props' own threshold (jump.js JUMP_CLEAR) */
export const FACE_ENTER = JUMP_CLEAR;
/* the tallest face a plain jump may take; taller ones only the flip */
export const FACE_JUMP_H = JUMP_PEAK;
/* "going north": the step's way within this of straight up the screen (its
   sideways share at most this times its northward one: ~63 degrees) */
export const FACE_NORTH = 2;
/* a drop back (or down): how fast the feet go, px a ms, and the least time */
export const DROP_PX_MS = 0.6;
export const DROP_MIN_MS = 180;
/* the chest: how near its front your feet must be to open it (px) */
export const CHEST_REACH = 36;
export const CHEST_NOTE = 'Empty for now: the reward comes next';
export const CLIMB_NOTE = 'Climbing!';

/** The rise cell at game px (x, y): { kind, r } ('face', 'rim', 'climb',
    'chest', 'top') with its rise from R.list, or null where there is none.
    R is the worker's rises message (core/rises.js riseMessage). */
export const KIND_NAMES = Object.freeze(['top', 'face', 'rim', 'climb', 'chest']);
export function riseCellAt(R, x, y) {
  if (!R || !R.cells) return null;
  const cx = Math.floor(x / R.cell) - R.x0, cy = Math.floor(y / R.cell) - R.y0;
  if (cx < 0 || cy < 0 || cx >= R.w || cy >= R.h) return null;
  const v = R.cells[cy * R.w + cx];
  if (!v) return null;
  const r = R.list[(v >> 3) - 1];
  return r ? { kind: KIND_NAMES[v & 7] || 'top', r } : null;
}
/** Does a cell of this kind stop a walk? */
export function riseShuts(kind) { return kind === 'face' || kind === 'rim' || kind === 'climb' || kind === 'chest'; }
/** Is a feet box (half-size h at fx, fy) touching rise r's face band? */
export function feetInBand(r, fx, fy, h = FEET_HS) {
  const f = r.face;
  return fx + h > f.x0 && fx - h < f.x1 && fy + h > f.y0 && fy - h < f.y1;
}
/** Is the step (vx, vy) going north (up the screen)? */
export function goingNorth(vx, vy) { return vy < -1e-6 && Math.abs(vx) <= FACE_NORTH * -vy; }
export function goingSouth(vx, vy) { return vy > 1e-6 && Math.abs(vx) <= FACE_NORTH * vy; }

/**
 * May a jump enter rise r's face band now?  'N' (up it), 'S' (down off its
 * top) or null.  `j` the jump in the air, (fx, fy) the feet now, (vx, vy)
 * the step.  Up: from below it, going north, high enough.  Down: from its
 * top, going south.
 */
export function faceEntry(r, j, now, fx, fy, vx, vy, h = FEET_HS) {
  if (!r || !j || !jumpActive(j, now)) return null;
  const f = r.face;
  if (fy - h >= f.y1 - 0.5 && goingNorth(vx, vy)) {
    return jumpHeight(j, now) >= FACE_ENTER * JUMP_PEAK ? 'N' : null;
  }
  if (fy + h <= f.y0 + 0.5 && goingSouth(vx, vy)) return 'S';
  return null;
}
/* the latch's key on the jump (jump.js `over`, which a flip carries on) */
export function faceKey(r, dir) { return 'face:' + r.id + ':' + dir; }

/**
 * Where a jump that crossed into rise r's face (`dir` 'N' or 'S') comes down:
 *   'top'   up: feet clear of the band on its top, and the jump could reach
 *           it (a face no taller than FACE_JUMP_H, or a flip);
 *   'back'  up, but short of the top or too tall for this jump: dropped back
 *           where it jumped from;
 *   'foot'  down: anywhere in the band, carried on to the foot;
 *   'clear' not in the band at all (it turned away): nothing to do.
 */
export function faceLanding(r, dir, flip, fx, fy, h = FEET_HS) {
  const f = r.face;
  const inBand = feetInBand(r, fx, fy, h);
  if (dir === 'S') return inBand ? 'foot' : 'clear';
  const onTop = fy + h <= f.y0 && fx + h > f.x0 && fx - h < f.x1;
  if (onTop) return (r.h <= FACE_JUMP_H || flip) ? 'top' : 'back';
  return inBand ? 'back' : 'clear';
}
/** Where the feet go to stand at a face's foot, straight down from x. */
export function footOf(r, fx, h = FEET_HS) {
  return { x: fx, y: r.face.y1 + h + 1 };
}

/**
 * A climb may start here: the feet (fx, fy) at the foot of a climb strip
 * (the cells just north of the feet box are a strip's) pushing north, or at
 * its top (the cells just south of them) pushing south.  The strip's rise, or
 * null.
 */
export function climbStartAt(R, fx, fy, dx, dy, h = FEET_HS) {
  if (!R || Math.abs(dx) > Math.abs(dy)) return null;
  const c = dy < -0.3 ? riseCellAt(R, fx, fy - h - CLIMB_REACH) : dy > 0.3 ? riseCellAt(R, fx, fy + h + CLIMB_REACH) : null;
  if (!c || c.kind !== 'climb' || !c.r.climb) return null;
  const s = c.r.climb;
  /* the feet over the strip (the box within it once put on its middle) */
  if (fx < s.x0 || fx >= s.x1) return null;
  return c.r;
}
/* how near the strip the feet box must be to get on it (px): a walk stops
   the box short of a wall by up to a step -- three 60 fps frames at a
   sprint's pace and a speed food's (BroTown's _dtScale cap) -- so "at the
   foot" reaches that far */
export const CLIMB_REACH = 16;
/** The climb's way this frame from the stick: up (-1), down (1) or still (0). */
export function climbWay(dy) { return dy < -0.3 ? -1 : dy > 0.3 ? 1 : 0; }
/** Out of the climb?  'top' (the feet box wholly above the band), 'foot'
    (wholly below it), or null (still on the vines). */
export function climbOut(r, fy, h = FEET_HS) {
  if (fy + h <= r.face.y0) return 'top';
  if (fy - h >= r.face.y1) return 'foot';
  return null;
}
/** The jog frame (north sheet) a climb is drawn in, `dist` px climbed. */
export function climbFrame(dist, frameCount) {
  const n = frameCount > 0 ? frameCount : 23;
  const i = Math.floor(Math.max(0, dist) / CLIMB_PX) % CLIMB_FRAMES.length;
  return Math.min(n - 1, CLIMB_FRAMES[i]);
}

/** A drop from (x0, y0) to (x1, y1): its record, timed by DROP_PX_MS. */
export function startDrop(x0, y0, x1, y1, now, why) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  return { x0, y0, x1, y1, t0: now, dur: Math.max(DROP_MIN_MS, d / DROP_PX_MS), why: why || 'back' };
}
/** Where a drop is at `now` ({ x, y, done }): eased in, as a fall speeds up. */
export function dropAt(d, now) {
  const u = Math.max(0, Math.min(1, (now - d.t0) / d.dur));
  const e = u * u;
  return { x: d.x0 + (d.x1 - d.x0) * e, y: d.y0 + (d.y1 - d.y0) * e, done: u >= 1 };
}

/** Are the feet at the chest's front (on the rise's top, within reach)? */
export function atChest(r, fx, fy, h = FEET_HS) {
  const c = r && r.chest;
  if (!c) return false;
  return fx > c.x0 - CHEST_REACH / 2 && fx < c.x1 + CHEST_REACH / 2 && fy - h >= c.y1 - 2 && fy - h <= c.y1 + CHEST_REACH;
}
