/* ═══ v2.3.2503: CUT THE TATTOO EDITOR'S ZONE-PICKER ART FROM THE OWNER'S SHEET ═══
 *
 * Owner, with `tools/gear/src-art/creator/tattoo-zone-ui.png` and the mockup
 * `docs/triage-2026-09-14/assets/tattoo-editor-mock.png`: the little character
 * beside the editor gets tappable zone frames, a flip button turns it round,
 * and a label names the side and zone.
 *
 *   node tools/ui/slice-zone-picker.mjs           # write the art
 *   node tools/ui/slice-zone-picker.mjs --check   # measure and report, write nothing
 *
 * ── NEVER ASSUME THE GRID (docs/TRAPS.md §59) ──
 * The sheet LOOKS like a tidy 4 / 4 / 2 arrangement, and slicing it on even
 * quarters is the move that would have shipped. It is wrong here in a way that
 * is silent: the two SELECTED frames carry a wide soft glow, and at the
 * threshold that finds the artwork (alpha > 8) their glows TOUCH -- the top row
 * reads as three cells, not four:
 *
 *     alpha > 8   band 0 -> 3 columns: 74..335, 371..690, 729..1411   <- the
 *                                                        two glowing frames
 *                                                        merged into one
 *     alpha > 40  band 0 -> 4 columns                     <- the gold parts
 *                                                            separate cleanly
 *
 * So there are TWO thresholds here and they answer different questions. GUT
 * (40) finds the gutters, because a glow bleeds across a gap the artwork does
 * not. INK (8) finds each cell's tight box once the gutters have said where the
 * cell is, because the glow IS part of the drawing and must not be clipped.
 * The 4/4/2 split is identical at GUT 32, 40 and 64, which is the check that it
 * is a real gutter and not a threshold that happens to work.
 *
 * Every cell's size is printed, and the tool refuses to run unless the gutters
 * yield exactly 4, 4 and 2 cells -- so a straddle is visible in the log rather
 * than discovered on a phone, which is the whole lesson of §59.
 *
 * ── WHY THE FRAMES ARE NORMALISED ON THEIR APERTURE, NOT THEIR ART BOX ──
 * The four frames are laid over a body part, and what has to land on that part
 * is the HOLE in the middle, not the drawing's outer edge. Those two are very
 * different boxes, because the glow on a selected frame spreads a long way
 * outside the gold:
 *
 *     frame    art box    aperture    aperture margin, as a fraction of it
 *     sm       262x261    209x208     L .124  T .130  R .129  B .125
 *     lg       320x322    270x271     L .096  T .096  R .089  B .092
 *     sm-on    299x298    176x178     L .347  T .337  R .352  B .337
 *     lg-on    385x350    262x228     L .240  T .263  R .229  B .272
 *
 * Cut on the art box and placed on one rect, tapping a zone would visibly SHRINK
 * its frame -- the selected art's gold sits 35% in from its own edge where the
 * plain art's sits 12% in. So each frame is resampled into one 256x256 box with
 * its aperture mapped onto the centred APERTURE_FRAC square. After that the
 * plain and selected art of a zone are interchangeable by construction, the
 * panel positions both with one rule, and nothing moves when you tap.
 *
 * PAD (0.36 of the aperture on every side) is the smallest margin that clips no
 * glow: the widest measured is sm-on's 0.352.
 *
 * ── THE ONE PLACE THE ART IS CORRECTED ──
 * lg-on's aperture is 262x228 -- aspect 1.149 where the other three are 1.005,
 * 0.996 and 0.989. The owner describes this row as "four square zone frames",
 * so that is the artist drawing loosely, and squaring the aperture restores the
 * intent rather than distorting it. It is done HERE, once, where it is measured
 * and logged, instead of at runtime where a 15% jump would appear on tap and
 * nobody could see why. The tool prints the correction it applied to each cell.
 *
 * ── WHAT IS MEASURED BUT NOT WRITTEN ──
 * The sheet also carries a previous and a next chevron, an "i" button and two
 * label plates. The picker uses none of them: it has two zones, so there is
 * nothing to page through, and the plates have their text BAKED IN
 * ("Tap a zone to edit", "Front • Chest + Arms") where the screen needs a label
 * that changes with the side and the zone. The owner's own mockup draws both of
 * those strings as plain text on the panel with no plate around them, which is
 * what the panel does. They are still measured and printed, so the sheet's own
 * geometry stays on the record and adding one later is a one-line change here.
 *
 * No image library in this sandbox, so this uses the repo's own zero-dependency
 * PNG codec and does its own area-average resampling -- the same reason
 * tools/ui/relabel-login-plate.mjs reaches for headless Chromium, minus the
 * browser, because a box filter is twenty lines.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from '../png.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHEET = path.join(REPO, 'tools/gear/src-art/creator/tattoo-zone-ui.png');
const OUT = path.join(REPO, 'public/ui/paint');

const GUT = 40;    /* gutter test -- see the header: a glow bridges the gap at 8 */
const INK = 8;     /* the drawing's own extent, glow included */
const APER = 24;   /* walking out of the middle, "the frame's ink starts here" */
const MIN_SPAN = 20;
const SIZE = 256;          /* every frame comes out at this, one rule for the CSS */
const PAD = 0.36;          /* aperture margin; the widest measured is sm-on's .352 */
/* The aperture's share of the output box. The panel inflates a zone rect by the
   inverse of this to place the image, so the two numbers must agree -- it is
   exported into the art's own README line below rather than retyped there. */
