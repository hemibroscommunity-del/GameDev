/* ═══ v2.3.1932: SOUTHWEST PREVIEWS FOR THE TRAIT-PICKER OPTION TILES ═══
 *
 * Owner: "For the trait picker option previews (options within each trait
 * category) can you actually show the southwest orientation instead of the
 * current south face?"
 *
 * The tiles were showing `thumb.png`, which is the SOUTH (dead-on front) view —
 * symmetric and flat, so a swept fringe reads as a blob and an angled helmet
 * reads as a dome.  Southwest is the three-quarter view: it is what the
 * character sheet already draws (CharacterView, v2.3.1815, picked for exactly
 * this reason — three-quarter shows the front AND the side), so the picker now
 * agrees with the figure it is dressing.
 *
 * WHY NOT JUST POINT THE TILE AT southwest.png.  That file is a COMPOSITING
 * FRAME: a 128 or 256 square with the trait sitting whereever it lands on the
 * body, mostly empty.  The tile is `object-fit: contain`, so it would scale the
 * whole empty square down and the item would render at a third of the size it
 * does today — a change nobody asked for on top of the one they did.
 * `thumb.png` is a TIGHT CROP, which is why items currently fill their tile.
 *
 * So this crops the southwest art to its own content the same way, preserving
 * today's framing and changing only the angle.  It prefers `hi/southwest.png`
 * (256) over `southwest.png` (128) so the tile has real pixels to downscale
 * from on a 3x phone.
 *
 * Output: thumb-sw.png beside thumb.png, for every trait in the four categories
 * the picker actually shows as thumbnails.  Skin, Eyes, Pants and Shoes are
 * colour swatches with no art and no orientation, so they are not here.
 *
 *   node tools/ui/make-southwest-thumbs.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode, encode } from '../png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ROOT = path.join(REPO, 'public/sprites/traits');
/* The four the picker renders as thumbnails — _typeDefs' `spriteCat` values. */
const CATS = ['hair', 'headwear', 'facialhair', 'shirt'];
const CHECK = process.argv.includes('--check');

function bbox(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      if (p.data[(y * p.width + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

let made = 0, skipped = 0, missing = [];
for (const cat of CATS) {
  const dir = path.join(ROOT, cat);
  if (!fs.existsSync(dir)) continue;
  for (const id of fs.readdirSync(dir).sort()) {
    const base = path.join(dir, id);
    if (!fs.statSync(base).isDirectory()) continue;
    /* 'none' is a UI option, not art — the tile paints its own icon. */
    if (id === 'none') continue;
    const src = ['hi/southwest.png', 'southwest.png'].map((f) => path.join(base, f)).find((f) => fs.existsSync(f));
    if (!src) { missing.push(`${cat}/${id}`); continue; }
    const img = decode(fs.readFileSync(src));
    const b = bbox(img);
    if (!b) { missing.push(`${cat}/${id} (empty)`); continue; }
    const out = new Uint8ClampedArray(b.w * b.h * 4);
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        const s = ((b.y0 + y) * img.width + (b.x0 + x)) * 4, d = (y * b.w + x) * 4;
        out[d] = img.data[s]; out[d + 1] = img.data[s + 1]; out[d + 2] = img.data[s + 2]; out[d + 3] = img.data[s + 3];
      }
    }
    const dest = path.join(base, 'thumb-sw.png');
    if (CHECK) { if (!fs.existsSync(dest)) missing.push(`${cat}/${id} (not built)`); else skipped++; continue; }
    fs.writeFileSync(dest, encode({ width: b.w, height: b.h, data: out }));
    made++;
  }
}
if (CHECK) { console.log(`check: ${skipped} present, ${missing.length} missing`); if (missing.length) { console.log(missing.join('\n')); process.exit(1); } }
else console.log(`wrote ${made} thumb-sw.png` + (missing.length ? `; NO SOUTHWEST ART for ${missing.length}:\n  ${missing.join('\n  ')}` : ''));
