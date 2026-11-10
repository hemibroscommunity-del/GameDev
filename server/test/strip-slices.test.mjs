/* ═══ v2.3.4400: A LOOK THAT LOADS AS YOU WALK IS UNPACKED BETWEEN FRAMES ═══
 *
 * The owner's iPhone: "It noticeably slowed when I rode by the blacksmith
 * hammering."  The Blacksmith stands on the Flame Fields' side of the town,
 * where the fire goblin's look starts to load as you come: fourteen strips,
 * each packed and read into its colour numbers on the page in one go (13 to
 * 39 ms a strip on the test box, 300 ms inside a second).  In play they are
 * now unpacked a cell and a band of rows at a time, one strip at a time, a
 * slice a frame (src/rendering/zoneTextures.js).  The pieces must give what
 * the whole gave.  Checked:
 *   1. the packer's rules (trimRules.js): a cell's art box, the first solid
 *      pixel, the crop's pad and snap, an empty cell, the layout, and
 *      "not worth it";
 *   2. a strip scanned whole (as packTrimmed reads it) and a cell at a time
 *      (as packTrimmedSliced does) gives the same cells and the same layout;
 *   3. the colour numbers read in bands are the numbers read whole, band
 *      size by band size; more than 256 colours is refused either way;
 *   4. the wiring, read from the source: both packers use the rules; the
 *      strip loader goes gently only in play; BroTown says "in play" by the
 *      loading holds; one strip at a time; the slice is a share of the frame
 *      with a floor; nothing waits behind a loading screen; a zone left while
 *      a strip was unpacked keeps nothing; the off-ramp.
 * The phone half is tools/qa/mp/mp-stripgentle.mjs.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { trimScanCell, trimCellOf, trimLayout, TRIM_PAD, TRIM_ALIGN, TRIM_GAP } from '../../src/rendering/trimRules.js';
import { numbersOfPixels, numbersBuilder } from '../../src/rendering/heldNumbers.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

/* a strip of n cells (fw x fh) as RGBA bytes: each cell a blob somewhere in it (or empty), a few colours */
function strip(n, fw, fh, seed, { empty = [], full = false } = {}) {
  const r = rng(seed);
  const W = n * fw, d = new Uint8ClampedArray(W * fh * 4);
  for (let i = 0; i < n; i++) {
    if (empty.includes(i)) continue;
    const x0 = full ? 0 : Math.floor(r() * fw * 0.5), y0 = full ? 0 : Math.floor(r() * fh * 0.5);
    const w = full ? fw : 8 + Math.floor(r() * (fw - x0 - 8)), h = full ? fh : 8 + Math.floor(r() * (fh - y0 - 8));
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const o = (y * W + i * fw + x) * 4;
      const c = Math.floor(r() * 5);
      d[o] = 40 * c; d[o + 1] = 200 - 30 * c; d[o + 2] = 90; d[o + 3] = (x === x0 || y === y0) ? 60 : 255;   /* a faint edge, then solid */
    }
  }
  return { d, W };
}
const cellBytes = (d, W, i, fw, fh) => { const out = new Uint8ClampedArray(fw * fh * 4); for (let y = 0; y < fh; y++) out.set(d.subarray((y * W + i * fw) * 4, (y * W + i * fw + fw) * 4), y * fw * 4); return out; };

/* 1 */
{
  const fw = 64, fh = 48, d = new Uint8ClampedArray(fw * fh * 4);
  const put = (x, y, a) => { d[(y * fw + x) * 4 + 3] = a; };
  put(20, 10, 40); put(41, 30, 255); put(22, 12, 200); put(30, 29, 127);
  const b = trimScanCell(d, fw, 0, fw, fh);
  check('1. a cell\'s art box is every pixel that is not see-through', b.x0 === 20 && b.y0 === 10 && b.x1 === 41 && b.y1 === 30, b);
  check('1b. ...and its first solid pixel (alpha 128 and up) in reading order', b.sx === 22 && b.sy === 12, b);
  const c = trimCellOf(b, fw, fh);
  check('1c. the crop: padded, each edge snapped out to the grid, inside the frame',
    c.tx === Math.floor((20 - TRIM_PAD) / TRIM_ALIGN) * TRIM_ALIGN && c.ty === 0 && c.tx + c.w === Math.ceil((41 + 1 + TRIM_PAD) / TRIM_ALIGN) * TRIM_ALIGN && c.ty + c.h === 40 && !c.blank, c);
  const e = trimCellOf(trimScanCell(new Uint8ClampedArray(fw * fh * 4), fw, 0, fw, fh), fw, fh);
  check('1d. an empty cell is one blank grid square', e.blank && e.w === TRIM_ALIGN && e.h === TRIM_ALIGN && e.tx === 0 && e.ty === 0, e);
  const edge = new Uint8ClampedArray(fw * fh * 4);
  edge[(47 * fw + 63) * 4 + 3] = 255;
  const ce = trimCellOf(trimScanCell(edge, fw, 0, fw, fh), fw, fh);
  check('1e. a crop never leaves its frame', ce.tx + ce.w === fw && ce.ty + ce.h === fh, ce);
  /* layout */
  const cells = [{ w: 40, h: 40 }, { w: 24, h: 16 }, { w: 32, h: 48 }, { w: 8, h: 8 }].map((x) => ({ ax: 0, ay: 0, tx: 0, ty: 0, blank: false, ...x }));
  const L = trimLayout(cells, 128, 128, 4);
  const overlap = cells.some((a, i) => cells.some((b2, j) => j > i && a.ax < b2.ax + b2.w + TRIM_GAP && b2.ax < a.ax + a.w + TRIM_GAP && a.ay < b2.ay + b2.h + TRIM_GAP && b2.ay < a.ay + a.h + TRIM_GAP));
  check('1f. the layout: every crop inside the packed size, on the grid, a gap between any two', !!L && cells.every((c2) => c2.ax % TRIM_ALIGN === 0 && c2.ay % TRIM_ALIGN === 0 && c2.ax + c2.w <= L.W && c2.ay + c2.h <= L.H) && !overlap, { L, cells });
  const big = [0, 1, 2].map(() => ({ ax: 0, ay: 0, tx: 0, ty: 0, w: 128, h: 128, blank: false }));
  check('1g. art that fills its frames is not worth packing', trimLayout(big, 128, 128, 3) === null);
}