const APERTURE_FRAC = 1 / (1 + PAD * 2);

/* Row-major, matching the sheet as the owner drew it. null = measured and
   printed, deliberately not written (see the header). */
const GRID = [
  ['zone-frame-sm', 'zone-frame-lg', 'zone-frame-sm-on', 'zone-frame-lg-on'],
  ['zone-flip', null /* prev chevron */, null /* next chevron */, null /* "i" */],
  [null /* plate: "Tap a zone to edit" */, null /* plate: "Front • Chest + Arms" */],
];
/* Which cells are FRAMES (normalised on their aperture) rather than plain
   buttons (cut to their tight box). */
const IS_FRAME = (name) => !!name && name.indexOf('zone-frame-') === 0;

function runs(counts, min) {
  const out = [];
  let start = null;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] && start === null) start = i;
    else if (!counts[i] && start !== null) { out.push([start, i - 1]); start = null; }
  }
  if (start !== null) out.push([start, counts.length - 1]);
  return out.filter((r) => r[1] - r[0] >= min);
}

/** Bands by empty ROWS, then each band into cells by ITS OWN empty columns.
 *  Per-band is the part that matters: a global column scan would union three
 *  rows that do not share a column count (4, 4 and 2) into nonsense. */
function cells(img) {
  const { width: W, height: H, data } = img;
  const on = (x, y) => data[(y * W + x) * 4 + 3] > GUT;
  const rowC = [];
  for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) if (on(x, y)) n++; rowC.push(n); }
  const bands = runs(rowC, MIN_SPAN);
  if (bands.length !== GRID.length) {
    throw new Error(`sheet: expected ${GRID.length} rows, the gutters give ${bands.length} ${JSON.stringify(bands)}`);
  }
  const found = [];
  for (let bi = 0; bi < bands.length; bi++) {
    const [y0, y1] = bands[bi];
    const colC = [];
    for (let x = 0; x < W; x++) { let n = 0; for (let y = y0; y <= y1; y++) if (on(x, y)) n++; colC.push(n); }
    const cols = runs(colC, MIN_SPAN);
    if (cols.length !== GRID[bi].length) {
      throw new Error(`sheet row ${bi}: expected ${GRID[bi].length} cells, the gutters give `
        + `${cols.length} ${JSON.stringify(cols)} -- see the header, this is TRAPS §59`);
    }
    /* ── widening the GUT cell back out to the cell's own glow ──
       GUT deliberately cuts through the soft glow, so the gutter span is
       narrower than the drawing. Widening to the neighbouring gutter's MIDPOINT
       is the obvious move and it is wrong: it swallows whatever the neighbour
       has spilled into the same gap. Measured, that put the large frame's left
       edge (alpha 252) inside the small frame's PNG.
       So a cell grows outward through its OWN contiguous ink and stops at the
       first INK-empty column -- and, where the two selected frames' glows
       overlap with no empty column between them at all, at the midpoint of the
       GUT gutter, which is the density minimum the glows cross at. */
    const ty0 = Math.max(0, y0 - 40), ty1 = Math.min(H - 1, y1 + 40);
    const inkCol = [];
    for (let x = 0; x < W; x++) {
      let any = false;
      for (let y = ty0; y <= ty1 && !any; y++) if (data[(y * W + x) * 4 + 3] > INK) any = true;
      inkCol.push(any);
    }
    found.push(cols.map(([x0, x1], ci) => {
      const capLo = ci === 0 ? 0 : Math.round((cols[ci - 1][1] + x0) / 2);
      const capHi = ci === cols.length - 1 ? W - 1 : Math.round((x1 + cols[ci + 1][0]) / 2);
      let lo = x0; while (lo > capLo && inkCol[lo - 1]) lo--;
      let hi = x1; while (hi < capHi && inkCol[hi + 1]) hi++;
      let ax = W, ay = H, bx = -1, by = -1;
      for (let y = ty0; y <= ty1; y++) {
        for (let x = lo; x <= hi; x++) {
          if (data[(y * W + x) * 4 + 3] > INK) {
            if (x < ax) ax = x; if (x > bx) bx = x;
            if (y < ay) ay = y; if (y > by) by = y;
          }
        }
      }
      return { x0: ax, y0: ay, x1: bx, y1: by };
    }));
  }
  return found;
}

