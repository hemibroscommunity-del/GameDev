/* ═══ v2.3.6543: THE SIGHT LINE'S LEAF (card CT PR 4: the two-button trial) ═══
 *
 * The owner, 2026-11-23: "The line of site will become visible if it's
 * within target range of the monster."  In the two buttons (`?manual=5`) a
 * line from the body to the monster in sight, drawn with the bow's own
 * stream (the aim beam's drawing), so the trial adds no new look.
 *
 * beamStream is the stream's drawing, moved here VERBATIM from
 * effectsRenderer.js's overlays (the bow's sight beam, v2.3.938 to
 * v2.3.2448): its body byte for byte, its comments with it; only the
 * function's line is new, its parameters the names the body read there.
 * The renderer calls it where the body was, and drawSightLine calls it too.
 *
 * WHAT is drawn is game/sight.js sightLine's (a node suite tests it); this
 * only draws.  Nothing while the bow's own beam is drawn this frame
 * (`beamDrawn`): the bow's line already points at the lock, and two
 * streams over each other would double its light.
 *
 * A leaf imports nothing from the renderers (four-lines' IMPORT_CYCLE_FILES
 * has no room). */
import { sightLine } from '../../game/sight.js';   /* relative: node imports this leaf (server/test/sight.test.mjs 9) */

/* the bow's stream between a point and a heading, `lineLen` long, into `gfx`
   (one closed polygon, white at 0.2: the overlay graphic's, cleared each
   frame by its owner) */
export function beamStream(gfx, _beamOrigin, aimA, lineLen, now) {
        const halfW = 2;          // half-width of beam at neutral
        const waveAmp = 1.6;      // edge wave amplitude in px
        const waveLen = 42;       // px per wave cycle along the beam
        const phase = (now / 600) * Math.PI * 2;  // ~600 ms per wave-shift
        /* v2.3.2448: SEGMENTS FOLLOW THE LENGTH.  24 of them over 280 px was
           ~12 px per step, comfortably inside the 42 px wave cycle.  Left
           fixed over 675+ px each step spans ~28 px -- two thirds of a cycle --
           and the sine is sampled so coarsely that the edges read as a zigzag
           of straight chords instead of a flowing stream.  Same ~12 px step at
           any length, floored at the old count so nothing shortens. */
        const segments = Math.max(24, Math.round(lineLen / 12));
        const cosA = Math.cos(aimA), sinA = Math.sin(aimA);
        // Perpendicular unit vector (rotate aim by +90°).
        const perpX = -sinA, perpY = cosA;
        /* v2.3.938: for a bow, start the beam at the teal grip (where the arrow
           actually launches from, published by the bow stand-in) instead of the
           player's feet, so the arrow flies down the MIDDLE of the line of
           sight rather than parallel-and-offset to it.  Staff/melee keep the
           feet origin; if no grip has been published yet, fall back to feet. */
        /* v2.3.2320: the origin is the one hoisted above the probe — the same
           point the angle was measured from, and the same point the probe
           reports.  It used to be recomputed here, which is how the beam came
           to draw from the grip along an angle taken from the feet. */
        const originX = _beamOrigin.x;
        const originY = _beamOrigin.y;
        const top = [];
        const bot = [];
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const dist = t * lineLen;
          const bx = originX + cosA * dist;
          const by = originY + sinA * dist;
          // Wave moves backward along the beam over time (phase increases).
          const wavePos = (dist / waveLen) * Math.PI * 2 - phase;
          const topW = halfW + Math.sin(wavePos) * waveAmp;
          const botW = halfW + Math.sin(wavePos + Math.PI) * waveAmp;
          top.push(bx + perpX * topW, by + perpY * topW);
          bot.push(bx - perpX * botW, by - perpY * botW);
        }
        // Build closed polygon: top forward, then bottom in reverse.
        gfx.moveTo(top[0], top[1]);
        for (let i = 2; i < top.length; i += 2) gfx.lineTo(top[i], top[i + 1]);
        for (let i = bot.length - 2; i >= 0; i -= 2) gfx.lineTo(bot[i], bot[i + 1]);
        gfx.closePath();
        gfx.fill({ color: 0xffffff, alpha: 0.2 });}

/* QA (house style: __btSightBeam beside the bow's): whether the sight line
   was drawn on the last frame, to which monster and how long -- a scenario
   cannot read a polygon.  Written in place, one object (no garbage a frame). */
const _drawn = { drawn: false, id: null, len: 0, at: 0, skipped: null };
const _O = { x: 0, y: 0 };   /* the line's start, reused */
if (typeof window !== 'undefined') {
  window.__btSightLine = function () { return { drawn: _drawn.drawn, id: _drawn.id == null ? null : String(_drawn.id), len: Math.round(_drawn.len), at: _drawn.at, skipped: _drawn.skipped }; };
}

/** The two buttons' sight line, into the overlay graphic, once a frame.
 *  `beamDrawn` the bow's own beam drawn this frame (then nothing). */
export function drawSightLine(gfx, S, now, beamDrawn) {
  const ln = sightLine(S, Date.now());   /* the sight's own clock (sight.js sightStep runs on Date.now()) */
  _drawn.drawn = false;
  if (!ln) { _drawn.id = null; _drawn.skipped = null; return false; }
  _drawn.id = ln.id; _drawn.at = Date.now();
  if (beamDrawn) { _drawn.skipped = 'bow-beam'; return false; }
  if (!gfx || !(ln.d > 1)) { _drawn.skipped = 'none'; return false; }
  _drawn.skipped = null;
  _drawn.len = ln.d;
  _O.x = ln.x0; _O.y = ln.y0;
  beamStream(gfx, _O, Math.atan2(ln.y1 - ln.y0, ln.x1 - ln.x0), ln.d, now);
  _drawn.drawn = true;
  return true;
}
