/* ═══ v2.3.2874: THE MASKED-BODY BAKE, OFF THE MAIN THREAD ═══
 *
 * Owner: "whenever I put on a piece of armor like legs or torso the game
 * would noticeably stutter".  The background prewarm (entityRenderer
 * prewarmMaskedBodyFrames / prewarmAltWornSets) bakes ~120-220 frames per
 * armour set; on the main thread each bake is a frame the game does not get.
 * Here the same pixel code (maskedBake.js) runs on another core, and the main
 * thread only crops and stores the result (_storeBake).
 *
 * A job carries every input as a whole-frame ImageBitmap, drawn on the main
 * thread from the live (possibly cropped) texture at its own size -- an exact
 * copy -- so `drawImage(bitmap, x, y, 256, 256)` here is the same nearest 2x
 * the inline bake's drawGearFrame does.  The reply is the 256 composite
 * already through bakeDisplayCanvas's exact-texel branch (DISPLAY_DS 2: every
 * second texel), which is the only branch the caller sends here.
 *
 * The fish pose's rod mask (toolRecolor) arrives once as a `{ type: 'rod' }`
 * message and is asked with fishRodAt's own arithmetic.
 *
 * ═══ v2.3.2904: LESS FOR THE MAIN THREAD TO DO, BOTH ENDS ═══
 *
 * Owner: "The game still drops in frame rate when you first wear a piece of
 * armor when running the game on my phone (iPhone 14 pro max)."  The render
 * path now sends its own misses here too (entityRenderer _localMaskedFrame),
 * so every millisecond a job costs the main thread is a millisecond of the
 * frames right after an equip.  Two costs moved over:
 *   - IN: an input is no longer redrawn into a whole-frame scratch canvas
 *     first.  It arrives as the crop it already is -- a bitmap of the texture's
 *     `frame` rectangle, cut straight from its sheet -- with its trim and orig,
 *     and is placed here with drawGearFrame's own arithmetic (gearSheets.js).
 *     A scratch canvas and a 2D context per input per bake are gone from the
 *     main thread.
 *   - OUT: the crop (entityRenderer _cropBakedFrame, i.e. gearSheets
 *     packTrimmed for one frame: a read-back of the whole frame, a scan, a
 *     second canvas) happens here, and the reply carries the cropped pixels
 *     and where they sit.  The main thread copies them into one canvas the
 *     size of the art.
 * The pixels drawn are the same, frame for frame (tools/qa/qa-bake-ident.mjs
 * fingerprints every baked frame drawn back from its crop). */
import { bakeMaskedCanvas } from './maskedBake.js';
import { lookSheetParse, lookFrameRGBA } from './lookExpand.js';   /* v2.3.3752: the armoured body from the colour numbers */
import { unpackLookSheet, lookBytesHash } from './lookUnpack.js';   /* v2.3.5015: a sheet's bytes made here, from its file */
import { lookBake } from './lookBake.js';

/* ═══ v2.3.3752: THE BODY FROM THE COLOUR NUMBERS (lookArmour.js) ═══
   A look drawn from the shared numbers has no picture of its own to send, so
   its sheets come here once ({ type: 'lookSheet' }) and a job names the
   sheet, the frame's cell and the look's row: the frame is coloured here
   exactly as the chip colours it (lookExpand.js), the bake runs on it
   unchanged -- every fix inside maskedBake.js rides along -- and what comes
   back is not a picture but what the bake DECIDED: a bit a display texel
   (the body shows there or not) and the few texels it drew itself (the
   residue: the chain belt, the steel fill), drawn as their own sprite. */
const lookSheets = new Map();   /* key -> parsed sheet */

const mk = (w, h) => new OffscreenCanvas(w, h);
/* v2.3.3752: for a look job every canvas of the bake is a CPU canvas.  The
   bake reads its canvases back and draws one into another, and a canvas on
   the graphics chip pays a copy to the CPU each time (measured on the QA
   box's software chip: 1.7 s a bake against 7 ms on the page's CPU canvas);
   a CPU canvas also halves by nearest exactly, as the page's does
   (look-palette.md: on a chip's canvas the pick is erratic). */