/** The transparent window in the middle of a frame, walked out from its centre.
 *  This is what has to land on the body part -- see the header. */
function aperture(img, box) {
  const { width: W, data } = img;
  const a = (x, y) => data[(y * W + x) * 4 + 3];
  const cx = (box.x0 + box.x1) >> 1, cy = (box.y0 + box.y1) >> 1;
  let l = cx; while (l > box.x0 && a(l, cy) <= APER) l--;
  let r = cx; while (r < box.x1 && a(r, cy) <= APER) r++;
  let t = cy; while (t > box.y0 && a(cx, t) <= APER) t--;
  let b = cy; while (b < box.y1 && a(cx, b) <= APER) b++;
  return { x0: l + 1, y0: t + 1, x1: r - 1, y1: b - 1 };
}

/** Area-average resample of a source rect into a w*h box.
 *  Premultiplied, because averaging straight RGBA over a soft edge drags the
 *  colour of fully transparent pixels into the result -- which on this sheet is
 *  black, and shows up as a dark rim around every glow.
 *
 *  `clip` is the CELL, and it is not the same rect as `src`: a frame's source is
 *  its aperture plus PAD, which on the small plain frame reaches x383 -- twelve
 *  pixels INTO the large frame beside it. Measured before this argument existed,
 *  that put a 252-alpha slice of the neighbour's gold down the right edge of
 *  zone-frame-sm.png. Everything outside the cell reads as transparent. */
