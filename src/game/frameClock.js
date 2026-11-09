/* ═══ v2.3.4355: A STEADY STEP ON A STEADY SCREEN ═══
 *
 * The owner, 2026-11-09, on an iPhone 14 Pro Max in Safari, riding the
 * skateboard through the town with the frame meter on (`?perf=1`): "it was
 * saying 60fps but the screen looked gritty like it was 30fps or worse" --
 * at the screen's own resolution, at a lower one, and with no buildings or
 * trees: "All 3 were gritty."  The meter on those three rides: 60 frames a
 * second, the game's own work 3.4 to 4.1 ms of each, and the frames' lengths
 * "avg 16.7 p95 18.0 max 22.0", "avg 16.7 p95 19.0 max 24.0".
 *
 * So the graphics chip had time to spare and every frame was shown.  What
 * was uneven was what the frames SHOWED.  The game moves you by your speed
 * times the frame's length (BroTown.jsx `_dtScale`, v2.3.1769), and it took
 * that length from the clock at the moment its own code began to run.  The
 * screen shows each frame for exactly one refresh (16.7 ms); the moment the
 * code begins wobbles by a few ms around that (Safari also rounds its clock
 * to a whole ms).  A frame measured 22 ms moved you a third too far, and the
 * one after it, measured 11, a third too little -- on two frames the screen
 * showed for the same 16.7 ms each.  At a walk that is under a pixel; on the
 * skateboard (300 game px a second, 7.7 device px a frame on that phone) the
 * world slid 10 px, then 5, then 8: the eye reads it as a lower frame rate.
 * No resolution and no missing building changes it, and a computer does it
 * too (the judges' "not smooth", the same day).
 *
 * THE RULE.  The step a frame is the MEAN of the last SMOOTH_FRAMES frames'
 * measured lengths.  A late start and the short frame after it are in the
 * same mean, so they cancel: the phone's wobble of +-6 ms a frame becomes
 * +-0.6.  Every measured ms is still spent, once, a tenth at a time, so you
 * cover exactly the ground the clock says (the worker's own check on your
 * speed is on the same clock: movement.js MOVE_BUDGET).
 *
 * A frame longer than SMOOTH_MAX_MS (50 ms: three frames, the cap the step
 * already had) is a BREAK -- a tab coming back, a stall -- and is taken as
 * it is, as before, and the mean starts again after it.  So below 20 frames
 * a second nothing changes at all: every phone test on the QA box, which
 * draws a few frames a second, steps exactly as it did.
 *
 * `?dtsmooth=0` in the address is the old way for one tab (the owner's own
 * comparison on the phone).  No imports: node tests it
 * (server/test/frame-clock.test.mjs); mp-steadystep plays the phone's wobble
 * to the real game.
 */

export const SMOOTH_FRAMES = 10;
export const SMOOTH_MAX_MS = 50;

/** Is the steady step on?  The address: `dtsmooth=0` (or off, false) is the
 *  old way; anything else, on. */
export function frameSmoothOn(search) {
  return !/(^|[?&])dtsmooth=(0|off|false)(&|$)/.test(typeof search === 'string' ? search : '');
}

/** A clock for one game loop: step(raw) takes the frame's measured length in
 *  ms and gives the length to move by. */
export function makeFrameClock(n = SMOOTH_FRAMES, maxMs = SMOOTH_MAX_MS) {
  const buf = new Float64Array(Math.max(1, n | 0));
  let count = 0, at = 0, sum = 0;
  const reset = () => { count = 0; at = 0; sum = 0; };
  return {
    step(raw) {
      /* no length, or a break: as it is, and the mean starts again */
      if (!(raw > 0) || raw > maxMs) { reset(); return raw; }
      if (count === buf.length) sum -= buf[at]; else count++;
      buf[at] = raw;
      sum += raw;
      at = (at + 1) % buf.length;
      /* (the running sum is made afresh once a lap, so its rounding never builds up) */
      if (at === 0 && count === buf.length) { sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i]; }
      return sum / count;
    },
    reset,
    /* QA: how many frames the mean is over now */
    held() { return count; },
  };
}