const mkCpu = (w, h) => {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext.bind(c);
  c.getContext = (t, o) => g(t, Object.assign({}, o || {}, { willReadFrequently: true }));
  return c;
};
let rod = null;   /* toolRecolor's { frames, fw, fh, w, mask } -- see fishRodAt there */
const rodAt = (i, u, v) => {
  const f = ((i % rod.frames) + rod.frames) % rod.frames;
  const x = Math.min(rod.w - 1, Math.floor(f * rod.fw + Math.max(0, Math.min(0.9999, u)) * rod.fw));
  const y = Math.min(rod.fh - 1, Math.floor(Math.max(0, Math.min(0.9999, v)) * rod.fh));
  return rod.mask[y * rod.w + x] === 1;
};
/* v2.3.2904: an input is { bm, tx, ty, fw, fh, ow, oh } -- the texture's frame
   pixels, where they sit in the whole frame (trim; 0,0 for an uncropped
   frame) and the whole frame's size (orig).  Drawn as gearSheets.drawGearFrame
   draws a cropped frame: scaled by the whole frame, placed at its trim. */
/* v2.3.5000: ...or { look, cell, tx, ty, fw, fh, ow, oh } -- a frame of the
   walking armour's colour numbers (gearNumbers.js gearInput): its sheet came
   here once ({ type: 'lookSheet' }), and its cell is turned into an
   ImageBitmap of the table's own colours before the bake (lookBitmaps) --
   what the RGBA path handed over, so the bake draws it the same way.  The
   armour has no roles and one byte a texel, so a texel is one look-up in
   the sheet's table (lookTable), not lookExpand.js's general walk; a frame
   asked again (another look, another worn set) is kept, a few dozen at most.
   A sheet not here yet draws nothing (null). */
const NO_ROW = new Uint8Array(256 * 4);
const _tables = new Map();   /* sheet key -> Uint8ClampedArray(256 * 4), straight RGBA by number */
function lookTable(key, sh) {
  let t = _tables.get(key);
  if (t) return t;
  t = new Uint8ClampedArray(256 * 4);
  if (sh.bits === 8 && sh.ds === 1) {
    /* entry k as lookExpand.js entry() gives it, premultiplied, then straight
       again as lookFrameRGBA does (the same rounding both ways) */
    for (let k = 1; k < 256; k++) {
      const cell = lookFrameRGBA({ ...sh, num: () => k }, { x: 0, y: 0, w: 1, h: 1 }, NO_ROW);
      t[k * 4] = cell.rgba[0]; t[k * 4 + 1] = cell.rgba[1]; t[k * 4 + 2] = cell.rgba[2]; t[k * 4 + 3] = cell.rgba[3];
    }
  } else t = null;
  _tables.set(key, t);
  return t;
}
const _bms = new Map();   /* 'key@x,y,w,h' -> ImageBitmap */
const BM_CAP = 48;
async function lookBitmap(inp) {
  const sh = lookSheets.get(inp.look);
  const c = inp.cell;
  if (!sh || !c || !(c.w > 0) || !(c.h > 0)) return null;
  const k = inp.look + '@' + c.x + ',' + c.y + ',' + c.w + ',' + c.h;
  const had = _bms.get(k);
  if (had) { _bms.delete(k); _bms.set(k, had); return had; }
  let rgba;
  const T = lookTable(inp.look, sh);
  if (T) {
    rgba = new Uint8ClampedArray(c.w * c.h * 4);
    const B = sh.bytes, W = sh.w;
    for (let y = 0; y < c.h; y++) {
      let i = (c.y + y) * W + c.x, o = y * c.w * 4;
      for (let x = 0; x < c.w; x++, i++, o += 4) {
        const n = B[i] * 4;
        if (!n) continue;
        rgba[o] = T[n]; rgba[o + 1] = T[n + 1]; rgba[o + 2] = T[n + 2]; rgba[o + 3] = T[n + 3];
      }
    }
  } else rgba = lookFrameRGBA(sh, c, NO_ROW).rgba;
  const bm = await createImageBitmap(new ImageData(rgba, c.w, c.h));
  _bms.set(k, bm);
  while (_bms.size > BM_CAP) {
    const old = _bms.keys().next().value;
    try { _bms.get(old).close(); } catch (e) { /* gone */ }
    _bms.delete(old);
  }
  return bm;
}
/* the job's pieces from numbers, as bitmaps on their inputs (lb), before the bake */
async function lookBitmaps(j) {
  const ins = (j.worn || []).map((w) => w && w.inp).filter((x) => x && x.look);
  for (const x of ins) x.lb = await lookBitmap(x);
}
/* ═══ v2.3.5043: AN INPUT AS AN ADDRESS AND A RECTANGLE ═══
   held-budget.mjs `masked-bake`: the page cut each input out of its sheet
   (createImageBitmap) for every bake, 5 to 15 ms a bake on the page.  An input
   whose sheet is an image at an address now comes as { url, sx, sy, ... }
   (bakeByAddress.js frameInput): the sheet is fetched and decoded HERE, kept
   a few (sheetOf: SHEET_KEEP_N sheets and SHEET_KEEP_BYTES at most, the least
   lately used let go and closed when no job holds it; docs/MEMORY-MAP.md
   "Characters", and each reply says what is kept, `kept`), and the rectangle is
   drawn where the cut frame was (drawer: `ub` at sx, sy).  Every draw of an
   input in the bake has smoothing off, so the texels are the cut's.  An
   address that will not read is answered `urlFail` (the page cuts that one,
   as before).  QA (`qaBm`, the page's own cut beside the address): the two
   compared here, input by input, and answered in `qa`. */