function resample(img, src, w, h, clip) {
  const { width: W, height: H, data } = img;
  const out = Buffer.alloc(w * h * 4);
  const sw = src.x1 - src.x0 + 1, sh = src.y1 - src.y0 + 1;
  for (let oy = 0; oy < h; oy++) {
    const fy0 = src.y0 + (oy / h) * sh, fy1 = src.y0 + ((oy + 1) / h) * sh;
    const iy0 = Math.floor(fy0), iy1 = Math.max(iy0, Math.ceil(fy1) - 1);
    for (let ox = 0; ox < w; ox++) {
      const fx0 = src.x0 + (ox / w) * sw, fx1 = src.x0 + ((ox + 1) / w) * sw;
      const ix0 = Math.floor(fx0), ix1 = Math.max(ix0, Math.ceil(fx1) - 1);
      let r = 0, g = 0, b = 0, al = 0, n = 0;
      for (let y = iy0; y <= iy1; y++) {
        if (y < 0 || y >= H) continue;
        if (clip && (y < clip.y0 || y > clip.y1)) { n += Math.max(0, Math.min(ix1, W - 1) - Math.max(ix0, 0) + 1); continue; }
        for (let x = ix0; x <= ix1; x++) {
          if (x < 0 || x >= W) continue;
          if (clip && (x < clip.x0 || x > clip.x1)) { n++; continue; }
          const i = (y * W + x) * 4, A = data[i + 3] / 255;
          r += data[i] * A; g += data[i + 1] * A; b += data[i + 2] * A; al += data[i + 3];
          n++;
        }
      }
      const o = (oy * w + ox) * 4;
      if (!n || !al) continue;
      const A = al / n;
      out[o] = Math.round(r / n / (A / 255));
      out[o + 1] = Math.round(g / n / (A / 255));
      out[o + 2] = Math.round(b / n / (A / 255));
      out[o + 3] = Math.round(A);
    }
  }
  return { width: w, height: h, data: out };
}

function main() {
  const check = process.argv.slice(2).indexOf('--check') >= 0;
  const img = decode(fs.readFileSync(SHEET));
  console.log(`sheet ${path.relative(REPO, SHEET)} ${img.width}x${img.height}`);
  const grid = cells(img);
  let wrote = 0, same = 0, stale = 0;

  for (let bi = 0; bi < GRID.length; bi++) {
    for (let ci = 0; ci < GRID[bi].length; ci++) {
      const name = GRID[bi][ci];
      const box = grid[bi][ci];
      const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
      if (!name) {
        console.log(`  r${bi}c${ci}  ${String(bw).padStart(4)}x${String(bh).padEnd(4)} `
          + `(measured, not written -- see the header)`);
        continue;
      }
      let src = box, note = '';
      if (IS_FRAME(name)) {
        const ap = aperture(img, box);
        const aw = ap.x1 - ap.x0 + 1, ah = ap.y1 - ap.y0 + 1;
        /* Square the aperture (see the header) and pad it by PAD on every side.
           The source rect is expressed in the SHEET's pixels, so the resample
           below does the squaring and the scaling in one pass. */
        const s = Math.max(aw, ah);
        const padX = s * PAD * (aw / s), padY = s * PAD * (ah / s);
        src = { x0: ap.x0 - padX, y0: ap.y0 - padY, x1: ap.x1 + padX, y1: ap.y1 + padY };
        note = `  aperture ${aw}x${ah} (aspect ${(aw / ah).toFixed(3)}`
          + `${Math.abs(aw / ah - 1) > 0.05 ? ' -- SQUARED, see the header' : ''})`;
      }
      const w = IS_FRAME(name) ? SIZE : Math.max(1, Math.round(SIZE * Math.min(1, bw / Math.max(bw, bh))));
      const h = IS_FRAME(name) ? SIZE : Math.max(1, Math.round(SIZE * Math.min(1, bh / Math.max(bw, bh))));
      const png = encode(resample(img, src, w, h, box));
      const dest = path.join(OUT, name + '.png');
      const old = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
      let state;
      if (old && old.equals(png)) { same++; state = 'current'; }
      else if (check) { stale++; state = 'STALE'; }
      else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, png);
        wrote++; state = 'written';
      }
      console.log(`  r${bi}c${ci}  ${String(bw).padStart(4)}x${String(bh).padEnd(4)} -> `
        + `${name}.png ${w}x${h} ${String(Math.round(png.length / 1024)).padStart(3)}KB  ${state}${note}`);
    }
  }
  console.log(`frames carry their aperture as the centred ${(APERTURE_FRAC * 100).toFixed(1)}% square `
    + `(PlayerPaint's ZONE_APERTURE must match)`);
  if (check) {
    console.log(`check: ${same} current, ${stale} stale`);
    process.exit(stale ? 1 : 0);
  }
  console.log(`wrote ${wrote} file(s), ${same} already current`);
}

main();
