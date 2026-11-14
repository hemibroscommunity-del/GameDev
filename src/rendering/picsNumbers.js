/* ═══ v2.3.3715: A MONSTER'S STRIPS AS COLOUR NUMBERS ON THE CHIP ═══
 *
 * docs/specs/pictures-once.md, the second switch: on by default, `?picnumbers=0`
 * the game as it was.
 *
 * A monster's strips (zoneTextures.js loadTrackedStrip: every pose of the fire
 * goblin, the mummy, the skeleton, the snowman...) are cropped and packed onto
 * a canvas, drawn on 256 colours or fewer, and today held three ways in turn:
 * the canvas in the page (four bytes a pixel) until the strip is first drawn,
 * then its colour numbers (heldNumbers.js, one byte a pixel) -- and on the
 * graphics chip at four bytes a pixel all along.  The census at a Flame
 * Fields fight: 14 MB of canvases waiting to be drawn, 9 MB on the chip.
 *
 * With the switch, a strip is read into its colour numbers the moment it is
 * packed (behind its loading screen, as it was packed), its canvas let go of
 * there and then, and it is uploaded to the chip AS the numbers -- one byte a
 * pixel, its colours a row of the atlas the Wheel's ground and objects use,
 * looked up as it is drawn (paletteTex.js: the same program, the same
 * rounding: a pixel where four colours meet can come out one level of 255
 * apart, a pixel inside one colour the same colour).  So:
 *   - the page holds a byte a pixel from the start (the numbers are the
 *     picture: what the chip is sent again after a black screen's rebuild, at
 *     once, from the page -- no canvas to be emptied by Safari, TRAPS §250);
 *   - the chip holds a quarter;
 *   - the readers read the numbers, as they do today once a strip is held
 *     (heldNumbers.js readSourceRect: a hit's chips, an arrow stuck in it);
 *   - the whirlwind's one-colour catch draws them with the colour-numbers
 *     program's twin (paletteTex.js PAL_FILL_BATCHER, fillBatch.js).
 * A monster's strips share ONE row of colours (their art is one set of
 * colours): a strip's colours are added to its bundle's row, a second row
 * taken only if the first has no room; the rows are given back when the
 * bundle's art goes (zoneTextures.js unloadBundle).  A strip on more than 256
 * colours, a full atlas, or no colour-numbers program on this device (not
 * WebGL2, `?nopalette`) packs its canvas exactly as before.
 *
 * QA: window.__btPicNumbers(). */
import { clientOffAtLoad } from '../game/clientOff.js';   /* v2.3.3755; v2.3.3770: relative, so node's checks can load it (check-hairmask-parity imports the renderer) */
import { numbersOf } from './heldNumbers.js';
import { Sprite, Texture } from 'pixi.js';
import { paletteOn, paletteStride, paletteRowTake, paletteRowWrite, paletteRowGive, makePaletteSourceOnRow, paletteFillProgram, paletteProgramLinked } from './paletteTex.js';

const _q = (() => { try { return typeof location !== 'undefined' ? (location.search || '') : ''; } catch (e) { return ''; } })();
/* on by default (the owner, 2026-10-28, picsOnce.js); `?picnumbers=0` is the
   game as it was */
/* v2.3.3755: ...or the Test panel's Memory savers row, from the next load (game/clientOff.js) */
const WANTED = !/[?&]picnumbers=0\b/.test(_q) && !clientOffAtLoad('picnumbers');
export function picNumbersWanted() { return WANTED; }
/* (never while QA compares the cropped strips' canvases: __btTrimVerify,
   mp-monstertrim -- heldNumbers.js keeps them for it too) */
export function picNumbersOn() { return WANTED && paletteOn() && !(typeof window !== 'undefined' && window.__btTrimVerify === true); }

const _live = new Set();   /* QA: the strips kept this way (mp-picsonce compares them) */
const _stats = { strips: 0, canvasMB: 0, numbersMB: 0, many: 0, rowsFull: 0, rows: 0, onRow: 0, onRowStale: 0, onRowChecked: 0, onRowBad: 0 };   /* v2.3.5044: + the strips numbered on the reader's worker (stripRows.js) */
/* bundle -> its rows: [{ row, map: colour -> number, n, rgba (premultiplied, the atlas's), pal (as a canvas reads back) }] */
const _rows = new Map();