/* v2.3.5043, after the gatekeeper's review: 4 and 4 MB (were 6 and 8 MB) -- a
   job uses the body, the belt and its worn pieces, and the next frame of the
   same pose the same sheets; mp-membudget cannot see a worker's bitmaps */
const SHEET_KEEP_N = 4, SHEET_KEEP_BYTES = 4 * 1024 * 1024;
/* a sheet not read in this long is a failure (picture-door: a time limit and
   a retry): the page cuts that address's frames itself from then on */
const SHEET_URL_MS = 4000;
const sheetsKept = new Map();   /* url -> { p, bm, bytes, uses }, the newest last */
function sheetOf(url) {
  let e = sheetsKept.get(url);
  if (e) { sheetsKept.delete(url); sheetsKept.set(url, e); return e; }
  e = { p: null, bm: null, bytes: 0, uses: 0 };
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  /* v2.3.5050, the gatekeeper's sitting 5 (docs/plan/census/review-z5.md): the
     4 s covered only the fetch (the abort), not the decode after it.  Now one
     clock covers both: past it the read is a failure (`urlFail`), and a decode
     that ends later has its bitmap closed (nobody holds it) */
  let late = false, give = null;
  const lateP = new Promise((r) => { give = r; });
  const cut = setTimeout(() => { late = true; if (ac) ac.abort(); give(null); }, SHEET_URL_MS);
  const read = fetch(url, ac ? { signal: ac.signal } : undefined).then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); })
    .then((b) => createImageBitmap(b));
  read.then((bm) => { if (late && bm) { try { bm.close(); } catch (err) { /* gone */ } } }, () => {});
  e.p = Promise.race([read, lateP])
    .then((bm) => { clearTimeout(cut); if (!bm) throw new Error('late'); e.bm = bm; e.bytes = bm.width * bm.height * 4; sheetsTrim(); return bm; })
    .catch(() => { clearTimeout(cut); if (sheetsKept.get(url) === e) sheetsKept.delete(url); return null; });
  sheetsKept.set(url, e);
  return e;
}
function sheetsKeptBytes() {
  let bytes = 0;
  for (const e of sheetsKept.values()) bytes += e.bytes;
  return bytes;
}
function sheetsTrim() {
  let bytes = sheetsKeptBytes();
  for (const [u, e] of sheetsKept) {
    if (bytes <= SHEET_KEEP_BYTES && sheetsKept.size <= SHEET_KEEP_N) break;
    if (e.uses > 0 || !e.bm) continue;
    sheetsKept.delete(u);
    bytes -= e.bytes;
    try { e.bm.close(); } catch (err) { /* gone */ }
  }
}
/* the job's inputs by address, read (inp.ub); false, with the reply sent,
   when one would not read.  v2.3.5043, after the gatekeeper's sitting 4
   (#1700): every sheet's read is STARTED before the first wait.  They were
   read one after another, each with its own 4 s (SHEET_URL_MS), so a job of
   three sheets that would not come could sit 12 s -- past the page's 6 s
   watch, which let the worker go as stuck.  Together, a job's reads take at
   most one SHEET_URL_MS. */