/* 2 */
{
  let same = true, strips = 0, why = null;
  for (const [n, fw, fh, seed, opt] of [[14, 64, 64, 1, {}], [28, 32, 48, 2, { empty: [0, 5, 27] }], [5, 128, 96, 3, {}], [8, 64, 64, 4, { full: true }], [1, 64, 64, 5, {}], [20, 40, 40, 6, { empty: [3] }]]) {
    const { d, W } = strip(n, fw, fh, seed, opt);
    /* whole: one read of the strip, each cell scanned in place */
    const a = [], b = [];
    let wa = null, wb = null;
    for (let i = 0; i < n; i++) {
      const s1 = trimScanCell(d, W, i * fw, fw, fh);
      if (!wa && s1.sx >= 0) wa = [i, s1.sx, s1.sy];
      a.push(trimCellOf(s1, fw, fh));
      /* sliced: the cell's own bytes, as getImageData(i * fw, 0, fw, fh) gives them */
      const s2 = trimScanCell(cellBytes(d, W, i, fw, fh), fw, 0, fw, fh);
      if (!wb && s2.sx >= 0) wb = [i, s2.sx, s2.sy];
      b.push(trimCellOf(s2, fw, fh));
    }
    const La = trimLayout(a, fw, fh, n), Lb = trimLayout(b, fw, fh, n);
    strips++;
    if (JSON.stringify([a, La, wa]) !== JSON.stringify([b, Lb, wb])) { same = false; why = { n, fw, fh, seed }; }
  }
  check(`2. ${strips} strips scanned whole and a cell at a time: the same cells, the same layout, the same witness pixel`, same && strips === 6, why);
}

/* 3 */
{
  const r = rng(77);
  const w = 97, h = 53, d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const u = r();
    if (u < 0.4) continue;                                   /* see-through */
    const c = Math.floor(r() * 110);
    d[i * 4] = c; d[i * 4 + 1] = (c * 7) & 255; d[i * 4 + 2] = 255 - c; d[i * 4 + 3] = u < 0.5 ? 128 : 255;
  }
  const whole = numbersOfPixels(d, w, h);
  let allSame = !!whole;
  for (const rows of [1, 2, 7, 32, 53, 100]) {
    const b = numbersBuilder(w, h);
    let ok = true;
    for (let y = 0; y < h && ok; y += rows) { const n = Math.min(rows, h - y); ok = b.add(d.subarray(y * w * 4, (y + n) * w * 4), w * n); }
    const got = b.done();
    if (!ok || !got || got.w !== whole.w || got.h !== whole.h || Buffer.compare(Buffer.from(got.idx), Buffer.from(whole.idx)) !== 0
      || Buffer.compare(Buffer.from(got.pal.buffer, got.pal.byteOffset, got.pal.byteLength), Buffer.from(whole.pal.buffer, whole.pal.byteOffset, whole.pal.byteLength)) !== 0) allSame = false;
  }
  check(`3. the colour numbers read in bands of 1, 2, 7, 32, 53 and 100 rows are the numbers read whole (${whole && whole.pal.length} colours)`, allSame && whole.pal.length > 100);
  /* every pixel a colour of its own: more than 256 */
  const many = new Uint8ClampedArray(40 * 20 * 4);
  for (let i = 0; i < 800; i++) { many[i * 4] = i & 255; many[i * 4 + 1] = i >> 8; many[i * 4 + 2] = 9; many[i * 4 + 3] = 255; }
  const mb = numbersBuilder(40, 20);
  let refused = false;
  for (let y = 0; y < 20; y += 4) if (!mb.add(many.subarray(y * 40 * 4, (y + 4) * 40 * 4), 160)) refused = true;
  check('3b. more than 256 colours is refused whole and in bands, and stays refused', numbersOfPixels(many, 40, 20) === null && refused && mb.done() === null && mb.add(many, 4) === false);
  check('3c. a picture too short for its size is refused, as before', numbersOfPixels(new Uint8ClampedArray(8), 4, 4) === null);
}