function rowFor(bundle, colours) {
  let list = _rows.get(bundle);
  if (!list) { list = []; _rows.set(bundle, list); }
  for (const r of list) {
    let fresh = 0;
    for (let k = 1; k < colours.length; k++) if (!r.map.has(colours[k])) fresh++;
    if (r.n + fresh <= 256) return r;
  }
  const row = paletteRowTake();
  if (row < 0) return null;
  const r = { row, map: new Map([[0, 0]]), n: 1, rgba: new Uint8Array(1024), pal: new Uint32Array(256) };
  list.push(r);
  _stats.rows++;
  return r;
}

/* ═══ v2.3.5044: THE STRIP NUMBERED FOR ITS ROW ON THE READER'S WORKER ═══
   stripRows.js has the why (held-budget.mjs `strip-made`).  stripRowsAsk is
   what goes with a read, taken when the read STARTS (stripRead.js reads one
   strip at a time): the bundle's rows (`send`: each row's places and
   colours) as they will be once every plan already answered and not yet
   taken is taken, in order (a monster's look is a dozen strips asked at
   once: described against the rows as they were when ASKED, all but the
   first came back stale -- 27 of 29 on a ride).  The plans are taken in the
   order they were answered (zoneTextures.js's line), so each finds the rows
   as its read described them.  _onPlannedRow takes one only if they are: the
   bundle's rows not given back since (`epoch`), and the row it chose with
   the number of places it was told (else the page numbers the strip itself,
   as before, from its own numbers, which come back too).
   `window.__btStripRowCheck = true` (QA): every pixel's colour on the row is
   checked against its colour in the strip (__btPicNumbers() onRowChecked /
   onRowBad). */
const _plansWaiting = new Map();   /* bundle -> [plan]: answered, not yet taken (in order) */
const _rowsEpoch = new Map();      /* bundle -> how many times its rows were given back */
export function stripRowsAsk(bundle) {
  if (!picNumbersOn()) return null;
  const send = (_rows.get(bundle) || []).map((r) => ({ n: r.n, pal: r.pal.slice(0, r.n) }));
  for (const p of _plansWaiting.get(bundle) || []) {
    if (p.ri < send.length) {
      const r = send[p.ri], pal = new Uint32Array(r.n + p.added.length);
      pal.set(r.pal); pal.set(p.added, r.n);
      send[p.ri] = { n: pal.length, pal };
    } else {
      const pal = new Uint32Array(1 + p.added.length);
      pal.set(p.added, 1);
      send.push({ n: pal.length, pal });
    }
  }
  return { send, epoch: _rowsEpoch.get(bundle) || 0 };
}
/** zoneTextures.js: a plan answered (it waits to be taken, in order); and a
 *  plan done with, taken or not (a strip of a zone left meanwhile) */
