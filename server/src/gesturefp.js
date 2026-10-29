/* ═══ v2.3.3725: THE HARVEST'S RAW GESTURE, MEASURED BY THE SERVER
 * (spec: docs/specs/gesture-points.md; the plan: docs/HIDDEN-SERVER-PLAN.md,
 * "The anti-bot plan" 2 and 3) ═══
 *
 * Since v2.3.694 the phone has sent a SUMMARY of each harvest gesture
 * (node_strike.swipeFp {len, n, dur, ent, tv, vc, h}), computed on the phone,
 * and botfp.js judged it -- so a script sent whatever summary passes
 * (antibot-review.md §2).  A phone that sees `caps.gesturepts` now sends the
 * gesture's own POINTS instead (`g`, src/game/gesturePoints.js): each sample's
 * step from the last, x and y as signed bytes and its time as an unsigned one,
 * base64 -- up to GPTS.MAX points, about 400 characters for 100.  The server
 * rebuilds the path and computes the summary ITSELF, with the same arithmetic
 * the phone used (ExtractionSwipeLayer.jsx; gesture-points.test holds the two
 * to the same numbers), and botfp judges that.  A script now has to draw a
 * path that passes, not type one.  The message is bigger, not more frequent:
 * Cloudflare bills incoming messages by count.
 *
 * Old phones (no `g`) and the v1 protocol keep the summary path unchanged.  A
 * `g` that does not decode is a strike with no fingerprint (botfp's
 * permissive, counted path, never 'perfect').  `gesturepts: false` in the live
 * flags un-advertises the cap (phones go back to the summary) and ignores any
 * `g` that still arrives. */

export const GPTS = {
  MAX: 160,            // points a gesture may carry (a 1.5 s gesture at 60 Hz is ~90)
  B64_MAX: 900,        // characters: 160 points x 3 bytes, base64
  FLAG: 'gesturepts',
};

/* base64 -> bytes, without Buffer (a worker has atob; node 16+ too) */
function b64Bytes(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* `g` -> [{x, y, t}] (relative to the first point), or null when it is not
   a gesture this worker reads */
export function decodeGesturePts(g) {
  if (!g || typeof g !== 'object' || g.v !== 1 || typeof g.b !== 'string') return null;
  if (g.b.length === 0 || g.b.length > GPTS.B64_MAX || !/^[A-Za-z0-9+/]+={0,2}$/.test(g.b)) return null;
  let bytes;
  try { bytes = b64Bytes(g.b); } catch (e) { return null; }
  if (bytes.length % 3 !== 0 || bytes.length / 3 > GPTS.MAX) return null;
  const pts = [{ x: 0, y: 0, t: 0 }];
  let x = 0, y = 0, t = 0;
  for (let i = 0; i < bytes.length; i += 3) {
    const dx = bytes[i] > 127 ? bytes[i] - 256 : bytes[i];
    const dy = bytes[i + 1] > 127 ? bytes[i + 1] - 256 : bytes[i + 1];
    x += dx; y += dy; t += bytes[i + 2];
    pts.push({ x, y, t });
  }
  return pts;
}

/* ── the summary, the phone's arithmetic (ExtractionSwipeLayer.jsx) ── */
function vectorEntropy(samples) {
  if (samples.length < 4) return 0;
  let totalAngleDelta = 0;
  let prevAng = null;
  for (let i = 1; i < samples.length; i++) {
    const ax = samples[i].x - samples[i - 1].x;
    const ay = samples[i].y - samples[i - 1].y;
    if (ax === 0 && ay === 0) continue;
    const ang = Math.atan2(ay, ax);
    if (prevAng != null) {
      let d = Math.abs(ang - prevAng);
      if (d > Math.PI) d = 2 * Math.PI - d;
      totalAngleDelta += d;
    }
    prevAng = ang;
  }
  return totalAngleDelta / Math.max(1, samples.length - 2);
}
function timingVariance(samples) {
  if (samples.length < 4) return 0;
  const dts = [];
  for (let i = 1; i < samples.length; i++) dts.push(samples[i].t - samples[i - 1].t);
  const mean = dts.reduce((a, b) => a + b, 0) / dts.length;
  let v = 0;
  for (const d of dts) v += (d - mean) * (d - mean);
  return v / dts.length;
}
function velocityCurvature(samples) {
  if (samples.length < 5) return 0;
  const sp = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = Math.max(1, samples[i].t - samples[i - 1].t);
    sp.push(Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y) / dt);
  }
  const mean = sp.reduce((a, b) => a + b, 0) / sp.length || 1;
  let acc = 0;
  for (let i = 1; i < sp.length; i++) acc += Math.abs(sp[i] - sp[i - 1]);
  return Number(((acc / Math.max(1, sp.length - 1)) / mean).toFixed(3));
}
/* the replay hash, on the points as sent (relative, whole px): a script that
   replays one recording replays one hash */
function pathHash(samples) {
  let h = 0x811c9dc5;
  for (let i = 0; i < samples.length; i++) {
    const qx = (samples[i].x >> 3) & 0xff, qy = (samples[i].y >> 3) & 0xff;
    h ^= qx; h = Math.imul(h, 0x01000193);
    h ^= qy; h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function fpFromPts(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return {
    len: Math.round(len),
    ent: Number(vectorEntropy(pts).toFixed(3)),
    dur: pts.length ? pts[pts.length - 1].t - pts[0].t : 0,
    n: pts.length,
    tv: Math.round(timingVariance(pts)),
    vc: velocityCurvature(pts),
    h: pathHash(pts),
    src: 'server',
  };
}

export const gestureFpMethods = {
  _gesturePtsOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, GPTS.FLAG) && !f[GPTS.FLAG]);
  },

  /* The fingerprint a strike is judged by: undefined when it carries no
     points (or the switch is off) -- the phone's summary, as before; null
     when its points do not decode -- no fingerprint; else the server's own. */
  _gesturePtsFp(payload) {
    if (!payload || payload.g == null || !this._gesturePtsOn()) return undefined;
    const pts = decodeGesturePts(payload.g);
    if (!pts) return null;
    return fpFromPts(pts);
  },
};
