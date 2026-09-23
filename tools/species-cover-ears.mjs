#!/usr/bin/env node
/* v2.3.2673: paint the bro's own (human) ear out of a species trait.

   WHY.  The monkey ears (public/sprites/traits/species/monkey/) are drawn to
   sit where a monkey's ear goes, which on SOUTHWEST and NORTHEAST is BESIDE the
   bro's ear, not on top of it -- so the human ear's dark "C" still showed next
   to the new ear.  SOUTHWEST is the portrait facing, so it showed everywhere.
   The body sheets are shared by every bro and can't be edited for one species;
   the trait draws over the body, so the fix is to extend the trait with fur
   over the old ear.

   HOW.  For each facing listed in REGIONS (a box in 256-space body pixels
   around the old ear, hand-picked from `stand-<dir>` with the ASCII overlay),
   every body pixel in the box that is
     - opaque, not skin (the ear's outline / shading), and not already covered
       by the trait,
     - INTERIOR (no transparent 8-neighbour -- the head's own silhouette stays,
       a monkey has a head outline too),
   and every skin pixel in the box shaded off the head's flat tone (the ear's
   inside -- painting only the outline left a pale ghost "C"), is painted into
   the trait PNG, plus a 1px ring around it so a frame that bobs a pixel against
   the crown anchor still hides the ear.  The paint is ONE flat colour: the
   head's median skin luminance run through playerSkins' `_retint` with the
   species tone -- i.e. the colour the head already is around the ear.

   CONSEQUENCE.  The patch is baked in ONE skin colour (--tone, default Monkey
   Brown 85,56,23).  v2.3.2678: tools/species_frames.py bake then lifts every
   such pixel into a separate <dir>.fur.png of bare skin that the renderer
   recolours with the player's skin, so the monkey is NOT tied to this tone --
   re-run the bake after this tool.

   Placement is _placeTrait's arithmetic (entityRenderer.js): trait pixel p lands
   on body pixel  p - anchor + bodyTop + crownNudge.  anchors/crownNudge in
   meta.json are NOT touched.  Idempotent: once covered, a pixel is skipped, so
   a second run changes nothing.  Re-run after any re-import of the trait:
     node tools/species-cover-ears.mjs --id monkey */
import fs from 'node:fs';
import { decode, encode } from './png.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ID = arg('--id', 'monkey');
const TONE = arg('--tone', '85,56,23').split(',').map(Number);
const SKIN_REF = 149;                               /* playerSkins.js SKIN_REF */
/* [x0, x1, y0, y1] in stand-<dir> 256-space, inclusive */
const REGIONS = {
  monkey: {
    southwest: [136, 147, 40, 61],
    northeast: [133, 140, 54, 69],
  },
};
const regions = REGIONS[ID];
if (!regions) { console.error(`no ear regions for species '${ID}'`); process.exit(1); }

const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
const DIR = `public/sprites/traits/species/${ID}`;
const META = JSON.parse(fs.readFileSync(`${DIR}/meta.json`, 'utf8'));
const TOPS = JSON.parse(fs.readFileSync('public/sprites/player/body-tops.json', 'utf8'));

for (const [d, [X0, X1, Y0, Y1]] of Object.entries(regions)) {
  const B = decode(fs.readFileSync(`public/sprites/player/stand-${d}.png`));
  const file = `${DIR}/${d}.png`, T = decode(fs.readFileSync(file));
  const px = (x, y) => { if (x < 0 || y < 0 || x > 255 || y > 255) return [0, 0, 0, 0];
    const i = (y * B.width + x) * 4; return [B.data[i], B.data[i + 1], B.data[i + 2], B.data[i + 3]]; };
  const top = TOPS[`stand-${d}-0`], a = META.anchors[d], n = META.crownNudge[d] || [0, 0];
  const ox = top[0] + n[0] - a[0], oy = top[1] + n[1] - a[1];
  const ti = (x, y) => ((y - oy) * T.width + (x - ox)) * 4;
  const covered = (x, y) => T.data[ti(x, y) + 3] > 16;
  const interior = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
    if (px(x + dx, y + dy)[3] <= 40) return false; return true; };

  /* the head's flat tone here: median luminance of the skin in and around the
     box (the ear's own shading is a minority of it) */
  const lum = (p) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
  const L = [];
  for (let y = Y0 - 4; y <= Y1 + 4; y++) for (let x = X0 - 4; x <= X1 + 4; x++) { const p = px(x, y); if (isSkin(...p)) L.push(lum(p)); }
  L.sort((p, q) => p - q);
  const base = L[L.length >> 1];
  const fur = TONE.map(c => Math.min(255, Math.round(c * base / SKIN_REF)));
  /* the old ear: anything in the box that is not flat head tone -- its outline
     AND its shaded inside (painting only the outline left a pale ghost "C") */
  const ear = [];
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const p = px(x, y);
    if (p[3] > 40 && !covered(x, y) && interior(x, y) && (!isSkin(...p) || Math.abs(lum(p) - base) > 4)) ear.push([x, y]);
  }
  const paint = new Map();
  for (const [x, y] of ear) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const X = x + dx, Y = y + dy;
    if (!covered(X, Y) && interior(X, Y)) paint.set(Y * 256 + X, [X, Y]);
  }
  for (const [x, y] of paint.values()) {
    const i = ti(x, y);
    T.data[i] = fur[0]; T.data[i + 1] = fur[1]; T.data[i + 2] = fur[2]; T.data[i + 3] = 255;
  }
  const n0 = paint.size;
  fs.writeFileSync(file, encode(T));
  console.log(`${d.padEnd(10)} old-ear px ${String(ear.length).padStart(3)}  painted ${String(n0).padStart(3)} (incl. 1px ring)  base lum ${base.toFixed(1)} -> fur ${fur}`);
}