export function stripPlanAnswered(bundle, plan) {
  let q = _plansWaiting.get(bundle);
  if (!q) { q = []; _plansWaiting.set(bundle, q); }
  q.push(plan);
}
export function stripPlanDone(bundle, plan) {
  const q = _plansWaiting.get(bundle);
  if (!q) return;
  const i = q.indexOf(plan);
  if (i >= 0) q.splice(i, 1);
  if (!q.length) _plansWaiting.delete(bundle);
}
function _onPlannedRow(bundle, nums, plan, label) {
  stripPlanDone(bundle, plan);   /* taken (or stale): no longer in the rows a read is told of */
  const asked = plan.asked;
  let list = _rows.get(bundle) || null;
  const len = list ? list.length : 0;
  if ((_rowsEpoch.get(bundle) || 0) !== asked.epoch || plan.st !== paletteStride(nums.w)) { _stats.onRowStale++; return null; }
  let r;
  if (plan.ri < len) {
    r = list[plan.ri];
    if (!r || r.n !== plan.n0) { _stats.onRowStale++; return null; }
    if (r.n + plan.added.length > 256) { _stats.onRowStale++; return null; }
  } else {
    if (plan.ri !== len || plan.n0 !== 1 || plan.added.length > 255) { _stats.onRowStale++; return null; }
    const row = paletteRowTake();
    if (row < 0) { _stats.rowsFull++; return null; }
    if (!list) { list = []; _rows.set(bundle, list); }
    r = { row, map: new Map([[0, 0]]), n: 1, rgba: new Uint8Array(1024), pal: new Uint32Array(256) };
    list.push(r);
    _stats.rows++;
  }
  /* the row's new colours, in the worker's order (its numbers are theirs) */
  for (let k = 0; k < plan.added.length; k++) {
    const c = plan.added[k];
    const n = r.n++;
    r.map.set(c, n);
    r.pal[n] = c;
    /* premultiplied, as the canvas went up to the chip (as stripAsNumbers below) */
    const R = c & 255, G = (c >>> 8) & 255, B = (c >>> 16) & 255, A = (c >>> 24) & 255;
    r.rgba[n * 4] = Math.round(R * A / 255);
    r.rgba[n * 4 + 1] = Math.round(G * A / 255);
    r.rgba[n * 4 + 2] = Math.round(B * A / 255);
    r.rgba[n * 4 + 3] = A;
  }
  if (plan.added.length) paletteRowWrite(r.row, r.rgba);
  const w = nums.w, h = nums.h, st = plan.st, out = plan.out;
  try {
    if (typeof window !== 'undefined' && window.__btStripRowCheck === true) {
      let bad = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = nums.idx[y * w + x], v = out[y * st + x];
        if (k === 0 ? v !== 0 : r.pal[v] !== nums.pal[k]) bad++;
      }
      _stats.onRowChecked++;
      if (bad) _stats.onRowBad++;
    }
  } catch (e) { _stats.onRowBad++; }
  const src = makePaletteSourceOnRow({ idx: out, w, h, stride: st, row: r.row, rgba: r.rgba, alphaMode: 'premultiplied-alpha', label: label || 'bt-strip' });
  if (!src) return null;
  src._btNumbers = { w: st, h, idx: out, pal: r.pal };
  src._btPicNum = bundle;
  _live.add(src);
  src.once('destroy', () => _live.delete(src));
  _stats.strips++;
  _stats.onRow++;
  _stats.canvasMB = +(_stats.canvasMB + w * h * 4 / 1048576).toFixed(2);
  _stats.numbersMB = +(_stats.numbersMB + st * h / 1048576).toFixed(2);
  return src;
}

/** The packed strip `canvas` as a texture source of colour numbers, on its
 *  bundle's row -- or null (more than 256 colours, no room, or not drawn this
 *  way here): the caller keeps the canvas, as before.  On success the canvas
 *  is emptied. */
export function stripAsNumbers(bundle, canvas, label, read) {
  /* v2.3.4470: no canvas at all when the numbers came straight from the
     strip's own 256-colour file (stripRead.js): `read` is then the picture */
  if (!picNumbersOn() || (!canvas && !read)) return null;
  /* v2.3.4400: `read`, the canvas's numbers already read a band at a time
     (heldNumbers.js numbersOfSliced; `false`: read, and more than 256
     colours) -- the same numbers numbersOf gives */
  /* v2.3.5044: numbered for its row on the reader's worker (above), if the
     rows are as they were described; else the page's way, below */
  if (!canvas && read && read.onRow && read.onRow.asked) {
    const done = _onPlannedRow(bundle, read, read.onRow, label);
    if (done) return done;
  }
  const nums = read === undefined ? numbersOf(canvas) : (read || null);
  if (!nums) { _stats.many++; return null; }
  const { w, h, idx, pal } = nums;
  const r = rowFor(bundle, pal);
  if (!r) { _stats.rowsFull++; return null; }
  /* the strip's own numbers -> its row's */
  const to = new Uint8Array(pal.length);
  let grew = false;
  for (let k = 1; k < pal.length; k++) {
    const c = pal[k];
    let n = r.map.get(c);
    if (n === undefined) {
      n = r.n++;
      r.map.set(c, n);
      r.pal[n] = c;
      /* premultiplied, as the canvas went up to the chip */
      const R = c & 255, G = (c >>> 8) & 255, B = (c >>> 16) & 255, A = (c >>> 24) & 255;
      r.rgba[n * 4] = Math.round(R * A / 255);
      r.rgba[n * 4 + 1] = Math.round(G * A / 255);
      r.rgba[n * 4 + 2] = Math.round(B * A / 255);
      r.rgba[n * 4 + 3] = A;
      grew = true;
    }
    to[k] = n;
  }
  if (grew) paletteRowWrite(r.row, r.rgba);
  /* rows padded to 4 bytes (WebGL's unpacking) with copies of each row's last
     pixel, so the right edge samples as the canvas's clamped edge did */
  const st = paletteStride(w);
  const out = st === w ? idx : new Uint8Array(st * h);
  for (let y = 0; y < h; y++) {
    const o = y * st, i0 = y * w;
    for (let x = 0; x < w; x++) out[o + x] = to[idx[i0 + x]];
    for (let x = w; x < st; x++) out[o + x] = out[o + w - 1];
  }
  const src = makePaletteSourceOnRow({ idx: out, w, h, stride: st, row: r.row, rgba: r.rgba, alphaMode: 'premultiplied-alpha', label: label || 'bt-strip' });
  if (!src) return null;
  /* the readers' numbers (heldNumbers.js readSourceRect): the same bytes, read
     with the row's colours as a canvas gives them back */
  src._btNumbers = { w: st, h, idx: out, pal: r.pal };
  src._btPicNum = bundle;
  _live.add(src);
  src.once('destroy', () => _live.delete(src));
  _stats.strips++;
  _stats.canvasMB = +(_stats.canvasMB + w * h * 4 / 1048576).toFixed(2);
  _stats.numbersMB = +(_stats.numbersMB + st * h / 1048576).toFixed(2);
  /* QA (mp-picsonce): the packed canvas kept, to draw the strip the old way
     beside the new and compare -- only when a test asks, never in play */
  if (!canvas) { /* nothing to keep or empty: read from the file's numbers */ }
  else if (typeof window !== 'undefined' && window.__btPicNumVerify === true) src.__btOrigCanvas = canvas;
  else { try { canvas.width = 0; canvas.height = 0; } catch (e) { /* not ours */ } }
  return src;
}

