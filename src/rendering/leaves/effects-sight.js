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
 * The renderer calls it where the body was, and sightStream calls it too.
 *
 * WHAT is drawn is game/sight.js sightLine's (a node suite tests it), made
 * by the caller (../sightLineDraw.js, v2.3.6544); this only draws.
 * Nothing while the bow's own beam is drawn this frame
 * (`beamDrawn`): the bow's line already points at the lock, and two
 * streams over each other would double its light.
 *
 * A leaf imports nothing from the renderers (four-lines' IMPORT_CYCLE_FILES
 * has no room). */

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

/** The two buttons' sight line `ln` (game/sight.js sightLine's, or null),
 *  into the overlay graphic, once a frame.  `beamDrawn` the bow's own beam
 *  drawn this frame (then nothing).  Returns what happened, for the QA
 *  record its caller keeps: 'drawn', 'bow-beam', 'none' (no graphic, or on
 *  the body), or null (nothing in sight).
 *  v2.3.6544 (main's leaves guard, card CT PR 5): a leaf keeps no record,
 *  writes no page global and is handed no state, so the line comes in
 *  already made and the record and `__btSightLine` live with the caller
 *  (../sightLineDraw.js); the drawing itself is unchanged. */
export function sightStream(gfx, ln, now, beamDrawn) {
  if (!ln) return null;
  if (beamDrawn) return 'bow-beam';
  if (!gfx || !(ln.d > 1)) return 'none';
  beamStream(gfx, { x: ln.x0, y: ln.y0 }, Math.atan2(ln.y1 - ln.y0, ln.x1 - ln.x0), ln.d, now);
  return 'drawn';
}