async function urlInputs(j, ins) {
  const used = j._sheets = [];
  const fail = [], qa = [];
  /* v2.3.5050 (sitting 5): each address the page is told of as it is read
     (`urlRead`), so a stuck worker's let-go refuses only what was still being
     read (bakeByAddress.js bakeWorkerStuck) */
  const reads = ins.map((inp) => { const e = sheetOf(inp.url); e.uses++; used.push(e); return e.p.then((bm) => { if (bm) self.postMessage({ type: 'urlRead', id: j.id, url: inp.url }); return bm; }); });
  const bms = await Promise.all(reads);
  ins.forEach((inp, i) => {
    if (!bms[i]) { fail.push(inp.url); return; }
    inp.ub = bms[i];
    if (inp.qaBm) qa.push(sameCut(inp));
  });
  if (qa.length) j._qa = qa;
  if (!fail.length) return true;
  jobDone(j);
  self.postMessage({ id: j.id, bitmap: null, cell: null, beltPending: false, raw: false, err: 'url', urlFail: fail, qa: j._qa || null, kept: sheetsKeptBytes() });
  return false;
}
/* v2.3.5043, after the gatekeeper's review (#1700: the "gear numbers not
   here" return pinned its sheets past the cap): EVERY way out of a job comes
   through here -- its bitmaps closed, its sheets let go */
function jobDone(j) {
  closeInputs(j);
  sheetsLetGo(j);
}
function sheetsLetGo(j) {
  for (const e of j._sheets || []) e.uses--;
  j._sheets = null;
  sheetsTrim();
  sheetsIdleSoon();
}
/* v2.3.5043, after the gatekeeper's sitting 4 (#1700: "freed where you leave
   it"): the kept sheets are let go SHEET_IDLE_MS after the last job ends --
   the armoured players gone from the screen, or the page's packed sheets
   freed and their addresses revoked (nothing tells the worker that) */
const SHEET_IDLE_MS = 15000;
let sheetsIdleT = 0;
function sheetsIdleSoon() {
  if (sheetsIdleT) clearTimeout(sheetsIdleT);
  sheetsIdleT = setTimeout(() => {
    sheetsIdleT = 0;
    for (const [u, e] of sheetsKept) {
      if (e.uses > 0 || !e.bm) continue;
      sheetsKept.delete(u);
      try { e.bm.close(); } catch (err) { /* gone */ }
    }
  }, SHEET_IDLE_MS);
}
/* QA: the rectangle of the sheet read here against the page's own cut, byte for byte */
function sameCut(inp) {
  const w = inp.fw, h = inp.fh;
  try {
    const a = new OffscreenCanvas(w, h), b = new OffscreenCanvas(w, h);
    const ax = a.getContext('2d'), bx = b.getContext('2d');
    ax.drawImage(inp.ub, inp.sx, inp.sy, w, h, 0, 0, w, h);
    bx.drawImage(inp.qaBm, 0, 0);
    const da = ax.getImageData(0, 0, w, h).data, db = bx.getImageData(0, 0, w, h).data;
    let diff = 0;
    for (let i = 0; i < da.length; i++) if (da[i] !== db[i]) diff++;
    return { same: diff === 0 && inp.qaBm.width === w && inp.qaBm.height === h, diff, w, h, url: String(inp.url).slice(0, 60) };
  } catch (err) { return { same: false, err: String((err && err.message) || err) }; }
}
function closeInputs(j) {
  for (const inp of [j.body, j.belt, ...((j.worn || []).map((w) => w && w.inp))]) {
    try { if (inp && inp.bm && inp.bm.close) inp.bm.close(); } catch (e2) { /* already closed */ }
    try { if (inp && inp.qaBm && inp.qaBm.close) inp.qaBm.close(); } catch (e2) { /* already closed */ }
  }
}
const drawer = (inp) => {
  const src = inp && (inp.bm || inp.lb || inp.ub);
  /* v2.3.5043: a whole sheet (`ub`) is drawn from its rectangle; a cut one from its corner */
  const ox = src && src === inp.ub ? inp.sx : 0, oy = src && src === inp.ub ? inp.sy : 0;
  return src ? (c, x, y, w, h) => {
    const sx = w / inp.ow, sy = h / inp.oh;
    c.drawImage(src, ox, oy, inp.fw, inp.fh, x + inp.tx * sx, y + inp.ty * sy, inp.fw * sx, inp.fh * sy);
  } : null;
};