/** zoneTextures.js unloadBundle: the bundle's strips are destroyed; its rows
 *  go back to the atlas. */
export function releaseBundleNumbers(bundle) {
  /* v2.3.5044: a plan answered for these rows is stale from now on */
  _rowsEpoch.set(bundle, (_rowsEpoch.get(bundle) || 0) + 1);
  _plansWaiting.delete(bundle);
  const list = _rows.get(bundle);
  if (!list) return;
  _rows.delete(bundle);
  for (const r of list) { paletteRowGive(r.row); _stats.rows--; }
}

if (typeof window !== 'undefined') {
  window.__btPicNumSources = () => [..._live].filter((x) => !x.destroyed);
  window.__btPicNumbers = () => ({ wanted: WANTED, on: picNumbersOn(), ..._stats, fillProgram: _warm, bundles: [..._rows.keys()] });
}

/** Behind the loading screen (pixiRenderer.js, after the colour-numbers
 *  programs): the one-colour program for colour numbers is compiled by
 *  drawing one see-through sprite with it, so the first whirlwind on a monster
 *  kept this way does not compile it (the v2.3.2904 rule).  True if it linked. */
let _warm = { tried: false, ok: null };
export function warmPicNumbers(renderer) {
  if (!picNumbersOn() || !renderer) return false;
  let spr = null, src = null, row = -1;
  try {
    row = paletteRowTake();
    if (row < 0) return false;
    const rgba = new Uint8Array(1024);
    rgba.set([255, 255, 255, 255], 4);
    paletteRowWrite(row, rgba);
    src = makePaletteSourceOnRow({ idx: new Uint8Array([1, 1, 1, 1]), w: 1, h: 1, stride: 4, row, rgba, alphaMode: 'premultiplied-alpha', label: 'bt-picnum-prewarm' });
    spr = new Sprite(new Texture({ source: src }));
    spr.width = 8; spr.height = 8;
    spr.alpha = 0.001;
    spr._btFill = true;
    spr._noSharp = true;
    renderer.render({ container: spr });
    _warm = { tried: true, ok: paletteProgramLinked(renderer, paletteFillProgram()) };
  } catch (e) { _warm = { tried: true, ok: false, error: String((e && e.message) || e) }; }
  try { if (spr) spr.destroy(); } catch (e) { /* gone */ }
  try { if (src) src.destroy(); } catch (e) { /* gone */ }
  if (row >= 0) paletteRowGive(row);
  return _warm.ok;
}
