/* ═══ v2.3.4359: THE STORM EYE'S LIGHTNING, IN PIXELS ═══
 *
 * The owner, 2026-11-10: "avoid marking cartoonish shapes. Make water effects
 * with pixelation similar to how you made the flame effects (burning log
 * fire, burning buildings, etc)" -- said of the water, and as true of this:
 * the first cut (v2.3.4356) stroked smooth jagged lines on a canvas and
 * turned them to any angle.  This is the campfire's way (campfireArt.js):
 * every piece a few HARD pixels, on a stepped ramp of the eye's own iris,
 * sampled nearest, never turned or scaled off the grid.  A bolt is baked
 * three ways -- upright, lying, and on the slant -- and the other ways are
 * those flipped (lightning has no lit side to keep).
 *
 * No imports: the node suite reads the maps as they are.
 *
 *   STORM_RAMP    letter -> [rgb, alpha]: O the deep edge, B the bolt's pale
 *                 body, W its white core, Y a spark's hot middle
 *   STORM_PIXELS  name -> rows of letters, one a pixel
 *     bv, bh, bd   a bolt: upright, lying, on the slant (top-left to
 *                  bottom-right)
 *     av, ah, ad   an arc: the same three, short -- what jumps over the eye
 *     s3, s5       a spark, 3 and 5 px across
 */
export const STORM_RAMP = Object.freeze({
  O: [0x1f4fb0, 255], B: [0x9fe3ff, 255], W: [0xffffff, 255], Y: [0xfff6a8, 255],
});

/* a bolt through `pts` on a w x h grid: a one-pixel white core (each leg a
   straight run of pixels), the pale body on the pixels beside it, the deep
   edge on the pixels beside those -- so it reads on the Foundry's pale floor
   and over the eye's own white */
function bolt(w, h, pts) {
  const g = Array.from({ length: h }, () => new Array(w).fill('.'));
  const core = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    let [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      core.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  const set = (x, y, ch, over) => { if (x >= 0 && y >= 0 && x < w && y < h && over.indexOf(g[y][x]) >= 0) g[y][x] = ch; };
  for (const [x, y] of core) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2) set(x + dx, y + dy, 'O', '.');
  for (const [x, y] of core) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(x + dx, y + dy, 'B', '.O');
  for (const [x, y] of core) set(x, y, 'W', '.OB');
  return g.map((r) => r.join(''));
}
const lying = (rows) => rows[0].split('').map((_, x) => rows.map((r) => r[x]).join(''));

const BV = bolt(9, 17, [[4, 2], [3, 5], [5, 7], [3, 10], [5, 12], [4, 14]]);
const AV = bolt(7, 11, [[3, 2], [2, 4], [4, 6], [3, 8]]);
export const STORM_PIXELS = Object.freeze({
  bv: BV,
  bh: lying(BV),
  bd: bolt(15, 15, [[2, 2], [5, 4], [6, 7], [9, 8], [10, 11], [12, 12]]),
  av: AV,
  ah: lying(AV),
  ad: bolt(10, 10, [[2, 2], [4, 3], [5, 6], [7, 7]]),
  s3: ['.O.', 'OWO', '.O.'].map((r, y) => (y === 1 ? 'BWB' : '.B.')),
  s5: ['..O..', '.OBO.', 'OBYBO', '.OBO.', '..O..'],
});
