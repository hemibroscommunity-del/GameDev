/* ═══ v2.3.3725: THE HARVEST'S RAW GESTURE, PACKED FOR THE SERVER ═══
 *
 * The plan (docs/HIDDEN-SERVER-PLAN.md, "The anti-bot plan" 2): the phone
 * sends the swipe's own points inside the node_strike it already sends, and
 * the server computes the measures itself (server/src/gesturefp.js), so a
 * script must draw a path that passes rather than type a summary that does.
 *
 * The packing, `{v: 1, b}`: each sample's step from the one before, x and y
 * rounded to whole px as signed bytes and its time in ms as an unsigned byte,
 * base64 -- 3 bytes a point, about 400 characters for a 100-point gesture.
 * Steps are taken between ROUNDED places and times, so rounding never adds
 * up along the path; a step past a byte (a jump over 127 px, a pause over
 * 255 ms) is held to the byte.  More than GESTURE_PTS_MAX points are thinned
 * evenly, first and last kept.  Sent only to a worker that says
 * `caps.gesturepts` (lifeSkillRewards.js); the server's decoder is held to
 * this by server/test/gesture-points.test.mjs.
 *
 * Pure, no imports: node tests it. */

export const GESTURE_PTS_MAX = 160;

const clampByte = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* samples [{x, y, t}] -> {v: 1, b} or null (fewer than two points) */
export function encodeGesturePoints(samples, max) {
  if (!Array.isArray(samples) || samples.length < 2) return null;
  const cap = Math.max(2, max || GESTURE_PTS_MAX);
  let pts = samples;
  if (pts.length > cap) {
    const out = [];
    for (let i = 0; i < cap; i++) out.push(samples[Math.round(i * (samples.length - 1) / (cap - 1))]);
    pts = out;
  }
  const bytes = [];
  let px = Math.round(pts[0].x), py = Math.round(pts[0].y), pt = Math.round(pts[0].t);
  for (let i = 1; i < pts.length; i++) {
    const x = Math.round(pts[i].x), y = Math.round(pts[i].y), t = Math.round(pts[i].t);
    const dx = clampByte(x - px, -128, 127), dy = clampByte(y - py, -128, 127), dt = clampByte(t - pt, 0, 255);
    bytes.push(dx & 0xff, dy & 0xff, dt);
    /* the next step is from where this one actually lands */
    px += dx; py += dy; pt += dt;
  }
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return { v: 1, b: btoa(bin) };   /* btoa: every browser, and node 16+ */
}
