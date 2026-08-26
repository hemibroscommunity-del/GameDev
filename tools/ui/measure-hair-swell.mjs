/* ═══ v2.3.1943: HOW MUCH WIDER THAN A BARE HEAD IS EACH HAIRSTYLE? ═══
 *
 * Owner: "The K hat and the hairband don't work well with Afro."
 *
 * A headband is authored to fit a BARE HEAD -- the five stand sheets draw the
 * head 41-52px wide in the 256 frame -- so it overhangs a bald skull by a few
 * pixels and reads as worn.  Put it on an afro, which is half again as wide,
 * and the same band stops well short of the silhouette on both sides: it reads
 * as a sticker floating on a ball rather than a band around a head.
 *
 * The renderer can fix that at draw time by growing a band, but only if it
 * knows HOW MUCH bigger the hair is.  That is a property of the ART, so it is
 * measured here, once, into a table -- the same posture as body-tops.json and
 * eyeMask.json.  Nothing about this can be derived at runtime cheaply: the
 * answer needs the hair's own pixels.
 *
 * ── WHY NOT meta.bboxes ──
 * They exist and would have been free, and they are WRONG for this.  Measured:
 * `wavy` records a bbox 71 wide against afro's 68, which would say a fringe
 * swells the head more than an afro does.  The bboxes are authored per trait
 * with no shared convention about what they enclose (wavy's starts at y=85,
 * below the crown), so they cannot be compared across traits.  These numbers
 * come from the alpha of the shipped PNGs instead.
 *
 * ── WHAT IS MEASURED ──
 * The hair's own drawn width in 256-space, taken as the MEDIAN row width over
 * the band of rows a hat actually sits on -- the upper-middle of the hair, not
 * its full extent.  The median and the row window together are what keep
 * `long` honest: its widest rows are the fall across the shoulders, nowhere
 * near a headband, and a max-width measure would have claimed long hair swells
 * the head by 60%.
 *
 * Head width uses tools/fit-headwear-scale.mjs's method verbatim (the opaque
 * run through the crown at five depths, median) so the ratio is against the
 * same head that hat scales are already fitted to.
 *
 *   node tools/ui/measure-hair-swell.mjs           # print the table
 *   node tools/ui/measure-hair-swell.mjs --write   # write the JSON
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const HAIR = path.join(REPO, 'public/sprites/traits/hair');
const HW = path.join(REPO, 'public/sprites/traits/headwear');
const OUT = path.join(REPO, 'src/rendering/traits/hairSwell.json');
/* The band-type headwear: a thin strip meant to encircle the head, as opposed
   to a hat that sits ON it.  Hand-picked, and short on purpose -- see
   headwearCatalog's `band` flag, which is the runtime half of this. */
const BANDS = ['naruto-headband', 'bandana-blue', 'bandana-2'];
const DIRS = ['south', 'southwest', 'east', 'northeast', 'north'];
const DEPTHS = [6, 10, 14, 18, 22];          /* same as fit-headwear-scale.mjs */
const ROW_LO = 0.20, ROW_HI = 0.60;          /* the hat band, as a fraction down the hair */
const WRITE = process.argv.includes('--write');

const tops = JSON.parse(fs.readFileSync(path.join(REPO, 'public/sprites/player/body-tops.json'), 'utf8'));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

/* fit-headwear-scale.mjs headWidth(), unchanged. */
function headWidth(dir) {
  const im = decode(fs.readFileSync(path.join(REPO, `public/sprites/player/stand-${dir}.png`)));
  const fw = im.height, frames = Math.floor(im.width / fw), sc = 256 / fw, acc = [];
  for (let i = 0; i < frames; i++) {
    const key = `stand-${dir}-${i}`;
    if (!tops[key]) continue;
    const cy = tops[key][1] / sc, cx0 = Math.round(tops[key][0] / sc);
    for (const depth of DEPTHS) {
      const r = Math.round(cy + depth / sc);
      if (r < 0 || r >= fw) continue;
      const at = (x) => im.data[(r * im.width + (i * fw + x)) * 4 + 3] > 40;
      let cx = cx0;
      if (!(cx >= 0 && cx < fw && at(cx))) {
        let best = -1, bd = 1e9;
        for (let x = 0; x < fw; x++) if (at(x) && Math.abs(x - cx0) < bd) { bd = Math.abs(x - cx0); best = x; }
        if (best < 0) continue;
        cx = best;
      }
      let lo = cx; while (lo > 0 && at(lo - 1)) lo--;
      let hi = cx; while (hi < fw - 1 && at(hi + 1)) hi++;
      acc.push((hi - lo + 1) * sc);
    }
  }
  return med(acc);
}

