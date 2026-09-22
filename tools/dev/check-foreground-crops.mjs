/* EVERY PRE-CUT EDGE OF A FOREGROUND PIECE MUST LIE OUTSIDE THE MAP (v2.3.2655).
 *
 *   node tools/dev/check-foreground-crops.mjs
 *
 * ZONE_FOREGROUND (src/data/worldProps.js) places EDGE-CROPPED art -- canopies
 * and crag shoulders whose ink runs off their own canvas.  The crop is what
 * makes them read as continuing past the frame, and it only works while the
 * cut is off-screen.  A cut that lands inside the playfield draws as a hard
 * straight seam: a pasted rectangle over the map.
 *
 * WHY THIS IS A SCRIPT AND NOT AN ASSERTION IN THE SCENARIO.  v2.3.2655 put
 * the peak in the north-east with its bottom cut at y 370 -- a seam straight
 * across the middle of frost -- and FOUR passing browser assertions covered
 * that exact piece: it was drawn, on the foreground layer, at its declared
 * worldH, correctly mirrored.  None of them can see a seam, because a seam is
 * a relationship between the ART's alpha and the MAP's bounds and neither the
 * renderer nor the scene graph knows anything about it.  A screenshot caught
 * it; this makes sure a screenshot never has to again.
 *
 * In a 32x32 zone the camera never scrolls vertically (worldViewport's
 * per-zone floor, v2.3.2247: a 1024px view over a 1024px map), so a bottom or
 * top cut has to clear the MAP edge.  Horizontally the camera does scroll, so
 * the same rule applies and is simply easier to satisfy.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from '../png.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { ZONE_FOREGROUND } = await import(join(REPO, 'src/data/worldProps.js'));
const { ZONES } = await import(join(REPO, 'src/data/zones.js'));
const TILE = 32;

/* Fraction of a canvas edge that must carry ink before it counts as a CUT,
   as opposed to a few antialiased pixels grazing the canvas bound.

   CHOSEN FROM THE MEASURED DISTRIBUTION, not picked to make the suite pass.
   Across the three pieces shipped at v2.3.2655 the edge runs are:

     frost-peak-corner    top 1%   bottom 100%  left 73%  right 3%
     frost-pine-canopy-a  top 1%   bottom 1%    left 24%  right 1%
     frost-pine-canopy-b  top 1%   bottom 70%   left 43%  right 1%

   Real cuts are 24-100%; incidental grazes are 1-3%.  Nothing lands between
   them, so any threshold in that gap is equivalent and 12% sits in the middle
   of it.  It would still have failed the bug this script was written for --
   a bottom cut at 100% placed mid-map -- by a factor of eight. */
const EDGE_MIN = 0.12;
const A_MIN = 8;

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };
const pass = (m) => console.log('PASS ' + m);

for (const [zoneId, list] of Object.entries(ZONE_FOREGROUND || {})) {
  const zone = ZONES[zoneId];
  if (!zone) { fail(`${zoneId}: no such zone`); continue; }
  const mapW = zone.w * TILE, mapH = zone.h * TILE;

  for (const f of list) {
    const file = join(REPO, 'public', String(f.sprite).replace(/^\//, ''));
    let img;
    try { img = decode(readFileSync(file)); }
    catch (e) { fail(`${f.id}: cannot read ${f.sprite}`); continue; }
    const { width: w, height: h, data } = img;

    const rowInk = (y) => { let n = 0; for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > A_MIN) n++; return n / w; };
    const colInk = (x) => { let n = 0; for (let y = 0; y < h; y++) if (data[(y * w + x) * 4 + 3] > A_MIN) n++; return n / h; };

    /* The art's own cut edges... */
    const cut = { top: rowInk(0), bottom: rowInk(h - 1), left: colInk(0), right: colInk(w - 1) };
    /* ...remapped through flipX, because a mirrored piece's LEFT cut is drawn
       on its right. Getting this backwards would pass the broken placement. */
    const drawn = f.flipX
      ? { top: cut.top, bottom: cut.bottom, left: cut.right, right: cut.left }
      : cut;

    /* World-space box: centre anchor, scaled to worldH (entityRenderer). */
    const wh = f.worldH || h;
    const ww = wh * (w / h);
    const box = { left: f.x - ww / 2, right: f.x + ww / 2, top: f.y - wh / 2, bottom: f.y + wh / 2 };

    const bad = [];
    if (drawn.left > EDGE_MIN && box.left > 0) bad.push(`left cut (${(drawn.left * 100).toFixed(0)}% of that edge) sits at x=${box.left.toFixed(0)}, inside the map`);
    if (drawn.right > EDGE_MIN && box.right < mapW) bad.push(`right cut (${(drawn.right * 100).toFixed(0)}%) sits at x=${box.right.toFixed(0)} < ${mapW}`);
    if (drawn.top > EDGE_MIN && box.top > 0) bad.push(`top cut (${(drawn.top * 100).toFixed(0)}%) sits at y=${box.top.toFixed(0)}, inside the map`);
    if (drawn.bottom > EDGE_MIN && box.bottom < mapH) bad.push(`bottom cut (${(drawn.bottom * 100).toFixed(0)}%) sits at y=${box.bottom.toFixed(0)} < ${mapH}`);

    /* Every measurement is printed, pass or fail: a threshold nobody can see
       the inputs to is a threshold nobody can re-judge. */
    const edges = `top ${(drawn.top * 100).toFixed(0)}% bottom ${(drawn.bottom * 100).toFixed(0)}% left ${(drawn.left * 100).toFixed(0)}% right ${(drawn.right * 100).toFixed(0)}% (as drawn)`;
    if (bad.length) fail(`${zoneId}/${f.id}: ${bad.join('; ')}  [${edges}]`);
    else pass(`${zoneId}/${f.id}: every cut edge is off-map  [${edges}]`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