/* 4 */
{
  const gs = readFileSync(join(ROOT, 'src/rendering/gearSheets.js'), 'utf8');
  const sync = gs.slice(gs.indexOf('export function packTrimmed(img, fw, fh, n) {'), gs.indexOf('export async function packTrimmedSliced'));
  const sliced = gs.slice(gs.indexOf('export async function packTrimmedSliced'), gs.indexOf('/** Draw a gear frame onto a 2D canvas as if it were the WHOLE frame'));
  const uses = (t) => /trimScanCell\(/.test(t) && /trimCellOf\(/.test(t) && /trimLayout\(cells, fw, fh, n\)/.test(t);
  check('4. both packers follow the same rules (trimRules.js), and neither keeps a copy of them', uses(sync) && uses(sliced) && !/layShelves|snapDn/.test(gs));
  check('4b. the sliced one reads a cell at a time and asks for its turn between cells and between crops', /await turn\(\);\s*const b = trimScanCell\(rctx\.getImageData\(i \* fw, 0, fw, fh\)\.data, fw, 0, fw, fh\);/.test(sliced)
    && /await turn\(\);\s*ctx\.drawImage\(rd, i \* fw \+ c\.tx, c\.ty, c\.w, c\.h, c\.ax, c\.ay, c\.w, c\.h\);/.test(sliced));
  const zt = readFileSync(join(ROOT, 'src/rendering/zoneTextures.js'), 'utf8');
  const load = zt.slice(zt.indexOf('export function loadTrackedStrip'), zt.indexOf('const SLICE_MIN_MS'));
  check('4c. the strip loader goes gently only in play, through the one line; else at once, as before', /if \(stripFrameMs\(\) > 0\) return _inLine\(\(\) => _stripGently\(bundle, url, fw, fh, gen, img\)\);/.test(load)
    && /const packed = packTrimmed\(img, fw, fh, n\);\s*const frames = _stripFrames\(bundle, url, fw, fh, img, n, packed, undefined\);/.test(load));
  check('4d. one strip at a time, one clock for the slice across them', /const p = _line\.then\(job, job\);/.test(zt) && /if \(_waiting\+\+ === 0\) _sliceT0 = performance\.now\(\);/.test(zt));
  check('4e. the slice: a share of the frame, never under the floor; nothing waits once a loading screen is up', /const SLICE_MIN_MS = 3, SLICE_MAX_MS = 50, SLICE_SHARE = 0\.25/.test(zt)
    && /if \(!frameMs\) return;/.test(zt) && /Math\.max\(SLICE_MIN_MS, Math\.min\(SLICE_MAX_MS, frameMs \* SLICE_SHARE\)\)/.test(zt));
  const gently = zt.slice(zt.indexOf('async function _stripGently'), zt.indexOf('if (typeof window !== \'undefined\') window.__btStripSlices'));
  check('4f. gently: the same pack and the same numbers, a piece at a time', /await packTrimmedSliced\(img, fw, fh, n, stripTurn\)/.test(gently) && /await numbersOfSliced\(packed\.canvas, stripTurn\)/.test(gently)
    && /return _stripFrames\(bundle, url, fw, fh, img, n, packed, read, whole\);/.test(gently));
  const tail = gently.slice(gently.indexOf('if ((_gen.get(bundle) || 0) !== gen)'));
  check('4g. a zone left while its strip was unpacked keeps nothing, and nothing waits after that check', /packed\.canvas\.width = 0/.test(tail) && /return \[\];/.test(tail) && !/await /.test(tail));
  check('4h. `?stripgentle=0` is the old way', /stripgentle=\(0\|off\|false\)/.test(zt) && /if \(_gentleOff \|\| !_play\) return 0;/.test(zt));
  const bt = readFileSync(join(ROOT, 'src/ui/BroTown.jsx'), 'utf8');
  const play = bt.slice(bt.indexOf('setStripPlay(function () {'), bt.indexOf('setStripPlay(function () {') + 520);
  check('4i. "in play" is no loading hold up and the tab on screen; then the frame\'s own length',
    /if \(!S\.__introLiftedAt \|\| S\._zoneLoading \|\| S\._netHold \|\| S\._townArtHold \|\| S\._farmArtHold \|\| S\._wheelDungeonOpening\) return 0;/.test(play)
    && /document\.visibilityState !== 'visible'\) return 0;/.test(play) && /return S\._frameMs > 0 \? S\._frameMs : 16\.667;/.test(play));
  const pn = readFileSync(join(ROOT, 'src/rendering/picsNumbers.js'), 'utf8');
  check('4j. the numbers already read are used as they are; none given, read whole as before', /const nums = read === undefined \? numbersOf\(canvas\) : \(read \|\| null\);/.test(pn));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