/** The hair's drawn width in 256-space over the hat-band rows. */
function hairWidth(id, dir, meta) {
  const p = path.join(HAIR, id, `${dir}.png`);
  if (!fs.existsSync(p)) return null;
  const im = decode(fs.readFileSync(p));
  const norm = 256 / im.width;                              /* frames are square, one per file */
  /* `scale` is either a bare number or a per-direction object, and a facing
     may simply be absent from the object.  The first draft wrote this as
     `meta.scale[dir] != null ? ... : meta.scale`, which fell back to the OBJECT
     and multiplied a width by it -- `wavy` has no per-dir scale and came out
     NaN on four of five facings. */
  const sc = meta.scale;
  const scale = typeof sc === 'number' ? sc
    : (sc && typeof sc[dir] === 'number') ? sc[dir] : 1;
  /* per-row runs of the alpha */
  const rows = [];
  let top = -1, bot = -1;
  for (let y = 0; y < im.height; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < im.width; x++) {
      if (im.data[(y * im.width + x) * 4 + 3] <= 40) continue;
      if (lo < 0) lo = x; hi = x;
    }
    rows.push(lo < 0 ? 0 : hi - lo + 1);
    if (lo >= 0) { if (top < 0) top = y; bot = y; }
  }
  if (top < 0) return null;
  const h = bot - top + 1;
  const a = top + Math.round(h * ROW_LO), b = top + Math.round(h * ROW_HI);
  const band = [];
  for (let y = a; y <= b; y++) if (rows[y]) band.push(rows[y]);
  if (!band.length) return null;
  return med(band) * norm * scale;
}

const headW = {};
for (const d of DIRS) headW[d] = headWidth(d);
console.log('bare head width, 256-space:', DIRS.map((d) => `${d} ${headW[d]}`).join('   '));
console.log(`\nhair width over the hat-band rows (${ROW_LO}-${ROW_HI} down the hair), and the swell ratio:\n`);

const ids = fs.readdirSync(HAIR).filter((f) => fs.statSync(path.join(HAIR, f)).isDirectory()).sort();
const table = {};
for (const id of ids) {
  const mp = path.join(HAIR, id, 'meta.json');
  if (!fs.existsSync(mp)) { console.log(`${id.padEnd(18)} (no meta -- skipped)`); continue; }
  const meta = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const row = {};
  const cells = [];
  for (const d of DIRS) {
    const w = hairWidth(id, d, meta);
    if (w == null) { cells.push(`${d} --`); continue; }
    const r = w / headW[d];
    row[d] = Math.round(r * 100) / 100;
    cells.push(`${d} ${w.toFixed(0).padStart(3)}px ${r.toFixed(2)}x`);
  }
  if (Object.keys(row).length) table[id] = row;
  console.log(`${id.padEnd(18)} ${cells.join('   ')}`);
}

/* ── the band's own row ──
 * Growing a band about its crown anchor would drag it down the face, because
 * the anchor is at the top of the frame and the band is 20-30px below it.  So
 * the renderer lifts it back, and needs to know by how much: the offset from
 * the anchor to the row the band actually occupies.
 *
 * That row is the WIDEST one, which is the definition that matters here --
 * bandana-blue and bandana-2 have tails hanging below the band, so the bbox
 * centre sits in the tails and compensating against it would lift the band
 * clean off the head.  The widest row is the band itself.
 */
console.log('\nband row, as a 256-space offset from the hat\'s crown anchor:\n');
const bands = {};
for (const id of BANDS) {
  const mp = path.join(HW, id, 'meta.json');
  if (!fs.existsSync(mp)) { console.log(`${id.padEnd(18)} (missing)`); continue; }
  const meta = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const row = {}, cells = [];
  for (const d of DIRS) {
    const fp = path.join(HW, id, `${d}.png`);
    const an = meta.anchors && meta.anchors[d];
    if (!fs.existsSync(fp) || !an) { cells.push(`${d} --`); continue; }
    const im = decode(fs.readFileSync(fp));
    const norm = 256 / im.width;
    let best = -1, bestW = -1;
    for (let y = 0; y < im.height; y++) {
      let lo = -1, hi = -1;
      for (let x = 0; x < im.width; x++) {
        if (im.data[(y * im.width + x) * 4 + 3] <= 40) continue;
        if (lo < 0) lo = x; hi = x;
      }
      const w = lo < 0 ? 0 : hi - lo + 1;
      if (w > bestW) { bestW = w; best = y; }
    }
    if (best < 0) { cells.push(`${d} --`); continue; }
    const off = Math.round(best * norm - an[1]);
    row[d] = off;
    cells.push(`${d} +${String(off).padStart(2)} (${Math.round(bestW * norm)}px wide)`);
  }
  bands[id] = row;
  console.log(`${id.padEnd(18)} ${cells.join('  ')}`);
}

const doc = { hairSwell: table, bandRow: bands };
if (WRITE) {
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
  console.log(`\nwrote ${path.relative(REPO, OUT)}`);
} else {
  console.log('\n(dry run -- pass --write to update src/rendering/traits/hairSwell.json)');
}
