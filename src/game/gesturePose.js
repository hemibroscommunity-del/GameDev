/* ═══ v2.3.2232: GESTURE PHASE -> POSE PHASE, AT A LEISURELY CAP ═══
 *
 * Owner: "the animation frames will play at the speed the user is performing
 * the gesture (capped at a maximum speed not faster than a leisurely gesture
 * pace)."
 *
 * Returns the 0..1 phase a harvest animation should show, or null when the
 * clock loop should run instead (no extraction, or its window not open yet
 * -- control-redesign.md §5.11: a frozen figure for a ten-second wind-up
 * reads as a hang, so the wind-up keeps its slow loop and the gesture takes
 * over at `ready`).
 *
 * The DISPLAY phase chases the RAW gesture phase (ex.cueFrame01, written by
 * ExtractionSwipeLayer as the thumb moves on the right button) at most one
 * full cycle per `fullCycleMs` -- the v2.3.1435 chase the reel and pan
 * markers already used, moved onto the extraction record (ex._posF/_posT)
 * so it dies with the attempt.  `wraps` treats the phase as circular (the
 * reel, the cook flip), so a crank never unwinds backwards across the seam.
 * A still thumb holds the pose: no drift, no idle loop.
 *
 * Shared by entityRenderer (the mine/fish body poses) and effectsRenderer
 * (the chop/cook stand-ins) so the two cannot drift apart. */
export function gesturePose01(ex, now, fullCycleMs, wraps) {
  if (!ex || ex.status !== 'ready') return null;
  const raw = Math.max(0, Math.min(0.9999, ex.cueFrame01 || 0));
  const lastT = ex._posT || now;
  const dt = Math.max(0, Math.min(100, now - lastT));
  ex._posT = now;
  let cur = (ex._posF != null) ? ex._posF : raw;
  const rate = dt / Math.max(1, fullCycleMs);
  let d = raw - cur;
  if (wraps) { if (d > 0.5) d -= 1; else if (d < -0.5) d += 1; }
  cur = cur + Math.max(-rate, Math.min(rate, d));
  if (wraps) cur = ((cur % 1) + 1) % 1;
  else cur = Math.max(0, Math.min(0.9999, cur));
  ex._posF = cur;
  return cur;
}

/* v2.3.2232: the owner's painted gesture strips, for the button face.  A
   MIRROR of GESTURE_TOOLS in effectsRenderer.js (which slices the same files
   into Pixi textures for the chop-strike burst anchors); the URLs are the
   only thing shared, and mirror-audit pins the two lists equal. */
export const GESTURE_TOOL_URLS = {
  mining:      '/sprites/tools/pickaxe-gesture-v1.webp?v=2.3.1417',
  woodcutting: '/sprites/tools/axe-gesture-v1.webp?v=2.3.1417',
  fishing:     '/sprites/tools/reel-gesture-v1.webp?v=2.3.1417',
  cooking:     '/sprites/tools/pan-gesture-v2.webp?v=2.3.1433',
};