/* ═══ v2.3.2904: THE CROP, FOR ONE FRAME ═══
   gearSheets.packTrimmed with n = 1, which is all _cropBakedFrame ever asked
   of it -- KEEP IN STEP with it.  The frame's painted box, grown by PAD and
   snapped out to ALIGN (mip levels 1-3 average the same texels they did
   uncropped); a crop that would keep more than 0.9 of the frame is declined
   (null: store the frame whole); an empty frame keeps one blank ALIGN cell.
   With one cell both of packTrimmed's layouts put it at 0,0 in a canvas its
   own size, which is the canvas returned here. */
const TRIM_PAD = 4, TRIM_ALIGN = 8;
function cropFrame(dc, dctx) {
  const fw = dc.width, fh = dc.height;
  const data = dctx.getImageData(0, 0, fw, fh).data;
  const snapDn = (v) => Math.max(0, Math.floor(v / TRIM_ALIGN) * TRIM_ALIGN);
  let x0 = fw, y0 = fh, x1 = -1, y1 = -1;
  for (let y = 0; y < fh; y++) {
    const row = y * fw;
    for (let x = 0; x < fw; x++) {
      if (data[(row + x) * 4 + 3] !== 0) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  let tx, ty, w, h;
  const blank = x1 < 0;
  if (blank) {
    tx = 0; ty = 0; w = TRIM_ALIGN; h = TRIM_ALIGN;
  } else {
    tx = snapDn(x0 - TRIM_PAD); ty = snapDn(y0 - TRIM_PAD);
    w = Math.min(fw, Math.ceil((x1 + 1 + TRIM_PAD) / TRIM_ALIGN) * TRIM_ALIGN) - tx;
    h = Math.min(fh, Math.ceil((y1 + 1 + TRIM_PAD) / TRIM_ALIGN) * TRIM_ALIGN) - ty;
  }
  if (w * h > 0.9 * fw * fh) return null;
  const cc = new OffscreenCanvas(w, h);
  const cctx = cc.getContext('2d');
  cctx.imageSmoothingEnabled = false;   /* 1:1 copies; never resample */
  if (!blank) cctx.drawImage(dc, tx, ty, w, h, 0, 0, w, h);
  return { cc, cell: { tx, ty, w, h, fw, fh } };
}

/* ═══ v2.3.5015: A SHEET OF NUMBERS FETCHED AND DECODED HERE ═══
   The page made a sheet's bytes by drawing its picture on a canvas and
   reading it back (lookPalette.js make): 38 ms held on the page the first
   time a pose's body was baked under armour.  Now it sends the file's address
   and the spec ('lookSheetUrl'), and the bytes are made here with the page's
   own function (lookUnpack.js).  The file is an opaque PNG of numbers, so it
   is decoded with no colour conversion: its values as written.  A job that
   names a sheet still on its way waits for it (pending); a sheet that cannot
   be made here is reported ('lookSheetFailed') and the page sends its bytes
   instead, as before. */
const pending = new Map();   /* key -> the sheet's decode under way */
/* a fetch that never answers is cut and counts as failed (TRAPS §257): the
   page then sends the bytes itself -- its road is the retry -- and a job
   waiting on the sheet is not held past the page's stuck watch (6 s,
   entityRenderer.js _BAKE_STUCK_MS) by a fetch that hangs */
const SHEET_FETCH_MS = 4000;
function fetchSheet(j) {
  const s = j.spec;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const cut = ac ? setTimeout(() => ac.abort(), SHEET_FETCH_MS) : 0;
  const p = fetch(j.url, ac ? { signal: ac.signal } : undefined)
    .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); })
    .then((b) => createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }))
    .then((bm) => {
      try {
        if (bm.width !== s.W || bm.height !== s.n + s.T) throw new Error('size ' + bm.width + 'x' + bm.height);
        const c = new OffscreenCanvas(s.W, s.n + s.T);
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(bm, 0, 0);
        const out = unpackLookSheet(g.getImageData(0, 0, s.W, s.n + s.T).data, s);
        lookSheets.set(j.key, lookSheetParse(out, s.W, s.rows, s.bits));
        if (j.check) self.postMessage({ type: 'lookSheetDone', key: j.key, hash: lookBytesHash(out) });
      } finally { try { bm.close(); } catch (e2) { /* closed */ } }
    })
    .catch((err) => { self.postMessage({ type: 'lookSheetFailed', key: j.key, err: String((err && err.message) || err) }); })
    .then(() => { clearTimeout(cut); pending.delete(j.key); });
  pending.set(j.key, p);
}
/* the decodes a job waits for: its body's sheet and its pieces' */
function waitsFor(j) {
  const out = [];
  if (!pending.size) return out;
  if (j.look && pending.has(j.look.sheet)) out.push(pending.get(j.look.sheet));
  for (const w of j.worn || []) if (w && w.inp && w.inp.look && pending.has(w.inp.look)) out.push(pending.get(w.inp.look));
  return out;
}

