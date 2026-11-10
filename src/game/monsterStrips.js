/* ═══ v2.3.4355: WHICH FRAME OF A MONSTER'S STRIP, AS PLAIN ARITHMETIC ═══
 *
 * The water frog (the Water Caves' monster: rendering/waterFrogSprites.js) is
 * the first look whose strips are played three new ways, and each is a rule
 * worth testing without a browser -- so they are here, with no imports, and
 * entityRenderer's variant branch only calls them (server/test/
 * water-frog.test.mjs holds them):
 *
 *   attackStripFrame   an attack strip with recovery frames at its end
 *   hopFinishPos       a hop that was interrupted, played out to its landing
 *   idleStripFrame     an idle strip looped by the clock
 */

/** The frame of an attack strip of `count` frames whose last `recover` play
 *  AFTER the blow.  The wind-up frames (the rest; the last of them is the
 *  blow) are spread evenly over the warning -- `windupMs` long, whatever the
 *  worker made it -- so the blow is on screen as the blow lands; then the
 *  recovery frames, one every `stepMs`.  `elapsed` is ms since the warning
 *  began.  With no recovery frames (or a strip too short to have a wind-up):
 *  a frame every stepMs, held on the last -- what every older strip does. */
export function attackStripFrame(elapsed, windupMs, count, recover, stepMs) {
  const n = count | 0;
  if (n <= 0) return 0;
  const step = stepMs > 0 ? stepMs : 70;
  const e = Math.max(0, +elapsed || 0);
  const rec = Math.max(0, recover | 0);
  if (rec <= 0 || n <= rec) return Math.min(n - 1, Math.floor(e / step));
  const wind = n - rec;
  const dur = Math.max(1, +windupMs || 0);
  if (e < dur) return Math.min(wind - 1, Math.floor((e / dur) * wind));
  return Math.min(n - 1, wind + Math.floor((e - dur) / step));
}

/** v2.3.4390: how far into a warning of `windupMs` an attack strip's wind-up
 *  frames BEGIN, when they are played over only the last `share` of it (the
 *  water frog's: half, so its frames go by twice as fast and the blow is
 *  still on screen as the blow lands).  Until then the monster does what it
 *  was doing (the frog breathes).  0 -- the whole warning -- for no share, a
 *  share of 1 or more, or anything that is not a share. */
export function attackWindDelay(windupMs, share) {
  const d = Math.max(0, +windupMs || 0);
  return share > 0 && share < 1 ? d * (1 - share) : 0;
}

/** How long an attack strip plays past its warning: its recovery. */
export function attackRecoverMs(recover, stepMs) {
  return Math.max(0, recover | 0) * (stepMs > 0 ? stepMs : 70);
}

/** A hopper that has stopped moving: where its hop has got to after `dtMs`
 *  more, played by the clock (`frameMs` a frame) -- never past the start of
 *  the next hop.  `pos` is its place in the loop, in frames (any real number:
 *  whole hops and a fraction); `count` the hop's frames.  Returns the new
 *  place; it is down when Math.floor(place) % count === 0 (hopIsDown).
 *  `airFrom`: the first frame it is off the ground on.  Before it (the
 *  crouch) a stopped hopper simply waits where it is, so one creeping along
 *  gathers itself over several steps and springs once, where finishing every
 *  frame would have it leaping on the spot for each pixel it moves. */
export function hopFinishPos(pos, count, dtMs, frameMs, airFrom) {
  const n = count | 0;
  if (n <= 1) return pos;
  if (hopIsDown(pos, n)) return pos;
  if (hopFrame(pos, n) < (airFrom | 0)) return pos;
  const next = Math.ceil(pos / n) * n;
  return Math.min(next, pos + Math.max(0, dtMs) / (frameMs > 0 ? frameMs : 60));
}

/** The frame of a hop of `count` frames at `pos`. */
export function hopFrame(pos, count) {
  const n = count | 0;
  if (n <= 1) return 0;
  return ((Math.floor(pos) % n) + n) % n;
}

/** Is a hop at `pos` (frames) on its first frame: on the ground, sitting? */
export function hopIsDown(pos, count) { return hopFrame(pos, count) === 0; }

/** Is a stopped hopper at `pos` still in the air (to be played down)? */
export function hopInAir(pos, count, airFrom) { return hopFrame(pos, count) >= Math.max(1, airFrom | 0); }

/** The frame of an idle strip of `count` frames at `now` (ms), `frameMs` a
 *  frame, started `offset` frames in (so a crowd does not breathe as one). */
export function idleStripFrame(now, count, frameMs, offset) {
  const n = count | 0;
  if (n <= 1) return 0;
  return ((Math.floor(now / (frameMs > 0 ? frameMs : 150)) + (offset | 0)) % n + n) % n;
}

/* ═══ v2.3.4356: A LOOK THAT FLOATS (the storm eye) ═══ */
/** How far a hovering look's sprite is lifted off the ground at `now` (ms),
 *  in its own sprite's measure (liveScalePx's): `hover.px` up, bobbing
 *  `hover.bob` either way every `hover.ms`, each monster from its own start
 *  (its spawn place: the same on every phone).  0 with no `hover`. */
export function hoverLift(hover, now, m) {
  if (!hover || !(hover.px >= 0)) return 0;
  const ms = hover.ms > 0 ? hover.ms : 1600;
  const start = (((m && m.spawnX) || 0) | 0) * 37 + (((m && m.spawnY) || 0) | 0) * 91;
  return hover.px + (hover.bob || 0) * Math.sin(((now + start) / ms) * Math.PI * 2);
}
