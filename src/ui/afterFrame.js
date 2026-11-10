/* ═══ v2.3.4360: AFTER THE FRAME IS DRAWN ═══
 *
 * The owner, 2026-11-10, of the first steps' marker on Mayor Bro: "the
 * reticle around mayor bro is pretty obnoxious with movement (the frames are
 * gritty)".
 *
 * The gold box round him (ui/mobile/QuestCoach.jsx, lesson `mayor`) and the
 * big arrow at him (ui/guideArrow.js) are page elements laid over the canvas,
 * and each found him on a clock of its own: the box 12 times a second, the
 * arrow 4 (and then glided for a fifth of a second).  The world under them is
 * drawn every frame, so the moment the camera moved both stuttered after him.
 *
 * A mark on something IN THE WORLD has to be placed from the very camera the
 * frame was drawn with, every frame, after it is drawn -- a loop of its own
 * (requestAnimationFrame) runs before or after the game's by the order the
 * two happened to be asked for, and before it is a frame behind for ever.  So
 * the game's loop calls this once a frame, after renderFrame, and whoever
 * follows something in the world listens here.
 *
 * No imports, nothing kept but the listeners.  With none, a frame pays one
 * size check.  A listener only MOVES what it follows (a transform, or a
 * left/top on its own fixed element) and writes nothing on a frame where the
 * thing did not move: a style written every frame on a layer over the WebGL
 * canvas is iPhone's sore spot (QuestCoach.jsx, v2.3.1808).
 */
const _fns = new Set();
let _ranAt = 0;

/** Call `fn(S)` after every frame the game draws; returns the way to stop. */
export function onAfterFrame(fn) {
  if (typeof fn !== 'function') return function () {};
  _fns.add(fn);
  return function () { _fns.delete(fn); };
}

/** The game's loop, once a frame, after the renderer (BroTown.jsx). */
export function runAfterFrame(S) {
  _ranAt = Date.now();
  if (!_fns.size) return;
  for (const fn of _fns) { try { fn(S); } catch (e) { /* a mark must never stop the frame */ } }
}

/** Is the game drawing frames right now (one within `ms`)?  A follower that
 *  is not being called falls back to its own slower clock. */
/* (2 s: a slow machine's frame can be most of a second, and a follower that
   flips to its own clock between two of them glides, then snaps) */
export function framesRunning(ms) { return Date.now() - _ranAt < (ms > 0 ? ms : 2000); }

/** A CSS-px length on a whole device pixel, as the camera is (TRAPS §231). */
export function onDevicePx(v) {
  const d = (typeof window !== 'undefined' && window.devicePixelRatio > 0) ? window.devicePixelRatio : 1;
  return Math.round(v * d) / d;
}