self.onmessage = (e) => {
  const j = e.data || {};
  if (j.type === 'rod') { rod = j.rod || null; return; }
  if (j.type === 'lookSheet') { try { lookSheets.set(j.key, lookSheetParse(j.bytes, j.w, j.rows, j.bits)); } catch (e2) { /* the job then fails: the old path */ } return; }
  if (j.type === 'lookSheetUrl') { fetchSheet(j); return; }
  /* v2.3.5050 (sitting 5): a job's sheets by address start reading as it
     arrives, beside the wait for its sheets of numbers (they read only after
     it, under the page's 6 s watch) */
  /* ...and each said `urlRead` the moment it is in: the job's own word
     (urlInputs) comes only after that wait, and a stuck kill during it refused
     addresses that had read (the whole main tour's `armour`: 3 refused) */
  for (const x of [j.body, j.belt, ...((j.worn || []).map((w) => w && w.inp))]) {
    if (x && x.url) sheetOf(x.url).p.then((bm) => { if (bm && j.id) self.postMessage({ type: 'urlRead', id: j.id, url: x.url }); });
  }
  const wait = waitsFor(j);
  if (wait.length) { Promise.all(wait).then(() => takeJob(j)); return; }
  takeJob(j);
};
function takeJob(j) {
  /* v2.3.5043: inputs by address read first (urlInputs); the page told when
     they are (`urlsRead`: an address being read when the worker is let go as
     stuck is refused, bakeByAddress.js) */
  if (!j._urlRead) {
    const ins = [j.body, j.belt, ...((j.worn || []).map((w) => w && w.inp))].filter((x) => x && x.url);
    if (ins.length) {
      j._urlRead = true;
      urlInputs(j, ins).then((ok) => { if (ok) { self.postMessage({ type: 'urlsRead', id: j.id }); takeJob(j); } }, () => { jobDone(j); self.postMessage({ id: j.id, bitmap: null, cell: null, beltPending: false, raw: false, err: 'url read', kept: sheetsKeptBytes() }); });
      return;
    }
  }
  /* v2.3.5000: a piece drawn from numbers whose sheet is not here would be
     baked as if not worn: the job fails instead (the page asks again) */
  if ((j.worn || []).some((w) => w && w.inp && w.inp.look && !lookSheets.has(w.inp.look))) {
    jobDone(j);   /* v2.3.5043: its sheets let go, its bitmaps closed (they were left pinned and open) */
    self.postMessage({ id: j.id, bitmap: null, cell: null, beltPending: false, raw: false, err: 'gear numbers not here', qa: j._qa || null, kept: sheetsKeptBytes() });
    return;
  }
  /* v2.3.5000: the pieces from numbers made bitmaps first (the one wait: the
     job is then baked in one run, as before) */
  if ((j.worn || []).some((w) => w && w.inp && w.inp.look)) { lookBitmaps(j).then(() => runJob(j), () => runJob(j)); return; }
  runJob(j);
}
function runJob(j) {
  if (j.look) { lookJob(j); return; }
  const reply = { id: j.id, bitmap: null, cell: null, beltPending: false, raw: false, err: null };
  const transfer = [];
  try {
    const r = bakeMaskedCanvas({
      mk,
      body: drawer(j.body),
      worn: (j.worn || []).map((w) => ({ k: w.k, draw: drawer(w.inp) })),
      dilate: j.dilate,
      poseInfo: j.poseInfo,
      belt: () => drawer(j.belt),
      fishRod: rod ? { has: () => true, at: rodAt } : null,
    });
    if (!r) {
      reply.raw = true;   /* body had no pixels yet: the caller draws the raw body, uncached */
    } else {
      const ds = j.ds || 2;
      const w = Math.max(1, Math.round(r.cv.width / ds)), h = Math.max(1, Math.round(r.cv.height / ds));
      const dc = new OffscreenCanvas(w, h);
      const dctx = dc.getContext('2d');
      dctx.imageSmoothingEnabled = false;   /* nearest: exact texel picks, as bakeDisplayCanvas */
      dctx.drawImage(r.cv, 0, 0, w, h);
      /* v2.3.2904: cropped here (see cropFrame); a declined crop sends the
         frame whole, as before, with no cell */
      let crop = null;
      if (j.crop) { try { crop = cropFrame(dc, dctx); } catch (e2) { crop = null; } }
      if (crop) { reply.bitmap = crop.cc.transferToImageBitmap(); reply.cell = crop.cell; }
      else reply.bitmap = dc.transferToImageBitmap();
      reply.beltPending = !!r.beltPending;
      transfer.push(reply.bitmap);
    }
  } catch (err) {
    reply.err = String((err && err.message) || err);
  }
  jobDone(j);   /* v2.3.5043: + the QA cuts, and its sheets let go */
  if (j._qa) reply.qa = j._qa;
  reply.kept = sheetsKeptBytes();
  self.postMessage(reply, transfer);
};

