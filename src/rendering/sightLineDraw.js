/* ═══ v2.3.6544: THE SIGHT LINE, ONCE A FRAME, AND ITS QA RECORD (card CT PR 5) ═══
 *
 * PR 4 (v2.3.6543) drew the two buttons' sight line from a leaf that also
 * made the line from the state and kept the record behind `__btSightLine`.
 * Main's leaves guard (v2.3.6521/6526) holds a leaf to no module state, no
 * page global and no state handed to a non-leaf, so those three moved here,
 * a small module beside the renderers: it asks game/sight.js sightLine for
 * the line (the sight's own clock: sightStep runs on Date.now()), hands it
 * to the leaf's sightStream to draw, and notes what happened.
 *
 * The renderer's call is the same as PR 4's (sight.test 10 reads it):
 * `drawSightLine(gfx, S, now, shouldDraw && isBow)` in its overlays.
 *
 * QA (house style: __btSightBeam beside the bow's): whether the sight line
 * was drawn on the last frame, to which monster and how long -- a scenario
 * cannot read a polygon (mp-twobuttons reads it).  Written in place, one
 * object (no garbage a frame). */
import { sightLine } from '../game/sight.js';   /* relative: node imports this (server/test/sight.test.mjs 9) */
import { sightStream } from './leaves/effects-sight.js';

const _drawn = { drawn: false, id: null, len: 0, at: 0, skipped: null };
if (typeof window !== 'undefined') {
  window.__btSightLine = function () { return { drawn: _drawn.drawn, id: _drawn.id == null ? null : String(_drawn.id), len: Math.round(_drawn.len), at: _drawn.at, skipped: _drawn.skipped }; };
}

/** The two buttons' sight line, into the overlay graphic, once a frame.
 *  `beamDrawn` the bow's own beam drawn this frame (then nothing).  True
 *  when drawn. */
export function drawSightLine(gfx, S, now, beamDrawn) {
  const ln = sightLine(S, Date.now());
  const how = sightStream(gfx, ln, now, beamDrawn);
  _drawn.drawn = how === 'drawn';
  if (!ln) { _drawn.id = null; _drawn.skipped = null; return false; }
  _drawn.id = ln.id; _drawn.at = Date.now();
  _drawn.skipped = how === 'drawn' ? null : how;
  if (how === 'drawn') _drawn.len = ln.d;
  return _drawn.drawn;
}