/* v2.3.3752: a look job -- lookBake.js, on CPU canvases (mkCpu) */
function lookJob(j) {
  const reply = { id: j.id, raw: false, err: null };
  const transfer = [];
  try {
    const sh = lookSheets.get(j.look.sheet);
    if (!sh) throw new Error('no sheet ' + j.look.sheet);
    const r = lookBake(sh, {
      cell: j.look.cell, row: j.look.row,
      worn: (j.worn || []).map((w) => ({ k: w.k, draw: drawer(w.inp) })),
      belt: drawer(j.belt), dilate: j.dilate, poseInfo: j.poseInfo, ds: j.ds,
      fishRod: rod ? { has: () => true, at: rodAt } : null,
    }, mkCpu);
    if (r.raw) reply.raw = true;
    else {
      reply.show = r.show; transfer.push(r.show.buffer);
      reply.counts = r.counts;
      reply.beltPending = r.beltPending;
      if (r.residue) {
        const rc = mkCpu(r.residue.w, r.residue.h);
        rc.getContext('2d').putImageData(new ImageData(r.residue.px, r.residue.w, r.residue.h), 0, 0);
        reply.residue = { x: r.residue.x, y: r.residue.y, w: r.residue.w, h: r.residue.h, bitmap: rc.transferToImageBitmap() };
        transfer.push(reply.residue.bitmap);
      }
    }
  } catch (err) {
    reply.err = String((err && err.message) || err);
  }
  jobDone(j);   /* v2.3.5043: + the QA cuts, and its sheets let go */
  if (j._qa) reply.qa = j._qa;
  reply.kept = sheetsKeptBytes();
  self.postMessage(reply, transfer);
}
